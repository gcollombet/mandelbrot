// Off-reference interior census, measured on the CPU (build-only).
//
// The question: the periodic tier arms only when the REFERENCE orbit is
// periodic (`unified::periodic_build_diagnostic` scans the reference tail for a
// sustained return). A view centred on a filament beside a minibrot therefore
// reports `NoConvergedPeriod`, the tier stays dormant, and every interior pixel
// of the visible minibrot burns `max_iter`. What would the SAME certificate,
// anchored at the NUCLEUS instead of the reference, capture — and over what
// |dc| band does it survive?
//
// Nothing here is new mathematics. `PeriodicCertificateKind::DirectMajorant`
// already exists precisely for this case ("valid when the cycle multiplier A is
// exactly zero at a minibrot nucleus"), and the nucleus locator already ships as
// `find_minibrot`. The census measures whether re-anchoring is worth wiring, and
// the honest cost of doing it: an interior pixel does not become O(p), it
// becomes O(entry time + p), and the entry time is the transient the pixel
// spends falling into the trap disk.
//
// ── what the columns mean ──────────────────────────────────────────────────────
//
//   p        — period of the atom under the view (ball detection + Newton).
//   status   — `periodic_build_diagnostic`'s verdict for that anchor.
//   r px     — certified entry radius of the block, in render pixels. This is a
//              radius in the PERTURBATION variable δ, not in c: it says how close
//              the pixel's orbit must come to the cycle phase to be trapped.
//   band     — the largest |dc| the certificate survives, in units of the view
//              half-width σ. Below 1 the certificate does not cover the frame and
//              a per-tile c_max would be required.
//   cap%     — share of the max_iter pixels the block accepts.
//   entry    — median iteration at which acceptance happens. THIS is the cost
//              that replaces max_iter, not p.
//   gain     — max_iter / entry, the per-pixel work actually removed.

use crate::unified::{periodic_build_diagnostic, PeriodicBlock};

/// One period of the critical orbit of a nucleus, computed in arbitrary
/// precision and stored as f64, then tiled to the length the periodic builder
/// needs. Tiling rather than iterating keeps the sample exactly periodic: an
/// f64 walk of a super-attracting orbit drifts, and the drift is what the
/// builder's tail scan would measure instead of the period.
pub(crate) fn tiled_nucleus_orbit(
    ncx: &dashu_float::DBig,
    ncy: &dashu_float::DBig,
    period: usize,
    digits: usize,
    min_len: usize,
) -> Vec<(f64, f64)> {
    use crate::{dbig_i, dbig_to_f64, raise_precision};
    let ncx = raise_precision(ncx.clone(), digits);
    let ncy = raise_precision(ncy.clone(), digits);
    let two = raise_precision(dbig_i(2), digits);
    let mut zx = raise_precision(dbig_i(0), digits);
    let mut zy = raise_precision(dbig_i(0), digits);
    let mut cycle = Vec::with_capacity(period);
    for _ in 0..period {
        cycle.push((dbig_to_f64(&zx), dbig_to_f64(&zy)));
        let nx = &zx * &zx - &zy * &zy + &ncx;
        let ny = &two * &zx * &zy + &ncy;
        zx = nx;
        zy = ny;
    }
    // `cycle[0]` is the critical point; `z_period` returned to it, which is the
    // definition of the nucleus.
    let mut orbit = Vec::with_capacity(min_len + period);
    while orbit.len() < min_len {
        orbit.extend_from_slice(&cycle);
    }
    orbit
}

