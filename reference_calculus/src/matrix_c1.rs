//! `matrix-c1` build-only tier (PADE_RUNTIME_REVISED_PLAN.md).
//!
//! Per block, the non-autonomous Padé product ∏ M_j(c) truncated affine in c:
//!
//!   M(c) = M0 + c·M1,   M_j(c) = [[a_j², a_j·c], [−1, a_j]],  a_j = 2Z_j,
//!
//! eight complex coefficients per block. The merge rule is the EXACT mirror of
//! the proven Lean recurrence `matrixC1_comp_tail_le` (MatrixC1.lean): the
//! chronologically LATE child is the OUTER factor,
//!
//!   K0 = late.M0·early.M0,   K1 = late.M0·early.M1 + late.M1·early.M0,
//!   E_K = E_late·(‖early‖_y + E_early) + ‖late‖_y·E_early + y²·‖late.M1·early.M0₁‖
//!
//! with ‖·‖_y = entryNorm(M0) + y·entryNorm(M1). CAUTION: the role-swapped
//! formula is ALSO a true bound (the mirrored decomposition), so a swap cannot
//! be caught by sampled soundness tests — only by structurally mirroring the
//! theorem. Do not "simplify" the asymmetry.
//!
//! After every merge the block is projectively normalized by a power of two
//! (exact in CFe: exponent shift) applied to M0, M1 AND E together; evaluation,
//! margins and the truncation majorant are all invariant (Lean: the
//! `*_scale` lemma family). `log2_scale` tracks the accumulated Λ so that
//! absolute-frame quantities (the exact tail determinant) can be brought into
//! the stored frame: det scales as Λ², entries as Λ.
//!
//! The value certificate mirrors `matrixC1_nonautonomous_total_error`:
//! E_pade (transported local defects, NonautonomousPade.lean) + E_matrix
//! (truncation majorant, p = E(R+1) against the uniform margin μ) against the
//! same (V) budget the other tiers solve: ½ε·(|A|·x + |B|·y). The derivative
//! radius is Cauchy on the nested z-disk (CauchyDerivatives.lean): the value
//! bound M(R_out, y) gives |∂z err| ≤ M/(R_out − R) against ½ε·|A|; no
//! c-enlargement is needed for the shipped min(r, r′). Everything here is
//! build-only census machinery — nothing ships to the GPU yet.
#![allow(dead_code)] // consumed progressively by the matrix-c1 census tasks

use crate::jet::CFe;
use crate::mobius::bisect_last_success;

fn l2(v: &CFe) -> f64 {
    v.log2_mag().unwrap_or(f64::NEG_INFINITY)
}

/// log2(Σ 2^l), −∞ entries ignored.
fn lse(terms: &[f64]) -> f64 {
    let m = terms.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
    if m == f64::NEG_INFINITY || !m.is_finite() {
        return m;
    }
    m + terms.iter().map(|l| (l - m).exp2()).sum::<f64>().log2()
}

/// log2(2^base − Σ 2^other): lower margins in the relative linear domain.
/// −∞ when the margin is not strictly positive (certificate failure).
fn lsub(base: f64, others: &[f64]) -> f64 {
    if base == f64::NEG_INFINITY {
        return f64::NEG_INFINITY;
    }
    let s: f64 = others
        .iter()
        .filter(|l| l.is_finite() || **l == f64::INFINITY)
        .map(|l| (l - base).exp2())
        .sum();
    if s >= 1.0 {
        f64::NEG_INFINITY
    } else {
        base + (1.0 - s).log2()
    }
}

// ── homography over CFe ─────────────────────────────────────────────────────────

/// 2×2 complex matrix [[a, b], [c, d]] in extended-exponent form. Mirrors the
/// Lean `Homography` record (A, B, C, D).
#[derive(Clone, Copy, Debug)]
pub struct HomFe {
    pub a: CFe,
    pub b: CFe,
    pub c: CFe,
    pub d: CFe,
}

impl HomFe {
    pub const ONE: HomFe = HomFe {
        a: CFe::ONE,
        b: CFe::ZERO,
        c: CFe::ZERO,
        d: CFe::ONE,
    };
    pub const ZERO: HomFe = HomFe {
        a: CFe::ZERO,
        b: CFe::ZERO,
        c: CFe::ZERO,
        d: CFe::ZERO,
    };

    /// Matrix product outer·inner — mirrors Lean `Homography.comp` exactly
    /// (outer is the LEFT factor).
    pub fn comp(outer: &HomFe, inner: &HomFe) -> HomFe {
        HomFe {
            a: outer.a.mul(inner.a).add(outer.b.mul(inner.c)),
            b: outer.a.mul(inner.b).add(outer.b.mul(inner.d)),
            c: outer.c.mul(inner.a).add(outer.d.mul(inner.c)),
            d: outer.c.mul(inner.b).add(outer.d.mul(inner.d)),
        }
    }

    pub fn add(&self, o: &HomFe) -> HomFe {
        HomFe {
            a: self.a.add(o.a),
            b: self.b.add(o.b),
            c: self.c.add(o.c),
            d: self.d.add(o.d),
        }
    }

    /// Exact power-of-two rescale (exponent shift): self ← self / 2^k.
    pub fn shift_exp(&mut self, k: i64) {
        for v in [&mut self.a, &mut self.b, &mut self.c, &mut self.d] {
            if !v.is_zero() {
                v.e -= k;
            }
        }
    }

    /// log2 upper bound of entryNorm = |A|+|B|+|C|+|D| (Lean `entryNorm`).
    pub fn log2_entry_norm(&self) -> f64 {
        lse(&[l2(&self.a), l2(&self.b), l2(&self.c), l2(&self.d)])
    }

    pub fn max_entry_log2(&self) -> f64 {
        [l2(&self.a), l2(&self.b), l2(&self.c), l2(&self.d)]
            .iter()
            .fold(f64::NEG_INFINITY, |m, v| m.max(*v))
    }
}

// ── matrix-c1 block ─────────────────────────────────────────────────────────────

/// One composed block: M(c) ≈ m0 + c·m1 in the 2^log2_scale-normalized frame
/// (stored ≈ exact/2^log2_scale), with the certified c²⁺ tail
/// ‖exact/Λ − (m0 + c·m1)‖ ≤ 2^log2_tail on |c| ≤ y (the y it was built at).
#[derive(Clone, Copy, Debug)]
pub struct MatC1 {
    pub m0: HomFe,
    pub m1: HomFe,
    /// log2 of the certified entryNorm tail bound E (scaled frame, y-keyed).
    pub log2_tail: f64,
    /// Accumulated normalization Λ (log2, exact integer shifts).
    pub log2_scale: i64,
}

