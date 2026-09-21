use core::convert::TryFrom;
use core::str::FromStr;
use dashu_float::ops::{Abs, SquareRoot};
use dashu_float::DBig;
use dashu_int::UBig;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[cfg(not(target_arch = "wasm32"))]
pub type JsValue = String;

// Fonction utilitaire pour convertir DBig en f32 de manière sûre
fn dbig_to_f32(bf: &DBig) -> f32 {
    bf.to_string().parse::<f32>().unwrap_or(0.0)
}

pub(crate) fn dbig_to_f64(bf: &DBig) -> f64 {
    bf.to_string().parse::<f64>().unwrap_or(0.0)
}

// Significant-bit budget needed to resolve detail at a given view scale: roughly
// -log2(scale) plus a margin for the reference-orbit accumulation. dashu rounds
// every operation to the operands' precision and never grows it, so without this
// the reference center caps at a fixed digit budget and deep zoom hits a hard
// precision cliff (e.g. ~1e-95). Scaling the precision with depth keeps the
// reference accurate as far as the orbit/host scale allow.
fn precision_bits_for_scale(scale: &DBig) -> usize {
    // log2|scale| from the O(1) float-exponent decomposition (value = mantissa ·
    // 2^exponent, |mantissa| ∈ [0.5, 1)). This used to go through `dbig_to_f64`,
    // i.e. serialize the whole significand to a decimal string — on EVERY
    // ensure_precision(), so on every step/translate/origin/scale call — and the
    // cost of that round-trip grew with the very precision it was sizing.
    let (mantissa, exponent) = dbig_frexp(scale);
    // Reproduce the old round-trip's domain exactly: it fell back to a generous
    // fixed depth whenever the f64 conversion left the finite non-zero range.
    let depth = if mantissa == 0.0 || exponent < -1074 || exponent > 1024 {
        4096
    } else {
        (-(exponent as f64 + mantissa.abs().log2())).ceil().max(0.0) as usize
    };
    depth + 64
}

// Reference-orbit descending precision profile (fix-reference-precision-budget, design D2):
// the working precision at orbit step n is clamp(P − ⌊G_n − margin⌋, FLOOR, P), where
// G_n = log2|dZ_n/dC| is the bits the orbit has amplified. Bits are shed only once earned, so
// the costly DBig precision is confined to the first ~P iterations; the rest run at the floor.
// FLOOR is well above the f32 storage mantissa (~24 bits), MARGIN absorbs the linear η_k drift.
const PRECISION_FLOOR_BITS: usize = 64;
const PRECISION_MARGIN_BITS: usize = 24;
// Floor budget for a navigator with no explicit budget set (the shared FRONT navigator). 64 =
// pure current-view precision (ensure_precision = max(view, budget)), matching the original
// view-driven behaviour so per-frame coordinate serialization stays cheap. The WORKER navigator
// always receives an explicit budget (default target 1e-30 → 164 bits) via the reset message,
// so this floor never lowers it. Deep diving raises the budget explicitly (preset / slider).
const DEFAULT_BUDGET_BITS: usize = 64;

// Manual navigation is sampled once per displayed frame.  Complex views may
// take several tens of milliseconds to render, so a short half-life makes each
// keyboard impulse die before the next visible frame.  Keep enough momentum to
// interpolate smoothly across those sparse frames while retaining a responsive
// stop after key release.
const NAVIGATION_DAMPING_HALF_LIFE_SECONDS: f64 = 0.18;
const NAVIGATION_TRANSLATION_GAIN: f64 = 17.5;
const NAVIGATION_ROTATION_GAIN: f64 = 5.0;
const NAVIGATION_ZOOM_RATE: f64 = 2.5;
const NAVIGATION_REFERENCE_FPS: f64 = 60.0;
const NAVIGATION_MAX_INPUT_DT_SECONDS: f64 = 0.5;

// Per-step precision from the amplified-bit count G_n. Clamped to [FLOOR, budget].
fn profile_precision(budget: usize, g_bits: f64) -> usize {
    let shed = (g_bits - PRECISION_MARGIN_BITS as f64).floor().max(0.0) as usize;
    budget
        .saturating_sub(shed)
        .max(PRECISION_FLOOR_BITS)
        .min(budget.max(PRECISION_FLOOR_BITS))
}

// Complex value in extended-exponent form: (x, y) · 2^e. Used to carry dZ_n/dC, whose
// magnitude reaches 2^P (far past f64 range) at depth, so a plain f64 would overflow.
#[derive(Clone, Copy)]
struct FExpC {
    x: f64,
    y: f64,
    e: i32,
}

impl FExpC {
    fn zero() -> Self {
        FExpC {
            x: 0.0,
            y: 0.0,
            e: 0,
        }
    }

    // Pull the mantissa back to O(1), folding the magnitude into the exponent.
    fn normalize(&mut self) {
        let m = self.x.hypot(self.y);
        if m == 0.0 || !m.is_finite() {
            if !m.is_finite() {
                // Saturate rather than propagate inf/NaN.
                self.x = 0.0;
                self.y = 0.0;
                self.e = i32::MAX / 2;
            }
            return;
        }
        let k = m.log2().floor() as i32;
        if k != 0 {
            let f = 2f64.powi(-k);
            self.x *= f;
            self.y *= f;
            self.e += k;
        }
    }

    // log2 of the magnitude (= G_n). Returns 0 for a zero derivative (start), so no bits shed.
    fn log2_mag(&self) -> f64 {
        let m = self.x.hypot(self.y);
        if m <= 0.0 {
            0.0
        } else {
            m.log2() + self.e as f64
        }
    }

    // der ← 2·Z·der + 1, with Z = (zx, zy) in plain f64 (the orbit value is O(1)).
    fn step(&mut self, zx: f64, zy: f64) {
        let two_zx = 2.0 * zx;
        let two_zy = 2.0 * zy;
        // 2·Z·der (complex), still at exponent self.e
        let mx = two_zx * self.x - two_zy * self.y;
        let my = two_zx * self.y + two_zy * self.x;
        let e = self.e;
        // + 1 (i.e. (1,0)·2^0): align to the larger exponent, the smaller term scaled by 2^-Δ.
        if e >= 0 {
            let d = e; // 0 − e is −e; scale the +1 term by 2^-e
            let f = if d > 1023 { 0.0 } else { 2f64.powi(-d) };
            self.x = mx + f;
            self.y = my;
            self.e = e;
        } else {
            let d = -e; // scale the (mx,my) term by 2^e = 2^-d into exponent 0
            let f = if d > 1023 { 0.0 } else { 2f64.powi(-d) };
            self.x = mx * f + 1.0;
            self.y = my * f;
            self.e = 0;
        }
        self.normalize();
    }

    fn one() -> Self {
        FExpC {
            x: 1.0,
            y: 0.0,
            e: 0,
        }
    }

    fn is_zero(&self) -> bool {
        self.x == 0.0 && self.y == 0.0
    }

    // self · other, exponents added. Both mantissas are O(1) after normalize, so
    // the product never leaves the f64 range whatever the magnitudes involved.
    fn mul(self, other: FExpC) -> Self {
        let mut out = FExpC {
            x: self.x * other.x - self.y * other.y,
            y: self.x * other.y + self.y * other.x,
            e: self.e.saturating_add(other.e),
        };
        out.normalize();
        out
    }

    // self + other, aligning the smaller exponent onto the larger one. A term
    // more than ~1023 octaves below the accumulator is dropped — it could not
    // change an f64 mantissa anyway.
    fn add(self, other: FExpC) -> Self {
        if other.is_zero() {
            return self;
        }
        if self.is_zero() {
            return other;
        }
        let (hi, lo) = if self.e >= other.e {
            (self, other)
        } else {
            (other, self)
        };
        let shift = hi.e - lo.e;
        let f = if shift > 1023 { 0.0 } else { 2f64.powi(-shift) };
        let mut out = FExpC {
            x: hi.x + lo.x * f,
            y: hi.y + lo.y * f,
            e: hi.e,
        };
        out.normalize();
        out
    }

    // 1/self = conj(self)/|self|², exponent negated. Zero maps to zero so the
    // caller can test for the degenerate case on the result.
    fn recip(self) -> Self {
        let n = self.x * self.x + self.y * self.y;
        if n == 0.0 || !n.is_finite() {
            return FExpC::zero();
        }
        let mut out = FExpC {
            x: self.x / n,
            y: -self.y / n,
            e: -self.e,
        };
        out.normalize();
        out
    }

    // Back to a pair of DBigs. The binary exponent is folded into a *decimal*
    // one so the string is exact in base 10 at any depth (|Λ| runs far below the
    // f64 floor); the mantissa keeps the f64's ~16 digits, five orders more than
    // a view framing can observe.
    fn to_dbig_pair(self) -> Option<(DBig, DBig)> {
        if self.is_zero() || !self.x.is_finite() || !self.y.is_finite() {
            return None;
        }
        let component = |m: f64| -> DBig {
            if m == 0.0 {
                return dbig_i(0);
            }
            let log10 = m.abs().log10() + self.e as f64 * LOG10_2;
            let exponent = log10.floor();
            let mantissa = 10f64.powf(log10 - exponent) * m.signum();
            DBig::from_str(&format!("{mantissa:.16}e{}", exponent as i64))
                .unwrap_or_else(|_| dbig_i(0))
        };
        Some((component(self.x), component(self.y)))
    }
}

// A DBig complex pair as one extended-exponent value. Goes through `dbig_frexp`
// (O(1) on the significand) rather than the decimal-string round trip, and keeps
// the two components on a common exponent so an orbit value many octaves below
// the f64 floor still contributes its mantissa instead of underflowing to zero.
fn dbig_pair_to_fexpc(zx: &DBig, zy: &DBig) -> FExpC {
    let (mx, ex) = dbig_frexp(zx);
    let (my, ey) = dbig_frexp(zy);
    let e = if mx == 0.0 {
        ey
    } else if my == 0.0 {
        ex
    } else {
        ex.max(ey)
    };
    let align = |m: f64, exp: i32| -> f64 {
        if m == 0.0 {
            return 0.0;
        }
        let shift = e - exp;
        if shift > 1023 {
            0.0
        } else {
            m * 2f64.powi(-shift)
        }
    };
    let mut out = FExpC {
        x: align(mx, ex),
        y: align(my, ey),
        e,
    };
    out.normalize();
    out
}

// −log10|v|, i.e. how many decimal digits below 1 the value sits. Used to size
// the Newton precision ladder from a step magnitude or a tolerance.
fn dbig_neg_log10(v: &DBig) -> f64 {
    let (m, e) = dbig_frexp(v);
    if m == 0.0 {
        return f64::INFINITY;
    }
    -(m.abs().log10() + e as f64 * LOG10_2)
}

// Raise a value's precision to `prec` bits when it carries fewer (or unlimited),
// but NEVER round a finite value down. Reducing precision on zoom-out would
// discard the reference center's hard-won deep digits, so zooming back in (or
// recentering at a shallower scale) would land on a corrupted center ("garbage").
// By-value form kept for the tests and censuses that build one-off operands; the
// per-frame paths use `raise_precision_in_place`.
#[allow(dead_code)]
pub(crate) fn raise_precision(v: DBig, prec: usize) -> DBig {
    let cur = v.precision();
    if cur == 0 || cur < prec {
        v.with_precision(prec).value()
    } else {
        v
    }
}

/// In-place variant for the per-frame path. `raise_precision` takes its operand
/// by value, so every call site had to `clone()` first — paying a full
/// significand copy even on the common no-op (precision already sufficient).
pub(crate) fn raise_precision_in_place(v: &mut DBig, prec: usize) {
    let cur = v.precision();
    if cur == 0 || cur < prec {
        let current = core::mem::replace(v, DBig::ZERO);
        *v = current.with_precision(prec).value();
    }
}

pub(crate) fn dbig_i(value: i32) -> DBig {
    DBig::try_from(value).unwrap()
}

/// Exact-ish DBig from an f64 shape factor (aspect, fill, orientation cosines).
/// Goes through the decimal string so the value keeps the f64's 17 significant
/// digits — plenty for a framing coefficient, and it never panics.
fn dbig_f64(value: f64) -> DBig {
    if !value.is_finite() {
        return dbig_i(0);
    }
    DBig::from_str(&format!("{value:.17e}")).unwrap_or_else(|_| dbig_i(0))
}

// BLA/Padé block-table sizing.
// L_min = 4: drop the 1- and 2-step levels ("merge and cull"). Over the first
// steps from the origin the result can be dominated by z² (at C = −1/2 two steps
// give exactly c²), which a linear/rational block cannot represent — Guard 2.
// Smallest emitted block is therefore 4; shorter spans stay exact.
const BLA_SKIP_LEVELS: usize = 2;
const MIN_BLA_SKIP: usize = 1 << BLA_SKIP_LEVELS;

#[cfg(target_arch = "wasm32")]
fn exp_f64(value: f64) -> f64 {
    js_sys::Math::exp(value)
}

#[cfg(not(target_arch = "wasm32"))]
fn exp_f64(value: f64) -> f64 {
    value.exp()
}

#[cfg(target_arch = "wasm32")]
fn ln_f64(value: f64) -> f64 {
    js_sys::Math::log(value)
}

#[cfg(not(target_arch = "wasm32"))]
fn ln_f64(value: f64) -> f64 {
    value.ln()
}

const LOG2_10: f64 = 3.321928094887362;
const LOG10_2: f64 = 0.30102999566398120;

