import { ShaderExpmapArchive, type ArchiveFile } from './displayArchive'
import type { ShaderExpmapManifest } from './displayFormat'

/** OPFS sync access handles are worker-only; the archive logic runs here. */
type SyncAccessHandle={getSize():number;read(buffer:Uint8Array,options:{at:number}):number;write(buffer:Uint8Array,options:{at:number}):number;truncate(size:number):void;flush():void;close():void}
class SyncArchiveFile implements ArchiveFile {
  private handle:SyncAccessHandle
  constructor(handle:SyncAccessHandle) {this.handle=handle}
  size() {return this.handle.getSize()}
  read(at:number,length:number) {
    const out=new Uint8Array(length)
    const got=this.handle.read(out,{at})
    if(got!==length)throw new Error('Lecture d’archive incomplète')
    return out
  }
  write(at:number,data:Uint8Array) {if(this.handle.write(data,{at})!==data.length)throw new Error('Écriture d’archive incomplète')}
  truncate(size:number) {this.handle.truncate(size)}
  flush() {this.handle.flush()}
  close() {this.handle.close()}
}

let archive:ShaderExpmapArchive|undefined,file:SyncArchiveFile|undefined,manifest:ShaderExpmapManifest|undefined
export type ArchiveRequest=
  |{op:'open';path:string[];create:boolean}
  |{op:'manifest'}
  |{op:'create';manifest:ShaderExpmapManifest}
  |{op:'publish';manifest:ShaderExpmapManifest}
  |{op:'append';manifest:ShaderExpmapManifest;payload:Uint8Array}
  |{op:'read';index:number}
  |{op:'storedBytes'}
  |{op:'close'}
async function handle(r:ArchiveRequest):Promise<unknown> {
  switch(r.op) {
    case 'open': {
      file?.close()
      let dir=await navigator.storage.getDirectory()
      for(const part of r.path.slice(0,-1))dir=await dir.getDirectoryHandle(part,{create:r.create})
      const h=await dir.getFileHandle(r.path[r.path.length-1],{create:r.create})
      file=new SyncArchiveFile(await (h as FileSystemFileHandle & {createSyncAccessHandle():Promise<SyncAccessHandle>}).createSyncAccessHandle());archive=new ShaderExpmapArchive(file)
      return file.size()
    }
    case 'manifest': manifest=await archive!.open();return manifest
    case 'create': manifest=await archive!.create(r.manifest);return manifest
    case 'publish': await archive!.publish(r.manifest);manifest={...r.manifest};return manifest
    case 'append': manifest=await archive!.append(r.manifest,r.payload);return manifest
    case 'read': return archive!.read(manifest!,r.index)
    case 'storedBytes': return archive!.storedBytes()
    case 'close': file?.close();file=undefined;archive=undefined;manifest=undefined;return undefined
  }
}
self.onmessage=async(event:MessageEvent<{id:number}&ArchiveRequest>)=>{
  const {id,...request}=event.data
  try {
    const result=await handle(request as ArchiveRequest)
    if(result instanceof Uint8Array)(self as unknown as Worker).postMessage({id,result},[result.buffer])
    else self.postMessage({id,result})
  } catch(error) {self.postMessage({id,error:error instanceof Error?error.message:String(error)})}
}
