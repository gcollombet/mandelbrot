// AA present pass: resolve the linear-space accumulation texture to the swapchain.
//
// The accumulation texture stores, per pixel, the linear-RGB sum of all accepted
// AA samples in .rgb and the number of accepted samples in .a (additive blend).
// Dividing rgb by alpha yields the per-pixel mean — correct for both uniform and
// adaptive sample counts — then we convert back to sRGB. (Gamma-correct linear
// averaging KEPT by field decision 2026-07-07: it reads brighter than a
// browser-style sRGB downscale on dark/bright edges, but that is the correct
// light integral; the perceived roughness came from the jitter sequence.)

@group(0) @binding(0) var accumTex: texture_2d<f32>;

struct VSOut {
  @builtin(position) pos: vec4<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VSOut {
  var p = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( 1.0,  1.0)
  );
  var o: VSOut;
  o.pos = vec4<f32>(p[vi], 0.0, 1.0);
  return o;
}

fn linear_to_sRGB(c: vec3<f32>) -> vec3<f32> {
  let cl = max(c, vec3<f32>(0.0));
  let cutoff = cl <= vec3<f32>(0.0031308);
  let low = cl * 12.92;
  let high = 1.055 * pow(cl, vec3<f32>(1.0 / 2.4)) - 0.055;
  return select(high, low, cutoff);
}

@fragment
fn fs_main(@builtin(position) fragPos: vec4<f32>) -> @location(0) vec4<f32> {
  let coord = vec2<i32>(i32(fragPos.x), i32(fragPos.y));
  let acc = textureLoad(accumTex, coord, 0);
  let n = max(acc.a, 1.0);
  let lin = acc.rgb / n;
  return vec4<f32>(linear_to_sRGB(lin), 1.0);
}
