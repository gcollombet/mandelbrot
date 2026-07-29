// Super-pixel Taylor reach, measured on the CPU (build-only).
//
// The question: a pixel that has been computed knows z, z′ = ∂z/∂c and
// z″ = ∂²z/∂c². How far in c — i.e. how many PIXELS — can
//
//     ẑ(δc) = z + z′·δc + ½·z″·δc²
//
// serve its neighbours before the truncation exceeds the color budget? If that
// radius is worth more than a pixel over large parts of the screen, one
// computed pixel can fill a disk of them and the render skips work in
// RESULT space rather than in orbit space — an axis orthogonal to every tier
// in the directions document.
//
// ── why this lives on the CPU ───────────────────────────────────────────────────
//
// The renderer already stores this payload per escaped pixel (raw layers
// 8/11/12) and a GPU debug view can display it. But the stored z″ is a MANTISSA
// whose scale is tied to 2·derS, folded through `exp(clamp(…, −78, 78))` at
// every block application. Where z′ grows much faster than z″ that fold
// underflows f32 and the payload reads as exactly zero — the field-observed
// brown region next to a minibrot. A survey run on top of that cannot separate
// "the reach is small here" from "the payload died here".
//
// Here z′, z″ and z‴ are carried in CFe (f64 mantissa + i64 exponent): no tied
// scale, no clamp, no underflow. The numbers below are therefore about the
// mathematics, not about the storage format.
//
// ── the criterion ───────────────────────────────────────────────────────────────
//
// The color is driven by the smooth iteration ν = n + 1 − log2(log|z|/log B); an
// error ε on z moves ν by roughly ε/(|z|·ln|z|·ln2), so a RELATIVE tolerance on
// |z| is the right budget. Two radii are reported because they answer different
// questions:
//
//   ρ_last — ½|z″|ρ² = tol·|z|, the last term RETAINED. This is what the GPU
//            debug view shows, and it is a proxy: it gauges the truncation by
//            the last term kept rather than the first one dropped.
//   ρ_next — ⅙|z‴|ρ³ = tol·|z|, the first term DROPPED. This is the honest
//            estimate of the quadratic value model's error.
//   ρ_der  — ½|z‴|ρ² = tol·|z′|, the first term dropped by the linear
//            derivative model z′ + z″δc. Distance shading is only usable out
//            to min(ρ_next, ρ_der).
//   ρ_der2 — ⅙|z⁗|ρ³ = tol·|z′|, the first term dropped by the quadratic
//            derivative model z′ + z″δc + ½z‴δc² (Gate A2).
//
// Gate B measures the quantity the palette actually reads. It evaluates the
// same log-log smooth-iteration formula as color.wgsl at the ANCHOR iteration:
//
//   ν_pred = n_anchor + 1 − log2(log|ẑ|² / log μ)
//
// and compares it with ν from a full target walk. This matters when target and
// anchor escape at different iterations: ẑ may then be below bailout and the
// formula is extrapolating rather than smoothing a conventional escape value.
//
// Neither is a certificate: a proven radius needs a bound on z‴ over the whole
// disk (Cauchy or interval), not its value at the centre. ρ_next is the number
// to design against; ρ_last/ρ_next says how much the GPU view overstates.

use crate::jet::CFe;

/// Relative tolerance on |ẑ − z|. At the bailout |z| ≈ 2 this holds the smooth
/// iteration inside ~1/500 of an iteration — well under a palette quantum.
pub const REACH_TOL: f64 = 1e-3;

/// Escape radius squared used by the production renderer.
pub const BAILOUT_SQ: f64 = 4.0;

/// The palette texture has 4096 texels around one phase cycle. Since the color
/// shader maps `phase = 2ν / palettePeriod`, one palette texel spans
/// `palettePeriod / (2 * PALETTE_TEXTURE_WIDTH)` iterations.
pub const PALETTE_TEXTURE_WIDTH: f64 = 4096.0;

#[derive(Clone, Copy, Debug)]
pub struct ReachSample {
    /// log2 of the reach in c units, last-retained-term criterion (the GPU view).
    pub log2_rho_last: f64,
    /// log2 of the reach in c units, first-dropped-term criterion (the honest one).
    pub log2_rho_next: f64,
    /// log2 of the reach in c units for the first-order derivative model.
    pub log2_rho_der: f64,
    /// log2 of the reach in c units for the quadratic derivative model.
    pub log2_rho_der2: f64,
    /// Orbit value at the first escape iteration.
    pub z_escape: (f64, f64),
    /// First and second parameter derivatives at `iters`. They are the payload
    /// needed to evaluate the quadratic continuation for Gate B.
    pub der: CFe,
    pub snd: CFe,
    /// Iterations consumed.
    pub iters: usize,
    /// False when the pixel never escaped (interior or budget exhausted): the
    /// payload is undefined there and the sample must be excluded, not counted
    /// as a zero.
    pub escaped: bool,
}

#[inline]
fn cfe_double(v: CFe) -> CFe {
    if v.is_zero() {
        return CFe::ZERO;
    }
    CFe {
        x: v.x,
        y: v.y,
        e: v.e + 1,
    }
}

/// Production smooth-iteration formula, expressed from log2|z| so a Taylor
/// prediction can remain in CFe without overflowing f64.
///
/// The two `1e-12` clamps deliberately match `smooth_escape_fraction` in
/// `src/assets/color.wgsl`. In particular, this function accepts values below
/// bailout because analytic AA evaluates the continuation at the anchor's
/// iteration even when the target would escape later.
fn smooth_iteration_from_log2_mag(iter: usize, log2_mag: Option<f64>) -> Option<f64> {
    let log_z_sq_floor = 1e-12f64.ln();
    let log_z_sq = log2_mag
        .map(|m| 2.0 * m * std::f64::consts::LN_2)
        .unwrap_or(log_z_sq_floor)
        .max(log_z_sq_floor);
    let log_mu = BAILOUT_SQ.ln().max(1e-6);
    let ratio = (log_z_sq / log_mu).max(1e-12);
    let fraction = 1.0 - ratio.ln() / std::f64::consts::LN_2;
    let nu = iter as f64 + fraction;
    if nu.is_finite() {
        Some(nu)
    } else {
        None
    }
}

/// Smooth iteration of a concrete orbit value, using the same formula as the
/// analytic-AA coloring path.
pub fn smooth_iteration(iter: usize, z: (f64, f64)) -> Option<f64> {
    let magnitude = z.0.hypot(z.1);
    let log2_mag = if magnitude > 0.0 && magnitude.is_finite() {
        Some(magnitude.log2())
    } else if magnitude == 0.0 {
        None
    } else {
        return None;
    };
    smooth_iteration_from_log2_mag(iter, log2_mag)
}