// Extended-exponent decomposition of a DBig: value ≈ mantissa · 2^exponent, |mantissa| ∈
// [0.5, 1). Computed in O(1) by reading only the top ~53 bits of the significand and its base-10
// exponent — independent of the navigator's precision, and with no decimal-string round-trip
// (the per-frame cost that made rendering scale with the precision budget). Mirrors the host
// frexpFromDecimalString in src/floatexp.ts so the shader's deep path is unchanged.
fn dbig_frexp(v: &DBig) -> (f64, i32) {
    let repr = v.repr();
    let exp10 = repr.exponent(); // value = significand · 10^exp10
                                 // Magnitude of the significand (UBig); sign is taken from v directly to avoid naming the
                                 // dashu Sign type (not re-exported by dashu-float).
    let (_, mag) = repr.significand().clone().into_parts();
    if mag == UBig::from(0u8) {
        return (0.0, 0); // value is exactly zero
    }
    // floor(log2(|significand|)) = bit length − 1 (ilog base 2 is exact).
    let e2 = mag.ilog(&UBig::from(2u8));
    let (top, extra) = if e2 >= 53 {
        let sh = e2 - 52; // leaves the top 53 bits
        let shifted = &mag >> sh; // < 2^53, exact in f64
        (u64::try_from(&shifted).unwrap_or(0) as f64, sh as f64)
    } else {
        (u64::try_from(&mag).unwrap_or(0) as f64, 0.0)
    };
    // log2(value) = log2(|significand|) + exp10·log2(10)
    let log2v = (ln_f64(top) * core::f64::consts::LOG2_E) + extra + (exp10 as f64) * LOG2_10;
    let exponent = log2v.floor();
    let frac = log2v - exponent;
    // mantissa = 2^frac · 0.5 ∈ [0.5, 1)
    let mut mantissa = exp_f64(frac * core::f64::consts::LN_2) * 0.5;
    let exp_out = exponent as i32 + 1;
    if *v < DBig::try_from(0).unwrap() {
        mantissa = -mantissa;
    }
    (mantissa, exp_out)
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[repr(C)]
#[derive(Copy, Clone, Debug, PartialEq)]
pub struct MandelbrotStep {
    pub zx: f32,
    pub zy: f32,
    // Padding to keep the 16-byte stride the GPU orbit buffer expects; the shader
    // reads only zx/zy. These slots previously held the orbit derivative, then a
    // double-float low word of z_n — both unused by the shaders, so inert padding.
    pub pad0: f32,
    pub pad1: f32,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[repr(u32)]
#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub enum ApproximationMode {
    Perturbation = 0,
    BivariateLinear = 1,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[repr(C)]
#[derive(Copy, Clone, Debug, PartialEq)]
pub struct BlaStep {
    // BLA coefficients in extended-exponent (floatexp) form, so the deep path can
    // use them: `a` and `b` grow at the same rate (~product of derivatives) and
    // share one base-2 exponent; the validity radius `alpha` shrinks far below
    // f32 and carries its own; `beta` stays O(1).
    pub ax: f32, // a = (ax, ay) · 2^ab_exp
    pub ay: f32,
    pub bx: f32, // b = (bx, by) · 2^ab_exp
    pub by: f32,
    pub ab_exp: i32,
    pub radius_alpha: f32, // alpha = radius_alpha · 2^alpha_exp
    pub alpha_exp: i32,
    pub radius_beta: f32,
}

/// Floats per `BlaStep` as laid out in linear memory. The reference worker
/// reads the table straight from WASM memory with a hard-coded stride, so it
/// checks this against its own constant: a stale `pkg/` build (struct changed,
/// `wasm-pack build` not rerun) would otherwise hand the GPU a shifted table.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub fn bla_step_floats() -> u32 {
    (std::mem::size_of::<BlaStep>() / std::mem::size_of::<f32>()) as u32
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[repr(C)]
#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub struct BlaLevel {
    pub offset: u32,
    pub count: u32,
    pub skip: u32,
    /// Largest radius_alpha among this level's entries, stored as f32 bits.
    /// Lets the shader reject a whole level (or the whole table) from |dz|
    /// alone, before fetching any BlaStep entry.
    pub max_radius_bits: u32,
}

#[derive(Clone)]
pub struct Mandelbrot {
    pub cx: DBig,
    pub cy: DBig,
    pub scale: DBig,
    pub angle: DBig,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub struct MandelbrotNavigator {
    cx: DBig,
    cy: DBig,
    cx_continuous: DBig,
    cy_continuous: DBig,
    reference_cx: DBig,
    reference_cy: DBig,
    scale: DBig,
    angle: f64,
    result: Box<Vec<MandelbrotStep>>, // Vecteur pré-alloué
    last_iter: usize,                 // Dernière itération calculée
    previous_c: (DBig, DBig),         // Dernier C vu
    last_zx: DBig,
    last_zy: DBig,
    // Running orbit derivative dZ_n/dC in extended-exponent form, carried across incremental
    // chunks alongside last_zx/last_zy. Drives the descending precision profile (G_n = log2|der|).
    last_der: FExpC,
    approximation_mode: ApproximationMode,
    // Fixed precision budget in bits: P = precision_bits_for_scale(target) chosen ahead of
    // time (a max zoom depth), held constant across interactive navigation. Drives
    // ensure_precision and the reference-orbit descending profile. Changing it (set_precision_
    // budget) triggers a full reference recompute. See the fix-reference-precision-budget change.
    budget_prec: usize,
    bla_epsilon: f32,
    /// Viewport aspect ratio (width/height) from the host, used to frame a
    /// minibrot. NaN (unset) keeps the legacy 4×scale margin.
    viewport_aspect: f64,
    // Largest single block jump emitted into the table (power-of-two cap). UI-tunable;
    // clamped to a power of two in [MIN_BLA_SKIP, 1<<20].
    max_bla_skip: usize,
    bla_result: Box<Vec<BlaStep>>,
    bla_levels: Box<Vec<BlaLevel>>,
    bla_level_count: usize,
    bla_source_len: usize,
    bla_source_epsilon: f32,
    // Ajout des vitesses pour l'animation
    vscale: DBig,
    vangle: f64,
    // Ajout des vitesses pour translation
    vtx: DBig,
    vty: DBig,
    last_step_time: Option<f64>, // timestamp en ms

    // Champs de transition/voyage
    transition_start_cx: Option<DBig>,
    transition_start_cy: Option<DBig>,
    transition_start_scale: Option<DBig>,
    transition_start_angle: Option<f64>,
    transition_target_cx: Option<DBig>,
    transition_target_cy: Option<DBig>,
    transition_target_scale: Option<DBig>,
    transition_target_angle: Option<f64>,
    transition_duration: f64,
    transition_elapsed: f64,
    transition_export_linear: bool,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
impl MandelbrotNavigator {
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen(constructor))]
    pub fn new(cx: &str, cy: &str, scale: &str, angle: f64) -> MandelbrotNavigator {
        let zero = DBig::from_str("0").unwrap();
        let cx = DBig::from_str(cx).unwrap();
        let cy = DBig::from_str(cy).unwrap();
        let scale = DBig::from_str(scale).unwrap();

        let mut navigator = MandelbrotNavigator {
            reference_cx: cx.clone(),
            reference_cy: cy.clone(),
            cx: cx.clone(),
            cy: cy.clone(),
            cx_continuous: cx.clone(),
            cy_continuous: cy.clone(),
            scale,
            angle,
            result: Box::new(Vec::with_capacity(10_000)),
            last_iter: 0,
            previous_c: (cx.clone(), cy.clone()),
            last_zx: zero.clone(),
            last_zy: zero.clone(),
            last_der: FExpC::zero(),
            approximation_mode: ApproximationMode::Perturbation,
            budget_prec: DEFAULT_BUDGET_BITS,
            bla_epsilon: 1e-6,
            viewport_aspect: f64::NAN,
            max_bla_skip: 65536,
            bla_result: Box::new(Vec::with_capacity(20_000)),
            bla_levels: Box::new(Vec::with_capacity(32)),
            bla_level_count: 0,
            bla_source_len: 0,
            bla_source_epsilon: 0.0,
            vscale: DBig::try_from(1).unwrap(),
            vangle: 0.0,
            vtx: zero.clone(),
            vty: zero.clone(),
            last_step_time: None,
            transition_start_cx: None,
            transition_start_cy: None,
            transition_start_scale: None,
            transition_start_angle: None,
            transition_target_cx: None,
            transition_target_cy: None,
            transition_target_scale: None,
            transition_target_angle: None,
            transition_duration: 0.0,
            transition_elapsed: 0.0,
            transition_export_linear: false,
        };
        // A fresh navigator implies its construction scale as a depth floor (a deep preset
        // reset arrives here at its deep scale); default to at least the 1e-30 budget.
        navigator.budget_prec = precision_bits_for_scale(&navigator.scale).max(DEFAULT_BUDGET_BITS);
        navigator.ensure_precision();
        navigator
    }

    /// Set the fixed precision budget from a target scale string (e.g. "1e-300"), the maximum
    /// zoom depth navigation should stay precise at. Recomputes the budget and forces a full
    /// reference recompute (reset_reference_to) so the orbit is rebuilt at the new profile —
    /// an assumed design choice, not a per-frame cost.
    pub fn set_precision_budget(&mut self, target_scale: &str) {
        let target = DBig::from_str(target_scale).unwrap_or_else(|_| DBig::try_from(1).unwrap());
        // Floor at the current view-scale depth: a deep preset must render correctly at load
        // even if the slider budget is shallow. The slider only adds headroom for zooming
        // deeper than the load scale without a recompute; zooming past the budget then degrades.
        let prec = precision_bits_for_scale(&target)
            .max(precision_bits_for_scale(&self.scale))
            .max(DEFAULT_BUDGET_BITS);
        if prec == self.budget_prec {
            return;
        }
        self.budget_prec = prec;
        self.ensure_precision();
        // Full recompute: drop the orbit so it rebuilds at the new budget from iteration 0.
        let (cx, cy) = (self.reference_cx.clone(), self.reference_cy.clone());
        self.reset_reference_to(cx, cy);
    }

    // Raise the precision of the navigation state to match the current zoom
    // depth, so accumulation (cx += delta·scale, scale *= factor, …) keeps enough
    // significant digits. with_precision sets the precision bound without losing
    // the value; subsequent ops then accumulate digits down to the scale instead
    // of being rounded to a fixed budget (the cause of the deep precision cliff).
    fn ensure_precision(&mut self) {
        // Precision is the LARGER of the current-view need and the fixed budget. The worker
        // navigator carries a deep budget, so `max(view, deep) = deep` → its reference centre C
        // and navigation state (read by period detection / Newton nucleus) stay at the full
        // budget P at any zoom. The shared FRONT navigator keeps a modest default budget, so it
        // tracks the view — its per-frame coordinate strings stay view-length, never the deep
        // budget (which would make per-frame DBig→string serialization cost ∝ budget).
        let prec = precision_bits_for_scale(&self.scale)
            .max(self.budget_prec)
            .max(64);
        raise_precision_in_place(&mut self.cx, prec);
        raise_precision_in_place(&mut self.cy, prec);
        raise_precision_in_place(&mut self.cx_continuous, prec);
        raise_precision_in_place(&mut self.cy_continuous, prec);
        raise_precision_in_place(&mut self.scale, prec);
        raise_precision_in_place(&mut self.reference_cx, prec);
        raise_precision_in_place(&mut self.reference_cy, prec);
        raise_precision_in_place(&mut self.vtx, prec);
        raise_precision_in_place(&mut self.vty, prec);
        // vscale is dimensionless controller state. Keeping it at input/f64
        // precision avoids making the per-frame zoom factor depend on the deep
        // coordinate budget; only the resulting scale needs arbitrary precision.
    }

    pub fn translate(&mut self, dx: f64, dy: f64) {
        self.ensure_precision();
        // dx/dy sont des valeurs entre 0 et 1 (écran)
        // On convertit en déplacement complexe selon l'échelle et l'angle
        let angle = self.angle;
        let cos_a = DBig::from_str(&angle.cos().to_string()).unwrap();
        let sin_a = DBig::from_str(&angle.sin().to_string()).unwrap();
        let dx_big = DBig::from_str(&(dx * NAVIGATION_TRANSLATION_GAIN).to_string()).unwrap();
        let dy_big = DBig::from_str(&(dy * NAVIGATION_TRANSLATION_GAIN).to_string()).unwrap();
        let scale = &self.scale;
        let delta_x = (&dx_big * &cos_a - &dy_big * &sin_a) * scale;
        let delta_y = (&dx_big * &sin_a + &dy_big * &cos_a) * scale;
        self.vtx = &self.vtx + delta_x;
        self.vty = &self.vty + delta_y;
    }

    pub fn rotate(&mut self, delta_angle: f64) {
        // On ajoute à la vitesse angulaire
        self.vangle += delta_angle * NAVIGATION_ROTATION_GAIN;
    }

    pub fn translate_direct(
        &mut self,
        dx: f64,
        dy: f64,
        canvas_width: Option<f64>,
        canvas_height: Option<f64>,
    ) {
        self.ensure_precision();
        // Applique le déplacement immédiatement
        let angle = self.angle;
        let cos_a = DBig::from_str(&angle.cos().to_string()).unwrap();
        let sin_a = DBig::from_str(&angle.sin().to_string()).unwrap();
        let dx_big = DBig::from_str(&dx.to_string()).unwrap();
        let dy_big = DBig::from_str(&dy.to_string()).unwrap();
        let scale = &self.scale;
        let delta_x = (&dx_big * &cos_a - &dy_big * &sin_a) * scale;
        let delta_y = (&dx_big * &sin_a + &dy_big * &cos_a) * scale;

        self.cx_continuous = &self.cx_continuous + delta_x;
        self.cy_continuous = &self.cy_continuous + delta_y;

        if let (Some(w), Some(h)) = (canvas_width, canvas_height) {
            let aspect = w / h;
            let neutral_extent = (aspect * aspect + 1.0).sqrt();
            let tex_size = (w * w + h * h).sqrt().ceil();

            let dcx = &self.cx_continuous - &self.reference_cx;
            let dcy = &self.cy_continuous - &self.reference_cy;

            let rx_big = &dcx / scale;
            let ry_big = &dcy / scale;

            let rx = dbig_to_f64(&rx_big);
            let ry = dbig_to_f64(&ry_big);

            let cos_a_f64 = angle.cos();
            let sin_a_f64 = angle.sin();

            let px_factor = tex_size / (2.0 * neutral_extent);
            let dpx = (cos_a_f64 * rx + sin_a_f64 * ry) * px_factor;
            let dpy = (sin_a_f64 * rx - cos_a_f64 * ry) * px_factor;

            let rounded_dpx = dpx.round();
            let rounded_dpy = dpy.round();

            let factor = 2.0 * neutral_extent / tex_size;
            let snapped_rx = (cos_a_f64 * rounded_dpx + sin_a_f64 * rounded_dpy) * factor;
            let snapped_ry = (sin_a_f64 * rounded_dpx - cos_a_f64 * rounded_dpy) * factor;

            let snapped_rx_big = DBig::from_str(&snapped_rx.to_string())
                .unwrap_or_else(|_| DBig::try_from(0).unwrap());
            let snapped_ry_big = DBig::from_str(&snapped_ry.to_string())
                .unwrap_or_else(|_| DBig::try_from(0).unwrap());

            self.cx = &self.reference_cx + &snapped_rx_big * scale;
            self.cy = &self.reference_cy + &snapped_ry_big * scale;
            // Sync cx_continuous so subsequent steps start from an exact pixel boundary.
            self.cx_continuous = self.cx.clone();
            self.cy_continuous = self.cy.clone();
        } else {
            self.cx = self.cx_continuous.clone();
            self.cy = self.cy_continuous.clone();
        }

        self.vtx = DBig::from_str("0").unwrap();
        self.vty = DBig::from_str("0").unwrap();
    }

    pub fn rotate_direct(&mut self, delta_angle: f64) {
        self.angle += delta_angle;
        self.vangle = 0.0;
    }

    // The BLA table cache key is (orbit_len, epsilon) — see the cache-hit
    // check in compute_bla_reference_inner. Mode switches therefore never need
    // to invalidate anything: the table is reused across Perturbation ⇄ BLA.
    pub fn use_perturbation(&mut self) {
        self.approximation_mode = ApproximationMode::Perturbation;
    }

    pub fn use_bla(&mut self) {
        self.approximation_mode = ApproximationMode::BivariateLinear;
    }

    pub fn get_approximation_mode(&self) -> ApproximationMode {
        self.approximation_mode
    }

    pub fn set_bla_epsilon(&mut self, epsilon: f32) {
        let next = epsilon.max(f32::MIN_POSITIVE);
        if (next - self.bla_epsilon).abs() > f32::EPSILON {
            self.bla_source_len = 0;
            self.bla_level_count = 0;
        }
        self.bla_epsilon = next;
    }

    pub fn get_bla_epsilon(&self) -> f32 {
        self.bla_epsilon
    }

    pub fn set_max_bla_skip(&mut self, max_skip: u32) {
        // Clamp to a power of two in [MIN_BLA_SKIP=2, 1<<18]; the table levels are
        // powers of two, so a non-power cap would just round down anyway. Upper cap 2^18
        // bounds the f32 reference-orbit noise (design D6).
        let clamped = (max_skip as usize).clamp(2, 1 << 18).next_power_of_two();
        if clamped != self.max_bla_skip {
            self.bla_source_len = 0;
            self.bla_level_count = 0;
        }
        self.max_bla_skip = clamped;
    }

    pub fn get_max_bla_skip(&self) -> u32 {
        self.max_bla_skip as u32
    }

    /// Auto block-size bound (no magic constant). Size the merge table to the
    /// LARGEST block the reference orbit can support — `p* = ⌈log₂ L_max⌉` levels
    /// with `L_max` bounded by the orbit length — not to some "typical useful"
    /// length. The earlier `log₂ log₂(√ε/|c|)` heuristic (~9 levels, blocks ≤512)
    /// needlessly throttled long blocks in smooth deep regions; the per-block
    /// validity tests (radius / (H2) / (G)) already gate which blocks are usable,
    /// and the extra levels are almost free (entry counts halve each level, so the
    /// table stays ~orbit/2 entries regardless). This is what Fraktaler-3 et al do.
    /// The build's own `skip*2 < orbit_len` guard then caps levels at the orbit.
    fn auto_max_skip(orbit_len: usize) -> usize {
        // Upper cap 2^18 (was 2^24): bounds the longest emitted block length L so the f32
        // reference-orbit noise (√L·1e-7 ≈ 5e-5 at L=2^18) stays ~×20 under the default
        // blaEpsilon, keeping it masked (fix-reference-precision-budget, design D6).
        orbit_len.next_power_of_two().clamp(MIN_BLA_SKIP, 1 << 18)
    }

    pub fn zoom(&mut self, factor: f64) {
        // Accumulate zoom velocity (multiplicative — neutral value is 1.0)
        let factor_big = DBig::from_str(factor.to_string().as_str()).unwrap();
        self.vscale = &self.vscale * factor_big;
    }

    pub fn step(&mut self, canvas_width: Option<f64>, canvas_height: Option<f64>) -> Vec<String> {
        let delta_time = self.take_step_delta_time();
        self.step_with_delta_time(canvas_width, canvas_height, delta_time)
    }

    /// Place the running transition at an ABSOLUTE elapsed time and step once,
    /// bypassing the wall clock entirely. This is the deterministic entry point
    /// used by video export: frame `n` passes `n / fps`, so the camera depends
    /// only on the frame index and never on how long a frame took to converge.
    ///
    /// Absolute rather than incremental on purpose. Accumulating `1/fps` per
    /// frame does not reliably reach `duration`: at 30 fps over 0.5 s the sum of
    /// fifteen steps is 0.49999999999999994, so the transition never completes
    /// and the final frame stops short of B. Re-deriving the elapsed time from
    /// the frame index each call removes the accumulation entirely, and the
    /// clamp below makes the last frame land on `duration` exactly.
    ///
    /// Deliberately separate from `step_with_delta_time`: `step` and
    /// `step_with_input` must keep passing their raw wall-clock delta through
    /// unclamped, so the real-time feel is untouched.
    ///
    /// A non-finite elapsed time is treated as 0 rather than poisoning
    /// `transition_elapsed` with a NaN that no later call could recover from.
    pub fn step_at_transition_time(
        &mut self,
        canvas_width: Option<f64>,
        canvas_height: Option<f64>,
        elapsed_seconds: f64,
    ) -> Vec<String> {
        let elapsed = if elapsed_seconds.is_finite() && elapsed_seconds > 0.0 {
            elapsed_seconds.min(self.transition_duration)
        } else {
            0.0
        };
        if self.is_in_transition() {
            self.transition_elapsed = elapsed;
        }
        // Keep the wall-clock baseline out of the way, so a later `step()`
        // (returning to real time) measures from its own next call rather than
        // charging the whole export duration to its first frame.
        self.reset_step_clock();
        self.step_with_delta_time(canvas_width, canvas_height, 0.0)
    }

    /// Forget the last wall-clock sample so the next `step()` restarts its delta
    /// measurement from the following call.
    pub fn reset_step_clock(&mut self) {
        self.last_step_time = None;
    }

    /// Advance one rendered frame while treating held keyboard controls as a
    /// continuous input. Values are expressed in legacy 60 Hz frame units so
    /// the existing feel is preserved at 60 fps and normalized elsewhere.
    pub fn step_with_input(
        &mut self,
        translate_x: f64,
        translate_y: f64,
        rotation: f64,
        zoom_factor: f64,
        canvas_width: Option<f64>,
        canvas_height: Option<f64>,
    ) -> Vec<String> {
        let delta_time = self.take_step_delta_time();
        let input_delta_time = delta_time.clamp(0.0, NAVIGATION_MAX_INPUT_DT_SECONDS);
        let frame_units = input_delta_time * NAVIGATION_REFERENCE_FPS;

        if frame_units > 0.0 {
            if translate_x != 0.0 || translate_y != 0.0 {
                self.translate(translate_x * frame_units, translate_y * frame_units);
            }
            if rotation != 0.0 {
                self.rotate(rotation * frame_units);
            }
            if zoom_factor.is_finite() && zoom_factor > 0.0 && zoom_factor != 1.0 {
                let timed_zoom_factor = zoom_factor.powf(frame_units);
                if timed_zoom_factor.is_finite() && timed_zoom_factor > 0.0 {
                    self.zoom(timed_zoom_factor);
                }
            }
        }

        self.step_with_delta_time(canvas_width, canvas_height, delta_time)
    }

    fn take_step_delta_time(&mut self) -> f64 {
        #[cfg(target_arch = "wasm32")]
        let now = js_sys::Date::now();
        #[cfg(not(target_arch = "wasm32"))]
        let now = {
            use std::time::{SystemTime, UNIX_EPOCH};
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis() as f64
        };

        let delta_time = if let Some(last) = self.last_step_time {
            (now - last) / 1000.0
        } else {
            1.0 / NAVIGATION_REFERENCE_FPS
        };
        self.last_step_time = Some(now);
        delta_time
    }

    fn step_with_delta_time(
        &mut self,
        canvas_width: Option<f64>,
        canvas_height: Option<f64>,
        delta_time: f64,
    ) -> Vec<String> {
        // Si une transition/voyage est en cours, on effectue l'interpolation
        if let (
            Some(start_cx),
            Some(start_cy),
            Some(start_scale),
            Some(start_angle),
            Some(target_cx),
            Some(target_cy),
            Some(target_scale),
            Some(target_angle),
        ) = (
            self.transition_start_cx.as_ref(),
            self.transition_start_cy.as_ref(),
            self.transition_start_scale.as_ref(),
            self.transition_start_angle.as_ref(),
            self.transition_target_cx.as_ref(),
            self.transition_target_cy.as_ref(),
            self.transition_target_scale.as_ref(),
            self.transition_target_angle.as_ref(),
        ) {
            self.transition_elapsed += delta_time;
            let t = self.transition_elapsed / self.transition_duration;
            if t >= 1.0 {
                self.cx = target_cx.clone();
                self.cy = target_cy.clone();
                self.cx_continuous = target_cx.clone();
                self.cy_continuous = target_cy.clone();
                self.scale = target_scale.clone();
                self.angle = *target_angle;

                // Fin de la transition
                self.transition_start_cx = None;
                self.transition_start_cy = None;
                self.transition_start_scale = None;
                self.transition_start_angle = None;
                self.transition_target_cx = None;
                self.transition_target_cy = None;
                self.transition_target_scale = None;
                self.transition_target_angle = None;
            } else {
                // Easing cubique ease-in-out : t * t * (3 - 2 * t)
                let t_eased = if self.transition_export_linear {
                    t
                } else {
                    t * t * (3.0 - 2.0 * t)
                };

                // Interpolation exponentielle pour l'échelle (scale)
                let ratio = target_scale / start_scale;
                let ratio_f64 = dbig_to_f64(&ratio);
                let factor_big = if self.transition_export_linear
                    && (!ratio_f64.is_finite() || ratio_f64 < f64::MIN_POSITIVE)
                {
                    // Split exponent from mantissa: e+10 -> e-1000 must never
                    // become a zero/infinite f64 ratio between export frames.
                    let log_factor = -dbig_neg_log10(&ratio) * t_eased;
                    let exponent = log_factor.floor();
                    let mantissa = 10f64.powf(log_factor - exponent);
                    DBig::from_str(&format!("{}e{}", mantissa, exponent as i64))
                        .unwrap_or(DBig::ONE)
                } else {
                    DBig::from_str(&ratio_f64.powf(t_eased).to_string()).unwrap_or(DBig::ONE)
                };
                self.scale = start_scale * &factor_big;

                // Pour la position (cx, cy), afin d'avoir une vitesse visuelle de translation uniforme,
                // on interpole linéairement par rapport au SCALE (qui évolue exponentiellement) plutôt qu'au temps.
                let t_pos_big = if (ratio_f64 - 1.0).abs() < 1e-6 {
                    DBig::from_str(&t_eased.to_string())
                        .unwrap_or_else(|_| DBig::try_from(0).unwrap())
                } else {
                    (&self.scale - start_scale) / (target_scale - start_scale)
                };
                let one_minus_t_pos = &DBig::try_from(1).unwrap() - &t_pos_big;

                // Interpolation pour cx et cy, pondérée par l'évolution de l'échelle
                self.cx_continuous = start_cx * &one_minus_t_pos + target_cx * &t_pos_big;
                self.cy_continuous = start_cy * &one_minus_t_pos + target_cy * &t_pos_big;
                self.cx = self.cx_continuous.clone();
                self.cy = self.cy_continuous.clone();

                // Interpolation linéaire pour l'angle
                self.angle = start_angle * (1.0 - t_eased) + target_angle * t_eased;
            }
        } else {
            // Animation translation avec vitesse et damping (manuel)
            let damping_base = exp_f64(
                -std::f64::consts::LN_2 * delta_time / NAVIGATION_DAMPING_HALF_LIFE_SECONDS,
            );
            let damping = DBig::from_str(&damping_base.to_string()).unwrap();

            // On anime l'échelle avec la vitesse et damping
            let one = dbig_i(1);
            if self.vscale != one {
                if delta_time > 0.0 {
                    // vscale is a dimensionless input velocity. Computing this
                    // tiny per-frame factor at the view's DBig precision used to
                    // run exp(y * ln(x)) on the main thread and made zoom cost
                    // grow with depth. Apply an f64 factor to the precise scale;
                    // Dashu multiplication retains the larger (scale) precision.
                    let velocity = dbig_to_f64(&self.vscale);
                    let factor = velocity.powf(delta_time * NAVIGATION_ZOOM_RATE);
                    if factor.is_finite() && factor > 0.0 {
                        let factor_big =
                            DBig::from_str(&factor.to_string()).unwrap_or_else(|_| one.clone());
                        self.scale = &self.scale * &factor_big;
                    }
                }
                self.vscale = &one + ((&self.vscale - &one) * &damping);

                // si vsclale plus petit que 0.5 ou plus grand que 2, on le clamp à 0.5 ou 2 pour éviter les valeurs extrêmes
                let upper = dbig_f64(2.0);
                let lower = dbig_f64(0.5);
                if self.vscale > upper {
                    self.vscale = upper;
                } else if self.vscale < lower {
                    self.vscale = lower;
                }

                let vscale_abs = self.vscale.clone().abs();
                if vscale_abs > dbig_f64(0.999) && vscale_abs < dbig_f64(1.001) {
                    self.vscale = one;
                }
            }

            let epsilon = &self.scale * dbig_f64(1e-6);

            // Rendre damping dépendant du temps
            let k = std::f64::consts::LN_2 / NAVIGATION_DAMPING_HALF_LIFE_SECONDS;
            let displacement_factor_f64 = (1.0 - damping_base) / k;
            let displacement_factor = DBig::from_str(&displacement_factor_f64.to_string()).unwrap();

            // Anti-teleport guard: one frame must never move the centre by more
            // than a view half-height, whatever the frame interval.
            // The previous test squared an ALREADY squared norm (`.sqr()` applied
            // to vtx² + vty²) and compared |v|⁴ against 2·scale, so it fired at
            // |v| > (2·scale)^¼ — inside the normal velocity range when shallow,
            // and never at depth (at scale 1e-28 that threshold is ~1e21·scale).
            // Comparing squares keeps the test itself free of a square root; the
            // rare rescale pays for one.
            let speed_sq = &self.vtx * &self.vtx + &self.vty * &self.vty;
            // Both divisions below are guarded: a zero scale or a zero frame
            // interval would panic the navigator inside the per-frame path.
            if speed_sq > dbig_i(0) && displacement_factor_f64 > 0.0 && self.scale > dbig_i(0) {
                let max_speed_sq = (&self.scale / &displacement_factor).sqr();
                if speed_sq > max_speed_sq {
                    let factor = (&speed_sq / &max_speed_sq).sqrt();
                    self.vtx = &self.vtx / &factor;
                    self.vty = &self.vty / &factor;
                }
            }

            self.cx_continuous = &self.cx_continuous + &self.vtx * &displacement_factor;
            self.cy_continuous = &self.cy_continuous + &self.vty * &displacement_factor;
            self.cx = self.cx_continuous.clone();
            self.cy = self.cy_continuous.clone();

            self.vtx = &self.vtx * &damping;
            self.vty = &self.vty * &damping;

            if self.vtx.clone().abs() < epsilon {
                self.vtx = DBig::try_from(0).unwrap();
            }
            if self.vty.clone().abs() < epsilon {
                self.vty = DBig::try_from(0).unwrap();
            }

            // On anime l'angle avec la vitesse angulaire et damping
            self.angle += self.vangle * delta_time;
            self.vangle *= damping_base;
            if self.vangle.abs() < 0.005 {
                self.vangle = 0.0;
            }
        }

        if let (Some(w), Some(h)) = (canvas_width, canvas_height) {
            let is_zooming = if let (Some(start_scale), Some(target_scale)) =
                (&self.transition_start_scale, &self.transition_target_scale)
            {
                start_scale != target_scale
            } else {
                self.vscale != DBig::try_from(1).unwrap()
            };

            if !is_zooming {
                let aspect = w / h;
                let neutral_extent = (aspect * aspect + 1.0).sqrt();
                let tex_size = (w * w + h * h).sqrt().ceil();

                let dcx = &self.cx_continuous - &self.reference_cx;
                let dcy = &self.cy_continuous - &self.reference_cy;

                let rx_big = &dcx / &self.scale;
                let ry_big = &dcy / &self.scale;

                let rx = dbig_to_f64(&rx_big);
                let ry = dbig_to_f64(&ry_big);

                let cos_a_f64 = self.angle.cos();
                let sin_a_f64 = self.angle.sin();

                let px_factor = tex_size / (2.0 * neutral_extent);
                let dpx = (cos_a_f64 * rx + sin_a_f64 * ry) * px_factor;
                let dpy = (sin_a_f64 * rx - cos_a_f64 * ry) * px_factor;

                let rounded_dpx = dpx.round();
                let rounded_dpy = dpy.round();

                let factor = 2.0 * neutral_extent / tex_size;
                let snapped_rx = (cos_a_f64 * rounded_dpx + sin_a_f64 * rounded_dpy) * factor;
                let snapped_ry = (sin_a_f64 * rounded_dpx - cos_a_f64 * rounded_dpy) * factor;

                let snapped_rx_big = DBig::from_str(&snapped_rx.to_string())
                    .unwrap_or_else(|_| DBig::try_from(0).unwrap());
                let snapped_ry_big = DBig::from_str(&snapped_ry.to_string())
                    .unwrap_or_else(|_| DBig::try_from(0).unwrap());

                self.cx = &self.reference_cx + &snapped_rx_big * &self.scale;
                self.cy = &self.reference_cy + &snapped_ry_big * &self.scale;
                // Keep cx_continuous in sync with the snapped position so that
                // sub-pixel drift doesn't accumulate across frames.  Without
                // this, the sub-pixel fraction in cx_continuous causes the
                // first step after a rest to snap to the wrong pixel, producing
                // a 1-pixel misalignment at the very start of each translation.
                self.cx_continuous = self.cx.clone();
                self.cy_continuous = self.cy.clone();
            } else {
                self.cx = self.cx_continuous.clone();
                self.cy = self.cy_continuous.clone();
            }
        } else {
            self.cx = self.cx_continuous.clone();
            self.cy = self.cy_continuous.clone();
        }

        // Keep the precision in step with the (now updated) zoom depth so the
        // reference center retains enough digits as the view deepens.
        self.ensure_precision();

        // Calcul du delta par rapport à la référence
        let delta_x = &self.cx - &self.reference_cx;
        let delta_y = &self.cy - &self.reference_cy;

        // Conversion sûre en f64 en utilisant la fonction utilitaire
        vec![delta_x.to_string(), delta_y.to_string()]
    }

    pub fn get_params(&self) -> Vec<String> {
        vec![
            self.cx.to_string(),
            self.cy.to_string(),
            self.scale.to_string(),
            self.angle.to_string(),
        ]
    }

    /// Per-frame float-exponent decomposition of the values the render path needs — scale and
    /// the reference-relative offset (dx, dy) — as `[scaleM, scaleE, dxM, dxE, dyM, dyE]`
    /// (value = mantissa · 2^exponent). Done here, in O(1), instead of `get_params`/`step`
    /// returning decimal strings the host re-parses every frame: that round-trip's cost grew
    /// with the precision and is what made the framerate scale with the budget.
    pub fn view_floatexp(&self) -> Vec<f64> {
        let (sm, se) = dbig_frexp(&self.scale);
        let dx = &self.cx - &self.reference_cx;
        let dy = &self.cy - &self.reference_cy;
        let (dxm, dxe) = dbig_frexp(&dx);
        let (dym, dye) = dbig_frexp(&dy);
        vec![sm, se as f64, dxm, dxe as f64, dym, dye as f64]
    }

    pub fn get_reference_params(&self) -> Vec<String> {
        vec![self.reference_cx.to_string(), self.reference_cy.to_string()]
    }

    pub fn reference_origin(&mut self, cx: &str, cy: &str) {
        self.reset_reference_to(DBig::from_str(cx).unwrap(), DBig::from_str(cy).unwrap());
    }

    /// Retourne un tuple (ptr, offset, count) pour accès direct JS
    pub fn compute_reference_orbit_ptr(&mut self, max_iter: u32) -> OrbitBufferInfo {
        self.compute_reference_orbit_inner(max_iter as usize)
    }

    /// Compute at most `chunk_size` additional orbit steps, up to `max_iter` total.
    /// Returns early once the chunk is done, allowing the caller to yield to the
    /// browser between chunks for responsive rendering.
    pub fn compute_reference_orbit_chunk(
        &mut self,
        chunk_size: u32,
        max_iter: u32,
    ) -> OrbitBufferInfo {
        // Cap iteration target to last_iter + chunk_size so we only do a bounded
        // amount of work, while still respecting the global max_iter ceiling.
        let target = (self.last_iter + chunk_size as usize).min(max_iter as usize);
        self.compute_reference_orbit_inner(target)
    }

    /// Shared implementation: computes orbit steps from `last_iter` up to `target`
    /// (capped at 10 000).  Handles re-anchoring when the view centre drifts.
    fn compute_reference_orbit_inner(&mut self, target: usize) -> OrbitBufferInfo {
        let twenty = DBig::try_from(20).unwrap();

        // Recenter the reference whenever the view center has drifted more than
        // ~20·scale from it, at ANY zoom depth. This was previously gated behind
        // scale > ~1.2e-37 (f32::MIN_POSITIVE·10), which silently disabled
        // recentering past that depth and left the reference stale (loss of
        // detail until a manual refresh forced a recompute). The comparison is
        // arbitrary-precision DBig, so there is no f32 floor to respect.
        if (&self.reference_cx - &self.cx).abs() > &self.scale * &twenty
            || (&self.reference_cy - &self.cy).abs() > &self.scale * &twenty
        {
            self.reset_reference_to(self.cx.clone(), self.cy.clone());
        }

        let offset = self.result.len();
        let mut zx = self.last_zx.clone();
        let mut zy = self.last_zy.clone();
        let mut der = self.last_der;
        // f32-precision view of the current z_n, carried across iterations so the derivative
        // step reuses the value already converted for orbit storage (no extra per-step DBig→f
        // string conversion, which dominates the orbit build). f32 precision is plenty for the
        // magnitude-only G_n = log2|der|.
        let mut zx_f = dbig_to_f32(&zx) as f64;
        let mut zy_f = dbig_to_f32(&zy) as f64;

        let two = DBig::try_from(2).unwrap();
        let threshold = DBig::try_from(1_000_000).unwrap();
        let total_iter: usize = target;
        let budget = self.budget_prec.max(PRECISION_FLOOR_BITS);

        let reference_cx = &self.reference_cx;
        let reference_cy = &self.reference_cy;

        if self.result.is_empty() {
            self.result.push(MandelbrotStep {
                zx: dbig_to_f32(&zx),
                zy: dbig_to_f32(&zy),
                pad0: 0.0,
                pad1: 0.0,
            });
        }

        while self.last_iter < total_iter {
            // Descending profile: working precision for THIS step from the bits the orbit has
            // already amplified (G_n = log2|dZ_n/dC|). der carries dZ_n/dC; using der_n (pre-
            // step) is conservative (G_n ≤ G_{n+1}, so we shed no more than earned). C stays at
            // the full budget P — only the z_n operands are rounded down to p_n.
            let g_bits = der.log2_mag();
            let p_n = profile_precision(budget, g_bits);
            let magnitude_sq = &zx * &zx + &zy * &zy;

            if magnitude_sq > threshold {
                // Reference rebase: the orbit (and its derivative) restart near zero, so the
                // next steps become sensitive again — G drops to 0 and precision rises back.
                zx = DBig::try_from(0).unwrap();
                zy = DBig::try_from(0).unwrap();
                der = FExpC::zero();
            } else {
                let zx_n = zx.with_precision(p_n).value();
                let zy_n = zy.with_precision(p_n).value();
                let zx_new = (&zx_n * &zx_n - &zy_n * &zy_n + reference_cx)
                    .with_precision(p_n)
                    .value();
                let zy_new = (&two * &zx_n * &zy_n + reference_cy)
                    .with_precision(p_n)
                    .value();
                // der_{n+1} = 2·Z_n·der_n + 1 (uses Z_n, the pre-update f32-precision value).
                der.step(zx_f, zy_f);
                zx = zx_new;
                zy = zy_new;
            }
            self.last_iter += 1;
            let sx = dbig_to_f32(&zx);
            let sy = dbig_to_f32(&zy);
            self.result.push(MandelbrotStep {
                zx: sx,
                zy: sy,
                pad0: 0.0,
                pad1: 0.0,
            });
            // Carry z_{n+1}'s f32 for the next iteration's derivative step.
            zx_f = sx as f64;
            zy_f = sy as f64;
        }

        // Stocker la dernière valeur exacte (et la dérivée) pour la reprise incrémentale
        self.last_zx = zx.clone();
        self.last_zy = zy.clone();
        self.last_der = der;
        self.bla_source_len = 0;
        self.bla_level_count = 0;
        self.bla_source_epsilon = 0.0;

        let ptr = self.result.as_ptr() as usize;
        let count = self.result.len();
        OrbitBufferInfo { ptr, offset, count }
    }

    pub fn compute_bla_reference_ptr(&mut self, max_iter: u32) -> BlaBufferInfo {
        let orbit_len = self.result.len().min(max_iter as usize + 1);
        self.compute_bla_reference_inner(orbit_len)
    }

    fn compute_bla_reference_inner(&mut self, orbit_len: usize) -> BlaBufferInfo {
        // Block size is auto-determined (no magic constant): the table is sized to
        // the largest block the orbit can support — p* = ⌈log₂(orbit_len)⌉ levels
        // (~20–40 at deep zoom). The per-level validity tests (radius + (H2)
        // |B|·|c|<ε + (G) near-critical) gate which blocks are actually usable;
        // the extra levels are near-free (entry counts halve each level).
        let max_bla_skip = Self::auto_max_skip(orbit_len);

        if orbit_len <= 1 {
            self.bla_result.clear();
            self.bla_levels.clear();
            self.bla_level_count = 0;
            self.bla_source_len = orbit_len;
            self.bla_source_epsilon = self.bla_epsilon;
            return BlaBufferInfo {
                ptr: self.bla_result.as_ptr() as usize,
                count: 0,
                levels_ptr: self.bla_levels.as_ptr() as usize,
                level_count: 0,
            };
        }

        if self.bla_source_len == orbit_len
            && (self.bla_source_epsilon - self.bla_epsilon).abs() <= f32::EPSILON
        {
            return BlaBufferInfo {
                ptr: self.bla_result.as_ptr() as usize,
                count: self.bla_result.len(),
                levels_ptr: self.bla_levels.as_ptr() as usize,
                level_count: self.bla_level_count,
            };
        }

        self.bla_result.clear();
        self.bla_levels.clear();

        let epsilon = self.bla_epsilon.max(f32::MIN_POSITIVE) as f64;
        let mut previous_level: Vec<BlaF64> = Vec::with_capacity(orbit_len - 1);
        for start in 1..orbit_len {
            let z = self.result[start];
            let zx = z.zx as f64;
            let zy = z.zy as f64;
            previous_level.push(bla_seed(zx, zy, epsilon));
        }

        let mut skip = 1usize;
        let mut level_start = 0usize;
        if skip >= MIN_BLA_SKIP {
            self.bla_result
                .extend(previous_level.iter().map(bla_f64_to_fe));
            self.bla_levels.push(BlaLevel {
                offset: level_start as u32,
                count: previous_level.len() as u32,
                skip: skip as u32,
                max_radius_bits: max_alpha_bits(&previous_level),
            });
            level_start = self.bla_result.len();
        }

        while skip < max_bla_skip && skip * 2 < orbit_len {
            let merged_skip = skip * 2;
            let level_entry_count = previous_level.len() / 2;
            if level_entry_count == 0 {
                break;
            }

            let mut current_level: Vec<BlaF64> = Vec::with_capacity(level_entry_count);
            for idx in 0..level_entry_count {
                let left = previous_level[idx * 2];
                let right = previous_level[idx * 2 + 1];
                current_level.push(bla_merge(left, right));
            }

            if merged_skip >= MIN_BLA_SKIP && merged_skip <= max_bla_skip {
                self.bla_result
                    .extend(current_level.iter().map(bla_f64_to_fe));
                self.bla_levels.push(BlaLevel {
                    offset: level_start as u32,
                    count: current_level.len() as u32,
                    skip: merged_skip as u32,
                    max_radius_bits: max_alpha_bits(&current_level),
                });
                level_start = self.bla_result.len();
            }

            previous_level = current_level;
            skip = merged_skip;
        }

        self.bla_level_count = self.bla_levels.len();
        self.bla_source_len = orbit_len;
        self.bla_source_epsilon = self.bla_epsilon;

        BlaBufferInfo {
            ptr: self.bla_result.as_ptr() as usize,
            count: self.bla_result.len(),
            levels_ptr: self.bla_levels.as_ptr() as usize,
            level_count: self.bla_level_count,
        }
    }

    /// Viewport aspect ratio (width/height) from the host: tightens the
    /// per-view c_max from the legacy 4×scale margin to the exact screen
    /// bound. NaN or non-positive restores the fallback.
    pub fn set_viewport_aspect(&mut self, aspect: f64) {
        self.viewport_aspect = if aspect > 0.0 { aspect } else { f64::NAN };
    }

    /// Retourne la taille du buffer en nombre de MandelbrotStep
    pub fn get_reference_orbit_len(&self) -> usize {
        self.last_iter
    }

    /// Retourne la capacité max du buffer
    pub fn get_reference_orbit_capacity(&self) -> usize {
        self.result.capacity()
    }

    fn reset_reference_to(&mut self, cx: DBig, cy: DBig) {
        self.result.clear();
        self.last_iter = 0;
        self.reference_cx = cx;
        self.reference_cy = cy;
        self.previous_c = (self.reference_cx.clone(), self.reference_cy.clone());
        self.last_zx = dbig_i(0);
        self.last_zy = dbig_i(0);
        self.last_der = FExpC::zero();
        self.bla_result.clear();
        self.bla_levels.clear();
        self.bla_level_count = 0;
        self.bla_source_len = 0;
        self.bla_source_epsilon = 0.0;
    }

    /// Deep-capable period detection via the ball/atom method, evaluated at the
    /// arbitrary-precision view centre. Unlike `detect_period_f64` — which
    /// truncates the centre to f64 and is therefore blind past ~1e-15 — this
    /// carries the critical orbit `z_n` and its derivative `dz_n/dc` in DBig, so
    /// it works at any zoom depth. The smallest `n` whose image-disk of the view
    /// (radius `radius` ≈ a few · `scale`) covers the origin — i.e.
    /// `|z_n| ≤ radius · |dz_n/dc|` — is the period of the smallest atom
    /// containing the view centre. Returns `None` if the orbit escapes
    /// (`|z| > 2`) before any such `n`, meaning no minibrot sits under the view.
    fn detect_period_ball(&self, max_iter: usize, radius: &DBig) -> Option<usize> {
        detect_period_ball_at(&self.cx, &self.cy, max_iter, radius)
    }

    /// Locate the minibrot under the current view and return its exact nucleus.
    ///
    /// Two stages, both arbitrary-precision so they hold at any depth:
    ///   1. `detect_period_ball` finds the period `p` of the atom containing the
    ///      view centre.
    ///   2. `newton_nucleus` refines the view centre to the period-`p` nucleus
    ///      (`z_p = 0`) in full precision.
    ///
    /// `radius_factor` scales the view radius used by the ball test (≈2–4 covers
    /// a centred minibrot; larger snaps to a bigger parent atom). Returns
    /// `["ok", cx, cy, period]` on success, `["nonewton", period]` if the period
    /// was found but Newton did not converge within range, or `["none"]` if no
    /// minibrot sits under the view.
    pub fn find_minibrot(&mut self, max_iter: u32, radius_factor: f64) -> Vec<String> {
        match self.locate_minibrot(max_iter, radius_factor, false) {
            Ok((period, ncx, ncy, _)) => vec![
                "ok".to_string(),
                ncx.to_string(),
                ncy.to_string(),
                period.to_string(),
            ],
            Err(Some(period)) => vec!["nonewton".to_string(), period.to_string()],
            Err(None) => vec!["none".to_string()],
        }
    }

    /// Same detection as [`find_minibrot`], plus the view framing that puts the
    /// whole minibrot in the middle of the screen at a given fill fraction.
    ///
    /// The extra stage is the Munafo/Jung *size estimate* `Λ` (see
    /// [`minibrot_size_estimate`], and [`verify_nucleus`] for the fused form
    /// this path uses): to first order the small copy is the whole
    /// Mandelbrot set mapped by `w ↦ nucleus + Λ·w`. So the copy's centre is
    /// `nucleus + Λ·(-0.75)` (the set's bounding box is centred on `-0.75`) and
    /// its on-screen half-extents follow from `|Λ|` and `arg Λ − view angle`.
    ///
    /// `fill` is the fraction of the limiting screen axis the copy should span
    /// (0.5 ≈ half the screen). Returns `["ok", cx, cy, period, scale]`, where
    /// `cx`/`cy` is the *copy centre* (not the nucleus) and `scale` the view
    /// half-height to set; `["nonewton", period]` / `["none"]` as above, and
    /// `["nosize", period]` if the size estimate degenerated.
    pub fn find_minibrot_framed(
        &mut self,
        max_iter: u32,
        radius_factor: f64,
        fill: f64,
    ) -> Vec<String> {
        // The size estimate rides along in the nucleus acceptance pass rather
        // than costing a second full-precision orbit over the period.
        let (period, ncx, ncy, size) = match self.locate_minibrot(max_iter, radius_factor, true) {
            Ok(found) => found,
            Err(Some(period)) => return vec!["nonewton".to_string(), period.to_string()],
            Err(None) => return vec!["none".to_string()],
        };

        let Some((size_x, size_y)) = size else {
            return vec!["nosize".to_string(), period.to_string()];
        };

        // |Λ| and arg Λ, kept safe at any depth: the magnitude stays in DBig
        // (|Λ| can be far below the f64 range), only the *direction* — a ratio
        // of comparable components — goes through f64.
        let abs_x = size_x.clone().abs();
        let abs_y = size_y.clone().abs();
        let largest = if abs_x >= abs_y { abs_x } else { abs_y };
        if largest == dbig_i(0) {
            return vec!["nosize".to_string(), period.to_string()];
        }
        let ux = dbig_to_f64(&(&size_x / &largest));
        let uy = dbig_to_f64(&(&size_y / &largest));
        let magnitude = &largest * dbig_f64(ux.hypot(uy));
        let theta = uy.atan2(ux);

        let aspect = if self.viewport_aspect.is_finite() && self.viewport_aspect > 0.0 {
            self.viewport_aspect
        } else {
            1.0
        };
        let factor = minibrot_frame_scale_factor(theta, self.angle, aspect, fill);
        let scale = (&magnitude * dbig_f64(factor)).with_precision(12).value();

        // Centre the *copy*, not the nucleus: the nucleus sits at w = 0, well
        // right of the box centre (the tail runs out to w = −2).
        let offset = dbig_f64(MINIBROT_BOX_CENTRE);
        let cx = &ncx + &size_x * &offset;
        let cy = &ncy + &size_y * &offset;

        vec![
            "ok".to_string(),
            cx.to_string(),
            cy.to_string(),
            period.to_string(),
            scale.to_string(),
        ]
    }

    fn working_precision(&self) -> usize {
        precision_bits_for_scale(&self.scale)
            .max(self.budget_prec)
            .max(64)
    }

    /// Ball-detection + Newton refinement shared by the two `find_minibrot*`
    /// entry points. `Err(None)` = nothing under the view, `Err(Some(p))` = the
    /// period was found but Newton did not converge.
    ///
    /// `want_size` carries the Munafo/Jung `Λ` out of the nucleus acceptance
    /// pass, which walks the period-long orbit the estimate needs anyway — the
    /// framed zoom therefore costs the same orbit passes as the plain one.
    fn locate_minibrot(
        &mut self,
        max_iter: u32,
        radius_factor: f64,
        want_size: bool,
    ) -> Result<(usize, DBig, DBig, Option<(DBig, DBig)>), Option<usize>> {
        const NEWTON_STEPS: usize = 80;
        self.ensure_precision();

        let factor =
            DBig::from_str(&radius_factor.max(1e-6).to_string()).unwrap_or_else(|_| dbig_i(4));
        let radius = &self.scale * &factor;

        let Some(period) = self.detect_period_ball(max_iter as usize, &radius) else {
            return Err(None);
        };

        // The nucleus is within ~scale of the view centre; bound Newton's reach
        // generously but not wildly, so a stray detection cannot teleport the
        // view far off-screen.
        let max_distance = &self.scale * dbig_i(1000);
        // Converge/validate to (most of) the working precision, NOT to the
        // current view scale. A nucleus only resolved to ~scale is accurate
        // enough to *display* at the current zoom, but its absolute error
        // stays fixed while the view keeps shrinking on every subsequent
        // zoom step — so a few zooms later the error dwarfs the new scale
        // and the view drifts off the minibrot ("imprécis dès qu'on zoom").
        // `prec` (decimal digits, DBig is base 10) is the same precision
        // `ensure_precision` already raised cx/cy/scale to, so Newton has
        // that many digits of headroom to converge into; `margin_digits`
        // reserves some of it for the rounding noise that accumulates over
        // `period` squarings per Newton step.
        let prec = self.working_precision();
        let margin_digits = 24 + (period as f64).log10().ceil().max(0.0) as usize;
        let tol_digits = prec.saturating_sub(margin_digits).max(16);
        let tolerance =
            DBig::from_str(&format!("1e-{tol_digits}")).unwrap_or_else(|_| self.scale.clone());
        match newton_nucleus_with_size(
            &self.cx,
            &self.cy,
            period,
            NEWTON_STEPS,
            &max_distance,
            &tolerance,
            want_size,
        ) {
            Some((ncx, ncy, size)) => Ok((period, ncx, ncy, size)),
            None => Err(Some(period)),
        }
    }

    pub fn scale(&mut self, value: &str) {
        self.scale = DBig::from_str(value).unwrap();
        self.vscale = DBig::try_from(1).unwrap();
        self.ensure_precision();
    }

    pub fn angle(&mut self, value: f64) {
        self.angle = value;
        self.vangle = 0.0;
    }

    pub fn origin(&mut self, cx: &str, cy: &str) {
        self.cx = DBig::from_str(cx).unwrap();
        self.cy = DBig::from_str(cy).unwrap();
        self.cx_continuous = self.cx.clone();
        self.cy_continuous = self.cy.clone();
        self.vtx = DBig::from_str("0").unwrap();
        self.vty = DBig::from_str("0").unwrap();
        self.ensure_precision();
    }

    /// Convert a canvas pixel position to complex-plane coordinates (arbitrary precision).
    ///
    /// `px`, `py`: pixel coordinates on the canvas (top-left origin)
    /// `canvas_width`, `canvas_height`: canvas dimensions in CSS pixels
    ///
    /// Returns `[re, im]` as strings with full precision.
    pub fn pixel_to_complex(
        &self,
        px: f64,
        py: f64,
        canvas_width: f64,
        canvas_height: f64,
    ) -> Vec<String> {
        let w = canvas_width.max(1.0);
        let h = canvas_height.max(1.0);
        let aspect = w / h;

        // Normalise pixel → [-1, 1]
        let nx = (px / w) * 2.0 - 1.0;
        let ny = (1.0 - py / h) * 2.0 - 1.0; // y inverted (y↑ = im↑)

        // Apply scale and aspect ratio
        let xr = nx * aspect;
        let yr = ny;

        // Rotate by +angle
        let sin_a = self.angle.sin();
        let cos_a = self.angle.cos();
        let rx = cos_a * xr - sin_a * yr;
        let ry = sin_a * xr + cos_a * yr;

        // Scale by view scale (arbitrary precision) and add center
        let rx_big = DBig::from_str(&rx.to_string()).unwrap();
        let ry_big = DBig::from_str(&ry.to_string()).unwrap();

        let re = &self.cx + &rx_big * &self.scale;
        let im = &self.cy + &ry_big * &self.scale;

        vec![re.to_string(), im.to_string()]
    }

    pub fn coordinate_to_pixel(
        &self,
        cx: &str,
        cy: &str,
        canvas_width: f64,
        canvas_height: f64,
    ) -> Vec<f64> {
        let w = canvas_width.max(1.0);
        let h = canvas_height.max(1.0);
        let aspect = w / h;

        let px_big = DBig::from_str(cx).unwrap_or_else(|_| DBig::try_from(0).unwrap());
        let py_big = DBig::from_str(cy).unwrap_or_else(|_| DBig::try_from(0).unwrap());

        // Subtract view center (arbitrary precision)
        let delta_x = &px_big - &self.cx;
        let delta_y = &py_big - &self.cy;

        // Divide by scale (arbitrary precision)
        let rx_big = &delta_x / &self.scale;
        let ry_big = &delta_y / &self.scale;

        // Convert to f64 for rotation and screen mapping
        let rx = dbig_to_f64(&rx_big);
        let ry = dbig_to_f64(&ry_big);

        // Inverse rotation: we want to find xr, yr given rx, ry.
        // Rotation by +angle was:
        // rx = cos(a) * xr - sin(a) * yr
        // ry = sin(a) * xr + cos(a) * yr
        // So:
        // xr = cos(a) * rx + sin(a) * ry
        // yr = -sin(a) * rx + cos(a) * ry
        let sin_a = self.angle.sin();
        let cos_a = self.angle.cos();

        let xr = cos_a * rx + sin_a * ry;
        let yr = -sin_a * rx + cos_a * ry;

        // Map xr, yr to normalized coordinates:
        // xr = nx * aspect => nx = xr / aspect
        // yr = ny => ny = yr
        let nx = xr / aspect;
        let ny = yr;

        // Map normalized coordinates to pixels:
        // nx = (px / w) * 2 - 1 => px = (nx + 1) / 2 * w
        // ny = 1 - (py / h) * 2 => py = (1 - ny) / 2 * h
        let px = (nx + 1.0) * 0.5 * w;
        let py = (1.0 - ny) * 0.5 * h;

        vec![px, py]
    }

    pub fn start_transition(
        &mut self,
        target_cx: &str,
        target_cy: &str,
        target_scale: &str,
        target_angle: f64,
        duration: f64,
    ) {
        self.transition_export_linear = false;
        self.transition_start_cx = Some(self.cx.clone());
        self.transition_start_cy = Some(self.cy.clone());
        self.transition_start_scale = Some(self.scale.clone());
        self.transition_start_angle = Some(self.angle);

        self.transition_target_cx =
            Some(DBig::from_str(target_cx).unwrap_or_else(|_| self.cx.clone()));
        self.transition_target_cy =
            Some(DBig::from_str(target_cy).unwrap_or_else(|_| self.cy.clone()));
        self.transition_target_scale =
            Some(DBig::from_str(target_scale).unwrap_or_else(|_| self.scale.clone()));

        let mut diff = (target_angle - self.angle) % (2.0 * std::f64::consts::PI);
        if diff > std::f64::consts::PI {
            diff -= 2.0 * std::f64::consts::PI;
        } else if diff < -std::f64::consts::PI {
            diff += 2.0 * std::f64::consts::PI;
        }
        self.transition_target_angle = Some(self.angle + diff);

        self.transition_duration = duration.max(0.01);
        self.transition_elapsed = 0.0;

        // Zero out velocities to prevent drift during transition
        self.vscale = DBig::try_from(1).unwrap();
        self.vangle = 0.0;
        self.vtx = DBig::try_from(0).unwrap();
        self.vty = DBig::try_from(0).unwrap();
    }

    /// Export supplies an already eased absolute time. Preserve the requested
    /// unwrapped angle so full turns are not reduced to the shortest arc.
    pub fn start_export_transition(
        &mut self,
        target_cx: &str,
        target_cy: &str,
        target_scale: &str,
        target_angle: f64,
        duration: f64,
    ) {
        self.start_transition(target_cx, target_cy, target_scale, target_angle, duration);
        self.transition_target_angle = Some(target_angle);
        if duration.is_finite() && duration > 0.0 {
            self.transition_duration = duration;
        }
        self.transition_export_linear = true;
    }

    pub fn cancel_transition(&mut self) {
        self.transition_start_cx = None;
        self.transition_start_cy = None;
        self.transition_start_scale = None;
        self.transition_start_angle = None;
        self.transition_target_cx = None;
        self.transition_target_cy = None;
        self.transition_target_scale = None;
        self.transition_target_angle = None;
        self.transition_duration = 0.0;
        self.transition_elapsed = 0.0;
    }

    pub fn is_in_transition(&self) -> bool {
        self.transition_start_cx.is_some()
    }
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub struct OrbitBufferInfo {
    pub ptr: usize,
    pub offset: usize,
    pub count: usize,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub struct BlaBufferInfo {
    pub ptr: usize,
    pub count: usize,
    pub levels_ptr: usize,
    pub level_count: usize,
}

// BLA coefficients during the build, in f64 so the merge (product of derivatives,
// up to ~1e154 at ~1e-308 depth) and the shrinking radii don't over/underflow
// f32. Converted to the extended-exponent BlaStep for the shader at storage.
#[derive(Copy, Clone)]
struct BlaF64 {
    ax: f64,
    ay: f64,
    bx: f64,
    by: f64,
    alpha: f64,
    beta: f64,
}

fn cmul64(a: (f64, f64), b: (f64, f64)) -> (f64, f64) {
    (a.0 * b.0 - a.1 * b.1, a.0 * b.1 + a.1 * b.0)
}

fn cabs64(a: (f64, f64)) -> f64 {
    (a.0 * a.0 + a.1 * a.1).sqrt()
}

// One-step seed at reference value Z = (zx, zy): A = 2Z, B = 1, β = 0. The
// affine validity radius is ε·|Z|.
fn bla_seed(zx: f64, zy: f64, epsilon: f64) -> BlaF64 {
    let mag = (zx * zx + zy * zy).sqrt();
    BlaF64 {
        ax: 2.0 * zx,
        ay: 2.0 * zy,
        bx: 1.0,
        by: 0.0,
        alpha: epsilon * mag,
        beta: 0.0,
    }
}

// Merge two consecutive blocks: x = left (first), y = right (second). The
// affine fields follow mathr.
fn bla_merge(left: BlaF64, right: BlaF64) -> BlaF64 {
    let (ax, ay) = cmul64((right.ax, right.ay), (left.ax, left.ay));
    let (abx, aby) = cmul64((right.ax, right.ay), (left.bx, left.by));
    let a_left_abs = cabs64((left.ax, left.ay)).max(f64::MIN_POSITIVE);
    let b_left_abs = cabs64((left.bx, left.by));
    let merged_alpha = right.alpha / a_left_abs;
    let merged_beta = (right.beta + b_left_abs) / a_left_abs;
    // Conservative line-min: smallest alpha, largest beta. Never clamp beta
    // downward: an overflow/non-finite beta denotes a dead block and is
    // serialized as such.
    BlaF64 {
        ax,
        ay,
        bx: abx + right.bx,
        by: aby + right.by,
        alpha: left.alpha.min(merged_alpha),
        beta: left.beta.max(merged_beta),
    }
}

// (exponent, 2^-exponent) such that |x|·2^-exponent ∈ [0.5, 1); (0, 1.0) for 0.
fn frexp_scale(x: f64) -> (i32, f64) {
    let ax = x.abs();
    if !(ax > 0.0) || !ax.is_finite() {
        return (0, 1.0);
    }
    let e = ax.log2().floor() as i32 + 1;
    (e, 2f64.powi(-e))
}

fn next_down_f32(value: f32) -> f32 {
    if value.is_nan() || value == f32::NEG_INFINITY {
        return value;
    }
    if value == 0.0 {
        return -f32::from_bits(1);
    }
    let bits = value.to_bits();
    if value > 0.0 {
        f32::from_bits(bits - 1)
    } else {
        f32::from_bits(bits + 1)
    }
}

fn next_up_f32(value: f32) -> f32 {
    if value.is_nan() || value == f32::INFINITY {
        return value;
    }
    if value == 0.0 {
        return f32::from_bits(1);
    }
    let bits = value.to_bits();
    if value > 0.0 {
        f32::from_bits(bits + 1)
    } else {
        f32::from_bits(bits - 1)
    }
}

/// Round an f64 to the nearest f32 at or below it (directed rounding toward
/// −∞), so a serialized radius never exceeds the certified bound.
pub fn f64_to_f32_down(value: f64) -> f32 {
    if value.is_nan() || value == f64::NEG_INFINITY {
        return f32::NEG_INFINITY;
    }
    if value == f64::INFINITY {
        return f32::INFINITY;
    }
    let rounded = value as f32;
    if rounded as f64 > value {
        next_down_f32(rounded)
    } else {
        rounded
    }
}

/// Round an f64 to the nearest f32 at or above it (directed rounding toward
/// +∞), so a serialized slope never under-estimates the certified bound.
pub fn f64_to_f32_up(value: f64) -> f32 {
    if value.is_nan() || value == f64::INFINITY {
        return f32::INFINITY;
    }
    if value == f64::NEG_INFINITY {
        return f32::NEG_INFINITY;
    }
    let rounded = value as f32;
    if (rounded as f64) < value {
        next_up_f32(rounded)
    } else {
        rounded
    }
}

fn bla_f64_to_fe(s: &BlaF64) -> BlaStep {
    // a and b share one exponent (same order of magnitude).
    let ab_max = s.ax.abs().max(s.ay.abs()).max(s.bx.abs()).max(s.by.abs());
    let (ab_exp, ab_scale) = frexp_scale(ab_max);
    let (alpha_exp, alpha_scale) = frexp_scale(s.alpha);
    // The GPU accepts when |dz| <= alpha - beta*|dc|. Serialization must therefore
    // shrink alpha and enlarge beta. A non-representable bound is a dead block,
    // never a reason to clamp beta downward and accidentally enlarge its domain.
    let valid_coefficients =
        s.ax.is_finite() && s.ay.is_finite() && s.bx.is_finite() && s.by.is_finite();
    let valid_radius = valid_coefficients
        && s.alpha > 0.0
        && s.alpha.is_finite()
        && s.beta >= 0.0
        && s.beta.is_finite()
        && s.beta <= f32::MAX as f64;
    let radius_alpha = if valid_radius {
        f64_to_f32_down(s.alpha * alpha_scale)
    } else {
        0.0
    };
    let radius_beta = if valid_radius {
        f64_to_f32_up(s.beta)
    } else {
        f32::MAX
    };
    let serialize_coefficient = |value: f64, scale: f64| -> f32 {
        if valid_coefficients {
            (value * scale) as f32
        } else {
            0.0
        }
    };
    BlaStep {
        ax: serialize_coefficient(s.ax, ab_scale),
        ay: serialize_coefficient(s.ay, ab_scale),
        bx: serialize_coefficient(s.bx, ab_scale),
        by: serialize_coefficient(s.by, ab_scale),
        ab_exp: if valid_coefficients { ab_exp } else { 0 },
        radius_alpha,
        alpha_exp: if valid_radius { alpha_exp } else { 0 },
        radius_beta,
    }
}

// Largest actual alpha magnitude in a level, as f32 bits (the shallow path's
// whole-level fast-reject bound). Underflows to 0 in the deep regime, where the
// shader uses the per-entry fe radius instead.
fn max_alpha_bits(entries: &[BlaF64]) -> u32 {
    f64_to_f32_up(entries.iter().fold(0.0f64, |m, s| m.max(s.alpha))).to_bits()
}

/// Iterate the critical orbit `z₀=0, z←z²+c` for `period` steps, returning both
/// the value `z_period` and its derivative `dz_period/dc`. The derivative is
/// what lets callers validate nucleus-ness in a scale-invariant way: near a
/// depth-`scale` nucleus `|dz| ~ 1/scale`, so `z` and `c` live on different
/// scales and `z` can only be compared to a `c`-space radius via `|z| ≤ r·|dz|`.
///
/// [`verify_nucleus`] now reaches the same values in the pass it already walks,
/// so this stays as the tests' independent reference for that fused pass.
#[allow(dead_code)]
fn critical_value_and_derivative(cx: &DBig, cy: &DBig, period: usize) -> (DBig, DBig, DBig, DBig) {
    let two = dbig_i(2);
    let one = dbig_i(1);
    let mut zx = dbig_i(0);
    let mut zy = dbig_i(0);
    let mut dx = dbig_i(0);
    let mut dy = dbig_i(0);

    for _ in 0..period {
        let dx_new = &two * (&zx * &dx - &zy * &dy) + &one;
        let dy_new = &two * (&zx * &dy + &zy * &dx);
        let zx_new = &zx * &zx - &zy * &zy + cx;
        let zy_new = &two * &zx * &zy + cy;
        zx = zx_new;
        zy = zy_new;
        dx = dx_new;
        dy = dy_new;
    }

    (zx, zy, dx, dy)
}

// Bounding box of the whole Mandelbrot set in the `w` frame of a small copy
// (c ≈ nucleus + Λ·w): real ∈ [−2, 0.47], imag ∈ ±1.13, plus a small margin.
// The box centre is what the framed zoom puts at the middle of the screen —
// the nucleus itself (w = 0) is far off-centre, the tail runs out to w = −2.
const MINIBROT_BOX_CENTRE: f64 = -0.75;
pub(crate) const MINIBROT_BOX_HALF_RE: f64 = 1.30;
const MINIBROT_BOX_HALF_IM: f64 = 1.20;

/// Munafo/Jung size estimate of the minibrot with nucleus `(cx, cy)` and period
/// `period`: the complex `Λ = 1/(b·l²)` with
/// `l = ∏_{i=1}^{p−1} 2·z_i` and `b = 1 + Σ 1/l_i`.
///
/// To first order the small copy is the whole Mandelbrot set under the affine
/// map `w ↦ nucleus + Λ·w`, so `|Λ|` is its linear size and `arg Λ` its
/// orientation. Everything runs in DBig: `l` overflows f64 within a few dozen
/// iterations at depth, and the orbit loses ~log|l| digits of accuracy, which
/// the caller's working precision (∝ zoom depth) covers.
///
/// Returns `None` if `l` or `b·l²` collapses to zero (non-primitive period).
///
/// The framed zoom no longer calls this: it takes `Λ` from [`verify_nucleus`],
/// which accumulates the same product and sum in extended-exponent f64 during
/// the acceptance pass it already walks. This all-DBig form stays as that path's
/// reference, and as the estimator the build-only censuses drive.
#[allow(dead_code)]
pub(crate) fn minibrot_size_estimate(
    cx: &DBig,
    cy: &DBig,
    period: usize,
    prec: usize,
) -> Option<(DBig, DBig)> {
    let zero = raise_precision(dbig_i(0), prec);
    let one = raise_precision(dbig_i(1), prec);
    let two = raise_precision(dbig_i(2), prec);

    let mut zx = zero.clone();
    let mut zy = zero.clone();
    let mut lx = one.clone();
    let mut ly = zero.clone();
    let mut bx = one.clone();
    let mut by = zero.clone();

    for _ in 1..period {
        let zx_new = &zx * &zx - &zy * &zy + cx;
        let zy_new = &two * &zx * &zy + cy;
        zx = zx_new;
        zy = zy_new;
        let lx_new = &two * (&zx * &lx - &zy * &ly);
        let ly_new = &two * (&zx * &ly + &zy * &lx);
        lx = lx_new;
        ly = ly_new;
        let norm = &lx * &lx + &ly * &ly;
        if norm == zero {
            return None;
        }
        // b += 1/l  (conjugate over |l|²)
        bx = &bx + &lx / &norm;
        by = &by - &ly / &norm;
    }

    let l2x = &lx * &lx - &ly * &ly;
    let l2y = &two * &lx * &ly;
    let dx = &bx * &l2x - &by * &l2y;
    let dy = &bx * &l2y + &by * &l2x;
    let norm = &dx * &dx + &dy * &dy;
    if norm == zero {
        return None;
    }
    Some((&dx / &norm, &zero - &dy / &norm))
}

/// How many `|Λ|` the view half-height must span so the minibrot's bounding box
/// covers `fill` of the limiting screen axis.
///
/// `theta` = `arg Λ`, `view_angle` = the view rotation: the box appears on
/// screen rotated by `theta − view_angle` (screen `+x` maps to the complex
/// direction `e^{i·view_angle}`), which widens its axis-aligned extents.
fn minibrot_frame_scale_factor(theta: f64, view_angle: f64, aspect: f64, fill: f64) -> f64 {
    let phi = theta - view_angle;
    let (sin_phi, cos_phi) = (phi.sin().abs(), phi.cos().abs());
    let half_x = MINIBROT_BOX_HALF_RE * cos_phi + MINIBROT_BOX_HALF_IM * sin_phi;
    let half_y = MINIBROT_BOX_HALF_RE * sin_phi + MINIBROT_BOX_HALF_IM * cos_phi;
    let aspect = if aspect.is_finite() && aspect > 0.0 {
        aspect
    } else {
        1.0
    };
    // Half-width of the view is `scale·aspect`, half-height is `scale`.
    (half_x / aspect).max(half_y) / fill.clamp(0.05, 1.0)
}

/// Ball-arithmetic period detection at an arbitrary centre, extracted from
/// `MandelbrotNavigator::detect_period_ball` so build-only censuses can drive the
/// production path instead of a copy of it.
pub(crate) fn detect_period_ball_at(
    cx: &DBig,
    cy: &DBig,
    max_iter: usize,
    radius: &DBig,
) -> Option<usize> {
    let two = dbig_i(2);
    let one = dbig_i(1);
    let four = dbig_i(4);
    let radius_sq = radius * radius;

    let mut zx = dbig_i(0);
    let mut zy = dbig_i(0);
    // dz/dc, tracked in DBig so the (huge) derivative magnitude at depth
    // never overflows — the comparison stays exact.
    let mut dx = dbig_i(0);
    let mut dy = dbig_i(0);

    for n in 1..=max_iter {
        // Derivative recurrence uses the *previous* z: dz' = 2·z·dz + 1.
        let dx_new = &two * (&zx * &dx - &zy * &dy) + &one;
        let dy_new = &two * (&zx * &dy + &zy * &dx);
        let zx_new = &zx * &zx - &zy * &zy + cx;
        let zy_new = &two * &zx * &zy + cy;
        zx = zx_new;
        zy = zy_new;
        dx = dx_new;
        dy = dy_new;

        let z2 = &zx * &zx + &zy * &zy;
        let d2 = &dx * &dx + &dy * &dy;
        // |z|² ≤ radius² · |dz|²  ⇔  the view-disk's n-th image covers 0.
        if z2 <= &radius_sq * &d2 {
            return Some(n);
        }
        if z2 > four {
            return None;
        }
    }
    None
}

/// Digits the Newton ladder starts from, and never drops below: enough signal in
/// the first step to steer, cheap enough that the approach phase is free.
const NEWTON_LADDER_MIN_DIGITS: usize = 24;
/// Slack between the digits a Newton step resolves and the digits it is computed
/// with, so the next step reads signal rather than rounding noise.
const NEWTON_LADDER_GUARD_DIGITS: usize = 16;

/// One acceptance pass over the critical orbit at a candidate nucleus.
///
/// Walks `z₀=0, z←z²+c` once, to `n = period`, and on the way:
///   * rejects the candidate at the first proper divisor `d | period` whose
///     `|z_d| ≤ tolerance·|dz_d|` — the detected period is then a multiple of
///     the true one (non-primitive);
///   * applies the same scale-invariant test at `n = period` to accept the
///     nucleus itself;
///   * accumulates the Munafo/Jung size estimate `Λ` when `want_size`.
///
/// This replaces one `critical_value_and_derivative` orbit *per divisor* plus
/// one for the period plus, for the framed zoom, a whole separate
/// `minibrot_size_estimate` orbit — ~σ(period) + period iterations where this
/// walks `period`. `Λ`'s running product `l = ∏2·z_i` and sum `b = 1 + Σ1/l_i`
/// ride along in extended-exponent f64 (`|l|` leaves the f64 range within a few
/// dozen steps, which is the only reason the standalone estimator needs DBig):
/// `Λ` only sizes a view frame, so f64 mantissas are orders more accuracy than
/// can be observed, and it costs two `dbig_frexp` per step instead of eight DBig
/// multiplications and two DBig divisions.
///
/// `None` = rejected. `Some(None)` = accepted, with no size (not asked for, or
/// the estimate degenerated). `Some(Some(Λ))` = accepted, with the size estimate.
fn verify_nucleus(
    cx: &DBig,
    cy: &DBig,
    period: usize,
    tol_sq: &DBig,
    want_size: bool,
) -> Option<Option<(DBig, DBig)>> {
    let two = dbig_i(2);
    let one = dbig_i(1);
    let mut zx = dbig_i(0);
    let mut zy = dbig_i(0);
    let mut dx = dbig_i(0);
    let mut dy = dbig_i(0);

    let mut l = FExpC::one();
    let mut b = FExpC::one();
    let mut size_live = want_size;

    for n in 1..=period {
        let dx_new = &two * (&zx * &dx - &zy * &dy) + &one;
        let dy_new = &two * (&zx * &dy + &zy * &dx);
        let zx_new = &zx * &zx - &zy * &zy + cx;
        let zy_new = &two * &zx * &zy + cy;
        zx = zx_new;
        zy = zy_new;
        dx = dx_new;
        dy = dy_new;

        // `l` runs over i = 1..period−1 and `b` sums 1/l_i alongside it, exactly
        // as `minibrot_size_estimate` does.
        if size_live && n < period {
            let z = dbig_pair_to_fexpc(&zx, &zy);
            l = l.mul(FExpC {
                x: 2.0 * z.x,
                y: 2.0 * z.y,
                e: z.e,
            });
            if l.is_zero() {
                size_live = false;
            } else {
                b = b.add(l.recip());
            }
        }

        // Primitivity checkpoint, reached in passing instead of by re-walking
        // the orbit prefix from zero.
        if n < period && period % n == 0 {
            let zd2 = &zx * &zx + &zy * &zy;
            let dd2 = &dx * &dx + &dy * &dy;
            if zd2 <= tol_sq * &dd2 {
                return None;
            }
        }
    }

    // Scale-invariant nucleus check: |z_p|² ≤ tolerance² · |dz_p|².
    let zp2 = &zx * &zx + &zy * &zy;
    let dp2 = &dx * &dx + &dy * &dy;
    if zp2 > tol_sq * &dp2 {
        return None;
    }

    if !size_live {
        return Some(None);
    }
    // Λ = 1/(b·l²).
    Some(b.mul(l).mul(l).recip().to_dbig_pair())
}

/// Newton's method for the period-`period` nucleus (`z_period(c) = 0`), starting
/// from `(start_cx, start_cy)`.
///
/// `max_distance` bounds how far the iterate may drift from the start (reach).
/// `tolerance` is the `c`-space convergence/validation radius: Newton stops once
/// a step is smaller than it, and the result is accepted only if the critical
/// value sits within `tolerance` of a true root — `|z_p| ≤ tolerance·|dz_p|`.
/// The derivative weighting is essential at depth: `|dz_p| ~ 1/scale`, so a bare
/// `|z_p| ≤ tolerance` test (the old code) rejected every deep nucleus because
/// the precision-floor noise in `z_p` dwarfs `scale`.
///
/// Size-free form of [`newton_nucleus_with_size`], for the callers that only
/// want the nucleus (reference selection, the interior census).
#[allow(dead_code)]
pub(crate) fn newton_nucleus(
    start_cx: &DBig,
    start_cy: &DBig,
    period: usize,
    steps: usize,
    max_distance: &DBig,
    tolerance: &DBig,
) -> Option<(DBig, DBig)> {
    newton_nucleus_with_size(
        start_cx,
        start_cy,
        period,
        steps,
        max_distance,
        tolerance,
        false,
    )
    .map(|(cx, cy, _)| (cx, cy))
}

/// [`newton_nucleus`], with the option of carrying the size estimate `Λ` out of
/// the acceptance pass (see [`verify_nucleus`]) instead of paying a second orbit
/// for it. The third component is `None` when `want_size` is false or the
/// estimate degenerated.
///
/// The refinement runs on a **precision ladder**: Newton is self-correcting, so
/// a step only has to be computed to the number of digits it can actually earn.
/// Its long approach phase — the steps that barely shrink, which at depth are
/// most of them — needs a couple of dozen digits, and the full budget is paid
/// only on the last two or three, where quadratic convergence doubles the
/// resolved digits each time. Measured on a period-4875 atom: 2.1× at 164
/// digits, 4.0× at 1064, with a nucleus identical to the last place.
///
/// The ladder is driven by the *measured* step size, not by a doubling schedule:
/// a schedule reaches full precision while Newton is still approaching, and gives
/// back most of the gain.
pub(crate) fn newton_nucleus_with_size(
    start_cx: &DBig,
    start_cy: &DBig,
    period: usize,
    steps: usize,
    max_distance: &DBig,
    tolerance: &DBig,
    want_size: bool,
) -> Option<(DBig, DBig, Option<(DBig, DBig)>)> {
    if period == 0 {
        return None;
    }

    let two = dbig_i(2);
    let one = dbig_i(1);
    let zero = dbig_i(0);
    let max_distance_sq = max_distance * max_distance;
    let tol_sq = tolerance * tolerance;

    let mut cx = start_cx.clone();
    let mut cy = start_cy.clone();

    // Ladder ceiling = the accuracy the caller can actually observe: the
    // operands' own precision, and never more than the exit test leaves behind.
    // Newton's last accepted step squares the error, so stopping at `tolerance`
    // lands around 2·(-log10 tolerance) digits; computing past that is work
    // whose result the caller discards. Operands with unlimited precision (0)
    // opt out of the ladder entirely and run as before.
    let operand_prec = start_cx.precision().max(start_cy.precision());
    let laddered = operand_prec != 0;
    let target = if laddered {
        let tol_digits = dbig_neg_log10(tolerance);
        let ceiling = if tol_digits.is_finite() && tol_digits > 0.0 {
            (2.0 * tol_digits).ceil() as usize + NEWTON_LADDER_GUARD_DIGITS
        } else {
            operand_prec
        };
        operand_prec.min(ceiling.max(NEWTON_LADDER_MIN_DIGITS))
    } else {
        0
    };
    let mut working = target.min(NEWTON_LADDER_MIN_DIGITS);

    for _ in 0..steps {
        let at_full = !laddered || working >= target;
        // Rounding c down for the orbit is what makes a ladder step cheap: every
        // product below inherits its precision from the c that seeds it.
        let (cxw, cyw) = if at_full {
            (cx.clone(), cy.clone())
        } else {
            (
                cx.clone().with_precision(working).value(),
                cy.clone().with_precision(working).value(),
            )
        };

        let mut zx = zero.clone();
        let mut zy = zero.clone();
        let mut dx = zero.clone();
        let mut dy = zero.clone();

        for _ in 0..period {
            let dx_new = &two * (&zx * &dx - &zy * &dy) + &one;
            let dy_new = &two * (&zx * &dy + &zy * &dx);
            let zx_new = &zx * &zx - &zy * &zy + &cxw;
            let zy_new = &two * &zx * &zy + &cyw;

            zx = zx_new;
            zy = zy_new;
            dx = dx_new;
            dy = dy_new;
        }

        let denom = &dx * &dx + &dy * &dy;
        if denom == zero {
            return None;
        }

        let step_x = (&zx * &dx + &zy * &dy) / &denom;
        let step_y = (&zy * &dx - &zx * &dy) / &denom;
        cx = &cx - &step_x;
        cy = &cy - &step_y;

        let distance_x = &cx - start_cx;
        let distance_y = &cy - start_cy;
        if &distance_x * &distance_x + &distance_y * &distance_y > max_distance_sq {
            return None;
        }

        let step_sq = &step_x * &step_x + &step_y * &step_y;
        // Only an at-full-precision step can be trusted against the tolerance: a
        // ladder step is deliberately resolved to fewer digits than that.
        if at_full && step_sq <= tol_sq {
            break;
        }
        if laddered {
            // Digits this step resolved (step_sq is |Δ|²); the next one resolves
            // about twice that, quadratically.
            let resolved = dbig_neg_log10(&step_sq) * 0.5;
            let next = if resolved.is_finite() {
                (2.0 * resolved).max(0.0) as usize + NEWTON_LADDER_GUARD_DIGITS
            } else {
                target
            };
            working = next.clamp(NEWTON_LADDER_MIN_DIGITS.min(target), target);
        }
    }

    // The acceptance pass runs at the ladder ceiling too: past `target` digits
    // the orbit only refines noise the exit test already discarded.
    let (vx, vy) = if laddered && target < operand_prec {
        (
            cx.clone().with_precision(target).value(),
            cy.clone().with_precision(target).value(),
        )
    } else {
        (cx.clone(), cy.clone())
    };
    let size = verify_nucleus(&vx, &vy, period, &tol_sq, want_size)?;

    Some((cx, cy, size))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn construct_and_compute_orbit_simple() {
        // Construire le navigator avec des valeurs simples
        let mut nav = MandelbrotNavigator::new("0.0", "0.0", "1.0", 0.0);
        // Calculer une petite orbite de référence
        let info = nav.compute_reference_orbit_ptr(10);
        // On stocke l'état initial puis 10 itérations complètes.
        assert_eq!(info.count, 11);
        // Offset à 0 sur nouvelle instance
        assert_eq!(info.offset, 0);
        // Le pointeur doit être un adressage non-nul (vecteur alloué)
        assert!(info.ptr != 0);
    }

    #[test]
    fn bla_mode_switches_cleanly() {
        let mut nav = MandelbrotNavigator::new("0.0", "0.0", "1.0", 0.0);
        assert_eq!(
            nav.get_approximation_mode(),
            ApproximationMode::Perturbation
        );
        nav.use_bla();
        assert_eq!(
            nav.get_approximation_mode(),
            ApproximationMode::BivariateLinear
        );
        nav.use_perturbation();
        assert_eq!(
            nav.get_approximation_mode(),
            ApproximationMode::Perturbation
        );
    }

    // ── CPU-only skip diagnostic (Validation path step 2 / task 2.3) ───────────
    // Compares how far the affine vs Padé block tables can skip at a swept input
    // |dz|, no shader involved. Padé's √ε radius (vs affine ε) admits the same fixed
    // block at a ~1/√ε larger |dz|, so in the band [ε|A|, √ε|A|] it out-skips affine.
    // Isolates the math risk before any GPU work.

    #[test]
    fn classic_bla_serialization_shrinks_the_acceptance_domain() {
        let source = BlaF64 {
            ax: 3.25,
            ay: -0.75,
            bx: 1.125,
            by: 0.25,
            alpha: 0.7_f64 * 2f64.powi(-17),
            beta: 1.000_000_06,
        };
        let serialized = bla_f64_to_fe(&source);
        let alpha = serialized.radius_alpha as f64 * 2f64.powi(serialized.alpha_exp);
        assert!(
            alpha <= source.alpha,
            "alpha rounded outward: {} > {}",
            alpha,
            source.alpha
        );
        assert!(
            serialized.radius_beta as f64 >= source.beta,
            "beta rounded inward: {} < {}",
            serialized.radius_beta,
            source.beta
        );
        let level_max = f32::from_bits(max_alpha_bits(&[source])) as f64;
        assert!(
            level_max >= source.alpha,
            "level fast-reject bound rounded downward"
        );
    }

    #[test]
    fn classic_bla_invalid_beta_serializes_as_a_dead_block() {
        let mut left = bla_seed(0.5, 0.0, 1e-6);
        left.ax = f64::MIN_POSITIVE;
        left.ay = 0.0;
        left.bx = 1.0;
        let right = bla_seed(0.5, 0.0, 1e-6);
        let merged = bla_merge(left, right);
        assert!(
            merged.beta > f32::MAX as f64,
            "an unrepresentable beta must not be clamped into a live domain"
        );

        let serialized = bla_f64_to_fe(&merged);
        assert_eq!(serialized.radius_alpha, 0.0);
        assert_eq!(serialized.alpha_exp, 0);
        assert_eq!(serialized.radius_beta, f32::MAX);

        let mut invalid_coefficient = right;
        invalid_coefficient.ax = f64::INFINITY;
        let serialized = bla_f64_to_fe(&invalid_coefficient);
        assert_eq!(serialized.radius_alpha, 0.0);
        assert_eq!(serialized.ax, 0.0);
        assert_eq!(serialized.bx, 0.0);
        assert_eq!(serialized.ab_exp, 0);
    }

    #[test]
    fn classic_bla_block64_has_a_live_radius_beyond_the_f32_coefficient_range() {
        // On the c=-2 reference, Z=2 after the first return and every seed has
        // A=4. A 64-step block is the smallest power-of-two block whose A=2^128
        // overflows f32 while its validity radius is still a live subnormal.
        let mut block = bla_seed(2.0, 0.0, 1e-6);
        for _ in 0..6 {
            block = bla_merge(block, block);
        }
        let serialized = bla_f64_to_fe(&block);
        assert!(serialized.ab_exp > 120);
        assert!(serialized.radius_alpha > 0.0);
        assert!(
            f32::from_bits(max_alpha_bits(&[block])) > 0.0,
            "the level gate still considers this block live"
        );
    }

    #[test]
    fn bla_reference_generation_builds_multiple_levels() {
        // Shallow zoom: auto block-sizing yields a minimal table (no benefit to
        // large skips), and L_min = 4 means the smallest level is skip 4 — the 1-
        // and 2-step levels are culled (Guard 2).
        let mut shallow = MandelbrotNavigator::new("-0.75", "0.1", "1.0", 0.0);
        shallow.compute_reference_orbit_ptr(256);
        shallow.compute_bla_reference_ptr(256);
        assert!(shallow.bla_level_count >= 1);
        assert_eq!(
            shallow.bla_levels[0].skip, MIN_BLA_SKIP as u32,
            "smallest skip is L_min = {}",
            MIN_BLA_SKIP
        );

        // Deep zoom: auto-sizing opens several levels, all powers of two starting
        // at L_min and doubling, with non-increasing per-level max radius.
        let mut nav = MandelbrotNavigator::new("-0.75", "0.1", "1e-30", 0.0);
        nav.compute_reference_orbit_ptr(256);
        let bla = nav.compute_bla_reference_ptr(256);
        assert!(bla.count >= 4, "expected a populated BLA table at depth");
        assert!(
            nav.bla_level_count >= 4,
            "deep zoom should open several levels, got {}",
            nav.bla_level_count
        );
        assert_ne!(bla.levels_ptr, 0);
        assert_eq!(nav.bla_levels[0].skip, MIN_BLA_SKIP as u32);
        for i in 1..nav.bla_level_count {
            assert_eq!(
                nav.bla_levels[i].skip,
                nav.bla_levels[i - 1].skip * 2,
                "levels double from L_min"
            );
        }
        assert!(nav.bla_result.iter().all(|step| step.radius_beta >= 0.0));
        // Each level's stored max radius must bound every entry it covers, and
        // the per-level max must not grow with the skip (merged radii shrink).
        let mut previous_max = f64::INFINITY;
        for level in nav.bla_levels.iter() {
            let start = level.offset as usize;
            let end = start + level.count as usize;
            let max_radius = f32::from_bits(level.max_radius_bits) as f64;
            // radius_alpha is now an fe mantissa; the actual radius is
            // radius_alpha · 2^alpha_exp.
            assert!(nav.bla_result[start..end].iter().all(|step| {
                let alpha = step.radius_alpha as f64 * 2f64.powi(step.alpha_exp);
                alpha <= max_radius * (1.0 + 1e-5) + 1e-30
            }));
            assert!(max_radius <= previous_max);
            previous_max = max_radius;
        }
    }

    #[test]
    fn newton_nucleus_finds_period_two_center() {
        let start_x = DBig::from_str("-1.01").unwrap();
        let start_y = DBig::from_str("0.001").unwrap();
        let max_distance = DBig::from_str("0.1").unwrap();
        let tolerance = DBig::from_str("1e-4").unwrap();
        let (cx, cy) = newton_nucleus(&start_x, &start_y, 2, 24, &max_distance, &tolerance)
            .expect("period-2 nucleus should converge");

        let cx_f64 = dbig_to_f64(&cx);
        let cy_f64 = dbig_to_f64(&cy);
        assert!((cx_f64 + 1.0).abs() < 1e-10, "cx={}", cx_f64);
        assert!(cy_f64.abs() < 1e-10, "cy={}", cy_f64);
    }

    /// The precision ladder must not cost accuracy. Computing the intermediate
    /// steps at a fraction of the budget is only sound if the *result* is still
    /// a nucleus to the full budget, so the check is the definition itself —
    /// `|z_p| ≤ tol·|dz_p|` at a tolerance 14 orders tighter than the one Newton
    /// exited on, and close to the 400-digit operand floor.
    #[test]
    fn newton_ladder_still_resolves_the_nucleus_to_the_full_budget() {
        let prec = 400;
        // Off-centre start near the period-3 island, ~|Λ| away from its nucleus.
        let start_x = raise_precision(DBig::from_str("-1.7548776").unwrap(), prec);
        let start_y = raise_precision(DBig::from_str("0.0000031").unwrap(), prec);
        let max_distance = raise_precision(DBig::from_str("1e-1").unwrap(), prec);
        let tolerance = raise_precision(DBig::from_str("1e-376").unwrap(), prec);

        let (cx, cy) = newton_nucleus(&start_x, &start_y, 3, 80, &max_distance, &tolerance)
            .expect("period-3 nucleus should converge on the ladder");

        let (zp_x, zp_y, dp_x, dp_y) = critical_value_and_derivative(&cx, &cy, 3);
        let zp2 = &zp_x * &zp_x + &zp_y * &zp_y;
        let dp2 = &dp_x * &dp_x + &dp_y * &dp_y;
        let tight = raise_precision(DBig::from_str("1e-390").unwrap(), prec);
        assert!(
            zp2 <= &(&tight * &tight) * &dp2,
            "laddered nucleus is not a fixed point to 390 digits"
        );
    }

    /// The size estimate fused into the acceptance pass (extended-exponent f64)
    /// must agree with the standalone all-DBig estimator. Λ only sizes a view
    /// frame, so the bar is relative agreement well past what framing can show.
    #[test]
    fn fused_size_estimate_matches_the_dbig_estimator() {
        for (cx_s, cy_s, period) in [
            ("-1.754877666246693", "0.0", 3usize),
            ("-0.15652016683375508", "1.0322471089228318", 4),
            ("-1.6254137251233038", "0.0", 5),
            ("-1.47601464272843", "0.0", 6),
        ] {
            let prec = 200;
            let cx = raise_precision(DBig::from_str(cx_s).unwrap(), prec);
            let cy = raise_precision(DBig::from_str(cy_s).unwrap(), prec);
            let reference = minibrot_size_estimate(&cx, &cy, period, prec)
                .expect("the DBig estimator should converge");
            // A tolerance loose enough that the candidate is accepted outright,
            // so the pass returns the size it accumulated.
            let tol = raise_precision(DBig::from_str("1e-6").unwrap(), prec);
            let fused = verify_nucleus(&cx, &cy, period, &(&tol * &tol), true)
                .expect("nucleus should be accepted")
                .expect("the fused estimator should converge");

            let rel = |a: &DBig, b: &DBig| -> f64 {
                let scale = dbig_to_f64(&reference.0).hypot(dbig_to_f64(&reference.1));
                (dbig_to_f64(a) - dbig_to_f64(b)).abs() / scale.max(f64::MIN_POSITIVE)
            };
            assert!(
                rel(&fused.0, &reference.0) < 1e-12 && rel(&fused.1, &reference.1) < 1e-12,
                "p={period}: fused Λ = ({}, {}) vs DBig ({}, {})",
                fused.0,
                fused.1,
                reference.0,
                reference.1
            );
        }
    }

    /// Primitivity is now checked at the divisor checkpoints of the single
    /// acceptance orbit instead of by re-walking each divisor from zero: a
    /// period that is a multiple of the true one must still be rejected.
    #[test]
    fn fused_pass_still_rejects_a_non_primitive_period() {
        let prec = 120;
        // c = -1 is the period-2 nucleus; 4, 6 and 8 are multiples of it.
        let cx = raise_precision(DBig::from_str("-1.0").unwrap(), prec);
        let cy = raise_precision(DBig::from_str("0.0").unwrap(), prec);
        let tol = raise_precision(DBig::from_str("1e-40").unwrap(), prec);
        let tol_sq = &tol * &tol;
        assert!(
            verify_nucleus(&cx, &cy, 2, &tol_sq, false).is_some(),
            "period 2 is primitive at c = -1"
        );
        for multiple in [4usize, 6, 8] {
            assert!(
                verify_nucleus(&cx, &cy, multiple, &tol_sq, false).is_none(),
                "period {multiple} at c = -1 is a multiple of 2 and must be rejected"
            );
        }
    }

    #[test]
    fn find_minibrot_snaps_to_period_two_nucleus() {
        // View sitting just off the period-2 nucleus (c = -1) at a modest zoom.
        let mut nav = MandelbrotNavigator::new("-1.0000003", "0.0000002", "1e-6", 0.0);
        let res = nav.find_minibrot(4096, 4.0);
        assert_eq!(res[0], "ok", "expected a hit, got {:?}", res);
        let cx = res[1].parse::<f64>().unwrap();
        let cy = res[2].parse::<f64>().unwrap();
        let period: usize = res[3].parse().unwrap();
        assert_eq!(period, 2, "period {}", period);
        assert!((cx + 1.0).abs() < 1e-12, "cx={}", cx);
        assert!(cy.abs() < 1e-12, "cy={}", cy);
    }

    #[test]
    fn find_minibrot_uses_full_precision_centre() {
        // The view centre carries far more digits than f64 can hold and the zoom
        // is past the f64 floor — `detect_period_f64` would truncate the centre
        // and fail, but the DBig ball method must still resolve period 2. This is
        // the whole point of the "deep" detector.
        // Offset from the c=-1 nucleus is ~5e-23, well inside the ball radius
        // (4·scale = 4e-22), but far beyond f64's reach.
        let mut nav = MandelbrotNavigator::new(
            "-0.99999999999999999999995",
            "0.00000000000000000000003",
            "1e-22",
            0.0,
        );
        let res = nav.find_minibrot(8192, 4.0);
        assert_eq!(res[0], "ok", "expected a hit at depth, got {:?}", res);
        assert_eq!(res[3].parse::<usize>().unwrap(), 2);
        let cx = res[1].parse::<f64>().unwrap();
        assert!((cx + 1.0).abs() < 1e-12, "cx={}", cx);
    }

    #[test]
    fn find_minibrot_resolves_far_beyond_view_scale() {
        // Regression for the "imprécis dès qu'on zoom" bug: Newton used to stop
        // refining once its step fell below the *view* scale, so the returned
        // nucleus carried no more accuracy than the current zoom level — fine
        // to display, but a few zoom steps later the (now-fixed) absolute error
        // dwarfs the much-smaller new scale and the view drifts off the
        // minibrot. The nucleus must instead be resolved close to the working
        // precision, i.e. far tighter than `scale`.
        let mut nav = MandelbrotNavigator::new("-1.0000003", "0.0000002", "1e-6", 0.0);
        let res = nav.find_minibrot(4096, 4.0);
        assert_eq!(res[0], "ok", "expected a hit, got {:?}", res);
        let cx = DBig::from_str(&res[1]).unwrap();
        let cy = DBig::from_str(&res[2]).unwrap();
        let offset_sq = (&cx + dbig_i(1)) * (&cx + dbig_i(1)) + &cy * &cy;
        let bound = DBig::from_str("1e-6").unwrap() * DBig::from_str("1e-20").unwrap();
        let bound_sq = &bound * &bound;
        assert!(
            offset_sq < bound_sq,
            "nucleus only resolved to view-scale precision: offset²={}",
            offset_sq
        );
    }

    #[test]
    fn minibrot_size_estimate_matches_period_three_island() {
        // The period-3 island on the real axis: nucleus ≈ -1.7548776662466927,
        // Λ real positive (the copy is upright and unrotated there).
        let cx = DBig::from_str("-1.7548776662466927").unwrap();
        let cy = DBig::from_str("0.0").unwrap();
        let (size_x, size_y) =
            minibrot_size_estimate(&cx, &cy, 3, 64).expect("size estimate should converge");
        let sx = dbig_to_f64(&size_x);
        let sy = dbig_to_f64(&size_y);
        assert!((sx - 0.019035515913).abs() < 1e-9, "Λ_re={}", sx);
        assert!(sy.abs() < 1e-9, "Λ_im={}", sy);
    }

    #[test]
    fn minibrot_size_estimate_is_one_for_the_whole_set() {
        // Period 1 is the main cardioid: the "copy" is the set itself, Λ = 1.
        let (size_x, size_y) =
            minibrot_size_estimate(&dbig_i(0), &dbig_i(0), 1, 64).expect("period 1 is trivial");
        assert!((dbig_to_f64(&size_x) - 1.0).abs() < 1e-12);
        assert!(dbig_to_f64(&size_y).abs() < 1e-12);
    }

    #[test]
    fn frame_scale_factor_fills_the_limiting_axis() {
        // Unrotated, square viewport: the box is 1.30 wide / 1.20 tall in |Λ|,
        // so the real axis limits and a 50 % fill needs half-height 2.6·|Λ|.
        let k = minibrot_frame_scale_factor(0.0, 0.0, 1.0, 0.5);
        assert!((k - 2.6).abs() < 1e-12, "k={}", k);
        // Wide viewport: the vertical axis limits instead.
        let wide = minibrot_frame_scale_factor(0.0, 0.0, 16.0 / 9.0, 0.5);
        assert!((wide - 2.4).abs() < 1e-12, "k={}", wide);
        // A copy rotated 90° relative to the view swaps the box extents.
        let quarter = minibrot_frame_scale_factor(std::f64::consts::FRAC_PI_2, 0.0, 1.0, 0.5);
        assert!((quarter - 2.6).abs() < 1e-12, "k={}", quarter);
        // …and a view rotated with it cancels back to the unrotated framing.
        let cancelled = minibrot_frame_scale_factor(
            std::f64::consts::FRAC_PI_2,
            std::f64::consts::FRAC_PI_2,
            16.0 / 9.0,
            0.5,
        );
        assert!((cancelled - 2.4).abs() < 1e-12, "k={}", cancelled);
    }

    #[test]
    fn find_minibrot_framed_centres_the_copy_and_sets_the_zoom() {
        // View sitting just off the period-3 island's nucleus.
        let mut nav = MandelbrotNavigator::new("-1.75487", "0.00001", "1e-3", 0.0);
        let res = nav.find_minibrot_framed(4096, 4.0, 0.5);
        assert_eq!(res[0], "ok", "expected a framed hit, got {:?}", res);
        assert_eq!(res[3].parse::<usize>().unwrap(), 3, "period {}", res[3]);

        let size = 0.019035515913_f64;
        let nucleus = -1.7548776662466927_f64;
        let cx = res[1].parse::<f64>().unwrap();
        let cy = res[2].parse::<f64>().unwrap();
        let scale = res[4].parse::<f64>().unwrap();
        // Centre = nucleus + Λ·(−0.75), i.e. left of the nucleus, on the body.
        assert!(
            (cx - (nucleus + MINIBROT_BOX_CENTRE * size)).abs() < 1e-9,
            "cx={}",
            cx
        );
        assert!(cy.abs() < 1e-9, "cy={}", cy);
        // No viewport aspect set ⇒ square ⇒ 2.6·|Λ| at 50 % fill.
        assert!((scale / (2.6 * size) - 1.0).abs() < 1e-6, "scale={}", scale);
    }

    #[test]
    fn find_minibrot_framed_reports_the_same_failures() {
        let mut nav = MandelbrotNavigator::new("0.4", "0.3", "1e-5", 0.0);
        let res = nav.find_minibrot_framed(4096, 4.0, 0.5);
        assert_eq!(res[0], "none", "expected no minibrot, got {:?}", res);
    }

    #[test]
    fn find_minibrot_returns_none_in_escaping_region() {
        // c = 0.4 escapes quickly: no atom under the view.
        let mut nav = MandelbrotNavigator::new("0.4", "0.3", "1e-5", 0.0);
        let res = nav.find_minibrot(4096, 4.0);
        assert_eq!(res[0], "none", "expected no minibrot, got {:?}", res);
    }

    // test string_to_dbig_to_string
    #[test]
    fn test_string_to_dbig_to_string() {
        let s = "3.141592653589793238462643383279502884197169399375105820974944592307816406286208998628034825342117";
        #[cfg(target_arch = "wasm32")]
        {
            log_1(&format!("Converting string to DBig and back: {}", s).into());
        }
        let bf = DBig::from_str(s).unwrap();
        #[cfg(target_arch = "wasm32")]
        {
            log_1(&format!("Converting string to DBig and back: {}", bf).into());
        }
        let result = bf.to_string();
        // dashu peut formater différemment, on vérifie juste que ça parse
        assert!(!result.is_empty());
    }

    #[test]
    fn zoom_then_step_increases_scale() {
        let mut nav = MandelbrotNavigator::new("-1.1000000000000001", "-0.20001", "0.5", 0.97);
        let before = dbig_to_f64(&nav.scale);
        nav.zoom(1.2);
        nav.step(None, None);

        let after = dbig_to_f64(&nav.scale);
        let expected = before * 1.2f64.powf(NAVIGATION_ZOOM_RATE as f64 / 60.0);
        assert!(
            after > before,
            "scale should increase after a zoom-out impulse"
        );
        assert!(
            ((after - expected) / expected).abs() < 1e-14,
            "scale should follow the f64 navigation factor: actual={}, expected={}",
            after,
            expected
        );
    }

    #[test]
    fn zoom_velocity_stays_outside_deep_precision_budget() {
        let mut nav = MandelbrotNavigator::new("-0.75", "0", "1e-100", 0.0);
        let scale_precision = nav.scale.precision();
        assert!(scale_precision > 300, "test requires a deep scale budget");
        assert!(nav.vscale.precision() < scale_precision);

        nav.zoom(1.2);
        let velocity_precision = nav.vscale.precision();
        nav.ensure_precision();
        assert_eq!(nav.vscale.precision(), velocity_precision);

        nav.step(None, None);
        assert_eq!(nav.scale.precision(), scale_precision);
        assert!(nav.vscale.precision() < nav.scale.precision());
    }

    // Bootstrap delta_time of the first step() on a fresh navigator.
    const BOOTSTRAP_DT: f64 = 1.0 / 60.0;

    fn displacement_factor_at(dt: f64) -> f64 {
        let k = std::f64::consts::LN_2 / NAVIGATION_DAMPING_HALF_LIFE_SECONDS;
        (1.0 - (-std::f64::consts::LN_2 * dt / NAVIGATION_DAMPING_HALF_LIFE_SECONDS).exp()) / k
    }

    #[test]
    fn one_frame_never_moves_the_centre_by_more_than_a_view_half_height() {
        // The previous guard compared |v|⁴ against 2·scale, so at depth it fired
        // ~1e21·scale too late and a velocity spike teleported the view.
        let mut nav = MandelbrotNavigator::new("-0.75", "0.0", "1e-30", 0.0);
        let before = nav.cx.clone();
        // Far beyond any keyboard impulse (moveStep is 0.01).
        nav.translate(10.0, 0.0);
        nav.step(None, None);

        let moved = dbig_to_f64(&((&nav.cx - &before).abs() / &nav.scale));
        assert!(
            moved <= 1.0 + 1e-9,
            "one frame moved {moved} view half-heights",
        );
    }

    #[test]
    fn a_realistic_keyboard_impulse_is_left_untouched_by_the_guard() {
        // The guard must sit above the velocity a held key actually reaches, so
        // re-arming it changes nothing about the pan feel.
        let mut nav = MandelbrotNavigator::new("-0.75", "0.0", "1e-30", 0.0);
        nav.translate(0.01, 0.0); // MandelbrotController's moveStep
        let requested = dbig_to_f64(&(&nav.vtx / &nav.scale));
        assert!(requested < 1.0 / displacement_factor_at(BOOTSTRAP_DT));

        nav.step(None, None);
        let after = dbig_to_f64(&(&nav.vtx / &nav.scale));
        let expected = requested
            * (-std::f64::consts::LN_2 * BOOTSTRAP_DT / NAVIGATION_DAMPING_HALF_LIFE_SECONDS).exp();
        assert!(
            ((after - expected) / expected).abs() < 1e-12,
            "the guard rescaled a normal impulse: {after} vs {expected}",
        );
    }

    #[test]
    fn precision_budget_matches_the_f64_round_trip_it_replaced() {
        for text in [
            "1", "0.5", "1e-5", "1e-28", "1e-100", "1e-300", "1e-320", "0",
        ] {
            let scale = DBig::from_str(text).unwrap();
            // The decimal-string round-trip this function used to perform.
            let legacy = {
                let v = scale.to_string().parse::<f64>().unwrap_or(0.0).abs();
                let depth = if v > 0.0 && v.is_finite() {
                    (-v.log2()).ceil().max(0.0) as usize
                } else {
                    4096
                };
                depth + 64
            };
            assert_eq!(precision_bits_for_scale(&scale), legacy, "scale {text}");
        }
    }

    #[test]
    fn pixel_to_complex_center_returns_origin() {
        // Center pixel of a 800×600 canvas should return the navigator's center
        let nav = MandelbrotNavigator::new(
            "-0.743643887037158704752191506114774",
            "0.131825904205311970493132056385139",
            "2.5",
            0.0,
        );
        let result = nav.pixel_to_complex(400.0, 300.0, 800.0, 600.0);
        assert_eq!(result.len(), 2);
        // Center pixel maps to cx, cy exactly
        let re: f64 = result[0].parse().unwrap();
        let im: f64 = result[1].parse().unwrap();
        assert!((re - (-0.7436438870371587)).abs() < 1e-10, "re={}", re);
        assert!((im - 0.1318259042053120).abs() < 1e-10, "im={}", im);
    }

    #[test]
    fn pixel_to_complex_preserves_precision() {
        // A very deep zoom: center has 50+ digits. The result should preserve them.
        let cx = "-0.7436438870371587047521915061147741580450975735832";
        let cy = "0.1318259042053119704931320563851394419890674940124";
        let nav = MandelbrotNavigator::new(cx, cy, "1e-40", 0.0);
        // Center pixel should return exact center
        let result = nav.pixel_to_complex(500.0, 500.0, 1000.0, 1000.0);
        // The result strings should be long (not truncated to 15 digits)
        assert!(result[0].len() > 20, "re string too short: {}", result[0]);
        assert!(result[1].len() > 20, "im string too short: {}", result[1]);
    }

    #[test]
    fn reference_orbit_preserves_precision_at_phase1_depth() {
        // Phase-1 floatexp target band (~1e-300). floatexp only removes the GPU
        // f32 delta-underflow wall; the reference orbit's precision still comes
        // from DBig here, so confirm a high-digit center survives the coordinate
        // math and reference-orbit recurrence at deep scale (no f64 truncation).
        let frac = "7436438870371587047521915061147741580450975735832".repeat(7); // ~343 digits
        let cx = format!("-0.{}", frac);
        let cy = format!("0.{}", frac);
        let mut nav = MandelbrotNavigator::new(&cx, &cy, "1e-300", 0.0);
        // Exercise the DBig orbit recurrence (a·a − b·b + c, etc.).
        let _ = nav.compute_reference_orbit_ptr(64);
        // The center must still be carried at full precision, not collapsed to ~17.
        let result = nav.pixel_to_complex(500.0, 500.0, 1000.0, 1000.0);
        assert!(
            result[0].len() > 200,
            "re truncated at 1e-300: {} chars",
            result[0].len()
        );
        assert!(
            result[1].len() > 200,
            "im truncated at 1e-300: {} chars",
            result[1].len()
        );
    }

    #[test]
    fn coordinate_to_pixel_reverses_correctly() {
        let cx = "-0.743643887037158704752191506114774";
        let cy = "0.131825904205311970493132056385139";
        let nav = MandelbrotNavigator::new(cx, cy, "2.5", 0.5); // some angle

        // Project center
        let px = nav.coordinate_to_pixel(cx, cy, 800.0, 600.0);
        assert!((px[0] - 400.0).abs() < 1e-10);
        assert!((px[1] - 300.0).abs() < 1e-10);

        // Project another point, then project it back
        let complex = nav.pixel_to_complex(120.0, 450.0, 800.0, 600.0);
        let px_back = nav.coordinate_to_pixel(&complex[0], &complex[1], 800.0, 600.0);
        assert!(
            (px_back[0] - 120.0).abs() < 1e-9,
            "expected 120, got {}",
            px_back[0]
        );
        assert!(
            (px_back[1] - 450.0).abs() < 1e-9,
            "expected 450, got {}",
            px_back[1]
        );
    }

    #[test]
    fn transition_interpolates_smoothly() {
        let mut nav = MandelbrotNavigator::new("0.0", "0.0", "2.0", 0.0);
        nav.start_transition("1.0", "2.0", "0.5", 1.0, 1.0); // duration = 1.0s

        assert!(nav.is_in_transition());

        // Call step with dt = 0.5 (halfway)
        // Set last_step_time first to control delta_time
        #[cfg(target_arch = "wasm32")]
        {
            nav.last_step_time = Some(js_sys::Date::now() - 500.0);
        }
        #[cfg(not(target_arch = "wasm32"))]
        {
            // step calculates delta_time. In test mode we can mock it or let it run.
            // Since step calculates delta_time from real elapsed time, we can manually set
            // elapsed or we can just test that calling step moves cx, cy, scale closer to target.
        }

        // Let's run a couple of step calls and verify it approaches the target
        let _ = nav.step(None, None);
        assert!(nav.is_in_transition());

        // Force transition completion
        nav.transition_elapsed = 1.0;
        let _ = nav.step(None, None);
        assert!(!nav.is_in_transition());
        assert_eq!(nav.cx.to_string(), "1");
        assert_eq!(nav.cy.to_string(), "2");
        assert_eq!(nav.scale.to_string(), "0.5");
        assert_eq!(nav.angle, 1.0);
    }

    // Video export drives the camera by exact 1/fps steps. A transition of
    // `duration` seconds must therefore land exactly on its target after
    // ceil(duration * fps) steps — no earlier (which would freeze the tail of
    // the shot) and no later (which would leave the last frame short of B).
    // Summing 1/fps in f64 need not reach `duration` exactly: whether it lands
    // depends on the fps/duration pair, so a single case proves nothing. A
    // shortfall of one ULP leaves the last frame short of B; an overshoot ends
    // the shot early and freezes its tail. Cover the combinations v1 actually
    // offers, including a full 30 s parcours at 900 frames.
    #[test]
    fn fixed_delta_transition_lands_exactly_on_target() {
        for (fps, duration) in [
            (30.0_f64, 2.0_f64),
            (30.0, 30.0),
            (30.0, 0.5),
            (60.0, 1.5),
            (60.0, 30.0),
            (24.0, 5.0),
            (25.0, 12.5),
            (24.0, 1.0 / 3.0),
        ] {
            let total_frames = (duration * fps).ceil() as usize;

            let mut nav = MandelbrotNavigator::new("0.0", "0.0", "2.0", 0.0);
            nav.start_transition("1.0", "2.0", "0.5", 1.0, duration);

            for frame in 0..total_frames {
                assert!(
                    nav.is_in_transition(),
                    "{} fps / {} s: transition ended early at frame {} of {}",
                    fps,
                    duration,
                    frame,
                    total_frames
                );
                let _ = nav.step_at_transition_time(None, None, frame as f64 / fps);
            }
            // The final frame sits AT the target: elapsed = total_frames / fps,
            // clamped to duration.
            let _ = nav.step_at_transition_time(None, None, total_frames as f64 / fps);

            assert!(
                !nav.is_in_transition(),
                "{} fps / {} s: still running after {} frames",
                fps,
                duration,
                total_frames
            );
            assert_eq!(nav.cx.to_string(), "1", "{} fps / {} s", fps, duration);
            assert_eq!(nav.cy.to_string(), "2", "{} fps / {} s", fps, duration);
            assert_eq!(nav.scale.to_string(), "0.5", "{} fps / {} s", fps, duration);
            assert_eq!(nav.angle, 1.0, "{} fps / {} s", fps, duration);
        }
    }

    // The same parcours stepped twice must produce the same parameters on every
    // frame — this is the property the whole export rests on.
    #[test]
    fn fixed_delta_stepping_is_reproducible() {
        let run = || {
            let mut nav = MandelbrotNavigator::new("-0.5", "0.6", "1.0", 0.0);
            nav.start_transition("-0.743643887037151", "0.13182590420533", "1e-9", 0.7, 1.0);
            let mut frames = Vec::new();
            for frame in 0..30 {
                let _ = nav.step_at_transition_time(None, None, frame as f64 / 30.0);
                frames.push(nav.get_params());
            }
            frames
        };
        assert_eq!(run(), run());
    }

    // A NaN delta would poison transition_elapsed permanently: every later
    // comparison against the duration would be false, so the transition could
    // never complete and the export would hang on its first frame.
    #[test]
    fn fixed_delta_clamps_non_finite_and_negative() {
        let mut nav = MandelbrotNavigator::new("0.0", "0.0", "2.0", 0.0);
        nav.start_transition("1.0", "2.0", "0.5", 1.0, 1.0);

        // One rule for every unusable input — NaN, either infinity, negative:
        // treat it as 0, i.e. do not advance. Never poison transition_elapsed,
        // and never jump the camera to a position the caller did not ask for.
        for bad in [f64::NAN, f64::INFINITY, f64::NEG_INFINITY, -1.0] {
            let _ = nav.step_at_transition_time(None, None, bad);
            assert_eq!(nav.transition_elapsed, 0.0, "input {}", bad);
            assert!(nav.is_in_transition(), "input {}", bad);
        }

        // A finite time beyond the duration clamps to the end rather than
        // overshooting, so the transition completes exactly on B.
        let _ = nav.step_at_transition_time(None, None, 99.0);
        assert!(!nav.is_in_transition());
        assert_eq!(nav.cx.to_string(), "1");
    }

    // Absolute placement means frames may be produced in any order and each one
    // is reproducible on its own — the property that makes a resumed or
    // re-rendered range identical to the original.
    #[test]
    fn fixed_delta_placement_is_order_independent() {
        let at = |elapsed: f64| {
            let mut nav = MandelbrotNavigator::new("-0.5", "0.6", "1.0", 0.0);
            nav.start_transition("-0.743643887037151", "0.13182590420533", "1e-9", 0.7, 1.0);
            let _ = nav.step_at_transition_time(None, None, elapsed);
            nav.get_params()
        };

        let mut forward = Vec::new();
        let mut nav = MandelbrotNavigator::new("-0.5", "0.6", "1.0", 0.0);
        nav.start_transition("-0.743643887037151", "0.13182590420533", "1e-9", 0.7, 1.0);
        for frame in 0..30 {
            let _ = nav.step_at_transition_time(None, None, frame as f64 / 30.0);
            forward.push(nav.get_params());
        }

        for frame in 0..30 {
            assert_eq!(
                forward[frame],
                at(frame as f64 / 30.0),
                "frame {} differs when rendered standalone",
                frame
            );
        }
    }

    #[test]
    fn export_transition_preserves_turns_and_linear_progress() {
        for turns in [-2.5, 2.5] {
            let mut nav = MandelbrotNavigator::new("0", "0", "1", 0.0);
            let target = turns * 2.0 * std::f64::consts::PI;
            nav.start_export_transition("0", "0", "1e-8", target, 4.0);
            nav.step_at_transition_time(None, None, 1.0);
            assert!((dbig_to_f64(&nav.scale) / 0.01 - 1.0).abs() < 1e-10);
            assert!((nav.angle - target * 0.25).abs() < 1e-12);
            nav.step_at_transition_time(None, None, 4.0);
            assert_eq!(nav.angle, target);
            let fixed = nav.get_params();
            nav.step_at_transition_time(None, None, 4.0);
            assert_eq!(fixed, nav.get_params());
        }
    }

    #[test]
    fn export_transition_preserves_subframe_duration() {
        let mut nav = MandelbrotNavigator::new("0", "0", "1", 0.0);
        nav.start_export_transition("0", "0", "0.5", 1.0, 0.001);
        nav.step_at_transition_time(None, None, 0.001);
        assert_eq!(nav.scale, DBig::from_str("0.5").unwrap());
        assert_eq!(nav.angle, 1.0);
    }

    #[test]
    fn export_transition_avoids_subnormal_ratio_rounding() {
        let mut nav = MandelbrotNavigator::new("0", "0", "1", 0.0);
        nav.start_export_transition("0", "0", "1e-320", 0.0, 2.0);
        nav.step_at_transition_time(None, None, 1.0);
        assert!((dbig_neg_log10(&nav.scale) - 160.0).abs() < 1e-10);
    }

    #[test]
    fn export_transition_crosses_a_thousand_decades_in_both_directions() {
        for (from, to) in [("1e10", "1e-1000"), ("1e-1000", "1e10")] {
            let mut nav = MandelbrotNavigator::new("0", "0", from, 0.0);
            nav.start_export_transition("0", "0", to, 0.0, 4.0);
            nav.step_at_transition_time(None, None, 2.0);
            assert!((dbig_neg_log10(&nav.scale) - 495.0).abs() < 1e-8);
            assert!(nav.scale > DBig::ZERO);
            nav.step_at_transition_time(None, None, 4.0);
            assert_eq!(nav.scale, DBig::from_str(to).unwrap());
        }
    }

    #[test]
    fn precision_scales_with_zoom_depth() {
        // Deepen the view step by step (like navigation) and nudge the center at
        // each depth. With precision scaling the center must keep digits down to
        // the scale instead of capping at a fixed budget (the old ~1e-95 cliff).
        let mut nav = MandelbrotNavigator::new("-0.5", "0.6", "1.0", 0.0);
        for k in 1..=60 {
            nav.scale(&format!("1e-{}", k * 2));
            nav.translate_direct(0.1234567891011, -0.2345678910, None, None);
        }
        let cx = nav.get_params()[0].clone();
        // ~1e-120 depth: the center must carry far more than the old ~95-digit
        // cap (the cliff was ~1e-95). Without precision scaling this caps low.
        assert!(cx.len() > 110, "center capped at {} chars", cx.len());
    }

    #[test]
    fn precision_not_reduced_on_zoom_out() {
        // Go deep (accumulate many center digits), then zoom back out. The center
        // must keep its digits — reducing precision on zoom-out corrupted it.
        let mut nav = MandelbrotNavigator::new("-0.5", "0.6", "1.0", 0.0);
        for k in 1..=50 {
            nav.scale(&format!("1e-{}", k * 2));
            nav.translate_direct(0.123456789, -0.234567891, None, None);
        }
        let deep_len = nav.get_params()[0].len();
        nav.scale("1e-2"); // zoom back out to a shallow scale
        nav.translate_direct(0.0, 0.0, None, None); // runs ensure_precision at shallow
        let shallow_len = nav.get_params()[0].len();
        assert!(
            shallow_len >= deep_len - 5,
            "center precision dropped on zoom-out: {} -> {}",
            deep_len,
            shallow_len
        );
    }

    #[test]
    fn bla_build_is_range_safe_at_deep_zoom() {
        // At deep zoom the merged BLA coefficient `a` grows huge and the radii
        // shrink far below the f32 range. The f64 build + fe storage must keep
        // every stored value finite and normalized (the old f32 build produced
        // Inf/NaN here), and the exponents must actually carry the range.
        let frac = "7436438870371587047521915061147741580450975735832".repeat(4);
        let cx = format!("-0.{}", frac);
        let cy = format!("0.{}", frac);
        let mut nav = MandelbrotNavigator::new(&cx, &cy, "1e-200", 0.0);
        nav.use_bla();
        let _ = nav.compute_reference_orbit_ptr(3000);
        let _ = nav.compute_bla_reference_ptr(3000);
        assert!(!nav.bla_result.is_empty());
        for st in nav.bla_result.iter() {
            assert!(
                st.ax.is_finite() && st.ay.is_finite() && st.bx.is_finite() && st.by.is_finite()
            );
            assert!(st.radius_alpha.is_finite() && st.radius_beta.is_finite());
            let abm = st
                .ax
                .abs()
                .max(st.ay.abs())
                .max(st.bx.abs())
                .max(st.by.abs());
            // [0.5, 1), but an f32 cast of a near-1 value can round up to 1.0.
            assert!(
                abm == 0.0 || (abm >= 0.5 && abm <= 1.0),
                "ab mantissa not normalized: {}",
                abm
            );
        }
        // The fe exponents are actually populated (not all zero) — the extraction
        // is doing real work, and would carry the range if the orbit expanded.
        assert!(nav
            .bla_result
            .iter()
            .any(|st| st.alpha_exp != 0 || st.ab_exp != 0));
    }

    // Brute-force reference orbit at a UNIFORM precision (no descending profile), as the
    // baseline the budget-profile orbit must match to f32.
    fn uniform_orbit(cx: &str, cy: &str, prec: usize, n: usize) -> Vec<(f32, f32)> {
        let two = DBig::try_from(2).unwrap();
        let rcx = DBig::from_str(cx).unwrap().with_precision(prec).value();
        let rcy = DBig::from_str(cy).unwrap().with_precision(prec).value();
        let threshold = DBig::try_from(1_000_000).unwrap();
        let mut zx = DBig::try_from(0).unwrap();
        let mut zy = DBig::try_from(0).unwrap();
        let mut out = vec![(0.0f32, 0.0f32)];
        for _ in 0..n {
            let mag = &zx * &zx + &zy * &zy;
            if mag > threshold {
                zx = DBig::try_from(0).unwrap();
                zy = DBig::try_from(0).unwrap();
            } else {
                let zxn = (&zx * &zx - &zy * &zy + &rcx).with_precision(prec).value();
                let zyn = (&two * &zx * &zy + &rcy).with_precision(prec).value();
                zx = zxn;
                zy = zyn;
            }
            out.push((dbig_to_f32(&zx), dbig_to_f32(&zy)));
        }
        out
    }

    #[test]
    fn descending_profile_matches_uniform_precision() {
        // Spec: Descending precision profile. The budget-profile orbit must agree with a
        // uniform full-precision orbit to f32 over the whole length — shedding earned bits
        // does not corrupt the stored reference.
        let cx = "-0.743643887037158704752191506114774";
        let cy = "0.131825904205311970493132056385139";
        let mut nav = MandelbrotNavigator::new(cx, cy, "1e-60", 0.0);
        let n = 3000usize;
        let _ = nav.compute_reference_orbit_ptr(n as u32);
        let baseline = uniform_orbit(cx, cy, nav.budget_prec, n);
        let mut max_err = 0.0f32;
        for i in 0..n.min(nav.result.len()).min(baseline.len()) {
            let dx = (nav.result[i].zx - baseline[i].0).abs();
            let dy = (nav.result[i].zy - baseline[i].1).abs();
            max_err = max_err.max(dx).max(dy);
        }
        assert!(
            max_err < 1e-3,
            "profile diverged from uniform precision: max_err={}",
            max_err
        );
    }

    #[test]
    fn descending_profile_sheds_bits_as_orbit_amplifies() {
        // Spec: precision sheds only earned bits; first step at full P. Drive the derivative
        // recurrence directly and check the profile is full at the start and strictly lower
        // once the orbit has amplified many bits.
        let budget = 1024usize;
        let mut der = FExpC::zero();
        let p_start = profile_precision(budget, der.log2_mag());
        assert_eq!(p_start, budget, "first step must use full budget P");
        // Amplify: iterate der on a point with |2Z|>1 so the derivative grows.
        for _ in 0..400 {
            der.step(0.9, 0.3);
        }
        let g = der.log2_mag();
        assert!(g > 50.0, "derivative did not amplify: G={}", g);
        let p_late = profile_precision(budget, g);
        assert!(
            p_late < budget,
            "precision did not shed after amplification: {}",
            p_late
        );
        assert!(
            p_late >= PRECISION_FLOOR_BITS,
            "precision dropped below floor: {}",
            p_late
        );
    }

    #[test]
    fn append_only_extension_preserves_earlier_steps() {
        // Spec: Append-only orbit growth. Extending in n must not alter already-computed steps,
        // and must equal a fresh navigator computed directly to the larger count.
        let cx = "-0.743643887037158704752191506114774";
        let cy = "0.131825904205311970493132056385139";
        let mut nav = MandelbrotNavigator::new(cx, cy, "1e-60", 0.0);
        let n1 = 800usize;
        let n2 = 2500usize;
        let _ = nav.compute_reference_orbit_ptr(n1 as u32);
        let snapshot: Vec<(f32, f32)> = (0..=n1)
            .map(|i| (nav.result[i].zx, nav.result[i].zy))
            .collect();
        let _ = nav.compute_reference_orbit_ptr(n2 as u32);
        for i in 0..=n1 {
            assert_eq!(
                nav.result[i].zx, snapshot[i].0,
                "step {} zx changed on extend",
                i
            );
            assert_eq!(
                nav.result[i].zy, snapshot[i].1,
                "step {} zy changed on extend",
                i
            );
        }
        let mut fresh = MandelbrotNavigator::new(cx, cy, "1e-60", 0.0);
        let _ = fresh.compute_reference_orbit_ptr(n2 as u32);
        for i in 0..=n2 {
            assert_eq!(
                nav.result[i].zx, fresh.result[i].zx,
                "extend != fresh at {} zx",
                i
            );
            assert_eq!(
                nav.result[i].zy, fresh.result[i].zy,
                "extend != fresh at {} zy",
                i
            );
        }
    }

    #[test]
    fn dbig_frexp_matches_reference_decomposition() {
        // value = mantissa · 2^exponent, |mantissa| ∈ [0.5, 1), for a range of magnitudes
        // including far below the f64 floor (deep zoom). Cross-check against a direct f64
        // reference where representable, and the invariant everywhere.
        let cases = [
            "1.0",
            "2.0",
            "0.5",
            "-0.5",
            "3.0",
            "-7.5",
            "0.7436438870371587047521915061147741580450975735832",
            "1e-30",
            "1e-100",
            "-1e-100",
            "1e-300",
            "5e-321",
        ];
        for s in cases {
            let v = DBig::from_str(s).unwrap();
            let (m, e) = dbig_frexp(&v);
            assert!(
                m == 0.0 || (m.abs() >= 0.5 && m.abs() < 1.0),
                "mantissa out of [0.5,1): {} for {}",
                m,
                s
            );
            // Reconstruct value ≈ m · 2^e and compare to the true value in log space.
            let log2_recon = m.abs().log2() + e as f64;
            // True log2 from the string: leading digits + decimal exponent.
            let f = s.trim_start_matches('-').parse::<f64>().unwrap_or(0.0);
            // Only cross-check where f64 itself is accurate (normal range); subnormals (e.g.
            // 5e-321) lose mantissa bits, so there the exact-DBig result is the more accurate one.
            if f.is_normal() {
                assert!(
                    (log2_recon - f.log2()).abs() < 1e-6,
                    "log2 mismatch for {}: {} vs {}",
                    s,
                    log2_recon,
                    f.log2()
                );
            }
        }
    }

    #[test]
    fn view_floatexp_matches_get_params_strings() {
        // The O(1) Rust decomposition must agree with parsing the decimal strings the host
        // used to do (frexpFromDecimalString). Compare scale's floatexp to a from-string frexp.
        let cx = "-0.743643887037158704752191506114774";
        let cy = "0.131825904205311970493132056385139";
        let nav = MandelbrotNavigator::new(cx, cy, "1e-120", 0.0);
        let fe = nav.view_floatexp();
        assert_eq!(fe.len(), 6);
        let (scale_m, scale_e) = dbig_frexp(&nav.scale);
        assert_eq!(fe[0], scale_m);
        assert_eq!(fe[1], scale_e as f64);
        // scale 1e-120 → log2 ≈ -398.6; exponent must be in that ballpark.
        assert!(
            (fe[1] - (-398.0)).abs() < 3.0,
            "scale exponent off: {}",
            fe[1]
        );
    }

    // ── Instrumentation: does the DBig BUDGET change the f32-stored reference
    // (hence der) at all? The user sees budget fix the deep-zoom DE; the model
    // says f32 storage (24 bits) caps der regardless. This compares the actual
    // f32 orbit the GPU would receive at a low vs high budget, and the der built
    // against each. Run: cargo test --release der_budget_f32_orbit_probe -- --ignored --nocapture
    #[test]
    #[ignore]
    fn der_budget_f32_orbit_probe() {
        let center = "-1.401155";
        let n = 8000usize;
        let read_f32 = |budget: &str| -> Vec<(f64, f64)> {
            let mut nav = MandelbrotNavigator::new(center, "0", "1e-30", 0.0);
            nav.set_precision_budget(budget);
            let _ = nav.compute_reference_orbit_ptr(n as u32);
            (0..nav.result.len())
                .map(|i| (nav.result[i].zx as f64, nav.result[i].zy as f64))
                .collect()
        };
        let budgets = ["1e-12", "1e-30", "1e-80", "1e-300"];
        let refs: Vec<(&str, Vec<(f64, f64)>)> =
            budgets.iter().map(|&b| (b, read_f32(b))).collect();
        let (_, gt) = &refs[refs.len() - 1]; // highest budget = ground truth
        println!(
            "\nf32-stored reference vs budget (center {}, N target {}):",
            center, n
        );
        for (b, orbit) in &refs {
            let len = orbit.len().min(gt.len());
            let (mut max_diff, mut first_div) = (0.0f64, None::<usize>);
            for i in 0..len {
                let d = ((orbit[i].0 - gt[i].0).powi(2) + (orbit[i].1 - gt[i].1).powi(2)).sqrt();
                if d > max_diff {
                    max_diff = d;
                }
                if first_div.is_none() && d > 1e-6 {
                    first_div = Some(i);
                }
            }
            // der against this f32 orbit for a deep pixel, phase + magnitude.
            let dc = (1e-40, 0.4e-40);
            let (mut dz, mut der, mut ref_i, mut iter) =
                ((0.0f64, 0.0f64), (0.0f64, 0.0f64), 0usize, 0usize);
            let ol = orbit.len();
            while iter < n && ref_i < ol - 1 {
                let z = orbit[ref_i];
                let fz = (z.0 + dz.0, z.1 + dz.1);
                der = (
                    2.0 * (fz.0 * der.0 - fz.1 * der.1) + 1.0,
                    2.0 * (fz.0 * der.1 + fz.1 * der.0),
                );
                let m2 = (
                    2.0 * z.0 * dz.0 - 2.0 * z.1 * dz.1,
                    2.0 * z.0 * dz.1 + 2.0 * z.1 * dz.0,
                );
                let sq = (dz.0 * dz.0 - dz.1 * dz.1, 2.0 * dz.0 * dz.1);
                dz = (m2.0 + sq.0 + dc.0, m2.1 + sq.1 + dc.1);
                ref_i += 1;
                iter += 1;
                let zc = orbit[ref_i];
                let full = (zc.0 + dz.0, zc.1 + dz.1);
                if full.0 * full.0 + full.1 * full.1 > 4.0 {
                    break;
                }
                let dz2 = dz.0 * dz.0 + dz.1 * dz.1;
                if full.0 * full.0 + full.1 * full.1 < dz2 {
                    dz = full;
                    ref_i = 0;
                }
            }
            let dmag = (der.0 * der.0 + der.1 * der.1).sqrt();
            let dphase = der.1.atan2(der.0);
            println!(
                "  budget {:>7}: len {:>5} | f32 orbit max|Δ| vs hi {:.2e} (first>1e-6 @ {:?}) | der |·|={:.4e} arg={:.6}",
                b, orbit.len(), max_diff, first_div, dmag, dphase
            );
        }
    }

    #[test]
    fn set_precision_budget_recomputes_and_deepens() {
        // Spec: Fixed precision budget — changing it triggers a full recompute and a deeper
        // target raises P.
        let cx = "-0.743643887037158704752191506114774";
        let cy = "0.131825904205311970493132056385139";
        let mut nav = MandelbrotNavigator::new(cx, cy, "1e-10", 0.0);
        let _ = nav.compute_reference_orbit_ptr(500);
        assert!(nav.last_iter > 0);
        let prec_before = nav.budget_prec;
        nav.set_precision_budget("1e-300");
        assert!(nav.budget_prec > prec_before, "deeper budget must raise P");
        assert_eq!(
            nav.last_iter, 0,
            "changing the budget must drop the orbit for recompute"
        );
        // And it rebuilds correctly from zero.
        let info = nav.compute_reference_orbit_ptr(500);
        assert_eq!(info.offset, 0, "recompute must restart at offset 0");
        assert!(nav.last_iter >= 500);
    }

    #[test]
    fn ders_compensated_accumulation_drift_harness() {
        // Spec: derS accumulates with compensated summation — GPU-free referee.
        // Simule la chaîne f32 exacte des mises à jour de derS (folds de renorm
        // 0.5·log(mm) ∈ [−18.4, 18.4] avec dérive vers ~161 ≈ derS à 1e-70,
        // plus folds d'exposant de bloc e·LN2 périodiques) de trois façons :
        // f32 naïf, paire (hi, lo) compensée par TwoSum (le miroir exact du
        // helper shader), et vérité terrain f64.
        const N: usize = 100_000;
        const TARGET: f32 = 161.0; // échelle de derS aux zooms 1e-70
        let ln2 = core::f32::consts::LN_2;

        // LCG déterministe : le harnais doit être reproductible.
        let mut state: u64 = 0x9E37_79B9_7F4A_7C15;
        let mut next_unit = move || -> f32 {
            state = state
                .wrapping_mul(6364136223846793005)
                .wrapping_add(1442695040888963407);
            // uniforme dans [0, 2)
            ((state >> 33) as f64 / (1u64 << 30) as f64) as f32
        };
        // TwoSum de Knuth, sans branche — évaluation identique au shader.
        let two_sum = |a: f32, b: f32| -> (f32, f32) {
            let s = a + b;
            let bv = s - a;
            let av = s - bv;
            (s, (a - av) + (b - bv))
        };
        let ulp_at = |x: f32| -> f64 {
            let x = x.abs().max(1.0);
            (f32::from_bits(x.to_bits() + 1) - x) as f64
        };

        let mut naive: f32 = 0.0;
        let mut hi: f32 = 0.0;
        let mut lo: f32 = 0.0;
        let mut truth: f64 = 0.0;
        let mut worst_comp_ulp = 0.0f64;
        let mut worst_naive_ulp = 0.0f64;
        println!("       N |      derS | naive err (ULP) | comp err (ULP)");
        for i in 1..=N {
            // Tous les ~97 updates, une application de bloc deep replie e·LN2 ;
            // sinon un fold de renorm dans [−18.4, 18.4]. Un rappel doux vers
            // la rampe 0→TARGET maintient derS dans la bande réaliste d'un
            // pixel profond (l'ULP du test est celui d'un derS ~1e-70).
            let ramp = TARGET * (i as f32) / (N as f32);
            let inc: f32 = if i % 97 == 0 {
                let e = ((next_unit() - 1.0) * 64.0) as i32;
                e as f32 * ln2
            } else {
                (next_unit() - 1.0) * 18.4 + (ramp - hi) * 0.05
            };
            naive += inc;
            let (s, err) = two_sum(hi, inc);
            hi = s;
            lo += err;
            truth += inc as f64;

            let folded = hi + lo; // la lecture shader : un seul add
            let u = ulp_at(truth as f32);
            let comp_ulp = ((folded as f64) - truth).abs() / u;
            let naive_ulp = ((naive as f64) - truth).abs() / u;
            worst_comp_ulp = worst_comp_ulp.max(comp_ulp);
            worst_naive_ulp = worst_naive_ulp.max(naive_ulp);
            if i % (N / 10) == 0 {
                println!(
                    "{:>8} | {:>9.3} | {:>15.1} | {:>14.3}",
                    i, truth, naive_ulp, comp_ulp
                );
            }
        }
        println!(
            "worst over the run: naive {:.1} ULP, compensated {:.3} ULP",
            worst_naive_ulp, worst_comp_ulp
        );
        // La somme compensée doit rester à quelques ULP de la vérité f64 sur
        // TOUT le parcours ; l'accumulateur naïf dérive d'un ordre au-dessus.
        assert!(
            worst_comp_ulp <= 4.0,
            "compensated derS drifted {:.2} ULP (> 4)",
            worst_comp_ulp
        );
        assert!(
            worst_naive_ulp > 10.0 * worst_comp_ulp.max(0.5),
            "naive drift ({:.2} ULP) unexpectedly small — harness shape no longer exercises the problem",
            worst_naive_ulp
        );
    }
}

#[cfg(test)]
mod gpu_bla_mirror {
    //! CPU mirror of the shader's shallow (f32) affine-BLA path, run against
    //! exact f32 perturbation on the same orbit and table, to measure how the
    //! serialized table behaves at several ε.
    use super::*;

    fn next_up(v: f32) -> f32 {
        next_up_f32(v)
    }
    fn next_down(v: f32) -> f32 {
        next_down_f32(v)
    }
    const NEG_INF: f32 = -3.4028234e38;
    const POS_INF: f32 = 3.4028234e38;

    fn log2_complex(x: f32, y: f32, exponent: i32) -> f32 {
        if !x.is_finite() || !y.is_finite() {
            return POS_INF;
        }
        let axis = x.abs().max(y.abs());
        if axis == 0.0 {
            return NEG_INF;
        }
        let sx = x / axis;
        let sy = y / axis;
        let norm2 = next_up(sx * sx + sy * sy);
        let angular = next_up(0.5 * next_up(norm2.log2()));
        let radial = next_up(axis.log2());
        next_up(next_up(radial + angular) + exponent as f32)
    }

    fn radius_log2(b: &BlaStep, log2dc: f32, log2dz: f32) -> f32 {
        let alpha = b.radius_alpha;
        let beta = b.radius_beta;
        if !(alpha > 0.0) || !alpha.is_finite() || !(beta >= 0.0) || !beta.is_finite() {
            return NEG_INF;
        }
        let ae = (alpha.to_bits() >> 23) & 255;
        let be = (beta.to_bits() >> 23) & 255;
        if ae > 0 && (b.alpha_exp as f32).abs() < 1_000_000.0 && (beta == 0.0 || be > 0) {
            let a = (ae as i32 - 127 + b.alpha_exp) as f32 - 2.0;
            let b_upper = (be as i32 - 126) as f32;
            if log2dz <= a && (beta == 0.0 || next_up(log2dc + b_upper) <= a) {
                return a;
            }
        }
        let log2_alpha = next_down(next_down(alpha.log2()) + b.alpha_exp as f32);
        if log2dc == NEG_INF || beta == 0.0 {
            return log2_alpha;
        }
        if log2dc.is_nan() || log2dc == POS_INF {
            return NEG_INF;
        }
        let log2_beta_dc = next_up(next_up(beta.log2()) + log2dc);
        let relative = next_up(log2_beta_dc - log2_alpha);
        if relative >= 0.0 {
            return NEG_INF;
        }
        let remaining = next_down(1.0 - next_up(relative.exp2()));
        if !(remaining > 0.0) || remaining.is_nan() {
            return NEG_INF;
        }
        next_down(log2_alpha + next_down(remaining.log2()))
    }

    fn cmul(a: (f32, f32), b: (f32, f32)) -> (f32, f32) {
        (a.0 * b.0 - a.1 * b.1, a.0 * b.1 + a.1 * b.0)
    }
    fn ldexp(x: f32, e: i32) -> f32 {
        x * 2f32.powi(e)
    }

    /// Returns (escape iteration or max_iter, loop turns, final |z|²).
    fn run_pixel(
        orbit: &[(f32, f32)],
        steps: &[BlaStep],
        levels: &[BlaLevel],
        dc: (f32, f32),
        max_iter: usize,
        mu: f32,
        use_bla: bool,
    ) -> (usize, usize) {
        let global_max = (orbit.len() - 1).min(max_iter) as i32;
        let mut dz = (0.0f32, 0.0f32);
        let mut ref_i: i32 = 0;
        let mut i: usize = 0;
        let mut turns = 0usize;
        let skip0log = if use_bla && !levels.is_empty() {
            (levels[0].skip.max(1)).trailing_zeros() as i32
        } else {
            0
        };
        let log_max_bla_r = if use_bla && !levels.is_empty() {
            f32::from_bits(levels[0].max_radius_bits).max(1e-30).log2()
        } else {
            NEG_INF
        };
        let log2dc = log2_complex(dc.0, dc.1, 0);
        while i < max_iter && ref_i < global_max {
            turns += 1;
            let mut skipped = 0i32;
            if use_bla && ref_i > 0 {
                let dz_mag = (dz.0 * dz.0 + dz.1 * dz.1).sqrt();
                if dz_mag < 1.2e-38 || dz_mag.log2() <= log_max_bla_r {
                    let log2dz = log2_complex(dz.0, dz.1, 0);
                    let shifted = ref_i - 1;
                    let mut level = ((levels.len() as i32) - 1)
                        .min((shifted as u32).trailing_zeros() as i32 - skip0log);
                    while level >= 0 {
                        let lv = &levels[level as usize];
                        let skip = lv.skip as i32;
                        let lv_max = f32::from_bits(lv.max_radius_bits).max(1e-30).log2();
                        if (dz_mag < 1.2e-38 || dz_mag.log2() <= lv_max)
                            && ref_i + skip <= global_max
                        {
                            let slot = shifted >> (skip0log + level);
                            if (slot as u32) < lv.count {
                                let b = &steps[(lv.offset as i32 + slot) as usize];
                                let r = radius_log2(b, log2dc, log2dz);
                                if r != NEG_INF && log2dz <= r {
                                    let cand = if b.ab_exp.abs() <= 120 {
                                        let a = (ldexp(b.ax, b.ab_exp), ldexp(b.ay, b.ab_exp));
                                        let bb = (ldexp(b.bx, b.ab_exp), ldexp(b.by, b.ab_exp));
                                        let m = cmul(a, dz);
                                        let n = cmul(bb, dc);
                                        (m.0 + n.0, m.1 + n.1)
                                    } else {
                                        // floatexp path: mantissa products, exponents summed.
                                        let m = cmul((b.ax, b.ay), dz);
                                        let n = cmul((b.bx, b.by), dc);
                                        (ldexp(m.0 + n.0, b.ab_exp), ldexp(m.1 + n.1, b.ab_exp))
                                    };
                                    let z = orbit[(ref_i + skip) as usize];
                                    let cz = (z.0 + cand.0, z.1 + cand.1);
                                    if cand.0.is_finite()
                                        && cand.1.is_finite()
                                        && !(skip > 1 && cz.0 * cz.0 + cz.1 * cz.1 > mu)
                                    {
                                        dz = cand;
                                        ref_i += skip;
                                        skipped = skip;
                                        break;
                                    }
                                }
                            }
                        }
                        level -= 1;
                    }
                }
            }
            if skipped > 0 {
                i += skipped as usize;
            } else {
                let z = orbit[ref_i as usize];
                let t = cmul(dz, z);
                let s = cmul(dz, dz);
                dz = (2.0 * t.0 + s.0 + dc.0, 2.0 * t.1 + s.1 + dc.1);
                ref_i += 1;
                i += 1;
            }
            let z = orbit[ref_i as usize];
            let full = (z.0 + dz.0, z.1 + dz.1);
            let z2 = full.0 * full.0 + full.1 * full.1;
            if z2 > mu {
                return (i, turns);
            }
            if z2 < dz.0 * dz.0 + dz.1 * dz.1 || ref_i == global_max {
                dz = full;
                ref_i = 0;
            }
        }
        (max_iter, turns)
    }

    fn run_pixel_f64(orbit: &[(f64, f64)], dc: (f64, f64), max_iter: usize) -> usize {
        let global_max = orbit.len() - 1;
        let (mut dz, mut ref_i, mut i) = ((0.0f64, 0.0f64), 0usize, 0usize);
        while i < max_iter && ref_i < global_max {
            let z = orbit[ref_i];
            let t = (dz.0 * z.0 - dz.1 * z.1, dz.0 * z.1 + dz.1 * z.0);
            let s = (dz.0 * dz.0 - dz.1 * dz.1, 2.0 * dz.0 * dz.1);
            dz = (2.0 * t.0 + s.0 + dc.0, 2.0 * t.1 + s.1 + dc.1);
            ref_i += 1;
            i += 1;
            let z = orbit[ref_i];
            let full = (z.0 + dz.0, z.1 + dz.1);
            let z2 = full.0 * full.0 + full.1 * full.1;
            if z2 > 4.0 {
                return i;
            }
            if z2 < dz.0 * dz.0 + dz.1 * dz.1 || ref_i == global_max {
                dz = full;
                ref_i = 0;
            }
        }
        max_iter
    }

    fn measure(name: &str, cx: &str, cy: &str, scale: &str, max_iter: u32, eps: f32) {
        let mut nav = MandelbrotNavigator::new(cx, cy, scale, 0.0);
        nav.use_bla();
        nav.set_bla_epsilon(eps);
        let _ = nav.compute_reference_orbit_ptr(max_iter);
        let info = nav.compute_bla_reference_ptr(max_iter);
        let orbit: Vec<(f32, f32)> = nav.result.iter().map(|s| (s.zx, s.zy)).collect();
        let steps: Vec<BlaStep> = nav.bla_result.iter().copied().collect();
        let levels: Vec<BlaLevel> = nav.bla_levels.iter().copied().collect();
        let scale_f = dbig_to_f64(&nav.scale) as f32;
        // f64 truth: same reference point iterated in f64 from the parsed decimal.
        let (cxf, cyf) = (cx.parse::<f64>().unwrap(), cy.parse::<f64>().unwrap());
        let mut orbit64 = Vec::with_capacity(orbit.len());
        let (mut zx, mut zy) = (0.0f64, 0.0f64);
        orbit64.push((zx, zy));
        for _ in 1..orbit.len() {
            let nx = zx * zx - zy * zy + cxf;
            let ny = 2.0 * zx * zy + cyf;
            zx = nx;
            zy = ny;
            orbit64.push((zx, zy));
        }
        let n = 48usize;
        let (mut mism, mut max_d, mut turns_exact, mut turns_bla) = (0usize, 0i64, 0u64, 0u64);
        let (mut mism_exact64, mut mism_bla64, mut sum_abs_exact, mut sum_abs_bla) =
            (0usize, 0usize, 0i64, 0i64);
        for gy in 0..n {
            for gx in 0..n {
                let tx = (gx as f32 / (n - 1) as f32) * 2.0 - 1.0;
                let ty = (gy as f32 / (n - 1) as f32) * 2.0 - 1.0;
                let dc = (tx * scale_f, ty * scale_f);
                let (ie, te) =
                    run_pixel(&orbit, &steps, &levels, dc, max_iter as usize, 4.0, false);
                let (ib, tb) = run_pixel(&orbit, &steps, &levels, dc, max_iter as usize, 4.0, true);
                let i64v = run_pixel_f64(&orbit64, (dc.0 as f64, dc.1 as f64), max_iter as usize);
                turns_exact += te as u64;
                turns_bla += tb as u64;
                if ie != ib {
                    mism += 1;
                    max_d = max_d.max((ie as i64 - ib as i64).abs());
                }
                if ie != i64v {
                    mism_exact64 += 1;
                    sum_abs_exact += (ie as i64 - i64v as i64).abs();
                }
                if ib != i64v {
                    mism_bla64 += 1;
                    sum_abs_bla += (ib as i64 - i64v as i64).abs();
                }
            }
        }
        println!(
            "[{name}] eps={eps:e} levels={} blocks={} | bla vs exact-f32: {mism}/{} max|Δ|={max_d} | vs f64 truth: exact-f32 {mism_exact64} (Σ|Δ|={sum_abs_exact}) bla {mism_bla64} (Σ|Δ|={sum_abs_bla}) | turns exact={turns_exact} bla={turns_bla} (x{:.1})",
            info.level_count,
            info.count,
            n * n,
            turns_exact as f64 / turns_bla.max(1) as f64
        );
    }

    /// Census (minutes): how the affine BLA compares with exact f32 stepping
    /// and with an f64 truth at several ε. The f64 truth parses the reference
    /// point as f64, so it is only meaningful while the view scale stays well
    /// above 1e-16. Measured 2026-09: at ε = 1e-3 the BLA disagrees with the
    /// f64 truth on 40 % of the pixels (exact f32: 20 %); from ε = 1e-6 down
    /// it matches exact f32 pixel for pixel while still skipping 2-7× fewer
    /// loop turns at 1e-12..1e-20.
    #[test]
    #[ignore]
    fn gpu_bla_mirror_census() {
        let eps_list: Vec<f32> = std::env::var("CENSUS_EPS")
            .map(|v| v.split(',').map(|e| e.parse().unwrap()).collect())
            .unwrap_or_else(|_| vec![1e-3, 1e-4, 1e-5, 1e-6, 1e-7]);
        for eps in eps_list {
            measure(
                "seahorse 1e-6",
                "-0.7436438870371587",
                "0.1318259042053119",
                "1e-6",
                4000,
                eps,
            );
            measure(
                "seahorse 1e-12",
                "-0.74364388703715870475",
                "0.13182590420531197",
                "1e-12",
                8000,
                eps,
            );
            measure(
                "seahorse 1e-20",
                "-0.743643887037158704752191506114774",
                "0.131825904205311970493870",
                "1e-20",
                20000,
                eps,
            );
        }
    }

    /// Compares the stored f32 reference orbit under two precision budgets
    /// (ORBIT_PREC_A, default "1e-30" like the viewer; ORBIT_PREC_B, default
    /// "1e-300") at ORBIT_CX/CY/SCALE for ORBIT_ITER steps: first divergent
    /// index and the orbit's closest passes to 0.
    #[test]
    #[ignore]
    fn orbit_precision_budget_divergence() {
        let env = |k: &str, d: &str| std::env::var(k).unwrap_or_else(|_| d.to_string());
        let (cx, cy, scale) = (env("ORBIT_CX", "-0.75"), env("ORBIT_CY", "0.1"), env("ORBIT_SCALE", "1e-11"));
        let iters: u32 = env("ORBIT_ITER", "20000").parse().unwrap();
        let mut orbits = Vec::new();
        for prec in [env("ORBIT_PREC_A", "1e-30"), env("ORBIT_PREC_B", "1e-300")] {
            let mut nav = MandelbrotNavigator::new(&cx, &cy, &scale, 0.0);
            nav.set_precision_budget(&prec);
            let _ = nav.compute_reference_orbit_ptr(iters);
            println!("budget {} -> {} bits, orbit len {}", prec, nav.budget_prec, nav.result.len());
            orbits.push(nav.result.iter().map(|s| (s.zx as f64, s.zy as f64)).collect::<Vec<_>>());
        }
        let (a, b) = (&orbits[0], &orbits[1]);
        if let Ok(list) = std::env::var("ORBIT_DUMP") {
            for i in list.split(',').map(|v| v.parse::<usize>().unwrap()) {
                println!("dump {} A=({:e},{:e}) B=({:e},{:e})", i, a[i].0, a[i].1, b[i].0, b[i].1);
            }
        }
        let mut first: Option<usize> = None;
        let mut worst = (0usize, 0.0f64);
        for i in 0..a.len().min(b.len()) {
            let d = ((a[i].0 - b[i].0).powi(2) + (a[i].1 - b[i].1).powi(2)).sqrt();
            let m = (b[i].0 * b[i].0 + b[i].1 * b[i].1).sqrt().max(1.0);
            if d / m > 1e-6 && first.is_none() { first = Some(i); }
            if d / m > worst.1 { worst = (i, d / m); }
        }
        println!("first divergence (rel > 1e-6): {:?}; worst rel {:e} at {}", first, worst.1, worst.0);
        let mut mins: Vec<(f64, usize)> = b.iter().enumerate().map(|(i, z)| ((z.0 * z.0 + z.1 * z.1).sqrt(), i)).collect();
        mins.sort_by(|x, y| x.0.partial_cmp(&y.0).unwrap());
        println!("closest passes to 0 (|Z|, index): {:?}", &mins[..8.min(mins.len())]);
        if let Some(i) = first {
            for k in i.saturating_sub(2)..(i + 3).min(a.len()) {
                println!("  {} A=({:e},{:e}) B=({:e},{:e})", k, a[k].0, a[k].1, b[k].0, b[k].1);
            }
        }
    }

    /// For a few pixels along the screen's vertical axis, compares the f32
    /// exact-perturbation kernel (CPU mirror, with rebasing) against an
    /// arbitrary-precision truth (a navigator anchored at the pixel itself).
    #[test]
    #[ignore]
    fn interior_false_escape_probe() {
        let env = |k: &str, d: &str| std::env::var(k).unwrap_or_else(|_| d.to_string());
        let (cx, cy, scale) = (env("ORBIT_CX", "-0.75"), env("ORBIT_CY", "0.1"), env("ORBIT_SCALE", "1e-11"));
        let iters: u32 = env("ORBIT_ITER", "20000").parse().unwrap();
        let mu: f32 = env("ORBIT_MU", "4").parse().unwrap();
        let mut nav = MandelbrotNavigator::new(&cx, &cy, &scale, 0.0);
        nav.set_precision_budget("1e-30");
        let _ = nav.compute_reference_orbit_ptr(iters);
        let orbit: Vec<(f32, f32)> = nav.result.iter().map(|s| (s.zx, s.zy)).collect();
        let scale_d = DBig::from_str(&scale).unwrap();
        let scale_f = dbig_to_f64(&nav.scale) as f32;
        let (mut w, mut h) = (32usize, 14usize);
        let aspect: f32 = env("ORBIT_ASPECT", "1.7778").parse().unwrap();
        let truth_prec = env("ORBIT_TRUTH_PREC", "1e-30");
        let mut grid: Vec<(f32, f32)> = Vec::new();
        if let Ok(list) = std::env::var("ORBIT_POINTS") {
            // "tx,ty;tx,ty" in half-height units (x already scaled by aspect).
            for pt in list.split(';') {
                let mut it = pt.split(',');
                grid.push((it.next().unwrap().parse().unwrap(), it.next().unwrap().parse().unwrap()));
            }
            w = grid.len(); h = 1;
        } else {
            for gy in 0..h { for gx in 0..w {
                grid.push(((gx as f32 / (w - 1) as f32 * 2.0 - 1.0) * aspect, gy as f32 / (h - 1) as f32 * 2.0 - 1.0));
            } }
        }
        let mut rows: Vec<String> = vec![String::new(); h];
        for (k, &(tx, ty)) in grid.iter().enumerate() {
            let dc = (tx * scale_f, ty * scale_f);
            let (ie, _) = run_pixel(&orbit, &[], &[], dc, iters as usize, mu, false);
            // Truth: high-precision orbit of the pixel itself.
            let px = &nav.cx + &scale_d * DBig::from_str(&format!("{}", tx)).unwrap();
            let py = &nav.cy + &scale_d * DBig::from_str(&format!("{}", ty)).unwrap();
            let mut truth = MandelbrotNavigator::new(&px.to_string(), &py.to_string(), &scale, 0.0);
            truth.set_precision_budget(&truth_prec);
            let _ = truth.compute_reference_orbit_ptr(iters);
            let esc = truth.result.iter().position(|z| z.zx * z.zx + z.zy * z.zy > mu).unwrap_or(iters as usize);
            if h == 1 { println!("point ({:+.3},{:+.3}) budget {} ({} bits): kernel {} truth {}", tx, ty, truth_prec, truth.budget_prec, ie, esc); }
            let sym = if esc >= iters as usize && ie >= iters as usize { '#' }
                else if esc >= iters as usize { 'K' }        // kernel escapes, truth inside
                else if ie >= iters as usize { 'T' }         // truth escapes, kernel inside
                else if (ie as i64 - esc as i64).abs() > 50 { 'x' } else { '.' };
            rows[k / w].push(sym);
        }
        println!("# inside both  . escape both  K kernel-only escape  T truth-only escape  x count differs");
        for r in rows { println!("{}", r); }
    }

    /// Prints an ASCII map of where the BLA deviates from the f64 truth by
    /// more than 50 iterations (the reference sits at the centre).
    #[test]
    #[ignore]
    fn gpu_bla_mirror_map() {
        let env = |k: &str, d: &str| std::env::var(k).unwrap_or_else(|_| d.to_string());
        let cx_s = env("MAP_CX", "-0.74364388703715870475");
        let cy_s = env("MAP_CY", "0.13182590420531197");
        let scale_s = env("MAP_SCALE", "1e-11");
        let max_iter: u32 = env("MAP_ITER", "20000").parse().unwrap();
        let eps: f32 = env("MAP_EPS", "1e-8").parse().unwrap();
        let span: f32 = env("MAP_SPAN", "1").parse().unwrap();
        let mu: f32 = env("MAP_MU", "4").parse().unwrap();
        let (cx, cy, scale) = (cx_s.as_str(), cy_s.as_str(), scale_s.as_str());
        let mut nav = MandelbrotNavigator::new(cx, cy, scale, 0.0);
        nav.use_bla();
        nav.set_bla_epsilon(eps);
        // MAP_PREC mirrors the viewer's precisionBudget setting (default "1e-30").
        if let Ok(prec) = std::env::var("MAP_PREC") {
            nav.set_precision_budget(&prec);
        }
        let _ = nav.compute_reference_orbit_ptr(max_iter);
        let info = nav.compute_bla_reference_ptr(max_iter);
        let orbit: Vec<(f32, f32)> = nav.result.iter().map(|s| (s.zx, s.zy)).collect();
        let steps: Vec<BlaStep> = nav.bla_result.iter().copied().collect();
        let levels: Vec<BlaLevel> = nav.bla_levels.iter().copied().collect();
        for (l, lv) in levels.iter().enumerate() {
            println!(
                "level {} skip {} count {} maxRadius {:e}",
                l,
                lv.skip,
                lv.count,
                f32::from_bits(lv.max_radius_bits)
            );
        }
        println!("orbit len {} blocks {}", orbit.len(), info.count);
        let scale_f = dbig_to_f64(&nav.scale) as f32;
        let (cxf, cyf) = (cx.parse::<f64>().unwrap(), cy.parse::<f64>().unwrap());
        let mut orbit64 = vec![(0.0f64, 0.0f64)];
        for _ in 1..orbit.len() {
            let (zx, zy) = *orbit64.last().unwrap();
            orbit64.push((zx * zx - zy * zy + cxf, 2.0 * zx * zy + cyf));
        }
        let (w, h) = (72usize, 36usize);
        let (mut bad_bla, mut bad_exact) = (0usize, 0usize);
        for gy in 0..h {
            let mut row = String::new();
            for gx in 0..w {
                let tx = (gx as f32 / (w - 1) as f32) * 2.0 - 1.0;
                let ty = (gy as f32 / (h - 1) as f32) * 2.0 - 1.0;
                let dc = (tx * scale_f * span, ty * scale_f * span);
                let (ie, _) = run_pixel(&orbit, &steps, &levels, dc, max_iter as usize, mu, false);
                let (ib, _) = run_pixel(&orbit, &steps, &levels, dc, max_iter as usize, mu, true);
                let truth =
                    run_pixel_f64(&orbit64, (dc.0 as f64, dc.1 as f64), max_iter as usize) as i64;
                let db = (ib as i64 - truth).abs();
                let de = (ie as i64 - truth).abs();
                if db > 50 {
                    bad_bla += 1;
                }
                if de > 50 {
                    bad_exact += 1;
                }
                row.push(if db > 50 && de <= 50 {
                    '#'
                } else if db > 50 {
                    'x'
                } else if de > 50 {
                    'e'
                } else {
                    '.'
                });
            }
            println!("{}", row);
        }
        println!(
            "bad pixels (|Δ|>50): bla {} exact-f32 {} of {}",
            bad_bla,
            bad_exact,
            w * h
        );
    }

    /// Regression guard (seconds): at the default ε the BLA must be as close
    /// to the f64 truth as exact f32 stepping is, on a shallow view where that
    /// truth is valid.
    #[test]
    fn default_epsilon_keeps_bla_as_accurate_as_exact_f32() {
        let (cx, cy, scale, max_iter) = (
            "-0.74364388703715870475",
            "0.13182590420531197",
            "1e-12",
            8000u32,
        );
        let mut nav = MandelbrotNavigator::new(cx, cy, scale, 0.0);
        nav.use_bla();
        let eps = nav.get_bla_epsilon();
        let _ = nav.compute_reference_orbit_ptr(max_iter);
        let _ = nav.compute_bla_reference_ptr(max_iter);
        let orbit: Vec<(f32, f32)> = nav.result.iter().map(|s| (s.zx, s.zy)).collect();
        let steps: Vec<BlaStep> = nav.bla_result.iter().copied().collect();
        let levels: Vec<BlaLevel> = nav.bla_levels.iter().copied().collect();
        let scale_f = dbig_to_f64(&nav.scale) as f32;
        let (cxf, cyf) = (cx.parse::<f64>().unwrap(), cy.parse::<f64>().unwrap());
        let mut orbit64 = vec![(0.0f64, 0.0f64)];
        for _ in 1..orbit.len() {
            let (zx, zy) = *orbit64.last().unwrap();
            orbit64.push((zx * zx - zy * zy + cxf, 2.0 * zx * zy + cyf));
        }
        let n = 24usize;
        let (mut exact_err, mut bla_err, mut turns_exact, mut turns_bla) = (0i64, 0i64, 0u64, 0u64);
        for gy in 0..n {
            for gx in 0..n {
                let tx = (gx as f32 / (n - 1) as f32) * 2.0 - 1.0;
                let ty = (gy as f32 / (n - 1) as f32) * 2.0 - 1.0;
                let dc = (tx * scale_f, ty * scale_f);
                let (ie, te) =
                    run_pixel(&orbit, &steps, &levels, dc, max_iter as usize, 4.0, false);
                let (ib, tb) = run_pixel(&orbit, &steps, &levels, dc, max_iter as usize, 4.0, true);
                let truth =
                    run_pixel_f64(&orbit64, (dc.0 as f64, dc.1 as f64), max_iter as usize) as i64;
                exact_err += (ie as i64 - truth).abs();
                bla_err += (ib as i64 - truth).abs();
                turns_exact += te as u64;
                turns_bla += tb as u64;
            }
        }
        // Escape iterations in a chaotic region differ by f32 rounding noise
        // between any two correct evaluations; a 1.5× budget absorbs that
        // sampling noise while a loose ε (1e-3 measured 2× here, 8× shallower)
        // still trips it.
        assert!(
            bla_err * 2 <= exact_err * 3,
            "ε={:e}: BLA Σ|Δiter| {} vs exact f32 {}",
            eps,
            bla_err,
            exact_err
        );
        assert!(
            turns_bla * 3 < turns_exact * 2,
            "BLA no longer skips: {turns_bla} vs {turns_exact} turns"
        );
    }
}
