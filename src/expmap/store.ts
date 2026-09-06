import { canonicalJson, contentIdentity } from './appearance'
import { validateExpmapManifest, type ExpmapManifest } from './manifest'
import { type ExpmapTiffTile } from './octaves'
import { tiffHeader, validateTiffHeader, tiffFileGroup } from './tiff'
const MANIFEST_LIMIT=32*1024*1024
/** Closed TIFF tile writes precede recoverable A/B manifest checkpoints. */
export class ExpmapDirectoryStore {
  readonly directory:FileSystemDirectoryHandle
  constructor(directory:FileSystemDirectoryHandle){this.directory=directory}
  async assertEmpty(){
    const directory=this.directory as FileSystemDirectoryHandle & {values():AsyncIterableIterator<FileSystemHandle>}
    for await(const _entry of directory.values())throw new Error('Choose an empty folder for a new ExpMap document')
  }
  async open(documentId?:string):Promise<ExpmapManifest>{
    const candidates:ExpmapManifest[]=[];let failure:unknown
    for(const name of ['manifest-a.json','manifest-b.json'])try{
      const file=await(await this.directory.getFileHandle(name)).getFile()
      if(file.size>MANIFEST_LIMIT)throw new Error('Manifest exceeds metadata budget')
      const manifest=JSON.parse(await file.text());validateExpmapManifest(manifest);candidates.push(manifest)
    }catch(e){if(e instanceof DOMException && e.name==='NotAllowedError')throw e;failure=e}
    candidates.sort((a,b)=>b.generation-a.generation)
    if(documentId&&candidates.length&&candidates[0].documentId!==documentId)throw new Error('Folder belongs to a different ExpMap document')
    for(const candidate of candidates)try{
      if(candidate.documentId!==candidates[0].documentId)continue
      await this.verify(candidate);return candidate
    }catch(e){if(e instanceof DOMException&&e.name==='NotAllowedError')throw e;failure=e}
    throw failure??new Error('No valid ExpMap checkpoint')
  }
  async readTile(tile:ExpmapTiffTile){
    const file=await(await this.directory.getFileHandle(tile.file)).getFile()
    if(file.size<tile.offset+tile.length)throw new Error('Truncated TIFF tile')
    const bytes=new Uint8Array(await file.slice(tile.offset,tile.offset+tile.length).arrayBuffer())
    if(await contentIdentity(bytes)!==tile.sha256)throw new Error(`Corrupt TIFF tile ${tile.index}`)
    return bytes
  }
  /** Payload hashes are checked on each first tile load, not by reading the
   * entire deep-zoom document before opening its first view. */
  async verify(m:ExpmapManifest){
    validateExpmapManifest(m)
    if(await contentIdentity(new TextEncoder().encode(m.appearance.json))!==m.appearance.identity)throw new Error('Appearance content identity mismatch')
    for(let start=0;start<m.tiles.length;){
      const group=tiffFileGroup(m.octaves,start)
      const tiles=m.tiles.slice(start,start+group.count),last=tiles[tiles.length-1]
      const file=await(await this.directory.getFileHandle(last.file)).getFile()
      if(file.size<last.offset+last.length)throw new Error('Truncated TIFF file')
      validateTiffHeader(new Uint8Array(await file.slice(0,group.headerBytes).arrayBuffer()),m.octaves,group.count,tiles)
      start+=group.count
    }
  }
  async publish(m:ExpmapManifest){
    validateExpmapManifest(m);const text=canonicalJson(m)
    if(new TextEncoder().encode(text).length>MANIFEST_LIMIT)throw new Error('Manifest exceeds metadata budget')
    const handle=await this.directory.getFileHandle(m.generation%2?'manifest-b.json':'manifest-a.json',{create:true})
    const writable=await handle.createWritable()
    try{await writable.write(text);await writable.close()}catch(e){await writable.abort().catch(()=>{});throw e}
    if(await(await handle.getFile()).text()!==text)throw new Error('Checkpoint readback mismatch')
  }
  async appendTile(m:ExpmapManifest,bytes:Uint8Array){
    const index=m.tiles.length,group=tiffFileGroup(m.octaves,index),start=group.start
    const previous=index>start?m.tiles[index-1]:undefined
    const tile:ExpmapTiffTile={index,file:group.file,offset:previous?previous.offset+previous.length:group.headerBytes,length:bytes.length,sha256:await contentIdentity(bytes)}
    const next:ExpmapManifest={...m,generation:m.generation+1,state:'preparing',tiles:[...m.tiles,tile]}
    validateExpmapManifest(next)
    const header=tiffHeader(m.octaves,group.count,next.tiles.slice(start))
    const handle=await this.directory.getFileHandle(tile.file,{create:true}),writable=await handle.createWritable({keepExistingData:!!previous})
    try{
      await writable.write({type:'write',position:tile.offset,data:new Uint8Array(bytes)})
      await writable.write({type:'write',position:0,data:header})
      await writable.truncate(tile.offset+bytes.length);await writable.close()
    }catch(e){await writable.abort().catch(()=>{});throw e}
    await this.readTile(tile);await this.publish(next);return next
  }
}
