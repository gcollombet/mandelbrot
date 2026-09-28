// Cast shadows march a per-pixel relief height raster (color.wgsl,
// fs_cast_height → cast_shadow_visibility). That raster is a 17th sampled
// texture on the colour pass (18th on the ExpMap window path), so it is only
// bound where the device allows it; elsewhere the binding is replaced by a
// stub that reports "no surface", which disables the effect.

/** Sampled textures per stage the colour layout needs with the height raster (ExpMap window path included). */
export const CAST_SHADOW_REQUIRED_SAMPLED_TEXTURES = 18

/** Height raster format: one float, h / T in view half-heights. */
export const CAST_SHADOW_HEIGHT_FORMAT: GPUTextureFormat = 'r32float'

/** Value written where no surface can cast or receive a shadow. */
export const CAST_SHADOW_NO_SURFACE = -1e4

const BLOCK = /\/\/#CAST_SHADOW_BINDING[\s\S]*?\/\/#END_CAST_SHADOW_BINDING\n?/

/** color.wgsl without the height raster binding: cast shadows become a no-op. */
export function withoutCastShadowBinding(source: string): string {
    if (!BLOCK.test(source)) throw new Error('color.wgsl: cast shadow binding markers not found')
    return source.replace(BLOCK, 'fn cast_shadow_height(p: vec2<i32>) -> f32 { return CAST_SHADOW_NO_SURFACE; }\n')
}
