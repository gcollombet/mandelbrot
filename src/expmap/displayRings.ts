import type { ShaderExpmapManifest } from './displayFormat'
import { shaderBlockAt, shaderSourceEstimate } from './displayFormat'
import { planExpmapOctaves } from './octaves'
import { shaderBlockScissor } from './displayScissor'
import { scaleDoublements } from './decimal'
import { expmapImageRotation } from './effects'
import { fixedMirrorWindow, radialConfig, radialOctave } from './radial'
import type { ExpmapView } from './renderer'

export type ShaderRing = { first:number; count:number; blockStart:number; blockCount:number; center:boolean }
export type RingRect = readonly [number,number,number,number]
export type RingPixels = { rect:RingRect; data:Uint8Array<ArrayBuffer> }

export function planShaderRings(m:ShaderExpmapManifest,cacheBytes:number,usefulOctaves:number) {
  if(!Number.isFinite(cacheBytes)||cacheBytes<=0||!Number.isInteger(usefulOctaves)||usefulOctaves<1||usefulOctaves>25)throw new Error('Découpage des couronnes invalide')
  const p=m.projection,o=planExpmapOctaves(p),stride=p.blockSize-2*p.halo
  const perTile=Math.ceil((o.angularSamples+2*o.halo)/stride)*Math.ceil((o.rowsPerOctave+1+2*o.halo)/stride)
  const estimate=shaderSourceEstimate(p),coverage=(p.centerOctaves??12)+1
  const rings:ShaderRing[]=[]
  const count=cacheBytes>=3*estimate.octaveBytes?usefulOctaves:1
  const blocks=count>1||cacheBytes>=3*estimate.octaveBytes?perTile:Math.max(1,Math.min(perTile,Math.floor(cacheBytes/(3*estimate.maxBlockBytes))))
  if(Math.ceil(coverage/count)*Math.ceil(perTile/blocks)>100000)throw new Error('Trop de passes : augmenter le budget ou la taille des blocs source')
  for(let first=0;first<coverage;first+=count)for(let blockStart=0;blockStart<perTile;blockStart+=blocks) {
    rings.push({first,count:Math.min(count,coverage-first),blockStart,blockCount:Math.min(blocks,perTile-blockStart),center:first===0&&blockStart===0})
  }
  return rings
}

export function shaderRingBounds(m:ShaderExpmapManifest,view:ExpmapView,ring:ShaderRing):RingRect {
  const p=m.projection,o=planExpmapOctaves(p),stride=p.blockSize-2*p.halo
  const perTile=Math.ceil((o.angularSamples+2*o.halo)/stride)*Math.ceil((o.rowsPerOctave+1+2*o.halo)/stride)
  const depth=scaleDoublements(p.domain.startScale,view.scale),radial=radialConfig(view.effects,o.tileCount)
  const mirror=radial.mode==='mirror'?fixedMirrorWindow(depth,o.tileCount,view.effects?.mirrorDepth):undefined
  const readBase=Math.floor(mirror?.readDepth??depth),angle=view.angle+expmapImageRotation(view.effects,depth)
  let x=view.width,y=view.height,right=0,bottom=0
  const include=(b:RingRect|null)=>{if(b){x=Math.min(x,b[0]);y=Math.min(y,b[1]);right=Math.max(right,b[0]+b[2]);bottom=Math.max(bottom,b[1]+b[3])}}
  if(ring.center)include(shaderBlockScissor(p,view,shaderBlockAt(p,0),0,depth-Math.floor(depth),angle,false))
  for(let virtual=ring.first;virtual<ring.first+ring.count;virtual++) {
    const mapped=radialOctave(readBase+virtual,radial)
    for(let local=ring.blockStart;local<ring.blockStart+ring.blockCount;local++) {
      include(shaderBlockScissor(p,view,shaderBlockAt(p,1+mapped.source*perTile+local),virtual,depth-Math.floor(depth),angle,mapped.reverse))
    }
  }
  // Droste and angular folding preserve radius even when their angular block
  // bounds require a full viewport. Retain the shrinking radial crop.
  if(radial.mode!=='mirror') {
    const r=p.radius*view.height/p.height*2**(depth-Math.floor(depth)-ring.first)+2
    x=Math.max(x,Math.floor(view.width/2-r),0);y=Math.max(y,Math.floor(view.height/2-r),0)
    right=Math.min(right,Math.ceil(view.width/2+r),view.width);bottom=Math.min(bottom,Math.ceil(view.height/2+r),view.height)
  }
  return right>x&&bottom>y?[x,y,right-x,bottom-y]:[0,0,0,0]
}

/** Pass-major traversal is intentional: never interleave two rings per frame. */
export async function renderRingSequence(rings:number,frames:number,request:{
  signal?:AbortSignal; start?:number
  render:(ring:number,frame:number)=>Promise<void>
  checkpoint:(next:number)=>Promise<void>
  progress?:(done:number,total:number)=>void
}) {
  const total=rings*frames
  if(![rings,frames,total,request.start??0].every(Number.isSafeInteger)||rings<1||frames<1||(request.start??0)<0||(request.start??0)>total)throw new Error('Séquence de couronnes invalide')
  for(let index=request.start??0;index<total;index++) {
    request.signal?.throwIfAborted()
    await request.render(Math.floor(index/frames),index%frames)
    await request.checkpoint(index+1)
    request.progress?.(index+1,total)
  }
}
