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
//            estimate of the quadratic model's error.
//
// Neither is a certificate: a proven radius needs a bound on z‴ over the whole
// disk (Cauchy or interval), not its value at the centre. ρ_next is the number
// to design against; ρ_last/ρ_next says how much the GPU view overstates.

use crate::jet::CFe;

/// Relative tolerance on |ẑ − z|. At the bailout |z| ≈ 2 this holds the smooth
/// iteration inside ~1/500 of an iteration — well under a palette quantum.
pub const REACH_TOL: f64 = 1e-3;

#[derive(Clone, Copy, Debug)]
pub struct ReachSample {
    /// log2 of the reach in c units, last-retained-term criterion (the GPU view).
    pub log2_rho_last: f64,
    /// log2 of the reach in c units, first-dropped-term criterion (the honest one).
    pub log2_rho_next: f64,
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
    CFe { x: v.x, y: v.y, e: v.e + 1 }
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
    let three = CFe::from_c(3.0, 0.0);

    let mut escaped = false;
    let mut z_escape = (0.0f64, 0.0f64);
    let mut iters = 0usize;

    while iters < max_iter {
        let zr = orbit[ref_i];
        // Full z BEFORE the step — what all three recurrences read.
        let z = (zr.0 + dz.0, zr.1 + dz.1);
        let zc = CFe::from_c(z.0, z.1);

        // Order matters: each new value reads the OLD lower orders.
        let trd_new = cfe_double(three.mul(der).mul(snd).add(zc.mul(trd)));
        let snd_new = cfe_double(der.mul(der).add(zc.mul(snd)));
        let der_new = cfe_double(zc.mul(der)).add(CFe::ONE);
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
        if full2 > 4.0 {
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
    ReachSample {
        log2_rho_last: last,
        log2_rho_next: next,
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

    /// Run the three recurrences directly at a parameter (no perturbation), so
    /// the test isolates the derivative algebra from the rebase machinery.
    fn derivs_at(c: (f64, f64), n: usize) -> (CFe, CFe, CFe) {
        let (mut zx, mut zy) = (0.0f64, 0.0f64);
        let (mut der, mut snd, mut trd) = (CFe::ZERO, CFe::ZERO, CFe::ZERO);
        let three = CFe::from_c(3.0, 0.0);
        for _ in 0..n {
            let zc = CFe::from_c(zx, zy);
            let t = cfe_double(three.mul(der).mul(snd).add(zc.mul(trd)));
            let s = cfe_double(der.mul(der).add(zc.mul(snd)));
            let d = cfe_double(zc.mul(der)).add(CFe::ONE);
            trd = t;
            snd = s;
            der = d;
            let nx = zx * zx - zy * zy + c.0;
            let ny = 2.0 * zx * zy + c.1;
            zx = nx;
            zy = ny;
        }
        (der, snd, trd)
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
        let (der, snd, trd) = derivs_at(c, n);

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
        let (_, snd_direct, trd_direct) = derivs_at(c, s.iters);
        let log2_z = {
            let z = z_at(c, s.iters);
            z.0.hypot(z.1).max(1e-300).log2()
        };
        let last_direct =
            0.5 * ((2.0 * REACH_TOL).log2() + log2_z - snd_direct.log2_mag().unwrap());
        let next_direct =
            ((6.0 * REACH_TOL).log2() + log2_z - trd_direct.log2_mag().unwrap()) / 3.0;
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
            "ρ_last slope {slope_last} ≠ 1/2"
        );
        assert!(
            (slope_next - 1.0 / 3.0).abs() < 0.02,
            "ρ_next slope {slope_next} ≠ 1/3"
        );
    }

    /// Field census: the reach in PIXELS across the standard views and a range
    /// of zoom depths.
    ///
    ///   medLast  — median log2 ρ in pixels, last-retained-term (the GPU view)
    ///   medNext  — median log2 ρ in pixels, first-dropped-term (the honest one)
    ///   ≥1/≥4/≥16 — share of ESCAPED pixels whose honest reach covers that many
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
            "\n reach | view          σ      iters | medLast medNext | ≥1px  ≥4px ≥16px | uns%"
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
                // f64, so its orbit eventually drifts and escapes. That does
                // NOT disqualify it: the walk rebases at the end of the orbit,
                // so it never reads past what is valid. Cap the budget by the
                // reference length instead of throwing the view away — the
                // first run rejected every boundary centre on this alone.
                let orbit = ref_orbit_f64(cx, cy, iters);
                let iters = iters.min(orbit.len().saturating_sub(2));
                if iters < 64 {
                    println!(
                        " reach | {:<12} {:>6.0e} | reference too short ({}) — skipped",
                        name,
                        sigma,
                        orbit.len()
                    );
                    continue;
                }
                let log2_pixel = (2.0 * sigma / H).log2();
                let mut last: Vec<f64> = Vec::new();
                let mut next: Vec<f64> = Vec::new();
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
                        if s.log2_rho_last.is_finite() {
                            last.push(s.log2_rho_last - log2_pixel);
                        }
                        if s.log2_rho_next.is_finite() {
                            next.push(s.log2_rho_next - log2_pixel);
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
                let n_sorted = next.clone();
                println!(
                    " reach | {:<12} {:>6.0e} {:>6} | {:>7.2} {:>7.2} | {:>5.1} {:>5.1} {:>5.1} | {:>4.1}",
                    name,
                    sigma,
                    iters,
                    med(&mut last),
                    med(&mut next),
                    share(&n_sorted, 0.0),
                    share(&n_sorted, 2.0),
                    share(&n_sorted, 4.0),
                    100.0 * interior as f64 / total.max(1) as f64,
                );
            }
        }
    }
}
