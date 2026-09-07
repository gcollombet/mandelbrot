import { BlobReader, Uint8ArrayWriter, ZipReader, ZipWriter, TextReader, type Entry } from '@zip.js/zip.js'
import { canonicalJson, contentIdentity } from './appearance'
import { validateExpmapManifest, type ExpmapManifest } from './manifest'
import type { ExpmapTile } from './octaves'
const MANIFEST_LIMIT=32*1024*1024
async function writeFile(directory:FileSystemDirectoryHandle,name:string,data:Uint8Array|string) {
  const handle=await directory.getFileHandle(name,{create:true}), writable=await handle.createWritable()
  try { await writable.write(typeof data==='string'?data:{type:'write',position:0,data:new Uint8Array(data)});await writable.close() }
  catch(error){await writable.abort().catch(()=>{});throw error}
}
/** Internal complete-image checkpoints, or a random-access portable ZIP64 file. */
export class ExpmapStore {
  private entries?: Map<string,Entry>
  private zip?: ZipReader<Blob>
  readonly directory?:FileSystemDirectoryHandle
  readonly destination?:FileSystemFileHandle
  constructor(directory?:FileSystemDirectoryHandle,destination?:FileSystemFileHandle) {this.directory=directory;this.destination=destination}
  static async fromFile(handle:FileSystemFileHandle) {
    const store=new ExpmapStore(undefined,handle)
    store.zip=new ZipReader(new BlobReader(await handle.getFile()),{useWebWorkers:false})
    const entries=await store.zip.getEntries()
    if(entries.length>1000002)throw new Error('ExpMap index exceeds budget')
    store.entries=new Map()
    for(const entry of entries) {
      if(entry.directory || entry.encrypted || entry.compressionMethod!==0 || store.entries.has(entry.filename))throw new Error('Invalid ExpMap archive index')
      store.entries.set(entry.filename,entry)
    }
    return store
  }
  static async working(handle:FileSystemFileHandle,id:string,resume=false,options:{signal?:AbortSignal;onProgress?:(done:number,total:number)=>void}={}) {
    if(!/^[a-zA-Z0-9-]{1,100}$/.test(id))throw new Error('Invalid working document identity')
    if(!navigator.storage?.getDirectory)throw new Error('Le stockage de travail privé du navigateur est requis pour créer un ExpMap')
    const root=await navigator.storage.getDirectory()
    const parent=await root.getDirectoryHandle('expmap-work',{create:true})
    const directory=await parent.getDirectoryHandle(id,{create:true})
    const store=new ExpmapStore(directory,handle)
    if(resume) {
      try { await store.open(id); return store } catch(error) {
        if(!(error instanceof DOMException && error.name==='NotFoundError'))throw error
      }
      const source=await ExpmapStore.fromFile(handle), m=await source.open(id)
      options.onProgress?.(0,m.tiles.length)
      for(const tile of m.tiles) {
        options.signal?.throwIfAborted()
        await writeFile(directory,tile.file,await source.readTile(tile))
        options.onProgress?.(tile.index+1,m.tiles.length)
      }
      await store.publish(m)
    }
    return store
  }
  async assertEmpty() {
    if(!this.directory)throw new Error('Read-only document')
    for await(const _entry of (this.directory as FileSystemDirectoryHandle & {values():AsyncIterableIterator<FileSystemHandle>}).values())throw new Error('Document de travail déjà présent')
  }
  private async read(name:string,limit:number) {
    if(this.directory) {
      const file=await(await this.directory.getFileHandle(name)).getFile()
      if(file.size>limit)throw new Error('Image or metadata exceeds budget')
      return new Uint8Array(await file.arrayBuffer())
    }
    const entry=this.entries?.get(name)
    if(!entry || !('getData' in entry))throw new DOMException('Missing archive entry','NotFoundError')
    if(entry.uncompressedSize>limit)throw new Error('Image or metadata exceeds budget')
    return entry.getData!(new Uint8ArrayWriter(),{checkSignature:true,useWebWorkers:false})
  }
  async open(documentId?:string):Promise<ExpmapManifest> {
    const candidates:ExpmapManifest[]=[];let failure:unknown
    for(const name of this.directory?['manifest-a.json','manifest-b.json']:['manifest.json'])try {
      const m=JSON.parse(new TextDecoder().decode(await this.read(name,MANIFEST_LIMIT)))
      validateExpmapManifest(m);candidates.push(m)
    }catch(error){if(error instanceof DOMException && error.name==='NotAllowedError')throw error;failure=error}
    candidates.sort((a,b)=>b.generation-a.generation)
    if(documentId&&candidates.length&&candidates[0].documentId!==documentId)throw new Error('Fichier associé à un autre document')
    for(const candidate of candidates)try {if(candidate.documentId!==candidates[0].documentId)continue;await this.verify(candidate);return candidate}catch(error){failure=error}
    throw failure??new Error('No valid ExpMap checkpoint')
  }
  async readTile(tile:ExpmapTile) {
    const bytes=await this.read(tile.file,tile.length)
    if(bytes.length!==tile.length || await contentIdentity(bytes)!==tile.sha256)throw new Error(`Corrupt image ${tile.index}`)
    return bytes
  }
  async verify(m:ExpmapManifest) {
    validateExpmapManifest(m)
    if(await contentIdentity(new TextEncoder().encode(m.appearance.json))!==m.appearance.identity)throw new Error('Appearance content identity mismatch')
    for(const tile of m.tiles) {
      const size=this.directory?(await(await this.directory.getFileHandle(tile.file)).getFile()).size:this.entries?.get(tile.file)?.uncompressedSize
      if(size!==tile.length)throw new Error('Missing or truncated image')
    }
  }
  async publish(m:ExpmapManifest) {
    if(!this.directory)throw new Error('Read-only document')
    validateExpmapManifest(m);const text=canonicalJson(m)
    if(new TextEncoder().encode(text).length>MANIFEST_LIMIT)throw new Error('Manifest exceeds metadata budget')
    const name=m.generation%2?'manifest-b.json':'manifest-a.json'
    await writeFile(this.directory,name,text)
    if(new TextDecoder().decode(await this.read(name,MANIFEST_LIMIT))!==text)throw new Error('Checkpoint readback mismatch')
  }
  async appendTile(m:ExpmapManifest,bytes:Uint8Array) {
    if(!this.directory)throw new Error('Read-only document')
    const index=m.tiles.length,tile:ExpmapTile={index,file:`doubling-${index}.webp`,length:bytes.length,sha256:await contentIdentity(bytes)}
    const next:ExpmapManifest={...m,generation:m.generation+1,state:'preparing',tiles:[...m.tiles,tile]}
    validateExpmapManifest(next)
    await writeFile(this.directory,tile.file,bytes)
    await this.readTile(tile);await this.publish(next);return next
  }
  /** One sequential archive write, no growing-file rewrite or whole-document Blob. */
  async saveContainer(m:ExpmapManifest,onProgress?:(done:number,total:number)=>void,signal?:AbortSignal, destination=this.destination) {
    if(!destination)throw new Error('Destination .expmap manquante')
    validateExpmapManifest(m)
    onProgress?.(0,m.tiles.length)
    const writable=await destination.createWritable()
    const zip=new ZipWriter(writable,{zip64:true,level:0,useWebWorkers:false,bufferedWrite:false})
    try {
      await zip.add('manifest.json',new TextReader(canonicalJson(m)),{signal})
      for(const tile of m.tiles) {
        signal?.throwIfAborted()
        const blob=this.directory?await(await this.directory.getFileHandle(tile.file)).getFile():new Blob([await this.readTile(tile)])
        await zip.add(tile.file,new BlobReader(blob),{signal})
        onProgress?.(tile.index+1,m.tiles.length)
      }
      await zip.close()
      const reopened=await ExpmapStore.fromFile(destination)
      const verified=await reopened.open(m.documentId)
      if(canonicalJson(verified)!==canonicalJson(m))throw new Error('Archive readback mismatch')
    }catch(error){await writable.abort().catch(()=>{});throw error}
  }
  async discardWorking(id:string) {
    const root=await navigator.storage.getDirectory(),parent=await root.getDirectoryHandle('expmap-work')
    await parent.removeEntry(id,{recursive:true})
  }
}

/** Covers preparation, final archive publication and checkpoint cleanup across tabs. */
export async function withExpmapFileLock<T>(id:string,action:()=>Promise<T>):Promise<T> {
  if(!navigator.locks)throw new Error('Verrouillage local indisponible')
  return navigator.locks.request(`expmap-file:${id}`,{mode:'exclusive',ifAvailable:true},async lock=>{
    if(!lock)throw new Error('Ce document est déjà ouvert pour écriture dans une autre fenêtre')
    return action()
  })
}
