// Local box dimension of ∂M, and the skip-rate ceiling it implies (build-only).
//
// The question this answers: when a location renders slowly and block/super-pixel
// skipping does not pay there, is that because our BOUNDS are loose, or because
// the GEOMETRY of ∂M at that spot leaves nothing to skip? Today we cannot tell
// the two apart — the reach census (reach.rs) reports how far one computed pixel
// carries, but not how far it COULD carry.
//
// ── the two numbers ─────────────────────────────────────────────────────────────
//
// 1. `d` — the local box (Minkowski) dimension of ∂M inside the view. Measured by
//    the sausage law: the area of the ε-neighbourhood of ∂M scales as ε^(2−d), so
//    the share of the window within distance ε of the boundary, plotted against ε
//    on a log-log grid, has slope 2−d. Globally Shishikura (1998) gives
//    dim_H ∂M = 2, but that is the SUP over the whole set; inside one view, over
//    the two or three octaves a render actually spans, the effective exponent is
//    what governs cost, and it is not 2 everywhere.
//
//    Why it is the ceiling: a super-pixel anchor covers a disk whose radius is
//    proportional to its distance to the boundary (below), so covering the window
//    needs ∫dA/dist² anchors. With dA ≈ (2−d)·ε^(1−d)dε from the sausage law that
//    integral is ∫ε^(−1−d)dε ~ h^(−d) at pixel size h, against h^(−2) pixels.
//    Anchors/pixels ~ h^(2−d): d = 2 means a constant-factor gain at best, and
//    every 0.1 below 2 is another decade of headroom per decade of resolution.
//
// 2. `ρ/DE` — the measured Taylor reach divided by the distance estimate. Green's
//    function of the exterior varies on the scale of the distance to ∂M (Koebe /
//    Harnack), so the natural radius of any local model of the escape time is
//    Θ(dist). The ratio is therefore the LOOSENESS of our own bound: a tight,
//    concentrated ratio says the reach is geometry-limited and only a higher-order
//    model or a looser tolerance can move it; a ratio spread over decades, with a
//    population far below the rest, says our radius is leaving distance on the
//    table there.
//
// ── the distance estimate, and the bailout it needs ─────────────────────────────
//
// DE = 2·|z_n|·ln|z_n| / |z′_n|, i.e. G/|∇G| up to a constant: the scale on which
// the Green's function — hence the escape time, hence the colour — varies. It is
// carried as log2, because at depth |z′| runs past any f64 exponent and DE runs
// below any f64 denormal while log2 DE stays an ordinary number (the same reason
// reach.rs carries its derivatives in CFe).
//
// The formula is asymptotic in |z_n|, and the production bailout is FAR too small
// for it. Measured against an exactly known distance (c = −2 − t, whose distance
// to M is exactly t, since −2 is the leftmost point of the set):
//
//     bailout |z|² > 4      DE/t = 31, 281, 2776, … 2.8e6   (diverges as 1/t)
//     bailout |z|² > 1e12   DE/t = 3.885, 3.977, 3.997, 4.000, 4.000, 4.000
//
// With |z|² > 4 the tip escapes on the first iteration with z′ = 1 and the
// estimate is simply the bailout radius — a number with no geometry in it. The
// census therefore runs its own bailout, and the reach comparison keeps the
// production one for ρ (which is a statement about the colour at ITS bailout).
//
// The 4.000 above is not a coincidence: a tip is the extremal case of the Koebe
// distortion bound, where the estimate overshoots the geometric distance by
// exactly 4. At the other extreme — a parabolic cusp, c = 1/4 + t — DE/t decays
// like √t: the field varies on a scale far below the geometric distance because
// of the parabolic bottleneck. Both are pinned by tests. This is why the tables
// below are read as the dimension of ∂M IN THE GREEN'S METRIC: a bounded ratio
// between DE and the geometric distance shifts the sausage curve sideways and
// leaves the exponent alone, and the Green's metric is the one our reach lives
// in anyway.
//
// Non-escaping cells (genuine interior, or "would escape later than the budget")
// have no exterior distance. They are reported as their own share and excluded
// from the sausage fit rather than folded in as zeros, exactly as reach.rs
// excludes them from the reach quantiles.

use crate::jet::CFe;
use crate::{dbig_i, dbig_to_f64, raise_precision, DBig};
use core::str::FromStr;

/// Bailout for the distance estimate: |z| = 10⁶, deep into the asymptotic regime
/// of G = log|z_n|/2ⁿ. Squared magnitudes stay at 1e12, far inside f64.
pub const DE_BAILOUT_SQ: f64 = 1e12;

/// One pixel's exterior distance estimate.
#[derive(Clone, Copy, Debug)]
pub struct DistanceSample {
    /// log2 of the Koebe distance estimate to ∂M. `NEG_INFINITY` when the pixel
    /// did not escape within the budget (no exterior distance is defined).
    pub log2_de: f64,
    /// Iterations consumed.
    pub iters: usize,
    pub escaped: bool,
}