impl MatC1 {
    pub const ONE: MatC1 = MatC1 {
        m0: HomFe::ONE,
        m1: HomFe::ZERO,
        log2_tail: f64::NEG_INFINITY,
        log2_scale: 0,
    };

    /// One-step seed: M_j(c) = [[a², a·c], [−1, a]] split as M0 + c·M1.
    /// Exact in c — zero tail.
    pub fn step_seed(ax: f64, ay: f64) -> MatC1 {
        let a = CFe::from_c(ax, ay);
        MatC1 {
            m0: HomFe {
                a: a.mul(a),
                b: CFe::ZERO,
                c: CFe::from_c(-1.0, 0.0),
                d: a,
            },
            m1: HomFe {
                a: CFe::ZERO,
                b: a,
                c: CFe::ZERO,
                d: CFe::ZERO,
            },
            log2_tail: f64::NEG_INFINITY,
            log2_scale: 0,
        }
    }

    /// Lean `MatrixC1.evalNormBound`: entryNorm(M0) + y·entryNorm(M1), log2.
    pub fn log2_eval_norm(&self, log2_y: f64) -> f64 {
        lse(&[
            self.m0.log2_entry_norm(),
            log2_y + self.m1.log2_entry_norm(),
        ])
    }

    /// Merge two children; `late` covers the chronologically LATER steps and
    /// is the OUTER factor — the exact mirror of `matrixC1_comp_tail_le`.
    /// The role-swapped bound would also be true but is NOT the proven one.
    pub fn merge(late: &MatC1, early: &MatC1, log2_y: f64) -> MatC1 {
        let m0 = HomFe::comp(&late.m0, &early.m0);
        let m1 = HomFe::comp(&late.m0, &early.m1).add(&HomFe::comp(&late.m1, &early.m0));
        let cross = HomFe::comp(&late.m1, &early.m1);
        // E_K = E_late·(‖early‖_y + E_early) + ‖late‖_y·E_early + y²·‖M1·N1‖
        let log2_tail = lse(&[
            late.log2_tail + lse(&[early.log2_eval_norm(log2_y), early.log2_tail]),
            late.log2_eval_norm(log2_y) + early.log2_tail,
            2.0 * log2_y + cross.log2_entry_norm(),
        ]);
        let mut out = MatC1 {
            m0,
            m1,
            log2_tail,
            log2_scale: late.log2_scale + early.log2_scale,
        };
        out.normalize();
        out
    }

    /// Projective normalization by a power of two: center the max entry
    /// exponent at 0, dividing M0, M1 and E by the SAME 2^k (exact shifts).
    /// Evaluation and every certificate ratio are invariant (Lean `*_scale`).
    pub fn normalize(&mut self) {
        let m = self.m0.max_entry_log2().max(self.m1.max_entry_log2());
        if !m.is_finite() {
            return;
        }
        let k = m.round() as i64;
        if k == 0 {
            return;
        }
        self.m0.shift_exp(k);
        self.m1.shift_exp(k);
        if self.log2_tail.is_finite() {
            self.log2_tail -= k as f64;
        }
        self.log2_scale += k;
    }

    /// Residual entry-exponent spread after normalization (census: relative
    /// f32 dynamics; normalization centers absolute exponents, it cannot
    /// shrink this).
    pub fn entry_spread_log2(&self) -> f64 {
        let logs: Vec<f64> = [
            l2(&self.m0.a),
            l2(&self.m0.b),
            l2(&self.m0.c),
            l2(&self.m0.d),
            l2(&self.m1.a),
            l2(&self.m1.b),
            l2(&self.m1.c),
            l2(&self.m1.d),
        ]
        .iter()
        .copied()
        .filter(|l| l.is_finite())
        .collect();
        let hi = logs.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        let lo = logs.iter().cloned().fold(f64::INFINITY, f64::min);
        hi - lo
    }
}

// ── merge-tree levels (same block geometry as build_unified_levels) ─────────────

pub struct MatC1Level {
    pub skip: usize,
    pub blocks: Vec<MatC1>,
}

/// Mirror of `build_unified_levels`' geometry: slot s of a level covers `skip`
/// steps applied from ref index 1 + s·skip; pairwise merges with prev[2i]
/// early / prev[2i+1] late. Coefficients are y-independent; the tail E is
/// built at `log2_c_max` (y-keyed cache line in the plan's separation).
pub fn matc1_build_levels(
    orbit: &[(f64, f64)],
    max_skip: usize,
    log2_c_max: f64,
) -> Vec<MatC1Level> {
    let orbit_len = orbit.len();
    let mut out = Vec::new();
    if orbit_len < 3 {
        return out;
    }
    let mut prev: Vec<MatC1> = (1..orbit_len)
        .map(|i| MatC1::step_seed(2.0 * orbit[i].0, 2.0 * orbit[i].1))
        .collect();
    out.push(MatC1Level {
        skip: 1,
        blocks: prev.clone(),
    });
    let mut skip = 1usize;
    while skip < max_skip && skip * 2 < orbit_len {
        let n = prev.len() / 2;
        if n == 0 {
            break;
        }
        let cur: Vec<MatC1> = (0..n)
            .map(|i| MatC1::merge(&prev[2 * i + 1], &prev[2 * i], log2_c_max))
            .collect();
        skip *= 2;
        out.push(MatC1Level {
            skip,
            blocks: cur.clone(),
        });
        prev = cur;
    }
    out
}

// ── per-block certification (value + Cauchy derivative) ─────────────────────────

/// R-independent per-block precomputation at a fixed y: the backward suffix
/// walk. Index j ∈ [0, len]: suffix_j = steps j..len−1 (suffix_len = identity).
/// All suffix quantities live in each suffix's OWN normalized frame; the exact
/// tail determinant (absolute frame, closed form ∏|a_k|(|a_k|²+y)) is brought
/// into that frame by −2·log2_scale (det scales as Λ²).
pub struct MatC1Pre {
    /// log2|a_j| per step.
    pub la: Vec<f64>,
    /// Suffix j: log2 lower bound of |D(c)| − E = |D0| − y|D1| − E (scaled
    /// frame); −∞ when the uniform D margin is dead.
    pub dlow: Vec<f64>,
    /// Suffix j: log2 upper bound |C0| + y|C1| + E (scaled frame).
    pub cup: Vec<f64>,
    /// Suffix j: log2 upper bound |D0| + y|D1| + E (scaled frame) — feeds the
    /// direct ∂z bound's |den| upper estimates.
    pub dup: Vec<f64>,
    /// Suffix j: log2 upper bound of ‖det(exact suffix)‖ / Λ_j² (scaled frame).
    pub det_scaled: Vec<f64>,
    /// log2 of the block linear coefficients: A = ∏ a_k, B (∂c response).
    pub log2_a_blk: f64,
    pub log2_b_blk: f64,
    /// The full-block matrix (suffix 0).
    pub blk: MatC1,
    pub log2_y: f64,
}

