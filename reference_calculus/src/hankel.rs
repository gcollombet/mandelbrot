// Hankel rank diagnostics for block maps (directions doc §5, "rang de Hankel
// adaptatif"). BUILD-ONLY: nothing here reaches the GPU, and nothing here is a
// safety hypothesis. It answers one question ahead of the certificate —
//
//     can ANY rational form with a denominator of degree M meet the block's
//     value budget on the disk |z| ≤ r?
//
// — so the radii stage can stop proposing forms that provably cannot win.
//
// ── why a Hankel matrix answers that ────────────────────────────────────────────
//
// Kronecker's theorem: for f(z) = Σ_{k≥0} c_k z^k, the infinite Hankel matrix
// H = (c_{i+j}) has rank exactly M iff f is a STRICTLY PROPER rational function
// with denominator degree M. A [L/M] approximant with L ≥ M is not strictly
// proper — long division splits it into a polynomial of degree L−M plus a
// strictly proper part — so the polynomial head must be shifted out first: the
// Hankel built from (c_{s}, c_{s+1}, …) with s ≥ L−M+1 has rank ≤ M. That shift
// is the `shift` parameter throughout this module, and getting it wrong is the
// one way to make the whole diagnostic meaningless (see `shift_convention`).
//
// The metric version, for OUR pole geometry. The runtime's rational tiers carry
// a pole margin: the denominator has no zero on the disk of application, so the
// approximant R is analytic on the closed disk. That rules out the usual
// AAK/Nehari statement (which measures approximation by functions with poles
// INSIDE the disk) and leaves an elementary argument that is actually tighter
// matched to what we ship:
//
//   let g(w) = Φ(r·w, 0) on |w| ≤ 1, with Taylor coefficients b_k = a_k r^k;
//   let R be ANY [L/M] analytic on |w| ≤ 1 with E = sup_{|w|≤1} |g − R|;
//   then (i)   rank H_ρ ≤ M for the shifted Hankel of R's coefficients,
//        (ii)  |b_k − ρ_k| ≤ E for every k, by Cauchy on g − R,
//        (iii) σ_{M+1}(H_b) ≤ ‖H_b − H_ρ‖₂ ≤ ‖H_b − H_ρ‖_F ≤ √(rows·cols)·E
//              by Eckart–Young,
//   hence   E ≥ σ_{M+1}(H_b) / √(rows·cols).                              (★)
//
// (★) is a LOWER bound on the error of every degree-M form, so it is a veto and
// never a licence: a small σ_{M+1} promises nothing, a large one forbids. Only
// finitely many coefficients are known (JET_DS = 6), but a submatrix's singular
// values interlace below the full operator's, so the finite section keeps (★)
// valid — it merely weakens it.
//
// ── the quantity the census actually reports ────────────────────────────────────
//
// (★) is scale-free once compared against the block's own value budget. Rule (V)
// gate (a) spends ½ε·|a₁₀|·R_z on the z-channel (see `jet_solve_radii`), so
//
//     r_M := max { r : σ_{M+1}(H(r)) / √(rows·cols) ≤ ½ε·|a₁₀|·r }
//
// is an UPPER bound on the radius any degree-M tier can be certified at, in the
// exact units of `UnifiedRadii::tiers_value`. Two readings follow:
//
//   * r_M < (a rival tier's certified radius)  ⇒ degree M is dead on this block;
//     probing it is pure cost. This is the `Nprobe·Cprobe` term of the master
//     plan's cost model.
//   * r_M − (this tier's certified radius) is the headroom the CURRENT form
//     leaves on the table. Near zero ⇒ the form is already optimal for its
//     degree and no amount of extra fitting helps.
//
// The census additionally asserts tiers_value ≤ r_M + slack on every block: the
// certificate must never claim more than (★) allows. A violation is a bug here
// (or, far less likely, there), so it doubles as a self-check.
//
// ── numerical notes ─────────────────────────────────────────────────────────────
//
// Coefficients arrive as CFe because |a₁₀| = Π|2Z_k| spans 2^±tens-of-thousands.
// Scaling to the disk (b_k = a_k r^k) does not fix that by itself, so the
// singular values are computed on mantissas with a common power of two factored
// out and re-applied in log2 afterwards. The SVD is a complex ONE-SIDED Jacobi
// on the columns: it never forms HᴴH, so σ_{M+1} keeps full relative accuracy
// even when it sits far below σ₁ — which is precisely the regime the veto reads.

use crate::jet::{CFe, JetF64, JET_DS};

/// Columns of every Hankel section built here. `cols = 3` exposes σ₁..σ₃, i.e.
/// vetoes for denominator degrees M = 1 and M = 2 — the range the runtime's
/// rational tiers live in ([1/1] and [2/1]) plus one step beyond.
pub const HANKEL_COLS: usize = 3;

/// Pure-z Taylor coefficients a_{k,0}, k = 1..=JET_DS, of the block map — the
/// c = 0 slice, which is what the z-channel of every tier approximates. Index t
/// holds a_{t+1,0}.
pub fn z_series(jet: &JetF64) -> [CFe; JET_DS] {
    let mut out = [CFe::ZERO; JET_DS];
    for (k, slot) in out.iter_mut().enumerate() {
        *slot = jet.coeff(k + 1, 0);
    }
    out
}

/// Rows of the Hankel section for a given shift: the widest section the six
/// stored coefficients allow at `HANKEL_COLS` columns. Entry (i, j) reads
/// a_{1+shift+i+j}, so (rows−1) + (cols−1) ≤ (JET_DS − shift) − 1.
pub fn hankel_rows(shift: usize) -> usize {
    (JET_DS - shift + 1).saturating_sub(HANKEL_COLS)
}