/// Largest `log2 c_max` at which the periodic build still returns a block,
/// found by bisection on the same builder the runtime uses.
///
/// The band matters because the shipped certificate is first order in `dc` with
/// a certified remainder: a nucleus-anchored header is only usable out to the
/// `|dc|` its own build accepted, which is a property of the minibrot, not of
/// the view.
pub(crate) fn certified_dc_band_log2(
    orbit: &[(f64, f64)],
    eps: f64,
    log2_cmax_hi: f64,
) -> Option<f64> {
    if periodic_build_diagnostic(orbit, eps, log2_cmax_hi).block.is_some() {
        return Some(log2_cmax_hi);
    }
    let mut lo = log2_cmax_hi - 64.0;
    if periodic_build_diagnostic(orbit, eps, lo).block.is_none() {
        return None;
    }
    let mut hi = log2_cmax_hi;
    for _ in 0..32 {
        let mid = 0.5 * (lo + hi);
        if periodic_build_diagnostic(orbit, eps, mid).block.is_some() {
            lo = mid;
        } else {
            hi = mid;
        }
    }
    Some(lo)
}

/// Walk one pixel against an anchored periodic block.
///
/// The certificate has TWO hypotheses and both must be honoured. The majorant
/// it proves is `ρ₀ = r`, `ρ_{k+1} = 2|Z_k|ρ_k + ρ_k² + c_max`, so it concludes
/// "the exact orbit stays inside `|δ| ≤ r`" only for `|δ₀| ≤ r` **and**
/// `|dc| ≤ c_max`. Dropping the parameter gate makes the test vacuous at a
/// nucleus: there `z₀ = 0 = Z₀`, so `|δ₀| = 0` for *every* pixel in the plane.
///
/// Returns `Some(entry_iteration)` when the pixel is certified trapped. At a
/// nucleus anchor that is iteration 0 — the verdict is a parameter-space
/// containment, not a walk — which is why the interesting column is how wide
/// `c_max` is, not how fast entry happens.
pub(crate) fn periodic_entry_iteration(
    anchor_orbit: &[(f64, f64)],
    block: &PeriodicBlock,
    anchor_c: (f64, f64),
    log2_cmax: f64,
    cx: f64,
    cy: f64,
    max_iter: usize,
) -> Option<usize> {
    let (dcx, dcy) = (cx - anchor_c.0, cy - anchor_c.1);
    if dcx.hypot(dcy) > log2_cmax.exp2() {
        return None;
    }
    let r = block.log2_r.exp2();
    let r_sq = r * r;
    let (mut zx, mut zy) = (0.0f64, 0.0f64);
    let p = block.p.max(1);
    for k in 0..max_iter {
        if k % p == block.start % p {
            let phase = anchor_orbit[block.start];
            let (dx, dy) = (zx - phase.0, zy - phase.1);
            if dx * dx + dy * dy <= r_sq {
                return Some(k);
            }
        }
        let nx = zx * zx - zy * zy + cx;
        let ny = 2.0 * zx * zy + cy;
        zx = nx;
        zy = ny;
        if zx * zx + zy * zy > 4.0 {
            return None;
        }
    }
    None
}

