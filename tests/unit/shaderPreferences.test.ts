import { shaderSamplingFlags } from '../../src/expmap/displaySampling'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SHADER_PREFERENCES, loadShaderPreferences, saveShaderPreferences } from '../../src/expmap/displayPreferences'
const store = new Map<string, string>()
vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => store.set(k, v) })
afterEach(() => store.clear())
describe('shader preferences', () => {
  it('defaults to 4K at 60 fps with 100 Mbit/s intermediates', () => {
    expect(loadShaderPreferences()).toEqual(DEFAULT_SHADER_PREFERENCES)
    expect(DEFAULT_SHADER_PREFERENCES).toMatchObject({ width: 3840, height: 2160, fps: 60, ringBitrateMbps: 100 })
  })
  it('migrates combined modes and saves all four independent combinations', () => {
    for(const [legacy,interpolation,sampleDistribution] of [['bilinear','bilinear','grid'],['nearest-r2','nearest','r2'],['unknown','bilinear','grid']]){
      store.set('shader-expmap-preferences',JSON.stringify({samplingMode:legacy,samples:256}))
      expect(loadShaderPreferences()).toMatchObject({interpolation,sampleDistribution,samples:256})
    }
    for(const interpolation of ['bilinear','nearest'] as const)for(const sampleDistribution of ['grid','r2'] as const){
      saveShaderPreferences({...DEFAULT_SHADER_PREFERENCES,interpolation,sampleDistribution})
      expect(loadShaderPreferences()).toMatchObject({interpolation,sampleDistribution})
      expect(shaderSamplingFlags(interpolation,sampleDistribution)).toEqual([interpolation==='nearest'?1:0,sampleDistribution==='r2'?1:0])
    }
    store.set('shader-expmap-preferences',JSON.stringify({samplingMode:'nearest-r2',interpolation:'bilinear',sampleDistribution:'grid'}))
    expect(loadShaderPreferences()).toMatchObject({interpolation:'bilinear',sampleDistribution:'grid'})
    store.set('shader-expmap-preferences',JSON.stringify({interpolation:'unknown',sampleDistribution:'unknown'}))
    expect(loadShaderPreferences()).toEqual(DEFAULT_SHADER_PREFERENCES)
    expect(shaderSamplingFlags()).toEqual([0,0])
    expect(()=>shaderSamplingFlags('unknown' as never)).toThrow('invalide')
    expect(()=>shaderSamplingFlags('nearest','unknown' as never)).toThrow('invalide')
  })
  it('round-trips saved values and rejects invalid ones', () => {
    saveShaderPreferences({ ...DEFAULT_SHADER_PREFERENCES, width: 1920, height: 1080, fps: 30, samples: 64, ringFirst: false, previewScale: '1e-5' })
    expect(loadShaderPreferences()).toMatchObject({ width: 1920, height: 1080, fps: 30, samples: 64, ringFirst: false, previewScale: '1e-5' })
    store.set('shader-expmap-preferences', JSON.stringify({ width: 7, fps: 17, samples: 5, codec: 'nope', ringBitrateMbps: 9999 }))
    expect(loadShaderPreferences()).toEqual(DEFAULT_SHADER_PREFERENCES)
    store.set('shader-expmap-preferences', '{not json')
    expect(loadShaderPreferences()).toEqual(DEFAULT_SHADER_PREFERENCES)
  })
})
