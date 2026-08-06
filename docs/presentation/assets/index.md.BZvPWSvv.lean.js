import{ao as ra,d as kt,ap as Ee,z as We,p as bn,s as bi,o as v,c as k,j as n,e as It,Q as la,aq as pt,y as $,U as vn,ar as oa,J as R,T as da,w as ae,_ as vi,a6 as ca,a7 as pa,G as ua,H as ha,t as Dn,b as fa,I as Jt,a as h,an as F,as as ma,at as ga}from"./chunks/framework.DrqfKv6l.js";let j4,Z4;let __tla=(async()=>{const _a=`// Fused brush + mandelbrot + count compute pass, working IN PLACE on the
// neutral texture A (rawTexture) via a read_write storage texture — the
// SINGLE production iteration path. Pan/clear frames are prepared by the
// reproject_cs utility pass (ping-pong A→B) in the same frame.
//
// ⚠ STRICTLY RAW-TEXEL-LOCAL: each invocation may only read and write ITS OWN
// raw texel, otherwise in-place execution races. Neighbour-dependent raw
// operations still belong in reproject_cs.wgsl.
//
// r32float is the only texture format supporting read_write storage access
// in core WebGPU — this shader depends on it.
//
// Layer layout (13-layer raw format; terminal and continuation meanings differ):
//   0 : exact request (-1) / iteration count
//   1 : escaped: analytic gradient.x,       in-progress: computed marker
//   2 : z.x (escaped) or dz.x (continuation)
//   3 : z.y (escaped) or dz.y (continuation)
//   4 : escaped: distance height,          in-progress: derM.x (RAW)
//   5 : escaped: analytic gradient.y,       in-progress: derM.y (RAW)
//   6 : escaped: stripe/coherence bitpack,  in-progress: ref_i + stripe
//   7 : escaped: analytic Laplacian,        in-progress: orbit dir / dz exponent
//   8 : in-progress: derS (RAW log scale); dead for finished pixels
//
// The derivative continuation state is carried RAW (register copies, zero
// transcendentals at pass boundaries — all-compute-der-cartesian). Polar
// conversion happens exactly once, at escape. The iter-layer state is the
// discriminant between the two meanings of layers 4/5 (as it already was
// for the escaped format).
//
// Pixel state (iter-only):
//   iter == -1                  : exact step-1 request
//   iter == 0                   : confirmed inside the set
//   iter > 0  AND  |z|\xb2 >= mu   : escaped
//   iter > 0  AND  |z|\xb2 < mu    : budget exhausted → continuation

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

// Renormalized Feigenbaum-return tier (additive, off by default). When true,
// a critical rebase (ref_i == 0) tries a single 2^n block whose map is the
// universal stored model H, gauged by s_n = orbit[2^n]. Specialization switch
// like ENABLE_DEEP/ENABLE_PORTFOLIO: dead-code-eliminated when false, so the
// working tiers are byte-identical unless a driver enables it.
override ENABLE_RENORM: bool = true;

// The parabolic gate currently omits the map's parameter derivatives. Until
// its complete first/second c-chain is available it cannot be used by the
// all-analytic geometry path; ordinary blocks/exact steps remain available.
const ENABLE_SECOND_ORDER_GATE: bool = false;

// Dynamic validity is specialized per pipeline. Legacy BLA/Pad\xe9/Jet/M\xf6bius
// and exact perturbation compile this whole proof dispatcher out instead of
// carrying its control flow and private state in every block-mode invocation.
override ENABLE_DYNAMIC_VALIDITY: bool = false;

// Reference-owned intrinsic radial layout v3. When false, Auto keeps evaluating the
// packed-v1 envelopes used by the explicit rollback path.
override ENABLE_RADIAL_VALIDITY: bool = false;

// Detailed proof counters are diagnostic instrumentation, not production
// rendering work. They add up to twenty workgroup atomics per active texel;
// keep them in a separate specialized pipeline and enable them only on demand.
override ENABLE_DYNAMIC_STATS: bool = false;

// Work instrumentation (realMean / covMean / maxAccum / maxSteps and the tier
// application mix). Same nature as ENABLE_DYNAMIC_STATS: it feeds the
// performance panel only — no render decision reads it — yet it used to cost
// seven UNGUARDED workgroup atomics per active texel, all 64 lanes hitting the
// same handful of addresses, plus ~20 init stores and ~13 global atomics per
// workgroup per dispatch. Enabled on demand by the panel.
override ENABLE_WORK_STATS: bool = false;

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

// Same layout as reproject_cs.wgsl — the CPU-side uniform buffer is shared.
struct BrushUniforms {
  aspect: f32,
  angle: f32,
  clearHistory: f32,
  shiftTexX: f32,
  shiftTexY: f32,
  // Origin of the dispatched region, in texels, workgroup-aligned. The neutral
  // texture is the square circumscribing the rotated viewport, so at low
  // rotation angles more than half its texels can never satisfy
  // \`is_inside_rotated_screen\` and every one of their workgroups launches only
  // to cull itself. The host dispatches the viewport's bounding box instead and
  // passes its origin here. Nothing is cleared or invalidated: the texels left
  // out are exactly those the per-texel test already rejects, so rotating the
  // view simply moves the box and keeps every previously computed texel.
  dispatchOriginX: f32,
  dispatchOriginY: f32,
  _padding: f32,
};

struct CounterBuffer {
  count: atomic<u32>,
  _padding: u32,
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
  // Form mix: Σ applications per form, RAW counts. Slot meaning is
  // MODE-dependent (the panel labels accordingly): mode 5 = [affine, Pad\xe9
  // [2/1], c+, jet]; mode 3 = [jet o1, jet o2, jet o3, —]; mode 4 =
  // [—, —, M\xf6bius-c⁺, —]; mode 1 = [BLA, —, —, —]; mode 2 = [—, Pad\xe9 [1/1],
  // —, —]. Zero in mode 0 (exact).
  tierAff: atomic<u32>,
  tierPade: atomic<u32>,
  tierCplus: atomic<u32>,
  tierJet: atomic<u32>,
  // \xa718 parabolic-gate observability: Ψ-jumps landed / degraded attempts,
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
  // Renormalized Feigenbaum-return tier (ENABLE_RENORM): block applications
  // and the iterations they covered (Σ 2^n). Raw counts, zero while the tier
  // is off. This is the A/B signal for the renorm tier's wall gain.
  renormApps: atomic<u32>,
  renormIters: atomic<u32>,
  // Dynamic Auto observability (mode 6), raw session totals.
  dynamicTierAttempts: array<atomic<u32>, 4>,
  dynamicTierAccepts: array<atomic<u32>, 4>,
  // Applied skip buckets: <16, 16..255, 256..4095, >=4096.
  dynamicSkipBuckets: array<atomic<u32>, 4>,
  dynamicCandidateUses: atomic<u32>,
  // Detailed: value, derivative, pure-c, reference, Cauchy, pole.
  // Coarse: packed proof without provenance, optimistic summary prefilter.
  dynamicRejects: array<atomic<u32>, 8>,
  dynamicExactFallbacks: atomic<u32>,
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
// records are 7 (84 B: A, B, A', D, D', F, N₂ — the [2/1]-c+ form). Both
// tables ship in the SAME buffer (identical 12 B element, exclusive modes) —
// the mode flag picks the stride. Same flat block index as the radius buffer
// either way.
const JET_COEFF_STRIDE: i32 = 9;
const MOBIUS_COEFF_STRIDE: i32 = 7;
// Unified table (mode 5): 9 elements in PREFIX order [A, B, D, N₂, A', D', F,
// a12, a03] ([2/1] record) — same element count as jet, tier-directed prefix
// reads (affine 2, Pad\xe9 4, c+ 7, jet 9).
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
// Auto dynamic-validity multiplexes its packed vec4 words onto this binding:
// BLA levels are unused in mode 5, preserving the WebGPU-minimum limit of
// eight storage buffers while legacy Unified radii remain bound for shadowing.
@group(0) @binding(3) var<storage, read> mandelbrotBlaLevels: array<BlaLevel>;
@group(0) @binding(4) var raw: texture_storage_2d_array<r32float, read_write>;
@group(0) @binding(5) var<uniform> brush: BrushUniforms;
@group(0) @binding(6) var<storage, read_write> counter: CounterBuffer;
@group(0) @binding(7) var<storage, read_write> workStats: WorkStats;
@group(0) @binding(8) var<storage, read> mandelbrotJetSuite: array<JetCoeff>;
@group(0) @binding(9) var<storage, read> mandelbrotJetLevels: array<JetLevel>;
@group(0) @binding(10) var<storage, read> mandelbrotJetRadii: array<JetRadii>;

const VALIDITY_VERSION: u32 = 1u;
const VALIDITY_WORDS_PER_BLOCK: u32 = 24u;
const VALIDITY_WORDS_PER_TIER: u32 = 6u;
const VALIDITY_SLOPES: array<f32, 4> = array<f32, 4>(0.0, -0.5, -1.0, -2.0);
const RADIAL_VALIDITY_VERSION: u32 = 3u;
const RADIAL_VALIDITY_WORDS_PER_BLOCK: u32 = 21u;

struct DynamicValidityEvaluation {
  log2Dc: f32,
  log2Dz: f32,
  radiusLog2: f32,
  accepts: bool,
  rejectionReason: u32,
  candidateLimited: bool,
};

const VALIDITY_REJECT_VALUE: u32 = 0u;
const VALIDITY_REJECT_DERIVATIVE: u32 = 1u;
const VALIDITY_REJECT_PURE_C: u32 = 2u;
const VALIDITY_REJECT_STATIC: u32 = 3u;
const VALIDITY_REJECT_CAUCHY: u32 = 4u;
const VALIDITY_REJECT_POLE: u32 = 5u;
// The active dynamic path intentionally avoids the diagnostics sidecar. A
// rejection whose exact packed-proof source was not loaded must remain
// explicitly unattributed instead of being mislabeled as static/reference.
const VALIDITY_REJECT_PACKED_UNKNOWN: u32 = 6u;
const VALIDITY_REJECT_SUMMARY: u32 = 7u;
const VALIDITY_REJECT_NONE: u32 = 8u;
const OPTIONAL_HEADER_VERSION: i32 = 1;

// WGSL source constants may not be non-finite. These finite sentinels are used
// only for local initialization/zero handling; packed +/-inf values are still
// loaded from storage and detected by their bits.
fn validity_pos_inf() -> f32 { return 3.4028234e38; }
fn validity_neg_inf() -> f32 { return -3.4028234e38; }
fn validity_is_pos_inf(value: f32) -> bool {
  return value == validity_pos_inf() || bitcast<u32>(value) == 0x7f800000u;
}
fn validity_is_neg_inf(value: f32) -> bool {
  return value == validity_neg_inf() || bitcast<u32>(value) == 0xff800000u;
}

fn validity_next_up(value: f32) -> f32 {
  let bits = bitcast<u32>(value);
  let absBits = bits & 0x7fffffffu;
  if (absBits > 0x7f800000u || bits == 0x7f800000u) { return value; }
  if (absBits == 0u) { return bitcast<f32>(1u); }
  if (value > 0.0) { return bitcast<f32>(bits + 1u); }
  return bitcast<f32>(bits - 1u);
}

fn validity_next_down(value: f32) -> f32 {
  let bits = bitcast<u32>(value);
  let absBits = bits & 0x7fffffffu;
  if (absBits > 0x7f800000u || bits == 0xff800000u) { return value; }
  if (absBits == 0u) { return bitcast<f32>(0x80000001u); }
  if (value > 0.0) { return bitcast<f32>(bits - 1u); }
  return bitcast<f32>(bits + 1u);
}

// Operation-for-operation mirror of validity::conservative_complex_log2.
// Rounding |dc| and |dz| upward can only make certification stricter.
fn validity_log2_complex(value: vec2<f32>, exponent: i32) -> f32 {
  let xBits = bitcast<u32>(value.x) & 0x7fffffffu;
  let yBits = bitcast<u32>(value.y) & 0x7fffffffu;
  if (xBits >= 0x7f800000u || yBits >= 0x7f800000u) { return validity_pos_inf(); }
  let axis = max(abs(value.x), abs(value.y));
  if (axis == 0.0) { return validity_neg_inf(); }
  let sx = value.x / axis;
  let sy = value.y / axis;
  let norm2 = validity_next_up(sx * sx + sy * sy);
  let angular = validity_next_up(0.5 * validity_next_up(log2(norm2)));
  let radial = validity_next_up(log2(axis));
  return validity_next_up(validity_next_up(radial + angular) + f32(exponent));
}

fn validity_log2_complex_shallow(value: vec2<f32>) -> f32 {
  return validity_log2_complex(value, 0);
}

fn validity_log2_complex_floatexp(value: fe) -> f32 {
  return validity_log2_complex(value.m, value.e);
}

// Binding 3 is physically an f32 stream in Auto. BlaLevel's first three u32
// fields preserve those bits verbatim; its fourth field is already f32.
fn validity_raw_word(absoluteWord: u32) -> u32 {
  let packed = mandelbrotBlaLevels[absoluteWord >> 2u];
  switch (absoluteWord & 3u) {
    case 0u: { return packed.offset; }
    case 1u: { return packed.count; }
    case 2u: { return packed.skip; }
    default: { return bitcast<u32>(packed.maxRadius); }
  }
}

fn validity_packed_word(blockIndex: u32, tier: u32, word: u32) -> f32 {
  let absoluteWord = blockIndex * VALIDITY_WORDS_PER_BLOCK
    + tier * VALIDITY_WORDS_PER_TIER + word;
  return bitcast<f32>(validity_raw_word(absoluteWord));
}

struct PackedValidityTierGpu {
  lines: vec4<f32>,
  maxLog2Dc: f32,
  candidateRadius: f32,
}

fn validity_level_vec(index: u32) -> vec4<f32> {
  let packed = mandelbrotBlaLevels[index];
  return vec4<f32>(
    bitcast<f32>(packed.offset),
    bitcast<f32>(packed.count),
    bitcast<f32>(packed.skip),
    packed.maxRadius,
  );
}

// Packed-v1 stores six consecutive f32s per tier. Because a block is exactly
// 24 words, even tiers start on a vec4 boundary and odd tiers start at word 2;
// either case needs exactly two coalesced 16-byte reads.
fn validity_packed_tier(blockIndex: u32, tier: u32) -> PackedValidityTierGpu {
  let absoluteWord = blockIndex * VALIDITY_WORDS_PER_BLOCK
    + tier * VALIDITY_WORDS_PER_TIER;
  let first = validity_level_vec(absoluteWord >> 2u);
  let second = validity_level_vec((absoluteWord >> 2u) + 1u);
  if ((tier & 1u) == 0u) {
    return PackedValidityTierGpu(first, second.x, second.y);
  }
  return PackedValidityTierGpu(
    vec4<f32>(first.z, first.w, second.x, second.y),
    second.z,
    second.w,
  );
}

fn validity_diagnostic_word(blockIndex: u32, word: u32) -> u32 {
  let lastLevel = mandelbrotJetLevels[i32(mandelbrot.blaLevelCount) - 1];
  let blockCount = lastLevel.offset + lastLevel.count;
  return validity_raw_word(blockCount * VALIDITY_WORDS_PER_BLOCK + blockIndex * 2u + word);
}

fn validity_domain_rejection(blockIndex: u32, tier: u32) -> u32 {
  let encoded = (validity_diagnostic_word(blockIndex, 0u) >> (tier * 2u)) & 3u;
  switch (encoded) {
    case 1u: { return VALIDITY_REJECT_PURE_C; }
    case 2u: { return VALIDITY_REJECT_POLE; }
    case 3u: { return VALIDITY_REJECT_CAUCHY; }
    default: { return VALIDITY_REJECT_STATIC; }
  }
}

fn validity_line_rejection(blockIndex: u32, tier: u32, bucket: u32) -> u32 {
  let shift = (tier * 4u + bucket) * 2u;
  let encoded = (validity_diagnostic_word(blockIndex, 1u) >> shift) & 3u;
  switch (encoded) {
    case 0u: { return VALIDITY_REJECT_VALUE; }
    case 1u: { return VALIDITY_REJECT_DERIVATIVE; }
    case 2u: { return VALIDITY_REJECT_POLE; }
    default: { return VALIDITY_REJECT_CAUCHY; }
  }
}

fn evaluate_dynamic_validity_logs(
  blockIndex: u32,
  tier: u32,
  log2Dc: f32,
  log2Dz: f32,
  detailedDiagnostics: bool,
) -> DynamicValidityEvaluation {
  let packedTier = validity_packed_tier(blockIndex, tier);
  let maxLog2Dc = packedTier.maxLog2Dc;
  var radiusLog2 = validity_neg_inf();
  var rejectionReason = VALIDITY_REJECT_PACKED_UNKNOWN;
  if (detailedDiagnostics) {
    rejectionReason = validity_domain_rejection(blockIndex, tier);
  }
  var candidateLimited = false;
  if (!validity_is_neg_inf(maxLog2Dc) && log2Dc == log2Dc && log2Dc <= maxLog2Dc) {
    var commonRadius = validity_pos_inf();
    var limitingBucket = 0u;
    for (var line = 0u; line < 4u; line++) {
      let intercept = packedTier.lines[line];
      if (validity_is_pos_inf(intercept)) { continue; }
      var evaluated = validity_pos_inf();
      if (log2Dc == validity_neg_inf()) {
        if (VALIDITY_SLOPES[line] == 0.0) { evaluated = intercept; }
      } else {
        evaluated = intercept + VALIDITY_SLOPES[line] * log2Dc;
      }
      let evaluatedDown = validity_next_down(evaluated);
      if (evaluatedDown < commonRadius) {
        commonRadius = evaluatedDown;
        limitingBucket = line;
      }
    }
    let candidateRadius = packedTier.candidateRadius;
    candidateLimited = candidateRadius <= commonRadius;
    radiusLog2 = min(commonRadius, candidateRadius);
    if (candidateLimited) {
      rejectionReason = VALIDITY_REJECT_CAUCHY;
    } else if (detailedDiagnostics) {
      rejectionReason = validity_line_rejection(blockIndex, tier, limitingBucket);
    }
  }
  let accepts = radiusLog2 != validity_neg_inf() && log2Dz == log2Dz && log2Dz <= radiusLog2;
  return DynamicValidityEvaluation(
    log2Dc,
    log2Dz,
    radiusLog2,
    accepts,
    select(rejectionReason, VALIDITY_REJECT_NONE, accepts),
    candidateLimited,
  );
}

fn radial_validity_word(blockIndex: u32, word: u32) -> u32 {
  return validity_raw_word(blockIndex * RADIAL_VALIDITY_WORDS_PER_BLOCK + word);
}

fn radial_validity_float(blockIndex: u32, word: u32) -> f32 {
  return bitcast<f32>(radial_validity_word(blockIndex, word));
}

// Operation-for-operation mirror of RadialValidityV3::affine_radius_log2.
// alpha was rounded down and beta up by Rust before serialization.
fn conservative_affine_radius_log2(alpha: f32, alphaExp: i32, beta: f32, log2Dc: f32) -> f32 {
  let alphaBits = bitcast<u32>(alpha) & 0x7fffffffu;
  let betaBits = bitcast<u32>(beta) & 0x7fffffffu;
  if (!(alpha > 0.0) || alphaBits >= 0x7f800000u
      || !(beta >= 0.0) || betaBits >= 0x7f800000u) {
    return validity_neg_inf();
  }
  let log2Alpha = validity_next_down(
    validity_next_down(log2(alpha)) + f32(alphaExp),
  );
  if (log2Dc == validity_neg_inf() || beta == 0.0) {
    return log2Alpha;
  }
  if (log2Dc != log2Dc || log2Dc == validity_pos_inf()) {
    return validity_neg_inf();
  }
  let log2BetaDc = validity_next_up(validity_next_up(log2(beta)) + log2Dc);
  let relative = validity_next_up(log2BetaDc - log2Alpha);
  if (relative >= 0.0) {
    return validity_neg_inf();
  }
  let remaining = validity_next_down(1.0 - validity_next_up(exp2(relative)));
  if (!(remaining > 0.0) || remaining != remaining) {
    return validity_neg_inf();
  }
  return validity_next_down(log2Alpha + validity_next_down(log2(remaining)));
}

fn radial_affine_radius_log2(blockIndex: u32, log2Dc: f32) -> f32 {
  return conservative_affine_radius_log2(
    radial_validity_float(blockIndex, 0u),
    bitcast<i32>(radial_validity_word(blockIndex, 1u)),
    radial_validity_float(blockIndex, 2u),
    log2Dc,
  );
}

fn bla_affine_radius_log2(block: BlaStep, log2Dc: f32) -> f32 {
  return conservative_affine_radius_log2(
    block.radius_alpha,
    block.alpha_exp,
    block.radius_beta,
    log2Dc,
  );
}

fn evaluate_radial_validity_logs(
  blockIndex: u32,
  tier: u32,
  log2Dc: f32,
  log2Dz: f32,
) -> DynamicValidityEvaluation {
  let negativeInfinity = validity_neg_inf();
  if (log2Dc != log2Dc || log2Dz != log2Dz) {
    return DynamicValidityEvaluation(
      log2Dc, log2Dz, negativeInfinity, false, VALIDITY_REJECT_CAUCHY, false,
    );
  }
  if (tier == 0u) {
    let radius = radial_affine_radius_log2(blockIndex, log2Dc);
    let accepts = !validity_is_neg_inf(radius) && log2Dz <= radius;
    return DynamicValidityEvaluation(
      log2Dc,
      log2Dz,
      radius,
      accepts,
      select(VALIDITY_REJECT_VALUE, VALIDITY_REJECT_NONE, accepts),
      false,
    );
  }

  let tierBase = 3u + (tier - 1u) * 6u;
  var anyLive = false;
  var anyDc = false;
  var anyPole = false;
  var bestRadius = negativeInfinity;
  for (var candidate = 0u; candidate < 2u; candidate++) {
    let base = tierBase + candidate * 3u;
    let maxDz = radial_validity_float(blockIndex, base);
    let maxDc = radial_validity_float(blockIndex, base + 1u);
    let pole = radial_validity_float(blockIndex, base + 2u);
    if (validity_is_neg_inf(maxDz) || validity_is_neg_inf(maxDc)
        || maxDz != maxDz || maxDc != maxDc || pole != pole) {
      continue;
    }
    anyLive = true;
    let radius = min(maxDz, pole);
    bestRadius = max(bestRadius, radius);
    if (log2Dc > maxDc) {
      continue;
    }
    anyDc = true;
    if (log2Dz > pole) {
      continue;
    }
    anyPole = true;
    if (log2Dz <= maxDz) {
      return DynamicValidityEvaluation(
        log2Dc, log2Dz, radius, true, VALIDITY_REJECT_NONE, candidate == 1u,
      );
    }
  }
  let rejection = select(
    select(VALIDITY_REJECT_DERIVATIVE, VALIDITY_REJECT_PURE_C, anyDc && !anyPole),
    VALIDITY_REJECT_CAUCHY,
    !anyLive,
  );
  return DynamicValidityEvaluation(
    log2Dc,
    log2Dz,
    bestRadius,
    false,
    rejection,
    false,
  );
}

fn evaluate_dynamic_validity_shallow(
  blockIndex: u32,
  tier: u32,
  dc: vec2<f32>,
  dz: vec2<f32>,
) -> DynamicValidityEvaluation {
  return evaluate_dynamic_validity_logs(
    blockIndex,
    tier,
    validity_log2_complex_shallow(dc),
    validity_log2_complex_shallow(dz),
    true,
  );
}

fn evaluate_dynamic_validity_floatexp(
  blockIndex: u32,
  tier: u32,
  dc: fe,
  dz: fe,
) -> DynamicValidityEvaluation {
  return evaluate_dynamic_validity_logs(
    blockIndex,
    tier,
    validity_log2_complex_floatexp(dc),
    validity_log2_complex_floatexp(dz),
    true,
  );
}

// Per-invocation real loop-step counter (work done by this texel this dispatch),
// incremented once per iteration-loop turn (a block-apply or an exact step both
// count as 1). Reset in cs_main before each texel's compute.
var<private> g_workSteps: u32 = 0u;
// Per-dispatch WORK budget (batch): each loop turn adds the WEIGHT of the
// move it executed — exact step 1, block applications by form cost (fe ≈ \xd72),
// Ψ-gate hops 8 — so \`maxIteration\` bounds homogeneous work ≈ GPU time and
// the adaptive batch controller stays stable across block/exact mix swings
// while navigating. g_workSteps (1/turn) keeps the honest turn stats.
var<private> g_workBudget: u32 = 0u;
// Per-texel tier application counts (auto mode), flushed with the work stats.
var<private> g_tierApps: array<u32, 4> = array<u32, 4>(0u, 0u, 0u, 0u);
var<private> g_dynamicTierAttempts: array<u32, 4> = array<u32, 4>(0u, 0u, 0u, 0u);
var<private> g_dynamicTierAccepts: array<u32, 4> = array<u32, 4>(0u, 0u, 0u, 0u);
var<private> g_dynamicSkipBuckets: array<u32, 4> = array<u32, 4>(0u, 0u, 0u, 0u);
var<private> g_dynamicCandidateUses: u32 = 0u;
var<private> g_dynamicRejects: array<u32, 8> = array<u32, 8>(0u, 0u, 0u, 0u, 0u, 0u, 0u, 0u);
var<private> g_dynamicExactFallbacks: u32 = 0u;
var<private> g_gateJumps: u32 = 0u;
var<private> g_gateFails: u32 = 0u;
var<private> g_secoursApps: u32 = 0u;
var<private> g_secoursIters: u32 = 0u;
var<private> g_appsF32: u32 = 0u;
var<private> g_renormApps: u32 = 0u;
var<private> g_renormIters: u32 = 0u;

// ── complex helpers (verbatim from mandelbrot.wgsl) ────────────────
fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

// Independently scaled complex used for z″. Sharing the derivative's 2\xb7S
// scale made a perfectly finite z″ overflow/underflow as soon as the relative
// exponent left the f32 window. Here value = m\xb7exp(s), with m normalized by
// max-component. Additions shift only TOWARDS the largest scale, so exp() sees
// non-positive arguments and can only discard an already-negligible term.
struct ScaledComplex {
  m: vec2<f32>,
  s: f32,
};

const SCALED_ZERO_S: f32 = -1e35;

fn scaled_complex_zero() -> ScaledComplex {
  return ScaledComplex(vec2<f32>(0.0), SCALED_ZERO_S);
}

fn scaled_complex_normalize(m: vec2<f32>, s: f32) -> ScaledComplex {
  let a = max(abs(m.x), abs(m.y));
  if (!(a > 0.0)) {
    return scaled_complex_zero();
  }
  return ScaledComplex(m / a, s + log(a));
}

fn scaled_complex_add(a: ScaledComplex, b: ScaledComplex) -> ScaledComplex {
  let aa = max(abs(a.m.x), abs(a.m.y));
  let ba = max(abs(b.m.x), abs(b.m.y));
  if (!(aa > 0.0)) { return b; }
  if (!(ba > 0.0)) { return a; }
  let s = max(a.s, b.s);
  return scaled_complex_normalize(
    a.m * exp(a.s - s) + b.m * exp(b.s - s),
    s,
  );
}

fn scaled_complex_add4(
  a: ScaledComplex,
  b: ScaledComplex,
  c: ScaledComplex,
  d: ScaledComplex,
) -> ScaledComplex {
  return scaled_complex_add(scaled_complex_add(a, b), scaled_complex_add(c, d));
}

fn snd_exact_step(
  derM: vec2<f32>,
  derS: f32,
  z: vec2<f32>,
  sndM: ptr<function, vec2<f32>>,
  sndS: ptr<function, f32>,
) {
  let derTerm = scaled_complex_normalize(2.0 * cmul(derM, derM), 2.0 * derS);
  let sndTerm = scaled_complex_normalize(2.0 * cmul(z, *sndM), *sndS);
  let next = scaled_complex_add(derTerm, sndTerm);
  *sndM = next.m;
  *sndS = next.s;
}

fn scaled_complex_log_length(m: vec2<f32>, s: f32) -> f32 {
  let a = max(abs(m.x), abs(m.y));
  if (!(a > 0.0)) {
    return SCALED_ZERO_S;
  }
  let u = m / a;
  return s + log(a) + 0.5 * log(dot(u, u));
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

// Second-order chain rule shared by every accepted approximation map.
// All map partials are floatexp while z' and z'' keep independent natural-log
// scales, so the four terms are normalized before their sum.
fn snd_apply_map(
  mz: fe,
  mzz: fe,
  mzc: fe,
  mcc: fe,
  derOld: vec2<f32>,
  derOldScale: f32,
  snd: ptr<function, vec2<f32>>,
  sndScale: ptr<function, f32>,
) {
  let t1 = scaled_complex_normalize(
    cmul(mz.m, *snd), f32(mz.e) * LN2 + *sndScale,
  );
  let t2 = scaled_complex_normalize(
    cmul(mzz.m, cmul(derOld, derOld)), f32(mzz.e) * LN2 + 2.0 * derOldScale,
  );
  let t3 = scaled_complex_normalize(
    2.0 * cmul(mzc.m, derOld), f32(mzc.e) * LN2 + derOldScale,
  );
  let t4 = scaled_complex_normalize(mcc.m, f32(mcc.e) * LN2);
  let next = scaled_complex_add4(t1, t2, t3, t4);
  *snd = next.m;
  *sndScale = next.s;
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

// Exterior distance in SCREEN units, as -log: |z|\xb7ln|z| / (2\xb7|z'|\xb7scale). That
// is the Koebe estimate 2|z|ln|z|/|z'| divided by 4, i.e. the guaranteed LOWER
// bound on the true distance — deliberately conservative, so the AA ramp that
// reads it never under-samples. (Measured: the undivided estimate hits exactly
// 4\xd7 the true distance at a tip, the extremal Koebe case.)
//
// It is only meaningful when the pixel escaped well past |z| = 1: the formula is
// asymptotic in |z|, and its ln(ln|z|) term blows up as |z| → 1. Measured against
// a bailout of 1e12, the share of pixels off by more than 2\xd7 is 0–2 % at
// mu = 4, 10–27 % at mu = 2 and 43–100 % at mu = 1 (median error \xd71484 there).
// The Mu slider is therefore floored at 4 in Settings.vue; the 1.000002 clamp
// below only catches a preset that predates that floor, and it clamps rather
// than fixes — a mu < 4 preset still gets a corrupt height field.
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

fn finite_scalar(value: f32) -> bool {
  let bits = bitcast<u32>(value) & 0x7fffffffu;
  return bits < 0x7f800000u;
}

fn finite_vec2(value: vec2<f32>) -> bool {
  return finite_scalar(value.x) && finite_scalar(value.y);
}

// Fixed-escape-branch geometry for
// H = log|z'| - log|z| - log(log|z|) + constant.
// The vector is expressed per source neutral texel; texture y grows down, so
// its second component is +Im(A) for A = z''/z'-(1+1/log|z|)z'/z.
// The scalar trace simplifies without z''': Delta H = |z'/z|^2/log^2|z|.
fn analytic_terminal_geometry(
  z: vec2<f32>,
  derM: vec2<f32>,
  derS: f32,
  sndM: vec2<f32>,
  sndS: f32,
  deepScaleExp: i32,
) -> vec3<f32> {
  let z2 = dot(z, z);
  let der2 = dot(derM, derM);
  if (!(z2 > 1.0) || !(der2 > 1e-30) || !finite_vec2(z)
      || !finite_vec2(derM) || !finite_vec2(sndM)
      || !finite_scalar(derS) || !finite_scalar(sndS)) {
    return vec3<f32>(0.0);
  }
  let logZ = 0.5 * log(z2);
  if (!(logZ > 0.0)) { return vec3<f32>(0.0); }
  let dims = textureDimensions(raw);
  let logTexelDelta = log(max(mandelbrot.scale, 1e-30))
    + f32(deepScaleExp) * LN2
    + log(2.0 * sqrt(mandelbrot.aspect * mandelbrot.aspect + 1.0) / f32(dims.x));

  let invDer = vec2<f32>(derM.x, -derM.y) / der2;
  let invZ = vec2<f32>(z.x, -z.y) / z2;
  let first = cmul(sndM, invDer)
    * exp(clamp(sndS - derS + logTexelDelta, -80.0, 80.0));
  let second = cmul(derM, invZ)
    * ((1.0 + 1.0 / logZ) * exp(clamp(derS + logTexelDelta, -80.0, 80.0)));
  let gradient = first - second;

  let derivativeLog = derS + 0.5 * log(der2);
  let laplacianLog = 2.0 * (derivativeLog - logZ - log(logZ) + logTexelDelta);
  let laplacian = exp(clamp(laplacianLog, -80.0, log(64.0)));
  if (!finite_vec2(gradient) || !finite_scalar(laplacian)) {
    return vec3<f32>(0.0);
  }
  return vec3<f32>(
    clamp(gradient, vec2<f32>(-64.0), vec2<f32>(64.0)),
    clamp(laplacian, 0.0, 64.0),
  );
}

fn getOrbit(index: i32) -> vec2<f32> {
  return vec2<f32>(
    mandelbrotOrbitPointSuite[index].zx,
    mandelbrotOrbitPointSuite[index].zy,
  );
}

// ── Renormalized Feigenbaum return tier: shared constants ───────────────
// The universal stored model h(x) is an even Chebyshev series, which is a
// plain Chebyshev series in u = 2x\xb2-1 (since T_{2k}(x) = T_k(2x\xb2-1)):
//   h(x) = Σ_k a_k T_k(u),  a_0 = h0,  a_k = 2 h_k (k≥1).
// Coefficients emitted by feigenbaum.rs::print_wgsl_chebyshev_table and
// validated against the certified model (clenshaw_matches_chebyshev_model).
// Declared here (before the shallow kernel) so both the f32 and fe renorm
// paths can reference them.
const RENORM_H_NCOEFF: i32 = 22;
const RENORM_H_A: array<f32, 22> = array<f32, 22>(
  2.82895431636247141e-1,
  -7.00391573973713766e-1,
  1.73621867222441828e-2,
  6.23655913694090851e-4,
  -2.52664143762083088e-5,
  2.78126060429247940e-7,
  7.79368199634042862e-9,
  -3.27785722586730129e-10,
  6.38421007870543245e-13,
  1.77810711459458750e-13,
  -2.79904315501524320e-15,
  -6.59877657064237416e-17,
  3.11574620476084591e-18,
  -2.62888173525654476e-20,
  -1.32615575292353235e-21,
  4.56892132858756487e-23,
  -2.61669143830041813e-25,
  -1.94839417192415847e-26,
  5.48861828421866049e-28,
  -8.03619305335911877e-31,
  -2.72885855283361466e-31,
  5.58026820379403788e-33
);
// Normalized certified disk (census domain_radius) and level bounds.
const RENORM_RADIUS: f32 = 0.25;
const RENORM_MIN_LEVEL: i32 = 2;   // smallest jump 2^2 = 4
const RENORM_MAX_LEVEL: i32 = 24;
// Parameter-window gate (measured census law): the certificate only holds
// for |c - c_∞| ≤ δ_max(n), with δ_max(2) ≈ 7.7e-8 (K_c\xb7δ ≤ 10% of the 1e-4
// budget) shrinking \xd78.5 per level (K_c ladder). A pixel's c is offset from
// the reference by dc, so gate each level on |dc| ≤ δ_max(n). Without this
// the model gets applied at parameters where it is plain WRONG (e.g. shallow
// views, |dc| ~ 1e-3) and produces garbage classifications.
const RENORM_DC_BASE: f32 = 7.7e-8;
const RENORM_DC_LOG2_RATIO: f32 = 3.09;   // log2(8.5)
// Structural cascade gate: on the doubling cascade the critical scales
// contract by 1/α ≈ 0.40 per level (|s_n| ≈ α⁻\xb9|s_{n-1}|). Requiring two
// consecutive ratios ≤ 0.45 keeps the tier quiet when the REFERENCE center
// is not on a period-doubling cascade at that depth (|dc| alone cannot see
// that, e.g. deep zooms elsewhere in the needle).
const RENORM_LADDER_RATIO: f32 = 0.45;

// f32 renorm path (shallow kernel). Near the critical rebase every quantity is
// O(1): x = dz/s_n ≤ 0.25, s_n ~ O(0.2), H ~ O(1), so plain f32 (roundoff
// ~1e-7) is ~500\xd7 under the certified model error (~5e-5) — no need for fe.
struct RenormEvalF32 { value: vec2<f32>, deriv: vec2<f32>, second: vec2<f32> };

// (h(x), h'(x)) at f32 complex x, via Clenshaw in u and its derivative
// recurrence. h'(x) = h_u(u) \xb7 du/dx = h_u \xb7 4x.
fn renorm_eval_h_f32(x: vec2<f32>) -> RenormEvalF32 {
  let u = 2.0 * cmul(x, x) - vec2<f32>(1.0, 0.0);
  let two_u = 2.0 * u;
  var a: array<f32, 22> = RENORM_H_A;
  var b1 = vec2<f32>(0.0, 0.0);
  var b2 = vec2<f32>(0.0, 0.0);
  var d1 = vec2<f32>(0.0, 0.0);
  var d2 = vec2<f32>(0.0, 0.0);
  var dd1 = vec2<f32>(0.0, 0.0);
  var dd2 = vec2<f32>(0.0, 0.0);
  for (var k = RENORM_H_NCOEFF - 1; k >= 1; k = k - 1) {
    let ak = vec2<f32>(a[k], 0.0);
    let b0 = ak + cmul(two_u, b1) - b2;
    let dd0 = 2.0 * b1 + cmul(two_u, d1) - d2;
    let ddd0 = 4.0 * d1 + cmul(two_u, dd1) - dd2;
    b2 = b1; b1 = b0;
    d2 = d1; d1 = dd0;
    dd2 = dd1; dd1 = ddd0;
  }
  var out: RenormEvalF32;
  out.value = vec2<f32>(a[0], 0.0) + cmul(u, b1) - b2;
  let h_u = b1 + cmul(u, d1) - d2;
  let h_uu = 2.0 * d1 + cmul(u, dd1) - dd2;
  out.deriv = cmul(h_u, 4.0 * x);
  out.second = cmul(h_uu, cmul(4.0 * x, 4.0 * x)) + 4.0 * h_u;
  return out;
}

// Shallow-path renorm block: at a critical rebase (ref_i == 0, dz = full
// state z since orbit[0] = 0), apply the largest qualifying block. Same
// contract as the fe try_apply_renorm but entirely in f32. \`dcMag\` gates the
// parameter window per level; the s-ladder gate checks the reference is
// actually on a doubling cascade at that depth.
fn try_apply_renorm_f32(dz: ptr<function, vec2<f32>>, derM: ptr<function, vec2<f32>>, derScale: f32, snd: ptr<function, vec2<f32>>, sndScale: ptr<function, f32>, i: ptr<function, f32>, maxIterI: i32, dcMag: f32) -> i32 {
  let dzMag = length(*dz);
  for (var n = RENORM_MAX_LEVEL; n >= RENORM_MIN_LEVEL; n = n - 1) {
    let skip = 1 << u32(n);
    if (i32(skip) >= maxIterI) { continue; }
    // Parameter window: |dc| must fit this level's certified c-window.
    if (dcMag > RENORM_DC_BASE * exp2(f32(2 - n) * RENORM_DC_LOG2_RATIO)) { continue; }
    let sn = getOrbit(i32(skip));
    let snMag2 = dot(sn, sn);
    if (!(snMag2 > 0.0)) { continue; }
    let snMag = sqrt(snMag2);
    // Cascade-ladder gate: two consecutive contractions ≈ 1/α.
    let sPrev = length(getOrbit(i32(skip) / 2));
    let sPrev2 = length(getOrbit(i32(skip) / 4));
    if (snMag > RENORM_LADDER_RATIO * sPrev || sPrev > RENORM_LADDER_RATIO * sPrev2) { continue; }
    if (dzMag > RENORM_RADIUS * snMag) { continue; }
    let invSn = vec2<f32>(sn.x, -sn.y) / snMag2;
    let x = cmul(invSn, *dz);
    let ev = renorm_eval_h_f32(x);
    let derOld = *derM;
    *dz = cmul(sn, ev.value);
    snd_apply_map(
      fe_from_vec(ev.deriv, 0), fe_from_vec(cmul(ev.second, invSn), 0),
      fe(vec2<f32>(0.0), 0), fe(vec2<f32>(0.0), 0),
      derOld, derScale, snd, sndScale,
    );
    *derM = cmul(ev.deriv, *derM);
    *i += f32(skip);
    return i32(skip);
  }
  return 0;
}

// Complex reciprocal 1/z (Pad\xe9 block application).
fn cinv(z: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(z.x, -z.y) / dot(z, z);
}
const PADE_POLE2: f32 = 1e-4;
const BLA_F32_EXP_LIMIT: i32 = 120;

fn bla_vec2_is_finite(value: vec2<f32>) -> bool {
  let xBits = bitcast<u32>(value.x) & 0x7fffffffu;
  let yBits = bitcast<u32>(value.y) & 0x7fffffffu;
  return xBits < 0x7f800000u && yBits < 0x7f800000u;
}

fn bla_coefficients_fit_f32(block: BlaStep, pade: bool) -> bool {
  let abOk = block.ab_exp >= -BLA_F32_EXP_LIMIT && block.ab_exp <= BLA_F32_EXP_LIMIT;
  let dOk = !pade || (block.d_exp >= -BLA_F32_EXP_LIMIT && block.d_exp <= BLA_F32_EXP_LIMIT);
  return abOk && dOk;
}

fn try_apply_bla(ref_i: ptr<function, i32>, dz: ptr<function, vec2<f32>>, derM: ptr<function, vec2<f32>>, derS: ptr<function, f32>, derSLo: ptr<function, f32>, derInvScale: ptr<function, f32>, epsThreshold: ptr<function, f32>, logEpsilon: f32, zOut: ptr<function, vec2<f32>>, dc: vec2<f32>, bailout: f32, skip0Log: i32, maxIterI: i32, snd: ptr<function, vec2<f32>>, sndScale: ptr<function, f32>) -> i32 {
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
  let log2Dc = validity_log2_complex_shallow(dc);
  let log2Dz = validity_log2_complex_shallow(*dz);
  let log2BlaEpsilon = validity_next_down(log2(max(mandelbrot.blaEpsilon, 1e-30)));
  // (G) near-critical guard: a M\xf6bius block may only span steps with
  // |2Z_k| ≥ mu = √(|c|/ε); in log2, min_k log2|2Z_k| ≥ log2(mu).
  let log2_mu = 0.5 * (log2Dc - log2BlaEpsilon);
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
        // The serialized radius is outward-rounded (alpha down, beta up), and
        // every gate operation is directed toward rejection. This also makes a
        // dead/non-finite Rust bound unconditionally reject.
        let radiusLog2 = bla_affine_radius_log2(bla, log2Dc);
        if (!validity_is_neg_inf(radiusLog2) && log2Dz <= radiusLog2) {
          if (mandelbrot.approximationMode >= 1.5) {
            // ── Pad\xe9 [1/1] (in-place compute path) ──
            // (H2) c-truncation bound (|B|\xb7|c| < ε) + (G) near-critical guard
            // (block's min |2Z_k| ≥ mu) + pole guard. Any failing ⇒ descend a level.
            let log2B = validity_log2_complex(vec2<f32>(bla.bx, bla.by), bla.ab_exp);
            let h2Ok = validity_is_neg_inf(log2Dc)
              || validity_next_up(log2B + log2Dc) < log2BlaEpsilon;
            if (h2Ok && bla.log2_min_a >= log2_mu) {
              let useF32 = bla_coefficients_fit_f32(bla, true);
              let aMantissa = vec2<f32>(bla.ax, bla.ay);
              let bMantissa = vec2<f32>(bla.bx, bla.by);
              var candidate = vec2<f32>(0.0);
              var padeReady = false;
              var invMF32 = vec2<f32>(0.0);
              var qMantissaF32 = vec2<f32>(0.0);
              var pdzFe = fe(vec2<f32>(0.0), FE_ZERO_E);
              var pdcFe = fe(vec2<f32>(0.0), FE_ZERO_E);
              var mzzFe = fe(vec2<f32>(0.0), 0);
              var mzcFe = fe(vec2<f32>(0.0), 0);
              if (useF32) {
                let a = ldexp(aMantissa, vec2<i32>(bla.ab_exp));
                let b = ldexp(bMantissa, vec2<i32>(bla.ab_exp));
                let d = ldexp(vec2<f32>(bla.dx, bla.dy), vec2<i32>(bla.d_exp));
                let m = vec2<f32>(1.0, 0.0) + cmul(d, *dz);
                if (bla_vec2_is_finite(m) && dot(m, m) >= PADE_POLE2) {
                  invMF32 = cinv(m);
                  candidate = cmul(cmul(a, *dz) + cmul(b, dc), invMF32);
                  // ∂Φ/∂z = (A − D\xb7B\xb7dc)/M\xb2. A and B share ab_exp,
                  // so the correction stays in their common mantissa scale.
                  qMantissaF32 = aMantissa - cmul(cmul(bMantissa, dc), d);
                  let invM2 = cmul(invMF32, invMF32);
                  pdzFe = fe_renorm(fe(cmul(qMantissaF32, invM2), bla.ab_exp));
                  pdcFe = fe_renorm(fe(cmul(bMantissa, invMF32), bla.ab_exp));
                  let dFe = fe_from_vec(d, 0);
                  mzzFe = fe_scale(fe_cmul(fe_cmul(dFe, pdzFe), fe_from_vec(invMF32, 0)), -2.0);
                  mzcFe = fe_scale(fe_cmul(fe_cmul(dFe, pdcFe), fe_from_vec(invMF32, 0)), -1.0);
                  padeReady = bla_vec2_is_finite(candidate)
                    && bla_vec2_is_finite(invMF32)
                    && bla_vec2_is_finite(qMantissaF32);
                }
              } else {
                // Large exponents are common even above DEEP_EXP. Evaluate the
                // products in floatexp instead of materializing Inf/0 in f32.
                let a = fe(aMantissa, bla.ab_exp);
                let b = fe(bMantissa, bla.ab_exp);
                let d = fe(vec2<f32>(bla.dx, bla.dy), bla.d_exp);
                let dzFe = fe_from_vec(*dz, 0);
                let dcFe = fe_from_vec(dc, 0);
                let m = fe_add(fe(vec2<f32>(1.0, 0.0), 0), fe_cmul(d, dzFe));
                if (fe_mag2_f32(m) >= PADE_POLE2) {
                  let invM = fe_cinv(m);
                  let num = fe_add(fe_cmul(a, dzFe), fe_cmul(b, dcFe));
                  let candidateFe = fe_cmul(num, invM);
                  candidate = fe_to_vec(candidateFe);
                  let bdcD = fe_cmul(fe_cmul(b, dcFe), d);
                  let q = fe_add(a, fe(-bdcD.m, bdcD.e));
                  pdzFe = fe_cmul(q, fe_cmul(invM, invM));
                  pdcFe = fe_cmul(b, invM);
                  mzzFe = fe_scale(fe_cmul(fe_cmul(d, pdzFe), invM), -2.0);
                  mzcFe = fe_scale(fe_cmul(fe_cmul(d, pdcFe), invM), -1.0);
                  padeReady = bla_vec2_is_finite(candidate)
                    && bla_vec2_is_finite(pdzFe.m)
                    && bla_vec2_is_finite(pdcFe.m);
                }
              }
              if (padeReady) {
                let candidateZ = getOrbit(*ref_i + skip) + candidate;
                // NaN compares false against bailout, so finiteness must be an
                // explicit fail-closed condition before accepting the block.
                if (bla_vec2_is_finite(candidateZ) && !(skip > 1 && dot(candidateZ, candidateZ) > bailout)) {
                  let derOld = *derM;
                  let derOldScale = *derS + *derSLo;
                  *dz = candidate;
                  *zOut = candidateZ;
                  snd_apply_map(pdzFe, mzzFe, mzcFe, fe(vec2<f32>(0.0), 0), derOld, derOldScale, snd, sndScale);
                  if (useF32) {
                    let invM2 = cmul(invMF32, invMF32);
                    *derM = cmul(cmul(qMantissaF32, invM2), *derM)
                      + cmul(bMantissa, invMF32) * (*derInvScale);
                    der_scale_add(derS, derSLo, f32(bla.ab_exp) * LN2);
                  } else {
                    *derM = cmul(*derM, pdzFe.m);
                    der_scale_add(derS, derSLo, f32(pdzFe.e) * LN2);
                    *derM = *derM + pdcFe.m * exp(clamp(f32(pdcFe.e) * LN2 - (*derS + *derSLo), -80.0, 80.0));
                  }
                  der_refresh_cache(derM, derS, derSLo, derInvScale, epsThreshold, logEpsilon);
                  // Form counter (mode 2 = Pad\xe9 [1/1]).
                  g_tierApps[1] += 1u;
                  g_appsF32 += select(0u, 1u, useF32);
                  g_workBudget += select(5u, 2u, useF32);
                  *ref_i += skip;
                  return skip;
                }
              }
            }
          } else {
            // ── affine BLA: z ← A\xb7z + B\xb7c ──
            let useF32 = bla_coefficients_fit_f32(bla, false);
            var candidate = vec2<f32>(0.0);
            if (useF32) {
              let a = ldexp(vec2<f32>(bla.ax, bla.ay), vec2<i32>(bla.ab_exp));
              let b = ldexp(vec2<f32>(bla.bx, bla.by), vec2<i32>(bla.ab_exp));
              candidate = cmul(a, *dz) + cmul(b, dc);
            } else {
              let a = fe(vec2<f32>(bla.ax, bla.ay), bla.ab_exp);
              let b = fe(vec2<f32>(bla.bx, bla.by), bla.ab_exp);
              candidate = fe_to_vec(fe_add(
                fe_cmul(a, fe_from_vec(*dz, 0)),
                fe_cmul(b, fe_from_vec(dc, 0)),
              ));
            }
            let candidateZ = getOrbit(*ref_i + skip) + candidate;
            if (bla_vec2_is_finite(candidate) && bla_vec2_is_finite(candidateZ)
                && !(skip > 1 && dot(candidateZ, candidateZ) > bailout)) {
              let derOld = *derM;
              let derOldScale = *derS + *derSLo;
              *dz = candidate;
              *zOut = candidateZ;
              snd_apply_map(
                fe(vec2<f32>(bla.ax, bla.ay), bla.ab_exp),
                fe(vec2<f32>(0.0), 0), fe(vec2<f32>(0.0), 0), fe(vec2<f32>(0.0), 0),
                derOld, derOldScale, snd, sndScale,
              );
              // Mantissa-only update + derS fold — see the Pad\xe9 branch note above.
              *derM = cmul(*derM, vec2<f32>(bla.ax, bla.ay)) + vec2<f32>(bla.bx, bla.by) * (*derInvScale);
              der_scale_add(derS, derSLo, f32(bla.ab_exp) * LN2);
              der_refresh_cache(derM, derS, derSLo, derInvScale, epsThreshold, logEpsilon);
              // Form counter (mode 1 = affine BLA).
              g_tierApps[0] += 1u;
              g_appsF32 += select(0u, 1u, useF32);
              g_workBudget += select(3u, 1u, useF32);
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
// Escaped layer 11 normally contains finite ln|z″| and layer 12 arg(z″).
// Positive marker = not tracked; SCALED_ZERO_S = tracked mathematical zero.
const INVALID_TAYLOR_PAYLOAD: f32 = 1e35;

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
  // Phase D (analytic AA, auto mode) — layers 9..12.
  //   in-progress: 9/10 = sndM.x/y, 11 = sndS for z″=sndM\xb7exp(sndS)
  //   escaped:     8 = S (derS at escape), 9/10 = derM.x/y (z′ mantissa),
  //                11 = ln|z″|, 12 = arg(z″) — the polar-log Taylor payload.
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
const TERMINAL_QUANTIZED_MAX: f32 = 16383.0;

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

fn terminal_orbit_metrics(stripeEma: f32, avgDir: vec2<f32>) -> f32 {
  let stripe = u32(round(stripe_phase_from_ema(stripeEma) * TERMINAL_QUANTIZED_MAX));
  let coherence = u32(round(clamp(length(avgDir), 0.0, 1.0) * TERMINAL_QUANTIZED_MAX));
  // A fixed high nibble keeps the carrier normal (never a flushable subnormal);
  // resolve masks the 28 payload bits back out exactly.
  return bitcast<f32>(0x30000000u | stripe | (coherence << 14u));
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
fn mandelbrot_compute(x0: f32, y0: f32, prev_iter: f32, prev_zx: f32, prev_zy: f32, prev_derx: f32, prev_dery: f32, prev_ders: f32, prev_ref_i: f32, prev_avg_direction: f32, prev_sndx: f32, prev_sndy: f32, prev_snds: f32, prev_snd_valid: f32) -> TexelOut {

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
  // Phase D: z″ = sndM\xb7exp(sndS), independently normalized from z′.
  var sndM = vec2<f32>(prev_sndx, prev_sndy);
  var sndS = prev_snds;
  // Layer 12 carries the resumable validity bit. Every selectable production
  // move preserves it; derivative-incomplete moves are rejected or disabled.
  var sndValid = prev_snd_valid >= 0.5;
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
    // Unified fast path: the rational tags are degree-1 in dc (same gate as
    // M\xf6bius); the JET tag reconstructs dc\xb2/dc\xb3 products, so its f32 branch
    // takes the jet-mode gate. The old "jet tag always evaluates in fe" rule
    // was a placeholder-band assumption — the form counters showed the jet
    // tag firing massively at f32-scale |dz| via the secours.
    let unifiedF32Ok = isUnified && dcMag > 1e-30;
    let unifiedJetF32Ok = isUnified && dcMag > 2.3e-13;
    // |dc| is invariant for this invocation and optional Auto headers already
    // need the conservative value. Keep it in a register for every later
    // dynamic block probe instead of recomputing two log2 operations per turn.
    var unifiedLog2Dc = 0.0;
    if (isUnified) {
      unifiedLog2Dc = validity_log2_complex_shallow(dc);
    }
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
    // \xa718 parabolic-gate state (unified tables ship the gate directory at
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
      let headerVersion = i32(mandelbrotJetRadii[perHdr + 2].v.w + 0.5);
      if (headerVersion == OPTIONAL_HEADER_VERSION
          && unifiedLog2Dc <= mandelbrotJetRadii[perHdr + 8].v.w) {
        perStart = i32(mandelbrotJetRadii[perHdr + 4].v.w);
        perP = i32(mandelbrotJetRadii[perHdr + 5].v.w);
        perR = mandelbrotJetRadii[perHdr + 6].v.w;
        if (perP > 0) {
          perNext = perStart;
          perStride = perP;
        }
      }
      let gCount = i32(mandelbrotJetRadii[perHdr + 10].v.x + 0.5);
      if (headerVersion == OPTIONAL_HEADER_VERSION
          && unifiedLog2Dc <= mandelbrotJetRadii[perHdr + 3].v.w
          && gCount > 0) {
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
      var renormApplied = false;
      // Renormalized Feigenbaum tier (f32 shallow path). Same contract as the
      // deep path: at a critical rebase (ref_i == 0) jump 2^n via the universal
      // model; no usedBla (the derivative is propagated, so the interior test
      // stays valid); backstop on globalMaxIter (the reference orbit at c_∞ is
      // bounded, so orbitComplete may never hold).
      if (ENABLE_RENORM && ref_i == 0) {
        let rskip = try_apply_renorm_f32(&dz, &derM, derS + derSLo, &sndM, &sndS, &i, globalMaxIterI, dcMag);
        if (rskip > 0) {
          renormApplied = true;
          z = refZ + dz; // ref_i = 0, refZ = getOrbit(0) = 0 → z = dz
          g_renormApps += 1u;
          g_renormIters += u32(rskip);
          if (prev_iter + i >= mandelbrot.globalMaxIter) { inside = true; break; }
        }
      }
      // \xa718 gate move: aligned in-span offsets only (integer modulo, in-span
      // turns are exactly the ones the ordinary loop crawls through). A
      // positive return already advanced ref_i/dz/derM by k\xb7m iterations.
      if (ENABLE_SECOND_ORDER_GATE && !renormApplied && gBase >= 0 && gFails < 3 && ref_i >= gStart && ref_i < gEnd
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
      if (renormApplied || gated) {
        // renorm or gate jump done — skip the block probe this turn
      } else if (isBlockTable) {
        // Global gate first (one log2 vs the table-wide bound), then convert dz
        // to floatexp for the shared evaluator (coefficient exponents exceed
        // f32 even shallow). Use length(), not dot(): |dz|\xb2 UNDERFLOWS f32 for
        // |dz| < ~1e-19 (routine at mid-deep shallow zooms) and a clamped
        // log2 would over-estimate |dz| and reject everything. When even
        // length() underflows, pass the gate — the fe-domain test inside
        // try_apply_jet/try_apply_mobius is exact.
        var unifiedLog2Dz = 0.0;
        var probeBlockTable = false;
        if (ENABLE_DYNAMIC_VALIDITY && isUnified) {
          unifiedLog2Dz = validity_log2_complex_shallow(dz);
          // Mode 7 is a legacy-output shadow referee and deliberately keeps
          // probing every legacy candidate. Production dynamic mode uses the
          // validity directory's max-candidate bound (never a cmax radius).
          probeBlockTable = mandelbrot.approximationMode >= 6.5
            || unifiedLog2Dz <= jetMaxR3;
        } else {
          let dzMag = length(dz);
          probeBlockTable = dzMag < 1.2e-38 || log2(dzMag) < jetMaxR3;
        }
        if (probeBlockTable) {
          var dzFe = fe_from_vec(dz, 0);
          if (isUnified) {
            skipped = try_apply_unified(&ref_i, &dzFe, &derM, &derS, &derSLo, &derInvScale, &epsThreshold, logEpsilon, &blaZ, dcFe, dcFe2, dcFe3, unifiedLog2Dc, unifiedLog2Dz, muLimit, skip0Log, globalMaxIterI, &jetLvlR3, dc, dcF2, dcF3, unifiedF32Ok, unifiedJetF32Ok, &jetLevelHint, &sndM, &sndS);
          } else if (isMobius) {
            skipped = try_apply_mobius(&ref_i, &dzFe, &derM, &derS, &derSLo, &derInvScale, &epsThreshold, logEpsilon, &blaZ, dcFe, muLimit, skip0Log, globalMaxIterI, &jetLvlR3, dc, mobiusF32Ok, &jetLevelHint, &sndM, &sndS);
          } else {
            skipped = try_apply_jet(&ref_i, &dzFe, &derM, &derS, &derSLo, &derInvScale, &epsThreshold, logEpsilon, &blaZ, dcFe, dcFe2, dcFe3, muLimit, skip0Log, globalMaxIterI, &jetLvlR3, dc, dcF2, dcF3, jetF32Ok, &jetLevelHint, &sndM, &sndS);
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
          skipped = try_apply_bla(&ref_i, &dz, &derM, &derS, &derSLo, &derInvScale, &epsThreshold, logEpsilon, &blaZ, dc, muLimit, skip0Log, globalMaxIterI, &sndM, &sndS);
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
      } else if (!renormApplied) {
        if (ENABLE_DYNAMIC_STATS && isUnified && ENABLE_DYNAMIC_VALIDITY) {
          g_dynamicExactFallbacks += 1u;
        }
        let zPrev = refZ + dz;
        dz = 2.0 * cmul(dz, refZ) + cmul(dz, dz) + dc;
        ref_i += 1;
        refZ = getOrbit(ref_i);
        z = refZ + dz;
        if (sndValid) {
          // z″ ← 2(z′\xb2 + z\xb7z″), using the OLD derivative state.
          snd_exact_step(derM, derS + derSLo, zPrev, &sndM, &sndS);
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
        escaped = true;
        break;
      }
      if (!usedBla && !IGNORE_EPSILON && derMM < epsThreshold) {
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
  } else {
    while (g_workBudget < u32(max_iteration) && ref_i < globalMaxIterI) {
      g_workSteps += 1u;
      g_workBudget += 1u;
      let zPrev = refZ + dz;
      dz = 2.0 * cmul(dz, refZ) + cmul(dz, dz) + dc;
      ref_i += 1;
      refZ = getOrbit(ref_i);
      z = refZ + dz;
      if (sndValid) {
        snd_exact_step(derM, derS + derSLo, zPrev, &sndM, &sndS);
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

      let derMM = dot(derM, derM);
      let dot_z = dot(z, z);
      if (dot_z > muLimit) {
        let derPolar = der_to_polar(derM, derS + derSLo);
        shadingHeight = distance_height(z, derPolar);
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
    out.genuine   = pack(0.0);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(0.0);
    out.dzy       = pack(0.0);
    out.ref_i     = pack(0.0);
    out.avgDirection = pack(0.0);
    out.derS      = pack(0.0); // finished — layer 8 dead
    return out;
  }

  let total_iter = prev_iter + i;

  if (escaped) {
    let escapeBlend = escape_fraction(z, muLimit);
    let smoothStripeEma = mix(previousStripeEma, stripeEma, escapeBlend);
    let previousAvgDir = previousAvgDirSum / max(previousAvgCount, 1.0);
    let smoothAvgDir = mix(previousAvgDir, avgDir, escapeBlend);

    let geometry = analytic_terminal_geometry(z, derM, derS + derSLo, sndM, sndS, 0);
    out.iter      = pack(total_iter);
    out.genuine   = pack(geometry.x);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(shadingHeight);
    out.dzy       = pack(geometry.y);
    out.ref_i     = pack(terminal_orbit_metrics(smoothStripeEma, smoothAvgDir));
    out.avgDirection = pack(geometry.z);
    // Phase D escaped payload: z′ keeps its normalized Cartesian form;
    // z″ becomes polar-log so its independent exponent cannot overflow.
    out.derS      = pack(derS + derSLo);
    out.aa9       = pack(derM.x);
    out.aa10      = pack(derM.y);
    let taylorPayloadValid = sndValid;
    let escapedSndLog = select(
      INVALID_TAYLOR_PAYLOAD,
      scaled_complex_log_length(sndM, sndS),
      taylorPayloadValid,
    );
    let escapedSndAngle = select(
      INVALID_TAYLOR_PAYLOAD,
      atan2(sndM.y, sndM.x),
      taylorPayloadValid,
    );
    out.aa11      = pack(escapedSndLog);
    out.aa12      = pack(escapedSndAngle);
    return out;
  }

  let globalMax = mandelbrot.globalMaxIter;

  if (total_iter >= globalMax && mandelbrot.orbitComplete >= 0.5) {
    out.iter      = pack(0.0);
    out.genuine   = pack(0.0);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(0.0);
    out.dzy       = pack(0.0);
    out.ref_i     = pack(0.0);
    out.avgDirection = pack(0.0);
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
  out.aa11      = pack(sndS);
  out.aa12      = pack(select(0.0, 1.0, sndValid));
  return out;
}

// ── deep (floatexp) perturbation ──────────────────────────────────
// Exact perturbation with dz/dc in extended-exponent form, for scale below the
// deep threshold. Mirrors mandelbrot.wgsl's mandelbrot_compute_deep but returns
// TexelOut. dz, dc are fe; z_n stays O(1) f32; der reuses the shallow machinery;
// the resumable dz is parked as (mantissa in zx/zy, exponent in avgDirection),
// so orbit-direction metrics are unavailable on the deep path.
// BLA in the deep (floatexp) path — see mandelbrot.wgsl for the derivation.
fn try_apply_bla_deep(ref_i: ptr<function, i32>, dz: ptr<function, fe>, derM: ptr<function, vec2<f32>>, derS: ptr<function, f32>, derSLo: ptr<function, f32>, derInvScale: ptr<function, f32>, epsThreshold: ptr<function, f32>, logEpsilon: f32, zOut: ptr<function, vec2<f32>>, dc: fe, bailout: f32, skip0Log: i32, maxIterI: i32, snd: ptr<function, vec2<f32>>, sndScale: ptr<function, f32>) -> i32 {
  if (*ref_i <= 0) {
    return 0;
  }
  let log2_dz = validity_log2_complex_floatexp(*dz);
  let log2_dc = validity_log2_complex_floatexp(dc);
  let log2_bla_epsilon = validity_next_down(log2(max(mandelbrot.blaEpsilon, 1e-30)));
  // (G) near-critical guard threshold in log2: min_k log2|2Z_k| ≥ log2(mu),
  // mu = √(|c|/ε).
  let log2_mu = 0.5 * (log2_dc - log2_bla_epsilon);
  let shiftedRef = *ref_i - 1;
  var level = min(i32(mandelbrot.blaLevelCount) - 1, i32(countTrailingZeros(u32(shiftedRef))) - skip0Log);
  while (level >= 0) {
    let levelInfo = mandelbrotBlaLevels[level];
    let skip = i32(levelInfo.skip);
    if (*ref_i + skip <= maxIterI) {
      let slot = shiftedRef >> u32(skip0Log + level);
      if (u32(slot) < levelInfo.count) {
        let bla = mandelbrotBlaSuite[i32(levelInfo.offset) + slot];
        let radiusLog2 = bla_affine_radius_log2(bla, log2_dc);
        if (!validity_is_neg_inf(radiusLog2) && log2_dz <= radiusLog2) {
          let a = fe(vec2<f32>(bla.ax, bla.ay), bla.ab_exp);
          let b = fe(vec2<f32>(bla.bx, bla.by), bla.ab_exp);
          let num = fe_add(fe_cmul(a, *dz), fe_cmul(b, dc));
          if (mandelbrot.approximationMode >= 1.5) {
              // ── Pad\xe9 [1/1] in floatexp: dz ← num/(1 + D\xb7dz) ──
              let d = fe(vec2<f32>(bla.dx, bla.dy), bla.d_exp);
              let m = fe_add(fe(vec2<f32>(1.0, 0.0), 0), fe_cmul(d, *dz));   // 1 + D\xb7dz
              // (H2) c-truncation bound in log space (|B|\xb7|c| < ε) + (G)
              // near-critical guard (min |2Z_k| ≥ mu) + pole guard.
              let log2_b = validity_log2_complex(b.m, b.e);
              let h2Ok = validity_is_neg_inf(log2_dc)
                || validity_next_up(log2_b + log2_dc) < log2_bla_epsilon;
              if (h2Ok && bla.log2_min_a >= log2_mu && fe_mag2_f32(m) >= PADE_POLE2) {
                let invM = fe_cinv(m);
                let candidate = fe_cmul(num, invM);
                let candidateZ = getOrbit(*ref_i + skip) + fe_to_vec(candidate);
                if (bla_vec2_is_finite(candidate.m) && bla_vec2_is_finite(candidateZ)
                    && !(skip > 1 && dot(candidateZ, candidateZ) > bailout)) {
                  let derOld = *derM;
                  let derOldScale = *derS + *derSLo;
                  *dz = candidate;
                  *zOut = candidateZ;
                  // D4: ∂Φ/∂z = (A − D\xb7B\xb7dc)/M\xb2, ∂Φ/∂c = B/M.
                  let bdcD = fe_cmul(fe_cmul(b, dc), d);
                  let q = fe_add(a, fe(-bdcD.m, bdcD.e));
                  let qOverM2 = fe_cmul(q, fe_cmul(invM, invM));
                  let bOverM = fe_cmul(b, invM);                   // B/M
                  let mzz = fe_scale(fe_cmul(fe_cmul(d, qOverM2), invM), -2.0);
                  let mzc = fe_scale(fe_cmul(fe_cmul(d, bOverM), invM), -1.0);
                  snd_apply_map(qOverM2, mzz, mzc, fe(vec2<f32>(0.0), 0), derOld, derOldScale, snd, sndScale);
                  *derM = cmul(*derM, qOverM2.m);
                  der_scale_add(derS, derSLo, f32(qOverM2.e) * LN2);
                  *derM = *derM + bOverM.m * exp(clamp(f32(bOverM.e) * LN2 - (*derS + *derSLo), -80.0, 80.0));
                  der_refresh_cache(derM, derS, derSLo, derInvScale, epsThreshold, logEpsilon);
                  // Form counter (mode 2 = Pad\xe9 [1/1], deep = fe).
                  g_tierApps[1] += 1u;
                  g_workBudget += 5u;
                  *ref_i += skip;
                  return skip;
                }
              }
          } else {
              // ── affine: dz ← A\xb7dz + B\xb7dc ──
              let candidateZ = getOrbit(*ref_i + skip) + fe_to_vec(num);
              if (bla_vec2_is_finite(num.m) && bla_vec2_is_finite(candidateZ)
                  && !(skip > 1 && dot(candidateZ, candidateZ) > bailout)) {
                let derOld = *derM;
                let derOldScale = *derS + *derSLo;
                *dz = num;
                *zOut = candidateZ;
                snd_apply_map(a, fe(vec2<f32>(0.0), 0), fe(vec2<f32>(0.0), 0), fe(vec2<f32>(0.0), 0), derOld, derOldScale, snd, sndScale);
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
fn jet_apply(entry: i32, k: i32, dz: fe, dc: fe, dc2: fe, dc3: fe, pdz: ptr<function, fe>, pdc: ptr<function, fe>, mzz: ptr<function, fe>, mzc: ptr<function, fe>, mcc: ptr<function, fe>) -> fe {
  let a10 = jet_coeff_fe(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 0]);
  let a01 = jet_coeff_fe(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 1]);
  var p0 = fe_cmul(a01, dc);
  var p1 = a10;
  var q0 = a01;
  if (k < 2) {
    *pdz = p1;
    *pdc = q0;
    *mzz = fe(vec2<f32>(0.0), 0);
    *mzc = fe(vec2<f32>(0.0), 0);
    *mcc = fe(vec2<f32>(0.0), 0);
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
    *mzz = fe_scale(p2, 2.0);
    *mzc = q1;
    *mcc = fe_scale(a02, 2.0);
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
  *mzz = fe_add(fe_scale(p2, 2.0), fe_scale(fe_cmul(p3, dz), 6.0));
  *mzc = fe_add(q1, fe_scale(fe_cmul(q2, dz), 2.0));
  *mcc = fe_add3(fe_scale(a02, 2.0), fe_scale(fe_cmul(a03, dc), 6.0), fe_scale(fe_cmul(a12, dz), 2.0));
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
fn jet_apply_f32(entry: i32, k: i32, dz: vec2<f32>, dc: vec2<f32>, dc2: vec2<f32>, dc3: vec2<f32>, pdz: ptr<function, vec2<f32>>, pdc: ptr<function, vec2<f32>>, mzz: ptr<function, vec2<f32>>, mzc: ptr<function, vec2<f32>>, mcc: ptr<function, vec2<f32>>) -> vec2<f32> {
  let a10 = jet_coeff_f32(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 0]);
  let a01 = jet_coeff_f32(mandelbrotJetSuite[entry * JET_COEFF_STRIDE + 1]);
  var p0 = cmul(a01, dc);
  var p1 = a10;
  var q0 = a01;
  if (k < 2) {
    *pdz = p1;
    *pdc = q0;
    *mzz = vec2<f32>(0.0);
    *mzc = vec2<f32>(0.0);
    *mcc = vec2<f32>(0.0);
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
    *mzz = 2.0 * p2;
    *mzc = q1;
    *mcc = 2.0 * a02;
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
  *mzz = 2.0 * p2 + 6.0 * cmul(p3, dz);
  *mzc = q1 + 2.0 * cmul(q2, dz);
  *mcc = 2.0 * a02 + 6.0 * cmul(a03, dc) + 2.0 * cmul(a12, dz);
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
fn try_apply_jet(ref_i: ptr<function, i32>, dz: ptr<function, fe>, derM: ptr<function, vec2<f32>>, derS: ptr<function, f32>, derSLo: ptr<function, f32>, derInvScale: ptr<function, f32>, epsThreshold: ptr<function, f32>, logEpsilon: f32, zOut: ptr<function, vec2<f32>>, dc: fe, dc2: fe, dc3: fe, bailout: f32, skip0Log: i32, maxIterI: i32, lvlR3: ptr<function, array<f32, JET_MAX_LEVELS>>, dcF: vec2<f32>, dcF2: vec2<f32>, dcF3: vec2<f32>, f32Ok: bool, hint: ptr<function, i32>, snd: ptr<function, vec2<f32>>, sndScale: ptr<function, f32>) -> i32 {
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
          var mzz: fe;
          var mzc: fe;
          var mcc: fe;
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
            var mzzF = vec2<f32>(0.0);
            var mzcF = vec2<f32>(0.0);
            var mccF = vec2<f32>(0.0);
            let phiF = jet_apply_f32(entry, k, fe_to_vec(*dz), dcF, dcF2, dcF3, &pdzF, &pdcF, &mzzF, &mzcF, &mccF);
            phi = fe_from_vec(phiF, 0);
            pdz = fe_from_vec(pdzF, 0);
            pdc = fe_from_vec(pdcF, 0);
            mzz = fe_from_vec(mzzF, 0);
            mzc = fe_from_vec(mzcF, 0);
            mcc = fe_from_vec(mccF, 0);
          } else {
            phi = jet_apply(entry, k, *dz, dc, dc2, dc3, &pdz, &pdc, &mzz, &mzc, &mcc);
          }
          let candidateZ = getOrbit(*ref_i + skip) + fe_to_vec(phi);
          // Do not jump over the first escape (same rule as the BLA paths).
          if (!(skip > 1 && dot(candidateZ, candidateZ) > bailout)) {
            let derOld = *derM;
            let derOldScale = *derS + *derSLo;
            *dz = phi;
            *zOut = candidateZ;
            snd_apply_map(pdz, mzz, mzc, mcc, derOld, derOldScale, snd, sndScale);
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

// ── M\xf6bius-c+ block application (add-mobius-cplus) ──────────────────
// m(z, c) = ((A + A'\xb7c)\xb7z + B\xb7c) / (1 + (D + D'\xb7c)\xb7z + F\xb7c): the Pad\xe9 vehicle
// plus three c-coefficients that annihilate the zc/z\xb2c cross-terms guard (G)
// exists for and the pure-c\xb2 term (F resums the pure-c channel — the shallow
// cmax_c2 bind), plus the N₂ numerator slot (round 7, [2/1]: D = −c₃₀/c₂₀
// resums the z-channel pole — the \xa714 superconvergence). ONE validity
// comparison log2|dz| < r per probed block — no H2, no min_a, no beta\xb7dcMag,
// no separate pole test (DEN > 0.5 is folded into the certified radius).
// Records live in the jet coefficient buffer at stride 7 (order A, B, A', D,
// D', F, N₂), radii in the same vec4 sidecar (x = r, y = the f32-safe
// fast-path flag).

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
fn try_apply_mobius(ref_i: ptr<function, i32>, dz: ptr<function, fe>, derM: ptr<function, vec2<f32>>, derS: ptr<function, f32>, derSLo: ptr<function, f32>, derInvScale: ptr<function, f32>, epsThreshold: ptr<function, f32>, logEpsilon: f32, zOut: ptr<function, vec2<f32>>, dc: fe, bailout: f32, skip0Log: i32, maxIterI: i32, lvlR: ptr<function, array<f32, JET_MAX_LEVELS>>, dcF: vec2<f32>, f32Ok: bool, hint: ptr<function, i32>, snd: ptr<function, vec2<f32>>, sndScale: ptr<function, f32>) -> i32 {
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
          var mzz: fe;
          var mzc: fe;
          var mcc: fe;
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
            let ae = ca + cmul(cap, dcF);       // Ae = A + A'\xb7dc
            let de = cd + cmul(cdp, dcF);       // De = D + D'\xb7dc
            let n2z = cmul(cn2, dzF);           // N₂\xb7dz
            let den = vec2<f32>(1.0, 0.0) + cmul(de, dzF) + cmul(cf, dcF);
            if (MOBIUS_PARANOIA_GUARD && dot(den, den) < MOBIUS_DEN_GUARD2) {
              denOk = false;
            } else {
              let invDen = cinv(den);
              let phiF = cmul(cmul(n2z + ae, dzF) + cmul(cb, dcF), invDen);
              phi = fe_from_vec(phiF, 0);
              // ∂m/∂z = (2N₂\xb7z + Ae − m\xb7De)/den ;
              // ∂m/∂c = (A'\xb7z + B − m\xb7(D'\xb7z + F))/den
              let mzF = cmul(2.0 * n2z + ae - cmul(phiF, de), invDen);
              let dcdenF = cmul(cdp, dzF) + cf;
              let mcF = cmul(cmul(cap, dzF) + cb - cmul(phiF, dcdenF), invDen);
              pdz = fe_from_vec(mzF, 0);
              pdc = fe_from_vec(mcF, 0);
              mzz = fe_from_vec(2.0 * cmul(cn2 - cmul(de, mzF), invDen), 0);
              mcc = fe_from_vec(-2.0 * cmul(dcdenF, cmul(mcF, invDen)), 0);
              mzc = fe_from_vec(
                cmul(cap - cmul(mcF, de) - cmul(phiF, cdp), invDen)
                  - cmul(mzF, cmul(dcdenF, invDen)),
                0,
              );
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
              let dcden = fe_add(fe_cmul(cdp, *dz), cf);
              pdc = fe_cmul(fe_add3(fe_cmul(cap, *dz), cb, fe_neg(fe_cmul(phi, dcden))), invDen);
              mzz = fe_scale(fe_cmul(fe_add(cn2, fe_neg(fe_cmul(de, pdz))), invDen), 2.0);
              mcc = fe_neg(fe_scale(fe_cmul(dcden, fe_cmul(pdc, invDen)), 2.0));
              mzc = fe_add(
                fe_cmul(fe_add3(cap, fe_neg(fe_cmul(pdc, de)), fe_neg(fe_cmul(phi, cdp))), invDen),
                fe_neg(fe_cmul(pdz, fe_cmul(dcden, invDen))),
              );
            }
          }
          if (denOk) {
            let candidateZ = getOrbit(*ref_i + skip) + fe_to_vec(phi);
            // Do not jump over the first escape (same rule as the BLA paths).
            if (!(skip > 1 && dot(candidateZ, candidateZ) > bailout)) {
              let derOld = *derM;
              let derOldScale = *derS + *derSLo;
              *dz = phi;
              *zOut = candidateZ;
              snd_apply_map(pdz, mzz, mzc, mcc, derOld, derOldScale, snd, sndScale);
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
              // Form counter (mode 4 = M\xf6bius-c⁺ [2/1]; f32 when the fast
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
// z = f32_safe + 2\xb7secours_tag packed, w = SECOURS tier's radius, −∞ ⇒ no
// fallback), then a TIER-DIRECTED prefix read of the 9-slot [2/1] record
// [A, B, D, N₂, A', D', F, a12, a03]: affine reads 2 slots, Pad\xe9 4 (the plain
// [2/1]), c+ 7, jet all 9 (reconstructing a20 = N₂ − D\xb7A,
// a11 = A' − B\xb7D − F\xb7A, a21 = −D'\xb7A − D\xb7a11 − F\xb7a20, a02 = −F\xb7B and
// a30 = −D\xb7a20 in registers — the verified identities). Portfolio rule
// (plan \xa78): when |dz| exceeds the cheap principal's radius but fits the
// secours' (the largest-radius tier), apply the secours AT THE SAME LEVEL
// instead of descending — same record, one extra compare. The candidate PAIR
// is a block property (warp-uniform); which of the two fires depends on the
// per-thread |dz|, exactly like the pre-existing radius test. Rational tags
// (0-2) get the plain-f32 fast path; the jet tag always evaluates in fe (deep
// is where it fires).
fn try_apply_unified(ref_i: ptr<function, i32>, dz: ptr<function, fe>, derM: ptr<function, vec2<f32>>, derS: ptr<function, f32>, derSLo: ptr<function, f32>, derInvScale: ptr<function, f32>, epsThreshold: ptr<function, f32>, logEpsilon: f32, zOut: ptr<function, vec2<f32>>, dc: fe, dc2: fe, dc3: fe, dynamicLog2Dc: f32, dynamicLog2Dz: f32, bailout: f32, skip0Log: i32, maxIterI: i32, lvlR: ptr<function, array<f32, JET_MAX_LEVELS>>, dcF: vec2<f32>, dcF2: vec2<f32>, dcF3: vec2<f32>, f32Ok: bool, f32OkJet: bool, hint: ptr<function, i32>, snd: ptr<function, vec2<f32>>, sndScale: ptr<function, f32>) -> i32 {
  if (*ref_i <= 0) {
    return 0;
  }
  let dynamicValidity = ENABLE_DYNAMIC_VALIDITY;
  // Mode 7 is the rollout referee: packed certificates are evaluated and
  // counted, while the applied tag/radius remains the legacy replay choice.
  let dynamicShadow = ENABLE_DYNAMIC_VALIDITY && mandelbrot.approximationMode >= 6.5;
  var log2_dz = dynamicLog2Dz;
  if (!dynamicValidity) {
    log2_dz = log2(max(length((*dz).m), 1e-30)) + f32((*dz).e);
  }
  let shiftedRef = *ref_i - 1;
  var level = min(min(i32(mandelbrot.blaLevelCount), JET_MAX_LEVELS) - 1, i32(countTrailingZeros(u32(shiftedRef))) - skip0Log);
  level = min(level, *hint + JET_LEVEL_HINT_UP);
  var shadowDecisionResolved = false;
  while (level >= 0) {
    let skip = i32(1u << u32(skip0Log + level));
    let withinLevelRadius = select(
      log2_dz < (*lvlR)[level],
      dynamicLog2Dz <= (*lvlR)[level],
      dynamicValidity,
    );
    if ((dynamicShadow || withinLevelRadius) && *ref_i + skip <= maxIterI) {


      let levelInfo = mandelbrotJetLevels[level];
      let slot = shiftedRef >> u32(skip0Log + level);
      if (u32(slot) < levelInfo.count) {
        let entry = i32(levelInfo.offset) + slot;
        // The legacy vec4 remains bound for rollback/shadowing. Dynamic mode
        // uses only its orbit-static f32-safe bit; tier validity comes from the
        // packed proof before any coefficient prefix is fetched.
        let radii = mandelbrotJetRadii[entry].v;
        var sndTag = floor(radii.z * 0.5);
        var safeFlag = radii.z - 2.0 * sndTag;
        var dynamicSummaryReject = false;
        var dynamicAffineFastAccept = false;
        if (dynamicValidity && ENABLE_RADIAL_VALIDITY) {
          // Radial-v3 sidecar: y/w are per-block maxima across the intrinsic
          // Affine/Pad\xe9/c+/Jet certificates, and z is the coefficient f32-safe
          // bit. This is only a rejection prefilter; the accepting tier always
          // comes from the 21-word two-candidate certificate.
          sndTag = 0.0;
          safeFlag = radii.z;
          let intrinsicCapReject = dynamicLog2Dc > radii.y;
          let radiusReject = dynamicLog2Dz > radii.w;
          dynamicSummaryReject = intrinsicCapReject || radiusReject;
          g_workBudget += 1u;
          if (ENABLE_DYNAMIC_STATS && dynamicSummaryReject) {
            // The sidecar proves only that every intrinsic candidate rejects;
            // it does not identify which candidate/tier proof was limiting.
            // Keep the attribution honest and leave detailed causes to the
            // full 21-word certificate evaluator.
            g_dynamicRejects[VALIDITY_REJECT_SUMMARY] += 1u;
          }
        } else if (dynamicValidity && radii.z < 0.0) {
          // Incremental tables reuse the dormant legacy sidecar fields as an
          // optimistic any-tier summary. A rejection here proves every packed
          // tier rejects and avoids the 96-byte envelope fetch entirely. The
          // low bits of x encode slope + f32 safety; z<0 is both the dynamic
          // marker and a domain-wide affine lower bound.
          let summaryBits = bitcast<u32>(radii.x);
          var summaryIntercept = radii.x;
          sndTag = 0.0;
          safeFlag = 0.0;
          if (!validity_is_neg_inf(radii.x) && !validity_is_pos_inf(radii.x)) {
            let summaryCode = summaryBits & 7u;
            summaryIntercept = bitcast<f32>(summaryBits & 0xfffffff8u);
            sndTag = f32(summaryCode >> 1u);
            safeFlag = f32(summaryCode & 1u);
          }
          let summaryLineRadius = summaryIntercept
            + VALIDITY_SLOPES[u32(sndTag)] * dynamicLog2Dc;
          let summaryDomainReject = dynamicLog2Dc > radii.y;
          let summaryCandidateReject = dynamicLog2Dz > radii.w;
          let summaryLineReject = dynamicLog2Dz > summaryLineRadius;
          dynamicSummaryReject = summaryDomainReject
            || summaryCandidateReject
            || summaryLineReject;
          dynamicAffineFastAccept = !dynamicSummaryReject
            && dynamicLog2Dz <= radii.z;
          // A rejected summary replaces four two-vec4 tier probes in the live
          // path. Preserve their budget weight even though that work was
          // skipped. Validation/shadow still opens the packed proof below, so
          // its real probes account for their own cost.
          g_workBudget += select(0u, 8u, dynamicSummaryReject && !dynamicShadow);
          if (ENABLE_DYNAMIC_STATS) {
            // The summary deliberately avoids the packed proof and its
            // diagnostics. Count one mutually-exclusive prefilter rejection;
            // attributing its component tests to value/reference/Cauchy made
            // the panel claim provenance the shader had not actually read.
            g_dynamicRejects[VALIDITY_REJECT_SUMMARY] += select(0u, 1u, dynamicSummaryReject);
          }
        }
        var useSnd = false;
        var tag = -1;
        var dynamicTag = select(-1, 0, dynamicAffineFastAccept);
        if (dynamicAffineFastAccept) {
          g_workBudget += 2u;
          if (ENABLE_DYNAMIC_STATS) {
            g_dynamicTierAttempts[0] += 1u;
            g_dynamicTierAccepts[0] += 1u;
          }
        }
        // Validation/shadow deliberately opens the packed proof and diagnostic
        // sidecar even when the live prefilter would reject. This makes the six
        // named causes observable without taxing the active dynamic path.
        if (dynamicValidity && (!dynamicSummaryReject || dynamicShadow) && !dynamicAffineFastAccept
            && (!dynamicShadow || !shadowDecisionResolved)) {
          // Fixed cheapest-first tier order at this (largest aligned) skip.
          for (var tier = 0u; tier < 4u; tier++) {
            // Packed-proof probes are real GPU work (two vec4 reads plus four
            // line evaluations). Charge them to the per-dispatch budget so
            // the time controller does not size dynamic batches as if a
            // rejected four-tier descent cost the same as one exact step.
            g_workBudget += 2u;
            if (ENABLE_DYNAMIC_STATS) {
              g_dynamicTierAttempts[0] += select(0u, 1u, tier == 0u);
              g_dynamicTierAttempts[1] += select(0u, 1u, tier == 1u);
              g_dynamicTierAttempts[2] += select(0u, 1u, tier == 2u);
              g_dynamicTierAttempts[3] += select(0u, 1u, tier == 3u);
            }
            var validity: DynamicValidityEvaluation;
            if (ENABLE_RADIAL_VALIDITY) {
              validity = evaluate_radial_validity_logs(
                u32(entry), tier, dynamicLog2Dc, dynamicLog2Dz,
              );
            } else {
              validity = evaluate_dynamic_validity_logs(
                u32(entry), tier, dynamicLog2Dc, dynamicLog2Dz, dynamicShadow,
              );
            }
            if (validity.accepts) {
              if (ENABLE_DYNAMIC_STATS) {
                g_dynamicTierAccepts[0] += select(0u, 1u, tier == 0u);
                g_dynamicTierAccepts[1] += select(0u, 1u, tier == 1u);
                g_dynamicTierAccepts[2] += select(0u, 1u, tier == 2u);
                g_dynamicTierAccepts[3] += select(0u, 1u, tier == 3u);
                g_dynamicCandidateUses += select(0u, 1u, validity.candidateLimited);
              }
              dynamicTag = i32(tier);
              if (dynamicShadow) {
                shadowDecisionResolved = true;
                if (ENABLE_DYNAMIC_STATS) {
                  g_dynamicSkipBuckets[0] += select(0u, 1u, skip < 16);
                  g_dynamicSkipBuckets[1] += select(0u, 1u, skip >= 16 && skip < 256);
                  g_dynamicSkipBuckets[2] += select(0u, 1u, skip >= 256 && skip < 4096);
                  g_dynamicSkipBuckets[3] += select(0u, 1u, skip >= 4096);
                }
              }
              break;
            }
            if (ENABLE_DYNAMIC_STATS && validity.rejectionReason < VALIDITY_REJECT_NONE) {
              g_dynamicRejects[validity.rejectionReason] += 1u;
            }
          }
        }
        if (dynamicShadow || !dynamicValidity) {
          // Legacy principal/secours portfolio, retained as rollback referee.
          useSnd = ENABLE_PORTFOLIO && log2_dz >= radii.x;
          if (log2_dz < select(radii.x, max(radii.x, radii.w), ENABLE_PORTFOLIO)) {
            tag = i32(select(radii.y, sndTag, useSnd) + 0.5);
          }
        } else {
          tag = dynamicTag;
        }
        if (tag >= 0) {
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
              // [2/1] F-form: num = (N₂\xb7dz + Ae)\xb7dz + B\xb7dc;
              // den = 1 + De\xb7dz + F\xb7dc; ∂den/∂c = D′\xb7dz + F.
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
                // m_zz = 2\xb7(N₂ − De\xb7m_z)/den ; m_cc = −2\xb7(D′\xb7z + F)\xb7m_c/den ;
                // m_zc = (A′ − m_c\xb7De − φ\xb7D′)/den − m_z\xb7(D′\xb7z + F)/den.
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
              // order-3 Horner rows as the fe branch below (a20 = N₂ − D\xb7A,
              // a11 = A′ − B\xb7D − F\xb7A, a21 = −D′\xb7A − D\xb7a11 − F\xb7a20,
              // a02 = −F\xb7B, a30 = −D\xb7a20); the safe flag certifies every
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
              // [2/1] F-form: num = (N₂\xb7dz + Ae)\xb7dz + B\xb7dc;
              // den = 1 + De\xb7dz + F\xb7dc; ∂den/∂c = D′\xb7dz + F.
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
                // m_zz = 2\xb7(N₂ − De\xb7m_z)/den.
                mzz = fe_scale(fe_cmul(fe_add(cn2, fe_neg(fe_cmul(de, pdz))), invDen), 2.0);
                mcc = fe_neg(fe_scale(fe_cmul(dcden, fe_cmul(pdc, invDen)), 2.0));
                mzc = fe_add(
                  fe_cmul(fe_add3(cap, fe_neg(fe_cmul(pdc, de)), fe_neg(fe_cmul(phi, cdp))), invDen),
                  fe_neg(fe_cmul(pdz, fe_cmul(dcden, invDen))),
                );
              }
            } else {
              // Jet tier: full 108 B record, [2/1] F-form identity
              // reconstruction (a20 = N₂ − D\xb7A, a11 = A′ − B\xb7D − F\xb7A,
              // a21 = −D′\xb7A − D\xb7a11 − F\xb7a20, a02 = −F\xb7B, a30 = −D\xb7a20),
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
              if (ENABLE_DYNAMIC_STATS && dynamicValidity && !dynamicShadow) {
                g_dynamicSkipBuckets[0] += select(0u, 1u, skip < 16);
                g_dynamicSkipBuckets[1] += select(0u, 1u, skip >= 16 && skip < 256);
                g_dynamicSkipBuckets[2] += select(0u, 1u, skip >= 256 && skip < 4096);
                g_dynamicSkipBuckets[3] += select(0u, 1u, skip >= 4096);
              }
              // Portfolio observability: a secours hit is a descent avoided;
              // the covered iterations are the A/B payoff signal.
              g_secoursApps += select(0u, 1u, useSnd);
              g_secoursIters += select(0u, u32(skip), useSnd);
              g_appsF32 += select(0u, 1u, usedF32);
              // Batch weight: the turn's base 1 is already counted; add the
              // form surcharge (fe evaluation ≈ \xd72 the f32 path).
              var wx = select(0u, 1u, tag == 0)
                     + select(0u, 2u, tag == 1)
                     + select(0u, 3u, tag == 2)
                     + select(0u, 4u, tag == 3);
              wx += select(0u, wx + 1u, !usedF32);
              g_workBudget += wx;
              // Phase D: keep z″ on its own logarithmic scale. A shared 2\xb7S
              // scale cannot represent both z′ and z″ when a deep block moves
              // their relative exponent by hundreds of bits; clamping that
              // difference made the otherwise finite payload fail before the
              // Taylor gate. Each chain-rule term is normalized independently
              // and only shifted down to the largest term for the sum.
              let sOld = *derS + *derSLo;
              let derOld = *derM;
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
              // z″_new = m_z\xb7z″ + m_zz\xb7z′\xb2 + 2\xb7m_zc\xb7z′ + m_cc.
              let t1 = scaled_complex_normalize(
                cmul(pdz.m, *snd),
                f32(pdz.e) * LN2 + *sndScale,
              );
              let t2 = scaled_complex_normalize(
                cmul(mzz.m, cmul(derOld, derOld)),
                f32(mzz.e) * LN2 + 2.0 * sOld,
              );
              let t3 = scaled_complex_normalize(
                2.0 * cmul(mzc.m, derOld),
                f32(mzc.e) * LN2 + sOld,
              );
              let t4 = scaled_complex_normalize(mcc.m, f32(mcc.e) * LN2);
              let sndNext = scaled_complex_add4(t1, t2, t3, t4);
              *snd = sndNext.m;
              *sndScale = sndNext.s;
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
// Certified interiority attempt at a periodic phase point.  This is the
// scalar disk certificate proved by PeriodicRuntime.lean for the fixed
// period map m(δ) = (Ae\xb7δ + Bc)/(De\xb7δ + K), K = 1 + F\xb7c:
//   μ     = |K| - |De|\xb7r                                      > 0
//   image = (|Ae|\xb7r + |Bc|) / μ
//   image + err_block                                             < r
// Together with |δ| < r, the first two tests prove that the exact period-block
// orbit remains in the disk.  Uniform contraction is stronger than needed for
// this binary interior verdict and no longer rejects a valid invariant disk.
// A direct-majorant header (F.w == 1) has already proved exact invariance for
// every |dc| in the view and needs only the entry-radius comparison here.
fn try_periodic_interior(hdrBase: i32, dz: fe, dc: fe, rLog2: f32) -> bool {
  let log2_dz = log2(max(length(dz.m), 1e-30)) + f32(dz.e);
  if (!(log2_dz < rLog2)) {
    return false;
  }
  let hF = mandelbrotJetRadii[hdrBase + 9].v;
  if (hF.w > 0.5) {
    return true;
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
  let cF = fe(vec2<f32>(hF.x, hF.y), i32(hF.z));
  let ae = fe_add(cA, fe_cmul(cAp, dc));
  let de = fe_add(cD, fe_cmul(cDp, dc));
  let bc = fe_cmul(cB, dc);
  let one = fe(vec2<f32>(1.0, 0.0), 0);
  let onePlusFc = fe_add(one, fe_cmul(cF, dc));

  let l2K = log2(max(length(onePlusFc.m), 1e-30)) + f32(onePlusFc.e);
  let l2De = log2(max(length(de.m), 1e-30)) + f32(de.e);
  let deROverK = exp2(l2De + rLog2 - l2K);
  if (!(deROverK < 0.98)) {
    return false; // no safely positive denominator margin μ
  }
  let l2Mu = l2K + log2(1.0 - deROverK);

  let l2Ae = log2(max(length(ae.m), 1e-30)) + f32(ae.e);
  let l2Bc = log2(max(length(bc.m), 1e-30)) + f32(bc.e);
  let imageOverR = exp2(l2Ae - l2Mu)
                 + exp2(l2Bc - l2Mu - rLog2);
  let errOverR = exp2(hAp.w); // serialized \xbd\xb7ε_int\xb7(|A| + |B|\xb7c_max/r)
  if (!(imageOverR + errOverR < 0.98)) {
    return false; // exact block does not map the disk strictly inside itself
  }

  return true;
}

// ── \xa718 parabolic Fatou gates (gates.rs runtime, shallow f32 path) ────────────
// Sidecar layout after the 10-entry SA/periodic header: entry [hdr+10] is the
// gate directory (x = count, 0 when none — always shipped by unified tables),
// gate 0's record at [hdr+11]:
//   E0 (start, len, p, q) \xb7 E1 (r_entry, r_dc, nfar, dRel) \xb7 E2 eps bands \xb7
//   per phase: β-tail 2 complexes, 8\xd73 P-coefficient Taylor complexes, nfar
//   far-root seeds (each complex (x\xb72^e, y\xb72^e) packed (x, y, e, \xb7)) \xb7
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

// Returns k\xb7m (> 0, iterations advanced; ref_i/dz/derM updated), 0 when the
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
  // principal-branch increment; |Δu| ≤ 0.2\xb7distance-to-nearest-pole keeps
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
    // |Δu| ≤ 0.35\xb7droot ≪ |u − r_far| is (Δu)/(u−r) to second order — one
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
      // f32 exit: |step| ≲ 3e-6\xb7|un| (the f64 CPU tolerance would spin at
      // \xb11 ulp forever here).
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
  // Certified budget: accumulated phase error \xd7 the value conversion at the
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

// ── Renormalized Feigenbaum return tier: fe (deep) path ─────────────────
// Constants (RENORM_H_A, radius, levels) and the f32 path are declared above
// getOrbit's neighbours, before the shallow kernel. The fe variants below are
// used by the deep kernel where dz falls below the f32 normal range.
struct RenormEval { value: fe, deriv: fe, second: fe };

// (h(x), h'(x)) at fe complex x, via Clenshaw in u and its derivative
// recurrence. h'(x) = h_u(u) \xb7 du/dx = h_u \xb7 4x.
fn renorm_eval_h(x: fe) -> RenormEval {
  let u = fe_add(fe_scale(fe_cmul(x, x), 2.0), fe_from_vec(vec2<f32>(-1.0, 0.0), 0));
  let two_u = fe_scale(u, 2.0);
  var a: array<f32, 22> = RENORM_H_A;
  var b1 = fe(vec2<f32>(0.0, 0.0), FE_ZERO_E);
  var b2 = fe(vec2<f32>(0.0, 0.0), FE_ZERO_E);
  var d1 = fe(vec2<f32>(0.0, 0.0), FE_ZERO_E);
  var d2 = fe(vec2<f32>(0.0, 0.0), FE_ZERO_E);
  var dd1 = fe(vec2<f32>(0.0, 0.0), FE_ZERO_E);
  var dd2 = fe(vec2<f32>(0.0, 0.0), FE_ZERO_E);
  for (var k = RENORM_H_NCOEFF - 1; k >= 1; k = k - 1) {
    let ak = fe_from_vec(vec2<f32>(a[k], 0.0), 0);
    let b0 = fe_add3(ak, fe_cmul(two_u, b1), fe_neg(b2));
    let dd0 = fe_add3(fe_scale(b1, 2.0), fe_cmul(two_u, d1), fe_neg(d2));
    let ddd0 = fe_add3(fe_scale(d1, 4.0), fe_cmul(two_u, dd1), fe_neg(dd2));
    b2 = b1; b1 = b0;
    d2 = d1; d1 = dd0;
    dd2 = dd1; dd1 = ddd0;
  }
  let a0 = fe_from_vec(vec2<f32>(a[0], 0.0), 0);
  var out: RenormEval;
  out.value = fe_add3(a0, fe_cmul(u, b1), fe_neg(b2));
  let h_u = fe_add3(b1, fe_cmul(u, d1), fe_neg(d2));
  let h_uu = fe_add3(fe_scale(d1, 2.0), fe_cmul(u, dd1), fe_neg(dd2));
  out.deriv = fe_cmul(h_u, fe_scale(x, 4.0));
  out.second = fe_add(fe_cmul(h_uu, fe_cmul(fe_scale(x, 4.0), fe_scale(x, 4.0))), fe_scale(h_u, 4.0));
  return out;
}

// At a critical rebase (ref_i == 0, so dz is the full state z since
// orbit[0] = 0), apply the largest qualifying renormalized block. It jumps
// 2^n iterations by dz ← s_n \xb7 H(dz/s_n) with s_n = orbit[2^n], and carries
// the derivative multiplicatively der ← H'(dz/s_n) \xb7 der (the O(K_c\xb7dc)
// parameter term is dropped — valid deep on the cascade, keeps distance
// shading approximately right). Returns the skip, or 0 if none qualifies.
fn try_apply_renorm(dz: ptr<function, fe>, derM: ptr<function, vec2<f32>>, derScale: f32, snd: ptr<function, vec2<f32>>, sndScale: ptr<function, f32>, i: ptr<function, f32>, maxIterI: i32, dcMag: f32) -> i32 {
  let dzMag = sqrt(fe_mag2_f32(*dz));
  for (var n = RENORM_MAX_LEVEL; n >= RENORM_MIN_LEVEL; n = n - 1) {
    let skip = 1 << u32(n);
    if (i32(skip) >= maxIterI) { continue; }
    // Parameter window: |dc| must fit this level's certified c-window.
    // (dcMag underflowing f32 to 0 at extreme depth passes — correct.)
    if (dcMag > RENORM_DC_BASE * exp2(f32(2 - n) * RENORM_DC_LOG2_RATIO)) { continue; }
    let sn = getOrbit(i32(skip));
    let snMag2 = dot(sn, sn);
    if (!(snMag2 > 0.0)) { continue; }
    let snMag = sqrt(snMag2);
    // Cascade-ladder gate: two consecutive contractions ≈ 1/α.
    let sPrev = length(getOrbit(i32(skip) / 2));
    let sPrev2 = length(getOrbit(i32(skip) / 4));
    if (snMag > RENORM_LADDER_RATIO * sPrev || sPrev > RENORM_LADDER_RATIO * sPrev2) { continue; }
    if (dzMag > RENORM_RADIUS * snMag) { continue; }
    // x = dz / s_n  (s_n plain O(1) complex; 1/s_n = conj(s_n)/|s_n|\xb2)
    let invSn = vec2<f32>(sn.x, -sn.y) / snMag2;
    let x = fe_cmul_f32(invSn, *dz);
    let ev = renorm_eval_h(x);
    let derOld = *derM;
    *dz = fe_cmul_f32(sn, ev.value);
    snd_apply_map(
      ev.deriv, fe_cmul_f32(invSn, ev.second),
      fe(vec2<f32>(0.0), 0), fe(vec2<f32>(0.0), 0),
      derOld, derScale, snd, sndScale,
    );
    *derM = cmul(fe_to_vec(ev.deriv), *derM);
    *i += f32(skip);
    return i32(skip);
  }
  return 0;
}

fn mandelbrot_compute_deep(dc: fe, prev_iter: f32, prev_dz_m: vec2<f32>, prev_dz_e: i32, prev_ref_i_int: i32, prev_derx: f32, prev_dery: f32, prev_ders: f32, prev_sndx: f32, prev_sndy: f32, prev_snds: f32, prev_snd_valid: f32) -> TexelOut {
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
  // Phase D: z″ = sndM\xb7exp(sndS), independently normalized from z′.
  var sndM = vec2<f32>(prev_sndx, prev_sndy);
  var sndS = prev_snds;
  var sndValid = prev_snd_valid >= 0.5;
  var derInvScale = 0.0;
  var epsThreshold = 0.0;
  der_refresh_cache(&derM, &derS, &derSLo, &derInvScale, &epsThreshold, logEpsilon);

  var escaped = false;
  var inside = false;
  var shadingHeight = 0.0;

  // Affine BLA and Pad\xe9 share try_apply_bla_deep (mode ≥ 1.5 branches to
  // Pad\xe9); jet (3) and M\xf6bius-c+ (4) use the shared jet buffers and their own
  // try_apply_*.
  let isUnifiedDeep = mandelbrot.approximationMode >= 4.5;
  let isMobiusDeep = mandelbrot.approximationMode >= 3.5 && !isUnifiedDeep;
  let isJetDeep = mandelbrot.approximationMode >= 2.5 && !isMobiusDeep && !isUnifiedDeep;
  let isBlockTableDeep = isJetDeep || isMobiusDeep || isUnifiedDeep;
  let useBlaDeep = mandelbrot.blaLevelCount >= 1.0;
  var skip0Log = 0;
  if (useBlaDeep) {
    if (isBlockTableDeep) {
      skip0Log = i32(countTrailingZeros(max(mandelbrotJetLevels[0].skip, 1u)));
    } else {
      skip0Log = i32(countTrailingZeros(max(mandelbrotBlaLevels[0].skip, 1u)));
    }
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
  // Same invariant cache as the shallow path; this value also gates the
  // optional header, so dynamic block probes get it for free.
  var unifiedDeepLog2Dc = 0.0;
  if (isUnifiedDeep) {
    unifiedDeepLog2Dc = validity_log2_complex_floatexp(dc);
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
    let headerVersion = i32(mandelbrotJetRadii[perHdr + 2].v.w + 0.5);
    if (headerVersion == OPTIONAL_HEADER_VERSION
        && unifiedDeepLog2Dc <= mandelbrotJetRadii[perHdr + 8].v.w) {
      perStart = i32(mandelbrotJetRadii[perHdr + 4].v.w);
      perP = i32(mandelbrotJetRadii[perHdr + 5].v.w);
      perR = mandelbrotJetRadii[perHdr + 6].v.w;
      if (perP > 0) {
        perNext = perStart;
        perStride = perP;
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
    if (ENABLE_RENORM && ref_i == 0) {
      // fe_to_vec underflowing to 0 at extreme depth is correct here (tiny
      // |dc| passes every window gate).
      skipped = try_apply_renorm(&dz, &derM, derS + derSLo, &sndM, &sndS, &i, globalMaxIterI, length(fe_to_vec(dc)));
      if (skipped > 0) {
        // Deliberately do NOT set usedBla: the renorm block keeps ref_i = 0
        // (it operates at the critical rebase point), so the ref_i-based
        // termination and rebase never fire for it. Interior cascade pixels
        // must instead resolve via the derivative interior test below — which
        // is valid here because try_apply_renorm propagates the exact 2^n-map
        // derivative H'(x)\xb7der through the jump (an attracting component gives
        // derMM → 0). Without this, interior pixels never finish and the
        // adaptive maxIter chases them forever (render stalls < 100%).
        // ref_i stays 0; orbit[0] = 0 so z = dz. refZ is already getOrbit(0).
        z = fe_to_vec(dz);
        refZ = getOrbit(0);
        g_renormApps += 1u;
        g_renormIters += u32(skipped);
        // Termination: a renorm pixel bounded past globalMaxIter is interior.
        // Crucially this does NOT require orbitComplete (unlike the
        // perturbation path at line ~2536): at the Feigenbaum point the
        // reference orbit is bounded and caps below a deep view's maxIter, so
        // orbitComplete stays false forever. But renorm's boundedness is
        // certified by the H model itself (independent of the reference orbit
        // length), so reaching globalMaxIter bounded is a valid interior
        // verdict on its own. Without this the render stalls < 100% (interior
        // cascade pixels, non-hyperbolic near c_∞, never resolve).
        if (prev_iter + i >= mandelbrot.globalMaxIter) {
          inside = true;
          break;
        }
      }
    }
    if (skipped == 0 && useBlaDeep) {
      var blaZ = vec2<f32>(0.0);
      if (isBlockTableDeep) {
        var unifiedDeepLog2Dz = 0.0;
        var probeBlockTableDeep = false;
        if (ENABLE_DYNAMIC_VALIDITY && isUnifiedDeep) {
          unifiedDeepLog2Dz = validity_log2_complex_floatexp(dz);
          probeBlockTableDeep = mandelbrot.approximationMode >= 6.5
            || unifiedDeepLog2Dz <= jetMaxR3Deep;
        } else {
          probeBlockTableDeep = log2(max(length(dz.m), 1e-30)) + f32(dz.e) < jetMaxR3Deep;
        }
        if (probeBlockTableDeep) {
          if (isUnifiedDeep) {
            skipped = try_apply_unified(&ref_i, &dz, &derM, &derS, &derSLo, &derInvScale, &epsThreshold, logEpsilon, &blaZ, dc, dcDeep2, dcDeep3, unifiedDeepLog2Dc, unifiedDeepLog2Dz, muLimit, skip0Log, globalMaxIterI, &jetLvlR3Deep, vec2<f32>(0.0), vec2<f32>(0.0), vec2<f32>(0.0), false, false, &jetLevelHintDeep, &sndM, &sndS);
          } else if (isMobiusDeep) {
            skipped = try_apply_mobius(&ref_i, &dz, &derM, &derS, &derSLo, &derInvScale, &epsThreshold, logEpsilon, &blaZ, dc, muLimit, skip0Log, globalMaxIterI, &jetLvlR3Deep, vec2<f32>(0.0), false, &jetLevelHintDeep, &sndM, &sndS);
          } else {
            skipped = try_apply_jet(&ref_i, &dz, &derM, &derS, &derSLo, &derInvScale, &epsThreshold, logEpsilon, &blaZ, dc, dcDeep2, dcDeep3, muLimit, skip0Log, globalMaxIterI, &jetLvlR3Deep, vec2<f32>(0.0), vec2<f32>(0.0), vec2<f32>(0.0), false, &jetLevelHintDeep, &sndM, &sndS);
          }
        }
      } else {
        skipped = try_apply_bla_deep(&ref_i, &dz, &derM, &derS, &derSLo, &derInvScale, &epsThreshold, logEpsilon, &blaZ, dc, muLimit, skip0Log, globalMaxIterI, &sndM, &sndS);
      }
      if (skipped > 0) {
        usedBla = true;
        z = blaZ;
        i += f32(skipped);
        refZ = getOrbit(ref_i); // ref_i jumped past the block — resync carried orbit
      }
    }
    if (skipped == 0) {
      if (ENABLE_DYNAMIC_STATS && isUnifiedDeep && ENABLE_DYNAMIC_VALIDITY) {
        g_dynamicExactFallbacks += 1u;
      }
      let zPrev = refZ + fe_to_vec(dz);
      // dz' = 2\xb7z_n\xb7dz + dz\xb2 + dc   (z_n = refZ is O(1) f32)
      dz = fe_add3(fe_cmul_f32(2.0 * refZ, dz), fe_cmul(dz, dz), dc);
      ref_i += 1;
      refZ = getOrbit(ref_i);
      z = refZ + fe_to_vec(dz);
      if (sndValid) {
        snd_exact_step(derM, derS + derSLo, zPrev, &sndM, &sndS);
      }
      derM = 2.0 * cmul(zPrev, derM) + vec2<f32>(derInvScale, 0.0);
      i += 1.0;
    }

    let derMM = dot(derM, derM);
    let dot_z = dot(z, z);
    if (dot_z > muLimit) {
      let derPolar = der_to_polar(derM, derS + derSLo);
      shadingHeight = distance_height_deep(z, derPolar, scaleExp);
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
      der_renormalize(&derM, &derS, &derSLo, &derInvScale, &epsThreshold, logEpsilon);
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
    out.genuine   = pack(0.0);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(0.0);
    out.dzy       = pack(0.0);
    out.ref_i     = pack(0.0);
    out.avgDirection = pack(0.0);
    out.derS      = pack(0.0); // finished — layer 8 dead
    return out;
  }

  let total_iter = prev_iter + i;

  if (escaped) {
    let geometry = analytic_terminal_geometry(z, derM, derS + derSLo, sndM, sndS, scaleExp);
    out.iter      = pack(total_iter);
    out.genuine   = pack(geometry.x);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(shadingHeight);
    out.dzy       = pack(geometry.y);
    out.ref_i     = pack(terminal_orbit_metrics(0.0, vec2<f32>(0.0)));
    out.avgDirection = pack(geometry.z);
    // Phase D polar-log Taylor payload — see the shallow exit.
    out.derS      = pack(derS + derSLo);
    out.aa9       = pack(derM.x);
    out.aa10      = pack(derM.y);
    let taylorPayloadValid = sndValid;
    let escapedSndLog = select(
      INVALID_TAYLOR_PAYLOAD,
      scaled_complex_log_length(sndM, sndS),
      taylorPayloadValid,
    );
    let escapedSndAngle = select(
      INVALID_TAYLOR_PAYLOAD,
      atan2(sndM.y, sndM.x),
      taylorPayloadValid,
    );
    out.aa11      = pack(escapedSndLog);
    out.aa12      = pack(escapedSndAngle);
    return out;
  }

  if (total_iter >= mandelbrot.globalMaxIter && mandelbrot.orbitComplete >= 0.5) {
    out.iter      = pack(0.0);
    out.genuine   = pack(0.0);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(0.0);
    out.dzy       = pack(0.0);
    out.ref_i     = pack(0.0);
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
  out.aa11      = pack(sndS);
  out.aa12      = pack(select(0.0, 1.0, sndValid));
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

// ── fused compute entry ─────────────────────────────────────────────
// Workgroup-local partial counters (pattern from count_unfinished.wgsl):
// each 8\xd78 workgroup reduces locally and issues at most one global atomicAdd.
// Barriers stay in uniform control flow — the per-texel work
// is wrapped in ifs, never early-returned.
var<workgroup> wgCount: atomic<u32>;
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
var<workgroup> wgRenormApps: atomic<u32>;
var<workgroup> wgRenormIters: atomic<u32>;
var<workgroup> wgDynamicTierAttempts: array<atomic<u32>, 4>;
var<workgroup> wgDynamicTierAccepts: array<atomic<u32>, 4>;
var<workgroup> wgDynamicSkipBuckets: array<atomic<u32>, 4>;
var<workgroup> wgDynamicCandidateUses: atomic<u32>;
var<workgroup> wgDynamicRejects: array<atomic<u32>, 8>;
var<workgroup> wgDynamicExactFallbacks: atomic<u32>;

@compute @workgroup_size(8, 8)
fn cs_main(
  @builtin(global_invocation_id) local_gid: vec3<u32>,
  @builtin(local_invocation_index) lidx: u32,
) {
  let gid = vec3<u32>(
    local_gid.x + u32(brush.dispatchOriginX),
    local_gid.y + u32(brush.dispatchOriginY),
    local_gid.z,
  );
  if (lidx == 0u) {
    atomicStore(&wgCount, 0u);
    if (ENABLE_WORK_STATS) {
      atomicStore(&wgRealSum, 0u);
      atomicStore(&wgRealMax, 0u);
      atomicStore(&wgCovSum, 0u);
      for (var t = 0; t < 4; t++) {
        atomicStore(&wgTier[t], 0u);
        if (ENABLE_DYNAMIC_STATS) {
          atomicStore(&wgDynamicTierAttempts[t], 0u);
          atomicStore(&wgDynamicTierAccepts[t], 0u);
          atomicStore(&wgDynamicSkipBuckets[t], 0u);
        }
      }
      atomicStore(&wgGateJumps, 0u);
      atomicStore(&wgGateFails, 0u);
      atomicStore(&wgSecoursApps, 0u);
      atomicStore(&wgSecoursIters, 0u);
      atomicStore(&wgAppsF32, 0u);
      atomicStore(&wgRenormApps, 0u);
      atomicStore(&wgRenormIters, 0u);
    }
    if (ENABLE_WORK_STATS && ENABLE_DYNAMIC_STATS) {
      for (var reason = 0; reason < 8; reason++) {
        atomicStore(&wgDynamicRejects[reason], 0u);
      }
      atomicStore(&wgDynamicCandidateUses, 0u);
      atomicStore(&wgDynamicExactFallbacks, 0u);
    }
  }
  workgroupBarrier();

  // Post-iteration classification of this texel (for the fused counter).
  var needs = false;

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

      // A negative value is always the single exact step-1 request.
      var iter_val = loadLayer(coord, 0);

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
          if (ENABLE_DYNAMIC_STATS) {
            g_dynamicTierAttempts = array<u32, 4>(0u, 0u, 0u, 0u);
            g_dynamicTierAccepts = array<u32, 4>(0u, 0u, 0u, 0u);
            g_dynamicSkipBuckets = array<u32, 4>(0u, 0u, 0u, 0u);
            g_dynamicCandidateUses = 0u;
            g_dynamicRejects = array<u32, 8>(0u, 0u, 0u, 0u, 0u, 0u, 0u, 0u);
            g_dynamicExactFallbacks = 0u;
          }
          g_gateJumps = 0u;
          g_gateFails = 0u;
          g_secoursApps = 0u;
          g_secoursIters = 0u;
          g_appsF32 = 0u;
          g_renormApps = 0u;
          g_renormIters = 0u;
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
              // 10-entry header after the block records (base = last directory
              // entry's offset+count) — SA b1..b4 + n0 in the first four
              // entries, then the 6-coefficient periodic block. Start the
              // pixel at n = n0
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
              var saSnds = SCALED_ZERO_S;
              if (mandelbrot.approximationMode >= 4.5 && mandelbrot.blaLevelCount >= 1.0 && mandelbrot.orbitComplete >= 0.5) {
                let lastLvl = mandelbrotJetLevels[i32(mandelbrot.blaLevelCount) - 1];
                let saBase = i32(lastLvl.offset + lastLvl.count);
                let h0 = mandelbrotJetRadii[saBase].v;
                let h1 = mandelbrotJetRadii[saBase + 1].v;
                let h2 = mandelbrotJetRadii[saBase + 2].v;
                let n0 = i32(h0.w);
                if (i32(h2.w + 0.5) == OPTIONAL_HEADER_VERSION
                    && validity_log2_complex_floatexp(dc) <= h1.w
                    && n0 > 0 && f32(n0) < mandelbrot.maxIteration) {
                  let b1 = fe(vec2<f32>(h0.x, h0.y), i32(h0.z));
                  let b2 = fe(vec2<f32>(h1.x, h1.y), i32(h1.z));
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
                  // Phase D: independent z″ seed
                  // ∂\xb2(SA)/∂c\xb2 = 2b₂ + 6b₃\xb7dc + 12b₄\xb7dc\xb2.
                  let sd = fe_renorm(fe_add(fe_scale(b2, 2.0), fe_cmul(dc, fe_add(fe_scale(b3, 6.0), fe_cmul(fe_scale(b4, 12.0), dc)))));
                  saSndx = sd.m.x;
                  saSndy = sd.m.y;
                  saSnds = select(
                    SCALED_ZERO_S,
                    f32(sd.e) * LN2,
                    max(abs(sd.m.x), abs(sd.m.y)) > 0.0,
                  );
                }
              }
              result = mandelbrot_compute_deep(dc, saIter, saDz, saDzE, saRef, saDerx, saDery, saDers, saSndx, saSndy, saSnds, 1.0);
            } else {
              // Deep continuation: layers 2/3 hold the dz mantissa, layer 7 its
              // exponent; layers 4/5/8 the raw derivative (derM.x, derM.y, derS).
              let dz_e = i32(loadLayer(coord, 7));
              let stored_derx = loadLayer(coord, 4);
              let stored_dery = loadLayer(coord, 5);
              let stored_ders = loadLayer(coord, 8);
              let prev_ref_i = decode_ref_i(loadLayer(coord, 6));
              // Phase D: independent z″ state rides layers 9/10/11; layer
              // 12 remembers whether every applied jump propagated z″.
              result = mandelbrot_compute_deep(dc, iter_val, vec2<f32>(zx, zy), dz_e, prev_ref_i, stored_derx, stored_dery, stored_ders, loadLayer(coord, 9), loadLayer(coord, 10), loadLayer(coord, 11), loadLayer(coord, 12));
            }
          } else {
            let x0 = local_rot.x * mandelbrot.scale + mandelbrot.cx;
            let y0 = local_rot.y * mandelbrot.scale + mandelbrot.cy;
            if (is_compute_request) {
              result = mandelbrot_compute(x0, y0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, SCALED_ZERO_S, 1.0);
            } else {
              // Continuation: layers 4/5/8 hold the raw derivative registers.
              let stored_derx = loadLayer(coord, 4);
              let stored_dery = loadLayer(coord, 5);
              let stored_ders = loadLayer(coord, 8);
              let prev_ref_i = loadLayer(coord, 6);
              let prev_avg_direction = loadLayer(coord, 7);
              result = mandelbrot_compute(x0, y0, iter_val, zx, zy, stored_derx, stored_dery, stored_ders, prev_ref_i, prev_avg_direction, loadLayer(coord, 9), loadLayer(coord, 10), loadLayer(coord, 11), loadLayer(coord, 12));
            }
          }
          storeTexel(coord, result);

          // Accumulate work metrics for this texel into the workgroup partials.
          if (ENABLE_WORK_STATS) {
            let realSteps = g_workSteps;
            // Interior verdicts deliberately store iter=0.  Their loop turns did
            // nevertheless cover at least one iteration each; retain that
            // invariant so an all-interior render does not look like a wrapped
            // counter to the readback plausibility gate.
            let covered = max(realSteps, u32(max(0.0, result.iter.r - startIter)));
            atomicAdd(&wgRealSum, realSteps);
            atomicMax(&wgRealMax, realSteps);
            atomicAdd(&wgCovSum, covered);
            for (var t = 0; t < 4; t++) {
              if (g_tierApps[t] > 0u) {
                atomicAdd(&wgTier[t], g_tierApps[t]);
              }
            }
            if (ENABLE_DYNAMIC_STATS) {
              for (var t = 0; t < 4; t++) {
                if (g_dynamicTierAttempts[t] > 0u) {
                  atomicAdd(&wgDynamicTierAttempts[t], g_dynamicTierAttempts[t]);
                }
                if (g_dynamicTierAccepts[t] > 0u) {
                  atomicAdd(&wgDynamicTierAccepts[t], g_dynamicTierAccepts[t]);
                }
                if (g_dynamicSkipBuckets[t] > 0u) {
                  atomicAdd(&wgDynamicSkipBuckets[t], g_dynamicSkipBuckets[t]);
                }
              }
              for (var reason = 0; reason < 8; reason++) {
                if (g_dynamicRejects[reason] > 0u) {
                  atomicAdd(&wgDynamicRejects[reason], g_dynamicRejects[reason]);
                }
              }
              if (g_dynamicCandidateUses > 0u) {
                atomicAdd(&wgDynamicCandidateUses, g_dynamicCandidateUses);
              }
              if (g_dynamicExactFallbacks > 0u) {
                atomicAdd(&wgDynamicExactFallbacks, g_dynamicExactFallbacks);
              }
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
            if (g_renormApps > 0u) {
              atomicAdd(&wgRenormApps, g_renormApps);
              atomicAdd(&wgRenormIters, g_renormIters);
            }
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
      } else if (iter_val > 0.0) {
        if (!zLoaded) {
          zx = loadLayer(coord, 2);
          zy = loadLayer(coord, 3);
        }
        let needs_continuation = (zx * zx + zy * zy) < mandelbrot.mu;
        needs = needs_continuation;
      }
    }
  }

  if (needs) {
    atomicAdd(&wgCount, 1u);
  }
  workgroupBarrier();

  if (lidx == 0u) {
    let c = atomicLoad(&wgCount);
    if (c > 0u) {
      atomicAdd(&counter.count, c);
    }
    // Work-instrumentation reduction. Downscale the per-workgroup sums by 64
    // (via >>6, rounded) so the global u32 accumulators can't overflow; the
    // ratio metrics cancel the scale. maxAccum/realMean = lane-time / useful
    // work (workgroup lockstep waste); covMean/realMean = realized skip;
    // maxSteps = worst single-texel straggler. The absolute Total-apps count
    // recovers Σ g_workSteps as realMean << 6.
    let rs = select(0u, atomicLoad(&wgRealSum), ENABLE_WORK_STATS);
    let rm = select(0u, atomicLoad(&wgRealMax), ENABLE_WORK_STATS);
    let cv = select(0u, atomicLoad(&wgCovSum), ENABLE_WORK_STATS);
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
      atomicAdd(&workStats.renormApps, atomicLoad(&wgRenormApps));
      atomicAdd(&workStats.renormIters, atomicLoad(&wgRenormIters));
      if (ENABLE_DYNAMIC_STATS) {
        for (var t = 0; t < 4; t++) {
          atomicAdd(&workStats.dynamicTierAttempts[t], atomicLoad(&wgDynamicTierAttempts[t]));
          atomicAdd(&workStats.dynamicTierAccepts[t], atomicLoad(&wgDynamicTierAccepts[t]));
          atomicAdd(&workStats.dynamicSkipBuckets[t], atomicLoad(&wgDynamicSkipBuckets[t]));
        }
        atomicAdd(&workStats.dynamicCandidateUses, atomicLoad(&wgDynamicCandidateUses));
        for (var reason = 0; reason < 8; reason++) {
          atomicAdd(&workStats.dynamicRejects[reason], atomicLoad(&wgDynamicRejects[reason]));
        }
        atomicAdd(&workStats.dynamicExactFallbacks, atomicLoad(&wgDynamicExactFallbacks));
      }
    }
  }
}
`,Ta=`// Block-skipping DEBUG view (separate diagnostic pipeline).
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
//   5 "tier"    — flat swatch: which tier covered the most iterations on this
//                 pixel (exact / affine\xb7Pad\xe9 / M\xf6bius c+ / jet), most useful
//                 in unified (Auto) mode to see which algorithm was picked.
// View 6 (analytic-AA reach from z′/z″) deliberately does NOT live
// here: this pipeline recomputes every pixel in its own loop, so it is both
// slow and free to disagree with what the progressive renderer actually put on
// screen. The reach only needs z, z′ and z″ at escape, which the production
// path already stores per pixel (raw layers 8-12) — so that view reads them in
// the COLOR pass instead (see color.wgsl, parameters.reachDebug).

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
// Flat coefficient buffer shared by jet (stride 9) and M\xf6bius-c+ (stride 7,
// order A, B, A', D, D', F, N₂ — the [2/1]-c+ form) — exclusive modes,
// identical 12 B element.
const JET_COEFF_STRIDE: i32 = 9;
const MOBIUS_COEFF_STRIDE: i32 = 7;
// Unified table (mode 5): 9 elements in PREFIX order [A, B, D, N₂, A', D', F,
// a12, a03] ([2/1] record) — tier-directed prefix reads (production parity).
const UNIFIED_COEFF_STRIDE: i32 = 9;
// Register budget for the hoisted per-level maxR3 gates (production parity).
const JET_MAX_LEVELS = 32;
// (#5) Level hint start margin (production parity).
const JET_LEVEL_HINT_UP: i32 = 2;
struct JetLevel { offset: u32, count: u32, skip: u32, maxR3: f32 };

@group(0) @binding(0) var<uniform> mandelbrot: Mandelbrot;
@group(0) @binding(1) var<storage, read> mandelbrotOrbitPointSuite: array<MandelbrotStep>;
@group(0) @binding(2) var<storage, read> mandelbrotBlaSuite: array<BlaStep>;
// Packed dynamic validity reuses this binding in Auto; BLA levels are unused
// in that mode, so the diagnostic pipeline also stays at eight storage buffers.
@group(0) @binding(3) var<storage, read> mandelbrotBlaLevels: array<BlaLevel>;
@group(0) @binding(5) var<storage, read> mandelbrotJetSuite: array<JetCoeff>;
@group(0) @binding(6) var<storage, read> mandelbrotJetLevels: array<JetLevel>;
@group(0) @binding(7) var<storage, read> mandelbrotJetRadii: array<JetRadii>;

const VALIDITY_VERSION: u32 = 1u;
const VALIDITY_WORDS_PER_BLOCK: u32 = 24u;
const VALIDITY_WORDS_PER_TIER: u32 = 6u;
const VALIDITY_SLOPES: array<f32, 4> = array<f32, 4>(0.0, -0.5, -1.0, -2.0);

struct DynamicValidityEvaluation {
  log2Dc: f32,
  log2Dz: f32,
  radiusLog2: f32,
  accepts: bool,
};

fn validity_pos_inf() -> f32 { return 3.4028234e38; }
fn validity_neg_inf() -> f32 { return -3.4028234e38; }
fn validity_is_pos_inf(value: f32) -> bool { return bitcast<u32>(value) == 0x7f800000u; }
fn validity_is_neg_inf(value: f32) -> bool { return bitcast<u32>(value) == 0xff800000u; }

fn validity_next_up(value: f32) -> f32 {
  let bits = bitcast<u32>(value);
  let absBits = bits & 0x7fffffffu;
  if (absBits > 0x7f800000u || bits == 0x7f800000u) { return value; }
  if (absBits == 0u) { return bitcast<f32>(1u); }
  if (value > 0.0) { return bitcast<f32>(bits + 1u); }
  return bitcast<f32>(bits - 1u);
}

fn validity_next_down(value: f32) -> f32 {
  let bits = bitcast<u32>(value);
  let absBits = bits & 0x7fffffffu;
  if (absBits > 0x7f800000u || bits == 0xff800000u) { return value; }
  if (absBits == 0u) { return bitcast<f32>(0x80000001u); }
  if (value > 0.0) { return bitcast<f32>(bits - 1u); }
  return bitcast<f32>(bits + 1u);
}

fn validity_log2_complex(value: vec2<f32>, exponent: i32) -> f32 {
  let xBits = bitcast<u32>(value.x) & 0x7fffffffu;
  let yBits = bitcast<u32>(value.y) & 0x7fffffffu;
  if (xBits >= 0x7f800000u || yBits >= 0x7f800000u) { return validity_pos_inf(); }
  let axis = max(abs(value.x), abs(value.y));
  if (axis == 0.0) { return validity_neg_inf(); }
  let sx = value.x / axis;
  let sy = value.y / axis;
  let norm2 = validity_next_up(sx * sx + sy * sy);
  let angular = validity_next_up(0.5 * validity_next_up(log2(norm2)));
  let radial = validity_next_up(log2(axis));
  return validity_next_up(validity_next_up(radial + angular) + f32(exponent));
}

fn validity_log2_complex_shallow(value: vec2<f32>) -> f32 {
  return validity_log2_complex(value, 0);
}

fn validity_log2_complex_floatexp(value: fe) -> f32 {
  return validity_log2_complex(value.m, value.e);
}

fn validity_packed_word(blockIndex: u32, tier: u32, word: u32) -> f32 {
  let absoluteWord = blockIndex * VALIDITY_WORDS_PER_BLOCK
    + tier * VALIDITY_WORDS_PER_TIER + word;
  let packed = mandelbrotBlaLevels[absoluteWord >> 2u];
  switch (absoluteWord & 3u) {
    case 0u: { return bitcast<f32>(packed.offset); }
    case 1u: { return bitcast<f32>(packed.count); }
    case 2u: { return bitcast<f32>(packed.skip); }
    default: { return packed.maxRadius; }
  }
}

fn evaluate_dynamic_validity_logs(
  blockIndex: u32,
  tier: u32,
  log2Dc: f32,
  log2Dz: f32,
) -> DynamicValidityEvaluation {
  let maxLog2Dc = validity_packed_word(blockIndex, tier, 4u);
  var radiusLog2 = validity_neg_inf();
  if (!validity_is_neg_inf(maxLog2Dc) && log2Dc == log2Dc && log2Dc <= maxLog2Dc) {
    var commonRadius = validity_pos_inf();
    for (var line = 0u; line < 4u; line++) {
      let intercept = validity_packed_word(blockIndex, tier, line);
      if (validity_is_pos_inf(intercept)) { continue; }
      var evaluated = validity_pos_inf();
      if (log2Dc == validity_neg_inf()) {
        if (VALIDITY_SLOPES[line] == 0.0) { evaluated = intercept; }
      } else {
        evaluated = intercept + VALIDITY_SLOPES[line] * log2Dc;
      }
      commonRadius = min(commonRadius, validity_next_down(evaluated));
    }
    radiusLog2 = min(commonRadius, validity_packed_word(blockIndex, tier, 5u));
  }
  return DynamicValidityEvaluation(
    log2Dc,
    log2Dz,
    radiusLog2,
    radiusLog2 != validity_neg_inf() && log2Dz == log2Dz && log2Dz <= radiusLog2,
  );
}

fn evaluate_dynamic_validity_shallow(
  blockIndex: u32,
  tier: u32,
  dc: vec2<f32>,
  dz: vec2<f32>,
) -> DynamicValidityEvaluation {
  return evaluate_dynamic_validity_logs(
    blockIndex,
    tier,
    validity_log2_complex_shallow(dc),
    validity_log2_complex_shallow(dz),
  );
}

fn evaluate_dynamic_validity_floatexp(
  blockIndex: u32,
  tier: u32,
  dc: fe,
  dz: fe,
) -> DynamicValidityEvaluation {
  return evaluate_dynamic_validity_logs(
    blockIndex,
    tier,
    validity_log2_complex_floatexp(dc),
    validity_log2_complex_floatexp(dz),
  );
}

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
            let cf  = jet_coeff_f32(mandelbrotJetSuite[base + 5]);
            let cn2 = jet_coeff_f32(mandelbrotJetSuite[base + 6]);
            let dzF = fe_to_vec(*dz);
            let ae = ca + cmul(cap, dcF);
            let de = cd + cmul(cdp, dcF);
            let den = vec2<f32>(1.0, 0.0) + cmul(de, dzF) + cmul(cf, dcF);
            if (MOBIUS_PARANOIA_GUARD && dot(den, den) < MOBIUS_DEN_GUARD2) {
              denOk = false;
            } else {
              phi = fe_from_vec(cmul(cmul(cmul(cn2, dzF) + ae, dzF) + cmul(cb, dcF), cinv(den)), 0);
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
            let den = fe_add(fe_add(fe(vec2<f32>(1.0, 0.0), 0), fe_cmul(de, *dz)), fe_cmul(cf, dc));
            if (MOBIUS_PARANOIA_GUARD && (den.e < -10 || (den.e < 5 && dot(fe_to_vec(den), fe_to_vec(den)) < MOBIUS_DEN_GUARD2))) {
              denOk = false;
            } else {
              phi = fe_cmul(fe_add(fe_cmul(fe_add(fe_cmul(cn2, *dz), ae), *dz), fe_cmul(cb, dc)), fe_cinv(den));
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
// as the TIER-MIX census: o1 = affine/Pad\xe9 (≤ 48 B path), o2 = c+ (72 B
// record), o3 = jet (108 B) — the debug view's per-order buckets read as tier
// shares.
fn dbg_try_unified(ref_i: ptr<function, i32>, dz: ptr<function, fe>, dc: fe, dc2: fe, dc3: fe, maxIterI: i32, skip0Log: i32, order: ptr<function, i32>, probes: ptr<function, u32>, lvlR: ptr<function, array<f32, JET_MAX_LEVELS>>, dcF: vec2<f32>, f32Ok: bool, hint: ptr<function, i32>) -> i32 {
  if (*ref_i <= 0) { return 0; }
  let dynamicValidity = mandelbrot.approximationMode >= 5.5;
  let log2_dz = fe_log2(*dz);
  var dynamicLog2Dc = 0.0;
  var dynamicLog2Dz = 0.0;
  if (dynamicValidity) {
    dynamicLog2Dc = validity_log2_complex_floatexp(dc);
    dynamicLog2Dz = validity_log2_complex_floatexp(*dz);
  }
  let shiftedRef = *ref_i - 1;
  var level = min(min(i32(mandelbrot.blaLevelCount), JET_MAX_LEVELS) - 1, i32(countTrailingZeros(u32(shiftedRef))) - skip0Log);
  if (!dynamicValidity) { level = min(level, *hint + JET_LEVEL_HINT_UP); }
  while (level >= 0) {
    *probes = *probes + 1u;
    let skip = i32(1u << u32(skip0Log + level));
    if ((dynamicValidity || log2_dz < (*lvlR)[level]) && *ref_i + skip <= maxIterI) {
      let levelInfo = mandelbrotJetLevels[level];
      let slot = shiftedRef >> u32(skip0Log + level);
      if (u32(slot) < levelInfo.count) {
        let entry = i32(levelInfo.offset) + slot;
        let radii = mandelbrotJetRadii[entry].v;
        var tag = -1;
        if (dynamicValidity) {
          for (var tier = 0u; tier < 4u; tier++) {
            if (evaluate_dynamic_validity_logs(
              u32(entry), tier, dynamicLog2Dc, dynamicLog2Dz,
            ).accepts) {
              tag = i32(tier);
              break;
            }
          }
        } else if (log2_dz < radii.x) {
          tag = i32(radii.y + 0.5);
        }
        if (tag >= 0) {
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
              let cn2F = jet_coeff_f32(mandelbrotJetSuite[base + 3]);
              var cfF = vec2<f32>(0.0);
              if (tag == 2) {
                ae = ca + cmul(jet_coeff_f32(mandelbrotJetSuite[base + 4]), dcF);
                de = de + cmul(jet_coeff_f32(mandelbrotJetSuite[base + 5]), dcF);
                cfF = jet_coeff_f32(mandelbrotJetSuite[base + 6]);
              }
              // [2/1] F-form: num = (N₂\xb7dz + Ae)\xb7dz + B\xb7dc; den = 1 + De\xb7dz + F\xb7dc.
              let den = vec2<f32>(1.0, 0.0) + cmul(de, dzF) + cmul(cfF, dcF);
              if (MOBIUS_PARANOIA_GUARD && dot(den, den) < MOBIUS_DEN_GUARD2) {
                denOk = false;
              } else {
                phi = fe_from_vec(cmul(cmul(cmul(cn2F, dzF) + ae, dzF) + cmul(cb, dcF), cinv(den)), 0);
              }
            }
          } else {
            let ca = jet_coeff_fe(mandelbrotJetSuite[base]);
            let cb = jet_coeff_fe(mandelbrotJetSuite[base + 1]);
            if (tag == 0) {
              phi = fe_add(fe_cmul(ca, *dz), fe_cmul(cb, dc));
            } else if (tag <= 2) {
              let cd = jet_coeff_fe(mandelbrotJetSuite[base + 2]);
              let cn2 = jet_coeff_fe(mandelbrotJetSuite[base + 3]);
              var ae = ca;
              var de = cd;
              var cf = fe(vec2<f32>(0.0), 0);
              if (tag == 2) {
                ae = fe_add(ca, fe_cmul(jet_coeff_fe(mandelbrotJetSuite[base + 4]), dc));
                de = fe_add(cd, fe_cmul(jet_coeff_fe(mandelbrotJetSuite[base + 5]), dc));
                cf = jet_coeff_fe(mandelbrotJetSuite[base + 6]);
              }
              // [2/1] F-form: num = (N₂\xb7dz + Ae)\xb7dz + B\xb7dc; den = 1 + De\xb7dz + F\xb7dc.
              let den = fe_add3(fe(vec2<f32>(1.0, 0.0), 0), fe_cmul(de, *dz), fe_cmul(cf, dc));
              if (MOBIUS_PARANOIA_GUARD && (den.e < -10 || (den.e < 5 && dot(fe_to_vec(den), fe_to_vec(den)) < MOBIUS_DEN_GUARD2))) {
                denOk = false;
              } else {
                phi = fe_cmul(fe_add(fe_cmul(fe_add(fe_cmul(cn2, *dz), ae), *dz), fe_cmul(cb, dc)), fe_cinv(den));
              }
            } else {
              // [2/1] F-form identity reconstruction (see try_apply_unified).
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
// Flat per-tier swatches for the "tier" view — kept in sync with the legend
// rendered in Settings.vue (DEBUG_TIER_COLORS).
const TIER_COLOR_EXACT: vec3<f32> = vec3<f32>(0.55, 0.55, 0.55);
const TIER_COLOR_ORDER1: vec3<f32> = vec3<f32>(0.25, 0.55, 0.95);
const TIER_COLOR_ORDER2: vec3<f32> = vec3<f32>(0.25, 0.85, 0.35);
const TIER_COLOR_ORDER3: vec3<f32> = vec3<f32>(0.95, 0.6, 0.15);

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let globalMaxIterI = i32(mandelbrot.globalMaxIter);
  // Screen → neutral. The compute path stores the scene UNROTATED (its
  // \`local_rot\` is neutral space) and the scene rotation is applied at display
  // time by the color pass, \`rotate_sincos(local, sceneSin, sceneCos)\`. This
  // pipeline writes straight to the swapchain, so it has to do that rotation
  // itself — without it the overlay samples a different part of the plane than
  // the frame it is drawn over, which reads as "the debug views are somewhere
  // else entirely". (The reach view does not have this problem: it lives in the
  // color pass and inherits the mapping.)
  let xy_screen = (uv - vec2<f32>(0.5, 0.5)) * 2.0;
  let local = vec2<f32>(xy_screen.x * mandelbrot.aspect, xy_screen.y);
  let rotS = sin(mandelbrot.angle);
  let rotC = cos(mandelbrot.angle);
  let local_rot = vec2<f32>(rotC * local.x - rotS * local.y,
                            rotS * local.x + rotC * local.y);
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

  let mode = i32(mandelbrot.approximationMode + 0.5); // 0..6, 6 = dynamic Auto
  let isJet = mode == 3;
  let isMobius = mode == 4;
  let isUnified = mode >= 5;
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
  } else if (view == 4) {
    // Probes per turn (lookup overhead), mapped 0..8.
    rgb = heat(f32(probes) / fturns / 8.0);
  } else {
    // Tier: flat swatch for whichever tier covered the most iterations on
    // this pixel (exact perturbation / affine\xb7Pad\xe9 / M\xf6bius c+ / jet) —
    // ties favour the higher (more expensive) tier.
    var best = f32(exactIters);
    rgb = TIER_COLOR_EXACT;
    if (f32(o1Iters) >= best) { best = f32(o1Iters); rgb = TIER_COLOR_ORDER1; }
    if (f32(o2Iters) >= best) { best = f32(o2Iters); rgb = TIER_COLOR_ORDER2; }
    if (f32(o3Iters) >= best) { best = f32(o3Iters); rgb = TIER_COLOR_ORDER3; }
  }
  // Interior/budget-exhausted pixels: keep the metric but dim it so escape
  // structure stays readable.
  if (!escaped) { rgb *= 0.45; }
  return vec4<f32>(rgb, 1.0);
}
`,ba=`// All color arithmetic uses one f32 path. The alias keeps the bounded shading
// expressions readable without creating a second shader variant.
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
  _pad19: f32,           // reserved (was subsurfaceStrength — effect removed)
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
  gradeContrast: f32,   // display-grade S-contrast around mid-grey (1.0 = neutral)
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
  gradeSaturation: f32,  // display-grade saturation (1.0 = neutral)
  reachDebug: f32,       // 1 = analytic-AA reach heatmap (debug view 6)
  lnScale: f32,          // ln(view scale) at full precision (deep-safe pixel size)
  reachReady: f32,       // 2 = z″ payload carried by every production path
  _pad68: f32,
  _pad69: f32,
  _pad70: f32,
  _pad71: f32,
};
@group(0) @binding(0) var<uniform> parameters: Uniforms;
@group(0) @binding(1) var tex: texture_2d_array<f32>; // live values: iter, z.x, z.y
@group(0) @binding(2) var tileTex: texture_2d<f32>;
@group(0) @binding(3) var skyboxTex: texture_2d<f32>;
@group(0) @binding(4) var webcamTex: texture_2d<f32>;
@group(0) @binding(5) var paletteTex: texture_2d<f32>;  // 4096 x 7 rgba16float
@group(0) @binding(6) var texFrozen: texture_2d_array<f32>; // frozen values
@group(0) @binding(7) var paletteSampler: sampler; // bilinear sampler for palette
@group(0) @binding(8) var skyboxSampler: sampler;  // bilinear sampler for skybox
@group(0) @binding(9) var aaTargetTex: texture_2d<f32>; // per-neutral-texel AA target sample count (r32float)
@group(0) @binding(10) var geometryTex: texture_2d<f32>;
@group(0) @binding(11) var frozenGeometryTex: texture_2d<f32>;
@group(0) @binding(12) var metadataTex: texture_2d<u32>;
@group(0) @binding(13) var frozenMetadataTex: texture_2d<u32>;
@group(0) @binding(14) var rawTex: texture_2d_array<f32>; // analytic-AA payload only

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) fragCoord: vec2<f32>,
};

// Relative tolerance on |ẑ − z| for the reach view. The color is driven by the
// smooth iteration ν = n + 1 − log2(log|z|/log B); an error ε on z moves ν by
// roughly ε/(|z|\xb7ln|z|\xb7ln2), so at the bailout |z| ≈ 2 a relative 1e-3 holds ν
// inside ~1/500 of an iteration — well under a palette quantum.
const REACH_TOL: f32 = 1e-3;
const LOG2E_: f32 = 1.4426950408889634;

// Blue → cyan → green → yellow → red, mirroring mandelbrot_debug.wgsl's
// skip_ramp so the legend in Settings.vue serves both.
fn reach_ramp(t: f32) -> vec3<f32> {
  let x = clamp(t, 0.0, 1.0) * 4.0;
  if (x < 1.0) { return mix(vec3<f32>(0.1, 0.15, 0.7), vec3<f32>(0.0, 0.7, 0.9), x); }
  if (x < 2.0) { return mix(vec3<f32>(0.0, 0.7, 0.9), vec3<f32>(0.1, 0.8, 0.2), x - 1.0); }
  if (x < 3.0) { return mix(vec3<f32>(0.1, 0.8, 0.2), vec3<f32>(1.0, 0.9, 0.1), x - 2.0); }
  return mix(vec3<f32>(1.0, 0.9, 0.1), vec3<f32>(0.9, 0.1, 0.1), x - 3.0);
}

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
  specularPower: f32,   // intensity [0, 64]; roughness controls highlight width
  // Row 3
  dielectricSpecular: f32, // neutral dielectric F0 [0, 1]
  metallic: f32,        // [0, 1]
  roughness: f32,       // [0.02, 1]
  anisotropy: f32,      // [0, 1]
  // Row 6
  reliefGain: f32,            // log-domain control [0, 2], neutral at 1
  metalReflectance: f32,     // conductor F0 gain [0, 2]
  metalEnvironmentTint: f32, // [0, 1], 0 preserves env hue, 1 is physical tint
  iridescenceColor: vec3<f32>,
  wIridescence: f32,
  wStripeAverage: f32,
  wRotationMean: f32,
  wStripeRelief: f32,
  wDirectionCoherenceRelief: f32,
};

fn palette_row_y(row: f32) -> f32 {
  return (row + 0.5) / 7.0;
}

fn samplePaletteColor(palettePhase: f32) -> vec3<f32> {
  return textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, palette_row_y(0.0)), 0.0).rgb;
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
  let row0 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, palette_row_y(0.0)), 0.0);
  e.paletteColor = row0.rgb;
  e.wPalette = row0.a;

  // Row 1: zebra, tessellation, shading, skybox
  let row1 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, palette_row_y(1.0)), 0.0);
  e.wTessellation = row1.g;
  e.wShading = row1.b;
  e.wSkybox = row1.a;

  // Row 2: webcam, smoothness, shadingLevel [0,3], specularPower [0,64]
  let row2 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, palette_row_y(2.0)), 0.0);
  e.wWebcam = row2.r;
  e.wSmoothness = row2.g;
  e.shadingLevel = row2.b;       // direct: natural range [0, 3]
  e.specularPower = clamp(row2.a, 0.0, 64.0); // intensity only; 0 disables the direct specular lobe

  // Rows 3 (metallic/roughness/anisotropy) and 4 (iridescence) are only read
  // inside the shading branch, so they are sampled lazily there via
  // sampleShadingMaterial() rather than for every pixel.

  // Row 5: stripe color blend, direction coherence color blend, stripe relief, direction coherence relief
  let row5 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, palette_row_y(5.0)), 0.0);
  e.wStripeAverage = clamp(row5.r, 0.0, 1.0);
  e.wRotationMean = clamp(row5.g, 0.0, 1.0);
  e.wStripeRelief = clamp(row5.b, 0.0, 1.0);
  e.wDirectionCoherenceRelief = clamp(row5.a, 0.0, 100.0);

  return e;
}

// Rows 3 & 4 of the palette texture (material + iridescence). Sampled lazily
// from inside the shading branch since no other code path reads these fields.
fn sampleShadingMaterial(palettePhase: f32, e: ptr<function, EffectParams>) {
  // Row 3: dielectric F0, metallic, roughness, anisotropy
  let row3 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, palette_row_y(3.0)), 0.0);
  (*e).dielectricSpecular = clamp(row3.r, 0.0, 1.0);
  (*e).metallic = clamp(row3.g, 0.0, 1.0);
  (*e).roughness = clamp(row3.b, 0.02, 1.0);
  (*e).anisotropy = clamp(row3.a, 0.0, 1.0);

  // Row 4: iridescence R, G, B, strength
  let row4 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, palette_row_y(4.0)), 0.0);
  (*e).iridescenceColor = row4.rgb;
  (*e).wIridescence = clamp(row4.a, 0.0, 1.0);

  // Row 6: per-material analytic relief gain and conductor controls.
  let row6 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, palette_row_y(6.0)), 0.0);
  (*e).reliefGain = clamp(row6.r, 0.0, 2.0);
  (*e).metalReflectance = clamp(row6.g, 0.0, 2.0);
  (*e).metalEnvironmentTint = clamp(row6.b, 0.0, 1.0);
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

fn rotate_surface_vector_inverse_sincos(v: vec3<f32>, s: f32, c: f32) -> vec3<f32> {
  let xy = rotate_inverse_sincos(v.xy, s, c);
  return vec3<f32>(xy.x, xy.y, v.z);
}

fn isInsideScreen(uv: vec2<f32>, aspect: f32, neutralExtent: f32, sceneSin: f32, sceneCos: f32) -> bool {
  let xy_neutral = (uv - vec2<f32>(0.5, 0.5)) * 2.0;
  let local_rot  = xy_neutral * neutralExtent;
  let local      = rotate_inverse_sincos(local_rot, sceneSin, sceneCos);
  return abs(local.x) <= aspect && abs(local.y) <= 1.0;
}

fn skybox_reflection_uv(screenUv: vec2<f32>, reflectionDir: vec3<f32>, drift: vec2<f32>) -> vec2<f32> {
  // The environment image is anchored to the viewport. The reflected direction
  // only distorts that fixed image, so translating the fractal does not carry
  // the environment along like an albedo texture.
  let d = normalize(reflectionDir);
  let shifted = screenUv + vec2<f32>(d.x, -d.y) * 0.32 + drift;
  let mirrored = vec2<f32>(
    1.0 - abs(fract(shifted.x * 0.5) * 2.0 - 1.0),
    1.0 - abs(fract(shifted.y * 0.5) * 2.0 - 1.0)
  );
  return vec2<f32>(0.001) + mirrored * 0.998;
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

// The cached distance-gradient direction stays in the tangent plane so it can
// orient anisotropic highlights without independently deforming the normal.
fn anisotropy_tangent_from_dir(angleDir: vec2<f32>, normal: vec3<f32>) -> vec3<f32> {
  let flow = vec3<f32>(-angleDir.y, angleDir.x, 0.0);
  let projected = flow - normal * dot(flow, normal);
  let projectedLen = length(projected);
  return select(vec3<f32>(1.0, 0.0, 0.0), projected / max(projectedLen, 1e-5), projectedLen > 1e-5);
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

// Display grade for the shaded path: gentle S-contrast around photographic
// mid-grey plus a touch of saturation, in linear light, before the highlight
// roll-off. Restores the gamma-era punch the linear pipeline flattened
// (gamma-space lighting over-darkened shadows and over-saturated products)
// without re-breaking the material response.
fn display_grade(c: vec3<f32>) -> vec3<f32> {
  let contrast = clamp(parameters.gradeContrast, 0.25, 3.0);
  let sat = clamp(parameters.gradeSaturation, 0.0, 3.0);
  let pivot = 0.18;
  var g = pow(max(c, vec3<f32>(0.0)) / pivot, vec3<f32>(contrast)) * pivot;
  g = mix(vec3<f32>(luminance(g)), g, sat);
  return max(g, vec3<f32>(0.0));
}

// Soft highlight compression: identity below the knee, Reinhard shoulder above
// with an asymptote at 1 (C1-continuous at the knee). Replaces the hard clamp
// that flattened colored HDR highlights to white.
fn tonemap_highlights(c: vec3<f32>) -> vec3<f32> {
  let knee = 0.8;
  let over = max(c - vec3<f32>(knee), vec3<f32>(0.0));
  return min(c, vec3<f32>(knee)) + over / (over + vec3<f32>(1.0 - knee)) * (1.0 - knee);
}

fn fresnel_schlick_roughness(cosTheta: f32, f0: vec3<f32>, roughness: f32) -> vec3<f32> {
  let f90 = max(vec3<f32>(1.0 - roughness), f0);
  return f0 + (f90 - f0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

// Thin-film interference tint: relative phase of three representative
// wavelengths (R 610 nm, G 545 nm, B 465 nm) after a round trip through a film
// of optical thickness \`cycles\` (in green-wavelength cycles at normal
// incidence) seen at cosTheta. n≈1.45 bends the in-film path; each channel's
// phase scales as 1/λ, so the spectrum slides as the view/normal tilts.
fn thin_film_tint(cosTheta: f32, cycles: f32) -> vec3<f32> {
  let sin2 = 1.0 - cosTheta * cosTheta;
  let cosRefract = sqrt(max(1.0 - sin2 / (1.45 * 1.45), 0.0));
  let phi = cycles * cosRefract * TWO_PI * vec3<f32>(545.0 / 610.0, 1.0, 545.0 / 465.0);
  return 0.5 + 0.5 * cos(phi);
}

fn curvature_ambient_occlusion(curvature: f32, relief: f32, strength: f32) -> f32 {
  let concavity = max(curvature * relief, 0.0);
  let cavity = smoothstep(0.025, 1.35, concavity);
  let amount = 1.0 - exp(-max(strength, 0.0));
  return clamp(1.0 - cavity * amount * 0.72, 0.28, 1.0);
}

fn specular_occlusion(nDotV: f32, ao: f32, roughness: f32) -> f32 {
  return clamp(pow(max(nDotV + ao, 0.0), exp2(-16.0 * roughness - 1.0)) - 1.0 + ao, 0.0, 1.0);
}

fn luminance(color: vec3<f32>) -> f32 {
  return dot(color, vec3<f32>(0.2126, 0.7152, 0.0722));
}

fn sample_skybox(screenUv: vec2<f32>, reflectionDir: vec3<f32>, drift: vec2<f32>, lod: f32) -> vec3<f32> {
  // The skybox texture is sRGB-encoded rgba8unorm; lighting runs in linear.
  return srgb_to_linear(textureSampleLevel(skyboxTex, skyboxSampler, skybox_reflection_uv(screenUv, reflectionDir, drift), lod).rgb);
}

fn rough_skybox_reflection(screenUv: vec2<f32>, reflectionDir: vec3<f32>, roughness: f32, drift: vec2<f32>) -> vec3<f32> {
  // Ordinary mips provide a stable decorative blur. Avoid the last flat levels,
  // which turn arbitrary reflection cards into a uniform milky veil.
  let maxLod = max(f32(textureNumLevels(skyboxTex)) - 4.0, 0.0);
  return sample_skybox(screenUv, reflectionDir, drift, roughness * maxLod);
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

fn texture_mapping_value(variableId: f32, iterRaw: f32, v_smooth: f32, z: vec2<f32>, distanceHeightStored: f32, geometryAngle: f32, dx: f32, dy: f32, tess_depth: f32, disp: f32) -> f32 {
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
    return sin(geometryAngle);
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

fn texture_bump_gradient(
  tex_: texture_2d<f32>,
  v: f32,
  dist: f32,
  repeat: f32,
  mappingDx: vec2<f32>,
  mappingDy: vec2<f32>,
  strength: f32
) -> vec2<f32> {
  let safeRepeat = max(repeat, 0.1);
  let texSize = max(vec2<f32>(textureDimensions(tex_, 0)), vec2<f32>(1.0));
  let stepSize = vec2<f32>(1.0) / (safeRepeat * texSize);
  let lpx = luminance(visible_tile_rgb(tile_tessellation(tex_, v + stepSize.x, dist, repeat)));
  let lnx = luminance(visible_tile_rgb(tile_tessellation(tex_, v - stepSize.x, dist, repeat)));
  let lpy = luminance(visible_tile_rgb(tile_tessellation(tex_, v, dist + stepSize.y, repeat)));
  let lny = luminance(visible_tile_rgb(tile_tessellation(tex_, v, dist - stepSize.y, repeat)));
  let textureGradient = vec2<f32>(lpx - lnx, lpy - lny);
  let screenGradient = vec2<f32>(
    dot(textureGradient, mappingDx),
    dot(textureGradient, mappingDy)
  );
  return screenGradient * clamp(strength, 0.0, 2.0) * 0.85;
}

fn surface_normal_from_gradient(gradient: vec2<f32>) -> vec3<f32> {
  // Kept in f32: direction-coherence relief may legitimately create slopes
  // above the bounded hcol range before normalization.
  return normalize(vec3<f32>(-gradient.x, -gradient.y, 1.0));
}

fn local_height_shadow(grad: vec2<f32>, lightDir: vec3<f32>, tangent: vec3<f32>, bitangent: vec3<f32>, relief: f32, strength: f32) -> f32 {
  let lightPlane = vec2<f32>(dot(lightDir, tangent), dot(lightDir, bitangent));
  let lightPlaneLen = length(lightPlane);
  if (lightPlaneLen < 1e-4 || strength <= 0.0 || relief <= 0.0) {
    return 1.0;
  }
  let lightPlaneDir = lightPlane / lightPlaneLen;
  let uphillSlope = max(dot(grad, lightPlaneDir), 0.0) * 0.34 * relief;
  let lightSlope = max(lightDir.z / lightPlaneLen, 0.0);
  let blocker = smoothstep(lightSlope * 0.35, lightSlope + 1.25, uphillSlope);
  let amount = 1.0 - exp(-0.35 * max(strength, 0.0));
  return mix(1.0, 1.0 - blocker * 0.78, amount);
}

struct PixelState {
  iter: f32,
  zx: f32,
  zy: f32,
};

fn load_pixel_state(sourceTex: texture_2d_array<f32>, coord: vec2<i32>) -> PixelState {
  var state: PixelState;
  state.iter = textureLoad(sourceTex, coord, 0, 0).r;
  state.zx = textureLoad(sourceTex, coord, 1, 0).r;
  state.zy = textureLoad(sourceTex, coord, 2, 0).r;
  return state;
}

fn distance_height_from_values(iterVal: f32, zx: f32, zy: f32, storedHeight: f32) -> f32 {
  if (escape_nu(iterVal, zx, zy) < 0.0) {
    return -1e6;
  }

  return clamp(storedHeight, -64.0, 64.0);
}

fn normalize_geometry(stored: vec4<f32>, zoomFactor: f32) -> vec4<f32> {
  let ratio = 1.0 / max(zoomFactor, 1e-30);
  return vec4<f32>(
    clamp(stored.xy * ratio, vec2<f32>(-64.0), vec2<f32>(64.0)),
    clamp(stored.z * ratio * ratio, -64.0, 64.0),
    clamp(stored.w + log(ratio), -64.0, 64.0)
  );
}

fn smooth_escape_fraction(z_sq: f32) -> f32 {
  let log_z2 = log(max(z_sq, 1e-12));
  let logMu = max(parameters.logMu, 1e-6);
  return 1.0 - log(max(log_z2 / logMu, 1e-12)) / log(2.0);
}

fn palette(sourceTex: texture_2d_array<f32>, sourceMetadata: texture_2d<u32>, sourceCoord: vec2<i32>, sourceTexSize: vec2<i32>, iterRaw: f32, v: f32, v_smooth: f32, z: vec2<f32>, distanceHeightStored: f32, cachedGradient: vec2<f32>, cachedCurvature: f32, geometryAngle: f32, stripeAverage: f32, directionCoherence: f32, dx: f32, dy: f32, uv_screen: vec2<f32>, uv_tex: vec2<f32>, magnified: bool) -> vec3<f32> {
  let paletteRepeat = max(parameters.palettePeriod, 0.0001);
  let deep = v * 2.0;
  let heightPhaseShift = clamp(distanceHeightStored, -16.0, 16.0) * (clamp(parameters.heightPaletteShift, 0.0, 100.0) / 16.0);
  let phaseColoringShift = (1.0 - abs(fract(geometryAngle / (2.0 * 3.141592653589793)) * 2.0 - 1.0)) * parameters.phaseColoringStrength;
  let palettePhase = palettePhaseFromRaw(deep / paletteRepeat + animatedPaletteOffset() + heightPhaseShift + phaseColoringShift);

  // ── Sample all effect channels from the palette texture ──
  var fx = sampleEffects(palettePhase);

  var effTess = fx.wTessellation;
  let effWebcam = fx.wWebcam;
  let effShading = fx.wShading;

    // ── Blend color sources using overlay/opacity model ──
    // Palette is always the base. Other sources overlay on top with their weight as opacity.
    var color = fx.paletteColor * fx.wPalette;

  // Screen + Depth follows the same scalar height as the visible relief.
  // Using smooth iteration here made the texture slide along iteration bands
  // while the normal followed distance height, visually detaching both fields.
  let tess_depth = clamp(
    distance_height_from_values(iterRaw, z.x, z.y, distanceHeightStored),
    -16.0,
    16.0
  );
  let disp = parameters.displacementAmount;
  var tess_u = 0.0;
  var tess_v = 0.0;

  tess_u = texture_mapping_value(parameters.textureMappingXVariable, iterRaw, v_smooth, z, distanceHeightStored, geometryAngle, dx, dy, tess_depth, disp) * parameters.textureMappingXScale;
  tess_v = texture_mapping_value(parameters.textureMappingYVariable, iterRaw, v_smooth, z, distanceHeightStored, geometryAngle, dx, dy, tess_depth, disp) * parameters.textureMappingYScale;

  let tile_drift = vec2<f32>(parameters.textureDriftX, parameters.textureDriftY);
  let tessCoord = vec2<f32>(tess_u, tess_v) + tile_drift;



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
    // PBR runs in linear light: gamma-space products distort hues and harden
    // falloffs. Only the shaded result converts back to sRGB (with a highlight
    // roll-off) at the end of the block — the unshaded palette compositing
    // keeps its historical sRGB look.
    let colorLin = srgb_to_linear(color);
    let iridLin = srgb_to_linear(fx.iridescenceColor);
    let angleDir = vec2<f32>(cos(geometryAngle), sin(geometryAngle));
    let reliefDepth = parameters.reliefDepth * effShading;
    let relief = clamp(reliefDepth, 0.0, 2.0);
    // Log-domain control: 0 -> 0.25x, 1 -> 1x, 2 -> 4x. The multiplier is
    // strictly positive, so it can never reverse the cached analytic slope.
    let reliefGain = exp2(2.0 * (fx.reliefGain - 1.0));
    let effectiveAnalyticRelief = relief * reliefGain;
    let localShadowControl = clamp(parameters.localShadowStrength, 0.0, 10.0);
    let stripeReliefStrength = fx.wStripeRelief * effShading;
    let directionCoherenceStrength = fx.wDirectionCoherenceRelief * effShading;
    let bumpStrength = parameters.microBumpStrength * effTess;
    let mappingXId = i32(parameters.textureMappingXVariable + 0.5);
    let mappingYId = i32(parameters.textureMappingYVariable + 0.5);
    let needsDepthGradient = bumpStrength > 0.001 &&
      (mappingXId == 0 || mappingXId == 1 || mappingYId == 0 || mappingYId == 1);
    let needsStripeGradient = stripeReliefStrength > 0.001;
    let needsDirectionCoherenceGradient = directionCoherenceStrength > 0.001;
    let needsFractalGradient = effectiveAnalyticRelief > 0.001;
    var distanceHeight = 0.0;
    // Cached geometry stores the analytic derivative per source texel and the
    // branch-local analytic Laplacian. Historical relief gains are applied
    // here, after source-to-display normalization, without neighbor reads.
    var grad = cachedGradient * 24.0;
    var stripeGrad = vec2<f32>(0.0);
    var directionCoherenceGrad = vec2<f32>(0.0);
    var depthGrad = cachedGradient * 16.0;
    var heightCurvature = cachedCurvature * 6.0;
    var slope = 0.0;
    if (needsFractalGradient) {
      distanceHeight = distance_height_from_values(iterRaw, z.x, z.y, distanceHeightStored);
    }
    if (needsFractalGradient) {
      grad = clamp(grad, vec2<f32>(-6.0), vec2<f32>(6.0));
      slope = length(grad);
    }
    // Stripe/coherence relief remains effect-dependent and may read packed
    // metadata neighbours. Base distance geometry never does.
    if (needsStripeGradient || needsDirectionCoherenceGradient) {
      if (magnified) {
        orbit_metric_gradients_bilinear(
          sourceTex, sourceMetadata, uv_tex, sourceTexSize,
          stripeAverage, directionCoherence,
          needsStripeGradient, needsDirectionCoherenceGradient,
          &stripeGrad, &directionCoherenceGrad
        );
      } else {
        orbit_metric_gradients_at_coord(
          sourceTex, sourceMetadata, sourceCoord, sourceTexSize,
          stripeAverage, directionCoherence,
          needsStripeGradient, needsDirectionCoherenceGradient,
          &stripeGrad, &directionCoherenceGrad
        );
      }
    }
    var textureGradient = vec2<f32>(0.0);
    var textureMappingDx = vec2<f32>(1.0, 0.0);
    var textureMappingDy = vec2<f32>(0.0, 1.0);
    if (needsDepthGradient) {
      let boundedDepthGrad = clamp(depthGrad, vec2<f32>(-8.0), vec2<f32>(8.0));
      let depthWarpGrad = boundedDepthGrad * (4.0 * disp);
      var uGrad = vec2<f32>(1.0, 0.0);
      var vGrad = vec2<f32>(0.0, 1.0);
      if (mappingXId == 0) {
        uGrad = (vec2<f32>(1.0, 0.0) + depthWarpGrad) * parameters.textureMappingXScale;
      } else if (mappingXId == 1) {
        uGrad = (vec2<f32>(0.0, 1.0) + depthWarpGrad) * parameters.textureMappingXScale;
      }
      if (mappingYId == 0) {
        vGrad = (vec2<f32>(1.0, 0.0) + depthWarpGrad) * parameters.textureMappingYScale;
      } else if (mappingYId == 1) {
        vGrad = (vec2<f32>(0.0, 1.0) + depthWarpGrad) * parameters.textureMappingYScale;
      }
      textureMappingDx = vec2<f32>(uGrad.x, vGrad.x);
      textureMappingDy = vec2<f32>(uGrad.y, vGrad.y);
    }
    if (bumpStrength > 0.001) {
      textureGradient = texture_bump_gradient(
        tileTex,
        tessCoord.x,
        tessCoord.y,
        parameters.tessellationLevel,
        textureMappingDx,
        textureMappingDy,
        bumpStrength
      );
    }
    // One scalar surface drives one normal. The stripe phase is circular, so use
    // Hstripe = 0.5 - 0.5*cos(2πp); its derivative is π*sin(2πp), continuous at
    // the phase wrap. Coherence and texture luminance are already scalar fields.
    let stripeProfileDerivative = 3.141592653589793 * sin(TWO_PI * stripeAverage);
    let heightGradient = grad * (0.34 * effectiveAnalyticRelief);
    let stripeHeightGradient = stripeGrad * stripeProfileDerivative * (0.75 * clamp(stripeReliefStrength, 0.0, 1.0));
    let coherenceHeightGradient = directionCoherenceGrad * (0.75 * clamp(directionCoherenceStrength, 0.0, 100.0));
    // Material bumps remain independent of the analytic relief multiplier.
    let surfaceGradient = heightGradient + stripeHeightGradient + coherenceHeightGradient + textureGradient;
    let anisotropy = clamp(fx.anisotropy, 0.0, 1.0);
    let surfaceNormalLocal = surface_normal_from_gradient(surfaceGradient);
    let geometricTangentLocal = normalize(vec3<f32>(1.0, 0.0, surfaceGradient.x));
    let geometricBitangentLocal = normalize(cross(surfaceNormalLocal, geometricTangentLocal));
    let anisotropyTangentLocal = anisotropy_tangent_from_dir(angleDir, surfaceNormalLocal);
    let sceneSin = parameters.sceneSin;
    let sceneCos = parameters.sceneCos;
    // uv_neutral = R(scene) * uv_screen, therefore vectors from the neutral
    // fractal surface must use R^-1 to enter screen/world space.
    let normal = normalize(rotate_surface_vector_inverse_sincos(surfaceNormalLocal, sceneSin, sceneCos));
    let geometricTangentWorld = normalize(rotate_surface_vector_inverse_sincos(geometricTangentLocal, sceneSin, sceneCos));
    let geometricBitangentWorld = normalize(rotate_surface_vector_inverse_sincos(geometricBitangentLocal, sceneSin, sceneCos));
    let anisotropyTangent = normalize(rotate_surface_vector_inverse_sincos(anisotropyTangentLocal, sceneSin, sceneCos));
    let lightDir = vec3<f32>(parameters.lightDirX, parameters.lightDirY, parameters.lightDirZ);
    // The magnified bilinear path has no extra curvature fetch: AO fades out
    // during reprojection instead of adding four more texture reads per pixel.
    let ao = curvature_ambient_occlusion(heightCurvature, effectiveAnalyticRelief, parameters.ambientOcclusionStrength);
    let viewDir = vec3<f32>(0.0, 0.0, 1.0);
    let halfDir = normalize(lightDir + viewDir);
    let anisotropyBitangent = normalize(cross(normal, anisotropyTangent));
    let nDotL = max(dot(normal, lightDir), 0.0);
    let nDotV = max(dot(normal, viewDir), 0.0);
    let nDotH = max(dot(normal, halfDir), 0.0);
    let vDotH = max(dot(viewDir, halfDir), 0.0);
    let metallic = clamp(fx.metallic, 0.0, 1.0);
    let roughness = clamp(fx.roughness, 0.02, 1.0);
    // Gamma-era gain retuned down: in linear light the GGX peak already reads
    // brighter once encoded to sRGB. Floor is 0 so Sp\xe9culaire = 0 truly
    // disables the lobe.
    let specularGain = clamp(fx.specularPower / 19.0, 0.0, 3.4);
    // Dielectrics keep an achromatic Fresnel reflection; only conductors tint
    // their reflection with the base color.
    // Tint=0 is the legacy preset path: the historical shader used the sRGB
    // palette value directly as conductor F0. Tint=1 selects linear-light F0.
    let legacyMetalF0 = clamp(color * fx.metalReflectance, vec3<f32>(0.0), vec3<f32>(1.0));
    let physicalMetalF0 = clamp(colorLin * fx.metalReflectance, vec3<f32>(0.0), vec3<f32>(1.0));
    let metalResponse = clamp(fx.metalEnvironmentTint, 0.0, 1.0);
    let metalF0 = mix(legacyMetalF0, physicalMetalF0, metalResponse);
    let f0 = mix(vec3<f32>(fx.dielectricSpecular), metalF0, metallic);
    // Cheap multiple-scattering compensation: single-scatter GGX otherwise
    // loses too much energy as a conductor becomes rough.
    let roughMetalEnergy = vec3<f32>(1.0) + (vec3<f32>(1.0) - f0) * (metallic * roughness * 0.75 * metalResponse);
    let fresnelSpec = fresnel_schlick(vDotH, f0);
    let distribution = ggx_distribution(nDotH, roughness);
    let geometry = ggx_geometry_smith(nDotV, nDotL, roughness);
    let specularTerm = (distribution * geometry) / max(4.0 * nDotV * nDotL, 1e-5);
    let anisotropicTerm = anisotropic_highlight(normal, anisotropyTangent, anisotropyBitangent, halfDir, nDotL, nDotV, roughness);
    let specularLobe = mix(specularTerm, anisotropicTerm, anisotropy);
    let directSpecular = fresnelSpec * specularLobe * specularGain * nDotL * roughMetalEnergy;
    let diffuseColor = colorLin * (1.0 - metallic) * (1.0 - 0.35 * luminance(fresnelSpec));
    let localShadow = local_height_shadow(grad, lightDir, geometricTangentWorld, geometricBitangentWorld, effectiveAnalyticRelief, localShadowControl);
    let shadowedNDotL = nDotL * localShadow;
    let litSide = smoothstep(0.02, 0.55, shadowedNDotL);
    let reflectionSide = mix(0.08, 1.0, litSide);
    let ambientDiffuse = diffuseColor * 0.14 * ao;
    let directDiffuse = diffuseColor * 0.86 * shadowedNDotL;
    let brightness = max(fx.shadingLevel, 0.0);
    var materialColor = ambientDiffuse + directDiffuse + directSpecular * localShadow;
    let reliefAccent = clamp((1.0 - exp(-0.35 * localShadowControl)) * effShading * 2.0, 0.0, 2.0);
    let ridge = smoothstep(0.10, 1.55, slope * effectiveAnalyticRelief) * litSide * reliefAccent;
    materialColor += mix(colorLin, vec3<f32>(1.0), 0.38) * ridge * 0.10 * (1.0 - metallic * 0.45);
    let varnish = clamp(parameters.varnishStrength, 0.0, 10.0) * 0.1;
    // Clear coat is a true top layer: it is applied at the very end of this
    // block, once the base material (iridescence, SSS, wear, env… included)
    // is fully assembled.

    if (fx.wIridescence > 0.001) {
      let viewShift = smoothstep(0.04, 0.86, 1.0 - nDotV);
      let lightShift = smoothstep(0.08, 0.82, 1.0 - nDotH);
      let lightPlane = normalize(lightDir.xy + vec2<f32>(1e-5));
      let tangentPlane = vec2<f32>(-lightPlane.y, lightPlane.x);
      let orientationPlane = normalize(rotate_sincos(angleDir, sceneSin, sceneCos) + vec2<f32>(1e-5));
      let facingPearl = dot(orientationPlane, lightPlane) * 0.5 + 0.5;
      let crossPearl = dot(orientationPlane, tangentPlane) * 0.5 + 0.5;
      let orientationShift = mix(smoothstep(0.02, 0.98, facingPearl), smoothstep(0.02, 0.98, crossPearl), 0.42);
      let slopeShift = smoothstep(0.025, 1.15, slope * effectiveAnalyticRelief);
      let tiltShift = smoothstep(0.025, 0.55, length(normal.xy));
      let surfaceShift = max(slopeShift, tiltShift * 0.65);
      let pearlAngle = clamp(0.05 + viewShift * 0.12 + lightShift * 0.10 + orientationShift * 0.56 + surfaceShift * 0.32, 0.0, 1.0);
      let pearlLighting = 0.18 * ao + 0.82 * shadowedNDotL;
      let coatWeight = fx.wIridescence * pearlAngle * mix(0.45, 1.45, orientationShift) * mix(0.60, 1.25, surfaceShift) * pearlLighting * (1.0 - metallic * 0.35);
      // Thin-film interference: optical thickness varies across the surface,
      // the view/normal tilt slides the spectrum (soap-bubble hue drift).
      // iridescenceColor acts as the filter the interference plays under.
      let filmCycles = 1.3 + 2.2 * orientationShift + 1.1 * surfaceShift;
      let filmColor = iridLin * (0.30 + 1.40 * thin_film_tint(nDotV, filmCycles));
      let pearlTint = 0.18 + 0.74 * orientationShift + 0.18 * surfaceShift;
      let pearlColor = mix(colorLin, filmColor, pearlTint) * (0.78 + 0.36 * max(luminance(colorLin), 0.25));
      let pearlSheen = pow(nDotH, mix(2.5, 7.5, 1.0 - roughness)) * fx.wIridescence * pearlLighting * mix(0.45, 1.35, orientationShift);
      materialColor = mix(materialColor, pearlColor, clamp(coatWeight, 0.0, 0.92));
      // Sheen interferes at the half-vector angle (specular path through the film).
      materialColor += iridLin * thin_film_tint(vDotH, filmCycles) * pearlSheen * (0.56 + 0.92 * (1.0 - roughness)) * (1.0 - metallic * 0.25);
    }

    var envColor = vec3<f32>(0.0);
    if (fx.wSkybox > 0.001) {
      // Keep analytic relief authoritative for geometry, but give the base
      // environment reflection the derivative-angle flow that also orients
      // the anisotropic direct lobe. At full anisotropy the magnitude-2 offset
      // reproduces the historical flat-zone tilt; it never feeds AO, shadows,
      // direct lighting, iridescence slope, or clearcoat. Roughness remains
      // only an isotropic mip choice, so the base environment keeps one sample.
      let environmentReflectionGradient = surfaceGradient - angleDir * (2.0 * anisotropy);
      let environmentReflectionNormalLocal = surface_normal_from_gradient(environmentReflectionGradient);
      let environmentReflectionNormal = normalize(rotate_surface_vector_inverse_sincos(environmentReflectionNormalLocal, sceneSin, sceneCos));
      let environmentReflectDir = reflect(-viewDir, environmentReflectionNormal);
      let skyboxColor = rough_skybox_reflection(
        uv_screen,
        environmentReflectDir,
        roughness,
        vec2<f32>(parameters.skyDriftX, parameters.skyDriftY)
      );
      let environmentFresnel = fresnel_schlick_roughness(nDotV, f0, roughness);
      let neutralEnvironmentFresnel = vec3<f32>(luminance(environmentFresnel));
      let environmentTint = clamp(metalResponse * metallic, 0.0, 1.0);
      let reflectionStrength = fx.wSkybox * mix(neutralEnvironmentFresnel, environmentFresnel, environmentTint);
      let envVisibility = specular_occlusion(nDotV, ao, roughness);
      // Fresnel already carries the dielectric/metal energy difference. Do not
      // suppress polished stone a second time with a dielectric-only factor.
      envColor = skyboxColor * reflectionStrength * roughMetalEnergy * mix(1.0, 1.10, metallic) * envVisibility;
    }

    // Rim is a stylised Fresnel: same rule as the env term — matte kills it.
    let rim = pow(clamp(1.0 - nDotV, 0.0, 1.0), mix(3.5, 1.8, metallic)) * effShading * reflectionSide * mix(1.0, 0.25, roughness);
    let rimBaseColor = mix(colorLin, vec3<f32>(1.0), 0.45);
    let rimPearlColor = mix(rimBaseColor, iridLin, fx.wIridescence * 0.65);
    let rimColor = rimPearlColor * rim * (0.04 + 0.12 * fx.wSkybox + 0.07 * fx.wIridescence);

    var pbrColor = (materialColor + envColor + rimColor) * (0.55 + brightness * 0.45);
    if (varnish > 0.001) {
      // Clear coat: an achromatic dielectric film over whatever material lies
      // underneath. It never tints the base — it deepens it (wet look),
      // attenuates it by the coat Fresnel (energy conservation), and adds its
      // own untinted highlight + glossy environment mirror on top. No metallic
      // dependency: the coat is the same film regardless of the base.
      // The coat's own smoothness is independent of the base roughness: a
      // rough material under varnish still gets a glossy film on top.
      let coatFresnel = fresnel_schlick(nDotV, vec3<f32>(0.025)).x;
      let coatPower = mix(200.0, 320.0, varnish);
      let coatSpec = pow(max(nDotH, 0.0), coatPower) * (0.20 + 0.80 * shadowedNDotL) * (0.30 + 0.85 * varnish);
      var coatEnvironment = vec3<f32>(0.0);
      if (fx.wSkybox > 0.001) {
        let coatReflectDir = reflect(-viewDir, normal);
        let coatSky = rough_skybox_reflection(
          uv_screen,
          coatReflectDir,
          0.05,
          vec2<f32>(parameters.skyDriftX, parameters.skyDriftY)
        );
        coatEnvironment = coatSky * fresnel_schlick_roughness(nDotV, vec3<f32>(0.025), 0.05) * fx.wSkybox * specular_occlusion(nDotV, ao, 0.05);
      }
      // Wet look: internal reflections darken and saturate, hue untouched.
      pbrColor *= mix(vec3<f32>(1.0), clamp(pbrColor, vec3<f32>(0.0), vec3<f32>(1.0)), varnish * 0.30);
      pbrColor = pbrColor * (1.0 - coatFresnel * varnish) + (coatEnvironment + vec3<f32>(coatSpec * coatFresnel)) * varnish;
    }
    color = mix(color, linear_to_sRGB(tonemap_highlights(display_grade(pbrColor))), effShading);
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



const QUANTIZED_FIELD_MAX: f32 = 16383.0;

fn decode_support_step(metadata: u32) -> f32 {
  return exp2(f32(metadata & 0xfu));
}

fn decode_stripe_phase(metadata: u32) -> f32 {
  return f32((metadata >> 4u) & 0x3fffu) / QUANTIZED_FIELD_MAX;
}

fn stripe_phase_delta(a: f32, b: f32) -> f32 {
  return fract(a - b + 0.5) - 0.5;
}

fn decode_direction_coherence(metadata: u32) -> f32 {
  return f32((metadata >> 18u) & 0x3fffu) / QUANTIZED_FIELD_MAX;
}

struct PixelExtras {
  height: f32,
  geometryAngle: f32,
  gradient: vec2<f32>,
  curvature: f32,
  stripePhase: f32,
  directionCoherence: f32,
};

struct PixelSample {
  iter: f32,
  step: f32,
  zx: f32,
  zy: f32,
};

fn load_pixel_sample(sourceTex: texture_2d_array<f32>, sourceMetadata: texture_2d<u32>, coord: vec2<i32>) -> PixelSample {
  var pixelSample: PixelSample;
  pixelSample.iter = textureLoad(sourceTex, coord, 0, 0).r;
  pixelSample.step = decode_support_step(textureLoad(sourceMetadata, coord, 0).r);
  if (pixelSample.iter > 0.0) {
    pixelSample.zx = textureLoad(sourceTex, coord, 1, 0).r;
    pixelSample.zy = textureLoad(sourceTex, coord, 2, 0).r;
  } else {
    pixelSample.zx = 0.0;
    pixelSample.zy = 0.0;
  }
  return pixelSample;
}

fn load_pixel_extras(sourceGeometry: texture_2d<f32>, sourceMetadata: texture_2d<u32>, coord: vec2<i32>, zoomFactor: f32) -> PixelExtras {
  var extras: PixelExtras;
  let geometry = normalize_geometry(textureLoad(sourceGeometry, coord, 0), zoomFactor);
  extras.height = clamp(geometry.w, -64.0, 64.0);
  extras.gradient = geometry.xy;
  extras.curvature = geometry.z;
  extras.geometryAngle = select(0.0, atan2(geometry.y, geometry.x), dot(geometry.xy, geometry.xy) > 1e-12);
  let metadata = textureLoad(sourceMetadata, coord, 0).r;
  extras.stripePhase = decode_stripe_phase(metadata);
  extras.directionCoherence = decode_direction_coherence(metadata);
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

// ── Optional orbit-metric neighbour fetch ───────────────────────────
// Distance geometry is already cached and never enters this path. Only the
// effect-dependent stripe/coherence relief samples neighbouring metadata.
struct NeighborOrbitFields {
  valid: bool,       // in-bounds AND escaped → usable; otherwise fall back to center
  stripe: f32,
  coherence: f32,
};

fn sample_neighbor_orbit_fields(
  sourceTex: texture_2d_array<f32>,
  sourceMetadata: texture_2d<u32>,
  coord: vec2<i32>,
  texSize: vec2<i32>,
  needStripe: bool,
  needCoh: bool
) -> NeighborOrbitFields {
  var nf: NeighborOrbitFields;
  nf.valid = false;
  nf.stripe = 0.0;
  nf.coherence = 0.0;
  if (coord.x < 0 || coord.x >= texSize.x || coord.y < 0 || coord.y >= texSize.y) {
    return nf;
  }
  let state = load_pixel_state(sourceTex, coord);
  let nu = escape_nu(state.iter, state.zx, state.zy);
  if (nu < 0.0) {
    return nf;
  }
  nf.valid = true;
  if (needStripe) {
    nf.stripe = decode_stripe_phase(textureLoad(sourceMetadata, coord, 0).r);
  }
  if (needCoh) {
    nf.coherence = decode_direction_coherence(textureLoad(sourceMetadata, coord, 0).r);
  }
  return nf;
}

// Central-difference gradients of the packed orbit metrics. Outputs are left
// untouched when their corresponding effect is disabled.
fn orbit_metric_gradients_at_coord(
  sourceTex: texture_2d_array<f32>,
  sourceMetadata: texture_2d<u32>,
  coord: vec2<i32>,
  texSize: vec2<i32>,
  centerStripe: f32,
  centerCoherence: f32,
  needStripe: bool,
  needCoh: bool,
  stripeGrad: ptr<function, vec2<f32>>,
  cohGrad: ptr<function, vec2<f32>>
) {
  let nR = sample_neighbor_orbit_fields(sourceTex, sourceMetadata, coord + vec2<i32>(1, 0), texSize, needStripe, needCoh);
  let nL = sample_neighbor_orbit_fields(sourceTex, sourceMetadata, coord - vec2<i32>(1, 0), texSize, needStripe, needCoh);
  let nU = sample_neighbor_orbit_fields(sourceTex, sourceMetadata, coord + vec2<i32>(0, 1), texSize, needStripe, needCoh);
  let nD = sample_neighbor_orbit_fields(sourceTex, sourceMetadata, coord - vec2<i32>(0, 1), texSize, needStripe, needCoh);
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

// Bilinear (magnified) counterpart for the packed orbit metrics.
fn orbit_metric_gradients_bilinear(
  sourceTex: texture_2d_array<f32>,
  sourceMetadata: texture_2d<u32>,
  uv: vec2<f32>,
  texSize: vec2<i32>,
  centerStripe: f32,
  centerCoherence: f32,
  needStripe: bool,
  needCoh: bool,
  stripeGrad: ptr<function, vec2<f32>>,
  cohGrad: ptr<function, vec2<f32>>
) {
  let cell = bilinear_cell(uv, texSize);
  let n00 = sample_neighbor_orbit_fields(sourceTex, sourceMetadata, cell.base, texSize, needStripe, needCoh);
  let n10 = sample_neighbor_orbit_fields(sourceTex, sourceMetadata, cell.base + vec2<i32>(1, 0), texSize, needStripe, needCoh);
  let n01 = sample_neighbor_orbit_fields(sourceTex, sourceMetadata, cell.base + vec2<i32>(0, 1), texSize, needStripe, needCoh);
  let n11 = sample_neighbor_orbit_fields(sourceTex, sourceMetadata, cell.base + vec2<i32>(1, 1), texSize, needStripe, needCoh);
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
  sourceGeometry: texture_2d<f32>,
  sourceMetadata: texture_2d<u32>,
  sourceCoord: vec2<i32>,
  sourceTexSize: vec2<i32>,
  iter_val: f32, zx_val: f32, zy_val: f32,
  extras: PixelExtras,
  uv_screen: vec2<f32>,
  uv_neutral: vec2<f32>,
  uv_tex: vec2<f32>,
  magnified: bool,
  analyticTag: bool
) -> vec4<f32> {
  // Sentinel: iter_val < 0 => uncomputed pixel.
  if (iter_val < 0.0) {
    return vec4<f32>(0.0, 0.0, 0.0, 0.0);
  }

  // Budget exhausted: z hasn't escaped. Treat as interior — same coloring.
  // The Taylor payload is only written at escape, so the reach view marks
  // these rather than reading a stale one.
  if (iter_val > 0.0 && (zx_val * zx_val + zy_val * zy_val) < parameters.mu) {
    if (parameters.reachDebug > 0.5) { return vec4<f32>(0.10, 0.10, 0.12, 1.0); }
    return vec4<f32>(0.0, 0.0, 0.0, 0.0);
  }

  if (iter_val == 0.0) {
    if (parameters.reachDebug > 0.5) { return vec4<f32>(0.10, 0.10, 0.12, 1.0); }
    return vec4<f32>(0.0, 0.0, 0.0, 0.0);
  }

  // ── Escaped pixel ──
  var iter_v = iter_val;
  var z = vec2<f32>(zx_val, zy_val);
  var z_sq = dot(z, z);
  var mu_val = smooth_escape_fraction(z_sq);

  // Debug view 6 — analytic-AA reach. How far, IN PIXELS, this pixel's own
  // Taylor payload ẑ(δc) = z + z′\xb7δc + \xbd\xb7z″\xb7δc\xb2 stays inside tolerance; i.e.
  // how many neighbours one computed pixel could serve without iterating.
  //
  // It reads the payload the production path ALREADY stored (layers 8/11/12),
  // so it costs one texture fetch, needs no re-iteration, and by construction
  // shows the state of the very render on screen. An earlier attempt put this
  // in the standalone debug pipeline, which recomputes every pixel in its own
  // loop: slow, and free to disagree with the displayed frame.
  //
  // READ IT AS AN ESTIMATE, NOT A CERTIFICATE. ρ solves the last-RETAINED-term
  // criterion \xbd|z″|ρ\xb2 = tol\xb7|z|, which gauges the truncation by the last term
  // kept rather than the first one dropped. A rigorous radius (via z‴ or a
  // Cauchy tail) will be SMALLER. The point is the order of magnitude and the
  // spatial distribution: if this view is blue everywhere, no amount of rigour
  // rescues the idea.
  if (parameters.reachDebug > 0.5) {
    if (!analyticTag) {
      return vec4<f32>(0.15, 0.2, 0.45, 1.0);
    }
    // The "no data" cases are given DISTINCT colors rather than one grey: with
    // three different causes (wrong texture bound / z″ never accumulated /
    // payload corrupt) a single grey turns a bug report into a guessing game.
    let S = textureLoad(rawTex, sourceCoord, 8, 0).r;
    let sndLog = textureLoad(rawTex, sourceCoord, 11, 0).r;
    let sndAngle = textureLoad(rawTex, sourceCoord, 12, 0).r;
    // +marker = z″ not tracked / payload invalid. Keep mode readiness visible
    // before calling a live-table invalid payload a numerical failure.
    if (!(sndLog < 1e30)) {
      if (parameters.reachReady < 0.5) {
        return vec4<f32>(0.95, 0.5, 0.1, 1.0);  // ORANGE — not in Auto: no data
      }
      if (parameters.reachReady < 1.5) {
        return vec4<f32>(0.95, 0.85, 0.25, 1.0); // YELLOW — table still building
      }
      return vec4<f32>(0.15, 0.2, 0.45, 1.0); // DARK BLUE — unusable payload
    }
    // A tracked mathematical zero is distinct from an absent payload. z‴ then
    // sets the first omitted term, so the current payload cannot measure reach.
    if (sndLog < -1e30) {
      return vec4<f32>(0.42, 0.16, 0.30, 1.0);   // PLUM — quadratic criterion
                                                 // inoperative: reach NOT
                                                 // measurable from this payload
    }
    if (!(abs(S) < 1e6) || !(abs(sndAngle) < 1e30)) {
      return vec4<f32>(0.15, 0.2, 0.45, 1.0);
    }
    let log2Snd = sndLog * LOG2E_;
    let log2Rho = 0.5 * (log2(2.0 * REACH_TOL * max(length(z), 1e-30)) - log2Snd);
    // Match resolve.wgsl exactly: the raw source is the square neutral texture,
    // whose texel spans 2\xb7neutralExtent/neutralSize times the view half-height.
    // Omitting neutralExtent made this debug view overstate reach on wide views.
    let neutralExtent = sqrt(parameters.aspect * parameters.aspect + 1.0);
    let log2Pix = (
      log(2.0 * neutralExtent / max(f32(sourceTexSize.y), 1.0))
      + parameters.lnScale
    ) * LOG2E_;
    return vec4<f32>(reach_ramp((log2Rho - log2Pix) / 6.0), 1.0);
  }

  // Phase D analytic AA: pixels the reseed tagged analytic-OK were frozen at
  // their sample-0 state; reconstruct this sample's sub-pixel value
  // ẑ(δc) = z + z′\xb7δc + \xbd\xb7z″\xb7δc\xb2 from the raw Taylor payload
  // (layer 8 = S, 9/10 = z′ mantissa \xb7e^S,
  //  layer 11 = ln|z″|, layer 12 = arg(z″)) and
  // derive the subsample's smooth iteration / escape-z from ẑ — the log-log
  // formula extrapolates below bailout, no re-iteration. The extrapolated ν̂ is
  // then renormalized like the bilinear resolve: iter = floor(ν̂) + a synthetic
  // |z| reproducing fract(ν̂), so integer-parity coloring (zebra) and the escape
  // gates see a genuinely-escaped-at-that-iteration sample — a re-iterated
  // subsample crossing an iteration line gets iter\xb11, and the analytic one must
  // match. Cached geometry keeps the center pixel's values at sub-pixel scale;
  // the escape-z DIRECTION stays the center's (like the
  // bilinear path, no per-iteration angle doubling).
  if (analyticTag && parameters.aaAnalytic > 0.5) {
    let S = textureLoad(rawTex, sourceCoord, 8, 0).r;
    let m1 = vec2<f32>(textureLoad(rawTex, sourceCoord, 9, 0).r,
                       textureLoad(rawTex, sourceCoord, 10, 0).r);
    let sndLog = textureLoad(rawTex, sourceCoord, 11, 0).r;
    let sndAngle = textureLoad(rawTex, sourceCoord, 12, 0).r;
    // Finite guard (mirrors the reseed): a non-finite payload must fall back
    // to the center color, never feed the reconstruction.
    if (abs(S) < 1e6
      && abs(m1.x) < 1e30 && abs(m1.y) < 1e30
      && abs(sndLog) < 1e30 && abs(sndAngle) < 1e30) {
    let hat = vec2<f32>(parameters.aaJitterHatX, parameters.aaJitterHatY);
    // Exponent-summed magnitudes: e^{S+ln|δc|} stays finite where e^S alone
    // would overflow f32.
    let e1 = exp(clamp(S + parameters.aaJitterLogMag, -80.0, 80.0));
    let quadraticLogMag = log(0.5) + sndLog + 2.0 * parameters.aaJitterLogMag;
    let quadraticAngle = sndAngle + 2.0 * atan2(hat.y, hat.x);
    let quadratic = exp(quadraticLogMag)
      * vec2<f32>(cos(quadraticAngle), sin(quadraticAngle));
    let zhat = z + cmul_c(m1, hat) * e1 + quadratic;
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
  let row2 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(prelimPhase, palette_row_y(2.0)), 0.0);
  let wSmoothness = row2.g;
  nu = mix(iter_v, nu, wSmoothness);

  // ── Zebra: continuous application (darkens even iterations) ──
  let row1 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(prelimPhase, palette_row_y(1.0)), 0.0);
  let wZebra = row1.r;
  let isEvenIter = 1.0 - abs(floor(iter_v) % 2.0);

  let distanceHeightStored = extras.height;
  let geometryAngle = extras.geometryAngle;

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
      let grad = extras.gradient * 24.0;
      return vec4<f32>(debug_heat(debug_gradient_scale(length(grad))), 1.0);
    }
    return vec4<f32>(debug_heat(fract(geometryAngle / (2.0 * 3.141592653589793) + 0.5)), 1.0);
  }

  let v = nu;
  let v_smooth = nu_smooth;
  let stripePhase = extras.stripePhase;
  let directionCoherence = extras.directionCoherence;
  var color = palette(sourceTex, sourceMetadata, sourceCoord, sourceTexSize, iter_v, v, v_smooth, z, distanceHeightStored, extras.gradient, extras.curvature, geometryAngle, stripePhase, directionCoherence, uv_neutral.x, uv_neutral.y, uv_screen, uv_tex, magnified);

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
//   - cached geometry lerped linearly, stripe phase circularly, coherence
//     linearly, and provenance reduced to the coarsest contributing support.
// Non-escaped corners (sentinel, inside, budget-exhausted, no data) are
// masked out; if they dominate, the caller keeps its nearest sample.

const TWO_PI: f32 = 6.283185307179586;

struct InterpPixel {
  kind: i32, // 0 = not interpolable (caller keeps nearest), 1 = escaped interpolated
  iter: f32,
  zx: f32,
  zy: f32,
  step: f32, // finest resolution step among contributing corners (for compositing)
  extras: PixelExtras,
};

fn sample_escaped_bilinear(sourceTex: texture_2d_array<f32>, sourceGeometry: texture_2d<f32>, sourceMetadata: texture_2d<u32>, uv: vec2<f32>, texSize: vec2<i32>, zoomFactor: f32) -> InterpPixel {
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
  var geometrySum = vec4<f32>(0.0);
  var zDirSum = vec2<f32>(0.0);
  var stripeDirSum = vec2<f32>(0.0);
  var coherenceSum = 0.0;

  for (var i = 0u; i < 4u; i = i + 1u) {
    let ccoord = clamp(base + offsets[i], vec2<i32>(0), texSize - vec2<i32>(1));
    let w = weights[i];
    let citer = textureLoad(sourceTex, ccoord, 0, 0).r;
    let metadata = textureLoad(sourceMetadata, ccoord, 0).r;
    let cstep = decode_support_step(metadata);
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
    let zx = textureLoad(sourceTex, ccoord, 1, 0).r;
    let zy = textureLoad(sourceTex, ccoord, 2, 0).r;
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
    geometrySum = geometrySum + w * normalize_geometry(textureLoad(sourceGeometry, ccoord, 0), zoomFactor);
    let zLen = max(sqrt(z_sq), 1e-12);
    zDirSum = zDirSum + w * vec2<f32>(zx, zy) / zLen;
    let stripePhase = decode_stripe_phase(metadata);
    let stripeAngle = stripePhase * TWO_PI;
    stripeDirSum = stripeDirSum + w * vec2<f32>(cos(stripeAngle), sin(stripeAngle));
    coherenceSum = coherenceSum + w * decode_direction_coherence(metadata);
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
  let geometry = geometrySum * invW;
  out.extras.height = geometry.w;
  out.extras.gradient = geometry.xy;
  out.extras.curvature = geometry.z;
  out.extras.geometryAngle = select(0.0, atan2(geometry.y, geometry.x), dot(geometry.xy, geometry.xy) > 1e-12);
  out.extras.stripePhase = select(
    0.0,
    fract(atan2(stripeDirSum.y, stripeDirSum.x) / TWO_PI + 1.0),
    length(stripeDirSum) > 1e-5
  );
  out.extras.directionCoherence = clamp(coherenceSum * invW, 0.0, 1.0);
  return out;
}

// Colorize from a source texture, replacing the nearest sample with a
// pre-computed bilinear interpolation when one is available (magnified case).
fn colorize_sampled(
  sourceTex: texture_2d_array<f32>,
  sourceGeometry: texture_2d<f32>,
  sourceMetadata: texture_2d<u32>,
  coord: vec2<i32>,
  texSize: vec2<i32>,
  iter_val: f32, zx_val: f32, zy_val: f32,
  interp: InterpPixel,
  uv_tex: vec2<f32>,
  magnified: bool,
  uv_screen: vec2<f32>,
  uv_neutral: vec2<f32>,
  zoomFactor: f32,
  analyticTag: bool
) -> vec4<f32> {
  var it = iter_val;
  var zx = zx_val;
  var zy = zy_val;
  var extras = load_pixel_extras(sourceGeometry, sourceMetadata, coord, zoomFactor);
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
    sourceTex, sourceGeometry, sourceMetadata, coord, texSize, it, zx, zy, extras,
    uv_screen, uv_neutral,
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
  // ── Unified path: min-step-wins compositing ──────────────────────
  // Packed metadata stores log2 of the support step: 0 means an exact
  // step-1 pixel, positive values are progressively coarser dyadic support.
  // iter < 0 remains the independent no-data marker. The pixel with the
  // smallest effective support step wins.
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
    let liveSample = load_pixel_sample(tex, metadataTex, liveCoord);
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
    liveInterp = sample_escaped_bilinear(tex, geometryTex, metadataTex, uv_live, texSize, lzf);
  }
  liveAnalyticTag = liveAnalyticTag || parameters.reachDebug > 0.5;

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
      let frozenSample = load_pixel_sample(texFrozen, frozenMetadataTex, frozenCoord);
      frozen_iter = frozenSample.iter;
      frozenStep = frozenSample.step;
      frozen_zx = frozenSample.zx;
      frozen_zy = frozenSample.zy;
      if (frozenMagnified) {
        frozenInterp = sample_escaped_bilinear(texFrozen, frozenGeometryTex, frozenMetadataTex, uv_frozen, texSize, zf);
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
  let effectiveLiveStep = liveCompositeStep * max(lzf, 1e-30);
  let effectiveFrozenStep = frozenCompositeStep * max(zf, 1e-30);

  if (liveHasData && frozenHasData) {
    // Both have data — pick the one with finer resolution (smaller step).
    if (effectiveLiveStep <= effectiveFrozenStep) {
      let liveColor = colorize_sampled(
        tex,
        geometryTex,
        metadataTex,
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
        lzf,
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
        frozenGeometryTex,
        frozenMetadataTex,
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
        zf,
        false
      );
      return vec4<f32>(frozenColor.rgb, 1.0);
    }
  }

  if (liveHasData) {
    let liveColor = colorize_sampled(
      tex,
      geometryTex,
      metadataTex,
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
      lzf,
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
      frozenGeometryTex,
      frozenMetadataTex,
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
      zf,
      false
    );
    return vec4<f32>(frozenColor.rgb, 1.0);
  }

  // No valid pixel from either source.
  return vec4<f32>(0.05, 0.05, 0.05, 1.0);
}

// Interleaved-gradient-noise dither: \xb10.5 LSB at 8 bits, applied right before
// quantization to break banding on slow palette ramps.
fn dither_8bit(pixelCoord: vec2<f32>) -> f32 {
  let n = fract(52.9829189 * fract(dot(pixelCoord, vec2<f32>(0.06711056, 0.00583715))));
  return (n - 0.5) / 255.0;
}

// AA-accumulation path: output linear RGB with alpha = 1.0 so additive blending
// sums colors in linear space and accumulates a per-pixel sample count in alpha.
// No dither here: the accumulation target is float, present.wgsl dithers.
@fragment
fn fs_main(@location(0) fragCoord: vec2<f32>) -> @location(0) vec4<f32> {
  let c = shade_srgb(fragCoord, true);
  return vec4<f32>(srgb_to_linear(c.rgb), 1.0);
}

// Direct path: unmodified sRGB output (no linear roundtrip, no AA gate) for the
// legacy direct-to-swapchain render and the PNG/snapshot export — both 8-bit,
// hence the dither.
@fragment
fn fs_main_direct(@location(0) fragCoord: vec2<f32>, @builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  let c = shade_srgb(fragCoord, false);
  return vec4<f32>(clamp(c.rgb + vec3<f32>(dither_8bit(pos.xy)), vec3<f32>(0.0), vec3<f32>(1.0)), c.a);
}
`,va=`// Utility compute pass (all-compute-der-cartesian): ping-pong A→B port of the
// fragment brush (reproject.wgsl). Runs only on pan / clear frames; every
// texel writes ALL layers of B (full rewrite is this pass's job), then the
// engine swaps A/B and the same frame's in-place dispatch continues iteration
// on the new front texture. Reading A while writing B makes the gather race-free.
//
// Layer layout (r32float array, layer count read from the destination so the
// same shader serves every raw continuation layer):
//   0 : exact request (-1) / iteration count
//   1 : resolution step (1.0 = genuine pixel, >= 2 = resolve-copied, 0.0 = no data)
//   2 : z.x
//   3 : z.y
//   4 : dz.x (derivative real)          — escaped: DE height
//   5 : dz.y (derivative imag)          — escaped: relief angle
//   6 : ref_i + fractional stripe phase
//   7 : packed average orbit direction
//   8+: continuation extras (Cartesian derS) — copied like any other layer
//
// There is a single unfinished representation: -1 asks for an exact texel.
// Budget-exhausted pixels (iter > 0, |z|\xb2 < mu) pass through unchanged;
// continuation is the fused iteration shader's job.

struct BrushUniforms {
  aspect: f32,
  angle: f32,
  clearHistory: f32,
  shiftTexX: f32,
  shiftTexY: f32,
  dispatchOriginX: f32,
  dispatchOriginY: f32,
  _padding: f32,
};

@group(0) @binding(0) var<uniform> uni: BrushUniforms;
@group(0) @binding(1) var prevRaw: texture_2d_array<f32>;
@group(0) @binding(2) var dstRaw: texture_storage_2d_array<r32float, write>;

fn store_layer(coord: vec2<i32>, layer: i32, v: f32) {
  textureStore(dstRaw, coord, layer, vec4<f32>(v, 0.0, 0.0, 0.0));
}

// A cleared texel carries \`iter < 0\`, so the iteration kernel treats it as a
// compute request and reads none of layers 2..N before overwriting them, and
// the resolve pass leaves a sentinel corner after reading layer 0 alone. Only
// layers 0 and 1 are ever observed in that state, so the remaining eleven
// stores were pure write bandwidth — the dominant cost of a clear frame.
fn store_cleared(coord: vec2<i32>) {
  store_layer(coord, 0, -1.0);
  store_layer(coord, 1, 0.0);
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

  // The neutral square circumscribes the rotated viewport, whose corners sit
  // exactly on the inscribed circle. Rotating about the centre can therefore
  // never bring a texel outside that disc into view, at any angle — so those
  // texels are neither displayed nor computed, and reprojecting them is pure
  // bandwidth (the square is 4/pi the area of the disc).
  //
  // The disc, and NOT the current viewport's bounding box, is the safe bound
  // here: unlike the iteration kernel, this pass is what keeps out-of-frame
  // texels aligned with the view. Skipping the box would leave texels a later
  // rotation brings back unshifted, and the iteration kernel would read them as
  // valid state. Two texels of margin cover partial coverage at the rim.
  //
  // Such a texel is stamped as a plain sentinel rather than left untouched:
  // skipping the write outright would leave stale content that the resolve
  // pass could pick up as a finished anchor while climbing from a texel on the
  // rim. A sentinel is what the iteration kernel would have left there anyway
  // — it never computes outside the viewport — so this loses nothing, and it
  // costs two stores instead of the thirteen loads plus thirteen stores of a
  // full copy.
  let centre = vec2<f32>(dims) * 0.5;
  let offset = vec2<f32>(coord_out) + vec2<f32>(0.5) - centre;
  let reach = centre.x + 2.0;
  if (dot(offset, offset) > reach * reach) {
    store_cleared(coord_out);
    return;
  }

  let layers = i32(textureNumLayers(dstRaw));

  // Full reset when needed.
  if (uni.clearHistory >= 0.5) {
    store_cleared(coord_out);
    return;
  }

  // Translation reprojection — always an integer-texel gather (spike 1.1:
  // the rounded shift is also what the JS-side accounting accumulates).
  let shift = vec2<i32>(i32(round(uni.shiftTexX)), i32(round(uni.shiftTexY)));
  let coord_in = coord_out - shift;

  if (coord_in.x < 0 || coord_in.y < 0 || coord_in.x >= dims.x || coord_in.y >= dims.y) {
    store_cleared(coord_out);
    return;
  }

  store_copied(coord_out, coord_in, layers);
}
`,ka=`// Presentation-only resolve pass.
//
// Raw terminal texels are exact step-1 values. An incomplete texel may borrow
// finished dyadic support starting at step 2. The compact display ABI is:
//   values[0..2] = iteration, z.x, z.y
//   geometry      = analytic gradient.xy, Laplacian, distance height
//   metadata      = provenance exponent | stripe phase | coherence

struct ResolveUniforms {
  mu: f32,
  aspect: f32,
  angle: f32,
  _padding0: f32,
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
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0),
    vec2<f32>(-1.0, 1.0), vec2<f32>(-1.0, 1.0),
    vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0)
  );
  var out: VSOut;
  out.position = vec4<f32>(pos[vid], 0.0, 1.0);
  out.uv = (pos[vid] + vec2<f32>(1.0)) * 0.5;
  return out;
}

struct FragOut {
  @location(0) iter: f32,
  @location(1) zx: f32,
  @location(2) zy: f32,
  @location(3) geometry: vec4<f32>,
  @location(4) metadata: u32,
};

const TWO_PI: f32 = 6.283185307179586;
const LN_2: f32 = 0.6931471805599453;
const QUANTIZED_MAX: u32 = 16383u;

fn finite_scalar(value: f32) -> bool {
  return value == value && abs(value) < 3.402823e38;
}

fn load_layer(coord: vec2<i32>, layer: i32) -> f32 {
  return textureLoad(rawTex, coord, layer, 0).r;
}

fn quantize_unit(value: f32) -> u32 {
  let finite = select(0.0, value, finite_scalar(value));
  return u32(round(clamp(finite, 0.0, 1.0) * f32(QUANTIZED_MAX)));
}

fn provenance_exponent(step: u32) -> u32 {
  var value = max(step, 1u);
  var exponent = 0u;
  loop {
    if (value <= 1u || exponent >= 15u) { break; }
    value = value / 2u;
    exponent = exponent + 1u;
  }
  return exponent;
}

fn pack_metadata(step: u32, stripePhase: f32, coherence: f32) -> u32 {
  let stripe = quantize_unit(fract(stripePhase + 1.0));
  let coherenceBits = quantize_unit(coherence);
  return provenance_exponent(step) | (stripe << 4u) | (coherenceBits << 18u);
}

fn smooth_frac(zSquared: f32, logMu: f32) -> f32 {
  let logZ2 = log(max(zSquared, 1e-12));
  return clamp(1.0 - log(max(logZ2 / logMu, 1e-12)) / LN_2, 0.0, 1.0);
}

fn decode_terminal_stripe(word: u32) -> f32 {
  return f32(word & QUANTIZED_MAX) / f32(QUANTIZED_MAX);
}

fn decode_terminal_coherence(word: u32) -> f32 {
  return f32((word >> 14u) & QUANTIZED_MAX) / f32(QUANTIZED_MAX);
}

fn phase_to_dir(phase: f32) -> vec2<f32> {
  let angle = phase * TWO_PI;
  return vec2<f32>(cos(angle), sin(angle));
}

fn rotate_inverse(point: vec2<f32>, angle: f32) -> vec2<f32> {
  let c = cos(angle);
  let s = sin(angle);
  return vec2<f32>(c * point.x + s * point.y, -s * point.x + c * point.y);
}

fn is_inside_rotated_screen(xyNeutral: vec2<f32>) -> bool {
  let neutralExtent = sqrt(uni.aspect * uni.aspect + 1.0);
  let local = rotate_inverse(xyNeutral * neutralExtent, uni.angle);
  return abs(local.x) <= uni.aspect && abs(local.y) <= 1.0;
}

fn finite_or_zero(value: f32, minimum: f32, maximum: f32) -> f32 {
  return clamp(select(0.0, value, finite_scalar(value)), minimum, maximum);
}

fn load_terminal_geometry(coord: vec2<i32>) -> vec4<f32> {
  return vec4<f32>(
    finite_or_zero(load_layer(coord, 1), -64.0, 64.0),
    finite_or_zero(load_layer(coord, 5), -64.0, 64.0),
    finite_or_zero(load_layer(coord, 7), 0.0, 64.0),
    finite_or_zero(load_layer(coord, 4), -64.0, 64.0),
  );
}

fn is_finished(coord: vec2<i32>) -> bool {
  let iter = load_layer(coord, 0);
  if (iter == 0.0) { return true; }
  if (iter < 0.0) { return false; }
  let z = vec2<f32>(load_layer(coord, 2), load_layer(coord, 3));
  return dot(z, z) >= uni.mu;
}

fn load_finished(coord: vec2<i32>, step: u32) -> FragOut {
  var out: FragOut;
  out.iter = load_layer(coord, 0);
  out.zx = load_layer(coord, 2);
  out.zy = load_layer(coord, 3);
  let escaped = out.iter > 0.0;
  out.geometry = select(vec4<f32>(0.0), load_terminal_geometry(coord), escaped);
  let terminalMetrics = bitcast<u32>(load_layer(coord, 6));
  let stripe = select(0.0, decode_terminal_stripe(terminalMetrics), escaped);
  let coherence = select(0.0, decode_terminal_coherence(terminalMetrics), escaped);
  out.metadata = pack_metadata(step, stripe, coherence);
  return out;
}

fn no_data() -> FragOut {
  var out: FragOut;
  out.iter = -1.0;
  out.zx = 0.0;
  out.zy = 0.0;
  out.geometry = vec4<f32>(0.0);
  out.metadata = 0u;
  return out;
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> FragOut {
  if (!is_inside_rotated_screen(uv * 2.0 - vec2<f32>(1.0))) {
    return no_data();
  }
  let dims = vec2<u32>(textureDimensions(rawTex));
  let x = u32(clamp(uv.x * f32(dims.x), 0.0, f32(dims.x - 1u)));
  let y = u32(clamp((1.0 - uv.y) * f32(dims.y), 0.0, f32(dims.y - 1u)));
  let coord = vec2<i32>(i32(x), i32(y));

  if (is_finished(coord)) {
    return load_finished(coord, 1u);
  }

  let logMu = log(max(uni.mu, 1.0001));
  var step = 2u;
  for (var level = 0u; level < 15u; level = level + 1u) {
    if (step >= dims.x || step >= dims.y) { return no_data(); }
    let stepI = i32(step);
    let base = vec2<i32>(i32(x) - i32(x) % stepI, i32(y) - i32(y) % stepI);
    let fraction = vec2<f32>(f32(i32(x) % stepI), f32(i32(y) % stepI)) / f32(stepI);
    let weights = array<f32, 4>(
      (1.0 - fraction.x) * (1.0 - fraction.y),
      fraction.x * (1.0 - fraction.y),
      (1.0 - fraction.x) * fraction.y,
      fraction.x * fraction.y
    );
    let candidates = array<vec2<i32>, 4>(
      base, base + vec2<i32>(stepI, 0),
      base + vec2<i32>(0, stepI), base + vec2<i32>(stepI)
    );

    var escapedWeight = 0.0;
    var escapedCount = 0u;
    var insideWeight = 0.0;
    var insideCount = 0u;
    var baseIter = -1.0;
    var nuSum = 0.0;
    var geometrySum = vec4<f32>(0.0);
    var zDirectionSum = vec2<f32>(0.0);
    var stripeDirectionSum = vec2<f32>(0.0);
    var coherenceSum = 0.0;
    var bestInsideWeight = -1.0;
    var bestInsideCoord = vec2<i32>(0);
    var firstFinishedCoord = vec2<i32>(0);
    var hasFinished = false;

    for (var i = 0u; i < 4u; i = i + 1u) {
      let candidate = candidates[i];
      if (candidate.x < 0 || candidate.y < 0 || candidate.x >= i32(dims.x) || candidate.y >= i32(dims.y)
          || !is_finished(candidate)) {
        continue;
      }
      let weight = weights[i];
      let iter = load_layer(candidate, 0);
      if (!hasFinished) {
        hasFinished = true;
        firstFinishedCoord = candidate;
      }
      if (iter == 0.0) {
        insideCount = insideCount + 1u;
        insideWeight = insideWeight + weight;
        if (weight > bestInsideWeight) {
          bestInsideWeight = weight;
          bestInsideCoord = candidate;
        }
        continue;
      }

      let z = vec2<f32>(load_layer(candidate, 2), load_layer(candidate, 3));
      if (baseIter < 0.0) { baseIter = iter; }
      escapedCount = escapedCount + 1u;
      escapedWeight = escapedWeight + weight;
      nuSum = nuSum + weight * ((iter - baseIter) + smooth_frac(dot(z, z), logMu));
      geometrySum = geometrySum + weight * load_terminal_geometry(candidate);
      zDirectionSum = zDirectionSum + weight * z / max(length(z), 1e-12);
      let terminalMetrics = bitcast<u32>(load_layer(candidate, 6));
      stripeDirectionSum = stripeDirectionSum + weight * phase_to_dir(decode_terminal_stripe(terminalMetrics));
      coherenceSum = coherenceSum + weight * decode_terminal_coherence(terminalMetrics);
    }

    if (escapedCount + insideCount >= 3u) {
      if (insideWeight > escapedWeight) { return load_finished(bestInsideCoord, step); }
      if (escapedWeight > 1e-6) {
        let inverseWeight = 1.0 / escapedWeight;
        let relativeNu = nuSum * inverseWeight;
        let relativeFloor = floor(relativeNu);
        var iterOut = baseIter + relativeFloor;
        var fractionNu = clamp(relativeNu - relativeFloor, 0.0, 0.9999);
        if (iterOut < 1.0) {
          iterOut = 1.0;
          fractionNu = 0.0;
        }
        let logZ2 = logMu * exp2(1.0 - fractionNu);
        let zLength = exp(0.5 * logZ2);
        let directionLength = length(zDirectionSum);
        let direction = select(vec2<f32>(1.0, 0.0), zDirectionSum / directionLength, directionLength > 1e-5);
        let stripe = select(0.0, fract(atan2(stripeDirectionSum.y, stripeDirectionSum.x) / TWO_PI + 1.0), length(stripeDirectionSum) > 1e-5);
        var out: FragOut;
        out.iter = iterOut;
        out.zx = direction.x * zLength;
        out.zy = direction.y * zLength;
        out.geometry = clamp(
          geometrySum * inverseWeight,
          vec4<f32>(-64.0, -64.0, 0.0, -64.0),
          vec4<f32>(64.0),
        );
        out.metadata = pack_metadata(step, stripe, coherenceSum * inverseWeight);
        return out;
      }
      if (hasFinished) { return load_finished(firstFinishedCoord, step); }
    }
    step = step * 2u;
  }
  return no_data();
}
`,Qa=`// Merge a live and frozen typed display set into the frozen destination.
// The selected value, geometry, and metadata always travel together.

struct MergeUniforms {
  zoomFactor: f32,
  liveZoomFactor: f32,
  frozenShiftU: f32,
  frozenShiftV: f32,
  aspect: f32,
  angle: f32,
};

@group(0) @binding(0) var<uniform> uni: MergeUniforms;
@group(0) @binding(1) var liveValues: texture_2d_array<f32>;
@group(0) @binding(2) var liveGeometry: texture_2d<f32>;
@group(0) @binding(3) var liveMetadata: texture_2d<u32>;
@group(0) @binding(4) var frozenValues: texture_2d_array<f32>;
@group(0) @binding(5) var frozenGeometry: texture_2d<f32>;
@group(0) @binding(6) var frozenMetadata: texture_2d<u32>;

struct VSOut {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  var pos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0),
    vec2<f32>(-1.0, 1.0), vec2<f32>(-1.0, 1.0),
    vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0)
  );
  var out: VSOut;
  out.position = vec4<f32>(pos[vid], 0.0, 1.0);
  out.uv = (pos[vid] + vec2<f32>(1.0)) * 0.5;
  return out;
}

struct FragOut {
  @location(0) iter: f32,
  @location(1) zx: f32,
  @location(2) zy: f32,
  @location(3) geometry: vec4<f32>,
  @location(4) metadata: u32,
};

struct Candidate {
  valid: bool,
  iter: f32,
  zx: f32,
  zy: f32,
  geometry: vec4<f32>,
  metadata: u32,
  effectiveStep: f32,
};

fn rotate(point: vec2<f32>, angle: f32) -> vec2<f32> {
  let c = cos(angle);
  let s = sin(angle);
  return vec2<f32>(point.x * c - point.y * s, point.x * s + point.y * c);
}

fn is_inside_screen(uv: vec2<f32>, aspect: f32, neutralExtent: f32, angle: f32) -> bool {
  let local = rotate((uv - vec2<f32>(0.5)) * 2.0 * neutralExtent, -angle);
  return abs(local.x) <= aspect && abs(local.y) <= 1.0;
}

fn metadata_step(metadata: u32) -> f32 {
  return exp2(f32(metadata & 0xfu));
}

fn provenance_exponent(step: f32) -> u32 {
  if (!(step > 1.0)) { return 0u; }
  return u32(clamp(round(log2(step)), 0.0, 15.0));
}

fn metadata_with_step(metadata: u32, step: f32) -> u32 {
  return (metadata & 0xfffffff0u) | provenance_exponent(step);
}

fn normalize_geometry(geometry: vec4<f32>, zoomFactor: f32) -> vec4<f32> {
  let ratio = 1.0 / max(zoomFactor, 1e-30);
  return vec4<f32>(
    clamp(geometry.xy * ratio, vec2<f32>(-64.0), vec2<f32>(64.0)),
    clamp(geometry.z * ratio * ratio, 0.0, 64.0),
    clamp(geometry.w + log(ratio), -64.0, 64.0)
  );
}

fn empty_candidate() -> Candidate {
  var candidate: Candidate;
  candidate.valid = false;
  candidate.iter = -1.0;
  candidate.zx = 0.0;
  candidate.zy = 0.0;
  candidate.geometry = vec4<f32>(0.0);
  candidate.metadata = 0u;
  candidate.effectiveStep = 1e30;
  return candidate;
}

fn load_candidate(
  values: texture_2d_array<f32>,
  geometryTex: texture_2d<f32>,
  metadataTex: texture_2d<u32>,
  coord: vec2<i32>,
  zoomFactor: f32
) -> Candidate {
  var candidate = empty_candidate();
  let iter = textureLoad(values, coord, 0, 0).r;
  if (iter < 0.0) { return candidate; }
  let metadata = textureLoad(metadataTex, coord, 0).r;
  let effectiveStep = metadata_step(metadata) * max(zoomFactor, 1e-30);
  candidate.valid = true;
  candidate.iter = iter;
  candidate.zx = textureLoad(values, coord, 1, 0).r;
  candidate.zy = textureLoad(values, coord, 2, 0).r;
  candidate.geometry = normalize_geometry(textureLoad(geometryTex, coord, 0), zoomFactor);
  candidate.metadata = metadata_with_step(metadata, effectiveStep);
  candidate.effectiveStep = effectiveStep;
  return candidate;
}

fn emit(candidate: Candidate) -> FragOut {
  var out: FragOut;
  out.iter = candidate.iter;
  out.zx = candidate.zx;
  out.zy = candidate.zy;
  out.geometry = candidate.geometry;
  out.metadata = candidate.metadata;
  return out;
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> FragOut {
  let dims = vec2<i32>(textureDimensions(liveValues));
  let dimsF = vec2<f32>(dims);
  let neutralExtent = sqrt(uni.aspect * uni.aspect + 1.0);

  let liveUv = (uv - vec2<f32>(0.5)) / uni.liveZoomFactor + vec2<f32>(0.5);
  let liveInBounds = select(
    liveUv.x >= 0.0 && liveUv.x <= 1.0 && liveUv.y >= 0.0 && liveUv.y <= 1.0,
    is_inside_screen(liveUv, uni.aspect, neutralExtent, uni.angle),
    uni.liveZoomFactor < 1.0
  );
  var live = empty_candidate();
  if (liveInBounds) {
    let coord = vec2<i32>(
      i32(clamp(liveUv.x * dimsF.x, 0.0, dimsF.x - 1.0)),
      i32(clamp((1.0 - liveUv.y) * dimsF.y, 0.0, dimsF.y - 1.0))
    );
    live = load_candidate(liveValues, liveGeometry, liveMetadata, coord, uni.liveZoomFactor);
  }

  let frozenUv = (uv - vec2<f32>(0.5)) / uni.zoomFactor + vec2<f32>(0.5)
                 - vec2<f32>(uni.frozenShiftU, uni.frozenShiftV);
  let frozenInBounds = select(
    frozenUv.x >= 0.0 && frozenUv.x <= 1.0 && frozenUv.y >= 0.0 && frozenUv.y <= 1.0,
    is_inside_screen(frozenUv, uni.aspect, neutralExtent, uni.angle),
    uni.zoomFactor < 1.0
  );
  var frozen = empty_candidate();
  if (frozenInBounds) {
    let coord = vec2<i32>(
      i32(clamp(frozenUv.x * dimsF.x, 0.0, dimsF.x - 1.0)),
      i32(clamp((1.0 - frozenUv.y) * dimsF.y, 0.0, dimsF.y - 1.0))
    );
    frozen = load_candidate(frozenValues, frozenGeometry, frozenMetadata, coord, uni.zoomFactor);
  }

  if (live.valid && (!frozen.valid || live.effectiveStep <= frozen.effectiveStep)) {
    return emit(live);
  }
  if (frozen.valid) { return emit(frozen); }
  return emit(empty_candidate());
}
`,ya=`// AA present pass: resolve the linear-space accumulation texture to the swapchain.
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

// Interleaved-gradient-noise dither: \xb10.5 LSB at 8 bits, applied after the
// linear→sRGB conversion (the last step before swapchain quantization) to
// break banding on slow gradients.
fn dither_8bit(pixelCoord: vec2<f32>) -> f32 {
  let n = fract(52.9829189 * fract(dot(pixelCoord, vec2<f32>(0.06711056, 0.00583715))));
  return (n - 0.5) / 255.0;
}

@fragment
fn fs_main(@builtin(position) fragPos: vec4<f32>) -> @location(0) vec4<f32> {
  let coord = vec2<i32>(i32(fragPos.x), i32(fragPos.y));
  let acc = textureLoad(accumTex, coord, 0);
  let n = max(acc.a, 1.0);
  let lin = acc.rgb / n;
  return vec4<f32>(linear_to_sRGB(lin) + vec3<f32>(dither_8bit(fragPos.xy)), 1.0);
}
`,xa=`// One-shot bake of the per-neutral-texel AA sample-count target, fusing three
// aliasing predictors IN TARGET SPACE (max of per-predictor ramps — design
// D-contrast):
//
//   1. DE ramp (geometry): distance estimate from the converged neutral
//      texture — the only predictor that sees sub-pixel features invisible in
//      the 1:1 render (filaments between samples).
//   2. Contrast ramp: 3\xd73 Sobel on the luma of the converged, colorized
//      sample-0 image (the accumulation texture right after the first
//      composite) — catches palette banding, zebra, stripe/trap/texture edges
//      and shading contours the DE cannot see, on BOTH sides of the interior
//      boundary (no interior clamp).
//   3. Moir\xe9 saturation: where the palette phase advances faster than Nyquist
//      per screen pixel, edge magnitude under-reports the aliasing — force the
//      full sample budget (averaging toward the palette mean is the correct
//      output there).
//
// Typed display input: values layers are iter/z.x/z.y and geometry.w is the
// cached distance height.
//
// Result: target sample count in [1, antialiasLevel].

struct AaParams {
  antialiasLevel: f32,
  aaSampleIndex: f32,   // unused here; shared buffer with the reseed pass
  screenHeightPx: f32,  // device-pixel screen height (1 neutral texel == 1 device px)
  aaLogDelta: f32,      // unused here; shared buffer with the reseed pass
  aaAnalytic: f32,      // unused here; shared buffer with the reseed pass
  aspect: f32,          // screen aspect (w/h) — neutral→screen projection
  sceneSin: f32,        // scene rotation — neutral→screen projection
  sceneCos: f32,
  screenWidthPx: f32,   // device-pixel screen width
  palettePeriod: f32,   // palette period in ν\xb72 units (color.wgsl phase = ν\xb72/period)
  mu: f32,              // escape radius\xb2 (ν computation)
  logMu: f32,           // ln(mu)
  aaContrast: f32,      // 1 = contrast + moir\xe9 predictors enabled
  aaFull: f32,          // 1 = FULL AA: every texel gets the whole budget (A/B vs adaptive)
  _pad1: f32,
  _pad2: f32,
};

// Boundary-distance ramp (device px): full sample count within R_FULL, tapering
// to 1 sample by R_OUT. Distance to the set boundary is recovered exactly as
// de_px = (screenHeightPx / 2) * exp(-height), since height = ln((H/2) / DE_px).
const R_FULL: f32 = 1.0;
const R_OUT: f32 = 6.0;

// Sobel ramp (sRGB channel units; a full-contrast step edge reads |g| ≈ 4).
// The magnitude is the MAX over the R/G/B channel gradients — iteration
// banding between iso-luma hues is invisible to a luma-only Sobel. The ramp
// saturates early (EDGE_HI 0.8): a hard band edge needs the full budget to
// resolve cleanly under the box kernel; mid-ramp counts leave visible steps.
// Tunable constants first — field round decides if they need exposure.
const EDGE_LO: f32 = 0.08;
const EDGE_HI: f32 = 0.8;

// Moir\xe9: palette phase advance per screen pixel above which the region
// saturates to the full budget (Nyquist = half a period per pixel).
const NYQUIST_PHASE_STEP: f32 = 0.5;

@group(0) @binding(0) var valuesTex: texture_2d_array<f32>;
@group(0) @binding(1) var geometryTex: texture_2d<f32>;
@group(0) @binding(2) var dst: texture_storage_2d<r32float, write>;
@group(0) @binding(3) var<uniform> params: AaParams;
// Sample-0 composite: linear RGB, alpha = 1 (single accumulated sample),
// device-pixel resolution.
@group(0) @binding(4) var accumTex: texture_2d<f32>;

fn linear_to_srgb_vec(c: vec3<f32>) -> vec3<f32> {
  let cl = max(c, vec3<f32>(0.0));
  let cutoff = cl <= vec3<f32>(0.0031308);
  let low = cl * 12.92;
  let high = vec3<f32>(1.055) * pow(cl, vec3<f32>(1.0 / 2.4)) - vec3<f32>(0.055);
  return select(high, low, cutoff);
}

// sRGB-encoded color of the sample-0 composite at a (clamped) screen texel.
// The accumulator stores LINEAR sums (sample 0 has alpha = 1, so .rgb is the
// linear color); the Sobel thresholds are perceptual → encode to sRGB.
fn srgb_at(px: vec2<i32>, dim: vec2<i32>) -> vec3<f32> {
  let p = clamp(px, vec2<i32>(0), dim - vec2<i32>(1));
  return linear_to_srgb_vec(textureLoad(accumTex, p, 0).rgb);
}

// Smooth iteration ν of a neutral texel; −1 when not escaped/no data.
fn nu_at(coord: vec2<i32>, dim: vec2<i32>) -> f32 {
  if (coord.x < 0 || coord.x >= dim.x || coord.y < 0 || coord.y >= dim.y) {
    return -1.0;
  }
  let iter = textureLoad(valuesTex, coord, 0, 0).r;
  if (iter <= 0.0) {
    return -1.0;
  }
  let zx = textureLoad(valuesTex, coord, 1, 0).r;
  let zy = textureLoad(valuesTex, coord, 2, 0).r;
  let z_sq = zx * zx + zy * zy;
  if (z_sq < params.mu) {
    return -1.0;
  }
  let logMu = max(params.logMu, 1e-6);
  let frac = clamp(1.0 - log(max(log(max(z_sq, 1e-12)) / logMu, 1e-12)) / log(2.0), 0.0, 1.0);
  return iter + frac;
}

@compute @workgroup_size(16, 16)
fn cs_main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dim = textureDimensions(dst);
  if (gid.x >= dim.x || gid.y >= dim.y) {
    return;
  }
  let coord = vec2<i32>(i32(gid.x), i32(gid.y));
  let iter = textureLoad(valuesTex, coord, 0, 0).r;
  let height = textureLoad(geometryTex, coord, 0).w;
  let level = max(params.antialiasLevel, 1.0);
  let dimI = vec2<i32>(i32(dim.x), i32(dim.y));

  // Full AA (adaptive off): uniform budget everywhere — the DPR\xd7N-style
  // reference for A/B against the adaptive predictors.
  if (params.aaFull > 0.5) {
    textureStore(dst, coord, vec4<f32>(level, 0.0, 0.0, 0.0));
    return;
  }

  var tgt = 1.0;

  // ── 1. DE ramp (escaped pixels carry a meaningful exterior distance) ──
  if (iter > 0.0) {
    let de_px = (params.screenHeightPx * 0.5) * exp(-height);
    let t = 1.0 - smoothstep(R_FULL, R_OUT, de_px);
    tgt = max(tgt, 1.0 + t * (level - 1.0));
  }

  if (params.aaContrast > 0.5) {
    // Neutral texel → screen texel (inverse of shade_srgb's screen→neutral).
    let texSizeF = vec2<f32>(f32(dim.x), f32(dim.y));
    let uv_neutral = vec2<f32>(
      (f32(coord.x) + 0.5) / texSizeF.x,
      1.0 - (f32(coord.y) + 0.5) / texSizeF.y,
    );
    let xy_neutral = uv_neutral * 2.0 - vec2<f32>(1.0);
    let neutralExtent = sqrt(params.aspect * params.aspect + 1.0);
    let local_rot = xy_neutral * neutralExtent;
    // rotate_inverse_sincos from color.wgsl.
    let local = vec2<f32>(
      params.sceneCos * local_rot.x + params.sceneSin * local_rot.y,
      -params.sceneSin * local_rot.x + params.sceneCos * local_rot.y,
    );
    let onScreen = abs(local.x) <= params.aspect && abs(local.y) <= 1.0;
    if (onScreen) {
      // ── 2. Contrast ramp (Sobel on the colorized sample 0) ──
      let uv_screen = vec2<f32>(local.x / max(params.aspect, 1e-6), local.y) * 0.5 + vec2<f32>(0.5);
      let accumDim = vec2<i32>(textureDimensions(accumTex));
      let spx = vec2<i32>(
        i32(clamp(uv_screen.x * params.screenWidthPx, 0.0, params.screenWidthPx - 1.0)),
        i32(clamp((1.0 - uv_screen.y) * params.screenHeightPx, 0.0, params.screenHeightPx - 1.0)),
      );
      let c00 = srgb_at(spx + vec2<i32>(-1, -1), accumDim);
      let c10 = srgb_at(spx + vec2<i32>(0, -1), accumDim);
      let c20 = srgb_at(spx + vec2<i32>(1, -1), accumDim);
      let c01 = srgb_at(spx + vec2<i32>(-1, 0), accumDim);
      let c21 = srgb_at(spx + vec2<i32>(1, 0), accumDim);
      let c02 = srgb_at(spx + vec2<i32>(-1, 1), accumDim);
      let c12 = srgb_at(spx + vec2<i32>(0, 1), accumDim);
      let c22 = srgb_at(spx + vec2<i32>(1, 1), accumDim);
      // Per-channel Sobel; edge magnitude = max over R/G/B so iso-luma hue
      // banding still registers.
      let gxv = (c20 + 2.0 * c21 + c22) - (c00 + 2.0 * c01 + c02);
      let gyv = (c02 + 2.0 * c12 + c22) - (c00 + 2.0 * c10 + c20);
      let gv = sqrt(gxv * gxv + gyv * gyv);
      let g = max(gv.r, max(gv.g, gv.b));
      let tc = smoothstep(EDGE_LO, EDGE_HI, g);
      tgt = max(tgt, 1.0 + tc * (level - 1.0));

      // ── 3. Moir\xe9 saturation (palette phase frequency past Nyquist) ──
      // color.wgsl: phase = ν\xb72 / palettePeriod → phase step per texel =
      // |∇ν|\xb72 / period. Central differences on valid escaped neighbours;
      // the boundary-divergent ν band is already covered by the DE ramp.
      let nuC = nu_at(coord, dimI);
      if (nuC >= 0.0) {
        let nR = nu_at(coord + vec2<i32>(1, 0), dimI);
        let nL = nu_at(coord - vec2<i32>(1, 0), dimI);
        let nU = nu_at(coord + vec2<i32>(0, 1), dimI);
        let nD = nu_at(coord - vec2<i32>(0, 1), dimI);
        let gnx = 0.5 * (select(nuC, nR, nR >= 0.0) - select(nuC, nL, nL >= 0.0));
        let gny = 0.5 * (select(nuC, nU, nU >= 0.0) - select(nuC, nD, nD >= 0.0));
        let phaseStep = sqrt(gnx * gnx + gny * gny) * 2.0 / max(params.palettePeriod, 1e-4);
        if (phaseStep > NYQUIST_PHASE_STEP) {
          tgt = level;
        }
      }
    }
  }

  textureStore(dst, coord, vec4<f32>(clamp(round(tgt), 1.0, level), 0.0, 0.0, 0.0));
}
`,wa=`// Selective AA reseed (Stage B): stamp iter = -1 (a fresh-compute request) on the
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
  aspect: f32,          // unused here; shared buffer with the target bake pass
  sceneSin: f32,
  sceneCos: f32,
  screenWidthPx: f32,
  palettePeriod: f32,
  mu: f32,
  logMu: f32,
  aaContrast: f32,
  aaFull: f32,
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
// view above): 0 = S, 1/2 = z′ mantissa, 3 = ln|z″|, 4 = arg(z″).
@group(0) @binding(3) var payloadTex: texture_2d_array<f32>;
@group(0) @binding(4) var<storage, read_write> stats: FrontierStats;

const LN_MARGIN_THRESHOLD: f32 = 1.6094379; // ln 5

fn log_complex_length_floor(v: vec2<f32>, floorValue: f32) -> f32 {
  let scale = max(abs(v.x), abs(v.y));
  if (!(scale > floorValue)) {
    return log(floorValue);
  }
  let unit = v / scale;
  return log(scale) + 0.5 * log(dot(unit, unit));
}

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
        let sndLog = textureLoad(payloadTex, coord, 3, 0).r;
        let sndAngle = textureLoad(payloadTex, coord, 4, 0).r;
        // Margin in log space: ln|z′| − ln|z″| − ln δ > ln 5.
        // z′ = m1\xb7exp(s); z″ already stores its independent ln-magnitude.
        // Finite guard first: max() LAUNDERS NaN on Metal (max(NaN, x) = x),
        // which once turned a NaN payload into an auto-passing margin. |x| < big is
        // false for both NaN and inf without relying on x != x semantics.
        let finiteOk = abs(s) < 1e6
          && abs(m1.x) < 1e30 && abs(m1.y) < 1e30
          && abs(sndLog) < 1e30 && abs(sndAngle) < 1e30;
        let marginLog = log_complex_length_floor(m1, 1e-38)
                      + s - sndLog - params.aaLogDelta;
        if (finiteOk && max(abs(m1.x), abs(m1.y)) > 0.0
            && marginLog > LN_MARGIN_THRESHOLD) {
          textureStore(aaTargetTex, coord, vec4<f32>(tgt + 0.5, 0.0, 0.0, 0.0));
          return;
        }
      }
    }
    atomicAdd(&stats.stamped, 1u);
    textureStore(rawIterTex, coord, vec4<f32>(-1.0, 0.0, 0.0, 0.0));
  }
}
`,Ea=async(a={},e)=>{let i;if(e.startsWith("data:")){const s=e.replace(/^data:.*?base64,/,"");let r;if(typeof Buffer=="function"&&typeof Buffer.from=="function")r=Buffer.from(s,"base64");else if(typeof atob=="function"){const l=atob(s);r=new Uint8Array(l.length);for(let t=0;t<l.length;t++)r[t]=l.charCodeAt(t)}else throw new Error("Cannot decode base64-encoded data URL");i=await WebAssembly.instantiate(r,a)}else{const s=await fetch(e),r=s.headers.get("Content-Type")||"";if("instantiateStreaming"in WebAssembly&&r.startsWith("application/wasm"))i=await WebAssembly.instantiateStreaming(s,a);else{const l=await s.arrayBuffer();i=await WebAssembly.instantiate(l,a)}}return i.instance.exports};let d;function Sa(a){d=a}let Et=null;function Rt(){return(Et===null||Et.byteLength===0)&&(Et=new Uint8Array(d.memory.buffer)),Et}let Vt=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0});Vt.decode();const Ma=0x7ff00000;let Wt=0;function La(a,e){return Wt+=e,Wt>=Ma&&(Vt=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0}),Vt.decode(),Wt=e),Vt.decode(Rt().subarray(a,a+e))}function ki(a,e){return a=a>>>0,La(a,e)}let qe=null;function Aa(){return(qe===null||qe.buffer.detached===!0||qe.buffer.detached===void 0&&qe.buffer!==d.memory.buffer)&&(qe=new DataView(d.memory.buffer)),qe}function Je(a,e){a=a>>>0;const i=Aa(),s=[];for(let r=a;r<a+4*e;r+=4)s.push(d.__wbindgen_export_0.get(i.getUint32(r,!0)));return d.__externref_drop_slice(a,e),s}let St=null;function Fa(){return(St===null||St.byteLength===0)&&(St=new Float64Array(d.memory.buffer)),St}function Bn(a,e){return a=a>>>0,Fa().subarray(a/8,a/8+e)}let se=0;const ct=new TextEncoder;"encodeInto"in ct||(ct.encodeInto=function(a,e){const i=ct.encode(a);return e.set(i),{read:a.length,written:i.length}});function fe(a,e,i){if(i===void 0){const c=ct.encode(a),p=e(c.length,1)>>>0;return Rt().subarray(p,p+c.length).set(c),se=c.length,p}let s=a.length,r=e(s,1)>>>0;const l=Rt();let t=0;for(;t<s;t++){const c=a.charCodeAt(t);if(c>127)break;l[r+t]=c}if(t!==s){t!==0&&(a=a.slice(t)),r=i(r,s,s=t+a.length*3,1)>>>0;const c=Rt().subarray(r+t,r+s),p=ct.encodeInto(a,c);t+=p.written,r=i(r,s,t,1)>>>0}return se=t,r}function Be(a){return a==null}const Rn=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(a=>d.__wbg_blabufferinfo_free(a>>>0,1));class ut{static __wrap(e){e=e>>>0;const i=Object.create(ut.prototype);return i.__wbg_ptr=e,Rn.register(i,i.__wbg_ptr,i),i}__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,Rn.unregister(this),e}free(){const e=this.__destroy_into_raw();d.__wbg_blabufferinfo_free(e,0)}get ptr(){return d.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr)>>>0}set ptr(e){d.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr,e)}get count(){return d.__wbg_get_blabufferinfo_count(this.__wbg_ptr)>>>0}set count(e){d.__wbg_set_blabufferinfo_count(this.__wbg_ptr,e)}get levels_ptr(){return d.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr)>>>0}set levels_ptr(e){d.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr,e)}get level_count(){return d.__wbg_get_blabufferinfo_level_count(this.__wbg_ptr)>>>0}set level_count(e){d.__wbg_set_blabufferinfo_level_count(this.__wbg_ptr,e)}}Symbol.dispose&&(ut.prototype[Symbol.dispose]=ut.prototype.free);typeof FinalizationRegistry>"u"||new FinalizationRegistry(a=>d.__wbg_blalevel_free(a>>>0,1));typeof FinalizationRegistry>"u"||new FinalizationRegistry(a=>d.__wbg_blastep_free(a>>>0,1));const Vn=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(a=>d.__wbg_incrementalunifiedbufferinfo_free(a>>>0,1));class ht{static __wrap(e){e=e>>>0;const i=Object.create(ht.prototype);return i.__wbg_ptr=e,Vn.register(i,i.__wbg_ptr,i),i}__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,Vn.unregister(this),e}free(){const e=this.__destroy_into_raw();d.__wbg_incrementalunifiedbufferinfo_free(e,0)}get ranges_ptr(){return d.__wbg_get_incrementalunifiedbufferinfo_ranges_ptr(this.__wbg_ptr)>>>0}set ranges_ptr(e){d.__wbg_set_incrementalunifiedbufferinfo_ranges_ptr(this.__wbg_ptr,e)}get range_count(){return d.__wbg_get_incrementalunifiedbufferinfo_range_count(this.__wbg_ptr)>>>0}set range_count(e){d.__wbg_set_incrementalunifiedbufferinfo_range_count(this.__wbg_ptr,e)}get coeffs_ptr(){return d.__wbg_get_incrementalunifiedbufferinfo_coeffs_ptr(this.__wbg_ptr)>>>0}set coeffs_ptr(e){d.__wbg_set_incrementalunifiedbufferinfo_coeffs_ptr(this.__wbg_ptr,e)}get coeffs_count(){return d.__wbg_get_incrementalunifiedbufferinfo_coeffs_count(this.__wbg_ptr)>>>0}set coeffs_count(e){d.__wbg_set_blastep_d_exp(this.__wbg_ptr,e)}get radii_ptr(){return d.__wbg_get_incrementalunifiedbufferinfo_radii_ptr(this.__wbg_ptr)>>>0}set radii_ptr(e){d.__wbg_set_incrementalunifiedbufferinfo_radii_ptr(this.__wbg_ptr,e)}get radii_count(){return d.__wbg_get_incrementalunifiedbufferinfo_radii_count(this.__wbg_ptr)>>>0}set radii_count(e){d.__wbg_set_incrementalunifiedbufferinfo_radii_count(this.__wbg_ptr,e)}get certificates_ptr(){return d.__wbg_get_incrementalunifiedbufferinfo_certificates_ptr(this.__wbg_ptr)>>>0}set certificates_ptr(e){d.__wbg_set_incrementalunifiedbufferinfo_certificates_ptr(this.__wbg_ptr,e)}get certificates_count(){return d.__wbg_get_incrementalunifiedbufferinfo_certificates_count(this.__wbg_ptr)>>>0}set certificates_count(e){d.__wbg_set_incrementalunifiedbufferinfo_certificates_count(this.__wbg_ptr,e)}get certificate_version(){return d.__wbg_get_incrementalunifiedbufferinfo_certificate_version(this.__wbg_ptr)>>>0}set certificate_version(e){d.__wbg_set_incrementalunifiedbufferinfo_certificate_version(this.__wbg_ptr,e)}get certificate_words_per_block(){return d.__wbg_get_incrementalunifiedbufferinfo_certificate_words_per_block(this.__wbg_ptr)>>>0}set certificate_words_per_block(e){d.__wbg_set_incrementalunifiedbufferinfo_certificate_words_per_block(this.__wbg_ptr,e)}get reference_log2_dc(){return d.__wbg_get_incrementalunifiedbufferinfo_reference_log2_dc(this.__wbg_ptr)}set reference_log2_dc(e){d.__wbg_set_incrementalunifiedbufferinfo_reference_log2_dc(this.__wbg_ptr,e)}get covered_orbit_len(){return d.__wbg_get_incrementalunifiedbufferinfo_covered_orbit_len(this.__wbg_ptr)>>>0}set covered_orbit_len(e){d.__wbg_set_incrementalunifiedbufferinfo_covered_orbit_len(this.__wbg_ptr,e)}get published_orbit_len(){return d.__wbg_get_incrementalunifiedbufferinfo_published_orbit_len(this.__wbg_ptr)>>>0}set published_orbit_len(e){d.__wbg_set_incrementalunifiedbufferinfo_published_orbit_len(this.__wbg_ptr,e)}get reset(){return d.__wbg_get_incrementalunifiedbufferinfo_reset(this.__wbg_ptr)>>>0}set reset(e){d.__wbg_set_incrementalunifiedbufferinfo_reset(this.__wbg_ptr,e)}get has_more(){return d.__wbg_get_incrementalunifiedbufferinfo_has_more(this.__wbg_ptr)>>>0}set has_more(e){d.__wbg_set_incrementalunifiedbufferinfo_has_more(this.__wbg_ptr,e)}get cumulative_merges(){return d.__wbg_get_incrementalunifiedbufferinfo_cumulative_merges(this.__wbg_ptr)>>>0}set cumulative_merges(e){d.__wbg_set_incrementalunifiedbufferinfo_cumulative_merges(this.__wbg_ptr,e)}get cumulative_coefficients(){return d.__wbg_get_incrementalunifiedbufferinfo_cumulative_coefficients(this.__wbg_ptr)>>>0}set cumulative_coefficients(e){d.__wbg_set_incrementalunifiedbufferinfo_cumulative_coefficients(this.__wbg_ptr,e)}get cumulative_envelopes(){return d.__wbg_get_incrementalunifiedbufferinfo_cumulative_envelopes(this.__wbg_ptr)>>>0}set cumulative_envelopes(e){d.__wbg_set_incrementalunifiedbufferinfo_cumulative_envelopes(this.__wbg_ptr,e)}get peak_retained_bytes(){return d.__wbg_get_incrementalunifiedbufferinfo_peak_retained_bytes(this.__wbg_ptr)>>>0}set peak_retained_bytes(e){d.__wbg_set_incrementalunifiedbufferinfo_peak_retained_bytes(this.__wbg_ptr,e)}get cumulative_merge_coefficients_ms(){return d.__wbg_get_incrementalunifiedbufferinfo_cumulative_merge_coefficients_ms(this.__wbg_ptr)}set cumulative_merge_coefficients_ms(e){d.__wbg_set_incrementalunifiedbufferinfo_cumulative_merge_coefficients_ms(this.__wbg_ptr,e)}get cumulative_envelope_ms(){return d.__wbg_get_incrementalunifiedbufferinfo_cumulative_envelope_ms(this.__wbg_ptr)}set cumulative_envelope_ms(e){d.__wbg_set_incrementalunifiedbufferinfo_cumulative_envelope_ms(this.__wbg_ptr,e)}}Symbol.dispose&&(ht.prototype[Symbol.dispose]=ht.prototype.free);typeof FinalizationRegistry>"u"||new FinalizationRegistry(a=>d.__wbg_incrementalunifiedrangeinfo_free(a>>>0,1));const Hn=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(a=>d.__wbg_jetbufferinfo_free(a>>>0,1));class ft{static __wrap(e){e=e>>>0;const i=Object.create(ft.prototype);return i.__wbg_ptr=e,Hn.register(i,i.__wbg_ptr,i),i}__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,Hn.unregister(this),e}free(){const e=this.__destroy_into_raw();d.__wbg_jetbufferinfo_free(e,0)}get coeffs_ptr(){return d.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr)>>>0}set coeffs_ptr(e){d.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr,e)}get coeffs_count(){return d.__wbg_get_blabufferinfo_count(this.__wbg_ptr)>>>0}set coeffs_count(e){d.__wbg_set_blabufferinfo_count(this.__wbg_ptr,e)}get radii_ptr(){return d.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr)>>>0}set radii_ptr(e){d.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr,e)}get radii_count(){return d.__wbg_get_blabufferinfo_level_count(this.__wbg_ptr)>>>0}set radii_count(e){d.__wbg_set_blabufferinfo_level_count(this.__wbg_ptr,e)}get levels_ptr(){return d.__wbg_get_incrementalunifiedrangeinfo_payload_offset(this.__wbg_ptr)>>>0}set levels_ptr(e){d.__wbg_set_blastep_ab_exp(this.__wbg_ptr,e)}get level_count(){return d.__wbg_get_incrementalunifiedrangeinfo_committed_count(this.__wbg_ptr)>>>0}set level_count(e){d.__wbg_set_incrementalunifiedrangeinfo_committed_count(this.__wbg_ptr,e)}}Symbol.dispose&&(ft.prototype[Symbol.dispose]=ft.prototype.free);const Pn=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(a=>d.__wbg_mandelbrotnavigator_free(a>>>0,1));class cn{__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,Pn.unregister(this),e}free(){const e=this.__destroy_into_raw();d.__wbg_mandelbrotnavigator_free(e,0)}get_params(){const e=d.mandelbrotnavigator_get_params(this.__wbg_ptr);var i=Je(e[0],e[1]).slice();return d.__wbindgen_free(e[0],e[1]*4,4),i}use_unified(){d.mandelbrotnavigator_use_unified(this.__wbg_ptr)}find_minibrot(e,i){const s=d.mandelbrotnavigator_find_minibrot(this.__wbg_ptr,e,i);var r=Je(s[0],s[1]).slice();return d.__wbindgen_free(s[0],s[1]*4,4),r}rotate_direct(e){d.mandelbrotnavigator_rotate_direct(this.__wbg_ptr,e)}view_floatexp(){const e=d.mandelbrotnavigator_view_floatexp(this.__wbg_ptr);var i=Bn(e[0],e[1]).slice();return d.__wbindgen_free(e[0],e[1]*8,8),i}benchmark_pade(e){const i=d.mandelbrotnavigator_benchmark_pade(this.__wbg_ptr,e);return gt.__wrap(i)}get_bla_epsilon(){return d.mandelbrotnavigator_get_bla_epsilon(this.__wbg_ptr)}set_bla_epsilon(e){d.mandelbrotnavigator_set_bla_epsilon(this.__wbg_ptr,e)}unified_is_cold(e){return d.mandelbrotnavigator_unified_is_cold(this.__wbg_ptr,e)!==0}get_max_bla_skip(){return d.mandelbrotnavigator_get_max_bla_skip(this.__wbg_ptr)>>>0}is_in_transition(){return d.mandelbrotnavigator_is_in_transition(this.__wbg_ptr)!==0}pixel_to_complex(e,i,s,r){const l=d.mandelbrotnavigator_pixel_to_complex(this.__wbg_ptr,e,i,s,r);var t=Je(l[0],l[1]).slice();return d.__wbindgen_free(l[0],l[1]*4,4),t}reference_origin(e,i){const s=fe(e,d.__wbindgen_malloc,d.__wbindgen_realloc),r=se,l=fe(i,d.__wbindgen_malloc,d.__wbindgen_realloc),t=se;d.mandelbrotnavigator_reference_origin(this.__wbg_ptr,s,r,l,t)}set_max_bla_skip(e){d.mandelbrotnavigator_set_max_bla_skip(this.__wbg_ptr,e)}start_transition(e,i,s,r,l){const t=fe(e,d.__wbindgen_malloc,d.__wbindgen_realloc),c=se,p=fe(i,d.__wbindgen_malloc,d.__wbindgen_realloc),f=se,_=fe(s,d.__wbindgen_malloc,d.__wbindgen_realloc),E=se;d.mandelbrotnavigator_start_transition(this.__wbg_ptr,t,c,p,f,_,E,r,l)}translate_direct(e,i,s,r){d.mandelbrotnavigator_translate_direct(this.__wbg_ptr,e,i,!Be(s),Be(s)?0:s,!Be(r),Be(r)?0:r)}use_mobius_cplus(){d.mandelbrotnavigator_use_mobius_cplus(this.__wbg_ptr)}use_perturbation(){d.mandelbrotnavigator_use_perturbation(this.__wbg_ptr)}cancel_transition(){d.mandelbrotnavigator_cancel_transition(this.__wbg_ptr)}get_gate_emission(){return d.mandelbrotnavigator_get_gate_emission(this.__wbg_ptr)!==0}set_gate_emission(e){d.mandelbrotnavigator_set_gate_emission(this.__wbg_ptr,e)}current_log2_c_max(){return d.mandelbrotnavigator_current_log2_c_max(this.__wbg_ptr)}unified_last_sa_n0(){return d.mandelbrotnavigator_unified_last_sa_n0(this.__wbg_ptr)>>>0}coordinate_to_pixel(e,i,s,r){const l=fe(e,d.__wbindgen_malloc,d.__wbindgen_realloc),t=se,c=fe(i,d.__wbindgen_malloc,d.__wbindgen_realloc),p=se,f=d.mandelbrotnavigator_coordinate_to_pixel(this.__wbg_ptr,l,t,c,p,s,r);var _=Bn(f[0],f[1]).slice();return d.__wbindgen_free(f[0],f[1]*8,8),_}set_viewport_aspect(e){d.mandelbrotnavigator_set_viewport_aspect(this.__wbg_ptr,e)}unified_last_stages(){return d.mandelbrotnavigator_unified_last_stages(this.__wbg_ptr)>>>0}find_minibrot_framed(e,i,s){const r=d.mandelbrotnavigator_find_minibrot_framed(this.__wbg_ptr,e,i,s);var l=Je(r[0],r[1]).slice();return d.__wbindgen_free(r[0],r[1]*4,4),l}get_reference_params(){const e=d.mandelbrotnavigator_get_reference_params(this.__wbg_ptr);var i=Je(e[0],e[1]).slice();return d.__wbindgen_free(e[0],e[1]*4,4),i}set_precision_budget(e){const i=fe(e,d.__wbindgen_malloc,d.__wbindgen_realloc),s=se;d.mandelbrotnavigator_set_precision_budget(this.__wbg_ptr,i,s)}compute_jet_reference(e){const i=d.mandelbrotnavigator_compute_jet_reference(this.__wbg_ptr,e);return ft.__wrap(i)}compute_unified_header(e){const i=d.mandelbrotnavigator_compute_unified_header(this.__wbg_ptr,e);return Ge.__wrap(i)}get_approximation_mode(){return d.mandelbrotnavigator_get_approximation_mode(this.__wbg_ptr)}unified_last_band_log2(){return d.mandelbrotnavigator_unified_last_band_log2(this.__wbg_ptr)}begin_unified_reference(e){d.mandelbrotnavigator_begin_unified_reference(this.__wbg_ptr,e)}get_reference_orbit_len(){return d.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr)>>>0}unified_last_gate_count(){return d.mandelbrotnavigator_unified_last_gate_count(this.__wbg_ptr)>>>0}unified_last_periodic_p(){return d.mandelbrotnavigator_unified_last_periodic_p(this.__wbg_ptr)>>>0}compute_mobius_reference(e){const i=d.mandelbrotnavigator_compute_mobius_reference(this.__wbg_ptr,e);return mt.__wrap(i)}finish_unified_reference(e){const i=d.mandelbrotnavigator_finish_unified_reference(this.__wbg_ptr,e);return Ge.__wrap(i)}unified_last_band_spread(){return d.mandelbrotnavigator_unified_last_band_spread(this.__wbg_ptr)}compute_bla_reference_ptr(e){const i=d.mandelbrotnavigator_compute_bla_reference_ptr(this.__wbg_ptr,e);return ut.__wrap(i)}compute_unified_reference(e){const i=d.mandelbrotnavigator_compute_unified_reference(this.__wbg_ptr,e);return Ge.__wrap(i)}get_dynamic_block_validity(){return d.mandelbrotnavigator_get_dynamic_block_validity(this.__wbg_ptr)!==0}set_dynamic_block_validity(e){d.mandelbrotnavigator_set_dynamic_block_validity(this.__wbg_ptr,e)}compute_reference_orbit_ptr(e){const i=d.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr,e);return $e.__wrap(i)}get_reference_orbit_capacity(){return d.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr)>>>0}unified_last_periodic_status(){return d.mandelbrotnavigator_unified_last_periodic_status(this.__wbg_ptr)>>>0}compute_reference_orbit_chunk(e,i){const s=d.mandelbrotnavigator_compute_reference_orbit_chunk(this.__wbg_ptr,e,i);return $e.__wrap(s)}get_incremental_reference_table(){return d.mandelbrotnavigator_get_incremental_reference_table(this.__wbg_ptr)!==0}set_incremental_reference_table(e){d.mandelbrotnavigator_set_incremental_reference_table(this.__wbg_ptr,e)}unified_last_periodic_detected_p(){return d.mandelbrotnavigator_unified_last_periodic_detected_p(this.__wbg_ptr)>>>0}continue_unified_reference_bounds(e){d.mandelbrotnavigator_continue_unified_reference_bounds(this.__wbg_ptr,e)}advance_incremental_unified_reference(e,i,s){const r=d.mandelbrotnavigator_advance_incremental_unified_reference(this.__wbg_ptr,e,i,s);return ht.__wrap(r)}constructor(e,i,s,r){const l=fe(e,d.__wbindgen_malloc,d.__wbindgen_realloc),t=se,c=fe(i,d.__wbindgen_malloc,d.__wbindgen_realloc),p=se,f=fe(s,d.__wbindgen_malloc,d.__wbindgen_realloc),_=se,E=d.mandelbrotnavigator_new(l,t,c,p,f,_,r);return this.__wbg_ptr=E>>>0,Pn.register(this,this.__wbg_ptr,this),this}step(e,i){const s=d.mandelbrotnavigator_step(this.__wbg_ptr,!Be(e),Be(e)?0:e,!Be(i),Be(i)?0:i);var r=Je(s[0],s[1]).slice();return d.__wbindgen_free(s[0],s[1]*4,4),r}zoom(e){d.mandelbrotnavigator_zoom(this.__wbg_ptr,e)}angle(e){d.mandelbrotnavigator_angle(this.__wbg_ptr,e)}scale(e){const i=fe(e,d.__wbindgen_malloc,d.__wbindgen_realloc),s=se;d.mandelbrotnavigator_scale(this.__wbg_ptr,i,s)}origin(e,i){const s=fe(e,d.__wbindgen_malloc,d.__wbindgen_realloc),r=se,l=fe(i,d.__wbindgen_malloc,d.__wbindgen_realloc),t=se;d.mandelbrotnavigator_origin(this.__wbg_ptr,s,r,l,t)}rotate(e){d.mandelbrotnavigator_rotate(this.__wbg_ptr,e)}use_bla(){d.mandelbrotnavigator_use_bla(this.__wbg_ptr)}use_jet(){d.mandelbrotnavigator_use_jet(this.__wbg_ptr)}use_pade(){d.mandelbrotnavigator_use_pade(this.__wbg_ptr)}translate(e,i){d.mandelbrotnavigator_translate(this.__wbg_ptr,e,i)}}Symbol.dispose&&(cn.prototype[Symbol.dispose]=cn.prototype.free);typeof FinalizationRegistry>"u"||new FinalizationRegistry(a=>d.__wbg_mandelbrotstep_free(a>>>0,1));const In=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(a=>d.__wbg_mobiusbufferinfo_free(a>>>0,1));class mt{static __wrap(e){e=e>>>0;const i=Object.create(mt.prototype);return i.__wbg_ptr=e,In.register(i,i.__wbg_ptr,i),i}__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,In.unregister(this),e}free(){const e=this.__destroy_into_raw();d.__wbg_mobiusbufferinfo_free(e,0)}get coeffs_ptr(){return d.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr)>>>0}set coeffs_ptr(e){d.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr,e)}get coeffs_count(){return d.__wbg_get_blabufferinfo_count(this.__wbg_ptr)>>>0}set coeffs_count(e){d.__wbg_set_blabufferinfo_count(this.__wbg_ptr,e)}get radii_ptr(){return d.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr)>>>0}set radii_ptr(e){d.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr,e)}get radii_count(){return d.__wbg_get_blabufferinfo_level_count(this.__wbg_ptr)>>>0}set radii_count(e){d.__wbg_set_blabufferinfo_level_count(this.__wbg_ptr,e)}get levels_ptr(){return d.__wbg_get_incrementalunifiedrangeinfo_payload_offset(this.__wbg_ptr)>>>0}set levels_ptr(e){d.__wbg_set_blastep_ab_exp(this.__wbg_ptr,e)}get level_count(){return d.__wbg_get_incrementalunifiedrangeinfo_committed_count(this.__wbg_ptr)>>>0}set level_count(e){d.__wbg_set_incrementalunifiedrangeinfo_committed_count(this.__wbg_ptr,e)}}Symbol.dispose&&(mt.prototype[Symbol.dispose]=mt.prototype.free);const On=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(a=>d.__wbg_orbitbufferinfo_free(a>>>0,1));class $e{static __wrap(e){e=e>>>0;const i=Object.create($e.prototype);return i.__wbg_ptr=e,On.register(i,i.__wbg_ptr,i),i}__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,On.unregister(this),e}free(){const e=this.__destroy_into_raw();d.__wbg_orbitbufferinfo_free(e,0)}get ptr(){return d.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr)>>>0}set ptr(e){d.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr,e)}get offset(){return d.__wbg_get_blabufferinfo_count(this.__wbg_ptr)>>>0}set offset(e){d.__wbg_set_blabufferinfo_count(this.__wbg_ptr,e)}get count(){return d.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr)>>>0}set count(e){d.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr,e)}}Symbol.dispose&&($e.prototype[Symbol.dispose]=$e.prototype.free);const Gn=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(a=>d.__wbg_padebenchmark_free(a>>>0,1));class gt{static __wrap(e){e=e>>>0;const i=Object.create(gt.prototype);return i.__wbg_ptr=e,Gn.register(i,i.__wbg_ptr,i),i}__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,Gn.unregister(this),e}free(){const e=this.__destroy_into_raw();d.__wbg_padebenchmark_free(e,0)}get pixels(){return d.__wbg_get_incrementalunifiedbufferinfo_ranges_ptr(this.__wbg_ptr)>>>0}set pixels(e){d.__wbg_set_incrementalunifiedbufferinfo_ranges_ptr(this.__wbg_ptr,e)}get max_iter(){return d.__wbg_get_incrementalunifiedbufferinfo_range_count(this.__wbg_ptr)>>>0}set max_iter(e){d.__wbg_set_incrementalunifiedbufferinfo_range_count(this.__wbg_ptr,e)}get steps_exact(){return d.__wbg_get_incrementalunifiedbufferinfo_reference_log2_dc(this.__wbg_ptr)}set steps_exact(e){d.__wbg_set_incrementalunifiedbufferinfo_reference_log2_dc(this.__wbg_ptr,e)}get steps_affine(){return d.__wbg_get_incrementalunifiedbufferinfo_cumulative_merge_coefficients_ms(this.__wbg_ptr)}set steps_affine(e){d.__wbg_set_incrementalunifiedbufferinfo_cumulative_merge_coefficients_ms(this.__wbg_ptr,e)}get steps_pade(){return d.__wbg_get_incrementalunifiedbufferinfo_cumulative_envelope_ms(this.__wbg_ptr)}set steps_pade(e){d.__wbg_set_incrementalunifiedbufferinfo_cumulative_envelope_ms(this.__wbg_ptr,e)}get pade_mismatches(){return d.__wbg_get_incrementalunifiedbufferinfo_coeffs_ptr(this.__wbg_ptr)>>>0}set pade_mismatches(e){d.__wbg_set_incrementalunifiedbufferinfo_coeffs_ptr(this.__wbg_ptr,e)}get max_iter_delta(){return d.__wbg_get_incrementalunifiedbufferinfo_coeffs_count(this.__wbg_ptr)>>>0}set max_iter_delta(e){d.__wbg_set_blastep_d_exp(this.__wbg_ptr,e)}}Symbol.dispose&&(gt.prototype[Symbol.dispose]=gt.prototype.free);const Nn=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(a=>d.__wbg_unifiedbufferinfo_free(a>>>0,1));class Ge{static __wrap(e){e=e>>>0;const i=Object.create(Ge.prototype);return i.__wbg_ptr=e,Nn.register(i,i.__wbg_ptr,i),i}__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,Nn.unregister(this),e}free(){const e=this.__destroy_into_raw();d.__wbg_unifiedbufferinfo_free(e,0)}get coeffs_ptr(){return d.__wbg_get_incrementalunifiedbufferinfo_coeffs_ptr(this.__wbg_ptr)>>>0}set coeffs_ptr(e){d.__wbg_set_incrementalunifiedbufferinfo_coeffs_ptr(this.__wbg_ptr,e)}get coeffs_count(){return d.__wbg_get_incrementalunifiedbufferinfo_coeffs_count(this.__wbg_ptr)>>>0}set coeffs_count(e){d.__wbg_set_blastep_d_exp(this.__wbg_ptr,e)}get radii_ptr(){return d.__wbg_get_incrementalunifiedbufferinfo_radii_ptr(this.__wbg_ptr)>>>0}set radii_ptr(e){d.__wbg_set_incrementalunifiedbufferinfo_radii_ptr(this.__wbg_ptr,e)}get radii_count(){return d.__wbg_get_incrementalunifiedbufferinfo_radii_count(this.__wbg_ptr)>>>0}set radii_count(e){d.__wbg_set_incrementalunifiedbufferinfo_radii_count(this.__wbg_ptr,e)}get levels_ptr(){return d.__wbg_get_incrementalunifiedbufferinfo_certificates_ptr(this.__wbg_ptr)>>>0}set levels_ptr(e){d.__wbg_set_incrementalunifiedbufferinfo_certificates_ptr(this.__wbg_ptr,e)}get level_count(){return d.__wbg_get_incrementalunifiedbufferinfo_certificates_count(this.__wbg_ptr)>>>0}set level_count(e){d.__wbg_set_incrementalunifiedbufferinfo_certificates_count(this.__wbg_ptr,e)}get optional_headers_ptr(){return d.__wbg_get_incrementalunifiedbufferinfo_certificate_version(this.__wbg_ptr)>>>0}set optional_headers_ptr(e){d.__wbg_set_incrementalunifiedbufferinfo_certificate_version(this.__wbg_ptr,e)}get optional_headers_count(){return d.__wbg_get_incrementalunifiedbufferinfo_certificate_words_per_block(this.__wbg_ptr)>>>0}set optional_headers_count(e){d.__wbg_set_incrementalunifiedbufferinfo_certificate_words_per_block(this.__wbg_ptr,e)}get optional_headers_version(){return d.__wbg_get_incrementalunifiedbufferinfo_covered_orbit_len(this.__wbg_ptr)>>>0}set optional_headers_version(e){d.__wbg_set_incrementalunifiedbufferinfo_covered_orbit_len(this.__wbg_ptr,e)}get optional_sa_log2_dc(){return d.__wbg_get_incrementalunifiedbufferinfo_reference_log2_dc(this.__wbg_ptr)}set optional_sa_log2_dc(e){d.__wbg_set_incrementalunifiedbufferinfo_reference_log2_dc(this.__wbg_ptr,e)}get optional_periodic_log2_dc(){return d.__wbg_get_incrementalunifiedbufferinfo_cumulative_merge_coefficients_ms(this.__wbg_ptr)}set optional_periodic_log2_dc(e){d.__wbg_set_incrementalunifiedbufferinfo_cumulative_merge_coefficients_ms(this.__wbg_ptr,e)}get optional_gate_log2_dc(){return d.__wbg_get_incrementalunifiedbufferinfo_cumulative_envelope_ms(this.__wbg_ptr)}set optional_gate_log2_dc(e){d.__wbg_set_incrementalunifiedbufferinfo_cumulative_envelope_ms(this.__wbg_ptr,e)}get validity_ptr(){return d.__wbg_get_incrementalunifiedbufferinfo_published_orbit_len(this.__wbg_ptr)>>>0}set validity_ptr(e){d.__wbg_set_incrementalunifiedbufferinfo_published_orbit_len(this.__wbg_ptr,e)}get validity_count(){return d.__wbg_get_incrementalunifiedbufferinfo_reset(this.__wbg_ptr)>>>0}set validity_count(e){d.__wbg_set_incrementalunifiedbufferinfo_reset(this.__wbg_ptr,e)}get validity_diagnostics_ptr(){return d.__wbg_get_incrementalunifiedbufferinfo_has_more(this.__wbg_ptr)>>>0}set validity_diagnostics_ptr(e){d.__wbg_set_incrementalunifiedbufferinfo_has_more(this.__wbg_ptr,e)}get validity_diagnostics_count(){return d.__wbg_get_incrementalunifiedbufferinfo_cumulative_merges(this.__wbg_ptr)>>>0}set validity_diagnostics_count(e){d.__wbg_set_incrementalunifiedbufferinfo_cumulative_merges(this.__wbg_ptr,e)}get validity_diagnostics_words_per_block(){return d.__wbg_get_incrementalunifiedbufferinfo_cumulative_coefficients(this.__wbg_ptr)>>>0}set validity_diagnostics_words_per_block(e){d.__wbg_set_incrementalunifiedbufferinfo_cumulative_coefficients(this.__wbg_ptr,e)}get validity_levels_ptr(){return d.__wbg_get_incrementalunifiedbufferinfo_cumulative_envelopes(this.__wbg_ptr)>>>0}set validity_levels_ptr(e){d.__wbg_set_incrementalunifiedbufferinfo_cumulative_envelopes(this.__wbg_ptr,e)}get validity_level_count(){return d.__wbg_get_incrementalunifiedbufferinfo_peak_retained_bytes(this.__wbg_ptr)>>>0}set validity_level_count(e){d.__wbg_set_incrementalunifiedbufferinfo_peak_retained_bytes(this.__wbg_ptr,e)}get validity_version(){return d.__wbg_get_unifiedbufferinfo_validity_version(this.__wbg_ptr)>>>0}set validity_version(e){d.__wbg_set_unifiedbufferinfo_validity_version(this.__wbg_ptr,e)}get validity_words_per_block(){return d.__wbg_get_unifiedbufferinfo_validity_words_per_block(this.__wbg_ptr)>>>0}set validity_words_per_block(e){d.__wbg_set_unifiedbufferinfo_validity_words_per_block(this.__wbg_ptr,e)}get validity_reference_log2_dc(){return d.__wbg_get_unifiedbufferinfo_validity_reference_log2_dc(this.__wbg_ptr)}set validity_reference_log2_dc(e){d.__wbg_set_unifiedbufferinfo_validity_reference_log2_dc(this.__wbg_ptr,e)}}Symbol.dispose&&(Ge.prototype[Symbol.dispose]=Ge.prototype.free);function Ca(a){return Math.exp(a)}function za(a){return Math.log(a)}function Da(){return Date.now()}function Ba(a,e){throw new Error(ki(a,e))}function Ra(a,e){return ki(a,e)}function Va(){const a=d.__wbindgen_export_0,e=a.grow(4);a.set(0,void 0),a.set(e+0,void 0),a.set(e+1,null),a.set(e+2,!0),a.set(e+3,!1)}URL=globalThis.URL;const o=await Ea({"./mandelbrot_bg.js":{__wbg_now_1e80617bcee43265:Da,__wbg_exp_9293ded1248e1bd3:Ca,__wbg_log_5f75e13a39ba07fe:za,__wbg_wbindgenthrow_451ec1a8469d7eb6:Ba,__wbindgen_init_externref_table:Va,__wbindgen_cast_2241b6af4c4b2941:Ra}},ra),Ha=o.memory,Pa=o.__wbg_blabufferinfo_free,Ia=o.__wbg_blalevel_free,Oa=o.__wbg_blastep_free,Ga=o.__wbg_get_blabufferinfo_count,Na=o.__wbg_get_blabufferinfo_level_count,Ua=o.__wbg_get_blabufferinfo_levels_ptr,ja=o.__wbg_get_blabufferinfo_ptr,Za=o.__wbg_get_blastep_ab_exp,qa=o.__wbg_get_blastep_alpha_exp,Ja=o.__wbg_get_blastep_ax,Wa=o.__wbg_get_blastep_ay,Ya=o.__wbg_get_blastep_bx,Xa=o.__wbg_get_blastep_by,$a=o.__wbg_get_blastep_d_exp,Ka=o.__wbg_get_blastep_dx,es=o.__wbg_get_blastep_dy,ts=o.__wbg_get_blastep_log2_min_a,ns=o.__wbg_get_blastep_radius_alpha,is=o.__wbg_get_blastep_radius_beta,as=o.__wbg_get_incrementalunifiedbufferinfo_certificate_version,ss=o.__wbg_get_incrementalunifiedbufferinfo_certificate_words_per_block,rs=o.__wbg_get_incrementalunifiedbufferinfo_certificates_count,ls=o.__wbg_get_incrementalunifiedbufferinfo_certificates_ptr,os=o.__wbg_get_incrementalunifiedbufferinfo_coeffs_count,ds=o.__wbg_get_incrementalunifiedbufferinfo_coeffs_ptr,cs=o.__wbg_get_incrementalunifiedbufferinfo_covered_orbit_len,ps=o.__wbg_get_incrementalunifiedbufferinfo_cumulative_coefficients,us=o.__wbg_get_incrementalunifiedbufferinfo_cumulative_envelope_ms,hs=o.__wbg_get_incrementalunifiedbufferinfo_cumulative_envelopes,fs=o.__wbg_get_incrementalunifiedbufferinfo_cumulative_merge_coefficients_ms,ms=o.__wbg_get_incrementalunifiedbufferinfo_cumulative_merges,gs=o.__wbg_get_incrementalunifiedbufferinfo_has_more,_s=o.__wbg_get_incrementalunifiedbufferinfo_peak_retained_bytes,Ts=o.__wbg_get_incrementalunifiedbufferinfo_published_orbit_len,bs=o.__wbg_get_incrementalunifiedbufferinfo_radii_count,vs=o.__wbg_get_incrementalunifiedbufferinfo_radii_ptr,ks=o.__wbg_get_incrementalunifiedbufferinfo_range_count,Qs=o.__wbg_get_incrementalunifiedbufferinfo_ranges_ptr,ys=o.__wbg_get_incrementalunifiedbufferinfo_reference_log2_dc,xs=o.__wbg_get_incrementalunifiedbufferinfo_reset,ws=o.__wbg_get_incrementalunifiedrangeinfo_committed_count,Es=o.__wbg_get_incrementalunifiedrangeinfo_payload_offset,Ss=o.__wbg_get_unifiedbufferinfo_validity_reference_log2_dc,Ms=o.__wbg_get_unifiedbufferinfo_validity_version,Ls=o.__wbg_get_unifiedbufferinfo_validity_words_per_block,As=o.__wbg_incrementalunifiedbufferinfo_free,Fs=o.__wbg_incrementalunifiedrangeinfo_free,Cs=o.__wbg_jetbufferinfo_free,zs=o.__wbg_mandelbrotnavigator_free,Ds=o.__wbg_mandelbrotstep_free,Bs=o.__wbg_mobiusbufferinfo_free,Rs=o.__wbg_orbitbufferinfo_free,Vs=o.__wbg_padebenchmark_free,Hs=o.__wbg_set_blabufferinfo_count,Ps=o.__wbg_set_blabufferinfo_level_count,Is=o.__wbg_set_blabufferinfo_levels_ptr,Os=o.__wbg_set_blabufferinfo_ptr,Gs=o.__wbg_set_blastep_ab_exp,Ns=o.__wbg_set_blastep_alpha_exp,Us=o.__wbg_set_blastep_ax,js=o.__wbg_set_blastep_ay,Zs=o.__wbg_set_blastep_bx,qs=o.__wbg_set_blastep_by,Js=o.__wbg_set_blastep_d_exp,Ws=o.__wbg_set_blastep_dx,Ys=o.__wbg_set_blastep_dy,Xs=o.__wbg_set_blastep_log2_min_a,$s=o.__wbg_set_blastep_radius_alpha,Ks=o.__wbg_set_blastep_radius_beta,er=o.__wbg_set_incrementalunifiedbufferinfo_certificate_version,tr=o.__wbg_set_incrementalunifiedbufferinfo_certificate_words_per_block,nr=o.__wbg_set_incrementalunifiedbufferinfo_certificates_count,ir=o.__wbg_set_incrementalunifiedbufferinfo_certificates_ptr,ar=o.__wbg_set_incrementalunifiedbufferinfo_coeffs_ptr,sr=o.__wbg_set_incrementalunifiedbufferinfo_covered_orbit_len,rr=o.__wbg_set_incrementalunifiedbufferinfo_cumulative_coefficients,lr=o.__wbg_set_incrementalunifiedbufferinfo_cumulative_envelope_ms,or=o.__wbg_set_incrementalunifiedbufferinfo_cumulative_envelopes,dr=o.__wbg_set_incrementalunifiedbufferinfo_cumulative_merge_coefficients_ms,cr=o.__wbg_set_incrementalunifiedbufferinfo_cumulative_merges,pr=o.__wbg_set_incrementalunifiedbufferinfo_has_more,ur=o.__wbg_set_incrementalunifiedbufferinfo_peak_retained_bytes,hr=o.__wbg_set_incrementalunifiedbufferinfo_published_orbit_len,fr=o.__wbg_set_incrementalunifiedbufferinfo_radii_count,mr=o.__wbg_set_incrementalunifiedbufferinfo_radii_ptr,gr=o.__wbg_set_incrementalunifiedbufferinfo_range_count,_r=o.__wbg_set_incrementalunifiedbufferinfo_ranges_ptr,Tr=o.__wbg_set_incrementalunifiedbufferinfo_reference_log2_dc,br=o.__wbg_set_incrementalunifiedbufferinfo_reset,vr=o.__wbg_set_incrementalunifiedrangeinfo_committed_count,kr=o.__wbg_set_unifiedbufferinfo_validity_reference_log2_dc,Qr=o.__wbg_set_unifiedbufferinfo_validity_version,yr=o.__wbg_set_unifiedbufferinfo_validity_words_per_block,xr=o.__wbg_unifiedbufferinfo_free,wr=o.mandelbrotnavigator_advance_incremental_unified_reference,Er=o.mandelbrotnavigator_angle,Sr=o.mandelbrotnavigator_begin_unified_reference,Mr=o.mandelbrotnavigator_benchmark_pade,Lr=o.mandelbrotnavigator_cancel_transition,Ar=o.mandelbrotnavigator_compute_bla_reference_ptr,Fr=o.mandelbrotnavigator_compute_jet_reference,Cr=o.mandelbrotnavigator_compute_mobius_reference,zr=o.mandelbrotnavigator_compute_reference_orbit_chunk,Dr=o.mandelbrotnavigator_compute_reference_orbit_ptr,Br=o.mandelbrotnavigator_compute_unified_header,Rr=o.mandelbrotnavigator_compute_unified_reference,Vr=o.mandelbrotnavigator_continue_unified_reference_bounds,Hr=o.mandelbrotnavigator_coordinate_to_pixel,Pr=o.mandelbrotnavigator_current_log2_c_max,Ir=o.mandelbrotnavigator_find_minibrot,Or=o.mandelbrotnavigator_find_minibrot_framed,Gr=o.mandelbrotnavigator_finish_unified_reference,Nr=o.mandelbrotnavigator_get_approximation_mode,Ur=o.mandelbrotnavigator_get_bla_epsilon,jr=o.mandelbrotnavigator_get_dynamic_block_validity,Zr=o.mandelbrotnavigator_get_gate_emission,qr=o.mandelbrotnavigator_get_incremental_reference_table,Jr=o.mandelbrotnavigator_get_max_bla_skip,Wr=o.mandelbrotnavigator_get_params,Yr=o.mandelbrotnavigator_get_reference_orbit_capacity,Xr=o.mandelbrotnavigator_get_reference_orbit_len,$r=o.mandelbrotnavigator_get_reference_params,Kr=o.mandelbrotnavigator_is_in_transition,el=o.mandelbrotnavigator_new,tl=o.mandelbrotnavigator_origin,nl=o.mandelbrotnavigator_pixel_to_complex,il=o.mandelbrotnavigator_reference_origin,al=o.mandelbrotnavigator_rotate,sl=o.mandelbrotnavigator_rotate_direct,rl=o.mandelbrotnavigator_scale,ll=o.mandelbrotnavigator_set_bla_epsilon,ol=o.mandelbrotnavigator_set_dynamic_block_validity,dl=o.mandelbrotnavigator_set_gate_emission,cl=o.mandelbrotnavigator_set_incremental_reference_table,pl=o.mandelbrotnavigator_set_max_bla_skip,ul=o.mandelbrotnavigator_set_precision_budget,hl=o.mandelbrotnavigator_set_viewport_aspect,fl=o.mandelbrotnavigator_start_transition,ml=o.mandelbrotnavigator_step,gl=o.mandelbrotnavigator_translate,_l=o.mandelbrotnavigator_translate_direct,Tl=o.mandelbrotnavigator_unified_is_cold,bl=o.mandelbrotnavigator_unified_last_band_log2,vl=o.mandelbrotnavigator_unified_last_band_spread,kl=o.mandelbrotnavigator_unified_last_gate_count,Ql=o.mandelbrotnavigator_unified_last_periodic_detected_p,yl=o.mandelbrotnavigator_unified_last_periodic_p,xl=o.mandelbrotnavigator_unified_last_periodic_status,wl=o.mandelbrotnavigator_unified_last_sa_n0,El=o.mandelbrotnavigator_unified_last_stages,Sl=o.mandelbrotnavigator_use_bla,Ml=o.mandelbrotnavigator_use_jet,Ll=o.mandelbrotnavigator_use_mobius_cplus,Al=o.mandelbrotnavigator_use_pade,Fl=o.mandelbrotnavigator_use_perturbation,Cl=o.mandelbrotnavigator_use_unified,zl=o.mandelbrotnavigator_view_floatexp,Dl=o.mandelbrotnavigator_zoom,Bl=o.__wbg_set_blalevel_count,Rl=o.__wbg_set_blalevel_max_radius_bits,Vl=o.__wbg_set_blalevel_offset,Hl=o.__wbg_set_blalevel_skip,Pl=o.__wbg_set_incrementalunifiedbufferinfo_coeffs_count,Il=o.__wbg_set_incrementalunifiedrangeinfo_level,Ol=o.__wbg_set_incrementalunifiedrangeinfo_payload_offset,Gl=o.__wbg_set_incrementalunifiedrangeinfo_skip,Nl=o.__wbg_set_incrementalunifiedrangeinfo_slot_count,Ul=o.__wbg_set_incrementalunifiedrangeinfo_slot_start,jl=o.__wbg_set_jetbufferinfo_coeffs_count,Zl=o.__wbg_set_jetbufferinfo_coeffs_ptr,ql=o.__wbg_set_jetbufferinfo_level_count,Jl=o.__wbg_set_jetbufferinfo_levels_ptr,Wl=o.__wbg_set_jetbufferinfo_radii_count,Yl=o.__wbg_set_jetbufferinfo_radii_ptr,Xl=o.__wbg_set_mandelbrotstep_pad0,$l=o.__wbg_set_mandelbrotstep_pad1,Kl=o.__wbg_set_mandelbrotstep_zx,eo=o.__wbg_set_mandelbrotstep_zy,to=o.__wbg_set_mobiusbufferinfo_coeffs_count,no=o.__wbg_set_mobiusbufferinfo_coeffs_ptr,io=o.__wbg_set_mobiusbufferinfo_level_count,ao=o.__wbg_set_mobiusbufferinfo_levels_ptr,so=o.__wbg_set_mobiusbufferinfo_radii_count,ro=o.__wbg_set_mobiusbufferinfo_radii_ptr,lo=o.__wbg_set_orbitbufferinfo_count,oo=o.__wbg_set_orbitbufferinfo_offset,co=o.__wbg_set_orbitbufferinfo_ptr,po=o.__wbg_set_padebenchmark_max_iter,uo=o.__wbg_set_padebenchmark_max_iter_delta,ho=o.__wbg_set_padebenchmark_pade_mismatches,fo=o.__wbg_set_padebenchmark_pixels,mo=o.__wbg_set_padebenchmark_steps_affine,go=o.__wbg_set_padebenchmark_steps_exact,_o=o.__wbg_set_padebenchmark_steps_pade,To=o.__wbg_set_unifiedbufferinfo_coeffs_count,bo=o.__wbg_set_unifiedbufferinfo_coeffs_ptr,vo=o.__wbg_set_unifiedbufferinfo_level_count,ko=o.__wbg_set_unifiedbufferinfo_levels_ptr,Qo=o.__wbg_set_unifiedbufferinfo_optional_gate_log2_dc,yo=o.__wbg_set_unifiedbufferinfo_optional_headers_count,xo=o.__wbg_set_unifiedbufferinfo_optional_headers_ptr,wo=o.__wbg_set_unifiedbufferinfo_optional_headers_version,Eo=o.__wbg_set_unifiedbufferinfo_optional_periodic_log2_dc,So=o.__wbg_set_unifiedbufferinfo_optional_sa_log2_dc,Mo=o.__wbg_set_unifiedbufferinfo_radii_count,Lo=o.__wbg_set_unifiedbufferinfo_radii_ptr,Ao=o.__wbg_set_unifiedbufferinfo_validity_count,Fo=o.__wbg_set_unifiedbufferinfo_validity_diagnostics_count,Co=o.__wbg_set_unifiedbufferinfo_validity_diagnostics_ptr,zo=o.__wbg_set_unifiedbufferinfo_validity_diagnostics_words_per_block,Do=o.__wbg_set_unifiedbufferinfo_validity_level_count,Bo=o.__wbg_set_unifiedbufferinfo_validity_levels_ptr,Ro=o.__wbg_set_unifiedbufferinfo_validity_ptr,Vo=o.__wbg_get_blalevel_count,Ho=o.__wbg_get_blalevel_max_radius_bits,Po=o.__wbg_get_blalevel_offset,Io=o.__wbg_get_blalevel_skip,Oo=o.__wbg_get_incrementalunifiedrangeinfo_level,Go=o.__wbg_get_incrementalunifiedrangeinfo_skip,No=o.__wbg_get_incrementalunifiedrangeinfo_slot_count,Uo=o.__wbg_get_incrementalunifiedrangeinfo_slot_start,jo=o.__wbg_get_jetbufferinfo_coeffs_count,Zo=o.__wbg_get_jetbufferinfo_coeffs_ptr,qo=o.__wbg_get_jetbufferinfo_level_count,Jo=o.__wbg_get_jetbufferinfo_levels_ptr,Wo=o.__wbg_get_jetbufferinfo_radii_count,Yo=o.__wbg_get_jetbufferinfo_radii_ptr,Xo=o.__wbg_get_mobiusbufferinfo_coeffs_count,$o=o.__wbg_get_mobiusbufferinfo_coeffs_ptr,Ko=o.__wbg_get_mobiusbufferinfo_level_count,e2=o.__wbg_get_mobiusbufferinfo_levels_ptr,t2=o.__wbg_get_mobiusbufferinfo_radii_count,n2=o.__wbg_get_mobiusbufferinfo_radii_ptr,i2=o.__wbg_get_orbitbufferinfo_count,a2=o.__wbg_get_orbitbufferinfo_offset,s2=o.__wbg_get_orbitbufferinfo_ptr,r2=o.__wbg_get_padebenchmark_max_iter,l2=o.__wbg_get_padebenchmark_max_iter_delta,o2=o.__wbg_get_padebenchmark_pade_mismatches,d2=o.__wbg_get_padebenchmark_pixels,c2=o.__wbg_get_unifiedbufferinfo_coeffs_count,p2=o.__wbg_get_unifiedbufferinfo_coeffs_ptr,u2=o.__wbg_get_unifiedbufferinfo_level_count,h2=o.__wbg_get_unifiedbufferinfo_levels_ptr,f2=o.__wbg_get_unifiedbufferinfo_optional_headers_count,m2=o.__wbg_get_unifiedbufferinfo_optional_headers_ptr,g2=o.__wbg_get_unifiedbufferinfo_optional_headers_version,_2=o.__wbg_get_unifiedbufferinfo_radii_count,T2=o.__wbg_get_unifiedbufferinfo_radii_ptr,b2=o.__wbg_get_unifiedbufferinfo_validity_count,v2=o.__wbg_get_unifiedbufferinfo_validity_diagnostics_count,k2=o.__wbg_get_unifiedbufferinfo_validity_diagnostics_ptr,Q2=o.__wbg_get_unifiedbufferinfo_validity_diagnostics_words_per_block,y2=o.__wbg_get_unifiedbufferinfo_validity_level_count,x2=o.__wbg_get_unifiedbufferinfo_validity_levels_ptr,w2=o.__wbg_get_unifiedbufferinfo_validity_ptr,E2=o.__wbg_get_mandelbrotstep_pad0,S2=o.__wbg_get_mandelbrotstep_pad1,M2=o.__wbg_get_mandelbrotstep_zx,L2=o.__wbg_get_mandelbrotstep_zy,A2=o.__wbg_get_padebenchmark_steps_affine,F2=o.__wbg_get_padebenchmark_steps_exact,C2=o.__wbg_get_padebenchmark_steps_pade,z2=o.__wbg_get_unifiedbufferinfo_optional_gate_log2_dc,D2=o.__wbg_get_unifiedbufferinfo_optional_periodic_log2_dc,B2=o.__wbg_get_unifiedbufferinfo_optional_sa_log2_dc,R2=o.__wbindgen_export_0,V2=o.__externref_drop_slice,H2=o.__wbindgen_free,P2=o.__wbindgen_malloc,I2=o.__wbindgen_realloc,Qi=o.__wbindgen_start,O2=Object.freeze(Object.defineProperty({__proto__:null,__externref_drop_slice:V2,__wbg_blabufferinfo_free:Pa,__wbg_blalevel_free:Ia,__wbg_blastep_free:Oa,__wbg_get_blabufferinfo_count:Ga,__wbg_get_blabufferinfo_level_count:Na,__wbg_get_blabufferinfo_levels_ptr:Ua,__wbg_get_blabufferinfo_ptr:ja,__wbg_get_blalevel_count:Vo,__wbg_get_blalevel_max_radius_bits:Ho,__wbg_get_blalevel_offset:Po,__wbg_get_blalevel_skip:Io,__wbg_get_blastep_ab_exp:Za,__wbg_get_blastep_alpha_exp:qa,__wbg_get_blastep_ax:Ja,__wbg_get_blastep_ay:Wa,__wbg_get_blastep_bx:Ya,__wbg_get_blastep_by:Xa,__wbg_get_blastep_d_exp:$a,__wbg_get_blastep_dx:Ka,__wbg_get_blastep_dy:es,__wbg_get_blastep_log2_min_a:ts,__wbg_get_blastep_radius_alpha:ns,__wbg_get_blastep_radius_beta:is,__wbg_get_incrementalunifiedbufferinfo_certificate_version:as,__wbg_get_incrementalunifiedbufferinfo_certificate_words_per_block:ss,__wbg_get_incrementalunifiedbufferinfo_certificates_count:rs,__wbg_get_incrementalunifiedbufferinfo_certificates_ptr:ls,__wbg_get_incrementalunifiedbufferinfo_coeffs_count:os,__wbg_get_incrementalunifiedbufferinfo_coeffs_ptr:ds,__wbg_get_incrementalunifiedbufferinfo_covered_orbit_len:cs,__wbg_get_incrementalunifiedbufferinfo_cumulative_coefficients:ps,__wbg_get_incrementalunifiedbufferinfo_cumulative_envelope_ms:us,__wbg_get_incrementalunifiedbufferinfo_cumulative_envelopes:hs,__wbg_get_incrementalunifiedbufferinfo_cumulative_merge_coefficients_ms:fs,__wbg_get_incrementalunifiedbufferinfo_cumulative_merges:ms,__wbg_get_incrementalunifiedbufferinfo_has_more:gs,__wbg_get_incrementalunifiedbufferinfo_peak_retained_bytes:_s,__wbg_get_incrementalunifiedbufferinfo_published_orbit_len:Ts,__wbg_get_incrementalunifiedbufferinfo_radii_count:bs,__wbg_get_incrementalunifiedbufferinfo_radii_ptr:vs,__wbg_get_incrementalunifiedbufferinfo_range_count:ks,__wbg_get_incrementalunifiedbufferinfo_ranges_ptr:Qs,__wbg_get_incrementalunifiedbufferinfo_reference_log2_dc:ys,__wbg_get_incrementalunifiedbufferinfo_reset:xs,__wbg_get_incrementalunifiedrangeinfo_committed_count:ws,__wbg_get_incrementalunifiedrangeinfo_level:Oo,__wbg_get_incrementalunifiedrangeinfo_payload_offset:Es,__wbg_get_incrementalunifiedrangeinfo_skip:Go,__wbg_get_incrementalunifiedrangeinfo_slot_count:No,__wbg_get_incrementalunifiedrangeinfo_slot_start:Uo,__wbg_get_jetbufferinfo_coeffs_count:jo,__wbg_get_jetbufferinfo_coeffs_ptr:Zo,__wbg_get_jetbufferinfo_level_count:qo,__wbg_get_jetbufferinfo_levels_ptr:Jo,__wbg_get_jetbufferinfo_radii_count:Wo,__wbg_get_jetbufferinfo_radii_ptr:Yo,__wbg_get_mandelbrotstep_pad0:E2,__wbg_get_mandelbrotstep_pad1:S2,__wbg_get_mandelbrotstep_zx:M2,__wbg_get_mandelbrotstep_zy:L2,__wbg_get_mobiusbufferinfo_coeffs_count:Xo,__wbg_get_mobiusbufferinfo_coeffs_ptr:$o,__wbg_get_mobiusbufferinfo_level_count:Ko,__wbg_get_mobiusbufferinfo_levels_ptr:e2,__wbg_get_mobiusbufferinfo_radii_count:t2,__wbg_get_mobiusbufferinfo_radii_ptr:n2,__wbg_get_orbitbufferinfo_count:i2,__wbg_get_orbitbufferinfo_offset:a2,__wbg_get_orbitbufferinfo_ptr:s2,__wbg_get_padebenchmark_max_iter:r2,__wbg_get_padebenchmark_max_iter_delta:l2,__wbg_get_padebenchmark_pade_mismatches:o2,__wbg_get_padebenchmark_pixels:d2,__wbg_get_padebenchmark_steps_affine:A2,__wbg_get_padebenchmark_steps_exact:F2,__wbg_get_padebenchmark_steps_pade:C2,__wbg_get_unifiedbufferinfo_coeffs_count:c2,__wbg_get_unifiedbufferinfo_coeffs_ptr:p2,__wbg_get_unifiedbufferinfo_level_count:u2,__wbg_get_unifiedbufferinfo_levels_ptr:h2,__wbg_get_unifiedbufferinfo_optional_gate_log2_dc:z2,__wbg_get_unifiedbufferinfo_optional_headers_count:f2,__wbg_get_unifiedbufferinfo_optional_headers_ptr:m2,__wbg_get_unifiedbufferinfo_optional_headers_version:g2,__wbg_get_unifiedbufferinfo_optional_periodic_log2_dc:D2,__wbg_get_unifiedbufferinfo_optional_sa_log2_dc:B2,__wbg_get_unifiedbufferinfo_radii_count:_2,__wbg_get_unifiedbufferinfo_radii_ptr:T2,__wbg_get_unifiedbufferinfo_validity_count:b2,__wbg_get_unifiedbufferinfo_validity_diagnostics_count:v2,__wbg_get_unifiedbufferinfo_validity_diagnostics_ptr:k2,__wbg_get_unifiedbufferinfo_validity_diagnostics_words_per_block:Q2,__wbg_get_unifiedbufferinfo_validity_level_count:y2,__wbg_get_unifiedbufferinfo_validity_levels_ptr:x2,__wbg_get_unifiedbufferinfo_validity_ptr:w2,__wbg_get_unifiedbufferinfo_validity_reference_log2_dc:Ss,__wbg_get_unifiedbufferinfo_validity_version:Ms,__wbg_get_unifiedbufferinfo_validity_words_per_block:Ls,__wbg_incrementalunifiedbufferinfo_free:As,__wbg_incrementalunifiedrangeinfo_free:Fs,__wbg_jetbufferinfo_free:Cs,__wbg_mandelbrotnavigator_free:zs,__wbg_mandelbrotstep_free:Ds,__wbg_mobiusbufferinfo_free:Bs,__wbg_orbitbufferinfo_free:Rs,__wbg_padebenchmark_free:Vs,__wbg_set_blabufferinfo_count:Hs,__wbg_set_blabufferinfo_level_count:Ps,__wbg_set_blabufferinfo_levels_ptr:Is,__wbg_set_blabufferinfo_ptr:Os,__wbg_set_blalevel_count:Bl,__wbg_set_blalevel_max_radius_bits:Rl,__wbg_set_blalevel_offset:Vl,__wbg_set_blalevel_skip:Hl,__wbg_set_blastep_ab_exp:Gs,__wbg_set_blastep_alpha_exp:Ns,__wbg_set_blastep_ax:Us,__wbg_set_blastep_ay:js,__wbg_set_blastep_bx:Zs,__wbg_set_blastep_by:qs,__wbg_set_blastep_d_exp:Js,__wbg_set_blastep_dx:Ws,__wbg_set_blastep_dy:Ys,__wbg_set_blastep_log2_min_a:Xs,__wbg_set_blastep_radius_alpha:$s,__wbg_set_blastep_radius_beta:Ks,__wbg_set_incrementalunifiedbufferinfo_certificate_version:er,__wbg_set_incrementalunifiedbufferinfo_certificate_words_per_block:tr,__wbg_set_incrementalunifiedbufferinfo_certificates_count:nr,__wbg_set_incrementalunifiedbufferinfo_certificates_ptr:ir,__wbg_set_incrementalunifiedbufferinfo_coeffs_count:Pl,__wbg_set_incrementalunifiedbufferinfo_coeffs_ptr:ar,__wbg_set_incrementalunifiedbufferinfo_covered_orbit_len:sr,__wbg_set_incrementalunifiedbufferinfo_cumulative_coefficients:rr,__wbg_set_incrementalunifiedbufferinfo_cumulative_envelope_ms:lr,__wbg_set_incrementalunifiedbufferinfo_cumulative_envelopes:or,__wbg_set_incrementalunifiedbufferinfo_cumulative_merge_coefficients_ms:dr,__wbg_set_incrementalunifiedbufferinfo_cumulative_merges:cr,__wbg_set_incrementalunifiedbufferinfo_has_more:pr,__wbg_set_incrementalunifiedbufferinfo_peak_retained_bytes:ur,__wbg_set_incrementalunifiedbufferinfo_published_orbit_len:hr,__wbg_set_incrementalunifiedbufferinfo_radii_count:fr,__wbg_set_incrementalunifiedbufferinfo_radii_ptr:mr,__wbg_set_incrementalunifiedbufferinfo_range_count:gr,__wbg_set_incrementalunifiedbufferinfo_ranges_ptr:_r,__wbg_set_incrementalunifiedbufferinfo_reference_log2_dc:Tr,__wbg_set_incrementalunifiedbufferinfo_reset:br,__wbg_set_incrementalunifiedrangeinfo_committed_count:vr,__wbg_set_incrementalunifiedrangeinfo_level:Il,__wbg_set_incrementalunifiedrangeinfo_payload_offset:Ol,__wbg_set_incrementalunifiedrangeinfo_skip:Gl,__wbg_set_incrementalunifiedrangeinfo_slot_count:Nl,__wbg_set_incrementalunifiedrangeinfo_slot_start:Ul,__wbg_set_jetbufferinfo_coeffs_count:jl,__wbg_set_jetbufferinfo_coeffs_ptr:Zl,__wbg_set_jetbufferinfo_level_count:ql,__wbg_set_jetbufferinfo_levels_ptr:Jl,__wbg_set_jetbufferinfo_radii_count:Wl,__wbg_set_jetbufferinfo_radii_ptr:Yl,__wbg_set_mandelbrotstep_pad0:Xl,__wbg_set_mandelbrotstep_pad1:$l,__wbg_set_mandelbrotstep_zx:Kl,__wbg_set_mandelbrotstep_zy:eo,__wbg_set_mobiusbufferinfo_coeffs_count:to,__wbg_set_mobiusbufferinfo_coeffs_ptr:no,__wbg_set_mobiusbufferinfo_level_count:io,__wbg_set_mobiusbufferinfo_levels_ptr:ao,__wbg_set_mobiusbufferinfo_radii_count:so,__wbg_set_mobiusbufferinfo_radii_ptr:ro,__wbg_set_orbitbufferinfo_count:lo,__wbg_set_orbitbufferinfo_offset:oo,__wbg_set_orbitbufferinfo_ptr:co,__wbg_set_padebenchmark_max_iter:po,__wbg_set_padebenchmark_max_iter_delta:uo,__wbg_set_padebenchmark_pade_mismatches:ho,__wbg_set_padebenchmark_pixels:fo,__wbg_set_padebenchmark_steps_affine:mo,__wbg_set_padebenchmark_steps_exact:go,__wbg_set_padebenchmark_steps_pade:_o,__wbg_set_unifiedbufferinfo_coeffs_count:To,__wbg_set_unifiedbufferinfo_coeffs_ptr:bo,__wbg_set_unifiedbufferinfo_level_count:vo,__wbg_set_unifiedbufferinfo_levels_ptr:ko,__wbg_set_unifiedbufferinfo_optional_gate_log2_dc:Qo,__wbg_set_unifiedbufferinfo_optional_headers_count:yo,__wbg_set_unifiedbufferinfo_optional_headers_ptr:xo,__wbg_set_unifiedbufferinfo_optional_headers_version:wo,__wbg_set_unifiedbufferinfo_optional_periodic_log2_dc:Eo,__wbg_set_unifiedbufferinfo_optional_sa_log2_dc:So,__wbg_set_unifiedbufferinfo_radii_count:Mo,__wbg_set_unifiedbufferinfo_radii_ptr:Lo,__wbg_set_unifiedbufferinfo_validity_count:Ao,__wbg_set_unifiedbufferinfo_validity_diagnostics_count:Fo,__wbg_set_unifiedbufferinfo_validity_diagnostics_ptr:Co,__wbg_set_unifiedbufferinfo_validity_diagnostics_words_per_block:zo,__wbg_set_unifiedbufferinfo_validity_level_count:Do,__wbg_set_unifiedbufferinfo_validity_levels_ptr:Bo,__wbg_set_unifiedbufferinfo_validity_ptr:Ro,__wbg_set_unifiedbufferinfo_validity_reference_log2_dc:kr,__wbg_set_unifiedbufferinfo_validity_version:Qr,__wbg_set_unifiedbufferinfo_validity_words_per_block:yr,__wbg_unifiedbufferinfo_free:xr,__wbindgen_export_0:R2,__wbindgen_free:H2,__wbindgen_malloc:P2,__wbindgen_realloc:I2,__wbindgen_start:Qi,mandelbrotnavigator_advance_incremental_unified_reference:wr,mandelbrotnavigator_angle:Er,mandelbrotnavigator_begin_unified_reference:Sr,mandelbrotnavigator_benchmark_pade:Mr,mandelbrotnavigator_cancel_transition:Lr,mandelbrotnavigator_compute_bla_reference_ptr:Ar,mandelbrotnavigator_compute_jet_reference:Fr,mandelbrotnavigator_compute_mobius_reference:Cr,mandelbrotnavigator_compute_reference_orbit_chunk:zr,mandelbrotnavigator_compute_reference_orbit_ptr:Dr,mandelbrotnavigator_compute_unified_header:Br,mandelbrotnavigator_compute_unified_reference:Rr,mandelbrotnavigator_continue_unified_reference_bounds:Vr,mandelbrotnavigator_coordinate_to_pixel:Hr,mandelbrotnavigator_current_log2_c_max:Pr,mandelbrotnavigator_find_minibrot:Ir,mandelbrotnavigator_find_minibrot_framed:Or,mandelbrotnavigator_finish_unified_reference:Gr,mandelbrotnavigator_get_approximation_mode:Nr,mandelbrotnavigator_get_bla_epsilon:Ur,mandelbrotnavigator_get_dynamic_block_validity:jr,mandelbrotnavigator_get_gate_emission:Zr,mandelbrotnavigator_get_incremental_reference_table:qr,mandelbrotnavigator_get_max_bla_skip:Jr,mandelbrotnavigator_get_params:Wr,mandelbrotnavigator_get_reference_orbit_capacity:Yr,mandelbrotnavigator_get_reference_orbit_len:Xr,mandelbrotnavigator_get_reference_params:$r,mandelbrotnavigator_is_in_transition:Kr,mandelbrotnavigator_new:el,mandelbrotnavigator_origin:tl,mandelbrotnavigator_pixel_to_complex:nl,mandelbrotnavigator_reference_origin:il,mandelbrotnavigator_rotate:al,mandelbrotnavigator_rotate_direct:sl,mandelbrotnavigator_scale:rl,mandelbrotnavigator_set_bla_epsilon:ll,mandelbrotnavigator_set_dynamic_block_validity:ol,mandelbrotnavigator_set_gate_emission:dl,mandelbrotnavigator_set_incremental_reference_table:cl,mandelbrotnavigator_set_max_bla_skip:pl,mandelbrotnavigator_set_precision_budget:ul,mandelbrotnavigator_set_viewport_aspect:hl,mandelbrotnavigator_start_transition:fl,mandelbrotnavigator_step:ml,mandelbrotnavigator_translate:gl,mandelbrotnavigator_translate_direct:_l,mandelbrotnavigator_unified_is_cold:Tl,mandelbrotnavigator_unified_last_band_log2:bl,mandelbrotnavigator_unified_last_band_spread:vl,mandelbrotnavigator_unified_last_gate_count:kl,mandelbrotnavigator_unified_last_periodic_detected_p:Ql,mandelbrotnavigator_unified_last_periodic_p:yl,mandelbrotnavigator_unified_last_periodic_status:xl,mandelbrotnavigator_unified_last_sa_n0:wl,mandelbrotnavigator_unified_last_stages:El,mandelbrotnavigator_use_bla:Sl,mandelbrotnavigator_use_jet:Ml,mandelbrotnavigator_use_mobius_cplus:Ll,mandelbrotnavigator_use_pade:Al,mandelbrotnavigator_use_perturbation:Fl,mandelbrotnavigator_use_unified:Cl,mandelbrotnavigator_view_floatexp:zl,mandelbrotnavigator_zoom:Dl,memory:Ha},Symbol.toStringTag,{value:"Module"}));Sa(O2);Qi();class G2{video;stream=null;width;height;lastDrawTime=0;open=!1;constructor(e=1024,i=1024){this.width=e,this.height=i,this.video=document.createElement("video"),this.video.autoplay=!0,this.video.playsInline=!0,this.video.muted=!0,this.video.width=e,this.video.height=i}isOpen(){return this.open}async openWebcam(){if(!this.open)try{this.stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:this.width},height:{ideal:this.height}}}),this.video.srcObject=this.stream,await this.video.play(),this.width=this.video.videoWidth||this.width,this.height=this.video.videoHeight||this.height,this.open=!0}catch(e){this.stream=null,this.open=!1,console.warn("Webcam unavailable:",e)}}async drawWebGPUTexture(e,i){if(!this.open)return;const s=performance.now();if(s-this.lastDrawTime>15){if(this.video.readyState<HTMLMediaElement.HAVE_CURRENT_DATA)return;const r=Math.min(this.width,e.width),l=Math.min(this.height,e.height);i.queue.copyExternalImageToTexture({source:this.video},{texture:e},[r,l]),this.lastDrawTime=s}}closeWebcam(){this.stream&&(this.stream.getTracks().forEach(e=>e.stop()),this.stream=null),this.open=!1}}function N2(a,e){return 1+Math.floor(Math.log2(Math.max(a,e)))}const U2=`
@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var smp: sampler;

struct VSOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vi: u32) -> VSOut {
  var p = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 3.0, -1.0),
    vec2<f32>(-1.0,  3.0)
  );
  var o: VSOut;
  o.pos = vec4<f32>(p[vi], 0.0, 1.0);
  o.uv = vec2<f32>(p[vi].x * 0.5 + 0.5, 0.5 - p[vi].y * 0.5);
  return o;
}

@fragment
fn fs_main(in: VSOut) -> @location(0) vec4<f32> {
  return textureSampleLevel(src, smp, in.uv, 0.0);
}
`,Un=new WeakMap;function j2(a,e){let i=Un.get(a);i||(i={pipelines:new Map,module:a.createShaderModule({code:U2,label:"MipmapBlit Module"}),sampler:a.createSampler({magFilter:"linear",minFilter:"linear",label:"MipmapBlit Sampler"})},Un.set(a,i));let s=i.pipelines.get(e);return s||(s=a.createRenderPipeline({layout:"auto",vertex:{module:i.module,entryPoint:"vs_main"},fragment:{module:i.module,entryPoint:"fs_main",targets:[{format:e}]},primitive:{topology:"triangle-list"},label:`MipmapBlit ${e}`}),i.pipelines.set(e,s)),{pipeline:s,sampler:i.sampler}}function Z2(a,e){if(e.mipLevelCount<=1)return;const{pipeline:i,sampler:s}=j2(a,e.format),r=a.createCommandEncoder({label:"MipmapGen"});for(let l=1;l<e.mipLevelCount;l++){const t=a.createBindGroup({layout:i.getBindGroupLayout(0),entries:[{binding:0,resource:e.createView({baseMipLevel:l-1,mipLevelCount:1})},{binding:1,resource:s}],label:`MipmapGen L${l}`}),c=r.beginRenderPass({colorAttachments:[{view:e.createView({baseMipLevel:l,mipLevelCount:1}),loadOp:"clear",clearValue:{r:0,g:0,b:0,a:1},storeOp:"store"}]});c.setPipeline(i),c.setBindGroup(0,t),c.draw(3),c.end()}a.queue.submit([r.finish()])}function et(a,e,i){a.prototype=e.prototype=i,i.constructor=a}function Qt(a,e){var i=Object.create(a.prototype);for(var s in e)i[s]=e[s];return i}function He(){}var je=.7,Ke=1/je,Ye="\\s*([+-]?\\d+)\\s*",_t="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*",Se="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*",q2=/^#([0-9a-f]{3,8})$/,J2=new RegExp(`^rgb\\(${Ye},${Ye},${Ye}\\)$`),W2=new RegExp(`^rgb\\(${Se},${Se},${Se}\\)$`),Y2=new RegExp(`^rgba\\(${Ye},${Ye},${Ye},${_t}\\)$`),X2=new RegExp(`^rgba\\(${Se},${Se},${Se},${_t}\\)$`),$2=new RegExp(`^hsl\\(${_t},${Se},${Se}\\)$`),K2=new RegExp(`^hsla\\(${_t},${Se},${Se},${_t}\\)$`),jn={aliceblue:0xf0f8ff,antiquewhite:0xfaebd7,aqua:65535,aquamarine:8388564,azure:0xf0ffff,beige:0xf5f5dc,bisque:0xffe4c4,black:0,blanchedalmond:0xffebcd,blue:255,blueviolet:9055202,brown:0xa52a2a,burlywood:0xdeb887,cadetblue:6266528,chartreuse:8388352,chocolate:0xd2691e,coral:0xff7f50,cornflowerblue:6591981,cornsilk:0xfff8dc,crimson:0xdc143c,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:0xb8860b,darkgray:0xa9a9a9,darkgreen:25600,darkgrey:0xa9a9a9,darkkhaki:0xbdb76b,darkmagenta:9109643,darkolivegreen:5597999,darkorange:0xff8c00,darkorchid:0x9932cc,darkred:9109504,darksalmon:0xe9967a,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:0xff1493,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:0xb22222,floralwhite:0xfffaf0,forestgreen:2263842,fuchsia:0xff00ff,gainsboro:0xdcdcdc,ghostwhite:0xf8f8ff,gold:0xffd700,goldenrod:0xdaa520,gray:8421504,green:32768,greenyellow:0xadff2f,grey:8421504,honeydew:0xf0fff0,hotpink:0xff69b4,indianred:0xcd5c5c,indigo:4915330,ivory:0xfffff0,khaki:0xf0e68c,lavender:0xe6e6fa,lavenderblush:0xfff0f5,lawngreen:8190976,lemonchiffon:0xfffacd,lightblue:0xadd8e6,lightcoral:0xf08080,lightcyan:0xe0ffff,lightgoldenrodyellow:0xfafad2,lightgray:0xd3d3d3,lightgreen:9498256,lightgrey:0xd3d3d3,lightpink:0xffb6c1,lightsalmon:0xffa07a,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:0xb0c4de,lightyellow:0xffffe0,lime:65280,limegreen:3329330,linen:0xfaf0e6,magenta:0xff00ff,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:0xba55d3,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:0xc71585,midnightblue:1644912,mintcream:0xf5fffa,mistyrose:0xffe4e1,moccasin:0xffe4b5,navajowhite:0xffdead,navy:128,oldlace:0xfdf5e6,olive:8421376,olivedrab:7048739,orange:0xffa500,orangered:0xff4500,orchid:0xda70d6,palegoldenrod:0xeee8aa,palegreen:0x98fb98,paleturquoise:0xafeeee,palevioletred:0xdb7093,papayawhip:0xffefd5,peachpuff:0xffdab9,peru:0xcd853f,pink:0xffc0cb,plum:0xdda0dd,powderblue:0xb0e0e6,purple:8388736,rebeccapurple:6697881,red:0xff0000,rosybrown:0xbc8f8f,royalblue:4286945,saddlebrown:9127187,salmon:0xfa8072,sandybrown:0xf4a460,seagreen:3050327,seashell:0xfff5ee,sienna:0xa0522d,silver:0xc0c0c0,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:0xfffafa,springgreen:65407,steelblue:4620980,tan:0xd2b48c,teal:32896,thistle:0xd8bfd8,tomato:0xff6347,turquoise:4251856,violet:0xee82ee,wheat:0xf5deb3,white:0xffffff,whitesmoke:0xf5f5f5,yellow:0xffff00,yellowgreen:0x9acd32};et(He,kn,{copy(a){return Object.assign(new this.constructor,this,a)},displayable(){return this.rgb().displayable()},hex:Zn,formatHex:Zn,formatHex8:e1,formatHsl:t1,formatRgb:qn,toString:qn});function Zn(){return this.rgb().formatHex()}function e1(){return this.rgb().formatHex8()}function t1(){return yi(this).formatHsl()}function qn(){return this.rgb().formatRgb()}function kn(a){var e,i;return a=(a+"").trim().toLowerCase(),(e=q2.exec(a))?(i=e[1].length,e=parseInt(e[1],16),i===6?Jn(e):i===3?new Y(e>>8&15|e>>4&240,e>>4&15|e&240,(e&15)<<4|e&15,1):i===8?Mt(e>>24&255,e>>16&255,e>>8&255,(e&255)/255):i===4?Mt(e>>12&15|e>>8&240,e>>8&15|e>>4&240,e>>4&15|e&240,((e&15)<<4|e&15)/255):null):(e=J2.exec(a))?new Y(e[1],e[2],e[3],1):(e=W2.exec(a))?new Y(e[1]*255/100,e[2]*255/100,e[3]*255/100,1):(e=Y2.exec(a))?Mt(e[1],e[2],e[3],e[4]):(e=X2.exec(a))?Mt(e[1]*255/100,e[2]*255/100,e[3]*255/100,e[4]):(e=$2.exec(a))?Xn(e[1],e[2]/100,e[3]/100,1):(e=K2.exec(a))?Xn(e[1],e[2]/100,e[3]/100,e[4]):jn.hasOwnProperty(a)?Jn(jn[a]):a==="transparent"?new Y(NaN,NaN,NaN,0):null}function Jn(a){return new Y(a>>16&255,a>>8&255,a&255,1)}function Mt(a,e,i,s){return s<=0&&(a=e=i=NaN),new Y(a,e,i,s)}function Qn(a){return a instanceof He||(a=kn(a)),a?(a=a.rgb(),new Y(a.r,a.g,a.b,a.opacity)):new Y}function Ve(a,e,i,s){return arguments.length===1?Qn(a):new Y(a,e,i,s??1)}function Y(a,e,i,s){this.r=+a,this.g=+e,this.b=+i,this.opacity=+s}et(Y,Ve,Qt(He,{brighter(a){return a=a==null?Ke:Math.pow(Ke,a),new Y(this.r*a,this.g*a,this.b*a,this.opacity)},darker(a){return a=a==null?je:Math.pow(je,a),new Y(this.r*a,this.g*a,this.b*a,this.opacity)},rgb(){return this},clamp(){return new Y(Ne(this.r),Ne(this.g),Ne(this.b),Ot(this.opacity))},displayable(){return-.5<=this.r&&this.r<255.5&&-.5<=this.g&&this.g<255.5&&-.5<=this.b&&this.b<255.5&&0<=this.opacity&&this.opacity<=1},hex:Wn,formatHex:Wn,formatHex8:n1,formatRgb:Yn,toString:Yn}));function Wn(){return`#${Oe(this.r)}${Oe(this.g)}${Oe(this.b)}`}function n1(){return`#${Oe(this.r)}${Oe(this.g)}${Oe(this.b)}${Oe((isNaN(this.opacity)?1:this.opacity)*255)}`}function Yn(){const a=Ot(this.opacity);return`${a===1?"rgb(":"rgba("}${Ne(this.r)}, ${Ne(this.g)}, ${Ne(this.b)}${a===1?")":`, ${a})`}`}function Ot(a){return isNaN(a)?1:Math.max(0,Math.min(1,a))}function Ne(a){return Math.max(0,Math.min(255,Math.round(a)||0))}function Oe(a){return a=Ne(a),(a<16?"0":"")+a.toString(16)}function Xn(a,e,i,s){return s<=0?a=e=i=NaN:i<=0||i>=1?a=e=NaN:e<=0&&(a=NaN),new ve(a,e,i,s)}function yi(a){if(a instanceof ve)return new ve(a.h,a.s,a.l,a.opacity);if(a instanceof He||(a=kn(a)),!a)return new ve;if(a instanceof ve)return a;a=a.rgb();var e=a.r/255,i=a.g/255,s=a.b/255,r=Math.min(e,i,s),l=Math.max(e,i,s),t=NaN,c=l-r,p=(l+r)/2;return c?(e===l?t=(i-s)/c+(i<s)*6:i===l?t=(s-e)/c+2:t=(e-i)/c+4,c/=p<.5?l+r:2-l-r,t*=60):c=p>0&&p<1?0:t,new ve(t,c,p,a.opacity)}function pn(a,e,i,s){return arguments.length===1?yi(a):new ve(a,e,i,s??1)}function ve(a,e,i,s){this.h=+a,this.s=+e,this.l=+i,this.opacity=+s}et(ve,pn,Qt(He,{brighter(a){return a=a==null?Ke:Math.pow(Ke,a),new ve(this.h,this.s,this.l*a,this.opacity)},darker(a){return a=a==null?je:Math.pow(je,a),new ve(this.h,this.s,this.l*a,this.opacity)},rgb(){var a=this.h%360+(this.h<0)*360,e=isNaN(a)||isNaN(this.s)?0:this.s,i=this.l,s=i+(i<.5?i:1-i)*e,r=2*i-s;return new Y(Yt(a>=240?a-240:a+120,r,s),Yt(a,r,s),Yt(a<120?a+240:a-120,r,s),this.opacity)},clamp(){return new ve($n(this.h),Lt(this.s),Lt(this.l),Ot(this.opacity))},displayable(){return(0<=this.s&&this.s<=1||isNaN(this.s))&&0<=this.l&&this.l<=1&&0<=this.opacity&&this.opacity<=1},formatHsl(){const a=Ot(this.opacity);return`${a===1?"hsl(":"hsla("}${$n(this.h)}, ${Lt(this.s)*100}%, ${Lt(this.l)*100}%${a===1?")":`, ${a})`}`}}));function $n(a){return a=(a||0)%360,a<0?a+360:a}function Lt(a){return Math.max(0,Math.min(1,a||0))}function Yt(a,e,i){return(a<60?e+(i-e)*a/60:a<180?i:a<240?e+(i-e)*(240-a)/60:e)*255}const xi=Math.PI/180,wi=180/Math.PI,Gt=18,Ei=.96422,Si=1,Mi=.82521,Li=4/29,Xe=6/29,Ai=3*Xe*Xe,i1=Xe*Xe*Xe;function Fi(a){if(a instanceof Me)return new Me(a.l,a.a,a.b,a.opacity);if(a instanceof ze)return Ci(a);a instanceof Y||(a=Qn(a));var e=en(a.r),i=en(a.g),s=en(a.b),r=Xt((.2225045*e+.7168786*i+.0606169*s)/Si),l,t;return e===i&&i===s?l=t=r:(l=Xt((.4360747*e+.3850649*i+.1430804*s)/Ei),t=Xt((.0139322*e+.0971045*i+.7141733*s)/Mi)),new Me(116*r-16,500*(l-r),200*(r-t),a.opacity)}function un(a,e,i,s){return arguments.length===1?Fi(a):new Me(a,e,i,s??1)}function Me(a,e,i,s){this.l=+a,this.a=+e,this.b=+i,this.opacity=+s}et(Me,un,Qt(He,{brighter(a){return new Me(this.l+Gt*(a??1),this.a,this.b,this.opacity)},darker(a){return new Me(this.l-Gt*(a??1),this.a,this.b,this.opacity)},rgb(){var a=(this.l+16)/116,e=isNaN(this.a)?a:a+this.a/500,i=isNaN(this.b)?a:a-this.b/200;return e=Ei*$t(e),a=Si*$t(a),i=Mi*$t(i),new Y(Kt(3.1338561*e-1.6168667*a-.4906146*i),Kt(-.9787684*e+1.9161415*a+.033454*i),Kt(.0719453*e-.2289914*a+1.4052427*i),this.opacity)}}));function Xt(a){return a>i1?Math.pow(a,1/3):a/Ai+Li}function $t(a){return a>Xe?a*a*a:Ai*(a-Li)}function Kt(a){return 255*(a<=.0031308?12.92*a:1.055*Math.pow(a,1/2.4)-.055)}function en(a){return(a/=255)<=.04045?a/12.92:Math.pow((a+.055)/1.055,2.4)}function a1(a){if(a instanceof ze)return new ze(a.h,a.c,a.l,a.opacity);if(a instanceof Me||(a=Fi(a)),a.a===0&&a.b===0)return new ze(NaN,0<a.l&&a.l<100?0:NaN,a.l,a.opacity);var e=Math.atan2(a.b,a.a)*wi;return new ze(e<0?e+360:e,Math.sqrt(a.a*a.a+a.b*a.b),a.l,a.opacity)}function hn(a,e,i,s){return arguments.length===1?a1(a):new ze(a,e,i,s??1)}function ze(a,e,i,s){this.h=+a,this.c=+e,this.l=+i,this.opacity=+s}function Ci(a){if(isNaN(a.h))return new Me(a.l,0,0,a.opacity);var e=a.h*xi;return new Me(a.l,Math.cos(e)*a.c,Math.sin(e)*a.c,a.opacity)}et(ze,hn,Qt(He,{brighter(a){return new ze(this.h,this.c,this.l+Gt*(a??1),this.opacity)},darker(a){return new ze(this.h,this.c,this.l-Gt*(a??1),this.opacity)},rgb(){return Ci(this).rgb()}}));var zi=-.14861,yn=1.78277,xn=-.29227,Nt=-.90649,Tt=1.97294,Kn=Tt*Nt,ei=Tt*yn,ti=yn*xn-Nt*zi;function s1(a){if(a instanceof Ue)return new Ue(a.h,a.s,a.l,a.opacity);a instanceof Y||(a=Qn(a));var e=a.r/255,i=a.g/255,s=a.b/255,r=(ti*s+Kn*e-ei*i)/(ti+Kn-ei),l=s-r,t=(Tt*(i-r)-xn*l)/Nt,c=Math.sqrt(t*t+l*l)/(Tt*r*(1-r)),p=c?Math.atan2(t,l)*wi-120:NaN;return new Ue(p<0?p+360:p,c,r,a.opacity)}function fn(a,e,i,s){return arguments.length===1?s1(a):new Ue(a,e,i,s??1)}function Ue(a,e,i,s){this.h=+a,this.s=+e,this.l=+i,this.opacity=+s}et(Ue,fn,Qt(He,{brighter(a){return a=a==null?Ke:Math.pow(Ke,a),new Ue(this.h,this.s,this.l*a,this.opacity)},darker(a){return a=a==null?je:Math.pow(je,a),new Ue(this.h,this.s,this.l*a,this.opacity)},rgb(){var a=isNaN(this.h)?0:(this.h+120)*xi,e=+this.l,i=isNaN(this.s)?0:this.s*e*(1-e),s=Math.cos(a),r=Math.sin(a);return new Y(255*(e+i*(zi*s+yn*r)),255*(e+i*(xn*s+Nt*r)),255*(e+i*(Tt*s)),this.opacity)}}));const wn=a=>()=>a;function Di(a,e){return function(i){return a+i*e}}function r1(a,e,i){return a=Math.pow(a,i),e=Math.pow(e,i)-a,i=1/i,function(s){return Math.pow(a+s*e,i)}}function En(a,e){var i=e-a;return i?Di(a,i>180||i<-180?i-360*Math.round(i/360):i):wn(isNaN(a)?e:a)}function l1(a){return(a=+a)==1?re:function(e,i){return i-e?r1(e,i,a):wn(isNaN(e)?i:e)}}function re(a,e){var i=e-a;return i?Di(a,i):wn(isNaN(a)?e:a)}const o1=(function a(e){var i=l1(e);function s(r,l){var t=i((r=Ve(r)).r,(l=Ve(l)).r),c=i(r.g,l.g),p=i(r.b,l.b),f=re(r.opacity,l.opacity);return function(_){return r.r=t(_),r.g=c(_),r.b=p(_),r.opacity=f(_),r+""}}return s.gamma=a,s})(1);function d1(a){return function(e,i){var s=a((e=pn(e)).h,(i=pn(i)).h),r=re(e.s,i.s),l=re(e.l,i.l),t=re(e.opacity,i.opacity);return function(c){return e.h=s(c),e.s=r(c),e.l=l(c),e.opacity=t(c),e+""}}}const c1=d1(En);function Bi(a,e){var i=re((a=un(a)).l,(e=un(e)).l),s=re(a.a,e.a),r=re(a.b,e.b),l=re(a.opacity,e.opacity);return function(t){return a.l=i(t),a.a=s(t),a.b=r(t),a.opacity=l(t),a+""}}function p1(a){return function(e,i){var s=a((e=hn(e)).h,(i=hn(i)).h),r=re(e.c,i.c),l=re(e.l,i.l),t=re(e.opacity,i.opacity);return function(c){return e.h=s(c),e.c=r(c),e.l=l(c),e.opacity=t(c),e+""}}}const u1=p1(En);function Ri(a){return(function e(i){i=+i;function s(r,l){var t=a((r=fn(r)).h,(l=fn(l)).h),c=re(r.s,l.s),p=re(r.l,l.l),f=re(r.opacity,l.opacity);return function(_){return r.h=t(_),r.s=c(_),r.l=p(Math.pow(_,i)),r.opacity=f(_),r+""}}return s.gamma=e,s})(1)}const h1=Ri(En);Ri(re);const Vi=["palette","zebra","tessellation","shading","skybox","webcam","smoothness","stripeAverage","rotationMean","stripeRelief","directionCoherenceRelief","shadingLevel","specularPower","dielectricSpecular","metallic","roughness","anisotropy","reliefGain","metalReflectance","metalEnvironmentTint","iridescencePower"],bt={palette:{label:"Color Blend",defaultValue:1,min:0,max:1,step:.01,unit:"",textureRow:0,textureChannel:3,uiGroup:"color"},zebra:{label:"Iteration Bands",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:1,textureChannel:0,uiGroup:"iteration"},tessellation:{label:"Image Blend",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:1,textureChannel:1,uiGroup:"imageSources"},shading:{label:"Lighting Blend",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:1,textureChannel:2,uiGroup:"lighting"},skybox:{label:"Reflection Blend",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:1,textureChannel:3,uiGroup:"lighting"},webcam:{label:"Webcam Blend",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:2,textureChannel:0,uiGroup:"imageSources"},smoothness:{label:"Smooth Iterations",defaultValue:1,min:0,max:1,step:.01,unit:"",textureRow:2,textureChannel:1,uiGroup:"iteration"},stripeAverage:{label:"Stripe Average",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:5,textureChannel:0,uiGroup:"iteration"},rotationMean:{label:"Direction Coherence",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:5,textureChannel:1,uiGroup:"iteration"},stripeRelief:{label:"Stripe Relief",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:5,textureChannel:2,uiGroup:"iteration"},directionCoherenceRelief:{label:"Direction Relief",defaultValue:0,min:0,max:100,step:.1,unit:"",textureRow:5,textureChannel:3,uiGroup:"iteration"},shadingLevel:{label:"Light Intensity",defaultValue:0,min:0,max:3,step:.05,unit:"",textureRow:2,textureChannel:2,uiGroup:"lighting"},specularPower:{label:"Direct Specular",defaultValue:0,min:0,max:64,step:.5,unit:"",textureRow:2,textureChannel:3,uiGroup:"lighting"},dielectricSpecular:{label:"Dielectric F0",defaultValue:.04,min:0,max:1,step:.01,unit:"",textureRow:3,textureChannel:0,uiGroup:"lighting"},metallic:{label:"Metalness",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:3,textureChannel:1,uiGroup:"lighting"},roughness:{label:"Roughness",defaultValue:0,min:.02,max:1,step:.01,unit:"",textureRow:3,textureChannel:2,uiGroup:"lighting"},anisotropy:{label:"Anisotropy",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:3,textureChannel:3,uiGroup:"lighting"},reliefGain:{label:"Relief Gain",defaultValue:1,min:0,max:2,step:.01,unit:"",textureRow:6,textureChannel:0,uiGroup:"lighting"},metalReflectance:{label:"Metal Reflectance",defaultValue:1,min:0,max:2,step:.01,unit:"",textureRow:6,textureChannel:1,uiGroup:"lighting"},metalEnvironmentTint:{label:"Metal Env Tint",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:6,textureChannel:2,uiGroup:"lighting"},iridescencePower:{label:"Iridescence Strength",defaultValue:0,min:0,max:1,step:.01,unit:"",textureRow:4,textureChannel:3,uiGroup:"iridescence"}},mn=Object.fromEntries(Vi.map(a=>[a,bt[a].defaultValue])),tn={};for(const a of Vi){const e=bt[a].uiGroup;tn[e]||(tn[e]=[]),tn[e].push(a)}const f1=["linear","gaussian","square","exponential"];function m1(a){return typeof a=="string"&&f1.includes(a)}function nn(a){return m1(a.transferCurve)?a.transferCurve:"linear"}function an(a,e){const i=Q1(e);switch(a){case"gaussian":{if(i<=.28)return 0;if(i>=.72)return 1;const l=(i-.28)/(.72-.28);return l*l*(3-2*l)}case"square":return i<=0?0:1;case"exponential":return(Math.exp(3*i)-1)/(Math.exp(3)-1);default:return i}}function Ce(a,e){return e==="reliefGain"?Hi(a):a[e]??mn[e]}const g1=0,_1=2,T1=1;function b1(a){return Math.max(g1,Math.min(_1,a))}function Hi(a){return Number.isFinite(a.reliefGain)?b1(a.reliefGain):Number.isFinite(a.directionalVolume)?Math.max(0,Math.min(1,a.directionalVolume)):T1}function v1(a){const e={...a,reliefGain:Hi(a)};return delete e.directionalVolume,e}function k1(a){return a.map(v1)}function Q1(a){return Math.max(0,Math.min(1,a))}const y1={lab:Bi,rgb:o1,hcl:u1,hsl:c1,cubehelix:h1},ni=4096,x1=7,gn=[];{const a=new Map;for(const e of Object.keys(bt)){const{textureRow:i}=bt[e];i===0||i===4||(a.has(i)||a.set(i,[]),a.get(i).push(e))}for(const[e,i]of a)gn.push({row:e,fields:i});gn.sort((e,i)=>e.row-i.row)}function w1(a,e,i,s){const r=Ce(a,i),l=Ce(e,i);return r+(l-r)*s}function ii(a,e){return a[e]??null}class ai{points;interpolate;constructor(e,i="lab"){this.points=k1(e).sort((s,r)=>s.position-r.position),this.interpolate=y1[i]??Bi}getColorAt(e){if(this.points.length===0)return"#000";if(e<=this.points[0].position)return this.points[0].color;if(e>=this.points[this.points.length-1].position)return this.points[this.points.length-1].color;for(let i=0;i<this.points.length-1;++i){const s=this.points[i],r=this.points[i+1];if(e>=s.position&&e<=r.position){const l=(e-s.position)/(r.position-s.position),t=an(nn(s),l),c=this.interpolate(s.color,r.color);return Ve(c(t)).formatHex()}}return"#000"}getEffectAt(e,i){if(this.points.length===0)return mn[i];if(e<=this.points[0].position)return Ce(this.points[0],i);if(e>=this.points[this.points.length-1].position)return Ce(this.points[this.points.length-1],i);for(let s=0;s<this.points.length-1;++s){const r=this.points[s],l=this.points[s+1];if(e>=r.position&&e<=l.position){const t=(e-r.position)/(l.position-r.position),c=an(nn(r),t);return w1(r,l,i,c)}}return mn[i]}getIridescenceAt(e){if(this.points.length===0)return{color:"#000000",strength:0};if(this.points.length===1)return{color:this.points[0].iridescenceColor??this.points[0].color,strength:this.points[0].iridescenceColor?Ce(this.points[0],"iridescencePower"):0};const i=this.points[0],s=this.points[this.points.length-1];if(e<=i.position)return{color:i.iridescenceColor??i.color,strength:i.iridescenceColor?Ce(i,"iridescencePower"):0};if(e>=s.position)return{color:s.iridescenceColor??s.color,strength:s.iridescenceColor?Ce(s,"iridescencePower"):0};for(let r=0;r<this.points.length-1;++r){const l=this.points[r],t=this.points[r+1];if(e>=l.position&&e<=t.position){const c=(e-l.position)/(t.position-l.position),p=an(nn(l),c),f=ii(l,"iridescenceColor"),_=ii(t,"iridescenceColor");if(!f&&!_)return{color:"#000000",strength:0};const E=f??l.color,w=_??t.color,x=f?Ce(l,"iridescencePower"):0,m=_?Ce(t,"iridescencePower"):0,g=x+(m-x)*p;return{color:Ve(this.interpolate(E,w)(p)).formatHex(),strength:g}}}return{color:"#000000",strength:0}}generateTexture(){const e=ni,i=x1,s=new Float32Array(e*i*4);for(let r=0;r<e;++r){const l=r/(e-1),t=Ve(this.getColorAt(l)),c=(0*e+r)*4;s[c]=(t.r??0)/255,s[c+1]=(t.g??0)/255,s[c+2]=(t.b??0)/255,s[c+3]=this.getEffectAt(l,"palette");for(const{row:E,fields:w}of gn){const x=(E*e+r)*4;for(const m of w){const g=bt[m].textureChannel;s[x+g]=this.getEffectAt(l,m)}}const p=this.getIridescenceAt(l),f=Ve(p.color),_=(4*e+r)*4;s[_]=(f.r??0)/255,s[_+1]=(f.g??0)/255,s[_+2]=(f.b??0)/255,s[_+3]=Math.max(0,Math.min(1,p.strength))}return{data:s,width:e,height:i}}generateThumbnailRow(){const e=ni,i=new ImageData(e,1),s=i.data;for(let r=0;r<e;++r){const l=r/(e-1),t=Ve(this.getColorAt(l)),c=r*4;s[c]=Math.max(0,Math.min(255,Math.round(t.r??0))),s[c+1]=Math.max(0,Math.min(255,Math.round(t.g??0))),s[c+2]=Math.max(0,Math.min(255,Math.round(t.b??0))),s[c+3]=255}return i}}const E1=-100;function At(a){if(!Number.isFinite(a)||a===0)return{mantissa:0,exponent:0};let e=a,i=0;Math.abs(e)<22250738585072014e-324&&(e*=2**64,i-=64);const s=Math.floor(Math.log2(Math.abs(e)))+1;for(e/=2**s,i+=s;Math.abs(e)>=1;)e*=.5,i+=1;for(;Math.abs(e)<.5;)e*=2,i-=1;let r=Math.fround(e);return Math.abs(r)>=1&&(r*=.5,i+=1),{mantissa:r,exponent:i}}const S1=3.321928094887362;function Pi(a){if(a=a.trim(),a.length===0)return null;let e=1;a[0]==="-"?(e=-1,a=a.slice(1)):a[0]==="+"&&(a=a.slice(1));let i=0;const s=a.search(/[eE]/);if(s>=0){const x=parseInt(a.slice(s+1),10);if(!Number.isFinite(x))return null;i=x,a=a.slice(0,s)}const r=a.indexOf("."),l=r>=0?a.slice(0,r):a,t=r>=0?a.slice(r+1):"";if(!/^[0-9]*$/.test(l)||!/^[0-9]*$/.test(t)||l+t==="")return null;const c=l+t,p=l.length;let f=-1;for(let x=0;x<c.length;x++)if(c[x]!=="0"){f=x;break}if(f<0)return{sign:1,m10:0,d:0};const _=c.slice(f,f+18),E=parseFloat(_[0]+"."+_.slice(1)),w=p-1-f+i;return{sign:e,m10:E,d:w}}function Sn(a){const e=Pi(a);return!e||e.m10===0?-1/0:(Math.log10(e.m10)+e.d)*S1}function sn(a){const e=Pi(a);if(!e||e.m10===0)return{mantissa:0,exponent:0};const i=Sn(a);let s=Math.floor(i),r=2**(i-s);r*=.5,s+=1;let l=Math.fround(r*e.sign);return Math.abs(l)>=1&&(l*=.5,s+=1),{mantissa:l,exponent:s}}const Ii=3,we=21,M1=6,si=27,L1=4;function A1(a){if(a.version!==Ii||a.wordsPerBlock!==we||a.rangesWords%M1!==0||a.coefficientFloats%si!==0)return!1;const e=a.coefficientFloats/si;return a.sidecarFloats===e*L1&&a.certificateWords===e*we}function ie(a){return a.kind==="reprojecting"}function Ft(a){return a.kind==="reprojecting"?a.frozenScale:0}function Re(a){return a.kind==="reprojecting"?a.liveScale:0}function F1(a){return a.kind==="reprojecting"&&a.referenceResetDuringZoom}function C1(a,e,i){switch(a.kind){case"idle":return z1(a,e,i);case"reprojecting":return D1(a,e,i)}}function z1(a,e,i){const s=[];switch(e.type){case"referenceReset":return e.orbitWasReset&&!e.muChanged&&s.push({type:"copyResolvedToFrozen"}),s.push({type:"clearHistoryNextFrame"}),{state:a,effects:s};case"scaleChanged":if(e.scale!==e.prevScale){const r=e.scale<e.prevScale,l=e.prevScale,t=r?l/i.threshold:l*i.threshold;return s.push({type:"copyResolvedToFrozen"}),s.push({type:"clearHistoryNextFrame"}),{state:{kind:"reprojecting",frozenScale:l,liveScale:t,zoomingIn:r,referenceResetDuringZoom:!1},effects:s}}return{state:a,effects:s};case"scaleStable":return{state:a,effects:s}}}function D1(a,e,i){const s=[];switch(e.type){case"referenceReset":return e.muChanged?{state:{kind:"idle"},effects:[{type:"clearHistoryNextFrame"}]}:(s.push({type:"clearHistoryNextFrame"}),{state:{...a,referenceResetDuringZoom:!0},effects:s});case"scaleChanged":{let r=a;a.referenceResetDuringZoom&&(r={...a,referenceResetDuringZoom:!1});const l=r.frozenScale/e.scale;if((r.zoomingIn?l>=i.threshold:l<=1/i.threshold)&&!r.referenceResetDuringZoom){const c=r.liveScale,p=r.zoomingIn?e.scale/i.threshold:e.scale*i.threshold;return s.push({type:"copyResolvedToFrozen"}),s.push({type:"clearHistoryNextFrame"}),{state:{kind:"reprojecting",frozenScale:c,liveScale:p,zoomingIn:r.zoomingIn,referenceResetDuringZoom:!1},effects:s}}return{state:r,effects:s}}case"scaleStable":return a.referenceResetDuringZoom||s.push({type:"mergeResolvedAndFrozen"}),s.push({type:"clearHistoryNextFrame"}),{state:{kind:"idle"},effects:s}}}function ri(){return{kind:"idle"}}function B1(a){if(a<=0)return{x:0,y:0};const e=1.324717957244746,i=1/e,s=1/(e*e),r=(.5+a*i)%1,l=(.5+a*s)%1;return{x:r-.5,y:l-.5}}const R1=.01,V1=100,H1=["screenXWithDepth","screenYWithDepth","dragonScaleU","derivativeAngleSin","screenX","screenY","iterSmooth","distance"],P1={screenXWithDepth:0,screenYWithDepth:1,dragonScaleU:2,derivativeAngleSin:3,screenX:4,screenY:5,iterSmooth:7,distance:8},Ht={xVariable:"screenXWithDepth",yVariable:"screenYWithDepth",xScale:1,yScale:1,mirrored:!1},I1={xVariable:"dragonScaleU",yVariable:"derivativeAngleSin",xScale:1,yScale:1,mirrored:!0},O1=new Set(H1);function _n(a){return{...a}}function G1(a){return typeof a=="string"&&O1.has(a)}function li(a,e){return a==="argZ"?"derivativeAngleSin":a==="iterRaw"?"iterSmooth":G1(a)?a:e}function oi(a){const e=typeof a=="number"&&Number.isFinite(a)?a:1;return Math.min(V1,Math.max(R1,e))}function Oi(a){if(!a||typeof a!="object")return _n(Ht);const e=a;return{xVariable:li(e.xVariable,Ht.xVariable),yVariable:li(e.yVariable,Ht.yVariable),xScale:oi(e.xScale),yScale:oi(e.yScale),mirrored:!!e.mirrored}}function N1(a){return _n(a===1?I1:Ht)}function rn(a){return a.textureMapping?Oi(a.textureMapping):N1(a.textureMappingMode)}function di(a){return P1[a]??0}const U1=["loop","sine","pulse","stepped"],j1=["paletteOffset","heightPaletteShift","lightAngle","textureDrift","skyReflectionDrift","phaseColoring","varnish","microBump","displacement","tessellation"],Gi=[{id:"paletteOffset",label:"Palette Offset",defaultType:"loop",defaultSpeed:.8,defaultAmplitude:1,minAmplitude:0,maxAmplitude:1,amplitudeStep:.01,unit:"cycle"},{id:"heightPaletteShift",label:"Height Palette Shift",defaultType:"sine",defaultSpeed:.25,defaultAmplitude:20,minAmplitude:0,maxAmplitude:100,amplitudeStep:.5,unit:""},{id:"lightAngle",label:"Light Angle",defaultType:"loop",defaultSpeed:.15,defaultAmplitude:1,minAmplitude:0,maxAmplitude:1,amplitudeStep:.01,unit:"turn"},{id:"textureDrift",label:"Texture Drift",defaultType:"sine",defaultSpeed:1,defaultAmplitude:1,minAmplitude:0,maxAmplitude:2,amplitudeStep:.01,unit:""},{id:"skyReflectionDrift",label:"Sky Reflection Drift",defaultType:"sine",defaultSpeed:.6,defaultAmplitude:1,minAmplitude:0,maxAmplitude:2,amplitudeStep:.01,unit:""},{id:"phaseColoring",label:"Phase Coloring",defaultType:"pulse",defaultSpeed:.3,defaultAmplitude:25,minAmplitude:0,maxAmplitude:100,amplitudeStep:.5,unit:""},{id:"varnish",label:"Varnish",defaultType:"pulse",defaultSpeed:.22,defaultAmplitude:2,minAmplitude:0,maxAmplitude:10,amplitudeStep:.05,unit:""},{id:"microBump",label:"Micro Bump",defaultType:"pulse",defaultSpeed:.35,defaultAmplitude:.5,minAmplitude:0,maxAmplitude:2,amplitudeStep:.01,unit:""},{id:"displacement",label:"Displacement",defaultType:"sine",defaultSpeed:.2,defaultAmplitude:.02,minAmplitude:0,maxAmplitude:.1,amplitudeStep:.001,unit:""},{id:"tessellation",label:"Tessellation",defaultType:"sine",defaultSpeed:.18,defaultAmplitude:2,minAmplitude:0,maxAmplitude:10,amplitudeStep:.1,unit:""}];new Map(Gi.map(a=>[a.id,a]));function dt(a,e){return typeof a=="number"&&Number.isFinite(a)?a:e}function Z1(a,e){return U1.includes(a)?a:e}function q1(a){return{enabled:a.id==="paletteOffset",type:a.defaultType,speed:a.defaultSpeed,amplitude:a.defaultAmplitude,phase:0}}function J1(a=1){const e=Object.fromEntries(Gi.map(i=>[i.id,q1(i)]));return{globalSpeed:dt(a,1),tracks:e}}function Pt(a,e){const i=J1(e),s=a?.tracks,r=Object.fromEntries(j1.map(l=>{const t=i.tracks[l],c=s?.[l];return[l,{enabled:typeof c?.enabled=="boolean"?c.enabled:t.enabled,type:Z1(c?.type,t.type),speed:dt(c?.speed,t.speed),amplitude:dt(c?.amplitude,t.amplitude),phase:dt(c?.phase,t.phase??0)}]}));return{globalSpeed:dt(a?.globalSpeed,i.globalSpeed),tracks:r}}const Ct=3;function W1(a,e){return e>=0&&a===e}function zt(a){const e=a&32768?-1:1,i=a>>>10&31,s=a&1023;return i===0?e*2**-14*(s/1024):i===31?s?Number.NaN:e*Number.POSITIVE_INFINITY:e*2**(i-15)*(1+s/1024)}const vt=[{key:"merge",label:"Merge (zoom)",help:"Copies de pr\xe9paration puis fusion r\xe9solu+fig\xe9 en fin de zoom. Ne tourne qu'\xe0 l'arr\xeat d'un zoom.",timing:"explicit-span"},{key:"snapshot",label:"Snapshot (zoom)",help:"Copie du display r\xe9solu vers le snapshot fig\xe9 utilis\xe9 pendant le zoom.",timing:"explicit-span"},{key:"reproject",label:"Reprojection (pan)",help:"D\xe9calage entier du cache brut lors d'un pan afin de r\xe9utiliser le calcul.",timing:"end-gap"},{key:"clear",label:"Clear cache",help:"R\xe9initialisation du cache brut par sentinelles, distincte du d\xe9placement de pan.",timing:"end-gap"},{key:"reseed",label:"AA reseed",help:"R\xe9-amor\xe7age s\xe9lectif de la fronti\xe8re pour un \xe9chantillon d'anti-aliasing. Actif seulement en accumulation AA.",timing:"end-gap"},{key:"compute",label:"It\xe9ration",help:"Kernel fusionn\xe9 brush+mandelbrot+comptage (perturbation/BLA/jet…). C'est le cœur du co\xfbt.",timing:"end-gap"},{key:"resolve",label:"Resolve",help:"Pr\xe9sentation bilin\xe9aire temporaire des pixels exacts encore incomplets.",timing:"end-gap"},{key:"aaAccum",label:"Couleur (AA)",help:"Passe couleur accumul\xe9e dans le buffer AA (lin\xe9aire) pendant l'accumulation.",timing:"end-gap"},{key:"color",label:"Couleur",help:"Passe couleur directe : palette, relief, skybox, iridescence → \xe9cran.",timing:"end-gap"},{key:"present",label:"Present (AA)",help:"Division de l'accumulateur AA par le nombre d'\xe9chantillons + sRGB → \xe9cran.",timing:"end-gap"}],Te=Object.fromEntries(vt.map((a,e)=>[a.key,e])),st=vt.length*2,Y1=a=>a?"clear":"reproject",X1=(a,e)=>a&&e,ci=(a,e)=>{const i=Number(a-e)/1e6;return Number.isFinite(i)&&i>=0?i:0},$1=(a,e,i=vt)=>{const s={},r=[];for(let f=0;f<i.length;f++){const _=i[f],E=(e&1<<f)!==0;s[_.key]=E,E&&r.push({slot:_,start:a[f*2],end:a[f*2+1]})}if(r.sort((f,_)=>f.end<_.end?-1:f.end>_.end?1:0),r.length===0)return{active:s,samples:[],spanMs:0};const l=r[0];let t=l.start;if(l.slot.timing==="end-gap")for(const f of r)f.slot.timing==="end-gap"&&f.start<t&&(t=f.start);let c=t;const p=[];for(const f of r){const _=f.start>c?f.start:c,E=f.slot.timing==="explicit-span"?_:c;p.push({key:f.slot.key,durationMs:ci(f.end,E),endTimestamp:f.end}),c=f.end}return{active:s,samples:p,spanMs:ci(r[r.length-1].end,t)}},pi=6,ui=13,rt=1,K1=1,e3=2,t3=1.15,n3=.8,i3=.5,a3=.25,s3=1,r3=1.25,l3=1e4,o3=.001,ln=12,pe=27,G=4,d3=1,Ni=24,Ui=2,hi=a=>Math.ceil(Math.max(1,a)*(Ni+Ui)/4)*4,c3=a=>Math.ceil(Math.max(1,a)*we/4)*4,p3=21,on=1e7,u3=72,Tn=Math.PI*2,lt=10,fi=.25,dn=3,h3=3,f3=37,Fe=f3*Uint32Array.BYTES_PER_ELEMENT,mi=2*Uint32Array.BYTES_PER_ELEMENT+Fe,m3=1e4,Dt=.001;function g3(a){return a.some(e=>(e.stripeAverage??0)>Dt||(e.rotationMean??0)>Dt||(e.stripeRelief??0)>Dt||(e.directionCoherenceRelief??0)>Dt)}const ji=new Float32Array(1),_3=new Uint32Array(ji.buffer);function T3(a){ji[0]=a;const e=_3[0],i=e>>>16&32768,s=(e>>>23&255)-127,r=e&8388607;if(s>=16)return i|31744;if(s>=-14){const l=s+15;return i|l<<10|r>>>13}if(s>=-24){const l=-14-s;return i|(r|8388608)>>>13+l}return i}function gi(a){const e=new Uint16Array(a.length);for(let i=0;i<a.length;++i)e[i]=T3(a[i]);return e}function Ie(a,e,i){return Math.min(Math.max(a,e),i)}function b3(a,e,i){const s=a.phase??0,r=e*a.speed*i+s;switch(a.type){case"loop":return r-Math.floor(r);case"pulse":return .5+.5*Math.sin(r*Tn);case"stepped":return Math.floor((r-Math.floor(r))*8)/Math.max(1,7)*2-1;default:return Math.sin(r*Tn)}}function be(a,e,i){return a.enabled?b3(a,e,i)*a.amplitude:0}function _i(a,e,i,s){return be({...a,phase:(a.phase??0)+s},e,i)}class v3{snapshotCallback;snapshotDestWidth;canvas;device;queue;adapter;ctx;format;mandelbrotNavigator;rawTexture;rawArrayView;rawIterStorageView;rawPayloadView;rawBrushTexture;rawBrushArrayView;rawBrushIterStorageView;rawBrushPayloadView;resolvedDisplay;frozenDisplay;geometryScratchTexture;geometryScratchView;metadataScratchTexture;metadataScratchView;pipelineMerge;bindGroupMerge;uniformBufferMerge;uniformBufferMandelbrot;uniformBufferColor;uniformBufferBrush;uniformBufferResolve;mandelbrotReferenceBuffer;mandelbrotBlaBuffer;mandelbrotBlaLevelBuffer;mandelbrotJetBuffer;mandelbrotJetRadiiBuffer;mandelbrotJetLevelBuffer;mandelbrotValidityBuffer;mandelbrotBlaBufferCapacity=0;mandelbrotBlaLevelBufferCapacity=0;mandelbrotJetBufferCapacity=0;mandelbrotJetRadiiBufferCapacity=0;mandelbrotJetLevelBufferCapacity=0;mandelbrotValidityBufferCapacity=0;dynamicValidityReady=!1;dynamicValidityReferenceLog2Dc=Number.NEGATIVE_INFINITY;dynamicValidityCurrentLog2CMax=Number.NaN;dynamicValidityGeneration=-1;dynamicValidityShadow=!1;dynamicValidityStatsEnabled=!1;workStatsEnabled=!1;dispatchBox={x:0,y:0,width:0,height:0};incrementalReferenceTable=!0;incrementalTableLayout=null;currentOptionalHeaders;currentUnifiedBlockCount=0;currentUnifiedBlockRadii;optionalHeaderRevision=-1;pipelineResolve;bindGroupResolve;pipelineColor;bindGroupColor;pipelineColorAccumClear;pipelineColorAccum;pipelinePresent;bindGroupPresent;accumTexture;accumTextureView;aaTargetTexture;aaTargetTextureView;pipelineAaTarget;bindGroupAaTarget;uniformBufferAaTarget;pipelineAaReseed;bindGroupAaReseed;useAaSelectiveReseed=!0;pipelineInplace;inplacePipelineCache=new Map;inplaceModule;inplacePipelineLayout;inplaceBindGroupLayout;bindGroupInplace;pipelineReprojectCs;bindGroupReprojectCs;rawFieldVersion=0;resolvedDisplayVersion=-1;frozenDisplayVersion=-1;lastRawMutationFrame=0;counterSampleFrame=-1;counterBuffer;workStatsBuffer;counterReadbackSlots=[];counterReadbackWriteIndex=0;counterReadbackSequence=0;latestAppliedCounterReadbackSequence=0;counterReadbackGeneration=0;renderFrameSerial=0;lastCounterDispatchFrame=-dn;unfinishedPixelCount=-1;realizedSkip=-1;workgroupWaste=-1;maxPixelSteps=-1;realLoopStepsApprox=-1;tierAppsApprox=[-1,-1,-1,-1];gateStatsApprox=[-1,-1];secoursStatsApprox=[-1,-1];portfolioEnabled=!0;renormEnabled=!1;renormStatsApprox=[-1,-1];f32AppsApprox=-1;dynamicTierAttemptsApprox=[-1,-1,-1,-1];dynamicTierAcceptsApprox=[-1,-1,-1,-1];dynamicSkipBucketsApprox=[-1,-1,-1,-1];dynamicCandidateUsesApprox=-1;dynamicRejectionReasonsApprox=[-1,-1,-1,-1,-1,-1,-1,-1];dynamicExactFallbacksApprox=-1;tableSaN0=-1;tablePeriodicP=-1;tablePeriodicStatus=0;tablePeriodicDetectedP=-1;tableBandLog2=Number.NaN;tableBandSpread=Number.NaN;tableGateCount=-1;lastTableBuildMs=-1;lastTableBuildStages=-1;lastTableCoefficientsMs=-1;lastTableBoundsMs=-1;lastTableRadiiMs=-1;tableBuildCompletionSerial=0;cmaxOnlyTableRebuildCount=0;optionalHeaderRefreshCount=0;incrementalTableOrbitCoverage=0;incrementalTableBuiltOrbit=0;incrementalTableLevelBlocks=[];incrementalTableTransferredBytes=0;incrementalTableYields=0;incrementalTableCancellations=0;incrementalTableCapacityGrowths=0;incrementalTablePeakRetainedBytes=0;incrementalTableMergeCoefficientsMs=0;incrementalTableCertificateMs=0;incrementalTableEnvelopeMs=0;radialCertificateVersion=0;radialCertificateWordsPerBlock=0;radialCertificateReferenceGrowthCount=0;radialCertificateViewportBuildCount=0;radialCertificateLastBuildCause="none";tableBuildActive=!1;tableBuildProgress=0;tableBuildStage="idle";tableBuildKind="";workStatsSessionSerial=0;workStatsClearedSession=-1;finalStatsBuffer;finalStatsPending=!1;_rafId=null;_drawFn=null;fps=0;isRendering=!1;gpuFrameTimeMs=0;smoothedGpuTimeMs=0;pendingGpuTiming=!1;_emaFrameMs=0;_wasActive=!1;_lastActiveRenderMs=0;_lastDrawMs=0;neutralSize=0;shaderPassColor;timestampCapable=!1;passMeta=vt;passTimingsMs={};passActive={};passGpuSumMs=0;passGpuSpanMs=0;lastIterationPassMs=-1;iterationPassTimingSerial=0;otherPassesGpuMs=0;frameSerial=0;cpuRenderMs=0;frameIntervalMs=0;timestampsEnabled=!1;timestampQuerySet;timestampMarkerPipeline;tsResolveBuffer;tsReadBuffer;tsReadbackFree=!0;tsSlotsUsedThisFrame=0;tsPendingSlots=0;tsPendingBatchSize=rt;tsPendingBatchGeneration=0;tsPendingRemainingPixelCount=-1;batchControllerGeneration=0;batchResetForPendingClear=!1;batchUnderBudgetStreak=0;batchLastRemainingPixelCount=-1;lastRenderStartMs=0;width=0;height=0;antialiasLevel;palettePeriod;previousMandelbrot;previousRenderOptions;previousOrbitMetricsEnabled;needRender=!0;orbitIncomplete=!1;prevGuardedMaxIter=0;currentGuardedMaxIter=0;currentMaxIterations=0;currentReferenceAvailableIter=0;currentReferenceRemainingIter=0;isReferenceValidating=!1;referenceResetSerial=0;referenceResetFlashUntil=0;currentBlaLevelCount=0;currentBlockTableKind=null;approximationMode="perturbation";blaEpsilon=o3;gateEmission=!0;dynamicBlockValidity=!0;maxBlaSkip=65536;precisionBudget="1e-30";pendingMinibrotResolve=null;lastCompletionWallMs=0;lastCompletionGpuMs=0;lastCompletionTotalApps=-1;lastShaderApproxFlag=0;lastShaderBlaLevelCount=0;completionStartMs=0;completionAccumulatedGpuMs=0;completionTimerActive=!1;referenceWorker;referenceJobId=0;referenceAvailableOrbitLen=0;referenceBlaReadyMaxIterations=0;tableGeneration=0;pendingTableClear=!1;pendingTableClearDeadline=0;referenceWorkerFailed=!1;referenceWorkerReady=!1;pendingWorkerMessages=[];referenceViewKey="";referenceWorkerCx="";referenceWorkerCy="";floatExpActive=!1;debugShadingActive=!1;debugViewMode=0;debugViewDirty=!0;debugViewOverride=0;pipelineDebug;bindGroupDebug;referenceOrbitWasReset=!1;activeRef=null;stagingRef=null;skipRenderOnce=!1;get pendingRefActive(){return this.stagingRef!==null}get pendingRefOrbitLen(){return this.stagingRef?.orbitLen??0}get pendingRefMaxIterations(){return this.stagingRef?Math.min(this.currentMaxIterations,on):0}prevFrameMandelbrot;clearHistoryNextFrame=!1;_prevFrameScaleChanged=!1;aaActive=!1;aaSampleIndex=0;aaAccumulatedSamples=0;aaOffsetX=0;aaOffsetY=0;aaReseedPending=!1;rawJittered=!1;aaAuto=!1;aaAnalyticEnabled=!0;aaContrastEnabled=!0;aaFrontierStamped=-1;aaFrontierEligible=-1;aaFrontierBuffer;aaFrontierReadback;aaFrontierMapPending=!1;zoomMagnificationThreshold=16;zoomState={kind:"idle"};needFreezeSnapshot=!1;needMergeSnapshot=!1;mergeUniforms={zf:1,lzf:1,frozenShiftU:0,frozenShiftV:0,aspect:1,angle:0};frozenBaseShiftX=0;frozenBaseShiftY=0;frozenPanShiftX=0;frozenPanShiftY=0;frozenAligned=!1;iterationBatchSize=rt;tileTexture;tileTextureView;skyboxTexture;skyboxTextureView;tileTextureSourceKey;skyboxTextureSourceKey;paletteTexture;paletteTextureView;paletteSampler;skyboxSampler;webcamTexture;webcamTileTexture;webcamTextureView;webcamEnabled=!0;time=0;lastUpdateTime=0;dprMultiplier=1;targetFps=60;constructor(e,i){this.canvas=e,this.shaderPassColor=ba,this.antialiasLevel=i.antialiasLevel,this.palettePeriod=i.palettePeriod,this.time=0}postReferenceWorker(e){return!this.referenceWorker||this.referenceWorkerFailed?!1:e.type==="dispose"?(this.referenceWorker.postMessage(e),!0):this.referenceWorkerReady?(this.referenceWorker.postMessage(e),!0):(this.pendingWorkerMessages.push(e),!0)}markReferenceReset(e=this.currentMaxIterations){this.referenceResetSerial++,this.referenceResetFlashUntil=performance.now()+900,this.referenceAvailableOrbitLen=0,this.currentReferenceAvailableIter=0,this.currentReferenceRemainingIter=e,this.currentGuardedMaxIter=0,this.orbitIncomplete=!0}stagingReady(){const e=this.stagingRef;if(!e)return!1;if(!this.activeRef)return!0;const i=Math.min(this.currentMaxIterations,on-1);return e.orbitLen-1>=i}promoteStagingReference(){const e=this.stagingRef;if(!e)return;if(this.mandelbrotReferenceBuffer){let s=0;for(const r of e.chunks)r.length>0&&this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer,s*Float32Array.BYTES_PER_ELEMENT,r,0,r.length),s+=r.length}if(e.chunks=[],e.incrementalRanges.length>0){this.incrementalTableLayout=null;for(const s of e.incrementalRanges)this.writeIncrementalTableRange(s);e.incrementalRanges=[],this.currentBlaLevelCount=this.incrementalActiveLevelCount(),this.referenceBlaReadyMaxIterations=Math.max(0,(this.incrementalTableLayout?.coveredOrbitLength??1)-1)}else if(e.bla){this.writeBlockTable(e.bla);const s=!this.dynamicBlockValidity||e.bla.kind!=="unified"||this.dynamicValidityReady&&this.dynamicValidityGeneration===this.tableGeneration;this.currentBlaLevelCount=s?e.bla.levelCount:0,this.referenceBlaReadyMaxIterations=e.bla.maxIterations}else this.currentBlaLevelCount=0,this.referenceBlaReadyMaxIterations=0;this.debugViewDirty=!0,this.activeRef=e,this.stagingRef=null,this.referenceWorkerCx=e.cx,this.referenceWorkerCy=e.cy,this.mandelbrotNavigator.reference_origin(e.cx,e.cy),this.referenceAvailableOrbitLen=e.orbitLen;const i=Math.max(0,e.orbitLen-1);this.currentReferenceAvailableIter=i,this.currentReferenceRemainingIter=Math.max(0,this.currentMaxIterations-i),this.currentGuardedMaxIter=Math.min(this.currentMaxIterations,i),this.isReferenceValidating=!1,this.orbitIncomplete=!this.referenceWorkerFailed&&i<this.currentMaxIterations,this.referenceResetSerial++,this.referenceResetFlashUntil=performance.now()+900,this.referenceOrbitWasReset=!0,this.pendingTableClear=!1,this.invalidateCounterReadback(),this.needRender=!0,this.skipRenderOnce=!0}initializeReferenceWorker(){this.referenceWorker?.terminate(),this.referenceWorker=new Worker(new URL("/mandelbrot/presentation/assets/referenceWorker-C089eJo1.js",import.meta.url),{type:"module"}),this.referenceWorker.onmessage=e=>{this.handleReferenceWorkerMessage(e.data)},this.referenceWorker.onerror=e=>{console.error("Reference worker error:",e.message),this.referenceWorkerFailed=!0,this.orbitIncomplete=!1,this.currentBlaLevelCount=0},this.referenceWorkerFailed=!1,this.referenceWorkerReady=!1,this.pendingWorkerMessages=[],this.referenceAvailableOrbitLen=0,this.referenceBlaReadyMaxIterations=0,this.tableBuildActive=!1,this.tableBuildProgress=0,this.tableBuildStage="idle",this.tableBuildKind="",this.pendingTableClear=!1,this.activeRef=null,this.stagingRef=null,this.referenceJobId++}resetReference(e,i){console.log("[REF] Engine.resetReference (teleport)",e.slice(0,14)),this.mandelbrotNavigator&&this.mandelbrotNavigator.reference_origin(e,i),this.activeRef=null,this.stagingRef=null,this.referenceViewKey="",this.tablePeriodicP=-1,this.tablePeriodicStatus=0,this.tablePeriodicDetectedP=-1,this.tableBuildActive=!1,this.tableBuildProgress=0,this.tableBuildStage="idle",this.tableBuildKind="",this.needRender=!0}resetReferenceJob(e,i,s){console.log("[REF] resetReferenceJob -> worker reset",e.cx.slice(0,14),"scale",i.slice(0,10),"maxIter",s,"inPlace",!!this.activeRef),this.stagingRef=null,this.tablePeriodicP=-1,this.tablePeriodicStatus=0,this.tablePeriodicDetectedP=-1,this.tableBuildActive=!1,this.tableBuildProgress=0,this.tableBuildStage="idle",this.tableBuildKind="",this.activeRef||(this.markReferenceReset(s),this.referenceBlaReadyMaxIterations=0,this.currentBlaLevelCount=0,this.referenceOrbitWasReset=!0,this.referenceWorkerCx="",this.referenceWorkerCy=""),this.isReferenceValidating=!0,this.referenceViewKey="",this.referenceJobId++,this.postReferenceWorker({type:"reset",jobId:this.referenceJobId,cx:e.cx,cy:e.cy,scale:i,angle:e.angle,approximationMode:this.approximationMode,blaEpsilon:this.blaEpsilon,gateEmission:this.gateEmission,dynamicBlockValidity:this.dynamicBlockValidity,incrementalReferenceTable:this.incrementalReferenceTable,maxBlaSkip:this.maxBlaSkip,maxIterations:s,precisionBudget:this.precisionBudget,tableGeneration:this.tableGeneration,viewportAspect:this.width/Math.max(1,this.height)})}syncReferenceWorkerView(e,i,s){const r=(this.width/Math.max(1,this.height)).toFixed(6),l=`${e.cx}
${e.cy}
${i}
${e.angle}
${s}
${r}`;l!==this.referenceViewKey&&(this.referenceViewKey=l,this.isReferenceValidating=!0,this.orbitIncomplete=!0,this.needRender=!0,this.postReferenceWorker({type:"updateView",jobId:this.referenceJobId,cx:e.cx,cy:e.cy,scale:i,angle:e.angle,maxIterations:s,viewportAspect:this.width/Math.max(1,this.height)}))}handleReferenceWorkerMessage(e){if(e.type==="minibrotFound"){const i=this.pendingMinibrotResolve;this.pendingMinibrotResolve=null,i?.({status:e.status,cx:e.cx,cy:e.cy,period:e.period,scale:e.scale});return}if(e.type==="ready"){this.referenceWorkerReady=!0;const i=this.pendingWorkerMessages;this.pendingWorkerMessages=[];for(const s of i)this.referenceWorker?.postMessage(s);return}if(e.jobId===this.referenceJobId){if(e.type==="tableProgress"){if(e.tableGeneration!==this.tableGeneration||!(e.refId===this.activeRef?.refId||e.refId===this.stagingRef?.refId))return;this.tableBuildActive=!0,this.tableBuildProgress=Math.min(1,Math.max(0,e.progress)),this.tableBuildStage=e.stage,this.tableBuildKind=e.kind;return}if(e.type==="error"){console.error("Reference worker error:",e.message),this.referenceWorkerFailed=!0,this.orbitIncomplete=!1,this.currentBlaLevelCount=0,this.tableBuildActive=!1,this.tableBuildStage="error";return}if(e.type==="orbitChunk"){const i=this.activeRef,s=this.stagingRef;if(i&&e.refId===i.refId){e.orbit.length>0&&this.mandelbrotReferenceBuffer&&this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer,e.offset*2*Float32Array.BYTES_PER_ELEMENT,e.orbit,0,e.orbit.length),i.orbitLen=e.count,this.referenceAvailableOrbitLen=e.count;const r=Math.max(0,e.count-1);this.currentReferenceAvailableIter=r,this.currentReferenceRemainingIter=Math.max(0,this.currentMaxIterations-r),this.isReferenceValidating=!1,this.currentGuardedMaxIter=Math.min(this.currentMaxIterations,r);const l=this.orbitIncomplete;this.orbitIncomplete=!this.referenceWorkerFailed&&r<this.currentMaxIterations,(this.orbitIncomplete||l)&&(this.needRender=!0);return}if(s&&e.refId===s.refId){if(e.offset!==s.orbitLen)return;s.chunks.push(e.orbit),s.orbitLen=e.count,this.isReferenceValidating=!1;return}if(e.refId>Math.max(s?.refId??0,i?.refId??0)&&e.offset===0){console.log("[REF] staging new reference refId=",e.refId,"ref=",e.referenceCx.slice(0,14)),this.stagingRef={refId:e.refId,cx:e.referenceCx,cy:e.referenceCy,orbitLen:e.count,chunks:[e.orbit],bla:null,incrementalRanges:[]},this.isReferenceValidating=!1;return}return}if(this.activeRef&&e.refId===this.activeRef.refId){if(e.tableGeneration!==this.tableGeneration)return;if(e.type==="tableRange"){const r=this.approximationMode==="auto"&&this.currentBlaLevelCount<=0&&e.ranges.length>0;if(!this.writeIncrementalTableRange(e)||(this.currentBlaLevelCount=this.incrementalActiveLevelCount(),this.referenceBlaReadyMaxIterations=Math.max(0,e.coveredOrbitLength-1),this.incrementalTableOrbitCoverage=e.coveredOrbitLength,this.incrementalTableBuiltOrbit=e.builtOrbitLength,this.incrementalTableLevelBlocks=this.incrementalTableLayout?.committed.slice()??[],this.incrementalTableYields=e.yields,this.incrementalTableCancellations=e.cancellations,this.incrementalTablePeakRetainedBytes=e.peakRetainedBytes,this.incrementalTableMergeCoefficientsMs=e.cumulativeMergeCoefficientsMs,this.incrementalTableCertificateMs=e.cumulativeCertificateMs,this.incrementalTableEnvelopeMs=e.cumulativeCertificateMs,this.radialCertificateVersion=e.certificateVersion,this.radialCertificateWordsPerBlock=e.certificateWordsPerBlock,this.radialCertificateReferenceGrowthCount=e.referenceGrowthCertificates,this.radialCertificateViewportBuildCount=e.viewportOnlyCertificateBuilds,this.radialCertificateLastBuildCause=e.lastCertificateBuildCause,this.tableBuildActive=e.hasMore,this.tableBuildProgress=Math.min(1,e.coveredOrbitLength/Math.max(1,e.maxIterations+1)),this.tableBuildStage=e.hasMore?"bounds":"ready",this.tableBuildKind="unified",this.dynamicValidityReferenceLog2Dc=Number.NaN,this.dynamicValidityCurrentLog2CMax=e.currentLog2CMax,this.dynamicValidityGeneration=e.tableGeneration,this.dynamicValidityReady=this.currentBlaLevelCount>0,this.debugViewDirty=!0,this.isReferenceValidating=!1,e.ranges.length===0))return;this.pendingTableClear?(this.pendingTableClear=!1,this.clearHistoryNextFrame=!0,this.needRender=!0,this.invalidateCounterReadback()):r?(this.unfinishedPixelCount>=0&&(this.needFreezeSnapshot=!0),this.clearHistoryNextFrame=!0,this.needRender=!0,this.invalidateCounterReadback()):(this.needRender=!0,this.invalidateCounterReadback(!0));return}if(e.type==="headersReady"){if(this.currentBlockTableKind!=="unified"||!this.writeOptionalHeaders(e.optionalHeaders))return;this.optionalHeaderRefreshCount++,this.tableBuildActive=!1,this.tableBuildProgress=1,this.tableBuildStage="ready",this.lastTableBuildMs=e.buildMs??this.lastTableBuildMs,this.lastTableBuildStages=e.buildStages??16,e.tableStats&&(this.tableSaN0=e.tableStats.saN0,this.tablePeriodicP=e.tableStats.periodicP,this.tablePeriodicStatus=e.tableStats.periodicStatus,this.tablePeriodicDetectedP=e.tableStats.periodicDetectedP,this.tableGateCount=e.tableStats.gateCount),this.debugViewDirty=!0,this.needRender=!0,this.isReferenceValidating=!1;return}const i=this.approximationMode==="auto"&&this.currentBlaLevelCount<=0&&e.type==="blaReady"&&e.kind==="unified";e.type==="radiiReady"?this.writeRadiiSidecar(e.radii,e.levels,e.levelCount,e.optionalHeaders):this.writeBlockTable(e);const s=!this.dynamicBlockValidity||this.approximationMode!=="auto"||this.currentBlockTableKind==="unified"&&this.dynamicValidityReady&&this.dynamicValidityGeneration===this.tableGeneration;this.currentBlaLevelCount=s?e.levelCount:0,this.referenceBlaReadyMaxIterations=e.maxIterations,this.tableBuildCompletionSerial++,e.type==="radiiReady"&&e.buildStages!==void 0&&(e.buildStages&4)!==0&&(e.buildStages&-21)===0&&this.cmaxOnlyTableRebuildCount++,this.tableBuildActive=!1,this.tableBuildProgress=1,this.tableBuildStage="ready",e.type==="blaReady"&&(this.tableBuildKind=e.kind),this.debugViewDirty=!0,e.buildMs!==void 0&&(this.lastTableBuildMs=e.buildMs,this.lastTableBuildStages=e.buildStages??-1,e.tableStats&&(this.lastTableCoefficientsMs=e.tableStats.coefficientsMs??-1,this.lastTableBoundsMs=e.tableStats.boundsMs??-1,this.lastTableRadiiMs=e.tableStats.radiiMs??-1,this.tableSaN0=e.tableStats.saN0??-1,this.tablePeriodicP=e.tableStats.periodicP??-1,this.tablePeriodicStatus=e.tableStats.periodicStatus??0,this.tablePeriodicDetectedP=e.tableStats.periodicDetectedP??-1,this.tableBandLog2=e.tableStats.bandLog2??Number.NaN,this.tableBandSpread=e.tableStats.bandSpread??Number.NaN,this.tableGateCount=e.tableStats.gateCount??-1),console.log(`[REF] ${e.type==="radiiReady"?"radii sidecar":"table"} landed: build ${e.buildMs.toFixed(0)}ms stages ${e.buildStages??-1} maxIter ${e.maxIterations}`)),this.isReferenceValidating=!1,this.pendingTableClear?(this.pendingTableClear=!1,this.clearHistoryNextFrame=!0,this.needRender=!0,this.invalidateCounterReadback()):i?(this.unfinishedPixelCount>=0&&(this.needFreezeSnapshot=!0),this.clearHistoryNextFrame=!0,this.needRender=!0,this.invalidateCounterReadback()):(this.needRender=!0,this.invalidateCounterReadback(!0))}else if(this.stagingRef&&e.refId===this.stagingRef.refId){if(e.tableGeneration!==this.tableGeneration)return;if(e.type==="tableRange"){e.reset&&(this.stagingRef.incrementalRanges=[]),this.stagingRef.incrementalRanges.push(e),this.tableBuildActive=e.hasMore,this.tableBuildProgress=Math.min(1,e.coveredOrbitLength/Math.max(1,e.maxIterations+1)),this.tableBuildStage=e.hasMore?"bounds":"ready",this.tableBuildKind="unified";return}if(e.type==="radiiReady"){this.stagingRef.bla?.kind==="unified"&&(this.stagingRef.bla.radii=e.radii,this.stagingRef.bla.optionalHeaders=e.optionalHeaders,this.stagingRef.bla.levels=e.levels,this.stagingRef.bla.levelCount=e.levelCount,this.stagingRef.bla.maxIterations=e.maxIterations),this.tableBuildActive=!1,this.tableBuildProgress=1,this.tableBuildStage="ready";return}if(e.type==="headersReady"){this.stagingRef.bla?.kind==="unified"&&(!this.stagingRef.bla.optionalHeaders||e.optionalHeaders.revision>this.stagingRef.bla.optionalHeaders.revision)&&(this.stagingRef.bla.optionalHeaders=e.optionalHeaders),this.tableBuildActive=!1,this.tableBuildProgress=1,this.tableBuildStage="ready";return}this.stagingRef.bla={kind:e.kind,steps:e.steps,radii:e.radii,optionalHeaders:e.optionalHeaders,validity:e.validity,levels:e.levels,levelCount:e.levelCount,maxIterations:e.maxIterations,tableGeneration:e.tableGeneration},this.tableBuildActive=!1,this.tableBuildProgress=1,this.tableBuildStage="ready",this.tableBuildKind=e.kind}}}async initialize(e){if(this.mandelbrotNavigator=e,this.approximationMode=this.mandelbrotNavigator.get_approximation_mode()===5?"auto":this.mandelbrotNavigator.get_approximation_mode()===4?"mobius":this.mandelbrotNavigator.get_approximation_mode()===3?"jet":this.mandelbrotNavigator.get_approximation_mode()===2?"pade":this.mandelbrotNavigator.get_approximation_mode()===1?"bla":"perturbation",this.blaEpsilon=this.mandelbrotNavigator.get_bla_epsilon(),this.mandelbrotNavigator.set_dynamic_block_validity(this.dynamicBlockValidity),this.mandelbrotNavigator.set_incremental_reference_table(this.incrementalReferenceTable),this.initializeReferenceWorker(),!navigator.gpu)throw new Error("WebGPU non support\xe9");if(this.adapter=await navigator.gpu.requestAdapter(),!this.adapter)throw new Error("Adapter WebGPU introuvable");this.timestampCapable=this.adapter.features.has("timestamp-query");const i=[];this.timestampCapable&&i.push("timestamp-query"),this.device=await this.adapter.requestDevice({requiredFeatures:i}),this.timestampsEnabled=this.timestampCapable,console.info(`[Engine] timestamp-query: available=${this.timestampCapable} → per-pass timing ${this.timestampsEnabled?"ON":"OFF"}`),this.device.label="Engine Device",this.device.lost.then(t=>{console.warn(`GPU device lost: reason=${t.reason}, message=${t.message}`)}),this.queue=this.device.queue,this.queue.label="Engine Queue",this.timestampsEnabled&&(this.timestampQuerySet=this.device.createQuerySet({type:"timestamp",count:st,label:"Engine PerfTimestamps"}),this.tsResolveBuffer=this.device.createBuffer({size:st*8,usage:GPUBufferUsage.QUERY_RESOLVE|GPUBufferUsage.COPY_SRC,label:"Engine TS Resolve"}),this.tsReadBuffer=this.device.createBuffer({size:st*8,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,label:"Engine TS Readback"}),this.timestampMarkerPipeline=this.device.createComputePipeline({label:"Engine Timestamp Marker Pipeline",layout:"auto",compute:{module:this.device.createShaderModule({label:"Engine Timestamp Marker Shader",code:"@compute @workgroup_size(1) fn main() {}"}),entryPoint:"main"}})),this.ctx=this.canvas.getContext("webgpu"),this.format=navigator.gpu.getPreferredCanvasFormat(),this.ctx.configure({device:this.device,format:this.format,alphaMode:"opaque"}),this.tileTexture=this.device.createTexture({size:[1,1,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine TileTexture 1x1 Placeholder"}),this.tileTextureView=this.tileTexture.createView(),this.skyboxTexture=this.device.createTexture({size:[1,1,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine SkyboxTexture 1x1 Placeholder"}),this.skyboxTextureView=this.skyboxTexture.createView();const r=new ai([]).generateTexture(),l=gi(r.data);this.paletteTexture=this.device.createTexture({size:[r.width,r.height,1],format:"rgba16float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine PaletteTexture"}),this.device.queue.writeTexture({texture:this.paletteTexture},l.buffer,{bytesPerRow:r.width*8},[r.width,r.height]),this.paletteTextureView=this.paletteTexture.createView(),this.paletteSampler=this.device.createSampler({magFilter:"linear",minFilter:"linear",addressModeU:"repeat",addressModeV:"repeat"}),this.skyboxSampler=this.device.createSampler({magFilter:"linear",minFilter:"linear",mipmapFilter:"linear",addressModeU:"repeat",addressModeV:"clamp-to-edge"}),this.webcamTexture=new G2(1920,1080),this.webcamTileTexture=this.device.createTexture({size:[1920,1080,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT}),this.webcamTextureView=this.webcamTileTexture.createView(),this.uniformBufferMandelbrot=this.device.createBuffer({size:80,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Mandelbrot"}),this.uniformBufferColor=this.device.createBuffer({size:4*u3,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Color"}),this.uniformBufferBrush=this.device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Brush"}),this.uniformBufferResolve=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Resolve"}),this.mandelbrotReferenceBuffer=this.device.createBuffer({size:8*on,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot Orbit ReferenceStorage Buffer"}),this.mandelbrotBlaBuffer=this.device.createBuffer({size:4*ln,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot BLA Storage Buffer"}),this.mandelbrotBlaLevelBuffer=this.device.createBuffer({size:16,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot BLA Level Storage Buffer"}),this.mandelbrotBlaBufferCapacity=1,this.mandelbrotBlaLevelBufferCapacity=1,this.mandelbrotJetBuffer=this.device.createBuffer({size:4*pe,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot Jet Coeff Storage Buffer"}),this.mandelbrotJetRadiiBuffer=this.device.createBuffer({size:4*G,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot Jet Radii Storage Buffer"}),this.mandelbrotJetLevelBuffer=this.device.createBuffer({size:16,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot Jet Level Storage Buffer"}),this.mandelbrotValidityBuffer=this.device.createBuffer({size:hi(1)*Uint32Array.BYTES_PER_ELEMENT,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot Dynamic Validity Storage Buffer"}),this.mandelbrotJetBufferCapacity=1,this.mandelbrotJetRadiiBufferCapacity=1,this.mandelbrotJetLevelBufferCapacity=1,this.mandelbrotValidityBufferCapacity=1,this.counterBuffer=this.device.createBuffer({size:8,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST,label:"Engine Counter Storage"}),this.workStatsBuffer=this.device.createBuffer({size:Fe,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST,label:"Engine WorkStats Storage"}),this.counterReadbackSlots=Array.from({length:h3},(t,c)=>({buffer:this.device.createBuffer({size:mi,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,label:`Engine Counter Readback ${c}`}),pending:!1,sequence:0,generation:0})),this.uniformBufferMerge=this.device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Merge"}),await this._createPipelines(),this.resize()}async _createPipelines(){const e=this.device.createShaderModule({code:ka,label:"Engine ShaderModule Resolve"}),i=this.device.createShaderModule({code:this.shaderPassColor,label:"Engine ShaderModule Color"}),s=this.device.createShaderModule({code:Ta,label:"Engine ShaderModule DebugView"}),r=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:3,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:5,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:6,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:7,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}}],label:"Engine BindGroupLayout DebugView"});this.pipelineDebug=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[r],label:"Engine PipelineLayout DebugView"}),vertex:{module:s,entryPoint:"vs_main"},fragment:{module:s,entryPoint:"fs_main",targets:[{format:this.format}]},primitive:{topology:"triangle-list"},label:"Engine Pipeline DebugView"});const l=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Resolve"}),t=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:3,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:4,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:5,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:6,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:7,visibility:GPUShaderStage.FRAGMENT,sampler:{type:"filtering"}},{binding:8,visibility:GPUShaderStage.FRAGMENT,sampler:{type:"filtering"}},{binding:9,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d"}},{binding:10,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d"}},{binding:11,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d"}},{binding:12,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"uint",viewDimension:"2d"}},{binding:13,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"uint",viewDimension:"2d"}},{binding:14,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Color"}),c=[{format:"r32float"},{format:"r32float"},{format:"r32float"},{format:"rgba16float"},{format:"r32uint"}];this.pipelineResolve=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[l]}),vertex:{module:e,entryPoint:"vs_main"},fragment:{module:e,entryPoint:"fs_main",targets:c},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Resolve"}),this.pipelineColor=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[t]}),vertex:{module:i,entryPoint:"vs_main"},fragment:{module:i,entryPoint:"fs_main_direct",targets:[{format:this.format}]},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Color (direct)"}),this.pipelineColorAccumClear=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[t]}),vertex:{module:i,entryPoint:"vs_main"},fragment:{module:i,entryPoint:"fs_main",targets:[{format:"rgba16float"}]},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline ColorAccumClear"}),this.pipelineColorAccum=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[t]}),vertex:{module:i,entryPoint:"vs_main"},fragment:{module:i,entryPoint:"fs_main",targets:[{format:"rgba16float",blend:{color:{srcFactor:"one",dstFactor:"one",operation:"add"},alpha:{srcFactor:"one",dstFactor:"one",operation:"add"}}}]},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline ColorAccum"});const p=this.device.createShaderModule({code:_a,label:"Engine ShaderModule InplaceCompute"}),f=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:4,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-write",format:"r32float",viewDimension:"2d-array"}},{binding:5,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:6,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:7,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:8,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:9,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:10,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}}],label:"Engine BindGroupLayout InplaceCompute"});this.inplaceModule=p,this.inplaceBindGroupLayout=f,this.inplacePipelineLayout=this.device.createPipelineLayout({bindGroupLayouts:[f]}),this.pipelineInplace=this.getInplacePipeline(!0),this.getInplacePipeline(!1);const _=this.device.createShaderModule({code:va,label:"Engine ShaderModule ReprojectCs"}),E=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:2,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"r32float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout ReprojectCs"});this.pipelineReprojectCs=this.device.createComputePipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[E]}),compute:{module:_,entryPoint:"cs_main"},label:"Engine ComputePipeline ReprojectCs"});const w=this.device.createShaderModule({code:Qa,label:"Engine ShaderModule Merge"}),x=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT|GPUShaderStage.VERTEX,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d"}},{binding:3,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"uint",viewDimension:"2d"}},{binding:4,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:5,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d"}},{binding:6,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"uint",viewDimension:"2d"}}],label:"Engine BindGroupLayout Merge"});this.pipelineMerge=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[x]}),vertex:{module:w,entryPoint:"vs_main"},fragment:{module:w,entryPoint:"fs_main",targets:c},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Merge"});const m=this.device.createShaderModule({code:ya,label:"Engine ShaderModule Present"}),g=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d"}}],label:"Engine BindGroupLayout Present"});this.pipelinePresent=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[g]}),vertex:{module:m,entryPoint:"vs_main"},fragment:{module:m,entryPoint:"fs_main",targets:[{format:this.format}]},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Present"});const Q=this.device.createShaderModule({code:xa,label:"Engine ShaderModule AaTarget"}),z=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:1,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:"unfilterable-float",viewDimension:"2d"}},{binding:2,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"r32float",viewDimension:"2d"}},{binding:3,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:4,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:"float",viewDimension:"2d"}}],label:"Engine BindGroupLayout AaTarget"});this.pipelineAaTarget=this.device.createComputePipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[z]}),compute:{module:Q,entryPoint:"cs_main"},label:"Engine ComputePipeline AaTarget"}),this.uniformBufferAaTarget||(this.uniformBufferAaTarget=this.device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer AaParams"}));const V=this.device.createShaderModule({code:wa,label:"Engine ShaderModule AaReseed"}),T=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"read-write",format:"r32float",viewDimension:"2d"}},{binding:1,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"r32float",viewDimension:"2d"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:3,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:4,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}}],label:"Engine BindGroupLayout AaReseed"});this.pipelineAaReseed=this.device.createComputePipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[T]}),compute:{module:V,entryPoint:"cs_main"},label:"Engine ComputePipeline AaReseed"}),this.aaFrontierBuffer||(this.aaFrontierBuffer=this.device.createBuffer({size:8,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST,label:"Engine AaFrontier Storage"}),this.aaFrontierReadback=this.device.createBuffer({size:8,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST,label:"Engine AaFrontier Readback"})),this.bindGroupResolve=void 0,this.bindGroupColor=void 0,this.bindGroupMerge=void 0,this.bindGroupInplace=void 0,this.bindGroupReprojectCs=void 0,this.bindGroupPresent=void 0}tsWrites(e){if(!(!this.timestampsEnabled||!this.timestampQuerySet))return this.tsSlotsUsedThisFrame|=1<<e,{querySet:this.timestampQuerySet,beginningOfPassWriteIndex:e*2,endOfPassWriteIndex:e*2+1}}tsSpanBoundary(e,i,s){if(!X1(this.timestampsEnabled,!!this.timestampQuerySet)||!this.timestampMarkerPipeline)return;this.tsSlotsUsedThisFrame|=1<<i;const r=e.beginComputePass({label:`Engine timing boundary ${vt[i].key}:${s}`,timestampWrites:{querySet:this.timestampQuerySet,endOfPassWriteIndex:i*2+(s==="start"?0:1)}});r.setPipeline(this.timestampMarkerPipeline),r.dispatchWorkgroups(1),r.end()}tsExplicitSpanEnd(e){if(!(!this.timestampsEnabled||!this.timestampQuerySet))return this.tsSlotsUsedThisFrame|=1<<e,{querySet:this.timestampQuerySet,endOfPassWriteIndex:e*2+1}}readbackTimestamps(){const e=this.tsReadBuffer;if(!e)return;this.tsReadbackFree=!1;const i=this.tsPendingSlots,s=this.tsPendingBatchSize,r=this.tsPendingBatchGeneration,l=this.tsPendingRemainingPixelCount;e.mapAsync(GPUMapMode.READ).then(()=>{try{const t=new BigInt64Array(e.getMappedRange().slice(0)),c={...this.passTimingsMs};let p;const f=$1(t,i);let _=0,E=0;for(const w of f.samples){const x=w.durationMs;w.key==="compute"?p=x:E+=x;const m=c[w.key];c[w.key]=m===void 0?x:m*.8+x*.2,_+=c[w.key]}if(this.otherPassesGpuMs=this.otherPassesGpuMs>0?this.otherPassesGpuMs*.8+E*.2:E,this.passTimingsMs=c,this.passActive=f.active,this.passGpuSumMs=_,f.samples.length){const w=f.spanMs;this.passGpuSpanMs=this.passGpuSpanMs>0?this.passGpuSpanMs*.8+w*.2:w}p!==void 0&&(this.lastIterationPassMs=p,this.iterationPassTimingSerial++,this.applyIterationPassTiming(p,s,r,l))}catch{}finally{try{e.unmap()}catch{}this.tsReadbackFree=!0}}).catch(()=>{this.tsReadbackFree=!0})}getInplacePipeline(e,i=this.portfolioEnabled,s=this.renormEnabled){const r=this.dynamicBlockValidity&&this.approximationMode==="auto",l=r&&this.incrementalReferenceTable&&this.incrementalTableLayout!==null,t=r&&(this.dynamicValidityStatsEnabled||this.dynamicValidityShadow),c=this.workStatsEnabled||t,p=`d${e?1:0}p${i?1:0}r${s?1:0}v${r?1:0}c${l?1:0}s${t?1:0}w${c?1:0}`;let f=this.inplacePipelineCache.get(p);return f||(f=this.device.createComputePipeline({layout:this.inplacePipelineLayout,compute:{module:this.inplaceModule,entryPoint:"cs_main",constants:{ENABLE_DEEP:e?1:0,ENABLE_PORTFOLIO:i?1:0,ENABLE_RENORM:s?1:0,ENABLE_DYNAMIC_VALIDITY:r?1:0,ENABLE_RADIAL_VALIDITY:l?1:0,ENABLE_DYNAMIC_STATS:t?1:0,ENABLE_WORK_STATS:c?1:0}},label:`Engine ComputePipeline InplaceBrush (deep=${e}, portfolio=${i}, renorm=${s}, dynamic=${r}, radial=${l}, dynamicStats=${t}, workStats=${c})`}),this.inplacePipelineCache.set(p,f)),f}iterationAuxiliaryLevelBuffer(){return this.dynamicBlockValidity&&this.approximationMode==="auto"&&(this.dynamicValidityReady||this.incrementalTableLayout!==null)?this.mandelbrotValidityBuffer:this.mandelbrotBlaLevelBuffer}rebuildInplaceBindGroup(){const e=this.iterationAuxiliaryLevelBuffer();if(!this.pipelineInplace||!this.rawArrayView||!this.uniformBufferMandelbrot||!this.mandelbrotReferenceBuffer||!this.mandelbrotBlaBuffer||!e||!this.mandelbrotJetBuffer||!this.mandelbrotJetRadiiBuffer||!this.mandelbrotJetLevelBuffer||!this.uniformBufferBrush||!this.counterBuffer||!this.workStatsBuffer)return;const i=this.inplaceBindGroupLayout;this.bindGroupInplace=this.device.createBindGroup({layout:i,entries:[{binding:0,resource:{buffer:this.uniformBufferMandelbrot}},{binding:1,resource:{buffer:this.mandelbrotReferenceBuffer}},{binding:2,resource:{buffer:this.mandelbrotBlaBuffer}},{binding:3,resource:{buffer:e}},{binding:4,resource:this.rawArrayView},{binding:5,resource:{buffer:this.uniformBufferBrush}},{binding:6,resource:{buffer:this.counterBuffer}},{binding:7,resource:{buffer:this.workStatsBuffer}},{binding:8,resource:{buffer:this.mandelbrotJetBuffer}},{binding:9,resource:{buffer:this.mandelbrotJetLevelBuffer}},{binding:10,resource:{buffer:this.mandelbrotJetRadiiBuffer}}],label:"Engine BindGroup InplaceCompute"})}rebuildIterationBindGroups(){const e=this.iterationAuxiliaryLevelBuffer();!this.uniformBufferMandelbrot||!this.mandelbrotReferenceBuffer||!this.mandelbrotBlaBuffer||!e||!this.mandelbrotJetBuffer||!this.mandelbrotJetRadiiBuffer||!this.mandelbrotJetLevelBuffer||(this.pipelineDebug&&(this.bindGroupDebug=this.device.createBindGroup({layout:this.pipelineDebug.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniformBufferMandelbrot}},{binding:1,resource:{buffer:this.mandelbrotReferenceBuffer}},{binding:2,resource:{buffer:this.mandelbrotBlaBuffer}},{binding:3,resource:{buffer:e}},{binding:5,resource:{buffer:this.mandelbrotJetBuffer}},{binding:6,resource:{buffer:this.mandelbrotJetLevelBuffer}},{binding:7,resource:{buffer:this.mandelbrotJetRadiiBuffer}}],label:"Engine BindGroup DebugView"})),this.rebuildInplaceBindGroup())}createIncrementalLayout(e,i,s){const r=Math.max(8,2**Math.ceil(Math.log2(Math.max(2,s)))),l=[],t=[],c=[];let p=0;for(let f=4;f<r&&f<=1<<18;f*=2){const _=Math.floor((r-1)/f);if(_<=0)break;l.push(p),t.push(_),c.push(f),p+=_}return{refId:e,tableGeneration:i,capacityOrbitLength:r,offsets:l,capacities:t,skips:c,committed:new Array(p>0?l.length:0).fill(0),maxDynamicRadius:new Array(p>0?l.length:0).fill(Number.NEGATIVE_INFINITY),totalBlockCapacity:p,coveredOrbitLength:1,builtOrbitLength:1}}incrementalActiveLevelCount(){const e=this.incrementalTableLayout?.committed;if(!e)return 0;for(let i=e.length-1;i>=0;i--)if(e[i]>0)return i+1;return 0}incrementalHeaderBase(){const e=this.incrementalTableLayout,i=this.incrementalActiveLevelCount();if(!e||i<=0)return 0;const s=i-1;return e.offsets[s]+e.committed[s]}replaceIncrementalBuffers(e,i){const s=this.incrementalTableLayout,r=this.mandelbrotJetBuffer,l=this.mandelbrotJetRadiiBuffer,t=this.mandelbrotJetLevelBuffer,c=this.mandelbrotValidityBuffer,p=Math.max(256,(this.currentOptionalHeaders?.data.length??0)/G),f=this.device.createBuffer({size:Math.max(4,e.totalBlockCapacity*pe*Float32Array.BYTES_PER_ELEMENT),usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC,label:"Engine Incremental Unified Coefficients"}),_=Math.max(1,e.totalBlockCapacity+Math.ceil(p)),E=this.device.createBuffer({size:_*G*Float32Array.BYTES_PER_ELEMENT,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC,label:"Engine Incremental Unified Sidecar"}),w=this.device.createBuffer({size:Math.max(16,e.offsets.length*4*Uint32Array.BYTES_PER_ELEMENT),usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC,label:"Engine Incremental Unified Directory"}),x=this.device.createBuffer({size:Math.max(4,c3(e.totalBlockCapacity)*Uint32Array.BYTES_PER_ELEMENT),usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC,label:"Engine Incremental Unified Radial Certificates"});if(i&&s&&r&&l&&c){const m=this.device.createCommandEncoder({label:"Grow Incremental Unified Table"});for(let g=0;g<s.committed.length;g++){const Q=s.committed[g];Q<=0||g>=e.offsets.length||(e.committed[g]=Q,e.maxDynamicRadius[g]=s.maxDynamicRadius[g],m.copyBufferToBuffer(r,s.offsets[g]*pe*4,f,e.offsets[g]*pe*4,Q*pe*4),m.copyBufferToBuffer(l,s.offsets[g]*G*4,E,e.offsets[g]*G*4,Q*G*4),m.copyBufferToBuffer(c,s.offsets[g]*we*4,x,e.offsets[g]*we*4,Q*we*4))}this.device.queue.submit([m.finish()]),this.incrementalTableCapacityGrowths++}this.mandelbrotJetBuffer=f,this.mandelbrotJetRadiiBuffer=E,this.mandelbrotJetLevelBuffer=w,this.mandelbrotValidityBuffer=x,this.mandelbrotJetBufferCapacity=e.totalBlockCapacity,this.mandelbrotJetRadiiBufferCapacity=_,this.mandelbrotJetLevelBufferCapacity=e.offsets.length,this.mandelbrotValidityBufferCapacity=e.totalBlockCapacity,this.incrementalTableLayout=e,this.rebuildIterationBindGroups(),(r||l||t||c)&&this.device.queue.onSubmittedWorkDone().then(()=>{r?.destroy?.(),l?.destroy?.(),t?.destroy?.(),c?.destroy?.()})}ensureIncrementalHeaderCapacity(e){if(e<=this.mandelbrotJetRadiiBufferCapacity||!this.mandelbrotJetRadiiBuffer)return;const i=this.mandelbrotJetRadiiBuffer,s=this.mandelbrotJetRadiiBufferCapacity,r=2**Math.ceil(Math.log2(Math.max(1,e))),l=this.device.createBuffer({size:r*G*Float32Array.BYTES_PER_ELEMENT,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST|GPUBufferUsage.COPY_SRC,label:"Engine Incremental Unified Sidecar Growth"}),t=this.device.createCommandEncoder({label:"Grow Incremental Header Tail"});t.copyBufferToBuffer(i,0,l,0,s*G*4),this.device.queue.submit([t.finish()]),this.mandelbrotJetRadiiBuffer=l,this.mandelbrotJetRadiiBufferCapacity=r,this.incrementalTableCapacityGrowths++,this.rebuildIterationBindGroups(),this.device.queue.onSubmittedWorkDone().then(()=>i.destroy?.())}writeIncrementalDirectoryAndHeader(){const e=this.incrementalTableLayout;if(!e||!this.mandelbrotJetLevelBuffer||!this.mandelbrotJetRadiiBuffer)return;const i=this.incrementalActiveLevelCount();if(i<=0)return;const s=new Uint32Array(i*4),r=new Float32Array(s.buffer);for(let c=0;c<i;c++)s[c*4]=e.offsets[c],s[c*4+1]=e.committed[c],s[c*4+2]=e.skips[c],r[c*4+3]=e.maxDynamicRadius[c];this.device.queue.writeBuffer(this.mandelbrotJetLevelBuffer,0,s);const l=this.incrementalHeaderBase(),t=this.currentOptionalHeaders?.data??new Float32Array(11*G);this.ensureIncrementalHeaderCapacity(l+t.length/G),this.device.queue.writeBuffer(this.mandelbrotJetRadiiBuffer,l*G*Float32Array.BYTES_PER_ELEMENT,t),this.currentUnifiedBlockCount=l}writeIncrementalTableRange(e){if(e.certificateVersion!==Ii||e.certificateWordsPerBlock!==we||e.ranges.length%6!==0||e.coefficients.length%pe!==0)return!1;const i=e.coefficients.length/pe;if(!A1({version:e.certificateVersion,wordsPerBlock:e.certificateWordsPerBlock,rangesWords:e.ranges.length,coefficientFloats:e.coefficients.length,sidecarFloats:e.radii.length,certificateWords:e.certificates.length,referenceLog2Dc:e.referenceLog2Dc}))return!1;const s=!this.incrementalTableLayout||this.incrementalTableLayout.refId!==e.refId||this.incrementalTableLayout.tableGeneration!==e.tableGeneration;if(e.reset||s){const l=this.createIncrementalLayout(e.refId,e.tableGeneration,e.capacityOrbitLength);this.currentOptionalHeaders=void 0,this.optionalHeaderRevision=-1,this.replaceIncrementalBuffers(l,!1),this.currentBlaLevelCount=0,this.currentUnifiedBlockCount=0,this.currentUnifiedBlockRadii=void 0,this.dynamicValidityReady=!1}else if(e.capacityOrbitLength>this.incrementalTableLayout.capacityOrbitLength){const l=this.createIncrementalLayout(e.refId,e.tableGeneration,e.capacityOrbitLength);l.coveredOrbitLength=this.incrementalTableLayout.coveredOrbitLength,l.builtOrbitLength=this.incrementalTableLayout.builtOrbitLength,this.replaceIncrementalBuffers(l,!0)}const r=this.incrementalTableLayout;for(let l=0;l<e.ranges.length;l+=6){const t=e.ranges[l],c=e.ranges[l+1],p=e.ranges[l+2],f=e.ranges[l+3],_=e.ranges[l+4],E=e.ranges[l+5];if(t>=r.offsets.length||r.skips[t]!==c||r.committed[t]!==p||E!==p+f||E>r.capacities[t]||_+f>i)return!1;const w=r.offsets[t]+p;this.device.queue.writeBuffer(this.mandelbrotJetBuffer,w*pe*4,e.coefficients,_*pe,f*pe),this.device.queue.writeBuffer(this.mandelbrotJetRadiiBuffer,w*G*4,e.radii,_*G,f*G),this.device.queue.writeBuffer(this.mandelbrotValidityBuffer,w*we*4,e.certificates,_*we,f*we);let x=r.maxDynamicRadius[t];for(let m=0;m<f;m++)x=Math.max(x,e.radii[(_+m)*G+3]);r.maxDynamicRadius[t]=x,r.committed[t]=E}return r.coveredOrbitLength=Math.max(r.coveredOrbitLength,e.coveredOrbitLength),r.builtOrbitLength=Math.max(r.builtOrbitLength,e.builtOrbitLength),this.writeIncrementalDirectoryAndHeader(),this.currentBlockTableKind="unified",this.incrementalTableTransferredBytes+=e.ranges.byteLength+e.coefficients.byteLength+e.radii.byteLength+e.certificates.byteLength,this.dynamicValidityReferenceLog2Dc=Number.NaN,this.dynamicValidityCurrentLog2CMax=e.currentLog2CMax,!0}auditDynamicValidityPayload(e){const i=e.validity;if(e.kind!=="unified")return"coefficient table is not unified";if(e.tableGeneration!==this.tableGeneration)return"table generation is stale";if(!i)return"validity payload is missing";if(i.version!==d3)return`unsupported validity version ${i.version}`;if(i.wordsPerBlock!==Ni)return`unexpected validity stride ${i.wordsPerBlock}`;if(i.diagnosticsWordsPerBlock!==Ui)return`unexpected validity diagnostic stride ${i.diagnosticsWordsPerBlock}`;if(!Number.isFinite(i.referenceLog2Dc))return"certified reference domain is not finite";if(e.steps.length%pe!==0)return"unified coefficient payload is misaligned";const s=e.steps.length/pe;if(i.envelopes.length!==s*i.wordsPerBlock)return`validity/coefficient block mismatch ${i.envelopes.length/i.wordsPerBlock}/${s}`;if(i.diagnostics.length!==s*i.diagnosticsWordsPerBlock)return`validity diagnostic block mismatch ${i.diagnostics.length/i.diagnosticsWordsPerBlock}/${s}`;if(e.levels.length!==e.levelCount*4||i.levelCount!==e.levelCount||i.levels.length!==i.levelCount*4)return"validity/coefficient level count mismatch";for(let r=0;r<e.levelCount;r++){const l=r*4;for(let t=0;t<3;t++)if(i.levels[l+t]!==e.levels[l+t])return`validity directory mismatch at level ${r}, field ${t}`}return null}clearDynamicValidityGpuState(){const e=this.dynamicValidityReady||this.dynamicValidityGeneration!==-1||this.dynamicValidityReferenceLog2Dc!==Number.NEGATIVE_INFINITY;this.dynamicValidityReady=!1,this.dynamicValidityGeneration=-1,this.dynamicValidityReferenceLog2Dc=Number.NEGATIVE_INFINITY,this.dynamicValidityCurrentLog2CMax=Number.NaN,this.radialCertificateVersion=0,this.radialCertificateWordsPerBlock=0,this.radialCertificateReferenceGrowthCount=0,this.radialCertificateViewportBuildCount=0,this.radialCertificateLastBuildCause="none",e&&this.rebuildIterationBindGroups()}writeBlockTable(e){if(this.incrementalTableLayout=null,this.currentOptionalHeaders=void 0,this.currentBlockTableKind=e.kind,e.kind==="jet"||e.kind==="mobius"||e.kind==="unified"){const i=Math.ceil(e.steps.length/(e.kind==="mobius"?p3:pe)),s=e.radii,r=e.optionalHeaders?.data.length??0;if(e.kind==="unified"){if(!s||s.length!==i*G)throw new Error(`invalid unified block sidecar: ${s?.length??0} floats for ${i} blocks`);if(!e.optionalHeaders)throw new Error("unified block table omitted its optional-header payload")}if(this.ensureJetBufferCapacity(Math.ceil(e.steps.length/pe)),this.ensureJetRadiiBufferCapacity(i+Math.ceil(r/4)),this.ensureJetLevelBufferCapacity(e.levelCount),e.steps.length>0&&this.mandelbrotJetBuffer&&this.device.queue.writeBuffer(this.mandelbrotJetBuffer,0,e.steps,0,e.steps.length),s&&s.length>0&&this.mandelbrotJetRadiiBuffer&&this.device.queue.writeBuffer(this.mandelbrotJetRadiiBuffer,0,s,0,s.length),e.levels.length>0&&this.mandelbrotJetLevelBuffer&&this.device.queue.writeBuffer(this.mandelbrotJetLevelBuffer,0,e.levels,0,e.levels.length),e.kind==="unified"?(this.currentUnifiedBlockCount=i,this.currentUnifiedBlockRadii=s,this.optionalHeaderRevision=-1,this.writeOptionalHeaders(e.optionalHeaders,i)):(this.currentUnifiedBlockCount=0,this.currentUnifiedBlockRadii=void 0,this.optionalHeaderRevision=-1),this.dynamicBlockValidity){const l=this.auditDynamicValidityPayload(e);if(l)console.warn(`[validity] dynamic table disabled: ${l}`),this.clearDynamicValidityGpuState();else{const t=e.validity,c=t.envelopes.length/t.wordsPerBlock;this.ensureValidityBufferCapacity(c),this.device.queue.writeBuffer(this.mandelbrotValidityBuffer,0,t.envelopes,0,t.envelopes.length),this.device.queue.writeBuffer(this.mandelbrotValidityBuffer,t.envelopes.byteLength,t.diagnostics,0,t.diagnostics.length),!this.dynamicValidityShadow&&t.levels.length>0&&this.device.queue.writeBuffer(this.mandelbrotJetLevelBuffer,0,t.levels,0,t.levels.length),this.dynamicValidityReferenceLog2Dc=t.referenceLog2Dc,this.dynamicValidityGeneration=e.tableGeneration,this.dynamicValidityReady=!0,this.rebuildIterationBindGroups()}}else this.clearDynamicValidityGpuState();return}this.currentUnifiedBlockCount=0,this.currentUnifiedBlockRadii=void 0,this.optionalHeaderRevision=-1,this.clearDynamicValidityGpuState(),this.ensureBlaBufferCapacity(e.steps.length/ln),this.ensureBlaLevelBufferCapacity(e.levelCount),e.steps.length>0&&this.mandelbrotBlaBuffer&&this.device.queue.writeBuffer(this.mandelbrotBlaBuffer,0,e.steps,0,e.steps.length),e.levels.length>0&&this.mandelbrotBlaLevelBuffer&&this.device.queue.writeBuffer(this.mandelbrotBlaLevelBuffer,0,e.levels,0,e.levels.length)}writeRadiiSidecar(e,i,s,r){this.incrementalTableLayout=null;const l=Math.ceil(e.length/G);this.ensureJetRadiiBufferCapacity(l+Math.ceil((r?.data.length??0)/4)),this.ensureJetLevelBufferCapacity(s),e.length>0&&this.mandelbrotJetRadiiBuffer&&this.device.queue.writeBuffer(this.mandelbrotJetRadiiBuffer,0,e,0,e.length),i.length>0&&this.mandelbrotJetLevelBuffer&&this.device.queue.writeBuffer(this.mandelbrotJetLevelBuffer,0,i,0,i.length),this.currentUnifiedBlockCount=l,this.currentUnifiedBlockRadii=e,r&&this.writeOptionalHeaders(r,l)}writeOptionalHeaders(e,i=this.currentUnifiedBlockCount){if(e.version!==1||e.revision<=this.optionalHeaderRevision||e.data.length<11*G||e.data.length%G!==0||i<=0)return!1;if(this.currentOptionalHeaders=e,this.incrementalTableLayout){const r=this.incrementalHeaderBase();return this.ensureIncrementalHeaderCapacity(r+e.data.length/G),this.mandelbrotJetRadiiBuffer?(this.device.queue.writeBuffer(this.mandelbrotJetRadiiBuffer,r*G*Float32Array.BYTES_PER_ELEMENT,e.data),this.currentUnifiedBlockCount=r,this.optionalHeaderRevision=e.revision,this.dynamicValidityCurrentLog2CMax=e.currentLog2CMax,!0):!1}return this.ensureJetRadiiBufferCapacity(i+e.data.length/G)&&this.currentUnifiedBlockRadii&&this.mandelbrotJetRadiiBuffer&&this.device.queue.writeBuffer(this.mandelbrotJetRadiiBuffer,0,this.currentUnifiedBlockRadii,0,this.currentUnifiedBlockRadii.length),this.mandelbrotJetRadiiBuffer?(this.device.queue.writeBuffer(this.mandelbrotJetRadiiBuffer,i*G*Float32Array.BYTES_PER_ELEMENT,e.data,0,e.data.length),this.optionalHeaderRevision=e.revision,this.dynamicValidityCurrentLog2CMax=e.currentLog2CMax,!0):!1}ensureBlaBufferCapacity(e){const i=Math.max(1,Math.ceil(e));i<=this.mandelbrotBlaBufferCapacity||(this.mandelbrotBlaBuffer?.destroy?.(),this.mandelbrotBlaBuffer=this.device.createBuffer({size:i*4*ln,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot BLA Storage Buffer"}),this.mandelbrotBlaBufferCapacity=i,this.rebuildIterationBindGroups())}ensureBlaLevelBufferCapacity(e){const i=Math.max(1,Math.ceil(e));i<=this.mandelbrotBlaLevelBufferCapacity||(this.mandelbrotBlaLevelBuffer?.destroy?.(),this.mandelbrotBlaLevelBuffer=this.device.createBuffer({size:i*4*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot BLA Level Storage Buffer"}),this.mandelbrotBlaLevelBufferCapacity=i,this.rebuildIterationBindGroups())}ensureJetBufferCapacity(e){const i=Math.max(1,Math.ceil(e));i<=this.mandelbrotJetBufferCapacity||(this.mandelbrotJetBuffer?.destroy?.(),this.mandelbrotJetBuffer=this.device.createBuffer({size:i*4*pe,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot Jet Coeff Storage Buffer"}),this.mandelbrotJetBufferCapacity=i,this.ensureJetRadiiBufferCapacity(i),this.rebuildIterationBindGroups())}ensureJetRadiiBufferCapacity(e){const i=Math.max(1,Math.ceil(e));return i<=this.mandelbrotJetRadiiBufferCapacity?!1:(this.mandelbrotJetRadiiBuffer?.destroy?.(),this.mandelbrotJetRadiiBuffer=this.device.createBuffer({size:i*4*G,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot Jet Radii Storage Buffer"}),this.mandelbrotJetRadiiBufferCapacity=i,this.rebuildIterationBindGroups(),!0)}ensureJetLevelBufferCapacity(e){const i=Math.max(1,Math.ceil(e));i<=this.mandelbrotJetLevelBufferCapacity||(this.mandelbrotJetLevelBuffer?.destroy?.(),this.mandelbrotJetLevelBuffer=this.device.createBuffer({size:i*4*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot Jet Level Storage Buffer"}),this.mandelbrotJetLevelBufferCapacity=i,this.rebuildIterationBindGroups())}ensureValidityBufferCapacity(e){const i=Math.max(1,Math.ceil(e));i<=this.mandelbrotValidityBufferCapacity||(this.mandelbrotValidityBuffer?.destroy?.(),this.mandelbrotValidityBuffer=this.device.createBuffer({size:hi(i)*Uint32Array.BYTES_PER_ELEMENT,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot Dynamic Validity Storage Buffer"}),this.mandelbrotValidityBufferCapacity=i,this.rebuildIterationBindGroups())}requestFinalStatsReadback(){if(!this.device||!this.workStatsBuffer||!this.counterBuffer||this.finalStatsPending)return;this.finalStatsBuffer||(this.finalStatsBuffer=this.device.createBuffer({size:mi,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,label:"Engine Final Stats Readback"}));const e=this.workStatsSessionSerial,i=this.device.createCommandEncoder({label:"Engine Final Stats Copy"});i.copyBufferToBuffer(this.counterBuffer,0,this.finalStatsBuffer,0,8),i.copyBufferToBuffer(this.workStatsBuffer,0,this.finalStatsBuffer,8,Fe),this.device.queue.submit([i.finish()]),this.finalStatsPending=!0,(async()=>{let s=!1;try{if(await this.finalStatsBuffer.mapAsync(GPUMapMode.READ),s=!0,e!==this.workStatsSessionSerial)return;const r=new Uint32Array(this.finalStatsBuffer.getMappedRange()),l=r[2],t=r[3];this.gateStatsApprox=[r[10],r[11]],this.secoursStatsApprox=[r[12],r[13]],this.f32AppsApprox=r[14],this.renormStatsApprox=[r[15],r[16]];const c=this.dynamicValidityStatsFromReadback(r);this.dynamicTierAttemptsApprox=c.tierAttempts,this.dynamicTierAcceptsApprox=c.tierAccepts,this.dynamicSkipBucketsApprox=c.skipBuckets,this.dynamicCandidateUsesApprox=c.candidateUses,this.dynamicRejectionReasonsApprox=c.rejectionReasons,this.dynamicExactFallbacksApprox=c.exactFallbacks,l>0&&t/l>=1&&(this.realLoopStepsApprox=l*64,this.tierAppsApprox=[r[6],r[7],r[8],r[9]],this.lastCompletionTotalApps=this.realLoopStepsApprox)}catch{}finally{s&&this.finalStatsBuffer.unmap(),this.finalStatsPending=!1}})()}dynamicValidityStatsFromReadback(e,i=2){const s=i+15;return{tierAttempts:[e[s],e[s+1],e[s+2],e[s+3]],tierAccepts:[e[s+4],e[s+5],e[s+6],e[s+7]],skipBuckets:[e[s+8],e[s+9],e[s+10],e[s+11]],candidateUses:e[s+12],rejectionReasons:[e[s+13],e[s+14],e[s+15],e[s+16],e[s+17],e[s+18],e[s+19],e[s+20]],exactFallbacks:e[s+21]}}async readDynamicValidityCounters(){if(!this.device||!this.workStatsBuffer)return{tierAttempts:[-1,-1,-1,-1],tierAccepts:[-1,-1,-1,-1],skipBuckets:[-1,-1,-1,-1],candidateUses:-1,rejectionReasons:[-1,-1,-1,-1,-1,-1,-1,-1],exactFallbacks:-1};const e=this.device.createBuffer({size:Fe,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,label:"Engine Dynamic Validity Counter Snapshot"}),i=this.device.createCommandEncoder({label:"Engine Dynamic Validity Counter Copy"});i.copyBufferToBuffer(this.workStatsBuffer,0,e,0,Fe),this.device.queue.submit([i.finish()]);try{return await e.mapAsync(GPUMapMode.READ),this.dynamicValidityStatsFromReadback(new Uint32Array(e.getMappedRange()).slice(),0)}finally{e.mapState==="mapped"&&e.unmap(),e.destroy()}}async readWorkStatsSnapshot(){if(!this.device||!this.workStatsBuffer)return{realMean:-1,coveredMean:-1,realizedSkip:-1,totalApps:-1,tierApps:[-1,-1,-1,-1],dynamic:await this.readDynamicValidityCounters()};const e=this.device.createBuffer({size:Fe,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,label:"Engine Work Stats Benchmark Snapshot"}),i=this.device.createCommandEncoder({label:"Engine Work Stats Benchmark Copy"});i.copyBufferToBuffer(this.workStatsBuffer,0,e,0,Fe),this.device.queue.submit([i.finish()]);try{await e.mapAsync(GPUMapMode.READ);const s=new Uint32Array(e.getMappedRange()).slice(),r=s[0],l=s[1];return{realMean:r,coveredMean:l,realizedSkip:r>0?l/r:-1,totalApps:r>0?r*64:-1,tierApps:[s[4],s[5],s[6],s[7]],dynamic:this.dynamicValidityStatsFromReadback(s,0)}}finally{e.mapState==="mapped"&&e.unmap(),e.destroy()}}invalidateCounterReadback(e=!1){this.unfinishedPixelCount=-1,this.realizedSkip=-1,this.workgroupWaste=-1,this.maxPixelSteps=-1,e||(this.realLoopStepsApprox=-1,this.tierAppsApprox=[-1,-1,-1,-1],this.secoursStatsApprox=[-1,-1],this.f32AppsApprox=-1,this.renormStatsApprox=[-1,-1],this.dynamicTierAttemptsApprox=[-1,-1,-1,-1],this.dynamicTierAcceptsApprox=[-1,-1,-1,-1],this.dynamicSkipBucketsApprox=[-1,-1,-1,-1],this.dynamicCandidateUsesApprox=-1,this.dynamicRejectionReasonsApprox=[-1,-1,-1,-1,-1,-1,-1,-1],this.dynamicExactFallbacksApprox=-1,this.workStatsSessionSerial++),this.counterReadbackGeneration++,this.lastCounterDispatchFrame=-dn,this.counterSampleFrame=-1}hasPendingCounterReadbackForCurrentGeneration(){return this.counterReadbackSlots.some(e=>e.pending&&e.generation===this.counterReadbackGeneration)}acquireCounterReadbackSlot(){const e=this.counterReadbackSlots.length;for(let i=0;i<e;i++){const s=(this.counterReadbackWriteIndex+i)%e,r=this.counterReadbackSlots[s];if(!r.pending)return this.counterReadbackWriteIndex=(s+1)%e,r}}scheduleCounterReadback(e,i,s,r){e.pending=!0,e.sequence=i,e.generation=s,(async()=>{let l=!1;try{await e.buffer.mapAsync(GPUMapMode.READ),l=!0;const t=new Uint32Array(e.buffer.getMappedRange()),c=t[0],p=t[2],f=t[3],_=t[4],E=t[5],w=[t[6],t[7],t[8],t[9]],x=[t[12],t[13]],m=t[14],g=[t[15],t[16]],Q=this.dynamicValidityStatsFromReadback(t);this.applyCounterReadback(i,s,r,c,p,f,_,E,w,x,m,g,Q)}catch{}finally{l&&e.buffer.unmap(),e.pending=!1}})()}applyCounterReadback(e,i,s,r,l=0,t=0,c=0,p=0,f=[0,0,0,0],_=[0,0],E=0,w=[0,0],x={tierAttempts:[0,0,0,0],tierAccepts:[0,0,0,0],skipBuckets:[0,0,0,0],candidateUses:0,rejectionReasons:[0,0,0,0,0,0,0,0],exactFallbacks:0}){if(i!==this.counterReadbackGeneration||e<=this.latestAppliedCounterReadbackSequence)return;this.latestAppliedCounterReadbackSequence=e;const m=this.unfinishedPixelCount;if(this.unfinishedPixelCount=r,this.counterSampleFrame=s,l>0){const g=t/l,Q=c/l;g>=1&&Q>=1?(this.realizedSkip=g,this.workgroupWaste=Q,this.maxPixelSteps=p,this.realLoopStepsApprox=l*64,this.tierAppsApprox=[f[0],f[1],f[2],f[3]],this.secoursStatsApprox=[_[0],_[1]],this.f32AppsApprox=E,this.renormStatsApprox=[w[0],w[1]],this.dynamicTierAttemptsApprox=x.tierAttempts,this.dynamicTierAcceptsApprox=x.tierAccepts,this.dynamicSkipBucketsApprox=x.skipBuckets,this.dynamicCandidateUsesApprox=x.candidateUses,this.dynamicRejectionReasonsApprox=x.rejectionReasons,this.dynamicExactFallbacksApprox=x.exactFallbacks):(this.realizedSkip=-1,this.workgroupWaste=-1,this.maxPixelSteps=-1)}m>lt&&r<=lt&&!this.clearHistoryNextFrame&&!ie(this.zoomState)&&(this.needFreezeSnapshot=!0)}scheduleGpuTiming(e){this.pendingGpuTiming||(this.pendingGpuTiming=!0,this.device.queue.onSubmittedWorkDone().then(()=>{this.pendingGpuTiming=!1,this.applyGpuFrameTiming(performance.now()-e)}).catch(()=>{this.pendingGpuTiming=!1}))}applyGpuFrameTiming(e){this.gpuFrameTimeMs=e,!this.debugPipelineActive&&(this.completionTimerActive&&e>0&&(this.completionAccumulatedGpuMs+=e),this.smoothedGpuTimeMs===0?this.smoothedGpuTimeMs=e:this.smoothedGpuTimeMs=this.smoothedGpuTimeMs*(1-fi)+e*fi,this.timestampsEnabled||this.applyIterationPassTiming(e,this.iterationBatchSize,this.batchControllerGeneration,this.unfinishedPixelCount))}applyIterationPassTiming(e,i,s,r){if(this.debugPipelineActive||e<=0||s!==this.batchControllerGeneration)return;const l=1e3/this.targetFps,t=Math.min(l,Math.max(K1,l-this.otherPassesGpuMs-e3)),c=this.getEffectiveMaxBatchSize();if(r>=0){if(this.batchLastRemainingPixelCount>=0&&r>this.batchLastRemainingPixelCount*r3){this.iterationBatchSize=rt,this.batchUnderBudgetStreak=0,this.batchLastRemainingPixelCount=r;return}this.batchLastRemainingPixelCount=r}if(e>t*t3){this.iterationBatchSize=Math.max(rt,Math.floor(Math.min(this.iterationBatchSize,i)*i3)),this.batchUnderBudgetStreak=0;return}if(e<t*n3){if(this.batchUnderBudgetStreak++,this.batchUnderBudgetStreak>=s3){const p=Math.max(1,Math.ceil(this.iterationBatchSize*a3));this.iterationBatchSize=Math.min(c,this.iterationBatchSize+p),this.batchUnderBudgetStreak=0}return}this.batchUnderBudgetStreak=0}getEffectiveMaxBatchSize(){return l3}resize(){const e=(window.devicePixelRatio||1)*this.dprMultiplier,i=this.canvas.parentElement,s=i?.clientWidth||1,r=i?.clientHeight||1;this.width=Math.max(1,Math.round(s*e)),this.height=Math.max(1,Math.round(r*e));const l=this.device?.limits?.maxTextureDimension2D??8192;this.width=Math.min(this.width,l),this.height=Math.min(this.height,l),this.canvas.width=this.width,this.canvas.height=this.height,this.canvas.style.width=s+"px",this.canvas.style.height=r+"px",this.ctx.configure({device:this.device,format:this.format,alphaMode:"opaque"}),this.neutralSize=Math.ceil(Math.sqrt(this.width*this.width+this.height*this.height));const t=this.neutralSize;this.rawTexture?.destroy?.(),this.rawBrushTexture?.destroy?.(),this.destroyDisplaySet(this.resolvedDisplay),this.destroyDisplaySet(this.frozenDisplay),this.geometryScratchTexture?.destroy?.(),this.metadataScratchTexture?.destroy?.(),this.accumTexture?.destroy?.(),this.aaTargetTexture?.destroy?.();const c=(E,w,x=0)=>{const m=this.device.createTexture({size:{width:t,height:t,depthOrArrayLayers:w},format:"r32float",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST|x,label:E}),g=m.createView({dimension:"2d-array",baseArrayLayer:0,arrayLayerCount:w,label:E+" ArrayView"}),Q=[];for(let z=0;z<w;z++)Q.push(m.createView({dimension:"2d",baseArrayLayer:z,arrayLayerCount:1,label:E+` Layer${z}`}));return{texture:m,arrayView:g,layerViews:Q}},p=c("Engine RawTexture (A)",ui,GPUTextureUsage.STORAGE_BINDING);this.rawTexture=p.texture,this.rawArrayView=p.arrayView,this.rawIterStorageView=p.layerViews[0],this.rawPayloadView=this.rawTexture.createView({dimension:"2d-array",baseArrayLayer:8,arrayLayerCount:5,label:"Engine RawTexture (A) PayloadView"});const f=c("Engine RawBrushTexture (B)",ui,GPUTextureUsage.STORAGE_BINDING);this.rawBrushTexture=f.texture,this.rawBrushArrayView=f.arrayView,this.rawBrushIterStorageView=f.layerViews[0],this.rawBrushPayloadView=this.rawBrushTexture.createView({dimension:"2d-array",baseArrayLayer:8,arrayLayerCount:5,label:"Engine RawBrushTexture (B) PayloadView"});const _=E=>{const w=c(E+" Values",Ct),x=this.device.createTexture({size:{width:t,height:t},format:"rgba16float",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST,label:E+" Geometry"}),m=this.device.createTexture({size:{width:t,height:t},format:"r32uint",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST,label:E+" Metadata"});return{valuesTexture:w.texture,valuesArrayView:w.arrayView,valueLayerViews:w.layerViews,geometryTexture:x,geometryView:x.createView({label:E+" GeometryView"}),metadataTexture:m,metadataView:m.createView({label:E+" MetadataView"})}};this.resolvedDisplay=_("Engine ResolvedDisplay"),this.frozenDisplay=_("Engine FrozenDisplay"),this.geometryScratchTexture=this.device.createTexture({size:{width:t,height:t},format:"rgba16float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST,label:"Engine MergeGeometryScratch"}),this.geometryScratchView=this.geometryScratchTexture.createView({label:"Engine MergeGeometryScratch View"}),this.metadataScratchTexture=this.device.createTexture({size:{width:t,height:t},format:"r32uint",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST,label:"Engine MetadataScratch"}),this.metadataScratchView=this.metadataScratchTexture.createView({label:"Engine MetadataScratch View"}),this.resolvedDisplayVersion=-1,this.frozenDisplayVersion=-1,this.accumTexture=this.device.createTexture({size:{width:this.width,height:this.height,depthOrArrayLayers:1},format:"rgba16float",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING,label:"Engine AccumTexture"}),this.accumTextureView=this.accumTexture.createView({label:"Engine AccumTexture View"}),this.pipelinePresent&&(this.bindGroupPresent=this.device.createBindGroup({layout:this.pipelinePresent.getBindGroupLayout(0),entries:[{binding:0,resource:this.accumTextureView}],label:"Engine BindGroup Present"})),this.aaTargetTexture=this.device.createTexture({size:{width:t,height:t,depthOrArrayLayers:1},format:"r32float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING,label:"Engine AaTargetTexture"}),this.aaTargetTextureView=this.aaTargetTexture.createView({label:"Engine AaTargetTexture View"}),this.rebuildRawTextureBindGroups(),this.resetAaState(),this.zoomState=ri(),this.prevFrameMandelbrot=void 0,this.previousMandelbrot=void 0,this.previousRenderOptions=void 0,this.needRender=!0,this.invalidateCounterReadback()}destroyDisplaySet(e){e?.valuesTexture.destroy?.(),e?.geometryTexture.destroy?.(),e?.metadataTexture.destroy?.()}rebuildRawTextureBindGroups(){if(this.pipelineAaTarget&&this.resolvedDisplay&&this.uniformBufferAaTarget&&this.accumTextureView&&(this.bindGroupAaTarget=this.device.createBindGroup({layout:this.pipelineAaTarget.getBindGroupLayout(0),entries:[{binding:0,resource:this.resolvedDisplay.valuesArrayView},{binding:1,resource:this.resolvedDisplay.geometryView},{binding:2,resource:this.aaTargetTextureView},{binding:3,resource:{buffer:this.uniformBufferAaTarget}},{binding:4,resource:this.accumTextureView}],label:"Engine BindGroup AaTarget"})),this.pipelineAaReseed&&this.rawIterStorageView&&this.rawPayloadView&&this.uniformBufferAaTarget&&this.aaFrontierBuffer&&(this.bindGroupAaReseed=this.device.createBindGroup({layout:this.pipelineAaReseed.getBindGroupLayout(0),entries:[{binding:0,resource:this.aaTargetTextureView},{binding:1,resource:this.rawIterStorageView},{binding:2,resource:{buffer:this.uniformBufferAaTarget}},{binding:3,resource:this.rawPayloadView},{binding:4,resource:{buffer:this.aaFrontierBuffer}}],label:"Engine BindGroup AaReseed"})),this.rebuildIterationBindGroups(),this.pipelineReprojectCs&&(this.bindGroupReprojectCs=this.device.createBindGroup({layout:this.pipelineReprojectCs.getBindGroupLayout(0),entries:[{binding:0,resource:{buffer:this.uniformBufferBrush}},{binding:1,resource:this.rawArrayView},{binding:2,resource:this.rawBrushArrayView}],label:"Engine BindGroup ReprojectCs"})),this.pipelineResolve){const e=this.pipelineResolve.getBindGroupLayout(0);this.bindGroupResolve=this.device.createBindGroup({layout:e,entries:[{binding:0,resource:{buffer:this.uniformBufferResolve}},{binding:1,resource:this.rawArrayView}],label:"Engine BindGroup Resolve"})}if(this.rebuildColorBindGroup(),this.pipelineMerge&&this.uniformBufferMerge&&this.resolvedDisplay&&this.rawBrushArrayView&&this.geometryScratchView&&this.metadataScratchView){const e=this.pipelineMerge.getBindGroupLayout(0);this.bindGroupMerge=this.device.createBindGroup({layout:e,entries:[{binding:0,resource:{buffer:this.uniformBufferMerge}},{binding:1,resource:this.resolvedDisplay.valuesArrayView},{binding:2,resource:this.resolvedDisplay.geometryView},{binding:3,resource:this.resolvedDisplay.metadataView},{binding:4,resource:this.rawBrushArrayView},{binding:5,resource:this.geometryScratchView},{binding:6,resource:this.metadataScratchView}],label:"Engine BindGroup Merge"})}}swapRawTextures(){const e=this.rawTexture;this.rawTexture=this.rawBrushTexture,this.rawBrushTexture=e;const i=this.rawArrayView;this.rawArrayView=this.rawBrushArrayView,this.rawBrushArrayView=i;const s=this.rawIterStorageView;this.rawIterStorageView=this.rawBrushIterStorageView,this.rawBrushIterStorageView=s;const r=this.rawPayloadView;this.rawPayloadView=this.rawBrushPayloadView,this.rawBrushPayloadView=r,this.rebuildRawTextureBindGroups()}areObjectsEqual(e,i){return e===void 0||i===void 0?!1:JSON.stringify(e)===JSON.stringify(i)}areColorStopsEqual(e,i){if(e.length!==i.length)return!1;for(const[s,r]of e.entries()){const l=i[s];if(!l||JSON.stringify(r)!==JSON.stringify(l))return!1}return!0}setApproximationMode(e){e!==this.approximationMode&&(e==="bla"?this.mandelbrotNavigator.use_bla():e==="pade"?this.mandelbrotNavigator.use_pade():e==="jet"?this.mandelbrotNavigator.use_jet():e==="mobius"?this.mandelbrotNavigator.use_mobius_cplus():e==="auto"?this.mandelbrotNavigator.use_unified():this.mandelbrotNavigator.use_perturbation(),this.approximationMode=e,this.rebuildIterationBindGroups(),this.currentBlaLevelCount=0,this.tableBuildActive=!1,this.tableBuildProgress=0,this.tableBuildStage="idle",this.tableBuildKind="",e==="auto"&&(this.tablePeriodicP=-1,this.tablePeriodicStatus=0,this.tablePeriodicDetectedP=-1),this.tableGeneration++,this.postReferenceWorker({type:"setApproximationMode",jobId:this.referenceJobId,approximationMode:e,tableGeneration:this.tableGeneration}),this.requestTableClear(e!=="perturbation"),this.needRender=!0,this.invalidateCounterReadback())}requestTableClear(e){e?(this.approximationMode==="auto"&&(this.tablePeriodicP=-1,this.tablePeriodicStatus=0,this.tablePeriodicDetectedP=-1),this.pendingTableClear=!0,this.pendingTableClearDeadline=performance.now()+m3):(this.pendingTableClear=!1,this.clearHistoryNextFrame=!0)}debugOrbitReady=!1;get debugPipelineActive(){return this.debugViewMode>0&&this.debugViewMode!==pi}setDebugView(e){const i=Math.max(0,Math.round(e));i!==this.debugViewMode&&(this.debugViewMode=i,this.resetAaState(),this.debugViewDirty=!0,this.needRender=!0)}getApproximationMode(){return this.approximationMode}setGateEmission(e){if(e===this.gateEmission)return;this.mandelbrotNavigator.set_gate_emission(e),this.gateEmission=e;const i=this.approximationMode==="auto"&&this.dynamicBlockValidity;i||this.tableGeneration++,this.postReferenceWorker({type:"setGateEmission",jobId:this.referenceJobId,on:e,tableGeneration:this.tableGeneration}),this.approximationMode==="auto"&&!i&&(this.currentBlaLevelCount=0,this.requestTableClear(!0),this.needRender=!0)}setDynamicBlockValidity(e){e!==this.dynamicBlockValidity&&(e||(this.dynamicValidityShadow=!1),this.mandelbrotNavigator.set_dynamic_block_validity(e),this.dynamicBlockValidity=e,this.clearDynamicValidityGpuState(),this.tableGeneration++,this.postReferenceWorker({type:"setDynamicBlockValidity",jobId:this.referenceJobId,on:e,tableGeneration:this.tableGeneration}),this.approximationMode==="auto"&&(this.currentBlaLevelCount=0,this.requestTableClear(!0),this.needRender=!0))}getIncrementalReferenceTable(){return this.incrementalReferenceTable}getDynamicValidityShadow(){return this.dynamicValidityShadow}getDynamicValidityStatsEnabled(){return this.dynamicValidityStatsEnabled}getWorkStatsEnabled(){return this.workStatsEnabled}setWorkStatsEnabled(e){e!==this.workStatsEnabled&&(this.workStatsEnabled=e,this.invalidateCounterReadback(),this.needRender=!0)}setDynamicValidityStatsEnabled(e){e!==this.dynamicValidityStatsEnabled&&(this.dynamicValidityStatsEnabled=e,this.invalidateCounterReadback(),this.clearHistoryNextFrame=!0,this.needRender=!0)}setDynamicValidityShadow(e){e&&(this.incrementalReferenceTable&&this.setIncrementalReferenceTable(!1),this.dynamicBlockValidity||this.setDynamicBlockValidity(!0)),e!==this.dynamicValidityShadow&&(this.dynamicValidityShadow=e,this.unfinishedPixelCount>=0&&(this.needFreezeSnapshot=!0),this.clearHistoryNextFrame=!0,this.needRender=!0,this.invalidateCounterReadback())}setIncrementalReferenceTable(e){e!==this.incrementalReferenceTable&&(e&&(this.dynamicValidityShadow=!1),this.mandelbrotNavigator.set_incremental_reference_table(e),this.incrementalReferenceTable=e,this.tableGeneration++,this.postReferenceWorker({type:"setIncrementalReferenceTable",jobId:this.referenceJobId,on:e,tableGeneration:this.tableGeneration}),e||(this.incrementalTableLayout=null,this.incrementalTableOrbitCoverage=0,this.incrementalTableBuiltOrbit=0,this.incrementalTableLevelBlocks=[]),this.approximationMode==="auto"&&(this.currentBlaLevelCount=0,this.clearDynamicValidityGpuState(),this.requestTableClear(!0),this.needRender=!0))}setBlaEpsilon(e){const i=Math.fround(Math.max(11754943508222875e-54,e));i!==this.blaEpsilon&&(this.mandelbrotNavigator.set_bla_epsilon(i),this.blaEpsilon=this.mandelbrotNavigator.get_bla_epsilon(),this.tableGeneration++,this.postReferenceWorker({type:"setBlaEpsilon",jobId:this.referenceJobId,blaEpsilon:this.blaEpsilon,tableGeneration:this.tableGeneration}),(this.approximationMode==="bla"||this.approximationMode==="pade"||this.approximationMode==="jet"||this.approximationMode==="mobius"||this.approximationMode==="auto")&&(this.currentBlaLevelCount=0,this.requestTableClear(!0),this.needRender=!0,this.invalidateCounterReadback()))}getMaxBlaSkip(){return this.maxBlaSkip}getPrecisionBudget(){return this.precisionBudget}setPrecisionBudget(e){e!==this.precisionBudget&&(this.precisionBudget=e,this.referenceViewKey="",this.needRender=!0)}findMinibrot(e=4,i){const s={status:"none",cx:null,cy:null,period:null,scale:null};return this.pendingMinibrotResolve?.(s),this.pendingMinibrotResolve=null,new Promise(r=>{this.pendingMinibrotResolve=r,this.postReferenceWorker({type:"findMinibrot",jobId:this.referenceJobId,maxIter:this.currentMaxIterations,radiusFactor:e,fill:i})})}setMaxBlaSkip(e){const i=Math.min(1048576,Math.max(2,Math.round(e))),s=1<<Math.round(Math.log2(i));s!==this.maxBlaSkip&&(this.mandelbrotNavigator.set_max_bla_skip(s),this.maxBlaSkip=s,this.tableGeneration++,this.postReferenceWorker({type:"setMaxBlaSkip",jobId:this.referenceJobId,maxBlaSkip:s,tableGeneration:this.tableGeneration}),(this.approximationMode==="bla"||this.approximationMode==="pade"||this.approximationMode==="jet"||this.approximationMode==="mobius"||this.approximationMode==="auto")&&(this.currentBlaLevelCount=0,this.requestTableClear(!0),this.needRender=!0,this.invalidateCounterReadback()))}async update(e,i){const s=performance.now();this.lastUpdateTime===0&&(this.lastUpdateTime=s);const r=(s-this.lastUpdateTime)/1e3;this.time+=r,this.lastUpdateTime=s;const l=this.needsMoreFrames();if(l&&!this.completionTimerActive?(this.completionStartMs=s,this.completionAccumulatedGpuMs=0,this.completionTimerActive=!0):!l&&this.completionTimerActive&&(this.lastCompletionWallMs=s-this.completionStartMs,this.lastCompletionGpuMs=this.completionAccumulatedGpuMs,this.lastCompletionTotalApps=this.realLoopStepsApprox,this.completionTimerActive=!1,this.requestFinalStatsReadback()),this.debugShadingActive=i.debugShading,this.debugViewOverride>0&&(this.debugViewMode=this.debugViewOverride),this.stagingReady()){this.promoteStagingReference();return}this.pendingTableClear&&(this.referenceWorkerFailed||performance.now()>this.pendingTableClearDeadline)&&(this.pendingTableClear=!1,this.clearHistoryNextFrame=!0,this.needRender=!0);const t=this.mandelbrotNavigator.get_approximation_mode()===5?"auto":this.mandelbrotNavigator.get_approximation_mode()===4?"mobius":this.mandelbrotNavigator.get_approximation_mode()===3?"jet":this.mandelbrotNavigator.get_approximation_mode()===2?"pade":this.mandelbrotNavigator.get_approximation_mode()===1?"bla":"perturbation",c=this.mandelbrotNavigator.get_bla_epsilon();(t!==this.approximationMode||c!==this.blaEpsilon)&&(this.approximationMode=t,this.blaEpsilon=c,this.currentBlaLevelCount=0,this.tableBuildActive=!1,this.tableBuildProgress=0,this.tableBuildStage="idle",this.tableBuildKind="",this.tableGeneration++,this.postReferenceWorker({type:"setApproximationMode",jobId:this.referenceJobId,approximationMode:t,tableGeneration:this.tableGeneration}),this.postReferenceWorker({type:"setBlaEpsilon",jobId:this.referenceJobId,blaEpsilon:c,tableGeneration:this.tableGeneration}),this.requestTableClear(t!=="perturbation"),this.frozenAligned=!1,this.needFreezeSnapshot=!1,this.needRender=!0,this.invalidateCounterReadback());const p=!this.areObjectsEqual(e,this.previousMandelbrot),f=!this.areObjectsEqual(i,this.previousRenderOptions),_=i.stripeFrequency!==this.previousRenderOptions?.stripeFrequency,E=g3(i.colorStops),w=this.previousOrbitMetricsEnabled!==void 0&&E!==this.previousOrbitMetricsEnabled,x=_&&E;this.needRender=this.needRender||p||f,this.debugViewDirty=this.debugViewDirty||p||f,(p||f)&&this.resetAaState(),this.aaAuto=i.aaAuto??!1,(p||x||w)&&this.invalidateCounterReadback(),(x||w)&&(this.clearHistoryNextFrame=!0),this.previousOrbitMetricsEnabled=E,i.colorStops.some(Ze=>(Ze.webcam??0)>0)?(await this.updateWebcamTexture(),this.needRender=!0):this.webcamTexture?.closeWebcam(),i.activateAnimate&&(this.needRender=!0);const g=this.width/Math.max(1,this.height);let Q=this.previousMandelbrot?.scale||1/e.scale;Q<1&&(Q=1/Q),Q=Math.sqrt(Q)-1;const z=this.referenceOrbitWasReset&&!!this.prevFrameMandelbrot;this.referenceOrbitWasReset=!1;const V=!this.prevFrameMandelbrot||z,T=!!this.prevFrameMandelbrot&&this.prevFrameMandelbrot.mu!==e.mu,O=ie(this.zoomState)&&V&&!T;(V||T)&&(this.clearHistoryNextFrame=!0,O||(this.zoomState=ri(),this.frozenBaseShiftX=0,this.frozenBaseShiftY=0,this.frozenPanShiftX=0,this.frozenPanShiftY=0),this.needFreezeSnapshot=z&&!O&&!T,this.needMergeSnapshot=!1);{const Ze=this.prevFrameMandelbrot&&this.prevFrameMandelbrot.scale!==e.scale;let ye=null;V||T?ye={type:"referenceReset",muChanged:T,orbitWasReset:z}:Ze?ye={type:"scaleChanged",scale:e.scale,prevScale:this.prevFrameMandelbrot.scale}:this.prevFrameMandelbrot&&(ye={type:"scaleStable"});const at=ie(this.zoomState),wt=Ft(this.zoomState),Zt=Re(this.zoomState),ea=F1(this.zoomState),{state:ta,effects:na}=ye?C1(this.zoomState,ye,{threshold:this.zoomMagnificationThreshold}):{state:this.zoomState,effects:[]};this.zoomState=ta,!at&&this._prevFrameScaleChanged&&!Ze&&(this.clearHistoryNextFrame=!0),this._prevFrameScaleChanged=!!Ze;for(const ia of na)switch(ia.type){case"copyResolvedToFrozen":if(this.needFreezeSnapshot=!0,ie(this.zoomState)){if(at)this.frozenBaseShiftX=0,this.frozenBaseShiftY=0;else{const aa=e.dx-this.prevFrameMandelbrot.dx,sa=e.dy-this.prevFrameMandelbrot.dy,zn=Math.sqrt(g*g+1),qt=Ft(this.zoomState);qt>0&&(this.frozenBaseShiftX=Math.round(-(aa*this.neutralSize)/(2*qt*zn)),this.frozenBaseShiftY=Math.round(sa*this.neutralSize/(2*qt*zn)))}this.frozenPanShiftX=0,this.frozenPanShiftY=0}break;case"mergeResolvedAndFrozen":this.needMergeSnapshot=!ea,at&&wt>0&&(this.mergeUniforms={zf:wt/e.scale,lzf:Zt/e.scale,frozenShiftU:(this.frozenBaseShiftX+this.frozenPanShiftX*(Zt/wt))/this.neutralSize,frozenShiftV:-(this.frozenBaseShiftY+this.frozenPanShiftY*(Zt/wt))/this.neutralSize,aspect:g,angle:e.angle});break;case"clearHistoryNextFrame":this.clearHistoryNextFrame=!0;break}}if(!this.areColorStopsEqual(i.colorStops,this.previousRenderOptions?.colorStops||[])||i.interpolationMode!==this.previousRenderOptions?.interpolationMode){const ye=new ai(i.colorStops,i.interpolationMode).generateTexture(),at=gi(ye.data);this.device.queue.writeTexture({texture:this.paletteTexture},at.buffer,{bytesPerRow:ye.width*8},[ye.width,ye.height]),this.needRender=!0}const N=Math.sin(e.angle),B=Math.cos(e.angle),b=Pt(i.animation,i.animationSpeed),M=Ie(b.globalSpeed,0,10),L=i.activateAnimate?this.time:0,D=be(b.tracks.paletteOffset,L,M),P=be(b.tracks.heightPaletteShift,L,M),I=be(b.tracks.lightAngle,L,M)*Tn,C=be(b.tracks.textureDrift,L,M),U=_i(b.tracks.textureDrift,L,M,.25),J=be(b.tracks.skyReflectionDrift,L,M),ue=_i(b.tracks.skyReflectionDrift,L,M,.25),he=be(b.tracks.phaseColoring,L,M),_e=be(b.tracks.varnish,L,M),K=be(b.tracks.microBump,L,M),me=be(b.tracks.displacement,L,M),ee=be(b.tracks.tessellation,L,M),le=i.lightAngle+I,oe=Ie(i.tessellationLevel+ee,0,10),X=Ie(i.displacementAmount+me,0,.1),ge=Ie(i.microBumpStrength+K,0,10),de=Ie(i.varnishStrength+_e,0,10),De=Ie(i.heightPaletteShift+P,0,100),u=Ie(i.phaseColoringStrength+he,0,100),y=Math.hypot(Math.cos(le),Math.sin(le),1.85),S=Oi(i.textureMapping),A=ie(this.zoomState),H=A?Ft(this.zoomState)/e.scale:1,te=A?Re(this.zoomState)/e.scale:1,j=Ft(this.zoomState),q=Re(this.zoomState),ke=Math.max(1,Math.round(i.antialiasLevel??1)),W=Math.hypot(this.aaOffsetX,this.aaOffsetY),ce=this.currentLnScale(),Le=W>0&&Number.isFinite(ce)?Math.log(W)+ce:0,ne=new Float32Array([i.palettePeriod,i.paletteOffset+D,Q,this.time,g,e.angle,i.activateAnimate?1:0,e.mu,H,A||this.frozenAligned||this.needFreezeSnapshot?1:0,te,A&&j>0?(this.frozenBaseShiftX+this.frozenPanShiftX*(q/j))/this.neutralSize:0,A&&j>0?-(this.frozenBaseShiftY+this.frozenPanShiftY*(q/j))/this.neutralSize:0,oe,X,M,e.epsilon,i.ambientOcclusionStrength,ge,0,i.reliefDepth,i.localShadowStrength,le,de,Math.log(e.mu),N,B,Math.cos(le)/y,Math.sin(le)/y,1.85/y,i.paletteMirror?1:0,i.debugShading?1:0,De,i.orbitTrapStrength,u,di(S.xVariable),di(S.yVariable),S.xScale,S.yScale,S.mirrored?1:0,parseFloat(e.cx),parseFloat(e.cy),e.scale,i.gradeContrast??1.18,.03*C,.03*U,.02*J,.02*ue,D,P,I,C,J,he,_e,K,me,ee,this.aaSampleIndex,ke,W>0?this.aaOffsetX/W:0,W>0?this.aaOffsetY/W:0,Number.isFinite(Le)?Le:0,0,i.gradeSaturation??1.12,this.debugViewMode===pi?1:0,Number.isFinite(ce)?ce:0,2,0,0,0,0]);if(this.device.queue.writeBuffer(this.uniformBufferColor,0,ne.buffer),!this.needsMoreFrames())return;const Z=Math.ceil(e.maxIterations);this.currentMaxIterations=Z;const Qe=ie(this.zoomState)&&Re(this.zoomState)>0?Re(this.zoomState):e.scale,Pe=ie(this.zoomState)&&Re(this.zoomState)>0,Ae=e.viewFloatexp,Mn=Pe?At(Qe):Ae?{mantissa:Ae[0],exponent:Ae[1]}:e.scaleStr?sn(e.scaleStr):At(Qe),tt=Mn.exponent,nt=tt<=E1;this.floatExpActive=nt;const Ut=Ae?{mantissa:Ae[2],exponent:Ae[3]}:e.dxStr?sn(e.dxStr):At(e.dx),jt=Ae?{mantissa:Ae[4],exponent:Ae[5]}:e.dyStr?sn(e.dyStr):At(e.dy),qi=Ut.mantissa===0?0:Math.fround(Ut.mantissa*2**(Ut.exponent-tt)),Ji=jt.mantissa===0?0:Math.fround(jt.mantissa*2**(jt.exponent-tt)),Ln=Pe?Qe.toString():e.scaleStr??Qe.toString();this.referenceViewKey||(console.log("[REF] update: reset branch (key empty) | deep",nt,"expScale",tt,"mode",this.approximationMode),this.resetReferenceJob(e,Ln,Z)),this.syncReferenceWorkerView(e,Ln,Z);const it=Math.max(0,this.referenceAvailableOrbitLen-1),yt=Math.min(Z,it);this.currentGuardedMaxIter=yt,this.currentReferenceAvailableIter=it,this.currentReferenceRemainingIter=Math.max(0,Z-it),this.orbitIncomplete=!this.referenceWorkerFailed&&it<Z;const xt=it>=Z;this.debugOrbitReady=xt;const Wi=this.incrementalReferenceTable&&this.approximationMode==="auto"&&this.incrementalTableLayout?.refId===this.activeRef?.refId&&(this.incrementalTableLayout?.coveredOrbitLength??0)>1,Yi=xt||Wi,Xi=this.approximationMode==="jet"||this.approximationMode==="mobius"||this.approximationMode==="auto"?this.referenceBlaReadyMaxIterations>0:this.referenceBlaReadyMaxIterations>=yt,$i=this.approximationMode==="jet"?"jet":this.approximationMode==="mobius"?"mobius":this.approximationMode==="auto"?"unified":"bla",An=(this.approximationMode==="bla"||this.approximationMode==="pade"||this.approximationMode==="jet"||this.approximationMode==="mobius"||this.approximationMode==="auto")&&Yi&&this.currentBlaLevelCount>0&&this.currentBlockTableKind===$i&&(this.approximationMode!=="auto"||!this.dynamicBlockValidity||this.dynamicValidityReady&&this.dynamicValidityGeneration===this.tableGeneration)&&Xi,Fn=An?this.approximationMode==="auto"?this.dynamicBlockValidity?this.dynamicValidityShadow?7:6:5:this.approximationMode==="mobius"?4:this.approximationMode==="jet"?3:this.approximationMode==="pade"?2:1:0,Cn=An?this.currentBlaLevelCount:0;this.lastShaderApproxFlag=Fn,this.lastShaderBlaLevelCount=Cn,this.clearHistoryNextFrame&&!this.batchResetForPendingClear&&(this.iterationBatchSize=rt,this.batchControllerGeneration++,this.batchResetForPendingClear=!0,this.batchUnderBudgetStreak=0,this.batchLastRemainingPixelCount=-1);const Ki=new Float32Array([nt?qi:e.dx,nt?Ji:e.dy,e.mu,nt?Mn.mantissa:Qe,g,e.angle,this.iterationBatchSize,e.epsilon,i.antialiasLevel,this.debugViewMode,yt,xt?1:0,Fn,Cn,this.blaEpsilon,i.stripeFrequency,E?1:0,tt,this.aaOffsetX,this.aaOffsetY]);this.device.queue.writeBuffer(this.uniformBufferMandelbrot,0,Ki.buffer),!ie(this.zoomState)&&!this.clearHistoryNextFrame&&!this.aaActive&&xt&&this.prevGuardedMaxIter<Z&&this.prevGuardedMaxIter>0&&(this.needFreezeSnapshot=!0,this.clearHistoryNextFrame=!0),this.prevGuardedMaxIter=yt,this.previousMandelbrot=structuredClone(e),this.previousRenderOptions=structuredClone(i)}resetAaState(){this.aaActive=!1,this.aaSampleIndex=0,this.aaAccumulatedSamples=0,this.aaOffsetX=0,this.aaOffsetY=0,this.aaReseedPending=!1,this.aaFrontierStamped=-1,this.aaFrontierEligible=-1}currentLnScale(){const e=this.previousMandelbrot;if(e?.viewFloatexp)return e.viewFloatexp[1]*Math.LN2+Math.log(Math.abs(e.viewFloatexp[0])||1);if(e?.scaleStr)return Sn(e.scaleStr)*Math.LN2;const i=e?.scale??0;return i>0?Math.log(i):Number.NEGATIVE_INFINITY}aaAnalyticParams(e,i){const s=i??this.currentLnScale(),r=Math.sqrt(e*e+1),l=Number.isFinite(s)?Math.log(Math.SQRT2*r/Math.max(1,this.neutralSize))+s:Number.NEGATIVE_INFINITY,t=this.aaAnalyticEnabled&&this.approximationMode==="auto"&&Number.isFinite(l);return{logDelta:l,enabled:t}}readbackAaFrontier(){const e=this.aaFrontierReadback;!e||this.aaFrontierMapPending||(this.aaFrontierMapPending=!0,e.mapAsync(GPUMapMode.READ).then(()=>{const i=new Uint32Array(e.getMappedRange().slice(0));e.unmap(),this.aaFrontierStamped=i[0],this.aaFrontierEligible=i[1],this.aaFrontierMapPending=!1}).catch(()=>{this.aaFrontierMapPending=!1}))}triggerAaAccumulation(){this.resetAaState(),this.rawJittered&&(this.clearHistoryNextFrame=!0,this.invalidateCounterReadback()),this.aaActive=!0,this.needRender=!0}get aaProgress(){const e=Math.max(1,Math.round(this.previousRenderOptions?.antialiasLevel??1));return{active:this.aaActive,done:this.aaAccumulatedSamples,total:e}}async render(){if(this.skipRenderOnce){this.skipRenderOnce=!1;return}if(!this.needsMoreFrames()||!this.pipelineInplace||!this.pipelineReprojectCs||!this.pipelineResolve||!this.pipelineColor||!this.bindGroupInplace||!this.bindGroupReprojectCs||!this.bindGroupResolve||!this.bindGroupColor||!this.previousMandelbrot)return;const e=this.previousRenderOptions;if(!e)return;const i=this.width/Math.max(1,this.height),s=this.clearHistoryNextFrame?1:0;this.clearHistoryNextFrame&&this.invalidateCounterReadback();const r=++this.renderFrameSerial;let l=0,t=0;if(!this.clearHistoryNextFrame&&this.prevFrameMandelbrot){const u=this.previousMandelbrot.dx-this.prevFrameMandelbrot.dx,y=this.previousMandelbrot.dy-this.prevFrameMandelbrot.dy,S=this.neutralSize,A=Math.sqrt(i*i+1),H=ie(this.zoomState)&&Re(this.zoomState)>0?Re(this.zoomState):this.previousMandelbrot.scale;l=-(u*S)/(2*H*A),t=y*S/(2*H*A)}const c=Math.round(l),p=Math.round(t),f=c!==0||p!==0;this.clearHistoryNextFrame||(ie(this.zoomState)&&(this.frozenPanShiftX+=c,this.frozenPanShiftY+=p),f&&(this.frozenAligned=!1)),f&&!ie(this.zoomState)&&(this.needFreezeSnapshot=!1);const _=this.hasPendingCounterReadbackForCurrentGeneration(),E=this.previousMandelbrot.angle,w=Math.sqrt(i*i+1),x=Math.abs(Math.cos(E)),m=Math.abs(Math.sin(E)),g=this.neutralSize/2,Q=(i*x+m)/w*g,z=(i*m+x)/w*g,V=Math.max(0,Math.floor((g-Q)/8)*8),T=Math.max(0,Math.floor((g-z)/8)*8),O=Math.min(this.neutralSize,Math.ceil((g+Q)/8)*8),N=Math.min(this.neutralSize,Math.ceil((g+z)/8)*8);this.dispatchBox={x:V,y:T,width:Math.max(8,O-V),height:Math.max(8,N-T)};const B=new Float32Array([i,this.previousMandelbrot.angle,s,l,t,this.dispatchBox.x,this.dispatchBox.y,0]);this.device.queue.writeBuffer(this.uniformBufferBrush,0,B.buffer);const M=!_&&(this.unfinishedPixelCount<0||r-this.lastCounterDispatchFrame>=dn)?this.acquireCounterReadbackSlot():void 0,L=new Float32Array([this.previousMandelbrot.mu,i,this.previousMandelbrot.angle,0]);this.device.queue.writeBuffer(this.uniformBufferResolve,0,L.buffer);let D,P=!1;const I=performance.now();this.frameIntervalMs=this.lastRenderStartMs?I-this.lastRenderStartMs:0,this.lastRenderStartMs=I,this.tsSlotsUsedThisFrame=0,this.frameIntervalMs>0&&this.frameIntervalMs<5e3&&(this._emaFrameMs=this._emaFrameMs>0?this._emaFrameMs*.85+this.frameIntervalMs*.15:this.frameIntervalMs,this.fps=Math.round(1e3/this._emaFrameMs)),this._lastActiveRenderMs=I;const C=this.device.createCommandEncoder();if(this.needMergeSnapshot&&this.pipelineMerge&&this.bindGroupMerge&&this.resolvedDisplay&&this.frozenDisplay&&this.rawBrushTexture&&this.geometryScratchTexture&&this.metadataScratchTexture&&this.frozenDisplayVersion>=0){const u=this.neutralSize;this.tsSpanBoundary(C,Te.merge,"start"),C.copyTextureToTexture({texture:this.frozenDisplay.valuesTexture},{texture:this.rawBrushTexture},{width:u,height:u,depthOrArrayLayers:Ct}),C.copyTextureToTexture({texture:this.frozenDisplay.geometryTexture},{texture:this.geometryScratchTexture},{width:u,height:u}),C.copyTextureToTexture({texture:this.frozenDisplay.metadataTexture},{texture:this.metadataScratchTexture},{width:u,height:u});const y=new Float32Array([this.mergeUniforms.zf,this.mergeUniforms.lzf,this.mergeUniforms.frozenShiftU,this.mergeUniforms.frozenShiftV,this.mergeUniforms.aspect,this.mergeUniforms.angle]);this.device.queue.writeBuffer(this.uniformBufferMerge,0,y.buffer);const S=[...this.frozenDisplay.valueLayerViews,this.frozenDisplay.geometryView,this.frozenDisplay.metadataView].map(H=>({view:H,clearValue:{r:0,g:0,b:0,a:0},loadOp:"clear",storeOp:"store"})),A=C.beginRenderPass({colorAttachments:S,timestampWrites:this.tsExplicitSpanEnd(Te.merge)});A.setPipeline(this.pipelineMerge),A.setBindGroup(0,this.bindGroupMerge),A.draw(6,1,0,0),A.end(),this.frozenDisplayVersion=this.resolvedDisplayVersion,this.needMergeSnapshot=!1,this.frozenAligned=!0,this.frozenPanShiftX=0,this.frozenPanShiftY=0}if(this.needFreezeSnapshot&&this.resolvedDisplay&&this.frozenDisplay){const u=this.neutralSize;this.tsSpanBoundary(C,Te.snapshot,"start"),C.copyTextureToTexture({texture:this.resolvedDisplay.valuesTexture},{texture:this.frozenDisplay.valuesTexture},{width:u,height:u,depthOrArrayLayers:Ct}),C.copyTextureToTexture({texture:this.resolvedDisplay.geometryTexture},{texture:this.frozenDisplay.geometryTexture},{width:u,height:u}),C.copyTextureToTexture({texture:this.resolvedDisplay.metadataTexture},{texture:this.frozenDisplay.metadataTexture},{width:u,height:u}),this.tsSpanBoundary(C,Te.snapshot,"end"),this.frozenDisplayVersion=this.resolvedDisplayVersion,this.needFreezeSnapshot=!1,this.frozenAligned=!0,this.frozenPanShiftX=0,this.frozenPanShiftY=0,ie(this.zoomState)||(this.frozenBaseShiftX=0,this.frozenBaseShiftY=0)}const U=(u,y="clear")=>[...u.valueLayerViews,u.geometryView,u.metadataView].map(S=>({view:S,clearValue:{r:0,g:0,b:0,a:0},loadOp:y,storeOp:"store"})),J=this.clearHistoryNextFrame||f;(J||this.aaReseedPending||this.unfinishedPixelCount!==0)&&(this.lastRawMutationFrame=r,this.rawFieldVersion++);{if(J){const y=Y1(this.clearHistoryNextFrame),S=C.beginComputePass({timestampWrites:this.tsWrites(Te[y])});S.setPipeline(this.pipelineReprojectCs),S.setBindGroup(0,this.bindGroupReprojectCs);const A=Math.ceil(this.neutralSize/16);S.dispatchWorkgroups(A,A),S.end(),this.swapRawTextures()}if(this.aaReseedPending&&this.pipelineAaReseed&&this.bindGroupAaReseed&&this.uniformBufferAaTarget){const y=Math.max(1,Math.round(e.antialiasLevel??1)),S=this.aaAnalyticParams(i);this.device.queue.writeBuffer(this.uniformBufferAaTarget,0,new Float32Array([y,this.aaSampleIndex,this.height,S.enabled?S.logDelta:0,S.enabled?1:0,0,0,0,0,0,0,0,0,0,0,0]).buffer),this.aaFrontierBuffer&&C.clearBuffer(this.aaFrontierBuffer,0,8);const A=C.beginComputePass({timestampWrites:this.tsWrites(Te.reseed)});A.setPipeline(this.pipelineAaReseed),A.setBindGroup(0,this.bindGroupAaReseed);const H=Math.ceil(this.neutralSize/16);A.dispatchWorkgroups(H,H),A.end(),this.rawJittered=!0,this.aaFrontierBuffer&&this.aaFrontierReadback&&!this.aaFrontierMapPending&&(C.copyBufferToBuffer(this.aaFrontierBuffer,0,this.aaFrontierReadback,0,8),P=!0),this.aaReseedPending=!1}C.clearBuffer(this.counterBuffer,0,8),this.workStatsClearedSession!==this.workStatsSessionSerial&&(C.clearBuffer(this.workStatsBuffer,0,Fe),this.workStatsClearedSession=this.workStatsSessionSerial);const u=C.beginComputePass({timestampWrites:this.tsWrites(Te.compute)});u.setPipeline(this.getInplacePipeline(this.floatExpActive)),u.setBindGroup(0,this.bindGroupInplace),u.dispatchWorkgroups(Math.max(1,Math.ceil(this.dispatchBox.width/8)),Math.max(1,Math.ceil(this.dispatchBox.height/8))),u.end()}const he=!this.needFreezeSnapshot&&!this.needMergeSnapshot&&this.unfinishedPixelCount===0&&this.counterSampleFrame>=this.lastRawMutationFrame&&W1(this.rawFieldVersion,this.resolvedDisplayVersion),_e=!this.clearHistoryNextFrame&&!this.needFreezeSnapshot&&!this.needMergeSnapshot&&!ie(this.zoomState)&&!this.orbitIncomplete&&this.unfinishedPixelCount>=0&&this.unfinishedPixelCount<=lt&&!this.hasPendingCounterReadbackForCurrentGeneration();if(!he){const u=C.beginRenderPass({colorAttachments:U(this.resolvedDisplay,"clear"),timestampWrites:this.tsWrites(Te.resolve)});u.setPipeline(this.pipelineResolve),u.setBindGroup(0,this.bindGroupResolve),u.draw(6,1,0,0),u.end(),this.resolvedDisplayVersion=this.rawFieldVersion}if(M){const u=++this.counterReadbackSequence,y=this.counterReadbackGeneration;C.copyBufferToBuffer(this.counterBuffer,0,M.buffer,0,8),C.copyBufferToBuffer(this.workStatsBuffer,0,M.buffer,8,Fe),this.lastCounterDispatchFrame=r,D={slot:M,sequence:u,generation:y,frame:r}}const K=this.bindGroupColor,me=this.ctx.getCurrentTexture().createView(),ee=Math.max(1,Math.round(e.antialiasLevel??1)),le=Math.sqrt(i*i+1);this.aaActive&&ee<=1&&this.resetAaState(),this.aaAuto&&ee>1&&!e.activateAnimate&&!this.aaActive&&this.aaAccumulatedSamples===0&&_e&&this.triggerAaAccumulation();const oe=this.aaActive&&_e&&this.aaAccumulatedSamples<ee&&!!this.accumTextureView&&!!this.pipelineColorAccum&&!!this.pipelineColorAccumClear,X=this.aaAccumulatedSamples>=1||oe;if(oe&&this.aaSampleIndex>0&&(this.aaOffsetX!==0||this.aaOffsetY!==0)&&this.aaAnalyticParams(i).enabled&&this.device.queue.writeBuffer(this.uniformBufferColor,252,new Float32Array([1]).buffer),oe){const u=this.aaSampleIndex===0,y=C.beginRenderPass({colorAttachments:[{view:this.accumTextureView,clearValue:{r:0,g:0,b:0,a:0},loadOp:u?"clear":"load",storeOp:"store"}],timestampWrites:this.tsWrites(Te.aaAccum)});y.setPipeline(u?this.pipelineColorAccumClear:this.pipelineColorAccum),y.setBindGroup(0,K),y.draw(6,1,0,0),y.end()}else if(!X){const u=C.beginRenderPass({colorAttachments:[{view:me,clearValue:{r:1,g:1,b:1,a:1},loadOp:"clear",storeOp:"store"}],timestampWrites:this.tsWrites(Te.color)});u.setPipeline(this.pipelineColor),u.setBindGroup(0,K),u.draw(6,1,0,0),u.end()}if(X&&this.pipelinePresent&&this.bindGroupPresent){const u=C.beginRenderPass({colorAttachments:[{view:me,clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}],timestampWrites:this.tsWrites(Te.present)});u.setPipeline(this.pipelinePresent),u.setBindGroup(0,this.bindGroupPresent),u.draw(6,1,0,0),u.end()}if(this.debugPipelineActive&&!this.debugOrbitReady&&(this.debugViewDirty=!0),this.debugPipelineActive&&this.debugOrbitReady&&this.pipelineDebug&&this.bindGroupDebug){const u=C.beginRenderPass({colorAttachments:[{view:me,clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}]});u.setPipeline(this.pipelineDebug),u.setBindGroup(0,this.bindGroupDebug),u.draw(6,1,0,0),u.end(),this.debugViewDirty=!1}if(oe&&this.aaSampleIndex===0&&!!this.pipelineAaTarget&&!!this.bindGroupAaTarget&&!!this.uniformBufferAaTarget){const u=this.previousMandelbrot;this.device.queue.writeBuffer(this.uniformBufferAaTarget,0,new Float32Array([ee,0,this.height,0,0,i,Math.sin(u.angle),Math.cos(u.angle),this.width,Math.max(e.palettePeriod??1,1e-4),u.mu,Math.log(Math.max(u.mu,1e-6)),this.aaContrastEnabled?1:0,e.aaAdaptive===!1?1:0,0,0]).buffer);const y=C.beginComputePass();y.setPipeline(this.pipelineAaTarget),y.setBindGroup(0,this.bindGroupAaTarget),y.dispatchWorkgroups(Math.ceil(this.neutralSize/16),Math.ceil(this.neutralSize/16)),y.end()}let de=!1;this.timestampsEnabled&&this.timestampQuerySet&&this.tsResolveBuffer&&this.tsReadBuffer&&this.tsReadbackFree&&this.tsSlotsUsedThisFrame!==0&&(C.resolveQuerySet(this.timestampQuerySet,0,st,this.tsResolveBuffer,0),C.copyBufferToBuffer(this.tsResolveBuffer,0,this.tsReadBuffer,0,st*8),this.tsPendingSlots=this.tsSlotsUsedThisFrame,this.tsPendingBatchSize=this.iterationBatchSize,this.tsPendingBatchGeneration=this.batchControllerGeneration,this.tsPendingRemainingPixelCount=this.unfinishedPixelCount,de=!0);const De=performance.now();if(this.device.queue.submit([C.finish()]),this.cpuRenderMs=performance.now()-I,this.frameSerial++,de&&this.readbackTimestamps(),this.debugPipelineActive){const u=performance.now();this.device.queue.onSubmittedWorkDone().then(()=>{console.log(`[debug view] GPU frame ${(performance.now()-u).toFixed(1)}ms (mode ${this.approximationMode}, view ${this.debugViewMode})`)})}if(this.scheduleGpuTiming(De),D&&this.scheduleCounterReadback(D.slot,D.sequence,D.generation,D.frame),P&&this.readbackAaFrontier(),this.clearHistoryNextFrame&&(this.rawJittered=this.aaOffsetX!==0||this.aaOffsetY!==0,this.batchResetForPendingClear=!1),this.clearHistoryNextFrame=!1,this.prevFrameMandelbrot={...this.previousMandelbrot},this.needRender=!1,oe)if(this.aaAccumulatedSamples++,this.aaAccumulatedSamples<ee){this.aaSampleIndex++;const u=B1(this.aaSampleIndex);this.aaOffsetX=u.x*2*le/Math.max(1,this.neutralSize),this.aaOffsetY=u.y*2*le/Math.max(1,this.neutralSize),this.useAaSelectiveReseed&&!!this.pipelineAaReseed&&!!this.bindGroupAaReseed?(this.aaReseedPending=!0,this.invalidateCounterReadback()):this.clearHistoryNextFrame=!0,this.needRender=!0}else this.aaActive=!1;if(this.snapshotCallback){try{const u=this.snapshotDestWidth??256,y=Math.round(u*9/16),S=this.device.createTexture({size:[u,y,1],format:this.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});{const ne=this.device.createCommandEncoder(),Z=ne.beginRenderPass({colorAttachments:[{view:S.createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}]});Z.setPipeline(this.pipelineColor),Z.setBindGroup(0,K),Z.draw(6,1,0,0),Z.end(),this.device.queue.submit([ne.finish()])}const A=ne=>ne+255&-256,H=u*4,te=A(H),j=te*y,q=this.device.createBuffer({size:j,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});{const ne=this.device.createCommandEncoder();ne.copyTextureToBuffer({texture:S},{buffer:q,offset:0,bytesPerRow:te},{width:u,height:y,depthOrArrayLayers:1}),this.device.queue.submit([ne.finish()])}await this.device.queue.onSubmittedWorkDone(),await q.mapAsync(GPUMapMode.READ);const ke=q.getMappedRange(),W=new Uint8ClampedArray(u*y*4),ce=new Uint8Array(ke);for(let ne=0;ne<y;++ne)for(let Z=0;Z<u;++Z){const Qe=ne*te+Z*4,Pe=(ne*u+Z)*4;W[Pe+0]=ce[Qe+2],W[Pe+1]=ce[Qe+1],W[Pe+2]=ce[Qe+0],W[Pe+3]=ce[Qe+3]}const Le=document.createElement("canvas");Le.width=u,Le.height=y,Le.getContext("2d").putImageData(new ImageData(W,u,y),0,0),q.unmap(),this.snapshotCallback(Le.toDataURL("image/png"))}catch{this.snapshotCallback("")}this.snapshotCallback=void 0,this.snapshotDestWidth=void 0}}destroy(){this.stopRenderLoop(),this.postReferenceWorker({type:"dispose"}),this.referenceWorker?.terminate(),this.referenceWorker=void 0,this.rawTexture?.destroy?.(),this.rawBrushTexture?.destroy?.(),this.destroyDisplaySet(this.resolvedDisplay),this.destroyDisplaySet(this.frozenDisplay),this.geometryScratchTexture?.destroy?.(),this.metadataScratchTexture?.destroy?.(),this.mandelbrotReferenceBuffer?.destroy?.(),this.mandelbrotBlaBuffer?.destroy?.(),this.mandelbrotBlaLevelBuffer?.destroy?.(),this.mandelbrotJetBuffer?.destroy?.(),this.mandelbrotJetRadiiBuffer?.destroy?.(),this.mandelbrotJetLevelBuffer?.destroy?.(),this.mandelbrotValidityBuffer?.destroy?.(),this.uniformBufferMandelbrot?.destroy?.(),this.uniformBufferColor?.destroy?.(),this.uniformBufferBrush?.destroy?.(),this.uniformBufferResolve?.destroy?.(),this.counterBuffer?.destroy?.();for(const e of this.counterReadbackSlots)e.buffer.destroy?.();this.counterReadbackSlots=[],this.uniformBufferMerge?.destroy?.(),this.webcamTexture?.closeWebcam(),this.webcamTileTexture?.destroy?.(),this.paletteTexture?.destroy?.(),this.device?.destroy?.()}needsMoreFrames(){if(this.debugPipelineActive){let i="";return this.needRender||this.debugViewDirty?i="debugDirty":this.snapshotCallback?i="snapshot":this.needFreezeSnapshot?i="freezeSnapshot":this.needMergeSnapshot?i="mergeSnapshot":ie(this.zoomState)?i="zoomActive":this.isReferenceValidating?i="referenceValidating":this.orbitIncomplete?i="orbitIncomplete":this.pendingTableClear&&(i="tablePending"),i!==""}let e="";return this.needRender?e="needRender":this.snapshotCallback?e="snapshot":ie(this.zoomState)?e="zoomActive":this.clearHistoryNextFrame?e="clearHistory":this.pendingTableClear?e="tablePending":this.needFreezeSnapshot?e="freezeSnapshot":this.needMergeSnapshot?e="mergeSnapshot":this.isReferenceValidating?e="referenceValidating":this.orbitIncomplete?e="orbitIncomplete":this.unfinishedPixelCount<0||this.unfinishedPixelCount>lt?e=`unfinished=${this.unfinishedPixelCount}`:this.aaActive?e="aaAccumulating":this.aaAuto&&!this.aaActive&&this.aaAccumulatedSamples===0&&this.unfinishedPixelCount>=0&&this.unfinishedPixelCount<=lt&&!this.orbitIncomplete&&!ie(this.zoomState)&&(e="aaAutoPending"),e!==""}getIterationBatchSize(){return this.iterationBatchSize}startRenderLoop(e){this._drawFn=e,this._rafId===null&&(this._rafId=requestAnimationFrame(async()=>this._loop()))}stopRenderLoop(){this._rafId!==null&&(cancelAnimationFrame(this._rafId),this._rafId=null),this._drawFn=null}async _loop(){if(!this._drawFn){this._rafId=null;return}const e=performance.now(),i=Math.min(this.smoothedGpuTimeMs,500);if(e-this._lastDrawMs>=i){this._lastDrawMs=e;const s=this.needsMoreFrames();s&&!this._wasActive&&(this.lastRenderStartMs=0),this._wasActive=s,this.isRendering=s,await this._drawFn(),!s&&this._lastActiveRenderMs&&performance.now()-this._lastActiveRenderMs>600&&(this.fps=0,this._emaFrameMs=0)}this._rafId=requestAnimationFrame(async()=>this._loop())}async updateTileTexture(e,i=e){if(this.tileTextureSourceKey===i)return;const s=await this._loadTexture(e);this.tileTexture?.destroy?.(),this.tileTexture=s,this.tileTextureView=this.tileTexture.createView(),this.tileTextureSourceKey=i,this.rebuildColorBindGroup(),this.needRender=!0}isTileTextureSourceCurrent(e){return this.tileTextureSourceKey===e}async updateSkyboxTexture(e,i=e){if(this.skyboxTextureSourceKey===i)return;const s=await this._loadTexture(e,!0);this.skyboxTexture?.destroy?.(),this.skyboxTexture=s,this.skyboxTextureView=this.skyboxTexture.createView(),this.skyboxTextureSourceKey=i,this.rebuildColorBindGroup(),this.needRender=!0}isSkyboxTextureSourceCurrent(e){return this.skyboxTextureSourceKey===e}rebuildColorBindGroup(){if(this.pipelineColor&&this.resolvedDisplay&&this.frozenDisplay&&this.rawArrayView){const e=this.pipelineColor.getBindGroupLayout(0),i=[{binding:0,resource:{buffer:this.uniformBufferColor}},{binding:1,resource:this.resolvedDisplay.valuesArrayView},{binding:2,resource:this.tileTextureView},{binding:3,resource:this.skyboxTextureView},{binding:4,resource:this.webcamTextureView},{binding:5,resource:this.paletteTextureView},{binding:6,resource:this.frozenDisplay.valuesArrayView},{binding:7,resource:this.paletteSampler},{binding:8,resource:this.skyboxSampler},{binding:9,resource:this.aaTargetTextureView},{binding:10,resource:this.resolvedDisplay.geometryView},{binding:11,resource:this.frozenDisplay.geometryView},{binding:12,resource:this.resolvedDisplay.metadataView},{binding:13,resource:this.frozenDisplay.metadataView},{binding:14,resource:this.rawArrayView}];this.bindGroupColor=this.device.createBindGroup({layout:e,entries:i,label:"Engine BindGroup Color"})}}async _loadTexture(e,i=!1){const s=new Image;s.src=e;try{await s.decode()}catch(t){throw console.warn("\xc9chec du chargement de la texture : "+e,t),t}const r=await createImageBitmap(s,{premultiplyAlpha:"none"}),l=this.device.createTexture({size:[r.width,r.height,1],format:"rgba8unorm",mipLevelCount:i?N2(r.width,r.height):1,usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine LoadedTexture "+e});return this.device.queue.copyExternalImageToTexture({source:r},{texture:l},[r.width,r.height]),i&&Z2(this.device,l),l}async readIterationDataAt(e,i,s,r){if(!this.resolvedDisplay||!this.device||this.resolvedDisplayVersion<0)return null;const l=this.width/Math.max(1,this.height),t=this.previousMandelbrot?.angle??0,c=e/Math.max(1,s),p=1-i/Math.max(1,r),f=c*2-1,_=p*2-1,E=f*l,w=_,x=Math.sin(t),m=Math.cos(t),g=m*E-x*w,Q=x*E+m*w,z=Math.sqrt(l*l+1),V=g/z,T=Q/z,O=V*.5+.5,N=T*.5+.5,B=this.neutralSize,b=Math.floor(Math.max(0,Math.min(B-1,O*B))),M=Math.floor(Math.max(0,Math.min(B-1,(1-N)*B))),D=(A=>A+255&-256)(8),I=D*5,C=this.device.createBuffer({size:I,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,label:"Engine IterPixel Readback"}),U=this.device.createCommandEncoder();for(let A=0;A<Ct;A++)U.copyTextureToBuffer({texture:this.resolvedDisplay.valuesTexture,origin:{x:b,y:M,z:A}},{buffer:C,offset:D*A,bytesPerRow:D},{width:1,height:1,depthOrArrayLayers:1});U.copyTextureToBuffer({texture:this.resolvedDisplay.geometryTexture,origin:{x:b,y:M}},{buffer:C,offset:D*3,bytesPerRow:D},{width:1,height:1}),U.copyTextureToBuffer({texture:this.resolvedDisplay.metadataTexture,origin:{x:b,y:M}},{buffer:C,offset:D*4,bytesPerRow:D},{width:1,height:1}),this.device.queue.submit([U.finish()]),await C.mapAsync(GPUMapMode.READ);const J=C.getMappedRange(),ue=new Float32Array(J),he=new Uint16Array(J),_e=new Uint32Array(J),K=D/4,me=D/2,ee=ue[0],le=ue[K],oe=ue[2*K],X=3*me,ge=zt(he[X]),de=zt(he[X+1]),De=zt(he[X+2]),u=zt(he[X+3]),y=_e[4*D/4]>>>0;if(C.unmap(),C.destroy(),ee<0)return null;const S=Math.hypot(ge,de)>1e-8?Math.atan2(de,ge):0;return{iter:ee,zx:le,zy:oe,derX:u,derY:S,gradientX:ge,gradientY:de,curvature:De,metadata:y}}async updateWebcamTexture(){try{await this.webcamTexture?.openWebcam(),this.webcamTexture?.isOpen()&&await this.webcamTexture?.drawWebGPUTexture(this.webcamTileTexture,this.device)}catch(e){console.warn("Webcam texture update failed:",e)}}async getSnapshotPng(e=256){return await new Promise(i=>{this.snapshotCallback=i,this.snapshotDestWidth=e,this.needRender=!0})}}let k3,Q3,Zi,y3,x3,w3,E3,Bt,Ti,S3,M3,L3,xe,A3,F3,C3,z3,ot,D3,B3,R3,V3,H3,P3,I3,O3,G3,N3,U3,j3,Z3,q3,J3,W3,Y3,X3,$3,K3,ed,td,nd,id,ad,sd,rd,ld,od,dd,cd,pd,ud,hd,fd,md,gd,_d,Td,bd,vd,kd,Qd,yd,xd,wd,Ed,Sd,Md,Ld,Ad,Fd,Cd,zd,Dd,Bd,Rd,Vd,Hd,Pd,Id,Od,Gd,Nd,Ud,jd,Zd,qd,Jd,Wd,Yd,Xd,$d,Kd,e0,t0,n0,i0,a0,s0,r0,l0,o0,d0,c0,p0,u0,h0,f0,m0,g0,_0,T0,b0,v0,k0,Q0,y0,x0,w0,E0,S0,M0,L0,A0,F0,C0,z0,D0,B0,R0,V0,H0,P0,I0,O0,G0,N0,U0,j0,Z0,q0,J0,W0,Y0,X0,$0,K0,e4,t4,n4,i4,a4,s4,r4,l4,o4,d4,c4,p4,u4,h4,f4,m4,g4,_4,T4,b4,v4,k4,Q4,y4,x4,w4,E4,S4,M4,L4,A4,F4,C4,z4,D4,B4,R4,V4,H4,P4,I4,O4,G4;k3={class:"mandelbrot-canvas-wrap"};Q3={key:0,class:"debug-legend","aria-hidden":"true"};Zi=kt({__name:"Mandelbrot",props:pt({mu:{default:4},epsilon:{default:1e-9},colorStops:{default:()=>[{color:"#002500",position:0},{color:"#175b3d",position:.16},{color:"#ffceb6",position:.26},{color:"#edffff",position:.42},{color:"#ff8fbc",position:.7016397849462366},{color:"#a6003e",position:.8575},{color:"#100000",position:1}]},palettePeriod:{default:100},paletteOffset:{default:0},heightPaletteShift:{default:0},paletteMirror:{type:Boolean,default:!1},antialiasLevel:{default:1},aaAuto:{type:Boolean,default:!1},aaAdaptive:{type:Boolean,default:!0},activateAnimate:{type:Boolean,default:!1},debugShading:{type:Boolean,default:!1},debugView:{default:0},dprMultiplier:{default:1},maxIterationMultiplier:{default:.1},targetFps:{default:60},interpolationMode:{default:"lab"},tessellationLevel:{default:0},displacementAmount:{default:0},animation:{default:()=>Pt(null,1)},animationSpeed:{default:1},ambientOcclusionStrength:{default:0},microBumpStrength:{default:0},reliefDepth:{default:1},localShadowStrength:{default:0},lightAngle:{default:0},varnishStrength:{default:0},gradeContrast:{default:1.18},gradeSaturation:{default:1.12},orbitTrapStrength:{default:0},phaseColoringStrength:{default:0},stripeFrequency:{default:8},textureMapping:{default:()=>rn({textureMappingMode:0})},textureMappingMode:{}},{cx:{default:"-1.9771995110313272619112808106831597"},cxModifiers:{},cy:{default:"0.0"},cyModifiers:{},scale:{default:"2.5"},scaleModifiers:{},angle:{default:0},angleModifiers:{}}),emits:pt(["ready"],["update:cx","update:cy","update:scale","update:angle"]),setup(a,{expose:e,emit:i}){const s=$(null);let r=null,l=null,t,c=!1,p="",f={translateX:0,translateY:0,rotation:0,zoom:0};const _=$(null),E=$(null),w=$(!1);function x(b){if(typeof b!="string")return!1;const M=b.trim();return M?/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(M):!1}const m=i,g=Ee(a,"cx"),Q=Ee(a,"cy"),z=Ee(a,"scale"),V=Ee(a,"angle");We(()=>[g.value,Q.value,z.value,V.value],([b,M,L,D],[P,I,C,U])=>{(b!==P||M!==I)&&console.log("[REF] Mandelbrot.vue watcher cx change",String(b).slice(0,14),"isUpdating",c),!c&&t&&(!b||!M||!L||((b!==P||M!==I)&&x(b)&&x(M)&&(t.cancel_transition(),t.origin(b,M),l?.resetReference(b,M)),L!==C&&(console.log("[REF] watcher scale change",String(L).slice(0,14),"type",typeof L,"valid",x(L)),x(L)&&t.scale(L)),D!==U&&t.angle(Number(D))))},{flush:"sync"});const T=a;We(()=>T.dprMultiplier,b=>{l&&(l.dprMultiplier=b,B())}),We(()=>T.targetFps,b=>{l&&(l.targetFps=b)});async function O(){if(!l||!t)return;(f.translateX||f.translateY)&&t.translate(f.translateX,f.translateY),f.rotation&&t.rotate(f.rotation),f.zoom&&t.zoom(f.zoom);const b=s.value,M=t.step(b?b.width:void 0,b?b.height:void 0);if(!M)return;const[L,D]=M,[P,I,C,U]=t.get_params(),J=t.view_floatexp();C!==p&&(p=C,console.log("[REF] draw scale",C,"dx",String(L).slice(0,12),"cx",String(P).slice(0,14))),c=!0,g.value=P,Q.value=I,z.value=C,V.value=parseFloat(U),await vn(),c=!1;const ue=Math.max(T.mu,4),he=Math.max(0,Math.ceil(Math.log2(Math.log(ue)/Math.log(4)))),_e=Math.min(Math.max(100,1e3*T.maxIterationMultiplier*-Sn(C))+he,1e7);if(await l.update({cx:P,cy:I,dx:parseFloat(L),dy:parseFloat(D),dxStr:L,dyStr:D,viewFloatexp:J,mu:T.mu,scale:parseFloat(C),scaleStr:C,angle:parseFloat(U),maxIterations:_e,epsilon:T.epsilon},{antialiasLevel:T.antialiasLevel,aaAuto:T.aaAuto,aaAdaptive:T.aaAdaptive,palettePeriod:T.palettePeriod,paletteOffset:T.paletteOffset,heightPaletteShift:T.heightPaletteShift,paletteMirror:T.paletteMirror,colorStops:oa(T.colorStops),interpolationMode:T.interpolationMode,activateAnimate:T.activateAnimate,debugShading:T.debugShading,debugView:T.debugView??0,tessellationLevel:T.tessellationLevel,displacementAmount:T.displacementAmount,animation:Pt(T.animation,T.animationSpeed),animationSpeed:T.animationSpeed,ambientOcclusionStrength:T.ambientOcclusionStrength,microBumpStrength:T.microBumpStrength,reliefDepth:T.reliefDepth,localShadowStrength:T.localShadowStrength,lightAngle:T.lightAngle,varnishStrength:T.varnishStrength,gradeContrast:T.gradeContrast,gradeSaturation:T.gradeSaturation,orbitTrapStrength:T.orbitTrapStrength,phaseColoringStrength:T.phaseColoringStrength,stripeFrequency:T.stripeFrequency,textureMapping:rn(T),textureMappingMode:T.textureMappingMode}),await l.render(),T.debugShading&&t&&s.value){const K=t.get_reference_params();if(K&&K.length>=2){const[me,ee]=K,le=s.value.width,oe=s.value.height,X=t.coordinate_to_pixel(me,ee,le,oe);if(X&&X.length===2){const ge=X[0]*(s.value.clientWidth/le),de=X[1]*(s.value.clientHeight/oe);_.value=ge,E.value=de,w.value=ge>=0&&ge<=s.value.clientWidth&&de>=0&&de<=s.value.clientHeight}else w.value=!1}else w.value=!1}else w.value=!1}We(()=>T.debugShading,b=>{b&&l&&!l.isRendering&&O()});async function N(){if(!s.value)return;r=s.value;let b=g.value,M=Q.value,L=z.value;return x(b)||(b="-0.7",g.value=b),x(M)||(M="0.0",Q.value=M),x(L)||(L="2.5",z.value=L),t=new cn(b,M,L,Number(V.value)),t.origin(b,M),t.scale(L),t.angle(Number(V.value)),l=new v3(r,{antialiasLevel:T.antialiasLevel,aaAuto:T.aaAuto,aaAdaptive:T.aaAdaptive,palettePeriod:T.palettePeriod,paletteOffset:T.paletteOffset,heightPaletteShift:T.heightPaletteShift,paletteMirror:T.paletteMirror,colorStops:T.colorStops,interpolationMode:T.interpolationMode,activateAnimate:T.activateAnimate,debugShading:T.debugShading,debugView:T.debugView??0,tessellationLevel:T.tessellationLevel,displacementAmount:T.displacementAmount,animation:Pt(T.animation,T.animationSpeed),animationSpeed:T.animationSpeed,ambientOcclusionStrength:T.ambientOcclusionStrength,microBumpStrength:T.microBumpStrength,reliefDepth:T.reliefDepth,localShadowStrength:T.localShadowStrength,lightAngle:T.lightAngle,varnishStrength:T.varnishStrength,gradeContrast:T.gradeContrast,gradeSaturation:T.gradeSaturation,orbitTrapStrength:T.orbitTrapStrength,phaseColoringStrength:T.phaseColoringStrength,stripeFrequency:T.stripeFrequency,textureMapping:rn(T),textureMappingMode:T.textureMappingMode}),l.dprMultiplier=T.dprMultiplier??1,l.targetFps=T.targetFps??60,l.initialize(t)}async function B(){if(!s.value||!l)return;const b=s.value.getBoundingClientRect();s.value.width=b.width,s.value.height=b.height,l.resize()}return bn(async()=>{await N(),window.addEventListener("resize",B),await B(),l&&(m("ready",l),l.startRenderLoop(O))}),bi(()=>{l?.destroy(),l=null,window.removeEventListener("resize",B)}),e({getCanvas:()=>s.value,getEngine:()=>l,getNavigator:()=>t,translate:(b,M)=>t?.translate(b,M),translateDirect:(b,M)=>{if(!t)return;const L=s.value;t.translate_direct(b,M,L?L.width:void 0,L?L.height:void 0)},rotate:b=>t?.rotate(b),angle:b=>t?.angle(b),zoom:b=>{console.log("[REF] zoom() called factor",b),t?.zoom(b)},setKeyboardNavigation:b=>{f=b},resetReferenceTo:(b,M,L,D)=>{console.log("[REF] resetReferenceTo (travel done)",b.slice(0,14),"scale",L,"engine?",!!l,"nav?",!!t),!(!t||!l)&&(t.cancel_transition(),t.origin(b,M),t.scale(L),t.angle(D),l.resetReference(b,M))},step:()=>{if(!t)return;const b=s.value;return t.step(b?b.width:void 0,b?b.height:void 0)},getParams:()=>t?.get_params(),drawOnce:async()=>O(),resize:async()=>B(),initialize:async()=>N(),useBla:()=>l?.setApproximationMode("bla"),usePerturbation:()=>l?.setApproximationMode("perturbation"),setApproximationMode:b=>l?.setApproximationMode(b),getApproximationMode:()=>l?.getApproximationMode(),setBlaEpsilon:b=>l?.setBlaEpsilon(b),setPrecisionBudget:b=>l?.setPrecisionBudget(b),getPrecisionBudget:()=>l?.getPrecisionBudget()}),(b,M)=>(v(),k("div",k3,[n("canvas",{ref_key:"canvasRef",ref:s},null,512),T.debugShading?(v(),k("div",Q3,[...M[0]||(M[0]=[n("div",{class:"debug-legend-item debug-legend-top-left"},"Distance au bord",-1),n("div",{class:"debug-legend-item debug-legend-top-right"},"Palette / phase continue",-1),n("div",{class:"debug-legend-item debug-legend-bottom-left"},"Gradient du relief",-1),n("div",{class:"debug-legend-item debug-legend-bottom-right"},"Angle de la d\xe9riv\xe9e",-1)])])):It("",!0),T.debugShading&&w.value&&_.value!==null&&E.value!==null?(v(),k("div",{key:1,class:"debug-ref-marker",style:la({left:_.value+"px",top:E.value+"px"})},[...M[1]||(M[1]=[n("div",{class:"debug-ref-crosshair"},null,-1),n("div",{class:"debug-ref-label"},"R\xe9f",-1)])],4)):It("",!0)]))}});y3={class:"mobile-nav-controls"};x3={key:0,class:"directional-controls"};w3=kt({__name:"MobileNavigationControls",props:pt({mandelbrotRef:{}},{expanded:{type:Boolean,default:!1},expandedModifiers:{}}),emits:["update:expanded"],setup(a){const e=a,i=Ee(a,"expanded"),s=$(null);let r=null;const l=()=>{i.value=!i.value,i.value||c()},t=x=>{x.preventDefault(),x.stopPropagation(),l()},c=()=>{s.value=null,r!==null&&(clearInterval(r),r=null)},p=x=>{s.value=x;const m=.01,g=()=>{if(e.mandelbrotRef)switch(x){case"north":e.mandelbrotRef.translate(0,m);break;case"south":e.mandelbrotRef.translate(0,-m);break;case"west":e.mandelbrotRef.translate(-m,0);break;case"east":e.mandelbrotRef.translate(m,0);break}};g(),r=window.setInterval(g,16)},f=x=>{s.value=`rotate-${x}`;const m=.025,g=()=>{e.mandelbrotRef&&(x==="left"?e.mandelbrotRef.rotate(m):e.mandelbrotRef.rotate(-m))};g(),r=window.setInterval(g,16)},_=x=>{s.value=`zoom-${x}`;const m=.97,g=()=>{e.mandelbrotRef&&(x==="in"?e.mandelbrotRef.zoom(m):e.mandelbrotRef.zoom(1/m))};g(),r=window.setInterval(g,16)},E=(x,m)=>{x.preventDefault(),m()},w=x=>{x.preventDefault(),c()};return(x,m)=>(v(),k("div",y3,[n("button",{class:"nav-button compass-button",onClick:l,onTouchend:t,"aria-label":"Toggle navigation"},[...m[16]||(m[16]=[n("i",{class:"fa-solid fa-compass fa-2x nav-icon"},null,-1)])],32),R(da,{name:"fade"},{default:ae(()=>[i.value?(v(),k("div",x3,[n("button",{class:"nav-button direction-button north",onTouchstart:m[0]||(m[0]=g=>E(g,()=>p("north"))),onTouchend:w,onMousedown:m[1]||(m[1]=g=>p("north")),onMouseup:c,onMouseleave:c,"aria-label":"Move North"},[...m[17]||(m[17]=[n("i",{class:"fa-solid fa-arrow-up fa-3x nav-icon"},null,-1)])],32),n("button",{class:"nav-button direction-button south",onTouchstart:m[2]||(m[2]=g=>E(g,()=>p("south"))),onTouchend:w,onMousedown:m[3]||(m[3]=g=>p("south")),onMouseup:c,onMouseleave:c,"aria-label":"Move South"},[...m[18]||(m[18]=[n("i",{class:"fa-solid fa-arrow-down fa-3x nav-icon"},null,-1)])],32),n("button",{class:"nav-button direction-button west",onTouchstart:m[4]||(m[4]=g=>E(g,()=>p("west"))),onTouchend:w,onMousedown:m[5]||(m[5]=g=>p("west")),onMouseup:c,onMouseleave:c,"aria-label":"Move West"},[...m[19]||(m[19]=[n("i",{class:"fa-solid fa-arrow-left fa-3x nav-icon"},null,-1)])],32),n("button",{class:"nav-button direction-button east",onTouchstart:m[6]||(m[6]=g=>E(g,()=>p("east"))),onTouchend:w,onMousedown:m[7]||(m[7]=g=>p("east")),onMouseup:c,onMouseleave:c,"aria-label":"Move East"},[...m[20]||(m[20]=[n("i",{class:"fa-solid fa-arrow-right fa-3x nav-icon"},null,-1)])],32),n("button",{class:"nav-button corner-button rotate-left",onTouchstart:m[8]||(m[8]=g=>E(g,()=>f("left"))),onTouchend:w,onMousedown:m[9]||(m[9]=g=>f("left")),onMouseup:c,onMouseleave:c,"aria-label":"Rotate Left"},[...m[21]||(m[21]=[n("i",{class:"fa-solid fa-rotate-left fa-2x nav-icon"},null,-1)])],32),n("button",{class:"nav-button corner-button rotate-right",onTouchstart:m[10]||(m[10]=g=>E(g,()=>f("right"))),onTouchend:w,onMousedown:m[11]||(m[11]=g=>f("right")),onMouseup:c,onMouseleave:c,"aria-label":"Rotate Right"},[...m[22]||(m[22]=[n("i",{class:"fa-solid fa-rotate-right fa-2x nav-icon"},null,-1)])],32),n("button",{class:"nav-button corner-button zoom-out",onTouchstart:m[12]||(m[12]=g=>E(g,()=>_("out"))),onTouchend:w,onMousedown:m[13]||(m[13]=g=>_("out")),onMouseup:c,onMouseleave:c,"aria-label":"Zoom Out"},[...m[23]||(m[23]=[n("svg",{class:"nav-icon",viewBox:"0 0 24 24",width:"28",height:"28",fill:"none",stroke:"currentColor","stroke-width":"2.4","stroke-linecap":"round","stroke-linejoin":"round","aria-hidden":"true"},[n("circle",{cx:"11",cy:"11",r:"7"}),n("path",{d:"M21 21l-5-5M8 11h6"})],-1)])],32),n("button",{class:"nav-button corner-button zoom-in",onTouchstart:m[14]||(m[14]=g=>E(g,()=>_("in"))),onTouchend:w,onMousedown:m[15]||(m[15]=g=>_("in")),onMouseup:c,onMouseleave:c,"aria-label":"Zoom In"},[...m[24]||(m[24]=[n("svg",{class:"nav-icon",viewBox:"0 0 24 24",width:"28",height:"28",fill:"none",stroke:"currentColor","stroke-width":"2.4","stroke-linecap":"round","stroke-linejoin":"round","aria-hidden":"true"},[n("circle",{cx:"11",cy:"11",r:"7"}),n("path",{d:"M21 21l-5-5M8 11h6M11 8v6"})],-1)])],32)])):It("",!0)]),_:1})]))}});E3=vi(w3,[["__scopeId","data-v-842a47c9"]]);Bt=.01;Ti=.025;S3=300;M3=30;L3=kt({__name:"MandelbrotController",props:pt({mu:{},epsilon:{},colorStops:{},antialiasLevel:{},aaAuto:{type:Boolean},aaAdaptive:{type:Boolean},palettePeriod:{},paletteOffset:{},heightPaletteShift:{},paletteMirror:{type:Boolean},activateAnimate:{type:Boolean},debugShading:{type:Boolean},dprMultiplier:{},maxIterationMultiplier:{},targetFps:{},interpolationMode:{},pickerMode:{type:Boolean},uiHidden:{type:Boolean},tessellationLevel:{},displacementAmount:{},animation:{},animationSpeed:{},ambientOcclusionStrength:{},microBumpStrength:{},reliefDepth:{},localShadowStrength:{},lightAngle:{},varnishStrength:{},gradeContrast:{},gradeSaturation:{},orbitTrapStrength:{},phaseColoringStrength:{},stripeFrequency:{},textureMapping:{},textureMappingMode:{}},{cx:{},cxModifiers:{},cy:{},cyModifiers:{},scale:{},scaleModifiers:{},angle:{},angleModifiers:{},mobileNavExpanded:{type:Boolean,default:!1},mobileNavExpandedModifiers:{}}),emits:pt(["palettePick","pickerDone","engineReady","requestShowUi"],["update:cx","update:cy","update:scale","update:angle","update:mobileNavExpanded"]),setup(a,{expose:e,emit:i}){const s=Ee(a,"cx"),r=Ee(a,"cy"),l=Ee(a,"scale"),t=Ee(a,"angle"),c=Ee(a,"mobileNavExpanded"),p=a,f=i,_=$(null),E=$(null),w={};e({getCanvas:L,getEngine:()=>_.value?.getEngine()??null,getNavigator:()=>_.value?.getNavigator()??null,resetReferenceTo:(u,y,S,A)=>{_.value?.resetReferenceTo?.(u,y,S,A)}});let x=!1,m=!1,g=0,Q=0,z=0,V=0,T=0,O=!1,N=0,B=0,b=0,M=0;function L(){return _.value?.getCanvas()??null}function D(u){const y=L();return!!y&&u.target===y}function P(u){D(u)&&u.preventDefault()}function I(u){const y=L();if(!y)return{x:0,y:0,width:0,height:0};const S=y.getBoundingClientRect();return{x:u.clientX-S.left,y:u.clientY-S.top,width:S.width,height:S.height}}function C(u){const y=u.target?.tagName?.toLowerCase();y==="input"||y==="textarea"||y==="select"||u.target?.isContentEditable||(w[u.code]=!0,ue())}function U(u){w[u.code]=!1,ue()}function J(){for(const u in w)w[u]=!1;ue()}function ue(){if(p.pickerMode){_.value?.setKeyboardNavigation?.({translateX:0,translateY:0,rotation:0,zoom:0});return}const u=.97;_.value?.setKeyboardNavigation?.({translateX:(w.KeyD?Bt:0)-(w.KeyA?Bt:0),translateY:(w.KeyW?Bt:0)-(w.KeyS?Bt:0),rotation:(w.KeyQ?Ti:0)-(w.KeyE?Ti:0),zoom:w.KeyR?u:w.KeyF?1/u:0})}function he(u){if(!D(u))return;if(p.pickerMode){u.preventDefault();return}u.preventDefault();const y=.95;u.deltaY<0?_.value?.zoom(y):_.value?.zoom(1/y)}function _e(u,y){const S=L();if(!S)return;const A=S.getBoundingClientRect(),H=u-A.left,te=y-A.top,j=A.width,q=A.height,ke=j/q,W=(H-j/2)/j*2,ce=(te-q/2)/q*2;_.value?.translateDirect(W*ke,-ce)}function K(u){if(D(u)){if(p.pickerMode){u.preventDefault();return}if(u.preventDefault(),p.uiHidden){f("requestShowUi");return}_e(u.clientX,u.clientY)}}function me(u){if(!D(u)||p.pickerMode||u.touches.length!==0)return;const y=Date.now(),S=u.changedTouches[0];if(!S)return;const A=S.clientX,H=S.clientY;if(y-B<S3&&Math.hypot(A-b,H-M)<M3){if(u.preventDefault(),B=0,p.uiHidden){f("requestShowUi");return}_e(A,H)}else B=y,b=A,M=H}function ee(u){if(D(u)){if(p.pickerMode){u.preventDefault(),le(u);return}if(u.button===2)m=!0;else{x=!0;const y=I(u);g=y.x,Q=y.y}}}async function le(u){try{const y=_.value?.getEngine();if(!y)return;const S=L();if(!S)return;const A=S.getBoundingClientRect(),H=u.clientX-A.left,te=u.clientY-A.top,j=await y.readIterationDataAt(H,te,A.width,A.height);if(!j)return;f("palettePick",j,u.clientX,u.clientY)}finally{f("pickerDone")}}function oe(u){if(p.pickerMode)return;const y=I(u);if(m){const q=L();if(!q)return;const ke=q.getBoundingClientRect(),W=ke.width/2,ce=ke.height/2,Le=y.x,ne=y.y,Z=Math.atan2(ne-ce,Le-W);_.value?.angle(Z);return}if(!x)return;const S=y.width,A=y.height,H=S/A,te=(y.x-g)/S*2,j=(y.y-Q)/A*2;_.value?.translateDirect(-te*H,j),g=y.x,Q=y.y}function X(u){p.pickerMode||(u.button===2?m=!1:x=!1)}function ge(u){if(!D(u)||p.pickerMode)return;const y=L();if(y){if(u.touches.length===1){x=!0;const S=u.touches[0],A=y.getBoundingClientRect();g=S.clientX-A.left,Q=S.clientY-A.top}else if(u.touches.length===2){x=!1,O=!0;const[S,A]=u.touches;z=Math.hypot(A.clientX-S.clientX,A.clientY-S.clientY),N=z,V=Math.atan2(A.clientY-S.clientY,A.clientX-S.clientX);const H=_.value?.getParams();T=H?parseFloat(H[3]):0}}}function de(u){if(p.pickerMode)return;const y=L();if(y){if(x&&u.touches.length===1){const S=u.touches[0],A=y.getBoundingClientRect(),H=S.clientX-A.left,te=S.clientY-A.top,j=A.width,q=A.height,ke=j/q,W=(H-g)/j*2,ce=(te-Q)/q*2;_.value?.translateDirect(-W*ke,ce),g=H,Q=te}else if(O&&u.touches.length===2){const[S,A]=u.touches,H=Math.hypot(A.clientX-S.clientX,A.clientY-S.clientY),te=Math.atan2(A.clientY-S.clientY,A.clientX-S.clientX),j=N/H;N=H,_.value?.zoom(j);const q=te-V;_.value?.angle(T+q)}}}function De(u){u.touches.length===0&&(x=!1,O=!1)}return bn(async()=>{const u=E.value;u&&(window.addEventListener("keydown",C),window.addEventListener("keyup",U),window.addEventListener("blur",J),u.addEventListener("wheel",he,{passive:!1}),u.addEventListener("mousedown",ee),u.addEventListener("dblclick",K),u.addEventListener("contextmenu",P),window.addEventListener("mousemove",oe),window.addEventListener("mouseup",X),u.addEventListener("touchstart",ge,{passive:!1}),u.addEventListener("touchmove",de,{passive:!1}),u.addEventListener("touchend",De,{passive:!1}),u.addEventListener("touchend",me,{passive:!1}),ue())}),bi(()=>{const u=E.value;window.removeEventListener("keydown",C),window.removeEventListener("keyup",U),window.removeEventListener("blur",J),window.removeEventListener("mousemove",oe),window.removeEventListener("mouseup",X),u&&(u.removeEventListener("wheel",he),u.removeEventListener("mousedown",ee),u.removeEventListener("dblclick",K),u.removeEventListener("contextmenu",P),u.removeEventListener("touchstart",ge),u.removeEventListener("touchmove",de),u.removeEventListener("touchend",De),u.removeEventListener("touchend",me))}),We(()=>p.pickerMode,ue),(u,y)=>(v(),k("div",{ref_key:"wrapperRef",ref:E,style:{position:"relative",width:"100%",height:"100%"}},[R(Zi,{ref_key:"mandelbrotRef",ref:_,scale:l.value,"onUpdate:scale":y[0]||(y[0]=S=>l.value=S),angle:t.value,"onUpdate:angle":y[1]||(y[1]=S=>t.value=S),cx:s.value,"onUpdate:cx":y[2]||(y[2]=S=>s.value=S),cy:r.value,"onUpdate:cy":y[3]||(y[3]=S=>r.value=S),mu:p.mu,epsilon:p.epsilon,antialiasLevel:p.antialiasLevel,aaAuto:p.aaAuto,aaAdaptive:p.aaAdaptive,palettePeriod:p.palettePeriod,heightPaletteShift:p.heightPaletteShift,paletteMirror:p.paletteMirror,colorStops:p.colorStops,activateAnimate:p.activateAnimate,debugShading:p.debugShading,paletteOffset:p.paletteOffset,dprMultiplier:p.dprMultiplier,maxIterationMultiplier:p.maxIterationMultiplier,targetFps:p.targetFps,interpolationMode:p.interpolationMode,tessellationLevel:p.tessellationLevel,displacementAmount:p.displacementAmount,animation:p.animation,animationSpeed:p.animationSpeed,ambientOcclusionStrength:p.ambientOcclusionStrength,microBumpStrength:p.microBumpStrength,reliefDepth:p.reliefDepth,localShadowStrength:p.localShadowStrength,lightAngle:p.lightAngle,varnishStrength:p.varnishStrength,gradeContrast:p.gradeContrast,gradeSaturation:p.gradeSaturation,orbitTrapStrength:p.orbitTrapStrength,phaseColoringStrength:p.phaseColoringStrength,stripeFrequency:p.stripeFrequency,textureMapping:p.textureMapping,textureMappingMode:p.textureMappingMode,onReady:y[4]||(y[4]=S=>f("engineReady",S))},null,8,["scale","angle","cx","cy","mu","epsilon","antialiasLevel","aaAuto","aaAdaptive","palettePeriod","heightPaletteShift","paletteMirror","colorStops","activateAnimate","debugShading","paletteOffset","dprMultiplier","maxIterationMultiplier","targetFps","interpolationMode","tessellationLevel","displacementAmount","animation","animationSpeed","ambientOcclusionStrength","microBumpStrength","reliefDepth","localShadowStrength","lightAngle","varnishStrength","gradeContrast","gradeSaturation","orbitTrapStrength","phaseColoringStrength","stripeFrequency","textureMapping","textureMappingMode"]),ca(R(E3,{"mandelbrot-ref":_.value,expanded:c.value,"onUpdate:expanded":y[5]||(y[5]=S=>c.value=S)},null,8,["mandelbrot-ref","expanded"]),[[pa,!p.uiHidden]])],512))}});xe=vi(L3,[["__scopeId","data-v-61f301ef"]]);A3=["value"];F3=["value"];C3=kt({__name:"ClassicMandelbrot",setup(a){const e=[{name:"Broderies",cx:"-0.7746806106269039",cy:"-0.1374168856037867",scale:"0.000000000001",angle:0,description:"Un point sur le bord, beaucoup d'it\xe9ration et fort niveau de zoom"},{name:"Ile de Julia",cx:"-1.768778777",cy:"0.001738993",scale:"0.0000005",angle:0,description:"Un point dans une \xeele de Julia."},{name:"Vall\xe9e des hippocampes",cx:"-0.7457978898549",cy:"-0.164195216032",scale:"0.0003399",angle:0,description:"Cet endroit est souvent nomm\xe9 la vall\xe9e des hippocampes"},{name:"Vall\xe9 des spirales",cx:"-1.257369977593720294",cy:"0.03801433143232926",scale:"0.000000000000009898691265604",angle:0,description:"Un minibrot nich\xe9 dans la vall\xe9e des spirales."},{name:"Tourbillons",cx:"-1.749615506227909595",cy:"0.00000000148994828809554127",scale:"0.000000111597126685994161",angle:0,description:"Un joli motif qui se trouve vers la pointe du mandelbrot"},{name:"Serpents",cx:"-1.2554695710024208988",cy:"0.031668017689534857142",scale:"0.00000020483403832458672",angle:2.673711625670128,description:"Un joli motif qui se trouve vers la pointe du mandelbrot"}],i=$(0),s=$(e[0]),r=$(null);async function l(t){const c=Number(t.target.value);i.value=c,s.value=e[c],await vn(),await r.value?.drawOnce()}return(t,c)=>(v(),k("div",null,[c[0]||(c[0]=n("label",{for:"mandelbrot-select"},"Vous pouvez observez cette vari\xe9t\xe9 en parcours ces exemples :\xa0",-1)),n("select",{id:"mandelbrot-select",onChange:l,value:i.value},[(v(),k(ua,null,ha(e,(p,f)=>n("option",{key:p.name,value:f},Dn(p.name),9,F3)),64))],40,A3),n("p",null,Dn(s.value?.description),1),R(xe,{ref_key:"mandelbrotRef",ref:r,scale:s.value?.scale,angle:s.value?.angle,cx:s.value?.cx,cy:s.value?.cy},null,8,["scale","angle","cx","cy"])]))}});z3=["width","height"];ot=kt({__name:"MandelbrotOrbits",props:{scale:{},angle:{},cx:{},cy:{},showMandelbrot:{type:Boolean},showOrbitLabels:{type:Boolean},orbitIterations:{},showOrbitVectors:{type:Boolean},showPalette:{type:Boolean}},setup(a){const e=a,i=$(null),s=$(null),r=$(600),l=$(600),t=$({x:r.value/2,y:l.value/2}),c=$({re:0,im:0}),p=$([]);function f(g,Q){const z=parseFloat(e.scale??"1"),V=e.angle??0,T=parseFloat(e.cx??"0.0"),O=parseFloat(e.cy??"0.0"),N=r.value/Math.max(1,l.value),B=g/Math.max(1,r.value)*2-1,b=(1-Q/Math.max(1,l.value))*2-1,M=B*N*z,L=b*z,D=Math.sin(V),P=Math.cos(V),I=P*M-D*L,C=D*M+P*L,U=T+I,J=O+C;return{re:U,im:J}}function _(g,Q){const z=parseFloat(e.scale??"1"),V=e.angle??0,T=parseFloat(e.cx??"0.0"),O=parseFloat(e.cy??"0.0"),N=r.value/Math.max(1,l.value),B=g-T,b=Q-O,M=Math.sin(V),L=Math.cos(V),D=L*B+M*b,P=-M*B+L*b,I=D/(N*z),C=P/z,U=(I+1)*.5*r.value,J=(1-(C+1)*.5)*l.value;return{x:U,y:J}}function E(g){const Q=[];let z={re:0,im:0};const V=e.orbitIterations??50;for(let T=0;T<V;T++){Q.push({re:z.re,im:z.im});const O=z.re*z.re-z.im*z.im+g.re,N=2*z.re*z.im+g.im;z={re:O,im:N}}return Q}function w(){const g=s.value;if(!g)return;const Q=g.getContext("2d");if(!Q)return;Q.clearRect(0,0,r.value,l.value);const z=_(0,0);Q.strokeStyle="#888",Q.lineWidth=1,Q.beginPath(),Q.moveTo(z.x,0),Q.lineTo(z.x,l.value),Q.moveTo(0,z.y),Q.lineTo(r.value,z.y),Q.stroke(),Q.fillStyle="red",Q.beginPath(),Q.arc(t.value.x,t.value.y,6,0,2*Math.PI),Q.fill(),Q.font="16px sans-serif",Q.fillStyle="orange",Q.textAlign="left",Q.textBaseline="top";const V=`c = ${c.value.re.toFixed(4)} + i\xb7${c.value.im.toFixed(4)}`;let T=t.value.x+10,O=t.value.y+10;if(T+120>r.value&&(T=t.value.x-120),O+24>l.value&&(O=t.value.y-24),p.value.length>1){Q.lineWidth=2;let N=!0;for(let B=0;B<p.value.length;B++)if(Math.hypot(p.value[B].re,p.value[B].im)>2){N=!1;break}Q.strokeStyle=N?"green":"blue";for(let B=0;B<p.value.length-1&&!(Math.hypot(p.value[B].re,p.value[B].im)>2&&e.showOrbitVectors);B++){const M=p.value[B],L=p.value[B+1],D=_(M.re,M.im),P=_(L.re,L.im);Q.beginPath(),Q.moveTo(D.x,D.y),Q.lineTo(P.x,P.y),Q.stroke()}if(e.showOrbitVectors)for(let B=1;B<p.value.length;B++){const b=Math.hypot(p.value[B].re,p.value[B].im);Q.strokeStyle=b<=2?"cyan":"red";const M=_(0,0),L=_(p.value[B].re,p.value[B].im);if(Q.beginPath(),Q.moveTo(M.x,M.y),Q.lineTo(L.x,L.y),Q.stroke(),b>2)break}if(e.showOrbitLabels){Q.font="12px monospace",Q.fillStyle="orange",Q.textAlign="left",Q.textBaseline="top";const B=Math.min(10,p.value.length);for(let b=0;b<B;b++){const M=p.value[b],L=_(M.re,M.im);Q.beginPath(),Q.arc(L.x,L.y,4,0,2*Math.PI),Q.fillStyle="orange",Q.fill();let D=`z${b}: (${M.re.toFixed(3)}, ${M.im.toFixed(3)})`,P=L.x+8,I=L.y+2;P+120>r.value&&(P=L.x-120),I+16>l.value&&(I=L.y-16),Q.fillText(D,P,I)}}}e.showOrbitLabels||Q.fillText(V,T,O)}function x(g){const Q=s.value?.getBoundingClientRect();if(!Q)return;const z=g.clientX-Q.left,V=g.clientY-Q.top;t.value={x:z,y:V},c.value=f(z,V),p.value=E(c.value),w()}function m(){if(!i.value)return;const g=i.value.getBoundingClientRect();r.value=Math.round(g.width),l.value=Math.round(g.height),s.value&&(s.value.width=r.value,s.value.height=l.value),t.value={x:r.value/2,y:l.value/2},c.value=f(t.value.x,t.value.y),p.value=E(c.value),w()}return bn(()=>{vn(()=>{m(),w(),s.value&&s.value.addEventListener("mousemove",x),i.value&&new window.ResizeObserver(()=>{m()}).observe(i.value),c.value=f(t.value.x,t.value.y),p.value=E(c.value),w()})}),We(()=>[e.scale,e.angle,e.cx,e.cy],()=>{c.value=f(t.value.x,t.value.y),p.value=E(c.value),w()}),(g,Q)=>(v(),k("div",{ref_key:"containerRef",ref:i,style:{position:"relative",width:"100%",height:"500px"}},[e.showMandelbrot?(v(),fa(Zi,{key:0,scale:e.scale??"1",angle:e.angle??0,cx:e.cx??"0.0",cy:e.cy??"0.0",colorStops:[{position:0,color:"#000000"},{position:.5,color:"#ffffff"}],style:{position:"absolute",left:"0",top:"0",width:"100%",height:"100%","z-index":"1"}},null,8,["scale","angle","cx","cy"])):It("",!0),n("canvas",{ref_key:"canvasRef",ref:s,width:r.value,height:l.value,style:{position:"absolute",left:"0",top:"0","z-index":"2","pointer-events":"auto",width:"100%",height:"100%"}},null,8,z3)],512))}});D3={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};B3={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.025ex"},xmlns:"http://www.w3.org/2000/svg",width:"0.98ex",height:"1.025ex",role:"img",focusable:"false",viewBox:"0 -442 433 453","aria-hidden":"true"};R3={tabindex:"0",class:"MathJax",jax:"SVG",display:"true",style:{direction:"ltr",display:"block","text-align":"center",margin:"1em 0",position:"relative"}};V3={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-2.148ex"},xmlns:"http://www.w3.org/2000/svg",width:"14.903ex",height:"5.428ex",role:"img",focusable:"false",viewBox:"0 -1449.5 6587.2 2399","aria-hidden":"true"};H3={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};P3={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.025ex"},xmlns:"http://www.w3.org/2000/svg",width:"0.98ex",height:"1.025ex",role:"img",focusable:"false",viewBox:"0 -442 433 453","aria-hidden":"true"};I3={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};O3={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.375ex"},xmlns:"http://www.w3.org/2000/svg",width:"10.866ex",height:"1.881ex",role:"img",focusable:"false",viewBox:"0 -666 4802.6 831.6","aria-hidden":"true"};G3={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};N3={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.339ex"},xmlns:"http://www.w3.org/2000/svg",width:"2.04ex",height:"1.339ex",role:"img",focusable:"false",viewBox:"0 -442 901.6 592","aria-hidden":"true"};U3={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};j3={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.025ex"},xmlns:"http://www.w3.org/2000/svg",width:"0.98ex",height:"1.025ex",role:"img",focusable:"false",viewBox:"0 -442 433 453","aria-hidden":"true"};Z3={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};q3={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.687ex"},xmlns:"http://www.w3.org/2000/svg",width:"10.842ex",height:"2.573ex",role:"img",focusable:"false",viewBox:"0 -833.9 4792.1 1137.4","aria-hidden":"true"};J3={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};W3={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.375ex"},xmlns:"http://www.w3.org/2000/svg",width:"6.188ex",height:"1.881ex",role:"img",focusable:"false",viewBox:"0 -666 2735.1 831.6","aria-hidden":"true"};Y3={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};X3={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.687ex"},xmlns:"http://www.w3.org/2000/svg",width:"6.188ex",height:"2.573ex",role:"img",focusable:"false",viewBox:"0 -833.9 2735.1 1137.4","aria-hidden":"true"};$3={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};K3={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.339ex"},xmlns:"http://www.w3.org/2000/svg",width:"6.036ex",height:"1.658ex",role:"img",focusable:"false",viewBox:"0 -583 2668.1 733","aria-hidden":"true"};ed={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};td={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.651ex"},xmlns:"http://www.w3.org/2000/svg",width:"10.842ex",height:"2.538ex",role:"img",focusable:"false",viewBox:"0 -833.9 4792.1 1121.9","aria-hidden":"true"};nd={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};id={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.025ex"},xmlns:"http://www.w3.org/2000/svg",width:"0.98ex",height:"1.025ex",role:"img",focusable:"false",viewBox:"0 -442 433 453","aria-hidden":"true"};ad={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};sd={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.025ex"},xmlns:"http://www.w3.org/2000/svg",width:"0.98ex",height:"1.025ex",role:"img",focusable:"false",viewBox:"0 -442 433 453","aria-hidden":"true"};rd={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};ld={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.357ex"},xmlns:"http://www.w3.org/2000/svg",width:"2.2ex",height:"1.357ex",role:"img",focusable:"false",viewBox:"0 -442 972.3 599.8","aria-hidden":"true"};od={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};dd={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"0"},xmlns:"http://www.w3.org/2000/svg",width:"1.131ex",height:"1.507ex",role:"img",focusable:"false",viewBox:"0 -666 500 666","aria-hidden":"true"};cd={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};pd={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.357ex"},xmlns:"http://www.w3.org/2000/svg",width:"2.2ex",height:"1.357ex",role:"img",focusable:"false",viewBox:"0 -442 972.3 599.8","aria-hidden":"true"};ud={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};hd={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"0"},xmlns:"http://www.w3.org/2000/svg",width:"1.131ex",height:"1.507ex",role:"img",focusable:"false",viewBox:"0 -666 500 666","aria-hidden":"true"};fd={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};md={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.357ex"},xmlns:"http://www.w3.org/2000/svg",width:"2.2ex",height:"1.357ex",role:"img",focusable:"false",viewBox:"0 -442 972.3 599.8","aria-hidden":"true"};gd={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};_d={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"0"},xmlns:"http://www.w3.org/2000/svg",width:"1.131ex",height:"1.507ex",role:"img",focusable:"false",viewBox:"0 -666 500 666","aria-hidden":"true"};Td={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};bd={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"0"},xmlns:"http://www.w3.org/2000/svg",width:"1.131ex",height:"1.507ex",role:"img",focusable:"false",viewBox:"0 -666 500 666","aria-hidden":"true"};vd={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};kd={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"0"},xmlns:"http://www.w3.org/2000/svg",width:"1.131ex",height:"1.507ex",role:"img",focusable:"false",viewBox:"0 -666 500 666","aria-hidden":"true"};Qd={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};yd={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.357ex"},xmlns:"http://www.w3.org/2000/svg",width:"2.2ex",height:"1.357ex",role:"img",focusable:"false",viewBox:"0 -442 972.3 599.8","aria-hidden":"true"};xd={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};wd={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"0"},xmlns:"http://www.w3.org/2000/svg",width:"1.131ex",height:"1.507ex",role:"img",focusable:"false",viewBox:"0 -666 500 666","aria-hidden":"true"};Ed={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};Sd={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.025ex"},xmlns:"http://www.w3.org/2000/svg",width:"0.98ex",height:"1.025ex",role:"img",focusable:"false",viewBox:"0 -442 433 453","aria-hidden":"true"};Md={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};Ld={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.357ex"},xmlns:"http://www.w3.org/2000/svg",width:"2.2ex",height:"1.357ex",role:"img",focusable:"false",viewBox:"0 -442 972.3 599.8","aria-hidden":"true"};Ad={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};Fd={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"0"},xmlns:"http://www.w3.org/2000/svg",width:"1.131ex",height:"1.507ex",role:"img",focusable:"false",viewBox:"0 -666 500 666","aria-hidden":"true"};Cd={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};zd={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.566ex"},xmlns:"http://www.w3.org/2000/svg",width:"4.462ex",height:"2.262ex",role:"img",focusable:"false",viewBox:"0 -750 1972.3 1000","aria-hidden":"true"};Dd={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};Bd={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.357ex"},xmlns:"http://www.w3.org/2000/svg",width:"18.793ex",height:"1.979ex",role:"img",focusable:"false",viewBox:"0 -717 8306.4 874.8","aria-hidden":"true"};Rd={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};Vd={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-1.238ex"},xmlns:"http://www.w3.org/2000/svg",width:"12.656ex",height:"4.557ex",role:"img",focusable:"false",viewBox:"0 -1467.3 5593.8 2014.4","aria-hidden":"true"};Hd={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};Pd={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.025ex"},xmlns:"http://www.w3.org/2000/svg",width:"1.357ex",height:"1.025ex",role:"img",focusable:"false",viewBox:"0 -442 600 453","aria-hidden":"true"};Id={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};Od={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.023ex"},xmlns:"http://www.w3.org/2000/svg",width:"1.005ex",height:"1.645ex",role:"img",focusable:"false",viewBox:"0 -717 444 727","aria-hidden":"true"};Gd={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};Nd={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.566ex"},xmlns:"http://www.w3.org/2000/svg",width:"4.462ex",height:"2.262ex",role:"img",focusable:"false",viewBox:"0 -750 1972.3 1000","aria-hidden":"true"};Ud={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};jd={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"0"},xmlns:"http://www.w3.org/2000/svg",width:"1.131ex",height:"1.507ex",role:"img",focusable:"false",viewBox:"0 -666 500 666","aria-hidden":"true"};Zd={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};qd={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.05ex"},xmlns:"http://www.w3.org/2000/svg",width:"5.295ex",height:"2.005ex",role:"img",focusable:"false",viewBox:"0 -864 2340.2 886","aria-hidden":"true"};Jd={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};Wd={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.05ex"},xmlns:"http://www.w3.org/2000/svg",width:"4.05ex",height:"2.005ex",role:"img",focusable:"false",viewBox:"0 -864 1790.1 886","aria-hidden":"true"};Yd={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};Xd={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.05ex"},xmlns:"http://www.w3.org/2000/svg",width:"1.131ex",height:"1.579ex",role:"img",focusable:"false",viewBox:"0 -676 500 698","aria-hidden":"true"};$d={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};Kd={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.05ex"},xmlns:"http://www.w3.org/2000/svg",width:"8.548ex",height:"1.581ex",role:"img",focusable:"false",viewBox:"0 -677 3778 699","aria-hidden":"true"};e0={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};t0={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.05ex"},xmlns:"http://www.w3.org/2000/svg",width:"14.563ex",height:"2.022ex",role:"img",focusable:"false",viewBox:"0 -871.8 6437 893.8","aria-hidden":"true"};n0={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};i0={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.05ex"},xmlns:"http://www.w3.org/2000/svg",width:"8.548ex",height:"1.581ex",role:"img",focusable:"false",viewBox:"0 -677 3778 699","aria-hidden":"true"};a0={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};s0={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"0"},xmlns:"http://www.w3.org/2000/svg",width:"1.131ex",height:"1.532ex",role:"img",focusable:"false",viewBox:"0 -677 500 677","aria-hidden":"true"};r0={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};l0={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.05ex"},xmlns:"http://www.w3.org/2000/svg",width:"15.363ex",height:"2.005ex",role:"img",focusable:"false",viewBox:"0 -864 6790.6 886","aria-hidden":"true"};o0={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};d0={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.05ex"},xmlns:"http://www.w3.org/2000/svg",width:"16.608ex",height:"2.005ex",role:"img",focusable:"false",viewBox:"0 -864 7340.7 886","aria-hidden":"true"};c0={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};p0={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.05ex"},xmlns:"http://www.w3.org/2000/svg",width:"1.131ex",height:"1.557ex",role:"img",focusable:"false",viewBox:"0 -666 500 688","aria-hidden":"true"};u0={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};h0={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.05ex"},xmlns:"http://www.w3.org/2000/svg",width:"10.152ex",height:"2.003ex",role:"img",focusable:"false",viewBox:"0 -863.3 4487.1 885.3","aria-hidden":"true"};f0={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};m0={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.05ex"},xmlns:"http://www.w3.org/2000/svg",width:"8.907ex",height:"2.02ex",role:"img",focusable:"false",viewBox:"0 -871.1 3937 893.1","aria-hidden":"true"};g0={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};_0={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.05ex"},xmlns:"http://www.w3.org/2000/svg",width:"8.907ex",height:"2.02ex",role:"img",focusable:"false",viewBox:"0 -871.1 3937 893.1","aria-hidden":"true"};T0={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};b0={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.05ex"},xmlns:"http://www.w3.org/2000/svg",width:"2.262ex",height:"1.557ex",role:"img",focusable:"false",viewBox:"0 -666 1000 688","aria-hidden":"true"};v0={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};k0={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.05ex"},xmlns:"http://www.w3.org/2000/svg",width:"13.072ex",height:"1.581ex",role:"img",focusable:"false",viewBox:"0 -677 5778 699","aria-hidden":"true"};Q0={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};y0={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.566ex"},xmlns:"http://www.w3.org/2000/svg",width:"13.828ex",height:"2.262ex",role:"img",focusable:"false",viewBox:"0 -750 6112 1000","aria-hidden":"true"};x0={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};w0={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.025ex"},xmlns:"http://www.w3.org/2000/svg",width:"0.98ex",height:"1.025ex",role:"img",focusable:"false",viewBox:"0 -442 433 453","aria-hidden":"true"};E0={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};S0={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.025ex"},xmlns:"http://www.w3.org/2000/svg",width:"0.98ex",height:"1.025ex",role:"img",focusable:"false",viewBox:"0 -442 433 453","aria-hidden":"true"};M0={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};L0={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.05ex"},xmlns:"http://www.w3.org/2000/svg",width:"4.495ex",height:"2.02ex",role:"img",focusable:"false",viewBox:"0 -871.1 1986.7 893.1","aria-hidden":"true"};A0={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};F0={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.05ex"},xmlns:"http://www.w3.org/2000/svg",width:"5.295ex",height:"2.005ex",role:"img",focusable:"false",viewBox:"0 -864 2340.2 886","aria-hidden":"true"};C0={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};z0={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.05ex"},xmlns:"http://www.w3.org/2000/svg",width:"4.495ex",height:"2.02ex",role:"img",focusable:"false",viewBox:"0 -871.1 1986.7 893.1","aria-hidden":"true"};D0={tabindex:"0",class:"MathJax",jax:"SVG",display:"true",style:{direction:"ltr",display:"block","text-align":"center",margin:"1em 0",position:"relative"}};B0={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-6.28ex"},xmlns:"http://www.w3.org/2000/svg",width:"29.064ex",height:"13.692ex",role:"img",focusable:"false",viewBox:"0 -3275.9 12846.2 6051.8","aria-hidden":"true"};R0={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};V0={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.025ex"},xmlns:"http://www.w3.org/2000/svg",width:"1.052ex",height:"1.025ex",role:"img",focusable:"false",viewBox:"0 -442 465 453","aria-hidden":"true"};H0={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};P0={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.025ex"},xmlns:"http://www.w3.org/2000/svg",width:"0.98ex",height:"1.025ex",role:"img",focusable:"false",viewBox:"0 -442 433 453","aria-hidden":"true"};I0={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};O0={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.025ex"},xmlns:"http://www.w3.org/2000/svg",width:"1.052ex",height:"1.025ex",role:"img",focusable:"false",viewBox:"0 -442 465 453","aria-hidden":"true"};G0={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};N0={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.025ex"},xmlns:"http://www.w3.org/2000/svg",width:"0.98ex",height:"1.025ex",role:"img",focusable:"false",viewBox:"0 -442 433 453","aria-hidden":"true"};U0={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};j0={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.025ex"},xmlns:"http://www.w3.org/2000/svg",width:"0.98ex",height:"1.025ex",role:"img",focusable:"false",viewBox:"0 -442 433 453","aria-hidden":"true"};Z0={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};q0={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.025ex"},xmlns:"http://www.w3.org/2000/svg",width:"0.98ex",height:"1.025ex",role:"img",focusable:"false",viewBox:"0 -442 433 453","aria-hidden":"true"};J0={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};W0={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.025ex"},xmlns:"http://www.w3.org/2000/svg",width:"0.98ex",height:"1.025ex",role:"img",focusable:"false",viewBox:"0 -442 433 453","aria-hidden":"true"};Y0={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};X0={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.566ex"},xmlns:"http://www.w3.org/2000/svg",width:"5.029ex",height:"2.262ex",role:"img",focusable:"false",viewBox:"0 -750 2222.7 1000","aria-hidden":"true"};$0={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};K0={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.025ex"},xmlns:"http://www.w3.org/2000/svg",width:"0.98ex",height:"1.025ex",role:"img",focusable:"false",viewBox:"0 -442 433 453","aria-hidden":"true"};e4={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};t4={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.025ex"},xmlns:"http://www.w3.org/2000/svg",width:"0.98ex",height:"1.025ex",role:"img",focusable:"false",viewBox:"0 -442 433 453","aria-hidden":"true"};n4={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};i4={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.025ex"},xmlns:"http://www.w3.org/2000/svg",width:"1.984ex",height:"1.647ex",role:"img",focusable:"false",viewBox:"0 -717 877 728","aria-hidden":"true"};a4={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};s4={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.025ex"},xmlns:"http://www.w3.org/2000/svg",width:"1.984ex",height:"1.647ex",role:"img",focusable:"false",viewBox:"0 -717 877 728","aria-hidden":"true"};r4={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};l4={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.025ex"},xmlns:"http://www.w3.org/2000/svg",width:"1.052ex",height:"1.025ex",role:"img",focusable:"false",viewBox:"0 -442 465 453","aria-hidden":"true"};o4={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};d4={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.025ex"},xmlns:"http://www.w3.org/2000/svg",width:"0.98ex",height:"1.025ex",role:"img",focusable:"false",viewBox:"0 -442 433 453","aria-hidden":"true"};c4={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};p4={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.05ex"},xmlns:"http://www.w3.org/2000/svg",width:"5.295ex",height:"2.005ex",role:"img",focusable:"false",viewBox:"0 -864 2340.2 886","aria-hidden":"true"};u4={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};h4={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.05ex"},xmlns:"http://www.w3.org/2000/svg",width:"5.295ex",height:"2.005ex",role:"img",focusable:"false",viewBox:"0 -864 2340.2 886","aria-hidden":"true"};f4={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};m4={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.05ex"},xmlns:"http://www.w3.org/2000/svg",width:"6.894ex",height:"2.005ex",role:"img",focusable:"false",viewBox:"0 -864 3047.3 886","aria-hidden":"true"};g4={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};_4={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.566ex"},xmlns:"http://www.w3.org/2000/svg",width:"8.187ex",height:"2.262ex",role:"img",focusable:"false",viewBox:"0 -750 3618.7 1000","aria-hidden":"true"};T4={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};b4={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.566ex"},xmlns:"http://www.w3.org/2000/svg",width:"4.919ex",height:"2.262ex",role:"img",focusable:"false",viewBox:"0 -750 2174 1000","aria-hidden":"true"};v4={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};k4={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.025ex"},xmlns:"http://www.w3.org/2000/svg",width:"1.052ex",height:"1.025ex",role:"img",focusable:"false",viewBox:"0 -442 465 453","aria-hidden":"true"};Q4={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};y4={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.566ex"},xmlns:"http://www.w3.org/2000/svg",width:"12.859ex",height:"2.452ex",role:"img",focusable:"false",viewBox:"0 -833.9 5683.6 1083.9","aria-hidden":"true"};x4={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};w4={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.566ex"},xmlns:"http://www.w3.org/2000/svg",width:"12.859ex",height:"2.452ex",role:"img",focusable:"false",viewBox:"0 -833.9 5683.6 1083.9","aria-hidden":"true"};E4={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};S4={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.05ex"},xmlns:"http://www.w3.org/2000/svg",width:"1.131ex",height:"1.557ex",role:"img",focusable:"false",viewBox:"0 -666 500 688","aria-hidden":"true"};M4={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};L4={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"0"},xmlns:"http://www.w3.org/2000/svg",width:"1.131ex",height:"1.507ex",role:"img",focusable:"false",viewBox:"0 -666 500 666","aria-hidden":"true"};A4={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};F4={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.566ex"},xmlns:"http://www.w3.org/2000/svg",width:"8.109ex",height:"2.262ex",role:"img",focusable:"false",viewBox:"0 -750 3584.2 1000","aria-hidden":"true"};C4={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};z4={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.05ex"},xmlns:"http://www.w3.org/2000/svg",width:"4.525ex",height:"1.581ex",role:"img",focusable:"false",viewBox:"0 -677 2000 699","aria-hidden":"true"};D4={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};B4={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.05ex"},xmlns:"http://www.w3.org/2000/svg",width:"8.422ex",height:"1.581ex",role:"img",focusable:"false",viewBox:"0 -677 3722.4 699","aria-hidden":"true"};R4={tabindex:"0",class:"MathJax",jax:"SVG",display:"true",style:{direction:"ltr",display:"block","text-align":"center",margin:"1em 0",position:"relative"}};V4={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-2.148ex"},xmlns:"http://www.w3.org/2000/svg",width:"53.64ex",height:"5.428ex",role:"img",focusable:"false",viewBox:"0 -1449.5 23708.7 2399","aria-hidden":"true"};H4={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};P4={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"0"},xmlns:"http://www.w3.org/2000/svg",width:"1.199ex",height:"1ex",role:"img",focusable:"false",viewBox:"0 -442 530 442","aria-hidden":"true"};I4={class:"MathJax",jax:"SVG",style:{direction:"ltr",position:"relative"}};O4={style:{overflow:"visible","min-height":"1px","min-width":"1px","vertical-align":"-0.05ex"},xmlns:"http://www.w3.org/2000/svg",width:"3.394ex",height:"1.557ex",role:"img",focusable:"false",viewBox:"0 -666 1500 688","aria-hidden":"true"};j4=JSON.parse('{"title":"","description":"","frontmatter":{},"headers":[],"relativePath":"index.md","filePath":"index.md"}');G4={name:"index.md"};Z4=Object.assign(G4,{setup(a){const e=[{color:"#002500",position:0,smoothness:0},{color:"#175b3d",position:.16,smoothness:0},{color:"#ffceb6",position:.26,smoothness:0},{color:"#edffff",position:.42,smoothness:0},{color:"#ff8fbc",position:.7,smoothness:0},{color:"#a6003e",position:.85,smoothness:0},{color:"#100000",position:1,smoothness:0}],i=[{color:"#002500",position:0,zebra:1,smoothness:0},{color:"#175b3d",position:.16,zebra:1,smoothness:0},{color:"#ffceb6",position:.26,zebra:1,smoothness:0},{color:"#edffff",position:.42,zebra:1,smoothness:0},{color:"#ff8fbc",position:.7,zebra:1,smoothness:0},{color:"#a6003e",position:.85,zebra:1,smoothness:0},{color:"#100000",position:1,zebra:1,smoothness:0}],s=[{color:"#002500",position:0,smoothness:1},{color:"#175b3d",position:.16,smoothness:1},{color:"#ffceb6",position:.26,smoothness:1},{color:"#edffff",position:.42,smoothness:1},{color:"#ff8fbc",position:.7,smoothness:1},{color:"#a6003e",position:.85,smoothness:1},{color:"#100000",position:1,smoothness:1}],r=[{color:"#002500",position:0,shading:1,smoothness:1},{color:"#175b3d",position:.16,shading:1,smoothness:1},{color:"#ffceb6",position:.26,shading:1,smoothness:1},{color:"#edffff",position:.42,shading:1,smoothness:1},{color:"#ff8fbc",position:.7,shading:1,smoothness:1},{color:"#a6003e",position:.85,shading:1,smoothness:1},{color:"#100000",position:1,shading:1,smoothness:1}];return(l,t)=>{const c=Jt("ClientOnly"),p=Jt("ComplexDemo"),f=Jt("IframeMandelbrotLowPrecision");return v(),k("div",null,[t[313]||(t[313]=n("link",{rel:"stylesheet",href:"https://use.typekit.net/fnz7ojs.css"},null,-1)),t[314]||(t[314]=h(" # WebAssembly, WebGPU, Rust, fractales et autres trucs cools. ",-1)),t[315]||(t[315]=n("h2",{id:"qu-est-ce-que-le-fractal-de-mandelbrot",tabindex:"-1"},[h("Qu'est-ce que le fractal de Mandelbrot "),n("a",{class:"header-anchor",href:"#qu-est-ce-que-le-fractal-de-mandelbrot","aria-label":"Permalink to “Qu'est-ce que le fractal de Mandelbrot”"},"​")],-1)),n("p",null,[t[2]||(t[2]=h("En math\xe9matiques, l'ensemble de Mandelbrot est une fractale d\xe9finie comme l'ensemble des points ",-1)),n("mjx-container",D3,[(v(),k("svg",B3,[...t[0]||(t[0]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mi"},[n("path",{"data-c":"1D450",d:"M34 159Q34 268 120 355T306 442Q362 442 394 418T427 355Q427 326 408 306T360 285Q341 285 330 295T319 325T330 359T352 380T366 386H367Q367 388 361 392T340 400T306 404Q276 404 249 390Q228 381 206 359Q162 315 142 235T121 119Q121 73 147 50Q169 26 205 26H209Q321 26 394 111Q403 121 406 121Q410 121 419 112T429 98T420 83T391 55T346 25T282 0T202 -11Q127 -11 81 37T34 159Z",style:{"stroke-width":"3"}})])])],-1)])])),t[1]||(t[1]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"c")])],-1))]),t[3]||(t[3]=h(" du plan complexe pour lesquels la suite de nombres complexes d\xe9finie par r\xe9currence par la formule qui suit est born\xe9e :",-1))]),n("mjx-container",R3,[(v(),k("svg",V3,[...t[4]||(t[4]=[F("",1)])])),t[5]||(t[5]=n("mjx-assistive-mml",{unselectable:"on",display:"block",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",overflow:"hidden",width:"100%"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML",display:"block"},[n("mrow",{"data-mjx-texclass":"INNER"},[n("mo",{"data-mjx-texclass":"OPEN"},"{"),n("mtable",{columnalign:"left left",columnspacing:"1em",rowspacing:".2em"},[n("mtr",null,[n("mtd",null,[n("msub",null,[n("mi",null,"z"),n("mn",null,"0")]),n("mo",null,"="),n("mn",null,"0")])]),n("mtr",null,[n("mtd",null,[n("msub",null,[n("mi",null,"z"),n("mrow",{"data-mjx-texclass":"ORD"},[n("mi",null,"n"),n("mo",null,"+"),n("mn",null,"1")])]),n("mo",null,"="),n("msubsup",null,[n("mi",null,"z"),n("mi",null,"n"),n("mn",null,"2")]),n("mo",null,"+"),n("mi",null,"c")])])]),n("mo",{"data-mjx-texclass":"CLOSE",fence:"true",stretchy:"true",symmetric:"true"})])])],-1))]),n("p",null,[t[8]||(t[8]=h("Nous pouvons visualiser ce qu'il se passe avec cette suite sur un diagramme. Le diagramme repr\xe9sente le plan complexe en 2D, l'axe horizontal repr\xe9sentant la partie r\xe9elle et l'axe vertical la partie imaginaire. Le point ",-1)),n("mjx-container",H3,[(v(),k("svg",P3,[...t[6]||(t[6]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mi"},[n("path",{"data-c":"1D450",d:"M34 159Q34 268 120 355T306 442Q362 442 394 418T427 355Q427 326 408 306T360 285Q341 285 330 295T319 325T330 359T352 380T366 386H367Q367 388 361 392T340 400T306 404Q276 404 249 390Q228 381 206 359Q162 315 142 235T121 119Q121 73 147 50Q169 26 205 26H209Q321 26 394 111Q403 121 406 121Q410 121 419 112T429 98T420 83T391 55T346 25T282 0T202 -11Q127 -11 81 37T34 159Z",style:{"stroke-width":"3"}})])])],-1)])])),t[7]||(t[7]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"c")])],-1))]),t[9]||(t[9]=h(" est repr\xe9sent\xe9 en rouge et il prend la valeur point\xe9 par le curseur sur le diagramme.",-1))]),t[316]||(t[316]=n("p",null,"Voici ce que \xe7a donne pour trois it\xe9rations. Vous observerez que :",-1)),n("p",null,[t[12]||(t[12]=h("Le premier point est ",-1)),n("mjx-container",I3,[(v(),k("svg",O3,[...t[10]||(t[10]=[F("",1)])])),t[11]||(t[11]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("msub",null,[n("mi",null,"z"),n("mn",null,"0")]),n("mo",null,"="),n("mn",null,"0"),n("mo",null,"+"),n("mn",null,"0"),n("mi",null,"i")])],-1))]),t[13]||(t[13]=h(", c'est d\xe9fini dans la formule",-1))]),n("p",null,[t[26]||(t[26]=h("Le second est ",-1)),n("mjx-container",G3,[(v(),k("svg",N3,[...t[14]||(t[14]=[F("",1)])])),t[15]||(t[15]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("msub",null,[n("mi",null,"z"),n("mn",null,"1")])])],-1))]),t[27]||(t[27]=h(" est \xe9gal \xe0 ",-1)),n("mjx-container",U3,[(v(),k("svg",j3,[...t[16]||(t[16]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mi"},[n("path",{"data-c":"1D450",d:"M34 159Q34 268 120 355T306 442Q362 442 394 418T427 355Q427 326 408 306T360 285Q341 285 330 295T319 325T330 359T352 380T366 386H367Q367 388 361 392T340 400T306 404Q276 404 249 390Q228 381 206 359Q162 315 142 235T121 119Q121 73 147 50Q169 26 205 26H209Q321 26 394 111Q403 121 406 121Q410 121 419 112T429 98T420 83T391 55T346 25T282 0T202 -11Q127 -11 81 37T34 159Z",style:{"stroke-width":"3"}})])])],-1)])])),t[17]||(t[17]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"c")])],-1))]),t[28]||(t[28]=h(" (le point rouge). En effet ",-1)),n("mjx-container",Z3,[(v(),k("svg",q3,[...t[18]||(t[18]=[F("",1)])])),t[19]||(t[19]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("msub",null,[n("mi",null,"z"),n("mn",null,"1")]),n("mo",null,"="),n("msubsup",null,[n("mi",null,"z"),n("mn",null,"0"),n("mn",null,"2")]),n("mo",null,"+"),n("mi",null,"c")])],-1))]),t[29]||(t[29]=h(" or comme ",-1)),n("mjx-container",J3,[(v(),k("svg",W3,[...t[20]||(t[20]=[F("",1)])])),t[21]||(t[21]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("msub",null,[n("mi",null,"z"),n("mn",null,"0")]),n("mo",null,"="),n("mn",null,"0")])],-1))]),t[30]||(t[30]=h(", ",-1)),n("mjx-container",Y3,[(v(),k("svg",X3,[...t[22]||(t[22]=[F("",1)])])),t[23]||(t[23]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("msubsup",null,[n("mi",null,"z"),n("mn",null,"0"),n("mn",null,"2")]),n("mo",null,"="),n("mn",null,"0")])],-1))]),t[31]||(t[31]=h(" donc ",-1)),n("mjx-container",$3,[(v(),k("svg",K3,[...t[24]||(t[24]=[F("",1)])])),t[25]||(t[25]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("msub",null,[n("mi",null,"z"),n("mn",null,"1")]),n("mo",null,"="),n("mi",null,"c")])],-1))]),t[32]||(t[32]=h(".",-1))]),n("p",null,[t[35]||(t[35]=h("Le troisi\xe8me est ",-1)),n("mjx-container",ed,[(v(),k("svg",td,[...t[33]||(t[33]=[F("",1)])])),t[34]||(t[34]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("msub",null,[n("mi",null,"z"),n("mn",null,"2")]),n("mo",null,"="),n("msubsup",null,[n("mi",null,"z"),n("mn",null,"1"),n("mn",null,"2")]),n("mo",null,"+"),n("mi",null,"c")])],-1))]),t[36]||(t[36]=h(".",-1))]),R(c,null,{default:ae(()=>[R(ot,{cx:"-0.5",cy:"0.0",scale:"1",angle:0,showOrbitLabels:!0,orbitIterations:3})]),_:1}),t[317]||(t[317]=n("p",null,"Pour rappel, quand on \xe9l\xe8ve un nombre complexe au carr\xe9, on \xe9l\xe8ve sa norme au carr\xe9 et on double son argument.",-1)),t[318]||(t[318]=n("p",null,"Plus g\xe9n\xe9ralement, la multiplication de deux nombres complexes revient \xe0 multiplier leurs normes et additionner leurs arguments.",-1)),t[319]||(t[319]=n("p",null,"Tandis que l'addition de deux nombres complexes revient \xe0 additionner leurs parties r\xe9elles et leurs parties imaginaires.",-1)),R(p),t[320]||(t[320]=n("p",null,"On peut continuer \xe0 it\xe9rer la suite et observer ce qu'il se passe. Voici ce que \xe7a donne pour 10 it\xe9rations.",-1)),R(c,null,{default:ae(()=>[R(ot,{cx:"-0.5",cy:"0.0",scale:"1",angle:0,showOrbitLabels:!1,orbitIterations:10})]),_:1}),t[321]||(t[321]=n("p",null,"On commence \xe0 observer que la suite semble converger vers un point fixe ou bien diverger vers l'infini.",-1)),n("p",null,[t[39]||(t[39]=h("Quand la suite converge, on dit que le point ",-1)),n("mjx-container",nd,[(v(),k("svg",id,[...t[37]||(t[37]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mi"},[n("path",{"data-c":"1D450",d:"M34 159Q34 268 120 355T306 442Q362 442 394 418T427 355Q427 326 408 306T360 285Q341 285 330 295T319 325T330 359T352 380T366 386H367Q367 388 361 392T340 400T306 404Q276 404 249 390Q228 381 206 359Q162 315 142 235T121 119Q121 73 147 50Q169 26 205 26H209Q321 26 394 111Q403 121 406 121Q410 121 419 112T429 98T420 83T391 55T346 25T282 0T202 -11Q127 -11 81 37T34 159Z",style:{"stroke-width":"3"}})])])],-1)])])),t[38]||(t[38]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"c")])],-1))]),t[40]||(t[40]=h(" appartient \xe0 l'ensemble de Mandelbrot. La suite reste born\xe9e. Les lignes sont color\xe9es en vert.",-1))]),n("p",null,[t[43]||(t[43]=h("Quand la suite diverge, on dit que le point ",-1)),n("mjx-container",ad,[(v(),k("svg",sd,[...t[41]||(t[41]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mi"},[n("path",{"data-c":"1D450",d:"M34 159Q34 268 120 355T306 442Q362 442 394 418T427 355Q427 326 408 306T360 285Q341 285 330 295T319 325T330 359T352 380T366 386H367Q367 388 361 392T340 400T306 404Q276 404 249 390Q228 381 206 359Q162 315 142 235T121 119Q121 73 147 50Q169 26 205 26H209Q321 26 394 111Q403 121 406 121Q410 121 419 112T429 98T420 83T391 55T346 25T282 0T202 -11Q127 -11 81 37T34 159Z",style:{"stroke-width":"3"}})])])],-1)])])),t[42]||(t[42]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"c")])],-1))]),t[44]||(t[44]=h(" n'appartient pas \xe0 l'ensemble de Mandelbrot. La suite n'est pas born\xe9e. Les lignes sont color\xe9es en bleu.",-1))]),t[322]||(t[322]=n("p",null,"Voici maintenant ce que \xe7a donne si on colorie en noir les points qui appartiennent \xe0 l'ensemble de Mandelbrot et en gris ceux qui n'y appartiennent pas.",-1)),R(c,null,{default:ae(()=>[R(ot,{cx:"-0.5",cy:"0.0",scale:"1",angle:0,showMandelbrot:!0,showOrbitLabels:!1,orbitIterations:20})]),_:1}),t[323]||(t[323]=n("p",null,"En noir, vous visualisez donc l'ensemble de Mandelbrot.",-1)),t[324]||(t[324]=n("p",null,"Vous avez surement observ\xe9 que plus l'on s'\xe9loigne du centre de l'ensemble de Mandelbrot, plus la suite diverge rapidement.",-1)),t[325]||(t[325]=n("p",null,"Le corrolaire est que plus on se rapproche du bord de l'ensemble de Mandelbrot, plus la suite converge lentement.",-1)),t[326]||(t[326]=n("h2",{id:"dessiner-l-ensemble-de-mandelbrot",tabindex:"-1"},[h("Dessiner l'ensemble de Mandelbrot "),n("a",{class:"header-anchor",href:"#dessiner-l-ensemble-de-mandelbrot","aria-label":"Permalink to “Dessiner l'ensemble de Mandelbrot”"},"​")],-1)),t[327]||(t[327]=n("p",null,"Vous vous demandez peut-\xeatre comment on peut savoir si un point appartient ou non \xe0 l'ensemble de Mandelbrot ?",-1)),n("p",null,[t[49]||(t[49]=h("Il existe un crit\xe8re simple : si la norme de ",-1)),n("mjx-container",rd,[(v(),k("svg",ld,[...t[45]||(t[45]=[F("",1)])])),t[46]||(t[46]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("msub",null,[n("mi",null,"z"),n("mi",null,"n")])])],-1))]),t[50]||(t[50]=h(" d\xe9passe ",-1)),n("mjx-container",od,[(v(),k("svg",dd,[...t[47]||(t[47]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mn"},[n("path",{"data-c":"32",d:"M109 429Q82 429 66 447T50 491Q50 562 103 614T235 666Q326 666 387 610T449 465Q449 422 429 383T381 315T301 241Q265 210 201 149L142 93L218 92Q375 92 385 97Q392 99 409 186V189H449V186Q448 183 436 95T421 3V0H50V19V31Q50 38 56 46T86 81Q115 113 136 137Q145 147 170 174T204 211T233 244T261 278T284 308T305 340T320 369T333 401T340 431T343 464Q343 527 309 573T212 619Q179 619 154 602T119 569T109 550Q109 549 114 549Q132 549 151 535T170 489Q170 464 154 447T109 429Z",style:{"stroke-width":"3"}})])])],-1)])])),t[48]||(t[48]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mn",null,"2")])],-1))]),t[51]||(t[51]=h(", alors la suite diverge vers l'infini. C'est prouv\xe9.",-1))]),n("p",null,[t[56]||(t[56]=h("On peut donc calculer pour chaque point combien d'it\xe9rations sont n\xe9cessaires pour que la norme de ",-1)),n("mjx-container",cd,[(v(),k("svg",pd,[...t[52]||(t[52]=[F("",1)])])),t[53]||(t[53]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("msub",null,[n("mi",null,"z"),n("mi",null,"n")])])],-1))]),t[57]||(t[57]=h(" d\xe9passe ",-1)),n("mjx-container",ud,[(v(),k("svg",hd,[...t[54]||(t[54]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mn"},[n("path",{"data-c":"32",d:"M109 429Q82 429 66 447T50 491Q50 562 103 614T235 666Q326 666 387 610T449 465Q449 422 429 383T381 315T301 241Q265 210 201 149L142 93L218 92Q375 92 385 97Q392 99 409 186V189H449V186Q448 183 436 95T421 3V0H50V19V31Q50 38 56 46T86 81Q115 113 136 137Q145 147 170 174T204 211T233 244T261 278T284 308T305 340T320 369T333 401T340 431T343 464Q343 527 309 573T212 619Q179 619 154 602T119 569T109 550Q109 549 114 549Q132 549 151 535T170 489Q170 464 154 447T109 429Z",style:{"stroke-width":"3"}})])])],-1)])])),t[55]||(t[55]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mn",null,"2")])],-1))]),t[58]||(t[58]=h(".",-1))]),t[328]||(t[328]=n("p",null,"Pour \xe9viter de calculer ind\xe9finiment pour les points qui sont dans l'ensemble ou bien tr\xe8s proche du bord, on fixe un nombre maximum d'it\xe9rations.",-1)),n("p",null,[t[65]||(t[65]=h("Observez la taille des vecteurs ",-1)),n("mjx-container",fd,[(v(),k("svg",md,[...t[59]||(t[59]=[F("",1)])])),t[60]||(t[60]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("msub",null,[n("mi",null,"z"),n("mi",null,"n")])])],-1))]),t[66]||(t[66]=h(" dans l'illustration suivante. Ceux colori\xe9s en cyan ont une norme inf\xe9rieure \xe0 ",-1)),n("mjx-container",gd,[(v(),k("svg",_d,[...t[61]||(t[61]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mn"},[n("path",{"data-c":"32",d:"M109 429Q82 429 66 447T50 491Q50 562 103 614T235 666Q326 666 387 610T449 465Q449 422 429 383T381 315T301 241Q265 210 201 149L142 93L218 92Q375 92 385 97Q392 99 409 186V189H449V186Q448 183 436 95T421 3V0H50V19V31Q50 38 56 46T86 81Q115 113 136 137Q145 147 170 174T204 211T233 244T261 278T284 308T305 340T320 369T333 401T340 431T343 464Q343 527 309 573T212 619Q179 619 154 602T119 569T109 550Q109 549 114 549Q132 549 151 535T170 489Q170 464 154 447T109 429Z",style:{"stroke-width":"3"}})])])],-1)])])),t[62]||(t[62]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mn",null,"2")])],-1))]),t[67]||(t[67]=h(", celui colori\xe9s en rouge a une norme sup\xe9rieure \xe0 ",-1)),n("mjx-container",Td,[(v(),k("svg",bd,[...t[63]||(t[63]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mn"},[n("path",{"data-c":"32",d:"M109 429Q82 429 66 447T50 491Q50 562 103 614T235 666Q326 666 387 610T449 465Q449 422 429 383T381 315T301 241Q265 210 201 149L142 93L218 92Q375 92 385 97Q392 99 409 186V189H449V186Q448 183 436 95T421 3V0H50V19V31Q50 38 56 46T86 81Q115 113 136 137Q145 147 170 174T204 211T233 244T261 278T284 308T305 340T320 369T333 401T340 431T343 464Q343 527 309 573T212 619Q179 619 154 602T119 569T109 550Q109 549 114 549Q132 549 151 535T170 489Q170 464 154 447T109 429Z",style:{"stroke-width":"3"}})])])],-1)])])),t[64]||(t[64]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mn",null,"2")])],-1))]),t[68]||(t[68]=h(".",-1))]),n("p",null,[t[71]||(t[71]=h("Le calcul s'arr\xeate d\xe8s que la norme d\xe9passe ",-1)),n("mjx-container",vd,[(v(),k("svg",kd,[...t[69]||(t[69]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mn"},[n("path",{"data-c":"32",d:"M109 429Q82 429 66 447T50 491Q50 562 103 614T235 666Q326 666 387 610T449 465Q449 422 429 383T381 315T301 241Q265 210 201 149L142 93L218 92Q375 92 385 97Q392 99 409 186V189H449V186Q448 183 436 95T421 3V0H50V19V31Q50 38 56 46T86 81Q115 113 136 137Q145 147 170 174T204 211T233 244T261 278T284 308T305 340T320 369T333 401T340 431T343 464Q343 527 309 573T212 619Q179 619 154 602T119 569T109 550Q109 549 114 549Q132 549 151 535T170 489Q170 464 154 447T109 429Z",style:{"stroke-width":"3"}})])])],-1)])])),t[70]||(t[70]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mn",null,"2")])],-1))]),t[72]||(t[72]=h(" ou bien que le nombre maximum d'it\xe9rations est atteint.",-1))]),R(c,null,{default:ae(()=>[R(ot,{cx:"-0.5",cy:"0.0",scale:"1.5",angle:0,showMandelbrot:!0,showOrbitLabels:!1,showPalette:!1,showOrbitVectors:!0,orbitIterations:100})]),_:1}),n("p",null,[t[79]||(t[79]=h("Voici un exemple de code source en ",-1)),t[80]||(t[80]=n("em",null,"TypeScript",-1)),t[81]||(t[81]=h(" qui calcule le nombre d'it\xe9rations n\xe9cessaires pour que la norme de ",-1)),n("mjx-container",Qd,[(v(),k("svg",yd,[...t[73]||(t[73]=[F("",1)])])),t[74]||(t[74]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("msub",null,[n("mi",null,"z"),n("mi",null,"n")])])],-1))]),t[82]||(t[82]=h(" d\xe9passe ",-1)),n("mjx-container",xd,[(v(),k("svg",wd,[...t[75]||(t[75]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mn"},[n("path",{"data-c":"32",d:"M109 429Q82 429 66 447T50 491Q50 562 103 614T235 666Q326 666 387 610T449 465Q449 422 429 383T381 315T301 241Q265 210 201 149L142 93L218 92Q375 92 385 97Q392 99 409 186V189H449V186Q448 183 436 95T421 3V0H50V19V31Q50 38 56 46T86 81Q115 113 136 137Q145 147 170 174T204 211T233 244T261 278T284 308T305 340T320 369T333 401T340 431T343 464Q343 527 309 573T212 619Q179 619 154 602T119 569T109 550Q109 549 114 549Q132 549 151 535T170 489Q170 464 154 447T109 429Z",style:{"stroke-width":"3"}})])])],-1)])])),t[76]||(t[76]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mn",null,"2")])],-1))]),t[83]||(t[83]=h(" pour un point ",-1)),n("mjx-container",Ed,[(v(),k("svg",Sd,[...t[77]||(t[77]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mi"},[n("path",{"data-c":"1D450",d:"M34 159Q34 268 120 355T306 442Q362 442 394 418T427 355Q427 326 408 306T360 285Q341 285 330 295T319 325T330 359T352 380T366 386H367Q367 388 361 392T340 400T306 404Q276 404 249 390Q228 381 206 359Q162 315 142 235T121 119Q121 73 147 50Q169 26 205 26H209Q321 26 394 111Q403 121 406 121Q410 121 419 112T429 98T420 83T391 55T346 25T282 0T202 -11Q127 -11 81 37T34 159Z",style:{"stroke-width":"3"}})])])],-1)])])),t[78]||(t[78]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"c")])],-1))]),t[84]||(t[84]=h(" donn\xe9.",-1))]),t[329]||(t[329]=F("",1)),n("p",null,[t[89]||(t[89]=h("Voici ce que \xe7a donne en coloriant les points en fonction du nombre d'it\xe9rations n\xe9cessaires pour que la norme de ",-1)),n("mjx-container",Md,[(v(),k("svg",Ld,[...t[85]||(t[85]=[F("",1)])])),t[86]||(t[86]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("msub",null,[n("mi",null,"z"),n("mi",null,"n")])])],-1))]),t[90]||(t[90]=h(" d\xe9passe ",-1)),n("mjx-container",Ad,[(v(),k("svg",Fd,[...t[87]||(t[87]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mn"},[n("path",{"data-c":"32",d:"M109 429Q82 429 66 447T50 491Q50 562 103 614T235 666Q326 666 387 610T449 465Q449 422 429 383T381 315T301 241Q265 210 201 149L142 93L218 92Q375 92 385 97Q392 99 409 186V189H449V186Q448 183 436 95T421 3V0H50V19V31Q50 38 56 46T86 81Q115 113 136 137Q145 147 170 174T204 211T233 244T261 278T284 308T305 340T320 369T333 401T340 431T343 464Q343 527 309 573T212 619Q179 619 154 602T119 569T109 550Q109 549 114 549Q132 549 151 535T170 489Q170 464 154 447T109 429Z",style:{"stroke-width":"3"}})])])],-1)])])),t[88]||(t[88]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mn",null,"2")])],-1))]),t[91]||(t[91]=h(".",-1))]),t[330]||(t[330]=n("p",null,"Plus le nombre d'it\xe9rations est grand, plus la couleur est clair.",-1)),R(c,null,{default:ae(()=>[R(ot,{cx:"-0.5",cy:"0.0",scale:"1.5",angle:0,showMandelbrot:!0,showOrbitLabels:!1,showPalette:!0,showOrbitVectors:!0,orbitIterations:100})]),_:1}),t[331]||(t[331]=F("",3)),R(c,null,{default:ae(()=>[R(xe,{cx:"-0.5",cy:"0.0",scale:"1.5",angle:0,colorStops:e})]),_:1}),t[332]||(t[332]=n("p",null,"Vous noterez qu'il y a un effet de bandes d\xfb au fait que le nombre d'it\xe9rations est un entier.",-1)),t[333]||(t[333]=n("p",null,"On peut le faire ressortir en ne coloriant que les it\xe9rations impaires.",-1)),R(c,null,{default:ae(()=>[R(xe,{cx:"-0.5",cy:"0.0",scale:"1.5",angle:0,colorStops:i})]),_:1}),n("p",null,[t[94]||(t[94]=h("On peut \xe9galement lisser les couleurs en utilisant la valeur de ",-1)),n("mjx-container",Cd,[(v(),k("svg",zd,[...t[92]||(t[92]=[F("",1)])])),t[93]||(t[93]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mo",{"data-mjx-texclass":"ORD"},"∥"),n("msub",null,[n("mi",null,"z"),n("mi",null,"n")]),n("mo",{"data-mjx-texclass":"ORD"},"∥")])],-1))]),t[95]||(t[95]=h(".",-1))]),t[334]||(t[334]=n("p",null,"La formule de lissage est la suivante :",-1)),n("p",null,[n("mjx-container",Dd,[(v(),k("svg",Bd,[...t[96]||(t[96]=[F("",1)])])),t[97]||(t[97]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("msub",null,[n("mi",null,"n"),n("mrow",{"data-mjx-texclass":"ORD"},[n("mi",null,"s"),n("mi",null,"m"),n("mi",null,"o"),n("mi",null,"o"),n("mi",null,"t"),n("mi",null,"h")])]),n("mo",null,"="),n("mi",null,"n"),n("mo",null,"+"),n("mn",null,"1"),n("mo",null,"−"),n("mi",null,"δ")])],-1))])]),n("p",null,[n("mjx-container",Rd,[(v(),k("svg",Vd,[...t[98]||(t[98]=[F("",1)])])),t[99]||(t[99]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"δ"),n("mo",null,"="),n("mfrac",null,[n("mrow",null,[n("mi",null,"log"),n("mo",{"data-mjx-texclass":"NONE"},"⁡"),n("mo",{stretchy:"false"},"("),n("mfrac",null,[n("mrow",null,[n("mo",{"data-mjx-texclass":"ORD"},"∥"),n("msub",null,[n("mi",null,"z"),n("mi",null,"n")]),n("mo",{"data-mjx-texclass":"ORD"},"∥")]),n("mrow",null,[n("mn",null,"2"),n("mi",null,"log"),n("mo",{"data-mjx-texclass":"NONE"},"⁡"),n("mo",{stretchy:"false"},"("),n("mn",null,"2"),n("mo",{stretchy:"false"},")")])]),n("mo",{stretchy:"false"},")")]),n("mrow",null,[n("mi",null,"log"),n("mo",{"data-mjx-texclass":"NONE"},"⁡"),n("mo",{stretchy:"false"},"("),n("mn",null,"2"),n("mo",{stretchy:"false"},")")])])])],-1))])]),n("p",null,[t[106]||(t[106]=h("On se sert du nombre entier d'it\xe9rations ",-1)),n("mjx-container",Hd,[(v(),k("svg",Pd,[...t[100]||(t[100]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mi"},[n("path",{"data-c":"1D45B",d:"M21 287Q22 293 24 303T36 341T56 388T89 425T135 442Q171 442 195 424T225 390T231 369Q231 367 232 367L243 378Q304 442 382 442Q436 442 469 415T503 336T465 179T427 52Q427 26 444 26Q450 26 453 27Q482 32 505 65T540 145Q542 153 560 153Q580 153 580 145Q580 144 576 130Q568 101 554 73T508 17T439 -10Q392 -10 371 17T350 73Q350 92 386 193T423 345Q423 404 379 404H374Q288 404 229 303L222 291L189 157Q156 26 151 16Q138 -11 108 -11Q95 -11 87 -5T76 7T74 17Q74 30 112 180T152 343Q153 348 153 366Q153 405 129 405Q91 405 66 305Q60 285 60 284Q58 278 41 278H27Q21 284 21 287Z",style:{"stroke-width":"3"}})])])],-1)])])),t[101]||(t[101]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"n")])],-1))]),t[107]||(t[107]=h(" et on ajoute un ",-1)),n("mjx-container",Id,[(v(),k("svg",Od,[...t[102]||(t[102]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mi"},[n("path",{"data-c":"1D6FF",d:"M195 609Q195 656 227 686T302 717Q319 716 351 709T407 697T433 690Q451 682 451 662Q451 644 438 628T403 612Q382 612 348 641T288 671T249 657T235 628Q235 584 334 463Q401 379 401 292Q401 169 340 80T205 -10H198Q127 -10 83 36T36 153Q36 286 151 382Q191 413 252 434Q252 435 245 449T230 481T214 521T201 566T195 609ZM112 130Q112 83 136 55T204 27Q233 27 256 51T291 111T309 178T316 232Q316 267 309 298T295 344T269 400L259 396Q215 381 183 342T137 256T118 179T112 130Z",style:{"stroke-width":"3"}})])])],-1)])])),t[103]||(t[103]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"δ")])],-1))]),t[108]||(t[108]=h(" calcul\xe9 en fonction ",-1)),n("mjx-container",Gd,[(v(),k("svg",Nd,[...t[104]||(t[104]=[F("",1)])])),t[105]||(t[105]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mo",{"data-mjx-texclass":"ORD"},"∥"),n("msub",null,[n("mi",null,"z"),n("mi",null,"n")]),n("mo",{"data-mjx-texclass":"ORD"},"∥")])],-1))]),t[109]||(t[109]=h(".",-1))]),t[335]||(t[335]=n("p",null,"Voici ce que \xe7a donne avec un lissage.",-1)),R(c,null,{default:ae(()=>[R(xe,{cx:"-0.5",cy:"0.0",scale:"1.5",angle:0,colorStops:s})]),_:1}),t[336]||(t[336]=n("h2",{id:"quelques-caracteristiques-interessantes",tabindex:"-1"},[h("Quelques caract\xe9ristiques int\xe9ressantes "),n("a",{class:"header-anchor",href:"#quelques-caracteristiques-interessantes","aria-label":"Permalink to “Quelques caract\xe9ristiques int\xe9ressantes”"},"​")],-1)),t[337]||(t[337]=n("p",null,"Une des caract\xe9ristiques int\xe9ressantes de l'ensemble de Mandelbrot et des fractals en g\xe9n\xe9ral est que l'on peut zoomer ind\xe9finiment sur sa structure et qu'il est auto-similaire. C'est-\xe0-dire que si l'on zoome sur certaines parties de l'ensemble, on retrouve des structures similaires \xe0 l'ensemble global. Dans le cas de l'ensemble de Mandelbrot, on retrouve des mini-Mandelbrots un peu partout.",-1)),t[338]||(t[338]=n("p",null,"Contrairement \xe0 d'autres fractales, l'ensemble de Mandelbrot n'est pas strictement auto-similaire, c'est aussi ce qui le rend int\xe9ressant, car il pr\xe9sente une grande vari\xe9t\xe9 de formes et de structures.",-1)),R(c,null,{default:ae(()=>[R(C3)]),_:1}),t[339]||(t[339]=n("p",null,"Ce sont l\xe0 quelques exemples choisis parmi une infinit\xe9 de possibilit\xe9s.",-1)),t[340]||(t[340]=n("p",null,"Ce qui est int\xe9ressant finalement, c'est plut\xf4t de naviguer librement dans l'ensemble et d\xe9couvrir ses structures.",-1)),R(c,null,{default:ae(()=>[R(xe,{cx:"-0.5",cy:"0.0",scale:"1.5",angle:0,colorStops:r})]),_:1}),t[341]||(t[341]=n("h2",{id:"performance",tabindex:"-1"},[h("Performance "),n("a",{class:"header-anchor",href:"#performance","aria-label":"Permalink to “Performance”"},"​")],-1)),t[342]||(t[342]=n("p",null,"Le dessin de l'ensemble de Mandelbrot est assez co\xfbteux en calculs.",-1)),t[343]||(t[343]=n("p",null,"En effet, pour chaque pixel de l'image, il faut effectuer un certain nombre d'it\xe9rations pour d\xe9terminer si le point correspondant dans le plan complexe appartient ou non \xe0 l'ensemble de Mandelbrot.",-1)),t[344]||(t[344]=n("p",null,"Sachant que chaque it\xe9ration implique plusieurs op\xe9rations sur des nombres complexes (multiplications et additions).",-1)),t[345]||(t[345]=n("p",null,"Par ailleurs, plus le niveau de zoom est \xe9lev\xe9, plus le nombre d'it\xe9rations n\xe9cessaires pour obtenir une image de qualit\xe9 augmente.",-1)),t[346]||(t[346]=n("p",null,"C'est parce que lorsque l'on zoome, on cherche toujours \xe0 se rapprocher du bord de l'ensemble de Mandelbrot, afin de d\xe9couvrir ses d\xe9tails. Or, plus on se rapproche du bord, plus la suite diverge lentement, et donc plus il faut d'it\xe9rations pour d\xe9terminer l'appartenance \xe0 l'ensemble.",-1)),n("p",null,[t[112]||(t[112]=h("Sinon, on se retrouve avec une image enti\xe8rement noire car on n'a pas it\xe9r\xe9 assez longtemps pour que la norme d\xe9passe ",-1)),n("mjx-container",Ud,[(v(),k("svg",jd,[...t[110]||(t[110]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mn"},[n("path",{"data-c":"32",d:"M109 429Q82 429 66 447T50 491Q50 562 103 614T235 666Q326 666 387 610T449 465Q449 422 429 383T381 315T301 241Q265 210 201 149L142 93L218 92Q375 92 385 97Q392 99 409 186V189H449V186Q448 183 436 95T421 3V0H50V19V31Q50 38 56 46T86 81Q115 113 136 137Q145 147 170 174T204 211T233 244T261 278T284 308T305 340T320 369T333 401T340 431T343 464Q343 527 309 573T212 619Q179 619 154 602T119 569T109 550Q109 549 114 549Q132 549 151 535T170 489Q170 464 154 447T109 429Z",style:{"stroke-width":"3"}})])])],-1)])])),t[111]||(t[111]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mn",null,"2")])],-1))]),t[113]||(t[113]=h(" et donc tout les points sont consid\xe9r\xe9s comme appartenant \xe0 l'ensemble.",-1))]),t[347]||(t[347]=n("p",null,"A des niveaux de zoom tr\xe8s \xe9lev\xe9s, l\xe0 o\xf9 les motifs sont les plus int\xe9ressants, il peut \xeatre n\xe9cessaire d'effectuer des milliers, voire des millions d'it\xe9rations par pixel.",-1)),t[348]||(t[348]=n("p",null,"Voici un exemple de rendu typique que l'on peut obtenir avec des calculs en double pr\xe9cision c\xf4t\xe9 CPU en JavaScript.",-1)),R(f),t[349]||(t[349]=F("",8)),n("p",null,[t[120]||(t[120]=h("C'est-\xe0-dire, que l'on peut repr\xe9senter des nombres allant d'environ ",-1)),n("mjx-container",Zd,[(v(),k("svg",qd,[...t[114]||(t[114]=[F("",1)])])),t[115]||(t[115]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("msup",null,[n("mn",null,"10"),n("mrow",{"data-mjx-texclass":"ORD"},[n("mo",null,"−"),n("mn",null,"38")])])])],-1))]),t[121]||(t[121]=h(" \xe0 ",-1)),n("mjx-container",Jd,[(v(),k("svg",Wd,[...t[116]||(t[116]=[F("",1)])])),t[117]||(t[117]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("msup",null,[n("mn",null,"10"),n("mrow",{"data-mjx-texclass":"ORD"},[n("mn",null,"38")])])])],-1))]),t[122]||(t[122]=h(", mais avec une pr\xe9cision d'environ ",-1)),n("mjx-container",Yd,[(v(),k("svg",Xd,[...t[118]||(t[118]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mn"},[n("path",{"data-c":"37",d:"M55 458Q56 460 72 567L88 674Q88 676 108 676H128V672Q128 662 143 655T195 646T364 644H485V605L417 512Q408 500 387 472T360 435T339 403T319 367T305 330T292 284T284 230T278 162T275 80Q275 66 275 52T274 28V19Q270 2 255 -10T221 -22Q210 -22 200 -19T179 0T168 40Q168 198 265 368Q285 400 349 489L395 552H302Q128 552 119 546Q113 543 108 522T98 479L95 458V455H55V458Z",style:{"stroke-width":"3"}})])])],-1)])])),t[119]||(t[119]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mn",null,"7")])],-1))]),t[123]||(t[123]=h(" chiffres significatifs.",-1))]),n("p",null,[t[126]||(t[126]=h("Par exemple, le nombre ",-1)),n("mjx-container",$d,[(v(),k("svg",Kd,[...t[124]||(t[124]=[F("",1)])])),t[125]||(t[125]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mn",null,"12345.67")])],-1))]),t[127]||(t[127]=h(" peut \xeatre repr\xe9sent\xe9 avec une pr\xe9cision suffisante.",-1))]),n("p",null,[t[134]||(t[134]=h("Il s'agit de ",-1)),n("mjx-container",e0,[(v(),k("svg",t0,[...t[128]||(t[128]=[F("",1)])])),t[129]||(t[129]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mn",null,"1.234567"),n("mo",null,"\xd7"),n("msup",null,[n("mn",null,"10"),n("mn",null,"4")])])],-1))]),t[135]||(t[135]=h(". Ou une mantisse de ",-1)),n("mjx-container",n0,[(v(),k("svg",i0,[...t[130]||(t[130]=[F("",1)])])),t[131]||(t[131]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mn",null,"1.234567")])],-1))]),t[136]||(t[136]=h(" et un exposant de ",-1)),n("mjx-container",a0,[(v(),k("svg",s0,[...t[132]||(t[132]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mn"},[n("path",{"data-c":"34",d:"M462 0Q444 3 333 3Q217 3 199 0H190V46H221Q241 46 248 46T265 48T279 53T286 61Q287 63 287 115V165H28V211L179 442Q332 674 334 675Q336 677 355 677H373L379 671V211H471V165H379V114Q379 73 379 66T385 54Q393 47 442 46H471V0H462ZM293 211V545L74 212L183 211H293Z",style:{"stroke-width":"3"}})])])],-1)])])),t[133]||(t[133]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mn",null,"4")])],-1))]),t[137]||(t[137]=h(".",-1))]),n("p",null,[t[142]||(t[142]=h("Sur le m\xeame principe, on peut repr\xe9senter des nombres tr\xe8s grands comme ",-1)),n("mjx-container",r0,[(v(),k("svg",l0,[...t[138]||(t[138]=[F("",1)])])),t[139]||(t[139]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mn",null,"3.402823"),n("mo",null,"\xd7"),n("msup",null,[n("mn",null,"10"),n("mrow",{"data-mjx-texclass":"ORD"},[n("mn",null,"38")])])])],-1))]),t[143]||(t[143]=h(" ou tr\xe8s petits comme ",-1)),n("mjx-container",o0,[(v(),k("svg",d0,[...t[140]||(t[140]=[F("",1)])])),t[141]||(t[141]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mn",null,"1.175494"),n("mo",null,"\xd7"),n("msup",null,[n("mn",null,"10"),n("mrow",{"data-mjx-texclass":"ORD"},[n("mo",null,"−"),n("mn",null,"38")])])])],-1))]),t[144]||(t[144]=h(".",-1))]),t[350]||(t[350]=n("p",null,"Bien s\xfbr, les flottants ne sont pas repr\xe9sent\xe9s en base 10, mais en base 2, mais le principe est le m\xeame.",-1)),t[351]||(t[351]=n("p",null,"On pourra donc repr\xe9senter des nombres tr\xe8s grands ou tr\xe8s petits, mais avec une pr\xe9cision limit\xe9e.",-1)),t[352]||(t[352]=n("p",null,`On dit que la virgule "flotte" car la position de la virgule varie en fonction de l'exposant.`,-1)),n("p",null,[t[147]||(t[147]=h("Cela implique que l'on a plus de valeur repr\xe9sentable tr\xe8s proche de ",-1)),n("mjx-container",c0,[(v(),k("svg",p0,[...t[145]||(t[145]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mn"},[n("path",{"data-c":"30",d:"M96 585Q152 666 249 666Q297 666 345 640T423 548Q460 465 460 320Q460 165 417 83Q397 41 362 16T301 -15T250 -22Q224 -22 198 -16T137 16T82 83Q39 165 39 320Q39 494 96 585ZM321 597Q291 629 250 629Q208 629 178 597Q153 571 145 525T137 333Q137 175 145 125T181 46Q209 16 250 16Q290 16 318 46Q347 76 354 130T362 333Q362 478 354 524T321 597Z",style:{"stroke-width":"3"}})])])],-1)])])),t[146]||(t[146]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mn",null,"0")])],-1))]),t[148]||(t[148]=h(". Les flottant suivent en effet une distribution logarithmique.",-1))]),t[353]||(t[353]=n("p",null,"Cela implique aussi que l'on ne peut pas additionner deux nombres de mani\xe8re fiable si leur ordre de grandeur est tr\xe8s diff\xe9rent.",-1)),n("p",null,[t[155]||(t[155]=h("Par exemple, si l'on ajoute ",-1)),n("mjx-container",u0,[(v(),k("svg",h0,[...t[149]||(t[149]=[F("",1)])])),t[150]||(t[150]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mn",null,"4.2"),n("mo",null,"\xd7"),n("msup",null,[n("mn",null,"10"),n("mrow",{"data-mjx-texclass":"ORD"},[n("mo",null,"−"),n("mn",null,"3")])])])],-1))]),t[156]||(t[156]=h(" \xe0 ",-1)),n("mjx-container",f0,[(v(),k("svg",m0,[...t[151]||(t[151]=[F("",1)])])),t[152]||(t[152]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mn",null,"4.2"),n("mo",null,"\xd7"),n("msup",null,[n("mn",null,"10"),n("mn",null,"7")])])],-1))]),t[157]||(t[157]=h(", le r\xe9sultat sera ",-1)),n("mjx-container",g0,[(v(),k("svg",_0,[...t[153]||(t[153]=[F("",1)])])),t[154]||(t[154]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mn",null,"4.2"),n("mo",null,"\xd7"),n("msup",null,[n("mn",null,"10"),n("mn",null,"7")])])],-1))]),t[158]||(t[158]=h(".",-1))]),n("p",null,[t[163]||(t[163]=h("En effet, le r\xe9sultat r\xe9el demanderait une pr\xe9cision de ",-1)),n("mjx-container",T0,[(v(),k("svg",b0,[...t[159]||(t[159]=[F("",1)])])),t[160]||(t[160]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mn",null,"10")])],-1))]),t[164]||(t[164]=h(" chiffres significatifs : ",-1)),n("mjx-container",v0,[(v(),k("svg",k0,[...t[161]||(t[161]=[F("",1)])])),t[162]||(t[162]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mn",null,"4200000.0042")])],-1))]),t[165]||(t[165]=h(".",-1))]),n("p",null,[t[168]||(t[168]=h("Ce qui correspond \xe0 la diff\xe9rence entre leurs exposants respectifs : ",-1)),n("mjx-container",Q0,[(v(),k("svg",y0,[...t[166]||(t[166]=[F("",1)])])),t[167]||(t[167]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mn",null,"7"),n("mo",null,"−"),n("mo",{stretchy:"false"},"("),n("mo",null,"−"),n("mn",null,"3"),n("mo",{stretchy:"false"},")"),n("mo",null,"="),n("mn",null,"10")])],-1))]),t[169]||(t[169]=h(".",-1))]),t[354]||(t[354]=n("p",null,"Un flottant en simple pr\xe9cision ne peut donc pas repr\xe9senter ce nombre avec une pr\xe9cision suffisante.",-1)),t[355]||(t[355]=n("h3",{id:"perte-de-precision-lors-du-zoom",tabindex:"-1"},[h("Perte de pr\xe9cision lors du zoom "),n("a",{class:"header-anchor",href:"#perte-de-precision-lors-du-zoom","aria-label":"Permalink to “Perte de pr\xe9cision lors du zoom”"},"​")],-1)),n("p",null,[t[174]||(t[174]=h("Lorsque qu'on calcule chaque point, on utilise une valeur de ",-1)),n("mjx-container",x0,[(v(),k("svg",w0,[...t[170]||(t[170]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mi"},[n("path",{"data-c":"1D450",d:"M34 159Q34 268 120 355T306 442Q362 442 394 418T427 355Q427 326 408 306T360 285Q341 285 330 295T319 325T330 359T352 380T366 386H367Q367 388 361 392T340 400T306 404Q276 404 249 390Q228 381 206 359Q162 315 142 235T121 119Q121 73 147 50Q169 26 205 26H209Q321 26 394 111Q403 121 406 121Q410 121 419 112T429 98T420 83T391 55T346 25T282 0T202 -11Q127 -11 81 37T34 159Z",style:{"stroke-width":"3"}})])])],-1)])])),t[171]||(t[171]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"c")])],-1))]),t[175]||(t[175]=h(" qui correspond \xe0 la position du pixel dans le plan complexe. Quand on est \xe0 un niveau de zoom \xe9lev\xe9, la diff\xe9rence entre les coordonn\xe9es des pixels devient tr\xe8s petite. On va vouloir ajouter un nombre tr\xe8s petit \xe0 un nombre ",-1)),n("mjx-container",E0,[(v(),k("svg",S0,[...t[172]||(t[172]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mi"},[n("path",{"data-c":"1D450",d:"M34 159Q34 268 120 355T306 442Q362 442 394 418T427 355Q427 326 408 306T360 285Q341 285 330 295T319 325T330 359T352 380T366 386H367Q367 388 361 392T340 400T306 404Q276 404 249 390Q228 381 206 359Q162 315 142 235T121 119Q121 73 147 50Q169 26 205 26H209Q321 26 394 111Q403 121 406 121Q410 121 419 112T429 98T420 83T391 55T346 25T282 0T202 -11Q127 -11 81 37T34 159Z",style:{"stroke-width":"3"}})])])],-1)])])),t[173]||(t[173]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"c")])],-1))]),t[176]||(t[176]=h(" (qui repr\xe9sente le centre de l'\xe9cran) potentiellement grand. C'est \xe0 ce moment-l\xe0 que l'on perd de la pr\xe9cision. Car le nombre petit n'a plus d'effet sur le nombre-grand.",-1))]),t[356]||(t[356]=n("p",null,"Sans surprise, on pourra donc atteindre des niveaux de zoom qui correspondent \xe0 la pr\xe9cision des nombres flottants utilis\xe9s.",-1)),n("p",null,[t[181]||(t[181]=h("Pour du simple pr\xe9cision, on pourra atteindre un zoom d'environ ",-1)),n("mjx-container",M0,[(v(),k("svg",L0,[...t[177]||(t[177]=[F("",1)])])),t[178]||(t[178]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("msup",null,[n("mn",null,"10"),n("mrow",{"data-mjx-texclass":"ORD"},[n("mo",null,"−"),n("mn",null,"7")])])])],-1))]),t[182]||(t[182]=h(" et pour du double pr\xe9cision, un zoom d'environ ",-1)),n("mjx-container",A0,[(v(),k("svg",F0,[...t[179]||(t[179]=[F("",1)])])),t[180]||(t[180]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("msup",null,[n("mn",null,"10"),n("mrow",{"data-mjx-texclass":"ORD"},[n("mo",null,"−"),n("mn",null,"15")])])])],-1))]),t[183]||(t[183]=h(".",-1))]),n("p",null,[t[186]||(t[186]=h("On ne se le repr\xe9sente peut-\xeatre pas comme \xe7a, mais en r\xe9alit\xe9 ",-1)),n("mjx-container",C0,[(v(),k("svg",z0,[...t[184]||(t[184]=[F("",1)])])),t[185]||(t[185]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("msup",null,[n("mn",null,"10"),n("mrow",{"data-mjx-texclass":"ORD"},[n("mo",null,"−"),n("mn",null,"7")])])])],-1))]),t[187]||(t[187]=h(" c'est assez vite atteint et l'on se sent vite frustr\xe9 de ne pas pouvoir zoomer plus.",-1))]),t[357]||(t[357]=n("p",null,"Voici ce que \xe7a donne avec des calculs en simple pr\xe9cision, 32 bit.",-1)),t[358]||(t[358]=n("iframe",{width:"688",height:"500",frameborder:"0",style:{"border-radius":"10px"},src:"https://www.shadertoy.com/embed/tXfyDM?gui=false&t=10&paused=false&muted=false",allowfullscreen:""},null,-1)),t[359]||(t[359]=F("",73)),n("mjx-container",D0,[(v(),k("svg",B0,[...t[188]||(t[188]=[F("",1)])])),t[189]||(t[189]=n("mjx-assistive-mml",{unselectable:"on",display:"block",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",overflow:"hidden",width:"100%"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML",display:"block"},[n("mrow",{"data-mjx-texclass":"INNER"},[n("mo",{"data-mjx-texclass":"OPEN"},"{"),n("mtable",{columnalign:"left left",columnspacing:"1em",rowspacing:".2em"},[n("mtr",null,[n("mtd",null,[n("msub",null,[n("mi",null,"z"),n("mn",null,"0")]),n("mo",null,"="),n("mn",null,"0")])]),n("mtr",null,[n("mtd",null,[n("msub",null,[n("mi",null,"z"),n("mn",null,"1")]),n("mo",null,"="),n("msup",null,[n("mrow",{"data-mjx-texclass":"ORD"},[n("msub",null,[n("mi",null,"z"),n("mn",null,"0")])]),n("mn",null,"2")]),n("mo",null,"+"),n("mi",null,"c"),n("mo",null,"="),n("msup",null,[n("mn",null,"0"),n("mn",null,"2")]),n("mo",null,"+"),n("mi",null,"c"),n("mo",null,"="),n("mi",null,"c")])]),n("mtr",null,[n("mtd",null,[n("msub",null,[n("mi",null,"z"),n("mn",null,"3")]),n("mo",null,"="),n("msup",null,[n("mrow",{"data-mjx-texclass":"ORD"},[n("msub",null,[n("mi",null,"z"),n("mn",null,"1")])]),n("mn",null,"2")]),n("mo",null,"+"),n("mi",null,"c"),n("mo",null,"="),n("msup",null,[n("mi",null,"c"),n("mn",null,"2")]),n("mo",null,"+"),n("mi",null,"c")])]),n("mtr",null,[n("mtd",null,[n("msub",null,[n("mi",null,"z"),n("mn",null,"3")]),n("mo",null,"="),n("msup",null,[n("mrow",{"data-mjx-texclass":"ORD"},[n("msub",null,[n("mi",null,"z"),n("mn",null,"2")])]),n("mn",null,"2")]),n("mo",null,"+"),n("mi",null,"c"),n("mo",null,"="),n("mo",{stretchy:"false"},"("),n("msup",null,[n("mi",null,"c"),n("mn",null,"2")]),n("mo",null,"+"),n("mi",null,"c"),n("msup",null,[n("mo",{stretchy:"false"},")"),n("mn",null,"2")]),n("mo",null,"+"),n("mi",null,"c")])]),n("mtr",null,[n("mtd",null,[n("mo",null,"."),n("mo",null,"."),n("mo",null,".")])])]),n("mo",{"data-mjx-texclass":"CLOSE",fence:"true",stretchy:"true",symmetric:"true"})])])],-1))]),n("p",null,[t[194]||(t[194]=h("On remarque que le calcul de ",-1)),n("mjx-container",R0,[(v(),k("svg",V0,[...t[190]||(t[190]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mi"},[n("path",{"data-c":"1D467",d:"M347 338Q337 338 294 349T231 360Q211 360 197 356T174 346T162 335T155 324L153 320Q150 317 138 317Q117 317 117 325Q117 330 120 339Q133 378 163 406T229 440Q241 442 246 442Q271 442 291 425T329 392T367 375Q389 375 411 408T434 441Q435 442 449 442H462Q468 436 468 434Q468 430 463 420T449 399T432 377T418 358L411 349Q368 298 275 214T160 106L148 94L163 93Q185 93 227 82T290 71Q328 71 360 90T402 140Q406 149 409 151T424 153Q443 153 443 143Q443 138 442 134Q425 72 376 31T278 -11Q252 -11 232 6T193 40T155 57Q111 57 76 -3Q70 -11 59 -11H54H41Q35 -5 35 -2Q35 13 93 84Q132 129 225 214T340 322Q352 338 347 338Z",style:{"stroke-width":"3"}})])])],-1)])])),t[191]||(t[191]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"z")])],-1))]),t[195]||(t[195]=h(" peut \xeatre d\xe9finie avec uniquement des termes de ",-1)),n("mjx-container",H0,[(v(),k("svg",P0,[...t[192]||(t[192]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mi"},[n("path",{"data-c":"1D450",d:"M34 159Q34 268 120 355T306 442Q362 442 394 418T427 355Q427 326 408 306T360 285Q341 285 330 295T319 325T330 359T352 380T366 386H367Q367 388 361 392T340 400T306 404Q276 404 249 390Q228 381 206 359Q162 315 142 235T121 119Q121 73 147 50Q169 26 205 26H209Q321 26 394 111Q403 121 406 121Q410 121 419 112T429 98T420 83T391 55T346 25T282 0T202 -11Q127 -11 81 37T34 159Z",style:{"stroke-width":"3"}})])])],-1)])])),t[193]||(t[193]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"c")])],-1))]),t[196]||(t[196]=h(".",-1))]),n("p",null,[t[199]||(t[199]=h("On a aussi constant\xe9 les valeurs de ",-1)),n("mjx-container",I0,[(v(),k("svg",O0,[...t[197]||(t[197]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mi"},[n("path",{"data-c":"1D467",d:"M347 338Q337 338 294 349T231 360Q211 360 197 356T174 346T162 335T155 324L153 320Q150 317 138 317Q117 317 117 325Q117 330 120 339Q133 378 163 406T229 440Q241 442 246 442Q271 442 291 425T329 392T367 375Q389 375 411 408T434 441Q435 442 449 442H462Q468 436 468 434Q468 430 463 420T449 399T432 377T418 358L411 349Q368 298 275 214T160 106L148 94L163 93Q185 93 227 82T290 71Q328 71 360 90T402 140Q406 149 409 151T424 153Q443 153 443 143Q443 138 442 134Q425 72 376 31T278 -11Q252 -11 232 6T193 40T155 57Q111 57 76 -3Q70 -11 59 -11H54H41Q35 -5 35 -2Q35 13 93 84Q132 129 225 214T340 322Q352 338 347 338Z",style:{"stroke-width":"3"}})])])],-1)])])),t[198]||(t[198]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"z")])],-1))]),t[200]||(t[200]=h(" reste dans le m\xeame ordre de grandeur environ avant de diverger rapidement. Elles semblent tourner autour d'un orbit.",-1))]),n("p",null,[t[203]||(t[203]=h("Cela implique donc que pour une valeur ",-1)),n("mjx-container",G0,[(v(),k("svg",N0,[...t[201]||(t[201]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mi"},[n("path",{"data-c":"1D450",d:"M34 159Q34 268 120 355T306 442Q362 442 394 418T427 355Q427 326 408 306T360 285Q341 285 330 295T319 325T330 359T352 380T366 386H367Q367 388 361 392T340 400T306 404Q276 404 249 390Q228 381 206 359Q162 315 142 235T121 119Q121 73 147 50Q169 26 205 26H209Q321 26 394 111Q403 121 406 121Q410 121 419 112T429 98T420 83T391 55T346 25T282 0T202 -11Q127 -11 81 37T34 159Z",style:{"stroke-width":"3"}})])])],-1)])])),t[202]||(t[202]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"c")])],-1))]),t[204]||(t[204]=h(" donn\xe9e, la pr\xe9cision du calcul est plut\xf4t bien conserv\xe9e, m\xeame pour un grand nombre d'it\xe9rations.",-1))]),n("p",null,[t[209]||(t[209]=h("La pr\xe9cision est en fait perdu avant, quand on calcule la valeur de ",-1)),n("mjx-container",U0,[(v(),k("svg",j0,[...t[205]||(t[205]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mi"},[n("path",{"data-c":"1D450",d:"M34 159Q34 268 120 355T306 442Q362 442 394 418T427 355Q427 326 408 306T360 285Q341 285 330 295T319 325T330 359T352 380T366 386H367Q367 388 361 392T340 400T306 404Q276 404 249 390Q228 381 206 359Q162 315 142 235T121 119Q121 73 147 50Q169 26 205 26H209Q321 26 394 111Q403 121 406 121Q410 121 419 112T429 98T420 83T391 55T346 25T282 0T202 -11Q127 -11 81 37T34 159Z",style:{"stroke-width":"3"}})])])],-1)])])),t[206]||(t[206]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"c")])],-1))]),t[210]||(t[210]=h(". Car \xe0 des niveaux de zoom \xe9lev\xe9s, la diff\xe9rence entre les coordonn\xe9es des pixels devient tr\xe8s petite. On va vouloir ajouter un nombre tr\xe8s petit \xe0 un nombre ",-1)),n("mjx-container",Z0,[(v(),k("svg",q0,[...t[207]||(t[207]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mi"},[n("path",{"data-c":"1D450",d:"M34 159Q34 268 120 355T306 442Q362 442 394 418T427 355Q427 326 408 306T360 285Q341 285 330 295T319 325T330 359T352 380T366 386H367Q367 388 361 392T340 400T306 404Q276 404 249 390Q228 381 206 359Q162 315 142 235T121 119Q121 73 147 50Q169 26 205 26H209Q321 26 394 111Q403 121 406 121Q410 121 419 112T429 98T420 83T391 55T346 25T282 0T202 -11Q127 -11 81 37T34 159Z",style:{"stroke-width":"3"}})])])],-1)])])),t[208]||(t[208]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"c")])],-1))]),t[211]||(t[211]=h(" (qui repr\xe9sente le centre de l'\xe9cran) potentiellement grand.",-1))]),n("p",null,[t[216]||(t[216]=h("Ce qu'il faudrait donc c'est avoir de petites valeurs de ",-1)),n("mjx-container",J0,[(v(),k("svg",W0,[...t[212]||(t[212]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mi"},[n("path",{"data-c":"1D450",d:"M34 159Q34 268 120 355T306 442Q362 442 394 418T427 355Q427 326 408 306T360 285Q341 285 330 295T319 325T330 359T352 380T366 386H367Q367 388 361 392T340 400T306 404Q276 404 249 390Q228 381 206 359Q162 315 142 235T121 119Q121 73 147 50Q169 26 205 26H209Q321 26 394 111Q403 121 406 121Q410 121 419 112T429 98T420 83T391 55T346 25T282 0T202 -11Q127 -11 81 37T34 159Z",style:{"stroke-width":"3"}})])])],-1)])])),t[213]||(t[213]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"c")])],-1))]),t[217]||(t[217]=h(". On pourrait donc s'amuser \xe0 zoomer pr\xe8s du point ",-1)),n("mjx-container",Y0,[(v(),k("svg",X0,[...t[214]||(t[214]=[F("",1)])])),t[215]||(t[215]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mo",{stretchy:"false"},"("),n("mn",null,"0"),n("mo",null,","),n("mn",null,"0"),n("mo",{stretchy:"false"},")")])],-1))]),t[218]||(t[218]=h(". Mais il ne pr\xe9sente aucun int\xe9r\xeat puisque ce point appartient \xe0 l'ensemble. L'\xe9cran serait tout noir.",-1))]),t[360]||(t[360]=n("p",null,"C'est \xe0 ce moment qu'on peut faire intervenir la th\xe9orie de la perturbation.",-1)),t[361]||(t[361]=n("p",null,"Il s'agit d'une technique de calcul qui permet de calculer une fonction en utilisant une approximation autour d'un point de r\xe9f\xe9rence.",-1)),t[362]||(t[362]=n("p",null,"La th\xe9orie explique que l'on peut calculer avec un bon degr\xe9 de pr\xe9cision un ph\xe9nom\xe8ne physique, dans notre cas une formule math\xe9matique abstraite, en utilisant le r\xe9sultat d'un calcul proche de la situation que l'on cherche \xe0 mod\xe9liser, appel\xe9 le point de r\xe9f\xe9rence, et en ajoutant une petite perturbation, c'est-\xe0-dire une petite diff\xe9rence entre le point de r\xe9f\xe9rence et le point que l'on cherche \xe0 calculer.",-1)),t[363]||(t[363]=n("p",null,"Cette technique est tr\xe8s utilis\xe9e en physique quantique, car elle permet de calculer des r\xe9sultats qui seraient parfaitement incalculables autrement. Dans le cas de la physique quantique, le calcul est rendu bien plus simple gr\xe2ce \xe0 la formule approxim\xe9e. L'enjeu de la technique dans ce cas est de trouver un point de r\xe9f\xe9rence lequel le calcul est simple et proche de la situation que l'on cherche \xe0 mod\xe9liser. Les perturbations sont souvent tr\xe8s petites et \xe9galement simples \xe0 calculer.",-1)),n("p",null,[t[221]||(t[221]=h("Dans notre cas, l'id\xe9e g\xe9n\xe9rale d'utiliser cette m\xe9thode d'approximation est d'obtenir une formule avec des valeurs de ",-1)),n("mjx-container",$0,[(v(),k("svg",K0,[...t[219]||(t[219]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mi"},[n("path",{"data-c":"1D450",d:"M34 159Q34 268 120 355T306 442Q362 442 394 418T427 355Q427 326 408 306T360 285Q341 285 330 295T319 325T330 359T352 380T366 386H367Q367 388 361 392T340 400T306 404Q276 404 249 390Q228 381 206 359Q162 315 142 235T121 119Q121 73 147 50Q169 26 205 26H209Q321 26 394 111Q403 121 406 121Q410 121 419 112T429 98T420 83T391 55T346 25T282 0T202 -11Q127 -11 81 37T34 159Z",style:{"stroke-width":"3"}})])])],-1)])])),t[220]||(t[220]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"c")])],-1))]),t[222]||(t[222]=h(" petites.",-1))]),t[364]||(t[364]=n("p",null,"\xc7a tombe bien, c'est exactement ce qu'il se passe quand on applique la technique de la th\xe9orie de la perturbation \xe0 la formule du fractal de Mandelbrot !",-1)),n("p",null,[t[229]||(t[229]=h("Il existe d'ailleurs plusieurs fa\xe7ons d'obtenir une approximation de la formule avec cette m\xe9thode. Dans tous les cas, l'id\xe9e est que la valeur ",-1)),n("mjx-container",e4,[(v(),k("svg",t4,[...t[223]||(t[223]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mi"},[n("path",{"data-c":"1D450",d:"M34 159Q34 268 120 355T306 442Q362 442 394 418T427 355Q427 326 408 306T360 285Q341 285 330 295T319 325T330 359T352 380T366 386H367Q367 388 361 392T340 400T306 404Q276 404 249 390Q228 381 206 359Q162 315 142 235T121 119Q121 73 147 50Q169 26 205 26H209Q321 26 394 111Q403 121 406 121Q410 121 419 112T429 98T420 83T391 55T346 25T282 0T202 -11Q127 -11 81 37T34 159Z",style:{"stroke-width":"3"}})])])],-1)])])),t[224]||(t[224]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"c")])],-1))]),t[230]||(t[230]=h(" utilis\xe9e dans la formule se transforme en une valeur qui est \xe9gale au ",-1)),n("mjx-container",n4,[(v(),k("svg",i4,[...t[225]||(t[225]=[F("",1)])])),t[226]||(t[226]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"δ"),n("mi",null,"c")])],-1))]),t[231]||(t[231]=h(" entre la valeur une valeur de r\xe9f\xe9rence et le point que l'on cherche \xe0 calculer, appeler une perturbation. Si notre r\xe9f\xe9rence est proche du point calcul\xe9, ou perturbation, alors cette valeur ",-1)),n("mjx-container",a4,[(v(),k("svg",s4,[...t[227]||(t[227]=[F("",1)])])),t[228]||(t[228]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"δ"),n("mi",null,"c")])],-1))]),t[232]||(t[232]=h(" sera petite.",-1))]),t[365]||(t[365]=F("",11)),n("p",null,[t[237]||(t[237]=h("Voici un exemple de code source Rust qui calcule la valeur de ",-1)),n("mjx-container",r4,[(v(),k("svg",l4,[...t[233]||(t[233]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mi"},[n("path",{"data-c":"1D467",d:"M347 338Q337 338 294 349T231 360Q211 360 197 356T174 346T162 335T155 324L153 320Q150 317 138 317Q117 317 117 325Q117 330 120 339Q133 378 163 406T229 440Q241 442 246 442Q271 442 291 425T329 392T367 375Q389 375 411 408T434 441Q435 442 449 442H462Q468 436 468 434Q468 430 463 420T449 399T432 377T418 358L411 349Q368 298 275 214T160 106L148 94L163 93Q185 93 227 82T290 71Q328 71 360 90T402 140Q406 149 409 151T424 153Q443 153 443 143Q443 138 442 134Q425 72 376 31T278 -11Q252 -11 232 6T193 40T155 57Q111 57 76 -3Q70 -11 59 -11H54H41Q35 -5 35 -2Q35 13 93 84Q132 129 225 214T340 322Q352 338 347 338Z",style:{"stroke-width":"3"}})])])],-1)])])),t[234]||(t[234]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"z")])],-1))]),t[238]||(t[238]=h(" pour un point ",-1)),n("mjx-container",o4,[(v(),k("svg",d4,[...t[235]||(t[235]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mi"},[n("path",{"data-c":"1D450",d:"M34 159Q34 268 120 355T306 442Q362 442 394 418T427 355Q427 326 408 306T360 285Q341 285 330 295T319 325T330 359T352 380T366 386H367Q367 388 361 392T340 400T306 404Q276 404 249 390Q228 381 206 359Q162 315 142 235T121 119Q121 73 147 50Q169 26 205 26H209Q321 26 394 111Q403 121 406 121Q410 121 419 112T429 98T420 83T391 55T346 25T282 0T202 -11Q127 -11 81 37T34 159Z",style:{"stroke-width":"3"}})])])],-1)])])),t[236]||(t[236]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"c")])],-1))]),t[239]||(t[239]=h(" donn\xe9 avec une pr\xe9cision arbitraire.",-1))]),t[366]||(t[366]=F("",7)),n("p",null,[t[242]||(t[242]=h("Avec cette technique seule, on peut approcher des valeurs de zoom proche de valeur possible avec un flottant en simple pr\xe9cision. C'est-\xe0-dire environ ",-1)),n("mjx-container",c4,[(v(),k("svg",p4,[...t[240]||(t[240]=[F("",1)])])),t[241]||(t[241]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("msup",null,[n("mn",null,"10"),n("mrow",{"data-mjx-texclass":"ORD"},[n("mo",null,"−"),n("mn",null,"38")])])])],-1))]),t[243]||(t[243]=h(". Puisque ce n'est plus la pr\xe9cision qui limite le calcul, mais la taille de l'exposant.",-1))]),n("p",null,[t[246]||(t[246]=h("C'est d\xe9j\xe0 bien plus que ce que l'on pourrait faire m\xeame avec des flottants en double pr\xe9cision, puisque la pr\xe9cision est conserv\xe9e jusqu'\xe0 environ ",-1)),n("mjx-container",u4,[(v(),k("svg",h4,[...t[244]||(t[244]=[F("",1)])])),t[245]||(t[245]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("msup",null,[n("mn",null,"10"),n("mrow",{"data-mjx-texclass":"ORD"},[n("mo",null,"−"),n("mn",null,"15")])])])],-1))]),t[247]||(t[247]=h(".",-1))]),t[367]||(t[367]=n("h4",{id:"piste-d-amelioration",tabindex:"-1"},[h("Piste d'am\xe9lioration "),n("a",{class:"header-anchor",href:"#piste-d-amelioration","aria-label":"Permalink to “Piste d'am\xe9lioration”"},"​")],-1)),t[368]||(t[368]=n("p",null,"Il existe plusieurs pistes d'am\xe9lioration pour aller encore plus loin.",-1)),t[369]||(t[369]=n("h5",{id:"combinaison-avec-les-floatexp",tabindex:"-1"},[h("Combinaison avec les floatExp "),n("a",{class:"header-anchor",href:"#combinaison-avec-les-floatexp","aria-label":"Permalink to “Combinaison avec les floatExp”"},"​")],-1)),n("p",null,[t[250]||(t[250]=h("Mais on peut faire encore mieux en combinant cette technique avec celle des floatExp. Avec ces derniers, on peut esp\xe9rer atteindre des valeurs de zoom de l'ordre de ",-1)),n("mjx-container",f4,[(v(),k("svg",m4,[...t[248]||(t[248]=[F("",1)])])),t[249]||(t[249]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("msup",null,[n("mn",null,"10"),n("mrow",{"data-mjx-texclass":"ORD"},[n("mo",null,"−"),n("mn",null,"1300")])])])],-1))]),t[251]||(t[251]=h(".",-1))]),t[370]||(t[370]=n("p",null,"La p\xe9nalit\xe9 de performance est d'environ un facteur 10 par rapport \xe0 un calcul en simple pr\xe9cision, ce qui est tr\xe8s raisonnable.",-1)),t[371]||(t[371]=n("p",null,"Cette fonctionnalit\xe9 peut \xeatre activ\xe9e \xe0 la vol\xe9e en fonction du niveau de zoom.",-1)),t[372]||(t[372]=n("p",null,"Par ailleurs, il faut noter qu'\xe0 de tels niveaux de zoom, c'est vraiment le nombre d'it\xe9rations qui devient le facteur limitant.",-1)),t[373]||(t[373]=n("h5",{id:"amelioration-de-la-performance-grace-a-d-autres-techniques-d-approximation",tabindex:"-1"},[h("Am\xe9lioration de la performance gr\xe2ce \xe0 d'autres techniques d'approximation "),n("a",{class:"header-anchor",href:"#amelioration-de-la-performance-grace-a-d-autres-techniques-d-approximation","aria-label":"Permalink to “Am\xe9lioration de la performance gr\xe2ce \xe0 d'autres techniques d'approximation”"},"​")],-1)),t[374]||(t[374]=n("p",null,"Il existe une autre technique d'approximation compl\xe9mentaire qui permettent de gagner en performance.",-1)),n("p",null,[t[256]||(t[256]=h("Cette m\xe9thode qui permet de calculer ",-1)),n("mjx-container",g4,[(v(),k("svg",_4,[...t[252]||(t[252]=[F("",1)])])),t[253]||(t[253]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mrow",{"data-mjx-texclass":"ORD"},[n("mi",{"data-mjx-variant":"-tex-calligraphic",mathvariant:"script"},"O")]),n("mo",{stretchy:"false"},"("),n("mi",null,"log"),n("mo",{"data-mjx-texclass":"NONE"},"⁡"),n("mrow",{"data-mjx-texclass":"ORD"},[n("mi",null,"n")]),n("mo",{stretchy:"false"},")")])],-1))]),t[257]||(t[257]=h(" it\xe9rations au lieu de ",-1)),n("mjx-container",T4,[(v(),k("svg",b4,[...t[254]||(t[254]=[F("",1)])])),t[255]||(t[255]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mrow",{"data-mjx-texclass":"ORD"},[n("mi",{"data-mjx-variant":"-tex-calligraphic",mathvariant:"script"},"O")]),n("mo",{stretchy:"false"},"("),n("mi",null,"n"),n("mo",{stretchy:"false"},")")])],-1))]),t[258]||(t[258]=h(" dans la plupart des cas.",-1))]),n("p",null,[t[263]||(t[263]=h("Cette technique se base \xe9galement sur les it\xe9rations pr\xe9-calcul\xe9es du point de r\xe9f\xe9rence. Sauf que plutot que ce calculer les valeurs de ",-1)),n("mjx-container",v4,[(v(),k("svg",k4,[...t[259]||(t[259]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mi"},[n("path",{"data-c":"1D467",d:"M347 338Q337 338 294 349T231 360Q211 360 197 356T174 346T162 335T155 324L153 320Q150 317 138 317Q117 317 117 325Q117 330 120 339Q133 378 163 406T229 440Q241 442 246 442Q271 442 291 425T329 392T367 375Q389 375 411 408T434 441Q435 442 449 442H462Q468 436 468 434Q468 430 463 420T449 399T432 377T418 358L411 349Q368 298 275 214T160 106L148 94L163 93Q185 93 227 82T290 71Q328 71 360 90T402 140Q406 149 409 151T424 153Q443 153 443 143Q443 138 442 134Q425 72 376 31T278 -11Q252 -11 232 6T193 40T155 57Q111 57 76 -3Q70 -11 59 -11H54H41Q35 -5 35 -2Q35 13 93 84Q132 129 225 214T340 322Q352 338 347 338Z",style:{"stroke-width":"3"}})])])],-1)])])),t[260]||(t[260]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"z")])],-1))]),t[264]||(t[264]=h(", on calcule les coefficients d'une approximation lin\xe9aire bivari\xe9e qui est une approximation lin\xe9aire de la fonction ",-1)),n("mjx-container",Q4,[(v(),k("svg",y4,[...t[261]||(t[261]=[F("",1)])])),t[262]||(t[262]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"f"),n("mo",{stretchy:"false"},"("),n("mi",null,"z"),n("mo",{stretchy:"false"},")"),n("mo",null,"="),n("msup",null,[n("mi",null,"z"),n("mn",null,"2")]),n("mo",null,"+"),n("mi",null,"c")])],-1))]),t[265]||(t[265]=h(" autour du point de r\xe9f\xe9rence.",-1))]),t[375]||(t[375]=F("",19)),n("p",null,[t[268]||(t[268]=h("On peut calculer la d\xe9riv\xe9e de la fonction ",-1)),n("mjx-container",x4,[(v(),k("svg",w4,[...t[266]||(t[266]=[F("",1)])])),t[267]||(t[267]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"f"),n("mo",{stretchy:"false"},"("),n("mi",null,"z"),n("mo",{stretchy:"false"},")"),n("mo",null,"="),n("msup",null,[n("mi",null,"z"),n("mn",null,"2")]),n("mo",null,"+"),n("mi",null,"c")])],-1))]),t[269]||(t[269]=h(" en m\xeame temps que l'on calcule les it\xe9rations. Cela permet d'obtenir des informations suppl\xe9mentaires sur la vitesse de divergence de la fonction. On peut utiliser cette information pour faire un rendu plus int\xe9ressant.",-1))]),t[376]||(t[376]=n("h4",{id:"blinn-phong",tabindex:"-1"},[h("Blinn-Phong "),n("a",{class:"header-anchor",href:"#blinn-phong","aria-label":"Permalink to “Blinn-Phong”"},"​")],-1)),t[377]||(t[377]=n("p",null,"Sans couleur",-1)),R(c,null,{default:ae(()=>[R(xe,{scale:"1.1",angle:0,cx:"-0.75",cy:"0.0",activatePalette:!1,activateSkybox:!1,activateTessellation:!1,activateWebcam:!1,activateSmoothness:!0,activateShading:!0})]),_:1}),t[378]||(t[378]=n("p",null,"Avec coloration",-1)),R(c,null,{default:ae(()=>[R(xe,{scale:"1.1",angle:0,cx:"-0.75",cy:"0.0",activatePalette:!0,activateSkybox:!1,activateTessellation:!1,activateWebcam:!1,activateSmoothness:!0,activateShading:!0})]),_:1}),t[379]||(t[379]=n("h4",{id:"effet-metalise",tabindex:"-1"},[h("Effet m\xe9talis\xe9 "),n("a",{class:"header-anchor",href:"#effet-metalise","aria-label":"Permalink to “Effet m\xe9talis\xe9”"},"​")],-1)),R(c,null,{default:ae(()=>[R(xe,{scale:"1.1",angle:0,cx:"-0.75",cy:"0.0",activatePalette:!0,activateSkybox:!0,activateTessellation:!1,activateWebcam:!1,activateSmoothness:!0,activateShading:!0})]),_:1}),t[380]||(t[380]=n("h3",{id:"proejction-de-texture",tabindex:"-1"},[h("Proejction de texture "),n("a",{class:"header-anchor",href:"#proejction-de-texture","aria-label":"Permalink to “Proejction de texture”"},"​")],-1)),t[381]||(t[381]=n("h4",{id:"avec-la-valeur-de-l-iteration",tabindex:"-1"},[h("Avec la valeur de l'it\xe9ration "),n("a",{class:"header-anchor",href:"#avec-la-valeur-de-l-iteration","aria-label":"Permalink to “Avec la valeur de l'it\xe9ration”"},"​")],-1)),R(c,null,{default:ae(()=>[R(xe,{scale:"1.1",angle:0,cx:"-0.75",cy:"0.0",activatePalette:!1,activateSkybox:!1,activateTessellation:!0,activateWebcam:!1,activateSmoothness:!0,activateShading:!1})]),_:1}),t[382]||(t[382]=n("h4",{id:"on-combine-les-techniques",tabindex:"-1"},[h("On combine les techniques "),n("a",{class:"header-anchor",href:"#on-combine-les-techniques","aria-label":"Permalink to “On combine les techniques”"},"​")],-1)),R(c,null,{default:ae(()=>[R(xe,{scale:"0.000000000000000000642",angle:0,cx:"-1.96073372544489379646644117402733286402",cy:"0.00000000000000000000012522204221311455",mu:"4.0",palettePeriod:"10",activatePalette:!0,activateZebra:!0,activateSkybox:!0,activateTessellation:!1,activateWebcam:!1,activateSmoothness:!1,activateShading:!0})]),_:1}),t[383]||(t[383]=n("h3",{id:"un-mot-sur-les-couleurs",tabindex:"-1"},[h("Un mot sur les couleurs "),n("a",{class:"header-anchor",href:"#un-mot-sur-les-couleurs","aria-label":"Permalink to “Un mot sur les couleurs”"},"​")],-1)),t[384]||(t[384]=n("h4",{id:"palettes-cycliques",tabindex:"-1"},[h("Palettes cycliques "),n("a",{class:"header-anchor",href:"#palettes-cycliques","aria-label":"Permalink to “Palettes cycliques”"},"​")],-1)),t[385]||(t[385]=n("p",null,"La coloration de l'ensemble de Mandelbrot repose sur une palette de couleurs qui est appliqu\xe9e de mani\xe8re cyclique.",-1)),n("p",null,[t[274]||(t[274]=h("Une palette est d\xe9finie par une s\xe9rie de ",-1)),t[275]||(t[275]=n("em",null,"color stops",-1)),t[276]||(t[276]=h(" : des paires ",-1)),t[277]||(t[277]=n("code",null,"(couleur, position)",-1)),t[278]||(t[278]=h(" r\xe9parties le long d'un axe allant de ",-1)),n("mjx-container",E4,[(v(),k("svg",S4,[...t[270]||(t[270]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mn"},[n("path",{"data-c":"30",d:"M96 585Q152 666 249 666Q297 666 345 640T423 548Q460 465 460 320Q460 165 417 83Q397 41 362 16T301 -15T250 -22Q224 -22 198 -16T137 16T82 83Q39 165 39 320Q39 494 96 585ZM321 597Q291 629 250 629Q208 629 178 597Q153 571 145 525T137 333Q137 175 145 125T181 46Q209 16 250 16Q290 16 318 46Q347 76 354 130T362 333Q362 478 354 524T321 597Z",style:{"stroke-width":"3"}})])])],-1)])])),t[271]||(t[271]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mn",null,"0")])],-1))]),t[279]||(t[279]=h(" \xe0 ",-1)),n("mjx-container",M4,[(v(),k("svg",L4,[...t[272]||(t[272]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mn"},[n("path",{"data-c":"31",d:"M213 578L200 573Q186 568 160 563T102 556H83V602H102Q149 604 189 617T245 641T273 663Q275 666 285 666Q294 666 302 660V361L303 61Q310 54 315 52T339 48T401 46H427V0H416Q395 3 257 3Q121 3 100 0H88V46H114Q136 46 152 46T177 47T193 50T201 52T207 57T213 61V578Z",style:{"stroke-width":"3"}})])])],-1)])])),t[273]||(t[273]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mn",null,"1")])],-1))]),t[280]||(t[280]=h(". Entre chaque stop, les couleurs sont interpol\xe9es pour former un d\xe9grad\xe9 continu.",-1))]),n("p",null,[t[283]||(t[283]=h("C\xf4t\xe9 code, la classe ",-1)),t[284]||(t[284]=n("code",null,"Palette",-1)),t[285]||(t[285]=h(" (dans ",-1)),t[286]||(t[286]=n("code",null,"Palette.ts",-1)),t[287]||(t[287]=h(") prend un tableau de color stops, les trie par position, puis utilise une fonction d'interpolation de la biblioth\xe8que ",-1)),t[288]||(t[288]=n("em",null,"d3-interpolate",-1)),t[289]||(t[289]=h(" pour calculer la couleur en n'importe quel point ",-1)),n("mjx-container",A4,[(v(),k("svg",F4,[...t[281]||(t[281]=[F("",1)])])),t[282]||(t[282]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"t"),n("mo",null,"∈"),n("mo",{stretchy:"false"},"["),n("mn",null,"0"),n("mo",null,","),n("mn",null,"1"),n("mo",{stretchy:"false"},"]")])],-1))]),t[290]||(t[290]=h(".",-1))]),n("p",null,[t[295]||(t[295]=h("La m\xe9thode ",-1)),t[296]||(t[296]=n("code",null,"generateTexture()",-1)),t[297]||(t[297]=h(" \xe9chantillonne ce d\xe9grad\xe9 en ",-1)),n("mjx-container",C4,[(v(),k("svg",z4,[...t[291]||(t[291]=[F("",1)])])),t[292]||(t[292]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mn",null,"4096")])],-1))]),t[298]||(t[298]=h(" points et produit une ",-1)),t[299]||(t[299]=n("code",null,"ImageData",-1)),t[300]||(t[300]=h(" de ",-1)),n("mjx-container",D4,[(v(),k("svg",B4,[...t[293]||(t[293]=[F("",1)])])),t[294]||(t[294]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mn",null,"4096"),n("mo",null,"\xd7"),n("mn",null,"1")])],-1))]),t[301]||(t[301]=h(" pixels (RGBA). Cette image est ensuite envoy\xe9e au GPU sous forme de texture 1D.",-1))]),t[386]||(t[386]=n("p",null,[h("C\xf4t\xe9 shader (dans "),n("code",null,"color.wgsl"),h("), la palette est \xe9chantillonn\xe9e de mani\xe8re cyclique gr\xe2ce \xe0 la formule :")],-1)),n("mjx-container",R4,[(v(),k("svg",V4,[...t[302]||(t[302]=[F("",1)])])),t[303]||(t[303]=n("mjx-assistive-mml",{unselectable:"on",display:"block",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",overflow:"hidden",width:"100%"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML",display:"block"},[n("mtext",null,"palettePhase"),n("mo",null,"="),n("mtext",null,"fract"),n("mrow",{"data-mjx-texclass":"INNER"},[n("mo",{"data-mjx-texclass":"OPEN"},"("),n("mfrac",null,[n("mi",null,"ν"),n("mtext",null,"palettePeriod")]),n("mo",null,"+"),n("mtext",null,"paletteOffset"),n("mo",{"data-mjx-texclass":"CLOSE"},")")])])],-1))]),n("p",null,[t[308]||(t[308]=h("o\xf9 ",-1)),n("mjx-container",H4,[(v(),k("svg",P4,[...t[304]||(t[304]=[n("g",{stroke:"currentColor",fill:"currentColor","stroke-width":"0",transform:"scale(1,-1)"},[n("g",{"data-mml-node":"math"},[n("g",{"data-mml-node":"mi"},[n("path",{"data-c":"1D708",d:"M74 431Q75 431 146 436T219 442Q231 442 231 434Q231 428 185 241L137 51H140L150 55Q161 59 177 67T214 86T261 119T312 165Q410 264 445 394Q458 442 496 442Q509 442 519 434T530 411Q530 390 516 352T469 262T388 162T267 70T106 5Q81 -2 71 -2Q66 -2 59 -1T51 1Q45 5 45 11Q45 13 88 188L132 364Q133 377 125 380T86 385H65Q59 391 59 393T61 412Q65 431 74 431Z",style:{"stroke-width":"3"}})])])],-1)])])),t[305]||(t[305]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mi",null,"ν")])],-1))]),t[309]||(t[309]=h(" est la valeur liss\xe9e du nombre d'it\xe9rations (normalis\xe9e par ",-1)),n("mjx-container",I4,[(v(),k("svg",O4,[...t[306]||(t[306]=[F("",1)])])),t[307]||(t[307]=n("mjx-assistive-mml",{unselectable:"on",display:"inline",style:{top:"0px",left:"0px",clip:"rect(1px, 1px, 1px, 1px)","-webkit-touch-callout":"none","-webkit-user-select":"none","-khtml-user-select":"none","-moz-user-select":"none","-ms-user-select":"none","user-select":"none",position:"absolute",padding:"1px 0px 0px 0px",border:"0px",display:"block",width:"auto",overflow:"hidden"}},[n("math",{xmlns:"http://www.w3.org/1998/Math/MathML"},[n("mn",null,"256")])],-1))]),t[310]||(t[310]=h("). La fonction ",-1)),t[311]||(t[311]=n("code",null,"fract",-1)),t[312]||(t[312]=h(" ne conserve que la partie fractionnaire, ce qui rend la palette cyclique : elle se r\xe9p\xe8te naturellement quelle que soit l'\xe9tendue des valeurs d'it\xe9ration.",-1))]),t[387]||(t[387]=F("",8))])}}})})();export{j4 as __pageData,Z4 as default,__tla};