/// Walk one pixel and return its exterior distance estimate.
///
/// Same perturbation recurrence and Zhuoran rebase as `reach::reach_at_pixel`,
/// but carrying only z′ — one CFe multiply per step instead of eight, which is
/// what makes a 256×256 grid at a 10⁵ iteration budget affordable. The tests
/// pin it against `reach_at_pixel` at a shared bailout so the duplicated rebase
/// cannot drift.
///
/// `bailout_sq` is explicit because the answer depends on it: see the module
/// header. Pass `DE_BAILOUT_SQ` for a distance, `reach::BAILOUT_SQ` only when
/// comparing against a production-bailout quantity.
pub fn distance_at_pixel(
    orbit: &[(f64, f64)],
    dc: (f64, f64),
    max_iter: usize,
    bailout_sq: f64,
) -> DistanceSample {
    let mut dz = (0.0f64, 0.0f64);
    let mut ref_i = 0usize;
    let mut der = CFe::ZERO;
    let mut iters = 0usize;

    while iters < max_iter {
        let zr = orbit[ref_i];
        let z = (zr.0 + dz.0, zr.1 + dz.1);
        // z′_{n+1} = 2·z_n·z′_n + 1, on the FULL z (reach.rs, same convention).
        let der_new = CFe::from_c(2.0, 0.0).mul(CFe::from_c(z.0, z.1)).mul(der);
        der = der_new.add(CFe::ONE);

        dz = (
            2.0 * (zr.0 * dz.0 - zr.1 * dz.1) + dz.0 * dz.0 - dz.1 * dz.1 + dc.0,
            2.0 * (zr.0 * dz.1 + zr.1 * dz.0) + 2.0 * dz.0 * dz.1 + dc.1,
        );
        ref_i += 1;
        iters += 1;

        let zf = orbit[ref_i];
        let full = (zf.0 + dz.0, zf.1 + dz.1);
        let full2 = full.0 * full.0 + full.1 * full.1;
        if full2 > bailout_sq {
            return DistanceSample {
                log2_de: log2_distance_estimate(full, der),
                iters,
                escaped: true,
            };
        }
        if full2 < dz.0 * dz.0 + dz.1 * dz.1 || ref_i >= orbit.len() - 1 {
            dz = full;
            ref_i = 0;
        }
    }

    DistanceSample {
        log2_de: f64::NEG_INFINITY,
        iters,
        escaped: false,
    }
}

/// log2 of 2·|z|·ln|z| / |z′| — the exterior Koebe distance estimate, kept in
/// log space so it survives |z′| past the f64 exponent range.
pub fn log2_distance_estimate(z: (f64, f64), der: CFe) -> f64 {
    let magnitude = z.0.hypot(z.1);
    if !(magnitude > 1.0) || !magnitude.is_finite() {
        // Below |z| = 1 the estimate's ln|z| factor is not the escaping branch;
        // callers only reach this with a bailed-out value, so treat it as noise.
        return f64::NEG_INFINITY;
    }
    let Some(log2_der) = der.log2_mag() else {
        // z′ = 0 cannot happen after the first step (z′ = 1 there), but a zero
        // would mean "infinitely far", which is never the useful reading.
        return f64::NEG_INFINITY;
    };
    let log2_magnitude = magnitude.log2();
    1.0 + log2_magnitude + (magnitude.ln()).log2() - log2_der
}

/// Least-squares slope and R² of `y = a + slope·x`.
pub fn power_law_fit(points: &[(f64, f64)]) -> (f64, f64) {
    let n = points.len() as f64;
    if points.len() < 2 {
        return (f64::NAN, f64::NAN);
    }
    let mean_x = points.iter().map(|p| p.0).sum::<f64>() / n;
    let mean_y = points.iter().map(|p| p.1).sum::<f64>() / n;
    let mut sxy = 0.0;
    let mut sxx = 0.0;
    let mut syy = 0.0;
    for &(x, y) in points {
        sxy += (x - mean_x) * (y - mean_y);
        sxx += (x - mean_x) * (x - mean_x);
        syy += (y - mean_y) * (y - mean_y);
    }
    if sxx <= 0.0 {
        return (f64::NAN, f64::NAN);
    }
    let slope = sxy / sxx;
    let r2 = if syy > 0.0 {
        (sxy * sxy) / (sxx * syy)
    } else {
        f64::NAN
    };
    (slope, r2)
}

