import type { ExpmapUploadContext } from './tileUpload'
import { EXPMAP_RESIDENT_TILES } from './octaves'
/** One uploading tile plus one decoded lookahead; only the current window can publish. */
export class ExpmapTileCache<T = Uint8Array> {
  private slots = new Int32Array(EXPMAP_RESIDENT_TILES).fill(-1)
  private allowed = new Set<number>()
  private pending?: Promise<void>
  private pendingIndex?:number
  private uploadAbort?:AbortController
  private required=new Set<number>()
  private disposed = false
  private ahead?: {index:number; controller:AbortController; promise:Promise<T | undefined>}
  private order:number[]=[]
  private load: (index: number, signal?:AbortSignal) => Promise<T>
  private upload: (slot: number, bytes: T, context:ExpmapUploadContext) => void | Promise<void>
  private release: (value:T)=>void
  private reuse?: {key:(index:number)=>number; copy:(from:number,to:number)=>Promise<void>}
  constructor(load: (index: number, signal?:AbortSignal) => Promise<T>, upload: (slot: number, bytes: T, context:ExpmapUploadContext) => void | Promise<void>, release: (value:T)=>void = ()=>{}, reuse?: {key:(index:number)=>number; copy:(from:number,to:number)=>Promise<void>}) {
    this.load=load; this.upload=upload; this.release=release;this.reuse=reuse
  }
  resident(index: number) { return this.slots[index % EXPMAP_RESIDENT_TILES] === index }
  private physicalSlot(index:number) {
    return this.reuse ? this.slots.findIndex(i=>i>=0 && this.reuse!.key(i)===this.reuse!.key(index)) : -1
  }
  private warm(index?:number) {
    if(index===undefined || this.ahead || this.resident(index) || this.disposed)return
    const controller=new AbortController()
    const entry={index,controller,promise:Promise.resolve(undefined) as Promise<T|undefined>}
    this.ahead=entry
    entry.promise=this.load(index,controller.signal).then(value=>{
      if(controller.signal.aborted || this.disposed) {this.release(value);return undefined}
      return value
    }).catch(()=>undefined)
  }
  private discardAhead() {
    const entry=this.ahead;this.ahead=undefined
    if(entry) {entry.controller.abort();void entry.promise.then(value=>{if(value!==undefined)this.release(value)})}
  }
  private async ensure(index: number, signal?: AbortSignal) {
    while (!this.resident(index)) {
      signal?.throwIfAborted()
      if (this.disposed) throw new Error('Cache fermé')
      if (!this.allowed.has(index)) throw new DOMException('Vue remplacée', 'AbortError')
      if (this.pending) { await this.pending; continue }
      const controller=new AbortController()
      this.uploadAbort=controller;this.pendingIndex=index
      const job = (async () => {
        try {
          const slot=index % EXPMAP_RESIDENT_TILES
          const source=this.physicalSlot(index)
          if(source>=0) {
            this.slots[slot]=-1
            if(source!==slot)await this.reuse!.copy(source,slot)
            if(!controller.signal.aborted && this.allowed.has(index))this.slots[slot]=index
            return
          }
          const ahead=this.ahead?.index===index ? this.ahead : undefined
          if(ahead)this.ahead=undefined
          else if(this.ahead)this.discardAhead()
          const cancelAhead=()=>ahead?.controller.abort()
          controller.signal.addEventListener('abort',cancelAhead,{once:true})
          let bytes:T
          try {
            const prepared=ahead ? await ahead.promise : undefined
            if(controller.signal.aborted) {if(prepared!==undefined)this.release(prepared);return}
            bytes=prepared ?? await this.load(index,controller.signal)
          }finally {controller.signal.removeEventListener('abort',cancelAhead)}
          try {
            if (controller.signal.aborted || this.disposed || !this.allowed.has(index)) return
            const slot = index % EXPMAP_RESIDENT_TILES
            // The old slot is invalid as soon as any part may be overwritten.
            this.slots[slot]=-1
            const next=this.order.find(i=>i!==index && !this.resident(i) && this.physicalSlot(i)<0
              && (!this.reuse || this.reuse.key(i)!==this.reuse.key(index)))
            this.warm(next)
            await this.upload(slot, bytes, {signal:controller.signal,isRequired:()=>this.required.has(index)})
            if(!controller.signal.aborted && !this.disposed && this.allowed.has(index))this.slots[slot]=index
          } finally { this.release(bytes) }
        } catch(error) { if(!controller.signal.aborted)throw error }
      })()
      this.pending=job
      try { await job } finally { if(this.pending===job) {this.pending=undefined;this.pendingIndex=undefined;this.uploadAbort=undefined} }

    }
    signal?.throwIfAborted()
  }
  setWindow(needed:number[],prefetch?:number) {
    const allowed = [...needed, ...(prefetch === undefined ? [] : [prefetch])]
    if (new Set(allowed.map(i=>i % EXPMAP_RESIDENT_TILES)).size !== allowed.length) throw new Error('Fenêtre de tuiles trop grande')
    this.allowed=new Set(allowed);this.required=new Set(needed);this.order=allowed
    if(this.ahead && !this.allowed.has(this.ahead.index))this.discardAhead()
    if(this.pendingIndex!==undefined&&!this.allowed.has(this.pendingIndex))this.uploadAbort?.abort()
  }
  async prepare(needed: number[], prefetch?: number, signal?: AbortSignal) {
    this.setWindow(needed,prefetch)
    for(const index of needed) await this.ensure(index,signal)
  }
  prefetch(index?: number) {
    if(index !== undefined) void this.ensure(index).catch(()=>{ /* Required reads retry and report errors. */ })
  }
  invalidate() {
    this.discardAhead();this.uploadAbort?.abort(); this.allowed.clear(); this.required.clear(); this.slots.fill(-1)
  }
  dispose() { this.disposed=true; this.discardAhead();this.uploadAbort?.abort();this.required.clear(); this.allowed.clear(); this.slots.fill(-1) }
}
