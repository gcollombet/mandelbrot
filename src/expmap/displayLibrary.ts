import type { ShaderExpmapManifest } from './displayFormat'
export type ShaderLibraryEntry={id:string;name:string;state:ShaderExpmapManifest['state'];handle:FileSystemDirectoryHandle}
async function database() {
  return new Promise<IDBDatabase>((resolve,reject)=>{
    const r=indexedDB.open('mandelbrot-shader-expmap-library',1)
    r.onupgradeneeded=()=>r.result.createObjectStore('sources',{keyPath:'id'})
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)
  })
}
async function transaction<T>(mode:IDBTransactionMode,action:(store:IDBObjectStore)=>IDBRequest<T>) {
  const db=await database()
  try {return await new Promise<T>((resolve,reject)=>{
    const tx=db.transaction('sources',mode),r=action(tx.objectStore('sources'))
    tx.oncomplete=()=>resolve(r.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error('Catalogue interrompu'))
  })} finally {db.close()}
}
export async function shaderLibraryEntries():Promise<ShaderLibraryEntry[]> {return transaction('readonly',s=>s.getAll())}
export async function rememberShaderSource(m:ShaderExpmapManifest,handle:FileSystemDirectoryHandle) {
  await transaction('readwrite',s=>s.put({id:m.id,name:m.name,state:m.state,handle}))
}
export async function forgetShaderSource(id:string) {await transaction('readwrite',s=>s.delete(id))}
export async function authorizeShaderDirectory(handle:FileSystemDirectoryHandle) {
  const h=handle as FileSystemDirectoryHandle & {requestPermission?:(o:{mode:'readwrite'})=>Promise<PermissionState>}
  if(h.requestPermission&&await h.requestPermission({mode:'readwrite'})!=='granted')throw new Error('Accès au dossier refusé ; le rouvrir depuis le panneau')
}
