// Mandelbrot progressive-iteration shader.
//
// Layer layout (r32float texture_2d_array, 8 layers):
//   0 : sentinel / iteration count (integer part).
//       Negative  => sentinel (brush/resolve system).  -1 = compute request.
//       0         => inside the set (confirmed), or budget fully exhausted at globalMaxIter.
//       > 0       => escaped (|z|² >= 4) or budget-exhausted mid-progress (|z|² < 4).
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
//   iter > 0  AND  |z|² >= 4      : escaped → color with iter + mu (mu recomputed)
//   iter > 0  AND  |z|² < 4       : budget exhausted mid-progress → needs continuation

struct MandelbrotStep {
  zx: f32,
  zy: f32,
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
const DEEP_EXP: i32 = -100;
const LN2: f32 = 0.6931471805599453;

struct BlaStep {
  // floatexp form: a = (ax,ay)·2^ab_exp, b = (bx,by)·2^ab_exp,
  // alpha = radius_alpha·2^alpha_exp, beta = radius_beta (O(1)).
  ax: f32,
  ay: f32,
  bx: f32,
  by: f32,
  ab_exp: i32,
  radius_alpha: f32,
  alpha_exp: i32,
  radius_beta: f32,
  // Padé [1/1] denominator coefficient D = (dx,dy)·2^d_exp. Zero in affine mode
  // (the block is then purely linear). Carried for the rational application; it is
  // out of the radius gate (it is √ε-small in the pullback). See add-pade-approximation.
  dx: f32,
  dy: f32,
  d_exp: i32,
  // log2 of the smallest |2Z_k| the block spans — near-critical guard (G).
  log2_min_a: f32,
};

struct BlaLevel {
  offset: u32,
  count: u32,
  skip: u32,
  // Largest radius_alpha among this level's entries; effective radii are
  // always <= radius_alpha, so |dz| above this bound rejects the whole level.
  maxRadius: f32,
};

// ── bivariate jet mode (add-jet-approximation) ─────────────────────
// One truncated-Taylor coefficient (x, y)·2^e. Exponents are per-coefficient
// (design D7: within-block spreads reach 75+ bits, no sharing is safe) and can
// exceed the f32 range even at shallow zooms, so jet evaluation always runs in
// floatexp arithmetic.
struct JetCoeff { x: f32, y: f32, e: i32 };

// Jet radius record (16 B, vec4-packed: x=r1, y=r2, z=r3, w=pad — one coalesced
// load per probe), in its own buffer ("le buffer de rayons"): the runtime
// descent (per-level maxR3 gate + order selection) reads radii ALONE — the
// 108 B coefficient record is touched only once a block is applied. -inf ⇒
// that order is never applied.
struct JetRadii {
  v: vec4<f32>,
};

// Register-file budget for the hoisted per-level maxR3 gates (actual tables top
// out around 17 levels; the fill and the descent both clamp to this).
const JET_MAX_LEVELS = 32;

// Largest |∂Φ/∂z exponent| folded into the derivative MANTISSA (ldexp) instead
// of derS: derS and its exp() caches stay valid, eliding der_refresh_cache's
// two exp() per application. Bounded so one application cannot push derM past
// f32 (DER_RENORM window half-width ≈ 2^26.6, checked every loop turn).
const JET_DER_EXP_FOLD: i32 = 16;

// Jet coefficient record (108 B), degree-major: an order-k application reads
// only coeffs[0 .. k(k+3)/2) — coeffs[0]/coeffs[1] are the affine A/B. Same flat
// block index as the radius buffer.
struct JetStep {
  coeffs: array<JetCoeff, 9>,
};

// Level directory: maxR3 (log2) is the loosest top-order radius of the level —
// the whole-level fast reject, sibling of BlaLevel.maxRadius.
struct JetLevel {
  offset: u32,
  count: u32,
  skip: u32,
  maxR3: f32,
};

@group(0) @binding(0) var<uniform> mandelbrot: Mandelbrot;
@group(0) @binding(1) var<storage, read> mandelbrotOrbitPointSuite: array<MandelbrotStep>;
@group(0) @binding(2) var<storage, read> mandelbrotBlaSuite: array<BlaStep>;
@group(0) @binding(3) var<storage, read> mandelbrotBlaLevels: array<BlaLevel>;
@group(0) @binding(4) var rawIn: texture_2d_array<f32>;
@group(0) @binding(5) var<storage, read> mandelbrotJetSuite: array<JetStep>;
@group(0) @binding(6) var<storage, read> mandelbrotJetLevels: array<JetLevel>;
@group(0) @binding(7) var<storage, read> mandelbrotJetRadii: array<JetRadii>;

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

// Complex reciprocal 1/z = conj(z)/|z|² (used by the Padé block application).
fn cinv(z: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(z.x, -z.y) / dot(z, z);
}

// Padé pole guard: when |1 + D·dz|² < PADE_POLE2 the rational map is near its pole,
// so the block is rejected (descend a level / fall back to an exact step). Within
// the √ε validity radius |D·dz| ≤ √ε ⇒ |1+D·dz| ≈ 1, so this fires very rarely.
const PADE_POLE2: f32 = 1e-4;

// ── extended-exponent complex (floatexp) ───────────────────────────
// value = m · 2^e, with one shared integer exponent for the whole complex.
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
  let r = frexp(a);                    // a = r.fract · 2^r.exp, r.fract ∈ [0.5,1)
  return fe(ldexp(v.m, vec2<i32>(-r.exp, -r.exp)), v.e + r.exp);
}

