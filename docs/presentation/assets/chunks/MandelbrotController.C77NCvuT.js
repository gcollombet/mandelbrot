import{aq as Br,d as tn,ar as ce,z as Je,p as Xn,s as Yn,o as Le,c as Be,j as L,e as Ht,Q as Dr,as as We,y as Ae,U as Cr,at as Ir,J as Vt,T as Pr,w as Fr,_ as $n,a6 as Or,a7 as Gr}from"./framework.C8AnsxUi.js";let Tl,_l;let __tla=(async()=>{const Ur=`// Fused brush + mandelbrot + count compute pass, working IN PLACE on the
// neutral texture A (rawTexture) via a read_write storage texture — the
// SINGLE production iteration path. Pan/clear frames are prepared by the
// reproject_cs utility pass (ping-pong A→B + copy back) in the same frame.
//
// ⚠ STRICTLY TEXEL-LOCAL: each invocation may only read and write ITS OWN
// texel (no neighbour access), otherwise in-place execution races.  Any
// future neighbour-dependent logic (translation reprojection, new brush
// interpolation, …) belongs in reproject_cs.wgsl.
//
// r32float is the only texture format supporting read_write storage access
// in core WebGPU — this shader depends on it.
//
// Layer layout (9-layer raw format — display-side textures stay at 8; the
// resolve/color passes never read in-progress derivative layers):
//   0 : sentinel / iteration count (integer part)
//   1 : resolution step (1.0 = genuine pixel, >= 2 = resolve-copied)
//   2 : z.x (escaped) or dz.x (continuation)
//   3 : z.y (escaped) or dz.y (continuation)
//   4 : escaped: distance height,          in-progress: derM.x (RAW)
//   5 : escaped: visual derivative angle,  in-progress: derM.y (RAW)
//   6 : ref_i + fractional stripe phase
//   7 : packed average orbit direction (deep continuation: dz exponent)
//   8 : in-progress: derS (RAW log scale); dead for finished pixels
//
// The derivative continuation state is carried RAW (register copies, zero
// transcendentals at pass boundaries — all-compute-der-cartesian). Polar
// conversion happens exactly once, at escape. The iter-layer state is the
// discriminant between the two meanings of layers 4/5 (as it already was
// for the escaped format).
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
const DEEP_EXP: i32 = -100;
const LN2: f32 = 0.6931471805599453;

// Pipeline-specialization override. When false, the driver dead-code-eliminates
// the entire floatexp deep-zoom subtree (mandelbrot_compute_deep + try_apply_*
// deep variants, all fe-typed), shrinking register pressure / raising occupancy
// for the shallow kernel used across the 1e10–1e25 interactive range (scaleExp >
// DEEP_EXP). Default true keeps the deep-capable kernel identical to before.
override ENABLE_DEEP: bool = true;

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
  // Pad\xe9 D = (dx,dy)\xb72^d_exp. Present to match the shared BlaStep buffer layout;
  // the brush does not apply rational blocks (it falls back to exact in pade mode).
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

// Per-dispatch work instrumentation (in-place path only). realMean/covMean are
// reduced at workgroup granularity then downscaled by 64 (via >>6, rounded) so
// the u32 accumulators don't overflow on big renders. The ratio metrics cancel
// the shared scale; the absolute "Total apps" count rescales realMean back by
// <<6 (quantization \xb132 per workgroup per dispatch).
//   realized skip   = covMean / realMean      (covered iters per real loop step)
//   workgroup waste = maxAccum / realMean      (lane-time / useful work; 1 = ideal)
//   straggler       = maxSteps                 (worst single-texel loop count)
//   total apps      = realMean << 6            (absolute Σ g_workSteps this render)
struct WorkStats {
  realMean: atomic<u32>,
  covMean: atomic<u32>,
  maxAccum: atomic<u32>,
  maxSteps: atomic<u32>,
  // Tier mix (auto mode): Σ applications per dispatch tier, same >>6 scale as
  // realMean — [affine, Pad\xe9, c+, jet]; zero outside mode 5.
  tierAff: atomic<u32>,
  tierPade: atomic<u32>,
  tierCplus: atomic<u32>,
  tierJet: atomic<u32>,
};

// ── bivariate jet mode (add-jet-approximation) ─────────────────────
// One truncated-Taylor coefficient (x, y)\xb72^e. Exponents are per-coefficient
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

// (#5) Level hint: start the descent at hint+UP (last accepted level) instead
// of the full alignment maximum. Capping the start can only shorten a skip
// (radius monotonicity: a level above the cap accepting ⇒ the cap level
// accepts too), so it is a pure perf knob. See mandelbrot.wgsl for the full
// rationale.
const JET_LEVEL_HINT_UP: i32 = 2;

// Largest |∂Φ/∂z exponent| folded into the derivative MANTISSA (ldexp) instead
// of derS: derS and its exp() caches stay valid, eliding der_refresh_cache's
// two exp() per application. Bounded so one application cannot push derM past
// f32 (DER_RENORM window half-width ≈ 2^26.6, checked every loop turn).
const JET_DER_EXP_FOLD: i32 = 16;

// Block coefficient strides into the FLAT coefficient buffer (binding 8).
// Jet records are 9 coefficients (108 B, degree-major: an order-k application
// reads only the first k(k+3)/2 — slots 0/1 are the affine A/B); M\xf6bius-c+
// records are 5 (60 B: A, B, A', D, D'). Both tables ship in the SAME buffer
// (identical 12 B element, exclusive modes) — the mode flag picks the stride.
// Same flat block index as the radius buffer either way.
const JET_COEFF_STRIDE: i32 = 9;
const MOBIUS_COEFF_STRIDE: i32 = 5;
// Unified table (mode 5): 9 elements in PREFIX order [A, B, D, A', D', a02,
// a30, a12, a03] — same element count as jet, tier-directed prefix reads.
const UNIFIED_COEFF_STRIDE: i32 = 9;

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
@group(0) @binding(4) var raw: texture_storage_2d_array<r32float, read_write>;
@group(0) @binding(5) var<uniform> brush: BrushUniforms;
@group(0) @binding(6) var<storage, read_write> counter: CounterBuffer;
@group(0) @binding(7) var<storage, read_write> workStats: WorkStats;
@group(0) @binding(8) var<storage, read> mandelbrotJetSuite: array<JetCoeff>;
@group(0) @binding(9) var<storage, read> mandelbrotJetLevels: array<JetLevel>;
@group(0) @binding(10) var<storage, read> mandelbrotJetRadii: array<JetRadii>;

// Per-invocation real loop-step counter (work done by this texel this dispatch),
// incremented once per iteration-loop turn (a block-apply or an exact step both
// count as 1). Reset in cs_main before each texel's compute.
var<private> g_workSteps: u32 = 0u;
// Per-texel tier application counts (auto mode), flushed with the work stats.
var<private> g_tierApps: array<u32, 4> = array<u32, 4>(0u, 0u, 0u, 0u);

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

// complex reciprocal 1/z in fe form (Pad\xe9 denominator): 1/z = conj(z)/|z|\xb2.
fn fe_cinv(z: fe) -> fe {
  let d = dot(z.m, z.m);
  return fe_renorm(fe(vec2<f32>(z.m.x, -z.m.y) / d, -z.e));
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

// derS accumulates as a compensated (hi, lo) register pair (see
// mandelbrot.wgsl for the rationale): branchless Knuth TwoSum at every
// update site; lo is register-only, storage keeps hi + lo collapsed.
fn two_sum(a: f32, b: f32) -> vec2<f32> {
  let s = a + b;
  let bv = s - a;
  let av = s - bv;
  return vec2<f32>(s, (a - av) + (b - bv));
}

fn der_scale_add(derS: ptr<function, f32>, derSLo: ptr<function, f32>, x: f32) {
  let se = two_sum(*derS, x);
  *derS = se.x;
  *derSLo = *derSLo + se.y;
}

fn der_refresh_cache(derM: ptr<function, vec2<f32>>, derS: ptr<function, f32>, derSLo: ptr<function, f32>, derInvScale: ptr<function, f32>, epsThreshold: ptr<function, f32>, logEpsilon: f32) {
  var s = *derS + *derSLo;
  if (s < -40.0) {
    *derM = *derM * exp(max(s, -80.0));
    *derS = 0.0;
    *derSLo = 0.0;
    s = 0.0;
  }
  *derInvScale = exp(clamp(-s, -80.0, 80.0));
  *epsThreshold = exp(clamp(logEpsilon - 2.0 * s, -87.0, 87.0));
}

fn der_renormalize(derM: ptr<function, vec2<f32>>, derS: ptr<function, f32>, derSLo: ptr<function, f32>, derInvScale: ptr<function, f32>, epsThreshold: ptr<function, f32>, logEpsilon: f32) {
  let mm = dot(*derM, *derM);
  if (mm > 0.0) {
    let lm = 0.5 * log(mm);
    der_scale_add(derS, derSLo, lm);
    *derM = *derM * exp(-lm);
  }
  der_refresh_cache(derM, derS, derSLo, derInvScale, epsThreshold, logEpsilon);
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

// Complex reciprocal 1/z (Pad\xe9 block application).
fn cinv(z: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(z.x, -z.y) / dot(z, z);
}
const PADE_POLE2: f32 = 1e-4;

fn try_apply_bla(ref_i: ptr<function, i32>, dz: ptr<function, vec2<f32>>, derM: ptr<function, vec2<f32>>, derS: ptr<function, f32>, derSLo: ptr<function, f32>, derInvScale: ptr<function, f32>, epsThreshold: ptr<function, f32>, logEpsilon: f32, zOut: ptr<function, vec2<f32>>, dc: vec2<f32>, dcMag: f32, bailout: f32, skip0Log: i32, maxIterI: i32) -> i32 {
  if (*ref_i <= 0) {
    return 0;
  }
  // (V-underflow) dot(dz,dz) flushes to 0 in f32 below |dz| ~ 1e-19 (routine at
  // mid-deep shallow zooms). Gate off length(), not dot(), in log2 space —
  // same shape as the jet/mobius block-table gate (see the comment near the
  // isBlockTable branch below). dzMagTiny short-circuits log2() so it is
  // never evaluated at/below its domain floor; when length() has also
  // underflowed (< ~1e-38) the magnitude test is treated as open — the radius
  // test below (with its own dead-block guard) is what actually validates.
  let dzMag = length(*dz);
  let dzMagTiny = dzMag < 1.2e-38;
  // (G) near-critical guard: a M\xf6bius block may only span steps with
  // |2Z_k| ≥ mu = √(|c|/ε); in log2, min_k log2|2Z_k| ≥ log2(mu).
  let log2_mu = 0.5 * (log2(max(dcMag, 1e-30)) - log2(max(mandelbrot.blaEpsilon, 1e-30)));
  let shiftedRef = *ref_i - 1;
  var level = min(i32(mandelbrot.blaLevelCount) - 1, i32(countTrailingZeros(u32(shiftedRef))) - skip0Log);
  while (level >= 0) {
    let levelInfo = mandelbrotBlaLevels[level];
    let skip = i32(levelInfo.skip);
    // Whole-level fast reject: every entry's effective radius is bounded by
    // the level's maxRadius, so a too-large |dz| skips the entry fetch.
    if ((dzMagTiny || log2(dzMag) <= log2(max(levelInfo.maxRadius, 1e-30))) && *ref_i + skip <= maxIterI) {
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
        // (dead-block) a collapsed radius rejects unconditionally. Without
        // this, dz == 0 (or a fully-underflowed dzMag) would pass a naive
        // log2(radius) = -inf comparison — the same "0 <= 0" degeneracy this
        // gate exists to remove, just relocated to -infinity.
        if (radius > 0.0 && (dzMagTiny || log2(dzMag) <= log2(radius))) {
          if (mandelbrot.approximationMode >= 1.5) {
            // ── Pad\xe9 [1/1] (in-place compute path) ──
            let d = ldexp(vec2<f32>(bla.dx, bla.dy), vec2<i32>(bla.d_exp, bla.d_exp));
            let m = vec2<f32>(1.0, 0.0) + cmul(d, *dz);   // 1 + D\xb7dz
            // (H2) c-truncation bound (|B|\xb7|c| < ε) + (G) near-critical guard
            // (block's min |2Z_k| ≥ mu) + pole guard. Any failing ⇒ descend a level.
            if (length(b) * dcMag < mandelbrot.blaEpsilon && bla.log2_min_a >= log2_mu && dot(m, m) >= PADE_POLE2) {
              let invM = cinv(m);
              let num = cmul(a, *dz) + cmul(b, dc);
              let candidate = cmul(num, invM);
              let candidateZ = getOrbit(*ref_i + skip) + candidate;
              if (!(skip > 1 && dot(candidateZ, candidateZ) > bailout)) {
                *dz = candidate;
                *zOut = candidateZ;
                // D4 derivative der' = (A/M\xb2)\xb7der + B/M, folded in derM/derS
                // space (mirrors try_apply_bla_deep's aOverM2/bOverM split):
                // multiply the raw (unscaled) mantissas by invM\xb2/invM — both
                // O(1)-bounded by the PADE_POLE2 pole guard above — and fold
                // the shared exponent ab_exp into derS afterward. This keeps
                // the mantissa product itself from ever overflowing/
                // underflowing, which using the already-ldexp'd a/b (as the
                // value branch above does) would not: ab_exp can be large
                // even in the "shallow" regime once many blocks compound.
                let aMantissa = vec2<f32>(bla.ax, bla.ay);
                let bMantissa = vec2<f32>(bla.bx, bla.by);
                let invM2 = cmul(invM, invM);
                *derM = cmul(cmul(aMantissa, invM2), *derM) + cmul(bMantissa, invM) * (*derInvScale);
                der_scale_add(derS, derSLo, f32(bla.ab_exp) * LN2);
                der_refresh_cache(derM, derS, derSLo, derInvScale, epsThreshold, logEpsilon);
                *ref_i += skip;
                return skip;
              }
            }
          } else {
            // ── affine BLA: z ← A\xb7z + B\xb7c ──
            let candidate = cmul(a, *dz) + cmul(b, dc);
            let candidateZ = getOrbit(*ref_i + skip) + candidate;
            if (!(skip > 1 && dot(candidateZ, candidateZ) > bailout)) {
              *dz = candidate;
              *zOut = candidateZ;
              // Mantissa-only update + derS fold — see the Pad\xe9 branch note above.
              *derM = cmul(*derM, vec2<f32>(bla.ax, bla.ay)) + vec2<f32>(bla.bx, bla.by) * (*derInvScale);
              der_scale_add(derS, derSLo, f32(bla.ab_exp) * LN2);
              der_refresh_cache(derM, derS, derSLo, derInvScale, epsThreshold, logEpsilon);
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

const IGNORE_EPSILON: bool = true;

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
  derS:      vec4<f32>, // layer 8: raw derivative log scale (continuations)
  // Phase D (analytic AA, auto mode) — layers 9..12; writes are silently
  // dropped when the raw texture is allocated at 9 layers.
  //   in-progress: 9/10 = sndM.x/y (z″ mantissa; scale is TIED to 2\xb7derS)
  //   escaped:     8 = S (derS at escape), 9/10 = derM.x/y (z′ mantissa),
  //                11/12 = sndM.x/y — the Taylor payload ẑ(δc) = z + z′\xb7δc
  //                + \xbd\xb7z″\xb7δc\xb2 the color pass expands per AA sample.
  aa9:  vec4<f32>,
  aa10: vec4<f32>,
  aa11: vec4<f32>,
  aa12: vec4<f32>,
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
  textureStore(raw, coord, 8, out.derS);
  textureStore(raw, coord, 9, out.aa9);
  textureStore(raw, coord, 10, out.aa10);
  textureStore(raw, coord, 11, out.aa11);
  textureStore(raw, coord, 12, out.aa12);
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
fn mandelbrot_compute(x0: f32, y0: f32, prev_iter: f32, prev_zx: f32, prev_zy: f32, prev_derx: f32, prev_dery: f32, prev_ders: f32, prev_ref_i: f32, prev_avg_direction: f32, prev_sndx: f32, prev_sndy: f32) -> TexelOut {
  let dc = vec2<f32>(x0, y0);
  let max_iteration = mandelbrot.maxIteration;
  let muLimit = mandelbrot.mu;
  let logEpsilon = log(max(mandelbrot.epsilon, 1e-30));
  let globalMaxIterI = i32(mandelbrot.globalMaxIter);

  var i: f32 = 0.0;
  var dz = vec2<f32>(prev_zx, prev_zy);
  var ref_i = decode_ref_i(prev_ref_i);
  // Carried reference-orbit value. Invariant: refZ == getOrbit(ref_i) at the end
  // of every loop branch, so a single-step iteration reads the orbit once (it used
  // to read getOrbit(ref_i) and getOrbit(ref_i+1) — the latter is the next step's
  // refZ). Resyncs are always a fresh getOrbit read (never z − dz), so the orbit
  // values fed to the iteration are identical to reloading every step.
  var refZ = getOrbit(ref_i);
  var z = refZ + dz;

  // Derivative state der = derM \xb7 exp(derS), carried RAW across pass
  // boundaries (layers 4/5/8 for in-progress pixels): the reload is a bit
  // -exact register copy — no polar round-trip, no transcendental. Fresh
  // pixels pass (0, 0, 0): derM = 0 is the empty state, the "+1" term seeds
  // the first iteration through derInvScale.
  var derM = vec2<f32>(prev_derx, prev_dery);
  var derS: f32 = prev_ders;
  // Compensation term of the derS two-sum pair — register-only, reset each
  // pass (the stored derS is the collapsed hi + lo).
  var derSLo: f32 = 0.0;
  // Phase D: z″ mantissa (scale TIED to 2\xb7derS). Tracked in unified mode; a
  // saturated/garbage value only downgrades the pixel to real re-iteration at
  // AA time (margin test), never corrupts the value channel.
  var sndM = vec2<f32>(prev_sndx, prev_sndy);
  var derInvScale = 0.0;
  var epsThreshold = 0.0;
  der_refresh_cache(&derM, &derS, &derSLo, &derInvScale, &epsThreshold, logEpsilon);

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

  // This is the in-place COMPUTE iteration path (the progressive-continuation
  // workhorse) — NOT a throwaway preview. BLA (affine) and Pad\xe9 (rational) both
  // apply here; try_apply_bla branches on approximationMode ≥ 1.5.
  // approximationMode: 1 = affine BLA, 2 = Pad\xe9, 3 = jet, 4 = M\xf6bius-c+,
  // 5 = unified (per-block dispatch tags over the four tiers). The
  // level-count uniform carries the ACTIVE table's level count. Jet and mobius
  // share the level/radius/coefficient buffers (different coefficient stride).
  let isUnified = mandelbrot.approximationMode >= 4.5;
  let isMobius = mandelbrot.approximationMode >= 3.5 && !isUnified;
  let isJet = mandelbrot.approximationMode >= 2.5 && !isMobius && !isUnified;
  let isBlockTable = isJet || isMobius || isUnified;
  let useBla = mandelbrot.approximationMode >= 0.5
            && mandelbrot.orbitComplete >= 0.5
            && mandelbrot.blaLevelCount >= 1.0;

  if (useBla) {
    let dcMag = sqrt(max(0.0, dot(dc, dc)));
    var skip0Log = 0;
    // log2-domain, not squared-radius: a plain dot(dz,dz)/radius\xb2 comparison
    // underflows in f32 below |dz| ~ 1e-19 (see try_apply_bla), so this bound
    // is compared against log2(length(dz)) at the call site instead.
    var logMaxBlaR = -3.0e38;
    var jetMaxR3 = -3.0e38;
    // Hoisted per-level maxR3 gates: loaded ONCE per pixel, so the descent in
    // try_apply_jet never re-reads the level directory on failing probes.
    var jetLvlR3: array<f32, JET_MAX_LEVELS>;
    if (isBlockTable) {
      skip0Log = i32(countTrailingZeros(max(mandelbrotJetLevels[0].skip, 1u)));
      // Global fast-reject bound (sibling of logMaxBlaR): the loosest top-order
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
      logMaxBlaR = log2(max(maxBlaRadius, 1e-30));
    }
    let dcFe = fe_from_vec(dc, 0);
    let dcFe2 = fe_cmul(dcFe, dcFe);
    let dcFe3 = fe_cmul(dcFe2, dcFe);
    // (#4) f32 dc powers for the jet fast path. The gate needs |dc| > 2^-42 so
    // dc\xb2/dc\xb3 stay clear of the f32 subnormal band (else the pure-c Horner
    // terms would silently flush — the fe path keeps them).
    let dcF2 = cmul(dc, dc);
    let dcF3 = cmul(dcF2, dc);
    let jetF32Ok = isJet && dcMag > 2.3e-13;
    // M\xf6bius products are degree-1 in dc (no dc\xb2/dc\xb3), so its f32-path gate
    // only needs dc itself clear of the subnormal band.
    let mobiusF32Ok = isMobius && dcMag > 1e-30;
    // Unified fast path serves the RATIONAL tags only (degree-1 in dc): same
    // gate as M\xf6bius; the jet tag always evaluates in fe.
    let unifiedF32Ok = isUnified && dcMag > 1e-30;
    var usedBla = false;
    var blaZ = vec2<f32>(0.0);
    var jetLevelHint = JET_MAX_LEVELS; // (#5) start uncapped, then track accepts
    // Phase E periodic-interior state (auto mode): armed when the header
    // carries a period block; one compare per loop turn, an attempt every p
    // iterations at the aligned phase (O(1/p) amortized).
    var perP = 0;
    var perStart = 0;
    var perNext = 2147483647;
    var perR = -3.0e38;
    var perHdr = 0;
    if (isUnified) {
      let lastLvl = mandelbrotJetLevels[i32(mandelbrot.blaLevelCount) - 1];
      perHdr = i32(lastLvl.offset + lastLvl.count);
      perStart = i32(mandelbrotJetRadii[perHdr + 4].v.w);
      perP = i32(mandelbrotJetRadii[perHdr + 5].v.w);
      perR = mandelbrotJetRadii[perHdr + 6].v.w;
      if (perP > 0) {
        perNext = perStart;
      }
    }
    while (g_workSteps < u32(max_iteration) && ref_i < globalMaxIterI) {
      g_workSteps += 1u;
      if (perP > 0 && ref_i >= perNext) {
        let k = (ref_i - perStart + perP - 1) / perP;
        let aligned = perStart + k * perP;
        if (ref_i == aligned) {
          perNext = aligned + perP;
          if (try_periodic_interior(perHdr, fe_from_vec(dz, 0), dcFe, perR)) {
            inside = true;
            break;
          }
        } else {
          perNext = aligned;
        }
      }
      var skipped = 0;
      if (isBlockTable) {
        // Global gate first (one log2 vs the table-wide bound), then convert dz
        // to floatexp for the shared evaluator (coefficient exponents exceed
        // f32 even shallow). Use length(), not dot(): |dz|\xb2 UNDERFLOWS f32 for
        // |dz| < ~1e-19 (routine at mid-deep shallow zooms) and a clamped
        // log2 would over-estimate |dz| and reject everything. When even
        // length() underflows, pass the gate — the fe-domain test inside
        // try_apply_jet/try_apply_mobius is exact.
        let dzMag = length(dz);
        if (dzMag < 1.2e-38 || log2(dzMag) < jetMaxR3) {
          var dzFe = fe_from_vec(dz, 0);
          if (isUnified) {
            skipped = try_apply_unified(&ref_i, &dzFe, &derM, &derS, &derSLo, &derInvScale, &epsThreshold, logEpsilon, &blaZ, dcFe, dcFe2, dcFe3, muLimit, skip0Log, globalMaxIterI, &jetLvlR3, dc, unifiedF32Ok, &jetLevelHint, &sndM);
          } else if (isMobius) {
            skipped = try_apply_mobius(&ref_i, &dzFe, &derM, &derS, &derSLo, &derInvScale, &epsThreshold, logEpsilon, &blaZ, dcFe, muLimit, skip0Log, globalMaxIterI, &jetLvlR3, dc, mobiusF32Ok, &jetLevelHint);
          } else {
            skipped = try_apply_jet(&ref_i, &dzFe, &derM, &derS, &derSLo, &derInvScale, &epsThreshold, logEpsilon, &blaZ, dcFe, dcFe2, dcFe3, muLimit, skip0Log, globalMaxIterI, &jetLvlR3, dc, dcF2, dcF3, jetF32Ok, &jetLevelHint);
          }
          if (skipped > 0) {
            dz = fe_to_vec(dzFe);
          }
        }
      } else {
        // Same log2/length() discipline as the isBlockTable gate above (dz
        // stays plain f32 here — try_apply_bla reconstructs coefficients to
        // f32 itself, no fe conversion needed on this path).
        let dzMagOuter = length(dz);
        if (dzMagOuter < 1.2e-38 || log2(dzMagOuter) <= logMaxBlaR) {
          skipped = try_apply_bla(&ref_i, &dz, &derM, &derS, &derSLo, &derInvScale, &epsThreshold, logEpsilon, &blaZ, dc, dcMag, muLimit, skip0Log, globalMaxIterI);
        }
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
        if (isUnified) {
          // z″ ← 2(z′\xb2 + z\xb7z″), in the 2\xb7derS-tied scale (uses the OLD derM).
          sndM = 2.0 * (cmul(derM, derM) + cmul(zPrev, sndM));
        }
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
        let derPolar = der_to_polar(derM, derS + derSLo);
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
        let sBefore = derS + derSLo;
        der_renormalize(&derM, &derS, &derSLo, &derInvScale, &epsThreshold, logEpsilon);
        if (isUnified) {
          // z″ scale is tied to 2\xb7derS: mirror the renorm shift twice.
          sndM = sndM * exp(clamp(-2.0 * ((derS + derSLo) - sBefore), -80.0, 80.0));
        }
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
        let derPolar = der_to_polar(derM, derS + derSLo);
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
        der_renormalize(&derM, &derS, &derSLo, &derInvScale, &epsThreshold, logEpsilon);
      }

      let dot_dz = dot(dz, dz);
      if (dot_z < dot_dz || ref_i == globalMaxIterI) {
        dz = z;
        ref_i = 0;
        refZ = getOrbit(0);
      }
    }
  }

  var out: TexelOut;

  let derPolarOut = der_to_polar(derM, derS + derSLo);
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
    out.derS      = pack(0.0); // finished — layer 8 dead
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
    // Phase D Taylor payload (escaped): S in layer 8, z′/z″ mantissas in
    // 9..12 — the color pass expands ẑ(δc) per AA sample from these.
    out.derS      = pack(derS + derSLo);
    out.aa9       = pack(derM.x);
    out.aa10      = pack(derM.y);
    out.aa11      = pack(sndM.x);
    out.aa12      = pack(sndM.y);
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
    out.derS      = pack(0.0); // finished — layer 8 dead
    return out;
  }

  // Budget exhausted mid-progress: park the derivative RAW (layers 4/5/8) —
  // the next pass reloads it bit-exactly (lossless boundary).
  out.iter      = pack(total_iter);
  out.genuine   = pack(1.0);
  out.zx        = pack(dz.x);
  out.zy        = pack(dz.y);
  out.dzx       = pack(derM.x);
  out.dzy       = pack(derM.y);
  out.ref_i     = pack(ref_i_with_stripe(f32(ref_i), stripeEma));
  out.avgDirection = pack(encode_avg_dir(avgDir));
  out.derS      = pack(derS + derSLo);
  out.aa9       = pack(sndM.x);
  out.aa10      = pack(sndM.y);
  return out;
}

// ── deep (floatexp) perturbation ──────────────────────────────────
// Exact perturbation with dz/dc in extended-exponent form, for scale below the
// deep threshold. Mirrors mandelbrot.wgsl's mandelbrot_compute_deep but returns
// TexelOut. dz, dc are fe; z_n stays O(1) f32; der reuses the shallow machinery;
// the resumable dz is parked as (mantissa in zx/zy, exponent in avgDirection),
// so orbit-direction metrics are unavailable on the deep path.
// BLA in the deep (floatexp) path — see mandelbrot.wgsl for the derivation.
fn try_apply_bla_deep(ref_i: ptr<function, i32>, dz: ptr<function, fe>, derM: ptr<function, vec2<f32>>, derS: ptr<function, f32>, derSLo: ptr<function, f32>, derInvScale: ptr<function, f32>, epsThreshold: ptr<function, f32>, logEpsilon: f32, zOut: ptr<function, vec2<f32>>, dc: fe, log_dcMag: f32, bailout: f32, skip0Log: i32, maxIterI: i32) -> i32 {
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
        let log_alpha = log(bla.radius_alpha) + f32(bla.alpha_exp) * LN2;
        let log_betaDc = log(max(bla.radius_beta, 1e-30)) + log_dcMag;
        if (log_betaDc < log_alpha) {
          let ratio = exp(log_betaDc - log_alpha);
          let log_radius = log_alpha + log(max(1.0 - ratio, 1e-30));
          if (log_dz <= log_radius) {
            let a = fe(vec2<f32>(bla.ax, bla.ay), bla.ab_exp);
            let b = fe(vec2<f32>(bla.bx, bla.by), bla.ab_exp);
            let num = fe_add(fe_cmul(a, *dz), fe_cmul(b, dc));
            if (mandelbrot.approximationMode >= 1.5) {
              // ── Pad\xe9 [1/1] in floatexp: dz ← num/(1 + D\xb7dz) ──
              let d = fe(vec2<f32>(bla.dx, bla.dy), bla.d_exp);
              let m = fe_add(fe(vec2<f32>(1.0, 0.0), 0), fe_cmul(d, *dz));   // 1 + D\xb7dz
              // (H2) c-truncation bound in log space (|B|\xb7|c| < ε) + (G)
              // near-critical guard (min |2Z_k| ≥ mu) + pole guard.
              let log_bDc = log(max(length(b.m), 1e-30)) + f32(b.e) * LN2 + log_dcMag;
              if (log_bDc < log(max(mandelbrot.blaEpsilon, 1e-30)) && bla.log2_min_a >= log2_mu && fe_mag2_f32(m) >= PADE_POLE2) {
                let invM = fe_cinv(m);
                let candidate = fe_cmul(num, invM);
                let candidateZ = getOrbit(*ref_i + skip) + fe_to_vec(candidate);
                if (!(skip > 1 && dot(candidateZ, candidateZ) > bailout)) {
                  *dz = candidate;
                  *zOut = candidateZ;
                  // D4 derivative der' = (A/M\xb2)\xb7der + B/M, in derM/derS space.
                  let aOverM2 = fe_cmul(a, fe_cmul(invM, invM));   // A/M\xb2
                  let bOverM = fe_cmul(b, invM);                   // B/M
                  *derM = cmul(*derM, aOverM2.m);
                  der_scale_add(derS, derSLo, f32(aOverM2.e) * LN2);
                  *derM = *derM + bOverM.m * exp(clamp(f32(bOverM.e) * LN2 - (*derS + *derSLo), -80.0, 80.0));
                  der_refresh_cache(derM, derS, derSLo, derInvScale, epsThreshold, logEpsilon);
                  *ref_i += skip;
                  return skip;
                }
              }
            } else {
              // ── affine: dz ← A\xb7dz + B\xb7dc ──
              let candidateZ = getOrbit(*ref_i + skip) + fe_to_vec(num);
              if (!(skip > 1 && dot(candidateZ, candidateZ) > bailout)) {
                *dz = num;
                *zOut = candidateZ;
                *derM = cmul(*derM, vec2<f32>(bla.ax, bla.ay)) + vec2<f32>(bla.bx, bla.by) * (*derInvScale);
                der_scale_add(derS, derSLo, f32(bla.ab_exp) * LN2);
                der_refresh_cache(derM, derS, derSLo, derInvScale, epsThreshold, logEpsilon);
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
//   Φ      = P0 + dz\xb7(P1 + dz\xb7(P2 + dz\xb7P3))
//   ∂Φ/∂z  = P1 + dz\xb7(2\xb7P2 + dz\xb73\xb7P3)
//   ∂Φ/∂c  = Q0 + dz\xb7(Q1 + dz\xb7Q2),  Q_i = ∂P_i/∂c
// Reads only the degree ≤ k coefficient prefix (design D1).
fn jet_apply(entry: i32, k: i32, dz: fe, dc: fe, dc2: fe, dc3: fe, pdz: ptr<function, fe>, pdc: ptr<function, fe>) -> fe {
  let a10 = jet_coeff_fe(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 0]);
  let a01 = jet_coeff_fe(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 1]);
  var p0 = fe_cmul(a01, dc);
  var p1 = a10;
  var q0 = a01;
  if (k < 2) {
    *pdz = p1;
    *pdc = q0;
    return fe_add(p0, fe_cmul(p1, dz));
  }
  let a20 = jet_coeff_fe(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 2]);
  let a11 = jet_coeff_fe(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 3]);
  let a02 = jet_coeff_fe(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 4]);
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
  let a30 = jet_coeff_fe(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 5]);
  let a21 = jet_coeff_fe(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 6]);
  let a12 = jet_coeff_fe(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 7]);
  let a03 = jet_coeff_fe(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 8]);
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
// applied blocks then caps every Horner intermediate at ~2^99 \xab f32 max.
fn jet_apply_f32(entry: i32, k: i32, dz: vec2<f32>, dc: vec2<f32>, dc2: vec2<f32>, dc3: vec2<f32>, pdz: ptr<function, vec2<f32>>, pdc: ptr<function, vec2<f32>>) -> vec2<f32> {
  let a10 = jet_coeff_f32(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 0]);
  let a01 = jet_coeff_f32(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 1]);
  var p0 = cmul(a01, dc);
  var p1 = a10;
  var q0 = a01;
  if (k < 2) {
    *pdz = p1;
    *pdc = q0;
    return p0 + cmul(p1, dz);
  }
  let a20 = jet_coeff_f32(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 2]);
  let a11 = jet_coeff_f32(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 3]);
  let a02 = jet_coeff_f32(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 4]);
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
  let a30 = jet_coeff_f32(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 5]);
  let a21 = jet_coeff_f32(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 6]);
  let a12 = jet_coeff_f32(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 7]);
  let a03 = jet_coeff_f32(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 8]);
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

// Jet skip attempt: greedy on skip via the r3 gates (level directory then
// per-block), then the SMALLEST valid order (design D2) — a far-inside entry
// pays an affine-sized evaluation. Works on both paths (dz always fe here).
// \`lvlR3\` is the caller-hoisted copy of the level directory's maxR3 gates: a
// failing level probe costs ZERO memory reads (the skip is recomputed from the
// power-of-two scaffold), and the directory is only read once a gate passes.
// \`dcF/dcF2/dcF3\` + \`f32Ok\` drive the plain-f32 fast path (#4): the caller sets
// f32Ok only when its dz/dc live at f32 scale (shallow loop, |dc| > 2^-42 so
// the dc powers clear the subnormal band); the deep loop passes zeros + false.
fn try_apply_jet(ref_i: ptr<function, i32>, dz: ptr<function, fe>, derM: ptr<function, vec2<f32>>, derS: ptr<function, f32>, derSLo: ptr<function, f32>, derInvScale: ptr<function, f32>, epsThreshold: ptr<function, f32>, logEpsilon: f32, zOut: ptr<function, vec2<f32>>, dc: fe, dc2: fe, dc3: fe, bailout: f32, skip0Log: i32, maxIterI: i32, lvlR3: ptr<function, array<f32, JET_MAX_LEVELS>>, dcF: vec2<f32>, dcF2: vec2<f32>, dcF3: vec2<f32>, f32Ok: bool, hint: ptr<function, i32>) -> i32 {
  if (*ref_i <= 0) {
    return 0;
  }
  let log2_dz = log2(max(length((*dz).m), 1e-30)) + f32((*dz).e);
  let shiftedRef = *ref_i - 1;
  // Alignment cap, then the (#5) hint cap: start just above the last accepted.
  var level = min(min(i32(mandelbrot.blaLevelCount), JET_MAX_LEVELS) - 1, i32(countTrailingZeros(u32(shiftedRef))) - skip0Log);
  level = min(level, *hint + JET_LEVEL_HINT_UP);
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
            // der' = ∂Φ/∂z\xb7der + ∂Φ/∂c. (#3) Small ∂Φ/∂z exponents — the norm
            // on the slow dynamics that dominate wall-clock — fold into the
            // MANTISSA (ldexp, exact) instead of derS: derS and its exp()
            // caches stay valid, eliding der_refresh_cache's two exp(). The
            // loop's DER_RENORM window absorbs the drift (≤ 2^16 per
            // application against a 2^\xb126 window, re-checked every turn, so it
            // cannot compound past f32). Large exponents keep the derS fold +
            // cache refresh (as the deep Pad\xe9 path does for A/M\xb2).
            if (abs(pdz.e) <= JET_DER_EXP_FOLD) {
              *derM = ldexp(cmul(*derM, pdz.m), vec2<i32>(pdz.e))
                    + pdc.m * exp(clamp(f32(pdc.e) * LN2 - (*derS + *derSLo), -80.0, 80.0));
            } else {
              *derM = cmul(*derM, pdz.m);
              der_scale_add(derS, derSLo, f32(pdz.e) * LN2);
              *derM = *derM + pdc.m * exp(clamp(f32(pdc.e) * LN2 - (*derS + *derSLo), -80.0, 80.0));
              der_refresh_cache(derM, derS, derSLo, derInvScale, epsThreshold, logEpsilon);
            }
            *ref_i += skip;
            *hint = level; // (#5) seed next turn's descent
            return skip;
          }
        }
      }
    }
    level -= 1;
  }
  return 0;
}

// ── M\xf6bius-c+ block application (add-mobius-cplus) ──────────────────
// m(z, c) = ((A + A'\xb7c)\xb7z + B\xb7c) / (1 + (D + D'\xb7c)\xb7z): the Pad\xe9 vehicle plus
// two c-linear coefficients that annihilate the zc/z\xb2c cross-terms guard (G)
// exists for. ONE validity comparison log2|dz| < r per probed block — no H2,
// no min_a, no beta\xb7dcMag, no separate pole test (DEN > 0.5 is folded into the
// certified radius). Records live in the jet coefficient buffer at stride 5
// (order A, B, A', D, D'), radii in the same vec4 sidecar (x = r, y = the
// f32-safe fast-path flag).

fn fe_neg(a: fe) -> fe {
  return fe(-a.m, a.e);
}

// Optional paranoia guard on the denominator (note \xa75): reject the block when
// |1 + De\xb7dz| ≤ 1e-3 and let the descent fall through to lower levels / the
// exact step. The certified radius already implies DEN > 0.5, so this should
// never fire — kept ON for the first field round (design D5 open question).
const MOBIUS_PARANOIA_GUARD: bool = true;
const MOBIUS_DEN_GUARD2: f32 = 1e-6;

// M\xf6bius skip attempt: same descent shape as try_apply_jet (hoisted per-level
// gates, sidecar probe, level hint, greedy on skip), single radius, inline
// [1/1] application. \`dcF\`/\`f32Ok\` drive the plain-f32 fast path (only
// degree-1 dc products here, so the dc gate is far looser than the jet's);
// the deep loop passes zeros + false and pays the fe evaluation.
fn try_apply_mobius(ref_i: ptr<function, i32>, dz: ptr<function, fe>, derM: ptr<function, vec2<f32>>, derS: ptr<function, f32>, derSLo: ptr<function, f32>, derInvScale: ptr<function, f32>, epsThreshold: ptr<function, f32>, logEpsilon: f32, zOut: ptr<function, vec2<f32>>, dc: fe, bailout: f32, skip0Log: i32, maxIterI: i32, lvlR: ptr<function, array<f32, JET_MAX_LEVELS>>, dcF: vec2<f32>, f32Ok: bool, hint: ptr<function, i32>) -> i32 {
  if (*ref_i <= 0) {
    return 0;
  }
  let log2_dz = log2(max(length((*dz).m), 1e-30)) + f32((*dz).e);
  let shiftedRef = *ref_i - 1;
  var level = min(min(i32(mandelbrot.blaLevelCount), JET_MAX_LEVELS) - 1, i32(countTrailingZeros(u32(shiftedRef))) - skip0Log);
  level = min(level, *hint + JET_LEVEL_HINT_UP);
  while (level >= 0) {
    let skip = i32(1u << u32(skip0Log + level));
    if (log2_dz < (*lvlR)[level] && *ref_i + skip <= maxIterI) {
      let levelInfo = mandelbrotJetLevels[level];
      let slot = shiftedRef >> u32(skip0Log + level);
      if (u32(slot) < levelInfo.count) {
        let entry = i32(levelInfo.offset) + slot;
        // One coalesced 16 B probe (x = certified radius, y = f32-safe flag);
        // the 60 B coefficient record is read only when the block applies.
        let radii = mandelbrotJetRadii[entry].v;
        if (log2_dz < radii.x) {
          let base = entry * MOBIUS_COEFF_STRIDE;
          var phi: fe;
          var pdz: fe;
          var pdc: fe;
          var denOk = true;
          if (f32Ok && radii.y > 0.5 && log2_dz > -100.0) {
            // Plain-f32 fast path: 5 ldexp reconstructions + the [1/1] form.
            let ca  = jet_coeff_f32(mandelbrotJetSuite[base]);
            let cb  = jet_coeff_f32(mandelbrotJetSuite[base + 1]);
            let cap = jet_coeff_f32(mandelbrotJetSuite[base + 2]);
            let cd  = jet_coeff_f32(mandelbrotJetSuite[base + 3]);
            let cdp = jet_coeff_f32(mandelbrotJetSuite[base + 4]);
            let dzF = fe_to_vec(*dz);
            let ae = ca + cmul(cap, dcF);       // Ae = A + A'\xb7dc
            let de = cd + cmul(cdp, dcF);       // De = D + D'\xb7dc
            let den = vec2<f32>(1.0, 0.0) + cmul(de, dzF);
            if (MOBIUS_PARANOIA_GUARD && dot(den, den) < MOBIUS_DEN_GUARD2) {
              denOk = false;
            } else {
              let invDen = cinv(den);
              let phiF = cmul(cmul(ae, dzF) + cmul(cb, dcF), invDen);
              phi = fe_from_vec(phiF, 0);
              // ∂m/∂z = (Ae − m\xb7De)/den ; ∂m/∂c = (A'\xb7z + B − m\xb7D'\xb7z)/den
              pdz = fe_from_vec(cmul(ae - cmul(phiF, de), invDen), 0);
              pdc = fe_from_vec(cmul(cmul(cap, dzF) + cb - cmul(phiF, cmul(cdp, dzF)), invDen), 0);
            }
          } else {
            let ca  = jet_coeff_fe(mandelbrotJetSuite[base]);
            let cb  = jet_coeff_fe(mandelbrotJetSuite[base + 1]);
            let cap = jet_coeff_fe(mandelbrotJetSuite[base + 2]);
            let cd  = jet_coeff_fe(mandelbrotJetSuite[base + 3]);
            let cdp = jet_coeff_fe(mandelbrotJetSuite[base + 4]);
            let ae = fe_add(ca, fe_cmul(cap, dc));
            let de = fe_add(cd, fe_cmul(cdp, dc));
            let den = fe_add(fe(vec2<f32>(1.0, 0.0), 0), fe_cmul(de, *dz));
            if (MOBIUS_PARANOIA_GUARD && (den.e < -10 || (den.e < 5 && fe_mag2_f32(den) < MOBIUS_DEN_GUARD2))) {
              denOk = false;
            } else {
              let invDen = fe_cinv(den);
              phi = fe_cmul(fe_add(fe_cmul(ae, *dz), fe_cmul(cb, dc)), invDen);
              pdz = fe_cmul(fe_add(ae, fe_neg(fe_cmul(phi, de))), invDen);
              pdc = fe_cmul(fe_add3(fe_cmul(cap, *dz), cb, fe_neg(fe_cmul(phi, fe_cmul(cdp, *dz)))), invDen);
            }
          }
          if (denOk) {
            let candidateZ = getOrbit(*ref_i + skip) + fe_to_vec(phi);
            // Do not jump over the first escape (same rule as the BLA paths).
            if (!(skip > 1 && dot(candidateZ, candidateZ) > bailout)) {
              *dz = phi;
              *zOut = candidateZ;
              // der' = ∂m/∂z\xb7der + ∂m/∂c, with the (#3) exponent-fold
              // discipline shared with the jet path.
              if (abs(pdz.e) <= JET_DER_EXP_FOLD) {
                *derM = ldexp(cmul(*derM, pdz.m), vec2<i32>(pdz.e))
                      + pdc.m * exp(clamp(f32(pdc.e) * LN2 - (*derS + *derSLo), -80.0, 80.0));
              } else {
                *derM = cmul(*derM, pdz.m);
                der_scale_add(derS, derSLo, f32(pdz.e) * LN2);
                *derM = *derM + pdc.m * exp(clamp(f32(pdc.e) * LN2 - (*derS + *derSLo), -80.0, 80.0));
                der_refresh_cache(derM, derS, derSLo, derInvScale, epsThreshold, logEpsilon);
              }
              *ref_i += skip;
              *hint = level; // (#5) seed next turn's descent
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

// ── unified block application (unify-jet-table-dispatch, task 2.6) ──────────
// One sidecar probe (x = tagged tier's certified radius, y = tier tag,
// z = f32-safe flag), then a TIER-DIRECTED prefix read of the 9-slot record
// [A, B, D, A', D', a02, a30, a12, a03]: affine reads 2 slots, Pad\xe9 3, c+ 5,
// jet all 9 (reconstructing a20 = −D\xb7A, a11 = A' − B\xb7D, a21 = −D'\xb7A − D\xb7a11 in
// registers — the verified identities). Tags are block properties, so the
// choice is warp-uniform. Rational tags (0-2) get the plain-f32 fast path;
// the jet tag always evaluates in fe (deep is where it fires).
fn try_apply_unified(ref_i: ptr<function, i32>, dz: ptr<function, fe>, derM: ptr<function, vec2<f32>>, derS: ptr<function, f32>, derSLo: ptr<function, f32>, derInvScale: ptr<function, f32>, epsThreshold: ptr<function, f32>, logEpsilon: f32, zOut: ptr<function, vec2<f32>>, dc: fe, dc2: fe, dc3: fe, bailout: f32, skip0Log: i32, maxIterI: i32, lvlR: ptr<function, array<f32, JET_MAX_LEVELS>>, dcF: vec2<f32>, f32Ok: bool, hint: ptr<function, i32>, snd: ptr<function, vec2<f32>>) -> i32 {
  if (*ref_i <= 0) {
    return 0;
  }
  let log2_dz = log2(max(length((*dz).m), 1e-30)) + f32((*dz).e);
  let shiftedRef = *ref_i - 1;
  var level = min(min(i32(mandelbrot.blaLevelCount), JET_MAX_LEVELS) - 1, i32(countTrailingZeros(u32(shiftedRef))) - skip0Log);
  level = min(level, *hint + JET_LEVEL_HINT_UP);
  while (level >= 0) {
    let skip = i32(1u << u32(skip0Log + level));
    if (log2_dz < (*lvlR)[level] && *ref_i + skip <= maxIterI) {


      let levelInfo = mandelbrotJetLevels[level];
      let slot = shiftedRef >> u32(skip0Log + level);
      if (u32(slot) < levelInfo.count) {
        let entry = i32(levelInfo.offset) + slot;
        // One coalesced 16 B probe; the record is read only on application,
        // and only the tagged tier's prefix of it.
        let radii = mandelbrotJetRadii[entry].v;
        if (log2_dz < radii.x) {
          let tag = i32(radii.y + 0.5);
          let base = entry * UNIFIED_COEFF_STRIDE;
          var phi: fe;
          var pdz: fe;
          var pdc: fe;
          // Phase D tier second partials (zero for the affine tag): the z″
          // chain δ″′ = m_zz\xb7δ′\xb2 + 2\xb7m_zc\xb7δ′ + m_cc + m_z\xb7δ″.
          var mzz = fe(vec2<f32>(0.0), 0);
          var mzc = fe(vec2<f32>(0.0), 0);
          var mcc = fe(vec2<f32>(0.0), 0);
          var denOk = true;
          if (tag <= 2 && f32Ok && radii.z > 0.5 && log2_dz > -100.0) {
            // Plain-f32 fast path, rational tiers (2-5 ldexp reconstructions).
            let ca = jet_coeff_f32(mandelbrotJetSuite[base]);
            let cb = jet_coeff_f32(mandelbrotJetSuite[base + 1]);
            let dzF = fe_to_vec(*dz);
            if (tag == 0) {
              // Affine tier: 24 B, one cmul pair; exact-form partials.
              phi = fe_from_vec(cmul(ca, dzF) + cmul(cb, dcF), 0);
              pdz = fe_from_vec(ca, 0);
              pdc = fe_from_vec(cb, 0);
            } else {
              var ae = ca;
              var de = jet_coeff_f32(mandelbrotJetSuite[base + 2]);
              var capF = vec2<f32>(0.0);
              var cdpF = vec2<f32>(0.0);
              if (tag == 2) {
                capF = jet_coeff_f32(mandelbrotJetSuite[base + 3]);
                cdpF = jet_coeff_f32(mandelbrotJetSuite[base + 4]);
                ae = ca + cmul(capF, dcF);
                de = de + cmul(cdpF, dcF);
              }
              let den = vec2<f32>(1.0, 0.0) + cmul(de, dzF);
              if (MOBIUS_PARANOIA_GUARD && dot(den, den) < MOBIUS_DEN_GUARD2) {
                denOk = false;
              } else {
                let invDen = cinv(den);
                let phiF = cmul(cmul(ae, dzF) + cmul(cb, dcF), invDen);
                phi = fe_from_vec(phiF, 0);
                let mzF = cmul(ae - cmul(phiF, de), invDen);
                let mcF = cmul(cmul(capF, dzF) + cb - cmul(phiF, cmul(cdpF, dzF)), invDen);
                pdz = fe_from_vec(mzF, 0);
                pdc = fe_from_vec(mcF, 0);
                // m_zz = −2\xb7De\xb7m_z/den ; m_cc = −2\xb7D′\xb7z\xb7m_c/den ;
                // m_zc = (A′ − m_c\xb7De − φ\xb7D′)/den − m_z\xb7D′\xb7z/den.
                mzz = fe_from_vec(-2.0 * cmul(de, cmul(mzF, invDen)), 0);
                mcc = fe_from_vec(-2.0 * cmul(cmul(cdpF, dzF), cmul(mcF, invDen)), 0);
                mzc = fe_from_vec(
                  cmul(capF - cmul(mcF, de) - cmul(phiF, cdpF), invDen)
                    - cmul(mzF, cmul(cmul(cdpF, dzF), invDen)),
                  0,
                );
              }
            }
          } else {
            let ca = jet_coeff_fe(mandelbrotJetSuite[base]);
            let cb = jet_coeff_fe(mandelbrotJetSuite[base + 1]);
            if (tag == 0) {
              phi = fe_add(fe_cmul(ca, *dz), fe_cmul(cb, dc));
              pdz = ca;
              pdc = cb;
            } else if (tag <= 2) {
              let cd = jet_coeff_fe(mandelbrotJetSuite[base + 2]);
              var ae = ca;
              var de = cd;
              var cap = fe(vec2<f32>(0.0), 0);
              var cdp = fe(vec2<f32>(0.0), 0);
              if (tag == 2) {
                cap = jet_coeff_fe(mandelbrotJetSuite[base + 3]);
                cdp = jet_coeff_fe(mandelbrotJetSuite[base + 4]);
                ae = fe_add(ca, fe_cmul(cap, dc));
                de = fe_add(cd, fe_cmul(cdp, dc));
              }
              let den = fe_add(fe(vec2<f32>(1.0, 0.0), 0), fe_cmul(de, *dz));
              if (MOBIUS_PARANOIA_GUARD && (den.e < -10 || (den.e < 5 && fe_mag2_f32(den) < MOBIUS_DEN_GUARD2))) {
                denOk = false;
              } else {
                let invDen = fe_cinv(den);
                phi = fe_cmul(fe_add(fe_cmul(ae, *dz), fe_cmul(cb, dc)), invDen);
                pdz = fe_cmul(fe_add(ae, fe_neg(fe_cmul(phi, de))), invDen);
                if (tag == 2) {
                  pdc = fe_cmul(fe_add3(fe_cmul(cap, *dz), cb, fe_neg(fe_cmul(phi, fe_cmul(cdp, *dz)))), invDen);
                } else {
                  pdc = fe_cmul(cb, invDen);
                }
                mzz = fe_neg(fe_scale(fe_cmul(de, fe_cmul(pdz, invDen)), 2.0));
                mcc = fe_neg(fe_scale(fe_cmul(fe_cmul(cdp, *dz), fe_cmul(pdc, invDen)), 2.0));
                mzc = fe_add(
                  fe_cmul(fe_add3(cap, fe_neg(fe_cmul(pdc, de)), fe_neg(fe_cmul(phi, cdp))), invDen),
                  fe_neg(fe_cmul(pdz, fe_cmul(fe_cmul(cdp, *dz), invDen))),
                );
              }
            } else {
              // Jet tier: full 108 B record, identity reconstruction, order-3
              // Horner rows shared by the value and both partials.
              let cd  = jet_coeff_fe(mandelbrotJetSuite[base + 2]);
              let cap = jet_coeff_fe(mandelbrotJetSuite[base + 3]);
              let cdp = jet_coeff_fe(mandelbrotJetSuite[base + 4]);
              let a02 = jet_coeff_fe(mandelbrotJetSuite[base + 5]);
              let a30 = jet_coeff_fe(mandelbrotJetSuite[base + 6]);
              let a12 = jet_coeff_fe(mandelbrotJetSuite[base + 7]);
              let a03 = jet_coeff_fe(mandelbrotJetSuite[base + 8]);
              let a20 = fe_neg(fe_cmul(cd, ca));
              let a11 = fe_add(cap, fe_neg(fe_cmul(cb, cd)));
              let a21 = fe_add(fe_neg(fe_cmul(cdp, ca)), fe_neg(fe_cmul(cd, a11)));
              let p0 = fe_add3(fe_cmul(cb, dc), fe_cmul(a02, dc2), fe_cmul(a03, dc3));
              let p1 = fe_add3(ca, fe_cmul(a11, dc), fe_cmul(a12, dc2));
              let p2 = fe_add(a20, fe_cmul(a21, dc));
              phi = fe_add(p0, fe_cmul(*dz, fe_add(p1, fe_cmul(*dz, fe_add(p2, fe_cmul(*dz, a30))))));
              pdz = fe_add(p1, fe_cmul(*dz, fe_add(fe_scale(p2, 2.0), fe_cmul(*dz, fe_scale(a30, 3.0)))));
              let q0 = fe_add3(cb, fe_scale(fe_cmul(a02, dc), 2.0), fe_scale(fe_cmul(a03, dc2), 3.0));
              let q1 = fe_add(a11, fe_scale(fe_cmul(a12, dc), 2.0));
              pdc = fe_add(q0, fe_cmul(*dz, fe_add(q1, fe_cmul(*dz, a21))));
              mzz = fe_add(fe_scale(p2, 2.0), fe_scale(fe_cmul(a30, *dz), 6.0));
              mzc = fe_add(q1, fe_scale(fe_cmul(a21, *dz), 2.0));
              mcc = fe_add3(fe_scale(a02, 2.0), fe_scale(fe_cmul(a03, dc), 6.0), fe_scale(fe_cmul(a12, *dz), 2.0));
            }
          }
          if (denOk) {
            let candidateZ = getOrbit(*ref_i + skip) + fe_to_vec(phi);
            // Do not jump over the first escape (same rule as the BLA paths).
            if (!(skip > 1 && dot(candidateZ, candidateZ) > bailout)) {
              // Tier counters: LITERAL indices via branchless selects — a
              // dynamic-index write (g_tierApps[tag]) is silently dropped on
              // the Metal backend inside this non-uniform loop (observed in
              // the field: 24M successes, zero counted).
              g_tierApps[0] += select(0u, 1u, tag == 0);
              g_tierApps[1] += select(0u, 1u, tag == 1);
              g_tierApps[2] += select(0u, 1u, tag == 2);
              g_tierApps[3] += select(0u, 1u, tag == 3);
              // Phase D: z″ tier update in the OLD 2\xb7derS scale (needs the
              // OLD derM); rescaled by the measured der-scale shift after the
              // der update below. Saturated folds only degrade the AA margin
              // (frontier fallback), never the value channel.
              let sOld = *derS + *derSLo;
              let sndNew = ldexp(cmul(mzz.m, cmul(*derM, *derM)), vec2<i32>(clamp(mzz.e, -126, 126)))
                + ldexp(cmul(pdz.m, *snd), vec2<i32>(clamp(pdz.e, -126, 126)))
                + 2.0 * cmul(mzc.m, *derM) * exp(clamp(f32(mzc.e) * LN2 - sOld, -80.0, 80.0))
                + mcc.m * exp(clamp(f32(mcc.e) * LN2 - 2.0 * sOld, -80.0, 80.0));
              *dz = phi;
              *zOut = candidateZ;
              // der' = ∂m/∂z\xb7der + ∂m/∂c, with the (#3) exponent-fold
              // discipline shared with the jet/mobius paths.
              if (abs(pdz.e) <= JET_DER_EXP_FOLD) {
                *derM = ldexp(cmul(*derM, pdz.m), vec2<i32>(pdz.e))
                      + pdc.m * exp(clamp(f32(pdc.e) * LN2 - (*derS + *derSLo), -80.0, 80.0));
              } else {
                *derM = cmul(*derM, pdz.m);
                der_scale_add(derS, derSLo, f32(pdz.e) * LN2);
                *derM = *derM + pdc.m * exp(clamp(f32(pdc.e) * LN2 - (*derS + *derSLo), -80.0, 80.0));
                der_refresh_cache(derM, derS, derSLo, derInvScale, epsThreshold, logEpsilon);
              }
              *snd = sndNew * exp(clamp(-2.0 * ((*derS + *derSLo) - sOld), -80.0, 80.0));
              *ref_i += skip;
              *hint = level; // (#5) seed next turn's descent
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
// ── interior/periodic verdict (Phase E, design D8, findings \xa717) ─────────────
fn fe_csqrt(a: fe) -> fe {
  var m = a.m;
  var e = a.e;
  if ((e & 1) != 0) {
    m = m * 2.0;
    e = e - 1;
  }
  let r = length(m);
  let re = sqrt(max(0.5 * (r + m.x), 0.0));
  var im = sqrt(max(0.5 * (r - m.x), 0.0));
  if (m.y < 0.0) {
    im = -im;
  }
  return fe_renorm(fe(vec2<f32>(re, im), e / 2));
}

// Certified interiority attempt at a periodic phase point. The period block
// Φ_p (sidecar header entries hdrBase+4..8, c+ form) is a FIXED M\xf6bius map of
// the delta for this pixel's dc: fixed points ζ\xb1 from De\xb7δ\xb2 + (1−Ae)\xb7δ − Bc =
// 0, multiplier κ = (Ae − Bc\xb7De)/(1+De\xb7ζ)\xb2. TRUE ⇒ provably interior: |κ| < 
// 0.98 (κ is the pixel's own cycle multiplier, certified to ~1e-4 by the
// block radius), |w₀| = |(δ−ζa)/(δ−ζr)| < 0.5 (well inside the basin), and
// the whole contraction path stays inside the certified radius
// (max(|ζa|, |δ−ζa|)\xb72 ≤ r ⇒ |δ_j| ≤ |ζa| + |δ−ζa| ≤ r for all j).
fn try_periodic_interior(hdrBase: i32, dz: fe, dc: fe, rLog2: f32) -> bool {
  let log2_dz = log2(max(length(dz.m), 1e-30)) + f32(dz.e);
  if (!(log2_dz < rLog2)) {
    return false;
  }
  let hA = mandelbrotJetRadii[hdrBase + 4].v;
  let hB = mandelbrotJetRadii[hdrBase + 5].v;
  let hD = mandelbrotJetRadii[hdrBase + 6].v;
  let hAp = mandelbrotJetRadii[hdrBase + 7].v;
  let hDp = mandelbrotJetRadii[hdrBase + 8].v;
  let cA = fe(vec2<f32>(hA.x, hA.y), i32(hA.z));
  let cB = fe(vec2<f32>(hB.x, hB.y), i32(hB.z));
  let cD = fe(vec2<f32>(hD.x, hD.y), i32(hD.z));
  let cAp = fe(vec2<f32>(hAp.x, hAp.y), i32(hAp.z));
  let cDp = fe(vec2<f32>(hDp.x, hDp.y), i32(hDp.z));
  let ae = fe_add(cA, fe_cmul(cAp, dc));
  let de = fe_add(cD, fe_cmul(cDp, dc));
  let bc = fe_cmul(cB, dc);
  if (length(de.m) < 1e-20) {
    return false; // degenerate quadratic — no certified verdict
  }
  let one = fe(vec2<f32>(1.0, 0.0), 0);
  let oneMinusAe = fe_add(one, fe_neg(ae));
  let disc = fe_add(fe_cmul(oneMinusAe, oneMinusAe), fe_scale(fe_cmul(de, bc), 4.0));
  let sq = fe_csqrt(disc);
  let inv2De = fe_cinv(fe_scale(de, 2.0));
  let negOmA = fe_neg(oneMinusAe); // Ae − 1
  let z1 = fe_cmul(fe_add(negOmA, sq), inv2De);
  let z2 = fe_cmul(fe_add(negOmA, fe_neg(sq)), inv2De);
  let num = fe_add(ae, fe_neg(fe_cmul(bc, de)));
  let d1 = fe_add(one, fe_cmul(de, z1));
  let k1 = fe_cmul(num, fe_cinv(fe_cmul(d1, d1)));
  let d2 = fe_add(one, fe_cmul(de, z2));
  let k2 = fe_cmul(num, fe_cinv(fe_cmul(d2, d2)));
  let l2k1 = log2(max(length(k1.m), 1e-30)) + f32(k1.e);
  let l2k2 = log2(max(length(k2.m), 1e-30)) + f32(k2.e);
  var za = z1;
  var zr = z2;
  var l2ka = l2k1;
  if (l2k2 < l2k1) {
    za = z2;
    zr = z1;
    l2ka = l2k2;
  }
  if (!(l2ka < -0.03)) {
    return false; // not attracting with margin (|κ| ≥ ~0.98)
  }
  let dza = fe_add(dz, fe_neg(za));
  let dzr = fe_add(dz, fe_neg(zr));
  if (length(dzr.m) < 1e-20) {
    return false;
  }
  let w0 = fe_cmul(dza, fe_cinv(dzr));
  let l2w = log2(max(length(w0.m), 1e-30)) + f32(w0.e);
  if (!(l2w < -1.0)) {
    return false; // outside the safe basin margin (|w₀| ≥ 0.5)
  }
  let l2za = log2(max(length(za.m), 1e-30)) + f32(za.e);
  let l2dza = log2(max(length(dza.m), 1e-30)) + f32(dza.e);
  if (!(max(l2za, l2dza) + 1.0 < rLog2)) {
    return false; // contraction path not provably inside the radius
  }
  return true;
}

fn mandelbrot_compute_deep(dc: fe, prev_iter: f32, prev_dz_m: vec2<f32>, prev_dz_e: i32, prev_ref_i_int: i32, prev_derx: f32, prev_dery: f32, prev_ders: f32, prev_sndx: f32, prev_sndy: f32) -> TexelOut {
  let max_iteration = mandelbrot.maxIteration;
  let muLimit = mandelbrot.mu;
  let logEpsilon = log(max(mandelbrot.epsilon, 1e-30));
  let globalMaxIterI = i32(mandelbrot.globalMaxIter);
  let scaleExp = i32(mandelbrot.scaleExp);

  var i: f32 = 0.0;
  var dz = fe_renorm(fe(prev_dz_m, prev_dz_e));
  var ref_i = prev_ref_i_int;
  var refZ = getOrbit(ref_i); // carried orbit value (see mandelbrot_compute)
  var z = refZ + fe_to_vec(dz);

  // Derivative state der = derM \xb7 exp(derS), carried RAW across pass
  // boundaries (layers 4/5/8) — see mandelbrot_compute. Fresh pixels pass
  // (0, 0, 0).
  var derM = vec2<f32>(prev_derx, prev_dery);
  var derS: f32 = prev_ders;
  // Compensation term of the derS two-sum pair — register-only, reset each
  // pass (the stored derS is the collapsed hi + lo).
  var derSLo: f32 = 0.0;
  // Phase D: z″ mantissa (scale TIED to 2\xb7derS). Tracked in unified mode; a
  // saturated/garbage value only downgrades the pixel to real re-iteration at
  // AA time (margin test), never corrupts the value channel.
  var sndM = vec2<f32>(prev_sndx, prev_sndy);
  var derInvScale = 0.0;
  var epsThreshold = 0.0;
  der_refresh_cache(&derM, &derS, &derSLo, &derInvScale, &epsThreshold, logEpsilon);

  var escaped = false;
  var inside = false;
  var shadingHeight = 0.0;
  var shadingAngle = 0.0;

  // Affine BLA and Pad\xe9 share try_apply_bla_deep (mode ≥ 1.5 branches to
  // Pad\xe9); jet (3) and M\xf6bius-c+ (4) use the shared jet buffers and their own
  // try_apply_*.
  let isUnifiedDeep = mandelbrot.approximationMode >= 4.5;
  let isMobiusDeep = mandelbrot.approximationMode >= 3.5 && !isUnifiedDeep;
  let isJetDeep = mandelbrot.approximationMode >= 2.5 && !isMobiusDeep && !isUnifiedDeep;
  let isBlockTableDeep = isJetDeep || isMobiusDeep || isUnifiedDeep;
  let useBlaDeep = mandelbrot.blaLevelCount >= 1.0 && mandelbrot.orbitComplete >= 0.5;
  var skip0Log = 0;
  var log_dcMag = 0.0;
  if (useBlaDeep) {
    if (isBlockTableDeep) {
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
  if (useBlaDeep && isBlockTableDeep) {
    if (isJetDeep || isUnifiedDeep) {
      dcDeep2 = fe_cmul(dc, dc);
      dcDeep3 = fe_cmul(dcDeep2, dc);
    }
    // Global fast-reject bound (see the shallow loop's jetMaxR3).
    for (var l = 0; l < min(i32(mandelbrot.blaLevelCount), JET_MAX_LEVELS); l++) {
      let r = mandelbrotJetLevels[l].maxR3;
      jetLvlR3Deep[l] = r;
      jetMaxR3Deep = max(jetMaxR3Deep, r);
    }
  }
  var jetLevelHintDeep = JET_MAX_LEVELS; // (#5) per-pixel level hint
  var usedBla = false;
  // Phase E periodic-interior state (see the shallow loop).
  var perP = 0;
  var perStart = 0;
  var perNext = 2147483647;
  var perR = -3.0e38;
  var perHdr = 0;
  if (isUnifiedDeep && useBlaDeep) {
    let lastLvl = mandelbrotJetLevels[i32(mandelbrot.blaLevelCount) - 1];
    perHdr = i32(lastLvl.offset + lastLvl.count);
    perStart = i32(mandelbrotJetRadii[perHdr + 4].v.w);
    perP = i32(mandelbrotJetRadii[perHdr + 5].v.w);
    perR = mandelbrotJetRadii[perHdr + 6].v.w;
    if (perP > 0) {
      perNext = perStart;
    }
  }

  while (g_workSteps < u32(max_iteration) && ref_i < globalMaxIterI) {
    g_workSteps += 1u;
    if (perP > 0 && ref_i >= perNext) {
      let k = (ref_i - perStart + perP - 1) / perP;
      let aligned = perStart + k * perP;
      if (ref_i == aligned) {
        perNext = aligned + perP;
        if (try_periodic_interior(perHdr, dz, dc, perR)) {
          inside = true;
          break;
        }
      } else {
        perNext = aligned;
      }
    }
    var skipped = 0;
    if (useBlaDeep) {
      var blaZ = vec2<f32>(0.0);
      if (isBlockTableDeep) {
        if (log2(max(length(dz.m), 1e-30)) + f32(dz.e) < jetMaxR3Deep) {
          if (isUnifiedDeep) {
            skipped = try_apply_unified(&ref_i, &dz, &derM, &derS, &derSLo, &derInvScale, &epsThreshold, logEpsilon, &blaZ, dc, dcDeep2, dcDeep3, muLimit, skip0Log, globalMaxIterI, &jetLvlR3Deep, vec2<f32>(0.0), false, &jetLevelHintDeep, &sndM);
          } else if (isMobiusDeep) {
            skipped = try_apply_mobius(&ref_i, &dz, &derM, &derS, &derSLo, &derInvScale, &epsThreshold, logEpsilon, &blaZ, dc, muLimit, skip0Log, globalMaxIterI, &jetLvlR3Deep, vec2<f32>(0.0), false, &jetLevelHintDeep);
          } else {
            skipped = try_apply_jet(&ref_i, &dz, &derM, &derS, &derSLo, &derInvScale, &epsThreshold, logEpsilon, &blaZ, dc, dcDeep2, dcDeep3, muLimit, skip0Log, globalMaxIterI, &jetLvlR3Deep, vec2<f32>(0.0), vec2<f32>(0.0), vec2<f32>(0.0), false, &jetLevelHintDeep);
          }
        }
      } else {
        skipped = try_apply_bla_deep(&ref_i, &dz, &derM, &derS, &derSLo, &derInvScale, &epsThreshold, logEpsilon, &blaZ, dc, log_dcMag, muLimit, skip0Log, globalMaxIterI);
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
      // dz' = 2\xb7z_n\xb7dz + dz\xb2 + dc   (z_n = refZ is O(1) f32)
      dz = fe_add3(fe_cmul_f32(2.0 * refZ, dz), fe_cmul(dz, dz), dc);
      ref_i += 1;
      refZ = getOrbit(ref_i);
      z = refZ + fe_to_vec(dz);
      if (isUnifiedDeep) {
        sndM = 2.0 * (cmul(derM, derM) + cmul(zPrev, sndM));
      }
      derM = 2.0 * cmul(zPrev, derM) + vec2<f32>(derInvScale, 0.0);
      i += 1.0;
    }

    let derMM = dot(derM, derM);
    let dot_z = dot(z, z);
    if (dot_z > muLimit) {
      let derPolar = der_to_polar(derM, derS + derSLo);
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
      let sBefore = derS + derSLo;
      der_renormalize(&derM, &derS, &derSLo, &derInvScale, &epsThreshold, logEpsilon);
      if (isUnifiedDeep) {
        sndM = sndM * exp(clamp(-2.0 * ((derS + derSLo) - sBefore), -80.0, 80.0));
      }
    }

    if (dot_z < fe_mag2_f32(dz) || ref_i == globalMaxIterI) {
      dz = fe_from_vec(z, 0);
      ref_i = 0;
      refZ = getOrbit(0);
    }
  }

  var out: TexelOut;
  let derPolarOut = der_to_polar(derM, derS + derSLo);

  if (inside) {
    out.iter      = pack(0.0);
    out.genuine   = pack(1.0);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(derPolarOut.x);
    out.dzy       = pack(derPolarOut.y);
    out.ref_i     = pack(ref_i_with_stripe(prev_iter + i, 0.0));
    out.avgDirection = pack(0.0);
    out.derS      = pack(0.0); // finished — layer 8 dead
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
    // Phase D Taylor payload (escaped) — see the shallow exit.
    out.derS      = pack(derS + derSLo);
    out.aa9       = pack(derM.x);
    out.aa10      = pack(derM.y);
    out.aa11      = pack(sndM.x);
    out.aa12      = pack(sndM.y);
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
    out.derS      = pack(0.0); // finished — layer 8 dead
    return out;
  }

  // Budget exhausted mid-progress: park dz as normalized mantissa in zx/zy
  // (|m|\xb2 < 2 < mu keeps the continuation test valid) + exponent in
  // avgDirection, and the derivative RAW in layers 4/5/8 (lossless boundary).
  let dzN = fe_renorm(dz);
  out.iter      = pack(total_iter);
  out.genuine   = pack(1.0);
  out.zx        = pack(dzN.m.x);
  out.zy        = pack(dzN.m.y);
  out.dzx       = pack(derM.x);
  out.dzy       = pack(derM.y);
  out.ref_i     = pack(ref_i_with_stripe(f32(ref_i), 0.0));
  out.avgDirection = pack(f32(dzN.e));
  out.derS      = pack(derS + derSLo);
  out.aa9       = pack(sndM.x);
  out.aa10      = pack(sndM.y);
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
// Work-instrumentation partials (reduced once per workgroup, like the counters).
var<workgroup> wgRealSum: atomic<u32>;  // Σ real loop steps over this workgroup's texels
var<workgroup> wgRealMax: atomic<u32>;  // max real loop steps among them (straggler)
var<workgroup> wgCovSum: atomic<u32>;   // Σ covered iterations over them
var<workgroup> wgTier: array<atomic<u32>, 4>; // Σ tier applications (auto mode)

@compute @workgroup_size(8, 8)
fn cs_main(
  @builtin(global_invocation_id) gid: vec3<u32>,
  @builtin(local_invocation_index) lidx: u32,
) {
  if (lidx == 0u) {
    atomicStore(&wgCount, 0u);
    atomicStore(&wgActive, 0u);
    atomicStore(&wgRealSum, 0u);
    atomicStore(&wgRealMax, 0u);
    atomicStore(&wgCovSum, 0u);
    for (var t = 0; t < 4; t++) {
      atomicStore(&wgTier[t], 0u);
    }
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
          // Work instrumentation: count this texel's real loop steps and the
          // iterations it covers this dispatch (covered base = prior iter, or 0
          // for a fresh compute request).
          g_workSteps = 0u;
          g_tierApps = array<u32, 4>(0u, 0u, 0u, 0u);
          let startIter = select(iter_val, 0.0, is_compute_request);
          let neutralExtent = sqrt(mandelbrot.aspect * mandelbrot.aspect + 1.0);
          // AA sub-pixel jitter (neutral-space units); zero for sample 0 / AA off.
          let local_rot = xy_neutral * neutralExtent + vec2<f32>(mandelbrot.aaOffsetX, mandelbrot.aaOffsetY);

          var result: TexelOut;
          let scaleExp = i32(mandelbrot.scaleExp);
          if (ENABLE_DEEP && scaleExp <= DEEP_EXP) {
            // Deep path: scale/cx/cy carry fe mantissas sharing exponent scaleExp;
            // dc = local\xb7scaleMant + (cxMant, cyMant) is a single same-exponent add.
            let dc = fe_renorm(fe(local_rot * mandelbrot.scale + vec2<f32>(mandelbrot.cx, mandelbrot.cy), scaleExp));
            if (is_compute_request) {
              // Certified SA prefix (Phase C, auto mode): the sidecar carries a
              // 4-entry header after the block records (base = last directory
              // entry's offset+count) — b1..b4 + n0. Start the pixel at n = n0
              // with δ = Σ b_j\xb7dc^j and ∂δ/∂c = Σ j\xb7b_j\xb7dc^(j−1), entering
              // mandelbrot_compute_deep through its CONTINUATION parameters
              // (no changes inside the iteration function). n0 = 0 (shallow
              // c_max, non-auto modes, dead profile) degenerates to the plain
              // fresh start. The build's no-early-escape guard (|Z|+ρ ≤ 1.9
              // over the prefix) certifies no escape is jumped.
              var saIter = 0.0;
              var saDz = vec2<f32>(0.0);
              var saDzE = 0;
              var saRef = 0;
              var saDerx = 0.0;
              var saDery = 0.0;
              var saDers = 0.0;
              var saSndx = 0.0;
              var saSndy = 0.0;
              if (mandelbrot.approximationMode >= 4.5 && mandelbrot.blaLevelCount >= 1.0 && mandelbrot.orbitComplete >= 0.5) {
                let lastLvl = mandelbrotJetLevels[i32(mandelbrot.blaLevelCount) - 1];
                let saBase = i32(lastLvl.offset + lastLvl.count);
                let h0 = mandelbrotJetRadii[saBase].v;
                let n0 = i32(h0.w);
                if (n0 > 0 && f32(n0) < mandelbrot.maxIteration) {
                  let b1 = fe(vec2<f32>(h0.x, h0.y), i32(h0.z));
                  let h1 = mandelbrotJetRadii[saBase + 1].v;
                  let b2 = fe(vec2<f32>(h1.x, h1.y), i32(h1.z));
                  let h2 = mandelbrotJetRadii[saBase + 2].v;
                  let b3 = fe(vec2<f32>(h2.x, h2.y), i32(h2.z));
                  let h3 = mandelbrotJetRadii[saBase + 3].v;
                  let b4 = fe(vec2<f32>(h3.x, h3.y), i32(h3.z));
                  let v = fe_cmul(fe_add(fe_cmul(fe_add(fe_cmul(fe_add(fe_cmul(b4, dc), b3), dc), b2), dc), b1), dc);
                  let d = fe_add(fe_cmul(fe_add(fe_cmul(fe_add(fe_cmul(fe_scale(b4, 4.0), dc), fe_scale(b3, 3.0)), dc), fe_scale(b2, 2.0)), dc), b1);
                  let vr = fe_renorm(v);
                  let dr = fe_renorm(d);
                  saIter = f32(n0);
                  saDz = vr.m;
                  saDzE = vr.e;
                  saRef = n0;
                  saDerx = dr.m.x;
                  saDery = dr.m.y;
                  saDers = f32(dr.e) * LN2;
                  // Phase D: z″ seed ∂\xb2(SA)/∂c\xb2 = 2b₂ + 6b₃\xb7dc + 12b₄\xb7dc\xb2,
                  // expressed in the 2\xb7derS-tied mantissa convention.
                  let sd = fe_renorm(fe_add(fe_scale(b2, 2.0), fe_cmul(dc, fe_add(fe_scale(b3, 6.0), fe_cmul(fe_scale(b4, 12.0), dc)))));
                  let sndScale = exp(clamp(f32(sd.e) * LN2 - 2.0 * saDers, -80.0, 80.0));
                  saSndx = sd.m.x * sndScale;
                  saSndy = sd.m.y * sndScale;
                }
              }
              result = mandelbrot_compute_deep(dc, saIter, saDz, saDzE, saRef, saDerx, saDery, saDers, saSndx, saSndy);
            } else {
              // Deep continuation: layers 2/3 hold the dz mantissa, layer 7 its
              // exponent; layers 4/5/8 the raw derivative (derM.x, derM.y, derS).
              let dz_e = i32(loadLayer(coord, 7));
              let stored_derx = loadLayer(coord, 4);
              let stored_dery = loadLayer(coord, 5);
              let stored_ders = loadLayer(coord, 8);
              let prev_ref_i = decode_ref_i(loadLayer(coord, 6));
              // Phase D: z″ mantissa rides layers 9/10 (0 on 9-layer allocs).
              result = mandelbrot_compute_deep(dc, iter_val, vec2<f32>(zx, zy), dz_e, prev_ref_i, stored_derx, stored_dery, stored_ders, loadLayer(coord, 9), loadLayer(coord, 10));
            }
          } else {
            let x0 = local_rot.x * mandelbrot.scale + mandelbrot.cx;
            let y0 = local_rot.y * mandelbrot.scale + mandelbrot.cy;
            if (is_compute_request) {
              result = mandelbrot_compute(x0, y0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
            } else {
              // Continuation: layers 4/5/8 hold the raw derivative registers.
              let stored_derx = loadLayer(coord, 4);
              let stored_dery = loadLayer(coord, 5);
              let stored_ders = loadLayer(coord, 8);
              let prev_ref_i = loadLayer(coord, 6);
              let prev_avg_direction = loadLayer(coord, 7);
              result = mandelbrot_compute(x0, y0, iter_val, zx, zy, stored_derx, stored_dery, stored_ders, prev_ref_i, prev_avg_direction, loadLayer(coord, 9), loadLayer(coord, 10));
            }
          }
          storeTexel(coord, result);

          // Accumulate work metrics for this texel into the workgroup partials.
          let realSteps = g_workSteps;
          let covered = u32(max(0.0, result.iter.r - startIter));
          atomicAdd(&wgRealSum, realSteps);
          atomicMax(&wgRealMax, realSteps);
          atomicAdd(&wgCovSum, covered);
          for (var t = 0; t < 4; t++) {
            atomicAdd(&wgTier[t], g_tierApps[t]);
          }

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
    // Work-instrumentation reduction. Downscale the per-workgroup sums by 64
    // (via >>6, rounded) so the global u32 accumulators can't overflow; the
    // ratio metrics cancel the scale. maxAccum/realMean = lane-time / useful
    // work (workgroup lockstep waste); covMean/realMean = realized skip;
    // maxSteps = worst single-texel straggler. The absolute Total-apps count
    // recovers Σ g_workSteps as realMean << 6.
    let rs = atomicLoad(&wgRealSum);
    let rm = atomicLoad(&wgRealMax);
    let cv = atomicLoad(&wgCovSum);
    if (rm > 0u) {
      atomicAdd(&workStats.realMean, (rs + 32u) >> 6u);
      atomicAdd(&workStats.covMean, (cv + 32u) >> 6u);
      atomicAdd(&workStats.maxAccum, rm);
      atomicMax(&workStats.maxSteps, rm);
      // Tier counters flush RAW (no >>6): they count BLOCK applications only
      // (small per-workgroup-per-dispatch — the downscale rounded typical
      // 1-10 app flushes to ZERO), and their session totals stay far under
      // u32 even on heavy renders, unlike the loop-turn accumulators above.
      atomicAdd(&workStats.tierAff, atomicLoad(&wgTier[0]));
      atomicAdd(&workStats.tierPade, atomicLoad(&wgTier[1]));
      atomicAdd(&workStats.tierCplus, atomicLoad(&wgTier[2]));
      atomicAdd(&workStats.tierJet, atomicLoad(&wgTier[3]));
    }
  }
}
`,Nr=`// Block-skipping DEBUG view (separate diagnostic pipeline).
//
// Recomputes every pixel from scratch in ONE pass, fully instrumented, and
// outputs a color directly to the swapchain — zero interaction with the
// progressive state machine. Everything runs on the floatexp path regardless
// of depth (correct at any scale; debug snapshots don't need shallow-path
// speed). The metric is selected by mandelbrot.debugView (the recycled
// iterationOffset uniform slot):
//   1 "cost"    — heat: loop turns per pixel (log scale). Where wall-clock goes.
//   2 "skip"    — hue: average applied block length (covered iters / turns).
//   3 "mix"     — RGB: fraction of iterations advanced by exact steps (R),
//                 linear/affine-order applications (G), higher-order (B).
//                 jet: G = order 1, B = orders 2-3. Pad\xe9: B. BLA: G.
//   4 "probes"  — heat: table probes per loop turn (lookup overhead — this is
//                 the one that shows a dead/ill-fitting table burning time).

struct MandelbrotStep { zx: f32, zy: f32 };

struct Mandelbrot {
  cx: f32, cy: f32, mu: f32, scale: f32,
  aspect: f32, angle: f32,
  maxIteration: f32, epsilon: f32,
  antialiasLevel: f32,
  debugView: f32,        // = iterationOffset slot in the shared uniform
  globalMaxIter: f32, orbitComplete: f32,
  approximationMode: f32, blaLevelCount: f32, blaEpsilon: f32,
  stripeFrequency: f32, trackOrbitMetrics: f32,
  scaleExp: f32, aaOffsetX: f32, aaOffsetY: f32,
};

struct BlaStep {
  ax: f32, ay: f32, bx: f32, by: f32, ab_exp: i32,
  radius_alpha: f32, alpha_exp: i32, radius_beta: f32,
  dx: f32, dy: f32, d_exp: i32, log2_min_a: f32,
};
struct BlaLevel { offset: u32, count: u32, skip: u32, maxRadius: f32 };
struct JetCoeff { x: f32, y: f32, e: i32 };
// Radii split into their own buffer ("le buffer de rayons"), vec4-packed
// (x=r1, y=r2, z=r3, w=pad: one coalesced 16 B load per probe); coefficients
// read only on apply. Same flat block index.
struct JetRadii { v: vec4<f32> };
// Flat coefficient buffer shared by jet (stride 9) and M\xf6bius-c+ (stride 5,
// order A, B, A', D, D') — exclusive modes, identical 12 B element.
const JET_COEFF_STRIDE: i32 = 9;
const MOBIUS_COEFF_STRIDE: i32 = 5;
// Unified table (mode 5): 9 elements in PREFIX order [A, B, D, A', D', a02,
// a30, a12, a03] — tier-directed prefix reads (production parity).
const UNIFIED_COEFF_STRIDE: i32 = 9;
// Register budget for the hoisted per-level maxR3 gates (production parity).
const JET_MAX_LEVELS = 32;
// (#5) Level hint start margin (production parity).
const JET_LEVEL_HINT_UP: i32 = 2;
struct JetLevel { offset: u32, count: u32, skip: u32, maxR3: f32 };

@group(0) @binding(0) var<uniform> mandelbrot: Mandelbrot;
@group(0) @binding(1) var<storage, read> mandelbrotOrbitPointSuite: array<MandelbrotStep>;
@group(0) @binding(2) var<storage, read> mandelbrotBlaSuite: array<BlaStep>;
@group(0) @binding(3) var<storage, read> mandelbrotBlaLevels: array<BlaLevel>;
@group(0) @binding(5) var<storage, read> mandelbrotJetSuite: array<JetCoeff>;
@group(0) @binding(6) var<storage, read> mandelbrotJetLevels: array<JetLevel>;
@group(0) @binding(7) var<storage, read> mandelbrotJetRadii: array<JetRadii>;

const DEEP_EXP: i32 = -100;
const LN2: f32 = 0.6931471805599453;
const PADE_POLE2: f32 = 1e-4;
// Hard turn budget: a debug snapshot must never TDR the GPU.
const DEBUG_TURN_CAP: u32 = 100000u;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) VertexIndex: u32) -> VertexOutput {
  var pos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0), vec2<f32>(-1.0, 1.0),
    vec2<f32>(-1.0, 1.0), vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0));
  var out: VertexOutput;
  out.position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
  out.uv = (pos[VertexIndex] + vec2<f32>(1.0, 1.0)) * 0.5;
  return out;
}

fn cinv(z: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(z.x, -z.y) / dot(z, z);
}

fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

struct fe { m: vec2<f32>, e: i32 };
const FE_ZERO_E: i32 = -1000000;

fn fe_renorm(v: fe) -> fe {
  let a = max(abs(v.m.x), abs(v.m.y));
  if (!(a > 0.0)) { return fe(vec2<f32>(0.0, 0.0), FE_ZERO_E); }
  let r = frexp(a);
  return fe(ldexp(v.m, vec2<i32>(-r.exp, -r.exp)), v.e + r.exp);
}
fn fe_from_vec(v: vec2<f32>, e: i32) -> fe { return fe_renorm(fe(v, e)); }
fn fe_to_vec(v: fe) -> vec2<f32> { return ldexp(v.m, vec2<i32>(v.e, v.e)); }
fn fe_cmul(a: fe, b: fe) -> fe { return fe_renorm(fe(cmul(a.m, b.m), a.e + b.e)); }
fn fe_cmul_f32(zf: vec2<f32>, b: fe) -> fe { return fe_renorm(fe(cmul(zf, b.m), b.e)); }
fn fe_cinv(z: fe) -> fe {
  let d = dot(z.m, z.m);
  return fe_renorm(fe(vec2<f32>(z.m.x, -z.m.y) / d, -z.e));
}
fn fe_add(a: fe, b: fe) -> fe {
  let d = a.e - b.e;
  if (d > 24) { return a; }
  if (d < -24) { return b; }
  if (d >= 0) { return fe_renorm(fe(a.m + ldexp(b.m, vec2<i32>(-d, -d)), a.e)); }
  return fe_renorm(fe(ldexp(a.m, vec2<i32>(d, d)) + b.m, b.e));
}
fn fe_add3(a: fe, b: fe, c: fe) -> fe { return fe_add(fe_add(a, b), c); }
fn fe_neg(a: fe) -> fe { return fe(-a.m, a.e); }
fn fe_mag2_f32(v: fe) -> f32 { return ldexp(dot(v.m, v.m), 2 * v.e); }
fn fe_log2(v: fe) -> f32 { return log2(max(length(v.m), 1e-30)) + f32(v.e); }

fn getOrbit(index: i32) -> vec2<f32> {
  return vec2<f32>(mandelbrotOrbitPointSuite[index].zx, mandelbrotOrbitPointSuite[index].zy);
}

fn jet_coeff_fe(c: JetCoeff) -> fe { return fe_renorm(fe(vec2<f32>(c.x, c.y), c.e)); }

// ── instrumented skip attempts (no derivative tracking) ────────────
// order out-param: 1 = affine/linear, 2 = rational/mid, 3 = high.
// probes counts level-directory + block-record inspections.

fn dbg_try_bla(ref_i: ptr<function, i32>, dz: ptr<function, fe>, dc: fe, log_dcMag: f32, maxIterI: i32, skip0Log: i32, order: ptr<function, i32>, probes: ptr<function, u32>) -> i32 {
  if (*ref_i <= 0) { return 0; }
  let log_dz = log(max(length((*dz).m), 1e-30)) + f32((*dz).e) * LN2;
  let log2_mu = 0.5 * (log_dcMag - log(max(mandelbrot.blaEpsilon, 1e-30))) / LN2;
  let shiftedRef = *ref_i - 1;
  var level = min(i32(mandelbrot.blaLevelCount) - 1, i32(countTrailingZeros(u32(shiftedRef))) - skip0Log);
  let isPade = mandelbrot.approximationMode >= 1.5;
  while (level >= 0) {
    *probes = *probes + 1u;
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
            let num = fe_add(fe_cmul(a, *dz), fe_cmul(b, dc));
            if (isPade) {
              let d = fe(vec2<f32>(bla.dx, bla.dy), bla.d_exp);
              let m = fe_add(fe(vec2<f32>(1.0, 0.0), 0), fe_cmul(d, *dz));
              let log_bDc = log(max(length(b.m), 1e-30)) + f32(b.e) * LN2 + log_dcMag;
              if (log_bDc < log(max(mandelbrot.blaEpsilon, 1e-30)) && bla.log2_min_a >= log2_mu && fe_mag2_f32(m) >= PADE_POLE2) {
                let candidate = fe_cmul(num, fe_cinv(m));
                let candidateZ = getOrbit(*ref_i + skip) + fe_to_vec(candidate);
                if (!(skip > 1 && dot(candidateZ, candidateZ) > 4.0)) {
                  *dz = candidate;
                  *ref_i += skip;
                  *order = 2;
                  return skip;
                }
              }
            } else {
              let candidateZ = getOrbit(*ref_i + skip) + fe_to_vec(num);
              if (!(skip > 1 && dot(candidateZ, candidateZ) > 4.0)) {
                *dz = num;
                *ref_i += skip;
                *order = 1;
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

// ldexp-exact f32 coefficient reconstruction (radii.w-flagged blocks only).
fn jet_coeff_f32(c: JetCoeff) -> vec2<f32> {
  return ldexp(vec2<f32>(c.x, c.y), vec2<i32>(c.e));
}

fn dbg_try_jet(ref_i: ptr<function, i32>, dz: ptr<function, fe>, dc: fe, dc2: fe, dc3: fe, maxIterI: i32, skip0Log: i32, order: ptr<function, i32>, probes: ptr<function, u32>, lvlR3: ptr<function, array<f32, JET_MAX_LEVELS>>, dcF: vec2<f32>, dcF2: vec2<f32>, dcF3: vec2<f32>, f32Ok: bool, hint: ptr<function, i32>) -> i32 {
  if (*ref_i <= 0) { return 0; }
  let log2_dz = fe_log2(*dz);
  let shiftedRef = *ref_i - 1;
  // Alignment cap, then the (#5) hint cap (production parity).
  var level = min(min(i32(mandelbrot.blaLevelCount), JET_MAX_LEVELS) - 1, i32(countTrailingZeros(u32(shiftedRef))) - skip0Log);
  level = min(level, *hint + JET_LEVEL_HINT_UP);
  while (level >= 0) {
    *probes = *probes + 1u;
    // Hoisted gate: a failing level probe reads nothing from memory (skip is
    // recomputed from the power-of-two scaffold, production parity).
    let skip = i32(1u << u32(skip0Log + level));
    if (log2_dz < (*lvlR3)[level] && *ref_i + skip <= maxIterI) {
      let levelInfo = mandelbrotJetLevels[level];
      let slot = shiftedRef >> u32(skip0Log + level);
      if (u32(slot) < levelInfo.count) {
        let entry = i32(levelInfo.offset) + slot;
        // One coalesced 16 B read (coeffs read on apply).
        let radii = mandelbrotJetRadii[entry].v;
        // r3 gates before the order descent.
        if (log2_dz < radii.z) {
          var k = 3;
          if (log2_dz < radii.x) { k = 1; }
          else if (log2_dz < radii.y) { k = 2; }
          var phi: fe;
          if (f32Ok && radii.w > 0.5 && log2_dz > -100.0) {
            // (#4) plain-f32 fast path (production parity).
            let dzF = fe_to_vec(*dz);
            let a10 = jet_coeff_f32(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 0]);
            let a01 = jet_coeff_f32(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 1]);
            var p0 = cmul(a01, dcF);
            var p1 = a10;
            var p2 = vec2<f32>(0.0);
            var p3 = vec2<f32>(0.0);
            if (k >= 2) {
              let a20 = jet_coeff_f32(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 2]);
              let a11 = jet_coeff_f32(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 3]);
              let a02 = jet_coeff_f32(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 4]);
              p0 = p0 + cmul(a02, dcF2);
              p1 = p1 + cmul(a11, dcF);
              p2 = a20;
              if (k >= 3) {
                let a30 = jet_coeff_f32(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 5]);
                let a21 = jet_coeff_f32(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 6]);
                let a12 = jet_coeff_f32(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 7]);
                let a03 = jet_coeff_f32(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 8]);
                p0 = p0 + cmul(a03, dcF3);
                p1 = p1 + cmul(a12, dcF2);
                p2 = p2 + cmul(a21, dcF);
                p3 = a30;
              }
            }
            phi = fe_from_vec(p0 + cmul(p1 + cmul(p2 + cmul(p3, dzF), dzF), dzF), 0);
          } else {
            // Horner in dz with hoisted dc powers (mirrors the production shader).
            let a10 = jet_coeff_fe(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 0]);
            let a01 = jet_coeff_fe(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 1]);
            var p0 = fe_cmul(a01, dc);
            var p1 = a10;
            var p2 = fe(vec2<f32>(0.0, 0.0), FE_ZERO_E);
            var p3 = fe(vec2<f32>(0.0, 0.0), FE_ZERO_E);
            if (k >= 2) {
              let a20 = jet_coeff_fe(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 2]);
              let a11 = jet_coeff_fe(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 3]);
              let a02 = jet_coeff_fe(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 4]);
              p0 = fe_add(p0, fe_cmul(a02, dc2));
              p1 = fe_add(p1, fe_cmul(a11, dc));
              p2 = a20;
              if (k >= 3) {
                let a30 = jet_coeff_fe(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 5]);
                let a21 = jet_coeff_fe(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 6]);
                let a12 = jet_coeff_fe(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 7]);
                let a03 = jet_coeff_fe(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 8]);
                p0 = fe_add(p0, fe_cmul(a03, dc3));
                p1 = fe_add(p1, fe_cmul(a12, dc2));
                p2 = fe_add(p2, fe_cmul(a21, dc));
                p3 = a30;
              }
            }
            phi = fe_add(p0, fe_cmul(fe_add(p1, fe_cmul(fe_add(p2, fe_cmul(p3, *dz)), *dz)), *dz));
          }
          let candidateZ = getOrbit(*ref_i + skip) + fe_to_vec(phi);
          if (!(skip > 1 && dot(candidateZ, candidateZ) > 4.0)) {
            *dz = phi;
            *ref_i += skip;
            *order = min(k, 3);
            *hint = level; // (#5) seed next turn's descent
            return skip;
          }
        }
      }
    }
    level -= 1;
  }
  return 0;
}


// M\xf6bius-c+ probe/apply (production parity with try_apply_mobius, minus the
// derivative update the debug loop does not carry): hoisted level gates,
// 16 B sidecar probe (x = radius, y = f32-safe flag), single comparison,
// inline [1/1] apply with the paranoia denominator guard.
const MOBIUS_PARANOIA_GUARD: bool = true;
const MOBIUS_DEN_GUARD2: f32 = 1e-6;

fn dbg_try_mobius(ref_i: ptr<function, i32>, dz: ptr<function, fe>, dc: fe, maxIterI: i32, skip0Log: i32, order: ptr<function, i32>, probes: ptr<function, u32>, lvlR: ptr<function, array<f32, JET_MAX_LEVELS>>, dcF: vec2<f32>, f32Ok: bool, hint: ptr<function, i32>) -> i32 {
  if (*ref_i <= 0) { return 0; }
  let log2_dz = fe_log2(*dz);
  let shiftedRef = *ref_i - 1;
  var level = min(min(i32(mandelbrot.blaLevelCount), JET_MAX_LEVELS) - 1, i32(countTrailingZeros(u32(shiftedRef))) - skip0Log);
  level = min(level, *hint + JET_LEVEL_HINT_UP);
  while (level >= 0) {
    *probes = *probes + 1u;
    let skip = i32(1u << u32(skip0Log + level));
    if (log2_dz < (*lvlR)[level] && *ref_i + skip <= maxIterI) {
      let levelInfo = mandelbrotJetLevels[level];
      let slot = shiftedRef >> u32(skip0Log + level);
      if (u32(slot) < levelInfo.count) {
        let entry = i32(levelInfo.offset) + slot;
        let radii = mandelbrotJetRadii[entry].v;
        if (log2_dz < radii.x) {
          let base = entry * MOBIUS_COEFF_STRIDE;
          var phi: fe;
          var denOk = true;
          if (f32Ok && radii.y > 0.5 && log2_dz > -100.0) {
            let ca  = jet_coeff_f32(mandelbrotJetSuite[base]);
            let cb  = jet_coeff_f32(mandelbrotJetSuite[base + 1]);
            let cap = jet_coeff_f32(mandelbrotJetSuite[base + 2]);
            let cd  = jet_coeff_f32(mandelbrotJetSuite[base + 3]);
            let cdp = jet_coeff_f32(mandelbrotJetSuite[base + 4]);
            let dzF = fe_to_vec(*dz);
            let ae = ca + cmul(cap, dcF);
            let de = cd + cmul(cdp, dcF);
            let den = vec2<f32>(1.0, 0.0) + cmul(de, dzF);
            if (MOBIUS_PARANOIA_GUARD && dot(den, den) < MOBIUS_DEN_GUARD2) {
              denOk = false;
            } else {
              phi = fe_from_vec(cmul(cmul(ae, dzF) + cmul(cb, dcF), cinv(den)), 0);
            }
          } else {
            let ca  = jet_coeff_fe(mandelbrotJetSuite[base]);
            let cb  = jet_coeff_fe(mandelbrotJetSuite[base + 1]);
            let cap = jet_coeff_fe(mandelbrotJetSuite[base + 2]);
            let cd  = jet_coeff_fe(mandelbrotJetSuite[base + 3]);
            let cdp = jet_coeff_fe(mandelbrotJetSuite[base + 4]);
            let ae = fe_add(ca, fe_cmul(cap, dc));
            let de = fe_add(cd, fe_cmul(cdp, dc));
            let den = fe_add(fe(vec2<f32>(1.0, 0.0), 0), fe_cmul(de, *dz));
            if (MOBIUS_PARANOIA_GUARD && (den.e < -10 || (den.e < 5 && dot(fe_to_vec(den), fe_to_vec(den)) < MOBIUS_DEN_GUARD2))) {
              denOk = false;
            } else {
              phi = fe_cmul(fe_add(fe_cmul(ae, *dz), fe_cmul(cb, dc)), fe_cinv(den));
            }
          }
          if (denOk) {
            let candidateZ = getOrbit(*ref_i + skip) + fe_to_vec(phi);
            if (!(skip > 1 && dot(candidateZ, candidateZ) > 4.0)) {
              *dz = phi;
              *ref_i += skip;
              *order = 1;
              *hint = level;
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

// Unified dispatch (mode 5), production parity of try_apply_unified: one
// tagged-radius probe, tier-directed prefix read. The order counter doubles
// as the TIER-MIX census: o1 = affine/Pad\xe9 (≤ 48 B path), o2 = c+ (80 B),
// o3 = jet (108 B) — the debug view's per-order buckets read as tier shares.
fn dbg_try_unified(ref_i: ptr<function, i32>, dz: ptr<function, fe>, dc: fe, dc2: fe, dc3: fe, maxIterI: i32, skip0Log: i32, order: ptr<function, i32>, probes: ptr<function, u32>, lvlR: ptr<function, array<f32, JET_MAX_LEVELS>>, dcF: vec2<f32>, f32Ok: bool, hint: ptr<function, i32>) -> i32 {
  if (*ref_i <= 0) { return 0; }
  let log2_dz = fe_log2(*dz);
  let shiftedRef = *ref_i - 1;
  var level = min(min(i32(mandelbrot.blaLevelCount), JET_MAX_LEVELS) - 1, i32(countTrailingZeros(u32(shiftedRef))) - skip0Log);
  level = min(level, *hint + JET_LEVEL_HINT_UP);
  while (level >= 0) {
    *probes = *probes + 1u;
    let skip = i32(1u << u32(skip0Log + level));
    if (log2_dz < (*lvlR)[level] && *ref_i + skip <= maxIterI) {
      let levelInfo = mandelbrotJetLevels[level];
      let slot = shiftedRef >> u32(skip0Log + level);
      if (u32(slot) < levelInfo.count) {
        let entry = i32(levelInfo.offset) + slot;
        let radii = mandelbrotJetRadii[entry].v;
        if (log2_dz < radii.x) {
          let tag = i32(radii.y + 0.5);
          let base = entry * UNIFIED_COEFF_STRIDE;
          var phi: fe;
          var denOk = true;
          if (tag <= 2 && f32Ok && radii.z > 0.5 && log2_dz > -100.0) {
            let ca = jet_coeff_f32(mandelbrotJetSuite[base]);
            let cb = jet_coeff_f32(mandelbrotJetSuite[base + 1]);
            let dzF = fe_to_vec(*dz);
            if (tag == 0) {
              phi = fe_from_vec(cmul(ca, dzF) + cmul(cb, dcF), 0);
            } else {
              var ae = ca;
              var de = jet_coeff_f32(mandelbrotJetSuite[base + 2]);
              if (tag == 2) {
                ae = ca + cmul(jet_coeff_f32(mandelbrotJetSuite[base + 3]), dcF);
                de = de + cmul(jet_coeff_f32(mandelbrotJetSuite[base + 4]), dcF);
              }
              let den = vec2<f32>(1.0, 0.0) + cmul(de, dzF);
              if (MOBIUS_PARANOIA_GUARD && dot(den, den) < MOBIUS_DEN_GUARD2) {
                denOk = false;
              } else {
                phi = fe_from_vec(cmul(cmul(ae, dzF) + cmul(cb, dcF), cinv(den)), 0);
              }
            }
          } else {
            let ca = jet_coeff_fe(mandelbrotJetSuite[base]);
            let cb = jet_coeff_fe(mandelbrotJetSuite[base + 1]);
            if (tag == 0) {
              phi = fe_add(fe_cmul(ca, *dz), fe_cmul(cb, dc));
            } else if (tag <= 2) {
              let cd = jet_coeff_fe(mandelbrotJetSuite[base + 2]);
              var ae = ca;
              var de = cd;
              if (tag == 2) {
                ae = fe_add(ca, fe_cmul(jet_coeff_fe(mandelbrotJetSuite[base + 3]), dc));
                de = fe_add(cd, fe_cmul(jet_coeff_fe(mandelbrotJetSuite[base + 4]), dc));
              }
              let den = fe_add(fe(vec2<f32>(1.0, 0.0), 0), fe_cmul(de, *dz));
              if (MOBIUS_PARANOIA_GUARD && (den.e < -10 || (den.e < 5 && dot(fe_to_vec(den), fe_to_vec(den)) < MOBIUS_DEN_GUARD2))) {
                denOk = false;
              } else {
                phi = fe_cmul(fe_add(fe_cmul(ae, *dz), fe_cmul(cb, dc)), fe_cinv(den));
              }
            } else {
              let cd  = jet_coeff_fe(mandelbrotJetSuite[base + 2]);
              let cap = jet_coeff_fe(mandelbrotJetSuite[base + 3]);
              let cdp = jet_coeff_fe(mandelbrotJetSuite[base + 4]);
              let a02 = jet_coeff_fe(mandelbrotJetSuite[base + 5]);
              let a30 = jet_coeff_fe(mandelbrotJetSuite[base + 6]);
              let a12 = jet_coeff_fe(mandelbrotJetSuite[base + 7]);
              let a03 = jet_coeff_fe(mandelbrotJetSuite[base + 8]);
              let a20 = fe_neg(fe_cmul(cd, ca));
              let a11 = fe_add(cap, fe_neg(fe_cmul(cb, cd)));
              let a21 = fe_add(fe_neg(fe_cmul(cdp, ca)), fe_neg(fe_cmul(cd, a11)));
              let p0 = fe_add3(fe_cmul(cb, dc), fe_cmul(a02, dc2), fe_cmul(a03, dc3));
              let p1 = fe_add3(ca, fe_cmul(a11, dc), fe_cmul(a12, dc2));
              let p2 = fe_add(a20, fe_cmul(a21, dc));
              phi = fe_add(p0, fe_cmul(*dz, fe_add(p1, fe_cmul(*dz, fe_add(p2, fe_cmul(*dz, a30))))));
            }
          }
          if (denOk) {
            let candidateZ = getOrbit(*ref_i + skip) + fe_to_vec(phi);
            if (!(skip > 1 && dot(candidateZ, candidateZ) > 4.0)) {
              *dz = phi;
              *ref_i += skip;
              *order = max(1, tag); // tier-mix bucket: 1 = ≤48 B, 2 = c+, 3 = jet
              *hint = level;
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

// ── palettes ────────────────────────────────────────────────────────
// Compact inferno-ish heat ramp, t in [0,1].
fn heat(t: f32) -> vec3<f32> {
  let x = clamp(t, 0.0, 1.0);
  return vec3<f32>(
    clamp(2.2 * x - 0.1, 0.0, 1.0),
    clamp(2.0 * x - 0.75, 0.0, 1.0),
    clamp(select(2.2 - 3.2 * x, 0.4 + 1.2 * x, x < 0.4), 0.0, 1.0));
}
// Blue → cyan → green → yellow → red ramp for skip magnitudes.
fn skip_ramp(t: f32) -> vec3<f32> {
  let x = clamp(t, 0.0, 1.0) * 4.0;
  if (x < 1.0) { return mix(vec3<f32>(0.1, 0.15, 0.7), vec3<f32>(0.0, 0.7, 0.9), x); }
  if (x < 2.0) { return mix(vec3<f32>(0.0, 0.7, 0.9), vec3<f32>(0.1, 0.8, 0.2), x - 1.0); }
  if (x < 3.0) { return mix(vec3<f32>(0.1, 0.8, 0.2), vec3<f32>(1.0, 0.9, 0.1), x - 2.0); }
  return mix(vec3<f32>(1.0, 0.9, 0.1), vec3<f32>(0.9, 0.1, 0.1), x - 3.0);
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let globalMaxIterI = i32(mandelbrot.globalMaxIter);
  let neutralExtent = sqrt(mandelbrot.aspect * mandelbrot.aspect + 1.0);
  let xy_neutral = (uv - vec2<f32>(0.5, 0.5)) * 2.0 * vec2<f32>(mandelbrot.aspect, 1.0) / neutralExtent;
  let local_rot = xy_neutral * neutralExtent;
  let scaleExp = i32(mandelbrot.scaleExp);

  // dc in fe, from either uniform regime (deep: fe mantissas share scaleExp).
  var dc: fe;
  if (scaleExp <= DEEP_EXP) {
    dc = fe_renorm(fe(local_rot * mandelbrot.scale + vec2<f32>(mandelbrot.cx, mandelbrot.cy), scaleExp));
  } else {
    dc = fe_from_vec(local_rot * mandelbrot.scale + vec2<f32>(mandelbrot.cx, mandelbrot.cy), 0);
  }
  let log_dcMag = log(max(length(dc.m), 1e-30)) + f32(dc.e) * LN2;
  let dc2 = fe_cmul(dc, dc);
  let dc3 = fe_cmul(dc2, dc);
  // (#4) f32 dc powers for the jet fast path (production parity): |dc| > 2^-42
  // keeps dc\xb2/dc\xb3 clear of the f32 subnormal band.
  let dcF = fe_to_vec(dc);
  let dcF2 = cmul(dcF, dcF);
  let dcF3 = cmul(dcF2, dcF);
  let jetF32Ok = length(dcF) > 2.3e-13;

  let mode = i32(mandelbrot.approximationMode + 0.5); // 0..5 requested mode
  let isJet = mode == 3;
  let isMobius = mode == 4;
  let isUnified = mode == 5;
  let isBlockTable = isJet || isMobius || isUnified;
  // M\xf6bius products are degree-1 in dc: looser f32-path gate than the jet's.
  let mobiusF32Ok = length(fe_to_vec(dc)) > 1e-30;
  let useBlocks = mode >= 1 && mandelbrot.blaLevelCount >= 1.0 && mandelbrot.orbitComplete >= 0.5;
  var skip0Log = 0;
  // Hoisted per-level maxR3 gates (production parity: loaded once per pixel).
  var jetLvlR3: array<f32, JET_MAX_LEVELS>;
  if (useBlocks) {
    if (isBlockTable) {
      skip0Log = i32(countTrailingZeros(max(mandelbrotJetLevels[0].skip, 1u)));
      for (var l = 0; l < min(i32(mandelbrot.blaLevelCount), JET_MAX_LEVELS); l++) {
        jetLvlR3[l] = mandelbrotJetLevels[l].maxR3;
      }
    } else {
      skip0Log = i32(countTrailingZeros(max(mandelbrotBlaLevels[0].skip, 1u)));
    }
  }

  var dz = fe(vec2<f32>(0.0, 0.0), FE_ZERO_E);
  var ref_i = 0;
  var iters = 0u;      // iterations advanced
  var turns = 0u;      // loop turns (wall-clock proxy)
  var exactIters = 0u;
  var o1Iters = 0u;
  var o2Iters = 0u;
  var o3Iters = 0u;
  var probes = 0u;
  var escaped = false;
  var refZ = getOrbit(0);
  var jetLevelHint = JET_MAX_LEVELS; // (#5) per-pixel level hint

  while (i32(iters) < globalMaxIterI && turns < DEBUG_TURN_CAP && ref_i < globalMaxIterI) {
    turns += 1u;
    var skipped = 0;
    var order = 0;
    if (useBlocks) {
      if (isUnified) {
        skipped = dbg_try_unified(&ref_i, &dz, dc, dc2, dc3, globalMaxIterI, skip0Log, &order, &probes, &jetLvlR3, dcF, mobiusF32Ok, &jetLevelHint);
      } else if (isMobius) {
        skipped = dbg_try_mobius(&ref_i, &dz, dc, globalMaxIterI, skip0Log, &order, &probes, &jetLvlR3, dcF, mobiusF32Ok, &jetLevelHint);
      } else if (isJet) {
        skipped = dbg_try_jet(&ref_i, &dz, dc, dc2, dc3, globalMaxIterI, skip0Log, &order, &probes, &jetLvlR3, dcF, dcF2, dcF3, jetF32Ok, &jetLevelHint);
      } else {
        skipped = dbg_try_bla(&ref_i, &dz, dc, log_dcMag, globalMaxIterI, skip0Log, &order, &probes);
      }
    }
    if (skipped > 0) {
      iters += u32(skipped);
      if (order == 1) { o1Iters += u32(skipped); }
      else if (order == 2) { o2Iters += u32(skipped); }
      else { o3Iters += u32(skipped); }
      refZ = getOrbit(ref_i);
    } else {
      dz = fe_add3(fe_cmul_f32(2.0 * refZ, dz), fe_cmul(dz, dz), dc);
      ref_i += 1;
      refZ = getOrbit(ref_i);
      iters += 1u;
      exactIters += 1u;
    }
    let z = refZ + fe_to_vec(dz);
    let dot_z = dot(z, z);
    if (dot_z > 4.0) { escaped = true; break; }
    let dz_f = fe_to_vec(dz);
    if (dot_z < dot(dz_f, dz_f) || ref_i >= globalMaxIterI - 1) {
      dz = fe_from_vec(z, 0);
      ref_i = 0;
      refZ = getOrbit(0);
    }
  }

  let fturns = f32(max(turns, 1u));
  let fiters = f32(max(iters, 1u));
  var rgb = vec3<f32>(0.0);
  let view = i32(mandelbrot.debugView + 0.5);
  if (view == 1) {
    // Cost: turns on a log scale against the turn cap.
    rgb = heat(log2(1.0 + fturns) / log2(1.0 + f32(DEBUG_TURN_CAP)));
  } else if (view == 2) {
    // Average applied block length per turn, log2-mapped 1..1024.
    rgb = skip_ramp(log2(max(fiters / fturns, 1.0)) / 10.0);
  } else if (view == 3) {
    // Composition of covered iterations.
    rgb = vec3<f32>(f32(exactIters), f32(o1Iters), f32(o2Iters + o3Iters)) / fiters;
  } else {
    // Probes per turn (lookup overhead), mapped 0..8.
    rgb = heat(f32(probes) / fturns / 8.0);
  }
  // Interior/budget-exhausted pixels: keep the metric but dim it so escape
  // structure stays readable.
  if (!escaped) { rgb *= 0.45; }
  return vec4<f32>(rgb, 1.0);
}
`,jr=`// Working precision for the bounded shading math (lighting lobes, AO, edge
// wear, subsurface). Default f32; the engine swaps this to f16 (and prepends
// \`enable f16;\`) when the device supports shader-f16, doubling ALU throughput
// on mobile. Only values in a safe [~1e-3, ~1e3] range use hcol — iteration
// counts, distance estimates and palette phase stay f32.
alias hcol = f32;

struct Uniforms {
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
  aaJitterHatX: f32,     // unit direction of the current sample's jitter δc (c-space basis)
  aaJitterHatY: f32,
  aaJitterLogMag: f32,   // ln|δc| in c units (exponent-summed with the payload's S)
  aaAnalytic: f32,       // 1 = analytic AA expansion enabled (auto mode, raw payload bound)
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

  // Rows 3 (metallic/roughness/anisotropy) and 4 (iridescence) are only read
  // inside the shading branch, so they are sampled lazily there via
  // sampleShadingMaterial() rather than for every pixel.

  // Row 5: stripe color blend, direction coherence color blend, stripe relief, direction coherence relief
  let row5 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, 0.916666667), 0.0);
  e.wStripeAverage = clamp(row5.r, 0.0, 1.0);
  e.wRotationMean = clamp(row5.g, 0.0, 1.0);
  e.wStripeRelief = clamp(row5.b, 0.0, 1.0);
  e.wDirectionCoherenceRelief = clamp(row5.a, 0.0, 100.0);

  return e;
}

// Rows 3 & 4 of the palette texture (material + iridescence). Sampled lazily
// from inside the shading branch since no other code path reads these fields.
fn sampleShadingMaterial(palettePhase: f32, e: ptr<function, EffectParams>) {
  // Row 3: reserved, metallic, roughness, anisotropy
  let row3 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, 0.583333333), 0.0);
  (*e).metallic = clamp(row3.g, 0.0, 1.0);
  (*e).roughness = clamp(row3.b, 0.02, 1.0);
  (*e).anisotropy = clamp(row3.a, 0.0, 1.0);

  // Row 4: iridescence R, G, B, strength
  let row4 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, 0.75), 0.0);
  (*e).iridescenceColor = row4.rgb;
  (*e).wIridescence = clamp(row4.a, 0.0, 1.0);
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
  // Bounded: cosTheta and f0 both in [0,1].
  let m = clamp(hcol(1.0) - hcol(cosTheta), hcol(0.0), hcol(1.0));
  let m2 = m * m;
  let m5 = m2 * m2 * m;
  let f0h = vec3<hcol>(f0);
  return vec3<f32>(f0h + (vec3<hcol>(1.0) - f0h) * m5);
}

// KEPT f32 ON PURPOSE. a2 = roughness⁴ underflows f16 for roughness < ~0.088
// (roughness is clamped to [0.02,1] at the call site), which zeroes the GGX
// numerator on GPUs without f16 subnormals → sharp specular highlights vanish.
// The dynamic range of this term is f16-hostile; leave the specular core in f32.
fn ggx_distribution(nDotH: f32, roughness: f32) -> f32 {
  let a = roughness * roughness;
  let a2 = a * a;
  let d = nDotH * nDotH * (a2 - 1.0) + 1.0;
  return a2 / max(3.14159265 * d * d, 1e-5);
}

fn ggx_geometry_schlick(nDotV: f32, roughness: f32) -> f32 {
  // Denominator is ≥ k ≥ 0.125, so the guard never binds and there is no
  // f16 underflow; all operands are in [0,1].
  let r = hcol(roughness) + hcol(1.0);
  let k = (r * r) / hcol(8.0);
  let nv = hcol(nDotV);
  return f32(nv / max(nv * (hcol(1.0) - k) + k, hcol(1.0e-4)));
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
  // Bounded: all operands are unit-vector dot products / [0,1] roughness. The
  // squared-nDotH guard uses 1e-4 (smallest safe normal f16) instead of 1e-5,
  // which would flush to zero on GPUs without f16 subnormals; the difference
  // only affects extreme grazing angles where the lobe already vanishes.
  let nrm = vec3<hcol>(normal);
  let tDotH = dot(vec3<hcol>(tangent), vec3<hcol>(halfDir));
  let bDotH = dot(vec3<hcol>(bitangent), vec3<hcol>(halfDir));
  let ndh = dot(nrm, vec3<hcol>(halfDir));
  let nDotH2 = max(ndh * ndh, hcol(1.0e-4));
  let rough = hcol(roughness);
  let alphaT = max(hcol(0.06), rough * hcol(0.45));
  let alphaB = max(hcol(0.12), rough * hcol(1.65));
  let stretch = (tDotH * tDotH) / (alphaT * alphaT) + (bDotH * bDotH) / (alphaB * alphaB);
  let lobe = exp(-stretch / nDotH2);
  let visibility = sqrt(max(hcol(nDotL) * hcol(nDotV), hcol(0.0)));
  return f32(lobe * visibility);
}

fn pseudo_ambient_occlusion(normal: vec3<f32>, v_smooth: f32, z: vec2<f32>) -> f32 {
  // exp(-v_smooth*0.035) and length(z)/2.5 both saturate their clamps, so the
  // large-magnitude inputs (v_smooth, |z|) are computed in f32 and only the
  // already-bounded results enter hcol.
  let cavity = pow(clamp(hcol(1.0) - hcol(normal.z), hcol(0.0), hcol(1.0)), hcol(1.35));
  let depthMask = clamp(hcol(1.0 - exp(-v_smooth * 0.035)), hcol(0.0), hcol(1.0));
  let basinMask = clamp(hcol(length(z)) / hcol(2.5), hcol(0.0), hcol(1.0));
  let strength = clamp(hcol(parameters.ambientOcclusionStrength), hcol(0.0), hcol(2.0));
  let ao = hcol(1.0) - (hcol(0.55) * cavity + hcol(0.25) * depthMask + hcol(0.20) * basinMask) * hcol(0.45) * strength;
  return f32(clamp(ao, hcol(0.08), hcol(1.0)));
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
  // Bounded lighting terms → hcol. distanceHeight/slope enter only through
  // smoothstep (saturating), so their large range is harmless.
  let nrm = vec3<hcol>(normal);
  let lgt = vec3<hcol>(lightDir);
  let backLight = pow(max(dot(nrm, -lgt), hcol(0.0)), hcol(1.35));
  let rimScatter = pow(clamp(hcol(1.0) - hcol(nDotV), hcol(0.0), hcol(1.0)), hcol(2.15));
  let wrapBase = clamp(dot(nrm, lgt) * hcol(0.5) + hcol(0.5), hcol(0.0), hcol(1.0));
  let wrapLight = wrapBase * wrapBase;
  let heightThinness = hcol(1.0) - smoothstep(hcol(4.0), hcol(13.0), hcol(distanceHeight));
  let slopeThinness = smoothstep(hcol(0.15), hcol(1.6), hcol(slope));
  let thinness = clamp(heightThinness * hcol(0.55) + slopeThinness * hcol(0.45), hcol(0.0), hcol(1.0));
  let thickness = clamp(thinness * hcol(0.62) + (hcol(1.0) - hcol(ao)) * hcol(0.23) + hcol(edgeWear) * hcol(0.15), hcol(0.0), hcol(1.0));
  let mask = (backLight * hcol(0.35) + rimScatter * hcol(0.25) + wrapLight * hcol(0.40)) * thickness;
  let col = vec3<hcol>(color);
  let scatterColor = mix(col, sqrt(max(col, vec3<hcol>(0.0))), hcol(0.35));
  return vec3<f32>(scatterColor * mask * hcol(clamp(strength, 0.0, 10.0)) * hcol(1.0 - metallic));
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
  // grad is clamped to [-6,6] and relief to [0,2] upstream, so every term is
  // well within f16 range.
  let rl = hcol(relief);
  let n = vec3<hcol>(normal)
    - vec3<hcol>(tangent) * hcol(grad.x) * hcol(0.34) * rl
    - vec3<hcol>(bitangent) * hcol(grad.y) * hcol(0.34) * rl;
  return vec3<f32>(normalize(n));
}

fn fractal_height_ao(slope: f32, relief: f32, occStrength: f32) -> f32 {
  let occ = smoothstep(hcol(0.12), hcol(2.75), hcol(slope) * hcol(relief)) * hcol(occStrength);
  return f32(clamp(hcol(1.0) - occ * hcol(0.72), hcol(0.16), hcol(1.0)));
}

fn surface_cavity(grad: vec2<f32>, lightDir: vec3<f32>, tangent: vec3<f32>, bitangent: vec3<f32>, relief: f32, occStrength: f32) -> f32 {
  // Light-plane projection computed in f32 (unit-vector dots), then the bounded
  // geometry runs in hcol.
  let lightPlane = vec2<hcol>(vec2<f32>(dot(lightDir, tangent), dot(lightDir, bitangent)));
  let lightPlaneLen = length(lightPlane);
  if (lightPlaneLen < hcol(1.0e-4) || occStrength <= 0.0 || relief <= 0.0) {
    return 1.0;
  }
  let g = vec2<hcol>(grad);
  let lightPlaneDir = lightPlane / lightPlaneLen;
  let crossDir = vec2<hcol>(-lightPlaneDir.y, lightPlaneDir.x);
  let uphillTowardLight = max(dot(g, lightPlaneDir), hcol(0.0));
  let sideCavity = abs(dot(g, crossDir)) * hcol(0.18);
  let amount = smoothstep(hcol(0.04), hcol(1.45), (uphillTowardLight + sideCavity) * hcol(relief)) * hcol(occStrength);
  return f32(clamp(hcol(1.0) - amount * hcol(0.48), hcol(0.26), hcol(1.0)));
}

fn fractal_height_shadow(grad: vec2<f32>, lightDir: vec3<f32>, tangent: vec3<f32>, bitangent: vec3<f32>, relief: f32, occStrength: f32) -> f32 {
  let lightPlane = vec2<hcol>(vec2<f32>(dot(lightDir, tangent), dot(lightDir, bitangent)));
  let lightPlaneLen = length(lightPlane);
  if (lightPlaneLen < hcol(1.0e-4) || occStrength <= 0.0 || relief <= 0.0) {
    return 1.0;
  }
  let lightPlaneDir = lightPlane / lightPlaneLen;
  let uphillTowardLight = max(dot(vec2<hcol>(grad), lightPlaneDir), hcol(0.0));
  let grazing = hcol(1.0) / max(hcol(lightDir.z) + hcol(0.35), hcol(0.35));
  let shadow = uphillTowardLight * hcol(0.22) * grazing * hcol(relief) * hcol(occStrength);
  return f32(clamp(hcol(1.0) - shadow, hcol(0.22), hcol(1.0)));
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
  var fx = sampleEffects(palettePhase);

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
    // Material + iridescence rows are only needed here: sample them lazily.
    sampleShadingMaterial(palettePhase, &fx);
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
    // The three fields (fractal height, stripe phase, direction coherence)
    // share the same 4 neighbour texels. Fetch each neighbour once and derive
    // whichever gradients are needed together, instead of reloading layers
    // 0/2/3 and recomputing escape_nu three times per neighbour.
    if (needsFractalGradient || needsStripeGradient || needsDirectionCoherenceGradient) {
      if (magnified) {
        field_gradients_bilinear(
          sourceTex, uv_tex, sourceTexSize,
          distanceHeight, stripeAverage, directionCoherence,
          distanceHeightOffset, distanceHeightGradientScale,
          needsFractalGradient, needsStripeGradient, needsDirectionCoherenceGradient,
          &grad, &stripeGrad, &directionCoherenceGrad
        );
      } else {
        field_gradients_at_coord(
          sourceTex, sourceCoord, sourceTexSize,
          distanceHeight, stripeAverage, directionCoherence,
          distanceHeightOffset, distanceHeightGradientScale,
          needsFractalGradient, needsStripeGradient, needsDirectionCoherenceGradient,
          &grad, &stripeGrad, &directionCoherenceGrad
        );
      }
      if (needsFractalGradient) {
        grad = clamp(grad, vec2<f32>(-6.0), vec2<f32>(6.0));
        slope = length(grad);
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

fn cmul_c(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
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

// ── Shared neighbour fetch ──────────────────────────────────────────
// The fractal-height, stripe-phase and direction-coherence fields all live
// in the same source texel (layers 4 / 6 / 7) and share the same validity
// test (in-bounds + escaped). Fetching a neighbour once and decoding only the
// requested channels avoids reloading layers 0/2/3 and recomputing escape_nu
// separately for each field.
struct NeighborFields {
  valid: bool,       // in-bounds AND escaped → usable; otherwise fall back to center
  height: f32,
  stripe: f32,
  coherence: f32,
};

fn sample_neighbor_fields(
  sourceTex: texture_2d_array<f32>,
  coord: vec2<i32>,
  texSize: vec2<i32>,
  heightOffset: f32,
  needHeight: bool,
  needStripe: bool,
  needCoh: bool
) -> NeighborFields {
  var nf: NeighborFields;
  nf.valid = false;
  nf.height = 0.0;
  nf.stripe = 0.0;
  nf.coherence = 0.0;
  if (coord.x < 0 || coord.x >= texSize.x || coord.y < 0 || coord.y >= texSize.y) {
    return nf;
  }
  let state = load_pixel_state(sourceTex, coord);
  if (escape_nu(state.iter, state.zx, state.zy) < 0.0) {
    return nf;
  }
  nf.valid = true;
  if (needHeight) {
    let storedHeight = textureLoad(sourceTex, coord, 4, 0).r + heightOffset;
    nf.height = clamp(storedHeight, -64.0, 64.0);
  }
  if (needStripe) {
    nf.stripe = decode_stripe_phase(textureLoad(sourceTex, coord, 6, 0).r);
  }
  if (needCoh) {
    nf.coherence = decode_direction_coherence(textureLoad(sourceTex, coord, 7, 0).r);
  }
  return nf;
}

// Central-difference gradients of any subset of the three fields, sharing the
// four neighbour fetches. Scales match the former per-field functions:
// height \xd712\xb7scale, stripe \xd78, coherence \xd78. Outputs left untouched when their
// need flag is false.
fn field_gradients_at_coord(
  sourceTex: texture_2d_array<f32>,
  coord: vec2<i32>,
  texSize: vec2<i32>,
  centerHeight: f32,
  centerStripe: f32,
  centerCoherence: f32,
  heightOffset: f32,
  heightGradientScale: f32,
  needHeight: bool,
  needStripe: bool,
  needCoh: bool,
  heightGrad: ptr<function, vec2<f32>>,
  stripeGrad: ptr<function, vec2<f32>>,
  cohGrad: ptr<function, vec2<f32>>
) {
  let nR = sample_neighbor_fields(sourceTex, coord + vec2<i32>(1, 0), texSize, heightOffset, needHeight, needStripe, needCoh);
  let nL = sample_neighbor_fields(sourceTex, coord - vec2<i32>(1, 0), texSize, heightOffset, needHeight, needStripe, needCoh);
  let nU = sample_neighbor_fields(sourceTex, coord + vec2<i32>(0, 1), texSize, heightOffset, needHeight, needStripe, needCoh);
  let nD = sample_neighbor_fields(sourceTex, coord - vec2<i32>(0, 1), texSize, heightOffset, needHeight, needStripe, needCoh);
  if (needHeight) {
    let r = select(centerHeight, nR.height, nR.valid);
    let l = select(centerHeight, nL.height, nL.valid);
    let u = select(centerHeight, nU.height, nU.valid);
    let d = select(centerHeight, nD.height, nD.valid);
    *heightGrad = vec2<f32>(r - l, u - d) * 12.0 * heightGradientScale;
  }
  if (needStripe) {
    let r = select(centerStripe, nR.stripe, nR.valid);
    let l = select(centerStripe, nL.stripe, nL.valid);
    let u = select(centerStripe, nU.stripe, nU.valid);
    let d = select(centerStripe, nD.stripe, nD.valid);
    *stripeGrad = vec2<f32>(stripe_phase_delta(r, l), stripe_phase_delta(u, d)) * 8.0;
  }
  if (needCoh) {
    let r = select(centerCoherence, nR.coherence, nR.valid);
    let l = select(centerCoherence, nL.coherence, nL.valid);
    let u = select(centerCoherence, nU.coherence, nU.valid);
    let d = select(centerCoherence, nD.coherence, nD.valid);
    *cohGrad = vec2<f32>(r - l, u - d) * 8.0;
  }
}

// Bilinear (magnified) counterpart: analytic gradient of the bilinearly
// interpolated field over the enclosing cell, sharing the four corner fetches.
// Scales match the former per-field functions: height \xd724\xb7scale, others \xd716.
fn field_gradients_bilinear(
  sourceTex: texture_2d_array<f32>,
  uv: vec2<f32>,
  texSize: vec2<i32>,
  centerHeight: f32,
  centerStripe: f32,
  centerCoherence: f32,
  heightOffset: f32,
  heightGradientScale: f32,
  needHeight: bool,
  needStripe: bool,
  needCoh: bool,
  heightGrad: ptr<function, vec2<f32>>,
  stripeGrad: ptr<function, vec2<f32>>,
  cohGrad: ptr<function, vec2<f32>>
) {
  let cell = bilinear_cell(uv, texSize);
  let n00 = sample_neighbor_fields(sourceTex, cell.base, texSize, heightOffset, needHeight, needStripe, needCoh);
  let n10 = sample_neighbor_fields(sourceTex, cell.base + vec2<i32>(1, 0), texSize, heightOffset, needHeight, needStripe, needCoh);
  let n01 = sample_neighbor_fields(sourceTex, cell.base + vec2<i32>(0, 1), texSize, heightOffset, needHeight, needStripe, needCoh);
  let n11 = sample_neighbor_fields(sourceTex, cell.base + vec2<i32>(1, 1), texSize, heightOffset, needHeight, needStripe, needCoh);
  if (needHeight) {
    let h00 = select(centerHeight, n00.height, n00.valid);
    let h10 = select(centerHeight, n10.height, n10.valid);
    let h01 = select(centerHeight, n01.height, n01.valid);
    let h11 = select(centerHeight, n11.height, n11.valid);
    let gx = mix(h10 - h00, h11 - h01, cell.f.y);
    let gy = mix(h01 - h00, h11 - h10, cell.f.x);
    *heightGrad = vec2<f32>(gx, gy) * 24.0 * heightGradientScale;
  }
  if (needStripe) {
    let s00 = select(centerStripe, n00.stripe, n00.valid);
    let s10 = select(centerStripe, n10.stripe, n10.valid);
    let s01 = select(centerStripe, n01.stripe, n01.valid);
    let s11 = select(centerStripe, n11.stripe, n11.valid);
    let gx = mix(stripe_phase_delta(s10, s00), stripe_phase_delta(s11, s01), cell.f.y);
    let gy = mix(stripe_phase_delta(s01, s00), stripe_phase_delta(s11, s10), cell.f.x);
    *stripeGrad = vec2<f32>(gx, gy) * 16.0;
  }
  if (needCoh) {
    let c00 = select(centerCoherence, n00.coherence, n00.valid);
    let c10 = select(centerCoherence, n10.coherence, n10.valid);
    let c01 = select(centerCoherence, n01.coherence, n01.valid);
    let c11 = select(centerCoherence, n11.coherence, n11.valid);
    let gx = mix(c10 - c00, c11 - c01, cell.f.y);
    let gy = mix(c01 - c00, c11 - c10, cell.f.x);
    *cohGrad = vec2<f32>(gx, gy) * 16.0;
  }
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
  return i32(floor(phase * 4.0));
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
  magnified: bool,
  analyticTag: bool
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
  var iter_v = iter_val;
  var z = vec2<f32>(zx_val, zy_val);
  var z_sq = dot(z, z);
  var mu_val = smooth_escape_fraction(z_sq);

  // Phase D analytic AA: pixels the reseed tagged analytic-OK were frozen at
  // their sample-0 state; reconstruct this sample's sub-pixel value
  // ẑ(δc) = z + z′\xb7δc + \xbd\xb7z″\xb7δc\xb2 from the raw Taylor payload
  // (layer 8 = S, 9/10 = z′ mantissa \xb7e^S, 11/12 = z″ mantissa \xb7e^{2S}) and
  // derive the subsample's smooth iteration / escape-z from ẑ — the log-log
  // formula extrapolates below bailout, no re-iteration. The extrapolated ν̂ is
  // then renormalized like the bilinear resolve: iter = floor(ν̂) + a synthetic
  // |z| reproducing fract(ν̂), so integer-parity coloring (zebra) and the escape
  // gates see a genuinely-escaped-at-that-iteration sample — a re-iterated
  // subsample crossing an iteration line gets iter\xb11, and the analytic one must
  // match. Height/angle keep the center pixel's values (DE varies slowly at
  // sub-pixel scale); the escape-z DIRECTION stays the center's (like the
  // bilinear path, no per-iteration angle doubling).
  if (analyticTag && parameters.aaAnalytic > 0.5 && textureNumLayers(sourceTex) > 12u) {
    let S = textureLoad(sourceTex, sourceCoord, 8, 0).r;
    let m1 = vec2<f32>(textureLoad(sourceTex, sourceCoord, 9, 0).r,
                       textureLoad(sourceTex, sourceCoord, 10, 0).r);
    let m2 = vec2<f32>(textureLoad(sourceTex, sourceCoord, 11, 0).r,
                       textureLoad(sourceTex, sourceCoord, 12, 0).r);
    let hat = vec2<f32>(parameters.aaJitterHatX, parameters.aaJitterHatY);
    // Exponent-summed magnitudes: e^{S+ln|δc|} stays finite where e^S alone
    // would overflow f32.
    let e1 = exp(clamp(S + parameters.aaJitterLogMag, -80.0, 80.0));
    let e2 = exp(clamp(2.0 * (S + parameters.aaJitterLogMag), -80.0, 80.0));
    let zhat = z + cmul_c(m1, hat) * e1 + cmul_c(cmul_c(m2, hat), hat) * (0.5 * e2);
    let zhat_sq = dot(zhat, zhat);
    let nuHat = iter_val + smooth_escape_fraction(zhat_sq);
    var iterEff = floor(nuHat);
    var fracEff = nuHat - iterEff;
    if (iterEff < 1.0) {
      iterEff = 1.0;
      fracEff = 0.0;
    }
    iter_v = iterEff;
    mu_val = fracEff;
    // Synthetic |z| reproducing fracEff through smooth_escape_fraction (always
    // outside bailout since fracEff < 1), direction from ẑ.
    let log_z2 = max(parameters.logMu, 1e-6) * exp2(1.0 - fracEff);
    let zhatLen = max(sqrt(zhat_sq), 1e-30);
    z = zhat * (exp(0.5 * log_z2) / zhatLen);
    z_sq = dot(z, z);
  }

  var nu = iter_v + mu_val;

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
  nu = mix(iter_v, nu, wSmoothness);

  // ── Zebra: continuous application (darkens even iterations) ──
  let row1 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(prelimPhase, 0.25), 0.0);
  let wZebra = row1.r;
  let isEvenIter = 1.0 - abs(floor(iter_v) % 2.0);

  let distanceHeightStored = extras.der_x + distanceHeightOffset;
  let angle_der = extras.der_y;

  if (parameters.debugShading >= 0.5) {
    let sector = debug_wheel_sector(uv_screen);
    if (sector == 0) {
      return vec4<f32>(debug_heat(fract(nu_smooth * 0.125)), 1.0);
    }
    if (sector == 1) {
      let distanceHeight = distance_height_from_values(iter_v, z.x, z.y, distanceHeightStored);
      return vec4<f32>(debug_heat(debug_distance_scale(distanceHeight)), 1.0);
    }
    if (sector == 2) {
      let distanceHeight = distance_height_from_values(iter_v, z.x, z.y, distanceHeightStored);
      let grad = distance_height_gradient_at_coord(sourceTex, sourceCoord, sourceTexSize, distanceHeight, distanceHeightOffset, distanceHeightGradientScale);
      return vec4<f32>(debug_heat(debug_gradient_scale(length(grad))), 1.0);
    }
    return vec4<f32>(debug_heat(fract(angle_der / (2.0 * 3.141592653589793) + 0.5)), 1.0);
  }

  let v = nu;
  let v_smooth = nu_smooth;
  let stripePhase = decode_stripe_phase(extras.refWithStripe);
  let directionCoherence = decode_direction_coherence(extras.avgDirection);
  var color = palette(sourceTex, sourceCoord, sourceTexSize, iter_v, v, v_smooth, z, distanceHeightStored, distanceHeightOffset, distanceHeightGradientScale, angle_der, stripePhase, directionCoherence, uv_neutral.x, uv_neutral.y, uv_tex, magnified);

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
  distanceHeightGradientScale: f32,
  analyticTag: bool
) -> vec4<f32> {
  var it = iter_val;
  var zx = zx_val;
  var zy = zy_val;
  var extras = load_pixel_extras(sourceTex, coord);
  var analytic = analyticTag;
  if (interp.kind == 1) {
    it = interp.iter;
    zx = interp.zx;
    zy = interp.zy;
    extras = interp.extras;
    // Bilinear-interpolated values are not payload-consistent: no expansion.
    analytic = false;
  }
  return colorize_pixel(
    sourceTex, coord, texSize, it, zx, zy, extras,
    uv_screen, uv_neutral, distanceHeightOffset, distanceHeightGradientScale,
    uv_tex, magnified, analytic
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
  // Phase D: the reseed tags analytic-OK pixels with a +0.5 fraction in the AA
  // target map (the integer part stays the sample-count target).
  var liveAnalyticTag = false;
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
      let aaTargetRaw = textureLoad(aaTargetTex, liveCoord, 0).r;
      let aaTarget = floor(aaTargetRaw);
      liveAnalyticTag = fract(aaTargetRaw) > 0.25;
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
        liveDistanceHeightGradientScale,
        liveAnalyticTag
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
        frozenDistanceHeightGradientScale,
        false
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
      liveDistanceHeightGradientScale,
      liveAnalyticTag
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
      frozenDistanceHeightGradientScale,
      false
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
`,Jr=`// Utility compute pass (all-compute-der-cartesian): ping-pong A→B port of the
// fragment brush (reproject.wgsl). Runs only on pan / clear frames; every
// texel writes ALL layers of B (full rewrite is this pass's job), then the
// engine copies B→A and the same frame's in-place dispatch continues
// iteration. Reading A while writing B makes the neighbour gather race-free.
//
// Deliberate difference from the fragment brush: NO sentinel refinement here.
// The fused in-place shader (mandelbrot_brush.wgsl cs_main) refines sentinels
// on every dispatch — including the one that follows this pass in the same
// frame — so refining here too would halve the sentinel step twice per pan
// frame (the 4\xd7 pixel-spike the allowRefinement gate exists to prevent).
// The fragment flow had the same one-refinement-per-frame budget, just
// distributed differently (brush refined, the iterate pass did not).
//
// Layer layout (r32float array, layer count read from the destination so the
// same shader serves the 8-layer and 9-layer formats):
//   0 : sentinel / iteration count (integer part)
//   1 : resolution step (1.0 = genuine pixel, >= 2 = resolve-copied, 0.0 = no data)
//   2 : z.x
//   3 : z.y
//   4 : dz.x (derivative real)          — escaped: DE height
//   5 : dz.y (derivative imag)          — escaped: relief angle
//   6 : ref_i + fractional stripe phase
//   7 : packed average orbit direction
//   8+: continuation extras (Cartesian derS) — copied like any other layer
//
// Sentinels in layer 0 are negative integers (-1 = compute, -2/-4/... =
// resolve with that step). Budget-exhausted pixels (iter > 0, |z|\xb2 < 4) pass
// through unchanged — continuation is the iteration shader's job, verbatim
// from the fragment brush.

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
@group(0) @binding(2) var dstRaw: texture_storage_2d_array<r32float, write>;

fn store_layer(coord: vec2<i32>, layer: i32, v: f32) {
  textureStore(dstRaw, coord, layer, vec4<f32>(v, 0.0, 0.0, 0.0));
}

fn store_cleared(coord: vec2<i32>, sentinel: f32, layers: i32) {
  store_layer(coord, 0, sentinel);
  for (var l = 1; l < layers; l++) {
    store_layer(coord, l, 0.0);
  }
}

fn store_copied(coord_out: vec2<i32>, coord_in: vec2<i32>, layers: i32) {
  for (var l = 0; l < layers; l++) {
    store_layer(coord_out, l, textureLoad(prevRaw, coord_in, l, 0).r);
  }
}

@compute @workgroup_size(16, 16)
fn cs_main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = vec2<i32>(textureDimensions(dstRaw));
  let coord_out = vec2<i32>(gid.xy);
  if (coord_out.x >= dims.x || coord_out.y >= dims.y) {
    return;
  }
  let layers = i32(textureNumLayers(dstRaw));

  // Full reset when needed.
  if (uni.clearHistory >= 0.5) {
    let step = i32(max(1.0, uni.seedStep));
    let is_anchor = (coord_out.x % step == 0) && (coord_out.y % step == 0);
    let sentinel = select(-uni.baseSentinel, -1.0, is_anchor);
    store_cleared(coord_out, sentinel, layers);
    return;
  }

  // Translation reprojection — always an integer-texel gather (spike 1.1:
  // the rounded shift is also what the JS-side accounting accumulates).
  let shift = vec2<i32>(i32(round(uni.shiftTexX)), i32(round(uni.shiftTexY)));
  let coord_in = coord_out - shift;

  if (coord_in.x < 0 || coord_in.y < 0 || coord_in.x >= dims.x || coord_in.y >= dims.y) {
    store_cleared(coord_out, -uni.baseSentinel, layers);
    return;
  }

  store_copied(coord_out, coord_in, layers);
}
`,Hr=`// Resolve pass: replaces remaining sentinels with a snapped parent pixel.
//
// Input: the RAW state texture (9 r32float layers — see mandelbrot_brush.wgsl);
// output: the 8-layer resolved texture (MRT). Only FINISHED pixels are ever
// interpreted here (sentinels and budget-exhausted continuations are replaced
// by finished ancestors), so the in-progress raw derivative in layers 4/5/8
// is never read — layers 4/5 below are the escaped format.
//
// Layer layout (finished pixels):
//   0 : iteration count (integer part)
//   1 : resolution step (1.0 = genuine pixel, >= 2 = resolve-copied from grid step)
//   2 : z.x
//   3 : z.y
//   4 : distance height (escaped)
//   5 : visual derivative angle (escaped)
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
`,Vr=`// Merge pass: fuses the resolved (live) and frozen textures into a new frozen
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
`,qr=`// AA present pass: resolve the linear-space accumulation texture to the swapchain.
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
`,Wr=`// One-shot bake of the per-neutral-texel AA sample-count target, derived from
// the distance estimate already stored in the converged neutral texture.
//
// Neutral layer layout (see mandelbrot_brush.wgsl):
//   layer 0 = iter  (> 0 escaped, == 0 interior/in-set)
//   layer 4 = distance_height = clamp(-log(DE_texels), -64, 64); high → near boundary.
//
// Result: target sample count in [1, antialiasLevel]. Smooth regions (interior,
// far exterior) get 1; boundary pixels ramp up to antialiasLevel.

struct AaParams {
  antialiasLevel: f32,
  aaSampleIndex: f32,   // unused here; shared buffer with the reseed pass
  screenHeightPx: f32,  // device-pixel screen height (1 neutral texel == 1 device px)
  aaLogDelta: f32,      // unused here; shared buffer with the reseed pass
  aaAnalytic: f32,      // unused here; shared buffer with the reseed pass
  _pad0: f32,
  _pad1: f32,
  _pad2: f32,
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
`,Zr=`// Selective AA reseed (Stage B): stamp iter = -1 (a fresh-compute request) on the
// neutral texels whose distance-estimation target sample count exceeds the current
// sample index — the thin boundary "sliver" — leaving every other texel frozen.
//
// Phase D (analytic AA): before stamping, escaped texels whose Taylor margin
// |z′|/(|z″|\xb7δ) passes the threshold are TAGGED analytic-OK instead (a +0.5
// fraction added to the AA target map; the integer part stays the sample-count
// target). Tagged texels are never re-iterated: the color pass expands their
// sample-0 payload ẑ(δᵢ) = z + z′δᵢ + \xbdz″δᵢ\xb2 per AA sample. The margin is
// evaluated ONCE, on the first reseed (pristine sample-0 payload), and the tag
// carries the decision for the whole accumulation — re-evaluating on later
// samples would race against margin-fail re-iterations (double-jitter).
//
// The in-place fused path then reconverges only the stamped texels with the new
// jitter, while frozen (escaped/interior/analytic) texels are skipped by its
// pass-through logic.
//
// Writes: raw layer 0 (iter) for stamped texels; the AA target map for tags.
// iter = -1 makes the in-place compute branch reinitialize z/dz/ref_i from
// scratch, so leaving the other layers stale is fine.

struct AaParams {
  antialiasLevel: f32,
  aaSampleIndex: f32,
  screenHeightPx: f32,  // unused here; shared buffer with the target bake pass
  aaLogDelta: f32,      // ln δ — sub-pixel jitter half-extent in c units
  aaAnalytic: f32,      // 1 = analytic AA enabled (auto mode, payload live)
  _pad0: f32,
  _pad1: f32,
  _pad2: f32,
};

struct FrontierStats {
  stamped: atomic<u32>,   // texels re-iterated this sample (the frontier)
  eligible: atomic<u32>,  // texels in the AA boundary band (target > sample idx)
};

// r32float read_write: the target map is read (gate + existing tag) and written
// (new tag) in the same dispatch — one storage binding, no sampled/storage
// subresource conflict.
@group(0) @binding(0) var aaTargetTex: texture_storage_2d<r32float, read_write>;
@group(0) @binding(1) var rawIterTex: texture_storage_2d<r32float, write>;
@group(0) @binding(2) var<uniform> params: AaParams;
// Raw layers 8..12 viewed as a 5-layer array (disjoint from the layer-0 storage
// view above): 0 = S, 1/2 = z′ mantissa, 3/4 = z″ mantissa.
@group(0) @binding(3) var payloadTex: texture_2d_array<f32>;
@group(0) @binding(4) var<storage, read_write> stats: FrontierStats;

const LN_MARGIN_THRESHOLD: f32 = 1.6094379; // ln 5

@compute @workgroup_size(16, 16)
fn cs_main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dim = textureDimensions(aaTargetTex);
  if (gid.x >= dim.x || gid.y >= dim.y) {
    return;
  }
  let coord = vec2<i32>(i32(gid.x), i32(gid.y));
  let tgtRaw = textureLoad(aaTargetTex, coord).r;
  let tgt = floor(tgtRaw);
  // Active sliver: target > current sample index → recompute (fresh jittered).
  // Frozen texels are left untouched (no store preserves their value).
  if (tgt > params.aaSampleIndex) {
    atomicAdd(&stats.eligible, 1u);
    if (params.aaAnalytic > 0.5) {
      // Already tagged analytic-OK on an earlier reseed: stay frozen.
      if (fract(tgtRaw) > 0.25) {
        return;
      }
      // First reseed only: decide from the pristine sample-0 payload.
      if (params.aaSampleIndex < 1.5) {
        let s = textureLoad(payloadTex, coord, 0, 0).r;
        let m1 = vec2<f32>(textureLoad(payloadTex, coord, 1, 0).r,
                           textureLoad(payloadTex, coord, 2, 0).r);
        let m2 = vec2<f32>(textureLoad(payloadTex, coord, 3, 0).r,
                           textureLoad(payloadTex, coord, 4, 0).r);
        // Margin in log space: ln|z′| − ln|z″| − S − ln δ > ln 5.
        // m1 = 0 (no payload / saturated fold) fails → honest re-iteration;
        // m2 = 0 (genuinely negligible z″) passes.
        let marginLog = log(max(length(m1), 1e-38)) - log(max(length(m2), 1e-38))
                      - s - params.aaLogDelta;
        if (length(m1) > 0.0 && marginLog > LN_MARGIN_THRESHOLD) {
          textureStore(aaTargetTex, coord, vec4<f32>(tgt + 0.5, 0.0, 0.0, 0.0));
          return;
        }
      }
    }
    atomicAdd(&stats.stamped, 1u);
    textureStore(rawIterTex, coord, vec4<f32>(-1.0, 0.0, 0.0, 0.0));
  }
}
`,Xr=async(t={},e)=>{let n;if(e.startsWith("data:")){const r=e.replace(/^data:.*?base64,/,"");let a;if(typeof Buffer=="function"&&typeof Buffer.from=="function")a=Buffer.from(r,"base64");else if(typeof atob=="function"){const i=atob(r);a=new Uint8Array(i.length);for(let o=0;o<i.length;o++)a[o]=i.charCodeAt(o)}else throw new Error("Cannot decode base64-encoded data URL");n=await WebAssembly.instantiate(a,t)}else{const r=await fetch(e),a=r.headers.get("Content-Type")||"";if("instantiateStreaming"in WebAssembly&&a.startsWith("application/wasm"))n=await WebAssembly.instantiateStreaming(r,t);else{const i=await r.arrayBuffer();n=await WebAssembly.instantiate(i,t)}}return n.instance.exports};let s;function Yr(t){s=t}let ot=null;function gt(){return(ot===null||ot.byteLength===0)&&(ot=new Uint8Array(s.memory.buffer)),ot}let mt=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0});mt.decode();const $r=0x7ff00000;let kt=0;function Kr(t,e){return kt+=e,kt>=$r&&(mt=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0}),mt.decode(),kt=e),mt.decode(gt().subarray(t,t+e))}function Kn(t,e){return t=t>>>0,Kr(t,e)}let ke=null;function Qr(){return(ke===null||ke.buffer.detached===!0||ke.buffer.detached===void 0&&ke.buffer!==s.memory.buffer)&&(ke=new DataView(s.memory.buffer)),ke}function He(t,e){t=t>>>0;const n=Qr(),r=[];for(let a=t;a<t+4*e;a+=4)r.push(s.__wbindgen_export_0.get(n.getUint32(a,!0)));return s.__externref_drop_slice(t,e),r}let st=null;function ea(){return(st===null||st.byteLength===0)&&(st=new Float64Array(s.memory.buffer)),st}function mn(t,e){return t=t>>>0,ea().subarray(t/8,t/8+e)}let X=0;const qe=new TextEncoder;"encodeInto"in qe||(qe.encodeInto=function(t,e){const n=qe.encode(t);return e.set(n),{read:t.length,written:n.length}});function re(t,e,n){if(n===void 0){const c=qe.encode(t),d=e(c.length,1)>>>0;return gt().subarray(d,d+c.length).set(c),X=c.length,d}let r=t.length,a=e(r,1)>>>0;const i=gt();let o=0;for(;o<r;o++){const c=t.charCodeAt(o);if(c>127)break;i[a+o]=c}if(o!==r){o!==0&&(t=t.slice(o)),a=n(a,r,r=o+t.length*3,1)>>>0;const c=gt().subarray(a+o,a+r),d=qe.encodeInto(t,c);o+=d.written,a=n(a,r,o,1)>>>0}return X=o,a}function be(t){return t==null}const bn=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(t=>s.__wbg_blabufferinfo_free(t>>>0,1));class Ze{static __wrap(e){e=e>>>0;const n=Object.create(Ze.prototype);return n.__wbg_ptr=e,bn.register(n,n.__wbg_ptr,n),n}__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,bn.unregister(this),e}free(){const e=this.__destroy_into_raw();s.__wbg_blabufferinfo_free(e,0)}get ptr(){return s.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr)>>>0}set ptr(e){s.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr,e)}get count(){return s.__wbg_get_blabufferinfo_count(this.__wbg_ptr)>>>0}set count(e){s.__wbg_set_blabufferinfo_count(this.__wbg_ptr,e)}get levels_ptr(){return s.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr)>>>0}set levels_ptr(e){s.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr,e)}get level_count(){return s.__wbg_get_blabufferinfo_level_count(this.__wbg_ptr)>>>0}set level_count(e){s.__wbg_set_blabufferinfo_level_count(this.__wbg_ptr,e)}}Symbol.dispose&&(Ze.prototype[Symbol.dispose]=Ze.prototype.free);typeof FinalizationRegistry>"u"||new FinalizationRegistry(t=>s.__wbg_blalevel_free(t>>>0,1));typeof FinalizationRegistry>"u"||new FinalizationRegistry(t=>s.__wbg_blastep_free(t>>>0,1));const vn=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(t=>s.__wbg_jetbufferinfo_free(t>>>0,1));class Xe{static __wrap(e){e=e>>>0;const n=Object.create(Xe.prototype);return n.__wbg_ptr=e,vn.register(n,n.__wbg_ptr,n),n}__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,vn.unregister(this),e}free(){const e=this.__destroy_into_raw();s.__wbg_jetbufferinfo_free(e,0)}get coeffs_ptr(){return s.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr)>>>0}set coeffs_ptr(e){s.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr,e)}get coeffs_count(){return s.__wbg_get_blabufferinfo_count(this.__wbg_ptr)>>>0}set coeffs_count(e){s.__wbg_set_blabufferinfo_count(this.__wbg_ptr,e)}get radii_ptr(){return s.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr)>>>0}set radii_ptr(e){s.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr,e)}get radii_count(){return s.__wbg_get_blabufferinfo_level_count(this.__wbg_ptr)>>>0}set radii_count(e){s.__wbg_set_blabufferinfo_level_count(this.__wbg_ptr,e)}get levels_ptr(){return s.__wbg_get_jetbufferinfo_levels_ptr(this.__wbg_ptr)>>>0}set levels_ptr(e){s.__wbg_set_blastep_ab_exp(this.__wbg_ptr,e)}get level_count(){return s.__wbg_get_jetbufferinfo_level_count(this.__wbg_ptr)>>>0}set level_count(e){s.__wbg_set_jetbufferinfo_level_count(this.__wbg_ptr,e)}}Symbol.dispose&&(Xe.prototype[Symbol.dispose]=Xe.prototype.free);const xn=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(t=>s.__wbg_mandelbrotnavigator_free(t>>>0,1));class qt{__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,xn.unregister(this),e}free(){const e=this.__destroy_into_raw();s.__wbg_mandelbrotnavigator_free(e,0)}get_params(){const e=s.mandelbrotnavigator_get_params(this.__wbg_ptr);var n=He(e[0],e[1]).slice();return s.__wbindgen_free(e[0],e[1]*4,4),n}use_unified(){s.mandelbrotnavigator_use_unified(this.__wbg_ptr)}find_minibrot(e,n){const r=s.mandelbrotnavigator_find_minibrot(this.__wbg_ptr,e,n);var a=He(r[0],r[1]).slice();return s.__wbindgen_free(r[0],r[1]*4,4),a}rotate_direct(e){s.mandelbrotnavigator_rotate_direct(this.__wbg_ptr,e)}view_floatexp(){const e=s.mandelbrotnavigator_view_floatexp(this.__wbg_ptr);var n=mn(e[0],e[1]).slice();return s.__wbindgen_free(e[0],e[1]*8,8),n}benchmark_pade(e){const n=s.mandelbrotnavigator_benchmark_pade(this.__wbg_ptr,e);return $e.__wrap(n)}get_bla_epsilon(){return s.mandelbrotnavigator_get_bla_epsilon(this.__wbg_ptr)}set_bla_epsilon(e){s.mandelbrotnavigator_set_bla_epsilon(this.__wbg_ptr,e)}get_max_bla_skip(){return s.mandelbrotnavigator_get_max_bla_skip(this.__wbg_ptr)>>>0}is_in_transition(){return s.mandelbrotnavigator_is_in_transition(this.__wbg_ptr)!==0}pixel_to_complex(e,n,r,a){const i=s.mandelbrotnavigator_pixel_to_complex(this.__wbg_ptr,e,n,r,a);var o=He(i[0],i[1]).slice();return s.__wbindgen_free(i[0],i[1]*4,4),o}reference_origin(e,n){const r=re(e,s.__wbindgen_malloc,s.__wbindgen_realloc),a=X,i=re(n,s.__wbindgen_malloc,s.__wbindgen_realloc),o=X;s.mandelbrotnavigator_reference_origin(this.__wbg_ptr,r,a,i,o)}set_max_bla_skip(e){s.mandelbrotnavigator_set_max_bla_skip(this.__wbg_ptr,e)}start_transition(e,n,r,a,i){const o=re(e,s.__wbindgen_malloc,s.__wbindgen_realloc),c=X,d=re(n,s.__wbindgen_malloc,s.__wbindgen_realloc),x=X,h=re(r,s.__wbindgen_malloc,s.__wbindgen_realloc),y=X;s.mandelbrotnavigator_start_transition(this.__wbg_ptr,o,c,d,x,h,y,a,i)}translate_direct(e,n,r,a){s.mandelbrotnavigator_translate_direct(this.__wbg_ptr,e,n,!be(r),be(r)?0:r,!be(a),be(a)?0:a)}use_mobius_cplus(){s.mandelbrotnavigator_use_mobius_cplus(this.__wbg_ptr)}use_perturbation(){s.mandelbrotnavigator_use_perturbation(this.__wbg_ptr)}cancel_transition(){s.mandelbrotnavigator_cancel_transition(this.__wbg_ptr)}coordinate_to_pixel(e,n,r,a){const i=re(e,s.__wbindgen_malloc,s.__wbindgen_realloc),o=X,c=re(n,s.__wbindgen_malloc,s.__wbindgen_realloc),d=X,x=s.mandelbrotnavigator_coordinate_to_pixel(this.__wbg_ptr,i,o,c,d,r,a);var h=mn(x[0],x[1]).slice();return s.__wbindgen_free(x[0],x[1]*8,8),h}unified_last_stages(){return s.mandelbrotnavigator_unified_last_stages(this.__wbg_ptr)>>>0}get_reference_params(){const e=s.mandelbrotnavigator_get_reference_params(this.__wbg_ptr);var n=He(e[0],e[1]).slice();return s.__wbindgen_free(e[0],e[1]*4,4),n}set_precision_budget(e){const n=re(e,s.__wbindgen_malloc,s.__wbindgen_realloc),r=X;s.mandelbrotnavigator_set_precision_budget(this.__wbg_ptr,n,r)}compute_jet_reference(e){const n=s.mandelbrotnavigator_compute_jet_reference(this.__wbg_ptr,e);return Xe.__wrap(n)}get_approximation_mode(){return s.mandelbrotnavigator_get_approximation_mode(this.__wbg_ptr)}get_reference_orbit_len(){return s.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr)>>>0}compute_mobius_reference(e){const n=s.mandelbrotnavigator_compute_mobius_reference(this.__wbg_ptr,e);return Ye.__wrap(n)}compute_bla_reference_ptr(e){const n=s.mandelbrotnavigator_compute_bla_reference_ptr(this.__wbg_ptr,e);return Ze.__wrap(n)}compute_unified_reference(e){const n=s.mandelbrotnavigator_compute_unified_reference(this.__wbg_ptr,e);return Ke.__wrap(n)}compute_reference_orbit_ptr(e){const n=s.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr,e);return Ie.__wrap(n)}get_reference_orbit_capacity(){return s.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr)>>>0}compute_reference_orbit_chunk(e,n){const r=s.mandelbrotnavigator_compute_reference_orbit_chunk(this.__wbg_ptr,e,n);return Ie.__wrap(r)}constructor(e,n,r,a){const i=re(e,s.__wbindgen_malloc,s.__wbindgen_realloc),o=X,c=re(n,s.__wbindgen_malloc,s.__wbindgen_realloc),d=X,x=re(r,s.__wbindgen_malloc,s.__wbindgen_realloc),h=X,y=s.mandelbrotnavigator_new(i,o,c,d,x,h,a);return this.__wbg_ptr=y>>>0,xn.register(this,this.__wbg_ptr,this),this}step(e,n){const r=s.mandelbrotnavigator_step(this.__wbg_ptr,!be(e),be(e)?0:e,!be(n),be(n)?0:n);var a=He(r[0],r[1]).slice();return s.__wbindgen_free(r[0],r[1]*4,4),a}zoom(e){s.mandelbrotnavigator_zoom(this.__wbg_ptr,e)}angle(e){s.mandelbrotnavigator_angle(this.__wbg_ptr,e)}scale(e){const n=re(e,s.__wbindgen_malloc,s.__wbindgen_realloc),r=X;s.mandelbrotnavigator_scale(this.__wbg_ptr,n,r)}origin(e,n){const r=re(e,s.__wbindgen_malloc,s.__wbindgen_realloc),a=X,i=re(n,s.__wbindgen_malloc,s.__wbindgen_realloc),o=X;s.mandelbrotnavigator_origin(this.__wbg_ptr,r,a,i,o)}rotate(e){s.mandelbrotnavigator_rotate(this.__wbg_ptr,e)}use_bla(){s.mandelbrotnavigator_use_bla(this.__wbg_ptr)}use_jet(){s.mandelbrotnavigator_use_jet(this.__wbg_ptr)}use_pade(){s.mandelbrotnavigator_use_pade(this.__wbg_ptr)}translate(e,n){s.mandelbrotnavigator_translate(this.__wbg_ptr,e,n)}}Symbol.dispose&&(qt.prototype[Symbol.dispose]=qt.prototype.free);typeof FinalizationRegistry>"u"||new FinalizationRegistry(t=>s.__wbg_mandelbrotstep_free(t>>>0,1));const yn=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(t=>s.__wbg_mobiusbufferinfo_free(t>>>0,1));class Ye{static __wrap(e){e=e>>>0;const n=Object.create(Ye.prototype);return n.__wbg_ptr=e,yn.register(n,n.__wbg_ptr,n),n}__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,yn.unregister(this),e}free(){const e=this.__destroy_into_raw();s.__wbg_mobiusbufferinfo_free(e,0)}get coeffs_ptr(){return s.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr)>>>0}set coeffs_ptr(e){s.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr,e)}get coeffs_count(){return s.__wbg_get_blabufferinfo_count(this.__wbg_ptr)>>>0}set coeffs_count(e){s.__wbg_set_blabufferinfo_count(this.__wbg_ptr,e)}get radii_ptr(){return s.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr)>>>0}set radii_ptr(e){s.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr,e)}get radii_count(){return s.__wbg_get_blabufferinfo_level_count(this.__wbg_ptr)>>>0}set radii_count(e){s.__wbg_set_blabufferinfo_level_count(this.__wbg_ptr,e)}get levels_ptr(){return s.__wbg_get_jetbufferinfo_levels_ptr(this.__wbg_ptr)>>>0}set levels_ptr(e){s.__wbg_set_blastep_ab_exp(this.__wbg_ptr,e)}get level_count(){return s.__wbg_get_jetbufferinfo_level_count(this.__wbg_ptr)>>>0}set level_count(e){s.__wbg_set_jetbufferinfo_level_count(this.__wbg_ptr,e)}}Symbol.dispose&&(Ye.prototype[Symbol.dispose]=Ye.prototype.free);const Sn=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(t=>s.__wbg_orbitbufferinfo_free(t>>>0,1));class Ie{static __wrap(e){e=e>>>0;const n=Object.create(Ie.prototype);return n.__wbg_ptr=e,Sn.register(n,n.__wbg_ptr,n),n}__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,Sn.unregister(this),e}free(){const e=this.__destroy_into_raw();s.__wbg_orbitbufferinfo_free(e,0)}get ptr(){return s.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr)>>>0}set ptr(e){s.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr,e)}get offset(){return s.__wbg_get_blabufferinfo_count(this.__wbg_ptr)>>>0}set offset(e){s.__wbg_set_blabufferinfo_count(this.__wbg_ptr,e)}get count(){return s.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr)>>>0}set count(e){s.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr,e)}}Symbol.dispose&&(Ie.prototype[Symbol.dispose]=Ie.prototype.free);const wn=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(t=>s.__wbg_padebenchmark_free(t>>>0,1));class $e{static __wrap(e){e=e>>>0;const n=Object.create($e.prototype);return n.__wbg_ptr=e,wn.register(n,n.__wbg_ptr,n),n}__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,wn.unregister(this),e}free(){const e=this.__destroy_into_raw();s.__wbg_padebenchmark_free(e,0)}get pixels(){return s.__wbg_get_padebenchmark_pixels(this.__wbg_ptr)>>>0}set pixels(e){s.__wbg_set_padebenchmark_pixels(this.__wbg_ptr,e)}get max_iter(){return s.__wbg_get_padebenchmark_max_iter(this.__wbg_ptr)>>>0}set max_iter(e){s.__wbg_set_padebenchmark_max_iter(this.__wbg_ptr,e)}get steps_exact(){return s.__wbg_get_padebenchmark_steps_exact(this.__wbg_ptr)}set steps_exact(e){s.__wbg_set_padebenchmark_steps_exact(this.__wbg_ptr,e)}get steps_affine(){return s.__wbg_get_padebenchmark_steps_affine(this.__wbg_ptr)}set steps_affine(e){s.__wbg_set_padebenchmark_steps_affine(this.__wbg_ptr,e)}get steps_pade(){return s.__wbg_get_padebenchmark_steps_pade(this.__wbg_ptr)}set steps_pade(e){s.__wbg_set_padebenchmark_steps_pade(this.__wbg_ptr,e)}get pade_mismatches(){return s.__wbg_get_padebenchmark_pade_mismatches(this.__wbg_ptr)>>>0}set pade_mismatches(e){s.__wbg_set_padebenchmark_pade_mismatches(this.__wbg_ptr,e)}get max_iter_delta(){return s.__wbg_get_padebenchmark_max_iter_delta(this.__wbg_ptr)>>>0}set max_iter_delta(e){s.__wbg_set_blastep_d_exp(this.__wbg_ptr,e)}}Symbol.dispose&&($e.prototype[Symbol.dispose]=$e.prototype.free);const zn=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(t=>s.__wbg_unifiedbufferinfo_free(t>>>0,1));class Ke{static __wrap(e){e=e>>>0;const n=Object.create(Ke.prototype);return n.__wbg_ptr=e,zn.register(n,n.__wbg_ptr,n),n}__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,zn.unregister(this),e}free(){const e=this.__destroy_into_raw();s.__wbg_unifiedbufferinfo_free(e,0)}get coeffs_ptr(){return s.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr)>>>0}set coeffs_ptr(e){s.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr,e)}get coeffs_count(){return s.__wbg_get_blabufferinfo_count(this.__wbg_ptr)>>>0}set coeffs_count(e){s.__wbg_set_blabufferinfo_count(this.__wbg_ptr,e)}get radii_ptr(){return s.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr)>>>0}set radii_ptr(e){s.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr,e)}get radii_count(){return s.__wbg_get_blabufferinfo_level_count(this.__wbg_ptr)>>>0}set radii_count(e){s.__wbg_set_blabufferinfo_level_count(this.__wbg_ptr,e)}get levels_ptr(){return s.__wbg_get_jetbufferinfo_levels_ptr(this.__wbg_ptr)>>>0}set levels_ptr(e){s.__wbg_set_blastep_ab_exp(this.__wbg_ptr,e)}get level_count(){return s.__wbg_get_jetbufferinfo_level_count(this.__wbg_ptr)>>>0}set level_count(e){s.__wbg_set_jetbufferinfo_level_count(this.__wbg_ptr,e)}}Symbol.dispose&&(Ke.prototype[Symbol.dispose]=Ke.prototype.free);function ta(t){return Math.exp(t)}function na(t){return Math.log(t)}function ra(){return Date.now()}function aa(t,e){throw new Error(Kn(t,e))}function ia(t,e){return Kn(t,e)}function oa(){const t=s.__wbindgen_export_0,e=t.grow(4);t.set(0,void 0),t.set(e+0,void 0),t.set(e+1,null),t.set(e+2,!0),t.set(e+3,!1)}URL=globalThis.URL;const l=await Xr({"./mandelbrot_bg.js":{__wbg_now_1e80617bcee43265:ra,__wbg_exp_9293ded1248e1bd3:ta,__wbg_log_5f75e13a39ba07fe:na,__wbg_wbindgenthrow_451ec1a8469d7eb6:aa,__wbindgen_init_externref_table:oa,__wbindgen_cast_2241b6af4c4b2941:ia}},Br),sa=l.memory,la=l.__wbg_blabufferinfo_free,ca=l.__wbg_blalevel_free,da=l.__wbg_blastep_free,fa=l.__wbg_get_blabufferinfo_count,ua=l.__wbg_get_blabufferinfo_level_count,pa=l.__wbg_get_blabufferinfo_levels_ptr,ha=l.__wbg_get_blabufferinfo_ptr,_a=l.__wbg_get_blastep_ab_exp,ga=l.__wbg_get_blastep_alpha_exp,ma=l.__wbg_get_blastep_ax,ba=l.__wbg_get_blastep_ay,va=l.__wbg_get_blastep_bx,xa=l.__wbg_get_blastep_by,ya=l.__wbg_get_blastep_d_exp,Sa=l.__wbg_get_blastep_dx,wa=l.__wbg_get_blastep_dy,za=l.__wbg_get_blastep_log2_min_a,Ma=l.__wbg_get_blastep_radius_alpha,Ta=l.__wbg_get_blastep_radius_beta,Ra=l.__wbg_get_jetbufferinfo_level_count,ka=l.__wbg_get_jetbufferinfo_levels_ptr,Ea=l.__wbg_get_padebenchmark_max_iter,Aa=l.__wbg_get_padebenchmark_max_iter_delta,La=l.__wbg_get_padebenchmark_pade_mismatches,Ba=l.__wbg_get_padebenchmark_pixels,Da=l.__wbg_get_padebenchmark_steps_affine,Ca=l.__wbg_get_padebenchmark_steps_exact,Ia=l.__wbg_get_padebenchmark_steps_pade,Pa=l.__wbg_jetbufferinfo_free,Fa=l.__wbg_mandelbrotnavigator_free,Oa=l.__wbg_mandelbrotstep_free,Ga=l.__wbg_mobiusbufferinfo_free,Ua=l.__wbg_orbitbufferinfo_free,Na=l.__wbg_padebenchmark_free,ja=l.__wbg_set_blabufferinfo_count,Ja=l.__wbg_set_blabufferinfo_level_count,Ha=l.__wbg_set_blabufferinfo_levels_ptr,Va=l.__wbg_set_blabufferinfo_ptr,qa=l.__wbg_set_blastep_ab_exp,Wa=l.__wbg_set_blastep_alpha_exp,Za=l.__wbg_set_blastep_ax,Xa=l.__wbg_set_blastep_ay,Ya=l.__wbg_set_blastep_bx,$a=l.__wbg_set_blastep_by,Ka=l.__wbg_set_blastep_d_exp,Qa=l.__wbg_set_blastep_dx,ei=l.__wbg_set_blastep_dy,ti=l.__wbg_set_blastep_log2_min_a,ni=l.__wbg_set_blastep_radius_alpha,ri=l.__wbg_set_blastep_radius_beta,ai=l.__wbg_set_jetbufferinfo_level_count,ii=l.__wbg_set_padebenchmark_max_iter,oi=l.__wbg_set_padebenchmark_pade_mismatches,si=l.__wbg_set_padebenchmark_pixels,li=l.__wbg_set_padebenchmark_steps_affine,ci=l.__wbg_set_padebenchmark_steps_exact,di=l.__wbg_set_padebenchmark_steps_pade,fi=l.__wbg_unifiedbufferinfo_free,ui=l.mandelbrotnavigator_angle,pi=l.mandelbrotnavigator_benchmark_pade,hi=l.mandelbrotnavigator_cancel_transition,_i=l.mandelbrotnavigator_compute_bla_reference_ptr,gi=l.mandelbrotnavigator_compute_jet_reference,mi=l.mandelbrotnavigator_compute_mobius_reference,bi=l.mandelbrotnavigator_compute_reference_orbit_chunk,vi=l.mandelbrotnavigator_compute_reference_orbit_ptr,xi=l.mandelbrotnavigator_compute_unified_reference,yi=l.mandelbrotnavigator_coordinate_to_pixel,Si=l.mandelbrotnavigator_find_minibrot,wi=l.mandelbrotnavigator_get_approximation_mode,zi=l.mandelbrotnavigator_get_bla_epsilon,Mi=l.mandelbrotnavigator_get_max_bla_skip,Ti=l.mandelbrotnavigator_get_params,Ri=l.mandelbrotnavigator_get_reference_orbit_capacity,ki=l.mandelbrotnavigator_get_reference_orbit_len,Ei=l.mandelbrotnavigator_get_reference_params,Ai=l.mandelbrotnavigator_is_in_transition,Li=l.mandelbrotnavigator_new,Bi=l.mandelbrotnavigator_origin,Di=l.mandelbrotnavigator_pixel_to_complex,Ci=l.mandelbrotnavigator_reference_origin,Ii=l.mandelbrotnavigator_rotate,Pi=l.mandelbrotnavigator_rotate_direct,Fi=l.mandelbrotnavigator_scale,Oi=l.mandelbrotnavigator_set_bla_epsilon,Gi=l.mandelbrotnavigator_set_max_bla_skip,Ui=l.mandelbrotnavigator_set_precision_budget,Ni=l.mandelbrotnavigator_start_transition,ji=l.mandelbrotnavigator_step,Ji=l.mandelbrotnavigator_translate,Hi=l.mandelbrotnavigator_translate_direct,Vi=l.mandelbrotnavigator_unified_last_stages,qi=l.mandelbrotnavigator_use_bla,Wi=l.mandelbrotnavigator_use_jet,Zi=l.mandelbrotnavigator_use_mobius_cplus,Xi=l.mandelbrotnavigator_use_pade,Yi=l.mandelbrotnavigator_use_perturbation,$i=l.mandelbrotnavigator_use_unified,Ki=l.mandelbrotnavigator_view_floatexp,Qi=l.mandelbrotnavigator_zoom,eo=l.__wbg_set_blalevel_count,to=l.__wbg_set_blalevel_max_radius_bits,no=l.__wbg_set_blalevel_offset,ro=l.__wbg_set_blalevel_skip,ao=l.__wbg_set_jetbufferinfo_coeffs_count,io=l.__wbg_set_jetbufferinfo_coeffs_ptr,oo=l.__wbg_set_jetbufferinfo_levels_ptr,so=l.__wbg_set_jetbufferinfo_radii_count,lo=l.__wbg_set_jetbufferinfo_radii_ptr,co=l.__wbg_set_mandelbrotstep_pad0,fo=l.__wbg_set_mandelbrotstep_pad1,uo=l.__wbg_set_mandelbrotstep_zx,po=l.__wbg_set_mandelbrotstep_zy,ho=l.__wbg_set_mobiusbufferinfo_coeffs_count,_o=l.__wbg_set_mobiusbufferinfo_coeffs_ptr,go=l.__wbg_set_mobiusbufferinfo_level_count,mo=l.__wbg_set_mobiusbufferinfo_levels_ptr,bo=l.__wbg_set_mobiusbufferinfo_radii_count,vo=l.__wbg_set_mobiusbufferinfo_radii_ptr,xo=l.__wbg_set_orbitbufferinfo_count,yo=l.__wbg_set_orbitbufferinfo_offset,So=l.__wbg_set_orbitbufferinfo_ptr,wo=l.__wbg_set_padebenchmark_max_iter_delta,zo=l.__wbg_set_unifiedbufferinfo_coeffs_count,Mo=l.__wbg_set_unifiedbufferinfo_coeffs_ptr,To=l.__wbg_set_unifiedbufferinfo_level_count,Ro=l.__wbg_set_unifiedbufferinfo_levels_ptr,ko=l.__wbg_set_unifiedbufferinfo_radii_count,Eo=l.__wbg_set_unifiedbufferinfo_radii_ptr,Ao=l.__wbg_get_blalevel_count,Lo=l.__wbg_get_blalevel_max_radius_bits,Bo=l.__wbg_get_blalevel_offset,Do=l.__wbg_get_blalevel_skip,Co=l.__wbg_get_jetbufferinfo_coeffs_count,Io=l.__wbg_get_jetbufferinfo_coeffs_ptr,Po=l.__wbg_get_jetbufferinfo_radii_count,Fo=l.__wbg_get_jetbufferinfo_radii_ptr,Oo=l.__wbg_get_mobiusbufferinfo_coeffs_count,Go=l.__wbg_get_mobiusbufferinfo_coeffs_ptr,Uo=l.__wbg_get_mobiusbufferinfo_level_count,No=l.__wbg_get_mobiusbufferinfo_levels_ptr,jo=l.__wbg_get_mobiusbufferinfo_radii_count,Jo=l.__wbg_get_mobiusbufferinfo_radii_ptr,Ho=l.__wbg_get_orbitbufferinfo_count,Vo=l.__wbg_get_orbitbufferinfo_offset,qo=l.__wbg_get_orbitbufferinfo_ptr,Wo=l.__wbg_get_unifiedbufferinfo_coeffs_count,Zo=l.__wbg_get_unifiedbufferinfo_coeffs_ptr,Xo=l.__wbg_get_unifiedbufferinfo_level_count,Yo=l.__wbg_get_unifiedbufferinfo_levels_ptr,$o=l.__wbg_get_unifiedbufferinfo_radii_count,Ko=l.__wbg_get_unifiedbufferinfo_radii_ptr,Qo=l.__wbg_get_mandelbrotstep_pad0,es=l.__wbg_get_mandelbrotstep_pad1,ts=l.__wbg_get_mandelbrotstep_zx,ns=l.__wbg_get_mandelbrotstep_zy,rs=l.__wbindgen_export_0,as=l.__externref_drop_slice,is=l.__wbindgen_free,os=l.__wbindgen_malloc,ss=l.__wbindgen_realloc,Qn=l.__wbindgen_start,ls=Object.freeze(Object.defineProperty({__proto__:null,__externref_drop_slice:as,__wbg_blabufferinfo_free:la,__wbg_blalevel_free:ca,__wbg_blastep_free:da,__wbg_get_blabufferinfo_count:fa,__wbg_get_blabufferinfo_level_count:ua,__wbg_get_blabufferinfo_levels_ptr:pa,__wbg_get_blabufferinfo_ptr:ha,__wbg_get_blalevel_count:Ao,__wbg_get_blalevel_max_radius_bits:Lo,__wbg_get_blalevel_offset:Bo,__wbg_get_blalevel_skip:Do,__wbg_get_blastep_ab_exp:_a,__wbg_get_blastep_alpha_exp:ga,__wbg_get_blastep_ax:ma,__wbg_get_blastep_ay:ba,__wbg_get_blastep_bx:va,__wbg_get_blastep_by:xa,__wbg_get_blastep_d_exp:ya,__wbg_get_blastep_dx:Sa,__wbg_get_blastep_dy:wa,__wbg_get_blastep_log2_min_a:za,__wbg_get_blastep_radius_alpha:Ma,__wbg_get_blastep_radius_beta:Ta,__wbg_get_jetbufferinfo_coeffs_count:Co,__wbg_get_jetbufferinfo_coeffs_ptr:Io,__wbg_get_jetbufferinfo_level_count:Ra,__wbg_get_jetbufferinfo_levels_ptr:ka,__wbg_get_jetbufferinfo_radii_count:Po,__wbg_get_jetbufferinfo_radii_ptr:Fo,__wbg_get_mandelbrotstep_pad0:Qo,__wbg_get_mandelbrotstep_pad1:es,__wbg_get_mandelbrotstep_zx:ts,__wbg_get_mandelbrotstep_zy:ns,__wbg_get_mobiusbufferinfo_coeffs_count:Oo,__wbg_get_mobiusbufferinfo_coeffs_ptr:Go,__wbg_get_mobiusbufferinfo_level_count:Uo,__wbg_get_mobiusbufferinfo_levels_ptr:No,__wbg_get_mobiusbufferinfo_radii_count:jo,__wbg_get_mobiusbufferinfo_radii_ptr:Jo,__wbg_get_orbitbufferinfo_count:Ho,__wbg_get_orbitbufferinfo_offset:Vo,__wbg_get_orbitbufferinfo_ptr:qo,__wbg_get_padebenchmark_max_iter:Ea,__wbg_get_padebenchmark_max_iter_delta:Aa,__wbg_get_padebenchmark_pade_mismatches:La,__wbg_get_padebenchmark_pixels:Ba,__wbg_get_padebenchmark_steps_affine:Da,__wbg_get_padebenchmark_steps_exact:Ca,__wbg_get_padebenchmark_steps_pade:Ia,__wbg_get_unifiedbufferinfo_coeffs_count:Wo,__wbg_get_unifiedbufferinfo_coeffs_ptr:Zo,__wbg_get_unifiedbufferinfo_level_count:Xo,__wbg_get_unifiedbufferinfo_levels_ptr:Yo,__wbg_get_unifiedbufferinfo_radii_count:$o,__wbg_get_unifiedbufferinfo_radii_ptr:Ko,__wbg_jetbufferinfo_free:Pa,__wbg_mandelbrotnavigator_free:Fa,__wbg_mandelbrotstep_free:Oa,__wbg_mobiusbufferinfo_free:Ga,__wbg_orbitbufferinfo_free:Ua,__wbg_padebenchmark_free:Na,__wbg_set_blabufferinfo_count:ja,__wbg_set_blabufferinfo_level_count:Ja,__wbg_set_blabufferinfo_levels_ptr:Ha,__wbg_set_blabufferinfo_ptr:Va,__wbg_set_blalevel_count:eo,__wbg_set_blalevel_max_radius_bits:to,__wbg_set_blalevel_offset:no,__wbg_set_blalevel_skip:ro,__wbg_set_blastep_ab_exp:qa,__wbg_set_blastep_alpha_exp:Wa,__wbg_set_blastep_ax:Za,__wbg_set_blastep_ay:Xa,__wbg_set_blastep_bx:Ya,__wbg_set_blastep_by:$a,__wbg_set_blastep_d_exp:Ka,__wbg_set_blastep_dx:Qa,__wbg_set_blastep_dy:ei,__wbg_set_blastep_log2_min_a:ti,__wbg_set_blastep_radius_alpha:ni,__wbg_set_blastep_radius_beta:ri,__wbg_set_jetbufferinfo_coeffs_count:ao,__wbg_set_jetbufferinfo_coeffs_ptr:io,__wbg_set_jetbufferinfo_level_count:ai,__wbg_set_jetbufferinfo_levels_ptr:oo,__wbg_set_jetbufferinfo_radii_count:so,__wbg_set_jetbufferinfo_radii_ptr:lo,__wbg_set_mandelbrotstep_pad0:co,__wbg_set_mandelbrotstep_pad1:fo,__wbg_set_mandelbrotstep_zx:uo,__wbg_set_mandelbrotstep_zy:po,__wbg_set_mobiusbufferinfo_coeffs_count:ho,__wbg_set_mobiusbufferinfo_coeffs_ptr:_o,__wbg_set_mobiusbufferinfo_level_count:go,__wbg_set_mobiusbufferinfo_levels_ptr:mo,__wbg_set_mobiusbufferinfo_radii_count:bo,__wbg_set_mobiusbufferinfo_radii_ptr:vo,__wbg_set_orbitbufferinfo_count:xo,__wbg_set_orbitbufferinfo_offset:yo,__wbg_set_orbitbufferinfo_ptr:So,__wbg_set_padebenchmark_max_iter:ii,__wbg_set_padebenchmark_max_iter_delta:wo,__wbg_set_padebenchmark_pade_mismatches:oi,__wbg_set_padebenchmark_pixels:si,__wbg_set_padebenchmark_steps_affine:li,__wbg_set_padebenchmark_steps_exact:ci,__wbg_set_padebenchmark_steps_pade:di,__wbg_set_unifiedbufferinfo_coeffs_count:zo,__wbg_set_unifiedbufferinfo_coeffs_ptr:Mo,__wbg_set_unifiedbufferinfo_level_count:To,__wbg_set_unifiedbufferinfo_levels_ptr:Ro,__wbg_set_unifiedbufferinfo_radii_count:ko,__wbg_set_unifiedbufferinfo_radii_ptr:Eo,__wbg_unifiedbufferinfo_free:fi,__wbindgen_export_0:rs,__wbindgen_free:is,__wbindgen_malloc:os,__wbindgen_realloc:ss,__wbindgen_start:Qn,mandelbrotnavigator_angle:ui,mandelbrotnavigator_benchmark_pade:pi,mandelbrotnavigator_cancel_transition:hi,mandelbrotnavigator_compute_bla_reference_ptr:_i,mandelbrotnavigator_compute_jet_reference:gi,mandelbrotnavigator_compute_mobius_reference:mi,mandelbrotnavigator_compute_reference_orbit_chunk:bi,mandelbrotnavigator_compute_reference_orbit_ptr:vi,mandelbrotnavigator_compute_unified_reference:xi,mandelbrotnavigator_coordinate_to_pixel:yi,mandelbrotnavigator_find_minibrot:Si,mandelbrotnavigator_get_approximation_mode:wi,mandelbrotnavigator_get_bla_epsilon:zi,mandelbrotnavigator_get_max_bla_skip:Mi,mandelbrotnavigator_get_params:Ti,mandelbrotnavigator_get_reference_orbit_capacity:Ri,mandelbrotnavigator_get_reference_orbit_len:ki,mandelbrotnavigator_get_reference_params:Ei,mandelbrotnavigator_is_in_transition:Ai,mandelbrotnavigator_new:Li,mandelbrotnavigator_origin:Bi,mandelbrotnavigator_pixel_to_complex:Di,mandelbrotnavigator_reference_origin:Ci,mandelbrotnavigator_rotate:Ii,mandelbrotnavigator_rotate_direct:Pi,mandelbrotnavigator_scale:Fi,mandelbrotnavigator_set_bla_epsilon:Oi,mandelbrotnavigator_set_max_bla_skip:Gi,mandelbrotnavigator_set_precision_budget:Ui,mandelbrotnavigator_start_transition:Ni,mandelbrotnavigator_step:ji,mandelbrotnavigator_translate:Ji,mandelbrotnavigator_translate_direct:Hi,mandelbrotnavigator_unified_last_stages:Vi,mandelbrotnavigator_use_bla:qi,mandelbrotnavigator_use_jet:Wi,mandelbrotnavigator_use_mobius_cplus:Zi,mandelbrotnavigator_use_pade:Xi,mandelbrotnavigator_use_perturbation:Yi,mandelbrotnavigator_use_unified:$i,mandelbrotnavigator_view_floatexp:Ki,mandelbrotnavigator_zoom:Qi,memory:sa},Symbol.toStringTag,{value:"Module"}));Yr(ls);Qn();class cs{video;stream=null;width;height;lastDrawTime=0;open=!1;constructor(e=1024,n=1024){this.width=e,this.height=n,this.video=document.createElement("video"),this.video.autoplay=!0,this.video.playsInline=!0,this.video.muted=!0,this.video.width=e,this.video.height=n}isOpen(){return this.open}async openWebcam(){if(!this.open)try{this.stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:this.width},height:{ideal:this.height}}}),this.video.srcObject=this.stream,await this.video.play(),this.width=this.video.videoWidth||this.width,this.height=this.video.videoHeight||this.height,this.open=!0}catch(e){this.stream=null,this.open=!1,console.warn("Webcam unavailable:",e)}}async drawWebGPUTexture(e,n){if(!this.open)return;const r=performance.now();if(r-this.lastDrawTime>15){if(this.video.readyState<HTMLMediaElement.HAVE_CURRENT_DATA)return;const a=Math.min(this.width,e.width),i=Math.min(this.height,e.height);n.queue.copyExternalImageToTexture({source:this.video},{texture:e},[a,i]),this.lastDrawTime=r}}closeWebcam(){this.stream&&(this.stream.getTracks().forEach(e=>e.stop()),this.stream=null),this.open=!1}}function Fe(t,e,n){t.prototype=e.prototype=n,n.constructor=t}function nt(t,e){var n=Object.create(t.prototype);for(var r in e)n[r]=e[r];return n}function ye(){}var Te=.7,Pe=1/Te,De="\\s*([+-]?\\d+)\\s*",Qe="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*",de="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*",ds=/^#([0-9a-f]{3,8})$/,fs=new RegExp(`^rgb\\(${De},${De},${De}\\)$`),us=new RegExp(`^rgb\\(${de},${de},${de}\\)$`),ps=new RegExp(`^rgba\\(${De},${De},${De},${Qe}\\)$`),hs=new RegExp(`^rgba\\(${de},${de},${de},${Qe}\\)$`),_s=new RegExp(`^hsl\\(${Qe},${de},${de}\\)$`),gs=new RegExp(`^hsla\\(${Qe},${de},${de},${Qe}\\)$`),Mn={aliceblue:0xf0f8ff,antiquewhite:0xfaebd7,aqua:65535,aquamarine:8388564,azure:0xf0ffff,beige:0xf5f5dc,bisque:0xffe4c4,black:0,blanchedalmond:0xffebcd,blue:255,blueviolet:9055202,brown:0xa52a2a,burlywood:0xdeb887,cadetblue:6266528,chartreuse:8388352,chocolate:0xd2691e,coral:0xff7f50,cornflowerblue:6591981,cornsilk:0xfff8dc,crimson:0xdc143c,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:0xb8860b,darkgray:0xa9a9a9,darkgreen:25600,darkgrey:0xa9a9a9,darkkhaki:0xbdb76b,darkmagenta:9109643,darkolivegreen:5597999,darkorange:0xff8c00,darkorchid:0x9932cc,darkred:9109504,darksalmon:0xe9967a,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:0xff1493,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:0xb22222,floralwhite:0xfffaf0,forestgreen:2263842,fuchsia:0xff00ff,gainsboro:0xdcdcdc,ghostwhite:0xf8f8ff,gold:0xffd700,goldenrod:0xdaa520,gray:8421504,green:32768,greenyellow:0xadff2f,grey:8421504,honeydew:0xf0fff0,hotpink:0xff69b4,indianred:0xcd5c5c,indigo:4915330,ivory:0xfffff0,khaki:0xf0e68c,lavender:0xe6e6fa,lavenderblush:0xfff0f5,lawngreen:8190976,lemonchiffon:0xfffacd,lightblue:0xadd8e6,lightcoral:0xf08080,lightcyan:0xe0ffff,lightgoldenrodyellow:0xfafad2,lightgray:0xd3d3d3,lightgreen:9498256,lightgrey:0xd3d3d3,lightpink:0xffb6c1,lightsalmon:0xffa07a,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:0xb0c4de,lightyellow:0xffffe0,lime:65280,limegreen:3329330,linen:0xfaf0e6,magenta:0xff00ff,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:0xba55d3,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:0xc71585,midnightblue:1644912,mintcream:0xf5fffa,mistyrose:0xffe4e1,moccasin:0xffe4b5,navajowhite:0xffdead,navy:128,oldlace:0xfdf5e6,olive:8421376,olivedrab:7048739,orange:0xffa500,orangered:0xff4500,orchid:0xda70d6,palegoldenrod:0xeee8aa,palegreen:0x98fb98,paleturquoise:0xafeeee,palevioletred:0xdb7093,papayawhip:0xffefd5,peachpuff:0xffdab9,peru:0xcd853f,pink:0xffc0cb,plum:0xdda0dd,powderblue:0xb0e0e6,purple:8388736,rebeccapurple:6697881,red:0xff0000,rosybrown:0xbc8f8f,royalblue:4286945,saddlebrown:9127187,salmon:0xfa8072,sandybrown:0xf4a460,seagreen:3050327,seashell:0xfff5ee,sienna:0xa0522d,silver:0xc0c0c0,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:0xfffafa,springgreen:65407,steelblue:4620980,tan:0xd2b48c,teal:32896,thistle:0xd8bfd8,tomato:0xff6347,turquoise:4251856,violet:0xee82ee,wheat:0xf5deb3,white:0xffffff,whitesmoke:0xf5f5f5,yellow:0xffff00,yellowgreen:0x9acd32};Fe(ye,nn,{copy(t){return Object.assign(new this.constructor,this,t)},displayable(){return this.rgb().displayable()},hex:Tn,formatHex:Tn,formatHex8:ms,formatHsl:bs,formatRgb:Rn,toString:Rn});function Tn(){return this.rgb().formatHex()}function ms(){return this.rgb().formatHex8()}function bs(){return er(this).formatHsl()}function Rn(){return this.rgb().formatRgb()}function nn(t){var e,n;return t=(t+"").trim().toLowerCase(),(e=ds.exec(t))?(n=e[1].length,e=parseInt(e[1],16),n===6?kn(e):n===3?new V(e>>8&15|e>>4&240,e>>4&15|e&240,(e&15)<<4|e&15,1):n===8?lt(e>>24&255,e>>16&255,e>>8&255,(e&255)/255):n===4?lt(e>>12&15|e>>8&240,e>>8&15|e>>4&240,e>>4&15|e&240,((e&15)<<4|e&15)/255):null):(e=fs.exec(t))?new V(e[1],e[2],e[3],1):(e=us.exec(t))?new V(e[1]*255/100,e[2]*255/100,e[3]*255/100,1):(e=ps.exec(t))?lt(e[1],e[2],e[3],e[4]):(e=hs.exec(t))?lt(e[1]*255/100,e[2]*255/100,e[3]*255/100,e[4]):(e=_s.exec(t))?Ln(e[1],e[2]/100,e[3]/100,1):(e=gs.exec(t))?Ln(e[1],e[2]/100,e[3]/100,e[4]):Mn.hasOwnProperty(t)?kn(Mn[t]):t==="transparent"?new V(NaN,NaN,NaN,0):null}function kn(t){return new V(t>>16&255,t>>8&255,t&255,1)}function lt(t,e,n,r){return r<=0&&(t=e=n=NaN),new V(t,e,n,r)}function rn(t){return t instanceof ye||(t=nn(t)),t?(t=t.rgb(),new V(t.r,t.g,t.b,t.opacity)):new V}function xe(t,e,n,r){return arguments.length===1?rn(t):new V(t,e,n,r??1)}function V(t,e,n,r){this.r=+t,this.g=+e,this.b=+n,this.opacity=+r}Fe(V,xe,nt(ye,{brighter(t){return t=t==null?Pe:Math.pow(Pe,t),new V(this.r*t,this.g*t,this.b*t,this.opacity)},darker(t){return t=t==null?Te:Math.pow(Te,t),new V(this.r*t,this.g*t,this.b*t,this.opacity)},rgb(){return this},clamp(){return new V(ze(this.r),ze(this.g),ze(this.b),xt(this.opacity))},displayable(){return-.5<=this.r&&this.r<255.5&&-.5<=this.g&&this.g<255.5&&-.5<=this.b&&this.b<255.5&&0<=this.opacity&&this.opacity<=1},hex:En,formatHex:En,formatHex8:vs,formatRgb:An,toString:An}));function En(){return`#${we(this.r)}${we(this.g)}${we(this.b)}`}function vs(){return`#${we(this.r)}${we(this.g)}${we(this.b)}${we((isNaN(this.opacity)?1:this.opacity)*255)}`}function An(){const t=xt(this.opacity);return`${t===1?"rgb(":"rgba("}${ze(this.r)}, ${ze(this.g)}, ${ze(this.b)}${t===1?")":`, ${t})`}`}function xt(t){return isNaN(t)?1:Math.max(0,Math.min(1,t))}function ze(t){return Math.max(0,Math.min(255,Math.round(t)||0))}function we(t){return t=ze(t),(t<16?"0":"")+t.toString(16)}function Ln(t,e,n,r){return r<=0?t=e=n=NaN:n<=0||n>=1?t=e=NaN:e<=0&&(t=NaN),new se(t,e,n,r)}function er(t){if(t instanceof se)return new se(t.h,t.s,t.l,t.opacity);if(t instanceof ye||(t=nn(t)),!t)return new se;if(t instanceof se)return t;t=t.rgb();var e=t.r/255,n=t.g/255,r=t.b/255,a=Math.min(e,n,r),i=Math.max(e,n,r),o=NaN,c=i-a,d=(i+a)/2;return c?(e===i?o=(n-r)/c+(n<r)*6:n===i?o=(r-e)/c+2:o=(e-n)/c+4,c/=d<.5?i+a:2-i-a,o*=60):c=d>0&&d<1?0:o,new se(o,c,d,t.opacity)}function Wt(t,e,n,r){return arguments.length===1?er(t):new se(t,e,n,r??1)}function se(t,e,n,r){this.h=+t,this.s=+e,this.l=+n,this.opacity=+r}Fe(se,Wt,nt(ye,{brighter(t){return t=t==null?Pe:Math.pow(Pe,t),new se(this.h,this.s,this.l*t,this.opacity)},darker(t){return t=t==null?Te:Math.pow(Te,t),new se(this.h,this.s,this.l*t,this.opacity)},rgb(){var t=this.h%360+(this.h<0)*360,e=isNaN(t)||isNaN(this.s)?0:this.s,n=this.l,r=n+(n<.5?n:1-n)*e,a=2*n-r;return new V(Et(t>=240?t-240:t+120,a,r),Et(t,a,r),Et(t<120?t+240:t-120,a,r),this.opacity)},clamp(){return new se(Bn(this.h),ct(this.s),ct(this.l),xt(this.opacity))},displayable(){return(0<=this.s&&this.s<=1||isNaN(this.s))&&0<=this.l&&this.l<=1&&0<=this.opacity&&this.opacity<=1},formatHsl(){const t=xt(this.opacity);return`${t===1?"hsl(":"hsla("}${Bn(this.h)}, ${ct(this.s)*100}%, ${ct(this.l)*100}%${t===1?")":`, ${t})`}`}}));function Bn(t){return t=(t||0)%360,t<0?t+360:t}function ct(t){return Math.max(0,Math.min(1,t||0))}function Et(t,e,n){return(t<60?e+(n-e)*t/60:t<180?n:t<240?e+(n-e)*(240-t)/60:e)*255}const tr=Math.PI/180,nr=180/Math.PI,yt=18,rr=.96422,ar=1,ir=.82521,or=4/29,Ce=6/29,sr=3*Ce*Ce,xs=Ce*Ce*Ce;function lr(t){if(t instanceof fe)return new fe(t.l,t.a,t.b,t.opacity);if(t instanceof he)return cr(t);t instanceof V||(t=rn(t));var e=Dt(t.r),n=Dt(t.g),r=Dt(t.b),a=At((.2225045*e+.7168786*n+.0606169*r)/ar),i,o;return e===n&&n===r?i=o=a:(i=At((.4360747*e+.3850649*n+.1430804*r)/rr),o=At((.0139322*e+.0971045*n+.7141733*r)/ir)),new fe(116*a-16,500*(i-a),200*(a-o),t.opacity)}function Zt(t,e,n,r){return arguments.length===1?lr(t):new fe(t,e,n,r??1)}function fe(t,e,n,r){this.l=+t,this.a=+e,this.b=+n,this.opacity=+r}Fe(fe,Zt,nt(ye,{brighter(t){return new fe(this.l+yt*(t??1),this.a,this.b,this.opacity)},darker(t){return new fe(this.l-yt*(t??1),this.a,this.b,this.opacity)},rgb(){var t=(this.l+16)/116,e=isNaN(this.a)?t:t+this.a/500,n=isNaN(this.b)?t:t-this.b/200;return e=rr*Lt(e),t=ar*Lt(t),n=ir*Lt(n),new V(Bt(3.1338561*e-1.6168667*t-.4906146*n),Bt(-.9787684*e+1.9161415*t+.033454*n),Bt(.0719453*e-.2289914*t+1.4052427*n),this.opacity)}}));function At(t){return t>xs?Math.pow(t,1/3):t/sr+or}function Lt(t){return t>Ce?t*t*t:sr*(t-or)}function Bt(t){return 255*(t<=.0031308?12.92*t:1.055*Math.pow(t,1/2.4)-.055)}function Dt(t){return(t/=255)<=.04045?t/12.92:Math.pow((t+.055)/1.055,2.4)}function ys(t){if(t instanceof he)return new he(t.h,t.c,t.l,t.opacity);if(t instanceof fe||(t=lr(t)),t.a===0&&t.b===0)return new he(NaN,0<t.l&&t.l<100?0:NaN,t.l,t.opacity);var e=Math.atan2(t.b,t.a)*nr;return new he(e<0?e+360:e,Math.sqrt(t.a*t.a+t.b*t.b),t.l,t.opacity)}function Xt(t,e,n,r){return arguments.length===1?ys(t):new he(t,e,n,r??1)}function he(t,e,n,r){this.h=+t,this.c=+e,this.l=+n,this.opacity=+r}function cr(t){if(isNaN(t.h))return new fe(t.l,0,0,t.opacity);var e=t.h*tr;return new fe(t.l,Math.cos(e)*t.c,Math.sin(e)*t.c,t.opacity)}Fe(he,Xt,nt(ye,{brighter(t){return new he(this.h,this.c,this.l+yt*(t??1),this.opacity)},darker(t){return new he(this.h,this.c,this.l-yt*(t??1),this.opacity)},rgb(){return cr(this).rgb()}}));var dr=-.14861,an=1.78277,on=-.29227,St=-.90649,et=1.97294,Dn=et*St,Cn=et*an,In=an*on-St*dr;function Ss(t){if(t instanceof Me)return new Me(t.h,t.s,t.l,t.opacity);t instanceof V||(t=rn(t));var e=t.r/255,n=t.g/255,r=t.b/255,a=(In*r+Dn*e-Cn*n)/(In+Dn-Cn),i=r-a,o=(et*(n-a)-on*i)/St,c=Math.sqrt(o*o+i*i)/(et*a*(1-a)),d=c?Math.atan2(o,i)*nr-120:NaN;return new Me(d<0?d+360:d,c,a,t.opacity)}function Yt(t,e,n,r){return arguments.length===1?Ss(t):new Me(t,e,n,r??1)}function Me(t,e,n,r){this.h=+t,this.s=+e,this.l=+n,this.opacity=+r}Fe(Me,Yt,nt(ye,{brighter(t){return t=t==null?Pe:Math.pow(Pe,t),new Me(this.h,this.s,this.l*t,this.opacity)},darker(t){return t=t==null?Te:Math.pow(Te,t),new Me(this.h,this.s,this.l*t,this.opacity)},rgb(){var t=isNaN(this.h)?0:(this.h+120)*tr,e=+this.l,n=isNaN(this.s)?0:this.s*e*(1-e),r=Math.cos(t),a=Math.sin(t);return new V(255*(e+n*(dr*r+an*a)),255*(e+n*(on*r+St*a)),255*(e+n*(et*r)),this.opacity)}}));const sn=t=>()=>t;function fr(t,e){return function(n){return t+n*e}}function ws(t,e,n){return t=Math.pow(t,n),e=Math.pow(e,n)-t,n=1/n,function(r){return Math.pow(t+r*e,n)}}function ln(t,e){var n=e-t;return n?fr(t,n>180||n<-180?n-360*Math.round(n/360):n):sn(isNaN(t)?e:t)}function zs(t){return(t=+t)==1?Y:function(e,n){return n-e?ws(e,n,t):sn(isNaN(e)?n:e)}}function Y(t,e){var n=e-t;return n?fr(t,n):sn(isNaN(t)?e:t)}const Ms=(function t(e){var n=zs(e);function r(a,i){var o=n((a=xe(a)).r,(i=xe(i)).r),c=n(a.g,i.g),d=n(a.b,i.b),x=Y(a.opacity,i.opacity);return function(h){return a.r=o(h),a.g=c(h),a.b=d(h),a.opacity=x(h),a+""}}return r.gamma=t,r})(1);function Ts(t){return function(e,n){var r=t((e=Wt(e)).h,(n=Wt(n)).h),a=Y(e.s,n.s),i=Y(e.l,n.l),o=Y(e.opacity,n.opacity);return function(c){return e.h=r(c),e.s=a(c),e.l=i(c),e.opacity=o(c),e+""}}}const Rs=Ts(ln);function ur(t,e){var n=Y((t=Zt(t)).l,(e=Zt(e)).l),r=Y(t.a,e.a),a=Y(t.b,e.b),i=Y(t.opacity,e.opacity);return function(o){return t.l=n(o),t.a=r(o),t.b=a(o),t.opacity=i(o),t+""}}function ks(t){return function(e,n){var r=t((e=Xt(e)).h,(n=Xt(n)).h),a=Y(e.c,n.c),i=Y(e.l,n.l),o=Y(e.opacity,n.opacity);return function(c){return e.h=r(c),e.c=a(c),e.l=i(c),e.opacity=o(c),e+""}}}const Es=ks(ln);function pr(t){return(function e(n){n=+n;function r(a,i){var o=t((a=Yt(a)).h,(i=Yt(i)).h),c=Y(a.s,i.s),d=Y(a.l,i.l),x=Y(a.opacity,i.opacity);return function(h){return a.h=o(h),a.s=c(h),a.l=d(Math.pow(h,n)),a.opacity=x(h),a+""}}return r.gamma=e,r})(1)}const As=pr(ln);pr(Y);const hr=["palette","zebra","tessellation","shading","skybox","webcam","smoothness","stripeAverage","rotationMean","stripeRelief","directionCoherenceRelief","shadingLevel","specularPower","metallic","roughness","anisotropy","iridescencePower"],tt={palette:{label:"Color Blend",defaultValue:1,min:0,max:1,step:.01,unit:"",textureRow:0,textureChannel:3,uiGroup:"color"},zebra:{label:"Iteration Bands",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:1,textureChannel:0,uiGroup:"iteration"},tessellation:{label:"Image Blend",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:1,textureChannel:1,uiGroup:"imageSources"},shading:{label:"Lighting Blend",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:1,textureChannel:2,uiGroup:"lighting"},skybox:{label:"Reflection Blend",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:1,textureChannel:3,uiGroup:"lighting"},webcam:{label:"Webcam Blend",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:2,textureChannel:0,uiGroup:"imageSources"},smoothness:{label:"Smooth Iterations",defaultValue:1,min:0,max:1,step:.01,unit:"",textureRow:2,textureChannel:1,uiGroup:"iteration"},stripeAverage:{label:"Stripe Average",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:5,textureChannel:0,uiGroup:"iteration"},rotationMean:{label:"Direction Coherence",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:5,textureChannel:1,uiGroup:"iteration"},stripeRelief:{label:"Stripe Relief",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:5,textureChannel:2,uiGroup:"iteration"},directionCoherenceRelief:{label:"Direction Relief",defaultValue:0,min:0,max:100,step:.1,unit:"",textureRow:5,textureChannel:3,uiGroup:"iteration"},shadingLevel:{label:"Light Intensity",defaultValue:0,min:0,max:3,step:.05,unit:"",textureRow:2,textureChannel:2,uiGroup:"lighting"},specularPower:{label:"Specular Strength",defaultValue:0,min:1,max:64,step:.5,unit:"",textureRow:2,textureChannel:3,uiGroup:"lighting"},metallic:{label:"Metalness",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:3,textureChannel:1,uiGroup:"lighting"},roughness:{label:"Roughness",defaultValue:0,min:.02,max:1,step:.01,unit:"",textureRow:3,textureChannel:2,uiGroup:"lighting"},anisotropy:{label:"Anisotropy",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:3,textureChannel:3,uiGroup:"lighting"},iridescencePower:{label:"Iridescence Strength",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:4,textureChannel:3,uiGroup:"iridescence"}},$t=Object.fromEntries(hr.map(t=>[t,tt[t].defaultValue])),Ct={};for(const t of hr){const e=tt[t].uiGroup;Ct[e]||(Ct[e]=[]),Ct[e].push(t)}const Ls=["linear","gaussian","square","exponential"];function Bs(t){return typeof t=="string"&&Ls.includes(t)}function It(t){return Bs(t.transferCurve)?t.transferCurve:"linear"}function Pt(t,e){const n=Ds(e);switch(t){case"gaussian":{if(n<=.28)return 0;if(n>=.72)return 1;const i=(n-.28)/(.72-.28);return i*i*(3-2*i)}case"square":return n<=0?0:1;case"exponential":return(Math.exp(3*n)-1)/(Math.exp(3)-1);default:return n}}function pe(t,e){return t[e]??$t[e]}function Ds(t){return Math.max(0,Math.min(1,t))}const Cs={lab:ur,rgb:Ms,hcl:Es,hsl:Rs,cubehelix:As},Pn=4096,Is=6,Kt=[];{const t=new Map;for(const e of Object.keys(tt)){const{textureRow:n}=tt[e];n===0||n===4||(t.has(n)||t.set(n,[]),t.get(n).push(e))}for(const[e,n]of t)Kt.push({row:e,fields:n});Kt.sort((e,n)=>e.row-n.row)}function Ps(t,e,n,r){const a=pe(t,n),i=pe(e,n);return a+(i-a)*r}function Fn(t,e){return t[e]??null}class On{points;interpolate;constructor(e,n="lab"){this.points=e.slice().sort((r,a)=>r.position-a.position),this.interpolate=Cs[n]??ur}getColorAt(e){if(this.points.length===0)return"#000";if(e<=this.points[0].position)return this.points[0].color;if(e>=this.points[this.points.length-1].position)return this.points[this.points.length-1].color;for(let n=0;n<this.points.length-1;++n){const r=this.points[n],a=this.points[n+1];if(e>=r.position&&e<=a.position){const i=(e-r.position)/(a.position-r.position),o=Pt(It(r),i),c=this.interpolate(r.color,a.color);return xe(c(o)).formatHex()}}return"#000"}getEffectAt(e,n){if(this.points.length===0)return $t[n];if(e<=this.points[0].position)return pe(this.points[0],n);if(e>=this.points[this.points.length-1].position)return pe(this.points[this.points.length-1],n);for(let r=0;r<this.points.length-1;++r){const a=this.points[r],i=this.points[r+1];if(e>=a.position&&e<=i.position){const o=(e-a.position)/(i.position-a.position),c=Pt(It(a),o);return Ps(a,i,n,c)}}return $t[n]}getIridescenceAt(e){if(this.points.length===0)return{color:"#000000",strength:0};if(this.points.length===1)return{color:this.points[0].iridescenceColor??this.points[0].color,strength:this.points[0].iridescenceColor?pe(this.points[0],"iridescencePower"):0};const n=this.points[0],r=this.points[this.points.length-1];if(e<=n.position)return{color:n.iridescenceColor??n.color,strength:n.iridescenceColor?pe(n,"iridescencePower"):0};if(e>=r.position)return{color:r.iridescenceColor??r.color,strength:r.iridescenceColor?pe(r,"iridescencePower"):0};for(let a=0;a<this.points.length-1;++a){const i=this.points[a],o=this.points[a+1];if(e>=i.position&&e<=o.position){const c=(e-i.position)/(o.position-i.position),d=Pt(It(i),c),x=Fn(i,"iridescenceColor"),h=Fn(o,"iridescenceColor");if(!x&&!h)return{color:"#000000",strength:0};const y=x??i.color,w=h??o.color,S=x?pe(i,"iridescencePower"):0,p=h?pe(o,"iridescencePower"):0,g=S+(p-S)*d;return{color:xe(this.interpolate(y,w)(d)).formatHex(),strength:g}}}return{color:"#000000",strength:0}}generateTexture(){const e=Pn,n=Is,r=new Float32Array(e*n*4);for(let a=0;a<e;++a){const i=a/(e-1),o=xe(this.getColorAt(i)),c=(0*e+a)*4;r[c]=(o.r??0)/255,r[c+1]=(o.g??0)/255,r[c+2]=(o.b??0)/255,r[c+3]=this.getEffectAt(i,"palette");for(const{row:y,fields:w}of Kt){const S=(y*e+a)*4;for(const p of w){const g=tt[p].textureChannel;r[S+g]=this.getEffectAt(i,p)}}const d=this.getIridescenceAt(i),x=xe(d.color),h=(4*e+a)*4;r[h]=(x.r??0)/255,r[h+1]=(x.g??0)/255,r[h+2]=(x.b??0)/255,r[h+3]=Math.max(0,Math.min(1,d.strength))}return{data:r,width:e,height:n}}generateThumbnailRow(){const e=Pn,n=new ImageData(e,1),r=n.data;for(let a=0;a<e;++a){const i=a/(e-1),o=xe(this.getColorAt(i)),c=a*4;r[c]=Math.max(0,Math.min(255,Math.round(o.r??0))),r[c+1]=Math.max(0,Math.min(255,Math.round(o.g??0))),r[c+2]=Math.max(0,Math.min(255,Math.round(o.b??0))),r[c+3]=255}return n}}const Fs=-100;function dt(t){if(!Number.isFinite(t)||t===0)return{mantissa:0,exponent:0};let e=t,n=0;Math.abs(e)<22250738585072014e-324&&(e*=2**64,n-=64);const r=Math.floor(Math.log2(Math.abs(e)))+1;for(e/=2**r,n+=r;Math.abs(e)>=1;)e*=.5,n+=1;for(;Math.abs(e)<.5;)e*=2,n-=1;let a=Math.fround(e);return Math.abs(a)>=1&&(a*=.5,n+=1),{mantissa:a,exponent:n}}const Os=3.321928094887362;function _r(t){if(t=t.trim(),t.length===0)return null;let e=1;t[0]==="-"?(e=-1,t=t.slice(1)):t[0]==="+"&&(t=t.slice(1));let n=0;const r=t.search(/[eE]/);if(r>=0){const S=parseInt(t.slice(r+1),10);if(!Number.isFinite(S))return null;n=S,t=t.slice(0,r)}const a=t.indexOf("."),i=a>=0?t.slice(0,a):t,o=a>=0?t.slice(a+1):"";if(!/^[0-9]*$/.test(i)||!/^[0-9]*$/.test(o)||i+o==="")return null;const c=i+o,d=i.length;let x=-1;for(let S=0;S<c.length;S++)if(c[S]!=="0"){x=S;break}if(x<0)return{sign:1,m10:0,d:0};const h=c.slice(x,x+18),y=parseFloat(h[0]+"."+h.slice(1)),w=d-1-x+n;return{sign:e,m10:y,d:w}}function gr(t){const e=_r(t);return!e||e.m10===0?-1/0:(Math.log10(e.m10)+e.d)*Os}function Ft(t){const e=_r(t);if(!e||e.m10===0)return{mantissa:0,exponent:0};const n=gr(t);let r=Math.floor(n),a=2**(n-r);a*=.5,r+=1;let i=Math.fround(a*e.sign);return Math.abs(i)>=1&&(i*=.5,r+=1),{mantissa:i,exponent:r}}function Z(t){return t.kind==="reprojecting"}function ft(t){return t.kind==="reprojecting"?t.frozenScale:0}function ve(t){return t.kind==="reprojecting"?t.liveScale:0}function Gs(t){return t.kind==="reprojecting"&&t.referenceResetDuringZoom}function Us(t,e,n){switch(t.kind){case"idle":return Ns(t,e,n);case"reprojecting":return js(t,e,n)}}function Ns(t,e,n){const r=[];switch(e.type){case"referenceReset":return e.orbitWasReset&&!e.muChanged&&r.push({type:"copyResolvedToFrozen"}),r.push({type:"clearHistoryNextFrame"}),{state:t,effects:r};case"scaleChanged":if(e.scale!==e.prevScale){const a=e.scale<e.prevScale,i=e.prevScale,o=a?i/n.threshold:i*n.threshold;return r.push({type:"copyResolvedToFrozen"}),r.push({type:"clearHistoryNextFrame"}),{state:{kind:"reprojecting",frozenScale:i,liveScale:o,zoomingIn:a,referenceResetDuringZoom:!1},effects:r}}return{state:t,effects:r};case"scaleStable":return{state:t,effects:r}}}function js(t,e,n){const r=[];switch(e.type){case"referenceReset":return e.muChanged?{state:{kind:"idle"},effects:[{type:"clearHistoryNextFrame"}]}:(r.push({type:"clearHistoryNextFrame"}),{state:{...t,referenceResetDuringZoom:!0},effects:r});case"scaleChanged":{let a=t;t.referenceResetDuringZoom&&(a={...t,referenceResetDuringZoom:!1});const i=a.frozenScale/e.scale;if((a.zoomingIn?i>=n.threshold:i<=1/n.threshold)&&!a.referenceResetDuringZoom){const c=a.liveScale,d=a.zoomingIn?e.scale/n.threshold:e.scale*n.threshold;return r.push({type:"copyResolvedToFrozen"}),r.push({type:"clearHistoryNextFrame"}),{state:{kind:"reprojecting",frozenScale:c,liveScale:d,zoomingIn:a.zoomingIn,referenceResetDuringZoom:!1},effects:r}}return{state:a,effects:r}}case"scaleStable":return t.referenceResetDuringZoom||r.push({type:"mergeResolvedAndFrozen"}),r.push({type:"clearHistoryNextFrame"}),{state:{kind:"idle"},effects:r}}}function Gn(){return{kind:"idle"}}function Un(t,e,n,r){const a=typeof t=="number"&&Number.isFinite(t)?t:e,i=2**Math.floor(Math.log2(Math.max(1,Math.floor(a))));return Math.min(Math.max(i,n),r)}function Js(t){if(t<=0)return{x:0,y:0};const e=1.2207440846057596,n=1/e,r=1/(e*e),a=t*n%1,i=t*r%1,o=c=>{const d=2*c-1;return d===0?0:d/Math.sqrt(Math.abs(d))-Math.sign(d)};return{x:o(a),y:o(i)}}const Hs=.01,Vs=100,qs=["screenXWithDepth","screenYWithDepth","dragonScaleU","derivativeAngleSin","screenX","screenY","iterSmooth","distance"],Ws={screenXWithDepth:0,screenYWithDepth:1,dragonScaleU:2,derivativeAngleSin:3,screenX:4,screenY:5,iterSmooth:7,distance:8},bt={xVariable:"screenXWithDepth",yVariable:"screenYWithDepth",xScale:1,yScale:1,mirrored:!1},Zs={xVariable:"dragonScaleU",yVariable:"derivativeAngleSin",xScale:1,yScale:1,mirrored:!0},Xs=new Set(qs);function Qt(t){return{...t}}function Ys(t){return typeof t=="string"&&Xs.has(t)}function Nn(t,e){return t==="argZ"?"derivativeAngleSin":t==="iterRaw"?"iterSmooth":Ys(t)?t:e}function jn(t){const e=typeof t=="number"&&Number.isFinite(t)?t:1;return Math.min(Vs,Math.max(Hs,e))}function mr(t){if(!t||typeof t!="object")return Qt(bt);const e=t;return{xVariable:Nn(e.xVariable,bt.xVariable),yVariable:Nn(e.yVariable,bt.yVariable),xScale:jn(e.xScale),yScale:jn(e.yScale),mirrored:!!e.mirrored}}function $s(t){return Qt(t===1?Zs:bt)}function Ot(t){return t.textureMapping?mr(t.textureMapping):$s(t.textureMappingMode)}function Jn(t){return Ws[t]??0}const Ks=["loop","sine","pulse","stepped"],Qs=["paletteOffset","heightPaletteShift","lightAngle","textureDrift","skyReflectionDrift","phaseColoring","varnish","microBump","displacement","tessellation"],br=[{id:"paletteOffset",label:"Palette Offset",defaultType:"loop",defaultSpeed:.8,defaultAmplitude:1,minAmplitude:0,maxAmplitude:1,amplitudeStep:.01,unit:"cycle"},{id:"heightPaletteShift",label:"Height Palette Shift",defaultType:"sine",defaultSpeed:.25,defaultAmplitude:20,minAmplitude:0,maxAmplitude:100,amplitudeStep:.5,unit:""},{id:"lightAngle",label:"Light Angle",defaultType:"loop",defaultSpeed:.15,defaultAmplitude:1,minAmplitude:0,maxAmplitude:1,amplitudeStep:.01,unit:"turn"},{id:"textureDrift",label:"Texture Drift",defaultType:"sine",defaultSpeed:1,defaultAmplitude:1,minAmplitude:0,maxAmplitude:2,amplitudeStep:.01,unit:""},{id:"skyReflectionDrift",label:"Sky Reflection Drift",defaultType:"sine",defaultSpeed:.6,defaultAmplitude:1,minAmplitude:0,maxAmplitude:2,amplitudeStep:.01,unit:""},{id:"phaseColoring",label:"Phase Coloring",defaultType:"pulse",defaultSpeed:.3,defaultAmplitude:25,minAmplitude:0,maxAmplitude:100,amplitudeStep:.5,unit:""},{id:"varnish",label:"Varnish",defaultType:"pulse",defaultSpeed:.22,defaultAmplitude:2,minAmplitude:0,maxAmplitude:10,amplitudeStep:.05,unit:""},{id:"microBump",label:"Micro Bump",defaultType:"pulse",defaultSpeed:.35,defaultAmplitude:.5,minAmplitude:0,maxAmplitude:2,amplitudeStep:.01,unit:""},{id:"displacement",label:"Displacement",defaultType:"sine",defaultSpeed:.2,defaultAmplitude:.02,minAmplitude:0,maxAmplitude:.1,amplitudeStep:.001,unit:""},{id:"tessellation",label:"Tessellation",defaultType:"sine",defaultSpeed:.18,defaultAmplitude:2,minAmplitude:0,maxAmplitude:10,amplitudeStep:.1,unit:""}];new Map(br.map(t=>[t.id,t]));function Ve(t,e){return typeof t=="number"&&Number.isFinite(t)?t:e}function el(t,e){return Ks.includes(t)?t:e}function tl(t){return{enabled:t.id==="paletteOffset",type:t.defaultType,speed:t.defaultSpeed,amplitude:t.defaultAmplitude,phase:0}}function nl(t=1){const e=Object.fromEntries(br.map(n=>[n.id,tl(n)]));return{globalSpeed:Ve(t,1),tracks:e}}function vt(t,e){const n=nl(e),r=t?.tracks,a=Object.fromEntries(Qs.map(i=>{const o=n.tracks[i],c=r?.[i];return[i,{enabled:typeof c?.enabled=="boolean"?c.enabled:o.enabled,type:el(c?.type,o.type),speed:Ve(c?.speed,o.speed),amplitude:Ve(c?.amplitude,o.amplitude),phase:Ve(c?.phase,o.phase??0)}]}));return{globalSpeed:Ve(t?.globalSpeed,n.globalSpeed),tracks:a}}const Gt=13,Ee=8,ut=100,rl=1e4,al=.001,Ut=12,pt=27,Hn=4,il=15,Nt=1e6,ol=64,en=Math.PI*2,sl=5e6,jt=10,Vn=.25,Jt=3,ll=3,ht=.001;function cl(t){return t.some(e=>(e.stripeAverage??0)>ht||(e.rotationMean??0)>ht||(e.stripeRelief??0)>ht||(e.directionCoherenceRelief??0)>ht)}const vr=new Float32Array(1),dl=new Uint32Array(vr.buffer);function fl(t){vr[0]=t;const e=dl[0],n=e>>>16&32768,r=(e>>>23&255)-127,a=e&8388607;if(r>=16)return n|31744;if(r>=-14){const i=r+15;return n|i<<10|a>>>13}if(r>=-24){const i=-14-r;return n|(a|8388608)>>>13+i}return n}function qn(t){const e=new Uint16Array(t.length);for(let n=0;n<t.length;++n)e[n]=fl(t[n]);return e}function Se(t,e,n){return Math.min(Math.max(t,e),n)}function ul(t,e,n){const r=t.phase??0,a=e*t.speed*n+r;switch(t.type){case"loop":return a-Math.floor(a);case"pulse":return .5+.5*Math.sin(a*en);case"stepped":return Math.floor((a-Math.floor(a))*8)/Math.max(1,7)*2-1;default:return Math.sin(a*en)}}function oe(t,e,n){return t.enabled?ul(t,e,n)*t.amplitude:0}function Wn(t,e,n,r){return oe({...t,phase:(t.phase??0)+r},e,n)}class cn{snapshotCallback;snapshotDestWidth;canvas;device;queue;adapter;ctx;format;mandelbrotNavigator;rawTexture;rawArrayView;rawIterStorageView;rawPayloadView;rawBrushTexture;rawBrushArrayView;resolvedTexture;resolvedArrayView;resolvedLayerViews=[];frozenTexture;frozenArrayView;frozenLayerViews=[];pipelineMerge;bindGroupMerge;uniformBufferMerge;uniformBufferMandelbrot;uniformBufferColor;uniformBufferBrush;uniformBufferResolve;mandelbrotReferenceBuffer;mandelbrotBlaBuffer;mandelbrotBlaLevelBuffer;mandelbrotJetBuffer;mandelbrotJetRadiiBuffer;mandelbrotJetLevelBuffer;mandelbrotBlaBufferCapacity=0;mandelbrotBlaLevelBufferCapacity=0;mandelbrotJetBufferCapacity=0;mandelbrotJetRadiiBufferCapacity=0;mandelbrotJetLevelBufferCapacity=0;pipelineResolve;bindGroupResolve;pipelineColor;bindGroupColor;pipelineColorAccumClear;pipelineColorAccum;pipelinePresent;bindGroupPresent;accumTexture;accumTextureView;aaTargetTexture;aaTargetTextureView;pipelineAaTarget;bindGroupAaTarget;uniformBufferAaTarget;pipelineAaReseed;bindGroupAaReseed;useAaSelectiveReseed=!0;pipelineInplace;inplacePipelineCache=new Map;inplaceModule;inplacePipelineLayout;inplaceBindGroupLayout;bindGroupInplace;pipelineReprojectCs;bindGroupReprojectCs;bindGroupColorRaw;resolveSkipped=!1;lastRawMutationFrame=0;counterSampleFrame=-1;counterBuffer;workStatsBuffer;counterReadbackSlots=[];counterReadbackWriteIndex=0;counterReadbackSequence=0;latestAppliedCounterReadbackSequence=0;counterReadbackGeneration=0;renderFrameSerial=0;lastCounterDispatchFrame=-Jt;unfinishedPixelCount=-1;activePixelCount=-1;realizedSkip=-1;workgroupWaste=-1;maxPixelSteps=-1;realLoopStepsApprox=-1;tierAppsApprox=[-1,-1,-1,-1];lastTableBuildMs=-1;lastTableBuildStages=-1;workStatsSessionSerial=0;workStatsClearedSession=-1;finalStatsBuffer;finalStatsPending=!1;_rafId=null;_drawFn=null;fps=0;isRendering=!1;gpuFrameTimeMs=0;smoothedGpuTimeMs=0;pendingGpuTiming=!1;refinementWasGated=!1;_fpsFrameCount=0;_fpsLastTime=0;_lastDrawMs=0;neutralSize=0;shaderPassColor;f16Supported=!1;width=0;height=0;antialiasLevel;palettePeriod;previousMandelbrot;previousRenderOptions;previousOrbitMetricsEnabled;needRender=!0;orbitIncomplete=!1;prevGuardedMaxIter=0;currentGuardedMaxIter=0;currentMaxIterations=0;currentReferenceAvailableIter=0;currentReferenceRemainingIter=0;isReferenceValidating=!1;referenceResetSerial=0;referenceResetFlashUntil=0;currentBlaLevelCount=0;currentBlockTableKind=null;approximationMode="perturbation";blaEpsilon=al;maxBlaSkip=65536;precisionBudget="1e-30";pendingMinibrotResolve=null;lastCompletionWallMs=0;lastCompletionGpuMs=0;lastCompletionTotalApps=-1;lastShaderApproxFlag=0;lastShaderBlaLevelCount=0;completionStartMs=0;completionAccumulatedGpuMs=0;completionTimerActive=!1;referenceWorker;referenceJobId=0;referenceAvailableOrbitLen=0;referenceBlaReadyMaxIterations=0;referenceWorkerFailed=!1;referenceWorkerReady=!1;pendingWorkerMessages=[];referenceViewKey="";referenceWorkerCx="";referenceWorkerCy="";floatExpActive=!1;debugShadingActive=!1;debugViewMode=0;debugViewOverride=0;pipelineDebug;bindGroupDebug;referenceOrbitWasReset=!1;activeRef=null;stagingRef=null;skipRenderOnce=!1;get pendingRefActive(){return this.stagingRef!==null}get pendingRefOrbitLen(){return this.stagingRef?.orbitLen??0}get pendingRefMaxIterations(){return this.stagingRef?Math.min(this.currentMaxIterations,Nt):0}prevFrameMandelbrot;clearHistoryNextFrame=!1;_prevFrameScaleChanged=!1;aaActive=!1;aaSampleIndex=0;aaAccumulatedSamples=0;aaOffsetX=0;aaOffsetY=0;aaReseedPending=!1;rawJittered=!1;aaAuto=!1;aaAnalyticEnabled=!0;aaFrontierStamped=-1;aaFrontierEligible=-1;aaFrontierBuffer;aaFrontierReadback;aaFrontierMapPending=!1;cumulativeShiftX=0;cumulativeShiftY=0;zoomMagnificationThreshold=16;zoomState={kind:"idle"};needFreezeSnapshot=!1;needMergeSnapshot=!1;mergeUniforms={zf:1,lzf:1,frozenShiftU:0,frozenShiftV:0,aspect:1,angle:0};frozenBaseShiftX=0;frozenBaseShiftY=0;frozenPanShiftX=0;frozenPanShiftY=0;frozenAligned=!1;iterationBatchSize=ut;tileTexture;tileTextureView;skyboxTexture;skyboxTextureView;tileTextureSourceKey;skyboxTextureSourceKey;paletteTexture;paletteTextureView;paletteSampler;skyboxSampler;webcamTexture;webcamTileTexture;webcamTextureView;webcamEnabled=!0;time=0;lastUpdateTime=0;dprMultiplier=1;targetFps=60;gpuLoadMultiplier=1;constructor(e,n){this.canvas=e,this.shaderPassColor=jr,this.antialiasLevel=n.antialiasLevel,this.palettePeriod=n.palettePeriod,this.time=0}postReferenceWorker(e){return!this.referenceWorker||this.referenceWorkerFailed?!1:e.type==="dispose"?(this.referenceWorker.postMessage(e),!0):this.referenceWorkerReady?(this.referenceWorker.postMessage(e),!0):(this.pendingWorkerMessages.push(e),!0)}markReferenceReset(e=this.currentMaxIterations){this.referenceResetSerial++,this.referenceResetFlashUntil=performance.now()+900,this.referenceAvailableOrbitLen=0,this.currentReferenceAvailableIter=0,this.currentReferenceRemainingIter=e,this.currentGuardedMaxIter=0,this.orbitIncomplete=!0}stagingReady(){const e=this.stagingRef;if(!e)return!1;if(!this.activeRef)return!0;const n=Math.min(this.currentMaxIterations,Nt-1);return e.orbitLen-1>=n}promoteStagingReference(){const e=this.stagingRef;if(!e)return;if(this.mandelbrotReferenceBuffer){let r=0;for(const a of e.chunks)a.length>0&&this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer,r*Float32Array.BYTES_PER_ELEMENT,a,0,a.length),r+=a.length}e.chunks=[],e.bla?(this.writeBlockTable(e.bla),this.currentBlaLevelCount=e.bla.levelCount,this.referenceBlaReadyMaxIterations=e.bla.maxIterations):(this.currentBlaLevelCount=0,this.referenceBlaReadyMaxIterations=0),this.activeRef=e,this.stagingRef=null,this.referenceWorkerCx=e.cx,this.referenceWorkerCy=e.cy,this.mandelbrotNavigator.reference_origin(e.cx,e.cy),this.referenceAvailableOrbitLen=e.orbitLen;const n=Math.max(0,e.orbitLen-1);this.currentReferenceAvailableIter=n,this.currentReferenceRemainingIter=Math.max(0,this.currentMaxIterations-n),this.currentGuardedMaxIter=Math.min(this.currentMaxIterations,n),this.isReferenceValidating=!1,this.orbitIncomplete=!this.referenceWorkerFailed&&n<this.currentMaxIterations,this.referenceResetSerial++,this.referenceResetFlashUntil=performance.now()+900,this.referenceOrbitWasReset=!0,this.invalidateCounterReadback(),this.needRender=!0,this.skipRenderOnce=!0}initializeReferenceWorker(){this.referenceWorker?.terminate(),this.referenceWorker=new Worker(new URL("/mandelbrot/presentation/assets/referenceWorker-DVvzR5FQ.js",import.meta.url),{type:"module"}),this.referenceWorker.onmessage=e=>{this.handleReferenceWorkerMessage(e.data)},this.referenceWorker.onerror=e=>{console.error("Reference worker error:",e.message),this.referenceWorkerFailed=!0,this.orbitIncomplete=!1,this.currentBlaLevelCount=0},this.referenceWorkerFailed=!1,this.referenceWorkerReady=!1,this.pendingWorkerMessages=[],this.referenceAvailableOrbitLen=0,this.referenceBlaReadyMaxIterations=0,this.activeRef=null,this.stagingRef=null,this.referenceJobId++}resetReference(e,n){console.log("[REF] Engine.resetReference (teleport)",e.slice(0,14)),this.mandelbrotNavigator&&this.mandelbrotNavigator.reference_origin(e,n),this.activeRef=null,this.stagingRef=null,this.referenceViewKey="",this.needRender=!0}resetReferenceJob(e,n,r){console.log("[REF] resetReferenceJob -> worker reset",e.cx.slice(0,14),"scale",n.slice(0,10),"maxIter",r,"inPlace",!!this.activeRef),this.stagingRef=null,this.activeRef||(this.markReferenceReset(r),this.referenceBlaReadyMaxIterations=0,this.currentBlaLevelCount=0,this.referenceOrbitWasReset=!0,this.referenceWorkerCx="",this.referenceWorkerCy=""),this.isReferenceValidating=!0,this.referenceViewKey="",this.referenceJobId++,this.postReferenceWorker({type:"reset",jobId:this.referenceJobId,cx:e.cx,cy:e.cy,scale:n,angle:e.angle,approximationMode:this.approximationMode,blaEpsilon:this.blaEpsilon,maxBlaSkip:this.maxBlaSkip,maxIterations:r,precisionBudget:this.precisionBudget})}syncReferenceWorkerView(e,n,r){const a=`${e.cx}
${e.cy}
${n}
${e.angle}
${r}`;a!==this.referenceViewKey&&(this.referenceViewKey=a,this.isReferenceValidating=!0,this.orbitIncomplete=!0,this.needRender=!0,this.postReferenceWorker({type:"updateView",jobId:this.referenceJobId,cx:e.cx,cy:e.cy,scale:n,angle:e.angle,maxIterations:r}))}handleReferenceWorkerMessage(e){if(e.type==="minibrotFound"){const n=this.pendingMinibrotResolve;this.pendingMinibrotResolve=null,n?.({status:e.status,cx:e.cx,cy:e.cy,period:e.period});return}if(e.type==="ready"){this.referenceWorkerReady=!0;const n=this.pendingWorkerMessages;this.pendingWorkerMessages=[];for(const r of n)this.referenceWorker?.postMessage(r);return}if(e.jobId===this.referenceJobId){if(e.type==="error"){console.error("Reference worker error:",e.message),this.referenceWorkerFailed=!0,this.orbitIncomplete=!1,this.currentBlaLevelCount=0;return}if(e.type==="orbitChunk"){const n=this.activeRef,r=this.stagingRef;if(n&&e.refId===n.refId){e.orbit.length>0&&this.mandelbrotReferenceBuffer&&this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer,e.offset*2*Float32Array.BYTES_PER_ELEMENT,e.orbit,0,e.orbit.length),n.orbitLen=e.count,this.referenceAvailableOrbitLen=e.count;const a=Math.max(0,e.count-1);this.currentReferenceAvailableIter=a,this.currentReferenceRemainingIter=Math.max(0,this.currentMaxIterations-a),this.isReferenceValidating=!1,this.currentGuardedMaxIter=Math.min(this.currentMaxIterations,a);const i=this.orbitIncomplete;this.orbitIncomplete=!this.referenceWorkerFailed&&a<this.currentMaxIterations,(this.orbitIncomplete||i)&&(this.needRender=!0);return}if(r&&e.refId===r.refId){if(e.offset!==r.orbitLen)return;r.chunks.push(e.orbit),r.orbitLen=e.count,this.isReferenceValidating=!1;return}if(e.refId>Math.max(r?.refId??0,n?.refId??0)&&e.offset===0){console.log("[REF] staging new reference refId=",e.refId,"ref=",e.referenceCx.slice(0,14)),this.stagingRef={refId:e.refId,cx:e.referenceCx,cy:e.referenceCy,orbitLen:e.count,chunks:[e.orbit],bla:null},this.isReferenceValidating=!1;return}return}this.activeRef&&e.refId===this.activeRef.refId?(this.writeBlockTable(e),this.currentBlaLevelCount=e.levelCount,this.referenceBlaReadyMaxIterations=e.maxIterations,e.buildMs!==void 0&&(this.lastTableBuildMs=e.buildMs,this.lastTableBuildStages=e.buildStages??-1),this.isReferenceValidating=!1,this.needRender=!0,this.invalidateCounterReadback(!0)):this.stagingRef&&e.refId===this.stagingRef.refId&&(this.stagingRef.bla={kind:e.kind,steps:e.steps,radii:e.radii,levels:e.levels,levelCount:e.levelCount,maxIterations:e.maxIterations})}}async initialize(e){if(this.mandelbrotNavigator=e,this.approximationMode=this.mandelbrotNavigator.get_approximation_mode()===5?"auto":this.mandelbrotNavigator.get_approximation_mode()===4?"mobius":this.mandelbrotNavigator.get_approximation_mode()===3?"jet":this.mandelbrotNavigator.get_approximation_mode()===2?"pade":this.mandelbrotNavigator.get_approximation_mode()===1?"bla":"perturbation",this.blaEpsilon=this.mandelbrotNavigator.get_bla_epsilon(),this.initializeReferenceWorker(),!navigator.gpu)throw new Error("WebGPU non support\xe9");if(this.adapter=await navigator.gpu.requestAdapter(),!this.adapter)throw new Error("Adapter WebGPU introuvable");this.f16Supported=this.adapter.features.has("shader-f16"),this.device=await this.adapter.requestDevice({requiredFeatures:this.f16Supported?["shader-f16"]:[]}),this.device.label="Engine Device",this.device.lost.then(i=>{console.warn(`GPU device lost: reason=${i.reason}, message=${i.message}`)}),this.queue=this.device.queue,this.queue.label="Engine Queue",this.ctx=this.canvas.getContext("webgpu"),this.format=navigator.gpu.getPreferredCanvasFormat(),this.ctx.configure({device:this.device,format:this.format,alphaMode:"opaque"}),this.tileTexture=this.device.createTexture({size:[1,1,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine TileTexture 1x1 Placeholder"}),this.tileTextureView=this.tileTexture.createView(),this.skyboxTexture=this.device.createTexture({size:[1,1,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine SkyboxTexture 1x1 Placeholder"}),this.skyboxTextureView=this.skyboxTexture.createView();const r=new On([]).generateTexture(),a=qn(r.data);this.paletteTexture=this.device.createTexture({size:[r.width,r.height,1],format:"rgba16float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine PaletteTexture"}),this.device.queue.writeTexture({texture:this.paletteTexture},a.buffer,{bytesPerRow:r.width*8},[r.width,r.height]),this.paletteTextureView=this.paletteTexture.createView(),this.paletteSampler=this.device.createSampler({magFilter:"linear",minFilter:"linear",addressModeU:"repeat",addressModeV:"clamp-to-edge"}),this.skyboxSampler=this.device.createSampler({magFilter:"linear",minFilter:"linear",addressModeU:"repeat",addressModeV:"repeat"}),this.webcamTexture=new cs(1920,1080),this.webcamTileTexture=this.device.createTexture({size:[1920,1080,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT}),this.webcamTextureView=this.webcamTileTexture.createView(),this.uniformBufferMandelbrot=this.device.createBuffer({size:80,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Mandelbrot"}),this.uniformBufferColor=this.device.createBuffer({size:4*ol,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Color"}),this.uniformBufferBrush=this.device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Brush"}),this.uniformBufferResolve=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Resolve"}),this.mandelbrotReferenceBuffer=this.device.createBuffer({size:8*Nt,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot Orbit ReferenceStorage Buffer"}),this.mandelbrotBlaBuffer=this.device.createBuffer({size:4*Ut,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot BLA Storage Buffer"}),this.mandelbrotBlaLevelBuffer=this.device.createBuffer({size:16,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot BLA Level Storage Buffer"}),this.mandelbrotBlaBufferCapacity=1,this.mandelbrotBlaLevelBufferCapacity=1,this.mandelbrotJetBuffer=this.device.createBuffer({size:4*pt,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot Jet Coeff Storage Buffer"}),this.mandelbrotJetRadiiBuffer=this.device.createBuffer({size:4*Hn,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot Jet Radii Storage Buffer"}),this.mandelbrotJetLevelBuffer=this.device.createBuffer({size:16,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot Jet Level Storage Buffer"}),this.mandelbrotJetBufferCapacity=1,this.mandelbrotJetRadiiBufferCapacity=1,this.mandelbrotJetLevelBufferCapacity=1,this.counterBuffer=this.device.createBuffer({size:8,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST,label:"Engine Counter Storage"}),this.workStatsBuffer=this.device.createBuffer({size:32,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST,label:"Engine WorkStats Storage"}),this.counterReadbackSlots=Array.from({length:ll},(i,o)=>({buffer:this.device.createBuffer({size:40,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,label:`Engine Counter Readback ${o}`}),pending:!1,sequence:0,generation:0})),this.uniformBufferMerge=this.device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Merge"}),await this._createPipelines(),this.resize()}async _createPipelines(){const e=this.device.createShaderModule({code:Hr,label:"Engine ShaderModule Resolve"}),n=this.f16Supported?`enable f16;
`+this.shaderPassColor.replace("alias hcol = f32;","alias hcol = f16;"):this.shaderPassColor,r=this.device.createShaderModule({code:n,label:"Engine ShaderModule Color"}),a=this.device.createShaderModule({code:Nr,label:"Engine ShaderModule DebugView"}),i=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:3,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:5,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:6,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:7,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}}],label:"Engine BindGroupLayout DebugView"});this.pipelineDebug=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[i],label:"Engine PipelineLayout DebugView"}),vertex:{module:a,entryPoint:"vs_main"},fragment:{module:a,entryPoint:"fs_main",targets:[{format:this.format}]},primitive:{topology:"triangle-list"},label:"Engine Pipeline DebugView"});const o=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Resolve"}),c=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:3,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:4,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:5,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:6,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:7,visibility:GPUShaderStage.FRAGMENT,sampler:{type:"filtering"}},{binding:8,visibility:GPUShaderStage.FRAGMENT,sampler:{type:"filtering"}},{binding:9,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d"}}],label:"Engine BindGroupLayout Color"}),d=Array.from({length:Ee},()=>({format:"r32float"}));this.pipelineResolve=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[o]}),vertex:{module:e,entryPoint:"vs_main"},fragment:{module:e,entryPoint:"fs_main",targets:d},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Resolve"}),this.pipelineColor=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[c]}),vertex:{module:r,entryPoint:"vs_main"},fragment:{module:r,entryPoint:"fs_main_direct",targets:[{format:this.format}]},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Color (direct)"}),this.pipelineColorAccumClear=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[c]}),vertex:{module:r,entryPoint:"vs_main"},fragment:{module:r,entryPoint:"fs_main",targets:[{format:"rgba16float"}]},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline ColorAccumClear"}),this.pipelineColorAccum=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[c]}),vertex:{module:r,entryPoint:"vs_main"},fragment:{module:r,entryPoint:"fs_main",targets:[{format:"rgba16float",blend:{color:{srcFactor:"one",dstFactor:"one",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one",operation:"add"}}}]},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline ColorAccum"});const x=this.device.createShaderModule({code:Ur,label:"Engine ShaderModule InplaceCompute"}),h=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:4,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-write",format:"r32float",viewDimension:"2d-array"}},{binding:5,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:6,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:7,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:8,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:9,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:10,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}}],label:"Engine BindGroupLayout InplaceCompute"});this.inplaceModule=x,this.inplaceBindGroupLayout=h,this.inplacePipelineLayout=this.device.createPipelineLayout({bindGroupLayouts:[h]}),this.pipelineInplace=this.getInplacePipeline(!0),this.getInplacePipeline(!1);const y=this.device.createShaderModule({code:Jr,label:"Engine ShaderModule ReprojectCs"}),w=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:2,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"r32float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout ReprojectCs"});this.pipelineReprojectCs=this.device.createComputePipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[w]}),compute:{module:y,entryPoint:"cs_main"},label:"Engine ComputePipeline ReprojectCs"});const S=this.device.createShaderModule({code:Vr,label:"Engine ShaderModule Merge"}),p=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT|GPUShaderStage.VERTEX,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Merge"});this.pipelineMerge=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[p]}),vertex:{module:S,entryPoint:"vs_main"},fragment:{module:S,entryPoint:"fs_main",targets:d},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Merge"});const g=this.device.createShaderModule({code:qr,label:"Engine ShaderModule Present"}),B=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d"}}],label:"Engine BindGroupLayout Present"});this.pipelinePresent=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[B]}),vertex:{module:g,entryPoint:"vs_main"},fragment:{module:g,entryPoint:"fs_main",targets:[{format:this.format}]},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Present"});const O=this.device.createShaderModule({code:Wr,label:"Engine ShaderModule AaTarget"}),u=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"r32float",viewDimension:"2d"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}],label:"Engine BindGroupLayout AaTarget"});this.pipelineAaTarget=this.device.createComputePipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[u]}),compute:{module:O,entryPoint:"cs_main"},label:"Engine ComputePipeline AaTarget"}),this.uniformBufferAaTarget||(this.uniformBufferAaTarget=this.device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer AaParams"}));const U=this.device.createShaderModule({code:Zr,label:"Engine ShaderModule AaReseed"}),te=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-write",format:"r32float",viewDimension:"2d"}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"r32float",viewDimension:"2d"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:3,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}}],label:"Engine BindGroupLayout AaReseed"});this.pipelineAaReseed=this.device.createComputePipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[te]}),compute:{module:U,entryPoint:"cs_main"},label:"Engine ComputePipeline AaReseed"}),this.aaFrontierBuffer||(this.aaFrontierBuffer=this.device.createBuffer({size:8,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST,label:"Engine AaFrontier Storage"}),this.aaFrontierReadback=this.device.createBuffer({size:8,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST,label:"Engine AaFrontier Readback"})),this.bindGroupResolve=void 0,this.bindGroupColor=void 0,this.bindGroupColorRaw=void 0,this.bindGroupMerge=void 0,this.bindGroupInplace=void 0,this.bindGroupReprojectCs=void 0,this.bindGroupPresent=void 0}getInplacePipeline(e){const n=`d${e?1:0}`;let r=this.inplacePipelineCache.get(n);return r||(r=this.device.createComputePipeline({layout:this.inplacePipelineLayout,compute:{module:this.inplaceModule,entryPoint:"cs_main",constants:{ENABLE_DEEP:e?1:0}},label:`Engine ComputePipeline InplaceBrush (deep=${e})`}),this.inplacePipelineCache.set(n,r)),r}rebuildInplaceBindGroup(){if(!this.pipelineInplace||!this.rawArrayView||!this.uniformBufferMandelbrot||!this.mandelbrotReferenceBuffer||!this.mandelbrotBlaBuffer||!this.mandelbrotBlaLevelBuffer||!this.mandelbrotJetBuffer||!this.mandelbrotJetRadiiBuffer||!this.mandelbrotJetLevelBuffer||!this.uniformBufferBrush||!this.counterBuffer||!this.workStatsBuffer)return;const e=this.inplaceBindGroupLayout;this.bindGroupInplace=this.device.createBindGroup({layout:e,entries:[{binding:0,resource:{buffer:this.uniformBufferMandelbrot}},{binding:1,resource:{buffer:this.mandelbrotReferenceBuffer}},{binding:2,resource:{buffer:this.mandelbrotBlaBuffer}},{binding:3,resource:{buffer:this.mandelbrotBlaLevelBuffer}},{binding:4,resource:this.rawArrayView},{binding:5,resource:{buffer:this.uniformBufferBrush}},{binding:6,resource:{buffer:this.counterBuffer}},{binding:7,resource:{buffer:this.workStatsBuffer}},{binding:8,resource:{buffer:this.mandelbrotJetBuffer}},{binding:9,resource:{buffer:this.mandelbrotJetLevelBuffer}},{binding:10,resource:{buffer:this.mandelbrotJetRadiiBuffer}}],label:"Engine BindGroup InplaceCompute"})}rebuildIterationBindGroups(){!this.uniformBufferMandelbrot||!this.mandelbrotReferenceBuffer||!this.mandelbrotBlaBuffer||!this.mandelbrotBlaLevelBuffer||!this.mandelbrotJetBuffer||!this.mandelbrotJetRadiiBuffer||!this.mandelbrotJetLevelBuffer||(this.pipelineDebug&&(this.bindGroupDebug=this.device.createBindGroup({layout:this.pipelineDebug.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniformBufferMandelbrot}},{binding:1,resource:{buffer:this.mandelbrotReferenceBuffer}},{binding:2,resource:{buffer:this.mandelbrotBlaBuffer}},{binding:3,resource:{buffer:this.mandelbrotBlaLevelBuffer}},{binding:5,resource:{buffer:this.mandelbrotJetBuffer}},{binding:6,resource:{buffer:this.mandelbrotJetLevelBuffer}},{binding:7,resource:{buffer:this.mandelbrotJetRadiiBuffer}}],label:"Engine BindGroup DebugView"})),this.rebuildInplaceBindGroup())}writeBlockTable(e){if(this.currentBlockTableKind=e.kind,e.kind==="jet"||e.kind==="mobius"||e.kind==="unified"){const n=Math.ceil(e.steps.length/(e.kind==="mobius"?il:pt));this.ensureJetBufferCapacity(Math.ceil(e.steps.length/pt)),this.ensureJetRadiiBufferCapacity(Math.max(n,Math.ceil((e.radii?.length??0)/4))),this.ensureJetLevelBufferCapacity(e.levelCount);const r=e.radii;e.steps.length>0&&this.mandelbrotJetBuffer&&this.device.queue.writeBuffer(this.mandelbrotJetBuffer,0,e.steps,0,e.steps.length),r&&r.length>0&&this.mandelbrotJetRadiiBuffer&&this.device.queue.writeBuffer(this.mandelbrotJetRadiiBuffer,0,r,0,r.length),e.levels.length>0&&this.mandelbrotJetLevelBuffer&&this.device.queue.writeBuffer(this.mandelbrotJetLevelBuffer,0,e.levels,0,e.levels.length);return}this.ensureBlaBufferCapacity(e.steps.length/Ut),this.ensureBlaLevelBufferCapacity(e.levelCount),e.steps.length>0&&this.mandelbrotBlaBuffer&&this.device.queue.writeBuffer(this.mandelbrotBlaBuffer,0,e.steps,0,e.steps.length),e.levels.length>0&&this.mandelbrotBlaLevelBuffer&&this.device.queue.writeBuffer(this.mandelbrotBlaLevelBuffer,0,e.levels,0,e.levels.length)}ensureBlaBufferCapacity(e){const n=Math.max(1,Math.ceil(e));n<=this.mandelbrotBlaBufferCapacity||(this.mandelbrotBlaBuffer?.destroy?.(),this.mandelbrotBlaBuffer=this.device.createBuffer({size:n*4*Ut,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot BLA Storage Buffer"}),this.mandelbrotBlaBufferCapacity=n,this.rebuildIterationBindGroups())}ensureBlaLevelBufferCapacity(e){const n=Math.max(1,Math.ceil(e));n<=this.mandelbrotBlaLevelBufferCapacity||(this.mandelbrotBlaLevelBuffer?.destroy?.(),this.mandelbrotBlaLevelBuffer=this.device.createBuffer({size:n*4*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot BLA Level Storage Buffer"}),this.mandelbrotBlaLevelBufferCapacity=n,this.rebuildIterationBindGroups())}ensureJetBufferCapacity(e){const n=Math.max(1,Math.ceil(e));n<=this.mandelbrotJetBufferCapacity||(this.mandelbrotJetBuffer?.destroy?.(),this.mandelbrotJetBuffer=this.device.createBuffer({size:n*4*pt,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot Jet Coeff Storage Buffer"}),this.mandelbrotJetBufferCapacity=n,this.ensureJetRadiiBufferCapacity(n),this.rebuildIterationBindGroups())}ensureJetRadiiBufferCapacity(e){const n=Math.max(1,Math.ceil(e));n<=this.mandelbrotJetRadiiBufferCapacity||(this.mandelbrotJetRadiiBuffer?.destroy?.(),this.mandelbrotJetRadiiBuffer=this.device.createBuffer({size:n*4*Hn,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot Jet Radii Storage Buffer"}),this.mandelbrotJetRadiiBufferCapacity=n,this.rebuildIterationBindGroups())}ensureJetLevelBufferCapacity(e){const n=Math.max(1,Math.ceil(e));n<=this.mandelbrotJetLevelBufferCapacity||(this.mandelbrotJetLevelBuffer?.destroy?.(),this.mandelbrotJetLevelBuffer=this.device.createBuffer({size:n*4*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot Jet Level Storage Buffer"}),this.mandelbrotJetLevelBufferCapacity=n,this.rebuildIterationBindGroups())}requestFinalStatsReadback(){if(!this.device||!this.workStatsBuffer||!this.counterBuffer||this.finalStatsPending)return;this.finalStatsBuffer||(this.finalStatsBuffer=this.device.createBuffer({size:40,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,label:"Engine Final Stats Readback"}));const e=this.workStatsSessionSerial,n=this.device.createCommandEncoder({label:"Engine Final Stats Copy"});n.copyBufferToBuffer(this.counterBuffer,0,this.finalStatsBuffer,0,8),n.copyBufferToBuffer(this.workStatsBuffer,0,this.finalStatsBuffer,8,32),this.device.queue.submit([n.finish()]),this.finalStatsPending=!0,(async()=>{let r=!1;try{if(await this.finalStatsBuffer.mapAsync(GPUMapMode.READ),r=!0,e!==this.workStatsSessionSerial)return;const a=new Uint32Array(this.finalStatsBuffer.getMappedRange()),i=a[2],o=a[3];i>0&&o/i>=1&&(this.realLoopStepsApprox=i*64,this.tierAppsApprox=[a[6],a[7],a[8],a[9]],this.lastCompletionTotalApps=this.realLoopStepsApprox)}catch{}finally{r&&this.finalStatsBuffer.unmap(),this.finalStatsPending=!1}})()}invalidateCounterReadback(e=!1){this.unfinishedPixelCount=-1,this.activePixelCount=-1,this.realizedSkip=-1,this.workgroupWaste=-1,this.maxPixelSteps=-1,e||(this.realLoopStepsApprox=-1,this.tierAppsApprox=[-1,-1,-1,-1],this.workStatsSessionSerial++),this.counterReadbackGeneration++,this.lastCounterDispatchFrame=-Jt,this.counterSampleFrame=-1}hasPendingCounterReadbackForCurrentGeneration(){return this.counterReadbackSlots.some(e=>e.pending&&e.generation===this.counterReadbackGeneration)}acquireCounterReadbackSlot(){const e=this.counterReadbackSlots.length;for(let n=0;n<e;n++){const r=(this.counterReadbackWriteIndex+n)%e,a=this.counterReadbackSlots[r];if(!a.pending)return this.counterReadbackWriteIndex=(r+1)%e,a}}scheduleCounterReadback(e,n,r,a){e.pending=!0,e.sequence=n,e.generation=r,(async()=>{let i=!1;try{await e.buffer.mapAsync(GPUMapMode.READ),i=!0;const o=new Uint32Array(e.buffer.getMappedRange()),c=o[0],d=o[1],x=o[2],h=o[3],y=o[4],w=o[5],S=[o[6],o[7],o[8],o[9]];this.applyCounterReadback(n,r,a,c,d,x,h,y,w,S)}catch{}finally{i&&e.buffer.unmap(),e.pending=!1}})()}applyCounterReadback(e,n,r,a,i,o=0,c=0,d=0,x=0,h=[0,0,0,0]){if(n!==this.counterReadbackGeneration||e<=this.latestAppliedCounterReadbackSequence)return;this.latestAppliedCounterReadbackSequence=e;const y=this.unfinishedPixelCount;if(this.unfinishedPixelCount=a,this.activePixelCount=i,this.counterSampleFrame=r,o>0){const w=c/o,S=d/o;w>=1&&S>=1?(this.realizedSkip=w,this.workgroupWaste=S,this.maxPixelSteps=x,this.realLoopStepsApprox=o*64,this.tierAppsApprox=[h[0],h[1],h[2],h[3]]):(this.realizedSkip=-1,this.workgroupWaste=-1,this.maxPixelSteps=-1)}y>jt&&a<=jt&&!this.clearHistoryNextFrame&&!Z(this.zoomState)&&(this.needFreezeSnapshot=!0)}scheduleGpuTiming(e){this.pendingGpuTiming||(this.pendingGpuTiming=!0,this.device.queue.onSubmittedWorkDone().then(()=>{this.pendingGpuTiming=!1,this.applyGpuFrameTiming(performance.now()-e)}).catch(()=>{this.pendingGpuTiming=!1}))}applyGpuFrameTiming(e){if(this.gpuFrameTimeMs=e,this.completionTimerActive&&e>0&&(this.completionAccumulatedGpuMs+=e),this.smoothedGpuTimeMs===0?this.smoothedGpuTimeMs=e:this.smoothedGpuTimeMs=this.smoothedGpuTimeMs*(1-Vn)+e*Vn,e<=0)return;const n=1e3/this.targetFps/e,r=this.iterationBatchSize*n,a=this.getEffectiveMaxBatchSize();this.iterationBatchSize=Math.round(Math.min(a,Math.max(ut,this.iterationBatchSize*.7+r*.3)))}getEffectiveMaxBatchSize(){return rl}resize(){const e=(window.devicePixelRatio||1)*this.dprMultiplier,n=this.canvas.parentElement,r=n?.clientWidth||1,a=n?.clientHeight||1;this.width=Math.max(1,Math.round(r*e)),this.height=Math.max(1,Math.round(a*e));const i=this.device?.limits?.maxTextureDimension2D??8192;this.width=Math.min(this.width,i),this.height=Math.min(this.height,i),this.canvas.width=this.width,this.canvas.height=this.height,this.canvas.style.width=r+"px",this.canvas.style.height=a+"px",this.ctx.configure({device:this.device,format:this.format,alphaMode:"opaque"}),this.neutralSize=Math.ceil(Math.sqrt(this.width*this.width+this.height*this.height));const o=this.neutralSize;this.rawTexture?.destroy?.(),this.rawBrushTexture?.destroy?.(),this.resolvedTexture?.destroy?.(),this.frozenTexture?.destroy?.(),this.accumTexture?.destroy?.(),this.aaTargetTexture?.destroy?.();const c=(w,S,p=0)=>{const g=this.device.createTexture({size:{width:o,height:o,depthOrArrayLayers:S},format:"r32float",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST|p,label:w}),B=g.createView({dimension:"2d-array",baseArrayLayer:0,arrayLayerCount:S,label:w+" ArrayView"}),O=[];for(let u=0;u<S;u++)O.push(g.createView({dimension:"2d",baseArrayLayer:u,arrayLayerCount:1,label:w+` Layer${u}`}));return{texture:g,arrayView:B,layerViews:O}},d=c("Engine RawTexture (A)",Gt,GPUTextureUsage.STORAGE_BINDING);this.rawTexture=d.texture,this.rawArrayView=d.arrayView,this.rawIterStorageView=d.layerViews[0],this.rawPayloadView=this.rawTexture.createView({dimension:"2d-array",baseArrayLayer:8,arrayLayerCount:5,label:"Engine RawTexture (A) PayloadView"});const x=c("Engine RawBrushTexture (B)",Gt,GPUTextureUsage.STORAGE_BINDING);this.rawBrushTexture=x.texture,this.rawBrushArrayView=x.arrayView;const h=c("Engine ResolvedTexture",Ee);this.resolvedTexture=h.texture,this.resolvedArrayView=h.arrayView,this.resolvedLayerViews=h.layerViews;const y=c("Engine FrozenTexture",Ee);if(this.frozenTexture=y.texture,this.frozenArrayView=y.arrayView,this.frozenLayerViews=y.layerViews,this.accumTexture=this.device.createTexture({size:{width:this.width,height:this.height,depthOrArrayLayers:1},format:"rgba16float",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING,label:"Engine AccumTexture"}),this.accumTextureView=this.accumTexture.createView({label:"Engine AccumTexture View"}),this.pipelinePresent&&(this.bindGroupPresent=this.device.createBindGroup({layout:this.pipelinePresent.getBindGroupLayout(0),entries:[{binding:0,resource:this.accumTextureView}],label:"Engine BindGroup Present"})),this.aaTargetTexture=this.device.createTexture({size:{width:o,height:o,depthOrArrayLayers:1},format:"r32float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING,label:"Engine AaTargetTexture"}),this.aaTargetTextureView=this.aaTargetTexture.createView({label:"Engine AaTargetTexture View"}),this.pipelineAaTarget&&this.rawArrayView&&this.uniformBufferAaTarget&&(this.bindGroupAaTarget=this.device.createBindGroup({layout:this.pipelineAaTarget.getBindGroupLayout(0),entries:[{binding:0,resource:this.rawArrayView},{binding:1,resource:this.aaTargetTextureView},{binding:2,resource:{buffer:this.uniformBufferAaTarget}}],label:"Engine BindGroup AaTarget"})),this.pipelineAaReseed&&this.rawIterStorageView&&this.rawPayloadView&&this.uniformBufferAaTarget&&this.aaFrontierBuffer&&(this.bindGroupAaReseed=this.device.createBindGroup({layout:this.pipelineAaReseed.getBindGroupLayout(0),entries:[{binding:0,resource:this.aaTargetTextureView},{binding:1,resource:this.rawIterStorageView},{binding:2,resource:{buffer:this.uniformBufferAaTarget}},{binding:3,resource:this.rawPayloadView},{binding:4,resource:{buffer:this.aaFrontierBuffer}}],label:"Engine BindGroup AaReseed"})),this.resetAaState(),this.zoomState=Gn(),this.rebuildIterationBindGroups(),this.pipelineReprojectCs&&(this.bindGroupReprojectCs=this.device.createBindGroup({layout:this.pipelineReprojectCs.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniformBufferBrush}},{binding:1,resource:this.rawArrayView},{binding:2,resource:this.rawBrushArrayView}],label:"Engine BindGroup ReprojectCs"})),this.pipelineResolve){const w=this.pipelineResolve.getBindGroupLayout(0);this.bindGroupResolve=this.device.createBindGroup({layout:w,entries:[{binding:0,resource:{buffer:this.uniformBufferResolve}},{binding:1,resource:this.rawArrayView}],label:"Engine BindGroup Resolve"})}if(this.rebuildColorBindGroup(),this.pipelineMerge&&this.uniformBufferMerge){const w=this.pipelineMerge.getBindGroupLayout(0);this.bindGroupMerge=this.device.createBindGroup({layout:w,entries:[{binding:0,resource:{buffer:this.uniformBufferMerge}},{binding:1,resource:this.resolvedArrayView},{binding:2,resource:this.rawBrushArrayView}],label:"Engine BindGroup Merge"})}this.prevFrameMandelbrot=void 0,this.previousMandelbrot=void 0,this.previousRenderOptions=void 0,this.needRender=!0,this.invalidateCounterReadback()}areObjectsEqual(e,n){return e===void 0||n===void 0?!1:JSON.stringify(e)===JSON.stringify(n)}areColorStopsEqual(e,n){if(e.length!==n.length)return!1;for(const[r,a]of e.entries()){const i=n[r];if(!i||JSON.stringify(a)!==JSON.stringify(i))return!1}return!0}setApproximationMode(e){e!==this.approximationMode&&(e==="bla"?this.mandelbrotNavigator.use_bla():e==="pade"?this.mandelbrotNavigator.use_pade():e==="jet"?this.mandelbrotNavigator.use_jet():e==="mobius"?this.mandelbrotNavigator.use_mobius_cplus():e==="auto"?this.mandelbrotNavigator.use_unified():this.mandelbrotNavigator.use_perturbation(),this.approximationMode=e,this.currentBlaLevelCount=0,this.postReferenceWorker({type:"setApproximationMode",jobId:this.referenceJobId,approximationMode:e}),this.clearHistoryNextFrame=!0,this.needRender=!0,this.invalidateCounterReadback())}setDebugView(e){const n=Math.max(0,Math.round(e));n!==this.debugViewMode&&(this.debugViewMode=n,this.needRender=!0)}getApproximationMode(){return this.approximationMode}setBlaEpsilon(e){const n=Math.max(Number.MIN_VALUE,e);n!==this.blaEpsilon&&(this.mandelbrotNavigator.set_bla_epsilon(n),this.blaEpsilon=n,this.postReferenceWorker({type:"setBlaEpsilon",jobId:this.referenceJobId,blaEpsilon:n}),(this.approximationMode==="bla"||this.approximationMode==="pade"||this.approximationMode==="jet"||this.approximationMode==="mobius"||this.approximationMode==="auto")&&(this.currentBlaLevelCount=0,this.clearHistoryNextFrame=!0,this.needRender=!0,this.invalidateCounterReadback()))}getMaxBlaSkip(){return this.maxBlaSkip}getPrecisionBudget(){return this.precisionBudget}setPrecisionBudget(e){e!==this.precisionBudget&&(this.precisionBudget=e,this.referenceViewKey="",this.needRender=!0)}findMinibrot(e=4){const n={status:"none",cx:null,cy:null,period:null};return this.pendingMinibrotResolve?.(n),this.pendingMinibrotResolve=null,new Promise(r=>{this.pendingMinibrotResolve=r,this.postReferenceWorker({type:"findMinibrot",jobId:this.referenceJobId,maxIter:this.currentMaxIterations,radiusFactor:e})})}setMaxBlaSkip(e){const n=Math.min(1048576,Math.max(2,Math.round(e))),r=1<<Math.round(Math.log2(n));r!==this.maxBlaSkip&&(this.mandelbrotNavigator.set_max_bla_skip(r),this.maxBlaSkip=r,this.postReferenceWorker({type:"setMaxBlaSkip",jobId:this.referenceJobId,maxBlaSkip:r}),(this.approximationMode==="bla"||this.approximationMode==="pade"||this.approximationMode==="jet"||this.approximationMode==="mobius"||this.approximationMode==="auto")&&(this.currentBlaLevelCount=0,this.clearHistoryNextFrame=!0,this.needRender=!0,this.invalidateCounterReadback()))}async update(e,n){const r=performance.now();this.lastUpdateTime===0&&(this.lastUpdateTime=r);const a=(r-this.lastUpdateTime)/1e3;this.time+=a,this.lastUpdateTime=r;const i=this.needsMoreFrames();if(i&&!this.completionTimerActive?(this.completionStartMs=r,this.completionAccumulatedGpuMs=0,this.completionTimerActive=!0):!i&&this.completionTimerActive&&(this.lastCompletionWallMs=r-this.completionStartMs,this.lastCompletionGpuMs=this.completionAccumulatedGpuMs,this.lastCompletionTotalApps=this.realLoopStepsApprox,this.completionTimerActive=!1,this.requestFinalStatsReadback()),this.debugShadingActive=n.debugShading,this.debugViewOverride>0&&(this.debugViewMode=this.debugViewOverride),this.stagingReady()){this.promoteStagingReference();return}const o=this.mandelbrotNavigator.get_approximation_mode()===5?"auto":this.mandelbrotNavigator.get_approximation_mode()===4?"mobius":this.mandelbrotNavigator.get_approximation_mode()===3?"jet":this.mandelbrotNavigator.get_approximation_mode()===2?"pade":this.mandelbrotNavigator.get_approximation_mode()===1?"bla":"perturbation",c=this.mandelbrotNavigator.get_bla_epsilon();(o!==this.approximationMode||c!==this.blaEpsilon)&&(this.approximationMode=o,this.blaEpsilon=c,this.currentBlaLevelCount=0,this.postReferenceWorker({type:"setApproximationMode",jobId:this.referenceJobId,approximationMode:o}),this.postReferenceWorker({type:"setBlaEpsilon",jobId:this.referenceJobId,blaEpsilon:c}),this.clearHistoryNextFrame=!0,this.frozenAligned=!1,this.needFreezeSnapshot=!1,this.needRender=!0,this.invalidateCounterReadback());const d=!this.areObjectsEqual(e,this.previousMandelbrot),x=!this.areObjectsEqual(n,this.previousRenderOptions),h=n.stripeFrequency!==this.previousRenderOptions?.stripeFrequency,y=cl(n.colorStops),w=this.previousOrbitMetricsEnabled!==void 0&&y!==this.previousOrbitMetricsEnabled,S=h&&y;this.needRender=this.needRender||d||x,(d||x)&&this.resetAaState(),this.aaAuto=n.aaAuto??!1,(d||S||w)&&this.invalidateCounterReadback(),(S||w)&&(this.clearHistoryNextFrame=!0),this.previousOrbitMetricsEnabled=y,n.colorStops.some(Re=>(Re.webcam??0)>0)?(await this.updateWebcamTexture(),this.needRender=!0):this.webcamTexture?.closeWebcam(),n.activateAnimate&&(this.needRender=!0);const g=this.width/Math.max(1,this.height);let B=this.previousMandelbrot?.scale||1/e.scale;B<1&&(B=1/B),B=Math.sqrt(B)-1;const O=this.referenceOrbitWasReset&&!!this.prevFrameMandelbrot;this.referenceOrbitWasReset=!1;const u=!this.prevFrameMandelbrot||O,U=!!this.prevFrameMandelbrot&&this.prevFrameMandelbrot.mu!==e.mu,te=Z(this.zoomState)&&u&&!U;(u||U)&&(this.clearHistoryNextFrame=!0,te||(this.zoomState=Gn(),this.frozenBaseShiftX=0,this.frozenBaseShiftY=0,this.frozenPanShiftX=0,this.frozenPanShiftY=0),this.needFreezeSnapshot=O&&!te&&!U,this.needMergeSnapshot=!1);{const Re=this.prevFrameMandelbrot&&this.prevFrameMandelbrot.scale!==e.scale;let le=null;u||U?le={type:"referenceReset",muChanged:U,orbitWasReset:O}:Re?le={type:"scaleChanged",scale:e.scale,prevScale:this.prevFrameMandelbrot.scale}:this.prevFrameMandelbrot&&(le={type:"scaleStable"});const je=Z(this.zoomState),it=ft(this.zoomState),Tt=ve(this.zoomState),Tr=Gs(this.zoomState),{state:Rr,effects:kr}=le?Us(this.zoomState,le,{threshold:this.zoomMagnificationThreshold}):{state:this.zoomState,effects:[]};this.zoomState=Rr,!je&&this._prevFrameScaleChanged&&!Re&&(this.clearHistoryNextFrame=!0),this._prevFrameScaleChanged=!!Re;for(const Er of kr)switch(Er.type){case"copyResolvedToFrozen":if(this.needFreezeSnapshot=!0,Z(this.zoomState)){if(je)this.frozenBaseShiftX=0,this.frozenBaseShiftY=0;else{const Ar=e.dx-this.prevFrameMandelbrot.dx,Lr=e.dy-this.prevFrameMandelbrot.dy,gn=Math.sqrt(g*g+1),Rt=ft(this.zoomState);Rt>0&&(this.frozenBaseShiftX=Math.round(-(Ar*this.neutralSize)/(2*Rt*gn)),this.frozenBaseShiftY=Math.round(Lr*this.neutralSize/(2*Rt*gn)))}this.frozenPanShiftX=0,this.frozenPanShiftY=0}break;case"mergeResolvedAndFrozen":this.needMergeSnapshot=!Tr,je&&it>0&&(this.mergeUniforms={zf:it/e.scale,lzf:Tt/e.scale,frozenShiftU:(this.frozenBaseShiftX+this.frozenPanShiftX*(Tt/it))/this.neutralSize,frozenShiftV:-(this.frozenBaseShiftY+this.frozenPanShiftY*(Tt/it))/this.neutralSize,aspect:g,angle:e.angle});break;case"clearHistoryNextFrame":this.clearHistoryNextFrame=!0;break}}if(!this.areColorStopsEqual(n.colorStops,this.previousRenderOptions?.colorStops||[])||n.interpolationMode!==this.previousRenderOptions?.interpolationMode){const le=new On(n.colorStops,n.interpolationMode).generateTexture(),je=qn(le.data);this.device.queue.writeTexture({texture:this.paletteTexture},je.buffer,{bytesPerRow:le.width*8},[le.width,le.height]),this.needRender=!0}const j=Math.sin(e.angle),_=Math.cos(e.angle),z=vt(n.animation,n.animationSpeed),m=Se(z.globalSpeed,0,10),k=n.activateAnimate?this.time:0,N=oe(z.tracks.paletteOffset,k,m),J=oe(z.tracks.heightPaletteShift,k,m),P=oe(z.tracks.lightAngle,k,m)*en,$=oe(z.tracks.textureDrift,k,m),K=Wn(z.tracks.textureDrift,k,m,.25),Q=oe(z.tracks.skyReflectionDrift,k,m),ee=Wn(z.tracks.skyReflectionDrift,k,m,.25),W=oe(z.tracks.phaseColoring,k,m),q=oe(z.tracks.varnish,k,m),ne=oe(z.tracks.microBump,k,m),ie=oe(z.tracks.displacement,k,m),b=oe(z.tracks.tessellation,k,m),R=n.lightAngle+P,E=Se(n.tessellationLevel+b,0,10),A=Se(n.displacementAmount+ie,0,.1),f=Se(n.microBumpStrength+ne,0,10),v=Se(n.varnishStrength+q,0,10),M=Se(n.heightPaletteShift+J,0,100),T=Se(n.phaseColoringStrength+W,0,100),D=Math.hypot(Math.cos(R),Math.sin(R),1.85),I=mr(n.textureMapping),C=Z(this.zoomState),H=C?ft(this.zoomState)/e.scale:1,F=C?ve(this.zoomState)/e.scale:1,G=ft(this.zoomState),ae=ve(this.zoomState),_e=Math.max(1,Math.round(n.antialiasLevel??1)),ge=Math.hypot(this.aaOffsetX,this.aaOffsetY),rt=ge>0&&e.scale>0?Math.log(ge)+Math.log(e.scale):0,xr=new Float32Array([n.palettePeriod,n.paletteOffset+N,B,this.time,g,e.angle,n.activateAnimate?1:0,e.mu,H,C||this.frozenAligned||this.needFreezeSnapshot?1:0,F,C&&G>0?(this.frozenBaseShiftX+this.frozenPanShiftX*(ae/G))/this.neutralSize:0,C&&G>0?-(this.frozenBaseShiftY+this.frozenPanShiftY*(ae/G))/this.neutralSize:0,E,A,m,e.epsilon,n.ambientOcclusionStrength,f,n.subsurfaceStrength,n.reliefDepth,n.localShadowStrength,R,v,Math.log(e.mu),j,_,Math.cos(R)/D,Math.sin(R)/D,1.85/D,n.paletteMirror?1:0,n.debugShading?1:0,M,n.orbitTrapStrength,T,Jn(I.xVariable),Jn(I.yVariable),I.xScale,I.yScale,I.mirrored?1:0,parseFloat(e.cx),parseFloat(e.cy),e.scale,0,.03*$,.03*K,.02*Q,.02*ee,N,J,P,$,Q,W,q,ne,ie,b,this.aaSampleIndex,_e,ge>0?this.aaOffsetX/ge:0,ge>0?this.aaOffsetY/ge:0,Number.isFinite(rt)?rt:0,0]);if(this.device.queue.writeBuffer(this.uniformBufferColor,0,xr.buffer),!this.needsMoreFrames())return;const me=Math.ceil(e.maxIterations);this.currentMaxIterations=me;const Oe=Z(this.zoomState)&&ve(this.zoomState)>0?ve(this.zoomState):e.scale,dn=Z(this.zoomState)&&ve(this.zoomState)>0,ue=e.viewFloatexp,fn=dn?dt(Oe):ue?{mantissa:ue[0],exponent:ue[1]}:e.scaleStr?Ft(e.scaleStr):dt(Oe),Ge=fn.exponent,Ue=Ge<=Fs;this.floatExpActive=Ue;const wt=ue?{mantissa:ue[2],exponent:ue[3]}:e.dxStr?Ft(e.dxStr):dt(e.dx),zt=ue?{mantissa:ue[4],exponent:ue[5]}:e.dyStr?Ft(e.dyStr):dt(e.dy),yr=wt.mantissa===0?0:Math.fround(wt.mantissa*2**(wt.exponent-Ge)),Sr=zt.mantissa===0?0:Math.fround(zt.mantissa*2**(zt.exponent-Ge)),un=dn?Oe.toString():e.scaleStr??Oe.toString();this.referenceViewKey||(console.log("[REF] update: reset branch (key empty) | deep",Ue,"expScale",Ge,"mode",this.approximationMode),this.resetReferenceJob(e,un,me)),this.syncReferenceWorkerView(e,un,me);const Ne=Math.max(0,this.referenceAvailableOrbitLen-1),at=Math.min(me,Ne);this.currentGuardedMaxIter=at,this.currentReferenceAvailableIter=Ne,this.currentReferenceRemainingIter=Math.max(0,me-Ne),this.orbitIncomplete=!this.referenceWorkerFailed&&Ne<me;const Mt=Ne>=me,wr=this.approximationMode==="jet"||this.approximationMode==="mobius"||this.approximationMode==="auto"?this.referenceBlaReadyMaxIterations>0:this.referenceBlaReadyMaxIterations>=at,zr=this.approximationMode==="jet"?"jet":this.approximationMode==="mobius"?"mobius":this.approximationMode==="auto"?"unified":"bla",pn=(this.approximationMode==="bla"||this.approximationMode==="pade"||this.approximationMode==="jet"||this.approximationMode==="mobius"||this.approximationMode==="auto")&&Mt&&this.currentBlaLevelCount>0&&this.currentBlockTableKind===zr&&wr,hn=pn?this.approximationMode==="auto"?5:this.approximationMode==="mobius"?4:this.approximationMode==="jet"?3:this.approximationMode==="pade"?2:1:0,_n=pn?this.currentBlaLevelCount:0;this.lastShaderApproxFlag=hn,this.lastShaderBlaLevelCount=_n;const Mr=new Float32Array([Ue?yr:e.dx,Ue?Sr:e.dy,e.mu,Ue?fn.mantissa:Oe,g,e.angle,this.iterationBatchSize,e.epsilon,n.antialiasLevel,this.debugViewMode,at,Mt?1:0,hn,_n,this.blaEpsilon,n.stripeFrequency,y?1:0,Ge,this.aaOffsetX,this.aaOffsetY]);this.device.queue.writeBuffer(this.uniformBufferMandelbrot,0,Mr.buffer),!Z(this.zoomState)&&!this.clearHistoryNextFrame&&!this.aaActive&&Mt&&this.prevGuardedMaxIter<me&&this.prevGuardedMaxIter>0&&(this.needFreezeSnapshot=!0,this.clearHistoryNextFrame=!0),this.prevGuardedMaxIter=at,this.previousMandelbrot=structuredClone(e),this.previousRenderOptions=structuredClone(n)}resetAaState(){this.aaActive=!1,this.aaSampleIndex=0,this.aaAccumulatedSamples=0,this.aaOffsetX=0,this.aaOffsetY=0,this.aaReseedPending=!1,this.aaFrontierStamped=-1,this.aaFrontierEligible=-1}aaAnalyticParams(e,n){const r=n??this.previousMandelbrot?.scale??0,a=Math.sqrt(e*e+1),i=r>0?Math.log(Math.SQRT2*a/Math.max(1,this.neutralSize))+Math.log(r):Number.NEGATIVE_INFINITY,o=this.aaAnalyticEnabled&&this.approximationMode==="auto"&&Number.isFinite(i);return{logDelta:i,enabled:o}}readbackAaFrontier(){const e=this.aaFrontierReadback;!e||this.aaFrontierMapPending||(this.aaFrontierMapPending=!0,e.mapAsync(GPUMapMode.READ).then(()=>{const n=new Uint32Array(e.getMappedRange().slice(0));e.unmap(),this.aaFrontierStamped=n[0],this.aaFrontierEligible=n[1],this.aaFrontierMapPending=!1}).catch(()=>{this.aaFrontierMapPending=!1}))}triggerAaAccumulation(){this.resetAaState(),this.rawJittered&&(this.clearHistoryNextFrame=!0,this.invalidateCounterReadback()),this.aaActive=!0,this.needRender=!0}get aaProgress(){const e=Math.max(1,Math.round(this.previousRenderOptions?.antialiasLevel??1));return{active:this.aaActive,done:this.aaAccumulatedSamples,total:e}}async render(){if(this.skipRenderOnce){this.skipRenderOnce=!1;return}if(!this.needsMoreFrames()||!this.pipelineInplace||!this.pipelineReprojectCs||!this.pipelineResolve||!this.pipelineColor||!this.bindGroupInplace||!this.bindGroupReprojectCs||!this.bindGroupResolve||!this.bindGroupColor||!this.previousMandelbrot)return;const e=this.previousRenderOptions;if(!e)return;const n=this.width/Math.max(1,this.height),r=Un(e.zoomMinBrushStep,1,1,64),a=Math.max(Un(e.sentinelSeedStep,64,1,4096),r),i=a,o=this.clearHistoryNextFrame?1:0;this.clearHistoryNextFrame&&this.invalidateCounterReadback();const c=++this.renderFrameSerial;let d=0,x=0;if(!this.clearHistoryNextFrame&&this.prevFrameMandelbrot){const b=this.previousMandelbrot.dx-this.prevFrameMandelbrot.dx,R=this.previousMandelbrot.dy-this.prevFrameMandelbrot.dy,E=this.neutralSize,A=Math.sqrt(n*n+1),f=Z(this.zoomState)&&ve(this.zoomState)>0?ve(this.zoomState):this.previousMandelbrot.scale;d=-(b*E)/(2*f*A),x=R*E/(2*f*A)}const h=Math.round(d),y=Math.round(x),w=h!==0||y!==0;this.clearHistoryNextFrame?(this.cumulativeShiftX=0,this.cumulativeShiftY=0):(this.cumulativeShiftX+=h,this.cumulativeShiftY+=y,Z(this.zoomState)&&(this.frozenPanShiftX+=h,this.frozenPanShiftY+=y),w&&(this.frozenAligned=!1)),w&&!Z(this.zoomState)&&(this.needFreezeSnapshot=!1);const S=(this.cumulativeShiftX%i+i)%i,p=(this.cumulativeShiftY%i+i)%i,g=this.hasPendingCounterReadbackForCurrentGeneration(),B=!g&&(this.clearHistoryNextFrame||this.activePixelCount<0||this.iterationBatchSize>ut||this.activePixelCount<sl*this.gpuLoadMultiplier);B&&this.refinementWasGated&&(this.iterationBatchSize=ut),this.refinementWasGated=!B;const O=B?1:0,u=new Float32Array([n,this.previousMandelbrot.angle,o,a,i,d,x,this.previousMandelbrot.mu,S,p,Z(this.zoomState)?r:0,O]);this.device.queue.writeBuffer(this.uniformBufferBrush,0,u.buffer);const U=new Float32Array([this.previousMandelbrot.mu,S,p]);this.device.queue.writeBuffer(this.uniformBufferResolve,0,U.buffer);const j=!g&&(this.unfinishedPixelCount<0||this.activePixelCount<0||c-this.lastCounterDispatchFrame>=Jt)?this.acquireCounterReadbackSlot():void 0;let _,z=!1;const m=this.device.createCommandEncoder();if(this.needMergeSnapshot&&this.pipelineMerge&&this.bindGroupMerge&&this.resolvedTexture&&this.frozenTexture&&this.rawBrushTexture){const b=this.neutralSize;m.copyTextureToTexture({texture:this.frozenTexture},{texture:this.rawBrushTexture},{width:b,height:b,depthOrArrayLayers:Ee});const R=new Float32Array([this.mergeUniforms.zf,this.mergeUniforms.lzf,this.mergeUniforms.frozenShiftU,this.mergeUniforms.frozenShiftV,this.mergeUniforms.aspect,this.mergeUniforms.angle]);this.device.queue.writeBuffer(this.uniformBufferMerge,0,R.buffer);const E=this.frozenLayerViews.map(f=>({view:f,clearValue:{r:0,g:0,b:0,a:0},loadOp:"clear",storeOp:"store"})),A=m.beginRenderPass({colorAttachments:E});A.setPipeline(this.pipelineMerge),A.setBindGroup(0,this.bindGroupMerge),A.draw(6,1,0,0),A.end(),this.needMergeSnapshot=!1,this.frozenAligned=!0,this.frozenPanShiftX=0,this.frozenPanShiftY=0}if(this.needFreezeSnapshot&&this.resolvedTexture&&this.frozenTexture){const b=Ee,R=this.neutralSize;m.copyTextureToTexture({texture:this.resolvedTexture},{texture:this.frozenTexture},{width:R,height:R,depthOrArrayLayers:b}),this.needFreezeSnapshot=!1,this.frozenAligned=!0,this.frozenPanShiftX=0,this.frozenPanShiftY=0,Z(this.zoomState)||(this.frozenBaseShiftX=0,this.frozenBaseShiftY=0)}const k=(b,R="clear")=>b.map(E=>({view:E,clearValue:{r:0,g:0,b:0,a:0},loadOp:R,storeOp:"store"})),N=this.clearHistoryNextFrame||w;(N||this.unfinishedPixelCount!==0||this.activePixelCount!==0)&&(this.lastRawMutationFrame=c);{if(N){const E=m.beginComputePass();E.setPipeline(this.pipelineReprojectCs),E.setBindGroup(0,this.bindGroupReprojectCs);const A=Math.ceil(this.neutralSize/16);E.dispatchWorkgroups(A,A),E.end(),m.copyTextureToTexture({texture:this.rawBrushTexture},{texture:this.rawTexture},{width:this.neutralSize,height:this.neutralSize,depthOrArrayLayers:Gt})}if(this.aaReseedPending&&this.pipelineAaReseed&&this.bindGroupAaReseed&&this.uniformBufferAaTarget){const E=Math.max(1,Math.round(e.antialiasLevel??1)),A=this.aaAnalyticParams(n);this.device.queue.writeBuffer(this.uniformBufferAaTarget,0,new Float32Array([E,this.aaSampleIndex,this.height,A.enabled?A.logDelta:0,A.enabled?1:0,0,0,0]).buffer),this.aaFrontierBuffer&&m.clearBuffer(this.aaFrontierBuffer,0,8);const f=m.beginComputePass();f.setPipeline(this.pipelineAaReseed),f.setBindGroup(0,this.bindGroupAaReseed);const v=Math.ceil(this.neutralSize/16);f.dispatchWorkgroups(v,v),f.end(),this.rawJittered=!0,this.aaFrontierBuffer&&this.aaFrontierReadback&&!this.aaFrontierMapPending&&(m.copyBufferToBuffer(this.aaFrontierBuffer,0,this.aaFrontierReadback,0,8),z=!0),this.aaReseedPending=!1}m.clearBuffer(this.counterBuffer,0,8),this.workStatsClearedSession!==this.workStatsSessionSerial&&(m.clearBuffer(this.workStatsBuffer,0,32),this.workStatsClearedSession=this.workStatsSessionSerial);const b=m.beginComputePass();b.setPipeline(this.getInplacePipeline(this.floatExpActive)),b.setBindGroup(0,this.bindGroupInplace);const R=Math.ceil(this.neutralSize/8);if(b.dispatchWorkgroups(R,R),b.end(),j){const E=++this.counterReadbackSequence,A=this.counterReadbackGeneration;m.copyBufferToBuffer(this.counterBuffer,0,j.buffer,0,8),m.copyBufferToBuffer(this.workStatsBuffer,0,j.buffer,8,32),this.lastCounterDispatchFrame=c,_={slot:j,sequence:E,generation:A,frame:c}}}const J=!!this.bindGroupColorRaw&&!this.needFreezeSnapshot&&!this.needMergeSnapshot&&this.unfinishedPixelCount===0&&this.activePixelCount===0&&this.counterSampleFrame>=this.lastRawMutationFrame;this.resolveSkipped=J;const P=!this.clearHistoryNextFrame&&!this.needFreezeSnapshot&&!this.needMergeSnapshot&&!Z(this.zoomState)&&!this.orbitIncomplete&&this.unfinishedPixelCount===0&&this.activePixelCount===0&&!this.hasPendingCounterReadbackForCurrentGeneration();if(!J){m.copyTextureToTexture({texture:this.rawTexture},{texture:this.resolvedTexture},{width:this.neutralSize,height:this.neutralSize,depthOrArrayLayers:Ee});const b=m.beginRenderPass({colorAttachments:k(this.resolvedLayerViews,"load")});b.setPipeline(this.pipelineResolve),b.setBindGroup(0,this.bindGroupResolve),b.draw(6,1,0,0),b.end()}const $=J?this.bindGroupColorRaw:this.bindGroupColor,K=this.ctx.getCurrentTexture().createView(),Q=Math.max(1,Math.round(e.antialiasLevel??1)),ee=Math.sqrt(n*n+1);this.aaActive&&Q<=1&&this.resetAaState(),this.aaAuto&&Q>1&&!this.aaActive&&this.aaAccumulatedSamples===0&&P&&this.triggerAaAccumulation();const W=this.aaActive&&P&&this.aaAccumulatedSamples<Q&&!!this.accumTextureView&&!!this.pipelineColorAccum&&!!this.pipelineColorAccumClear,q=this.aaActive&&(this.aaAccumulatedSamples>=1||W);if(W&&J&&this.aaSampleIndex>0&&(this.aaOffsetX!==0||this.aaOffsetY!==0)&&this.aaAnalyticParams(n).enabled&&this.device.queue.writeBuffer(this.uniformBufferColor,252,new Float32Array([1]).buffer),W){const b=this.aaSampleIndex===0,R=m.beginRenderPass({colorAttachments:[{view:this.accumTextureView,clearValue:{r:0,g:0,b:0,a:0},loadOp:b?"clear":"load",storeOp:"store"}]});R.setPipeline(b?this.pipelineColorAccumClear:this.pipelineColorAccum),R.setBindGroup(0,$),R.draw(6,1,0,0),R.end()}else if(!q){const b=m.beginRenderPass({colorAttachments:[{view:K,clearValue:{r:1,g:1,b:1,a:1},loadOp:"clear",storeOp:"store"}]});b.setPipeline(this.pipelineColor),b.setBindGroup(0,$),b.draw(6,1,0,0),b.end()}if(q&&this.pipelinePresent&&this.bindGroupPresent){const b=m.beginRenderPass({colorAttachments:[{view:K,clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}]});b.setPipeline(this.pipelinePresent),b.setBindGroup(0,this.bindGroupPresent),b.draw(6,1,0,0),b.end()}if(this.debugViewMode>0&&this.pipelineDebug&&this.bindGroupDebug){const b=m.beginRenderPass({colorAttachments:[{view:K,clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}]});b.setPipeline(this.pipelineDebug),b.setBindGroup(0,this.bindGroupDebug),b.draw(6,1,0,0),b.end()}if(W&&this.aaSampleIndex===0&&!!this.pipelineAaTarget&&!!this.bindGroupAaTarget&&!!this.uniformBufferAaTarget){this.device.queue.writeBuffer(this.uniformBufferAaTarget,0,new Float32Array([Q,0,this.height,0,0,0,0,0]).buffer);const b=m.beginComputePass();b.setPipeline(this.pipelineAaTarget),b.setBindGroup(0,this.bindGroupAaTarget),b.dispatchWorkgroups(Math.ceil(this.neutralSize/16),Math.ceil(this.neutralSize/16)),b.end()}const ie=performance.now();if(this.device.queue.submit([m.finish()]),this.debugViewMode>0){const b=performance.now();this.device.queue.onSubmittedWorkDone().then(()=>{console.log(`[debug view] GPU frame ${(performance.now()-b).toFixed(1)}ms (mode ${this.approximationMode}, view ${this.debugViewMode})`)})}if(this.scheduleGpuTiming(ie),_&&this.scheduleCounterReadback(_.slot,_.sequence,_.generation,_.frame),z&&this.readbackAaFrontier(),this.clearHistoryNextFrame&&(this.rawJittered=this.aaOffsetX!==0||this.aaOffsetY!==0),this.clearHistoryNextFrame=!1,this.prevFrameMandelbrot={...this.previousMandelbrot},this.needRender=!1,W)if(this.aaAccumulatedSamples++,this.aaAccumulatedSamples<Q){this.aaSampleIndex++;const b=Js(this.aaSampleIndex);this.aaOffsetX=b.x*ee/Math.max(1,this.neutralSize),this.aaOffsetY=b.y*ee/Math.max(1,this.neutralSize),this.useAaSelectiveReseed&&r<=1&&!!this.pipelineAaReseed&&!!this.bindGroupAaReseed?(this.aaReseedPending=!0,this.invalidateCounterReadback()):this.clearHistoryNextFrame=!0,this.needRender=!0}else this.aaActive=!1;if(this.snapshotCallback){try{const b=this.snapshotDestWidth??256,R=Math.round(b*9/16),E=this.device.createTexture({size:[b,R,1],format:this.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});{const F=this.device.createCommandEncoder(),G=F.beginRenderPass({colorAttachments:[{view:E.createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}]});G.setPipeline(this.pipelineColor),G.setBindGroup(0,$),G.draw(6,1,0,0),G.end(),this.device.queue.submit([F.finish()])}const A=F=>F+255&-256,f=b*4,v=A(f),M=v*R,T=this.device.createBuffer({size:M,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});{const F=this.device.createCommandEncoder();F.copyTextureToBuffer({texture:E},{buffer:T,offset:0,bytesPerRow:v},{width:b,height:R,depthOrArrayLayers:1}),this.device.queue.submit([F.finish()])}await this.device.queue.onSubmittedWorkDone(),await T.mapAsync(GPUMapMode.READ);const D=T.getMappedRange(),I=new Uint8ClampedArray(b*R*4),C=new Uint8Array(D);for(let F=0;F<R;++F)for(let G=0;G<b;++G){const ae=F*v+G*4,_e=(F*b+G)*4;I[_e+0]=C[ae+2],I[_e+1]=C[ae+1],I[_e+2]=C[ae+0],I[_e+3]=C[ae+3]}const H=document.createElement("canvas");H.width=b,H.height=R,H.getContext("2d").putImageData(new ImageData(I,b,R),0,0),T.unmap(),this.snapshotCallback(H.toDataURL("image/png"))}catch{this.snapshotCallback("")}this.snapshotCallback=void 0,this.snapshotDestWidth=void 0}}destroy(){this.stopRenderLoop(),this.postReferenceWorker({type:"dispose"}),this.referenceWorker?.terminate(),this.referenceWorker=void 0,this.rawTexture?.destroy?.(),this.rawBrushTexture?.destroy?.(),this.resolvedTexture?.destroy?.(),this.frozenTexture?.destroy?.(),this.mandelbrotReferenceBuffer?.destroy?.(),this.mandelbrotBlaBuffer?.destroy?.(),this.mandelbrotBlaLevelBuffer?.destroy?.(),this.uniformBufferMandelbrot?.destroy?.(),this.uniformBufferColor?.destroy?.(),this.uniformBufferBrush?.destroy?.(),this.uniformBufferResolve?.destroy?.(),this.counterBuffer?.destroy?.();for(const e of this.counterReadbackSlots)e.buffer.destroy?.();this.counterReadbackSlots=[],this.uniformBufferMerge?.destroy?.(),this.webcamTexture?.closeWebcam(),this.webcamTileTexture?.destroy?.(),this.paletteTexture?.destroy?.()}needsMoreFrames(){let e="";return this.needRender?e="needRender":this.snapshotCallback?e="snapshot":Z(this.zoomState)?e="zoomActive":this.clearHistoryNextFrame?e="clearHistory":this.needFreezeSnapshot?e="freezeSnapshot":this.needMergeSnapshot?e="mergeSnapshot":this.isReferenceValidating?e="referenceValidating":this.orbitIncomplete?e="orbitIncomplete":this.unfinishedPixelCount<0||this.unfinishedPixelCount>jt?e=`unfinished=${this.unfinishedPixelCount}`:this.aaActive?e="aaAccumulating":this.aaAuto&&!this.aaActive&&this.aaAccumulatedSamples===0&&this.unfinishedPixelCount===0&&this.activePixelCount===0&&!this.orbitIncomplete&&!Z(this.zoomState)&&(e="aaAutoPending"),e!==""}getIterationBatchSize(){return this.iterationBatchSize}startRenderLoop(e){this._drawFn=e,this._rafId===null&&(this._rafId=requestAnimationFrame(async()=>this._loop()))}stopRenderLoop(){this._rafId!==null&&(cancelAnimationFrame(this._rafId),this._rafId=null),this._drawFn=null}async _loop(){if(!this._drawFn){this._rafId=null;return}const e=performance.now(),n=Math.min(this.smoothedGpuTimeMs,500);if(e-this._lastDrawMs>=n){this._lastDrawMs=e;const r=this.needsMoreFrames();this.isRendering=r,await this._drawFn(),r&&this._fpsFrameCount++;const a=performance.now();this._fpsLastTime===0&&(this._fpsLastTime=a);const i=a-this._fpsLastTime;i>=1e3&&(this.fps=Math.round(this._fpsFrameCount*1e3/i),this._fpsFrameCount=0,this._fpsLastTime=a)}this._rafId=requestAnimationFrame(async()=>this._loop())}async updateTileTexture(e,n=e){if(this.tileTextureSourceKey===n)return;const r=await this._loadTexture(e);this.tileTexture?.destroy?.(),this.tileTexture=r,this.tileTextureView=this.tileTexture.createView(),this.tileTextureSourceKey=n,this.rebuildColorBindGroup(),this.needRender=!0}isTileTextureSourceCurrent(e){return this.tileTextureSourceKey===e}async updateSkyboxTexture(e,n=e){if(this.skyboxTextureSourceKey===n)return;const r=await this._loadTexture(e);this.skyboxTexture?.destroy?.(),this.skyboxTexture=r,this.skyboxTextureView=this.skyboxTexture.createView(),this.skyboxTextureSourceKey=n,this.rebuildColorBindGroup(),this.needRender=!0}isSkyboxTextureSourceCurrent(e){return this.skyboxTextureSourceKey===e}rebuildColorBindGroup(){if(this.pipelineColor&&this.resolvedArrayView&&this.frozenArrayView){const e=this.pipelineColor.getBindGroupLayout(0),n=r=>[{binding:0,resource:{buffer:this.uniformBufferColor}},{binding:1,resource:r},{binding:2,resource:this.tileTextureView},{binding:3,resource:this.skyboxTextureView},{binding:4,resource:this.webcamTextureView},{binding:5,resource:this.paletteTextureView},{binding:6,resource:this.frozenArrayView},{binding:7,resource:this.paletteSampler},{binding:8,resource:this.skyboxSampler},{binding:9,resource:this.aaTargetTextureView}];this.bindGroupColor=this.device.createBindGroup({layout:e,entries:n(this.resolvedArrayView),label:"Engine BindGroup Color"}),this.bindGroupColorRaw=this.rawArrayView?this.device.createBindGroup({layout:e,entries:n(this.rawArrayView),label:"Engine BindGroup Color (raw)"}):void 0}}async _loadTexture(e){const n=new Image;n.src=e;try{await n.decode()}catch(i){throw console.warn("\xc9chec du chargement de la texture : "+e,i),i}const r=await createImageBitmap(n,{premultiplyAlpha:"none"}),a=this.device.createTexture({size:[r.width,r.height,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine LoadedTexture "+e});return this.device.queue.copyExternalImageToTexture({source:r},{texture:a},[r.width,r.height]),a}static ITER_PIXEL_LAYERS=[0,2,3,4,5];async readIterationDataAt(e,n,r,a){if(!this.resolvedTexture||!this.device)return null;const i=this.resolveSkipped&&this.rawTexture?this.rawTexture:this.resolvedTexture,o=this.width/Math.max(1,this.height),c=this.previousMandelbrot?.angle??0,d=e/Math.max(1,r),x=1-n/Math.max(1,a),h=d*2-1,y=x*2-1,w=h*o,S=y,p=Math.sin(c),g=Math.cos(c),B=g*w-p*S,O=p*w+g*S,u=Math.sqrt(o*o+1),U=B/u,te=O/u,j=U*.5+.5,_=te*.5+.5,z=this.neutralSize,m=Math.floor(Math.max(0,Math.min(z-1,j*z))),k=Math.floor(Math.max(0,Math.min(z-1,(1-_)*z))),N=cn.ITER_PIXEL_LAYERS,J=1,P=4,K=(f=>f+255&-256)(J*P),Q=K*N.length,ee=this.device.createBuffer({size:Q,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,label:"Engine IterPixel Readback"}),W=this.device.createCommandEncoder();for(let f=0;f<N.length;f++)W.copyTextureToBuffer({texture:i,origin:{x:m,y:k,z:N[f]}},{buffer:ee,offset:K*f,bytesPerRow:K},{width:1,height:1,depthOrArrayLayers:1});this.device.queue.submit([W.finish()]),await ee.mapAsync(GPUMapMode.READ);const q=new Float32Array(ee.getMappedRange()),ne=K/P,ie=q[0*ne],b=q[1*ne],R=q[2*ne],E=q[3*ne],A=q[4*ne];return ee.unmap(),ee.destroy(),ie<0?null:{iter:ie,zx:b,zy:R,derX:E,derY:A}}async updateWebcamTexture(){try{await this.webcamTexture?.openWebcam(),this.webcamTexture?.isOpen()&&await this.webcamTexture?.drawWebGPUTexture(this.webcamTileTexture,this.device)}catch(e){console.warn("Webcam texture update failed:",e)}}async getSnapshotPng(e=256){return await new Promise(n=>{this.snapshotCallback=n,this.snapshotDestWidth=e,this.needRender=!0})}}let pl,hl,gl,ml,bl,vl,xl,_t,Zn,yl,Sl,wl;pl={class:"mandelbrot-canvas-wrap"};hl={key:0,class:"debug-legend","aria-hidden":"true"};_l=tn({__name:"Mandelbrot",props:We({mu:{default:4},epsilon:{default:1e-9},colorStops:{default:()=>[{color:"#002500",position:0},{color:"#175b3d",position:.16},{color:"#ffceb6",position:.26},{color:"#edffff",position:.42},{color:"#ff8fbc",position:.7016397849462366},{color:"#a6003e",position:.8575},{color:"#100000",position:1}]},palettePeriod:{default:100},paletteOffset:{default:0},heightPaletteShift:{default:0},paletteMirror:{type:Boolean,default:!1},antialiasLevel:{default:1},aaAuto:{type:Boolean,default:!1},activateAnimate:{type:Boolean,default:!1},debugShading:{type:Boolean,default:!1},debugView:{default:0},dprMultiplier:{default:1},maxIterationMultiplier:{default:.1},targetFps:{default:60},gpuLoadMultiplier:{default:1},zoomMinBrushStep:{default:1},sentinelSeedStep:{default:64},interpolationMode:{default:"lab"},tessellationLevel:{default:0},displacementAmount:{default:0},animation:{default:()=>vt(null,1)},animationSpeed:{default:1},ambientOcclusionStrength:{default:0},microBumpStrength:{default:0},subsurfaceStrength:{default:0},reliefDepth:{default:1},localShadowStrength:{default:0},lightAngle:{default:0},varnishStrength:{default:0},orbitTrapStrength:{default:0},phaseColoringStrength:{default:0},stripeFrequency:{default:8},textureMapping:{default:()=>Ot({textureMappingMode:0})},textureMappingMode:{}},{cx:{default:"-1.9771995110313272619112808106831597"},cxModifiers:{},cy:{default:"0.0"},cyModifiers:{},scale:{default:"2.5"},scaleModifiers:{},angle:{default:0},angleModifiers:{}}),emits:We(["ready"],["update:cx","update:cy","update:scale","update:angle"]),setup(t,{expose:e,emit:n}){const r=Ae(null);let a=null,i=null,o,c=!1,d="";const x=Ae(null),h=Ae(null),y=Ae(!1);function w(_){if(typeof _!="string")return!1;const z=_.trim();return z?/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(z):!1}const S=n,p=ce(t,"cx"),g=ce(t,"cy"),B=ce(t,"scale"),O=ce(t,"angle");Je(()=>[p.value,g.value,B.value,O.value],([_,z,m,k],[N,J,P,$])=>{(_!==N||z!==J)&&console.log("[REF] Mandelbrot.vue watcher cx change",String(_).slice(0,14),"isUpdating",c),!c&&o&&(!_||!z||!m||((_!==N||z!==J)&&w(_)&&w(z)&&(o.cancel_transition(),o.origin(_,z),i?.resetReference(_,z)),m!==P&&(console.log("[REF] watcher scale change",String(m).slice(0,14),"type",typeof m,"valid",w(m)),w(m)&&o.scale(m)),k!==$&&o.angle(Number(k))))},{flush:"sync"});const u=t;Je(()=>u.dprMultiplier,_=>{i&&(i.dprMultiplier=_,j())}),Je(()=>u.targetFps,_=>{i&&(i.targetFps=_)}),Je(()=>u.gpuLoadMultiplier,_=>{i&&(i.gpuLoadMultiplier=_)});async function U(){if(!i||!o)return;const _=r.value,z=o.step(_?_.width:void 0,_?_.height:void 0);if(!z)return;const[m,k]=z,[N,J,P,$]=o.get_params(),K=o.view_floatexp();P!==d&&(d=P,console.log("[REF] draw scale",P,"dx",String(m).slice(0,12),"cx",String(N).slice(0,14))),c=!0,p.value=N,g.value=J,B.value=P,O.value=parseFloat($),await Cr(),c=!1;const Q=Math.max(u.mu,4),ee=Math.max(0,Math.ceil(Math.log2(Math.log(Q)/Math.log(4)))),W=Math.min(Math.max(100,1e3*u.maxIterationMultiplier*-gr(P))+ee,1e7);if(await i.update({cx:N,cy:J,dx:parseFloat(m),dy:parseFloat(k),dxStr:m,dyStr:k,viewFloatexp:K,mu:u.mu,scale:parseFloat(P),scaleStr:P,angle:parseFloat($),maxIterations:W,epsilon:u.epsilon},{antialiasLevel:u.antialiasLevel,aaAuto:u.aaAuto,palettePeriod:u.palettePeriod,paletteOffset:u.paletteOffset,heightPaletteShift:u.heightPaletteShift,paletteMirror:u.paletteMirror,colorStops:Ir(u.colorStops),interpolationMode:u.interpolationMode,activateAnimate:u.activateAnimate,debugShading:u.debugShading,debugView:u.debugView??0,tessellationLevel:u.tessellationLevel,displacementAmount:u.displacementAmount,animation:vt(u.animation,u.animationSpeed),animationSpeed:u.animationSpeed,ambientOcclusionStrength:u.ambientOcclusionStrength,microBumpStrength:u.microBumpStrength,subsurfaceStrength:u.subsurfaceStrength,reliefDepth:u.reliefDepth,localShadowStrength:u.localShadowStrength,lightAngle:u.lightAngle,varnishStrength:u.varnishStrength,orbitTrapStrength:u.orbitTrapStrength,phaseColoringStrength:u.phaseColoringStrength,stripeFrequency:u.stripeFrequency,zoomMinBrushStep:u.zoomMinBrushStep,sentinelSeedStep:u.sentinelSeedStep,textureMapping:Ot(u),textureMappingMode:u.textureMappingMode}),await i.render(),u.debugShading&&o&&r.value){const q=o.get_reference_params();if(q&&q.length>=2){const[ne,ie]=q,b=r.value.width,R=r.value.height,E=o.coordinate_to_pixel(ne,ie,b,R);if(E&&E.length===2){const A=E[0]*(r.value.clientWidth/b),f=E[1]*(r.value.clientHeight/R);x.value=A,h.value=f,y.value=A>=0&&A<=r.value.clientWidth&&f>=0&&f<=r.value.clientHeight}else y.value=!1}else y.value=!1}else y.value=!1}Je(()=>u.debugShading,_=>{_&&i&&!i.isRendering&&U()});async function te(){if(!r.value)return;a=r.value;let _=p.value,z=g.value,m=B.value;return w(_)||(_="-0.7",p.value=_),w(z)||(z="0.0",g.value=z),w(m)||(m="2.5",B.value=m),o=new qt(_,z,m,Number(O.value)),o.origin(_,z),o.scale(m),o.angle(Number(O.value)),i=new cn(a,{antialiasLevel:u.antialiasLevel,aaAuto:u.aaAuto,palettePeriod:u.palettePeriod,paletteOffset:u.paletteOffset,heightPaletteShift:u.heightPaletteShift,paletteMirror:u.paletteMirror,colorStops:u.colorStops,interpolationMode:u.interpolationMode,activateAnimate:u.activateAnimate,debugShading:u.debugShading,debugView:u.debugView??0,tessellationLevel:u.tessellationLevel,displacementAmount:u.displacementAmount,animation:vt(u.animation,u.animationSpeed),animationSpeed:u.animationSpeed,ambientOcclusionStrength:u.ambientOcclusionStrength,microBumpStrength:u.microBumpStrength,subsurfaceStrength:u.subsurfaceStrength,reliefDepth:u.reliefDepth,localShadowStrength:u.localShadowStrength,lightAngle:u.lightAngle,varnishStrength:u.varnishStrength,orbitTrapStrength:u.orbitTrapStrength,phaseColoringStrength:u.phaseColoringStrength,stripeFrequency:u.stripeFrequency,zoomMinBrushStep:u.zoomMinBrushStep,sentinelSeedStep:u.sentinelSeedStep,textureMapping:Ot(u),textureMappingMode:u.textureMappingMode}),i.dprMultiplier=u.dprMultiplier??1,i.targetFps=u.targetFps??60,i.gpuLoadMultiplier=u.gpuLoadMultiplier??1,i.initialize(o)}async function j(){if(!r.value||!i)return;const _=r.value.getBoundingClientRect();r.value.width=_.width,r.value.height=_.height,i.resize()}return Xn(async()=>{await te(),window.addEventListener("resize",j),await j(),i&&(S("ready",i),i.startRenderLoop(U))}),Yn(()=>{i?.destroy(),i=null,window.removeEventListener("resize",j)}),e({getCanvas:()=>r.value,getEngine:()=>i,getNavigator:()=>o,translate:(_,z)=>o?.translate(_,z),translateDirect:(_,z)=>{if(!o)return;const m=r.value;o.translate_direct(_,z,m?m.width:void 0,m?m.height:void 0)},rotate:_=>o?.rotate(_),angle:_=>o?.angle(_),zoom:_=>{console.log("[REF] zoom() called factor",_),o?.zoom(_)},resetReferenceTo:(_,z,m,k)=>{console.log("[REF] resetReferenceTo (travel done)",_.slice(0,14),"scale",m,"engine?",!!i,"nav?",!!o),!(!o||!i)&&(o.cancel_transition(),o.origin(_,z),o.scale(m),o.angle(k),i.resetReference(_,z))},step:()=>{if(!o)return;const _=r.value;return o.step(_?_.width:void 0,_?_.height:void 0)},getParams:()=>o?.get_params(),drawOnce:async()=>U(),resize:async()=>j(),initialize:async()=>te(),useBla:()=>i?.setApproximationMode("bla"),usePerturbation:()=>i?.setApproximationMode("perturbation"),setApproximationMode:_=>i?.setApproximationMode(_),getApproximationMode:()=>i?.getApproximationMode(),setBlaEpsilon:_=>i?.setBlaEpsilon(_),setPrecisionBudget:_=>i?.setPrecisionBudget(_),getPrecisionBudget:()=>i?.getPrecisionBudget()}),(_,z)=>(Le(),Be("div",pl,[L("canvas",{ref_key:"canvasRef",ref:r},null,512),u.debugShading?(Le(),Be("div",hl,[...z[0]||(z[0]=[L("div",{class:"debug-legend-item debug-legend-top-left"},"Distance au bord",-1),L("div",{class:"debug-legend-item debug-legend-top-right"},"Palette / phase continue",-1),L("div",{class:"debug-legend-item debug-legend-bottom-left"},"Gradient du relief",-1),L("div",{class:"debug-legend-item debug-legend-bottom-right"},"Angle de la d\xe9riv\xe9e",-1)])])):Ht("",!0),u.debugShading&&y.value&&x.value!==null&&h.value!==null?(Le(),Be("div",{key:1,class:"debug-ref-marker",style:Dr({left:x.value+"px",top:h.value+"px"})},[...z[1]||(z[1]=[L("div",{class:"debug-ref-crosshair"},null,-1),L("div",{class:"debug-ref-label"},"R\xe9f",-1)])],4)):Ht("",!0)]))}});gl={class:"mobile-nav-controls"};ml={key:0,class:"directional-controls"};bl=tn({__name:"MobileNavigationControls",props:We({mandelbrotRef:{}},{expanded:{type:Boolean,default:!1},expandedModifiers:{}}),emits:["update:expanded"],setup(t){const e=t,n=ce(t,"expanded"),r=Ae(null);let a=null;const i=()=>{n.value=!n.value,n.value||c()},o=S=>{S.preventDefault(),S.stopPropagation(),i()},c=()=>{r.value=null,a!==null&&(clearInterval(a),a=null)},d=S=>{r.value=S;const p=.01,g=()=>{if(e.mandelbrotRef)switch(S){case"north":e.mandelbrotRef.translate(0,p);break;case"south":e.mandelbrotRef.translate(0,-p);break;case"west":e.mandelbrotRef.translate(-p,0);break;case"east":e.mandelbrotRef.translate(p,0);break}};g(),a=window.setInterval(g,16)},x=S=>{r.value=`rotate-${S}`;const p=.025,g=()=>{e.mandelbrotRef&&(S==="left"?e.mandelbrotRef.rotate(p):e.mandelbrotRef.rotate(-p))};g(),a=window.setInterval(g,16)},h=S=>{r.value=`zoom-${S}`;const p=.97,g=()=>{e.mandelbrotRef&&(S==="in"?e.mandelbrotRef.zoom(p):e.mandelbrotRef.zoom(1/p))};g(),a=window.setInterval(g,16)},y=(S,p)=>{S.preventDefault(),p()},w=S=>{S.preventDefault(),c()};return(S,p)=>(Le(),Be("div",gl,[L("button",{class:"nav-button compass-button",onClick:i,onTouchend:o,"aria-label":"Toggle navigation"},[...p[16]||(p[16]=[L("i",{class:"fa-solid fa-compass fa-2x nav-icon"},null,-1)])],32),Vt(Pr,{name:"fade"},{default:Fr(()=>[n.value?(Le(),Be("div",ml,[L("button",{class:"nav-button direction-button north",onTouchstart:p[0]||(p[0]=g=>y(g,()=>d("north"))),onTouchend:w,onMousedown:p[1]||(p[1]=g=>d("north")),onMouseup:c,onMouseleave:c,"aria-label":"Move North"},[...p[17]||(p[17]=[L("i",{class:"fa-solid fa-arrow-up fa-3x nav-icon"},null,-1)])],32),L("button",{class:"nav-button direction-button south",onTouchstart:p[2]||(p[2]=g=>y(g,()=>d("south"))),onTouchend:w,onMousedown:p[3]||(p[3]=g=>d("south")),onMouseup:c,onMouseleave:c,"aria-label":"Move South"},[...p[18]||(p[18]=[L("i",{class:"fa-solid fa-arrow-down fa-3x nav-icon"},null,-1)])],32),L("button",{class:"nav-button direction-button west",onTouchstart:p[4]||(p[4]=g=>y(g,()=>d("west"))),onTouchend:w,onMousedown:p[5]||(p[5]=g=>d("west")),onMouseup:c,onMouseleave:c,"aria-label":"Move West"},[...p[19]||(p[19]=[L("i",{class:"fa-solid fa-arrow-left fa-3x nav-icon"},null,-1)])],32),L("button",{class:"nav-button direction-button east",onTouchstart:p[6]||(p[6]=g=>y(g,()=>d("east"))),onTouchend:w,onMousedown:p[7]||(p[7]=g=>d("east")),onMouseup:c,onMouseleave:c,"aria-label":"Move East"},[...p[20]||(p[20]=[L("i",{class:"fa-solid fa-arrow-right fa-3x nav-icon"},null,-1)])],32),L("button",{class:"nav-button corner-button rotate-left",onTouchstart:p[8]||(p[8]=g=>y(g,()=>x("left"))),onTouchend:w,onMousedown:p[9]||(p[9]=g=>x("left")),onMouseup:c,onMouseleave:c,"aria-label":"Rotate Left"},[...p[21]||(p[21]=[L("i",{class:"fa-solid fa-rotate-left fa-2x nav-icon"},null,-1)])],32),L("button",{class:"nav-button corner-button rotate-right",onTouchstart:p[10]||(p[10]=g=>y(g,()=>x("right"))),onTouchend:w,onMousedown:p[11]||(p[11]=g=>x("right")),onMouseup:c,onMouseleave:c,"aria-label":"Rotate Right"},[...p[22]||(p[22]=[L("i",{class:"fa-solid fa-rotate-right fa-2x nav-icon"},null,-1)])],32),L("button",{class:"nav-button corner-button zoom-out",onTouchstart:p[12]||(p[12]=g=>y(g,()=>h("out"))),onTouchend:w,onMousedown:p[13]||(p[13]=g=>h("out")),onMouseup:c,onMouseleave:c,"aria-label":"Zoom Out"},[...p[23]||(p[23]=[L("svg",{class:"nav-icon",viewBox:"0 0 24 24",width:"28",height:"28",fill:"none",stroke:"currentColor","stroke-width":"2.4","stroke-linecap":"round","stroke-linejoin":"round","aria-hidden":"true"},[L("circle",{cx:"11",cy:"11",r:"7"}),L("path",{d:"M21 21l-5-5M8 11h6"})],-1)])],32),L("button",{class:"nav-button corner-button zoom-in",onTouchstart:p[14]||(p[14]=g=>y(g,()=>h("in"))),onTouchend:w,onMousedown:p[15]||(p[15]=g=>h("in")),onMouseup:c,onMouseleave:c,"aria-label":"Zoom In"},[...p[24]||(p[24]=[L("svg",{class:"nav-icon",viewBox:"0 0 24 24",width:"28",height:"28",fill:"none",stroke:"currentColor","stroke-width":"2.4","stroke-linecap":"round","stroke-linejoin":"round","aria-hidden":"true"},[L("circle",{cx:"11",cy:"11",r:"7"}),L("path",{d:"M21 21l-5-5M8 11h6M11 8v6"})],-1)])],32)])):Ht("",!0)]),_:1})]))}});vl=$n(bl,[["__scopeId","data-v-842a47c9"]]);xl={style:{position:"relative",width:"100%",height:"100%"}};_t=.01;Zn=.025;yl=300;Sl=30;wl=tn({__name:"MandelbrotController",props:We({mu:{},epsilon:{},colorStops:{},antialiasLevel:{},aaAuto:{type:Boolean},palettePeriod:{},paletteOffset:{},heightPaletteShift:{},paletteMirror:{type:Boolean},activateAnimate:{type:Boolean},debugShading:{type:Boolean},dprMultiplier:{},maxIterationMultiplier:{},targetFps:{},gpuLoadMultiplier:{},zoomMinBrushStep:{},sentinelSeedStep:{},interpolationMode:{},pickerMode:{type:Boolean},uiHidden:{type:Boolean},tessellationLevel:{},displacementAmount:{},animation:{},animationSpeed:{},ambientOcclusionStrength:{},microBumpStrength:{},subsurfaceStrength:{},reliefDepth:{},localShadowStrength:{},lightAngle:{},varnishStrength:{},orbitTrapStrength:{},phaseColoringStrength:{},stripeFrequency:{},textureMapping:{},textureMappingMode:{}},{cx:{},cxModifiers:{},cy:{},cyModifiers:{},scale:{},scaleModifiers:{},angle:{},angleModifiers:{},mobileNavExpanded:{type:Boolean,default:!1},mobileNavExpandedModifiers:{}}),emits:We(["palettePick","pickerDone","engineReady","requestShowUi"],["update:cx","update:cy","update:scale","update:angle","update:mobileNavExpanded"]),setup(t,{expose:e,emit:n}){const r=ce(t,"cx"),a=ce(t,"cy"),i=ce(t,"scale"),o=ce(t,"angle"),c=ce(t,"mobileNavExpanded"),d=t,x=n,h=Ae(null),y={};e({getCanvas:k,getEngine:()=>h.value?.getEngine()??null,getNavigator:()=>h.value?.getNavigator()??null,resetReferenceTo:(f,v,M,T)=>{h.value?.resetReferenceTo?.(f,v,M,T)}});let w=!1,S=!1,p=0,g=0,B=0,O=0,u=0,U=!1,te=0,j=null,_=0,z=0,m=0;function k(){return h.value?.getCanvas()??null}function N(f){const v=k();if(!v)return{x:0,y:0,width:0,height:0};const M=v.getBoundingClientRect();return{x:f.clientX-M.left,y:f.clientY-M.top,width:M.width,height:M.height}}function J(f){const v=f.target?.tagName?.toLowerCase();v==="input"||v==="textarea"||v==="select"||f.target?.isContentEditable||(y[f.code]=!0)}function P(f){y[f.code]=!1}function $(f){if(d.pickerMode){f.preventDefault();return}f.preventDefault();const v=.95;f.deltaY<0?h.value?.zoom(v):h.value?.zoom(1/v)}function K(f,v){const M=k();if(!M)return;const T=M.getBoundingClientRect(),D=f-T.left,I=v-T.top,C=T.width,H=T.height,F=C/H,G=(D-C/2)/C*2,ae=(I-H/2)/H*2;h.value?.translateDirect(G*F,-ae)}function Q(f){if(d.pickerMode){f.preventDefault();return}if(f.preventDefault(),d.uiHidden){x("requestShowUi");return}K(f.clientX,f.clientY)}function ee(f){if(d.pickerMode||f.touches.length!==0)return;const v=Date.now(),M=f.changedTouches[0];if(!M)return;const T=M.clientX,D=M.clientY;if(v-_<yl&&Math.hypot(T-z,D-m)<Sl){if(f.preventDefault(),_=0,d.uiHidden){x("requestShowUi");return}K(T,D)}else _=v,z=T,m=D}function W(f){if(d.pickerMode){f.preventDefault(),q(f);return}if(f.button===2)S=!0;else{w=!0;const v=N(f);p=v.x,g=v.y}}async function q(f){try{const v=h.value?.getEngine();if(!v)return;const M=k();if(!M)return;const T=M.getBoundingClientRect(),D=f.clientX-T.left,I=f.clientY-T.top,C=await v.readIterationDataAt(D,I,T.width,T.height);if(!C)return;x("palettePick",C,f.clientX,f.clientY)}finally{x("pickerDone")}}function ne(f){if(d.pickerMode)return;const v=N(f);if(S){const H=k();if(!H)return;const F=H.getBoundingClientRect(),G=F.width/2,ae=F.height/2,_e=v.x,ge=v.y,rt=Math.atan2(ge-ae,_e-G);h.value?.angle(rt);return}if(!w)return;const M=v.width,T=v.height,D=M/T,I=(v.x-p)/M*2,C=(v.y-g)/T*2;h.value?.translateDirect(-I*D,C),p=v.x,g=v.y}function ie(f){d.pickerMode||(f.button===2?S=!1:w=!1)}function b(f){if(d.pickerMode)return;const v=k();if(v){if(f.touches.length===1){w=!0;const M=f.touches[0],T=v.getBoundingClientRect();p=M.clientX-T.left,g=M.clientY-T.top}else if(f.touches.length===2){w=!1,U=!0;const[M,T]=f.touches;B=Math.hypot(T.clientX-M.clientX,T.clientY-M.clientY),te=B,O=Math.atan2(T.clientY-M.clientY,T.clientX-M.clientX);const D=h.value?.getParams();u=D?parseFloat(D[3]):0}}}function R(f){if(d.pickerMode)return;const v=k();if(v){if(w&&f.touches.length===1){const M=f.touches[0],T=v.getBoundingClientRect(),D=M.clientX-T.left,I=M.clientY-T.top,C=T.width,H=T.height,F=C/H,G=(D-p)/C*2,ae=(I-g)/H*2;h.value?.translateDirect(-G*F,ae),p=D,g=I}else if(U&&f.touches.length===2){const[M,T]=f.touches,D=Math.hypot(T.clientX-M.clientX,T.clientY-M.clientY),I=Math.atan2(T.clientY-M.clientY,T.clientX-M.clientX),C=te/D;te=D,h.value?.zoom(C);const H=I-O;h.value?.angle(u+H)}}}function E(f){f.touches.length===0&&(w=!1,U=!1)}function A(){if(!d.pickerMode){y.KeyW&&h.value?.translate(0,_t),y.KeyS&&h.value?.translate(0,-_t),y.KeyA&&h.value?.translate(-_t,0),y.KeyD&&h.value?.translate(_t,0),y.KeyQ&&h.value?.rotate(Zn),y.KeyE&&h.value?.rotate(-Zn);const f=.97;y.KeyR&&h.value?.zoom(f),y.KeyF&&h.value?.zoom(1/f)}j=window.setTimeout(A,16)}return Xn(async()=>{const f=k();f&&(window.addEventListener("keydown",J),window.addEventListener("keyup",P),f.addEventListener("wheel",$,{passive:!1}),f.addEventListener("mousedown",W),f.addEventListener("dblclick",Q),f.addEventListener("contextmenu",v=>v.preventDefault()),window.addEventListener("mousemove",ne),window.addEventListener("mouseup",ie),f.addEventListener("touchstart",b,{passive:!1}),f.addEventListener("touchmove",R,{passive:!1}),f.addEventListener("touchend",E,{passive:!1}),f.addEventListener("touchend",ee,{passive:!1}),A())}),Yn(()=>{j!==null&&clearTimeout(j);const f=k();window.removeEventListener("keydown",J),window.removeEventListener("keyup",P),window.removeEventListener("mousemove",ne),window.removeEventListener("mouseup",ie),f&&(f.removeEventListener("wheel",$),f.removeEventListener("mousedown",W),f.removeEventListener("dblclick",Q),f.removeEventListener("contextmenu",v=>v.preventDefault()),f.removeEventListener("touchstart",b),f.removeEventListener("touchmove",R),f.removeEventListener("touchend",E),f.removeEventListener("touchend",ee))}),(f,v)=>(Le(),Be("div",xl,[Vt(_l,{ref_key:"mandelbrotRef",ref:h,scale:i.value,"onUpdate:scale":v[0]||(v[0]=M=>i.value=M),angle:o.value,"onUpdate:angle":v[1]||(v[1]=M=>o.value=M),cx:r.value,"onUpdate:cx":v[2]||(v[2]=M=>r.value=M),cy:a.value,"onUpdate:cy":v[3]||(v[3]=M=>a.value=M),mu:d.mu,epsilon:d.epsilon,antialiasLevel:d.antialiasLevel,aaAuto:d.aaAuto,palettePeriod:d.palettePeriod,heightPaletteShift:d.heightPaletteShift,paletteMirror:d.paletteMirror,colorStops:d.colorStops,activateAnimate:d.activateAnimate,debugShading:d.debugShading,paletteOffset:d.paletteOffset,dprMultiplier:d.dprMultiplier,maxIterationMultiplier:d.maxIterationMultiplier,targetFps:d.targetFps,gpuLoadMultiplier:d.gpuLoadMultiplier,zoomMinBrushStep:d.zoomMinBrushStep,sentinelSeedStep:d.sentinelSeedStep,interpolationMode:d.interpolationMode,tessellationLevel:d.tessellationLevel,displacementAmount:d.displacementAmount,animation:d.animation,animationSpeed:d.animationSpeed,ambientOcclusionStrength:d.ambientOcclusionStrength,microBumpStrength:d.microBumpStrength,subsurfaceStrength:d.subsurfaceStrength,reliefDepth:d.reliefDepth,localShadowStrength:d.localShadowStrength,lightAngle:d.lightAngle,varnishStrength:d.varnishStrength,orbitTrapStrength:d.orbitTrapStrength,phaseColoringStrength:d.phaseColoringStrength,stripeFrequency:d.stripeFrequency,textureMapping:d.textureMapping,textureMappingMode:d.textureMappingMode,onReady:v[4]||(v[4]=M=>x("engineReady",M))},null,8,["scale","angle","cx","cy","mu","epsilon","antialiasLevel","aaAuto","palettePeriod","heightPaletteShift","paletteMirror","colorStops","activateAnimate","debugShading","paletteOffset","dprMultiplier","maxIterationMultiplier","targetFps","gpuLoadMultiplier","zoomMinBrushStep","sentinelSeedStep","interpolationMode","tessellationLevel","displacementAmount","animation","animationSpeed","ambientOcclusionStrength","microBumpStrength","subsurfaceStrength","reliefDepth","localShadowStrength","lightAngle","varnishStrength","orbitTrapStrength","phaseColoringStrength","stripeFrequency","textureMapping","textureMappingMode"]),Or(Vt(vl,{"mandelbrot-ref":h.value,expanded:c.value,"onUpdate:expanded":v[5]||(v[5]=M=>c.value=M)},null,8,["mandelbrot-ref","expanded"]),[[Gr,!d.uiHidden]])]))}});Tl=$n(wl,[["__scopeId","data-v-300050b7"]])})();export{Tl as M,_l as _,__tla};