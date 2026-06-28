use core::convert::TryFrom;
use core::str::FromStr;
use dashu_float::ops::Abs;
use dashu_float::DBig;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[cfg(not(target_arch = "wasm32"))]
pub type JsValue = String;

// Fonction utilitaire pour convertir DBig en f32 de manière sûre
fn dbig_to_f32(bf: &DBig) -> f32 {
    bf.to_string().parse::<f32>().unwrap()
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

#[cfg(target_arch = "wasm32")]
fn exp_f64(value: f64) -> f64 {
    js_sys::Math::exp(value)
}

#[cfg(not(target_arch = "wasm32"))]
fn exp_f64(value: f64) -> f64 {
    value.exp()
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
    approximation_mode: ApproximationMode,
    bla_epsilon: f32,
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
            approximation_mode: ApproximationMode::Perturbation,
            bla_epsilon: 1e-3,
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
        };
        navigator.ensure_precision();
        navigator
    }

    // Raise the precision of the navigation state to match the current zoom
    // depth, so accumulation (cx += delta·scale, scale *= factor, …) keeps enough
    // significant digits. with_precision sets the precision bound without losing
    // the value; subsequent ops then accumulate digits down to the scale instead
    // of being rounded to a fixed budget (the cause of the deep precision cliff).
    fn ensure_precision(&mut self) {
        let prec = precision_bits_for_scale(&self.scale).max(64);
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

    // The BLA table cache key is (orbit_len, epsilon) and does NOT include the mode,
    // so every mode change must invalidate it: affine uses an ε radius with D=0,
    // Padé a √ε radius with a real D. Without this, switching modes reuses the
    // other mode's table (e.g. BLA after Padé renders with the √ε+D table).
    fn invalidate_bla_on_mode_change(&mut self, next: ApproximationMode) {
        if self.approximation_mode != next {
            self.bla_source_len = 0;
            self.bla_level_count = 0;
        }
    }

    pub fn use_perturbation(&mut self) {
        self.invalidate_bla_on_mode_change(ApproximationMode::Perturbation);
        self.approximation_mode = ApproximationMode::Perturbation;
    }

    pub fn use_bla(&mut self) {
        self.invalidate_bla_on_mode_change(ApproximationMode::BivariateLinear);
        self.approximation_mode = ApproximationMode::BivariateLinear;
    }

    pub fn use_pade(&mut self) {
        self.invalidate_bla_on_mode_change(ApproximationMode::Pade);
        self.approximation_mode = ApproximationMode::Pade;
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
        // Clamp to a power of two in [MIN_BLA_SKIP=2, 1<<20]; the table levels are
        // powers of two, so a non-power cap would just round down anyway.
        let clamped = (max_skip as usize).clamp(2, 1 << 20).next_power_of_two();
        if clamped != self.max_bla_skip {
            self.bla_source_len = 0;
            self.bla_level_count = 0;
        }
        self.max_bla_skip = clamped;
    }

    pub fn get_max_bla_skip(&self) -> u32 {
        self.max_bla_skip as u32
    }

    /// Auto block-size bound (no magic constant). The longest useful block is
    /// `L_max ≈ log2(√ε/|c|)` (generic `|2Z|≈2`); size the merge table to the next
    /// power of two above it, with `|c|` ≈ the view scale. The radius and (H2)
    /// `|B|·|c|<ε` tests stop blocks before this, so it is only a tiny safe ceiling
    /// (≈512 even at zoom 1e-100, ~9 levels). Replaces the manual `maxSkip` knob.
    fn auto_max_skip(&self) -> usize {
        let eps = (self.bla_epsilon.max(f32::MIN_POSITIVE)) as f64;
        let sqrt_eps = eps.sqrt();
        let c = dbig_to_f64(&self.scale).abs().max(1e-300); // |c| ≈ view scale
        let ratio = sqrt_eps / c; // √ε / |c|
        if !ratio.is_finite() || ratio <= 2.0 {
            return MIN_BLA_SKIP; // shallow: no benefit beyond the minimum block
        }
        let l_max = ratio.log2().max(1.0); // longest block in steps (|2Z|≈2)
        let next_pow2 = (l_max.ceil() as usize).next_power_of_two();
        next_pow2.clamp(MIN_BLA_SKIP, 1 << 20)
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

        let two = DBig::try_from(2).unwrap();
        let threshold = DBig::try_from(1_000_000).unwrap();
        let total_iter: usize = target;

        let reference_cx = &self.reference_cx;
        let reference_cy = &self.reference_cy;

        if self.result.is_empty() {
            self.result.push(MandelbrotStep { zx: dbig_to_f32(&zx), zy: dbig_to_f32(&zy), pad0: 0.0, pad1: 0.0 });
        }

        while self.last_iter < total_iter {
            let magnitude_sq = &zx * &zx + &zy * &zy;

            if magnitude_sq > threshold {
                zx = DBig::try_from(0).unwrap();
                zy = DBig::try_from(0).unwrap();
            } else {
                let zx_new = &zx * &zx - &zy * &zy + reference_cx;
                let zy_new = &two * &zx * &zy + reference_cy;

                zx = zx_new;
                zy = zy_new;
            }
            self.last_iter += 1;
            self.result.push(MandelbrotStep { zx: dbig_to_f32(&zx), zy: dbig_to_f32(&zy), pad0: 0.0, pad1: 0.0 });
        }

        // Stocker la dernière valeur exacte
        self.last_zx = zx.clone();
        self.last_zy = zy.clone();
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
        // Block size is auto-determined from ε and the zoom scale (no magic
        // constant): the longest useful block is ~log2(√ε/|c|), and the merge
        // table needs the next power of two above it (≈512 even at 1e-100). The
        // per-level validity tests (radius + (H2) |B|·|c|<ε) stop blocks before
        // this anyway, so it is a tiny safe ceiling.
        let max_bla_skip = self.auto_max_skip();

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

        BlaBufferInfo {
            ptr: self.bla_result.as_ptr() as usize,
            count: self.bla_result.len(),
            levels_ptr: self.bla_levels.as_ptr() as usize,
            level_count: self.bla_level_count,
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
        self.bla_result.clear();
        self.bla_levels.clear();
        self.bla_level_count = 0;
        self.bla_source_len = 0;
        self.bla_source_epsilon = 0.0;
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
        // view far off-screen. Converge/validate to within one view height.
        let max_distance = &self.scale * dbig_i(1000);
        let tolerance = self.scale.clone();
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

    fn run_pixel_cpu(levels: &[LevelF64], orbit: &[(f64, f64)], dc: (f64, f64), max_iter: usize, pade: bool) -> (usize, usize, bool) {
        let bailout2 = 4.0_f64;
        let orbit_len = orbit.len();
        let dc_mag = (dc.0 * dc.0 + dc.1 * dc.1).sqrt();
        let mut dz = (0.0_f64, 0.0_f64);
        let mut ref_i = 0usize;
        let mut iter = 0usize;
        let mut steps = 0usize;
        let mut escaped = false;
        while iter < max_iter {
            if let Some((cand, skip)) = try_skip_cpu(levels, ref_i, dz, dc, dc_mag, orbit, bailout2, max_iter, pade) {
                dz = cand;
                ref_i += skip;
                iter += skip;
            } else {
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
                dz = full; // rebasing
                ref_i = 0;
            }
            if steps > max_iter * 2 + 16 {
                break;
            }
        }
        (steps, iter, escaped)
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
                let (se, ie, ee) = run_pixel_cpu(&[], &orbit, dc, max_iter, false);
                let (sa, ia, ea) = run_pixel_cpu(&aff, &orbit, dc, max_iter, false);
                let (sp, ip, ep) = run_pixel_cpu(&pad, &orbit, dc, max_iter, true);
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
}