pub fn matc1_precompute(orbit: &[(f64, f64)], first: usize, skip: usize, log2_y: f64) -> MatC1Pre {
    let len = skip;
    let la: Vec<f64> = (0..len)
        .map(|j| {
            let (zx, zy) = orbit[first + j];
            (2.0 * (zx * zx + zy * zy).sqrt()).log2()
        })
        .collect();
    // Balanced segment tree over the block's steps. A SEQUENTIAL suffix walk
    // (suffix ← suffix ∘ step) multiplies E by entryNorm(step) ≈ 3 at EVERY
    // step — 3^L destroys the tail bound past L ≈ 30 even at deep y. The
    // balanced tree pays that norm factor only log₂(L) times because each
    // merge sees the ACTUAL sub-product entries (O(1) normalized), not a
    // product of per-step norm bounds.
    let mut tree: Vec<Vec<MatC1>> = Vec::new();
    tree.push(
        (0..len)
            .map(|j| {
                let (zx, zy) = orbit[first + j];
                MatC1::step_seed(2.0 * zx, 2.0 * zy)
            })
            .collect(),
    );
    while tree.last().unwrap().len() > 1 {
        let prev = tree.last().unwrap();
        let cur: Vec<MatC1> = (0..prev.len() / 2)
            .map(|i| MatC1::merge(&prev[2 * i + 1], &prev[2 * i], log2_y))
            .collect();
        tree.push(cur);
    }
    let blk = *tree.last().unwrap().first().unwrap_or(&MatC1::ONE);
    // Suffix [j, len) as the composition of its canonical tree segments,
    // later segments outer — O(log L) merges per suffix.
    let compose_suffix = |j0: usize| -> MatC1 {
        let mut acc = MatC1::ONE;
        let mut j = j0;
        while j < len {
            // Largest aligned power-of-two segment starting at j.
            let mut lev = 0usize;
            while lev + 1 < tree.len() && j % (1 << (lev + 1)) == 0 && j + (1 << (lev + 1)) <= len {
                lev += 1;
            }
            let seg = &tree[lev][j >> lev];
            // seg is LATER than everything accumulated so far.
            acc = if j == j0 {
                *seg
            } else {
                MatC1::merge(seg, &acc, log2_y)
            };
            j += 1 << lev;
        }
        acc
    };
    let mut dlow = vec![f64::NEG_INFINITY; len + 1];
    let mut cup = vec![f64::NEG_INFINITY; len + 1];
    let mut dup = vec![f64::NEG_INFINITY; len + 1];
    let mut det_scaled = vec![f64::NEG_INFINITY; len + 1];
    // Identity suffix: D = 1, C = 0, det = 1 (Λ = 1).
    dlow[len] = 0.0;
    cup[len] = f64::NEG_INFINITY;
    dup[len] = 0.0;
    det_scaled[len] = 0.0;
    let mut det_abs = 0.0f64; // log2 ∏ |a_k|(|a_k|²+y) over the suffix
    let mut log2_a = 0.0f64; // log2 ∏ a_k over the suffix
    let mut log2_b = f64::NEG_INFINITY;
    for j in (0..len).rev() {
        // B recurrence BEFORE consuming a_j: B_j = A_{j+1} + B_{j+1}.
        log2_b = lse(&[log2_a, log2_b]);
        log2_a += la[j];
        det_abs += la[j] + lse(&[2.0 * la[j], log2_y]);
        let suffix = compose_suffix(j);
        let ld0 = l2(&suffix.m0.d);
        dlow[j] = lsub(ld0, &[log2_y + l2(&suffix.m1.d), suffix.log2_tail]);
        cup[j] = lse(&[
            l2(&suffix.m0.c),
            log2_y + l2(&suffix.m1.c),
            suffix.log2_tail,
        ]);
        dup[j] = lse(&[ld0, log2_y + l2(&suffix.m1.d), suffix.log2_tail]);
        det_scaled[j] = det_abs - 2.0 * suffix.log2_scale as f64;
    }
    MatC1Pre {
        la,
        dlow,
        cup,
        dup,
        det_scaled,
        log2_a_blk: log2_a,
        log2_b_blk: log2_b,
        blk,
        log2_y,
    }
}

/// Total certified value-error bound at log2 R = lx (−∞ = the x = 0 endpoint),
/// log2 domain: E_pade (transported defects) + E_matrix (truncation majorant).
/// Returns −∞-free log2 of the bound, or +∞ when any margin dies (pole loss,
/// envelope past |a_j|, p ≥ μ).
pub fn matc1_value_error_log2(pre: &MatC1Pre, lx: f64) -> f64 {
    let len = pre.la.len();
    let ly = pre.log2_y;
    let mut terms: Vec<f64> = Vec::with_capacity(len + 2);
    // Orbit envelope r_{j+1} = |a_j|·r_j + r_j² + y (exactStepOutputBound),
    // r_0 = R: hx of the total theorem.
    let mut lr = lx;
    for j in 0..len {
        // A near-zero orbit point (a_j = 2Z_j ≈ 0) degenerates the per-step
        // Padé map — the whole non-autonomous product is uncertifiable.
        if !pre.la[j].is_finite() {
            return f64::INFINITY;
        }
        // hloc: r_j < |a_j| with a usable margin.
        let theta = lr - pre.la[j];
        if theta >= -1e-9 {
            return f64::INFINITY;
        }
        let lgap = pre.la[j] + (1.0 - theta.exp2()).log2(); // |a_j| − r_j
        let lr_next = lse(&[pre.la[j] + lr, 2.0 * lr, ly]);
        // Local defect r_j(r_j² + y)/(|a_j| − r_j), transported by the exact
        // suffix j+1: ·‖det‖/(m_pade·m_exact), margins from the stored
        // suffix's uniform D/C bounds (tailDenMargin_ge_uniform).
        let w_pade = pre.la[j] + lse(&[pre.la[j] + lr, ly]) - lgap;
        let w_exact = lr_next;
        let m_pade = lsub(pre.dlow[j + 1], &[pre.cup[j + 1] + w_pade]);
        let m_exact = lsub(pre.dlow[j + 1], &[pre.cup[j + 1] + w_exact]);
        if m_pade == f64::NEG_INFINITY || m_exact == f64::NEG_INFINITY {
            return f64::INFINITY;
        }
        let local = lr + lse(&[2.0 * lr, ly]) - lgap;
        if local.is_finite() {
            terms.push(local + pre.det_scaled[j + 1] - m_pade - m_exact);
        }
        lr = lr_next;
    }
    // E_matrix on the whole block: p = E(R+1), μ and Nu uniform (scaled frame,
    // frame-invariant ratios — matrixC1EvalMajorantOf).
    let b = &pre.blk;
    let p = b.log2_tail + lse(&[lx, 0.0]);
    let mu = lsub(
        l2(&b.m0.d),
        &[ly + l2(&b.m1.d), lse(&[l2(&b.m0.c), ly + l2(&b.m1.c)]) + lx],
    );
    if p.is_finite() || mu == f64::NEG_INFINITY {
        if mu == f64::NEG_INFINITY || p >= mu {
            return f64::INFINITY;
        }
        let m_minus_p = lsub(mu, &[p]);
        let nu = lse(&[
            lse(&[l2(&b.m0.a), ly + l2(&b.m1.a)]) + lx,
            lse(&[l2(&b.m0.b), ly + l2(&b.m1.b)]),
        ]);
        terms.push(p - m_minus_p);
        terms.push(nu + p - m_minus_p - mu);
    }
    lse(&terms)
}

