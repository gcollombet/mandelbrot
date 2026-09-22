import { t } from '../i18n'
import { canonicalJson } from './appearance'
import { DISPLAY_SAMPLE_BYTES, shaderBlockAt, validateShaderManifest, type ShaderExpmapManifest } from './displayFormat'
import type { ShaderExpmapSource } from './displayArchiveClient'

const BLOCK_MAGIC=0x31504d53,BLOCK_HEADER_BYTES=16
/** Blocks a resume recomputes before its checkpoint: a file whose close raced the manifest is rewritten. */
export const RESUME_BACKOFF_BLOCKS=2
export function resumeFrom(m:ShaderExpmapManifest):ShaderExpmapManifest {
  return m.state==='complete'?m:{...m,completed:Math.max(0,m.completed-RESUME_BACKOFF_BLOCKS)}
}
/** One binary file per block, two alternating atomic manifest slots.
 * No in-memory index proportional to the depth of the source. */
export class ShaderExpmapStore implements ShaderExpmapSource {
  readonly directory:FileSystemDirectoryHandle
  constructor(directory:FileSystemDirectoryHandle) { this.directory=directory }
  get key() {return `dir:${this.directory.name}`}
  private async write(name:string,data:Uint8Array|string,directory=this.directory) {
    const handle=await directory.getFileHandle(name,{create:true}),writer=await handle.createWritable()
    try { await writer.write(typeof data==='string'?data:{type:'write',position:0,data:new Uint8Array(data)});await writer.close() }
    catch(error) { await writer.abort().catch(()=>{});throw error }
  }
  async open():Promise<ShaderExpmapManifest> {
    const candidates:ShaderExpmapManifest[]=[]
    for(const slot of [0,1])try {
      const f=await (await this.directory.getFileHandle(`shader-manifest-${slot}.json`)).getFile()
      if(f.size>3_000_000)continue
      const m=JSON.parse(await f.text());validateShaderManifest(m);candidates.push(m)
    } catch { /* An incomplete slot does not invalidate the preceding checkpoint. */ }
    candidates.sort((a,b)=>b.generation-a.generation)
    if(!candidates.length)throw new Error(t('expmap.shaderStore.noManifest'))
    return candidates[0]
  }
  async assertEmpty() {
    const directory=this.directory as FileSystemDirectoryHandle & {values():AsyncIterable<FileSystemHandle>}
    for await(const _ of directory.values()) { throw new Error(t('expmap.shaderStore.emptyFolder')) }
  }
  async publish(m:ShaderExpmapManifest) {
    validateShaderManifest(m)
    await this.write(`shader-manifest-${m.generation%2}.json`,canonicalJson(m))
  }
  private async blockDirectory(index:number,create=false) {
    return this.directory.getDirectoryHandle(`blocks-${Math.floor(index/1000)}`,{create})
  }
  async append(m:ShaderExpmapManifest,payload:Uint8Array):Promise<ShaderExpmapManifest> {
    const index=m.completed,block=shaderBlockAt(m.projection,index),expected=block.useful.width*block.useful.height*DISPLAY_SAMPLE_BYTES
    if(payload.length!==expected)throw new Error('Taille de bloc shader invalide')
    // Header only: the writable is atomic on close, and a resume backs off a few
    // blocks, so no per-block digest is paid on the read path.
    const data=new Uint8Array(BLOCK_HEADER_BYTES+expected),view=new DataView(data.buffer)
    view.setUint32(0,BLOCK_MAGIC,true);view.setUint32(4,index,true);view.setUint32(8,expected,true);view.setUint32(12,DISPLAY_SAMPLE_BYTES,true)
    data.set(payload,BLOCK_HEADER_BYTES)
    await this.write(`${index}.bin`,data,await this.blockDirectory(index,true))
    const next={...m,generation:m.generation+1,completed:index+1}
    await this.publish(next)
    return next
  }
  async read(m:ShaderExpmapManifest,index:number,signal?:AbortSignal):Promise<Uint8Array<ArrayBuffer>> {
    signal?.throwIfAborted()
    if(!Number.isSafeInteger(index)||index<0||index>=m.completed)throw new Error('Bloc non publié')
    const block=shaderBlockAt(m.projection,index),expected=block.useful.width*block.useful.height*DISPLAY_SAMPLE_BYTES
    const f=await (await (await this.blockDirectory(index)).getFileHandle(`${index}.bin`)).getFile()
    // Legacy files carry a 32-byte SHA-256 trailer, which is ignored.
    if(f.size!==expected+BLOCK_HEADER_BYTES&&f.size!==expected+BLOCK_HEADER_BYTES+32)throw new Error(`Bloc ${index} tronqué`)
    const bytes=new Uint8Array(await f.slice(0,BLOCK_HEADER_BYTES+expected).arrayBuffer()),view=new DataView(bytes.buffer)
    if(view.getUint32(0,true)!==BLOCK_MAGIC||view.getUint32(4,true)!==index||view.getUint32(8,true)!==expected||view.getUint32(12,true)!==DISPLAY_SAMPLE_BYTES)throw new Error(`En-tête du bloc ${index} invalide`)
    signal?.throwIfAborted()
    return bytes.subarray(BLOCK_HEADER_BYTES) as Uint8Array<ArrayBuffer>
  }
}

/** Copy a source block by block between any two sources (directory or archive);
 * a failed copy remains resumable. */
export async function copyShaderSource(source:ShaderExpmapSource,target:ShaderExpmapSource,
  signal?:AbortSignal,onProgress?:(done:number,total:number)=>void) {
  const same=source instanceof ShaderExpmapStore&&target instanceof ShaderExpmapStore?await source.directory.isSameEntry(target.directory):source.key===target.key
  if(same)throw new Error(t('expmap.shaderStore.otherDestination'))
  return navigator.locks.request(`shader-expmap:${target.key}`,{mode:'exclusive',ifAvailable:true},async lock=>{
    if(!lock)throw new Error(t('expmap.shaderStore.destinationInUse'))
    const original=await source.open()
    if(original.state!=='complete')throw new Error(t('expmap.shaderStore.finishFirst'))
    let checkpoint:ShaderExpmapManifest|undefined
    try {checkpoint=await target.open()}catch{await target.assertEmpty()}
    if(checkpoint&&(checkpoint.id!==original.id||checkpoint.appearanceJson!==original.appearanceJson||canonicalJson(checkpoint.projection)!==canonicalJson(original.projection)))throw new Error('La destination contient une autre source')
    let m:ShaderExpmapManifest=resumeFrom(checkpoint??{...original,completed:0,generation:0,state:'preparing'})
    if(!checkpoint&&'createArchive' in target)m=await (target as {createArchive:(m:ShaderExpmapManifest)=>Promise<ShaderExpmapManifest>}).createArchive(m)
    if(m.state==='complete')return m
    m={...m,state:'preparing',generation:m.generation+1};await target.publish(m)
    try {
      onProgress?.(m.completed,m.total)
      while(m.completed<m.total) {
        signal?.throwIfAborted()
        m=await target.append(m,await source.read(original,m.completed,signal))
        onProgress?.(m.completed,m.total)
      }
      m={...m,state:'complete',generation:m.generation+1};await target.publish(m);return m
    }catch(error){await target.publish({...m,state:'interrupted',generation:m.generation+1}).catch(()=>{});throw error}
  })
}
