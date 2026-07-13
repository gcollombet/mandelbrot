// Fused brush + mandelbrot + count compute pass, working IN PLACE on the
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
//   iter > 0  AND  |z|² >= mu   : escaped
//   iter > 0  AND  |z|² < mu    : budget exhausted → continuation
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

// Portfolio A/B switch: when false the driver folds the secours fallback out
// of try_apply_unified (principal-only dispatch, the pre-portfolio behavior),
// for clean GPU-time / descent-count comparisons. Same specialization-cache
// pattern as ENABLE_DEEP.
override ENABLE_PORTFOLIO: bool = true;

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
  // Padé D = (dx,dy)·2^d_exp. Present to match the shared BlaStep buffer layout;
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
// <<6 (quantization ±32 per workgroup per dispatch).
//   realized skip   = covMean / realMean      (covered iters per real loop step)
//   workgroup waste = maxAccum / realMean      (lane-time / useful work; 1 = ideal)
//   straggler       = maxSteps                 (worst single-texel loop count)
//   total apps      = realMean << 6            (absolute Σ g_workSteps this render)
struct WorkStats {
  realMean: atomic<u32>,
  covMean: atomic<u32>,
  maxAccum: atomic<u32>,
  maxSteps: atomic<u32>,
  // Form mix: Σ applications per form, RAW counts. Slot meaning is
  // MODE-dependent (the panel labels accordingly): mode 5 = [affine, Padé
  // [2/1], c+, jet]; mode 3 = [jet o1, jet o2, jet o3, —]; mode 4 =
  // [—, —, Möbius-c⁺, —]; mode 1 = [BLA, —, —, —]; mode 2 = [—, Padé [1/1],
  // —, —]. Zero in mode 0 (exact).
  tierAff: atomic<u32>,
  tierPade: atomic<u32>,
  tierCplus: atomic<u32>,
  tierJet: atomic<u32>,
  // §18 parabolic-gate observability: Ψ-jumps landed / degraded attempts,
  // raw counts (rare events — no >>6 downscale). Zero while emission is
  // dormant; the ONLY reliable "gates fired" signal (realizedSkip and the
  // tier counters are mode-entangled).
  gateJumps: atomic<u32>,
  gateFails: atomic<u32>,
  // Portfolio observability (mode 5): secours applications and the iterations
  // they covered — the A/B signal "descents avoided" the per-tier counters
  // cannot provide (they mix principal and secours under the applied tag).
  // Raw counts, same no->>6 rationale as the gate counters.
  secoursApps: atomic<u32>,
  secoursIters: atomic<u32>,
  // Applications served by the plain-f32 fast path (mode 5; the complement
  // ran in fe) — the per-application cost mix the panel surfaces.
  appsF32: atomic<u32>,
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
// reads only the first k(k+3)/2 — slots 0/1 are the affine A/B); Möbius-c+
// records are 7 (84 B: A, B, A', D, D', F, N₂ — the [2/1]-c+ form). Both
// tables ship in the SAME buffer (identical 12 B element, exclusive modes) —
// the mode flag picks the stride. Same flat block index as the radius buffer
// either way.
const JET_COEFF_STRIDE: i32 = 9;
const MOBIUS_COEFF_STRIDE: i32 = 7;
// Unified table (mode 5): 9 elements in PREFIX order [A, B, D, N₂, A', D', F,
// a12, a03] ([2/1] record) — same element count as jet, tier-directed prefix
// reads (affine 2, Padé 4, c+ 7, jet 9).
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
// Per-dispatch WORK budget (batch): each loop turn adds the WEIGHT of the
// move it executed — exact step 1, block applications by form cost (fe ≈ ×2),
// Ψ-gate hops 8 — so `maxIteration` bounds homogeneous work ≈ GPU time and
// the adaptive batch controller stays stable across block/exact mix swings
// while navigating. g_workSteps (1/turn) keeps the honest turn stats.
var<private> g_workBudget: u32 = 0u;
// Per-texel tier application counts (auto mode), flushed with the work stats.
var<private> g_tierApps: array<u32, 4> = array<u32, 4>(0u, 0u, 0u, 0u);
var<private> g_gateJumps: u32 = 0u;
var<private> g_gateFails: u32 = 0u;
var<private> g_secoursApps: u32 = 0u;
var<private> g_secoursIters: u32 = 0u;
var<private> g_appsF32: u32 = 0u;

// ── complex helpers (verbatim from mandelbrot.wgsl) ────────────────
fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

// ── extended-exponent complex (floatexp) ───────────────────────────
// value = m · 2^e with one shared integer exponent per complex. Used on the
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

// complex reciprocal 1/z in fe form (Padé denominator): 1/z = conj(z)/|z|².
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
// recomposed from the shared exponent (log(mantissa) + scaleExp·ln2).
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

// Complex reciprocal 1/z (Padé block application).
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
  // (G) near-critical guard: a Möbius block may only span steps with
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
            // ── Padé [1/1] (in-place compute path) ──
            let d = ldexp(vec2<f32>(bla.dx, bla.dy), vec2<i32>(bla.d_exp, bla.d_exp));
            let m = vec2<f32>(1.0, 0.0) + cmul(d, *dz);   // 1 + D·dz
            // (H2) c-truncation bound (|B|·|c| < ε) + (G) near-critical guard
            // (block's min |2Z_k| ≥ mu) + pole guard. Any failing ⇒ descend a level.
            if (length(b) * dcMag < mandelbrot.blaEpsilon && bla.log2_min_a >= log2_mu && dot(m, m) >= PADE_POLE2) {
              let invM = cinv(m);
              let num = cmul(a, *dz) + cmul(b, dc);
              let candidate = cmul(num, invM);
              let candidateZ = getOrbit(*ref_i + skip) + candidate;
              if (!(skip > 1 && dot(candidateZ, candidateZ) > bailout)) {
                *dz = candidate;
                *zOut = candidateZ;
                // D4 derivative der' = (A/M²)·der + B/M, folded in derM/derS
                // space (mirrors try_apply_bla_deep's aOverM2/bOverM split):
                // multiply the raw (unscaled) mantissas by invM²/invM — both
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
                // Form counter (mode 2 = Padé [1/1], shallow = plain f32).
                g_tierApps[1] += 1u;
                g_appsF32 += 1u;
                g_workBudget += 2u;
                *ref_i += skip;
                return skip;
              }
            }
          } else {
            // ── affine BLA: z ← A·z + B·c ──
            let candidate = cmul(a, *dz) + cmul(b, dc);
            let candidateZ = getOrbit(*ref_i + skip) + candidate;
            if (!(skip > 1 && dot(candidateZ, candidateZ) > bailout)) {
              *dz = candidate;
              *zOut = candidateZ;
              // Mantissa-only update + derS fold — see the Padé branch note above.
              *derM = cmul(*derM, vec2<f32>(bla.ax, bla.ay)) + vec2<f32>(bla.bx, bla.by) * (*derInvScale);
              der_scale_add(derS, derSLo, f32(bla.ab_exp) * LN2);
              der_refresh_cache(derM, derS, derSLo, derInvScale, epsThreshold, logEpsilon);
              // Form counter (mode 1 = affine BLA, shallow = plain f32).
              g_tierApps[0] += 1u;
              g_appsF32 += 1u;
              g_workBudget += 1u;
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
  //   in-progress: 9/10 = sndM.x/y (z″ mantissa; scale is TIED to 2·derS)
  //   escaped:     8 = S (derS at escape), 9/10 = derM.x/y (z′ mantissa),
  //                11/12 = sndM.x/y — the Taylor payload ẑ(δc) = z + z′·δc
  //                + ½·z″·δc² the color pass expands per AA sample.
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

  // Derivative state der = derM · exp(derS), carried RAW across pass
  // boundaries (layers 4/5/8 for in-progress pixels): the reload is a bit
  // -exact register copy — no polar round-trip, no transcendental. Fresh
  // pixels pass (0, 0, 0): derM = 0 is the empty state, the "+1" term seeds
  // the first iteration through derInvScale.
  var derM = vec2<f32>(prev_derx, prev_dery);
  var derS: f32 = prev_ders;
  // Compensation term of the derS two-sum pair — register-only, reset each
  // pass (the stored derS is the collapsed hi + lo).
  var derSLo: f32 = 0.0;
  // Phase D: z″ mantissa (scale TIED to 2·derS). Tracked in unified mode; a
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
  // workhorse) — NOT a throwaway preview. BLA (affine) and Padé (rational) both
  // apply here; try_apply_bla branches on approximationMode ≥ 1.5.
  // approximationMode: 1 = affine BLA, 2 = Padé, 3 = jet, 4 = Möbius-c+,
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
    // log2-domain, not squared-radius: a plain dot(dz,dz)/radius² comparison
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
    // dc²/dc³ stay clear of the f32 subnormal band (else the pure-c Horner
    // terms would silently flush — the fe path keeps them).
    let dcF2 = cmul(dc, dc);
    let dcF3 = cmul(dcF2, dc);
    let jetF32Ok = isJet && dcMag > 2.3e-13;
    // Möbius products are degree-1 in dc (no dc²/dc³), so its f32-path gate
    // only needs dc itself clear of the subnormal band.
    let mobiusF32Ok = isMobius && dcMag > 1e-30;
    // Unified fast path: the rational tags are degree-1 in dc (same gate as
    // Möbius); the JET tag reconstructs dc²/dc³ products, so its f32 branch
    // takes the jet-mode gate. The old "jet tag always evaluates in fe" rule
    // was a placeholder-band assumption — the form counters showed the jet
    // tag firing massively at f32-scale |dz| via the secours.
    let unifiedF32Ok = isUnified && dcMag > 1e-30;
    let unifiedJetF32Ok = isUnified && dcMag > 2.3e-13;
    var usedBla = false;
    var blaZ = vec2<f32>(0.0);
    var jetLevelHint = JET_MAX_LEVELS; // (#5) start uncapped, then track accepts
    // Phase E periodic-interior state (auto mode): armed when the header
    // carries a period block; one compare per loop turn, an attempt at the
    // aligned phase with EXPONENTIAL BACKOFF on failure (perStride doubles,
    // stays a multiple of p so retries keep phase alignment). Interior pixels
    // pass on their first attempt and break; boundary/exterior pixels — the
    // ones a small p would otherwise tax with the quadratic verdict every 1-2
    // iterations for the whole budget — pay O(log maxIter) attempts total.
    var perP = 0;
    var perStart = 0;
    var perNext = 2147483647;
    var perStride = 0;
    var perR = -3.0e38;
    var perHdr = 0;
    // §18 parabolic-gate state (unified tables ship the gate directory at
    // header entry [10]; v1 arms gate 0 — the count is kept in the record
    // for multi-gate views later). dc-band check is per-pixel constant.
    var gBase = -1;
    var gStart = 0;
    var gEnd = 0;
    var gM = 0;
    var gREntry = 0.0;
    var gNfar = 0;
    var gDBase = 0;
    var gDb = vec2<f32>(0.0);
    var gFails = 0;
    if (isUnified) {
      let lastLvl = mandelbrotJetLevels[i32(mandelbrot.blaLevelCount) - 1];
      perHdr = i32(lastLvl.offset + lastLvl.count);
      perStart = i32(mandelbrotJetRadii[perHdr + 4].v.w);
      perP = i32(mandelbrotJetRadii[perHdr + 5].v.w);
      perR = mandelbrotJetRadii[perHdr + 6].v.w;
      if (perP > 0) {
        perNext = perStart;
        perStride = perP;
      }
      let gCount = i32(mandelbrotJetRadii[perHdr + 10].v.x + 0.5);
      if (gCount > 0) {
        let gb = perHdr + 11;
        let ge0 = mandelbrotJetRadii[gb].v;
        let ge1 = mandelbrotJetRadii[gb + 1].v;
        if (dcMag <= ge1.y) {
          gBase = gb;
          gStart = i32(ge0.x + 0.5);
          gEnd = gStart + i32(ge0.y + 0.5);
          gM = i32(ge0.z + 0.5) * i32(ge0.w + 0.5);
          gREntry = ge1.x;
          gNfar = i32(ge1.z + 0.5);
          gDBase = gb + i32(ge1.w + 0.5);
          let gdc2 = cmul(dc, dc);
          gDb = cmul(gate_unpack(mandelbrotJetRadii[gb + 3].v), dc)
              + cmul(gate_unpack(mandelbrotJetRadii[gb + 4].v), gdc2);
        }
      }
    }
    while (g_workBudget < u32(max_iteration) && ref_i < globalMaxIterI) {
      g_workSteps += 1u;
      g_workBudget += 1u;
      if (perP > 0 && ref_i >= perNext) {
        let k = (ref_i - perStart + perP - 1) / perP;
        let aligned = perStart + k * perP;
        if (ref_i == aligned) {
          if (try_periodic_interior(perHdr, fe_from_vec(dz, 0), dcFe, perR)) {
            inside = true;
            break;
          }
          // Failed verdict: back off — retry stride doubles, capped well
          // below i32 overflow, always a multiple of p (phase-aligned).
          perNext = aligned + perStride;
          perStride = min(perStride * 2, 1 << 24);
        } else {
          perNext = aligned;
        }
      }
      var skipped = 0;
      var gated = false;
      // §18 gate move: aligned in-span offsets only (integer modulo, in-span
      // turns are exactly the ones the ordinary loop crawls through). A
      // positive return already advanced ref_i/dz/derM by k·m iterations.
      if (gBase >= 0 && gFails < 3 && ref_i >= gStart && ref_i < gEnd
          && ((ref_i - gStart) % gM) == 0) {
        let adv = try_gate_jump(gBase, gStart, gEnd - gStart, gM, gREntry,
                                gNfar, gDBase, gDb, &ref_i, &dz, dc,
                                i32(mandelbrot.globalMaxIter - i), &derM);
        if (adv > 0) {
          skipped = adv;
          gated = true;
          blaZ = getOrbit(ref_i) + dz;
          g_gateJumps += 1u;
          g_workBudget += 8u;
        } else if (adv < 0) {
          gFails += 1;
          g_gateFails += 1u;
        }
      }
      if (gated) {
        // gate jump done — skip the block probe this turn
      } else if (isBlockTable) {
        // Global gate first (one log2 vs the table-wide bound), then convert dz
        // to floatexp for the shared evaluator (coefficient exponents exceed
        // f32 even shallow). Use length(), not dot(): |dz|² UNDERFLOWS f32 for
        // |dz| < ~1e-19 (routine at mid-deep shallow zooms) and a clamped
        // log2 would over-estimate |dz| and reject everything. When even
        // length() underflows, pass the gate — the fe-domain test inside
        // try_apply_jet/try_apply_mobius is exact.
        let dzMag = length(dz);
        if (dzMag < 1.2e-38 || log2(dzMag) < jetMaxR3) {
          var dzFe = fe_from_vec(dz, 0);
          if (isUnified) {
            skipped = try_apply_unified(&ref_i, &dzFe, &derM, &derS, &derSLo, &derInvScale, &epsThreshold, logEpsilon, &blaZ, dcFe, dcFe2, dcFe3, muLimit, skip0Log, globalMaxIterI, &jetLvlR3, dc, dcF2, dcF3, unifiedF32Ok, unifiedJetF32Ok, &jetLevelHint, &sndM);
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
          // z″ ← 2(z′² + z·z″), in the 2·derS-tied scale (uses the OLD derM).
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
          // z″ scale is tied to 2·derS: mirror the renorm shift twice.
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
    while (g_workBudget < u32(max_iteration) && ref_i < globalMaxIterI) {
      g_workSteps += 1u;
      g_workBudget += 1u;
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
                  der_scale_add(derS, derSLo, f32(aOverM2.e) * LN2);
                  *derM = *derM + bOverM.m * exp(clamp(f32(bOverM.e) * LN2 - (*derS + *derSLo), -80.0, 80.0));
                  der_refresh_cache(derM, derS, derSLo, derInvScale, epsThreshold, logEpsilon);
                  // Form counter (mode 2 = Padé [1/1], deep = fe).
                  g_tierApps[1] += 1u;
                  g_workBudget += 5u;
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
                *derM = cmul(*derM, vec2<f32>(bla.ax, bla.ay)) + vec2<f32>(bla.bx, bla.by) * (*derInvScale);
                der_scale_add(derS, derSLo, f32(bla.ab_exp) * LN2);
                der_refresh_cache(derM, derS, derSLo, derInvScale, epsThreshold, logEpsilon);
                // Form counter (mode 1 = affine BLA, deep = fe).
                g_tierApps[0] += 1u;
                g_workBudget += 3u;
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
// applied blocks then caps every Horner intermediate at ~2^99 « f32 max.
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
// `lvlR3` is the caller-hoisted copy of the level directory's maxR3 gates: a
// failing level probe costs ZERO memory reads (the skip is recomputed from the
// power-of-two scaffold), and the directory is only read once a gate passes.
// `dcF/dcF2/dcF3` + `f32Ok` drive the plain-f32 fast path (#4): the caller sets
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
          var usedF32 = false;
          // (#4) Plain-f32 fast path: radii.w is the build-side "all shipped
          // coefficient exponents fit f32" flag — free, it rides the same vec4
          // load as the radii. log2_dz > -100 keeps the dz-side products clear
          // of the f32 subnormal band; everything else pays the fe evaluator.
          if (f32Ok && radii.w > 0.5 && log2_dz > -100.0) {
            usedF32 = true;
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
                    + pdc.m * exp(clamp(f32(pdc.e) * LN2 - (*derS + *derSLo), -80.0, 80.0));
            } else {
              *derM = cmul(*derM, pdz.m);
              der_scale_add(derS, derSLo, f32(pdz.e) * LN2);
              *derM = *derM + pdc.m * exp(clamp(f32(pdc.e) * LN2 - (*derS + *derSLo), -80.0, 80.0));
              der_refresh_cache(derM, derS, derSLo, derInvScale, epsThreshold, logEpsilon);
            }
            // Form counters (mode 3 = jet order k; f32 when the fast path ran).
            g_tierApps[0] += select(0u, 1u, k == 1);
            g_tierApps[1] += select(0u, 1u, k == 2);
            g_tierApps[2] += select(0u, 1u, k == 3);
            g_appsF32 += select(0u, 1u, usedF32);
            var wx = select(0u, 1u, k == 1) + select(0u, 2u, k == 2) + select(0u, 4u, k == 3);
            wx += select(0u, wx + 1u, !usedF32);
            g_workBudget += wx;
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

// ── Möbius-c+ block application (add-mobius-cplus) ──────────────────
// m(z, c) = ((A + A'·c)·z + B·c) / (1 + (D + D'·c)·z + F·c): the Padé vehicle
// plus three c-coefficients that annihilate the zc/z²c cross-terms guard (G)
// exists for and the pure-c² term (F resums the pure-c channel — the shallow
// cmax_c2 bind), plus the N₂ numerator slot (round 7, [2/1]: D = −c₃₀/c₂₀
// resums the z-channel pole — the §14 superconvergence). ONE validity
// comparison log2|dz| < r per probed block — no H2, no min_a, no beta·dcMag,
// no separate pole test (DEN > 0.5 is folded into the certified radius).
// Records live in the jet coefficient buffer at stride 7 (order A, B, A', D,
// D', F, N₂), radii in the same vec4 sidecar (x = r, y = the f32-safe
// fast-path flag).

fn fe_neg(a: fe) -> fe {
  return fe(-a.m, a.e);
}

// Optional paranoia guard on the denominator (note §5): reject the block when
// |1 + De·dz| ≤ 1e-3 and let the descent fall through to lower levels / the
// exact step. The certified radius already implies DEN > 0.5, so this should
// never fire — kept ON for the first field round (design D5 open question).
const MOBIUS_PARANOIA_GUARD: bool = true;
const MOBIUS_DEN_GUARD2: f32 = 1e-6;

// Möbius skip attempt: same descent shape as try_apply_jet (hoisted per-level
// gates, sidecar probe, level hint, greedy on skip), single radius, inline
// [1/1] application. `dcF`/`f32Ok` drive the plain-f32 fast path (only
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
          var usedF32 = false;
          if (f32Ok && radii.y > 0.5 && log2_dz > -100.0) {
            usedF32 = true;
            // Plain-f32 fast path: 7 ldexp reconstructions + the [2/1] form.
            let ca  = jet_coeff_f32(mandelbrotJetSuite[base]);
            let cb  = jet_coeff_f32(mandelbrotJetSuite[base + 1]);
            let cap = jet_coeff_f32(mandelbrotJetSuite[base + 2]);
            let cd  = jet_coeff_f32(mandelbrotJetSuite[base + 3]);
            let cdp = jet_coeff_f32(mandelbrotJetSuite[base + 4]);
            let cf  = jet_coeff_f32(mandelbrotJetSuite[base + 5]);
            let cn2 = jet_coeff_f32(mandelbrotJetSuite[base + 6]);
            let dzF = fe_to_vec(*dz);
            let ae = ca + cmul(cap, dcF);       // Ae = A + A'·dc
            let de = cd + cmul(cdp, dcF);       // De = D + D'·dc
            let n2z = cmul(cn2, dzF);           // N₂·dz
            let den = vec2<f32>(1.0, 0.0) + cmul(de, dzF) + cmul(cf, dcF);
            if (MOBIUS_PARANOIA_GUARD && dot(den, den) < MOBIUS_DEN_GUARD2) {
              denOk = false;
            } else {
              let invDen = cinv(den);
              let phiF = cmul(cmul(n2z + ae, dzF) + cmul(cb, dcF), invDen);
              phi = fe_from_vec(phiF, 0);
              // ∂m/∂z = (2N₂·z + Ae − m·De)/den ;
              // ∂m/∂c = (A'·z + B − m·(D'·z + F))/den
              pdz = fe_from_vec(cmul(2.0 * n2z + ae - cmul(phiF, de), invDen), 0);
              pdc = fe_from_vec(cmul(cmul(cap, dzF) + cb - cmul(phiF, cmul(cdp, dzF) + cf), invDen), 0);
            }
          } else {
            let ca  = jet_coeff_fe(mandelbrotJetSuite[base]);
            let cb  = jet_coeff_fe(mandelbrotJetSuite[base + 1]);
            let cap = jet_coeff_fe(mandelbrotJetSuite[base + 2]);
            let cd  = jet_coeff_fe(mandelbrotJetSuite[base + 3]);
            let cdp = jet_coeff_fe(mandelbrotJetSuite[base + 4]);
            let cf  = jet_coeff_fe(mandelbrotJetSuite[base + 5]);
            let cn2 = jet_coeff_fe(mandelbrotJetSuite[base + 6]);
            let ae = fe_add(ca, fe_cmul(cap, dc));
            let de = fe_add(cd, fe_cmul(cdp, dc));
            let n2z = fe_cmul(cn2, *dz);
            let den = fe_add3(fe(vec2<f32>(1.0, 0.0), 0), fe_cmul(de, *dz), fe_cmul(cf, dc));
            if (MOBIUS_PARANOIA_GUARD && (den.e < -10 || (den.e < 5 && fe_mag2_f32(den) < MOBIUS_DEN_GUARD2))) {
              denOk = false;
            } else {
              let invDen = fe_cinv(den);
              phi = fe_cmul(fe_add(fe_cmul(fe_add(n2z, ae), *dz), fe_cmul(cb, dc)), invDen);
              pdz = fe_cmul(fe_add3(fe_scale(n2z, 2.0), ae, fe_neg(fe_cmul(phi, de))), invDen);
              pdc = fe_cmul(fe_add3(fe_cmul(cap, *dz), cb, fe_neg(fe_cmul(phi, fe_add(fe_cmul(cdp, *dz), cf)))), invDen);
            }
          }
          if (denOk) {
            let candidateZ = getOrbit(*ref_i + skip) + fe_to_vec(phi);
            // Do not jump over the first escape (same rule as the BLA paths).
            if (!(skip > 1 && dot(candidateZ, candidateZ) > bailout)) {
              *dz = phi;
              *zOut = candidateZ;
              // der' = ∂m/∂z·der + ∂m/∂c, with the (#3) exponent-fold
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
              // Form counter (mode 4 = Möbius-c⁺ [2/1]; f32 when the fast
              // path ran).
              g_tierApps[2] += 1u;
              g_appsF32 += select(0u, 1u, usedF32);
              g_workBudget += select(7u, 3u, usedF32);
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
// One sidecar probe (x = PRINCIPAL tier's certified radius, y = its tag,
// z = f32_safe + 2·secours_tag packed, w = SECOURS tier's radius, −∞ ⇒ no
// fallback), then a TIER-DIRECTED prefix read of the 9-slot [2/1] record
// [A, B, D, N₂, A', D', F, a12, a03]: affine reads 2 slots, Padé 4 (the plain
// [2/1]), c+ 7, jet all 9 (reconstructing a20 = N₂ − D·A,
// a11 = A' − B·D − F·A, a21 = −D'·A − D·a11 − F·a20, a02 = −F·B and
// a30 = −D·a20 in registers — the verified identities). Portfolio rule
// (plan §8): when |dz| exceeds the cheap principal's radius but fits the
// secours' (the largest-radius tier), apply the secours AT THE SAME LEVEL
// instead of descending — same record, one extra compare. The candidate PAIR
// is a block property (warp-uniform); which of the two fires depends on the
// per-thread |dz|, exactly like the pre-existing radius test. Rational tags
// (0-2) get the plain-f32 fast path; the jet tag always evaluates in fe (deep
// is where it fires).
fn try_apply_unified(ref_i: ptr<function, i32>, dz: ptr<function, fe>, derM: ptr<function, vec2<f32>>, derS: ptr<function, f32>, derSLo: ptr<function, f32>, derInvScale: ptr<function, f32>, epsThreshold: ptr<function, f32>, logEpsilon: f32, zOut: ptr<function, vec2<f32>>, dc: fe, dc2: fe, dc3: fe, bailout: f32, skip0Log: i32, maxIterI: i32, lvlR: ptr<function, array<f32, JET_MAX_LEVELS>>, dcF: vec2<f32>, dcF2: vec2<f32>, dcF3: vec2<f32>, f32Ok: bool, f32OkJet: bool, hint: ptr<function, i32>, snd: ptr<function, vec2<f32>>) -> i32 {
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
        // Principal (x/y) first; secours (w, tag in z's high bits) when the
        // principal's band is exceeded. r2 > r1 by construction, so a single
        // max() gates the whole portfolio. ENABLE_PORTFOLIO = false folds the
        // fallback out entirely (A/B baseline).
        let useSnd = ENABLE_PORTFOLIO && log2_dz >= radii.x;
        if (log2_dz < select(radii.x, max(radii.x, radii.w), ENABLE_PORTFOLIO)) {
          let sndTag = floor(radii.z * 0.5);
          let safeFlag = radii.z - 2.0 * sndTag;
          let tag = i32(select(radii.y, sndTag, useSnd) + 0.5);
          let base = entry * UNIFIED_COEFF_STRIDE;
          var phi: fe;
          var pdz: fe;
          var pdc: fe;
          // Phase D tier second partials (zero for the affine tag): the z″
          // chain δ″′ = m_zz·δ′² + 2·m_zc·δ′ + m_cc + m_z·δ″.
          var mzz = fe(vec2<f32>(0.0), 0);
          var mzc = fe(vec2<f32>(0.0), 0);
          var mcc = fe(vec2<f32>(0.0), 0);
          var denOk = true;
          var usedF32 = false;
          if (f32Ok && safeFlag > 0.5 && log2_dz > -100.0 && (tag <= 2 || f32OkJet)) {
            usedF32 = true;
            // Plain-f32 fast path — every tier: the build-side safe flag
            // covers the rational slots AND the jet identity reconstructions.
            let ca = jet_coeff_f32(mandelbrotJetSuite[base]);
            let cb = jet_coeff_f32(mandelbrotJetSuite[base + 1]);
            let dzF = fe_to_vec(*dz);
            if (tag == 0) {
              // Affine tier: 24 B, one cmul pair; exact-form partials.
              phi = fe_from_vec(cmul(ca, dzF) + cmul(cb, dcF), 0);
              pdz = fe_from_vec(ca, 0);
              pdc = fe_from_vec(cb, 0);
            } else if (tag <= 2) {
              var ae = ca;
              var de = jet_coeff_f32(mandelbrotJetSuite[base + 2]);
              let cn2F = jet_coeff_f32(mandelbrotJetSuite[base + 3]);
              var capF = vec2<f32>(0.0);
              var cdpF = vec2<f32>(0.0);
              var cfF = vec2<f32>(0.0);
              if (tag == 2) {
                capF = jet_coeff_f32(mandelbrotJetSuite[base + 4]);
                cdpF = jet_coeff_f32(mandelbrotJetSuite[base + 5]);
                cfF = jet_coeff_f32(mandelbrotJetSuite[base + 6]);
                ae = ca + cmul(capF, dcF);
                de = de + cmul(cdpF, dcF);
              }
              // [2/1] F-form: num = (N₂·dz + Ae)·dz + B·dc;
              // den = 1 + De·dz + F·dc; ∂den/∂c = D′·dz + F.
              let den = vec2<f32>(1.0, 0.0) + cmul(de, dzF) + cmul(cfF, dcF);
              if (MOBIUS_PARANOIA_GUARD && dot(den, den) < MOBIUS_DEN_GUARD2) {
                denOk = false;
              } else {
                let invDen = cinv(den);
                let dcdenF = cmul(cdpF, dzF) + cfF;
                let n2zF = cmul(cn2F, dzF);
                let phiF = cmul(cmul(n2zF + ae, dzF) + cmul(cb, dcF), invDen);
                phi = fe_from_vec(phiF, 0);
                let mzF = cmul(n2zF + n2zF + ae - cmul(phiF, de), invDen);
                let mcF = cmul(cmul(capF, dzF) + cb - cmul(phiF, dcdenF), invDen);
                pdz = fe_from_vec(mzF, 0);
                pdc = fe_from_vec(mcF, 0);
                // m_zz = 2·(N₂ − De·m_z)/den ; m_cc = −2·(D′·z + F)·m_c/den ;
                // m_zc = (A′ − m_c·De − φ·D′)/den − m_z·(D′·z + F)/den.
                mzz = fe_from_vec(2.0 * cmul(cn2F - cmul(de, mzF), invDen), 0);
                mcc = fe_from_vec(-2.0 * cmul(dcdenF, cmul(mcF, invDen)), 0);
                mzc = fe_from_vec(
                  cmul(capF - cmul(mcF, de) - cmul(phiF, cdpF), invDen)
                    - cmul(mzF, cmul(dcdenF, invDen)),
                  0,
                );
              }
            } else {
              // Jet tier, plain-f32: the same identity reconstruction and
              // order-3 Horner rows as the fe branch below (a20 = N₂ − D·A,
              // a11 = A′ − B·D − F·A, a21 = −D′·A − D·a11 − F·a20,
              // a02 = −F·B, a30 = −D·a20); the safe flag certifies every
              // reconstruction and dc-power product fits f32 with headroom.
              let cdF  = jet_coeff_f32(mandelbrotJetSuite[base + 2]);
              let cn2F = jet_coeff_f32(mandelbrotJetSuite[base + 3]);
              let capF = jet_coeff_f32(mandelbrotJetSuite[base + 4]);
              let cdpF = jet_coeff_f32(mandelbrotJetSuite[base + 5]);
              let cfF  = jet_coeff_f32(mandelbrotJetSuite[base + 6]);
              let a12F = jet_coeff_f32(mandelbrotJetSuite[base + 7]);
              let a03F = jet_coeff_f32(mandelbrotJetSuite[base + 8]);
              let a02F = -cmul(cfF, cb);
              let a20F = cn2F - cmul(cdF, ca);
              let a11F = capF - cmul(cb, cdF) - cmul(cfF, ca);
              let a21F = -cmul(cdpF, ca) - cmul(cdF, a11F) - cmul(cfF, a20F);
              let a30F = -cmul(cdF, a20F);
              let p0 = cmul(cb, dcF) + cmul(a02F, dcF2) + cmul(a03F, dcF3);
              let p1 = ca + cmul(a11F, dcF) + cmul(a12F, dcF2);
              let p2 = a20F + cmul(a21F, dcF);
              let phiF = p0 + cmul(dzF, p1 + cmul(dzF, p2 + cmul(dzF, a30F)));
              phi = fe_from_vec(phiF, 0);
              pdz = fe_from_vec(p1 + cmul(dzF, 2.0 * p2 + cmul(dzF, 3.0 * a30F)), 0);
              let q0 = cb + 2.0 * cmul(a02F, dcF) + 3.0 * cmul(a03F, dcF2);
              let q1 = a11F + 2.0 * cmul(a12F, dcF);
              pdc = fe_from_vec(q0 + cmul(dzF, q1 + cmul(dzF, a21F)), 0);
              mzz = fe_from_vec(2.0 * p2 + 6.0 * cmul(a30F, dzF), 0);
              mzc = fe_from_vec(q1 + 2.0 * cmul(a21F, dzF), 0);
              mcc = fe_from_vec(2.0 * a02F + 6.0 * cmul(a03F, dcF) + 2.0 * cmul(a12F, dzF), 0);
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
              let cn2 = jet_coeff_fe(mandelbrotJetSuite[base + 3]);
              var ae = ca;
              var de = cd;
              var cap = fe(vec2<f32>(0.0), 0);
              var cdp = fe(vec2<f32>(0.0), 0);
              var cf = fe(vec2<f32>(0.0), 0);
              if (tag == 2) {
                cap = jet_coeff_fe(mandelbrotJetSuite[base + 4]);
                cdp = jet_coeff_fe(mandelbrotJetSuite[base + 5]);
                cf = jet_coeff_fe(mandelbrotJetSuite[base + 6]);
                ae = fe_add(ca, fe_cmul(cap, dc));
                de = fe_add(cd, fe_cmul(cdp, dc));
              }
              // [2/1] F-form: num = (N₂·dz + Ae)·dz + B·dc;
              // den = 1 + De·dz + F·dc; ∂den/∂c = D′·dz + F.
              let den = fe_add3(fe(vec2<f32>(1.0, 0.0), 0), fe_cmul(de, *dz), fe_cmul(cf, dc));
              if (MOBIUS_PARANOIA_GUARD && (den.e < -10 || (den.e < 5 && fe_mag2_f32(den) < MOBIUS_DEN_GUARD2))) {
                denOk = false;
              } else {
                let invDen = fe_cinv(den);
                let dcden = fe_add(fe_cmul(cdp, *dz), cf);
                let n2z = fe_cmul(cn2, *dz);
                phi = fe_cmul(fe_add(fe_cmul(fe_add(n2z, ae), *dz), fe_cmul(cb, dc)), invDen);
                pdz = fe_cmul(fe_add3(fe_scale(n2z, 2.0), ae, fe_neg(fe_cmul(phi, de))), invDen);
                if (tag == 2) {
                  pdc = fe_cmul(fe_add3(fe_cmul(cap, *dz), cb, fe_neg(fe_cmul(phi, dcden))), invDen);
                } else {
                  pdc = fe_cmul(cb, invDen);
                }
                // m_zz = 2·(N₂ − De·m_z)/den.
                mzz = fe_scale(fe_cmul(fe_add(cn2, fe_neg(fe_cmul(de, pdz))), invDen), 2.0);
                mcc = fe_neg(fe_scale(fe_cmul(dcden, fe_cmul(pdc, invDen)), 2.0));
                mzc = fe_add(
                  fe_cmul(fe_add3(cap, fe_neg(fe_cmul(pdc, de)), fe_neg(fe_cmul(phi, cdp))), invDen),
                  fe_neg(fe_cmul(pdz, fe_cmul(dcden, invDen))),
                );
              }
            } else {
              // Jet tier: full 108 B record, [2/1] F-form identity
              // reconstruction (a20 = N₂ − D·A, a11 = A′ − B·D − F·A,
              // a21 = −D′·A − D·a11 − F·a20, a02 = −F·B, a30 = −D·a20),
              // order-3 Horner rows shared by the value and both partials.
              let cd  = jet_coeff_fe(mandelbrotJetSuite[base + 2]);
              let cn2 = jet_coeff_fe(mandelbrotJetSuite[base + 3]);
              let cap = jet_coeff_fe(mandelbrotJetSuite[base + 4]);
              let cdp = jet_coeff_fe(mandelbrotJetSuite[base + 5]);
              let cf  = jet_coeff_fe(mandelbrotJetSuite[base + 6]);
              let a12 = jet_coeff_fe(mandelbrotJetSuite[base + 7]);
              let a03 = jet_coeff_fe(mandelbrotJetSuite[base + 8]);
              let a02 = fe_neg(fe_cmul(cf, cb));
              let a20 = fe_add(cn2, fe_neg(fe_cmul(cd, ca)));
              let a11 = fe_add3(cap, fe_neg(fe_cmul(cb, cd)), fe_neg(fe_cmul(cf, ca)));
              let a21 = fe_add3(fe_neg(fe_cmul(cdp, ca)), fe_neg(fe_cmul(cd, a11)), fe_neg(fe_cmul(cf, a20)));
              let a30 = fe_neg(fe_cmul(cd, a20));
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
              // Portfolio observability: a secours hit is a descent avoided;
              // the covered iterations are the A/B payoff signal.
              g_secoursApps += select(0u, 1u, useSnd);
              g_secoursIters += select(0u, u32(skip), useSnd);
              g_appsF32 += select(0u, 1u, usedF32);
              // Batch weight: the turn's base 1 is already counted; add the
              // form surcharge (fe evaluation ≈ ×2 the f32 path).
              var wx = select(0u, 1u, tag == 0)
                     + select(0u, 2u, tag == 1)
                     + select(0u, 3u, tag == 2)
                     + select(0u, 4u, tag == 3);
              wx += select(0u, wx + 1u, !usedF32);
              g_workBudget += wx;
              // Phase D: z″ tier update, computed term by term at the NEW
              // 2·derS scale with BOTH the fe exponents AND the running
              // mantissa magnitudes folded into one exp() argument (mantissas
              // stay O(1) outside). The previous old-scale form broke on the
              // DEEP path: certified deep blocks carry coefficient exponents
              // up to ~±133 (a20 ~ ±266) since |dz| ~ 2^-133, so the
              // ldexp(clamp(e, ±126)) truncated and the post-hoc rescale
              // exp(clamp(−2ΔS, −80, 80)) saturated (ΔS ≈ +92 per big block ⇒
              // snd inflated by e^{+104} ⇒ inf ⇒ NaN), and Metal's
              // max(NaN, x) = x then laundered the NaN into an auto-PASSING
              // reseed margin — every deep pixel tagged analytic with a
              // garbage payload (fast + integer-ν + shifted palette). Here a
              // saturated fold leaves snd huge ⇒ margin FAILS ⇒ honest
              // re-iteration (the safe degrade direction).
              let sOld = *derS + *derSLo;
              let derOld = *derM;
              let dLen = max(length(derOld), 1e-38);
              let dHat = derOld / dLen;
              let logDer = log(dLen) + sOld;      // ln|z′| (true scale)
              let sndLen = max(length(*snd), 1e-38);
              let sndHat = *snd / sndLen;
              let logSnd = log(sndLen) + 2.0 * sOld; // ln|z″| (true scale)
              *dz = phi;
              *zOut = candidateZ;
              // der' = ∂m/∂z·der + ∂m/∂c, with the (#3) exponent-fold
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
              // z″_new = m_z·z″ + m_zz·z′² + 2·m_zc·z′ + m_cc, emitted at the
              // NEW scale: each term = O(1) mantissas × exp(ln(term) − 2·sNew).
              let sNew = *derS + *derSLo;
              let t1 = cmul(pdz.m, sndHat)
                * exp(clamp(f32(pdz.e) * LN2 + logSnd - 2.0 * sNew, -78.0, 78.0));
              let t2 = cmul(mzz.m, cmul(dHat, dHat))
                * exp(clamp(f32(mzz.e) * LN2 + 2.0 * logDer - 2.0 * sNew, -78.0, 78.0));
              let t3 = 2.0 * cmul(mzc.m, dHat)
                * exp(clamp(f32(mzc.e) * LN2 + logDer - 2.0 * sNew, -78.0, 78.0));
              let t4 = mcc.m
                * exp(clamp(f32(mcc.e) * LN2 - 2.0 * sNew, -78.0, 78.0));
              *snd = t1 + t2 + t3 + t4;
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
// ── interior/periodic verdict (Phase E, design D8, findings §17) ─────────────
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
// Φ_p (sidecar header entries hdrBase+4..9, c+ F-form: den = 1 + De·δ + F·c)
// is a FIXED Möbius map of the delta for this pixel's dc: fixed points ζ± from
// De·δ² + (1 + Fc − Ae)·δ − Bc = 0, multiplier
// κ = (Ae·(1+Fc) − Bc·De)/((1+Fc)+De·ζ)². TRUE ⇒ provably interior: |κ| <
// 0.98 (κ is the pixel's own cycle multiplier, certified to ~1e-4 by the
// block radius), |w₀| = |(δ−ζa)/(δ−ζr)| < 0.5 (well inside the basin), and
// the whole contraction path stays inside the certified radius
// (max(|ζa|, |δ−ζa|)·2 ≤ r ⇒ |δ_j| ≤ |ζa| + |δ−ζa| ≤ r for all j).
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
  let hF = mandelbrotJetRadii[hdrBase + 9].v;
  let cA = fe(vec2<f32>(hA.x, hA.y), i32(hA.z));
  let cB = fe(vec2<f32>(hB.x, hB.y), i32(hB.z));
  let cD = fe(vec2<f32>(hD.x, hD.y), i32(hD.z));
  let cAp = fe(vec2<f32>(hAp.x, hAp.y), i32(hAp.z));
  let cDp = fe(vec2<f32>(hDp.x, hDp.y), i32(hDp.z));
  let cF = fe(vec2<f32>(hF.x, hF.y), i32(hF.z));
  let ae = fe_add(cA, fe_cmul(cAp, dc));
  let de = fe_add(cD, fe_cmul(cDp, dc));
  let bc = fe_cmul(cB, dc);
  if (length(de.m) < 1e-20) {
    return false; // degenerate quadratic — no certified verdict
  }
  let one = fe(vec2<f32>(1.0, 0.0), 0);
  let onePlusFc = fe_add(one, fe_cmul(cF, dc));
  let uMinusAe = fe_add(onePlusFc, fe_neg(ae)); // 1 + Fc − Ae
  let disc = fe_add(fe_cmul(uMinusAe, uMinusAe), fe_scale(fe_cmul(de, bc), 4.0));
  let sq = fe_csqrt(disc);
  let inv2De = fe_cinv(fe_scale(de, 2.0));
  let negU = fe_neg(uMinusAe); // Ae − 1 − Fc
  let z1 = fe_cmul(fe_add(negU, sq), inv2De);
  let z2 = fe_cmul(fe_add(negU, fe_neg(sq)), inv2De);
  let num = fe_add(fe_cmul(ae, onePlusFc), fe_neg(fe_cmul(bc, de)));
  let d1 = fe_add(onePlusFc, fe_cmul(de, z1));
  let k1 = fe_cmul(num, fe_cinv(fe_cmul(d1, d1)));
  let d2 = fe_add(onePlusFc, fe_cmul(de, z2));
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

// ── §18 parabolic Fatou gates (gates.rs runtime, shallow f32 path) ────────────
// Sidecar layout after the 10-entry SA/periodic header: entry [hdr+10] is the
// gate directory (x = count, 0 when none — always shipped by unified tables),
// gate 0's record at [hdr+11]:
//   E0 (start, len, p, q) · E1 (r_entry, r_dc, nfar, dRel) · E2 eps bands ·
//   per phase: β-tail 2 complexes, 8×3 P-coefficient Taylor complexes, nfar
//   far-root seeds (each complex (x·2^e, y·2^e) packed (x, y, e, ·)) ·
//   d[] channel as plain f32 pairs (two per vec4).
// Attempts fire at phase-0-aligned span offsets only (one Ψ resolve per
// attempt, amortized 1/m). All f32: the record's Taylor-in-dc slope carries
// κ̃ at full mantissa accuracy, u/d are gate-scale quantities, and Ψ-phase
// errors convert to value errors through the tiny |P| at the landing point.
// The in-flight banded budget refuses uncertifiable jumps; ANY numeric
// failure returns -1 and the pixel falls back to the ordinary certified loop.

fn gate_clog(z: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(0.5 * log(max(dot(z, z), 1e-38)), atan2(z.y, z.x));
}

fn gate_csqrt(z: vec2<f32>) -> vec2<f32> {
  let r = length(z);
  let re = sqrt(max(0.5 * (r + z.x), 0.0));
  var im = sqrt(max(0.5 * (r - z.x), 0.0));
  if (z.y < 0.0) { im = -im; }
  return vec2<f32>(re, im);
}

fn gate_unpack(e: vec4<f32>) -> vec2<f32> {
  return vec2<f32>(e.x, e.y) * exp2(e.z);
}

// Returns k·m (> 0, iterations advanced; ref_i/dz/derM updated), 0 when the
// gate move does not apply here, -1 on a degraded attempt (caller counts
// toward disabling the gate for this pixel).
// Everything per-gate-constant (record header, β-tail Taylor at the pixel's
// dc) is hoisted by the caller once per pixel — a not-applicable attempt
// costs ONE d[] read and a handful of flops.
fn try_gate_jump(
  g0: i32,
  gStart: i32,
  gLen: i32,
  gM: i32,
  rEntry: f32,
  nfar: i32,
  dBase: i32,
  db: vec2<f32>,
  refIdx: ptr<function, i32>,
  dz: ptr<function, vec2<f32>>,
  dc: vec2<f32>,
  iterLeft: i32,
  derM: ptr<function, vec2<f32>>,
) -> i32 {
  let off = *refIdx - gStart;
  if (off + gM > gLen - 1) {
    return 0;
  }
  // u from the d[] small-quantity channel (off is even — m is even and the
  // attempt is aligned — so the pair is always .xy).
  let dPair = mandelbrotJetRadii[dBase + off / 2].v;
  let dn = vec2<f32>(dPair.x, dPair.y);
  let dc2 = cmul(dc, dc);
  var u = dn + *dz - db;
  if (dot(u, u) > rEntry * rEntry) {
    return 0;
  }
  let kMax = min(iterLeft / gM, (gLen - 1 - off) / gM);
  // Profitability floor: a jump costs ~10-100 Ψ-hops (each a Newton over up
  // to 8 log terms) ≈ the wall-clock of ~1-2k exact iterations. Below that
  // budget the ordinary certified loop is already faster — the gate's value
  // is high-iteration parabolic views (raised iteration multiplier), where
  // one jump covers tens of thousands of iterations.
  if (kMax < 2048) {
    return 0;
  }
  let e2 = mandelbrotJetRadii[g0 + 2].v;
  // ── resolve Ψ (phase 0): P(dc) Taylor eval, trim, cluster quadratic +
  // far seeds Newton-polished on the full reduced polynomial, ρᵢ = 1/P′(rᵢ).
  var pc: array<vec2<f32>, 8>;
  var pscale = 0.0;
  for (var k = 0; k < 8; k++) {
    let b = g0 + 5 + 3 * k;
    let v = gate_unpack(mandelbrotJetRadii[b].v)
          + cmul(gate_unpack(mandelbrotJetRadii[b + 1].v), dc)
          + cmul(gate_unpack(mandelbrotJetRadii[b + 2].v), dc2);
    pc[k] = v;
    pscale = max(pscale, max(abs(v.x), abs(v.y)));
  }
  if (pscale <= 0.0) {
    return -1;
  }
  var nq = 8;
  while (nq > 1 && max(abs(pc[nq - 1].x), abs(pc[nq - 1].y)) < 1e-12 * pscale) {
    nq -= 1;
  }
  if (nq < 3 || nq - 3 > nfar) {
    return -1;
  }
  var roots: array<vec2<f32>, 8>;
  roots[0] = vec2<f32>(0.0);
  let disc = gate_csqrt(cmul(pc[1], pc[1]) - 4.0 * cmul(pc[2], pc[0]));
  let inv2p2 = cinv(2.0 * pc[2]);
  roots[1] = cmul(-pc[1] + disc, inv2p2);
  roots[2] = cmul(-pc[1] - disc, inv2p2);
  let nroots = nq;
  for (var j = 3; j < nroots; j++) {
    roots[j] = gate_unpack(mandelbrotJetRadii[g0 + 29 + (j - 3)].v);
  }
  // Full Newton polish for the coalescing pair; ONE pass for the far seeds
  // (they only feed the linearized correction and the ρ/droot scales).
  for (var rI = 1; rI < nroots; rI++) {
    var r = roots[rI];
    let polishCap = select(1, 12, rI < 3);
    for (var it = 0; it < polishCap; it++) {
      var f = vec2<f32>(0.0);
      var df = vec2<f32>(0.0);
      for (var k = nq - 1; k >= 0; k--) {
        df = cmul(df, r) + f;
        f = cmul(f, r) + pc[k];
      }
      if (dot(df, df) < 1e-30) {
        break;
      }
      let step = cmul(f, cinv(df));
      r -= step;
      if (dot(step, step) < 1e-11 * (1e-10 + dot(r, r))) {
        break;
      }
    }
    roots[rI] = r;
  }
  // Distinct poles or bust (dc → 0 collapses the cluster onto 0: fallback).
  var rmax = 0.0;
  for (var a = 0; a < nroots; a++) {
    rmax = max(rmax, length(roots[a]));
  }
  for (var a = 0; a < nroots; a++) {
    for (var b = a + 1; b < nroots; b++) {
      if (length(roots[a] - roots[b]) < 3e-7 * (1.0 + rmax)) {
        return -1;
      }
    }
  }
  var rhos: array<vec2<f32>, 8>;
  for (var rI = 0; rI < nroots; rI++) {
    var dp = vec2<f32>(0.0);
    for (var k = nq - 1; k >= 0; k--) {
      dp = cmul(dp, roots[rI]) + f32(k + 1) * pc[k];
    }
    if (dot(dp, dp) < 1e-30) {
      return -1;
    }
    rhos[rI] = cinv(dp);
  }
  // P(u) at entry (for the derivative's flow-conjugacy factor).
  var q0 = vec2<f32>(0.0);
  for (var k = nq - 1; k >= 0; k--) {
    q0 = cmul(q0, u) + pc[k];
  }
  let pu0 = cmul(u, q0);
  // ── Ψ-plane hops: Euler predictor + Newton corrector on the per-hop
  // principal-branch increment; |Δu| ≤ 0.2·distance-to-nearest-pole keeps
  // every log unambiguous. Banded budget accumulates in flight.
  var kDone = 0.0;
  var budget = 0.0;
  var hops = 0;
  loop {
    if (kDone >= f32(kMax) || dot(u, u) > rEntry * rEntry) {
      break;
    }
    hops += 1;
    if (hops > 160) {
      return -1;
    }
    var qv = vec2<f32>(0.0);
    for (var k = nq - 1; k >= 0; k--) {
      qv = cmul(qv, u) + pc[k];
    }
    let sp = cmul(u, qv);
    let spd = length(sp);
    var droot = length(u);
    for (var a = 1; a < nroots; a++) {
      droot = min(droot, length(u - roots[a]));
    }
    if (spd < 1e-30 || droot < 1e-30) {
      kDone = f32(kMax); // pinned at a fixed point: never exits
      break;
    }
    let dk = min(0.35 * droot / spd, f32(kMax) - kDone);
    // Far-field linearization: the far roots' log increment over
    // |Δu| ≤ 0.35·droot ≪ |u − r_far| is (Δu)/(u−r) to second order — one
    // cdiv per far root per HOP instead of one clog per Newton iteration
    // (the SIMT cost sits in the transcendentals).
    var cfar = vec2<f32>(0.0);
    for (var a = 3; a < nroots; a++) {
      cfar += cmul(rhos[a], cinv(u - roots[a]));
    }
    let ncl = min(nroots, 3);
    var un = u + sp * dk;
    var ok = false;
    var lastG = 3.0e38;
    for (var it = 0; it < 8; it++) {
      var gsum = vec2<f32>(-dk, 0.0) + cmul(cfar, un - u);
      for (var a = 0; a < ncl; a++) {
        gsum += cmul(rhos[a], gate_clog(cmul(un - roots[a], cinv(u - roots[a]))));
      }
      lastG = dot(gsum, gsum);
      // Early accept on a small phase residual — it converts to value error
      // through the tiny |P| and the landing budget check.
      if (lastG < 1e-10) {
        ok = true;
        break;
      }
      var qn = vec2<f32>(0.0);
      for (var k = nq - 1; k >= 0; k--) {
        qn = cmul(qn, un) + pc[k];
      }
      let step = cmul(gsum, cmul(un, qn));
      un -= step;
      // f32 exit: |step| ≲ 3e-6·|un| (the f64 CPU tolerance would spin at
      // ±1 ulp forever here).
      if (dot(step, step) < 1e-11 * (1e-10 + dot(un, un))) {
        ok = true;
        break;
      }
    }
    if (!ok && lastG > 1e-6) {
      return -1;
    }
    u = un;
    kDone += dk;
    let ua = length(u);
    var eb = e2.w;
    if (ua > rEntry * 0.5) {
      eb = e2.x;
    } else if (ua > rEntry * 0.25) {
      eb = e2.y;
    } else if (ua > rEntry * 0.125) {
      eb = e2.z;
    }
    budget += dk * eb;
    if (budget > 1e6) {
      return -1;
    }
  }
  let kInt = min(i32(floor(kDone)), kMax);
  if (kInt < 2) {
    return -1;
  }
  // Land on the integer k (the pixel applies the return exactly kInt times).
  let back = f32(kInt) - kDone;
  if (back != 0.0) {
    var qv = vec2<f32>(0.0);
    for (var k = nq - 1; k >= 0; k--) {
      qv = cmul(qv, u) + pc[k];
    }
    var cfarB = vec2<f32>(0.0);
    for (var a = 3; a < nroots; a++) {
      cfarB += cmul(rhos[a], cinv(u - roots[a]));
    }
    let nclB = min(nroots, 3);
    var un = u + cmul(u, qv) * back;
    var ok = false;
    var lastG = 3.0e38;
    for (var it = 0; it < 8; it++) {
      var gsum = vec2<f32>(-back, 0.0) + cmul(cfarB, un - u);
      for (var a = 0; a < nclB; a++) {
        gsum += cmul(rhos[a], gate_clog(cmul(un - roots[a], cinv(u - roots[a]))));
      }
      lastG = dot(gsum, gsum);
      if (lastG < 1e-10) {
        ok = true;
        break;
      }
      var qn = vec2<f32>(0.0);
      for (var k = nq - 1; k >= 0; k--) {
        qn = cmul(qn, un) + pc[k];
      }
      let step = cmul(gsum, cmul(un, qn));
      un -= step;
      if (dot(step, step) < 1e-11 * (1e-10 + dot(un, un))) {
        ok = true;
        break;
      }
    }
    if (!ok && lastG > 1e-6) {
      return -1;
    }
    u = un;
  }
  // Certified budget: accumulated phase error × the value conversion at the
  // landing point stays inside ε/2 (the block table owns the other half).
  var qEnd = vec2<f32>(0.0);
  for (var k = nq - 1; k >= 0; k--) {
    qEnd = cmul(qEnd, u) + pc[k];
  }
  if (budget * length(qEnd) > mandelbrot.blaEpsilon * 0.5) {
    return -1;
  }
  // Commit: dz at the landing index through the d[] channel; derivative gets
  // the flow-conjugacy factor P(u_end)/P(u_entry) (the transit's ∂/∂z — its
  // ∂/∂c term is dropped, shading-only approximation; the interior-ε test is
  // already disabled once any block/gate applies).
  let off2 = off + kInt * gM;
  let dPair2 = mandelbrotJetRadii[dBase + off2 / 2].v;
  *dz = u + db - vec2<f32>(dPair2.x, dPair2.y);
  *refIdx = *refIdx + kInt * gM;
  if (dot(pu0, pu0) > 1e-30) {
    *derM = cmul(*derM, cmul(cmul(u, qEnd), cinv(pu0)));
  }
  return kInt * gM;
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

  // Derivative state der = derM · exp(derS), carried RAW across pass
  // boundaries (layers 4/5/8) — see mandelbrot_compute. Fresh pixels pass
  // (0, 0, 0).
  var derM = vec2<f32>(prev_derx, prev_dery);
  var derS: f32 = prev_ders;
  // Compensation term of the derS two-sum pair — register-only, reset each
  // pass (the stored derS is the collapsed hi + lo).
  var derSLo: f32 = 0.0;
  // Phase D: z″ mantissa (scale TIED to 2·derS). Tracked in unified mode; a
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

  // Affine BLA and Padé share try_apply_bla_deep (mode ≥ 1.5 branches to
  // Padé); jet (3) and Möbius-c+ (4) use the shared jet buffers and their own
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
  // Phase E periodic-interior state (see the shallow loop — same exponential
  // backoff on failed verdicts).
  var perP = 0;
  var perStart = 0;
  var perNext = 2147483647;
  var perStride = 0;
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
      perStride = perP;
    }
  }

  while (g_workBudget < u32(max_iteration) && ref_i < globalMaxIterI) {
    g_workSteps += 1u;
    g_workBudget += 1u;
    if (perP > 0 && ref_i >= perNext) {
      let k = (ref_i - perStart + perP - 1) / perP;
      let aligned = perStart + k * perP;
      if (ref_i == aligned) {
        if (try_periodic_interior(perHdr, dz, dc, perR)) {
          inside = true;
          break;
        }
        perNext = aligned + perStride;
        perStride = min(perStride * 2, 1 << 24);
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
            skipped = try_apply_unified(&ref_i, &dz, &derM, &derS, &derSLo, &derInvScale, &epsThreshold, logEpsilon, &blaZ, dc, dcDeep2, dcDeep3, muLimit, skip0Log, globalMaxIterI, &jetLvlR3Deep, vec2<f32>(0.0), vec2<f32>(0.0), vec2<f32>(0.0), false, false, &jetLevelHintDeep, &sndM);
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
      // dz' = 2·z_n·dz + dz² + dc   (z_n = refZ is O(1) f32)
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
  // (|m|² < 2 < mu keeps the continuation test valid) + exponent in
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
// each 16×16 workgroup reduces locally and issues at most two global
// atomicAdds.  Barriers stay in uniform control flow — the per-texel work
// is wrapped in ifs, never early-returned.
var<workgroup> wgCount: atomic<u32>;
var<workgroup> wgActive: atomic<u32>;
// Work-instrumentation partials (reduced once per workgroup, like the counters).
var<workgroup> wgRealSum: atomic<u32>;  // Σ real loop steps over this workgroup's texels
var<workgroup> wgRealMax: atomic<u32>;  // max real loop steps among them (straggler)
var<workgroup> wgCovSum: atomic<u32>;   // Σ covered iterations over them
var<workgroup> wgTier: array<atomic<u32>, 4>; // Σ tier applications (auto mode)
var<workgroup> wgGateJumps: atomic<u32>;
var<workgroup> wgGateFails: atomic<u32>;
var<workgroup> wgSecoursApps: atomic<u32>;
var<workgroup> wgSecoursIters: atomic<u32>;
var<workgroup> wgAppsF32: atomic<u32>;

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
    atomicStore(&wgGateJumps, 0u);
    atomicStore(&wgGateFails, 0u);
    atomicStore(&wgSecoursApps, 0u);
    atomicStore(&wgSecoursIters, 0u);
    atomicStore(&wgAppsF32, 0u);
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
          g_workBudget = 0u;
          g_tierApps = array<u32, 4>(0u, 0u, 0u, 0u);
          g_gateJumps = 0u;
          g_gateFails = 0u;
          g_secoursApps = 0u;
          g_secoursIters = 0u;
          g_appsF32 = 0u;
          let startIter = select(iter_val, 0.0, is_compute_request);
          let neutralExtent = sqrt(mandelbrot.aspect * mandelbrot.aspect + 1.0);
          // AA sub-pixel jitter (neutral-space units); zero for sample 0 / AA off.
          let local_rot = xy_neutral * neutralExtent + vec2<f32>(mandelbrot.aaOffsetX, mandelbrot.aaOffsetY);

          var result: TexelOut;
          let scaleExp = i32(mandelbrot.scaleExp);
          if (ENABLE_DEEP && scaleExp <= DEEP_EXP) {
            // Deep path: scale/cx/cy carry fe mantissas sharing exponent scaleExp;
            // dc = local·scaleMant + (cxMant, cyMant) is a single same-exponent add.
            let dc = fe_renorm(fe(local_rot * mandelbrot.scale + vec2<f32>(mandelbrot.cx, mandelbrot.cy), scaleExp));
            if (is_compute_request) {
              // Certified SA prefix (Phase C, auto mode): the sidecar carries a
              // 10-entry header after the block records (base = last directory
              // entry's offset+count) — SA b1..b4 + n0 in the first four
              // entries, then the 6-coefficient periodic block. Start the
              // pixel at n = n0
              // with δ = Σ b_j·dc^j and ∂δ/∂c = Σ j·b_j·dc^(j−1), entering
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
                  // Phase D: z″ seed ∂²(SA)/∂c² = 2b₂ + 6b₃·dc + 12b₄·dc²,
                  // expressed in the 2·derS-tied mantissa convention.
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
          if (g_gateJumps > 0u) {
            atomicAdd(&wgGateJumps, g_gateJumps);
          }
          if (g_gateFails > 0u) {
            atomicAdd(&wgGateFails, g_gateFails);
          }
          if (g_secoursApps > 0u) {
            atomicAdd(&wgSecoursApps, g_secoursApps);
            atomicAdd(&wgSecoursIters, g_secoursIters);
          }
          if (g_appsF32 > 0u) {
            atomicAdd(&wgAppsF32, g_appsF32);
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
      atomicAdd(&workStats.gateJumps, atomicLoad(&wgGateJumps));
      atomicAdd(&workStats.gateFails, atomicLoad(&wgGateFails));
      atomicAdd(&workStats.secoursApps, atomicLoad(&wgSecoursApps));
      atomicAdd(&workStats.secoursIters, atomicLoad(&wgSecoursIters));
      atomicAdd(&workStats.appsF32, atomicLoad(&wgAppsF32));
    }
  }
}
