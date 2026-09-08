export type ExpmapUploadContext={signal:AbortSignal;isRequired:()=>boolean}
export const EXPMAP_UPLOAD_BYTES=4*1024*1024
/** Let presentation run between prefetch bands, without a hidden-tab RAF dependency. */
function pause(signal:AbortSignal) {
  signal.throwIfAborted()
  return new Promise<void>((resolve,reject)=>{
    const abort=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);reject(signal.reason)}
    const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve()},16)
    signal.addEventListener('abort',abort,{once:true})
  })
}
export async function uploadExpmapBands(width:number,height:number,context:ExpmapUploadContext,
  copy:(y:number,rows:number)=>Promise<void>,yieldBetween:(signal:AbortSignal)=>Promise<void>=pause) {
  const rows=Math.max(1,Math.floor(EXPMAP_UPLOAD_BYTES/(width*4)))
  for(let y=0;y<height;y+=rows) {
    context.signal.throwIfAborted()
    // Prefetch yields before every band; required views drain without timer delays.
    if(!context.isRequired())await yieldBetween(context.signal)
    context.signal.throwIfAborted()
    await copy(y,Math.min(rows,height-y))
  }
  context.signal.throwIfAborted()
}
