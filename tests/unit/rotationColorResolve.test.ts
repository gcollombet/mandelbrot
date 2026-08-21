import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'
import {
  ROTATION_ALIGNMENT_EPSILON,
  rotationNeedsColorResolve,
} from '../../src/rotationColorResolve'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const engine = read('../../src/Engine.ts')
const colorShader = read('../../src/assets/color.wgsl')
const presentShader = read('../../src/assets/rotation_present.wgsl')

describe('settled rotation color resolve', () => {
  it('skips every 90-degree alignment and accepts oblique rotations', () => {
    for (const angle of [0, Math.PI / 2, Math.PI, -Math.PI / 2, 8 * Math.PI]) {
      expect(rotationNeedsColorResolve(angle)).toBe(false)
    }
    for (const angle of [Math.PI / 8, Math.PI / 4, -Math.PI / 3, Math.PI / 2 + 0.1]) {
      expect(rotationNeedsColorResolve(angle)).toBe(true)
    }
    expect(rotationNeedsColorResolve(Number.NaN)).toBe(false)
    expect(rotationNeedsColorResolve(Number.POSITIVE_INFINITY)).toBe(false)
    expect(rotationNeedsColorResolve(ROTATION_ALIGNMENT_EPSILON / 4)).toBe(false)
  })

  it('caches authoritative final color without generic field interpolation', () => {
    const cacheEntry = colorShader.slice(colorShader.indexOf('fn fs_rotation_cache('))
    expect(colorShader).toContain('fn vs_rotation_cache(')
    expect(cacheEntry).toContain('let c = shade_srgb(screenUv, false);')
    expect(cacheEntry).toContain('vec4<f32>(srgb_to_linear(c.rgb), c.a)')
    expect(cacheEntry).not.toContain('sample_escaped_bilinear(')
  })

  it('filters linear color and normalizes edge coverage before display encoding', () => {
    expect(presentShader).toContain('var rotationColorSampler: sampler')
    expect(presentShader).toContain('let sampleUv = vec2<f32>(neutralUv.x, 1.0 - neutralUv.y);')
    expect(presentShader).toContain('textureSampleLevel(rotationColorTex, rotationColorSampler, sampleUv, 0.0)')
    expect(presentShader).toContain('filtered.rgb / max(filtered.a, 1e-6)')
    expect(presentShader.indexOf('filtered.rgb / max(filtered.a, 1e-6)'))
      .toBeLessThan(presentShader.indexOf('linear_to_sRGB(linearColor)'))
    expect(presentShader.indexOf('linear_to_sRGB(linearColor)'))
      .toBeLessThan(presentShader.indexOf('dither_8bit(fragPosition.xy)'))
  })

  it('keeps rotation resolve exclusive with active or accumulated AA', () => {
    expect(engine).toContain('&& !this.aaActive')
    expect(engine).toContain('&& this.aaAccumulatedSamples === 0')
    expect(engine).toContain('this.suppressRotationColorResolve()')
    expect(engine).toContain('const rotationBakeThisFrame = !aaShowAccum')
    expect(engine).toContain('const rotationShowCache = !aaShowAccum')
    expect(engine).toContain('} else if (rotationShowCache && this.pipelineRotationPresent')
  })

  it('waits for a stable eligible view and retains the direct fallback', () => {
    expect(engine).toContain('&& !this.rotationColorResolveChangedThisUpdate')
    expect(engine).toContain('&& fullyConverged')
    expect(engine).toContain('&& !renderOptions.activateAnimate')
    expect(engine).toContain('&& !this.videoExportActive')
    expect(engine).toContain('&& this.debugViewMode === 0')
    expect(engine).toContain('} else if (!aaShowAccum && !rotationShowCache) {')
  })
})
