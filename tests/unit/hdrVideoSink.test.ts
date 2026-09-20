import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createVideoSink } from '../../src/videoEncoderSink'
import { HDR_VIDEO_COLOR_SPACE, hdrInputFrame } from '../../src/hdrVideo'

// Native codec is simulated; the actual Mediabunny muxer writes the MP4 bytes.
class Frame {
  format:string; codedWidth:number; codedHeight:number; timestamp:number; duration:number; colorSpace:unknown
  close=vi.fn()
  constructor(_data:unknown, init:Record<string,any>) { Object.assign(this,init) }
}
class Chunk {
  byteLength=1; type='key'; timestamp:number; duration:number
  constructor(frame:Frame) {this.timestamp=frame.timestamp;this.duration=frame.duration}
  copyTo(bytes:Uint8Array) { bytes[0]=0 }
}
let encoders: Encoder[] = [], hardwareRejected=false, badColor=false, missingMetadata=false, wrongDepth=false
class Encoder {
  static isConfigSupported=vi.fn(async()=>({supported:true}))
  state='unconfigured'; config!:VideoEncoderConfig
  constructor(private init:VideoEncoderInit) {encoders.push(this)}
  configure(config:VideoEncoderConfig) {this.config=config;this.state='configured'}
  encode(frame:Frame) {
    if (hardwareRejected && this.config.hardwareAcceleration === 'prefer-hardware') throw new Error('Hardware refused input')
    const config={codec:wrongDepth?'vp09.00.41.08':this.config.codec,codedWidth:this.config.width,codedHeight:this.config.height,
      colorSpace:badColor?{primaries:'bt709',transfer:'bt709',matrix:'bt709',fullRange:false}:HDR_VIDEO_COLOR_SPACE}
    this.init.output(new Chunk(frame) as unknown as EncodedVideoChunk,
      (missingMetadata?{}:{decoderConfig:config}) as EncodedVideoChunkMetadata)
  }
  async flush() {}
  close() {this.state='closed'}
}
const settings={codec:'vp9' as const,dynamicRange:'hdr' as const,width:2,height:2,fps:30,destination:{kind:'buffer' as const}}
const frame=()=>hdrInputFrame(new Uint16Array([750,750,750,750,512,512]),2,2,0,33333)
beforeEach(()=>{
  encoders=[];hardwareRejected=false;badColor=false;missingMetadata=false;wrongDepth=false
  vi.stubGlobal('VideoFrame',Frame);vi.stubGlobal('VideoEncoder',Encoder);vi.stubGlobal('EncodedVideoChunk',Chunk)
})
afterEach(()=>vi.unstubAllGlobals())

describe('native HDR video sink',()=>{
  it('writes 10-bit VP9 and the real Rec2020/PQ limited-range MP4 color box',async()=>{
    const sink=await createVideoSink(settings), f=frame()
    await sink.addFrame(f)
    expect(f.close).toHaveBeenCalledOnce()
    expect(sink.framesEncoded).toBe(1)
    const blob=await sink.finalize()
    const bytes=Buffer.from(await blob!.arrayBuffer())
    const colr=bytes.indexOf('nclx')
    expect(colr).toBeGreaterThan(0)
    expect([...bytes.subarray(colr+4,colr+11)]).toEqual([0,9,0,16,0,9,0])
    const vpc=bytes.indexOf('vpcC')
    expect(vpc).toBeGreaterThan(0)
    expect(bytes[vpc+10]>>4).toBe(10)
    expect(encoders.every(e=>e.state==='closed')).toBe(true)
  })
  it('tries a browser-selected encoder after real hardware input failure',async()=>{
    hardwareRejected=true
    const sink=await createVideoSink(settings)
    expect(encoders.map(e=>e.config.hardwareAcceleration)).toEqual(['prefer-hardware','no-preference','no-preference'])
    await sink.addFrame(frame());await sink.finalize()
    expect(encoders.every(e=>e.state==='closed')).toBe(true)
  })
  it.each(['color','depth','missing'] as const)('refuses incorrect %s metadata before opening the MP4 writer',async failure=>{
    badColor=failure==='color';wrongDepth=failure==='depth';missingMetadata=failure==='missing'
    await expect(createVideoSink(settings)).rejects.toThrow(/HDR|10 bits/)
    expect(encoders).toHaveLength(2)
    expect(encoders.every(e=>e.state==='closed')).toBe(true)
  })
  it('rejects an encoder that changes to SDR during the film',async()=>{
    const sink=await createVideoSink(settings)
    badColor=true
    const f=frame()
    await expect(sink.addFrame(f)).rejects.toThrow('Rec.2020/PQ')
    expect(sink.framesEncoded).toBe(0)
    expect(f.close).toHaveBeenCalledOnce()
    await sink.cancel()
    expect(encoders.every(e=>e.state==='closed')).toBe(true)
  })
  it('rejects and closes an 8-bit input frame',async()=>{
    const sink=await createVideoSink(settings),f=frame()
    Object.assign(f,{format:'RGBA'})
    await expect(sink.addFrame(f)).rejects.toThrow('incompatible')
    expect(f.close).toHaveBeenCalledOnce();await sink.cancel()
  })
  it('supports direct streaming with HDR signaling and finalization',async()=>{
    const parts:Uint8Array[]=[],close=vi.fn()
    const sink=await createVideoSink({...settings,destination:{kind:'stream',writable:new WritableStream({write:chunk=>{parts.push(chunk.slice())},close})}})
    await sink.addFrame(frame());expect(await sink.finalize()).toBeNull()
    expect(Buffer.concat(parts).includes(Buffer.from('nclx'))).toBe(true)
    expect(close).toHaveBeenCalledOnce()
  })
})
