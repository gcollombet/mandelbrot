import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadExpmapOutput, preferredExpmapCodec, saveExpmapOutput, loadExpmapPlayerDistribution, saveExpmapPlayerDistribution } from '../../src/expmap/outputPreferences'
import { probeMp4Codecs } from '../../src/videoEncoderSink'
import { validateExpmapView } from '../../src/expmap/renderer'
import { planExpmap } from '../../src/expmap/plan'
afterEach(()=>vi.unstubAllGlobals())
describe('ExpMap output preferences',()=>{
  it('defaults to 4K60 automatic and preserves independent output choices',()=>{
    let text:string|null=null
    vi.stubGlobal('localStorage',{getItem:()=>text,setItem:(_key:string,value:string)=>{text=value}})
    expect(loadExpmapOutput()).toMatchObject({width:3840,height:2160,fps:60,codec:'auto'})
    const custom={width:1920,height:1080,fps:24,codec:'hevc' as const,maxSamples:64,sampleDistribution:'r2' as const}
    saveExpmapOutput(custom);expect(loadExpmapOutput()).toEqual(custom)
    text=JSON.stringify({width:NaN,height:-1,fps:999,codec:'bad',maxSamples:3})
    expect(loadExpmapOutput()).toMatchObject({width:3840,height:2160,fps:60,codec:'auto',maxSamples:16})
  })
  it('defaults old preferences to grid and remembers the player independently',()=>{
    const storage=new Map<string,string>()
    vi.stubGlobal('localStorage',{getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)})
    storage.set('expmap-video-output',JSON.stringify({maxSamples:64}))
    expect(loadExpmapOutput().sampleDistribution).toBe('grid')
    expect(loadExpmapPlayerDistribution()).toBe('grid')
    saveExpmapPlayerDistribution('r2')
    expect(loadExpmapPlayerDistribution()).toBe('r2')
    expect(loadExpmapOutput().sampleDistribution).toBe('grid')
    storage.set('expmap-video-output',JSON.stringify({sampleDistribution:'invalid'}))
    expect(loadExpmapOutput().sampleDistribution).toBe('grid')
  })
  it('passes fps and dimensions to the actual native probe through mediabunny and falls back to AVC',async()=>{
    const configs:VideoEncoderConfig[]=[]
    vi.stubGlobal('navigator',{userAgent:'Chrome'})
    vi.stubGlobal('VideoEncoder',{isConfigSupported:async(config:VideoEncoderConfig)=>{configs.push(config);return {supported:config.codec.startsWith('avc'),config}}})
    const support=await probeMp4Codecs(3840,2160,60)
    expect(configs.length).toBeGreaterThan(0)
    expect(configs.every(c=>c.width===3840&&c.height===2160&&c.framerate===60&&c.hardwareAcceleration==='prefer-hardware')).toBe(true)
    expect(preferredExpmapCodec(support)).toBe('avc')
    expect(preferredExpmapCodec({hevc:true,avc:true})).toBe('hevc')
    expect(preferredExpmapCodec({hevc:false,avc:false,av1:true})).toBeNull()
  })
  it('allows explicit 4K enlargement without widening the stored coverage or interactive resolution',()=>{
    const p=planExpmap({domain:{cx:'0',cy:'0',startScale:'1',endScale:'1e-20'},width:1920,height:1080,density:1})
    const v={width:3840,height:2160,scale:'1e-10',angle:0}
    expect(()=>validateExpmapView(p,v)).toThrow()
    expect(()=>validateExpmapView(p,{...v,allowUpscale:true})).not.toThrow()
    expect(()=>validateExpmapView(p,{...v,allowUpscale:true,height:2000})).toThrow()
    expect(()=>validateExpmapView(p,{...v,allowUpscale:true,width:7680,height:4320})).toThrow()
  })
})
