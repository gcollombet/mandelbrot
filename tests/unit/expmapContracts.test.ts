import { describe, expect, it } from 'vitest'
import { canonicalDecimal, canonicalScale, compareScales, scaleDoublements } from '../../src/expmap/decimal'
import { canonicalJson, contentIdentity, expmapAppearanceProblems, expmapBlockingProblems, freezeExpmapAppearance } from '../../src/expmap/appearance'
import { createDefaultAnimationConfig, ANIMATION_TRACK_IDS } from '../../src/AnimationConfig'
import { EFFECT_FIELD_NAMES, DEFAULT_VALUES } from '../../src/effectFieldConfig'
import type { RenderOptions } from '../../src/Engine'
import { EXPMAP_COLOR_PROFILE, validateExpmapManifest, type ExpmapManifest } from '../../src/expmap/manifest'
import { planExpmapOctaves } from '../../src/expmap/octaves'
import { planExpmap } from '../../src/expmap/plan'

function options(): RenderOptions {
  const animation = createDefaultAnimationConfig()
  for (const track of Object.values(animation.tracks)) track.enabled = false
  return { colorStops: [{ color: '#f00', position: 0 }, { color: '#00f', position: 1 }], heightPaletteShift: 0, phaseColoringStrength: 0, animation } as RenderOptions
}

describe('ExpMap canonical decimals', () => {
  it('preserves all digits, huge exponents, signs and zeros', () => {
    expect(canonicalDecimal('-001.230000e-4000')).toBe('-1.23e-4000')
    expect(canonicalDecimal('-0.000')).toBe('0')
    expect(canonicalScale('.12345678901234567890123456789e-1000000')).toBe('1.2345678901234567890123456789e-1000001')
    expect(compareScales('1e-999999999999999999999', '10e-1000000000000000000000')).toBe(0)
  })
  it.each(['0', '-1', 'NaN', 'Infinity', '1e', '', '0x10', '1e-1.5'])('rejects invalid scale %s', value => {
    expect(() => canonicalScale(value)).toThrow()
  })
  it('compares tiny differences without rounding or underflow', () => {
    expect(compareScales('1.00000000000000000001e-9999', '1e-9999')).toBe(1)
    const d = scaleDoublements('1.00000000000000000001e-9999', '1e-9999')
    expect(d / (1e-20 / Math.LN2)).toBeCloseTo(1, 14)
    expect(scaleDoublements('1e-9999', '1.00000000000000000001e-9999')).toBe(-d)
  })
  it('computes distance before subtracting large logs, including stationary depth', () => {
    expect(scaleDoublements('1048576e-1000000', '1e-1000000')).toBeCloseTo(20, 12)
    expect(scaleDoublements('1e-1000000', '1048576e-1000000')).toBeCloseTo(-20, 12)
    expect(scaleDoublements('10e-1000001', '1e-1000000')).toBe(0)
    expect(scaleDoublements('1e-1000000', '9.9999999999999999999e-1000001')).toBeGreaterThan(0)
  })
})