/// v · 2^log2_f, with the fractional part folded into the mantissa.
fn cfe_scale_pow2(v: CFe, log2_f: f64) -> CFe {
    if v.is_zero() || !log2_f.is_finite() {
        return CFe::ZERO;
    }
    let ei = log2_f.floor();
    let mut r = CFe {
        x: v.x * (log2_f - ei).exp2(),
        y: v.y * (log2_f - ei).exp2(),
        e: v.e + ei as i64,
    };
    r.normalize();
    r
}

/// Complex one-sided Jacobi SVD: orthogonalizes the columns of an m×n matrix
/// (n ≤ m) in place; the resulting column norms are the singular values.
///
/// A sweep rotates each pair (p, q) by the unitary that diagonalizes their 2×2
/// Gram block. Writing a_pᴴa_q = |apq|·e^{iφ}, conjugating by diag(1, e^{−iφ})
/// makes the block real symmetric and the classical real Jacobi angle applies:
/// θ = (app − aqq)/(2|apq|), t = sgn(θ)/(|θ| + √(θ²+1)).
fn jacobi_columns(cols: &mut [Vec<(f64, f64)>]) -> Vec<f64> {
    let n = cols.len();
    // 30 sweeps is far beyond the ~6 a 4×3 needs; the residual test exits first.
    for _ in 0..30 {
        let mut rotated = false;
        for p in 0..n.saturating_sub(1) {
            for q in (p + 1)..n {
                let (mut app, mut aqq) = (0.0f64, 0.0f64);
                let (mut prx, mut pry) = (0.0f64, 0.0f64);
                for i in 0..cols[p].len() {
                    let (ux, uy) = cols[p][i];
                    let (vx, vy) = cols[q][i];
                    app += ux * ux + uy * uy;
                    aqq += vx * vx + vy * vy;
                    // conj(u)·v
                    prx += ux * vx + uy * vy;
                    pry += ux * vy - uy * vx;
                }
                let apq = prx.hypot(pry);
                if apq == 0.0 || !(app > 0.0) || !(aqq > 0.0) {
                    continue;
                }
                // Converged pair: the off-diagonal is at the rounding level of
                // the diagonal it would rotate against.
                if apq <= 1e-15 * (app * aqq).sqrt() {
                    continue;
                }
                rotated = true;
                let theta = (app - aqq) / (2.0 * apq);
                let t = if theta >= 0.0 {
                    1.0 / (theta + (theta * theta + 1.0).sqrt())
                } else {
                    -1.0 / (-theta + (theta * theta + 1.0).sqrt())
                };
                let c = 1.0 / (t * t + 1.0).sqrt();
                let s = t * c;
                // e^{−iφ} = conj(apq)/|apq|
                let (ex, ey) = (prx / apq, -pry / apq);
                for i in 0..cols[p].len() {
                    let (ux, uy) = cols[p][i];
                    let (vx, vy) = cols[q][i];
                    // e^{−iφ}·v
                    let (wx, wy) = (ex * vx - ey * vy, ex * vy + ey * vx);
                    cols[p][i] = (c * ux + s * wx, c * uy + s * wy);
                    cols[q][i] = (-s * ux + c * wx, -s * uy + c * wy);
                }
            }
        }
        if !rotated {
            break;
        }
    }
    let mut sig: Vec<f64> = cols
        .iter()
        .map(|col| {
            col.iter()
                .fold(0.0f64, |acc, &(x, y)| acc + x * x + y * y)
                .sqrt()
        })
        .collect();
    sig.sort_by(|a, b| b.partial_cmp(a).unwrap());
    sig
}

/// log2 of the singular values (descending) of the shifted Hankel section of
/// the series scaled to the disk |z| ≤ 2^log2_r. Length `HANKEL_COLS`; a zero
/// singular value reports −∞.
pub fn hankel_sigmas_log2(a: &[CFe; JET_DS], shift: usize, log2_r: f64) -> Vec<f64> {
    let rows = hankel_rows(shift);
    debug_assert!(rows >= 1 && shift + rows + HANKEL_COLS - 1 <= JET_DS);
    // b_k = a_k · r^k, k = 1..=JET_DS.
    let mut b = [CFe::ZERO; JET_DS];
    for (t, slot) in b.iter_mut().enumerate() {
        *slot = cfe_scale_pow2(a[t], (t + 1) as f64 * log2_r);
    }
    // Shared exponent: the Jacobi runs on mantissas, the scale returns in log2.
    let emax = b
        .iter()
        .filter(|v| !v.is_zero())
        .map(|v| v.e)
        .max()
        .unwrap_or(0);
    let plain = |k: usize| -> (f64, f64) {
        let v = b[k];
        if v.is_zero() || v.e - emax < -1000 {
            return (0.0, 0.0);
        }
        let f = 2f64.powi((v.e - emax) as i32);
        (v.x * f, v.y * f)
    };
    // Column j is (c_j, …, c_{j+rows−1}) with c_t = a_{1+shift+t}, i.e. index
    // `shift + t` into the 0-based `b`.
    let mut cols: Vec<Vec<(f64, f64)>> = (0..HANKEL_COLS)
        .map(|j| (0..rows).map(|i| plain(shift + i + j)).collect())
        .collect();
    jacobi_columns(&mut cols)
        .into_iter()
        .map(|s| if s > 0.0 { s.log2() + emax as f64 } else { f64::NEG_INFINITY })
        .collect()
}

