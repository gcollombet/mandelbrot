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
let encoders: Encoder[] = [], hardwareRejected=false, badColor=false, missingMetadata=false, wrongDepth=false, quantizerRejected=false
class Encoder extends EventTarget {
  static isConfigSupported=vi.fn(async(config:VideoEncoderConfig)=>({supported:!(quantizerRejected&&config.bitrateMode==='quantizer')}))
  state='unconfigured'; config!:VideoEncoderConfig
  encodeQueueSize=0; flushes=0; delayed=false
  pending:Frame[]=[]; options:VideoEncoderEncodeOptions[]=[]
  constructor(private init:VideoEncoderInit) {super();encoders.push(this)}
  configure(config:VideoEncoderConfig) {this.config=config;this.state='configured'}
  encode(frame:Frame, options:VideoEncoderEncodeOptions={}) {
    this.options.push(options)
    if (hardwareRejected && this.config.hardwareAcceleration === 'prefer-hardware') throw new Error('Hardware refused input')
    if(this.delayed){this.pending.push(frame);return}
    this.output(frame)
  }
  output(frame:Frame) {
    const config={codec:wrongDepth?'vp09.00.41.08':this.config.codec,codedWidth:this.config.width,codedHeight:this.config.height,
      colorSpace:badColor?{primaries:'bt709',transfer:'bt709',matrix:'bt709',fullRange:false}:HDR_VIDEO_COLOR_SPACE}
    this.init.output(new Chunk(frame) as unknown as EncodedVideoChunk,
      (missingMetadata?{}:{decoderConfig:config}) as EncodedVideoChunkMetadata)
  }
  async flush() {this.flushes++;for(const frame of this.pending.splice(0))this.output(frame)}
  fail() {this.state='closed';this.init.error(new DOMException('Codec failure','EncodingError'))}
  close() {this.state='closed'}
}
const settings={codec:'vp9' as const,dynamicRange:'hdr' as const,width:2,height:2,fps:30,destination:{kind:'buffer' as const}}
const frame=()=>hdrInputFrame(new Uint16Array([750,750,750,750,512,512]),2,2,0,33333)
beforeEach(()=>{
  encoders=[];hardwareRejected=false;badColor=false;missingMetadata=false;wrongDepth=false;quantizerRejected=false
  vi.stubGlobal('VideoFrame',Frame);vi.stubGlobal('VideoEncoder',Encoder);vi.stubGlobal('EncodedVideoChunk',Chunk)
})
afterEach(()=>vi.unstubAllGlobals())

describe('native HDR video sink',()=>{
  it('preserves codec lookahead until finalization and keeps the keyframe cadence',async()=>{
    const sink=await createVideoSink(settings),encoder=encoders.at(-1)!
    encoder.delayed=true
    for(let i=0;i<65;i++)await sink.addFrame(hdrInputFrame(new Uint16Array(6),2,2,Math.round(i*1e6/30),33333))
    expect(encoder.flushes).toBe(0)
    expect(encoder.options.flatMap((o,i)=>o.keyFrame?[i]:[])).toEqual([0,60])
    expect(sink.framesEncoded).toBe(65)
    await sink.finalize()
    expect(encoder.flushes).toBe(1)
    expect(encoder.pending).toHaveLength(0)
  })
  it('waits for input queue capacity without flushing',async()=>{
    const sink=await createVideoSink(settings),encoder=encoders.at(-1)!,f=frame()
    encoder.encodeQueueSize=4
    const added=sink.addFrame(f)
    await new Promise(resolve=>setTimeout(resolve,0))
    expect(encoder.options).toHaveLength(0);expect(f.close).not.toHaveBeenCalled()
    encoder.encodeQueueSize=3;encoder.dispatchEvent(new Event('dequeue'))
    await added
    expect(encoder.options).toHaveLength(1);expect(encoder.flushes).toBe(0)
    expect(f.close).toHaveBeenCalledOnce();await sink.finalize()
  })
  it('releases a frame waiting for queue capacity if the codec fails',async()=>{
    const sink=await createVideoSink(settings),encoder=encoders.at(-1)!,f=frame()
    encoder.encodeQueueSize=4
    const added=sink.addFrame(f),rejection=expect(added).rejects.toThrow('Codec failure')
    await new Promise(resolve=>setTimeout(resolve,0));encoder.fail()
    await rejection
    expect(f.close).toHaveBeenCalledOnce();await sink.cancel()
  })
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
  it('encodes every frame at the requested constant quality',async()=>{
    const sink=await createVideoSink({...settings,hdrQuantizer:12}),encoder=encoders.at(-1)!
    expect(encoder.config.bitrateMode).toBe('quantizer');expect(encoder.config).not.toHaveProperty('bitrate')
    expect(sink.quantizer).toBe(12)
    for(let i=0;i<3;i++)await sink.addFrame(hdrInputFrame(new Uint16Array(6),2,2,Math.round(i*1e6/30),33333))
    expect(encoder.options.map(o=>o.vp9?.quantizer)).toEqual([12,12,12])
    expect(encoder.options[0].keyFrame).toBe(true)
    await sink.finalize()
  })
  it('falls back to variable bitrate when the encoder refuses quantizer mode',async()=>{
    quantizerRejected=true
    const sink=await createVideoSink({...settings,hdrQuantizer:12}),encoder=encoders.at(-1)!
    expect(encoder.config).toMatchObject({bitrateMode:'variable',bitrate:expect.any(Number)})
    expect(sink.quantizer).toBeUndefined()
    await sink.addFrame(frame())
    expect(encoder.options[0]).not.toHaveProperty('vp9')
    await sink.finalize()
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

it('honors an explicit HDR bitrate even when an old quantizer remains saved', async () => {
  const sink = await createVideoSink({ ...settings, hdrQuantizer: 10, encoding: { profile: 'custom', bitrateMbps: 90 } })
  const encoder = encoders.at(-1)!
  expect(encoder.config).toMatchObject({ bitrateMode: 'constant', bitrate: 90e6 })
  expect(sink.quantizer).toBeUndefined()
  await sink.addFrame(frame())
  expect(encoder.options[0]).not.toHaveProperty('vp9')
  await sink.finalize()
})
it('does not silently downgrade an explicit quantizer profile', async () => {
  quantizerRejected = true
  await expect(createVideoSink({ ...settings, hdrQuantizer: 12, encoding: { profile: 'quantizer', bitrateMbps: 100 } })).rejects.toThrow()
})