/// Evaluate the anchor's quadratic value continuation at `delta_c`, then read
/// ν at the anchor escape iteration exactly as analytic AA does.
pub fn taylor_smooth_iteration(anchor: &ReachSample, delta_c: (f64, f64)) -> Option<f64> {
    if !anchor.escaped {
        return None;
    }
    let delta = CFe::from_c(delta_c.0, delta_c.1);
    let delta_sq = delta.mul(delta);
    let half = CFe::from_c(0.5, 0.0);
    let z_hat = CFe::from_c(anchor.z_escape.0, anchor.z_escape.1)
        .add(anchor.der.mul(delta))
        .add(half.mul(anchor.snd).mul(delta_sq));
    smooth_iteration_from_log2_mag(anchor.iters, z_hat.log2_mag())
}

/// ν displacement corresponding exactly to a relative magnitude error `tol`
/// at bailout. This is the ν-space budget implied by the existing |z| proxy.
pub fn nu_tolerance_at_bailout(tol: f64) -> f64 {
    if !(0.0..1.0).contains(&tol) {
        return f64::NAN;
    }
    let log_mu = BAILOUT_SQ.ln();
    let outward = ((log_mu + 2.0 * (1.0 + tol).ln()) / log_mu).log2().abs();
    let inward = ((log_mu + 2.0 * (1.0 - tol).ln()) / log_mu).log2().abs();
    outward.max(inward)
}

/// Exact inverse of [`nu_tolerance_at_bailout`]: the relative `|z|` tolerance
/// whose implied ν budget at bailout is `nu_budget`.
///
/// The inward branch `(1 − tol)` is the larger of the two for every
/// `tol ∈ (0, 1)` — `|log2(1 − y)| > log2(1 + y)` — so inverting it inverts the
/// max. `log_mu + 2·ln(1 − tol)` reaches zero at `tol = 1/2`, where the
/// perturbed value falls under the bailout and ν stops being defined; the image
/// is therefore `(0, 1/2)` and the map is monotone onto it.
pub fn tol_for_nu_budget(nu_budget: f64) -> f64 {
    if !(nu_budget > 0.0) || !nu_budget.is_finite() {
        return f64::NAN;
    }
    let log_mu = BAILOUT_SQ.ln();
    1.0 - (log_mu * ((-nu_budget).exp2() - 1.0) / 2.0).exp()
}

/// One palette-texture texel expressed in smooth iterations.
pub fn palette_nu_quantum(palette_period: f64) -> f64 {
    palette_period.max(1e-4) / (2.0 * PALETTE_TEXTURE_WIDTH)
}

/// `log2 ρ` shift when the tolerance moves from `from` to `to`.
///
/// `ρ_next` and `ρ_der2` both solve a CUBIC remainder equation
/// (`⅙·|·|·ρ³ = tol·|·|`), so `log2 ρ` is affine in `log2 tol` with slope ⅓ and
/// the shift is exact — a tolerance sweep needs no second walk. `ρ_last` and
/// `ρ_der` are quadratic criteria and would take slope ½ instead.
pub fn cubic_reach_log2_shift(from: f64, to: f64) -> f64 {
    (to / from).log2() / 3.0
}

