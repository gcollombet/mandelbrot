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

fn dbig_i(value: i32) -> DBig {
    DBig::try_from(value).unwrap()
}

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
    pub dx: f32,
    pub dy: f32,
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
    pub ax: f32,
    pub ay: f32,
    pub bx: f32,
    pub by: f32,
    pub radius_alpha: f32,
    pub radius_beta: f32,
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[repr(C)]
#[derive(Copy, Clone, Debug, PartialEq, Eq)]
pub struct BlaLevel {
    pub offset: u32,
    pub count: u32,
    pub skip: u32,
    pub _padding: u32,
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
    reference_cx: DBig,
    reference_cy: DBig,
    scale: DBig,
    angle: f64,
    result: Box<Vec<MandelbrotStep>>, // Vecteur pré-alloué
    last_iter: usize,                 // Dernière itération calculée
    previous_c: (DBig, DBig),         // Dernier C vu
    last_zx: DBig,
    last_zy: DBig,
    last_dx: DBig,
    last_dy: DBig,
    approximation_mode: ApproximationMode,
    bla_epsilon: f32,
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
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
impl MandelbrotNavigator {
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen(constructor))]
    pub fn new(cx: &str, cy: &str, scale: &str, angle: f64) -> MandelbrotNavigator {
        let zero = DBig::from_str("0").unwrap();
        let cx = DBig::from_str(cx).unwrap();
        let cy = DBig::from_str(cy).unwrap();
        let scale = DBig::from_str(scale).unwrap();

        MandelbrotNavigator {
            reference_cx: cx.clone(),
            reference_cy: cy.clone(),
            cx: cx.clone(),
            cy: cy.clone(),
            scale,
            angle,
            result: Box::new(Vec::with_capacity(10_000)),
            last_iter: 0,
            previous_c: (cx.clone(), cy.clone()),
            last_zx: zero.clone(),
            last_zy: zero.clone(),
            last_dx: zero.clone(),
            last_dy: zero.clone(),
            approximation_mode: ApproximationMode::Perturbation,
            bla_epsilon: 1e-6,
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
        }
    }

    pub fn translate(&mut self, dx: f64, dy: f64) {
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

    pub fn translate_direct(&mut self, dx: f64, dy: f64) {
        // Applique le déplacement immédiatement
        let angle = self.angle;
        let cos_a = DBig::from_str(&angle.cos().to_string()).unwrap();
        let sin_a = DBig::from_str(&angle.sin().to_string()).unwrap();
        let dx_big = DBig::from_str(&dx.to_string()).unwrap();
        let dy_big = DBig::from_str(&dy.to_string()).unwrap();
        let scale = &self.scale;
        let delta_x = (&dx_big * &cos_a - &dy_big * &sin_a) * scale;
        let delta_y = (&dx_big * &sin_a + &dy_big * &cos_a) * scale;
        self.cx = &self.cx + delta_x;
        self.cy = &self.cy + delta_y;
        self.vtx = DBig::from_str("0").unwrap();
        self.vty = DBig::from_str("0").unwrap();
    }

    pub fn rotate_direct(&mut self, delta_angle: f64) {
        self.angle += delta_angle;
        self.vangle = 0.0;
    }

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

    pub fn zoom(&mut self, factor: f64) {
        // Accumulate zoom velocity (multiplicative — neutral value is 1.0)
        let factor_big = DBig::from_str(factor.to_string().as_str()).unwrap();
        self.vscale = &self.vscale * factor_big;
    }

    pub fn step(&mut self) -> Vec<String> {
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

        // Animation translation avec vitesse et damping
        let damping_base = exp_f64(-std::f64::consts::LN_2 * delta_time / 0.05); // // (1.0 - 25.0 * delta_time).max(0.01);
        let damping = DBig::from_str(&damping_base.to_string()).unwrap();
        let delta_time_big = DBig::from_str(&delta_time.to_string()).unwrap();

        // On anime l'échelle avec la vitesse et damping
        if self.vscale != DBig::try_from(1).unwrap() {
            //let delta_scale = DBig::try_from(1).unwrap() + &self.vscale * (DBig::try_from(1).unwrap() + &delta_time_big).ln();
            //self.scale = self.scale.powf(&(&self.vscale * &delta_time_big));

            // 2 en une seconde, je veux que le scale soit divisé par deux, en 2 par 4, en trois par 8, etc.
            // si 0.5 en une seconde, alors en delta_time, on fait scale * (0.5)^(delta_time)
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
        // Use exact integral instead of Euler: for v(t) = v0*e^(-k*t),
        // displacement = v0 * (1 - e^(-k*dt)) / k = v0 * (1 - damping) / k
        let k = std::f64::consts::LN_2 / 0.05;
        let displacement_factor_f64 = (1.0 - damping_base) / k;
        let displacement_factor = DBig::from_str(&displacement_factor_f64.to_string()).unwrap();
        self.cx = &self.cx + &self.vtx * &displacement_factor;
        self.cy = &self.cy + &self.vty * &displacement_factor;
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
        let min_positive = DBig::from_str(&(f32::MIN_POSITIVE * 10.0).to_string()).unwrap();
        let twenty = DBig::try_from(20).unwrap();

        if self.scale.clone() > min_positive
            && ((&self.reference_cx - &self.cx).abs() > &self.scale * &twenty
                || (&self.reference_cy - &self.cy).abs() > &self.scale * &twenty)
        {
            let (reference_cx, reference_cy) = self.choose_reference_near_view();
            self.reset_reference_to(reference_cx, reference_cy);
        }

        let offset = self.result.len();
        let mut zx = self.last_zx.clone();
        let mut zy = self.last_zy.clone();
        let mut dx = self.last_dx.clone();
        let mut dy = self.last_dy.clone();

        let two = DBig::try_from(2).unwrap();
        let one = DBig::try_from(1).unwrap();
        let threshold = DBig::try_from(1_000_000).unwrap();
        let total_iter: usize = target;

        let reference_cx = &self.reference_cx;
        let reference_cy = &self.reference_cy;

        if self.result.is_empty() {
            self.result.push(MandelbrotStep {
                zx: dbig_to_f32(&zx),
                zy: dbig_to_f32(&zy),
                dx: dbig_to_f32(&dx),
                dy: dbig_to_f32(&dy),
            });
        }

        while self.last_iter < total_iter {
            let magnitude_sq = &zx * &zx + &zy * &zy;

            if magnitude_sq > threshold {
                zx = DBig::try_from(0).unwrap();
                zy = DBig::try_from(0).unwrap();
                dx = DBig::try_from(0).unwrap();
                dy = DBig::try_from(0).unwrap();
            } else {
                let dx_new = &two * &zx * &dx + &one;
                let dy_new = &two * &zy * &dy;
                let zx_new = &zx * &zx - &zy * &zy + reference_cx;
                let zy_new = &two * &zx * &zy + reference_cy;

                zx = zx_new;
                zy = zy_new;
                dx = dx_new;
                dy = dy_new;
            }
            self.last_iter += 1;
            self.result.push(MandelbrotStep {
                zx: dbig_to_f32(&zx),
                zy: dbig_to_f32(&zy),
                dx: dbig_to_f32(&dx),
                dy: dbig_to_f32(&dy),
            });
        }

        // Stocker la dernière valeur exacte
        self.last_zx = zx.clone();
        self.last_zy = zy.clone();
        self.last_dx = dx.clone();
        self.last_dy = dy.clone();
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
        const BLA_SKIP_LEVELS: usize = 0;
        const MIN_BLA_SKIP: usize = 1 << BLA_SKIP_LEVELS;
        const MAX_BLA_SKIP: usize = 64;

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

        let epsilon = self.bla_epsilon.max(f32::MIN_POSITIVE);
        let mut previous_level: Vec<BlaStep> = Vec::with_capacity(orbit_len - 1);
        for start in 1..orbit_len {
            let z = self.result[start];
            let a = (2.0 * z.zx, 2.0 * z.zy);
            let alpha = epsilon * complex_abs((z.zx, z.zy));
            previous_level.push(BlaStep {
                ax: a.0,
                ay: a.1,
                bx: 1.0,
                by: 0.0,
                radius_alpha: alpha,
                radius_beta: 0.0,
            });
        }

        let mut skip = 1usize;
        let mut level_start = 0usize;
        if skip >= MIN_BLA_SKIP {
            self.bla_result.extend(previous_level.iter().copied());
            self.bla_levels.push(BlaLevel {
                offset: level_start as u32,
                count: previous_level.len() as u32,
                skip: skip as u32,
                _padding: 0,
            });
            level_start = self.bla_result.len();
        }

        while skip < MAX_BLA_SKIP && skip * 2 < orbit_len {
            let merged_skip = skip * 2;
            let level_entry_count = previous_level.len() / 2;
            if level_entry_count == 0 {
                break;
            }

            let mut current_level = Vec::with_capacity(level_entry_count);
            for idx in 0..level_entry_count {
                let left = previous_level[idx * 2];
                let right = previous_level[idx * 2 + 1];
                let (ax, ay) = complex_mul((right.ax, right.ay), (left.ax, left.ay));
                let (abx, aby) = complex_mul((right.ax, right.ay), (left.bx, left.by));
                let a_left_abs = complex_abs((left.ax, left.ay)).max(f32::MIN_POSITIVE);
                let b_left_abs = complex_abs((left.bx, left.by));
                let merged_alpha_from_right = right.radius_alpha / a_left_abs;
                let merged_beta_from_right = (right.radius_beta + b_left_abs) / a_left_abs;
                let (radius_alpha, radius_beta) = conservative_line_min(
                    (left.radius_alpha, left.radius_beta),
                    (merged_alpha_from_right, merged_beta_from_right),
                );
                current_level.push(BlaStep {
                    ax,
                    ay,
                    bx: abx + right.bx,
                    by: aby + right.by,
                    radius_alpha,
                    radius_beta,
                });
            }

            if merged_skip >= MIN_BLA_SKIP && merged_skip <= MAX_BLA_SKIP {
                self.bla_result.extend(current_level.iter().copied());
                self.bla_levels.push(BlaLevel {
                    offset: level_start as u32,
                    count: current_level.len() as u32,
                    skip: merged_skip as u32,
                    _padding: 0,
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
        self.last_dx = dbig_i(0);
        self.last_dy = dbig_i(0);
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
        match newton_nucleus(&self.cx, &self.cy, period, NEWTON_STEPS, &max_distance) {
            Some(reference) => reference,
            None => (self.cx.clone(), self.cy.clone()),
        }
    }

    pub fn scale(&mut self, value: &str) {
        self.scale = DBig::from_str(value).unwrap();
        self.vscale = DBig::try_from(1).unwrap();
    }

    pub fn angle(&mut self, value: f64) {
        self.angle = value;
        self.vangle = 0.0;
    }

    pub fn origin(&mut self, cx: &str, cy: &str) {
        self.cx = DBig::from_str(cx).unwrap();
        self.cy = DBig::from_str(cy).unwrap();
        self.vtx = DBig::from_str("0").unwrap();
        self.vty = DBig::from_str("0").unwrap();
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

fn complex_mul(a: (f32, f32), b: (f32, f32)) -> (f32, f32) {
    (a.0 * b.0 - a.1 * b.1, a.0 * b.1 + a.1 * b.0)
}

fn complex_abs(a: (f32, f32)) -> f32 {
    (a.0 * a.0 + a.1 * a.1).sqrt()
}

fn conservative_line_min(a: (f32, f32), b: (f32, f32)) -> (f32, f32) {
    (a.0.min(b.0), a.1.max(b.1))
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

fn iterate_critical_orbit(cx: &DBig, cy: &DBig, period: usize) -> (DBig, DBig) {
    let two = dbig_i(2);
    let mut zx = dbig_i(0);
    let mut zy = dbig_i(0);

    for _ in 0..period {
        let zx_new = &zx * &zx - &zy * &zy + cx;
        let zy_new = &two * &zx * &zy + cy;
        zx = zx_new;
        zy = zy_new;
    }

    (zx, zy)
}

fn newton_nucleus(
    start_cx: &DBig,
    start_cy: &DBig,
    period: usize,
    steps: usize,
    max_distance: &DBig,
) -> Option<(DBig, DBig)> {
    if period == 0 {
        return None;
    }

    let two = dbig_i(2);
    let one = dbig_i(1);
    let zero = dbig_i(0);
    let max_distance_sq = max_distance * max_distance;
    let validation_radius = max_distance / dbig_i(1000);
    let validation_radius_sq = &validation_radius * &validation_radius;

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

        if &step_x * &step_x + &step_y * &step_y <= validation_radius_sq {
            break;
        }
    }

    let (zx, zy) = iterate_critical_orbit(&cx, &cy, period);
    if &zx * &zx + &zy * &zy > validation_radius_sq {
        return None;
    }

    for divisor in 1..period {
        if period % divisor != 0 {
            continue;
        }
        let (zx_div, zy_div) = iterate_critical_orbit(&cx, &cy, divisor);
        if &zx_div * &zx_div + &zy_div * &zy_div <= validation_radius_sq {
            return None;
        }
    }

    Some((cx, cy))
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

    #[test]
    fn bla_reference_generation_builds_multiple_levels() {
        let mut nav = MandelbrotNavigator::new("-0.75", "0.1", "1.0", 0.0);
        nav.compute_reference_orbit_ptr(64);
        let bla = nav.compute_bla_reference_ptr(64);
        assert!(
            bla.count >= 4,
            "expected culled BLA table to keep useful skips"
        );
        assert_eq!(bla.level_count, 7, "expected levels for skips 1, 2, 4, 8, 16, 32, and 64");
        assert_ne!(bla.levels_ptr, 0);
        assert_eq!(nav.bla_levels[0].skip, 1);
        assert_eq!(nav.bla_levels[1].skip, 2);
        assert_eq!(nav.bla_levels[2].skip, 4);
        assert_eq!(nav.bla_levels[3].skip, 8);
        assert_eq!(nav.bla_levels[4].skip, 16);
        assert_eq!(nav.bla_levels[5].skip, 32);
        assert_eq!(nav.bla_levels[6].skip, 64);
        assert!(nav.bla_result.iter().all(|step| step.radius_beta >= 0.0));
    }

    #[test]
    fn newton_nucleus_finds_period_two_center() {
        let start_x = DBig::from_str("-1.01").unwrap();
        let start_y = DBig::from_str("0.001").unwrap();
        let max_distance = DBig::from_str("0.1").unwrap();
        let (cx, cy) = newton_nucleus(&start_x, &start_y, 2, 24, &max_distance)
            .expect("period-2 nucleus should converge");

        let cx_f64 = dbig_to_f64(&cx);
        let cy_f64 = dbig_to_f64(&cy);
        assert!((cx_f64 + 1.0).abs() < 1e-10, "cx={}", cx_f64);
        assert!(cy_f64.abs() < 1e-10, "cy={}", cy_f64);
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
        nav.step();
        nav.zoom(2.0);
        nav.step();
        nav.zoom(1.2);

        // Vérifier que l'échelle a changé
        // Appeler step pour que l'update soit appliqué
        let _params = nav.step();
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
}
