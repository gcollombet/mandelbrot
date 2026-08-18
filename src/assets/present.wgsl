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
// (real time, byte-identical to the pre-override behaviour). N > 1 = resample
// an N×N-per-output-pixel render down to the output resolution, used by video
// export.
//
// A pipeline-overridable constant rather than a second shader: duplicating
// linear_to_sRGB into a capture shader would let the exported film and the
// screen drift apart the day one of the two transfer functions is touched.
override DOWNSCALE: i32 = 1;

// Reconstruction filter for the DOWNSCALE > 1 reduction. 0 = box (plain block
// average), 1 = Mitchell–Netravali B=C=1/3. Ignored at DOWNSCALE == 1, where
// there is no resampling at all and the pass stays a 1:1 passthrough.
//
// The block average is the sharpest reduction available and the worst: its
// transform rolls off as 1/f, so a large share of the post-filter energy sits
// above the output Nyquist and folds back as aliasing. Measured on this
// kernel pair (1D, signal spectrum f^-1, energy above Nyquist relative to box):
//
//   box          alias 100    response 0.900 @0.25 cyc/px   0.757 @0.40
//   mitchell     alias  13    response 0.845 @0.25 cyc/px   0.587 @0.40
//
// Roughly 7× less fold-back for ~6% of contrast in the mid band. On a fractal,
// whose spectrum carries energy at every scale, that fold-back is exactly what
// makes boundary detail crawl from frame to frame in an exported film.
//
// Switchable because this is a field call, not a theorem: Mitchell's mild
// negative lobes (4.1% of the peak) ring on hard edges, and box stays reachable
// for an A/B without rebuilding the shader.
override REDUCE_MITCHELL: i32 = 1;

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

// Mitchell–Netravali cubic at B = C = 1/3, in OUTPUT-pixel units. Support is
// |x| < 2. The family is a partition of unity only for taps spaced ONE output
// pixel apart; here they are spaced one SOURCE texel apart, so the weights sum
// to DOWNSCALE per axis and the caller must normalise.
fn mitchell(x: f32) -> f32 {
  let a = abs(x);
  if (a < 1.0) {
    return ((7.0 * a - 12.0) * a * a + 16.0 / 3.0) / 6.0;
  }
  if (a < 2.0) {
    return (((-7.0 / 3.0 * a + 12.0) * a - 20.0) * a + 32.0 / 3.0) / 6.0;
  }
  return 0.0;
}

// One source texel, already normalised by ITS OWN accepted-sample count.
//
// Dividing per texel rather than summing rgb and alpha across the footprint and
// dividing once is what keeps the filter honest: a single division would weight
// each texel by how many AA samples it happened to accept, which under adaptive
// AA is neither box nor Mitchell but an arbitrary data-dependent kernel.
//
// Coordinates are clamped to the texture, so taps that overhang a border extend
// the edge instead of reading the zero that textureLoad returns out of range —
// which would darken every border pixel by the weight of the overhang.
fn tap(coord: vec2<i32>, dims: vec2<i32>) -> vec3<f32> {
  let c = clamp(coord, vec2<i32>(0), dims - vec2<i32>(1));
  let acc = textureLoad(accumTex, c, 0);
  return acc.rgb / max(acc.a, 1.0);
}

@fragment
fn fs_main(@builtin(position) fragPos: vec4<f32>) -> @location(0) vec4<f32> {
  let outCoord = vec2<i32>(i32(fragPos.x), i32(fragPos.y));
  let base = outCoord * DOWNSCALE;

  // The whole reduction happens here, in linear light, BEFORE linear_to_sRGB.
  // Averaging after the sRGB encode is the classic gamma mistake: it darkens
  // edges and dirties gradients, on every frame, in a way that is easy to
  // mistake for a rendering artefact.
  //
  // Both overrides are pipeline-creation constants, so these branches are
  // folded away before the shader ever runs.
  //
  // textureDimensions is queried inside the reducing branches rather than
  // hoisted here on purpose. Hoisting it puts the query in the DOWNSCALE == 1
  // pipelines too — the on-screen present and the export mirror — which have no
  // use for it, and doing so made export captures intermittently come back as a
  // flat frame in testing. Keep the query where its result is consumed.
  var lin: vec3<f32>;

  if (DOWNSCALE == 1) {
    // No resampling to do. Mitchell is NOT the identity at unit scale — its
    // integer taps are (1, 16, 1)/18 — so applying it here would put a blur on
    // the real-time path that has no business being there.
    let acc = textureLoad(accumTex, outCoord, 0);
    lin = acc.rgb / max(acc.a, 1.0);
  } else if (REDUCE_MITCHELL == 0) {
    let dims = vec2<i32>(textureDimensions(accumTex, 0));
    var sum = vec3<f32>(0.0);
    for (var dy = 0; dy < DOWNSCALE; dy = dy + 1) {
      for (var dx = 0; dx < DOWNSCALE; dx = dx + 1) {
        sum = sum + tap(base + vec2<i32>(dx, dy), dims);
      }
    }
    lin = sum / f32(DOWNSCALE * DOWNSCALE);
  } else {
    let dims = vec2<i32>(textureDimensions(accumTex, 0));
    // Source texel s spans [s, s+1), so its centre is s + 0.5; the output pixel
    // covers [base, base + DOWNSCALE) and is centred on base + DOWNSCALE/2.
    // Dividing their difference by DOWNSCALE puts the tap offset in the
    // output-pixel units mitchell() expects.
    let centre = vec2<f32>(base) + vec2<f32>(0.5 * f32(DOWNSCALE));
    let invD = 1.0 / f32(DOWNSCALE);

    // Support 2 output pixels each side = 2*DOWNSCALE source texels, so 4*DOWNSCALE
    // taps carry the kernel. The window starts one texel early and runs two long
    // so that odd DOWNSCALE cannot round a live tap off the end; the surplus taps
    // fall outside the support and mitchell() returns exactly 0 for them.
    let first = base - vec2<i32>((3 * DOWNSCALE) / 2 + 1);
    let taps = 4 * DOWNSCALE + 2;

    var sum = vec3<f32>(0.0);
    var wsum = 0.0;
    for (var j = 0; j < taps; j = j + 1) {
      let sy = first.y + j;
      let wy = mitchell((f32(sy) + 0.5 - centre.y) * invD);
      if (wy == 0.0) { continue; }
      for (var i = 0; i < taps; i = i + 1) {
        let sx = first.x + i;
        let wx = mitchell((f32(sx) + 0.5 - centre.x) * invD);
        if (wx == 0.0) { continue; }
        let w = wx * wy;
        sum = sum + w * tap(vec2<i32>(sx, sy), dims);
        wsum = wsum + w;
      }
    }
    // Required, not cosmetic: taps sit one source texel apart rather than one
    // output pixel apart, so wsum is DOWNSCALE per axis — DOWNSCALE² here.
    // It is that value at every phase and at the borders too, since clamping
    // moves which texel a tap reads without touching its weight.
    lin = sum / wsum;
  }

  // Dither at OUTPUT resolution, after the encode — it exists to break banding
  // in the 8-bit quantization that follows, so it must be the last step.
  return vec4<f32>(linear_to_sRGB(lin) + vec3<f32>(dither_8bit(fragPos.xy)), 1.0);
}