/// DIRECT ∂z error bound at log2 R = lx (no Cauchy enlargement — attacks the
/// constant ~1.4 log2 the nested-disk route costs). Decomposition mirroring
/// the value certificate, term by term:
///
///   ∂z(stored − exact block) = ∂z(stored − tail₀)  [matrix truncation]
///                            + Σ_j ∂z(defect_j)    [transported shadowing]
///
/// Matrix part: both are homographies of z, ∂zΦ = det/den², so
///   |∂zΦ_m − ∂zΦ_q| ≤ |det_m − det_q|/den_m² + |det_q|·|den_q²−den_m²|/(den_m²den_q²)
/// with |det_m − det_q| ≤ E·(2‖q‖_y + E) (det is bilinear in the entries),
/// den_q ≥ μ, den_m ≥ μ − p, |den_q²−den_m²| ≤ p·(2·denup + p).
///
/// Shadowing part: defect_j(z) = tail(u(w)) − tail(v(w)) at w = x_j(z), with
/// u = padeSeed, v = exactStep. Chain rule twice:
///   |∂z defect_j| ≤ [ |tail′(u)|·|u′−v′| + |tail′(u)−tail′(v)|·|v′| ]·|x_j′(z)|
/// where tail′ = det/den² (margins from the suffix bounds), u−v = z(z²+c)/(a−z),
/// |x_j′| ≤ ∏_{k<j}(|a_k| + 2r_k) — the exact-orbit chain factor.
///
/// All ratios are Λ-frame-invariant (det ~ Λ², den ~ Λ, entries ~ Λ). Every
/// bound is elementary norm algebra in the style of the proven value chain;
/// the matching Lean lemmas are an OPEN obligation (census-grade for now).
/// Returns +∞ when any margin dies.
pub fn matc1_deriv_error_log2(pre: &MatC1Pre, lx: f64) -> f64 {
    let len = pre.la.len();
    let ly = pre.log2_y;
    let mut terms: Vec<f64> = Vec::with_capacity(2 * len + 2);
    let mut lr = lx;
    let mut lp = 0.0f64; // log2 ∏_{k<j} (|a_k| + 2r_k)
    for j in 0..len {
        if !pre.la[j].is_finite() {
            return f64::INFINITY;
        }
        let theta = lr - pre.la[j];
        if theta >= -1e-9 {
            return f64::INFINITY;
        }
        let lgap = pre.la[j] + (1.0 - theta.exp2()).log2();
        let lr_next = lse(&[pre.la[j] + lr, 2.0 * lr, ly]);
        let w_pade = pre.la[j] + lse(&[pre.la[j] + lr, ly]) - lgap;
        let w_exact = lr_next;
        let m_p = lsub(pre.dlow[j + 1], &[pre.cup[j + 1] + w_pade]);
        let m_e = lsub(pre.dlow[j + 1], &[pre.cup[j + 1] + w_exact]);
        if m_p == f64::NEG_INFINITY || m_e == f64::NEG_INFINITY {
            return f64::INFINITY;
        }
        if lr.is_finite() || ly.is_finite() {
            // |∂w(u−v)| ≤ [(3r²+y)(|a|+r) + r(r²+y)] / gap².
            let num1 = lse(&[(3.0f64).log2() + 2.0 * lr, ly]) + lse(&[pre.la[j], lr]);
            let num2 = lr + lse(&[2.0 * lr, ly]);
            let duv = lse(&[num1, num2]) - 2.0 * lgap;
            // |u − v| ≤ r(r²+y)/gap.
            let local = lr + lse(&[2.0 * lr, ly]) - lgap;
            // |v′| = |a + 2x_j| ≤ |a| + 2r.
            let lvp = lse(&[pre.la[j], 1.0 + lr]);
            // tail′(u): det/den² with den ≥ m_p.
            let t1 = pre.det_scaled[j + 1] - 2.0 * m_p + duv;
            // |tail′(u) − tail′(v)| ≤ det·|C|·|u−v|·(denup_u + denup_v)/(m_p²·m_e²).
            let denup_u = lse(&[pre.cup[j + 1] + w_pade, pre.dup[j + 1]]);
            let denup_v = lse(&[pre.cup[j + 1] + w_exact, pre.dup[j + 1]]);
            let t2 = pre.det_scaled[j + 1] + pre.cup[j + 1] + local + lse(&[denup_u, denup_v])
                - 2.0 * m_p
                - 2.0 * m_e
                + lvp;
            let dj = lse(&[t1, t2]) + lp;
            if dj.is_finite() {
                terms.push(dj);
            }
        }
        lp += lse(&[pre.la[j], 1.0 + lr]);
        lr = lr_next;
    }
    // Matrix truncation part, uniform quantities in the block's Λ frame.
    let b = &pre.blk;
    let e = b.log2_tail;
    let p = e + lse(&[lx, 0.0]);
    let mu = lsub(
        l2(&b.m0.d),
        &[ly + l2(&b.m1.d), lse(&[l2(&b.m0.c), ly + l2(&b.m1.c)]) + lx],
    );
    if mu == f64::NEG_INFINITY || (p.is_finite() && p >= mu) {
        return f64::INFINITY;
    }
    let m_mp = lsub(mu, &[p]);
    if e.is_finite() {
        // E·(‖q‖_y + 2E) — the exact form of the Lean A2 statement
        // (det_sub_det_le); do not "simplify" to E·(2‖q‖+E), which is not
        // implied by it without E ≤ ‖q‖.
        let ddet = e + lse(&[b.log2_eval_norm(ly), 1.0 + e]);
        terms.push(ddet - 2.0 * m_mp);
        let l_ay = lse(&[l2(&b.m0.a), ly + l2(&b.m1.a)]);
        let l_by = lse(&[l2(&b.m0.b), ly + l2(&b.m1.b)]);
        let l_cy = lse(&[l2(&b.m0.c), ly + l2(&b.m1.c)]);
        let l_dy = lse(&[l2(&b.m0.d), ly + l2(&b.m1.d)]);
        let det_q_up = lse(&[l_ay + l_dy, l_by + l_cy]);
        let denup = lse(&[l_cy + lx, l_dy]);
        let dden2 = p + lse(&[1.0 + denup, p]);
        terms.push(det_q_up + dden2 - 2.0 * m_mp - 2.0 * mu);
    }
    lse(&terms)
}

