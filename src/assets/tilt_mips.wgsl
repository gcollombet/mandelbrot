// Inputs of the tilted 3D view (tilt_view.wgsl), rebuilt from the colour
// pass raster:
//  - fs_march_height: the surface depth z the rays march on, one filterable
//    half-float per pixel: clamp(relief · h / T, -1, 0) on the surface, and
//    the interior basin -D·(1 - exp(-d/R)) from the nearest-rim seeds.
//  - fs_max_down: its maximum pyramid (each texel = max of 2x2 below), which
//    lets a ray skip whole cells it passes above.
//  - fs_color_base / fs_color_down: the linear colour (sample count divided
//    out) and its box mip chain, for distant surfaces and wall tints.

struct TiltParams {
  raster: vec2<f32>,
  aspect: f32,
  tilt: f32,
  heading: vec2<f32>,
  relief: f32,
  fit: f32,
  interiorDepth: f32,
  basinRadius: f32,
  _pad: vec2<f32>,
};

@group(0) @binding(0) var sourceTex: texture_2d<f32>;
@group(0) @binding(1) var seedTex: texture_2d<f32>;
@group(0) @binding(2) var<uniform> params: TiltParams;
@group(0) @binding(3) var linearSampler: sampler;

const NO_SURFACE: f32 = -1e4;

@vertex
fn vs_main(@builtin(vertex_index) i: u32) -> @builtin(position) vec4<f32> {
  let p = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));
  return vec4<f32>(p[i], 0.0, 1.0);
}

// sourceTex = height raster (h / T), seedTex = nearest surface pixel.
@fragment
fn fs_march_height(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  let p = vec2<i32>(pos.xy);
  let h = textureLoad(sourceTex, p, 0).r;
  if (h > NO_SURFACE * 0.5) {
    return vec4<f32>(clamp(params.relief * h, -1.0, 0.0), 0.0, 0.0, 0.0);
  }
  // Interior: a basin that starts level with the rim and sinks smoothly.
  let depth = params.interiorDepth;
  if (depth <= 0.0) { return vec4<f32>(0.0); }
  let seed = textureLoad(seedTex, p, 0).xy;
  if (seed.x < 0.0) { return vec4<f32>(-depth, 0.0, 0.0, 0.0); }
  let d = length(seed - pos.xy) * 2.0 / params.raster.y;
  return vec4<f32>(-depth * (1.0 - exp(-d / max(params.basinRadius, 1e-4))), 0.0, 0.0, 0.0);
}

// sourceTex = the level below (one mip): max of its 2x2 block, edges clamped.
@fragment
fn fs_max_down(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  let dims = vec2<i32>(textureDimensions(sourceTex));
  let base = vec2<i32>(pos.xy) * 2;
  var m = -1.0;
  for (var k = 0; k < 4; k = k + 1) {
    let q = min(base + vec2<i32>(k & 1, k >> 1), dims - vec2<i32>(1));
    m = max(m, textureLoad(sourceTex, q, 0).r);
  }
  return vec4<f32>(m, 0.0, 0.0, 0.0);
}

// sourceTex = linear colour, sample count in alpha (AA accumulator or a
// single-sample render).
@fragment
fn fs_color_base(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  let c = textureLoad(sourceTex, vec2<i32>(pos.xy), 0);
  return vec4<f32>(c.rgb / max(c.a, 1e-6), 1.0);
}

// sourceTex = the level below: the bilinear tap at the 2x2 block centre is
// its box average.
@fragment
fn fs_color_down(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  let dims = vec2<f32>(textureDimensions(sourceTex));
  return textureSampleLevel(sourceTex, linearSampler, (pos.xy * 2.0) / dims, 0.0);
}
