// Fused brush + mandelbrot + count compute pass, working IN PLACE on the
// neutral texture A (rawTexture) via a read_write storage texture — the
// SINGLE production iteration path. Pan/clear frames are prepared by the
// reproject_cs utility pass (ping-pong A→B) in the same frame.
//
// The kernel implements exact perturbation and affine BLA only (shallow f32
// and deep floatexp). Earlier builds carried Padé / jet / Möbius / Auto tiers,
// validity certificates, periodic-interior detection and work counters in one
// kernel whose register footprint mobile Vulkan drivers refused outright
// (VK_ERROR_INITIALIZATION_FAILED at CreateComputePipelines); they are gone.
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
//   9..12 : z″ state (in-progress) / z′, z″ polar-log payload (escaped)
//  13/14 : grad(stripe EMA).x/.y            — allocated only while orbit
//  15/16 : grad(direction coherence).x/.y     metrics are tracked
//     17 : deep path only: packed average orbit direction
//
// Pixel state (iter-only):
//   iter == -1                  : exact step-1 request
//   iter == 0                   : confirmed inside the set
//   iter > 0  AND  |z|² >= mu   : escaped
//   iter > 0  AND  |z|² < mu    : budget exhausted → continuation

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
  epsilon: f32,         // unused here (interior ε test is disabled)
  antialiasLevel: f32,
  iterationOffset: f32,
  globalMaxIter: f32,   // total iteration target for the current view
  orbitComplete: f32,   // 1.0 = orbit fully built, 0.0 = still building
  approximationMode: f32, // 0 = exact perturbation, 1 = affine BLA; anything else runs exact
  blaLevelCount: f32,
  blaEpsilon: f32,
  stripeFrequency: f32,
  trackOrbitMetrics: f32,
  scaleExp: f32,        // floatexp deep path: shared base-2 exponent for scale & cx/cy
  aaOffsetX: f32,       // sub-pixel AA jitter, neutral-space units (0 = off)
  aaOffsetY: f32,
  orbitTrapMode: f32,   // 0 off, 1 terminal, 2 sampled, 3 exact
  orbitTrapCenterX: f32,
  orbitTrapCenterY: f32,
  orbitTrapScale: f32,
  orbitTrapRotation: f32,
  orbitTrapAnisotropyX: f32,
  orbitTrapAnisotropyY: f32,
  orbitTrapPetals: f32,
  orbitTrapPetalDepth: f32,
  orbitTrapTwist: f32,
  orbitTrapPhase: f32,
  orbitTrapStartIteration: f32,
  orbitTrapEndIteration: f32,
  _orbitTrapPad0: f32,
  _orbitTrapPad1: f32,
  _orbitTrapPad2: f32,
};

// floatexp deep-zoom threshold (base-2 exponent of scale). Below this the shader
// switches to the extended-exponent (fe) path, before f32 precision degrades
// approaching the underflow wall. Mirror of Engine.DEEP_EXP_THRESHOLD.
const DEEP_EXP: i32 = -100;
const LN2: f32 = 0.6931471805599453;

// Pipeline-specialization override. When false, the driver dead-code-eliminates
// the entire floatexp deep-zoom subtree, shrinking register pressure for the
// shallow kernel used across the interactive range (scaleExp > DEEP_EXP).
override ENABLE_DEEP: bool = true;

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
  // Origin of the dispatched region, in texels, workgroup-aligned (the host
  // dispatches the viewport's bounding box inside the neutral square).
  dispatchOriginX: f32,
  dispatchOriginY: f32,
  copyLayerCount: f32, // reproject_cs only
  reprojectMu: f32,    // reproject_cs only
  workCounterShift: f32,
  // Toroidal origin of the raw texture, in texels (see raw_coord()).
  rawOriginX: f32,
  rawOriginY: f32,
  // Logical tile position in the full neutral square. Monolithic rendering
  // uses (0, 0, texture width), so both paths execute the same projection.
  tileOriginX: f32,
  tileOriginY: f32,
  neutralSide: f32,
  rotationUnion: f32,
  // Direct ExpMap producer. The first 16 fields keep the utility-pass ABI.
  expmapMode: f32,
  expmapWidth: f32,
  expmapHeight: f32,
  expmapX0: f32,
  expmapY0: f32,
  expmapAngularSamples: f32,
  expmapRhoStep: f32,
  expmapTailStep: f32,
  expmapTailIntervals: f32,
  expmapDensity: f32,
  expmapCenterHalf: f32,
  expmapPad: f32,
};

struct CounterBuffer {
  count: atomic<u32>,
  weightedWork: atomic<u32>,
  // Sum of unfinished scheduling weights in eighth-pixel units. Without the
  // periodic scheduling heuristic every unfinished texel weighs 8.
  effectiveCountEighths: atomic<u32>,
  throttledCount: atomic<u32>,
};

@group(0) @binding(0) var<uniform> mandelbrot: Mandelbrot;
@group(0) @binding(1) var<storage, read> mandelbrotOrbitPointSuite: array<MandelbrotStep>;
@group(0) @binding(2) var<storage, read> mandelbrotBlaSuite: array<BlaStep>;
@group(0) @binding(3) var<storage, read> mandelbrotBlaLevels: array<BlaLevel>;
@group(0) @binding(4) var raw: texture_storage_2d_array<r32float, read_write>;
@group(0) @binding(5) var<uniform> brush: BrushUniforms;
@group(0) @binding(6) var<storage, read_write> counter: CounterBuffer;

const PERIODIC_WEIGHT_FULL: u32 = 8u;

// Per-texel work budget consumed this dispatch (loop turns, with block
// applications weighted by their cost). Reduced per workgroup into
// counter.weightedWork — the batch controller's pacing signal.
var<private> g_workBudget: u32 = 0u;

// ── directed-rounding helpers for the BLA radius certificate ────────
fn validity_pos_inf() -> f32 { return 3.4028234e38; }
fn validity_neg_inf() -> f32 { return -3.4028234e38; }
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

