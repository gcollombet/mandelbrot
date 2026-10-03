//! Multi-keyframe camera path with rounded corners, for the studio.
//!
//! Each leg between two keyframes is the exact two-point export transition
//! (exponential scale, centre linear in the scale fraction so the apparent
//! translation speed is uniform, linear angle). Those legs meet at a corner:
//! the direction and the zoom speed change abruptly. Around every interior
//! keyframe the two adjacent legs are therefore blended over a window, each
//! extrapolated past the keyframe, with a smoothstep weight. Inside the
//! window the path is a convex combination of two smooth curves that agree
//! at the window's edges to first order, so the whole path is C1.
//!
//! Everything positional stays in `DBig`: the legs are evaluated at the
//! navigator's precision and only the blend weight and the log-scale are
//! f64. A window never exceeds half of either adjacent leg, so a blended
//! point is at most the window's travel away from the keyframe, at the
//! keyframe's own scale — a corner rounded within the zoom funnel.

use core::str::FromStr;
use dashu_float::DBig;

use crate::{dbig_f64, dbig_neg_log10, raise_precision_in_place};

/// One camera keyframe, at an absolute camera time.
#[derive(Clone, Debug)]
pub struct PathKey {
    pub cx: DBig,
    pub cy: DBig,
    pub scale: DBig,
    pub angle: f64,
    pub time: f64,
}

/// A point of the path.
#[derive(Clone, Debug)]
pub struct PathPoint {
    pub cx: DBig,
    pub cy: DBig,
    pub scale: DBig,
    /// log10 of `scale`, the quantity the legs interpolate linearly.
    pub log10_scale: f64,
    pub angle: f64,
}

#[derive(Clone, Debug)]
pub struct CameraPath {
    keys: Vec<PathKey>,
    /// Half-width of the blend window around an interior keyframe, seconds.
    corner: f64,
    /// Decimal digits every position is carried at.
    precision: usize,
}

/// Build a scale from its log10 without going through an f64 value: the
/// exponent is split off so `1e-400` stays representable.
fn scale_from_log10(log10: f64) -> DBig {
    let exponent = log10.floor();
    let mantissa = 10f64.powf(log10 - exponent);
    DBig::from_str(&format!("{}e{}", mantissa, exponent as i64)).unwrap_or_else(|_| dbig_f64(1.0))
}

fn log10_of(scale: &DBig) -> f64 {
    -dbig_neg_log10(scale)
}

fn smoothstep(x: f64) -> f64 {
    let x = x.clamp(0.0, 1.0);
    x * x * (3.0 - 2.0 * x)
}

impl CameraPath {
    /// Keys must be in strictly increasing time. `corner` is the blend
    /// half-window in seconds (0 keeps the corners sharp).
    pub fn new(mut keys: Vec<PathKey>, corner: f64, precision: usize) -> Option<CameraPath> {
        if keys.is_empty() {
            return None;
        }
        for i in 1..keys.len() {
            if keys[i].time <= keys[i - 1].time || keys[i].time.is_nan() {
                return None;
            }
        }
        for key in keys.iter_mut() {
            raise_precision_in_place(&mut key.cx, precision);
            raise_precision_in_place(&mut key.cy, precision);
            raise_precision_in_place(&mut key.scale, precision);
        }
        Some(CameraPath {
            keys,
            corner: if corner.is_finite() {
                corner.max(0.0)
            } else {
                0.0
            },
            precision,
        })
    }

    /// Parse `cx|cy|scale|angle|time;...` as written by the studio.
    pub fn parse(spec: &str, corner: f64, precision: usize) -> Option<CameraPath> {
        let mut keys = Vec::new();
        for entry in spec.split(';').filter(|e| !e.trim().is_empty()) {
            let fields: Vec<&str> = entry.split('|').collect();
            if fields.len() != 5 {
                return None;
            }
            let cx = DBig::from_str(fields[0].trim()).ok()?;
            let cy = DBig::from_str(fields[1].trim()).ok()?;
            let scale = DBig::from_str(fields[2].trim()).ok()?;
            let angle: f64 = fields[3].trim().parse().ok()?;
            let time: f64 = fields[4].trim().parse().ok()?;
            if !(angle.is_finite() && time.is_finite()) || scale <= dbig_f64(0.0) {
                return None;
            }
            keys.push(PathKey {
                cx,
                cy,
                scale,
                angle,
                time,
            });
        }
        CameraPath::new(keys, corner, precision)
    }

    #[cfg(test)]
    pub fn keys(&self) -> &[PathKey] {
        &self.keys
    }

    pub fn duration(&self) -> f64 {
        self.keys.last().map(|k| k.time).unwrap_or(0.0) - self.keys[0].time
    }

    pub fn start_time(&self) -> f64 {
        self.keys[0].time
    }

