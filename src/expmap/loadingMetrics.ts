export type ExpmapLoadStage = 'read' | 'hash' | 'decode' | 'upload' | 'wait' | 'open'
/** Bounded aggregates, readable without retaining a per-frame history. Times are milliseconds. */
export class ExpmapLoadingMetrics {
  private stages = new Map<ExpmapLoadStage, { count:number; totalMs:number; lastMs:number; maxMs:number }>()
  record(stage:ExpmapLoadStage, ms:number) {
    const value=this.stages.get(stage) ?? {count:0,totalMs:0,lastMs:0,maxMs:0}
    value.count++;value.totalMs+=ms;value.lastMs=ms;value.maxMs=Math.max(value.maxMs,ms)
    this.stages.set(stage,value)
  }
  snapshot() { return Object.fromEntries([...this.stages].map(([stage,value])=>[stage,{...value}])) }
}
/** Anticipate measured latency, bounded to four compressed octaves. Ignore jumps. */
export function expmapReadAhead(delta:number, elapsedMs:number, latencyMs:number) {
  if(elapsedMs<=0 || Math.abs(delta)>4)return 1
  return Math.min(4,Math.max(1,Math.ceil(Math.abs(delta)/elapsedMs*latencyMs)+1))
}
