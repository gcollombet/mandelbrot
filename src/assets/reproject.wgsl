// Brush pass: updates sentinel levels in the neutral square texture.
//
// Sentinels are stored in the red channel as negative integers:
//   -1  : needs Mandelbrot computation
//   -2  : needs resolve with step=2
//   -4  : needs resolve with step=4
//   ...
// We keep the rest of the pixel data unchanged for already-computed pixels.
//
// This pass outputs a new raw texture (ping-pong A -> B).

struct BrushUniforms {
  aspect: f32,
  angle: f32,
  clearHistory: f32,
  seedStep: f32,
  baseSentinel: f32,
  shiftTexX: f32,
  shiftTexY: f32,
  pad0: f32,
};

@group(0) @binding(0) var<uniform> uni: BrushUniforms;
@group(0) @binding(1) var prevRaw: texture_2d<f32>;

struct VSOut {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  var pos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( 1.0,  1.0)
  );
  var o: VSOut;
  o.position = vec4<f32>(pos[vid], 0.0, 1.0);
  o.uv = (pos[vid] + vec2<f32>(1.0)) * 0.5;
  return o;
}

fn rotate(v: vec2<f32>, angle: f32) -> vec2<f32> {
  let s = sin(angle);
  let c = cos(angle);
  return vec2<f32>(c * v.x - s * v.y, s * v.x + c * v.y);
}

fn is_inside_rotated_screen(xy_neutral: vec2<f32>) -> bool {
  // Neutral texture uses a square domain large enough to contain the rotated screen.
  // We work in "local" coordinates where the screen rectangle is:
  //   local.x in [-aspect, +aspect]
  //   local.y in [-1, +1]
  // The neutral square corresponds to the half-diagonal extent:
  //   neutralExtent = sqrt(aspect^2 + 1)
  let neutralExtent = sqrt(uni.aspect * uni.aspect + 1.0);
  let local_rot = xy_neutral * neutralExtent;
  let local = rotate(local_rot, -uni.angle);
  let inside_x = abs(local.x) <= uni.aspect;
  let inside_y = abs(local.y) <= 1.0;
  return inside_x && inside_y;
}

fn refine_sentinel(s: f32, coord_out: vec2<i32>) -> f32 {
  // Progressively refine the neutral texture by creating new "anchor" points.
  //
  // Convention:
  //   s == -step (step is power-of-two)
  // Meaning:
  //   - the pixel is not computed yet
  //   - the resolve pass will snap to the parent at multiples of `step`
  //
  // To make resolve work at each refinement level, we must ensure the parent pixels
  // are themselves computed. We do that by turning pixels aligned with `step/2`
  // into -1 (compute request), while the others become -(step/2).
  let si = i32(round(s));
  if (si >= 0) {
    return s;
  }
  if (si == -1) {
    return -1.0;
  }

  let step = -si;
  if (step <= 1) {
    return -1.0;
  }

  let next_step = max(1, step / 2);
  // For step==2, `next_step` becomes 1, which makes everything an anchor.
  let is_anchor = (coord_out.x % next_step == 0) && (coord_out.y % next_step == 0);
  return select(-f32(next_step), -1.0, is_anchor);
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let dims = vec2<i32>(textureDimensions(prevRaw, 0));
  let coord_out = vec2<i32>(
    i32(clamp(uv.x * f32(dims.x), 0.0, f32(dims.x - 1))),
    i32(clamp((1.0 - uv.y) * f32(dims.y), 0.0, f32(dims.y - 1)))
  );

  // Full reset when needed: seed base sentinel everywhere,
  // and create anchors with -1 on a regular grid.
  if (uni.clearHistory >= 0.5) {
    let step = i32(max(1.0, uni.seedStep));
    let is_anchor = (coord_out.x % step == 0) && (coord_out.y % step == 0);
    let sentinel = select(-uni.baseSentinel, -1.0, is_anchor);
    return vec4<f32>(sentinel, 0.0, 0.0, 1.0);
  }

  // Translation reprojection: sample the previous texture at a shifted coordinate.
  // shiftTexX / shiftTexY are in texel units.
  let shift = vec2<i32>(i32(round(uni.shiftTexX)), i32(round(uni.shiftTexY)));
  let coord_in = coord_out - shift;

  // Outside previous texture: newly exposed area -> seed at -baseSentinel.
  // We keep processing it (ROI test + refinement) so we can create anchors immediately.
  var prev = vec4<f32>(-uni.baseSentinel, 0.0, 0.0, 1.0);
  if (!(coord_in.x < 0 || coord_in.y < 0 || coord_in.x >= dims.x || coord_in.y >= dims.y)) {
    prev = textureLoad(prevRaw, coord_in, 0);
  }

  // Outside ROI: keep reprojected previous as-is.
  let xy_neutral = vec2<f32>(uv.x * 2.0 - 1.0, (uv.y * 2.0 - 1.0));
  if (!is_inside_rotated_screen(xy_neutral)) {
    return prev;
  }

  // Inside ROI: if it's a sentinel, refine it and schedule new anchors.
  if (prev.x < 0.0) {
    let refined = refine_sentinel(prev.x, coord_out);
    return vec4<f32>(refined, prev.y, prev.z, prev.w);
  }

  // Already computed.
  return prev;
}
