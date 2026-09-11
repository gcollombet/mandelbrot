import { ExpmapGpuRenderer } from './gpuRenderer'
import type { ExpmapView } from './renderer'
import type { ExpmapManifest } from './manifest'
import type { ExpmapStore } from './store'
/** Latest view wins; completed GPU images alone reach the visible canvas. */
export class ExpmapGpuPlayer {
  private renderer: ExpmapGpuRenderer | null = null
  private sequence = 0
  private generation = 0
  private pending: ExpmapView | null = null
  private active: AbortController | null = null
  private running = false
  private publish: (image: ImageBitmap, view: ExpmapView) => void
  private failure: (error: unknown) => void
  constructor(publish: (image: ImageBitmap, view: ExpmapView) => void, failure: (error: unknown) => void) { this.publish=publish; this.failure=failure }
  get loadingMetrics() {return this.renderer?.loadingMetrics}
  async setSource(store: ExpmapStore, manifest: ExpmapManifest, device?: GPUDevice) {
    this.dispose(); const generation=this.generation
    const renderer=await ExpmapGpuRenderer.create(store,manifest,device)
    if (generation!==this.generation) { renderer.dispose(); return false }
    renderer.onVerificationError=error=>{if(generation===this.generation)this.failure(error)}
    this.renderer=renderer; void this.drain(); return true
  }
  request(view: ExpmapView) { this.pending={...view}; this.sequence++; this.active?.abort(); this.renderer?.prioritize(view); void this.drain() }
  private async drain() {
    if (this.running) return
    this.running=true
    try {
      while(this.pending && this.renderer) {
        const view=this.pending, renderer=this.renderer, sequence=this.sequence; this.pending=null
        const active=new AbortController(); this.active=active
        try {
          const canvas=await renderer.render(view,active.signal)
          if (!active.signal.aborted && sequence===this.sequence) {
            const image=await createImageBitmap(canvas)
            if (!active.signal.aborted && sequence===this.sequence) this.publish(image,view)
            else image.close()
          }
        } catch(e) { if(!active.signal.aborted && sequence===this.sequence) this.failure(e) }
        finally { if(this.active===active) this.active=null }
      }
    } finally { this.running=false }
  }
  dispose() { this.generation++; this.sequence++; this.pending=null; this.active?.abort(); this.renderer?.dispose(); this.renderer=null }
}