/// First failing component of the value certificate at log2 R = lx —
/// census diagnostics ("ok" when the certificate holds).
pub fn matc1_death_reason(pre: &MatC1Pre, epsilon: f64, log2_c_max: f64, lx: f64) -> &'static str {
    let len = pre.la.len();
    let ly = pre.log2_y;
    let mut lr = lx;
    for j in 0..len {
        if !pre.la[j].is_finite() {
            return "zero-a";
        }
        let theta = lr - pre.la[j];
        if theta >= -1e-9 {
            return "pole";
        }
        let lgap = pre.la[j] + (1.0 - theta.exp2()).log2();
        let lr_next = lse(&[pre.la[j] + lr, 2.0 * lr, ly]);
        let w_pade = pre.la[j] + lse(&[pre.la[j] + lr, ly]) - lgap;
        if lsub(pre.dlow[j + 1], &[pre.cup[j + 1] + w_pade]) == f64::NEG_INFINITY {
            return "m-pade";
        }
        if lsub(pre.dlow[j + 1], &[pre.cup[j + 1] + lr_next]) == f64::NEG_INFINITY {
            return "m-exact";
        }
        lr = lr_next;
    }
    let b = &pre.blk;
    let p = b.log2_tail + lse(&[lx, 0.0]);
    let mu = lsub(
        l2(&b.m0.d),
        &[ly + l2(&b.m1.d), lse(&[l2(&b.m0.c), ly + l2(&b.m1.c)]) + lx],
    );
    if mu == f64::NEG_INFINITY || (p.is_finite() && p >= mu) {
        return "p>=mu";
    }
    let l2half_eps = epsilon.log2() - 1.0;
    let rhs = l2half_eps + lse(&[pre.log2_a_blk + lx, pre.log2_b_blk + log2_c_max]);
    if matc1_value_error_log2(pre, lx) > rhs {
        return "budget";
    }
    "ok"
}

/// Certified radii for one block against the (V)-shaped budget
/// ½ε(|A|x + |B|y) (value) and ½ε|A| (Cauchy ∂z). `log2_r_value` is the
/// value-only radius; `log2_r_eff` additionally requires a Cauchy gap
/// certifying the derivative — the min(r, r′) the pipeline would ship.
pub struct MatC1Radii {
    pub log2_r_value: f64,
    pub log2_r_eff: f64,
    /// Diagnostics at r_eff: value error and the winning Cauchy gap (log2).
    pub log2_err_at_r: f64,
    pub gap_log2: f64,
}

/// Cauchy outer-radius grid (log2 offsets above R): the bound M(R_out)/(R_out−R)
/// is not monotone in R_out, so probe a small log-spaced grid instead of a
/// midpoint (plan: bissection externe + grille interne). The sub-0.5 offsets
/// matter when the value radius is pole/margin-limited: the admissible R_out
/// interval above R collapses and only a thin outer shell certifies — a coarse
/// grid reads that as "derivative dead".
const CAUCHY_GAPS_LOG2: [f64; 8] = [
    0.07,
    0.15,
    0.3,
    0.5,
    1.0,
    2.0,
    3.321928094887362,
    6.643856189774724,
];

pub fn matc1_solve_radii(pre: &MatC1Pre, epsilon: f64, log2_c_max: f64) -> MatC1Radii {
    let l2half_eps = epsilon.log2() - 1.0;
    let rhs = |lx: f64| l2half_eps + lse(&[pre.log2_a_blk + lx, pre.log2_b_blk + log2_c_max]);
    let value_ok = |lx: f64| matc1_value_error_log2(pre, lx) <= rhs(lx);
    let der_ok = |lx: f64| -> Option<f64> {
        if lx == f64::NEG_INFINITY {
            return Some(f64::NEG_INFINITY);
        }
        let budget = l2half_eps + pre.log2_a_blk;
        // Direct ∂z first (no enlargement — the census's ~1.4 log2 lever);
        // Cauchy on the nested disk as the fallback route. Both are sound,
        // whichever certifies wins. −∞ gap marks the direct route.
        if matc1_deriv_error_log2(pre, lx) <= budget {
            return Some(f64::NEG_INFINITY);
        }
        for g in CAUCHY_GAPS_LOG2 {
            let lx_out = lx + g;
            let m = matc1_value_error_log2(pre, lx_out);
            if !m.is_finite() {
                continue;
            }
            // gap = R·(2^g − 1) in log2.
            let lgap = lx + (g.exp2() - 1.0).log2();
            if m - lgap <= budget {
                return Some(g);
            }
        }
        None
    };
    // x = 0 gate (the emitted radius covers the whole runtime interval [0, r]).
    if !value_ok(f64::NEG_INFINITY) {
        return MatC1Radii {
            log2_r_value: f64::NEG_INFINITY,
            log2_r_eff: f64::NEG_INFINITY,
            log2_err_at_r: f64::INFINITY,
            gap_log2: f64::NAN,
        };
    }
    // Top: the pole bound r < min|a_j| (the envelope only tightens it).
    let top = pre.la.iter().cloned().fold(f64::INFINITY, f64::min) - 0.1;
    const FLOOR: f64 = -53.150_849_518_197_8; // 1e-16, the (V) scan floor
    if !top.is_finite() {
        return MatC1Radii {
            log2_r_value: f64::NEG_INFINITY,
            log2_r_eff: f64::NEG_INFINITY,
            log2_err_at_r: f64::INFINITY,
            gap_log2: f64::NAN,
        };
    }
    let r_value = bisect_last_success(top, FLOOR, |x| value_ok(x));
    let r_eff = bisect_last_success(top, FLOOR, |x| value_ok(x) && der_ok(x).is_some());
    let (err, gap) = if r_eff.is_finite() {
        (
            matc1_value_error_log2(pre, r_eff),
            der_ok(r_eff).unwrap_or(f64::NAN),
        )
    } else {
        (f64::INFINITY, f64::NAN)
    };
    MatC1Radii {
        log2_r_value: r_value,
        log2_r_eff: r_eff,
        log2_err_at_r: err,
        gap_log2: gap,
    }
}

