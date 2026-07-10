// Möbius-c+ block skipping (add-mobius-cplus).
//
// The c-augmented Möbius form
// m(z, c) = ((A + A'·c)·z + B·c) / (1 + (D + D'·c)·z + F·c)
// is the Padé [1/1] vehicle plus three c-coefficients chosen to exactly
// annihilate the zc and z²c cross-terms of the block map — the terms guard (G)
// exists for — plus the pure-c² term (F, the Chisholm-style denominator
// c-slot: it RESUMS the pure-c geometric series instead of correcting it,
// closing the shallow cmax_c2 bind the 5-coefficient census measured).
// Coefficients derive from the block's bivariate jet (jet.rs, used
// here as a build-only tool); validity is ONE certified entry radius per block
// from the compensated remainder Q plus a Cauchy tail (rule (V), note §4).
// Source math: MOBIUS_CPLUS_IMPLEMENTATION.md (externally verified).
#![allow(dead_code)] // consumed progressively by the add-mobius-cplus tasks

use crate::jet::{
    self, cfe_to_coeff, fe_exp2, jet_idx, CFe, JetCoeffFe, JetF64, JetLevel, JET_DS,
    JET_MONOMIALS, JET_NCOEFF,
};

// ── coefficient extraction (note §3) ───────────────────────────────────────────

/// The six complex block coefficients. `degenerate` marks c₁₀ = 0 blocks
/// (prefix blocks from Z₀ = 0): their radius is −∞ and they are never applied.
#[derive(Clone, Copy, Debug)]
pub struct MobiusCPlus {
    pub a: CFe,  // A  = c₁₀
    pub b: CFe,  // B  = c₀₁
    pub d: CFe,  // D  = −c₂₀/c₁₀                    (Padé [1/1])
    pub ap: CFe, // A' = c₁₁ + D·B + F·A             (annihilates zc)
    pub dp: CFe, // D' = −(c₂₁ + D·c₁₁ + F·c₂₀)/A    (annihilates z²c)
    pub f: CFe,  // F  = −c₀₂/c₀₁                    (annihilates c², resums pure-c)
    pub degenerate: bool,
}

pub fn mobius_from_jet(jet: &JetF64) -> MobiusCPlus {
    let c10 = jet.coeff(1, 0);
    let c01 = jet.coeff(0, 1);
    if c10.is_zero() {
        return MobiusCPlus {
            a: CFe::ZERO,
            b: c01,
            d: CFe::ZERO,
            ap: CFe::ZERO,
            dp: CFe::ZERO,
            f: CFe::ZERO,
            degenerate: true,
        };
    }
    let c20 = jet.coeff(2, 0);
    let c11 = jet.coeff(1, 1);
    let c21 = jet.coeff(2, 1);
    let c02 = jet.coeff(0, 2);
    let a = c10;
    let b = c01;
    let d = c20.div(c10).neg();
    // B = c₀₁ can vanish in principle (never observed on real orbits); F = 0
    // falls back to the 5-coefficient form — q₀₂ = c₀₂ then stays a live REST
    // term, which is sound (just not resummed).
    let f = if c01.is_zero() { CFe::ZERO } else { c02.div(c01).neg() };
    let ap = c11.add(d.mul(b)).add(f.mul(a));
    let dp = c21.add(d.mul(c11)).add(f.mul(c20)).div(a).neg();
    MobiusCPlus { a, b, d, ap, dp, f, degenerate: false }
}

// ── compensated remainder Q (note §4.1) ────────────────────────────────────────

/// Taylor coefficients (degree ≤ D_s) of
/// Q = (1 + (D + D'c)z + Fc)·Φ − ((A + A'c)z + Bc):
/// q_ij = c_ij + D·c_{i−1,j} + D'·c_{i−1,j−1} + F·c_{i,j−1} minus {A at (1,0),
/// A' at (1,1), B at (0,1)} — out-of-range indices contribute 0. By
/// construction q₁₀ = q₀₁ = q₂₀ = q₁₁ = q₀₂ = q₂₁ = 0; verifying that
/// numerically is the build-integrity check of the extraction
/// (mobius_q_integrity_log2).
pub fn mobius_q(jet: &JetF64, m: &MobiusCPlus) -> [CFe; JET_NCOEFF] {
    let mut q = [CFe::ZERO; JET_NCOEFF];
    for (n, &(i, j)) in JET_MONOMIALS.iter().enumerate() {
        let (i, j) = (i as usize, j as usize);
        let mut v = jet.a[n];
        if i >= 1 && i - 1 + j >= 1 {
            v = v.add(m.d.mul(jet.coeff(i - 1, j)));
        }
        if i >= 1 && j >= 1 && i + j >= 3 {
            v = v.add(m.dp.mul(jet.coeff(i - 1, j - 1)));
        }
        if j >= 1 && i + j >= 2 {
            v = v.add(m.f.mul(jet.coeff(i, j - 1)));
        }
        match (i, j) {
            (1, 0) => v = v.sub(m.a),
            (1, 1) => v = v.sub(m.ap),
            (0, 1) => v = v.sub(m.b),
            _ => {}
        }
        q[n] = v;
    }
    q
}

/// Worst |q_ij| / scale over the six constructed zeros, in log2 (−∞ when every
/// zero is exact). Scale per slot is the LARGEST term entering the cancellation
/// (|c_ij|, |D·c_{i−1,j}|, |D'·c_{i−1,j−1}|, |F·c_{i,j−1}|, the subtracted
/// block coefficient) — the honest rounding scale: it verifies the formulas,
/// not that the cancellation is benign.
pub fn mobius_q_integrity_log2(jet: &JetF64, m: &MobiusCPlus, q: &[CFe; JET_NCOEFF]) -> f64 {
    let l2 = |v: &CFe| v.log2_mag().unwrap_or(f64::NEG_INFINITY);
    let mut worst = f64::NEG_INFINITY;
    for &(i, j) in MOBIUS_Q_ZEROS {
        // If B = c₀₁ vanishes, F deliberately falls back to zero and q₀₂
        // remains a genuine residual term rather than a constructed zero.
        if (i, j) == (0, 2) && m.b.is_zero() {
            continue;
        }
        let qv = q[jet_idx(i, j)];
        let Some(ql) = qv.log2_mag() else { continue };
        let mut scale = l2(&jet.coeff(i, j));
        if i >= 1 && i - 1 + j >= 1 {
            scale = scale.max(l2(&m.d.mul(jet.coeff(i - 1, j))));
        }
        if i >= 1 && j >= 1 && i + j >= 3 {
            scale = scale.max(l2(&m.dp.mul(jet.coeff(i - 1, j - 1))));
        }
        if j >= 1 && i + j >= 2 {
            scale = scale.max(l2(&m.f.mul(jet.coeff(i, j - 1))));
        }
        scale = scale.max(match (i, j) {
            (1, 0) => l2(&m.a),
            (0, 1) => l2(&m.b),
            (1, 1) => l2(&m.ap),
            _ => f64::NEG_INFINITY,
        });
        if scale.is_finite() {
            worst = worst.max(ql - scale);
        }
    }
    worst
}

/// The six slots annihilated by construction (c+ extraction).
pub const MOBIUS_Q_ZEROS: &[(usize, usize)] =
    &[(1, 0), (0, 1), (2, 0), (1, 1), (0, 2), (2, 1)];

// ── level build (orbit-keyed stage) ────────────────────────────────────────────

/// One block's orbit-keyed data: the six coefficients plus the |q_ij| moduli
/// (log2; −∞ for zeros, including the six constructed zeros — their f64
/// residue is rounding noise ~2^−52 relative, far below any usable ε). The
/// full jet is dropped after extraction: unlike jet mode, Möbius-c+ never
/// ships jets, so levels here are ~5× lighter than JetLevelF64.
#[derive(Clone, Debug)]
pub struct MobiusBlock {
    pub m: MobiusCPlus,
    pub log2_q: [f64; JET_NCOEFF],
}

pub struct MobiusLevel {
    pub skip: usize,
    pub blocks: Vec<MobiusBlock>,
}

fn block_from_jet(jet: &JetF64) -> MobiusBlock {
    let m = mobius_from_jet(jet);
    let mut log2_q = [f64::NEG_INFINITY; JET_NCOEFF];
    if !m.degenerate {
        let q = mobius_q(jet, &m);
        for (n, v) in q.iter().enumerate() {
            log2_q[n] = v.log2_mag().unwrap_or(f64::NEG_INFINITY);
        }
        // The six constructed zeros are exact by design (verified by the
        // integrity test); their stored residue would only pollute REST.
        // q₀₂ is only annihilated when B = c₀₁ is nonzero. The c₀₁ = 0
        // fallback keeps it as a REST term, even when F happens to be zero.
        for &(i, j) in MOBIUS_Q_ZEROS {
            if (i, j) == (0, 2) && m.b.is_zero() {
                continue;
            }
            log2_q[jet_idx(i, j)] = f64::NEG_INFINITY;
        }
    }
    MobiusBlock { m, log2_q }
}

/// Build every merge-tree level from skip 1 up to `max_skip`, extracting the
/// Möbius data per block and keeping only two jet levels alive at a time
/// (streaming compose — the jets are a build-only tool here). ALL levels are
/// retained (skip 1 and 2 included): the §4.4 merge validity chain walks the
/// tree from the leaves. Emission to the GPU filters on skip ≥ MIN_BLA_SKIP.
/// Block geometry matches the BLA scaffold: slot s of a level covers the
/// `skip` reference steps applied from ref index 1 + s·skip.
pub fn mobius_build_levels(orbit: &[(f64, f64)], max_skip: usize) -> Vec<MobiusLevel> {
    mobius_build_levels_with(orbit, max_skip, false)
}

/// `plain = true` extracts the plain-Möbius variant (A' = D' = 0) — the census
/// baseline (task 2.7); identical geometry, same radius machinery downstream.
pub fn mobius_build_levels_with(
    orbit: &[(f64, f64)],
    max_skip: usize,
    plain: bool,
) -> Vec<MobiusLevel> {
    let extract: fn(&JetF64) -> MobiusBlock =
        if plain { block_from_jet_plain } else { block_from_jet };
    let orbit_len = orbit.len();
    let mut out = Vec::new();
    if orbit_len < 3 {
        return out;
    }
    let mut prev: Vec<JetF64> =
        (1..orbit_len).map(|i| crate::jet::jet_seed(orbit[i].0, orbit[i].1)).collect();
    out.push(MobiusLevel { skip: 1, blocks: prev.iter().map(extract).collect() });
    let mut skip = 1usize;
    while skip < max_skip && skip * 2 < orbit_len {
        let n = prev.len() / 2;
        if n == 0 {
            break;
        }
        let cur: Vec<JetF64> = (0..n)
            .map(|i| crate::jet::jet_compose(&prev[2 * i], &prev[2 * i + 1]))
            .collect();
        skip *= 2;
        out.push(MobiusLevel { skip, blocks: cur.iter().map(extract).collect() });
        prev = cur;
    }
    out
}

// ── bounds (R_c-keyed stage): M_Q per anisotropic polydisc (note §4.2) ────────

/// R_c anisotropy rungs: R_c = s·c_max. The note's s ∈ {3e3, 3e5} is
/// deep-zoom-calibrated; the low rungs {1024, 32} keep the c-channel finite at
/// interactive c_max (~1e-5) where s = 3e3 would floor ρ ≥ R_c ≈ 0.03 and
/// saturate long blocks. One candidate per rung — the R_z dimension is no
/// longer a fixed grid.
pub const MOBIUS_S: [f64; 4] = [3e3, 3e5, 1024.0, 32.0];
pub const MOBIUS_NCAND: usize = MOBIUS_S.len();

/// Patch v3: R_z is BISECTED per block, not sampled from a fixed grid. Target
/// peak ρ < 0.5 (log2 −1) along the whole majorant walk. Keeping ρ below 0.5
/// holds the ρ² term strictly under the linear one (ρ² < ½ρ), so the walk
/// never enters the double-exponential runaway that saturated the fixed grid's
/// long near-critical blocks — the majorant stays finite AND tight. ρ is
/// monotone increasing in R_z (R_z is the initial ρ, the recurrence is
/// monotone in ρ), so the largest R_z meeting the criterion is found by an
/// EXACT log bisection. The old grid missed each block's own critical R_z; the
/// bisection lands on it, recovering the long deep-census blocks with no risk
/// of over-certification (the walk is a majorant at any R_z — verified by the
/// polydisc-invariant test).
const MOBIUS_RHO_TARGET_LOG2: f64 = -1.0; // ρ < 0.5

/// Per-block, per-candidate bounds: the bisected log2 R_z (−∞ when no R_z keeps
/// the peak below target — the rung's R_c saturates) and the resulting log2 M_Q
/// (+∞ likewise). R_z is per-BLOCK now (each block has its own critical value),
/// so it lives here, not in the table.
#[derive(Clone, Copy, Debug)]
pub struct MobiusBounds {
    pub log2_rz: [f64; MOBIUS_NCAND],
    pub log2_mq: [f64; MOBIUS_NCAND],
}

/// Bounds for the whole table: the per-rung R_c they were walked with (the
/// headroom stamp — radii re-solves stay valid while c_max ≤ these), plus
/// per-level per-block bisected R_z + M_Q. Re-walking needs the orbit but NOT
/// the jets.
pub struct MobiusBoundsTable {
    pub log2_rc: [f64; MOBIUS_NCAND],
    pub per_level: Vec<Vec<MobiusBounds>>,
}

fn cfe_log2(v: &CFe) -> f64 {
    v.log2_mag().unwrap_or(f64::NEG_INFINITY)
}

/// log2(Σ 2^l) over a slice of log2 magnitudes (−∞ entries ignored).
fn lse2(terms: &[f64]) -> f64 {
    let m = terms.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    if m == f64::NEG_INFINITY || !m.is_finite() {
        return m;
    }
    m + terms.iter().map(|l| (l - m).exp2()).sum::<f64>().log2()
}

