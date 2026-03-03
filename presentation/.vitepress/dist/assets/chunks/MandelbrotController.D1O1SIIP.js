var aa=Object.defineProperty;var ia=(J,H,ue)=>H in J?aa(J,H,{enumerable:!0,configurable:!0,writable:!0,value:ue}):J[H]=ue;var u=(J,H,ue)=>ia(J,typeof H!="symbol"?H+"":H,ue);import{aq as oa,ar as St,as as Bt,d as Ze,at as K,z as Et,p as Rt,s as At,o as Re,c as Ae,au as Pt,y as Pe,U as Ct,av as na,j as y,an as sa,n as X,J as Xe,T as la,w as ua,e as ca,_ as Ut}from"./framework.D9P6SV0X.js";let Gt,je,xe,Nt,le,ye,da=(async()=>{const J=`// Mandelbrot progressive-iteration shader.
//
// Layer layout (r32float texture_2d_array, 7 layers):
//   0 : sentinel / iteration count (integer part).
//       Negative  => sentinel (brush/resolve system).  -1 = compute request.
//       0         => inside the set (confirmed), or budget fully exhausted at globalMaxIter.
//       > 0       => escaped (|z|\xB2 >= 4) or budget-exhausted mid-progress (|z|\xB2 < 4).
//   1 : mu \u2013 purely cosmetic smooth fractional part for coloring escaped pixels.
//       Only meaningful when iter > 0 AND |z|\xB2 >= 4 (escaped).
//   2 : z.x   (real part of current z, for resuming)
//   3 : z.y   (imag part of current z, for resuming)
//   4 : dz.x  (real part of derivative, for resuming)
//   5 : dz.y  (imag part of derivative, for resuming)
//   6 : angle_der (distance-estimation angle, for shading)
//
// Pixel state convention (iter-only, no mu in state logic):
//   iter == -1                     : sentinel, needs computation
//   iter == 0                      : confirmed inside the set (or exhausted at globalMaxIter)
//   iter > 0  AND  |z|\xB2 >= 4      : escaped \u2192 color with iter + mu
//   iter > 0  AND  |z|\xB2 < 4       : budget exhausted mid-progress \u2192 needs continuation

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
  maxIteration: f32,    // iterations to compute THIS pass
  epsilon: f32,
  antialiasLevel: f32,
  iterationOffset: f32, // iterations already completed in previous passes
  globalMaxIter: f32,   // total iteration target for the current view
  pad2: f32,
};

@group(0) @binding(0) var<uniform> mandelbrot: Mandelbrot;
@group(0) @binding(1) var<storage, read> mandelbrotOrbitPointSuite: array<MandelbrotStep>;
@group(0) @binding(2) var rawIn: texture_2d_array<f32>;

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

// \u2500\u2500 complex helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

fn cdiv(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  let denominator: f32 = b.x * b.x + b.y * b.y;
  return vec2<f32>((a.x * b.x + a.y * b.y) / denominator,
                   (a.y * b.x - a.x * b.y) / denominator);
}

fn getOrbit(index: i32) -> vec2<f32> {
  return vec2<f32>(
    mandelbrotOrbitPointSuite[index].zx,
    mandelbrotOrbitPointSuite[index].zy,
  );
}

// \u2500\u2500 output struct (7 render targets) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
struct FragOut {
  @location(0) iter:      vec4<f32>,  // .r = integer iteration count (or sentinel)
  @location(1) mu:        vec4<f32>,  // .r = smooth fractional part
  @location(2) zx:        vec4<f32>,  // .r = z.x
  @location(3) zy:        vec4<f32>,  // .r = z.y
  @location(4) dzx:       vec4<f32>,  // .r = derivative x
  @location(5) dzy:       vec4<f32>,  // .r = derivative y
  @location(6) ref_iter:       vec4<f32>,  // .r = atan2 of distance-estimation
};

fn pack(v: f32) -> vec4<f32> { return vec4<f32>(v, 0.0, 0.0, 0.0); }

fn loadLayer(coord: vec2<i32>, layer: i32) -> f32 {
  return textureLoad(rawIn, coord, layer, 0).r;
}

// \u2500\u2500 core computation \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn mandelbrot_compute(x0: f32, y0: f32, prev_iter: f32, prev_nu: f32, prev_zx: f32, prev_zy: f32, prev_dzx: f32, prev_dzy: f32, prev_ref_iter: f32) -> FragOut {
  let dc = vec2<f32>(x0, y0);
  let max_iteration = mandelbrot.maxIteration;
  let muLimit = mandelbrot.mu;
  let epsilon = mandelbrot.epsilon;

  // Resume state: if prev_iter > 0 we are continuing a previous pass.

  var i: f32 = 0.0;
  var dz = vec2<f32>(prev_zx, prev_zy);
  var der = vec2<f32>(prev_dzx, prev_dzy);
  var ref_i = i32(prev_ref_iter)  ;
  var z = getOrbit(ref_i);
  var d = vec2<f32>(1.0, 0.0);

  var escaped = false;
  var inside = false;

  while (i < max_iteration && f32(ref_i) < mandelbrot.globalMaxIter) {
    z = getOrbit(ref_i);
    dz = 2.0 * cmul(dz, z) + cmul(dz, dz) + dc;
    ref_i += 1;

    z = getOrbit(ref_i) + dz;
    d = cdiv(der, z);

    let dot_z = dot(z, z);
    if (dot_z > muLimit) {
      escaped = true;
      break;
    }
    if (dot(der, der) < epsilon) {
      inside = true;
      break;
    }
    der = cmul(der * 2.0, z);

    let dot_dz = dot(dz, dz);
    if (dot_z < dot_dz || f32(ref_i) == mandelbrot.globalMaxIter) {
      dz = z;
      ref_i = 0;
    }
    i += 1.0;
  }

  var out: FragOut;

  if (inside) {
    // Confirmed inside the set.
    out.iter      = pack(0.0);
    out.mu        = pack(0.0);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(der.x);
    out.dzy       = pack(der.y);
    out.ref_iter = pack(0.0);
    return out;
  }

  let total_iter = prev_iter + i; // running total across all passes

  if (escaped) {
    // Smooth colouring: fractional correction normalised by the bailout radius.
    // Formula: nu = log2( log(|z|\xB2) / log(mu) )
    //          smooth_frac = 1 - nu   (in [0,1] when |z|\xB2 is between mu and mu\xB2)
    let log_z2 = log(z.x * z.x + z.y * z.y);  // = log(|z|\xB2)
    let nu = log(log_z2 / log(muLimit)) / log(2.0);
    let smooth_frac = clamp(1.0 - nu, 0.0, 1.0);
    let angle_der = atan2(d.y, d.x);

    out.iter      = pack(total_iter);
    out.mu        = pack(smooth_frac);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(der.x);
    out.dzy       = pack(der.y);
    out.ref_iter = pack(angle_der);
    return out;
  }

  // Not escaped, not inside \u2014 budget exhausted for this pass.
  let globalMax = mandelbrot.globalMaxIter;

  if (total_iter >= globalMax) {
    // Reached the global iteration target without escaping.
    // Mark as "inside for now" (iter = 0).
    out.iter      = pack(0.0);
    out.mu        = pack(0.0);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(der.x);
    out.dzy       = pack(der.y);
    out.ref_iter = pack(0.0);
    return out;
  }

    // Smooth colouring: fractional correction normalised by the bailout radius.
    let log_z2 = log(z.x * z.x + z.y * z.y);
    let nu = log(log_z2 / log(muLimit)) / log(2.0);
    let smooth_frac = clamp(1.0 - nu, 0.0, 1.0);
    let angle_der = atan2(d.y, d.x);
  // Budget exhausted below globalMaxIter: store iter = total_iter, keep z/dz
  // for resumption.  |z|\xB2 < 4 distinguishes this from escaped pixels.
  out.iter      = pack(total_iter);
  out.mu        = pack(smooth_frac);
  out.zx        = pack(dz.x);
  out.zy        = pack(dz.y);
  out.dzx       = pack(der.x);
  out.dzy       = pack(der.y);
  out.ref_iter = pack(f32(ref_i));
  return out;
}

// \u2500\u2500 fragment entry \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> FragOut {
  let dims = vec2<i32>(textureDimensions(rawIn));
  let coord = vec2<i32>(
    i32(clamp(uv.x * f32(dims.x), 0.0, f32(dims.x - 1))),
    i32(clamp((1.0 - uv.y) * f32(dims.y), 0.0, f32(dims.y - 1)))
  );

  let prev_iter = loadLayer(coord, 0);
  let prev_mu = loadLayer(coord, 1);
  let prev_zx   = loadLayer(coord, 2);
  let prev_zy   = loadLayer(coord, 3);
  let prev_ref_iter = loadLayer(coord, 6);

  // Determine pixel state (iter-only convention, no mu in state logic):
  //   iter == -1                     : sentinel, needs fresh computation
  //   iter == 0                      : confirmed inside the set, pass through
  //   iter > 0  AND  |z|\xB2 >= 4      : escaped, pass through
  //   iter > 0  AND  |z|\xB2 < 4       : budget exhausted mid-progress, needs continuation
  //   iter < 0  AND  iter != -1     : resolution sentinel, pass through
  let is_compute_request = (prev_iter == -1.0);
  let needs_continuation = (prev_iter > 0.0 && (prev_zx * prev_zx + prev_zy * prev_zy) < mandelbrot.mu);

  if (!is_compute_request && !needs_continuation) {
    // Pass through all 7 layers unchanged.
    var out: FragOut;
    out.iter      = pack(prev_iter);
    out.mu        = pack(prev_mu);
    out.zx        = pack(prev_zx);
    out.zy        = pack(prev_zy);
    out.dzx       = pack(loadLayer(coord, 4));
    out.dzy       = pack(loadLayer(coord, 5));
    out.ref_iter = pack(loadLayer(coord, 6));
    return out;
  }

  // Neutral mapping: the neutral texture is a square that can contain the rotated screen.
  let xy_neutral = vec2<f32>(uv.x * 2.0 - 1.0, uv.y * 2.0 - 1.0);
  let neutralExtent = sqrt(mandelbrot.aspect * mandelbrot.aspect + 1.0);
  let local_rot = xy_neutral * neutralExtent;

  let x0 = local_rot.x * mandelbrot.scale + mandelbrot.cx;
  let y0 = local_rot.y * mandelbrot.scale + mandelbrot.cy;

  if (needs_continuation) {
    // Resume from stored state: iter > 0, |z|\xB2 < 4.
    let stored_dzx = loadLayer(coord, 4);
    let stored_dzy = loadLayer(coord, 5);
    return mandelbrot_compute(x0, y0, prev_iter, prev_mu, prev_zx, prev_zy, stored_dzx, stored_dzy, prev_ref_iter);
  }

  // Fresh computation (sentinel == -1).
  return mandelbrot_compute(x0, y0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0);
}
`,H=`struct Uniforms {
  palettePeriod: f32,
  paletteOffset: f32,
  tessellationLevel: f32,
  shadingLevel: f32,
  bloomStrength: f32,
  time: f32,
  activateTessellation: f32,
  activateShading: f32,
  activateWebcam: f32,
  activatePalette: f32,
  activateSkybox: f32,
  activateSmoothness: f32,
  activateZebra: f32,
  aspect: f32,
  angle: f32,
  animate: f32,
  mu: f32,
  pad1: f32,
  pad2: f32,
};
@group(0) @binding(0) var<uniform> parameters: Uniforms;
@group(0) @binding(1) var tex: texture_2d_array<f32>; // resolved neutral texture (7 r32float layers)
@group(0) @binding(2) var tileTex: texture_2d<f32>;
@group(0) @binding(3) var skyboxTex: texture_2d<f32>;
@group(0) @binding(4) var webcamTex: texture_2d<f32>;
@group(0) @binding(5) var paletteTex: texture_2d<f32>;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) fragCoord: vec2<f32>,
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
  out.fragCoord = (pos[VertexIndex] + vec2<f32>(1.0, 1.0)) * 0.5;
  return out;
}

fn rotate(v: vec2<f32>, angle: f32) -> vec2<f32> {
  let s = sin(angle);
  let c = cos(angle);
  return vec2<f32>(c * v.x - s * v.y, s * v.x + c * v.y);
}

// Conversion d'une direction 3D en coordonne9es UV pour une skybox equirectangulaire
fn dir_to_skybox_uv(dir: vec3<f32>, dx: f32, dy: f32) -> vec2<f32> {
  let d = normalize(dir);
  let u = abs((dx + atan2(d.z, d.x) / (2.0 * 3.14159265)) % 2.0 - 1.0) / 2.0;
  let v = abs((dy + asin(d.y) / 3.14159265) % 2.0 - 1.0) / 2.0;
  return vec2<f32>(u, v);
}

fn tile_tessellation(tex_: texture_2d<f32>, v: f32, dist: f32, repeat: f32) -> vec3<f32> {
  let tileUV = vec2<f32>(fract(v * repeat), fract(dist * repeat));
  let tileIndex = vec2<i32>(i32(floor(v * repeat)), i32(floor(dist * repeat)));

  let mirrorX = (tileIndex.x % 2) == 1;
  let mirrorY = (tileIndex.y % 2) == 1;
  let uv = vec2<f32>(
    select(tileUV.x, 1.0 - tileUV.x, mirrorX),
    select(tileUV.y, 1.0 - tileUV.y, mirrorY)
  );
  let texSize = vec2<i32>(textureDimensions(tex_, 0));
  let coord = vec2<i32>(
    i32(clamp(uv.x * f32(texSize.x), 0.0, f32(texSize.x - 1))),
    i32(clamp((1.0 - uv.y) * f32(texSize.y), 0.0, f32(texSize.y - 1)))
  );
  return textureLoad(tex_, coord, 0).rgb;
}

fn palette(v: f32, z: vec2<f32>,  d: f32, dx: f32, dy: f32) -> vec3<f32> {
  let deep = v * 2.0;

  let tessColor = tile_tessellation(tileTex, deep + dx, deep + dy, parameters.tessellationLevel);
  let webCamColor = tile_tessellation(
    webcamTex,
    deep + dx + cos(parameters.time * 0.1),
    deep + dy + sin(parameters.time * 0.15),
    parameters.tessellationLevel + sin(parameters.time * 0.05)
  );
  let paletteRepeat = max(parameters.palettePeriod, 0.0001);
  let palettePhase = fract(deep / paletteRepeat + parameters.paletteOffset );
  let paletteColor = tile_tessellation(paletteTex, palettePhase, 1.0, 1.0);

  var color = vec3<f32>(0.0, 0.0, 0.0);

  if (parameters.activatePalette == 1.0) {
    color = mix(color, paletteColor, 1.0 - color);
  }

  if (parameters.activateTessellation == 1.0) {
    color = mix(color, tessColor, 1.0 - color);
  }

  if (parameters.activateWebcam == 1.0) {
    color = mix(color, webCamColor, 1.0 - color);
  }

  if (parameters.activatePalette == 0.0
      && parameters.activateTessellation == 0.0
      && parameters.activateWebcam == 0.0
  ) {
    if (parameters.activateSkybox == 0.0) {
      color = vec3<f32>(0.5, 0.5, 0.5);
    } else {
      color = vec3<f32>(1.0, 1.0, 1.0);
    }
  }

  if (parameters.activateShading == 1.0) {
    let normal = normalize(vec3<f32>(cos(d), sin(d), 0.5));
    let lightDir = normalize(vec3<f32>(0.2, 0.3, 0.5));
    let viewDir = vec3<f32>(0.7, 0.8, 0.5);
    let diff = max(dot(normal, lightDir), 0.0);
    let ambient = 2.0;
    let reflectDir = reflect(-lightDir, normal);
    let specular = pow(max(dot(viewDir, reflectDir), 0.0), 1.0);
    var phong = ambient + 2.0 * diff + 1.0 * specular;

    if (parameters.activateSkybox == 1.0) {
      let skyboxDir = normalize(vec3<f32>(cos(d), sin(d), 1.0));
      let skyboxUV = dir_to_skybox_uv(skyboxDir, dx, dy);
      let skyboxSize = vec2<i32>(textureDimensions(skyboxTex, 0));
      let skyboxCoord = vec2<i32>(
        i32(clamp(skyboxUV.x * f32(skyboxSize.x), 0.0, f32(skyboxSize.x - 1))),
        i32(clamp((1.0 - skyboxUV.y) * f32(skyboxSize.y), 0.0, f32(skyboxSize.y - 1)))
      );

      let skyboxColor = textureLoad(skyboxTex, skyboxCoord, 0).rgb;
      let lum = 0.2126 * skyboxColor.r + 0.7152 * skyboxColor.g + 0.0722 * skyboxColor.b;
      phong = phong * lum * 1.0;
      color = color / phong * 1.0;
    } else {
      color = color / phong * 2.0;
    }
  }

  return clamp(color, vec3<f32>(0.0), vec3<f32>(1.0));
}

@fragment
fn fs_main(@location(0) fragCoord: vec2<f32>) -> @location(0) vec4<f32> {
  // Screen uv in [0,1]
  let uv_screen = fragCoord;

  // Map from screen uv into the neutral texture uv.
  //
  // The neutral texture is a square large enough to contain the rotated screen.
  // We work in "local" coordinates where the screen rectangle is
  //   local.x in [-aspect, +aspect]
  //   local.y in [-1, +1]
  // Then we scale by the half-diagonal length so that any rotation stays in [-1, 1].
  let xy_screen = vec2<f32>(uv_screen.x * 2.0 - 1.0, uv_screen.y * 2.0 - 1.0);
  let local = vec2<f32>(xy_screen.x * parameters.aspect, xy_screen.y);
  let neutralExtent = sqrt(parameters.aspect * parameters.aspect + 1.0);
  let local_rot = rotate(local, parameters.angle);
  let xy_neutral = local_rot / neutralExtent;
  let uv_neutral = xy_neutral * 0.5 + vec2<f32>(0.5, 0.5);

  let texSize = vec2<i32>(textureDimensions(tex));
  let sampleCoord = vec2<i32>(
    i32(clamp(uv_neutral.x * f32(texSize.x), 0.0, f32(texSize.x - 1))),
    i32(clamp((1.0 - uv_neutral.y) * f32(texSize.y), 0.0, f32(texSize.y - 1)))
  );

  // Read individual layers from the texture array.
  let iter_val  = textureLoad(tex, sampleCoord, 0, 0).r; // layer 0: integer iter count / sentinel
  let mu_val    = textureLoad(tex, sampleCoord, 1, 0).r; // layer 1: smooth fractional part
  let zx_val    = textureLoad(tex, sampleCoord, 2, 0).r; // layer 2: z.x
  let zy_val    = textureLoad(tex, sampleCoord, 3, 0).r; // layer 3: z.y
  let angle_der = textureLoad(tex, sampleCoord, 6, 0).r; // layer 6: angle_der

  // Combine integer + fractional parts for smooth iteration value.
  var nu = iter_val + mu_val;

  // Sentinel: iter_val < 0 => uncomputed pixel.
  if (iter_val < 0.0) {
    let t = clamp((-iter_val) / 64.0, 0.0, 1.0);
    return vec4<f32>(0.15 + 0.35 * t, 0.0, 0.0, 1.0);
  }

  // Budget exhausted: iter > 0 but z hasn't escaped (|z|\xB2 < mu).
  // Render as green (debug) until continuation completes.
  if (iter_val > 0.0 && (zx_val * zx_val + zy_val * zy_val) < parameters.mu) {
    return vec4<f32>(0.0, 0.5, 0.0, 1.0);
  }

  // Inside the set: iter_val == 0 and mu >= 0.
  if (iter_val == 0.0) {
    return vec4<f32>(0.0, 0.0, 0.0, 1.0);
  }

  if (parameters.activateZebra == 1.0 && floor(nu) % 2.0 == 0.0) {
    nu = 0.0;
  }

  // Edge case: nu <= 0 after combination (shouldn't happen for escaped points).
  if (nu < 0.0) {
    return vec4<f32>(0.0, 0.0, 0.5, 1.0);
  }

  if (parameters.activateSmoothness == 0.0) {
    nu = iter_val;
  }

  let v = nu / 256.0;
  var color = palette(v, vec2<f32>(zx_val, zy_val), angle_der, uv_neutral.x, uv_neutral.y);

  return vec4<f32>(color, 1.0);
}

`,ue=`// Brush pass: updates sentinel levels in the neutral square texture.
//
// Uses a texture_2d_array<f32> with 7 r32float layers.
//
// Layer layout:
//   0 : sentinel / iteration count (integer part)
//   1 : mu \u2013 fractional smooth part (cosmetic only, used for coloring).
//       mu > 0  => pixel escaped; smooth coloring = iter + mu.
//       State logic uses iter + |z|\xB2 instead of mu.
//   2 : z.x
//   3 : z.y
//   4 : dz.x (derivative real)
//   5 : dz.y (derivative imag)
//   6 : angle_der
//
// Sentinels are stored in layer 0 as negative integers:
//   -1  : needs Mandelbrot computation (or continuation)
//   -2  : needs resolve with step=2
//   -4  : needs resolve with step=4
//   ...
//
// Pixel state convention (iter-only, no mu in state logic):
//   iter == -1                     : sentinel, needs computation
//   iter == 0                      : confirmed inside the set (or exhausted at globalMaxIter)
//   iter > 0  AND  |z|\xB2 >= 4      : escaped \u2192 color with iter + mu
//   iter > 0  AND  |z|\xB2 < 4       : budget exhausted mid-progress \u2192 needs continuation
//   The mandelbrot pass handles continuations directly; the brush does NOT
//   convert budget-exhausted pixels to sentinels.

struct BrushUniforms {
  aspect: f32,
  angle: f32,
  clearHistory: f32,
  seedStep: f32,
  baseSentinel: f32,
  shiftTexX: f32,
  shiftTexY: f32,
  mu: f32,
};

@group(0) @binding(0) var<uniform> uni: BrushUniforms;
@group(0) @binding(1) var prevRaw: texture_2d_array<f32>;

struct VSOut {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  var pos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( 1.0,  1.0)
  );
  var o: VSOut;
  o.position = vec4<f32>(pos[vid], 0.0, 1.0);
  o.uv = (pos[vid] + vec2<f32>(1.0)) * 0.5;
  return o;
}

fn rotate(v: vec2<f32>, angle: f32) -> vec2<f32> {
  let s = sin(angle);
  let c = cos(angle);
  return vec2<f32>(c * v.x - s * v.y, s * v.x + c * v.y);
}

fn is_inside_rotated_screen(xy_neutral: vec2<f32>) -> bool {
  let neutralExtent = sqrt(uni.aspect * uni.aspect + 1.0);
  let local_rot = xy_neutral * neutralExtent;
  let local = rotate(local_rot, -uni.angle);
  let inside_x = abs(local.x) <= uni.aspect;
  let inside_y = abs(local.y) <= 1.0;
  return inside_x && inside_y;
}

// \u2500\u2500 output struct (7 render targets) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
struct FragOut {
  @location(0) iter:      vec4<f32>,
  @location(1) mu:        vec4<f32>,
  @location(2) zx:        vec4<f32>,
  @location(3) zy:        vec4<f32>,
  @location(4) dzx:       vec4<f32>,
  @location(5) dzy:       vec4<f32>,
  @location(6) angle_der: vec4<f32>,
};

fn pack(v: f32) -> vec4<f32> { return vec4<f32>(v, 0.0, 0.0, 0.0); }

fn loadLayer(coord: vec2<i32>, layer: i32) -> f32 {
  return textureLoad(prevRaw, coord, layer, 0).r;
}

fn loadAllLayers(coord: vec2<i32>) -> FragOut {
  var o: FragOut;
  o.iter      = pack(loadLayer(coord, 0));
  o.mu        = pack(loadLayer(coord, 1));
  o.zx        = pack(loadLayer(coord, 2));
  o.zy        = pack(loadLayer(coord, 3));
  o.dzx       = pack(loadLayer(coord, 4));
  o.dzy       = pack(loadLayer(coord, 5));
  o.angle_der = pack(loadLayer(coord, 6));
  return o;
}

fn makeCleared(sentinel: f32) -> FragOut {
  var o: FragOut;
  o.iter      = pack(sentinel);
  o.mu        = pack(0.0);
  o.zx        = pack(0.0);
  o.zy        = pack(0.0);
  o.dzx       = pack(0.0);
  o.dzy       = pack(0.0);
  o.angle_der = pack(0.0);
  return o;
}

fn refine_sentinel(s: f32, coord_out: vec2<i32>) -> f32 {
  let si = i32(round(s));
  if (si >= 0) {
    return s;
  }
  if (si == -1) {
    return -1.0;
  }

  let step = -si;
  if (step <= 1) {
    return -1.0;
  }

  let next_step = max(1, step / 2);
  let is_anchor = (coord_out.x % next_step == 0) && (coord_out.y % next_step == 0);
  return select(-f32(next_step), -1.0, is_anchor);
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> FragOut {
  let dims = vec2<i32>(textureDimensions(prevRaw));
  let coord_out = vec2<i32>(
    i32(clamp(uv.x * f32(dims.x), 0.0, f32(dims.x - 1))),
    i32(clamp((1.0 - uv.y) * f32(dims.y), 0.0, f32(dims.y - 1)))
  );

  // Full reset when needed.
  if (uni.clearHistory >= 0.5) {
    let step = i32(max(1.0, uni.seedStep));
    let is_anchor = (coord_out.x % step == 0) && (coord_out.y % step == 0);
    let sentinel = select(-uni.baseSentinel, -1.0, is_anchor);
    return makeCleared(sentinel);
  }

  // Translation reprojection.
  let shift = vec2<i32>(i32(round(uni.shiftTexX)), i32(round(uni.shiftTexY)));
  let coord_in = coord_out - shift;

  var prev: FragOut;
  if (coord_in.x < 0 || coord_in.y < 0 || coord_in.x >= dims.x || coord_in.y >= dims.y) {
    prev = makeCleared(-uni.baseSentinel);
  } else {
    prev = loadAllLayers(coord_in);
  }

  // Outside ROI: keep as-is.
  let xy_neutral = vec2<f32>(uv.x * 2.0 - 1.0, uv.y * 2.0 - 1.0);
  if (!is_inside_rotated_screen(xy_neutral)) {
    return prev;
  }

  let iter_val = prev.iter.r;

  // Sentinel refinement.
  if (iter_val < 0.0) {
    let refined = refine_sentinel(iter_val, coord_out);
    var out = prev;
    out.iter = pack(refined);
    return out;
  }

  // Already computed and escaped (iter > 0, mu > 0) or inside (iter == 0, mu >= 0).
  return prev;
}
`,Ot=`// Resolve pass: replaces remaining sentinels with a snapped parent pixel.
//
// Uses a texture_2d_array<f32> with 7 r32float layers.
//
// Layer layout:
//   0 : sentinel / iteration count (integer part)
//   1 : mu (smooth fractional part for escaped pixels; cosmetic only)
//   2 : z.x
//   3 : z.y
//   4 : dz.x (derivative real)
//   5 : dz.y (derivative imag)
//   6 : angle_der
//
// Sentinel convention:
//   If layer0 == -step (step is power-of-two > 1), resolve by testing
//   all 4 corner anchors of the grid cell and using the first finished
//   one.  This ensures correct resolve regardless of pan direction.

struct ResolveUniforms {
  mu: f32,
};

@group(0) @binding(0) var<uniform> uni: ResolveUniforms;
@group(0) @binding(1) var rawTex: texture_2d_array<f32>;

struct VSOut {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  var pos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( 1.0,  1.0)
  );
  var o: VSOut;
  o.position = vec4<f32>(pos[vid], 0.0, 1.0);
  o.uv = (pos[vid] + vec2<f32>(1.0)) * 0.5;
  return o;
}

// \u2500\u2500 output struct (7 render targets) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
struct FragOut {
  @location(0) iter:      vec4<f32>,
  @location(1) mu:        vec4<f32>,
  @location(2) zx:        vec4<f32>,
  @location(3) zy:        vec4<f32>,
  @location(4) dzx:       vec4<f32>,
  @location(5) dzy:       vec4<f32>,
  @location(6) angle_der: vec4<f32>,
};

fn pack(v: f32) -> vec4<f32> { return vec4<f32>(v, 0.0, 0.0, 0.0); }

fn loadLayer(coord: vec2<i32>, layer: i32) -> f32 {
  return textureLoad(rawTex, coord, layer, 0).r;
}

fn loadAllLayers(coord: vec2<i32>) -> FragOut {
  var o: FragOut;
  o.iter      = pack(loadLayer(coord, 0));
  o.mu        = pack(loadLayer(coord, 1));
  o.zx        = pack(loadLayer(coord, 2));
  o.zy        = pack(loadLayer(coord, 3));
  o.dzx       = pack(loadLayer(coord, 4));
  o.dzy       = pack(loadLayer(coord, 5));
  o.angle_der = pack(loadLayer(coord, 6));
  return o;
}

fn floor_power_of_two(step: u32) -> u32 {
  // Returns the greatest power-of-two <= step.
  if (step == 0u) {
    return 1u;
  }
  let msb_index = 31u - countLeadingZeros(step);
  return 1u << msb_index;
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> FragOut {
  let dims = vec2<u32>(textureDimensions(rawTex));
  let x = u32(clamp(uv.x * f32(dims.x), 0.0, f32(dims.x - 1u)));
  let y = u32(clamp((1.0 - uv.y) * f32(dims.y), 0.0, f32(dims.y - 1u)));
  let coord = vec2<i32>(i32(x), i32(y));

  let iter_val = loadLayer(coord, 0);

  // Finished pixel: escaped (iter > 0, |z|\xB2 >= mu) or inside (iter == 0).
  // Pass through unchanged.
  if (iter_val == 0.0) {
    return loadAllLayers(coord);
  }
  if (iter_val > 0.0) {
    let zx = loadLayer(coord, 2);
    let zy = loadLayer(coord, 3);
    let z_sq = zx * zx + zy * zy;
    if (z_sq >= uni.mu) {
      // Escaped \u2014 finished, pass through.
      return loadAllLayers(coord);
    }
    // Budget-exhausted anchor (iter > 0, |z|\xB2 < mu):
    // climb to a coarser finished ancestor starting at step 2.
  }

  // At this point the pixel is either:
  //   (a) a sentinel (iter < 0, step > 1) \u2014 snap to parent anchor, or
  //   (b) a budget-exhausted anchor \u2014 climb to a coarser finished ancestor.

  // -1 should not remain after Mandelbrot pass, but if it does: keep as-is.
  var step_u: u32;
  if (iter_val < 0.0) {
    let step_f = -iter_val;
    if (step_f <= 1.0) {
      return loadAllLayers(coord);
    }
    step_u = floor_power_of_two(u32(step_f));
  } else {
    // Budget-exhausted anchor: start climbing from the next coarser grid level.
    step_u = 2u;
  }

  // Snap to parent anchor, climbing to coarser steps if the anchor is
  // budget-exhausted (iter > 0 AND |z|\xB2 < mu).  This eliminates the
  // Sierpinski-triangle artifact that appeared when the resolve pass
  // blindly copied unfinished pixels.

  loop {
    // Safety: if step exceeds texture size, stop climbing and fall back
    // to the pixel itself (prevents infinite loop on pathological inputs
    // or when all ancestors are unfinished sentinels).
    if (step_u >= dims.x || step_u >= dims.y) {
      return loadAllLayers(coord);
    }

    let mask = ~(step_u - 1u);
    let base_x = x & mask;
    let base_y = y & mask;

    // Test 4 candidate anchors (all corners of the grid cell) so that
    // resolve works regardless of the navigation direction.
    var candidates = array<vec2<u32>, 4>(
      vec2<u32>(base_x,          base_y),
      vec2<u32>(base_x + step_u, base_y),
      vec2<u32>(base_x,          base_y + step_u),
      vec2<u32>(base_x + step_u, base_y + step_u)
    );

    for (var i = 0u; i < 4u; i = i + 1u) {
      let cx = candidates[i].x;
      let cy = candidates[i].y;

      // Bounds check: skip candidates that fall outside the texture.
      if (cx >= dims.x || cy >= dims.y) {
        continue;
      }

      let ccoord = vec2<i32>(i32(cx), i32(cy));
      let citer = loadLayer(ccoord, 0);

      // Sentinel \u2014 this candidate is not computed yet.
      if (citer < 0.0) {
        continue;
      }

      // Inside set (iter == 0): use it.
      if (citer == 0.0) {
        return loadAllLayers(ccoord);
      }

      // iter > 0: check whether pixel actually escaped or is budget-exhausted.
      let zx = loadLayer(ccoord, 2);
      let zy = loadLayer(ccoord, 3);
      let z_sq = zx * zx + zy * zy;

      if (z_sq >= uni.mu) {
        // Escaped \u2014 use this pixel.
        return loadAllLayers(ccoord);
      }

      // Budget-exhausted: skip this candidate, try the others.
    }

    // None of the 4 candidates had a finished pixel \u2014 climb to the next
    // coarser grid level.
    step_u = step_u * 2u;
  }

  // Unreachable, but WGSL requires a return after the loop.
  return loadAllLayers(coord);
}
`,Ft=async(e={},t)=>{let r;if(t.startsWith("data:")){const a=t.replace(/^data:.*?base64,/,"");let o;if(typeof Buffer=="function"&&typeof Buffer.from=="function")o=Buffer.from(a,"base64");else if(typeof atob=="function"){const i=atob(a);o=new Uint8Array(i.length);for(let n=0;n<i.length;n++)o[n]=i.charCodeAt(n)}else throw new Error("Cannot decode base64-encoded data URL");r=await WebAssembly.instantiate(o,e)}else{const a=await fetch(t),o=a.headers.get("Content-Type")||"";if("instantiateStreaming"in WebAssembly&&o.startsWith("application/wasm"))r=await WebAssembly.instantiateStreaming(a,e);else{const i=await a.arrayBuffer();r=await WebAssembly.instantiate(i,e)}}return r.instance.exports};let p;function Dt(e){p=e}function Ce(e,t){try{return e.apply(this,t)}catch(r){let a=(function(){try{return r instanceof Error?`${r.message}

Stack:
${r.stack}`:r.toString()}catch{return"<failed to stringify thrown value>"}})();throw console.error("wasm-bindgen: imported JS function that was not marked as `catch` threw an error:",a),r}}let we=null;function ze(){return(we===null||we.byteLength===0)&&(we=new Uint8Array(p.memory.buffer)),we}let ke=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0});ke.decode();const Vt=2146435072;let Ue=0;function It(e,t){return Ue+=t,Ue>=Vt&&(ke=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0}),ke.decode(),Ue=t),ke.decode(ze().subarray(e,e+t))}function Ke(e,t){return e=e>>>0,It(e,t)}function M(e){if(typeof e!="number")throw new Error(`expected a number argument, found ${typeof e}`)}let ce=null;function qt(){return(ce===null||ce.buffer.detached===!0||ce.buffer.detached===void 0&&ce.buffer!==p.memory.buffer)&&(ce=new DataView(p.memory.buffer)),ce}function Je(e,t){e=e>>>0;const r=qt(),a=[];for(let o=e;o<e+4*t;o+=4)a.push(p.__wbindgen_export_0.get(r.getUint32(o,!0)));return p.__externref_drop_slice(e,t),a}let j=0;const ve=new TextEncoder;"encodeInto"in ve||(ve.encodeInto=function(e,t){const r=ve.encode(e);return t.set(r),{read:e.length,written:r.length}});function de(e,t,r){if(typeof e!="string")throw new Error(`expected a string argument, found ${typeof e}`);if(r===void 0){const l=ve.encode(e),h=t(l.length,1)>>>0;return ze().subarray(h,h+l.length).set(l),j=l.length,h}let a=e.length,o=t(a,1)>>>0;const i=ze();let n=0;for(;n<a;n++){const l=e.charCodeAt(n);if(l>127)break;i[o+n]=l}if(n!==a){n!==0&&(e=e.slice(n)),o=r(o,a,a=n+e.length*3,1)>>>0;const l=ze().subarray(o+n,o+a),h=ve.encodeInto(e,l);if(h.read!==e.length)throw new Error("failed to pass whole string");n+=h.written,o=r(o,a,n,1)>>>0}return j=n,o}const Qe=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(e=>p.__wbg_mandelbrotnavigator_free(e>>>0,1));class Ge{__destroy_into_raw(){const t=this.__wbg_ptr;return this.__wbg_ptr=0,Qe.unregister(this),t}free(){const t=this.__destroy_into_raw();p.__wbg_mandelbrotnavigator_free(t,0)}get_params(){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");M(this.__wbg_ptr);const t=p.mandelbrotnavigator_get_params(this.__wbg_ptr);var r=Je(t[0],t[1]).slice();return p.__wbindgen_free(t[0],t[1]*4,4),r}rotate_direct(t){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");M(this.__wbg_ptr),p.mandelbrotnavigator_rotate_direct(this.__wbg_ptr,t)}translate_direct(t,r){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");M(this.__wbg_ptr),p.mandelbrotnavigator_translate_direct(this.__wbg_ptr,t,r)}get_reference_orbit_len(){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");return M(this.__wbg_ptr),p.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr)>>>0}compute_reference_orbit_ptr(t){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");M(this.__wbg_ptr),M(t);const r=p.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr,t);return fe.__wrap(r)}get_reference_orbit_capacity(){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");return M(this.__wbg_ptr),p.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr)>>>0}compute_reference_orbit_chunk(t,r){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");M(this.__wbg_ptr),M(t),M(r);const a=p.mandelbrotnavigator_compute_reference_orbit_chunk(this.__wbg_ptr,t,r);return fe.__wrap(a)}constructor(t,r,a,o){const i=de(t,p.__wbindgen_malloc,p.__wbindgen_realloc),n=j,l=de(r,p.__wbindgen_malloc,p.__wbindgen_realloc),h=j,v=de(a,p.__wbindgen_malloc,p.__wbindgen_realloc),z=j,d=p.mandelbrotnavigator_new(i,n,l,h,v,z,o);return this.__wbg_ptr=d>>>0,Qe.register(this,this.__wbg_ptr,this),this}step(){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");M(this.__wbg_ptr);const t=p.mandelbrotnavigator_step(this.__wbg_ptr);var r=Je(t[0],t[1]).slice();return p.__wbindgen_free(t[0],t[1]*4,4),r}zoom(t){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");M(this.__wbg_ptr),p.mandelbrotnavigator_zoom(this.__wbg_ptr,t)}angle(t){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");M(this.__wbg_ptr),p.mandelbrotnavigator_angle(this.__wbg_ptr,t)}scale(t){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");M(this.__wbg_ptr);const r=de(t,p.__wbindgen_malloc,p.__wbindgen_realloc),a=j;p.mandelbrotnavigator_scale(this.__wbg_ptr,r,a)}origin(t,r){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");M(this.__wbg_ptr);const a=de(t,p.__wbindgen_malloc,p.__wbindgen_realloc),o=j,i=de(r,p.__wbindgen_malloc,p.__wbindgen_realloc),n=j;p.mandelbrotnavigator_origin(this.__wbg_ptr,a,o,i,n)}rotate(t){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");M(this.__wbg_ptr),p.mandelbrotnavigator_rotate(this.__wbg_ptr,t)}translate(t,r){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");M(this.__wbg_ptr),p.mandelbrotnavigator_translate(this.__wbg_ptr,t,r)}}Symbol.dispose&&(Ge.prototype[Symbol.dispose]=Ge.prototype.free),typeof FinalizationRegistry>"u"||new FinalizationRegistry(e=>p.__wbg_mandelbrotstep_free(e>>>0,1));const et=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(e=>p.__wbg_orbitbufferinfo_free(e>>>0,1));class fe{constructor(){throw new Error("cannot invoke `new` directly")}static __wrap(t){t=t>>>0;const r=Object.create(fe.prototype);return r.__wbg_ptr=t,et.register(r,r.__wbg_ptr,r),r}__destroy_into_raw(){const t=this.__wbg_ptr;return this.__wbg_ptr=0,et.unregister(this),t}free(){const t=this.__destroy_into_raw();p.__wbg_orbitbufferinfo_free(t,0)}get ptr(){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");return M(this.__wbg_ptr),p.__wbg_get_orbitbufferinfo_ptr(this.__wbg_ptr)>>>0}set ptr(t){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");M(this.__wbg_ptr),M(t),p.__wbg_set_orbitbufferinfo_ptr(this.__wbg_ptr,t)}get offset(){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");return M(this.__wbg_ptr),p.__wbg_get_orbitbufferinfo_offset(this.__wbg_ptr)>>>0}set offset(t){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");M(this.__wbg_ptr),M(t),p.__wbg_set_orbitbufferinfo_offset(this.__wbg_ptr,t)}get count(){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");return M(this.__wbg_ptr),p.__wbg_get_orbitbufferinfo_count(this.__wbg_ptr)>>>0}set count(t){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");M(this.__wbg_ptr),M(t),p.__wbg_set_orbitbufferinfo_count(this.__wbg_ptr,t)}}Symbol.dispose&&(fe.prototype[Symbol.dispose]=fe.prototype.free);function $t(){return Ce(function(e){return Math.exp(e)},arguments)}function Wt(){return Ce(function(){return Date.now()},arguments)}function Ht(e,t){throw new Error(Ke(e,t))}function Yt(){return Ce(function(e,t){return Ke(e,t)},arguments)}function Zt(){const e=p.__wbindgen_export_0,t=e.grow(4);e.set(0,void 0),e.set(t+0,void 0),e.set(t+1,null),e.set(t+2,!0),e.set(t+3,!1)}URL=globalThis.URL;const b=await Ft({"./mandelbrot_bg.js":{__wbg_now_1e80617bcee43265:Wt,__wbg_exp_9293ded1248e1bd3:$t,__wbg_wbindgenthrow_451ec1a8469d7eb6:Ht,__wbindgen_init_externref_table:Zt,__wbindgen_cast_2241b6af4c4b2941:Yt}},oa),tt=b.memory,Xt=b.__wbg_get_mandelbrotstep_dx,jt=b.__wbg_get_mandelbrotstep_dy,Kt=b.__wbg_get_mandelbrotstep_zx,Jt=b.__wbg_get_mandelbrotstep_zy,Qt=b.__wbg_get_orbitbufferinfo_count,er=b.__wbg_get_orbitbufferinfo_offset,tr=b.__wbg_get_orbitbufferinfo_ptr,rr=b.__wbg_mandelbrotnavigator_free,ar=b.__wbg_mandelbrotstep_free,ir=b.__wbg_orbitbufferinfo_free,or=b.__wbg_set_mandelbrotstep_dx,nr=b.__wbg_set_mandelbrotstep_dy,sr=b.__wbg_set_mandelbrotstep_zx,lr=b.__wbg_set_mandelbrotstep_zy,ur=b.__wbg_set_orbitbufferinfo_count,cr=b.__wbg_set_orbitbufferinfo_offset,dr=b.__wbg_set_orbitbufferinfo_ptr,fr=b.mandelbrotnavigator_angle,hr=b.mandelbrotnavigator_compute_reference_orbit_chunk,pr=b.mandelbrotnavigator_compute_reference_orbit_ptr,vr=b.mandelbrotnavigator_get_params,_r=b.mandelbrotnavigator_get_reference_orbit_capacity,br=b.mandelbrotnavigator_get_reference_orbit_len,gr=b.mandelbrotnavigator_new,mr=b.mandelbrotnavigator_origin,xr=b.mandelbrotnavigator_rotate,yr=b.mandelbrotnavigator_rotate_direct,wr=b.mandelbrotnavigator_scale,zr=b.mandelbrotnavigator_step,kr=b.mandelbrotnavigator_translate,Tr=b.mandelbrotnavigator_translate_direct,Mr=b.mandelbrotnavigator_zoom,Lr=b.__wbindgen_export_0,Sr=b.__externref_drop_slice,Br=b.__wbindgen_free,Er=b.__wbindgen_malloc,Rr=b.__wbindgen_realloc,rt=b.__wbindgen_start,Ar=Object.freeze(Object.defineProperty({__proto__:null,__externref_drop_slice:Sr,__wbg_get_mandelbrotstep_dx:Xt,__wbg_get_mandelbrotstep_dy:jt,__wbg_get_mandelbrotstep_zx:Kt,__wbg_get_mandelbrotstep_zy:Jt,__wbg_get_orbitbufferinfo_count:Qt,__wbg_get_orbitbufferinfo_offset:er,__wbg_get_orbitbufferinfo_ptr:tr,__wbg_mandelbrotnavigator_free:rr,__wbg_mandelbrotstep_free:ar,__wbg_orbitbufferinfo_free:ir,__wbg_set_mandelbrotstep_dx:or,__wbg_set_mandelbrotstep_dy:nr,__wbg_set_mandelbrotstep_zx:sr,__wbg_set_mandelbrotstep_zy:lr,__wbg_set_orbitbufferinfo_count:ur,__wbg_set_orbitbufferinfo_offset:cr,__wbg_set_orbitbufferinfo_ptr:dr,__wbindgen_export_0:Lr,__wbindgen_free:Br,__wbindgen_malloc:Er,__wbindgen_realloc:Rr,__wbindgen_start:rt,mandelbrotnavigator_angle:fr,mandelbrotnavigator_compute_reference_orbit_chunk:hr,mandelbrotnavigator_compute_reference_orbit_ptr:pr,mandelbrotnavigator_get_params:vr,mandelbrotnavigator_get_reference_orbit_capacity:_r,mandelbrotnavigator_get_reference_orbit_len:br,mandelbrotnavigator_new:gr,mandelbrotnavigator_origin:mr,mandelbrotnavigator_rotate:xr,mandelbrotnavigator_rotate_direct:yr,mandelbrotnavigator_scale:wr,mandelbrotnavigator_step:zr,mandelbrotnavigator_translate:kr,mandelbrotnavigator_translate_direct:Tr,mandelbrotnavigator_zoom:Mr,memory:tt},Symbol.toStringTag,{value:"Module"}));Dt(Ar),rt();class Pr{constructor(t=1024,r=1024){u(this,"video");u(this,"stream",null);u(this,"width");u(this,"height");u(this,"lastDrawTime",0);this.width=t,this.height=r,this.video=document.createElement("video"),this.video.autoplay=!0,this.video.width=t,this.video.height=r}async openWebcam(){this.stream||(this.stream=await navigator.mediaDevices.getUserMedia({video:{width:this.width,height:this.height}}),this.video.srcObject=this.stream,await this.video.play())}async drawWebGPUTexture(t,r){const a=performance.now();if(a-this.lastDrawTime>15){if(this.video.readyState<HTMLMediaElement.HAVE_CURRENT_DATA)return;r.queue.copyExternalImageToTexture({source:this.video},{texture:t},[this.width,this.height]),this.lastDrawTime=a}}closeWebcam(){this.stream&&(this.stream.getTracks().forEach(t=>t.stop()),this.stream=null)}}function _e(e,t,r){e.prototype=t.prototype=r,r.constructor=e}function Te(e,t){var r=Object.create(e.prototype);for(var a in t)r[a]=t[a];return r}function Q(){}var be=.7,Me=1/be,he="\\s*([+-]?\\d+)\\s*",ge="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*",V="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*",Cr=/^#([0-9a-f]{3,8})$/,Ur=new RegExp(`^rgb\\(${he},${he},${he}\\)$`),Gr=new RegExp(`^rgb\\(${V},${V},${V}\\)$`),Nr=new RegExp(`^rgba\\(${he},${he},${he},${ge}\\)$`),Or=new RegExp(`^rgba\\(${V},${V},${V},${ge}\\)$`),Fr=new RegExp(`^hsl\\(${ge},${V},${V}\\)$`),Dr=new RegExp(`^hsla\\(${ge},${V},${V},${ge}\\)$`),at={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074};_e(Q,xe,{copy(e){return Object.assign(new this.constructor,this,e)},displayable(){return this.rgb().displayable()},hex:it,formatHex:it,formatHex8:Vr,formatHsl:Ir,formatRgb:ot,toString:ot});function it(){return this.rgb().formatHex()}function Vr(){return this.rgb().formatHex8()}function Ir(){return dt(this).formatHsl()}function ot(){return this.rgb().formatRgb()}xe=function(e){var t,r;return e=(e+"").trim().toLowerCase(),(t=Cr.exec(e))?(r=t[1].length,t=parseInt(t[1],16),r===6?nt(t):r===3?new A(t>>8&15|t>>4&240,t>>4&15|t&240,(t&15)<<4|t&15,1):r===8?Le(t>>24&255,t>>16&255,t>>8&255,(t&255)/255):r===4?Le(t>>12&15|t>>8&240,t>>8&15|t>>4&240,t>>4&15|t&240,((t&15)<<4|t&15)/255):null):(t=Ur.exec(e))?new A(t[1],t[2],t[3],1):(t=Gr.exec(e))?new A(t[1]*255/100,t[2]*255/100,t[3]*255/100,1):(t=Nr.exec(e))?Le(t[1],t[2],t[3],t[4]):(t=Or.exec(e))?Le(t[1]*255/100,t[2]*255/100,t[3]*255/100,t[4]):(t=Fr.exec(e))?ct(t[1],t[2]/100,t[3]/100,1):(t=Dr.exec(e))?ct(t[1],t[2]/100,t[3]/100,t[4]):at.hasOwnProperty(e)?nt(at[e]):e==="transparent"?new A(NaN,NaN,NaN,0):null};function nt(e){return new A(e>>16&255,e>>8&255,e&255,1)}function Le(e,t,r,a){return a<=0&&(e=t=r=NaN),new A(e,t,r,a)}function st(e){return e instanceof Q||(e=xe(e)),e?(e=e.rgb(),new A(e.r,e.g,e.b,e.opacity)):new A}ye=function(e,t,r,a){return arguments.length===1?st(e):new A(e,t,r,a??1)};function A(e,t,r,a){this.r=+e,this.g=+t,this.b=+r,this.opacity=+a}_e(A,ye,Te(Q,{brighter(e){return e=e==null?Me:Math.pow(Me,e),new A(this.r*e,this.g*e,this.b*e,this.opacity)},darker(e){return e=e==null?be:Math.pow(be,e),new A(this.r*e,this.g*e,this.b*e,this.opacity)},rgb(){return this},clamp(){return new A(ee(this.r),ee(this.g),ee(this.b),Se(this.opacity))},displayable(){return-.5<=this.r&&this.r<255.5&&-.5<=this.g&&this.g<255.5&&-.5<=this.b&&this.b<255.5&&0<=this.opacity&&this.opacity<=1},hex:lt,formatHex:lt,formatHex8:qr,formatRgb:ut,toString:ut}));function lt(){return`#${te(this.r)}${te(this.g)}${te(this.b)}`}function qr(){return`#${te(this.r)}${te(this.g)}${te(this.b)}${te((isNaN(this.opacity)?1:this.opacity)*255)}`}function ut(){const e=Se(this.opacity);return`${e===1?"rgb(":"rgba("}${ee(this.r)}, ${ee(this.g)}, ${ee(this.b)}${e===1?")":`, ${e})`}`}function Se(e){return isNaN(e)?1:Math.max(0,Math.min(1,e))}function ee(e){return Math.max(0,Math.min(255,Math.round(e)||0))}function te(e){return e=ee(e),(e<16?"0":"")+e.toString(16)}function ct(e,t,r,a){return a<=0?e=t=r=NaN:r<=0||r>=1?e=t=NaN:t<=0&&(e=NaN),new D(e,t,r,a)}function dt(e){if(e instanceof D)return new D(e.h,e.s,e.l,e.opacity);if(e instanceof Q||(e=xe(e)),!e)return new D;if(e instanceof D)return e;e=e.rgb();var t=e.r/255,r=e.g/255,a=e.b/255,o=Math.min(t,r,a),i=Math.max(t,r,a),n=NaN,l=i-o,h=(i+o)/2;return l?(t===i?n=(r-a)/l+(r<a)*6:r===i?n=(a-t)/l+2:n=(t-r)/l+4,l/=h<.5?i+o:2-i-o,n*=60):l=h>0&&h<1?0:n,new D(n,l,h,e.opacity)}function $r(e,t,r,a){return arguments.length===1?dt(e):new D(e,t,r,a??1)}function D(e,t,r,a){this.h=+e,this.s=+t,this.l=+r,this.opacity=+a}_e(D,$r,Te(Q,{brighter(e){return e=e==null?Me:Math.pow(Me,e),new D(this.h,this.s,this.l*e,this.opacity)},darker(e){return e=e==null?be:Math.pow(be,e),new D(this.h,this.s,this.l*e,this.opacity)},rgb(){var e=this.h%360+(this.h<0)*360,t=isNaN(e)||isNaN(this.s)?0:this.s,r=this.l,a=r+(r<.5?r:1-r)*t,o=2*r-a;return new A(Ne(e>=240?e-240:e+120,o,a),Ne(e,o,a),Ne(e<120?e+240:e-120,o,a),this.opacity)},clamp(){return new D(ft(this.h),Be(this.s),Be(this.l),Se(this.opacity))},displayable(){return(0<=this.s&&this.s<=1||isNaN(this.s))&&0<=this.l&&this.l<=1&&0<=this.opacity&&this.opacity<=1},formatHsl(){const e=Se(this.opacity);return`${e===1?"hsl(":"hsla("}${ft(this.h)}, ${Be(this.s)*100}%, ${Be(this.l)*100}%${e===1?")":`, ${e})`}`}}));function ft(e){return e=(e||0)%360,e<0?e+360:e}function Be(e){return Math.max(0,Math.min(1,e||0))}function Ne(e,t,r){return(e<60?t+(r-t)*e/60:e<180?r:e<240?t+(r-t)*(240-e)/60:t)*255}const Wr=Math.PI/180,Hr=180/Math.PI,Ee=18,ht=.96422,pt=1,vt=.82521,_t=4/29,pe=6/29,bt=3*pe*pe,Yr=pe*pe*pe;function gt(e){if(e instanceof I)return new I(e.l,e.a,e.b,e.opacity);if(e instanceof Y)return mt(e);e instanceof A||(e=st(e));var t=Ie(e.r),r=Ie(e.g),a=Ie(e.b),o=Fe((.2225045*t+.7168786*r+.0606169*a)/pt),i,n;return t===r&&r===a?i=n=o:(i=Fe((.4360747*t+.3850649*r+.1430804*a)/ht),n=Fe((.0139322*t+.0971045*r+.7141733*a)/vt)),new I(116*o-16,500*(i-o),200*(o-n),e.opacity)}function Oe(e,t,r,a){return arguments.length===1?gt(e):new I(e,t,r,a??1)}function I(e,t,r,a){this.l=+e,this.a=+t,this.b=+r,this.opacity=+a}_e(I,Oe,Te(Q,{brighter(e){return new I(this.l+Ee*(e??1),this.a,this.b,this.opacity)},darker(e){return new I(this.l-Ee*(e??1),this.a,this.b,this.opacity)},rgb(){var e=(this.l+16)/116,t=isNaN(this.a)?e:e+this.a/500,r=isNaN(this.b)?e:e-this.b/200;return t=ht*De(t),e=pt*De(e),r=vt*De(r),new A(Ve(3.1338561*t-1.6168667*e-.4906146*r),Ve(-.9787684*t+1.9161415*e+.033454*r),Ve(.0719453*t-.2289914*e+1.4052427*r),this.opacity)}}));function Fe(e){return e>Yr?Math.pow(e,1/3):e/bt+_t}function De(e){return e>pe?e*e*e:bt*(e-_t)}function Ve(e){return 255*(e<=.0031308?12.92*e:1.055*Math.pow(e,1/2.4)-.055)}function Ie(e){return(e/=255)<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4)}function Zr(e){if(e instanceof Y)return new Y(e.h,e.c,e.l,e.opacity);if(e instanceof I||(e=gt(e)),e.a===0&&e.b===0)return new Y(NaN,0<e.l&&e.l<100?0:NaN,e.l,e.opacity);var t=Math.atan2(e.b,e.a)*Hr;return new Y(t<0?t+360:t,Math.sqrt(e.a*e.a+e.b*e.b),e.l,e.opacity)}function Xr(e,t,r,a){return arguments.length===1?Zr(e):new Y(e,t,r,a??1)}function Y(e,t,r,a){this.h=+e,this.c=+t,this.l=+r,this.opacity=+a}function mt(e){if(isNaN(e.h))return new I(e.l,0,0,e.opacity);var t=e.h*Wr;return new I(e.l,Math.cos(t)*e.c,Math.sin(t)*e.c,e.opacity)}_e(Y,Xr,Te(Q,{brighter(e){return new Y(this.h,this.c,this.l+Ee*(e??1),this.opacity)},darker(e){return new Y(this.h,this.c,this.l-Ee*(e??1),this.opacity)},rgb(){return mt(this).rgb()}}));const xt=e=>()=>e;function jr(e,t){return function(r){return e+r*t}}function Kr(e,t,r){return e=Math.pow(e,r),t=Math.pow(t,r)-e,r=1/r,function(a){return Math.pow(e+a*t,r)}}Nt=function(e){return(e=+e)==1?le:function(t,r){return r-t?Kr(t,r,e):xt(isNaN(t)?r:t)}},le=function(e,t){var r=t-e;return r?jr(e,r):xt(isNaN(e)?t:e)};function Jr(e,t){var r=le((e=Oe(e)).l,(t=Oe(t)).l),a=le(e.a,t.a),o=le(e.b,t.b),i=le(e.opacity,t.opacity);return function(n){return e.l=r(n),e.a=a(n),e.b=o(n),e.opacity=i(n),e+""}}class yt{constructor(t){u(this,"points");this.points=t.slice().sort((r,a)=>r.position-a.position)}getColorAt(t){if(this.points.length===0)return"#000";if(t<=this.points[0].position)return this.points[0].color;if(t>=this.points[this.points.length-1].position)return this.points[this.points.length-1].color;for(let r=0;r<this.points.length-1;++r){const a=this.points[r],o=this.points[r+1];if(t>=a.position&&t<=o.position){const i=(t-a.position)/(o.position-a.position),n=Jr(a.color,o.color);return ye(n(i)).formatHex()}}return"#000"}generateTexture(){const t=new ImageData(4096,1);for(let r=0;r<4096;++r){const a=r/4095,o=ye(this.getColorAt(a)),i=r*4;t.data[i]=o.r,t.data[i+1]=o.g,t.data[i+2]=o.b,t.data[i+3]=255}return t}}const Qr=64;function ea(e){const t=Math.max(1,Math.floor(e));return 2**Math.floor(Math.log2(t))}const S=class S{constructor(t,r){u(this,"snapshotCallback");u(this,"snapshotDestWidth");u(this,"canvas");u(this,"device");u(this,"queue");u(this,"adapter");u(this,"ctx");u(this,"format");u(this,"mandelbrotNavigator");u(this,"rawTexture");u(this,"rawArrayView");u(this,"rawLayerViews",[]);u(this,"rawBrushTexture");u(this,"rawBrushArrayView");u(this,"rawBrushLayerViews",[]);u(this,"resolvedTexture");u(this,"resolvedArrayView");u(this,"resolvedLayerViews",[]);u(this,"uniformBufferMandelbrot");u(this,"uniformBufferColor");u(this,"uniformBufferBrush");u(this,"uniformBufferResolve");u(this,"mandelbrotReferenceBuffer");u(this,"pipelineBrush");u(this,"bindGroupBrush");u(this,"pipelineMandelbrot");u(this,"bindGroupMandelbrot");u(this,"pipelineResolve");u(this,"bindGroupResolve");u(this,"pipelineColor");u(this,"bindGroupColor");u(this,"neutralSize",0);u(this,"shaderPassCompute");u(this,"shaderPassColor");u(this,"width",0);u(this,"height",0);u(this,"antialiasLevel");u(this,"palettePeriod");u(this,"previousMandelbrot");u(this,"previousRenderOptions");u(this,"needRender",!0);u(this,"extraFrames",0);u(this,"mandelbrotReference",new Float32Array(1e6));u(this,"prevFrameMandelbrot");u(this,"clearHistoryNextFrame",!1);u(this,"iterationBatchSize",100);u(this,"tileTexture");u(this,"tileTextureView");u(this,"skyboxTexture");u(this,"skyboxTextureView");u(this,"paletteTexture");u(this,"paletteTextureView");u(this,"webcamTexture");u(this,"webcamTileTexture");u(this,"webcamTextureView");u(this,"webcamEnabled",!0);u(this,"time",0);u(this,"lastUpdateTime",0);u(this,"dprMultiplier",1);this.canvas=t,this.shaderPassCompute=J,this.shaderPassColor=H,this.antialiasLevel=r.antialiasLevel,this.palettePeriod=r.palettePeriod,this.time=0}async initialize(t){if(this.mandelbrotNavigator=t,!navigator.gpu)throw new Error("WebGPU non support\xE9");if(this.adapter=await navigator.gpu.requestAdapter(),!this.adapter)throw new Error("Adapter WebGPU introuvable");this.device=await this.adapter.requestDevice(),this.device.label="Engine Device",this.queue=this.device.queue,this.queue.label="Engine Queue",this.ctx=this.canvas.getContext("webgpu"),this.format=navigator.gpu.getPreferredCanvasFormat(),this.ctx.configure({device:this.device,format:this.format,alphaMode:"opaque"}),S._tileTexture||(S._tileTexture=await this._loadTexture(St)),this.tileTexture=await this._loadTexture(St),this.tileTextureView=this.tileTexture.createView(),S._skyboxTexture||(S._skyboxTexture=await this._loadTexture(Bt)),this.skyboxTexture=await this._loadTexture(Bt),this.skyboxTextureView=this.skyboxTexture.createView();const r=new yt([]).generateTexture();this.paletteTexture=this.device.createTexture({size:[r.width,r.height,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine PaletteTexture"}),this.device.queue.writeTexture({texture:this.paletteTexture},r.data,{bytesPerRow:r.width*4},[r.width,r.height]),this.paletteTextureView=this.paletteTexture.createView(),this.webcamTexture=new Pr(1920,1080),this.webcamTileTexture=this.device.createTexture({size:[1920,1080,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT}),this.webcamTextureView=this.webcamTileTexture.createView(),this.uniformBufferMandelbrot=this.device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Mandelbrot"}),this.uniformBufferColor=this.device.createBuffer({size:80,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Color"}),this.uniformBufferBrush=this.device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Brush"}),this.uniformBufferResolve=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Resolve"}),this.mandelbrotReferenceBuffer=this.device.createBuffer({size:4*1e6,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot Orbit ReferenceStorage Buffer"}),await this._createPipelines(),this.resize()}async _createPipelines(){const t=this.device.createShaderModule({code:ue,label:"Engine ShaderModule Brush"}),r=this.device.createShaderModule({code:this.shaderPassCompute,label:"Engine ShaderModule Compute"}),a=this.device.createShaderModule({code:Ot,label:"Engine ShaderModule Resolve"}),o=this.device.createShaderModule({code:this.shaderPassColor,label:"Engine ShaderModule Color"}),i=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Brush"}),n=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Mandelbrot"}),l=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Resolve"}),h=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:3,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:4,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:5,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}}],label:"Engine BindGroupLayout Color"}),v=Array.from({length:S.LAYER_COUNT},()=>({format:"r32float"}));this.pipelineBrush=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[i]}),vertex:{module:t,entryPoint:"vs_main"},fragment:{module:t,entryPoint:"fs_main",targets:v},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Brush"}),this.pipelineMandelbrot=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[n]}),vertex:{module:r,entryPoint:"vs_main"},fragment:{module:r,entryPoint:"fs_main",targets:v},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Mandelbrot"}),this.pipelineResolve=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[l]}),vertex:{module:a,entryPoint:"vs_main"},fragment:{module:a,entryPoint:"fs_main",targets:v},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Resolve"}),this.pipelineColor=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[h]}),vertex:{module:o,entryPoint:"vs_main"},fragment:{module:o,entryPoint:"fs_main",targets:[{format:this.format}]},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Color"}),this.bindGroupBrush=void 0,this.bindGroupMandelbrot=void 0,this.bindGroupResolve=void 0,this.bindGroupColor=void 0}resize(){var w,m,s,c,T,x,g,L,B,P;const t=(window.devicePixelRatio||1)*this.dprMultiplier,r=this.canvas.clientWidth||1,a=this.canvas.clientHeight||1;this.width=Math.max(1,Math.round(r*t)),this.height=Math.max(1,Math.round(a*t));const o=((m=(w=this.device)==null?void 0:w.limits)==null?void 0:m.maxTextureDimension2D)??8192;this.width=Math.min(this.width,o),this.height=Math.min(this.height,o),this.canvas.width=this.width,this.canvas.height=this.height,this.canvas.style.width=r+"px",this.canvas.style.height=a+"px",this.ctx.configure({device:this.device,format:this.format,alphaMode:"opaque"});const i=((c=(s=this.device)==null?void 0:s.limits)==null?void 0:c.maxTextureDimension2D)??8192;this.neutralSize=Math.min(Math.ceil(Math.sqrt(this.width*this.width+this.height*this.height)),i);const n=this.neutralSize;(x=(T=this.rawTexture)==null?void 0:T.destroy)==null||x.call(T),(L=(g=this.rawBrushTexture)==null?void 0:g.destroy)==null||L.call(g),(P=(B=this.resolvedTexture)==null?void 0:B.destroy)==null||P.call(B);const l=S.LAYER_COUNT,h=E=>{const q=this.device.createTexture({size:{width:n,height:n,depthOrArrayLayers:l},format:"r32float",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING,label:E}),Z=q.createView({dimension:"2d-array",baseArrayLayer:0,arrayLayerCount:l,label:E+" ArrayView"}),re=[];for(let O=0;O<l;O++)re.push(q.createView({dimension:"2d",baseArrayLayer:O,arrayLayerCount:1,label:E+` Layer${O}`}));return{texture:q,arrayView:Z,layerViews:re}},v=h("Engine RawTexture (A)");this.rawTexture=v.texture,this.rawArrayView=v.arrayView,this.rawLayerViews=v.layerViews;const z=h("Engine RawBrushTexture (B)");this.rawBrushTexture=z.texture,this.rawBrushArrayView=z.arrayView,this.rawBrushLayerViews=z.layerViews;const d=h("Engine ResolvedTexture");if(this.resolvedTexture=d.texture,this.resolvedArrayView=d.arrayView,this.resolvedLayerViews=d.layerViews,this.pipelineBrush){const E=this.pipelineBrush.getBindGroupLayout(0);this.bindGroupBrush=this.device.createBindGroup({layout:E,entries:[{binding:0,resource:{buffer:this.uniformBufferBrush}},{binding:1,resource:this.rawArrayView}],label:"Engine BindGroup Brush"})}if(this.pipelineMandelbrot){const E=this.pipelineMandelbrot.getBindGroupLayout(0);this.bindGroupMandelbrot=this.device.createBindGroup({layout:E,entries:[{binding:0,resource:{buffer:this.uniformBufferMandelbrot}},{binding:1,resource:{buffer:this.mandelbrotReferenceBuffer}},{binding:2,resource:this.rawBrushArrayView}],label:"Engine BindGroup Mandelbrot"})}if(this.pipelineResolve){const E=this.pipelineResolve.getBindGroupLayout(0);this.bindGroupResolve=this.device.createBindGroup({layout:E,entries:[{binding:0,resource:{buffer:this.uniformBufferResolve}},{binding:1,resource:this.rawArrayView}],label:"Engine BindGroup Resolve"})}if(this.pipelineColor){const E=this.pipelineColor.getBindGroupLayout(0),q=[{binding:0,resource:{buffer:this.uniformBufferColor}},{binding:1,resource:this.resolvedArrayView},{binding:2,resource:this.tileTextureView},{binding:3,resource:this.skyboxTextureView},{binding:4,resource:this.webcamTextureView},{binding:5,resource:this.paletteTextureView}];this.bindGroupColor=this.device.createBindGroup({layout:E,entries:q,label:"Engine BindGroup Color"})}this.prevFrameMandelbrot=void 0,this.needRender=!0}areObjectsEqual(t,r){return t===void 0||r===void 0?!1:JSON.stringify(t)===JSON.stringify(r)}areColorStopsEqual(t,r){if(t.length!==r.length)return!1;for(const[a,o]of t.entries()){const i=r[a];if(!i||o.color!==i.color||o.position!==i.position)return!1}return!0}async update(t,r){var c,T,x;const a=performance.now();this.lastUpdateTime===0&&(this.lastUpdateTime=a);const o=(a-this.lastUpdateTime)/1e3;this.time+=o,this.lastUpdateTime=a,this.needRender=!(this.areObjectsEqual(t,this.previousMandelbrot)&&this.areObjectsEqual(r,this.previousRenderOptions)),this.needRender&&(this.extraFrames=1e3),r.activateWebcam?(await this.updateWebcamTexture(),this.needRender=!0):(c=this.webcamTexture)==null||c.closeWebcam(),r.activateTessellation&&(this.needRender=!0),r.activateAnimate&&(this.needRender=!0);const i=this.width/Math.max(1,this.height);let n=((T=this.previousMandelbrot)==null?void 0:T.scale)||1/t.scale;if(n<1&&(n=1/n),n=Math.sqrt(n)-1,!this.areColorStopsEqual(r.colorStops,((x=this.previousRenderOptions)==null?void 0:x.colorStops)||[])){const g=new yt(r.colorStops).generateTexture();this.device.queue.writeTexture({texture:this.paletteTexture},g.data,{bytesPerRow:g.width*4},[g.width,g.height]),this.needRender=!0}const l=new Float32Array([r.palettePeriod,r.paletteOffset,r.tessellationLevel,r.shadingLevel,n,this.time,r.activateTessellation?1:0,r.activateShading?1:0,r.activateWebcam?1:0,r.activatePalette?1:0,r.activateSkybox?1:0,r.activateSmoothness?1:0,r.activateZebra?1:0,i,t.angle,r.activateAnimate?1:0,t.mu,0]);if(this.device.queue.writeBuffer(this.uniformBufferColor,0,l.buffer),!this.needRender&&this.extraFrames<=0)return;const h=Math.ceil(t.maxIterations),v=this.mandelbrotNavigator.compute_reference_orbit_chunk(S.ORBIT_CHUNK_SIZE,h),z=v.count,d=new Float32Array(tt.buffer,v.ptr,v.count*4);v.offset<h&&this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer,0,d,0);const w=Math.min(h,z),m=new Float32Array([t.dx,t.dy,t.mu,t.scale,i,t.angle,this.iterationBatchSize,t.epsilon,r.antialiasLevel,0,w,0]);this.device.queue.writeBuffer(this.uniformBufferMandelbrot,0,m.buffer),z<h&&(this.extraFrames=Math.max(this.extraFrames,1));const s=v.offset===0&&!!this.prevFrameMandelbrot;this.clearHistoryNextFrame=!1,(!this.prevFrameMandelbrot||s)&&(this.clearHistoryNextFrame=!0),this.prevFrameMandelbrot&&this.prevFrameMandelbrot.mu!==t.mu&&(this.clearHistoryNextFrame=!0),this.prevFrameMandelbrot&&this.prevFrameMandelbrot.scale!==t.scale&&(this.clearHistoryNextFrame=!0),this.previousMandelbrot=structuredClone(t),this.previousRenderOptions=structuredClone(r)}async render(){if(!this.needRender&&this.extraFrames<=0||(!this.needRender&&this.extraFrames>0&&this.extraFrames--,!this.pipelineBrush||!this.pipelineMandelbrot||!this.pipelineResolve||!this.pipelineColor)||!this.bindGroupBrush||!this.bindGroupMandelbrot||!this.bindGroupResolve||!this.bindGroupColor||!this.previousMandelbrot)return;const t=this.width/Math.max(1,this.height),r=ea(Qr),a=r,o=this.clearHistoryNextFrame?1:0;let i=0,n=0;if(!this.clearHistoryNextFrame&&this.prevFrameMandelbrot){const x=this.previousMandelbrot.dx-this.prevFrameMandelbrot.dx,g=this.previousMandelbrot.dy-this.prevFrameMandelbrot.dy,L=this.neutralSize,B=Math.sqrt(t*t+1);i=-(x*L)/(2*this.previousMandelbrot.scale*B),n=g*L/(2*this.previousMandelbrot.scale*B)}const l=new Float32Array([t,this.previousMandelbrot.angle,o,r,a,i,n,this.previousMandelbrot.mu]);this.device.queue.writeBuffer(this.uniformBufferBrush,0,l.buffer);const h=new Float32Array([this.previousMandelbrot.mu]);this.device.queue.writeBuffer(this.uniformBufferResolve,0,h.buffer);const v=this.device.createCommandEncoder(),z=x=>x.map(g=>({view:g,clearValue:{r:0,g:0,b:0,a:0},loadOp:"clear",storeOp:"store"})),d=v.beginRenderPass({colorAttachments:z(this.rawBrushLayerViews)});d.setPipeline(this.pipelineBrush),d.setBindGroup(0,this.bindGroupBrush),d.draw(6,1,0,0),d.end();const w=v.beginRenderPass({colorAttachments:z(this.rawLayerViews)});w.setPipeline(this.pipelineMandelbrot),w.setBindGroup(0,this.bindGroupMandelbrot),w.draw(6,1,0,0),w.end();const m=v.beginRenderPass({colorAttachments:z(this.resolvedLayerViews)});m.setPipeline(this.pipelineResolve),m.setBindGroup(0,this.bindGroupResolve),m.draw(6,1,0,0),m.end();const s=this.ctx.getCurrentTexture().createView(),c=v.beginRenderPass({colorAttachments:[{view:s,clearValue:{r:1,g:1,b:1,a:1},loadOp:"clear",storeOp:"store"}]});c.setPipeline(this.pipelineColor),c.setBindGroup(0,this.bindGroupColor),c.draw(6,1,0,0),c.end();const T=performance.now();if(this.device.queue.submit([v.finish()]),this.device.queue.onSubmittedWorkDone().then(()=>{const x=performance.now()-T;if(x>0){const g=S.TARGET_FRAME_MS/x,L=this.iterationBatchSize*g;this.iterationBatchSize=Math.round(Math.min(S.MAX_BATCH_SIZE,Math.max(S.MIN_BATCH_SIZE,this.iterationBatchSize*.7+L*.3)))}}),this.prevFrameMandelbrot={...this.previousMandelbrot},this.snapshotCallback){try{const x=this.snapshotDestWidth??256,g=Math.round(x*9/16),L=this.device.createTexture({size:[x,g,1],format:this.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});{const C=this.device.createCommandEncoder(),F=C.beginRenderPass({colorAttachments:[{view:L.createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}]});F.setPipeline(this.pipelineColor),F.setBindGroup(0,this.bindGroupColor),F.draw(6,1,0,0),F.end(),this.device.queue.submit([C.finish()])}const B=C=>C+255&-256,P=x*4,E=B(P),q=E*g,Z=this.device.createBuffer({size:q,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});{const C=this.device.createCommandEncoder();C.copyTextureToBuffer({texture:L},{buffer:Z,offset:0,bytesPerRow:E},{width:x,height:g,depthOrArrayLayers:1}),this.device.queue.submit([C.finish()])}await this.device.queue.onSubmittedWorkDone(),await Z.mapAsync(GPUMapMode.READ);const re=Z.getMappedRange(),O=new Uint8ClampedArray(x*g*4),ae=new Uint8Array(re);for(let C=0;C<g;++C)for(let F=0;F<x;++F){const oe=C*E+F*4,f=(C*x+F)*4;O[f+0]=ae[oe+2],O[f+1]=ae[oe+1],O[f+2]=ae[oe+0],O[f+3]=ae[oe+3]}const ie=document.createElement("canvas");ie.width=x,ie.height=g,ie.getContext("2d").putImageData(new ImageData(O,x,g),0,0),Z.unmap(),this.snapshotCallback(ie.toDataURL("image/png"))}catch{this.snapshotCallback("")}this.snapshotCallback=void 0,this.snapshotDestWidth=void 0}}destroy(){var t,r,a,o,i,n,l,h,v,z,d,w,m,s,c,T,x,g,L,B,P;(r=(t=this.rawTexture)==null?void 0:t.destroy)==null||r.call(t),(o=(a=this.rawBrushTexture)==null?void 0:a.destroy)==null||o.call(a),(n=(i=this.resolvedTexture)==null?void 0:i.destroy)==null||n.call(i),(h=(l=this.mandelbrotReferenceBuffer)==null?void 0:l.destroy)==null||h.call(l),(z=(v=this.uniformBufferMandelbrot)==null?void 0:v.destroy)==null||z.call(v),(w=(d=this.uniformBufferColor)==null?void 0:d.destroy)==null||w.call(d),(s=(m=this.uniformBufferBrush)==null?void 0:m.destroy)==null||s.call(m),(T=(c=this.uniformBufferResolve)==null?void 0:c.destroy)==null||T.call(c),(x=this.webcamTexture)==null||x.closeWebcam(),(L=(g=this.webcamTileTexture)==null?void 0:g.destroy)==null||L.call(g),(P=(B=this.paletteTexture)==null?void 0:B.destroy)==null||P.call(B)}async _loadTexture(t){const r=new Image;r.src=t;try{await r.decode()}catch(i){throw console.warn("\xC9chec du chargement de la texture : "+t,i),i}const a=await createImageBitmap(r),o=this.device.createTexture({size:[a.width,a.height,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine LoadedTexture "+t});return this.device.queue.copyExternalImageToTexture({source:a},{texture:o},[a.width,a.height]),o}async updateWebcamTexture(){var t,r;await((t=this.webcamTexture)==null?void 0:t.openWebcam()),await((r=this.webcamTexture)==null?void 0:r.drawWebGPUTexture(this.webcamTileTexture,this.device))}async getSnapshotPng(t=256){return await new Promise(r=>{this.snapshotCallback=r,this.snapshotDestWidth=t,this.needRender=!0})}};u(S,"LAYER_COUNT",7),u(S,"MIN_BATCH_SIZE",10),u(S,"MAX_BATCH_SIZE",1e4),u(S,"TARGET_FRAME_MS",16),u(S,"ORBIT_CHUNK_SIZE",1e3),u(S,"_tileTexture"),u(S,"_tileTextureView"),u(S,"_skyboxTexture"),u(S,"_skyboxTextureView"),u(S,"_paletteTexture"),u(S,"_paletteTextureView");let qe=S,wt,zt,kt,Tt,Mt,me,$e,Lt;je=Ze({__name:"Mandelbrot",props:Pt({mu:{default:1e6},epsilon:{default:1e-5},colorStops:{default:()=>[{color:"#0f0130",position:0},{color:"#206bcb",position:.16},{color:"#ffceb6",position:.26},{color:"#edffff",position:.42},{color:"#ffaa00",position:.6425},{color:"#300200",position:.8575},{color:"#100000",position:1}]},palettePeriod:{default:1},paletteOffset:{default:0},antialiasLevel:{default:1},tessellationLevel:{default:2},shadingLevel:{default:1},activatePalette:{type:Boolean,default:!0},activateSkybox:{type:Boolean,default:!1},activateTessellation:{type:Boolean,default:!1},activateWebcam:{type:Boolean,default:!1},activateShading:{type:Boolean,default:!0},activateZebra:{type:Boolean,default:!1},activateSmoothness:{type:Boolean,default:!0},activateAnimate:{type:Boolean,default:!1},dprMultiplier:{default:1},maxIterationMultiplier:{default:1}},{cx:{default:"-1.5"},cxModifiers:{},cy:{default:"0.0"},cyModifiers:{},scale:{default:"2.5"},scaleModifiers:{},angle:{default:0},angleModifiers:{}}),emits:["update:cx","update:cy","update:scale","update:angle"],setup(e,{expose:t}){const r=Pe(null);let a=null,o=null,i,n=!1;const l=K(e,"cx"),h=K(e,"cy"),v=K(e,"scale"),z=K(e,"angle");Et(()=>[l.value,h.value,v.value,z.value],([c,T,x,g],[L,B,P,E])=>{n||i&&(!c||!T||!x||((c!==L||T!==B)&&i.origin(c,T),x!==P&&i.scale(x),g!==E&&i.angle(Number(g))))},{flush:"sync"});const d=e;Et(()=>d.dprMultiplier,c=>{o&&(o.dprMultiplier=c,s())});async function w(){if(!o||!i)return;const c=i.step();if(!c)return;const[T,x]=c,[g,L,B,P]=i.get_params();n=!0,l.value=g,h.value=L,v.value=B,z.value=parseFloat(P),await Ct(),n=!1;const E=Math.min(Math.max(100,1e3*d.maxIterationMultiplier*Math.log2(1/parseFloat(B))),1e5);return await o.update({cx:g,cy:L,dx:parseFloat(T),dy:parseFloat(x),mu:d.mu,scale:parseFloat(B),angle:parseFloat(P),maxIterations:E,epsilon:d.epsilon},{shadingLevel:d.shadingLevel,tessellationLevel:d.tessellationLevel,antialiasLevel:d.antialiasLevel,palettePeriod:d.palettePeriod,paletteOffset:d.paletteOffset,colorStops:na(d.colorStops),activateShading:d.activateShading,activateTessellation:d.activateTessellation,activateWebcam:d.activateWebcam,activatePalette:d.activatePalette,activateSkybox:d.activateSkybox,activateSmoothness:d.activateSmoothness,activateZebra:d.activateZebra,activateAnimate:d.activateAnimate}),o.render()}async function m(){if(r.value)return a=r.value,i=new Ge(l.value,h.value,v.value,Number(z.value)),i.origin(l.value,h.value),i.scale(v.value),i.angle(Number(z.value)),o=new qe(a,{activatePalette:d.activatePalette,activateSkybox:d.activateSkybox,shadingLevel:d.shadingLevel,tessellationLevel:d.tessellationLevel,antialiasLevel:d.antialiasLevel,palettePeriod:d.palettePeriod,paletteOffset:d.paletteOffset,colorStops:d.colorStops,activateShading:d.activateShading,activateTessellation:d.activateTessellation,activateWebcam:d.activateWebcam,activateSmoothness:d.activateSmoothness,activateZebra:d.activateZebra,activateAnimate:d.activateAnimate}),o.initialize(i)}async function s(){if(!r.value||!o)return;const c=r.value.getBoundingClientRect();r.value.width=c.width,r.value.height=c.height,o.resize(),await w()}return Rt(async()=>(await m(),window.addEventListener("resize",s),s())),At(()=>{window.removeEventListener("resize",s)}),t({getCanvas:()=>r.value,getEngine:()=>o,getNavigator:()=>i,translate:(c,T)=>i==null?void 0:i.translate(c,T),translateDirect:(c,T)=>i==null?void 0:i.translate_direct(c,T),rotate:c=>i==null?void 0:i.rotate(c),angle:c=>i==null?void 0:i.angle(c),zoom:c=>i==null?void 0:i.zoom(c),step:()=>i==null?void 0:i.step(),getParams:()=>i==null?void 0:i.get_params(),drawOnce:async()=>w(),resize:async()=>s(),initialize:async()=>m()}),(c,T)=>(Re(),Ae("canvas",{ref_key:"canvasRef",ref:r},null,512))}}),wt={class:"mobile-nav-controls"},zt={key:0,class:"directional-controls"},kt=Ze({__name:"MobileNavigationControls",props:{mandelbrotRef:{}},setup(e){const t=e,r=Pe(!1),a=Pe(null);let o=null;const i=()=>{r.value=!r.value,r.value||l()},n=m=>{m.preventDefault(),m.stopPropagation(),i()},l=()=>{a.value=null,o!==null&&(clearInterval(o),o=null)},h=m=>{a.value=m;const s=.1,c=()=>{if(t.mandelbrotRef)switch(m){case"north":t.mandelbrotRef.translate(0,s);break;case"south":t.mandelbrotRef.translate(0,-s);break;case"west":t.mandelbrotRef.translate(-s,0);break;case"east":t.mandelbrotRef.translate(s,0);break}};c(),o=window.setInterval(c,16)},v=m=>{a.value=`rotate-${m}`;const s=.025,c=()=>{t.mandelbrotRef&&(m==="left"?t.mandelbrotRef.rotate(s):t.mandelbrotRef.rotate(-s))};c(),o=window.setInterval(c,16)},z=m=>{a.value=`zoom-${m}`;const s=.6,c=()=>{t.mandelbrotRef&&(m==="in"?t.mandelbrotRef.zoom(s):t.mandelbrotRef.zoom(1/s))};c(),o=window.setInterval(c,16)},d=(m,s)=>{m.preventDefault(),s()},w=m=>{m.preventDefault(),l()};return(m,s)=>(Re(),Ae("div",wt,[y("button",{class:X(["nav-button compass-button",{active:r.value}]),onClick:i,onTouchend:n,"aria-label":"Toggle navigation"},[...s[16]||(s[16]=[sa('<svg width="32" height="32" viewBox="0 0 24 24" fill="none" class="nav-icon" data-v-dc637499><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" data-v-dc637499></circle><path d="M12 2 L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-dc637499></path><path d="M12 18 L12 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-dc637499></path><path d="M2 12 L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-dc637499></path><path d="M18 12 L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-dc637499></path><path d="M12 7 L10 12 L12 14 L14 12 Z" fill="currentColor" data-v-dc637499></path><text x="12" y="6" text-anchor="middle" font-size="6" fill="currentColor" font-weight="bold" data-v-dc637499>N</text></svg>',1)])],34),Xe(la,{name:"fade"},{default:ua(()=>[r.value?(Re(),Ae("div",zt,[y("button",{class:X(["nav-button direction-button north",{active:a.value==="north"}]),onTouchstart:s[0]||(s[0]=c=>d(c,()=>h("north"))),onTouchend:w,onMousedown:s[1]||(s[1]=c=>h("north")),onMouseup:l,onMouseleave:l,"aria-label":"Move North"},[...s[17]||(s[17]=[y("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[y("path",{d:"M12 5 L18 11 L15 11 L15 19 L9 19 L9 11 L6 11 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),y("button",{class:X(["nav-button direction-button south",{active:a.value==="south"}]),onTouchstart:s[2]||(s[2]=c=>d(c,()=>h("south"))),onTouchend:w,onMousedown:s[3]||(s[3]=c=>h("south")),onMouseup:l,onMouseleave:l,"aria-label":"Move South"},[...s[18]||(s[18]=[y("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[y("path",{d:"M12 19 L6 13 L9 13 L9 5 L15 5 L15 13 L18 13 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),y("button",{class:X(["nav-button direction-button west",{active:a.value==="west"}]),onTouchstart:s[4]||(s[4]=c=>d(c,()=>h("west"))),onTouchend:w,onMousedown:s[5]||(s[5]=c=>h("west")),onMouseup:l,onMouseleave:l,"aria-label":"Move West"},[...s[19]||(s[19]=[y("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[y("path",{d:"M5 12 L11 18 L11 15 L19 15 L19 9 L11 9 L11 6 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),y("button",{class:X(["nav-button direction-button east",{active:a.value==="east"}]),onTouchstart:s[6]||(s[6]=c=>d(c,()=>h("east"))),onTouchend:w,onMousedown:s[7]||(s[7]=c=>h("east")),onMouseup:l,onMouseleave:l,"aria-label":"Move East"},[...s[20]||(s[20]=[y("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[y("path",{d:"M19 12 L13 6 L13 9 L5 9 L5 15 L13 15 L13 18 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),y("button",{class:X(["nav-button corner-button rotate-left",{active:a.value==="rotate-left"}]),onTouchstart:s[8]||(s[8]=c=>d(c,()=>v("left"))),onTouchend:w,onMousedown:s[9]||(s[9]=c=>v("left")),onMouseup:l,onMouseleave:l,"aria-label":"Rotate Left"},[...s[21]||(s[21]=[y("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[y("path",{d:"M16 8 A6 6 0 1 0 8 16",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round"}),y("path",{d:"M5 16 L8 16 L8 13",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round","stroke-linejoin":"round"})],-1)])],34),y("button",{class:X(["nav-button corner-button rotate-right",{active:a.value==="rotate-right"}]),onTouchstart:s[10]||(s[10]=c=>d(c,()=>v("right"))),onTouchend:w,onMousedown:s[11]||(s[11]=c=>v("right")),onMouseup:l,onMouseleave:l,"aria-label":"Rotate Right"},[...s[22]||(s[22]=[y("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[y("path",{d:"M8 8 A6 6 0 1 1 16 16",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round"}),y("path",{d:"M19 16 L16 16 L16 13",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round","stroke-linejoin":"round"})],-1)])],34),y("button",{class:X(["nav-button corner-button zoom-out",{active:a.value==="zoom-out"}]),onTouchstart:s[12]||(s[12]=c=>d(c,()=>z("out"))),onTouchend:w,onMousedown:s[13]||(s[13]=c=>z("out")),onMouseup:l,onMouseleave:l,"aria-label":"Zoom Out"},[...s[23]||(s[23]=[y("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[y("circle",{cx:"11",cy:"11",r:"7",stroke:"currentColor","stroke-width":"2"}),y("path",{d:"M18 18 L22 22",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"}),y("path",{d:"M8 11 L14 11",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"})],-1)])],34),y("button",{class:X(["nav-button corner-button zoom-in",{active:a.value==="zoom-in"}]),onTouchstart:s[14]||(s[14]=c=>d(c,()=>z("in"))),onTouchend:w,onMousedown:s[15]||(s[15]=c=>z("in")),onMouseup:l,onMouseleave:l,"aria-label":"Zoom In"},[...s[24]||(s[24]=[y("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[y("circle",{cx:"11",cy:"11",r:"7",stroke:"currentColor","stroke-width":"2"}),y("path",{d:"M18 18 L22 22",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"}),y("path",{d:"M11 8 L11 14",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"}),y("path",{d:"M8 11 L14 11",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"})],-1)])],34)])):ca("",!0)]),_:1})]))}}),Tt=Ut(kt,[["__scopeId","data-v-dc637499"]]),Mt={style:{position:"relative",width:"100%",height:"100%"}},me=.04,$e=.025,Lt=Ze({__name:"MandelbrotController",props:Pt({mu:{},epsilon:{},colorStops:{},antialiasLevel:{},tessellationLevel:{},shadingLevel:{},palettePeriod:{},paletteOffset:{},activatePalette:{type:Boolean},activateSkybox:{type:Boolean},activateTessellation:{type:Boolean},activateWebcam:{type:Boolean},activateShading:{type:Boolean},activateZebra:{type:Boolean},activateSmoothness:{type:Boolean},activateAnimate:{type:Boolean},dprMultiplier:{},maxIterationMultiplier:{}},{cx:{},cxModifiers:{},cy:{},cyModifiers:{},scale:{},scaleModifiers:{},angle:{},angleModifiers:{}}),emits:["update:cx","update:cy","update:scale","update:angle"],setup(e,{expose:t}){const r=K(e,"cx"),a=K(e,"cy"),o=K(e,"scale"),i=K(e,"angle"),n=e,l=Pe(null),h={};t({getCanvas:L,getEngine:()=>{var f;return((f=l.value)==null?void 0:f.getEngine())??null}});let v=!1,z=!1,d=0,w=0,m=0,s=0,c=0,T=!1,x=null,g=null;function L(){var f;return((f=l.value)==null?void 0:f.getCanvas())??null}function B(f){const _=L();if(!_)return{x:0,y:0,width:0,height:0};const k=_.getBoundingClientRect();return{x:f.clientX-k.left,y:f.clientY-k.top,width:k.width,height:k.height}}function P(f){h[f.code]=!0}function E(f){h[f.code]=!1}function q(f){var k,R;f.preventDefault();const _=.6;f.deltaY<0?(k=l.value)==null||k.zoom(_):(R=l.value)==null||R.zoom(1/_)}function Z(f){if(f.button===2)z=!0;else{v=!0;const _=B(f);d=_.x,w=_.y}}function re(f){var $,W;const _=B(f);if(z){const ne=L();if(!ne)return;const se=ne.getBoundingClientRect(),We=se.width/2,He=se.height/2,Ye=_.x,ta=_.y,ra=Math.atan2(ta-He,Ye-We);($=l.value)==null||$.angle(ra);return}if(!v)return;const k=_.width,R=_.height,U=k/R,G=(_.x-d)/k*2,N=(_.y-w)/R*2;(W=l.value)==null||W.translateDirect(-G*U,N),d=_.x,w=_.y}function O(f){f.button===2?z=!1:v=!1}function ae(f){var k;const _=L();if(_){if(f.touches.length===1){v=!0;const R=f.touches[0],U=_.getBoundingClientRect();d=R.clientX-U.left,w=R.clientY-U.top}else if(f.touches.length===2){v=!1,T=!0;const[R,U]=f.touches;m=Math.hypot(U.clientX-R.clientX,U.clientY-R.clientY),s=Math.atan2(U.clientY-R.clientY,U.clientX-R.clientX);const G=(k=l.value)==null?void 0:k.getParams();c=G?parseFloat(G[3]):0}}}function ie(f){var k,R,U;const _=L();if(_){if(v&&f.touches.length===1){const G=f.touches[0],N=_.getBoundingClientRect(),$=G.clientX-N.left,W=G.clientY-N.top,ne=N.width,se=N.height,We=ne/se,He=($-d)/ne*2,Ye=(W-w)/se*2;(k=l.value)==null||k.translateDirect(-He*We,Ye),d=$,w=W}else if(T&&f.touches.length===2){const[G,N]=f.touches,$=Math.hypot(N.clientX-G.clientX,N.clientY-G.clientY),W=Math.atan2(N.clientY-G.clientY,N.clientX-G.clientX),ne=m/$;(R=l.value)==null||R.zoom(ne);const se=W-s;(U=l.value)==null||U.angle(c+se)}}}function C(f){f.touches.length===0&&(v=!1,T=!1)}function F(){var _,k,R,U,G,N,$,W;h.KeyW&&((_=l.value)==null||_.translate(0,me)),h.KeyS&&((k=l.value)==null||k.translate(0,-me)),h.KeyA&&((R=l.value)==null||R.translate(-me,0)),h.KeyD&&((U=l.value)==null||U.translate(me,0)),h.KeyQ&&((G=l.value)==null||G.rotate($e)),h.KeyE&&((N=l.value)==null||N.rotate(-$e));const f=.6;h.KeyR&&(($=l.value)==null||$.zoom(f)),h.KeyF&&((W=l.value)==null||W.zoom(1/f)),g=window.setTimeout(F,16)}async function oe(){var f;await((f=l.value)==null?void 0:f.drawOnce()),x=requestAnimationFrame(oe)}return Rt(async()=>{var _;await Ct(),await((_=l.value)==null?void 0:_.initialize());const f=L();f&&(window.addEventListener("keydown",P),window.addEventListener("keyup",E),f.addEventListener("wheel",q,{passive:!1}),f.addEventListener("mousedown",Z),f.addEventListener("contextmenu",k=>k.preventDefault()),window.addEventListener("mousemove",re),window.addEventListener("mouseup",O),f.addEventListener("touchstart",ae,{passive:!1}),f.addEventListener("touchmove",ie,{passive:!1}),f.addEventListener("touchend",C,{passive:!1}),F(),await oe())}),At(()=>{x!==null&&cancelAnimationFrame(x),g!==null&&clearTimeout(g);const f=L();window.removeEventListener("keydown",P),window.removeEventListener("keyup",E),window.removeEventListener("mousemove",re),window.removeEventListener("mouseup",O),f&&(f.removeEventListener("wheel",q),f.removeEventListener("mousedown",Z),f.removeEventListener("contextmenu",_=>_.preventDefault()),f.removeEventListener("touchstart",ae),f.removeEventListener("touchmove",ie),f.removeEventListener("touchend",C))}),(f,_)=>(Re(),Ae("div",Mt,[Xe(je,{ref_key:"mandelbrotRef",ref:l,scale:o.value,"onUpdate:scale":_[0]||(_[0]=k=>o.value=k),angle:i.value,"onUpdate:angle":_[1]||(_[1]=k=>i.value=k),cx:r.value,"onUpdate:cx":_[2]||(_[2]=k=>r.value=k),cy:a.value,"onUpdate:cy":_[3]||(_[3]=k=>a.value=k),mu:n.mu,epsilon:n.epsilon,antialiasLevel:n.antialiasLevel,shadingLevel:n.shadingLevel,palettePeriod:n.palettePeriod,tessellationLevel:n.tessellationLevel,colorStops:n.colorStops,activatePalette:n.activatePalette,activateSkybox:n.activateSkybox,activateTessellation:n.activateTessellation,activateWebcam:n.activateWebcam,activateShading:n.activateShading,activateZebra:n.activateZebra,activateSmoothness:n.activateSmoothness,activateAnimate:n.activateAnimate,paletteOffset:n.paletteOffset,dprMultiplier:n.dprMultiplier,maxIterationMultiplier:n.maxIterationMultiplier},null,8,["scale","angle","cx","cy","mu","epsilon","antialiasLevel","shadingLevel","palettePeriod","tessellationLevel","colorStops","activatePalette","activateSkybox","activateTessellation","activateWebcam","activateShading","activateZebra","activateSmoothness","activateAnimate","paletteOffset","dprMultiplier","maxIterationMultiplier"]),Xe(Tt,{"mandelbrot-ref":l.value},null,8,["mandelbrot-ref"])]))}}),Gt=Ut(Lt,[["__scopeId","data-v-82e855f2"]])})();export{Gt as M,je as _,da as __tla,xe as c,Nt as g,le as n,ye as r};
