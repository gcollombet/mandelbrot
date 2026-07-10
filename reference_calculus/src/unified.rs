//! Unified block table (unify-jet-table-dispatch, Phase A).
//!
//! ONE build serves every evaluation tier. Per block, the coefficient record is
//! PREFIX-ORDERED (design D2):
//!
//!   [A, B, D, A', D', F, a30, a12, a03]
//!    └affine┘
//!    └── Padé ──┘
//!    └────── c+ ──────┘
//!    └──────────── jet (order 3) ─────────┘
//!
//! so each tier reads a strict prefix. Slot 5 carries F = −c₀₂/c₀₁ (the
//! 6-coefficient c+ extraction's denominator c-slot, `mobius_from_jet`) — the
//! raw a₀₂ it displaced is reconstructible in registers (a₀₂ = −F·B), keeping
//! the record size-neutral. The jet tier reconstructs its remaining degree ≤ 3
//! coefficients from the F-refreshed §11 identities:
//!
//!   a20 = −D·A,   a11 = A' − B·D − F·A,
//!   a21 = −D'·A − D·a11 + F·D·A,   a02 = −F·B
//!
//! (2–3 extra multiplications, amortized: the jet tier runs in the fe
//! compute-bound regime, while BANDWIDTH is the axis the plateau punishes —
//! duplicated per-tier records were rejected for exactly that reason.)

use crate::jet::{
    cfe_to_coeff, fe_exp2, jet_block_bounds_moduli, jet_idx, jet_seed, jet_solve_radii,
    sfe_norm, CFe, JetCoeffFe, JetF64, JetLevel, JET_MONOMIALS, JET_NCOEFF,
};
use crate::jet::JetBlockBounds;
// The unified record shares the 6-coefficient F-form extraction with the
// standalone mobius mode (`mobius_from_jet`, denominator 1 + (D+D'c)z + Fc):
// slot 5 ships F, the displaced raw a₀₂ is reconstructed in registers
// (a₀₂ = −F·B) and the §11 identities carry the F terms (see module head).
use crate::mobius::{
    mobius_build_bounds, mobius_build_derivative_radii, mobius_build_radii,
    mobius_from_jet, mobius_from_jet_plain, mobius_q, MobiusBlock,
    MobiusBoundsTable, MobiusCPlus, MobiusLevel,
    MOBIUS_F32_SAFE_LOG2, MOBIUS_MIN_EMIT_SKIP,
};

/// One unified block: the c+ extraction (tiers 0–2, F included) plus the three
/// raw jet coefficients the identities cannot reconstruct (tier 3, order-3
/// evaluation).
#[derive(Clone, Debug)]
pub struct UnifiedBlock {
    /// A, B, D, A', D', F — the c-augmented Möbius extraction (prefix slots
    /// 0–5).
    pub m: MobiusCPlus,
    /// Raw slots 6–8: a₃₀, a₁₂, a₀₃ (degree ≤ 3 completion).
    pub a30: CFe,
    pub a12: CFe,
    pub a03: CFe,
}

impl UnifiedBlock {
    pub fn from_jet(jet: &JetF64) -> UnifiedBlock {
        UnifiedBlock {
            m: mobius_from_jet(jet),
            a30: jet.coeff(3, 0),
            a12: jet.coeff(1, 2),
            a03: jet.coeff(0, 3),
        }
    }

    /// §11 identity reconstructions for the jet tier (F-form; used by
    /// `unified_eval_jet3` — the CPU referee of the GPU register
    /// reconstruction).
    #[allow(dead_code)]
    pub fn a20(&self) -> CFe {
        self.m.d.mul(self.m.a).neg()
    }
    #[allow(dead_code)]
    pub fn a11(&self) -> CFe {
        self.m.ap.sub(self.m.b.mul(self.m.d)).sub(self.m.f.mul(self.m.a))
    }
    #[allow(dead_code)]
    pub fn a21(&self) -> CFe {
        self.m
            .dp
            .mul(self.m.a)
            .neg()
            .sub(self.m.d.mul(self.a11()))
            .add(self.m.f.mul(self.m.d).mul(self.m.a))
    }
    /// a₀₂ = −F·B (exact when F is live; the c₀₁ = 0 fallback keeps F = 0 and
    /// the moduli stage then leaves the raw a₀₂ slot as a live REST term for
    /// the jet tier — sound, just not reconstructed).
    #[allow(dead_code)]
    pub fn a02(&self) -> CFe {
        self.m.f.mul(self.m.b).neg()
    }
}

/// Build-only per-block sidecar, extracted while the full jet is alive (the
/// radii stage must never need the jet back — design D9): the 27 coefficient
/// moduli for the jet-tier (V) machinery, and the compensated-remainder moduli
/// of BOTH rational extractions for the (V)+closed-form radii.
#[derive(Clone)]
pub struct UnifiedModuli {
    /// log2 |a_ij| in monomial order (jet tier bounds).
    pub log2_a: [f64; JET_NCOEFF],
    /// c+ q moduli (constructed zeros at −∞).
    pub log2_q_cplus: [f64; JET_NCOEFF],
    /// Plain-Möbius (Padé) q moduli — q₁₁/q₂₁ survive (the spurious terms).
    pub log2_q_plain: [f64; JET_NCOEFF],
}

pub struct UnifiedLevel {
    pub skip: usize,
    pub blocks: Vec<UnifiedBlock>,
    pub moduli: Vec<UnifiedModuli>,
}

/// Constructed-zero q indices per extraction (their rounding residue would
/// only pollute REST — same discipline as the mobius build). q₀₂ is only a
/// constructed zero when F is live — `q_moduli` keeps it as a REST term on the
/// c₀₁ = 0 fallback (F = 0), mirroring `block_from_jet`.
const Q_ZEROS_CPLUS: [(usize, usize); 6] = [(1, 0), (0, 1), (2, 0), (1, 1), (0, 2), (2, 1)];
const Q_ZEROS_PLAIN: [(usize, usize); 3] = [(1, 0), (0, 1), (2, 0)];

fn q_moduli(jet: &JetF64, m: &MobiusCPlus, zeros: &[(usize, usize)]) -> [f64; JET_NCOEFF] {
    let mut out = [f64::NEG_INFINITY; JET_NCOEFF];
    if m.degenerate {
        return out;
    }
    let q = mobius_q(jet, m);
    for (n, v) in q.iter().enumerate() {
        out[n] = v.log2_mag().unwrap_or(f64::NEG_INFINITY);
    }
    for &(i, j) in zeros {
        if (i, j) == (0, 2) && m.f.is_zero() {
            continue;
        }
        out[jet_idx(i, j)] = f64::NEG_INFINITY;
    }
    out
}

fn moduli_from_jet(jet: &JetF64, m: &MobiusCPlus) -> UnifiedModuli {
    let mut log2_a = [f64::NEG_INFINITY; JET_NCOEFF];
    for (n, &(i, j)) in JET_MONOMIALS.iter().enumerate() {
        log2_a[n] = jet
            .coeff(i as usize, j as usize)
            .log2_mag()
            .unwrap_or(f64::NEG_INFINITY);
    }
    let plain = mobius_from_jet_plain(jet);
    UnifiedModuli {
        log2_a,
        log2_q_cplus: q_moduli(jet, m, &Q_ZEROS_CPLUS),
        log2_q_plain: q_moduli(jet, &plain, &Q_ZEROS_PLAIN),
    }
}

/// Build every merge-tree level (skip 1 up to `max_skip`) extracting the
/// unified record AND the build-only moduli sidecar per block; the full jets
/// are a streaming build-only tool, exactly like `mobius_build_levels`. Block
/// geometry matches the BLA scaffold (slot s of a level covers `skip` steps
/// applied from ref index 1 + s·skip). This is the ONE build the whole table
/// derives from (design D1).
pub fn build_unified_levels(orbit: &[(f64, f64)], max_skip: usize) -> Vec<UnifiedLevel> {
    // Levels below the emit floor are never serialized (MOBIUS_MIN_EMIT_SKIP)
    // and never dispatched — extracting their blocks/moduli only feeds the
    // bounds walks and radii scans with dead work (~75 % of all blocks live at
    // skip 1–2). Keep the level ENTRY (index alignment with the merge chain)
    // but leave it empty; every downstream stage then costs zero there.
    let extract = |jets: &[JetF64], skip: usize| -> UnifiedLevel {
        if skip < MOBIUS_MIN_EMIT_SKIP {
            return UnifiedLevel { skip, blocks: Vec::new(), moduli: Vec::new() };
        }
        let blocks: Vec<UnifiedBlock> = jets.iter().map(UnifiedBlock::from_jet).collect();
        let moduli = jets
            .iter()
            .zip(blocks.iter())
            .map(|(jet, b)| moduli_from_jet(jet, &b.m))
            .collect();
        UnifiedLevel { skip, blocks, moduli }
    };
    let orbit_len = orbit.len();
    let mut out = Vec::new();
    if orbit_len < 3 {
        return out;
    }
    let mut prev: Vec<JetF64> =
        (1..orbit_len).map(|i| jet_seed(orbit[i].0, orbit[i].1)).collect();
    out.push(extract(&prev, 1));
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
        out.push(extract(&cur, skip));
        prev = cur;
    }
    out
}

// ── tiered radii stage (task 2.2, design D4) ───────────────────────────────────

/// §12-style closed-form radius oracle. It only sees the stored low-degree q
/// moduli, so it deliberately omits the Cauchy tail and is NOT a certificate.
/// It remains useful for diagnostics, but must never enlarge a runtime radius.
/// The proposed radius is the largest x with
/// Σ_ij |q_ij|·x^i·y^j ≤ ε·(|A|·x + |B|·y), y = c_max, capped by the pole
/// bound (|D| + |D'|·y)·x + |F|·y ≤ ¼ (den = 1 + De·z + F·c: the DEN budget
/// loses the x-independent |F|·y slice up front). Descending scan (0.25 log2
/// steps, first success from above).
pub fn closed_form_radius(
    m: &MobiusCPlus,
    log2_q: &[f64; JET_NCOEFF],
    eps: f64,
    log2_cmax: f64,
) -> f64 {
    if m.degenerate {
        return f64::NEG_INFINITY;
    }
    let l2a = m.a.log2_mag().unwrap_or(f64::NEG_INFINITY);
    let l2b = m.b.log2_mag().unwrap_or(f64::NEG_INFINITY);
    if !l2a.is_finite() {
        return f64::NEG_INFINITY;
    }
    let l2eps = eps.log2() - 1.0;
    let l2d = m.d.log2_mag().unwrap_or(f64::NEG_INFINITY);
    let l2dp_y = m.dp.log2_mag().unwrap_or(f64::NEG_INFINITY) + log2_cmax;
    let l2_deff = lse2_pair(l2d, l2dp_y);
    let Some(l2_quarter) = pole_budget_log2(m, log2_cmax) else {
        return f64::NEG_INFINITY;
    };
    let pole_cap = if l2_deff.is_finite() { l2_quarter - l2_deff } else { 0.0 };
    scan_first_success(pole_cap.min(-1.0), |lx| {
        let l2s = lse2_pair(l2a + lx, l2b + log2_cmax);
        let mut rest = f64::NEG_INFINITY;
        for (n, &(i, j)) in JET_MONOMIALS.iter().enumerate() {
            if log2_q[n].is_finite() {
                rest = lse2_pair(rest, log2_q[n] + i as f64 * lx + j as f64 * log2_cmax);
            }
        }
        rest - l2s <= l2eps
    })
}

