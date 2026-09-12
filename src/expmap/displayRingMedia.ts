import { ShaderRingStore } from './displayRingStore'
import type { RingRect, ShaderRing } from './displayRings'
import type { ShaderExpmapManifest } from './displayFormat'
import type { ExpmapView } from './renderer'

/** Stable even-sized envelope for the entire film, including fractional zoom. */
export function ringVideoRect(m:ShaderExpmapManifest,view:ExpmapView,ring:ShaderRing):RingRect {
  const {width,height}=view
  if(width%2||height%2)throw new Error('Les vidéos de couronnes exigent des dimensions paires')
  if(view.effects?.radialMode==='mirror')return [0,0,width,height]
  // Keep tiny central streams compatible with hardware codec block sizes.
  const r=Math.max(32,m.projection.radius*height/m.projection.height*2**(1-ring.first)+2)
  const x=Math.max(0,Math.floor((width/2-r)/2)*2),y=Math.max(0,Math.floor((height/2-r)/2)*2)
  const right=Math.min(width,Math.ceil((width/2+r)/2)*2),bottom=Math.min(height,Math.ceil((height/2+r)/2)*2)
  return [x,y,right-x,bottom-y]
}
export function ringVideoBitrate(rect:RingRect,width:number,height:number,fullBitrate:number) {
  if(!Number.isFinite(fullBitrate)||fullBitrate<100000||fullBitrate>1e9)throw new Error('Débit intermédiaire invalide')
  return Math.max(100000,Math.round(fullBitrate*rect[2]*rect[3]/(width*height)))
}

export class RingMediaStore extends ShaderRingStore {
  async ringDirectory(ring:number,create=false){return this.directory.getDirectoryHandle(`ring-${ring}`,{create})}
  async videoFile(ring:number,create=false){return (await this.ringDirectory(ring,create)).getFileHandle('color.mp4',{create})}
  private async maskFile(ring:number,frame:number,create=false){
    const dir=await (await this.ringDirectory(ring,create)).getDirectoryHandle(`masks-${Math.floor(frame/1000)}`,{create})
    return dir.getFileHandle(`${frame}.gz`,{create})
  }
  async writeMask(ring:number,frame:number,rect:RingRect,alpha:Uint8Array<ArrayBuffer>) {
    if(alpha.length!==rect[2]*rect[3]*2)throw new Error('Masque de couronne invalide')
    const header=new Uint32Array([0x31414d53,ring,frame,...rect,alpha.length])
    const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',alpha))
    const payload=new Uint8Array(await new Response(new Blob([alpha]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer())
    const writer=await (await this.maskFile(ring,frame,true)).createWritable()
    try {
      await writer.write({type:'write',position:0,data:new Uint8Array(header.buffer)})
      await writer.write({type:'write',position:32,data:hash})
      await writer.write({type:'write',position:64,data:payload});await writer.close()
    }catch(error){await writer.abort().catch(()=>{});throw error}
  }
  async readMask(ring:number,frame:number,rect:RingRect,signal?:AbortSignal) {
    signal?.throwIfAborted()
    const file=await (await this.maskFile(ring,frame)).getFile(),size=rect[2]*rect[3]*2
    if(file.size<64||file.size>size*2+1024)throw new Error('Taille de masque invalide')
    const header=new Uint32Array(await file.slice(0,32).arrayBuffer()),expected=[0x31414d53,ring,frame,...rect,size]
    if(!expected.every((n,i)=>header[i]===n))throw new Error('Masque incompatible')
    const result=new Uint8Array(size),reader=file.slice(64).stream().pipeThrough(new DecompressionStream('gzip')).getReader()
    let offset=0
    try {
      while(true){signal?.throwIfAborted();const chunk=await reader.read();if(chunk.done)break
        if(offset+chunk.value.length>size)throw new Error('Masque décompressé trop grand')
        result.set(chunk.value,offset);offset+=chunk.value.length
      }
    }finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
    if(offset!==size)throw new Error('Masque tronqué')
    const hash=new Uint8Array(await crypto.subtle.digest('SHA-256',result)),stored=new Uint8Array(await file.slice(32,64).arrayBuffer())
    if(!hash.every((n,i)=>n===stored[i]))throw new Error('Masque corrompu')
    signal?.throwIfAborted();return result
  }
  async cleanupVideos(rings:number,frames:number) {
    // Reset first: interrupted cleanup must never advertise missing videos as complete.
    await this.directory.removeEntry('checkpoint.json')
    for(let ring=0;ring<rings;ring++) {
      const dir=await this.ringDirectory(ring)
      await dir.removeEntry('color.mp4').catch(()=>{})
      for(let first=0;first<frames;first+=1000){
        const name=`masks-${Math.floor(first/1000)}`,folder=await dir.getDirectoryHandle(name)
        for(let frame=first;frame<Math.min(first+1000,frames);frame++)await folder.removeEntry(`${frame}.gz`).catch(()=>{})
        await dir.removeEntry(name).catch(()=>{})
      }
      await this.directory.removeEntry(`ring-${ring}`).catch(()=>{})
    }
  }
}