/// Reference orbit in f64 arithmetic — the shallow path, and the one whose
/// failure mode this census had to diagnose.
///
/// The f64 orbit of an approximate boundary point escapes, and fast: seahorse
/// survives 3091 steps, triple-spiral 435, misiurewicz 137. That is not the
/// true orbit going anywhere — it is rounding, amplified by |z′|, and past
/// that point every pixel riding the reference inherits the noise. Two
/// consequences the first run of this census walked into:
///
///   * reach.rs caps its budget at the reference length
///     (`iters.min(orbit.len() - 2)`), so its σ = 1e-9 triple-spiral row runs
///     433 iterations instead of 120 000 and reports the starved pixels as
///     interior. The cap is unnecessary — the end-of-orbit rebase
///     (`dz = full; ref_i = 0`) is exact, since orbit[0] = 0 and
///     orbit[1] = c_ref make the next step `dz² + c`.
///   * Removing the cap is not enough. With the reference exhausted the walk
///     degrades to direct f64 iteration, and at σ = 1e-9 that is pure noise:
///     the census measured 0 % interior at σ = 1e-9 against 64 % at σ = 1e-6,
///     which is impossible — deeper views need MORE iterations, not fewer.
///     Every pixel was escaping on rounding error.
///
/// So the census uses `ref_orbit_dbig` below for anything past σ = 1e-3.
pub(crate) fn ref_orbit_f64(cx: f64, cy: f64, max_iter: usize) -> Vec<(f64, f64)> {
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

/// Reference orbit computed in arbitrary precision, stored as f64.
///
/// This is what the production pipeline does and what perturbation actually
/// requires: the ORBIT must be the true orbit of the reference parameter —
/// its values are O(1) and f64 holds them fine — while the pixels ride it in
/// f64. One DBig orbit per view costs well under a second at these lengths,
/// against 37 000 pixel walks that then mean something.
pub(crate) fn ref_orbit_dbig(cx: f64, cy: f64, max_iter: usize, digits: usize) -> Vec<(f64, f64)> {
    let cx = raise_precision(DBig::from_str(&format!("{cx:.17e}")).unwrap(), digits);
    let cy = raise_precision(DBig::from_str(&format!("{cy:.17e}")).unwrap(), digits);
    let two = raise_precision(dbig_i(2), digits);
    let mut zx = raise_precision(dbig_i(0), digits);
    let mut zy = raise_precision(dbig_i(0), digits);
    let mut v = Vec::with_capacity(max_iter + 1);
    v.push((0.0, 0.0));
    for _ in 0..max_iter {
        let nx = &zx * &zx - &zy * &zy + &cx;
        let ny = &two * &zx * &zy + &cy;
        zx = nx;
        zy = ny;
        let (fx, fy) = (dbig_to_f64(&zx), dbig_to_f64(&zy));
        v.push((fx, fy));
        if fx * fx + fy * fy > 1e12 {
            break;
        }
    }
    v
}

/// The reference a view needs at a given zoom: f64 is fine where the pixel
/// offsets dwarf its rounding, and useless past that.
pub(crate) fn census_reference(cx: f64, cy: f64, sigma: f64, max_iter: usize) -> Vec<(f64, f64)> {
    if sigma >= 1e-4 {
        ref_orbit_f64(cx, cy, max_iter)
    } else {
        // ~ 3 digits per decade of depth, plus room for the orbit to shed
        // bits over the walk.
        let digits = 64 + 3 * (-sigma.log10()).ceil().max(0.0) as usize;
        ref_orbit_dbig(cx, cy, max_iter, digits)
    }
}

/// Result of covering a grid with super-pixel anchors.
#[derive(Clone, Copy, Debug)]
pub struct CoverStats {
    /// Anchors that carry a usable radius (≥ 1 cell) and serve neighbours.
    pub serving_anchors: usize,
    /// Cells that had to be computed on their own — no usable radius (interior,
    /// or a reach below one cell).
    pub singletons: usize,
    pub cells: usize,
}

impl CoverStats {
    /// Share of cells that must be walked from scratch. This is the ceiling on
    /// what super-pixel skipping can leave, NOT a prediction of the renderer:
    /// the greedy cover is free to place an anchor anywhere, while the real
    /// pipeline places them on a fixed lattice.
    pub fn computed_share(&self) -> f64 {
        if self.cells == 0 {
            return f64::NAN;
        }
        (self.serving_anchors + self.singletons) as f64 / self.cells as f64
    }
}

/// Greedy disk cover of a `g × g` grid: repeatedly take the largest still-useful
/// radius among uncovered cells and mark its disk covered.
///
/// `radius_cells[i]` is cell i's reach expressed in cells; anything below 1 (or
/// NaN) is a cell that cannot serve anyone. Largest-first is the standard greedy
/// heuristic for set cover — it under-counts anchors relative to a raster sweep,
/// which is what we want from a ceiling.
pub fn greedy_cover(radius_cells: &[f64], g: usize) -> CoverStats {
    let cells = g * g;
    assert_eq!(radius_cells.len(), cells, "radius grid must be g×g");
    let mut covered = vec![false; cells];
    let mut order: Vec<usize> = (0..cells).collect();
    order.sort_by(|&a, &b| {
        let ra = if radius_cells[a].is_nan() {
            f64::NEG_INFINITY
        } else {
            radius_cells[a]
        };
        let rb = if radius_cells[b].is_nan() {
            f64::NEG_INFINITY
        } else {
            radius_cells[b]
        };
        rb.partial_cmp(&ra).unwrap()
    });

    let mut serving_anchors = 0usize;
    for &index in &order {
        if covered[index] {
            continue;
        }
        let radius = radius_cells[index];
        if !(radius >= 1.0) {
            // Every remaining cell in this order is unusable too; stop scanning
            // and count the uncovered remainder as singletons below.
            break;
        }
        serving_anchors += 1;
        let cx = (index % g) as i64;
        let cy = (index / g) as i64;
        let reach = radius.min(g as f64) as i64;
        let radius_sq = radius * radius;
        for y in (cy - reach).max(0)..=(cy + reach).min(g as i64 - 1) {
            for x in (cx - reach).max(0)..=(cx + reach).min(g as i64 - 1) {
                let dx = (x - cx) as f64;
                let dy = (y - cy) as f64;
                if dx * dx + dy * dy <= radius_sq {
                    covered[(y as usize) * g + x as usize] = true;
                }
            }
        }
    }

    let singletons = covered.iter().filter(|&&c| !c).count();
    CoverStats {
        serving_anchors,
        singletons,
        cells,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::reach::{reach_at_pixel, REACH_TOL};

    /// The load-bearing check, on the one family where the distance to ∂M is
    /// known exactly: −2 is the leftmost point of M, so dist(−2 − t, M) = t.
    ///
    /// A ray-scan truth is not usable for this — in filament country the nearest
    /// boundary is a hair that 64 rays walk straight past — whereas this identity
    /// is exact at every t, over as many octaves as we care to test. The ratio
    /// must sit at the Koebe extremal value 4 (a tip is exactly the extremal
    /// configuration) and, more importantly, must be SCALE-INVARIANT: a drift
    /// with t would mean the log-space arithmetic, not the geometry, is talking.
    #[test]
    fn distance_estimate_is_exact_at_the_tip() {
        const MAX_ITER: usize = 200_000;
        for k in 2..=8 {
            let t = 10f64.powi(-k);
            let c = (-2.0 - t, 0.0);
            let orbit = ref_orbit_f64(c.0, c.1, MAX_ITER);
            let sample = distance_at_pixel(&orbit, (0.0, 0.0), MAX_ITER, DE_BAILOUT_SQ);
            assert!(sample.escaped, "c = -2 - {:e} should escape", t);
            let ratio = sample.log2_de.exp2() / t;
            assert!(
                (ratio - 4.0).abs() < 0.05,
                "t = {:e}: DE/dist = {:.4}, expected the Koebe extremal 4",
                t,
                ratio
            );
        }
    }

    /// The production bailout is not usable for a distance: the same tip family
    /// escapes on the first iteration with z′ = 1, so DE degenerates to the
    /// bailout radius and the ratio to the true distance diverges as 1/t. This
    /// pins the reason `DE_BAILOUT_SQ` exists — a future "simplification" that
    /// reuses `reach::BAILOUT_SQ` here would silently invalidate every table.
    #[test]
    fn production_bailout_destroys_the_distance_estimate() {
        const MAX_ITER: usize = 200_000;
        let t = 1e-4;
        let c = (-2.0 - t, 0.0);
        let orbit = ref_orbit_f64(c.0, c.1, MAX_ITER);
        let production = distance_at_pixel(&orbit, (0.0, 0.0), MAX_ITER, crate::reach::BAILOUT_SQ);
        let ratio = production.log2_de.exp2() / t;
        assert!(
            ratio > 1e4,
            "expected the small-bailout estimate to blow up, got DE/dist = {:.3}",
            ratio
        );
    }

    /// The documented limit of reading DE as a geometric distance: at the
    /// parabolic cusp c = 1/4 (dist(1/4 + t, M) = t exactly, 1/4 being the
    /// rightmost point of M) the estimate decays like t^{3/2}, i.e. DE/dist ~ √t.
    /// The field genuinely varies on a scale below the geometric distance there —
    /// the parabolic bottleneck — so this is not an error to fix but the reason
    /// the census reports a dimension in the Green's metric.
    #[test]
    fn parabolic_cusp_separates_the_field_scale_from_the_distance() {
        const MAX_ITER: usize = 2_000_000;
        let mut ratios = Vec::new();
        for k in 2..=6 {
            let t = 10f64.powi(-k);
            let c = (0.25 + t, 0.0);
            let orbit = ref_orbit_f64(c.0, c.1, MAX_ITER);
            let sample = distance_at_pixel(&orbit, (0.0, 0.0), MAX_ITER, DE_BAILOUT_SQ);
            assert!(sample.escaped, "c = 0.25 + {:e} should escape", t);
            ratios.push(sample.log2_de.exp2() / t);
        }
        // Ten times closer to the cusp ⇒ the ratio must fall by ≈ √10.
        for pair in ratios.windows(2) {
            let factor = pair[0] / pair[1];
            assert!(
                (2.0..5.0).contains(&factor),
                "cusp ratio fell by {:.3} per decade, expected ≈ √10",
                factor
            );
        }
        assert!(
            ratios[0] < 1.0 && *ratios.last().unwrap() < 0.02,
            "cusp ratios {:?} should collapse well below 1",
            ratios
        );
    }

    /// The lean DE walk duplicates reach.rs's perturbation loop and rebase. It
    /// must agree with it pixel for pixel, or the census would be measuring the
    /// copy's bookkeeping.
    #[test]
    fn distance_walk_matches_the_reach_walk() {
        let center = (-0.743643887037151, 0.131825904205330);
        let orbit = ref_orbit_f64(center.0, center.1, 4096);
        let max_iter = 4096.min(orbit.len().saturating_sub(2));
        for k in 0..16 {
            let dc = (1e-4 * (k as f64 - 8.0), 7e-5 * (k as f64 - 3.0));
            // Shared bailout: the walks are only comparable step for step when
            // they stop at the same place.
            let lean = distance_at_pixel(&orbit, dc, max_iter, crate::reach::BAILOUT_SQ);
            let full = reach_at_pixel(&orbit, dc, max_iter, REACH_TOL);
            assert_eq!(
                lean.escaped, full.escaped,
                "escape flag differs at {:?}",
                dc
            );
            if !lean.escaped {
                continue;
            }
            assert_eq!(lean.iters, full.iters, "iteration differs at {:?}", dc);
            let reference = log2_distance_estimate(full.z_escape, full.der);
            assert!(
                (lean.log2_de - reference).abs() < 1e-9,
                "log2 DE {:.6} vs {:.6} at {:?}",
                lean.log2_de,
                reference,
                dc
            );
        }
    }

    /// The sausage estimator, validated on a set whose dimension is known and
    /// whose distance function is exact: a circle has box dimension 1, so the
    /// share of a window within ε of it must scale as ε^(2−1) = ε.
    #[test]
    fn sausage_slope_recovers_a_smooth_curve() {
        const G: usize = 512;
        let radius = 0.5f64;
        let mut log2_de = Vec::with_capacity(G * G);
        for gy in 0..G {
            for gx in 0..G {
                let x = (gx as f64 + 0.5) / G as f64 * 2.0 - 1.0;
                let y = (gy as f64 + 0.5) / G as f64 * 2.0 - 1.0;
                log2_de.push(((x.hypot(y) - radius).abs()).log2());
            }
        }
        let mut points = Vec::new();
        for k in 3..=7 {
            let log2_eps = -(k as f64);
            let share =
                log2_de.iter().filter(|&&v| v <= log2_eps).count() as f64 / log2_de.len() as f64;
            points.push((log2_eps, share.log2()));
        }
        let (slope, r2) = power_law_fit(&points);
        assert!(
            (slope - 1.0).abs() < 0.05,
            "circle sausage slope {:.4} ≠ 1 (d = {:.4})",
            slope,
            2.0 - slope
        );
        assert!(
            r2 > 0.999,
            "circle sausage fit is not a power law: R² {}",
            r2
        );
    }

    /// A filled square has box dimension 2 for its INTERIOR sausage: the share
    /// saturates instead of scaling, so the estimator must report slope ≈ 0.
    /// This is the degenerate end the Mandelbrot rows approach.
    #[test]
    fn sausage_slope_saturates_on_a_solid_region() {
        const G: usize = 256;
        let mut log2_de = Vec::with_capacity(G * G);
        for _ in 0..G * G {
            log2_de.push(f64::NEG_INFINITY);
        }
        let mut points = Vec::new();
        for k in 3..=7 {
            let log2_eps = -(k as f64);
            let share =
                log2_de.iter().filter(|&&v| v <= log2_eps).count() as f64 / log2_de.len() as f64;
            points.push((log2_eps, share.log2()));
        }
        let (slope, _) = power_law_fit(&points);
        assert!(slope.abs() < 1e-9, "solid region slope {:.4} ≠ 0", slope);
    }

    #[test]
    fn greedy_cover_counts_disks() {
        // One cell with a radius that spans the whole grid covers everything.
        let g = 16;
        let mut radii = vec![0.0f64; g * g];
        radii[g * g / 2 + g / 2] = 100.0;
        let stats = greedy_cover(&radii, g);
        assert_eq!(stats.serving_anchors, 1);
        assert_eq!(stats.singletons, 0);

        // No usable radius at all: every cell is its own computation.
        let none = greedy_cover(&vec![0.0f64; g * g], g);
        assert_eq!(none.serving_anchors, 0);
        assert_eq!(none.singletons, g * g);
        assert!((none.computed_share() - 1.0).abs() < 1e-12);

        // A uniform radius of 2 cells covers ~13 cells per anchor, so the count
        // must land well below the cell count and well above one.
        let uniform = greedy_cover(&vec![2.0f64; g * g], g);
        assert!(
            uniform.serving_anchors > 1 && uniform.serving_anchors < g * g / 4,
            "uniform radius 2 gave {} anchors",
            uniform.serving_anchors
        );
        assert_eq!(uniform.singletons, 0);
    }

    // ── the censuses ────────────────────────────────────────────────────────────

    /// (name, cx, cy) — the reach census's four views, plus a self-similarity
    /// control.
    ///
    /// `mini-seahorse` is the seahorse point transported into the period-3 island
    /// by that island's size estimate, c = nucleus + Λ·c_seahorse with
    /// nucleus = −1.7548776662466927 and Λ = 0.019035515913 (real, so the copy is
    /// upright there). It is the SAME relative position inside a copy 52× smaller,
    /// so a measurement that is really about the geometry — and not about our
    /// scales, budgets or grid — must return the seahorse row's dimension. The
    /// island's own centre is not usable as a view: at σ = 1e-3 it is 98 %
    /// interior and every column degenerates.
    ///
    /// The fourth field is the view's own scale factor. A copy 52× smaller must be
    /// looked at through a window 52× smaller, or the "same" σ is a completely
    /// different picture: at σ = 1e-3 unscaled, the mini-seahorse window spans a
    /// twentieth of the whole island and reads 47 % interior with a saturated
    /// sausage — the equivalent of viewing the main set at σ = 0.05. The fifth
    /// field multiplies the iteration budget: the copy is period 3, so its orbits
    /// cost a small multiple of the main set's at the same relative depth.
    const VIEWS: [(&str, f64, f64, f64, usize); 5] = [
        ("seahorse", -0.743643887037151, 0.131825904205330, 1.0, 1),
        ("elephant", 0.2925755, 0.0149977, 1.0, 1),
        ("triple-spiral", -0.7269, 0.1889, 1.0, 1),
        ("misiurewicz", -0.10109636384562, 0.95628651080914, 1.0, 1),
        (
            "mini-seahorse",
            -1.7690332504,
            0.0025093773,
            0.019035515913,
            4,
        ),
    ];

    fn quantile(values: &[f64], q: f64) -> f64 {
        if values.is_empty() {
            return f64::NAN;
        }
        let mut sorted = values.to_vec();
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap());
        let index = ((sorted.len() - 1) as f64 * q).round() as usize;
        sorted[index.min(sorted.len() - 1)]
    }

    /// Local box dimension of ∂M in each view, from the exterior sausage law.
    ///
    ///   int%   — cells that never escaped the budget (no exterior distance).
    ///            Genuine interior and "would escape later" are conflated, as in
    ///            the reach census.
    ///   A(ε)   — share of the window within ε of ∂M, ε in units of the view
    ///            half-height σ. Only cells that escaped contribute.
    ///   d      — 2 − slope of log A against log ε, fitted over the octaves that
    ///            the grid resolves (ε ≥ 4 cells).
    ///   R²     — how well those octaves are a power law at all. A low R² means
    ///            "no single dimension describes this window", which is itself
    ///            the answer for that location.
    ///   floor  — the fitted law extrapolated to one pixel of a 1080-line render:
    ///            the share of pixels within a pixel of ∂M, plus the interior.
    ///            No anchor can serve those — their reach is at most their own
    ///            distance — so this is the share the renderer must compute even
    ///            with a PERFECT bound, i.e. the geometric floor that the
    ///            reach-based ceiling in `skip_ceiling_census` is measured against.
    ///
    /// Run with: cargo test --release box_dimension_census -- --ignored --nocapture
    #[test]
    #[ignore = "census: heavy, run explicitly with --ignored --nocapture"]
    fn box_dimension_census() {
        const G: usize = 192;
        const H: f64 = 1080.0;
        // σ = 1e-6 is deliberately absent. On these centres that window is
        // interior-dominated — the ceiling census measures 64 % non-escaping at
        // seahorse even with a 250 000 budget and an arbitrary-precision
        // reference, so it is geometry, not starvation — which leaves the escaped
        // population as a thin boundary layer whose sausage is already saturated
        // at every ε the grid resolves (100 %, 100 %, 100 %, 99.5 %: no slope
        // exists). The interior share is the interesting number there and the
        // ceiling census reports it. Two depths four decades apart is the
        // informative pair for the dimension itself.
        let sigmas: [(f64, usize); 2] = [(1e-3, 8_000), (1e-9, 150_000)];

        println!(
            "\n boxdim | view          σ      iters |  int% | A(σ/2) A(σ/4) A(σ/8) A(σ/16) |    d    R² | floor@1080"
        );
        for (name, cx, cy, view_scale, budget_mult) in VIEWS {
            for (sigma, budget) in sigmas {
                let sigma = sigma * view_scale;
                let budget = budget * budget_mult;
                let orbit = census_reference(cx, cy, sigma, budget);
                assert!(orbit.len() >= 3, "{} reference degenerate", name);
                let max_iter = budget;

                let cell = 2.0 * sigma / G as f64;
                let mut log2_de = Vec::with_capacity(G * G);
                let mut interior = 0usize;
                for gy in 0..G {
                    for gx in 0..G {
                        let tx = (gx as f64 + 0.5) / G as f64 * 2.0 - 1.0;
                        let ty = (gy as f64 + 0.5) / G as f64 * 2.0 - 1.0;
                        let s = distance_at_pixel(
                            &orbit,
                            (tx * sigma, ty * sigma),
                            max_iter,
                            DE_BAILOUT_SQ,
                        );
                        if !s.escaped {
                            interior += 1;
                        }
                        log2_de.push(s.log2_de);
                    }
                }
                let escaped: Vec<f64> = log2_de.iter().copied().filter(|v| v.is_finite()).collect();

                // ε from σ/2 down to 4 cells: below that a single cell centre no
                // longer resolves its neighbourhood and the share saturates from
                // the other end.
                //
                // Octaves where the share is already ≈ 1 carry no slope — the
                // whole window is inside the boundary layer at that ε, which
                // happens as soon as a view is deep enough — so they are recorded
                // for the table and dropped from the fit. A row with fewer than
                // three usable octaves reports no dimension rather than the slope
                // of a saturated curve (the first run of this census returned a
                // confident d = 2.00 at R² = 0.60 from two points at 100 %).
                const SATURATED: f64 = 0.98;
                let log2_sigma = sigma.log2();
                let log2_floor = (4.0 * cell).log2();
                let mut points = Vec::new();
                let mut octaves = Vec::new();
                let mut k = 1.0;
                while log2_sigma - k >= log2_floor {
                    let log2_eps = log2_sigma - k;
                    let share = escaped.iter().filter(|&&v| v <= log2_eps).count() as f64
                        / escaped.len().max(1) as f64;
                    if share > 0.0 && share < SATURATED {
                        points.push((log2_eps, share.log2()));
                    }
                    octaves.push((k, share));
                    k += 1.0;
                }
                let (slope, r2) = if points.len() >= 3 {
                    power_law_fit(&points)
                } else {
                    (f64::NAN, f64::NAN)
                };
                let dimension = 2.0 - slope;
                let at = |want: f64| -> f64 {
                    octaves
                        .iter()
                        .find(|(k, _)| (*k - want).abs() < 1e-9)
                        .map(|(_, s)| 100.0 * s)
                        .unwrap_or(f64::NAN)
                };
                // The fitted law evaluated at one pixel: the share of pixels
                // sitting within a pixel of ∂M, which NO anchor can serve (their
                // own reach is at most their distance). Interior cells are added
                // for the same reason. Extrapolated along the least-squares line
                // through its centroid, not from one end point.
                let pixel = 2.0 * sigma / H;
                let floor = if slope.is_finite() && !points.is_empty() {
                    let mean_x = points.iter().map(|p| p.0).sum::<f64>() / points.len() as f64;
                    let mean_y = points.iter().map(|p| p.1).sum::<f64>() / points.len() as f64;
                    let predicted = mean_y + slope * (pixel.log2() - mean_x);
                    100.0 * (predicted.exp2() + interior as f64 / (G * G) as f64).min(1.0)
                } else {
                    f64::NAN
                };
                println!(
                    " boxdim | {:<12} {:>6.0e} {:>6} | {:>5.1} | {:>6.2} {:>6.2} {:>7.2} {:>8.2} | {:>4.2} {:>5.3} | {:>8.2}%",
                    name,
                    sigma,
                    max_iter,
                    100.0 * interior as f64 / (G * G) as f64,
                    at(1.0),
                    at(2.0),
                    at(3.0),
                    at(4.0),
                    dimension,
                    r2,
                    floor,
                );
            }
        }
    }

    /// Is the reach geometry-limited or bound-limited, and what does a perfect
    /// cover leave to compute?
    ///
    ///   ρ/DE      — quartiles of the Taylor reach over the distance estimate.
    ///               Θ(1) and tight = the radius already tracks the geometry, and
    ///               only the tolerance or the model order can move it; a long
    ///               left tail = our bound is loose on that population. The
    ///               theoretical value for a cubic remainder is tol^(1/3) ≈ 0.1
    ///               at REACH_TOL = 1e-3.
    ///   int%      — non-escaping share of the window. It conflates interior with
    ///               "would escape after the budget", exactly as reach.rs's uns%,
    ///               and every one of those pixels is unservable by construction.
    ///               The budgets below are the ones that keep it small enough for
    ///               the other columns to mean anything.
    ///   ext%      — anchors/pixels over the ESCAPED cells at a 1080-line render,
    ///               mean-field: a cell of reach ρ needs one anchor per π·ρ² of
    ///               area, i.e. pixel²/(π·ρ²) anchors per pixel, capped at 1. This
    ///               is resolution-independent, which a greedy cover on a coarse
    ///               grid is NOT — a 96² grid over the window has cells 11 px
    ///               wide, so a genuine 4 px reach would score as unusable there.
    ///   all%      — the same including interior cells at 1 anchor per pixel: the
    ///               ceiling for the whole frame, which no exterior model can beat.
    ///   crop%     — mean-field on a G×G crop whose cells ARE 1080-render pixels,
    ///               offset from the centre (the centres are boundary points, and
    ///               a crop sitting exactly on one is the worst patch of the view,
    ///               not a representative one).
    ///   greedy%   — an actual greedy disk cover of that crop. `pack` =
    ///               greedy/crop is the packing overhead a real placement pays
    ///               over the mean-field integral.
    ///
    /// Run with: cargo test --release skip_ceiling_census -- --ignored --nocapture
    #[test]
    #[ignore = "census: heavy, run explicitly with --ignored --nocapture"]
    fn skip_ceiling_census() {
        const G: usize = 64;
        const H: f64 = 1080.0;
        // Offset of the pixel-resolution crop, in units of σ.
        const CROP_OFFSET: (f64, f64) = (0.45, 0.30);
        // One depth by default. A deep row needs a budget that resolves it
        // (250 000 at σ = 1e-6, since these windows are interior-dominated and
        // every non-escaping cell pays the full budget twice over), which costs
        // about ten minutes PER VIEW — add `(1e-6, 250_000)` here when that is
        // what you want. The one measured that way is quoted in the findings
        // note: seahorse reads the same ρ/DE as at 1e-3 with 64 % interior.
        let sigmas: [(f64, usize); 1] = [(1e-3, 8_000)];

        // Loosening REACH_TOL to a palette texel is the lever the findings note
        // points at. ρ_next and ρ_der2 are cubic criteria, so each row is the
        // walked radius shifted by an exact constant — no second pass.
        let tol_sweep: [(&str, f64); 3] = [
            ("baseline", REACH_TOL),
            (
                "P=256 texel",
                crate::reach::tol_for_nu_budget(crate::reach::palette_nu_quantum(256.0)),
            ),
            (
                "P=def texel",
                crate::reach::tol_for_nu_budget(crate::reach::palette_nu_quantum(1886.72)),
            ),
        ];

        println!(
            "\n ceiling | view          σ    | ρ/DE p25   p50   p75 |  int% |  ext%  all% | crop% greedy% pack"
        );
        for (name, cx, cy, view_scale, budget_mult) in VIEWS {
            for (sigma, budget) in sigmas {
                let sigma = sigma * view_scale;
                let budget = budget * budget_mult;
                let orbit = census_reference(cx, cy, sigma, budget);
                assert!(orbit.len() >= 3, "{} reference degenerate", name);
                let max_iter = budget;
                let pixel = 2.0 * sigma / H;
                let log2_pixel = pixel.log2();

                // Mean-field anchor density at render resolution: a cell whose
                // reach is ρ needs one anchor per π·ρ² of area, i.e. pixel²/(π·ρ²)
                // anchors per pixel. Never less than one anchor per pixel.
                let anchors_per_pixel = |log2_rho: f64| -> f64 {
                    if !log2_rho.is_finite() {
                        return 1.0;
                    }
                    let radius_px = (log2_rho - log2_pixel).exp2();
                    (1.0 / (std::f64::consts::PI * radius_px * radius_px)).min(1.0)
                };

                // Pass 1 — the whole window: ρ/DE and the mean-field share.
                let mut ratio = Vec::new();
                let mut exterior_load = 0.0f64;
                let mut interior = 0usize;
                // Same tolerance sweep as `nu_branch_census`, and the number that
                // actually decides the lever: the anchor RATIO improves as ρ⁻²,
                // but `ext%`/`all%` are capped at one anchor per pixel, so the
                // pixels within a pixel of ∂M absorb most of the gain.
                let mut exterior_load_sweep = vec![0.0f64; tol_sweep.len()];
                let mut crop_load_sweep = vec![0.0f64; tol_sweep.len()];
                for gy in 0..G {
                    for gx in 0..G {
                        let tx = (gx as f64 + 0.5) / G as f64 * 2.0 - 1.0;
                        let ty = (gy as f64 + 0.5) / G as f64 * 2.0 - 1.0;
                        let dc = (tx * sigma, ty * sigma);
                        let s = reach_at_pixel(&orbit, dc, max_iter, REACH_TOL);
                        if !s.escaped {
                            interior += 1;
                            continue;
                        }
                        // ρ keeps the production bailout (it is a statement about
                        // the colour at that bailout); the distance needs its own,
                        // hence a second, much cheaper walk.
                        let log2_de =
                            distance_at_pixel(&orbit, dc, max_iter, DE_BAILOUT_SQ).log2_de;
                        let log2_rho = s.log2_rho_next.min(s.log2_rho_der2);
                        if log2_de.is_finite() && log2_rho.is_finite() {
                            ratio.push(log2_rho - log2_de);
                        }
                        exterior_load += anchors_per_pixel(log2_rho);
                        for (si, &(_, tol)) in tol_sweep.iter().enumerate() {
                            exterior_load_sweep[si] += anchors_per_pixel(
                                log2_rho + crate::reach::cubic_reach_log2_shift(REACH_TOL, tol),
                            );
                        }
                    }
                }

                // Pass 2 — a crop whose cells are exactly render pixels, so a
                // greedy cover can be run against the same mean-field formula.
                let crop = 0.5 * G as f64 * pixel; // half-size of the crop in c
                let mut crop_load = 0.0f64;
                let mut radius_cells = Vec::with_capacity(G * G);
                for gy in 0..G {
                    for gx in 0..G {
                        let tx = (gx as f64 + 0.5) / G as f64 * 2.0 - 1.0;
                        let ty = (gy as f64 + 0.5) / G as f64 * 2.0 - 1.0;
                        let dc = (
                            CROP_OFFSET.0 * sigma + tx * crop,
                            CROP_OFFSET.1 * sigma + ty * crop,
                        );
                        let s = reach_at_pixel(&orbit, dc, max_iter, REACH_TOL);
                        let log2_rho = if s.escaped {
                            s.log2_rho_next.min(s.log2_rho_der2)
                        } else {
                            f64::NEG_INFINITY
                        };
                        crop_load += anchors_per_pixel(log2_rho);
                        for (si, &(_, tol)) in tol_sweep.iter().enumerate() {
                            crop_load_sweep[si] += anchors_per_pixel(
                                log2_rho + crate::reach::cubic_reach_log2_shift(REACH_TOL, tol),
                            );
                        }
                        radius_cells.push(if log2_rho.is_finite() {
                            (log2_rho - log2_pixel).exp2()
                        } else {
                            f64::NAN
                        });
                    }
                }
                let stats = greedy_cover(&radius_cells, G);
                let cells = (G * G) as f64;
                let escaped = cells - interior as f64;
                let exterior_share = if escaped > 0.0 {
                    100.0 * exterior_load / escaped
                } else {
                    f64::NAN
                };
                let all_share = 100.0 * (exterior_load + interior as f64) / cells;
                let crop_share = 100.0 * crop_load / cells;
                let greedy_share = 100.0 * stats.computed_share();
                println!(
                    " ceiling | {:<12} {:>6.0e} | {:>8.3} {:>5.3} {:>5.3} | {:>5.1} | {:>5.1} {:>5.1} | {:>5.1} {:>6.1} {:>4.2}",
                    name,
                    sigma,
                    quantile(&ratio, 0.25).exp2(),
                    quantile(&ratio, 0.50).exp2(),
                    quantile(&ratio, 0.75).exp2(),
                    100.0 * interior as f64 / cells,
                    exterior_share,
                    all_share,
                    crop_share,
                    greedy_share,
                    greedy_share / crop_share,
                );
                for (si, &(label, tol)) in tol_sweep.iter().enumerate() {
                    let ext = if escaped > 0.0 {
                        100.0 * exterior_load_sweep[si] / escaped
                    } else {
                        f64::NAN
                    };
                    let all = 100.0 * (exterior_load_sweep[si] + interior as f64) / cells;
                    println!(
                        " ceil-tol| {:<12} {:>6.0e} | {:<12} {:>5.2}× ρ | {:>5.1} {:>5.1} | {:>5.1} | frame speedup {:>5.2}×",
                        name,
                        sigma,
                        label,
                        crate::reach::cubic_reach_log2_shift(REACH_TOL, tol).exp2(),
                        ext,
                        all,
                        100.0 * crop_load_sweep[si] / cells,
                        100.0 / all,
                    );
                }
            }
        }
    }
}