/// (V′) derivative radius (Phase B). The tier evaluator's own ∂z is exact for
/// its form, so the derivative error is the differentiated remainder series:
/// for polynomial tiers |∂z(Φ − f̃)| ≤ Σ i·|q_ij|·x^(i−1)·y^j; for rational
/// tiers the quotient rule adds the DEN corrections, bounded under the pole
/// cap |De|·x + |F|·y ≤ ¼ (DEN ≥ ¾) by
/// (4/3)·Σ i·|q|·x^(i−1)·y^j + (16/9)·|De|·Σ|q|·x^i·y^j.
/// Condition (V′): that ≤ ½ε·(|A| + |A′|·y) — the multiplier scale, the same
/// c-channel-inclusive lesson as (V)'s value scale. Descending scan as (V).
/// `rational` selects the DEN corrections; polynomial tiers skip the pole cap.
pub fn derivative_radius(
    m: &MobiusCPlus,
    log2_q: &[f64; JET_NCOEFF],
    eps: f64,
    log2_cmax: f64,
    rational: bool,
) -> f64 {
    if m.degenerate {
        return f64::NEG_INFINITY;
    }
    let l2a = m.a.log2_mag().unwrap_or(f64::NEG_INFINITY);
    if !l2a.is_finite() {
        return f64::NEG_INFINITY;
    }
    let l2ap_y = m.ap.log2_mag().unwrap_or(f64::NEG_INFINITY) + log2_cmax;
    let l2scale = lse2_pair(l2a, l2ap_y);
    let l2eps = eps.log2() - 1.0;
    let l2d = m.d.log2_mag().unwrap_or(f64::NEG_INFINITY);
    let l2dp_y = m.dp.log2_mag().unwrap_or(f64::NEG_INFINITY) + log2_cmax;
    let l2_deff = lse2_pair(l2d, l2dp_y);
    let four_thirds = (4.0f64 / 3.0).log2();
    let top = if rational {
        let Some(l2_quarter) = pole_budget_log2(m, log2_cmax) else {
            return f64::NEG_INFINITY;
        };
        if l2_deff.is_finite() {
            (l2_quarter - l2_deff).min(-1.0)
        } else {
            -1.0
        }
    } else {
        -1.0
    };
    scan_first_success(top, |lx| {
        let mut restd = f64::NEG_INFINITY; // Σ i·|q|·x^(i−1)·y^j
        let mut rest = f64::NEG_INFINITY; // Σ |q|·x^i·y^j (rational DEN term)
        for (n, &(i, j)) in JET_MONOMIALS.iter().enumerate() {
            if log2_q[n].is_finite() {
                if i >= 1 {
                    restd = lse2_pair(
                        restd,
                        log2_q[n] + (i as f64).log2() + (i as f64 - 1.0) * lx
                            + j as f64 * log2_cmax,
                    );
                }
                if rational {
                    rest = lse2_pair(
                        rest,
                        log2_q[n] + i as f64 * lx + j as f64 * log2_cmax,
                    );
                }
            }
        }
        let bound = if rational {
            lse2_pair(restd + four_thirds, l2_deff + rest + 2.0 * four_thirds)
        } else {
            restd
        };
        bound <= l2eps + l2scale
    })
}

/// ∂Φ/∂z of the order-3 jet-tier evaluation — the CPU referee of the GPU's
/// register partials (shares the P_i rows with `unified_eval_jet3`).
#[allow(dead_code)]
pub fn unified_eval_jet3_dz(blk: &UnifiedBlock, z: CFe, c: CFe) -> CFe {
    let a20 = blk.a20();
    let a11 = blk.a11();
    let a21 = blk.a21();
    let c2 = c.mul(c);
    let p1 = blk.m.a.add(a11.mul(c)).add(blk.a12.mul(c2));
    let p2 = a20.add(a21.mul(c));
    let two_p2 = CFe { x: 2.0 * p2.x, y: 2.0 * p2.y, e: p2.e };
    let three_p3 = CFe { x: 3.0 * blk.a30.x, y: 3.0 * blk.a30.y, e: blk.a30.e };
    p1.add(two_p2.add(three_p3.mul(z)).mul(z))
}

/// Descending first-success-from-above scan, coarse-to-fine: bracket with
/// 4-log2 steps, refine at 0.25 inside the bracket. ~11× fewer condition
/// evaluations than a flat 0.25 scan; conservative on non-monotone conditions
/// (a missed finer success above the coarse bracket only shrinks the radius —
/// soundness is per-returned-x, verified by the exact-stepping referees).
fn scan_first_success(top: f64, cond: impl Fn(f64) -> bool) -> f64 {
    const COARSE: f64 = 4.0;
    const FINE: f64 = 0.25;
    let mut lx = top;
    while lx > -160.0 {
        if cond(lx) {
            // Refine upward inside (lx, lx + COARSE).
            let mut best = lx;
            let mut probe = lx + COARSE - FINE;
            while probe > lx {
                if cond(probe) {
                    best = probe;
                    break;
                }
                probe -= FINE;
            }
            return best.min(top);
        }
        lx -= COARSE;
    }
    f64::NEG_INFINITY
}

/// log2 of the DEN pole budget left for the z-channel: ¼ − |F|·c_max
/// (den = 1 + De·z + F·c ⇒ DEN ≥ 1 − |De|·x − |F|·y ≥ ¾ under the cap; the
/// |F|·y slice is x-independent, so it comes off the budget up front). None
/// when that slice alone exhausts it — no x can hold the pole bound.
fn pole_budget_log2(m: &MobiusCPlus, log2_cmax: f64) -> Option<f64> {
    let l2f_y = m.f.log2_mag().unwrap_or(f64::NEG_INFINITY) + log2_cmax;
    let fy = if l2f_y > -1074.0 { l2f_y.exp2() } else { 0.0 };
    let quarter = 0.25 - fy;
    if quarter > 0.0 {
        Some(quarter.log2())
    } else {
        None
    }
}

fn lse2_pair(a: f64, b: f64) -> f64 {
    let hi = a.max(b);
    if !hi.is_finite() {
        return hi;
    }
    let lo = a.min(b);
    hi + (1.0 + (lo - hi).exp2()).log2()
}

/// Synthetic mobius-level views over the unified table, feeding the existing
/// (V) bounds/radius machinery unchanged (design D1: one build, derived tiers).
fn to_mobius_levels(levels: &[UnifiedLevel], plain: bool) -> Vec<MobiusLevel> {
    levels
        .iter()
        .map(|lvl| MobiusLevel {
            skip: lvl.skip,
            blocks: lvl
                .blocks
                .iter()
                .zip(lvl.moduli.iter())
                .map(|(b, md)| {
                    let mut m = b.m;
                    let log2_q = if plain {
                        m.ap = CFe::ZERO;
                        m.dp = CFe::ZERO;
                        m.f = CFe::ZERO;
                        md.log2_q_plain
                    } else {
                        md.log2_q_cplus
                    };
                    MobiusBlock { m, log2_q }
                })
                .collect(),
        })
        .collect()
}

/// Tier index order: [affine, Padé, c+, jet]. (Consumed by the CPU harnesses
/// and the 2.5+ runtime plumbing; the build itself is tier-agnostic.)
#[allow(dead_code)]
pub const TIER_AFFINE: usize = 0;
#[allow(dead_code)]
pub const TIER_PADE: usize = 1;
#[allow(dead_code)]
pub const TIER_CPLUS: usize = 2;
#[allow(dead_code)]
pub const TIER_JET: usize = 3;

pub struct UnifiedRadii {
    /// Per level, per slot: log2 EFFECTIVE radius per tier — min(value r,
    /// derivative r′). This pipeline propagates the derivative unconditionally
    /// (relief/DE shading, AA targets), so honest-der radii are always on
    /// (design D5 amended: no DE cache key).
    pub tiers: Vec<Vec<[f64; 4]>>,
    /// Raw (V′) derivative radii per tier (diagnostics + tests).
    pub tiers_der: Vec<Vec<[f64; 4]>>,
    /// Raw value radii per tier (diagnostics: der-limited ⇔ r′ < r_value).
    pub tiers_value: Vec<Vec<[f64; 4]>>,
    /// Blocks where the tail-free oracle would exceed the (V) radius, per
    /// rational tier. Diagnostic only: these proposed boosts are never applied.
    pub boost_pade: usize,
    pub boost_cplus: usize,
}

/// Bounds stage (R_c-headroom-keyed, design D9): the expensive walks — the two
/// mobius bisected-majorant tables AND the per-block jet (V) candidates — with
/// no ε dependence. A radii re-solve (ε or in-headroom c_max change) never
/// re-runs these.
pub struct UnifiedBounds {
    pub cplus: MobiusBoundsTable,
    pub plain: MobiusBoundsTable,
    pub jet: Vec<Vec<JetBlockBounds>>,
}

pub fn unified_build_bounds(
    levels: &[UnifiedLevel],
    orbit: &[(f64, f64)],
    log2_c_max: f64,
) -> UnifiedBounds {
    let mlv = to_mobius_levels(levels, false);
    let plv = to_mobius_levels(levels, true);
    let twoz: Vec<(f64, i64)> = orbit
        .iter()
        .map(|&(zx, zy)| sfe_norm(2.0 * (zx * zx + zy * zy).sqrt(), 0))
        .collect();
    let jet = levels
        .iter()
        .map(|lvl| {
            (0..lvl.blocks.len())
                .map(|s| {
                    let first = 1 + s * lvl.skip;
                    jet_block_bounds_moduli(
                        &lvl.moduli[s].log2_a,
                        &twoz[first..first + lvl.skip],
                        log2_c_max + 10.0,
                    )
                })
                .collect()
        })
        .collect();
    UnifiedBounds {
        cplus: mobius_build_bounds(&mlv, orbit, log2_c_max),
        plain: mobius_build_bounds(&plv, orbit, log2_c_max),
        jet,
    }
}

/// Radii stage ((ε, c_max)-keyed, pure log2 solving): per block, the four tier
/// radii — all four from rule (V). The tail-free closed-form oracle is recorded
/// as a diagnostic only: it cannot extend a runtime radius without a Cauchy
/// tail. No cross-tier clamping: each radius is individually sound for its own
/// evaluator, and the dispatch tag points at a tier whose OWN radius covers.
pub fn unified_solve_radii(
    levels: &[UnifiedLevel],
    bounds: &UnifiedBounds,
    eps: f64,
    log2_c_max: f64,
) -> UnifiedRadii {
    let mlv = to_mobius_levels(levels, false);
    let plv = to_mobius_levels(levels, true);
    let r_cv = mobius_build_radii(&mlv, &bounds.cplus, eps, log2_c_max);
    let r_pv = mobius_build_radii(&plv, &bounds.plain, eps, log2_c_max);
    let rd_cv = mobius_build_derivative_radii(&mlv, &bounds.cplus, eps, log2_c_max);
    let rd_pv = mobius_build_derivative_radii(&plv, &bounds.plain, eps, log2_c_max);
    let mut boost_pade = 0usize;
    let mut boost_cplus = 0usize;
    let mut tiers: Vec<Vec<[f64; 4]>> = Vec::with_capacity(levels.len());
    let mut tiers_der: Vec<Vec<[f64; 4]>> = Vec::with_capacity(levels.len());
    let mut tiers_value: Vec<Vec<[f64; 4]>> = Vec::with_capacity(levels.len());
    for (li, lvl) in levels.iter().enumerate() {
        let mut row = Vec::with_capacity(lvl.blocks.len());
        let mut row_der = Vec::with_capacity(lvl.blocks.len());
        let mut row_value = Vec::with_capacity(lvl.blocks.len());
        for s in 0..lvl.blocks.len() {
            let rj = jet_solve_radii(&bounds.jet[li][s], eps, log2_c_max);
            let blk = &lvl.blocks[s];
            let md = &lvl.moduli[s];
            let plain_m = {
                let mut m = blk.m;
                m.ap = CFe::ZERO;
                m.dp = CFe::ZERO;
                m.f = CFe::ZERO;
                m
            };
            let cf_p = closed_form_radius(&plain_m, &md.log2_q_plain, eps, log2_c_max);
            let cf_c = closed_form_radius(&blk.m, &md.log2_q_cplus, eps, log2_c_max);
            if cf_p > r_pv[li][s] {
                boost_pade += 1;
            }
            if cf_c > r_cv[li][s] {
                boost_cplus += 1;
            }
            let value = [rj[0], r_pv[li][s], r_cv[li][s], rj[2]];
            // (V′): per-tier remainder moduli — affine drops only its two
            // exact slots; jet drops the whole stored degree ≤ 3 prefix,
            // EXCEPT a₀₂ on the c₀₁ = 0 fallback (F = 0): the register
            // reconstruction a₀₂ = −F·B then misses the raw coefficient, so
            // it stays a live REST term.
            let mut q_aff = md.log2_a;
            q_aff[jet_idx(1, 0)] = f64::NEG_INFINITY;
            q_aff[jet_idx(0, 1)] = f64::NEG_INFINITY;
            let mut q_jet = md.log2_a;
            for (n, &(i, j)) in JET_MONOMIALS.iter().enumerate() {
                if (i, j) == (0, 2) && blk.m.b.is_zero() {
                    continue;
                }
                if (i as usize) + (j as usize) <= 3 {
                    q_jet[n] = f64::NEG_INFINITY;
                }
            }
            let der = [
                derivative_radius(&plain_m, &q_aff, eps, log2_c_max, false),
                rd_pv[li][s],
                rd_cv[li][s],
                derivative_radius(&blk.m, &q_jet, eps, log2_c_max, false),
            ];
            row.push([
                value[0].min(der[0]),
                value[1].min(der[1]),
                value[2].min(der[2]),
                value[3].min(der[3]),
            ]);
            row_der.push(der);
            row_value.push(value);
        }
        tiers.push(row);
        tiers_der.push(row_der);
        tiers_value.push(row_value);
    }
    UnifiedRadii { tiers, tiers_der, tiers_value, boost_pade, boost_cplus }
}

