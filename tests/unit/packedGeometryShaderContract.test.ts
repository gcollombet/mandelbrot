import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const engine = read('../../src/Engine.ts')
const gpuPassTimings = read('../../src/gpuPassTimings.ts')
const resolve = read('../../src/assets/resolve.wgsl')
const merge = read('../../src/assets/merge_frozen.wgsl')
const color = read('../../src/assets/color.wgsl')
const aaTarget = read('../../src/assets/aa_target.wgsl')
const brush = read('../../src/assets/mandelbrot_brush.wgsl')
const preview = read('../../src/components/PalettePreview.vue')

describe('packed geometry display ABI', () => {
  it('uses three values plus geometry and metadata in both render pipelines', () => {
    expect(engine).toContain("const displayTargets: GPUColorTargetState[] = [")
    expect(engine.match(/\{ format: 'r32float' \}/g)).toHaveLength(3)
    expect(engine).toContain("{ format: 'rgba16float' }")
    expect(engine).toContain("{ format: 'r32uint' }")
    expect(resolve).toContain('@location(3) geometry: vec4<f32>')
    expect(resolve).toContain('@location(4) metadata: u32')
    expect(merge).toContain('@location(3) geometry: vec4<f32>')
    expect(merge).toContain('@location(4) metadata: u32')
  })

  it('packs provenance, stripe phase, and coherence without a display reference index', () => {
    expect(resolve).toContain('provenance_exponent(step) | (stripe << 4u) | (coherenceBits << 18u)')
    expect(brush).toContain('0x30000000u | stripe | (coherence << 14u)')
    expect(color).toContain('fn decode_support_step(metadata: u32) -> f32')
    expect(color).toContain('fn decode_stripe_phase(metadata: u32) -> f32')
    expect(color).toContain('fn decode_direction_coherence(metadata: u32) -> f32')
    expect(resolve).not.toContain('out.ref_i')
  })

  it('publishes terminal analytic geometry for every derivative-complete path', () => {
    expect(brush).toContain('fn analytic_terminal_geometry(')
    expect(brush).toContain('let taylorPayloadValid = sndValid;')
    expect(brush).not.toContain('let taylorPayloadValid = isUnified && sndValid;')
    expect(brush).not.toContain('let taylorPayloadValid = isUnifiedDeep && sndValid;')
    expect(brush).toContain('const ENABLE_SECOND_ORDER_GATE: bool = false;')
    expect(brush).toContain('INVALID_TAYLOR_PAYLOAD')
  })

  it('copies or interpolates analytic geometry without a spatial finalization pass', () => {
    expect(resolve).toContain('fn load_terminal_geometry(')
    expect(resolve).toContain('geometrySum = geometrySum + weight * load_terminal_geometry(candidate);')
    expect(resolve).not.toContain('analytic_height_gradient')
    expect(engine).not.toContain('geometry_finalize.wgsl')
    expect(engine).not.toContain('pipelineGeometry')
  })

  it('normalizes and selects live/frozen fields as one coherent source', () => {
    expect(merge).toContain('clamp(geometry.xy * ratio')
    expect(merge).toContain('clamp(geometry.z * ratio * ratio')
    expect(merge).toContain('geometry.w + log(ratio)')
    expect(merge).toContain('live.effectiveStep <= frozen.effectiveStep')
    expect(merge).toContain('out.metadata = candidate.metadata;')
  })
})

describe('typed display consumers', () => {
  it('uses cached gradient/curvature for base shading without distance-neighbour reads', () => {
    expect(color).toContain('var grad = cachedGradient * 24.0;')
    expect(color).toContain('var heightCurvature = cachedCurvature * 6.0;')
    expect(color).toContain('atan2(geometry.y, geometry.x)')
    expect(color).toContain('fn orbit_metric_gradients_at_coord(')
    expect(color).not.toContain('sample_neighbor_fields')
    expect(color).not.toContain('fn palette(sourceTex: texture_2d_array<f32>, sourceGeometry:')
  })

  it('retains z.xy for escape, mappings, and raw only for analytic AA', () => {
    expect(color).toContain('z: vec2<f32>')
    expect(color).toContain('texture_mapping_value')
    expect(color).toContain('let trapZ = z / escapeRadius;')
    expect(color).toContain('@group(0) @binding(14) var rawTex')
    expect(engine).toContain('ordinary color values always come from the typed display set')
  })

  it('reads AA height, picking fields, and palette preview from the typed set', () => {
    expect(aaTarget).toContain('let height = textureLoad(geometryTex, coord, 0).w;')
    expect(engine).toContain('const gradientX = float16ToFloat32')
    expect(engine).toContain('const metadata = words[')
    expect(preview).toContain('DISPLAY_VALUE_LAYERS')
    expect(preview).toContain("format: 'rgba16float'")
    expect(preview).toContain("format: 'r32uint'")
    expect(preview).not.toContain('LAYER_COUNT = 8')
  })

  it('reuses color caches only at the current field version with one resolve pass', () => {
    expect(engine).toContain('isDisplaySetCurrent(this.rawFieldVersion, this.resolvedDisplayVersion)')
    expect(engine).toContain('utilityNeeded || this.aaReseedPending || this.unfinishedPixelCount !== 0')
    expect(engine).toContain('this.rawFieldVersion++')
    expect(gpuPassTimings).toContain("key: 'resolve'")
    expect(gpuPassTimings).not.toContain("key: 'geometry'")
    expect(engine).toContain('this.resolvedDisplayVersion = this.rawFieldVersion')
  })
})
