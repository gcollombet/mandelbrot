import type { ShaderExpmapManifest } from './displayFormat'
import type { ArchiveRequest } from './displayArchive.worker'

/** What the producer, the copier and the renderer need from a block source. */
export interface ShaderExpmapSource {
  open():Promise<ShaderExpmapManifest>
  assertEmpty():Promise<void>
  publish(m:ShaderExpmapManifest):Promise<void>
  append(m:ShaderExpmapManifest,payload:Uint8Array):Promise<ShaderExpmapManifest>
  read(m:ShaderExpmapManifest,index:number,signal?:AbortSignal):Promise<Uint8Array<ArrayBuffer>>
  /** Stable key for locks and the catalogue. */
  readonly key:string
}

export const SHADER_ARCHIVE_DIRECTORY='shader-archives'
export function shaderArchivePath(id:string) {return [SHADER_ARCHIVE_DIRECTORY,`${id}.smexp`]}

/** Main-thread proxy over the OPFS archive worker. One request at a time is
 * enforced by the worker's sync handle; concurrency comes from the caller
 * overlapping reads with GPU work, not from parallel file access. */
export class OpfsShaderArchive implements ShaderExpmapSource {
  private worker=new Worker(new URL('./displayArchive.worker.ts',import.meta.url),{type:'module'})
  private pending=new Map<number,{resolve:(v:unknown)=>void;reject:(e:Error)=>void}>()
  private next=1
  private opened?:Promise<number>
  readonly path:string[]
  readonly key:string
  private create:boolean
  constructor(path:string[],create=false) {
    this.path=Array.from(path,String);this.key=this.path.join('/');this.create=create
    this.worker.onmessage=(event:MessageEvent<{id:number;result?:unknown;error?:string}>)=>{
      const p=this.pending.get(event.data.id);if(!p)return;this.pending.delete(event.data.id)
      if(event.data.error!==undefined)p.reject(new Error(event.data.error));else p.resolve(event.data.result)
    }
    this.worker.onerror=e=>{for(const p of this.pending.values())p.reject(new Error(e.message||'Archive shader indisponible'));this.pending.clear()}
  }
  private call<T>(request:ArchiveRequest,transfer:Transferable[]=[]):Promise<T> {
    // Panel state arrives through Vue proxies (paths, manifests); structured clone
    // rejects them, so every field except the binary payload goes through JSON.
    const {payload,...rest}=request as ArchiveRequest&{payload?:Uint8Array}
    const plain=JSON.parse(JSON.stringify(rest)) as ArchiveRequest
    const id=this.next++
    return new Promise<T>((resolve,reject)=>{this.pending.set(id,{resolve:resolve as (v:unknown)=>void,reject});this.worker.postMessage(payload?{id,...plain,payload}:{id,...plain},transfer)})
  }
  private ready() {return this.opened??=this.call<number>({op:'open',path:this.path,create:this.create})}
  async open() {await this.ready();return this.call<ShaderExpmapManifest>({op:'manifest'})}
  async assertEmpty() {if(await this.ready()!==0)throw new Error('L’archive existe déjà')}
  async createArchive(m:ShaderExpmapManifest) {await this.ready();return this.call<ShaderExpmapManifest>({op:'create',manifest:m})}
  async publish(m:ShaderExpmapManifest) {await this.ready();await this.call({op:'publish',manifest:m})}
  async append(m:ShaderExpmapManifest,payload:Uint8Array) {
    await this.ready()
    // Copy so the caller's array is not detached by the transfer.
    const copy=payload.slice()
    return this.call<ShaderExpmapManifest>({op:'append',manifest:m,payload:copy},[copy.buffer])
  }
  async read(_m:ShaderExpmapManifest,index:number,signal?:AbortSignal) {
    signal?.throwIfAborted();await this.ready()
    const bytes=await this.call<Uint8Array<ArrayBuffer>>({op:'read',index});signal?.throwIfAborted();return bytes
  }
  async storedBytes() {await this.ready();return this.call<number>({op:'storedBytes'})}
  /** Release the sync handle so the file can be exported, imported over or deleted. */
  async close() {
    if(this.opened) {try{await this.call({op:'close'})}catch{/* Terminating anyway. */}}
    this.worker.terminate();this.opened=undefined
  }
}

async function archiveFileHandle(path:string[],create:boolean) {
  let dir=await navigator.storage.getDirectory()
  for(const part of path.slice(0,-1))dir=await dir.getDirectoryHandle(part,{create})
  return dir.getFileHandle(path[path.length-1],{create})
}
/** Stream the archive to a user file. The archive must be closed first. */
export async function exportShaderArchive(path:string[],target:FileSystemFileHandle,signal?:AbortSignal) {
  const file=await (await archiveFileHandle(path,false)).getFile()
  const writable=await target.createWritable()
  try {await file.stream().pipeTo(writable,{signal})}catch(error){await writable.abort().catch(()=>{});throw error}
}
/** Copy a user file into OPFS as a new archive, then verify its header. */
export async function importShaderArchive(source:File,path:string[],signal?:AbortSignal) {
  const handle=await archiveFileHandle(path,true)
  const writable=await handle.createWritable()
  try {await source.stream().pipeTo(writable,{signal})}catch(error){await writable.abort().catch(()=>{});throw error}
}
/** Bytes the archive occupies in browser storage; null when the file is missing. */
export async function shaderArchiveSize(path:string[]) {
  try {return (await (await archiveFileHandle(path,false)).getFile()).size}catch{return null}
}
export async function deleteShaderArchive(path:string[]) {
  let dir=await navigator.storage.getDirectory()
  for(const part of path.slice(0,-1))dir=await dir.getDirectoryHandle(part)
  await dir.removeEntry(path[path.length-1])
}