/// Convenience wrapper (tests, one-shot harnesses): both stages back to back.
#[allow(dead_code)] // one-shot convenience for tests/harnesses
pub fn unified_build_radii(
    levels: &[UnifiedLevel],
    orbit: &[(f64, f64)],
    eps: f64,
    c_max: f64,
) -> UnifiedRadii {
    let l2c = c_max.log2();
    let bounds = unified_build_bounds(levels, orbit, l2c);
    unified_solve_radii(levels, &bounds, eps, l2c)
}

/// Order-3 jet-tier evaluation from the unified record (prefix + identities):
/// Φ = Σ_{i+j≤3} a_ij·z^i·c^j. The GPU path mirrors this exactly — it reads the
/// 9-slot record and reconstructs a20/a11/a21 in registers.
#[allow(dead_code)] // GPU-parity referee; consumed by the 2.6 shader harness
pub fn unified_eval_jet3(blk: &UnifiedBlock, z: CFe, c: CFe) -> CFe {
    let a20 = blk.a20();
    let a11 = blk.a11();
    let a21 = blk.a21();
    let a02 = blk.a02();
    let z2 = z.mul(z);
    let c2 = c.mul(c);
    // Row grouping P_i(c) = Σ_j a_ij c^j, Φ = Σ_i P_i·z^i (same shape as
    // jet_eval's Horner rows).
    let p0 = blk.m.b.mul(c).add(a02.mul(c2)).add(blk.a03.mul(c2).mul(c));
    let p1 = blk.m.a.add(a11.mul(c)).add(blk.a12.mul(c2));
    let p2 = a20.add(a21.mul(c));
    let p3 = blk.a30;
    p0.add(p1.mul(z)).add(p2.add(p3.mul(z)).mul(z2))
}

// ── certified series approximation (Phase C, design D6) ─────────────────────────

/// SA stored order (bound side) and applied order (shipped polynomial).
pub const SA_STORED: usize = 8;
pub const SA_APPLIED: usize = 4;

/// Certified common prefix skip: every pixel of the tile starts at iteration
/// `n0` with δ = Σ_{j=1..4} b_j·dc^j (and ∂δ/∂c = Σ j·b_j·dc^(j−1)) instead of
/// iterating the prefix — the historical series approximation, glitch-free
/// because the radius is certified (findings §16).
#[derive(Clone, Debug)]
pub struct SaPrefix {
    pub n0: usize,
    /// b₁..b₄ — the applied-order coefficients at n0.
    pub b: [CFe; SA_APPLIED],
}

/// Build the certified SA prefix: walk the orbit maintaining the pure-c jet
/// b'_j = 2Z·b_j + Σ_{k} b_k·b_{j−k} (+1 on b₁, stored order 8) alongside
/// 1-variable majorant walks ρ ← |2Z|·ρ + ρ² + R_c (from ρ = 0) on a ladder of
/// anisotropy rungs R_c = s·c_max, s ∈ {1e2..1e12} (large s — the θ^J lesson).
/// n0 = last n where condition (V_c) holds at y = c_max on some rung:
///   Σ_{j=5..8} |b_j|·y^j  +  M·θ^(J+1)/(1−θ)  ≤  ½ε·|b₁|·y,   θ = y/R_c
/// AND the no-early-escape guard |Z_n| + ρ ≤ 1.9 (a pixel cannot escape inside
/// the certified prefix, so skipping to n0 cannot jump an escape).
pub fn sa_build(orbit: &[(f64, f64)], eps: f64, c_max: f64, max_n: usize) -> SaPrefix {
    const RUNGS: [f64; 6] = [1e2, 1e4, 1e6, 1e8, 1e10, 1e12];
    let l2eps_half = eps.log2() - 1.0;
    let l2y = c_max.log2();
    let max_n = max_n.min(orbit.len().saturating_sub(1));
    let mut b = [CFe::ZERO; SA_STORED];
    let mut rho: [CFe; RUNGS.len()] = [CFe::ZERO; RUNGS.len()];
    let mut best = SaPrefix { n0: 0, b: [CFe::ZERO; SA_APPLIED] };
    for n in 0..max_n {
        let (zx, zy) = orbit[n];
        let two_z = CFe::from_c(2.0 * zx, 2.0 * zy);
        // Jet step (order 8, exact truncation of the pure-c series).
        let mut nb = [CFe::ZERO; SA_STORED];
        for j in (1..=SA_STORED).rev() {
            let mut v = two_z.mul(b[j - 1]);
            for k in 1..j {
                v = v.add(b[k - 1].mul(b[j - k - 1]));
            }
            if j == 1 {
                v = v.add(CFe::ONE);
            }
            nb[j - 1] = v;
        }
        b = nb;
        // Majorant walks per rung.
        let two_z_mag = fe_exp2((4.0 * (zx * zx + zy * zy)).max(1e-300).log2() * 0.5);
        for (g, r) in rho.iter_mut().enumerate() {
            let rc = fe_exp2(l2y + RUNGS[g].log2());
            *r = two_z_mag.mul(*r).add(r.mul(*r)).add(rc);
        }
        // Condition (V_c) at n+1, best rung.
        let l2b1 = b[0].log2_mag().unwrap_or(f64::NEG_INFINITY);
        if !l2b1.is_finite() {
            continue;
        }
        let scale = l2eps_half + l2b1 + l2y;
        let mut stored = f64::NEG_INFINITY;
        for j in (SA_APPLIED + 1)..=SA_STORED {
            let l = b[j - 1].log2_mag().unwrap_or(f64::NEG_INFINITY);
            stored = lse2_pair(stored, l + j as f64 * l2y);
        }
        let zmag = (zx * zx + zy * zy).sqrt();
        let mut ok = false;
        for (g, r) in rho.iter().enumerate() {
            let l2rc = l2y + RUNGS[g].log2();
            let theta = l2y - l2rc;
            let l2m = r.log2_mag().unwrap_or(f64::NEG_INFINITY);
            if !l2m.is_finite() || l2m > 20.0 {
                continue; // saturated walk
            }
            // No-early-escape guard: |Z| + ρ ≤ 1.9 for this rung's bound.
            let rho_lin = if l2m < 0.9 { l2m.exp2() } else { f64::INFINITY };
            if zmag + rho_lin > 1.9 {
                continue;
            }
            let queue = l2m + (SA_STORED as f64 + 1.0) * theta
                - (1.0 - theta.exp2()).max(1e-12).log2();
            if lse2_pair(stored, queue) <= scale {
                ok = true;
                break;
            }
        }
        if ok {
            best = SaPrefix { n0: n + 1, b: [b[0], b[1], b[2], b[3]] };
        } else if best.n0 > 0 && n + 1 > best.n0 + 64 {
            // The profile collapsed 64 steps ago (first quasi-critical
            // passage): later recoveries would skip OVER the passage with a
            // stale bound — stop at the certified prefix.
            break;
        }
    }
    best
}

/// Diagnostic r_c(N) profile: the largest certified log2 |c| at sampled N
/// (locates the first quasi-critical passage — findings §16).
#[allow(dead_code)]
pub fn sa_profile(orbit: &[(f64, f64)], eps: f64, samples: &[usize]) -> Vec<(usize, f64)> {
    samples
        .iter()
        .map(|&n| {
            let (mut lo, mut hi) = (-160.0f64, -1.0f64); // log2 c bisection
            for _ in 0..24 {
                let mid = 0.5 * (lo + hi);
                if sa_build(orbit, eps, mid.exp2(), n).n0 >= n {
                    lo = mid;
                } else {
                    hi = mid;
                }
            }
            (n, lo)
        })
        .collect()
}

// ── interior/periodic regime (Phase E, design D8, findings §17) ─────────────────

/// Longest reference period the build will detect.
#[allow(dead_code)] // runtime path is disabled pending a full tail certificate
pub const PERIODIC_MAX_P: usize = 512;

/// The composed period block Φ_p in c+ form, with its certified entry radius:
/// for a pixel in the periodic phase, Φ_p is a FIXED Möbius map of the delta —
/// fixed points ζ±, multiplier κ — giving a certified interiority verdict at
/// cost O(p) instead of maxiter (|κ| is the pixel's own cycle multiplier).
#[derive(Clone, Debug)]
pub struct PeriodicBlock {
    pub start: usize,
    pub p: usize,
    pub m: MobiusCPlus,
    /// Certified entry radius, log2 |δ| — min of the value (V-style closed
    /// form) and derivative (V′) radii: κ is a derivative object.
    pub log2_r: f64,
}

/// Detect reference periodicity after the transient (sustained |Z_{k+p} − Z_k|
/// < 1e-12 through the orbit tail) and compose Φ_p from p seed jets at the
/// earliest converged phase. None for escaping/aperiodic references.
#[allow(dead_code)] // retained for the CPU model test while runtime is disabled
pub fn periodic_build(orbit: &[(f64, f64)], eps: f64, log2_cmax: f64) -> Option<PeriodicBlock> {
    const TOL2: f64 = 1e-24;
    let n = orbit.len();
    if n < 256 {
        return None;
    }
    let last = n - 1;
    let mut period = 0usize;
    'outer: for p in 1..=PERIODIC_MAX_P.min((n / 4).max(1)) {
        let window = (2 * p).min(last - p);
        for k in 0..window {
            let a = orbit[last - k];
            let b = orbit[last - p - k];
            let (dx, dy) = (a.0 - b.0, a.1 - b.1);
            if dx * dx + dy * dy >= TOL2 {
                continue 'outer;
            }
        }
        period = p;
        break;
    }
    if period == 0 {
        return None;
    }
    // Earliest start where the periodicity is already converged below tol.
    let mut start = last - period;
    while start > 1 {
        let a = orbit[start - 1];
        let b = orbit[start - 1 + period];
        let (dx, dy) = (a.0 - b.0, a.1 - b.1);
        if dx * dx + dy * dy >= TOL2 {
            break;
        }
        start -= 1;
    }
    if start + period >= n {
        return None;
    }
    // Compose Φ_p at phase `start` (seeds start..start+p−1: δ ← 2Z_i·δ + δ² + c).
    // c+ F-form: the runtime fixed points come from
    // De·δ² + (1 + F·c − Ae)·δ − B·c = 0 with den = 1 + De·δ + F·c.
    let mut jet = jet_seed(orbit[start].0, orbit[start].1);
    for i in (start + 1)..(start + period) {
        jet = crate::jet::jet_compose(&jet, &jet_seed(orbit[i].0, orbit[i].1));
    }
    let m = mobius_from_jet(&jet);
    if m.degenerate {
        return None;
    }
    let q = q_moduli(&jet, &m, &Q_ZEROS_CPLUS);
    // The interiority verdict does not need ε-exact VALUES — it needs κ and
    // the basin geometry accurate enough that the runtime margins (|κ| < 0.98,
    // |w₀| < 0.5) dominate, and the contraction amortizes the per-block error
    // (findings §17: total err ≤ err_block/(1−|κ|); κ measured exact to 4
    // decimals at |c| = 1e-5 with err_block ~1e-5). Certify at ε_int = 1e-4.
    let eps_int = eps.max(1e-4);
    let r = closed_form_radius(&m, &q, eps_int, log2_cmax);
    let rd = derivative_radius(&m, &q, eps_int, log2_cmax, true);
    let log2_r = r.min(rd);
    if !log2_r.is_finite() {
        return None;
    }
    Some(PeriodicBlock { start, p: period, m, log2_r })
}