/// Does this pixel reach the budget without escaping? That is the population a
/// periodic anchor is competing for.
pub(crate) fn burns_budget(cx: f64, cy: f64, max_iter: usize) -> bool {
    let (mut zx, mut zy) = (0.0f64, 0.0f64);
    for _ in 0..max_iter {
        let nx = zx * zx - zy * zy + cx;
        let ny = 2.0 * zx * zy + cy;
        zx = nx;
        zy = ny;
        if zx * zx + zy * zy > 4.0 {
            return false;
        }
    }
    true
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::boxdim::census_reference;
    use crate::unified::PeriodicBuildStatus;
    use crate::{detect_period_ball_at, newton_nucleus, raise_precision};
    use dashu_float::DBig;
    use std::str::FromStr;

    fn dbig(v: f64, digits: usize) -> DBig {
        raise_precision(DBig::from_str(&format!("{v:.17e}")).unwrap(), digits)
    }

    fn median(values: &mut Vec<usize>) -> f64 {
        if values.is_empty() {
            return f64::NAN;
        }
        values.sort_unstable();
        values[values.len() / 2] as f64
    }

    fn status_name(status: PeriodicBuildStatus) -> &'static str {
        match status {
            PeriodicBuildStatus::Pending => "pending",
            PeriodicBuildStatus::Active => "ACTIVE",
            PeriodicBuildStatus::OrbitTooShort => "short",
            PeriodicBuildStatus::NoConvergedPeriod => "noPeriod",
            PeriodicBuildStatus::PeriodTooLarge => "pTooBig",
            PeriodicBuildStatus::CertificateRejected => "rejected",
        }
    }

    /// A tiled nucleus orbit must be exactly periodic and start at the critical
    /// point, or the builder's tail scan measures f64 drift instead of the
    /// period.
    #[test]
    fn tiled_nucleus_orbit_is_exactly_periodic_at_the_critical_point() {
        // The period-2 nucleus is c = −1 exactly.
        let ncx = dbig(-1.0, 64);
        let ncy = dbig(0.0, 64);
        let orbit = tiled_nucleus_orbit(&ncx, &ncy, 2, 64, 512);
        assert!(orbit.len() >= 512);
        assert_eq!(orbit[0], (0.0, 0.0), "cycle must start at the critical point");
        for k in 0..orbit.len() - 2 {
            assert_eq!(orbit[k], orbit[k + 2], "tiling broke periodicity at {}", k);
        }
        // z_1 = 0² + (−1) = −1.
        assert!((orbit[1].0 + 1.0).abs() < 1e-15 && orbit[1].1.abs() < 1e-15);
    }

    /// The certificate must never accept a pixel that escapes. The parameter
    /// gate is what makes that true: at a nucleus every pixel in the plane has
    /// `|δ₀| = 0`, so without `|dc| ≤ c_max` this test would certify the whole
    /// plane as interior.
    #[test]
    fn periodic_entry_needs_the_parameter_gate() {
        let ncx = dbig(-1.0, 64);
        let ncy = dbig(0.0, 64);
        let orbit = tiled_nucleus_orbit(&ncx, &ncy, 2, 64, 1024);
        let log2_cmax = (1e-3f64).log2();
        let block = periodic_build_diagnostic(&orbit, 1e-3, log2_cmax)
            .block
            .expect("period-2 nucleus must certify");
        assert_eq!(block.p, 2);
        let anchor = (-1.0, 0.0);

        // Inside the certified band around the period-2 nucleus.
        assert!(burns_budget(-1.0005, 0.0, 4096));
        assert!(
            periodic_entry_iteration(&orbit, &block, anchor, log2_cmax, -1.0005, 0.0, 4096)
                .is_some()
        );

        // Outside M entirely, and far outside the band.
        assert!(!burns_budget(0.6, 0.6, 4096));
        assert!(
            periodic_entry_iteration(&orbit, &block, anchor, log2_cmax, 0.6, 0.6, 4096).is_none()
        );

        // The gate is load-bearing, not decorative: an escaping pixel sits at
        // |δ₀| = 0 exactly like every other, so only |dc| separates them.
        let ungated_delta_at_entry = {
            let phase = orbit[block.start];
            (0.0f64 - phase.0).hypot(0.0 - phase.1)
        };
        assert_eq!(block.start % block.p, 0);
        assert_eq!(ungated_delta_at_entry, 0.0);
    }

    /// Soundness sweep: nothing the certificate accepts may escape.
    #[test]
    fn certified_band_never_accepts_an_escaping_pixel() {
        let ncx = dbig(-1.0, 64);
        let ncy = dbig(0.0, 64);
        let orbit = tiled_nucleus_orbit(&ncx, &ncy, 2, 64, 1024);
        let log2_cmax = (1e-2f64).log2();
        let block = periodic_build_diagnostic(&orbit, 1e-3, log2_cmax)
            .block
            .expect("period-2 nucleus must certify");
        let anchor = (-1.0, 0.0);
        let mut accepted = 0usize;
        for gy in 0..48 {
            for gx in 0..48 {
                let cx = -1.0 + (gx as f64 / 47.0 - 0.5) * 0.6;
                let cy = (gy as f64 / 47.0 - 0.5) * 0.6;
                if periodic_entry_iteration(&orbit, &block, anchor, log2_cmax, cx, cy, 4096)
                    .is_some()
                {
                    accepted += 1;
                    assert!(
                        burns_budget(cx, cy, 4096),
                        "certificate accepted an escaping pixel at ({}, {})",
                        cx,
                        cy
                    );
                }
            }
        }
        assert!(accepted > 0, "the sweep must actually exercise acceptance");
    }

    /// Off-reference interior census.
    ///
    /// Each view is measured twice: anchored at the VIEW CENTRE (what ships
    /// today) and anchored at the NUCLEUS under the view (what re-anchoring
    /// would give). The views are deliberately placed off the nucleus, which is
    /// the case the shipped path cannot serve.
    ///
    /// Run with: cargo test --release interior_anchor_census -- --ignored --nocapture
    #[test]
    #[ignore = "census: heavy, run explicitly with --ignored --nocapture"]
    fn interior_anchor_census() {
        // Seeds, not frames: (name, cx, cy, σ_seed, budget). A hand-picked σ is
        // useless here — the first run framed two views entirely inside a
        // component (int% = 100) and three entirely outside one (int% = 0),
        // and neither answers the question. The census therefore FRAMES ITSELF:
        // it locates the nucleus under the seed, measures the |dc| band its own
        // certificate survives, and then renders a window of 4 bands around it,
        // offset so the view centre is never the nucleus. That guarantees a
        // mixed frame and makes the views comparable across minibrot scales.
        let seeds: [(&str, f64, f64, f64, usize); 5] = [
            ("p3-island", -1.7548, 0.0006, 2.0e-3, 4_000),
            ("seahorse-mini", -0.743643887037151, 0.131825904205330, 1.0e-3, 8_000),
            ("mini-seahorse", -1.7690332504, 0.0025093773, 2.0e-5, 20_000),
            ("elephant-mini", 0.2925755, 0.0149977, 1.0e-3, 8_000),
            ("triple-spiral", -0.7269, 0.1889, 1.0e-3, 8_000),
        ];
        const G: usize = 128;
        const H: f64 = 1080.0;
        const EPS: f64 = 1e-3;
        /// View half-width in units of |Λ|. The minibrot's bounding box is
        /// 1.30|Λ| × 1.20|Λ| (`MINIBROT_BOX_HALF_RE/IM`), so this frames the
        /// whole small copy with room around it. Framing on Λ rather than on the
        /// band is the point: framing on the band makes `cap%` a restatement of
        /// the frame, not a measurement.
        const FRAME_LAMBDAS: f64 = 1.5;

        println!(
            "\n interior | view            σ    | anchor    |   p status   | r px    band/Λ | int%  cap%  cov%  entry    gain | Λ         log2∏2|Z| band·∏/Λ"
        );

        for (name, seed_cx, seed_cy, seed_sigma, budget) in seeds {
            let seed_digits = 64 + 3 * (-seed_sigma.log10()).ceil().max(0.0) as usize;
            // Stage 1 — locate the nucleus under the SEED, exactly as
            // `find_minibrot` does, and measure its band.
            let seed_nucleus = detect_period_ball_at(
                &dbig(seed_cx, seed_digits),
                &dbig(seed_cy, seed_digits),
                budget,
                &dbig(seed_sigma * 4.0, seed_digits),
            )
            .and_then(|period| {
                newton_nucleus(
                    &dbig(seed_cx, seed_digits),
                    &dbig(seed_cy, seed_digits),
                    period,
                    80,
                    &dbig(seed_sigma * 1000.0, seed_digits),
                    &raise_precision(
                        DBig::from_str(&format!(
                            "1e-{}",
                            seed_digits.saturating_sub(24).max(16)
                        ))
                        .unwrap(),
                        seed_digits,
                    ),
                )
                .map(|(ncx, ncy)| (period, ncx, ncy))
            });
            let Some((seed_period, seed_ncx, seed_ncy)) = seed_nucleus else {
                println!(" interior | {:<14} {:>6.0e} | no nucleus under the seed", name, seed_sigma);
                continue;
            };
            let seed_orbit = tiled_nucleus_orbit(
                &seed_ncx,
                &seed_ncy,
                seed_period,
                seed_digits,
                1024.max(4 * seed_period),
            );
            let Some(seed_band_log2) =
                certified_dc_band_log2(&seed_orbit, EPS, seed_sigma.log2())
            else {
                println!(
                    " interior | {:<14} {:>6.0e} | p={} certifies no band",
                    name, seed_sigma, seed_period
                );
                continue;
            };

            // Stage 2 — frame around the WHOLE minibrot, off-centre.
            let Some((lambda_x, lambda_y)) =
                crate::minibrot_size_estimate(&seed_ncx, &seed_ncy, seed_period, seed_digits)
            else {
                println!(
                    " interior | {:<14} {:>6.0e} | p={} has no size estimate",
                    name, seed_sigma, seed_period
                );
                continue;
            };
            let lambda =
                crate::dbig_to_f64(&lambda_x).hypot(crate::dbig_to_f64(&lambda_y));
            // Why the band comes out narrow: the direct majorant is
            //   ρ₀ = r,  ρ_{k+1} = 2|Z_k|ρ_k + ρ_k² + c_max,
            // so `c_max` is injected at EVERY one of the p steps and then
            // amplified by the product of the remaining `2|Z_k|`. That product
            // is the renormalization factor of the small copy, i.e. ≈ 1/Λ, so
            // the majorant can only tolerate `c_max ≈ Λ · Λ`, not `c_max ≈ Λ`.
            // Printing it turns that from a story into a measurement.
            let log2_amplification: f64 = seed_orbit[..seed_period]
                .iter()
                .map(|&(zx, zy)| {
                    let two_z = 2.0 * zx.hypot(zy);
                    if two_z > 0.0 {
                        two_z.log2()
                    } else {
                        0.0
                    }
                })
                .sum();
            let sigma = FRAME_LAMBDAS * lambda;
            let nucleus_f64 = (crate::dbig_to_f64(&seed_ncx), crate::dbig_to_f64(&seed_ncy));
            let (cx, cy) = (
                nucleus_f64.0 + 0.5 * sigma,
                nucleus_f64.1 + 0.3 * sigma,
            );
            let pixel = 2.0 * sigma / H;
            let digits = 64 + 3 * (-sigma.log10()).ceil().max(0.0) as usize;

            // Population under test: cells that reach the budget without
            // escaping. Everything else is served by the exterior tiers.
            let mut budget_cells: Vec<(f64, f64)> = Vec::new();
            for gy in 0..G {
                for gx in 0..G {
                    let tx = (gx as f64 + 0.5) / G as f64 * 2.0 - 1.0;
                    let ty = (gy as f64 + 0.5) / G as f64 * 2.0 - 1.0;
                    let pc = (cx + tx * sigma, cy + ty * sigma);
                    if burns_budget(pc.0, pc.1, budget) {
                        budget_cells.push(pc);
                    }
                }
            }
            let cells = (G * G) as f64;
            let int_share = 100.0 * budget_cells.len() as f64 / cells;

            // Anchor A — the view centre, i.e. what ships today.
            let reference = census_reference(cx, cy, sigma, budget);
            let reference_outcome = periodic_build_diagnostic(&reference, EPS, sigma.log2());

            // Anchor B — the nucleus already located from the seed. Re-detecting
            // at the reframed centre is wrong: that centre sits deliberately
            // OFF the minibrot, so ball detection there answers a different
            // question (and returned `noPeriod` for elephant when it was tried).
            let nucleus = Some((seed_period, seed_ncx.clone(), seed_ncy.clone()));
            let _ = (&digits, dbig(0.0, 16));

            struct Row {
                label: &'static str,
                block: Option<PeriodicBlock>,
                status: PeriodicBuildStatus,
                band_log2: Option<f64>,
                orbit: Option<Vec<(f64, f64)>>,
                anchor_c: (f64, f64),
                detected_p: usize,
            }

            let mut rows: Vec<Row> = Vec::new();
            rows.push(Row {
                label: "reference",
                block: reference_outcome.block.clone(),
                status: reference_outcome.status,
                band_log2: Some(sigma.log2()),
                orbit: Some(reference.clone()),
                anchor_c: (cx, cy),
                detected_p: reference_outcome.detected_period,
            });
            // Anchor C — the same nucleus, but with §4–§5 ported to k = p and
            // the gauge Λ. The scalar majorant's band obeys `band ≈ Λ/∏2|Z|`;
            // this one is stated in the renormalized parameter where the
            // constant is O(1), so `band/Λ` should stop decaying with p.
            let renorm = crate::feigenbaum::renormalized_trapping_band(
                nucleus_f64.0,
                nucleus_f64.1,
                seed_period,
                0.5,
                8,
                3,
            );

            if let Some((period, ncx, ncy)) = &nucleus {
                let orbit = tiled_nucleus_orbit(ncx, ncy, *period, digits, 1024.max(4 * period));
                // Build AT the widest band that certifies, not at the view's
                // σ: the band is a property of the minibrot, and the radius the
                // build returns depends on which band it was asked for.
                let band = Some(seed_band_log2);
                let outcome =
                    periodic_build_diagnostic(&orbit, EPS, band.unwrap_or(sigma.log2()));
                rows.push(Row {
                    label: "nucleus",
                    block: outcome.block.clone(),
                    status: outcome.status,
                    band_log2: band,
                    orbit: Some(orbit),
                    anchor_c: (crate::dbig_to_f64(ncx), crate::dbig_to_f64(ncy)),
                    detected_p: outcome.detected_period,
                });
            } else {
                rows.push(Row {
                    label: "nucleus",
                    block: None,
                    status: PeriodicBuildStatus::NoConvergedPeriod,
                    band_log2: None,
                    orbit: None,
                    anchor_c: (cx, cy),
                    detected_p: 0,
                });
            }
            // The ported row reuses the same trapping test on the same pixels;
            // only the certified band differs, which is the whole comparison.
            if let (Some(renorm), Some((period, ncx, ncy))) = (renorm, &nucleus) {
                let orbit = tiled_nucleus_orbit(ncx, ncy, *period, digits, 1024.max(4 * period));
                let band_log2 = renorm.band_c.log2();
                let outcome = periodic_build_diagnostic(&orbit, EPS, band_log2);
                rows.push(Row {
                    label: "nucleus+Λ",
                    block: outcome.block.clone(),
                    status: outcome.status,
                    band_log2: Some(band_log2),
                    orbit: Some(orbit),
                    anchor_c: nucleus_f64,
                    detected_p: outcome.detected_period,
                });
                println!(
                    " renorm   | {:<14} {:>6.0e} | p={:<3} |a|={:>9.3e} |Λ|={:>8.2e} | ε₀={:>8.2e} K_ĉ={:>7.2} | δ̂=band/Λ={:>7.4} | band {:>9.3e} vs scalar {:>9.3e} → {:>6.2}×",
                    name,
                    sigma,
                    renorm.p,
                    renorm.gauge_abs,
                    renorm.lambda_abs_up,
                    renorm.defect_at_nucleus,
                    renorm.lipschitz_hat,
                    renorm.delta_hat,
                    renorm.band_c,
                    seed_band_log2.exp2(),
                    renorm.band_c / seed_band_log2.exp2(),
                );
            } else if nucleus.is_some() {
                // Why it refused, not just that it did. The crossover between the
                // two bands is at |a| ≈ 1/0.07 ≈ 14, so a refusal at |a| well
                // above that is a defect of the enclosure, not of the idea.
                let g = crate::feigenbaum::minibrot_gauges(
                    nucleus_f64.0,
                    nucleus_f64.1,
                    seed_period,
                );
                let d = crate::feigenbaum::propose_minibrot_return(
                    nucleus_f64.0,
                    nucleus_f64.1,
                    seed_period,
                    0.5,
                    8,
                    f64::MAX,
                    3,
                );
                println!(
                    " renorm   | {:<14} {:>6.0e} | ported band did not certify | p={} |a|={:?} defect={:?} fail={:?}",
                    name,
                    sigma,
                    seed_period,
                    g.map(|g| (g.a.0 * g.a.0 + g.a.1 * g.a.1).sqrt()),
                    d.uniform_error,
                    d.failure
                );
                // The refusal reason is the finding: both failures are the DRIFT
                // channel, not the value channel.
                let w = crate::feigenbaum::propose_minibrot_window(
                    nucleus_f64.0,
                    nucleus_f64.1,
                    seed_period,
                    0.5,
                    8,
                    (0.25 - d.uniform_error).max(0.0),
                    d.uniform_error,
                );
                println!("   window   | refused: {:?}", w.failure);
                println!(
                    "   window   | drift diagnostics live in feigenbaum::trace_drift_channel_blowup"
                );
            }

            for row in rows {
                let Row {
                    label,
                    block,
                    status,
                    band_log2,
                    orbit,
                    anchor_c,
                    detected_p,
                } = row;
                let band = band_log2;
                let (r_px, mut cap, mut entries) = (
                    block
                        .as_ref()
                        .map(|b| (b.log2_r - pixel.log2()).exp2())
                        .unwrap_or(f64::NAN),
                    0usize,
                    Vec::<usize>::new(),
                );
                if let (Some(block), Some(orbit), Some(band_log2)) =
                    (block.as_ref(), orbit.as_ref(), band_log2)
                {
                    for &(pcx, pcy) in &budget_cells {
                        if let Some(k) = periodic_entry_iteration(
                            orbit, block, anchor_c, band_log2, pcx, pcy, budget,
                        ) {
                            cap += 1;
                            entries.push(k);
                        }
                    }
                }
                let cap_share = if budget_cells.is_empty() {
                    f64::NAN
                } else {
                    100.0 * cap as f64 / budget_cells.len() as f64
                };
                // The cell count under-reports whenever the certified disk is
                // smaller than a few grid cells, which it is at deep periods
                // (band/Λ = 0.018 against a cell of 0.023σ). The disk is exactly
                // a disk, so take its area analytically and keep the MEASURED
                // interior area as the denominator.
                let interior_area = int_share / 100.0 * (2.0 * sigma) * (2.0 * sigma);
                let cov_share = band
                    .map(|b| {
                        let radius = b.exp2();
                        100.0 * (std::f64::consts::PI * radius * radius / interior_area).min(1.0)
                    })
                    .unwrap_or(f64::NAN);
                let entry = median(&mut entries);
                println!(
                    " interior | {:<14} {:>6.0e} | {:<9} | {:>3} {:<8} | {:>8.2} {:>7.4} | {:>4.1} {:>5.1} {:>5.1} {:>6.0} {:>7.0} | {:>9.2e} {:>9.1} {:>9.3}",
                    name,
                    sigma,
                    label,
                    detected_p,
                    status_name(status),
                    r_px,
                    band.map(|b| b.exp2() / lambda).unwrap_or(f64::NAN),
                    int_share,
                    cap_share,
                    cov_share,
                    entry,
                    budget as f64 / entry.max(1.0),
                    lambda,
                    log2_amplification,
                    // If the amplification is what caps the band, restoring it
                    // should land near 1: band · ∏2|Z| ≈ Λ.
                    band.map(|b| (b + log2_amplification).exp2() / lambda)
                        .unwrap_or(f64::NAN),
                );
            }
        }
    }
}
