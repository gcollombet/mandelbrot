use malachite_base::num::conversion::traits::FromStringBase;
use log::{info, Level};

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;
use malachite_float::Float;
use malachite_base::num::arithmetic::traits::Abs;

#[wasm_bindgen]
#[repr(C)]
#[derive(Copy, Clone, Debug, PartialEq)]
pub struct MandelbrotStep {
    pub zx: f32,
    pub zy: f32,
    pub dx: f32,
    pub dy: f32,
}

#[derive(Clone)]
pub struct Mandelbrot {
    pub cx: Float,
    pub cy: Float,
    pub scale: Float,
    pub angle: Float,
}

#[wasm_bindgen]
pub struct MandelbrotNavigator {
    cx: Float,
    cy: Float,
    reference_cx: Float,
    reference_cy: Float,
    mu: f64,
    scale: Float,
    angle: f64,
    target_cx: Float,
    target_cy: Float,
    target_scale: Float,
    target_angle: f64,
    result: Box<Vec<MandelbrotStep>>, // Vecteur pré-alloué
    last_iter: usize, // Dernière itération calculée
    previous_c: (Float, Float), // Dernier C vu
    last_zx: Float,
    last_zy: Float,
    last_dx: Float,
    last_dy: Float,
    // Ajout des vitesses pour l'animation
    vx: Float,
    vy: Float,
    vscale: Float,
    vangle: f64,
    last_step_time: Option<f64>, // timestamp en ms
}

#[wasm_bindgen]
impl MandelbrotNavigator {

    #[wasm_bindgen(constructor)]
    pub fn new(cx: f64, cy: f64, mu: f64, scale: f64, angle: f64) -> MandelbrotNavigator {
        console_log::init_with_level(Level::Debug).expect("Problème d'initialisation du logger");
        MandelbrotNavigator {
            cx: Float::from_primitive_float_prec(cx, 128).0,
            cy: Float::from_primitive_float_prec(cy, 128).0,
            reference_cx: Float::from_primitive_float_prec(cx, 128).0,
            reference_cy: Float::from_primitive_float_prec(cy, 128).0,
            mu,
            scale: Float::from_primitive_float_prec(scale, 128).0,
            angle,
            target_cx: Float::from_primitive_float_prec(cx, 128).0,
            target_cy: Float::from_primitive_float_prec(cy, 128).0,
            target_scale: Float::from_primitive_float_prec(scale, 128).0,
            target_angle: angle,
            result: Box::new(Vec::with_capacity(10_000)),
            last_iter: 0,
            previous_c: (Float::from_primitive_float_prec(cx, 128).0, Float::from_primitive_float_prec(cy, 128).0),
            last_zx: Float::from_primitive_float_prec(0.0, 128).0,
            last_zy: Float::from_primitive_float_prec(0.0, 128).0,
            last_dx: Float::from_primitive_float_prec(0.0, 128).0,
            last_dy: Float::from_primitive_float_prec(0.0, 128).0,
            // Initialisation des vitesses à zéro
            vx: Float::from_primitive_float_prec(0.0, 128).0,
            vy: Float::from_primitive_float_prec(0.0, 128).0,
            vscale: Float::from_primitive_float_prec(0.0, 128).0,
            vangle: 0.0,
            last_step_time: None,
        }
    }

    pub fn translate(&mut self, dx: f64, dy: f64) {
        // dx/dy sont des valeurs entre 0 et 1 (écran)
        // On convertit en déplacement complexe selon l'échelle et l'angle
        let angle = self.angle;
        let delta_x = (Float::from_primitive_float_prec(dx, 128).0 * Float::from(angle.cos()) - Float::from_primitive_float_prec(dy, 128).0 * Float::from(angle.sin())) * self.scale.clone();
        let delta_y = (Float::from_primitive_float_prec(dx, 128).0 * Float::from(angle.sin()) + Float::from_primitive_float_prec(dy, 128).0 * Float::from(angle.cos())) * self.scale.clone();
        self.target_cx = self.cx.clone() + delta_x.clone();
        self.target_cy = self.cy.clone() + delta_y.clone();
    }

    pub fn rotate(&mut self, delta_angle: f64) {
        self.target_angle = self.angle + delta_angle;
    }