/// Below this many log2 under σ₁, σ_{M+1} is read as "no veto available".
///
/// Two regimes land here and both want the same answer. On a well-scaled
/// section it is the rounding noise of the stored coefficients (f64 mantissas
/// carried through the merge tree, then a Jacobi sweep), which certifies
/// nothing. On a graded section — b_k = a_k r^k spans decades once r is small —
/// it is instead a genuine but vacuous value: an error floor that far under the
/// linear term cannot bind any budget.
///
/// Either way the floor only ever WEAKENS the veto, which is the safe
/// direction: (★) is a lower bound on the approximation error, so refusing to
/// use a tiny σ_{M+1} can never forbid a form that is in fact exact. It also
/// never perturbs the answer, because at the bisection's crossing point
/// σ_{M+1} ≈ ½ε|a₁₀|r ≈ ½ε·σ₁ — a ratio of 2^-21 at ε = 1e-6, decades above
/// this floor.
const HANKEL_NOISE_LOG2: f64 = 48.0;

/// log2 of the largest disk on which the STORED truncation still describes the
/// block map: the biggest r with |a_k|r^k ≤ |a₁|r for every stored k ≥ 2. Past
/// it the omitted orders (a₇ and up) would dominate the ones we hold, so the
/// section says nothing — and no certified radius ever reaches there anyway,
/// gate (a) being far stricter. Used as the bisection's upper bracket: at
/// absurd radii the section degenerates to the single largest entry, looks
/// rank-1, and would fake an absent veto.
fn series_domain_log2(a: &[CFe; JET_DS], log2_a10: f64) -> f64 {
    let mut top = 40.0f64;
    for (t, v) in a.iter().enumerate().skip(1) {
        let Some(lk) = v.log2_mag() else { continue };
        top = top.min((log2_a10 - lk) / t as f64);
    }
    top.clamp(-1000.0, 40.0)
}

