import type { ExpmapUploadContext } from './tileUpload'
import { EXPMAP_RESIDENT_TILES } from './octaves'
/** One native decode at a time; only the current window can publish an upload. */
export class ExpmapTileCache<T = Uint8Array> {
  private slots = new Int32Array(EXPMAP_RESIDENT_TILES).fill(-1)
  private allowed = new Set<number>()
  private pending?: Promise<void>
  private pendingIndex?:number
  private uploadAbort?:AbortController
  private required=new Set<number>()
  private disposed = false
  private load: (index: number) => Promise<T>
  private upload: (slot: number, bytes: T, context:ExpmapUploadContext) => void | Promise<void>
  private release: (value:T)=>void
  constructor(load: (index: number) => Promise<T>, upload: (slot: number, bytes: T, context:ExpmapUploadContext) => void | Promise<void>, release: (value:T)=>void = ()=>{}) {
    this.load=load; this.upload=upload; this.release=release
  }
  resident(index: number) { return this.slots[index % EXPMAP_RESIDENT_TILES] === index }
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
          const bytes = await this.load(index)
          try {
            if (controller.signal.aborted || this.disposed || !this.allowed.has(index)) return
            const slot = index % EXPMAP_RESIDENT_TILES
            // The old slot is invalid as soon as any part may be overwritten.
            this.slots[slot]=-1
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
  async prepare(needed: number[], prefetch?: number, signal?: AbortSignal) {
    const allowed = [...needed, ...(prefetch === undefined ? [] : [prefetch])]
    if (new Set(allowed.map(i=>i % EXPMAP_RESIDENT_TILES)).size !== allowed.length) throw new Error('Fenêtre de tuiles trop grande')
    this.allowed=new Set(allowed);this.required=new Set(needed)
    if(this.pendingIndex!==undefined&&!this.allowed.has(this.pendingIndex))this.uploadAbort?.abort()
    for(const index of needed) await this.ensure(index,signal)
  }
  prefetch(index?: number) {
    if(index !== undefined) void this.ensure(index).catch(()=>{ /* Required reads retry and report errors. */ })
  }
  dispose() { this.disposed=true; this.uploadAbort?.abort();this.required.clear(); this.allowed.clear(); this.slots.fill(-1) }
}
