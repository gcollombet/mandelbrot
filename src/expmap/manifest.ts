import { canonicalDomain, planExpmap, type ExpmapPlan } from './plan'
import { canonicalJson } from './appearance'
import { planExpmapOctaves, type ExpmapOctaves, type ExpmapTiffTile } from './octaves'
import { tiffFileGroup, MAX_TIFF_TILE_BYTES } from './tiff'

export const EXPMAP_MANIFEST_VERSION = 4
export const EXPMAP_COLOR_PROFILE = { storage:'tiled-tiff',codec:'deflate',bitDepth:8,chroma:'444',transfer:'iec61966-2-1',alpha:false } as const
export type ExpmapResourceIdentity = { role:string;identity:string;bytes:number }
export type ExpmapManifest = {
  version:4;documentId:string;generation:number;state:'preparing'|'interrupted'|'complete';createdAt:string
  scaleConvention:'VideoPathLocation.scale';zoomReferenceScale:string;projection:ExpmapPlan
  appearance:{identity:string;json:string;resources:ExpmapResourceIdentity[]}
  color:typeof EXPMAP_COLOR_PROFILE
  octaves:ExpmapOctaves;tiles:ExpmapTiffTile[];center?:[number,number,number]
}
export function validateExpmapManifest(m: ExpmapManifest) {
  if(m.version!==4)throw new Error('Ancien format ExpMap non pris en charge : recréer le rendu en TIFF.')
  if(!m.documentId || !Number.isSafeInteger(m.generation)||m.generation<0)throw new Error('Invalid document identity')
  if(!['preparing','interrupted','complete'].includes(m.state))throw new Error('Invalid document state')
  if(m.scaleConvention!=='VideoPathLocation.scale')throw new Error('Invalid scale convention')
  canonicalDomain({...m.projection.domain,startScale:m.zoomReferenceScale,endScale:m.zoomReferenceScale})
  if(canonicalJson(planExpmap(m.projection))!==canonicalJson(m.projection))throw new Error('Invalid projection contract')
  if(canonicalJson(planExpmapOctaves(m.projection))!==canonicalJson(m.octaves))throw new Error('Invalid octave layout')
  if(canonicalJson(m.color)!==canonicalJson(EXPMAP_COLOR_PROFILE))throw new Error('Unsupported codec/colorimetry')
  const hash=/^sha256:[a-f0-9]{64}$/
  if(!hash.test(m.appearance.identity)||canonicalJson(JSON.parse(m.appearance.json))!==m.appearance.json)throw new Error('Invalid appearance identity')
  for(const r of m.appearance.resources)if(!r.role||!hash.test(r.identity)||!Number.isSafeInteger(r.bytes)||r.bytes<0)throw new Error('Invalid resource')
  if(m.center && (m.center.length!==3 || m.center.some(v=>!Number.isInteger(v)||v<0||v>255)))throw new Error('Invalid center color')
  if(!Array.isArray(m.tiles)||m.tiles.length>m.octaves.tileCount)throw new Error('Invalid TIFF coverage')
  let end=0
  for(const [i,tile] of m.tiles.entries()) {
    const group=tiffFileGroup(m.octaves,i)
    if(i===group.start)end=group.headerBytes
    if(tile.index!==i||tile.file!==group.file||tile.offset!==end
      ||!Number.isSafeInteger(tile.length)||tile.length<=0||tile.length>MAX_TIFF_TILE_BYTES+1024*1024||!hash.test(tile.sha256))throw new Error('Invalid TIFF tile index')
    end+=tile.length
    if(end>0xffffffff)throw new Error('TIFF file exceeds offset limit')
  }
  if(m.state==='complete' && (!m.center||m.tiles.length!==m.octaves.tileCount))throw new Error('Complete document has missing tiles or center')
}
