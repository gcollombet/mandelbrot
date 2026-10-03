// Morphological closing of the relief height raster (h / T in .r, packed
// albedo in .g, color.wgsl fs_cast_height) by a parabolic structuring
// function b(d) = -c·d²: max(h(x+d) - c·d²) then min(h(x+d) + c·d²). The
// quadratic splits exactly into x then y (d² = dx² + dy²), so the closing is
// isotropic yet separable, and its bridges are smooth bowls rather than the
// flat blocks of a square element. It fills the dips narrower than about the
// radius between crests (the dendrites of the boundary, a comb of walls in the
// 3D view and in the cast shadows) and keeps every larger shape and slope.
// Holes (interior, no data) take no part in either filter and are restored
// as they were, so the set keeps its outline.

struct ClosingParams {
  support: i32,    // half width of the tap window, raster pixels
  axis: i32,       // 0 = x, 1 = y
  curvature: f32,  // c, in h units per squared raster pixel
  _pad: f32,
};

@group(0) @binding(0) var sourceTex: texture_2d<f32>;
@group(0) @binding(1) var<uniform> params: ClosingParams;
@group(0) @binding(2) var rawTex: texture_2d<f32>; // fs_erode_final only: the raster before closing

const NO_SURFACE: f32 = -1e4;

@vertex
fn vs_main(@builtin(vertex_index) i: u32) -> @builtin(position) vec4<f32> {
  let p = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));
  return vec4<f32>(p[i], 0.0, 1.0);
}

fn axis_step() -> vec2<i32> {
  return select(vec2<i32>(0, 1), vec2<i32>(1, 0), params.axis == 0);
}

// Holes never win a maximum: NO_SURFACE is below every height.
fn dilate(p: vec2<i32>) -> f32 {
  let dims = vec2<i32>(textureDimensions(sourceTex));
  let stepDir = axis_step();
  var m = NO_SURFACE;
  for (var k = -params.support; k <= params.support; k = k + 1) {
    let q = p + stepDir * k;
    if (any(q < vec2<i32>(0)) || any(q >= dims)) { continue; }
    let v = textureLoad(sourceTex, q, 0).r;
    if (v > NO_SURFACE * 0.5) { m = max(m, v - params.curvature * f32(k * k)); }
  }
  return m;
}

// Holes are skipped by the minimum, else the interior would eat the rim.
fn erode(p: vec2<i32>) -> f32 {
  let dims = vec2<i32>(textureDimensions(sourceTex));
  let stepDir = axis_step();
  var m = 3.4e38;
  var found = false;
  for (var k = -params.support; k <= params.support; k = k + 1) {
    let q = p + stepDir * k;
    if (any(q < vec2<i32>(0)) || any(q >= dims)) { continue; }
    let v = textureLoad(sourceTex, q, 0).r;
    if (v > NO_SURFACE * 0.5) {
      m = min(m, v + params.curvature * f32(k * k));
      found = true;
    }
  }
  return select(NO_SURFACE, m, found);
}

@fragment
fn fs_dilate(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  return vec4<f32>(dilate(vec2<i32>(pos.xy)), 0.0, 0.0, 1.0);
}

@fragment
fn fs_erode(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  return vec4<f32>(erode(vec2<i32>(pos.xy)), 0.0, 0.0, 1.0);
}

// Last minimum, back into the raster format: holes and albedo from the raw
// raster, and never below the raw height (a closing only fills).
@fragment
fn fs_erode_final(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  let p = vec2<i32>(pos.xy);
  let raw = textureLoad(rawTex, p, 0);
  if (raw.r <= NO_SURFACE * 0.5) { return raw; }
  return vec4<f32>(max(erode(p), raw.r), raw.g, 0.0, 1.0);
}
