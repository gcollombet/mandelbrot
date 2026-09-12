import type { RingPixels, RingRect } from './displayRings'

/** Closed files are published atomically. Only one cropped frame is in RAM. */
export class ShaderRingStore {
  directory:FileSystemDirectoryHandle
  constructor(directory:FileSystemDirectoryHandle){this.directory=directory}
  private async folder(ring:number,frame:number,create=false) {
    return (await this.directory.getDirectoryHandle(`ring-${ring}`,{create})).getDirectoryHandle(`frames-${Math.floor(frame/1000)}`,{create})
  }
  async checkpoint(identity:string,next?:number):Promise<number> {
    if(next===undefined) {
      try {
        const file=await (await this.directory.getFileHandle('checkpoint.json')).getFile()
        if(file.size>10000)throw new Error('Checkpoint trop grand')
        const value=JSON.parse(await file.text())
        if(value.version!==1||value.identity!==identity||!Number.isSafeInteger(value.next)||value.next<0)throw new Error('Checkpoint de couronnes incompatible')
        return value.next
      }catch(error){if(error instanceof DOMException&&error.name==='NotFoundError')return 0;throw error}
    }
    const writer=await (await this.directory.getFileHandle('checkpoint.json',{create:true})).createWritable()
    try{await writer.write(JSON.stringify({version:1,identity,next}));await writer.close()}catch(error){await writer.abort().catch(()=>{});throw error}
    return next
  }
  async write(ring:number,frame:number,pixels:RingPixels) {
    const header=new Uint32Array([0x31524753,ring,frame,...pixels.rect,pixels.data.length])
    const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',pixels.data))
    const file=await (await this.folder(ring,frame,true)).getFileHandle(`${frame}.bin`,{create:true})
    const writer=await file.createWritable()
    try{await writer.write({type:'write',position:0,data:new Uint8Array(header.buffer)});await writer.write({type:'write',position:32,data:pixels.data});await writer.write({type:'write',position:32+pixels.data.length,data:hash});await writer.close()}
    catch(error){await writer.abort().catch(()=>{});throw error}
  }
  async read(ring:number,frame:number,rect:RingRect,signal?:AbortSignal):Promise<RingPixels> {
    signal?.throwIfAborted()
    const file=await (await (await this.folder(ring,frame)).getFileHandle(`${frame}.bin`)).getFile()
    const bytes=rect[2]*rect[3]*8
    if(file.size!==64+bytes)throw new Error('Contribution tronquée')
    const header=new Uint32Array(await file.slice(0,32).arrayBuffer()),expected=[0x31524753,ring,frame,...rect,bytes]
    if(!expected.every((n,i)=>header[i]===n))throw new Error('Contribution incompatible')
    const data=new Uint8Array(await file.slice(32,32+bytes).arrayBuffer())
    const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',data)),stored=new Uint8Array(await file.slice(32+bytes).arrayBuffer())
    if(!hash.every((n,i)=>stored[i]===n))throw new Error('Contribution corrompue')
    signal?.throwIfAborted();return {rect,data}
  }
  /** Remove only files whose names were produced by this recipe. */
  async cleanup(rings:number,frames:number) {
    for(let ring=0;ring<rings;ring++) {
      const directory=await this.directory.getDirectoryHandle(`ring-${ring}`)
      for(let first=0;first<frames;first+=1000) {
        const name=`frames-${Math.floor(first/1000)}`,folder=await directory.getDirectoryHandle(name)
        for(let frame=first;frame<Math.min(first+1000,frames);frame++)await folder.removeEntry(`${frame}.bin`).catch(()=>{})
        await directory.removeEntry(name).catch(()=>{})
      }
      await this.directory.removeEntry(`ring-${ring}`).catch(()=>{})
    }
    await this.directory.removeEntry('checkpoint.json')
  }
}
