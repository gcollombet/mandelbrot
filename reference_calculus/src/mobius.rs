// Möbius-c+ block skipping (add-mobius-cplus).
//
// The c-augmented rational form (round 7: [2/1] in z — superconvergent
// numerator, findings §14)
// m(z, c) = ((N₂·z + A + A'·c)·z + B·c) / (1 + (D + D'·c)·z + F·c)
// is the Padé vehicle plus three c-coefficients chosen to exactly annihilate
// the zc and z²c cross-terms of the block map — the terms guard (G) exists
// for — plus the pure-c² term (F, the Chisholm-style denominator c-slot: it
// RESUMS the pure-c geometric series instead of correcting it) plus the N₂
// numerator slot: with D = −c₃₀/c₂₀ the denominator resums the z-channel POLE
// (the §14 superconvergence — the compensated q₃₀/q₄₀ vanish on the model
// flow z/(1−Lz)), which is what absorbs the `storedq` model error the (c)
// census measured as the dominant refusal class. The unified table adopted
// the same [2/1] extraction (`mobius_from_jet_k2`) for its rational tiers —
// its §11 identities carry the N₂ terms (a₂₀ = N₂ − D·A, a₃₀ = −D·a₂₀); only
// the PERIODIC header stays on `mobius_from_jet` (quadratic fixed points).
// Coefficients derive from the block's bivariate jet (jet.rs, used
// here as a build-only tool); validity is ONE certified entry radius per block
// from the compensated remainder Q plus a Cauchy tail (rule (V), note §4).
// Source math: MOBIUS_CPLUS_IMPLEMENTATION.md (externally verified) + §14.
#![allow(dead_code)] // consumed progressively by the add-mobius-cplus tasks

use crate::jet::{
    self, cfe_to_coeff, fe_exp2, jet_idx, CFe, JetCoeffFe, JetF64, JetLevel, JET_DS,
    JET_MONOMIALS, JET_NCOEFF,
};

// ── coefficient extraction (note §3) ───────────────────────────────────────────

/// The block coefficients (seven for the standalone [2/1] mode; the unified
/// table's [1/1] extraction leaves `n2` zero). `degenerate` marks c₁₀ = 0
/// blocks (prefix blocks from Z₀ = 0): their radius is −∞ and they are never
/// applied.
#[derive(Clone, Copy, Debug)]
pub struct MobiusCPlus {
    pub a: CFe,  // A  = N₁ = c₁₀
    pub b: CFe,  // B  = c₀₁
    pub d: CFe,  // D  = −c₂₀/c₁₀ ([1/1]) or −c₃₀/c₂₀ ([2/1], superconvergent)
    pub ap: CFe, // A' = c₁₁ + D·B + F·A             (annihilates zc)
    pub dp: CFe, // D' = −(c₂₁ + D·c₁₁ + F·c₂₀)/A    (annihilates z²c)
    pub f: CFe,  // F  = −c₀₂/c₀₁                    (annihilates c², resums pure-c)
    pub n2: CFe, // N₂ = c₂₀ + D·c₁₀ ([2/1] only)    (annihilates z² exactly)
    pub degenerate: bool,
}

const MOBIUS_DEGENERATE: MobiusCPlus = MobiusCPlus {
    a: CFe::ZERO,
    b: CFe::ZERO,
    d: CFe::ZERO,
    ap: CFe::ZERO,
    dp: CFe::ZERO,
    f: CFe::ZERO,
    n2: CFe::ZERO,
    degenerate: true,
};

/// [1/1] extraction (D = −c₂₀/c₁₀, n2 = 0) — the unified table's PERIODIC
/// header form (quadratic fixed points) and the c₂₀ = 0 fallback of the [2/1]
/// extraction; the unified block record itself ships `mobius_from_jet_k2`.
pub fn mobius_from_jet(jet: &JetF64) -> MobiusCPlus {
    let c10 = jet.coeff(1, 0);
    let c01 = jet.coeff(0, 1);
    if c10.is_zero() {
        return MobiusCPlus { b: c01, ..MOBIUS_DEGENERATE };
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
    MobiusCPlus { a, b, d, ap, dp, f, n2: CFe::ZERO, degenerate: false }
}

/// [2/1] extraction (round 7, findings §14): D = −c₃₀/c₂₀ resums the
/// z-channel pole, N₂ = c₂₀ + D·c₁₀ annihilates z² exactly, q₃₀ becomes a
/// constructed zero (superconvergence: the leading live term q₄₀ = c₄₀ + D·c₃₀
/// vanishes on the model flow). A'/D' keep their formulas — with the new D.
/// c₂₀ = 0 falls back to the [1/1] extraction (q₃₀ then stays a live REST
/// term; `block_from_jet` keys the zero list on the same predicate).
pub fn mobius_from_jet_k2(jet: &JetF64) -> MobiusCPlus {
    let c10 = jet.coeff(1, 0);
    if c10.is_zero() {
        return MobiusCPlus { b: jet.coeff(0, 1), ..MOBIUS_DEGENERATE };
    }
    let c20 = jet.coeff(2, 0);
    if c20.is_zero() {
        return mobius_from_jet(jet);
    }
    let c30 = jet.coeff(3, 0);
    let c01 = jet.coeff(0, 1);
    let c11 = jet.coeff(1, 1);
    let c21 = jet.coeff(2, 1);
    let c02 = jet.coeff(0, 2);
    let a = c10;
    let b = c01;
    let d = c30.div(c20).neg();
    let f = if c01.is_zero() { CFe::ZERO } else { c02.div(c01).neg() };
    let n2 = c20.add(d.mul(c10));
    let ap = c11.add(d.mul(b)).add(f.mul(a));
    let dp = c21.add(d.mul(c11)).add(f.mul(c20)).div(a).neg();
    MobiusCPlus { a, b, d, ap, dp, f, n2, degenerate: false }
}

// ── compensated remainder Q (note §4.1) ────────────────────────────────────────

/// Taylor coefficients (degree ≤ D_s) of
/// Q = (1 + (D + D'c)z + Fc)·Φ − ((N₂z + A + A'c)z + Bc):
/// q_ij = c_ij + D·c_{i−1,j} + D'·c_{i−1,j−1} + F·c_{i,j−1} minus {A at (1,0),
/// N₂ at (2,0), A' at (1,1), B at (0,1)} — out-of-range indices contribute 0.
/// By construction q₁₀ = q₀₁ = q₂₀ = q₁₁ = q₀₂ = q₂₁ = 0, plus q₃₀ = 0 for the
/// [2/1] extraction (D-annihilated); with the [1/1] extraction n2 = 0 and the
/// (2,0) subtraction is a no-op (q₂₀ is then D-annihilated). Verifying the
/// zeros numerically is the build-integrity check (mobius_q_integrity_log2).
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
            (2, 0) => v = v.sub(m.n2),
            (1, 1) => v = v.sub(m.ap),
            (0, 1) => v = v.sub(m.b),
            _ => {}
        }
        q[n] = v;
    }
    q
}