    pub fn translate_direct(&mut self, dx: f64, dy: f64) {
        self.translate(dx, dy);
        self.cx = self.target_cx.clone();
        self.cy = self.target_cy.clone();
    }

    pub fn rotate_direct(&mut self, delta_angle: f64) {
        self.angle += delta_angle;
        self.target_angle = self.angle;
    }

    pub fn zoom(&mut self, factor: f64) {
        self.target_scale = self.scale.clone() * Float::from_primitive_float_prec(factor, 128).0;
    }

    pub fn step(&mut self) -> Vec<f64> {
        // Calcul du temps écoulé depuis le dernier appel
        let delta_time = {
            let now = js_sys::Date::now(); // ms
            let dt = if let Some(last) = self.last_step_time {
                (now - last) / 1000.0
            } else {
                1.0 / 60.0
            };
            self.last_step_time = Some(now);
            dt
        };

        // Paramètres d'accélération et d'amortissement dépendants du temps
        let base_accel = 16.0;
        let accel = Float::from_primitive_float_prec(base_accel * delta_time, 180).0;
        // Calcul des écarts
        let dx = self.target_cx.clone() - self.cx.clone();
        let dy = self.target_cy.clone() - self.cy.clone();
        let dscale = self.target_scale.clone() - self.scale.clone();
        let dangle: f64 = self.target_angle - self.angle;

        // Mise à jour des vitesses
        self.vx = dx.clone() * accel.clone() * Float::from_primitive_float_prec(4.0, 128).0;
        // si vx est plus grand que l'écart restant, on le ramène à l'écart restant
        if self.vx.clone().abs() > dx.clone().abs() {
            self.vx = dx.clone();
        }
        if dx.clone().abs() > self.scale.clone() / Float::from_primitive_float_prec(1000.0, 180).0 {
            self.cx = self.cx.clone() + self.vx.clone();
        } else {
            self.cx = self.target_cx.clone();
            self.vx = Float::from_primitive_float_prec(0.0, 128).0;
        }
        self.vy = dy.clone() * accel.clone() * Float::from_primitive_float_prec(4.0, 128).0;
        // si vy est plus grand que l'écart restant, on le ramène à l'écart restant
        if self.vy.clone().abs() > dy.clone().abs() {
            self.vy = dy.clone();
        }
        if dy.clone().abs() > self.scale.clone() / Float::from_primitive_float_prec(1000.0, 180).0 {
            self.cy = self.cy.clone() + self.vy.clone();
        } else {
            self.cy = self.target_cy.clone();
            self.vy = Float::from_primitive_float_prec(0.0, 128).0;
        }
        self.vscale = dscale.clone() * accel.clone();
        // si vscale est plus grand que l'écart restant, on le ramène à l'écart restant
        if self.vscale.clone().abs() > dscale.clone().abs() {
            self.vscale = dscale.clone();
        }
        if dscale.clone().abs() > self.scale.clone() / Float::from_primitive_float_prec(1000.0, 180).0 {
            self.scale = self.scale.clone() + self.vscale.clone();
        } else {
            self.scale = self.target_scale.clone();
            self.vscale = Float::from_primitive_float_prec(0.0, 180).0;
        }
        self.vangle = dangle * accel.to_string().parse::<f64>().unwrap() * 4.0;
        // si vangle est plus grand que l'écart restant, on le ramène à l'écart restant
        if self.vangle.abs() > dangle.abs() {
            self.vangle = dangle;
        }
        if (self.vangle - self.target_angle).abs() > 0.001 {
            self.angle += self.vangle;
        } else {
            self.angle = self.target_angle;
            self.vangle = 0.0;
        }

        // Calcul du delta par rapport à la référence
        let delta_x = self.cx.clone() - self.reference_cx.clone();
        let delta_y = self.cy.clone() - self.reference_cy.clone();

        vec![
            delta_x.to_string().parse::<f64>().unwrap(),
            delta_y.to_string().parse::<f64>().unwrap(),
            self.scale.to_string().parse::<f64>().unwrap(),
            self.angle,
        ]
    }


