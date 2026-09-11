import { ExpmapStore } from './store'
import { decodeImageTile } from './imageDecode'
import { ExpmapLoadingMetrics } from './loadingMetrics'
import type { ExpmapManifest } from './manifest'
let store:ExpmapStore|undefined,manifest:ExpmapManifest|undefined,running=false
let request:{id:number;index:number}|undefined,active:AbortController|undefined,activeId:number|undefined
let activeIndex:number|undefined
let ahead:number[]=[],verificationIndex=0,verificationFailed=false
const encoded=new Map<number,Uint8Array>(),budget=64*1024*1024
let encodedBytes=0
function prune() {
  for(const [index,bytes] of encoded)if(!ahead.includes(index) && index!==request?.index) {encoded.delete(index);encodedBytes-=bytes.length}
}
async function read(index:number,signal:AbortSignal,metrics:ExpmapLoadingMetrics) {
  if(!manifest?.tiles[index] || !store)throw new Error('Tuile ExpMap invalide')
  const cached=encoded.get(index)
  if(cached) {encoded.delete(index);encodedBytes-=cached.length;return cached}
  return store.readTile(manifest.tiles[index],signal,metrics)
}
async function drain() {
  if(running || !store || !manifest)return
  running=true
  try {
    while(request || ahead.some(i=>!encoded.has(i))) {
      let job=request;request=undefined
      const index=job?.index ?? ahead.find(i=>!encoded.has(i))!
      // Oversized octaves are read on demand; speculative bytes stay bounded.
      if(!job && (!manifest.tiles[index] || manifest.tiles[index].length>budget-encodedBytes))break
      const controller=new AbortController();active=controller;activeId=job?.id;activeIndex=index
      let bitmap:ImageBitmap|undefined
      try {
        const metrics=new ExpmapLoadingMetrics()
        const bytes=await read(index,controller.signal,metrics)
        controller.signal.throwIfAborted()
        if(!job && request?.index===index) {job=request;request=undefined;activeId=job.id}
        if(job) {
          ahead=ahead.filter(i=>i!==index)
          const start=performance.now(),o=manifest.octaves
          bitmap=await decodeImageTile(bytes,o.tileWidth,o.tileHeight)
          controller.signal.throwIfAborted()
          metrics.record('decode',performance.now()-start)
          self.postMessage({id:job.id,bitmap,metrics:Object.fromEntries(Object.entries(metrics.snapshot()).map(([k,v])=>[k,v.lastMs]))},{transfer:[bitmap]});bitmap=undefined
        }else if(ahead.includes(index)) {encoded.set(index,bytes);encodedBytes+=bytes.length;self.postMessage({kind:'metrics',metrics:Object.fromEntries(Object.entries(metrics.snapshot()).map(([k,v])=>[k,v.lastMs]))})}
      }catch(error) {
        if(job)self.postMessage({id:job.id,error:{name:error instanceof Error?error.name:'Error',message:String(error)}})
        else ahead=ahead.filter(i=>i!==index)
      }finally {bitmap?.close();active=undefined;activeId=undefined;activeIndex=undefined}
    }
  }finally {running=false;scheduleVerification()}
}
let verificationTimer:ReturnType<typeof setTimeout>|undefined
function scheduleVerification() {
  if(verificationTimer || verificationFailed || !manifest || verificationIndex>=manifest.tiles.length)return
  verificationTimer=setTimeout(async()=>{
    verificationTimer=undefined
    if(running || request) {scheduleVerification();return}
    try {
      const start=performance.now()
      for(let n=0;n<16 && verificationIndex<manifest!.tiles.length;n++) {
        if(running || request)break
        await store!.verifyTile(manifest!.tiles[verificationIndex++])
        if(performance.now()-start>=4)break
      }
    }
    catch(error) {verificationFailed=true;self.postMessage({kind:'verification-error',message:String(error)})}
    scheduleVerification()
  },25)
}
self.onmessage=async({data})=>{
  if(data.kind==='cancel') {
    if(request?.id===data.id)request=undefined
    if(activeId===data.id)active?.abort()
    return
  }
  if(data.kind==='prefetch') {
    ahead=[...new Set<number>(data.indices)].filter(i=>Number.isInteger(i)&&!!manifest?.tiles[i]).slice(0,4)
    prune();if(active && activeId===undefined && !ahead.includes(activeIndex!))active.abort()
    void drain();return
  }
  if(data.kind==='read') {
    if(!Number.isInteger(data.index))return
    request={id:data.id,index:data.index}
    if(activeId===undefined && activeIndex!==data.index)active?.abort()
    void drain();return
  }
  try {
    if(data.kind!=='init')throw new Error('Requête ExpMap invalide')
    const start=performance.now()
    store=data.directory?new ExpmapStore(data.directory):await ExpmapStore.fromFile(data.file)
    manifest=await store.open(data.documentId,true)
    self.postMessage({id:data.id,metrics:{open:performance.now()-start}})
    scheduleVerification()
  }catch(error){self.postMessage({id:data.id,error:{name:error instanceof Error?error.name:'Error',message:String(error)}})}
}
