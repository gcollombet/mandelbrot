import { canonicalJson, freezeExpmapAppearance } from './appearance'
import { EXPMAP_COLOR_PROFILE, type ExpmapManifest } from './manifest'
import { produceExpmapBlocks, type ExpmapProducerDeps } from './producer'
import { ExpmapStore } from './store'
import type { ExpmapPlan, ExpmapBlock } from './plan'
import { octaveBlocks, octaveBlockCount, octaveProjection, planExpmapOctaves, octaveMemory } from './octaves'
import { expmapKernelProjection } from './producerProjection'
import { ExpmapImageEncoder, validateTileDimensions } from './imageCodec'
import type { RenderOptions } from '../Engine'
import type { VideoPathLocation } from '../videoPath'

export type ExpmapProgress = { phase: string; done: number; total: number; saved: number; timings?: { compute: number; encode: number; write: number; wait: number } }
export async function createExpmapDocument(deps: ExpmapProducerDeps, request: {
  store: ExpmapStore; documentId: string; plan: ExpmapPlan; appearance: RenderOptions
  restoreCamera: VideoPathLocation; resume?: boolean; name?: string; quality?: number; forceRender?: boolean; signal?: AbortSignal
  onProgress?: (progress: ExpmapProgress) => void
  onCheckpoint?: (manifest: ExpmapManifest) => void | Promise<void>
}): Promise<ExpmapManifest> {
  if (!navigator.locks) throw new Error('Le verrouillage des documents locaux est requis.')
  return navigator.locks.request(`expmap:${request.documentId}`, { mode: 'exclusive', ifAvailable: true }, async lock => {
    if (!lock) throw new Error('Ce document est déjà en préparation.')
    request.signal?.throwIfAborted()
    const layout = planExpmapOctaves(request.plan), memory = octaveMemory(layout)
    validateTileDimensions(layout.tileWidth,layout.tileHeight)
    if (request.plan.radius > 4096) throw new Error('Résolution trop élevée pour le tampon ExpMap de 14 tuiles.')
    const device = (deps.engine as unknown as { device?: GPUDevice }).device
    if (device && Math.max(layout.tileWidth, layout.tileHeight) > device.limits.maxTextureDimension2D) throw new Error('Cette densité dépasse la largeur de texture autorisée par le GPU.')
    if (!request.resume) await request.store.assertEmpty()
    const previous = request.resume ? await request.store.open(request.documentId) : undefined
    if (previous && previous.state !== 'complete' && previous.geometryConvention !== 'continuous-radial-v1') throw new Error('Ce calcul utilise l’ancienne échelle de relief par blocs. Créer un nouveau rendu pour utiliser le relief continu.')
    const forceRender = previous ? previous.forceRender : request.forceRender ?? false
    const frozen = await freezeExpmapAppearance(request.appearance, forceRender)
    let manifest: ExpmapManifest = previous ?? {
      version: 5, name: request.name ?? 'Document ExpMap', quality: request.quality ?? 0.9, geometryConvention: 'continuous-radial-v1', forceRender, documentId: request.documentId, generation: 0, state: 'preparing', createdAt: new Date().toISOString(),
      scaleConvention: 'VideoPathLocation.scale', zoomReferenceScale: '1e0', projection: request.plan,
      appearance: { ...frozen, resources: [] }, color: EXPMAP_COLOR_PROFILE, octaves: layout, tiles: [],
    }
    if (manifest.appearance.identity !== frozen.identity || canonicalJson(manifest.projection) !== canonicalJson(request.plan)) throw new Error('La recette ne correspond pas au document à reprendre.')
    if (manifest.state === 'complete') return manifest
    const perTile = octaveBlockCount(request.plan) / layout.tileCount, total = perTile * layout.tileCount + 1
    let saved = manifest.tiles.length * perTile + Number(!!manifest.center), done = saved
    const timings = { compute:0, encode:0, write:0, wait:0 }
    const report = (phase: string) => request.onProgress?.({ phase, done, total, saved, timings:{...timings} })
    const checkpoint = async () => { await request.store.publish(manifest); await request.onCheckpoint?.(manifest) }
    await checkpoint()
    const encoder=new ExpmapImageEncoder()
    let rgba: Uint8Array | undefined, tileIndex = -1
    let pending:Promise<void>|undefined, failure:unknown
    const drain = async () => {
      if(pending) { const start=performance.now(); await pending; timings.wait+=performance.now()-start; pending=undefined }
      if(failure)throw failure
    }
    const flush = async () => {
      if (!rgba) return
      request.signal?.throwIfAborted()
      await drain()
      const pixels=rgba;rgba=undefined
      // Ownership transfers to the worker. Only one encoding/write can be pending.
      pending=(async () => {
        const encoded=await encoder.encode(pixels,layout.tileWidth,layout.tileHeight,manifest.quality,!manifest.thumbnail)
        timings.encode+=encoded.milliseconds
        const start=performance.now()
        if(encoded.thumbnail)manifest={...manifest,thumbnail:encoded.thumbnail}
        manifest=await request.store.appendTile(manifest,encoded.bytes)
        timings.write+=performance.now()-start
        saved=manifest.tiles.length*perTile+Number(!!manifest.center)
        await request.onCheckpoint?.(manifest);report('Calcul GPU + sauvegarde WebP')
      })().catch(error=>{failure=error})
    }
    const center: ExpmapBlock = { id: 'center', region: 'center', originX: 0,
      originY: 0, gridWidth: 1,
      useful: { x: request.plan.halo, y: request.plan.halo, width: 1, height: 1 },
      codedWidth: 2 * request.plan.halo + 2, codedHeight: 2 * request.plan.halo + 2 }
    function* blocks() { if (!manifest.center) yield center; yield* octaveBlocks(request.plan, manifest.tiles.length) }
    const initialDone = done
    try {
      await encoder.probe()
      await produceExpmapBlocks(deps, { forceRender, plan: request.plan, appearance: JSON.parse(frozen.json), restoreCamera: request.restoreCamera,
        blocks: blocks(), projectionForBlock: (plan, block) => block.id === 'center' ? expmapKernelProjection(plan, block) : octaveProjection(plan, block),
        signal: request.signal, onTiming: ms => { timings.compute+=ms }, onProgress: count => { done = initialDone + count; report('Calcul GPU des blocs') },
        consume: async ({block, rgba: pixels, stride, offset: sourceOffset}) => {
          if(failure)throw failure
          const u = block.useful
          if (block.id === 'center') {
            const offset = sourceOffset + u.y * stride + u.x * 4
            manifest = { ...manifest, generation: manifest.generation+1, center: [pixels[offset], pixels[offset+1], pixels[offset+2]] }
            saved++; await checkpoint(); return
          }
          const index = Number(block.id.split(':')[1])
          if (index !== tileIndex) { await flush(); tileIndex = index; rgba = new Uint8Array(memory.tileBytes) }
          for (let y=0; y<u.height; y++) {
            const src = sourceOffset + (y+u.y)*stride + u.x*4
            const dst = ((y+block.originY)*layout.tileWidth+block.originX)*4
            rgba!.set(pixels.subarray(src,src+u.width*4),dst)
          }
        } })
      await flush(); await drain()
      manifest = { ...manifest, generation: manifest.generation+1, state: 'complete' }
      await request.store.verify(manifest); await checkpoint(); report('Document prêt')
      return manifest
    } catch (error) {
      await pending
      manifest = { ...manifest, generation: manifest.generation+1, state: 'interrupted' }
      try { await checkpoint() } catch { /* The previous checkpoint remains resumable. */ }
      throw error
    } finally { encoder.dispose() }
  })
}