// ── tests + census ──────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

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

    // Deep-zoom c_max: the affine-in-c truncation is O(y²) absolute against a
    // value budget of ε|B|y at x = 0, so the tier only lives where y ≲ ε|B| —
    // the deep regime it is designed for (shallow gate-census values like
    // 2⁻⁵..2⁻¹⁰ kill every block by construction).
    const VIEWS: [(&str, f64, f64, f64); 4] = [
        ("cusp", -0.75, 0.0, -40.0),
        ("period2", -1.0, 0.0, -40.0),
        ("seahorse", -0.743643887037151, 0.131825904205330, -44.0),
        ("feigenbaum", -1.401155, 0.0, -44.0),
    ];

    /// Exact homography of one step at concrete c (absolute frame).
    fn step_exact(ax: f64, ay: f64, c: CFe) -> HomFe {
        let a = CFe::from_c(ax, ay);
        HomFe {
            a: a.mul(a),
            b: a.mul(c),
            c: CFe::from_c(-1.0, 0.0),
            d: a,
        }
    }

    /// entryNorm of (exact/Λ − (M0 + c·M1)) in the stored frame, log2.
    fn tail_entry_norm_log2(blk: &MatC1, exact: &HomFe, c: CFe) -> f64 {
        let ev = |m0: &CFe, m1: &CFe, ex: &CFe| {
            let mut e = *ex;
            if !e.is_zero() {
                e.e -= blk.log2_scale;
            }
            e.sub(m0.add(c.mul(*m1)))
        };
        let da = ev(&blk.m0.a, &blk.m1.a, &exact.a);
        let db = ev(&blk.m0.b, &blk.m1.b, &exact.b);
        let dc = ev(&blk.m0.c, &blk.m1.c, &exact.c);
        let dd = ev(&blk.m0.d, &blk.m1.d, &exact.d);
        // entryNorm is the SUM of entry norms.
        lse(&[l2(&da), l2(&db), l2(&dc), l2(&dd)])
    }

    #[test]
    fn matc1_coefficients_tree_shape_independent() {
        // K0/K1 are polynomial coefficients mod c² — identical for the
        // balanced tree and the sequential left fold, up to the normalization
        // frame (compare after realigning by the scale difference).
        let orbit = ref_orbit_f64(-0.743643887037151, 0.131825904205330, 64);
        let ly = -10.0;
        let seeds: Vec<MatC1> = (1..33)
            .map(|i| MatC1::step_seed(2.0 * orbit[i].0, 2.0 * orbit[i].1))
            .collect();
        // Balanced tree over 32 steps.
        let mut lvl = seeds.clone();
        while lvl.len() > 1 {
            lvl = (0..lvl.len() / 2)
                .map(|i| MatC1::merge(&lvl[2 * i + 1], &lvl[2 * i], ly))
                .collect();
        }
        let tree = lvl[0];
        // Sequential: fold with the NEW step as the late/outer factor.
        let mut seq = seeds[0];
        for s in &seeds[1..] {
            seq = MatC1::merge(s, &seq, ly);
        }
        let ds = (tree.log2_scale - seq.log2_scale) as f64;
        for (t, s, name) in [
            (&tree.m0.a, &seq.m0.a, "m0.a"),
            (&tree.m0.b, &seq.m0.b, "m0.b"),
            (&tree.m0.c, &seq.m0.c, "m0.c"),
            (&tree.m0.d, &seq.m0.d, "m0.d"),
            (&tree.m1.a, &seq.m1.a, "m1.a"),
            (&tree.m1.b, &seq.m1.b, "m1.b"),
            (&tree.m1.c, &seq.m1.c, "m1.c"),
            (&tree.m1.d, &seq.m1.d, "m1.d"),
        ] {
            let lt = l2(t);
            let lsq = l2(s) - ds; // bring seq into the tree frame
            if lt == f64::NEG_INFINITY && lsq == f64::NEG_INFINITY {
                continue;
            }
            assert!(
                (lt - lsq).abs() < 1e-9,
                "{name}: tree {lt} vs seq {lsq} (Δframe {ds})"
            );
            // Compare full complex values, not just magnitudes.
            let (tx, ty) = (t.x, t.y);
            let mut sv = *s;
            sv.e -= tree.log2_scale - seq.log2_scale;
            let f = 2f64.powi((sv.e - t.e).clamp(-500, 500) as i32);
            assert!(
                (tx - sv.x * f).abs() < 1e-9 && (ty - sv.y * f).abs() < 1e-9,
                "{name}: complex mismatch"
            );
        }
    }

    #[test]
    fn matc1_tail_bound_sound_and_frame_consistent() {
        // Exact product of per-step homographies at sampled concrete c,
        // brought into the stored frame, must sit under the certified E —
        // catching both tail-rule and Λ-bookkeeping bugs at once.
        //
        // SHALLOW y only: E carries the exact-arithmetic Lean semantics (like
        // every other tier's moduli); at deep y the true tail (~y²) sinks
        // below this test's own f64 measurement noise (~2⁻⁵⁰·entry scale) and
        // the comparison measures rounding, not the bound.
        const SHALLOW_VIEWS: [(&str, f64, f64, f64); 4] = [
            ("cusp", -0.75, 0.0, -5.0),
            ("period2", -1.0, 0.0, -8.0),
            ("seahorse", -0.743643887037151, 0.131825904205330, -10.0),
            ("feigenbaum", -1.401155, 0.0, -9.0),
        ];
        for (name, cx, cy, lcmax) in SHALLOW_VIEWS {
            let orbit = ref_orbit_f64(cx, cy, 300);
            if orbit.len() < 260 {
                continue;
            }
            let levels = matc1_build_levels(&orbit, 64, lcmax);
            let y = lcmax.exp2();
            for (ci, (ccx, ccy)) in [(y, 0.0), (-y, 0.0), (0.6 * y, -0.7 * y), (0.0, 0.99 * y)]
                .iter()
                .enumerate()
            {
                let c = CFe::from_c(*ccx, *ccy);
                for lvl in &levels {
                    if lvl.skip < 4 || lvl.skip > 64 {
                        continue;
                    }
                    for (s, blk) in lvl.blocks.iter().enumerate().take(8) {
                        let first = 1 + s * lvl.skip;
                        // Exact product, late = outer.
                        let mut exact = HomFe::ONE;
                        for j in 0..lvl.skip {
                            let (zx, zy) = orbit[first + j];
                            exact = HomFe::comp(&step_exact(2.0 * zx, 2.0 * zy, c), &exact);
                        }
                        let ltail = tail_entry_norm_log2(blk, &exact, c);
                        assert!(
                            ltail <= blk.log2_tail + 1e-6 || ltail == f64::NEG_INFINITY,
                            "[{name}] c#{ci} skip {} slot {s}: real tail 2^{ltail:.2} \
                             over certified 2^{:.2}",
                            lvl.skip,
                            blk.log2_tail
                        );
                    }
                }
            }
        }
    }

    #[test]
    fn matc1_normalization_invariance() {
        // Shifting a block by an extra power of two (matched E shift) leaves
        // the certified radii bit-identical: the majorant is projectively
        // invariant.
        let orbit = ref_orbit_f64(-0.75, 0.0, 200);
        let pre = matc1_precompute(&orbit, 1, 64, -40.0);
        let mut shifted = pre.blk;
        shifted.m0.shift_exp(7);
        shifted.m1.shift_exp(7);
        shifted.log2_tail -= 7.0;
        shifted.log2_scale += 7;
        let pre2 = MatC1Pre {
            la: pre.la.clone(),
            dlow: pre.dlow.clone(),
            cup: pre.cup.clone(),
            dup: pre.dup.clone(),
            det_scaled: pre.det_scaled.clone(),
            log2_a_blk: pre.log2_a_blk,
            log2_b_blk: pre.log2_b_blk,
            blk: shifted,
            log2_y: pre.log2_y,
        };
        // The E_matrix inputs move by exactly −7 in p/μ/Nu; ratios cancel.
        for lx in [-30.0, -20.0, -10.0] {
            let e1 = matc1_value_error_log2(&pre, lx);
            let e2 = matc1_value_error_log2(&pre2, lx);
            assert!(
                (e1 - e2).abs() < 1e-9 || (e1.is_infinite() && e2.is_infinite()),
                "lx {lx}: {e1} vs {e2}"
            );
        }
        // And the solved radii agree (both −∞ counts as agreement).
        let r1 = matc1_solve_radii(&pre, 1e-6, -40.0);
        let r2 = matc1_solve_radii(&pre2, 1e-6, -40.0);
        assert!(
            (r1.log2_r_eff - r2.log2_r_eff).abs() < 1e-9
                || (r1.log2_r_eff == f64::NEG_INFINITY && r2.log2_r_eff == f64::NEG_INFINITY),
            "r_eff {} vs {}",
            r1.log2_r_eff,
            r2.log2_r_eff
        );
        assert!(
            (r1.log2_r_value - r2.log2_r_value).abs() < 1e-9
                || (r1.log2_r_value == f64::NEG_INFINITY && r2.log2_r_value == f64::NEG_INFINITY),
            "r_value {} vs {}",
            r1.log2_r_value,
            r2.log2_r_value
        );
    }

    #[test]
    fn matc1_value_certificate_vs_exact_iteration() {
        // High-precision check of the END-TO-END promise: for |δ0| ≤ R and
        // |c| ≤ c_max, |Φ_stored(δ0) − δ_exact| ≤ ½ε(|A|R + |B|c_max).
        for (name, cx, cy, lcmax) in VIEWS {
            let orbit = ref_orbit_f64(cx, cy, 300);
            if orbit.len() < 260 {
                continue;
            }
            let eps = 1e-6;
            for skip in [16usize, 64] {
                for s in [0usize, 1] {
                    let first = 1 + s * skip;
                    if first + skip >= orbit.len() {
                        continue;
                    }
                    let pre = matc1_precompute(&orbit, first, skip, lcmax);
                    let radii = matc1_solve_radii(&pre, eps, lcmax);
                    if !radii.log2_r_eff.is_finite() {
                        continue;
                    }
                    let r = radii.log2_r_eff.exp2();
                    let y = lcmax.exp2();
                    for (dx, dy, ccx, ccy) in [
                        (r, 0.0, y, 0.0),
                        (-0.7 * r, 0.7 * r, -y, 0.0),
                        (0.5 * r, -0.5 * r, 0.3 * y, 0.9 * y),
                        (0.0, 0.0, 0.0, y),
                    ] {
                        // Exact orbit δ' = a δ + δ² + c, and its z-derivative
                        // by the chain rule: ∂δ_n/∂δ_0 = ∏ (a_j + 2δ_j).
                        let (mut ex, mut ey) = (dx, dy);
                        let (mut gx, mut gy) = (1.0f64, 0.0f64);
                        for j in 0..skip {
                            let (zx, zy) = orbit[first + j];
                            let (ax, ay) = (2.0 * zx, 2.0 * zy);
                            let (fx, fy) = (ax + 2.0 * ex, ay + 2.0 * ey);
                            let ngx = fx * gx - fy * gy;
                            let ngy = fx * gy + fy * gx;
                            gx = ngx;
                            gy = ngy;
                            let nx = ax * ex - ay * ey + ex * ex - ey * ey + ccx;
                            let ny = ax * ey + ay * ex + 2.0 * ex * ey + ccy;
                            ex = nx;
                            ey = ny;
                        }
                        // Stored Φ = (A z + B)/(C z + D), A = A0 + c·A1 etc.
                        let c = CFe::from_c(ccx, ccy);
                        let z = CFe::from_c(dx, dy);
                        let b = &pre.blk;
                        let av = b.m0.a.add(c.mul(b.m1.a));
                        let bv = b.m0.b.add(c.mul(b.m1.b));
                        let cv = b.m0.c.add(c.mul(b.m1.c));
                        let dv = b.m0.d.add(c.mul(b.m1.d));
                        let phi = av.mul(z).add(bv).div(cv.mul(z).add(dv));
                        let (px, py) = phi.to_f64();
                        let err = ((px - ex).powi(2) + (py - ey).powi(2)).sqrt();
                        let budget =
                            0.5 * eps * ((pre.log2_a_blk.exp2() * r) + pre.log2_b_blk.exp2() * y);
                        assert!(
                            err <= budget * (1.0 + 1e-6) + 1e-300,
                            "[{name}] skip {skip} slot {s}: err {err:.3e} > budget \
                             {budget:.3e} at r=2^{:.2}",
                            radii.log2_r_eff
                        );
                        // Derivative promise: |∂zΦ_stored − ∂z(exact block)|
                        // ≤ ½ε|A|, with ∂zΦ = det/den² of the stored matrix.
                        let det = av.mul(dv).sub(bv.mul(cv));
                        let den = cv.mul(z).add(dv);
                        let dphi = det.div(den.mul(den));
                        let (dpx, dpy) = dphi.to_f64();
                        let derr = ((dpx - gx).powi(2) + (dpy - gy).powi(2)).sqrt();
                        let dbudget = 0.5 * eps * pre.log2_a_blk.exp2();
                        assert!(
                            derr <= dbudget * (1.0 + 1e-6) + 1e-300,
                            "[{name}] skip {skip} slot {s}: ∂z err {derr:.3e} > \
                             {dbudget:.3e} at r=2^{:.2}",
                            radii.log2_r_eff
                        );
                    }
                }
            }
        }
    }

    /// Build-only census (plan step: census avant shader). Compares the
    /// matrix-c1 effective radius (value + Cauchy ∂z) against the four
    /// existing tiers' EFFECTIVE radii (min(r, r′), what auto dispatches on).
    /// Run with: cargo test matc1_census -- --ignored --nocapture
    #[test]
    #[ignore = "census: heavy, run explicitly with --ignored --nocapture"]
    fn matc1_census() {
        use crate::unified::{build_unified_levels, unified_build_bounds, unified_solve_radii};
        let eps = 1e-6;
        println!(
            "\n census | view    skip  blk  aliveV aliveE | beatV: aff padé  c+ jet | \
             medΔV(best) medΔE(best) derCost | spread | deaths"
        );
        // (name, cx, cy, log2_c_max, orbit iters, max_skip): the four standard
        // views at pixel-scale-deep c_max, plus deeper/longer variants probing
        // the crossover the theory predicts (the Δ-to-best narrows with L).
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
        // Ultra-deep probes: the effective-radius Δ narrows ~+0.5 log2 per
        // skip octave on parabolic references — chase the crossover.
        let ultra: [(&str, f64, f64, f64, usize, usize); 2] = [
            ("cusp-ultra", -0.75, 0.0, -120.0, 32768, 8192),
            ("feigen-deep", -1.401155, 0.0, -120.0, 32768, 8192),
        ];
        let configs = configs.iter().cloned().chain(ultra.iter().cloned());
        for (name, cx, cy, lcmax, iters, max_skip) in configs {
            let orbit = ref_orbit_f64(cx, cy, iters);
            if orbit.len() < iters / 2 {
                println!("[{name}] escaped at {} iters — skipped", orbit.len());
                continue;
            }
            let ulevels = build_unified_levels(&orbit, max_skip);
            let bounds = unified_build_bounds(&ulevels, &orbit, lcmax);
            let radii = unified_solve_radii(&ulevels, &bounds, eps, lcmax);
            let mlevels = matc1_build_levels(&orbit, max_skip, lcmax);
            for (li, mlvl) in mlevels.iter().enumerate() {
                if mlvl.skip < 4 {
                    continue;
                }
                let nb = mlvl.blocks.len();
                let (mut alive_v, mut alive_e) = (0usize, 0usize);
                let mut beats_v = [0usize; 4];
                let mut dv_best: Vec<f64> = Vec::new();
                let mut de_best: Vec<f64> = Vec::new();
                let mut der_cost: Vec<f64> = Vec::new();
                let mut spreads: Vec<f64> = Vec::new();
                let mut deaths: std::collections::BTreeMap<&'static str, usize> =
                    std::collections::BTreeMap::new();
                for s in 0..nb {
                    let first = 1 + s * mlvl.skip;
                    if first + mlvl.skip >= orbit.len() {
                        break;
                    }
                    let pre = matc1_precompute(&orbit, first, mlvl.skip, lcmax);
                    let rc1 = matc1_solve_radii(&pre, eps, lcmax);
                    let tiers = &radii.tiers[li][s];
                    let best = tiers.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
                    if rc1.log2_r_value.is_finite() {
                        alive_v += 1;
                        for t in 0..4 {
                            if rc1.log2_r_value > tiers[t] {
                                beats_v[t] += 1;
                            }
                        }
                        if best.is_finite() {
                            dv_best.push(rc1.log2_r_value - best);
                        }
                        spreads.push(pre.blk.entry_spread_log2());
                    } else {
                        // Where does the x = 0 gate (or the floor probe) die?
                        let gate = matc1_death_reason(&pre, eps, lcmax, f64::NEG_INFINITY);
                        let why = if gate != "ok" {
                            gate
                        } else {
                            matc1_death_reason(&pre, eps, lcmax, -53.0)
                        };
                        *deaths.entry(why).or_insert(0) += 1;
                    }
                    if rc1.log2_r_eff.is_finite() {
                        alive_e += 1;
                        if best.is_finite() {
                            de_best.push(rc1.log2_r_eff - best);
                        }
                        if rc1.log2_r_value.is_finite() {
                            der_cost.push(rc1.log2_r_value - rc1.log2_r_eff);
                        }
                    }
                }
                let med = |v: &mut Vec<f64>| -> f64 {
                    if v.is_empty() {
                        return f64::NAN;
                    }
                    v.sort_by(|a, b| a.partial_cmp(b).unwrap());
                    v[v.len() / 2]
                };
                let dstr: String = deaths
                    .iter()
                    .map(|(k, v)| format!("{k}:{v}"))
                    .collect::<Vec<_>>()
                    .join(" ");
                println!(
                    "[{name:>10}] {:>4} {:>4}  {:>5} {:>6} | {:>10} {:>4} {:>3} {:>3} | {:>11.2} {:>11.2} {:>7.2} | {:>6.1} | {}",
                    mlvl.skip,
                    nb,
                    alive_v,
                    alive_e,
                    beats_v[0],
                    beats_v[1],
                    beats_v[2],
                    beats_v[3],
                    med(&mut dv_best),
                    med(&mut de_best),
                    med(&mut der_cost),
                    med(&mut spreads),
                    dstr,
                );
            }
        }
    }
}

