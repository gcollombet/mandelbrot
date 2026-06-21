import{aq as sr,d as Wt,ar as de,z as Ne,p as Bn,s as En,o as Ee,c as Ce,j as C,e as It,Q as lr,as as He,y as Be,U as cr,at as dr,J as Lt,T as ur,w as fr,_ as Cn,a6 as pr,a7 as hr}from"./framework.BnUxzQbl.js";let Po,wo;let __tla=(async()=>{const gr=`// Mandelbrot progressive-iteration shader.
//
// Layer layout (r32float texture_2d_array, 8 layers):
//   0 : sentinel / iteration count (integer part).
//       Negative  => sentinel (brush/resolve system).  -1 = compute request.
//       0         => inside the set (confirmed), or budget fully exhausted at globalMaxIter.
//       > 0       => escaped (|z|\xb2 >= 4) or budget-exhausted mid-progress (|z|\xb2 < 4).
//   1 : resolution step (1.0 = genuine pixel, >= 2 = resolve-copied from grid step)
//   2 : z.x   (real part of current z, for resuming / coloring)
//   3 : z.y   (imag part of current z, for resuming / coloring)
//   4 : escaped pixels: distance height, in-progress pixels: derivative angle
//   5 : escaped pixels: visual derivative angle, in-progress pixels: log(|derivative|)
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
  scaleExp: f32,        // floatexp deep path: shared base-2 exponent for scale & cx/cy
  aaOffsetX: f32,       // sub-pixel AA jitter, neutral-space units (0 = off)
  aaOffsetY: f32,
};

// floatexp deep-zoom threshold (base-2 exponent of scale). Below this the shader
// switches to the extended-exponent (fe) path, before f32 precision degrades
// approaching the underflow wall. Mirror of Engine.DEEP_EXP_THRESHOLD.
const DEEP_EXP: i32 = -116;
const LN2: f32 = 0.6931471805599453;

struct BlaStep {
  // floatexp form: a = (ax,ay)\xb72^ab_exp, b = (bx,by)\xb72^ab_exp,
  // alpha = radius_alpha\xb72^alpha_exp, beta = radius_beta (O(1)).
  ax: f32,
  ay: f32,
  bx: f32,
  by: f32,
  ab_exp: i32,
  radius_alpha: f32,
  alpha_exp: i32,
  radius_beta: f32,
};

struct BlaLevel {
  offset: u32,
  count: u32,
  skip: u32,
  // Largest radius_alpha among this level's entries; effective radii are
  // always <= radius_alpha, so |dz| above this bound rejects the whole level.
  maxRadius: f32,
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

// ── extended-exponent complex (floatexp) ───────────────────────────
// value = m \xb7 2^e, with one shared integer exponent for the whole complex.
// Used on the deep-zoom path where dz/dc fall below the f32 normal minimum.
// Renorm keeps max(|m.x|,|m.y|) ∈ [0.5,1) using the exact frexp/ldexp builtins,
// so no precision is lost to a transcendental (unlike the der log/exp rescale).
struct fe { m: vec2<f32>, e: i32 };

// Exponent assigned to a zero fe. Must be far below any real scale exponent so a
// zero never dominates fe_add (which would drop the other term): with e = 0 a
// fresh dz = 0 would swallow dc and the perturbation would never start.
const FE_ZERO_E: i32 = -1000000;

fn fe_renorm(v: fe) -> fe {
  let a = max(abs(v.m.x), abs(v.m.y));
  if (!(a > 0.0)) {
    return fe(vec2<f32>(0.0, 0.0), FE_ZERO_E); // zero (and NaN-guard)
  }
  let r = frexp(a);                    // a = r.fract \xb7 2^r.exp, r.fract ∈ [0.5,1)
  return fe(ldexp(v.m, vec2<i32>(-r.exp, -r.exp)), v.e + r.exp);
}

fn fe_from_vec(v: vec2<f32>, e: i32) -> fe {
  return fe_renorm(fe(v, e));
}

// v.m \xb7 2^v.e back to plain f32; tiny values flush to 0 (intended: a sub-f32 dz
// contributes nothing to an O(1) z = z_n + dz).
fn fe_to_vec(v: fe) -> vec2<f32> {
  return ldexp(v.m, vec2<i32>(v.e, v.e));
}

// complex multiply of two fe values
fn fe_cmul(a: fe, b: fe) -> fe {
  return fe_renorm(fe(cmul(a.m, b.m), a.e + b.e));
}

// complex multiply of an O(1) f32 complex by an fe (e.g. 2\xb7z_n \xb7 dz)
fn fe_cmul_f32(zf: vec2<f32>, b: fe) -> fe {
  return fe_renorm(fe(cmul(zf, b.m), b.e));
}

// add two fe values: align to the larger exponent, drop a term ≥24 below it
// (beyond the mantissa's least significant bit), then renormalize.
fn fe_add(a: fe, b: fe) -> fe {
  let d = a.e - b.e;
  if (d > 24) { return a; }
  if (d < -24) { return b; }
  if (d >= 0) {
    return fe_renorm(fe(a.m + ldexp(b.m, vec2<i32>(-d, -d)), a.e));
  }
  return fe_renorm(fe(ldexp(a.m, vec2<i32>(d, d)) + b.m, b.e));
}

fn fe_add3(a: fe, b: fe, c: fe) -> fe {
  return fe_add(fe_add(a, b), c);
}

// |v|\xb2 as a plain f32, flushing to 0 on underflow (used only to compare against
// an O(1) |z|\xb2 for the rebase test).
fn fe_mag2_f32(v: fe) -> f32 {
  return ldexp(dot(v.m, v.m), 2 * v.e);
}

const LOG_DER_ZERO: f32 = -80.0;

fn angle_wrap(a: f32) -> f32 {
  return atan2(sin(a), cos(a));
}

// ── derivative state: der = derM \xb7 exp(derS) ───────────────────────
// Cartesian mantissa + log scale.  The derivative recurrences
// (der' = 2\xb7z\xb7der + 1, and der' = der\xb7a + b for BLA blocks) run as plain
// multiply/adds on the mantissa; a log/exp pair is paid only when the
// mantissa leaves [1e-16, 1e16] (every ~25 iterations), instead of the
// ~10 transcendentals per iteration of the previous log-polar form.
// The storage format in layers 4/5 is unchanged: (angle, log magnitude),
// converted by der_to_polar on store and inverted on load.
//
// Cached alongside the state (recomputed only when derS changes):
//   derInvScale  = exp(-derS)   — the "+1" term expressed in mantissa space
//   epsThreshold = exp(logEpsilon - 2\xb7derS)
//                  so that dot(derM, derM) < epsThreshold ⇔ |der|\xb2 < epsilon

const DER_RENORM_HI: f32 = 1e16;
const DER_RENORM_LO: f32 = 1e-16;

fn der_refresh_cache(derM: ptr<function, vec2<f32>>, derS: ptr<function, f32>, derInvScale: ptr<function, f32>, epsThreshold: ptr<function, f32>, logEpsilon: f32) {
  // Rebase very small scales so the "+1" / "+b" terms cannot overflow the
  // mantissa (exp(-derS) stays <= e^40 ≈ 2.4e17).
  if (*derS < -40.0) {
    *derM = *derM * exp(max(*derS, -80.0));
    *derS = 0.0;
  }
  *derInvScale = exp(clamp(-(*derS), -80.0, 80.0));
  *epsThreshold = exp(clamp(logEpsilon - 2.0 * (*derS), -87.0, 87.0));
}

fn der_renormalize(derM: ptr<function, vec2<f32>>, derS: ptr<function, f32>, derInvScale: ptr<function, f32>, epsThreshold: ptr<function, f32>, logEpsilon: f32) {
  let mm = dot(*derM, *derM);
  if (mm > 0.0) {
    let lm = 0.5 * log(mm);
    *derS = *derS + lm;
    *derM = *derM * exp(-lm);
  }
  der_refresh_cache(derM, derS, derInvScale, epsThreshold, logEpsilon);
}

fn der_to_polar(m: vec2<f32>, s: f32) -> vec2<f32> {
  let mm = dot(m, m);
  if (mm <= 1e-30) {
    return vec2<f32>(0.0, LOG_DER_ZERO);
  }
  return vec2<f32>(atan2(m.y, m.x), s + 0.5 * log(mm));
}

fn distance_height(z: vec2<f32>, derPolar: vec2<f32>) -> f32 {
  let logZ = max(0.5 * log(max(dot(z, z), 1.000002)), 1e-6);
  let logScreenDistance = logZ + log(logZ) - log(2.0) - derPolar.y - log(max(mandelbrot.scale, 1e-30));
  return clamp(-logScreenDistance, -64.0, 64.0);
}

// Deep path: mandelbrot.scale holds only the fe mantissa, so the true log(scale)
// is recomposed from the shared exponent (log(mantissa) + scaleExp\xb7ln2). Keeps
// distance-estimation shading continuous as scale crosses the deep threshold.
fn distance_height_deep(z: vec2<f32>, derPolar: vec2<f32>, scaleExp: i32) -> f32 {
  let logZ = max(0.5 * log(max(dot(z, z), 1.000002)), 1e-6);
  let logScale = log(max(mandelbrot.scale, 1e-30)) + f32(scaleExp) * LN2;
  let logScreenDistance = logZ + log(logZ) - log(2.0) - derPolar.y - logScale;
  return clamp(-logScreenDistance, -64.0, 64.0);
}

fn visual_derivative_angle(z: vec2<f32>, derPolar: vec2<f32>) -> f32 {
  return angle_wrap(derPolar.x - atan2(z.y, z.x));
}

fn getOrbit(index: i32) -> vec2<f32> {
  return vec2<f32>(
    mandelbrotOrbitPointSuite[index].zx,
    mandelbrotOrbitPointSuite[index].zy,
  );
}

fn try_apply_bla(ref_i: ptr<function, i32>, dz: ptr<function, vec2<f32>>, derM: ptr<function, vec2<f32>>, zOut: ptr<function, vec2<f32>>, derInvScale: f32, dc: vec2<f32>, dcMag: f32, bailout: f32, skip0Log: i32, maxIterI: i32) -> i32 {
  if (*ref_i <= 0) {
    return 0;
  }
  let dzMag2 = dot(*dz, *dz);
  let shiftedRef = *ref_i - 1;
  // BLA level skips are powers of two (skip = skip0 << level), so the highest
  // level aligned with shiftedRef follows directly from its trailing-zero
  // count — no per-level modulo scan.  Every level below an aligned level is
  // aligned too, so the loop only descends on radius/escape failures.
  var level = min(i32(mandelbrot.blaLevelCount) - 1, i32(countTrailingZeros(u32(shiftedRef))) - skip0Log);
  while (level >= 0) {
    let levelInfo = mandelbrotBlaLevels[level];
    let skip = i32(levelInfo.skip);
    // Whole-level fast reject: every entry's effective radius is bounded by
    // the level's maxRadius, so a too-large |dz| skips the entry fetch.
    if (dzMag2 <= levelInfo.maxRadius * levelInfo.maxRadius && *ref_i + skip <= maxIterI) {
      let slot = shiftedRef >> u32(skip0Log + level);
      if (u32(slot) < levelInfo.count) {
        let entryIndex = i32(levelInfo.offset) + slot;
        let bla = mandelbrotBlaSuite[entryIndex];
        // Reconstruct the f32 coefficients from their floatexp storage. In the
        // shallow regime (where this BLA path runs) the exponents are small, so
        // ldexp is exact and these match the pre-floatexp values.
        let a = ldexp(vec2<f32>(bla.ax, bla.ay), vec2<i32>(bla.ab_exp, bla.ab_exp));
        let b = ldexp(vec2<f32>(bla.bx, bla.by), vec2<i32>(bla.ab_exp, bla.ab_exp));
        let alpha = ldexp(bla.radius_alpha, bla.alpha_exp);
        let radius = max(0.0, alpha - bla.radius_beta * dcMag);
        // BLA radii are input-domain bounds: they describe when the block's
        // linearized map is valid for the current perturbation before the skip.
        if (dzMag2 <= radius * radius) {
          let candidate = cmul(a, *dz) + cmul(b, dc);
          // Do not let a multi-iteration BLA block jump over the first escape.
          // The color pass needs z/DE at the escape iteration, not after a block.
          let candidateZ = getOrbit(*ref_i + skip) + candidate;
          if (!(skip > 1 && dot(candidateZ, candidateZ) > bailout)) {
            *dz = candidate;
            *zOut = candidateZ;
            // der' = der\xb7a + b, in mantissa space.
            *derM = cmul(*derM, a) + b * derInvScale;
            *ref_i += skip;
            return skip;
          }
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
  @location(4) dzx:       vec4<f32>,  // .r = escaped distance height, or in-progress derivative angle
  @location(5) dzy:       vec4<f32>,  // .r = escaped angle_der, or in-progress log(|derivative|)
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

fn stripe_metric_sample(z: vec2<f32>) -> f32 {
  return sin(max(mandelbrot.stripeFrequency, 0.0) * atan2(z.y, z.x));
}

fn escape_fraction(z: vec2<f32>, muLimit: f32) -> f32 {
  let zSq = max(dot(z, z), 1e-12);
  return clamp(1.0 - log(log(zSq) / log(muLimit)) / log(2.0), 0.0, 1.0);
}

// ── core computation ──────────────────────────────────────────────
fn mandelbrot_compute(x0: f32, y0: f32, prev_iter: f32, prev_zx: f32, prev_zy: f32, prev_dzx: f32, prev_dzy: f32, prev_ref_i: f32, prev_avg_direction: f32) -> FragOut {
  let dc = vec2<f32>(x0, y0);
  let max_iteration = mandelbrot.maxIteration;
  let muLimit = mandelbrot.mu;
  let logEpsilon = log(max(mandelbrot.epsilon, 1e-30));
  let globalMaxIterI = i32(mandelbrot.globalMaxIter);

  // Resume state: if prev_iter > 0 we are continuing a previous pass.

  var i: f32 = 0.0;
  var dz = vec2<f32>(prev_zx, prev_zy);
  var ref_i = decode_ref_i(prev_ref_i);
  var z = getOrbit(ref_i) + dz;

  // Derivative state der = derM \xb7 exp(derS), converted from the stored
  // (angle, log magnitude) representation in layers 4/5.
  var derM: vec2<f32>;
  var derS: f32;
  if (prev_dzy <= LOG_DER_ZERO + 1.0) {
    derM = vec2<f32>(0.0);
    derS = 0.0;
  } else {
    derM = vec2<f32>(cos(prev_dzx), sin(prev_dzx));
    derS = prev_dzy;
  }
  var derInvScale = 0.0;
  var epsThreshold = 0.0;
  der_refresh_cache(&derM, &derS, &derInvScale, &epsThreshold, logEpsilon);

  let trackOrbitMetrics = mandelbrot.trackOrbitMetrics >= 0.5;
  var stripeEma = 0.0;
  // Orbit direction is accumulated as a plain sum and normalized once on
  // exit (saves a division + two multiplies per iteration vs a running mean).
  var avgDirSum = vec2<f32>(0.0);
  var avgCount = 0.0;
  if (trackOrbitMetrics) {
    stripeEma = decode_stripe_ema(prev_ref_i, prev_iter);
    avgCount = max(prev_iter, 0.0);
    avgDirSum = decode_avg_dir(prev_avg_direction, prev_iter) * avgCount;
  }
  var previousStripeEma = stripeEma;
  var previousAvgDirSum = avgDirSum;
  var previousAvgCount = avgCount;

  var escaped = false;
  var inside = false;
  var shadingHeight = 0.0;
  var shadingAngle = 0.0;

  let useBla = mandelbrot.approximationMode >= 0.5
            && mandelbrot.orbitComplete >= 0.5
            && mandelbrot.blaLevelCount >= 1.0;

  if (useBla) {
    let dcMag = sqrt(max(0.0, dot(dc, dc)));
    let skip0Log = i32(countTrailingZeros(max(mandelbrotBlaLevels[0].skip, 1u)));
    // Level 0 carries the loosest per-level radius bound (merged radii only
    // shrink), so one register compare against it tells whether any BLA entry
    // could possibly accept the current |dz|.
    let maxBlaRadius = mandelbrotBlaLevels[0].maxRadius;
    let maxBlaR2 = maxBlaRadius * maxBlaRadius;
    var usedBla = false;
    var blaZ = vec2<f32>(0.0);
    while (i < max_iteration && ref_i < globalMaxIterI) {
      var skipped = 0;
      if (dot(dz, dz) <= maxBlaR2) {
        skipped = try_apply_bla(&ref_i, &dz, &derM, &blaZ, derInvScale, dc, dcMag, muLimit, skip0Log, globalMaxIterI);
      }
      if (skipped > 0) {
        usedBla = true;
        z = blaZ;
        i += f32(skipped);
        if (trackOrbitMetrics) {
          previousStripeEma = stripeEma;
          previousAvgDirSum = avgDirSum;
          previousAvgCount = avgCount;
          stripeEma = update_orbit_ema(stripeEma, stripe_metric_sample(z), f32(skipped));
          avgDirSum += orbit_direction_sample(z) * f32(skipped);
          avgCount += f32(skipped);
        }
      } else {
        let refZ = getOrbit(ref_i);
        let zPrev = refZ + dz;
        dz = 2.0 * cmul(dz, refZ) + cmul(dz, dz) + dc;
        ref_i += 1;
        z = getOrbit(ref_i) + dz;
        derM = 2.0 * cmul(zPrev, derM) + vec2<f32>(derInvScale, 0.0);
        i += 1.0;
        if (trackOrbitMetrics) {
          previousStripeEma = stripeEma;
          previousAvgDirSum = avgDirSum;
          previousAvgCount = avgCount;
          stripeEma = update_orbit_ema_unit(stripeEma, stripe_metric_sample(z));
          avgDirSum += orbit_direction_sample(z);
          avgCount += 1.0;
        }
      }

      let derMM = dot(derM, derM);
      let dot_z = dot(z, z);
      if (dot_z > muLimit) {
        let derPolar = der_to_polar(derM, derS);
        shadingHeight = distance_height(z, derPolar);
        shadingAngle = visual_derivative_angle(z, derPolar);
        escaped = true;
        break;
      }
      if (!usedBla && !IGNORE_EPSILON && derMM < epsThreshold) {
        inside = true;
        break;
      }
      if (derMM > DER_RENORM_HI || derMM < DER_RENORM_LO) {
        der_renormalize(&derM, &derS, &derInvScale, &epsThreshold, logEpsilon);
      }

      let dot_dz = dot(dz, dz);
      if (dot_z < dot_dz || ref_i == globalMaxIterI) {
        dz = z;
        ref_i = 0;
      }
    }
  } else {
    while (i < max_iteration && ref_i < globalMaxIterI) {
      let refZ = getOrbit(ref_i);
      let zPrev = refZ + dz;
      dz = 2.0 * cmul(dz, refZ) + cmul(dz, dz) + dc;
      ref_i += 1;
      z = getOrbit(ref_i) + dz;
      derM = 2.0 * cmul(zPrev, derM) + vec2<f32>(derInvScale, 0.0);
      i += 1.0;
      if (trackOrbitMetrics) {
        previousStripeEma = stripeEma;
        previousAvgDirSum = avgDirSum;
        previousAvgCount = avgCount;
        stripeEma = update_orbit_ema_unit(stripeEma, stripe_metric_sample(z));
        avgDirSum += orbit_direction_sample(z);
        avgCount += 1.0;
      }

      let derMM = dot(derM, derM);
      let dot_z = dot(z, z);
      if (dot_z > muLimit) {
        let derPolar = der_to_polar(derM, derS);
        shadingHeight = distance_height(z, derPolar);
        shadingAngle = visual_derivative_angle(z, derPolar);
        escaped = true;
        break;
      }
      if (!IGNORE_EPSILON && derMM < epsThreshold) {
        inside = true;
        break;
      }
      if (derMM > DER_RENORM_HI || derMM < DER_RENORM_LO) {
        der_renormalize(&derM, &derS, &derInvScale, &epsThreshold, logEpsilon);
      }

      let dot_dz = dot(dz, dz);
      if (dot_z < dot_dz || ref_i == globalMaxIterI) {
        dz = z;
        ref_i = 0;
      }
    }
  }

  var out: FragOut;

  // Convert the derivative back to the stored (angle, log magnitude) form
  // and the direction sum back to a mean, once per pass.
  let derPolarOut = der_to_polar(derM, derS);
  let avgDir = avgDirSum / max(avgCount, 1.0);

  if (inside) {
    // Confirmed inside the set. Keep total iteration in ref_i for diagnostics/compatibility.
    out.iter      = pack(0.0);
    out.genuine   = pack(1.0);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(derPolarOut.x);
    out.dzy       = pack(derPolarOut.y);
    out.ref_i     = pack(ref_i_with_stripe(prev_iter + i, stripeEma));
    out.avgDirection = pack(encode_avg_dir(avgDir));
    return out;
  }

  let total_iter = prev_iter + i; // running total across all passes

  if (escaped) {
    let escapeBlend = escape_fraction(z, muLimit);
    let smoothStripeEma = mix(previousStripeEma, stripeEma, escapeBlend);
    let previousAvgDir = previousAvgDirSum / max(previousAvgCount, 1.0);
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
    out.dzx       = pack(derPolarOut.x);
    out.dzy       = pack(derPolarOut.y);
    out.ref_i     = pack(ref_i_with_stripe(total_iter, stripeEma));
    out.avgDirection = pack(encode_avg_dir(avgDir));
    return out;
  }

  // Budget exhausted below globalMaxIter: store iter = total_iter, keep dz/derivative state
  // for resumption.  |z|\xb2 < 4 distinguishes this from escaped pixels.
  out.iter      = pack(total_iter);
  out.genuine   = pack(1.0);
  out.zx        = pack(dz.x);
  out.zy        = pack(dz.y);
  out.dzx       = pack(derPolarOut.x);
  out.dzy       = pack(derPolarOut.y);
  out.ref_i     = pack(ref_i_with_stripe(f32(ref_i), stripeEma));
  out.avgDirection = pack(encode_avg_dir(avgDir));
  return out;
}

// ── deep (floatexp) perturbation ──────────────────────────────────
// Exact perturbation with dz/dc in extended-exponent form, for scale below the
// deep threshold where dc/dz underflow f32. Mirrors the non-BLA core loop but:
//   • dz, dc are fe; z_n (orbit) stays O(1) f32; der reuses the shallow machinery
//   • the per-pass resumable dz is parked as (mantissa in zx/zy, exponent in the
//     avgDirection layer), so orbit-direction metrics are unavailable here.
// BLA in the deep (floatexp) path: a\xb7dz + b\xb7dc with a, b in fe, dc/dz in fe, and
// the radius test |dz| ≤ alpha − beta\xb7|dc| done in log space (everything is far
// below f32 here). The derivative update folds the block's shared exponent into
// the log scale derS. log_dcMag = log|dc| is precomputed by the caller.
fn try_apply_bla_deep(ref_i: ptr<function, i32>, dz: ptr<function, fe>, derM: ptr<function, vec2<f32>>, derS: ptr<function, f32>, derInvScale: ptr<function, f32>, epsThreshold: ptr<function, f32>, logEpsilon: f32, zOut: ptr<function, vec2<f32>>, dc: fe, log_dcMag: f32, bailout: f32, skip0Log: i32, maxIterI: i32) -> i32 {
  if (*ref_i <= 0) {
    return 0;
  }
  let log_dz = log(max(length((*dz).m), 1e-30)) + f32((*dz).e) * LN2;
  let shiftedRef = *ref_i - 1;
  var level = min(i32(mandelbrot.blaLevelCount) - 1, i32(countTrailingZeros(u32(shiftedRef))) - skip0Log);
  while (level >= 0) {
    let levelInfo = mandelbrotBlaLevels[level];
    let skip = i32(levelInfo.skip);
    if (*ref_i + skip <= maxIterI) {
      let slot = shiftedRef >> u32(skip0Log + level);
      if (u32(slot) < levelInfo.count) {
        let bla = mandelbrotBlaSuite[i32(levelInfo.offset) + slot];
        // radius = alpha − beta\xb7|dc|, validity |dz| ≤ radius, all in log space.
        let log_alpha = log(bla.radius_alpha) + f32(bla.alpha_exp) * LN2;
        let log_betaDc = log(max(bla.radius_beta, 1e-30)) + log_dcMag;
        if (log_betaDc < log_alpha) {            // radius > 0
          let ratio = exp(log_betaDc - log_alpha); // ∈ [0,1)
          let log_radius = log_alpha + log(max(1.0 - ratio, 1e-30));
          if (log_dz <= log_radius) {
            // candidate = a\xb7dz + b\xb7dc  (a, b share exponent ab_exp)
            let a = fe(vec2<f32>(bla.ax, bla.ay), bla.ab_exp);
            let b = fe(vec2<f32>(bla.bx, bla.by), bla.ab_exp);
            let candidate = fe_add(fe_cmul(a, *dz), fe_cmul(b, dc));
            let candidateZ = getOrbit(*ref_i + skip) + fe_to_vec(candidate);
            // Don't let a multi-step block jump over the first escape.
            if (!(skip > 1 && dot(candidateZ, candidateZ) > bailout)) {
              *dz = candidate;
              *zOut = candidateZ;
              // der' = der\xb7a + b\xb71, folding the shared exponent into derS.
              *derM = cmul(*derM, vec2<f32>(bla.ax, bla.ay)) + vec2<f32>(bla.bx, bla.by) * (*derInvScale);
              *derS = *derS + f32(bla.ab_exp) * LN2;
              der_refresh_cache(derM, derS, derInvScale, epsThreshold, logEpsilon);
              *ref_i += skip;
              return skip;
            }
          }
        }
      }
    }
    level -= 1;
  }
  return 0;
}

fn mandelbrot_compute_deep(dc: fe, prev_iter: f32, prev_dz_m: vec2<f32>, prev_dz_e: i32, prev_ref_i_int: i32, prev_dzx: f32, prev_dzy: f32) -> FragOut {
  let max_iteration = mandelbrot.maxIteration;
  let muLimit = mandelbrot.mu;
  let logEpsilon = log(max(mandelbrot.epsilon, 1e-30));
  let globalMaxIterI = i32(mandelbrot.globalMaxIter);
  let scaleExp = i32(mandelbrot.scaleExp);

  var i: f32 = 0.0;
  var dz = fe_renorm(fe(prev_dz_m, prev_dz_e));
  var ref_i = prev_ref_i_int;
  var z = getOrbit(ref_i) + fe_to_vec(dz);

  // Derivative state der = derM \xb7 exp(derS), same representation & storage as
  // the shallow path (already range-safe via the log scale derS).
  var derM: vec2<f32>;
  var derS: f32;
  if (prev_dzy <= LOG_DER_ZERO + 1.0) {
    derM = vec2<f32>(0.0);
    derS = 0.0;
  } else {
    derM = vec2<f32>(cos(prev_dzx), sin(prev_dzx));
    derS = prev_dzy;
  }
  var derInvScale = 0.0;
  var epsThreshold = 0.0;
  der_refresh_cache(&derM, &derS, &derInvScale, &epsThreshold, logEpsilon);

  var escaped = false;
  var inside = false;
  var shadingHeight = 0.0;
  var shadingAngle = 0.0;

  // BLA acceleration in the deep path: skip iteration blocks when |dz| is small.
  let useBlaDeep = mandelbrot.blaLevelCount >= 1.0 && mandelbrot.orbitComplete >= 0.5;
  var skip0Log = 0;
  var log_dcMag = 0.0;
  if (useBlaDeep) {
    skip0Log = i32(countTrailingZeros(max(mandelbrotBlaLevels[0].skip, 1u)));
    log_dcMag = log(max(length(dc.m), 1e-30)) + f32(dc.e) * LN2;
  }
  var usedBla = false;

  while (i < max_iteration && ref_i < globalMaxIterI) {
    var skipped = 0;
    if (useBlaDeep) {
      var blaZ = vec2<f32>(0.0);
      skipped = try_apply_bla_deep(&ref_i, &dz, &derM, &derS, &derInvScale, &epsThreshold, logEpsilon, &blaZ, dc, log_dcMag, muLimit, skip0Log, globalMaxIterI);
      if (skipped > 0) {
        usedBla = true;
        z = blaZ;
        i += f32(skipped);
      }
    }
    if (skipped == 0) {
      let refZ = getOrbit(ref_i);
      let zPrev = refZ + fe_to_vec(dz);
      // dz' = 2\xb7z_n\xb7dz + dz\xb2 + dc   (z_n = refZ is O(1) f32)
      dz = fe_add3(fe_cmul_f32(2.0 * refZ, dz), fe_cmul(dz, dz), dc);
      ref_i += 1;
      z = getOrbit(ref_i) + fe_to_vec(dz);
      derM = 2.0 * cmul(zPrev, derM) + vec2<f32>(derInvScale, 0.0);
      i += 1.0;
    }

    let derMM = dot(derM, derM);
    let dot_z = dot(z, z);
    if (dot_z > muLimit) {
      let derPolar = der_to_polar(derM, derS);
      shadingHeight = distance_height_deep(z, derPolar, scaleExp);
      shadingAngle = visual_derivative_angle(z, derPolar);
      escaped = true;
      break;
    }
    // BLA blocks can jump past the interior condition, so skip the derivative
    // interior test once BLA has been used (matches the shallow BLA path).
    if (!usedBla && !IGNORE_EPSILON && derMM < epsThreshold) {
      inside = true;
      break;
    }
    if (derMM > DER_RENORM_HI || derMM < DER_RENORM_LO) {
      der_renormalize(&derM, &derS, &derInvScale, &epsThreshold, logEpsilon);
    }

    // Rebase: once |dz| catches up to |z|, restart perturbation from z (O(1)).
    if (dot_z < fe_mag2_f32(dz) || ref_i == globalMaxIterI) {
      dz = fe_from_vec(z, 0);
      ref_i = 0;
    }
  }

  var out: FragOut;
  let derPolarOut = der_to_polar(derM, derS);

  if (inside) {
    out.iter      = pack(0.0);
    out.genuine   = pack(1.0);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(derPolarOut.x);
    out.dzy       = pack(derPolarOut.y);
    out.ref_i     = pack(ref_i_with_stripe(prev_iter + i, 0.0));
    out.avgDirection = pack(0.0);
    return out;
  }

  let total_iter = prev_iter + i;

  if (escaped) {
    out.iter      = pack(total_iter);
    out.genuine   = pack(1.0);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(shadingHeight);
    out.dzy       = pack(shadingAngle);
    out.ref_i     = pack(ref_i_with_stripe(0.0, 0.0));
    out.avgDirection = pack(0.0);
    return out;
  }

  if (total_iter >= mandelbrot.globalMaxIter && mandelbrot.orbitComplete >= 0.5) {
    out.iter      = pack(0.0);
    out.genuine   = pack(1.0);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(derPolarOut.x);
    out.dzy       = pack(derPolarOut.y);
    out.ref_i     = pack(ref_i_with_stripe(total_iter, 0.0));
    out.avgDirection = pack(0.0);
    return out;
  }

  // Budget exhausted mid-progress. Park dz range-safely: normalized mantissa in
  // zx/zy (|m|\xb2 < 2 < mu, so the |\xb7|\xb2<mu continuation test stays valid) and the
  // shared exponent in the avgDirection layer.
  let dzN = fe_renorm(dz);
  out.iter      = pack(total_iter);
  out.genuine   = pack(1.0);
  out.zx        = pack(dzN.m.x);
  out.zy        = pack(dzN.m.y);
  out.dzx       = pack(derPolarOut.x);
  out.dzy       = pack(derPolarOut.y);
  out.ref_i     = pack(ref_i_with_stripe(f32(ref_i), 0.0));
  out.avgDirection = pack(f32(dzN.e));
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
  // AA sub-pixel jitter (neutral-space units); zero for sample 0 / AA off.
  let local_rot = xy_neutral * neutralExtent + vec2<f32>(mandelbrot.aaOffsetX, mandelbrot.aaOffsetY);

  // Deep-zoom path: below the threshold, scale/cx/cy carry fe mantissas sharing
  // exponent scaleExp, and dc is built in extended-exponent form to dodge the
  // f32 underflow wall. Above the threshold the shallow f32 path is unchanged.
  let scaleExp = i32(mandelbrot.scaleExp);
  if (scaleExp <= DEEP_EXP) {
    // dc = local\xb7scaleMant + (cxMant, cyMant); all three share exponent scaleExp,
    // so this is a single same-exponent add before renormalizing.
    let dc = fe_renorm(fe(local_rot * mandelbrot.scale + vec2<f32>(mandelbrot.cx, mandelbrot.cy), scaleExp));
    if (is_compute_request) {
      return mandelbrot_compute_deep(dc, 0.0, vec2<f32>(0.0), 0, 0, 0.0, LOG_DER_ZERO);
    }
    if (needs_continuation) {
      // Deep continuation: layers 2/3 hold the dz mantissa, layer 7 the exponent.
      let dz_e = i32(loadLayer(coord, 7));
      let stored_dzx = loadLayer(coord, 4);
      let stored_dzy = loadLayer(coord, 5);
      let prev_ref_i = decode_ref_i(loadLayer(coord, 6));
      return mandelbrot_compute_deep(dc, prev_iter, vec2<f32>(prev_zx, prev_zy), dz_e, prev_ref_i, stored_dzx, stored_dzy);
    }
    discard;
    return empty_out();
  }

  let x0 = local_rot.x * mandelbrot.scale + mandelbrot.cx;
  let y0 = local_rot.y * mandelbrot.scale + mandelbrot.cy;

  if (is_compute_request) {
    // Fresh computation (sentinel == -1).
    return mandelbrot_compute(x0, y0, 0.0, 0.0, 0.0, 0.0, LOG_DER_ZERO, 0.0, 0.0);
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
`,mr=`// Fused brush + mandelbrot + count compute pass, working IN PLACE on the
// neutral texture A (rawTexture) via a read_write storage texture.
//
// Replaces, for frames WITHOUT translation and WITHOUT clearHistory:
//   - the brush render pass (reproject.wgsl)
//   - the B→A full-texture copy
//   - the mandelbrot render pass (mandelbrot.wgsl)
//   - the count_unfinished compute pass
//
// ⚠ STRICTLY TEXEL-LOCAL: each invocation may only read and write ITS OWN
// texel (no neighbour access), otherwise in-place execution races.  Any
// future neighbour-dependent logic (translation reprojection, new brush
// interpolation, …) must stay on the render ping-pong path in Engine.ts.
//
// r32float is the only texture format supporting read_write storage access
// in core WebGPU — this shader depends on it.
//
// Layer layout, sentinel conventions and pixel-state convention are
// identical to mandelbrot.wgsl / reproject.wgsl:
//   0 : sentinel / iteration count (integer part)
//   1 : resolution step (1.0 = genuine pixel, >= 2 = resolve-copied)
//   2 : z.x (escaped) or dz.x (continuation)
//   3 : z.y (escaped) or dz.y (continuation)
//   4 : escaped: distance height, in-progress: derivative angle
//   5 : escaped: visual derivative angle, in-progress: log(|derivative|)
//   6 : ref_i + fractional stripe phase
//   7 : packed average orbit direction
//
// Pixel state (iter-only):
//   iter == -1                  : sentinel, needs computation
//   iter == 0                   : confirmed inside the set
//   iter > 0  AND  |z|\xb2 >= mu   : escaped
//   iter > 0  AND  |z|\xb2 < mu    : budget exhausted → continuation
//   iter < 0  AND  iter != -1   : resolution sentinel (refined here)

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
  angle: f32,
  maxIteration: f32,    // iterations to compute THIS pass
  epsilon: f32,
  antialiasLevel: f32,
  iterationOffset: f32,
  globalMaxIter: f32,   // total iteration target for the current view
  orbitComplete: f32,   // 1.0 = orbit fully built, 0.0 = still building
  approximationMode: f32,
  blaLevelCount: f32,
  blaEpsilon: f32,
  stripeFrequency: f32,
  trackOrbitMetrics: f32,
  scaleExp: f32,        // floatexp deep path: shared base-2 exponent for scale & cx/cy
  aaOffsetX: f32,       // sub-pixel AA jitter, neutral-space units (0 = off)
  aaOffsetY: f32,
};

// floatexp deep-zoom threshold (base-2 exponent of scale). Below this the shader
// switches to the extended-exponent (fe) path, before f32 precision degrades
// approaching the underflow wall. Mirror of Engine.DEEP_EXP_THRESHOLD.
const DEEP_EXP: i32 = -116;
const LN2: f32 = 0.6931471805599453;

struct BlaStep {
  // floatexp form: a = (ax,ay)\xb72^ab_exp, b = (bx,by)\xb72^ab_exp,
  // alpha = radius_alpha\xb72^alpha_exp, beta = radius_beta (O(1)).
  ax: f32,
  ay: f32,
  bx: f32,
  by: f32,
  ab_exp: i32,
  radius_alpha: f32,
  alpha_exp: i32,
  radius_beta: f32,
};

struct BlaLevel {
  offset: u32,
  count: u32,
  skip: u32,
  // Largest radius_alpha among this level's entries; effective radii are
  // always <= radius_alpha, so |dz| above this bound rejects the whole level.
  maxRadius: f32,
};

// Same layout as reproject.wgsl — the CPU-side uniform buffer is shared.
// clearHistory/seedStep/shiftTexX/shiftTexY are unused here: Engine.ts only
// dispatches this pass when shift == 0 and clearHistory is off.
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
  allowRefinement: f32, // 1.0 = refine sentinels normally, 0.0 = freeze grid
};

struct CounterBuffer {
  count: atomic<u32>,
  active_count: atomic<u32>,
};

@group(0) @binding(0) var<uniform> mandelbrot: Mandelbrot;
@group(0) @binding(1) var<storage, read> mandelbrotOrbitPointSuite: array<MandelbrotStep>;
@group(0) @binding(2) var<storage, read> mandelbrotBlaSuite: array<BlaStep>;
@group(0) @binding(3) var<storage, read> mandelbrotBlaLevels: array<BlaLevel>;
@group(0) @binding(4) var raw: texture_storage_2d_array<r32float, read_write>;
@group(0) @binding(5) var<uniform> brush: BrushUniforms;
@group(0) @binding(6) var<storage, read_write> counter: CounterBuffer;

// ── complex helpers (verbatim from mandelbrot.wgsl) ────────────────
fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

// ── extended-exponent complex (floatexp) ───────────────────────────
// value = m \xb7 2^e with one shared integer exponent per complex. Used on the
// deep-zoom path where dz/dc fall below the f32 normal minimum. frexp/ldexp keep
// renorm exact. Mirror of mandelbrot.wgsl's fe helpers.
struct fe { m: vec2<f32>, e: i32 };

// Exponent assigned to a zero fe. Must be far below any real scale exponent so a
// zero never dominates fe_add (which would drop the other term): with e = 0 a
// fresh dz = 0 would swallow dc and the perturbation would never start.
const FE_ZERO_E: i32 = -1000000;

fn fe_renorm(v: fe) -> fe {
  let a = max(abs(v.m.x), abs(v.m.y));
  if (!(a > 0.0)) {
    return fe(vec2<f32>(0.0, 0.0), FE_ZERO_E);
  }
  let r = frexp(a);
  return fe(ldexp(v.m, vec2<i32>(-r.exp, -r.exp)), v.e + r.exp);
}

fn fe_from_vec(v: vec2<f32>, e: i32) -> fe {
  return fe_renorm(fe(v, e));
}

fn fe_to_vec(v: fe) -> vec2<f32> {
  return ldexp(v.m, vec2<i32>(v.e, v.e));
}

fn fe_cmul(a: fe, b: fe) -> fe {
  return fe_renorm(fe(cmul(a.m, b.m), a.e + b.e));
}

fn fe_cmul_f32(zf: vec2<f32>, b: fe) -> fe {
  return fe_renorm(fe(cmul(zf, b.m), b.e));
}

fn fe_add(a: fe, b: fe) -> fe {
  let d = a.e - b.e;
  if (d > 24) { return a; }
  if (d < -24) { return b; }
  if (d >= 0) {
    return fe_renorm(fe(a.m + ldexp(b.m, vec2<i32>(-d, -d)), a.e));
  }
  return fe_renorm(fe(ldexp(a.m, vec2<i32>(d, d)) + b.m, b.e));
}

fn fe_add3(a: fe, b: fe, c: fe) -> fe {
  return fe_add(fe_add(a, b), c);
}

fn fe_mag2_f32(v: fe) -> f32 {
  return ldexp(dot(v.m, v.m), 2 * v.e);
}

const LOG_DER_ZERO: f32 = -80.0;

fn angle_wrap(a: f32) -> f32 {
  return atan2(sin(a), cos(a));
}

const DER_RENORM_HI: f32 = 1e16;
const DER_RENORM_LO: f32 = 1e-16;

fn der_refresh_cache(derM: ptr<function, vec2<f32>>, derS: ptr<function, f32>, derInvScale: ptr<function, f32>, epsThreshold: ptr<function, f32>, logEpsilon: f32) {
  if (*derS < -40.0) {
    *derM = *derM * exp(max(*derS, -80.0));
    *derS = 0.0;
  }
  *derInvScale = exp(clamp(-(*derS), -80.0, 80.0));
  *epsThreshold = exp(clamp(logEpsilon - 2.0 * (*derS), -87.0, 87.0));
}

fn der_renormalize(derM: ptr<function, vec2<f32>>, derS: ptr<function, f32>, derInvScale: ptr<function, f32>, epsThreshold: ptr<function, f32>, logEpsilon: f32) {
  let mm = dot(*derM, *derM);
  if (mm > 0.0) {
    let lm = 0.5 * log(mm);
    *derS = *derS + lm;
    *derM = *derM * exp(-lm);
  }
  der_refresh_cache(derM, derS, derInvScale, epsThreshold, logEpsilon);
}

fn der_to_polar(m: vec2<f32>, s: f32) -> vec2<f32> {
  let mm = dot(m, m);
  if (mm <= 1e-30) {
    return vec2<f32>(0.0, LOG_DER_ZERO);
  }
  return vec2<f32>(atan2(m.y, m.x), s + 0.5 * log(mm));
}

fn distance_height(z: vec2<f32>, derPolar: vec2<f32>) -> f32 {
  let logZ = max(0.5 * log(max(dot(z, z), 1.000002)), 1e-6);
  let logScreenDistance = logZ + log(logZ) - log(2.0) - derPolar.y - log(max(mandelbrot.scale, 1e-30));
  return clamp(-logScreenDistance, -64.0, 64.0);
}

// Deep path: mandelbrot.scale holds only the fe mantissa, so log(scale) is
// recomposed from the shared exponent (log(mantissa) + scaleExp\xb7ln2).
fn distance_height_deep(z: vec2<f32>, derPolar: vec2<f32>, scaleExp: i32) -> f32 {
  let logZ = max(0.5 * log(max(dot(z, z), 1.000002)), 1e-6);
  let logScale = log(max(mandelbrot.scale, 1e-30)) + f32(scaleExp) * LN2;
  let logScreenDistance = logZ + log(logZ) - log(2.0) - derPolar.y - logScale;
  return clamp(-logScreenDistance, -64.0, 64.0);
}

fn visual_derivative_angle(z: vec2<f32>, derPolar: vec2<f32>) -> f32 {
  return angle_wrap(derPolar.x - atan2(z.y, z.x));
}

fn getOrbit(index: i32) -> vec2<f32> {
  return vec2<f32>(
    mandelbrotOrbitPointSuite[index].zx,
    mandelbrotOrbitPointSuite[index].zy,
  );
}

fn try_apply_bla(ref_i: ptr<function, i32>, dz: ptr<function, vec2<f32>>, derM: ptr<function, vec2<f32>>, zOut: ptr<function, vec2<f32>>, derInvScale: f32, dc: vec2<f32>, dcMag: f32, bailout: f32, skip0Log: i32, maxIterI: i32) -> i32 {
  if (*ref_i <= 0) {
    return 0;
  }
  let dzMag2 = dot(*dz, *dz);
  let shiftedRef = *ref_i - 1;
  var level = min(i32(mandelbrot.blaLevelCount) - 1, i32(countTrailingZeros(u32(shiftedRef))) - skip0Log);
  while (level >= 0) {
    let levelInfo = mandelbrotBlaLevels[level];
    let skip = i32(levelInfo.skip);
    // Whole-level fast reject: every entry's effective radius is bounded by
    // the level's maxRadius, so a too-large |dz| skips the entry fetch.
    if (dzMag2 <= levelInfo.maxRadius * levelInfo.maxRadius && *ref_i + skip <= maxIterI) {
      let slot = shiftedRef >> u32(skip0Log + level);
      if (u32(slot) < levelInfo.count) {
        let entryIndex = i32(levelInfo.offset) + slot;
        let bla = mandelbrotBlaSuite[entryIndex];
        // Reconstruct the f32 coefficients from their floatexp storage (exact in
        // the shallow regime where this BLA path runs).
        let a = ldexp(vec2<f32>(bla.ax, bla.ay), vec2<i32>(bla.ab_exp, bla.ab_exp));
        let b = ldexp(vec2<f32>(bla.bx, bla.by), vec2<i32>(bla.ab_exp, bla.ab_exp));
        let alpha = ldexp(bla.radius_alpha, bla.alpha_exp);
        let radius = max(0.0, alpha - bla.radius_beta * dcMag);
        if (dzMag2 <= radius * radius) {
          let candidate = cmul(a, *dz) + cmul(b, dc);
          let candidateZ = getOrbit(*ref_i + skip) + candidate;
          if (!(skip > 1 && dot(candidateZ, candidateZ) > bailout)) {
            *dz = candidate;
            *zOut = candidateZ;
            *derM = cmul(*derM, a) + b * derInvScale;
            *ref_i += skip;
            return skip;
          }
        }
      }
    }
    level -= 1;
  }

  return 0;
}

const IGNORE_EPSILON: bool = false;

// ── per-texel output (plain struct, stored via textureStore) ───────
struct TexelOut {
  iter:      vec4<f32>,
  genuine:   vec4<f32>,
  zx:        vec4<f32>,
  zy:        vec4<f32>,
  dzx:       vec4<f32>,
  dzy:       vec4<f32>,
  ref_i:     vec4<f32>,
  avgDirection: vec4<f32>,
};

fn pack(v: f32) -> vec4<f32> { return vec4<f32>(v, 0.0, 0.0, 0.0); }

fn loadLayer(coord: vec2<i32>, layer: i32) -> f32 {
  return textureLoad(raw, coord, layer).r;
}

fn storeTexel(coord: vec2<i32>, out: TexelOut) {
  textureStore(raw, coord, 0, out.iter);
  textureStore(raw, coord, 1, out.genuine);
  textureStore(raw, coord, 2, out.zx);
  textureStore(raw, coord, 3, out.zy);
  textureStore(raw, coord, 4, out.dzx);
  textureStore(raw, coord, 5, out.dzy);
  textureStore(raw, coord, 6, out.ref_i);
  textureStore(raw, coord, 7, out.avgDirection);
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

fn stripe_metric_sample(z: vec2<f32>) -> f32 {
  return sin(max(mandelbrot.stripeFrequency, 0.0) * atan2(z.y, z.x));
}

fn escape_fraction(z: vec2<f32>, muLimit: f32) -> f32 {
  let zSq = max(dot(z, z), 1e-12);
  return clamp(1.0 - log(log(zSq) / log(muLimit)) / log(2.0), 0.0, 1.0);
}

// ── core computation (verbatim from mandelbrot.wgsl) ───────────────
fn mandelbrot_compute(x0: f32, y0: f32, prev_iter: f32, prev_zx: f32, prev_zy: f32, prev_dzx: f32, prev_dzy: f32, prev_ref_i: f32, prev_avg_direction: f32) -> TexelOut {
  let dc = vec2<f32>(x0, y0);
  let max_iteration = mandelbrot.maxIteration;
  let muLimit = mandelbrot.mu;
  let logEpsilon = log(max(mandelbrot.epsilon, 1e-30));
  let globalMaxIterI = i32(mandelbrot.globalMaxIter);

  var i: f32 = 0.0;
  var dz = vec2<f32>(prev_zx, prev_zy);
  var ref_i = decode_ref_i(prev_ref_i);
  var z = getOrbit(ref_i) + dz;

  var derM: vec2<f32>;
  var derS: f32;
  if (prev_dzy <= LOG_DER_ZERO + 1.0) {
    derM = vec2<f32>(0.0);
    derS = 0.0;
  } else {
    derM = vec2<f32>(cos(prev_dzx), sin(prev_dzx));
    derS = prev_dzy;
  }
  var derInvScale = 0.0;
  var epsThreshold = 0.0;
  der_refresh_cache(&derM, &derS, &derInvScale, &epsThreshold, logEpsilon);

  let trackOrbitMetrics = mandelbrot.trackOrbitMetrics >= 0.5;
  var stripeEma = 0.0;
  var avgDirSum = vec2<f32>(0.0);
  var avgCount = 0.0;
  if (trackOrbitMetrics) {
    stripeEma = decode_stripe_ema(prev_ref_i, prev_iter);
    avgCount = max(prev_iter, 0.0);
    avgDirSum = decode_avg_dir(prev_avg_direction, prev_iter) * avgCount;
  }
  var previousStripeEma = stripeEma;
  var previousAvgDirSum = avgDirSum;
  var previousAvgCount = avgCount;

  var escaped = false;
  var inside = false;
  var shadingHeight = 0.0;
  var shadingAngle = 0.0;

  let useBla = mandelbrot.approximationMode >= 0.5
            && mandelbrot.orbitComplete >= 0.5
            && mandelbrot.blaLevelCount >= 1.0;

  if (useBla) {
    let dcMag = sqrt(max(0.0, dot(dc, dc)));
    let skip0Log = i32(countTrailingZeros(max(mandelbrotBlaLevels[0].skip, 1u)));
    // Level 0 carries the loosest per-level radius bound (merged radii only
    // shrink), so one register compare against it tells whether any BLA entry
    // could possibly accept the current |dz|.
    let maxBlaRadius = mandelbrotBlaLevels[0].maxRadius;
    let maxBlaR2 = maxBlaRadius * maxBlaRadius;
    var usedBla = false;
    var blaZ = vec2<f32>(0.0);
    while (i < max_iteration && ref_i < globalMaxIterI) {
      var skipped = 0;
      if (dot(dz, dz) <= maxBlaR2) {
        skipped = try_apply_bla(&ref_i, &dz, &derM, &blaZ, derInvScale, dc, dcMag, muLimit, skip0Log, globalMaxIterI);
      }
      if (skipped > 0) {
        usedBla = true;
        z = blaZ;
        i += f32(skipped);
        if (trackOrbitMetrics) {
          previousStripeEma = stripeEma;
          previousAvgDirSum = avgDirSum;
          previousAvgCount = avgCount;
          stripeEma = update_orbit_ema(stripeEma, stripe_metric_sample(z), f32(skipped));
          avgDirSum += orbit_direction_sample(z) * f32(skipped);
          avgCount += f32(skipped);
        }
      } else {
        let refZ = getOrbit(ref_i);
        let zPrev = refZ + dz;
        dz = 2.0 * cmul(dz, refZ) + cmul(dz, dz) + dc;
        ref_i += 1;
        z = getOrbit(ref_i) + dz;
        derM = 2.0 * cmul(zPrev, derM) + vec2<f32>(derInvScale, 0.0);
        i += 1.0;
        if (trackOrbitMetrics) {
          previousStripeEma = stripeEma;
          previousAvgDirSum = avgDirSum;
          previousAvgCount = avgCount;
          stripeEma = update_orbit_ema_unit(stripeEma, stripe_metric_sample(z));
          avgDirSum += orbit_direction_sample(z);
          avgCount += 1.0;
        }
      }

      let derMM = dot(derM, derM);
      let dot_z = dot(z, z);
      if (dot_z > muLimit) {
        let derPolar = der_to_polar(derM, derS);
        shadingHeight = distance_height(z, derPolar);
        shadingAngle = visual_derivative_angle(z, derPolar);
        escaped = true;
        break;
      }
      if (!usedBla && !IGNORE_EPSILON && derMM < epsThreshold) {
        inside = true;
        break;
      }
      if (derMM > DER_RENORM_HI || derMM < DER_RENORM_LO) {
        der_renormalize(&derM, &derS, &derInvScale, &epsThreshold, logEpsilon);
      }

      let dot_dz = dot(dz, dz);
      if (dot_z < dot_dz || ref_i == globalMaxIterI) {
        dz = z;
        ref_i = 0;
      }
    }
  } else {
    while (i < max_iteration && ref_i < globalMaxIterI) {
      let refZ = getOrbit(ref_i);
      let zPrev = refZ + dz;
      dz = 2.0 * cmul(dz, refZ) + cmul(dz, dz) + dc;
      ref_i += 1;
      z = getOrbit(ref_i) + dz;
      derM = 2.0 * cmul(zPrev, derM) + vec2<f32>(derInvScale, 0.0);
      i += 1.0;
      if (trackOrbitMetrics) {
        previousStripeEma = stripeEma;
        previousAvgDirSum = avgDirSum;
        previousAvgCount = avgCount;
        stripeEma = update_orbit_ema_unit(stripeEma, stripe_metric_sample(z));
        avgDirSum += orbit_direction_sample(z);
        avgCount += 1.0;
      }

      let derMM = dot(derM, derM);
      let dot_z = dot(z, z);
      if (dot_z > muLimit) {
        let derPolar = der_to_polar(derM, derS);
        shadingHeight = distance_height(z, derPolar);
        shadingAngle = visual_derivative_angle(z, derPolar);
        escaped = true;
        break;
      }
      if (!IGNORE_EPSILON && derMM < epsThreshold) {
        inside = true;
        break;
      }
      if (derMM > DER_RENORM_HI || derMM < DER_RENORM_LO) {
        der_renormalize(&derM, &derS, &derInvScale, &epsThreshold, logEpsilon);
      }

      let dot_dz = dot(dz, dz);
      if (dot_z < dot_dz || ref_i == globalMaxIterI) {
        dz = z;
        ref_i = 0;
      }
    }
  }

  var out: TexelOut;

  let derPolarOut = der_to_polar(derM, derS);
  let avgDir = avgDirSum / max(avgCount, 1.0);

  if (inside) {
    out.iter      = pack(0.0);
    out.genuine   = pack(1.0);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(derPolarOut.x);
    out.dzy       = pack(derPolarOut.y);
    out.ref_i     = pack(ref_i_with_stripe(prev_iter + i, stripeEma));
    out.avgDirection = pack(encode_avg_dir(avgDir));
    return out;
  }

  let total_iter = prev_iter + i;

  if (escaped) {
    let escapeBlend = escape_fraction(z, muLimit);
    let smoothStripeEma = mix(previousStripeEma, stripeEma, escapeBlend);
    let previousAvgDir = previousAvgDirSum / max(previousAvgCount, 1.0);
    let smoothAvgDir = mix(previousAvgDir, avgDir, escapeBlend);

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

  let globalMax = mandelbrot.globalMaxIter;

  if (total_iter >= globalMax && mandelbrot.orbitComplete >= 0.5) {
    out.iter      = pack(0.0);
    out.genuine   = pack(1.0);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(derPolarOut.x);
    out.dzy       = pack(derPolarOut.y);
    out.ref_i     = pack(ref_i_with_stripe(total_iter, stripeEma));
    out.avgDirection = pack(encode_avg_dir(avgDir));
    return out;
  }

  out.iter      = pack(total_iter);
  out.genuine   = pack(1.0);
  out.zx        = pack(dz.x);
  out.zy        = pack(dz.y);
  out.dzx       = pack(derPolarOut.x);
  out.dzy       = pack(derPolarOut.y);
  out.ref_i     = pack(ref_i_with_stripe(f32(ref_i), stripeEma));
  out.avgDirection = pack(encode_avg_dir(avgDir));
  return out;
}

// ── deep (floatexp) perturbation ──────────────────────────────────
// Exact perturbation with dz/dc in extended-exponent form, for scale below the
// deep threshold. Mirrors mandelbrot.wgsl's mandelbrot_compute_deep but returns
// TexelOut. dz, dc are fe; z_n stays O(1) f32; der reuses the shallow machinery;
// the resumable dz is parked as (mantissa in zx/zy, exponent in avgDirection),
// so orbit-direction metrics are unavailable on the deep path.
// BLA in the deep (floatexp) path — see mandelbrot.wgsl for the derivation.
fn try_apply_bla_deep(ref_i: ptr<function, i32>, dz: ptr<function, fe>, derM: ptr<function, vec2<f32>>, derS: ptr<function, f32>, derInvScale: ptr<function, f32>, epsThreshold: ptr<function, f32>, logEpsilon: f32, zOut: ptr<function, vec2<f32>>, dc: fe, log_dcMag: f32, bailout: f32, skip0Log: i32, maxIterI: i32) -> i32 {
  if (*ref_i <= 0) {
    return 0;
  }
  let log_dz = log(max(length((*dz).m), 1e-30)) + f32((*dz).e) * LN2;
  let shiftedRef = *ref_i - 1;
  var level = min(i32(mandelbrot.blaLevelCount) - 1, i32(countTrailingZeros(u32(shiftedRef))) - skip0Log);
  while (level >= 0) {
    let levelInfo = mandelbrotBlaLevels[level];
    let skip = i32(levelInfo.skip);
    if (*ref_i + skip <= maxIterI) {
      let slot = shiftedRef >> u32(skip0Log + level);
      if (u32(slot) < levelInfo.count) {
        let bla = mandelbrotBlaSuite[i32(levelInfo.offset) + slot];
        let log_alpha = log(bla.radius_alpha) + f32(bla.alpha_exp) * LN2;
        let log_betaDc = log(max(bla.radius_beta, 1e-30)) + log_dcMag;
        if (log_betaDc < log_alpha) {
          let ratio = exp(log_betaDc - log_alpha);
          let log_radius = log_alpha + log(max(1.0 - ratio, 1e-30));
          if (log_dz <= log_radius) {
            let a = fe(vec2<f32>(bla.ax, bla.ay), bla.ab_exp);
            let b = fe(vec2<f32>(bla.bx, bla.by), bla.ab_exp);
            let candidate = fe_add(fe_cmul(a, *dz), fe_cmul(b, dc));
            let candidateZ = getOrbit(*ref_i + skip) + fe_to_vec(candidate);
            if (!(skip > 1 && dot(candidateZ, candidateZ) > bailout)) {
              *dz = candidate;
              *zOut = candidateZ;
              *derM = cmul(*derM, vec2<f32>(bla.ax, bla.ay)) + vec2<f32>(bla.bx, bla.by) * (*derInvScale);
              *derS = *derS + f32(bla.ab_exp) * LN2;
              der_refresh_cache(derM, derS, derInvScale, epsThreshold, logEpsilon);
              *ref_i += skip;
              return skip;
            }
          }
        }
      }
    }
    level -= 1;
  }
  return 0;
}

fn mandelbrot_compute_deep(dc: fe, prev_iter: f32, prev_dz_m: vec2<f32>, prev_dz_e: i32, prev_ref_i_int: i32, prev_dzx: f32, prev_dzy: f32) -> TexelOut {
  let max_iteration = mandelbrot.maxIteration;
  let muLimit = mandelbrot.mu;
  let logEpsilon = log(max(mandelbrot.epsilon, 1e-30));
  let globalMaxIterI = i32(mandelbrot.globalMaxIter);
  let scaleExp = i32(mandelbrot.scaleExp);

  var i: f32 = 0.0;
  var dz = fe_renorm(fe(prev_dz_m, prev_dz_e));
  var ref_i = prev_ref_i_int;
  var z = getOrbit(ref_i) + fe_to_vec(dz);

  var derM: vec2<f32>;
  var derS: f32;
  if (prev_dzy <= LOG_DER_ZERO + 1.0) {
    derM = vec2<f32>(0.0);
    derS = 0.0;
  } else {
    derM = vec2<f32>(cos(prev_dzx), sin(prev_dzx));
    derS = prev_dzy;
  }
  var derInvScale = 0.0;
  var epsThreshold = 0.0;
  der_refresh_cache(&derM, &derS, &derInvScale, &epsThreshold, logEpsilon);

  var escaped = false;
  var inside = false;
  var shadingHeight = 0.0;
  var shadingAngle = 0.0;

  // BLA acceleration in the deep path: skip iteration blocks when |dz| is small.
  let useBlaDeep = mandelbrot.blaLevelCount >= 1.0 && mandelbrot.orbitComplete >= 0.5;
  var skip0Log = 0;
  var log_dcMag = 0.0;
  if (useBlaDeep) {
    skip0Log = i32(countTrailingZeros(max(mandelbrotBlaLevels[0].skip, 1u)));
    log_dcMag = log(max(length(dc.m), 1e-30)) + f32(dc.e) * LN2;
  }
  var usedBla = false;

  while (i < max_iteration && ref_i < globalMaxIterI) {
    var skipped = 0;
    if (useBlaDeep) {
      var blaZ = vec2<f32>(0.0);
      skipped = try_apply_bla_deep(&ref_i, &dz, &derM, &derS, &derInvScale, &epsThreshold, logEpsilon, &blaZ, dc, log_dcMag, muLimit, skip0Log, globalMaxIterI);
      if (skipped > 0) {
        usedBla = true;
        z = blaZ;
        i += f32(skipped);
      }
    }
    if (skipped == 0) {
      let refZ = getOrbit(ref_i);
      let zPrev = refZ + fe_to_vec(dz);
      // dz' = 2\xb7z_n\xb7dz + dz\xb2 + dc   (z_n = refZ is O(1) f32)
      dz = fe_add3(fe_cmul_f32(2.0 * refZ, dz), fe_cmul(dz, dz), dc);
      ref_i += 1;
      z = getOrbit(ref_i) + fe_to_vec(dz);
      derM = 2.0 * cmul(zPrev, derM) + vec2<f32>(derInvScale, 0.0);
      i += 1.0;
    }

    let derMM = dot(derM, derM);
    let dot_z = dot(z, z);
    if (dot_z > muLimit) {
      let derPolar = der_to_polar(derM, derS);
      shadingHeight = distance_height_deep(z, derPolar, scaleExp);
      shadingAngle = visual_derivative_angle(z, derPolar);
      escaped = true;
      break;
    }
    // BLA blocks can jump past the interior condition, so skip the derivative
    // interior test once BLA has been used (matches the shallow BLA path).
    if (!usedBla && !IGNORE_EPSILON && derMM < epsThreshold) {
      inside = true;
      break;
    }
    if (derMM > DER_RENORM_HI || derMM < DER_RENORM_LO) {
      der_renormalize(&derM, &derS, &derInvScale, &epsThreshold, logEpsilon);
    }

    if (dot_z < fe_mag2_f32(dz) || ref_i == globalMaxIterI) {
      dz = fe_from_vec(z, 0);
      ref_i = 0;
    }
  }

  var out: TexelOut;
  let derPolarOut = der_to_polar(derM, derS);

  if (inside) {
    out.iter      = pack(0.0);
    out.genuine   = pack(1.0);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(derPolarOut.x);
    out.dzy       = pack(derPolarOut.y);
    out.ref_i     = pack(ref_i_with_stripe(prev_iter + i, 0.0));
    out.avgDirection = pack(0.0);
    return out;
  }

  let total_iter = prev_iter + i;

  if (escaped) {
    out.iter      = pack(total_iter);
    out.genuine   = pack(1.0);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(shadingHeight);
    out.dzy       = pack(shadingAngle);
    out.ref_i     = pack(ref_i_with_stripe(0.0, 0.0));
    out.avgDirection = pack(0.0);
    return out;
  }

  if (total_iter >= mandelbrot.globalMaxIter && mandelbrot.orbitComplete >= 0.5) {
    out.iter      = pack(0.0);
    out.genuine   = pack(1.0);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(derPolarOut.x);
    out.dzy       = pack(derPolarOut.y);
    out.ref_i     = pack(ref_i_with_stripe(total_iter, 0.0));
    out.avgDirection = pack(0.0);
    return out;
  }

  // Budget exhausted mid-progress: park dz as normalized mantissa in zx/zy
  // (|m|\xb2 < 2 < mu keeps the continuation test valid) + exponent in avgDirection.
  let dzN = fe_renorm(dz);
  out.iter      = pack(total_iter);
  out.genuine   = pack(1.0);
  out.zx        = pack(dzN.m.x);
  out.zy        = pack(dzN.m.y);
  out.dzx       = pack(derPolarOut.x);
  out.dzy       = pack(derPolarOut.y);
  out.ref_i     = pack(ref_i_with_stripe(f32(ref_i), 0.0));
  out.avgDirection = pack(f32(dzN.e));
  return out;
}

// ── brush logic (verbatim from reproject.wgsl, texel-local subset) ──
fn rotate(v: vec2<f32>, angle: f32) -> vec2<f32> {
  let s = sin(angle);
  let c = cos(angle);
  return vec2<f32>(c * v.x - s * v.y, s * v.x + c * v.y);
}

fn is_inside_rotated_screen(xy_neutral: vec2<f32>) -> bool {
  let neutralExtent = sqrt(brush.aspect * brush.aspect + 1.0);
  let local_rot = xy_neutral * neutralExtent;
  let local = rotate(local_rot, -brush.angle);
  let inside_x = abs(local.x) <= brush.aspect;
  let inside_y = abs(local.y) <= 1.0;
  return inside_x && inside_y;
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

  if (brush.allowRefinement < 0.5) {
    return s;
  }

  let minStep = i32(brush.minBrushStep);
  let next_step = max(max(1, minStep), step / 2);

  if (next_step >= step) {
    return s;
  }

  let gx = i32(brush.gridOffsetX);
  let gy = i32(brush.gridOffsetY);
  let is_anchor = (((coord_out.x - gx) % next_step + next_step) % next_step == 0)
               && (((coord_out.y - gy) % next_step + next_step) % next_step == 0);
  return select(-f32(next_step), -1.0, is_anchor);
}

// ── fused compute entry ─────────────────────────────────────────────
// Workgroup-local partial counters (pattern from count_unfinished.wgsl):
// each 16\xd716 workgroup reduces locally and issues at most two global
// atomicAdds.  Barriers stay in uniform control flow — the per-texel work
// is wrapped in ifs, never early-returned.
var<workgroup> wgCount: atomic<u32>;
var<workgroup> wgActive: atomic<u32>;

@compute @workgroup_size(16, 16)
fn cs_main(
  @builtin(global_invocation_id) gid: vec3<u32>,
  @builtin(local_invocation_index) lidx: u32,
) {
  if (lidx == 0u) {
    atomicStore(&wgCount, 0u);
    atomicStore(&wgActive, 0u);
  }
  workgroupBarrier();

  // Post-iteration classification of this texel (for the fused counter).
  var needs = false;
  var isActive = false;

  let dims = textureDimensions(raw);
  if (gid.x < dims.x && gid.y < dims.y) {
    // Same uv convention as the fragment passes: uv.y=0 is the bottom row.
    let uv = vec2<f32>(
      (f32(gid.x) + 0.5) / f32(dims.x),
      1.0 - (f32(gid.y) + 0.5) / f32(dims.y),
    );
    let xy_neutral = uv * 2.0 - vec2<f32>(1.0);

    // Outside the rotated viewport: keep as-is, count nothing.
    if (is_inside_rotated_screen(xy_neutral)) {
      let coord = vec2<i32>(i32(gid.x), i32(gid.y));

      // ── brush stage: sentinel refinement (texel-local) ─────────────
      var iter_val = loadLayer(coord, 0);
      if (iter_val < 0.0) {
        let refined = refine_sentinel(iter_val, coord);
        if (refined != iter_val) {
          textureStore(raw, coord, 0, pack(refined));
        }
        iter_val = refined;
      }

      // ── mandelbrot stage: iterate active texels only ───────────────
      // Layer 2/3 values of the post-iteration state, for the counter's
      // continuation test (same reads count_unfinished.wgsl would do).
      var zx = 0.0;
      var zy = 0.0;
      var zLoaded = false;

      // globalMaxIter == 0 → no orbit data yet: pure pass-through,
      // sentinels stay as-is (same guard as mandelbrot.wgsl fs_main).
      if (mandelbrot.globalMaxIter > 0.0) {
        let is_compute_request = (iter_val == -1.0);
        var needs_continuation = false;
        if (!is_compute_request && iter_val > 0.0) {
          zx = loadLayer(coord, 2);
          zy = loadLayer(coord, 3);
          zLoaded = true;
          needs_continuation = (zx * zx + zy * zy) < mandelbrot.mu;
        }

        if (is_compute_request || needs_continuation) {
          let neutralExtent = sqrt(mandelbrot.aspect * mandelbrot.aspect + 1.0);
          // AA sub-pixel jitter (neutral-space units); zero for sample 0 / AA off.
          let local_rot = xy_neutral * neutralExtent + vec2<f32>(mandelbrot.aaOffsetX, mandelbrot.aaOffsetY);

          var result: TexelOut;
          let scaleExp = i32(mandelbrot.scaleExp);
          if (scaleExp <= DEEP_EXP) {
            // Deep path: scale/cx/cy carry fe mantissas sharing exponent scaleExp;
            // dc = local\xb7scaleMant + (cxMant, cyMant) is a single same-exponent add.
            let dc = fe_renorm(fe(local_rot * mandelbrot.scale + vec2<f32>(mandelbrot.cx, mandelbrot.cy), scaleExp));
            if (is_compute_request) {
              result = mandelbrot_compute_deep(dc, 0.0, vec2<f32>(0.0), 0, 0, 0.0, LOG_DER_ZERO);
            } else {
              // Deep continuation: layers 2/3 hold the dz mantissa, layer 7 its exponent.
              let dz_e = i32(loadLayer(coord, 7));
              let stored_dzx = loadLayer(coord, 4);
              let stored_dzy = loadLayer(coord, 5);
              let prev_ref_i = decode_ref_i(loadLayer(coord, 6));
              result = mandelbrot_compute_deep(dc, iter_val, vec2<f32>(zx, zy), dz_e, prev_ref_i, stored_dzx, stored_dzy);
            }
          } else {
            let x0 = local_rot.x * mandelbrot.scale + mandelbrot.cx;
            let y0 = local_rot.y * mandelbrot.scale + mandelbrot.cy;
            if (is_compute_request) {
              result = mandelbrot_compute(x0, y0, 0.0, 0.0, 0.0, 0.0, LOG_DER_ZERO, 0.0, 0.0);
            } else {
              let stored_dzx = loadLayer(coord, 4);
              let stored_dzy = loadLayer(coord, 5);
              let prev_ref_i = loadLayer(coord, 6);
              let prev_avg_direction = loadLayer(coord, 7);
              result = mandelbrot_compute(x0, y0, iter_val, zx, zy, stored_dzx, stored_dzy, prev_ref_i, prev_avg_direction);
            }
          }
          storeTexel(coord, result);

          // Count the written (post-iteration) state.
          iter_val = result.iter.r;
          zx = result.zx.r;
          zy = result.zy.r;
          zLoaded = true;
        }
      }

      // ── count stage (same classification as count_unfinished.wgsl) ──
      if (iter_val < 0.0) {
        needs = true;
        isActive = iter_val == -1.0;
      } else if (iter_val > 0.0) {
        if (!zLoaded) {
          zx = loadLayer(coord, 2);
          zy = loadLayer(coord, 3);
        }
        let needs_continuation = (zx * zx + zy * zy) < mandelbrot.mu;
        needs = needs_continuation;
        isActive = needs_continuation;
      }
    }
  }

  if (needs) {
    atomicAdd(&wgCount, 1u);
  }
  if (isActive) {
    atomicAdd(&wgActive, 1u);
  }
  workgroupBarrier();

  if (lidx == 0u) {
    let c = atomicLoad(&wgCount);
    let a = atomicLoad(&wgActive);
    if (c > 0u) {
      atomicAdd(&counter.count, c);
    }
    if (a > 0u) {
      atomicAdd(&counter.active_count, a);
    }
  }
}
`,_r=`struct Uniforms {
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
  debugShading: f32,
  heightPaletteShift: f32,
  orbitTrapStrength: f32,
  phaseColoringStrength: f32,
  textureMappingXVariable: f32,
  textureMappingYVariable: f32,
  textureMappingXScale: f32,
  textureMappingYScale: f32,
  textureMappingMirror: f32,
  centerX: f32,
  centerY: f32,
  scale: f32,
  _pad: f32,
  textureDriftX: f32,
  textureDriftY: f32,
  skyDriftX: f32,
  skyDriftY: f32,
  paletteOffsetAnimation: f32,
  heightPaletteShiftAnimation: f32,
  lightAngleAnimation: f32,
  textureDriftAnimation: f32,
  skyReflectionDriftAnimation: f32,
  phaseColoringAnimation: f32,
  varnishAnimation: f32,
  microBumpAnimation: f32,
  displacementAnimation: f32,
  tessellationAnimation: f32,
  aaSampleIndex: f32,    // current AA sample index (for the per-pixel accumulation gate)
  antialiasLevel: f32,   // max AA samples (for the debug sample-count visualization)
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
@group(0) @binding(9) var aaTargetTex: texture_2d<f32>; // per-neutral-texel AA target sample count (r32float)

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
  return fract(parameters.paletteOffset);
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
  e.wDirectionCoherenceRelief = clamp(row5.a, 0.0, 100.0);

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

fn fake_subsurface_scattering(color: vec3<f32>, normal: vec3<f32>, lightDir: vec3<f32>, nDotV: f32, ao: f32, edgeWear: f32, metallic: f32, strength: f32, distanceHeight: f32, slope: f32) -> vec3<f32> {
  let backLight = pow(max(dot(normal, -lightDir), 0.0), 1.35);
  let rimScatter = pow(clamp(1.0 - nDotV, 0.0, 1.0), 2.15);
  let wrapBase = clamp(dot(normal, lightDir) * 0.5 + 0.5, 0.0, 1.0);
  let wrapLight = wrapBase * wrapBase;
  let heightThinness = 1.0 - smoothstep(4.0, 13.0, distanceHeight);
  let slopeThinness = smoothstep(0.15, 1.6, slope);
  let thinness = clamp(heightThinness * 0.55 + slopeThinness * 0.45, 0.0, 1.0);
  let thickness = clamp(thinness * 0.62 + (1.0 - ao) * 0.23 + edgeWear * 0.15, 0.0, 1.0);
  let mask = (backLight * 0.35 + rimScatter * 0.25 + wrapLight * 0.40) * thickness;
  let scatterColor = mix(color, sqrt(max(color, vec3<f32>(0.0))), 0.35);
  return scatterColor * mask * clamp(strength, 0.0, 10.0) * (1.0 - metallic);
}

fn tile_tessellation(tex_: texture_2d<f32>, v: f32, dist: f32, repeat: f32) -> vec4<f32> {
  let tileUV = vec2<f32>(fract(v * repeat), fract(dist * repeat));
  let tileIndex = vec2<i32>(i32(floor(v * repeat)), i32(floor(dist * repeat)));

  let useMirror = parameters.textureMappingMirror > 0.5;
  let mirrorX = useMirror && (abs(tileIndex.x) % 2 == 1);
  let mirrorY = useMirror && (abs(tileIndex.y) % 2 == 1);
  let uv = vec2<f32>(
    select(tileUV.x, 1.0 - tileUV.x, mirrorX),
    select(tileUV.y, 1.0 - tileUV.y, mirrorY)
  );
  let texSize = vec2<i32>(textureDimensions(tex_, 0));
  let coord = vec2<i32>(
    i32(clamp(uv.x * f32(texSize.x), 0.0, f32(texSize.x - 1))),
    i32(clamp((1.0 - uv.y) * f32(texSize.y), 0.0, f32(texSize.y - 1)))
  );
  return textureLoad(tex_, coord, 0);
}

fn texture_mapping_value(variableId: f32, iterRaw: f32, v_smooth: f32, z: vec2<f32>, distanceHeightStored: f32, angle_der: f32, dx: f32, dy: f32, tess_depth: f32, disp: f32) -> f32 {
  let id = i32(variableId + 0.5);
  let z_len = max(length(z), 1e-12);
  if (id == 0) {
    return tess_depth * 2.0 * disp + dx;
  }
  if (id == 1) {
    return tess_depth * 2.0 * disp + dy;
  }
  if (id == 2) {
    let log_mu = log(max(parameters.mu, 1.0));
    let u = 2.0 * log(z_len) / max(log_mu, 1e-6);
    return u - iterRaw;
  }
  if (id == 3) {
    return sin(angle_der);
  }
  if (id == 4) {
    return dx;
  }
  if (id == 5) {
    return dy;
  }
  if (id == 7) {
    return v_smooth;
  }
  if (id == 8) {
    return distance_height_from_values(iterRaw, z.x, z.y, distanceHeightStored);
  }
  return tess_depth * 2.0 * disp + dx;
}

fn visible_tile_rgb(tile: vec4<f32>) -> vec3<f32> {
  return tile.rgb * tile.a;
}

fn texture_bump_normal(tex_: texture_2d<f32>, normal: vec3<f32>, tangent: vec3<f32>, bitangent: vec3<f32>, v: f32, dist: f32, repeat: f32, strength: f32) -> vec3<f32> {
  let safeRepeat = max(repeat, 0.1);
  let stepSize = 1.0 / (safeRepeat * 96.0);
  let lpx = luminance(visible_tile_rgb(tile_tessellation(tex_, v + stepSize, dist, repeat)));
  let lnx = luminance(visible_tile_rgb(tile_tessellation(tex_, v - stepSize, dist, repeat)));
  let lpy = luminance(visible_tile_rgb(tile_tessellation(tex_, v, dist + stepSize, repeat)));
  let lny = luminance(visible_tile_rgb(tile_tessellation(tex_, v, dist - stepSize, repeat)));
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

fn surface_cavity(grad: vec2<f32>, lightDir: vec3<f32>, tangent: vec3<f32>, bitangent: vec3<f32>, relief: f32, occStrength: f32) -> f32 {
  let lightPlane = vec2<f32>(dot(lightDir, tangent), dot(lightDir, bitangent));
  let lightPlaneLen = length(lightPlane);
  if (lightPlaneLen < 1e-4 || occStrength <= 0.0 || relief <= 0.0) {
    return 1.0;
  }

  let lightPlaneDir = lightPlane / lightPlaneLen;
  let crossDir = vec2<f32>(-lightPlaneDir.y, lightPlaneDir.x);
  let uphillTowardLight = max(dot(grad, lightPlaneDir), 0.0);
  let sideCavity = abs(dot(grad, crossDir)) * 0.18;
  let amount = smoothstep(0.04, 1.45, (uphillTowardLight + sideCavity) * relief) * occStrength;
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

struct PixelState {
  iter: f32,
  zx: f32,
  zy: f32,
};

fn load_pixel_state(sourceTex: texture_2d_array<f32>, coord: vec2<i32>) -> PixelState {
  var state: PixelState;
  state.iter = textureLoad(sourceTex, coord, 0, 0).r;
  state.zx = textureLoad(sourceTex, coord, 2, 0).r;
  state.zy = textureLoad(sourceTex, coord, 3, 0).r;
  return state;
}

fn distance_height_from_values(iterVal: f32, zx: f32, zy: f32, storedHeight: f32) -> f32 {
  if (escape_nu(iterVal, zx, zy) < 0.0) {
    return -1e6;
  }

  return clamp(storedHeight, -64.0, 64.0);
}

fn distance_height_scale_offset(zoomFactor: f32) -> f32 {
  return -log(max(zoomFactor, 1e-30));
}

fn distance_height_gradient_scale(zoomFactor: f32) -> f32 {
  return 1.0 / max(zoomFactor, 1e-30);
}

fn sample_distance_height_at_coord(sourceTex: texture_2d_array<f32>, coord: vec2<i32>, texSize: vec2<i32>, heightOffset: f32) -> f32 {
  if (coord.x < 0 || coord.x >= texSize.x || coord.y < 0 || coord.y >= texSize.y) {
    return -1e6;
  }
  let state = load_pixel_state(sourceTex, coord);
  let storedHeight = textureLoad(sourceTex, coord, 4, 0).r + heightOffset;
  return distance_height_from_values(state.iter, state.zx, state.zy, storedHeight);
}

fn distance_height_gradient_at_coord(sourceTex: texture_2d_array<f32>, coord: vec2<i32>, texSize: vec2<i32>, centerHeight: f32, heightOffset: f32, gradientScale: f32) -> vec2<f32> {
  let xr = sample_distance_height_at_coord(sourceTex, coord + vec2<i32>(1, 0), texSize, heightOffset);
  let xl = sample_distance_height_at_coord(sourceTex, coord - vec2<i32>(1, 0), texSize, heightOffset);
  let yu = sample_distance_height_at_coord(sourceTex, coord + vec2<i32>(0, 1), texSize, heightOffset);
  let yd = sample_distance_height_at_coord(sourceTex, coord - vec2<i32>(0, 1), texSize, heightOffset);
  let rightHeight = select(centerHeight, xr, xr > -1e5);
  let leftHeight = select(centerHeight, xl, xl > -1e5);
  let upHeight = select(centerHeight, yu, yu > -1e5);
  let downHeight = select(centerHeight, yd, yd > -1e5);
  return vec2<f32>(rightHeight - leftHeight, upHeight - downHeight) * 12.0 * gradientScale;
}

fn smooth_escape_fraction(z_sq: f32) -> f32 {
  let log_z2 = log(max(z_sq, 1e-12));
  let logMu = max(parameters.logMu, 1e-6);
  return 1.0 - log(max(log_z2 / logMu, 1e-12)) / log(2.0);
}

fn palette(sourceTex: texture_2d_array<f32>, sourceCoord: vec2<i32>, sourceTexSize: vec2<i32>, iterRaw: f32, v: f32, v_smooth: f32, z: vec2<f32>, distanceHeightStored: f32, distanceHeightOffset: f32, distanceHeightGradientScale: f32, angle_der: f32, stripeAverage: f32, directionCoherence: f32, dx: f32, dy: f32, uv_tex: vec2<f32>, magnified: bool) -> vec3<f32> {
  let paletteRepeat = max(parameters.palettePeriod, 0.0001);
  let deep = v * 2.0;
  let heightPhaseShift = clamp(distanceHeightStored, -16.0, 16.0) * (clamp(parameters.heightPaletteShift, 0.0, 100.0) / 16.0);
  let phaseColoringShift = (1.0 - abs(fract(angle_der / (2.0 * 3.141592653589793)) * 2.0 - 1.0)) * parameters.phaseColoringStrength;
  let palettePhase = palettePhaseFromRaw(deep / paletteRepeat + animatedPaletteOffset() + heightPhaseShift + phaseColoringShift);

  // ── Sample all effect channels from the palette texture ──
  let fx = sampleEffects(palettePhase);

  var effTess = fx.wTessellation;
  let effWebcam = fx.wWebcam;
  let effShading = fx.wShading;

    // ── Blend color sources using overlay/opacity model ──
    // Palette is always the base. Other sources overlay on top with their weight as opacity.
    var color = fx.paletteColor * fx.wPalette;

  // ── Tessellation depth: always smooth, independent of palette period ──
  let tess_depth = v_smooth * 2.0;
  let disp = parameters.displacementAmount;
  var tess_u = 0.0;
  var tess_v = 0.0;

  tess_u = texture_mapping_value(parameters.textureMappingXVariable, iterRaw, v_smooth, z, distanceHeightStored, angle_der, dx, dy, tess_depth, disp) * parameters.textureMappingXScale;
  tess_v = texture_mapping_value(parameters.textureMappingYVariable, iterRaw, v_smooth, z, distanceHeightStored, angle_der, dx, dy, tess_depth, disp) * parameters.textureMappingYScale;

  let tile_drift = vec2<f32>(parameters.textureDriftX, parameters.textureDriftY);



  // Tessellation: overlay on top of palette color
  if (effTess > 0.001) {
    let tessSample = tile_tessellation(tileTex, tess_u + tile_drift.x, tess_v + tile_drift.y, parameters.tessellationLevel);
    color = mix(color, tessSample.rgb, clamp(effTess * tessSample.a, 0.0, 1.0));
  }

  // Webcam: overlay on top of current result
  if (effWebcam > 0.001) {
    let webCamColor = tile_tessellation(
      webcamTex,
      tess_u + tile_drift.x,
      tess_v + tile_drift.y,
      parameters.tessellationLevel
    );
    color = mix(color, webCamColor.rgb, effWebcam);
  }

  if (fx.wStripeAverage > 0.001) {
    color = mix(color, samplePaletteColor(fract(stripeAverage)), fx.wStripeAverage);
  }
  if (fx.wRotationMean > 0.001) {
    color = mix(color, samplePaletteColor(fract(directionCoherence)), fx.wRotationMean);
  }

  let orbitTrapStrength = clamp(parameters.orbitTrapStrength, 0.0, 100.0) / 100.0;
  if (orbitTrapStrength > 0.001) {
    let escapeRadius = sqrt(max(parameters.mu, 1e-6));
    let trapZ = z / escapeRadius;
    let axisTrap = min(abs(trapZ.x), abs(trapZ.y));
    let diagonalTrap = min(abs(trapZ.x - trapZ.y), abs(trapZ.x + trapZ.y)) * 0.70710678;
    let circleTrap = abs(length(trapZ) - 1.0);
    let trapDistance = min(axisTrap, min(diagonalTrap * 0.72, circleTrap * 0.85));
    let trapWidth = mix(0.012, 0.16, orbitTrapStrength);
    let trapMask = exp(-(trapDistance * trapDistance) / max(trapWidth * trapWidth, 1e-5));
    let trapColor = samplePaletteColor(fract(palettePhase + 0.18));
    color = mix(color, mix(color, trapColor, 0.72) + trapMask * 0.12, trapMask * orbitTrapStrength);
  }

  // ── Shading (always computed, applied proportionally to wShading) ──
  if (effShading > 0.001) {
    let angleDir = vec2<f32>(cos(angle_der), sin(angle_der));
    let reliefDepth = parameters.reliefDepth * effShading;
    let relief = clamp(reliefDepth, 0.0, 2.0);
    let surfaceRelief = relief * 0.5;
    let occStrength = pow(clamp(parameters.localShadowStrength, 0.0, 10.0), 1.15);
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
      var fractalGradient: vec2<f32>;
      if (magnified) {
        fractalGradient = distance_height_gradient_bilinear(sourceTex, uv_tex, sourceTexSize, distanceHeight, distanceHeightOffset, distanceHeightGradientScale);
      } else {
        fractalGradient = distance_height_gradient_at_coord(sourceTex, sourceCoord, sourceTexSize, distanceHeight, distanceHeightOffset, distanceHeightGradientScale);
      }
      grad = clamp(fractalGradient, vec2<f32>(-6.0), vec2<f32>(6.0));
      slope = length(grad);
    }
    if (needsStripeGradient) {
      if (magnified) {
        stripeGrad = stripe_gradient_bilinear(sourceTex, uv_tex, sourceTexSize, stripeAverage);
      } else {
        stripeGrad = stripe_gradient_at_coord(sourceTex, sourceCoord, sourceTexSize, stripeAverage);
      }
    }
    if (needsDirectionCoherenceGradient) {
      if (magnified) {
        directionCoherenceGrad = direction_coherence_gradient_bilinear(sourceTex, uv_tex, sourceTexSize, directionCoherence);
      } else {
        directionCoherenceGrad = direction_coherence_gradient_at_coord(sourceTex, sourceCoord, sourceTexSize, directionCoherence);
      }
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
    let lightDir = vec3<f32>(parameters.lightDirX, parameters.lightDirY, parameters.lightDirZ);
    let cavity = min(surface_cavity(grad, lightDir, baseTangentWorld, baseBitangentWorld, relief, occStrength), normalCavity);
    let cavityAmount = 1.0 - cavity;
    let ao = min(pseudo_ambient_occlusion(normal, v_smooth, z), mix(heightAo, 1.0, 0.45));
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
    let reliefAccent = clamp(occStrength * effShading, 0.0, 2.0);
    let ridge = smoothstep(0.10, 1.55, slope * relief) * litSide * reliefAccent;
    let cavityTint = mix(color, sqrt(max(color, vec3<f32>(0.0))), 0.42);
    materialColor = mix(materialColor, materialColor * cavityTint, cavityAmount * reliefAccent * 0.22);
    materialColor += mix(color, vec3<f32>(1.0), 0.38) * ridge * 0.16 * (1.0 - metallic * 0.45);

    let varnish = clamp(parameters.varnishStrength, 0.0, 10.0) * 0.1;
    if (varnish > 0.001) {
      let wetDarken = mix(1.0, 0.78, varnish);
      let wetTint = mix(color, color * vec3<f32>(0.86, 0.90, 0.96), varnish * 0.35);
      let coatPower = mix(110.0, 260.0, varnish) * mix(1.0, 0.75, roughness);
      let coatFresnel = fresnel_schlick(nDotV, vec3<f32>(0.025));
      let coatLobe = pow(max(nDotH, 0.0), coatPower) * (0.20 + 0.80 * shadowedNDotL) * ao;
      let coatHighlight = coatFresnel * coatLobe * (0.30 + 0.85 * varnish) * (1.0 - metallic * 0.25);
      materialColor = mix(materialColor * wetDarken, wetTint, varnish * 0.25);
      materialColor += coatHighlight;
    }

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
        distanceHeight,
        slope
      );
    }

    var envColor = vec3<f32>(0.0);
    if (fx.wSkybox > 0.001) {
      let skyboxDir = reflect(-viewDir, normal);
      let skyboxColor = rough_skybox_reflection(skyboxDir, tangent, bitangent, roughness, dx + parameters.skyDriftX, dy + parameters.skyDriftY);
      let fresnelEnv = fresnel_schlick(nDotV, f0);
      let fresnelReflection = clamp(luminance(fresnelEnv), 0.0, 1.0);
      let polishReflection = 0.10 * varnish * (1.0 - roughness * 0.55) * (1.0 - metallic * 0.35);
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

    materialColor *= mix(1.0, cavity, 0.22);

    let pbrColor = (materialColor + envColor * mix(1.0, cavity, 0.16) + rimColor) * (0.55 + brightness * 0.45);
    color = mix(color * mix(ao, 1.0, 0.35), pbrColor, effShading);
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
  let logMu = max(parameters.logMu, 1e-6);
  let mu_val = clamp(1.0 - log(max(log_z2 / logMu, 1e-12)) / log(2.0), 0.0, 1.0);
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
  let state = load_pixel_state(sourceTex, coord);
  if (escape_nu(state.iter, state.zx, state.zy) < 0.0) {
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

struct PixelExtras {
  der_x: f32,
  der_y: f32,
  refWithStripe: f32,
  avgDirection: f32,
};

struct PixelSample {
  iter: f32,
  step: f32,
  zx: f32,
  zy: f32,
};

fn load_pixel_sample(sourceTex: texture_2d_array<f32>, coord: vec2<i32>) -> PixelSample {
  var pixelSample: PixelSample;
  pixelSample.iter = textureLoad(sourceTex, coord, 0, 0).r;
  pixelSample.step = textureLoad(sourceTex, coord, 1, 0).r;
  if (pixelSample.iter > 0.0) {
    pixelSample.zx = textureLoad(sourceTex, coord, 2, 0).r;
    pixelSample.zy = textureLoad(sourceTex, coord, 3, 0).r;
  } else {
    pixelSample.zx = 0.0;
    pixelSample.zy = 0.0;
  }
  return pixelSample;
}

fn load_pixel_extras(sourceTex: texture_2d_array<f32>, coord: vec2<i32>) -> PixelExtras {
  var extras: PixelExtras;
  extras.der_x = textureLoad(sourceTex, coord, 4, 0).r;
  extras.der_y = textureLoad(sourceTex, coord, 5, 0).r;
  extras.refWithStripe = textureLoad(sourceTex, coord, 6, 0).r;
  extras.avgDirection = textureLoad(sourceTex, coord, 7, 0).r;
  return extras;
}

fn direction_coherence_at_coord(sourceTex: texture_2d_array<f32>, coord: vec2<i32>, texSize: vec2<i32>) -> f32 {
  if (coord.x < 0 || coord.x >= texSize.x || coord.y < 0 || coord.y >= texSize.y) {
    return -1e6;
  }
  let state = load_pixel_state(sourceTex, coord);
  if (escape_nu(state.iter, state.zx, state.zy) < 0.0) {
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

// ── Bilinear (magnified) variants of the gradient functions ─────────
// When the source texture is magnified on screen, the per-texel finite
// differences above produce normals that are constant inside each texel
// (faceted relief).  These variants compute the analytic gradient of the
// bilinearly-interpolated field instead: continuous inside each cell.
// The 1-texel-span cell differences are scaled \xd72 to match the magnitude
// of the 2-texel-span central differences used by the nearest variants.

struct BilinearCell {
  base: vec2<i32>,
  f: vec2<f32>,
};

fn bilinear_cell(uv: vec2<f32>, texSize: vec2<i32>) -> BilinearCell {
  let texSizeF = vec2<f32>(f32(texSize.x), f32(texSize.y));
  let p = vec2<f32>(uv.x * texSizeF.x, (1.0 - uv.y) * texSizeF.y) - vec2<f32>(0.5);
  let baseF = floor(p);
  var cell: BilinearCell;
  cell.base = vec2<i32>(i32(baseF.x), i32(baseF.y));
  cell.f = p - baseF;
  return cell;
}

fn distance_height_gradient_bilinear(sourceTex: texture_2d_array<f32>, uv: vec2<f32>, texSize: vec2<i32>, centerHeight: f32, heightOffset: f32, gradientScale: f32) -> vec2<f32> {
  let cell = bilinear_cell(uv, texSize);
  let h00r = sample_distance_height_at_coord(sourceTex, cell.base, texSize, heightOffset);
  let h10r = sample_distance_height_at_coord(sourceTex, cell.base + vec2<i32>(1, 0), texSize, heightOffset);
  let h01r = sample_distance_height_at_coord(sourceTex, cell.base + vec2<i32>(0, 1), texSize, heightOffset);
  let h11r = sample_distance_height_at_coord(sourceTex, cell.base + vec2<i32>(1, 1), texSize, heightOffset);
  let h00 = select(centerHeight, h00r, h00r > -1e5);
  let h10 = select(centerHeight, h10r, h10r > -1e5);
  let h01 = select(centerHeight, h01r, h01r > -1e5);
  let h11 = select(centerHeight, h11r, h11r > -1e5);
  let gx = mix(h10 - h00, h11 - h01, cell.f.y);
  let gy = mix(h01 - h00, h11 - h10, cell.f.x);
  return vec2<f32>(gx, gy) * 24.0 * gradientScale;
}

fn stripe_gradient_bilinear(sourceTex: texture_2d_array<f32>, uv: vec2<f32>, texSize: vec2<i32>, centerStripe: f32) -> vec2<f32> {
  let cell = bilinear_cell(uv, texSize);
  let s00r = stripe_at_coord(sourceTex, cell.base, texSize);
  let s10r = stripe_at_coord(sourceTex, cell.base + vec2<i32>(1, 0), texSize);
  let s01r = stripe_at_coord(sourceTex, cell.base + vec2<i32>(0, 1), texSize);
  let s11r = stripe_at_coord(sourceTex, cell.base + vec2<i32>(1, 1), texSize);
  let s00 = select(centerStripe, s00r, s00r > -1e5);
  let s10 = select(centerStripe, s10r, s10r > -1e5);
  let s01 = select(centerStripe, s01r, s01r > -1e5);
  let s11 = select(centerStripe, s11r, s11r > -1e5);
  let gx = mix(stripe_phase_delta(s10, s00), stripe_phase_delta(s11, s01), cell.f.y);
  let gy = mix(stripe_phase_delta(s01, s00), stripe_phase_delta(s11, s10), cell.f.x);
  return vec2<f32>(gx, gy) * 16.0;
}

fn direction_coherence_gradient_bilinear(sourceTex: texture_2d_array<f32>, uv: vec2<f32>, texSize: vec2<i32>, centerCoherence: f32) -> vec2<f32> {
  let cell = bilinear_cell(uv, texSize);
  let c00r = direction_coherence_at_coord(sourceTex, cell.base, texSize);
  let c10r = direction_coherence_at_coord(sourceTex, cell.base + vec2<i32>(1, 0), texSize);
  let c01r = direction_coherence_at_coord(sourceTex, cell.base + vec2<i32>(0, 1), texSize);
  let c11r = direction_coherence_at_coord(sourceTex, cell.base + vec2<i32>(1, 1), texSize);
  let c00 = select(centerCoherence, c00r, c00r > -1e5);
  let c10 = select(centerCoherence, c10r, c10r > -1e5);
  let c01 = select(centerCoherence, c01r, c01r > -1e5);
  let c11 = select(centerCoherence, c11r, c11r > -1e5);
  let gx = mix(c10 - c00, c11 - c01, cell.f.y);
  let gy = mix(c01 - c00, c11 - c10, cell.f.x);
  return vec2<f32>(gx, gy) * 16.0;
}

fn direction_coherence_normal(normal: vec3<f32>, tangent: vec3<f32>, bitangent: vec3<f32>, grad: vec2<f32>, strength: f32) -> vec3<f32> {
  let bump = tangent * grad.x + bitangent * grad.y;
  return normalize(normal - bump * clamp(strength, 0.0, 100.0) * 0.75);
}

fn debug_mirror_phase(t: f32) -> f32 {
  return 1.0 - abs(fract(t) * 2.0 - 1.0);
}

fn debug_heat(t: f32) -> vec3<f32> {
  let x = debug_mirror_phase(t);
  return clamp(vec3<f32>(x * 2.0 - 0.25, 1.0 - abs(x * 2.0 - 1.0), 1.25 - x * 2.0), vec3<f32>(0.0), vec3<f32>(1.0));
}

fn debug_distance_scale(distance: f32) -> f32 {
  return (distance + 16.0) / 32.0;
}

fn debug_gradient_scale(gradientLength: f32) -> f32 {
  return gradientLength / 6.0;
}

fn debug_wheel_sector(uv: vec2<f32>) -> i32 {
  let centered = uv - vec2<f32>(0.5);
  let angle = atan2(centered.y, centered.x);
  let phase = fract(angle / (2.0 * 3.141592653589793) + 1.0);
  return i32(floor(phase * 5.0));
}

// ── Colorize a single pixel from its raw layer values ──────────────
fn colorize_pixel(
  sourceTex: texture_2d_array<f32>,
  sourceCoord: vec2<i32>,
  sourceTexSize: vec2<i32>,
  iter_val: f32, zx_val: f32, zy_val: f32,
  extras: PixelExtras,
  uv_screen: vec2<f32>,
  uv_neutral: vec2<f32>,
  distanceHeightOffset: f32,
  distanceHeightGradientScale: f32,
  uv_tex: vec2<f32>,
  magnified: bool
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
  let mu_val = smooth_escape_fraction(z_sq);

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
  let distanceHeightStored = extras.der_x + distanceHeightOffset;
  let angle_der = extras.der_y;

  if (parameters.debugShading >= 0.5) {
    let sector = debug_wheel_sector(uv_screen);
    if (sector == 0) {
      return vec4<f32>(debug_heat(fract(nu_smooth * 0.125)), 1.0);
    }
    if (sector == 1) {
      let distanceHeight = distance_height_from_values(iter_val, z.x, z.y, distanceHeightStored);
      return vec4<f32>(debug_heat(debug_distance_scale(distanceHeight)), 1.0);
    }
    if (sector == 2) {
      let distanceHeight = distance_height_from_values(iter_val, z.x, z.y, distanceHeightStored);
      let grad = distance_height_gradient_at_coord(sourceTex, sourceCoord, sourceTexSize, distanceHeight, distanceHeightOffset, distanceHeightGradientScale);
      return vec4<f32>(debug_heat(debug_gradient_scale(length(grad))), 1.0);
    }
    if (sector == 3) {
      return vec4<f32>(debug_heat(fract(angle_der / (2.0 * 3.141592653589793) + 0.5)), 1.0);
    }
    // sector 4: AA per-pixel sample-count tiers. Blue = 1 sample, warm = up to
    // antialiasLevel. Reads the actual baked target map (so a bake bug shows here);
    // if not baked yet (AA hasn't run), computes the intended target on the fly so
    // the view is always meaningful.
    var aaN = textureLoad(aaTargetTex, sourceCoord, 0).r;
    if (aaN < 1.0) {
      aaN = 1.0;
      if (iter_val > 0.0) {
        // Mirror aa_target.wgsl: de_px = (H/2)\xb7exp(-height); ramp 1..L over [R_FULL, R_OUT].
        let neutralExtent = sqrt(parameters.aspect * parameters.aspect + 1.0);
        let hTexels = f32(sourceTexSize.y) / neutralExtent;
        let de_px = (hTexels * 0.5) * exp(-extras.der_x);
        let t = 1.0 - smoothstep(1.0, 6.0, de_px);
        aaN = clamp(round(1.0 + (parameters.antialiasLevel - 1.0) * t), 1.0, parameters.antialiasLevel);
      }
    }
    let aaT = (aaN - 1.0) / max(parameters.antialiasLevel - 1.0, 1.0);
    return vec4<f32>(debug_heat(aaT), 1.0);
  }

  let v = nu;
  let v_smooth = nu_smooth;
  let stripePhase = decode_stripe_phase(extras.refWithStripe);
  let directionCoherence = decode_direction_coherence(extras.avgDirection);
  var color = palette(sourceTex, sourceCoord, sourceTexSize, iter_val, v, v_smooth, z, distanceHeightStored, distanceHeightOffset, distanceHeightGradientScale, angle_der, stripePhase, directionCoherence, uv_neutral.x, uv_neutral.y, uv_tex, magnified);

  // Apply zebra after palette computation: darken even iterations
  color = color * (1.0 - wZebra * isEvenIter);

  return vec4<f32>(color, 1.0);
}

// ── Bilinear interpolation of magnified source textures ────────────
// When a source texture is magnified on screen (zoom factor > 1), nearest
// sampling shows each texel as a flat square.  These helpers rebuild a
// continuous pixel by bilinearly interpolating the 4 surrounding texels,
// using the same per-channel strategy as resolve.wgsl:
//   - nu interpolated continuously, re-encoded as iter = floor(nu) plus a
//     synthetic |z| that reproduces fract(nu) through smooth_escape_fraction;
//   - z direction interpolated as unit vectors;
//   - distance height lerped; derivative angle and stripe phase lerped
//     circularly; average orbit direction unpacked, lerped, repacked.
// Non-escaped corners (sentinel, inside, budget-exhausted, no data) are
// masked out; if they dominate, the caller keeps its nearest sample.

const TWO_PI: f32 = 6.283185307179586;

fn decode_avg_dir_vec(encoded: f32) -> vec2<f32> {
  let xq = floor(encoded / ORBIT_DIRECTION_BASE);
  let yq = encoded - xq * ORBIT_DIRECTION_BASE;
  return vec2<f32>(
    (xq / ORBIT_DIRECTION_SCALE - 0.5) * 2.0,
    (yq / ORBIT_DIRECTION_SCALE - 0.5) * 2.0,
  );
}

fn encode_avg_dir_vec(avgDir: vec2<f32>) -> f32 {
  let phase = clamp(avgDir * 0.5 + vec2<f32>(0.5), vec2<f32>(0.0), vec2<f32>(1.0));
  let xq = floor(phase.x * ORBIT_DIRECTION_SCALE + 0.5);
  let yq = floor(phase.y * ORBIT_DIRECTION_SCALE + 0.5);
  return xq * ORBIT_DIRECTION_BASE + yq;
}

struct InterpPixel {
  kind: i32, // 0 = not interpolable (caller keeps nearest), 1 = escaped interpolated
  iter: f32,
  zx: f32,
  zy: f32,
  step: f32, // finest resolution step among contributing corners (for compositing)
  extras: PixelExtras,
};

fn sample_escaped_bilinear(sourceTex: texture_2d_array<f32>, uv: vec2<f32>, texSize: vec2<i32>) -> InterpPixel {
  var out: InterpPixel;
  out.kind = 0;

  let texSizeF = vec2<f32>(f32(texSize.x), f32(texSize.y));
  let p = vec2<f32>(uv.x * texSizeF.x, (1.0 - uv.y) * texSizeF.y) - vec2<f32>(0.5);
  let baseF = floor(p);
  let f = p - baseF;
  let base = vec2<i32>(i32(baseF.x), i32(baseF.y));
  var offsets = array<vec2<i32>, 4>(
    vec2<i32>(0, 0), vec2<i32>(1, 0), vec2<i32>(0, 1), vec2<i32>(1, 1)
  );
  var weights = array<f32, 4>(
    (1.0 - f.x) * (1.0 - f.y),
    f.x * (1.0 - f.y),
    (1.0 - f.x) * f.y,
    f.x * f.y
  );

  var wEscaped = 0.0;
  var wInside = 0.0;
  var minStep = 1e30;
  // nu is accumulated relative to baseIter (the first escaped corner's
  // iteration count) to keep full f32 precision at deep zooms where
  // iteration counts are large.
  var baseIter = -1.0;
  var nuSum = 0.0;
  var distSum = 0.0;
  var zDirSum = vec2<f32>(0.0);
  var angleDirSum = vec2<f32>(0.0);
  var stripeDirSum = vec2<f32>(0.0);
  var avgDirSum = vec2<f32>(0.0);
  var bestW = -1.0;
  var bestRefInt = 0.0;
  var bestAngle = 0.0;
  var bestStripe = 0.0;

  for (var i = 0u; i < 4u; i = i + 1u) {
    let ccoord = clamp(base + offsets[i], vec2<i32>(0), texSize - vec2<i32>(1));
    let w = weights[i];
    let citer = textureLoad(sourceTex, ccoord, 0, 0).r;
    let cstep = textureLoad(sourceTex, ccoord, 1, 0).r;
    // Sentinel or no data: this corner simply contributes no weight.
    if (citer < 0.0 || cstep <= 0.0) {
      continue;
    }
    // Inside the set: tracked separately so the interior keeps priority
    // (interpolating escaped values over it would erode the set boundary).
    if (citer == 0.0) {
      wInside = wInside + w;
      continue;
    }
    let zx = textureLoad(sourceTex, ccoord, 2, 0).r;
    let zy = textureLoad(sourceTex, ccoord, 3, 0).r;
    let z_sq = zx * zx + zy * zy;
    if (z_sq < parameters.mu) {
      // Budget-exhausted: not displayable as escaped, contributes no weight.
      continue;
    }

    minStep = min(minStep, cstep);
    if (baseIter < 0.0) {
      baseIter = citer;
    }
    wEscaped = wEscaped + w;
    nuSum = nuSum + w * ((citer - baseIter) + clamp(smooth_escape_fraction(z_sq), 0.0, 1.0));
    distSum = distSum + w * textureLoad(sourceTex, ccoord, 4, 0).r;
    let angle = textureLoad(sourceTex, ccoord, 5, 0).r;
    angleDirSum = angleDirSum + w * vec2<f32>(cos(angle), sin(angle));
    let zLen = max(sqrt(z_sq), 1e-12);
    zDirSum = zDirSum + w * vec2<f32>(zx, zy) / zLen;
    let refVal = max(textureLoad(sourceTex, ccoord, 6, 0).r, 0.0);
    let stripePhase = fract(refVal);
    let stripeAngle = stripePhase * TWO_PI;
    stripeDirSum = stripeDirSum + w * vec2<f32>(cos(stripeAngle), sin(stripeAngle));
    avgDirSum = avgDirSum + w * decode_avg_dir_vec(textureLoad(sourceTex, ccoord, 7, 0).r);
    if (w > bestW) {
      bestW = w;
      bestRefInt = floor(refVal);
      bestAngle = angle;
      bestStripe = stripePhase;
    }
  }

  // The interior keeps priority over escaped interpolation (no halo inside
  // the set), but no-data / budget-exhausted corners do NOT block it: the
  // interpolation is then the only usable data for this pixel, which fills
  // the flat blocks that otherwise flash during frozen reprojection swaps.
  if (wEscaped <= 1e-6 || wInside > wEscaped) {
    return out;
  }

  let invW = 1.0 / wEscaped;
  let logMu = max(parameters.logMu, 1e-6);

  // nu → iter = floor(nu) + synthetic |z| reproducing fract(nu).
  // floor/fract are computed on the small relative value for f32 precision.
  let nuRel = nuSum * invW;
  let relFloor = floor(nuRel);
  var iterOut = baseIter + relFloor;
  var frac = clamp(nuRel - relFloor, 0.0, 0.9999);
  if (iterOut < 1.0) {
    iterOut = 1.0;
    frac = 0.0;
  }
  let log_z2 = logMu * exp2(1.0 - frac);
  let zLenOut = exp(0.5 * log_z2);
  let zDirLen = length(zDirSum);
  let zDir = select(vec2<f32>(1.0, 0.0), zDirSum / zDirLen, zDirLen > 1e-5);

  out.kind = 1;
  out.iter = iterOut;
  out.zx = zDir.x * zLenOut;
  out.zy = zDir.y * zLenOut;
  out.step = minStep;
  out.extras.der_x = distSum * invW;
  out.extras.der_y = select(bestAngle, atan2(angleDirSum.y, angleDirSum.x), length(angleDirSum) > 1e-5);
  let stripeOut = select(
    bestStripe,
    fract(atan2(stripeDirSum.y, stripeDirSum.x) / TWO_PI + 1.0),
    length(stripeDirSum) > 1e-5
  );
  out.extras.refWithStripe = bestRefInt + min(stripeOut, 0.999999);
  out.extras.avgDirection = encode_avg_dir_vec(clamp(avgDirSum * invW, vec2<f32>(-1.0), vec2<f32>(1.0)));
  return out;
}

// Colorize from a source texture, replacing the nearest sample with a
// pre-computed bilinear interpolation when one is available (magnified case).
fn colorize_sampled(
  sourceTex: texture_2d_array<f32>,
  coord: vec2<i32>,
  texSize: vec2<i32>,
  iter_val: f32, zx_val: f32, zy_val: f32,
  interp: InterpPixel,
  uv_tex: vec2<f32>,
  magnified: bool,
  uv_screen: vec2<f32>,
  uv_neutral: vec2<f32>,
  distanceHeightOffset: f32,
  distanceHeightGradientScale: f32
) -> vec4<f32> {
  var it = iter_val;
  var zx = zx_val;
  var zy = zy_val;
  var extras = load_pixel_extras(sourceTex, coord);
  if (interp.kind == 1) {
    it = interp.iter;
    zx = interp.zx;
    zy = interp.zy;
    extras = interp.extras;
  }
  return colorize_pixel(
    sourceTex, coord, texSize, it, zx, zy, extras,
    uv_screen, uv_neutral, distanceHeightOffset, distanceHeightGradientScale,
    uv_tex, magnified
  );
}

// ── Debug flag ──
// Set to true to visualize the live texture as a negative image during zoom,
// with genuine pixels tinted green and resolve-copied pixels tinted red.
const DEBUG_SHOW_LIVE_NEGATIVE: bool = false;

// ── sRGB ↔ linear (gamma-correct AA accumulation) ──────────────────
fn srgb_to_linear(c: vec3<f32>) -> vec3<f32> {
  let cutoff = c <= vec3<f32>(0.04045);
  let low = c / 12.92;
  let high = pow((max(c, vec3<f32>(0.0)) + 0.055) / 1.055, vec3<f32>(2.4));
  return select(high, low, cutoff);
}

fn linear_to_sRGB(c: vec3<f32>) -> vec3<f32> {
  let cl = max(c, vec3<f32>(0.0));
  let cutoff = cl <= vec3<f32>(0.0031308);
  let low = cl * 12.92;
  let high = 1.055 * pow(cl, vec3<f32>(1.0 / 2.4)) - 0.055;
  return select(high, low, cutoff);
}

// Core shading, returns sRGB color (unchanged from the historical fs_main body).
// Entry points below wrap this: fs_main (linear, for AA accumulation) and
// fs_main_direct (sRGB, for direct-to-swapchain and PNG export).
fn shade_srgb(fragCoord: vec2<f32>, applyAaGate: bool) -> vec4<f32> {
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
  // Texture magnified on screen → bilinear interpolation of the samples.
  let liveMagnified = lzf > 1.001;
  let frozenMagnified = zf > 1.001;
  let liveDistanceHeightOffset = distance_height_scale_offset(lzf);
  let frozenDistanceHeightOffset = distance_height_scale_offset(zf);
  let liveDistanceHeightGradientScale = distance_height_gradient_scale(lzf);
  let frozenDistanceHeightGradientScale = distance_height_gradient_scale(zf);

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

  var liveCoord = vec2<i32>(0);
  var live_iter = -1.0;
  var liveStep = 0.0;  // 0 = no data
  var live_zx = 0.0;
  var live_zy = 0.0;
  if (liveInBounds) {
    liveCoord = vec2<i32>(
      i32(clamp(uv_live.x * texSizeF.x, 0.0, texSizeF.x - 1.0)),
      i32(clamp((1.0 - uv_live.y) * texSizeF.y, 0.0, texSizeF.y - 1.0))
    );
    // AA per-pixel gate: once this pixel has accumulated its distance-estimation
    // target sample count, stop contributing so its average is the unbiased mean
    // of exactly \`target\` jittered samples (no over-weighting of frozen pixels).
    // target <= 0 means "not baked yet" (sample 0) → always contribute.
    if (applyAaGate) {
      let aaTarget = textureLoad(aaTargetTex, liveCoord, 0).r;
      if (aaTarget > 0.0 && parameters.aaSampleIndex >= aaTarget) {
        discard;
      }
    }
    let liveSample = load_pixel_sample(tex, liveCoord);
    live_iter = liveSample.iter;
    liveStep = liveSample.step;
    live_zx = liveSample.zx;
    live_zy = liveSample.zy;
  }

  // When magnified, the bilinear interpolation both smooths the display and
  // serves as a data source where the nearest texel is unusable (sentinel,
  // budget-exhausted) — this fills the flat blocks that otherwise flash
  // when the compositing alternates between live and frozen during zoom.
  var liveInterp: InterpPixel;
  liveInterp.kind = 0;
  if (liveInBounds && liveMagnified) {
    liveInterp = sample_escaped_bilinear(tex, uv_live, texSize);
  }

  let liveEscaped = live_iter > 0.0 && (live_zx * live_zx + live_zy * live_zy) >= parameters.mu;
  var liveHasData = liveEscaped && liveStep > 0.0;
  var liveCompositeStep = liveStep;
  if (liveInterp.kind == 1) {
    liveHasData = true;
    liveCompositeStep = liveInterp.step;
  }

  // ── Sample frozen texture ──
  // The frozen texture is only usable when it is aligned with the live texture
  // (during zoom reprojection, or post-zoom before any translation occurs).
  // The CPU sets frozenAligned = 1.0 in those cases, 0.0 otherwise.
  let useFrozen = parameters.frozenAligned > 0.5;

  var frozenCoord = vec2<i32>(0);
  var frozenStep = 0.0;  // 0 = no data
  var frozen_iter = -1.0;
  var frozen_zx = 0.0;
  var frozen_zy = 0.0;
  var uv_frozen = vec2<f32>(0.0);
  var frozenInterp: InterpPixel;
  frozenInterp.kind = 0;
  if (useFrozen) {
    uv_frozen = (uv_neutral - vec2<f32>(0.5, 0.5)) / zf + vec2<f32>(0.5, 0.5)
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
      let frozenSample = load_pixel_sample(texFrozen, frozenCoord);
      frozen_iter = frozenSample.iter;
      frozenStep = frozenSample.step;
      frozen_zx = frozenSample.zx;
      frozen_zy = frozenSample.zy;
      if (frozenMagnified) {
        frozenInterp = sample_escaped_bilinear(texFrozen, uv_frozen, texSize);
      }
    }
  }
  let frozenEscaped = frozen_iter > 0.0 && (frozen_zx * frozen_zx + frozen_zy * frozen_zy) >= parameters.mu;
  let frozenInterior = frozen_iter == 0.0;
  var frozenHasData = (frozenEscaped || frozenInterior) && frozenStep > 0.0;
  var frozenCompositeStep = frozenStep;
  if (frozenInterp.kind == 1) {
    frozenHasData = true;
    frozenCompositeStep = frozenInterp.step;
  }

  // ── Pick the best pixel: smallest positive step wins ──
  // step > 0 means the pixel has data; step = 0 means no data.
  // The frozen and live textures live at different scales, so their raw step
  // values are not directly comparable. A frozen genuine pixel (step=1) at
  // frozenScale is zf/lzf times coarser per axis than a live genuine pixel
  // (step=1) at liveScale.  Scale the frozen step to live-resolution units.
  let scaleRatio = select(1.0, zf / lzf, lzf > 0.0);
  let effectiveFrozenStep = frozenCompositeStep * scaleRatio;

  if (liveHasData && frozenHasData) {
    // Both have data — pick the one with finer resolution (smaller step).
    if (liveCompositeStep <= effectiveFrozenStep) {
      let liveColor = colorize_sampled(
        tex,
        liveCoord,
        texSize,
        live_iter,
        live_zx,
        live_zy,
        liveInterp,
        uv_live,
        liveMagnified,
        uv_screen,
        uv_neutral,
        liveDistanceHeightOffset,
        liveDistanceHeightGradientScale
      );
      if (DEBUG_SHOW_LIVE_NEGATIVE) {
        let neg = vec3<f32>(1.0) - liveColor.rgb;
        return vec4<f32>(neg.r * 0.3, neg.g, neg.b * 0.3, 1.0);
      }
      return vec4<f32>(liveColor.rgb, 1.0);
    } else {
      let frozenColor = colorize_sampled(
        texFrozen,
        frozenCoord,
        texSize,
        frozen_iter,
        frozen_zx,
        frozen_zy,
        frozenInterp,
        uv_frozen,
        frozenMagnified,
        uv_screen,
        uv_neutral,
        frozenDistanceHeightOffset,
        frozenDistanceHeightGradientScale
      );
      return vec4<f32>(frozenColor.rgb, 1.0);
    }
  }

  if (liveHasData) {
    let liveColor = colorize_sampled(
      tex,
      liveCoord,
      texSize,
      live_iter,
      live_zx,
      live_zy,
      liveInterp,
      uv_live,
      liveMagnified,
      uv_screen,
      uv_neutral,
      liveDistanceHeightOffset,
      liveDistanceHeightGradientScale
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
    let frozenColor = colorize_sampled(
      texFrozen,
      frozenCoord,
      texSize,
      frozen_iter,
      frozen_zx,
      frozen_zy,
      frozenInterp,
      uv_frozen,
      frozenMagnified,
      uv_screen,
      uv_neutral,
      frozenDistanceHeightOffset,
      frozenDistanceHeightGradientScale
    );
    return vec4<f32>(frozenColor.rgb, 1.0);
  }

  // No valid pixel from either source.
  return vec4<f32>(0.05, 0.05, 0.05, 1.0);
}

// AA-accumulation path: output linear RGB with alpha = 1.0 so additive blending
// sums colors in linear space and accumulates a per-pixel sample count in alpha.
@fragment
fn fs_main(@location(0) fragCoord: vec2<f32>) -> @location(0) vec4<f32> {
  let c = shade_srgb(fragCoord, true);
  return vec4<f32>(srgb_to_linear(c.rgb), 1.0);
}

// Direct path: unmodified sRGB output (no linear roundtrip, no AA gate) for the
// legacy direct-to-swapchain render and the PNG/snapshot export.
@fragment
fn fs_main_direct(@location(0) fragCoord: vec2<f32>) -> @location(0) vec4<f32> {
  return shade_srgb(fragCoord, false);
}
`,vr=`// Brush pass: updates sentinel levels in the neutral square texture.
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
`,br=`// Resolve pass: replaces remaining sentinels with a snapped parent pixel.
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
//   If layer0 == -step (step is power-of-two > 1), resolve by bilinearly
//   interpolating the 4 corner anchors of the grid cell (weights from the
//   fractional position inside the cell, unfinished corners masked out).
//   This smooths the progressive preview instead of producing flat squares.
//   Interpolated quantities:
//     - nu (smooth iteration) — interpolated continuously, then re-encoded
//       as iter = floor(nu) plus a synthetic |z| that reproduces fract(nu)
//       through the smooth-escape formula used by color.wgsl;
//     - z direction — interpolated as unit vectors (orbit traps / mapping);
//     - distance height (layer 4) — plain lerp;
//     - derivative angle (layer 5) — circular lerp via (cos, sin);
//     - stripe phase (layer 6 fraction) — circular lerp; integer ref_i is
//       taken from the dominant corner;
//     - average orbit direction (layer 7) — unpacked, lerped, repacked.
//   If a cell straddles the set boundary, the group (inside vs escaped)
//   with the larger total weight wins, to avoid false halos at the edge.
//   If no corner is finished, climb to the next coarser grid level.

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

// ── Bilinear interpolation helpers ─────────────────────────────────

const TWO_PI: f32 = 6.283185307179586;
const LN_2: f32 = 0.6931471805599453;
const ORBIT_DIRECTION_SCALE: f32 = 4095.0;
const ORBIT_DIRECTION_BASE: f32 = 4096.0;

// Smooth escape fraction, identical to color.wgsl's escape_nu fraction.
// Returned separately from the iteration count so that nu can be
// interpolated relative to a local base iteration: at deep zooms the
// iteration counts are large and f32 ULP would otherwise quantize the
// interpolated fraction (visible as flat texels again).
fn smooth_frac(z_sq: f32, logMu: f32) -> f32 {
  let log_z2 = log(max(z_sq, 1e-12));
  return clamp(1.0 - log(max(log_z2 / logMu, 1e-12)) / LN_2, 0.0, 1.0);
}

fn decode_avg_dir(encoded: f32) -> vec2<f32> {
  let xq = floor(encoded / ORBIT_DIRECTION_BASE);
  let yq = encoded - xq * ORBIT_DIRECTION_BASE;
  return vec2<f32>(
    (xq / ORBIT_DIRECTION_SCALE - 0.5) * 2.0,
    (yq / ORBIT_DIRECTION_SCALE - 0.5) * 2.0,
  );
}

fn encode_avg_dir(avgDir: vec2<f32>) -> f32 {
  let phase = clamp(avgDir * 0.5 + vec2<f32>(0.5), vec2<f32>(0.0), vec2<f32>(1.0));
  let xq = floor(phase.x * ORBIT_DIRECTION_SCALE + 0.5);
  let yq = floor(phase.y * ORBIT_DIRECTION_SCALE + 0.5);
  return xq * ORBIT_DIRECTION_BASE + yq;
}

fn phase_to_dir(phase: f32) -> vec2<f32> {
  let a = phase * TWO_PI;
  return vec2<f32>(cos(a), sin(a));
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

  // Interpolate the 4 corner anchors of the grid cell, climbing to coarser
  // steps if no corner is finished.  Finished corners are weighted by the
  // pixel's bilinear position inside the cell; unfinished (sentinel or
  // budget-exhausted) corners get zero weight.  This eliminates both the
  // flat-square look and the Sierpinski-triangle artifact.

  // Grid offset for sentinel alignment after translation.
  let gx = i32(uni.gridOffsetX);
  let gy = i32(uni.gridOffsetY);

  let logMu = log(max(uni.mu, 1.0001));

  // Climb through coarser grid levels. The maximum number of doublings
  // before step_u exceeds the texture size is bounded by log2(max(dims)).
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
    let mx = (sx % step_i + step_i) % step_i;
    let my = (sy % step_i + step_i) % step_i;
    let base_x = sx - mx + gx;
    let base_y = sy - my + gy;

    // Bilinear weights from the fractional position inside the cell.
    let fx = f32(mx) / f32(step_i);
    let fy = f32(my) / f32(step_i);
    var weights = array<f32, 4>(
      (1.0 - fx) * (1.0 - fy),
      fx * (1.0 - fy),
      (1.0 - fx) * fy,
      fx * fy
    );
    var candidates = array<vec2<i32>, 4>(
      vec2<i32>(base_x,          base_y),
      vec2<i32>(base_x + step_i, base_y),
      vec2<i32>(base_x,          base_y + step_i),
      vec2<i32>(base_x + step_i, base_y + step_i)
    );

    // Accumulators for escaped corners.  nu is accumulated relative to
    // baseIter (the first escaped corner's iteration count) to keep full
    // f32 precision at deep zooms where iter counts are large.
    var wEscaped = 0.0;
    var nEscaped = 0u;
    var baseIter = -1.0;
    var nuSum = 0.0;
    var distSum = 0.0;
    var zDirSum = vec2<f32>(0.0);
    var angleDirSum = vec2<f32>(0.0);
    var stripeDirSum = vec2<f32>(0.0);
    var avgDirSum = vec2<f32>(0.0);
    // Dominant escaped corner (largest weight) for non-interpolable parts.
    var bestEscapedW = -1.0;
    var bestRefInt = 0.0;
    var bestAngle = 0.0;
    var bestStripe = 0.0;
    // Inside-set corners: track total weight and the dominant one.
    var wInside = 0.0;
    var nInside = 0u;
    var bestInsideW = -1.0;
    var bestInsideCoord = vec2<i32>(0);
    // Fallback when every finished corner has zero bilinear weight
    // (e.g. the pixel sits exactly on an unfinished anchor).
    var hasFinished = false;
    var firstFinishedCoord = vec2<i32>(0);

    for (var i = 0u; i < 4u; i = i + 1u) {
      let ccoord = candidates[i];

      // Bounds check: skip candidates that fall outside the texture.
      if (ccoord.x < 0 || ccoord.y < 0 || ccoord.x >= i32(dims.x) || ccoord.y >= i32(dims.y)) {
        continue;
      }

      let citer = loadLayer(ccoord, 0);

      // Sentinel — this candidate is not computed yet.
      if (citer < 0.0) {
        continue;
      }

      let w = weights[i];

      // Inside set (iter == 0).
      if (citer == 0.0) {
        if (!hasFinished) {
          hasFinished = true;
          firstFinishedCoord = ccoord;
        }
        nInside = nInside + 1u;
        wInside = wInside + w;
        if (w > bestInsideW) {
          bestInsideW = w;
          bestInsideCoord = ccoord;
        }
        continue;
      }

      // iter > 0: check whether pixel actually escaped or is budget-exhausted.
      let zx = loadLayer(ccoord, 2);
      let zy = loadLayer(ccoord, 3);
      let z_sq = zx * zx + zy * zy;

      if (z_sq < uni.mu) {
        // Budget-exhausted: skip this candidate.
        continue;
      }

      // Escaped — accumulate.
      if (!hasFinished) {
        hasFinished = true;
        firstFinishedCoord = ccoord;
      }
      if (baseIter < 0.0) {
        baseIter = citer;
      }
      nEscaped = nEscaped + 1u;
      wEscaped = wEscaped + w;
      nuSum = nuSum + w * ((citer - baseIter) + smooth_frac(z_sq, logMu));
      distSum = distSum + w * loadLayer(ccoord, 4);
      let angle = loadLayer(ccoord, 5);
      angleDirSum = angleDirSum + w * vec2<f32>(cos(angle), sin(angle));
      let zLen = max(sqrt(z_sq), 1e-12);
      zDirSum = zDirSum + w * vec2<f32>(zx, zy) / zLen;
      let refVal = max(loadLayer(ccoord, 6), 0.0);
      let stripePhase = fract(refVal);
      stripeDirSum = stripeDirSum + w * phase_to_dir(stripePhase);
      avgDirSum = avgDirSum + w * decode_avg_dir(loadLayer(ccoord, 7));
      if (w > bestEscapedW) {
        bestEscapedW = w;
        bestRefInt = floor(refVal);
        bestAngle = angle;
        bestStripe = stripePhase;
      }
    }

    // Rank-aware gate: only render this cell at the current level when at
    // least 3 of its 4 corners are RESOLVED (escaped or inside).  With fewer,
    // the renormalized bilinear degenerates — 1 corner → flat square, 2 on an
    // edge → bands, 2 diagonal → singular — so we climb to the coarser level
    // instead.  Counting resolved (not just escaped) corners keeps converged
    // frames identical: once every corner is escaped/inside, nResolved == 4
    // everywhere and nothing climbs.  See design.md of this change.
    let nResolved = nEscaped + nInside;
    if (nResolved >= 3u) {
      // The cell straddles the set boundary: the dominant group wins.
      if (wInside > wEscaped) {
        return loadAllLayersAsCopy(bestInsideCoord, step_u);
      }

      if (wEscaped > 1e-6) {
      // ── Interpolate among escaped corners ──
      let invW = 1.0 / wEscaped;

      // nu: re-encode as iter = floor(nu) + synthetic |z| so that color.wgsl's
      // smooth-escape formula reproduces fract(nu) exactly.  floor/fract are
      // computed on the small relative value to preserve f32 precision.
      let nuRel = nuSum * invW;
      let relFloor = floor(nuRel);
      var iterOut = baseIter + relFloor;
      var frac = clamp(nuRel - relFloor, 0.0, 0.9999);
      if (iterOut < 1.0) {
        iterOut = 1.0;
        frac = 0.0;
      }
      let log_z2 = logMu * exp2(1.0 - frac);
      let zLenOut = exp(0.5 * log_z2);
      let zDirLen = length(zDirSum);
      let zDir = select(vec2<f32>(1.0, 0.0), zDirSum / zDirLen, zDirLen > 1e-5);
      let zOut = zDir * zLenOut;

      // Derivative angle: circular interpolation.
      let angleOut = select(bestAngle, atan2(angleDirSum.y, angleDirSum.x), length(angleDirSum) > 1e-5);

      // Stripe phase: circular interpolation; integer ref_i from dominant corner.
      let stripeOut = select(
        bestStripe,
        fract(atan2(stripeDirSum.y, stripeDirSum.x) / TWO_PI + 1.0),
        length(stripeDirSum) > 1e-5
      );
      let refOut = bestRefInt + min(stripeOut, 0.999999);

      var o: FragOut;
      o.iter      = pack(iterOut);
      o.genuine   = pack(f32(step_u));
      o.zx        = pack(zOut.x);
      o.zy        = pack(zOut.y);
      o.dzx       = pack(distSum * invW);
      o.dzy       = pack(angleOut);
      o.ref_i     = pack(refOut);
      o.avgDirection = pack(encode_avg_dir(clamp(avgDirSum * invW, vec2<f32>(-1.0), vec2<f32>(1.0))));
      return o;
      }

      // >= 3 resolved corners but all of them carry zero bilinear weight
      // (pixel sits exactly on the lone unresolved corner) — snap to the first
      // resolved corner instead of producing nothing.
      if (hasFinished) {
        return loadAllLayersAsCopy(firstFinishedCoord, step_u);
      }
    }

    // Fewer than 3 resolved corners (degenerate cell) — climb to the next
    // coarser grid level and re-evaluate the same criterion.
    step_u = step_u * 2u;
  }

  // Fallback after exhausting all grid levels.
  discard;
  return empty_out();
}
`,xr=`// Compute pass: counts pixels that still need rendering work.
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

// Workgroup-local partial counters: each 16\xd716 workgroup reduces locally and
// issues at most two global atomicAdds, instead of up to two per pixel.
var<workgroup> wgCount: atomic<u32>;
var<workgroup> wgActive: atomic<u32>;

@compute @workgroup_size(16, 16)
fn count_unfinished(
  @builtin(global_invocation_id) gid: vec3<u32>,
  @builtin(local_invocation_index) lidx: u32,
) {
  if (lidx == 0u) {
    atomicStore(&wgCount, 0u);
    atomicStore(&wgActive, 0u);
  }
  workgroupBarrier();

  // Per-pixel classification (no early returns: the barriers below must stay
  // in uniform control flow).
  var needs = false;
  var isActive = false;

  let dims = textureDimensions(rawTex);
  if (gid.x < dims.x && gid.y < dims.y) {
    // Map pixel coordinate to neutral-space [-1, 1]
    // Y is flipped to match the fragment-shader convention where uv.y=0 is
    // bottom and uv.y=1 is top, whereas gid.y=0 is the first texel row.
    let uv = vec2<f32>(
      (f32(gid.x) + 0.5) / f32(dims.x),
      1.0 - (f32(gid.y) + 0.5) / f32(dims.y),
    );
    let xy_neutral = uv * 2.0 - vec2<f32>(1.0);

    // Pixels outside the rotated viewport are ignored.
    if (is_inside_rotated_screen(xy_neutral)) {
      let coord = vec2<i32>(i32(gid.x), i32(gid.y));
      let iter = textureLoad(rawTex, coord, 0, 0).r;

      if (iter < 0.0) {
        needs = true;
        isActive = iter == -1.0;
      } else if (iter > 0.0) {
        let zx = textureLoad(rawTex, coord, 2, 0).r;
        let zy = textureLoad(rawTex, coord, 3, 0).r;
        let needs_continuation = (zx * zx + zy * zy) < params.mu;
        needs = needs_continuation;
        isActive = needs_continuation;
      }
    }
  }

  if (needs) {
    atomicAdd(&wgCount, 1u);
  }
  if (isActive) {
    atomicAdd(&wgActive, 1u);
  }
  workgroupBarrier();

  if (lidx == 0u) {
    let c = atomicLoad(&wgCount);
    let a = atomicLoad(&wgActive);
    if (c > 0u) {
      atomicAdd(&counter.count, c);
    }
    if (a > 0u) {
      atomicAdd(&counter.active_count, a);
    }
  }
}
`,yr=`// Merge pass: fuses the resolved (live) and frozen textures into a new frozen
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

fn normalizeDistanceHeight(height: f32, zoomFactor: f32) -> f32 {
  return clamp(height - log(max(zoomFactor, 1e-30)), -64.0, 64.0);
}

// Read all 8 layers from a texture at the given coordinate.
fn readAllLayersWithKnown01(tex: texture_2d_array<f32>, coord: vec2<i32>, iter: f32, step: f32, zoomFactor: f32) -> FragOut {
  var o: FragOut;
  o.layer0 = pack(iter);
  o.layer1 = pack(step);
  o.layer2 = pack(textureLoad(tex, coord, 2, 0).r);
  o.layer3 = pack(textureLoad(tex, coord, 3, 0).r);
  o.layer4 = pack(normalizeDistanceHeight(textureLoad(tex, coord, 4, 0).r, zoomFactor));
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
      liveData = readAllLayersWithKnown01(texResolved, liveCoord, liveIter, liveStep, lzf);
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
      frozenData = readAllLayersWithKnown01(texFrozen, frozenCoord, frozenIter, frozenStep, zf);
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
`,Sr=`// AA present pass: resolve the linear-space accumulation texture to the swapchain.
//
// The accumulation texture stores, per pixel, the linear-RGB sum of all accepted
// AA samples in .rgb and the number of accepted samples in .a (additive blend).
// Dividing rgb by alpha yields the per-pixel mean — correct for both uniform and
// distance-estimation-adaptive sample counts — then we convert back to sRGB.

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
`,zr=`// One-shot bake of the per-neutral-texel AA sample-count target, derived from
// the distance estimate already stored in the converged neutral texture.
//
// Neutral layer layout (see mandelbrot.wgsl):
//   layer 0 = iter  (> 0 escaped, == 0 interior/in-set)
//   layer 4 = distance_height = clamp(-log(DE_texels), -64, 64); high → near boundary.
//
// Result: target sample count in [1, antialiasLevel]. Smooth regions (interior,
// far exterior) get 1; boundary pixels ramp up to antialiasLevel.

struct AaParams {
  antialiasLevel: f32,
  aaSampleIndex: f32,   // unused here; shared buffer with the reseed pass
  screenHeightPx: f32,  // device-pixel screen height (1 neutral texel == 1 device px)
  _pad1: f32,
};

// Boundary-distance ramp (device px): full sample count within R_FULL, tapering
// to 1 sample by R_OUT. Distance to the set boundary is recovered exactly as
// de_px = (screenHeightPx / 2) * exp(-height), since height = ln((H/2) / DE_px).
const R_FULL: f32 = 1.0;
const R_OUT: f32 = 6.0;

@group(0) @binding(0) var src: texture_2d_array<f32>;
@group(0) @binding(1) var dst: texture_storage_2d<r32float, write>;
@group(0) @binding(2) var<uniform> params: AaParams;

@compute @workgroup_size(16, 16)
fn cs_main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dim = textureDimensions(dst);
  if (gid.x >= dim.x || gid.y >= dim.y) {
    return;
  }
  let coord = vec2<i32>(i32(gid.x), i32(gid.y));
  let iter = textureLoad(src, coord, 0, 0).r;
  let height = textureLoad(src, coord, 4, 0).r;
  let level = max(params.antialiasLevel, 1.0);

  var nSamples = 1.0;
  // Only escaped pixels carry a meaningful exterior distance estimate; interior
  // (iter == 0) and non-escaped pixels are flat → 1 sample.
  if (iter > 0.0) {
    let de_px = (params.screenHeightPx * 0.5) * exp(-height);
    // 1 at de_px >= R_OUT, ramping to full sample count at de_px <= R_FULL.
    let t = 1.0 - smoothstep(R_FULL, R_OUT, de_px);
    nSamples = clamp(round(1.0 + t * (level - 1.0)), 1.0, level);
  }
  textureStore(dst, coord, vec4<f32>(nSamples, 0.0, 0.0, 0.0));
}
`,wr=`// Selective AA reseed (Stage B): stamp iter = -1 (a fresh-compute request) on the
// neutral texels whose distance-estimation target sample count exceeds the current
// sample index — the thin boundary "sliver" — leaving every other texel frozen.
//
// The in-place fused path then reconverges only these texels with the new jitter,
// while frozen (escaped/interior) texels are skipped by its pass-through logic.
// This is what turns adaptive AA from "correct but full-cost" into the ~boundary-
// only cost win.
//
// Writes layer 0 (iter) only. iter = -1 makes the in-place compute branch
// reinitialize z/dz/ref_i from scratch, so leaving the other layers stale is fine.

struct AaParams {
  antialiasLevel: f32,
  aaSampleIndex: f32,
  _pad0: f32,
  _pad1: f32,
};

@group(0) @binding(0) var aaTargetTex: texture_2d<f32>;
@group(0) @binding(1) var rawTex: texture_storage_2d_array<r32float, write>;
@group(0) @binding(2) var<uniform> params: AaParams;

@compute @workgroup_size(16, 16)
fn cs_main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dim = textureDimensions(aaTargetTex);
  if (gid.x >= dim.x || gid.y >= dim.y) {
    return;
  }
  let coord = vec2<i32>(i32(gid.x), i32(gid.y));
  let tgt = textureLoad(aaTargetTex, coord, 0).r;
  // Active sliver: target > current sample index → recompute (fresh jittered).
  // Frozen texels are left untouched (no store preserves their value).
  if (tgt > params.aaSampleIndex) {
    textureStore(rawTex, coord, 0, vec4<f32>(-1.0, 0.0, 0.0, 0.0));
  }
}
`,Mr=async(t={},e)=>{let n;if(e.startsWith("data:")){const r=e.replace(/^data:.*?base64,/,"");let i;if(typeof Buffer=="function"&&typeof Buffer.from=="function")i=Buffer.from(r,"base64");else if(typeof atob=="function"){const a=atob(r);i=new Uint8Array(a.length);for(let o=0;o<a.length;o++)i[o]=a.charCodeAt(o)}else throw new Error("Cannot decode base64-encoded data URL");n=await WebAssembly.instantiate(i,t)}else{const r=await fetch(e),i=r.headers.get("Content-Type")||"";if("instantiateStreaming"in WebAssembly&&i.startsWith("application/wasm"))n=await WebAssembly.instantiateStreaming(r,t);else{const a=await r.arrayBuffer();n=await WebAssembly.instantiate(a,t)}}return n.instance.exports};let f;function Rr(t){f=t}let Ke=null;function ot(){return(Ke===null||Ke.byteLength===0)&&(Ke=new Uint8Array(f.memory.buffer)),Ke}let st=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0});st.decode();const Tr=0x7ff00000;let bt=0;function Br(t,e){return bt+=e,bt>=Tr&&(st=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0}),st.decode(),bt=e),st.decode(ot().subarray(t,t+e))}function An(t,e){return t=t>>>0,Br(t,e)}let Re=null;function Er(){return(Re===null||Re.buffer.detached===!0||Re.buffer.detached===void 0&&Re.buffer!==f.memory.buffer)&&(Re=new DataView(f.memory.buffer)),Re}function Je(t,e){t=t>>>0;const n=Er(),r=[];for(let i=t;i<t+4*e;i+=4)r.push(f.__wbindgen_export_0.get(n.getUint32(i,!0)));return f.__externref_drop_slice(t,e),r}let J=0;const Ve=new TextEncoder;"encodeInto"in Ve||(Ve.encodeInto=function(t,e){const n=Ve.encode(t);return e.set(n),{read:t.length,written:n.length}});function re(t,e,n){if(n===void 0){const s=Ve.encode(t),l=e(s.length,1)>>>0;return ot().subarray(l,l+s.length).set(s),J=s.length,l}let r=t.length,i=e(r,1)>>>0;const a=ot();let o=0;for(;o<r;o++){const s=t.charCodeAt(o);if(s>127)break;a[i+o]=s}if(o!==r){o!==0&&(t=t.slice(o)),i=n(i,r,r=o+t.length*3,1)>>>0;const s=ot().subarray(i+o,i+r),l=Ve.encodeInto(t,s);o+=l.written,i=n(i,r,o,1)>>>0}return J=o,i}function ge(t){return t==null}let Qe=null;function Cr(){return(Qe===null||Qe.byteLength===0)&&(Qe=new Float64Array(f.memory.buffer)),Qe}function Ar(t,e){return t=t>>>0,Cr().subarray(t/8,t/8+e)}const tn=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(t=>f.__wbg_blabufferinfo_free(t>>>0,1));class We{static __wrap(e){e=e>>>0;const n=Object.create(We.prototype);return n.__wbg_ptr=e,tn.register(n,n.__wbg_ptr,n),n}__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,tn.unregister(this),e}free(){const e=this.__destroy_into_raw();f.__wbg_blabufferinfo_free(e,0)}get ptr(){return f.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr)>>>0}set ptr(e){f.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr,e)}get count(){return f.__wbg_get_blabufferinfo_count(this.__wbg_ptr)>>>0}set count(e){f.__wbg_set_blabufferinfo_count(this.__wbg_ptr,e)}get levels_ptr(){return f.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr)>>>0}set levels_ptr(e){f.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr,e)}get level_count(){return f.__wbg_get_blabufferinfo_level_count(this.__wbg_ptr)>>>0}set level_count(e){f.__wbg_set_blabufferinfo_level_count(this.__wbg_ptr,e)}}Symbol.dispose&&(We.prototype[Symbol.dispose]=We.prototype.free);typeof FinalizationRegistry>"u"||new FinalizationRegistry(t=>f.__wbg_blalevel_free(t>>>0,1));typeof FinalizationRegistry>"u"||new FinalizationRegistry(t=>f.__wbg_blastep_free(t>>>0,1));const nn=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(t=>f.__wbg_mandelbrotnavigator_free(t>>>0,1));class Pt{__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,nn.unregister(this),e}free(){const e=this.__destroy_into_raw();f.__wbg_mandelbrotnavigator_free(e,0)}get_params(){const e=f.mandelbrotnavigator_get_params(this.__wbg_ptr);var n=Je(e[0],e[1]).slice();return f.__wbindgen_free(e[0],e[1]*4,4),n}rotate_direct(e){f.mandelbrotnavigator_rotate_direct(this.__wbg_ptr,e)}get_bla_epsilon(){return f.mandelbrotnavigator_get_bla_epsilon(this.__wbg_ptr)}set_bla_epsilon(e){f.mandelbrotnavigator_set_bla_epsilon(this.__wbg_ptr,e)}is_in_transition(){return f.mandelbrotnavigator_is_in_transition(this.__wbg_ptr)!==0}pixel_to_complex(e,n,r,i){const a=f.mandelbrotnavigator_pixel_to_complex(this.__wbg_ptr,e,n,r,i);var o=Je(a[0],a[1]).slice();return f.__wbindgen_free(a[0],a[1]*4,4),o}reference_origin(e,n){const r=re(e,f.__wbindgen_malloc,f.__wbindgen_realloc),i=J,a=re(n,f.__wbindgen_malloc,f.__wbindgen_realloc),o=J;f.mandelbrotnavigator_reference_origin(this.__wbg_ptr,r,i,a,o)}start_transition(e,n,r,i,a){const o=re(e,f.__wbindgen_malloc,f.__wbindgen_realloc),s=J,l=re(n,f.__wbindgen_malloc,f.__wbindgen_realloc),x=J,g=re(r,f.__wbindgen_malloc,f.__wbindgen_realloc),z=J;f.mandelbrotnavigator_start_transition(this.__wbg_ptr,o,s,l,x,g,z,i,a)}translate_direct(e,n,r,i){f.mandelbrotnavigator_translate_direct(this.__wbg_ptr,e,n,!ge(r),ge(r)?0:r,!ge(i),ge(i)?0:i)}use_perturbation(){f.mandelbrotnavigator_use_perturbation(this.__wbg_ptr)}cancel_transition(){f.mandelbrotnavigator_cancel_transition(this.__wbg_ptr)}coordinate_to_pixel(e,n,r,i){const a=re(e,f.__wbindgen_malloc,f.__wbindgen_realloc),o=J,s=re(n,f.__wbindgen_malloc,f.__wbindgen_realloc),l=J,x=f.mandelbrotnavigator_coordinate_to_pixel(this.__wbg_ptr,a,o,s,l,r,i);var g=Ar(x[0],x[1]).slice();return f.__wbindgen_free(x[0],x[1]*8,8),g}get_reference_params(){const e=f.mandelbrotnavigator_get_reference_params(this.__wbg_ptr);var n=Je(e[0],e[1]).slice();return f.__wbindgen_free(e[0],e[1]*4,4),n}get_approximation_mode(){return f.mandelbrotnavigator_get_approximation_mode(this.__wbg_ptr)}get_reference_orbit_len(){return f.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr)>>>0}compute_bla_reference_ptr(e){const n=f.mandelbrotnavigator_compute_bla_reference_ptr(this.__wbg_ptr,e);return We.__wrap(n)}compute_reference_orbit_ptr(e){const n=f.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr,e);return Ie.__wrap(n)}get_reference_orbit_capacity(){return f.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr)>>>0}compute_reference_orbit_chunk(e,n){const r=f.mandelbrotnavigator_compute_reference_orbit_chunk(this.__wbg_ptr,e,n);return Ie.__wrap(r)}constructor(e,n,r,i){const a=re(e,f.__wbindgen_malloc,f.__wbindgen_realloc),o=J,s=re(n,f.__wbindgen_malloc,f.__wbindgen_realloc),l=J,x=re(r,f.__wbindgen_malloc,f.__wbindgen_realloc),g=J,z=f.mandelbrotnavigator_new(a,o,s,l,x,g,i);return this.__wbg_ptr=z>>>0,nn.register(this,this.__wbg_ptr,this),this}step(e,n){const r=f.mandelbrotnavigator_step(this.__wbg_ptr,!ge(e),ge(e)?0:e,!ge(n),ge(n)?0:n);var i=Je(r[0],r[1]).slice();return f.__wbindgen_free(r[0],r[1]*4,4),i}zoom(e){f.mandelbrotnavigator_zoom(this.__wbg_ptr,e)}angle(e){f.mandelbrotnavigator_angle(this.__wbg_ptr,e)}scale(e){const n=re(e,f.__wbindgen_malloc,f.__wbindgen_realloc),r=J;f.mandelbrotnavigator_scale(this.__wbg_ptr,n,r)}origin(e,n){const r=re(e,f.__wbindgen_malloc,f.__wbindgen_realloc),i=J,a=re(n,f.__wbindgen_malloc,f.__wbindgen_realloc),o=J;f.mandelbrotnavigator_origin(this.__wbg_ptr,r,i,a,o)}rotate(e){f.mandelbrotnavigator_rotate(this.__wbg_ptr,e)}use_bla(){f.mandelbrotnavigator_use_bla(this.__wbg_ptr)}translate(e,n){f.mandelbrotnavigator_translate(this.__wbg_ptr,e,n)}}Symbol.dispose&&(Pt.prototype[Symbol.dispose]=Pt.prototype.free);typeof FinalizationRegistry>"u"||new FinalizationRegistry(t=>f.__wbg_mandelbrotstep_free(t>>>0,1));const rn=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(t=>f.__wbg_orbitbufferinfo_free(t>>>0,1));class Ie{static __wrap(e){e=e>>>0;const n=Object.create(Ie.prototype);return n.__wbg_ptr=e,rn.register(n,n.__wbg_ptr,n),n}__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,rn.unregister(this),e}free(){const e=this.__destroy_into_raw();f.__wbg_orbitbufferinfo_free(e,0)}get ptr(){return f.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr)>>>0}set ptr(e){f.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr,e)}get offset(){return f.__wbg_get_blabufferinfo_count(this.__wbg_ptr)>>>0}set offset(e){f.__wbg_set_blabufferinfo_count(this.__wbg_ptr,e)}get count(){return f.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr)>>>0}set count(e){f.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr,e)}}Symbol.dispose&&(Ie.prototype[Symbol.dispose]=Ie.prototype.free);function kr(t){return Math.exp(t)}function Ir(){return Date.now()}function Lr(t,e){throw new Error(An(t,e))}function Pr(t,e){return An(t,e)}function Dr(){const t=f.__wbindgen_export_0,e=t.grow(4);t.set(0,void 0),t.set(e+0,void 0),t.set(e+1,null),t.set(e+2,!0),t.set(e+3,!1)}URL=globalThis.URL;const p=await Mr({"./mandelbrot_bg.js":{__wbg_now_1e80617bcee43265:Ir,__wbg_exp_9293ded1248e1bd3:kr,__wbg_wbindgenthrow_451ec1a8469d7eb6:Lr,__wbindgen_init_externref_table:Dr,__wbindgen_cast_2241b6af4c4b2941:Pr}},sr),Or=p.memory,Gr=p.__wbg_blabufferinfo_free,Fr=p.__wbg_blalevel_free,Nr=p.__wbg_blastep_free,Ur=p.__wbg_get_blabufferinfo_count,Vr=p.__wbg_get_blabufferinfo_level_count,Hr=p.__wbg_get_blabufferinfo_levels_ptr,Wr=p.__wbg_get_blabufferinfo_ptr,qr=p.__wbg_get_blastep_ab_exp,Zr=p.__wbg_get_blastep_alpha_exp,Yr=p.__wbg_get_blastep_ax,Xr=p.__wbg_get_blastep_ay,$r=p.__wbg_get_blastep_bx,jr=p.__wbg_get_blastep_by,Kr=p.__wbg_get_blastep_radius_alpha,Jr=p.__wbg_get_blastep_radius_beta,Qr=p.__wbg_mandelbrotnavigator_free,ei=p.__wbg_mandelbrotstep_free,ti=p.__wbg_orbitbufferinfo_free,ni=p.__wbg_set_blabufferinfo_count,ri=p.__wbg_set_blabufferinfo_level_count,ii=p.__wbg_set_blabufferinfo_levels_ptr,ai=p.__wbg_set_blabufferinfo_ptr,oi=p.__wbg_set_blastep_ab_exp,si=p.__wbg_set_blastep_alpha_exp,li=p.__wbg_set_blastep_ax,ci=p.__wbg_set_blastep_ay,di=p.__wbg_set_blastep_bx,ui=p.__wbg_set_blastep_by,fi=p.__wbg_set_blastep_radius_alpha,pi=p.__wbg_set_blastep_radius_beta,hi=p.mandelbrotnavigator_angle,gi=p.mandelbrotnavigator_cancel_transition,mi=p.mandelbrotnavigator_compute_bla_reference_ptr,_i=p.mandelbrotnavigator_compute_reference_orbit_chunk,vi=p.mandelbrotnavigator_compute_reference_orbit_ptr,bi=p.mandelbrotnavigator_coordinate_to_pixel,xi=p.mandelbrotnavigator_get_approximation_mode,yi=p.mandelbrotnavigator_get_bla_epsilon,Si=p.mandelbrotnavigator_get_params,zi=p.mandelbrotnavigator_get_reference_orbit_capacity,wi=p.mandelbrotnavigator_get_reference_orbit_len,Mi=p.mandelbrotnavigator_get_reference_params,Ri=p.mandelbrotnavigator_is_in_transition,Ti=p.mandelbrotnavigator_new,Bi=p.mandelbrotnavigator_origin,Ei=p.mandelbrotnavigator_pixel_to_complex,Ci=p.mandelbrotnavigator_reference_origin,Ai=p.mandelbrotnavigator_rotate,ki=p.mandelbrotnavigator_rotate_direct,Ii=p.mandelbrotnavigator_scale,Li=p.mandelbrotnavigator_set_bla_epsilon,Pi=p.mandelbrotnavigator_start_transition,Di=p.mandelbrotnavigator_step,Oi=p.mandelbrotnavigator_translate,Gi=p.mandelbrotnavigator_translate_direct,Fi=p.mandelbrotnavigator_use_bla,Ni=p.mandelbrotnavigator_use_perturbation,Ui=p.mandelbrotnavigator_zoom,Vi=p.__wbg_set_blalevel_count,Hi=p.__wbg_set_blalevel_max_radius_bits,Wi=p.__wbg_set_blalevel_offset,qi=p.__wbg_set_blalevel_skip,Zi=p.__wbg_set_mandelbrotstep_pad0,Yi=p.__wbg_set_mandelbrotstep_pad1,Xi=p.__wbg_set_mandelbrotstep_zx,$i=p.__wbg_set_mandelbrotstep_zy,ji=p.__wbg_set_orbitbufferinfo_count,Ki=p.__wbg_set_orbitbufferinfo_offset,Ji=p.__wbg_set_orbitbufferinfo_ptr,Qi=p.__wbg_get_blalevel_count,ea=p.__wbg_get_blalevel_max_radius_bits,ta=p.__wbg_get_blalevel_offset,na=p.__wbg_get_blalevel_skip,ra=p.__wbg_get_orbitbufferinfo_count,ia=p.__wbg_get_orbitbufferinfo_offset,aa=p.__wbg_get_orbitbufferinfo_ptr,oa=p.__wbg_get_mandelbrotstep_pad0,sa=p.__wbg_get_mandelbrotstep_pad1,la=p.__wbg_get_mandelbrotstep_zx,ca=p.__wbg_get_mandelbrotstep_zy,da=p.__wbindgen_export_0,ua=p.__externref_drop_slice,fa=p.__wbindgen_free,pa=p.__wbindgen_malloc,ha=p.__wbindgen_realloc,kn=p.__wbindgen_start,ga=Object.freeze(Object.defineProperty({__proto__:null,__externref_drop_slice:ua,__wbg_blabufferinfo_free:Gr,__wbg_blalevel_free:Fr,__wbg_blastep_free:Nr,__wbg_get_blabufferinfo_count:Ur,__wbg_get_blabufferinfo_level_count:Vr,__wbg_get_blabufferinfo_levels_ptr:Hr,__wbg_get_blabufferinfo_ptr:Wr,__wbg_get_blalevel_count:Qi,__wbg_get_blalevel_max_radius_bits:ea,__wbg_get_blalevel_offset:ta,__wbg_get_blalevel_skip:na,__wbg_get_blastep_ab_exp:qr,__wbg_get_blastep_alpha_exp:Zr,__wbg_get_blastep_ax:Yr,__wbg_get_blastep_ay:Xr,__wbg_get_blastep_bx:$r,__wbg_get_blastep_by:jr,__wbg_get_blastep_radius_alpha:Kr,__wbg_get_blastep_radius_beta:Jr,__wbg_get_mandelbrotstep_pad0:oa,__wbg_get_mandelbrotstep_pad1:sa,__wbg_get_mandelbrotstep_zx:la,__wbg_get_mandelbrotstep_zy:ca,__wbg_get_orbitbufferinfo_count:ra,__wbg_get_orbitbufferinfo_offset:ia,__wbg_get_orbitbufferinfo_ptr:aa,__wbg_mandelbrotnavigator_free:Qr,__wbg_mandelbrotstep_free:ei,__wbg_orbitbufferinfo_free:ti,__wbg_set_blabufferinfo_count:ni,__wbg_set_blabufferinfo_level_count:ri,__wbg_set_blabufferinfo_levels_ptr:ii,__wbg_set_blabufferinfo_ptr:ai,__wbg_set_blalevel_count:Vi,__wbg_set_blalevel_max_radius_bits:Hi,__wbg_set_blalevel_offset:Wi,__wbg_set_blalevel_skip:qi,__wbg_set_blastep_ab_exp:oi,__wbg_set_blastep_alpha_exp:si,__wbg_set_blastep_ax:li,__wbg_set_blastep_ay:ci,__wbg_set_blastep_bx:di,__wbg_set_blastep_by:ui,__wbg_set_blastep_radius_alpha:fi,__wbg_set_blastep_radius_beta:pi,__wbg_set_mandelbrotstep_pad0:Zi,__wbg_set_mandelbrotstep_pad1:Yi,__wbg_set_mandelbrotstep_zx:Xi,__wbg_set_mandelbrotstep_zy:$i,__wbg_set_orbitbufferinfo_count:ji,__wbg_set_orbitbufferinfo_offset:Ki,__wbg_set_orbitbufferinfo_ptr:Ji,__wbindgen_export_0:da,__wbindgen_free:fa,__wbindgen_malloc:pa,__wbindgen_realloc:ha,__wbindgen_start:kn,mandelbrotnavigator_angle:hi,mandelbrotnavigator_cancel_transition:gi,mandelbrotnavigator_compute_bla_reference_ptr:mi,mandelbrotnavigator_compute_reference_orbit_chunk:_i,mandelbrotnavigator_compute_reference_orbit_ptr:vi,mandelbrotnavigator_coordinate_to_pixel:bi,mandelbrotnavigator_get_approximation_mode:xi,mandelbrotnavigator_get_bla_epsilon:yi,mandelbrotnavigator_get_params:Si,mandelbrotnavigator_get_reference_orbit_capacity:zi,mandelbrotnavigator_get_reference_orbit_len:wi,mandelbrotnavigator_get_reference_params:Mi,mandelbrotnavigator_is_in_transition:Ri,mandelbrotnavigator_new:Ti,mandelbrotnavigator_origin:Bi,mandelbrotnavigator_pixel_to_complex:Ei,mandelbrotnavigator_reference_origin:Ci,mandelbrotnavigator_rotate:Ai,mandelbrotnavigator_rotate_direct:ki,mandelbrotnavigator_scale:Ii,mandelbrotnavigator_set_bla_epsilon:Li,mandelbrotnavigator_start_transition:Pi,mandelbrotnavigator_step:Di,mandelbrotnavigator_translate:Oi,mandelbrotnavigator_translate_direct:Gi,mandelbrotnavigator_use_bla:Fi,mandelbrotnavigator_use_perturbation:Ni,mandelbrotnavigator_zoom:Ui,memory:Or},Symbol.toStringTag,{value:"Module"}));Rr(ga);kn();class ma{video;stream=null;width;height;lastDrawTime=0;open=!1;constructor(e=1024,n=1024){this.width=e,this.height=n,this.video=document.createElement("video"),this.video.autoplay=!0,this.video.playsInline=!0,this.video.muted=!0,this.video.width=e,this.video.height=n}isOpen(){return this.open}async openWebcam(){if(!this.open)try{this.stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:this.width},height:{ideal:this.height}}}),this.video.srcObject=this.stream,await this.video.play(),this.width=this.video.videoWidth||this.width,this.height=this.video.videoHeight||this.height,this.open=!0}catch(e){this.stream=null,this.open=!1,console.warn("Webcam unavailable:",e)}}async drawWebGPUTexture(e,n){if(!this.open)return;const r=performance.now();if(r-this.lastDrawTime>15){if(this.video.readyState<HTMLMediaElement.HAVE_CURRENT_DATA)return;const i=Math.min(this.width,e.width),a=Math.min(this.height,e.height);n.queue.copyExternalImageToTexture({source:this.video},{texture:e},[i,a]),this.lastDrawTime=r}}closeWebcam(){this.stream&&(this.stream.getTracks().forEach(e=>e.stop()),this.stream=null),this.open=!1}}function Pe(t,e,n){t.prototype=e.prototype=n,n.constructor=t}function Xe(t,e){var n=Object.create(t.prototype);for(var r in e)n[r]=e[r];return n}function ve(){}var ze=.7,Le=1/ze,Ae="\\s*([+-]?\\d+)\\s*",qe="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*",ue="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*",_a=/^#([0-9a-f]{3,8})$/,va=new RegExp(`^rgb\\(${Ae},${Ae},${Ae}\\)$`),ba=new RegExp(`^rgb\\(${ue},${ue},${ue}\\)$`),xa=new RegExp(`^rgba\\(${Ae},${Ae},${Ae},${qe}\\)$`),ya=new RegExp(`^rgba\\(${ue},${ue},${ue},${qe}\\)$`),Sa=new RegExp(`^hsl\\(${qe},${ue},${ue}\\)$`),za=new RegExp(`^hsla\\(${qe},${ue},${ue},${qe}\\)$`),an={aliceblue:0xf0f8ff,antiquewhite:0xfaebd7,aqua:65535,aquamarine:8388564,azure:0xf0ffff,beige:0xf5f5dc,bisque:0xffe4c4,black:0,blanchedalmond:0xffebcd,blue:255,blueviolet:9055202,brown:0xa52a2a,burlywood:0xdeb887,cadetblue:6266528,chartreuse:8388352,chocolate:0xd2691e,coral:0xff7f50,cornflowerblue:6591981,cornsilk:0xfff8dc,crimson:0xdc143c,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:0xb8860b,darkgray:0xa9a9a9,darkgreen:25600,darkgrey:0xa9a9a9,darkkhaki:0xbdb76b,darkmagenta:9109643,darkolivegreen:5597999,darkorange:0xff8c00,darkorchid:0x9932cc,darkred:9109504,darksalmon:0xe9967a,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:0xff1493,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:0xb22222,floralwhite:0xfffaf0,forestgreen:2263842,fuchsia:0xff00ff,gainsboro:0xdcdcdc,ghostwhite:0xf8f8ff,gold:0xffd700,goldenrod:0xdaa520,gray:8421504,green:32768,greenyellow:0xadff2f,grey:8421504,honeydew:0xf0fff0,hotpink:0xff69b4,indianred:0xcd5c5c,indigo:4915330,ivory:0xfffff0,khaki:0xf0e68c,lavender:0xe6e6fa,lavenderblush:0xfff0f5,lawngreen:8190976,lemonchiffon:0xfffacd,lightblue:0xadd8e6,lightcoral:0xf08080,lightcyan:0xe0ffff,lightgoldenrodyellow:0xfafad2,lightgray:0xd3d3d3,lightgreen:9498256,lightgrey:0xd3d3d3,lightpink:0xffb6c1,lightsalmon:0xffa07a,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:0xb0c4de,lightyellow:0xffffe0,lime:65280,limegreen:3329330,linen:0xfaf0e6,magenta:0xff00ff,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:0xba55d3,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:0xc71585,midnightblue:1644912,mintcream:0xf5fffa,mistyrose:0xffe4e1,moccasin:0xffe4b5,navajowhite:0xffdead,navy:128,oldlace:0xfdf5e6,olive:8421376,olivedrab:7048739,orange:0xffa500,orangered:0xff4500,orchid:0xda70d6,palegoldenrod:0xeee8aa,palegreen:0x98fb98,paleturquoise:0xafeeee,palevioletred:0xdb7093,papayawhip:0xffefd5,peachpuff:0xffdab9,peru:0xcd853f,pink:0xffc0cb,plum:0xdda0dd,powderblue:0xb0e0e6,purple:8388736,rebeccapurple:6697881,red:0xff0000,rosybrown:0xbc8f8f,royalblue:4286945,saddlebrown:9127187,salmon:0xfa8072,sandybrown:0xf4a460,seagreen:3050327,seashell:0xfff5ee,sienna:0xa0522d,silver:0xc0c0c0,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:0xfffafa,springgreen:65407,steelblue:4620980,tan:0xd2b48c,teal:32896,thistle:0xd8bfd8,tomato:0xff6347,turquoise:4251856,violet:0xee82ee,wheat:0xf5deb3,white:0xffffff,whitesmoke:0xf5f5f5,yellow:0xffff00,yellowgreen:0x9acd32};Pe(ve,qt,{copy(t){return Object.assign(new this.constructor,this,t)},displayable(){return this.rgb().displayable()},hex:on,formatHex:on,formatHex8:wa,formatHsl:Ma,formatRgb:sn,toString:sn});function on(){return this.rgb().formatHex()}function wa(){return this.rgb().formatHex8()}function Ma(){return In(this).formatHsl()}function sn(){return this.rgb().formatRgb()}function qt(t){var e,n;return t=(t+"").trim().toLowerCase(),(e=_a.exec(t))?(n=e[1].length,e=parseInt(e[1],16),n===6?ln(e):n===3?new q(e>>8&15|e>>4&240,e>>4&15|e&240,(e&15)<<4|e&15,1):n===8?et(e>>24&255,e>>16&255,e>>8&255,(e&255)/255):n===4?et(e>>12&15|e>>8&240,e>>8&15|e>>4&240,e>>4&15|e&240,((e&15)<<4|e&15)/255):null):(e=va.exec(t))?new q(e[1],e[2],e[3],1):(e=ba.exec(t))?new q(e[1]*255/100,e[2]*255/100,e[3]*255/100,1):(e=xa.exec(t))?et(e[1],e[2],e[3],e[4]):(e=ya.exec(t))?et(e[1]*255/100,e[2]*255/100,e[3]*255/100,e[4]):(e=Sa.exec(t))?un(e[1],e[2]/100,e[3]/100,1):(e=za.exec(t))?un(e[1],e[2]/100,e[3]/100,e[4]):an.hasOwnProperty(t)?ln(an[t]):t==="transparent"?new q(NaN,NaN,NaN,0):null}function ln(t){return new q(t>>16&255,t>>8&255,t&255,1)}function et(t,e,n,r){return r<=0&&(t=e=n=NaN),new q(t,e,n,r)}function Zt(t){return t instanceof ve||(t=qt(t)),t?(t=t.rgb(),new q(t.r,t.g,t.b,t.opacity)):new q}function _e(t,e,n,r){return arguments.length===1?Zt(t):new q(t,e,n,r??1)}function q(t,e,n,r){this.r=+t,this.g=+e,this.b=+n,this.opacity=+r}Pe(q,_e,Xe(ve,{brighter(t){return t=t==null?Le:Math.pow(Le,t),new q(this.r*t,this.g*t,this.b*t,this.opacity)},darker(t){return t=t==null?ze:Math.pow(ze,t),new q(this.r*t,this.g*t,this.b*t,this.opacity)},rgb(){return this},clamp(){return new q(ye(this.r),ye(this.g),ye(this.b),dt(this.opacity))},displayable(){return-.5<=this.r&&this.r<255.5&&-.5<=this.g&&this.g<255.5&&-.5<=this.b&&this.b<255.5&&0<=this.opacity&&this.opacity<=1},hex:cn,formatHex:cn,formatHex8:Ra,formatRgb:dn,toString:dn}));function cn(){return`#${xe(this.r)}${xe(this.g)}${xe(this.b)}`}function Ra(){return`#${xe(this.r)}${xe(this.g)}${xe(this.b)}${xe((isNaN(this.opacity)?1:this.opacity)*255)}`}function dn(){const t=dt(this.opacity);return`${t===1?"rgb(":"rgba("}${ye(this.r)}, ${ye(this.g)}, ${ye(this.b)}${t===1?")":`, ${t})`}`}function dt(t){return isNaN(t)?1:Math.max(0,Math.min(1,t))}function ye(t){return Math.max(0,Math.min(255,Math.round(t)||0))}function xe(t){return t=ye(t),(t<16?"0":"")+t.toString(16)}function un(t,e,n,r){return r<=0?t=e=n=NaN:n<=0||n>=1?t=e=NaN:e<=0&&(t=NaN),new se(t,e,n,r)}function In(t){if(t instanceof se)return new se(t.h,t.s,t.l,t.opacity);if(t instanceof ve||(t=qt(t)),!t)return new se;if(t instanceof se)return t;t=t.rgb();var e=t.r/255,n=t.g/255,r=t.b/255,i=Math.min(e,n,r),a=Math.max(e,n,r),o=NaN,s=a-i,l=(a+i)/2;return s?(e===a?o=(n-r)/s+(n<r)*6:n===a?o=(r-e)/s+2:o=(e-n)/s+4,s/=l<.5?a+i:2-a-i,o*=60):s=l>0&&l<1?0:o,new se(o,s,l,t.opacity)}function Dt(t,e,n,r){return arguments.length===1?In(t):new se(t,e,n,r??1)}function se(t,e,n,r){this.h=+t,this.s=+e,this.l=+n,this.opacity=+r}Pe(se,Dt,Xe(ve,{brighter(t){return t=t==null?Le:Math.pow(Le,t),new se(this.h,this.s,this.l*t,this.opacity)},darker(t){return t=t==null?ze:Math.pow(ze,t),new se(this.h,this.s,this.l*t,this.opacity)},rgb(){var t=this.h%360+(this.h<0)*360,e=isNaN(t)||isNaN(this.s)?0:this.s,n=this.l,r=n+(n<.5?n:1-n)*e,i=2*n-r;return new q(xt(t>=240?t-240:t+120,i,r),xt(t,i,r),xt(t<120?t+240:t-120,i,r),this.opacity)},clamp(){return new se(fn(this.h),tt(this.s),tt(this.l),dt(this.opacity))},displayable(){return(0<=this.s&&this.s<=1||isNaN(this.s))&&0<=this.l&&this.l<=1&&0<=this.opacity&&this.opacity<=1},formatHsl(){const t=dt(this.opacity);return`${t===1?"hsl(":"hsla("}${fn(this.h)}, ${tt(this.s)*100}%, ${tt(this.l)*100}%${t===1?")":`, ${t})`}`}}));function fn(t){return t=(t||0)%360,t<0?t+360:t}function tt(t){return Math.max(0,Math.min(1,t||0))}function xt(t,e,n){return(t<60?e+(n-e)*t/60:t<180?n:t<240?e+(n-e)*(240-t)/60:e)*255}const Ln=Math.PI/180,Pn=180/Math.PI,ut=18,Dn=.96422,On=1,Gn=.82521,Fn=4/29,ke=6/29,Nn=3*ke*ke,Ta=ke*ke*ke;function Un(t){if(t instanceof fe)return new fe(t.l,t.a,t.b,t.opacity);if(t instanceof he)return Vn(t);t instanceof q||(t=Zt(t));var e=wt(t.r),n=wt(t.g),r=wt(t.b),i=yt((.2225045*e+.7168786*n+.0606169*r)/On),a,o;return e===n&&n===r?a=o=i:(a=yt((.4360747*e+.3850649*n+.1430804*r)/Dn),o=yt((.0139322*e+.0971045*n+.7141733*r)/Gn)),new fe(116*i-16,500*(a-i),200*(i-o),t.opacity)}function Ot(t,e,n,r){return arguments.length===1?Un(t):new fe(t,e,n,r??1)}function fe(t,e,n,r){this.l=+t,this.a=+e,this.b=+n,this.opacity=+r}Pe(fe,Ot,Xe(ve,{brighter(t){return new fe(this.l+ut*(t??1),this.a,this.b,this.opacity)},darker(t){return new fe(this.l-ut*(t??1),this.a,this.b,this.opacity)},rgb(){var t=(this.l+16)/116,e=isNaN(this.a)?t:t+this.a/500,n=isNaN(this.b)?t:t-this.b/200;return e=Dn*St(e),t=On*St(t),n=Gn*St(n),new q(zt(3.1338561*e-1.6168667*t-.4906146*n),zt(-.9787684*e+1.9161415*t+.033454*n),zt(.0719453*e-.2289914*t+1.4052427*n),this.opacity)}}));function yt(t){return t>Ta?Math.pow(t,1/3):t/Nn+Fn}function St(t){return t>ke?t*t*t:Nn*(t-Fn)}function zt(t){return 255*(t<=.0031308?12.92*t:1.055*Math.pow(t,1/2.4)-.055)}function wt(t){return(t/=255)<=.04045?t/12.92:Math.pow((t+.055)/1.055,2.4)}function Ba(t){if(t instanceof he)return new he(t.h,t.c,t.l,t.opacity);if(t instanceof fe||(t=Un(t)),t.a===0&&t.b===0)return new he(NaN,0<t.l&&t.l<100?0:NaN,t.l,t.opacity);var e=Math.atan2(t.b,t.a)*Pn;return new he(e<0?e+360:e,Math.sqrt(t.a*t.a+t.b*t.b),t.l,t.opacity)}function Gt(t,e,n,r){return arguments.length===1?Ba(t):new he(t,e,n,r??1)}function he(t,e,n,r){this.h=+t,this.c=+e,this.l=+n,this.opacity=+r}function Vn(t){if(isNaN(t.h))return new fe(t.l,0,0,t.opacity);var e=t.h*Ln;return new fe(t.l,Math.cos(e)*t.c,Math.sin(e)*t.c,t.opacity)}Pe(he,Gt,Xe(ve,{brighter(t){return new he(this.h,this.c,this.l+ut*(t??1),this.opacity)},darker(t){return new he(this.h,this.c,this.l-ut*(t??1),this.opacity)},rgb(){return Vn(this).rgb()}}));var Hn=-.14861,Yt=1.78277,Xt=-.29227,ft=-.90649,Ze=1.97294,pn=Ze*ft,hn=Ze*Yt,gn=Yt*Xt-ft*Hn;function Ea(t){if(t instanceof Se)return new Se(t.h,t.s,t.l,t.opacity);t instanceof q||(t=Zt(t));var e=t.r/255,n=t.g/255,r=t.b/255,i=(gn*r+pn*e-hn*n)/(gn+pn-hn),a=r-i,o=(Ze*(n-i)-Xt*a)/ft,s=Math.sqrt(o*o+a*a)/(Ze*i*(1-i)),l=s?Math.atan2(o,a)*Pn-120:NaN;return new Se(l<0?l+360:l,s,i,t.opacity)}function Ft(t,e,n,r){return arguments.length===1?Ea(t):new Se(t,e,n,r??1)}function Se(t,e,n,r){this.h=+t,this.s=+e,this.l=+n,this.opacity=+r}Pe(Se,Ft,Xe(ve,{brighter(t){return t=t==null?Le:Math.pow(Le,t),new Se(this.h,this.s,this.l*t,this.opacity)},darker(t){return t=t==null?ze:Math.pow(ze,t),new Se(this.h,this.s,this.l*t,this.opacity)},rgb(){var t=isNaN(this.h)?0:(this.h+120)*Ln,e=+this.l,n=isNaN(this.s)?0:this.s*e*(1-e),r=Math.cos(t),i=Math.sin(t);return new q(255*(e+n*(Hn*r+Yt*i)),255*(e+n*(Xt*r+ft*i)),255*(e+n*(Ze*r)),this.opacity)}}));const $t=t=>()=>t;function Wn(t,e){return function(n){return t+n*e}}function Ca(t,e,n){return t=Math.pow(t,n),e=Math.pow(e,n)-t,n=1/n,function(r){return Math.pow(t+r*e,n)}}function jt(t,e){var n=e-t;return n?Wn(t,n>180||n<-180?n-360*Math.round(n/360):n):$t(isNaN(t)?e:t)}function Aa(t){return(t=+t)==1?$:function(e,n){return n-e?Ca(e,n,t):$t(isNaN(e)?n:e)}}function $(t,e){var n=e-t;return n?Wn(t,n):$t(isNaN(t)?e:t)}const ka=(function t(e){var n=Aa(e);function r(i,a){var o=n((i=_e(i)).r,(a=_e(a)).r),s=n(i.g,a.g),l=n(i.b,a.b),x=$(i.opacity,a.opacity);return function(g){return i.r=o(g),i.g=s(g),i.b=l(g),i.opacity=x(g),i+""}}return r.gamma=t,r})(1);function Ia(t){return function(e,n){var r=t((e=Dt(e)).h,(n=Dt(n)).h),i=$(e.s,n.s),a=$(e.l,n.l),o=$(e.opacity,n.opacity);return function(s){return e.h=r(s),e.s=i(s),e.l=a(s),e.opacity=o(s),e+""}}}const La=Ia(jt);function qn(t,e){var n=$((t=Ot(t)).l,(e=Ot(e)).l),r=$(t.a,e.a),i=$(t.b,e.b),a=$(t.opacity,e.opacity);return function(o){return t.l=n(o),t.a=r(o),t.b=i(o),t.opacity=a(o),t+""}}function Pa(t){return function(e,n){var r=t((e=Gt(e)).h,(n=Gt(n)).h),i=$(e.c,n.c),a=$(e.l,n.l),o=$(e.opacity,n.opacity);return function(s){return e.h=r(s),e.c=i(s),e.l=a(s),e.opacity=o(s),e+""}}}const Da=Pa(jt);function Zn(t){return(function e(n){n=+n;function r(i,a){var o=t((i=Ft(i)).h,(a=Ft(a)).h),s=$(i.s,a.s),l=$(i.l,a.l),x=$(i.opacity,a.opacity);return function(g){return i.h=o(g),i.s=s(g),i.l=l(Math.pow(g,n)),i.opacity=x(g),i+""}}return r.gamma=e,r})(1)}const Oa=Zn(jt);Zn($);const Yn=["palette","zebra","tessellation","shading","skybox","webcam","smoothness","stripeAverage","rotationMean","stripeRelief","directionCoherenceRelief","shadingLevel","specularPower","metallic","roughness","anisotropy","iridescencePower"],Ye={palette:{label:"Color Blend",defaultValue:1,min:0,max:1,step:.01,unit:"",textureRow:0,textureChannel:3,uiGroup:"color"},zebra:{label:"Iteration Bands",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:1,textureChannel:0,uiGroup:"iteration"},tessellation:{label:"Image Blend",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:1,textureChannel:1,uiGroup:"imageSources"},shading:{label:"Lighting Blend",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:1,textureChannel:2,uiGroup:"lighting"},skybox:{label:"Reflection Blend",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:1,textureChannel:3,uiGroup:"lighting"},webcam:{label:"Webcam Blend",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:2,textureChannel:0,uiGroup:"imageSources"},smoothness:{label:"Smooth Iterations",defaultValue:1,min:0,max:1,step:.01,unit:"",textureRow:2,textureChannel:1,uiGroup:"iteration"},stripeAverage:{label:"Stripe Average",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:5,textureChannel:0,uiGroup:"iteration"},rotationMean:{label:"Direction Coherence",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:5,textureChannel:1,uiGroup:"iteration"},stripeRelief:{label:"Stripe Relief",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:5,textureChannel:2,uiGroup:"iteration"},directionCoherenceRelief:{label:"Direction Relief",defaultValue:0,min:0,max:100,step:.1,unit:"",textureRow:5,textureChannel:3,uiGroup:"iteration"},shadingLevel:{label:"Light Intensity",defaultValue:0,min:0,max:3,step:.05,unit:"",textureRow:2,textureChannel:2,uiGroup:"lighting"},specularPower:{label:"Specular Strength",defaultValue:0,min:1,max:64,step:.5,unit:"",textureRow:2,textureChannel:3,uiGroup:"lighting"},metallic:{label:"Metalness",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:3,textureChannel:1,uiGroup:"lighting"},roughness:{label:"Roughness",defaultValue:0,min:.02,max:1,step:.01,unit:"",textureRow:3,textureChannel:2,uiGroup:"lighting"},anisotropy:{label:"Anisotropy",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:3,textureChannel:3,uiGroup:"lighting"},iridescencePower:{label:"Iridescence Strength",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:4,textureChannel:3,uiGroup:"iridescence"}},Nt=Object.fromEntries(Yn.map(t=>[t,Ye[t].defaultValue])),Mt={};for(const t of Yn){const e=Ye[t].uiGroup;Mt[e]||(Mt[e]=[]),Mt[e].push(t)}const Ga=["linear","gaussian","square","exponential"];function Fa(t){return typeof t=="string"&&Ga.includes(t)}function Rt(t){return Fa(t.transferCurve)?t.transferCurve:"linear"}function Tt(t,e){const n=Na(e);switch(t){case"gaussian":{if(n<=.28)return 0;if(n>=.72)return 1;const a=(n-.28)/(.72-.28);return a*a*(3-2*a)}case"square":return n<=0?0:1;case"exponential":return(Math.exp(3*n)-1)/(Math.exp(3)-1);default:return n}}function pe(t,e){return t[e]??Nt[e]}function Na(t){return Math.max(0,Math.min(1,t))}const Ua={lab:qn,rgb:ka,hcl:Da,hsl:La,cubehelix:Oa},mn=4096,Va=6,Ut=[];{const t=new Map;for(const e of Object.keys(Ye)){const{textureRow:n}=Ye[e];n===0||n===4||(t.has(n)||t.set(n,[]),t.get(n).push(e))}for(const[e,n]of t)Ut.push({row:e,fields:n});Ut.sort((e,n)=>e.row-n.row)}function Ha(t,e,n,r){const i=pe(t,n),a=pe(e,n);return i+(a-i)*r}function _n(t,e){return t[e]??null}class vn{points;interpolate;constructor(e,n="lab"){this.points=e.slice().sort((r,i)=>r.position-i.position),this.interpolate=Ua[n]??qn}getColorAt(e){if(this.points.length===0)return"#000";if(e<=this.points[0].position)return this.points[0].color;if(e>=this.points[this.points.length-1].position)return this.points[this.points.length-1].color;for(let n=0;n<this.points.length-1;++n){const r=this.points[n],i=this.points[n+1];if(e>=r.position&&e<=i.position){const a=(e-r.position)/(i.position-r.position),o=Tt(Rt(r),a),s=this.interpolate(r.color,i.color);return _e(s(o)).formatHex()}}return"#000"}getEffectAt(e,n){if(this.points.length===0)return Nt[n];if(e<=this.points[0].position)return pe(this.points[0],n);if(e>=this.points[this.points.length-1].position)return pe(this.points[this.points.length-1],n);for(let r=0;r<this.points.length-1;++r){const i=this.points[r],a=this.points[r+1];if(e>=i.position&&e<=a.position){const o=(e-i.position)/(a.position-i.position),s=Tt(Rt(i),o);return Ha(i,a,n,s)}}return Nt[n]}getIridescenceAt(e){if(this.points.length===0)return{color:"#000000",strength:0};if(this.points.length===1)return{color:this.points[0].iridescenceColor??this.points[0].color,strength:this.points[0].iridescenceColor?pe(this.points[0],"iridescencePower"):0};const n=this.points[0],r=this.points[this.points.length-1];if(e<=n.position)return{color:n.iridescenceColor??n.color,strength:n.iridescenceColor?pe(n,"iridescencePower"):0};if(e>=r.position)return{color:r.iridescenceColor??r.color,strength:r.iridescenceColor?pe(r,"iridescencePower"):0};for(let i=0;i<this.points.length-1;++i){const a=this.points[i],o=this.points[i+1];if(e>=a.position&&e<=o.position){const s=(e-a.position)/(o.position-a.position),l=Tt(Rt(a),s),x=_n(a,"iridescenceColor"),g=_n(o,"iridescenceColor");if(!x&&!g)return{color:"#000000",strength:0};const z=x??a.color,M=g??o.color,y=x?pe(a,"iridescencePower"):0,c=g?pe(o,"iridescencePower"):0,_=y+(c-y)*l;return{color:_e(this.interpolate(z,M)(l)).formatHex(),strength:_}}}return{color:"#000000",strength:0}}generateTexture(){const e=mn,n=Va,r=new Float32Array(e*n*4);for(let i=0;i<e;++i){const a=i/(e-1),o=_e(this.getColorAt(a)),s=(0*e+i)*4;r[s]=(o.r??0)/255,r[s+1]=(o.g??0)/255,r[s+2]=(o.b??0)/255,r[s+3]=this.getEffectAt(a,"palette");for(const{row:z,fields:M}of Ut){const y=(z*e+i)*4;for(const c of M){const _=Ye[c].textureChannel;r[y+_]=this.getEffectAt(a,c)}}const l=this.getIridescenceAt(a),x=_e(l.color),g=(4*e+i)*4;r[g]=(x.r??0)/255,r[g+1]=(x.g??0)/255,r[g+2]=(x.b??0)/255,r[g+3]=Math.max(0,Math.min(1,l.strength))}return{data:r,width:e,height:n}}generateThumbnailRow(){const e=mn,n=new ImageData(e,1),r=n.data;for(let i=0;i<e;++i){const a=i/(e-1),o=_e(this.getColorAt(a)),s=i*4;r[s]=Math.max(0,Math.min(255,Math.round(o.r??0))),r[s+1]=Math.max(0,Math.min(255,Math.round(o.g??0))),r[s+2]=Math.max(0,Math.min(255,Math.round(o.b??0))),r[s+3]=255}return n}}const Wa=-116;function Bt(t){if(!Number.isFinite(t)||t===0)return{mantissa:0,exponent:0};let e=t,n=0;Math.abs(e)<22250738585072014e-324&&(e*=2**64,n-=64);const r=Math.floor(Math.log2(Math.abs(e)))+1;for(e/=2**r,n+=r;Math.abs(e)>=1;)e*=.5,n+=1;for(;Math.abs(e)<.5;)e*=2,n-=1;let i=Math.fround(e);return Math.abs(i)>=1&&(i*=.5,n+=1),{mantissa:i,exponent:n}}const qa=3.321928094887362;function Za(t){if(t=t.trim(),t.length===0)return null;let e=1;t[0]==="-"?(e=-1,t=t.slice(1)):t[0]==="+"&&(t=t.slice(1));let n=0;const r=t.search(/[eE]/);if(r>=0){const y=parseInt(t.slice(r+1),10);if(!Number.isFinite(y))return null;n=y,t=t.slice(0,r)}const i=t.indexOf("."),a=i>=0?t.slice(0,i):t,o=i>=0?t.slice(i+1):"";if(!/^[0-9]*$/.test(a)||!/^[0-9]*$/.test(o)||a+o==="")return null;const s=a+o,l=a.length;let x=-1;for(let y=0;y<s.length;y++)if(s[y]!=="0"){x=y;break}if(x<0)return{sign:1,m10:0,d:0};const g=s.slice(x,x+18),z=parseFloat(g[0]+"."+g.slice(1)),M=l-1-x+n;return{sign:e,m10:z,d:M}}function Et(t){const e=Za(t);if(!e||e.m10===0)return{mantissa:0,exponent:0};const n=(Math.log10(e.m10)+e.d)*qa;let r=Math.floor(n),i=2**(n-r);i*=.5,r+=1;let a=Math.fround(i*e.sign);return Math.abs(a)>=1&&(a*=.5,r+=1),{mantissa:a,exponent:r}}function X(t){return t.kind==="reprojecting"}function nt(t){return t.kind==="reprojecting"?t.frozenScale:0}function me(t){return t.kind==="reprojecting"?t.liveScale:0}function Ya(t){return t.kind==="reprojecting"&&t.referenceResetDuringZoom}function Xa(t,e,n){switch(t.kind){case"idle":return $a(t,e,n);case"reprojecting":return ja(t,e,n)}}function $a(t,e,n){const r=[];switch(e.type){case"referenceReset":return e.orbitWasReset&&!e.muChanged&&r.push({type:"copyResolvedToFrozen"}),r.push({type:"clearHistoryNextFrame"}),{state:t,effects:r};case"scaleChanged":if(e.scale!==e.prevScale){const i=e.scale<e.prevScale,a=e.prevScale,o=i?a/n.threshold:a*n.threshold;return r.push({type:"copyResolvedToFrozen"}),r.push({type:"clearHistoryNextFrame"}),{state:{kind:"reprojecting",frozenScale:a,liveScale:o,zoomingIn:i,referenceResetDuringZoom:!1},effects:r}}return{state:t,effects:r};case"scaleStable":return{state:t,effects:r}}}function ja(t,e,n){const r=[];switch(e.type){case"referenceReset":return e.muChanged?{state:{kind:"idle"},effects:[{type:"clearHistoryNextFrame"}]}:(r.push({type:"clearHistoryNextFrame"}),{state:{...t,referenceResetDuringZoom:!0},effects:r});case"scaleChanged":{let i=t;t.referenceResetDuringZoom&&(i={...t,referenceResetDuringZoom:!1});const a=i.frozenScale/e.scale;if((i.zoomingIn?a>=n.threshold:a<=1/n.threshold)&&!i.referenceResetDuringZoom){const s=i.liveScale,l=i.zoomingIn?e.scale/n.threshold:e.scale*n.threshold;return r.push({type:"copyResolvedToFrozen"}),r.push({type:"clearHistoryNextFrame"}),{state:{kind:"reprojecting",frozenScale:s,liveScale:l,zoomingIn:i.zoomingIn,referenceResetDuringZoom:!1},effects:r}}return{state:i,effects:r}}case"scaleStable":return t.referenceResetDuringZoom||r.push({type:"mergeResolvedAndFrozen"}),r.push({type:"clearHistoryNextFrame"}),{state:{kind:"idle"},effects:r}}}function bn(){return{kind:"idle"}}function xn(t,e,n,r){const i=typeof t=="number"&&Number.isFinite(t)?t:e,a=2**Math.floor(Math.log2(Math.max(1,Math.floor(i))));return Math.min(Math.max(a,n),r)}function Ka(t){if(t<=0)return{x:0,y:0};const e=1.2207440846057596,n=1/e,r=1/(e*e),i=t*n%1,a=t*r%1,o=s=>{const l=2*s-1;return l===0?0:l/Math.sqrt(Math.abs(l))-Math.sign(l)};return{x:o(i),y:o(a)}}const Ja=.01,Qa=100,eo=["screenXWithDepth","screenYWithDepth","dragonScaleU","derivativeAngleSin","screenX","screenY","iterSmooth","distance"],to={screenXWithDepth:0,screenYWithDepth:1,dragonScaleU:2,derivativeAngleSin:3,screenX:4,screenY:5,iterSmooth:7,distance:8},lt={xVariable:"screenXWithDepth",yVariable:"screenYWithDepth",xScale:1,yScale:1,mirrored:!1},no={xVariable:"dragonScaleU",yVariable:"derivativeAngleSin",xScale:1,yScale:1,mirrored:!0},ro=new Set(eo);function Vt(t){return{...t}}function io(t){return typeof t=="string"&&ro.has(t)}function yn(t,e){return t==="argZ"?"derivativeAngleSin":t==="iterRaw"?"iterSmooth":io(t)?t:e}function Sn(t){const e=typeof t=="number"&&Number.isFinite(t)?t:1;return Math.min(Qa,Math.max(Ja,e))}function Xn(t){if(!t||typeof t!="object")return Vt(lt);const e=t;return{xVariable:yn(e.xVariable,lt.xVariable),yVariable:yn(e.yVariable,lt.yVariable),xScale:Sn(e.xScale),yScale:Sn(e.yScale),mirrored:!!e.mirrored}}function ao(t){return Vt(t===1?no:lt)}function Ct(t){return t.textureMapping?Xn(t.textureMapping):ao(t.textureMappingMode)}function zn(t){return to[t]??0}const oo=["loop","sine","pulse","stepped"],so=["paletteOffset","heightPaletteShift","lightAngle","textureDrift","skyReflectionDrift","phaseColoring","varnish","microBump","displacement","tessellation"],$n=[{id:"paletteOffset",label:"Palette Offset",defaultType:"loop",defaultSpeed:.8,defaultAmplitude:1,minAmplitude:0,maxAmplitude:1,amplitudeStep:.01,unit:"cycle"},{id:"heightPaletteShift",label:"Height Palette Shift",defaultType:"sine",defaultSpeed:.25,defaultAmplitude:20,minAmplitude:0,maxAmplitude:100,amplitudeStep:.5,unit:""},{id:"lightAngle",label:"Light Angle",defaultType:"loop",defaultSpeed:.15,defaultAmplitude:1,minAmplitude:0,maxAmplitude:1,amplitudeStep:.01,unit:"turn"},{id:"textureDrift",label:"Texture Drift",defaultType:"sine",defaultSpeed:1,defaultAmplitude:1,minAmplitude:0,maxAmplitude:2,amplitudeStep:.01,unit:""},{id:"skyReflectionDrift",label:"Sky Reflection Drift",defaultType:"sine",defaultSpeed:.6,defaultAmplitude:1,minAmplitude:0,maxAmplitude:2,amplitudeStep:.01,unit:""},{id:"phaseColoring",label:"Phase Coloring",defaultType:"pulse",defaultSpeed:.3,defaultAmplitude:25,minAmplitude:0,maxAmplitude:100,amplitudeStep:.5,unit:""},{id:"varnish",label:"Varnish",defaultType:"pulse",defaultSpeed:.22,defaultAmplitude:2,minAmplitude:0,maxAmplitude:10,amplitudeStep:.05,unit:""},{id:"microBump",label:"Micro Bump",defaultType:"pulse",defaultSpeed:.35,defaultAmplitude:.5,minAmplitude:0,maxAmplitude:2,amplitudeStep:.01,unit:""},{id:"displacement",label:"Displacement",defaultType:"sine",defaultSpeed:.2,defaultAmplitude:.02,minAmplitude:0,maxAmplitude:.1,amplitudeStep:.001,unit:""},{id:"tessellation",label:"Tessellation",defaultType:"sine",defaultSpeed:.18,defaultAmplitude:2,minAmplitude:0,maxAmplitude:10,amplitudeStep:.1,unit:""}];new Map($n.map(t=>[t.id,t]));function Ue(t,e){return typeof t=="number"&&Number.isFinite(t)?t:e}function lo(t,e){return oo.includes(t)?t:e}function co(t){return{enabled:t.id==="paletteOffset",type:t.defaultType,speed:t.defaultSpeed,amplitude:t.defaultAmplitude,phase:0}}function uo(t=1){const e=Object.fromEntries($n.map(n=>[n.id,co(n)]));return{globalSpeed:Ue(t,1),tracks:e}}function ct(t,e){const n=uo(e),r=t?.tracks,i=Object.fromEntries(so.map(a=>{const o=n.tracks[a],s=r?.[a];return[a,{enabled:typeof s?.enabled=="boolean"?s.enabled:o.enabled,type:lo(s?.type,o.type),speed:Ue(s?.speed,o.speed),amplitude:Ue(s?.amplitude,o.amplitude),phase:Ue(s?.phase,o.phase??0)}]}));return{globalSpeed:Ue(t?.globalSpeed,n.globalSpeed),tracks:i}}const Te=8,rt=100,fo=1e4,po=1e5,ho=1e-4,go=60,Ht=Math.PI*2,mo=5e6,At=10,wn=.25,kt=3,_o=3,it=.001;function vo(t){return t.some(e=>(e.stripeAverage??0)>it||(e.rotationMean??0)>it||(e.stripeRelief??0)>it||(e.directionCoherenceRelief??0)>it)}const jn=new Float32Array(1),bo=new Uint32Array(jn.buffer);function xo(t){jn[0]=t;const e=bo[0],n=e>>>16&32768,r=(e>>>23&255)-127,i=e&8388607;if(r>=16)return n|31744;if(r>=-14){const a=r+15;return n|a<<10|i>>>13}if(r>=-24){const a=-14-r;return n|(i|8388608)>>>13+a}return n}function Mn(t){const e=new Uint16Array(t.length);for(let n=0;n<t.length;++n)e[n]=xo(t[n]);return e}function be(t,e,n){return Math.min(Math.max(t,e),n)}function yo(t,e,n){const r=t.phase??0,i=e*t.speed*n+r;switch(t.type){case"loop":return i-Math.floor(i);case"pulse":return .5+.5*Math.sin(i*Ht);case"stepped":return Math.floor((i-Math.floor(i))*8)/Math.max(1,7)*2-1;default:return Math.sin(i*Ht)}}function oe(t,e,n){return t.enabled?yo(t,e,n)*t.amplitude:0}function Rn(t,e,n,r){return oe({...t,phase:(t.phase??0)+r},e,n)}class Kt{snapshotCallback;snapshotDestWidth;canvas;device;queue;adapter;ctx;format;mandelbrotNavigator;rawTexture;rawArrayView;rawLayerViews=[];rawBrushTexture;rawBrushArrayView;rawBrushLayerViews=[];resolvedTexture;resolvedArrayView;resolvedLayerViews=[];frozenTexture;frozenArrayView;frozenLayerViews=[];pipelineMerge;bindGroupMerge;uniformBufferMerge;uniformBufferMandelbrot;uniformBufferColor;uniformBufferBrush;uniformBufferResolve;mandelbrotReferenceBuffer;mandelbrotBlaBuffer;mandelbrotBlaLevelBuffer;mandelbrotBlaBufferCapacity=0;mandelbrotBlaLevelBufferCapacity=0;pipelineBrush;bindGroupBrush;pipelineMandelbrot;bindGroupMandelbrot;pipelineResolve;bindGroupResolve;pipelineColor;bindGroupColor;pipelineColorAccumClear;pipelineColorAccum;pipelinePresent;bindGroupPresent;accumTexture;accumTextureView;aaTargetTexture;aaTargetTextureView;pipelineAaTarget;bindGroupAaTarget;uniformBufferAaTarget;pipelineAaReseed;bindGroupAaReseed;useAaSelectiveReseed=!0;useInplaceCompute=!0;pipelineInplace;bindGroupInplace;bindGroupColorRaw;resolveSkipped=!1;lastRawMutationFrame=0;counterSampleFrame=-1;pipelineCount;counterBuffer;counterReadbackSlots=[];counterReadbackWriteIndex=0;counterReadbackSequence=0;latestAppliedCounterReadbackSequence=0;counterReadbackGeneration=0;renderFrameSerial=0;lastCounterDispatchFrame=-kt;counterBindGroup;uniformBufferCount;unfinishedPixelCount=-1;activePixelCount=-1;_rafId=null;_drawFn=null;fps=0;isRendering=!1;gpuFrameTimeMs=0;smoothedGpuTimeMs=0;pendingGpuTiming=!1;refinementWasGated=!1;_fpsFrameCount=0;_fpsLastTime=0;_lastDrawMs=0;neutralSize=0;shaderPassCompute;shaderPassColor;width=0;height=0;antialiasLevel;palettePeriod;previousMandelbrot;previousRenderOptions;previousOrbitMetricsEnabled;needRender=!0;orbitIncomplete=!1;prevGuardedMaxIter=0;currentGuardedMaxIter=0;currentMaxIterations=0;currentReferenceAvailableIter=0;currentReferenceRemainingIter=0;isReferenceValidating=!1;referenceResetSerial=0;referenceResetFlashUntil=0;currentBlaLevelCount=0;mandelbrotReference=new Float32Array(4*1e6);approximationMode="perturbation";blaEpsilon=ho;referenceWorker;referenceJobId=0;referenceAvailableOrbitLen=0;referenceBlaReadyMaxIterations=0;referenceWorkerFailed=!1;referenceWorkerReady=!1;pendingWorkerMessages=[];referenceViewKey="";referenceWorkerCx="";referenceWorkerCy="";floatExpActive=!1;debugShadingActive=!1;referenceOrbitWasReset=!1;pendingRefActive=!1;pendingRefCx="";pendingRefCy="";pendingRefOrbitBuffer=null;pendingRefOrbitLen=0;pendingRefMaxIterations=0;pendingRefBlaSteps=null;pendingRefBlaLevels=null;pendingRefBlaLevelCount=0;pendingRefBlaReadyMaxIterations=0;pendingRefReady=!1;skipRenderOnce=!1;prevFrameMandelbrot;clearHistoryNextFrame=!1;_prevFrameScaleChanged=!1;aaActive=!1;aaSampleIndex=0;aaAccumulatedSamples=0;aaOffsetX=0;aaOffsetY=0;aaReseedPending=!1;aaAuto=!1;cumulativeShiftX=0;cumulativeShiftY=0;zoomMagnificationThreshold=16;zoomState={kind:"idle"};needFreezeSnapshot=!1;needMergeSnapshot=!1;mergeUniforms={zf:1,lzf:1,frozenShiftU:0,frozenShiftV:0,aspect:1,angle:0};frozenBaseShiftX=0;frozenBaseShiftY=0;frozenPanShiftX=0;frozenPanShiftY=0;frozenAligned=!1;iterationBatchSize=rt;tileTexture;tileTextureView;skyboxTexture;skyboxTextureView;tileTextureSourceKey;skyboxTextureSourceKey;paletteTexture;paletteTextureView;paletteSampler;skyboxSampler;webcamTexture;webcamTileTexture;webcamTextureView;webcamEnabled=!0;time=0;lastUpdateTime=0;dprMultiplier=1;targetFps=60;gpuLoadMultiplier=1;constructor(e,n){this.canvas=e,this.shaderPassCompute=gr,this.shaderPassColor=_r,this.antialiasLevel=n.antialiasLevel,this.palettePeriod=n.palettePeriod,this.time=0}postReferenceWorker(e){return!this.referenceWorker||this.referenceWorkerFailed?!1:e.type==="dispose"?(this.referenceWorker.postMessage(e),!0):this.referenceWorkerReady?(this.referenceWorker.postMessage(e),!0):(this.pendingWorkerMessages.push(e),!0)}markReferenceReset(e=this.currentMaxIterations){this.referenceResetSerial++,this.referenceResetFlashUntil=performance.now()+900,this.referenceAvailableOrbitLen=0,this.currentReferenceAvailableIter=0,this.currentReferenceRemainingIter=e,this.currentGuardedMaxIter=0,this.orbitIncomplete=!0}discardPendingReference(){this.pendingRefActive&&(this.pendingRefActive=!1,this.pendingRefCx="",this.pendingRefCy="",this.pendingRefOrbitBuffer=null,this.pendingRefOrbitLen=0,this.pendingRefMaxIterations=0,this.pendingRefBlaSteps=null,this.pendingRefBlaLevels=null,this.pendingRefBlaLevelCount=0,this.pendingRefBlaReadyMaxIterations=0,this.pendingRefReady=!1)}markPendingReferenceReady(){this.pendingRefActive&&(this.pendingRefReady=!0,this.isReferenceValidating=!1,this.needRender=!0)}applyPendingReferenceSwitch(){if(!this.pendingRefActive||!this.pendingRefReady)return;const e=this.pendingRefOrbitBuffer;if(e&&this.mandelbrotReferenceBuffer){const r=this.pendingRefOrbitLen*4,i=Math.min(r,e.length);this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer,0,e,0,i)}this.pendingRefBlaSteps&&this.pendingRefBlaSteps.length>0&&this.ensureBlaBufferCapacity(this.pendingRefBlaSteps.length/8),this.pendingRefBlaSteps&&this.mandelbrotBlaBuffer&&this.device.queue.writeBuffer(this.mandelbrotBlaBuffer,0,this.pendingRefBlaSteps,0,this.pendingRefBlaSteps.length),this.pendingRefBlaLevels&&this.mandelbrotBlaLevelBuffer&&this.device.queue.writeBuffer(this.mandelbrotBlaLevelBuffer,0,this.pendingRefBlaLevels,0,this.pendingRefBlaLevels.length),this.pendingRefBlaLevelCount>0&&(this.currentBlaLevelCount=this.pendingRefBlaLevelCount,this.referenceBlaReadyMaxIterations=this.pendingRefBlaReadyMaxIterations),this.referenceWorkerCx=this.pendingRefCx,this.referenceWorkerCy=this.pendingRefCy,this.mandelbrotNavigator.reference_origin(this.pendingRefCx,this.pendingRefCy),this.referenceAvailableOrbitLen=this.pendingRefOrbitLen;const n=Math.max(0,this.pendingRefOrbitLen-1);this.currentReferenceAvailableIter=n,this.currentReferenceRemainingIter=Math.max(0,this.currentMaxIterations-n),this.currentGuardedMaxIter=Math.min(this.currentMaxIterations,n),this.isReferenceValidating=!1,this.orbitIncomplete=!this.referenceWorkerFailed&&n<this.currentMaxIterations,this.referenceResetSerial++,this.referenceResetFlashUntil=performance.now()+900,this.referenceOrbitWasReset=!0,this.invalidateCounterReadback(),this.needRender=!0,this.skipRenderOnce=!0,this.discardPendingReference()}initializeReferenceWorker(){this.referenceWorker?.terminate(),this.referenceWorker=new Worker(new URL("/mandelbrot/presentation/assets/referenceWorker-6ljHltmt.js",import.meta.url),{type:"module"}),this.referenceWorker.onmessage=e=>{this.handleReferenceWorkerMessage(e.data)},this.referenceWorker.onerror=e=>{console.error("Reference worker error:",e.message),this.referenceWorkerFailed=!0,this.orbitIncomplete=!1,this.currentBlaLevelCount=0},this.referenceWorkerFailed=!1,this.referenceWorkerReady=!1,this.pendingWorkerMessages=[],this.referenceAvailableOrbitLen=0,this.referenceBlaReadyMaxIterations=0,this.referenceJobId++}resetReference(e,n){console.log("[REF] Engine.resetReference",e.slice(0,14),"| prevKey?",this.referenceViewKey?"set":"empty"),this.mandelbrotNavigator&&this.mandelbrotNavigator.reference_origin(e,n),this.discardPendingReference(),this.referenceViewKey="",this.needRender=!0}resetReferenceJob(e,n,r){console.log("[REF] resetReferenceJob -> worker reset",e.cx.slice(0,14),"scale",n,"maxIter",r),this.discardPendingReference(),this.markReferenceReset(r),this.referenceBlaReadyMaxIterations=0,this.referenceOrbitWasReset=!0,this.isReferenceValidating=!0,this.currentBlaLevelCount=0,this.referenceViewKey="",this.referenceWorkerCx="",this.referenceWorkerCy="",this.referenceJobId++,this.postReferenceWorker({type:"reset",jobId:this.referenceJobId,cx:e.cx,cy:e.cy,scale:n.toString(),angle:e.angle,approximationMode:this.approximationMode,blaEpsilon:this.blaEpsilon,maxIterations:r})}syncReferenceWorkerView(e,n,r){const i=n.toString(),a=`${e.cx}
${e.cy}
${i}
${e.angle}
${r}`;a!==this.referenceViewKey&&(console.log("[REF] syncReferenceWorkerView -> updateView",e.cx.slice(0,14),"scale",i,"dx",e.dx,"dxStr",e.dxStr),this.discardPendingReference(),this.referenceViewKey=a,this.isReferenceValidating=!0,this.orbitIncomplete=!0,this.needRender=!0,this.postReferenceWorker({type:"updateView",jobId:this.referenceJobId,cx:e.cx,cy:e.cy,scale:i,angle:e.angle,maxIterations:r}))}handleReferenceWorkerMessage(e){if(e.type==="ready"){this.referenceWorkerReady=!0;const n=this.pendingWorkerMessages;this.pendingWorkerMessages=[];for(const r of n)this.referenceWorker?.postMessage(r);return}if(e.jobId===this.referenceJobId){if(e.type==="error"){console.error("Reference worker error:",e.message),this.referenceWorkerFailed=!0,this.orbitIncomplete=!1,this.currentBlaLevelCount=0;return}if(e.type==="referenceReset"){if(this.pendingRefActive){if(e.referenceCx===this.pendingRefCx&&e.referenceCy===this.pendingRefCy)return;this.discardPendingReference()}this.pendingRefActive=!0,this.pendingRefCx=e.referenceCx,this.pendingRefCy=e.referenceCy,this.pendingRefMaxIterations=e.maxIterations;const n=Math.max(e.maxIterations,this.currentMaxIterations)*4;this.pendingRefOrbitBuffer=new Float32Array(n),this.pendingRefOrbitLen=0,this.pendingRefBlaSteps=null,this.pendingRefBlaLevels=null,this.pendingRefBlaLevelCount=0,this.pendingRefBlaReadyMaxIterations=0;return}if(e.type==="orbitChunk"){const n=this.pendingRefActive&&e.referenceCx===this.pendingRefCx&&e.referenceCy===this.pendingRefCy;if(n){const i=this.pendingRefOrbitBuffer;if(i&&e.orbit.length>0){const o=e.offset*4,s=Math.min(e.orbit.length,i.length-o);s>0&&i.set(e.orbit.slice(0,s),o)}this.pendingRefOrbitLen=e.count;const a=Math.min(this.pendingRefMaxIterations,this.currentMaxIterations);this.pendingRefOrbitLen>=a&&this.markPendingReferenceReady()}else if(e.referenceCx!==this.referenceWorkerCx||e.referenceCy!==this.referenceWorkerCy){this.pendingRefActive&&this.discardPendingReference(),this.pendingRefActive=!0,this.pendingRefCx=e.referenceCx,this.pendingRefCy=e.referenceCy,this.pendingRefMaxIterations=e.maxIterations;const i=Math.max(e.maxIterations,this.currentMaxIterations)*4;this.pendingRefOrbitBuffer=new Float32Array(i),this.pendingRefOrbitLen=0,this.pendingRefBlaSteps=null,this.pendingRefBlaLevels=null,this.pendingRefBlaLevelCount=0,this.pendingRefBlaReadyMaxIterations=0;const a=this.pendingRefOrbitBuffer;if(a&&e.orbit.length>0){const s=e.offset*4,l=Math.min(e.orbit.length,a.length-s);l>0&&a.set(e.orbit.slice(0,l),s)}this.pendingRefOrbitLen=e.count;const o=Math.min(this.pendingRefMaxIterations,this.currentMaxIterations);this.pendingRefOrbitLen>=o&&this.markPendingReferenceReady(),this.isReferenceValidating=!1,this.needRender=!0;return}else e.offset===0&&this.referenceAvailableOrbitLen>0&&(this.markReferenceReset(),this.referenceOrbitWasReset=!0,this.currentBlaLevelCount=0,this.referenceBlaReadyMaxIterations=0,this.invalidateCounterReadback());n||(e.orbit.length>0&&this.mandelbrotReferenceBuffer?(this.referenceAvailableOrbitLen=e.count,this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer,e.offset*4*Float32Array.BYTES_PER_ELEMENT,e.orbit,0,e.orbit.length)):this.referenceAvailableOrbitLen=e.count);const r=Math.max(0,this.referenceAvailableOrbitLen-1);this.currentReferenceAvailableIter=r,this.currentReferenceRemainingIter=Math.max(0,this.currentMaxIterations-r),this.isReferenceValidating=!1,this.currentGuardedMaxIter=Math.min(this.currentMaxIterations,r),this.orbitIncomplete=!this.referenceWorkerFailed&&r<this.currentMaxIterations,this.needRender=!0;return}if(this.pendingRefActive){this.pendingRefBlaSteps=new Float32Array(e.steps),this.pendingRefBlaLevels=new Uint32Array(e.levels),this.pendingRefBlaLevelCount=e.levelCount,this.pendingRefBlaReadyMaxIterations=e.maxIterations;const n=Math.min(this.pendingRefMaxIterations,this.currentMaxIterations);this.pendingRefOrbitLen>=n&&this.markPendingReferenceReady();return}this.ensureBlaBufferCapacity(e.steps.length/8),this.ensureBlaLevelBufferCapacity(e.levelCount),e.steps.length>0&&this.mandelbrotBlaBuffer&&this.device.queue.writeBuffer(this.mandelbrotBlaBuffer,0,e.steps,0,e.steps.length),e.levels.length>0&&this.mandelbrotBlaLevelBuffer&&this.device.queue.writeBuffer(this.mandelbrotBlaLevelBuffer,0,e.levels,0,e.levels.length),this.currentBlaLevelCount=e.levelCount,this.referenceBlaReadyMaxIterations=e.maxIterations,this.isReferenceValidating=!1,this.needRender=!0,this.invalidateCounterReadback()}}async initialize(e){if(this.mandelbrotNavigator=e,this.approximationMode=this.mandelbrotNavigator.get_approximation_mode()===1?"bla":"perturbation",this.blaEpsilon=this.mandelbrotNavigator.get_bla_epsilon(),this.initializeReferenceWorker(),!navigator.gpu)throw new Error("WebGPU non support\xe9");if(this.adapter=await navigator.gpu.requestAdapter(),!this.adapter)throw new Error("Adapter WebGPU introuvable");this.device=await this.adapter.requestDevice(),this.device.label="Engine Device",this.device.lost.then(a=>{console.warn(`GPU device lost: reason=${a.reason}, message=${a.message}`)}),this.queue=this.device.queue,this.queue.label="Engine Queue",this.ctx=this.canvas.getContext("webgpu"),this.format=navigator.gpu.getPreferredCanvasFormat(),this.ctx.configure({device:this.device,format:this.format,alphaMode:"opaque"}),this.tileTexture=this.device.createTexture({size:[1,1,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine TileTexture 1x1 Placeholder"}),this.tileTextureView=this.tileTexture.createView(),this.skyboxTexture=this.device.createTexture({size:[1,1,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine SkyboxTexture 1x1 Placeholder"}),this.skyboxTextureView=this.skyboxTexture.createView();const r=new vn([]).generateTexture(),i=Mn(r.data);this.paletteTexture=this.device.createTexture({size:[r.width,r.height,1],format:"rgba16float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine PaletteTexture"}),this.device.queue.writeTexture({texture:this.paletteTexture},i.buffer,{bytesPerRow:r.width*8},[r.width,r.height]),this.paletteTextureView=this.paletteTexture.createView(),this.paletteSampler=this.device.createSampler({magFilter:"linear",minFilter:"linear",addressModeU:"repeat",addressModeV:"clamp-to-edge"}),this.skyboxSampler=this.device.createSampler({magFilter:"linear",minFilter:"linear",addressModeU:"repeat",addressModeV:"repeat"}),this.webcamTexture=new ma(1920,1080),this.webcamTileTexture=this.device.createTexture({size:[1920,1080,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT}),this.webcamTextureView=this.webcamTileTexture.createView(),this.uniformBufferMandelbrot=this.device.createBuffer({size:80,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Mandelbrot"}),this.uniformBufferColor=this.device.createBuffer({size:4*go,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Color"}),this.uniformBufferBrush=this.device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Brush"}),this.uniformBufferResolve=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Resolve"}),this.mandelbrotReferenceBuffer=this.device.createBuffer({size:16*1e6,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot Orbit ReferenceStorage Buffer"}),this.mandelbrotBlaBuffer=this.device.createBuffer({size:32,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot BLA Storage Buffer"}),this.mandelbrotBlaLevelBuffer=this.device.createBuffer({size:16,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot BLA Level Storage Buffer"}),this.mandelbrotBlaBufferCapacity=1,this.mandelbrotBlaLevelBufferCapacity=1,this.counterBuffer=this.device.createBuffer({size:8,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST,label:"Engine Counter Storage"}),this.counterReadbackSlots=Array.from({length:_o},(a,o)=>({buffer:this.device.createBuffer({size:8,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,label:`Engine Counter Readback ${o}`}),pending:!1,sequence:0,generation:0})),this.uniformBufferCount=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Count"}),this.uniformBufferMerge=this.device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Merge"}),await this._createPipelines(),this.resize()}async _createPipelines(){const e=this.device.createShaderModule({code:vr,label:"Engine ShaderModule Brush"}),n=this.device.createShaderModule({code:this.shaderPassCompute,label:"Engine ShaderModule Compute"}),r=this.device.createShaderModule({code:br,label:"Engine ShaderModule Resolve"}),i=this.device.createShaderModule({code:this.shaderPassColor,label:"Engine ShaderModule Color"}),a=this.device.createShaderModule({code:xr,label:"Engine ShaderModule Count"}),o=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Brush"}),s=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:3,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:4,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Mandelbrot"}),l=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Resolve"}),x=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:3,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:4,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:5,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:6,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:7,visibility:GPUShaderStage.FRAGMENT,sampler:{type:"filtering"}},{binding:8,visibility:GPUShaderStage.FRAGMENT,sampler:{type:"filtering"}},{binding:9,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d"}}],label:"Engine BindGroupLayout Color"}),g=Array.from({length:Te},()=>({format:"r32float"}));this.pipelineBrush=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[o]}),vertex:{module:e,entryPoint:"vs_main"},fragment:{module:e,entryPoint:"fs_main",targets:g},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Brush"}),this.pipelineMandelbrot=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[s]}),vertex:{module:n,entryPoint:"vs_main"},fragment:{module:n,entryPoint:"fs_main",targets:g},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Mandelbrot"}),this.pipelineResolve=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[l]}),vertex:{module:r,entryPoint:"vs_main"},fragment:{module:r,entryPoint:"fs_main",targets:g},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Resolve"}),this.pipelineColor=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[x]}),vertex:{module:i,entryPoint:"vs_main"},fragment:{module:i,entryPoint:"fs_main_direct",targets:[{format:this.format}]},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Color (direct)"}),this.pipelineColorAccumClear=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[x]}),vertex:{module:i,entryPoint:"vs_main"},fragment:{module:i,entryPoint:"fs_main",targets:[{format:"rgba16float"}]},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline ColorAccumClear"}),this.pipelineColorAccum=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[x]}),vertex:{module:i,entryPoint:"vs_main"},fragment:{module:i,entryPoint:"fs_main",targets:[{format:"rgba16float",blend:{color:{srcFactor:"one",dstFactor:"one",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one",operation:"add"}}}]},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline ColorAccum"});const z=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}],label:"Engine BindGroupLayout Count"});this.pipelineCount=this.device.createComputePipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[z]}),compute:{module:a,entryPoint:"count_unfinished"},label:"Engine ComputePipeline Count"});const M=this.device.createShaderModule({code:mr,label:"Engine ShaderModule InplaceCompute"}),y=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:4,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-write",format:"r32float",viewDimension:"2d-array"}},{binding:5,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:6,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}}],label:"Engine BindGroupLayout InplaceCompute"});this.pipelineInplace=this.device.createComputePipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[y]}),compute:{module:M,entryPoint:"cs_main"},label:"Engine ComputePipeline InplaceBrushMandelbrot"});const c=this.device.createShaderModule({code:yr,label:"Engine ShaderModule Merge"}),_=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT|GPUShaderStage.VERTEX,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Merge"});this.pipelineMerge=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[_]}),vertex:{module:c,entryPoint:"vs_main"},fragment:{module:c,entryPoint:"fs_main",targets:g},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Merge"});const L=this.device.createShaderModule({code:Sr,label:"Engine ShaderModule Present"}),N=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d"}}],label:"Engine BindGroupLayout Present"});this.pipelinePresent=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[N]}),vertex:{module:L,entryPoint:"vs_main"},fragment:{module:L,entryPoint:"fs_main",targets:[{format:this.format}]},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Present"});const d=this.device.createShaderModule({code:zr,label:"Engine ShaderModule AaTarget"}),Z=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"r32float",viewDimension:"2d"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}],label:"Engine BindGroupLayout AaTarget"});this.pipelineAaTarget=this.device.createComputePipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[Z]}),compute:{module:d,entryPoint:"cs_main"},label:"Engine ComputePipeline AaTarget"}),this.uniformBufferAaTarget||(this.uniformBufferAaTarget=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer AaParams"}));const Q=this.device.createShaderModule({code:wr,label:"Engine ShaderModule AaReseed"}),P=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:"unfilterable-float",viewDimension:"2d"}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"r32float",viewDimension:"2d-array"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}],label:"Engine BindGroupLayout AaReseed"});this.pipelineAaReseed=this.device.createComputePipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[P]}),compute:{module:Q,entryPoint:"cs_main"},label:"Engine ComputePipeline AaReseed"}),this.bindGroupBrush=void 0,this.bindGroupMandelbrot=void 0,this.bindGroupResolve=void 0,this.bindGroupColor=void 0,this.bindGroupColorRaw=void 0,this.counterBindGroup=void 0,this.bindGroupMerge=void 0,this.bindGroupInplace=void 0,this.bindGroupPresent=void 0}rebuildInplaceBindGroup(){if(!this.pipelineInplace||!this.rawArrayView||!this.uniformBufferMandelbrot||!this.mandelbrotReferenceBuffer||!this.mandelbrotBlaBuffer||!this.mandelbrotBlaLevelBuffer||!this.uniformBufferBrush||!this.counterBuffer)return;const e=this.pipelineInplace.getBindGroupLayout(0);this.bindGroupInplace=this.device.createBindGroup({layout:e,entries:[{binding:0,resource:{buffer:this.uniformBufferMandelbrot}},{binding:1,resource:{buffer:this.mandelbrotReferenceBuffer}},{binding:2,resource:{buffer:this.mandelbrotBlaBuffer}},{binding:3,resource:{buffer:this.mandelbrotBlaLevelBuffer}},{binding:4,resource:this.rawArrayView},{binding:5,resource:{buffer:this.uniformBufferBrush}},{binding:6,resource:{buffer:this.counterBuffer}}],label:"Engine BindGroup InplaceCompute"})}rebuildMandelbrotBindGroup(){if(!this.pipelineMandelbrot||!this.rawBrushArrayView||!this.uniformBufferMandelbrot||!this.mandelbrotReferenceBuffer||!this.mandelbrotBlaBuffer||!this.mandelbrotBlaLevelBuffer)return;const e=this.pipelineMandelbrot.getBindGroupLayout(0);this.bindGroupMandelbrot=this.device.createBindGroup({layout:e,entries:[{binding:0,resource:{buffer:this.uniformBufferMandelbrot}},{binding:1,resource:{buffer:this.mandelbrotReferenceBuffer}},{binding:2,resource:{buffer:this.mandelbrotBlaBuffer}},{binding:3,resource:{buffer:this.mandelbrotBlaLevelBuffer}},{binding:4,resource:this.rawBrushArrayView}],label:"Engine BindGroup Mandelbrot"}),this.rebuildInplaceBindGroup()}ensureBlaBufferCapacity(e){const n=Math.max(1,Math.ceil(e));n<=this.mandelbrotBlaBufferCapacity||(this.mandelbrotBlaBuffer?.destroy?.(),this.mandelbrotBlaBuffer=this.device.createBuffer({size:n*4*8,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot BLA Storage Buffer"}),this.mandelbrotBlaBufferCapacity=n,this.rebuildMandelbrotBindGroup())}ensureBlaLevelBufferCapacity(e){const n=Math.max(1,Math.ceil(e));n<=this.mandelbrotBlaLevelBufferCapacity||(this.mandelbrotBlaLevelBuffer?.destroy?.(),this.mandelbrotBlaLevelBuffer=this.device.createBuffer({size:n*4*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot BLA Level Storage Buffer"}),this.mandelbrotBlaLevelBufferCapacity=n,this.rebuildMandelbrotBindGroup())}invalidateCounterReadback(){this.unfinishedPixelCount=-1,this.activePixelCount=-1,this.counterReadbackGeneration++,this.lastCounterDispatchFrame=-kt,this.counterSampleFrame=-1}hasPendingCounterReadbackForCurrentGeneration(){return this.counterReadbackSlots.some(e=>e.pending&&e.generation===this.counterReadbackGeneration)}acquireCounterReadbackSlot(){const e=this.counterReadbackSlots.length;for(let n=0;n<e;n++){const r=(this.counterReadbackWriteIndex+n)%e,i=this.counterReadbackSlots[r];if(!i.pending)return this.counterReadbackWriteIndex=(r+1)%e,i}}scheduleCounterReadback(e,n,r,i){e.pending=!0,e.sequence=n,e.generation=r,(async()=>{let a=!1;try{await e.buffer.mapAsync(GPUMapMode.READ),a=!0;const o=new Uint32Array(e.buffer.getMappedRange()),s=o[0],l=o[1];this.applyCounterReadback(n,r,i,s,l)}catch{}finally{a&&e.buffer.unmap(),e.pending=!1}})()}applyCounterReadback(e,n,r,i,a){if(n!==this.counterReadbackGeneration||e<=this.latestAppliedCounterReadbackSequence)return;this.latestAppliedCounterReadbackSequence=e;const o=this.unfinishedPixelCount;this.unfinishedPixelCount=i,this.activePixelCount=a,this.counterSampleFrame=r,o>At&&i<=At&&!this.clearHistoryNextFrame&&!X(this.zoomState)&&(this.needFreezeSnapshot=!0)}scheduleGpuTiming(e){this.pendingGpuTiming||(this.pendingGpuTiming=!0,this.device.queue.onSubmittedWorkDone().then(()=>{this.pendingGpuTiming=!1,this.applyGpuFrameTiming(performance.now()-e)}).catch(()=>{this.pendingGpuTiming=!1}))}applyGpuFrameTiming(e){if(this.gpuFrameTimeMs=e,this.smoothedGpuTimeMs===0?this.smoothedGpuTimeMs=e:this.smoothedGpuTimeMs=this.smoothedGpuTimeMs*(1-wn)+e*wn,e<=0)return;const n=1e3/this.targetFps/e,r=this.iterationBatchSize*n,i=this.getEffectiveMaxBatchSize();this.iterationBatchSize=Math.round(Math.min(i,Math.max(rt,this.iterationBatchSize*.7+r*.3)))}getEffectiveMaxBatchSize(){return this.approximationMode==="bla"&&this.currentBlaLevelCount>0?po:fo}resize(){const e=(window.devicePixelRatio||1)*this.dprMultiplier,n=this.canvas.parentElement,r=n?.clientWidth||1,i=n?.clientHeight||1;this.width=Math.max(1,Math.round(r*e)),this.height=Math.max(1,Math.round(i*e));const a=this.device?.limits?.maxTextureDimension2D??8192;this.width=Math.min(this.width,a),this.height=Math.min(this.height,a),this.canvas.width=this.width,this.canvas.height=this.height,this.canvas.style.width=r+"px",this.canvas.style.height=i+"px",this.ctx.configure({device:this.device,format:this.format,alphaMode:"opaque"}),this.neutralSize=Math.ceil(Math.sqrt(this.width*this.width+this.height*this.height));const o=this.neutralSize;this.rawTexture?.destroy?.(),this.rawBrushTexture?.destroy?.(),this.resolvedTexture?.destroy?.(),this.frozenTexture?.destroy?.(),this.accumTexture?.destroy?.(),this.aaTargetTexture?.destroy?.();const s=Te,l=(y,c=0)=>{const _=this.device.createTexture({size:{width:o,height:o,depthOrArrayLayers:s},format:"r32float",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST|c,label:y}),L=_.createView({dimension:"2d-array",baseArrayLayer:0,arrayLayerCount:s,label:y+" ArrayView"}),N=[];for(let d=0;d<s;d++)N.push(_.createView({dimension:"2d",baseArrayLayer:d,arrayLayerCount:1,label:y+` Layer${d}`}));return{texture:_,arrayView:L,layerViews:N}},x=l("Engine RawTexture (A)",GPUTextureUsage.STORAGE_BINDING);this.rawTexture=x.texture,this.rawArrayView=x.arrayView,this.rawLayerViews=x.layerViews;const g=l("Engine RawBrushTexture (B)");this.rawBrushTexture=g.texture,this.rawBrushArrayView=g.arrayView,this.rawBrushLayerViews=g.layerViews;const z=l("Engine ResolvedTexture");this.resolvedTexture=z.texture,this.resolvedArrayView=z.arrayView,this.resolvedLayerViews=z.layerViews;const M=l("Engine FrozenTexture");if(this.frozenTexture=M.texture,this.frozenArrayView=M.arrayView,this.frozenLayerViews=M.layerViews,this.accumTexture=this.device.createTexture({size:{width:this.width,height:this.height,depthOrArrayLayers:1},format:"rgba16float",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING,label:"Engine AccumTexture"}),this.accumTextureView=this.accumTexture.createView({label:"Engine AccumTexture View"}),this.pipelinePresent&&(this.bindGroupPresent=this.device.createBindGroup({layout:this.pipelinePresent.getBindGroupLayout(0),entries:[{binding:0,resource:this.accumTextureView}],label:"Engine BindGroup Present"})),this.aaTargetTexture=this.device.createTexture({size:{width:o,height:o,depthOrArrayLayers:1},format:"r32float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING,label:"Engine AaTargetTexture"}),this.aaTargetTextureView=this.aaTargetTexture.createView({label:"Engine AaTargetTexture View"}),this.pipelineAaTarget&&this.rawArrayView&&this.uniformBufferAaTarget&&(this.bindGroupAaTarget=this.device.createBindGroup({layout:this.pipelineAaTarget.getBindGroupLayout(0),entries:[{binding:0,resource:this.rawArrayView},{binding:1,resource:this.aaTargetTextureView},{binding:2,resource:{buffer:this.uniformBufferAaTarget}}],label:"Engine BindGroup AaTarget"})),this.pipelineAaReseed&&this.rawArrayView&&this.uniformBufferAaTarget&&(this.bindGroupAaReseed=this.device.createBindGroup({layout:this.pipelineAaReseed.getBindGroupLayout(0),entries:[{binding:0,resource:this.aaTargetTextureView},{binding:1,resource:this.rawArrayView},{binding:2,resource:{buffer:this.uniformBufferAaTarget}}],label:"Engine BindGroup AaReseed"})),this.resetAaState(),this.zoomState=bn(),this.pipelineBrush){const y=this.pipelineBrush.getBindGroupLayout(0);this.bindGroupBrush=this.device.createBindGroup({layout:y,entries:[{binding:0,resource:{buffer:this.uniformBufferBrush}},{binding:1,resource:this.rawArrayView}],label:"Engine BindGroup Brush"})}if(this.pipelineMandelbrot&&this.rebuildMandelbrotBindGroup(),this.pipelineResolve){const y=this.pipelineResolve.getBindGroupLayout(0);this.bindGroupResolve=this.device.createBindGroup({layout:y,entries:[{binding:0,resource:{buffer:this.uniformBufferResolve}},{binding:1,resource:this.rawArrayView}],label:"Engine BindGroup Resolve"})}if(this.rebuildColorBindGroup(),this.pipelineCount&&this.counterBuffer&&this.uniformBufferCount){const y=this.pipelineCount.getBindGroupLayout(0);this.counterBindGroup=this.device.createBindGroup({layout:y,entries:[{binding:0,resource:this.rawArrayView},{binding:1,resource:{buffer:this.counterBuffer}},{binding:2,resource:{buffer:this.uniformBufferCount}}],label:"Engine BindGroup Count"})}if(this.pipelineMerge&&this.uniformBufferMerge){const y=this.pipelineMerge.getBindGroupLayout(0);this.bindGroupMerge=this.device.createBindGroup({layout:y,entries:[{binding:0,resource:{buffer:this.uniformBufferMerge}},{binding:1,resource:this.resolvedArrayView},{binding:2,resource:this.rawBrushArrayView}],label:"Engine BindGroup Merge"})}this.prevFrameMandelbrot=void 0,this.previousMandelbrot=void 0,this.previousRenderOptions=void 0,this.needRender=!0,this.invalidateCounterReadback()}areObjectsEqual(e,n){return e===void 0||n===void 0?!1:JSON.stringify(e)===JSON.stringify(n)}areColorStopsEqual(e,n){if(e.length!==n.length)return!1;for(const[r,i]of e.entries()){const a=n[r];if(!a||JSON.stringify(i)!==JSON.stringify(a))return!1}return!0}setApproximationMode(e){e!==this.approximationMode&&(e==="bla"?this.mandelbrotNavigator.use_bla():this.mandelbrotNavigator.use_perturbation(),this.approximationMode=e,this.currentBlaLevelCount=0,this.postReferenceWorker({type:"setApproximationMode",jobId:this.referenceJobId,approximationMode:e}),this.clearHistoryNextFrame=!0,this.needRender=!0,this.invalidateCounterReadback())}getApproximationMode(){return this.approximationMode}setBlaEpsilon(e){const n=Math.max(Number.MIN_VALUE,e);n!==this.blaEpsilon&&(this.mandelbrotNavigator.set_bla_epsilon(n),this.blaEpsilon=n,this.postReferenceWorker({type:"setBlaEpsilon",jobId:this.referenceJobId,blaEpsilon:n}),this.approximationMode==="bla"&&(this.currentBlaLevelCount=0,this.clearHistoryNextFrame=!0,this.needRender=!0,this.invalidateCounterReadback()))}async update(e,n){const r=performance.now();this.lastUpdateTime===0&&(this.lastUpdateTime=r);const i=(r-this.lastUpdateTime)/1e3;if(this.time+=i,this.lastUpdateTime=r,this.debugShadingActive=n.debugShading,this.pendingRefReady){this.applyPendingReferenceSwitch();return}const a=this.mandelbrotNavigator.get_approximation_mode()===1?"bla":"perturbation",o=this.mandelbrotNavigator.get_bla_epsilon();(a!==this.approximationMode||o!==this.blaEpsilon)&&(this.approximationMode=a,this.blaEpsilon=o,this.currentBlaLevelCount=0,this.postReferenceWorker({type:"setApproximationMode",jobId:this.referenceJobId,approximationMode:a}),this.postReferenceWorker({type:"setBlaEpsilon",jobId:this.referenceJobId,blaEpsilon:o}),this.clearHistoryNextFrame=!0,this.needRender=!0,this.invalidateCounterReadback());const s=!this.areObjectsEqual(e,this.previousMandelbrot),l=!this.areObjectsEqual(n,this.previousRenderOptions),x=n.stripeFrequency!==this.previousRenderOptions?.stripeFrequency,g=vo(n.colorStops),z=this.previousOrbitMetricsEnabled!==void 0&&g!==this.previousOrbitMetricsEnabled,M=x&&g;this.needRender=this.needRender||s||l,(s||l)&&this.resetAaState(),this.aaAuto=n.aaAuto??!1,(s||M||z)&&this.invalidateCounterReadback(),(M||z)&&(this.clearHistoryNextFrame=!0),this.previousOrbitMetricsEnabled=g,n.colorStops.some(Me=>(Me.webcam??0)>0)?(await this.updateWebcamTexture(),this.needRender=!0):this.webcamTexture?.closeWebcam(),n.activateAnimate&&(this.needRender=!0);const c=this.width/Math.max(1,this.height);let _=this.previousMandelbrot?.scale||1/e.scale;_<1&&(_=1/_),_=Math.sqrt(_)-1;const L=this.referenceOrbitWasReset&&!!this.prevFrameMandelbrot;this.referenceOrbitWasReset=!1;const N=!this.prevFrameMandelbrot||L,d=!!this.prevFrameMandelbrot&&this.prevFrameMandelbrot.mu!==e.mu,Z=X(this.zoomState)&&N&&!d;(N||d)&&(this.clearHistoryNextFrame=!0,Z||(this.zoomState=bn(),this.frozenBaseShiftX=0,this.frozenBaseShiftY=0,this.frozenPanShiftX=0,this.frozenPanShiftY=0),this.needFreezeSnapshot=L&&!Z&&!d,this.needMergeSnapshot=!1);{const Me=this.prevFrameMandelbrot&&this.prevFrameMandelbrot.scale!==e.scale;let ce=null;N||d?ce={type:"referenceReset",muChanged:d,orbitWasReset:L}:Me?ce={type:"scaleChanged",scale:e.scale,prevScale:this.prevFrameMandelbrot.scale}:this.prevFrameMandelbrot&&(ce={type:"scaleStable"});const Fe=X(this.zoomState),je=nt(this.zoomState),_t=me(this.zoomState),tr=Ya(this.zoomState),{state:nr,effects:rr}=ce?Xa(this.zoomState,ce,{threshold:this.zoomMagnificationThreshold}):{state:this.zoomState,effects:[]};this.zoomState=nr,!Fe&&this._prevFrameScaleChanged&&!Me&&(this.clearHistoryNextFrame=!0),this._prevFrameScaleChanged=!!Me;for(const ir of rr)switch(ir.type){case"copyResolvedToFrozen":if(this.needFreezeSnapshot=!0,X(this.zoomState)){if(Fe)this.frozenBaseShiftX=0,this.frozenBaseShiftY=0;else{const ar=e.dx-this.prevFrameMandelbrot.dx,or=e.dy-this.prevFrameMandelbrot.dy,en=Math.sqrt(c*c+1),vt=nt(this.zoomState);vt>0&&(this.frozenBaseShiftX=Math.round(-(ar*this.neutralSize)/(2*vt*en)),this.frozenBaseShiftY=Math.round(or*this.neutralSize/(2*vt*en)))}this.frozenPanShiftX=0,this.frozenPanShiftY=0}break;case"mergeResolvedAndFrozen":this.needMergeSnapshot=!tr,Fe&&je>0&&(this.mergeUniforms={zf:je/e.scale,lzf:_t/e.scale,frozenShiftU:(this.frozenBaseShiftX+this.frozenPanShiftX*(_t/je))/this.neutralSize,frozenShiftV:-(this.frozenBaseShiftY+this.frozenPanShiftY*(_t/je))/this.neutralSize,aspect:c,angle:e.angle});break;case"clearHistoryNextFrame":this.clearHistoryNextFrame=!0;break}}if(!this.areColorStopsEqual(n.colorStops,this.previousRenderOptions?.colorStops||[])||n.interpolationMode!==this.previousRenderOptions?.interpolationMode){const ce=new vn(n.colorStops,n.interpolationMode).generateTexture(),Fe=Mn(ce.data);this.device.queue.writeTexture({texture:this.paletteTexture},Fe.buffer,{bytesPerRow:ce.width*8},[ce.width,ce.height]),this.needRender=!0}const Q=Math.sin(e.angle),P=Math.cos(e.angle),h=ct(n.animation,n.animationSpeed),m=be(h.globalSpeed,0,10),w=n.activateAnimate?this.time:0,k=oe(h.tracks.paletteOffset,w,m),U=oe(h.tracks.heightPaletteShift,w,m),Y=oe(h.tracks.lightAngle,w,m)*Ht,D=oe(h.tracks.textureDrift,w,m),ee=Rn(h.tracks.textureDrift,w,m,.25),H=oe(h.tracks.skyReflectionDrift,w,m),ae=Rn(h.tracks.skyReflectionDrift,w,m,.25),W=oe(h.tracks.phaseColoring,w,m),j=oe(h.tracks.varnish,w,m),te=oe(h.tracks.microBump,w,m),K=oe(h.tracks.displacement,w,m),v=oe(h.tracks.tessellation,w,m),R=n.lightAngle+Y,A=be(n.tessellationLevel+v,0,10),E=be(n.displacementAmount+K,0,.1),O=be(n.microBumpStrength+te,0,10),u=be(n.varnishStrength+j,0,10),b=be(n.heightPaletteShift+U,0,100),S=be(n.phaseColoringStrength+W,0,100),T=Math.hypot(Math.cos(R),Math.sin(R),1.85),B=Xn(n.textureMapping),G=X(this.zoomState),V=G?nt(this.zoomState)/e.scale:1,I=G?me(this.zoomState)/e.scale:1,F=nt(this.zoomState),ne=me(this.zoomState),ie=Math.max(1,Math.round(n.antialiasLevel??1)),pt=new Float32Array([n.palettePeriod,n.paletteOffset+k,_,this.time,c,e.angle,n.activateAnimate?1:0,e.mu,V,G||this.frozenAligned||this.needFreezeSnapshot?1:0,I,G&&F>0?(this.frozenBaseShiftX+this.frozenPanShiftX*(ne/F))/this.neutralSize:0,G&&F>0?-(this.frozenBaseShiftY+this.frozenPanShiftY*(ne/F))/this.neutralSize:0,A,E,m,e.epsilon,n.ambientOcclusionStrength,O,n.subsurfaceStrength,n.reliefDepth,n.localShadowStrength,R,u,Math.log(e.mu),Q,P,Math.cos(R)/T,Math.sin(R)/T,1.85/T,n.paletteMirror?1:0,n.debugShading?1:0,b,n.orbitTrapStrength,S,zn(B.xVariable),zn(B.yVariable),B.xScale,B.yScale,B.mirrored?1:0,parseFloat(e.cx),parseFloat(e.cy),e.scale,0,.03*D,.03*ee,.02*H,.02*ae,k,U,Y,D,H,W,j,te,K,v,this.aaSampleIndex,ie]);if(this.device.queue.writeBuffer(this.uniformBufferColor,0,pt.buffer),!this.needsMoreFrames())return;const le=Math.ceil(e.maxIterations);this.currentMaxIterations=le;const we=X(this.zoomState)&&me(this.zoomState)>0?me(this.zoomState):e.scale,Jt=!(X(this.zoomState)&&me(this.zoomState)>0)&&e.scaleStr?Et(e.scaleStr):Bt(we),De=Jt.exponent,Oe=De<=Wa;this.floatExpActive=Oe;const ht=e.dxStr?Et(e.dxStr):Bt(e.dx),gt=e.dyStr?Et(e.dyStr):Bt(e.dy),Kn=ht.mantissa===0?0:Math.fround(ht.mantissa*2**(ht.exponent-De)),Jn=gt.mantissa===0?0:Math.fround(gt.mantissa*2**(gt.exponent-De));this.referenceViewKey||(console.log("[REF] update: reset branch (key empty) | deep",Oe,"expScale",De,"mode",this.approximationMode,"dx",e.dx,"dxStr",e.dxStr),this.resetReferenceJob(e,we,le)),this.syncReferenceWorkerView(e,we,le);const Ge=Math.max(0,this.referenceAvailableOrbitLen-1),$e=Math.min(le,Ge);this.currentGuardedMaxIter=$e,this.currentReferenceAvailableIter=Ge,this.currentReferenceRemainingIter=Math.max(0,le-Ge),this.orbitIncomplete=!this.referenceWorkerFailed&&Ge<le;const mt=Ge>=le,Qt=this.approximationMode==="bla"&&mt&&this.currentBlaLevelCount>0&&this.referenceBlaReadyMaxIterations>=$e?1:0,Qn=Qt?this.currentBlaLevelCount:0,er=new Float32Array([Oe?Kn:e.dx,Oe?Jn:e.dy,e.mu,Oe?Jt.mantissa:we,c,e.angle,this.iterationBatchSize,e.epsilon,n.antialiasLevel,0,$e,mt?1:0,Qt,Qn,this.blaEpsilon,n.stripeFrequency,g?1:0,De,this.aaOffsetX,this.aaOffsetY]);this.device.queue.writeBuffer(this.uniformBufferMandelbrot,0,er.buffer),!X(this.zoomState)&&!this.clearHistoryNextFrame&&!this.aaActive&&mt&&this.prevGuardedMaxIter<le&&this.prevGuardedMaxIter>0&&(this.needFreezeSnapshot=!0,this.clearHistoryNextFrame=!0),this.prevGuardedMaxIter=$e,this.previousMandelbrot=structuredClone(e),this.previousRenderOptions=structuredClone(n)}resetAaState(){this.aaActive=!1,this.aaSampleIndex=0,this.aaAccumulatedSamples=0,this.aaOffsetX=0,this.aaOffsetY=0,this.aaReseedPending=!1}triggerAaAccumulation(){this.resetAaState(),this.aaActive=!0,this.needRender=!0}get aaProgress(){const e=Math.max(1,Math.round(this.previousRenderOptions?.antialiasLevel??1));return{active:this.aaActive,done:this.aaAccumulatedSamples,total:e}}async render(){if(this.skipRenderOnce){this.skipRenderOnce=!1;return}if(!this.needsMoreFrames()||!this.pipelineBrush||!this.pipelineMandelbrot||!this.pipelineResolve||!this.pipelineColor||!this.bindGroupBrush||!this.bindGroupMandelbrot||!this.bindGroupResolve||!this.bindGroupColor||!this.previousMandelbrot)return;const e=this.previousRenderOptions;if(!e)return;const n=this.width/Math.max(1,this.height),r=xn(e.zoomMinBrushStep,1,1,64),i=Math.max(xn(e.sentinelSeedStep,64,1,4096),r),a=i,o=this.clearHistoryNextFrame?1:0;this.clearHistoryNextFrame&&this.invalidateCounterReadback();const s=++this.renderFrameSerial;let l=0,x=0;if(!this.clearHistoryNextFrame&&this.prevFrameMandelbrot){const v=this.previousMandelbrot.dx-this.prevFrameMandelbrot.dx,R=this.previousMandelbrot.dy-this.prevFrameMandelbrot.dy,A=this.neutralSize,E=Math.sqrt(n*n+1),O=X(this.zoomState)&&me(this.zoomState)>0?me(this.zoomState):this.previousMandelbrot.scale;l=-(v*A)/(2*O*E),x=R*A/(2*O*E)}const g=Math.round(l),z=Math.round(x),M=g!==0||z!==0;this.clearHistoryNextFrame?(this.cumulativeShiftX=0,this.cumulativeShiftY=0):(this.cumulativeShiftX+=g,this.cumulativeShiftY+=z,X(this.zoomState)&&(this.frozenPanShiftX+=g,this.frozenPanShiftY+=z),M&&(this.frozenAligned=!1)),M&&!X(this.zoomState)&&(this.needFreezeSnapshot=!1);const y=(this.cumulativeShiftX%a+a)%a,c=(this.cumulativeShiftY%a+a)%a,_=this.hasPendingCounterReadbackForCurrentGeneration(),L=!_&&(this.clearHistoryNextFrame||this.activePixelCount<0||this.iterationBatchSize>rt||this.activePixelCount<mo*this.gpuLoadMultiplier);L&&this.refinementWasGated&&(this.iterationBatchSize=rt),this.refinementWasGated=!L;const N=L?1:0,d=new Float32Array([n,this.previousMandelbrot.angle,o,i,a,l,x,this.previousMandelbrot.mu,y,c,X(this.zoomState)?r:0,N]);this.device.queue.writeBuffer(this.uniformBufferBrush,0,d.buffer);const Z=new Float32Array([this.previousMandelbrot.mu,y,c]);this.device.queue.writeBuffer(this.uniformBufferResolve,0,Z.buffer);const P=!_&&(this.unfinishedPixelCount<0||this.activePixelCount<0||s-this.lastCounterDispatchFrame>=kt)?this.acquireCounterReadbackSlot():void 0;let h;const m=this.device.createCommandEncoder();if(this.needMergeSnapshot&&this.pipelineMerge&&this.bindGroupMerge&&this.resolvedTexture&&this.frozenTexture&&this.rawBrushTexture){const v=this.neutralSize;m.copyTextureToTexture({texture:this.frozenTexture},{texture:this.rawBrushTexture},{width:v,height:v,depthOrArrayLayers:Te});const R=new Float32Array([this.mergeUniforms.zf,this.mergeUniforms.lzf,this.mergeUniforms.frozenShiftU,this.mergeUniforms.frozenShiftV,this.mergeUniforms.aspect,this.mergeUniforms.angle]);this.device.queue.writeBuffer(this.uniformBufferMerge,0,R.buffer);const A=this.frozenLayerViews.map(O=>({view:O,clearValue:{r:0,g:0,b:0,a:0},loadOp:"clear",storeOp:"store"})),E=m.beginRenderPass({colorAttachments:A});E.setPipeline(this.pipelineMerge),E.setBindGroup(0,this.bindGroupMerge),E.draw(6,1,0,0),E.end(),this.needMergeSnapshot=!1,this.frozenAligned=!0,this.frozenPanShiftX=0,this.frozenPanShiftY=0}if(this.needFreezeSnapshot&&this.resolvedTexture&&this.frozenTexture){const v=Te,R=this.neutralSize;m.copyTextureToTexture({texture:this.resolvedTexture},{texture:this.frozenTexture},{width:R,height:R,depthOrArrayLayers:v}),this.needFreezeSnapshot=!1,this.frozenAligned=!0,this.frozenPanShiftX=0,this.frozenPanShiftY=0,X(this.zoomState)||(this.frozenBaseShiftX=0,this.frozenBaseShiftY=0)}const w=(v,R="clear")=>v.map(A=>({view:A,clearValue:{r:0,g:0,b:0,a:0},loadOp:R,storeOp:"store"})),k=this.useInplaceCompute&&!this.clearHistoryNextFrame&&!M&&!!this.pipelineInplace&&!!this.bindGroupInplace&&!!this.counterBuffer;if((!k||this.unfinishedPixelCount!==0||this.activePixelCount!==0)&&(this.lastRawMutationFrame=s),k){if(this.aaReseedPending&&this.pipelineAaReseed&&this.bindGroupAaReseed&&this.uniformBufferAaTarget){const A=Math.max(1,Math.round(e.antialiasLevel??1));this.device.queue.writeBuffer(this.uniformBufferAaTarget,0,new Float32Array([A,this.aaSampleIndex,this.height,0]).buffer);const E=m.beginComputePass();E.setPipeline(this.pipelineAaReseed),E.setBindGroup(0,this.bindGroupAaReseed);const O=Math.ceil(this.neutralSize/16);E.dispatchWorkgroups(O,O),E.end(),this.aaReseedPending=!1}m.clearBuffer(this.counterBuffer,0,8);const v=m.beginComputePass();v.setPipeline(this.pipelineInplace),v.setBindGroup(0,this.bindGroupInplace);const R=Math.ceil(this.neutralSize/16);if(v.dispatchWorkgroups(R,R),v.end(),P){const A=++this.counterReadbackSequence,E=this.counterReadbackGeneration;m.copyBufferToBuffer(this.counterBuffer,0,P.buffer,0,8),this.lastCounterDispatchFrame=s,h={slot:P,sequence:A,generation:E,frame:s}}}else{const v=m.beginRenderPass({colorAttachments:w(this.rawBrushLayerViews)});v.setPipeline(this.pipelineBrush),v.setBindGroup(0,this.bindGroupBrush),v.draw(6,1,0,0),v.end(),m.copyTextureToTexture({texture:this.rawBrushTexture},{texture:this.rawTexture},{width:this.neutralSize,height:this.neutralSize,depthOrArrayLayers:Te});const R=m.beginRenderPass({colorAttachments:w(this.rawLayerViews,"load")});if(R.setPipeline(this.pipelineMandelbrot),R.setBindGroup(0,this.bindGroupMandelbrot),R.draw(6,1,0,0),R.end(),this.pipelineCount&&this.counterBindGroup&&this.counterBuffer&&P&&this.uniformBufferCount){const A=++this.counterReadbackSequence,E=this.counterReadbackGeneration,O=this.previousMandelbrot.mu;this.device.queue.writeBuffer(this.uniformBufferCount,0,new Float32Array([O,n,this.previousMandelbrot.angle])),m.clearBuffer(this.counterBuffer,0,8);const u=m.beginComputePass();u.setPipeline(this.pipelineCount),u.setBindGroup(0,this.counterBindGroup),u.dispatchWorkgroups(Math.ceil(this.neutralSize/16),Math.ceil(this.neutralSize/16)),u.end(),m.copyBufferToBuffer(this.counterBuffer,0,P.buffer,0,8),this.lastCounterDispatchFrame=s,h={slot:P,sequence:A,generation:E,frame:s}}}const U=k&&!!this.bindGroupColorRaw&&!this.needFreezeSnapshot&&!this.needMergeSnapshot&&this.unfinishedPixelCount===0&&this.activePixelCount===0&&this.counterSampleFrame>=this.lastRawMutationFrame;this.resolveSkipped=U;const Y=!this.clearHistoryNextFrame&&!this.needFreezeSnapshot&&!this.needMergeSnapshot&&!X(this.zoomState)&&!this.orbitIncomplete&&this.unfinishedPixelCount===0&&this.activePixelCount===0&&!this.hasPendingCounterReadbackForCurrentGeneration();if(!U){m.copyTextureToTexture({texture:this.rawTexture},{texture:this.resolvedTexture},{width:this.neutralSize,height:this.neutralSize,depthOrArrayLayers:Te});const v=m.beginRenderPass({colorAttachments:w(this.resolvedLayerViews,"load")});v.setPipeline(this.pipelineResolve),v.setBindGroup(0,this.bindGroupResolve),v.draw(6,1,0,0),v.end()}const D=U?this.bindGroupColorRaw:this.bindGroupColor,ee=this.ctx.getCurrentTexture().createView(),H=Math.max(1,Math.round(e.antialiasLevel??1)),ae=Math.sqrt(n*n+1);this.aaActive&&H<=1&&this.resetAaState(),this.aaAuto&&H>1&&!this.aaActive&&this.aaAccumulatedSamples===0&&Y&&this.triggerAaAccumulation();const W=this.aaActive&&Y&&this.aaAccumulatedSamples<H&&!!this.accumTextureView&&!!this.pipelineColorAccum&&!!this.pipelineColorAccumClear,j=this.aaActive&&(this.aaAccumulatedSamples>=1||W);if(W){const v=this.aaSampleIndex===0,R=m.beginRenderPass({colorAttachments:[{view:this.accumTextureView,clearValue:{r:0,g:0,b:0,a:0},loadOp:v?"clear":"load",storeOp:"store"}]});R.setPipeline(v?this.pipelineColorAccumClear:this.pipelineColorAccum),R.setBindGroup(0,D),R.draw(6,1,0,0),R.end()}else if(!j){const v=m.beginRenderPass({colorAttachments:[{view:ee,clearValue:{r:1,g:1,b:1,a:1},loadOp:"clear",storeOp:"store"}]});v.setPipeline(this.pipelineColor),v.setBindGroup(0,D),v.draw(6,1,0,0),v.end()}if(j&&this.pipelinePresent&&this.bindGroupPresent){const v=m.beginRenderPass({colorAttachments:[{view:ee,clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}]});v.setPipeline(this.pipelinePresent),v.setBindGroup(0,this.bindGroupPresent),v.draw(6,1,0,0),v.end()}if(W&&this.aaSampleIndex===0&&!!this.pipelineAaTarget&&!!this.bindGroupAaTarget&&!!this.uniformBufferAaTarget){this.device.queue.writeBuffer(this.uniformBufferAaTarget,0,new Float32Array([H,0,this.height,0]).buffer);const v=m.beginComputePass();v.setPipeline(this.pipelineAaTarget),v.setBindGroup(0,this.bindGroupAaTarget),v.dispatchWorkgroups(Math.ceil(this.neutralSize/16),Math.ceil(this.neutralSize/16)),v.end()}const K=performance.now();if(this.device.queue.submit([m.finish()]),this.scheduleGpuTiming(K),h&&this.scheduleCounterReadback(h.slot,h.sequence,h.generation,h.frame),this.clearHistoryNextFrame=!1,this.prevFrameMandelbrot={...this.previousMandelbrot},this.needRender=!1,W)if(this.aaAccumulatedSamples++,this.aaAccumulatedSamples<H){this.aaSampleIndex++;const v=Ka(this.aaSampleIndex);this.aaOffsetX=v.x*ae/Math.max(1,this.neutralSize),this.aaOffsetY=v.y*ae/Math.max(1,this.neutralSize),this.useAaSelectiveReseed&&this.useInplaceCompute&&r<=1&&!!this.pipelineAaReseed&&!!this.bindGroupAaReseed?(this.aaReseedPending=!0,this.invalidateCounterReadback()):this.clearHistoryNextFrame=!0,this.needRender=!0}else this.aaActive=!1;if(this.snapshotCallback){try{const v=this.snapshotDestWidth??256,R=Math.round(v*9/16),A=this.device.createTexture({size:[v,R,1],format:this.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});{const I=this.device.createCommandEncoder(),F=I.beginRenderPass({colorAttachments:[{view:A.createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}]});F.setPipeline(this.pipelineColor),F.setBindGroup(0,D),F.draw(6,1,0,0),F.end(),this.device.queue.submit([I.finish()])}const E=I=>I+255&-256,O=v*4,u=E(O),b=u*R,S=this.device.createBuffer({size:b,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});{const I=this.device.createCommandEncoder();I.copyTextureToBuffer({texture:A},{buffer:S,offset:0,bytesPerRow:u},{width:v,height:R,depthOrArrayLayers:1}),this.device.queue.submit([I.finish()])}await this.device.queue.onSubmittedWorkDone(),await S.mapAsync(GPUMapMode.READ);const T=S.getMappedRange(),B=new Uint8ClampedArray(v*R*4),G=new Uint8Array(T);for(let I=0;I<R;++I)for(let F=0;F<v;++F){const ne=I*u+F*4,ie=(I*v+F)*4;B[ie+0]=G[ne+2],B[ie+1]=G[ne+1],B[ie+2]=G[ne+0],B[ie+3]=G[ne+3]}const V=document.createElement("canvas");V.width=v,V.height=R,V.getContext("2d").putImageData(new ImageData(B,v,R),0,0),S.unmap(),this.snapshotCallback(V.toDataURL("image/png"))}catch{this.snapshotCallback("")}this.snapshotCallback=void 0,this.snapshotDestWidth=void 0}}destroy(){this.stopRenderLoop(),this.postReferenceWorker({type:"dispose"}),this.referenceWorker?.terminate(),this.referenceWorker=void 0,this.rawTexture?.destroy?.(),this.rawBrushTexture?.destroy?.(),this.resolvedTexture?.destroy?.(),this.frozenTexture?.destroy?.(),this.mandelbrotReferenceBuffer?.destroy?.(),this.mandelbrotBlaBuffer?.destroy?.(),this.mandelbrotBlaLevelBuffer?.destroy?.(),this.uniformBufferMandelbrot?.destroy?.(),this.uniformBufferColor?.destroy?.(),this.uniformBufferBrush?.destroy?.(),this.uniformBufferResolve?.destroy?.(),this.counterBuffer?.destroy?.();for(const e of this.counterReadbackSlots)e.buffer.destroy?.();this.counterReadbackSlots=[],this.uniformBufferCount?.destroy?.(),this.uniformBufferMerge?.destroy?.(),this.webcamTexture?.closeWebcam(),this.webcamTileTexture?.destroy?.(),this.paletteTexture?.destroy?.()}needsMoreFrames(){let e="";return this.needRender?e="needRender":this.snapshotCallback?e="snapshot":X(this.zoomState)?e="zoomActive":this.clearHistoryNextFrame?e="clearHistory":this.needFreezeSnapshot?e="freezeSnapshot":this.needMergeSnapshot?e="mergeSnapshot":this.isReferenceValidating?e="referenceValidating":this.orbitIncomplete?e="orbitIncomplete":this.unfinishedPixelCount<0||this.unfinishedPixelCount>At?e=`unfinished=${this.unfinishedPixelCount}`:this.aaActive?e="aaAccumulating":this.aaAuto&&!this.aaActive&&this.aaAccumulatedSamples===0&&this.unfinishedPixelCount===0&&this.activePixelCount===0&&!this.orbitIncomplete&&!X(this.zoomState)&&(e="aaAutoPending"),e!==""}getIterationBatchSize(){return this.iterationBatchSize}startRenderLoop(e){this._drawFn=e,this._rafId===null&&(this._rafId=requestAnimationFrame(async()=>this._loop()))}stopRenderLoop(){this._rafId!==null&&(cancelAnimationFrame(this._rafId),this._rafId=null),this._drawFn=null}async _loop(){if(!this._drawFn){this._rafId=null;return}const e=performance.now(),n=Math.min(this.smoothedGpuTimeMs,500);if(e-this._lastDrawMs>=n){this._lastDrawMs=e;const r=this.needsMoreFrames();this.isRendering=r,await this._drawFn(),r&&this._fpsFrameCount++;const i=performance.now();this._fpsLastTime===0&&(this._fpsLastTime=i);const a=i-this._fpsLastTime;a>=1e3&&(this.fps=Math.round(this._fpsFrameCount*1e3/a),this._fpsFrameCount=0,this._fpsLastTime=i)}this._rafId=requestAnimationFrame(async()=>this._loop())}async updateTileTexture(e,n=e){if(this.tileTextureSourceKey===n)return;const r=await this._loadTexture(e);this.tileTexture?.destroy?.(),this.tileTexture=r,this.tileTextureView=this.tileTexture.createView(),this.tileTextureSourceKey=n,this.rebuildColorBindGroup(),this.needRender=!0}isTileTextureSourceCurrent(e){return this.tileTextureSourceKey===e}async updateSkyboxTexture(e,n=e){if(this.skyboxTextureSourceKey===n)return;const r=await this._loadTexture(e);this.skyboxTexture?.destroy?.(),this.skyboxTexture=r,this.skyboxTextureView=this.skyboxTexture.createView(),this.skyboxTextureSourceKey=n,this.rebuildColorBindGroup(),this.needRender=!0}isSkyboxTextureSourceCurrent(e){return this.skyboxTextureSourceKey===e}rebuildColorBindGroup(){if(this.pipelineColor&&this.resolvedArrayView&&this.frozenArrayView){const e=this.pipelineColor.getBindGroupLayout(0),n=r=>[{binding:0,resource:{buffer:this.uniformBufferColor}},{binding:1,resource:r},{binding:2,resource:this.tileTextureView},{binding:3,resource:this.skyboxTextureView},{binding:4,resource:this.webcamTextureView},{binding:5,resource:this.paletteTextureView},{binding:6,resource:this.frozenArrayView},{binding:7,resource:this.paletteSampler},{binding:8,resource:this.skyboxSampler},{binding:9,resource:this.aaTargetTextureView}];this.bindGroupColor=this.device.createBindGroup({layout:e,entries:n(this.resolvedArrayView),label:"Engine BindGroup Color"}),this.bindGroupColorRaw=this.rawArrayView?this.device.createBindGroup({layout:e,entries:n(this.rawArrayView),label:"Engine BindGroup Color (raw)"}):void 0}}async _loadTexture(e){const n=new Image;n.src=e;try{await n.decode()}catch(a){throw console.warn("\xc9chec du chargement de la texture : "+e,a),a}const r=await createImageBitmap(n,{premultiplyAlpha:"none"}),i=this.device.createTexture({size:[r.width,r.height,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine LoadedTexture "+e});return this.device.queue.copyExternalImageToTexture({source:r},{texture:i},[r.width,r.height]),i}static ITER_PIXEL_LAYERS=[0,2,3,4,5];async readIterationDataAt(e,n,r,i){if(!this.resolvedTexture||!this.device)return null;const a=this.resolveSkipped&&this.rawTexture?this.rawTexture:this.resolvedTexture,o=this.width/Math.max(1,this.height),s=this.previousMandelbrot?.angle??0,l=e/Math.max(1,r),x=1-n/Math.max(1,i),g=l*2-1,z=x*2-1,M=g*o,y=z,c=Math.sin(s),_=Math.cos(s),L=_*M-c*y,N=c*M+_*y,d=Math.sqrt(o*o+1),Z=L/d,Q=N/d,P=Z*.5+.5,h=Q*.5+.5,m=this.neutralSize,w=Math.floor(Math.max(0,Math.min(m-1,P*m))),k=Math.floor(Math.max(0,Math.min(m-1,(1-h)*m))),U=Kt.ITER_PIXEL_LAYERS,Y=1,D=4,H=(u=>u+255&-256)(Y*D),ae=H*U.length,W=this.device.createBuffer({size:ae,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,label:"Engine IterPixel Readback"}),j=this.device.createCommandEncoder();for(let u=0;u<U.length;u++)j.copyTextureToBuffer({texture:a,origin:{x:w,y:k,z:U[u]}},{buffer:W,offset:H*u,bytesPerRow:H},{width:1,height:1,depthOrArrayLayers:1});this.device.queue.submit([j.finish()]),await W.mapAsync(GPUMapMode.READ);const te=new Float32Array(W.getMappedRange()),K=H/D,v=te[0*K],R=te[1*K],A=te[2*K],E=te[3*K],O=te[4*K];return W.unmap(),W.destroy(),v<0?null:{iter:v,zx:R,zy:A,derX:E,derY:O}}async updateWebcamTexture(){try{await this.webcamTexture?.openWebcam(),this.webcamTexture?.isOpen()&&await this.webcamTexture?.drawWebGPUTexture(this.webcamTileTexture,this.device)}catch(e){console.warn("Webcam texture update failed:",e)}}async getSnapshotPng(e=256){return await new Promise(n=>{this.snapshotCallback=n,this.snapshotDestWidth=e,this.needRender=!0})}}let So,zo,Mo,Ro,To,Bo,Eo,at,Tn,Co,Ao,ko;So={class:"mandelbrot-canvas-wrap"};zo={key:0,class:"debug-legend","aria-hidden":"true"};wo=Wt({__name:"Mandelbrot",props:He({mu:{default:4},epsilon:{default:1e-9},colorStops:{default:()=>[{color:"#002500",position:0},{color:"#175b3d",position:.16},{color:"#ffceb6",position:.26},{color:"#edffff",position:.42},{color:"#ff8fbc",position:.7016397849462366},{color:"#a6003e",position:.8575},{color:"#100000",position:1}]},palettePeriod:{default:100},paletteOffset:{default:0},heightPaletteShift:{default:0},paletteMirror:{type:Boolean,default:!1},antialiasLevel:{default:1},aaAuto:{type:Boolean,default:!1},activateAnimate:{type:Boolean,default:!1},debugShading:{type:Boolean,default:!1},dprMultiplier:{default:1},maxIterationMultiplier:{default:.1},targetFps:{default:60},gpuLoadMultiplier:{default:1},zoomMinBrushStep:{default:1},sentinelSeedStep:{default:64},interpolationMode:{default:"lab"},tessellationLevel:{default:0},displacementAmount:{default:0},animation:{default:()=>ct(null,1)},animationSpeed:{default:1},ambientOcclusionStrength:{default:0},microBumpStrength:{default:0},subsurfaceStrength:{default:0},reliefDepth:{default:1},localShadowStrength:{default:0},lightAngle:{default:0},varnishStrength:{default:0},orbitTrapStrength:{default:0},phaseColoringStrength:{default:0},stripeFrequency:{default:8},textureMapping:{default:()=>Ct({textureMappingMode:0})},textureMappingMode:{}},{cx:{default:"-1.9771995110313272619112808106831597"},cxModifiers:{},cy:{default:"0.0"},cyModifiers:{},scale:{default:"2.5"},scaleModifiers:{},angle:{default:0},angleModifiers:{}}),emits:He(["ready"],["update:cx","update:cy","update:scale","update:angle"]),setup(t,{expose:e,emit:n}){const r=Be(null);let i=null,a=null,o,s=!1,l="";const x=Be(null),g=Be(null),z=Be(!1);function M(h){if(typeof h!="string")return!1;const m=h.trim();return m?/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(m):!1}const y=n,c=de(t,"cx"),_=de(t,"cy"),L=de(t,"scale"),N=de(t,"angle");Ne(()=>[c.value,_.value,L.value,N.value],([h,m,w,k],[U,Y,D,ee])=>{(h!==U||m!==Y)&&console.log("[REF] Mandelbrot.vue watcher cx change",String(h).slice(0,14),"isUpdating",s),!s&&o&&(!h||!m||!w||((h!==U||m!==Y)&&M(h)&&M(m)&&(o.cancel_transition(),o.origin(h,m),a?.resetReference(h,m)),w!==D&&(console.log("[REF] watcher scale change",String(w).slice(0,14),"type",typeof w,"valid",M(w)),M(w)&&o.scale(w)),k!==ee&&o.angle(Number(k))))},{flush:"sync"});const d=t;Ne(()=>d.dprMultiplier,h=>{a&&(a.dprMultiplier=h,P())}),Ne(()=>d.targetFps,h=>{a&&(a.targetFps=h)}),Ne(()=>d.gpuLoadMultiplier,h=>{a&&(a.gpuLoadMultiplier=h)});async function Z(){if(!a||!o)return;const h=r.value,m=o.step(h?h.width:void 0,h?h.height:void 0);if(!m)return;const[w,k]=m,[U,Y,D,ee]=o.get_params();D!==l&&(l=D,console.log("[REF] draw scale",D,"dx",String(w).slice(0,12),"cx",String(U).slice(0,14))),s=!0,c.value=U,_.value=Y,L.value=D,N.value=parseFloat(ee),await cr(),s=!1;const H=Math.max(d.mu,4),ae=Math.max(0,Math.ceil(Math.log2(Math.log(H)/Math.log(4)))),W=Math.min(Math.max(100,1e3*d.maxIterationMultiplier*Math.log2(1/parseFloat(D)))+ae,1e6);if(await a.update({cx:U,cy:Y,dx:parseFloat(w),dy:parseFloat(k),dxStr:w,dyStr:k,mu:d.mu,scale:parseFloat(D),scaleStr:D,angle:parseFloat(ee),maxIterations:W,epsilon:d.epsilon},{antialiasLevel:d.antialiasLevel,aaAuto:d.aaAuto,palettePeriod:d.palettePeriod,paletteOffset:d.paletteOffset,heightPaletteShift:d.heightPaletteShift,paletteMirror:d.paletteMirror,colorStops:dr(d.colorStops),interpolationMode:d.interpolationMode,activateAnimate:d.activateAnimate,debugShading:d.debugShading,tessellationLevel:d.tessellationLevel,displacementAmount:d.displacementAmount,animation:ct(d.animation,d.animationSpeed),animationSpeed:d.animationSpeed,ambientOcclusionStrength:d.ambientOcclusionStrength,microBumpStrength:d.microBumpStrength,subsurfaceStrength:d.subsurfaceStrength,reliefDepth:d.reliefDepth,localShadowStrength:d.localShadowStrength,lightAngle:d.lightAngle,varnishStrength:d.varnishStrength,orbitTrapStrength:d.orbitTrapStrength,phaseColoringStrength:d.phaseColoringStrength,stripeFrequency:d.stripeFrequency,zoomMinBrushStep:d.zoomMinBrushStep,sentinelSeedStep:d.sentinelSeedStep,textureMapping:Ct(d),textureMappingMode:d.textureMappingMode}),await a.render(),d.debugShading&&o&&r.value){const j=o.get_reference_params();if(j&&j.length>=2){const[te,K]=j,v=r.value.width,R=r.value.height,A=o.coordinate_to_pixel(te,K,v,R);if(A&&A.length===2){const E=A[0]*(r.value.clientWidth/v),O=A[1]*(r.value.clientHeight/R);x.value=E,g.value=O,z.value=E>=0&&E<=r.value.clientWidth&&O>=0&&O<=r.value.clientHeight}else z.value=!1}else z.value=!1}else z.value=!1}Ne(()=>d.debugShading,h=>{h&&a&&!a.isRendering&&Z()});async function Q(){if(!r.value)return;i=r.value;let h=c.value,m=_.value,w=L.value;return M(h)||(h="-0.7",c.value=h),M(m)||(m="0.0",_.value=m),M(w)||(w="2.5",L.value=w),o=new Pt(h,m,w,Number(N.value)),o.origin(h,m),o.scale(w),o.angle(Number(N.value)),a=new Kt(i,{antialiasLevel:d.antialiasLevel,aaAuto:d.aaAuto,palettePeriod:d.palettePeriod,paletteOffset:d.paletteOffset,heightPaletteShift:d.heightPaletteShift,paletteMirror:d.paletteMirror,colorStops:d.colorStops,interpolationMode:d.interpolationMode,activateAnimate:d.activateAnimate,debugShading:d.debugShading,tessellationLevel:d.tessellationLevel,displacementAmount:d.displacementAmount,animation:ct(d.animation,d.animationSpeed),animationSpeed:d.animationSpeed,ambientOcclusionStrength:d.ambientOcclusionStrength,microBumpStrength:d.microBumpStrength,subsurfaceStrength:d.subsurfaceStrength,reliefDepth:d.reliefDepth,localShadowStrength:d.localShadowStrength,lightAngle:d.lightAngle,varnishStrength:d.varnishStrength,orbitTrapStrength:d.orbitTrapStrength,phaseColoringStrength:d.phaseColoringStrength,stripeFrequency:d.stripeFrequency,zoomMinBrushStep:d.zoomMinBrushStep,sentinelSeedStep:d.sentinelSeedStep,textureMapping:Ct(d),textureMappingMode:d.textureMappingMode}),a.dprMultiplier=d.dprMultiplier??1,a.targetFps=d.targetFps??60,a.gpuLoadMultiplier=d.gpuLoadMultiplier??1,a.initialize(o)}async function P(){if(!r.value||!a)return;const h=r.value.getBoundingClientRect();r.value.width=h.width,r.value.height=h.height,a.resize()}return Bn(async()=>{await Q(),window.addEventListener("resize",P),await P(),a&&(y("ready",a),a.startRenderLoop(Z))}),En(()=>{a?.destroy(),a=null,window.removeEventListener("resize",P)}),e({getCanvas:()=>r.value,getEngine:()=>a,getNavigator:()=>o,translate:(h,m)=>o?.translate(h,m),translateDirect:(h,m)=>{if(!o)return;const w=r.value;o.translate_direct(h,m,w?w.width:void 0,w?w.height:void 0)},rotate:h=>o?.rotate(h),angle:h=>o?.angle(h),zoom:h=>{console.log("[REF] zoom() called factor",h),o?.zoom(h)},resetReferenceTo:(h,m,w,k)=>{console.log("[REF] resetReferenceTo (travel done)",h.slice(0,14),"scale",w,"engine?",!!a,"nav?",!!o),!(!o||!a)&&(o.cancel_transition(),o.origin(h,m),o.scale(w),o.angle(k),a.resetReference(h,m))},step:()=>{if(!o)return;const h=r.value;return o.step(h?h.width:void 0,h?h.height:void 0)},getParams:()=>o?.get_params(),drawOnce:async()=>Z(),resize:async()=>P(),initialize:async()=>Q(),useBla:()=>a?.setApproximationMode("bla"),usePerturbation:()=>a?.setApproximationMode("perturbation"),setApproximationMode:h=>a?.setApproximationMode(h),getApproximationMode:()=>a?.getApproximationMode(),setBlaEpsilon:h=>a?.setBlaEpsilon(h)}),(h,m)=>(Ee(),Ce("div",So,[C("canvas",{ref_key:"canvasRef",ref:r},null,512),d.debugShading?(Ee(),Ce("div",zo,[...m[0]||(m[0]=[C("div",{class:"debug-legend-item debug-legend-top-left"},"Distance au bord",-1),C("div",{class:"debug-legend-item debug-legend-top-right"},"Palette / phase continue",-1),C("div",{class:"debug-legend-item debug-legend-bottom-left"},"Gradient du relief",-1),C("div",{class:"debug-legend-item debug-legend-bottom-right"},"Angle de la d\xe9riv\xe9e",-1)])])):It("",!0),d.debugShading&&z.value&&x.value!==null&&g.value!==null?(Ee(),Ce("div",{key:1,class:"debug-ref-marker",style:lr({left:x.value+"px",top:g.value+"px"})},[...m[1]||(m[1]=[C("div",{class:"debug-ref-crosshair"},null,-1),C("div",{class:"debug-ref-label"},"R\xe9f",-1)])],4)):It("",!0)]))}});Mo={class:"mobile-nav-controls"};Ro={key:0,class:"directional-controls"};To=Wt({__name:"MobileNavigationControls",props:He({mandelbrotRef:{}},{expanded:{type:Boolean,default:!1},expandedModifiers:{}}),emits:["update:expanded"],setup(t){const e=t,n=de(t,"expanded"),r=Be(null);let i=null;const a=()=>{n.value=!n.value,n.value||s()},o=y=>{y.preventDefault(),y.stopPropagation(),a()},s=()=>{r.value=null,i!==null&&(clearInterval(i),i=null)},l=y=>{r.value=y;const c=.01,_=()=>{if(e.mandelbrotRef)switch(y){case"north":e.mandelbrotRef.translate(0,c);break;case"south":e.mandelbrotRef.translate(0,-c);break;case"west":e.mandelbrotRef.translate(-c,0);break;case"east":e.mandelbrotRef.translate(c,0);break}};_(),i=window.setInterval(_,16)},x=y=>{r.value=`rotate-${y}`;const c=.025,_=()=>{e.mandelbrotRef&&(y==="left"?e.mandelbrotRef.rotate(c):e.mandelbrotRef.rotate(-c))};_(),i=window.setInterval(_,16)},g=y=>{r.value=`zoom-${y}`;const c=.97,_=()=>{e.mandelbrotRef&&(y==="in"?e.mandelbrotRef.zoom(c):e.mandelbrotRef.zoom(1/c))};_(),i=window.setInterval(_,16)},z=(y,c)=>{y.preventDefault(),c()},M=y=>{y.preventDefault(),s()};return(y,c)=>(Ee(),Ce("div",Mo,[C("button",{class:"nav-button compass-button",onClick:a,onTouchend:o,"aria-label":"Toggle navigation"},[...c[16]||(c[16]=[C("i",{class:"fa-solid fa-compass fa-2x nav-icon"},null,-1)])],32),Lt(ur,{name:"fade"},{default:fr(()=>[n.value?(Ee(),Ce("div",Ro,[C("button",{class:"nav-button direction-button north",onTouchstart:c[0]||(c[0]=_=>z(_,()=>l("north"))),onTouchend:M,onMousedown:c[1]||(c[1]=_=>l("north")),onMouseup:s,onMouseleave:s,"aria-label":"Move North"},[...c[17]||(c[17]=[C("i",{class:"fa-solid fa-arrow-up fa-3x nav-icon"},null,-1)])],32),C("button",{class:"nav-button direction-button south",onTouchstart:c[2]||(c[2]=_=>z(_,()=>l("south"))),onTouchend:M,onMousedown:c[3]||(c[3]=_=>l("south")),onMouseup:s,onMouseleave:s,"aria-label":"Move South"},[...c[18]||(c[18]=[C("i",{class:"fa-solid fa-arrow-down fa-3x nav-icon"},null,-1)])],32),C("button",{class:"nav-button direction-button west",onTouchstart:c[4]||(c[4]=_=>z(_,()=>l("west"))),onTouchend:M,onMousedown:c[5]||(c[5]=_=>l("west")),onMouseup:s,onMouseleave:s,"aria-label":"Move West"},[...c[19]||(c[19]=[C("i",{class:"fa-solid fa-arrow-left fa-3x nav-icon"},null,-1)])],32),C("button",{class:"nav-button direction-button east",onTouchstart:c[6]||(c[6]=_=>z(_,()=>l("east"))),onTouchend:M,onMousedown:c[7]||(c[7]=_=>l("east")),onMouseup:s,onMouseleave:s,"aria-label":"Move East"},[...c[20]||(c[20]=[C("i",{class:"fa-solid fa-arrow-right fa-3x nav-icon"},null,-1)])],32),C("button",{class:"nav-button corner-button rotate-left",onTouchstart:c[8]||(c[8]=_=>z(_,()=>x("left"))),onTouchend:M,onMousedown:c[9]||(c[9]=_=>x("left")),onMouseup:s,onMouseleave:s,"aria-label":"Rotate Left"},[...c[21]||(c[21]=[C("i",{class:"fa-solid fa-rotate-left fa-2x nav-icon"},null,-1)])],32),C("button",{class:"nav-button corner-button rotate-right",onTouchstart:c[10]||(c[10]=_=>z(_,()=>x("right"))),onTouchend:M,onMousedown:c[11]||(c[11]=_=>x("right")),onMouseup:s,onMouseleave:s,"aria-label":"Rotate Right"},[...c[22]||(c[22]=[C("i",{class:"fa-solid fa-rotate-right fa-2x nav-icon"},null,-1)])],32),C("button",{class:"nav-button corner-button zoom-out",onTouchstart:c[12]||(c[12]=_=>z(_,()=>g("out"))),onTouchend:M,onMousedown:c[13]||(c[13]=_=>g("out")),onMouseup:s,onMouseleave:s,"aria-label":"Zoom Out"},[...c[23]||(c[23]=[C("svg",{class:"nav-icon",viewBox:"0 0 24 24",width:"28",height:"28",fill:"none",stroke:"currentColor","stroke-width":"2.4","stroke-linecap":"round","stroke-linejoin":"round","aria-hidden":"true"},[C("circle",{cx:"11",cy:"11",r:"7"}),C("path",{d:"M21 21l-5-5M8 11h6"})],-1)])],32),C("button",{class:"nav-button corner-button zoom-in",onTouchstart:c[14]||(c[14]=_=>z(_,()=>g("in"))),onTouchend:M,onMousedown:c[15]||(c[15]=_=>g("in")),onMouseup:s,onMouseleave:s,"aria-label":"Zoom In"},[...c[24]||(c[24]=[C("svg",{class:"nav-icon",viewBox:"0 0 24 24",width:"28",height:"28",fill:"none",stroke:"currentColor","stroke-width":"2.4","stroke-linecap":"round","stroke-linejoin":"round","aria-hidden":"true"},[C("circle",{cx:"11",cy:"11",r:"7"}),C("path",{d:"M21 21l-5-5M8 11h6M11 8v6"})],-1)])],32)])):It("",!0)]),_:1})]))}});Bo=Cn(To,[["__scopeId","data-v-842a47c9"]]);Eo={style:{position:"relative",width:"100%",height:"100%"}};at=.01;Tn=.025;Co=300;Ao=30;ko=Wt({__name:"MandelbrotController",props:He({mu:{},epsilon:{},colorStops:{},antialiasLevel:{},aaAuto:{type:Boolean},palettePeriod:{},paletteOffset:{},heightPaletteShift:{},paletteMirror:{type:Boolean},activateAnimate:{type:Boolean},debugShading:{type:Boolean},dprMultiplier:{},maxIterationMultiplier:{},targetFps:{},gpuLoadMultiplier:{},zoomMinBrushStep:{},sentinelSeedStep:{},interpolationMode:{},pickerMode:{type:Boolean},uiHidden:{type:Boolean},tessellationLevel:{},displacementAmount:{},animation:{},animationSpeed:{},ambientOcclusionStrength:{},microBumpStrength:{},subsurfaceStrength:{},reliefDepth:{},localShadowStrength:{},lightAngle:{},varnishStrength:{},orbitTrapStrength:{},phaseColoringStrength:{},stripeFrequency:{},textureMapping:{},textureMappingMode:{}},{cx:{},cxModifiers:{},cy:{},cyModifiers:{},scale:{},scaleModifiers:{},angle:{},angleModifiers:{},mobileNavExpanded:{type:Boolean,default:!1},mobileNavExpandedModifiers:{}}),emits:He(["palettePick","pickerDone","engineReady","requestShowUi"],["update:cx","update:cy","update:scale","update:angle","update:mobileNavExpanded"]),setup(t,{expose:e,emit:n}){const r=de(t,"cx"),i=de(t,"cy"),a=de(t,"scale"),o=de(t,"angle"),s=de(t,"mobileNavExpanded"),l=t,x=n,g=Be(null),z={};e({getCanvas:k,getEngine:()=>g.value?.getEngine()??null,getNavigator:()=>g.value?.getNavigator()??null,resetReferenceTo:(u,b,S,T)=>{g.value?.resetReferenceTo?.(u,b,S,T)}});let M=!1,y=!1,c=0,_=0,L=0,N=0,d=0,Z=!1,Q=0,P=null,h=0,m=0,w=0;function k(){return g.value?.getCanvas()??null}function U(u){const b=k();if(!b)return{x:0,y:0,width:0,height:0};const S=b.getBoundingClientRect();return{x:u.clientX-S.left,y:u.clientY-S.top,width:S.width,height:S.height}}function Y(u){const b=u.target?.tagName?.toLowerCase();b==="input"||b==="textarea"||b==="select"||u.target?.isContentEditable||(z[u.code]=!0)}function D(u){z[u.code]=!1}function ee(u){if(l.pickerMode){u.preventDefault();return}u.preventDefault();const b=.95;u.deltaY<0?g.value?.zoom(b):g.value?.zoom(1/b)}function H(u,b){const S=k();if(!S)return;const T=S.getBoundingClientRect(),B=u-T.left,G=b-T.top,V=T.width,I=T.height,F=V/I,ne=(B-V/2)/V*2,ie=(G-I/2)/I*2;g.value?.translateDirect(ne*F,-ie)}function ae(u){if(l.pickerMode){u.preventDefault();return}if(u.preventDefault(),l.uiHidden){x("requestShowUi");return}H(u.clientX,u.clientY)}function W(u){if(l.pickerMode||u.touches.length!==0)return;const b=Date.now(),S=u.changedTouches[0];if(!S)return;const T=S.clientX,B=S.clientY;if(b-h<Co&&Math.hypot(T-m,B-w)<Ao){if(u.preventDefault(),h=0,l.uiHidden){x("requestShowUi");return}H(T,B)}else h=b,m=T,w=B}function j(u){if(l.pickerMode){u.preventDefault(),te(u);return}if(u.button===2)y=!0;else{M=!0;const b=U(u);c=b.x,_=b.y}}async function te(u){try{const b=g.value?.getEngine();if(!b)return;const S=k();if(!S)return;const T=S.getBoundingClientRect(),B=u.clientX-T.left,G=u.clientY-T.top,V=await b.readIterationDataAt(B,G,T.width,T.height);if(!V)return;x("palettePick",V,u.clientX,u.clientY)}finally{x("pickerDone")}}function K(u){if(l.pickerMode)return;const b=U(u);if(y){const I=k();if(!I)return;const F=I.getBoundingClientRect(),ne=F.width/2,ie=F.height/2,pt=b.x,le=b.y,we=Math.atan2(le-ie,pt-ne);g.value?.angle(we);return}if(!M)return;const S=b.width,T=b.height,B=S/T,G=(b.x-c)/S*2,V=(b.y-_)/T*2;g.value?.translateDirect(-G*B,V),c=b.x,_=b.y}function v(u){l.pickerMode||(u.button===2?y=!1:M=!1)}function R(u){if(l.pickerMode)return;const b=k();if(b){if(u.touches.length===1){M=!0;const S=u.touches[0],T=b.getBoundingClientRect();c=S.clientX-T.left,_=S.clientY-T.top}else if(u.touches.length===2){M=!1,Z=!0;const[S,T]=u.touches;L=Math.hypot(T.clientX-S.clientX,T.clientY-S.clientY),Q=L,N=Math.atan2(T.clientY-S.clientY,T.clientX-S.clientX);const B=g.value?.getParams();d=B?parseFloat(B[3]):0}}}function A(u){if(l.pickerMode)return;const b=k();if(b){if(M&&u.touches.length===1){const S=u.touches[0],T=b.getBoundingClientRect(),B=S.clientX-T.left,G=S.clientY-T.top,V=T.width,I=T.height,F=V/I,ne=(B-c)/V*2,ie=(G-_)/I*2;g.value?.translateDirect(-ne*F,ie),c=B,_=G}else if(Z&&u.touches.length===2){const[S,T]=u.touches,B=Math.hypot(T.clientX-S.clientX,T.clientY-S.clientY),G=Math.atan2(T.clientY-S.clientY,T.clientX-S.clientX),V=Q/B;Q=B,g.value?.zoom(V);const I=G-N;g.value?.angle(d+I)}}}function E(u){u.touches.length===0&&(M=!1,Z=!1)}function O(){if(!l.pickerMode){z.KeyW&&g.value?.translate(0,at),z.KeyS&&g.value?.translate(0,-at),z.KeyA&&g.value?.translate(-at,0),z.KeyD&&g.value?.translate(at,0),z.KeyQ&&g.value?.rotate(Tn),z.KeyE&&g.value?.rotate(-Tn);const u=.97;z.KeyR&&g.value?.zoom(u),z.KeyF&&g.value?.zoom(1/u)}P=window.setTimeout(O,16)}return Bn(async()=>{const u=k();u&&(window.addEventListener("keydown",Y),window.addEventListener("keyup",D),u.addEventListener("wheel",ee,{passive:!1}),u.addEventListener("mousedown",j),u.addEventListener("dblclick",ae),u.addEventListener("contextmenu",b=>b.preventDefault()),window.addEventListener("mousemove",K),window.addEventListener("mouseup",v),u.addEventListener("touchstart",R,{passive:!1}),u.addEventListener("touchmove",A,{passive:!1}),u.addEventListener("touchend",E,{passive:!1}),u.addEventListener("touchend",W,{passive:!1}),O())}),En(()=>{P!==null&&clearTimeout(P);const u=k();window.removeEventListener("keydown",Y),window.removeEventListener("keyup",D),window.removeEventListener("mousemove",K),window.removeEventListener("mouseup",v),u&&(u.removeEventListener("wheel",ee),u.removeEventListener("mousedown",j),u.removeEventListener("dblclick",ae),u.removeEventListener("contextmenu",b=>b.preventDefault()),u.removeEventListener("touchstart",R),u.removeEventListener("touchmove",A),u.removeEventListener("touchend",E),u.removeEventListener("touchend",W))}),(u,b)=>(Ee(),Ce("div",Eo,[Lt(wo,{ref_key:"mandelbrotRef",ref:g,scale:a.value,"onUpdate:scale":b[0]||(b[0]=S=>a.value=S),angle:o.value,"onUpdate:angle":b[1]||(b[1]=S=>o.value=S),cx:r.value,"onUpdate:cx":b[2]||(b[2]=S=>r.value=S),cy:i.value,"onUpdate:cy":b[3]||(b[3]=S=>i.value=S),mu:l.mu,epsilon:l.epsilon,antialiasLevel:l.antialiasLevel,aaAuto:l.aaAuto,palettePeriod:l.palettePeriod,heightPaletteShift:l.heightPaletteShift,paletteMirror:l.paletteMirror,colorStops:l.colorStops,activateAnimate:l.activateAnimate,debugShading:l.debugShading,paletteOffset:l.paletteOffset,dprMultiplier:l.dprMultiplier,maxIterationMultiplier:l.maxIterationMultiplier,targetFps:l.targetFps,gpuLoadMultiplier:l.gpuLoadMultiplier,zoomMinBrushStep:l.zoomMinBrushStep,sentinelSeedStep:l.sentinelSeedStep,interpolationMode:l.interpolationMode,tessellationLevel:l.tessellationLevel,displacementAmount:l.displacementAmount,animation:l.animation,animationSpeed:l.animationSpeed,ambientOcclusionStrength:l.ambientOcclusionStrength,microBumpStrength:l.microBumpStrength,subsurfaceStrength:l.subsurfaceStrength,reliefDepth:l.reliefDepth,localShadowStrength:l.localShadowStrength,lightAngle:l.lightAngle,varnishStrength:l.varnishStrength,orbitTrapStrength:l.orbitTrapStrength,phaseColoringStrength:l.phaseColoringStrength,stripeFrequency:l.stripeFrequency,textureMapping:l.textureMapping,textureMappingMode:l.textureMappingMode,onReady:b[4]||(b[4]=S=>x("engineReady",S))},null,8,["scale","angle","cx","cy","mu","epsilon","antialiasLevel","aaAuto","palettePeriod","heightPaletteShift","paletteMirror","colorStops","activateAnimate","debugShading","paletteOffset","dprMultiplier","maxIterationMultiplier","targetFps","gpuLoadMultiplier","zoomMinBrushStep","sentinelSeedStep","interpolationMode","tessellationLevel","displacementAmount","animation","animationSpeed","ambientOcclusionStrength","microBumpStrength","subsurfaceStrength","reliefDepth","localShadowStrength","lightAngle","varnishStrength","orbitTrapStrength","phaseColoringStrength","stripeFrequency","textureMapping","textureMappingMode"]),pr(Lt(Bo,{"mandelbrot-ref":g.value,expanded:s.value,"onUpdate:expanded":b[5]||(b[5]=S=>s.value=S)},null,8,["mandelbrot-ref","expanded"]),[[hr,!l.uiHidden]])]))}});Po=Cn(ko,[["__scopeId","data-v-300050b7"]])})();export{Po as M,wo as _,__tla};