/// The veto radius r_M of (★): log2 of the largest disk on which a denominator
/// of degree `m` could still meet gate (a)'s ½ε|a₁₀|R_z budget. `shift` must be
/// ≥ (numerator degree − m) for the target form — see `hankel_rows`.
///
/// Returns +∞ when the section is rank-m to stored precision (the series IS
/// degree-m rational as far as the coefficients can tell: no veto), −∞ when the
/// block is degenerate.
pub fn hankel_radius_log2(a: &[CFe; JET_DS], m: usize, shift: usize, eps: f64) -> f64 {
    debug_assert!(m + 1 <= HANKEL_COLS);
    let Some(log2_a10) = a[0].log2_mag() else {
        return f64::NEG_INFINITY; // degenerate block (Z ≈ 0 start)
    };
    let rows = hankel_rows(shift);
    let log2_frob = 0.5 * ((rows * HANKEL_COLS) as f64).log2();
    let log2_half_eps = eps.log2() - 1.0;
    // excess(r) = log2 σ_{M+1}(r) − log2 √(rows·cols) − log2(½ε|a₁₀|r). The
    // budget is linear in r while σ_{M+1} rides on the first coefficient a
    // degree-m form cannot represent (order ≥ m+2+shift), so excess increases
    // in r and a plain bisection is exact to the bracket's resolution.
    let excess = |lr: f64| -> f64 {
        let sig = hankel_sigmas_log2(a, shift, lr);
        if !sig[m].is_finite() || sig[m] < sig[0] - HANKEL_NOISE_LOG2 {
            return f64::NEG_INFINITY; // rank-m to stored precision: no veto
        }
        sig[m] - log2_frob - (log2_half_eps + log2_a10 + lr)
    };
    const LO: f64 = -1200.0;
    let hi_top = series_domain_log2(a, log2_a10);
    if excess(hi_top) <= 0.0 {
        return f64::INFINITY;
    }
    if excess(LO) > 0.0 {
        return f64::NEG_INFINITY;
    }
    let (mut lo, mut hi) = (LO, hi_top);
    for _ in 0..60 {
        let mid = 0.5 * (lo + hi);
        if excess(mid) <= 0.0 {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    lo
}

/// Per-block Hankel readout, in the units of `UnifiedRadii::tiers_value`.
#[derive(Clone, Copy, Debug)]
pub struct HankelPrediction {
    /// Veto radius for a [1/1] form (shift 0) — bounds the c+ Möbius tier.
    pub log2_r_m1_s0: f64,
    /// Veto radius for a [2/1] form (shift 1) — bounds the Padé and c+ [2/1]
    /// tiers, whose degree-1 numerator head is divided out first.
    pub log2_r_m1_s1: f64,
    /// Veto radius for a [2/2] form (shift 0) — the next denominator degree up,
    /// i.e. the headroom a tier the runtime does NOT have could reach.
    pub log2_r_m2_s0: f64,
    /// Veto radius for a [3/2] form (shift 1). Paired with `log2_r_m1_s1` this
    /// is the actionable comparison: what a second denominator degree would add
    /// over the [2/1] the runtime actually ships.
    pub log2_r_m2_s1: f64,
    /// log2 σ₂/σ₃ of the shift-0 section at r = r_m1_s0: the rank-1 vs rank-2
    /// separation. Large ⇒ the block is genuinely a one-pole object and a
    /// second denominator degree buys nothing.
    pub log2_gap_12: f64,
}

/// Full readout for one block. `eps` is the same value tolerance the radii
/// stage solves with.
pub fn hankel_predict(jet: &JetF64, eps: f64) -> HankelPrediction {
    let a = z_series(jet);
    let r1s0 = hankel_radius_log2(&a, 1, 0, eps);
    let r1s1 = hankel_radius_log2(&a, 1, 1, eps);
    let r2s0 = hankel_radius_log2(&a, 2, 0, eps);
    let r2s1 = hankel_radius_log2(&a, 2, 1, eps);
    // Read the gap on the disk where the [1/1] veto actually binds; on a
    // saturated (+∞) or dead (−∞) block there is no meaningful disk, so probe
    // the budget-neutral radius instead.
    let probe = if r1s0.is_finite() { r1s0 } else { -64.0 };
    let sig = hankel_sigmas_log2(&a, 0, probe);
    HankelPrediction {
        log2_r_m1_s0: r1s0,
        log2_r_m1_s1: r1s1,
        log2_r_m2_s0: r2s0,
        log2_r_m2_s1: r2s1,
        log2_gap_12: sig[1] - sig[2],
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::jet::{jet_idx, JET_K};

    fn cf(x: f64, y: f64) -> CFe {
        CFe::from_c(x, y)
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

    /// Build a z-series from explicit coefficients (index t holds a_{t+1}).
    fn series(c: [(f64, f64); JET_DS]) -> [CFe; JET_DS] {
        let mut out = [CFe::ZERO; JET_DS];
        for (t, slot) in out.iter_mut().enumerate() {
            *slot = cf(c[t].0, c[t].1);
        }
        out
    }

    /// Coefficients of A·z/(1 + D·z) = Σ A(−D)^{k−1} z^k.
    fn mobius_11(a: (f64, f64), d: (f64, f64)) -> [CFe; JET_DS] {
        let mut out = [CFe::ZERO; JET_DS];
        let mut term = cf(a.0, a.1);
        let md = cf(-d.0, -d.1);
        for slot in out.iter_mut() {
            *slot = term;
            term = term.mul(md);
        }
        out
    }

    /// The Jacobi driver against a matrix whose singular values are known: a
    /// 3×3 real diagonal embedded in complex columns, then a unitary column
    /// mix (which leaves the spectrum invariant).
    #[test]
    fn jacobi_matches_known_spectrum() {
        let mut cols = vec![
            vec![(3.0, 0.0), (0.0, 0.0), (0.0, 0.0)],
            vec![(0.0, 0.0), (0.0, 2.0), (0.0, 0.0)],
            vec![(0.0, 0.0), (0.0, 0.0), (0.5, 0.0)],
        ];
        let sig = jacobi_columns(&mut cols);
        assert!((sig[0] - 3.0).abs() < 1e-12, "{:?}", sig);
        assert!((sig[1] - 2.0).abs() < 1e-12, "{:?}", sig);
        assert!((sig[2] - 0.5).abs() < 1e-12, "{:?}", sig);

        // Mix columns 0 and 1 by a complex rotation: spectrum must not move.
        let (c, s) = (0.6, 0.8);
        let mut mixed = vec![
            vec![(3.0 * c, 0.0), (0.0, -2.0 * s), (0.0, 0.0)],
            vec![(3.0 * s, 0.0), (0.0, 2.0 * c), (0.0, 0.0)],
            vec![(0.0, 0.0), (0.0, 0.0), (0.5, 0.0)],
        ];
        let sig2 = jacobi_columns(&mut mixed);
        for k in 0..3 {
            assert!((sig[k] - sig2[k]).abs() < 1e-12, "{:?} vs {:?}", sig, sig2);
        }
    }

    /// Kronecker, read forwards: an exact [1/1] series has a rank-1 Hankel, so
    /// σ₂ collapses to the rounding level of σ₁ at ANY radius, and the veto
    /// radius is unbounded. This is the load-bearing property — if it failed,
    /// every number this module produces would be noise.
    #[test]
    fn exact_mobius_has_rank_one_hankel() {
        let a = mobius_11((0.7, -0.3), (1.9, 0.4));
        for lr in [-40.0, -8.0, -1.0, 0.0] {
            let sig = hankel_sigmas_log2(&a, 0, lr);
            assert!(
                sig[1] - sig[0] < -40.0,
                "σ₂/σ₁ not collapsed at 2^{}: {:?}",
                lr,
                sig
            );
        }
        assert_eq!(hankel_radius_log2(&a, 1, 0, 1e-6), f64::INFINITY);
    }

    /// The shift convention, which is the module's one real trap. A [2/1] form
    /// (A z + E z²)/(1 + D z) is NOT strictly proper: its unshifted Hankel has
    /// rank 2, and only after dividing out the degree-1 polynomial head — shift
    /// 1 — does it drop to rank 1. A module that read shift 0 for the Padé tier
    /// would veto forms that are in fact exact.
    #[test]
    fn shift_convention() {
        // (A z + E z²)/(1 + D z): a_1 = A, a_k = (E − A·D)·(−D)^{k−2} for k ≥ 2.
        let (a1, e1, d1) = (cf(0.9, 0.2), cf(-0.4, 0.6), cf(1.3, -0.7));
        let mut a = [CFe::ZERO; JET_DS];
        a[0] = a1;
        let mut term = e1.sub(a1.mul(d1));
        let md = d1.neg();
        for slot in a.iter_mut().skip(1) {
            *slot = term;
            term = term.mul(md);
        }
        let s0 = hankel_sigmas_log2(&a, 0, -2.0);
        let s1 = hankel_sigmas_log2(&a, 1, -2.0);
        assert!(
            s0[1] - s0[0] > -20.0,
            "unshifted [2/1] should NOT look rank-1: {:?}",
            s0
        );
        assert!(
            s1[1] - s1[0] < -40.0,
            "shifted [2/1] must be rank-1: {:?}",
            s1
        );
        assert_eq!(hankel_radius_log2(&a, 1, 1, 1e-6), f64::INFINITY);
        assert!(hankel_radius_log2(&a, 1, 0, 1e-6).is_finite());
    }

    /// A series that is genuinely NOT low-rank must produce a finite veto
    /// radius that scales the way (★) predicts: σ_{M+1} rides on the first
    /// unrepresentable order, so tightening ε by 2^k moves r_M by k/(order−1).
    #[test]
    fn veto_radius_scales_with_budget() {
        let a = series([
            (1.0, 0.0),
            (0.3, 0.1),
            (-0.7, 0.25),
            (0.11, -0.9),
            (0.42, 0.13),
            (-0.2, 0.6),
        ]);
        let r_a = hankel_radius_log2(&a, 1, 0, 1e-6);
        let r_b = hankel_radius_log2(&a, 1, 0, 1e-12);
        assert!(r_a.is_finite() && r_b.is_finite(), "{} {}", r_a, r_b);
        // Tighter budget ⇒ strictly smaller admissible disk.
        assert!(
            r_b < r_a - 1.0,
            "r(1e-12) = {} not below r(1e-6) = {}",
            r_b,
            r_a
        );
        // σ₂ for M = 1, shift 0 is driven by the z³ order: slope ≈ 1/(3−1).
        let slope = (r_a - r_b) / 20.0;
        assert!(
            (0.2..0.85).contains(&slope),
            "budget slope {} outside the order-3 window",
            slope
        );
    }

    /// The σ₃ channel, on which the whole "is a second denominator degree worth
    /// it" reading rests, validated the same way as σ₂: an exact [2/2] series
    /// must collapse σ₃ at shift 0 (deg p = deg q ⇒ the division leaves only a
    /// constant, which the a₀-free series never carried) while σ₂ stays live.
    #[test]
    fn exact_two_pole_has_rank_two_hankel() {
        // (A z + E z²)/(1 + D z + G z²): a₁ = A, a₂ = E − D·A,
        // a_k = −D·a_{k−1} − G·a_{k−2} for k ≥ 3.
        let (av, ev, dv, gv) = (cf(0.8, 0.1), cf(-0.3, 0.5), cf(1.1, -0.4), cf(0.6, 0.35));
        let mut a = [CFe::ZERO; JET_DS];
        a[0] = av;
        a[1] = ev.sub(dv.mul(av));
        for k in 2..JET_DS {
            a[k] = dv.mul(a[k - 1]).neg().sub(gv.mul(a[k - 2]));
        }
        for lr in [-30.0, -6.0, -1.0] {
            let sig = hankel_sigmas_log2(&a, 0, lr);
            assert!(
                sig[2] - sig[0] < -40.0,
                "σ₃/σ₁ not collapsed at 2^{}: {:?}",
                lr,
                sig
            );
            // The discriminator is the SEPARATION σ₂/σ₃, not either ratio to
            // σ₁: on a graded section (b_k = a_k r^k spans decades at small r)
            // σ₂/σ₁ decays like r² on its own, since every analytic map looks
            // linear on a small enough disk. What marks two poles rather than
            // one is σ₃ sitting decades BELOW σ₂.
            assert!(
                sig[2] - sig[1] < -40.0,
                "σ₃ not separated from σ₂ at 2^{}: {:?}",
                lr,
                sig
            );
        }
        assert_eq!(hankel_radius_log2(&a, 2, 0, 1e-6), f64::INFINITY);
        assert!(hankel_radius_log2(&a, 1, 0, 1e-6).is_finite());
    }

    /// A higher denominator degree can only ever help: r_{M+1} ≥ r_M on the
    /// same shift, because σ_{M+2} ≤ σ_{M+1} pointwise in r.
    #[test]
    fn veto_radius_monotone_in_degree() {
        let a = series([
            (1.0, 0.0),
            (0.3, 0.1),
            (-0.7, 0.25),
            (0.11, -0.9),
            (0.42, 0.13),
            (-0.2, 0.6),
        ]);
        let r1 = hankel_radius_log2(&a, 1, 0, 1e-6);
        let r2 = hankel_radius_log2(&a, 2, 0, 1e-6);
        assert!(
            r2 >= r1 - 1e-9,
            "M=2 radius {} below M=1 radius {}",
            r2,
            r1
        );
    }

    /// The veto must dominate what the certificate actually claims, on real
    /// blocks: `tiers_value` for a degree-1 tier can never exceed r_M. This is
    /// the inequality the census asserts at scale; here it runs on one view as
    /// a guard against regressions in either direction.
    #[test]
    fn veto_dominates_certified_radii() {
        use crate::unified::{
            build_unified_levels, unified_build_bounds, unified_solve_radii, TIER_CPLUS, TIER_PADE,
        };
        let eps = 1e-6;
        let lcmax = -44.0;
        let orbit = ref_orbit_f64(-0.743643887037151, 0.131825904205330, 2048);
        let levels = build_unified_levels(&orbit, 256);
        let bounds = unified_build_bounds(&levels, &orbit, lcmax);
        let radii = unified_solve_radii(&levels, &bounds, eps, lcmax);
        // Rebuild the jets the levels consumed: the merge tree is the same
        // scaffold, so slot s of level li covers the same steps.
        let mut jets: Vec<crate::jet::JetF64> = (1..orbit.len())
            .map(|i| crate::jet::jet_seed(orbit[i].0, orbit[i].1))
            .collect();
        let mut skip = 1usize;
        let mut li = 0usize;
        let mut checked = 0usize;
        while skip < 256 && skip * 2 < orbit.len() {
            let n = jets.len() / 2;
            if n == 0 {
                break;
            }
            jets = (0..n)
                .map(|i| crate::jet::jet_compose(&jets[2 * i], &jets[2 * i + 1]))
                .collect();
            skip *= 2;
            li += 1;
            if li >= radii.tiers_value.len() || radii.tiers_value[li].is_empty() {
                continue;
            }
            for (s, jet) in jets.iter().enumerate() {
                if s >= radii.tiers_value[li].len() {
                    break;
                }
                let p = hankel_predict(jet, eps);
                let tv = radii.tiers_value[li][s];
                for (tier, name) in [(TIER_PADE, "padé"), (TIER_CPLUS, "c+")] {
                    if !tv[tier].is_finite() {
                        continue;
                    }
                    // Both shipped rational tiers are [2/1] in z (degree-1
                    // denominator, degree-2 numerator) ⇒ shift 1.
                    assert!(
                        tv[tier] <= p.log2_r_m1_s1 + 1.0,
                        "skip {skip} slot {s} {name}: certified 2^{:.2} exceeds \
                         the degree-1 veto 2^{:.2}",
                        tv[tier],
                        p.log2_r_m1_s1
                    );
                    checked += 1;
                }
            }
        }
        assert!(checked > 100, "census guard covered only {} tiers", checked);
        let _ = JET_K;
        let _ = jet_idx(1, 0);
    }

    /// Rebuild the streaming merge tree the unified levels consumed, returning
    /// the per-level jets (index 0 = skip 2, matching level index 1).
    fn rebuild_jets(orbit: &[(f64, f64)], max_skip: usize) -> Vec<Vec<crate::jet::JetF64>> {
        let mut cur: Vec<crate::jet::JetF64> = (1..orbit.len())
            .map(|i| crate::jet::jet_seed(orbit[i].0, orbit[i].1))
            .collect();
        let mut out = Vec::new();
        let mut skip = 1usize;
        while skip < max_skip && skip * 2 < orbit.len() {
            let n = cur.len() / 2;
            if n == 0 {
                break;
            }
            cur = (0..n)
                .map(|i| crate::jet::jet_compose(&cur[2 * i], &cur[2 * i + 1]))
                .collect();
            skip *= 2;
            out.push(cur.clone());
        }
        out
    }

    /// What the log2 radii actually BUY, in the master plan's own currency
    /// (§2: "gain réalisé = itérations couvertes / tours réels de boucle").
    ///
    /// A radius is not the deliverable — loop turns are. The two are linked by
    /// the merge tree's own geometry: one octave of skip costs some amount of
    /// radius, so a ceiling stated in log2 only becomes a gain once divided by
    /// that exchange rate. This replay measures both ends directly.
    ///
    /// Each pixel walks the real perturbation recurrence. At every reference
    /// index it takes the LONGEST aligned block whose radius covers |dz| and is
    /// charged ONE turn for it (the block's dz is advanced by exact iteration,
    /// so the trajectory stays truthful — the model error the tier would add is
    /// ≤ ε and cannot change which blocks qualify at this resolution). Two
    /// walks per pixel:
    ///
    ///   now  — the certified value radii the table ships today;
    ///   hyp  — the same, except every block's radius is raised to the degree-2
    ///          ceiling r_M([3/2]) wherever that is larger.
    ///
    /// `hyp` is an OPTIMISTIC bound twice over: r_M is an upper bound on what a
    /// [3/2] could certify, and it bounds the VALUE channel only — a real tier
    /// would also have to pass its derivative certificate, which on the shipped
    /// tiers is what binds roughly half the time. Read the result as "the most
    /// a second denominator degree could possibly be worth", not as a forecast.
    ///
    /// Run with: cargo test hankel_gain_in_turns -- --ignored --nocapture
    #[test]
    #[ignore = "census: heavy, run explicitly with --ignored --nocapture"]
    fn hankel_gain_in_turns() {
        use crate::unified::{build_unified_levels, unified_build_bounds, unified_solve_radii};
        let eps = 1e-6;
        println!(
            "\n turns | view        σ(dc)   | octave cost | turns now   turns hyp   Δ% | \
             it/turn now  hyp"
        );
        let configs: [(&str, f64, f64, f64, usize, usize); 4] = [
            ("cusp", -0.75, 0.0, -40.0, 4096, 512),
            (
                "seahorse",
                -0.743643887037151,
                0.131825904205330,
                -44.0,
                4096,
                512,
            ),
            ("feigenbaum", -1.401155, 0.0, -44.0, 4096, 512),
            ("cusp-deep", -0.75, 0.0, -80.0, 8192, 1024),
        ];
        for (name, cx, cy, lcmax, iters, max_skip) in configs {
            let orbit = ref_orbit_f64(cx, cy, iters);
            if orbit.len() < iters / 2 {
                println!("[{}] escaped at {} iters — skipped", name, orbit.len());
                continue;
            }
            let levels = build_unified_levels(&orbit, max_skip);
            let bounds = unified_build_bounds(&levels, &orbit, lcmax);
            let radii = unified_solve_radii(&levels, &bounds, eps, lcmax);
            let jets = rebuild_jets(&orbit, max_skip);
            // Per level index, per slot: today's best certified VALUE radius and
            // the degree-2 ceiling, both log2.
            let nlev = radii.tiers_value.len();
            let mut r_now: Vec<Vec<f64>> = vec![Vec::new(); nlev];
            let mut r_hyp: Vec<Vec<f64>> = vec![Vec::new(); nlev];
            for li in 0..nlev {
                if radii.tiers_value[li].is_empty() || li == 0 || li > jets.len() {
                    continue;
                }
                let lvl_jets = &jets[li - 1];
                for (s, tv) in radii.tiers_value[li].iter().enumerate() {
                    let best = tv.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
                    r_now[li].push(best);
                    let hyp = match lvl_jets.get(s) {
                        Some(j) => {
                            let c = hankel_predict(j, eps).log2_r_m2_s1;
                            // A saturated ceiling means "no veto available",
                            // NOT "infinite radius" — there is simply no bound
                            // to replay. Leaving such blocks at today's radius
                            // makes `hyp` conservative on exactly the blocks
                            // where degree 2 looks best (deg2sat), which is the
                            // safe direction for a gain claim.
                            if c.is_finite() {
                                best.max(c)
                            } else {
                                best
                            }
                        }
                        None => best,
                    };
                    r_hyp[li].push(hyp);
                }
            }
            // Exchange rate: median log2 radius lost per skip octave.
            let mut med_r: Vec<(usize, f64)> = Vec::new();
            for li in 0..nlev {
                let mut v: Vec<f64> = r_now[li].iter().cloned().filter(|x| x.is_finite()).collect();
                if v.len() < 4 {
                    continue;
                }
                v.sort_by(|a, b| a.partial_cmp(b).unwrap());
                med_r.push((li, v[v.len() / 2]));
            }
            let octave_cost = if med_r.len() >= 2 {
                let (l0, r0) = med_r[0];
                let (l1, r1) = med_r[med_r.len() - 1];
                (r0 - r1) / (l1 - l0) as f64
            } else {
                f64::NAN
            };

            let walk = |dc: (f64, f64), rad: &Vec<Vec<f64>>| -> (u64, u64) {
                let (mut turns, mut covered) = (0u64, 0u64);
                let mut dz = (0.0f64, 0.0f64);
                let mut ref_i = 0usize;
                let step = |dz: (f64, f64), zr: (f64, f64), dc: (f64, f64)| -> (f64, f64) {
                    (
                        2.0 * (zr.0 * dz.0 - zr.1 * dz.1) + dz.0 * dz.0 - dz.1 * dz.1 + dc.0,
                        2.0 * (zr.0 * dz.1 + zr.1 * dz.0) + 2.0 * dz.0 * dz.1 + dc.1,
                    )
                };
                while covered < iters as u64 {
                    // Longest aligned block covering |dz| at this index.
                    let dz2 = dz.0 * dz.0 + dz.1 * dz.1;
                    let ldz = if dz2 > 0.0 {
                        0.5 * dz2.log2()
                    } else {
                        f64::NEG_INFINITY
                    };
                    let mut took = 0usize;
                    if ref_i >= 1 {
                        for li in (1..nlev).rev() {
                            let skip = 1usize << li;
                            if rad[li].is_empty() || (ref_i - 1) % skip != 0 {
                                continue;
                            }
                            let s = (ref_i - 1) / skip;
                            if s >= rad[li].len() || ref_i + skip >= orbit.len() {
                                continue;
                            }
                            if ldz <= rad[li][s] {
                                took = skip;
                                break;
                            }
                        }
                    }
                    let n = took.max(1);
                    for _ in 0..n {
                        dz = step(dz, orbit[ref_i], dc);
                        ref_i += 1;
                    }
                    turns += 1;
                    covered += n as u64;
                    let zf = orbit[ref_i];
                    let full = (zf.0 + dz.0, zf.1 + dz.1);
                    let full2 = full.0 * full.0 + full.1 * full.1;
                    if full2 > 4.0 {
                        break;
                    }
                    if full2 < dz.0 * dz.0 + dz.1 * dz.1 || ref_i >= orbit.len() - 1 - max_skip {
                        dz = full;
                        ref_i = 0;
                    }
                }
                (turns, covered)
            };

            for sigma in [lcmax.exp2() * 0.5, lcmax.exp2() * 0.05] {
                let g = 12usize;
                let (mut tn, mut th, mut cn, mut ch) = (0u64, 0u64, 0u64, 0u64);
                for gy in 0..g {
                    for gx in 0..g {
                        let tx = (gx as f64 / (g - 1) as f64) * 2.0 - 1.0;
                        let ty = (gy as f64 / (g - 1) as f64) * 2.0 - 1.0;
                        let dc = (tx * sigma, ty * sigma);
                        let (a, ca) = walk(dc, &r_now);
                        let (b, cb) = walk(dc, &r_hyp);
                        tn += a;
                        th += b;
                        cn += ca;
                        ch += cb;
                    }
                }
                println!(
                    " turns | {:<11} 2^{:>5.1} | {:>11.2} | {:>9} {:>11} {:>5.1} | {:>11.1} {:>5.1}",
                    name,
                    sigma.log2(),
                    octave_cost,
                    tn,
                    th,
                    -100.0 * (tn as f64 - th as f64) / tn as f64,
                    cn as f64 / tn.max(1) as f64,
                    ch as f64 / th.max(1) as f64,
                );
            }
        }
    }

    /// Build-only census (directions doc §5.2 step 7 / §9 gate "candidats
    /// certifiés vivants"). Per view and level it reports, in log2 radius:
    ///
    ///   headroom  = r_M([2/1]) − best certified degree-1 radius. What a BETTER
    ///               [2/1] could still win. Read it against log2 √(rows·cols) =
    ///               1.79, the slack (★) itself carries: a headroom under that
    ///               means the shipped form is at the one-pole optimum as far
    ///               as this diagnostic can resolve.
    ///   deg2gain  = r_M([3/2]) − r_M([2/1]), both at shift 1. What a second
    ///               denominator degree would add OVER THE SHIPPED FORM. This
    ///               is the number that decides whether a [L/2] tier is worth
    ///               designing. Both terms are upper bounds, so a large value
    ///               licenses building a candidate, not the gain itself.
    ///   deg2sat   = share where [3/2] is exact to stored precision while [2/1]
    ///               is not — the strongest possible signal for that tier.
    ///   veto      = share of blocks where degree 1 cannot reach the BEST
    ///               certified radius across all four tiers ⇒ probing the two
    ///               rational tiers there is provably wasted work.
    ///   gap12     = median log2 σ₂/σ₃, the rank-1 vs rank-2 separation.
    ///
    /// Run with: cargo test hankel_rank_census -- --ignored --nocapture
    #[test]
    #[ignore = "census: heavy, run explicitly with --ignored --nocapture"]
    fn hankel_rank_census() {
        use crate::unified::{build_unified_levels, unified_build_bounds, unified_solve_radii};
        let eps = 1e-6;
        println!(
            "\n hankel | view        skip  blk | medHeadroom  medDeg2gain deg2sat%  veto%  \
             medGap12 | satur% dead%"
        );
        let configs: [(&str, f64, f64, f64, usize, usize); 6] = [
            ("cusp", -0.75, 0.0, -40.0, 2048, 256),
            ("period2", -1.0, 0.0, -40.0, 2048, 256),
            (
                "seahorse",
                -0.743643887037151,
                0.131825904205330,
                -44.0,
                2048,
                256,
            ),
            ("feigenbaum", -1.401155, 0.0, -44.0, 2048, 256),
            ("cusp-deep", -0.75, 0.0, -80.0, 8192, 1024),
            (
                "seahorse-dp",
                -0.743643887037151,
                0.131825904205330,
                -80.0,
                3000,
                512,
            ),
        ];
        for (name, cx, cy, lcmax, iters, max_skip) in configs {
            let orbit = ref_orbit_f64(cx, cy, iters);
            if orbit.len() < iters / 2 {
                println!("[{name}] escaped at {} iters — skipped", orbit.len());
                continue;
            }
            let levels = build_unified_levels(&orbit, max_skip);
            let bounds = unified_build_bounds(&levels, &orbit, lcmax);
            let radii = unified_solve_radii(&levels, &bounds, eps, lcmax);
            let mut jets: Vec<crate::jet::JetF64> = (1..orbit.len())
                .map(|i| crate::jet::jet_seed(orbit[i].0, orbit[i].1))
                .collect();
            let mut skip = 1usize;
            let mut li = 0usize;
            while skip < max_skip && skip * 2 < orbit.len() {
                let n = jets.len() / 2;
                if n == 0 {
                    break;
                }
                jets = (0..n)
                    .map(|i| crate::jet::jet_compose(&jets[2 * i], &jets[2 * i + 1]))
                    .collect();
                skip *= 2;
                li += 1;
                if li >= radii.tiers_value.len() || radii.tiers_value[li].is_empty() || skip < 4 {
                    continue;
                }
                let mut headroom: Vec<f64> = Vec::new();
                let mut deg2: Vec<f64> = Vec::new();
                let mut gaps: Vec<f64> = Vec::new();
                let (mut vetoed, mut sat, mut dead, mut total) = (0usize, 0usize, 0usize, 0usize);
                let mut deg2sat = 0usize;
                for (s, jet) in jets.iter().enumerate() {
                    if s >= radii.tiers_value[li].len() {
                        break;
                    }
                    total += 1;
                    let p = hankel_predict(jet, eps);
                    let tv = radii.tiers_value[li][s];
                    if p.log2_r_m1_s1.is_infinite() {
                        if p.log2_r_m1_s1 > 0.0 {
                            sat += 1; // exactly [2/1] to stored precision
                        } else {
                            dead += 1; // degenerate block
                        }
                        continue;
                    }
                    let best_deg1 = tv[1].max(tv[2]);
                    if best_deg1.is_finite() {
                        headroom.push(p.log2_r_m1_s1 - best_deg1);
                    }
                    // Degree 2 measured against the SHIPPED [2/1], same shift.
                    if p.log2_r_m2_s1.is_finite() {
                        deg2.push(p.log2_r_m2_s1 - p.log2_r_m1_s1);
                    } else if p.log2_r_m2_s1 > 0.0 {
                        deg2sat += 1;
                    }
                    if p.log2_gap_12.is_finite() {
                        gaps.push(p.log2_gap_12);
                    }
                    let best_any = tv.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
                    if best_any.is_finite() && p.log2_r_m1_s1 < best_any {
                        vetoed += 1;
                    }
                }
                let med = |v: &mut Vec<f64>| -> f64 {
                    if v.is_empty() {
                        return f64::NAN;
                    }
                    v.sort_by(|a, b| a.partial_cmp(b).unwrap());
                    v[v.len() / 2]
                };
                let pct = |k: usize| 100.0 * k as f64 / total.max(1) as f64;
                println!(
                    " hankel | {name:<11} {skip:>4} {total:>4} | {:>11.2} {:>12.2} {:>8.1} \
                     {:>6.1} {:>9.2} | {:>5.1} {:>5.1}",
                    med(&mut headroom),
                    med(&mut deg2),
                    pct(deg2sat),
                    pct(vetoed),
                    med(&mut gaps),
                    pct(sat),
                    pct(dead),
                );
            }
        }
    }
}
