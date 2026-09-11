export type ExpmapUploadContext={signal:AbortSignal;isRequired:()=>boolean}
export const EXPMAP_UPLOAD_BYTES=4*1024*1024
/** Let presentation run between prefetch groups, without a hidden-tab RAF dependency. */
function pause(signal:AbortSignal) {
  signal.throwIfAborted()
  return new Promise<void>((resolve,reject)=>{
    const abort=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);reject(signal.reason)}
    const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve()},16)
    signal.addEventListener('abort',abort,{once:true})
  })
}
export async function uploadExpmapBands(width:number,height:number,context:ExpmapUploadContext,
  copy:(y:number,rows:number)=>Promise<void>,yieldBetween:(signal:AbortSignal)=>Promise<void>=pause, flush?:()=>Promise<void>) {
  const rows=Math.max(1,Math.floor(EXPMAP_UPLOAD_BYTES/(width*4)))
  let queued=0
  try {
    for(let y=0;y<height;y+=rows) {
      context.signal.throwIfAborted()
      // Two bands per fence (at most 8 MiB); required views skip pacing delays.
      if(!context.isRequired() && queued===0)await yieldBetween(context.signal)
      context.signal.throwIfAborted()
      await copy(y,Math.min(rows,height-y))
      if(flush) {
        queued++
        if(queued===2 || y+rows>=height) {await flush();queued=0}
      }
    }
    context.signal.throwIfAborted()
  } finally {if(flush && queued)await flush()}
}
