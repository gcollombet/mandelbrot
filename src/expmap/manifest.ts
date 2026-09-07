import { canonicalDomain, planExpmap, type ExpmapPlan } from './plan'
import { canonicalJson } from './appearance'
import { planExpmapOctaves, type ExpmapOctaves, type ExpmapTile } from './octaves'
import { MAX_IMAGE_BYTES } from './imageLimits'

export const EXPMAP_MANIFEST_VERSION = 5
export const EXPMAP_COLOR_PROFILE = { storage:'zip64',codec:'webp',bitDepth:8,chroma:'420',transfer:'iec61966-2-1',alpha:false } as const
export type ExpmapResourceIdentity = { role:string;identity:string;bytes:number }
export type ExpmapManifest = {
  version:5;name:string;quality:number;thumbnail?:string;forceRender:boolean;documentId:string;generation:number;state:'preparing'|'interrupted'|'complete';createdAt:string
  scaleConvention:'VideoPathLocation.scale';zoomReferenceScale:string;projection:ExpmapPlan
  appearance:{identity:string;json:string;resources:ExpmapResourceIdentity[]}
  geometryConvention?: 'continuous-radial-v1'
  color:typeof EXPMAP_COLOR_PROFILE
  octaves:ExpmapOctaves;tiles:ExpmapTile[];center?:[number,number,number]
}
export function validateExpmapManifest(m: ExpmapManifest) {
  if(m.version!==5)throw new Error('Ancien format ExpMap non pris en charge : recréer le fichier .expmap.')
  if(typeof m.name !== 'string' || !m.name.trim() || m.name.length > 200)throw new Error('Invalid document name')
  if(!Number.isFinite(m.quality) || m.quality < 0 || m.quality > 1)throw new Error('Invalid WebP quality')
  if(m.thumbnail !== undefined && (m.thumbnail.length > 128*1024 || !/^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(m.thumbnail)))throw new Error('Invalid thumbnail')
  if(typeof m.forceRender !== 'boolean')throw new Error('Invalid experimental rendering flag')
  if(!/^[a-zA-Z0-9-]{1,100}$/.test(m.documentId) || !Number.isSafeInteger(m.generation)||m.generation<0)throw new Error('Invalid document identity')
  if(!['preparing','interrupted','complete'].includes(m.state))throw new Error('Invalid document state')
  if(m.scaleConvention!=='VideoPathLocation.scale')throw new Error('Invalid scale convention')
  canonicalDomain({...m.projection.domain,startScale:m.zoomReferenceScale,endScale:m.zoomReferenceScale})
  if(canonicalJson(planExpmap(m.projection))!==canonicalJson(m.projection))throw new Error('Invalid projection contract')
  if(canonicalJson(planExpmapOctaves(m.projection))!==canonicalJson(m.octaves))throw new Error('Invalid octave layout')
  if(canonicalJson(m.color)!==canonicalJson(EXPMAP_COLOR_PROFILE))throw new Error('Unsupported codec/colorimetry')
  if(m.geometryConvention !== undefined && m.geometryConvention !== 'continuous-radial-v1')throw new Error('Unsupported geometry convention')
  const hash=/^sha256:[a-f0-9]{64}$/
  if(!hash.test(m.appearance.identity)||canonicalJson(JSON.parse(m.appearance.json))!==m.appearance.json)throw new Error('Invalid appearance identity')
  for(const r of m.appearance.resources)if(!r.role||!hash.test(r.identity)||!Number.isSafeInteger(r.bytes)||r.bytes<0)throw new Error('Invalid resource')
  if(m.center && (m.center.length!==3 || m.center.some(v=>!Number.isInteger(v)||v<0||v>255)))throw new Error('Invalid center color')
  if(!Array.isArray(m.tiles)||m.tiles.length>m.octaves.tileCount)throw new Error('Invalid image coverage')
  for(const [i,tile] of m.tiles.entries()) {
    if(tile.index!==i||tile.file!==`doubling-${i}.webp`
      ||!Number.isSafeInteger(tile.length)||tile.length<=0||tile.length>MAX_IMAGE_BYTES||!hash.test(tile.sha256))throw new Error('Invalid image index')
  }
  if(m.state==='complete' && (!m.center||m.tiles.length!==m.octaves.tileCount))throw new Error('Complete document has missing tiles or center')
}
