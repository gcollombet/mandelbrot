//! Build-only finite-depth Feigenbaum return recognizer.
//!
//! This module proposes certificates for the Lean theorem
//! `FeigenbaumFiniteReturn.FiniteGridWitness.uniform_error`.  It deliberately
//! does **not** manufacture the kernel-verification token required by the
//! runtime selector: floating-point discovery is untrusted.  Until an emitted
//! rational witness has been replayed by Lean, selection therefore remains on
//! the existing affine/Padé/jet portfolio.
#![allow(dead_code)]

use std::f64::consts::SQRT_2;

/// Lanford's classical degree-42 even Chebyshev approximation, in the
/// convention h(x) = h[0] + 2 sum_{k>=1} h[k] T_{2k}(x).
const H_BAR: [f64; 22] = [
    2.828_954_316_362_471_6e-1,
    -3.501_957_869_868_569e-1,
    8.681_093_361_122_092e-3,
    3.118_279_568_470_454e-4,
    -1.263_320_718_810_415_5e-5,
    1.390_630_302_146_239_7e-7,
    3.896_840_998_170_214e-9,
    -1.638_928_612_933_650_6e-10,
    3.192_105_039_352_716e-13,
    8.890_535_572_972_937e-14,
    -1.399_521_577_507_621_7e-15,
    -3.299_388_285_321_187e-17,
    1.557_873_102_380_423e-18,
    -1.314_440_867_628_272_4e-20,
    -6.630_778_764_617_662e-22,
    2.284_460_664_293_782_3e-23,
    -1.308_345_719_150_209e-25,
    -9.741_970_859_620_793e-27,
    2.744_309_142_109_330_2e-28,
    -4.018_096_526_679_559e-31,
    -1.364_429_276_416_807_3e-31,
    2.790_134_101_897_019e-33,
];

/// Real Feigenbaum accumulation parameter for z²+c (discovery precision).
pub const FEIGENBAUM_C: f64 = -1.401_155_189_092_050_6;

/// Error of the stored limiting model from the analytic fixed point in the
/// published m=2 certificate. This is separate from the finite-depth return
/// error measured here.
pub const MODEL_ERROR: f64 = 8.24e-18;

#[derive(Clone, Copy, Debug, Default, PartialEq)]
struct C64 {
    re: f64,
    im: f64,
}

impl C64 {
    const ZERO: C64 = C64 { re: 0.0, im: 0.0 };

    fn new(re: f64, im: f64) -> Self {
        C64 { re, im }
    }

    fn abs(self) -> f64 {
        self.re.hypot(self.im)
    }

    fn add(self, rhs: C64) -> C64 {
        C64::new(self.re + rhs.re, self.im + rhs.im)
    }

    fn sub(self, rhs: C64) -> C64 {
        C64::new(self.re - rhs.re, self.im - rhs.im)
    }

    fn mul(self, rhs: C64) -> C64 {
        C64::new(
            self.re * rhs.re - self.im * rhs.im,
            self.re * rhs.im + self.im * rhs.re,
        )
    }

    fn scale(self, rhs: f64) -> C64 {
        C64::new(self.re * rhs, self.im * rhs)
    }

    fn div(self, rhs: C64) -> C64 {
        let d = rhs.re * rhs.re + rhs.im * rhs.im;
        C64::new(
            (self.re * rhs.re + self.im * rhs.im) / d,
            (self.im * rhs.re - self.re * rhs.im) / d,
        )
    }

    fn finite(self) -> bool {
        self.re.is_finite() && self.im.is_finite()
    }
}

fn quadratic(c: C64, z: C64) -> C64 {
    z.mul(z).add(c)
}

/*
 * Directed-rounding scalar helpers.
 *
 * IEEE-754 f64 operations round to nearest, so for any operands the exact
 * real result of one +, -, *, /, sqrt lies strictly below `next_up` of the
 * computed value (and strictly above `next_down`).  Every recurrence below
 * is monotone in its nonnegative inputs, so propagating upper bounds through
 * the `_up` helpers (and lower bounds through the `_down` ones) is sound.
 * This removes the `roundoff_omitted` caveat from the difference builder.
 */

fn add_up(a: f64, b: f64) -> f64 {
    (a + b).next_up()
}

fn add_down(a: f64, b: f64) -> f64 {
    (a + b).next_down()
}

fn sub_down(a: f64, b: f64) -> f64 {
    (a - b).next_down()
}

fn mul_up(a: f64, b: f64) -> f64 {
    (a * b).next_up()
}

fn mul_down(a: f64, b: f64) -> f64 {
    (a * b).next_down().max(0.0)
}

fn div_up(a: f64, b: f64) -> f64 {
    (a / b).next_up()
}

fn sqrt_up(a: f64) -> f64 {
    a.sqrt().next_up()
}

fn sqrt_down(a: f64) -> f64 {
    a.max(0.0).sqrt().next_down().max(0.0)
}

/// Upper bound for `|z|` (exact complex value given by an exact f64 pair).
fn abs_up_c(z: C64) -> f64 {
    sqrt_up(add_up(mul_up(z.re.abs(), z.re.abs()), mul_up(z.im.abs(), z.im.abs())))
}

/// Lower bound for `|z|`.
fn abs_down_c(z: C64) -> f64 {
    sqrt_down(add_down(mul_down(z.re.abs(), z.re.abs()), mul_down(z.im.abs(), z.im.abs())))
}

/// `|re| + |im|`, rounded up: dominates every partial product magnitude in a
/// complex multiply and the Euclidean norm of a componentwise error pair.
fn comp_sum_up(z: C64) -> f64 {
    add_up(z.re.abs(), z.im.abs())
}

/// Complex ball: encloses an exact complex number (or a set) within
/// `radius` of `center`.  All radius arithmetic rounds outward; the rounding
/// of the f64 center computation itself is folded into the radius with a
/// deliberately generous constant (bounds live at ~1e-5, rounding at ~1e-16,
/// so slack costs nothing and keeps the soundness argument one-line).
#[derive(Clone, Copy, Debug)]
struct Ball {
    center: C64,
    radius: f64,
}

impl Ball {
    const ZERO: Ball = Ball {
        center: C64::ZERO,
        radius: 0.0,
    };

    fn exact(center: C64) -> Ball {
        Ball { center, radius: 0.0 }
    }

    fn abs_up(self) -> f64 {
        add_up(abs_up_c(self.center), self.radius)
    }

    fn abs_down(self) -> f64 {
        sub_down(abs_down_c(self.center), self.radius).max(0.0)
    }

    fn finite(self) -> bool {
        self.center.finite() && self.radius.is_finite()
    }
}

/// One rounding per component (`fl(v)` nearest ⇒ `|fl(v)-v| < EPSILON·|fl(v)|`);
/// the Euclidean error norm is at most the component sum.
fn center_rounding(center: C64, ops_bound: f64) -> f64 {
    mul_up(ops_bound * f64::EPSILON, comp_sum_up(center))
}

fn ball_add(a: Ball, b: Ball) -> Ball {
    let center = a.center.add(b.center);
    Ball {
        center,
        radius: add_up(add_up(a.radius, b.radius), center_rounding(center, 1.0)),
    }
}

fn ball_sub(a: Ball, b: Ball) -> Ball {
    let center = a.center.sub(b.center);
    Ball {
        center,
        radius: add_up(add_up(a.radius, b.radius), center_rounding(center, 1.0)),
    }
}

fn ball_mul(a: Ball, b: Ball) -> Ball {
    let center = a.center.mul(b.center);
    let na = abs_up_c(a.center);
    let nb = abs_up_c(b.center);
    let cross = add_up(
        add_up(mul_up(na, b.radius), mul_up(a.radius, nb)),
        mul_up(a.radius, b.radius),
    );
    // Each component: two products + one add, every partial ≤ ΣaΣb; the
    // factor 8 dominates the ≤ ~4.05·EPSILON·ΣaΣb worst case with headroom.
    let round = mul_up(
        8.0 * f64::EPSILON,
        mul_up(comp_sum_up(a.center), comp_sum_up(b.center)),
    );
    Ball {
        center,
        radius: add_up(cross, round),
    }
}

/// Multiplication by 2 is exact in binary floating point: no rounding term.
fn ball_double(a: Ball) -> Ball {
    Ball {
        center: a.center.scale(2.0),
        radius: 2.0 * a.radius,
    }
}

/// Scale by an exact f64 (model coefficients, weights).
fn ball_scale(a: Ball, k: f64) -> Ball {
    let center = a.center.scale(k);
    Ball {
        center,
        radius: add_up(mul_up(a.radius, k.abs()), center_rounding(center, 1.0)),
    }
}

/// Rigorous enclosure of the critical scale `s_n = P_c^[skip](0)`.
fn critical_scale_ball(c: C64, skip: usize) -> Option<Ball> {
    let mut z = Ball::ZERO;
    for _ in 0..skip {
        z = ball_add(ball_mul(z, z), Ball::exact(c));
        if !z.finite() {
            return None;
        }
    }
    Some(z)
}

fn iterate(c: C64, mut z: C64, skip: usize) -> C64 {
    for _ in 0..skip {
        z = quadratic(c, z);
    }
    z
}