    pub fn get_params(&self) -> Vec<JsValue> {
        vec![
            self.cx.clone().to_string().into(),
            self.cy.clone().to_string().into(),
            self.scale.clone().to_string().into(),
            self.angle.to_string().into(),
        ]
    }

    /// Retourne un tuple (ptr, offset, count) pour accès direct JS
    pub fn compute_reference_orbit_ptr(&mut self, max_iter: u32) -> OrbitBufferInfo {
        if self.scale.clone() > Float::from(f32::MIN_POSITIVE * 10.0)
        && (
            ((self.reference_cx.clone() - self.cx.clone()) > self.scale.clone() * Float::from(20.0)
            || (self.reference_cy.clone() - self.cy.clone()).abs() > self.scale.clone() * Float::from(20.0))
        )
        {
            self.result.clear();
            self.last_iter = 0;
            self.previous_c = (self.cx.clone(), self.cy.clone());
            self.reference_cx = self.cx.clone();
            self.reference_cy = self.cy.clone();
            self.last_zx = Float::from_primitive_float_prec(0.0, 128).0;
            self.last_zy = Float::from_primitive_float_prec(0.0, 128).0;
            self.last_dx = Float::from_primitive_float_prec(0.0, 128).0;
            self.last_dy = Float::from_primitive_float_prec(0.0, 128).0;
        }
        let offset = self.result.len() ;
        let mut zx = self.last_zx.clone();
        let mut zy = self.last_zy.clone();
        let mut dx = self.last_dx.clone();
        let mut dy = self.last_dy.clone();
        let two = Float::from_primitive_float_prec(2.0, 128).0;
        let one = Float::from_primitive_float_prec(1.0, 128).0;
        let total_iter: usize = 10_000.min(max_iter as usize);
        //let mut computed = 0;
        while self.last_iter < total_iter { //&& computed < 1000
            if zx.clone() * zx.clone() + zy.clone() * zy.clone() > Float::from(self.mu) {
                self.result.push(MandelbrotStep {
                    zx: 0.0,
                    zy: 0.0,
                    dx: 0.0,
                    dy: 0.0,
                });
            } else {
                self.result.push(MandelbrotStep {
                    zx: zx.clone().to_string().parse::<f32>().unwrap(),
                    zy: zy.clone().to_string().parse::<f32>().unwrap(),
                    dx: dx.clone().to_string().parse::<f32>().unwrap(),
                    dy: dy.clone().to_string().parse::<f32>().unwrap(),
                });
                let dx_new = zx.clone() * dx.clone() * two.clone() + one.clone();
                let dy_new = zy.clone() * dy.clone() * two.clone();
                let zx_new = zx.clone() * zx.clone() - zy.clone() * zy.clone() + self.reference_cx.clone();
                let zy_new = two.clone() * zx.clone() * zy.clone() + self.reference_cy.clone();
                zx = zx_new;
                zy = zy_new;
                dx = dx_new;
                dy = dy_new;
            }
            self.last_iter += 1;
            //computed += 1;
        }
        // Stocker la dernière valeur exacte
        self.last_zx = zx.clone();
        self.last_zy = zy.clone();
        self.last_dx = dx.clone();
        self.last_dy = dy.clone();
        let ptr = self.result.as_ptr() as usize;
        let count = self.last_iter;
        OrbitBufferInfo {
            ptr,
            offset,
            count,
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

    pub fn scale(&mut self, value: &str) {
        let new_scale = Float::from_string_base(10, value).unwrap();
        self.scale = new_scale.clone();
        self.target_scale = new_scale;
    }

    pub fn angle(&mut self, value: f64) {
        self.angle = value;
        self.target_angle = value;
    }


    pub fn origin(&mut self, cx: &str, cy: &str) {
        info!("new cx: {}, cy: {}", cx, cy);
        let new_cx = Float::from_string_base(16, cx).unwrap_throw();
        let new_cy = Float::from_string_base(16, cy).unwrap_throw();
        info!("new cx: {}, cy: {}", new_cx, new_cy);
        self.cx = new_cx.clone();
        self.cy = new_cy.clone();
        self.target_cx = new_cx;
        self.target_cy = new_cy;
    }
}


#[wasm_bindgen]
pub struct OrbitBufferInfo {
    pub ptr: usize,
    pub offset: usize,
    pub count: usize,
}
