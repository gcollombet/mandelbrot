import { canonicalJson } from './appearance'
import { planExpmap, type ExpmapPlan, type ExpmapBlock } from './plan'
import { octaveBlocks, octaveBlockCount, planExpmapOctaves } from './octaves'

/** Little-endian interleaved sample. Geometry is per virtual 512-square texel,
 * at the sample's radius; gradients use Cartesian x/right, y/down. */
export const DISPLAY_SAMPLE_BYTES = 48
export const DISPLAY_FIELDS = [
  { name:'values', offset:0, bytes:12 },
  { name:'geometry', offset:12, bytes:8 },
  { name:'metadata', offset:20, bytes:4 },
  { name:'orbitGradient', offset:24, bytes:8 },
  { name:'trap', offset:32, bytes:16 },
] as const
export type ShaderExpmapManifest = {
  kind:'shader-expmap'; version:1; convention:'radial-f16-delayed-clamp-v1'
  id:string; name:string; createdAt:string; generation:number
  state:'preparing'|'interrupted'|'complete'; completed:number; total:number
  projection:ExpmapPlan; appearanceJson:string; calculationIdentity:string
}
export function shaderBlockCount(plan:ExpmapPlan) {
  const count=octaveBlockCount(plan)+1
  if(!Number.isSafeInteger(count)||count>0xffffffff)throw new Error('Too many shader blocks')
  return count
}
export function* shaderBlocks(plan:ExpmapPlan):Generator<ExpmapBlock> {
  // At the final scale a single central point closes the remaining subpixel disc.
  yield {id:'center',region:'center',originX:0,originY:0,gridWidth:1,
    useful:{x:plan.halo,y:plan.halo,width:1,height:1},codedWidth:2*plan.halo+2,codedHeight:2*plan.halo+2}
  yield* octaveBlocks(plan)
}
export function shaderBlockAt(plan:ExpmapPlan,index:number):ExpmapBlock {
  if (!Number.isSafeInteger(index)||index<0||index>=shaderBlockCount(plan)) throw new Error('Invalid block index')
  if(index===0)return shaderBlocks(plan).next().value!
  const o=planExpmapOctaves(plan), stride=plan.blockSize-2*plan.halo
  const nx=Math.ceil((o.angularSamples+2*o.halo)/stride),ny=Math.ceil((o.rowsPerOctave+1+2*o.halo)/stride)
  const n=index-1,tile=Math.floor(n/(nx*ny)),local=n%(nx*ny),x=(local%nx)*stride,y=Math.floor(local/nx)*stride
  const width=Math.min(stride,o.angularSamples+2*o.halo-x),height=Math.min(stride,o.rowsPerOctave+1+2*o.halo-y)
  return {id:`octave:${tile}:${y}:${x}`,region:'band',originX:x,originY:y,gridWidth:o.angularSamples,
    useful:{x:plan.halo,y:plan.halo,width,height},codedWidth:Math.ceil((width+2*plan.halo)/2)*2,codedHeight:Math.ceil((height+2*plan.halo)/2)*2}
}
export function shaderSourceEstimate(plan:ExpmapPlan) {
  const o=planExpmapOctaves(plan)
  const samples=(o.angularSamples+2*o.halo)*(o.rowsPerOctave+1+2*o.halo)*o.tileCount+1
  const rawBytes=samples*DISPLAY_SAMPLE_BYTES
  if(!Number.isSafeInteger(rawBytes))throw new Error('Source exceeds exact byte addressing')
  return {rawBytes,blocks:shaderBlockCount(plan),maxBlockBytes:plan.blockSize**2*DISPLAY_SAMPLE_BYTES,
    octaveBytes:(o.angularSamples+2*o.halo)*(o.rowsPerOctave+1+2*o.halo)*DISPLAY_SAMPLE_BYTES}
}
export function validateShaderManifest(m:ShaderExpmapManifest) {
  if(m?.kind!=='shader-expmap'||m.version!==1||m.convention!=='radial-f16-delayed-clamp-v1')throw new Error('Format shader ExpMap incompatible')
  if(!/^[a-zA-Z0-9-]{1,100}$/.test(m.id)||typeof m.name!=='string'||!m.name.trim()||m.name.length>200)throw new Error('Identité invalide')
  if(!Number.isSafeInteger(m.generation)||m.generation<0||!Number.isSafeInteger(m.completed)||m.completed<0||m.completed>m.total)throw new Error('Checkpoint invalide')
  if(!['preparing','interrupted','complete'].includes(m.state)||m.total!==shaderBlockCount(m.projection))throw new Error('Couverture invalide')
  if(m.state==='complete'&&m.completed!==m.total)throw new Error('Source incomplète')
  if(canonicalJson(planExpmap(m.projection))!==canonicalJson(m.projection))throw new Error('Projection invalide')
  if(typeof m.appearanceJson!=='string'||m.appearanceJson.length>2_000_000||canonicalJson(JSON.parse(m.appearanceJson))!==m.appearanceJson)throw new Error('Recette invalide')
  if(!/^sha256:[a-f0-9]{64}$/.test(m.calculationIdentity))throw new Error('Identité de calcul invalide')
  shaderSourceEstimate(m.projection)
}
