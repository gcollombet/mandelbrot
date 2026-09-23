import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const engine = read('../../src/Engine.ts')
const brush = read('../../src/assets/mandelbrot_brush.wgsl')

describe('analytic AA approximation-mode eligibility', () => {
  it('does not restrict the analytic payload to Auto mode', () => {
    const params = engine.match(
      /private aaAnalyticParams[\s\S]*?return \{ logDelta, enabled \}/,
    )?.[0] ?? ''

    expect(params).toContain(
      'const enabled = !this.expmapProjection && this.aaAnalyticEnabled && Number.isFinite(logDelta)',
    )
    expect(params).not.toContain("this.approximationMode === 'auto'")
  })

  it('falls back to exact re-iteration below the low-bailout floor', () => {
    // At mu = 4 the fixed-n extrapolation across a band edge is off by up to
    // 0.5 iteration (c is not negligible against z²), which shifted every
    // contour under AA. The gate lives in the shared predicate so the reseed
    // tag, the color flag and the payload allocation all agree.
    expect(engine).toContain('const AA_ANALYTIC_MIN_MU = 64')
    const params = engine.match(
      /private aaAnalyticParams[\s\S]*?return \{ logDelta, enabled \}/,
    )?.[0] ?? ''
    expect(params).toContain('>= AA_ANALYTIC_MIN_MU')
    expect(params).toContain('Number.isFinite(logDelta) && muOk')
  })

  it('keeps the analytic raw layers whenever analytic AA is enabled', () => {
    expect(engine).toContain(
      'return analyticRawPayloadNeeded ? RAW_LAYERS : RAW_BASE_LAYERS',
    )
    expect(engine).toContain(
      'antialiasLevel > 1 && this.aaAnalyticParams(aspect).enabled',
    )
  })

  it('propagates z-second through exact and every accelerated kernel', () => {
    expect(brush).toContain('snd_exact_step(derM, derS + derSLo, zPrev, &sndM, &sndS)')
    expect(brush).toMatch(/try_apply_bla\([^;]+&sndM, &sndS\)/)
    expect(brush).toMatch(/try_apply_bla_deep\([^;]+&sndM, &sndS\)/)
    // z″ ← A·z″ through every accepted affine block, on both paths; Padé
    // blocks add their curvature on top of the same update (definition +
    // two affine call sites + the one inside apply_pade_derivatives).
    expect(brush.match(/apply_affine_derivatives\(/g)).toHaveLength(4)
    expect(brush.match(/apply_pade_derivatives\(/g)).toHaveLength(3)
  })
})
