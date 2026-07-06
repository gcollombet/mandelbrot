// One-shot bake of the per-neutral-texel AA sample-count target, derived from
// the distance estimate already stored in the converged neutral texture.
//
// Neutral layer layout (see mandelbrot_brush.wgsl):
//   layer 0 = iter  (> 0 escaped, == 0 interior/in-set)
//   layer 4 = distance_height = clamp(-log(DE_texels), -64, 64); high → near boundary.
//
// Result: target sample count in [1, antialiasLevel]. Smooth regions (interior,
// far exterior) get 1; boundary pixels ramp up to antialiasLevel.

struct AaParams {
  antialiasLevel: f32,
  aaSampleIndex: f32,   // unused here; shared buffer with the reseed pass
  screenHeightPx: f32,  // device-pixel screen height (1 neutral texel == 1 device px)
  aaLogDelta: f32,      // unused here; shared buffer with the reseed pass
  aaAnalytic: f32,      // unused here; shared buffer with the reseed pass
  _pad0: f32,
  _pad1: f32,
  _pad2: f32,
};

// Boundary-distance ramp (device px): full sample count within R_FULL, tapering
// to 1 sample by R_OUT. Distance to the set boundary is recovered exactly as
// de_px = (screenHeightPx / 2) * exp(-height), since height = ln((H/2) / DE_px).
const R_FULL: f32 = 1.0;
const R_OUT: f32 = 6.0;

@group(0) @binding(0) var src: texture_2d_array<f32>;
@group(0) @binding(1) var dst: texture_storage_2d<r32float, write>;
@group(0) @binding(2) var<uniform> params: AaParams;

@compute @workgroup_size(16, 16)
fn cs_main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dim = textureDimensions(dst);
  if (gid.x >= dim.x || gid.y >= dim.y) {
    return;
  }
  let coord = vec2<i32>(i32(gid.x), i32(gid.y));
  let iter = textureLoad(src, coord, 0, 0).r;
  let height = textureLoad(src, coord, 4, 0).r;
  let level = max(params.antialiasLevel, 1.0);

  var nSamples = 1.0;
  // Only escaped pixels carry a meaningful exterior distance estimate; interior
  // (iter == 0) and non-escaped pixels are flat → 1 sample.
  if (iter > 0.0) {
    let de_px = (params.screenHeightPx * 0.5) * exp(-height);
    // 1 at de_px >= R_OUT, ramping to full sample count at de_px <= R_FULL.
    let t = 1.0 - smoothstep(R_FULL, R_OUT, de_px);
    nSamples = clamp(round(1.0 + t * (level - 1.0)), 1.0, level);
  }
  textureStore(dst, coord, vec4<f32>(nSamples, 0.0, 0.0, 0.0));
}
