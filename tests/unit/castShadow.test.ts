import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { CAST_SHADOW_NO_SURFACE, withoutCastShadowBinding } from '../../src/castShadow'

const shader = readFileSync(new URL('../../src/assets/color.wgsl', import.meta.url), 'utf8')

describe('cast shadow height raster', () => {
  it('binds the raster at 21 and strips it into a no-surface stub', () => {
    expect(shader).toContain('@group(0) @binding(21) var castShadowHeightTex: texture_2d<f32>;')
    const stripped = withoutCastShadowBinding(shader)
    expect(stripped).not.toContain('@binding(21)')
    expect(stripped).not.toContain('castShadowHeightTex')
    expect(stripped).toContain('fn cast_shadow_height(p: vec2<i32>) -> f32 { return CAST_SHADOW_NO_SURFACE; }')
    expect(() => withoutCastShadowBinding('fn main() {}')).toThrow('markers')
  })

  it('shares the no-surface sentinel with the shader', () => {
    expect(shader).toContain(`const CAST_SHADOW_NO_SURFACE: f32 = ${CAST_SHADOW_NO_SURFACE.toExponential().replace('e+', 'e')};`)
  })
})
