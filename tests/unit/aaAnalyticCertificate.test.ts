import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const engine = read('../../src/Engine.ts')
const reseed = read('../../src/assets/aa_reseed.wgsl')

describe('analytic AA Taylor certificate', () => {
  it('uses the original conservative z-prime dominance margin', () => {
    expect(reseed).toContain('const LN_MARGIN_THRESHOLD: f32 = 1.6094379; // ln 5')
    expect(reseed).toContain('fn log_complex_length_floor(')
    expect(reseed).toContain('let marginLog = logM1 + s - sndLog - params.aaLogDelta;')
    expect(reseed).toContain('&& marginLog > LN_MARGIN_THRESHOLD)')
  })

  it('retains explicit finite guards before evaluating the certificate', () => {
    expect(reseed).toContain('let finiteOk = iter > 0.0 && abs(iter) < 1e30')
    expect(reseed).toContain('&& abs(z.x) < 1e15 && abs(z.y) < 1e15')
    expect(reseed).toContain('&& abs(sndLog) < 1e30 && abs(sndAngle) < 1e30;')
    expect(reseed).toContain('finiteOk && max(abs(m1.x), abs(m1.y)) > 0.0')
  })

  it('uses one conservative whole-footprint bailout bound', () => {
    expect(reseed).toContain('let linearRadiusLog = logM1 + s + params.aaLogDelta;')
    expect(reseed).toContain('let quadraticRadiusLog = log(0.5) + sndLog + 2.0 * params.aaLogDelta;')
    expect(reseed).toContain('let minReconstructedAbs = length(z)')
    expect(reseed).toContain('&& minReconstructedAbs * minReconstructedAbs >= params.mu;')
    expect(reseed).not.toContain('quadratic_reconstruction_beyond_bailout')
  })

  it('does not evaluate palette phase or neighbouring texels', () => {
    expect(reseed).not.toContain('MAX_PALETTE_PHASE_ERROR')
    expect(reseed).not.toContain('MAX_NEIGHBOR_PHASE_ERROR')
    expect(reseed).not.toContain('palette_phase_error_at_offset')
    expect(reseed).not.toContain('neighbor_palette_phase_error')
    expect(reseed).not.toContain('palette_coordinate')
    expect(reseed).not.toContain('smooth_escape_fraction')
    expect(reseed).not.toContain('neighborCoord')
  })

  it('binds only coherent center values needed by the bailout guard', () => {
    expect(engine).toContain("{ binding: 5, visibility: GPUShaderStage.COMPUTE, texture: { sampleType: 'unfilterable-float', viewDimension: '2d-array' } }")
    expect(engine).toContain('{ binding: 5, resource: this.resolvedDisplay.valuesArrayView }')
    expect(reseed).toContain('textureLoad(valuesTex, coord, 0, 0)')
    expect(reseed).toContain('textureLoad(valuesTex, coord, 1, 0)')
    expect(reseed).toContain('textureLoad(valuesTex, coord, 2, 0)')
  })
})
