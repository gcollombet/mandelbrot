use std::iter;
use std::sync::Arc;
use log::info;
use winit::{
    application::ApplicationHandler, event::*, event_loop::{ActiveEventLoop, EventLoop}, keyboard::{KeyCode, PhysicalKey}, window::Window
};


#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;
use malachite_float::Float;

// This will store the state of our game
pub struct State {
    surface: wgpu::Surface<'static>,
    device: wgpu::Device,
    queue: wgpu::Queue,
    config: wgpu::SurfaceConfiguration,
    is_surface_configured: bool,
    window: Arc<Window>,
}

impl State {
    // We don't need this to be async right now,
    // but we will in the next tutorial
    pub async fn new(window: Arc<Window>) -> anyhow::Result<Self> {
        let size = window.inner_size();

        // The instance is a handle to our GPU
        // BackendBit::PRIMARY => Vulkan + Metal + DX12 + Browser WebGPU
        let instance = wgpu::Instance::new(&wgpu::InstanceDescriptor {
            #[cfg(not(target_arch = "wasm32"))]
            backends: wgpu::Backends::PRIMARY,
            #[cfg(target_arch = "wasm32")]
            backends: wgpu::Backends::PRIMARY,
            ..Default::default()
        });

        let surface = instance.create_surface(window.clone()).unwrap();

        let adapter = instance
            .request_adapter(&wgpu::RequestAdapterOptions {
                power_preference: wgpu::PowerPreference::default(),
                compatible_surface: Some(&surface),
                force_fallback_adapter: false,
            })
            .await?;

        let (device, queue) = adapter
            .request_device(&wgpu::DeviceDescriptor {
                label: None,
                required_features: wgpu::Features::empty(),
                // WebGL doesn't support all of wgpu's features, so if
                // we're building for the web we'll have to disable some.
                required_limits: if cfg!(target_arch = "wasm32") {
                    wgpu::Limits::default()
                } else {
                    wgpu::Limits::default()
                },
                memory_hints: Default::default(),
                trace: wgpu::Trace::Off,
            })
            .await?;

        let surface_caps = surface.get_capabilities(&adapter);

        // Shader code in this tutorial assumes an Srgb surface texture. Using a different
        // one will result all the colors comming out darker. If you want to support non
        // Srgb surfaces, you'll need to account for that when drawing to the frame.
        let surface_format = surface_caps
            .formats
            .iter()
            .copied()
            .find(|f| f.is_srgb())
            .unwrap_or(surface_caps.formats[0]);
        let config = wgpu::SurfaceConfiguration {
            usage: wgpu::TextureUsages::RENDER_ATTACHMENT,
            format: surface_format,
            width: size.width,
            height: size.height,
            present_mode: surface_caps.present_modes[0],
            alpha_mode: surface_caps.alpha_modes[0],
            desired_maximum_frame_latency: 2,
            view_formats: vec![],
        };

        Ok(Self {
            surface,
            device,
            queue,
            config,
            is_surface_configured: false,
            window,
        })
    }

    pub fn resize(&mut self, width: u32, height: u32) {
        if width > 0 && height > 0 {
            self.config.width = width;
            self.config.height = height;
            self.surface.configure(&self.device, &self.config);
            self.is_surface_configured = true;
        }
    }

    fn update(&mut self) {}

    pub fn render(&mut self) -> Result<(), wgpu::SurfaceError>  {
        self.window.request_redraw();

        // We can't render unless the surface is configured
        if !self.is_surface_configured {
            return Ok(());
        }

        let output = self.surface.get_current_texture()?;
        let view = output
            .texture
            .create_view(&wgpu::TextureViewDescriptor::default());

        let mut encoder = self
            .device
            .create_command_encoder(&wgpu::CommandEncoderDescriptor {
                label: Some("Render Encoder"),
            });

        {
            let _render_pass = encoder.begin_render_pass(&wgpu::RenderPassDescriptor {
                label: Some("Render Pass"),
                color_attachments: &[Some(wgpu::RenderPassColorAttachment {
                    view: &view,
                    resolve_target: None,
                    ops: wgpu::Operations {
                        load: wgpu::LoadOp::Clear(wgpu::Color {
                            r: 0.1,
                            g: 0.2,
                            b: 0.9,
                            a: 1.0,
                        }),
                        store: wgpu::StoreOp::Store,
                    },
                    depth_slice: None,
                })],
                depth_stencil_attachment: None,
                occlusion_query_set: None,
                timestamp_writes: None,
            });
        }

        self.queue.submit(iter::once(encoder.finish()));
        output.present();

        Ok(())
    }