describe('ExpMap appearance eligibility', () => {
  it('accepts static orbit colors and inactive material parameters', () => {
    const opts = options()
    opts.colorStops[1] = { ...opts.colorStops[1], stripeAverage: 1, rotationMean: 1, roughness: 0.8, dielectricSpecular: 0.4 }
    expect(expmapAppearanceProblems(opts)).toEqual([])
  })
  it.each(['shading', 'tessellation', 'webcam'])('finds %s on every stop', field => {
    for (let index = 0; index < 2; index++) {
      const opts = options()
      Object.assign(opts.colorStops[index], { [field]: 0.2 })
      expect(expmapAppearanceProblems(opts).some(p => p.stopIndex === index)).toBe(true)
    }
  })
  it.each(EFFECT_FIELD_NAMES)('checks nonfinite %s even on an unused stop', field => {
    const opts = options()
    opts.colorStops[1][field] = NaN
    expect(expmapAppearanceProblems(opts).some(p => p.field === field)).toBe(true)
  })
  it('accepts a palette populated with all neutral defaults', () => {
    const opts = options()
    Object.assign(opts.colorStops[0], DEFAULT_VALUES)
    expect(expmapAppearanceProblems(opts)).toEqual([])
  })
  it.each(ANIMATION_TRACK_IDS.filter(id => !['lightAngle', 'skyReflectionDrift', 'varnish', 'microBump', 'protrusionPhase', 'reliefDepth', 'textureDrift', 'displacement', 'tessellation'].includes(id)))('refuses enabled animation %s that changes the rendered colors', id => {
    const opts = options()
    opts.animation.tracks[id].enabled = true
    opts.activateAnimate = true
    expect(expmapAppearanceProblems(opts).some(p => p.field === `animation.${id}`)).toBe(true)
    opts.animation.tracks[id].amplitude = 0
    expect(expmapAppearanceProblems(opts)).toEqual([])
  })
  it.each(['heightPaletteShift'])('refuses %s without mutating it', field => {
    const opts = options()
    Object.assign(opts, { [field]: 0.2 })
    const before = JSON.stringify(opts)
    expect(expmapAppearanceProblems(opts).some(p => p.field === field)).toBe(true)
    expect(JSON.stringify(opts)).toBe(before)
  })
  it('accepts phase coloring, orbital colors and unused relief/reflection without changing the recipe', () => {
    const opts = options()
    opts.phaseColoringStrength = 75
    Object.assign(opts.colorStops[1], {stripeAverage: 1, rotationMean: 1, skybox: 1, stripeReliefTilt: 1, directionCoherenceReliefTilt: 1, protrusion: 1})
    const before = JSON.stringify(opts)
    expect(expmapAppearanceProblems(opts)).toEqual([])
    expect(JSON.stringify(opts)).toBe(before)
    opts.colorStops[0].shading = 0.5
    expect(expmapAppearanceProblems(opts).some(p => p.field === 'shading')).toBe(true)
  })
  it.each(['phaseColoringStrength', 'heightPaletteShift'])('still rejects nonfinite %s', field => {
    const opts = options(); Object.assign(opts, {[field]: NaN})
    expect(expmapAppearanceProblems(opts).some(p => p.field === field)).toBe(true)
  })
  it.each(['lightAngle', 'skyReflectionDrift', 'varnish', 'microBump', 'protrusionPhase', 'reliefDepth', 'textureDrift', 'displacement', 'tessellation'] as const)('ignores inactive animation %s but detects its consumer on another stop', id => {
    const opts = options(); opts.animation.tracks[id].enabled = true
    expect(expmapAppearanceProblems(opts)).toEqual([])
    Object.assign(opts.colorStops[1], {shading: 1, tessellation: 1})
    expect(expmapAppearanceProblems(opts).some(p => p.field === `animation.${id}`)).toBe(true)
  })
  it('bakes fixed phase contributions when animation is paused or has zero speed', () => {
    for (const mode of ['paused', 'track', 'global']) {
      const opts = options(), track = opts.animation.tracks.phaseColoring
      track.enabled = true; track.phase = 0.25
      opts.activateAnimate = mode !== 'paused'
      if (mode === 'track') track.speed = 0
      if (mode === 'global') opts.animation.globalSpeed = 0
      expect(expmapAppearanceProblems(opts)).toEqual([])
    }
  })
  it('forces every appearance restriction without altering baked parameters', async () => {
    const opts = options()
    Object.assign(opts.colorStops[0], {shading: 1, tessellation: 1, webcam: 1})
    opts.heightPaletteShift = 25; opts.debugShading = 1; opts.activateAnimate = true
    opts.animation.tracks.paletteOffset.enabled = true
    const before = canonicalJson(opts)
    expect(expmapBlockingProblems(opts).length).toBeGreaterThan(0)
    await expect(freezeExpmapAppearance(opts)).rejects.toThrow()
    expect(expmapBlockingProblems(opts, true)).toEqual([])
    expect((await freezeExpmapAppearance(opts, true)).json).toBe(before)
    expect(canonicalJson(opts)).toBe(before)
  })
  it('cannot force invalid palettes or nonfinite data', async () => {
    for (const mutate of [(o: RenderOptions) => { o.colorStops = [] }, (o: RenderOptions) => { o.colorStops[0].position = 2 }, (o: RenderOptions) => { o.phaseColoringStrength = NaN }, (o: RenderOptions) => { o.animation.tracks.lightAngle.phase = Infinity }]) {
      const opts = options(); mutate(opts)
      expect(expmapBlockingProblems(opts, true).some(p => p.kind === 'invalid')).toBe(true)
      await expect(freezeExpmapAppearance(opts, true)).rejects.toThrow()
    }
  })
  it('content identities are stable and sensitive to resource bytes', async () => {
    expect(canonicalJson({ b: 2, a: [1] })).toBe(canonicalJson({ a: [1], b: 2 }))
    expect(await contentIdentity(new Uint8Array([1]))).not.toBe(await contentIdentity(new Uint8Array([2])))
    expect(() => canonicalJson({ a: Infinity })).toThrow()
  })
})

function manifest(): ExpmapManifest {
  const projection = planExpmap({ domain: { cx: '-0.123456789012345678901', cy: '0', startScale: '1e-1000', endScale: '1e-1100' }, width: 64, height: 48, density: 1 })
  return {
    version: 5, name: 'Fixture', quality:0.9, forceRender: false, documentId: 'fixture', generation: 0, state: 'preparing', createdAt: '2026-09-05T00:00:00Z',
    scaleConvention: 'VideoPathLocation.scale', zoomReferenceScale: '1e0',
    projection, octaves: planExpmapOctaves(projection),
    appearance: { identity: 'sha256:' + 'a'.repeat(64), json: '{}', resources: [] },
    color: EXPMAP_COLOR_PROFILE, tiles: [],
  }
}

describe('ExpMap manifest contract', () => {
  it('requires an explicit experimental flag and preserves both modes', () => {
    for (const forceRender of [false, true]) {
      const m = {...manifest(), forceRender}
      expect(() => validateExpmapManifest(JSON.parse(JSON.stringify(m)))).not.toThrow()
    }
    const m = manifest(); delete (m as Partial<ExpmapManifest>).forceRender
    expect(() => validateExpmapManifest(m)).toThrow('experimental')
  })
  it('round-trips deep canonical bounds without a Number conversion', () => {
    const source = manifest()
    const restored = JSON.parse(JSON.stringify(source))
    validateExpmapManifest(restored)
    expect(restored.projection.domain).toEqual(source.projection.domain)
  })
  it('refuses color substitution, altered projection, and empty completion', () => {
    const a = manifest(); a.color = { ...a.color, chroma: '444' } as unknown as typeof a.color
    expect(() => validateExpmapManifest(a)).toThrow('codec/colorimetry')
    const b = manifest(); b.projection.rhoStep *= 2
    expect(() => validateExpmapManifest(b)).toThrow('projection')
    const c = manifest(); c.state = 'complete'
    expect(() => validateExpmapManifest(c)).toThrow('missing tiles')
  })
})
