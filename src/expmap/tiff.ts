import UTIF from 'utif'
import type { ExpmapOctaves, ExpmapTiffTile } from './octaves'

const TIFF_OFFSET_LIMIT = 0xffffffff
/** Reserve enough space for both LONG arrays; payload offsets never move. */
export const tiffHeaderBytes = (count: number) => Math.ceil((1024 + count * 8) / 4096) * 4096
export function tiffFileLayout(layout: ExpmapOctaves) {
  const raw = layout.tileWidth * layout.tileHeight * 4
  // Conservative zlib compressBound, plus room for both index entries per tile.
  const bound = raw + Math.floor(raw / 4096) + Math.floor(raw / 16384) + Math.floor(raw / 33554432) + 13
  const tilesPerFile = Math.min(layout.tileCount, Math.floor((TIFF_OFFSET_LIMIT - 8192) / (bound + 8)), Math.floor(TIFF_OFFSET_LIMIT / layout.tileHeight))
  if (tilesPerFile < 1) throw new Error('TIFF tile exceeds classic TIFF capacity')
  return { tilesPerFile }
}
export function tiffFileGroup(layout: ExpmapOctaves, index: number) {
  const { tilesPerFile } = tiffFileLayout(layout)
  const fileIndex = Math.floor(index / tilesPerFile), start = fileIndex * tilesPerFile
  const count = Math.min(tilesPerFile, layout.tileCount - start)
  return { start, count, file: `zoom-${fileIndex}.tif`, headerBytes: tiffHeaderBytes(count) }
}
export const MAX_TIFF_TILE_BYTES = 128 * 1024 * 1024
// Register standard LONG tags missing from UTIF's small writer tag dictionary.
Object.assign(UTIF.ttypes, {256:4,257:4,322:4,323:4,324:4,325:4})
export function tiffHeader(layout: ExpmapOctaves, count: number, tiles: ExpmapTiffTile[]) {
  const offsets = Array(count).fill(0), lengths = Array(count).fill(0)
  for (let i=0;i<tiles.length;i++) { offsets[i]=tiles[i].offset; lengths[i]=tiles[i].length }
  const ifd = {t256:[layout.tileWidth],t257:[layout.tileHeight*count],t258:[8,8,8,8],
    t259:[8],t262:[2],t274:[1],t277:[4],t284:[1],t322:[layout.tileWidth],t323:[layout.tileHeight],
    t324:offsets,t325:lengths,t338:[2],t305:['Mandelbrot ExpMap sRGB']}
  const header = new Uint8Array(tiffHeaderBytes(count))
  header.set([77,77,0,42,0,0,0,8])
  // UTIF.encode allocates only 20 KB. Reuse its IFD writer with our sized buffer
  // instead of introducing another encoder or limiting the number of tiles.
  const [, end] = UTIF._writeIFD(UTIF._binBE, header, 8, ifd)
  if (end > header.length) throw new Error('TIFF index exceeds header budget')
  return header
}
/** Compare the fixed TIFF header, allowing only unpublished future tile entries.
 * No general-purpose TIFF parser or image decoder is needed in the hot path. */
export function validateTiffHeader(bytes: Uint8Array, layout: ExpmapOctaves, count: number, tiles: ExpmapTiffTile[]) {
  const expected=tiffHeader(layout,count,tiles)
  const future=Array.from({length:count},(_,i)=>tiles[i]??{index:i,file:'',offset:0xffffffff,length:0xffffffff,sha256:''})
  const mask=tiffHeader(layout,count,future)
  if(bytes.length!==expected.length || bytes.some((v,i)=>expected[i]===mask[i] && v!==expected[i])) throw new Error('Invalid TIFF header/index')
}
async function transform(bytes: Uint8Array, decode: boolean, limit: number, signal?: AbortSignal) {
  if(typeof CompressionStream==='undefined'||typeof DecompressionStream==='undefined') throw new Error('Compression Deflate native requise')
  const stream = decode ? new DecompressionStream('deflate') : new CompressionStream('deflate')
  const reader = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(stream).getReader()
  const chunks: Uint8Array[]=[]; const decoded=decode ? new Uint8Array(limit) : undefined; let size=0
  try {
    while(true) {
      signal?.throwIfAborted(); const {done,value}=await reader.read(); if(done)break
      if(size+value.length>limit)throw new Error('TIFF codec exceeds memory budget');
      if(decoded) decoded.set(value,size); else chunks.push(value); size+=value.length
    }
    if(decoded) return decoded.subarray(0,size)
    const out=new Uint8Array(size);let offset=0;for(const chunk of chunks){out.set(chunk,offset);offset+=chunk.length}return out
  } finally { await reader.cancel().catch(()=>{}); reader.releaseLock() }
}
export async function encodeTiffTile(rgba: Uint8Array, signal?: AbortSignal) {
  if(!rgba.length || rgba.length>MAX_TIFF_TILE_BYTES)throw new Error('TIFF tile exceeds memory budget')
  return transform(rgba,false,MAX_TIFF_TILE_BYTES+1024*1024,signal)
}
export async function decodeTiffTile(bytes: Uint8Array, expectedBytes: number, signal?: AbortSignal) {
  if(expectedBytes<=0 || expectedBytes>MAX_TIFF_TILE_BYTES)throw new Error('TIFF tile exceeds memory budget')
  const rgba=await transform(bytes,true,expectedBytes,signal)
  if(rgba.length!==expectedBytes)throw new Error('Truncated TIFF tile')
  return rgba
}