// ── GPU serialization (task 2.3, designs D2/D3) ─────────────────────────────────

/// Slots per shipped coefficient record: the prefix-ordered
/// [A, B, D, A′, D′, F, a₃₀, a₁₂, a₀₃] — 108 B at 12 B/coefficient. Tier
/// prefix reads: affine 24 B, Padé 36 B, c+ 72 B, jet 108 B (the jet tier
/// reconstructs a₀₂ = −F·B in registers).
pub const UNIFIED_GPU_COEFFS: usize = 9;

/// GPU radius sidecar entry, 16 B vec4-packed (one coalesced probe): x = the
/// TAGGED tier's certified radius (log2, f32; −∞ ⇒ never applied), y = tier
/// tag (0/1/2/3 = affine/Padé/c+/jet, exactly representable), z = f32-safe
/// fast-path flag, w = spare (reserved: Phase B stores min(r, r′) in x when DE
/// is enabled — same probe, zero extra comparisons).
#[repr(C)]
#[derive(Copy, Clone, Debug, PartialEq)]
pub struct UnifiedRadius {
    pub r_log2: f32,
    pub tag: f32,
    pub f32_safe: f32,
    pub pad: f32,
}

/// Tag rule (design D3 + census note 5): the cheapest tier whose OWN radius
/// covers the working band; when no tier covers the band, fall back to the
/// tier with the largest radius (usually jet) so the block still serves
/// entries below its radius instead of dying at the band boundary.
pub fn unified_tag(tiers: &[f64; 4], log2_band: f64) -> Option<usize> {
    for (t, &r) in tiers.iter().enumerate() {
        if log2_band < r {
            return Some(t);
        }
    }
    let (mut best, mut best_r) = (None, f64::NEG_INFINITY);
    for (t, &r) in tiers.iter().enumerate() {
        if r.is_finite() && r > best_r {
            best = Some(t);
            best_r = r;
        }
    }
    best
}

fn unified_f32_safe(md: &UnifiedModuli, m: &MobiusCPlus) -> bool {
    // Every degree ≤ 3 modulus (stored slots AND identity-reconstructed ones)
    // must reconstruct inside the f32 range with Horner headroom — plus F
    // itself (a shipped slot the fast path reconstructs, a RATIO of jet
    // coefficients the moduli don't cover).
    let f_ok = match m.f.log2_mag() {
        None => true,
        Some(l) => l.abs() <= MOBIUS_F32_SAFE_LOG2,
    };
    f_ok && JET_MONOMIALS.iter().enumerate().all(|(n, &(i, j))| {
        if (i as usize) + (j as usize) > 3 {
            return true;
        }
        let l = md.log2_a[n];
        !l.is_finite() || l.abs() <= MOBIUS_F32_SAFE_LOG2
    })
}

/// Serialize the emitted (skip ≥ 4) levels' coefficient records, index-aligned
/// with `unified_serialize_radii`'s sidecar.
pub fn unified_serialize_coeffs(levels: &[UnifiedLevel]) -> Vec<[JetCoeffFe; UNIFIED_GPU_COEFFS]> {
    let mut out = Vec::new();
    for lvl in levels {
        if lvl.skip < MOBIUS_MIN_EMIT_SKIP {
            continue;
        }
        for b in &lvl.blocks {
            out.push([
                cfe_to_coeff(&b.m.a),
                cfe_to_coeff(&b.m.b),
                cfe_to_coeff(&b.m.d),
                cfe_to_coeff(&b.m.ap),
                cfe_to_coeff(&b.m.dp),
                cfe_to_coeff(&b.m.f),
                cfe_to_coeff(&b.a30),
                cfe_to_coeff(&b.a12),
                cfe_to_coeff(&b.a03),
            ]);
        }
    }
    out
}