/// Worst |q_ij| / scale over the constructed zeros of `zeros` (−∞ when every
/// zero is exact). Scale per slot is the LARGEST term entering the cancellation
/// (|c_ij|, |D·c_{i−1,j}|, |D'·c_{i−1,j−1}|, |F·c_{i,j−1}|, the subtracted
/// block coefficient) — the honest rounding scale: it verifies the formulas,
/// not that the cancellation is benign. Pass MOBIUS_Q_ZEROS for the [1/1]
/// extraction, MOBIUS_Q_ZEROS_K2 for the [2/1] one.
pub fn mobius_q_integrity_log2(
    jet: &JetF64,
    m: &MobiusCPlus,
    q: &[CFe; JET_NCOEFF],
    zeros: &[(usize, usize)],
) -> f64 {
    let l2 = |v: &CFe| v.log2_mag().unwrap_or(f64::NEG_INFINITY);
    let mut worst = f64::NEG_INFINITY;
    for &(i, j) in zeros {
        // If B = c₀₁ vanishes, F deliberately falls back to zero and q₀₂
        // remains a genuine residual term rather than a constructed zero.
        if (i, j) == (0, 2) && m.b.is_zero() {
            continue;
        }
        // The [2/1] extraction falls back to [1/1] when c₂₀ = 0: q₃₀ is then
        // a live REST term, not a constructed zero.
        if (i, j) == (3, 0) && m.n2.is_zero() && jet.coeff(2, 0).is_zero() {
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
            (2, 0) => l2(&m.n2),
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

/// The slots annihilated by the [1/1] extraction (`mobius_from_jet` — the
/// unified table's form).
pub const MOBIUS_Q_ZEROS: &[(usize, usize)] =
    &[(1, 0), (0, 1), (2, 0), (1, 1), (0, 2), (2, 1)];

/// The slots annihilated by the [2/1] extraction (`mobius_from_jet_k2` — the
/// standalone mode): + (3,0), D-annihilated (superconvergence).
pub const MOBIUS_Q_ZEROS_K2: &[(usize, usize)] =
    &[(1, 0), (0, 1), (2, 0), (3, 0), (1, 1), (0, 2), (2, 1)];

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

/// [1/1] block extraction — kept as a census baseline (the pre-adoption
/// unified c+ tier); both the standalone mode AND the unified table now ship
/// the [2/1] blocks (`block_from_jet` / `mobius_from_jet_k2`).
pub fn block_from_jet_k1(jet: &JetF64) -> MobiusBlock {
    let m = mobius_from_jet(jet);
    let mut log2_q = [f64::NEG_INFINITY; JET_NCOEFF];
    if !m.degenerate {
        let q = mobius_q(jet, &m);
        for (n, v) in q.iter().enumerate() {
            log2_q[n] = v.log2_mag().unwrap_or(f64::NEG_INFINITY);
        }
        for &(i, j) in MOBIUS_Q_ZEROS {
            if (i, j) == (0, 2) && m.b.is_zero() {
                continue;
            }
            log2_q[jet_idx(i, j)] = f64::NEG_INFINITY;
        }
    }
    MobiusBlock { m, log2_q }
}

/// [1/1] level builder for the dispatch-modeling censuses (same scaffold).
pub fn mobius_build_levels_k1(orbit: &[(f64, f64)], max_skip: usize) -> Vec<MobiusLevel> {
    mobius_build_levels_extract(orbit, max_skip, block_from_jet_k1)
}

fn block_from_jet(jet: &JetF64) -> MobiusBlock {
    let m = mobius_from_jet_k2(jet);
    let mut log2_q = [f64::NEG_INFINITY; JET_NCOEFF];
    if !m.degenerate {
        let q = mobius_q(jet, &m);
        for (n, v) in q.iter().enumerate() {
            log2_q[n] = v.log2_mag().unwrap_or(f64::NEG_INFINITY);
        }
        // The constructed zeros are exact by design (verified by the
        // integrity test); their stored residue would only pollute REST.
        // q₀₂ is only annihilated when B = c₀₁ is nonzero, and q₃₀ only when
        // the [2/1] extraction is active (c₂₀ ≠ 0) — the fallbacks keep them
        // as live REST terms.
        for &(i, j) in MOBIUS_Q_ZEROS_K2 {
            if (i, j) == (0, 2) && m.b.is_zero() {
                continue;
            }
            if (i, j) == (3, 0) && jet.coeff(2, 0).is_zero() {
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
    mobius_build_levels_extract(orbit, max_skip, extract)
}

fn mobius_build_levels_extract(
    orbit: &[(f64, f64)],
    max_skip: usize,
    extract: fn(&JetF64) -> MobiusBlock,
) -> Vec<MobiusLevel> {
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
    // Tolerance 0.05 log2 (≈11 iters on the ~100-log2 range) instead of the
    // former fixed 20: R_z precision stays ≪ the 0.1-log2 scan-step heritage,
    // and each saved iteration is one full O(skip) majorant walk — this
    // bisection is ~40 % of the cold build (§8.2 timing harness). Fewer iters
    // only loosen the polydisc slightly; the walk is a valid majorant at any
    // R_z, so this never over-certifies (the peak target is a tightness knob,
    // not a soundness one — the polydisc-invariant test is the referee). The
    // final M is reused from the last VALID evaluation (lo side) instead of a
    // dedicated closing walk.
    const RZ_TOL_LOG2: f64 = 0.05;
    let mut m_lo = f64::INFINITY; // lo0's peak passed but its M was discarded
    let mut lo_fresh = false; // m_lo valid for the current lo?
    let mut iters = 0;
    while hi - lo > RZ_TOL_LOG2 && iters < 20 {
        iters += 1;
        let mid = 0.5 * (lo + hi);
        let (p, m) = peak(mid);
        if p < MOBIUS_RHO_TARGET_LOG2 {
            lo = mid;
            m_lo = m;
            lo_fresh = true;
        } else {
            hi = mid;
        }
    }
    if !lo_fresh {
        let (_, m) = peak(lo);
        m_lo = m;
    }
    (lo, m_lo)
}

/// Per block, per R_c rung: bisect R_z to the tightest runaway-free polydisc
/// (peak ρ < 0.5), then assemble
/// M_Q = (1 + |D|R_z + |D'|R_zR_c + |F|R_c)·M
///       + |A|R_z + |N₂|R_z² + |A'|R_zR_c + |B|R_c.
/// The seed moduli 2|Z_i| in mantissa/exponent form — the majorant walk's
/// input (shared by the table build and the single-segment certificate).
fn mobius_twoz(orbit: &[(f64, f64)]) -> Vec<(f64, i64)> {
    orbit
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
        .collect()
}

/// The anisotropy-rung R_c values for a given c_max (table headroom stamp).
fn mobius_rungs(log2_c_max: f64) -> [f64; MOBIUS_NCAND] {
    let mut log2_rc = [0f64; MOBIUS_NCAND];
    for (is, &s) in MOBIUS_S.iter().enumerate() {
        log2_rc[is] = s.log2() + log2_c_max;
    }
    log2_rc
}

/// One block's bisected-majorant bounds over its seed segment: per rung, the
/// bisected R_z and the M_Q Cauchy majorant of the compensated remainder Q on
/// the (R_z, R_c) polydisc (note §4.2).
fn mobius_block_bounds(
    blk: &MobiusBlock,
    seg: &[(f64, i64)],
    log2_rc: &[f64; MOBIUS_NCAND],
) -> MobiusBounds {
    let mut b = MobiusBounds {
        log2_rz: [f64::NEG_INFINITY; MOBIUS_NCAND],
        log2_mq: [f64::INFINITY; MOBIUS_NCAND],
    };
    if blk.m.degenerate {
        return b;
    }
    let la = cfe_log2(&blk.m.a);
    let lb = cfe_log2(&blk.m.b);
    let ld = cfe_log2(&blk.m.d);
    let lap = cfe_log2(&blk.m.ap);
    let ldp = cfe_log2(&blk.m.dp);
    let lf = cfe_log2(&blk.m.f);
    let ln2 = cfe_log2(&blk.m.n2);
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
            ln2 + 2.0 * log2_rz,
            lap + log2_rz + log2_rc[c],
            lb + log2_rc[c],
        ]);
    }
    b
}

pub fn mobius_build_bounds(
    levels: &[MobiusLevel],
    orbit: &[(f64, f64)],
    log2_c_max: f64,
) -> MobiusBoundsTable {
    let twoz = mobius_twoz(orbit);
    let log2_rc = mobius_rungs(log2_c_max);
    let per_level = levels
        .iter()
        .map(|lvl| {
            (0..lvl.blocks.len())
                .map(|slot| {
                    let first = 1 + slot * lvl.skip;
                    let seg = &twoz[first..first + lvl.skip];
                    mobius_block_bounds(&lvl.blocks[slot], seg, &log2_rc)
                })
                .collect()
        })
        .collect();
    MobiusBoundsTable { log2_rc, per_level }
}

/// Full Cauchy certificate for ONE composed block over an arbitrary seed
/// segment — the periodic block Φ_p, composed from the seeds at
/// orbit[start..start+p]. Runs the exact machinery the table blocks get:
/// bisected-majorant bounds per anisotropy rung (M_Q over the p steps), then
/// the strict (V) value solve (x = 0 gated — the radial-property endpoint)
/// and the (V′) derivative solve. Returns log2 of the certified entry radius
/// (min of the two), −∞ when no rung certifies. Replaces the tail-free
/// closed-form oracle the periodic header shipped with — the reason the
/// runtime shortcut stayed disabled.
pub fn mobius_certify_segment(
    blk: &MobiusBlock,
    orbit_seg: &[(f64, f64)],
    epsilon: f64,
    log2_c_max: f64,
) -> f64 {
    if blk.m.degenerate || orbit_seg.is_empty() {
        return f64::NEG_INFINITY;
    }
    let twoz = mobius_twoz(orbit_seg);
    let log2_rc = mobius_rungs(log2_c_max);
    let bounds = mobius_block_bounds(blk, &twoz, &log2_rc);
    let table = MobiusBoundsTable { log2_rc, per_level: Vec::new() };
    let r = mobius_solve_radius(blk, &bounds, &table, epsilon, log2_c_max);
    let rd = mobius_solve_derivative_radius(blk, &bounds, &table, epsilon, log2_c_max);
    r.min(rd)
}

// ── certified radius: condition (V) by upper-crossing bisection (note §4.3) ──

/// Solve floor: 1e-16, the old scan grid's bottom — a radius below it is
/// useless at runtime, so a candidate whose crossing sits under the floor
/// emits nothing.
///
/// The raw condition is not guaranteed monotone in x, but REST − ½ε·S·DEN is
/// convex in x (positive monomials plus a convex Cauchy tail, minus a concave
/// quadratic while DEN > 0), so the admissible set is an INTERVAL that may
/// exclude 0 (correctif §4.1). The runtime test |z| < r admits every |z| down
/// to 0, so a candidate emits a radius only when (V) holds at x = 0 — its
/// admissible set is then the prefix [0, x*] (the DEN > ½ cut is a prefix too:
/// DEN decreases in x), and the upper crossing x* is found by bisection
/// instead of the old 0.1-decade descending scan. Soundness is unchanged: the
/// returned point is always verified true, and convexity + the x = 0 endpoint
/// cover the whole interval below it, exactly as they covered the accepted
/// scan point. A candidate failing at x = 0 (pure-c residual over the
/// ½ε|B|c_max·DEN budget) contributes NO radius, whatever pointwise successes
/// a search would find.
const SCAN_FLOOR_LOG2: f64 = -53.150_849_518_197_8; // 1e-16

/// Largest log2 x in [floor, top] satisfying a prefix predicate (true on
/// [0, x*], false above — monotonicity is the CALLER's certificate: convexity
/// + an x = 0 success for (V), term-wise monotone bounds for (V′)). Returns
/// top when it already holds there, −∞ when even floor fails (x* below the
/// useful range — 2 evaluations, the common dead-candidate case at strict ε).
/// Otherwise an exponential downward bracket from top (crossings cluster near
/// R_z at loose ε, so the bracket usually closes in 1–2 probes) then bisection
/// to a 0.02-log2 tolerance — ~16× finer than the old 0.1-decade grid at a
/// fraction of its evaluations. The returned point is always verified true, so
/// like mobius_bisect_rz this never over-certifies on its own.
pub(crate) fn bisect_last_success(top: f64, floor: f64, cond: impl Fn(f64) -> bool) -> f64 {
    const TOL: f64 = 0.02;
    if cond(top) {
        return top;
    }
    if !cond(floor) {
        return f64::NEG_INFINITY;
    }
    // Bracket: hi is known false, lo known true; probe top−0.5, top−1, top−2…
    let mut hi = top;
    let mut lo = floor;
    let mut off = 0.5;
    while top - off > floor {
        if cond(top - off) {
            lo = top - off;
            break;
        }
        hi = top - off;
        off *= 2.0;
    }
    while hi - lo > TOL {
        let mid = 0.5 * (lo + hi);
        if cond(mid) {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    lo
}

/// Per-block precomputation for pointwise (V) evaluation, shared by the solver
/// scan and the regression battery (`mobius_v_certified_at`).
struct MobiusVPre {
    la: f64,
    lb: f64,
    ld: f64,
    ldp: f64,
    den_f: f64,
    log2_half_eps: f64,
    log2_c_max: f64,
    /// Power-of-x coefficients of the stored REST terms:
    /// C_i = Σ_j |q_ij|·c_max^j (log2), shared by every candidate and point.
    cpow: [f64; JET_DS + 1],
}

impl MobiusVPre {
    fn new(blk: &MobiusBlock, epsilon: f64, log2_c_max: f64) -> Self {
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
        // The |F|·c_max DEN contribution is x-independent: hoist it out.
        let df = cfe_log2(&blk.m.f) + log2_c_max;
        MobiusVPre {
            la: cfe_log2(&blk.m.a),
            lb: cfe_log2(&blk.m.b),
            ld: cfe_log2(&blk.m.d),
            ldp: cfe_log2(&blk.m.dp),
            den_f: if df > -80.0 { df.exp2() } else { 0.0 },
            log2_half_eps: epsilon.log2() - 1.0,
            log2_c_max,
            cpow,
        }
    }

    /// (V) at log2 x (`NEG_INFINITY` evaluates the x = 0 endpoint) on one
    /// candidate polydisc: REST(x, c_max) ≤ ½·ε·(|A|·x + |B|·c_max)·DEN with
    /// DEN(x, c_max) > 0.5.
    fn holds_at(&self, log2_mq: f64, log2_rz: f64, log2_theta_c: f64, x: f64) -> bool {
        // DEN(x, c_max) > 0.5, computed in linear domain (values ≤ O(1)).
        let d1 = self.ld + x;
        let d2 = self.ldp + x + self.log2_c_max;
        let den = 1.0
            - if d1 > -80.0 { d1.exp2() } else { 0.0 }
            - if d2 > -80.0 { d2.exp2() } else { 0.0 }
            - self.den_f;
        if den <= 0.5 {
            return false;
        }
        let rhs = self.log2_half_eps + lse2(&[self.la + x, self.lb + self.log2_c_max]);
        // Σ REST terms / 2^rhs, accumulated in linear domain.
        let mut acc = 0.0f64;
        for (i, &ci) in self.cpow.iter().enumerate() {
            if ci == f64::NEG_INFINITY {
                continue;
            }
            // The pure-c row carries no x power (and 0·(−∞) would be NaN).
            let t = if i == 0 { ci - rhs } else { ci + i as f64 * x - rhs };
            if t > 62.0 {
                return false;
            }
            if t > -62.0 {
                acc += t.exp2();
            }
        }
        if acc > den {
            return false;
        }
        let ltheta = (x - log2_rz).max(log2_theta_c);
        let t = mobius_cauchy_tail_log2(log2_mq, ltheta) - rhs;
        if t > 62.0 {
            return false;
        }
        if t > -62.0 {
            acc += t.exp2();
        }
        acc <= den
    }
}

/// Solve (V) for one block: largest log2 x such that the WHOLE interval [0, x]
/// is certified — (V) at x = 0 AND at the returned bisection point on the same
/// candidate polydisc (convexity closes the interval in between), maximized
/// over candidates. −∞ when no candidate certifies, including every candidate
/// whose pure-c residual fails the x = 0 budget (correctif §4.1: a pointwise
/// success above such a gap would NOT cover the runtime test |z| < r).
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
    let pre = MobiusVPre::new(blk, epsilon, log2_c_max);
    // DEN(x) < DEN(0) = 1 − |F|·c_max: when the x = 0 margin already fails,
    // no scan point can pass either.
    if 1.0 - pre.den_f <= 0.5 {
        return f64::NEG_INFINITY;
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
        // (V) at the x = 0 endpoint: this candidate's admissible set is an
        // interval; if it excludes 0, no radius it emits can cover |z| < r.
        if !pre.holds_at(log2_mq, log2_rz, log2_theta_c, f64::NEG_INFINITY) {
            continue;
        }
        // With x = 0 certified the admissible set is the prefix [0, x*]:
        // bisect the upper crossing. Floor at `best` — a crossing below the
        // running max cannot improve it.
        let r = bisect_last_success(start, SCAN_FLOOR_LOG2.max(best), |x| {
            pre.holds_at(log2_mq, log2_rz, log2_theta_c, x)
        });
        best = best.max(r);
    }
    best
}

/// Pointwise (V) certificate at log2 x (`NEG_INFINITY` = the x = 0 endpoint):
/// true when some candidate polydisc certifies the point. Regression-battery
/// hook (correctif §13 item 2) — an emitted radius r promises this holds for
/// EVERY x ≤ r, not just the accepted scan point.
pub fn mobius_v_certified_at(
    blk: &MobiusBlock,
    bounds: &MobiusBounds,
    table: &MobiusBoundsTable,
    epsilon: f64,
    log2_c_max: f64,
    log2_x: f64,
) -> bool {
    if blk.m.degenerate {
        return false;
    }
    let pre = MobiusVPre::new(blk, epsilon, log2_c_max);
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
        if pre.holds_at(log2_mq, log2_rz, log2_theta_c, log2_x) {
            return true;
        }
    }
    false
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
    // Power-of-x rows (same precompute shape as MobiusVPre — this is what
    // keeps the per-evaluation cost at a handful of exp2 instead of ten lse2):
    // qpow[i] = Σ_j |q_ij|·c_max^j and qzpow[i−1] = Σ_j i·|q_ij|·c_max^j.
    let mut qpow = [f64::NEG_INFINITY; JET_DS + 1];
    let mut qzpow = [f64::NEG_INFINITY; JET_DS];
    for (n, &(i, j)) in JET_MONOMIALS.iter().enumerate() {
        let l = blk.log2_q[n];
        if !l.is_finite() {
            continue;
        }
        let t = l + j as f64 * log2_c_max;
        let slot = &mut qpow[i as usize];
        *slot = if slot.is_finite() { lse2(&[*slot, t]) } else { t };
        if i >= 1 {
            let tz = t + (i as f64).log2();
            let slot = &mut qzpow[i as usize - 1];
            *slot = if slot.is_finite() { lse2(&[*slot, tz]) } else { tz };
        }
    }
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
        let start = log2_rz + (0.999f64).log2();
        if start <= best {
            continue;
        }
        // The (V′) bound is term-wise monotone increasing in x (every REST
        // and tail term carries a nonnegative x power, DEN decreases in x,
        // the rhs is x-free), so the admissible set is a prefix — bisect the
        // upper crossing directly, floored at the running max. The condition
        // Q_z/DEN + |De|·Q/DEN² ≤ 2^rhs is evaluated in the linear domain
        // relative to 2^rhs (positive terms, early exits), like holds_at.
        let cond = |x: f64| {
            let d1 = ld + x;
            let d2 = ldp + x + log2_c_max;
            let den = 1.0
                - if d1 > -80.0 { d1.exp2() } else { 0.0 }
                - if d2 > -80.0 { d2.exp2() } else { 0.0 }
                - den_f;
            if den <= 0.5 {
                return false;
            }
            let log2_den = den.log2();
            let base_z = rhs + log2_den; // Q_z channel: /DEN
            let base_q = rhs + 2.0 * log2_den - ldeff; // Q channel: ·|De|/DEN²
            let mut acc = 0.0f64;
            let log2_theta = (x - log2_rz).max(log2_theta_c);
            let mut push = |t: f64| -> bool {
                if t > 62.0 {
                    return false;
                }
                if t > -62.0 {
                    acc += t.exp2();
                }
                acc <= 1.0
            };
            for (i, &l) in qzpow.iter().enumerate() {
                if l.is_finite() && !push(l + i as f64 * x - base_z) {
                    return false;
                }
            }
            if !push(mobius_cauchy_dz_tail_log2(log2_mq, log2_rz, log2_theta) - base_z) {
                return false;
            }
            if ldeff.is_finite() {
                for (i, &l) in qpow.iter().enumerate() {
                    if l.is_finite() && !push(l + i as f64 * x - base_q) {
                        return false;
                    }
                }
                if !push(mobius_cauchy_tail_log2(log2_mq, log2_theta) - base_q) {
                    return false;
                }
            }
            acc <= 1.0
        };
        best = best.max(bisect_last_success(start, SCAN_FLOOR_LOG2.max(best), cond));
    }
    best
}

/// Solve every block's Cauchy-certified ∂z radius, index-aligned with
/// mobius_build_radii. `value_gate` short-circuits blocks whose (V) VALUE
/// radius is already −∞: the shipped radius is min(r, r′), so a dead value
/// kills the tier whatever (V′) would say — solving it is pure build cost
/// (interior references produce dead blocks in bulk: the cycle passes near
/// Z ≈ 0). Pass None for the ungated build (censuses, diagnostics).
pub fn mobius_build_derivative_radii(
    levels: &[MobiusLevel],
    bounds: &MobiusBoundsTable,
    epsilon: f64,
    log2_c_max: f64,
    value_gate: Option<&[Vec<f64>]>,
) -> Vec<Vec<f64>> {
    levels
        .iter()
        .zip(bounds.per_level.iter())
        .enumerate()
        .map(|(li, (lvl, blv))| {
            lvl.blocks
                .iter()
                .zip(blv.iter())
                .enumerate()
                .map(|(s, (blk, b))| {
                    if let Some(gate) = value_gate {
                        if !gate[li][s].is_finite() {
                            return f64::NEG_INFINITY;
                        }
                    }
                    mobius_solve_derivative_radius(blk, b, bounds, epsilon, log2_c_max)
                })
                .collect()
        })
        .collect()
}

/// Bounds for the cplus AND plain views of the same level geometry in ONE
/// majorant pass: the bisected (R_z, M) per rung depend only on the seed
/// segment and the rung — not on the block coefficients — so the two tables
/// share them and only the M_Q assembly differs. Halves the unified bounds
/// stage relative to two independent mobius_build_bounds calls.
pub fn mobius_build_bounds_pair(
    cplus: &[MobiusLevel],
    plain: &[MobiusLevel],
    orbit: &[(f64, f64)],
    log2_c_max: f64,
) -> (MobiusBoundsTable, MobiusBoundsTable) {
    let twoz = mobius_twoz(orbit);
    let log2_rc = mobius_rungs(log2_c_max);
    let mut per_c: Vec<Vec<MobiusBounds>> = Vec::with_capacity(cplus.len());
    let mut per_p: Vec<Vec<MobiusBounds>> = Vec::with_capacity(plain.len());
    for (lc, lp) in cplus.iter().zip(plain.iter()) {
        let mut row_c = Vec::with_capacity(lc.blocks.len());
        let mut row_p = Vec::with_capacity(lp.blocks.len());
        for slot in 0..lc.blocks.len() {
            let first = 1 + slot * lc.skip;
            let seg = &twoz[first..first + lc.skip];
            let bc = &lc.blocks[slot];
            let bp = &lp.blocks[slot];
            let mut out_c = MobiusBounds {
                log2_rz: [f64::NEG_INFINITY; MOBIUS_NCAND],
                log2_mq: [f64::INFINITY; MOBIUS_NCAND],
            };
            let mut out_p = out_c;
            if !bc.m.degenerate {
                for c in 0..MOBIUS_NCAND {
                    let (log2_rz, log2_m) = mobius_bisect_rz(seg, log2_rc[c]);
                    if !log2_rz.is_finite() || !log2_m.is_finite() {
                        continue; // rung saturates for this block
                    }
                    for (blk, out) in [(bc, &mut out_c), (bp, &mut out_p)] {
                        let fac = lse2(&[
                            0.0,
                            cfe_log2(&blk.m.d) + log2_rz,
                            cfe_log2(&blk.m.dp) + log2_rz + log2_rc[c],
                            cfe_log2(&blk.m.f) + log2_rc[c],
                        ]);
                        out.log2_rz[c] = log2_rz;
                        out.log2_mq[c] = lse2(&[
                            fac + log2_m,
                            cfe_log2(&blk.m.a) + log2_rz,
                            cfe_log2(&blk.m.n2) + 2.0 * log2_rz,
                            cfe_log2(&blk.m.ap) + log2_rz + log2_rc[c],
                            cfe_log2(&blk.m.b) + log2_rc[c],
                        ]);
                    }
                }
            }
            row_c.push(out_c);
            row_p.push(out_p);
        }
        per_c.push(row_c);
        per_p.push(row_p);
    }
    (
        MobiusBoundsTable { log2_rc, per_level: per_c },
        MobiusBoundsTable { log2_rc, per_level: per_p },
    )
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

/// GPU coefficient record, 84 B: the seven block coefficients with PRIVATE
/// exponents each (the spike measured within-group spreads up to 61 bits —
/// far past the shared-mantissa budget — so the D1 fallback applies to every
/// group). Order: A, B, A', D, D', F, N₂. Orbit-keyed: serialized once per
/// orbit, never re-uploaded on a radius re-solve.
#[repr(C)]
#[derive(Copy, Clone, Debug, PartialEq)]
pub struct MobiusCoeffs {
    pub a: JetCoeffFe,
    pub b: JetCoeffFe,
    pub ap: JetCoeffFe,
    pub d: JetCoeffFe,
    pub dp: JetCoeffFe,
    pub f: JetCoeffFe,
    pub n2: JetCoeffFe,
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

/// True when all seven coefficients reconstruct inside the f32 range with
/// Horner headroom — the build-side gate for the shallow fast-path flag.
pub fn mobius_f32_safe(m: &MobiusCPlus) -> bool {
    [&m.a, &m.b, &m.ap, &m.d, &m.dp, &m.f, &m.n2].iter().all(|c| match c.log2_mag() {
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
                n2: cfe_to_coeff(&blk.m.n2),
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

/// Plain view of the [2/1] extraction (A' = D' = F = 0, D/N₂ kept) — the
/// unified table's Padé tier (a plain [2/1]: q₃₀ joins the constructed zeros).
pub fn mobius_from_jet_plain_k2(jet: &JetF64) -> MobiusCPlus {
    let mut m = mobius_from_jet_k2(jet);
    m.ap = CFe::ZERO;
    m.dp = CFe::ZERO;
    m.f = CFe::ZERO;
    m
}

/// Orbit-keyed block data for the plain-[2/1] variant (unified-dispatch census
/// tool). Zeros: q₁₀/q₀₁/q₂₀ always, q₃₀ only when the [2/1] extraction is
/// live (c₂₀ ≠ 0 — the fallback keeps it a live REST term).
pub fn block_from_jet_plain_k2(jet: &JetF64) -> MobiusBlock {
    let m = mobius_from_jet_plain_k2(jet);
    let mut log2_q = [f64::NEG_INFINITY; JET_NCOEFF];
    if !m.degenerate {
        let q = mobius_q(jet, &m);
        for (n, v) in q.iter().enumerate() {
            log2_q[n] = v.log2_mag().unwrap_or(f64::NEG_INFINITY);
        }
        for &(i, j) in &[(1usize, 0usize), (0, 1), (2, 0), (3, 0)] {
            if (i, j) == (3, 0) && jet.coeff(2, 0).is_zero() {
                continue;
            }
            log2_q[jet_idx(i, j)] = f64::NEG_INFINITY;
        }
    }
    MobiusBlock { m, log2_q }
}

/// Plain-[2/1] level builder (unified-dispatch censuses — the Padé-tier model).
pub fn mobius_build_levels_plain_k2(
    orbit: &[(f64, f64)],
    max_skip: usize,
) -> Vec<MobiusLevel> {
    mobius_build_levels_extract(orbit, max_skip, block_from_jet_plain_k2)
}

/// Apply the block map and its two partials at (z, c):
/// m = ((N₂·z + Ae)·z + B·c)/den with Ae = A + A'·c, De = D + D'·c,
/// den = 1 + De·z + F·c;
/// ∂m/∂z = (2N₂·z + Ae − m·De)/den;
/// ∂m/∂c = (A'·z + B − m·(D'·z + F))/den.
pub fn mobius_apply(m: &MobiusCPlus, z: CFe, c: CFe) -> (CFe, CFe, CFe) {
    let ae = m.a.add(m.ap.mul(c));
    let de = m.d.add(m.dp.mul(c));
    let n2z = m.n2.mul(z);
    let den = CFe::ONE.add(de.mul(z)).add(m.f.mul(c));
    let phi = n2z.add(ae).mul(z).add(m.b.mul(c)).div(den);
    let ddz = n2z.add(n2z).add(ae).sub(phi.mul(de)).div(den);
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

// ── §18 stage 1: stable Möbius block power ──────────────────────────────────────
// The §17 periodic block evaluates k periods through the fixed points ζ± and
// w ↦ κ^k·w — ill-conditioned when the RETURN's fixed points coalesce (the
// parabolic boundary; §18 stage 1). §18 suggested the divided-difference /
// double-eigenvalue matrix form M^k = D_k·M − det·D_{k−1}·I. MEASURED
// (mobius_pow_stable_at_coalescence): the eigen path — divided differences OR
// naive λ^k — floors at ~|B·c|-relative error as dc → 0, an intrinsic
// cancellation (λ₂ − Ae ≈ B·c·De/(Ae−Ff) is formed from O(1) quantities, so
// the CONVERGED iterate ζa = m12/m22 inherits a 2^−52/|Bc| relative error:
// 5e-6 at dc = 1e-8, k = 1000 on the period2 tail block, where the §17
// w-form sits at 1.3e-1). BINARY POWERING with per-squaring normalization
// (the map is projective — any scalar divides out) has NO decomposition and
// NO coalescence sensitivity: 4e-15 on the same cases, O(log k) 2×2 complex
// multiplies (~160 cmul at k = 10⁶). That is the stable stage-1 form.
// f64 complex, like the §17 CPU model; fe-ification belongs to GPU wiring.

type C64 = (f64, f64);

fn p_cm(a: C64, b: C64) -> C64 {
    (a.0 * b.0 - a.1 * b.1, a.0 * b.1 + a.1 * b.0)
}

/// The 2×2 matrix [[m11, m12], [m21, m22]] of M^k for the c-fixed Möbius map
/// g(δ) = (Ae·δ + B·c)/(De·δ + (1 + F·c)), Ae = A + A'·c, De = D + D'·c —
/// g^k(δ) = (m11·δ + m12)/(m21·δ + m22). Normalized binary powering: stable
/// through the fixed-point coalescence (see the section note), overflow-free
/// for any |eigenvalue| (the normalization divides out projectively).
pub fn mobius_pow_stable(m: &MobiusCPlus, c: C64, k: u64) -> [C64; 4] {
    let ac = m.ap.to_f64();
    let dc = m.dp.to_f64();
    let ae = { let a = m.a.to_f64(); (a.0 + p_cm(ac, c).0, a.1 + p_cm(ac, c).1) };
    let de = { let d = m.d.to_f64(); (d.0 + p_cm(dc, c).0, d.1 + p_cm(dc, c).1) };
    let bc = p_cm(m.b.to_f64(), c);
    let ff = { let f = p_cm(m.f.to_f64(), c); (1.0 + f.0, f.1) };
    let mmul = |x: &[C64; 4], y: &[C64; 4]| -> [C64; 4] {
        [
            (p_cm(x[0], y[0]).0 + p_cm(x[1], y[2]).0, p_cm(x[0], y[0]).1 + p_cm(x[1], y[2]).1),
            (p_cm(x[0], y[1]).0 + p_cm(x[1], y[3]).0, p_cm(x[0], y[1]).1 + p_cm(x[1], y[3]).1),
            (p_cm(x[2], y[0]).0 + p_cm(x[3], y[2]).0, p_cm(x[2], y[0]).1 + p_cm(x[3], y[2]).1),
            (p_cm(x[2], y[1]).0 + p_cm(x[3], y[3]).0, p_cm(x[2], y[1]).1 + p_cm(x[3], y[3]).1),
        ]
    };
    let norm = |x: &mut [C64; 4]| {
        let s = x
            .iter()
            .map(|e| e.0.abs().max(e.1.abs()))
            .fold(0.0f64, f64::max);
        if s > 0.0 {
            let inv = 1.0 / s;
            for e in x.iter_mut() {
                *e = (e.0 * inv, e.1 * inv);
            }
        }
    };
    let mut acc: [C64; 4] = [(1.0, 0.0), (0.0, 0.0), (0.0, 0.0), (1.0, 0.0)];
    let mut base = [ae, bc, de, ff];
    let mut kk = k;
    while kk > 0 {
        if kk & 1 == 1 {
            acc = mmul(&acc, &base);
            norm(&mut acc);
        }
        base = mmul(&base, &base);
        norm(&mut base);
        kk >>= 1;
    }
    acc
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

        // ── [2/1] extraction (round 7) ─────────────────────────────────────
        // Direct formulas: D₂ = −c₃₀/c₂₀, N₂ = c₂₀ + D₂·c₁₀, A'/D' with D₂.
        for (name, jet) in [("two-step", &j2), ("three-step", &j3)] {
            let m = mobius_from_jet_k2(jet);
            assert!(!m.degenerate, "{}: [2/1] degenerate on O(1) orbit", name);
            let c10 = jet.coeff(1, 0).to_f64();
            let c01 = jet.coeff(0, 1).to_f64();
            let c20 = jet.coeff(2, 0).to_f64();
            let c30 = jet.coeff(3, 0).to_f64();
            let c11 = jet.coeff(1, 1).to_f64();
            let c21 = jet.coeff(2, 1).to_f64();
            let c02 = jet.coeff(0, 2).to_f64();
            let d = { let t = cdiv(c30, c20); (-t.0, -t.1) };
            let f = { let t = cdiv(c02, c01); (-t.0, -t.1) };
            let n2 = { let t = cm(d, c10); (c20.0 + t.0, c20.1 + t.1) };
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
            assert_close(m.a.to_f64(), c10, 1e-14, &format!("{} A [2/1]", name));
            assert_close(m.b.to_f64(), c01, 1e-14, &format!("{} B [2/1]", name));
            assert_close(m.d.to_f64(), d, 1e-13, &format!("{} D [2/1]", name));
            assert_close(m.n2.to_f64(), n2, 1e-13, &format!("{} N₂ [2/1]", name));
            assert_close(m.f.to_f64(), f, 1e-13, &format!("{} F [2/1]", name));
            assert_close(m.ap.to_f64(), ap, 1e-13, &format!("{} A' [2/1]", name));
            assert_close(m.dp.to_f64(), dp, 1e-13, &format!("{} D' [2/1]", name));
        }
        // [2/1] seed closed forms: the seed step IS degree 2 — c₂₀ = 1,
        // c₃₀ = 0 ⟹ D₂ = 0, N₂ = 1, A' = D' = F = 0: m = (z² + 2Z·z + c)/1,
        // the EXACT step (zero remainder).
        let m = mobius_from_jet_k2(&seed);
        assert_close(m.a.to_f64(), a, 1e-14, "seed [2/1] A = 2Z");
        assert_close(m.n2.to_f64(), (1.0, 0.0), 1e-14, "seed [2/1] N₂ = 1");
        assert_close(m.b.to_f64(), (1.0, 0.0), 1e-14, "seed [2/1] B = 1");
        assert!(m.d.is_zero(), "seed [2/1] D = 0, got {:?}", m.d);
        assert!(m.ap.is_zero(), "seed [2/1] A' = 0, got {:?}", m.ap);
        assert!(m.dp.is_zero(), "seed [2/1] D' = 0, got {:?}", m.dp);
        assert!(m.f.is_zero(), "seed [2/1] F = 0, got {:?}", m.f);
        // c₂₀ = 0 falls back to the [1/1] extraction (n2 = 0, D = −c₂₀/c₁₀).
        let mut lin = JetF64::ZERO;
        lin.a[jet_idx(1, 0)] = CFe::ONE;
        lin.a[jet_idx(0, 1)] = CFe::ONE;
        let mf = mobius_from_jet_k2(&lin);
        assert!(!mf.degenerate && mf.n2.is_zero() && mf.d.is_zero());
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
            mobius_q_integrity_log2(&jet, &m, &q, MOBIUS_Q_ZEROS),
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
        // (task 2.2, round 7) The build-integrity invariant on BOTH extractions:
        // [1/1] (unified's): q₁₀/q₀₁/q₂₀/q₁₁/q₀₂/q₂₁ vanish; [2/1] (standalone):
        // + q₃₀ (D-annihilated, superconvergence). ~1e-14 relative on EVERY
        // block of every test orbit, and the leading surviving q terms match
        // their closed forms ([1/1]: q₃₀ = c₃₀ + D₁·c₂₀ = c₃₀ − c₂₀²/c₁₀;
        // [2/1]: q₄₀ = c₄₀ + D₂·c₃₀ = c₄₀ − c₃₀²/c₂₀ — the §14 superconvergence
        // numerator — and q₀₃ = c₀₃ + F·c₀₂ on both).
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
                    for (m, zeros) in [
                        (mobius_from_jet(jet), MOBIUS_Q_ZEROS),
                        (mobius_from_jet_k2(jet), MOBIUS_Q_ZEROS_K2),
                    ] {
                        if m.degenerate {
                            continue;
                        }
                        let q = mobius_q(jet, &m);
                        let integ = mobius_q_integrity_log2(jet, &m, &q, zeros);
                        worst = worst.max(integ);
                        assert!(
                            integ <= tol_log2,
                            "[{}] skip {} block ({} zeros): q-zero integrity 2^{:.1} (rel {:.2e})",
                            name, lvl.skip, zeros.len(), integ, integ.exp2()
                        );
                        checked += 1;
                    }
                }
            }
            println!(
                "[{}] q-zeros checked on {} (block × extraction), worst rel 2^{:.1}",
                name, checked, worst
            );
            assert!(checked > 100, "[{}] too few blocks ({})", name, checked);
            // Closed forms on one mid-level block.
            let lvl = &levels[4.min(levels.len() - 1)];
            let jet = &lvl.entries[0];
            // [1/1]: q₃₀ = c₃₀ + D₁·c₂₀ (the K=1 superconvergence numerator).
            let m1 = mobius_from_jet(jet);
            let q1 = mobius_q(jet, &m1);
            let want_q30 = jet.coeff(3, 0).add(m1.d.mul(jet.coeff(2, 0)));
            let got = q1[jet_idx(3, 0)].sub(want_q30);
            assert!(
                got.log2_mag().unwrap_or(f64::NEG_INFINITY)
                    < want_q30.log2_mag().unwrap_or(0.0) - 40.0,
                "[{}] q30 closed form ([1/1])",
                name
            );
            // [2/1]: q₄₀ = c₄₀ + D₂·c₃₀ (the §14 superconvergence numerator).
            let m2 = mobius_from_jet_k2(jet);
            let q2 = mobius_q(jet, &m2);
            let want_q40 = jet.coeff(4, 0).add(m2.d.mul(jet.coeff(3, 0)));
            let got = q2[jet_idx(4, 0)].sub(want_q40);
            assert!(
                got.log2_mag().unwrap_or(f64::NEG_INFINITY)
                    < want_q40.log2_mag().unwrap_or(0.0) - 40.0,
                "[{}] q40 closed form ([2/1])",
                name
            );
            let want_q03 = jet.coeff(0, 3).add(m2.f.mul(jet.coeff(0, 2)));
            let dq03 = q2[jet_idx(0, 3)].sub(want_q03);
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
    fn mobius_radius_certifies_full_interval() {
        // (correctif §4.1, battery item 2) Every emitted radius must certify
        // the WHOLE closed interval [0, r], not the accepted scan point alone
        // (the runtime comparison |z| < r admits any smaller |z|): sample each
        // block's [0, r] geometrically — plus the exact x = 0 endpoint — and
        // check the pointwise (V) certificate at every sample.
        for (eps, c_max) in [(1e-6_f64, 1e-9_f64), (1e-4, 1e-5)] {
            let log2_c_max = c_max.log2();
            for (name, cx, cy) in [
                ("feigenbaum", -1.401155_f64, 0.0_f64),
                ("cusp", -0.75, 0.0),
                ("period2", -1.25, 0.0),
            ] {
                let Some((_orbit, levels, bounds, radii)) = harness(cx, cy, 2048, eps, c_max)
                else {
                    panic!("[{}] escaped", name);
                };
                let mut checked = 0usize;
                for (li, lvl) in levels.iter().enumerate() {
                    for (s, blk) in lvl.blocks.iter().enumerate() {
                        let r = radii[li][s];
                        if !r.is_finite() {
                            continue;
                        }
                        let b = &bounds.per_level[li][s];
                        assert!(
                            mobius_v_certified_at(
                                blk, b, &bounds, eps, log2_c_max,
                                f64::NEG_INFINITY,
                            ),
                            "[{}] skip {} slot {}: (V) fails at x = 0 under radius 2^{:.2}",
                            name, lvl.skip, s, r
                        );
                        // 24 geometric samples spanning 40 log2 units up to r.
                        for k in 0..=24 {
                            let x = r - 40.0 * (1.0 - k as f64 / 24.0);
                            assert!(
                                mobius_v_certified_at(blk, b, &bounds, eps, log2_c_max, x),
                                "[{}] skip {} slot {}: (V) fails at 2^{:.2} inside [0, 2^{:.2}]",
                                name, lvl.skip, s, x, r
                            );
                            checked += 1;
                        }
                    }
                }
                println!(
                    "[{}] eps {:e} c_max {:e}: {} interval samples certified",
                    name, eps, c_max, checked
                );
                assert!(checked > 0, "[{}] no finite radii exercised", name);
            }
        }
    }

    #[test]
    fn mobius_radius_zero_gate_synthetic() {
        // (correctif §4.1, battery item 3) A block whose PURE-C residual fails
        // (V) at x = 0 but passes at some x > 0: the admissible set is
        // [x_min, x_max] with x_min > 0, which the single runtime comparison
        // |z| < r cannot express — the solver must emit NO radius, even though
        // the old first-success-from-above scan finds a pointwise success.
        let eps = 1e-6_f64;
        let c_max = 1e-6_f64;
        let log2_c_max = c_max.log2();
        // A = B = 1, D = D' = F = N₂ = 0: DEN ≡ 1, budget = ½ε·(x + c_max).
        let m = MobiusCPlus {
            a: CFe::from_c(1.0, 0.0),
            b: CFe::from_c(1.0, 0.0),
            d: CFe::ZERO,
            ap: CFe::ZERO,
            dp: CFe::ZERO,
            f: CFe::ZERO,
            n2: CFe::ZERO,
            degenerate: false,
        };
        let mut log2_q = [f64::NEG_INFINITY; JET_NCOEFF];
        // |q₀₃|·c_max³ = 1e6·1e-18 = 1e-12 > ½ε·c_max = 5e-13: fails at x = 0.
        // At x ≈ 1e-5 the budget ½ε·(x + c_max) ≈ 5.5e-12 dominates: passes.
        log2_q[jet_idx(0, 3)] = 1e6_f64.log2();
        let blk = MobiusBlock { m, log2_q };
        // One live candidate: R_z = 1e-3, M_Q = 1, R_c = 3e3·c_max (the tail
        // is negligible at the scan points that matter).
        let mut bounds = MobiusBounds {
            log2_rz: [f64::NEG_INFINITY; MOBIUS_NCAND],
            log2_mq: [f64::INFINITY; MOBIUS_NCAND],
        };
        bounds.log2_rz[0] = 1e-3_f64.log2();
        bounds.log2_mq[0] = 0.0;
        let table = MobiusBoundsTable {
            log2_rc: [(3e3 * c_max).log2(); MOBIUS_NCAND],
            per_level: Vec::new(),
        };
        // Sanity: x = 1e-5 passes POINTWISE — the pre-correctif scan would
        // have emitted a radius covering it.
        assert!(
            mobius_v_certified_at(&blk, &bounds, &table, eps, log2_c_max, 1e-5_f64.log2()),
            "synthetic block should pass pointwise at x = 1e-5"
        );
        // ...but x = 0 fails, so the single-comparison radius must be −∞.
        assert!(
            !mobius_v_certified_at(&blk, &bounds, &table, eps, log2_c_max, f64::NEG_INFINITY),
            "synthetic block should fail (V) at x = 0"
        );
        let r = mobius_solve_radius(&blk, &bounds, &table, eps, log2_c_max);
        assert_eq!(
            r,
            f64::NEG_INFINITY,
            "zero-gate leak: emitted radius 2^{} over an admissible set excluding 0",
            r
        );
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
                    ("N₂", &blk.m.n2, &cb.n2),
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

    // ── Phase 0 (proposition (c)): conservatism census — the GO/ABORT gate ──
    // For every flagged block (radius −∞ or ≥ 4 decades under the scan start),
    // compare the triangle-inequality REST against a MEASURED sup|Q| on the
    // distinguished boundary (max-modulus ORACLE — no aliasing rigor yet), then
    // re-run the pixel loop with oracle radii to upper-bound the wall-clock
    // gain. Saturated blocks (no finite M_Q rung) are counted separately: they
    // belong to the Fatou-gate track (JET_BLA_FINDINGS §18), not to (c).
    //   cargo test --release mobius_fallback_conservatism_census -- --ignored --nocapture

    /// DEN lower bound 1 − |D|x − |D'|x·y − |F|y at (log2 x, log2 y).
    fn den_lower(blk: &MobiusBlock, x: f64, y: f64) -> f64 {
        let d1 = cfe_log2(&blk.m.d) + x;
        let d2 = cfe_log2(&blk.m.dp) + x + y;
        let d3 = cfe_log2(&blk.m.f) + y;
        1.0 - if d1 > -80.0 { d1.exp2() } else { 0.0 }
            - if d2 > -80.0 { d2.exp2() } else { 0.0 }
            - if d3 > -80.0 { d3.exp2() } else { 0.0 }
    }

    /// Triangle-inequality REST (stored q monomials + Cauchy tail) at probe x,
    /// log2, minimized over usable candidates. None when no candidate applies.
    fn triangle_rest_log2(
        blk: &MobiusBlock,
        bounds: &MobiusBounds,
        table: &MobiusBoundsTable,
        log2_c_max: f64,
        x: f64,
    ) -> Option<f64> {
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
        let mut best: Option<f64> = None;
        for c in 0..MOBIUS_NCAND {
            let (log2_mq, log2_rz) = (bounds.log2_mq[c], bounds.log2_rz[c]);
            if !log2_mq.is_finite() || !log2_rz.is_finite() {
                continue;
            }
            let log2_theta_c = log2_c_max - table.log2_rc[c];
            if log2_theta_c >= -1e-9 {
                continue;
            }
            let mut terms: Vec<f64> = cpow
                .iter()
                .enumerate()
                .filter(|(_, &ci)| ci != f64::NEG_INFINITY)
                .map(|(i, &ci)| ci + i as f64 * x)
                .collect();
            let ltheta = (x - log2_rz).max(log2_theta_c);
            if ltheta < 0.0 {
                let theta = ltheta.exp2();
                terms.push(
                    log2_mq
                        + (JET_DS + 1) as f64 * ltheta
                        + (((JET_DS + 2) as f64 - (JET_DS + 1) as f64 * theta)
                            / ((1.0 - theta) * (1.0 - theta)))
                            .log2(),
                );
            } else {
                continue; // tail diverges at this probe for this candidate
            }
            let rest = lse2(&terms);
            best = Some(best.map_or(rest, |b: f64| b.min(rest)));
        }
        best
    }

    /// Measured sup|Q| (log2) over the KZ×KC distinguished-boundary grid, by
    /// exact block walk in CFe. Returns (log2 sup, walk steps consumed).
    fn grid_sup_q(
        orbit: &[(f64, f64)],
        first: usize,
        skip: usize,
        m: &MobiusCPlus,
        log2_x: f64,
        log2_y: f64,
        kz: usize,
        kc: usize,
    ) -> (f64, u64) {
        let sx = fe_exp2(log2_x);
        let sy = fe_exp2(log2_y);
        let mut sup = f64::NEG_INFINITY;
        for k in 0..kz {
            // Half-step offset keeps the grid off the axes (generic phases).
            let th = std::f64::consts::TAU * (k as f64 + 0.5) / kz as f64;
            let z = CFe::from_c(th.cos(), th.sin()).mul(sx);
            for l in 0..kc {
                let ph = std::f64::consts::TAU * (l as f64 + 0.5) / kc as f64;
                let c = CFe::from_c(ph.cos(), ph.sin()).mul(sy);
                let phi = exact_block_walk(orbit, first, skip, z, c);
                let den = CFe::ONE.add(m.d.add(m.dp.mul(c)).mul(z)).add(m.f.mul(c));
                let num = m.a.add(m.ap.mul(c)).mul(z).add(m.b.mul(c));
                let q = den.mul(phi).sub(num);
                sup = sup.max(q.log2_mag().unwrap_or(f64::NEG_INFINITY));
            }
        }
        (sup, (kz * kc * skip) as u64)
    }

    // ── Phase 0 (proposition (d)): [K/1]-c+ census — the GO/ABORT gate ──────
    // The §14 finding: the block map on slow dynamics is ~z/(1−Lz); a rational
    // [K/1] with D = −c_{K+1,0}/c_{K,0} resums the pole (denominator) while the
    // numerator carries the order — the compensated coefficients vanish on the
    // model flow (superconvergence). The (c) census showed the flagged mass is
    // `storedq` (model error of the [1/1] form, triangle-REST tight): exactly
    // what a higher numerator absorbs. This census builds the [K/1]-c+ form
    // TEST-LOCALLY (K = 2, 3), reuses the production bounds/radius machinery
    // (M_Q corrected by the Σ|N_i|R_z^i numerator terms), and counts loop
    // turns vs Padé and vs the production [1/1]-c+.
    //   cargo test --release mobius_kplus_conservatism_census -- --ignored --nocapture

    /// [K/1]-c+ extraction: base carries (N₁=A, B, D, A', D', F) in the
    /// MobiusCPlus layout (so DEN/RHS machinery applies verbatim); nhi carries
    /// N₂..N_K. D moves to −c_{K+1,0}/c_{K,0}; N_i = c_{i,0} + D·c_{i−1,0}.
    fn kplus_block(jet: &JetF64, k: usize) -> (MobiusBlock, Vec<CFe>) {
        let dead = || {
            (
                MobiusBlock {
                    m: MobiusCPlus {
                        a: CFe::ZERO,
                        b: CFe::ZERO,
                        d: CFe::ZERO,
                        ap: CFe::ZERO,
                        dp: CFe::ZERO,
                        f: CFe::ZERO,
                        n2: CFe::ZERO,
                        degenerate: true,
                    },
                    log2_q: [f64::NEG_INFINITY; JET_NCOEFF],
                },
                Vec::new(),
            )
        };
        assert!((2..=JET_DS - 1).contains(&k));
        let c10 = jet.coeff(1, 0);
        let ck0 = jet.coeff(k, 0);
        if c10.is_zero() || ck0.is_zero() {
            return dead();
        }
        let d = jet.coeff(k + 1, 0).div(ck0).neg();
        let b = jet.coeff(0, 1);
        let f = if b.is_zero() { CFe::ZERO } else { jet.coeff(0, 2).div(b).neg() };
        let c11 = jet.coeff(1, 1);
        let ap = c11.add(d.mul(b)).add(f.mul(c10));
        let dp = jet
            .coeff(2, 1)
            .add(d.mul(c11))
            .add(f.mul(jet.coeff(2, 0)))
            .div(c10)
            .neg();
        let nhi: Vec<CFe> =
            (2..=k).map(|i| jet.coeff(i, 0).add(d.mul(jet.coeff(i - 1, 0)))).collect();
        let m = MobiusCPlus { a: c10, b, d, ap, dp, f, n2: CFe::ZERO, degenerate: false };
        // Compensated remainder moduli: q_ij = c_ij + D·c_{i−1,j} + D'·c_{i−1,j−1}
        // + F·c_{i,j−1} − N slots. Constructed zeros: (i,0) i ≤ K+1, (0,1),
        // (1,1), (2,1), (0,2) when F is live.
        let mut log2_q = [f64::NEG_INFINITY; JET_NCOEFF];
        for (n, &(i, j)) in JET_MONOMIALS.iter().enumerate() {
            let (i, j) = (i as usize, j as usize);
            let zeroed = (j == 0 && i <= k + 1)
                || (i, j) == (0, 1)
                || (i, j) == (1, 1)
                || (i, j) == (2, 1)
                || ((i, j) == (0, 2) && !m.f.is_zero());
            if zeroed {
                continue;
            }
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
            log2_q[n] = v.log2_mag().unwrap_or(f64::NEG_INFINITY);
        }
        (MobiusBlock { m, log2_q }, nhi)
    }

    /// [K/1]-c+ application (value only — turn counting needs no derivative):
    /// num = ((…(N_K·z + N_{K−1})·z + … + N₂)·z + N₁ + A'·c)·z + B·c.
    fn kplus_apply(m: &MobiusCPlus, nhi: &[CFe], z: CFe, c: CFe) -> CFe {
        let mut acc = CFe::ZERO;
        for ni in nhi.iter().rev() {
            acc = acc.add(*ni).mul(z);
        }
        let num = acc.add(m.a).add(m.ap.mul(c)).mul(z).add(m.b.mul(c));
        let den = CFe::ONE.add(m.d.add(m.dp.mul(c)).mul(z)).add(m.f.mul(c));
        num.div(den)
    }

    /// Loop turns with the [K/1] table (clone of the mobius_run_pixel control
    /// flow, derivative elided).
    fn kplus_turns(
        levels: &[MobiusLevel],
        nhis: &[Vec<Vec<CFe>>],
        radii: &[Vec<f64>],
        orbit: &[(f64, f64)],
        dc: (f64, f64),
        max_iter: usize,
    ) -> u64 {
        let bailout2 = 4.0_f64;
        let orbit_len = orbit.len();
        let cfe = CFe::from_c(dc.0, dc.1);
        let (mut dz, mut ref_i, mut iter, mut steps) = ((0.0_f64, 0.0_f64), 0usize, 0usize, 0u64);
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
                    let blk = &lvl.blocks[slot];
                    let phi = kplus_apply(&blk.m, &nhis[li][slot], CFe::from_c(dz.0, dz.1), cfe);
                    let cand = phi.to_f64();
                    let zi = orbit[ref_i + lvl.skip];
                    let candz = (zi.0 + cand.0, zi.1 + cand.1);
                    if lvl.skip > 1 && candz.0 * candz.0 + candz.1 * candz.1 > bailout2 {
                        continue;
                    }
                    dz = cand;
                    ref_i += lvl.skip;
                    iter += lvl.skip;
                    applied = true;
                    break;
                }
            }
            if !applied {
                let z = orbit[ref_i];
                let m2 =
                    (2.0 * z.0 * dz.0 - 2.0 * z.1 * dz.1, 2.0 * z.0 * dz.1 + 2.0 * z.1 * dz.0);
                let sq = (dz.0 * dz.0 - dz.1 * dz.1, 2.0 * dz.0 * dz.1);
                dz = (m2.0 + sq.0 + dc.0, m2.1 + sq.1 + dc.1);
                ref_i += 1;
                iter += 1;
            }
            steps += 1;
            if ref_i > orbit_len - 1 {
                ref_i = orbit_len - 1;
            }
            let z = orbit[ref_i];
            let full = (z.0 + dz.0, z.1 + dz.1);
            let full2 = full.0 * full.0 + full.1 * full.1;
            if full2 > bailout2 {
                break;
            }
            let dz2 = dz.0 * dz.0 + dz.1 * dz.1;
            if full2 < dz2 || ref_i == orbit_len - 1 {
                dz = full;
                ref_i = 0;
            }
            if steps > (max_iter * 2 + 16) as u64 {
                break;
            }
        }
        steps
    }

    #[test]
    #[ignore]
    fn mobius_kplus_conservatism_census() {
        let max_iter = 3000usize;
        for (name, cx, cy, eps, dec) in [
            ("feigenbaum", -1.401155_f64, 0.0_f64, 1e-6_f64, -9.0_f64),
            ("feigenbaum", -1.401155, 0.0, 1e-6, -30.0),
            ("cusp", -0.75, 0.0, 1e-3, -5.0),
            ("period2", -1.25, 0.0, 1e-3, -5.0),
            ("cusp", -0.75, 0.0, 1e-6, -9.0),
            ("seahorse", -0.743643887037151, 0.131825904205330, 1e-4, -10.0),
        ] {
            let log2_c_max = dec * LOG2_10_LOCAL;
            let orbit = ref_orbit_f64(cx, cy, max_iter);
            if orbit.len() <= max_iter {
                println!("[{}] escaped early — skipped", name);
                continue;
            }
            // Baselines: production [2/1]-c+ build, TRUE [1/1]-c+ build
            // (separate builders — correctif §13 item 4: a line labeled [1/1]
            // that calls the production builder measures [2/1]), and the Padé
            // heuristic.
            let levels1 = mobius_build_levels(&orbit, 1 << 18);
            let bounds1 = mobius_build_bounds(&levels1, &orbit, log2_c_max);
            let radii1 = mobius_build_radii(&levels1, &bounds1, eps, log2_c_max);
            let levels_k1 = mobius_build_levels_k1(&orbit, 1 << 18);
            let bounds_k1 = mobius_build_bounds(&levels_k1, &orbit, log2_c_max);
            let radii_k1 = mobius_build_radii(&levels_k1, &bounds_k1, eps, log2_c_max);
            let pade_levels = crate::bench_build_levels(&orbit, eps, true, 1 << 18);
            let cm = log2_c_max.exp2();

            print!("\n=== [{}] eps={:e} c~1e{:.0} ===\n", name, eps, dec);
            let mut turn_line = String::new();
            let (mut t_pade, mut t_m1, mut t_k1) = (0u64, 0u64, 0u64);
            for kpx in 0..16 {
                let t = (kpx as f64 / 16.0) * 2.0 - 1.0;
                let dc = (t * cm * 0.7, 0.37 * t * cm);
                let (ps, _, _) = crate::bench_run_pixel(&pade_levels, &orbit, dc, max_iter, true);
                t_pade += ps as u64;
                t_m1 += mobius_run_pixel(&levels1, &radii1, &orbit, dc, max_iter).steps as u64;
                t_k1 += mobius_run_pixel(&levels_k1, &radii_k1, &orbit, dc, max_iter).steps
                    as u64;
            }
            turn_line.push_str(&format!(
                "turns: pade={} c+[2/1] prod={} ({:.2}x) c+[1/1]={} ({:.2}x)",
                t_pade,
                t_m1,
                t_m1 as f64 / t_pade.max(1) as f64,
                t_k1,
                t_k1 as f64 / t_pade.max(1) as f64
            ));

            // [K/1] variants from the streamed jets (same level scaffold).
            let jet_levels = build_jet_levels(&orbit, 1, 1 << 18);
            for k in [2usize, 3] {
                let mut levels_k: Vec<MobiusLevel> = Vec::new();
                let mut nhis: Vec<Vec<Vec<CFe>>> = Vec::new();
                for jl in &jet_levels {
                    let mut blocks = Vec::with_capacity(jl.entries.len());
                    let mut nh = Vec::with_capacity(jl.entries.len());
                    for jet in &jl.entries {
                        let (b, n) = kplus_block(jet, k);
                        blocks.push(b);
                        nh.push(n);
                    }
                    levels_k.push(MobiusLevel { skip: jl.skip, blocks });
                    nhis.push(nh);
                }
                let mut bounds_k = mobius_build_bounds(&levels_k, &orbit, log2_c_max);
                // M_Q correction: the [K/1] numerator adds Σ_{i≥2}|N_i|R_z^i to
                // sup|Q| (the standard assembly only covers |N₁|R_z = |A|R_z).
                for (li, lvl) in levels_k.iter().enumerate() {
                    for (s, _) in lvl.blocks.iter().enumerate() {
                        let b = &mut bounds_k.per_level[li][s];
                        for c in 0..MOBIUS_NCAND {
                            if !b.log2_mq[c].is_finite() || !b.log2_rz[c].is_finite() {
                                continue;
                            }
                            let mut terms = vec![b.log2_mq[c]];
                            for (idx, ni) in nhis[li][s].iter().enumerate() {
                                let i = (idx + 2) as f64;
                                terms.push(cfe_log2(ni) + i * b.log2_rz[c]);
                            }
                            b.log2_mq[c] = lse2(&terms);
                        }
                    }
                }
                let radii_k = mobius_build_radii(&levels_k, &bounds_k, eps, log2_c_max);
                // Radius growth + recovery census at the working-band probe.
                let probe = (1e-12_f64).log2();
                let (mut n_blocks, mut n_adm1, mut n_admk) = (0u64, 0u64, 0u64);
                let mut gain_decades: Vec<f64> = Vec::new();
                for (li, lvl) in levels_k.iter().enumerate() {
                    if lvl.skip < MOBIUS_MIN_EMIT_SKIP {
                        continue;
                    }
                    for (s, blk) in lvl.blocks.iter().enumerate() {
                        if blk.m.degenerate {
                            continue;
                        }
                        n_blocks += 1;
                        let (r1, rk) = (radii1[li][s], radii_k[li][s]);
                        if r1.is_finite() && r1 >= probe {
                            n_adm1 += 1;
                        }
                        if rk.is_finite() && rk >= probe {
                            n_admk += 1;
                        }
                        if rk.is_finite() && r1.is_finite() {
                            gain_decades.push((rk - r1) / LOG2_10_LOCAL);
                        }
                    }
                }
                gain_decades.sort_by(|a, b| a.partial_cmp(b).unwrap());
                let med = gain_decades.get(gain_decades.len() / 2).copied().unwrap_or(0.0);
                let mut t_mk = 0u64;
                for kpx in 0..16 {
                    let t = (kpx as f64 / 16.0) * 2.0 - 1.0;
                    let dc = (t * cm * 0.7, 0.37 * t * cm);
                    t_mk += kplus_turns(&levels_k, &nhis, &radii_k, &orbit, dc, max_iter);
                }
                println!(
                    "  [{}‌/1]: admitted@1e-12 {}→{} (of {}), radius gain median {:+.1} decades",
                    k, n_adm1, n_admk, n_blocks, med
                );
                turn_line.push_str(&format!(
                    " [{}/1]={} ({:.2}x)",
                    k,
                    t_mk,
                    t_mk as f64 / t_pade.max(1) as f64
                ));
            }
            println!("  {}", turn_line);
        }
    }

    #[test]
    #[ignore]
    fn mobius_fallback_conservatism_census() {
        const GAP_LOG2: f64 = 4.0 * LOG2_10_LOCAL; // flag: r ≥ 4 decades under start
        const KZ: usize = 64;
        const KC: usize = 16;
        const ORACLE_PROBES: usize = 3; // 1-decade descending scan
        const STEP_BUDGET: u64 = 50_000_000; // GO criterion: projected cost cap
        let max_iter = 3000usize;
        for (name, cx, cy, eps, dec) in [
            ("feigenbaum", -1.401155_f64, 0.0_f64, 1e-6_f64, -9.0_f64),
            ("feigenbaum", -1.401155, 0.0, 1e-6, -30.0),
            ("cusp", -0.75, 0.0, 1e-3, -5.0),
            ("period2", -1.25, 0.0, 1e-3, -5.0),
            ("cusp", -0.75, 0.0, 1e-6, -9.0),
            ("seahorse", -0.743643887037151, 0.131825904205330, 1e-4, -10.0),
        ] {
            let log2_c_max = dec * LOG2_10_LOCAL;
            let orbit = ref_orbit_f64(cx, cy, max_iter);
            if orbit.len() <= max_iter {
                println!("[{}] escaped early — skipped", name);
                continue;
            }
            let levels = mobius_build_levels(&orbit, 1 << 18);
            let bounds = mobius_build_bounds(&levels, &orbit, log2_c_max);
            let radii = mobius_build_radii(&levels, &bounds, eps, log2_c_max);
            let pade_levels = crate::bench_build_levels(&orbit, eps, true, 1 << 18);
            let cm = log2_c_max.exp2();
            let log2_half_eps = eps.log2() - 1.0;

            let mut oracle_radii: Vec<Vec<f64>> = radii.clone();
            let mut ratios: std::collections::BTreeMap<&str, Vec<f64>> =
                std::collections::BTreeMap::new();
            let mut recovered: std::collections::BTreeMap<&str, u64> =
                std::collections::BTreeMap::new();
            let (mut n_saturated, mut n_flagged) = (0u64, 0u64);
            let mut walk_steps = 0u64;

            for (li, lvl) in levels.iter().enumerate() {
                if lvl.skip < MOBIUS_MIN_EMIT_SKIP {
                    continue;
                }
                for (s, blk) in lvl.blocks.iter().enumerate() {
                    if blk.m.degenerate {
                        continue;
                    }
                    let b = &bounds.per_level[li][s];
                    // Best usable rung start (§18 split: none ⇒ saturated).
                    let mut start = f64::NEG_INFINITY;
                    for c in 0..MOBIUS_NCAND {
                        if b.log2_rz[c].is_finite()
                            && b.log2_mq[c].is_finite()
                            && log2_c_max - bounds.log2_rc[c] < -1e-9
                        {
                            start = start.max(b.log2_rz[c]);
                        }
                    }
                    if !start.is_finite() {
                        n_saturated += 1;
                        continue;
                    }
                    let r_tri = radii[li][s];
                    let gap = if r_tri.is_finite() { start - r_tri } else { f64::INFINITY };
                    if gap < GAP_LOG2 || walk_steps > STEP_BUDGET {
                        continue;
                    }
                    n_flagged += 1;
                    // Oracle scan: x ≤ R_z/2, descending 1 decade per probe.
                    // DEN threshold relaxed to 2^-4: the pointwise bound
                    // |e| = |Q|/|DEN| ≤ U_Q/den_lower only needs den_lower > 0
                    // (the 0.5 of (V) is a comfort factor of the triangle
                    // criterion, folded here into the division).
                    let x0 = start - 1.0;
                    let first = 1 + s * lvl.skip;
                    let mut oracle = f64::NEG_INFINITY;
                    let mut ratio_best: Option<f64> = None;
                    let mut term = binding_term(blk, b, &bounds, eps, log2_c_max, x0);
                    for k in 0..ORACLE_PROBES {
                        let x = x0 - k as f64 * LOG2_10_LOCAL;
                        if r_tri.is_finite() && x <= r_tri {
                            break; // no gain below the triangle radius
                        }
                        let den = den_lower(blk, x, log2_c_max);
                        if den <= 0.0625 {
                            continue;
                        }
                        // Re-classify at the deepest den-usable probe: the DEN
                        // verdict at x0 can mask a cauchy bind further down.
                        term = binding_term(blk, b, &bounds, eps, log2_c_max, x);
                        let (log2_g, steps) =
                            grid_sup_q(&orbit, first, lvl.skip, &blk.m, x, log2_c_max, KZ, KC);
                        walk_steps += steps;
                        if let Some(rest) = triangle_rest_log2(blk, b, &bounds, log2_c_max, x) {
                            let r = rest - log2_g;
                            ratio_best = Some(ratio_best.map_or(r, |b: f64| b.max(r)));
                        }
                        let rhs = log2_half_eps
                            + lse2(&[cfe_log2(&blk.m.a) + x, cfe_log2(&blk.m.b) + log2_c_max]);
                        if log2_g - den.log2() <= rhs {
                            oracle = x;
                            break; // first success from above
                        }
                    }
                    if let Some(r) = ratio_best {
                        ratios.entry(term).or_default().push(r);
                    }
                    if oracle.is_finite() && (!r_tri.is_finite() || oracle > r_tri) {
                        *recovered.entry(term).or_insert(0) += 1;
                        oracle_radii[li][s] = oracle;
                    }
                }
            }

            // Turn census: triangle vs oracle vs Padé baseline on a pixel row.
            let (mut t_tri, mut t_orc, mut t_pade) = (0u64, 0u64, 0u64);
            for kpx in 0..16 {
                let t = (kpx as f64 / 16.0) * 2.0 - 1.0;
                let dc = (t * cm * 0.7, 0.37 * t * cm);
                t_tri += mobius_run_pixel(&levels, &radii, &orbit, dc, max_iter).steps as u64;
                t_orc +=
                    mobius_run_pixel(&levels, &oracle_radii, &orbit, dc, max_iter).steps as u64;
                let (ps, _, _) = crate::bench_run_pixel(&pade_levels, &orbit, dc, max_iter, true);
                t_pade += ps as u64;
            }

            println!(
                "\n=== [{}] eps={:e} c~1e{:.0} ===\n  flagged={} saturated(§18)={} walk_steps={}M{}",
                name, eps, dec, n_flagged, n_saturated,
                walk_steps / 1_000_000,
                if walk_steps > STEP_BUDGET { " (BUDGET HIT)" } else { "" },
            );
            for (term, rs) in &mut ratios {
                rs.sort_by(|a, b| a.partial_cmp(b).unwrap());
                let med = rs[rs.len() / 2];
                println!(
                    "    {:>10}: n={:3} recovered={:3} conservatism median 2^{:.1} (×{:.1})",
                    term, rs.len(),
                    recovered.get(term).copied().unwrap_or(0),
                    med, med.exp2()
                );
            }
            println!(
                "    turns: pade={} mobius_tri={} mobius_oracle={} (tri/pade {:.2}x → oracle/pade {:.2}x)",
                t_pade, t_tri, t_orc,
                t_tri as f64 / t_pade.max(1) as f64,
                t_orc as f64 / t_pade.max(1) as f64
            );
        }
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
                        // [K/1] reserve-gate diagnostic (obsolete since the
                        // [2/1] adoption: q₃₀ is a constructed zero of the
                        // plain-[2/1] tier, so the z channel reads −∞ here —
                        // the finite guard keeps exact-seed blocks, where ALL
                        // channels are −∞, from counting vacuously).
                        let terms = pade_terms(&plv[li].blocks[slot], log2_dz, log2_cmax);
                        if terms[0].is_finite() && terms[0] >= terms[1].max(terms[2]) {
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
        // from the plain-[2/1] view's (V) boosted by the tail-free closed-form
        // oracle, c+ from the [2/1] (V) machinery), report the block-tag mix at
        // the delta band and the application share per tier from a pixel-row
        // dispatch replay, against the three single-mode baselines. Also
        // reports the [K/1] reserve gate (obsolete post-adoption) and
        // radius-ladder violations. Structural assertion: the dispatch's
        // coverage is the union of the tiers', so its loop turns never exceed
        // any single mode's.
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
            // The dispatch's rational tiers are the [2/1] form since the
            // round-7 adoption: c+ = the standalone k2 build, Padé = its
            // plain view (A' = D' = F = 0, D/N₂ kept). The c+ tier now EQUALS
            // the standalone mode, so the "auto ≤ every single mode"
            // structural bound holds against it exactly.
            let mlv = mobius_build_levels(&orbit, 1 << 18);
            let plv = mobius_build_levels_plain_k2(&orbit, 1 << 18);
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
                                    // §12-style tail-free oracle boost on the
                                    // PLAIN-[2/1] block (all live stored q
                                    // channels — the hardcoded 3-channel Padé
                                    // form predates the k2 adoption).
                                    r_pv[li][s].max(crate::unified::closed_form_radius(
                                        &plv[li].blocks[s].m,
                                        &plv[li].blocks[s].log2_q,
                                        eps,
                                        l2c,
                                    )),
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

    // ── Phase 0 (findings §18): parabolic-gate census — the GO/ABORT gate ────
    // Rounds 6-7 left ONE wall: the coarse cusp/period2 regimes (ε = 1e-3,
    // c_max = 1e-5) sit at 3.7×/6.0× the Padé turns with ~41 long blocks 100 %
    // SATURATED (the majorant walk ρ ← |2Z|ρ + ρ² + R_c has no finite rung —
    // quasi-parabolic slow transit; no rational/polynomial form certifies it).
    // §18's exit is a sectorial Fatou coordinate Ψ (Ψ∘F = Ψ + 1) per gate: a
    // transit becomes translation by k + Ψ⁻¹, O(1). Before ANY implementation
    // this census measures the three GO conditions:
    //   1. DETECTION — §18's criteria (NOT |κ| → 1 alone): closest return m
    //      with |λ_m − 1| small (λ_m = Π 2Z, the derivative of Φ_m along the
    //      orbit ≈ κ^q at a satellite r/q boundary; an irrational angle on the
    //      unit circle never brings λ_m near 1), fixed-point COALESCENCE of
    //      the composed return jet, leading petal coefficient ≠ 0. Do the
    //      saturated blocks fall inside detected gates, with zero verified
    //      false positives on seahorse/feigenbaum?
    //   2. GAIN ORACLE — the share of pixel-loop turns spent INSIDE detected
    //      gates (the ceiling of the O(1)-transit gain), replayed as
    //      free-transit oracle turns (turns − in-gate turns + transits) vs
    //      Padé.
    //   3. RESIDUAL PROTOTYPE — a truncated Ψ on the cusp (and period2) gate:
    //      the flow-model partial-fraction lift of §18's
    //      −1/(a·u) − ρ·log(−1/(a·u)) asymptotic, with the coalescing pair
    //      kept as explicit simple poles. NOTE: both census gates are
    //      period-DOUBLING boundaries (κ = −1, q = 2) — the return germ is
    //      u + a₃u³ (ν = 2 petals, the u² coefficient carries the multiplier
    //      offset and nearly vanishes), so the simple-germ pole −1/(a·u) must
    //      be split over the root pair; "a ≠ 0" generalizes to a_{ν+1} ≠ 0.
    //      Measure ε_Ψ = sup|Ψ∘F − Ψ − 1| along real pixel transits and the
    //      accumulated k·ε_Ψ budget vs ε at the measured transit lengths.
    // GO ⟺ gates cover ≥ 50 % of the coarse regimes' turns AND k·ε_Ψ ≤ ε is
    // reachable with the truncated asymptotic AND the detector is clean on
    // the controls. Else ABORT, documented in
    // MANDELBROT_MOBIUS_CPLUS_IMPLEMENTATION.md (round 8).
    //   cargo test --release fatou_gate_phase0_census -- --ignored --nocapture

    fn cadd(a: C, b: C) -> C {
        (a.0 + b.0, a.1 + b.1)
    }

    fn csub(a: C, b: C) -> C {
        (a.0 - b.0, a.1 - b.1)
    }

    fn cabs(z: C) -> f64 {
        (z.0 * z.0 + z.1 * z.1).sqrt()
    }

    /// Complex square root, principal branch.
    fn csqrt(z: C) -> C {
        let r = cabs(z);
        if r == 0.0 {
            return (0.0, 0.0);
        }
        let re = ((r + z.0) * 0.5).sqrt();
        let im = ((r - z.0) * 0.5).sqrt();
        (re, if z.1 >= 0.0 { im } else { -im })
    }

    /// Complex natural log, principal branch.
    fn clog(z: C) -> C {
        (cabs(z).ln(), z.1.atan2(z.0))
    }

    /// Evaluate Σ p[k]·u^k (Horner).
    fn poly_eval(p: &[C], u: C) -> C {
        let mut acc = (0.0, 0.0);
        for c in p.iter().rev() {
            acc = cadd(cm(acc, u), *c);
        }
        acc
    }

    /// §18 detector, first stage, per orbit index: the return length m ≤ m_max
    /// minimizing |λ_m − 1| among closest returns (|Z_{n+m} − Z_n| < 0.05,
    /// |λ_m − 1| < 0.25). λ_m = Π 2Z over the window — the derivative of Φ_m
    /// along the orbit, ≈ κ^q near a satellite r/q boundary with m = p·q.
    fn gate_scan(orbit: &[(f64, f64)], m_max: usize) -> Vec<Option<usize>> {
        const RET_TOL2: f64 = 0.05 * 0.05;
        const MULT_TOL: f64 = 0.25;
        let n_len = orbit.len();
        let mut out = vec![None; n_len];
        for (n, slot) in out.iter_mut().enumerate() {
            let mut lam = (1.0f64, 0.0f64);
            let mut best: Option<(usize, f64)> = None;
            for m in 1..=m_max.min(n_len.saturating_sub(n + 1)) {
                let z = orbit[n + m - 1];
                lam = cm(lam, (2.0 * z.0, 2.0 * z.1));
                let d = (orbit[n + m].0 - orbit[n].0, orbit[n + m].1 - orbit[n].1);
                if d.0 * d.0 + d.1 * d.1 >= RET_TOL2 {
                    continue;
                }
                let e = cabs((lam.0 - 1.0, lam.1));
                if e < MULT_TOL && best.is_none_or(|(_, be)| e < be) {
                    best = Some((m, e));
                }
            }
            *slot = best.map(|(m, _)| m);
        }
        out
    }

    /// §18 detector, second stage, at a sampled in-gate index: compose the
    /// m-step return jet and solve its coalescing fixed points — the roots of
    /// c₃₀u² + c₂₀u + (c₁₀ − 1), the ν ≤ 2 petal model. Returns
    /// (gap = max |root|, |c₂₀|, |c₃₀|): a verified gate has a small gap
    /// (coalescence) and |c₃₀| bounded away from 0 (petal coefficient — the
    /// ν = 2 generalization of §18's "a ≠ 0"; a ν = 1 germ would need the
    /// coalescing-cluster split instead, out of the phase-0 regimes).
    fn gate_verify(orbit: &[(f64, f64)], n: usize, m: usize) -> (f64, f64, f64) {
        let mut jet = jet_seed(orbit[n].0, orbit[n].1);
        for i in (n + 1)..(n + m) {
            jet = jet_compose(&jet, &jet_seed(orbit[i].0, orbit[i].1));
        }
        let c10 = jet.coeff(1, 0).to_f64();
        let c20 = jet.coeff(2, 0).to_f64();
        let c30 = jet.coeff(3, 0).to_f64();
        let kt = (c10.0 - 1.0, c10.1);
        if cabs(c30) < 1e-9 {
            let g =
                if cabs(c20) > 0.0 { cabs(cdiv(kt, c20)) } else { f64::INFINITY };
            return (g, cabs(c20), cabs(c30));
        }
        let four_c30_kt = cm((4.0 * c30.0, 4.0 * c30.1), kt);
        let sq = csqrt(csub(cm(c20, c20), four_c30_kt));
        let den = (2.0 * c30.0, 2.0 * c30.1);
        let r1 = cdiv(cadd((-c20.0, -c20.1), sq), den);
        let r2 = cdiv(csub((-c20.0, -c20.1), sq), den);
        (cabs(r1).max(cabs(r2)), cabs(c20), cabs(c30))
    }

    #[derive(Default)]
    struct GateTurnStats {
        turns: u64,
        turns_in_gate: u64,
        exact_turns: u64,
        exact_in_gate: u64,
        transits: u64,
        iters: u64,
        iters_in_gate: u64,
        longest_run: u64,
    }

    /// mobius_run_pixel control-flow clone (derivative elided) tagging every
    /// loop turn with the gate flag of the reference span it consumes. The
    /// §18 gain ceiling: an O(1) gate transit collapses each contiguous
    /// in-gate stretch to ~1 turn, so oracle = turns − in-gate + transits.
    fn gate_pixel_turns(
        levels: &[MobiusLevel],
        radii: &[Vec<f64>],
        orbit: &[(f64, f64)],
        gate: &[bool],
        dc: (f64, f64),
        max_iter: usize,
    ) -> GateTurnStats {
        let bailout2 = 4.0_f64;
        let orbit_len = orbit.len();
        let cfe = CFe::from_c(dc.0, dc.1);
        let (mut dz, mut ref_i, mut iter) = ((0.0_f64, 0.0_f64), 0usize, 0usize);
        let mut st = GateTurnStats::default();
        let (mut prev_in, mut run) = (false, 0u64);
        while iter < max_iter {
            let in_g = gate[ref_i.min(gate.len() - 1)];
            if in_g && !prev_in {
                st.transits += 1;
            }
            prev_in = in_g;
            let mut adv = 1usize;
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
                    let blk = &lvl.blocks[slot];
                    let (phi, _, _) =
                        mobius_apply(&blk.m, CFe::from_c(dz.0, dz.1), cfe);
                    let cand = phi.to_f64();
                    let zi = orbit[ref_i + lvl.skip];
                    let candz = (zi.0 + cand.0, zi.1 + cand.1);
                    if lvl.skip > 1 && candz.0 * candz.0 + candz.1 * candz.1 > bailout2
                    {
                        continue;
                    }
                    dz = cand;
                    ref_i += lvl.skip;
                    iter += lvl.skip;
                    adv = lvl.skip;
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
                st.exact_turns += 1;
                if in_g {
                    st.exact_in_gate += 1;
                }
            }
            st.turns += 1;
            if in_g {
                st.turns_in_gate += 1;
                st.iters_in_gate += adv as u64;
                run += adv as u64;
                st.longest_run = st.longest_run.max(run);
            } else {
                run = 0;
            }
            if ref_i > orbit_len - 1 {
                ref_i = orbit_len - 1;
            }
            let z = orbit[ref_i];
            let full = (z.0 + dz.0, z.1 + dz.1);
            let full2 = full.0 * full.0 + full.1 * full.1;
            if full2 > bailout2 {
                break;
            }
            let dz2 = dz.0 * dz.0 + dz.1 * dz.1;
            if full2 < dz2 || ref_i == orbit_len - 1 {
                dz = full;
                ref_i = 0;
            }
            if st.turns > (max_iter * 2 + 16) as u64 {
                break;
            }
        }
        st.iters = iter as u64;
        st
    }

    /// Truncated sectorial Fatou coordinate of the flow model u̇ = P(u):
    /// Ψ(u) = Σ ρᵢ·log(u − rᵢ) over P's simple roots, ρᵢ = 1/P'(rᵢ) — exact
    /// for the flow's time-1 map; the deviation of the TRUE return map from
    /// it is precisely the residual this census measures. `p[k]` is the
    /// coefficient of u^{k+1} of P (p[0] = κ̃ = multiplier − 1); u = 0 is
    /// always a root (the recentering fixed point). None when roots are
    /// confluent at f64 scale (Ψ then needs a polar part — degenerate for
    /// the prototype, reported as such).
    #[derive(Clone)]
    struct FlowPsi {
        roots: Vec<C>,
        rhos: Vec<C>,
    }

    fn flow_psi(p: &[C]) -> Option<FlowPsi> {
        let scale = p.iter().map(|c| cabs(*c)).fold(0.0f64, f64::max);
        if scale == 0.0 {
            return None;
        }
        let mut deg = p.len();
        while deg > 1 && cabs(p[deg - 1]) < 1e-14 * scale {
            deg -= 1;
        }
        let q = &p[..deg];
        let mut roots: Vec<C> = vec![(0.0, 0.0)];
        if deg == 2 {
            roots.push(cdiv((-q[0].0, -q[0].1), q[1]));
        } else if deg > 2 {
            // Durand–Kerner on the reduced polynomial (degree ≤ 4): robust to
            // the wildly split root scales (coalescing pair ~1e-3, far roots
            // ~|a₃/a₄| — the composed return maps have huge top coefficients).
            let n = deg - 1;
            let lead = q[n];
            let monic: Vec<C> = q.iter().map(|c| cdiv(*c, lead)).collect();
            let r0 = cabs(monic[0]).powf(1.0 / n as f64).max(1e-6);
            let mut zs: Vec<C> = (0..n)
                .map(|k| {
                    let th = std::f64::consts::TAU * (k as f64 + 0.37) / n as f64;
                    (r0 * th.cos(), r0 * th.sin())
                })
                .collect();
            for _ in 0..512 {
                let mut worst = 0.0f64;
                for i in 0..n {
                    let f = poly_eval(&monic, zs[i]);
                    let mut den = (1.0f64, 0.0f64);
                    for j in 0..n {
                        if j != i {
                            den = cm(den, csub(zs[i], zs[j]));
                        }
                    }
                    if cabs(den) == 0.0 {
                        continue;
                    }
                    let step = cdiv(f, den);
                    zs[i] = csub(zs[i], step);
                    worst = worst.max(cabs(step) / (1.0 + cabs(zs[i])));
                }
                if worst < 1e-15 {
                    break;
                }
            }
            roots.extend(zs);
        }
        // Simple-root guard: partial fractions need distinct poles.
        let rmax = roots.iter().map(|r| cabs(*r)).fold(0.0f64, f64::max);
        for i in 0..roots.len() {
            for j in (i + 1)..roots.len() {
                if cabs(csub(roots[i], roots[j])) < 1e-12 * (1.0 + rmax) {
                    return None;
                }
            }
        }
        // ρᵢ = 1/P'(rᵢ) with P'(u) = Σ (k+1)·p[k]·u^k.
        let dp: Vec<C> = q
            .iter()
            .enumerate()
            .map(|(k, c)| ((k as f64 + 1.0) * c.0, (k as f64 + 1.0) * c.1))
            .collect();
        let rhos: Vec<C> =
            roots.iter().map(|r| cdiv((1.0, 0.0), poly_eval(&dp, *r))).collect();
        if rhos.iter().any(|r| !r.0.is_finite() || !r.1.is_finite()) {
            return None;
        }
        Some(FlowPsi { roots, rhos })
    }

    /// Ψ(F(u)) − Ψ(u) − 1 with per-step principal branches (the per-step
    /// ratios stay near 1 inside the gate, so the branch is unambiguous; the
    /// accumulated phase error is the telescoped sum of these).
    fn psi_step_residual(psi: &FlowPsi, u: C, u2: C) -> C {
        let mut s = (-1.0f64, 0.0f64);
        for (r, rho) in psi.roots.iter().zip(&psi.rhos) {
            s = cadd(s, cm(*rho, clog(cdiv(csub(u2, *r), csub(u, *r)))));
        }
        s
    }

    /// The persistent cycle the gate transit recenters on, at the PIXEL's own
    /// c (the c-channel is absorbed by the per-pixel recentering, as the §17
    /// runtime does with its quadratic): cusp → the cardioid fixed point;
    /// period2 → the 2-cycle roots of z² + z + c + 1.
    fn gate_cycle(base: &str, c: C) -> Vec<C> {
        match base {
            "cusp" => {
                let s = csqrt((1.0 - 4.0 * c.0, -4.0 * c.1));
                vec![((1.0 - s.0) * 0.5, -s.1 * 0.5)]
            }
            "period2" => {
                let s = csqrt((-3.0 - 4.0 * c.0, -4.0 * c.1));
                vec![
                    ((-1.0 + s.0) * 0.5, s.1 * 0.5),
                    ((-1.0 - s.0) * 0.5, -s.1 * 0.5),
                ]
            }
            _ => Vec::new(),
        }
    }

    /// Recentered per-step linear coefficients of one return (m = p·q steps,
    /// orbit order from cycle phase j0): u ↦ lin[t]·u + u², lin[t] = 2β.
    fn gate_lin(cycle: &[C], j0: usize, q: usize) -> Vec<C> {
        let p = cycle.len();
        (0..p * q)
            .map(|t| {
                let b = cycle[(j0 + t) % p];
                (2.0 * b.0, 2.0 * b.1)
            })
            .collect()
    }

    /// Truncated return-map series to u^n: compose u ↦ a·u + u² keeping n
    /// coefficients; returns F − id as s[k] = coeff of u^{k+1} (s[0] = κ̃).
    /// The composed coefficients grow geometrically (the m-step return is a
    /// degree-2^m polynomial), so each extra order divides the deep-petal
    /// residual by ~|h_{k+1}/h_k|·|u| — the truncation LADDER measures this.
    fn gate_series(lin: &[C], n: usize) -> Vec<C> {
        let mut h = vec![(0.0f64, 0.0f64); n];
        h[0] = (1.0, 0.0);
        for a in lin {
            let mut nh = vec![(0.0f64, 0.0f64); n];
            for (k, slot) in nh.iter_mut().enumerate() {
                *slot = cm(*a, h[k]);
                // (h²) coefficient of u^{k+1}: Σ_{i+j=k+1, i,j≥1} hᵢhⱼ.
                for i in 1..=k {
                    *slot = cadd(*slot, cm(h[i - 1], h[k - i]));
                }
            }
            h = nh;
        }
        h[0] = (h[0].0 - 1.0, h[0].1);
        h
    }

    /// P = the FORMAL LOG of F (the generator whose time-1 map is F to order
    /// `trunc`), NOT F − id: the time-1 map of the flow of F − id already
    /// differs from F at order 5 (½PP′ ⊃ 3/2·a₃²·u⁵ — numerically this
    /// reproduced the measured phase-0 residual floors exactly, 1.2e-3 cusp /
    /// 1.1e-2 period2). The corrections are the iterative-residue terms of
    /// the Écalle–Voronin normalization. Fixed-point iteration:
    /// E = Φ¹_P − F (Lie series Φ¹_P = id + Σ L_n/n!, L₁ = P, L_{n+1} = P·L_n′),
    /// P ← P − E. `full` = F − id from gate_series; both use
    /// s[k] = coeff of u^{k+1}.
    fn gate_log_flow(full: &[C], trunc: usize) -> Vec<C> {
        let mut p: Vec<C> = full[..trunc.min(full.len())].to_vec();
        let trunc = p.len();
        for _ in 0..12 {
            let mut g = vec![(0.0f64, 0.0f64); trunc];
            let mut ln: Vec<C> = p.clone();
            let mut fact = 1.0f64;
            for n in 1..=24 {
                fact *= n as f64;
                let mut biggest = 0.0f64;
                for (k, l) in ln.iter().enumerate() {
                    let t = (l.0 / fact, l.1 / fact);
                    g[k] = cadd(g[k], t);
                    biggest = biggest.max(cabs(t));
                }
                if biggest < 1e-30 {
                    break;
                }
                // L_{n+1} = P·L_n′, with L′ as coeff-of-u^k array der[k].
                let mut der = vec![(0.0f64, 0.0f64); trunc];
                for k in 0..trunc {
                    der[k] = ((k + 1) as f64 * ln[k].0, (k + 1) as f64 * ln[k].1);
                }
                let mut nl = vec![(0.0f64, 0.0f64); trunc];
                for (k, slot) in nl.iter_mut().enumerate() {
                    for i in 1..=(k + 1) {
                        let j = k + 1 - i;
                        if j < trunc {
                            *slot = cadd(*slot, cm(p[i - 1], der[j]));
                        }
                    }
                }
                ln = nl;
            }
            let mut done = true;
            for k in 0..trunc {
                let e = csub(g[k], full[k]);
                if cabs(e) > 1e-24 * (1.0 + cabs(full[k])) {
                    done = false;
                }
                p[k] = csub(p[k], e);
            }
            if done {
                break;
            }
        }
        p
    }

    struct GateResidual {
        /// F-steps until exit of the entry radius (or the cap — the recentered
        /// recursion needs no orbit, so it runs PAST the pixel budget to reach
        /// the true exit of slow transits).
        k: u64,
        m: usize,
        exited: bool,
        /// sup |Ψ∘F − Ψ − 1| over the transit: [cubic, quintic, octic P].
        sup: [f64; 3],
        /// |Σ residual| — the true accumulated phase error (signed sum).
        acc: [f64; 3],
        /// Σ |residual| — the triangle-certifiable budget (what a per-step
        /// certification of the conjugacy residual could bound without
        /// exploiting the oscillatory cancellation).
        acc_abs: [f64; 3],
        /// Exit-value error |Δu|/|u| implied by the accumulated phase error
        /// (Δu = acc·P(u), P = 1/Ψ′).
        exit_rel: [f64; 3],
        /// Same conversion applied to the triangle budget Σ|res|.
        tri_rel: [f64; 3],
        /// Octic sup profile per |u| band:
        /// (0.02, r], (0.01, 0.02], (0.005, 0.01], ≤ 0.005.
        prof: [f64; 4],
    }

    /// Phase-0 step 3: follow ONE pixel's real transit through the gate with
    /// the EXACT recentered return map (u ↦ 2β·u + u² around the persistent
    /// cycle — closed form, no cancellation) and measure the conjugacy
    /// residual of the truncated Ψ at three truncation orders.
    fn gate_transit_residual(
        base: &str,
        c0: C,
        dc: C,
        q: usize,
        max_iter: usize,
        r_gate: f64,
    ) -> Option<GateResidual> {
        const K_CAP: u64 = 60_000;
        let c = cadd(c0, dc);
        let cycle = gate_cycle(base, c);
        let p = cycle.len();
        if p == 0 {
            return None;
        }
        let m = p * q;
        // Pixel orbit → gate entry (first proximity to the cycle).
        let (mut zx, mut zy) = (0.0f64, 0.0f64);
        let mut entry: Option<(usize, usize)> = None;
        for n in 0..max_iter {
            if zx * zx + zy * zy > 4.0 {
                break;
            }
            if n >= 8 * m {
                let (mut bj, mut bd) = (0usize, f64::INFINITY);
                for (j, b) in cycle.iter().enumerate() {
                    let d = cabs((zx - b.0, zy - b.1));
                    if d < bd {
                        bd = d;
                        bj = j;
                    }
                }
                if bd < r_gate {
                    entry = Some((n, bj));
                    break;
                }
            }
            let nx = zx * zx - zy * zy + c.0;
            let ny = 2.0 * zx * zy + c.1;
            zx = nx;
            zy = ny;
        }
        let (_n0, j0) = entry?;
        let lin = gate_lin(&cycle, j0, q);
        let full = gate_series(&lin, 8);
        let ps: [Vec<C>; 3] =
            [gate_log_flow(&full, 3), gate_log_flow(&full, 5), gate_log_flow(&full, 8)];
        let psis = [flow_psi(&ps[0])?, flow_psi(&ps[1])?, flow_psi(&ps[2])?];
        // Transit with the exact recentered steps.
        let mut u = (zx - cycle[j0].0, zy - cycle[j0].1);
        let mut out = GateResidual {
            k: 0,
            m,
            exited: false,
            sup: [0.0; 3],
            acc: [0.0; 3],
            acc_abs: [0.0; 3],
            exit_rel: [0.0; 3],
            tri_rel: [0.0; 3],
            prof: [0.0; 4],
        };
        let mut accv = [(0.0f64, 0.0f64); 3];
        for _ in 0..K_CAP {
            let ua = cabs(u);
            if ua > r_gate {
                out.exited = true;
                break;
            }
            let mut u2 = u;
            for a in &lin {
                u2 = cadd(cm(*a, u2), cm(u2, u2));
            }
            for (i, psi) in psis.iter().enumerate() {
                let r = psi_step_residual(psi, u, u2);
                let ra = cabs(r);
                out.sup[i] = out.sup[i].max(ra);
                out.acc_abs[i] += ra;
                if i == 2 {
                    let bin = if ua > 0.02 {
                        0
                    } else if ua > 0.01 {
                        1
                    } else if ua > 0.005 {
                        2
                    } else {
                        3
                    };
                    out.prof[bin] = out.prof[bin].max(ra);
                }
                accv[i] = cadd(accv[i], r);
            }
            u = u2;
            out.k += 1;
        }
        for i in 0..3 {
            out.acc[i] = cabs(accv[i]);
            // acc·|P(u)|/|u| = acc·|q(u)| — the value error at transit end.
            let qv = cabs(poly_eval(&ps[i], u));
            out.exit_rel[i] = out.acc[i] * qv;
            out.tri_rel[i] = out.acc_abs[i] * qv;
        }
        Some(out)
    }

    // ── §18 stage 1: stable block power ──────────────────────────────────────

    #[test]
    fn mobius_pow_stable_at_coalescence() {
        // The normalized binary powering must match direct Möbius iteration at
        // machine precision THROUGH the near-parabolic regime (period2
        // reference tail, κ ≈ −1: the coalescence lives in the RETURN M² —
        // exactly §18's "don't trigger on |κ| → 1 alone" case). The §17
        // w-form and the eigen/divided-difference path errors are printed for
        // the record: both floor on the ζ-cancellation as dc → 0 (see the
        // mobius_pow_stable section note).
        let orbit = ref_orbit_f64(-1.25, 0.0, 3000);
        assert!(orbit.len() > 2900, "period2 reference escaped");
        let n0 = 2800usize;
        let jet = jet_compose(
            &jet_seed(orbit[n0].0, orbit[n0].1),
            &jet_seed(orbit[n0 + 1].0, orbit[n0 + 1].1),
        );
        let m = mobius_from_jet(&jet); // the §17 periodic-header form
        assert!(!m.degenerate);
        let delta0 = (3e-5_f64, 1.7e-5_f64);
        for dc in [(1e-5_f64, 0.7e-5_f64), (1e-8, 1e-8), (0.0, 0.0)] {
            let ae = cadd(m.a.to_f64(), cm(m.ap.to_f64(), dc));
            let de = cadd(m.d.to_f64(), cm(m.dp.to_f64(), dc));
            let bc = cm(m.b.to_f64(), dc);
            let ff = cadd((1.0, 0.0), cm(m.f.to_f64(), dc));
            let g = |d: C| -> C { cdiv(cadd(cm(ae, d), bc), cadd(cm(de, d), ff)) };
            for k in [10u64, 1000, 100_000] {
                let mut want = delta0;
                for _ in 0..k {
                    want = g(want);
                }
                let mk = mobius_pow_stable(&m, dc, k);
                let got = cdiv(
                    cadd(cm(mk[0], delta0), mk[1]),
                    cadd(cm(mk[2], delta0), mk[3]),
                );
                let rel = cabs(csub(got, want)) / cabs(want).max(1e-300);
                // Eigen path (naive λ^k — the divided-difference form matches
                // it exactly in this regime; both inherit the ζ-cancellation).
                let tr = cadd(ae, ff);
                let det = csub(cm(ae, ff), cm(bc, de));
                let disc = csqrt(cadd(
                    cm(csub(ae, ff), csub(ae, ff)),
                    (4.0 * cm(bc, de).0, 4.0 * cm(bc, de).1),
                ));
                let l1 = ((tr.0 - disc.0) * 0.5, (tr.1 - disc.1) * 0.5);
                let l2 = ((tr.0 + disc.0) * 0.5, (tr.1 + disc.1) * 0.5);
                let powc = |l: C, n: u64| -> C {
                    let lg = clog(l);
                    let e = (n as f64 * lg.0, n as f64 * lg.1);
                    let r = e.0.exp();
                    (r * e.1.cos(), r * e.1.sin())
                };
                let eig_rel = {
                    let dk = cdiv(csub(powc(l1, k), powc(l2, k)), csub(l1, l2));
                    let dk1 =
                        cdiv(csub(powc(l1, k - 1), powc(l2, k - 1)), csub(l1, l2));
                    let q = cm(det, dk1);
                    let ge = cdiv(
                        cadd(cm(csub(cm(dk, ae), q), delta0), cm(dk, bc)),
                        cadd(cm(cm(dk, de), delta0), csub(cm(dk, ff), q)),
                    );
                    cabs(csub(ge, want)) / cabs(want).max(1e-300)
                };
                // §17 w-form: fixed points of g, w ↦ κ^k·w.
                let w_rel = {
                    let b = csub(ff, ae);
                    let d2 = csqrt(cadd(
                        cm(b, b),
                        (4.0 * cm(de, bc).0, 4.0 * cm(de, bc).1),
                    ));
                    let den2 = (2.0 * de.0, 2.0 * de.1);
                    let za = cdiv(cadd((-b.0, -b.1), d2), den2);
                    let zr = cdiv(csub((-b.0, -b.1), d2), den2);
                    let kappa = {
                        let dena = cadd(cm(de, za), ff);
                        cdiv(csub(cm(ae, ff), cm(bc, de)), cm(dena, dena))
                    };
                    let w0 = cdiv(csub(delta0, za), csub(delta0, zr));
                    let wk = cm(powc(kappa, k), w0);
                    let dk = cdiv(csub(za, cm(zr, wk)), csub((1.0, 0.0), wk));
                    cabs(csub(dk, want)) / cabs(want).max(1e-300)
                };
                println!(
                    "dc=({:.0e},{:.0e}) k={:6}: binpow rel {:.1e} | eigen rel {:.1e} | w-form rel {:.1e}",
                    dc.0, dc.1, k, rel, eig_rel, w_rel
                );
                assert!(
                    rel < 1e-12,
                    "stable power drifted: dc={:?} k={} rel {:.2e}",
                    dc, k, rel
                );
            }
        }
    }

    // ── §18 stage 2 prototype: the gate-accelerated pixel loop (CPU) ─────────
    // The "prototype sûr" point by point: (1) entry map = exact per-pixel
    // recentering on the persistent cycle (closed form for p ≤ 2 — the
    // c-channel is absorbed exactly, as §17's runtime quadratic does),
    // (2) k chosen toward the exit threshold, (3) inverse map = Ψ⁻¹ by
    // adaptive principal-branch hops, (4) rebase into the ordinary loop.
    // Out-of-sector pixels, degenerate Ψ, failed Newtons, k < 2 → systematic
    // fallback to the ordinary certified loop (the jump is NEVER load-bearing
    // for soundness of the fallback path).

    /// One §18 gate jump: from u₀ inside the gate, fast-forward the return
    /// map by an INTEGER k ≤ k_max so the transit either exits |u| > r_exit
    /// or exhausts k_max — adaptive Ψ-plane hops (Euler predictor, Newton
    /// corrector on the per-hop increment, |Δu| ≤ 0.2·distance-to-nearest-
    /// pole so every log stays on the principal branch). None ⇒ caller falls
    /// back to ordinary iteration.
    fn gate_jump(
        ps: &[C],
        psi: &FlowPsi,
        u0: C,
        r_exit: f64,
        k_max: u64,
    ) -> Option<(u64, C)> {
        if k_max == 0 {
            return None;
        }
        let pval = |u: C| cm(u, poly_eval(ps, u));
        let hop = |u: C, un0: C, dk: f64| -> Option<C> {
            let mut un = un0;
            for _ in 0..24 {
                let mut g = (-dk, 0.0);
                for (r, rho) in psi.roots.iter().zip(&psi.rhos) {
                    g = cadd(g, cm(*rho, clog(cdiv(csub(un, *r), csub(u, *r)))));
                }
                let step = cm(g, pval(un));
                un = csub(un, step);
                if cabs(step) < 1e-13 * (1.0 + cabs(un)) {
                    return Some(un);
                }
            }
            None
        };
        let mut u = u0;
        let mut k_done = 0.0f64;
        let mut hops = 0u32;
        while k_done < k_max as f64 && cabs(u) <= r_exit {
            hops += 1;
            if hops > 512 {
                return None;
            }
            let sp = pval(u);
            let spd = cabs(sp);
            let droot = psi
                .roots
                .iter()
                .map(|r| cabs(csub(u, *r)))
                .fold(f64::INFINITY, f64::min);
            if spd < 1e-300 || droot < 1e-300 {
                k_done = k_max as f64; // pinned at a fixed point: never exits
                break;
            }
            let dk = (0.2 * droot / spd).min(k_max as f64 - k_done).max(1e-9);
            let pred = cadd(u, (sp.0 * dk, sp.1 * dk));
            u = hop(u, pred, dk)?;
            k_done += dk;
        }
        let k_int = (k_done.floor() as u64).min(k_max);
        if k_int == 0 {
            return None;
        }
        let back = k_int as f64 - k_done; // ∈ (−1, 0]
        if back != 0.0 {
            let sp = pval(u);
            let pred = cadd(u, (sp.0 * back, sp.1 * back));
            u = hop(u, pred, back)?;
        }
        Some((k_int, u))
    }

    #[derive(Default)]
    struct FatouProtoStats {
        turns: u64,
        iters: usize,
        jumps: u64,
        fallbacks: u64,
        escaped: bool,
    }

    /// The production Möbius pixel loop plus the gate move: when the
    /// reference index sits inside the detected gate span and the pixel is
    /// within the entry radius of its own persistent cycle, jump. Block
    /// probing, exact fallback, first-escape and Zhuoran rebasing unchanged.
    #[allow(clippy::too_many_arguments)]
    fn fatou_run_pixel(
        levels: &[MobiusLevel],
        radii: &[Vec<f64>],
        orbit: &[(f64, f64)],
        span: (usize, usize),
        base: &str,
        q: usize,
        c0: C,
        dc: (f64, f64),
        max_iter: usize,
        r_entry: f64,
    ) -> FatouProtoStats {
        let bailout2 = 4.0_f64;
        let orbit_len = orbit.len();
        let cfe = CFe::from_c(dc.0, dc.1);
        let c = cadd(c0, dc);
        let cycle = gate_cycle(base, c);
        let p = cycle.len().max(1);
        let m = p * q;
        // Ψ per cycle phase, built at most once per pixel (O(1) per-pixel
        // setup, like §17's runtime quadratic).
        let mut psis: Vec<Option<Option<(Vec<C>, FlowPsi)>>> = vec![None; p];
        let mut st = FatouProtoStats::default();
        let (mut dz, mut ref_i, mut iter) = ((0.0f64, 0.0f64), 0usize, 0usize);
        while iter < max_iter {
            let mut jumped = false;
            // ── gate move ──
            if !cycle.is_empty()
                && st.fallbacks < 8
                && ref_i >= span.0
                && ref_i + m <= span.1.min(orbit_len - 1)
            {
                let z = (orbit[ref_i].0 + dz.0, orbit[ref_i].1 + dz.1);
                let (mut j0, mut bd) = (0usize, f64::INFINITY);
                for (j, b) in cycle.iter().enumerate() {
                    let d = cabs((z.0 - b.0, z.1 - b.1));
                    if d < bd {
                        bd = d;
                        j0 = j;
                    }
                }
                let k_max =
                    ((max_iter - iter) / m).min((span.1.min(orbit_len - 1) - ref_i) / m);
                if bd < r_entry && k_max >= 4 {
                    let ent = psis[j0].get_or_insert_with(|| {
                        let lin = gate_lin(&cycle, j0, q);
                        let full = gate_series(&lin, 8);
                        let ps = gate_log_flow(&full, 8);
                        flow_psi(&ps).map(|psi| (ps, psi))
                    });
                    if let Some((ps, psi)) = ent.as_ref() {
                        let u0 = (z.0 - cycle[j0].0, z.1 - cycle[j0].1);
                        match gate_jump(ps, psi, u0, r_entry, k_max as u64) {
                            Some((k, un)) if k >= 2 => {
                                iter += k as usize * m;
                                ref_i += k as usize * m;
                                let zi = orbit[ref_i];
                                dz = (
                                    cycle[j0].0 + un.0 - zi.0,
                                    cycle[j0].1 + un.1 - zi.1,
                                );
                                st.jumps += 1;
                                jumped = true;
                            }
                            _ => st.fallbacks += 1,
                        }
                    }
                }
            }
            // ── ordinary turn (identical to the production loop) ──
            if !jumped {
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
                        let blk = &lvl.blocks[slot];
                        let (phi, _, _) =
                            mobius_apply(&blk.m, CFe::from_c(dz.0, dz.1), cfe);
                        let cand = phi.to_f64();
                        let zi = orbit[ref_i + lvl.skip];
                        let candz = (zi.0 + cand.0, zi.1 + cand.1);
                        if lvl.skip > 1
                            && candz.0 * candz.0 + candz.1 * candz.1 > bailout2
                        {
                            continue;
                        }
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
                }
            }
            st.turns += 1;
            if ref_i > orbit_len - 1 {
                ref_i = orbit_len - 1;
            }
            let z = orbit[ref_i];
            let full = (z.0 + dz.0, z.1 + dz.1);
            let full2 = full.0 * full.0 + full.1 * full.1;
            if full2 > bailout2 {
                st.escaped = true;
                break;
            }
            let dz2 = dz.0 * dz.0 + dz.1 * dz.1;
            if full2 < dz2 || ref_i == orbit_len - 1 {
                dz = full;
                ref_i = 0;
            }
            if st.turns > (max_iter * 2 + 16) as u64 {
                break;
            }
        }
        st.iters = iter;
        st
    }

    /// Exact per-pixel escape reference (plain f64 iteration, same bailout).
    fn exact_pixel(c: C, max_iter: usize) -> (bool, usize) {
        let (mut zx, mut zy) = (0.0f64, 0.0f64);
        for n in 0..max_iter {
            if zx * zx + zy * zy > 4.0 {
                return (true, n);
            }
            let nx = zx * zx - zy * zy + c.0;
            let ny = 2.0 * zx * zy + c.1;
            zx = nx;
            zy = ny;
        }
        (false, max_iter)
    }

    #[test]
    #[ignore]
    fn fatou_gate_prototype_pixel_loop() {
        // §18 stage-2 prototype A/B: the census pixel row (3000-iteration
        // budget, the round-6/7 pain regimes) with block table + gates, then
        // long escape probes (400k budget, table-less: the gate does the
        // lifting) for TRUE through-gate escape parity vs exact iteration.
        //   cargo test --release fatou_gate_prototype_pixel_loop -- --ignored --nocapture
        for (name, cx, cy, eps, dec, r_entry) in [
            ("cusp", -0.75_f64, 0.0_f64, 1e-3_f64, -5.0_f64, 0.04_f64),
            ("period2", -1.25, 0.0, 1e-3, -5.0, 0.02),
        ] {
            let max_iter = 3000usize;
            let log2_c_max = dec * LOG2_10_LOCAL;
            let orbit = ref_orbit_f64(cx, cy, max_iter);
            assert!(orbit.len() > max_iter, "[{}] reference escaped", name);
            let levels = mobius_build_levels(&orbit, 1 << 18);
            let bounds = mobius_build_bounds(&levels, &orbit, log2_c_max);
            let radii = mobius_build_radii(&levels, &bounds, eps, log2_c_max);
            let pade_levels = crate::bench_build_levels(&orbit, eps, true, 1 << 18);
            let gate = gate_scan(&orbit, 64);
            // Largest λ-hit span (phase 0 verified it as THE gate).
            let mut span = (0usize, 0usize);
            let mut cur: Option<usize> = None;
            for (n, g) in gate.iter().enumerate() {
                match (g.is_some(), cur) {
                    (true, None) => cur = Some(n),
                    (false, Some(s)) => {
                        if n - s > span.1 - span.0 {
                            span = (s, n);
                        }
                        cur = None;
                    }
                    _ => {}
                }
            }
            if let Some(s) = cur {
                if gate.len() - s > span.1 - span.0 {
                    span = (s, gate.len());
                }
            }
            let cmx = log2_c_max.exp2();
            let (mut t_pade, mut t_mob, mut t_proto) = (0u64, 0u64, 0u64);
            let (mut jumps, mut fallbacks) = (0u64, 0u64);
            let (mut flag_bad, mut worst_diter) = (0u64, 0i64);
            for kpx in 0..16 {
                let t = (kpx as f64 / 16.0) * 2.0 - 1.0;
                let dc = (t * cmx * 0.7, 0.37 * t * cmx);
                let pr = fatou_run_pixel(
                    &levels, &radii, &orbit, span, name, 2, (cx, cy), dc,
                    max_iter, r_entry,
                );
                let (ps, _, _) =
                    crate::bench_run_pixel(&pade_levels, &orbit, dc, max_iter, true);
                let mb = mobius_run_pixel(&levels, &radii, &orbit, dc, max_iter);
                t_pade += ps as u64;
                t_mob += mb.steps as u64;
                t_proto += pr.turns;
                jumps += pr.jumps;
                fallbacks += pr.fallbacks;
                let (e_esc, e_iter) = exact_pixel((cx + dc.0, cy + dc.1), max_iter);
                if e_esc != pr.escaped {
                    flag_bad += 1;
                } else if e_esc {
                    worst_diter = worst_diter.max((pr.iters as i64 - e_iter as i64).abs());
                }
            }
            println!(
                "[{}] row: pade={} mobius={} proto={} ({:.2}x pade, was {:.2}x) | jumps {} fallbacks {} | escape-flag mismatches {} worst Δiter {}",
                name,
                t_pade,
                t_mob,
                t_proto,
                t_proto as f64 / t_pade.max(1) as f64,
                t_mob as f64 / t_pade.max(1) as f64,
                jumps,
                fallbacks,
                flag_bad,
                worst_diter
            );
            assert_eq!(flag_bad, 0, "[{}] escape-flag mismatch vs exact", name);
            assert!(
                (t_proto as f64) < (t_pade as f64) * 2.0,
                "[{}] prototype ({} turns) not under 2x pade ({})",
                name, t_proto, t_pade
            );
            assert!(
                worst_diter <= 2,
                "[{}] escape-iteration drift {} beyond the ε budget",
                name, worst_diter
            );

            // Long escape probes: table-less, gate only, true exits.
            let long_iter = 400_000usize;
            let lorbit = ref_orbit_f64(cx, cy, long_iter);
            assert!(lorbit.len() > long_iter);
            let lgate = gate_scan(&lorbit, 8);
            let mut lspan = (0usize, 0usize);
            let mut cur: Option<usize> = None;
            for (n, g) in lgate.iter().enumerate() {
                match (g.is_some(), cur) {
                    (true, None) => cur = Some(n),
                    (false, Some(s)) => {
                        if n - s > lspan.1 - lspan.0 {
                            lspan = (s, n);
                        }
                        cur = None;
                    }
                    _ => {}
                }
            }
            if let Some(s) = cur {
                if lgate.len() - s > lspan.1 - lspan.0 {
                    lspan = (s, lgate.len());
                }
            }
            for dcp in [(0.0, 3e-5_f64), (0.0, -3e-5), (0.0, 1e-4), (2e-5, 2e-5)] {
                let pr = fatou_run_pixel(
                    &[], &[], &lorbit, lspan, name, 2, (cx, cy), dcp, long_iter,
                    r_entry,
                );
                let (e_esc, e_iter) = exact_pixel((cx + dcp.0, cy + dcp.1), long_iter);
                println!(
                    "  probe dc=({:.1e},{:.1e}): proto {} iters {} (turns {}, jumps {}, fallbacks {}) | exact {} iters {} | Δiter {}",
                    dcp.0,
                    dcp.1,
                    if pr.escaped { "ESC" } else { "int" },
                    pr.iters,
                    pr.turns,
                    pr.jumps,
                    pr.fallbacks,
                    if e_esc { "ESC" } else { "int" },
                    e_iter,
                    pr.iters as i64 - e_iter as i64
                );
                assert_eq!(pr.escaped, e_esc, "[{}] probe escape-flag mismatch", name);
                if e_esc {
                    assert!(
                        (pr.iters as i64 - e_iter as i64).abs() <= 2,
                        "[{}] probe escape-iteration drift beyond the ε budget",
                        name
                    );
                }
            }
        }
    }

    #[test]
    #[ignore]
    fn fatou_gate_phase0_census() {
        let max_iter = 3000usize;
        for (name, cx, cy, eps, dec, coarse) in [
            ("cusp", -0.75_f64, 0.0_f64, 1e-3_f64, -5.0_f64, true),
            ("period2", -1.25, 0.0, 1e-3, -5.0, true),
            ("seahorse", -0.743643887037151, 0.131825904205330, 1e-4, -10.0, false),
            ("feigenbaum", -1.401155, 0.0, 1e-6, -9.0, false),
        ] {
            let log2_c_max = dec * LOG2_10_LOCAL;
            let orbit = ref_orbit_f64(cx, cy, max_iter);
            if orbit.len() <= max_iter {
                println!("[{}] escaped early — skipped", name);
                continue;
            }
            println!("\n=== [{}] eps={:e} c~1e{:.0} ===", name, eps, dec);

            // ── 1. detection ──
            let gate = gate_scan(&orbit, 64);
            let n_hits = gate.iter().filter(|g| g.is_some()).count();
            let mut mh: std::collections::BTreeMap<usize, usize> =
                std::collections::BTreeMap::new();
            for g in gate.iter().flatten() {
                *mh.entry(*g).or_insert(0) += 1;
            }
            let mut spans: Vec<(usize, usize)> = Vec::new();
            let mut cur: Option<usize> = None;
            for (n, g) in gate.iter().enumerate() {
                match (g.is_some(), cur) {
                    (true, None) => cur = Some(n),
                    (false, Some(s)) => {
                        spans.push((s, n));
                        cur = None;
                    }
                    _ => {}
                }
            }
            if let Some(s) = cur {
                spans.push((s, gate.len()));
            }
            let mut vg = vec![false; gate.len()];
            let mut n_spans_ok = 0usize;
            for &(s0, s1) in &spans {
                if s1 - s0 < 8 {
                    continue; // noise span — never verified
                }
                let samples = [s0, (s0 + s1) / 2, (s1 - 1).max(s0)];
                let (mut gaps, mut c20s, mut c30s) =
                    (Vec::new(), Vec::new(), Vec::new());
                for &n in &samples {
                    if let Some(m) = gate[n] {
                        if n + m < orbit.len() {
                            let (g, c20, c30) = gate_verify(&orbit, n, m);
                            gaps.push(g);
                            c20s.push(c20);
                            c30s.push(c30);
                        }
                    }
                }
                if gaps.is_empty() {
                    continue;
                }
                gaps.sort_by(|a, b| a.partial_cmp(b).unwrap());
                c30s.sort_by(|a, b| a.partial_cmp(b).unwrap());
                let (mg, m30) = (gaps[gaps.len() / 2], c30s[c30s.len() / 2]);
                let ok = mg < 0.05 && m30 > 1e-2;
                if ok {
                    n_spans_ok += 1;
                    for f in vg.iter_mut().take(s1).skip(s0) {
                        *f = true;
                    }
                }
                println!(
                    "  span {:5}..{:5} gap med {:.2e} |c20| {:.2e} |c30| {:.2e} → {}",
                    s0,
                    s1,
                    mg,
                    c20s[c20s.len() / 2],
                    m30,
                    if ok { "GATE" } else { "rejected" }
                );
            }
            let n_verified = vg.iter().filter(|f| **f).count();
            println!(
                "  detection: λ-hits {} (m* {:?}), spans {} → verified {} ({} indices)",
                n_hits,
                mh,
                spans.len(),
                n_spans_ok,
                n_verified
            );

            // Saturated blocks (round-6 classification) vs verified gates.
            let levels = mobius_build_levels(&orbit, 1 << 18);
            let bounds = mobius_build_bounds(&levels, &orbit, log2_c_max);
            let radii = mobius_build_radii(&levels, &bounds, eps, log2_c_max);
            let (mut n_sat, mut n_sat_gate) = (0u64, 0u64);
            for (li, lvl) in levels.iter().enumerate() {
                if lvl.skip < MOBIUS_MIN_EMIT_SKIP {
                    continue;
                }
                for (s, blk) in lvl.blocks.iter().enumerate() {
                    if blk.m.degenerate {
                        continue;
                    }
                    let b = &bounds.per_level[li][s];
                    let usable = (0..MOBIUS_NCAND).any(|c| {
                        b.log2_rz[c].is_finite()
                            && b.log2_mq[c].is_finite()
                            && log2_c_max - bounds.log2_rc[c] < -1e-9
                    });
                    if usable {
                        continue;
                    }
                    n_sat += 1;
                    let first = 1 + s * lvl.skip;
                    let cov = (first..(first + lvl.skip).min(vg.len()))
                        .filter(|&i| vg[i])
                        .count() as f64
                        / lvl.skip as f64;
                    if cov >= 0.8 {
                        n_sat_gate += 1;
                    }
                }
            }
            println!(
                "  saturated blocks: {} — inside a verified gate: {}",
                n_sat, n_sat_gate
            );

            // ── 2. gain oracle ──
            let pade_levels = crate::bench_build_levels(&orbit, eps, true, 1 << 18);
            let cmx = log2_c_max.exp2();
            let mut agg = GateTurnStats::default();
            let mut t_pade = 0u64;
            let mut runs: Vec<u64> = Vec::new();
            for kpx in 0..16 {
                let t = (kpx as f64 / 16.0) * 2.0 - 1.0;
                let dc = (t * cmx * 0.7, 0.37 * t * cmx);
                let st = gate_pixel_turns(&levels, &radii, &orbit, &vg, dc, max_iter);
                let (ps, _, _) =
                    crate::bench_run_pixel(&pade_levels, &orbit, dc, max_iter, true);
                t_pade += ps as u64;
                agg.turns += st.turns;
                agg.turns_in_gate += st.turns_in_gate;
                agg.exact_turns += st.exact_turns;
                agg.exact_in_gate += st.exact_in_gate;
                agg.transits += st.transits;
                agg.iters += st.iters;
                agg.iters_in_gate += st.iters_in_gate;
                runs.push(st.longest_run);
            }
            let oracle = agg.turns - agg.turns_in_gate + agg.transits;
            runs.sort_unstable();
            println!(
                "  turns: pade={} mobius={} ({:.2}x) | in-gate {:.0}% of turns, {:.0}% of exact steps | transits {} longest-run med {} max {}",
                t_pade,
                agg.turns,
                agg.turns as f64 / t_pade.max(1) as f64,
                100.0 * agg.turns_in_gate as f64 / agg.turns.max(1) as f64,
                100.0 * agg.exact_in_gate as f64 / agg.exact_turns.max(1) as f64,
                agg.transits,
                runs[runs.len() / 2],
                runs[runs.len() - 1]
            );
            println!(
                "  oracle (free transit): {} turns ({:.2}x pade — was {:.2}x)",
                oracle,
                oracle as f64 / t_pade.max(1) as f64,
                agg.turns as f64 / t_pade.max(1) as f64
            );

            // ── 3. residual prototype (coarse regimes only) ──
            if coarse {
                // Entry-radius sweep on two extreme pixels: the outer band
                // dominates the raw sup — where does the truncated asymptotic
                // become usable, and what does a later entry cost in k?
                for r_gate in [0.04_f64, 0.02, 0.01] {
                    for kpx in [0usize, 15] {
                        let t = (kpx as f64 / 16.0) * 2.0 - 1.0;
                        let dc = (t * cmx * 0.7, 0.37 * t * cmx);
                        let Some(r) = gate_transit_residual(
                            name, (cx, cy), dc, 2, max_iter, r_gate,
                        ) else {
                            println!(
                                "    r={:.2} px{:2}: no entry (or Ψ degenerate)",
                                r_gate, kpx
                            );
                            continue;
                        };
                        println!(
                            "    r={:.2} px{:2}: K={:6} ({}) εΨ 3/5/8: {:.1e} {:.1e} {:.1e} | exit-rel {:.1e} {:.1e} {:.1e} | tri-rel {:.1e} {:.1e} {:.1e} | prof(octic) {:.1e} {:.1e} {:.1e} {:.1e}",
                            r_gate,
                            kpx,
                            r.k,
                            if r.exited { "exit" } else { "capped" },
                            r.sup[0], r.sup[1], r.sup[2],
                            r.exit_rel[0], r.exit_rel[1], r.exit_rel[2],
                            r.tri_rel[0], r.tri_rel[1], r.tri_rel[2],
                            r.prof[0], r.prof[1], r.prof[2], r.prof[3]
                        );
                    }
                }
                // Escape probes: the census row is all-interior (capped) —
                // the |P(u_end)| conversion factor is then tiny and flattering.
                // Pure-imaginary dc sits in the EXTERIOR sliver of the
                // tangency (outside both components), giving true through-gate
                // transits: K to exit is finite and the exit conversion
                // happens at |u| = r_gate where |P| is NOT small. These are
                // the §18 value-transport numbers.
                for dcp in [
                    (0.0, 0.7e-5_f64),
                    (0.0, -0.7e-5),
                    (0.0, 3e-5),
                    (0.0, 1e-4),
                ] {
                    for r_gate in [0.02_f64, 0.01] {
                        let Some(r) = gate_transit_residual(
                            name, (cx, cy), dcp, 2, max_iter, r_gate,
                        ) else {
                            println!(
                                "    esc dc=({:.1e},{:.1e}) r={:.2}: no entry",
                                dcp.0, dcp.1, r_gate
                            );
                            continue;
                        };
                        println!(
                            "    esc dc=({:.1e},{:.1e}) r={:.2}: K={:6} ({}) εΨ 5/8: {:.1e} {:.1e} | exit-rel {:.1e} {:.1e} | tri-rel {:.1e} {:.1e}",
                            dcp.0,
                            dcp.1,
                            r_gate,
                            r.k,
                            if r.exited { "EXIT" } else { "capped" },
                            r.sup[1], r.sup[2],
                            r.exit_rel[1], r.exit_rel[2],
                            r.tri_rel[1], r.tri_rel[2]
                        );
                    }
                }
                // Full pixel row at the deepest entry the pixel budget
                // reaches (cusp: |u| ~ n^{−1/2} only gets to ~9e-3 at 3000
                // iterations, so 0.01 never triggers there): the GO numbers.
                let r_go = if name == "cusp" { 0.02 } else { 0.01 };
                let (mut worst_tri, mut worst_exit, mut n_entered) =
                    (0.0f64, 0.0f64, 0u64);
                for kpx in 0..16 {
                    if kpx == 8 {
                        continue; // dc = 0: the reference itself (κ̃ = 0, Ψ degenerate)
                    }
                    let t = (kpx as f64 / 16.0) * 2.0 - 1.0;
                    let dc = (t * cmx * 0.7, 0.37 * t * cmx);
                    let Some(r) = gate_transit_residual(
                        name, (cx, cy), dc, 2, max_iter, r_go,
                    ) else {
                        continue;
                    };
                    n_entered += 1;
                    worst_tri = worst_tri.max(r.tri_rel[2]);
                    worst_exit = worst_exit.max(r.exit_rel[2]);
                }
                println!(
                    "  GO gates: turn-coverage {:.0}% (need ≥ 50), sat-in-gate {}/{}, worst exit-rel {:.1e} / tri-rel {:.1e} (ε = {:.0e}, octic, entry {}), entered {}/15",
                    100.0 * agg.turns_in_gate as f64 / agg.turns.max(1) as f64,
                    n_sat_gate,
                    n_sat,
                    worst_exit,
                    worst_tri,
                    eps,
                    r_go,
                    n_entered
                );
            } else {
                println!(
                    "  control: λ-hits {} verified {} — verified ∩ saturated {} (the operative detector: need 0)",
                    n_hits, n_verified, n_sat_gate
                );
            }
        }
    }
}

#[cfg(test)]
mod size_check {
    // The GPU record byte width the worker copy / Engine sizing / WGSL stride
    // all assume ([2/1]-c+: 7 × 12 B — see the round-6 stride checklist).
    #[test]
    fn mobius_coeffs_layout() {
        assert_eq!(std::mem::size_of::<super::MobiusCoeffs>(), 84);
        assert_eq!(std::mem::align_of::<super::MobiusCoeffs>(), 4);
    }
}
