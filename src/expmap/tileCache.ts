import { EXPMAP_RESIDENT_TILES } from './octaves'
/** One native decode at a time; only the current window can publish an upload. */
export class ExpmapTileCache<T = Uint8Array> {
  private slots = new Int32Array(EXPMAP_RESIDENT_TILES).fill(-1)
  private allowed = new Set<number>()
  private pending?: Promise<void>
  private disposed = false
  private load: (index: number) => Promise<T>
  private upload: (slot: number, bytes: T) => void
  private release: (value:T)=>void
  constructor(load: (index: number) => Promise<T>, upload: (slot: number, bytes: T) => void, release: (value:T)=>void = ()=>{}) {
    this.load=load; this.upload=upload; this.release=release
  }
  resident(index: number) { return this.slots[index % EXPMAP_RESIDENT_TILES] === index }
  private async ensure(index: number, signal?: AbortSignal) {
    while (!this.resident(index)) {
      signal?.throwIfAborted()
      if (this.disposed) throw new Error('Cache fermé')
      if (!this.allowed.has(index)) throw new DOMException('Vue remplacée', 'AbortError')
      if (this.pending) { await this.pending; continue }
      const job = (async () => {
        const bytes = await this.load(index)
        try {
          if (this.disposed || !this.allowed.has(index)) return
          const slot = index % EXPMAP_RESIDENT_TILES
          this.upload(slot, bytes); this.slots[slot]=index
        } finally { this.release(bytes) }
      })()
      this.pending=job
      try { await job } finally { if(this.pending===job) this.pending=undefined }
    }
    signal?.throwIfAborted()
  }
  async prepare(needed: number[], prefetch?: number, signal?: AbortSignal) {
    const allowed = [...needed, ...(prefetch === undefined ? [] : [prefetch])]
    if (new Set(allowed.map(i=>i % EXPMAP_RESIDENT_TILES)).size !== allowed.length) throw new Error('Fenêtre de tuiles trop grande')
    this.allowed=new Set(allowed)
    for(const index of needed) await this.ensure(index,signal)
  }
  prefetch(index?: number) {
    if(index !== undefined) void this.ensure(index).catch(()=>{ /* Required reads retry and report errors. */ })
  }
  dispose() { this.disposed=true; this.allowed.clear(); this.slots.fill(-1) }
}
