import { describe, it, expect } from 'vitest'
import { EXPMAP_EASES, fitMotion, motionProgress, validateMotion } from '../../src/expmap/motion'
import { magnitudeSummary, scaleFromDepth, videoFilename, zoomDepth } from '../../src/expmap/controls'

describe('ExpMap velocity ramps', () => {
  for (const {value: easeIn} of EXPMAP_EASES) for (const {value: easeOut} of EXPMAP_EASES) {
    it(`${easeIn}/${easeOut}: monotone, exact, independent transitions`, () => {
      const w={durationSeconds:10,easeIn,easeOut,easeInSeconds:2,easeOutSeconds:7,holdSeconds:2}
      validateMotion(w,10)
      expect(motionProgress(w,0)).toBe(0)
      expect(motionProgress(w,10)).toBe(1)
      expect(motionProgress(w,11)).toBe(1)
      let previous=0
      for(let i=1;i<=1000;i++) {
        const t=motionProgress(w,i/100)
        expect(t).toBeGreaterThanOrEqual(previous)
        expect(t).toBeLessThanOrEqual(1)
        previous=t
      }
      for (const join of [2,3]) expect(Math.abs(motionProgress(w,join-1e-7)-motionProgress(w,join+1e-7))).toBeLessThan(1e-6)
    })
  }
  it('handles no cruising phase, zero durations and stationary time', () => {
    const w={durationSeconds:10,easeIn:'smooth' as const,easeOut:'linger' as const,easeInSeconds:3,easeOutSeconds:7}
    expect(motionProgress(w,5)).toBeGreaterThan(0)
    expect(motionProgress(w,5)).toBeLessThan(1)
    expect(motionProgress({...w,easeInSeconds:0,easeOutSeconds:0},5)).toBe(.5)
  })
  it('rejects overlapping/invalid ramps and proportionally fits explicit duration reductions', () => {
    const w={durationSeconds:5,easeIn:'smooth' as const,easeOut:'linger' as const,easeInSeconds:2,easeOutSeconds:8,holdSeconds:2}
    expect(()=>validateMotion(w,5)).toThrow('transitions')
    expect(fitMotion(w)).toMatchObject({easeInSeconds:1,easeOutSeconds:4,holdSeconds:2})
    expect(()=>validateMotion({...w,holdSeconds:NaN},10)).toThrow()
    expect(()=>validateMotion({...w,easeIn:'bounce' as never},10)).toThrow()
    expect(()=>validateMotion({...w,easeOutSeconds:-1},10)).toThrow()
  })
})
describe('deep zoom controls', () => {
  it('spans the requested range without numerical underflow', () => {
    expect(scaleFromDepth(-10)).toBe('1e10')
    expect(scaleFromDepth(1000)).toBe('1e-1000')
    expect(zoomDepth('1e-1000')).toBeCloseTo(1000)
    expect(magnitudeSummary('1e+1','1e-26')).toBe('+1 → −26 · Magnitude 27'.replace('−','-'))
    expect(magnitudeSummary('1e-1000000','1e-1000020')).toContain('Magnitude 20')
    expect(magnitudeSummary('bad','1')).toBe('Plage à définir')
  })
  it('replaces only the real ExpMap extension', () => {
    expect(videoFilename('Spirale.expmap')).toBe('Spirale.mp4')
    expect(videoFilename('Spirale.EXPMAP')).toBe('Spirale.mp4')
    expect(videoFilename('Spirale.v2.expmap')).toBe('Spirale.v2.mp4')
  })
})
