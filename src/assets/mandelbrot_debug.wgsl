// Block-skipping DEBUG view (separate diagnostic pipeline).
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
//                 jet: G = order 1, B = orders 2-3. Padé: B. BLA: G.
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
// Flat coefficient buffer shared by jet (stride 9) and Möbius-c+ (stride 5,
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


// Möbius-c+ probe/apply (production parity with try_apply_mobius, minus the
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
// as the TIER-MIX census: o1 = affine/Padé (≤ 48 B path), o2 = c+ (80 B),
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
  // keeps dc²/dc³ clear of the f32 subnormal band.
  let dcF = fe_to_vec(dc);
  let dcF2 = cmul(dcF, dcF);
  let dcF3 = cmul(dcF2, dcF);
  let jetF32Ok = length(dcF) > 2.3e-13;

  let mode = i32(mandelbrot.approximationMode + 0.5); // 0..5 requested mode
  let isJet = mode == 3;
  let isMobius = mode == 4;
  let isUnified = mode == 5;
  let isBlockTable = isJet || isMobius || isUnified;
  // Möbius products are degree-1 in dc: looser f32-path gate than the jet's.
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
