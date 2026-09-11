import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const read = (name: string) => readFileSync(new URL(`../../src/assets/${name}.wgsl`, import.meta.url), 'utf8')
const resolve = read('resolve'), merge = read('merge_frozen'), color = read('color'), brush = read('mandelbrot_brush')
const storageMax = Number(resolve.match(/const DISPLAY_STORAGE_MAX: f32 = ([\d.]+)/)![1])
const store = (x: number) => Number.isFinite(x) ? Math.max(-storageMax, Math.min(storageMax, x)) : 0
const display = (x: number) => Math.max(-64, Math.min(64, x))

describe('geometry range across source and destination scales', () => {
  it('preserves distinct slopes and curvature previously collapsed by source saturation', () => {
    expect([128,256].map(x => display(store(x)/16))).toEqual([8,16])
    expect([256,1024].map(x => display(store(x)/256))).toEqual([1,4])
    expect([128,256].map(x => display(display(x)/16))).toEqual([4,4])
  })
  it('preserves signed cancellation before shading during reconstruction', () => {
    expect(display((store(128)+store(-96))/2)).toBe(16)
    expect((display(128)+display(-96))/2).toBe(0)
  })
  it('retains the pointwise display limit at the original scale', () => {
    for (const x of [-65504,-256,-64,-1,0,1,64,256,65504]) expect(display(store(x))).toBe(display(x))
  })
  it('retains a finite half-float storage bound and invalid-value rejection', () => {
    expect(storageMax).toBe(65504)
    expect([1e30,-1e30,Infinity,-Infinity,NaN].map(store)).toEqual([65504,-65504,0,0,0])
    expect(resolve).toContain('select(0.0, value, finite_scalar(value))')
  })
  it('keeps producer and intermediate passes free of the visual clamp', () => {
    expect(brush).toContain('return vec3<f32>(gradient, laplacian)')
    expect(brush).toContain('return vec2<f32>(w.y, -w.x)')
    expect(brush).toContain('exp(clamp(laplacianLog, -80.0, 80.0))')
    for (const shader of [brush, resolve, merge]) expect(shader).not.toContain('64.0')
    expect(merge).toContain('const DISPLAY_STORAGE_MAX: f32 = 65504.0')
    expect(color).toContain('clamp(stored.xy * ratio, vec2<f32>(-64.0), vec2<f32>(64.0))')
    expect(color).toContain('clamp(stored.z * ratio * ratio, -64.0, 64.0)')
  })
})