fn fe_from_vec(v: vec2<f32>, e: i32) -> fe {
  return fe_renorm(fe(v, e));
}

// v.m · 2^v.e back to plain f32; tiny values flush to 0 (intended: a sub-f32 dz
// contributes nothing to an O(1) z = z_n + dz).
fn fe_to_vec(v: fe) -> vec2<f32> {
  return ldexp(v.m, vec2<i32>(v.e, v.e));
}

// complex multiply of two fe values
fn fe_cmul(a: fe, b: fe) -> fe {
  return fe_renorm(fe(cmul(a.m, b.m), a.e + b.e));
}

// complex multiply of an O(1) f32 complex by an fe (e.g. 2·z_n · dz)
fn fe_cmul_f32(zf: vec2<f32>, b: fe) -> fe {
  return fe_renorm(fe(cmul(zf, b.m), b.e));
}

// complex reciprocal 1/z in fe form (Padé denominator): 1/z = conj(z)/|z|².
fn fe_cinv(z: fe) -> fe {
  let d = dot(z.m, z.m);
  return fe_renorm(fe(vec2<f32>(z.m.x, -z.m.y) / d, -z.e));
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

// |v|² as a plain f32, flushing to 0 on underflow (used only to compare against
// an O(1) |z|² for the rebase test).
fn fe_mag2_f32(v: fe) -> f32 {
  return ldexp(dot(v.m, v.m), 2 * v.e);
}

const LOG_DER_ZERO: f32 = -80.0;

fn angle_wrap(a: f32) -> f32 {
  return atan2(sin(a), cos(a));
}

// ── derivative state: der = derM · exp(derS) ───────────────────────
// Cartesian mantissa + log scale.  The derivative recurrences
// (der' = 2·z·der + 1, and der' = der·a + b for BLA blocks) run as plain
// multiply/adds on the mantissa; a log/exp pair is paid only when the
// mantissa leaves [1e-16, 1e16] (every ~25 iterations), instead of the
// ~10 transcendentals per iteration of the previous log-polar form.
// The storage format in layers 4/5 is unchanged: (angle, log magnitude),
// converted by der_to_polar on store and inverted on load.
//
// Cached alongside the state (recomputed only when derS changes):
//   derInvScale  = exp(-derS)   — the "+1" term expressed in mantissa space
//   epsThreshold = exp(logEpsilon - 2·derS)
//                  so that dot(derM, derM) < epsThreshold ⇔ |der|² < epsilon

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
// is recomposed from the shared exponent (log(mantissa) + scaleExp·ln2). Keeps
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
  // (G) near-critical guard: a Möbius block may only span steps with
  // |2Z_k| ≥ mu = √(|c|/ε); in log2 that is min_k log2|2Z_k| ≥ log2(mu).
  let log2_mu = 0.5 * (log2(max(dcMag, 1e-30)) - log2(max(mandelbrot.blaEpsilon, 1e-30)));
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
          if (mandelbrot.approximationMode >= 1.5) {
            // ── Padé [1/1]: z ← (A·z + B·c)/(1 + D·z) ──
            let d = ldexp(vec2<f32>(bla.dx, bla.dy), vec2<i32>(bla.d_exp, bla.d_exp));
            let m = vec2<f32>(1.0, 0.0) + cmul(d, *dz);   // 1 + D·dz
            // (H2) c-truncation bound (|B|·|c| < ε) + (G) near-critical guard
            // (block's min |2Z_k| ≥ mu) + pole guard. Any failing ⇒ descend to a
            // shorter block (exact at skip 0).
            if (length(b) * dcMag < mandelbrot.blaEpsilon && bla.log2_min_a >= log2_mu && dot(m, m) >= PADE_POLE2) {
              let invM = cinv(m);
              let num = cmul(a, *dz) + cmul(b, dc);
              let candidate = cmul(num, invM);
              let candidateZ = getOrbit(*ref_i + skip) + candidate;
              if (!(skip > 1 && dot(candidateZ, candidateZ) > bailout)) {
                *dz = candidate;
                *zOut = candidateZ;
                // D4 derivative: der' = (A/M²)·der + B/M, reusing invM = 1/M.
                let derNum = cmul(cmul(a, invM), *derM) + b * derInvScale;
                *derM = cmul(invM, derNum);
                *ref_i += skip;
                return skip;
              }
            }
            // pole too close or escape guard: fall through and descend a level.
          } else {
            // ── affine BLA: z ← A·z + B·c ──
            let candidate = cmul(a, *dz) + cmul(b, dc);
            // Do not let a multi-iteration BLA block jump over the first escape.
            // The color pass needs z/DE at the escape iteration, not after a block.
            let candidateZ = getOrbit(*ref_i + skip) + candidate;
            if (!(skip > 1 && dot(candidateZ, candidateZ) > bailout)) {
              *dz = candidate;
              *zOut = candidateZ;
              // der' = der·a + b, in mantissa space.
              *derM = cmul(*derM, a) + b * derInvScale;
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
// Per-invocation loop-turn counter — one per iteration-loop turn (a block-apply
// or an exact step). The per-dispatch batch budgets TURNS (work), not covered
// iterations, so block-skipping isn't throttled by an iteration cap. Reset at the
// start of each compute function.
var<private> g_workSteps: u32 = 0u;

fn mandelbrot_compute(x0: f32, y0: f32, prev_iter: f32, prev_zx: f32, prev_zy: f32, prev_dzx: f32, prev_dzy: f32, prev_ref_i: f32, prev_avg_direction: f32) -> FragOut {
  let dc = vec2<f32>(x0, y0);
  let max_iteration = mandelbrot.maxIteration;
  let muLimit = mandelbrot.mu;
  let logEpsilon = log(max(mandelbrot.epsilon, 1e-30));
  let globalMaxIterI = i32(mandelbrot.globalMaxIter);

  // Resume state: if prev_iter > 0 we are continuing a previous pass.

  var i: f32 = 0.0;
  g_workSteps = 0u;
  var dz = vec2<f32>(prev_zx, prev_zy);
  var ref_i = decode_ref_i(prev_ref_i);
  // Carried reference-orbit value. Invariant: refZ == getOrbit(ref_i) at the end
  // of every loop branch, so a single-step iteration reads the orbit once (it used
  // to read getOrbit(ref_i) and getOrbit(ref_i+1) — the latter is the next step's
  // refZ). Resyncs are always a fresh getOrbit read (never z − dz), so the orbit
  // values fed to the iteration are identical to reloading every step.
  var refZ = getOrbit(ref_i);
  var z = refZ + dz;

  // Derivative state der = derM · exp(derS), converted from the stored
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

  // approximationMode: 1 = affine BLA, 2 = Padé, 3 = jet. The level-count
  // uniform carries the ACTIVE table's level count (BLA or jet).
  let isJet = mandelbrot.approximationMode >= 2.5;
  let useBla = mandelbrot.approximationMode >= 0.5
            && mandelbrot.orbitComplete >= 0.5
            && mandelbrot.blaLevelCount >= 1.0;

  if (useBla) {
    let dcMag = sqrt(max(0.0, dot(dc, dc)));
    var skip0Log = 0;
    var maxBlaR2 = 0.0;
    var jetMaxR3 = -3.0e38;
    // Hoisted per-level maxR3 gates: loaded ONCE per pixel, so the descent in
    // try_apply_jet never re-reads the level directory on failing probes.
    var jetLvlR3: array<f32, JET_MAX_LEVELS>;
    if (isJet) {
      skip0Log = i32(countTrailingZeros(max(mandelbrotJetLevels[0].skip, 1u)));
      // Global fast-reject bound (sibling of maxBlaR2): the loosest top-order
      // radius across ALL levels. Without it, a dead/stale table would pay the
      // level walk on every iteration — slower than exact stepping.
      for (var l = 0; l < min(i32(mandelbrot.blaLevelCount), JET_MAX_LEVELS); l++) {
        let r = mandelbrotJetLevels[l].maxR3;
        jetLvlR3[l] = r;
        jetMaxR3 = max(jetMaxR3, r);
      }
    } else {
      skip0Log = i32(countTrailingZeros(max(mandelbrotBlaLevels[0].skip, 1u)));
      // Level 0 carries the loosest per-level radius bound (merged radii only
      // shrink), so one register compare against it tells whether any BLA entry
      // could possibly accept the current |dz|. (The jet path has per-level
      // log2 gates inside try_apply_jet instead.)
      let maxBlaRadius = mandelbrotBlaLevels[0].maxRadius;
      maxBlaR2 = maxBlaRadius * maxBlaRadius;
    }
    let dcFe = fe_from_vec(dc, 0);
    let dcFe2 = fe_cmul(dcFe, dcFe);
    let dcFe3 = fe_cmul(dcFe2, dcFe);
    // (#4) f32 dc powers for the jet fast path. The gate needs |dc| > 2^-42 so
    // dc²/dc³ stay clear of the f32 subnormal band (else the pure-c Horner
    // terms would silently flush — the fe path keeps them).
    let dcF2 = cmul(dc, dc);
    let dcF3 = cmul(dcF2, dc);
    let jetF32Ok = isJet && dcMag > 2.3e-13;
    var usedBla = false;
    var blaZ = vec2<f32>(0.0);
    while (g_workSteps < u32(max_iteration) && ref_i < globalMaxIterI) {
      g_workSteps += 1u;
      var skipped = 0;
      if (isJet) {
        // Global gate first (one log2 vs the table-wide bound), then convert dz
        // to floatexp for the shared evaluator (coefficient exponents exceed
        // f32 even shallow). Use length(), not dot(): |dz|² UNDERFLOWS f32 for
        // |dz| < ~1e-19 (routine at mid-deep shallow zooms) and a clamped
        // log2 would over-estimate |dz| and reject everything. When even
        // length() underflows, pass the gate — the fe-domain test inside
        // try_apply_jet is exact.
        let dzMag = length(dz);
        if (dzMag < 1.2e-38 || log2(dzMag) < jetMaxR3) {
          var dzFe = fe_from_vec(dz, 0);
          skipped = try_apply_jet(&ref_i, &dzFe, &derM, &derS, &derInvScale, &epsThreshold, logEpsilon, &blaZ, dcFe, dcFe2, dcFe3, muLimit, skip0Log, globalMaxIterI, &jetLvlR3, dc, dcF2, dcF3, jetF32Ok);
          if (skipped > 0) {
            dz = fe_to_vec(dzFe);
          }
        }
      } else if (dot(dz, dz) <= maxBlaR2) {
        skipped = try_apply_bla(&ref_i, &dz, &derM, &blaZ, derInvScale, dc, dcMag, muLimit, skip0Log, globalMaxIterI);
      }
      if (skipped > 0) {
        usedBla = true;
        z = blaZ;
        i += f32(skipped);
        refZ = getOrbit(ref_i); // ref_i jumped past the block — resync carried orbit
        if (trackOrbitMetrics) {
          previousStripeEma = stripeEma;
          previousAvgDirSum = avgDirSum;
          previousAvgCount = avgCount;
          stripeEma = update_orbit_ema(stripeEma, stripe_metric_sample(z), f32(skipped));
          avgDirSum += orbit_direction_sample(z) * f32(skipped);
          avgCount += f32(skipped);
        }
      } else {
        let zPrev = refZ + dz;
        dz = 2.0 * cmul(dz, refZ) + cmul(dz, dz) + dc;
        ref_i += 1;
        refZ = getOrbit(ref_i);
        z = refZ + dz;
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
        refZ = getOrbit(0);
      }
    }
  } else {
    while (g_workSteps < u32(max_iteration) && ref_i < globalMaxIterI) {
      g_workSteps += 1u;
      let zPrev = refZ + dz;
      dz = 2.0 * cmul(dz, refZ) + cmul(dz, dz) + dc;
      ref_i += 1;
      refZ = getOrbit(ref_i);
      z = refZ + dz;
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
        refZ = getOrbit(0);
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
  // for resumption.  |z|² < 4 distinguishes this from escaped pixels.
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
// BLA in the deep (floatexp) path: a·dz + b·dc with a, b in fe, dc/dz in fe, and
// the radius test |dz| ≤ alpha − beta·|dc| done in log space (everything is far
// below f32 here). The derivative update folds the block's shared exponent into
// the log scale derS. log_dcMag = log|dc| is precomputed by the caller.
fn try_apply_bla_deep(ref_i: ptr<function, i32>, dz: ptr<function, fe>, derM: ptr<function, vec2<f32>>, derS: ptr<function, f32>, derInvScale: ptr<function, f32>, epsThreshold: ptr<function, f32>, logEpsilon: f32, zOut: ptr<function, vec2<f32>>, dc: fe, log_dcMag: f32, bailout: f32, skip0Log: i32, maxIterI: i32) -> i32 {
  if (*ref_i <= 0) {
    return 0;
  }
  let log_dz = log(max(length((*dz).m), 1e-30)) + f32((*dz).e) * LN2;
  // (G) near-critical guard threshold in log2: min_k log2|2Z_k| ≥ log2(mu),
  // mu = √(|c|/ε). log_dcMag is natural-log |c|, so convert via /LN2.
  let log2_mu = 0.5 * (log_dcMag - log(max(mandelbrot.blaEpsilon, 1e-30))) / LN2;
  let shiftedRef = *ref_i - 1;
  var level = min(i32(mandelbrot.blaLevelCount) - 1, i32(countTrailingZeros(u32(shiftedRef))) - skip0Log);
  while (level >= 0) {
    let levelInfo = mandelbrotBlaLevels[level];
    let skip = i32(levelInfo.skip);
    if (*ref_i + skip <= maxIterI) {
      let slot = shiftedRef >> u32(skip0Log + level);
      if (u32(slot) < levelInfo.count) {
        let bla = mandelbrotBlaSuite[i32(levelInfo.offset) + slot];
        // radius = alpha − beta·|dc|, validity |dz| ≤ radius, all in log space.
        let log_alpha = log(bla.radius_alpha) + f32(bla.alpha_exp) * LN2;
        let log_betaDc = log(max(bla.radius_beta, 1e-30)) + log_dcMag;
        if (log_betaDc < log_alpha) {            // radius > 0
          let ratio = exp(log_betaDc - log_alpha); // ∈ [0,1)
          let log_radius = log_alpha + log(max(1.0 - ratio, 1e-30));
          if (log_dz <= log_radius) {
            // num = A·dz + B·dc  (a, b share exponent ab_exp)
            let a = fe(vec2<f32>(bla.ax, bla.ay), bla.ab_exp);
            let b = fe(vec2<f32>(bla.bx, bla.by), bla.ab_exp);
            let num = fe_add(fe_cmul(a, *dz), fe_cmul(b, dc));
            if (mandelbrot.approximationMode >= 1.5) {
              // ── Padé [1/1] in floatexp: dz ← num/(1 + D·dz) ──
              let d = fe(vec2<f32>(bla.dx, bla.dy), bla.d_exp);
              let m = fe_add(fe(vec2<f32>(1.0, 0.0), 0), fe_cmul(d, *dz));   // 1 + D·dz
              // (H2) c-truncation bound in log space (|B|·|c| < ε) + (G)
              // near-critical guard (min |2Z_k| ≥ mu) + pole guard.
              let log_bDc = log(max(length(b.m), 1e-30)) + f32(b.e) * LN2 + log_dcMag;
              if (log_bDc < log(max(mandelbrot.blaEpsilon, 1e-30)) && bla.log2_min_a >= log2_mu && fe_mag2_f32(m) >= PADE_POLE2) {
                let invM = fe_cinv(m);
                let candidate = fe_cmul(num, invM);
                let candidateZ = getOrbit(*ref_i + skip) + fe_to_vec(candidate);
                if (!(skip > 1 && dot(candidateZ, candidateZ) > bailout)) {
                  *dz = candidate;
                  *zOut = candidateZ;
                  // D4 derivative der' = (A/M²)·der + B/M, in derM/derS space.
                  let aOverM2 = fe_cmul(a, fe_cmul(invM, invM));   // A/M²
                  let bOverM = fe_cmul(b, invM);                   // B/M
                  *derM = cmul(*derM, aOverM2.m);
                  *derS = *derS + f32(aOverM2.e) * LN2;
                  *derM = *derM + bOverM.m * exp(clamp(f32(bOverM.e) * LN2 - *derS, -80.0, 80.0));
                  der_refresh_cache(derM, derS, derInvScale, epsThreshold, logEpsilon);
                  *ref_i += skip;
                  return skip;
                }
              }
            } else {
              // ── affine: dz ← A·dz + B·dc ──
              let candidateZ = getOrbit(*ref_i + skip) + fe_to_vec(num);
              if (!(skip > 1 && dot(candidateZ, candidateZ) > bailout)) {
                *dz = num;
                *zOut = candidateZ;
                // der' = der·a + b·1, folding the shared exponent into derS.
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
    }
    level -= 1;
  }
  return 0;
}

// ── jet block application (add-jet-approximation) ──────────────────
// Shared by the shallow and deep loops: evaluation runs in floatexp regardless
// of path (per-coefficient exponents can exceed f32 even at shallow zooms), the
// shallow wrapper converts dz at the edges. The runtime validity test is the
// single comparison log2|dz| < r_k — no min_a / H2 / beta on this path (rule (V)
// subsumes them at build time).

fn jet_coeff_fe(c: JetCoeff) -> fe {
  return fe_renorm(fe(vec2<f32>(c.x, c.y), c.e));
}

fn fe_scale(a: fe, s: f32) -> fe {
  return fe_renorm(fe(a.m * s, a.e));
}

// Order-k evaluation of the stored jet, Horner in dz with per-pixel-hoisted dc
// powers (dc2/dc3 are loop invariants — computed once per pixel, not per
// application). Rows P_i(dc) = Σ_j a_ij dc^j are built once and reused by the
// value AND both partials, roughly halving the fe-op count at order 3:
//   Φ      = P0 + dz·(P1 + dz·(P2 + dz·P3))
//   ∂Φ/∂z  = P1 + dz·(2·P2 + dz·3·P3)
//   ∂Φ/∂c  = Q0 + dz·(Q1 + dz·Q2),  Q_i = ∂P_i/∂c
// Reads only the degree ≤ k coefficient prefix (design D1).
fn jet_apply(entry: i32, k: i32, dz: fe, dc: fe, dc2: fe, dc3: fe, pdz: ptr<function, fe>, pdc: ptr<function, fe>) -> fe {
  let a10 = jet_coeff_fe(mandelbrotJetSuite[entry].coeffs[0]);
  let a01 = jet_coeff_fe(mandelbrotJetSuite[entry].coeffs[1]);
  var p0 = fe_cmul(a01, dc);
  var p1 = a10;
  var q0 = a01;
  if (k < 2) {
    *pdz = p1;
    *pdc = q0;
    return fe_add(p0, fe_cmul(p1, dz));
  }
  let a20 = jet_coeff_fe(mandelbrotJetSuite[entry].coeffs[2]);
  let a11 = jet_coeff_fe(mandelbrotJetSuite[entry].coeffs[3]);
  let a02 = jet_coeff_fe(mandelbrotJetSuite[entry].coeffs[4]);
  let a11dc = fe_cmul(a11, dc);
  p0 = fe_add(p0, fe_cmul(a02, dc2));
  p1 = fe_add(p1, a11dc);
  var p2 = a20;
  q0 = fe_add(q0, fe_scale(fe_cmul(a02, dc), 2.0));
  var q1 = a11;
  if (k < 3) {
    *pdz = fe_add(p1, fe_scale(fe_cmul(p2, dz), 2.0));
    *pdc = fe_add(q0, fe_cmul(q1, dz));
    return fe_add(p0, fe_cmul(fe_add(p1, fe_cmul(p2, dz)), dz));
  }
  let a30 = jet_coeff_fe(mandelbrotJetSuite[entry].coeffs[5]);
  let a21 = jet_coeff_fe(mandelbrotJetSuite[entry].coeffs[6]);
  let a12 = jet_coeff_fe(mandelbrotJetSuite[entry].coeffs[7]);
  let a03 = jet_coeff_fe(mandelbrotJetSuite[entry].coeffs[8]);
  let a12dc2 = fe_cmul(a12, dc2);
  p0 = fe_add(p0, fe_cmul(a03, dc3));
  p1 = fe_add(p1, a12dc2);
  p2 = fe_add(p2, fe_cmul(a21, dc));
  let p3 = a30;
  q0 = fe_add(q0, fe_scale(fe_cmul(a03, dc2), 3.0));
  q1 = fe_add(q1, fe_scale(fe_cmul(a12, dc), 2.0));
  let q2 = a21;
  *pdz = fe_add(p1, fe_cmul(fe_add(fe_scale(p2, 2.0), fe_scale(fe_cmul(p3, dz), 3.0)), dz));
  *pdc = fe_add(q0, fe_cmul(fe_add(q1, fe_cmul(q2, dz)), dz));
  return fe_add(p0, fe_cmul(fe_add(p1, fe_cmul(fe_add(p2, fe_cmul(p3, dz)), dz)), dz));
}

// ldexp-exact f32 reconstruction of a coefficient whose radii.w flag certifies
// |log2| ≤ 96 (build-side jet_f32_safe).
fn jet_coeff_f32(c: JetCoeff) -> vec2<f32> {
  return ldexp(vec2<f32>(c.x, c.y), vec2<i32>(c.e));
}

// Plain-f32 twin of jet_apply — the shallow fast path: same Horner rows, no
// per-op fe renorm (frexp/ldexp), no fe_add exponent alignment. Entered only
// when the block's radii.w flag certifies every shipped coefficient fits f32
// AND the caller certifies dz/dc powers are f32-scaled; |dz|,|dc| < 1 on
// applied blocks then caps every Horner intermediate at ~2^99 « f32 max.
fn jet_apply_f32(entry: i32, k: i32, dz: vec2<f32>, dc: vec2<f32>, dc2: vec2<f32>, dc3: vec2<f32>, pdz: ptr<function, vec2<f32>>, pdc: ptr<function, vec2<f32>>) -> vec2<f32> {
  let a10 = jet_coeff_f32(mandelbrotJetSuite[entry].coeffs[0]);
  let a01 = jet_coeff_f32(mandelbrotJetSuite[entry].coeffs[1]);
  var p0 = cmul(a01, dc);
  var p1 = a10;
  var q0 = a01;
  if (k < 2) {
    *pdz = p1;
    *pdc = q0;
    return p0 + cmul(p1, dz);
  }
  let a20 = jet_coeff_f32(mandelbrotJetSuite[entry].coeffs[2]);
  let a11 = jet_coeff_f32(mandelbrotJetSuite[entry].coeffs[3]);
  let a02 = jet_coeff_f32(mandelbrotJetSuite[entry].coeffs[4]);
  let a11dc = cmul(a11, dc);
  p0 = p0 + cmul(a02, dc2);
  p1 = p1 + a11dc;
  var p2 = a20;
  q0 = q0 + 2.0 * cmul(a02, dc);
  var q1 = a11;
  if (k < 3) {
    *pdz = p1 + 2.0 * cmul(p2, dz);
    *pdc = q0 + cmul(q1, dz);
    return p0 + cmul(p1 + cmul(p2, dz), dz);
  }
  let a30 = jet_coeff_f32(mandelbrotJetSuite[entry].coeffs[5]);
  let a21 = jet_coeff_f32(mandelbrotJetSuite[entry].coeffs[6]);
  let a12 = jet_coeff_f32(mandelbrotJetSuite[entry].coeffs[7]);
  let a03 = jet_coeff_f32(mandelbrotJetSuite[entry].coeffs[8]);
  let a12dc2 = cmul(a12, dc2);
  p0 = p0 + cmul(a03, dc3);
  p1 = p1 + a12dc2;
  p2 = p2 + cmul(a21, dc);
  let p3 = a30;
  q0 = q0 + 3.0 * cmul(a03, dc2);
  q1 = q1 + 2.0 * cmul(a12, dc);
  let q2 = a21;
  *pdz = p1 + cmul(2.0 * p2 + 3.0 * cmul(p3, dz), dz);
  *pdc = q0 + cmul(q1 + cmul(q2, dz), dz);
  return p0 + cmul(p1 + cmul(p2 + cmul(p3, dz), dz), dz);
}

// Jet skip attempt: greedy on skip via the r3 gates (hoisted per-level
// registers then the per-block radius buffer), then the SMALLEST valid order
// (design D2) — a far-inside entry pays an affine-sized evaluation. Works on
// both paths (dz always fe here). `lvlR3` is the caller-hoisted copy of the
// level directory's maxR3 gates: a failing level probe costs ZERO memory reads
// (the skip is recomputed from the power-of-two scaffold), and the directory
// itself is only read once a level gate passes.
// `dcF/dcF2/dcF3` + `f32Ok` drive the plain-f32 fast path (#4): the caller sets
// f32Ok only when its dz/dc live at f32 scale (shallow loop, |dc| > 2^-42 so
// the dc powers clear the subnormal band); the deep loop passes zeros + false.
fn try_apply_jet(ref_i: ptr<function, i32>, dz: ptr<function, fe>, derM: ptr<function, vec2<f32>>, derS: ptr<function, f32>, derInvScale: ptr<function, f32>, epsThreshold: ptr<function, f32>, logEpsilon: f32, zOut: ptr<function, vec2<f32>>, dc: fe, dc2: fe, dc3: fe, bailout: f32, skip0Log: i32, maxIterI: i32, lvlR3: ptr<function, array<f32, JET_MAX_LEVELS>>, dcF: vec2<f32>, dcF2: vec2<f32>, dcF3: vec2<f32>, f32Ok: bool) -> i32 {
  if (*ref_i <= 0) {
    return 0;
  }
  let log2_dz = log2(max(length((*dz).m), 1e-30)) + f32((*dz).e);
  let shiftedRef = *ref_i - 1;
  var level = min(min(i32(mandelbrot.blaLevelCount), JET_MAX_LEVELS) - 1, i32(countTrailingZeros(u32(shiftedRef))) - skip0Log);
  while (level >= 0) {
    // Levels are the power-of-two scaffold: skip = levels[0].skip << level.
    let skip = i32(1u << u32(skip0Log + level));
    if (log2_dz < (*lvlR3)[level] && *ref_i + skip <= maxIterI) {
      let levelInfo = mandelbrotJetLevels[level];
      let slot = shiftedRef >> u32(skip0Log + level);
      if (u32(slot) < levelInfo.count) {
        let entry = i32(levelInfo.offset) + slot;
        // One coalesced 16 B read (vec4: x=r1, y=r2, z=r3) — the 108 B
        // coefficient record stays untouched until a block actually applies.
        let radii = mandelbrotJetRadii[entry].v;
        // r3 gates the block before the order descent.
        if (log2_dz < radii.z) {
          var k = 3;
          if (log2_dz < radii.x) {
            k = 1;
          } else if (log2_dz < radii.y) {
            k = 2;
          }
          var pdz: fe;
          var pdc: fe;
          var phi: fe;
          // (#4) Plain-f32 fast path: radii.w is the build-side "all shipped
          // coefficient exponents fit f32" flag — free, it rides the same vec4
          // load as the radii. log2_dz > -100 keeps the dz-side products clear
          // of the f32 subnormal band; everything else pays the fe evaluator.
          if (f32Ok && radii.w > 0.5 && log2_dz > -100.0) {
            var pdzF = vec2<f32>(0.0);
            var pdcF = vec2<f32>(0.0);
            let phiF = jet_apply_f32(entry, k, fe_to_vec(*dz), dcF, dcF2, dcF3, &pdzF, &pdcF);
            phi = fe_from_vec(phiF, 0);
            pdz = fe_from_vec(pdzF, 0);
            pdc = fe_from_vec(pdcF, 0);
          } else {
            phi = jet_apply(entry, k, *dz, dc, dc2, dc3, &pdz, &pdc);
          }
          let candidateZ = getOrbit(*ref_i + skip) + fe_to_vec(phi);
          // Do not jump over the first escape (same rule as the BLA paths).
          if (!(skip > 1 && dot(candidateZ, candidateZ) > bailout)) {
            *dz = phi;
            *zOut = candidateZ;
            // der' = ∂Φ/∂z·der + ∂Φ/∂c. (#3) Small ∂Φ/∂z exponents — the norm
            // on the slow dynamics that dominate wall-clock — fold into the
            // MANTISSA (ldexp, exact) instead of derS: derS and its exp()
            // caches stay valid, eliding der_refresh_cache's two exp(). The
            // loop's DER_RENORM window absorbs the drift (≤ 2^16 per
            // application against a 2^±26 window, re-checked every turn, so it
            // cannot compound past f32). Large exponents keep the derS fold +
            // cache refresh (as the deep Padé path does for A/M²).
            if (abs(pdz.e) <= JET_DER_EXP_FOLD) {
              *derM = ldexp(cmul(*derM, pdz.m), vec2<i32>(pdz.e))
                    + pdc.m * exp(clamp(f32(pdc.e) * LN2 - *derS, -80.0, 80.0));
            } else {
              *derM = cmul(*derM, pdz.m);
              *derS = *derS + f32(pdz.e) * LN2;
              *derM = *derM + pdc.m * exp(clamp(f32(pdc.e) * LN2 - *derS, -80.0, 80.0));
              der_refresh_cache(derM, derS, derInvScale, epsThreshold, logEpsilon);
            }
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

fn mandelbrot_compute_deep(dc: fe, prev_iter: f32, prev_dz_m: vec2<f32>, prev_dz_e: i32, prev_ref_i_int: i32, prev_dzx: f32, prev_dzy: f32) -> FragOut {
  let max_iteration = mandelbrot.maxIteration;
  let muLimit = mandelbrot.mu;
  let logEpsilon = log(max(mandelbrot.epsilon, 1e-30));
  let globalMaxIterI = i32(mandelbrot.globalMaxIter);
  let scaleExp = i32(mandelbrot.scaleExp);

  var i: f32 = 0.0;
  g_workSteps = 0u;
  var dz = fe_renorm(fe(prev_dz_m, prev_dz_e));
  var ref_i = prev_ref_i_int;
  var refZ = getOrbit(ref_i); // carried orbit value (see mandelbrot_compute)
  var z = refZ + fe_to_vec(dz);

  // Derivative state der = derM · exp(derS), same representation & storage as
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

  // Block acceleration in the deep path: skip iteration blocks when |dz| is
  // small. Affine BLA and Padé share try_apply_bla_deep (mode ≥ 1.5 branches to
  // Padé); jet mode (≥ 2.5) uses its own table and try_apply_jet.
  let isJetDeep = mandelbrot.approximationMode >= 2.5;
  let useBlaDeep = mandelbrot.blaLevelCount >= 1.0 && mandelbrot.orbitComplete >= 0.5;
  var skip0Log = 0;
  var log_dcMag = 0.0;
  if (useBlaDeep) {
    if (isJetDeep) {
      skip0Log = i32(countTrailingZeros(max(mandelbrotJetLevels[0].skip, 1u)));
    } else {
      skip0Log = i32(countTrailingZeros(max(mandelbrotBlaLevels[0].skip, 1u)));
    }
    log_dcMag = log(max(length(dc.m), 1e-30)) + f32(dc.e) * LN2;
  }
  var jetMaxR3Deep = -3.0e38;
  var dcDeep2 = fe(vec2<f32>(0.0, 0.0), 0);
  var dcDeep3 = fe(vec2<f32>(0.0, 0.0), 0);
  // Hoisted per-level maxR3 gates (see the shallow loop's jetLvlR3).
  var jetLvlR3Deep: array<f32, JET_MAX_LEVELS>;
  if (useBlaDeep && isJetDeep) {
    dcDeep2 = fe_cmul(dc, dc);
    dcDeep3 = fe_cmul(dcDeep2, dc);
    // Global fast-reject bound (see the shallow loop's jetMaxR3).
    for (var l = 0; l < min(i32(mandelbrot.blaLevelCount), JET_MAX_LEVELS); l++) {
      let r = mandelbrotJetLevels[l].maxR3;
      jetLvlR3Deep[l] = r;
      jetMaxR3Deep = max(jetMaxR3Deep, r);
    }
  }
  var usedBla = false;

  while (g_workSteps < u32(max_iteration) && ref_i < globalMaxIterI) {
    g_workSteps += 1u;
    var skipped = 0;
    if (useBlaDeep) {
      var blaZ = vec2<f32>(0.0);
      if (isJetDeep) {
        if (log2(max(length(dz.m), 1e-30)) + f32(dz.e) < jetMaxR3Deep) {
          skipped = try_apply_jet(&ref_i, &dz, &derM, &derS, &derInvScale, &epsThreshold, logEpsilon, &blaZ, dc, dcDeep2, dcDeep3, muLimit, skip0Log, globalMaxIterI, &jetLvlR3Deep, vec2<f32>(0.0), vec2<f32>(0.0), vec2<f32>(0.0), false);
        }
      } else {
        skipped = try_apply_bla_deep(&ref_i, &dz, &derM, &derS, &derInvScale, &epsThreshold, logEpsilon, &blaZ, dc, log_dcMag, muLimit, skip0Log, globalMaxIterI);
      }
      if (skipped > 0) {
        usedBla = true;
        z = blaZ;
        i += f32(skipped);
        refZ = getOrbit(ref_i); // ref_i jumped past the block — resync carried orbit
      }
    }
    if (skipped == 0) {
      let zPrev = refZ + fe_to_vec(dz);
      // dz' = 2·z_n·dz + dz² + dc   (z_n = refZ is O(1) f32)
      dz = fe_add3(fe_cmul_f32(2.0 * refZ, dz), fe_cmul(dz, dz), dc);
      ref_i += 1;
      refZ = getOrbit(ref_i);
      z = refZ + fe_to_vec(dz);
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
      refZ = getOrbit(0);
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
  // zx/zy (|m|² < 2 < mu, so the |·|²<mu continuation test stays valid) and the
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
  //   iter > 0  AND  |z|² >= 4      : escaped, pass through
  //   iter > 0  AND  |z|² < 4       : budget exhausted mid-progress, needs continuation
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
    // dc = local·scaleMant + (cxMant, cyMant); all three share exponent scaleExp,
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
    // Resume from stored state: iter > 0, |z|² < mu.
    let stored_dzx = loadLayer(coord, 4);
    let stored_dzy = loadLayer(coord, 5);
    let prev_ref_i = loadLayer(coord, 6);
    let prev_avg_direction = loadLayer(coord, 7);
    return mandelbrot_compute(x0, y0, prev_iter, prev_zx, prev_zy, stored_dzx, stored_dzy, prev_ref_i, prev_avg_direction);
  }

  discard;
  return empty_out();
}
