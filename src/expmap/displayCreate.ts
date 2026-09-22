import { t } from '../i18n'
import type { Engine, RenderOptions } from '../Engine'
import type { VideoPathLocation } from '../videoPath'
import { canonicalJson, contentIdentity } from './appearance'
import { produceExpmapBlocks, type ExpmapProducerDeps } from './producer'
import { expmapKernelProjection } from './producerProjection'
import { octaveProjection } from './octaves'
import { shaderBlockAt, shaderBlockCount, type ShaderExpmapManifest } from './displayFormat'
import { resumeFrom } from './displayStore'
import type { ShaderExpmapSource } from './displayArchiveClient'
import type { ExpmapPlan } from './plan'

export async function createShaderExpmap(deps:ExpmapProducerDeps & {engine:Pick<Engine,'captureExpmapDisplay'>},request:{
  store:ShaderExpmapSource; plan:ExpmapPlan; appearance:RenderOptions; name:string
  restoreCamera:VideoPathLocation; resume?:boolean; signal?:AbortSignal
  onProgress?:(done:number,total:number)=>void
}):Promise<ShaderExpmapManifest> {
  if(!navigator.locks)throw new Error(t('expmap.shaderCreate.locksRequired'))
  return navigator.locks.request(`shader-expmap:${request.store.key}`,{mode:'exclusive',ifAvailable:true},async lock=>{
    if(!lock)throw new Error(t('expmap.shaderCreate.sourceInUse'))
    request.signal?.throwIfAborted()
    // Props arrive as reactive proxies; the manifest must be plain data.
    request={...request,plan:JSON.parse(JSON.stringify(request.plan)) as ExpmapPlan}
    const recipe=canonicalJson(JSON.parse(JSON.stringify(request.appearance)))
    let m:ShaderExpmapManifest
    if(request.resume) {
      m=await request.store.open()
      if(canonicalJson(m.projection)!==canonicalJson(request.plan)||m.appearanceJson!==recipe)throw new Error('Recette incompatible avec la reprise')
      if(m.state==='complete')return m
      m=resumeFrom(m)
    } else {
      await request.store.assertEmpty()
      m={kind:'shader-expmap',version:1,convention:'radial-f16-delayed-clamp-v1',id:crypto.randomUUID(),name:request.name,
        createdAt:new Date().toISOString(),generation:0,state:'preparing',completed:0,total:shaderBlockCount(request.plan),
        projection:request.plan,appearanceJson:recipe,calculationIdentity:await contentIdentity(new TextEncoder().encode(recipe))}
      if('createArchive' in request.store)m=await (request.store as {createArchive:(m:ShaderExpmapManifest)=>Promise<ShaderExpmapManifest>}).createArchive(m)
    }
    m={...m,state:'preparing',generation:m.generation+1};await request.store.publish(m)
    const first=m.completed
    function* remaining() { for(let i=first;i<m.total;i++)yield shaderBlockAt(m.projection,i) }
    try {
      await produceExpmapBlocks(deps,{
        plan:m.projection,appearance:JSON.parse(m.appearanceJson),forceRender:true,restoreCamera:request.restoreCamera,
        signal:request.signal,blocks:remaining(),projectionForBlock:(plan,block)=>block.region==='center'?expmapKernelProjection(plan,block):octaveProjection(plan,block),
        consume:async()=>{throw new Error('Unexpected RGB capture')},
        consumeDisplay:async block=>{
          request.signal?.throwIfAborted()
          const data=await deps.engine.captureExpmapDisplay(block.useful)
          request.signal?.throwIfAborted()
          m=await request.store.append(m,data)
          request.onProgress?.(m.completed,m.total)
        },onProgress:()=>request.onProgress?.(m.completed,m.total),
      })
      m={...m,state:'complete',generation:m.generation+1};await request.store.publish(m);return m
    } catch(error) {
      m={...m,state:'interrupted',generation:m.generation+1}
      await request.store.publish(m).catch(()=>{})
      throw error
    }
  })
}