#[cfg(test)]
mod debug_tests {
    use super::*;

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
        }
        v
    }

    #[test]
    #[ignore = "debug probe"]
    fn matc1_debug_dead_block() {
        let orbit = ref_orbit_f64(-0.75, 0.0, 200);
        let lcmax = -40.0;
        let pre = matc1_precompute(&orbit, 1, 64, lcmax);
        println!(
            "block tail E = 2^{:.1}, scale = {}",
            pre.blk.log2_tail, pre.blk.log2_scale
        );
        println!(
            "A_blk 2^{:.1}  B_blk 2^{:.1}",
            pre.log2_a_blk, pre.log2_b_blk
        );
        let ly = lcmax;
        let mut lr = f64::NEG_INFINITY;
        for j in 0..pre.la.len() {
            let theta = lr - pre.la[j];
            let lgap = pre.la[j] + (1.0 - theta.exp2()).log2();
            let lr_next = lse(&[pre.la[j] + lr, 2.0 * lr, ly]);
            let w_pade = pre.la[j] + lse(&[pre.la[j] + lr, ly]) - lgap;
            let m_pade = lsub(pre.dlow[j + 1], &[pre.cup[j + 1] + w_pade]);
            if j % 8 == 0 || m_pade == f64::NEG_INFINITY {
                println!(
                    "j={j:2} la={:6.2} lr={:8.1} dlow={:8.1} cup={:8.1} W={:8.1} m_pade={:8.1} det_s={:8.1}",
                    pre.la[j], lr, pre.dlow[j + 1], pre.cup[j + 1], w_pade, m_pade,
                    pre.det_scaled[j + 1]
                );
            }
            if m_pade == f64::NEG_INFINITY {
                println!("DEAD at j={j}");
                break;
            }
            lr = lr_next;
        }
    }
}
