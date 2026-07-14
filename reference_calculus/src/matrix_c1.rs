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
    if !matc1_matrix_error_terms(&pre.blk, lx, ly, &mut terms) {
        return f64::INFINITY;
    }
    lse(&terms)
}

/// E_matrix terms shared by the euclidean and hyperbolic value routes:
/// truncation majorant p = E(R+1) against the uniform margin μ
/// (matrixC1EvalMajorantOf), scaled frame, frame-invariant ratios. Pushes the
/// two terms into `terms`; returns false when a margin dies (p ≥ μ or μ dead).
fn matc1_matrix_error_terms(b: &MatC1, lx: f64, ly: f64, terms: &mut Vec<f64>) -> bool {
    let p = b.log2_tail + lse(&[lx, 0.0]);
    let mu = lsub(
        l2(&b.m0.d),
        &[ly + l2(&b.m1.d), lse(&[l2(&b.m0.c), ly + l2(&b.m1.c)]) + lx],
    );
    if p.is_finite() || mu == f64::NEG_INFINITY {
        if mu == f64::NEG_INFINITY || p >= mu {
            return false;
        }
        let m_minus_p = lsub(mu, &[p]);
        let nu = lse(&[
            lse(&[l2(&b.m0.a), ly + l2(&b.m1.a)]) + lx,
            lse(&[l2(&b.m0.b), ly + l2(&b.m1.b)]),
        ]);
        terms.push(p - m_minus_p);
        terms.push(nu + p - m_minus_p - mu);
    }
    true
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

// ── matrix-c2 ghost (§3, MANDELBROT_DIRECTIONS_MATHEMATIQUES_EXPLORATOIRES) ─────
//
// The builder temporarily carries M(c) = M0 + c·M1 + c²·M2 + R₃(c); the shader
// model stays M0 + c·M1 and its c²⁺ tail is certified by the GHOST as
//
//   ‖M(c) − (M0 + c·M1)‖ ≤ y²·‖M2‖ + E₃(y),
//
// which keeps the phase cancellations of the dominant omitted order (M2 is the
// EXACT complex coefficient sum, not a triangle-inequality scalar), against the
// scalar E₂ that the MatC1 merge accumulates. The higher model is never a
// safety hypothesis: M2 only provides the exact center of the first omitted
// terms, and the independent analytic queue E₃ bounds what remains. The merge
// rule mirrors matrixC1_comp_tail_le one order up (late = OUTER, same
// asymmetry caution as MatC1::merge); its Lean twin is an OPEN obligation —
// census-grade for now, like matc1_deriv_error_log2.

/// Ghost second-order block: M(c) ≈ m0 + c·m1 + c²·m2 in the 2^log2_scale
/// frame, with the certified c³⁺ tail ‖exact/Λ − (m0+c·m1+c²·m2)‖ ≤ 2^log2_tail3
/// on |c| ≤ y. Build-only: never serialized, no GPU slot (§3.4 step 6).
#[derive(Clone, Copy, Debug)]
pub struct MatC2 {
    pub m0: HomFe,
    pub m1: HomFe,
    pub m2: HomFe,
    /// log2 of the certified entryNorm c³⁺ tail bound E₃ (scaled frame, y-keyed).
    pub log2_tail3: f64,
    /// Accumulated normalization Λ (log2, exact integer shifts).
    pub log2_scale: i64,
}

impl MatC2 {
    pub const ONE: MatC2 = MatC2 {
        m0: HomFe::ONE,
        m1: HomFe::ZERO,
        m2: HomFe::ZERO,
        log2_tail3: f64::NEG_INFINITY,
        log2_scale: 0,
    };

    /// One-step seed: M_j(c) = [[a², a·c], [−1, a]] is exact at order 1 —
    /// zero M2, zero tail.
    pub fn step_seed(ax: f64, ay: f64) -> MatC2 {
        let c1 = MatC1::step_seed(ax, ay);
        MatC2 {
            m0: c1.m0,
            m1: c1.m1,
            m2: HomFe::ZERO,
            log2_tail3: f64::NEG_INFINITY,
            log2_scale: 0,
        }
    }

    /// entryNorm(M0) + y·entryNorm(M1) + y²·entryNorm(M2), log2.
    pub fn log2_eval_norm(&self, log2_y: f64) -> f64 {
        lse(&[
            self.m0.log2_entry_norm(),
            log2_y + self.m1.log2_entry_norm(),
            2.0 * log2_y + self.m2.log2_entry_norm(),
        ])
    }

    /// Merge two children, late = OUTER (chronologically later). Polynomial
    /// truncation at order 2:
    ///   K0 = L0·E0, K1 = L0·E1 + L1·E0, K2 = L0·E2 + L1·E1 + L2·E0,
    /// and the discarded ≥c³ product terms feed the tail exactly:
    ///   E₃_K = E₃L·(‖E‖_y + E₃E) + ‖L‖_y·E₃E
    ///        + y³·‖L1·E2 + L2·E1‖ + y⁴·‖L2·E2‖.
    /// Same decomposition as MatC1::merge one order up; the role-swapped
    /// formula would also be true but is NOT the mirrored one — keep the
    /// asymmetry.
    pub fn merge(late: &MatC2, early: &MatC2, log2_y: f64) -> MatC2 {
        let m0 = HomFe::comp(&late.m0, &early.m0);
        let m1 = HomFe::comp(&late.m0, &early.m1).add(&HomFe::comp(&late.m1, &early.m0));
        let m2 = HomFe::comp(&late.m0, &early.m2)
            .add(&HomFe::comp(&late.m1, &early.m1))
            .add(&HomFe::comp(&late.m2, &early.m0));
        let cross3 = HomFe::comp(&late.m1, &early.m2).add(&HomFe::comp(&late.m2, &early.m1));
        let cross4 = HomFe::comp(&late.m2, &early.m2);
        let log2_tail3 = lse(&[
            late.log2_tail3 + lse(&[early.log2_eval_norm(log2_y), early.log2_tail3]),
            late.log2_eval_norm(log2_y) + early.log2_tail3,
            3.0 * log2_y + cross3.log2_entry_norm(),
            4.0 * log2_y + cross4.log2_entry_norm(),
        ]);
        let mut out = MatC2 {
            m0,
            m1,
            m2,
            log2_tail3,
            log2_scale: late.log2_scale + early.log2_scale,
        };
        out.normalize();
        out
    }

    /// Projective power-of-two normalization over M0, M1, M2 and E₃ together
    /// (exact shifts) — same invariance family as MatC1::normalize.
    pub fn normalize(&mut self) {
        let m = self
            .m0
            .max_entry_log2()
            .max(self.m1.max_entry_log2())
            .max(self.m2.max_entry_log2());
        if !m.is_finite() {
            return;
        }
        let k = m.round() as i64;
        if k == 0 {
            return;
        }
        self.m0.shift_exp(k);
        self.m1.shift_exp(k);
        self.m2.shift_exp(k);
        if self.log2_tail3.is_finite() {
            self.log2_tail3 -= k as f64;
        }
        self.log2_scale += k;
    }

    /// Ghost-certified c²⁺ tail of the C1 view (what the shader would
    /// evaluate): ‖M(c) − (M0 + c·M1)‖ ≤ y²·‖M2‖ + E₃ — the §3.1 bound.
    pub fn log2_c1_tail(&self, log2_y: f64) -> f64 {
        lse(&[2.0 * log2_y + self.m2.log2_entry_norm(), self.log2_tail3])
    }

    /// C1 view of the ghost: same coefficients, ghost-certified tail. Feeds
    /// the UNCHANGED MatC1 value/derivative certificates.
    pub fn to_c1(&self, log2_y: f64) -> MatC1 {
        MatC1 {
            m0: self.m0,
            m1: self.m1,
            log2_tail: self.log2_c1_tail(log2_y),
            log2_scale: self.log2_scale,
        }
    }
}

/// Ghost mirror of matc1_build_levels — same block geometry, MatC2 payload.
pub fn matc2_build_levels(
    orbit: &[(f64, f64)],
    max_skip: usize,
    log2_c_max: f64,
) -> Vec<(usize, Vec<MatC2>)> {
    let orbit_len = orbit.len();
    let mut out = Vec::new();
    if orbit_len < 3 {
        return out;
    }
    let mut prev: Vec<MatC2> = (1..orbit_len)
        .map(|i| MatC2::step_seed(2.0 * orbit[i].0, 2.0 * orbit[i].1))
        .collect();
    out.push((1usize, prev.clone()));
    let mut skip = 1usize;
    while skip < max_skip && skip * 2 < orbit_len {
        let n = prev.len() / 2;
        if n == 0 {
            break;
        }
        let cur: Vec<MatC2> = (0..n)
            .map(|i| MatC2::merge(&prev[2 * i + 1], &prev[2 * i], log2_c_max))
            .collect();
        skip *= 2;
        out.push((skip, cur.clone()));
        prev = cur;
    }
    out
}

/// Ghost mirror of matc1_precompute: identical suffix walk over MatC2 blocks,
/// producing a MatC1Pre whose tails are ghost-certified. Per-entry suffix
/// bounds use the ghost's own entries (|D0| − y|D1| − y²|D2| − E₃ etc. — E₃ is
/// an entryNorm bound, hence a per-entry one); the block tail becomes
/// y²‖M2‖ + E₃. Everything downstream (value, direct ∂z, Cauchy, radii solve)
/// is reused verbatim: the ghost only tightens numbers, never changes the
/// certificate shape (§3.4 steps 4–5).
pub fn matc2_precompute(orbit: &[(f64, f64)], first: usize, skip: usize, log2_y: f64) -> MatC1Pre {
    let len = skip;
    let la: Vec<f64> = (0..len)
        .map(|j| {
            let (zx, zy) = orbit[first + j];
            (2.0 * (zx * zx + zy * zy).sqrt()).log2()
        })
        .collect();
    // Balanced segment tree — same geometry and rationale as matc1_precompute.
    let mut tree: Vec<Vec<MatC2>> = Vec::new();
    tree.push(
        (0..len)
            .map(|j| {
                let (zx, zy) = orbit[first + j];
                MatC2::step_seed(2.0 * zx, 2.0 * zy)
            })
            .collect(),
    );
    while tree.last().unwrap().len() > 1 {
        let prev = tree.last().unwrap();
        let cur: Vec<MatC2> = (0..prev.len() / 2)
            .map(|i| MatC2::merge(&prev[2 * i + 1], &prev[2 * i], log2_y))
            .collect();
        tree.push(cur);
    }
    let blk = *tree.last().unwrap().first().unwrap_or(&MatC2::ONE);
    let compose_suffix = |j0: usize| -> MatC2 {
        let mut acc = MatC2::ONE;
        let mut j = j0;
        while j < len {
            let mut lev = 0usize;
            while lev + 1 < tree.len() && j % (1 << (lev + 1)) == 0 && j + (1 << (lev + 1)) <= len {
                lev += 1;
            }
            let seg = &tree[lev][j >> lev];
            acc = if j == j0 {
                *seg
            } else {
                MatC2::merge(seg, &acc, log2_y)
            };
            j += 1 << lev;
        }
        acc
    };
    let mut dlow = vec![f64::NEG_INFINITY; len + 1];
    let mut cup = vec![f64::NEG_INFINITY; len + 1];
    let mut dup = vec![f64::NEG_INFINITY; len + 1];
    let mut det_scaled = vec![f64::NEG_INFINITY; len + 1];
    dlow[len] = 0.0;
    cup[len] = f64::NEG_INFINITY;
    dup[len] = 0.0;
    det_scaled[len] = 0.0;
    let mut det_abs = 0.0f64;
    let mut log2_a = 0.0f64;
    let mut log2_b = f64::NEG_INFINITY;
    for j in (0..len).rev() {
        log2_b = lse(&[log2_a, log2_b]);
        log2_a += la[j];
        det_abs += la[j] + lse(&[2.0 * la[j], log2_y]);
        let suffix = compose_suffix(j);
        let ld0 = l2(&suffix.m0.d);
        dlow[j] = lsub(
            ld0,
            &[
                log2_y + l2(&suffix.m1.d),
                2.0 * log2_y + l2(&suffix.m2.d),
                suffix.log2_tail3,
            ],
        );
        cup[j] = lse(&[
            l2(&suffix.m0.c),
            log2_y + l2(&suffix.m1.c),
            2.0 * log2_y + l2(&suffix.m2.c),
            suffix.log2_tail3,
        ]);
        dup[j] = lse(&[
            ld0,
            log2_y + l2(&suffix.m1.d),
            2.0 * log2_y + l2(&suffix.m2.d),
            suffix.log2_tail3,
        ]);
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
        blk: blk.to_c1(log2_y),
        log2_y,
    }
}

// ── hyperbolic Padé certificate (§2, same doc; Lean: HyperbolicTelescope.lean,
//    SchwarzPick.lean, MovingDisks.lean) ─────────────────────────────────────────
//
// Second, independent value certificate for the SAME non-autonomous Padé chain:
// instead of transporting each local defect by the exact suffix homography
// (det/(m_pade·m_exact) — the euclidean E_pade), put moving disks
// D_j = D(0, ρ_j) around both paths in the δ frame and use Schwarz–Pick: the
// exact step F_j(δ) = a_j·δ + δ² + c is entire and maps D_j into D_{j+1} by
// the same envelope recurrence, hence is nonexpansive for the disk hyperbolic
// metrics (DiskFrame.schwarzPick). Local Padé defects convert to
// pseudohyperbolic defects (DiskFrame.pseudoDist_le_of_interior:
// δ_j = eps_j/(ρ_{j+1}(1−q²))), accumulate ADDITIVELY
// (RuntimeMetric.moving_error_telescope_zero), and convert back once at the
// exit (DiskFrame.norm_sub_le_of_pseudoDist_le: ‖err‖ ≤ ρ_L(1+q_L²)·δ_total).
// The product of chain factors is paid once, inside ρ_L/ρ_{j+1}, instead of
// through per-suffix denominator margins and det bookkeeping.
//
// tanh subadditivity closes the telescope without transcendentals:
//   pseudo_total = tanh(Σ_j artanh δ_j) ≤ Σ_j δ_j          (δ_j < 1 checked).
// Lean bridging notes: the proven Schwarz–Pick uses OPEN balls; the closed
// envelope image passes by radius continuity of pseudoDist (an open
// obligation, census-grade), and the interior margins q < 1 keep every point
// strictly inside its disk.

/// Domain-inflation grid (log2 κ): ρ_0 = κ·(R + y). Small κ keeps the exit
/// disk (and its expansion) small; large κ shrinks every conversion margin
/// q = r̂/ρ. The doc requires disks and margins optimized JOINTLY — a grid
/// min stands in for the joint optimization at census stage.
pub const HYP_KAPPA_GRID_LOG2: [f64; 8] = [0.5, 1.0, 2.0, 3.0, 4.0, 6.0, 8.0, 12.0];

/// Hyperbolic value-error bound at log2 R = lx and domain inflation lkappa:
/// E_hyp (Schwarz–Pick telescope) + E_matrix (identical truncation majorant —
/// the stored M0+c·M1 versus the exact Padé product is NOT a shadowing term).
/// Returns +∞ when any margin dies (model pole, q ≥ 1, δ_j ≥ 1, p ≥ μ).
pub fn matc1_value_error_hyp_log2(pre: &MatC1Pre, lx: f64, lkappa: f64) -> f64 {
    let len = pre.la.len();
    let ly = pre.log2_y;
    // Moving disks D_j = D(0, ρ_j); r̂_j envelopes BOTH paths (exact and Padé:
    // the local defect is folded into the walk, so r̂ ≥ r_exact pointwise).
    let mut lrho = lkappa + lse(&[lx, ly]);
    if !lrho.is_finite() {
        return f64::INFINITY;
    }
    let mut lrhat = lx;
    let mut lq_last = lrhat - lrho;
    let mut deltas: Vec<f64> = Vec::with_capacity(len);
    for j in 0..len {
        if !pre.la[j].is_finite() {
            return f64::INFINITY;
        }
        // Model pole margin r̂_j < |a_j| (the Padé step's only singularity;
        // the exact step is a polynomial and needs no margin).
        let theta = lrhat - pre.la[j];
        if theta >= -1e-9 {
            return f64::INFINITY;
        }
        let lgap = pre.la[j] + (1.0 - theta.exp2()).log2();
        // Local defect |u − v| ≤ r̂(r̂² + y)/(|a_j| − r̂) on |w| ≤ r̂_j — the
        // same u = padeSeed, v = exactStep bound the euclidean route uses.
        let leps = lrhat + lse(&[2.0 * lrhat, ly]) - lgap;
        // Envelope step for both radii: |a|·ρ + ρ² + y (exactStepOutputBound);
        // the path envelope additionally absorbs the model defect.
        let lrho_next = lse(&[pre.la[j] + lrho, 2.0 * lrho, ly]);
        let lrhat_next = lse(&[pre.la[j] + lrhat, 2.0 * lrhat, ly, leps]);
        // Interior margin q_{j+1} = r̂_{j+1}/ρ_{j+1} < 1 (both points of the
        // defect pair lie within q·ρ — pseudoDist_le_of_interior's hz/hw).
        let lq = lrhat_next - lrho_next;
        if lq >= -1e-9 {
            return f64::INFINITY;
        }
        // δ_j = eps_j / (ρ_{j+1}·(1 − q²)).
        let l1mq2 = (1.0 - (2.0 * lq).exp2()).log2();
        let ldelta = leps - lrho_next - l1mq2;
        // artanh domain: a local defect spanning the disk kills the telescope.
        if ldelta >= 0.0 {
            return f64::INFINITY;
        }
        if ldelta.is_finite() {
            deltas.push(ldelta);
        }
        lrho = lrho_next;
        lrhat = lrhat_next;
        lq_last = lq;
    }
    let mut terms: Vec<f64> = Vec::with_capacity(3);
    // Exit conversion: ‖err‖ ≤ ρ_L·(1 + q_L²)·δ_total, both endpoints within
    // q_L·ρ_L (exact ≤ r ≤ r̂, model ≤ r̂ by construction of the walk), with
    // δ_total the exact Möbius fold tanh(Σ artanh δ_j) — equals the plain sum
    // to first order in the tiny-defect regime, tighter when defects grow.
    let ltot = fold_pseudo_log2(&deltas);
    if ltot.is_finite() {
        let l1pq2 = (1.0 + (2.0 * lq_last).exp2()).log2();
        terms.push(lrho + l1pq2 + ltot);
    }
    if !matc1_matrix_error_terms(&pre.blk, lx, ly, &mut terms) {
        return f64::INFINITY;
    }
    lse(&terms)
}

/// Best hyperbolic bound over the κ grid (each κ is independently sound —
/// min is sound).
pub fn matc1_value_error_hyp_best_log2(pre: &MatC1Pre, lx: f64) -> f64 {
    HYP_KAPPA_GRID_LOG2
        .iter()
        .map(|&k| matc1_value_error_hyp_log2(pre, lx, k))
        .fold(f64::INFINITY, f64::min)
}

/// Radii with the hyperbolic route alongside the euclidean one. The combined
/// value radius certifies with EITHER route (union of two prefix success sets
/// is a prefix — each route keeps its own convexity + x = 0 gate), i.e. the
/// emitted radius is max(r_euclid, r_hyp) as §2.6 step 3 prescribes. The
/// derivative keeps the euclidean direct ∂z first, then Cauchy fed by the
/// min of the two value bounds on the outer disk (both are uniform bounds
/// over |δ0| ≤ R_out, so their min is a valid Cauchy numerator).
pub struct MatC1HypRadii {
    pub log2_r_value_euclid: f64,
    pub log2_r_value_hyp: f64,
    /// Combined value radius (≥ both routes).
    pub log2_r_value: f64,
    /// Combined value + derivative — the min(r, r′) the pipeline would ship.
    pub log2_r_eff: f64,
    /// Winning κ (log2) at the hyperbolic value radius — census diagnostics.
    pub best_kappa_log2: f64,
}

pub fn matc1_solve_radii_hyp(pre: &MatC1Pre, epsilon: f64, log2_c_max: f64) -> MatC1HypRadii {
    let l2half_eps = epsilon.log2() - 1.0;
    let rhs = |lx: f64| l2half_eps + lse(&[pre.log2_a_blk + lx, pre.log2_b_blk + log2_c_max]);
    let value_e = |lx: f64| matc1_value_error_log2(pre, lx) <= rhs(lx);
    let value_h = |lx: f64| matc1_value_error_hyp_best_log2(pre, lx) <= rhs(lx);
    let der_ok = |lx: f64| -> bool {
        if lx == f64::NEG_INFINITY {
            return true;
        }
        let budget = l2half_eps + pre.log2_a_blk;
        if matc1_deriv_error_log2(pre, lx) <= budget {
            return true;
        }
        for g in CAUCHY_GAPS_LOG2 {
            let lx_out = lx + g;
            let m = matc1_value_error_log2(pre, lx_out)
                .min(matc1_value_error_hyp_best_log2(pre, lx_out));
            if !m.is_finite() {
                continue;
            }
            let lgap = lx + (g.exp2() - 1.0).log2();
            if m - lgap <= budget {
                return true;
            }
        }
        false
    };
    let top = pre.la.iter().cloned().fold(f64::INFINITY, f64::min) - 0.1;
    const FLOOR: f64 = -53.150_849_518_197_8; // 1e-16, the (V) scan floor
    let dead = MatC1HypRadii {
        log2_r_value_euclid: f64::NEG_INFINITY,
        log2_r_value_hyp: f64::NEG_INFINITY,
        log2_r_value: f64::NEG_INFINITY,
        log2_r_eff: f64::NEG_INFINITY,
        best_kappa_log2: f64::NAN,
    };
    if !top.is_finite() {
        return dead;
    }
    // Per-route x = 0 gates (each emitted radius covers its whole interval).
    let gate_e = value_e(f64::NEG_INFINITY);
    let gate_h = value_h(f64::NEG_INFINITY);
    if !gate_e && !gate_h {
        return dead;
    }
    let r_e = if gate_e {
        bisect_last_success(top, FLOOR, |x| value_e(x))
    } else {
        f64::NEG_INFINITY
    };
    let r_h = if gate_h {
        bisect_last_success(top, FLOOR, |x| value_h(x))
    } else {
        f64::NEG_INFINITY
    };
    let value_both = |lx: f64| (gate_e && value_e(lx)) || (gate_h && value_h(lx));
    let r_v = bisect_last_success(top, FLOOR, value_both);
    let r_eff = bisect_last_success(top, FLOOR, |x| value_both(x) && der_ok(x));
    let best_kappa = if r_h.is_finite() {
        let rhs_h = rhs(r_h);
        HYP_KAPPA_GRID_LOG2
            .iter()
            .cloned()
            .find(|&k| matc1_value_error_hyp_log2(pre, r_h, k) <= rhs_h)
            .unwrap_or(f64::NAN)
    } else {
        f64::NAN
    };
    MatC1HypRadii {
        log2_r_value_euclid: r_e,
        log2_r_value_hyp: r_h,
        log2_r_value: r_v,
        log2_r_eff: r_eff,
        best_kappa_log2: best_kappa,
    }
}

/// Exact pseudohyperbolic fold of local defects (log2 in, log2 out):
/// δ_total = tanh(Σ artanh δ_j), computed by the Möbius addition
/// δ ← (δ + η)/(1 + δη). Always ≤ the plain sum (which is the first-order
/// expansion), so returning min(fold, sum) is sound; below sum = 2⁻⁴ the two
/// differ by < 0.1 % and the lse sum is returned directly — it cannot
/// underflow, unlike the linear fold at extreme depths.
fn fold_pseudo_log2(ldeltas: &[f64]) -> f64 {
    let lsum = lse(ldeltas);
    if lsum <= -4.0 || !lsum.is_finite() {
        return lsum;
    }
    let mut t = 0.0f64;
    for l in ldeltas {
        let d = l.exp2();
        t = (t + d) / (1.0 + t * d);
        if t >= 1.0 {
            return 0.0; // saturated: the whole disk — vacuous but sound
        }
    }
    t.log2().min(lsum)
}

// ── oracle de phase (§2.7 suite): frames décentrées exactes, NON certifié ──────
//
// The centered-disk route lost because scalar envelopes ρ_j see only |a_j| —
// two chains with identical moduli and opposite phases get the same bound.
// The remaining §2.1–2.2 variant transports DISKS exactly by the complex
// homographies: centre = (p·conj(q) − A·conj(C)R²)/Δ, R' = |det|·R/Δ — these
// depend on the composed complex entries and keep every phase cancellation.
// Before committing to certified merges, this oracle measures whether phase
// recovery ALONE can close the euclidean deficit:
//
//   N_{j+1} = P_j(N_j)                       (model-reachable disk, minimal)
//   D_{j+1} = inflate(P_j(D_j), κ·ε_j(D))    (ambient disk holding BOTH paths)
//   ε_j(S)  = sup_{w∈S} |F_j(w) − P_j(w)| ≤ s(s² + |c|)/(|a_j| − s),
//             s = |ζ_S| + R_S                (F − P = −w(w²+c)/(a−w))
//
// Defect pairs (P_j(w), F_j(w)), w on the model path ⊆ N_j, convert in the
// D_{j+1} frame with the honest interior radius (|ζN−ζD| + R_N + ε_j(N))/R_D
// — the N/D gap accumulates the transported inflations, which is what keeps
// q away from 1 as the walk deepens. Defects fold by the exact Möbius
// addition; exit by the simple bound ‖err‖ ≤ 2·R_D·δ_total.
//
// NOT a certificate: the transport is evaluated at SAMPLED concrete c (the
// c-uniform disk transport is precisely what the full chantier would prove)
// and κ replaces the joint inflation optimization. The oracle only answers:
// does the phase suffice?

fn cfe_conj(v: CFe) -> CFe {
    CFe {
        x: v.x,
        y: -v.y,
        e: v.e,
    }
}

/// |v|² as a real CFe (exact exponent bookkeeping, no overflow).
fn cfe_norm2(v: CFe) -> CFe {
    v.mul(cfe_conj(v))
}

/// Positive real CFe from a log2 magnitude (−∞ → 0).
fn cfe_real_from_log2(l: f64) -> CFe {
    if !l.is_finite() {
        return CFe::ZERO;
    }
    let fl = l.floor();
    let mut v = CFe::from_c((l - fl).exp2(), 0.0);
    v.e += fl as i64;
    v
}

/// Exact Möbius image of the disk (ζ, 2^lr) under P = [[a², a·c],[−1, a]]:
/// Some((centre_image, log2 rayon_image)), None when the pole margin Δ ≤ 0.
fn mobius_disk_image(a: CFe, c: CFe, zeta: CFe, lr: f64) -> Option<(CFe, f64)> {
    let ma = a.mul(a);
    let mb = a.mul(c);
    let mc = CFe::from_c(-1.0, 0.0);
    let md = a;
    let r2 = cfe_real_from_log2(2.0 * lr);
    let q = mc.mul(zeta).add(md);
    let p = ma.mul(zeta).add(mb);
    // Δ = |q|² − |C|²R² (|C| = 1). Real by construction; sign decides the pole.
    let delta = cfe_norm2(q).sub(cfe_norm2(mc).mul(r2));
    if delta.x <= 0.0 || delta.is_zero() {
        return None;
    }
    let centre = p
        .mul(cfe_conj(q))
        .sub(ma.mul(cfe_conj(mc)).mul(r2))
        .div(delta);
    let det = ma.mul(md).sub(mb.mul(mc));
    let lr_img = l2(&det) + lr - l2(&delta);
    Some((centre, lr_img))
}

/// Oracle value-error bound at log2 R = lx, concrete c = (ccx, ccy), ambient
/// inflation ε_j(D) + 2^lmu·R per step — RELATIVE inflation: an absolute κ·ε
/// margin gives 1−q² ≈ κε/R (vanishing) and the per-step δ saturates; the
/// relative μ·R term guarantees a constant interior margin 1−q² ≳ 2μ at a
/// total bloat (1+μ)^L/μ, optimal near μ ≈ 1/L (the joint disk/margin
/// optimization of §2.4, grid-sampled). The exit ratio R_D(L)/R_D(j+1) then
/// carries the EXACT conformal expansion of the composed homography — the
/// phase-aware chain factor this oracle exists to measure.
/// The COMPLEX a_j come from the orbit slice (pre only stores moduli); pre
/// supplies E_matrix and the budget frame. E_matrix is added unchanged (the
/// stored truncation is not a shadowing term). Returns +∞ when a margin dies
/// (pole, q ≥ 1, δ ≥ 1).
pub fn matc1_phase_oracle_error_log2(
    orbit: &[(f64, f64)],
    first: usize,
    pre: &MatC1Pre,
    lx: f64,
    ccx: f64,
    ccy: f64,
    lmu: f64,
) -> f64 {
    let len = pre.la.len();
    let c = CFe::from_c(ccx, ccy);
    let lc = l2(&c);
    // N: model-reachable frame; D: ambient frame holding both paths.
    let (mut zn, mut lrn) = (CFe::ZERO, lx);
    let (mut zd, mut lrd) = (CFe::ZERO, lx);
    let mut deltas: Vec<f64> = Vec::with_capacity(len);
    for j in 0..len {
        if !pre.la[j].is_finite() {
            return f64::INFINITY;
        }
        let la = pre.la[j];
        let (zx, zy) = orbit[first + j];
        let a = CFe::from_c(2.0 * zx, 2.0 * zy);
        // Local defect radii on each frame: ε(S) = s(s²+|c|)/(|a|−s),
        // s = |ζ_S| + R_S, valid while s < |a| (the Padé pole margin).
        let leps_of = |zeta: &CFe, lr: f64| -> Option<f64> {
            let ls = lse(&[l2(zeta), lr]);
            let theta = ls - la;
            if theta >= -1e-9 {
                return None;
            }
            let lgap = la + (1.0 - theta.exp2()).log2();
            Some(ls + lse(&[2.0 * ls, lc]) - lgap)
        };
        let leps_n = match leps_of(&zn, lrn) {
            Some(v) => v,
            None => return f64::INFINITY,
        };
        let leps_d = match leps_of(&zd, lrd) {
            Some(v) => v,
            None => return f64::INFINITY,
        };
        // Exact Möbius transport of both frames (phase lives here).
        let (zn2, lrn2) = match mobius_disk_image(a, c, zn, lrn) {
            Some(v) => v,
            None => return f64::INFINITY,
        };
        let (zd2, lrd2) = match mobius_disk_image(a, c, zd, lrd) {
            Some(v) => v,
            None => return f64::INFINITY,
        };
        // Ambient inflation: D_{j+1} ⊇ P_j(D_j) + 2ε_j(D) + μ·R ⊇ F_j(D_j).
        // The μ·R term buys the constant relative interior margin once the
        // disk is grown; the doubled ε keeps q ≤ ~½ in the point-disk regime
        // (x = 0 gate: R starts at 0 and μ·R with it).
        let lrd_new = lse(&[lrd2, 1.0 + leps_d, lmu + lrd2]);
        // Defect pair (P_j(w), F_j(w)), w on the model path ⊆ N_j: both sit
        // within |ζN−ζD| + R_N + ε_j(N) of the D centre. The N/D gap carries
        // the transported inflations — the margin that keeps q < 1.
        if leps_n.is_finite() {
            let lnum = lse(&[l2(&zn2.sub(zd2)), lrn2, leps_n]);
            let lq = lnum - lrd_new;
            if lq >= -1e-12 {
                return f64::INFINITY;
            }
            let l1mq2 = (1.0 - (2.0 * lq).exp2()).log2();
            let ldelta = leps_n - lrd_new - l1mq2;
            if ldelta >= 0.0 {
                return f64::INFINITY;
            }
            deltas.push(ldelta);
        }
        zn = zn2;
        lrn = lrn2;
        zd = zd2;
        lrd = lrd_new;
    }
    let mut terms: Vec<f64> = Vec::with_capacity(3);
    // Exit: ‖err‖ ≤ 2·R_D·δ_total (q ≤ 1 form of the pseudo→euclid bound).
    let ltot = fold_pseudo_log2(&deltas);
    if ltot.is_finite() {
        terms.push(1.0 + lrd + ltot);
    }
    if !matc1_matrix_error_terms(&pre.blk, lx, pre.log2_y, &mut terms) {
        return f64::INFINITY;
    }
    lse(&terms)
}

/// μ grid for the oracle's relative inflation (log2). The (1+μ)^L/μ overhead
/// is minimized near μ ≈ 1/L, so the grid spans the census skip range.
pub const ORACLE_MU_GRID_LOG2: [f64; 8] = [-1.0, -2.0, -4.0, -6.0, -8.0, -10.0, -12.0, -14.0];

/// Sampled c phases on |c| = c_max (the c-uniformity the full chantier would
/// have to certify — here a proxy: the bound must hold at every sample).
pub const ORACLE_C_PHASES: [(f64, f64); 4] = [(1.0, 0.0), (0.0, 1.0), (-1.0, 0.0), (0.0, -1.0)];

/// Oracle radius: largest R whose oracle bound clears the (V) value budget at
/// EVERY sampled c for SOME κ. Value-only (compare against log2_r_value).
pub fn matc1_phase_oracle_radius(
    orbit: &[(f64, f64)],
    first: usize,
    pre: &MatC1Pre,
    epsilon: f64,
    log2_c_max: f64,
) -> f64 {
    let l2half_eps = epsilon.log2() - 1.0;
    let rhs = |lx: f64| l2half_eps + lse(&[pre.log2_a_blk + lx, pre.log2_b_blk + log2_c_max]);
    let y = log2_c_max.exp2();
    let ok = |lx: f64| -> bool {
        ORACLE_MU_GRID_LOG2.iter().any(|&m| {
            ORACLE_C_PHASES.iter().all(|&(px, py)| {
                matc1_phase_oracle_error_log2(orbit, first, pre, lx, px * y, py * y, m) <= rhs(lx)
            })
        })
    };
    if !ok(f64::NEG_INFINITY) {
        return f64::NEG_INFINITY;
    }
    let top = pre.la.iter().cloned().fold(f64::INFINITY, f64::min) - 0.1;
    const FLOOR: f64 = -53.150_849_518_197_8;
    if !top.is_finite() {
        return f64::NEG_INFINITY;
    }
    bisect_last_success(top, FLOOR, ok)
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

    #[test]
    fn matc2_tail_bounds_sound_and_frame_consistent() {
        // Ghost twin of matc1_tail_bound_sound: the exact product, brought
        // into the stored frame, must sit under BOTH certified tails — the
        // c³⁺ tail against the full C2 view, and the ghost-certified c²⁺ tail
        // (y²‖M2‖ + E₃) against the C1 view the shader would evaluate.
        // Shallow y only, same measurement-noise rationale as the C1 test.
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
            let levels = matc2_build_levels(&orbit, 64, lcmax);
            let y = lcmax.exp2();
            for (ci, (ccx, ccy)) in [(y, 0.0), (-y, 0.0), (0.6 * y, -0.7 * y), (0.0, 0.99 * y)]
                .iter()
                .enumerate()
            {
                let c = CFe::from_c(*ccx, *ccy);
                let c2 = c.mul(c);
                for (skip, blocks) in &levels {
                    if *skip < 4 || *skip > 64 {
                        continue;
                    }
                    for (s, blk) in blocks.iter().enumerate().take(8) {
                        let first = 1 + s * skip;
                        let mut exact = HomFe::ONE;
                        for j in 0..*skip {
                            let (zx, zy) = orbit[first + j];
                            exact = HomFe::comp(&step_exact(2.0 * zx, 2.0 * zy, c), &exact);
                        }
                        // entryNorm(exact/Λ − (M0 + c·M1 + c²·M2)), log2.
                        let ev2 = |m0: &CFe, m1: &CFe, m2: &CFe, ex: &CFe| {
                            let mut e = *ex;
                            if !e.is_zero() {
                                e.e -= blk.log2_scale;
                            }
                            e.sub(m0.add(c.mul(*m1)).add(c2.mul(*m2)))
                        };
                        let l3 = lse(&[
                            l2(&ev2(&blk.m0.a, &blk.m1.a, &blk.m2.a, &exact.a)),
                            l2(&ev2(&blk.m0.b, &blk.m1.b, &blk.m2.b, &exact.b)),
                            l2(&ev2(&blk.m0.c, &blk.m1.c, &blk.m2.c, &exact.c)),
                            l2(&ev2(&blk.m0.d, &blk.m1.d, &blk.m2.d, &exact.d)),
                        ]);
                        // Short blocks have an EXACTLY zero c³⁺ tail (any
                        // triple of M1 insertions in ≤4 consecutive factors
                        // contains an adjacent pair, and M1_j·M1_k = 0), so
                        // the referee's own CFe rounding (~2^−52·len) is the
                        // measurement floor — same rationale as the shallow-y
                        // restriction above.
                        assert!(
                            l3 <= blk.log2_tail3.max(-46.0) + 1e-6 || l3 == f64::NEG_INFINITY,
                            "[{name}] c#{ci} skip {skip} slot {s}: c³⁺ tail 2^{l3:.2} \
                             over certified 2^{:.2}",
                            blk.log2_tail3
                        );
                        // C1 view under the ghost bound y²‖M2‖ + E₃.
                        let c1 = blk.to_c1(lcmax);
                        let l1 = tail_entry_norm_log2(&c1, &exact, c);
                        assert!(
                            l1 <= c1.log2_tail + 1e-6 || l1 == f64::NEG_INFINITY,
                            "[{name}] c#{ci} skip {skip} slot {s}: ghost c²⁺ tail \
                             2^{l1:.2} over certified 2^{:.2}",
                            c1.log2_tail
                        );
                    }
                }
            }
        }
    }

    #[test]
    fn matc2_ghost_value_certificate_vs_exact_iteration() {
        // End-to-end referee for the GHOST-certified budget: same promise as
        // matc1_value_certificate_vs_exact_iteration, radii solved on the
        // ghost-tightened precompute. The shipped model is still M0 + c·M1.
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
                    let pre = matc2_precompute(&orbit, first, skip, lcmax);
                    let radii = matc1_solve_radii(&pre, eps, lcmax);
                    if !radii.log2_r_eff.is_finite() {
                        continue;
                    }
                    assert_value_and_deriv_promise(
                        name,
                        &orbit,
                        first,
                        skip,
                        &pre,
                        radii.log2_r_eff,
                        lcmax,
                        eps,
                    );
                }
            }
        }
    }

    #[test]
    fn matc1_hyp_value_certificate_vs_exact_iteration() {
        // End-to-end referee for the COMBINED (euclid ∪ hyperbolic) radius:
        // at r_eff the winning certificate may be the Schwarz–Pick telescope —
        // the exact-iteration budget promise must hold all the same. Also
        // pins the combined radius above the euclidean one (bisection tol).
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
                    let hyp = matc1_solve_radii_hyp(&pre, eps, lcmax);
                    if hyp.log2_r_value_euclid.is_finite() {
                        assert!(
                            hyp.log2_r_value >= hyp.log2_r_value_euclid - 0.05,
                            "[{name}] skip {skip} slot {s}: combined {} below euclid {}",
                            hyp.log2_r_value,
                            hyp.log2_r_value_euclid
                        );
                    }
                    if !hyp.log2_r_eff.is_finite() {
                        continue;
                    }
                    assert_value_and_deriv_promise(
                        name,
                        &orbit,
                        first,
                        skip,
                        &pre,
                        hyp.log2_r_eff,
                        lcmax,
                        eps,
                    );
                }
            }
        }
    }

    /// Shared end-to-end referee: exact δ-iteration (value and ∂z chain rule)
    /// against the stored Φ = (Az+B)/(Cz+D), A = A0 + c·A1 etc., at radius
    /// log2 R = lr_log2 — the (V) budget ½ε(|A|R + |B|c_max) and ½ε|A|.
    #[allow(clippy::too_many_arguments)]
    fn assert_value_and_deriv_promise(
        name: &str,
        orbit: &[(f64, f64)],
        first: usize,
        skip: usize,
        pre: &MatC1Pre,
        lr_log2: f64,
        lcmax: f64,
        eps: f64,
    ) {
        let r = lr_log2.exp2();
        let y = lcmax.exp2();
        for (dx, dy, ccx, ccy) in [
            (r, 0.0, y, 0.0),
            (-0.7 * r, 0.7 * r, -y, 0.0),
            (0.5 * r, -0.5 * r, 0.3 * y, 0.9 * y),
            (0.0, 0.0, 0.0, y),
        ] {
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
            let budget = 0.5 * eps * ((pre.log2_a_blk.exp2() * r) + pre.log2_b_blk.exp2() * y);
            assert!(
                err <= budget * (1.0 + 1e-6) + 1e-300,
                "[{}] skip {} first {}: err {:.3e} > budget {:.3e} at r=2^{:.2}",
                name,
                skip,
                first,
                err,
                budget,
                lr_log2
            );
            let det = av.mul(dv).sub(bv.mul(cv));
            let den = cv.mul(z).add(dv);
            let dphi = det.div(den.mul(den));
            let (dpx, dpy) = dphi.to_f64();
            let derr = ((dpx - gx).powi(2) + (dpy - gy).powi(2)).sqrt();
            let dbudget = 0.5 * eps * pre.log2_a_blk.exp2();
            assert!(
                derr <= dbudget * (1.0 + 1e-6) + 1e-300,
                "[{}] skip {} first {}: ∂z err {:.3e} > {:.3e} at r=2^{:.2}",
                name,
                skip,
                first,
                derr,
                dbudget,
                lr_log2
            );
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

    /// Census configs shared by the ghost and hyperbolic probes: the four
    /// standard deep views plus the crossover chasers (cusp-ultra is the §2.6
    /// success criterion: +0.2 log2 of effective radius reopens the GPU-tier
    /// question).
    const PROBE_CONFIGS: [(&str, f64, f64, f64, usize, usize); 7] = [
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
        ("cusp-ultra", -0.75, 0.0, -120.0, 32768, 8192),
        ("feigen-deep", -1.401155, 0.0, -120.0, 32768, 8192),
    ];

    fn med(v: &mut Vec<f64>) -> f64 {
        if v.is_empty() {
            return f64::NAN;
        }
        v.sort_by(|a, b| a.partial_cmp(b).unwrap());
        v[v.len() / 2]
    }

    /// Ghost census (§3.4 step 5): matrix-c1 radii solved on the C1 tail vs
    /// the ghost-certified tail, same certificate shape. ΔE₂ is the tail
    /// tightening (positive = ghost tighter); Δr are radius gains in log2.
    /// The `stack` column adds the hyperbolic route on TOP of the ghost.
    /// Run with: cargo test matc2_ghost_census --release -- --ignored --nocapture
    #[test]
    #[ignore = "census: heavy, run explicitly with --ignored --nocapture"]
    fn matc2_ghost_census() {
        let eps = 1e-6;
        println!(
            "\n ghost census | view    skip  blk alive(c1→gh) | medΔE2 | medΔrV medΔrE | medΔrE-stack | med rE(gh)"
        );
        for (name, cx, cy, lcmax, iters, max_skip) in PROBE_CONFIGS {
            let orbit = ref_orbit_f64(cx, cy, iters);
            if orbit.len() < iters / 2 {
                println!("[{name}] escaped at {} iters — skipped", orbit.len());
                continue;
            }
            let mut skip = 4usize;
            while skip <= max_skip && skip * 2 < orbit.len() {
                let nb = (orbit.len() - 1) / skip;
                let (mut a1, mut a2) = (0usize, 0usize);
                let mut dtail: Vec<f64> = Vec::new();
                let mut drv: Vec<f64> = Vec::new();
                let mut dre: Vec<f64> = Vec::new();
                let mut dre_stack: Vec<f64> = Vec::new();
                let mut re_ghost: Vec<f64> = Vec::new();
                for s in 0..nb.min(8) {
                    let first = 1 + s * skip;
                    if first + skip >= orbit.len() {
                        break;
                    }
                    let pre1 = matc1_precompute(&orbit, first, skip, lcmax);
                    let pre2 = matc2_precompute(&orbit, first, skip, lcmax);
                    let r1 = matc1_solve_radii(&pre1, eps, lcmax);
                    let r2 = matc1_solve_radii(&pre2, eps, lcmax);
                    dtail.push(pre1.blk.log2_tail - pre2.blk.log2_tail);
                    if r1.log2_r_eff.is_finite() {
                        a1 += 1;
                    }
                    if r2.log2_r_eff.is_finite() {
                        a2 += 1;
                        re_ghost.push(r2.log2_r_eff);
                    }
                    if r1.log2_r_value.is_finite() && r2.log2_r_value.is_finite() {
                        drv.push(r2.log2_r_value - r1.log2_r_value);
                    }
                    if r1.log2_r_eff.is_finite() && r2.log2_r_eff.is_finite() {
                        dre.push(r2.log2_r_eff - r1.log2_r_eff);
                        let stack = matc1_solve_radii_hyp(&pre2, eps, lcmax);
                        if stack.log2_r_eff.is_finite() {
                            dre_stack.push(stack.log2_r_eff - r1.log2_r_eff);
                        }
                    }
                }
                println!(
                    "[{name:>11}] {skip:>5} {:>4}  {a1:>3}→{a2:<3} | {:>6.2} | {:>6.2} {:>6.2} | {:>6.2} | {:>8.2}",
                    nb.min(8),
                    med(&mut dtail),
                    med(&mut drv),
                    med(&mut dre),
                    med(&mut dre_stack),
                    med(&mut re_ghost),
                );
                skip *= 4;
            }
        }
    }

    /// Hyperbolic census (§2.6 steps 4–5): euclidean vs Schwarz–Pick value
    /// radii on the same blocks, gain attribution and winning κ. Success
    /// criterion: medΔrE ≥ +0.2 on cusp-ultra.
    /// Run with: cargo test matc1_hyp_census --release -- --ignored --nocapture
    #[test]
    #[ignore = "census: heavy, run explicitly with --ignored --nocapture"]
    fn matc1_hyp_census() {
        let eps = 1e-6;
        println!(
            "\n hyp census | view    skip  blk aliveE aliveH hypWins | medΔrV(hyp−eu) medΔrV(comb−eu) medΔrE(comb−eu) | κ(med)"
        );
        for (name, cx, cy, lcmax, iters, max_skip) in PROBE_CONFIGS {
            let orbit = ref_orbit_f64(cx, cy, iters);
            if orbit.len() < iters / 2 {
                println!("[{name}] escaped at {} iters — skipped", orbit.len());
                continue;
            }
            let mut skip = 4usize;
            while skip <= max_skip && skip * 2 < orbit.len() {
                let nb = (orbit.len() - 1) / skip;
                let (mut alive_e, mut alive_h, mut wins) = (0usize, 0usize, 0usize);
                let mut dvh: Vec<f64> = Vec::new();
                let mut dvc: Vec<f64> = Vec::new();
                let mut dec: Vec<f64> = Vec::new();
                let mut kappas: Vec<f64> = Vec::new();
                for s in 0..nb.min(8) {
                    let first = 1 + s * skip;
                    if first + skip >= orbit.len() {
                        break;
                    }
                    let pre = matc1_precompute(&orbit, first, skip, lcmax);
                    let hyp = matc1_solve_radii_hyp(&pre, eps, lcmax);
                    // Baseline r_eff: the euclid-only solve for the ΔE column.
                    let base = matc1_solve_radii(&pre, eps, lcmax);
                    if hyp.log2_r_value_euclid.is_finite() {
                        alive_e += 1;
                    }
                    if hyp.log2_r_value_hyp.is_finite() {
                        alive_h += 1;
                        kappas.push(hyp.best_kappa_log2);
                    }
                    if hyp.log2_r_value_hyp.is_finite() && hyp.log2_r_value_euclid.is_finite() {
                        dvh.push(hyp.log2_r_value_hyp - hyp.log2_r_value_euclid);
                        if hyp.log2_r_value_hyp > hyp.log2_r_value_euclid + 0.02 {
                            wins += 1;
                        }
                    }
                    if hyp.log2_r_value.is_finite() && hyp.log2_r_value_euclid.is_finite() {
                        dvc.push(hyp.log2_r_value - hyp.log2_r_value_euclid);
                    }
                    if hyp.log2_r_eff.is_finite() && base.log2_r_eff.is_finite() {
                        dec.push(hyp.log2_r_eff - base.log2_r_eff);
                    }
                }
                println!(
                    "[{name:>11}] {skip:>5} {:>4}  {alive_e:>5} {alive_h:>5} {wins:>7} | {:>14.2} {:>15.2} {:>15.2} | {:>6.2}",
                    nb.min(8),
                    med(&mut dvh),
                    med(&mut dvc),
                    med(&mut dec),
                    med(&mut kappas),
                );
                skip *= 4;
            }
        }
    }

    /// Phase-oracle census (§2.7 suite): does exact decentered disk transport
    /// (phase recovered, inflation sampled) close the deficit of the centered
    /// hyperbolic route against the euclidean VALUE radius?
    /// Run with: cargo test matc1_phase_oracle_census --release -- --ignored --nocapture
    #[test]
    #[ignore = "census: heavy, run explicitly with --ignored --nocapture"]
    fn matc1_phase_oracle_census() {
        let eps = 1e-6;
        println!(
            "\n oracle census | view    skip  blk aliveEu aliveOr orWins | medΔrV(or−eu) bestΔ"
        );
        for (name, cx, cy, lcmax, iters, max_skip) in PROBE_CONFIGS {
            let orbit = ref_orbit_f64(cx, cy, iters);
            if orbit.len() < iters / 2 {
                println!("[{name}] escaped at {} iters — skipped", orbit.len());
                continue;
            }
            let mut skip = 4usize;
            while skip <= max_skip && skip * 2 < orbit.len() {
                let nb = (orbit.len() - 1) / skip;
                let (mut alive_e, mut alive_o, mut wins) = (0usize, 0usize, 0usize);
                let mut dv: Vec<f64> = Vec::new();
                for s in 0..nb.min(8) {
                    let first = 1 + s * skip;
                    if first + skip >= orbit.len() {
                        break;
                    }
                    let pre = matc1_precompute(&orbit, first, skip, lcmax);
                    let base = matc1_solve_radii(&pre, eps, lcmax);
                    let r_or = matc1_phase_oracle_radius(&orbit, first, &pre, eps, lcmax);
                    if base.log2_r_value.is_finite() {
                        alive_e += 1;
                    }
                    if r_or.is_finite() {
                        alive_o += 1;
                    }
                    if base.log2_r_value.is_finite() && r_or.is_finite() {
                        dv.push(r_or - base.log2_r_value);
                        if r_or > base.log2_r_value + 0.02 {
                            wins += 1;
                        }
                    }
                }
                let best = dv.iter().cloned().fold(f64::NAN, f64::max);
                println!(
                    "[{name:>11}] {skip:>5} {:>4}  {alive_e:>6} {alive_o:>6} {wins:>6} | {:>13.2} {:>6.2}",
                    nb.min(8),
                    med(&mut dv),
                    best,
                );
                skip *= 4;
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
    fn oracle_debug_walk() {
        // Step-by-step trace of the phase-oracle walk on a cusp block where
        // the euclidean value radius is healthy but the oracle collapses.
        let orbit = ref_orbit_f64(-0.75, 0.0, 200);
        let lcmax = -40.0;
        let (first, skip) = (1usize, 16usize);
        let pre = matc1_precompute(&orbit, first, skip, lcmax);
        let base = matc1_solve_radii(&pre, 1e-6, lcmax);
        println!("euclid r_value = 2^{:.2}", base.log2_r_value);
        let lx = base.log2_r_value;
        let y = lcmax.exp2();
        let (ccx, ccy) = (y, 0.0);
        let c = CFe::from_c(ccx, ccy);
        let lc = l2(&c);
        for lmu in [-2.0f64, -4.0, -8.0, -12.0] {
            println!("--- mu 2^{lmu} at lx {lx:.2}");
            let (mut zn, mut lrn) = (CFe::ZERO, lx);
            let (mut zd, mut lrd) = (CFe::ZERO, lx);
            let mut deltas: Vec<f64> = Vec::new();
            for j in 0..skip {
                let la = pre.la[j];
                let (zx, zy) = orbit[first + j];
                let a = CFe::from_c(2.0 * zx, 2.0 * zy);
                let leps_of = |zeta: &CFe, lr: f64| -> f64 {
                    let ls = lse(&[l2(zeta), lr]);
                    let lgap = la + (1.0 - (ls - la).exp2()).log2();
                    ls + lse(&[2.0 * ls, lc]) - lgap
                };
                let leps_n = leps_of(&zn, lrn);
                let leps_d = leps_of(&zd, lrd);
                let (zn2, lrn2) = mobius_disk_image(a, c, zn, lrn).unwrap();
                let (zd2, lrd2) = mobius_disk_image(a, c, zd, lrd).unwrap();
                let lrd_new = lse(&[lrd2, 1.0 + leps_d, lmu + lrd2]);
                let lctr = l2(&zn2.sub(zd2));
                let lnum = lse(&[lctr, lrn2, leps_n]);
                let lq = lnum - lrd_new;
                let l1mq2 = (1.0 - (2.0 * lq).exp2()).log2();
                let ldelta = leps_n - lrd_new - l1mq2;
                println!(
                    "j={j:2} epsN={leps_n:8.2} rN'={lrn2:8.2} rDimg={lrd2:8.2} rD'={lrd_new:8.2} \
                     |ctrN-ctrD|={lctr:8.2} q={lq:8.3} 1-q2={l1mq2:8.2} delta={ldelta:8.2}"
                );
                deltas.push(ldelta);
                zn = zn2;
                lrn = lrn2;
                zd = zd2;
                lrd = lrd_new;
            }
            let ltot = fold_pseudo_log2(&deltas);
            println!(
                "delta_tot={ltot:.2}  exit err = 2^{:.2}  vs rhs = 2^{:.2}",
                1.0 + lrd + ltot,
                1e-6f64.log2() - 1.0 + lse(&[pre.log2_a_blk + lx, pre.log2_b_blk + lcmax])
            );
        }
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
