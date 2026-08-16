// AA present pass: resolve the linear-space accumulation texture to the swapchain.
//
// The accumulation texture stores, per pixel, the linear-RGB sum of all accepted
// AA samples in .rgb and the number of accepted samples in .a (additive blend).
// Dividing rgb by alpha yields the per-pixel mean — correct for both uniform and
// adaptive sample counts — then we convert back to sRGB. (Gamma-correct linear
// averaging KEPT by field decision 2026-07-07: it reads brighter than a
// browser-style sRGB downscale on dark/bright edges, but that is the correct
// light integral; the perceived roughness came from the jitter sequence.)

// Supersampling reduction factor. 1 = present the accumulation texture 1:1
// (real time, byte-identical to the pre-override behaviour). N > 1 = average an
// N×N block per output pixel, used by video export to resolve a supersampled
// render down to the output resolution.
//
// A pipeline-overridable constant rather than a second shader: duplicating
// linear_to_sRGB into a capture shader would let the exported film and the
// screen drift apart the day one of the two transfer functions is touched.
override DOWNSCALE: i32 = 1;

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

// Interleaved-gradient-noise dither: ±0.5 LSB at 8 bits, applied after the
// linear→sRGB conversion (the last step before swapchain quantization) to
// break banding on slow gradients.
fn dither_8bit(pixelCoord: vec2<f32>) -> f32 {
  let n = fract(52.9829189 * fract(dot(pixelCoord, vec2<f32>(0.06711056, 0.00583715))));
  return (n - 0.5) / 255.0;
}

@fragment
fn fs_main(@builtin(position) fragPos: vec4<f32>) -> @location(0) vec4<f32> {
  let base = vec2<i32>(i32(fragPos.x), i32(fragPos.y)) * DOWNSCALE;

  // Each source texel is divided by ITS OWN accepted-sample count before being
  // averaged. Summing rgb and alpha across the block and dividing once would
  // weight texels by how many AA samples they happened to accept, which under
  // adaptive AA is not the box filter we want.
  //
  // The whole reduction happens here, in linear light, BEFORE linear_to_sRGB.
  // Averaging after the sRGB encode is the classic gamma mistake: it darkens
  // edges and dirties gradients, on every frame, in a way that is easy to
  // mistake for a rendering artefact.
  var sum = vec3<f32>(0.0);
  for (var dy = 0; dy < DOWNSCALE; dy = dy + 1) {
    for (var dx = 0; dx < DOWNSCALE; dx = dx + 1) {
      let acc = textureLoad(accumTex, base + vec2<i32>(dx, dy), 0);
      sum = sum + acc.rgb / max(acc.a, 1.0);
    }
  }
  let lin = sum / f32(DOWNSCALE * DOWNSCALE);

  // Dither at OUTPUT resolution, after the encode — it exists to break banding
  // in the 8-bit quantization that follows, so it must be the last step.
  return vec4<f32>(linear_to_sRGB(lin) + vec3<f32>(dither_8bit(fragPos.xy)), 1.0);
}