    fn handle_key(&mut self, event_loop: &ActiveEventLoop, code: KeyCode, is_pressed: bool) {
        match (code, is_pressed) {
            (KeyCode::Escape, true) => event_loop.exit(),
            _ => {
                info!("key pressed: {:?} {:?}", code, is_pressed);
            }
        }
    }

}

pub struct App {
    #[cfg(target_arch = "wasm32")]
    proxy: Option<winit::event_loop::EventLoopProxy<State>>,
    state: Option<State>,
}

impl App {
    pub fn new(#[cfg(target_arch = "wasm32")] event_loop: &EventLoop<State>) -> Self {
        #[cfg(target_arch = "wasm32")]
        let proxy = Some(event_loop.create_proxy());
        Self {
            state: None,
            #[cfg(target_arch = "wasm32")]
            proxy,
        }
    }
}

impl ApplicationHandler<State> for App {
    fn resumed(&mut self, event_loop: &ActiveEventLoop) {
        #[allow(unused_mut)]
        let mut window_attributes = Window::default_attributes();

        #[cfg(target_arch = "wasm32")]
        {
            use wasm_bindgen::JsCast;
            use winit::platform::web::WindowAttributesExtWebSys;

            const CANVAS_ID: &str = "canvas";

            let window = web_sys::window().unwrap_throw();
            let document = window.document().unwrap_throw();
            let canvas = document.get_element_by_id(CANVAS_ID)
                .expect_throw("canvas not found in document");
            let html_canvas_element = canvas.unchecked_into();
            window_attributes = window_attributes.with_canvas(Some(html_canvas_element));
        }

        let window = Arc::new(event_loop.create_window(window_attributes).unwrap());

        #[cfg(not(target_arch = "wasm32"))]
        {
            // If we are not on web we can use pollster to
            // await the 
            self.state = Some(pollster::block_on(State::new(window)).unwrap());
        }

        #[cfg(target_arch = "wasm32")]
        {
            // Run the future asynchronously and use the
            // proxy to send the results to the event loop
            if let Some(proxy) = self.proxy.take() {
                wasm_bindgen_futures::spawn_local(async move {
                    assert!(proxy
                        .send_event(
                            State::new(window)
                                .await
                                .expect("Unable to create canvas!!!")
                        )
                        .is_ok())
                });
            }
        }
    }

    #[allow(unused_mut)]
    fn user_event(&mut self, _event_loop: &ActiveEventLoop, mut event: State) {
        #[cfg(target_arch = "wasm32")]
        {
            event.window.request_redraw();
            event.resize(
                event.window.inner_size().width,
                event.window.inner_size().height,
            );
        }
        self.state = Some(event);
    }

    fn window_event(
        &mut self,
        event_loop: &ActiveEventLoop,
        _window_id: winit::window::WindowId,
        event: WindowEvent,
    ) {
        let state = match &mut self.state {
            Some(canvas) => canvas,
            None => return,
        };

        match event {
            WindowEvent::CloseRequested => event_loop.exit(),
            WindowEvent::Resized(size) => state.resize(size.width, size.height),
            WindowEvent::RedrawRequested => {
                state.update();
                match state.render() {
                    Ok(_) => {}
                    // Reconfigure the surface if it's lost or outdated
                    Err(wgpu::SurfaceError::Lost | wgpu::SurfaceError::Outdated) => {
                        let size = state.window.inner_size();
                        state.resize(size.width, size.height);
                    }
                    Err(e) => {
                        log::error!("Unable to render {}", e);
                    }
                }
            }
            WindowEvent::MouseInput { state, button, .. } => match (button, state.is_pressed()) {
                (MouseButton::Left, true) => {
                    info!("Clicked left pressed");
                }
                (MouseButton::Left, false) => {}
                _ => {}
            },
            WindowEvent::KeyboardInput {
                event:
                KeyEvent {
                    physical_key: PhysicalKey::Code(code),
                    state: key_state,
                    ..
                },
                ..
            } => state.handle_key(event_loop, code, key_state.is_pressed()),
            _ => {}
        }
    }

}

pub fn run() -> anyhow::Result<()> {
    #[cfg(not(target_arch = "wasm32"))]
    {
        env_logger::init();
    }
    #[cfg(target_arch = "wasm32")]
    {
        console_log::init_with_level(log::Level::Info).unwrap_throw();
    }

    let event_loop = EventLoop::with_user_event().build()?;
    let mut app = App::new(
        #[cfg(target_arch = "wasm32")]
        &event_loop,
    );
    event_loop.run_app(&mut app)?;

    Ok(())
}