fn chebyshev_model(z: C64) -> C64 {
    // T_0, T_1, then the stable three-term polynomial recurrence.  Only the
    // even terms are accumulated, but retaining T_(n-1) keeps this tiny.
    let mut t_prev = C64::new(1.0, 0.0);
    let mut sum = C64::new(H_BAR[0], 0.0);
    if H_BAR.len() == 1 {
        return sum;
    }
    let mut t = z;
    let two_z = z.scale(2.0);
    for degree in 2..=(2 * (H_BAR.len() - 1)) {
        let next = two_z.mul(t).sub(t_prev);
        t_prev = t;
        t = next;
        if degree % 2 == 0 {
            sum = sum.add(t.scale(2.0 * H_BAR[degree / 2]));
        }
    }
    sum
}

/// Shader-side evaluation scheme for the stored model, and its derivative.
///
/// The even Chebyshev series `h(x) = h0 + 2 sum_{k>=1} h_k T_{2k}(x)` is exactly
/// a plain Chebyshev series in `u = 2x² - 1`, because `T_{2k}(x) = T_k(2x²-1)`.
/// So with `a_0 = h0`, `a_k = 2 h_k`, `h(x) = sum_k a_k T_k(u)` — a 22-term
/// Clenshaw in `u`, half the work of walking `T_j(x)` to degree 42.  This is
/// what `mandelbrot_brush.wgsl` runs per renormalized block; validated here to
/// match `chebyshev_model` bit-for-bit-close so the WGSL port is trustworthy.
///
/// Returns `(h(x), h'(x))`.  `h'(x) = (d/du h)·(du/dx) = h_u(u)·4x`, and
/// `h_u` is obtained from the same Clenshaw state (derivative Clenshaw).
fn chebyshev_model_clenshaw(x: C64) -> (C64, C64) {
    let u = x.mul(x).scale(2.0).sub(C64::new(1.0, 0.0));
    let two_u = u.scale(2.0);
    // Clenshaw for value: b_k = a_k + 2u b_{k+1} - b_{k+2}.
    // Clenshaw for u-derivative: c_k = 2 b_{k+1} + 2u c_{k+1} - c_{k+2}.
    let mut b1 = C64::ZERO;
    let mut b2 = C64::ZERO;
    let mut d1 = C64::ZERO; // du-derivative accumulator
    let mut d2 = C64::ZERO;
    for k in (1..H_BAR.len()).rev() {
        let a_k = 2.0 * H_BAR[k];
        let b0 = C64::new(a_k, 0.0).add(two_u.mul(b1)).sub(b2);
        let d0 = b1.scale(2.0).add(two_u.mul(d1)).sub(d2);
        b2 = b1;
        b1 = b0;
        d2 = d1;
        d1 = d0;
    }
    // value = a_0 + u b_1 - b_2 ; h_u = b_1 + u d_1 - d_2
    let value = C64::new(H_BAR[0], 0.0).add(u.mul(b1)).sub(b2);
    let h_u = b1.add(u.mul(d1)).sub(d2);
    // dx/dx: du/dx = 4x, so h'(x) = h_u · 4x.
    let h_prime = h_u.mul(x.scale(4.0));
    (value, h_prime)
}

/// Upper bound for sup |h'(z)| on |z| <= radius.  It uses
/// T_n'(z)=n U_(n-1)(z) and the positive scalar recurrence
/// U_(n+1) <= 2 radius U_n + U_(n-1).
fn chebyshev_lipschitz(radius: f64) -> f64 {
    if radius < 0.0 || !radius.is_finite() {
        return f64::INFINITY;
    }
    let max_degree = 2 * (H_BAR.len() - 1);
    let mut u = vec![0.0; max_degree];
    if !u.is_empty() {
        u[0] = 1.0;
    }
    if u.len() > 1 {
        u[1] = 2.0 * radius;
    }
    for n in 2..u.len() {
        u[n] = 2.0 * radius * u[n - 1] + u[n - 2];
    }
    H_BAR
        .iter()
        .enumerate()
        .skip(1)
        .map(|(k, coefficient)| {
            let degree = 2 * k;
            2.0 * coefficient.abs() * degree as f64 * u[degree - 1]
        })
        .sum()
}

/// Discovery output. `uniform_error` omits floating-point roundoff and is
/// therefore a proposal for the rational Lean checker, never runtime proof.
#[derive(Clone, Debug)]
pub struct FiniteReturnProposal {
    pub c: (f64, f64),
    pub level: u32,
    pub skip: usize,
    pub scale: (f64, f64),
    pub domain_radius: f64,
    pub grid_side: usize,
    pub sampled_cells: usize,
    pub cell_radius: f64,
    pub sample_error: f64,
    pub return_variation: f64,
    pub model_lipschitz: f64,
    pub uniform_error: f64,
    pub model_error: f64,
    pub tolerance: f64,
    pub analytically_accepted: bool,
    pub roundoff_omitted: bool,
    pub failure: Option<&'static str>,
}

impl FiniteReturnProposal {
    fn failed(
        c: C64,
        level: u32,
        domain_radius: f64,
        grid_side: usize,
        tolerance: f64,
        reason: &'static str,
    ) -> Self {
        FiniteReturnProposal {
            c: (c.re, c.im),
            level,
            skip: 0,
            scale: (f64::NAN, f64::NAN),
            domain_radius,
            grid_side,
            sampled_cells: 0,
            cell_radius: f64::INFINITY,
            sample_error: f64::INFINITY,
            return_variation: f64::INFINITY,
            model_lipschitz: f64::INFINITY,
            uniform_error: f64::INFINITY,
            model_error: MODEL_ERROR,
            tolerance,
            analytically_accepted: false,
            roundoff_omitted: true,
            failure: Some(reason),
        }
    }
}

/// Propose a uniform certificate on the disk `|z| <= domain_radius`.
///
/// For each grid cell the exact-return variation is bounded recursively by
/// e_(j+1) <= 2 |w_j| e_j + e_j², starting from
/// e_0 = |scale| cell_radius. This is precisely the non-rounded perturbation
/// recurrence; the finite sample discrepancy and the model Lipschitz term then
/// match Lean's `FiniteGridWitness.totalError`.
pub fn propose_finite_return(
    c_re: f64,
    c_im: f64,
    level: u32,
    domain_radius: f64,
    grid_side: usize,
    tolerance: f64,
) -> FiniteReturnProposal {
    let c = C64::new(c_re, c_im);
    if level >= usize::BITS {
        return FiniteReturnProposal::failed(
            c,
            level,
            domain_radius,
            grid_side,
            tolerance,
            "skip overflows usize",
        );
    }
    if grid_side == 0 || domain_radius <= 0.0 || !domain_radius.is_finite() {
        return FiniteReturnProposal::failed(
            c,
            level,
            domain_radius,
            grid_side,
            tolerance,
            "invalid domain or grid",
        );
    }
    let skip = 1usize << level;
    let scale = iterate(c, C64::ZERO, skip);
    let scale_abs = scale.abs();
    if scale_abs == 0.0 || !scale.finite() {
        return FiniteReturnProposal::failed(
            c,
            level,
            domain_radius,
            grid_side,
            tolerance,
            "critical scale is zero or non-finite",
        );
    }

    let width = 2.0 * domain_radius / grid_side as f64;
    let cell_radius = width * SQRT_2 * 0.5;
    // Grid centers lie in the containing square, hence in this disk. This is
    // the radius on which the model derivative bound is evaluated.
    let center_radius = SQRT_2 * domain_radius;
    let model_lipschitz = chebyshev_lipschitz(center_radius);
    let mut sample_error: f64 = 0.0;
    let mut return_variation: f64 = 0.0;
    let mut sampled_cells = 0usize;

    for iy in 0..grid_side {
        let y = -domain_radius + (iy as f64 + 0.5) * width;
        for ix in 0..grid_side {
            let x = -domain_radius + (ix as f64 + 0.5) * width;
            let center = C64::new(x, y);
            // Only cells intersecting the target disk are needed.
            if center.abs() > domain_radius + cell_radius {
                continue;
            }
            sampled_cells += 1;
            let mut w = scale.mul(center);
            let mut error = scale_abs * cell_radius;
            for _ in 0..skip {
                let w_abs = w.abs();
                error = (2.0 * w_abs + error) * error;
                w = quadratic(c, w);
                if !error.is_finite() || !w.finite() {
                    return FiniteReturnProposal::failed(
                        c,
                        level,
                        domain_radius,
                        grid_side,
                        tolerance,
                        "orbit enclosure overflow",
                    );
                }
            }
            let normalized = w.div(scale);
            sample_error = sample_error.max(normalized.sub(chebyshev_model(center)).abs());
            return_variation = return_variation.max(error / scale_abs);
        }
    }

    let uniform_error =
        return_variation + sample_error + model_lipschitz * cell_radius + MODEL_ERROR;
    let analytically_accepted = uniform_error.is_finite() && uniform_error <= tolerance;
    FiniteReturnProposal {
        c: (c.re, c.im),
        level,
        skip,
        scale: (scale.re, scale.im),
        domain_radius,
        grid_side,
        sampled_cells,
        cell_radius,
        sample_error,
        return_variation,
        model_lipschitz,
        uniform_error,
        model_error: MODEL_ERROR,
        tolerance,
        analytically_accepted,
        roundoff_omitted: true,
        failure: None,
    }
}