/// Walk one pixel and return its reach.
///
/// `orbit` is the reference orbit, `dc` the pixel's offset from it. The pixel's
/// own value advances by the exact perturbation recurrence (with the Zhuoran
/// rebase), while the derivatives ride the FULL z:
///
///     z′_{n+1}  = 2·z_n·z′_n + 1
///     z″_{n+1}  = 2·(z′_n² + z_n·z″_n)
///     z‴_{n+1}  = 2·(3·z′_n·z″_n + z_n·z‴_n)
///     z⁗_{n+1}  = 2·(3·z″_n² + 4·z′_n·z‴_n + z_n·z⁗_n)
///
/// z is O(1) until escape so f64 carries it; the derivatives run past any f64
/// exponent within a few hundred iterations, hence CFe.
pub fn reach_at_pixel(
    orbit: &[(f64, f64)],
    dc: (f64, f64),
    max_iter: usize,
    tol: f64,
) -> ReachSample {
    let mut dz = (0.0f64, 0.0f64);
    let mut ref_i = 0usize;
    let mut der = CFe::ZERO;
    let mut snd = CFe::ZERO;
    let mut trd = CFe::ZERO;
    let mut fth = CFe::ZERO;
    let three = CFe::from_c(3.0, 0.0);
    let four = CFe::from_c(4.0, 0.0);

    let mut escaped = false;
    let mut z_escape = (0.0f64, 0.0f64);
    let mut iters = 0usize;

    while iters < max_iter {
        let zr = orbit[ref_i];
        // Full z BEFORE the step — what all three recurrences read.
        let z = (zr.0 + dz.0, zr.1 + dz.1);
        let zc = CFe::from_c(z.0, z.1);

        // Order matters: each new value reads the OLD lower orders.
        let fth_new = cfe_double(
            three
                .mul(snd)
                .mul(snd)
                .add(four.mul(der).mul(trd))
                .add(zc.mul(fth)),
        );
        let trd_new = cfe_double(three.mul(der).mul(snd).add(zc.mul(trd)));
        let snd_new = cfe_double(der.mul(der).add(zc.mul(snd)));
        let der_new = cfe_double(zc.mul(der)).add(CFe::ONE);
        fth = fth_new;
        trd = trd_new;
        snd = snd_new;
        der = der_new;

        // Exact perturbation step.
        dz = (
            2.0 * (zr.0 * dz.0 - zr.1 * dz.1) + dz.0 * dz.0 - dz.1 * dz.1 + dc.0,
            2.0 * (zr.0 * dz.1 + zr.1 * dz.0) + 2.0 * dz.0 * dz.1 + dc.1,
        );
        ref_i += 1;
        iters += 1;

        let zf = orbit[ref_i];
        let full = (zf.0 + dz.0, zf.1 + dz.1);
        let full2 = full.0 * full.0 + full.1 * full.1;
        if full2 > BAILOUT_SQ {
            escaped = true;
            z_escape = full;
            break;
        }
        // Zhuoran rebase (and end-of-orbit wrap): the full value becomes the
        // new delta against orbit[0] = 0, so z is unchanged by this.
        if full2 < dz.0 * dz.0 + dz.1 * dz.1 || ref_i >= orbit.len() - 1 {
            dz = full;
            ref_i = 0;
        }
    }

    if !escaped {
        return ReachSample {
            log2_rho_last: f64::NEG_INFINITY,
            log2_rho_next: f64::NEG_INFINITY,
            log2_rho_der: f64::NEG_INFINITY,
            log2_rho_der2: f64::NEG_INFINITY,
            z_escape: (0.0, 0.0),
            der: CFe::ZERO,
            snd: CFe::ZERO,
            iters,
            escaped: false,
        };
    }

    let log2_z = (z_escape.0.hypot(z_escape.1)).max(1e-300).log2();
    let last = match snd.log2_mag() {
        // ½|z″|ρ² = tol|z|
        Some(l) => 0.5 * ((2.0 * tol).log2() + log2_z - l),
        None => f64::INFINITY, // z″ = 0: the model is exact to second order
    };
    let next = match trd.log2_mag() {
        // ⅙|z‴|ρ³ = tol|z|
        Some(l) => ((6.0 * tol).log2() + log2_z - l) / 3.0,
        None => f64::INFINITY,
    };
    let derivative = match (trd.log2_mag(), der.log2_mag()) {
        // ½|z‴|ρ² = tol|z′|
        (Some(l_trd), Some(l_der)) => 0.5 * ((2.0 * tol).log2() + l_der - l_trd),
        // With no cubic derivative the linear derivative model has no
        // second-order remainder at the anchor.
        (None, _) => f64::INFINITY,
        // A zero reference derivative cannot absorb a non-zero remainder.
        (Some(_), None) => f64::NEG_INFINITY,
    };
    let derivative2 = match (fth.log2_mag(), der.log2_mag()) {
        // ⅙|z⁗|ρ³ = tol|z′|
        (Some(l_fth), Some(l_der)) => ((6.0 * tol).log2() + l_der - l_fth) / 3.0,
        // With no fourth derivative the quadratic derivative model has no
        // cubic remainder at the anchor.
        (None, _) => f64::INFINITY,
        // A zero reference derivative cannot absorb a non-zero remainder.
        (Some(_), None) => f64::NEG_INFINITY,
    };
    ReachSample {
        log2_rho_last: last,
        log2_rho_next: next,
        log2_rho_der: derivative,
        log2_rho_der2: derivative2,
        z_escape,
        der,
        snd,
        iters,
        escaped: true,
    }
}

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

    /// Value-only full target walk. It deliberately does not evaluate Taylor
    /// derivatives: Gate B needs an independent ν truth and runs this many
    /// times per anchor.
    fn escape_at_pixel(
        orbit: &[(f64, f64)],
        dc: (f64, f64),
        max_iter: usize,
    ) -> Option<(usize, (f64, f64))> {
        let mut dz = (0.0f64, 0.0f64);
        let mut ref_i = 0usize;
        let mut iters = 0usize;
        while iters < max_iter {
            let zr = orbit[ref_i];
            dz = (
                2.0 * (zr.0 * dz.0 - zr.1 * dz.1) + dz.0 * dz.0 - dz.1 * dz.1 + dc.0,
                2.0 * (zr.0 * dz.1 + zr.1 * dz.0) + 2.0 * dz.0 * dz.1 + dc.1,
            );
            ref_i += 1;
            iters += 1;
            let zf = orbit[ref_i];
            let full = (zf.0 + dz.0, zf.1 + dz.1);
            let full2 = full.0 * full.0 + full.1 * full.1;
            if full2 > BAILOUT_SQ {
                return Some((iters, full));
            }
            if full2 < dz.0 * dz.0 + dz.1 * dz.1 || ref_i >= orbit.len() - 1 {
                dz = full;
                ref_i = 0;
            }
        }
        None
    }

    /// Direct (non-perturbed) orbit value z_n(c), for finite differences.
    fn z_at(c: (f64, f64), n: usize) -> (f64, f64) {
        let (mut zx, mut zy) = (0.0f64, 0.0f64);
        for _ in 0..n {
            let nx = zx * zx - zy * zy + c.0;
            let ny = 2.0 * zx * zy + c.1;
            zx = nx;
            zy = ny;
        }
        (zx, zy)
    }

    /// Run the four recurrences directly at a parameter (no perturbation), so
    /// the test isolates the derivative algebra from the rebase machinery.
    fn derivs_at(c: (f64, f64), n: usize) -> (CFe, CFe, CFe, CFe) {
        let (mut zx, mut zy) = (0.0f64, 0.0f64);
        let (mut der, mut snd, mut trd, mut fth) = (CFe::ZERO, CFe::ZERO, CFe::ZERO, CFe::ZERO);
        let three = CFe::from_c(3.0, 0.0);
        let four = CFe::from_c(4.0, 0.0);
        for _ in 0..n {
            let zc = CFe::from_c(zx, zy);
            let q = cfe_double(
                three
                    .mul(snd)
                    .mul(snd)
                    .add(four.mul(der).mul(trd))
                    .add(zc.mul(fth)),
            );
            let t = cfe_double(three.mul(der).mul(snd).add(zc.mul(trd)));
            let s = cfe_double(der.mul(der).add(zc.mul(snd)));
            let d = cfe_double(zc.mul(der)).add(CFe::ONE);
            fth = q;
            trd = t;
            snd = s;
            der = d;
            let nx = zx * zx - zy * zy + c.0;
            let ny = 2.0 * zx * zy + c.1;
            zx = nx;
            zy = ny;
        }
        (der, snd, trd, fth)
    }

    /// The load-bearing check: the three recurrences must reproduce central
    /// finite differences of z_n(c). Everything the census reports is a ratio
    /// of these, so an error here would be invisible in the output and fatal to
    /// the conclusion.
    #[test]
    fn derivatives_match_finite_differences() {
        let c = (-0.5, 0.3);
        let n = 12; // deep enough to be non-trivial, shallow enough for f64 FD
        let h = 1e-4;
        let (der, snd, trd, fth) = derivs_at(c, n);

        // ∂/∂c along the real axis (z is holomorphic in c, so one direction is
        // enough and the imaginary direction must agree by Cauchy-Riemann).
        let zp = z_at((c.0 + h, c.1), n);
        let zm = z_at((c.0 - h, c.1), n);
        let z0 = z_at(c, n);
        let z2p = z_at((c.0 + 2.0 * h, c.1), n);
        let z2m = z_at((c.0 - 2.0 * h, c.1), n);

        let fd1 = ((zp.0 - zm.0) / (2.0 * h), (zp.1 - zm.1) / (2.0 * h));
        let fd2 = (
            (zp.0 - 2.0 * z0.0 + zm.0) / (h * h),
            (zp.1 - 2.0 * z0.1 + zm.1) / (h * h),
        );
        let fd3 = (
            (z2p.0 - 2.0 * zp.0 + 2.0 * zm.0 - z2m.0) / (2.0 * h * h * h),
            (z2p.1 - 2.0 * zp.1 + 2.0 * zm.1 - z2m.1) / (2.0 * h * h * h),
        );

        let close = |v: CFe, fd: (f64, f64), tol: f64, name: &str| {
            let (vx, vy) = v.to_f64();
            let scale = fd.0.hypot(fd.1).max(1.0);
            let err = ((vx - fd.0).powi(2) + (vy - fd.1).powi(2)).sqrt() / scale;
            assert!(
                err < tol,
                "{}: recurrence ({:.6e}, {:.6e}) vs finite diff ({:.6e}, {:.6e}), rel {:.2e}",
                name,
                vx,
                vy,
                fd.0,
                fd.1,
                err
            );
        };
        close(der, fd1, 1e-6, "z′");
        close(snd, fd2, 1e-4, "z″");
        close(trd, fd3, 1e-2, "z‴"); // 3rd-order FD is the noisiest

        // Differentiate the already-validated z‴ recurrence once with a
        // central difference. This is much better conditioned than taking a
        // fourth finite difference of z directly.
        let h4 = 1e-6;
        let (_, _, trd_p, _) = derivs_at((c.0 + h4, c.1), n);
        let (_, _, trd_m, _) = derivs_at((c.0 - h4, c.1), n);
        let trd_p = trd_p.to_f64();
        let trd_m = trd_m.to_f64();
        let fd4 = (
            (trd_p.0 - trd_m.0) / (2.0 * h4),
            (trd_p.1 - trd_m.1) / (2.0 * h4),
        );
        close(fth, fd4, 1e-5, "z⁗");
    }

    /// The perturbed walk must agree with the direct one on a shallow pixel,
    /// rebases included — otherwise the census would measure the rebase
    /// bookkeeping instead of the field.
    #[test]
    fn perturbed_walk_matches_direct() {
        // A FAST-escaping centre, deliberately: near the boundary the direct
        // f64 orbit and the perturbed one diverge by rounding after a few
        // thousand iterations — that divergence is the whole reason
        // perturbation exists, and comparing against it there would test
        // nothing. 0.35+0.4i sits just outside the cardioid and escapes in a
        // few dozen steps, where the direct walk is still exact.
        let center = (0.35, 0.4);
        let orbit = ref_orbit_f64(center.0, center.1, 4096);
        let dc = (1e-6, -3e-7);
        let s = reach_at_pixel(&orbit, dc, 4096, REACH_TOL);
        assert!(s.escaped, "test pixel should escape");

        let c = (center.0 + dc.0, center.1 + dc.1);
        let (der_direct, snd_direct, trd_direct, fth_direct) = derivs_at(c, s.iters);
        let log2_z = {
            let z = z_at(c, s.iters);
            z.0.hypot(z.1).max(1e-300).log2()
        };
        let last_direct =
            0.5 * ((2.0 * REACH_TOL).log2() + log2_z - snd_direct.log2_mag().unwrap());
        let next_direct =
            ((6.0 * REACH_TOL).log2() + log2_z - trd_direct.log2_mag().unwrap()) / 3.0;
        let derivative_direct = 0.5
            * ((2.0 * REACH_TOL).log2() + der_direct.log2_mag().unwrap()
                - trd_direct.log2_mag().unwrap());
        let derivative2_direct = ((6.0 * REACH_TOL).log2() + der_direct.log2_mag().unwrap()
            - fth_direct.log2_mag().unwrap())
            / 3.0;
        assert!(
            (s.log2_rho_last - last_direct).abs() < 0.05,
            "ρ_last perturbed 2^{:.4} vs direct 2^{:.4}",
            s.log2_rho_last,
            last_direct
        );
        assert!(
            (s.log2_rho_next - next_direct).abs() < 0.05,
            "ρ_next perturbed 2^{:.4} vs direct 2^{:.4}",
            s.log2_rho_next,
            next_direct
        );
        assert!(
            (s.log2_rho_der - derivative_direct).abs() < 0.05,
            "ρ_der perturbed 2^{:.4} vs direct 2^{:.4}",
            s.log2_rho_der,
            derivative_direct
        );
        assert!(
            (s.log2_rho_der2 - derivative2_direct).abs() < 0.05,
            "ρ_der2 perturbed 2^{:.4} vs direct 2^{:.4}",
            s.log2_rho_der2,
            derivative2_direct
        );
    }

    #[test]
    fn smooth_iteration_matches_analytic_aa_formula() {
        let iter = 37usize;
        let at_bailout = smooth_iteration(iter, (2.0, 0.0)).unwrap();
        assert!((at_bailout - 38.0).abs() < 1e-12);

        let z = (3.0f64, 4.0f64);
        let z_sq = z.0 * z.0 + z.1 * z.1;
        let expected = iter as f64 + 1.0 - ((z_sq.ln() / BAILOUT_SQ.ln()).max(1e-12)).log2();
        let actual = smooth_iteration(iter, z).unwrap();
        assert!((actual - expected).abs() < 1e-12);

        // The palette quantum is a phase-texel quantity, hence it scales with
        // the active period rather than being a fixed ν constant.
        assert!((palette_nu_quantum(256.0) - 1.0 / 32.0).abs() < 1e-12);
        assert!((palette_nu_quantum(1.0) - 1.0 / 8192.0).abs() < 1e-12);
        assert!((nu_tolerance_at_bailout(REACH_TOL) - 1.0 / 500.0).abs() < 2e-4);
    }

    #[test]
    fn tol_and_nu_budget_invert_each_other() {
        for tol in [1e-6, 1e-4, 1e-3, 1e-2, 5e-2, 2e-1, 4e-1] {
            let round_trip = tol_for_nu_budget(nu_tolerance_at_bailout(tol));
            // 1e-9 relative, not ulp: the forward map cancels `log_mu` against
            // `2·ln(1 ± tol)` and loses digits as tol → 0.
            assert!(
                (round_trip - tol).abs() <= 1e-9 * tol,
                "tol {} round-tripped to {}",
                tol,
                round_trip
            );
        }
        // The image is (0, 1/2): past that the perturbed value drops under the
        // bailout and ν is no longer defined.
        // The supremum 1/2 is attained once `2^(−β)` underflows to zero.
        assert!(tol_for_nu_budget(1e6) <= 0.5);
        assert!(tol_for_nu_budget(1e6) > 0.499);
        assert!(tol_for_nu_budget(10.0) < 0.5);
        assert!(tol_for_nu_budget(0.0).is_nan());

        // The visual budget the box-dimension note points at, and the factor it
        // claims: one P=256 texel is ~15× the ν budget REACH_TOL implies, and a
        // cubic reach converts that into ~2.5× radius, ~6× fewer anchors.
        let visual = tol_for_nu_budget(palette_nu_quantum(256.0));
        assert!((visual / REACH_TOL - 14.74).abs() < 0.05, "visual tol {visual}");
        let radius_gain = cubic_reach_log2_shift(REACH_TOL, visual).exp2();
        assert!((radius_gain - 2.452).abs() < 0.01, "radius gain {radius_gain}");
        assert!((radius_gain * radius_gain - 6.01).abs() < 0.05);
    }

    #[test]
    fn taylor_nu_is_exact_at_the_anchor_and_finite_across_an_escape_branch() {
        let center = (-0.75, 0.1);
        let orbit = ref_orbit_f64(center.0, center.1, 4096);
        let max_iter = 4096.min(orbit.len().saturating_sub(2));
        let anchor = reach_at_pixel(&orbit, (0.0, 0.0), max_iter, REACH_TOL);
        assert!(anchor.escaped);

        let anchor_nu = smooth_iteration(anchor.iters, anchor.z_escape).unwrap();
        let predicted_at_anchor = taylor_smooth_iteration(&anchor, (0.0, 0.0)).unwrap();
        assert!((anchor_nu - predicted_at_anchor).abs() < 1e-12);

        // Locate a nearby target on another escape-iteration branch instead of
        // baking in one floating-point-sensitive offset.
        let mut different_branch = None;
        for k in 1..=256 {
            for sign in [-1.0, 1.0] {
                let delta = (sign * k as f64 * 1e-5, 0.0);
                if let Some((target_iter, target_z)) = escape_at_pixel(&orbit, delta, max_iter) {
                    if target_iter != anchor.iters {
                        different_branch = Some((delta, target_iter, target_z));
                        break;
                    }
                }
            }
            if different_branch.is_some() {
                break;
            }
        }
        let (delta, target_iter, target_z) =
            different_branch.expect("test fixture must cross an escape-iteration branch");
        let predicted = taylor_smooth_iteration(&anchor, delta).unwrap();
        let truth = smooth_iteration(target_iter, target_z).unwrap();
        assert!(predicted.is_finite() && truth.is_finite());
        assert_ne!(target_iter, anchor.iters);
    }

    /// Tightening the tolerance must shrink the reach at the rate the criterion
    /// dictates: ρ_last rides ρ², ρ_next rides ρ³.
    #[test]
    fn reach_scales_with_tolerance() {
        let orbit = ref_orbit_f64(-0.743643887037151, 0.131825904205330, 4096);
        let a = reach_at_pixel(&orbit, (3e-8, 1e-8), 4096, 1e-3);
        let b = reach_at_pixel(&orbit, (3e-8, 1e-8), 4096, 1e-9);
        assert!(a.escaped && b.escaped);
        let slope_last = (a.log2_rho_last - b.log2_rho_last) / 20.0;
        let slope_next = (a.log2_rho_next - b.log2_rho_next) / 20.0;
        assert!(
            (slope_last - 0.5).abs() < 0.02,
            "ρ_last slope {} ≠ 1/2",
            slope_last
        );
        assert!(
            (slope_next - 1.0 / 3.0).abs() < 0.02,
            "ρ_next slope {} ≠ 1/3",
            slope_next
        );
    }

    /// The derivative continuation is first order, so its first omitted term
    /// is quadratic: tightening tol by 2^k shrinks ρ_der by 2^(k/2).
    #[test]
    fn derivative_reach_scales_with_square_root_tolerance() {
        let orbit = ref_orbit_f64(-0.743643887037151, 0.131825904205330, 4096);
        let loose = reach_at_pixel(&orbit, (3e-8, 1e-8), 4096, 1e-3);
        let tight = reach_at_pixel(&orbit, (3e-8, 1e-8), 4096, 1e-9);
        assert!(loose.escaped && tight.escaped);
        let slope = (loose.log2_rho_der - tight.log2_rho_der) / 20.0;
        assert!((slope - 0.5).abs() < 0.02, "ρ_der slope {} ≠ 1/2", slope);
    }

    /// Gate A2 raises the derivative continuation to second order, so its
    /// first omitted term is cubic and the reach scales as tol^(1/3).
    #[test]
    fn quadratic_derivative_reach_scales_with_cube_root_tolerance() {
        let orbit = ref_orbit_f64(-0.743643887037151, 0.131825904205330, 4096);
        let loose = reach_at_pixel(&orbit, (3e-8, 1e-8), 4096, 1e-3);
        let tight = reach_at_pixel(&orbit, (3e-8, 1e-8), 4096, 1e-9);
        assert!(loose.escaped && tight.escaped);
        let slope = (loose.log2_rho_der2 - tight.log2_rho_der2) / 20.0;
        assert!(
            (slope - 1.0 / 3.0).abs() < 0.02,
            "ρ_der2 slope {} ≠ 1/3",
            slope
        );
    }

    /// Field census: the reach in PIXELS across the standard views and a range
    /// of zoom depths.
    ///
    ///   medLast  — median log2 ρ in pixels, last-retained-term (the GPU view)
    ///   medVal  — median log2 ρ in pixels for the quadratic value model
    ///   medD1   — median log2 ρ in pixels for the linear derivative model
    ///   medD2   — median log2 ρ in pixels for the quadratic derivative model
    ///   medUse2 — median log2 min(ρ_value, ρ_der2) in pixels
    ///   d1/d2Lim — shares where each derivative radius binds against value
    ///   val≥4   — value-only baseline used by both Gate A decisions
    ///   A1≥4    — original first-order derivative usable share
    ///   A2≥1/≥4/≥16 — shares for the quadratic derivative redesign
    ///   uns%     — share of pixels that never escaped within the budget. This
    ///              conflates genuine interior with "would have escaped later";
    ///              the reach is undefined for both, so they are excluded from
    ///              every other column rather than counted as zero.
    ///
    /// A median of 2 means "2 log2 pixels" = 4 px radius ⇒ ~50 pixels served by
    /// one computation. Read the ≥ columns rather than the median alone: the
    /// idea pays where the field is smooth, and those columns say how much of
    /// the screen that is.
    ///
    /// Run with: cargo test reach_census -- --ignored --nocapture
    #[test]
    #[ignore = "census: heavy, run explicitly with --ignored --nocapture"]
    fn reach_census() {
        println!(
            "\n reach | view          σ      iters | medVal medD1 medD2 medUse2 | d1Lim d2Lim | val≥4 A1≥4 | A2≥1 A2≥4 A2≥16 | uns%"
        );
        // Centres must sit ON the boundary: a disk around an interior point
        // (the -0.75 cardioid/bulb junction, say) is entirely interior and the
        // reach is undefined there — the first run of this census returned
        // 100 % unresolved for exactly that reason. These are the classical
        // deep-zoom targets, where structure survives at every scale.
        // (name, cx, cy)
        let views: [(&str, f64, f64); 4] = [
            ("seahorse", -0.743643887037151, 0.131825904205330),
            ("elephant", 0.2925755, 0.0149977),
            ("triple-spiral", -0.7269, 0.1889),
            ("misiurewicz", -0.10109636384562, 0.95628651080914),
        ];
        // View half-height in c, with the iteration budget it actually needs:
        // a pixel near the boundary at σ = 1e-9 needs far more than the 8k that
        // suffices at 1e-3, and a starved budget reports "unresolved" for what
        // is really "would have escaped later".
        let sigmas: [(f64, usize); 3] = [(1e-3, 4_000), (1e-6, 30_000), (1e-9, 120_000)];
        const H: f64 = 1080.0;
        const G: usize = 48; // G×G sample grid

        for (name, cx, cy) in views {
            for (sigma, iters) in sigmas {
                // A boundary centre is only approximately on the boundary in
                // f64, so its orbit eventually drifts and escapes: seahorse
                // survives 3091 steps, triple-spiral 435, misiurewicz 137.
                //
                // This used to cap the budget at that length, which silently
                // starved every deep row — the σ = 1e-9 triple-spiral run did
                // 433 iterations instead of 120 000 and reported the unfinished
                // pixels as interior in `uns%`. Two separate mistakes, both
                // diagnosed by boxdim.rs:
                //
                //   * the cap is unnecessary, because the end-of-orbit rebase
                //     (`dz = full; ref_i = 0`) is exact — orbit[0] = 0 and
                //     orbit[1] = c_ref make the next step `dz² + c`;
                //   * but dropping the cap alone leaves the walk on a reference
                //     that is pure rounding past its escape, which at σ ≤ 1e-6
                //     makes pixels escape on noise.
                //
                // So: full budget, on a reference built at a precision the depth
                // deserves. Rows published before 2026-07-27 predate this.
                let orbit = crate::boxdim::census_reference(cx, cy, sigma, iters);
                assert!(orbit.len() >= 3, "{name} reference degenerate");
                let log2_pixel = (2.0 * sigma / H).log2();
                let mut value: Vec<f64> = Vec::new();
                let mut derivative1: Vec<f64> = Vec::new();
                let mut derivative2: Vec<f64> = Vec::new();
                let mut usable1: Vec<f64> = Vec::new();
                let mut usable2: Vec<f64> = Vec::new();
                let mut derivative1_limiting = 0usize;
                let mut derivative2_limiting = 0usize;
                let mut interior = 0usize;
                let mut total = 0usize;
                for gy in 0..G {
                    for gx in 0..G {
                        let tx = (gx as f64 / (G - 1) as f64) * 2.0 - 1.0;
                        let ty = (gy as f64 / (G - 1) as f64) * 2.0 - 1.0;
                        // Square pixel footprint: x spans the same σ here (the
                        // aspect only stretches the sample lattice, not ρ).
                        let dc = (tx * sigma, ty * sigma);
                        total += 1;
                        let s = reach_at_pixel(&orbit, dc, iters, REACH_TOL);
                        if !s.escaped {
                            interior += 1;
                            continue;
                        }
                        let value_px = s.log2_rho_next - log2_pixel;
                        let derivative1_px = s.log2_rho_der - log2_pixel;
                        let derivative2_px = s.log2_rho_der2 - log2_pixel;
                        if !value_px.is_nan()
                            && !derivative1_px.is_nan()
                            && !derivative2_px.is_nan()
                        {
                            value.push(value_px);
                            derivative1.push(derivative1_px);
                            derivative2.push(derivative2_px);
                            usable1.push(value_px.min(derivative1_px));
                            usable2.push(value_px.min(derivative2_px));
                            if derivative1_px < value_px {
                                derivative1_limiting += 1;
                            }
                            if derivative2_px < value_px {
                                derivative2_limiting += 1;
                            }
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
                let share = |v: &[f64], thr: f64| -> f64 {
                    if v.is_empty() {
                        return f64::NAN;
                    }
                    100.0 * v.iter().filter(|&&x| x >= thr).count() as f64 / v.len() as f64
                };
                let value_sorted = value.clone();
                let usable1_sorted = usable1.clone();
                let usable2_sorted = usable2.clone();
                let derivative1_limiting_share = if usable2_sorted.is_empty() {
                    f64::NAN
                } else {
                    100.0 * derivative1_limiting as f64 / usable2_sorted.len() as f64
                };
                let derivative2_limiting_share = if usable2_sorted.is_empty() {
                    f64::NAN
                } else {
                    100.0 * derivative2_limiting as f64 / usable2_sorted.len() as f64
                };
                println!(
                    " reach | {:<12} {:>6.0e} {:>6} | {:>6.2} {:>5.2} {:>5.2} {:>7.2} | {:>5.1} {:>5.1} | {:>5.1} {:>5.1} | {:>5.1} {:>5.1} {:>6.1} | {:>4.1}",
                    name,
                    sigma,
                    iters,
                    med(&mut value),
                    med(&mut derivative1),
                    med(&mut derivative2),
                    med(&mut usable2),
                    derivative1_limiting_share,
                    derivative2_limiting_share,
                    share(&value_sorted, 2.0),
                    share(&usable1_sorted, 2.0),
                    share(&usable2_sorted, 0.0),
                    share(&usable2_sorted, 2.0),
                    share(&usable2_sorted, 4.0),
                    100.0 * interior as f64 / total.max(1) as f64,
                );
            }
        }
    }

    #[derive(Debug)]
    struct NuBucket {
        distance_px: f64,
        errors: Vec<f64>,
        different_iteration_errors: Vec<f64>,
        total: usize,
        unresolved: usize,
    }

    fn quantile(values: &[f64], q: f64) -> f64 {
        if values.is_empty() {
            return f64::NAN;
        }
        let mut sorted = values.to_vec();
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
        let index = ((sorted.len() - 1) as f64 * q).round() as usize;
        sorted[index.min(sorted.len() - 1)]
    }

    /// First log-distance at which the sampled median reaches `threshold`.
    /// Log interpolation is appropriate because both Taylor error and the
    /// distance grid are power-law quantities.
    fn median_crossing_distance(buckets: &[NuBucket], threshold: f64) -> f64 {
        let mut previous: Option<(f64, f64)> = None;
        for bucket in buckets {
            let error = quantile(&bucket.errors, 0.5);
            if !error.is_finite() {
                continue;
            }
            if error >= threshold {
                if let Some((distance0, error0)) = previous {
                    if error0 > 0.0 && error > error0 && threshold > error0 {
                        let t = (threshold.ln() - error0.ln()) / (error.ln() - error0.ln());
                        return (distance0.ln()
                            + t.clamp(0.0, 1.0) * (bucket.distance_px.ln() - distance0.ln()))
                        .exp();
                    }
                }
                return bucket.distance_px;
            }
            previous = Some((bucket.distance_px, error));
        }
        f64::INFINITY
    }

    /// Gate B: compare ν reconstructed from the anchor's quadratic Taylor
    /// payload with ν from a full target walk.
    ///
    /// The run is intentionally shallow (σ = 1e-3), like the useful rows of
    /// Gate A/A2. The f64 reference orbit cannot answer the real deep-view
    /// question; Stage 1 instrumentation is explicitly responsible for that.
    ///
    /// `proxyFail` is the important safety readout: among pairs for which the
    /// local |z|-relative radius says "accept", it is the share whose ν error
    /// already exceeds the ν budget implied by REACH_TOL.
    ///
    /// Run with: cargo test nu_branch_census -- --ignored --nocapture
    #[test]
    #[ignore = "census: heavy, run explicitly with --ignored --nocapture"]
    fn nu_branch_census() {
        let views: [(&str, f64, f64); 4] = [
            ("seahorse", -0.743643887037151, 0.131825904205330),
            ("elephant", 0.2925755, 0.0149977),
            ("triple-spiral", -0.7269, 0.1889),
            ("misiurewicz", -0.10109636384562, 0.95628651080914),
        ];
        const SIGMA: f64 = 1e-3;
        const MAX_ITER: usize = 4_000;
        const H: f64 = 1080.0;
        const G: usize = 18;
        const ANCHOR_EXTENT: f64 = 0.8;
        const DISTANCES: [f64; 9] = [0.25, 0.5, 1.0, 2.0, 4.0, 8.0, 16.0, 32.0, 64.0];
        const D: f64 = std::f64::consts::FRAC_1_SQRT_2;
        const DIRECTIONS: [(f64, f64); 8] = [
            (1.0, 0.0),
            (-1.0, 0.0),
            (0.0, 1.0),
            (0.0, -1.0),
            (D, D),
            (D, -D),
            (-D, D),
            (-D, -D),
        ];

        let nu_proxy_tolerance = nu_tolerance_at_bailout(REACH_TOL);
        let quantum_period_1 = palette_nu_quantum(1.0);
        let quantum_period_256 = palette_nu_quantum(256.0);
        let quantum_default = palette_nu_quantum(1886.72);
        println!(
            "\n nu thresholds | proxy={:.6} | palette P=1 {:.6} | P=256 {:.6} | P=1886.72 {:.6}",
            nu_proxy_tolerance, quantum_period_1, quantum_period_256, quantum_default
        );

        // Tolerance sweep. Loosening REACH_TOL is the one lever the box-dimension
        // census points at, so measure it instead of extrapolating: ρ_next is a
        // cubic criterion, so every candidate radius is the walked one shifted by
        // `cubic_reach_log2_shift` — the pair walks below are tolerance-free and
        // are reused verbatim for every row.
        //
        // Each row reports the share of accepted pairs that break THREE budgets:
        // the one the row's own tolerance implies (`failOwn` — the column the
        // note proposed as the go/no-go), and the two fixed palette texels that
        // do not move when the tolerance does.
        let sweep: [(&str, f64); 4] = [
            ("baseline 1e-3", REACH_TOL),
            ("P=1 texel", tol_for_nu_budget(quantum_period_1)),
            ("P=256 texel", tol_for_nu_budget(quantum_period_256)),
            ("P=def texel", tol_for_nu_budget(quantum_default)),
        ];
        println!(
            " nu sweep   | tolerance          tol      ×base  ρ×   | budget(own)"
        );
        for (label, tol) in sweep {
            println!(
                " nu sweep   | {:<16} {:>9.3e} {:>6.2} {:>5.2} | {:>11.6}",
                label,
                tol,
                tol / REACH_TOL,
                cubic_reach_log2_shift(REACH_TOL, tol).exp2(),
                nu_tolerance_at_bailout(tol),
            );
        }
        println!(
            " nu summary | view          anchors | medProxy crossProxy ratio | crossP1 crossP256 crossDef | diffIt proxyFail diffFail unresolved"
        );

        for (name, cx, cy) in views {
            // Same correction as `reach_census`: full budget on a
            // depth-appropriate reference. This census runs at σ = 1e-3, where
            // an f64 reference is still sound, so only the cap actually moved.
            let orbit = crate::boxdim::census_reference(cx, cy, SIGMA, MAX_ITER);
            let max_iter = MAX_ITER;
            assert!(orbit.len() >= 3, "{name} reference degenerate");
            let pixel = 2.0 * SIGMA / H;
            let log2_pixel = pixel.log2();
            let mut buckets: Vec<NuBucket> = DISTANCES
                .iter()
                .map(|&distance_px| NuBucket {
                    distance_px,
                    errors: Vec::new(),
                    different_iteration_errors: Vec::new(),
                    total: 0,
                    unresolved: 0,
                })
                .collect();
            let mut proxy_radii_px: Vec<f64> = Vec::new();
            let mut anchors = 0usize;
            let mut proxy_checked = 0usize;
            let mut proxy_failed = 0usize;
            let mut proxy_different_checked = 0usize;
            let mut proxy_different_failed = 0usize;
            // Per-sweep-row accounting, indexed like `sweep`.
            let mut sweep_radii_px: Vec<Vec<f64>> = vec![Vec::new(); sweep.len()];
            let mut sweep_checked = vec![0usize; sweep.len()];
            let mut sweep_fail_own = vec![0usize; sweep.len()];
            let mut sweep_fail_p256 = vec![0usize; sweep.len()];
            let mut sweep_fail_def = vec![0usize; sweep.len()];
            let mut sweep_diff_checked = vec![0usize; sweep.len()];
            let mut sweep_diff_fail_own = vec![0usize; sweep.len()];
            let mut sweep_same_checked = vec![0usize; sweep.len()];
            let mut sweep_same_fail_own = vec![0usize; sweep.len()];

            for gy in 0..G {
                for gx in 0..G {
                    let tx = ((gx as f64 / (G - 1) as f64) * 2.0 - 1.0) * ANCHOR_EXTENT;
                    let ty = ((gy as f64 / (G - 1) as f64) * 2.0 - 1.0) * ANCHOR_EXTENT;
                    let anchor_dc = (tx * SIGMA, ty * SIGMA);
                    let anchor = reach_at_pixel(&orbit, anchor_dc, max_iter, REACH_TOL);
                    if !anchor.escaped {
                        continue;
                    }
                    let proxy_radius_px = (anchor.log2_rho_next - log2_pixel).exp2();
                    if proxy_radius_px.is_nan() {
                        continue;
                    }
                    proxy_radii_px.push(proxy_radius_px);
                    anchors += 1;
                    // Exact, not modelled: same walk, cubic criterion re-solved.
                    let sweep_radius_px: Vec<f64> = sweep
                        .iter()
                        .map(|&(_, tol)| {
                            (anchor.log2_rho_next + cubic_reach_log2_shift(REACH_TOL, tol)
                                - log2_pixel)
                                .exp2()
                        })
                        .collect();
                    for (si, &radius) in sweep_radius_px.iter().enumerate() {
                        sweep_radii_px[si].push(radius);
                    }

                    for bucket in &mut buckets {
                        for direction in DIRECTIONS {
                            bucket.total += 1;
                            let delta = (
                                direction.0 * bucket.distance_px * pixel,
                                direction.1 * bucket.distance_px * pixel,
                            );
                            let target_dc = (anchor_dc.0 + delta.0, anchor_dc.1 + delta.1);
                            let predicted = taylor_smooth_iteration(&anchor, delta);
                            let truth = escape_at_pixel(&orbit, target_dc, max_iter).and_then(
                                |(target_iter, target_z)| {
                                    smooth_iteration(target_iter, target_z)
                                        .map(|nu| (target_iter, nu))
                                },
                            );
                            let (predicted, (target_iter, truth)) = match (predicted, truth) {
                                (Some(predicted), Some(truth)) => (predicted, truth),
                                _ => {
                                    bucket.unresolved += 1;
                                    continue;
                                }
                            };
                            let error = (predicted - truth).abs();
                            if !error.is_finite() {
                                bucket.unresolved += 1;
                                continue;
                            }
                            bucket.errors.push(error);
                            let different_iteration = target_iter != anchor.iters;
                            if different_iteration {
                                bucket.different_iteration_errors.push(error);
                            }

                            if bucket.distance_px <= proxy_radius_px {
                                proxy_checked += 1;
                                if error > nu_proxy_tolerance {
                                    proxy_failed += 1;
                                }
                                if different_iteration {
                                    proxy_different_checked += 1;
                                    if error > nu_proxy_tolerance {
                                        proxy_different_failed += 1;
                                    }
                                }
                            }

                            for (si, &(_, tol)) in sweep.iter().enumerate() {
                                if bucket.distance_px > sweep_radius_px[si] {
                                    continue;
                                }
                                sweep_checked[si] += 1;
                                let own_budget = nu_tolerance_at_bailout(tol);
                                if error > own_budget {
                                    sweep_fail_own[si] += 1;
                                }
                                if error > quantum_period_256 {
                                    sweep_fail_p256[si] += 1;
                                }
                                if error > quantum_default {
                                    sweep_fail_def[si] += 1;
                                }
                                if different_iteration {
                                    sweep_diff_checked[si] += 1;
                                    if error > own_budget {
                                        sweep_diff_fail_own[si] += 1;
                                    }
                                } else {
                                    // The actionable split: a runtime gate can
                                    // cheaply refuse branch crossings, so what
                                    // decides the lever is the failure rate on
                                    // the pairs such a gate would keep.
                                    sweep_same_checked[si] += 1;
                                    if error > own_budget {
                                        sweep_same_fail_own[si] += 1;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            let median_proxy = quantile(&proxy_radii_px, 0.5);
            let cross_proxy = median_crossing_distance(&buckets, nu_proxy_tolerance);
            let cross_period_1 = median_crossing_distance(&buckets, quantum_period_1);
            let cross_period_256 = median_crossing_distance(&buckets, quantum_period_256);
            let cross_default = median_crossing_distance(&buckets, quantum_default);
            let ratio = cross_proxy / median_proxy;
            let valid_pairs: usize = buckets.iter().map(|b| b.errors.len()).sum();
            let different_pairs: usize = buckets
                .iter()
                .map(|b| b.different_iteration_errors.len())
                .sum();
            let total_pairs: usize = buckets.iter().map(|b| b.total).sum();
            let unresolved_pairs: usize = buckets.iter().map(|b| b.unresolved).sum();
            let percent = |num: usize, den: usize| -> f64 {
                if den == 0 {
                    f64::NAN
                } else {
                    100.0 * num as f64 / den as f64
                }
            };
            println!(
                " nu summary | {:<12} {:>7} | {:>8.2} {:>10.2} {:>5.2} | {:>7.2} {:>9.2} {:>8.2} | {:>5.1}% {:>8.2}% {:>7.2}% {:>9.2}%",
                name,
                anchors,
                median_proxy,
                cross_proxy,
                ratio,
                cross_period_1,
                cross_period_256,
                cross_default,
                percent(different_pairs, valid_pairs),
                percent(proxy_failed, proxy_checked),
                percent(proxy_different_failed, proxy_different_checked),
                percent(unresolved_pairs, total_pairs),
            );
            println!(
                " nu detail  | {:<12} distance | median       p95 | diffIt diffMedian | valid unresolved",
                name
            );
            for bucket in &buckets {
                println!(
                    " nu detail  | {:<12} {:>8.2} | {:>7.3e} {:>9.3e} | {:>5.1}% {:>10.3e} | {:>5} {:>9.2}%",
                    name,
                    bucket.distance_px,
                    quantile(&bucket.errors, 0.5),
                    quantile(&bucket.errors, 0.95),
                    percent(bucket.different_iteration_errors.len(), bucket.errors.len()),
                    quantile(&bucket.different_iteration_errors, 0.5),
                    bucket.errors.len(),
                    percent(bucket.unresolved, bucket.total),
                );
            }
            println!(
                " nu tol     | {:<12} tolerance        medProxy px  anchors× | failOwn failP256 failDef | sameFail diffFail (own budget)",
                name
            );
            for (si, &(label, _)) in sweep.iter().enumerate() {
                let median = quantile(&sweep_radii_px[si], 0.5);
                println!(
                    " nu tol     | {:<12} {:<16} {:>8.2} {:>9.2} | {:>6.2}% {:>7.2}% {:>6.2}% | {:>7.2}% {:>7.2}%",
                    name,
                    label,
                    median,
                    // Mean-field anchor count scales as 1/ρ²; report the factor
                    // against the baseline row, which is what "÷6" claims.
                    (median / quantile(&sweep_radii_px[0], 0.5)).powi(2),
                    percent(sweep_fail_own[si], sweep_checked[si]),
                    percent(sweep_fail_p256[si], sweep_checked[si]),
                    percent(sweep_fail_def[si], sweep_checked[si]),
                    percent(sweep_same_fail_own[si], sweep_same_checked[si]),
                    percent(sweep_diff_fail_own[si], sweep_diff_checked[si]),
                );
            }
        }
    }
}
