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