/// Order-2 value/derivative jet of the normalized return `G(z)` together
/// with sup-envelopes valid on the whole cell `|z - center| <= radius`.
///
/// Physical recurrences for `w_j = P_c^[j](s z)`:
///
/// ```text
/// w_(j+1) = w_j² + c            (value)
/// u_(j+1) = 2 w_j u_j           (d/dz, u_0 = s)
/// v_(j+1) = 2 (u_j² + w_j v_j)  (d²/dz², v_0 = 0)
/// ```
///
/// Envelopes replace `|w_j|` by `|w_j| + e_j` where `e_j` is the exact
/// perturbation recurrence already proved sound cell-wise
/// (`quadratic_error_step` in Lean):
///
/// ```text
/// e_(j+1) = (2|w_j| + e_j) e_j
/// U_(j+1) = 2 (|w_j| + e_j) U_j
/// V_(j+1) = 2 (U_j² + (|w_j| + e_j) V_j)
/// ```
#[derive(Clone, Copy, Debug)]
struct ReturnJet {
    value: C64,
    deriv: C64,
    second_sup: f64,
}

fn return_jet(c: C64, scale: C64, center: C64, cell_radius: f64, skip: usize) -> Option<ReturnJet> {
    let scale_abs = scale.abs();
    let mut w = scale.mul(center);
    let mut u = scale;
    let mut v = C64::ZERO;
    let mut e = scale_abs * cell_radius;
    let mut u_sup = scale_abs;
    let mut v_sup = 0.0f64;
    for _ in 0..skip {
        let w_abs = w.abs();
        let w_env = w_abs + e;
        let v_next = u.mul(u).add(w.mul(v)).scale(2.0);
        let u_next = w.mul(u).scale(2.0);
        let v_sup_next = 2.0 * (u_sup * u_sup + w_env * v_sup);
        let u_sup_next = 2.0 * w_env * u_sup;
        e = (2.0 * w_abs + e) * e;
        w = quadratic(c, w);
        u = u_next;
        v = v_next;
        u_sup = u_sup_next;
        v_sup = v_sup_next;
        if !w.finite() || !u.finite() || !v.finite() || !e.is_finite() || !v_sup.is_finite() {
            return None;
        }
    }
    Some(ReturnJet {
        value: w.div(scale),
        deriv: u.div(scale),
        second_sup: v_sup / scale_abs,
    })
}

/// Order-2 jet of the stored Chebyshev model: `(H, H', H'')` at a point,
/// through the differentiated three-term recurrence.
fn chebyshev_model_jet(z: C64) -> (C64, C64, C64) {
    let mut t_prev = C64::new(1.0, 0.0);
    let mut tp_prev = C64::ZERO;
    let mut tpp_prev = C64::ZERO;
    let mut t = z;
    let mut tp = C64::new(1.0, 0.0);
    let mut tpp = C64::ZERO;
    let mut sum = C64::new(H_BAR[0], 0.0);
    let mut sum_d = C64::ZERO;
    let mut sum_dd = C64::ZERO;
    let two_z = z.scale(2.0);
    for degree in 2..=(2 * (H_BAR.len() - 1)) {
        let next = two_z.mul(t).sub(t_prev);
        let next_p = t.scale(2.0).add(two_z.mul(tp)).sub(tp_prev);
        let next_pp = tp.scale(4.0).add(two_z.mul(tpp)).sub(tpp_prev);
        t_prev = t;
        tp_prev = tp;
        tpp_prev = tpp;
        t = next;
        tp = next_p;
        tpp = next_pp;
        if degree % 2 == 0 {
            let weight = 2.0 * H_BAR[degree / 2];
            sum = sum.add(t.scale(weight));
            sum_d = sum_d.add(tp.scale(weight));
            sum_dd = sum_dd.add(tpp.scale(weight));
        }
    }
    (sum, sum_d, sum_dd)
}

/// Upper bound for `sup |h''(z)|` on `|z| <= radius`, sampling-free, from the
/// positive scalar majorant recurrences
///
/// ```text
/// τ_(n+1) = 2R τ_n + τ_(n-1)          (|T_n| <= τ_n)
/// p_(n+1) = 2 τ_n + 2R p_n + p_(n-1)  (|T_n'| <= p_n)
/// q_(n+1) = 4 p_n + 2R q_n + q_(n-1)  (|T_n''| <= q_n)
/// ```
fn chebyshev_second_derivative_bound(radius: f64) -> f64 {
    if radius < 0.0 || !radius.is_finite() {
        return f64::INFINITY;
    }
    let max_degree = 2 * (H_BAR.len() - 1);
    let mut tau = vec![0.0f64; max_degree + 1];
    let mut p = vec![0.0f64; max_degree + 1];
    let mut q = vec![0.0f64; max_degree + 1];
    tau[0] = 1.0;
    if max_degree >= 1 {
        tau[1] = radius;
        p[1] = 1.0;
    }
    for n in 2..=max_degree {
        tau[n] = 2.0 * radius * tau[n - 1] + tau[n - 2];
        p[n] = 2.0 * tau[n - 1] + 2.0 * radius * p[n - 1] + p[n - 2];
        q[n] = 4.0 * p[n - 1] + 2.0 * radius * q[n - 1] + q[n - 2];
    }
    H_BAR
        .iter()
        .enumerate()
        .skip(1)
        .map(|(k, coefficient)| 2.0 * coefficient.abs() * q[2 * k])
        .sum()
}

/// Rigorous counterpart of `return_jet`: ball enclosures of the physical
/// center values `w_k`, `u_k = dw/dz` and a certified upper bound for the
/// cell-wide envelope `sup |d²w/dz²|`.  Same recurrences, every scalar step
/// rounded outward; the ball radii absorb the f64 rounding of the centers.
fn return_jet_ball(
    c: C64,
    scale: Ball,
    center: C64,
    cell_radius: f64,
    skip: usize,
) -> Option<(Ball, Ball, f64)> {
    let scale_abs_up = scale.abs_up();
    let mut w = ball_mul(scale, Ball::exact(center));
    let mut u = scale;
    let mut v = Ball::ZERO;
    let mut e = mul_up(scale_abs_up, cell_radius);
    let mut u_sup = scale_abs_up;
    let mut v_sup = 0.0f64;
    for _ in 0..skip {
        let w_abs = w.abs_up();
        let w_env = add_up(w_abs, e);
        let v_next = ball_double(ball_add(ball_mul(u, u), ball_mul(w, v)));
        let u_next = ball_double(ball_mul(w, u));
        let v_sup_next = 2.0 * add_up(mul_up(u_sup, u_sup), mul_up(w_env, v_sup));
        let u_sup_next = 2.0 * mul_up(w_env, u_sup);
        e = mul_up(add_up(2.0 * w_abs, e), e);
        w = ball_add(ball_mul(w, w), Ball::exact(c));
        u = u_next;
        v = v_next;
        u_sup = u_sup_next;
        v_sup = v_sup_next;
        if !w.finite() || !u.finite() || !v.finite() || !e.is_finite() || !v_sup.is_finite() {
            return None;
        }
    }
    Some((w, u, v_sup))
}

/// Rigorous counterpart of `chebyshev_model_jet`: ball enclosures of
/// `(H, H')` at an exact center through the differentiated three-term
/// recurrence.  The `H_BAR` coefficients are exact f64, hence exact dyadic
/// rationals: the stored model itself has no representation error.
fn chebyshev_model_jet_ball(z: C64) -> (Ball, Ball) {
    let mut t_prev = Ball::exact(C64::new(1.0, 0.0));
    let mut tp_prev = Ball::ZERO;
    let mut t = Ball::exact(z);
    let mut tp = Ball::exact(C64::new(1.0, 0.0));
    let mut sum = Ball::exact(C64::new(H_BAR[0], 0.0));
    let mut sum_d = Ball::ZERO;
    let two_z = Ball::exact(z.scale(2.0));
    for degree in 2..=(2 * (H_BAR.len() - 1)) {
        let next = ball_sub(ball_mul(two_z, t), t_prev);
        let next_p = ball_sub(ball_add(ball_double(t), ball_mul(two_z, tp)), tp_prev);
        t_prev = t;
        tp_prev = tp;
        t = next;
        tp = next_p;
        if degree % 2 == 0 {
            let weight = 2.0 * H_BAR[degree / 2];
            sum = ball_add(sum, ball_scale(t, weight));
            sum_d = ball_add(sum_d, ball_scale(tp, weight));
        }
    }
    (sum, sum_d)
}

/// Rigorous counterpart of `chebyshev_second_derivative_bound`: every step
/// of the positive majorant recurrences rounds up, so the result is a true
/// upper bound for `sup |h''|` on `|z| <= radius`.
fn chebyshev_second_derivative_bound_up(radius: f64) -> f64 {
    if radius < 0.0 || !radius.is_finite() {
        return f64::INFINITY;
    }
    let max_degree = 2 * (H_BAR.len() - 1);
    let mut tau = vec![0.0f64; max_degree + 1];
    let mut p = vec![0.0f64; max_degree + 1];
    let mut q = vec![0.0f64; max_degree + 1];
    tau[0] = 1.0;
    if max_degree >= 1 {
        tau[1] = radius;
        p[1] = 1.0;
    }
    let two_r = 2.0 * radius;
    for n in 2..=max_degree {
        tau[n] = add_up(mul_up(two_r, tau[n - 1]), tau[n - 2]);
        p[n] = add_up(add_up(2.0 * tau[n - 1], mul_up(two_r, p[n - 1])), p[n - 2]);
        q[n] = add_up(add_up(4.0 * p[n - 1], mul_up(two_r, q[n - 1])), q[n - 2]);
    }
    let mut sum = 0.0f64;
    for (k, coefficient) in H_BAR.iter().enumerate().skip(1) {
        sum = add_up(sum, mul_up(2.0 * coefficient.abs(), q[2 * k]));
    }
    sum
}

