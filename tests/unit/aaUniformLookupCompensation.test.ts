import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const engine = read('../../src/Engine.ts')
const shader = read('../../src/assets/color.wgsl')
const preview = read('../../src/components/PalettePreview.vue')

describe('uniform AA shifted-lattice lookup', () => {
  it('passes the current scene-space jitter only for non-adaptive AA', () => {
    expect(engine).toContain(
      'renderOptions.aaAdaptive === false ? this.aaOffsetX : 0, // 19: uniform-AA inverse lookup X',
    )
    expect(engine).toContain(
      'renderOptions.aaAdaptive === false ? this.aaOffsetY : 0, // 95: uniform-AA inverse lookup Y',
    )
  })

  it('subtracts the jitter in live raw-texture space', () => {
    expect(shader).toContain('aaLookupOffsetX: f32')
    expect(shader).toContain('aaLookupOffsetY: f32')
    expect(shader).toContain(
      'vec2<f32>(parameters.aaLookupOffsetX, parameters.aaLookupOffsetY) / (2.0 * neutralExtent)',
    )
    expect(shader).toContain('+ vec2<f32>(0.5, 0.5) - aaLookupUvOffset;')
  })

  it('keeps direct rendering and the palette preview unshifted', () => {
    expect(shader).toContain('let aaLookupUvOffset = select(')
    expect(shader).toContain('applyAaGate\n  );')
    expect(shader).toContain('let c = shade_srgb(fragCoord, false);')
    expect(preview).toContain('0, // aaLookupOffsetX (preview never accumulates AA)')
    expect(preview).toContain('0, // aaLookupOffsetY')
  })
})
