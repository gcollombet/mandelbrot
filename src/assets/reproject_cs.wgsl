// Utility compute pass (all-compute-der-cartesian): ping-pong A→B port of the
// fragment brush (reproject.wgsl). Runs only on pan / clear frames; every
// texel writes ALL layers of B (full rewrite is this pass's job), then the
// engine swaps A/B and the same frame's in-place dispatch continues iteration
// on the new front texture. Reading A while writing B makes the gather race-free.
//
// Layer layout (r32float array, layer count read from the destination so the
// same shader serves every raw continuation layer):
//   0 : exact request (-1) / iteration count
//   1 : resolution step (1.0 = genuine pixel, >= 2 = resolve-copied, 0.0 = no data)
//   2 : z.x
//   3 : z.y
//   4 : dz.x (derivative real)          — escaped: DE height
//   5 : dz.y (derivative imag)          — escaped: relief angle
//   6 : ref_i + fractional stripe phase
//   7 : packed average orbit direction
//   8+: continuation extras (Cartesian derS) — copied like any other layer
//
// There is a single unfinished representation: -1 asks for an exact texel.
// Budget-exhausted pixels (iter > 0, |z|² < mu) pass through unchanged;
// continuation is the fused iteration shader's job.

struct BrushUniforms {
  aspect: f32,
  angle: f32,
  clearHistory: f32,
  shiftTexX: f32,
  shiftTexY: f32,
  dispatchOriginX: f32,
  dispatchOriginY: f32,
  _padding: f32,
};

@group(0) @binding(0) var<uniform> uni: BrushUniforms;
@group(0) @binding(1) var prevRaw: texture_2d_array<f32>;
@group(0) @binding(2) var dstRaw: texture_storage_2d_array<r32float, write>;

fn store_layer(coord: vec2<i32>, layer: i32, v: f32) {
  textureStore(dstRaw, coord, layer, vec4<f32>(v, 0.0, 0.0, 0.0));
}

// A cleared texel carries `iter < 0`, so the iteration kernel treats it as a
// compute request and reads none of layers 2..N before overwriting them, and
// the resolve pass leaves a sentinel corner after reading layer 0 alone. Only
// layers 0 and 1 are ever observed in that state, so the remaining eleven
// stores were pure write bandwidth — the dominant cost of a clear frame.
fn store_cleared(coord: vec2<i32>) {
  store_layer(coord, 0, -1.0);
  store_layer(coord, 1, 0.0);
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

  // The neutral square circumscribes the rotated viewport, whose corners sit
  // exactly on the inscribed circle. Rotating about the centre can therefore
  // never bring a texel outside that disc into view, at any angle — so those
  // texels are neither displayed nor computed, and reprojecting them is pure
  // bandwidth (the square is 4/pi the area of the disc).
  //
  // The disc, and NOT the current viewport's bounding box, is the safe bound
  // here: unlike the iteration kernel, this pass is what keeps out-of-frame
  // texels aligned with the view. Skipping the box would leave texels a later
  // rotation brings back unshifted, and the iteration kernel would read them as
  // valid state. Two texels of margin cover partial coverage at the rim.
  //
  // Such a texel is stamped as a plain sentinel rather than left untouched:
  // skipping the write outright would leave stale content that the resolve
  // pass could pick up as a finished anchor while climbing from a texel on the
  // rim. A sentinel is what the iteration kernel would have left there anyway
  // — it never computes outside the viewport — so this loses nothing, and it
  // costs two stores instead of the thirteen loads plus thirteen stores of a
  // full copy.
  let centre = vec2<f32>(dims) * 0.5;
  let offset = vec2<f32>(coord_out) + vec2<f32>(0.5) - centre;
  let reach = centre.x + 2.0;
  if (dot(offset, offset) > reach * reach) {
    store_cleared(coord_out);
    return;
  }

  let layers = i32(textureNumLayers(dstRaw));

  // Full reset when needed.
  if (uni.clearHistory >= 0.5) {
    store_cleared(coord_out);
    return;
  }

  // Translation reprojection — always an integer-texel gather (spike 1.1:
  // the rounded shift is also what the JS-side accounting accumulates).
  let shift = vec2<i32>(i32(round(uni.shiftTexX)), i32(round(uni.shiftTexY)));
  let coord_in = coord_out - shift;

  if (coord_in.x < 0 || coord_in.y < 0 || coord_in.x >= dims.x || coord_in.y >= dims.y) {
    store_cleared(coord_out);
    return;
  }

  store_copied(coord_out, coord_in, layers);
}
