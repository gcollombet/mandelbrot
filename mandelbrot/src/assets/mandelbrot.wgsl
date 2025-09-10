
struct MandelbrotStep {
  zx: f32,
  zy: f32,
  dx: f32,
  dy: f32,
};

struct Uniforms {
  cx: f32,
  cy: f32,
  scale: f32,
  aspect: f32,
  antialiasLevel: i32,
  angle: f32,
  palettePeriod: f32,
};

    @group(0) @binding(0) var<uniform> uniforms: Uniforms;
    // Correction : utiliser storage buffer
    @group(0) @binding(1) var<storage, read> mandelbrot: array<MandelbrotStep>;
    struct VertexOutput {
      @builtin(position) position : vec4<f32>,
      @location(0) fragCoord : vec2<f32>
    };
    @vertex
    fn vs_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {
      var pos = array<vec2<f32>, 6>(
        vec2<f32>(-1.0, -1.0),
        vec2<f32>( 1.0, -1.0),
        vec2<f32>(-1.0,  1.0),
        vec2<f32>(-1.0,  1.0),
        vec2<f32>( 1.0, -1.0),
        vec2<f32>( 1.0,  1.0)
      );
      var out : VertexOutput;
      out.position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
      out.fragCoord = (pos[VertexIndex] + vec2<f32>(1.0, 1.0)) * 0.5;
      return out;
    }
    fn get_orbit_step(iter: i32) -> MandelbrotStep {
      let idx = clamp(iter, 0, i32(arrayLength(&mandelbrot)) - 1);
      return mandelbrot[idx];
    }
    fn mandelbrot_func(x0: f32, y0: f32) -> vec2<f32> {
      let max_iter_f: f32 = clamp(80.0 + 40.0 * log2(1.0 / uniforms.scale), 128.0, f32(arrayLength(&mandelbrot)));
      let max_iter: i32 = i32(max_iter_f);
      var x: f32 = 0.0;
      var y: f32 = 0.0;
      var iter: i32 = 0;
      var x2: f32 = 0.0;
      var y2: f32 = 0.0;
      var dx: f32 = 0.0;
      var dy: f32 = 0.0;
      var d: f32 = 1.0;
      while (x2 + y2 <= 1000.0 && iter < max_iter) {
        let xtemp = x*x - y*y + x0;
        y = 2.0*x*y + y0;
        x = xtemp;
        x2 = x*x;
        y2 = y*y;
        d = 2.0 * sqrt(x2 + y2);
        iter = iter + 1;
      }
      let step = get_orbit_step(iter);
      let log_zn = log(x2 + y2) / 2.0;
      let nu = f32(iter) + 1.0 - log(log_zn / log(2.0)) / log(2.0);
      return vec2<f32>(nu, d);
    }
    fn rotate(x: f32, y: f32, angle: f32) -> vec2<f32> {
      let s = sin(angle);
      let c = cos(angle);
      return vec2<f32>(c * x - s * y, s * x + c * y);
    }
    @fragment
    fn fs_main(@location(0) fragCoord: vec2<f32>) -> @location(0) vec4<f32> {
      var xy = rotate((fragCoord.x * 2.0 - 1.0) * uniforms.scale * uniforms.aspect, (fragCoord.y * 2.0 - 1.0) * uniforms.scale, uniforms.angle);
      let x0 = xy.x + uniforms.cx;
      let y0 = xy.y + uniforms.cy;
      let res = mandelbrot_func(x0, y0);
      return vec4<f32>(res.x, res.y, 0.0, 1.0);
    }