    /// The deepest scale on the path (for the navigator's precision budget).
    pub fn deepest_scale(&self) -> &DBig {
        let mut deepest = &self.keys[0].scale;
        for key in &self.keys {
            if key.scale < *deepest {
                deepest = &key.scale;
            }
        }
        deepest
    }

    /// Half-window of the rounded corner at interior key `k`: the requested
    /// corner, never more than half of either adjacent leg.
    fn window(&self, k: usize) -> f64 {
        let before = self.keys[k].time - self.keys[k - 1].time;
        let after = self.keys[k + 1].time - self.keys[k].time;
        self.corner.min(0.5 * before).min(0.5 * after)
    }

    fn key_point(&self, i: usize) -> PathPoint {
        let key = &self.keys[i];
        PathPoint {
            cx: key.cx.clone(),
            cy: key.cy.clone(),
            scale: key.scale.clone(),
            log10_scale: log10_of(&key.scale),
            angle: key.angle,
        }
    }

    /// Leg `i` (keys i → i+1) at absolute time `t`, extrapolated linearly
    /// outside the leg: the same formulas as the two-point export.
    fn leg_point(&self, i: usize, t: f64) -> PathPoint {
        let a = &self.keys[i];
        let b = &self.keys[i + 1];
        let duration = b.time - a.time;
        let u = if duration > 0.0 {
            (t - a.time) / duration
        } else {
            0.0
        };
        let la = log10_of(&a.scale);
        let lb = log10_of(&b.scale);
        let log10_scale = la + (lb - la) * u;
        let mut scale = scale_from_log10(log10_scale);
        raise_precision_in_place(&mut scale, self.precision);
        // Centre: linear in the scale fraction, so that the translation reads
        // at a uniform speed on screen while the zoom is exponential. A pure
        // pan (equal scales) falls back to time.
        let s = if a.scale == b.scale {
            dbig_f64(u)
        } else {
            (&scale - &a.scale) / (&b.scale - &a.scale)
        };
        let cx = &a.cx + (&b.cx - &a.cx) * &s;
        let cy = &a.cy + (&b.cy - &a.cy) * &s;
        PathPoint {
            cx,
            cy,
            scale,
            log10_scale,
            angle: a.angle + (b.angle - a.angle) * u,
        }
    }

    fn blend(a: &PathPoint, b: &PathPoint, m: f64, precision: usize) -> PathPoint {
        let w = dbig_f64(m);
        let log10_scale = a.log10_scale + (b.log10_scale - a.log10_scale) * m;
        let mut scale = scale_from_log10(log10_scale);
        raise_precision_in_place(&mut scale, precision);
        PathPoint {
            cx: &a.cx + (&b.cx - &a.cx) * &w,
            cy: &a.cy + (&b.cy - &a.cy) * &w,
            scale,
            log10_scale,
            angle: a.angle + (b.angle - a.angle) * m,
        }
    }

