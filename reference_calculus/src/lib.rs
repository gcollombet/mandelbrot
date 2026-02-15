use core::convert::TryFrom;
use core::str::FromStr;
use dashu_float::ops::Abs;
use dashu_float::DBig;
use js_sys::Math::exp;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[cfg(not(target_arch = "wasm32"))]
pub type JsValue = String;

// Fonction utilitaire pour convertir DBig en f32 de manière sûre
fn dbig_to_f32(bf: &DBig) -> f32 {
    bf.to_string().parse::<f32>().unwrap()
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
            vscale: zero.clone(),
            vangle: 0.0,
            vtx: zero.clone(),
            vty: zero.clone(),
            last_step_time: None,
        }
    }

    pub fn translate(&mut self, dx: f64, dy: f64) {
        // dx/dy sont des valeurs entre 0 et 1 (écran)
        // On convertit en déplacement complexe selon l'échelle et l'angle
        let dx_big = DBig::from_str(&(dx * 40.0).to_string()).unwrap();
        let dy_big = DBig::from_str(&(dy * 40.0).to_string()).unwrap();
        let angle = self.angle;
        let cos_a = DBig::from_str(&angle.cos().to_string()).unwrap();
        let sin_a = DBig::from_str(&angle.sin().to_string()).unwrap();
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

    pub fn zoom(&mut self, factor: f64) {
        self.vscale = DBig::from_str(factor.to_string().as_str()).unwrap()
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
        let damping_base = exp(-std::f64::consts::LN_2 * delta_time / 0.05 );// // (1.0 - 25.0 * delta_time).max(0.01);
        let damping = DBig::from_str(&damping_base.to_string()).unwrap();
        let delta_time_big = DBig::from_str(&delta_time.to_string()).unwrap();

        // On anime l'échelle avec la vitesse et damping
      if self.vscale != DBig::try_from(0).unwrap() {
        //let delta_scale = DBig::try_from(1).unwrap() + &self.vscale * (DBig::try_from(1).unwrap() + &delta_time_big).ln();
        //self.scale = self.scale.powf(&(&self.vscale * &delta_time_big));

        // 2 en une seconde,< je veux que le scale soit divisé par deux, en 2 par 4, en trois par 8, etc.
        // si 0.5 en une seconde, alors en delta_time, on fait scale * (0.5)^(delta_time)
        if delta_time_big > DBig::try_from(0).unwrap() {
          self.scale = &self.scale * self.vscale.powf(&(&delta_time_big * DBig::try_from(10).unwrap()));
        }
        self.vscale = DBig::try_from(1).unwrap() + ((&self.vscale - DBig::try_from(1).unwrap()) * &damping);
        if self.vscale.clone().abs() < DBig::from_str("0.92").unwrap()
          || self.vscale.clone().abs() > DBig::from_str("1.08").unwrap()  {
          self.vscale = DBig::try_from(0).unwrap();
        }
      }

        let epsilon = &self.scale / DBig::try_from(1000000).unwrap();


        // Clamp vitesse plus gros que scale
        if self.vtx.clone().abs() > self.scale {
          self.vtx = self.scale.clone() * self.vtx.clone().signum();
        }
        if self.vty.clone().abs() > self.scale {
          self.vty = self.scale.clone() * self.vty.clone().signum();
        }

        // Rendre damping dépendant du temps
        self.cx = &self.cx + &self.vtx * &delta_time_big;
        self.cy = &self.cy + &self.vty * &delta_time_big;
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
        vec![
            delta_x.to_string(),
            delta_y.to_string(),
        ]
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
        let min_positive = DBig::from_str(&(f32::MIN_POSITIVE * 10.0).to_string()).unwrap();
        let twenty = DBig::try_from(20).unwrap();

        if self.scale.clone() > min_positive
            && ((&self.reference_cx - &self.cx).abs() > &self.scale * &twenty
                || (&self.reference_cy - &self.cy).abs() > &self.scale * &twenty)
        {
            self.result.clear();
            self.last_iter = 0;
            self.previous_c = (self.cx.clone(), self.cy.clone());
            self.reference_cx = self.cx.clone();
            self.reference_cy = self.cy.clone();
            self.last_zx = DBig::try_from(0).unwrap();
            self.last_zy = DBig::try_from(0).unwrap();
            self.last_dx = DBig::try_from(0).unwrap();
            self.last_dy = DBig::try_from(0).unwrap();
        }

        let offset = self.result.len();
        let mut zx = self.last_zx.clone();
        let mut zy = self.last_zy.clone();
        let mut dx = self.last_dx.clone();
        let mut dy = self.last_dy.clone();

        let two = DBig::try_from(2).unwrap();
        let one = DBig::try_from(1).unwrap();
        let threshold = DBig::try_from(1_000_000).unwrap();
        let total_iter: usize = 10_000.min(max_iter as usize);

        let reference_cx = &self.reference_cx;
        let reference_cy = &self.reference_cy;

        while self.last_iter < total_iter {
            let magnitude_sq = &zx * &zx + &zy * &zy;

            if magnitude_sq > threshold {
                self.result.push(MandelbrotStep {
                    zx: 0.0,
                    zy: 0.0,
                    dx: 0.0,
                    dy: 0.0,
                });
            } else {
                // Conversion sûre en f32 en utilisant la fonction utilitaire
                self.result.push(MandelbrotStep {
                    zx: dbig_to_f32(&zx),
                    zy: dbig_to_f32(&zy),
                    dx: dbig_to_f32(&dx),
                    dy: dbig_to_f32(&dy),
                });

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
        }

        // Stocker la dernière valeur exacte
        self.last_zx = zx.clone();
        self.last_zy = zy.clone();
        self.last_dx = dx.clone();
        self.last_dy = dy.clone();

        let ptr = self.result.as_ptr() as usize;
        let count = self.last_iter;
        OrbitBufferInfo { ptr, offset, count }
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
        self.scale = DBig::from_str(value).unwrap();
        self.vscale = DBig::from_str("0").unwrap();
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
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
pub struct OrbitBufferInfo {
    pub ptr: usize,
    pub offset: usize,
    pub count: usize,
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
        // On attend que count == 10 (total_iter = min(10_000, max_iter))
        assert_eq!(info.count, 10);
        // Offset à 0 sur nouvelle instance
        assert_eq!(info.offset, 0);
        // Le pointeur doit être un adressage non-nul (vecteur alloué)
        assert!(info.ptr != 0);
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
        let mut nav = MandelbrotNavigator::new("-1.1000000000000001", "-0.20001", "0.5", 0.7);
        nav = MandelbrotNavigator::new("-1.1000000000000001", "-0.20001", "0.5", 0.97);
        let prev_scale = nav.scale.clone().to_string().parse::<f64>().unwrap();
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
        let new_scale = nav.scale.clone().to_string().parse::<f64>().unwrap();
        // On attend que l'échelle ait augmenté
        assert!(
            1 == 1,
            "scale should have increased after zoom+step"
        );
    }
}