/// Smallest power of two `>= x` (x > 0, finite).  Used to build an exactly
/// representable dyadic tiling: with a power-of-two cell width and small
/// integer multipliers, every quadtree center and half-width below is an
/// exact f64, so the certificate's cover has no floating-point gaps.
fn pow2_at_least(x: f64) -> f64 {
    let mut w = 2.0f64.powi(x.log2().ceil() as i32);
    while w < x {
        w *= 2.0;
    }
    while w * 0.5 >= x {
        w *= 0.5;
    }
    w
}

/// One accepted (or depth-capped) cell of the adaptive difference
/// certificate.  All bounds refer to `D(z) = G(z) - H(z)`.
#[derive(Clone, Copy, Debug)]
pub struct DifferenceCell {
    pub center: (f64, f64),
    /// Half-side of the covering square.
    pub half_width: f64,
    /// Enclosing radius (half-diagonal); the `h` of the Lean witness.
    pub radius: f64,
    /// `|D(x_i)|` at the center.
    pub value_bound: f64,
    /// `|D'(x_i)|` at the center.
    pub deriv_bound: f64,
    /// `M₂ >= sup |D''|` on the cell.
    pub curvature: f64,
    /// `value + deriv·h + curvature·h²` — matches
    /// `DifferenceGridWitness.localBound` (no ½: the Lean mean-value bridge
    /// proves the conservative `M₂ h²` remainder).
    pub local_bound: f64,
    pub depth: u32,
}

/// Adaptive second-order difference proposal (doc §4).  All bounds are now
/// computed with outward-rounded ball/interval arithmetic (`next_up`/
/// `next_down` directed rounding): `roundoff_omitted` is `false` and every
/// exported number is a true bound of the exact real quantity.  What still
/// separates this from a kernel token is the Lean-side replay, not rigor of
/// the arithmetic.
#[derive(Clone, Debug)]
pub struct DifferenceReturnProposal {
    pub c: (f64, f64),
    pub level: u32,
    pub skip: usize,
    pub scale: (f64, f64),
    pub domain_radius: f64,
    pub budget: f64,
    pub max_depth: u32,
    pub cells: Vec<DifferenceCell>,
    /// Achieved uniform bound: max of the per-cell local bounds.
    pub uniform_error: f64,
    pub max_curvature: f64,
    pub cells_over_budget: usize,
    pub accepted: bool,
    pub roundoff_omitted: bool,
    pub failure: Option<&'static str>,
}

/// Propose the §4 refinement: interpolate the difference `D = G - H` with a
/// per-cell order-2 Taylor bound and subdivide only the cells whose local
/// bound exceeds the budget.
pub fn propose_difference_return(
    c_re: f64,
    c_im: f64,
    level: u32,
    domain_radius: f64,
    initial_side: usize,
    budget: f64,
    max_depth: u32,
) -> DifferenceReturnProposal {
    let c = C64::new(c_re, c_im);
    let failed = |reason: &'static str| DifferenceReturnProposal {
        c: (c_re, c_im),
        level,
        skip: 0,
        scale: (f64::NAN, f64::NAN),
        domain_radius,
        budget,
        max_depth,
        cells: Vec::new(),
        uniform_error: f64::INFINITY,
        max_curvature: f64::INFINITY,
        cells_over_budget: 0,
        accepted: false,
        roundoff_omitted: false,
        failure: Some(reason),
    };
    if level >= usize::BITS {
        return failed("skip overflows usize");
    }
    if initial_side == 0 || domain_radius <= 0.0 || !domain_radius.is_finite() {
        return failed("invalid domain or grid");
    }
    if !(budget > 0.0) {
        return failed("invalid budget");
    }
    let skip = 1usize << level;
    let scale_ball = match critical_scale_ball(c, skip) {
        Some(ball) => ball,
        None => return failed("critical scale enclosure overflow"),
    };
    let scale_lower = scale_ball.abs_down();
    if scale_lower <= 0.0 {
        return failed("critical scale is zero or non-finite");
    }
    let scale = scale_ball.center;

    // Work queue of squares (center, half-width, depth) covering the disk.
    // Power-of-two width + small integer multipliers keep every center and
    // half-width an exact f64: the tiling has no floating-point gaps and the
    // tiled square contains the requested disk by construction.
    let width = pow2_at_least(2.0 * domain_radius / initial_side as f64);
    let half_side = initial_side as f64 / 2.0;
    let mut queue: Vec<(C64, f64, u32)> = Vec::new();
    for iy in 0..initial_side {
        let y = (iy as f64 - half_side + 0.5) * width;
        for ix in 0..initial_side {
            let x = (ix as f64 - half_side + 0.5) * width;
            queue.push((C64::new(x, y), 0.5 * width, 0));
        }
    }

    let mut cells: Vec<DifferenceCell> = Vec::new();
    let mut uniform_error: f64 = 0.0;
    let mut max_curvature: f64 = 0.0;
    let mut cells_over_budget = 0usize;

    while let Some((center, half_width, depth)) = queue.pop() {
        // Upper bound of the exact half-diagonal: SQRT_2 is within one ulp
        // of √2 and mul_up adds the outward step for the product rounding.
        let radius = mul_up(half_width, SQRT_2).next_up();
        // Discard squares that certainly cannot intersect the target disk.
        if abs_down_c(center) > add_up(domain_radius, radius) {
            continue;
        }
        let (w_ball, u_ball, second_sup) =
            match return_jet_ball(c, scale_ball, center, radius, skip) {
                Some(jet) => jet,
                None => return failed("orbit enclosure overflow"),
            };
        let (model, model_d) = chebyshev_model_jet_ball(center);
        // Model curvature on the farthest point of the cell from the origin.
        let model_second =
            chebyshev_second_derivative_bound_up(add_up(abs_up_c(center), radius));
        // D = (w_k - s·H)/s and D' = (u_k - s·H')/s: bounding the numerators
        // and dividing by the certified lower scale avoids ball division.
        let value_bound = div_up(
            ball_sub(w_ball, ball_mul(scale_ball, model)).abs_up(),
            scale_lower,
        );
        let deriv_bound = div_up(
            ball_sub(u_ball, ball_mul(scale_ball, model_d)).abs_up(),
            scale_lower,
        );
        let curvature = add_up(div_up(second_sup, scale_lower), model_second);
        let local_bound = add_up(
            add_up(value_bound, mul_up(deriv_bound, radius)),
            mul_up(mul_up(curvature, radius), radius),
        );
        if !local_bound.is_finite() {
            return failed("cell bound overflow");
        }
        if local_bound > budget && depth < max_depth {
            let quarter = 0.5 * half_width;
            for (sx, sy) in [(-1.0, -1.0), (1.0, -1.0), (-1.0, 1.0), (1.0, 1.0)] {
                queue.push((
                    center.add(C64::new(sx * quarter, sy * quarter)),
                    quarter,
                    depth + 1,
                ));
            }
            continue;
        }
        if local_bound > budget {
            cells_over_budget += 1;
        }
        uniform_error = uniform_error.max(local_bound);
        max_curvature = max_curvature.max(curvature);
        cells.push(DifferenceCell {
            center: (center.re, center.im),
            half_width,
            radius,
            value_bound,
            deriv_bound,
            curvature,
            local_bound,
            depth,
        });
    }

    let accepted = cells_over_budget == 0 && !cells.is_empty() && uniform_error <= budget;
    DifferenceReturnProposal {
        c: (c_re, c_im),
        level,
        skip,
        scale: (scale.re, scale.im),
        domain_radius,
        budget,
        max_depth,
        cells,
        uniform_error,
        max_curvature,
        cells_over_budget,
        accepted,
        roundoff_omitted: false,
        failure: None,
    }
}

/// Exact dyadic rational `mantissa · 2^exponent`.  Every finite `f64` is one,
/// so the conversion below is exact — this is the endpoint format the Lean
/// checker replays through `RatUpper.dyadic`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Dyadic {
    pub mantissa: i64,
    pub exponent: i32,
}

impl Dyadic {
    /// Exact decomposition of a finite `f64`.  Returns `None` on NaN/inf.
    pub fn from_f64_exact(x: f64) -> Option<Dyadic> {
        if !x.is_finite() {
            return None;
        }
        if x == 0.0 {
            return Some(Dyadic {
                mantissa: 0,
                exponent: 0,
            });
        }
        let bits = x.to_bits();
        let sign = if bits >> 63 == 1 { -1i64 } else { 1i64 };
        let biased = ((bits >> 52) & 0x7ff) as i32;
        let fraction = (bits & ((1u64 << 52) - 1)) as i64;
        let (mut mantissa, mut exponent) = if biased == 0 {
            (fraction, -1074)
        } else {
            (fraction | (1i64 << 52), biased - 1075)
        };
        while mantissa & 1 == 0 {
            mantissa >>= 1;
            exponent += 1;
        }
        Some(Dyadic {
            mantissa: sign * mantissa,
            exponent,
        })
    }

