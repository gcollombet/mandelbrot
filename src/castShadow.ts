// Cast shadows march a per-pixel relief height raster (color.wgsl,
// fs_cast_height → fs_light_occlusion). That raster and the half-resolution
// light occlusion are the 17th-18th sampled textures of the colour pass (19th
// on the ExpMap window path), so they are only
// bound where the device allows it; elsewhere the binding is replaced by a
// stub that reports "no surface", which disables the effect.

/** Sampled textures per stage the colour layout needs with the height raster (ExpMap window path included). */
export const CAST_SHADOW_REQUIRED_SAMPLED_TEXTURES = 19

/** Height raster format: one float, h / T in view half-heights. */
export const CAST_SHADOW_HEIGHT_FORMAT: GPUTextureFormat = 'r32float'

/** Half-resolution light occlusion: (shadow, horizon, h / T, 1). */
export const LIGHT_OCCLUSION_FORMAT: GPUTextureFormat = 'rgba16float'

/** Value written where no surface can cast or receive a shadow. */
export const CAST_SHADOW_NO_SURFACE = -1e4

const BLOCK = /\/\/#CAST_SHADOW_BINDING[\s\S]*?\/\/#END_CAST_SHADOW_BINDING\n?/

/** color.wgsl without the height raster binding: cast shadows become a no-op. */
export function withoutCastShadowBinding(source: string): string {
    if (!BLOCK.test(source)) throw new Error('color.wgsl: cast shadow binding markers not found')
    return source.replace(BLOCK, 'fn cast_shadow_height(p: vec2<i32>) -> f32 { return CAST_SHADOW_NO_SURFACE; }\n'
        + 'fn light_occlusion_load(p: vec2<i32>) -> vec4<f32> { return vec4<f32>(1.0, 1.0, CAST_SHADOW_NO_SURFACE, 0.0); }\n')
}
