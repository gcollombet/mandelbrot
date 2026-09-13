import { afterEach, describe, expect, it, vi } from 'vitest'
import { planExpmap } from '../../src/expmap/plan'
import { shaderSourceEstimate, type ShaderExpmapManifest } from '../../src/expmap/displayFormat'
import { planShaderMemory, type ShaderExpmapRenderer } from '../../src/expmap/displayRenderer'
import { exportShaderRingVideo } from '../../src/expmap/displayRingVideo'
const mocks=vi.hoisted(()=>({export:vi.fn(),encode:vi.fn()}))
vi.mock('../../src/expmap/video',async importOriginal=>({...await importOriginal<typeof import('../../src/expmap/video')>(),exportExpmapVideo:mocks.export}))
vi.mock('../../src/videoEncoderSink',async importOriginal=>({...await importOriginal<typeof import('../../src/videoEncoderSink')>(),probeMp4Codecs:async()=>({hevc:true})}))
vi.mock('mediabunny',async importOriginal=>({...await importOriginal<typeof import('mediabunny')>(),canEncodeVideo:mocks.encode}))
afterEach(()=>vi.clearAllMocks())
function fixture(){
  const projection=planExpmap({domain:{cx:'0',cy:'0',startScale:'1',endScale:'.5'},width:32,height:18,density:1,blockSize:32})
  const manifest={projection,state:'complete'} as ShaderExpmapManifest
  const renderer={manifest,budgetBytes:1e9} as ShaderExpmapRenderer
  return {source:{manifest:{projection,state:'complete' as const,documentId:'test'}},request:{
    gpuRenderer:renderer,scratch:vi.fn(async()=>{throw new Error('No scratch expected')}),
    window:{fromScale:'1',toScale:'.5',fromAngle:0,toAngle:0,speed:10,durationSeconds:.1,authority:'duration' as const},
    width:128,height:72,fps:30,codec:'hevc' as const,destination:{kind:'buffer' as const},onProgress:vi.fn(),onPhase:vi.fn(),
  }}
}
describe('single ring direct export',()=>{
  it('uses the final encoder without opening scratch or probing intermediate codecs',async()=>{
    const {source,request}=fixture(),result={framesEmitted:3,cancelled:false,blob:null}
    mocks.export.mockImplementation(async(_source,options)=>{expect(options.gpuRenderer).toBe(request.gpuRenderer);options.onProgress(3,3);return result})
    expect(await exportShaderRingVideo(source,{...request,intermediateBitrate:NaN})).toBe(result)
    expect(request.scratch).not.toHaveBeenCalled();expect(mocks.encode).not.toHaveBeenCalled()
    expect(request.onProgress).toHaveBeenCalledWith(3,3)
    expect(request.onPhase).toHaveBeenLastCalledWith('Rendu et encodage direct · une couronne',3,3)
  })
  it.each([true,false])('keeps intermediates when requested or when multiple rings are needed (%s)',async keep=>{
    const {source,request}=fixture()
    if(!keep){const fixed=planShaderMemory(request.gpuRenderer.manifest,128,72,1e9,128*72*32).fixedBytes
      request.gpuRenderer.budgetBytes=fixed+6*shaderSourceEstimate(source.manifest.projection).octaveBytes}
    mocks.encode.mockRejectedValue(new Error('Intermediate path reached'))
    await expect(exportShaderRingVideo(source,{...request,keepIntermediates:keep})).rejects.toThrow('Intermediate path reached')
    expect(mocks.export).not.toHaveBeenCalled()
  })
  it('honors cancellation before starting direct encoding',async()=>{
    const {source,request}=fixture(),abort=new AbortController();abort.abort()
    await expect(exportShaderRingVideo(source,{...request,signal:abort.signal})).rejects.toThrow()
    expect(mocks.export).not.toHaveBeenCalled();expect(request.scratch).not.toHaveBeenCalled()
  })
})
