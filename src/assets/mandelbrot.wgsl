struct MandelbrotStep {
  zx: f32,
  zy: f32,
  dx: f32,
  dy: f32,
};

struct Mandelbrot {
  cx: f32,
  cy: f32,
  mu: f32,
  scale: f32,
  aspect: f32,
  angle: f32,
  maxIteration: f32,
  epsilon: f32,
  antialiasLevel: f32,
  pad0: f32,
  pad1: f32,
  pad2: f32,
};

@group(0) @binding(0) var<uniform> mandelbrot: Mandelbrot;
@group(0) @binding(1) var<storage, read> mandelbrotOrbitPointSuite: array<MandelbrotStep>;
@group(0) @binding(2) var rawIn: texture_2d<f32>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) VertexIndex: u32) -> VertexOutput {
  var pos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( 1.0,  1.0)
  );
  var out: VertexOutput;
  out.position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
  out.uv = (pos[VertexIndex] + vec2<f32>(1.0, 1.0)) * 0.5;
  return out;
}

// Fragment shader
fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

fn cdiv(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  let denominator: f32 = b.x * b.x + b.y * b.y;
  return vec2<f32>((a.x * b.x + a.y * b.y) / denominator, (a.y * b.x - a.x * b.y) / denominator);
}

fn getOrbit(index: i32) -> vec2<f32> {
  return vec2<f32>(
    mandelbrotOrbitPointSuite[index].zx,
    mandelbrotOrbitPointSuite[index].zy,
  );
}

fn mandelbrot_func(x0: f32, y0: f32) -> vec4<f32> {
  let dc = vec2<f32>(x0, y0);
  let max_iteration = mandelbrot.maxIteration;
  var z = getOrbit(0);
  var dz = vec2<f32>(0.0, 0.0);
  var der = vec2<f32>(1.0, 0.0);
  var i = 0.0;
  var ref_i = 0;
  let muLimit = mandelbrot.mu;
  var d = vec2<f32>(1.0, 0.0);
  let epsilon = mandelbrot.epsilon;

  while (i < max_iteration) {
    z = getOrbit(ref_i);
    dz = 2.0 * cmul(dz, z) + cmul(dz, dz) + dc;
    ref_i += 1;

    z = getOrbit(ref_i) + dz;
    d = cdiv(der, z);

    let dot_z = dot(z, z);
    if (dot_z > muLimit) {
      break;
    }
    if (dot(der, der) < epsilon) {
      // Keep negative values reserved for sentinels.
      // Treat this case as "inside" (nu == 0.0).
      i = 0.0;
      break;
    }
    der = cmul(der * 2.0, z);

    let dot_dz = dot(dz, dz);
    if (dot_z < dot_dz || f32(ref_i) == max_iteration) {
      dz = z;
      ref_i = 0;
    }
    i += 1.0;
  }

  if (i >= max_iteration) {
    i = 0.0;
  } else {
    if (i >= 0.0) {
      let log_zn = log(dz.x * dz.x + dz.y * dz.y) / 2.0;
      let nu = log(log_zn / log(2.0)) / log(2.0);
      i = i + 1.0 - nu;
      i = abs(i);
    }
  }

  // Reserve negative values for progressive sentinels only.
  i = max(i, 0.0);

  let angle_der = atan2(d.y, d.x);
  let distance = dot(z, z) * 2.0 * log(dot(z, z)) / dot(d, d);
  return vec4<f32>(i, distance / (mandelbrot.scale * 1000.0), angle_der, length(dz));
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let dims = vec2<i32>(textureDimensions(rawIn, 0));
  let coord = vec2<i32>(
    i32(clamp(uv.x * f32(dims.x), 0.0, f32(dims.x - 1))),
    i32(clamp((1.0 - uv.y) * f32(dims.y), 0.0, f32(dims.y - 1)))
  );

  let prev = textureLoad(rawIn, coord, 0);
  if (prev.x != -1.0) {
    // Pass-through already computed pixels and non -1 sentinels.
    return prev;
  }

  // Neutral mapping: the neutral texture is a square that can contain the rotated screen.
  // We map neutral uv -> local_rot (aspect is already applied on X) using the half-diagonal extent.
  // Rotation is applied later in the final color pass, so we generate the full local_rot domain here.
  let xy_neutral = vec2<f32>(uv.x * 2.0 - 1.0, uv.y * 2.0 - 1.0);
  let neutralExtent = sqrt(mandelbrot.aspect * mandelbrot.aspect + 1.0);
  let local_rot = xy_neutral * neutralExtent;

  let x0 = local_rot.x * mandelbrot.scale + mandelbrot.cx;
  let y0 = local_rot.y * mandelbrot.scale + mandelbrot.cy;
  return mandelbrot_func(x0, y0);
}
