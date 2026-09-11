import { ExpmapLoadingMetrics } from './loadingMetrics'
import type { ExpmapStore } from './store'
/** One outstanding native decode. Only the transferable bitmap returns to the UI. */
export class ExpmapImageReader {
  readonly metrics=new ExpmapLoadingMetrics()
  verificationError?:Error
  onVerificationError?:(error:Error)=>void
  private worker=new Worker(new URL('./imageReader.worker.ts',import.meta.url),{type:'module'})
  private sequence=0
  private aheadKey=''
  private disposed=false
  private pending?:{id:number;resolve:(value:ImageBitmap|undefined)=>void;reject:(error:unknown)=>void}
  constructor() {
    this.worker.onmessage=({data})=>{
      if(data.kind==='verification-error') {this.verificationError=new Error(data.message);this.onVerificationError?.(this.verificationError);return}
      if(data.metrics) for(const [stage,value] of Object.entries(data.metrics) as [import('./loadingMetrics').ExpmapLoadStage,number][])this.metrics.record(stage,value)
      const pending=this.pending
      if(this.disposed || !pending || pending.id!==data.id) {data.bitmap?.close();return}
      this.pending=undefined
      if(data.error)pending.reject(new DOMException(data.error.message,data.error.name))
      else pending.resolve(data.bitmap)
    }
    this.worker.onerror=event=>{this.pending?.reject(new Error(event.message));this.pending=undefined;this.dispose()}
  }
  private request(message:object, signal?:AbortSignal) {
    signal?.throwIfAborted()
    if(this.disposed || this.pending)throw new Error('Lecteur fermé ou décodage déjà en cours')
    return new Promise<ImageBitmap|undefined>((resolve,reject)=>{
      const id=++this.sequence
      const cleanup=()=>signal?.removeEventListener('abort',abort)
      const abort=()=>{
        if(this.pending?.id!==id)return
        this.pending=undefined;cleanup();this.worker.postMessage({kind:'cancel',id});reject(signal!.reason)
      }
      this.pending={id,resolve:value=>{cleanup();resolve(value)},reject:error=>{cleanup();reject(error)}}
      signal?.addEventListener('abort',abort,{once:true})
      try {this.worker.postMessage({...message,id})}catch(error){this.pending=undefined;cleanup();reject(error)}
    })
  }
  static async create(store:ExpmapStore,documentId:string) {
    const reader=new ExpmapImageReader()
    try {
      if(!store.directory && !store.destination)throw new Error('Source ExpMap indisponible')
      await reader.request({kind:'init',directory:store.directory,file:store.destination,documentId})
      return reader
    }catch(error){reader.dispose();throw error}
  }
  async read(index:number,signal?:AbortSignal):Promise<ImageBitmap> {
    const bitmap=await this.request({kind:'read',index},signal)
    if(!bitmap)throw new Error('Image décodée manquante')
    return bitmap
  }
  prefetch(indices:number[]) {
    const key=indices.join(',')
    if(!this.disposed && key!==this.aheadKey) {this.aheadKey=key;this.worker.postMessage({kind:'prefetch',indices})}
  }
  dispose() {
    if(this.disposed)return
    this.disposed=true;this.worker.terminate()
    this.pending?.reject(new DOMException('Lecteur fermé','AbortError'));this.pending=undefined
  }
}