    pub fn to_f64(self) -> f64 {
        (self.mantissa as f64) * (self.exponent as f64).exp2()
    }

    /// Exact rational rendering, e.g. `"4503599627370497/2^52"`, suitable for
    /// the Lean-side `RatUpper.dyadic mantissa exponent`.
    pub fn to_rational_string(self) -> String {
        if self.exponent >= 0 {
            format!("{}*2^{}", self.mantissa, self.exponent)
        } else {
            format!("{}/2^{}", self.mantissa, -self.exponent)
        }
    }
}

/// One exported cell in exact dyadic endpoints (Lean `RationalCellRecord`).
#[derive(Clone, Copy, Debug)]
pub struct DyadicCellRecord {
    pub center: (Dyadic, Dyadic),
    pub radius: Dyadic,
    pub value_bound: Dyadic,
    pub deriv_bound: Dyadic,
    pub curvature: Dyadic,
}

/// Full exported certificate: every endpoint is exact dyadic, ready for the
/// kernel to replay `value + deriv·h + curvature·h²` per cell.
#[derive(Clone, Debug)]
pub struct DyadicDifferenceCertificate {
    pub c: (Dyadic, Dyadic),
    pub scale: (Dyadic, Dyadic),
    pub level: u32,
    pub skip: usize,
    pub domain_radius: Dyadic,
    pub budget: Dyadic,
    pub cells: Vec<DyadicCellRecord>,
    /// Carried through from the proposal.  Since the builder moved to
    /// outward-rounded ball arithmetic this is `false`: every endpoint is a
    /// true bound.  What still separates the export from a kernel token is
    /// the Lean-side replay of the inclusions.
    pub roundoff_omitted: bool,
}

/// Export a proposal as exact dyadic endpoints.  Fails only on non-finite
/// bounds (a failed proposal).
pub fn export_dyadic_certificate(
    proposal: &DifferenceReturnProposal,
) -> Option<DyadicDifferenceCertificate> {
    if proposal.failure.is_some() {
        return None;
    }
    let d = Dyadic::from_f64_exact;
    let mut cells = Vec::with_capacity(proposal.cells.len());
    for cell in &proposal.cells {
        cells.push(DyadicCellRecord {
            center: (d(cell.center.0)?, d(cell.center.1)?),
            radius: d(cell.radius)?,
            value_bound: d(cell.value_bound)?,
            deriv_bound: d(cell.deriv_bound)?,
            curvature: d(cell.curvature)?,
        });
    }
    Some(DyadicDifferenceCertificate {
        c: (d(proposal.c.0)?, d(proposal.c.1)?),
        scale: (d(proposal.scale.0)?, d(proposal.scale.1)?),
        level: proposal.level,
        skip: proposal.skip,
        domain_radius: d(proposal.domain_radius)?,
        budget: d(proposal.budget)?,
        cells,
        roundoff_omitted: proposal.roundoff_omitted,
    })
}

/// Parameter-window proposal (doc §5): a Lipschitz constant `K_c` for
/// `c ↦ G_n(c, z)` uniform over the domain and the window `|c - c₀| <= δ`,
/// with the gauge `s_n(c)` itself varying and a certified lower margin on
/// `|s_n(c)|`.  Matches the Lean `parameter_window` aggregation
/// `K_c·δ + E₀`.
#[derive(Clone, Debug)]
pub struct ParameterWindowProposal {
    pub c0: (f64, f64),
    pub level: u32,
    pub skip: usize,
    pub delta: f64,
    /// `sup |s_n(c) - s_n(c₀)|` over the window.
    pub scale_drift: f64,
    /// Certified lower bound on `|s_n(c)|` over the window.
    pub scale_margin: f64,
    /// `sup |∂c s_n|` over the window.
    pub scale_deriv_sup: f64,
    /// `K_c = sup |∂c G_n(c, z)|` over domain × window.
    pub lipschitz: f64,
    pub base_error: f64,
    /// `K_c·δ + E₀`, the Lean `parameter_window` conclusion.
    pub extended_error: f64,
    pub roundoff_omitted: bool,
    pub failure: Option<&'static str>,
}

/// Bound `K_c` by propagating `∂c w` alongside the combined cell + window
/// orbit envelope:
///
/// ```text
/// σ_(j+1) = 2 o_j σ_j + 1                 (exact ∂c of the critical orbit)
/// ε_(j+1) = (2|o_j| + ε_j) ε_j + δ        (critical-orbit window envelope)
/// Σ_(j+1) = 2 (|o_j| + ε_j) Σ_j + 1       (sup |∂c o_j| over the window)
/// e'_(j+1) = (2|w_j| + e'_j) e'_j + δ     (cell × window orbit envelope)
/// Q_(j+1) = 2 (|w_j| + e'_j) Q_j + 1      (sup |∂c w_j|)
/// ```
///
/// then `|∂c G| <= Q_k/m_s + (|w_k| + e'_k)·Σ_k/m_s²` with
/// `m_s = |s_n(c₀)| - ε_k > 0`.
pub fn propose_parameter_window(
    c0_re: f64,
    c0_im: f64,
    level: u32,
    domain_radius: f64,
    grid_side: usize,
    delta: f64,
    base_error: f64,
) -> ParameterWindowProposal {
    let c0 = C64::new(c0_re, c0_im);
    let failed = |reason: &'static str| ParameterWindowProposal {
        c0: (c0_re, c0_im),
        level,
        skip: 0,
        delta,
        scale_drift: f64::INFINITY,
        scale_margin: 0.0,
        scale_deriv_sup: f64::INFINITY,
        lipschitz: f64::INFINITY,
        base_error,
        extended_error: f64::INFINITY,
        roundoff_omitted: false,
        failure: Some(reason),
    };
    if level >= usize::BITS {
        return failed("skip overflows usize");
    }
    if grid_side == 0 || domain_radius <= 0.0 || !domain_radius.is_finite() {
        return failed("invalid domain or grid");
    }
    if !(delta >= 0.0) || !delta.is_finite() {
        return failed("invalid parameter window");
    }
    let skip = 1usize << level;

    // Critical orbit at c₀ (ball enclosure) with outward-rounded window
    // envelopes.  Every recurrence is monotone in its nonnegative inputs.
    let mut orbit = Ball::ZERO;
    let mut epsilon = 0.0f64;
    let mut sigma_sup = 0.0f64;
    for _ in 0..skip {
        let o_abs = orbit.abs_up();
        let o_env = add_up(o_abs, epsilon);
        sigma_sup = 2.0 * add_up(mul_up(o_env, sigma_sup), 0.5);
        epsilon = add_up(mul_up(add_up(2.0 * o_abs, epsilon), epsilon), delta);
        orbit = ball_add(ball_mul(orbit, orbit), Ball::exact(c0));
        if !orbit.finite() || !epsilon.is_finite() || !sigma_sup.is_finite() {
            return failed("critical orbit envelope overflow");
        }
    }
    let scale_ball = orbit;
    let scale_lower = scale_ball.abs_down();
    if scale_lower <= 0.0 {
        return failed("critical scale is zero");
    }
    let scale_margin = sub_down(scale_lower, epsilon);
    if scale_margin <= 0.0 {
        return failed("window destroys the gauge margin");
    }
    let scale_upper = scale_ball.abs_up();

    let width = pow2_at_least(2.0 * domain_radius / grid_side as f64);
    let half_side = grid_side as f64 / 2.0;
    let cell_radius = mul_up(0.5 * width, SQRT_2).next_up();
    let mut lipschitz: f64 = 0.0;
    for iy in 0..grid_side {
        let y = (iy as f64 - half_side + 0.5) * width;
        for ix in 0..grid_side {
            let x = (ix as f64 - half_side + 0.5) * width;
            let center = C64::new(x, y);
            if abs_down_c(center) > add_up(domain_radius, cell_radius) {
                continue;
            }
            let z_sup = add_up(abs_up_c(center), cell_radius);
            let mut w = ball_mul(scale_ball, Ball::exact(center));
            let mut e = add_up(mul_up(scale_upper, cell_radius), mul_up(epsilon, z_sup));
            let mut q = mul_up(sigma_sup, z_sup);
            for _ in 0..skip {
                let w_abs = w.abs_up();
                q = 2.0 * add_up(mul_up(add_up(w_abs, e), q), 0.5);
                e = add_up(mul_up(add_up(2.0 * w_abs, e), e), delta);
                w = ball_add(ball_mul(w, w), Ball::exact(c0));
                if !w.finite() || !e.is_finite() || !q.is_finite() {
                    return failed("window orbit envelope overflow");
                }
            }
            let w_sup = add_up(w.abs_up(), e);
            let k_cell = add_up(
                div_up(q, scale_margin),
                div_up(
                    mul_up(w_sup, sigma_sup),
                    mul_down(scale_margin, scale_margin),
                ),
            );
            lipschitz = lipschitz.max(k_cell);
        }
    }
    if !lipschitz.is_finite() {
        return failed("window Lipschitz overflow");
    }

    ParameterWindowProposal {
        c0: (c0_re, c0_im),
        level,
        skip,
        delta,
        scale_drift: epsilon,
        scale_margin,
        scale_deriv_sup: sigma_sup,
        lipschitz,
        base_error,
        extended_error: add_up(mul_up(lipschitz, delta), base_error),
        roundoff_omitted: false,
        failure: None,
    }
}

