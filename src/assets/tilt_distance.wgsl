// Jump flooding over the relief height raster (h / T, -1e4 where there is no
// surface: interior and uncomputed pixels). Every pixel ends up with the
// coordinates of its nearest surface pixel, so the tilted 3D view can turn
// the interior into a basin whose depth grows with the distance to the rim,
// instead of a vertical cliff (tilt_view.wgsl, interior_z).
//
// fs_seed writes each surface pixel's own centre and (-1, -1) elsewhere;
// fs_jump then propagates the nearest seed with a halving step, passed as the
// draw's first instance (one draw per step, no per-pass uniform).

@group(0) @binding(0) var sourceTex: texture_2d<f32>; // seed pass: height; jump pass: previous seeds

const NO_SURFACE: f32 = -1e4;

struct VertexOut {
  @builtin(position) position: vec4<f32>,
  @location(0) @interpolate(flat) step: u32,
};

@vertex
fn vs_main(@builtin(vertex_index) i: u32, @builtin(instance_index) step: u32) -> VertexOut {
  let p = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));
  var out: VertexOut;
  out.position = vec4<f32>(p[i], 0.0, 1.0);
  out.step = step;
  return out;
}

@fragment
fn fs_seed(in: VertexOut) -> @location(0) vec4<f32> {
  let h = textureLoad(sourceTex, vec2<i32>(in.position.xy), 0).r;
  return select(vec4<f32>(-1.0, -1.0, 0.0, 0.0), vec4<f32>(in.position.xy, 0.0, 0.0), h > NO_SURFACE * 0.5);
}

@fragment
fn fs_jump(in: VertexOut) -> @location(0) vec4<f32> {
  let dims = vec2<i32>(textureDimensions(sourceTex));
  let p = vec2<i32>(in.position.xy);
  let step = i32(in.step);
  var best = vec2<f32>(-1.0);
  var bestDistance = 3.4e38;
  for (var y = -1; y <= 1; y = y + 1) {
    for (var x = -1; x <= 1; x = x + 1) {
      let q = p + vec2<i32>(x, y) * step;
      if (any(q < vec2<i32>(0)) || any(q >= dims)) { continue; }
      let seed = textureLoad(sourceTex, q, 0).xy;
      if (seed.x < 0.0) { continue; }
      let d = dot(seed - in.position.xy, seed - in.position.xy);
      if (d < bestDistance) { bestDistance = d; best = seed; }
    }
  }
  return vec4<f32>(best, 0.0, 0.0);
}
