
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
angle: f32,
maxIteration: f32,
epsilon: f32,
antialiasLevel: f32,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

//@group(0) @binding(1) var<storage, read> mandelbrot: array<MandelbrotStep>;

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

// Fragment shader
fn vpow2(v: vec2<f32>) -> vec2<f32> {
     return vec2(v.x * v.x - v.y * v.y, 2. * v.x * v.y);
}

// cmul is a complex multiplication
fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

// cdiv is a complex division
fn cdiv(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
    var denominator: f32 = b.x * b.x + b.y * b.y;
    return vec2<f32>((a.x * b.x + a.y * b.y) / denominator, (a.y * b.x - a.x * b.y) / denominator);
}

fn mandelbrot_func(x0: f32, y0: f32) -> vec2<f32> {
//  let max_iter_f: f32 = clamp(80.0 + 40.0 * log2(1.0 / uniforms.scale), 128.0, 1000000.0);
  let max_iter: u32 = u32(uniforms.maxIteration);
  var x: f32 = 0.0;
  var y: f32 = 0.0;
  var iter: u32 = 0;
  var x2: f32 = 0.0;
  var y2: f32 = 0.0;
  var dx: f32 = 0.0;
  var dy: f32 = 0.0;
  var w = 0.0;
  var d: f32 = 1.0;
  while (x2 + y2 <= 100.0 && iter < max_iter) {
    x = x2 - y2 + x0;
    y = w - x2 - y2 + y0;
    x2 = x*x;
    y2 = y*y;
    w = (x + y) * (x + y);
    // compute derivative d
    d = 2.0 * sqrt(x2 + y2) * d + 1.0;
    iter += 1;
  }
  var nu = 0.0;
  if(x2 + y2 > 100.0) {
      let log_zn = log(x2 + y2) / 2.0;
      nu = f32(iter) + 1.0 - log(log_zn / log(2.0)) / log(2.0);
  }
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











