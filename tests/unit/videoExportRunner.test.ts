import { afterEach, describe, expect, it, vi } from 'vitest'
import { runVideoExportToWebm, type VideoExportRequest, type VideoExportRunnerDeps } from '../../src/videoExportRunner'
import { motionProgress } from '../../src/expmap/motion'
import { captureVideoCenter, captureVideoZoom, fractalVideoFilename } from '../../src/videoCameraControls'
import { createVideoSink } from '../../src/videoEncoderSink'
const sink=vi.hoisted(()=>({addFrame:vi.fn(),finalize:vi.fn(async()=>null),cancel:vi.fn(),streaming:false,codec:'hevc',fileExtension:'mp4'}))
vi.mock('../../src/videoEncoderSink',()=>({createVideoSink:vi.fn(async()=>sink)}))
afterEach(()=>{vi.clearAllMocks();vi.unstubAllGlobals()})
function fixture(mode: 'monolithic' | 'tiled-keyframe') {
  const clocks:(number|null)[]=[], timestamps:number[]=[]
  const navigator={cancel_transition:vi.fn(),origin:vi.fn(),scale:vi.fn(),angle:vi.fn(),start_export_transition:vi.fn()}
  const deps:VideoExportRunnerDeps={
    controller:{getNavigator:()=>navigator,setExportTime:t=>{clocks.push(t)},drawOnce:vi.fn(async()=>{})},
    engine:{beginVideoExportSession:vi.fn(async()=>{}),endVideoExportSession:vi.fn(),videoFrameReady:()=>true,beginVideoExportFrame:vi.fn(),beginExportFrameAa:vi.fn(),waitForSubmittedWork:async()=>{},captureExportFrame:async r=>{timestamps.push(r.timestampMicros);return {} as VideoFrame},getTiledExportMemoryProfile:()=>({squareBytesPerTexel:56,tileBytesPerTexel:144}),getVideoExportDiagnostics:()=>({keyframesBuilt:0,tilesConverted:0,pumpsPerTile:[],freeFrames:0})},
  }
  const request:VideoExportRequest={from:{cx:'0',cy:'0',scale:'1e10',angle:.3},to:{cx:'0',cy:'0',scale:'1e-1000',angle:5*Math.PI+.3},durationSeconds:4,motion:{easeIn:'smooth',easeInSeconds:1,easeOut:'linger',easeOutSeconds:3,holdSeconds:2},output:{width:32,height:24,fps:10,supersample:1,magnificationThreshold:2},codec:'hevc',destination:{kind:'buffer'},maxTextureDimension:8192,renderMode:mode}
  return {deps,request,clocks,timestamps,navigator}
}
describe('fractal video timeline wiring',()=>{
  it('routes HDR through float capture and 10-bit frames with uniform timing, including supersampling',async()=>{
    const {deps,request,timestamps}=fixture('monolithic')
    request.durationSeconds=.2;request.motion={};request.output={...request.output,dynamicRange:'hdr',hdrExposure:1,hdrQuantizer:14,supersample:2}
    deps.engine.captureHdrFrame=vi.fn(async()=>new Uint16Array(32*24*1.5).fill(650))
    vi.stubGlobal('VideoFrame',class {constructor(public data:Uint16Array,public init:Record<string,unknown>) {}})
    const result=await runVideoExportToWebm(deps,request)
    expect(result.framesEmitted).toBe(2)
    expect(timestamps).toEqual([])
    expect(deps.engine.beginVideoExportSession).toHaveBeenCalledWith(expect.objectContaining({hdr:true,supersample:2}))
    expect(deps.engine.captureHdrFrame).toHaveBeenCalledWith(32,24,2,expect.objectContaining({format:'video',exposure:1}))
    expect(createVideoSink).toHaveBeenCalledWith(expect.objectContaining({dynamicRange:'hdr',hdrQuantizer:14}))
    const [first,second]=sink.addFrame.mock.calls.map(c=>c[0])
    expect(first.init).toMatchObject({format:'I420P10',timestamp:0,duration:100000,colorSpace:{primaries:'bt2020',transfer:'pq'}})
    expect(second.init.timestamp).toBe(100000)
    expect(first.data).toHaveLength(32*24*1.5)
    // 406 nits is above the PQ code value of the 203 nit reference white (~573).
    expect(first.data[0]).toBeGreaterThan(600)
    expect(deps.engine.endVideoExportSession).toHaveBeenCalledOnce()
  })
  it('continues all HDR frames and reports clipping once for the film',async()=>{
    const {deps,request}=fixture('monolithic')
    request.durationSeconds=.3;request.motion={};request.output.dynamicRange='hdr';request.onWarning=vi.fn()
    deps.engine.captureHdrFrame=vi.fn(async(_w,_h,_ss,options)=>{
      options?.onWarning?.('Clipped HDR');return new Uint16Array(32*24*1.5)
    })
    vi.stubGlobal('VideoFrame',class {constructor(public data:Uint16Array,public init:unknown){}})
    const result=await runVideoExportToWebm(deps,request)
    expect(result.framesEmitted).toBe(3);expect(result.cancelled).toBe(false)
    expect(request.onWarning).toHaveBeenCalledExactlyOnceWith('Clipped HDR')
    expect(sink.finalize).toHaveBeenCalledOnce()
  })
  it('finalizes partial output when HDR conversion is interrupted',async()=>{
    const {deps,request}=fixture('monolithic')
    request.output.dynamicRange='hdr';request.signal={aborted:false}
    deps.engine.captureHdrFrame=vi.fn(async()=>{request.signal!.aborted=true;return new Uint16Array(32*24*4)})
    const result=await runVideoExportToWebm(deps,request)
    expect(result.cancelled).toBe(true);expect(result.framesEmitted).toBe(0)
    expect(sink.addFrame).not.toHaveBeenCalled();expect(sink.finalize).toHaveBeenCalledOnce()
    expect(sink.cancel).not.toHaveBeenCalled();expect(deps.engine.endVideoExportSession).toHaveBeenCalledOnce()
  })
  it('restores the session if HDR encoding is unavailable',async()=>{
    const {deps,request}=fixture('monolithic')
    request.output.dynamicRange='hdr';deps.engine.captureHdrFrame=vi.fn()
    vi.mocked(createVideoSink).mockRejectedValueOnce(new Error('HDR refusé'))
    await expect(runVideoExportToWebm(deps,request)).rejects.toThrow('HDR refusé')
    expect(deps.engine.endVideoExportSession).toHaveBeenCalledOnce()
    expect(deps.engine.captureHdrFrame).not.toHaveBeenCalled()
  })
  it.each(['monolithic','tiled-keyframe'] as const)('passes eased time and freezes the final clock in %s',async mode=>{
    const {deps,request,clocks,timestamps,navigator}=fixture(mode)
    const result=await runVideoExportToWebm(deps,request)
    expect(result.framesEmitted).toBe(60)
    const times=clocks.filter((t):t is number=>t!==null)
    expect(times[0]).toBe(0)
    expect(times[20]).toBeCloseTo(4*motionProgress({...request.motion,durationSeconds:4},6*20/59))
    expect(times.slice(40).every(t=>t===4)).toBe(true)
    expect(timestamps).toEqual(Array.from({length:60},(_,i)=>i*100000))
    expect(navigator.start_export_transition).toHaveBeenCalledWith('0','0','1e-1000',request.to.angle,4)
    expect(clocks.at(-1)).toBeNull()
    expect(deps.engine.endVideoExportSession).toHaveBeenCalledOnce()
  })
  it('rejects invalid motion before allocating a render session',async()=>{
    const {deps,request}=fixture('monolithic')
    request.motion={easeOut:'linger',easeOutSeconds:5}
    await expect(runVideoExportToWebm(deps,request)).rejects.toThrow('transitions')
    expect(deps.engine.beginVideoExportSession).not.toHaveBeenCalled()
  })
  it('restores the clock and finalizes partial output on cancellation',async()=>{
    const {deps,request,clocks}=fixture('monolithic')
    request.signal={aborted:false}
    sink.addFrame.mockImplementationOnce(async()=>{request.signal!.aborted=true})
    const result=await runVideoExportToWebm(deps,request)
    expect(result.cancelled).toBe(true);expect(result.framesEmitted).toBe(1)
    expect(clocks.at(-1)).toBeNull();expect(sink.finalize).toHaveBeenCalledOnce()
  })
})
describe('independent camera captures',()=>{
  const a={cx:'-.7436438870371510000000001',cy:'.13182590420533',scale:'1e-1000',angle:5*Math.PI}
  const current={cx:'-.12',cy:'.23',scale:'1e10',angle:1}
  it('changes the center without touching zoom or rotation',()=>{
    expect(captureVideoCenter(a,current)).toEqual({...a,cx:current.cx,cy:current.cy})
  })
  it('changes zoom without touching the exact center or rotation',()=>{
    expect(captureVideoZoom(a,current.scale)).toEqual({...a,scale:current.scale})
    expect(a.scale).toBe('1e-1000')
  })
  it('uses the requested filename exactly once with MP4 extension',()=>{
    expect(fractalVideoFilename('Minibrot.mp4')).toBe('Minibrot.mp4')
    expect(fractalVideoFilename(' ')).toBe('Fractale.mp4')
  })
})