    /// Camera at absolute camera time `t`, clamped to the path's span.
    pub fn eval(&self, t: f64) -> PathPoint {
        let n = self.keys.len();
        if n == 1 || t <= self.keys[0].time {
            return self.key_point(0);
        }
        if t >= self.keys[n - 1].time {
            return self.key_point(n - 1);
        }
        // Exactly on a keyframe outside any rounding window: the key itself,
        // bit for bit, rather than the leg's reconstruction through f64 logs.
        if let Some(k) = self.keys.iter().position(|key| key.time == t) {
            if k == 0 || k == n - 1 || self.window(k) <= 0.0 {
                return self.key_point(k);
            }
        }
        // Leg holding t.
        let mut i = 0;
        while i + 1 < n - 1 && t > self.keys[i + 1].time {
            i += 1;
        }
        // Rounded corner: an interior keyframe within its window.
        for k in [i, i + 1] {
            if k == 0 || k >= n - 1 {
                continue;
            }
            let w = self.window(k);
            if w <= 0.0 {
                continue;
            }
            let tk = self.keys[k].time;
            if t > tk - w && t < tk + w {
                let pa = self.leg_point(k - 1, t);
                let pb = self.leg_point(k, t);
                let m = smoothstep((t - (tk - w)) / (2.0 * w));
                return CameraPath::blend(&pa, &pb, m, self.precision);
            }
        }
        self.leg_point(i, t)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::dbig_to_f64;

    fn path(corner: f64) -> CameraPath {
        CameraPath::parse(
            "-0.75|0.1|2|0|0;-0.74|0.13|0.5|0.2|1;-0.7435|0.1314|0.05|0.2|2.5",
            corner,
            40,
        )
        .expect("valid path")
    }

    #[test]
    fn sharp_path_passes_through_every_key() {
        let p = path(0.0);
        for (i, key) in p.keys().iter().enumerate() {
            let point = p.eval(key.time);
            assert_eq!(point.cx.to_string(), key.cx.to_string(), "cx at key {}", i);
            assert_eq!(point.cy.to_string(), key.cy.to_string(), "cy at key {}", i);
            assert!(
                (point.log10_scale - (-dbig_neg_log10(&key.scale))).abs() < 1e-12,
                "scale at key {}",
                i
            );
            assert_eq!(point.angle, key.angle);
        }
    }

    #[test]
    fn legs_match_the_two_point_export_formulas() {
        let p = path(0.0);
        // Half-way through the first leg in time: log scale is the mean,
        // and the centre sits at the scale fraction, not at time 0.5.
        let point = p.eval(0.5);
        let expected_log = (2f64.log10() + 0.5f64.log10()) / 2.0;
        assert!((point.log10_scale - expected_log).abs() < 1e-12);
        let scale = dbig_to_f64(&point.scale);
        let s = (scale - 2.0) / (0.5 - 2.0);
        let cx = -0.75 + (-0.74 + 0.75) * s;
        assert!((dbig_to_f64(&point.cx) - cx).abs() < 1e-12);
        assert!((point.angle - 0.1).abs() < 1e-12);
    }

    #[test]
    fn rounded_corner_is_continuous_and_stays_near_the_key() {
        let sharp = path(0.0);
        let round = path(0.3);
        // Outside the window the rounded path is the sharp one.
        for t in [0.2, 0.6, 1.5, 2.2] {
            let a = sharp.eval(t);
            let b = round.eval(t);
            assert_eq!(a.cx.to_string(), b.cx.to_string(), "t = {}", t);
            assert!((a.log10_scale - b.log10_scale).abs() < 1e-12);
        }
        // Inside the window: the sharp path has a velocity jump at t = 1, the
        // rounded one does not. Compare the largest change of velocity between
        // consecutive samples, in screen units (centre offset over scale).
        let jump = |p: &CameraPath| {
            let h = 0.005;
            let mut worst: f64 = 0.0;
            let mut prev_v: Option<(f64, f64, f64)> = None;
            let mut t = 0.6;
            while t < 1.4 {
                let a = p.eval(t);
                let b = p.eval(t + h);
                let scale = dbig_to_f64(&a.scale);
                let v = (
                    (dbig_to_f64(&b.cx) - dbig_to_f64(&a.cx)) / scale / h,
                    (dbig_to_f64(&b.cy) - dbig_to_f64(&a.cy)) / scale / h,
                    (b.log10_scale - a.log10_scale) / h,
                );
                if let Some(pv) = prev_v {
                    worst = worst.max((v.0 - pv.0).abs() + (v.1 - pv.1).abs() + (v.2 - pv.2).abs());
                }
                prev_v = Some(v);
                t += h;
            }
            worst
        };
        let sharp_jump = jump(&sharp);
        let round_jump = jump(&round);
        assert!(
            round_jump * 4.0 < sharp_jump,
            "rounding must remove the corner: sharp {} round {}",
            sharp_jump,
            round_jump
        );
        // The rounded path passes close to the key: within the window's travel.
        let at_key = round.eval(1.0);
        let key = &round.keys()[1];
        let offset = ((dbig_to_f64(&at_key.cx) - dbig_to_f64(&key.cx)).powi(2)
            + (dbig_to_f64(&at_key.cy) - dbig_to_f64(&key.cy)).powi(2))
        .sqrt();
        assert!(
            offset < 0.3 * dbig_to_f64(&key.scale),
            "offset {} at scale {}",
            offset,
            dbig_to_f64(&key.scale)
        );
    }

    #[test]
    fn deep_path_keeps_scale_representable_and_monotonic() {
        let p = CameraPath::parse(
            "-0.75|0.1|1|0|0;-0.7436|0.1318|1e-200|0|10;-0.74364388703715|0.13182590420533|1e-400|0|20",
            1.0,
            450,
        )
        .expect("deep path");
        let mut last = f64::INFINITY;
        let mut t = 0.0;
        while t <= 20.0 {
            let point = p.eval(t);
            assert!(
                point.scale > dbig_f64(0.0),
                "scale must stay positive at t = {}",
                t
            );
            assert!(
                point.log10_scale <= last + 1e-9,
                "log scale must not increase at t = {}",
                t
            );
            last = point.log10_scale;
            t += 0.25;
        }
        let end = p.eval(20.0);
        assert!((end.log10_scale + 400.0).abs() < 1e-9);
        assert_eq!(end.cx.to_string(), p.keys()[2].cx.to_string());
    }

    #[test]
    fn rejects_unordered_or_malformed_specs() {
        assert!(CameraPath::parse("0|0|1|0|1;0|0|1|0|0", 0.0, 40).is_none());
        assert!(CameraPath::parse("0|0|1|0", 0.0, 40).is_none());
        assert!(CameraPath::parse("0|0|-1|0|0", 0.0, 40).is_none());
        assert!(CameraPath::parse("", 0.0, 40).is_none());
    }
}
