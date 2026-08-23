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
      'const enabled = this.aaAnalyticEnabled && Number.isFinite(logDelta)',
    )
    expect(params).not.toContain("this.approximationMode === 'auto'")
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
    expect(brush).toMatch(/try_apply_jet\([^;]+&sndM, &sndS\)/)
    expect(brush).toMatch(/try_apply_mobius\([^;]+&sndM, &sndS\)/)
    expect(brush).toMatch(/try_apply_unified\([^;]+&sndM, &sndS\)/)
  })
})