/// Serialize the sidecar (tagged radius + tag + f32-safe) and the level
/// directory. `log2_band` is the working band the tags are chosen at — the
/// caller derives it from the replay-observed |dz| distribution (census note
/// 5), NOT from a fixed c_max multiple. When `sa` or `periodic` is present, a
/// TEN-entry header follows the block sidecar (base = total block count,
/// computable in the shader from the last directory entry):
///   [0..4) SA prefix: entry j = (b_{j+1}.x, .y, exponent, j == 0 ? n0 : 0)
///   [4..10) periodic block: A(.., start), B(.., p), D(.., r_log2), A'(.., 0),
///          D'(.., 0), F(.., 0) — p == 0 in entry 5's w disables the runtime
///          attempt.
pub fn unified_serialize_radii(
    levels: &[UnifiedLevel],
    radii: &UnifiedRadii,
    log2_band: f64,
    sa: Option<&SaPrefix>,
    periodic: Option<&PeriodicBlock>,
) -> (Vec<UnifiedRadius>, Vec<JetLevel>) {
    let mut out = Vec::new();
    let mut dir = Vec::new();
    for (li, lvl) in levels.iter().enumerate() {
        if lvl.skip < MOBIUS_MIN_EMIT_SKIP {
            continue;
        }
        let offset = out.len() as u32;
        let mut max_r = f32::NEG_INFINITY;
        for (s, md) in lvl.moduli.iter().enumerate() {
            let tiers = &radii.tiers[li][s];
            let entry = match unified_tag(tiers, log2_band) {
                None => UnifiedRadius {
                    r_log2: f32::NEG_INFINITY,
                    tag: 0.0,
                    f32_safe: 0.0,
                    pad: 0.0,
                },
                Some(tag) => UnifiedRadius {
                    r_log2: tiers[tag] as f32,
                    tag: tag as f32,
                    f32_safe: if unified_f32_safe(md, &lvl.blocks[s].m) { 1.0 } else { 0.0 },
                    pad: 0.0,
                },
            };
            max_r = max_r.max(entry.r_log2);
            out.push(entry);
        }
        dir.push(JetLevel {
            offset,
            count: lvl.blocks.len() as u32,
            skip: lvl.skip as u32,
            max_r3_log2: max_r,
        });
    }
    if sa.is_some() || periodic.is_some() {
        let zero = CFe::ZERO;
        let sab = sa.map(|s| s.b).unwrap_or([zero; SA_APPLIED]);
        let n0 = sa.map(|s| s.n0).unwrap_or(0);
        for (j, b) in sab.iter().enumerate() {
            let c = cfe_to_coeff(b);
            out.push(UnifiedRadius {
                r_log2: c.x,
                tag: c.y,
                f32_safe: c.e as f32,
                pad: if j == 0 { n0 as f32 } else { 0.0 },
            });
        }
        let pm = periodic.map(|p| p.m).unwrap_or(MobiusCPlus {
            a: zero, b: zero, d: zero, ap: zero, dp: zero, f: zero, degenerate: true,
        });
        let metas = [
            periodic.map(|p| p.start as f32).unwrap_or(0.0),
            periodic.map(|p| p.p as f32).unwrap_or(0.0),
            periodic.map(|p| p.log2_r as f32).unwrap_or(f32::NEG_INFINITY),
            0.0,
            0.0,
            0.0,
        ];
        for (j, coef) in [pm.a, pm.b, pm.d, pm.ap, pm.dp, pm.f].iter().enumerate() {
            let c = cfe_to_coeff(coef);
            out.push(UnifiedRadius {
                r_log2: c.x,
                tag: c.y,
                f32_safe: c.e as f32,
                pad: metas[j],
            });
        }
    }
    (out, dir)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::jet::{jet_compose, jet_eval, jet_seed};
    use crate::mobius::{mobius_build_levels_with, mobius_from_jet_plain};

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

    fn rel_err(got: CFe, want: CFe) -> f64 {
        let (gx, gy) = got.to_f64();
        let (wx, wy) = want.to_f64();
        let d = ((gx - wx).powi(2) + (gy - wy).powi(2)).sqrt();
        let m = (wx * wx + wy * wy).sqrt();
        if m == 0.0 {
            d
        } else {
            d / m
        }
    }

    #[test]
    fn unified_identities_reconstruct_the_jet() {
        // (task 2.1, F-form) On every block of every test orbit: a20 = −D·A,
        // a11 = A' − B·D − F·A, a21 = −D'·A − D·a11 + F·D·A and a02 = −F·B
        // reproduce the source jet's raw coefficients to ~1e-11 at operand
        // scale — the record's identity-reconstruction invariant.
        for (name, cx, cy) in [
            ("seahorse", -0.743643887037151_f64, 0.131825904205330_f64),
            ("near-parab", -0.7499, 0.0001),
            ("feigenbaum", -1.401155, 0.0),
        ] {
            let orbit = ref_orbit_f64(cx, cy, 512);
            assert!(orbit.len() > 512, "[{}] escaped", name);
            // Walk the same streaming compose the builder uses, keeping the
            // full jet next to the extracted record.
            let mut prev: Vec<JetF64> =
                (1..orbit.len()).map(|i| jet_seed(orbit[i].0, orbit[i].1)).collect();
            let mut skip = 1usize;
            loop {
                for jet in &prev {
                    let blk = UnifiedBlock::from_jet(jet);
                    if blk.m.degenerate {
                        continue;
                    }
                    // Error is measured against the identity's OPERAND scale, not
                    // the result: the chains cancel (e.g. c21 = −D'·A − D·c11
                    // with both terms ≥ |c21|), which is what the f32 GPU
                    // reconstruction sees too. At operand scale the identities
                    // hold to round-off.
                    let mag = |v: CFe| {
                        let (x, y) = v.to_f64();
                        (x * x + y * y).sqrt()
                    };
                    for (what, got, want, scale) in [
                        ("a20", blk.a20(), jet.coeff(2, 0), mag(blk.a20())),
                        (
                            "a11",
                            blk.a11(),
                            jet.coeff(1, 1),
                            mag(blk.m.ap)
                                .max(mag(blk.m.b.mul(blk.m.d)))
                                .max(mag(blk.m.f.mul(blk.m.a))),
                        ),
                        (
                            "a21",
                            blk.a21(),
                            jet.coeff(2, 1),
                            mag(blk.m.dp.mul(blk.m.a))
                                .max(mag(blk.m.d.mul(blk.a11())))
                                .max(mag(blk.m.f.mul(blk.m.d).mul(blk.m.a))),
                        ),
                        ("a02", blk.a02(), jet.coeff(0, 2), mag(blk.a02())),
                    ] {
                        let (gx, gy) = got.to_f64();
                        let (wx, wy) = want.to_f64();
                        let d = ((gx - wx).powi(2) + (gy - wy).powi(2)).sqrt();
                        let s = scale.max(mag(want)).max(1e-300);
                        // ~1e-11 at operand scale: the a21 chain stacks 4 CFe
                        // operations; a few dozen ulps of f64, four orders
                        // below the f32 mantissa the GPU reconstruction keeps.
                        assert!(
                            d / s < 1e-11,
                            "[{} skip {}] {} reconstruction off by {:e} at operand scale",
                            name, skip, what, d / s
                        );
                    }
                }
                if skip >= 256 || prev.len() < 2 {
                    break;
                }
                prev = (0..prev.len() / 2)
                    .map(|i| jet_compose(&prev[2 * i], &prev[2 * i + 1]))
                    .collect();
                skip *= 2;
            }
        }
    }

    #[test]
    fn unified_radii_sound_and_boost_measured() {
        // (task 2.2) Per-tier soundness vs exact stepping: entries sampled
        // below each tier's radius — INCLUDING closed-form-boosted Padé/c+
        // radii — propagated by the tier's own evaluator stay within the ε
        // error-scale budget against exact perturbation stepping through the
        // same block steps. The closed-form boost count is the spec's
        // tightness diagnostic.
        use crate::mobius::mobius_apply;
        let eps = 1e-12_f64;
        for (name, cx, cy) in [
            ("seahorse", -0.743643887037151_f64, 0.131825904205330_f64),
            ("near-parab", -0.7499, 0.0001),
            ("feigenbaum", -1.401155, 0.0),
        ] {
            let orbit = ref_orbit_f64(cx, cy, 1024);
            assert!(orbit.len() > 1024, "[{}] escaped", name);
            let levels = build_unified_levels(&orbit, 1 << 18);
            for c_max in [1e-9_f64, 1e-14] {
                let rad = unified_build_radii(&levels, &orbit, eps, c_max);
                println!(
                    "[{} c_max={:e}] closed-form boosts: padé {} c+ {}",
                    name, c_max, rad.boost_pade, rad.boost_cplus
                );
                let mag = |v: CFe| {
                    let (a, b) = v.to_f64();
                    (a * a + b * b).sqrt()
                };
                let mut checked = 0usize;
                for (li, lvl) in levels.iter().enumerate() {
                    if lvl.skip < 4 {
                        continue;
                    }
                    for s in (0..lvl.blocks.len()).step_by(7) {
                        let blk = &lvl.blocks[s];
                        if blk.m.degenerate {
                            continue;
                        }
                        let first = 1 + s * lvl.skip;
                        for tier in 0..4usize {
                            let r = rad.tiers[li][s][tier];
                            if !r.is_finite() {
                                continue;
                            }
                            for (back, phase) in [(0.11_f64, 0.3_f64), (2.3, 2.1)] {
                                let x = (r - back).exp2();
                                if !(x.is_finite() && x > 0.0) {
                                    continue;
                                }
                                let scale = mag(blk.m.a) * x + mag(blk.m.b) * c_max;
                                if !scale.is_finite() {
                                    continue; // top-level |A| overflows f64 — unsampleable
                                }
                                let z = (x * phase.cos(), x * phase.sin());
                                let c = (c_max * 1.9_f64.cos(), c_max * 1.9_f64.sin());
                                // Exact perturbation stepping through the block.
                                let (mut wx, mut wy) = z;
                                for j in first..first + lvl.skip {
                                    let (zx2, zy2) = orbit[j];
                                    let m2 =
                                        (2.0 * (zx2 * wx - zy2 * wy), 2.0 * (zx2 * wy + zy2 * wx));
                                    let sq = (wx * wx - wy * wy, 2.0 * wx * wy);
                                    wx = m2.0 + sq.0 + c.0;
                                    wy = m2.1 + sq.1 + c.1;
                                }
                                let zfe = CFe::from_c(z.0, z.1);
                                let cfe = CFe::from_c(c.0, c.1);
                                let got = match tier {
                                    TIER_AFFINE => blk.m.a.mul(zfe).add(blk.m.b.mul(cfe)),
                                    TIER_PADE => {
                                        let mut m = blk.m;
                                        m.ap = CFe::ZERO;
                                        m.dp = CFe::ZERO;
                                        m.f = CFe::ZERO;
                                        mobius_apply(&m, zfe, cfe).0
                                    }
                                    TIER_CPLUS => mobius_apply(&blk.m, zfe, cfe).0,
                                    _ => unified_eval_jet3(blk, zfe, cfe),
                                };
                                let (gx, gy) = got.to_f64();
                                let err =
                                    ((gx - wx).powi(2) + (gy - wy).powi(2)).sqrt();
                                checked += 1;
                                assert!(
                                    err <= 5.0 * eps * scale,
                                    "[{} c_max={:e}] level {} slot {} tier {}: err {:e} > 5ε·scale {:e} at r−{}",
                                    name, c_max, li, s, tier, err, 5.0 * eps * scale, back
                                );
                            }
                        }
                    }
                }
                println!("[{} c_max={:e}] soundness samples: {}", name, c_max, checked);
                assert!(checked > 100, "[{} c_max={:e}] too few samples", name, c_max);
            }
        }
    }

    #[test]
    fn unified_serialization_round_trip() {
        // (task 2.3) Emitted levels are skip ≥ 4; coefficient records and the
        // sidecar stay index-aligned through the directory; the record
        // preserves the prefix order exactly (deterministic cfe_to_coeff);
        // the tag is the cheapest band-covering tier with the argmax fallback
        // for band-dead-but-alive blocks; degenerate blocks ship r = −∞.
        let eps = 1e-12_f64;
        let c_max = 1e-14_f64;
        let orbit = ref_orbit_f64(-1.401155, 0.0, 1024);
        assert!(orbit.len() > 1024, "reference escaped");
        let levels = build_unified_levels(&orbit, 1 << 18);
        let rad = unified_build_radii(&levels, &orbit, eps, c_max);
        let band = c_max.log2() + 10.0;
        let coeffs = unified_serialize_coeffs(&levels);
        let (sidecar, dir) = unified_serialize_radii(&levels, &rad, band, None, None);
        assert_eq!(coeffs.len(), sidecar.len(), "buffers not index-aligned");
        let emitted: Vec<usize> = levels
            .iter()
            .enumerate()
            .filter(|(_, l)| l.skip >= MOBIUS_MIN_EMIT_SKIP)
            .map(|(i, _)| i)
            .collect();
        assert_eq!(dir.len(), emitted.len(), "directory misses emitted levels");
        let (mut covered, mut fallback, mut dead) = (0usize, 0usize, 0usize);
        for (d, &li) in dir.iter().zip(emitted.iter()) {
            let lvl = &levels[li];
            assert_eq!(d.skip as usize, lvl.skip);
            assert_eq!(d.count as usize, lvl.blocks.len());
            for s in 0..lvl.blocks.len() {
                let idx = d.offset as usize + s;
                let rec = &coeffs[idx];
                let side = &sidecar[idx];
                let blk = &lvl.blocks[s];
                // Prefix order, exact deterministic round-trip.
                let want = [
                    &blk.m.a, &blk.m.b, &blk.m.d, &blk.m.ap, &blk.m.dp, &blk.m.f,
                    &blk.a30, &blk.a12, &blk.a03,
                ];
                for (k, w) in want.iter().enumerate() {
                    assert_eq!(
                        rec[k],
                        crate::jet::cfe_to_coeff(w),
                        "level {} slot {} coeff {} not prefix-ordered",
                        li, s, k
                    );
                }
                // Tag rule + radius f32 rounding + sentinels.
                let tiers = &rad.tiers[li][s];
                match unified_tag(tiers, band) {
                    None => {
                        dead += 1;
                        assert_eq!(side.r_log2, f32::NEG_INFINITY);
                    }
                    Some(t) => {
                        if (band as f64) < tiers[t] {
                            covered += 1;
                        } else {
                            fallback += 1;
                        }
                        assert_eq!(side.tag, t as f32, "tag mismatch");
                        assert_eq!(side.r_log2, tiers[t] as f32, "radius rounding");
                    }
                }
                if blk.m.degenerate {
                    assert_eq!(side.r_log2, f32::NEG_INFINITY, "degenerate must be dead");
                }
            }
        }
        println!(
            "round-trip: {} band-covered, {} argmax-fallback, {} dead blocks",
            covered, fallback, dead
        );
        assert!(covered > 0, "no band-covered blocks — band or radii broken");
    }

    #[test]
    fn unified_derivative_radii_sound() {
        // (Phase B, tasks 3.1-3.3) (V′) coverage: entries sampled below each
        // tier's EFFECTIVE radius (min(r, r′)) propagated by the tier's own ∂z
        // stay within the ε derivative-scale budget against exact derivative
        // stepping ((∂z chain) dδ' = (2Z + 2δ)·dδ) — including quasi-critical
        // blocks. Also prints the honest-DE shrink diagnostic (r′ < r counts),
        // the 3.4 field-round input.
        use crate::mobius::mobius_apply;
        let eps = 1e-12_f64;
        for (name, cx, cy) in [
            ("seahorse", -0.743643887037151_f64, 0.131825904205330_f64),
            ("near-parab", -0.7499, 0.0001),
            ("feigenbaum", -1.401155, 0.0),
        ] {
            let orbit = ref_orbit_f64(cx, cy, 1024);
            assert!(orbit.len() > 1024, "[{}] escaped", name);
            let levels = build_unified_levels(&orbit, 1 << 18);
            for c_max in [1e-9_f64, 1e-14] {
                let rad = unified_build_radii(&levels, &orbit, eps, c_max);
                let mag = |v: CFe| {
                    let (a, b) = v.to_f64();
                    (a * a + b * b).sqrt()
                };
                let mut checked = 0usize;
                let mut der_limited = [0usize; 4];
                let mut der_dead = [0usize; 4];
                let mut finite = [0usize; 4];
                for (li, lvl) in levels.iter().enumerate() {
                    if lvl.skip < 4 {
                        continue;
                    }
                    for sidx in (0..lvl.blocks.len()).step_by(7) {
                        let blk = &lvl.blocks[sidx];
                        if blk.m.degenerate {
                            continue;
                        }
                        let first = 1 + sidx * lvl.skip;
                        for tier in 0..4usize {
                            let r_eff = rad.tiers[li][sidx][tier];
                            let r_der = rad.tiers_der[li][sidx][tier];
                            let r_val = rad.tiers_value[li][sidx][tier];
                            if r_val.is_finite() {
                                finite[tier] += 1;
                                if !r_der.is_finite() {
                                    der_dead[tier] += 1; // (V′) kills the tier here
                                } else if r_der < r_val - 1e-9 {
                                    der_limited[tier] += 1; // honest-DE shrink
                                }
                            }
                            if !r_eff.is_finite() {
                                continue;
                            }
                            for (back, phase) in [(0.11_f64, 0.7_f64), (2.0, 2.6)] {
                                let x = (r_eff - back).exp2();
                                if !(x.is_finite() && x > 0.0) {
                                    continue;
                                }
                                let der_scale = mag(blk.m.a) + mag(blk.m.ap) * c_max;
                                if !der_scale.is_finite() {
                                    continue;
                                }
                                let z = (x * phase.cos(), x * phase.sin());
                                let c = (c_max * 0.4_f64.cos(), c_max * 0.4_f64.sin());
                                // Exact value + ∂z propagation through the block.
                                let (mut wx, mut wy) = z;
                                let (mut dx, mut dy) = (1.0_f64, 0.0_f64);
                                for j in first..first + lvl.skip {
                                    let (zx2, zy2) = orbit[j];
                                    let (mx, my) = (zx2 + wx, zy2 + wy);
                                    let nd = (
                                        2.0 * (mx * dx - my * dy),
                                        2.0 * (mx * dy + my * dx),
                                    );
                                    let m2 = (
                                        2.0 * (zx2 * wx - zy2 * wy),
                                        2.0 * (zx2 * wy + zy2 * wx),
                                    );
                                    let sq = (wx * wx - wy * wy, 2.0 * wx * wy);
                                    wx = m2.0 + sq.0 + c.0;
                                    wy = m2.1 + sq.1 + c.1;
                                    dx = nd.0;
                                    dy = nd.1;
                                }
                                let zfe = CFe::from_c(z.0, z.1);
                                let cfe = CFe::from_c(c.0, c.1);
                                let got = match tier {
                                    TIER_AFFINE => blk.m.a,
                                    TIER_PADE => {
                                        let mut m = blk.m;
                                        m.ap = CFe::ZERO;
                                        m.dp = CFe::ZERO;
                                        m.f = CFe::ZERO;
                                        mobius_apply(&m, zfe, cfe).1
                                    }
                                    TIER_CPLUS => mobius_apply(&blk.m, zfe, cfe).1,
                                    _ => unified_eval_jet3_dz(blk, zfe, cfe),
                                };
                                let (gx, gy) = got.to_f64();
                                let err = ((gx - dx).powi(2) + (gy - dy).powi(2)).sqrt();
                                checked += 1;
                                assert!(
                                    err <= 5.0 * eps * der_scale,
                                    "[{} c_max={:e}] level {} slot {} tier {}: der err {:e} > 5ε·scale {:e} at r−{}",
                                    name, c_max, li, sidx, tier, err, 5.0 * eps * der_scale, back
                                );
                            }
                        }
                    }
                }
                println!(
                    "[{} c_max={:e}] der soundness: {} samples | of {:?} value-alive blocks per tier: der-limited {:?}, der-DEAD {:?}",
                    name, c_max, checked, finite, der_limited, der_dead
                );
                assert!(checked > 100, "[{} c_max={:e}] too few samples", name, c_max);
            }
        }
    }

    #[test]
    fn sa_prefix_certified_and_profile() {
        // (Phase C, task 4.1) Soundness: δ(dc) from the SA polynomial at n0
        // matches exact prefix iteration 0..n0 within ε·|b₁|·|dc| for |dc| at
        // c_max, sampled phases — measured pattern ~0.003·ε. The derivative
        // seed Σ j·b_j·dc^(j−1) matches exact ∂c stepping too. And the r_c(N)
        // profile collapses at the first quasi-critical passage (diagnostic).
        let eps = 1e-12_f64;
        for (name, cx, cy, cmaxes) in [
            ("seahorse", -0.743643887037151_f64, 0.131825904205330_f64, [1e-14_f64, 1e-9]),
            ("near-parab", -0.7499, 0.0001, [1e-14, 1e-9]),
            ("feigenbaum", -1.401155, 0.0, [1e-14, 1e-9]),
        ] {
            let orbit = ref_orbit_f64(cx, cy, 2500);
            assert!(orbit.len() > 2500, "[{}] escaped", name);
            for c_max in cmaxes {
                let sa = sa_build(&orbit, eps, c_max, 2500);
                println!("[{} c_max={:e}] SA n0 = {}", name, c_max, sa.n0);
                if sa.n0 == 0 {
                    continue; // nothing certified at this scale — allowed
                }
                let mag = |v: CFe| {
                    let (a, b) = v.to_f64();
                    (a * a + b * b).sqrt()
                };
                for phase in [0.3_f64, 2.0, 4.4] {
                    let dc = (c_max * phase.cos(), c_max * phase.sin());
                    // Exact prefix iteration + ∂c chain.
                    let (mut wx, mut wy) = (0.0_f64, 0.0);
                    let (mut dx, mut dy) = (0.0_f64, 0.0);
                    for j in 0..sa.n0 {
                        let (zx2, zy2) = orbit[j];
                        let (mx, my) = (zx2 + wx, zy2 + wy);
                        let nd = (2.0 * (mx * dx - my * dy) + 1.0, 2.0 * (mx * dy + my * dx));
                        let m2 = (2.0 * (zx2 * wx - zy2 * wy), 2.0 * (zx2 * wy + zy2 * wx));
                        let sq = (wx * wx - wy * wy, 2.0 * wx * wy);
                        wx = m2.0 + sq.0 + dc.0;
                        wy = m2.1 + sq.1 + dc.1;
                        dx = nd.0;
                        dy = nd.1;
                    }
                    // SA polynomial + its ∂c.
                    let dcfe = CFe::from_c(dc.0, dc.1);
                    let mut v = CFe::ZERO;
                    let mut d = CFe::ZERO;
                    for j in (1..=SA_APPLIED).rev() {
                        v = v.add(sa.b[j - 1]).mul(dcfe);
                        let jb = CFe {
                            x: j as f64 * sa.b[j - 1].x,
                            y: j as f64 * sa.b[j - 1].y,
                            e: sa.b[j - 1].e,
                        };
                        if j > 1 {
                            d = d.add(jb).mul(dcfe);
                        } else {
                            d = d.add(jb);
                        }
                    }
                    let (vx, vy) = v.to_f64();
                    let scale = eps * mag(sa.b[0]) * c_max;
                    let err = ((vx - wx).powi(2) + (vy - wy).powi(2)).sqrt();
                    assert!(
                        err <= 5.0 * scale,
                        "[{} c_max={:e}] SA value err {:e} > 5ε·scale {:e} at n0={}",
                        name, c_max, err, 5.0 * scale, sa.n0
                    );
                    let (gx, gy) = d.to_f64();
                    let derr = ((gx - dx).powi(2) + (gy - dy).powi(2)).sqrt();
                    let dscale = eps * mag(sa.b[0]).max(1e-300);
                    assert!(
                        derr <= 50.0 * dscale,
                        "[{} c_max={:e}] SA der err {:e} > 50ε·|b1| {:e}",
                        name, c_max, derr, 50.0 * dscale
                    );
                }
            }
        }
        // Profile diagnostic: seahorse r_c(N) collapses across the first
        // quasi-critical passage (findings: 3.5e-8 at N=50 → far smaller later).
        let orbit = ref_orbit_f64(-0.743643887037151, 0.131825904205330, 1700);
        let prof = sa_profile(&orbit, 1e-12, &[50, 400, 1600]);
        println!("seahorse r_c(N) profile (log2): {:?}", prof);
        assert!(
            prof[0].1 > prof[2].1 + 3.0,
            "profile did not collapse across the passage: {:?}",
            prof
        );
    }

    #[test]
    #[ignore] // timing diagnostic, run on demand: cargo test --release -- --ignored unified_build_budget
    fn unified_build_budget() {
        // (Phase F pulled forward) Wall-clock breakdown of the unified build at
        // a realistic deep orbit length — the 4.3 field spec showed the table
        // arriving AFTER convergence (zero applications) at seahorse 1e-10.
        use std::time::Instant;
        let orbit = ref_orbit_f64(-0.743643887037151, 0.131825904205330, 40_000);
        let eps = 1e-12_f64;
        let c_max = 1e-10_f64;
        let t0 = Instant::now();
        let levels = build_unified_levels(&orbit, 1 << 18);
        let t_levels = t0.elapsed();
        let t1 = Instant::now();
        let bounds = unified_build_bounds(&levels, &orbit, c_max.log2());
        let t_bounds = t1.elapsed();
        let t2 = Instant::now();
        let rad = unified_solve_radii(&levels, &bounds, eps, c_max.log2());
        let t_radii = t2.elapsed();
        let t3 = Instant::now();
        let sa = sa_build(&orbit, eps, c_max, orbit.len() - 1);
        let t_sa = t3.elapsed();
        let t4 = Instant::now();
        let periodic = periodic_build(&orbit, eps, c_max.log2());
        let t_periodic = t4.elapsed();
        let t5 = Instant::now();
        let (side, dir) = unified_serialize_radii(
            &levels,
            &rad,
            c_max.log2() + 10.0,
            Some(&sa),
            periodic.as_ref(),
        );
        let t_serialize = t5.elapsed();
        let nblocks: usize = levels.iter().map(|l| l.blocks.len()).sum();
        println!(
            "unified build @40k ({} blocks): levels {:?} | bounds {:?} | radii {:?} | sa {:?} (n0={}) | periodic {:?} | serialize {:?} ({} entries, {} levels) | total {:?}",
            nblocks, t_levels, t_bounds, t_radii, t_sa, sa.n0, t_periodic, t_serialize,
            side.len(), dir.len(), t0.elapsed()
        );

        // Same breakdown at the ENGINE's live configuration (ε = 1e-3 default,
        // c_max = 4·scale): the radii scan cost depends on (ε, c_max), so the
        // interactive keyframe budget must be measured at the shipped values.
        let eps_gpu = 1e-3_f64;
        let l2c_gpu = (1e-10_f64).log2() + 2.0;
        let tb = Instant::now();
        let bounds_gpu = unified_build_bounds(&levels, &orbit, l2c_gpu);
        let tb_bounds = tb.elapsed();
        let tr = Instant::now();
        let rad_gpu = unified_solve_radii(&levels, &bounds_gpu, eps_gpu, l2c_gpu);
        let tr_radii = tr.elapsed();
        let ts = Instant::now();
        let sa_gpu = sa_build(&orbit, eps_gpu, l2c_gpu.exp2(), orbit.len() - 1);
        let ts_sa = ts.elapsed();
        let _ = rad_gpu;
        println!(
            "unified build @40k GPU-config (eps 1e-3, c_max 4e-10): bounds {:?} | radii {:?} | sa {:?} (n0={})",
            tb_bounds, tr_radii, ts_sa, sa_gpu.n0
        );
    }

    #[test]
    #[ignore] // GPU-config sidecar dump, run on demand
    fn unified_sidecar_dump_gpu_config() {
        // Replicates the engine's exact deep-seahorse configuration (ε = 1e-3
        // default, c_max = 4·scale at 1e-10) and dumps the serialized sidecar
        // the GPU sees: per-level finite/tag histogram + a few sample entries.
        let orbit = ref_orbit_f64(-0.743643887037151, 0.131825904205330, 5000);
        let eps = 1e-3_f64;
        let l2c = (1e-10_f64).log2() + 2.0;
        let levels = build_unified_levels(&orbit, 1 << 18);
        let bounds = unified_build_bounds(&levels, &orbit, l2c);
        let rad = unified_solve_radii(&levels, &bounds, eps, l2c);
        let sa = sa_build(&orbit, eps, l2c.exp2(), orbit.len() - 1);
        let (side, dir) = unified_serialize_radii(&levels, &rad, l2c + 10.0, Some(&sa), None);
        println!("SA n0 = {}", sa.n0);
        for d in &dir {
            let mut finite = 0usize;
            let mut tags = [0usize; 4];
            for k in 0..d.count as usize {
                let e = &side[d.offset as usize + k];
                if e.r_log2.is_finite() && e.r_log2 > -3.0e38 {
                    finite += 1;
                    tags[e.tag as usize] += 1;
                }
            }
            println!(
                "level skip {:>5}: {}/{} finite, tags {:?}, maxR3 {:.1}",
                d.skip, finite, d.count, tags, d.max_r3_log2
            );
        }
        // Sample a few entries of the skip-16 level.
        if let Some(d) = dir.iter().find(|d| d.skip == 16) {
            for k in (0..d.count as usize).step_by((d.count as usize / 6).max(1)) {
                let e = &side[d.offset as usize + k];
                println!("  skip16 slot {}: r={:.1} tag={} f32safe={}", k, e.r_log2, e.tag, e.f32_safe);
            }
        }
    }

    #[test]
    #[ignore] // needle build-latency probe, run on demand (release!)
    fn unified_needle_build_budget() {
        use std::time::Instant;
        for n in [10_000usize, 50_000, 100_000] {
            let orbit = ref_orbit_f64(-2.0, 0.0, n);
            let eps = 1e-3_f64;
            let l2c = (1e-32_f64).log2() + 2.0;
            let t0 = Instant::now();
            let levels = build_unified_levels(&orbit, 1 << 18);
            let t_levels = t0.elapsed();
            let t1 = Instant::now();
            let bounds = unified_build_bounds(&levels, &orbit, l2c);
            let t_bounds = t1.elapsed();
            let t2 = Instant::now();
            let rad = unified_solve_radii(&levels, &bounds, eps, l2c);
            let t_radii = t2.elapsed();
            let t3 = Instant::now();
            let sa = sa_build(&orbit, eps, l2c.exp2(), orbit.len() - 1);
            let t_sa = t3.elapsed();
            println!(
                "needle build @{}: levels {:?} | bounds {:?} | radii {:?} | sa {:?} (n0={}) | total {:?}",
                n, t_levels, t_bounds, t_radii, t_sa, sa.n0, t0.elapsed()
            );
            let _ = rad;
        }
    }

    #[test]
    #[ignore] // needle (c = −2) zero-application diagnostic, run on demand
    fn unified_needle_diag() {
        // Antenna-tip repro: center −2, scale 1e-32 ⇒ ε = 1e-3,
        // log2 c_max = log2(scale) + 2 (engine defaults). The reference orbit
        // is 0, −2, 2, 2, 2, … (repelling fixed point, |2Z| = 4 constant).
        let orbit = ref_orbit_f64(-2.0, 0.0, 4096);
        assert!(orbit.len() > 4096, "needle reference escaped?!");
        let eps = 1e-3_f64;
        let scale = 1e-32_f64;
        let l2c = scale.log2() + 2.0;
        println!("l2c = {l2c:.2}, band = {:.2}", l2c + 10.0);
        let levels = build_unified_levels(&orbit, 1 << 18);
        let bounds = unified_build_bounds(&levels, &orbit, l2c);
        let rad = unified_solve_radii(&levels, &bounds, eps, l2c);
        println!("boosts: padé {} c+ {}", rad.boost_pade, rad.boost_cplus);
        for (li, lvl) in levels.iter().enumerate() {
            if lvl.skip < MOBIUS_MIN_EMIT_SKIP {
                continue;
            }
            let s = 0usize;
            let v = &rad.tiers_value[li][s];
            let d = &rad.tiers_der[li][s];
            let e = &rad.tiers[li][s];
            println!(
                "skip {:>5} slot0: value [{:>8.1} {:>8.1} {:>8.1} {:>8.1}] der [{:>8.1} {:>8.1} {:>8.1} {:>8.1}] eff [{:>8.1} {:>8.1} {:>8.1} {:>8.1}] degen={}",
                lvl.skip, v[0], v[1], v[2], v[3], d[0], d[1], d[2], d[3],
                e[0], e[1], e[2], e[3], lvl.blocks[s].m.degenerate
            );
            // Jet-tier gate internals for the small levels.
            if lvl.skip <= 32 {
                let b = &bounds.jet[li][s];
                println!(
                    "        jet bounds: a10 {:.1} a01 {:.1} min2z {:.1} a0 {:?}",
                    b.log2_a10, b.log2_a01, b.log2_min_2z,
                    b.log2_a0.iter().map(|x| (x * 10.0).round() / 10.0).collect::<Vec<_>>()
                );
                for (g, c) in b.cand.iter().enumerate().take(3) {
                    println!(
                        "        cand {}: rz {:.1} rc {:.1} M {:.1} Mc {:.1} T {:?}",
                        g, c.log2_rz, c.log2_rc, c.log2_m, c.log2_mc,
                        c.log2_t.iter().map(|x| (x * 10.0).round() / 10.0).collect::<Vec<_>>()
                    );
                }
            }
        }
        // SA prefix.
        let sa = sa_build(&orbit, eps, l2c.exp2(), orbit.len() - 1);
        println!("SA n0 = {}", sa.n0);
        // Exact perturbation walk for an edge pixel: log2 |dz_n|.
        let dc = (scale, 0.0_f64);
        let (mut wx, mut wy) = (0.0_f64, 0.0_f64);
        let mut log2_dz = Vec::new();
        for n in 1..=80 {
            let (zx, zy) = orbit[n - 1];
            let m2 = (2.0 * (zx * wx - zy * wy), 2.0 * (zx * wy + zy * wx));
            let sq = (wx * wx - wy * wy, 2.0 * wx * wy);
            wx = m2.0 + sq.0 + dc.0;
            wy = m2.1 + sq.1 + dc.1;
            log2_dz.push((n, 0.5 * (wx * wx + wy * wy).log2()));
        }
        println!("log2|dz_n| (n, l2): {:?}", &log2_dz[..12]);
        println!("… {:?}", &log2_dz[48..60]);
        // Runtime dispatch mirror (greedy largest skip, tagged radius, band
        // tags as serialized): count applications per tier.
        let band = l2c + 10.0;
        let (side, dir) = unified_serialize_radii(&levels, &rad, band, None, None);
        let mut tier_apps = [0usize; 4];
        let mut skipped = 0usize;
        let max_iter = orbit.len() - 1;
        let (mut wx, mut wy) = (0.0_f64, 0.0_f64);
        let mut ref_i = 0usize;
        let mut iter = 0usize;
        while iter < max_iter {
            let mut applied = false;
            if ref_i > 0 {
                let shifted = ref_i - 1;
                let dz2 = wx * wx + wy * wy;
                let l2dz = if dz2 > 0.0 { 0.5 * dz2.log2() } else { f64::NEG_INFINITY };
                for d in dir.iter().rev() {
                    let skip = d.skip as usize;
                    if shifted % skip != 0 {
                        continue;
                    }
                    let slot = shifted / skip;
                    if slot >= d.count as usize || ref_i + skip > max_iter {
                        continue;
                    }
                    let e = &side[d.offset as usize + slot];
                    if !(l2dz < e.r_log2 as f64) {
                        continue;
                    }
                    // Apply with the tagged tier (CPU referee evaluators).
                    let li = levels.iter().position(|l| l.skip == skip).unwrap();
                    let blk = &levels[li].blocks[slot];
                    let zfe = CFe::from_c(wx, wy);
                    let cfe = CFe::from_c(dc.0, dc.1);
                    let tag = e.tag as usize;
                    let phi = match tag {
                        TIER_AFFINE => blk.m.a.mul(zfe).add(blk.m.b.mul(cfe)),
                        TIER_PADE => {
                            let mut m = blk.m;
                            m.ap = CFe::ZERO;
                            m.dp = CFe::ZERO;
                            m.f = CFe::ZERO;
                            crate::mobius::mobius_apply(&m, zfe, cfe).0
                        }
                        TIER_CPLUS => crate::mobius::mobius_apply(&blk.m, zfe, cfe).0,
                        _ => unified_eval_jet3(blk, zfe, cfe),
                    };
                    let (nx, ny) = phi.to_f64();
                    let zi = orbit[ref_i + skip];
                    let cz = (zi.0 + nx, zi.1 + ny);
                    if skip > 1 && cz.0 * cz.0 + cz.1 * cz.1 > 4.0 {
                        continue;
                    }
                    wx = nx;
                    wy = ny;
                    ref_i += skip;
                    iter += skip;
                    tier_apps[tag] += 1;
                    skipped += skip;
                    applied = true;
                    break;
                }
            }
            if !applied {
                let (zx, zy) = orbit[ref_i];
                let m2 = (2.0 * (zx * wx - zy * wy), 2.0 * (zx * wy + zy * wx));
                let sq = (wx * wx - wy * wy, 2.0 * wx * wy);
                wx = m2.0 + sq.0 + dc.0;
                wy = m2.1 + sq.1 + dc.1;
                ref_i += 1;
                iter += 1;
            }
            let fz = (orbit[ref_i].0 + wx, orbit[ref_i].1 + wy);
            if fz.0 * fz.0 + fz.1 * fz.1 > 4.0 {
                break;
            }
        }
        println!(
            "dispatch mirror: iters {} of {}, tier apps {:?}, iterations skipped by blocks {}",
            iter, max_iter, tier_apps, skipped
        );
    }

   #[test]
    fn periodic_interior_model_matches_cycle_multiplier() {
        // CPU model check for the dormant Phase-E path. On the period-2 disk reference
        // C = −1 + 0.1i: detection finds p = 2; the composed block's fixed-
        // Möbius multiplier κ(dc) matches the ANALYTIC cycle multiplier
        // 4·(c + 1) of the pixel's own cycle (findings §17 measured |κ| =
        // 0.4000 here); and the w-conjugated closed form κ^k predicts k
        // periods of block iteration with k-INDEPENDENT error (contraction).
        let eps = 1e-12_f64;
        let c_ref = (-1.0_f64, 0.1_f64);
        let orbit = ref_orbit_f64(c_ref.0, c_ref.1, 4000);
        assert!(orbit.len() > 4000, "reference escaped");
        let c_max = 1e-5_f64;
        let per = periodic_build(&orbit, eps, c_max.log2()).expect("no periodic block");
        assert_eq!(per.p, 2, "period-2 disk must detect p = 2 (got {})", per.p);
        assert!(per.log2_r.is_finite());
        let cm = |a: (f64, f64), b: (f64, f64)| (a.0 * b.0 - a.1 * b.1, a.0 * b.1 + a.1 * b.0);
        let cdiv = |a: (f64, f64), b: (f64, f64)| {
            let d = b.0 * b.0 + b.1 * b.1;
            ((a.0 * b.0 + a.1 * b.1) / d, (a.1 * b.0 - a.0 * b.1) / d)
        };
        let csqrt = |a: (f64, f64)| {
            let r = (a.0 * a.0 + a.1 * a.1).sqrt();
            let re = (0.5 * (r + a.0)).max(0.0).sqrt();
            let im = (0.5 * (r - a.0)).max(0.0).sqrt();
            (re, if a.1 < 0.0 { -im } else { im })
        };
        for phase in [0.4_f64, 1.7, 3.9] {
            let dc = (c_max * phase.cos(), c_max * phase.sin());
            let a = per.m.a.to_f64();
            let b = per.m.b.to_f64();
            let d = per.m.d.to_f64();
            let ap = per.m.ap.to_f64();
            let dp = per.m.dp.to_f64();
            let fco = per.m.f.to_f64();
            let ae = (a.0 + cm(ap, dc).0, a.1 + cm(ap, dc).1);
            let de = (d.0 + cm(dp, dc).0, d.1 + cm(dp, dc).1);
            let bc = cm(b, dc);
            let fc = cm(fco, dc);
            let one_p_fc = (1.0 + fc.0, fc.1);
            // F-form: den = (1 + Fc) + De·z ⇒ De·z² + (1 + Fc − Ae)·z − Bc = 0.
            let u_m_ae = (one_p_fc.0 - ae.0, one_p_fc.1 - ae.1);
            let disc = {
                let t = cm(u_m_ae, u_m_ae);
                let f = cm(de, bc);
                (t.0 + 4.0 * f.0, t.1 + 4.0 * f.1)
            };
            let sq = csqrt(disc);
            let two_de = (2.0 * de.0, 2.0 * de.1);
            let z1 = cdiv(((-u_m_ae.0) + sq.0, (-u_m_ae.1) + sq.1), two_de);
            let z2 = cdiv(((-u_m_ae.0) - sq.0, (-u_m_ae.1) - sq.1), two_de);
            let kappa = |z: (f64, f64)| {
                // m′ = (Ae·(1+Fc) − Bc·De)/den².
                let num = (
                    cm(ae, one_p_fc).0 - cm(bc, de).0,
                    cm(ae, one_p_fc).1 - cm(bc, de).1,
                );
                let den = (one_p_fc.0 + cm(de, z).0, one_p_fc.1 + cm(de, z).1);
                cdiv(num, cm(den, den))
            };
            let (k1, k2) = (kappa(z1), kappa(z2));
            let (za, ka) = if k1.0 * k1.0 + k1.1 * k1.1 < k2.0 * k2.0 + k2.1 * k2.1 {
                (z1, k1)
            } else {
                (z2, k2)
            };
            // Analytic period-2 multiplier of the PIXEL's cycle: 4·(c + 1).
            let c_px = (c_ref.0 + dc.0, c_ref.1 + dc.1);
            let lam = (4.0 * (c_px.0 + 1.0), 4.0 * c_px.1);
            let err = ((ka.0 - lam.0).powi(2) + (ka.1 - lam.1).powi(2)).sqrt()
                / (lam.0 * lam.0 + lam.1 * lam.1).sqrt();
            assert!(
                err < 1e-6,
                "κ = ({:.6}, {:.6}) vs analytic 4(c+1) = ({:.6}, {:.6}): rel err {:e}",
                ka.0, ka.1, lam.0, lam.1, err
            );
            assert!((ka.0 * ka.0 + ka.1 * ka.1).sqrt() < 1.0, "disk pixel must be attracting");
            // Closed form vs block iteration: k periods, k-independent error.
            let zr = if za == z1 { z2 } else { z1 };
            let delta0 = (za.0 + 1e-7, za.1 - 5e-8);
            let w0 = cdiv((delta0.0 - za.0, delta0.1 - za.1), (delta0.0 - zr.0, delta0.1 - zr.1));
            for k in [10usize, 1000] {
                // Iterate the block map exactly (f64 c+ F-form).
                let (mut zx2, mut zy2) = delta0;
                for _ in 0..k {
                    let num = (cm(ae, (zx2, zy2)).0 + bc.0, cm(ae, (zx2, zy2)).1 + bc.1);
                    let den = (
                        one_p_fc.0 + cm(de, (zx2, zy2)).0,
                        one_p_fc.1 + cm(de, (zx2, zy2)).1,
                    );
                    let nz = cdiv(num, den);
                    zx2 = nz.0;
                    zy2 = nz.1;
                }
                // Closed form: w_k = κ^k·w0 → δ_k = (ζa − ζr·w_k)/(1 − w_k).
                let mut wk = w0;
                let mut kp = (1.0_f64, 0.0_f64);
                for _ in 0..k {
                    kp = cm(kp, ka);
                }
                wk = cm(wk, kp);
                let dk = cdiv((za.0 - cm(zr, wk).0, za.1 - cm(zr, wk).1), (1.0 - wk.0, -wk.1));
                let err_k = ((dk.0 - zx2).powi(2) + (dk.1 - zy2).powi(2)).sqrt();
                assert!(
                    err_k < 1e-9,
                    "closed form vs iteration at k={}: err {:e}",
                    k, err_k
                );
            }
        }
        println!(
            "periodic block: start {} p {} r_log2 {:.1}",
            per.start, per.p, per.log2_r
        );
    }

    #[test]
    fn unified_second_derivative_propagation() {
        // (Phase D, task 5.1) The (z′, z″) block-propagation formulas per tier
        // match exact step-by-step chains through the block:
        //   δ′_c  = m_z·δ_c + m_c
        //   δ′_cc = m_zz·δ_c² + 2·m_zc·δ_c + m_cc + m_z·δ_cc
        // with the rational second partials (F-form, den = 1 + De·z + F·c,
        // ∂den/∂c = D′·z + F): m_zz = −2·De·m_z/den,
        // m_cc = −2·(D′·z + F)·m_c/den,
        // m_zc = (A′ − m_c·De − m·D′)/den − m_z·(D′·z + F)/den
        // (affine: all zero; jet: polynomial rows). Exact chain per step:
        // δ_c ← (2Z + 2δ)·δ_c + 1, δ_cc ← 2·δ_c² + (2Z + 2δ)·δ_cc.
        let cm = |a: (f64, f64), b: (f64, f64)| (a.0 * b.0 - a.1 * b.1, a.0 * b.1 + a.1 * b.0);
        let cdiv = |a: (f64, f64), b: (f64, f64)| {
            let d = b.0 * b.0 + b.1 * b.1;
            ((a.0 * b.0 + a.1 * b.1) / d, (a.1 * b.0 - a.0 * b.1) / d)
        };
        let cadd = |a: (f64, f64), b: (f64, f64)| (a.0 + b.0, a.1 + b.1);
        let csub = |a: (f64, f64), b: (f64, f64)| (a.0 - b.0, a.1 - b.1);
        let eps = 1e-12_f64;
        for (name, cx, cy) in [
            ("seahorse", -0.743643887037151_f64, 0.131825904205330_f64),
            ("feigenbaum", -1.401155, 0.0),
        ] {
            let orbit = ref_orbit_f64(cx, cy, 1024);
            assert!(orbit.len() > 1024, "[{}] escaped", name);
            let levels = build_unified_levels(&orbit, 1 << 18);
            let c_max = 1e-9_f64;
            let rad = unified_build_radii(&levels, &orbit, eps, c_max);
            let mut checked = 0usize;
            for (li, lvl) in levels.iter().enumerate() {
                if lvl.skip < 4 {
                    continue;
                }
                for sidx in (0..lvl.blocks.len()).step_by(11) {
                    let blk = &lvl.blocks[sidx];
                    if blk.m.degenerate {
                        continue;
                    }
                    let first = 1 + sidx * lvl.skip;
                    for tier in 0..4usize {
                        let r = rad.tiers[li][sidx][tier];
                        if !r.is_finite() {
                            continue;
                        }
                        let x = (r - 1.0).exp2();
                        if !(x.is_finite() && x > 0.0) {
                            continue;
                        }
                        let z0 = (x * 0.6, -x * 0.5);
                        let c = (c_max * 0.8, c_max * 0.3);
                        // Seeds: nontrivial first/second derivative state.
                        let d0 = (1.3_f64, 0.2_f64);
                        let s0 = (0.4_f64, -0.7_f64);
                        // Exact chains through the block steps.
                        let (mut w, mut dw, mut sw) = (z0, d0, s0);
                        for j in first..first + lvl.skip {
                            let zr = orbit[j];
                            let m2 = (2.0 * (zr.0 + w.0), 2.0 * (zr.1 + w.1));
                            let ndw = cadd(cm(m2, dw), (1.0, 0.0));
                            let nsw = cadd(cm((2.0, 0.0), cm(dw, dw)), cm(m2, sw));
                            let nw = cadd(cadd(cm((2.0, 0.0), cm(zr, w)), cm(w, w)), c);
                            w = nw;
                            dw = ndw;
                            sw = nsw;
                        }
                        // Tier formulas.
                        let a = blk.m.a.to_f64();
                        let b = blk.m.b.to_f64();
                        let d = blk.m.d.to_f64();
                        let ap = blk.m.ap.to_f64();
                        let dp = blk.m.dp.to_f64();
                        let (m_v, m_z, m_c, m_zz, m_zc, m_cc);
                        if tier == TIER_JET {
                            let a20 = blk.a20().to_f64();
                            let a11 = blk.a11().to_f64();
                            let a21 = blk.a21().to_f64();
                            let a02 = blk.a02().to_f64();
                            let a30 = blk.a30.to_f64();
                            let a12 = blk.a12.to_f64();
                            let a03 = blk.a03.to_f64();
                            let c2 = cm(c, c);
                            let p0 = cadd(cadd(cm(b, c), cm(a02, c2)), cm(cm(a03, c2), c));
                            let p1 = cadd(cadd(a, cm(a11, c)), cm(a12, c2));
                            let p2 = cadd(a20, cm(a21, c));
                            m_v = cadd(p0, cm(z0, cadd(p1, cm(z0, cadd(p2, cm(z0, a30))))));
                            m_z = cadd(p1, cm(z0, cadd(cm((2.0, 0.0), p2), cm(z0, cm((3.0, 0.0), a30)))));
                            let q0 = cadd(cadd(b, cm((2.0, 0.0), cm(a02, c))), cm((3.0, 0.0), cm(a03, c2)));
                            let q1 = cadd(a11, cm((2.0, 0.0), cm(a12, c)));
                            m_c = cadd(q0, cm(z0, cadd(q1, cm(z0, a21))));
                            m_zz = cadd(cm((2.0, 0.0), p2), cm((6.0, 0.0), cm(a30, z0)));
                            m_zc = cadd(q1, cm((2.0, 0.0), cm(a21, z0)));
                            m_cc = cadd(
                                cadd(cm((2.0, 0.0), a02), cm((6.0, 0.0), cm(a03, c))),
                                cm((2.0, 0.0), cm(a12, z0)),
                            );
                        } else {
                            let (apx, dpx, fx) = if tier == TIER_CPLUS {
                                (ap, dp, blk.m.f.to_f64())
                            } else {
                                ((0.0, 0.0), (0.0, 0.0), (0.0, 0.0))
                            };
                            let ax = if tier == TIER_AFFINE { a } else { a };
                            let dx2 = if tier == TIER_AFFINE { (0.0, 0.0) } else { d };
                            let ae = cadd(ax, cm(apx, c));
                            let de = cadd(dx2, cm(dpx, c));
                            let bc = cm(b, c);
                            // F-form: den = 1 + De·z + F·c; ∂den/∂c = D'·z + F.
                            let den = cadd(cadd((1.0, 0.0), cm(de, z0)), cm(fx, c));
                            let dcden = cadd(cm(dpx, z0), fx);
                            m_v = cdiv(cadd(cm(ae, z0), bc), den);
                            m_z = cdiv(csub(ae, cm(m_v, de)), den);
                            m_c = cdiv(
                                csub(cadd(cm(apx, z0), b), cm(m_v, dcden)),
                                den,
                            );
                            m_zz = cm((-2.0, 0.0), cdiv(cm(de, m_z), den));
                            m_cc = cm((-2.0, 0.0), cdiv(cm(dcden, m_c), den));
                            m_zc = csub(
                                cdiv(csub(csub(apx, cm(m_c, de)), cm(m_v, dpx)), den),
                                cdiv(cm(m_z, dcden), den),
                            );
                        }
                        let pd = cadd(cm(m_z, d0), m_c);
                        let ps = cadd(
                            cadd(cm(m_zz, cm(d0, d0)), cm((2.0, 0.0), cm(m_zc, d0))),
                            cadd(m_cc, cm(m_z, s0)),
                        );
                        let scale_d = (dw.0 * dw.0 + dw.1 * dw.1).sqrt().max(1e-300);
                        let scale_s = (sw.0 * sw.0 + sw.1 * sw.1).sqrt().max(1e-300);
                        let ed = ((pd.0 - dw.0).powi(2) + (pd.1 - dw.1).powi(2)).sqrt() / scale_d;
                        let es = ((ps.0 - sw.0).powi(2) + (ps.1 - sw.1).powi(2)).sqrt() / scale_s;
                        checked += 1;
                        assert!(
                            ed < 1e-6,
                            "[{} l{} s{} t{}] z' propagation off by {:e}",
                            name, li, sidx, tier, ed
                        );
                        assert!(
                            es < 1e-5,
                            "[{} l{} s{} t{}] z'' propagation off by {:e}",
                            name, li, sidx, tier, es
                        );
                    }
                }
            }
            println!("[{}] second-derivative propagation samples: {}", name, checked);
            assert!(checked > 40, "[{}] too few samples", name);
        }
    }

    #[test]
    fn unified_tiers_match_standalone_builds() {
        // (task 2.1) Tier-coefficient parity: the unified record's prefixes
        // equal the standalone extractions (the full 6-coefficient c+ F-form
        // shared with the standalone mobius mode; plain-Möbius with
        // A' = D' = F = 0 sharing A/B/D), and the order-3 jet-tier evaluation
        // from the record matches jet_eval(·, 3) on sample points to fp
        // round-off.
        let orbit = ref_orbit_f64(-1.401155, 0.0, 512);
        assert!(orbit.len() > 512, "reference escaped");
        let unified = build_unified_levels(&orbit, 1 << 10);
        let cplus = mobius_build_levels_with(&orbit, 1 << 10, false);
        assert_eq!(unified.len(), cplus.len(), "scaffold mismatch");
        // Rebuild the jets once more to compare evaluations (streaming, level
        // by level, same shape as the builder).
        let mut jets: Vec<JetF64> =
            (1..orbit.len()).map(|i| jet_seed(orbit[i].0, orbit[i].1)).collect();
        for (li, (ul, cl)) in unified.iter().zip(cplus.iter()).enumerate() {
            assert_eq!(ul.skip, cl.skip);
            if ul.skip < MOBIUS_MIN_EMIT_SKIP {
                // Sub-emit levels are deliberately empty in the unified build
                // (never serialized/dispatched — dead bounds/radii work);
                // advance the streaming jets and move on.
                assert!(ul.blocks.is_empty(), "sub-emit level not empty");
                if jets.len() >= 2 {
                    jets = (0..jets.len() / 2)
                        .map(|i| jet_compose(&jets[2 * i], &jets[2 * i + 1]))
                        .collect();
                }
                continue;
            }
            assert_eq!(ul.blocks.len(), cl.blocks.len());
            for (s, (ub, cb)) in ul.blocks.iter().zip(cl.blocks.iter()).enumerate() {
                // Full 6-coefficient parity with the standalone c+ build (one
                // shared extraction: `mobius_from_jet`).
                for (what, got, want) in [
                    ("A", &ub.m.a, &cb.m.a),
                    ("B", &ub.m.b, &cb.m.b),
                    ("D", &ub.m.d, &cb.m.d),
                    ("A'", &ub.m.ap, &cb.m.ap),
                    ("D'", &ub.m.dp, &cb.m.dp),
                    ("F", &ub.m.f, &cb.m.f),
                ] {
                    assert!(
                        rel_err(*got, *want) < 1e-15,
                        "level {} slot {}: {} differs from c+ build",
                        li, s, what
                    );
                }
                // Plain (Padé) tier shares A/B/D by construction.
                let plain = mobius_from_jet_plain(&jets[s]);
                if !plain.degenerate {
                    assert!(rel_err(ub.m.a, plain.a) < 1e-15, "A vs plain");
                    assert!(rel_err(ub.m.d, plain.d) < 1e-13, "D vs plain");
                }
                // Jet-tier evaluation parity on sample entries.
                if !ub.m.degenerate {
                    for (zx, zy, cx2, cy2) in [
                        (1e-6_f64, -2e-6_f64, 1e-9_f64, 3e-10_f64),
                        (3e-4, 1e-4, -1e-7, 2e-8),
                    ] {
                        let z = CFe::from_c(zx, zy);
                        let c = CFe::from_c(cx2, cy2);
                        let got = unified_eval_jet3(ub, z, c);
                        let want = jet_eval(&jets[s], z, c, 3);
                        let e = rel_err(got, want);
                        assert!(
                            e < 1e-11,
                            "level {} slot {}: jet3 eval off by {:e}",
                            li, s, e
                        );
                    }
                }
            }
            // Advance the streaming jets to the next level.
            if jets.len() >= 2 {
                jets = (0..jets.len() / 2)
                    .map(|i| jet_compose(&jets[2 * i], &jets[2 * i + 1]))
                    .collect();
            }
        }
    }
}
