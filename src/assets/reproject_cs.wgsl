// Utility compute pass (all-compute-der-cartesian): ping-pong A→B port of the
// fragment brush (reproject.wgsl). Runs only on pan / clear frames; every
// texel writes ALL layers of B (full rewrite is this pass's job), then the
// engine copies B→A and the same frame's in-place dispatch continues
// iteration. Reading A while writing B makes the neighbour gather race-free.
//
// Deliberate difference from the fragment brush: NO sentinel refinement here.
// The fused in-place shader (mandelbrot_brush.wgsl cs_main) refines sentinels
// on every dispatch — including the one that follows this pass in the same
// frame — so refining here too would halve the sentinel step twice per pan
// frame (the 4× pixel-spike the allowRefinement gate exists to prevent).
// The fragment flow had the same one-refinement-per-frame budget, just
// distributed differently (brush refined, the iterate pass did not).
//
// Layer layout (r32float array, layer count read from the destination so the
// same shader serves the 8-layer and 9-layer formats):
//   0 : sentinel / iteration count (integer part)
//   1 : resolution step (1.0 = genuine pixel, >= 2 = resolve-copied, 0.0 = no data)
//   2 : z.x
//   3 : z.y
//   4 : dz.x (derivative real)          — escaped: DE height
//   5 : dz.y (derivative imag)          — escaped: relief angle
//   6 : ref_i + fractional stripe phase
//   7 : packed average orbit direction
//   8+: continuation extras (Cartesian derS) — copied like any other layer
//
// Sentinels in layer 0 are negative integers (-1 = compute, -2/-4/... =
// resolve with that step). Budget-exhausted pixels (iter > 0, |z|² < 4) pass
// through unchanged — continuation is the iteration shader's job, verbatim
// from the fragment brush.

struct BrushUniforms {
  aspect: f32,
  angle: f32,
  clearHistory: f32,
  seedStep: f32,
  baseSentinel: f32,
  shiftTexX: f32,
  shiftTexY: f32,
  mu: f32,
  gridOffsetX: f32,
  gridOffsetY: f32,
  minBrushStep: f32,    // minimum sentinel refinement step (0 = no limit)
  allowRefinement: f32, // 1.0 = refine sentinels normally, 0.0 = freeze grid (GPU under pressure)
};

@group(0) @binding(0) var<uniform> uni: BrushUniforms;
@group(0) @binding(1) var prevRaw: texture_2d_array<f32>;
@group(0) @binding(2) var dstRaw: texture_storage_2d_array<r32float, write>;

fn store_layer(coord: vec2<i32>, layer: i32, v: f32) {
  textureStore(dstRaw, coord, layer, vec4<f32>(v, 0.0, 0.0, 0.0));
}

fn store_cleared(coord: vec2<i32>, sentinel: f32, layers: i32) {
  store_layer(coord, 0, sentinel);
  for (var l = 1; l < layers; l++) {
    store_layer(coord, l, 0.0);
  }
}

fn store_copied(coord_out: vec2<i32>, coord_in: vec2<i32>, layers: i32) {
  for (var l = 0; l < layers; l++) {
    store_layer(coord_out, l, textureLoad(prevRaw, coord_in, l, 0).r);
  }
}

@compute @workgroup_size(16, 16)
fn cs_main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = vec2<i32>(textureDimensions(dstRaw));
  let coord_out = vec2<i32>(gid.xy);
  if (coord_out.x >= dims.x || coord_out.y >= dims.y) {
    return;
  }
  let layers = i32(textureNumLayers(dstRaw));

  // Full reset when needed.
  if (uni.clearHistory >= 0.5) {
    let step = i32(max(1.0, uni.seedStep));
    let is_anchor = (coord_out.x % step == 0) && (coord_out.y % step == 0);
    let sentinel = select(-uni.baseSentinel, -1.0, is_anchor);
    store_cleared(coord_out, sentinel, layers);
    return;
  }

  // Translation reprojection — always an integer-texel gather (spike 1.1:
  // the rounded shift is also what the JS-side accounting accumulates).
  let shift = vec2<i32>(i32(round(uni.shiftTexX)), i32(round(uni.shiftTexY)));
  let coord_in = coord_out - shift;

  if (coord_in.x < 0 || coord_in.y < 0 || coord_in.x >= dims.x || coord_in.y >= dims.y) {
    store_cleared(coord_out, -uni.baseSentinel, layers);
    return;
  }

  store_copied(coord_out, coord_in, layers);
}
