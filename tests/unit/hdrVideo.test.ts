import { afterEach, describe, expect, it, vi } from 'vitest'
import { assertHdrDecoderConfig, hdrEncoderConfig, hdrVideoPlanes, HDR_VIDEO_COLOR_SPACE, supportsHdrEncoder } from '../../src/hdrVideo'
import { normalizeVideoExportPreferences } from '../../src/videoExportPreferences'
import { validateVideoOutput } from '../../src/videoPath'

function pixels(...colors: number[][]) { return new Uint16Array(colors.flatMap(c => [...c,0x3c00])) }
function solid(value: number) { return pixels(...Array.from({length:4},()=>[value,value,value])) }
function pqDecode(value: number) {
  const p = value ** (32 / 2523)
  return 10000 * (Math.max(p - 3424 / 4096, 0) / (2413 / 128 - 2392 / 128 * p)) ** (16384 / 2610)
}
const spec = {codec:'hevc' as const,width:3840,height:2160,fps:60}
const hdrConfig = (codec: string, description?: Uint8Array) => ({codec,description,colorSpace:HDR_VIDEO_COLOR_SPACE} as unknown as VideoDecoderConfig)
afterEach(()=>vi.unstubAllGlobals())

describe('HDR video conversion', () => {
  it('stores right-aligned limited-range 10-bit planes and retains highlights above white', async () => {
    const black = await hdrVideoPlanes(2,2,solid(0))
    expect([...black]).toEqual([64,64,64,64,512,512])
    const white = await hdrVideoPlanes(2,2,solid(0x3c00))
    const bright = await hdrVideoPlanes(2,2,solid(0x4400))
    expect(white.slice(4)).toEqual(new Uint16Array([512,512]))
    expect(pqDecode((white[0]-64)/876)).toBeCloseTo(203,-1)
    // Dither + rounding bounds error by one code value; PQ is nonlinear in nits.
    expect(pqDecode((bright[0]-64-1)/876)).toBeLessThan(812)
    expect(pqDecode((bright[0]-64+1)/876)).toBeGreaterThan(812)
    expect(bright[0]).toBeGreaterThan(white[0])
    expect(await hdrVideoPlanes(2,2,solid(0x3c00),2)).toEqual(bright)
  })
  it('averages chroma before quantization and places U then V after luma', async () => {
    const red = await hdrVideoPlanes(2,2,pixels([0x3c00,0,0],[0x3c00,0,0],[0x3c00,0,0],[0x3c00,0,0]))
    expect(red[4]).toBeLessThan(512); expect(red[5]).toBeGreaterThan(512)
    const mixed = await hdrVideoPlanes(2,2,pixels([0x3c00,0,0],[0,0,0],[0,0,0],[0,0,0]))
    expect(Math.abs(mixed[4]-(512+(red[4]-512)/4))).toBeLessThanOrEqual(1)
    expect(Math.abs(mixed[5]-(512+(red[5]-512)/4))).toBeLessThanOrEqual(1)
  })
  it('rejects overflow, NaN, infinities, invalid exposure and dimensions', async () => {
    await expect(hdrVideoPlanes(2,2,solid(0x6400))).rejects.toThrow('10 000')
    for (const bad of [0x7e00,0x7c00,0xfc00]) await expect(hdrVideoPlanes(2,2,solid(bad))).rejects.toThrow('non finie')
    await expect(hdrVideoPlanes(2,2,solid(0),17)).rejects.toThrow('Exposition')
    await expect(hdrVideoPlanes(3,2,new Uint16Array(24))).rejects.toThrow('Dimensions')
    await expect(hdrVideoPlanes(2,2,new Uint16Array(4))).rejects.toThrow('Dimensions')
  })
  it('can abort during a large conversion', async () => {
    const signal = {aborted:false}
    setTimeout(()=>{signal.aborted=true},0)
    await expect(hdrVideoPlanes(2,64,new Uint16Array(2*64*4),0,signal)).rejects.toMatchObject({name:'AbortError'})
  })
})

describe('10-bit encoder contract', () => {
  it('requests explicit 10-bit profiles, never H264', () => {
    expect(hdrEncoderConfig(spec,'prefer-hardware')).toMatchObject({codec:'hvc1.2.4.L153.B0',hardwareAcceleration:'prefer-hardware',width:3840,height:2160,framerate:60})
    expect(hdrEncoderConfig({...spec,codec:'av1'},'no-preference').codec).toContain('M.10.')
    expect(hdrEncoderConfig({...spec,codec:'vp9'},'no-preference').codec).toContain('vp09.02.51.10.')
    expect(()=>hdrEncoderConfig({...spec,codec:'avc'},'prefer-hardware')).toThrow('SDR')
  })
  it('requires confirmed PQ/Rec2020 and 10-bit metadata, including HEVC bit depth', () => {
    const hvcc = new Uint8Array(23); hvcc[17]=0xfa;hvcc[18]=0xfa
    expect(()=>assertHdrDecoderConfig(hdrConfig('hvc1.2.4.L153.B0',hvcc),'hevc')).not.toThrow()
    hvcc[18]=0xf8
    expect(()=>assertHdrDecoderConfig(hdrConfig('hvc1.2.4.L153.B0',hvcc),'hevc')).toThrow('10 bits')
    expect(()=>assertHdrDecoderConfig(hdrConfig('vp09.02.51.10'),'vp9')).not.toThrow()
    expect(()=>assertHdrDecoderConfig(hdrConfig('vp09.00.51.08'),'vp9')).toThrow('10 bits')
    expect(()=>assertHdrDecoderConfig(hdrConfig('av01.0.13M.10',new Uint8Array([0x81,0,0x40,0])),'av1')).not.toThrow()
    expect(()=>assertHdrDecoderConfig(hdrConfig('av01.0.13M.10',new Uint8Array([0x81,0,0x60,0])),'av1')).toThrow('10 bits')
    expect(()=>assertHdrDecoderConfig({codec:'av01.0.13M.10',colorSpace:{primaries:'bt709'}},'av1')).toThrow('Rec.2020/PQ')
  })
  it('checks the browser input format and releases the probe frame', async () => {
    const close=vi.fn(), support=vi.fn(async()=>({supported:true}))
    vi.stubGlobal('VideoFrame', class {format='I420P10';close=close})
    vi.stubGlobal('VideoEncoder',{isConfigSupported:support})
    await expect(supportsHdrEncoder(spec,'prefer-hardware')).resolves.toBe(true)
    expect(close).toHaveBeenCalledOnce()
    support.mockRejectedValueOnce(new Error('refused'))
    await expect(supportsHdrEncoder(spec,'prefer-hardware')).rejects.toThrow('refused')
    expect(close).toHaveBeenCalledTimes(2)
  })
  it('persists HDR choices and rejects invalid HDR output before rendering', () => {
    expect(normalizeVideoExportPreferences({dynamicRange:'hdr',hdrExposure:-2})).toMatchObject({dynamicRange:'hdr',hdrExposure:-2})
    expect(normalizeVideoExportPreferences({dynamicRange:'unknown',hdrExposure:Infinity})).toMatchObject({dynamicRange:'sdr',hdrExposure:0})
    const output={width:1920,height:1080,fps:60,supersample:1,magnificationThreshold:2,dynamicRange:'hdr' as const}
    expect(validateVideoOutput(output,8192)).toEqual([])
    expect(validateVideoOutput({...output,width:1919},8192).map(p=>p.message).join()).toContain('paires')
    expect(validateVideoOutput({...output,hdrExposure:NaN},8192).map(p=>p.message).join()).toContain('Exposition')
  })
})
