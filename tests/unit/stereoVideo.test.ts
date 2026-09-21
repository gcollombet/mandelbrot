import { describe, expect, it } from 'vitest'
import { normalizeStereoVideo, stereoProjection } from '../../src/stereoVideo'
describe('stereo projection contract',()=>{
  it('keeps legacy exports mono and bounds persisted strength',()=>{
    expect(normalizeStereoVideo()).toEqual({enabled:false,strength:1,layout:'side-by-side'})
    expect(normalizeStereoVideo({enabled:true,strength:NaN})).toEqual({enabled:true,strength:1,layout:'side-by-side'})
    expect(normalizeStereoVideo({strength:-1}).strength).toBe(0)
    expect(normalizeStereoVideo({strength:99}).strength).toBe(3)
  })
  it('keeps every eye ray inside coverage at all depths and preserves the projection/view relation',()=>{
    for(const [w,h] of [[16,12],[1920,1080],[3840,2160]])for(const strength of [0,1,3]){
      const p=stereoProjection(w,h,strength)
      expect(p.eyeSlope/(2*w/h)).toBeCloseTo(p.shift,12)
      for(const eye of [-1,1])for(const z of [-1,0,1])for(const u of [0,1]){
        const source=(u-.5)*p.crop+.5+eye*p.shift*z
        expect(source).toBeGreaterThanOrEqual(0)
        expect(source).toBeLessThanOrEqual(1)
      }
    }
  })
  it('uses resolution-independent parallax and opposite disparity across the convergence plane',()=>{
    expect(stereoProjection(1920,1080,1).shift).toBe(stereoProjection(3840,2160,1).shift)
    const p=stereoProjection(1920,1080,1)
    // x_eye = x_surface - signedShift * height: foreground has crossed disparity.
    const left=.5-(-p.shift)*1,right=.5-p.shift*1
    expect(left).toBeGreaterThan(right)
    expect(stereoProjection(1920,1080,0).eyeSlope).toBe(0)
  })
})

it('migrates legacy packing and validates the axis being split',async()=>{
  const {validateStereoDimensions}=await import('../../src/stereoVideo')
  expect(normalizeStereoVideo({enabled:true,strength:1}).layout).toBe('side-by-side')
  expect(normalizeStereoVideo({layout:'top-bottom'}).layout).toBe('top-bottom')
  expect(()=>validateStereoDimensions(32,17,'top-bottom')).toThrow('hauteur paire')
  expect(()=>validateStereoDimensions(31,18,'side-by-side')).toThrow('largeur paire')
  expect(()=>validateStereoDimensions(31,18,'top-bottom')).not.toThrow()
})
