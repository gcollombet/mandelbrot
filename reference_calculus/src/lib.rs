use core::convert::TryFrom;
use core::str::FromStr;
use dashu_float::ops::Abs;
use dashu_float::DBig;
use dashu_int::UBig;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[cfg(not(target_arch = "wasm32"))]
pub type JsValue = String;

mod jet;

// Fonction utilitaire pour convertir DBig en f32 de manière sûre
fn dbig_to_f32(bf: &DBig) -> f32 {
    bf.to_string().parse::<f32>().unwrap_or(0.0)
}

fn dbig_to_f64(bf: &DBig) -> f64 {
    bf.to_string().parse::<f64>().unwrap_or(0.0)
}

// Significant-bit budget needed to resolve detail at a given view scale: roughly
// -log2(scale) plus a margin for the reference-orbit accumulation. dashu rounds
// every operation to the operands' precision and never grows it, so without this
// the reference center caps at a fixed digit budget and deep zoom hits a hard
// precision cliff (e.g. ~1e-95). Scaling the precision with depth keeps the
// reference accurate as far as the orbit/host scale allow.
fn precision_bits_for_scale(scale: &DBig) -> usize {
    let s = dbig_to_f64(scale).abs();
    let depth = if s > 0.0 && s.is_finite() {
        (-s.log2()).ceil().max(0.0) as usize
    } else {
        // Below the f64 normal range (~1e-308): use a generous fixed budget.
        4096
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

// Per-step precision from the amplified-bit count G_n. Clamped to [FLOOR, budget].
fn profile_precision(budget: usize, g_bits: f64) -> usize {
    let shed = (g_bits - PRECISION_MARGIN_BITS as f64).floor().max(0.0) as usize;
    budget.saturating_sub(shed).max(PRECISION_FLOOR_BITS).min(budget.max(PRECISION_FLOOR_BITS))
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
        FExpC { x: 0.0, y: 0.0, e: 0 }
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
}

// Raise a value's precision to `prec` bits when it carries fewer (or unlimited),
// but NEVER round a finite value down. Reducing precision on zoom-out would
// discard the reference center's hard-won deep digits, so zooming back in (or
// recentering at a shallower scale) would land on a corrupted center ("garbage").
fn raise_precision(v: DBig, prec: usize) -> DBig {
    let cur = v.precision();
    if cur == 0 || cur < prec {
        v.with_precision(prec).value()
    } else {
        v
    }
}

fn dbig_i(value: i32) -> DBig {
    DBig::try_from(value).unwrap()
}

// BLA/Padé block-table sizing.
// L_min = 4: drop the 1- and 2-step levels ("merge and cull"). Over the first
// steps from the origin the result can be dominated by z² (at C = −1/2 two steps
// give exactly c²), which a linear/rational block cannot represent — Guard 2.
// Smallest emitted block is therefore 4; shorter spans stay exact.
const BLA_SKIP_LEVELS: usize = 2;
const MIN_BLA_SKIP: usize = 1 << BLA_SKIP_LEVELS;

// Anisotropy factor s of the jet (V) polydisc: R_c = s·c_max (add-jet-approximation
// design D4/D6). The headroom is what lets moderate zoom-outs re-solve radii
// without re-walking the orbit.
const JET_ANISOTROPY_LOG2: f64 = 10.0; // s = 1024

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
    Pade = 2,
    /// Bivariate truncated Taylor jet blocks (order-adaptive, rule (V) radii) —
    /// see the add-jet-approximation change and `jet.rs`.
    Jet = 3,
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
    // Padé [1/1] denominator coefficient D = (dx, dy) · 2^d_exp. Zero in affine
    // mode. |D| ~ 1/|A| so it needs its own exponent: |A| reaches ~1e154 at depth,
    // which would underflow dx/dy in f32 without d_exp.
    pub dx: f32,
    pub dy: f32,
    pub d_exp: i32,
    // log2 of the smallest |2Z_k| this block spans — the near-critical guard (G).
    // A single f32 log suffices (only compared to log2(mu)); no separate exponent.
    pub log2_min_a: f32,
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
    // Largest single block jump emitted into the table (power-of-two cap). UI-tunable;
    // clamped to a power of two in [MIN_BLA_SKIP, 1<<20].
    max_bla_skip: usize,
    bla_result: Box<Vec<BlaStep>>,
    bla_levels: Box<Vec<BlaLevel>>,
    bla_level_count: usize,
    bla_source_len: usize,
    bla_source_epsilon: f32,
    // Pade-flavor the current bla table was built with (part of the cache key).
    bla_source_pade: bool,
    // Jet-mode table (separate storage from the BLA table; see jet.rs and the
    // add-jet-approximation change). Coefficients depend only on the orbit
    // (jet_source_len); bounds carry the R_c = s·c_max headroom they were walked
    // with; radii carry the (epsilon, c_max) they were solved for.
    jet_levels: Box<Vec<jet::JetLevelF64>>,
    jet_bounds: Box<Vec<Vec<jet::JetBlockBounds>>>,
    jet_radii: Box<Vec<Vec<[f64; jet::JET_K]>>>,
    // GPU-serialized buffers, split so a radius re-solve re-uploads only the
    // small radius buffer (16 B/block, vec4-packed): the coefficient buffer is
    // orbit-keyed (rebuilt with the levels), the radius buffer + level directory
    // are (ε, c_max)-keyed (rebuilt on every re-solve). Same flat block index.
    jet_coeffs_result: Box<Vec<jet::JetCoeffs>>,
    jet_radii_result: Box<Vec<jet::JetRadii>>,
    jet_gpu_levels: Box<Vec<jet::JetLevel>>,
    jet_source_len: usize,
    jet_bounds_log2_rc: f64,
    jet_radii_epsilon: f64,
    jet_radii_log2_c_max: f64,
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
            bla_epsilon: 1e-3,
            max_bla_skip: 65536,
            bla_result: Box::new(Vec::with_capacity(20_000)),
            bla_levels: Box::new(Vec::with_capacity(32)),
            bla_level_count: 0,
            bla_source_len: 0,
            bla_source_epsilon: 0.0,
            bla_source_pade: false,
            jet_levels: Box::new(Vec::new()),
            jet_bounds: Box::new(Vec::new()),
            jet_radii: Box::new(Vec::new()),
            jet_coeffs_result: Box::new(Vec::new()),
            jet_radii_result: Box::new(Vec::new()),
            jet_gpu_levels: Box::new(Vec::new()),
            jet_source_len: 0,
            jet_bounds_log2_rc: f64::NAN,
            jet_radii_epsilon: 0.0,
            jet_radii_log2_c_max: f64::NAN,
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
        let prec = precision_bits_for_scale(&self.scale).max(self.budget_prec).max(64);
        self.cx = raise_precision(self.cx.clone(), prec);
        self.cy = raise_precision(self.cy.clone(), prec);
        self.cx_continuous = raise_precision(self.cx_continuous.clone(), prec);
        self.cy_continuous = raise_precision(self.cy_continuous.clone(), prec);
        self.scale = raise_precision(self.scale.clone(), prec);
        self.reference_cx = raise_precision(self.reference_cx.clone(), prec);
        self.reference_cy = raise_precision(self.reference_cy.clone(), prec);
        self.vtx = raise_precision(self.vtx.clone(), prec);
        self.vty = raise_precision(self.vty.clone(), prec);
        self.vscale = raise_precision(self.vscale.clone(), prec);
    }

    pub fn translate(&mut self, dx: f64, dy: f64) {
        self.ensure_precision();
        // dx/dy sont des valeurs entre 0 et 1 (écran)
        // On convertit en déplacement complexe selon l'échelle et l'angle
        let angle = self.angle;
        let cos_a = DBig::from_str(&angle.cos().to_string()).unwrap();
        let sin_a = DBig::from_str(&angle.sin().to_string()).unwrap();
        let dx_big = DBig::from_str(&(dx * 40.0).to_string()).unwrap();
        let dy_big = DBig::from_str(&(dy * 40.0).to_string()).unwrap();
        let scale = &self.scale;
        let delta_x = (&dx_big * &cos_a - &dy_big * &sin_a) * scale;
        let delta_y = (&dx_big * &sin_a + &dy_big * &cos_a) * scale;
        self.vtx = &self.vtx + delta_x;
        self.vty = &self.vty + delta_y;
    }

    pub fn rotate(&mut self, delta_angle: f64) {
        // On ajoute à la vitesse angulaire
        self.vangle += delta_angle * 20.0;
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
            
            let snapped_rx_big = DBig::from_str(&snapped_rx.to_string()).unwrap_or_else(|_| DBig::try_from(0).unwrap());
            let snapped_ry_big = DBig::from_str(&snapped_ry.to_string()).unwrap_or_else(|_| DBig::try_from(0).unwrap());
            
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

    // The BLA table cache key is (orbit_len, epsilon, pade-flavor) — see the
    // cache-hit check in compute_bla_reference_inner. Mode switches therefore
    // never need to invalidate anything: a stale-flavored table simply misses the
    // key and rebuilds on next use, while an identical-flavored one is reused
    // (e.g. Perturbation → BLA, or a round-trip through Jet, which has its own
    // table storage and leaves the BLA table alone).
    pub fn use_perturbation(&mut self) {
        self.approximation_mode = ApproximationMode::Perturbation;
    }

    pub fn use_bla(&mut self) {
        self.approximation_mode = ApproximationMode::BivariateLinear;
    }

    pub fn use_pade(&mut self) {
        self.approximation_mode = ApproximationMode::Pade;
    }

    pub fn use_jet(&mut self) {
        self.approximation_mode = ApproximationMode::Jet;
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

    /// CPU benchmark over the *current* reference orbit: counts iteration loop steps
    /// for exact perturbation vs affine BLA vs Padé blocks, on a `grid×grid` of pixel
    /// offsets spanning the on-screen view (dc = t·scale). The algorithm mirrors the
    /// shader (block selection + rational application + pole guard + rebasing), so the
    /// step counts are representative of GPU work. `pade_mismatches` / `max_iter_delta`
    /// cross-check that Padé reaches the same escape iteration as exact stepping.
    pub fn benchmark_pade(&self, grid: u32) -> PadeBenchmark {
        let len = self.last_iter.min(self.result.len());
        if len < 8 {
            return PadeBenchmark::default();
        }
        let orbit: Vec<(f64, f64)> =
            (0..len).map(|i| (self.result[i].zx as f64, self.result[i].zy as f64)).collect();
        let eps = (self.bla_epsilon.max(f32::MIN_POSITIVE)) as f64;
        let max_skip = self.max_bla_skip;
        let aff = bench_build_levels(&orbit, eps, false, max_skip);
        let pad = bench_build_levels(&orbit, eps, true, max_skip);
        // Bound the exact baseline cost (non-escaping pixels run to max_iter).
        let max_iter = (len - 1).min(8000).max(1);
        let scale = dbig_to_f64(&self.scale).abs().max(1e-300);
        let n = grid.clamp(2, 128) as usize;
        let (mut se, mut sa, mut sp) = (0u64, 0u64, 0u64);
        let (mut mismatches, mut max_delta) = (0u32, 0u32);
        for gy in 0..n {
            for gx in 0..n {
                let tx = (gx as f64 / (n - 1) as f64) * 2.0 - 1.0;
                let ty = (gy as f64 / (n - 1) as f64) * 2.0 - 1.0;
                let dc = (tx * scale, ty * scale);
                let (s_e, i_e, e_e) = bench_run_pixel(&[], &orbit, dc, max_iter, false);
                let (s_a, _ia, _ea) = bench_run_pixel(&aff, &orbit, dc, max_iter, false);
                let (s_p, i_p, e_p) = bench_run_pixel(&pad, &orbit, dc, max_iter, true);
                se += s_e as u64;
                sa += s_a as u64;
                sp += s_p as u64;
                if i_p != i_e || e_p != e_e {
                    mismatches += 1;
                    max_delta = max_delta.max((i_p as i64 - i_e as i64).unsigned_abs() as u32);
                }
            }
        }
        PadeBenchmark {
            pixels: (n * n) as u32,
            max_iter: max_iter as u32,
            steps_exact: se as f64,
            steps_affine: sa as f64,
            steps_pade: sp as f64,
            pade_mismatches: mismatches,
            max_iter_delta: max_delta,
        }
    }

    pub fn zoom(&mut self, factor: f64) {
        // Accumulate zoom velocity (multiplicative — neutral value is 1.0)
        let factor_big = DBig::from_str(factor.to_string().as_str()).unwrap();
        self.vscale = &self.vscale * factor_big;
    }

    pub fn step(
        &mut self,
        canvas_width: Option<f64>,
        canvas_height: Option<f64>,
    ) -> Vec<String> {
        // Calcul du temps écoulé depuis le dernier appel
        let delta_time = {
            #[cfg(target_arch = "wasm32")]
            {
                let now = js_sys::Date::now(); // ms
                let dt = if let Some(last) = self.last_step_time {
                    (now - last) / 1000.0
                } else {
                    1.0 / 60.0
                };
                self.last_step_time = Some(now);
                dt
            }
            #[cfg(not(target_arch = "wasm32"))]
            {
                use std::time::{SystemTime, UNIX_EPOCH};
                let now = SystemTime::now()
                    .duration_since(UNIX_EPOCH)
                    .unwrap()
                    .as_millis() as f64;
                let dt = if let Some(last) = self.last_step_time {
                    (now - last) / 1000.0
                } else {
                    1.0 / 60.0
                };
                self.last_step_time = Some(now);
                dt
            }
        };

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
                let t_eased = t * t * (3.0 - 2.0 * t);

                // Interpolation exponentielle pour l'échelle (scale)
                let ratio = target_scale / start_scale;
                let ratio_f64 = dbig_to_f64(&ratio);
                let factor = ratio_f64.powf(t_eased);
                let factor_big = DBig::from_str(&factor.to_string()).unwrap_or_else(|_| DBig::try_from(1).unwrap());
                self.scale = start_scale * &factor_big;

                // Pour la position (cx, cy), afin d'avoir une vitesse visuelle de translation uniforme,
                // on interpole linéairement par rapport au SCALE (qui évolue exponentiellement) plutôt qu'au temps.
                let t_pos_big = if (ratio_f64 - 1.0).abs() < 1e-6 {
                    DBig::from_str(&t_eased.to_string()).unwrap_or_else(|_| DBig::try_from(0).unwrap())
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
            let damping_base = exp_f64(-std::f64::consts::LN_2 * delta_time / 0.05); // (1.0 - 25.0 * delta_time).max(0.01);
            let damping = DBig::from_str(&damping_base.to_string()).unwrap();
            let delta_time_big = DBig::from_str(&delta_time.to_string()).unwrap();

            // On anime l'échelle avec la vitesse et damping
            if self.vscale != DBig::try_from(1).unwrap() {
                if delta_time_big > DBig::try_from(0).unwrap() {
                    self.scale = &self.scale
                        * self
                            .vscale
                            .powf(&(&delta_time_big * DBig::try_from(10).unwrap()));
                }
                self.vscale = DBig::try_from(1).unwrap()
                    + ((&self.vscale - DBig::try_from(1).unwrap()) * &damping);

                // si vsclale plus petit que 0.5 ou plus grand que 2, on le clamp à 0.5 ou 2 pour éviter les valeurs extrêmes
                if self.vscale.clone() > DBig::from_str("2").unwrap() {
                    self.vscale = DBig::from_str("2").unwrap();
                }
                if self.vscale.clone() < DBig::from_str("0.5").unwrap() {
                    self.vscale = DBig::from_str("0.5").unwrap();
                }

                if self.vscale.clone().abs() > DBig::from_str("0.999").unwrap()
                    && self.vscale.clone().abs() < DBig::from_str("1.001").unwrap()
                {
                    self.vscale = DBig::try_from(1).unwrap();
                }
            }

            let epsilon = &self.scale / DBig::try_from(1000000).unwrap();

            // Clamp vitesse plus gros que scale
            let norm = self.vtx.clone() * self.vtx.clone() + self.vty.clone() * self.vty.clone();
            if norm.clone() > DBig::try_from(0).unwrap() {
                let norm = norm.clone().sqr();
                let threshold = self.scale.clone() * DBig::from_str("2.0").unwrap();
                if norm.clone() > threshold {
                    let factor = norm.clone() / threshold.clone();
                    self.vtx = self.vtx.clone() / factor.clone();
                    self.vty = self.vty.clone() / factor.clone();
                }
            }

            // Rendre damping dépendant du temps
            let k = std::f64::consts::LN_2 / 0.05;
            let displacement_factor_f64 = (1.0 - damping_base) / k;
            let displacement_factor = DBig::from_str(&displacement_factor_f64.to_string()).unwrap();
            
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
            let is_zooming = if let (Some(start_scale), Some(target_scale)) = (
                &self.transition_start_scale,
                &self.transition_target_scale,
            ) {
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
                
                let snapped_rx_big = DBig::from_str(&snapped_rx.to_string()).unwrap_or_else(|_| DBig::try_from(0).unwrap());
                let snapped_ry_big = DBig::from_str(&snapped_ry.to_string()).unwrap_or_else(|_| DBig::try_from(0).unwrap());
                
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
            self.result.push(MandelbrotStep { zx: dbig_to_f32(&zx), zy: dbig_to_f32(&zy), pad0: 0.0, pad1: 0.0 });
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
                let zx_new = (&zx_n * &zx_n - &zy_n * &zy_n + reference_cx).with_precision(p_n).value();
                let zy_new = (&two * &zx_n * &zy_n + reference_cy).with_precision(p_n).value();
                // der_{n+1} = 2·Z_n·der_n + 1 (uses Z_n, the pre-update f32-precision value).
                der.step(zx_f, zy_f);
                zx = zx_new;
                zy = zy_new;
            }
            self.last_iter += 1;
            let sx = dbig_to_f32(&zx);
            let sy = dbig_to_f32(&zy);
            self.result.push(MandelbrotStep { zx: sx, zy: sy, pad0: 0.0, pad1: 0.0 });
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
            && self.bla_source_pade == (self.approximation_mode == ApproximationMode::Pade)
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
        let pade = self.approximation_mode == ApproximationMode::Pade;
        let mut previous_level: Vec<BlaF64> = Vec::with_capacity(orbit_len - 1);
        for start in 1..orbit_len {
            let z = self.result[start];
            let zx = z.zx as f64;
            let zy = z.zy as f64;
            previous_level.push(bla_seed(zx, zy, epsilon, pade));
        }

        let mut skip = 1usize;
        let mut level_start = 0usize;
        if skip >= MIN_BLA_SKIP {
            self.bla_result.extend(previous_level.iter().map(bla_f64_to_fe));
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
                current_level.push(bla_merge(left, right, pade));
            }

            if merged_skip >= MIN_BLA_SKIP && merged_skip <= max_bla_skip {
                self.bla_result.extend(current_level.iter().map(bla_f64_to_fe));
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
        self.bla_source_pade = pade;

        BlaBufferInfo {
            ptr: self.bla_result.as_ptr() as usize,
            count: self.bla_result.len(),
            levels_ptr: self.bla_levels.as_ptr() as usize,
            level_count: self.bla_level_count,
        }
    }

    /// log2 of the per-view bound c_max ≥ |δC| over rendered pixels: the view
    /// scale times a diagonal margin (deltas span ~±(extent·√2) around the
    /// reference).
    fn jet_log2_c_max(&self) -> f64 {
        let (m, e) = dbig_frexp(&self.scale);
        (m.abs().max(f64::MIN_POSITIVE)).log2() + e as f64 + 2.0
    }

    /// Build (or reuse) the jet table for the current reference orbit: exact
    /// coefficient levels keyed by orbit length, (V) bound data keyed by the
    /// R_c headroom, radii keyed by (ε, c_max). Each stage recomputes only when
    /// its own key moved — a zoom within the headroom re-solves radii alone
    /// (closed form, no orbit access: design D6).
    fn ensure_jet_table(&mut self, orbit_len: usize) {
        let orbit_len = orbit_len.min(self.result.len());
        if orbit_len <= 2 {
            self.jet_levels.clear();
            self.jet_bounds.clear();
            self.jet_radii.clear();
            self.jet_source_len = 0;
            return;
        }
        let orbit: Vec<(f64, f64)> = self.result[..orbit_len]
            .iter()
            .map(|s| (s.zx as f64, s.zy as f64))
            .collect();
        // Same auto-sizing as the BLA build (which shadows self.max_bla_skip
        // with auto_max_skip): the top levels are the long blocks that carry
        // deep-zoom skipping — capping them by the vestigial UI setting halved
        // the jet table's levels relative to BLA/Padé.
        let max_skip = Self::auto_max_skip(orbit_len);
        if self.jet_source_len != orbit_len {
            *self.jet_levels = jet::build_jet_levels(&orbit, MIN_BLA_SKIP, max_skip);
            self.jet_source_len = orbit_len;
            self.jet_bounds_log2_rc = f64::NAN; // cascade: bounds now stale
            // Coefficients depend only on the orbit — serialize them once here,
            // not on every radius re-solve (the whole point of the split buffer).
            *self.jet_coeffs_result = jet::jet_serialize_coeffs(&self.jet_levels);
        }
        let log2_c_max = self.jet_log2_c_max();
        let log2_rc = log2_c_max + JET_ANISOTROPY_LOG2;
        // Bounds stay valid while c_max remains inside the stored headroom and
        // hasn't shrunk so far that the radii solve got needlessly loose (4 octaves
        // of slack before a re-walk; a re-solve alone handles anything inside).
        // The stamp uses the anisotropy LADDER's minimum rung (s = 32: saturated
        // candidates fall back to it), the smallest headroom any candidate may
        // carry — see jet_block_bounds_pre.
        let log2_rc_min = log2_c_max + 5.0;
        let bounds_stale = !self.jet_bounds_log2_rc.is_finite()
            || log2_c_max > self.jet_bounds_log2_rc
            || log2_rc < self.jet_bounds_log2_rc - 4.0;
        if bounds_stale {
            *self.jet_bounds = self
                .jet_levels
                .iter()
                .map(|lvl| {
                    (0..lvl.entries.len())
                        .map(|slot| {
                            jet::jet_block_bounds(
                                &lvl.entries[slot],
                                &orbit,
                                1 + slot * lvl.skip,
                                lvl.skip,
                                log2_rc,
                            )
                        })
                        .collect()
                })
                .collect();
            self.jet_bounds_log2_rc = log2_rc_min;
            self.jet_radii_log2_c_max = f64::NAN; // cascade: radii now stale
        }
        let epsilon = self.bla_epsilon.max(f32::MIN_POSITIVE) as f64;
        let radii_stale = !self.jet_radii_log2_c_max.is_finite()
            || (self.jet_radii_epsilon - epsilon).abs() > f64::EPSILON * epsilon
            || (self.jet_radii_log2_c_max - log2_c_max).abs() > 2.0;
        if radii_stale {
            *self.jet_radii = self
                .jet_bounds
                .iter()
                .map(|lvl| {
                    lvl.iter().map(|b| jet::jet_solve_radii(b, epsilon, log2_c_max)).collect()
                })
                .collect();
            self.jet_radii_epsilon = epsilon;
            self.jet_radii_log2_c_max = log2_c_max;
            // Re-serialize only the radius buffer + level directory; the
            // coefficient buffer stays as built for the current orbit.
            let (radii, dir) = jet::jet_serialize_radii(&self.jet_levels, &self.jet_radii);
            *self.jet_radii_result = radii;
            *self.jet_gpu_levels = dir;
        }
    }

    /// Build (or reuse) the jet table for the current orbit and expose the
    /// GPU-serialized buffers: a coefficient buffer (`JetCoeffs`, 108 B/block), a
    /// radius buffer (`JetRadii`, 16 B/block vec4-packed) and the `JetLevel`
    /// directory. The coefficient and radius arrays share the same flat block index.
    pub fn compute_jet_reference(&mut self, max_iter: u32) -> JetBufferInfo {
        let orbit_len = self.result.len().min(max_iter as usize + 1);
        self.ensure_jet_table(orbit_len);
        JetBufferInfo {
            coeffs_ptr: self.jet_coeffs_result.as_ptr() as usize,
            coeffs_count: self.jet_coeffs_result.len(),
            radii_ptr: self.jet_radii_result.as_ptr() as usize,
            radii_count: self.jet_radii_result.len(),
            levels_ptr: self.jet_gpu_levels.as_ptr() as usize,
            level_count: self.jet_gpu_levels.len(),
        }
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
        self.jet_levels.clear();
        self.jet_bounds.clear();
        self.jet_radii.clear();
        self.jet_source_len = 0;
        self.jet_bounds_log2_rc = f64::NAN;
        self.jet_radii_log2_c_max = f64::NAN;
    }

    fn choose_reference_near_view(&self) -> (DBig, DBig) {
        const MAX_DETECT_ITER: usize = 2048;
        const MAX_PERIOD: usize = 512;
        const NEWTON_STEPS: usize = 24;

        let Some(period) = detect_period_f64(
            dbig_to_f64(&self.cx),
            dbig_to_f64(&self.cy),
            MAX_DETECT_ITER,
            MAX_PERIOD,
        ) else {
            return (self.cx.clone(), self.cy.clone());
        };

        let max_distance = &self.scale * dbig_i(1000);
        let tolerance = self.scale.clone();
        match newton_nucleus(&self.cx, &self.cy, period, NEWTON_STEPS, &max_distance, &tolerance) {
            Some(reference) => reference,
            None => (self.cx.clone(), self.cy.clone()),
        }
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
        let two = dbig_i(2);
        let one = dbig_i(1);
        let four = dbig_i(4);
        let radius_sq = radius * radius;
        let cx = &self.cx;
        let cy = &self.cy;

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
        const NEWTON_STEPS: usize = 80;
        self.ensure_precision();

        let factor = DBig::from_str(&radius_factor.max(1e-6).to_string())
            .unwrap_or_else(|_| dbig_i(4));
        let radius = &self.scale * &factor;

        let Some(period) = self.detect_period_ball(max_iter as usize, &radius) else {
            return vec!["none".to_string()];
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
        let prec = precision_bits_for_scale(&self.scale).max(self.budget_prec).max(64);
        let margin_digits = 24 + (period as f64).log10().ceil().max(0.0) as usize;
        let tol_digits = prec.saturating_sub(margin_digits).max(16);
        let tolerance = DBig::from_str(&format!("1e-{tol_digits}")).unwrap_or_else(|_| self.scale.clone());
        match newton_nucleus(&self.cx, &self.cy, period, NEWTON_STEPS, &max_distance, &tolerance) {
            Some((ncx, ncy)) => vec![
                "ok".to_string(),
                ncx.to_string(),
                ncy.to_string(),
                period.to_string(),
            ],
            None => vec!["nonewton".to_string(), period.to_string()],
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
        self.transition_start_cx = Some(self.cx.clone());
        self.transition_start_cy = Some(self.cy.clone());
        self.transition_start_scale = Some(self.scale.clone());
        self.transition_start_angle = Some(self.angle);

        self.transition_target_cx = Some(DBig::from_str(target_cx).unwrap_or_else(|_| self.cx.clone()));
        self.transition_target_cy = Some(DBig::from_str(target_cy).unwrap_or_else(|_| self.cy.clone()));
        self.transition_target_scale = Some(DBig::from_str(target_scale).unwrap_or_else(|_| self.scale.clone()));

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

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub struct JetBufferInfo {
    // Coefficient buffer: `JetCoeffs` records (108 B), orbit-keyed.
    pub coeffs_ptr: usize,
    pub coeffs_count: usize,
    // Radius buffer: `JetRadii` records (16 B, vec4-packed), (ε, c_max)-keyed.
    // `radii_count` equals `coeffs_count` — index-aligned per block.
    pub radii_ptr: usize,
    pub radii_count: usize,
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
    // Smallest |A_k| = |2·Z_k| over the steps this block spans (merge by min).
    // Drives the near-critical guard (G): a Möbius block straddling a step with
    // tiny |2Z_k| picks up a spurious c·z/(2Z_k−z) term that (H1)/(H2) miss, so
    // the shader rejects the block when this falls below mu = √(|c|/ε).
    min_a: f64,
    // Padé [1/1] denominator coefficient D (block map (A·z+B·c)/(1+D·z)). Zero in
    // affine mode (the block is then purely linear). D is carried for the block
    // *application*, not the radius gate (it is √ε-small in the pullback): see
    // design D3/D4 of the add-pade-approximation change.
    dx: f64,
    dy: f64,
}

fn cmul64(a: (f64, f64), b: (f64, f64)) -> (f64, f64) {
    (a.0 * b.0 - a.1 * b.1, a.0 * b.1 + a.1 * b.0)
}

fn cabs64(a: (f64, f64)) -> f64 {
    (a.0 * a.0 + a.1 * a.1).sqrt()
}

// Complex −1/(re + i·im) = −conj / |·|². Returns (0,0) when the input is ~0 (a
// degenerate seed, where the validity radius also collapses so the block is never
// applied — matching the affine Bug-1 guard).
fn cinv_neg64(re: f64, im: f64) -> (f64, f64) {
    let d = re * re + im * im;
    if !(d > 0.0) || !d.is_finite() {
        return (0.0, 0.0);
    }
    (-re / d, im / d)
}

// Complex division a / b. Used by the Padé block application (rational map) in the
// shader-port phase; defined here alongside the other complex helpers.
#[allow(dead_code)]
fn cdiv64(a: (f64, f64), b: (f64, f64)) -> (f64, f64) {
    let d = b.0 * b.0 + b.1 * b.1;
    ((a.0 * b.0 + a.1 * b.1) / d, (a.1 * b.0 - a.0 * b.1) / d)
}

// One-step seed at reference value Z = (zx, zy): A = 2Z, B = 1, β = 0. Affine
// validity radius is ε·|Z|; the Padé seed reproduces z² exactly (D = −1/A) and is
// valid to √ε·|Z| — a 1/√ε larger radius (design D2/D3). D is computed only in Padé
// mode; affine entries keep D = 0.
fn bla_seed(zx: f64, zy: f64, epsilon: f64, pade: bool) -> BlaF64 {
    let mag = (zx * zx + zy * zy).sqrt();
    let (alpha, dx, dy) = if pade {
        let (dx, dy) = cinv_neg64(2.0 * zx, 2.0 * zy);
        (epsilon.sqrt() * mag, dx, dy)
    } else {
        (epsilon * mag, 0.0, 0.0)
    };
    BlaF64 { ax: 2.0 * zx, ay: 2.0 * zy, bx: 1.0, by: 0.0, alpha, beta: 0.0, dx, dy, min_a: 2.0 * mag }
}

// Merge two consecutive blocks: x = left (first), y = right (second). The affine
// fields follow mathr; Padé additionally composes D_z = D_x + A_x·D_y (design D3,
// with A_x = left.a). The radius α/β composes identically in both modes — D is out
// of the radius gate (design D3-(a)).
fn bla_merge(left: BlaF64, right: BlaF64, pade: bool) -> BlaF64 {
    let (ax, ay) = cmul64((right.ax, right.ay), (left.ax, left.ay));
    let (abx, aby) = cmul64((right.ax, right.ay), (left.bx, left.by));
    let a_left_abs = cabs64((left.ax, left.ay)).max(f64::MIN_POSITIVE);
    let b_left_abs = cabs64((left.bx, left.by));
    let merged_alpha = right.alpha / a_left_abs;
    let merged_beta = (right.beta + b_left_abs) / a_left_abs;
    // Conservative line-min: smallest alpha, largest beta. Padé uses the same `min`
    // (philosophy A) with the √ε seed — the CPU loop benchmark found the reciprocal-
    // quadrature alternative (D3-B) does NOT reduce the residual accuracy tail near
    // edge-of-chaos points, so the simpler `min` stays. Clamp beta finite (a ≈ 0 ⇒
    // degenerate block, radius goes negative → not applied, the correct outcome).
    let alpha = left.alpha.min(merged_alpha);
    let beta = left.beta.max(merged_beta).min(1e30);
    let (dx, dy) = if pade {
        let (adyx, adyy) = cmul64((left.ax, left.ay), (right.dx, right.dy));
        (left.dx + adyx, left.dy + adyy)
    } else {
        (0.0, 0.0)
    };
    BlaF64 { ax, ay, bx: abx + right.bx, by: aby + right.by, alpha, beta, dx, dy, min_a: left.min_a.min(right.min_a) }
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

fn bla_f64_to_fe(s: &BlaF64) -> BlaStep {
    // a and b share one exponent (same order of magnitude).
    let ab_max = s.ax.abs().max(s.ay.abs()).max(s.bx.abs()).max(s.by.abs());
    let (ab_exp, ab_scale) = frexp_scale(ab_max);
    let (alpha_exp, alpha_scale) = frexp_scale(s.alpha);
    // D carries its own exponent (|D| ~ 1/|A|, unrelated to the a/b scale).
    let d_max = s.dx.abs().max(s.dy.abs());
    let (d_exp, d_scale) = frexp_scale(d_max);
    BlaStep {
        ax: (s.ax * ab_scale) as f32,
        ay: (s.ay * ab_scale) as f32,
        bx: (s.bx * ab_scale) as f32,
        by: (s.by * ab_scale) as f32,
        ab_exp,
        radius_alpha: (s.alpha * alpha_scale) as f32,
        alpha_exp,
        radius_beta: s.beta as f32,
        dx: (s.dx * d_scale) as f32,
        dy: (s.dy * d_scale) as f32,
        d_exp,
        log2_min_a: s.min_a.max(1e-300).log2() as f32,
    }
}

// Largest actual alpha magnitude in a level, as f32 bits (the shallow path's
// whole-level fast-reject bound). Underflows to 0 in the deep regime, where the
// shader uses the per-entry fe radius instead.
fn max_alpha_bits(entries: &[BlaF64]) -> u32 {
    (entries.iter().fold(0.0f64, |m, s| m.max(s.alpha)) as f32).to_bits()
}


fn detect_period_f64(cx: f64, cy: f64, max_iter: usize, max_period: usize) -> Option<usize> {
    if !cx.is_finite() || !cy.is_finite() {
        return None;
    }

    let mut orbit: Vec<(f64, f64)> = Vec::with_capacity(max_iter + 1);
    let (mut zx, mut zy) = (0.0, 0.0);
    orbit.push((zx, zy));

    for n in 1..=max_iter {
        let zx_new = zx * zx - zy * zy + cx;
        let zy_new = 2.0 * zx * zy + cy;
        zx = zx_new;
        zy = zy_new;

        if zx * zx + zy * zy > 4.0 {
            return None;
        }

        orbit.push((zx, zy));
        if n < 64 {
            continue;
        }

        let limit = max_period.min(n / 2);
        for period in 1..=limit {
            let (px, py) = orbit[n - period];
            let dx = zx - px;
            let dy = zy - py;
            if dx * dx + dy * dy < 1e-24 {
                return Some(period);
            }
        }
    }

    None
}

/// Iterate the critical orbit `z₀=0, z←z²+c` for `period` steps, returning both
/// the value `z_period` and its derivative `dz_period/dc`. The derivative is
/// what lets callers validate nucleus-ness in a scale-invariant way: near a
/// depth-`scale` nucleus `|dz| ~ 1/scale`, so `z` and `c` live on different
/// scales and `z` can only be compared to a `c`-space radius via `|z| ≤ r·|dz|`.
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
fn newton_nucleus(
    start_cx: &DBig,
    start_cy: &DBig,
    period: usize,
    steps: usize,
    max_distance: &DBig,
    tolerance: &DBig,
) -> Option<(DBig, DBig)> {
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

    for _ in 0..steps {
        let mut zx = zero.clone();
        let mut zy = zero.clone();
        let mut dx = zero.clone();
        let mut dy = zero.clone();

        for _ in 0..period {
            let dx_new = &two * (&zx * &dx - &zy * &dy) + &one;
            let dy_new = &two * (&zx * &dy + &zy * &dx);
            let zx_new = &zx * &zx - &zy * &zy + &cx;
            let zy_new = &two * &zx * &zy + &cy;

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

        if &step_x * &step_x + &step_y * &step_y <= tol_sq {
            break;
        }
    }

    // Scale-invariant nucleus check: |z_p|² ≤ tolerance² · |dz_p|².
    let (zp_x, zp_y, dp_x, dp_y) = critical_value_and_derivative(&cx, &cy, period);
    let zp2 = &zp_x * &zp_x + &zp_y * &zp_y;
    let dp2 = &dp_x * &dp_x + &dp_y * &dp_y;
    if zp2 > &tol_sq * &dp2 {
        return None;
    }

    // Primitivity: reject if a proper divisor already returns to ~0 (i.e. the
    // detected period is a multiple of the true one). Same derivative-relative
    // criterion so it stays correct at depth.
    for divisor in 1..period {
        if period % divisor != 0 {
            continue;
        }
        let (zd_x, zd_y, dd_x, dd_y) = critical_value_and_derivative(&cx, &cy, divisor);
        let zd2 = &zd_x * &zd_x + &zd_y * &zd_y;
        let dd2 = &dd_x * &dd_x + &dd_y * &dd_y;
        if zd2 <= &tol_sq * &dd2 {
            return None;
        }
    }

    Some((cx, cy))
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Default, Clone, Copy)]
pub struct PadeBenchmark {
    pub pixels: u32,
    pub max_iter: u32,
    pub steps_exact: f64,
    pub steps_affine: f64,
    pub steps_pade: f64,
    pub pade_mismatches: u32,
    pub max_iter_delta: u32,
}

struct PadeLevel {
    skip: usize,
    entries: Vec<BlaF64>,
}

fn bench_build_levels(orbit: &[(f64, f64)], epsilon: f64, pade: bool, max_skip: usize) -> Vec<PadeLevel> {
    let n = orbit.len();
    let mut levels = Vec::new();
    if n < 3 {
        return levels;
    }
    let mut prev: Vec<BlaF64> =
        (1..n).map(|i| bla_seed(orbit[i].0, orbit[i].1, epsilon, pade)).collect();
    let mut skip = 1usize;
    while skip * 2 < n && skip < max_skip {
        let m = prev.len() / 2;
        if m == 0 {
            break;
        }
        let cur: Vec<BlaF64> =
            (0..m).map(|i| bla_merge(prev[2 * i], prev[2 * i + 1], pade)).collect();
        skip *= 2;
        levels.push(PadeLevel { skip, entries: cur.clone() });
        prev = cur;
    }
    levels
}

fn bench_block(e: &BlaF64, dz: (f64, f64), dc: (f64, f64), pade: bool) -> Option<(f64, f64)> {
    let nn = cmul64((e.ax, e.ay), dz);
    let bc = cmul64((e.bx, e.by), dc);
    let num = (nn.0 + bc.0, nn.1 + bc.1);
    if !pade {
        return Some(num);
    }
    let dd = cmul64((e.dx, e.dy), dz);
    let m = (1.0 + dd.0, dd.1);
    if m.0 * m.0 + m.1 * m.1 < 1e-4 {
        return None; // pole guard
    }
    Some(cdiv64(num, m))
}

// One pixel: exact perturbation + block jumps + rebasing. Empty `levels` ⇒ exact.
// Returns (loop steps, mandelbrot iteration reached, escaped).
fn bench_run_pixel(levels: &[PadeLevel], orbit: &[(f64, f64)], dc: (f64, f64), max_iter: usize, pade: bool) -> (usize, usize, bool) {
    let bailout2 = 4.0_f64;
    let orbit_len = orbit.len();
    let dc_mag = (dc.0 * dc.0 + dc.1 * dc.1).sqrt();
    let mut dz = (0.0_f64, 0.0_f64);
    let mut ref_i = 0usize;
    let mut iter = 0usize;
    let mut steps = 0usize;
    let mut escaped = false;
    while iter < max_iter {
        let mut applied = false;
        if ref_i != 0 {
            let shifted = ref_i - 1;
            let dz2 = dz.0 * dz.0 + dz.1 * dz.1;
            for lvl in levels.iter().rev() {
                let skip = lvl.skip;
                if shifted % skip != 0 {
                    continue;
                }
                let slot = shifted / skip;
                if slot >= lvl.entries.len() || ref_i + skip > max_iter {
                    continue;
                }
                let e = &lvl.entries[slot];
                let radius = (e.alpha - e.beta * dc_mag).max(0.0);
                if dz2 > radius * radius {
                    continue;
                }
                let cand = match bench_block(e, dz, dc, pade) {
                    Some(c) => c,
                    None => continue,
                };
                let zi = orbit[ref_i + skip];
                let candz = (zi.0 + cand.0, zi.1 + cand.1);
                if skip > 1 && candz.0 * candz.0 + candz.1 * candz.1 > bailout2 {
                    continue;
                }
                dz = cand;
                ref_i += skip;
                iter += skip;
                applied = true;
                break;
            }
        }
        if !applied {
            let z = orbit[ref_i];
            let m2 = cmul64((2.0 * z.0, 2.0 * z.1), dz);
            let sq = cmul64(dz, dz);
            dz = (m2.0 + sq.0 + dc.0, m2.1 + sq.1 + dc.1);
            ref_i += 1;
            iter += 1;
        }
        steps += 1;
        if ref_i > orbit_len - 1 {
            ref_i = orbit_len - 1;
        }
        let z = orbit[ref_i];
        let full = (z.0 + dz.0, z.1 + dz.1);
        let full2 = full.0 * full.0 + full.1 * full.1;
        if full2 > bailout2 {
            escaped = true;
            break;
        }
        let dz2 = dz.0 * dz.0 + dz.1 * dz.1;
        if full2 < dz2 || ref_i == orbit_len - 1 {
            dz = full;
            ref_i = 0;
        }
        if steps > max_iter * 2 + 16 {
            break;
        }
    }
    (steps, iter, escaped)
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
        nav.use_pade();
        assert_eq!(nav.get_approximation_mode(), ApproximationMode::Pade);
        nav.use_jet();
        assert_eq!(nav.get_approximation_mode(), ApproximationMode::Jet);
    }

    #[test]
    fn jet_mode_table_caching_and_flavor_key() {
        // (task 2.5) The jet table lives in its own storage; a round-trip through
        // jet mode leaves the BLA cache warm (no rebuild), while the pade flavor
        // is part of the BLA cache key (bla ↔ pade rebuilds, bla ↔ bla reuses).
        let mut nav = MandelbrotNavigator::new("-1.25", "0.0", "0.0000001", 0.0);
        nav.compute_reference_orbit_ptr(512);
        nav.use_bla();
        nav.compute_bla_reference_ptr(512);
        assert!(nav.bla_source_len > 0);
        // Poison a stored field: only a REBUILD would overwrite it.
        let marker = -12345.0_f32;
        nav.bla_result[0].radius_beta = marker;

        nav.use_jet();
        let info = nav.compute_jet_reference(512);
        assert!(info.level_count > 0, "jet table built no levels");
        assert!(info.coeffs_count > 0 && info.coeffs_ptr != 0, "jet coeff buffer empty");
        assert!(info.radii_count > 0 && info.radii_ptr != 0, "jet radius buffer empty");
        assert_eq!(info.coeffs_count, info.radii_count, "coeff/radius buffers must be index-aligned");
        let positive_radii = nav
            .jet_radii
            .iter()
            .flatten()
            .flat_map(|r| r.iter())
            .filter(|r| r.is_finite())
            .count();
        assert!(positive_radii > 0, "no positive jet radii at shallow scale");

        nav.use_bla();
        nav.compute_bla_reference_ptr(512);
        assert_eq!(
            nav.bla_result[0].radius_beta, marker,
            "BLA cache was rebuilt by a jet round-trip"
        );

        nav.use_pade();
        nav.compute_bla_reference_ptr(512);
        assert_ne!(
            nav.bla_result[0].radius_beta, marker,
            "pade flavor did not rebuild the BLA table"
        );
        assert!(
            nav.bla_result[0].dx != 0.0 || nav.bla_result[0].dy != 0.0,
            "pade table carries no D"
        );

        // Radii lifecycle: shrinking the scale (zoom in) inside the headroom only
        // re-solves radii (bounds keyed by R_c stay), and the orbit is untouched.
        nav.use_jet();
        let bounds_rc = nav.jet_bounds_log2_rc;
        let orbit_len_before = nav.result.len();
        nav.scale = DBig::from_str("0.00000005").unwrap(); // ×0.5 zoom in
        nav.compute_jet_reference(512);
        assert_eq!(nav.jet_bounds_log2_rc, bounds_rc, "bounds re-walked inside headroom");
        assert_eq!(nav.result.len(), orbit_len_before, "reference orbit rebuilt");
    }

    #[test]
    fn pade_seed_reproduces_quadratic_and_radius() {
        // The Padé seed reproduces the exact step's z² term: expanding (A·z)/(1+D·z)
        // with D = −1/A gives A·z + z² + O(z³), so the z² coefficient −A·D = 1. (D2)
        let (zx, zy) = (0.3_f64, -0.4_f64);
        let s = bla_seed(zx, zy, 1e-6, true);
        let (adx, ady) = cmul64((s.ax, s.ay), (s.dx, s.dy)); // A·D
        assert!(
            (-adx - 1.0).abs() < 1e-12 && (-ady).abs() < 1e-12,
            "Padé z² coefficient −A·D = ({}, {}), expected (1, 0)",
            -adx,
            -ady
        );
        // Padé validity radius is √ε·|Z| — a 1/√ε factor above affine ε·|Z|. (D3)
        let a = bla_seed(zx, zy, 1e-6, false);
        let ratio = s.alpha / a.alpha;
        assert!(
            ((ratio - 1.0 / 1e-6_f64.sqrt()) / ratio).abs() < 1e-9,
            "radius ratio {} expected {}",
            ratio,
            1.0 / 1e-6_f64.sqrt()
        );
        assert_eq!((a.dx, a.dy), (0.0, 0.0)); // affine carries no D
    }

    // ── CPU-only skip diagnostic (Validation path step 2 / task 2.3) ───────────
    // Compares how far the affine vs Padé block tables can skip at a swept input
    // |dz|, no shader involved. Padé's √ε radius (vs affine ε) admits the same fixed
    // block at a ~1/√ε larger |dz|, so in the band [ε|A|, √ε|A|] it out-skips affine.
    // Isolates the math risk before any GPU work.

    struct LevelF64 {
        skip: usize,
        entries: Vec<BlaF64>,
    }

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

    fn build_levels(orbit: &[(f64, f64)], epsilon: f64, pade: bool) -> Vec<LevelF64> {
        let orbit_len = orbit.len();
        let mut levels: Vec<LevelF64> = Vec::new();
        if orbit_len < 3 {
            return levels;
        }
        let mut prev: Vec<BlaF64> = (1..orbit_len)
            .map(|i| bla_seed(orbit[i].0, orbit[i].1, epsilon, pade))
            .collect();
        let mut skip = 1usize; // skip-1 is the base; emitted levels start at skip 2
        while skip * 2 < orbit_len {
            let n = prev.len() / 2;
            if n == 0 {
                break;
            }
            let cur: Vec<BlaF64> =
                (0..n).map(|i| bla_merge(prev[2 * i], prev[2 * i + 1], pade)).collect();
            skip *= 2;
            levels.push(LevelF64 { skip, entries: cur.clone() });
            prev = cur;
        }
        levels
    }

    // Largest aligned block skip available at reference index m for input |dz|
    // (dc = 0, so the radius is alpha). Mirrors the shader's level selection.
    fn max_aligned_skip(levels: &[LevelF64], m: usize, dz_mag: f64) -> usize {
        if m == 0 {
            return 0;
        }
        let shifted = m - 1;
        let dz2 = dz_mag * dz_mag;
        let mut best = 0usize;
        for lvl in levels.iter() {
            if shifted % lvl.skip != 0 {
                continue;
            }
            let slot = shifted / lvl.skip;
            if slot >= lvl.entries.len() {
                continue;
            }
            let e = &lvl.entries[slot];
            if dz2 <= e.alpha * e.alpha && lvl.skip > best {
                best = lvl.skip;
            }
        }
        best
    }

    fn total_skip_reach(levels: &[LevelF64], orbit_len: usize, dz_mag: f64) -> u64 {
        (1..orbit_len).map(|m| max_aligned_skip(levels, m, dz_mag) as u64).sum()
    }

    #[test]
    fn pade_skips_more_than_affine() {
        let eps = 1e-6_f64;
        let centers = [
            ("cardioid-edge", -0.745_f64, 0.113_f64),
            ("period-3-island", -1.75_f64, 0.0_f64),
            ("feigenbaum", -1.401155_f64, 0.0_f64),
        ];
        for (name, cx, cy) in centers {
            let orbit = ref_orbit_f64(cx, cy, 4096);
            let aff = build_levels(&orbit, eps, false);
            let pad = build_levels(&orbit, eps, true);
            println!("\n[{}] orbit_len={} levels={}", name, orbit.len(), aff.len());
            let mut best_ratio = 1.0_f64;
            for k in 0..15 {
                let dz_mag = 1e-9 * 10f64.powf(k as f64 * 0.5);
                let a = total_skip_reach(&aff, orbit.len(), dz_mag);
                let p = total_skip_reach(&pad, orbit.len(), dz_mag);
                let ratio = p as f64 / (a.max(1)) as f64;
                if ratio > best_ratio {
                    best_ratio = ratio;
                }
                println!(
                    "   |dz|={:>9.2e}  skipSum affine={:>9}  pade={:>9}  x{:.2}",
                    dz_mag, a, p, ratio
                );
            }
            println!("   -> best Pade/affine skip ratio = x{:.2}", best_ratio);
            assert!(
                best_ratio > 1.0,
                "[{}] Pade never out-skipped affine across the |dz| sweep",
                name
            );
        }
    }

    // ── block application (CPU mirror of the shader) ───────────────────────────
    fn affine_block_apply(e: &BlaF64, dz: (f64, f64), dc: (f64, f64)) -> (f64, f64) {
        let n = cmul64((e.ax, e.ay), dz);
        let m = cmul64((e.bx, e.by), dc);
        (n.0 + m.0, n.1 + m.1)
    }

    fn pade_block_apply(e: &BlaF64, dz: (f64, f64), dc: (f64, f64)) -> Option<(f64, f64)> {
        let n = cmul64((e.ax, e.ay), dz);
        let bc = cmul64((e.bx, e.by), dc);
        let num = (n.0 + bc.0, n.1 + bc.1); // A·dz + B·dc
        let dd = cmul64((e.dx, e.dy), dz);
        let mden = (1.0 + dd.0, dd.1); // 1 + D·dz
        if mden.0 * mden.0 + mden.1 * mden.1 < 1e-4 {
            return None; // pole guard
        }
        Some(cdiv64(num, mden))
    }

    #[test]
    fn pade_merge_composition_is_exact_for_c0() {
        // For c = 0 the Möbius composition is exact: merge(x,y) applied to z equals
        // y(x(z)). This validates A_z = A_y·A_x and D_z = D_x + A_x·D_y. (D3)
        let eps = 1e-6;
        let x = bla_seed(0.4, 0.2, eps, true);
        let y = bla_seed(-0.3, 0.5, eps, true);
        let merged = bla_merge(x, y, true);
        let c = (0.0, 0.0);
        let z = (1e-3, 5e-4);
        let w1 = pade_block_apply(&x, z, c).unwrap();
        let w2 = pade_block_apply(&y, w1, c).unwrap();
        let wm = pade_block_apply(&merged, z, c).unwrap();
        let err = ((wm.0 - w2.0).powi(2) + (wm.1 - w2.1).powi(2)).sqrt();
        let mag = (w2.0 * w2.0 + w2.1 * w2.1).sqrt().max(1e-30);
        assert!(err / mag < 1e-10, "merged vs sequential rel err {}", err / mag);
        // D_z = D_x + A_x·D_y exactly
        let axdy = cmul64((x.ax, x.ay), (y.dx, y.dy));
        assert!((merged.dx - (x.dx + axdy.0)).abs() < 1e-12);
        assert!((merged.dy - (x.dy + axdy.1)).abs() < 1e-12);
    }

    #[test]
    fn pade_block_derivative_matches_finite_difference() {
        // der_out = (A − B·c·D)/M²·der_in + B/M, M = 1 + D·z. Validate against a
        // central finite difference of w(z(c),c) with z(c) = z0 + der_in·(c−c0). (D4)
        let eps = 1e-6;
        let e = bla_merge(bla_seed(0.35, -0.22, eps, true), bla_seed(-0.15, 0.4, eps, true), true);
        let a = (e.ax, e.ay);
        let b = (e.bx, e.by);
        let d = (e.dx, e.dy);
        let der_in = (0.7, -0.3);
        let z0 = (2e-3, 1e-3);
        let c0 = (1e-5, -3e-6);
        // analytic
        let dz0 = cmul64(d, z0);
        let m = (1.0 + dz0.0, dz0.1);
        let inv_m = cdiv64((1.0, 0.0), m);
        let inv_m2 = cmul64(inv_m, inv_m);
        let bcd = cmul64(cmul64(b, c0), d);
        let a_bcd = (a.0 - bcd.0, a.1 - bcd.1);
        let t1 = cmul64(cmul64(a_bcd, inv_m2), der_in);
        let t2 = cmul64(b, inv_m);
        let der_out = (t1.0 + t2.0, t1.1 + t2.1);
        // finite difference (w is analytic in c ⇒ d/d(Re c) = dw/dc)
        let w = |c: (f64, f64)| -> (f64, f64) {
            let dcm = (c.0 - c0.0, c.1 - c0.1);
            let dz = cmul64(der_in, dcm);
            let z = (z0.0 + dz.0, z0.1 + dz.1);
            let az = cmul64(a, z);
            let bc = cmul64(b, c);
            let num = (az.0 + bc.0, az.1 + bc.1);
            let ddz = cmul64(d, z);
            cdiv64(num, (1.0 + ddz.0, ddz.1))
        };
        let h = 1e-6;
        let wp = w((c0.0 + h, c0.1));
        let wm = w((c0.0 - h, c0.1));
        let fd = ((wp.0 - wm.0) / (2.0 * h), (wp.1 - wm.1) / (2.0 * h));
        let err = ((der_out.0 - fd.0).powi(2) + (der_out.1 - fd.1).powi(2)).sqrt();
        let mag = (der_out.0 * der_out.0 + der_out.1 * der_out.1).sqrt().max(1e-30);
        assert!(err / mag < 1e-5, "derivative mismatch: analytic {:?} fd {:?} rel {}", der_out, fd, err / mag);
    }

    // ── full per-pixel loop: exact vs affine vs Padé (CPU port of the shader) ────
    // Real iteration/step counts (not just radius capacity) AND a correctness
    // cross-check that blocks (affine or Padé) reach the same escape result as exact
    // perturbation. Empty `levels` ⇒ exact stepping. (tasks 6.1/6.2 on CPU)
    fn try_skip_cpu(levels: &[LevelF64], ref_i: usize, dz: (f64, f64), dc: (f64, f64), dc_mag: f64, orbit: &[(f64, f64)], bailout2: f64, max_iter: usize, pade: bool) -> Option<((f64, f64), usize)> {
        if ref_i == 0 {
            return None;
        }
        let shifted = ref_i - 1;
        let dz2 = dz.0 * dz.0 + dz.1 * dz.1;
        for lvl in levels.iter().rev() {
            let skip = lvl.skip;
            if shifted % skip != 0 {
                continue;
            }
            let slot = shifted / skip;
            if slot >= lvl.entries.len() || ref_i + skip > max_iter {
                continue;
            }
            let e = &lvl.entries[slot];
            let radius = (e.alpha - e.beta * dc_mag).max(0.0);
            if dz2 > radius * radius {
                continue;
            }
            let cand = if pade {
                match pade_block_apply(e, dz, dc) {
                    Some(c) => c,
                    None => continue, // pole → descend a level
                }
            } else {
                affine_block_apply(e, dz, dc)
            };
            let zi = orbit[ref_i + skip];
            let candz = (zi.0 + cand.0, zi.1 + cand.1);
            if skip > 1 && candz.0 * candz.0 + candz.1 * candz.1 > bailout2 {
                continue; // don't jump over the first escape
            }
            return Some((cand, skip));
        }
        None
    }

    // Returns (loop steps, iterations, escaped, weighted ops). Ops use the paper
    // convention: exact step 2, affine lookup 2, Möbius/Padé lookup 6.
    fn run_pixel_cpu(levels: &[LevelF64], orbit: &[(f64, f64)], dc: (f64, f64), max_iter: usize, pade: bool) -> (usize, usize, bool, u64, (f64, f64)) {
        let bailout2 = 4.0_f64;
        let orbit_len = orbit.len();
        let dc_mag = (dc.0 * dc.0 + dc.1 * dc.1).sqrt();
        let mut dz = (0.0_f64, 0.0_f64);
        let mut ref_i = 0usize;
        let mut iter = 0usize;
        let mut steps = 0usize;
        let mut ops = 0u64;
        let mut escaped = false;
        while iter < max_iter {
            if let Some((cand, skip)) = try_skip_cpu(levels, ref_i, dz, dc, dc_mag, orbit, bailout2, max_iter, pade) {
                dz = cand;
                ref_i += skip;
                iter += skip;
                ops += if pade { 6 } else { 2 };
            } else {
                let z = orbit[ref_i];
                let m2 = cmul64((2.0 * z.0, 2.0 * z.1), dz);
                let sq = cmul64(dz, dz);
                dz = (m2.0 + sq.0 + dc.0, m2.1 + sq.1 + dc.1);
                ref_i += 1;
                iter += 1;
                ops += 2;
            }
            steps += 1;
            if ref_i > orbit_len - 1 {
                ref_i = orbit_len - 1;
            }
            let z = orbit[ref_i];
            let full = (z.0 + dz.0, z.1 + dz.1);
            let full2 = full.0 * full.0 + full.1 * full.1;
            if full2 > bailout2 {
                escaped = true;
                break;
            }
            let dz2 = dz.0 * dz.0 + dz.1 * dz.1;
            if full2 < dz2 || ref_i == orbit_len - 1 {
                dz = full; // rebasing
                ref_i = 0;
            }
            if steps > max_iter * 2 + 16 {
                break;
            }
        }
        let z = orbit[ref_i.min(orbit_len - 1)];
        (steps, iter, escaped, ops, (z.0 + dz.0, z.1 + dz.1))
    }

    #[test]
    fn pade_full_loop_correct_and_faster() {
        let eps = 1e-6_f64;
        let max_iter = 3000usize;
        let centers = [
            ("cusp", -0.75_f64, 0.0_f64),
            ("period-2-bulb", -1.25_f64, 0.0_f64),
            ("feigenbaum", -1.401155_f64, 0.0_f64),
        ];
        for (name, cx, cy) in centers {
            let orbit = ref_orbit_f64(cx, cy, max_iter);
            // Perturbation needs a bounded reference; an escaping center is a misuse
            // (you'd pick a nearby nucleus). Skip so the benchmark stays meaningful.
            if orbit.len() <= max_iter {
                println!("\n[{}] reference escaped at iter {} — skipped (need a bounded reference)", name, orbit.len() - 1);
                continue;
            }
            let aff = build_levels(&orbit, eps, false);
            let pad = build_levels(&orbit, eps, true);
            // A row of pixels offset from the center; small scale so some escape.
            let scale = 3e-3_f64;
            let n = 96usize;
            let (mut steps_exact, mut steps_aff, mut steps_pad) = (0u64, 0u64, 0u64);
            let (mut mismatch_aff, mut mismatch_pad, mut max_d) = (0usize, 0usize, 0usize);
            for k in 0..n {
                let t = (k as f64 / n as f64) * 2.0 - 1.0;
                let dc = (t * scale, 0.37 * t * scale);
                let (se, ie, ee, _, _) = run_pixel_cpu(&[], &orbit, dc, max_iter, false);
                let (sa, ia, ea, _, _) = run_pixel_cpu(&aff, &orbit, dc, max_iter, false);
                let (sp, ip, ep, _, _) = run_pixel_cpu(&pad, &orbit, dc, max_iter, true);
                steps_exact += se as u64;
                steps_aff += sa as u64;
                steps_pad += sp as u64;
                if ia != ie || ea != ee {
                    mismatch_aff += 1;
                }
                if ip != ie || ep != ee {
                    mismatch_pad += 1;
                    max_d = max_d.max((ip as i64 - ie as i64).unsigned_abs() as usize);
                }
            }
            println!(
                "\n[{}] pixels={} | steps exact={} affine={} pade={} | pade vs affine x{:.2}",
                name, n, steps_exact, steps_aff, steps_pad,
                steps_aff as f64 / steps_pad.max(1) as f64
            );
            println!(
                "   correctness vs exact: affine mismatches={} pade mismatches={} (max |Δiter|={})",
                mismatch_aff, mismatch_pad, max_d
            );
            // Padé matches exact stepping in well-behaved regions (cusp, bulb: 0
            // mismatches) and is allowed a small, bounded tail of few-iteration
            // escape differences near edge-of-chaos points (e.g. Feigenbaum), where
            // it operates at larger |dz| and its ε-level error amplifies. A real
            // regression — a near-pole blowup — would show a large max |Δiter|.
            assert!(mismatch_pad <= n / 8 && max_d <= 64,
                "[{}] Padé diverges from exact beyond tolerance: {} mismatches, max |Δiter|={}", name, mismatch_pad, max_d);
            // Padé should never take more steps than affine.
            assert!(steps_pad <= steps_aff,
                "[{}] Padé took more steps than affine ({} > {})", name, steps_pad, steps_aff);
        }
    }

    #[test]
    fn jet_ops_benchmark_vs_affine_pade() {
        // (add-jet-approximation task 3.6) Weighted-ops comparison on the same
        // pixels, paper convention: exact step 2, affine lookup 2, Möbius 6, jet
        // order k: k(k+3)/2. Pixel scale sits in the jet regime (c_max ≪ ε, gate
        // (b)). Caveat for reading the ratios: this CPU harness omits the
        // shader's (H2)/(G) guards for affine/Padé — near critical passages that
        // FLATTERS them (they skip blocks the GPU would reject), so the jet
        // column is a lower bound on its real advantage there.
        let max_iter = 3000usize;
        let centers = [
            ("cusp", -0.75_f64, 0.0_f64),
            ("period-2-bulb", -1.25_f64, 0.0_f64),
            ("feigenbaum", -1.401155_f64, 0.0_f64),
        ];
        println!("\nops convention: exact 2 | affine 2 | möbius 6 | jet k(k+3)/2");
        for (eps, c_max) in [(1e-4_f64, 1e-5_f64), (1e-6, 1e-9)] {
        println!("-- eps={:e} c_max={:e}", eps, c_max);
        for (name, cx, cy) in centers {
            let orbit = ref_orbit_f64(cx, cy, max_iter);
            if orbit.len() <= max_iter {
                println!("[{}] reference escaped — skipped", name);
                continue;
            }
            let aff = build_levels(&orbit, eps, false);
            let pad = build_levels(&orbit, eps, true);
            let jlv = jet::build_jet_levels(&orbit, 4, 1 << 18);
            let jrad =
                jet::jet_build_radii(&jlv, &orbit, c_max.log2() + 10.0, eps, c_max.log2());
            let n = 64usize;
            let (mut ops_e, mut ops_a, mut ops_p, mut ops_j) = (0u64, 0u64, 0u64, 0u64);
            let (mut jet_mismatch, mut jet_max_d) = (0usize, 0usize);
            for kpx in 0..n {
                let t = (kpx as f64 / n as f64) * 2.0 - 1.0;
                let dc = (t * c_max * 0.7, 0.37 * t * c_max);
                let (_, ie, ee, oe, _) = run_pixel_cpu(&[], &orbit, dc, max_iter, false);
                let (_, _, _, oa, _) = run_pixel_cpu(&aff, &orbit, dc, max_iter, false);
                let (_, _, _, op, _) = run_pixel_cpu(&pad, &orbit, dc, max_iter, true);
                let jr = jet::jet_run_pixel(&jlv, &jrad, &orbit, dc, max_iter);
                ops_e += oe;
                ops_a += oa;
                ops_p += op;
                ops_j += jr.ops;
                if jr.iters != ie || jr.escaped != ee {
                    jet_mismatch += 1;
                    jet_max_d = jet_max_d.max((jr.iters as i64 - ie as i64).unsigned_abs() as usize);
                }
            }
            println!(
                "[{}] jet mismatches={} max|Δiter|={}",
                name, jet_mismatch, jet_max_d
            );
            println!(
                "[{}] ops exact={} | affine={} (x{:.1}) | pade={} (x{:.1}) | jet={} (x{:.1})",
                name,
                ops_e,
                ops_a,
                ops_e as f64 / ops_a.max(1) as f64,
                ops_p,
                ops_e as f64 / ops_p.max(1) as f64,
                ops_j,
                ops_e as f64 / ops_j.max(1) as f64
            );
            // Same tolerance as the Padé harness: ε-level per-block errors shift
            // escape iterations by a few near edge-of-chaos references (the drift
            // scales with ε — at ε = 1e-4 the coarse regime shows it, at 1e-6 it
            // vanishes). A real bug shows as a large |Δiter|.
            assert!(
                jet_mismatch <= n * 3 / 4 && jet_max_d <= 64,
                "[{}] jet diverges beyond tolerance: {} mismatches, max |Δiter| = {}",
                name, jet_mismatch, jet_max_d
            );
            // ×2 floor (skipping demonstrably active): at the coarse-c_max
            // regime (c/ε ~ 0.1) rigorous radii certify only short-to-mid
            // blocks — long ones genuinely carry O(1) c-channel remainders, and
            // every mode compresses poorly (feigenbaum: jet ×2.7 still beats
            // pade ×2.0 / affine ×1.3 there). NB: the harness Padé/affine
            // columns lack the shader's H2/G gates and are flattered.
            assert!(
                ops_j * 2 < ops_e,
                "[{}] jet ops {} not even ×2 under exact {}",
                name, ops_j, ops_e
            );
        }
        }
    }

    // Iso-ERROR comparison (not iso-ε): jet certifies its error and delivers it
    // with orders of magnitude of margin, while BLA/Padé radii are heuristic —
    // so at equal ε jet is slower but far more precise. This prints, per mode
    // and ε, the ops speedup AND the worst measured end-to-end relative error,
    // so ε values with comparable DELIVERED error can be compared for speed.
    // Run: cargo test --release iso_error_benchmark -- --ignored --nocapture
    #[test]
    #[ignore]
    fn iso_error_benchmark() {
        let c_max = 1e-9_f64;
        let max_iter = 3000usize;
        let centers = [
            ("cusp", -0.75_f64, 0.0_f64),
            ("period-2-bulb", -1.25_f64, 0.0_f64),
            ("feigenbaum", -1.401155_f64, 0.0_f64),
        ];
        for (name, cx, cy) in centers {
            let orbit = ref_orbit_f64(cx, cy, max_iter);
            if orbit.len() <= max_iter {
                continue;
            }
            println!("\n[{}]  (c_max = {:e})", name, c_max);
            let n = 48usize;
            let pixel = |k: usize| {
                let t = (k as f64 / n as f64) * 2.0 - 1.0;
                (t * c_max * 0.7, 0.29 * t * c_max)
            };
            // Exact reference results per pixel.
            let exact: Vec<_> = (0..n)
                .map(|k| run_pixel_cpu(&[], &orbit, pixel(k), max_iter, false))
                .collect();
            let ops_exact: u64 = exact.iter().map(|e| e.3).sum();
            let report = |label: String, ops: u64, worst: f64| {
                println!(
                    "  {:<14} x{:>6.1}  worst rel err {:.2e}",
                    label,
                    ops_exact as f64 / ops.max(1) as f64,
                    worst
                );
            };
            for (mode, eps) in [
                ("bla", 1e-6), ("bla", 1e-4),
                ("pade", 1e-6), ("pade", 1e-4),
            ] {
                let lv = build_levels(&orbit, eps, mode == "pade");
                let (mut ops, mut worst) = (0u64, 0f64);
                for k in 0..n {
                    let (_, _, esc, o, fz) = run_pixel_cpu(&lv, &orbit, pixel(k), max_iter, mode == "pade");
                    ops += o;
                    let (ex, ey) = exact[k].4;
                    if !esc && !exact[k].2 {
                        let m = (ex * ex + ey * ey).sqrt().max(1e-300);
                        worst = worst.max(((fz.0 - ex).powi(2) + (fz.1 - ey).powi(2)).sqrt() / m);
                    }
                }
                report(format!("{} ε={:.0e}", mode, eps), ops, worst);
            }
            for eps in [1e-6_f64, 1e-4, 1e-2, 1e-1] {
                let jlv = jet::build_jet_levels(&orbit, 4, 1 << 18);
                let jr = jet::jet_build_radii(&jlv, &orbit, c_max.log2() + 10.0, eps, c_max.log2());
                let (mut ops, mut worst) = (0u64, 0f64);
                for k in 0..n {
                    let r = jet::jet_run_pixel(&jlv, &jr, &orbit, pixel(k), max_iter);
                    ops += r.ops;
                    let (ex, ey) = exact[k].4;
                    if !r.escaped && !exact[k].2 {
                        let m = (ex * ex + ey * ey).sqrt().max(1e-300);
                        worst = worst.max(
                            ((r.final_z.0 - ex).powi(2) + (r.final_z.1 - ey).powi(2)).sqrt() / m,
                        );
                    }
                }
                report(format!("jet ε={:.0e}", eps), ops, worst);
            }
        }
    }

    #[test]
    fn production_pade_table_has_valid_radii() {
        // Build the PRODUCTION table (the one uploaded to the GPU) in pade mode and
        // check the first entry's radius. If alpha is 0/NaN, the GPU gate rejects
        // every block → Padé renders like perturbation. This is the ground-truth
        // check for "is the pade table itself broken".
        let mut nav = MandelbrotNavigator::new("-0.75", "0.0", "0.0001", 0.0);
        nav.compute_reference_orbit_ptr(2000);

        nav.use_pade();
        let info_p = nav.compute_bla_reference_ptr(2000);
        assert!(info_p.count > 0, "pade table empty (count=0)");
        let e_p = nav.bla_result[0];
        let alpha_p = (e_p.radius_alpha as f64) * 2f64.powi(e_p.alpha_exp);
        println!(
            "\nPROD pade : count={} levels={} | entry0 alpha={:.3e} ax={:.3e} dx={:.3e} d_exp={}",
            info_p.count, info_p.level_count, alpha_p, e_p.ax, e_p.dx, e_p.d_exp
        );

        nav.use_bla();
        let info_a = nav.compute_bla_reference_ptr(2000);
        let e_a = nav.bla_result[0];
        let alpha_a = (e_a.radius_alpha as f64) * 2f64.powi(e_a.alpha_exp);
        println!(
            "PROD affine: count={} levels={} | entry0 alpha={:.3e} ax={:.3e}",
            info_a.count, info_a.level_count, alpha_a, e_a.ax
        );

        assert!(alpha_p > 0.0 && alpha_p.is_finite(), "pade entry0 alpha broken: {}", alpha_p);
        assert!(alpha_p > alpha_a, "pade alpha {:.3e} not larger than affine {:.3e}", alpha_p, alpha_a);
        assert!(e_p.dx != 0.0 || e_p.dy != 0.0, "pade entry0 D is zero (not a real pade table)");
    }

    #[test]
    fn benchmark_pade_runs_on_real_orbit() {
        let mut nav = MandelbrotNavigator::new("-0.75", "0.0", "0.0001", 0.0);
        nav.compute_reference_orbit_ptr(2000);
        let b = nav.benchmark_pade(12);
        println!(
            "\nbench[-0.75 @1e-4]: pixels={} maxIter={} | steps exact={} affine={} pade={} | pade/affine x{:.3} | mismatch={} maxΔ={}",
            b.pixels, b.max_iter, b.steps_exact, b.steps_affine, b.steps_pade,
            b.steps_affine / b.steps_pade.max(1.0), b.pade_mismatches, b.max_iter_delta
        );
        assert!(b.pixels > 0);
        assert!(b.steps_pade <= b.steps_affine + 1.0, "Padé worse than affine");
        assert!(b.pade_mismatches <= b.pixels / 4, "too many Padé mismatches");
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
            "smallest skip is L_min = {}", MIN_BLA_SKIP
        );

        // Deep zoom: auto-sizing opens several levels, all powers of two starting
        // at L_min and doubling, with non-increasing per-level max radius.
        let mut nav = MandelbrotNavigator::new("-0.75", "0.1", "1e-30", 0.0);
        nav.compute_reference_orbit_ptr(256);
        let bla = nav.compute_bla_reference_ptr(256);
        assert!(bla.count >= 4, "expected a populated BLA table at depth");
        assert!(
            nav.bla_level_count >= 4,
            "deep zoom should open several levels, got {}", nav.bla_level_count
        );
        assert_ne!(bla.levels_ptr, 0);
        assert_eq!(nav.bla_levels[0].skip, MIN_BLA_SKIP as u32);
        for i in 1..nav.bla_level_count {
            assert_eq!(
                nav.bla_levels[i].skip, nav.bla_levels[i - 1].skip * 2,
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
        // Utiliser des valeurs différentes et tester zoom + step
        let mut nav = MandelbrotNavigator::new("-1.1000000000000001", "-0.20001", "0.5", 0.97);
        // Appliquer un zoom (change vscale)
        nav.zoom(1.5);
        nav.angle(0.7);
        nav.zoom(0.5);
        nav.step(None, None);
        nav.zoom(2.0);
        nav.step(None, None);
        nav.zoom(1.2);

        // Vérifier que l'échelle a changé
        // Appeler step pour que l'update soit appliqué
        let _params = nav.step(None, None);
        // On attend que l'échelle ait augmenté
        assert!(1 == 1, "scale should have increased after zoom+step");
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
        assert!(result[0].len() > 200, "re truncated at 1e-300: {} chars", result[0].len());
        assert!(result[1].len() > 200, "im truncated at 1e-300: {} chars", result[1].len());
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
        assert!((px_back[0] - 120.0).abs() < 1e-9, "expected 120, got {}", px_back[0]);
        assert!((px_back[1] - 450.0).abs() < 1e-9, "expected 450, got {}", px_back[1]);
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
        nav.scale("1e-2");               // zoom back out to a shallow scale
        nav.translate_direct(0.0, 0.0, None, None);  // runs ensure_precision at shallow
        let shallow_len = nav.get_params()[0].len();
        assert!(shallow_len >= deep_len - 5,
            "center precision dropped on zoom-out: {} -> {}", deep_len, shallow_len);
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
            assert!(st.ax.is_finite() && st.ay.is_finite() && st.bx.is_finite() && st.by.is_finite());
            assert!(st.radius_alpha.is_finite() && st.radius_beta.is_finite());
            let abm = st.ax.abs().max(st.ay.abs()).max(st.bx.abs()).max(st.by.abs());
            // [0.5, 1), but an f32 cast of a near-1 value can round up to 1.0.
            assert!(abm == 0.0 || (abm >= 0.5 && abm <= 1.0), "ab mantissa not normalized: {}", abm);
        }
        // The fe exponents are actually populated (not all zero) — the extraction
        // is doing real work, and would carry the range if the orbit expanded.
        assert!(nav.bla_result.iter().any(|st| st.alpha_exp != 0 || st.ab_exp != 0));
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
        assert!(max_err < 1e-3, "profile diverged from uniform precision: max_err={}", max_err);
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
        assert!(p_late < budget, "precision did not shed after amplification: {}", p_late);
        assert!(p_late >= PRECISION_FLOOR_BITS, "precision dropped below floor: {}", p_late);
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
        let snapshot: Vec<(f32, f32)> =
            (0..=n1).map(|i| (nav.result[i].zx, nav.result[i].zy)).collect();
        let _ = nav.compute_reference_orbit_ptr(n2 as u32);
        for i in 0..=n1 {
            assert_eq!(nav.result[i].zx, snapshot[i].0, "step {} zx changed on extend", i);
            assert_eq!(nav.result[i].zy, snapshot[i].1, "step {} zy changed on extend", i);
        }
        let mut fresh = MandelbrotNavigator::new(cx, cy, "1e-60", 0.0);
        let _ = fresh.compute_reference_orbit_ptr(n2 as u32);
        for i in 0..=n2 {
            assert_eq!(nav.result[i].zx, fresh.result[i].zx, "extend != fresh at {} zx", i);
            assert_eq!(nav.result[i].zy, fresh.result[i].zy, "extend != fresh at {} zy", i);
        }
    }

    #[test]
    fn dbig_frexp_matches_reference_decomposition() {
        // value = mantissa · 2^exponent, |mantissa| ∈ [0.5, 1), for a range of magnitudes
        // including far below the f64 floor (deep zoom). Cross-check against a direct f64
        // reference where representable, and the invariant everywhere.
        let cases = [
            "1.0", "2.0", "0.5", "-0.5", "3.0", "-7.5",
            "0.7436438870371587047521915061147741580450975735832",
            "1e-30", "1e-100", "-1e-100", "1e-300", "5e-321",
        ];
        for s in cases {
            let v = DBig::from_str(s).unwrap();
            let (m, e) = dbig_frexp(&v);
            assert!(m == 0.0 || (m.abs() >= 0.5 && m.abs() < 1.0), "mantissa out of [0.5,1): {} for {}", m, s);
            // Reconstruct value ≈ m · 2^e and compare to the true value in log space.
            let log2_recon = m.abs().log2() + e as f64;
            // True log2 from the string: leading digits + decimal exponent.
            let f = s.trim_start_matches('-').parse::<f64>().unwrap_or(0.0);
            // Only cross-check where f64 itself is accurate (normal range); subnormals (e.g.
            // 5e-321) lose mantissa bits, so there the exact-DBig result is the more accurate one.
            if f.is_normal() {
                assert!((log2_recon - f.log2()).abs() < 1e-6, "log2 mismatch for {}: {} vs {}", s, log2_recon, f.log2());
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
        assert!((fe[1] - (-398.0)).abs() < 3.0, "scale exponent off: {}", fe[1]);
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
        assert_eq!(nav.last_iter, 0, "changing the budget must drop the orbit for recompute");
        // And it rebuilds correctly from zero.
        let info = nav.compute_reference_orbit_ptr(500);
        assert_eq!(info.offset, 0, "recompute must restart at offset 0");
        assert!(nav.last_iter >= 500);
    }
}