// Directed-rounding affine radius: log2 of the largest |dz| the block accepts
// given |dc|. Every operation is rounded toward rejection, so a dead or
// non-finite Rust bound rejects unconditionally.
fn conservative_affine_radius_log2(alpha: f32, alphaExp: i32, beta: f32, log2Dc: f32, log2Dz: f32) -> f32 {
  let alphaBits = bitcast<u32>(alpha) & 0x7fffffffu;
  let betaBits = bitcast<u32>(beta) & 0x7fffffffu;
  if (!(alpha > 0.0) || alphaBits >= 0x7f800000u
      || !(beta >= 0.0) || betaBits >= 0x7f800000u) {
    return validity_neg_inf();
  }
  // Sufficient dyadic certificate, no transcendental operations:
  // alpha >= 2^a; |dz| <= 2^(a-2), beta*|dc| <= 2^(a-2).
  let ae = (alphaBits >> 23u) & 255u;
  let be = (betaBits >> 23u) & 255u;
  if (ae > 0u && abs(f32(alphaExp)) < 1000000.0 && (beta == 0.0 || be > 0u)) {
    let a = f32(i32(ae) - 127 + alphaExp) - 2.0;
    let bUpper = f32(i32(be) - 126);
    if (log2Dz <= a && (beta == 0.0 || validity_next_up(log2Dc + bUpper) <= a)) {
      return a;
    }
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

fn bla_affine_radius_log2(block: BlaStep, log2Dc: f32, log2Dz: f32) -> f32 {
  return conservative_affine_radius_log2(
    block.radius_alpha,
    block.alpha_exp,
    block.radius_beta,
    log2Dc, log2Dz,
  );
}

// ── complex helpers ─────────────────────────────────────────────────
fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

// Independently scaled complex used for z″: value = m·exp(s), with m
// normalized by max-component. Additions shift only TOWARDS the largest
// scale, so exp() sees non-positive arguments.
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

// z″ ← 2(z′² + z·z″) for one exact step, using the OLD derivative state.
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

// z″ through an affine block Φ(z) = A·z + B·c: z″ ← A·z″ (∂²Φ = 0).
fn snd_apply_affine(
  a: fe,
  snd: ptr<function, vec2<f32>>,
  sndScale: ptr<function, f32>,
) {
  let next = scaled_complex_normalize(cmul(a.m, *snd), f32(a.e) * LN2 + *sndScale);
  *snd = next.m;
  *sndScale = next.s;
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
// value = m · 2^e with one shared integer exponent per complex.
struct fe { m: vec2<f32>, e: i32 };

// Exponent assigned to a zero fe: far below any real scale exponent so a zero
// never dominates fe_add (a fresh dz = 0 must not swallow dc).
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

// ── derivative state der = derM · exp(derS) ────────────────────────
const LOG_DER_ZERO: f32 = -80.0;
const DER_RENORM_HI: f32 = 1e16;
const DER_RENORM_LO: f32 = 1e-16;

// derS accumulates as a compensated (hi, lo) register pair: branchless Knuth
// TwoSum at every update site; lo is register-only, storage keeps hi + lo.
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

// derInvScale = exp(-derS) is the "+1" seed term of the derivative recurrence
// expressed in the mantissa's scale. Refreshed after every scale change.
fn der_refresh_cache(derM: ptr<function, vec2<f32>>, derS: ptr<function, f32>, derSLo: ptr<function, f32>, derInvScale: ptr<function, f32>) {
  var s = *derS + *derSLo;
  if (s < -40.0) {
    *derM = *derM * exp(max(s, -80.0));
    *derS = 0.0;
    *derSLo = 0.0;
    s = 0.0;
  }
  *derInvScale = exp(clamp(-s, -80.0, 80.0));
}

fn der_renormalize(derM: ptr<function, vec2<f32>>, derS: ptr<function, f32>, derSLo: ptr<function, f32>, derInvScale: ptr<function, f32>) {
  let mm = dot(*derM, *derM);
  if (mm > 0.0) {
    let lm = 0.5 * log(mm);
    der_scale_add(derS, derSLo, lm);
    *derM = *derM * exp(-lm);
  }
  der_refresh_cache(derM, derS, derSLo, derInvScale);
}

fn der_to_polar(m: vec2<f32>, s: f32) -> vec2<f32> {
  let mm = dot(m, m);
  if (mm <= 1e-30) {
    return vec2<f32>(0.0, LOG_DER_ZERO);
  }
  return vec2<f32>(atan2(m.y, m.x), s + 0.5 * log(mm));
}

// Private to a compute invocation: every continuation of this texel uses the
// same radial appearance scale (ExpMap producer).
var<private> expmapAppearanceLogScaleOffset: f32 = 0.0;

fn appearance_log_texel_adjustment() -> f32 {
  if (brush.expmapMode < 0.5) { return 0.0; }
  // Preserve the relief gain of the usual 512-square producer, independently
  // of the physical block dimensions.
  let virtualTexel = 2.0 * sqrt(2.0) / 512.0;
  let physicalTexel = 2.0 * sqrt(mandelbrot.aspect * mandelbrot.aspect + 1.0) / brush.neutralSide;
  return expmapAppearanceLogScaleOffset + log(virtualTexel / physicalTexel);
}

fn finite_scalar(value: f32) -> bool {
  let bits = bitcast<u32>(value) & 0x7fffffffu;
  return bits < 0x7f800000u;
}

fn finite_vec2(value: vec2<f32>) -> bool {
  return finite_scalar(value.x) && finite_scalar(value.y);
}

// Exterior distance in SCREEN units, as -log: |z|·ln|z| / (2·|z'|·scale) — the
// Koebe lower bound, deliberately conservative so the AA ramp never
// under-samples. Only meaningful past |z| = 1 (mu is floored at 4 in Settings).
fn distance_height(z: vec2<f32>, derPolar: vec2<f32>) -> f32 {
  let logZ = max(0.5 * log(max(dot(z, z), 1.000002)), 1e-6);
  let logScreenDistance = logZ + log(logZ) - log(2.0) - derPolar.y - log(max(mandelbrot.scale, 1e-30)) - expmapAppearanceLogScaleOffset;
  return select(0.0, -logScreenDistance, finite_scalar(logScreenDistance));
}

// Deep path: mandelbrot.scale holds only the fe mantissa, so log(scale) is
// recomposed from the shared exponent (log(mantissa) + scaleExp·ln2).
fn distance_height_deep(z: vec2<f32>, derPolar: vec2<f32>, scaleExp: i32) -> f32 {
  let logZ = max(0.5 * log(max(dot(z, z), 1.000002)), 1e-6);
  let logScale = log(max(mandelbrot.scale, 1e-30)) + f32(scaleExp) * LN2 + expmapAppearanceLogScaleOffset;
  let logScreenDistance = logZ + log(logZ) - log(2.0) - derPolar.y - logScale;
  return select(0.0, -logScreenDistance, finite_scalar(logScreenDistance));
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
  let logTexelDelta = log(max(mandelbrot.scale, 1e-30))
    + f32(deepScaleExp) * LN2
    + log(2.0 * sqrt(mandelbrot.aspect * mandelbrot.aspect + 1.0) / brush.neutralSide)
    + appearance_log_texel_adjustment();

  let invDer = vec2<f32>(derM.x, -derM.y) / der2;
  let invZ = vec2<f32>(z.x, -z.y) / z2;
  let first = cmul(sndM, invDer)
    * exp(clamp(sndS - derS + logTexelDelta, -80.0, 80.0));
  let second = cmul(derM, invZ)
    * ((1.0 + 1.0 / logZ) * exp(clamp(derS + logTexelDelta, -80.0, 80.0)));
  let gradient = first - second;

  let derivativeLog = derS + 0.5 * log(der2);
  let laplacianLog = 2.0 * (derivativeLog - logZ - log(logZ) + logTexelDelta);
  // Keep numerical exponent protection; visual saturation belongs after view scaling.
  let laplacian = exp(clamp(laplacianLog, -80.0, 80.0));
  if (!finite_vec2(gradient) || !finite_scalar(laplacian)) {
    return vec3<f32>(0.0);
  }
  return vec3<f32>(gradient, laplacian);
}

fn getOrbit(index: i32) -> vec2<f32> {
  return vec2<f32>(
    mandelbrotOrbitPointSuite[index].zx,
    mandelbrotOrbitPointSuite[index].zy,
  );
}

// ── affine BLA, shallow f32 path ────────────────────────────────────
const BLA_F32_EXP_LIMIT: i32 = 120;

fn bla_vec2_is_finite(value: vec2<f32>) -> bool {
  let xBits = bitcast<u32>(value.x) & 0x7fffffffu;
  let yBits = bitcast<u32>(value.y) & 0x7fffffffu;
  return xBits < 0x7f800000u && yBits < 0x7f800000u;
}

fn bla_coefficients_fit_f32(block: BlaStep) -> bool {
  return block.ab_exp >= -BLA_F32_EXP_LIMIT && block.ab_exp <= BLA_F32_EXP_LIMIT;
}

// Applies the derivative and z″ updates shared by both affine paths:
//   z′ ← A·z′ + B  (mantissa-only update, exponent folded into derS)
//   z″ ← A·z″
fn apply_affine_derivatives(
  a: fe, bMantissa: vec2<f32>,
  derM: ptr<function, vec2<f32>>, derS: ptr<function, f32>, derSLo: ptr<function, f32>, derInvScale: ptr<function, f32>,
  snd: ptr<function, vec2<f32>>, sndScale: ptr<function, f32>,
) {
  snd_apply_affine(a, snd, sndScale);
  *derM = cmul(*derM, a.m) + bMantissa * (*derInvScale);
  der_scale_add(derS, derSLo, f32(a.e) * LN2);
  der_refresh_cache(derM, derS, derSLo, derInvScale);
}

// Walks the level directory from the largest aligned skip downward and applies
// the first block whose certified radius accepts the current |dz|. Returns the
// skip, or 0 when no block qualifies.
fn try_apply_bla(ref_i: ptr<function, i32>, dz: ptr<function, vec2<f32>>, derM: ptr<function, vec2<f32>>, derS: ptr<function, f32>, derSLo: ptr<function, f32>, derInvScale: ptr<function, f32>, zOut: ptr<function, vec2<f32>>, dc: vec2<f32>, bailout: f32, skip0Log: i32, maxIterI: i32, snd: ptr<function, vec2<f32>>, sndScale: ptr<function, f32>) -> i32 {
  if (*ref_i <= 0) {
    return 0;
  }
  // dot(dz,dz) flushes to 0 in f32 below |dz| ~ 1e-19 (routine at mid-deep
  // shallow zooms): gate on length() in log2 space. When even length() has
  // underflowed the magnitude test is treated as open — the certified radius
  // test below is what actually validates.
  let dzMag = length(*dz);
  let dzMagTiny = dzMag < 1.2e-38;
  let log2Dc = validity_log2_complex(dc, 0);
  let log2Dz = validity_log2_complex(*dz, 0);
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
        let bla = mandelbrotBlaSuite[i32(levelInfo.offset) + slot];
        let radiusLog2 = bla_affine_radius_log2(bla, log2Dc, log2Dz);
        if (!validity_is_neg_inf(radiusLog2) && log2Dz <= radiusLog2) {
          // ── affine BLA: z ← A·z + B·c ──
          let aMantissa = vec2<f32>(bla.ax, bla.ay);
          let bMantissa = vec2<f32>(bla.bx, bla.by);
          let useF32 = bla_coefficients_fit_f32(bla);
          var candidate = vec2<f32>(0.0);
          if (useF32) {
            let a = ldexp(aMantissa, vec2<i32>(bla.ab_exp));
            let b = ldexp(bMantissa, vec2<i32>(bla.ab_exp));
            candidate = cmul(a, *dz) + cmul(b, dc);
          } else {
            // Large exponents are common even above DEEP_EXP: evaluate in
            // floatexp instead of materializing Inf/0 in f32.
            candidate = fe_to_vec(fe_add(
              fe_cmul(fe(aMantissa, bla.ab_exp), fe_from_vec(*dz, 0)),
              fe_cmul(fe(bMantissa, bla.ab_exp), fe_from_vec(dc, 0)),
            ));
          }
          let candidateZ = getOrbit(*ref_i + skip) + candidate;
          // NaN compares false against bailout, so finiteness is an explicit
          // fail-closed condition before accepting the block.
          if (bla_vec2_is_finite(candidate) && bla_vec2_is_finite(candidateZ)
              && !(skip > 1 && dot(candidateZ, candidateZ) > bailout)) {
            *dz = candidate;
            *zOut = candidateZ;
            apply_affine_derivatives(fe(aMantissa, bla.ab_exp), bMantissa, derM, derS, derSLo, derInvScale, snd, sndScale);
            g_workBudget += select(3u, 1u, useF32);
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

// ── affine BLA, deep floatexp path ──────────────────────────────────
fn try_apply_bla_deep(ref_i: ptr<function, i32>, dz: ptr<function, fe>, derM: ptr<function, vec2<f32>>, derS: ptr<function, f32>, derSLo: ptr<function, f32>, derInvScale: ptr<function, f32>, zOut: ptr<function, vec2<f32>>, dc: fe, bailout: f32, skip0Log: i32, maxIterI: i32, snd: ptr<function, vec2<f32>>, sndScale: ptr<function, f32>) -> i32 {
  if (*ref_i <= 0) {
    return 0;
  }
  let log2_dz = validity_log2_complex((*dz).m, (*dz).e);
  let log2_dc = validity_log2_complex(dc.m, dc.e);
  let shiftedRef = *ref_i - 1;
  var level = min(i32(mandelbrot.blaLevelCount) - 1, i32(countTrailingZeros(u32(shiftedRef))) - skip0Log);
  while (level >= 0) {
    let levelInfo = mandelbrotBlaLevels[level];
    let skip = i32(levelInfo.skip);
    if (*ref_i + skip <= maxIterI) {
      let slot = shiftedRef >> u32(skip0Log + level);
      if (u32(slot) < levelInfo.count) {
        let bla = mandelbrotBlaSuite[i32(levelInfo.offset) + slot];
        let radiusLog2 = bla_affine_radius_log2(bla, log2_dc, log2_dz);
        if (!validity_is_neg_inf(radiusLog2) && log2_dz <= radiusLog2) {
          // ── affine: dz ← A·dz + B·dc ──
          let a = fe(vec2<f32>(bla.ax, bla.ay), bla.ab_exp);
          let bMantissa = vec2<f32>(bla.bx, bla.by);
          let num = fe_add(fe_cmul(a, *dz), fe_cmul(fe(bMantissa, bla.ab_exp), dc));
          let candidateZ = getOrbit(*ref_i + skip) + fe_to_vec(num);
          if (bla_vec2_is_finite(num.m) && bla_vec2_is_finite(candidateZ)
              && !(skip > 1 && dot(candidateZ, candidateZ) > bailout)) {
            *dz = num;
            *zOut = candidateZ;
            apply_affine_derivatives(a, bMantissa, derM, derS, derSLo, derInvScale, snd, sndScale);
            g_workBudget += 3u;
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
  // Analytic AA — layers 9..12, carried by every production path.
  //   in-progress: 9/10 = sndM.x/y, 11 = sndS for z″=sndM·exp(sndS), 12 = validity bit
  //   escaped:     9/10 = derM.x/y (z′ mantissa), 11 = ln|z″|, 12 = arg(z″)
  aa9:  vec4<f32>,
  aa10: vec4<f32>,
  aa11: vec4<f32>,
  aa12: vec4<f32>,
  // Layers 13..16 — written only while orbit metrics are tracked, which is
  // also the only time the engine allocates them.
  orbitGradStripe: vec2<f32>,
  orbitGradCoherence: vec2<f32>,
  // Layer 17 — deep continuations only; the shallow path parks the same value
  // in layer 7 and leaves this at 0 (which reads as "no metrics parked").
  deepAvgDirection: f32,
  // Three adjacent layers, starting at 13 without orbit metrics and at 18
  // with them. A new distance always carries the iteration and angle of that
  // same orbit point.
  trapBestDistance: f32,
  trapHitIteration: f32,
  trapHitAngle: f32,
};

fn pack(v: f32) -> vec4<f32> { return vec4<f32>(v, 0.0, 0.0, 0.0); }

// Logical → physical raw texel (toroidal origin, see BrushUniforms.rawOrigin).
fn raw_coord(coord: vec2<i32>) -> vec2<i32> {
  let dims = vec2<i32>(textureDimensions(raw));
  let origin = vec2<i32>(i32(brush.rawOriginX), i32(brush.rawOriginY));
  return ((coord + origin) % dims + dims) % dims;
}

fn loadLayer(coord: vec2<i32>, layer: i32) -> f32 {
  return textureLoad(raw, raw_coord(coord), layer).r;
}

fn orbit_trap_layer_base() -> i32 {
  return select(13, 18, mandelbrot.trackOrbitMetrics >= 0.5);
}

fn storeTexel(logicalCoord: vec2<i32>, out: TexelOut) {
  let coord = raw_coord(logicalCoord);
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
  if (mandelbrot.trackOrbitMetrics >= 0.5) {
    textureStore(raw, coord, 13, pack(out.orbitGradStripe.x));
    textureStore(raw, coord, 14, pack(out.orbitGradStripe.y));
    textureStore(raw, coord, 15, pack(out.orbitGradCoherence.x));
    textureStore(raw, coord, 16, pack(out.orbitGradCoherence.y));
    textureStore(raw, coord, 17, pack(out.deepAvgDirection));
  }
  if (mandelbrot.orbitTrapMode >= 1.5) {
    let base = orbit_trap_layer_base();
    textureStore(raw, coord, base, pack(out.trapBestDistance));
    textureStore(raw, coord, base + 1, pack(out.trapHitIteration));
    textureStore(raw, coord, base + 2, pack(out.trapHitAngle));
  }
}

// ── orbit trap ──────────────────────────────────────────────────────
struct OrbitTrapState {
  bestDistance: f32,
  hitIteration: f32,
  hitAngle: f32,
};

fn orbit_trap_distance_angle(z: vec2<f32>) -> vec2<f32> {
  let centered = z - vec2<f32>(mandelbrot.orbitTrapCenterX, mandelbrot.orbitTrapCenterY);
  let rotation = mandelbrot.orbitTrapRotation;
  let c = cos(rotation);
  let s = sin(rotation);
  let rotated = vec2<f32>(
    c * centered.x + s * centered.y,
    -s * centered.x + c * centered.y,
  );
  let trapScale = max(mandelbrot.orbitTrapScale, 1e-4);
  let anisotropy = max(
    vec2<f32>(mandelbrot.orbitTrapAnisotropyX, mandelbrot.orbitTrapAnisotropyY),
    vec2<f32>(1e-4),
  );
  let q = rotated / (trapScale * anisotropy);
  let radius = max(length(q), 1e-6);
  let angle = atan2(q.y, q.x);
  let logRadius = log(radius);
  let petals = max(round(mandelbrot.orbitTrapPetals), 1.0);
  let feature = logRadius - mandelbrot.orbitTrapPetalDepth * cos(
    petals * angle + mandelbrot.orbitTrapTwist * logRadius + mandelbrot.orbitTrapPhase,
  );
  return vec2<f32>(abs(feature), angle);
}

fn update_orbit_trap(state: ptr<function, OrbitTrapState>, z: vec2<f32>, iteration: f32) {
  if (mandelbrot.orbitTrapMode < 1.5) { return; }
  if (iteration < mandelbrot.orbitTrapStartIteration) { return; }
  if (mandelbrot.orbitTrapEndIteration > 0.0 && iteration > mandelbrot.orbitTrapEndIteration) { return; }
  let hit = orbit_trap_distance_angle(z);
  if (hit.x < (*state).bestDistance) {
    (*state).bestDistance = hit.x;
    (*state).hitIteration = iteration;
    (*state).hitAngle = hit.y;
  }
}

// ── orbit metrics (stripe EMA, direction coherence, their gradients) ─
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

// Both metrics are functions of A_k = arg(z_k) alone. With w = z'/z the
// texel-space gradient (texture y grows down) is grad A = -i*w = (w.y, -w.x).
// The texel scale is folded in here so the accumulators stay in f32 range.
fn orbit_arg_gradient(z: vec2<f32>, derM: vec2<f32>, derS: f32, logTexelDelta: f32) -> vec2<f32> {
  let z2 = dot(z, z);
  let der2 = dot(derM, derM);
  if (!(z2 > 1e-30) || !(der2 > 1e-30) || !finite_vec2(z)
      || !finite_vec2(derM) || !finite_scalar(derS)) {
    return vec2<f32>(0.0);
  }
  let invZ = vec2<f32>(z.x, -z.y) / z2;
  let w = cmul(derM, invZ) * exp(clamp(derS + logTexelDelta, -80.0, 80.0));
  if (!finite_vec2(w)) {
    return vec2<f32>(0.0);
  }
  return vec2<f32>(w.y, -w.x);
}

// Running orbit-metric state. The gradients obey the same recurrences as the
// values they differentiate, so a skipped block of `count` steps decays them
// with the same (1-alpha)^count — no per-iteration replay.
struct OrbitMetrics {
  stripeEma: f32,
  avgCount: f32,
  avgDirSum: vec2<f32>,
  stripeGrad: vec2<f32>,
  dirGradSum: vec2<f32>,
};

fn empty_orbit_metrics() -> OrbitMetrics {
  var m: OrbitMetrics;
  m.stripeEma = 0.0;
  m.avgCount = 0.0;
  m.avgDirSum = vec2<f32>(0.0);
  m.stripeGrad = vec2<f32>(0.0);
  m.dirGradSum = vec2<f32>(0.0);
  return m;
}

fn advance_orbit_metrics(
  m: ptr<function, OrbitMetrics>,
  previous: ptr<function, OrbitMetrics>,
  z: vec2<f32>,
  derM: vec2<f32>,
  derS: f32,
  logTexelDelta: f32,
  count: f32,
) {
  *previous = *m;
  let frequency = max(mandelbrot.stripeFrequency, 0.0);
  let angle = atan2(z.y, z.x);
  let decay = pow(1.0 - ORBIT_METRIC_EMA_ALPHA, max(count, 1.0));

  let sample = sin(frequency * angle);
  (*m).stripeEma = sample + ((*m).stripeEma - sample) * decay;

  let gradA = orbit_arg_gradient(z, derM, derS, logTexelDelta);
  let gradSample = (frequency * cos(frequency * angle)) * gradA;
  (*m).stripeGrad = gradSample + ((*m).stripeGrad - gradSample) * decay;

  let u = orbit_direction_sample(z);
  let mean = select(u, normalize((*m).avgDirSum), dot((*m).avgDirSum, (*m).avgDirSum) > 1e-24);
  (*m).dirGradSum += ((mean.y * u.x - mean.x * u.y) * count) * gradA;
  (*m).avgDirSum += u * count;
  (*m).avgCount += count;
}

fn orbit_metrics_dir_gradient(m: OrbitMetrics) -> vec2<f32> {
  return m.dirGradSum / max(m.avgCount, 1.0);
}

fn orbit_metrics_avg_dir(m: OrbitMetrics) -> vec2<f32> {
  return m.avgDirSum / max(m.avgCount, 1.0);
}

// c-units size of one source neutral texel, in log domain.
fn orbit_log_texel_delta(deepScaleExp: i32) -> f32 {
  return log(max(mandelbrot.scale, 1e-30))
    + f32(deepScaleExp) * LN2
    + log(2.0 * sqrt(mandelbrot.aspect * mandelbrot.aspect + 1.0) / brush.neutralSide)
    + appearance_log_texel_adjustment();
}

fn escape_fraction(z: vec2<f32>, muLimit: f32) -> f32 {
  let zSq = max(dot(z, z), 1e-12);
  return clamp(1.0 - log(log(zSq) / log(muLimit)) / log(2.0), 0.0, 1.0);
}

// ── shared terminal packing ─────────────────────────────────────────
fn finished_texel(out: ptr<function, TexelOut>, z: vec2<f32>) {
  (*out).iter      = pack(0.0);
  (*out).genuine   = pack(0.0);
  (*out).zx        = pack(z.x);
  (*out).zy        = pack(z.y);
  (*out).dzx       = pack(0.0);
  (*out).dzy       = pack(0.0);
  (*out).ref_i     = pack(0.0);
  (*out).avgDirection = pack(0.0);
  (*out).derS      = pack(0.0); // finished — layer 8 dead
}

fn escaped_texel(
  out: ptr<function, TexelOut>,
  z: vec2<f32>, total_iter: f32, shadingHeight: f32,
  derM: vec2<f32>, derS: f32, sndM: vec2<f32>, sndS: f32, sndValid: bool,
  metrics: OrbitMetrics, previousMetrics: OrbitMetrics, muLimit: f32, deepScaleExp: i32,
) {
  let escapeBlend = escape_fraction(z, muLimit);
  let smoothStripeEma = mix(previousMetrics.stripeEma, metrics.stripeEma, escapeBlend);
  let smoothAvgDir = mix(orbit_metrics_avg_dir(previousMetrics), orbit_metrics_avg_dir(metrics), escapeBlend);
  // The gradients take the SAME terminal blend as the values they
  // differentiate — otherwise the relief would step where the color does not.
  (*out).orbitGradStripe = mix(previousMetrics.stripeGrad, metrics.stripeGrad, escapeBlend);
  (*out).orbitGradCoherence = mix(
    orbit_metrics_dir_gradient(previousMetrics),
    orbit_metrics_dir_gradient(metrics),
    escapeBlend,
  );

  let geometry = analytic_terminal_geometry(z, derM, derS, sndM, sndS, deepScaleExp);
  (*out).iter      = pack(total_iter);
  (*out).genuine   = pack(geometry.x);
  (*out).zx        = pack(z.x);
  (*out).zy        = pack(z.y);
  (*out).dzx       = pack(shadingHeight);
  (*out).dzy       = pack(geometry.y);
  (*out).ref_i     = pack(terminal_orbit_metrics(smoothStripeEma, smoothAvgDir));
  (*out).avgDirection = pack(geometry.z);
  // Escaped payload: z′ keeps its normalized Cartesian form; z″ becomes
  // polar-log so its independent exponent cannot overflow.
  (*out).derS      = pack(derS);
  (*out).aa9       = pack(derM.x);
  (*out).aa10      = pack(derM.y);
  (*out).aa11      = pack(select(INVALID_TAYLOR_PAYLOAD, scaled_complex_log_length(sndM, sndS), sndValid));
  (*out).aa12      = pack(select(INVALID_TAYLOR_PAYLOAD, atan2(sndM.y, sndM.x), sndValid));
}

// ── core computation, shallow f32 path ──────────────────────────────
fn mandelbrot_compute(x0: f32, y0: f32, prev_iter: f32, prev_zx: f32, prev_zy: f32, prev_derx: f32, prev_dery: f32, prev_ders: f32, prev_ref_i: f32, prev_avg_direction: f32, prev_sndx: f32, prev_sndy: f32, prev_snds: f32, prev_snd_valid: f32, prev_stripe_grad: vec2<f32>, prev_dir_grad: vec2<f32>, prev_trap_distance: f32, prev_trap_iteration: f32, prev_trap_angle: f32) -> TexelOut {

  let dc = vec2<f32>(x0, y0);
  let muLimit = mandelbrot.mu;
  let globalMaxIterI = i32(mandelbrot.globalMaxIter);
  let localWorkLimit = max(1u, u32(mandelbrot.maxIteration));

  var i: f32 = 0.0;
  var dz = vec2<f32>(prev_zx, prev_zy);
  var ref_i = decode_ref_i(prev_ref_i);
  // Carried reference-orbit value. Invariant: refZ == getOrbit(ref_i) at the
  // end of every loop branch, so a single-step iteration reads the orbit once.
  var refZ = getOrbit(ref_i);
  var z = refZ + dz;

  // Derivative state der = derM · exp(derS), carried RAW across pass
  // boundaries (layers 4/5/8 for in-progress pixels). Fresh pixels pass
  // (0, 0, 0): derM = 0 is the empty state, the "+1" term seeds the first
  // iteration through derInvScale.
  var derM = vec2<f32>(prev_derx, prev_dery);
  var derS: f32 = prev_ders;
  var derSLo: f32 = 0.0;
  // z″ = sndM·exp(sndS), independently normalized from z′. Layer 12 carries
  // the resumable validity bit; every move here preserves z″.
  var sndM = vec2<f32>(prev_sndx, prev_sndy);
  var sndS = prev_snds;
  let sndValid = prev_snd_valid >= 0.5;
  var derInvScale = 0.0;
  der_refresh_cache(&derM, &derS, &derSLo, &derInvScale);

  let trackOrbitMetrics = mandelbrot.trackOrbitMetrics >= 0.5;
  var metrics = empty_orbit_metrics();
  var previousMetrics = metrics;
  var logTexelDelta = 0.0;
  if (trackOrbitMetrics) {
    metrics.stripeEma = decode_stripe_ema(prev_ref_i, prev_iter);
    metrics.avgCount = max(prev_iter, 0.0);
    metrics.avgDirSum = decode_avg_dir(prev_avg_direction, prev_iter) * metrics.avgCount;
    metrics.stripeGrad = prev_stripe_grad;
    metrics.dirGradSum = prev_dir_grad * metrics.avgCount;
    previousMetrics = metrics;
    logTexelDelta = orbit_log_texel_delta(0);
  }
  var trapState = OrbitTrapState(prev_trap_distance, prev_trap_iteration, prev_trap_angle);
  update_orbit_trap(&trapState, z, prev_iter);

  var escaped = false;
  var shadingHeight = 0.0;

  // approximationMode: 0 = exact perturbation, 1 = affine BLA. The exact
  // orbit-trap mode (3) samples every iteration and forbids skipping.
  let useBla = mandelbrot.approximationMode >= 0.5
            && mandelbrot.approximationMode < 1.5
            && mandelbrot.blaLevelCount >= 1.0
            && mandelbrot.orbitTrapMode < 2.5;
  var skip0Log = 0;
  // Level 0 carries the loosest per-level radius bound (merged radii only
  // shrink), so one compare against it tells whether any BLA entry could
  // possibly accept the current |dz|. log2-domain: dot(dz,dz) underflows f32
  // below |dz| ~ 1e-19.
  var logMaxBlaR = -3.0e38;
  if (useBla) {
    skip0Log = i32(countTrailingZeros(max(mandelbrotBlaLevels[0].skip, 1u)));
    logMaxBlaR = log2(max(mandelbrotBlaLevels[0].maxRadius, 1e-30));
  }

  // Bound on the pixel's TOTAL iteration count, not on ref_i: the end-of-orbit
  // rebase resets ref_i to 0, so a ref_i bound let a pixel run on past
  // globalMaxIter for the rest of the pass budget with dz = z of order 1 in
  // f32 — dc (1e-14 at depth) is lost and the pixel follows the reference's
  // dynamics from a shifted z, then escapes although it is inside.
  while (g_workBudget < localWorkLimit && prev_iter + i < mandelbrot.globalMaxIter) {
    g_workBudget += 1u;
    var skipped = 0;
    if (useBla) {
      let dzMag = length(dz);
      if (dzMag < 1.2e-38 || log2(dzMag) <= logMaxBlaR) {
        var blaZ = vec2<f32>(0.0);
        skipped = try_apply_bla(&ref_i, &dz, &derM, &derS, &derSLo, &derInvScale, &blaZ, dc, muLimit, skip0Log, globalMaxIterI, &sndM, &sndS);
        if (skipped > 0) {
          z = blaZ;
          i += f32(skipped);
          refZ = getOrbit(ref_i); // ref_i jumped past the block — resync carried orbit
          if (trackOrbitMetrics) {
            advance_orbit_metrics(&metrics, &previousMetrics, z, derM, derS + derSLo, logTexelDelta, f32(skipped));
          }
        }
      }
    }
    if (skipped == 0) {
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
        advance_orbit_metrics(&metrics, &previousMetrics, z, derM, derS + derSLo, logTexelDelta, 1.0);
      }
    }
    update_orbit_trap(&trapState, z, prev_iter + i);

    let dot_z = dot(z, z);
    if (dot_z > muLimit) {
      let derPolar = der_to_polar(derM, derS + derSLo);
      shadingHeight = distance_height(z, derPolar);
      escaped = true;
      break;
    }
    let derMM = dot(derM, derM);
    if (derMM > DER_RENORM_HI || derMM < DER_RENORM_LO) {
      der_renormalize(&derM, &derS, &derSLo, &derInvScale);
    }

    // Rebase onto the reference start when the perturbation overtakes the
    // orbit or the reference runs out.
    if (dot_z < dot(dz, dz) || ref_i == globalMaxIterI) {
      dz = z;
      ref_i = 0;
      refZ = getOrbit(0);
    }
  }

  var out: TexelOut;
  out.orbitGradStripe = vec2<f32>(0.0);
  out.orbitGradCoherence = vec2<f32>(0.0);
  out.deepAvgDirection = 0.0; // shallow parks the direction in layer 7
  out.trapBestDistance = trapState.bestDistance;
  out.trapHitIteration = trapState.hitIteration;
  out.trapHitAngle = trapState.hitAngle;

  let total_iter = prev_iter + i;

  if (escaped) {
    escaped_texel(&out, z, total_iter, shadingHeight, derM, derS + derSLo, sndM, sndS, sndValid, metrics, previousMetrics, muLimit, 0);
    return out;
  }

  if (total_iter >= mandelbrot.globalMaxIter && mandelbrot.orbitComplete >= 0.5) {
    finished_texel(&out, z);
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
  out.ref_i     = pack(ref_i_with_stripe(f32(ref_i), metrics.stripeEma));
  out.avgDirection = pack(encode_avg_dir(orbit_metrics_avg_dir(metrics)));
  out.orbitGradStripe = metrics.stripeGrad;
  out.orbitGradCoherence = orbit_metrics_dir_gradient(metrics);
  out.derS      = pack(derS + derSLo);
  out.aa9       = pack(sndM.x);
  out.aa10      = pack(sndM.y);
  out.aa11      = pack(sndS);
  out.aa12      = pack(select(0.0, 1.0, sndValid));
  return out;
}

// ── deep (floatexp) perturbation ──────────────────────────────────
// Exact perturbation with dz/dc in extended-exponent form, for scale below the
// deep threshold. z_n stays O(1) f32; der reuses the shallow machinery; the
// resumable dz is parked as (mantissa in zx/zy, exponent in layer 7), so the
// average orbit direction rides layer 17 on this path.
fn mandelbrot_compute_deep(dc: fe, prev_iter: f32, prev_dz_m: vec2<f32>, prev_dz_e: i32, prev_ref_i_int: i32, prev_derx: f32, prev_dery: f32, prev_ders: f32, prev_sndx: f32, prev_sndy: f32, prev_snds: f32, prev_snd_valid: f32, prev_ref_i_raw: f32, prev_avg_direction: f32, prev_stripe_grad: vec2<f32>, prev_dir_grad: vec2<f32>, prev_trap_distance: f32, prev_trap_iteration: f32, prev_trap_angle: f32) -> TexelOut {
  let localWorkLimit = max(1u, u32(mandelbrot.maxIteration));
  let muLimit = mandelbrot.mu;
  let globalMaxIterI = i32(mandelbrot.globalMaxIter);
  let scaleExp = i32(mandelbrot.scaleExp);

  var i: f32 = 0.0;
  var dz = fe_renorm(fe(prev_dz_m, prev_dz_e));
  var ref_i = prev_ref_i_int;
  var refZ = getOrbit(ref_i); // carried orbit value (see mandelbrot_compute)
  var z = refZ + fe_to_vec(dz);

  var derM = vec2<f32>(prev_derx, prev_dery);
  var derS: f32 = prev_ders;
  var derSLo: f32 = 0.0;
  var sndM = vec2<f32>(prev_sndx, prev_sndy);
  var sndS = prev_snds;
  let sndValid = prev_snd_valid >= 0.5;
  var derInvScale = 0.0;
  der_refresh_cache(&derM, &derS, &derSLo, &derInvScale);

  // encode_avg_dir never produces 0.0, so a zero carrier means "no metrics
  // parked yet": a fresh texel restarts the running mean.
  let trackOrbitMetrics = mandelbrot.trackOrbitMetrics >= 0.5;
  var metrics = empty_orbit_metrics();
  var previousMetrics = metrics;
  var logTexelDelta = 0.0;
  if (trackOrbitMetrics) {
    if (prev_avg_direction != 0.0) {
      metrics.stripeEma = decode_stripe_ema(prev_ref_i_raw, prev_iter);
      metrics.avgCount = max(prev_iter, 0.0);
      metrics.avgDirSum = decode_avg_dir(prev_avg_direction, prev_iter) * metrics.avgCount;
      metrics.stripeGrad = prev_stripe_grad;
      metrics.dirGradSum = prev_dir_grad * metrics.avgCount;
    }
    previousMetrics = metrics;
    logTexelDelta = orbit_log_texel_delta(scaleExp);
  }
  var trapState = OrbitTrapState(prev_trap_distance, prev_trap_iteration, prev_trap_angle);
  update_orbit_trap(&trapState, z, prev_iter);

  var escaped = false;
  var shadingHeight = 0.0;

  let useBla = mandelbrot.approximationMode >= 0.5
            && mandelbrot.approximationMode < 1.5
            && mandelbrot.blaLevelCount >= 1.0
            && mandelbrot.orbitTrapMode < 2.5;
  var skip0Log = 0;
  if (useBla) {
    skip0Log = i32(countTrailingZeros(max(mandelbrotBlaLevels[0].skip, 1u)));
  }

  // Bound on the pixel's TOTAL iteration count, not on ref_i: the end-of-orbit
  // rebase resets ref_i to 0, so a ref_i bound let a pixel run on past
  // globalMaxIter for the rest of the pass budget with dz = z of order 1 in
  // f32 — dc (1e-14 at depth) is lost and the pixel follows the reference's
  // dynamics from a shifted z, then escapes although it is inside.
  while (g_workBudget < localWorkLimit && prev_iter + i < mandelbrot.globalMaxIter) {
    g_workBudget += 1u;
    var skipped = 0;
    if (useBla) {
      var blaZ = vec2<f32>(0.0);
      skipped = try_apply_bla_deep(&ref_i, &dz, &derM, &derS, &derSLo, &derInvScale, &blaZ, dc, muLimit, skip0Log, globalMaxIterI, &sndM, &sndS);
      if (skipped > 0) {
        z = blaZ;
        i += f32(skipped);
        refZ = getOrbit(ref_i); // ref_i jumped past the block — resync carried orbit
      }
    }
    if (skipped == 0) {
      let zPrev = refZ + fe_to_vec(dz);
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

    if (trackOrbitMetrics) {
      advance_orbit_metrics(&metrics, &previousMetrics, z, derM, derS + derSLo, logTexelDelta, f32(max(skipped, 1)));
    }
    update_orbit_trap(&trapState, z, prev_iter + i);

    let dot_z = dot(z, z);
    if (dot_z > muLimit) {
      let derPolar = der_to_polar(derM, derS + derSLo);
      shadingHeight = distance_height_deep(z, derPolar, scaleExp);
      escaped = true;
      break;
    }
    let derMM = dot(derM, derM);
    if (derMM > DER_RENORM_HI || derMM < DER_RENORM_LO) {
      der_renormalize(&derM, &derS, &derSLo, &derInvScale);
    }

    if (dot_z < fe_mag2_f32(dz) || ref_i == globalMaxIterI) {
      dz = fe_from_vec(z, 0);
      ref_i = 0;
      refZ = getOrbit(0);
    }
  }

  var out: TexelOut;
  out.orbitGradStripe = vec2<f32>(0.0);
  out.orbitGradCoherence = vec2<f32>(0.0);
  out.deepAvgDirection = 0.0;
  out.trapBestDistance = trapState.bestDistance;
  out.trapHitIteration = trapState.hitIteration;
  out.trapHitAngle = trapState.hitAngle;

  let total_iter = prev_iter + i;

  if (escaped) {
    escaped_texel(&out, z, total_iter, shadingHeight, derM, derS + derSLo, sndM, sndS, sndValid, metrics, previousMetrics, muLimit, scaleExp);
    return out;
  }

  if (total_iter >= mandelbrot.globalMaxIter && mandelbrot.orbitComplete >= 0.5) {
    finished_texel(&out, z);
    return out;
  }

  let dzN = fe_renorm(dz);
  out.iter      = pack(total_iter);
  out.genuine   = pack(1.0);
  out.zx        = pack(dzN.m.x);
  out.zy        = pack(dzN.m.y);
  out.dzx       = pack(derM.x);
  out.dzy       = pack(derM.y);
  out.ref_i     = pack(ref_i_with_stripe(f32(ref_i), metrics.stripeEma));
  out.avgDirection = pack(f32(dzN.e));
  out.orbitGradStripe = metrics.stripeGrad;
  out.orbitGradCoherence = orbit_metrics_dir_gradient(metrics);
  out.deepAvgDirection = select(0.0, encode_avg_dir(orbit_metrics_avg_dir(metrics)), trackOrbitMetrics);
  out.derS      = pack(derS + derSLo);
  out.aa9       = pack(sndM.x);
  out.aa10      = pack(sndM.y);
  out.aa11      = pack(sndS);
  out.aa12      = pack(select(0.0, 1.0, sndValid));
  return out;
}

// ── viewport geometry ───────────────────────────────────────────────
fn rotate(v: vec2<f32>, angle: f32) -> vec2<f32> {
  let s = sin(angle);
  let c = cos(angle);
  return vec2<f32>(c * v.x - s * v.y, s * v.x + c * v.y);
}

fn is_inside_rotated_screen(xy_neutral: vec2<f32>) -> bool {
  // A rotating tiled keyframe is conservatively built over the circumscribed
  // disc, which contains the union of every viewport angle in its cycle.
  if (brush.rotationUnion > 0.5) {
    return dot(xy_neutral, xy_neutral) <= 1.0;
  }
  let neutralExtent = sqrt(brush.aspect * brush.aspect + 1.0);
  let local_rot = xy_neutral * neutralExtent;
  let local = rotate(local_rot, -brush.angle);
  let inside_x = abs(local.x) <= brush.aspect;
  let inside_y = abs(local.y) <= 1.0;
  return inside_x && inside_y;
}

// Texels the kernel iterates. Live rotation margin (rotationUnion < 0): while
// the view turns, the circumscribed disc outside the viewport is iterated too,
// on the even lattice only — the resolve rebuilds the rest at step 2. It gives
// the next frozen snapshot every angle the rotation can reach.
fn is_inside_compute_region(xy_neutral: vec2<f32>, coord: vec2<u32>) -> bool {
  if (is_inside_rotated_screen(xy_neutral)) { return true; }
  return brush.rotationUnion < -0.5
    && dot(xy_neutral, xy_neutral) <= 1.0
    && ((coord.x | coord.y) & 1u) == 0u;
}

// Direct non-Cartesian coordinates relative to the block's deep scale anchor.
// Point samples deliberately bypass the Cartesian AA jitter/footprint.
fn expmap_local(coord: vec2<f32>) -> vec2<f32> {
  let grid = coord + vec2<f32>(brush.expmapX0, brush.expmapY0);
  if (brush.expmapMode > 2.5) {
    return (grid - vec2<f32>(brush.expmapCenterHalf)) / brush.expmapDensity;
  }
  let theta = 6.283185307179586 * (grid.x % brush.expmapAngularSamples) / brush.expmapAngularSamples;
  let radius = exp(-coord.y * brush.expmapRhoStep);

  return radius * vec2<f32>(cos(theta), sin(theta));
}

// ── fused compute entry ─────────────────────────────────────────────
// Workgroup-local partial counters: each 8×8 workgroup reduces locally and
// issues at most one global atomicAdd per counter. Barriers stay in uniform
// control flow — the per-texel work is wrapped in ifs, never early-returned.
var<workgroup> wgCount: atomic<u32>;
// Exact per-lane g_workBudget, reduced by lane 0.
var<workgroup> wgWeightedWork: array<u32, 64>;

// Rotation margin, workgroup packing: the host dispatches the whole square
// in 16×16 blocks of 2×2 workgroups. A block lying entirely outside the
// viewport only holds even-lattice work (64 texels); spread over four
// workgroups it would run 16 lanes out of 64, at the cost of full waves. Its
// first workgroup takes one lattice texel per lane instead, the other three
// idle. Conservative: the block's circumscribed circle must clear the viewport.
fn margin_block_outside_viewport(block: vec2<u32>) -> bool {
  let neutralExtent = sqrt(brush.aspect * brush.aspect + 1.0);
  let centre = vec2<f32>(brush.tileOriginX, brush.tileOriginY) + vec2<f32>(block * 16u) + vec2<f32>(8.0);
  let xy_neutral = vec2<f32>(
    centre.x / brush.neutralSide * 2.0 - 1.0,
    1.0 - centre.y / brush.neutralSide * 2.0,
  );
  let local = rotate(xy_neutral * neutralExtent, -brush.angle);
  let texel = 2.0 * neutralExtent / brush.neutralSide;
  let outside = max(abs(local) - vec2<f32>(brush.aspect, 1.0), vec2<f32>(0.0));
  return length(outside) > 12.0 * texel;
}

@compute @workgroup_size(8, 8)
fn cs_main(
  @builtin(global_invocation_id) local_gid: vec3<u32>,
  @builtin(workgroup_id) wid: vec3<u32>,
  @builtin(local_invocation_id) lid: vec3<u32>,
  @builtin(local_invocation_index) lidx: u32,
) {
  var texel = local_gid.xy + vec2<u32>(u32(brush.dispatchOriginX), u32(brush.dispatchOriginY));
  var laneActive = true;
  // Workgroup-uniform (depends on wid only): barriers stay in uniform flow.
  if (brush.rotationUnion < -0.5 && brush.expmapMode < 0.5) {
    let block = wid.xy / 2u;
    if (margin_block_outside_viewport(block)) {
      texel = block * 16u + lid.xy * 2u;
      laneActive = all(wid.xy % 2u == vec2<u32>(0u));
    }
  }
  let gid = vec3<u32>(texel, local_gid.z);
  // The block anchor already includes its global starting row. Adding the
  // local row produces the same scale on both sides of block/octave halos.
  expmapAppearanceLogScaleOffset = 0.0;
  if (brush.expmapMode > 0.5 && brush.expmapMode < 1.5) {
    expmapAppearanceLogScaleOffset = -f32(gid.y) * brush.expmapRhoStep;
  }
  if (lidx == 0u) {
    atomicStore(&wgCount, 0u);
  }
  workgroupBarrier();

  // Post-iteration classification of this texel (for the fused counter).
  var needs = false;
  var weightedWork = 0u;

  let dims = textureDimensions(raw);
  if (laneActive && gid.x < dims.x && gid.y < dims.y) {
    let globalCoord = vec2<f32>(brush.tileOriginX, brush.tileOriginY) + vec2<f32>(gid.xy);
    // Same uv convention as the fragment passes: uv.y=0 is the bottom row.
    let uv = vec2<f32>(
      (globalCoord.x + 0.5) / brush.neutralSide,
      1.0 - (globalCoord.y + 0.5) / brush.neutralSide,
    );
    let xy_neutral = uv * 2.0 - vec2<f32>(1.0);

    // Outside the rotated viewport (and its rotation margin): keep as-is,
    // count nothing.
    let expmapInside = f32(gid.x) < brush.expmapWidth && f32(gid.y) < brush.expmapHeight;
    if (select(is_inside_compute_region(xy_neutral, gid.xy), expmapInside, brush.expmapMode > 0.5)) {
      let coord = vec2<i32>(i32(gid.x), i32(gid.y));

      // A negative value is always the single exact step-1 request.
      var iter_val = loadLayer(coord, 0);

      // Layer 2/3 values of the post-iteration state, for the counter's
      // continuation test.
      var zx = 0.0;
      var zy = 0.0;
      var zLoaded = false;

      // globalMaxIter == 0 → no orbit data yet: pure pass-through,
      // sentinels stay as-is.
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
          g_workBudget = 0u;
          let neutralExtent = sqrt(mandelbrot.aspect * mandelbrot.aspect + 1.0);
          // Screen-aligned box-AA jitter, already rotated by the CPU into this
          // local_rot frame and scaled to neutral-space units; zero for sample 0.
          var local_rot = xy_neutral * neutralExtent + vec2<f32>(mandelbrot.aaOffsetX, mandelbrot.aaOffsetY);
          if (brush.expmapMode > 0.5) { local_rot = expmap_local(vec2<f32>(gid.xy)); }

          // Continuation state shared by both paths: layers 4/5/8 hold the raw
          // derivative registers, 9..12 the z″ state, 13..16 the orbit-metric
          // gradients (allocated only while tracked), then the orbit trap.
          var prev_stripe_grad = vec2<f32>(0.0);
          var prev_dir_grad = vec2<f32>(0.0);
          if (!is_compute_request && mandelbrot.trackOrbitMetrics >= 0.5) {
            prev_stripe_grad = vec2<f32>(loadLayer(coord, 13), loadLayer(coord, 14));
            prev_dir_grad = vec2<f32>(loadLayer(coord, 15), loadLayer(coord, 16));
          }
          var prev_trap_distance = 1e30;
          var prev_trap_iteration = 0.0;
          var prev_trap_angle = 0.0;
          if (!is_compute_request && mandelbrot.orbitTrapMode >= 1.5) {
            let trapBase = orbit_trap_layer_base();
            prev_trap_distance = loadLayer(coord, trapBase);
            prev_trap_iteration = loadLayer(coord, trapBase + 1);
            prev_trap_angle = loadLayer(coord, trapBase + 2);
          }

          var result: TexelOut;
          let scaleExp = i32(mandelbrot.scaleExp);
          if (ENABLE_DEEP && scaleExp <= DEEP_EXP) {
            // Deep path: scale/cx/cy carry fe mantissas sharing exponent scaleExp;
            // dc = local·scaleMant + (cxMant, cyMant) is a single same-exponent add.
            let dc = fe_renorm(fe(local_rot * mandelbrot.scale + vec2<f32>(mandelbrot.cx, mandelbrot.cy), scaleExp));
            if (is_compute_request) {
              result = mandelbrot_compute_deep(dc, 0.0, vec2<f32>(0.0), 0, 0, 0.0, 0.0, 0.0, 0.0, 0.0, SCALED_ZERO_S, 1.0, 0.0, 0.0, vec2<f32>(0.0), vec2<f32>(0.0), 1e30, 0.0, 0.0);
            } else {
              // Deep continuation: layers 2/3 hold the dz mantissa, layer 7 its
              // exponent, layer 17 the parked average direction.
              let prev_ref_i_raw = loadLayer(coord, 6);
              var deep_avg_direction = 0.0;
              if (mandelbrot.trackOrbitMetrics >= 0.5) {
                deep_avg_direction = loadLayer(coord, 17);
              }
              result = mandelbrot_compute_deep(dc, iter_val, vec2<f32>(zx, zy), i32(loadLayer(coord, 7)), decode_ref_i(prev_ref_i_raw), loadLayer(coord, 4), loadLayer(coord, 5), loadLayer(coord, 8), loadLayer(coord, 9), loadLayer(coord, 10), loadLayer(coord, 11), loadLayer(coord, 12), prev_ref_i_raw, deep_avg_direction, prev_stripe_grad, prev_dir_grad, prev_trap_distance, prev_trap_iteration, prev_trap_angle);
            }
          } else {
            let x0 = local_rot.x * mandelbrot.scale + mandelbrot.cx;
            let y0 = local_rot.y * mandelbrot.scale + mandelbrot.cy;
            if (is_compute_request) {
              result = mandelbrot_compute(x0, y0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, SCALED_ZERO_S, 1.0, vec2<f32>(0.0), vec2<f32>(0.0), 1e30, 0.0, 0.0);
            } else {
              result = mandelbrot_compute(x0, y0, iter_val, zx, zy, loadLayer(coord, 4), loadLayer(coord, 5), loadLayer(coord, 8), loadLayer(coord, 6), loadLayer(coord, 7), loadLayer(coord, 9), loadLayer(coord, 10), loadLayer(coord, 11), loadLayer(coord, 12), prev_stripe_grad, prev_dir_grad, prev_trap_distance, prev_trap_iteration, prev_trap_angle);
            }
          }
          storeTexel(coord, result);
          weightedWork = g_workBudget;

          // Count the written (post-iteration) state.
          iter_val = result.iter.r;
          zx = result.zx.r;
          zy = result.zy.r;
          zLoaded = true;
        }
      }

      // ── count stage ──
      if (iter_val < 0.0) {
        needs = true;
      } else if (iter_val > 0.0) {
        if (!zLoaded) {
          zx = loadLayer(coord, 2);
          zy = loadLayer(coord, 3);
        }
        needs = (zx * zx + zy * zy) < mandelbrot.mu;
      }
    }
  }

  wgWeightedWork[lidx] = weightedWork;
  if (needs) {
    atomicAdd(&wgCount, 1u);
  }
  workgroupBarrier();

  if (lidx == 0u) {
    let c = atomicLoad(&wgCount);
    if (c > 0u) {
      atomicAdd(&counter.count, c);
      // No scheduling heuristic: every unfinished texel weighs a full 8/8.
      atomicAdd(&counter.effectiveCountEighths, c * PERIODIC_WEIGHT_FULL);
    }
    var workSum = 0u;
    for (var lane = 0u; lane < 64u; lane++) {
      workSum += wgWeightedWork[lane];
    }
    let workShift = min(u32(max(0.0, brush.workCounterShift)), 31u);
    let scaledWork = workSum >> workShift;
    if (scaledWork > 0u) {
      atomicAdd(&counter.weightedWork, scaledWork);
    }
  }
}
