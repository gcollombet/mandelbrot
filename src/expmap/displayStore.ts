import { canonicalJson } from './appearance'
import { DISPLAY_SAMPLE_BYTES, shaderBlockAt, validateShaderManifest, type ShaderExpmapManifest } from './displayFormat'

/** One checked binary file per block, two alternating atomic manifest slots.
 * No in-memory index proportional to the depth of the source. */
export class ShaderExpmapStore {
  readonly directory:FileSystemDirectoryHandle
  constructor(directory:FileSystemDirectoryHandle) { this.directory=directory }
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
    if(!candidates.length)throw new Error('Aucun manifeste shader ExpMap valide dans ce dossier')
    return candidates[0]
  }
  async assertEmpty() {
    const directory=this.directory as FileSystemDirectoryHandle & {values():AsyncIterable<FileSystemHandle>}
    for await(const _ of directory.values()) { throw new Error('Choisir un dossier vide pour la nouvelle source shader') }
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
    // Header and payload are hashed together, so exchanging two files is detected.
    const data=new Uint8Array(16+expected),view=new DataView(data.buffer)
    view.setUint32(0,0x31504d53,true);view.setUint32(4,index,true);view.setUint32(8,expected,true);view.setUint32(12,DISPLAY_SAMPLE_BYTES,true)
    data.set(payload,16)
    const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',data))
    const file=new Uint8Array(data.length+hash.length);file.set(data);file.set(hash,data.length)
    await this.write(`${index}.bin`,file,await this.blockDirectory(index,true))
    const next={...m,generation:m.generation+1,completed:index+1}
    await this.publish(next)
    return next
  }
  async read(m:ShaderExpmapManifest,index:number,signal?:AbortSignal) {
    signal?.throwIfAborted()
    if(!Number.isSafeInteger(index)||index<0||index>=m.completed)throw new Error('Bloc non publié')
    const block=shaderBlockAt(m.projection,index),expected=block.useful.width*block.useful.height*DISPLAY_SAMPLE_BYTES
    const f=await (await (await this.blockDirectory(index)).getFileHandle(`${index}.bin`)).getFile()
    if(f.size!==expected+48)throw new Error(`Bloc ${index} tronqué`)
    const bytes=new Uint8Array(await f.arrayBuffer()),view=new DataView(bytes.buffer)
    if(view.getUint32(0,true)!==0x31504d53||view.getUint32(4,true)!==index||view.getUint32(8,true)!==expected||view.getUint32(12,true)!==48)throw new Error(`En-tête du bloc ${index} invalide`)
    const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes.subarray(0,16+expected)))
    if(!hash.every((b,i)=>b===bytes[16+expected+i]))throw new Error(`Intégrité du bloc ${index} invalide`)
    signal?.throwIfAborted()
    return bytes.subarray(16,16+expected)
  }
}

/** Copy a source without buffering the document; a failed copy remains resumable. */
export async function copyShaderSource(source:ShaderExpmapStore,target:ShaderExpmapStore,
  signal?:AbortSignal,onProgress?:(done:number,total:number)=>void) {
  if(await source.directory.isSameEntry(target.directory))throw new Error('Choisir un autre dossier')
  return navigator.locks.request(`shader-expmap:${target.directory.name}`,{mode:'exclusive',ifAvailable:true},async lock=>{
    if(!lock)throw new Error('Dossier déjà utilisé')
    const original=await source.open()
    if(original.state!=='complete')throw new Error('Terminer la source avant de la copier')
    let checkpoint:ShaderExpmapManifest|undefined
    try {checkpoint=await target.open()}catch{await target.assertEmpty()}
    if(checkpoint&&(checkpoint.id!==original.id||checkpoint.appearanceJson!==original.appearanceJson||canonicalJson(checkpoint.projection)!==canonicalJson(original.projection)))throw new Error('Le dossier contient une autre source')
    let m:ShaderExpmapManifest=checkpoint??{...original,completed:0,generation:0,state:'preparing'}
    if(m.state==='complete')return m
    if(m.completed)await target.read(m,m.completed-1,signal)
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