#[wasm_bindgen]
#[derive(Clone)]
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

static mut c: Option<Box<Mandelbrot>> = None;

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen]
pub unsafe fn moveMandelbrot(
    velocityCx: f32,
    velocityCy: f32,
    velocityAngle: f32,
    velocityScale: f32,
) -> Vec<f32>  {
    if unsafe { c.is_none() } {
        unsafe {
            c = Some(Box::new(Mandelbrot {
                cx: Float::from(0.0),
                cy: Float::from(0.0),
                scale: Float::from(1.0),
                angle: Float::from(0.0),
            }));
        }
    }

    let mandelbrot = c.as_mut().unwrap();

    let velocityAngle =  Float::from(velocityAngle) * mandelbrot.scale.clone();
    let velocityCx =  Float::from(velocityCx) * mandelbrot.scale.clone();
    let velocityCy =  Float::from(velocityCy) * mandelbrot.scale.clone();
    let velocityScale =  Float::from(velocityScale);

    mandelbrot.cx += velocityCx;
    mandelbrot.cy += velocityCy;
    mandelbrot.scale += velocityScale;
    mandelbrot.angle += velocityAngle;

    // Calcul du f32 le plus proche
    let fcx = Float::from(mandelbrot.cx.clone().to_string().parse::<f32>().unwrap());
    let fcy = Float::from(mandelbrot.cy.clone().to_string().parse::<f32>().unwrap());

    // Calcul de la différence entre le Float et le f32
    let dcx = mandelbrot.cx.clone() - fcx.clone();
    let dcy = mandelbrot.cy.clone() - fcy.clone();

    vec![
        dcx.clone().to_string().parse::<f32>().unwrap(),
        dcy.clone().to_string().parse::<f32>().unwrap(),
        mandelbrot.scale.clone().to_string().parse::<f32>().unwrap(),
        mandelbrot.angle.clone().to_string().parse::<f32>().unwrap(),
    ]

}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen()]
pub fn run_web() -> Result<(), wasm_bindgen::JsValue> {
    console_error_panic_hook::set_once();
    run().unwrap_throw();
    Ok(())
}

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct MandelbrotNavigator {
    cx: Box<Float>,
    cy: Box<Float>,
    scale: Box<Float>,
    angle: f64,
    target_cx: Box<Float>,
    target_cy: Box<Float>,
    target_scale: Box<Float>,
    target_angle: f64,
    result: Box<Vec<MandelbrotStep>>, // Vecteur pré-alloué
    last_iter: usize, // Dernière itération calculée
    previous_c: (Float, Float), // Dernier C vu
}

#[wasm_bindgen]
impl MandelbrotNavigator {

    #[wasm_bindgen(constructor)]
    pub fn new(cx: f64, cy: f64, scale: f64, angle: f64) -> MandelbrotNavigator {
        MandelbrotNavigator {
            cx: Box::new(Float::from(cx)),
            cy: Box::new(Float::from(cy)),
            scale: Box::new(Float::from(scale)),
            angle,
            target_cx: Box::new(Float::from(cx)),
            target_cy: Box::new(Float::from(cy)),
            target_scale: Box::new(Float::from(scale)),
            target_angle: angle,
            result: Box::new(Vec::with_capacity(1_000_000)),
            last_iter: 0,
            previous_c: (Float::from(cx), Float::from(cy)),
        }
    }

    pub fn translate(&mut self, dx: f64, dy: f64) {
        // dx/dy sont des valeurs entre 0 et 1 (écran)
        // On convertit en déplacement complexe selon l'échelle et l'angle
        let scale = &*self.scale;
        let angle = self.angle;
        let delta_x = Float::from(dx) * scale * Float::from(angle.cos()) - Float::from(dy) * scale * Float::from(angle.sin());
        let delta_y = Float::from(dx) * scale * Float::from(angle.sin()) + Float::from(dy) * scale * Float::from(angle.cos());
        self.target_cx = Box::new(&*self.cx + delta_x);
        self.target_cy = Box::new(&*self.cy + delta_y);
    }

    pub fn rotate(&mut self, delta_angle: f64) {
        self.target_angle = self.angle + delta_angle;
    }

    pub fn translate_direct(&mut self, dx: f32, dy: f32) {
        let scale = &*self.scale;
        let angle = self.angle;
        let delta_x = Float::from(dx as f64) * scale * Float::from(angle.cos()) - Float::from(dy as f64) * scale * Float::from(angle.sin());
        let delta_y = Float::from(dx as f64) * scale * Float::from(angle.sin()) + Float::from(dy as f64) * scale * Float::from(angle.cos());
        self.cx = Box::new(&*self.cx + delta_x);
        self.cy = Box::new(&*self.cy + delta_y);
        self.target_cx = self.cx.clone();
        self.target_cy = self.cy.clone();
    }