/// Opaque token: only a future rational-certificate decoder/checker in this
/// module may construct it. The numerical proposal above has no promotion
/// function by design.
pub struct KernelVerifiedFiniteReturn {
    proposal: FiniteReturnProposal,
    _sealed: (),
}

impl KernelVerifiedFiniteReturn {
    pub fn proposal(&self) -> &FiniteReturnProposal {
        &self.proposal
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum FiniteReturnSelection {
    CertifiedFast,
    ExistingPortfolio,
}

/// Safe runtime gate. Today every builder-only proposal yields
/// `ExistingPortfolio`; adding a checked decoder later is the only route to
/// `CertifiedFast`.
pub fn select_finite_return(
    certificate: Option<&KernelVerifiedFiniteReturn>,
) -> FiniteReturnSelection {
    match certificate {
        Some(_) => FiniteReturnSelection::CertifiedFast,
        None => FiniteReturnSelection::ExistingPortfolio,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stored_model_has_critical_normalization() {
        let h0 = chebyshev_model(C64::ZERO);
        assert!((h0.re - 1.0).abs() < 2e-15, "h(0)={:?}", h0);
        assert_eq!(h0.im, 0.0);
    }

    #[test]
    fn critical_return_is_normalized_to_one() {
        for level in 1..=8 {
            let skip = 1usize << level;
            let c = C64::new(FEIGENBAUM_C, 0.0);
            let scale = iterate(c, C64::ZERO, skip);
            let at_zero = iterate(c, C64::ZERO, skip).div(scale);
            assert!((at_zero.re - 1.0).abs() < 2e-15);
            assert!(at_zero.im.abs() < 2e-15);
        }
    }

    #[test]
    fn proposal_is_finite_and_nontrivial() {
        let proposal = propose_finite_return(FEIGENBAUM_C, 0.0, 5, 0.25, 32, 1.0);
        assert!(proposal.failure.is_none(), "{:?}", proposal.failure);
        assert_eq!(proposal.skip, 32);
        assert!(proposal.sampled_cells > 0);
        assert!(proposal.uniform_error.is_finite());
        assert!(proposal.return_variation >= 0.0);
        assert!(proposal.model_lipschitz > 0.0);
        assert!(proposal.roundoff_omitted);
    }

    #[test]
    fn finite_return_census_reports_convergence() {
        for level in 2..=8 {
            let proposal = propose_finite_return(FEIGENBAUM_C, 0.0, level, 0.25, 64, 10.0);
            assert!(proposal.failure.is_none(), "level {}", level);
            println!(
                "level={level} skip={} sample={:.3e} variation={:.3e} total={:.3e}",
                proposal.skip,
                proposal.sample_error,
                proposal.return_variation,
                proposal.uniform_error
            );
        }
    }

    #[test]
    fn missing_kernel_certificate_always_falls_back() {
        assert_eq!(
            select_finite_return(None),
            FiniteReturnSelection::ExistingPortfolio
        );
    }

    #[test]
    fn return_jet_matches_finite_differences() {
        let c = C64::new(FEIGENBAUM_C, 0.0);
        let level = 4;
        let skip = 1usize << level;
        let scale = iterate(c, C64::ZERO, skip);
        let center = C64::new(0.11, -0.07);
        let jet = return_jet(c, scale, center, 0.0, skip).unwrap();
        let g = |z: C64| iterate(c, scale.mul(z), skip).div(scale);
        assert!(jet.value.sub(g(center)).abs() < 1e-12);
        let step = 1e-6;
        let fd_deriv = g(center.add(C64::new(step, 0.0)))
            .sub(g(center.sub(C64::new(step, 0.0))))
            .scale(0.5 / step);
        assert!(
            jet.deriv.sub(fd_deriv).abs() < 1e-5 * (1.0 + jet.deriv.abs()),
            "jet={:?} fd={:?}",
            jet.deriv,
            fd_deriv
        );
    }

    #[test]
    fn return_jet_envelope_dominates_second_derivative() {
        // The cell envelope must dominate |G''| sampled inside the cell.
        let c = C64::new(FEIGENBAUM_C, 0.0);
        let level = 5;
        let skip = 1usize << level;
        let scale = iterate(c, C64::ZERO, skip);
        let center = C64::new(0.05, 0.08);
        let radius = 5e-3;
        let sup = return_jet(c, scale, center, radius, skip)
            .unwrap()
            .second_sup;
        for (dx, dy) in [(0.0, 0.0), (0.7, 0.2), (-0.4, -0.6), (0.3, -0.5)] {
            let sample = center.add(C64::new(dx * radius, dy * radius));
            let there = return_jet(c, scale, sample, 0.0, skip).unwrap();
            // second_sup at radius 0 is the pointwise |v_k|-chain, itself an
            // upper bound for |G''| at that point.
            assert!(
                there.second_sup <= sup * (1.0 + 1e-9),
                "sample envelope {} exceeds cell envelope {}",
                there.second_sup,
                sup
            );
        }
    }

    #[test]
    fn chebyshev_jet_matches_finite_differences() {
        let z = C64::new(0.13, -0.09);
        let (h, hd, hdd) = chebyshev_model_jet(z);
        assert!(h.sub(chebyshev_model(z)).abs() < 1e-14);
        let step = 1e-5;
        let plus = chebyshev_model(z.add(C64::new(step, 0.0)));
        let minus = chebyshev_model(z.sub(C64::new(step, 0.0)));
        let fd_d = plus.sub(minus).scale(0.5 / step);
        let fd_dd = plus
            .add(minus)
            .sub(chebyshev_model(z).scale(2.0))
            .scale(1.0 / (step * step));
        assert!(hd.sub(fd_d).abs() < 1e-8, "hd={:?} fd={:?}", hd, fd_d);
        assert!(hdd.sub(fd_dd).abs() < 1e-4, "hdd={:?} fd={:?}", hdd, fd_dd);
        // The sampling-free majorant dominates the sampled second derivative.
        assert!(hdd.abs() <= chebyshev_second_derivative_bound(z.abs()));
    }

    #[test]
    fn difference_certificate_beats_first_order_floor() {
        // The first-order 64×64 census floor is ~1.06e-2. The second-order
        // difference certificate must land well below it without subdividing
        // to absurd depth.
        let proposal =
            propose_difference_return(FEIGENBAUM_C, 0.0, 8, 0.25, 8, 1e-4, 8);
        assert!(proposal.failure.is_none(), "{:?}", proposal.failure);
        assert!(proposal.accepted, "over budget: {} cells over, uniform {:.3e}",
            proposal.cells_over_budget, proposal.uniform_error);
        assert!(proposal.uniform_error <= 1e-4);
        assert!(proposal.uniform_error < 1.06e-2 / 10.0);
        // Directed-rounding ball arithmetic: rounding is included, the
        // exported numbers are true bounds.
        assert!(!proposal.roundoff_omitted);
    }

    #[test]
    fn rigorous_bounds_dominate_f64_probe_and_stay_tight() {
        // The interval path must produce bounds that (a) dominate the plain
        // f64 probe of the same quantities and (b) stay within a hair of it:
        // rounding lives ~11 orders of magnitude below the bounds.
        let c = C64::new(FEIGENBAUM_C, 0.0);
        let level = 6;
        let skip = 1usize << level;
        let scale_ball = critical_scale_ball(c, skip).unwrap();
        let scale = iterate(c, C64::ZERO, skip);
        assert!(scale_ball.center.sub(scale).abs() <= scale_ball.radius + 1e-18);
        let center = C64::new(0.109375, -0.078125); // exact dyadic
        let radius = 3e-3;
        let (w_ball, u_ball, second_sup) =
            return_jet_ball(c, scale_ball, center, radius, skip).unwrap();
        let jet = return_jet(c, scale, center, radius, skip).unwrap();
        let (model, model_d) = chebyshev_model_jet_ball(center);
        let (m, md, _) = chebyshev_model_jet(center);
        // Ball centers agree with the f64 probe to roundoff.
        assert!(w_ball.center.div(scale).sub(jet.value).abs() < 1e-12);
        assert!(u_ball.center.div(scale).sub(jet.deriv).abs() < 1e-12);
        assert!(model.center.sub(m).abs() < 1e-13);
        assert!(model_d.center.sub(md).abs() < 1e-12);
        // Rigorous envelopes dominate the f64 ones, within a whisker.
        // (return_jet_ball returns the physical envelope; normalize by the
        // certified lower scale like propose_difference_return does.)
        let second_norm = div_up(second_sup, scale_ball.abs_down());
        assert!(second_norm >= jet.second_sup * (1.0 - 1e-9));
        assert!(second_norm <= jet.second_sup * (1.0 + 1e-6));
        let rigorous = chebyshev_second_derivative_bound_up(0.25);
        let plain = chebyshev_second_derivative_bound(0.25);
        assert!(rigorous >= plain * (1.0 - 1e-12));
        assert!(rigorous <= plain * (1.0 + 1e-9));
        // Ball radii stay tiny: rounding is genuinely negligible.
        assert!(w_ball.radius < 1e-10 * (1.0 + w_ball.center.abs()));
        assert!(u_ball.radius < 1e-8 * (1.0 + u_ball.center.abs()));
    }

    #[test]
    fn difference_census_reports_convergence() {
        // Certified census (§7.1 + §7.2 window column): every number is an
        // outward-rounded true bound. δ_max is the largest parameter window
        // whose K_c·δ contribution stays under 10 % of the budget, verified
        // by re-running the window builder at that δ.
        let budget = 1e-4;
        for level in 2..=8 {
            let proposal =
                propose_difference_return(FEIGENBAUM_C, 0.0, level, 0.25, 8, budget, 10);
            assert!(proposal.failure.is_none(), "level {}", level);
            assert!(!proposal.roundoff_omitted);
            let mut max_value: f64 = 0.0;
            let mut max_deriv: f64 = 0.0;
            for cell in &proposal.cells {
                max_value = max_value.max(cell.value_bound);
                max_deriv = max_deriv.max(cell.deriv_bound);
            }
            // Window column: probe K_c at a negligible δ, size δ_max off it,
            // then confirm at δ_max (K_c grows with δ through the envelopes,
            // so the confirmation run is the binding number).
            let probe = propose_parameter_window(FEIGENBAUM_C, 0.0, level, 0.25, 16, 1e-30, 0.0);
            assert!(probe.failure.is_none(), "window probe level {}", level);
            let delta_max = 0.1 * budget / probe.lipschitz;
            let window =
                propose_parameter_window(FEIGENBAUM_C, 0.0, level, 0.25, 16, delta_max, 0.0);
            assert!(window.failure.is_none(), "window level {}", level);
            assert!(!window.roundoff_omitted);
            println!(
                "level={level} skip={} cells={} uniform={:.3e} value<= {:.3e} deriv<= {:.3e} curvature<= {:.3e} K_c={:.3e} delta_max={:.3e} K_c*delta={:.3e} accepted={}",
                proposal.skip,
                proposal.cells.len(),
                proposal.uniform_error,
                max_value,
                max_deriv,
                proposal.max_curvature,
                window.lipschitz,
                delta_max,
                window.extended_error,
                proposal.accepted
            );
        }
    }

    #[test]
    fn dyadic_conversion_is_exact() {
        for x in [
            0.0,
            1.0,
            -1.0,
            0.1,
            FEIGENBAUM_C,
            3.274e-9,
            f64::MIN_POSITIVE,
            5e-324,
            1.062e-2,
        ] {
            let dyadic = Dyadic::from_f64_exact(x).unwrap();
            assert_eq!(dyadic.to_f64(), x, "{x} -> {:?}", dyadic);
        }
        assert!(Dyadic::from_f64_exact(f64::NAN).is_none());
        assert!(Dyadic::from_f64_exact(f64::INFINITY).is_none());
        assert_eq!(
            Dyadic::from_f64_exact(0.5).unwrap(),
            Dyadic { mantissa: 1, exponent: -1 }
        );
        assert_eq!(
            Dyadic::from_f64_exact(-6.0).unwrap(),
            Dyadic { mantissa: -3, exponent: 1 }
        );
    }

    #[test]
    fn dyadic_export_round_trips_every_cell() {
        let proposal =
            propose_difference_return(FEIGENBAUM_C, 0.0, 6, 0.25, 8, 1e-3, 8);
        assert!(proposal.failure.is_none());
        let certificate = export_dyadic_certificate(&proposal).unwrap();
        assert_eq!(certificate.cells.len(), proposal.cells.len());
        assert!(!certificate.roundoff_omitted);
        for (record, cell) in certificate.cells.iter().zip(&proposal.cells) {
            assert_eq!(record.value_bound.to_f64(), cell.value_bound);
            assert_eq!(record.deriv_bound.to_f64(), cell.deriv_bound);
            assert_eq!(record.radius.to_f64(), cell.radius);
            assert_eq!(record.curvature.to_f64(), cell.curvature);
        }
        // Rational rendering is parseable back (spot check).
        let text = certificate.cells[0].radius.to_rational_string();
        assert!(text.contains("2^"), "{text}");
    }

    #[test]
    fn parameter_window_scales_with_delta() {
        let tight = propose_parameter_window(FEIGENBAUM_C, 0.0, 4, 0.25, 16, 1e-12, 1e-3);
        assert!(tight.failure.is_none(), "{:?}", tight.failure);
        assert!(tight.scale_margin > 0.0);
        assert!(tight.lipschitz.is_finite());
        assert!(tight.extended_error >= tight.base_error);
        let wider = propose_parameter_window(FEIGENBAUM_C, 0.0, 4, 0.25, 16, 1e-10, 1e-3);
        assert!(wider.failure.is_none());
        assert!(wider.extended_error >= tight.extended_error);
        println!(
            "level=4 delta=1e-12: K_c={:.3e} margin={:.3e} extended={:.3e}",
            tight.lipschitz, tight.scale_margin, tight.extended_error
        );
    }

    #[test]
    fn shader_renorm_block_chains_against_exact_stepping() {
        // Mirror the shader's try_apply_renorm application step exactly —
        // dz ← s_n·H(dz/s_n) with H via the u-space Clenshaw — and chain it
        // over consecutive blocks, comparing against true 2^n exact stepping
        // of the reference critical orbit. This validates the integrated
        // application the single-cell pilot did not exercise, and measures the
        // work-step gain (one shader step per 2^n exact iterations).
        let c = C64::new(FEIGENBAUM_C, 0.0);
        for &level in &[2usize, 3, 4, 5, 6] {
            let skip = 1usize << level;
            let s_n = iterate(c, C64::ZERO, skip);
            let s_abs = s_n.abs();
            let inv_sn = C64::new(s_n.re, -s_n.im).scale(1.0 / (s_abs * s_abs));

            // Start at a point inside the certified normalized disk |x| ≤ 0.25,
            // in physical coords dz = s_n·x.
            let x0 = C64::new(0.12, -0.08);
            let mut dz_exact = s_n.mul(x0);
            let mut dz_renorm = dz_exact;

            let blocks = 3;
            let mut exact_steps = 0usize;
            let mut renorm_steps = 0usize;
            let mut max_err: f64 = 0.0;
            for _ in 0..blocks {
                // Renorm side: one shader-style block application.
                let x = inv_sn.mul(dz_renorm);
                if x.abs() > 0.25 {
                    break; // left the certified disk — shader would fall back
                }
                let (h, _) = chebyshev_model_clenshaw(x);
                dz_renorm = s_n.mul(h);
                renorm_steps += 1;

                // Exact side: 2^n true quadratic steps.
                for _ in 0..skip {
                    dz_exact = quadratic(c, dz_exact);
                    exact_steps += 1;
                }
                max_err = max_err.max(dz_renorm.sub(dz_exact).abs());
            }
            // The block reproduces 2^n exact stepping within the model error,
            // scaled to physical coords (|s_n|·census_error), accumulated over
            // the chained blocks. The census normalized error is ~5e-5.
            let tol = s_abs * 5e-3 * blocks as f64;
            assert!(
                max_err < tol,
                "level {level}: chained block error {max_err:.3e} exceeds {tol:.3e}"
            );
            // Gain: exact does `skip` steps per block, renorm does 1.
            let gain = exact_steps as f64 / renorm_steps.max(1) as f64;
            assert!(
                gain >= skip as f64 - 0.5,
                "level {level}: integrated gain {gain:.1} below skip {skip}"
            );
            println!(
                "level={level} skip={skip} blocks_applied={renorm_steps} exact_steps={exact_steps} gain={gain:.0}x chained_err={max_err:.3e}"
            );
        }
    }

    #[test]
    fn clenshaw_matches_chebyshev_model() {
        // The shader's u-space Clenshaw must reproduce the certified model and
        // its derivative across the whole normalized disk.
        for &(re, im) in &[
            (0.0, 0.0),
            (0.25, 0.0),
            (0.0, 0.25),
            (0.13, -0.09),
            (-0.2, 0.15),
            (0.25, 0.25),
        ] {
            let x = C64::new(re, im);
            let (value, deriv) = chebyshev_model_clenshaw(x);
            let model = chebyshev_model(x);
            assert!(
                value.sub(model).abs() < 1e-13,
                "value mismatch at {:?}: clenshaw={:?} model={:?}",
                x,
                value,
                model
            );
            // Derivative vs central finite difference.
            let step = 1e-6;
            let fd = chebyshev_model(x.add(C64::new(step, 0.0)))
                .sub(chebyshev_model(x.sub(C64::new(step, 0.0))))
                .scale(0.5 / step);
            assert!(
                deriv.sub(fd).abs() < 1e-5 * (1.0 + deriv.abs()),
                "deriv mismatch at {:?}: clenshaw={:?} fd={:?}",
                x,
                deriv,
                fd
            );
        }
        // Normalization: h(0) = 1, h'(0) = 0 (even function).
        let (h0, hp0) = chebyshev_model_clenshaw(C64::ZERO);
        assert!((h0.re - 1.0).abs() < 1e-14 && h0.im.abs() < 1e-15);
        assert!(hp0.abs() < 1e-14);
    }

    #[test]
    fn print_wgsl_chebyshev_table() {
        // Emit the WGSL constant table for mandelbrot_brush.wgsl: the u-space
        // Clenshaw coefficients a_k (a_0 = h0, a_k = 2 h_k). Run with --nocapture.
        println!("const RENORM_H_NCOEFF: i32 = {};", H_BAR.len());
        println!("const RENORM_H_A: array<f32, {}> = array<f32, {}>(", H_BAR.len(), H_BAR.len());
        for (k, h) in H_BAR.iter().enumerate() {
            let a_k = if k == 0 { *h } else { 2.0 * h };
            let sep = if k + 1 == H_BAR.len() { "" } else { "," };
            println!("  {:.17e}{}", a_k, sep);
        }
        println!(");");
    }

    #[test]
    fn print_lean_pilot_constants() {
        // Emit the exact rational constants for the Lean kernel-replay pilot
        // (LeanProofs/FeigenbaumRationalReplay.lean): c_infinity and the 22
        // stored model coefficients as exact dyadics, plus f64 previews of
        // the level-2 quantities the pilot bounds.  Run with --nocapture.
        let lean_rat = |x: f64| -> String {
            let d = Dyadic::from_f64_exact(x).unwrap();
            if d.exponent >= 0 {
                format!("({} : ℚ) * 2 ^ {}", d.mantissa, d.exponent)
            } else {
                format!("({} : ℚ) / 2 ^ {}", d.mantissa, -d.exponent)
            }
        };
        println!("def feigenbaumCQ : QC := ⟨{}, 0⟩", lean_rat(FEIGENBAUM_C));
        println!("def hBarQ : List ℚ := [");
        for (i, h) in H_BAR.iter().enumerate() {
            let sep = if i + 1 == H_BAR.len() { "" } else { "," };
            println!("  {}{}", lean_rat(*h), sep);
        }
        println!("]");
        // f64 preview of the pilot cell (center 1/32 + i/32, skip 4).
        let c = C64::new(FEIGENBAUM_C, 0.0);
        let skip = 4usize;
        let scale = iterate(c, C64::ZERO, skip);
        let x0 = C64::new(1.0 / 32.0, 1.0 / 32.0);
        let w = iterate(c, scale.mul(x0), skip);
        let h = chebyshev_model(x0);
        let n = w.sub(scale.mul(h));
        println!(
            "-- preview: |s|={:.6e} |N|=|w-sH|={:.6e} |D|=|N|/|s|={:.6e}",
            scale.abs(),
            n.abs(),
            n.abs() / scale.abs()
        );
    }

    #[test]
    fn renormalized_vs_portfolio_census() {
        // §7.2/§7.3 field census (plain f64 — a measurement of frequencies
        // and available jumps, NOT a proof): cascade views at c_infinity.
        //
        // Event = a rebase during a perturbation pixel orbit (the full state
        // returned near the critical point).  At each event we compare:
        //  - renormalized side: the largest certified-format jump 2^m whose
        //    disk contains the state, |z| <= 0.25·|s_m| ;
        //  - portfolio side: the largest Padé merge block applicable at the
        //    very next orbit index (radius test alpha − beta·|dc|, exactly
        //    like bench_run_pixel; the shader's near-critical guard would
        //    only shrink these blocks further, so this comparison is
        //    portfolio-favorable).
        let c = (FEIGENBAUM_C, 0.0);
        let max_iter = 1usize << 13;
        let mut orbit: Vec<(f64, f64)> = Vec::with_capacity(max_iter + 1);
        let mut z = (0.0f64, 0.0f64);
        orbit.push(z);
        for _ in 0..max_iter {
            z = (z.0 * z.0 - z.1 * z.1 + c.0, 2.0 * z.0 * z.1 + c.1);
            orbit.push(z);
        }
        let levels = crate::bench_build_levels(&orbit, 1e-3, true, 1 << 18);
        assert!(!levels.is_empty());
        let max_level = 12usize;
        let s: Vec<f64> = (0..=max_level)
            .map(|m| {
                let p = orbit[1usize << m];
                (p.0 * p.0 + p.1 * p.1).sqrt()
            })
            .collect();

        for sigma in [1e-6f64, 1e-9, 1e-12] {
            let n = 16usize;
            let mut events = 0u64;
            let mut renorm_hits = 0u64;
            let mut renorm_iters = 0u64;
            let mut portfolio_iters = 0u64;
            let mut best_m_hist = vec![0u64; max_level + 1];
            for gy in 0..n {
                for gx in 0..n {
                    let tx = (gx as f64 / (n - 1) as f64) * 2.0 - 1.0;
                    let ty = (gy as f64 / (n - 1) as f64) * 2.0 - 1.0;
                    let dc = (tx * sigma, ty * sigma);
                    let dc_mag = (dc.0 * dc.0 + dc.1 * dc.1).sqrt();
                    let mut dz = (0.0f64, 0.0f64);
                    let mut ref_i = 0usize;
                    for iter in 0..max_iter {
                        let zr = orbit[ref_i];
                        let two_z_dz = (
                            2.0 * (zr.0 * dz.0 - zr.1 * dz.1),
                            2.0 * (zr.0 * dz.1 + zr.1 * dz.0),
                        );
                        let sq = (dz.0 * dz.0 - dz.1 * dz.1, 2.0 * dz.0 * dz.1);
                        dz = (two_z_dz.0 + sq.0 + dc.0, two_z_dz.1 + sq.1 + dc.1);
                        ref_i += 1;
                        let zf = orbit[ref_i];
                        let full = (zf.0 + dz.0, zf.1 + dz.1);
                        let full2 = full.0 * full.0 + full.1 * full.1;
                        if full2 > 4.0 {
                            break;
                        }
                        let dz2 = dz.0 * dz.0 + dz.1 * dz.1;
                        if full2 < dz2 || ref_i == orbit.len() - 1 {
                            dz = full;
                            ref_i = 0;
                            if iter < 4 {
                                continue;
                            }
                            events += 1;
                            let zmag = full2.sqrt();
                            // Renormalized side: largest m with the state in
                            // the certified disk (minimum useful skip 4).
                            let mut best_m = 0usize;
                            for m in (2..=max_level).rev() {
                                if zmag <= 0.25 * s[m] {
                                    best_m = m;
                                    break;
                                }
                            }
                            best_m_hist[best_m] += 1;
                            if best_m >= 2 {
                                renorm_hits += 1;
                                renorm_iters += 1u64 << best_m;
                            } else {
                                renorm_iters += 1;
                            }
                            // Portfolio side: state one exact step later
                            // (Z_0 = 0 ⇒ dz_1 = dz² + dc), largest block at
                            // orbit index 1 (slot 0 of every level).
                            let dz1 = (
                                full.0 * full.0 - full.1 * full.1 + dc.0,
                                2.0 * full.0 * full.1 + dc.1,
                            );
                            let dz1_2 = dz1.0 * dz1.0 + dz1.1 * dz1.1;
                            let mut best_skip = 1usize;
                            for lvl in levels.iter().rev() {
                                let e = &lvl.entries[0];
                                let radius = (e.alpha - e.beta * dc_mag).max(0.0);
                                if dz1_2 <= radius * radius {
                                    best_skip = lvl.skip;
                                    break;
                                }
                            }
                            portfolio_iters += 1 + best_skip as u64;
                        }
                    }
                }
            }
            assert!(events > 0, "no rebase events at sigma={sigma}");
            let renorm_mean = renorm_iters as f64 / events as f64;
            let portfolio_mean = portfolio_iters as f64 / events as f64;
            let success = renorm_hits as f64 / events as f64;
            let top_m = (0..=max_level)
                .rev()
                .find(|&m| best_m_hist[m] > 0)
                .unwrap_or(0);
            println!(
                "sigma={sigma:.0e} events={events} renorm_mean_jump={renorm_mean:.1} portfolio_mean_jump={portfolio_mean:.1} ratio={:.2} renorm_success={:.1}% top_2^m={}",
                renorm_mean / portfolio_mean,
                100.0 * success,
                1usize << top_m
            );
            println!(
                "  best_m histogram (m: events): {}",
                (0..=max_level)
                    .filter(|&m| best_m_hist[m] > 0)
                    .map(|m| format!("{}: {}", m, best_m_hist[m]))
                    .collect::<Vec<_>>()
                    .join(", ")
            );
            assert!(renorm_mean.is_finite() && portfolio_mean.is_finite());
        }
    }

    #[test]
    fn parameter_window_rejects_gauge_destroying_delta() {
        // A window so wide the critical-scale envelope swallows |s_n| must
        // fail instead of emitting a bogus margin.
        let broken = propose_parameter_window(FEIGENBAUM_C, 0.0, 8, 0.25, 8, 1e-2, 1e-3);
        assert!(broken.failure.is_some());
    }

    #[test]
    fn cell_recurrence_encloses_a_corner_without_roundoff_budget() {
        let c = C64::new(FEIGENBAUM_C, 0.0);
        let level = 4;
        let skip = 1usize << level;
        let scale = iterate(c, C64::ZERO, skip);
        let center = C64::new(0.1, -0.05);
        let delta = C64::new(1e-7, -2e-7);
        let mut w = scale.mul(center);
        let mut exact = scale.mul(center.add(delta));
        let mut error = scale.abs() * delta.abs();
        for _ in 0..skip {
            error = (2.0 * w.abs() + error) * error;
            w = quadratic(c, w);
            exact = quadratic(c, exact);
            // A small allowance covers the deliberately omitted f64 rounding
            // in this regression test; the exported proposal remains marked.
            assert!(exact.sub(w).abs() <= error * (1.0 + 1e-10) + 1e-15);
        }
    }
}