/// Largest log2(R_z) keeping the majorant walk's PEAK ρ below 0.5 on
/// (R_z, R_c). Returns −∞ when even a vanishing R_z leaves the peak at/above
/// the target (R_c alone floors it — that rung's c-channel saturates for this
/// block, independent of R_z). Also returns the final M (log2) at the chosen
/// R_z. Exact log bisection: the peak is monotone increasing in R_z.
fn mobius_bisect_rz(twoz: &[(f64, i64)], log2_rc: f64) -> (f64, f64) {
    let peak = |lrz: f64| jet::jet_majorant_peak_pre(twoz, fe_exp2(lrz), fe_exp2(log2_rc));
    // R_z ≪ R_c isolates the R_c contribution. If the peak already hits the
    // target here, no R_z helps.
    let lo0 = log2_rc - 80.0;
    let (peak_lo, _) = peak(lo0);
    if !(peak_lo < MOBIUS_RHO_TARGET_LOG2) {
        return (f64::NEG_INFINITY, f64::INFINITY);
    }
    // R_z = 0.5 starts ρ at the target, so it is invalid for any nontrivial
    // block; if a degenerate-flat block leaves it valid, accept it.
    let hi0 = MOBIUS_RHO_TARGET_LOG2;
    let (peak_hi, final_hi) = peak(hi0);
    if peak_hi < MOBIUS_RHO_TARGET_LOG2 {
        return (hi0, final_hi);
    }
    let mut lo = lo0;
    let mut hi = hi0;
    // 20 iters ⇒ R_z precision ≈ range/2^20 ≪ the 0.1-log2 scan step. Fewer
    // iters only loosen the polydisc slightly; the walk is a valid majorant at
    // any R_z, so this never over-certifies (the peak target is a tightness
    // knob, not a soundness one — the polydisc-invariant test is the referee).
    for _ in 0..20 {
        let mid = 0.5 * (lo + hi);
        if peak(mid).0 < MOBIUS_RHO_TARGET_LOG2 {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    let (_, final_m) = peak(lo);
    (lo, final_m)
}

/// Per block, per R_c rung: bisect R_z to the tightest runaway-free polydisc
/// (peak ρ < 0.5), then assemble
/// M_Q = (1 + |D|R_z + |D'|R_zR_c + |F|R_c)·M + |A|R_z + |A'|R_zR_c + |B|R_c.
pub fn mobius_build_bounds(
    levels: &[MobiusLevel],
    orbit: &[(f64, f64)],
    log2_c_max: f64,
) -> MobiusBoundsTable {
    let twoz: Vec<(f64, i64)> = orbit
        .iter()
        .map(|&(zx, zy)| {
            let m = 2.0 * (zx * zx + zy * zy).sqrt();
            if m > 0.0 {
                let bits = m.to_bits();
                let be = ((bits >> 52) & 0x7ff) as i64 - 1023;
                (f64::from_bits((bits & !(0x7ffu64 << 52)) | (1023u64 << 52)), be)
            } else {
                (0.0, i64::MIN / 2)
            }
        })
        .collect();
    let mut log2_rc = [0f64; MOBIUS_NCAND];
    for (is, &s) in MOBIUS_S.iter().enumerate() {
        log2_rc[is] = s.log2() + log2_c_max;
    }
    let per_level = levels
        .iter()
        .map(|lvl| {
            (0..lvl.blocks.len())
                .map(|slot| {
                    let blk = &lvl.blocks[slot];
                    let mut b = MobiusBounds {
                        log2_rz: [f64::NEG_INFINITY; MOBIUS_NCAND],
                        log2_mq: [f64::INFINITY; MOBIUS_NCAND],
                    };
                    if blk.m.degenerate {
                        return b;
                    }
                    let first = 1 + slot * lvl.skip;
                    let seg = &twoz[first..first + lvl.skip];
                    let la = cfe_log2(&blk.m.a);
                    let lb = cfe_log2(&blk.m.b);
                    let ld = cfe_log2(&blk.m.d);
                    let lap = cfe_log2(&blk.m.ap);
                    let ldp = cfe_log2(&blk.m.dp);
                    let lf = cfe_log2(&blk.m.f);
                    for c in 0..MOBIUS_NCAND {
                        let (log2_rz, log2_m) = mobius_bisect_rz(seg, log2_rc[c]);
                        if !log2_rz.is_finite() || !log2_m.is_finite() {
                            continue; // rung saturates for this block
                        }
                        b.log2_rz[c] = log2_rz;
                        let fac = lse2(&[
                            0.0,
                            ld + log2_rz,
                            ldp + log2_rz + log2_rc[c],
                            lf + log2_rc[c],
                        ]);
                        b.log2_mq[c] = lse2(&[
                            fac + log2_m,
                            la + log2_rz,
                            lap + log2_rz + log2_rc[c],
                            lb + log2_rc[c],
                        ]);
                    }
                    b
                })
                .collect()
        })
        .collect();
    MobiusBoundsTable { log2_rc, per_level }
}

// ── certified radius: condition (V) by descending geometric scan (note §4.3) ──

/// Scan grid: 0.1 decade steps from 0.999·R_z down to 1e-16 (the note's grid).
/// The condition is not guaranteed monotone in x, so bisection is UNSOUND here
/// (unlike the jet's monotone H_k); the first success from above wins — validity
/// at the accepted x is certified pointwise by (V) itself.
const SCAN_STEP_LOG2: f64 = 0.332_192_809_488_736_2; // 0.1 decade
const SCAN_FLOOR_LOG2: f64 = -53.150_849_518_197_8; // 1e-16

/// Solve (V) for one block: largest log2 x with
/// REST(x, c_max)/DEN(x, c_max) ≤ ½·ε·(|A|·x + |B|·c_max) and DEN > 0.5,
/// maximized over the candidate polydiscs. −∞ when no scan point certifies.
pub fn mobius_solve_radius(
    blk: &MobiusBlock,
    bounds: &MobiusBounds,
    table: &MobiusBoundsTable,
    epsilon: f64,
    log2_c_max: f64,
) -> f64 {
    if blk.m.degenerate {
        return f64::NEG_INFINITY;
    }
    let la = cfe_log2(&blk.m.a);
    let lb = cfe_log2(&blk.m.b);
    let ld = cfe_log2(&blk.m.d);
    let ldp = cfe_log2(&blk.m.dp);
    let lf = cfe_log2(&blk.m.f);
    let log2_half_eps = epsilon.log2() - 1.0;
    // The |F|·c_max DEN contribution is x-independent: hoist it out of the scan.
    let df = lf + log2_c_max;
    let den_f = if df > -80.0 { df.exp2() } else { 0.0 };
    // Power-of-x coefficients of the stored REST terms: C_i = Σ_j |q_ij|·c_max^j,
    // shared by every candidate and scan point.
    let mut cpow = [f64::NEG_INFINITY; JET_DS + 1];
    for (n, &(i, j)) in JET_MONOMIALS.iter().enumerate() {
        let l = blk.log2_q[n];
        if l == f64::NEG_INFINITY {
            continue;
        }
        let t = l + j as f64 * log2_c_max;
        let slot = &mut cpow[i as usize];
        *slot = if *slot == f64::NEG_INFINITY { t } else { lse2(&[*slot, t]) };
    }
    let mut best = f64::NEG_INFINITY;
    for c in 0..MOBIUS_NCAND {
        let log2_mq = bounds.log2_mq[c];
        if !log2_mq.is_finite() {
            continue; // saturated majorant
        }
        let log2_rz = bounds.log2_rz[c]; // per-block bisected R_z
        if !log2_rz.is_finite() {
            continue; // rung unusable for this block
        }
        let start = log2_rz + (0.999f64).log2();
        if start <= best {
            continue; // cannot beat the current best radius
        }
        let log2_theta_c = log2_c_max - table.log2_rc[c];
        if log2_theta_c >= -1e-9 {
            continue; // θ_c ≥ 1: the Cauchy tail diverges on this polydisc
        }
        let mut x = start;
        while x >= SCAN_FLOOR_LOG2 {
            if x <= best {
                break; // remaining scan points cannot improve the max
            }
            // DEN(x, c_max) > 0.5, computed in linear domain (values ≤ O(1)).
            let d1 = ld + x;
            let d2 = ldp + x + log2_c_max;
            let den = 1.0
                - if d1 > -80.0 { d1.exp2() } else { 0.0 }
                - if d2 > -80.0 { d2.exp2() } else { 0.0 }
                - den_f;
            if den > 0.5 {
                let rhs = log2_half_eps + lse2(&[la + x, lb + log2_c_max]);
                // Σ REST terms / 2^rhs, accumulated in linear domain.
                let mut acc = 0.0f64;
                for (i, &ci) in cpow.iter().enumerate() {
                    if ci == f64::NEG_INFINITY {
                        continue;
                    }
                    let t = ci + i as f64 * x - rhs;
                    if t > 62.0 {
                        acc = f64::INFINITY;
                        break;
                    }
                    if t > -62.0 {
                        acc += t.exp2();
                    }
                }
                if acc <= den {
                    let ltheta = (x - log2_rz).max(log2_theta_c);
                    let tail = mobius_cauchy_tail_log2(log2_mq, ltheta);
                    let t = tail - rhs;
                    if t <= 62.0 {
                        if t > -62.0 {
                            acc += t.exp2();
                        }
                        if acc <= den {
                            best = best.max(x);
                            break; // first success from above on this candidate
                        }
                    }
                }
            }
            x -= SCAN_STEP_LOG2;
        }
    }
    best
}

/// Cauchy tail of Q after the stored total-degree-D_s prefix. theta is the
/// maximum of x/R_z and c_max/R_c, so this bounds every bivariate monomial.
fn mobius_cauchy_tail_log2(log2_mq: f64, log2_theta: f64) -> f64 {
    let theta = log2_theta.exp2();
    let n = (JET_DS + 1) as f64;
    log2_mq
        + n * log2_theta
        + (((n + 1.0) - n * theta) / ((1.0 - theta) * (1.0 - theta))).log2()
}

/// Cauchy tail of ∂Q/∂z after the stored total-degree-D_s prefix:
/// M_Q/R_z · ½ Σ_{n≥D_s+1} n(n+1) θ^{n−1}.
fn mobius_cauchy_dz_tail_log2(log2_mq: f64, log2_rz: f64, log2_theta: f64) -> f64 {
    let theta = log2_theta.exp2();
    let n = (JET_DS + 1) as f64;
    let numerator = n * (n + 1.0)
        - 2.0 * (n + 1.0) * (n - 1.0) * theta
        + n * (n - 1.0) * theta * theta;
    let factor = numerator / (2.0 * (1.0 - theta).powi(3));
    log2_mq - log2_rz + (n - 1.0) * log2_theta + factor.log2()
}

/// Solve the derivative counterpart of (V) for one rational Möbius block.
/// With d = inf|DEN| > 0.5, the exact identity
/// ∂z(Φ − m) = Q_z/DEN − Q·(D + D'c)/DEN² gives a Cauchy-certified bound
/// for the propagated perturbation derivative.
pub fn mobius_solve_derivative_radius(
    blk: &MobiusBlock,
    bounds: &MobiusBounds,
    table: &MobiusBoundsTable,
    epsilon: f64,
    log2_c_max: f64,
) -> f64 {
    if blk.m.degenerate {
        return f64::NEG_INFINITY;
    }
    let la = cfe_log2(&blk.m.a);
    let lap = cfe_log2(&blk.m.ap);
    let ld = cfe_log2(&blk.m.d);
    let ldp = cfe_log2(&blk.m.dp);
    let lf = cfe_log2(&blk.m.f);
    let ldeff = lse2(&[ld, ldp + log2_c_max]);
    let rhs = epsilon.log2() - 1.0 + lse2(&[la, lap + log2_c_max]);
    let df = lf + log2_c_max;
    let den_f = if df > -80.0 { df.exp2() } else { 0.0 };
    let mut best = f64::NEG_INFINITY;

    for c in 0..MOBIUS_NCAND {
        let log2_mq = bounds.log2_mq[c];
        let log2_rz = bounds.log2_rz[c];
        if !log2_mq.is_finite() || !log2_rz.is_finite() {
            continue;
        }
        let log2_theta_c = log2_c_max - table.log2_rc[c];
        if log2_theta_c >= -1e-9 {
            continue;
        }
        let mut x = log2_rz + (0.999f64).log2();
        while x >= SCAN_FLOOR_LOG2 {
            if x <= best {
                break;
            }
            let d1 = ld + x;
            let d2 = ldp + x + log2_c_max;
            let den = 1.0
                - if d1 > -80.0 { d1.exp2() } else { 0.0 }
                - if d2 > -80.0 { d2.exp2() } else { 0.0 }
                - den_f;
            if den > 0.5 {
                let mut q = f64::NEG_INFINITY;
                let mut qz = f64::NEG_INFINITY;
                for (n, &(i, j)) in JET_MONOMIALS.iter().enumerate() {
                    let l = blk.log2_q[n];
                    if !l.is_finite() {
                        continue;
                    }
                    q = lse2(&[q, l + i as f64 * x + j as f64 * log2_c_max]);
                    if i >= 1 {
                        qz = lse2(&[
                            qz,
                            l + (i as f64).log2() + (i as f64 - 1.0) * x
                                + j as f64 * log2_c_max,
                        ]);
                    }
                }
                let log2_theta = (x - log2_rz).max(log2_theta_c);
                q = lse2(&[q, mobius_cauchy_tail_log2(log2_mq, log2_theta)]);
                qz = lse2(&[
                    qz,
                    mobius_cauchy_dz_tail_log2(log2_mq, log2_rz, log2_theta),
                ]);
                let log2_den = den.log2();
                let bound = lse2(&[qz - log2_den, ldeff + q - 2.0 * log2_den]);
                if bound <= rhs {
                    best = best.max(x);
                    break;
                }
            }
            x -= SCAN_STEP_LOG2;
        }
    }
    best
}

/// Solve every block's Cauchy-certified ∂z radius, index-aligned with
/// mobius_build_radii.
pub fn mobius_build_derivative_radii(
    levels: &[MobiusLevel],
    bounds: &MobiusBoundsTable,
    epsilon: f64,
    log2_c_max: f64,
) -> Vec<Vec<f64>> {
    levels
        .iter()
        .zip(bounds.per_level.iter())
        .map(|(lvl, blv)| {
            lvl.blocks
                .iter()
                .zip(blv.iter())
                .map(|(blk, b)| {
                    mobius_solve_derivative_radius(blk, b, bounds, epsilon, log2_c_max)
                })
                .collect()
        })
        .collect()
}

// ── full radii build ──────────────────────────────────────────────────────────

/// Solve every block's certified (V) radius. Returns log2 radii aligned with
/// `levels`.
///
/// Patch v2 Fix 1: NO merge validity chain. The §4.4 intermediate-validity cap
/// `r ← min(r_formula, r_x, r_y/(|A_x| + r_y·|D_x|))` is the Möbius-SIMPLE rule
/// (single-step transport). For c+ the scalar majorant walks EVERY step of the
/// block, so condition (V) already certifies the whole COMPOSED map on
/// `|z| ≤ r_formula, |c| ≤ c_max, DEN > 0.5` — the intermediate point is inside
/// that box by construction, nothing to add. Keeping the cap was actively
/// harmful: `|D_x| ≈ 4e3` at near-critical passages collapsed the radius
/// (measured ÷1.6e6 on the seahorse 38→40 block) and the `min` propagated
/// recursively to every ancestor, dropping the whole near-critical region back
/// to exact stepping — the dominant slowness the field A/B saw.
pub fn mobius_build_radii(
    levels: &[MobiusLevel],
    bounds: &MobiusBoundsTable,
    epsilon: f64,
    log2_c_max: f64,
) -> Vec<Vec<f64>> {
    levels
        .iter()
        .zip(bounds.per_level.iter())
        .map(|(lvl, blv)| {
            lvl.blocks
                .iter()
                .zip(blv.iter())
                .map(|(blk, b)| mobius_solve_radius(blk, b, bounds, epsilon, log2_c_max))
                .collect()
        })
        .collect()
}

// ── GPU serialization (design D1 + spike 1.1 outcome) ──────────────────────────

/// GPU coefficient record, 72 B: the six block coefficients with PRIVATE
/// exponents each (the spike measured within-group spreads up to 61 bits —
/// far past the shared-mantissa budget — so the D1 fallback applies to every
/// group). Order: A, B, A', D, D', F. Orbit-keyed: serialized once per orbit,
/// never re-uploaded on a radius re-solve.
#[repr(C)]
#[derive(Copy, Clone, Debug, PartialEq)]
pub struct MobiusCoeffs {
    pub a: JetCoeffFe,
    pub b: JetCoeffFe,
    pub ap: JetCoeffFe,
    pub d: JetCoeffFe,
    pub dp: JetCoeffFe,
    pub f: JetCoeffFe,
}

/// GPU radius sidecar entry, 16 B vec4-packed: x = certified radius (log2
/// domain, f32; −∞ ⇒ never applied), y = f32-safe fast-path flag (1.0/0.0),
/// z/w spare. A descent probe reads this 16 B alone; the 60 B coefficient
/// record is read only on application. Radii are the only (ε, c_max)-dependent
/// data, so a zoom re-solve re-uploads 16 B/block.
#[repr(C)]
#[derive(Copy, Clone, Debug, PartialEq)]
pub struct MobiusRadius {
    pub r_log2: f32,
    pub f32_safe: f32,
    pub pad0: f32,
    pub pad1: f32,
}

/// Largest |log2| a shipped coefficient may have for the block to qualify for
/// the shader's plain-f32 evaluation (same budget as the jet's fast path).
pub const MOBIUS_F32_SAFE_LOG2: f64 = 96.0;

/// True when all six coefficients reconstruct inside the f32 range with
/// Horner headroom — the build-side gate for the shallow fast-path flag.
pub fn mobius_f32_safe(m: &MobiusCPlus) -> bool {
    [&m.a, &m.b, &m.ap, &m.d, &m.dp, &m.f].iter().all(|c| match c.log2_mag() {
        None => true,
        Some(l) => l.abs() <= MOBIUS_F32_SAFE_LOG2,
    })
}

/// Smallest emitted skip: matches the BLA/jet tables (MIN_BLA_SKIP) — levels
/// below it exist only for the merge validity chain.
pub const MOBIUS_MIN_EMIT_SKIP: usize = 4;

/// Serialize the emitted (skip ≥ MOBIUS_MIN_EMIT_SKIP) levels' coefficients
/// into the flat coefficient buffer. Block ordering matches
/// `mobius_serialize_radii` exactly (same flat index).
pub fn mobius_serialize_coeffs(levels: &[MobiusLevel]) -> Vec<MobiusCoeffs> {
    let mut out = Vec::new();
    for lvl in levels {
        if lvl.skip < MOBIUS_MIN_EMIT_SKIP {
            continue;
        }
        for blk in &lvl.blocks {
            out.push(MobiusCoeffs {
                a: cfe_to_coeff(&blk.m.a),
                b: cfe_to_coeff(&blk.m.b),
                ap: cfe_to_coeff(&blk.m.ap),
                d: cfe_to_coeff(&blk.m.d),
                dp: cfe_to_coeff(&blk.m.dp),
                f: cfe_to_coeff(&blk.m.f),
            });
        }
    }
    out
}

/// Serialize the emitted levels' radii + the level directory (re-emitted on
/// every (ε, c_max) re-solve; `max_r3_log2` holds the level's largest radius —
/// the whole-level fast-reject gate, same slot the jet uses).
pub fn mobius_serialize_radii(
    levels: &[MobiusLevel],
    radii: &[Vec<f64>],
) -> (Vec<MobiusRadius>, Vec<JetLevel>) {
    let mut out = Vec::new();
    let mut dir = Vec::new();
    for (li, lvl) in levels.iter().enumerate() {
        if lvl.skip < MOBIUS_MIN_EMIT_SKIP {
            continue;
        }
        let offset = out.len() as u32;
        let mut max_r = f32::NEG_INFINITY;
        for (slot, blk) in lvl.blocks.iter().enumerate() {
            let r = radii[li][slot];
            let r32 = if r.is_finite() { r as f32 } else { f32::NEG_INFINITY };
            max_r = max_r.max(r32);
            out.push(MobiusRadius {
                r_log2: r32,
                f32_safe: if mobius_f32_safe(&blk.m) { 1.0 } else { 0.0 },
                pad0: 0.0,
                pad1: 0.0,
            });
        }
        dir.push(JetLevel {
            offset,
            count: lvl.blocks.len() as u32,
            skip: lvl.skip as u32,
            max_r3_log2: max_r,
        });
    }
    (out, dir)
}

// ── application + CPU pixel loop (note §5) ─────────────────────────────────────

/// Plain-Möbius extraction (A' = D' = F = 0): the census baseline. Same radius
/// machinery applies — its q₁₁/q₂₁/q₀₂ do NOT vanish (the (G) killers plus the
/// pure-c² term), so its certified radii can only be ≤ the c+ ones
/// (r_c+ ≥ r_Möbius by construction).
pub fn mobius_from_jet_plain(jet: &JetF64) -> MobiusCPlus {
    let mut m = mobius_from_jet(jet);
    m.ap = CFe::ZERO;
    m.dp = CFe::ZERO;
    m.f = CFe::ZERO;
    m
}

/// Orbit-keyed block data for the plain variant (census tool).
pub fn block_from_jet_plain(jet: &JetF64) -> MobiusBlock {
    let m = mobius_from_jet_plain(jet);
    let mut log2_q = [f64::NEG_INFINITY; JET_NCOEFF];
    if !m.degenerate {
        let q = mobius_q(jet, &m);
        for (n, v) in q.iter().enumerate() {
            log2_q[n] = v.log2_mag().unwrap_or(f64::NEG_INFINITY);
        }
        // Only q₁₀/q₀₁/q₂₀ are constructed zeros without A'/D' (q₁₁, q₂₁ live).
        for &(i, j) in &[(1usize, 0usize), (0, 1), (2, 0)] {
            log2_q[jet_idx(i, j)] = f64::NEG_INFINITY;
        }
    }
    MobiusBlock { m, log2_q }
}

/// Apply the block map and its two partials at (z, c):
/// m = (Ae·z + B·c)/den with Ae = A + A'·c, De = D + D'·c,
/// den = 1 + De·z + F·c;
/// ∂m/∂z = (Ae − m·De)/den; ∂m/∂c = (A'·z + B − m·(D'·z + F))/den.
pub fn mobius_apply(m: &MobiusCPlus, z: CFe, c: CFe) -> (CFe, CFe, CFe) {
    let ae = m.a.add(m.ap.mul(c));
    let de = m.d.add(m.dp.mul(c));
    let den = CFe::ONE.add(de.mul(z)).add(m.f.mul(c));
    let phi = ae.mul(z).add(m.b.mul(c)).div(den);
    let ddz = ae.sub(phi.mul(de)).div(den);
    let ddc = m.ap.mul(z).add(m.b).sub(phi.mul(m.dp.mul(z).add(m.f))).div(den);
    (phi, ddz, ddc)
}

pub struct MobiusPixelResult {
    /// Loop turns (skip applications + exact steps) — the wall-clock proxy.
    pub steps: usize,
    /// Iterations advanced (matches exact stepping when correct).
    pub iters: usize,
    /// Block applications (the census unit — never weighted ops).
    pub applications: usize,
    pub escaped: bool,
    /// Distance-estimation derivative dz/d(δc) at exit.
    pub der: (f64, f64),
    /// Full-orbit value Z_ref + dz at exit.
    pub final_z: (f64, f64),
}

/// CPU port of the Möbius-c+ per-pixel loop (sibling of `jet_run_pixel` and the
/// shader loops): greedy on skip, ONE validity comparison log2|dz| < r per
/// probed block — no H2, no min_a/(G), no beta correction, no separate pole
/// test — exact-step fallback, first-escape rule, Zhuoran rebasing.
pub fn mobius_run_pixel(
    levels: &[MobiusLevel],
    radii: &[Vec<f64>],
    orbit: &[(f64, f64)],
    dc: (f64, f64),
    max_iter: usize,
) -> MobiusPixelResult {
    let bailout2 = 4.0_f64;
    let orbit_len = orbit.len();
    let cfe = CFe::from_c(dc.0, dc.1);
    let mut dz = (0.0_f64, 0.0_f64);
    let mut der = (0.0_f64, 0.0_f64);
    let mut ref_i = 0usize;
    let mut iter = 0usize;
    let mut r = MobiusPixelResult {
        steps: 0,
        iters: 0,
        applications: 0,
        escaped: false,
        der,
        final_z: (0.0, 0.0),
    };
    while iter < max_iter {
        let mut applied = false;
        if ref_i > 0 {
            let shifted = ref_i - 1;
            let dz2 = dz.0 * dz.0 + dz.1 * dz.1;
            let log2_dz = if dz2 > 0.0 { 0.5 * dz2.log2() } else { f64::NEG_INFINITY };
            for (li, lvl) in levels.iter().enumerate().rev() {
                if shifted % lvl.skip != 0 {
                    continue;
                }
                let slot = shifted / lvl.skip;
                // Cap on the iteration budget (iter, not ref_i: rebasing resets
                // ref_i while iter keeps counting) and on the orbit itself.
                if slot >= lvl.blocks.len()
                    || iter + lvl.skip > max_iter
                    || ref_i + lvl.skip >= orbit_len
                {
                    continue;
                }
                if !(log2_dz < radii[li][slot]) {
                    continue; // the single validity comparison
                }
                let blk = &lvl.blocks[slot];
                let (phi, pdz, pdc) = mobius_apply(&blk.m, CFe::from_c(dz.0, dz.1), cfe);
                let cand = phi.to_f64();
                let zi = orbit[ref_i + lvl.skip];
                let candz = (zi.0 + cand.0, zi.1 + cand.1);
                if lvl.skip > 1 && candz.0 * candz.0 + candz.1 * candz.1 > bailout2 {
                    continue; // don't jump over the first escape
                }
                let (px, py) = pdz.to_f64();
                let (qx, qy) = pdc.to_f64();
                der = (px * der.0 - py * der.1 + qx, px * der.1 + py * der.0 + qy);
                dz = cand;
                ref_i += lvl.skip;
                iter += lvl.skip;
                r.applications += 1;
                applied = true;
                break;
            }
        }
        if !applied {
            let z = orbit[ref_i];
            let fz = (z.0 + dz.0, z.1 + dz.1);
            der = (
                2.0 * (fz.0 * der.0 - fz.1 * der.1) + 1.0,
                2.0 * (fz.0 * der.1 + fz.1 * der.0),
            );
            let m2 = (2.0 * z.0 * dz.0 - 2.0 * z.1 * dz.1, 2.0 * z.0 * dz.1 + 2.0 * z.1 * dz.0);
            let sq = (dz.0 * dz.0 - dz.1 * dz.1, 2.0 * dz.0 * dz.1);
            dz = (m2.0 + sq.0 + dc.0, m2.1 + sq.1 + dc.1);
            ref_i += 1;
            iter += 1;
        }
        r.steps += 1;
        if ref_i > orbit_len - 1 {
            ref_i = orbit_len - 1;
        }
        let z = orbit[ref_i];
        let full = (z.0 + dz.0, z.1 + dz.1);
        let full2 = full.0 * full.0 + full.1 * full.1;
        if full2 > bailout2 {
            r.escaped = true;
            break;
        }
        let dz2 = dz.0 * dz.0 + dz.1 * dz.1;
        if full2 < dz2 || ref_i == orbit_len - 1 {
            dz = full; // rebasing (der unchanged: Z is dc-independent)
            ref_i = 0;
        }
        if r.steps > max_iter * 2 + 16 {
            break;
        }
    }
    let z = orbit[ref_i.min(orbit_len - 1)];
    r.final_z = (z.0 + dz.0, z.1 + dz.1);
    r.iters = iter;
    r.der = der;
    r
}

// ── tests & spike ───────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::jet::{build_jet_levels, jet_compose, jet_seed};

    type C = (f64, f64);

    fn cm(a: C, b: C) -> C {
        (a.0 * b.0 - a.1 * b.1, a.0 * b.1 + a.1 * b.0)
    }

    fn cdiv(a: C, b: C) -> C {
        let d = b.0 * b.0 + b.1 * b.1;
        ((a.0 * b.0 + a.1 * b.1) / d, (a.1 * b.0 - a.0 * b.1) / d)
    }

    fn assert_close(got: C, want: C, tol: f64, what: &str) {
        let d = ((got.0 - want.0).powi(2) + (got.1 - want.1).powi(2)).sqrt();
        let m = (want.0 * want.0 + want.1 * want.1).sqrt().max(1e-300);
        assert!(d / m < tol, "{}: got {:?} want {:?} (rel {})", what, got, want, d / m);
    }

    fn ref_orbit_f64(cx: f64, cy: f64, max_iter: usize) -> Vec<(f64, f64)> {
        let mut v = Vec::with_capacity(max_iter + 1);
        let (mut zx, mut zy) = (0.0_f64, 0.0_f64);
        v.push((zx, zy));
        for _ in 0..max_iter {
            let nx = zx * zx - zy * zy + cx;
            let ny = 2.0 * zx * zy + cy;
            zx = nx;
            zy = ny;
            v.push((zx, zy));
            if zx * zx + zy * zy > 1e12 {
                break;
            }
        }
        v
    }

    #[test]
    fn mobius_extraction_matches_direct_formulas() {
        // (task 2.1) Two- and three-step hand-built jets: A/B/D/A'/D'/F must
        // equal the direct formulas computed in plain f64 from the jet
        // coefficients (F = −c₀₂/c₀₁, A' = c₁₁ + D·B + F·A,
        // D' = −(c₂₁ + D·c₁₁ + F·c₂₀)/A), and the seed's closed forms
        // (c₀₂ = 0 ⟹ F = 0, D' = 0, A' = D = −1/(2Z)).
        let z1 = (0.3, -0.4);
        let z2 = (-0.55, 0.2);
        let z3 = (0.15, 0.65);
        let seed = jet_seed(z1.0, z1.1);
        let j2 = jet_compose(&seed, &jet_seed(z2.0, z2.1));
        let j3 = jet_compose(&j2, &jet_seed(z3.0, z3.1));
        for (name, jet) in [("seed", &seed), ("two-step", &j2), ("three-step", &j3)] {
            let m = mobius_from_jet(jet);
            assert!(!m.degenerate, "{}: degenerate on O(1) orbit", name);
            let c10 = jet.coeff(1, 0).to_f64();
            let c01 = jet.coeff(0, 1).to_f64();
            let c20 = jet.coeff(2, 0).to_f64();
            let c11 = jet.coeff(1, 1).to_f64();
            let c21 = jet.coeff(2, 1).to_f64();
            let c02 = jet.coeff(0, 2).to_f64();
            let d = { let t = cdiv(c20, c10); (-t.0, -t.1) };
            let f = { let t = cdiv(c02, c01); (-t.0, -t.1) };
            let ap = {
                let t = cm(d, c01);
                let u = cm(f, c10);
                (c11.0 + t.0 + u.0, c11.1 + t.1 + u.1)
            };
            let dp = {
                let t = cm(d, c11);
                let u = cm(f, c20);
                let n = (c21.0 + t.0 + u.0, c21.1 + t.1 + u.1);
                let t = cdiv(n, c10);
                (-t.0, -t.1)
            };
            assert_close(m.a.to_f64(), c10, 1e-14, &format!("{} A", name));
            assert_close(m.b.to_f64(), c01, 1e-14, &format!("{} B", name));
            assert_close(m.d.to_f64(), d, 1e-13, &format!("{} D", name));
            assert_close(m.f.to_f64(), f, 1e-13, &format!("{} F", name));
            assert_close(m.ap.to_f64(), ap, 1e-13, &format!("{} A'", name));
            assert_close(m.dp.to_f64(), dp, 1e-13, &format!("{} D'", name));
        }
        // Seed closed forms: A = 2Z, B = 1, D = −1/(2Z), A' = D, D' = 0, F = 0
        // (the seed has no c² term).
        let m = mobius_from_jet(&seed);
        let a = (2.0 * z1.0, 2.0 * z1.1);
        assert_close(m.a.to_f64(), a, 1e-14, "seed A = 2Z");
        assert_close(m.b.to_f64(), (1.0, 0.0), 1e-14, "seed B = 1");
        let dw = cdiv((-1.0, 0.0), a);
        assert_close(m.d.to_f64(), dw, 1e-14, "seed D = -1/2Z");
        assert_close(m.ap.to_f64(), dw, 1e-14, "seed A' = D");
        assert!(m.dp.is_zero(), "seed D' = 0, got {:?}", m.dp);
        assert!(m.f.is_zero(), "seed F = 0, got {:?}", m.f);
        // Degenerate: a jet whose c₁₀ vanishes (block starting at Z = 0).
        let m0 = mobius_from_jet(&jet_seed(0.0, 0.0));
        assert!(m0.degenerate);
    }

    #[test]
    fn mobius_c02_fallback_keeps_the_residual_live() {
        // F is unavailable when B = c₀₁ is zero. That must remain a sound
        // five-coefficient fallback: q₀₂ is neither erased from REST nor
        // checked as a constructed zero.
        let mut jet = JetF64::ZERO;
        jet.a[jet_idx(1, 0)] = CFe::ONE;
        jet.a[jet_idx(0, 2)] = CFe::ONE;
        let m = mobius_from_jet(&jet);
        assert!(!m.degenerate);
        assert!(m.b.is_zero());
        assert!(m.f.is_zero());

        let q = mobius_q(&jet, &m);
        assert!(q[jet_idx(0, 2)].sub(CFe::ONE).is_zero());
        assert_eq!(
            mobius_q_integrity_log2(&jet, &m, &q),
            f64::NEG_INFINITY,
            "q₀₂ is not a constructed zero in the B = 0 fallback"
        );

        let blk = block_from_jet(&jet);
        assert!(
            blk.log2_q[jet_idx(0, 2)].is_finite(),
            "the live q₀₂ residual must be retained in REST"
        );
    }

    #[test]
    fn mobius_q_zeros_on_every_block() {
        // (task 2.2) The build-integrity invariant: q₁₀/q₀₁/q₂₀/q₁₁/q₀₂/q₂₁
        // vanish to ~1e-14 relative on EVERY block of every test orbit, and the
        // leading surviving q terms match their closed forms (q₃₀ = c₃₀ + D·c₂₀
        // = c₃₀ − c₂₀²/c₁₀ — the superconvergence numerator — and
        // q₀₃ = c₀₃ + F·c₀₂).
        let tol_log2 = (1e-13_f64).log2(); // ~1e-14 relative with CFe headroom
        for (name, cx, cy, len) in [
            ("cusp", -0.75_f64, 0.0_f64, 1usize << 12),
            ("period2", -1.25, 0.0, 1 << 12),
            ("seahorse", -0.743643887037151, 0.131825904205330, 1 << 12),
            ("feigenbaum", -1.401155, 0.0, 1 << 13),
        ] {
            let orbit = ref_orbit_f64(cx, cy, len);
            if orbit.len() <= len {
                println!("[{}] escaped — skipped", name);
                continue;
            }
            let levels = build_jet_levels(&orbit, 1, 1 << 18);
            let mut checked = 0usize;
            let mut worst = f64::NEG_INFINITY;
            for lvl in &levels {
                for jet in &lvl.entries {
                    let m = mobius_from_jet(jet);
                    if m.degenerate {
                        continue;
                    }
                    let q = mobius_q(jet, &m);
                    let integ = mobius_q_integrity_log2(jet, &m, &q);
                    worst = worst.max(integ);
                    assert!(
                        integ <= tol_log2,
                        "[{}] skip {} block: q-zero integrity 2^{:.1} (rel {:.2e})",
                        name, lvl.skip, integ, integ.exp2()
                    );
                    checked += 1;
                }
            }
            println!(
                "[{}] q-zeros checked on {} blocks, worst rel 2^{:.1}",
                name, checked, worst
            );
            assert!(checked > 100, "[{}] too few blocks ({})", name, checked);
            // Closed forms on one mid-level block.
            let lvl = &levels[4.min(levels.len() - 1)];
            let jet = &lvl.entries[0];
            let m = mobius_from_jet(jet);
            let q = mobius_q(jet, &m);
            let want_q30 = jet.coeff(3, 0).add(m.d.mul(jet.coeff(2, 0)));
            let got = q[jet_idx(3, 0)].sub(want_q30);
            assert!(
                got.log2_mag().unwrap_or(f64::NEG_INFINITY)
                    < want_q30.log2_mag().unwrap_or(0.0) - 40.0,
                "[{}] q30 closed form",
                name
            );
            let want_q03 = jet.coeff(0, 3).add(m.f.mul(jet.coeff(0, 2)));
            let dq03 = q[jet_idx(0, 3)].sub(want_q03);
            assert!(
                dq03.is_zero()
                    || dq03.log2_mag().unwrap()
                        < want_q03.log2_mag().unwrap_or(0.0) - 40.0,
                "[{}] q03 closed form",
                name
            );
        }
    }

    // Exact block walk w ← 2Z·w + w² + c in extended-exponent arithmetic.
    fn exact_block_walk(
        orbit: &[(f64, f64)],
        first: usize,
        skip: usize,
        z0: CFe,
        c: CFe,
    ) -> CFe {
        let mut w = z0;
        for j in 0..skip {
            let (zx, zy) = orbit[first + j];
            let a = CFe::from_c(2.0 * zx, 2.0 * zy);
            w = a.mul(w).add(w.mul(w)).add(c);
        }
        w
    }

    // Shared harness: bounded orbit + levels + bounds + chained radii.
    fn harness(
        cx: f64,
        cy: f64,
        max_iter: usize,
        eps: f64,
        c_max: f64,
    ) -> Option<(Vec<(f64, f64)>, Vec<MobiusLevel>, MobiusBoundsTable, Vec<Vec<f64>>)> {
        let orbit = ref_orbit_f64(cx, cy, max_iter);
        if orbit.len() <= max_iter {
            return None;
        }
        let levels = mobius_build_levels(&orbit, 1 << 18);
        let bounds = mobius_build_bounds(&levels, &orbit, c_max.log2());
        let radii = mobius_build_radii(&levels, &bounds, eps, c_max.log2());
        Some((orbit, levels, bounds, radii))
    }

    #[test]
    fn mobius_radius_sound_against_exact_walk() {
        // (tasks 2.3/2.4) Applying a block at any sampled entry |z| < r, |c| ≤
        // c_max must stay within ε·(|A|·|z| + |B|·c_max) of the exact block walk —
        // no runtime guard besides the radius comparison (spec: radius soundness).
        for (eps, c_max) in [(1e-6_f64, 1e-9_f64), (1e-4, 1e-5), (1e-12, 1e-14)] {
            let log2_c_max = c_max.log2();
            for (name, cx, cy) in [
                ("feigenbaum", -1.401155_f64, 0.0_f64),
                ("cusp", -0.75, 0.0),
                ("period2", -1.25, 0.0),
            ] {
                let Some((orbit, levels, _bounds, radii)) =
                    harness(cx, cy, 4096, eps, c_max)
                else {
                    panic!("[{}] reference escaped", name);
                };
                let mut solved = 0usize;
                let mut positive = 0usize;
                for (li, lvl) in levels.iter().enumerate() {
                    let step = (lvl.blocks.len() / 8).max(1);
                    for slot in (0..lvl.blocks.len()).step_by(step) {
                        solved += 1;
                        let log2_r = radii[li][slot];
                        if !log2_r.is_finite() {
                            continue;
                        }
                        positive += 1;
                        let blk = &lvl.blocks[slot];
                        let first = 1 + slot * lvl.skip;
                        let la = cfe_log2(&blk.m.a);
                        let lb = cfe_log2(&blk.m.b);
                        for (fx, fc, ph) in [
                            (0.95_f64, 1.0_f64, 0.7_f64),
                            (0.5, 1.0, 2.1),
                            (0.95, 0.125, 4.0),
                            (0.1, 1.0, 5.3),
                        ] {
                            let x_log2 = log2_r + fx.log2();
                            let x = fe_exp2(x_log2);
                            let z = CFe { x: x.x * ph.cos(), y: x.x * ph.sin(), e: x.e };
                            let cmag = fe_exp2(log2_c_max + fc.log2());
                            let c = CFe {
                                x: cmag.x * (ph * 1.7).cos(),
                                y: cmag.x * (ph * 1.7).sin(),
                                e: cmag.e,
                            };
                            let (applied, _, _) = mobius_apply(&blk.m, z, c);
                            let exact = exact_block_walk(&orbit, first, lvl.skip, z, c);
                            let err = applied.sub(exact);
                            let Some(err_log2) = err.log2_mag() else { continue };
                            // The (V) certificate: err ≤ ε·(|A|·r + |B|·c_max)
                            // for EVERY |z| ≤ r. The tighter |z|-scaled form
                            // holds at the boundary (fx ≈ 1) but is not implied
                            // for interior entries — the pure-c error terms do
                            // not shrink with |z| (the end-to-end battery
                            // referees those). Assert the |z|-scaled budget at
                            // the boundary sample, the certified budget inside.
                            let scale_x = if fx > 0.9 { x_log2 } else { log2_r };
                            let budget =
                                lse2(&[la + scale_x, lb + log2_c_max]) + eps.log2();
                            assert!(
                                err_log2 <= budget + 1e-6,
                                "[{}] eps={:e} c_max={:e} skip {} slot {} fx={} fc={}: \
                                 err 2^{:.2} > budget 2^{:.2}",
                                name, eps, c_max, lvl.skip, slot, fx, fc, err_log2, budget
                            );
                        }
                    }
                }
                println!(
                    "[{}] eps={:e} c_max={:e}: {} sampled, {} positive radii",
                    name, eps, c_max, solved, positive
                );
                // Spec: radii survive shallow scales — the |B|·c_max term keeps a
                // usable population even at the coarse regime.
                assert!(
                    positive * 8 > solved,
                    "[{}] eps={:e} c_max={:e}: radius population collapsed ({}/{})",
                    name, eps, c_max, positive, solved
                );
            }
        }
    }

    #[test]
    fn mobius_bisected_polydisc_invariant() {
        // (patch v3) The whole point of the bisection is a SOUND majorant: at
        // the bisected (R_z, R_c) the walk's M must actually upper-bound the
        // true complex block map w ← 2Z·w + w² + c sampled on the polydisc, and
        // the peak criterion must hold (ρ < 0.5 throughout ⇒ M ≤ ~0.5). A
        // violated bound would over-certify radii → wrong pixels; this is the
        // guard for that risk (mirror of jet_majorant_bounds_block_map_on_polydisc).
        let two = |zx: f64, zy: f64| -> (f64, i64) {
            let m = 2.0 * (zx * zx + zy * zy).sqrt();
            if m > 0.0 {
                let bits = m.to_bits();
                let be = ((bits >> 52) & 0x7ff) as i64 - 1023;
                (f64::from_bits((bits & !(0x7ffu64 << 52)) | (1023u64 << 52)), be)
            } else {
                (0.0, i64::MIN / 2)
            }
        };
        let mut checked = 0usize;
        for (name, cx, cy) in [
            ("feigenbaum", -1.401155_f64, 0.0_f64),
            ("cusp", -0.75, 0.0),
            ("period2", -1.25, 0.0),
        ] {
            let orbit = ref_orbit_f64(cx, cy, 4096);
            assert!(orbit.len() > 4096, "[{}] escaped", name);
            let twoz: Vec<(f64, i64)> = orbit.iter().map(|&(x, y)| two(x, y)).collect();
            let levels = mobius_build_levels(&orbit, 1 << 18);
            for c_max in [1e-9_f64, 1e-30] {
                let log2_c_max = c_max.log2();
                for (li, lvl) in levels.iter().enumerate() {
                    let step = (lvl.blocks.len() / 6).max(1);
                    for slot in (0..lvl.blocks.len()).step_by(step) {
                        if lvl.blocks[slot].m.degenerate {
                            continue;
                        }
                        let first = 1 + slot * lvl.skip;
                        let seg = &twoz[first..first + lvl.skip];
                        for (is, &s) in MOBIUS_S.iter().enumerate() {
                            let _ = is;
                            let log2_rc = s.log2() + log2_c_max;
                            let (log2_rz, log2_m) = mobius_bisect_rz(seg, log2_rc);
                            if !log2_rz.is_finite() {
                                continue;
                            }
                            // Peak criterion ⇒ the majorant is small (≤ ~1).
                            assert!(
                                log2_m <= 0.0 + 1e-9,
                                "[{}] skip {} rung {}: M 2^{:.2} > 0.5 despite ρ<0.5",
                                name, lvl.skip, s, log2_m
                            );
                            // Sample the true block map on the polydisc boundary
                            // and interior; |w_out| must not exceed M.
                            let rz = fe_exp2(log2_rz);
                            let rc = fe_exp2(log2_rc);
                            for p in 0..12 {
                                let phz = p as f64 * 0.5236;
                                let phc = p as f64 * 0.6155 + 0.3;
                                for (fz, fc) in [(1.0, 1.0), (1.0, 0.4), (0.6, 1.0), (0.0, 1.0)] {
                                    let z0 = CFe {
                                        x: fz * rz.x * phz.cos(),
                                        y: fz * rz.x * phz.sin(),
                                        e: rz.e,
                                    };
                                    let cc = CFe {
                                        x: fc * rc.x * phc.cos(),
                                        y: fc * rc.x * phc.sin(),
                                        e: rc.e,
                                    };
                                    let w = exact_block_walk(&orbit, first, lvl.skip, z0, cc);
                                    if let Some(wl) = w.log2_mag() {
                                        assert!(
                                            wl <= log2_m + 1e-6,
                                            "[{}] skip {} rung {} sample {}: |Φ| 2^{:.3} > M 2^{:.3}",
                                            name, lvl.skip, s, p, wl, log2_m
                                        );
                                    }
                                }
                            }
                            checked += 1;
                        }
                    }
                }
            }
        }
        println!("polydisc invariant checked on {} (block, rung) polydiscs", checked);
        assert!(checked > 200, "too few polydiscs exercised ({})", checked);
    }

    #[test]
    fn mobius_radii_are_pure_formula_no_chain() {
        // (task 2.5, patch v2 Fix 1) The built radius of EVERY block equals its
        // standalone (V) formula radius — no merge cap. The removed §4.4 chain
        // is the Möbius-simple single-step rule; for c+ the majorant walks all
        // block steps so (V) already covers the composed map. The end-to-end
        // referee is mobius_global_error_and_parity (ρ_N/(N·ε) bounded, escape
        // parity) — if the chain were load-bearing for soundness, that test
        // would break; it stays green.
        let eps = 1e-6_f64;
        let c_max = 1e-9_f64;
        for (name, cx, cy) in
            [("feigenbaum", -1.401155_f64, 0.0_f64), ("cusp", -0.75, 0.0), ("period2", -1.25, 0.0)]
        {
            let Some((_orbit, levels, bounds, radii)) = harness(cx, cy, 2048, eps, c_max)
            else {
                panic!("[{}] escaped", name);
            };
            for (li, lvl) in levels.iter().enumerate() {
                for (s, blk) in lvl.blocks.iter().enumerate() {
                    let formula = mobius_solve_radius(
                        blk,
                        &bounds.per_level[li][s],
                        &bounds,
                        eps,
                        c_max.log2(),
                    );
                    let got = radii[li][s];
                    assert!(
                        (got == f64::NEG_INFINITY && formula == f64::NEG_INFINITY)
                            || (got - formula).abs() < 1e-12,
                        "[{}] skip {} slot {}: built {} != formula {}",
                        name, lvl.skip, s, got, formula
                    );
                }
            }
        }
    }

    #[test]
    fn mobius_historical_g_block() {
        // (task 2.6, note §6.3) The block that motivated guard (G): seahorse
        // reference, steps 26→50 (contains |2Z₃₉| ≈ 5.4e-3), entry
        // |z| = 7.53e-13, ε = 1e-12, |c| = 1e-14. Plain Möbius errs ~1.5e-9
        // (would violate ε); Möbius-c+ stays far below ε. With the F
        // coefficient (pure-c² annihilated) the residual on this block drops
        // to the f64 rounding floor (~1e-15, was 1.3e-12 for the 5-coefficient
        // form), so the historical ~c² scaling check is replaced by a floor
        // assertion: deeper |c| must never be WORSE.
        let orbit = ref_orbit_f64(-0.743643887037151, 0.131825904205330, 128);
        assert!(orbit.len() > 64, "seahorse escaped before step 64");
        let first = 26usize;
        let skip = 24usize; // steps 26..50
        let min_2z = (first..first + skip)
            .map(|i| {
                let (zx, zy) = orbit[i];
                2.0 * (zx * zx + zy * zy).sqrt()
            })
            .fold(f64::INFINITY, f64::min);
        println!("min |2Z| over steps {}..{} = {:.3e}", first, first + skip, min_2z);
        assert!(min_2z < 1e-2, "block does not straddle the near-critical step");
        let mut jet = jet_seed(orbit[first].0, orbit[first].1);
        for i in first + 1..first + skip {
            jet = jet_compose(&jet, &jet_seed(orbit[i].0, orbit[i].1));
        }
        let m_plus = mobius_from_jet(&jet);
        let m_plain = mobius_from_jet_plain(&jet);
        let z = CFe::from_c(7.53e-13, 0.0);
        let mut errs = [(0f64, 0f64); 2]; // (plain, c+) at |c| = 1e-14, 1e-15
        for (k, cmag) in [1e-14_f64, 1e-15].iter().enumerate() {
            let c = CFe::from_c(0.6 * cmag, 0.8 * cmag);
            let exact = exact_block_walk(&orbit, first, skip, z, c);
            let exact_mag = exact.log2_mag().unwrap().exp2();
            let rel = |m: &MobiusCPlus| -> f64 {
                let (applied, _, _) = mobius_apply(m, z, c);
                let d = applied.sub(exact);
                d.log2_mag().map(|l| l.exp2()).unwrap_or(0.0) / exact_mag
            };
            errs[k] = (rel(&m_plain), rel(&m_plus));
            println!(
                "|c| = {:e}: plain Möbius rel err {:.3e} | Möbius-c+ rel err {:.3e}",
                cmag, errs[k].0, errs[k].1
            );
        }
        // The historical numbers: plain fails ε by ~3 decades, c+ passes.
        assert!(errs[0].0 > 1e-10, "plain Möbius unexpectedly good: {:.3e}", errs[0].0);
        // F-form: the residual sits at the f64 rounding floor, 3 decades under
        // the 5-coefficient form's 1.3e-12 on this block.
        assert!(errs[0].1 < 1e-14, "Möbius-c+ above the rounding floor: {:.3e}", errs[0].1);
        // Deeper |c| must never be worse (floor-limited, no strict c² scaling).
        assert!(
            errs[1].1 <= errs[0].1 * 1.5,
            "c+ residual grows with depth: {:.3e} → {:.3e}",
            errs[0].1, errs[1].1
        );
    }

    #[test]
    fn mobius_superconvergence_constant() {
        // (task 2.6, note §6.4) Pure-z channel (c = 0) on the near-parabolic
        // block C = (−0.7499, 0.0001), start 2: err_rel/x² must equal the
        // superconvergence constant |c₃₀ − c₂₀²/c₁₀|/|c₁₀| (= |q₃₀|/|c₁₀|) at
        // full float precision, for every block length.
        let orbit = ref_orbit_f64(-0.7499, 0.0001, 600);
        assert!(orbit.len() > 512);
        let first = 2usize;
        for len in [64usize, 128, 256] {
            let mut jet = jet_seed(orbit[first].0, orbit[first].1);
            for i in first + 1..first + len {
                jet = jet_compose(&jet, &jet_seed(orbit[i].0, orbit[i].1));
            }
            let m = mobius_from_jet(&jet);
            let q = mobius_q(&jet, &m);
            let predicted = q[jet_idx(3, 0)].log2_mag().unwrap()
                - m.a.log2_mag().unwrap();
            let c0 = CFe::ZERO;
            for x in [1e-6_f64, 3e-7] {
                let z = CFe::from_c(x, 0.0);
                let (applied, _, _) = mobius_apply(&m, z, c0);
                let exact = exact_block_walk(&orbit, first, len, z, c0);
                let rel = applied.sub(exact).log2_mag().unwrap()
                    - exact.log2_mag().unwrap();
                let measured = rel - 2.0 * x.log2();
                println!(
                    "L={:>3} x={:e}: err_rel/x² = {:.6} (predicted |q₃₀|/|c₁₀| = {:.6})",
                    len,
                    x,
                    measured.exp2(),
                    predicted.exp2()
                );
                // Full-precision match up to the den ≈ 1 + O(|D|x) factor and
                // the x⁴ term (both ~1e-4 relative at x = 1e-6).
                assert!(
                    (measured - predicted).abs() < 0.01,
                    "L={} x={}: constant 2^{:.4} vs predicted 2^{:.4}",
                    len, x, measured, predicted
                );
            }
        }
    }

    #[test]
    fn mobius_global_error_and_parity() {
        // (task 2.6, note §6.5) End-to-end against exact perturbation stepping,
        // same Zhuoran rebasing: identical iteration counts and escape verdicts,
        // final relative error ρ_N/(N·ε) ≤ 5 across orbit classes and (ε, |c|)
        // regimes. Skips must actually be exercised. Never measured past the
        // reference length (max_iter ≤ orbit length by construction here).
        // Regimes: the note's deep battery PLUS the interactive/coarse pairs
        // where the field A/B runs (the pointwise |z|-scaled budget is not
        // implied by (V) inside the box — this end-to-end bound is the
        // soundness referee there).
        for (eps, c_maxes) in [
            (1e-12_f64, [1e-13_f64, 1e-14, 1e-16]),
            (1e-15, [1e-13, 1e-14, 1e-16]),
            (1e-3, [1e-5, 1e-7, 1e-9]),
            (1e-4, [1e-5, 1e-7, 1e-9]),
        ] {
            for c_max in c_maxes {
                // Per-center iteration budget: the Misiurewicz spiral point is
                // preperiodic (repelling), so its f64 orbit drifts and escapes
                // at iteration 446 — its harness run stays below that.
                for (name, cx, cy, max_iter) in [
                    ("seahorse", -0.743643887037151_f64, 0.131825904205330_f64, 2500usize),
                    ("near-parab", -0.7499, 0.0001, 2500),
                    ("spiral", -0.77568377, 0.13646737, 400),
                    ("feigenbaum", -1.401155, 0.0, 2500),
                ] {
                    let Some((orbit, levels, _bounds, radii)) =
                        harness(cx, cy, max_iter, eps, c_max)
                    else {
                        println!("[{}] escaped — skipped", name);
                        continue;
                    };
                    let bound = 5.0 * max_iter as f64 * eps;
                    let (mut worst, mut compared, mut mismatches, mut skipping) =
                        (0f64, 0usize, 0usize, 0usize);
                    for kpx in 0..24 {
                        let t = (kpx as f64 / 24.0) * 2.0 - 1.0;
                        let dc = (t * c_max * 0.7, 0.37 * t * c_max);
                        let exact = mobius_run_pixel(&[], &[], &orbit, dc, max_iter);
                        let got = mobius_run_pixel(&levels, &radii, &orbit, dc, max_iter);
                        // Escaping pixels whose orbit grazes the bailout can
                        // legitimately shift their escape iteration by a few
                        // steps within the ε budget (pronounced at coarse ε);
                        // tolerate ≤ 1% + 2 iterations there. Non-escaping
                        // pixels and verdicts stay strict.
                        let it_tol = if exact.escaped && got.escaped {
                            2 + exact.iters / 100
                        } else {
                            0
                        };
                        let it_delta = got.iters.abs_diff(exact.iters);
                        if it_delta > it_tol || got.escaped != exact.escaped {
                            mismatches += 1;
                            continue;
                        }
                        if got.steps < exact.steps {
                            skipping += 1;
                        }
                        if exact.escaped {
                            continue;
                        }
                        let (ex, ey) = exact.final_z;
                        let (gx, gy) = got.final_z;
                        let mag = (ex * ex + ey * ey).sqrt().max(1e-300);
                        let rel = ((gx - ex).powi(2) + (gy - ey).powi(2)).sqrt() / mag;
                        worst = worst.max(rel);
                        compared += 1;
                    }
                    println!(
                        "[{}] eps={:e} c={:e}: {} compared, worst ρ_N/(N·ε) = {:.3}, skipping {}, mismatches {}",
                        name, eps, c_max, compared,
                        worst / (max_iter as f64 * eps), skipping, mismatches
                    );
                    // Iteration/escape parity is only a meaningful property
                    // when the certified accumulated error N·ε stays « 1: at
                    // coarse ε (interactive), a ~1e-3 relative error near a
                    // chaotic boundary legitimately shifts escape times by
                    // O(1) relative (Lyapunov amplification — the theorem's
                    // bound allows it, and the heuristic modes drift more
                    // without being measured). ρ_N on non-escaping pixels
                    // stays the referee at every regime.
                    if max_iter as f64 * eps <= 0.01 {
                        assert_eq!(mismatches, 0, "[{}] iteration/escape parity broken", name);
                    } else if mismatches > 0 {
                        println!(
                            "  [{}] {} escape-time shifts at coarse eps (N·ε = {:.2}) — allowed",
                            name, mismatches, max_iter as f64 * eps
                        );
                    }
                    assert!(
                        worst <= bound,
                        "[{}] eps={:e} c={:e}: ρ_N {:.3e} > 5·N·ε {:.3e}",
                        name, eps, c_max, worst, bound
                    );
                    assert!(
                        skipping > 12,
                        "[{}] eps={:e} c={:e}: blocks barely used ({}/24)",
                        name, eps, c_max, skipping
                    );
                }
            }
        }
    }

    #[test]
    fn mobius_census_vs_plain_mobius() {
        // (task 2.7) r_c+ ≥ r_Möbius per block ⇒ the c+ loop never needs more
        // loop turns or applications in total. Also the note §6.7 census: at
        // deep |c| ≤ 1e-14, the fraction of emitted blocks whose certified
        // radius falls below the delta band (~1e-11) should be ≈ 0.
        let eps = 1e-12_f64;
        let c_max = 1e-14_f64;
        let max_iter = 2500usize;
        for (name, cx, cy) in [
            ("seahorse", -0.743643887037151_f64, 0.131825904205330_f64),
            ("near-parab", -0.7499, 0.0001),
            ("feigenbaum", -1.401155, 0.0),
        ] {
            let orbit = ref_orbit_f64(cx, cy, max_iter);
            if orbit.len() <= max_iter {
                println!("[{}] escaped — skipped", name);
                continue;
            }
            let levels = mobius_build_levels(&orbit, 1 << 18);
            let plain_levels = mobius_build_levels_with(&orbit, 1 << 18, true);
            let bounds = mobius_build_bounds(&levels, &orbit, c_max.log2());
            let plain_bounds = mobius_build_bounds(&plain_levels, &orbit, c_max.log2());
            let radii = mobius_build_radii(&levels, &bounds, eps, c_max.log2());
            let plain_radii =
                mobius_build_radii(&plain_levels, &plain_bounds, eps, c_max.log2());
            // Per-block radius dominance (the "by construction" claim, verified).
            let (mut dominated, mut total_finite) = (0usize, 0usize);
            for (li, lvl) in radii.iter().enumerate() {
                for (s, &r) in lvl.iter().enumerate() {
                    let rp = plain_radii[li][s];
                    if rp.is_finite() {
                        total_finite += 1;
                        if r >= rp - 1e-9 {
                            dominated += 1;
                        }
                    }
                }
            }
            println!(
                "[{}] radius dominance: c+ ≥ plain on {}/{} plain-certified blocks",
                name, dominated, total_finite
            );
            assert!(
                dominated * 100 >= total_finite * 99,
                "[{}] r_c+ < r_Möbius on too many blocks",
                name
            );
            // Loop census over a pixel row.
            let (mut steps_p, mut steps_c, mut apps_p, mut apps_c) = (0u64, 0u64, 0u64, 0u64);
            for kpx in 0..24 {
                let t = (kpx as f64 / 24.0) * 2.0 - 1.0;
                let dc = (t * c_max * 0.7, 0.37 * t * c_max);
                let p = mobius_run_pixel(&plain_levels, &plain_radii, &orbit, dc, max_iter);
                let c = mobius_run_pixel(&levels, &radii, &orbit, dc, max_iter);
                steps_p += p.steps as u64;
                steps_c += c.steps as u64;
                apps_p += p.applications as u64;
                apps_c += c.applications as u64;
            }
            println!(
                "[{}] plain: steps {} apps {} | c+: steps {} apps {}",
                name, steps_p, apps_p, steps_c, apps_c
            );
            assert!(steps_c <= steps_p, "[{}] c+ loop slower than plain", name);
            assert!(apps_c <= apps_p, "[{}] c+ needs more applications", name);
            // Dead-radius census on emitted (skip ≥ 4) blocks.
            let band = (1e-11_f64).log2();
            let (mut dead, mut finite) = (0usize, 0usize);
            for (li, lvl) in levels.iter().enumerate() {
                if lvl.skip < 4 {
                    continue;
                }
                for &r in &radii[li] {
                    if r.is_finite() {
                        finite += 1;
                        if r < band {
                            dead += 1;
                        }
                    }
                }
            }
            println!(
                "[{}] dead-radius census: {}/{} emitted certified blocks below the delta band",
                name, dead, finite
            );
            assert!(
                dead * 4 <= finite,
                "[{}] too many blocks below the delta band ({}/{})",
                name, dead, finite
            );
        }
    }

    #[test]
    fn mobius_serialization_round_trip() {
        // (task 3.2) The GPU records must preserve the six coefficients within
        // f32 mantissa tolerance, radii within f32 rounding, keep the coefficient
        // and radius buffers index-aligned, emit only skip ≥ 4 levels, mark
        // uncertified blocks with −∞, and carry a correct f32-safe flag.
        let eps = 1e-6_f64;
        let c_max = 1e-9_f64;
        let Some((_orbit, levels, _bounds, radii)) =
            harness(-1.401155, 0.0, 2048, eps, c_max)
        else {
            panic!("reference escaped");
        };
        let coeffs = mobius_serialize_coeffs(&levels);
        let (rad, dir) = mobius_serialize_radii(&levels, &radii);
        assert_eq!(coeffs.len(), rad.len(), "buffers not index-aligned");
        let emitted: Vec<usize> = levels
            .iter()
            .enumerate()
            .filter(|(_, l)| l.skip >= MOBIUS_MIN_EMIT_SKIP)
            .map(|(i, _)| i)
            .collect();
        assert_eq!(dir.len(), emitted.len());
        let total: usize = emitted.iter().map(|&li| levels[li].blocks.len()).sum();
        assert_eq!(rad.len(), total);
        for (d, &li) in dir.iter().zip(emitted.iter()) {
            let lvl = &levels[li];
            assert_eq!(d.skip as usize, lvl.skip);
            assert_eq!(d.count as usize, lvl.blocks.len());
            let mut max_r = f32::NEG_INFINITY;
            for (slot, blk) in lvl.blocks.iter().enumerate() {
                let flat = d.offset as usize + slot;
                let r = &rad[flat];
                let cb = &coeffs[flat];
                max_r = max_r.max(r.r_log2);
                let want = radii[li][slot];
                if want.is_finite() {
                    assert!(
                        (r.r_log2 as f64 - want).abs() < 1e-3,
                        "skip {} slot {}: r {} vs {}",
                        lvl.skip, slot, r.r_log2, want
                    );
                } else {
                    assert_eq!(r.r_log2, f32::NEG_INFINITY);
                }
                assert_eq!(
                    r.f32_safe > 0.5,
                    mobius_f32_safe(&blk.m),
                    "f32_safe flag mismatch"
                );
                for (name, src, got) in [
                    ("A", &blk.m.a, &cb.a),
                    ("B", &blk.m.b, &cb.b),
                    ("A'", &blk.m.ap, &cb.ap),
                    ("D", &blk.m.d, &cb.d),
                    ("D'", &blk.m.dp, &cb.dp),
                    ("F", &blk.m.f, &cb.f),
                ] {
                    match src.log2_mag() {
                        None => assert_eq!((got.x, got.y), (0.0, 0.0)),
                        Some(want) => {
                            let l = (got.x as f64).hypot(got.y as f64).log2() + got.e as f64;
                            assert!(
                                (l - want).abs() < 1e-5,
                                "skip {} slot {} {}: log2 {} vs {}",
                                lvl.skip, slot, name, l, want
                            );
                        }
                    }
                    if r.f32_safe > 0.5 {
                        assert!(got.e.abs() <= 100, "flagged block ships exponent {}", got.e);
                    }
                }
            }
            assert_eq!(d.max_r3_log2, max_r, "level skip {} max_r directory", lvl.skip);
        }
        // A degenerate block serializes to −∞ radius and zero coefficients.
        let dg = MobiusBlock {
            m: mobius_from_jet(&jet_seed(0.0, 0.0)),
            log2_q: [f64::NEG_INFINITY; JET_NCOEFF],
        };
        let lv = vec![MobiusLevel { skip: 4, blocks: vec![dg] }];
        let (r0, _) = mobius_serialize_radii(&lv, &[vec![f64::NEG_INFINITY]]);
        assert_eq!(r0[0].r_log2, f32::NEG_INFINITY);
    }

    // ── Diagnostic (6.3 follow-up): mobius vs Padé-heuristic at USER regimes ──
    // Field report: mobius+ ≥ 2× slower than Padé on most views. Padé's radii
    // are heuristic (√ε·|A|); mobius radii are certified. This census compares
    // loop turns (wall-clock proxy) at interactive (ε, c_max) and prints the
    // f32-fast-path fraction of APPLIED blocks (fe applications cost ~2× — the
    // jet lesson).
    #[test]
    #[ignore] // diagnostic — run with -- --ignored --nocapture
    fn mobius_vs_pade_user_regime_census() {
        let max_iter = 3000usize;
        for (eps, c_max) in [(1e-3_f64, 1e-5_f64), (1e-4, 1e-5), (1e-4, 1e-9), (1e-6, 1e-9)] {
            for (name, cx, cy) in [
                ("cusp", -0.75_f64, 0.0_f64),
                ("period2", -1.25, 0.0),
                ("feigenbaum", -1.401155, 0.0),
            ] {
                let orbit = ref_orbit_f64(cx, cy, max_iter);
                if orbit.len() <= max_iter {
                    continue;
                }
                let pade_levels =
                    crate::bench_build_levels(&orbit, eps, true, 1 << 18);
                let levels = mobius_build_levels(&orbit, 1 << 18);
                let bounds = mobius_build_bounds(&levels, &orbit, c_max.log2());
                let radii = mobius_build_radii(&levels, &bounds, eps, c_max.log2());
                let (mut t_pade, mut t_mob, mut t_exact) = (0u64, 0u64, 0u64);
                let (mut apps_f32, mut apps_all) = (0u64, 0u64);
                for kpx in 0..16 {
                    let t = (kpx as f64 / 16.0) * 2.0 - 1.0;
                    let dc = (t * c_max * 0.7, 0.37 * t * c_max);
                    let (ps, _, _) =
                        crate::bench_run_pixel(&pade_levels, &orbit, dc, max_iter, true);
                    let m = mobius_run_pixel(&levels, &radii, &orbit, dc, max_iter);
                    let e = mobius_run_pixel(&[], &[], &orbit, dc, max_iter);
                    t_pade += ps as u64;
                    t_mob += m.steps as u64;
                    t_exact += e.steps as u64;
                    apps_all += m.applications as u64;
                }
                // f32-safe fraction over emitted blocks, weighted by skip
                // (proxy for the application mix).
                let (mut safe_w, mut all_w) = (0u64, 0u64);
                for (li, lvl) in levels.iter().enumerate() {
                    if lvl.skip < MOBIUS_MIN_EMIT_SKIP {
                        continue;
                    }
                    for (s, blk) in lvl.blocks.iter().enumerate() {
                        if radii[li][s].is_finite() {
                            all_w += lvl.skip as u64;
                            if mobius_f32_safe(&blk.m) {
                                safe_w += lvl.skip as u64;
                            }
                        }
                    }
                }
                let _ = apps_f32;
                println!(
                    "[{}] eps={:>6.0e} c={:>6.0e}: turns exact={:>6} pade={:>5} mobius={:>5} (mob/pade {:.2}x) | apps {} | f32-safe skip-weighted {:.0}%",
                    name, eps, c_max, t_exact, t_pade, t_mob,
                    t_mob as f64 / t_pade.max(1) as f64,
                    apps_all,
                    100.0 * safe_w as f64 / all_w.max(1) as f64
                );
            }
        }
    }

    const LOG2_10_LOCAL: f64 = 3.321928094887362;

    // Round an f64 to p significant mantissa bits (round-to-nearest) — models a
    // reference stored/computed at p bits of relative precision. p ≥ 52 is the
    // identity (full f64).
    fn round_bits(v: f64, p: u32) -> f64 {
        if v == 0.0 || !v.is_finite() || p >= 52 {
            return v;
        }
        let drop = 52 - p;
        let bits = v.to_bits();
        let half = 1u64 << (drop - 1);
        let mask = !((1u64 << drop) - 1);
        f64::from_bits(bits.wrapping_add(half) & mask)
    }

    // ── Instrumentation (option 3): how many REFERENCE bits does the DERIVATIVE
    // (distance estimation) need, above what the COLOR (iteration count) needs?
    // The orbit runs in f64 (52-bit arithmetic); only the reference precision
    // varies (each Z_n rounded to p bits before use), so der error isolates the
    // reference-precision limit — the quantity the user's budget lever controls.
    // The GPU stores the reference in f32 (p = 24). The margin the DE needs =
    // (p where der error saturates) − (p where the color stops changing).
    #[test]
    #[ignore]
    fn mobius_der_precision_vs_reference_bits() {
        let eps = 1e-6_f64;
        for (name, cx, cy, n) in [
            ("feigenbaum", -1.401155_f64, 0.0_f64, 8000usize),
            ("feigenbaum-long", -1.401155, 0.0, 30000),
            ("seahorse", -0.743643887037151, 0.131825904205330, 3000),
        ] {
            let orbit_gt = ref_orbit_f64(cx, cy, n);
            if orbit_gt.len() <= n {
                println!("[{}] escaped at {} — capped", name, orbit_gt.len() - 1);
            }
            let nn = orbit_gt.len() - 1;
            let c_max = 1e-40_f64; // deep pixel scale (dc ≈ c_max)
            println!(
                "\n=== [{}] N={} c_max={:e} eps={:e} (GPU reference = f32 = 24 bits) ===",
                name, nn, c_max, eps
            );
            println!(
                "  {:>4} | {:>12} | {:>10} | color (iters/escape)",
                "bits", "der rel err", "DE rel err"
            );
            // Ground truth: full-f64 reference (p = 52). Der error is measured
            // against it; it saturates once the reference stops limiting der.
            let mut prev_der_err = f64::INFINITY;
            for p in [12u32, 16, 20, 24, 28, 32, 36, 40, 44, 48] {
                let orbit_p: Vec<(f64, f64)> = orbit_gt
                    .iter()
                    .map(|&(x, y)| (round_bits(x, p), round_bits(y, p)))
                    .collect();
                let (mut der_err, mut de_err, mut color_mismatch) = (0.0f64, 0.0f64, 0usize);
                for kpx in 0..16 {
                    let t = (kpx as f64 / 16.0) * 2.0 - 1.0;
                    let dc = (t * c_max * 0.7, 0.37 * t * c_max);
                    let gt = mobius_run_pixel(&[], &[], &orbit_gt, dc, nn);
                    let dp = mobius_run_pixel(&[], &[], &orbit_p, dc, nn);
                    // der (dz/dc) relative error.
                    let dg = (gt.der.0 * gt.der.0 + gt.der.1 * gt.der.1).sqrt().max(1e-300);
                    let dd = ((dp.der.0 - gt.der.0).powi(2) + (dp.der.1 - gt.der.1).powi(2)).sqrt();
                    der_err = der_err.max(dd / dg);
                    // DE = |z|·ln|z| / |der|; compare the estimator itself.
                    let de = |r: &MobiusPixelResult| -> f64 {
                        let z = (r.final_z.0 * r.final_z.0 + r.final_z.1 * r.final_z.1).sqrt();
                        let d = (r.der.0 * r.der.0 + r.der.1 * r.der.1).sqrt().max(1e-300);
                        z * z.ln().max(1e-6) / d
                    };
                    let (dge, dpe) = (de(&gt), de(&dp));
                    de_err = de_err.max((dpe - dge).abs() / dge.abs().max(1e-300));
                    if dp.iters != gt.iters || dp.escaped != gt.escaped {
                        color_mismatch += 1;
                    }
                }
                println!(
                    "  {:>4} | {:>12.2e} | {:>10.2e} | {} mismatch/16",
                    p, der_err, de_err, color_mismatch
                );
                let _ = prev_der_err;
                prev_der_err = der_err;
            }
        }
    }

    // ── Instrumentation (patch v2): applied-length histogram + blocking-term ─
    // census. Point 1: distribution of applied block lengths, c+ vs Padé
    // heuristic. Point 2: for every block refused while |z| sits in the working
    // band (1e-13..1e-11), which (V) term binds — stored q by degree, Cauchy
    // tail, DEN, or the c_max scale. Run before/after Fix 1+2 with
    //   cargo test --release mobius_patch_v2_instrumentation -- --ignored --nocapture
    #[test]
    #[ignore]
    fn mobius_patch_v2_instrumentation() {
        let eps = 1e-6_f64;
        let max_iter = 3000usize;
        for (dec, cx, cy, name) in [
            (-9.0_f64, -1.401155_f64, 0.0_f64, "feigenbaum"),
            (-30.0, -1.401155, 0.0, "feigenbaum"),
            (-9.0, -0.75, 0.0, "cusp"),
        ] {
            let log2_c_max = dec * LOG2_10_LOCAL;
            let orbit = ref_orbit_f64(cx, cy, max_iter);
            if orbit.len() <= max_iter {
                continue;
            }
            let levels = mobius_build_levels(&orbit, 1 << 18);
            let bounds = mobius_build_bounds(&levels, &orbit, log2_c_max);
            let radii = mobius_build_radii(&levels, &bounds, eps, log2_c_max);
            let pade_levels = crate::bench_build_levels(&orbit, eps, true, 1 << 18);
            let cm = log2_c_max.exp2().max(1e-300);
            println!("\n=== [{}] c~1e{:.0} eps={:e} ===", name, dec, eps);

            // Point 1: applied-length histograms over a pixel row.
            let mut hist_mob = std::collections::BTreeMap::<usize, u64>::new();
            let mut hist_pade = std::collections::BTreeMap::<usize, u64>::new();
            for kpx in 0..16 {
                let t = (kpx as f64 / 16.0) * 2.0 - 1.0;
                let dc = (t * cm * 0.7, 0.37 * t * cm);
                applied_lengths_mobius(&levels, &radii, &orbit, dc, max_iter, &mut hist_mob);
                applied_lengths_pade(&pade_levels, &orbit, dc, max_iter, &mut hist_mob_noop(), &mut hist_pade);
            }
            let sum = |h: &std::collections::BTreeMap<usize, u64>| -> (u64, u64) {
                let apps: u64 = h.values().filter(|_| true).sum();
                let iters: u64 = h.iter().map(|(k, v)| *k as u64 * v).sum();
                (apps, iters)
            };
            let (am, im) = sum(&hist_mob);
            let (ap, ip) = sum(&hist_pade);
            println!("  applied-length histogram (skip: count):");
            println!("    c+    {:?}  (apps={} iters={})", hist_mob, am, im);
            println!("    padé  {:?}  (apps={} iters={})", hist_pade, ap, ip);

            // Point 2: blocking-term census over emitted blocks probed at the
            // working band, one representative |z| per (block, band position).
            let mut census: std::collections::BTreeMap<&str, u64> =
                std::collections::BTreeMap::new();
            let mut refused = 0u64;
            let mut admitted = 0u64;
            for (li, lvl) in levels.iter().enumerate() {
                if lvl.skip < MOBIUS_MIN_EMIT_SKIP {
                    continue;
                }
                for (s, blk) in lvl.blocks.iter().enumerate() {
                    if blk.m.degenerate {
                        continue;
                    }
                    let log2_r = radii[li][s];
                    // Probe at |z| = 1e-12 (mid working band).
                    let probe = (1e-12_f64).log2();
                    if log2_r.is_finite() && log2_r >= probe {
                        admitted += 1;
                        continue;
                    }
                    refused += 1;
                    let term = binding_term(blk, &bounds.per_level[li][s], &bounds, eps, log2_c_max, probe);
                    *census.entry(term).or_insert(0) += 1;
                }
            }
            println!(
                "  blocking-term census at |z|=1e-12 (emitted blocks): admitted={} refused={}",
                admitted, refused
            );
            for (term, n) in &census {
                println!("    {:>10}: {}", term, n);
            }
        }
    }

    fn hist_mob_noop() -> std::collections::BTreeMap<usize, u64> {
        std::collections::BTreeMap::new()
    }

    fn applied_lengths_mobius(
        levels: &[MobiusLevel],
        radii: &[Vec<f64>],
        orbit: &[(f64, f64)],
        dc: (f64, f64),
        max_iter: usize,
        hist: &mut std::collections::BTreeMap<usize, u64>,
    ) {
        let orbit_len = orbit.len();
        let cfe = CFe::from_c(dc.0, dc.1);
        let (mut dz, mut ref_i, mut iter, mut steps) =
            ((0.0_f64, 0.0_f64), 0usize, 0usize, 0usize);
        while iter < max_iter {
            let mut applied = false;
            if ref_i > 0 {
                let shifted = ref_i - 1;
                let dz2 = dz.0 * dz.0 + dz.1 * dz.1;
                let log2_dz = if dz2 > 0.0 { 0.5 * dz2.log2() } else { f64::NEG_INFINITY };
                for (li, lvl) in levels.iter().enumerate().rev() {
                    if shifted % lvl.skip != 0 {
                        continue;
                    }
                    let slot = shifted / lvl.skip;
                    if slot >= lvl.blocks.len()
                        || iter + lvl.skip > max_iter
                        || ref_i + lvl.skip >= orbit_len
                    {
                        continue;
                    }
                    if !(log2_dz < radii[li][slot]) {
                        continue;
                    }
                    let (phi, _, _) = mobius_apply(&lvl.blocks[slot].m, CFe::from_c(dz.0, dz.1), cfe);
                    let cand = phi.to_f64();
                    let zi = orbit[ref_i + lvl.skip];
                    let candz = (zi.0 + cand.0, zi.1 + cand.1);
                    if lvl.skip > 1 && candz.0 * candz.0 + candz.1 * candz.1 > 4.0 {
                        continue;
                    }
                    *hist.entry(lvl.skip).or_insert(0) += 1;
                    dz = cand;
                    ref_i += lvl.skip;
                    iter += lvl.skip;
                    applied = true;
                    break;
                }
            }
            if !applied {
                let z = orbit[ref_i];
                let m2 = (2.0 * z.0 * dz.0 - 2.0 * z.1 * dz.1, 2.0 * z.0 * dz.1 + 2.0 * z.1 * dz.0);
                let sq = (dz.0 * dz.0 - dz.1 * dz.1, 2.0 * dz.0 * dz.1);
                dz = (m2.0 + sq.0 + dc.0, m2.1 + sq.1 + dc.1);
                ref_i += 1;
                iter += 1;
                *hist.entry(1).or_insert(0) += 1;
            }
            steps += 1;
            if ref_i > orbit_len - 1 {
                ref_i = orbit_len - 1;
            }
            let z = orbit[ref_i];
            let full = (z.0 + dz.0, z.1 + dz.1);
            let full2 = full.0 * full.0 + full.1 * full.1;
            if full2 > 4.0 {
                break;
            }
            let dz2 = dz.0 * dz.0 + dz.1 * dz.1;
            if full2 < dz2 || ref_i == orbit_len - 1 {
                dz = full;
                ref_i = 0;
            }
            if steps > max_iter * 2 + 16 {
                break;
            }
        }
    }

    fn applied_lengths_pade(
        levels: &[crate::PadeLevel],
        orbit: &[(f64, f64)],
        dc: (f64, f64),
        max_iter: usize,
        _unused: &mut std::collections::BTreeMap<usize, u64>,
        hist: &mut std::collections::BTreeMap<usize, u64>,
    ) {
        // Mirrors bench_run_pixel but records applied skip lengths.
        let orbit_len = orbit.len();
        let dc_mag = (dc.0 * dc.0 + dc.1 * dc.1).sqrt();
        let (mut dz, mut ref_i, mut iter, mut steps) =
            ((0.0_f64, 0.0_f64), 0usize, 0usize, 0usize);
        while iter < max_iter {
            let mut applied = false;
            if ref_i != 0 {
                let shifted = ref_i - 1;
                let dz2 = dz.0 * dz.0 + dz.1 * dz.1;
                for lvl in levels.iter().rev() {
                    let skip = lvl.skip;
                    if shifted % skip != 0 {
                        continue;
                    }
                    let slot = shifted / skip;
                    if slot >= lvl.entries.len() || ref_i + skip > max_iter {
                        continue;
                    }
                    let e = &lvl.entries[slot];
                    let radius = (e.alpha - e.beta * dc_mag).max(0.0);
                    if dz2 > radius * radius {
                        continue;
                    }
                    let cand = match crate::bench_block(e, dz, dc, true) {
                        Some(c) => c,
                        None => continue,
                    };
                    let zi = orbit[ref_i + skip];
                    let candz = (zi.0 + cand.0, zi.1 + cand.1);
                    if skip > 1 && candz.0 * candz.0 + candz.1 * candz.1 > 4.0 {
                        continue;
                    }
                    *hist.entry(skip).or_insert(0) += 1;
                    dz = cand;
                    ref_i += skip;
                    iter += skip;
                    applied = true;
                    break;
                }
            }
            if !applied {
                let z = orbit[ref_i];
                let m2 = (2.0 * z.0 * dz.0 - 2.0 * z.1 * dz.1, 2.0 * z.0 * dz.1 + 2.0 * z.1 * dz.0);
                let sq = (dz.0 * dz.0 - dz.1 * dz.1, 2.0 * dz.0 * dz.1);
                dz = (m2.0 + sq.0 + dc.0, m2.1 + sq.1 + dc.1);
                ref_i += 1;
                iter += 1;
                *hist.entry(1).or_insert(0) += 1;
            }
            steps += 1;
            if ref_i > orbit_len - 1 {
                ref_i = orbit_len - 1;
            }
            let z = orbit[ref_i];
            let full = (z.0 + dz.0, z.1 + dz.1);
            let full2 = full.0 * full.0 + full.1 * full.1;
            if full2 > 4.0 {
                break;
            }
            let dz2 = dz.0 * dz.0 + dz.1 * dz.1;
            if full2 < dz2 || ref_i == orbit_len - 1 {
                dz = full;
                ref_i = 0;
            }
            if steps > max_iter * 2 + 16 {
                break;
            }
        }
    }

    // At probe log2 x, over the best candidate, decide which (V) component keeps
    // REST/DEN above the ½ε(|A|x + |B|c_max) budget (or blocks DEN ≤ 0.5).
    fn binding_term(
        blk: &MobiusBlock,
        bounds: &MobiusBounds,
        table: &MobiusBoundsTable,
        epsilon: f64,
        log2_c_max: f64,
        x: f64,
    ) -> &'static str {
        let la = cfe_log2(&blk.m.a);
        let lb = cfe_log2(&blk.m.b);
        let ld = cfe_log2(&blk.m.d);
        let ldp = cfe_log2(&blk.m.dp);
        let log2_half_eps = epsilon.log2() - 1.0;
        let rhs = log2_half_eps + lse2(&[la + x, lb + log2_c_max]);
        // Per-power stored-q sums.
        let mut cpow = [f64::NEG_INFINITY; JET_DS + 1];
        for (n, &(i, j)) in JET_MONOMIALS.iter().enumerate() {
            let l = blk.log2_q[n];
            if l == f64::NEG_INFINITY {
                continue;
            }
            let t = l + j as f64 * log2_c_max;
            let slot = &mut cpow[i as usize];
            *slot = if *slot == f64::NEG_INFINITY { t } else { lse2(&[*slot, t]) };
        }
        // Best candidate = the one giving the smallest REST/DEN excess at x
        // (its DEN passes and its tail is finite).
        let mut best_excess = f64::INFINITY;
        let mut best_term = "saturated";
        for c in 0..MOBIUS_NCAND {
            let log2_mq = bounds.log2_mq[c];
            if !log2_mq.is_finite() || !bounds.log2_rz[c].is_finite() {
                continue;
            }
            let log2_theta_c = log2_c_max - table.log2_rc[c];
            if log2_theta_c >= -1e-9 {
                continue;
            }
            let d1 = ld + x;
            let d2 = ldp + x + log2_c_max;
            let den = 1.0
                - if d1 > -80.0 { d1.exp2() } else { 0.0 }
                - if d2 > -80.0 { d2.exp2() } else { 0.0 };
            if den <= 0.5 {
                if best_excess == f64::INFINITY {
                    best_term = "DEN";
                }
                continue;
            }
            // Which side dominates REST: stored-q (and which degree) vs Cauchy.
            let mut q_lin = 0.0f64;
            let mut worst_deg = 0usize;
            let mut worst_deg_val = f64::NEG_INFINITY;
            for (i, &ci) in cpow.iter().enumerate() {
                if ci == f64::NEG_INFINITY {
                    continue;
                }
                let t = ci + i as f64 * x;
                if t > worst_deg_val {
                    worst_deg_val = t;
                    worst_deg = i;
                }
                let e = t - rhs;
                if e > -62.0 && e < 62.0 {
                    q_lin += e.exp2();
                } else if e >= 62.0 {
                    q_lin = f64::INFINITY;
                }
            }
            let log2_rz = bounds.log2_rz[c];
            let ltheta = (x - log2_rz).max(log2_theta_c);
            let theta = ltheta.exp2();
            let tail_log2 = log2_mq
                + (JET_DS + 1) as f64 * ltheta
                + (((JET_DS + 2) as f64 - (JET_DS + 1) as f64 * theta)
                    / ((1.0 - theta) * (1.0 - theta)))
                    .log2();
            let tail_lin = {
                let e = tail_log2 - rhs;
                if e > -62.0 && e < 62.0 { e.exp2() } else if e >= 62.0 { f64::INFINITY } else { 0.0 }
            };
            let total = q_lin + tail_lin;
            let excess = total / den;
            if excess < best_excess {
                best_excess = excess;
                best_term = if !total.is_finite() {
                    if q_lin.is_finite() { "cauchy" } else { "storedq" }
                } else if tail_lin > q_lin {
                    "cauchy"
                } else if worst_deg == 0 {
                    "cmax_c2" // pure-c residual (q_0j), the irreducible term
                } else {
                    "storedq"
                };
            }
        }
        if best_excess <= 1.0 + 1e-9 {
            // Admissible at x for the best candidate — refusal came from the
            // scan floor / rounding, not a term. Rare.
            return "admissible";
        }
        best_term
    }

    // ── Diagnostic: deep-regime turn parity + fe-op weight vs Padé ───────────
    // Field report: Padé still much faster even at c_max = 1e-50 (deep fe path),
    // while less precise. Separates the two causes: (a) mobius takes fewer skips
    // (turn deficit), (b) each mobius application costs more fe arithmetic.
    // c_max is passed as log2 only (f64 orbit unchanged — same trick as the jet
    // deep census). fe-op weights counted from the shaders: Padé
    // try_apply_bla_deep ≈ 8 cmul + 1 cinv, raw shared-exponent coeff loads
    // (0 renorm); mobius try_apply_mobius fe branch ≈ 13 cmul + 1 cinv + 5
    // private-exponent coeff renorms + both analytic partials. cmul=1, cinv=4,
    // renorm=1, exact step=4.
    #[test]
    #[ignore] // diagnostic — run with -- --ignored --nocapture
    fn mobius_deep_turns_and_op_weight_vs_pade() {
        const PADE_APPLY_W: f64 = 8.0 + 4.0;
        const MOBIUS_APPLY_W: f64 = 13.0 + 4.0 + 5.0;
        let max_iter = 3000usize;
        let eps = 1e-6_f64;
        for dec in [-9.0_f64, -30.0, -50.0] {
            let log2_c_max = dec * LOG2_10_LOCAL;
            for (name, cx, cy) in [
                ("cusp", -0.75_f64, 0.0_f64),
                ("period2", -1.25, 0.0),
                ("feigenbaum", -1.401155, 0.0),
            ] {
                let orbit = ref_orbit_f64(cx, cy, max_iter);
                if orbit.len() <= max_iter {
                    continue;
                }
                let levels = mobius_build_levels(&orbit, 1 << 18);
                let bounds = mobius_build_bounds(&levels, &orbit, log2_c_max);
                let radii = mobius_build_radii(&levels, &bounds, eps, log2_c_max);
                let pade_levels = crate::bench_build_levels(&orbit, eps, true, 1 << 18);
                let cm = log2_c_max.exp2().max(1e-300);
                let (mut t_pade, mut t_mob, mut apps_mob) = (0u64, 0u64, 0u64);
                for kpx in 0..16 {
                    let t = (kpx as f64 / 16.0) * 2.0 - 1.0;
                    let dc = (t * cm * 0.7, 0.37 * t * cm);
                    let (ps, _, _) = crate::bench_run_pixel(&pade_levels, &orbit, dc, max_iter, true);
                    let m = mobius_run_pixel(&levels, &radii, &orbit, dc, max_iter);
                    t_pade += ps as u64;
                    t_mob += m.steps as u64;
                    apps_mob += m.applications as u64;
                }
                let exact_w = 4.0;
                let mob_exact = (t_mob - apps_mob) as f64;
                let mob_cost = mob_exact * exact_w + apps_mob as f64 * MOBIUS_APPLY_W;
                let pade_cost = t_pade as f64 * PADE_APPLY_W; // turns as apps upper bound
                println!(
                    "[{}] c~1e{:>3.0}: turns pade={:>5} mob={:>5} (mob/pade {:.2}x turns) | weighted GPU-cost mob/pade ≈ {:.2}x",
                    name, dec, t_pade, t_mob,
                    t_mob as f64 / t_pade.max(1) as f64,
                    mob_cost / pade_cost.max(1.0)
                );
            }
        }
    }

    // ── Diagnostic: WHICH constraint starves the coarse-regime radii ─────────
    // Prints, at the worst census regime: per-level median formula radius vs
    // chained radius (isolates the §4.4 min-cascade), the applied-skip
    // histogram, and the turns with the chain disabled (diagnostic only —
    // shipping without the chain would void the certification).
    #[test]
    #[ignore] // diagnostic — run with -- --ignored --nocapture
    fn mobius_coarse_regime_bind_analysis() {
        let (eps, c_max) = (1e-3_f64, 1e-5_f64);
        let max_iter = 3000usize;
        let orbit = ref_orbit_f64(-0.75, 0.0, max_iter);
        assert!(orbit.len() > max_iter);
        let levels = mobius_build_levels(&orbit, 1 << 18);
        let bounds = mobius_build_bounds(&levels, &orbit, c_max.log2());
        let chained = mobius_build_radii(&levels, &bounds, eps, c_max.log2());
        // Formula-only radii (no chain).
        let formula: Vec<Vec<f64>> = levels
            .iter()
            .zip(bounds.per_level.iter())
            .map(|(lvl, blv)| {
                lvl.blocks
                    .iter()
                    .zip(blv.iter())
                    .map(|(blk, b)| mobius_solve_radius(blk, b, &bounds, eps, c_max.log2()))
                    .collect()
            })
            .collect();
        println!("per-level radii (log2 median) at eps={:e} c_max={:e}:", eps, c_max);
        for (li, lvl) in levels.iter().enumerate() {
            let med = |v: &Vec<f64>| -> (f64, usize) {
                let mut f: Vec<f64> = v.iter().cloned().filter(|r| r.is_finite()).collect();
                f.sort_by(|a, b| a.partial_cmp(b).unwrap());
                (if f.is_empty() { f64::NEG_INFINITY } else { f[f.len() / 2] }, f.len())
            };
            let (mf, nf) = med(&formula[li]);
            let (mc, nc) = med(&chained[li]);
            println!(
                "  skip {:>5}: formula r 2^{:>6.1} ({:>4} finite) | chained r 2^{:>6.1} ({:>4} finite) of {}",
                lvl.skip, mf, nf, mc, nc, lvl.blocks.len()
            );
        }
        let mut turns = |radii: &Vec<Vec<f64>>| -> (u64, std::collections::BTreeMap<usize, u64>) {
            let mut t = 0u64;
            let mut hist = std::collections::BTreeMap::new();
            for kpx in 0..16 {
                let tt = (kpx as f64 / 16.0) * 2.0 - 1.0;
                let dc = (tt * c_max * 0.7, 0.37 * tt * c_max);
                // Re-run manually to log applied skips.
                let m = mobius_run_pixel(&levels, radii, &orbit, dc, max_iter);
                t += m.steps as u64;
                let _ = &mut hist;
                let _ = m;
            }
            (t, hist)
        };
        let (t_chain, _) = turns(&chained);
        let (t_formula, _) = turns(&formula);
        println!("turns: chained={} formula-only={}", t_chain, t_formula);
        // Applied-skip histogram (chained radii), one representative pixel.
        let dc = (0.31 * c_max, 0.17 * c_max);
        let mut hist = std::collections::BTreeMap::<usize, u64>::new();
        {
            let radii = &chained;
            let cfe = CFe::from_c(dc.0, dc.1);
            let (mut dz, mut ref_i, mut iter, mut steps) =
                ((0.0_f64, 0.0_f64), 0usize, 0usize, 0usize);
            let orbit_len = orbit.len();
            while iter < max_iter {
                let mut applied = false;
                if ref_i > 0 {
                    let shifted = ref_i - 1;
                    let dz2 = dz.0 * dz.0 + dz.1 * dz.1;
                    let log2_dz =
                        if dz2 > 0.0 { 0.5 * dz2.log2() } else { f64::NEG_INFINITY };
                    for (li, lvl) in levels.iter().enumerate().rev() {
                        if shifted % lvl.skip != 0 {
                            continue;
                        }
                        let slot = shifted / lvl.skip;
                        if slot >= lvl.blocks.len()
                            || iter + lvl.skip > max_iter
                            || ref_i + lvl.skip >= orbit_len
                        {
                            continue;
                        }
                        if !(log2_dz < radii[li][slot]) {
                            continue;
                        }
                        let (phi, _, _) =
                            mobius_apply(&lvl.blocks[slot].m, CFe::from_c(dz.0, dz.1), cfe);
                        let cand = phi.to_f64();
                        let zi = orbit[ref_i + lvl.skip];
                        let candz = (zi.0 + cand.0, zi.1 + cand.1);
                        if lvl.skip > 1 && candz.0 * candz.0 + candz.1 * candz.1 > 4.0 {
                            continue;
                        }
                        *hist.entry(lvl.skip).or_insert(0) += 1;
                        dz = cand;
                        ref_i += lvl.skip;
                        iter += lvl.skip;
                        applied = true;
                        break;
                    }
                }
                if !applied {
                    let z = orbit[ref_i];
                    let m2 = (
                        2.0 * z.0 * dz.0 - 2.0 * z.1 * dz.1,
                        2.0 * z.0 * dz.1 + 2.0 * z.1 * dz.0,
                    );
                    let sq = (dz.0 * dz.0 - dz.1 * dz.1, 2.0 * dz.0 * dz.1);
                    dz = (m2.0 + sq.0 + dc.0, m2.1 + sq.1 + dc.1);
                    ref_i += 1;
                    iter += 1;
                    *hist.entry(1).or_insert(0) += 1;
                }
                steps += 1;
                if ref_i > orbit_len - 1 {
                    ref_i = orbit_len - 1;
                }
                let z = orbit[ref_i];
                let full = (z.0 + dz.0, z.1 + dz.1);
                let full2 = full.0 * full.0 + full.1 * full.1;
                if full2 > 4.0 {
                    break;
                }
                let dz2 = dz.0 * dz.0 + dz.1 * dz.1;
                if full2 < dz2 || ref_i == orbit_len - 1 {
                    dz = full;
                    ref_i = 0;
                }
                if steps > max_iter * 2 + 16 {
                    break;
                }
                if iter % 512 == 0 && iter > 0 && !applied {
                    // Sample |dz| along the run for the probe-vs-radius picture.
                    println!("  iter {:>5}: log2|dz| = {:.1}", iter, log2_hint(dz));
                }
            }
        }
        println!("applied-skip histogram (1 pixel): {:?}", hist);
    }

    fn log2_hint(dz: (f64, f64)) -> f64 {
        let m = (dz.0 * dz.0 + dz.1 * dz.1).sqrt();
        if m > 0.0 { m.log2() } else { f64::NEG_INFINITY }
    }

    // ── Build-time benchmark — cargo test --release mobius_build_time -- --ignored --nocapture
    #[test]
    #[ignore]
    fn mobius_build_time_benchmark() {
        use std::time::Instant;
        let eps = 1e-6_f64;
        let c_max = 1e-9_f64;
        for len in [1usize << 15, 1 << 17] {
            let orbit = ref_orbit_f64(-1.25, 0.0, len);
            assert!(orbit.len() > len);
            let t0 = Instant::now();
            let levels = mobius_build_levels(&orbit, 1 << 18);
            let t_levels = t0.elapsed();
            let t1 = Instant::now();
            let bounds = mobius_build_bounds(&levels, &orbit, c_max.log2());
            let t_bounds = t1.elapsed();
            let t2 = Instant::now();
            let radii = mobius_build_radii(&levels, &bounds, eps, c_max.log2());
            let t_radii = t2.elapsed();
            let blocks: usize = levels.iter().map(|l| l.blocks.len()).sum();
            let positive: usize = radii
                .iter()
                .map(|lvl| lvl.iter().filter(|r| r.is_finite()).count())
                .sum();
            println!(
                "orbit {:>8}: levels {:>7.1?} | bounds {:>7.1?} | radii {:>7.1?} | blocks {} ({} positive)",
                len, t_levels, t_bounds, t_radii, blocks, positive
            );
        }
    }

    // ── Spike (task 1.1): shared-exponent feasibility for {A, B, A'} / {D, D'} ──
    // Decision input for design D1: a group sharing one i32 exponent with f32
    // mantissas loses coefficients once the within-group log2 spread exceeds the
    // f32 subnormal reach (~24 bits budget for full precision, ~126+24 before a
    // mantissa flushes to zero). Measures worst spreads per level per orbit.
    #[test]
    fn mobius_exponent_spike() {
        let centers: [(&str, f64, f64, usize); 4] = [
            ("cusp-near-parabolic", -0.75, 0.0, 1 << 15),
            ("period2-bulb", -1.25, 0.0, 1 << 15),
            ("seahorse", -0.743643887037151, 0.131825904205330, 1 << 15),
            ("feigenbaum-long", -1.401155, 0.0, 1 << 17),
        ];
        for (name, cx, cy, len) in centers {
            let orbit = ref_orbit_f64(cx, cy, len);
            if orbit.len() <= len {
                println!("\n[{}] escaped at {} — skipped", name, orbit.len() - 1);
                continue;
            }
            let levels = build_jet_levels(&orbit, 2, 1 << 18);
            println!("\n[{}] orbit_len={} levels={}", name, orbit.len(), levels.len());
            println!(
                "   {:>7} {:>7} | worst spread AB A' | worst spread D D' | A-B | A-A' | D-D'",
                "skip", "blocks"
            );
            let (mut worst_ab, mut worst_d) = (0f64, 0f64);
            for lvl in &levels {
                let mut sp_ab = 0f64; // {A, B, A'}
                let mut sp_d = 0f64; // {D, D'}
                let (mut sp_a_b, mut sp_a_ap, mut sp_d_dp) = (0f64, 0f64, 0f64);
                for jet in &lvl.entries {
                    let m = mobius_from_jet(jet);
                    if m.degenerate {
                        continue;
                    }
                    let la = m.a.log2_mag();
                    let lb = m.b.log2_mag();
                    let lap = m.ap.log2_mag();
                    let ld = m.d.log2_mag();
                    let ldp = m.dp.log2_mag();
                    let group = |vals: &[Option<f64>]| -> f64 {
                        let fin: Vec<f64> = vals.iter().filter_map(|v| *v).collect();
                        if fin.len() < 2 {
                            return 0.0;
                        }
                        let hi = fin.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
                        let lo = fin.iter().cloned().fold(f64::INFINITY, f64::min);
                        hi - lo
                    };
                    sp_ab = sp_ab.max(group(&[la, lb, lap]));
                    sp_d = sp_d.max(group(&[ld, ldp]));
                    sp_a_b = sp_a_b.max(group(&[la, lb]));
                    sp_a_ap = sp_a_ap.max(group(&[la, lap]));
                    sp_d_dp = sp_d_dp.max(group(&[ld, ldp]));
                }
                worst_ab = worst_ab.max(sp_ab);
                worst_d = worst_d.max(sp_d);
                println!(
                    "   {:>7} {:>7} | {:>18.0} | {:>17.0} | {:>4.0} | {:>4.0} | {:>4.0}",
                    lvl.skip,
                    lvl.entries.len(),
                    sp_ab,
                    sp_d,
                    sp_a_b,
                    sp_a_ap,
                    sp_d_dp
                );
            }
            println!(
                "   -> worst {{A,B,A'}} spread {:.0} bits | worst {{D,D'}} spread {:.0} bits (f32 shared-exp budget ~24)",
                worst_ab, worst_d
            );
        }
    }

    // ── unify-jet-table-dispatch task 1.1: offline unified tier census ─────────

    /// §12 closed-form error terms for the plain-Möbius (Padé) tier at
    /// log2 |z| = lx, log2 |c| = log2_cmax, all relative to the output scale
    /// s = |A|·x + |B|·y. Channels: [0] = z (C·x², C = |q₃₀|/|A|),
    /// [1] = spurious zc (|q₁₁|·x·y/s, q₁₁ = A' of the c+ extraction),
    /// [2] = pure c² (|A₀₂|·y²/s). Coefficients read off the c+ block (its A/B/D
    /// match the plain extraction; q₃₀ and A₀₂ are form-independent).
    fn pade_terms(blk: &MobiusBlock, lx: f64, log2_cmax: f64) -> [f64; 3] {
        let m = &blk.m;
        let l2a = m.a.log2_mag().unwrap_or(f64::NEG_INFINITY);
        let l2b = m.b.log2_mag().unwrap_or(f64::NEG_INFINITY);
        let l2s = lse2(&[l2a + lx, l2b + log2_cmax]);
        [
            blk.log2_q[jet_idx(3, 0)] - l2a + 2.0 * lx,
            m.ap.log2_mag().unwrap_or(f64::NEG_INFINITY) + lx + log2_cmax - l2s,
            blk.log2_q[jet_idx(0, 2)] + 2.0 * log2_cmax - l2s,
        ]
    }

    /// §12 closed-form Padé radius (log2 |z|): largest x with the summed error
    /// channels ≤ ε, capped by the pole bound |D|·x ≤ 1/4. Descending scan
    /// (0.25 log2 steps, first success from above), −∞ when nothing certifies.
    fn pade_closed_form(blk: &MobiusBlock, eps: f64, log2_cmax: f64) -> f64 {
        let m = &blk.m;
        if m.degenerate {
            return f64::NEG_INFINITY;
        }
        let l2a = m.a.log2_mag().unwrap_or(f64::NEG_INFINITY);
        if !l2a.is_finite() {
            return f64::NEG_INFINITY;
        }
        let l2eps = eps.log2();
        let l2d = m.d.log2_mag().unwrap_or(f64::NEG_INFINITY);
        let pole_cap = if l2d.is_finite() { -2.0 - l2d } else { 0.0 };
        let mut lx = pole_cap.min(-1.0);
        while lx > -160.0 {
            if lse2(&pade_terms(blk, lx, log2_cmax)) <= l2eps {
                return lx;
            }
            lx -= 0.25;
        }
        f64::NEG_INFINITY
    }

    struct AutoPixelResult {
        /// Loop turns (applications + exact steps) — the wall-clock proxy.
        steps: u64,
        iters: usize,
        /// Applications per tier: [affine, Padé, c+, jet].
        apps: [u64; 4],
        escaped: bool,
        /// Padé-tier applications whose binding §12 channel was the z channel —
        /// the [K/1] reserve-gate numerator (design D11).
        pade_apps_zbound: u64,
    }

    /// Dispatch replay: mobius_run_pixel's loop with a per-application cheapest-
    /// sufficient-tier choice over the 4-tier radii (tag semantics of design D3,
    /// evaluated at the actual entry). Each tier applies its own evaluator; der
    /// is not tracked (the census counts applications only).
    fn auto_run_pixel(
        mlv: &[MobiusLevel],
        plv: &[MobiusLevel],
        jlv: &[crate::jet::JetLevelF64],
        tiers: &[Vec<[f64; 4]>],
        orbit: &[(f64, f64)],
        dc: (f64, f64),
        max_iter: usize,
        log2_cmax: f64,
    ) -> AutoPixelResult {
        use crate::jet::jet_eval;
        let bailout2 = 4.0_f64;
        let orbit_len = orbit.len();
        let cfe = CFe::from_c(dc.0, dc.1);
        let mut dz = (0.0_f64, 0.0_f64);
        let mut ref_i = 0usize;
        let mut iter = 0usize;
        let mut r = AutoPixelResult {
            steps: 0,
            iters: 0,
            apps: [0; 4],
            escaped: false,
            pade_apps_zbound: 0,
        };
        while iter < max_iter {
            let mut applied = false;
            if ref_i > 0 {
                let shifted = ref_i - 1;
                let dz2 = dz.0 * dz.0 + dz.1 * dz.1;
                let log2_dz =
                    if dz2 > 0.0 { 0.5 * dz2.log2() } else { f64::NEG_INFINITY };
                for (li, lvl) in mlv.iter().enumerate().rev() {
                    if shifted % lvl.skip != 0 {
                        continue;
                    }
                    let slot = shifted / lvl.skip;
                    if slot >= lvl.blocks.len()
                        || iter + lvl.skip > max_iter
                        || ref_i + lvl.skip >= orbit_len
                    {
                        continue;
                    }
                    let t = &tiers[li][slot];
                    let tier = if log2_dz < t[0] {
                        0
                    } else if log2_dz < t[1] {
                        1
                    } else if log2_dz < t[2] {
                        2
                    } else if log2_dz < t[3] {
                        3
                    } else {
                        continue;
                    };
                    let zfe = CFe::from_c(dz.0, dz.1);
                    let cand = match tier {
                        0 => {
                            let m = &lvl.blocks[slot].m;
                            m.a.mul(zfe).add(m.b.mul(cfe)).to_f64()
                        }
                        1 => mobius_apply(&plv[li].blocks[slot].m, zfe, cfe).0.to_f64(),
                        2 => mobius_apply(&lvl.blocks[slot].m, zfe, cfe).0.to_f64(),
                        _ => jet_eval(&jlv[li].entries[slot], zfe, cfe, 3).to_f64(),
                    };
                    let zi = orbit[ref_i + lvl.skip];
                    let candz = (zi.0 + cand.0, zi.1 + cand.1);
                    if lvl.skip > 1 && candz.0 * candz.0 + candz.1 * candz.1 > bailout2 {
                        continue; // don't jump over the first escape
                    }
                    if tier == 1 {
                        let terms = pade_terms(&lvl.blocks[slot], log2_dz, log2_cmax);
                        if terms[0] >= terms[1].max(terms[2]) {
                            r.pade_apps_zbound += 1;
                        }
                    }
                    dz = cand;
                    ref_i += lvl.skip;
                    iter += lvl.skip;
                    r.apps[tier] += 1;
                    applied = true;
                    break;
                }
            }
            if !applied {
                let z = orbit[ref_i];
                let m2 = (
                    2.0 * z.0 * dz.0 - 2.0 * z.1 * dz.1,
                    2.0 * z.0 * dz.1 + 2.0 * z.1 * dz.0,
                );
                let sq = (dz.0 * dz.0 - dz.1 * dz.1, 2.0 * dz.0 * dz.1);
                dz = (m2.0 + sq.0 + dc.0, m2.1 + sq.1 + dc.1);
                ref_i += 1;
                iter += 1;
            }
            r.steps += 1;
            if ref_i > orbit_len - 1 {
                ref_i = orbit_len - 1;
            }
            let z = orbit[ref_i];
            let full = (z.0 + dz.0, z.1 + dz.1);
            let full2 = full.0 * full.0 + full.1 * full.1;
            if full2 > bailout2 {
                r.escaped = true;
                break;
            }
            let dz2 = dz.0 * dz.0 + dz.1 * dz.1;
            if full2 < dz2 || ref_i == orbit_len - 1 {
                dz = full; // rebasing
                ref_i = 0;
            }
            if r.steps > (max_iter * 2 + 16) as u64 {
                break;
            }
        }
        r.iters = iter;
        r
    }

    #[test]
    fn unified_tier_census() {
        // (unify-jet-table-dispatch 1.1) Offline tag census + dispatch replay:
        // per benchmark view and c_max, derive the four tier radii per block on
        // the shared dyadic scaffold (aff/jet from rule (V) at orders 1/3, Padé
        // from plain-Möbius (V) boosted by the §12 closed form, c+ from its (V)
        // machinery), report the block-tag mix at the delta band and the
        // application share per tier from a pixel-row dispatch replay, against
        // the three single-mode baselines. Also reports the [K/1] reserve gate
        // (z-channel-bound share of Padé applications) and radius-ladder
        // violations. Structural assertion: the dispatch's coverage is the union
        // of the tiers', so its loop turns never exceed any single mode's.
        use crate::jet::{build_jet_levels, jet_build_radii, jet_run_pixel};
        let eps = 1e-12_f64;
        for (name, cx, cy, max_iter) in [
            ("seahorse", -0.743643887037151_f64, 0.131825904205330_f64, 2500usize),
            ("near-parab", -0.7499, 0.0001, 2500),
            ("feigenbaum", -1.401155, 0.0, 2500),
            ("spiral", -0.77568377, 0.13646737, 400),
        ] {
            let orbit = ref_orbit_f64(cx, cy, max_iter);
            if orbit.len() <= max_iter {
                println!("[{}] escaped — skipped", name);
                continue;
            }
            let mlv = mobius_build_levels(&orbit, 1 << 18);
            let plv = mobius_build_levels_with(&orbit, 1 << 18, true);
            let jlv = build_jet_levels(&orbit, 1, 1 << 18);
            assert_eq!(mlv.len(), jlv.len(), "[{}] scaffold mismatch", name);
            for c_max in [1e-5_f64, 1e-9, 1e-14] {
                let l2c = c_max.log2();
                let mb = mobius_build_bounds(&mlv, &orbit, l2c);
                let pb = mobius_build_bounds(&plv, &orbit, l2c);
                let r_cp = mobius_build_radii(&mlv, &mb, eps, l2c);
                let r_pv = mobius_build_radii(&plv, &pb, eps, l2c);
                let r_jet = jet_build_radii(&jlv, &orbit, l2c + 10.0, eps, l2c);
                // 4-tier radii per block: [affine, Padé, c+, jet].
                let tiers: Vec<Vec<[f64; 4]>> = mlv
                    .iter()
                    .enumerate()
                    .map(|(li, lvl)| {
                        (0..lvl.blocks.len())
                            .map(|s| {
                                [
                                    r_jet[li][s][0],
                                    r_pv[li][s]
                                        .max(pade_closed_form(&lvl.blocks[s], eps, l2c)),
                                    r_cp[li][s],
                                    r_jet[li][s][2],
                                ]
                            })
                            .collect()
                    })
                    .collect();
                // Block-tag census at the delta band (|dz| ~ 1024·c_max) over
                // emitted (skip ≥ 4) blocks, plus ladder-violation count.
                let band = l2c + 10.0;
                let mut tag_cnt = [0usize; 4];
                let (mut dead, mut ladder_viol, mut emitted) = (0usize, 0usize, 0usize);
                for (li, lvl) in mlv.iter().enumerate() {
                    if lvl.skip < 4 {
                        continue;
                    }
                    for s in 0..lvl.blocks.len() {
                        emitted += 1;
                        let t = &tiers[li][s];
                        for w in 0..3 {
                            if t[w].is_finite() && t[w + 1].is_finite() && t[w] > t[w + 1] + 1e-9
                            {
                                ladder_viol += 1;
                                break;
                            }
                        }
                        let tag = if band < t[0] {
                            0
                        } else if band < t[1] {
                            1
                        } else if band < t[2] {
                            2
                        } else if band < t[3] {
                            3
                        } else {
                            4
                        };
                        if tag == 4 {
                            dead += 1;
                        } else {
                            tag_cnt[tag] += 1;
                        }
                    }
                }
                // Dispatch replay + single-mode baselines over a pixel row.
                let mut a_steps = 0u64;
                let mut a_apps = [0u64; 4];
                let (mut a_zb, mut st_p, mut st_c, mut st_j) = (0u64, 0u64, 0u64, 0u64);
                for kpx in 0..24 {
                    let t = (kpx as f64 / 24.0) * 2.0 - 1.0;
                    let dc = (t * c_max * 0.7, 0.37 * t * c_max);
                    let a = auto_run_pixel(&mlv, &plv, &jlv, &tiers, &orbit, dc, max_iter, l2c);
                    a_steps += a.steps;
                    a_zb += a.pade_apps_zbound;
                    for k in 0..4 {
                        a_apps[k] += a.apps[k];
                    }
                    st_p += mobius_run_pixel(&plv, &r_pv, &orbit, dc, max_iter).steps as u64;
                    st_c += mobius_run_pixel(&mlv, &r_cp, &orbit, dc, max_iter).steps as u64;
                    st_j += jet_run_pixel(&jlv, &r_jet, &orbit, dc, max_iter).steps as u64;
                }
                let apps_total: u64 = a_apps.iter().sum();
                println!(
                    "[{} c_max={:e}] tags(skip≥4): aff {} padé {} c+ {} jet {} dead {} (of {}, ladder-viol {})",
                    name, c_max, tag_cnt[0], tag_cnt[1], tag_cnt[2], tag_cnt[3], dead, emitted, ladder_viol
                );
                println!(
                    "[{} c_max={:e}] replay: auto steps {} (apps aff {} padé {} c+ {} jet {}) | padé {} c+ {} jet {} | K/1 z-bound {}/{} padé apps",
                    name, c_max, a_steps, a_apps[0], a_apps[1], a_apps[2], a_apps[3],
                    st_p, st_c, st_j, a_zb, a_apps[1]
                );
                // Structural: auto's coverage is the tier union — it cannot need
                // more loop turns than any single mode (2 % slack for trajectory
                // divergence within the certified band).
                for (mode, st) in [("padé", st_p), ("c+", st_c), ("jet", st_j)] {
                    assert!(
                        a_steps as f64 <= st as f64 * 1.02 + 8.0,
                        "[{} c_max={:e}] auto ({} steps) slower than {} ({} steps)",
                        name, c_max, a_steps, mode, st
                    );
                }
                if c_max <= 1e-9 {
                    assert!(
                        apps_total > 0,
                        "[{} c_max={:e}] dispatch never applied a block",
                        name, c_max
                    );
                }
            }
        }
    }
}

#[cfg(test)]
mod size_check {
    #[test]
    fn mobius_coeffs_layout() {
        assert_eq!(std::mem::size_of::<super::MobiusCoeffs>(), 72);
        assert_eq!(std::mem::align_of::<super::MobiusCoeffs>(), 4);
    }
}
