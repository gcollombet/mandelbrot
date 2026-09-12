import type { ExpmapBlock, ExpmapPlan } from './plan'
import { planExpmapOctaves } from './octaves'
import type { ExpmapView } from './renderer'
/** Conservative screen bounds for an unwarped polar block, expanded for
 * bilinear support and the full AA pixel footprint. */
export function shaderBlockScissor(plan:ExpmapPlan,view:ExpmapView,block:ExpmapBlock,virtual:number,fraction:number,angle:number,reverse:boolean) {
  const o=planExpmapOctaves(plan),factor=view.height/plan.height
  if(view.effects?.radialMode==='mirror'||view.effects?.droste||view.effects?.kaleidoscope)return [0,0,view.width,view.height] as const
  if(block.region==='center') {
    const r=plan.radius/2**(plan.centerOctaves??12)*factor+2
    const x=Math.max(0,Math.floor(view.width/2-r)),y=Math.max(0,Math.floor(view.height/2-r))
    return [x,y,Math.min(view.width-x,Math.ceil(2*r+2)),Math.min(view.height-y,Math.ceil(2*r+2))] as const
  }
  const row0=(block.originY-o.halo-1)/o.rowsPerOctave,row1=(block.originY+block.useful.height-o.halo+1)/o.rowsPerOctave
  const radii=[row0,row1].map(row=>plan.radius*factor*2**(fraction-virtual-(reverse?1-row:row)))
  const a=(block.originX-o.halo-1)/o.angularSamples*2*Math.PI-angle
  const b=(block.originX+block.useful.width-o.halo+1)/o.angularSamples*2*Math.PI-angle
  const angles=[a,b]
  for(let k=Math.ceil(a/(Math.PI/2));k*Math.PI/2<=b;k++)angles.push(k*Math.PI/2)
  const points=radii.flatMap(r=>angles.map(t=>[view.width/2+r*Math.cos(t),view.height/2-r*Math.sin(t)]))
  const x=Math.max(0,Math.floor(Math.min(...points.map(p=>p[0]))-2)),y=Math.max(0,Math.floor(Math.min(...points.map(p=>p[1]))-2))
  const endX=Math.min(view.width,Math.ceil(Math.max(...points.map(p=>p[0]))+2)),endY=Math.min(view.height,Math.ceil(Math.max(...points.map(p=>p[1]))+2))
  return endX>x&&endY>y?[x,y,endX-x,endY-y] as const:null
}
