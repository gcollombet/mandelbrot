import { afterEach, describe, expect, it, vi } from 'vitest'
import { runVideoExportToWebm, type VideoExportRequest, type VideoExportRunnerDeps } from '../../src/videoExportRunner'
import { motionProgress } from '../../src/expmap/motion'
import { captureVideoCenter, captureVideoZoom, fractalVideoFilename } from '../../src/videoCameraControls'
const sink=vi.hoisted(()=>({addFrame:vi.fn(),finalize:vi.fn(async()=>null),cancel:vi.fn(),streaming:false,codec:'hevc',fileExtension:'mp4'}))
vi.mock('../../src/videoEncoderSink',()=>({createVideoSink:vi.fn(async()=>sink)}))
afterEach(()=>vi.clearAllMocks())
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