    pub fn rotate_direct(&mut self, delta_angle: f64) {
        self.angle += delta_angle;
        self.target_angle = self.angle;
    }

    pub fn zoom(&mut self, factor: f64) {
        // Animation du zoom vers la nouvelle échelle cible
        let new_scale = &*self.scale * Float::from(factor);
        self.target_scale = Box::new(new_scale);
    }

    pub fn step(&mut self) -> Vec<f64> {
        // Animation simple vers la cible
        let speed = Float::from(0.5);
        let dcx = (&*self.target_cx - &*self.cx) * &speed;
        let dcy = (&*self.target_cy - &*self.cy) * &speed;
        if(dcx.clone().to_string().parse::<f64>().unwrap().abs() < 1e-5) {
            self.cx = self.target_cx.clone();
        } else {
            self.cx = Box::new(&*self.cx + &dcx);
        }
        if(dcy.clone().to_string().parse::<f64>().unwrap().abs() < 1e-5) {
            self.cy = self.target_cy.clone();
        } else {
            self.cy = Box::new(&*self.cy + &dcy);
        }
        let dscale = (&*self.target_scale - &*self.scale) * &speed;
        if(dscale.clone().to_string().parse::<f64>().unwrap().abs() < 1e-5) {
            self.scale = self.target_scale.clone();
        } else {
            self.scale = Box::new(&*self.scale + &dscale);
        }
        let dangle = (self.target_angle - self.angle) * 0.1;
        self.angle += dangle;
        vec![
            self.cx.to_string().parse::<f64>().unwrap(),
            self.cy.to_string().parse::<f64>().unwrap(),
            self.scale.to_string().parse::<f64>().unwrap(),
            self.angle,
        ]
    }

    pub fn get_params(&self) -> Vec<f64> {
        vec![
            self.cx.clone().to_string().parse::<f64>().unwrap(),
            self.cy.clone().to_string().parse::<f64>().unwrap(),
            self.scale.clone().to_string().parse::<f64>().unwrap(),
            self.angle
        ]
    }

    pub fn compute_reference_orbit(&mut self, max_iter: u32) -> Vec<MandelbrotStep> {
        let cx = &*self.cx;
        let cy = &*self.cy;
        // Si C a changé, on reset le compteur et le vecteur
        if &self.previous_c.0 != cx || &self.previous_c.1 != cy {
            self.result.clear();
            self.last_iter = 0;
            self.previous_c = (cx.clone(), cy.clone());
        }
        let mut zx = if self.last_iter == 0 { Float::from(0.0) } else { Float::from(self.result[self.last_iter-1].zx) };
        let mut zy = if self.last_iter == 0 { Float::from(0.0) } else { Float::from(self.result[self.last_iter-1].zy) };
        let mut dx = if self.last_iter == 0 { Float::from(0.0) } else { Float::from(self.result[self.last_iter-1].dx) };
        let mut dy = if self.last_iter == 0 { Float::from(0.0) } else { Float::from(self.result[self.last_iter-1].dy) };
        let two = Float::from(2.0);
        let one = Float::from(1.0);
        let total_iter: usize = max_iter.min(1_000_000) as usize;
        let mut computed = 0;
        while self.last_iter < total_iter && computed < 1000 {
            self.result.push(MandelbrotStep {
                zx: zx.clone().to_string().parse::<f32>().unwrap(),
                zy: zy.clone().to_string().parse::<f32>().unwrap(),
                dx: dx.clone().to_string().parse::<f32>().unwrap(),
                dy: dy.clone().to_string().parse::<f32>().unwrap(),
            });
            let dx_new = zx.clone() * dx.clone() * two.clone() + one.clone();
            let dy_new = zy.clone() * dy.clone() * two.clone();
            let zx_new = zx.clone() * zx.clone() - zy.clone() * zy.clone() + cx.clone();
            let zy_new = two.clone() * zx.clone() * zy.clone() + cy.clone();
            zx = zx_new;
            zy = zy_new;
            dx = dx_new;
            dy = dy_new;
            self.last_iter += 1;
            computed += 1;
            if zx.clone() * zx.clone() + zy.clone() * zy.clone() > Float::from(100000.0) {
                break;
            }
        }
        // Retourne le slice calculé
        self.result[0..self.last_iter].to_vec()
    }
}
