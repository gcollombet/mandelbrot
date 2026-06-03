import{_ as fn,f as dn,a3 as hn,s as dt,ad as Z,ao as Ee,M as Ut,N as Nt,P as Ve,l as He,B as Me,W as ht,G as pn,a6 as gn,i as A,H as re,q as it,b as vn,as as mn,p as _n,av as bn,k as xn,c as Vt}from"./framework.Co0z0_7L.js";let ia,$i;let __tla=(async()=>{const yn=`// Mandelbrot progressive-iteration shader.
//
// Layer layout (r32float texture_2d_array, 8 layers):
//   0 : sentinel / iteration count (integer part).
//       Negative  => sentinel (brush/resolve system).  -1 = compute request.
//       0         => inside the set (confirmed), or budget fully exhausted at globalMaxIter.
//       > 0       => escaped (|z|\xb2 >= 4) or budget-exhausted mid-progress (|z|\xb2 < 4).
//   1 : resolution step (1.0 = genuine pixel, >= 2 = resolve-copied from grid step)
//   2 : z.x   (real part of current z, for resuming / coloring)
//   3 : z.y   (imag part of current z, for resuming / coloring)
//   4 : escaped pixels: distance height, in-progress pixels: derivative.x
//   5 : escaped pixels: visual derivative angle, in-progress pixels: derivative.y
//   6 : ref_i + fractional stripe phase (reference orbit index for resuming perturbation)
//   7 : packed average orbit direction, 12 bits per component
//
// mu (smooth fractional part) is recalculated in the color shader from z.
// Escaped pixels store distance height/angle in layers 4/5 so relief/reflection
// shading does not have to reconstruct tiny DE vectors from a derivative convention.
//
// Pixel state convention (iter-only):
//   iter == -1                     : sentinel, needs computation
//   iter == 0                      : confirmed inside the set (or exhausted at globalMaxIter)
//   iter > 0  AND  |z|\xb2 >= 4      : escaped → color with iter + mu (mu recomputed)
//   iter > 0  AND  |z|\xb2 < 4       : budget exhausted mid-progress → needs continuation

struct MandelbrotStep {
  zx: f32,
  zy: f32,
  dx: f32,
  dy: f32,
};

struct Mandelbrot {
  cx: f32,
  cy: f32,
  mu: f32,
  scale: f32,
  aspect: f32,
  angle: f32,           // currently unused here; rotation is handled by brush/color reprojection
  maxIteration: f32,    // iterations to compute THIS pass
  epsilon: f32,
  antialiasLevel: f32,  // currently unused in this pass
  iterationOffset: f32, // currently unused; prev_iter carries continuation state
  globalMaxIter: f32,   // total iteration target for the current view
  orbitComplete: f32,   // 1.0 = orbit fully built, 0.0 = still building
  approximationMode: f32,
  blaLevelCount: f32,
  blaEpsilon: f32,
  stripeFrequency: f32,
  trackOrbitMetrics: f32,
  _padding1: f32,
  _padding2: f32,
  _padding3: f32,
};

struct BlaStep {
  ax: f32,
  ay: f32,
  bx: f32,
  by: f32,
  radius_alpha: f32,
  radius_beta: f32,
};

struct BlaLevel {
  offset: u32,
  count: u32,
  skip: u32,
  _padding: u32,
};

@group(0) @binding(0) var<uniform> mandelbrot: Mandelbrot;
@group(0) @binding(1) var<storage, read> mandelbrotOrbitPointSuite: array<MandelbrotStep>;
@group(0) @binding(2) var<storage, read> mandelbrotBlaSuite: array<BlaStep>;
@group(0) @binding(3) var<storage, read> mandelbrotBlaLevels: array<BlaLevel>;
@group(0) @binding(4) var rawIn: texture_2d_array<f32>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) VertexIndex: u32) -> VertexOutput {
  var pos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( 1.0,  1.0)
  );
  var out: VertexOutput;
  out.position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
  out.uv = (pos[VertexIndex] + vec2<f32>(1.0, 1.0)) * 0.5;
  return out;
}

// ── complex helpers ────────────────────────────────────────────────
fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

fn cdiv(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  let denom = max(dot(b, b), 1e-30);
  return vec2<f32>(
    (a.x * b.x + a.y * b.y) / denom,
    (a.y * b.x - a.x * b.y) / denom,
  );
}

fn distance_estimate(z: vec2<f32>, der: vec2<f32>) -> f32 {
  let zLen = max(length(z), 1.000001);
  let dC = cmul(z, der);
  let numerator = 0.5 * dot(z, z) * log(zLen);
  let de = cdiv(vec2<f32>(numerator, 0.0), dC);
  return clamp(length(de), 1e-30, 1e30);
}

fn distance_height(z: vec2<f32>, der: vec2<f32>) -> f32 {
  return clamp(-log(distance_estimate(z, der)), -8.0, 64.0);
}

fn visual_derivative_angle(z: vec2<f32>, der: vec2<f32>) -> f32 {
  let dd = cdiv(der, z);
  return atan2(dd.y, dd.x);
}

fn getOrbit(index: i32) -> vec2<f32> {
  return vec2<f32>(
    mandelbrotOrbitPointSuite[index].zx,
    mandelbrotOrbitPointSuite[index].zy,
  );
}

fn try_apply_bla(ref_i: ptr<function, i32>, dz: ptr<function, vec2<f32>>, der: ptr<function, vec2<f32>>, dc: vec2<f32>, dcMag: f32, bailout: f32) -> i32 {
  var level = i32(mandelbrot.blaLevelCount) - 1;
  let max_iter = i32(mandelbrot.globalMaxIter);
  if (*ref_i <= 0) {
    return 0;
  }
  while (level >= 0) {
    let levelInfo = mandelbrotBlaLevels[level];
    let skip = i32(levelInfo.skip);
    let shiftedRef = *ref_i - 1;
    if ((shiftedRef % skip) == 0 && *ref_i + skip <= max_iter) {
      let slot = shiftedRef / skip;
      if (u32(slot) < levelInfo.count) {
        let entryIndex = i32(levelInfo.offset) + slot;
        let bla = mandelbrotBlaSuite[entryIndex];
        let a = vec2<f32>(bla.ax, bla.ay);
        let b = vec2<f32>(bla.bx, bla.by);
        let radius = max(0.0, bla.radius_alpha - bla.radius_beta * dcMag);
        // BLA radii are input-domain bounds: they describe when the block's
        // linearized map is valid for the current perturbation before the skip.
        if (dot(*dz, *dz) <= radius * radius) {
          let candidate = cmul(a, *dz) + cmul(b, dc);
          // Do not let a multi-iteration BLA block jump over the first escape.
          // The color pass needs z/DE at the escape iteration, not after a block.
          let candidateZ = getOrbit(*ref_i + skip) + candidate;
          if (skip > 1 && dot(candidateZ, candidateZ) > bailout) {
            level -= 1;
            continue;
          }
          *dz = candidate;
          *der = cmul(a, *der) + b;
          *ref_i += skip;
          return skip;
        }
      }
    }
    level -= 1;
  }

  return 0;
}

// Set to true to disable epsilon-based interior detection (for debugging).
const IGNORE_EPSILON: bool = false;

// ── output struct (8 render targets) ──────────────────────────────
struct FragOut {
  @location(0) iter:      vec4<f32>,  // .r = integer iteration count (or sentinel)
  @location(1) genuine:   vec4<f32>,  // .r = resolution step (1 = genuine, >= 2 = copied)
  @location(2) zx:        vec4<f32>,  // .r = z.x
  @location(3) zy:        vec4<f32>,  // .r = z.y
  @location(4) dzx:       vec4<f32>,  // .r = escaped distance height, or in-progress derivative x
  @location(5) dzy:       vec4<f32>,  // .r = escaped angle_der, or in-progress derivative y
  @location(6) ref_i:     vec4<f32>,  // .r = integer ref_i + fractional stripe phase
  @location(7) avgDirection: vec4<f32>,  // .r = packed average orbit direction
};

fn pack(v: f32) -> vec4<f32> { return vec4<f32>(v, 0.0, 0.0, 0.0); }

fn loadLayer(coord: vec2<i32>, layer: i32) -> f32 {
  return textureLoad(rawIn, coord, layer, 0).r;
}

fn empty_out() -> FragOut {
  var out: FragOut;
  out.iter      = pack(0.0);
  out.genuine   = pack(0.0);
  out.zx        = pack(0.0);
  out.zy        = pack(0.0);
  out.dzx       = pack(0.0);
  out.dzy       = pack(0.0);
  out.ref_i     = pack(0.0);
  out.avgDirection = pack(0.0);
  return out;
}

const ORBIT_METRIC_EMA_ALPHA: f32 = 0.18;
const ORBIT_DIRECTION_SCALE: f32 = 4095.0;
const ORBIT_DIRECTION_BASE: f32 = 4096.0;

fn stripe_phase_from_ema(stripeEma: f32) -> f32 {
  return clamp(0.5 + 0.5 * stripeEma, 0.0, 0.999999);
}

fn ref_i_with_stripe(refValue: f32, stripeEma: f32) -> f32 {
  return floor(max(refValue, 0.0)) + stripe_phase_from_ema(stripeEma);
}

fn decode_ref_i(refWithStripe: f32) -> i32 {
  return i32(floor(max(refWithStripe, 0.0)));
}

fn decode_stripe_ema(refWithStripe: f32, totalIter: f32) -> f32 {
  if (totalIter <= 0.0) {
    return 0.0;
  }
  return fract(refWithStripe) * 2.0 - 1.0;
}

fn orbit_direction_sample(z: vec2<f32>) -> vec2<f32> {
  let zLen = length(z);
  return select(vec2<f32>(0.0), z / zLen, zLen > 1e-8);
}

fn encode_avg_dir(avgDir: vec2<f32>) -> f32 {
  let phase = clamp(avgDir * 0.5 + vec2<f32>(0.5), vec2<f32>(0.0), vec2<f32>(1.0));
  let xq = floor(phase.x * ORBIT_DIRECTION_SCALE + 0.5);
  let yq = floor(phase.y * ORBIT_DIRECTION_SCALE + 0.5);
  return xq * ORBIT_DIRECTION_BASE + yq;
}

fn decode_avg_dir(encoded: f32, totalIter: f32) -> vec2<f32> {
  if (totalIter <= 0.0) {
    return vec2<f32>(0.0);
  }
  let xq = floor(encoded / ORBIT_DIRECTION_BASE);
  let yq = encoded - xq * ORBIT_DIRECTION_BASE;
  return vec2<f32>(
    (xq / ORBIT_DIRECTION_SCALE - 0.5) * 2.0,
    (yq / ORBIT_DIRECTION_SCALE - 0.5) * 2.0,
  );
}

fn update_orbit_ema(previous: f32, sample: f32, count: f32) -> f32 {
  let decay = pow(1.0 - ORBIT_METRIC_EMA_ALPHA, max(count, 1.0));
  return sample + (previous - sample) * decay;
}

fn update_orbit_ema_unit(previous: f32, sample: f32) -> f32 {
  return sample + (previous - sample) * (1.0 - ORBIT_METRIC_EMA_ALPHA);
}

fn update_orbit_mean_vec2(previous: vec2<f32>, sample: vec2<f32>, previousCount: f32, sampleCount: f32) -> vec2<f32> {
  let safePreviousCount = max(previousCount, 0.0);
  let safeSampleCount = max(sampleCount, 1.0);
  let totalCount = safePreviousCount + safeSampleCount;
  return (previous * safePreviousCount + sample * safeSampleCount) / max(totalCount, 1.0);
}

fn stripe_metric_sample(z: vec2<f32>) -> f32 {
  return sin(max(mandelbrot.stripeFrequency, 0.0) * atan2(z.y, z.x));
}

fn escape_fraction(z: vec2<f32>, muLimit: f32) -> f32 {
  let zSq = max(dot(z, z), 1e-12);
  return clamp(1.0 - log(log(zSq) / log(muLimit)) / log(2.0), 0.0, 1.0);
}

fn mix_angle(a: f32, b: f32, t: f32) -> f32 {
  let delta = atan2(sin(b - a), cos(b - a));
  return a + delta * t;
}

// ── core computation ──────────────────────────────────────────────
fn mandelbrot_compute(x0: f32, y0: f32, prev_iter: f32, prev_zx: f32, prev_zy: f32, prev_dzx: f32, prev_dzy: f32, prev_ref_i: f32, prev_avg_direction: f32) -> FragOut {
  let dc = vec2<f32>(x0, y0);
  let max_iteration = mandelbrot.maxIteration;
  let muLimit = mandelbrot.mu;
  let epsilon = mandelbrot.epsilon;

  // Resume state: if prev_iter > 0 we are continuing a previous pass.

  var i: f32 = 0.0;
  var dz = vec2<f32>(prev_zx, prev_zy);
  var der = vec2<f32>(prev_dzx, prev_dzy);
  var ref_i = decode_ref_i(prev_ref_i);
  var z = getOrbit(ref_i) + dz;
  let trackOrbitMetrics = mandelbrot.trackOrbitMetrics >= 0.5;
  var stripeEma = 0.0;
  var avgDir = vec2<f32>(0.0);
  if (trackOrbitMetrics) {
    stripeEma = decode_stripe_ema(prev_ref_i, prev_iter);
    avgDir = decode_avg_dir(prev_avg_direction, prev_iter);
  }
  var previousStripeEma = stripeEma;
  var previousAvgDir = avgDir;

  var escaped = false;
  var inside = false;
  var shadingHeight = 0.0;
  var shadingAngle = 0.0;

  let useBla = mandelbrot.approximationMode >= 0.5
            && mandelbrot.orbitComplete >= 0.5
            && mandelbrot.blaLevelCount >= 1.0;

  if (useBla) {
    let dcMag = sqrt(max(0.0, dot(dc, dc)));
    var usedBla = false;
    while (i < max_iteration && f32(ref_i) < mandelbrot.globalMaxIter) {
      let previousZ = z;
      let previousDer = der;
      var next_der = der;
      let skipped = try_apply_bla(&ref_i, &dz, &der, dc, dcMag, muLimit);
      if (skipped > 0) {
        usedBla = true;
        z = getOrbit(ref_i) + dz;
        next_der = der;
        i += f32(skipped);
        if (trackOrbitMetrics) {
          let previousMetricCount = prev_iter + i - f32(skipped);
          previousStripeEma = stripeEma;
          previousAvgDir = avgDir;
          stripeEma = update_orbit_ema(stripeEma, stripe_metric_sample(z), f32(skipped));
          avgDir = update_orbit_mean_vec2(avgDir, orbit_direction_sample(z), previousMetricCount, f32(skipped));
        }
      } else {
        let zPrev = getOrbit(ref_i) + dz;
        let refZ = getOrbit(ref_i);
        dz = 2.0 * cmul(dz, refZ) + cmul(dz, dz) + dc;
        ref_i += 1;
        z = getOrbit(ref_i) + dz;
        next_der = 2.0 * cmul(zPrev, der) + vec2<f32>(1.0, 0.0);
        i += 1.0;
        if (trackOrbitMetrics) {
          let previousMetricCount = prev_iter + i - 1.0;
          previousStripeEma = stripeEma;
          previousAvgDir = avgDir;
          stripeEma = update_orbit_ema_unit(stripeEma, stripe_metric_sample(z));
          avgDir = update_orbit_mean_vec2(avgDir, orbit_direction_sample(z), previousMetricCount, 1.0);
        }
      }

      der = next_der;
      let dot_z = dot(z, z);
      if (dot_z > muLimit) {
        let shadingBlend = escape_fraction(z, muLimit);
        let previousHeight = distance_height(previousZ, previousDer);
        let currentHeight = distance_height(z, der);
        let previousAngle = visual_derivative_angle(previousZ, previousDer);
        let currentAngle = visual_derivative_angle(z, der);
        shadingHeight = mix(previousHeight, currentHeight, shadingBlend);
        shadingAngle = mix_angle(previousAngle, currentAngle, shadingBlend);
        escaped = true;
        break;
      }
      if (!usedBla && !IGNORE_EPSILON && dot(der, der) < epsilon) {
        inside = true;
        break;
      }

      let dot_dz = dot(dz, dz);
      if (dot_z < dot_dz || f32(ref_i) == mandelbrot.globalMaxIter) {
        dz = z;
        ref_i = 0;
      }
    }
  } else {
    while (i < max_iteration && f32(ref_i) < mandelbrot.globalMaxIter) {
      let previousZ = z;
      let previousDer = der;
      let zPrev = getOrbit(ref_i) + dz;
      let refZ = getOrbit(ref_i);
      dz = 2.0 * cmul(dz, refZ) + cmul(dz, dz) + dc;
      ref_i += 1;
      z = getOrbit(ref_i) + dz;
      let next_der = 2.0 * cmul(zPrev, der) + vec2<f32>(1.0, 0.0);
      i += 1.0;
      if (trackOrbitMetrics) {
        let previousMetricCount = prev_iter + i - 1.0;
        previousStripeEma = stripeEma;
        previousAvgDir = avgDir;
        stripeEma = update_orbit_ema_unit(stripeEma, stripe_metric_sample(z));
        avgDir = update_orbit_mean_vec2(avgDir, orbit_direction_sample(z), previousMetricCount, 1.0);
      }

      der = next_der;
      let dot_z = dot(z, z);
      if (dot_z > muLimit) {
        let shadingBlend = escape_fraction(z, muLimit);
        let previousHeight = distance_height(previousZ, previousDer);
        let currentHeight = distance_height(z, der);
        let previousAngle = visual_derivative_angle(previousZ, previousDer);
        let currentAngle = visual_derivative_angle(z, der);
        shadingHeight = mix(previousHeight, currentHeight, shadingBlend);
        shadingAngle = mix_angle(previousAngle, currentAngle, shadingBlend);
        escaped = true;
        break;
      }
      if (!IGNORE_EPSILON && dot(der, der) < epsilon) {
        inside = true;
        break;
      }

      let dot_dz = dot(dz, dz);
      if (dot_z < dot_dz || f32(ref_i) == mandelbrot.globalMaxIter) {
        dz = z;
        ref_i = 0;
      }
    }
  }

  var out: FragOut;

  if (inside) {
    // Confirmed inside the set. Keep total iteration in ref_i for diagnostics/compatibility.
    out.iter      = pack(0.0);
    out.genuine   = pack(1.0);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(der.x);
    out.dzy       = pack(der.y);
    out.ref_i     = pack(ref_i_with_stripe(prev_iter + i, stripeEma));
    out.avgDirection = pack(encode_avg_dir(avgDir));
    return out;
  }

  let total_iter = prev_iter + i; // running total across all passes

  if (escaped) {
    let escapeBlend = escape_fraction(z, muLimit);
    let smoothStripeEma = mix(previousStripeEma, stripeEma, escapeBlend);
    let smoothAvgDir = mix(previousAvgDir, avgDir, escapeBlend);

    // Escaped: layers 4/5 switch from resumable derivative state to scalar
    // shading data. Storing height avoids precision loss from tiny DE vectors.
    let deHeight = shadingHeight;
    let angleDer = shadingAngle;
    out.iter      = pack(total_iter);
    out.genuine   = pack(1.0);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(deHeight);
    out.dzy       = pack(angleDer);
    out.ref_i     = pack(ref_i_with_stripe(0.0, smoothStripeEma));
    out.avgDirection = pack(encode_avg_dir(smoothAvgDir));
    return out;
  }

  // Not escaped, not inside — budget exhausted for this pass.
  let globalMax = mandelbrot.globalMaxIter;

  if (total_iter >= globalMax && mandelbrot.orbitComplete >= 0.5) {
    // Reached the global iteration target without escaping AND the orbit
    // is fully built.  Mark as "inside for now" (iter = 0).
    // Keep total iteration in ref_i for diagnostics/compatibility.
    out.iter      = pack(0.0);
    out.genuine   = pack(1.0);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(der.x);
    out.dzy       = pack(der.y);
    out.ref_i     = pack(ref_i_with_stripe(total_iter, stripeEma));
    out.avgDirection = pack(encode_avg_dir(avgDir));
    return out;
  }

  // Budget exhausted below globalMaxIter: store iter = total_iter, keep dz/der
  // for resumption.  |z|\xb2 < 4 distinguishes this from escaped pixels.
  out.iter      = pack(total_iter);
  out.genuine   = pack(1.0);
  out.zx        = pack(dz.x);
  out.zy        = pack(dz.y);
  out.dzx       = pack(der.x);
  out.dzy       = pack(der.y);
  out.ref_i     = pack(ref_i_with_stripe(f32(ref_i), stripeEma));
  out.avgDirection = pack(encode_avg_dir(avgDir));
  return out;
}

// ── fragment entry ────────────────────────────────────────────────
@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> FragOut {
  let dims = vec2<i32>(textureDimensions(rawIn));
  let coord = vec2<i32>(
    i32(clamp(uv.x * f32(dims.x), 0.0, f32(dims.x - 1))),
    i32(clamp((1.0 - uv.y) * f32(dims.y), 0.0, f32(dims.y - 1)))
  );

  let prev_iter = loadLayer(coord, 0);

  // When the reference orbit has no data yet (globalMaxIter == 0),
  // pass through all pixels unchanged — including sentinels.
  // This avoids marking uncomputed pixels as "inside the set" (iter = 0)
  // when no orbit steps are available to iterate.
  if (mandelbrot.globalMaxIter <= 0.0) {
    discard;
    return empty_out();
  }

  // Determine pixel state (iter-only convention):
  //   iter == -1                     : sentinel, needs fresh computation
  //   iter == 0                      : confirmed inside the set, pass through
  //   iter > 0  AND  |z|\xb2 >= 4      : escaped, pass through
  //   iter > 0  AND  |z|\xb2 < 4       : budget exhausted mid-progress, needs continuation
  //   iter < 0  AND  iter != -1     : resolution sentinel, pass through
  let is_compute_request = (prev_iter == -1.0);

  if (!is_compute_request && prev_iter <= 0.0) {
    discard;
    return empty_out();
  }

  var prev_zx = 0.0;
  var prev_zy = 0.0;
  var needs_continuation = false;
  if (!is_compute_request) {
    prev_zx = loadLayer(coord, 2);
    prev_zy = loadLayer(coord, 3);
    needs_continuation = (prev_zx * prev_zx + prev_zy * prev_zy) < mandelbrot.mu;
    if (!needs_continuation) {
      discard;
      return empty_out();
    }
  }

  // Neutral mapping: the neutral texture is a square that can contain the rotated screen.
  let xy_neutral = vec2<f32>(uv.x * 2.0 - 1.0, uv.y * 2.0 - 1.0);
  let neutralExtent = sqrt(mandelbrot.aspect * mandelbrot.aspect + 1.0);
  let local_rot = xy_neutral * neutralExtent;

  let x0 = local_rot.x * mandelbrot.scale + mandelbrot.cx;
  let y0 = local_rot.y * mandelbrot.scale + mandelbrot.cy;

  if (is_compute_request) {
    // Fresh computation (sentinel == -1).
    return mandelbrot_compute(x0, y0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
  }

  if (needs_continuation) {
    // Resume from stored state: iter > 0, |z|\xb2 < mu.
    let stored_dzx = loadLayer(coord, 4);
    let stored_dzy = loadLayer(coord, 5);
    let prev_ref_i = loadLayer(coord, 6);
    let prev_avg_direction = loadLayer(coord, 7);
    return mandelbrot_compute(x0, y0, prev_iter, prev_zx, prev_zy, stored_dzx, stored_dzy, prev_ref_i, prev_avg_direction);
  }

  discard;
  return empty_out();
}
`,wn=`struct Uniforms {
  palettePeriod: f32,
  paletteOffset: f32,
  bloomStrength: f32,
  time: f32,
  aspect: f32,
  angle: f32,
  animate: f32,
  mu: f32,
  zoomFactor: f32,       // frozenScale / displayScale
  frozenAligned: f32,    // 1.0 when frozen texture is aligned with live (zoom or post-zoom), 0.0 otherwise
  liveZoomFactor: f32,   // liveScale / displayScale (for UV rescaling of live texture)
  frozenShiftU: f32,     // cumulative pan shift of frozen texture (normalized UV)
  frozenShiftV: f32,
  tessellationLevel: f32, // global [0, 10]
  displacementAmount: f32, // global [0, 0.1]
  animationSpeed: f32,    // global multiplier on drift frequencies [0.1, 5.0]
  epsilon: f32,           // interior detection threshold (|der|\xb2 < epsilon)
  ambientOcclusionStrength: f32,
  microBumpStrength: f32,
  clearcoatStrength: f32,
  subsurfaceStrength: f32,
  reliefDepth: f32,
  localShadowStrength: f32,
  lightAngle: f32,
  varnishStrength: f32,
  logMu: f32,
  sceneSin: f32,
  sceneCos: f32,
  lightDirX: f32,
  lightDirY: f32,
  lightDirZ: f32,
  paletteMirror: f32,
};
@group(0) @binding(0) var<uniform> parameters: Uniforms;
@group(0) @binding(1) var tex: texture_2d_array<f32>; // resolved neutral texture (8 r32float layers)
@group(0) @binding(2) var tileTex: texture_2d<f32>;
@group(0) @binding(3) var skyboxTex: texture_2d<f32>;
@group(0) @binding(4) var webcamTex: texture_2d<f32>;
@group(0) @binding(5) var paletteTex: texture_2d<f32>;  // 4096 x 6 rgba16float
@group(0) @binding(6) var texFrozen: texture_2d_array<f32>; // frozen snapshot for zoom reprojection
@group(0) @binding(7) var paletteSampler: sampler; // bilinear sampler for palette
@group(0) @binding(8) var skyboxSampler: sampler;  // bilinear sampler for skybox

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) fragCoord: vec2<f32>,
};

// ── Per-pixel effect weights & parameters, read from palette texture ──
struct EffectParams {
  // Row 0 decoded
  paletteColor: vec3<f32>,
  wPalette: f32,
  // Row 1
  wTessellation: f32,
  wShading: f32,
  wSkybox: f32,
  // Row 2
  wWebcam: f32,
  wSmoothness: f32,
  shadingLevel: f32,    // [0, 3]
  specularPower: f32,   // [1, 64]
  // Row 3
  metallic: f32,        // [0, 1]
  roughness: f32,       // [0.02, 1]
  anisotropy: f32,      // [0, 1]
  iridescenceColor: vec3<f32>,
  wIridescence: f32,
  wStripeAverage: f32,
  wRotationMean: f32,
  wStripeRelief: f32,
  wDirectionCoherenceRelief: f32,
};

fn samplePaletteColor(palettePhase: f32) -> vec3<f32> {
  return textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, 0.083333333), 0.0).rgb;
}

fn animatedPaletteOffset() -> f32 {
  let paletteDrift = parameters.animate * parameters.time * parameters.animationSpeed * 0.025;
  return fract(parameters.paletteOffset + paletteDrift);
}

fn palettePhaseFromRaw(rawPhase: f32) -> f32 {
  let phase = fract(rawPhase);
  if (parameters.paletteMirror < 0.5) {
    return phase;
  }
  let reverse = (i32(floor(rawPhase)) % 2) != 0;
  return select(phase, min(1.0 - phase, 0.99999994), reverse);
}

fn sampleEffects(palettePhase: f32) -> EffectParams {
  var e: EffectParams;

  // Row 0: R, G, B, palette weight
  let row0 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, 0.083333333), 0.0);
  e.paletteColor = row0.rgb;
  e.wPalette = row0.a;

  // Row 1: zebra, tessellation, shading, skybox
  let row1 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, 0.25), 0.0);
  e.wTessellation = row1.g;
  e.wShading = row1.b;
  e.wSkybox = row1.a;

  // Row 2: webcam, smoothness, shadingLevel [0,3], specularPower [1,64]
  let row2 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, 0.416666667), 0.0);
  e.wWebcam = row2.r;
  e.wSmoothness = row2.g;
  e.shadingLevel = row2.b;       // direct: natural range [0, 3]
  e.specularPower = max(row2.a, 1.0); // direct: natural range [1, 64]

  // Row 3: reserved, metallic, roughness, anisotropy
  let row3 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, 0.583333333), 0.0);
  e.metallic = clamp(row3.g, 0.0, 1.0);
  e.roughness = clamp(row3.b, 0.02, 1.0);
  e.anisotropy = clamp(row3.a, 0.0, 1.0);

  // Row 4: iridescence R, G, B, strength
  let row4 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, 0.75), 0.0);
  e.iridescenceColor = row4.rgb;
  e.wIridescence = clamp(row4.a, 0.0, 1.0);

  // Row 5: stripe color blend, direction coherence color blend, stripe relief, direction coherence relief
  let row5 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, 0.916666667), 0.0);
  e.wStripeAverage = clamp(row5.r, 0.0, 1.0);
  e.wRotationMean = clamp(row5.g, 0.0, 1.0);
  e.wStripeRelief = clamp(row5.b, 0.0, 1.0);
  e.wDirectionCoherenceRelief = clamp(row5.a, 0.0, 1.0);

  return e;
}

@vertex
fn vs_main(@builtin(vertex_index) VertexIndex: u32) -> VertexOutput {
  var pos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( 1.0,  1.0)
  );
  var out: VertexOutput;
  out.position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
  out.fragCoord = (pos[VertexIndex] + vec2<f32>(1.0, 1.0)) * 0.5;
  return out;
}

fn rotate_sincos(v: vec2<f32>, s: f32, c: f32) -> vec2<f32> {
  return vec2<f32>(c * v.x - s * v.y, s * v.x + c * v.y);
}

fn rotate_inverse_sincos(v: vec2<f32>, s: f32, c: f32) -> vec2<f32> {
  return vec2<f32>(c * v.x + s * v.y, -s * v.x + c * v.y);
}

fn rotate_surface_vector_sincos(v: vec3<f32>, s: f32, c: f32) -> vec3<f32> {
  let xy = rotate_sincos(v.xy, s, c);
  return vec3<f32>(xy.x, xy.y, v.z);
}

fn isInsideScreen(uv: vec2<f32>, aspect: f32, neutralExtent: f32, sceneSin: f32, sceneCos: f32) -> bool {
  let xy_neutral = (uv - vec2<f32>(0.5, 0.5)) * 2.0;
  let local_rot  = xy_neutral * neutralExtent;
  let local      = rotate_inverse_sincos(local_rot, sceneSin, sceneCos);
  return abs(local.x) <= aspect && abs(local.y) <= 1.0;
}

fn dir_to_skybox_uv(dir: vec3<f32>, dx: f32, dy: f32) -> vec2<f32> {
  let d = normalize(dir);
  let u = abs((dx + atan2(d.z, d.x) / (2.0 * 3.14159265)) % 2.0 - 1.0) / 2.0;
  let v = abs((dy + asin(d.y) / 3.14159265) % 2.0 - 1.0) / 2.0;
  return vec2<f32>(u, v);
}

fn mandelbrot_normal_from_dir(angleDir: vec2<f32>) -> vec3<f32> {
  return normalize(vec3<f32>(angleDir.x, angleDir.y, 0.5));
}

fn fresnel_schlick(cosTheta: f32, f0: vec3<f32>) -> vec3<f32> {
  let m = clamp(1.0 - cosTheta, 0.0, 1.0);
  let m2 = m * m;
  let m5 = m2 * m2 * m;
  return f0 + (vec3<f32>(1.0) - f0) * m5;
}

fn ggx_distribution(nDotH: f32, roughness: f32) -> f32 {
  let a = roughness * roughness;
  let a2 = a * a;
  let d = nDotH * nDotH * (a2 - 1.0) + 1.0;
  return a2 / max(3.14159265 * d * d, 1e-5);
}

fn ggx_geometry_schlick(nDotV: f32, roughness: f32) -> f32 {
  let r = roughness + 1.0;
  let k = (r * r) / 8.0;
  return nDotV / max(nDotV * (1.0 - k) + k, 1e-5);
}

fn ggx_geometry_smith(nDotV: f32, nDotL: f32, roughness: f32) -> f32 {
  return ggx_geometry_schlick(nDotV, roughness) * ggx_geometry_schlick(nDotL, roughness);
}

fn mandelbrot_tangent_from_dir(angleDir: vec2<f32>, normal: vec3<f32>) -> vec3<f32> {
  let flow = vec3<f32>(-angleDir.y, angleDir.x, 0.0);
  let projected = flow - normal * dot(flow, normal);
  let projectedLen = length(projected);
  return select(vec3<f32>(1.0, 0.0, 0.0), projected / projectedLen, projectedLen > 1e-5);
}

fn distance_tangent(grad: vec2<f32>, fallbackTangent: vec3<f32>, fallbackBitangent: vec3<f32>, normal: vec3<f32>) -> vec3<f32> {
  let gradLen = length(grad);
  let contour2d = vec2<f32>(-grad.y, grad.x) / max(gradLen, 1e-5);
  let tangentRaw = fallbackTangent * contour2d.x + fallbackBitangent * contour2d.y;
  let tangentFromDistance = tangentRaw / max(length(tangentRaw), 1e-5);
  let projected = tangentFromDistance - normal * dot(tangentFromDistance, normal);
  let projectedLen = length(projected);
  return select(fallbackTangent, projected / max(projectedLen, 1e-5), gradLen > 1e-4 && projectedLen > 1e-5);
}

fn anisotropic_highlight(normal: vec3<f32>, tangent: vec3<f32>, bitangent: vec3<f32>, halfDir: vec3<f32>, nDotL: f32, nDotV: f32, roughness: f32) -> f32 {
  let tDotH = dot(tangent, halfDir);
  let bDotH = dot(bitangent, halfDir);
  let nDotH = max(dot(normal, halfDir), 1e-5);
  let alphaT = max(0.06, roughness * 0.45);
  let alphaB = max(0.12, roughness * 1.65);
  let stretch = (tDotH * tDotH) / (alphaT * alphaT) + (bDotH * bDotH) / (alphaB * alphaB);
  let lobe = exp(-stretch / max(nDotH * nDotH, 1e-5));
  let visibility = sqrt(max(nDotL * nDotV, 0.0));
  return lobe * visibility;
}

fn pseudo_ambient_occlusion(normal: vec3<f32>, v_smooth: f32, z: vec2<f32>) -> f32 {
  let cavity = pow(clamp(1.0 - normal.z, 0.0, 1.0), 1.35);
  let depthMask = clamp(1.0 - exp(-v_smooth * 0.035), 0.0, 1.0);
  let basinMask = clamp(length(z) / 2.5, 0.0, 1.0);
  let strength = clamp(parameters.ambientOcclusionStrength, 0.0, 2.0);
  let ao = 1.0 - (0.55 * cavity + 0.25 * depthMask + 0.20 * basinMask) * 0.45 * strength;
  return clamp(ao, 0.08, 1.0);
}

fn luminance(color: vec3<f32>) -> f32 {
  return dot(color, vec3<f32>(0.2126, 0.7152, 0.0722));
}

fn sample_skybox(dir: vec3<f32>, dx: f32, dy: f32) -> vec3<f32> {
  return textureSampleLevel(skyboxTex, skyboxSampler, dir_to_skybox_uv(dir, dx, dy), 0.0).rgb;
}

fn rough_skybox_reflection(dir: vec3<f32>, tangent: vec3<f32>, bitangent: vec3<f32>, roughness: f32, dx: f32, dy: f32) -> vec3<f32> {
  let center = sample_skybox(dir, dx, dy);
  let spread = roughness * roughness * 0.45;
  let blur = (
    center * 2.0
    + sample_skybox(normalize(dir + tangent * spread), dx, dy)
    + sample_skybox(normalize(dir - tangent * spread), dx, dy)
    + sample_skybox(normalize(dir + bitangent * spread), dx, dy)
    + sample_skybox(normalize(dir - bitangent * spread), dx, dy)
  ) / 6.0;
  return mix(center, blur, clamp(roughness * 1.25, 0.0, 1.0));
}

fn curvature_edge_wear(angle_der: f32, v_smooth: f32) -> f32 {
  let directionalBase = abs(sin(angle_der * 2.0 + v_smooth * 0.035));
  let directionalBase2 = directionalBase * directionalBase;
  let directionalRidge = directionalBase2 * directionalBase2 * directionalBase2;
  let iterationBase = 1.0 - abs(fract(v_smooth * 0.125) * 2.0 - 1.0);
  let iterationRidge = iterationBase * iterationBase * iterationBase;
  return clamp(directionalRidge * 0.65 + iterationRidge * 0.35, 0.0, 1.0);
}

fn fake_subsurface_scattering(color: vec3<f32>, normal: vec3<f32>, lightDir: vec3<f32>, nDotV: f32, ao: f32, edgeWear: f32, metallic: f32, strength: f32, distanceHeight: f32) -> vec3<f32> {
  let backLight = pow(max(dot(normal, -lightDir), 0.0), 1.35);
  let rimScatter = pow(clamp(1.0 - nDotV, 0.0, 1.0), 2.15);
  let wrapBase = clamp(dot(normal, lightDir) * 0.5 + 0.5, 0.0, 1.0);
  let wrapLight = wrapBase * wrapBase;
  let thinness = 1.0 - smoothstep(4.0, 13.0, distanceHeight);
  let thickness = clamp(thinness * 0.62 + (1.0 - ao) * 0.23 + edgeWear * 0.15, 0.0, 1.0);
  let mask = (backLight * 0.35 + rimScatter * 0.25 + wrapLight * 0.40) * thickness;
  let scatterColor = mix(color, sqrt(max(color, vec3<f32>(0.0))), 0.35);
  return scatterColor * mask * clamp(strength, 0.0, 10.0) * (1.0 - metallic);
}

fn tile_tessellation(tex_: texture_2d<f32>, v: f32, dist: f32, repeat: f32) -> vec3<f32> {
  let tileUV = vec2<f32>(fract(v * repeat), fract(dist * repeat));
  let tileIndex = vec2<i32>(i32(floor(v * repeat)), i32(floor(dist * repeat)));

  let mirrorX = (tileIndex.x % 2) == 1;
  let mirrorY = (tileIndex.y % 2) == 1;
  let uv = vec2<f32>(
    select(tileUV.x, 1.0 - tileUV.x, mirrorX),
    select(tileUV.y, 1.0 - tileUV.y, mirrorY)
  );
  let texSize = vec2<i32>(textureDimensions(tex_, 0));
  let coord = vec2<i32>(
    i32(clamp(uv.x * f32(texSize.x), 0.0, f32(texSize.x - 1))),
    i32(clamp((1.0 - uv.y) * f32(texSize.y), 0.0, f32(texSize.y - 1)))
  );
  return textureLoad(tex_, coord, 0).rgb;
}

fn texture_bump_normal(tex_: texture_2d<f32>, normal: vec3<f32>, tangent: vec3<f32>, bitangent: vec3<f32>, v: f32, dist: f32, repeat: f32, strength: f32) -> vec3<f32> {
  let safeRepeat = max(repeat, 0.1);
  let stepSize = 1.0 / (safeRepeat * 96.0);
  let lpx = luminance(tile_tessellation(tex_, v + stepSize, dist, repeat));
  let lnx = luminance(tile_tessellation(tex_, v - stepSize, dist, repeat));
  let lpy = luminance(tile_tessellation(tex_, v, dist + stepSize, repeat));
  let lny = luminance(tile_tessellation(tex_, v, dist - stepSize, repeat));
  let grad = vec2<f32>(lpx - lnx, lpy - lny);
  let bump = (tangent * grad.x + bitangent * grad.y) * clamp(strength, 0.0, 2.0) * 0.85;
  return normalize(normal - bump);
}

fn fractal_height_normal(normal: vec3<f32>, tangent: vec3<f32>, bitangent: vec3<f32>, grad: vec2<f32>, relief: f32) -> vec3<f32> {
  return normalize(normal - tangent * grad.x * 0.34 * relief - bitangent * grad.y * 0.34 * relief);
}

fn fractal_height_ao(slope: f32, relief: f32, occStrength: f32) -> f32 {
  let occ = smoothstep(0.12, 2.75, slope * relief) * occStrength;
  return clamp(1.0 - occ * 0.72, 0.16, 1.0);
}

fn surface_cavity(slope: f32, relief: f32, occStrength: f32) -> f32 {
  let amount = smoothstep(0.04, 1.45, slope * relief) * occStrength;
  return clamp(1.0 - amount * 0.48, 0.26, 1.0);
}

fn fractal_height_shadow(grad: vec2<f32>, lightDir: vec3<f32>, tangent: vec3<f32>, bitangent: vec3<f32>, relief: f32, occStrength: f32) -> f32 {
  let lightPlane = vec2<f32>(dot(lightDir, tangent), dot(lightDir, bitangent));
  let lightPlaneLen = length(lightPlane);
  if (lightPlaneLen < 1e-4 || occStrength <= 0.0 || relief <= 0.0) {
    return 1.0;
  }
  let lightPlaneDir = lightPlane / lightPlaneLen;
  let uphillTowardLight = max(dot(grad, lightPlaneDir), 0.0);
  let grazing = 1.0 / max(lightDir.z + 0.35, 0.35);
  let shadow = uphillTowardLight * 0.22 * grazing * relief * occStrength;
  return clamp(1.0 - shadow, 0.22, 1.0);
}

fn distance_height_from_values(iterVal: f32, zx: f32, zy: f32, storedHeight: f32) -> f32 {
  if (escape_nu(iterVal, zx, zy) < 0.0) {
    return -1e6;
  }

  return clamp(storedHeight, -8.0, 64.0);
}

fn load_distance_height(sourceTex: texture_2d_array<f32>, coord: vec2<i32>) -> f32 {
  let iterVal = textureLoad(sourceTex, coord, 0, 0).r;
  let zx = textureLoad(sourceTex, coord, 2, 0).r;
  let zy = textureLoad(sourceTex, coord, 3, 0).r;
  let storedHeight = textureLoad(sourceTex, coord, 4, 0).r;
  return distance_height_from_values(iterVal, zx, zy, storedHeight);
}

fn sample_distance_height_at_coord(sourceTex: texture_2d_array<f32>, coord: vec2<i32>, texSize: vec2<i32>) -> f32 {
  if (coord.x < 0 || coord.x >= texSize.x || coord.y < 0 || coord.y >= texSize.y) {
    return -1e6;
  }
  return load_distance_height(sourceTex, coord);
}

fn distance_height_gradient_at_coord(sourceTex: texture_2d_array<f32>, coord: vec2<i32>, texSize: vec2<i32>, centerHeight: f32) -> vec2<f32> {
  let xr = sample_distance_height_at_coord(sourceTex, coord + vec2<i32>(1, 0), texSize);
  let xl = sample_distance_height_at_coord(sourceTex, coord - vec2<i32>(1, 0), texSize);
  let yu = sample_distance_height_at_coord(sourceTex, coord + vec2<i32>(0, 1), texSize);
  let yd = sample_distance_height_at_coord(sourceTex, coord - vec2<i32>(0, 1), texSize);
  let rightHeight = select(centerHeight, xr, xr > -1e5);
  let leftHeight = select(centerHeight, xl, xl > -1e5);
  let upHeight = select(centerHeight, yu, yu > -1e5);
  let downHeight = select(centerHeight, yd, yd > -1e5);
  return vec2<f32>(rightHeight - leftHeight, upHeight - downHeight) * 12.0;
}

fn palette(sourceTex: texture_2d_array<f32>, sourceCoord: vec2<i32>, sourceTexSize: vec2<i32>, iterRaw: f32, v: f32, v_smooth: f32, z: vec2<f32>, distanceHeightStored: f32, angle_der: f32, stripeAverage: f32, directionCoherence: f32, dx: f32, dy: f32) -> vec3<f32> {
  let paletteRepeat = max(parameters.palettePeriod, 0.0001);
  let deep = v * 2.0;
  let palettePhase = palettePhaseFromRaw(deep / paletteRepeat + animatedPaletteOffset());

  // ── Sample all effect channels from the palette texture ──
  let fx = sampleEffects(palettePhase);

  let effTess = fx.wTessellation;
  let effWebcam = fx.wWebcam;
  let effShading = fx.wShading;

  // ── Tessellation depth: always smooth, independent of palette period ──
  let tess_depth = v_smooth * 2.0;
  let disp = parameters.displacementAmount;
  let tess_u = tess_depth * 2.0 * disp + dx;
  let tess_v = tess_depth * 2.0 * disp + dy;

  // ── Gentle sinusoidal animation (only when animate is on) ──
  let anim = parameters.animate;
  let t = parameters.time;
  let spd = parameters.animationSpeed;
  let tile_drift = vec2<f32>(
    anim * 0.03 * sin(t * 0.4 * spd),
    anim * 0.03 * sin(t * 0.3 * spd + 1.2),
  );

  // ── Blend color sources using overlay/opacity model ──
  // Palette is always the base. Other sources overlay on top with their weight as opacity.
  var color = fx.paletteColor * fx.wPalette;

  // Tessellation: overlay on top of palette color
  if (effTess > 0.001) {
    let tessColor = tile_tessellation(tileTex, tess_u + tile_drift.x, tess_v + tile_drift.y, parameters.tessellationLevel);
    color = mix(color, tessColor, effTess);
  }

  // Webcam: overlay on top of current result
  if (effWebcam > 0.001) {
    let cam_drift_u = anim * 0.04 * sin(t * 0.35 * spd + 0.7);
    let cam_drift_v = anim * 0.04 * sin(t * 0.25 * spd + 2.0);
    let webCamColor = tile_tessellation(
      webcamTex,
      tess_u + cam_drift_u,
      tess_v + cam_drift_v,
      parameters.tessellationLevel
    );
    color = mix(color, webCamColor, effWebcam);
  }

  if (fx.wStripeAverage > 0.001) {
    color = mix(color, samplePaletteColor(fract(stripeAverage)), fx.wStripeAverage);
  }
  if (fx.wRotationMean > 0.001) {
    color = mix(color, samplePaletteColor(fract(directionCoherence)), fx.wRotationMean);
  }

  // ── Shading (always computed, applied proportionally to wShading) ──
  if (effShading > 0.001) {
    let angleDir = vec2<f32>(cos(angle_der), sin(angle_der));
    let reliefDepth = parameters.reliefDepth * effShading;
    let relief = clamp(reliefDepth, 0.0, 2.0);
    let surfaceRelief = relief * 0.5;
    let occStrength = clamp(parameters.localShadowStrength * 5.0, 0.0, 10.0);
    let needsDistanceHeight = parameters.subsurfaceStrength > 0.001;
    let stripeReliefStrength = fx.wStripeRelief * effShading;
    let directionCoherenceStrength = fx.wDirectionCoherenceRelief * effShading;
    let needsStripeGradient = stripeReliefStrength > 0.001;
    let needsDirectionCoherenceGradient = directionCoherenceStrength > 0.001;
    let needsFractalGradient = relief > 0.001 || occStrength > 0.001;
    var distanceHeight = 0.0;
    var grad = vec2<f32>(0.0);
    var stripeGrad = vec2<f32>(0.0);
    var directionCoherenceGrad = vec2<f32>(0.0);
    var slope = 0.0;
    if (needsDistanceHeight || needsFractalGradient) {
      distanceHeight = distance_height_from_values(iterRaw, z.x, z.y, distanceHeightStored);
    }
    if (needsFractalGradient) {
      let fractalGradient = distance_height_gradient_at_coord(sourceTex, sourceCoord, sourceTexSize, distanceHeight);
      grad = clamp(fractalGradient, vec2<f32>(-6.0), vec2<f32>(6.0));
      slope = length(grad);
    }
    if (needsStripeGradient) {
      stripeGrad = stripe_gradient_at_coord(sourceTex, sourceCoord, sourceTexSize, stripeAverage);
    }
    if (needsDirectionCoherenceGradient) {
      directionCoherenceGrad = direction_coherence_gradient_at_coord(sourceTex, sourceCoord, sourceTexSize, directionCoherence);
    }
    let edgeWear = curvature_edge_wear(angle_der, v_smooth);
    let flatNormal = vec3<f32>(0.0, 0.0, 1.0);
    let baseNormal = normalize(mix(flatNormal, mandelbrot_normal_from_dir(angleDir), surfaceRelief));
    let baseTangent = mandelbrot_tangent_from_dir(angleDir, baseNormal);
    let baseBitangent = normalize(cross(baseNormal, baseTangent));
    var bumpedNormal = baseNormal;
    let bumpStrength = parameters.microBumpStrength * effTess;
    if (bumpStrength > 0.001) {
      bumpedNormal = texture_bump_normal(
        tileTex,
        baseNormal,
        baseTangent,
        baseBitangent,
        tess_u + tile_drift.x,
        tess_v + tile_drift.y,
        parameters.tessellationLevel,
        bumpStrength
      );
    }
    let heightNormal = fractal_height_normal(bumpedNormal, baseTangent, baseBitangent, grad, relief);
    let stripeNormal = direction_coherence_normal(heightNormal, baseTangent, baseBitangent, stripeGrad, stripeReliefStrength);
    let directionNormal = direction_coherence_normal(stripeNormal, baseTangent, baseBitangent, directionCoherenceGrad, directionCoherenceStrength);
    let sceneSin = parameters.sceneSin;
    let sceneCos = parameters.sceneCos;
    let normal = normalize(rotate_surface_vector_sincos(directionNormal, sceneSin, sceneCos));
    let baseTangentWorld = normalize(rotate_surface_vector_sincos(baseTangent, sceneSin, sceneCos));
    let baseBitangentWorld = normalize(rotate_surface_vector_sincos(baseBitangent, sceneSin, sceneCos));
    let heightAo = fractal_height_ao(slope, relief, occStrength);
    let normalCavity = clamp(
      1.0 - smoothstep(0.02, 0.62, 1.0 - normal.z) * 0.58 * occStrength,
      0.16,
      1.0
    );
    let cavity = min(surface_cavity(slope, relief, occStrength), normalCavity);
    let ao = min(pseudo_ambient_occlusion(normal, v_smooth, z), heightAo) * cavity;
    let lightDir = vec3<f32>(parameters.lightDirX, parameters.lightDirY, parameters.lightDirZ);
    let viewDir = vec3<f32>(0.0, 0.0, 1.0);
    let halfDir = normalize(lightDir + viewDir);
    let tangent = normalize(rotate_surface_vector_sincos(mandelbrot_tangent_from_dir(angleDir, directionNormal), sceneSin, sceneCos));
    let bitangent = normalize(cross(normal, tangent));
    let anisotropyTangent = distance_tangent(grad, baseTangentWorld, baseBitangentWorld, normal);
    let anisotropyBitangent = normalize(cross(normal, anisotropyTangent));
    let nDotL = max(dot(normal, lightDir), 0.0);
    let nDotV = max(dot(normal, viewDir), 0.0);
    let nDotH = max(dot(normal, halfDir), 0.0);
    let vDotH = max(dot(viewDir, halfDir), 0.0);
    let metallic = clamp(fx.metallic, 0.0, 1.0);
    let roughness = clamp(fx.roughness, 0.02, 1.0);
    let anisotropy = clamp(fx.anisotropy, 0.0, 1.0);
    let specularGain = clamp(fx.specularPower / 16.0, 0.15, 4.0);
    let f0 = mix(vec3<f32>(0.04), color, metallic);
    let fresnelSpec = fresnel_schlick(vDotH, f0);
    let distribution = ggx_distribution(nDotH, roughness);
    let geometry = ggx_geometry_smith(nDotV, nDotL, roughness);
    let specularTerm = (distribution * geometry) / max(4.0 * nDotV * nDotL, 1e-5);
    let anisotropicTerm = anisotropic_highlight(normal, anisotropyTangent, anisotropyBitangent, halfDir, nDotL, nDotV, roughness);
    let specularLobe = mix(specularTerm, anisotropicTerm, anisotropy);
    let directSpecular = fresnelSpec * specularLobe * specularGain * nDotL;
    let diffuseColor = color * (1.0 - metallic) * (1.0 - 0.35 * luminance(fresnelSpec));
    let localShadow = fractal_height_shadow(grad, lightDir, baseTangentWorld, baseBitangentWorld, relief, occStrength);
    let shadowedNDotL = nDotL * localShadow;
    let litSide = smoothstep(0.02, 0.55, shadowedNDotL);
    let reflectionSide = mix(0.08, 1.0, litSide);
    let diffuseLight = diffuseColor * (0.14 + 0.86 * shadowedNDotL) * ao;
    let brightness = max(fx.shadingLevel, 0.0);
    var materialColor = diffuseLight + directSpecular * ao * mix(1.0, localShadow, 0.45);

    if (fx.wIridescence > 0.001) {
      let viewShift = smoothstep(0.04, 0.86, 1.0 - nDotV);
      let lightShift = smoothstep(0.08, 0.82, 1.0 - nDotH);
      let lightPlane = normalize(lightDir.xy + vec2<f32>(1e-5));
      let tangentPlane = vec2<f32>(-lightPlane.y, lightPlane.x);
      let orientationPlane = normalize(rotate_sincos(angleDir, sceneSin, sceneCos) + vec2<f32>(1e-5));
      let facingPearl = dot(orientationPlane, lightPlane) * 0.5 + 0.5;
      let crossPearl = dot(orientationPlane, tangentPlane) * 0.5 + 0.5;
      let orientationShift = mix(smoothstep(0.02, 0.98, facingPearl), smoothstep(0.02, 0.98, crossPearl), 0.42);
      let slopeShift = smoothstep(0.025, 1.15, slope * max(relief, 0.18));
      let tiltShift = smoothstep(0.025, 0.55, length(normal.xy));
      let surfaceShift = max(slopeShift, tiltShift * 0.65);
      let pearlAngle = clamp(0.05 + viewShift * 0.12 + lightShift * 0.10 + orientationShift * 0.56 + surfaceShift * 0.32, 0.0, 1.0);
      let pearlLighting = (0.18 + 0.82 * shadowedNDotL) * ao * mix(0.45, 1.0, localShadow) * mix(0.55, 1.0, cavity);
      let coatWeight = fx.wIridescence * pearlAngle * mix(0.45, 1.45, orientationShift) * mix(0.60, 1.25, surfaceShift) * pearlLighting * (1.0 - metallic * 0.35);
      let pearlTint = 0.18 + 0.74 * orientationShift + 0.18 * surfaceShift;
      let pearlColor = mix(color, fx.iridescenceColor, pearlTint) * (0.78 + 0.36 * max(luminance(color), 0.25));
      let pearlSheen = pow(nDotH, mix(2.5, 7.5, 1.0 - roughness)) * fx.wIridescence * pearlLighting * mix(0.45, 1.35, orientationShift);
      materialColor = mix(materialColor, pearlColor, clamp(coatWeight, 0.0, 0.92));
      materialColor += fx.iridescenceColor * pearlSheen * (0.28 + 0.46 * (1.0 - roughness)) * (1.0 - metallic * 0.25);
    }

    if (parameters.subsurfaceStrength > 0.001) {
      materialColor += fake_subsurface_scattering(
        color,
        normal,
        lightDir,
        nDotV,
        ao,
        edgeWear,
        metallic,
        parameters.subsurfaceStrength,
        distanceHeight
      );
    }

    // Thin clearcoat layer: a sharp white lobe sitting above the base material.
    let clearcoatStrength = effShading * clamp(parameters.clearcoatStrength, 0.0, 10.0) * (0.12 + 0.38 * fx.wSkybox) * (1.0 - roughness * 0.55);
    if (clearcoatStrength > 0.001) {
      let clearcoatD = ggx_distribution(nDotH, 0.08);
      let clearcoatG = ggx_geometry_smith(nDotV, nDotL, 0.08);
      let clearcoatF = fresnel_schlick(vDotH, vec3<f32>(0.04));
      materialColor += clearcoatF * (clearcoatD * clearcoatG / max(4.0 * nDotV * nDotL, 1e-5)) * nDotL * clearcoatStrength;
    }

    var envColor = vec3<f32>(0.0);
    if (fx.wSkybox > 0.001) {
      let sky_drift_u = anim * 0.02 * sin(t * 0.25 * spd + 3.5);
      let sky_drift_v = anim * 0.02 * sin(t * 0.2 * spd + 4.8);
      let skyboxDir = reflect(-viewDir, normal);
      let skyboxColor = rough_skybox_reflection(skyboxDir, tangent, bitangent, roughness, dx + sky_drift_u, dy + sky_drift_v);
      let fresnelEnv = fresnel_schlick(nDotV, f0);
      let fresnelReflection = clamp(luminance(fresnelEnv), 0.0, 1.0);
      let polishReflection = 0.075 * clamp(parameters.varnishStrength, 0.0, 10.0) * (1.0 - roughness * 0.55) * (1.0 - metallic * 0.35);
      let reflectionStrength = fx.wSkybox * max(fresnelReflection, polishReflection);
      let envVisibility = mix(reflectionSide, mix(0.55, 1.0, litSide), metallic);
      envColor = skyboxColor * reflectionStrength * mix(0.55, 1.25, metallic) * envVisibility;
    }

    let rim = pow(clamp(1.0 - nDotV, 0.0, 1.0), mix(3.5, 1.8, metallic)) * effShading * reflectionSide;
    let rimBaseColor = mix(color, vec3<f32>(1.0), 0.45);
    let rimPearlColor = mix(rimBaseColor, fx.iridescenceColor, fx.wIridescence * 0.65);
    let rimColor = rimPearlColor * rim * (0.08 + 0.22 * fx.wSkybox + 0.12 * fx.wIridescence);
    let wearColor = mix(color, vec3<f32>(1.0, 0.92, 0.74), 0.5 + 0.3 * metallic);
    let wear = edgeWear * (0.15 + 0.35 * metallic) * effShading * mix(0.35, 1.0, litSide);
    materialColor = mix(materialColor, materialColor + wearColor * wear, clamp(edgeWear, 0.0, 1.0));

    materialColor *= mix(1.0, cavity, 0.65);

    let pbrColor = (materialColor + envColor * mix(1.0, cavity, 0.35) + rimColor) * (0.55 + brightness * 0.45);
    color = mix(color * ao, pbrColor, effShading);
  }

  return clamp(color, vec3<f32>(0.0), vec3<f32>(1.0));
}

fn escape_nu(iter_val: f32, zx_val: f32, zy_val: f32) -> f32 {
  if (iter_val <= 0.0) {
    return -1.0;
  }
  let z_sq = zx_val * zx_val + zy_val * zy_val;
  if (z_sq < parameters.mu) {
    return -1.0;
  }
  let log_z2 = log(max(z_sq, 1e-12));
  let mu_val = clamp(1.0 - log(log_z2 / parameters.logMu) / log(2.0), 0.0, 1.0);
  return iter_val + mu_val;
}

fn decode_stripe_phase(refWithStripe: f32) -> f32 {
  return fract(max(refWithStripe, 0.0));
}

fn stripe_phase_delta(a: f32, b: f32) -> f32 {
  return fract(a - b + 0.5) - 0.5;
}

fn stripe_at_coord(sourceTex: texture_2d_array<f32>, coord: vec2<i32>, texSize: vec2<i32>) -> f32 {
  if (coord.x < 0 || coord.x >= texSize.x || coord.y < 0 || coord.y >= texSize.y) {
    return -1e6;
  }
  let iterVal = textureLoad(sourceTex, coord, 0, 0).r;
  let zx = textureLoad(sourceTex, coord, 2, 0).r;
  let zy = textureLoad(sourceTex, coord, 3, 0).r;
  if (escape_nu(iterVal, zx, zy) < 0.0) {
    return -1e6;
  }
  return decode_stripe_phase(textureLoad(sourceTex, coord, 6, 0).r);
}

fn stripe_gradient_at_coord(sourceTex: texture_2d_array<f32>, coord: vec2<i32>, texSize: vec2<i32>, centerStripe: f32) -> vec2<f32> {
  let xr = stripe_at_coord(sourceTex, coord + vec2<i32>(1, 0), texSize);
  let xl = stripe_at_coord(sourceTex, coord - vec2<i32>(1, 0), texSize);
  let yu = stripe_at_coord(sourceTex, coord + vec2<i32>(0, 1), texSize);
  let yd = stripe_at_coord(sourceTex, coord - vec2<i32>(0, 1), texSize);
  let right = select(centerStripe, xr, xr > -1e5);
  let left = select(centerStripe, xl, xl > -1e5);
  let up = select(centerStripe, yu, yu > -1e5);
  let down = select(centerStripe, yd, yd > -1e5);
  return vec2<f32>(stripe_phase_delta(right, left), stripe_phase_delta(up, down)) * 8.0;
}

const ORBIT_DIRECTION_SCALE: f32 = 4095.0;
const ORBIT_DIRECTION_BASE: f32 = 4096.0;

fn decode_direction_coherence(encoded: f32) -> f32 {
  let xq = floor(encoded / ORBIT_DIRECTION_BASE);
  let yq = encoded - xq * ORBIT_DIRECTION_BASE;
  let avgDir = vec2<f32>(
    (xq / ORBIT_DIRECTION_SCALE - 0.5) * 2.0,
    (yq / ORBIT_DIRECTION_SCALE - 0.5) * 2.0,
  );
  return clamp(length(avgDir), 0.0, 1.0);
}

fn direction_coherence_at_coord(sourceTex: texture_2d_array<f32>, coord: vec2<i32>, texSize: vec2<i32>) -> f32 {
  if (coord.x < 0 || coord.x >= texSize.x || coord.y < 0 || coord.y >= texSize.y) {
    return -1e6;
  }
  let iterVal = textureLoad(sourceTex, coord, 0, 0).r;
  let zx = textureLoad(sourceTex, coord, 2, 0).r;
  let zy = textureLoad(sourceTex, coord, 3, 0).r;
  if (escape_nu(iterVal, zx, zy) < 0.0) {
    return -1e6;
  }
  return decode_direction_coherence(textureLoad(sourceTex, coord, 7, 0).r);
}

fn direction_coherence_gradient_at_coord(sourceTex: texture_2d_array<f32>, coord: vec2<i32>, texSize: vec2<i32>, centerCoherence: f32) -> vec2<f32> {
  let xr = direction_coherence_at_coord(sourceTex, coord + vec2<i32>(1, 0), texSize);
  let xl = direction_coherence_at_coord(sourceTex, coord - vec2<i32>(1, 0), texSize);
  let yu = direction_coherence_at_coord(sourceTex, coord + vec2<i32>(0, 1), texSize);
  let yd = direction_coherence_at_coord(sourceTex, coord - vec2<i32>(0, 1), texSize);
  let right = select(centerCoherence, xr, xr > -1e5);
  let left = select(centerCoherence, xl, xl > -1e5);
  let up = select(centerCoherence, yu, yu > -1e5);
  let down = select(centerCoherence, yd, yd > -1e5);
  return vec2<f32>(right - left, up - down) * 8.0;
}

fn direction_coherence_normal(normal: vec3<f32>, tangent: vec3<f32>, bitangent: vec3<f32>, grad: vec2<f32>, strength: f32) -> vec3<f32> {
  let bump = tangent * grad.x + bitangent * grad.y;
  return normalize(normal - bump * clamp(strength, 0.0, 1.0) * 0.75);
}

// ── Colorize a single pixel from its raw layer values ──────────────
fn colorize_pixel(
  sourceTex: texture_2d_array<f32>,
  sourceCoord: vec2<i32>,
  sourceTexSize: vec2<i32>,
  iter_val: f32, zx_val: f32, zy_val: f32,
  der_x: f32, der_y: f32,
  refWithStripe: f32,
  avgDirection: f32,
  uv_neutral: vec2<f32>
) -> vec4<f32> {
  // Sentinel: iter_val < 0 => uncomputed pixel.
  if (iter_val < 0.0) {
    return vec4<f32>(0.0, 0.0, 0.0, 0.0);
  }

  // Budget exhausted: z hasn't escaped. Treat as interior — same coloring.
  if (iter_val > 0.0 && (zx_val * zx_val + zy_val * zy_val) < parameters.mu) {
    return vec4<f32>(0.0, 0.0, 0.0, 0.0);
  }

  if (iter_val == 0.0) {
    return vec4<f32>(0.0, 0.0, 0.0, 0.0);
  }

  // ── Escaped pixel ──
  let z_sq = zx_val * zx_val + zy_val * zy_val;
  let log_z2 = log(z_sq);
  let mu_val = clamp(1.0 - log(log_z2 / parameters.logMu) / log(2.0), 0.0, 1.0);

  var nu = iter_val + mu_val;

  if (nu < 0.0) {
    return vec4<f32>(0.0, 0.0, 0.5, 1.0);
  }

  let nu_smooth = nu;

  // ── Smoothness: continuous blend between raw and smooth iteration ──
  // We need the palette phase to read wSmoothness from the texture.
  // Compute a preliminary phase to sample the smoothness weight, then
  // apply it to select between iter_val and nu.
  let paletteRepeat = max(parameters.palettePeriod, 0.0001);
  let prelimPhase = palettePhaseFromRaw(nu * 2.0 / paletteRepeat + animatedPaletteOffset());
  let row2 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(prelimPhase, 0.416666667), 0.0);
  let wSmoothness = row2.g;
  nu = mix(iter_val, nu, wSmoothness);

  // ── Zebra: continuous application (darkens even iterations) ──
  let row1 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(prelimPhase, 0.25), 0.0);
  let wZebra = row1.r;
  let isEvenIter = 1.0 - abs(floor(iter_val) % 2.0);

  let z = vec2<f32>(zx_val, zy_val);
  let distanceHeightStored = der_x;
  let angle_der = der_y;

  let v = nu;
  let v_smooth = nu_smooth;
  let stripePhase = decode_stripe_phase(refWithStripe);
  let directionCoherence = decode_direction_coherence(avgDirection);
  var color = palette(sourceTex, sourceCoord, sourceTexSize, iter_val, v, v_smooth, z, distanceHeightStored, angle_der, stripePhase, directionCoherence, uv_neutral.x, uv_neutral.y);

  // Apply zebra after palette computation: darken even iterations
  color = color * (1.0 - wZebra * isEvenIter);

  return vec4<f32>(color, 1.0);
}

// ── Debug flag ──
// Set to true to visualize the live texture as a negative image during zoom,
// with genuine pixels tinted green and resolve-copied pixels tinted red.
const DEBUG_SHOW_LIVE_NEGATIVE: bool = false;

@fragment
fn fs_main(@location(0) fragCoord: vec2<f32>) -> @location(0) vec4<f32> {
  let uv_screen = fragCoord;

  let xy_screen = vec2<f32>(uv_screen.x * 2.0 - 1.0, uv_screen.y * 2.0 - 1.0);
  let local = vec2<f32>(xy_screen.x * parameters.aspect, xy_screen.y);
  let neutralExtent = sqrt(parameters.aspect * parameters.aspect + 1.0);
  let local_rot = rotate_sincos(local, parameters.sceneSin, parameters.sceneCos);
  let xy_neutral = local_rot / neutralExtent;
  let uv_neutral = xy_neutral * 0.5 + vec2<f32>(0.5, 0.5);

  let texSize = vec2<i32>(textureDimensions(tex));
  let texSizeF = vec2<f32>(f32(texSize.x), f32(texSize.y));

  let aspect = parameters.aspect;
  let sceneSin = parameters.sceneSin;
  let sceneCos = parameters.sceneCos;

  let zf  = parameters.zoomFactor;
  let lzf = parameters.liveZoomFactor;

  // ── Unified path: min-step-wins compositing ──────────────────────
  // Layer 1 stores the resolution step: 1 = genuine pixel (best),
  // >= 2 = resolve-copied from a grid neighbor (coarser = worse),
  // 0 = no data (sentinel / uncomputed).
  // The pixel with the smallest positive step wins.
  // When not zooming (zf=1, lzf=1), UV math reduces to identity, so the
  // same logic works seamlessly for both zoom and non-zoom rendering.

  // ── Sample live texture ──
  let uv_live = (uv_neutral - vec2<f32>(0.5, 0.5)) / lzf + vec2<f32>(0.5, 0.5);

  var liveInBounds: bool;
  if (lzf < 1.0) {
    liveInBounds = isInsideScreen(uv_live, aspect, neutralExtent, sceneSin, sceneCos);
  } else {
    liveInBounds = uv_live.x >= 0.0 && uv_live.x <= 1.0
                && uv_live.y >= 0.0 && uv_live.y <= 1.0;
  }

  var live_iter = -1.0;
  var liveStep = 0.0;  // 0 = no data
  var liveCoord = vec2<i32>(0);
  var live_zx = 0.0;
  var live_zy = 0.0;
  if (liveInBounds) {
    liveCoord = vec2<i32>(
      i32(clamp(uv_live.x * texSizeF.x, 0.0, texSizeF.x - 1.0)),
      i32(clamp((1.0 - uv_live.y) * texSizeF.y, 0.0, texSizeF.y - 1.0))
    );
    live_iter = textureLoad(tex, liveCoord, 0, 0).r;
    liveStep = textureLoad(tex, liveCoord, 1, 0).r;
    if (live_iter > 0.0) {
      live_zx = textureLoad(tex, liveCoord, 2, 0).r;
      live_zy = textureLoad(tex, liveCoord, 3, 0).r;
    }
  }
  let liveEscaped = live_iter > 0.0 && (live_zx * live_zx + live_zy * live_zy) >= parameters.mu;
  let liveHasData = liveEscaped && liveStep > 0.0;

  // ── Sample frozen texture ──
  // The frozen texture is only usable when it is aligned with the live texture
  // (during zoom reprojection, or post-zoom before any translation occurs).
  // The CPU sets frozenAligned = 1.0 in those cases, 0.0 otherwise.
  let useFrozen = parameters.frozenAligned > 0.5;

  var frozenStep = 0.0;  // 0 = no data
  var frozenCoord = vec2<i32>(0);
  var frozen_iter = -1.0;
  var frozen_zx = 0.0;
  var frozen_zy = 0.0;
  if (useFrozen) {
    let uv_frozen = (uv_neutral - vec2<f32>(0.5, 0.5)) / zf + vec2<f32>(0.5, 0.5)
                    - vec2<f32>(parameters.frozenShiftU, parameters.frozenShiftV);

    var frozenInBounds: bool;
    if (zf < 1.0) {
      frozenInBounds = isInsideScreen(uv_frozen, aspect, neutralExtent, sceneSin, sceneCos);
    } else {
      frozenInBounds = uv_frozen.x >= 0.0 && uv_frozen.x <= 1.0
                    && uv_frozen.y >= 0.0 && uv_frozen.y <= 1.0;
    }

    if (frozenInBounds) {
      frozenCoord = vec2<i32>(
        i32(clamp(uv_frozen.x * texSizeF.x, 0.0, texSizeF.x - 1.0)),
        i32(clamp((1.0 - uv_frozen.y) * texSizeF.y, 0.0, texSizeF.y - 1.0))
      );
      frozen_iter = textureLoad(texFrozen, frozenCoord, 0, 0).r;
      frozenStep = textureLoad(texFrozen, frozenCoord, 1, 0).r;
      if (frozen_iter >= 0.0) {
        frozen_zx = textureLoad(texFrozen, frozenCoord, 2, 0).r;
        frozen_zy = textureLoad(texFrozen, frozenCoord, 3, 0).r;
      }
    }
  }
  let frozenEscaped = frozen_iter > 0.0 && (frozen_zx * frozen_zx + frozen_zy * frozen_zy) >= parameters.mu;
  let frozenInterior = frozen_iter == 0.0;
  let frozenHasData = (frozenEscaped || frozenInterior) && frozenStep > 0.0;

  // ── Pick the best pixel: smallest positive step wins ──
  // step > 0 means the pixel has data; step = 0 means no data.
  // The frozen and live textures live at different scales, so their raw step
  // values are not directly comparable. A frozen genuine pixel (step=1) at
  // frozenScale is zf/lzf times coarser per axis than a live genuine pixel
  // (step=1) at liveScale.  Scale the frozen step to live-resolution units.
  let scaleRatio = select(1.0, zf / lzf, lzf > 0.0);
  let effectiveFrozenStep = frozenStep * scaleRatio;

  if (liveHasData && frozenHasData) {
    // Both have data — pick the one with finer resolution (smaller step).
    if (liveStep <= effectiveFrozenStep) {
      let liveColor = colorize_pixel(
        tex,
        liveCoord,
        texSize,
        live_iter,
        live_zx,
        live_zy,
        textureLoad(tex, liveCoord, 4, 0).r,
        textureLoad(tex, liveCoord, 5, 0).r,
        textureLoad(tex, liveCoord, 6, 0).r,
        textureLoad(tex, liveCoord, 7, 0).r,
        uv_neutral
      );
      if (DEBUG_SHOW_LIVE_NEGATIVE) {
        let neg = vec3<f32>(1.0) - liveColor.rgb;
        return vec4<f32>(neg.r * 0.3, neg.g, neg.b * 0.3, 1.0);
      }
      return vec4<f32>(liveColor.rgb, 1.0);
    } else {
      let frozenColor = colorize_pixel(
        texFrozen,
        frozenCoord,
        texSize,
        frozen_iter,
        frozen_zx,
        frozen_zy,
        textureLoad(texFrozen, frozenCoord, 4, 0).r,
        textureLoad(texFrozen, frozenCoord, 5, 0).r,
        textureLoad(texFrozen, frozenCoord, 6, 0).r,
        textureLoad(texFrozen, frozenCoord, 7, 0).r,
        uv_neutral
      );
      return vec4<f32>(frozenColor.rgb, 1.0);
    }
  }

  if (liveHasData) {
    let liveColor = colorize_pixel(
      tex,
      liveCoord,
      texSize,
      live_iter,
      live_zx,
      live_zy,
      textureLoad(tex, liveCoord, 4, 0).r,
      textureLoad(tex, liveCoord, 5, 0).r,
      textureLoad(tex, liveCoord, 6, 0).r,
      textureLoad(tex, liveCoord, 7, 0).r,
      uv_neutral
    );
    if (DEBUG_SHOW_LIVE_NEGATIVE) {
      let neg = vec3<f32>(1.0) - liveColor.rgb;
      if (liveStep <= 1.0) {
        return vec4<f32>(neg.r * 0.3, neg.g, neg.b * 0.3, 1.0);
      } else {
        return vec4<f32>(neg.r, neg.g * 0.3, neg.b * 0.3, 1.0);
      }
    }
    return vec4<f32>(liveColor.rgb, 1.0);
  }

  if (frozenHasData) {
    let frozenColor = colorize_pixel(
      texFrozen,
      frozenCoord,
      texSize,
      frozen_iter,
      frozen_zx,
      frozen_zy,
      textureLoad(texFrozen, frozenCoord, 4, 0).r,
      textureLoad(texFrozen, frozenCoord, 5, 0).r,
      textureLoad(texFrozen, frozenCoord, 6, 0).r,
      textureLoad(texFrozen, frozenCoord, 7, 0).r,
      uv_neutral
    );
    return vec4<f32>(frozenColor.rgb, 1.0);
  }

  // No valid pixel from either source.
  return vec4<f32>(0.05, 0.05, 0.05, 1.0);
}
`,zn=`// Brush pass: updates sentinel levels in the neutral square texture.
//
// Uses a texture_2d_array<f32> with 8 r32float layers.
//
// Layer layout:
//   0 : sentinel / iteration count (integer part)
//   1 : resolution step (1.0 = genuine pixel, >= 2 = resolve-copied, 0.0 = no data)
//   2 : z.x
//   3 : z.y
//   4 : dz.x (derivative real)
//   5 : dz.y (derivative imag)
//   6 : ref_i + fractional stripe phase (reference orbit index for resuming perturbation)
//   7 : packed average orbit direction
//
// Sentinels are stored in layer 0 as negative integers:
//   -1  : needs Mandelbrot computation (or continuation)
//   -2  : needs resolve with step=2
//   -4  : needs resolve with step=4
//   ...
//
// Pixel state convention (iter-only, no mu in state logic):
//   iter == -1                     : sentinel, needs computation
//   iter == 0                      : confirmed inside the set (or exhausted at globalMaxIter)
//   iter > 0  AND  |z|\xb2 >= 4      : escaped → color with iter + mu (mu recomputed in color shader)
//   iter > 0  AND  |z|\xb2 < 4       : budget exhausted mid-progress → needs continuation
//   The mandelbrot pass handles continuations directly; the brush does NOT
//   convert budget-exhausted pixels to sentinels.

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
  let neutralExtent = sqrt(uni.aspect * uni.aspect + 1.0);
  let local_rot = xy_neutral * neutralExtent;
  let local = rotate(local_rot, -uni.angle);
  let inside_x = abs(local.x) <= uni.aspect;
  let inside_y = abs(local.y) <= 1.0;
  return inside_x && inside_y;
}

// ── output struct (8 render targets) ──────────────────────────────
struct FragOut {
  @location(0) iter:      vec4<f32>,
  @location(1) genuine:   vec4<f32>,
  @location(2) zx:        vec4<f32>,
  @location(3) zy:        vec4<f32>,
  @location(4) dzx:       vec4<f32>,
  @location(5) dzy:       vec4<f32>,
  @location(6) ref_i:     vec4<f32>,
  @location(7) avgDirection: vec4<f32>,
};

fn pack(v: f32) -> vec4<f32> { return vec4<f32>(v, 0.0, 0.0, 0.0); }

fn loadLayer(coord: vec2<i32>, layer: i32) -> f32 {
  return textureLoad(prevRaw, coord, layer, 0).r;
}

fn loadAllLayers(coord: vec2<i32>) -> FragOut {
  var o: FragOut;
  o.iter      = pack(loadLayer(coord, 0));
  o.genuine   = pack(loadLayer(coord, 1));
  o.zx        = pack(loadLayer(coord, 2));
  o.zy        = pack(loadLayer(coord, 3));
  o.dzx       = pack(loadLayer(coord, 4));
  o.dzy       = pack(loadLayer(coord, 5));
  o.ref_i     = pack(loadLayer(coord, 6));
  o.avgDirection = pack(loadLayer(coord, 7));
  return o;
}

fn makeCleared(sentinel: f32) -> FragOut {
  var o: FragOut;
  o.iter      = pack(sentinel);
  o.genuine   = pack(0.0);
  o.zx        = pack(0.0);
  o.zy        = pack(0.0);
  o.dzx       = pack(0.0);
  o.dzy       = pack(0.0);
  o.ref_i     = pack(0.0);
  o.avgDirection = pack(0.0);
  return o;
}

fn refine_sentinel(s: f32, coord_out: vec2<i32>) -> f32 {
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

  // Adaptive refinement gating: when the GPU is under pressure the CPU
  // sets allowRefinement to 0, freezing the sentinel grid at its current
  // resolution.  This prevents a 4\xd7 pixel-count spike at each step
  // transition, giving the iteration-batch controller time to adapt.
  if (uni.allowRefinement < 0.5) {
    return s;
  }

  // Clamp minimum refinement step during zoom (0 = no limit).
  let minStep = i32(uni.minBrushStep);
  let next_step = max(max(1, minStep), step / 2);

  // If clamped step equals current step, stop refining — already at minimum.
  if (next_step >= step) {
    return s;
  }

  let gx = i32(uni.gridOffsetX);
  let gy = i32(uni.gridOffsetY);
  let is_anchor = (((coord_out.x - gx) % next_step + next_step) % next_step == 0)
               && (((coord_out.y - gy) % next_step + next_step) % next_step == 0);
  return select(-f32(next_step), -1.0, is_anchor);
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> FragOut {
  let dims = vec2<i32>(textureDimensions(prevRaw));
  let coord_out = vec2<i32>(
    i32(clamp(uv.x * f32(dims.x), 0.0, f32(dims.x - 1))),
    i32(clamp((1.0 - uv.y) * f32(dims.y), 0.0, f32(dims.y - 1)))
  );

  // Full reset when needed.
  if (uni.clearHistory >= 0.5) {
    let step = i32(max(1.0, uni.seedStep));
    let is_anchor = (coord_out.x % step == 0) && (coord_out.y % step == 0);
    let sentinel = select(-uni.baseSentinel, -1.0, is_anchor);
    return makeCleared(sentinel);
  }

  // Translation reprojection.
  let shift = vec2<i32>(i32(round(uni.shiftTexX)), i32(round(uni.shiftTexY)));
  let coord_in = coord_out - shift;

  var prev: FragOut;
  if (coord_in.x < 0 || coord_in.y < 0 || coord_in.x >= dims.x || coord_in.y >= dims.y) {
    prev = makeCleared(-uni.baseSentinel);
  } else {
    prev = loadAllLayers(coord_in);
  }

  // Outside ROI: keep as-is.
  let xy_neutral = vec2<f32>(uv.x * 2.0 - 1.0, uv.y * 2.0 - 1.0);
  if (!is_inside_rotated_screen(xy_neutral)) {
    return prev;
  }

  let iter_val = prev.iter.r;

  // Sentinel refinement.
  if (iter_val < 0.0) {
    let refined = refine_sentinel(iter_val, coord_out);
    var out = prev;
    out.iter = pack(refined);
    return out;
  }

  // Already computed and escaped (iter > 0, mu > 0) or inside (iter == 0, mu >= 0).
  return prev;
}
`,Sn=`// Resolve pass: replaces remaining sentinels with a snapped parent pixel.
//
// Uses a texture_2d_array<f32> with 8 r32float layers.
//
// Layer layout:
//   0 : sentinel / iteration count (integer part)
//   1 : resolution step (1.0 = genuine pixel, >= 2 = resolve-copied from grid step)
//   2 : z.x
//   3 : z.y
//   4 : dz.x (derivative real)
//   5 : dz.y (derivative imag)
//   6 : ref_i + fractional stripe phase (reference orbit index for resuming perturbation)
//   7 : packed average orbit direction
//
// Sentinel convention:
//   If layer0 == -step (step is power-of-two > 1), resolve by testing
//   all 4 corner anchors of the grid cell and using the first finished
//   one.  This ensures correct resolve regardless of pan direction.

struct ResolveUniforms {
  mu: f32,
  gridOffsetX: f32,
  gridOffsetY: f32,
};

@group(0) @binding(0) var<uniform> uni: ResolveUniforms;
@group(0) @binding(1) var rawTex: texture_2d_array<f32>;

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

// ── output struct (8 render targets) ──────────────────────────────
struct FragOut {
  @location(0) iter:      vec4<f32>,
  @location(1) genuine:   vec4<f32>,
  @location(2) zx:        vec4<f32>,
  @location(3) zy:        vec4<f32>,
  @location(4) dzx:       vec4<f32>,
  @location(5) dzy:       vec4<f32>,
  @location(6) ref_i:     vec4<f32>,
  @location(7) avgDirection: vec4<f32>,
};

fn pack(v: f32) -> vec4<f32> { return vec4<f32>(v, 0.0, 0.0, 0.0); }

fn loadLayer(coord: vec2<i32>, layer: i32) -> f32 {
  return textureLoad(rawTex, coord, layer, 0).r;
}

fn empty_out() -> FragOut {
  var o: FragOut;
  o.iter      = pack(0.0);
  o.genuine   = pack(0.0);
  o.zx        = pack(0.0);
  o.zy        = pack(0.0);
  o.dzx       = pack(0.0);
  o.dzy       = pack(0.0);
  o.ref_i     = pack(0.0);
  o.avgDirection = pack(0.0);
  return o;
}

// Like loadAllLayers but writes the resolve grid step into layer 1.
// step = grid distance to the source pixel (higher = coarser / less accurate).
// Genuine pixels have step = 1; resolve-copied pixels have step >= 2.
fn loadAllLayersAsCopy(coord: vec2<i32>, step: u32) -> FragOut {
  var o: FragOut;
  o.iter      = pack(loadLayer(coord, 0));
  o.genuine   = pack(f32(step));
  o.zx        = pack(loadLayer(coord, 2));
  o.zy        = pack(loadLayer(coord, 3));
  o.dzx       = pack(loadLayer(coord, 4));
  o.dzy       = pack(loadLayer(coord, 5));
  o.ref_i     = pack(loadLayer(coord, 6));
  o.avgDirection = pack(loadLayer(coord, 7));
  return o;
}

fn floor_power_of_two(step: u32) -> u32 {
  // Returns the greatest power-of-two <= step.
  if (step == 0u) {
    return 1u;
  }
  let msb_index = 31u - countLeadingZeros(step);
  return 1u << msb_index;
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> FragOut {
  let dims = vec2<u32>(textureDimensions(rawTex));
  let x = u32(clamp(uv.x * f32(dims.x), 0.0, f32(dims.x - 1u)));
  let y = u32(clamp((1.0 - uv.y) * f32(dims.y), 0.0, f32(dims.y - 1u)));
  let coord = vec2<i32>(i32(x), i32(y));

  let iter_val = loadLayer(coord, 0);

  // Finished pixel: escaped (iter > 0, |z|\xb2 >= mu) or inside (iter == 0).
  // Pass through unchanged.
  if (iter_val == 0.0) {
    discard;
    return empty_out();
  }
  if (iter_val > 0.0) {
    let zx = loadLayer(coord, 2);
    let zy = loadLayer(coord, 3);
    let z_sq = zx * zx + zy * zy;
    if (z_sq > uni.mu) {
      // Escaped — finished, pass through.
      discard;
      return empty_out();
    }
    // Budget-exhausted anchor (iter > 0, |z|\xb2 < mu):
    // climb to a coarser finished ancestor starting at step 2.
  }

  // At this point the pixel is either:
  //   (a) a sentinel (iter < 0, step > 1) — snap to parent anchor, or
  //   (b) a budget-exhausted anchor — climb to a coarser finished ancestor.

  // -1 should not remain after Mandelbrot pass, but if it does: keep as-is.
  var step_u: u32;
  if (iter_val < 0.0) {
    let step_f = -iter_val;
    if (step_f <= 1.0) {
      discard;
      return empty_out();
    }
    step_u = floor_power_of_two(u32(step_f));
  } else {
    // Budget-exhausted anchor: start climbing from the next coarser grid level.
    step_u = 2u;
  }

  // Snap to parent anchor, climbing to coarser steps if the anchor is
  // budget-exhausted (iter > 0 AND |z|\xb2 < mu).  This eliminates the
  // Sierpinski-triangle artifact that appeared when the resolve pass
  // blindly copied unfinished pixels.

  // Grid offset for sentinel alignment after translation.
  let gx = i32(uni.gridOffsetX);
  let gy = i32(uni.gridOffsetY);

  // Climb through coarser grid levels. The maximum number of doublings
  // before step_u exceeds the texture size is bounded by log2(max(dims)).
  // Using 20 iterations covers textures up to 2^20 = 1M pixels per side.
  for (var level = 0u; level < 10u; level = level + 1u) {
    // Safety: if step exceeds texture size, stop climbing and fall back
    // to the pixel itself (prevents runaway on pathological inputs
    // or when all ancestors are unfinished sentinels).
    if (step_u >= dims.x || step_u >= dims.y) {
      discard;
      return empty_out();
    }

    let step_i = i32(step_u);
    // Snap to grid-aligned anchor, accounting for cumulative shift offset.
    let sx = i32(x) - gx;
    let sy = i32(y) - gy;
    let base_x = u32(sx - ((sx % step_i + step_i) % step_i) + gx);
    let base_y = u32(sy - ((sy % step_i + step_i) % step_i) + gy);

    // Test 4 candidate anchors (all corners of the grid cell) so that
    // resolve works regardless of the navigation direction.
    var candidates = array<vec2<u32>, 4>(
      vec2<u32>(base_x,          base_y),
      vec2<u32>(base_x + step_u, base_y),
      vec2<u32>(base_x,          base_y + step_u),
      vec2<u32>(base_x + step_u, base_y + step_u)
    );

    for (var i = 0u; i < 4u; i = i + 1u) {
      let cx = candidates[i].x;
      let cy = candidates[i].y;

      // Bounds check: skip candidates that fall outside the texture.
      if (cx >= dims.x || cy >= dims.y) {
        continue;
      }

      let ccoord = vec2<i32>(i32(cx), i32(cy));
      let citer = loadLayer(ccoord, 0);

      // Sentinel — this candidate is not computed yet.
      if (citer < 0.0) {
        continue;
      }

      // Inside set (iter == 0): use it.
      if (citer == 0.0) {
        return loadAllLayersAsCopy(ccoord, step_u);
      }

      // iter > 0: check whether pixel actually escaped or is budget-exhausted.
      let zx = loadLayer(ccoord, 2);
      let zy = loadLayer(ccoord, 3);
      let z_sq = zx * zx + zy * zy;

      if (z_sq >= uni.mu) {
        // Escaped — use this pixel.
        return loadAllLayersAsCopy(ccoord, step_u);
      }

      // Budget-exhausted: skip this candidate, try the others.
    }

    // None of the 4 candidates had a finished pixel — climb to the next
    // coarser grid level.
    step_u = step_u * 2u;
  }

  // Fallback after exhausting all grid levels.
  discard;
  return empty_out();
}
`,Rn=`// Compute pass: counts pixels that still need rendering work.
//
// Reads rawTexture (A) after the mandelbrot render pass:
//   Layer 0 : iter (sentinel / iteration count)
//   Layer 2 : z.x
//   Layer 3 : z.y
//
// A pixel needs work if:
//   iter < 0               : sentinel (any level), needs refinement + computation
//   iter > 0  AND  |z|\xb2 < mu : budget exhausted mid-progress, needs continuation
//
// Two counters are maintained:
//   count        : all pixels needing work (sentinels + continuations) — for needsMoreFrames()
//   active_count : pixels that mandelbrot.wgsl actually processes this frame
//                  (iter == -1 OR continuation) — for adaptive refinement gating
//
// Only pixels inside the rotated viewport are counted; pixels outside
// the projected frame on the neutral texture are ignored.
//
// The count is written to an atomic<u32> in a storage buffer, read back
// asynchronously by the CPU to determine when progressive rendering is done.

struct Params {
  mu: f32,
  aspect: f32,
  angle: f32,
};

struct CounterBuffer {
  count: atomic<u32>,
  active_count: atomic<u32>,
};

@group(0) @binding(0) var rawTex: texture_2d_array<f32>;
@group(0) @binding(1) var<storage, read_write> counter: CounterBuffer;
@group(0) @binding(2) var<uniform> params: Params;

fn rotate2d(v: vec2<f32>, a: f32) -> vec2<f32> {
  let s = sin(a);
  let c = cos(a);
  return vec2<f32>(c * v.x - s * v.y, s * v.x + c * v.y);
}

fn is_inside_rotated_screen(xy_neutral: vec2<f32>) -> bool {
  let neutralExtent = sqrt(params.aspect * params.aspect + 1.0);
  let local_rot = xy_neutral * neutralExtent;
  let local = rotate2d(local_rot, -params.angle);
  let inside_x = abs(local.x) <= params.aspect;
  let inside_y = abs(local.y) <= 1.0;
  return inside_x && inside_y;
}

@compute @workgroup_size(16, 16)
fn count_unfinished(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = textureDimensions(rawTex);
  if (gid.x >= dims.x || gid.y >= dims.y) {
    return;
  }

  // Map pixel coordinate to neutral-space [-1, 1]
  // Y is flipped to match the fragment-shader convention where uv.y=0 is
  // bottom and uv.y=1 is top, whereas gid.y=0 is the first texel row.
  let uv = vec2<f32>(
    (f32(gid.x) + 0.5) / f32(dims.x),
    1.0 - (f32(gid.y) + 0.5) / f32(dims.y),
  );
  let xy_neutral = uv * 2.0 - vec2<f32>(1.0);

  // Skip pixels outside the rotated viewport
  if (!is_inside_rotated_screen(xy_neutral)) {
    return;
  }

  let coord = vec2<i32>(i32(gid.x), i32(gid.y));
  let iter = textureLoad(rawTex, coord, 0, 0).r;

  if (iter < 0.0) {
    atomicAdd(&counter.count, 1u);
    if (iter == -1.0) {
      atomicAdd(&counter.active_count, 1u);
    }
    return;
  }

  if (iter <= 0.0) {
    return;
  }

  let zx = textureLoad(rawTex, coord, 2, 0).r;
  let zy = textureLoad(rawTex, coord, 3, 0).r;
  let needs_continuation = (zx * zx + zy * zy) < params.mu;
  if (needs_continuation) {
    atomicAdd(&counter.count, 1u);
    atomicAdd(&counter.active_count, 1u);
  }
}
`,Mn=`// Merge pass: fuses the resolved (live) and frozen textures into a new frozen
// snapshot using the min-step-wins rule.
//
// This is needed when zoom stops: the two textures live in different coordinate
// spaces (live at liveScale, frozen at frozenScale). The merge reprojects both
// into the current display space and, for each output pixel, keeps the source
// with the finest resolution (smallest positive step in layer 1).
//
// Output: 8 MRT render targets written directly into the frozen texture layers.
//
// Layer layout (r32float texture_2d_array, 8 layers):
//   0 : iteration count
//   1 : resolution step (1 = genuine, >= 2 = resolve-copied, 0 = no data)
//   2 : z.x
//   3 : z.y
//   4 : dz.x
//   5 : dz.y
//   6 : ref_i + fractional stripe phase
//   7 : packed average orbit direction

struct MergeUniforms {
  zoomFactor:    f32, // frozenScale / displayScale
  liveZoomFactor: f32, // liveScale / displayScale
  frozenShiftU:  f32,
  frozenShiftV:  f32,
  aspect:        f32,
  angle:         f32,
};

@group(0) @binding(0) var<uniform> uni: MergeUniforms;
@group(0) @binding(1) var texResolved: texture_2d_array<f32>;
@group(0) @binding(2) var texFrozen:   texture_2d_array<f32>;

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

// ── output struct (8 render targets) ──────────────────────────────
struct FragOut {
  @location(0) layer0: vec4<f32>,
  @location(1) layer1: vec4<f32>,
  @location(2) layer2: vec4<f32>,
  @location(3) layer3: vec4<f32>,
  @location(4) layer4: vec4<f32>,
  @location(5) layer5: vec4<f32>,
  @location(6) layer6: vec4<f32>,
  @location(7) layer7: vec4<f32>,
};

fn pack(v: f32) -> vec4<f32> { return vec4<f32>(v, 0.0, 0.0, 0.0); }

fn rotate(p: vec2<f32>, a: f32) -> vec2<f32> {
  let c = cos(a);
  let s = sin(a);
  return vec2<f32>(p.x * c - p.y * s, p.x * s + p.y * c);
}

// Check if a UV in neutral space maps to a point inside the rotated screen.
fn isInsideScreen(uv: vec2<f32>, aspect: f32, neutralExtent: f32, angle: f32) -> bool {
  let xy = (uv - vec2<f32>(0.5, 0.5)) * 2.0;
  let local = xy * neutralExtent;
  let rotated = rotate(local, -angle);
  return abs(rotated.x) <= aspect && abs(rotated.y) <= 1.0;
}

// Read all 8 layers from a texture at the given coordinate.
fn readAllLayersWithKnown01(tex: texture_2d_array<f32>, coord: vec2<i32>, iter: f32, step: f32) -> FragOut {
  var o: FragOut;
  o.layer0 = pack(iter);
  o.layer1 = pack(step);
  o.layer2 = pack(textureLoad(tex, coord, 2, 0).r);
  o.layer3 = pack(textureLoad(tex, coord, 3, 0).r);
  o.layer4 = pack(textureLoad(tex, coord, 4, 0).r);
  o.layer5 = pack(textureLoad(tex, coord, 5, 0).r);
  o.layer6 = pack(textureLoad(tex, coord, 6, 0).r);
  o.layer7 = pack(textureLoad(tex, coord, 7, 0).r);
  return o;
}

fn makeEmpty() -> FragOut {
  var o: FragOut;
  o.layer0 = pack(-1.0); // sentinel
  o.layer1 = pack(0.0);  // step = 0 (no data)
  o.layer2 = pack(0.0);
  o.layer3 = pack(0.0);
  o.layer4 = pack(0.0);
  o.layer5 = pack(0.0);
  o.layer6 = pack(0.0);
  o.layer7 = pack(0.0);
  return o;
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> FragOut {
  // uv is in output space (0..1), which maps directly to the frozen texture.
  // The output frozen will be used post-zoom with zf=1, lzf=1, so output
  // coordinates = neutral texture coordinates.

  // Convert output UV to neutral-space UV.
  // The output texture is square (neutral-sized), same as all layer textures.
  // uv already spans 0..1 across this square, so uv_neutral = uv (with Y flip
  // handled by the MRT write).
  let uv_neutral = uv;

  let texSize = vec2<i32>(textureDimensions(texResolved));
  let texSizeF = vec2<f32>(f32(texSize.x), f32(texSize.y));

  let aspect = uni.aspect;
  let angle  = uni.angle;
  let neutralExtent = sqrt(aspect * aspect + 1.0);
  let zf  = uni.zoomFactor;
  let lzf = uni.liveZoomFactor;

  // ── Sample resolved (live) texture ──
  let uv_live = (uv_neutral - vec2<f32>(0.5, 0.5)) / lzf + vec2<f32>(0.5, 0.5);

  var liveInBounds: bool;
  if (lzf < 1.0) {
    liveInBounds = isInsideScreen(uv_live, aspect, neutralExtent, angle);
  } else {
    liveInBounds = uv_live.x >= 0.0 && uv_live.x <= 1.0
                && uv_live.y >= 0.0 && uv_live.y <= 1.0;
  }

  var liveStep = 0.0;
  var liveIter = -1.0;
  var liveData = makeEmpty();
  if (liveInBounds) {
    let liveCoord = vec2<i32>(
      i32(clamp(uv_live.x * texSizeF.x, 0.0, texSizeF.x - 1.0)),
      i32(clamp((1.0 - uv_live.y) * texSizeF.y, 0.0, texSizeF.y - 1.0))
    );
    liveIter = textureLoad(texResolved, liveCoord, 0, 0).r;
    liveStep = textureLoad(texResolved, liveCoord, 1, 0).r;
    if (liveIter >= 0.0 && liveStep > 0.0) {
      liveData = readAllLayersWithKnown01(texResolved, liveCoord, liveIter, liveStep);
    }
  }
  let liveHasData = liveIter >= 0.0 && liveStep > 0.0;

  // ── Sample frozen texture ──
  let uv_frozen = (uv_neutral - vec2<f32>(0.5, 0.5)) / zf + vec2<f32>(0.5, 0.5)
                  - vec2<f32>(uni.frozenShiftU, uni.frozenShiftV);

  var frozenInBounds: bool;
  if (zf < 1.0) {
    frozenInBounds = isInsideScreen(uv_frozen, aspect, neutralExtent, angle);
  } else {
    frozenInBounds = uv_frozen.x >= 0.0 && uv_frozen.x <= 1.0
                  && uv_frozen.y >= 0.0 && uv_frozen.y <= 1.0;
  }

  var frozenStep = 0.0;
  var frozenIter = -1.0;
  var frozenData = makeEmpty();
  if (frozenInBounds) {
    let frozenCoord = vec2<i32>(
      i32(clamp(uv_frozen.x * texSizeF.x, 0.0, texSizeF.x - 1.0)),
      i32(clamp((1.0 - uv_frozen.y) * texSizeF.y, 0.0, texSizeF.y - 1.0))
    );
    frozenIter = textureLoad(texFrozen, frozenCoord, 0, 0).r;
    frozenStep = textureLoad(texFrozen, frozenCoord, 1, 0).r;
    if (frozenIter >= 0.0 && frozenStep > 0.0) {
      frozenData = readAllLayersWithKnown01(texFrozen, frozenCoord, frozenIter, frozenStep);
    }
  }
  let frozenHasData = frozenIter >= 0.0 && frozenStep > 0.0;

  // ── Min-step-wins ──
  // The frozen and live textures live at different scales: a frozen step=1 is
  // zf/lzf times coarser per axis than a live step=1.  Scale frozen step to
  // live-resolution units so the comparison is fair.
  let scaleRatio = select(1.0, zf / lzf, lzf > 0.0);
  let effectiveFrozenStep = frozenStep * scaleRatio;

  if (liveHasData && frozenHasData) {
    if (liveStep <= effectiveFrozenStep) {
      return liveData;
    } else {
      return frozenData;
    }
  }

  if (liveHasData) {
    return liveData;
  }

  if (frozenHasData) {
    return frozenData;
  }

  return makeEmpty();
}
`,Tn=async(t={},e)=>{let n;if(e.startsWith("data:")){const r=e.replace(/^data:.*?base64,/,"");let i;if(typeof Buffer=="function"&&typeof Buffer.from=="function")i=Buffer.from(r,"base64");else if(typeof atob=="function"){const a=atob(r);i=new Uint8Array(a.length);for(let o=0;o<a.length;o++)i[o]=a.charCodeAt(o)}else throw new Error("Cannot decode base64-encoded data URL");n=await WebAssembly.instantiate(i,t)}else{const r=await fetch(e),i=r.headers.get("Content-Type")||"";if("instantiateStreaming"in WebAssembly&&i.startsWith("application/wasm"))n=await WebAssembly.instantiateStreaming(r,t);else{const a=await r.arrayBuffer();n=await WebAssembly.instantiate(a,t)}}return n.instance.exports};class Te{static __wrap(e){const n=Object.create(Te.prototype);return n.__wbg_ptr=e,xt.register(n,n.__wbg_ptr,n),n}__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,xt.unregister(this),e}free(){const e=this.__destroy_into_raw();d.__wbg_blabufferinfo_free(e,0)}get count(){return d.__wbg_get_blabufferinfo_count(this.__wbg_ptr)>>>0}get level_count(){return d.__wbg_get_blabufferinfo_level_count(this.__wbg_ptr)>>>0}get levels_ptr(){return d.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr)>>>0}get ptr(){return d.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr)>>>0}set count(e){d.__wbg_set_blabufferinfo_count(this.__wbg_ptr,e)}set level_count(e){d.__wbg_set_blabufferinfo_level_count(this.__wbg_ptr,e)}set levels_ptr(e){d.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr,e)}set ptr(e){d.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr,e)}}Symbol.dispose&&(Te.prototype[Symbol.dispose]=Te.prototype.free);class at{__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,yt.unregister(this),e}free(){const e=this.__destroy_into_raw();d.__wbg_mandelbrotnavigator_free(e,0)}angle(e){d.mandelbrotnavigator_angle(this.__wbg_ptr,e)}compute_bla_reference_ptr(e){const n=d.mandelbrotnavigator_compute_bla_reference_ptr(this.__wbg_ptr,e);return Te.__wrap(n)}compute_reference_orbit_chunk(e,n){const r=d.mandelbrotnavigator_compute_reference_orbit_chunk(this.__wbg_ptr,e,n);return xe.__wrap(r)}compute_reference_orbit_ptr(e){const n=d.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr,e);return xe.__wrap(n)}get_approximation_mode(){return d.mandelbrotnavigator_get_approximation_mode(this.__wbg_ptr)}get_bla_epsilon(){return d.mandelbrotnavigator_get_bla_epsilon(this.__wbg_ptr)}get_params(){const e=d.mandelbrotnavigator_get_params(this.__wbg_ptr);var n=Ae(e[0],e[1]).slice();return d.__wbindgen_free(e[0],e[1]*4,4),n}get_reference_orbit_capacity(){return d.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr)>>>0}get_reference_orbit_len(){return d.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr)>>>0}get_reference_params(){const e=d.mandelbrotnavigator_get_reference_params(this.__wbg_ptr);var n=Ae(e[0],e[1]).slice();return d.__wbindgen_free(e[0],e[1]*4,4),n}constructor(e,n,r,i){const a=se(e,d.__wbindgen_malloc,d.__wbindgen_realloc),o=j,s=se(n,d.__wbindgen_malloc,d.__wbindgen_realloc),l=j,x=se(r,d.__wbindgen_malloc,d.__wbindgen_realloc),h=j,b=d.mandelbrotnavigator_new(a,o,s,l,x,h,i);return this.__wbg_ptr=b,yt.register(this,this.__wbg_ptr,this),this}origin(e,n){const r=se(e,d.__wbindgen_malloc,d.__wbindgen_realloc),i=j,a=se(n,d.__wbindgen_malloc,d.__wbindgen_realloc),o=j;d.mandelbrotnavigator_origin(this.__wbg_ptr,r,i,a,o)}pixel_to_complex(e,n,r,i){const a=d.mandelbrotnavigator_pixel_to_complex(this.__wbg_ptr,e,n,r,i);var o=Ae(a[0],a[1]).slice();return d.__wbindgen_free(a[0],a[1]*4,4),o}reference_origin(e,n){const r=se(e,d.__wbindgen_malloc,d.__wbindgen_realloc),i=j,a=se(n,d.__wbindgen_malloc,d.__wbindgen_realloc),o=j;d.mandelbrotnavigator_reference_origin(this.__wbg_ptr,r,i,a,o)}rotate(e){d.mandelbrotnavigator_rotate(this.__wbg_ptr,e)}rotate_direct(e){d.mandelbrotnavigator_rotate_direct(this.__wbg_ptr,e)}scale(e){const n=se(e,d.__wbindgen_malloc,d.__wbindgen_realloc),r=j;d.mandelbrotnavigator_scale(this.__wbg_ptr,n,r)}set_bla_epsilon(e){d.mandelbrotnavigator_set_bla_epsilon(this.__wbg_ptr,e)}step(){const e=d.mandelbrotnavigator_step(this.__wbg_ptr);var n=Ae(e[0],e[1]).slice();return d.__wbindgen_free(e[0],e[1]*4,4),n}translate(e,n){d.mandelbrotnavigator_translate(this.__wbg_ptr,e,n)}translate_direct(e,n){d.mandelbrotnavigator_translate_direct(this.__wbg_ptr,e,n)}use_bla(){d.mandelbrotnavigator_use_bla(this.__wbg_ptr)}use_perturbation(){d.mandelbrotnavigator_use_perturbation(this.__wbg_ptr)}zoom(e){d.mandelbrotnavigator_zoom(this.__wbg_ptr,e)}}Symbol.dispose&&(at.prototype[Symbol.dispose]=at.prototype.free);class xe{static __wrap(e){const n=Object.create(xe.prototype);return n.__wbg_ptr=e,wt.register(n,n.__wbg_ptr,n),n}__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,wt.unregister(this),e}free(){const e=this.__destroy_into_raw();d.__wbg_orbitbufferinfo_free(e,0)}get count(){return d.__wbg_get_orbitbufferinfo_count(this.__wbg_ptr)>>>0}get offset(){return d.__wbg_get_orbitbufferinfo_offset(this.__wbg_ptr)>>>0}get ptr(){return d.__wbg_get_orbitbufferinfo_ptr(this.__wbg_ptr)>>>0}set count(e){d.__wbg_set_orbitbufferinfo_count(this.__wbg_ptr,e)}set offset(e){d.__wbg_set_orbitbufferinfo_offset(this.__wbg_ptr,e)}set ptr(e){d.__wbg_set_orbitbufferinfo_ptr(this.__wbg_ptr,e)}}Symbol.dispose&&(xe.prototype[Symbol.dispose]=xe.prototype.free);function Cn(t,e){throw new Error(Ht(t,e))}function Bn(t){return Math.exp(t)}function Ln(){return Date.now()}function kn(t,e){return Ht(t,e)}function En(){const t=d.__wbindgen_externrefs,e=t.grow(4);t.set(0,void 0),t.set(e+0,void 0),t.set(e+1,null),t.set(e+2,!0),t.set(e+3,!1)}const xt=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(t=>d.__wbg_blabufferinfo_free(t,1));typeof FinalizationRegistry>"u"||new FinalizationRegistry(t=>d.__wbg_blalevel_free(t,1));typeof FinalizationRegistry>"u"||new FinalizationRegistry(t=>d.__wbg_blastep_free(t,1));const yt=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(t=>d.__wbg_mandelbrotnavigator_free(t,1));typeof FinalizationRegistry>"u"||new FinalizationRegistry(t=>d.__wbg_mandelbrotstep_free(t,1));const wt=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(t=>d.__wbg_orbitbufferinfo_free(t,1));function Ae(t,e){t=t>>>0;const n=An(),r=[];for(let i=t;i<t+4*e;i+=4)r.push(d.__wbindgen_externrefs.get(n.getUint32(i,!0)));return d.__externref_drop_slice(t,e),r}let ve=null;function An(){return(ve===null||ve.buffer.detached===!0||ve.buffer.detached===void 0&&ve.buffer!==d.memory.buffer)&&(ve=new DataView(d.memory.buffer)),ve}function Ht(t,e){return Pn(t>>>0,e)}let De=null;function Ue(){return(De===null||De.byteLength===0)&&(De=new Uint8Array(d.memory.buffer)),De}function se(t,e,n){if(n===void 0){const s=Re.encode(t),l=e(s.length,1)>>>0;return Ue().subarray(l,l+s.length).set(s),j=s.length,l}let r=t.length,i=e(r,1)>>>0;const a=Ue();let o=0;for(;o<r;o++){const s=t.charCodeAt(o);if(s>127)break;a[i+o]=s}if(o!==r){o!==0&&(t=t.slice(o)),i=n(i,r,r=o+t.length*3,1)>>>0;const s=Ue().subarray(i+o,i+r),l=Re.encodeInto(t,s);o+=l.written,i=n(i,r,o,1)>>>0}return j=o,i}let Ne=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0});Ne.decode();const Dn=0x7ff00000;let Xe=0;function Pn(t,e){return Xe+=e,Xe>=Dn&&(Ne=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0}),Ne.decode(),Xe=e),Ne.decode(Ue().subarray(t,t+e))}const Re=new TextEncoder;"encodeInto"in Re||(Re.encodeInto=function(t,e){const n=Re.encode(t);return e.set(n),{read:t.length,written:n.length}});let j=0,d;function In(t){d=t}URL=globalThis.URL;const Fn=await Tn({"./mandelbrot_bg.js":{__wbg_now_190933fa139cc119:Ln,__wbg_exp_a8d3fe1b16ee4e89:Bn,__wbg___wbindgen_throw_1506f2235d1bdba0:Cn,__wbindgen_init_externref_table:En,__wbindgen_cast_0000000000000001:kn}},fn),{memory:Gn,__wbg_blabufferinfo_free:On,__wbg_blalevel_free:Un,__wbg_blastep_free:Nn,__wbg_get_blabufferinfo_count:Vn,__wbg_get_blabufferinfo_level_count:Hn,__wbg_get_blabufferinfo_levels_ptr:Wn,__wbg_get_blabufferinfo_ptr:qn,__wbg_get_blastep_ax:Yn,__wbg_get_blastep_ay:Xn,__wbg_get_blastep_bx:$n,__wbg_get_blastep_by:jn,__wbg_get_blastep_radius_alpha:Zn,__wbg_get_blastep_radius_beta:Kn,__wbg_mandelbrotnavigator_free:Jn,__wbg_mandelbrotstep_free:Qn,__wbg_orbitbufferinfo_free:er,__wbg_set_blabufferinfo_count:tr,__wbg_set_blabufferinfo_level_count:nr,__wbg_set_blabufferinfo_levels_ptr:rr,__wbg_set_blabufferinfo_ptr:ir,__wbg_set_blastep_ax:ar,__wbg_set_blastep_ay:or,__wbg_set_blastep_bx:sr,__wbg_set_blastep_by:lr,__wbg_set_blastep_radius_alpha:cr,__wbg_set_blastep_radius_beta:ur,mandelbrotnavigator_angle:fr,mandelbrotnavigator_compute_bla_reference_ptr:dr,mandelbrotnavigator_compute_reference_orbit_chunk:hr,mandelbrotnavigator_compute_reference_orbit_ptr:pr,mandelbrotnavigator_get_approximation_mode:gr,mandelbrotnavigator_get_bla_epsilon:vr,mandelbrotnavigator_get_params:mr,mandelbrotnavigator_get_reference_orbit_capacity:_r,mandelbrotnavigator_get_reference_orbit_len:br,mandelbrotnavigator_get_reference_params:xr,mandelbrotnavigator_new:yr,mandelbrotnavigator_origin:wr,mandelbrotnavigator_pixel_to_complex:zr,mandelbrotnavigator_reference_origin:Sr,mandelbrotnavigator_rotate:Rr,mandelbrotnavigator_rotate_direct:Mr,mandelbrotnavigator_scale:Tr,mandelbrotnavigator_set_bla_epsilon:Cr,mandelbrotnavigator_step:Br,mandelbrotnavigator_translate:Lr,mandelbrotnavigator_translate_direct:kr,mandelbrotnavigator_use_bla:Er,mandelbrotnavigator_use_perturbation:Ar,mandelbrotnavigator_zoom:Dr,__wbg_get_mandelbrotstep_dx:Pr,__wbg_get_mandelbrotstep_dy:Ir,__wbg_get_mandelbrotstep_zx:Fr,__wbg_get_mandelbrotstep_zy:Gr,__wbg_set_blalevel__padding:Or,__wbg_set_blalevel_count:Ur,__wbg_set_blalevel_offset:Nr,__wbg_set_blalevel_skip:Vr,__wbg_set_mandelbrotstep_dx:Hr,__wbg_set_mandelbrotstep_dy:Wr,__wbg_set_mandelbrotstep_zx:qr,__wbg_set_mandelbrotstep_zy:Yr,__wbg_set_orbitbufferinfo_count:Xr,__wbg_set_orbitbufferinfo_offset:$r,__wbg_set_orbitbufferinfo_ptr:jr,__wbg_get_blalevel__padding:Zr,__wbg_get_blalevel_count:Kr,__wbg_get_blalevel_offset:Jr,__wbg_get_blalevel_skip:Qr,__wbg_get_orbitbufferinfo_count:ei,__wbg_get_orbitbufferinfo_offset:ti,__wbg_get_orbitbufferinfo_ptr:ni,__wbindgen_externrefs:ri,__externref_drop_slice:ii,__wbindgen_free:ai,__wbindgen_malloc:oi,__wbindgen_realloc:si,__wbindgen_start:Wt}=Fn,li=Object.freeze(Object.defineProperty({__proto__:null,__externref_drop_slice:ii,__wbg_blabufferinfo_free:On,__wbg_blalevel_free:Un,__wbg_blastep_free:Nn,__wbg_get_blabufferinfo_count:Vn,__wbg_get_blabufferinfo_level_count:Hn,__wbg_get_blabufferinfo_levels_ptr:Wn,__wbg_get_blabufferinfo_ptr:qn,__wbg_get_blalevel__padding:Zr,__wbg_get_blalevel_count:Kr,__wbg_get_blalevel_offset:Jr,__wbg_get_blalevel_skip:Qr,__wbg_get_blastep_ax:Yn,__wbg_get_blastep_ay:Xn,__wbg_get_blastep_bx:$n,__wbg_get_blastep_by:jn,__wbg_get_blastep_radius_alpha:Zn,__wbg_get_blastep_radius_beta:Kn,__wbg_get_mandelbrotstep_dx:Pr,__wbg_get_mandelbrotstep_dy:Ir,__wbg_get_mandelbrotstep_zx:Fr,__wbg_get_mandelbrotstep_zy:Gr,__wbg_get_orbitbufferinfo_count:ei,__wbg_get_orbitbufferinfo_offset:ti,__wbg_get_orbitbufferinfo_ptr:ni,__wbg_mandelbrotnavigator_free:Jn,__wbg_mandelbrotstep_free:Qn,__wbg_orbitbufferinfo_free:er,__wbg_set_blabufferinfo_count:tr,__wbg_set_blabufferinfo_level_count:nr,__wbg_set_blabufferinfo_levels_ptr:rr,__wbg_set_blabufferinfo_ptr:ir,__wbg_set_blalevel__padding:Or,__wbg_set_blalevel_count:Ur,__wbg_set_blalevel_offset:Nr,__wbg_set_blalevel_skip:Vr,__wbg_set_blastep_ax:ar,__wbg_set_blastep_ay:or,__wbg_set_blastep_bx:sr,__wbg_set_blastep_by:lr,__wbg_set_blastep_radius_alpha:cr,__wbg_set_blastep_radius_beta:ur,__wbg_set_mandelbrotstep_dx:Hr,__wbg_set_mandelbrotstep_dy:Wr,__wbg_set_mandelbrotstep_zx:qr,__wbg_set_mandelbrotstep_zy:Yr,__wbg_set_orbitbufferinfo_count:Xr,__wbg_set_orbitbufferinfo_offset:$r,__wbg_set_orbitbufferinfo_ptr:jr,__wbindgen_externrefs:ri,__wbindgen_free:ai,__wbindgen_malloc:oi,__wbindgen_realloc:si,__wbindgen_start:Wt,mandelbrotnavigator_angle:fr,mandelbrotnavigator_compute_bla_reference_ptr:dr,mandelbrotnavigator_compute_reference_orbit_chunk:hr,mandelbrotnavigator_compute_reference_orbit_ptr:pr,mandelbrotnavigator_get_approximation_mode:gr,mandelbrotnavigator_get_bla_epsilon:vr,mandelbrotnavigator_get_params:mr,mandelbrotnavigator_get_reference_orbit_capacity:_r,mandelbrotnavigator_get_reference_orbit_len:br,mandelbrotnavigator_get_reference_params:xr,mandelbrotnavigator_new:yr,mandelbrotnavigator_origin:wr,mandelbrotnavigator_pixel_to_complex:zr,mandelbrotnavigator_reference_origin:Sr,mandelbrotnavigator_rotate:Rr,mandelbrotnavigator_rotate_direct:Mr,mandelbrotnavigator_scale:Tr,mandelbrotnavigator_set_bla_epsilon:Cr,mandelbrotnavigator_step:Br,mandelbrotnavigator_translate:Lr,mandelbrotnavigator_translate_direct:kr,mandelbrotnavigator_use_bla:Er,mandelbrotnavigator_use_perturbation:Ar,mandelbrotnavigator_zoom:Dr,memory:Gn},Symbol.toStringTag,{value:"Module"}));In(li);Wt();class ci{video;stream=null;width;height;lastDrawTime=0;open=!1;constructor(e=1024,n=1024){this.width=e,this.height=n,this.video=document.createElement("video"),this.video.autoplay=!0,this.video.playsInline=!0,this.video.muted=!0,this.video.width=e,this.video.height=n}isOpen(){return this.open}async openWebcam(){if(!this.open)try{this.stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:this.width},height:{ideal:this.height}}}),this.video.srcObject=this.stream,await this.video.play(),this.width=this.video.videoWidth||this.width,this.height=this.video.videoHeight||this.height,this.open=!0}catch(e){this.stream=null,this.open=!1,console.warn("Webcam unavailable:",e)}}async drawWebGPUTexture(e,n){if(!this.open)return;const r=performance.now();if(r-this.lastDrawTime>15){if(this.video.readyState<HTMLMediaElement.HAVE_CURRENT_DATA)return;const i=Math.min(this.width,e.width),a=Math.min(this.height,e.height);n.queue.copyExternalImageToTexture({source:this.video},{texture:e},[i,a]),this.lastDrawTime=r}}closeWebcam(){this.stream&&(this.stream.getTracks().forEach(e=>e.stop()),this.stream=null),this.open=!1}}function we(t,e,n){t.prototype=e.prototype=n,n.constructor=t}function ke(t,e){var n=Object.create(t.prototype);for(var r in e)n[r]=e[r];return n}function ce(){}var he=.7,ye=1/he,_e="\\s*([+-]?\\d+)\\s*",Ce="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*",K="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*",ui=/^#([0-9a-f]{3,8})$/,fi=new RegExp(`^rgb\\(${_e},${_e},${_e}\\)$`),di=new RegExp(`^rgb\\(${K},${K},${K}\\)$`),hi=new RegExp(`^rgba\\(${_e},${_e},${_e},${Ce}\\)$`),pi=new RegExp(`^rgba\\(${K},${K},${K},${Ce}\\)$`),gi=new RegExp(`^hsl\\(${Ce},${K},${K}\\)$`),vi=new RegExp(`^hsla\\(${Ce},${K},${K},${Ce}\\)$`),zt={aliceblue:0xf0f8ff,antiquewhite:0xfaebd7,aqua:65535,aquamarine:8388564,azure:0xf0ffff,beige:0xf5f5dc,bisque:0xffe4c4,black:0,blanchedalmond:0xffebcd,blue:255,blueviolet:9055202,brown:0xa52a2a,burlywood:0xdeb887,cadetblue:6266528,chartreuse:8388352,chocolate:0xd2691e,coral:0xff7f50,cornflowerblue:6591981,cornsilk:0xfff8dc,crimson:0xdc143c,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:0xb8860b,darkgray:0xa9a9a9,darkgreen:25600,darkgrey:0xa9a9a9,darkkhaki:0xbdb76b,darkmagenta:9109643,darkolivegreen:5597999,darkorange:0xff8c00,darkorchid:0x9932cc,darkred:9109504,darksalmon:0xe9967a,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:0xff1493,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:0xb22222,floralwhite:0xfffaf0,forestgreen:2263842,fuchsia:0xff00ff,gainsboro:0xdcdcdc,ghostwhite:0xf8f8ff,gold:0xffd700,goldenrod:0xdaa520,gray:8421504,green:32768,greenyellow:0xadff2f,grey:8421504,honeydew:0xf0fff0,hotpink:0xff69b4,indianred:0xcd5c5c,indigo:4915330,ivory:0xfffff0,khaki:0xf0e68c,lavender:0xe6e6fa,lavenderblush:0xfff0f5,lawngreen:8190976,lemonchiffon:0xfffacd,lightblue:0xadd8e6,lightcoral:0xf08080,lightcyan:0xe0ffff,lightgoldenrodyellow:0xfafad2,lightgray:0xd3d3d3,lightgreen:9498256,lightgrey:0xd3d3d3,lightpink:0xffb6c1,lightsalmon:0xffa07a,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:0xb0c4de,lightyellow:0xffffe0,lime:65280,limegreen:3329330,linen:0xfaf0e6,magenta:0xff00ff,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:0xba55d3,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:0xc71585,midnightblue:1644912,mintcream:0xf5fffa,mistyrose:0xffe4e1,moccasin:0xffe4b5,navajowhite:0xffdead,navy:128,oldlace:0xfdf5e6,olive:8421376,olivedrab:7048739,orange:0xffa500,orangered:0xff4500,orchid:0xda70d6,palegoldenrod:0xeee8aa,palegreen:0x98fb98,paleturquoise:0xafeeee,palevioletred:0xdb7093,papayawhip:0xffefd5,peachpuff:0xffdab9,peru:0xcd853f,pink:0xffc0cb,plum:0xdda0dd,powderblue:0xb0e0e6,purple:8388736,rebeccapurple:6697881,red:0xff0000,rosybrown:0xbc8f8f,royalblue:4286945,saddlebrown:9127187,salmon:0xfa8072,sandybrown:0xf4a460,seagreen:3050327,seashell:0xfff5ee,sienna:0xa0522d,silver:0xc0c0c0,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:0xfffafa,springgreen:65407,steelblue:4620980,tan:0xd2b48c,teal:32896,thistle:0xd8bfd8,tomato:0xff6347,turquoise:4251856,violet:0xee82ee,wheat:0xf5deb3,white:0xffffff,whitesmoke:0xf5f5f5,yellow:0xffff00,yellowgreen:0x9acd32};we(ce,pt,{copy(t){return Object.assign(new this.constructor,this,t)},displayable(){return this.rgb().displayable()},hex:St,formatHex:St,formatHex8:mi,formatHsl:_i,formatRgb:Rt,toString:Rt});function St(){return this.rgb().formatHex()}function mi(){return this.rgb().formatHex8()}function _i(){return qt(this).formatHsl()}function Rt(){return this.rgb().formatRgb()}function pt(t){var e,n;return t=(t+"").trim().toLowerCase(),(e=ui.exec(t))?(n=e[1].length,e=parseInt(e[1],16),n===6?Mt(e):n===3?new F(e>>8&15|e>>4&240,e>>4&15|e&240,(e&15)<<4|e&15,1):n===8?Pe(e>>24&255,e>>16&255,e>>8&255,(e&255)/255):n===4?Pe(e>>12&15|e>>8&240,e>>8&15|e>>4&240,e>>4&15|e&240,((e&15)<<4|e&15)/255):null):(e=fi.exec(t))?new F(e[1],e[2],e[3],1):(e=di.exec(t))?new F(e[1]*255/100,e[2]*255/100,e[3]*255/100,1):(e=hi.exec(t))?Pe(e[1],e[2],e[3],e[4]):(e=pi.exec(t))?Pe(e[1]*255/100,e[2]*255/100,e[3]*255/100,e[4]):(e=gi.exec(t))?Bt(e[1],e[2]/100,e[3]/100,1):(e=vi.exec(t))?Bt(e[1],e[2]/100,e[3]/100,e[4]):zt.hasOwnProperty(t)?Mt(zt[t]):t==="transparent"?new F(NaN,NaN,NaN,0):null}function Mt(t){return new F(t>>16&255,t>>8&255,t&255,1)}function Pe(t,e,n,r){return r<=0&&(t=e=n=NaN),new F(t,e,n,r)}function gt(t){return t instanceof ce||(t=pt(t)),t?(t=t.rgb(),new F(t.r,t.g,t.b,t.opacity)):new F}function le(t,e,n,r){return arguments.length===1?gt(t):new F(t,e,n,r??1)}function F(t,e,n,r){this.r=+t,this.g=+e,this.b=+n,this.opacity=+r}we(F,le,ke(ce,{brighter(t){return t=t==null?ye:Math.pow(ye,t),new F(this.r*t,this.g*t,this.b*t,this.opacity)},darker(t){return t=t==null?he:Math.pow(he,t),new F(this.r*t,this.g*t,this.b*t,this.opacity)},rgb(){return this},clamp(){return new F(fe(this.r),fe(this.g),fe(this.b),We(this.opacity))},displayable(){return-.5<=this.r&&this.r<255.5&&-.5<=this.g&&this.g<255.5&&-.5<=this.b&&this.b<255.5&&0<=this.opacity&&this.opacity<=1},hex:Tt,formatHex:Tt,formatHex8:bi,formatRgb:Ct,toString:Ct}));function Tt(){return`#${ue(this.r)}${ue(this.g)}${ue(this.b)}`}function bi(){return`#${ue(this.r)}${ue(this.g)}${ue(this.b)}${ue((isNaN(this.opacity)?1:this.opacity)*255)}`}function Ct(){const t=We(this.opacity);return`${t===1?"rgb(":"rgba("}${fe(this.r)}, ${fe(this.g)}, ${fe(this.b)}${t===1?")":`, ${t})`}`}function We(t){return isNaN(t)?1:Math.max(0,Math.min(1,t))}function fe(t){return Math.max(0,Math.min(255,Math.round(t)||0))}function ue(t){return t=fe(t),(t<16?"0":"")+t.toString(16)}function Bt(t,e,n,r){return r<=0?t=e=n=NaN:n<=0||n>=1?t=e=NaN:e<=0&&(t=NaN),new Y(t,e,n,r)}function qt(t){if(t instanceof Y)return new Y(t.h,t.s,t.l,t.opacity);if(t instanceof ce||(t=pt(t)),!t)return new Y;if(t instanceof Y)return t;t=t.rgb();var e=t.r/255,n=t.g/255,r=t.b/255,i=Math.min(e,n,r),a=Math.max(e,n,r),o=NaN,s=a-i,l=(a+i)/2;return s?(e===a?o=(n-r)/s+(n<r)*6:n===a?o=(r-e)/s+2:o=(e-n)/s+4,s/=l<.5?a+i:2-a-i,o*=60):s=l>0&&l<1?0:o,new Y(o,s,l,t.opacity)}function ot(t,e,n,r){return arguments.length===1?qt(t):new Y(t,e,n,r??1)}function Y(t,e,n,r){this.h=+t,this.s=+e,this.l=+n,this.opacity=+r}we(Y,ot,ke(ce,{brighter(t){return t=t==null?ye:Math.pow(ye,t),new Y(this.h,this.s,this.l*t,this.opacity)},darker(t){return t=t==null?he:Math.pow(he,t),new Y(this.h,this.s,this.l*t,this.opacity)},rgb(){var t=this.h%360+(this.h<0)*360,e=isNaN(t)||isNaN(this.s)?0:this.s,n=this.l,r=n+(n<.5?n:1-n)*e,i=2*n-r;return new F($e(t>=240?t-240:t+120,i,r),$e(t,i,r),$e(t<120?t+240:t-120,i,r),this.opacity)},clamp(){return new Y(Lt(this.h),Ie(this.s),Ie(this.l),We(this.opacity))},displayable(){return(0<=this.s&&this.s<=1||isNaN(this.s))&&0<=this.l&&this.l<=1&&0<=this.opacity&&this.opacity<=1},formatHsl(){const t=We(this.opacity);return`${t===1?"hsl(":"hsla("}${Lt(this.h)}, ${Ie(this.s)*100}%, ${Ie(this.l)*100}%${t===1?")":`, ${t})`}`}}));function Lt(t){return t=(t||0)%360,t<0?t+360:t}function Ie(t){return Math.max(0,Math.min(1,t||0))}function $e(t,e,n){return(t<60?e+(n-e)*t/60:t<180?n:t<240?e+(n-e)*(240-t)/60:e)*255}const Yt=Math.PI/180,Xt=180/Math.PI,qe=18,$t=.96422,jt=1,Zt=.82521,Kt=4/29,be=6/29,Jt=3*be*be,xi=be*be*be;function Qt(t){if(t instanceof J)return new J(t.l,t.a,t.b,t.opacity);if(t instanceof oe)return en(t);t instanceof F||(t=gt(t));var e=Je(t.r),n=Je(t.g),r=Je(t.b),i=je((.2225045*e+.7168786*n+.0606169*r)/jt),a,o;return e===n&&n===r?a=o=i:(a=je((.4360747*e+.3850649*n+.1430804*r)/$t),o=je((.0139322*e+.0971045*n+.7141733*r)/Zt)),new J(116*i-16,500*(a-i),200*(i-o),t.opacity)}function st(t,e,n,r){return arguments.length===1?Qt(t):new J(t,e,n,r??1)}function J(t,e,n,r){this.l=+t,this.a=+e,this.b=+n,this.opacity=+r}we(J,st,ke(ce,{brighter(t){return new J(this.l+qe*(t??1),this.a,this.b,this.opacity)},darker(t){return new J(this.l-qe*(t??1),this.a,this.b,this.opacity)},rgb(){var t=(this.l+16)/116,e=isNaN(this.a)?t:t+this.a/500,n=isNaN(this.b)?t:t-this.b/200;return e=$t*Ze(e),t=jt*Ze(t),n=Zt*Ze(n),new F(Ke(3.1338561*e-1.6168667*t-.4906146*n),Ke(-.9787684*e+1.9161415*t+.033454*n),Ke(.0719453*e-.2289914*t+1.4052427*n),this.opacity)}}));function je(t){return t>xi?Math.pow(t,1/3):t/Jt+Kt}function Ze(t){return t>be?t*t*t:Jt*(t-Kt)}function Ke(t){return 255*(t<=.0031308?12.92*t:1.055*Math.pow(t,1/2.4)-.055)}function Je(t){return(t/=255)<=.04045?t/12.92:Math.pow((t+.055)/1.055,2.4)}function yi(t){if(t instanceof oe)return new oe(t.h,t.c,t.l,t.opacity);if(t instanceof J||(t=Qt(t)),t.a===0&&t.b===0)return new oe(NaN,0<t.l&&t.l<100?0:NaN,t.l,t.opacity);var e=Math.atan2(t.b,t.a)*Xt;return new oe(e<0?e+360:e,Math.sqrt(t.a*t.a+t.b*t.b),t.l,t.opacity)}function lt(t,e,n,r){return arguments.length===1?yi(t):new oe(t,e,n,r??1)}function oe(t,e,n,r){this.h=+t,this.c=+e,this.l=+n,this.opacity=+r}function en(t){if(isNaN(t.h))return new J(t.l,0,0,t.opacity);var e=t.h*Yt;return new J(t.l,Math.cos(e)*t.c,Math.sin(e)*t.c,t.opacity)}we(oe,lt,ke(ce,{brighter(t){return new oe(this.h,this.c,this.l+qe*(t??1),this.opacity)},darker(t){return new oe(this.h,this.c,this.l-qe*(t??1),this.opacity)},rgb(){return en(this).rgb()}}));var tn=-.14861,vt=1.78277,mt=-.29227,Ye=-.90649,Be=1.97294,kt=Be*Ye,Et=Be*vt,At=vt*mt-Ye*tn;function wi(t){if(t instanceof de)return new de(t.h,t.s,t.l,t.opacity);t instanceof F||(t=gt(t));var e=t.r/255,n=t.g/255,r=t.b/255,i=(At*r+kt*e-Et*n)/(At+kt-Et),a=r-i,o=(Be*(n-i)-mt*a)/Ye,s=Math.sqrt(o*o+a*a)/(Be*i*(1-i)),l=s?Math.atan2(o,a)*Xt-120:NaN;return new de(l<0?l+360:l,s,i,t.opacity)}function ct(t,e,n,r){return arguments.length===1?wi(t):new de(t,e,n,r??1)}function de(t,e,n,r){this.h=+t,this.s=+e,this.l=+n,this.opacity=+r}we(de,ct,ke(ce,{brighter(t){return t=t==null?ye:Math.pow(ye,t),new de(this.h,this.s,this.l*t,this.opacity)},darker(t){return t=t==null?he:Math.pow(he,t),new de(this.h,this.s,this.l*t,this.opacity)},rgb(){var t=isNaN(this.h)?0:(this.h+120)*Yt,e=+this.l,n=isNaN(this.s)?0:this.s*e*(1-e),r=Math.cos(t),i=Math.sin(t);return new F(255*(e+n*(tn*r+vt*i)),255*(e+n*(mt*r+Ye*i)),255*(e+n*(Be*r)),this.opacity)}}));const _t=t=>()=>t;function nn(t,e){return function(n){return t+n*e}}function zi(t,e,n){return t=Math.pow(t,n),e=Math.pow(e,n)-t,n=1/n,function(r){return Math.pow(t+r*e,n)}}function bt(t,e){var n=e-t;return n?nn(t,n>180||n<-180?n-360*Math.round(n/360):n):_t(isNaN(t)?e:t)}function Si(t){return(t=+t)==1?O:function(e,n){return n-e?zi(e,n,t):_t(isNaN(e)?n:e)}}function O(t,e){var n=e-t;return n?nn(t,n):_t(isNaN(t)?e:t)}const Ri=(function t(e){var n=Si(e);function r(i,a){var o=n((i=le(i)).r,(a=le(a)).r),s=n(i.g,a.g),l=n(i.b,a.b),x=O(i.opacity,a.opacity);return function(h){return i.r=o(h),i.g=s(h),i.b=l(h),i.opacity=x(h),i+""}}return r.gamma=t,r})(1);function Mi(t){return function(e,n){var r=t((e=ot(e)).h,(n=ot(n)).h),i=O(e.s,n.s),a=O(e.l,n.l),o=O(e.opacity,n.opacity);return function(s){return e.h=r(s),e.s=i(s),e.l=a(s),e.opacity=o(s),e+""}}}const Ti=Mi(bt);function rn(t,e){var n=O((t=st(t)).l,(e=st(e)).l),r=O(t.a,e.a),i=O(t.b,e.b),a=O(t.opacity,e.opacity);return function(o){return t.l=n(o),t.a=r(o),t.b=i(o),t.opacity=a(o),t+""}}function Ci(t){return function(e,n){var r=t((e=lt(e)).h,(n=lt(n)).h),i=O(e.c,n.c),a=O(e.l,n.l),o=O(e.opacity,n.opacity);return function(s){return e.h=r(s),e.c=i(s),e.l=a(s),e.opacity=o(s),e+""}}}const Bi=Ci(bt);function an(t){return(function e(n){n=+n;function r(i,a){var o=t((i=ct(i)).h,(a=ct(a)).h),s=O(i.s,a.s),l=O(i.l,a.l),x=O(i.opacity,a.opacity);return function(h){return i.h=o(h),i.s=s(h),i.l=l(Math.pow(h,n)),i.opacity=x(h),i+""}}return r.gamma=e,r})(1)}const Li=an(bt);an(O);const on=["palette","zebra","tessellation","shading","skybox","webcam","smoothness","stripeAverage","rotationMean","stripeRelief","directionCoherenceRelief","shadingLevel","specularPower","metallic","roughness","anisotropy","iridescencePower"],Le={palette:{label:"Color Blend",defaultValue:1,min:0,max:1,step:.01,unit:"",textureRow:0,textureChannel:3,uiGroup:"color"},zebra:{label:"Iteration Bands",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:1,textureChannel:0,uiGroup:"iteration"},tessellation:{label:"Image Blend",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:1,textureChannel:1,uiGroup:"imageSources"},shading:{label:"Lighting Blend",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:1,textureChannel:2,uiGroup:"lighting"},skybox:{label:"Reflection Blend",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:1,textureChannel:3,uiGroup:"lighting"},webcam:{label:"Webcam Blend",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:2,textureChannel:0,uiGroup:"imageSources"},smoothness:{label:"Smooth Iterations",defaultValue:1,min:0,max:1,step:.01,unit:"",textureRow:2,textureChannel:1,uiGroup:"iteration"},stripeAverage:{label:"Stripe Average",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:5,textureChannel:0,uiGroup:"iteration"},rotationMean:{label:"Direction Coherence",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:5,textureChannel:1,uiGroup:"iteration"},stripeRelief:{label:"Stripe Relief",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:5,textureChannel:2,uiGroup:"iteration"},directionCoherenceRelief:{label:"Direction Relief",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:5,textureChannel:3,uiGroup:"iteration"},shadingLevel:{label:"Light Intensity",defaultValue:0,min:0,max:3,step:.05,unit:"",textureRow:2,textureChannel:2,uiGroup:"lighting"},specularPower:{label:"Specular Strength",defaultValue:0,min:1,max:64,step:.5,unit:"",textureRow:2,textureChannel:3,uiGroup:"lighting"},metallic:{label:"Metalness",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:3,textureChannel:1,uiGroup:"lighting"},roughness:{label:"Roughness",defaultValue:0,min:.02,max:1,step:.01,unit:"",textureRow:3,textureChannel:2,uiGroup:"lighting"},anisotropy:{label:"Anisotropy",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:3,textureChannel:3,uiGroup:"lighting"},iridescencePower:{label:"Iridescence Strength",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:4,textureChannel:3,uiGroup:"iridescence"}},ut=Object.fromEntries(on.map(t=>[t,Le[t].defaultValue])),Qe={};for(const t of on){const e=Le[t].uiGroup;Qe[e]||(Qe[e]=[]),Qe[e].push(t)}const ki=["linear","gaussian","square","exponential"];function Ei(t){return typeof t=="string"&&ki.includes(t)}function et(t){return Ei(t.transferCurve)?t.transferCurve:"linear"}function tt(t,e){const n=Ai(e);switch(t){case"gaussian":{if(n<=.28)return 0;if(n>=.72)return 1;const a=(n-.28)/(.72-.28);return a*a*(3-2*a)}case"square":return n<=0?0:1;case"exponential":return(Math.exp(3*n)-1)/(Math.exp(3)-1);default:return n}}function ie(t,e){return t[e]??ut[e]}function Ai(t){return Math.max(0,Math.min(1,t))}const Di={lab:rn,rgb:Ri,hcl:Bi,hsl:Ti,cubehelix:Li},Dt=4096,Pi=6,ft=[];{const t=new Map;for(const e of Object.keys(Le)){const{textureRow:n}=Le[e];n===0||n===4||(t.has(n)||t.set(n,[]),t.get(n).push(e))}for(const[e,n]of t)ft.push({row:e,fields:n});ft.sort((e,n)=>e.row-n.row)}function Ii(t,e,n,r){const i=ie(t,n),a=ie(e,n);return i+(a-i)*r}function Pt(t,e){return t[e]??null}class It{points;interpolate;constructor(e,n="lab"){this.points=e.slice().sort((r,i)=>r.position-i.position),this.interpolate=Di[n]??rn}getColorAt(e){if(this.points.length===0)return"#000";if(e<=this.points[0].position)return this.points[0].color;if(e>=this.points[this.points.length-1].position)return this.points[this.points.length-1].color;for(let n=0;n<this.points.length-1;++n){const r=this.points[n],i=this.points[n+1];if(e>=r.position&&e<=i.position){const a=(e-r.position)/(i.position-r.position),o=tt(et(r),a),s=this.interpolate(r.color,i.color);return le(s(o)).formatHex()}}return"#000"}getEffectAt(e,n){if(this.points.length===0)return ut[n];if(e<=this.points[0].position)return ie(this.points[0],n);if(e>=this.points[this.points.length-1].position)return ie(this.points[this.points.length-1],n);for(let r=0;r<this.points.length-1;++r){const i=this.points[r],a=this.points[r+1];if(e>=i.position&&e<=a.position){const o=(e-i.position)/(a.position-i.position),s=tt(et(i),o);return Ii(i,a,n,s)}}return ut[n]}getIridescenceAt(e){if(this.points.length===0)return{color:"#000000",strength:0};if(this.points.length===1)return{color:this.points[0].iridescenceColor??this.points[0].color,strength:this.points[0].iridescenceColor?ie(this.points[0],"iridescencePower"):0};const n=this.points[0],r=this.points[this.points.length-1];if(e<=n.position)return{color:n.iridescenceColor??n.color,strength:n.iridescenceColor?ie(n,"iridescencePower"):0};if(e>=r.position)return{color:r.iridescenceColor??r.color,strength:r.iridescenceColor?ie(r,"iridescencePower"):0};for(let i=0;i<this.points.length-1;++i){const a=this.points[i],o=this.points[i+1];if(e>=a.position&&e<=o.position){const s=(e-a.position)/(o.position-a.position),l=tt(et(a),s),x=Pt(a,"iridescenceColor"),h=Pt(o,"iridescenceColor");if(!x&&!h)return{color:"#000000",strength:0};const b=x??a.color,y=h??o.color,f=x?ie(a,"iridescencePower"):0,g=h?ie(o,"iridescencePower"):0,c=f+(g-f)*l;return{color:le(this.interpolate(b,y)(l)).formatHex(),strength:c}}}return{color:"#000000",strength:0}}generateTexture(){const e=Dt,n=Pi,r=new Float32Array(e*n*4);for(let i=0;i<e;++i){const a=i/(e-1),o=le(this.getColorAt(a)),s=(0*e+i)*4;r[s]=(o.r??0)/255,r[s+1]=(o.g??0)/255,r[s+2]=(o.b??0)/255,r[s+3]=this.getEffectAt(a,"palette");for(const{row:b,fields:y}of ft){const f=(b*e+i)*4;for(const g of y){const c=Le[g].textureChannel;r[f+c]=this.getEffectAt(a,g)}}const l=this.getIridescenceAt(a),x=le(l.color),h=(4*e+i)*4;r[h]=(x.r??0)/255,r[h+1]=(x.g??0)/255,r[h+2]=(x.b??0)/255,r[h+3]=Math.max(0,Math.min(1,l.strength))}return{data:r,width:e,height:n}}generateThumbnailRow(){const e=Dt,n=new ImageData(e,1),r=n.data;for(let i=0;i<e;++i){const a=i/(e-1),o=le(this.getColorAt(a)),s=i*4;r[s]=Math.max(0,Math.min(255,Math.round(o.r??0))),r[s+1]=Math.max(0,Math.min(255,Math.round(o.g??0))),r[s+2]=Math.max(0,Math.min(255,Math.round(o.b??0))),r[s+3]=255}return n}}const me=8,Fi=4096,Gi=2,Fe=100,Oi=1e4,Ui=1e5,Ni=1e-6,Vi=5e6,nt=10,Ft=.25,rt=3,Hi=3,Ge=.001;function Wi(t){const e=Math.max(1,Math.floor(t));return 2**Math.floor(Math.log2(e))}function qi(t){return t.some(e=>(e.stripeAverage??0)>Ge||(e.rotationMean??0)>Ge||(e.stripeRelief??0)>Ge||(e.directionCoherenceRelief??0)>Ge)}const sn=new Float32Array(1),Yi=new Uint32Array(sn.buffer);function Xi(t){sn[0]=t;const e=Yi[0],n=e>>>16&32768,r=(e>>>23&255)-127,i=e&8388607;if(r>=16)return n|31744;if(r>=-14){const a=r+15;return n|a<<10|i>>>13}if(r>=-24){const a=-14-r;return n|(i|8388608)>>>13+a}return n}function Gt(t){const e=new Uint16Array(t.length);for(let n=0;n<t.length;++n)e[n]=Xi(t[n]);return e}class ae{snapshotCallback;snapshotDestWidth;canvas;device;queue;adapter;ctx;format;mandelbrotNavigator;rawTexture;rawArrayView;rawLayerViews=[];rawBrushTexture;rawBrushArrayView;rawBrushLayerViews=[];resolvedTexture;resolvedArrayView;resolvedLayerViews=[];frozenTexture;frozenArrayView;frozenLayerViews=[];pipelineMerge;bindGroupMerge;uniformBufferMerge;uniformBufferMandelbrot;uniformBufferColor;uniformBufferBrush;uniformBufferResolve;mandelbrotReferenceBuffer;mandelbrotBlaBuffer;mandelbrotBlaLevelBuffer;mandelbrotBlaBufferCapacity=0;mandelbrotBlaLevelBufferCapacity=0;pipelineBrush;bindGroupBrush;pipelineMandelbrot;bindGroupMandelbrot;pipelineResolve;bindGroupResolve;pipelineColor;bindGroupColor;pipelineCount;counterBuffer;counterReadbackSlots=[];counterReadbackWriteIndex=0;counterReadbackSequence=0;latestAppliedCounterReadbackSequence=0;counterReadbackGeneration=0;renderFrameSerial=0;lastCounterDispatchFrame=-rt;counterBindGroup;uniformBufferCount;unfinishedPixelCount=-1;activePixelCount=-1;_rafId=null;_drawFn=null;fps=0;isRendering=!1;gpuFrameTimeMs=0;smoothedGpuTimeMs=0;pendingGpuTiming=!1;refinementWasGated=!1;_fpsFrameCount=0;_fpsLastTime=0;neutralSize=0;shaderPassCompute;shaderPassColor;width=0;height=0;antialiasLevel;palettePeriod;previousMandelbrot;previousRenderOptions;previousOrbitMetricsEnabled;needRender=!0;orbitIncomplete=!1;prevGuardedMaxIter=0;currentGuardedMaxIter=0;currentMaxIterations=0;currentReferenceAvailableIter=0;currentReferenceRemainingIter=0;isReferenceValidating=!1;referenceResetSerial=0;referenceResetFlashUntil=0;currentBlaLevelCount=0;mandelbrotReference=new Float32Array(1e6);approximationMode="perturbation";blaEpsilon=Ni;referenceWorker;referenceJobId=0;referenceAvailableOrbitLen=0;referenceBlaReadyMaxIterations=0;referenceWorkerFailed=!1;referenceViewKey="";referenceWorkerCx="";referenceWorkerCy="";referenceOrbitWasReset=!1;pendingRefActive=!1;pendingRefCx="";pendingRefCy="";pendingRefOrbitBuffer=null;pendingRefOrbitLen=0;pendingRefMaxIterations=0;pendingRefBlaSteps=null;pendingRefBlaLevels=null;pendingRefBlaLevelCount=0;pendingRefBlaReadyMaxIterations=0;pendingRefReady=!1;skipRenderOnce=!1;prevFrameMandelbrot;clearHistoryNextFrame=!1;cumulativeShiftX=0;cumulativeShiftY=0;frozenPanShiftX=0;frozenPanShiftY=0;zoomMagnificationThreshold=16;zoomFactor=1;frozenScale=0;liveScale=0;liveZoomFactor=1;zoomReprojectionActive=!1;needFreezeSnapshot=!1;needMergeSnapshot=!1;mergeUniforms={zf:1,lzf:1,frozenShiftU:0,frozenShiftV:0,aspect:1,angle:0};frozenBaseShiftX=0;frozenBaseShiftY=0;referenceResetDuringZoom=!1;frozenAligned=!1;zoomingIn=!0;iterationBatchSize=Fe;tileTexture;tileTextureView;skyboxTexture;skyboxTextureView;tileTextureSourceKey;skyboxTextureSourceKey;paletteTexture;paletteTextureView;paletteSampler;skyboxSampler;webcamTexture;webcamTileTexture;webcamTextureView;webcamEnabled=!0;time=0;lastUpdateTime=0;dprMultiplier=1;targetFps=60;gpuLoadMultiplier=1;static _tileTexture;static _tileTextureView;static _skyboxTexture;static _skyboxTextureView;static _paletteTexture;static _paletteTextureView;constructor(e,n){this.canvas=e,this.shaderPassCompute=yn,this.shaderPassColor=wn,this.antialiasLevel=n.antialiasLevel,this.palettePeriod=n.palettePeriod,this.time=0}postReferenceWorker(e){return!this.referenceWorker||this.referenceWorkerFailed?!1:(this.referenceWorker.postMessage(e),!0)}markReferenceReset(e=this.currentMaxIterations){this.referenceResetSerial++,this.referenceResetFlashUntil=performance.now()+900,this.referenceAvailableOrbitLen=0,this.currentReferenceAvailableIter=0,this.currentReferenceRemainingIter=e,this.currentGuardedMaxIter=0,this.orbitIncomplete=!0}discardPendingReference(){this.pendingRefActive&&(this.pendingRefActive=!1,this.pendingRefCx="",this.pendingRefCy="",this.pendingRefOrbitBuffer=null,this.pendingRefOrbitLen=0,this.pendingRefMaxIterations=0,this.pendingRefBlaSteps=null,this.pendingRefBlaLevels=null,this.pendingRefBlaLevelCount=0,this.pendingRefBlaReadyMaxIterations=0,this.pendingRefReady=!1)}markPendingReferenceReady(){this.pendingRefActive&&(this.pendingRefReady=!0,this.isReferenceValidating=!1,this.needRender=!0)}applyPendingReferenceSwitch(){if(!this.pendingRefActive||!this.pendingRefReady)return;const e=this.pendingRefOrbitBuffer;if(e&&this.mandelbrotReferenceBuffer){const r=this.pendingRefOrbitLen*4,i=Math.min(r,e.length);this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer,0,e,0,i)}this.pendingRefBlaSteps&&this.mandelbrotBlaBuffer&&this.device.queue.writeBuffer(this.mandelbrotBlaBuffer,0,this.pendingRefBlaSteps,0,this.pendingRefBlaSteps.length),this.pendingRefBlaLevels&&this.mandelbrotBlaLevelBuffer&&this.device.queue.writeBuffer(this.mandelbrotBlaLevelBuffer,0,this.pendingRefBlaLevels,0,this.pendingRefBlaLevels.length),this.pendingRefBlaLevelCount>0&&(this.currentBlaLevelCount=this.pendingRefBlaLevelCount,this.referenceBlaReadyMaxIterations=this.pendingRefBlaReadyMaxIterations),this.referenceWorkerCx=this.pendingRefCx,this.referenceWorkerCy=this.pendingRefCy,this.mandelbrotNavigator.reference_origin(this.pendingRefCx,this.pendingRefCy),this.referenceAvailableOrbitLen=this.pendingRefOrbitLen;const n=Math.max(0,this.pendingRefOrbitLen-1);this.currentReferenceAvailableIter=n,this.currentReferenceRemainingIter=Math.max(0,this.currentMaxIterations-n),this.currentGuardedMaxIter=Math.min(this.currentMaxIterations,n),this.isReferenceValidating=!1,this.orbitIncomplete=!this.referenceWorkerFailed&&n<this.currentMaxIterations,this.referenceResetSerial++,this.referenceResetFlashUntil=performance.now()+900,this.referenceOrbitWasReset=!0,this.invalidateCounterReadback(),this.needRender=!0,this.skipRenderOnce=!0,this.discardPendingReference()}initializeReferenceWorker(){this.referenceWorker?.terminate(),this.referenceWorker=new Worker(new URL("/mandelbrot/presentation/assets/referenceWorker-DV0LnkSW.js",import.meta.url),{type:"module"}),this.referenceWorker.onmessage=e=>{this.handleReferenceWorkerMessage(e.data)},this.referenceWorker.onerror=e=>{console.error("Reference worker error:",e.message),this.referenceWorkerFailed=!0,this.orbitIncomplete=!1,this.currentBlaLevelCount=0},this.referenceWorkerFailed=!1,this.referenceAvailableOrbitLen=0,this.referenceBlaReadyMaxIterations=0,this.referenceJobId++}resetReferenceJob(e,n,r){this.discardPendingReference(),this.markReferenceReset(r),this.referenceBlaReadyMaxIterations=0,this.referenceOrbitWasReset=!0,this.isReferenceValidating=!0,this.currentBlaLevelCount=0,this.referenceViewKey="",this.referenceWorkerCx="",this.referenceWorkerCy="",this.referenceJobId++,this.postReferenceWorker({type:"reset",jobId:this.referenceJobId,cx:e.cx,cy:e.cy,scale:n.toString(),angle:e.angle,approximationMode:this.approximationMode,blaEpsilon:this.blaEpsilon,maxIterations:r})}syncReferenceWorkerView(e,n,r){const i=n.toString(),a=`${e.cx}
${e.cy}
${i}
${e.angle}
${r}`;a!==this.referenceViewKey&&(this.discardPendingReference(),this.referenceViewKey=a,this.isReferenceValidating=!0,this.orbitIncomplete=!0,this.needRender=!0,this.postReferenceWorker({type:"updateView",jobId:this.referenceJobId,cx:e.cx,cy:e.cy,scale:i,angle:e.angle,maxIterations:r}))}handleReferenceWorkerMessage(e){if(e.jobId===this.referenceJobId){if(e.type==="error"){console.error("Reference worker error:",e.message),this.referenceWorkerFailed=!0,this.orbitIncomplete=!1,this.currentBlaLevelCount=0;return}if(e.type==="referenceReset"){if(this.pendingRefActive){if(e.referenceCx===this.pendingRefCx&&e.referenceCy===this.pendingRefCy)return;this.discardPendingReference()}this.pendingRefActive=!0,this.pendingRefCx=e.referenceCx,this.pendingRefCy=e.referenceCy,this.pendingRefMaxIterations=e.maxIterations;const n=Math.max(e.maxIterations,this.currentMaxIterations)*4;this.pendingRefOrbitBuffer=new Float32Array(n),this.pendingRefOrbitLen=0,this.pendingRefBlaSteps=null,this.pendingRefBlaLevels=null,this.pendingRefBlaLevelCount=0,this.pendingRefBlaReadyMaxIterations=0;return}if(e.type==="orbitChunk"){const n=this.pendingRefActive&&e.referenceCx===this.pendingRefCx&&e.referenceCy===this.pendingRefCy;if(n){const i=this.pendingRefOrbitBuffer;if(i&&e.orbit.length>0){const o=e.offset*4,s=Math.min(e.orbit.length,i.length-o);s>0&&i.set(e.orbit.slice(0,s),o)}this.pendingRefOrbitLen=e.count;const a=Math.min(this.pendingRefMaxIterations,this.currentMaxIterations);this.pendingRefOrbitLen>=a&&this.markPendingReferenceReady()}else if(e.referenceCx!==this.referenceWorkerCx||e.referenceCy!==this.referenceWorkerCy){this.pendingRefActive&&this.discardPendingReference(),this.pendingRefActive=!0,this.pendingRefCx=e.referenceCx,this.pendingRefCy=e.referenceCy,this.pendingRefMaxIterations=e.maxIterations;const i=Math.max(e.maxIterations,this.currentMaxIterations)*4;this.pendingRefOrbitBuffer=new Float32Array(i),this.pendingRefOrbitLen=0,this.pendingRefBlaSteps=null,this.pendingRefBlaLevels=null,this.pendingRefBlaLevelCount=0,this.pendingRefBlaReadyMaxIterations=0;const a=this.pendingRefOrbitBuffer;if(a&&e.orbit.length>0){const s=e.offset*4,l=Math.min(e.orbit.length,a.length-s);l>0&&a.set(e.orbit.slice(0,l),s)}this.pendingRefOrbitLen=e.count;const o=Math.min(this.pendingRefMaxIterations,this.currentMaxIterations);this.pendingRefOrbitLen>=o&&this.markPendingReferenceReady(),this.isReferenceValidating=!1,this.needRender=!0;return}else e.offset===0&&this.referenceAvailableOrbitLen>0&&(this.markReferenceReset(),this.referenceOrbitWasReset=!0,this.currentBlaLevelCount=0,this.referenceBlaReadyMaxIterations=0,this.invalidateCounterReadback());n||(e.orbit.length>0&&this.mandelbrotReferenceBuffer?(this.referenceAvailableOrbitLen=e.count,this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer,e.offset*4*Float32Array.BYTES_PER_ELEMENT,e.orbit,0,e.orbit.length)):this.referenceAvailableOrbitLen=e.count);const r=Math.max(0,this.referenceAvailableOrbitLen-1);this.currentReferenceAvailableIter=r,this.currentReferenceRemainingIter=Math.max(0,this.currentMaxIterations-r),this.isReferenceValidating=!1,this.currentGuardedMaxIter=Math.min(this.currentMaxIterations,r),this.orbitIncomplete=!this.referenceWorkerFailed&&r<this.currentMaxIterations,this.needRender=!0;return}if(this.pendingRefActive){this.pendingRefBlaSteps=new Float32Array(e.steps),this.pendingRefBlaLevels=new Uint32Array(e.levels),this.pendingRefBlaLevelCount=e.levelCount,this.pendingRefBlaReadyMaxIterations=e.maxIterations;const n=Math.min(this.pendingRefMaxIterations,this.currentMaxIterations);this.pendingRefOrbitLen>=n&&this.markPendingReferenceReady();return}this.ensureBlaBufferCapacity(e.steps.length/6),this.ensureBlaLevelBufferCapacity(e.levelCount),e.steps.length>0&&this.mandelbrotBlaBuffer&&this.device.queue.writeBuffer(this.mandelbrotBlaBuffer,0,e.steps,0,e.steps.length),e.levels.length>0&&this.mandelbrotBlaLevelBuffer&&this.device.queue.writeBuffer(this.mandelbrotBlaLevelBuffer,0,e.levels,0,e.levels.length),this.currentBlaLevelCount=e.levelCount,this.referenceBlaReadyMaxIterations=e.maxIterations,this.isReferenceValidating=!1,this.clearHistoryNextFrame=!0,this.needRender=!0,this.invalidateCounterReadback()}}async initialize(e){if(this.mandelbrotNavigator=e,this.approximationMode=this.mandelbrotNavigator.get_approximation_mode()===1?"bla":"perturbation",this.blaEpsilon=this.mandelbrotNavigator.get_bla_epsilon(),this.initializeReferenceWorker(),!navigator.gpu)throw new Error("WebGPU non support\xe9");if(this.adapter=await navigator.gpu.requestAdapter(),!this.adapter)throw new Error("Adapter WebGPU introuvable");this.device=await this.adapter.requestDevice(),this.device.label="Engine Device",this.device.lost.then(s=>{console.warn(`GPU device lost: reason=${s.reason}, message=${s.message}`)}),this.queue=this.device.queue,this.queue.label="Engine Queue",this.ctx=this.canvas.getContext("webgpu"),this.format=navigator.gpu.getPreferredCanvasFormat(),this.ctx.configure({device:this.device,format:this.format,alphaMode:"opaque"});const[n,r]=await Promise.all([ae._tileTexture?Promise.resolve(ae._tileTexture):this._loadTexture(dn),ae._skyboxTexture?Promise.resolve(ae._skyboxTexture):this._loadTexture(hn)]);ae._tileTexture=n,this.tileTexture=n,this.tileTextureView=this.tileTexture.createView(),ae._skyboxTexture=r,this.skyboxTexture=r,this.skyboxTextureView=this.skyboxTexture.createView();const a=new It([]).generateTexture(),o=Gt(a.data);this.paletteTexture=this.device.createTexture({size:[a.width,a.height,1],format:"rgba16float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine PaletteTexture"}),this.device.queue.writeTexture({texture:this.paletteTexture},o.buffer,{bytesPerRow:a.width*8},[a.width,a.height]),this.paletteTextureView=this.paletteTexture.createView(),this.paletteSampler=this.device.createSampler({magFilter:"linear",minFilter:"linear",addressModeU:"repeat",addressModeV:"clamp-to-edge"}),this.skyboxSampler=this.device.createSampler({magFilter:"linear",minFilter:"linear",addressModeU:"repeat",addressModeV:"repeat"}),this.webcamTexture=new ci(1920,1080),this.webcamTileTexture=this.device.createTexture({size:[1920,1080,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT}),this.webcamTextureView=this.webcamTileTexture.createView(),this.uniformBufferMandelbrot=this.device.createBuffer({size:80,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Mandelbrot"}),this.uniformBufferColor=this.device.createBuffer({size:128,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Color"}),this.uniformBufferBrush=this.device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Brush"}),this.uniformBufferResolve=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Resolve"}),this.mandelbrotReferenceBuffer=this.device.createBuffer({size:4*1e6,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot Orbit ReferenceStorage Buffer"}),this.mandelbrotBlaBuffer=this.device.createBuffer({size:24,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot BLA Storage Buffer"}),this.mandelbrotBlaLevelBuffer=this.device.createBuffer({size:16,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot BLA Level Storage Buffer"}),this.mandelbrotBlaBufferCapacity=1,this.mandelbrotBlaLevelBufferCapacity=1,this.counterBuffer=this.device.createBuffer({size:8,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST,label:"Engine Counter Storage"}),this.counterReadbackSlots=Array.from({length:Hi},(s,l)=>({buffer:this.device.createBuffer({size:8,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,label:`Engine Counter Readback ${l}`}),pending:!1,sequence:0,generation:0})),this.uniformBufferCount=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Count"}),this.uniformBufferMerge=this.device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Merge"}),await this._createPipelines(),this.resize()}async _createPipelines(){const e=this.device.createShaderModule({code:zn,label:"Engine ShaderModule Brush"}),n=this.device.createShaderModule({code:this.shaderPassCompute,label:"Engine ShaderModule Compute"}),r=this.device.createShaderModule({code:Sn,label:"Engine ShaderModule Resolve"}),i=this.device.createShaderModule({code:this.shaderPassColor,label:"Engine ShaderModule Color"}),a=this.device.createShaderModule({code:Rn,label:"Engine ShaderModule Count"}),o=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Brush"}),s=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:3,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:4,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Mandelbrot"}),l=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Resolve"}),x=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:3,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:4,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:5,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:6,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:7,visibility:GPUShaderStage.FRAGMENT,sampler:{type:"filtering"}},{binding:8,visibility:GPUShaderStage.FRAGMENT,sampler:{type:"filtering"}}],label:"Engine BindGroupLayout Color"}),h=Array.from({length:me},()=>({format:"r32float"}));this.pipelineBrush=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[o]}),vertex:{module:e,entryPoint:"vs_main"},fragment:{module:e,entryPoint:"fs_main",targets:h},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Brush"}),this.pipelineMandelbrot=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[s]}),vertex:{module:n,entryPoint:"vs_main"},fragment:{module:n,entryPoint:"fs_main",targets:h},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Mandelbrot"}),this.pipelineResolve=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[l]}),vertex:{module:r,entryPoint:"vs_main"},fragment:{module:r,entryPoint:"fs_main",targets:h},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Resolve"}),this.pipelineColor=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[x]}),vertex:{module:i,entryPoint:"vs_main"},fragment:{module:i,entryPoint:"fs_main",targets:[{format:this.format}]},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Color"});const b=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}],label:"Engine BindGroupLayout Count"});this.pipelineCount=this.device.createComputePipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[b]}),compute:{module:a,entryPoint:"count_unfinished"},label:"Engine ComputePipeline Count"});const y=this.device.createShaderModule({code:Mn,label:"Engine ShaderModule Merge"}),f=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT|GPUShaderStage.VERTEX,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Merge"});this.pipelineMerge=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[f]}),vertex:{module:y,entryPoint:"vs_main"},fragment:{module:y,entryPoint:"fs_main",targets:h},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Merge"}),this.bindGroupBrush=void 0,this.bindGroupMandelbrot=void 0,this.bindGroupResolve=void 0,this.bindGroupColor=void 0,this.counterBindGroup=void 0,this.bindGroupMerge=void 0}rebuildMandelbrotBindGroup(){if(!this.pipelineMandelbrot||!this.rawBrushArrayView||!this.uniformBufferMandelbrot||!this.mandelbrotReferenceBuffer||!this.mandelbrotBlaBuffer||!this.mandelbrotBlaLevelBuffer)return;const e=this.pipelineMandelbrot.getBindGroupLayout(0);this.bindGroupMandelbrot=this.device.createBindGroup({layout:e,entries:[{binding:0,resource:{buffer:this.uniformBufferMandelbrot}},{binding:1,resource:{buffer:this.mandelbrotReferenceBuffer}},{binding:2,resource:{buffer:this.mandelbrotBlaBuffer}},{binding:3,resource:{buffer:this.mandelbrotBlaLevelBuffer}},{binding:4,resource:this.rawBrushArrayView}],label:"Engine BindGroup Mandelbrot"})}ensureBlaBufferCapacity(e){const n=Math.max(1,Math.ceil(e));n<=this.mandelbrotBlaBufferCapacity||(this.mandelbrotBlaBuffer?.destroy?.(),this.mandelbrotBlaBuffer=this.device.createBuffer({size:n*4*6,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot BLA Storage Buffer"}),this.mandelbrotBlaBufferCapacity=n,this.rebuildMandelbrotBindGroup())}ensureBlaLevelBufferCapacity(e){const n=Math.max(1,Math.ceil(e));n<=this.mandelbrotBlaLevelBufferCapacity||(this.mandelbrotBlaLevelBuffer?.destroy?.(),this.mandelbrotBlaLevelBuffer=this.device.createBuffer({size:n*4*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot BLA Level Storage Buffer"}),this.mandelbrotBlaLevelBufferCapacity=n,this.rebuildMandelbrotBindGroup())}invalidateCounterReadback(){this.unfinishedPixelCount=-1,this.activePixelCount=-1,this.counterReadbackGeneration++,this.lastCounterDispatchFrame=-rt}hasPendingCounterReadbackForCurrentGeneration(){return this.counterReadbackSlots.some(e=>e.pending&&e.generation===this.counterReadbackGeneration)}acquireCounterReadbackSlot(){const e=this.counterReadbackSlots.length;for(let n=0;n<e;n++){const r=(this.counterReadbackWriteIndex+n)%e,i=this.counterReadbackSlots[r];if(!i.pending)return this.counterReadbackWriteIndex=(r+1)%e,i}}scheduleCounterReadback(e,n,r){e.pending=!0,e.sequence=n,e.generation=r,(async()=>{let i=!1;try{await e.buffer.mapAsync(GPUMapMode.READ),i=!0;const a=new Uint32Array(e.buffer.getMappedRange()),o=a[0],s=a[1];this.applyCounterReadback(n,r,o,s)}catch{}finally{i&&e.buffer.unmap(),e.pending=!1}})()}applyCounterReadback(e,n,r,i){if(n!==this.counterReadbackGeneration||e<=this.latestAppliedCounterReadbackSequence)return;this.latestAppliedCounterReadbackSequence=e;const a=this.unfinishedPixelCount;this.unfinishedPixelCount=r,this.activePixelCount=i,a>nt&&r<=nt&&!this.clearHistoryNextFrame&&!this.zoomReprojectionActive&&(this.needFreezeSnapshot=!0)}scheduleGpuTiming(e){this.pendingGpuTiming||(this.pendingGpuTiming=!0,this.device.queue.onSubmittedWorkDone().then(()=>{this.pendingGpuTiming=!1,this.applyGpuFrameTiming(performance.now()-e)}).catch(()=>{this.pendingGpuTiming=!1}))}applyGpuFrameTiming(e){if(this.gpuFrameTimeMs=e,this.smoothedGpuTimeMs===0?this.smoothedGpuTimeMs=e:this.smoothedGpuTimeMs=this.smoothedGpuTimeMs*(1-Ft)+e*Ft,e<=0)return;const n=1e3/this.targetFps/e,r=this.iterationBatchSize*n,i=this.getEffectiveMaxBatchSize();this.iterationBatchSize=Math.round(Math.min(i,Math.max(Fe,this.iterationBatchSize*.7+r*.3)))}getEffectiveMaxBatchSize(){return this.approximationMode==="bla"&&this.currentBlaLevelCount>0?Ui:Oi}resize(){const e=(window.devicePixelRatio||1)*this.dprMultiplier,n=this.canvas.parentElement,r=n?.clientWidth||1,i=n?.clientHeight||1;this.width=Math.max(1,Math.round(r*e)),this.height=Math.max(1,Math.round(i*e));const a=this.device?.limits?.maxTextureDimension2D??8192;this.width=Math.min(this.width,a),this.height=Math.min(this.height,a),this.canvas.width=this.width,this.canvas.height=this.height,this.canvas.style.width=r+"px",this.canvas.style.height=i+"px",this.ctx.configure({device:this.device,format:this.format,alphaMode:"opaque"}),this.neutralSize=Math.ceil(Math.sqrt(this.width*this.width+this.height*this.height));const o=this.neutralSize;this.rawTexture?.destroy?.(),this.rawBrushTexture?.destroy?.(),this.resolvedTexture?.destroy?.(),this.frozenTexture?.destroy?.();const s=me,l=f=>{const g=this.device.createTexture({size:{width:o,height:o,depthOrArrayLayers:s},format:"r32float",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST,label:f}),c=g.createView({dimension:"2d-array",baseArrayLayer:0,arrayLayerCount:s,label:f+" ArrayView"}),v=[];for(let _=0;_<s;_++)v.push(g.createView({dimension:"2d",baseArrayLayer:_,arrayLayerCount:1,label:f+` Layer${_}`}));return{texture:g,arrayView:c,layerViews:v}},x=l("Engine RawTexture (A)");this.rawTexture=x.texture,this.rawArrayView=x.arrayView,this.rawLayerViews=x.layerViews;const h=l("Engine RawBrushTexture (B)");this.rawBrushTexture=h.texture,this.rawBrushArrayView=h.arrayView,this.rawBrushLayerViews=h.layerViews;const b=l("Engine ResolvedTexture");this.resolvedTexture=b.texture,this.resolvedArrayView=b.arrayView,this.resolvedLayerViews=b.layerViews;const y=l("Engine FrozenTexture");if(this.frozenTexture=y.texture,this.frozenArrayView=y.arrayView,this.frozenLayerViews=y.layerViews,this.zoomReprojectionActive=!1,this.zoomFactor=1,this.liveZoomFactor=1,this.frozenScale=0,this.liveScale=0,this.pipelineBrush){const f=this.pipelineBrush.getBindGroupLayout(0);this.bindGroupBrush=this.device.createBindGroup({layout:f,entries:[{binding:0,resource:{buffer:this.uniformBufferBrush}},{binding:1,resource:this.rawArrayView}],label:"Engine BindGroup Brush"})}if(this.pipelineMandelbrot&&this.rebuildMandelbrotBindGroup(),this.pipelineResolve){const f=this.pipelineResolve.getBindGroupLayout(0);this.bindGroupResolve=this.device.createBindGroup({layout:f,entries:[{binding:0,resource:{buffer:this.uniformBufferResolve}},{binding:1,resource:this.rawArrayView}],label:"Engine BindGroup Resolve"})}if(this.pipelineColor){const f=this.pipelineColor.getBindGroupLayout(0),g=[{binding:0,resource:{buffer:this.uniformBufferColor}},{binding:1,resource:this.resolvedArrayView},{binding:2,resource:this.tileTextureView},{binding:3,resource:this.skyboxTextureView},{binding:4,resource:this.webcamTextureView},{binding:5,resource:this.paletteTextureView},{binding:6,resource:this.frozenArrayView},{binding:7,resource:this.paletteSampler},{binding:8,resource:this.skyboxSampler}];this.bindGroupColor=this.device.createBindGroup({layout:f,entries:g,label:"Engine BindGroup Color"})}if(this.pipelineCount&&this.counterBuffer&&this.uniformBufferCount){const f=this.pipelineCount.getBindGroupLayout(0);this.counterBindGroup=this.device.createBindGroup({layout:f,entries:[{binding:0,resource:this.rawArrayView},{binding:1,resource:{buffer:this.counterBuffer}},{binding:2,resource:{buffer:this.uniformBufferCount}}],label:"Engine BindGroup Count"})}if(this.pipelineMerge&&this.uniformBufferMerge){const f=this.pipelineMerge.getBindGroupLayout(0);this.bindGroupMerge=this.device.createBindGroup({layout:f,entries:[{binding:0,resource:{buffer:this.uniformBufferMerge}},{binding:1,resource:this.resolvedArrayView},{binding:2,resource:this.rawBrushArrayView}],label:"Engine BindGroup Merge"})}this.prevFrameMandelbrot=void 0,this.previousMandelbrot=void 0,this.previousRenderOptions=void 0,this.needRender=!0,this.invalidateCounterReadback()}areObjectsEqual(e,n){return e===void 0||n===void 0?!1:JSON.stringify(e)===JSON.stringify(n)}areColorStopsEqual(e,n){if(e.length!==n.length)return!1;for(const[r,i]of e.entries()){const a=n[r];if(!a||JSON.stringify(i)!==JSON.stringify(a))return!1}return!0}setApproximationMode(e){e!==this.approximationMode&&(e==="bla"?this.mandelbrotNavigator.use_bla():this.mandelbrotNavigator.use_perturbation(),this.approximationMode=e,this.currentBlaLevelCount=0,this.postReferenceWorker({type:"setApproximationMode",jobId:this.referenceJobId,approximationMode:e}),this.clearHistoryNextFrame=!0,this.needRender=!0,this.invalidateCounterReadback())}getApproximationMode(){return this.approximationMode}setBlaEpsilon(e){const n=Math.max(Number.MIN_VALUE,e);n!==this.blaEpsilon&&(this.mandelbrotNavigator.set_bla_epsilon(n),this.blaEpsilon=n,this.postReferenceWorker({type:"setBlaEpsilon",jobId:this.referenceJobId,blaEpsilon:n}),this.approximationMode==="bla"&&(this.currentBlaLevelCount=0,this.clearHistoryNextFrame=!0,this.needRender=!0,this.invalidateCounterReadback()))}async update(e,n){const r=performance.now();this.lastUpdateTime===0&&(this.lastUpdateTime=r);const i=(r-this.lastUpdateTime)/1e3;if(this.time+=i,this.lastUpdateTime=r,this.pendingRefReady){this.applyPendingReferenceSwitch();return}const a=this.mandelbrotNavigator.get_approximation_mode()===1?"bla":"perturbation",o=this.mandelbrotNavigator.get_bla_epsilon();(a!==this.approximationMode||o!==this.blaEpsilon)&&(this.approximationMode=a,this.blaEpsilon=o,this.currentBlaLevelCount=0,this.postReferenceWorker({type:"setApproximationMode",jobId:this.referenceJobId,approximationMode:a}),this.postReferenceWorker({type:"setBlaEpsilon",jobId:this.referenceJobId,blaEpsilon:o}),this.clearHistoryNextFrame=!0,this.needRender=!0,this.invalidateCounterReadback());const s=!this.areObjectsEqual(e,this.previousMandelbrot),l=!this.areObjectsEqual(n,this.previousRenderOptions),x=n.stripeFrequency!==this.previousRenderOptions?.stripeFrequency,h=qi(n.colorStops),b=this.previousOrbitMetricsEnabled!==void 0&&h!==this.previousOrbitMetricsEnabled,y=x&&h;this.needRender=this.needRender||s||l,(s||y||b)&&this.invalidateCounterReadback(),(y||b)&&(this.clearHistoryNextFrame=!0),this.previousOrbitMetricsEnabled=h,n.colorStops.some(R=>(R.webcam??0)>0)?(await this.updateWebcamTexture(),this.needRender=!0):this.webcamTexture?.closeWebcam(),n.activateAnimate&&(this.needRender=!0);const g=this.width/Math.max(1,this.height);let c=this.previousMandelbrot?.scale||1/e.scale;c<1&&(c=1/c),c=Math.sqrt(c)-1;const v=this.referenceOrbitWasReset&&!!this.prevFrameMandelbrot;this.referenceOrbitWasReset=!1;const _=!this.prevFrameMandelbrot||v,E=!!this.prevFrameMandelbrot&&this.prevFrameMandelbrot.mu!==e.mu,P=this.zoomReprojectionActive&&_&&!E;(_||E)&&(this.clearHistoryNextFrame=!0,P?this.referenceResetDuringZoom=!0:(this.zoomReprojectionActive=!1,this.zoomFactor=1,this.liveZoomFactor=1,this.liveScale=0,this.frozenBaseShiftX=0,this.frozenBaseShiftY=0,this.frozenPanShiftX=0,this.frozenPanShiftY=0,this.referenceResetDuringZoom=!1),this.needFreezeSnapshot=v&&!P&&!E,this.needMergeSnapshot=!1);{const R=this.prevFrameMandelbrot&&this.prevFrameMandelbrot.scale!==e.scale;if(R&&!this.zoomReprojectionActive&&!_&&!E){this.zoomReprojectionActive=!0,this.frozenScale=this.prevFrameMandelbrot.scale,this.zoomingIn=e.scale<this.frozenScale,this.liveScale=this.zoomingIn?this.frozenScale/this.zoomMagnificationThreshold:this.frozenScale*this.zoomMagnificationThreshold;const M=Math.sqrt(g*g+1),N=e.dx-this.prevFrameMandelbrot.dx,ee=e.dy-this.prevFrameMandelbrot.dy;this.frozenBaseShiftX=Math.round(-(N*this.neutralSize)/(2*this.frozenScale*M)),this.frozenBaseShiftY=Math.round(ee*this.neutralSize/(2*this.frozenScale*M)),this.frozenPanShiftX=0,this.frozenPanShiftY=0,this.referenceResetDuringZoom=!1,this.needFreezeSnapshot=!0,this.clearHistoryNextFrame=!0}if(this.zoomReprojectionActive&&this.frozenScale>0?(this.zoomFactor=this.frozenScale/e.scale,this.liveZoomFactor=this.liveScale/e.scale,this.referenceResetDuringZoom&&!this.clearHistoryNextFrame&&(this.referenceResetDuringZoom=!1),(this.zoomingIn?this.zoomFactor>=this.zoomMagnificationThreshold:this.zoomFactor<=1/this.zoomMagnificationThreshold)&&!this.referenceResetDuringZoom&&(this.needFreezeSnapshot=!0,this.clearHistoryNextFrame=!0,this.frozenScale=this.liveScale,this.frozenBaseShiftX=0,this.frozenBaseShiftY=0,this.frozenPanShiftX=0,this.frozenPanShiftY=0,this.liveScale=this.zoomingIn?e.scale/this.zoomMagnificationThreshold:e.scale*this.zoomMagnificationThreshold,this.zoomFactor=this.frozenScale/e.scale,this.liveZoomFactor=this.liveScale/e.scale)):this.zoomReprojectionActive||(this.zoomFactor=1,this.liveZoomFactor=1,this.liveScale=0),this.zoomReprojectionActive&&!R&&this.prevFrameMandelbrot&&this.prevFrameMandelbrot.scale===e.scale){const M=this.width/Math.max(1,this.height);this.mergeUniforms={zf:this.zoomFactor,lzf:this.liveZoomFactor,frozenShiftU:this.frozenScale>0?(this.frozenBaseShiftX+this.frozenPanShiftX*(this.liveScale/this.frozenScale))/this.neutralSize:0,frozenShiftV:this.frozenScale>0?-(this.frozenBaseShiftY+this.frozenPanShiftY*(this.liveScale/this.frozenScale))/this.neutralSize:0,aspect:M,angle:e.angle},this.needMergeSnapshot=!this.referenceResetDuringZoom,this.zoomReprojectionActive=!1,this.zoomFactor=1,this.liveZoomFactor=1,this.liveScale=0,this.frozenBaseShiftX=0,this.frozenBaseShiftY=0,this.frozenPanShiftX=0,this.frozenPanShiftY=0,this.referenceResetDuringZoom=!1,this.clearHistoryNextFrame=!0}}if(!this.areColorStopsEqual(n.colorStops,this.previousRenderOptions?.colorStops||[])||n.interpolationMode!==this.previousRenderOptions?.interpolationMode){const M=new It(n.colorStops,n.interpolationMode).generateTexture(),N=Gt(M.data);this.device.queue.writeTexture({texture:this.paletteTexture},N.buffer,{bytesPerRow:M.width*8},[M.width,M.height]),this.needRender=!0}const D=Math.sin(e.angle),S=Math.cos(e.angle),C=Math.hypot(Math.cos(n.lightAngle),Math.sin(n.lightAngle),1.85),G=new Float32Array([n.palettePeriod,n.paletteOffset,c,this.time,g,e.angle,n.activateAnimate?1:0,e.mu,this.zoomFactor,this.zoomReprojectionActive||this.frozenAligned||this.needFreezeSnapshot?1:0,this.liveZoomFactor,this.zoomReprojectionActive&&this.frozenScale>0?(this.frozenBaseShiftX+this.frozenPanShiftX*(this.liveScale/this.frozenScale))/this.neutralSize:0,this.zoomReprojectionActive&&this.frozenScale>0?-(this.frozenBaseShiftY+this.frozenPanShiftY*(this.liveScale/this.frozenScale))/this.neutralSize:0,n.tessellationLevel,n.displacementAmount,n.animationSpeed,e.epsilon,n.ambientOcclusionStrength,n.microBumpStrength,n.clearcoatStrength,n.subsurfaceStrength,n.reliefDepth,n.localShadowStrength,n.lightAngle,n.varnishStrength,Math.log(e.mu),D,S,Math.cos(n.lightAngle)/C,Math.sin(n.lightAngle)/C,1.85/C,n.paletteMirror?1:0]);if(this.device.queue.writeBuffer(this.uniformBufferColor,0,G.buffer),!this.needsMoreFrames())return;const B=Math.ceil(e.maxIterations);this.currentMaxIterations=B;const L=this.zoomReprojectionActive&&this.liveScale>0?this.liveScale:e.scale;this.referenceViewKey||this.resetReferenceJob(e,L,B),this.syncReferenceWorkerView(e,L,B);const W=Math.max(0,this.referenceAvailableOrbitLen-1),U=Math.min(B,W);this.currentGuardedMaxIter=U,this.currentReferenceAvailableIter=W,this.currentReferenceRemainingIter=Math.max(0,B-W),this.orbitIncomplete=!this.referenceWorkerFailed&&W<B;const Q=W>=B,z=this.approximationMode==="bla"&&Q&&this.currentBlaLevelCount>0&&this.referenceBlaReadyMaxIterations>=U?1:0,T=z?this.currentBlaLevelCount:0,k=new Float32Array([e.dx,e.dy,e.mu,L,g,e.angle,this.iterationBatchSize,e.epsilon,n.antialiasLevel,0,U,Q?1:0,z,T,this.blaEpsilon,n.stripeFrequency,h?1:0,0,0,0]);this.device.queue.writeBuffer(this.uniformBufferMandelbrot,0,k.buffer),!this.zoomReprojectionActive&&!this.clearHistoryNextFrame&&Q&&this.prevGuardedMaxIter<B&&this.prevGuardedMaxIter>0&&(this.needFreezeSnapshot=!0,this.clearHistoryNextFrame=!0),this.prevGuardedMaxIter=U,this.previousMandelbrot=structuredClone(e),this.previousRenderOptions=structuredClone(n)}async render(){if(this.skipRenderOnce){this.skipRenderOnce=!1;return}if(!this.needsMoreFrames()||!this.pipelineBrush||!this.pipelineMandelbrot||!this.pipelineResolve||!this.pipelineColor||!this.bindGroupBrush||!this.bindGroupMandelbrot||!this.bindGroupResolve||!this.bindGroupColor||!this.previousMandelbrot)return;const e=this.width/Math.max(1,this.height),n=Wi(Fi),r=n,i=this.clearHistoryNextFrame?1:0;this.clearHistoryNextFrame&&this.invalidateCounterReadback();const a=++this.renderFrameSerial;let o=0,s=0;if(!this.clearHistoryNextFrame&&this.prevFrameMandelbrot){const z=this.previousMandelbrot.dx-this.prevFrameMandelbrot.dx,T=this.previousMandelbrot.dy-this.prevFrameMandelbrot.dy,k=this.neutralSize,R=Math.sqrt(e*e+1),M=this.zoomReprojectionActive&&this.liveScale>0?this.liveScale:this.previousMandelbrot.scale;o=-(z*k)/(2*M*R),s=T*k/(2*M*R)}const l=Math.round(o),x=Math.round(s),h=l!==0||x!==0;this.clearHistoryNextFrame?(this.cumulativeShiftX=0,this.cumulativeShiftY=0):(this.cumulativeShiftX+=l,this.cumulativeShiftY+=x,this.zoomReprojectionActive&&(this.frozenPanShiftX+=l,this.frozenPanShiftY+=x),h&&(this.frozenAligned=!1)),h&&!this.zoomReprojectionActive&&(this.needFreezeSnapshot=!1);const b=(this.cumulativeShiftX%r+r)%r,y=(this.cumulativeShiftY%r+r)%r,f=this.hasPendingCounterReadbackForCurrentGeneration(),g=!f&&(this.clearHistoryNextFrame||this.activePixelCount<0||this.iterationBatchSize>Fe||this.activePixelCount<Vi*this.gpuLoadMultiplier);g&&this.refinementWasGated&&(this.iterationBatchSize=Fe),this.refinementWasGated=!g;const c=g?1:0,v=new Float32Array([e,this.previousMandelbrot.angle,i,n,r,o,s,this.previousMandelbrot.mu,b,y,this.zoomReprojectionActive?Gi:0,c]);this.device.queue.writeBuffer(this.uniformBufferBrush,0,v.buffer);const _=new Float32Array([this.previousMandelbrot.mu,b,y]);this.device.queue.writeBuffer(this.uniformBufferResolve,0,_.buffer);const P=!f&&(this.unfinishedPixelCount<0||this.activePixelCount<0||a-this.lastCounterDispatchFrame>=rt)?this.acquireCounterReadbackSlot():void 0;let D;const S=this.device.createCommandEncoder();if(this.needMergeSnapshot&&this.pipelineMerge&&this.bindGroupMerge&&this.resolvedTexture&&this.frozenTexture&&this.rawBrushTexture){const z=this.neutralSize;S.copyTextureToTexture({texture:this.frozenTexture},{texture:this.rawBrushTexture},{width:z,height:z,depthOrArrayLayers:me});const T=new Float32Array([this.mergeUniforms.zf,this.mergeUniforms.lzf,this.mergeUniforms.frozenShiftU,this.mergeUniforms.frozenShiftV,this.mergeUniforms.aspect,this.mergeUniforms.angle]);this.device.queue.writeBuffer(this.uniformBufferMerge,0,T.buffer);const k=this.frozenLayerViews.map(M=>({view:M,clearValue:{r:0,g:0,b:0,a:0},loadOp:"clear",storeOp:"store"})),R=S.beginRenderPass({colorAttachments:k});R.setPipeline(this.pipelineMerge),R.setBindGroup(0,this.bindGroupMerge),R.draw(6,1,0,0),R.end(),this.needMergeSnapshot=!1,this.frozenAligned=!0,this.frozenPanShiftX=0,this.frozenPanShiftY=0}if(this.needFreezeSnapshot&&this.resolvedTexture&&this.frozenTexture){const z=me,T=this.neutralSize;S.copyTextureToTexture({texture:this.resolvedTexture},{texture:this.frozenTexture},{width:T,height:T,depthOrArrayLayers:z}),this.needFreezeSnapshot=!1,this.frozenAligned=!0,this.frozenPanShiftX=0,this.frozenPanShiftY=0,this.zoomReprojectionActive||(this.frozenBaseShiftX=0,this.frozenBaseShiftY=0)}const C=(z,T="clear")=>z.map(k=>({view:k,clearValue:{r:0,g:0,b:0,a:0},loadOp:T,storeOp:"store"})),G=S.beginRenderPass({colorAttachments:C(this.rawBrushLayerViews)});G.setPipeline(this.pipelineBrush),G.setBindGroup(0,this.bindGroupBrush),G.draw(6,1,0,0),G.end(),S.copyTextureToTexture({texture:this.rawBrushTexture},{texture:this.rawTexture},{width:this.neutralSize,height:this.neutralSize,depthOrArrayLayers:me});const B=S.beginRenderPass({colorAttachments:C(this.rawLayerViews,"load")});if(B.setPipeline(this.pipelineMandelbrot),B.setBindGroup(0,this.bindGroupMandelbrot),B.draw(6,1,0,0),B.end(),this.pipelineCount&&this.counterBindGroup&&this.counterBuffer&&P&&this.uniformBufferCount){const z=++this.counterReadbackSequence,T=this.counterReadbackGeneration,k=this.previousMandelbrot.mu;this.device.queue.writeBuffer(this.uniformBufferCount,0,new Float32Array([k,e,this.previousMandelbrot.angle])),S.clearBuffer(this.counterBuffer,0,8);const R=S.beginComputePass();R.setPipeline(this.pipelineCount),R.setBindGroup(0,this.counterBindGroup),R.dispatchWorkgroups(Math.ceil(this.neutralSize/16),Math.ceil(this.neutralSize/16)),R.end(),S.copyBufferToBuffer(this.counterBuffer,0,P.buffer,0,8),this.lastCounterDispatchFrame=a,D={slot:P,sequence:z,generation:T}}S.copyTextureToTexture({texture:this.rawTexture},{texture:this.resolvedTexture},{width:this.neutralSize,height:this.neutralSize,depthOrArrayLayers:me});const L=S.beginRenderPass({colorAttachments:C(this.resolvedLayerViews,"load")});L.setPipeline(this.pipelineResolve),L.setBindGroup(0,this.bindGroupResolve),L.draw(6,1,0,0),L.end();const W=this.ctx.getCurrentTexture().createView(),U=S.beginRenderPass({colorAttachments:[{view:W,clearValue:{r:1,g:1,b:1,a:1},loadOp:"clear",storeOp:"store"}]});U.setPipeline(this.pipelineColor),U.setBindGroup(0,this.bindGroupColor),U.draw(6,1,0,0),U.end();const Q=performance.now();if(this.device.queue.submit([S.finish()]),this.scheduleGpuTiming(Q),D&&this.scheduleCounterReadback(D.slot,D.sequence,D.generation),this.clearHistoryNextFrame=!1,this.prevFrameMandelbrot={...this.previousMandelbrot},this.needRender=!1,this.snapshotCallback){try{const z=this.snapshotDestWidth??256,T=Math.round(z*9/16),k=this.device.createTexture({size:[z,T,1],format:this.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});{const u=this.device.createCommandEncoder(),p=u.beginRenderPass({colorAttachments:[{view:k.createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}]});p.setPipeline(this.pipelineColor),p.setBindGroup(0,this.bindGroupColor),p.draw(6,1,0,0),p.end(),this.device.queue.submit([u.finish()])}const R=u=>u+255&-256,M=z*4,N=R(M),ee=N*T,te=this.device.createBuffer({size:ee,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});{const u=this.device.createCommandEncoder();u.copyTextureToBuffer({texture:k},{buffer:te,offset:0,bytesPerRow:N},{width:z,height:T,depthOrArrayLayers:1}),this.device.queue.submit([u.finish()])}await this.device.queue.onSubmittedWorkDone(),await te.mapAsync(GPUMapMode.READ);const pe=te.getMappedRange(),X=new Uint8ClampedArray(z*T*4),ne=new Uint8Array(pe);for(let u=0;u<T;++u)for(let p=0;p<z;++p){const m=u*N+p*4,w=(u*z+p)*4;X[w+0]=ne[m+2],X[w+1]=ne[m+1],X[w+2]=ne[m+0],X[w+3]=ne[m+3]}const V=document.createElement("canvas");V.width=z,V.height=T,V.getContext("2d").putImageData(new ImageData(X,z,T),0,0),te.unmap(),this.snapshotCallback(V.toDataURL("image/png"))}catch{this.snapshotCallback("")}this.snapshotCallback=void 0,this.snapshotDestWidth=void 0}}destroy(){this.stopRenderLoop(),this.postReferenceWorker({type:"dispose"}),this.referenceWorker?.terminate(),this.referenceWorker=void 0,this.rawTexture?.destroy?.(),this.rawBrushTexture?.destroy?.(),this.resolvedTexture?.destroy?.(),this.frozenTexture?.destroy?.(),this.mandelbrotReferenceBuffer?.destroy?.(),this.mandelbrotBlaBuffer?.destroy?.(),this.mandelbrotBlaLevelBuffer?.destroy?.(),this.uniformBufferMandelbrot?.destroy?.(),this.uniformBufferColor?.destroy?.(),this.uniformBufferBrush?.destroy?.(),this.uniformBufferResolve?.destroy?.(),this.counterBuffer?.destroy?.();for(const e of this.counterReadbackSlots)e.buffer.destroy?.();this.counterReadbackSlots=[],this.uniformBufferCount?.destroy?.(),this.uniformBufferMerge?.destroy?.(),this.webcamTexture?.closeWebcam(),this.webcamTileTexture?.destroy?.(),this.paletteTexture?.destroy?.()}needsMoreFrames(){let e="";return this.needRender?e="needRender":this.snapshotCallback?e="snapshot":this.zoomReprojectionActive?e="zoomActive":this.clearHistoryNextFrame?e="clearHistory":this.needFreezeSnapshot?e="freezeSnapshot":this.needMergeSnapshot?e="mergeSnapshot":this.isReferenceValidating?e="referenceValidating":this.orbitIncomplete?e="orbitIncomplete":(this.unfinishedPixelCount<0||this.unfinishedPixelCount>nt)&&(e=`unfinished=${this.unfinishedPixelCount}`),e!==""}getIterationBatchSize(){return this.iterationBatchSize}startRenderLoop(e){this._drawFn=e,this._rafId===null&&(this._rafId=requestAnimationFrame(async()=>this._loop()))}stopRenderLoop(){this._rafId!==null&&(cancelAnimationFrame(this._rafId),this._rafId=null),this._drawFn=null}async _loop(){if(this._drawFn){const e=this.needsMoreFrames();this.isRendering=e,await this._drawFn(),e&&this._fpsFrameCount++;const n=performance.now();this._fpsLastTime===0&&(this._fpsLastTime=n);const r=n-this._fpsLastTime;r>=1e3&&(this.fps=Math.round(this._fpsFrameCount*1e3/r),this._fpsFrameCount=0,this._fpsLastTime=n),this._rafId=requestAnimationFrame(async()=>this._loop())}else{this._rafId=null;return}}async updateTileTexture(e,n=e){if(this.tileTextureSourceKey===n)return;const r=await this._loadTexture(e);this.tileTexture?.destroy?.(),this.tileTexture=r,this.tileTextureView=this.tileTexture.createView(),this.tileTextureSourceKey=n,this.rebuildColorBindGroup(),this.needRender=!0}isTileTextureSourceCurrent(e){return this.tileTextureSourceKey===e}async updateSkyboxTexture(e,n=e){if(this.skyboxTextureSourceKey===n)return;const r=await this._loadTexture(e);this.skyboxTexture?.destroy?.(),this.skyboxTexture=r,this.skyboxTextureView=this.skyboxTexture.createView(),this.skyboxTextureSourceKey=n,this.rebuildColorBindGroup(),this.needRender=!0}isSkyboxTextureSourceCurrent(e){return this.skyboxTextureSourceKey===e}rebuildColorBindGroup(){if(this.pipelineColor&&this.resolvedArrayView&&this.frozenArrayView){const e=this.pipelineColor.getBindGroupLayout(0);this.bindGroupColor=this.device.createBindGroup({layout:e,entries:[{binding:0,resource:{buffer:this.uniformBufferColor}},{binding:1,resource:this.resolvedArrayView},{binding:2,resource:this.tileTextureView},{binding:3,resource:this.skyboxTextureView},{binding:4,resource:this.webcamTextureView},{binding:5,resource:this.paletteTextureView},{binding:6,resource:this.frozenArrayView},{binding:7,resource:this.paletteSampler},{binding:8,resource:this.skyboxSampler}],label:"Engine BindGroup Color"})}}async _loadTexture(e){const n=new Image;n.src=e;try{await n.decode()}catch(a){throw console.warn("\xc9chec du chargement de la texture : "+e,a),a}const r=await createImageBitmap(n),i=this.device.createTexture({size:[r.width,r.height,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine LoadedTexture "+e});return this.device.queue.copyExternalImageToTexture({source:r},{texture:i},[r.width,r.height]),i}static ITER_PIXEL_LAYERS=[0,2,3,4,5];async readIterationDataAt(e,n,r,i){if(!this.resolvedTexture||!this.device)return null;const a=this.width/Math.max(1,this.height),o=this.previousMandelbrot?.angle??0,s=e/Math.max(1,r),l=1-n/Math.max(1,i),x=s*2-1,h=l*2-1,b=x*a,y=h,f=Math.sin(o),g=Math.cos(o),c=g*b-f*y,v=f*b+g*y,_=Math.sqrt(a*a+1),E=c/_,P=v/_,D=E*.5+.5,S=P*.5+.5,C=this.neutralSize,G=Math.floor(Math.max(0,Math.min(C-1,D*C))),B=Math.floor(Math.max(0,Math.min(C-1,(1-S)*C))),L=ae.ITER_PIXEL_LAYERS,W=1,U=4,z=(V=>V+255&-256)(W*U),T=z*L.length,k=this.device.createBuffer({size:T,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,label:"Engine IterPixel Readback"}),R=this.device.createCommandEncoder();for(let V=0;V<L.length;V++)R.copyTextureToBuffer({texture:this.resolvedTexture,origin:{x:G,y:B,z:L[V]}},{buffer:k,offset:z*V,bytesPerRow:z},{width:1,height:1,depthOrArrayLayers:1});this.device.queue.submit([R.finish()]),await k.mapAsync(GPUMapMode.READ);const M=new Float32Array(k.getMappedRange()),N=z/U,ee=M[0*N],te=M[1*N],pe=M[2*N],X=M[3*N],ne=M[4*N];return k.unmap(),k.destroy(),ee<0?null:{iter:ee,zx:te,zy:pe,derX:X,derY:ne}}async updateWebcamTexture(){try{await this.webcamTexture?.openWebcam(),this.webcamTexture?.isOpen()&&await this.webcamTexture?.drawWebGPUTexture(this.webcamTileTexture,this.device)}catch(e){console.warn("Webcam texture update failed:",e)}}async getSnapshotPng(e=256){return await new Promise(n=>{this.snapshotCallback=n,this.snapshotDestWidth=e,this.needRender=!0})}}let ji,Zi,Ki,Ji,Qi,Oe,Ot,ea,ta,na;$i=dt({__name:"Mandelbrot",props:Me({mu:{default:4},epsilon:{default:1e-5},colorStops:{default:()=>[{color:"#002500",position:0},{color:"#175b3d",position:.16},{color:"#ffceb6",position:.26},{color:"#edffff",position:.42},{color:"#ff8fbc",position:.7016397849462366},{color:"#a6003e",position:.8575},{color:"#100000",position:1}]},palettePeriod:{default:100},paletteOffset:{default:0},paletteMirror:{type:Boolean,default:!1},antialiasLevel:{default:1},activateAnimate:{type:Boolean,default:!1},dprMultiplier:{default:.5},maxIterationMultiplier:{default:.1},targetFps:{default:60},gpuLoadMultiplier:{default:1},interpolationMode:{default:"lab"},tessellationLevel:{default:0},displacementAmount:{default:0},animationSpeed:{default:1},ambientOcclusionStrength:{default:0},microBumpStrength:{default:0},clearcoatStrength:{default:0},subsurfaceStrength:{default:0},reliefDepth:{default:1},localShadowStrength:{default:0},lightAngle:{default:0},varnishStrength:{default:0},stripeFrequency:{default:8}},{cx:{default:"-1.9771995110313272619112808106831597"},cxModifiers:{},cy:{default:"0.0"},cyModifiers:{},scale:{default:"2.5"},scaleModifiers:{},angle:{default:0},angleModifiers:{}}),emits:Me(["ready"],["update:cx","update:cy","update:scale","update:angle"]),setup(t,{expose:e,emit:n}){const r=ht(null);let i=null,a=null,o,s=!1;const l=n,x=Z(t,"cx"),h=Z(t,"cy"),b=Z(t,"scale"),y=Z(t,"angle");Ee(()=>[x.value,h.value,b.value,y.value],([_,E,P,D],[S,C,G,B])=>{s||o&&(!_||!E||!P||((_!==S||E!==C)&&o.origin(_,E),P!==G&&o.scale(P),D!==B&&o.angle(Number(D))))},{flush:"sync"});const f=t;Ee(()=>f.dprMultiplier,_=>{a&&(a.dprMultiplier=_,v())}),Ee(()=>f.targetFps,_=>{a&&(a.targetFps=_)}),Ee(()=>f.gpuLoadMultiplier,_=>{a&&(a.gpuLoadMultiplier=_)});async function g(){if(!a||!o)return;const _=o.step();if(!_)return;const[E,P]=_,[D,S,C,G]=o.get_params();s=!0,x.value=D,h.value=S,b.value=C,y.value=parseFloat(G),await pn(),s=!1;const B=Math.min(Math.max(100,1e3*f.maxIterationMultiplier*Math.log2(1/parseFloat(C))),1e5);await a.update({cx:D,cy:S,dx:parseFloat(E),dy:parseFloat(P),mu:f.mu,scale:parseFloat(C),angle:parseFloat(G),maxIterations:B,epsilon:f.epsilon},{antialiasLevel:f.antialiasLevel,palettePeriod:f.palettePeriod,paletteOffset:f.paletteOffset,paletteMirror:f.paletteMirror,colorStops:gn(f.colorStops),interpolationMode:f.interpolationMode,activateAnimate:f.activateAnimate,tessellationLevel:f.tessellationLevel,displacementAmount:f.displacementAmount,animationSpeed:f.animationSpeed,ambientOcclusionStrength:f.ambientOcclusionStrength,microBumpStrength:f.microBumpStrength,clearcoatStrength:f.clearcoatStrength,subsurfaceStrength:f.subsurfaceStrength,reliefDepth:f.reliefDepth,localShadowStrength:f.localShadowStrength,lightAngle:f.lightAngle,varnishStrength:f.varnishStrength,stripeFrequency:f.stripeFrequency}),await a.render()}async function c(){if(r.value)return i=r.value,o=new at(x.value,h.value,b.value,Number(y.value)),o.origin(x.value,h.value),o.scale(b.value),o.angle(Number(y.value)),a=new ae(i,{antialiasLevel:f.antialiasLevel,palettePeriod:f.palettePeriod,paletteOffset:f.paletteOffset,paletteMirror:f.paletteMirror,colorStops:f.colorStops,interpolationMode:f.interpolationMode,activateAnimate:f.activateAnimate,tessellationLevel:f.tessellationLevel,displacementAmount:f.displacementAmount,animationSpeed:f.animationSpeed,ambientOcclusionStrength:f.ambientOcclusionStrength,microBumpStrength:f.microBumpStrength,clearcoatStrength:f.clearcoatStrength,subsurfaceStrength:f.subsurfaceStrength,reliefDepth:f.reliefDepth,localShadowStrength:f.localShadowStrength,lightAngle:f.lightAngle,varnishStrength:f.varnishStrength,stripeFrequency:f.stripeFrequency}),a.dprMultiplier=f.dprMultiplier??1,a.targetFps=f.targetFps??60,a.gpuLoadMultiplier=f.gpuLoadMultiplier??1,a.initialize(o)}async function v(){if(!r.value||!a)return;const _=r.value.getBoundingClientRect();r.value.width=_.width,r.value.height=_.height,a.resize()}return Ut(async()=>{await c(),window.addEventListener("resize",v),await v(),a&&(l("ready",a),a.startRenderLoop(g))}),Nt(()=>{a?.stopRenderLoop(),window.removeEventListener("resize",v)}),e({getCanvas:()=>r.value,getEngine:()=>a,getNavigator:()=>o,translate:(_,E)=>o?.translate(_,E),translateDirect:(_,E)=>o?.translate_direct(_,E),rotate:_=>o?.rotate(_),angle:_=>o?.angle(_),zoom:_=>o?.zoom(_),step:()=>o?.step(),getParams:()=>o?.get_params(),drawOnce:async()=>g(),resize:async()=>v(),initialize:async()=>c(),useBla:()=>a?.setApproximationMode("bla"),usePerturbation:()=>a?.setApproximationMode("perturbation"),setApproximationMode:_=>a?.setApproximationMode(_),getApproximationMode:()=>a?.getApproximationMode(),setBlaEpsilon:_=>a?.setBlaEpsilon(_)}),(_,E)=>(Ve(),He("canvas",{ref_key:"canvasRef",ref:r},null,512))}});ji={class:"mobile-nav-controls"};Zi={key:0,class:"directional-controls"};Ki=dt({__name:"MobileNavigationControls",props:Me({mandelbrotRef:{}},{expanded:{type:Boolean,default:!1},expandedModifiers:{}}),emits:["update:expanded"],setup(t){const e=t,n=Z(t,"expanded"),r=ht(null);let i=null;const a=()=>{n.value=!n.value,n.value||s()},o=g=>{g.preventDefault(),g.stopPropagation(),a()},s=()=>{r.value=null,i!==null&&(clearInterval(i),i=null)},l=g=>{r.value=g;const c=.01,v=()=>{if(e.mandelbrotRef)switch(g){case"north":e.mandelbrotRef.translate(0,c);break;case"south":e.mandelbrotRef.translate(0,-c);break;case"west":e.mandelbrotRef.translate(-c,0);break;case"east":e.mandelbrotRef.translate(c,0);break}};v(),i=window.setInterval(v,16)},x=g=>{r.value=`rotate-${g}`;const c=.025,v=()=>{e.mandelbrotRef&&(g==="left"?e.mandelbrotRef.rotate(c):e.mandelbrotRef.rotate(-c))};v(),i=window.setInterval(v,16)},h=g=>{r.value=`zoom-${g}`;const c=.97,v=()=>{e.mandelbrotRef&&(g==="in"?e.mandelbrotRef.zoom(c):e.mandelbrotRef.zoom(1/c))};v(),i=window.setInterval(v,16)},b=(g,c)=>{g.preventDefault(),c()},y=g=>{g.preventDefault(),s()};function f(g){g.preventDefault(),g.stopPropagation(),window.location.href=new URL("./presentation/",window.location.href).href}return(g,c)=>(Ve(),He("div",ji,[A("button",{class:re(["nav-button compass-button",{active:n.value}]),onClick:a,onTouchend:o,"aria-label":"Toggle navigation"},[...c[16]||(c[16]=[A("i",{class:"fa-solid fa-compass fa-2x nav-icon"},null,-1)])],34),it(vn,{name:"fade"},{default:mn(()=>[n.value?(Ve(),He("div",Zi,[A("button",{class:re(["nav-button direction-button north",{active:r.value==="north"}]),onTouchstart:c[0]||(c[0]=v=>b(v,()=>l("north"))),onTouchend:y,onMousedown:c[1]||(c[1]=v=>l("north")),onMouseup:s,onMouseleave:s,"aria-label":"Move North"},[...c[17]||(c[17]=[A("i",{class:"fa-solid fa-arrow-up fa-3x nav-icon"},null,-1)])],34),A("button",{class:re(["nav-button direction-button south",{active:r.value==="south"}]),onTouchstart:c[2]||(c[2]=v=>b(v,()=>l("south"))),onTouchend:y,onMousedown:c[3]||(c[3]=v=>l("south")),onMouseup:s,onMouseleave:s,"aria-label":"Move South"},[...c[18]||(c[18]=[A("i",{class:"fa-solid fa-arrow-down fa-3x nav-icon"},null,-1)])],34),A("button",{class:re(["nav-button direction-button west",{active:r.value==="west"}]),onTouchstart:c[4]||(c[4]=v=>b(v,()=>l("west"))),onTouchend:y,onMousedown:c[5]||(c[5]=v=>l("west")),onMouseup:s,onMouseleave:s,"aria-label":"Move West"},[...c[19]||(c[19]=[A("i",{class:"fa-solid fa-arrow-left fa-3x nav-icon"},null,-1)])],34),A("button",{class:re(["nav-button direction-button east",{active:r.value==="east"}]),onTouchstart:c[6]||(c[6]=v=>b(v,()=>l("east"))),onTouchend:y,onMousedown:c[7]||(c[7]=v=>l("east")),onMouseup:s,onMouseleave:s,"aria-label":"Move East"},[...c[20]||(c[20]=[A("i",{class:"fa-solid fa-arrow-right fa-3x nav-icon"},null,-1)])],34),A("button",{class:re(["nav-button corner-button rotate-left",{active:r.value==="rotate-left"}]),onTouchstart:c[8]||(c[8]=v=>b(v,()=>x("left"))),onTouchend:y,onMousedown:c[9]||(c[9]=v=>x("left")),onMouseup:s,onMouseleave:s,"aria-label":"Rotate Left"},[...c[21]||(c[21]=[A("i",{class:"fa-solid fa-rotate-left fa-2x nav-icon"},null,-1)])],34),A("button",{class:re(["nav-button corner-button rotate-right",{active:r.value==="rotate-right"}]),onTouchstart:c[10]||(c[10]=v=>b(v,()=>x("right"))),onTouchend:y,onMousedown:c[11]||(c[11]=v=>x("right")),onMouseup:s,onMouseleave:s,"aria-label":"Rotate Right"},[...c[22]||(c[22]=[A("i",{class:"fa-solid fa-rotate-right fa-2x nav-icon"},null,-1)])],34),A("button",{class:re(["nav-button corner-button zoom-out",{active:r.value==="zoom-out"}]),onTouchstart:c[12]||(c[12]=v=>b(v,()=>h("out"))),onTouchend:y,onMousedown:c[13]||(c[13]=v=>h("out")),onMouseup:s,onMouseleave:s,"aria-label":"Zoom Out"},[...c[23]||(c[23]=[A("i",{class:"fa-solid fa-magnifying-glass-minus fa-2x nav-icon"},null,-1)])],34),A("button",{class:re(["nav-button corner-button zoom-in",{active:r.value==="zoom-in"}]),onTouchstart:c[14]||(c[14]=v=>b(v,()=>h("in"))),onTouchend:y,onMousedown:c[15]||(c[15]=v=>h("in")),onMouseup:s,onMouseleave:s,"aria-label":"Zoom In"},[...c[24]||(c[24]=[A("i",{class:"fa-solid fa-magnifying-glass-plus fa-2x nav-icon"},null,-1)])],34),A("button",{class:"presentation-button",onTouchend:bn(f,["prevent","stop"]),onClick:f,"aria-label":"Pr\xe9sentation"},[...c[25]||(c[25]=[A("i",{class:"fa-solid fa-display fa-fw",style:{"vertical-align":"middle","margin-right":"4px"}},null,-1),_n(" Pr\xe9sentation ",-1)])],32)])):xn("",!0)]),_:1})]))}});Ji=Vt(Ki,[["__scopeId","data-v-500c48c0"]]);Qi={style:{position:"relative",width:"100%",height:"100%"}};Oe=.01;Ot=.025;ea=300;ta=30;na=dt({__name:"MandelbrotController",props:Me({mu:{},epsilon:{},colorStops:{},antialiasLevel:{},palettePeriod:{},paletteOffset:{},paletteMirror:{type:Boolean},activateAnimate:{type:Boolean},dprMultiplier:{},maxIterationMultiplier:{},targetFps:{},gpuLoadMultiplier:{},interpolationMode:{},pickerMode:{type:Boolean},tessellationLevel:{},displacementAmount:{},animationSpeed:{},ambientOcclusionStrength:{},microBumpStrength:{},clearcoatStrength:{},subsurfaceStrength:{},reliefDepth:{},localShadowStrength:{},lightAngle:{},varnishStrength:{},stripeFrequency:{}},{cx:{},cxModifiers:{},cy:{},cyModifiers:{},scale:{},scaleModifiers:{},angle:{},angleModifiers:{},mobileNavExpanded:{type:Boolean,default:!1},mobileNavExpandedModifiers:{}}),emits:Me(["palettePick","pickerDone","engineReady"],["update:cx","update:cy","update:scale","update:angle","update:mobileNavExpanded"]),setup(t,{expose:e,emit:n}){const r=Z(t,"cx"),i=Z(t,"cy"),a=Z(t,"scale"),o=Z(t,"angle"),s=Z(t,"mobileNavExpanded"),l=t,x=n,h=ht(null),b={};e({getCanvas:L,getEngine:()=>h.value?.getEngine()??null});let y=!1,f=!1,g=0,c=0,v=0,_=0,E=0,P=!1,D=0,S=null,C=0,G=0,B=0;function L(){return h.value?.getCanvas()??null}function W(u){const p=L();if(!p)return{x:0,y:0,width:0,height:0};const m=p.getBoundingClientRect();return{x:u.clientX-m.left,y:u.clientY-m.top,width:m.width,height:m.height}}function U(u){const p=u.target?.tagName?.toLowerCase();p==="input"||p==="textarea"||p==="select"||u.target?.isContentEditable||(b[u.code]=!0)}function Q(u){b[u.code]=!1}function z(u){if(l.pickerMode){u.preventDefault();return}u.preventDefault();const p=.95;u.deltaY<0?h.value?.zoom(p):h.value?.zoom(1/p)}function T(u,p){const m=L();if(!m)return;const w=m.getBoundingClientRect(),I=u-w.left,$=p-w.top,H=w.width,q=w.height,ge=H/q,ze=(I-H/2)/H*2,Se=($-q/2)/q*2;h.value?.translateDirect(ze*ge,-Se)}function k(u){if(l.pickerMode){u.preventDefault();return}u.preventDefault(),T(u.clientX,u.clientY)}function R(u){if(l.pickerMode||u.touches.length!==0)return;const p=Date.now(),m=u.changedTouches[0];if(!m)return;const w=m.clientX,I=m.clientY;p-C<ea&&Math.hypot(w-G,I-B)<ta?(u.preventDefault(),T(w,I),C=0):(C=p,G=w,B=I)}function M(u){if(l.pickerMode){u.preventDefault(),N(u);return}if(u.button===2)f=!0;else{y=!0;const p=W(u);g=p.x,c=p.y}}async function N(u){try{const p=h.value?.getEngine();if(!p)return;const m=L();if(!m)return;const w=m.getBoundingClientRect(),I=u.clientX-w.left,$=u.clientY-w.top,H=await p.readIterationDataAt(I,$,w.width,w.height);if(!H)return;x("palettePick",H,u.clientX,u.clientY)}finally{x("pickerDone")}}function ee(u){if(l.pickerMode)return;const p=W(u);if(f){const q=L();if(!q)return;const ge=q.getBoundingClientRect(),ze=ge.width/2,Se=ge.height/2,ln=p.x,cn=p.y,un=Math.atan2(cn-Se,ln-ze);h.value?.angle(un);return}if(!y)return;const m=p.width,w=p.height,I=m/w,$=(p.x-g)/m*2,H=(p.y-c)/w*2;h.value?.translateDirect(-$*I,H),g=p.x,c=p.y}function te(u){l.pickerMode||(u.button===2?f=!1:y=!1)}function pe(u){if(l.pickerMode)return;const p=L();if(p){if(u.touches.length===1){y=!0;const m=u.touches[0],w=p.getBoundingClientRect();g=m.clientX-w.left,c=m.clientY-w.top}else if(u.touches.length===2){y=!1,P=!0;const[m,w]=u.touches;v=Math.hypot(w.clientX-m.clientX,w.clientY-m.clientY),D=v,_=Math.atan2(w.clientY-m.clientY,w.clientX-m.clientX);const I=h.value?.getParams();E=I?parseFloat(I[3]):0}}}function X(u){if(l.pickerMode)return;const p=L();if(p){if(y&&u.touches.length===1){const m=u.touches[0],w=p.getBoundingClientRect(),I=m.clientX-w.left,$=m.clientY-w.top,H=w.width,q=w.height,ge=H/q,ze=(I-g)/H*2,Se=($-c)/q*2;h.value?.translateDirect(-ze*ge,Se),g=I,c=$}else if(P&&u.touches.length===2){const[m,w]=u.touches,I=Math.hypot(w.clientX-m.clientX,w.clientY-m.clientY),$=Math.atan2(w.clientY-m.clientY,w.clientX-m.clientX),H=D/I;D=I,h.value?.zoom(H);const q=$-_;h.value?.angle(E+q)}}}function ne(u){u.touches.length===0&&(y=!1,P=!1)}function V(){if(!l.pickerMode){b.KeyW&&h.value?.translate(0,Oe),b.KeyS&&h.value?.translate(0,-Oe),b.KeyA&&h.value?.translate(-Oe,0),b.KeyD&&h.value?.translate(Oe,0),b.KeyQ&&h.value?.rotate(Ot),b.KeyE&&h.value?.rotate(-Ot);const u=.97;b.KeyR&&h.value?.zoom(u),b.KeyF&&h.value?.zoom(1/u)}S=window.setTimeout(V,16)}return Ut(async()=>{const u=L();u&&(window.addEventListener("keydown",U),window.addEventListener("keyup",Q),u.addEventListener("wheel",z,{passive:!1}),u.addEventListener("mousedown",M),u.addEventListener("dblclick",k),u.addEventListener("contextmenu",p=>p.preventDefault()),window.addEventListener("mousemove",ee),window.addEventListener("mouseup",te),u.addEventListener("touchstart",pe,{passive:!1}),u.addEventListener("touchmove",X,{passive:!1}),u.addEventListener("touchend",ne,{passive:!1}),u.addEventListener("touchend",R,{passive:!1}),V())}),Nt(()=>{S!==null&&clearTimeout(S);const u=L();window.removeEventListener("keydown",U),window.removeEventListener("keyup",Q),window.removeEventListener("mousemove",ee),window.removeEventListener("mouseup",te),u&&(u.removeEventListener("wheel",z),u.removeEventListener("mousedown",M),u.removeEventListener("dblclick",k),u.removeEventListener("contextmenu",p=>p.preventDefault()),u.removeEventListener("touchstart",pe),u.removeEventListener("touchmove",X),u.removeEventListener("touchend",ne),u.removeEventListener("touchend",R))}),(u,p)=>(Ve(),He("div",Qi,[it($i,{ref_key:"mandelbrotRef",ref:h,scale:a.value,"onUpdate:scale":p[0]||(p[0]=m=>a.value=m),angle:o.value,"onUpdate:angle":p[1]||(p[1]=m=>o.value=m),cx:r.value,"onUpdate:cx":p[2]||(p[2]=m=>r.value=m),cy:i.value,"onUpdate:cy":p[3]||(p[3]=m=>i.value=m),mu:l.mu,epsilon:l.epsilon,antialiasLevel:l.antialiasLevel,palettePeriod:l.palettePeriod,paletteMirror:l.paletteMirror,colorStops:l.colorStops,activateAnimate:l.activateAnimate,paletteOffset:l.paletteOffset,dprMultiplier:l.dprMultiplier,maxIterationMultiplier:l.maxIterationMultiplier,targetFps:l.targetFps,gpuLoadMultiplier:l.gpuLoadMultiplier,interpolationMode:l.interpolationMode,tessellationLevel:l.tessellationLevel,displacementAmount:l.displacementAmount,animationSpeed:l.animationSpeed,ambientOcclusionStrength:l.ambientOcclusionStrength,microBumpStrength:l.microBumpStrength,clearcoatStrength:l.clearcoatStrength,subsurfaceStrength:l.subsurfaceStrength,reliefDepth:l.reliefDepth,localShadowStrength:l.localShadowStrength,lightAngle:l.lightAngle,varnishStrength:l.varnishStrength,stripeFrequency:l.stripeFrequency,onReady:p[4]||(p[4]=m=>x("engineReady",m))},null,8,["scale","angle","cx","cy","mu","epsilon","antialiasLevel","palettePeriod","paletteMirror","colorStops","activateAnimate","paletteOffset","dprMultiplier","maxIterationMultiplier","targetFps","gpuLoadMultiplier","interpolationMode","tessellationLevel","displacementAmount","animationSpeed","ambientOcclusionStrength","microBumpStrength","clearcoatStrength","subsurfaceStrength","reliefDepth","localShadowStrength","lightAngle","varnishStrength","stripeFrequency"]),it(Ji,{"mandelbrot-ref":h.value,expanded:s.value,"onUpdate:expanded":p[5]||(p[5]=m=>s.value=m)},null,8,["mandelbrot-ref","expanded"])]))}});ia=Vt(na,[["__scopeId","data-v-e98705c9"]])})();export{ia as M,$i as _,__tla};