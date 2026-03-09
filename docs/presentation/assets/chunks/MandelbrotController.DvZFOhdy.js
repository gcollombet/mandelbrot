var ro=Object.defineProperty;var io=(pe,oe,_e)=>oe in pe?ro(pe,oe,{enumerable:!0,configurable:!0,writable:!0,value:_e}):pe[oe]=_e;var s=(pe,oe,_e)=>io(pe,typeof oe!="symbol"?oe+"":oe,_e);import{aq as oo,ar as ao,as as no,d as _t,at as ie,z as We,p as _r,s as xr,o as Ae,c as Fe,au as je,y as xt,U as so,av as lo,j as k,an as uo,n as ce,J as yt,T as co,w as fo,a as ho,a2 as po,e as vo,_ as yr}from"./framework.B3Tslxqz.js";let wr,wt,go=(async()=>{const pe=`// Mandelbrot progressive-iteration shader.
//
// Layer layout (r32float texture_2d_array, 7 layers):
//   0 : sentinel / iteration count (integer part).
//       Negative  => sentinel (brush/resolve system).  -1 = compute request.
//       0         => inside the set (confirmed), or budget fully exhausted at globalMaxIter.
//       > 0       => escaped (|z|\xB2 >= 4) or budget-exhausted mid-progress (|z|\xB2 < 4).
//   1 : resolution step (1.0 = genuine pixel, >= 2 = resolve-copied from grid step)
//   2 : z.x   (real part of current z, for resuming / coloring)
//   3 : z.y   (imag part of current z, for resuming / coloring)
//   4 : dz.x  (real part of derivative, for resuming / shading)
//   5 : dz.y  (imag part of derivative, for resuming / shading)
//   6 : ref_i (reference orbit index, for resuming perturbation)
//
// mu (smooth fractional part) and angle_der (shading angle) are
// recalculated in the color shader from z and der, saving two layers
// of meaningful storage.
//
// Pixel state convention (iter-only):
//   iter == -1                     : sentinel, needs computation
//   iter == 0                      : confirmed inside the set (or exhausted at globalMaxIter)
//   iter > 0  AND  |z|\xB2 >= 4      : escaped \u2192 color with iter + mu (mu recomputed)
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
  orbitComplete: f32,   // 1.0 = orbit fully built, 0.0 = still building
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

// Set to true to disable epsilon-based interior detection (for debugging).
const IGNORE_EPSILON: bool = false;

// \u2500\u2500 output struct (7 render targets) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
struct FragOut {
  @location(0) iter:      vec4<f32>,  // .r = integer iteration count (or sentinel)
  @location(1) genuine:   vec4<f32>,  // .r = resolution step (1 = genuine, >= 2 = copied)
  @location(2) zx:        vec4<f32>,  // .r = z.x
  @location(3) zy:        vec4<f32>,  // .r = z.y
  @location(4) dzx:       vec4<f32>,  // .r = derivative x
  @location(5) dzy:       vec4<f32>,  // .r = derivative y
  @location(6) ref_i:     vec4<f32>,  // .r = reference orbit index (for resuming)
};

fn pack(v: f32) -> vec4<f32> { return vec4<f32>(v, 0.0, 0.0, 0.0); }

fn loadLayer(coord: vec2<i32>, layer: i32) -> f32 {
  return textureLoad(rawIn, coord, layer, 0).r;
}

// \u2500\u2500 core computation \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn mandelbrot_compute(x0: f32, y0: f32, prev_iter: f32, prev_zx: f32, prev_zy: f32, prev_dzx: f32, prev_dzy: f32, prev_ref_i: f32) -> FragOut {
  let dc = vec2<f32>(x0, y0);
  let max_iteration = mandelbrot.maxIteration;
  let muLimit = mandelbrot.mu;
  let epsilon = mandelbrot.epsilon;

  // Resume state: if prev_iter > 0 we are continuing a previous pass.

  var i: f32 = 0.0;
  var dz = vec2<f32>(prev_zx, prev_zy);
  var der = vec2<f32>(prev_dzx, prev_dzy);
  var ref_i = i32(prev_ref_i)  ;
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
    if (!IGNORE_EPSILON && dot(der, der) < epsilon) {
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
    // Confirmed inside the set. Store iteration count in ref_i for interior coloring.
    out.iter      = pack(0.0);
    out.genuine   = pack(1.0);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(der.x);
    out.dzy       = pack(der.y);
    out.ref_i     = pack(prev_iter + i);
    return out;
  }

  let total_iter = prev_iter + i; // running total across all passes

  if (escaped) {
    // Escaped: store final z and der for color-shader recomputation
    // of mu (smooth frac) and angle_der (shading). No need for ref_i.
    out.iter      = pack(total_iter);
    out.genuine   = pack(1.0);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(der.x);
    out.dzy       = pack(der.y);
    out.ref_i     = pack(0.0);
    return out;
  }

  // Not escaped, not inside \u2014 budget exhausted for this pass.
  let globalMax = mandelbrot.globalMaxIter;

  if (total_iter >= globalMax && mandelbrot.orbitComplete >= 0.5) {
    // Reached the global iteration target without escaping AND the orbit
    // is fully built.  Mark as "inside for now" (iter = 0).
    // Store iteration count in ref_i for interior coloring.
    out.iter      = pack(0.0);
    out.genuine   = pack(1.0);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(der.x);
    out.dzy       = pack(der.y);
    out.ref_i     = pack(total_iter);
    return out;
  }

  // Budget exhausted below globalMaxIter: store iter = total_iter, keep dz/der
  // for resumption.  |z|\xB2 < 4 distinguishes this from escaped pixels.
  out.iter      = pack(total_iter);
  out.genuine   = pack(1.0);
  out.zx        = pack(dz.x);
  out.zy        = pack(dz.y);
  out.dzx       = pack(der.x);
  out.dzy       = pack(der.y);
  out.ref_i     = pack(f32(ref_i));
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
  let prev_zx   = loadLayer(coord, 2);
  let prev_zy   = loadLayer(coord, 3);
  let prev_ref_i = loadLayer(coord, 6);

  // When the reference orbit has no data yet (globalMaxIter == 0),
  // pass through all pixels unchanged \u2014 including sentinels.
  // This avoids marking uncomputed pixels as "inside the set" (iter = 0)
  // when no orbit steps are available to iterate.
  if (mandelbrot.globalMaxIter <= 0.0) {
    var out: FragOut;
    out.iter      = pack(prev_iter);
    out.genuine   = pack(loadLayer(coord, 1));
    out.zx        = pack(prev_zx);
    out.zy        = pack(prev_zy);
    out.dzx       = pack(loadLayer(coord, 4));
    out.dzy       = pack(loadLayer(coord, 5));
    out.ref_i     = pack(loadLayer(coord, 6));
    return out;
  }

  // Determine pixel state (iter-only convention):
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
    out.genuine   = pack(loadLayer(coord, 1));
    out.zx        = pack(prev_zx);
    out.zy        = pack(prev_zy);
    out.dzx       = pack(loadLayer(coord, 4));
    out.dzy       = pack(loadLayer(coord, 5));
    out.ref_i     = pack(loadLayer(coord, 6));
    return out;
  }

  // Neutral mapping: the neutral texture is a square that can contain the rotated screen.
  let xy_neutral = vec2<f32>(uv.x * 2.0 - 1.0, uv.y * 2.0 - 1.0);
  let neutralExtent = sqrt(mandelbrot.aspect * mandelbrot.aspect + 1.0);
  let local_rot = xy_neutral * neutralExtent;

  let x0 = local_rot.x * mandelbrot.scale + mandelbrot.cx;
  let y0 = local_rot.y * mandelbrot.scale + mandelbrot.cy;

  if (needs_continuation) {
    // Resume from stored state: iter > 0, |z|\xB2 < mu.
    let stored_dzx = loadLayer(coord, 4);
    let stored_dzy = loadLayer(coord, 5);
    return mandelbrot_compute(x0, y0, prev_iter, prev_zx, prev_zy, stored_dzx, stored_dzy, prev_ref_i);
  }

  // Fresh computation (sentinel == -1).
  return mandelbrot_compute(x0, y0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0);
}
`,oe=`struct Uniforms {
  palettePeriod: f32,
  paletteOffset: f32,
  bloomStrength: f32,
  time: f32,
  aspect: f32,
  angle: f32,
  animate: f32,
  mu: f32,
  zoomFactor: f32,       // frozenScale / displayScale
  frozenAligned: f32,    // 1.0 when frozen texture is aligned with live (zoom or post-zoom), 0.0 otherwise
  liveZoomFactor: f32,   // liveScale / displayScale (for UV rescaling of live texture)
  frozenShiftU: f32,     // cumulative pan shift of frozen texture (normalized UV)
  frozenShiftV: f32,
  tessellationLevel: f32, // global [0, 10]
  displacementAmount: f32, // global [0, 0.1]
  animationSpeed: f32,    // global multiplier on drift frequencies [0.1, 5.0]
  epsilon: f32,           // interior detection threshold (|der|\xB2 < epsilon)
};
@group(0) @binding(0) var<uniform> parameters: Uniforms;
@group(0) @binding(1) var tex: texture_2d_array<f32>; // resolved neutral texture (7 r32float layers)
@group(0) @binding(2) var tileTex: texture_2d<f32>;
@group(0) @binding(3) var skyboxTex: texture_2d<f32>;
@group(0) @binding(4) var webcamTex: texture_2d<f32>;
@group(0) @binding(5) var paletteTex: texture_2d<f32>;  // 4096 x 4 rgba16float
@group(0) @binding(6) var texFrozen: texture_2d_array<f32>; // frozen snapshot for zoom reprojection
@group(0) @binding(7) var paletteSampler: sampler; // bilinear sampler for palette

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) fragCoord: vec2<f32>,
};

// \u2500\u2500 Per-pixel effect weights & parameters, read from palette texture \u2500\u2500
struct EffectParams {
  // Row 0 decoded
  paletteColor: vec3<f32>,
  wPalette: f32,
  // Row 1
  wZebra: f32,
  wTessellation: f32,
  wShading: f32,
  wSkybox: f32,
  // Row 2
  wWebcam: f32,
  wSmoothness: f32,
  shadingLevel: f32,    // [0, 3]
  specularPower: f32,   // [1, 64]
  // Row 3
  lightAngle: f32,      // [0, 2pi]
};

fn sampleEffects(palettePhase: f32) -> EffectParams {
  var e: EffectParams;

  // Row 0 (y = 0.125): R, G, B, palette weight
  let row0 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, 0.125), 0.0);
  e.paletteColor = row0.rgb;
  e.wPalette = row0.a;

  // Row 1 (y = 0.375): zebra, tessellation, shading, skybox
  let row1 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, 0.375), 0.0);
  e.wZebra = row1.r;
  e.wTessellation = row1.g;
  e.wShading = row1.b;
  e.wSkybox = row1.a;

  // Row 2 (y = 0.625): webcam, smoothness, shadingLevel [0,3], specularPower [1,64]
  let row2 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, 0.625), 0.0);
  e.wWebcam = row2.r;
  e.wSmoothness = row2.g;
  e.shadingLevel = row2.b;       // direct: natural range [0, 3]
  e.specularPower = max(row2.a, 1.0); // direct: natural range [1, 64]

  // Row 3 (y = 0.875): lightAngle [0,2pi], reserved, reserved, reserved
  let row3 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, 0.875), 0.0);
  e.lightAngle = row3.r;          // direct: radians [0, 2pi]

  return e;
}

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

fn isInsideScreen(uv: vec2<f32>, aspect: f32, neutralExtent: f32, angle: f32) -> bool {
  let xy_neutral = (uv - vec2<f32>(0.5, 0.5)) * 2.0;
  let local_rot  = xy_neutral * neutralExtent;
  let local      = rotate(local_rot, -angle);
  return abs(local.x) <= aspect && abs(local.y) <= 1.0;
}

fn cdiv(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  let d = b.x * b.x + b.y * b.y;
  return vec2<f32>((a.x * b.x + a.y * b.y) / d,
                   (a.y * b.x - a.x * b.y) / d);
}

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

fn palette(v: f32, v_smooth: f32, z: vec2<f32>, d: f32, dx: f32, dy: f32, isInterior: bool) -> vec3<f32> {
  let paletteRepeat = max(parameters.palettePeriod, 0.0001);
  let deep = v * 2.0;
  let palettePhase = fract(deep / paletteRepeat + parameters.paletteOffset);

  // \u2500\u2500 Sample all effect channels from the palette texture \u2500\u2500
  let fx = sampleEffects(palettePhase);

  // Interior pixels use pure palette color only \u2014 no tessellation, webcam, or shading.
  let effTess    = select(fx.wTessellation, 0.0, isInterior);
  let effWebcam  = select(fx.wWebcam,       0.0, isInterior);
  let effShading = select(fx.wShading,      0.0, isInterior);

  // \u2500\u2500 Tessellation depth: always smooth, independent of palette period \u2500\u2500
  let tess_depth = v_smooth * 2.0;
  let disp = parameters.displacementAmount;
  let tess_u = tess_depth * 2.0 * disp + dx;
  let tess_v = tess_depth * 2.0 * disp + dy;

  // \u2500\u2500 Gentle sinusoidal animation (only when animate is on) \u2500\u2500
  let anim = parameters.animate;
  let t = parameters.time;
  // Tile texture: slow organic drift
  let spd = parameters.animationSpeed;
  let tile_drift_u = anim * 0.03 * sin(t * 0.4 * spd);
  let tile_drift_v = anim * 0.03 * sin(t * 0.3 * spd + 1.2);
  let tessColor = tile_tessellation(tileTex, tess_u + tile_drift_u, tess_v + tile_drift_v, parameters.tessellationLevel);

  // Webcam texture: same tessellation coords as tile, slightly different animation phase
  let cam_drift_u = anim * 0.04 * sin(t * 0.35 * spd + 0.7);
  let cam_drift_v = anim * 0.04 * sin(t * 0.25 * spd + 2.0);
  let webCamColor = tile_tessellation(
    webcamTex,
    tess_u + cam_drift_u,
    tess_v + cam_drift_v,
    parameters.tessellationLevel
  );

  // \u2500\u2500 Blend color sources using overlay/opacity model \u2500\u2500
  // Palette is always the base. Other sources overlay on top with their weight as opacity.
  var color = fx.paletteColor * fx.wPalette;

  // Tessellation: overlay on top of palette color
  color = mix(color, tessColor, effTess);

  // Webcam: overlay on top of current result
  color = mix(color, webCamColor, effWebcam);

  // \u2500\u2500 Shading (always computed, applied proportionally to wShading) \u2500\u2500
  if (effShading > 0.001) {
    let normal = normalize(vec3<f32>(cos(d), sin(d), 0.5));
    let la = fx.lightAngle;
    let lightDir = normalize(vec3<f32>(cos(la), sin(la), 0.5));
    let viewDir = normalize(vec3<f32>(cos(la + 0.5), sin(la + 0.5), 0.5));
    let diff = max(dot(normal, lightDir), 0.0);
    let reflectDir = reflect(-lightDir, normal);
    let specular = pow(max(dot(viewDir, reflectDir), 0.0), fx.specularPower);
    let raw = 0.4 * diff + 0.6 * specular;
    let brightness = fx.shadingLevel;
    var shading = 1.0 - brightness * 0.2 + brightness * 1.2 * raw;

    // Skybox modulates shading (continuous blend via wSkybox)
    if (fx.wSkybox > 0.001) {
      // Animated drift on skybox UVs (same animate gate as tile/webcam)
      let sky_drift_u = anim * 0.02 * sin(t * 0.25 * spd + 3.5);
      let sky_drift_v = anim * 0.02 * sin(t * 0.2 * spd + 4.8);
      let skyboxDir = normalize(vec3<f32>(cos(d), sin(d), 1.0));
      let skyboxUV = dir_to_skybox_uv(skyboxDir, dx + sky_drift_u, dy + sky_drift_v);
      let skyboxSize = vec2<i32>(textureDimensions(skyboxTex, 0));
      let skyboxCoord = vec2<i32>(
        i32(clamp(skyboxUV.x * f32(skyboxSize.x), 0.0, f32(skyboxSize.x - 1))),
        i32(clamp((1.0 - skyboxUV.y) * f32(skyboxSize.y), 0.0, f32(skyboxSize.y - 1)))
      );
      let skyboxColor = textureLoad(skyboxTex, skyboxCoord, 0).rgb;
      let lum = 0.2126 * skyboxColor.r + 0.7152 * skyboxColor.g + 0.0722 * skyboxColor.b;
      let shading_with_sky = 0.5 + (shading - 0.5) * (0.5 + lum);
      shading = mix(shading, shading_with_sky, fx.wSkybox);
    }

    // Apply shading proportionally to wShading
    color = color * mix(1.0, shading, effShading);
  }

  return clamp(color, vec3<f32>(0.0), vec3<f32>(1.0));
}

// \u2500\u2500 Colorize a single pixel from its raw layer values \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn colorize_pixel(
  iter_val: f32, zx_val: f32, zy_val: f32,
  der_x: f32, der_y: f32,
  ref_i_val: f32,
  uv_neutral: vec2<f32>
) -> vec4<f32> {
  // Sentinel: iter_val < 0 => uncomputed pixel.
  if (iter_val < 0.0) {
    return vec4<f32>(0.0, 0.0, 0.0, 0.0);
  }

  // Budget exhausted: z hasn't escaped. Treat as interior \u2014 same coloring.
  if (iter_val > 0.0 && (zx_val * zx_val + zy_val * zy_val) < parameters.mu) {
    let z_mag = sqrt(zx_val * zx_val + zy_val * zy_val);
    let mu_interior = clamp(z_mag * 0.5, 0.0, 1.0);
    let nu = log(1.0 + iter_val + mu_interior);
    let paletteRepeat = max(parameters.palettePeriod, 0.0001);
    let v = nu / 6.0 * paletteRepeat * 0.5;
    let z = vec2<f32>(zx_val, zy_val);
    let der = vec2<f32>(der_x, der_y);
    let dd = cdiv(der, z + vec2<f32>(1e-20, 0.0));
    let angle_der = atan2(dd.y, dd.x);
    var color = palette(v, v, z, angle_der, uv_neutral.x, uv_neutral.y, true);
    return vec4<f32>(color * 0.4, 1.0);
  }

  // Inside the set: iter_val == 0. Color by smooth iteration count (stored in ref_i_val).
  // Smoothing with |z_n|: works regardless of epsilon detection.
  // Palette cycling uses a fixed ratio (independent of palettePeriod).
  if (iter_val == 0.0) {
    let z_mag = sqrt(zx_val * zx_val + zy_val * zy_val);
    // |z| in [0, 2) for interior points \u2192 fraction in [0, 1)
    let mu_interior = clamp(z_mag * 0.5, 0.0, 1.0);
    let nu = log(1.0 + ref_i_val + mu_interior);
    // Fixed interior cycling: 1 full palette cycle every ~6 log-units.
    // Reverse-engineer v so palette() produces palettePhase = fract(nu / 6.0 + offset).
    let paletteRepeat = max(parameters.palettePeriod, 0.0001);
    let v = nu / 6.0 * paletteRepeat * 0.5;
    let z = vec2<f32>(zx_val, zy_val);
    let der = vec2<f32>(der_x, der_y);
    let dd = cdiv(der, z + vec2<f32>(1e-20, 0.0));
    let angle_der = atan2(dd.y, dd.x);
    let color = palette(v, v, z, angle_der, uv_neutral.x, uv_neutral.y, true);
    return vec4<f32>(color, 1.0);
  }

  // \u2500\u2500 Escaped pixel \u2500\u2500
  let z_sq = zx_val * zx_val + zy_val * zy_val;
  let log_z2 = log(z_sq);
  let mu_val = clamp(1.0 - log(log_z2 / log(parameters.mu)) / log(2.0), 0.0, 1.0);

  var nu = iter_val + mu_val;

  if (nu < 0.0) {
    return vec4<f32>(0.0, 0.0, 0.5, 1.0);
  }

  let nu_smooth = nu;

  // \u2500\u2500 Smoothness: continuous blend between raw and smooth iteration \u2500\u2500
  // We need the palette phase to read wSmoothness from the texture.
  // Compute a preliminary phase to sample the smoothness weight, then
  // apply it to select between iter_val and nu.
  let paletteRepeat = max(parameters.palettePeriod, 0.0001);
  let prelimPhase = fract(nu * 2.0 / paletteRepeat + parameters.paletteOffset);
  let row2 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(prelimPhase, 0.625), 0.0);
  let wSmoothness = row2.g;
  nu = mix(iter_val, nu, wSmoothness);

  // \u2500\u2500 Zebra: continuous application (darkens even iterations) \u2500\u2500
  let row1 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(prelimPhase, 0.375), 0.0);
  let wZebra = row1.r;
  let isEvenIter = 1.0 - abs(floor(iter_val) % 2.0);

  let z = vec2<f32>(zx_val, zy_val);
  let der = vec2<f32>(der_x, der_y);
  let dd = cdiv(der, z);
  let angle_der = atan2(dd.y, dd.x);

  let v = nu;
  let v_smooth = nu_smooth;
  var color = palette(v, v_smooth, z, angle_der, uv_neutral.x, uv_neutral.y, false);

  // Apply zebra after palette computation: darken even iterations
  color = color * (1.0 - wZebra * isEvenIter);

  return vec4<f32>(color, 1.0);
}

// \u2500\u2500 Debug flag \u2500\u2500
// Set to true to visualize the live texture as a negative image during zoom,
// with genuine pixels tinted green and resolve-copied pixels tinted red.
const DEBUG_SHOW_LIVE_NEGATIVE: bool = false;

@fragment
fn fs_main(@location(0) fragCoord: vec2<f32>) -> @location(0) vec4<f32> {
  let uv_screen = fragCoord;

  let xy_screen = vec2<f32>(uv_screen.x * 2.0 - 1.0, uv_screen.y * 2.0 - 1.0);
  let local = vec2<f32>(xy_screen.x * parameters.aspect, xy_screen.y);
  let neutralExtent = sqrt(parameters.aspect * parameters.aspect + 1.0);
  let local_rot = rotate(local, parameters.angle);
  let xy_neutral = local_rot / neutralExtent;
  let uv_neutral = xy_neutral * 0.5 + vec2<f32>(0.5, 0.5);

  let texSize = vec2<i32>(textureDimensions(tex));
  let texSizeF = vec2<f32>(f32(texSize.x), f32(texSize.y));

  let aspect = parameters.aspect;
  let angle  = parameters.angle;

  let zf  = parameters.zoomFactor;
  let lzf = parameters.liveZoomFactor;

  // \u2500\u2500 Unified path: min-step-wins compositing \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  // Layer 1 stores the resolution step: 1 = genuine pixel (best),
  // >= 2 = resolve-copied from a grid neighbor (coarser = worse),
  // 0 = no data (sentinel / uncomputed).
  // The pixel with the smallest positive step wins.
  // When not zooming (zf=1, lzf=1), UV math reduces to identity, so the
  // same logic works seamlessly for both zoom and non-zoom rendering.

  // \u2500\u2500 Sample live texture \u2500\u2500
  let uv_live = (uv_neutral - vec2<f32>(0.5, 0.5)) / lzf + vec2<f32>(0.5, 0.5);

  var liveInBounds: bool;
  if (lzf < 1.0) {
    liveInBounds = isInsideScreen(uv_live, aspect, neutralExtent, angle);
  } else {
    liveInBounds = uv_live.x >= 0.0 && uv_live.x <= 1.0
                && uv_live.y >= 0.0 && uv_live.y <= 1.0;
  }

  var live_iter = -1.0;
  var liveStep = 0.0;  // 0 = no data
  var liveColor = vec4<f32>(0.0);
  if (liveInBounds) {
    let liveCoord = vec2<i32>(
      i32(clamp(uv_live.x * texSizeF.x, 0.0, texSizeF.x - 1.0)),
      i32(clamp((1.0 - uv_live.y) * texSizeF.y, 0.0, texSizeF.y - 1.0))
    );
    live_iter = textureLoad(tex, liveCoord, 0, 0).r;
    liveStep = textureLoad(tex, liveCoord, 1, 0).r;

    if (live_iter >= 0.0) {
      liveColor = colorize_pixel(
        live_iter,
        textureLoad(tex, liveCoord, 2, 0).r,
        textureLoad(tex, liveCoord, 3, 0).r,
        textureLoad(tex, liveCoord, 4, 0).r,
        textureLoad(tex, liveCoord, 5, 0).r,
        textureLoad(tex, liveCoord, 6, 0).r,
        uv_neutral
      );
    }
  }
  let liveValid = live_iter >= 0.0 && liveColor.a > 0.0;

  // \u2500\u2500 Sample frozen texture \u2500\u2500
  // The frozen texture is only usable when it is aligned with the live texture
  // (during zoom reprojection, or post-zoom before any translation occurs).
  // The CPU sets frozenAligned = 1.0 in those cases, 0.0 otherwise.
  let useFrozen = parameters.frozenAligned > 0.5;

  var frozenStep = 0.0;  // 0 = no data
  var frozenColor = vec4<f32>(0.0);
  if (useFrozen) {
    let uv_frozen = (uv_neutral - vec2<f32>(0.5, 0.5)) / zf + vec2<f32>(0.5, 0.5)
                    - vec2<f32>(parameters.frozenShiftU, parameters.frozenShiftV);

    var frozenInBounds: bool;
    if (zf < 1.0) {
      frozenInBounds = isInsideScreen(uv_frozen, aspect, neutralExtent, angle);
    } else {
      frozenInBounds = uv_frozen.x >= 0.0 && uv_frozen.x <= 1.0
                    && uv_frozen.y >= 0.0 && uv_frozen.y <= 1.0;
    }

    if (frozenInBounds) {
      let frozenCoord = vec2<i32>(
        i32(clamp(uv_frozen.x * texSizeF.x, 0.0, texSizeF.x - 1.0)),
        i32(clamp((1.0 - uv_frozen.y) * texSizeF.y, 0.0, texSizeF.y - 1.0))
      );
      let frozen_iter = textureLoad(texFrozen, frozenCoord, 0, 0).r;
      frozenStep = textureLoad(texFrozen, frozenCoord, 1, 0).r;

      if (frozen_iter >= 0.0) {
        frozenColor = colorize_pixel(
          frozen_iter,
          textureLoad(texFrozen, frozenCoord, 2, 0).r,
          textureLoad(texFrozen, frozenCoord, 3, 0).r,
          textureLoad(texFrozen, frozenCoord, 4, 0).r,
          textureLoad(texFrozen, frozenCoord, 5, 0).r,
          textureLoad(texFrozen, frozenCoord, 6, 0).r,
          uv_neutral
        );
      }
    }
  }
  let frozenValid = frozenColor.a > 0.0;

  // \u2500\u2500 Pick the best pixel: smallest positive step wins \u2500\u2500
  // step > 0 means the pixel has data; step = 0 means no data.
  // The frozen and live textures live at different scales, so their raw step
  // values are not directly comparable. A frozen genuine pixel (step=1) at
  // frozenScale is zf/lzf times coarser per axis than a live genuine pixel
  // (step=1) at liveScale.  Scale the frozen step to live-resolution units.
  let scaleRatio = select(1.0, zf / lzf, lzf > 0.0);
  let effectiveFrozenStep = frozenStep * scaleRatio;
  let liveHasData   = liveValid && liveStep > 0.0;
  let frozenHasData = frozenValid && frozenStep > 0.0;

  if (liveHasData && frozenHasData) {
    // Both have data \u2014 pick the one with finer resolution (smaller step).
    if (liveStep <= effectiveFrozenStep) {
      if (DEBUG_SHOW_LIVE_NEGATIVE) {
        let neg = vec3<f32>(1.0) - liveColor.rgb;
        return vec4<f32>(neg.r * 0.3, neg.g, neg.b * 0.3, 1.0);
      }
      return vec4<f32>(liveColor.rgb, 1.0);
    } else {
      return vec4<f32>(frozenColor.rgb, 1.0);
    }
  }

  if (liveHasData) {
    if (DEBUG_SHOW_LIVE_NEGATIVE) {
      let neg = vec3<f32>(1.0) - liveColor.rgb;
      if (liveStep <= 1.0) {
        return vec4<f32>(neg.r * 0.3, neg.g, neg.b * 0.3, 1.0);
      } else {
        return vec4<f32>(neg.r, neg.g * 0.3, neg.b * 0.3, 1.0);
      }
    }
    return vec4<f32>(liveColor.rgb, 1.0);
  }

  if (frozenHasData) {
    return vec4<f32>(frozenColor.rgb, 1.0);
  }

  // No valid pixel from either source.
  return vec4<f32>(0.05, 0.05, 0.05, 1.0);
}
`,_e=`// Brush pass: updates sentinel levels in the neutral square texture.
//
// Uses a texture_2d_array<f32> with 7 r32float layers.
//
// Layer layout:
//   0 : sentinel / iteration count (integer part)
//   1 : resolution step (1.0 = genuine pixel, >= 2 = resolve-copied, 0.0 = no data)
//   2 : z.x
//   3 : z.y
//   4 : dz.x (derivative real)
//   5 : dz.y (derivative imag)
//   6 : ref_i (reference orbit index, for resuming perturbation)
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
//   iter > 0  AND  |z|\xB2 >= 4      : escaped \u2192 color with iter + mu (mu recomputed in color shader)
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
  gridOffsetX: f32,
  gridOffsetY: f32,
  minBrushStep: f32,    // minimum sentinel refinement step (0 = no limit)
  allowRefinement: f32, // 1.0 = refine sentinels normally, 0.0 = freeze grid (GPU under pressure)
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
  @location(1) genuine:   vec4<f32>,
  @location(2) zx:        vec4<f32>,
  @location(3) zy:        vec4<f32>,
  @location(4) dzx:       vec4<f32>,
  @location(5) dzy:       vec4<f32>,
  @location(6) ref_i:     vec4<f32>,
};

fn pack(v: f32) -> vec4<f32> { return vec4<f32>(v, 0.0, 0.0, 0.0); }

fn loadLayer(coord: vec2<i32>, layer: i32) -> f32 {
  return textureLoad(prevRaw, coord, layer, 0).r;
}

fn loadAllLayers(coord: vec2<i32>) -> FragOut {
  var o: FragOut;
  o.iter      = pack(loadLayer(coord, 0));
  o.genuine   = pack(loadLayer(coord, 1));
  o.zx        = pack(loadLayer(coord, 2));
  o.zy        = pack(loadLayer(coord, 3));
  o.dzx       = pack(loadLayer(coord, 4));
  o.dzy       = pack(loadLayer(coord, 5));
  o.ref_i     = pack(loadLayer(coord, 6));
  return o;
}

fn makeCleared(sentinel: f32) -> FragOut {
  var o: FragOut;
  o.iter      = pack(sentinel);
  o.genuine   = pack(0.0);
  o.zx        = pack(0.0);
  o.zy        = pack(0.0);
  o.dzx       = pack(0.0);
  o.dzy       = pack(0.0);
  o.ref_i     = pack(0.0);
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

  // Adaptive refinement gating: when the GPU is under pressure the CPU
  // sets allowRefinement to 0, freezing the sentinel grid at its current
  // resolution.  This prevents a 4\xD7 pixel-count spike at each step
  // transition, giving the iteration-batch controller time to adapt.
  if (uni.allowRefinement < 0.5) {
    return s;
  }

  // Clamp minimum refinement step during zoom (0 = no limit).
  let minStep = i32(uni.minBrushStep);
  let next_step = max(max(1, minStep), step / 2);

  // If clamped step equals current step, stop refining \u2014 already at minimum.
  if (next_step >= step) {
    return s;
  }

  let gx = i32(uni.gridOffsetX);
  let gy = i32(uni.gridOffsetY);
  let is_anchor = (((coord_out.x - gx) % next_step + next_step) % next_step == 0)
               && (((coord_out.y - gy) % next_step + next_step) % next_step == 0);
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
`,zr=`// Resolve pass: replaces remaining sentinels with a snapped parent pixel.
//
// Uses a texture_2d_array<f32> with 7 r32float layers.
//
// Layer layout:
//   0 : sentinel / iteration count (integer part)
//   1 : resolution step (1.0 = genuine pixel, >= 2 = resolve-copied from grid step)
//   2 : z.x
//   3 : z.y
//   4 : dz.x (derivative real)
//   5 : dz.y (derivative imag)
//   6 : ref_i (reference orbit index, for resuming perturbation)
//
// Sentinel convention:
//   If layer0 == -step (step is power-of-two > 1), resolve by testing
//   all 4 corner anchors of the grid cell and using the first finished
//   one.  This ensures correct resolve regardless of pan direction.

struct ResolveUniforms {
  mu: f32,
  gridOffsetX: f32,
  gridOffsetY: f32,
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
  @location(1) genuine:   vec4<f32>,
  @location(2) zx:        vec4<f32>,
  @location(3) zy:        vec4<f32>,
  @location(4) dzx:       vec4<f32>,
  @location(5) dzy:       vec4<f32>,
  @location(6) ref_i:     vec4<f32>,
};

fn pack(v: f32) -> vec4<f32> { return vec4<f32>(v, 0.0, 0.0, 0.0); }

fn loadLayer(coord: vec2<i32>, layer: i32) -> f32 {
  return textureLoad(rawTex, coord, layer, 0).r;
}

fn loadAllLayers(coord: vec2<i32>) -> FragOut {
  var o: FragOut;
  o.iter      = pack(loadLayer(coord, 0));
  o.genuine   = pack(loadLayer(coord, 1));
  o.zx        = pack(loadLayer(coord, 2));
  o.zy        = pack(loadLayer(coord, 3));
  o.dzx       = pack(loadLayer(coord, 4));
  o.dzy       = pack(loadLayer(coord, 5));
  o.ref_i     = pack(loadLayer(coord, 6));
  return o;
}

// Like loadAllLayers but writes the resolve grid step into layer 1.
// step = grid distance to the source pixel (higher = coarser / less accurate).
// Genuine pixels have step = 1; resolve-copied pixels have step >= 2.
fn loadAllLayersAsCopy(coord: vec2<i32>, step: u32) -> FragOut {
  var o: FragOut;
  o.iter      = pack(loadLayer(coord, 0));
  o.genuine   = pack(f32(step));
  o.zx        = pack(loadLayer(coord, 2));
  o.zy        = pack(loadLayer(coord, 3));
  o.dzx       = pack(loadLayer(coord, 4));
  o.dzy       = pack(loadLayer(coord, 5));
  o.ref_i     = pack(loadLayer(coord, 6));
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
    if (z_sq > uni.mu) {
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

  // Grid offset for sentinel alignment after translation.
  let gx = i32(uni.gridOffsetX);
  let gy = i32(uni.gridOffsetY);

  // Climb through coarser grid levels. The maximum number of doublings
  // before step_u exceeds the texture size is bounded by log2(max(dims)).
  // Using 20 iterations covers textures up to 2^20 = 1M pixels per side.
  for (var level = 0u; level < 10u; level = level + 1u) {
    // Safety: if step exceeds texture size, stop climbing and fall back
    // to the pixel itself (prevents runaway on pathological inputs
    // or when all ancestors are unfinished sentinels).
    if (step_u >= dims.x || step_u >= dims.y) {
      return loadAllLayers(coord);
    }

    let step_i = i32(step_u);
    // Snap to grid-aligned anchor, accounting for cumulative shift offset.
    let sx = i32(x) - gx;
    let sy = i32(y) - gy;
    let base_x = u32(sx - ((sx % step_i + step_i) % step_i) + gx);
    let base_y = u32(sy - ((sy % step_i + step_i) % step_i) + gy);

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
        return loadAllLayersAsCopy(ccoord, step_u);
      }

      // iter > 0: check whether pixel actually escaped or is budget-exhausted.
      let zx = loadLayer(ccoord, 2);
      let zy = loadLayer(ccoord, 3);
      let z_sq = zx * zx + zy * zy;

      if (z_sq >= uni.mu) {
        // Escaped \u2014 use this pixel.
        return loadAllLayersAsCopy(ccoord, step_u);
      }

      // Budget-exhausted: skip this candidate, try the others.
    }

    // None of the 4 candidates had a finished pixel \u2014 climb to the next
    // coarser grid level.
    step_u = step_u * 2u;
  }

  // Fallback after exhausting all grid levels.
  return loadAllLayers(coord);
}
`,Mr=`// Compute pass: counts pixels that still need rendering work.
//
// Reads rawTexture (A) after the mandelbrot render pass:
//   Layer 0 : iter (sentinel / iteration count)
//   Layer 2 : z.x
//   Layer 3 : z.y
//
// A pixel needs work if:
//   iter < 0               : sentinel (any level), needs refinement + computation
//   iter > 0  AND  |z|\xB2 < mu : budget exhausted mid-progress, needs continuation
//
// Two counters are maintained:
//   count        : all pixels needing work (sentinels + continuations) \u2014 for needsMoreFrames()
//   active_count : pixels that mandelbrot.wgsl actually processes this frame
//                  (iter == -1 OR continuation) \u2014 for adaptive refinement gating
//
// Only pixels inside the rotated viewport are counted; pixels outside
// the projected frame on the neutral texture are ignored.
//
// The count is written to an atomic<u32> in a storage buffer, read back
// asynchronously by the CPU to determine when progressive rendering is done.

struct Params {
  mu: f32,
  aspect: f32,
  angle: f32,
};

struct CounterBuffer {
  count: atomic<u32>,
  active_count: atomic<u32>,
};

@group(0) @binding(0) var rawTex: texture_2d_array<f32>;
@group(0) @binding(1) var<storage, read_write> counter: CounterBuffer;
@group(0) @binding(2) var<uniform> params: Params;

fn rotate2d(v: vec2<f32>, a: f32) -> vec2<f32> {
  let s = sin(a);
  let c = cos(a);
  return vec2<f32>(c * v.x - s * v.y, s * v.x + c * v.y);
}

fn is_inside_rotated_screen(xy_neutral: vec2<f32>) -> bool {
  let neutralExtent = sqrt(params.aspect * params.aspect + 1.0);
  let local_rot = xy_neutral * neutralExtent;
  let local = rotate2d(local_rot, -params.angle);
  let inside_x = abs(local.x) <= params.aspect;
  let inside_y = abs(local.y) <= 1.0;
  return inside_x && inside_y;
}

@compute @workgroup_size(16, 16)
fn count_unfinished(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dims = textureDimensions(rawTex);
  if (gid.x >= dims.x || gid.y >= dims.y) {
    return;
  }

  // Map pixel coordinate to neutral-space [-1, 1]
  // Y is flipped to match the fragment-shader convention where uv.y=0 is
  // bottom and uv.y=1 is top, whereas gid.y=0 is the first texel row.
  let uv = vec2<f32>(
    (f32(gid.x) + 0.5) / f32(dims.x),
    1.0 - (f32(gid.y) + 0.5) / f32(dims.y),
  );
  let xy_neutral = uv * 2.0 - vec2<f32>(1.0);

  // Skip pixels outside the rotated viewport
  if (!is_inside_rotated_screen(xy_neutral)) {
    return;
  }

  let coord = vec2<i32>(i32(gid.x), i32(gid.y));
  let iter = textureLoad(rawTex, coord, 0, 0).r;
  let zx   = textureLoad(rawTex, coord, 2, 0).r;
  let zy   = textureLoad(rawTex, coord, 3, 0).r;

  let is_sentinel        = (iter < 0.0);
  let needs_continuation = (iter > 0.0) && ((zx * zx + zy * zy) < params.mu);
  let is_active          = (iter == -1.0) || needs_continuation;

  if (is_sentinel || needs_continuation) {
    atomicAdd(&counter.count, 1u);
  }
  if (is_active) {
    atomicAdd(&counter.active_count, 1u);
  }
}
`,Sr=`// Merge pass: fuses the resolved (live) and frozen textures into a new frozen
// snapshot using the min-step-wins rule.
//
// This is needed when zoom stops: the two textures live in different coordinate
// spaces (live at liveScale, frozen at frozenScale). The merge reprojects both
// into the current display space and, for each output pixel, keeps the source
// with the finest resolution (smallest positive step in layer 1).
//
// Output: 7 MRT render targets written directly into the frozen texture layers.
//
// Layer layout (r32float texture_2d_array, 7 layers):
//   0 : iteration count
//   1 : resolution step (1 = genuine, >= 2 = resolve-copied, 0 = no data)
//   2 : z.x
//   3 : z.y
//   4 : dz.x
//   5 : dz.y
//   6 : ref_i

struct MergeUniforms {
  zoomFactor:    f32, // frozenScale / displayScale
  liveZoomFactor: f32, // liveScale / displayScale
  frozenShiftU:  f32,
  frozenShiftV:  f32,
  aspect:        f32,
  angle:         f32,
};

@group(0) @binding(0) var<uniform> uni: MergeUniforms;
@group(0) @binding(1) var texResolved: texture_2d_array<f32>;
@group(0) @binding(2) var texFrozen:   texture_2d_array<f32>;

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
  @location(0) layer0: vec4<f32>,
  @location(1) layer1: vec4<f32>,
  @location(2) layer2: vec4<f32>,
  @location(3) layer3: vec4<f32>,
  @location(4) layer4: vec4<f32>,
  @location(5) layer5: vec4<f32>,
  @location(6) layer6: vec4<f32>,
};

fn pack(v: f32) -> vec4<f32> { return vec4<f32>(v, 0.0, 0.0, 0.0); }

fn rotate(p: vec2<f32>, a: f32) -> vec2<f32> {
  let c = cos(a);
  let s = sin(a);
  return vec2<f32>(p.x * c - p.y * s, p.x * s + p.y * c);
}

// Check if a UV in neutral space maps to a point inside the rotated screen.
fn isInsideScreen(uv: vec2<f32>, aspect: f32, neutralExtent: f32, angle: f32) -> bool {
  let xy = (uv - vec2<f32>(0.5, 0.5)) * 2.0;
  let local = xy * neutralExtent;
  let rotated = rotate(local, -angle);
  return abs(rotated.x) <= aspect && abs(rotated.y) <= 1.0;
}

// Read all 7 layers from a texture at the given coordinate.
fn readAllLayers(tex: texture_2d_array<f32>, coord: vec2<i32>) -> FragOut {
  var o: FragOut;
  o.layer0 = pack(textureLoad(tex, coord, 0, 0).r);
  o.layer1 = pack(textureLoad(tex, coord, 1, 0).r);
  o.layer2 = pack(textureLoad(tex, coord, 2, 0).r);
  o.layer3 = pack(textureLoad(tex, coord, 3, 0).r);
  o.layer4 = pack(textureLoad(tex, coord, 4, 0).r);
  o.layer5 = pack(textureLoad(tex, coord, 5, 0).r);
  o.layer6 = pack(textureLoad(tex, coord, 6, 0).r);
  return o;
}

fn makeEmpty() -> FragOut {
  var o: FragOut;
  o.layer0 = pack(-1.0); // sentinel
  o.layer1 = pack(0.0);  // step = 0 (no data)
  o.layer2 = pack(0.0);
  o.layer3 = pack(0.0);
  o.layer4 = pack(0.0);
  o.layer5 = pack(0.0);
  o.layer6 = pack(0.0);
  return o;
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> FragOut {
  // uv is in output space (0..1), which maps directly to the frozen texture.
  // The output frozen will be used post-zoom with zf=1, lzf=1, so output
  // coordinates = neutral texture coordinates.

  // Convert output UV to neutral-space UV.
  // The output texture is square (neutral-sized), same as all layer textures.
  // uv already spans 0..1 across this square, so uv_neutral = uv (with Y flip
  // handled by the MRT write).
  let uv_neutral = uv;

  let texSize = vec2<i32>(textureDimensions(texResolved));
  let texSizeF = vec2<f32>(f32(texSize.x), f32(texSize.y));

  let aspect = uni.aspect;
  let angle  = uni.angle;
  let neutralExtent = sqrt(aspect * aspect + 1.0);
  let zf  = uni.zoomFactor;
  let lzf = uni.liveZoomFactor;

  // \u2500\u2500 Sample resolved (live) texture \u2500\u2500
  let uv_live = (uv_neutral - vec2<f32>(0.5, 0.5)) / lzf + vec2<f32>(0.5, 0.5);

  var liveInBounds: bool;
  if (lzf < 1.0) {
    liveInBounds = isInsideScreen(uv_live, aspect, neutralExtent, angle);
  } else {
    liveInBounds = uv_live.x >= 0.0 && uv_live.x <= 1.0
                && uv_live.y >= 0.0 && uv_live.y <= 1.0;
  }

  var liveStep = 0.0;
  var liveIter = -1.0;
  var liveData: FragOut;
  if (liveInBounds) {
    let liveCoord = vec2<i32>(
      i32(clamp(uv_live.x * texSizeF.x, 0.0, texSizeF.x - 1.0)),
      i32(clamp((1.0 - uv_live.y) * texSizeF.y, 0.0, texSizeF.y - 1.0))
    );
    liveIter = textureLoad(texResolved, liveCoord, 0, 0).r;
    liveStep = textureLoad(texResolved, liveCoord, 1, 0).r;
    liveData = readAllLayers(texResolved, liveCoord);
  }
  let liveHasData = liveIter >= 0.0 && liveStep > 0.0;

  // \u2500\u2500 Sample frozen texture \u2500\u2500
  let uv_frozen = (uv_neutral - vec2<f32>(0.5, 0.5)) / zf + vec2<f32>(0.5, 0.5)
                  - vec2<f32>(uni.frozenShiftU, uni.frozenShiftV);

  var frozenInBounds: bool;
  if (zf < 1.0) {
    frozenInBounds = isInsideScreen(uv_frozen, aspect, neutralExtent, angle);
  } else {
    frozenInBounds = uv_frozen.x >= 0.0 && uv_frozen.x <= 1.0
                  && uv_frozen.y >= 0.0 && uv_frozen.y <= 1.0;
  }

  var frozenStep = 0.0;
  var frozenIter = -1.0;
  var frozenData: FragOut;
  if (frozenInBounds) {
    let frozenCoord = vec2<i32>(
      i32(clamp(uv_frozen.x * texSizeF.x, 0.0, texSizeF.x - 1.0)),
      i32(clamp((1.0 - uv_frozen.y) * texSizeF.y, 0.0, texSizeF.y - 1.0))
    );
    frozenIter = textureLoad(texFrozen, frozenCoord, 0, 0).r;
    frozenStep = textureLoad(texFrozen, frozenCoord, 1, 0).r;
    frozenData = readAllLayers(texFrozen, frozenCoord);
  }
  let frozenHasData = frozenIter >= 0.0 && frozenStep > 0.0;

  // \u2500\u2500 Min-step-wins \u2500\u2500
  // The frozen and live textures live at different scales: a frozen step=1 is
  // zf/lzf times coarser per axis than a live step=1.  Scale frozen step to
  // live-resolution units so the comparison is fair.
  let scaleRatio = select(1.0, zf / lzf, lzf > 0.0);
  let effectiveFrozenStep = frozenStep * scaleRatio;

  if (liveHasData && frozenHasData) {
    if (liveStep <= effectiveFrozenStep) {
      return liveData;
    } else {
      return frozenData;
    }
  }

  if (liveHasData) {
    return liveData;
  }

  if (frozenHasData) {
    return frozenData;
  }

  return makeEmpty();
}
`,Tr=async(t={},e)=>{let r;if(e.startsWith("data:")){const i=e.replace(/^data:.*?base64,/,"");let o;if(typeof Buffer=="function"&&typeof Buffer.from=="function")o=Buffer.from(i,"base64");else if(typeof atob=="function"){const a=atob(i);o=new Uint8Array(a.length);for(let l=0;l<a.length;l++)o[l]=a.charCodeAt(l)}else throw new Error("Cannot decode base64-encoded data URL");r=await WebAssembly.instantiate(o,t)}else{const i=await fetch(e),o=i.headers.get("Content-Type")||"";if("instantiateStreaming"in WebAssembly&&o.startsWith("application/wasm"))r=await WebAssembly.instantiateStreaming(i,t);else{const a=await i.arrayBuffer();r=await WebAssembly.instantiate(a,t)}}return r.instance.exports};let g;function kr(t){g=t}let Ge=null;function Ue(){return(Ge===null||Ge.byteLength===0)&&(Ge=new Uint8Array(g.memory.buffer)),Ge}let Oe=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0});Oe.decode();const Lr=2146435072;let Xe=0;function Br(t,e){return Xe+=e,Xe>=Lr&&(Oe=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0}),Oe.decode(),Xe=e),Oe.decode(Ue().subarray(t,t+e))}function zt(t,e){return t=t>>>0,Br(t,e)}let xe=null;function Rr(){return(xe===null||xe.buffer.detached===!0||xe.buffer.detached===void 0&&xe.buffer!==g.memory.buffer)&&(xe=new DataView(g.memory.buffer)),xe}function Ze(t,e){t=t>>>0;const r=Rr(),i=[];for(let o=t;o<t+4*e;o+=4)i.push(g.__wbindgen_export_0.get(r.getUint32(o,!0)));return g.__externref_drop_slice(t,e),i}let de=0;const Be=new TextEncoder;"encodeInto"in Be||(Be.encodeInto=function(t,e){const r=Be.encode(t);return e.set(r),{read:t.length,written:r.length}});function ye(t,e,r){if(r===void 0){const u=Be.encode(t),d=e(u.length,1)>>>0;return Ue().subarray(d,d+u.length).set(u),de=u.length,d}let i=t.length,o=e(i,1)>>>0;const a=Ue();let l=0;for(;l<i;l++){const u=t.charCodeAt(l);if(u>127)break;a[o+l]=u}if(l!==i){l!==0&&(t=t.slice(l)),o=r(o,i,i=l+t.length*3,1)>>>0;const u=Ue().subarray(o+l,o+i),d=Be.encodeInto(t,u);l+=d.written,o=r(o,i,l,1)>>>0}return de=l,o}const Mt=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(t=>g.__wbg_mandelbrotnavigator_free(t>>>0,1));class Ke{__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,Mt.unregister(this),e}free(){const e=this.__destroy_into_raw();g.__wbg_mandelbrotnavigator_free(e,0)}get_params(){const e=g.mandelbrotnavigator_get_params(this.__wbg_ptr);var r=Ze(e[0],e[1]).slice();return g.__wbindgen_free(e[0],e[1]*4,4),r}rotate_direct(e){g.mandelbrotnavigator_rotate_direct(this.__wbg_ptr,e)}pixel_to_complex(e,r,i,o){const a=g.mandelbrotnavigator_pixel_to_complex(this.__wbg_ptr,e,r,i,o);var l=Ze(a[0],a[1]).slice();return g.__wbindgen_free(a[0],a[1]*4,4),l}translate_direct(e,r){g.mandelbrotnavigator_translate_direct(this.__wbg_ptr,e,r)}get_reference_orbit_len(){return g.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr)>>>0}compute_reference_orbit_ptr(e){const r=g.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr,e);return we.__wrap(r)}get_reference_orbit_capacity(){return g.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr)>>>0}compute_reference_orbit_chunk(e,r){const i=g.mandelbrotnavigator_compute_reference_orbit_chunk(this.__wbg_ptr,e,r);return we.__wrap(i)}constructor(e,r,i,o){const a=ye(e,g.__wbindgen_malloc,g.__wbindgen_realloc),l=de,u=ye(r,g.__wbindgen_malloc,g.__wbindgen_realloc),d=de,m=ye(i,g.__wbindgen_malloc,g.__wbindgen_realloc),f=de,v=g.mandelbrotnavigator_new(a,l,u,d,m,f,o);return this.__wbg_ptr=v>>>0,Mt.register(this,this.__wbg_ptr,this),this}step(){const e=g.mandelbrotnavigator_step(this.__wbg_ptr);var r=Ze(e[0],e[1]).slice();return g.__wbindgen_free(e[0],e[1]*4,4),r}zoom(e){g.mandelbrotnavigator_zoom(this.__wbg_ptr,e)}angle(e){g.mandelbrotnavigator_angle(this.__wbg_ptr,e)}scale(e){const r=ye(e,g.__wbindgen_malloc,g.__wbindgen_realloc),i=de;g.mandelbrotnavigator_scale(this.__wbg_ptr,r,i)}origin(e,r){const i=ye(e,g.__wbindgen_malloc,g.__wbindgen_realloc),o=de,a=ye(r,g.__wbindgen_malloc,g.__wbindgen_realloc),l=de;g.mandelbrotnavigator_origin(this.__wbg_ptr,i,o,a,l)}rotate(e){g.mandelbrotnavigator_rotate(this.__wbg_ptr,e)}translate(e,r){g.mandelbrotnavigator_translate(this.__wbg_ptr,e,r)}}Symbol.dispose&&(Ke.prototype[Symbol.dispose]=Ke.prototype.free),typeof FinalizationRegistry>"u"||new FinalizationRegistry(t=>g.__wbg_mandelbrotstep_free(t>>>0,1));const St=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(t=>g.__wbg_orbitbufferinfo_free(t>>>0,1));class we{static __wrap(e){e=e>>>0;const r=Object.create(we.prototype);return r.__wbg_ptr=e,St.register(r,r.__wbg_ptr,r),r}__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,St.unregister(this),e}free(){const e=this.__destroy_into_raw();g.__wbg_orbitbufferinfo_free(e,0)}get ptr(){return g.__wbg_get_orbitbufferinfo_ptr(this.__wbg_ptr)>>>0}set ptr(e){g.__wbg_set_orbitbufferinfo_ptr(this.__wbg_ptr,e)}get offset(){return g.__wbg_get_orbitbufferinfo_offset(this.__wbg_ptr)>>>0}set offset(e){g.__wbg_set_orbitbufferinfo_offset(this.__wbg_ptr,e)}get count(){return g.__wbg_get_orbitbufferinfo_count(this.__wbg_ptr)>>>0}set count(e){g.__wbg_set_orbitbufferinfo_count(this.__wbg_ptr,e)}}Symbol.dispose&&(we.prototype[Symbol.dispose]=we.prototype.free);function Cr(t){return Math.exp(t)}function Pr(){return Date.now()}function Er(t,e){throw new Error(zt(t,e))}function Ar(t,e){return zt(t,e)}function Fr(){const t=g.__wbindgen_export_0,e=t.grow(4);t.set(0,void 0),t.set(e+0,void 0),t.set(e+1,null),t.set(e+2,!0),t.set(e+3,!1)}URL=globalThis.URL;const x=await Tr({"./mandelbrot_bg.js":{__wbg_now_1e80617bcee43265:Pr,__wbg_exp_9293ded1248e1bd3:Cr,__wbg_wbindgenthrow_451ec1a8469d7eb6:Er,__wbindgen_init_externref_table:Fr,__wbindgen_cast_2241b6af4c4b2941:Ar}},oo),Tt=x.memory,Gr=x.__wbg_get_mandelbrotstep_dx,Ur=x.__wbg_get_mandelbrotstep_dy,Or=x.__wbg_get_mandelbrotstep_zx,Ir=x.__wbg_get_mandelbrotstep_zy,Nr=x.__wbg_get_orbitbufferinfo_count,Dr=x.__wbg_get_orbitbufferinfo_offset,Vr=x.__wbg_get_orbitbufferinfo_ptr,qr=x.__wbg_mandelbrotnavigator_free,Yr=x.__wbg_mandelbrotstep_free,Hr=x.__wbg_orbitbufferinfo_free,$r=x.__wbg_set_mandelbrotstep_dx,Wr=x.__wbg_set_mandelbrotstep_dy,jr=x.__wbg_set_mandelbrotstep_zx,Xr=x.__wbg_set_mandelbrotstep_zy,Zr=x.__wbg_set_orbitbufferinfo_count,Kr=x.__wbg_set_orbitbufferinfo_offset,Jr=x.__wbg_set_orbitbufferinfo_ptr,Qr=x.mandelbrotnavigator_angle,ei=x.mandelbrotnavigator_compute_reference_orbit_chunk,ti=x.mandelbrotnavigator_compute_reference_orbit_ptr,ri=x.mandelbrotnavigator_get_params,ii=x.mandelbrotnavigator_get_reference_orbit_capacity,oi=x.mandelbrotnavigator_get_reference_orbit_len,ai=x.mandelbrotnavigator_new,ni=x.mandelbrotnavigator_origin,si=x.mandelbrotnavigator_pixel_to_complex,li=x.mandelbrotnavigator_rotate,ui=x.mandelbrotnavigator_rotate_direct,ci=x.mandelbrotnavigator_scale,di=x.mandelbrotnavigator_step,fi=x.mandelbrotnavigator_translate,hi=x.mandelbrotnavigator_translate_direct,pi=x.mandelbrotnavigator_zoom,vi=x.__wbindgen_export_0,gi=x.__externref_drop_slice,mi=x.__wbindgen_free,bi=x.__wbindgen_malloc,_i=x.__wbindgen_realloc,kt=x.__wbindgen_start,xi=Object.freeze(Object.defineProperty({__proto__:null,__externref_drop_slice:gi,__wbg_get_mandelbrotstep_dx:Gr,__wbg_get_mandelbrotstep_dy:Ur,__wbg_get_mandelbrotstep_zx:Or,__wbg_get_mandelbrotstep_zy:Ir,__wbg_get_orbitbufferinfo_count:Nr,__wbg_get_orbitbufferinfo_offset:Dr,__wbg_get_orbitbufferinfo_ptr:Vr,__wbg_mandelbrotnavigator_free:qr,__wbg_mandelbrotstep_free:Yr,__wbg_orbitbufferinfo_free:Hr,__wbg_set_mandelbrotstep_dx:$r,__wbg_set_mandelbrotstep_dy:Wr,__wbg_set_mandelbrotstep_zx:jr,__wbg_set_mandelbrotstep_zy:Xr,__wbg_set_orbitbufferinfo_count:Zr,__wbg_set_orbitbufferinfo_offset:Kr,__wbg_set_orbitbufferinfo_ptr:Jr,__wbindgen_export_0:vi,__wbindgen_free:mi,__wbindgen_malloc:bi,__wbindgen_realloc:_i,__wbindgen_start:kt,mandelbrotnavigator_angle:Qr,mandelbrotnavigator_compute_reference_orbit_chunk:ei,mandelbrotnavigator_compute_reference_orbit_ptr:ti,mandelbrotnavigator_get_params:ri,mandelbrotnavigator_get_reference_orbit_capacity:ii,mandelbrotnavigator_get_reference_orbit_len:oi,mandelbrotnavigator_new:ai,mandelbrotnavigator_origin:ni,mandelbrotnavigator_pixel_to_complex:si,mandelbrotnavigator_rotate:li,mandelbrotnavigator_rotate_direct:ui,mandelbrotnavigator_scale:ci,mandelbrotnavigator_step:di,mandelbrotnavigator_translate:fi,mandelbrotnavigator_translate_direct:hi,mandelbrotnavigator_zoom:pi,memory:Tt},Symbol.toStringTag,{value:"Module"}));kr(xi),kt();class yi{constructor(e=1024,r=1024){s(this,"video");s(this,"stream",null);s(this,"width");s(this,"height");s(this,"lastDrawTime",0);this.width=e,this.height=r,this.video=document.createElement("video"),this.video.autoplay=!0,this.video.width=e,this.video.height=r}async openWebcam(){this.stream||(this.stream=await navigator.mediaDevices.getUserMedia({video:{width:this.width,height:this.height}}),this.video.srcObject=this.stream,await this.video.play())}async drawWebGPUTexture(e,r){const i=performance.now();if(i-this.lastDrawTime>15){if(this.video.readyState<HTMLMediaElement.HAVE_CURRENT_DATA)return;r.queue.copyExternalImageToTexture({source:this.video},{texture:e},[this.width,this.height]),this.lastDrawTime=i}}closeWebcam(){this.stream&&(this.stream.getTracks().forEach(e=>e.stop()),this.stream=null)}}function ze(t,e,r){t.prototype=e.prototype=r,r.constructor=t}function Re(t,e){var r=Object.create(t.prototype);for(var i in e)r[i]=e[i];return r}function fe(){}var ve=.7,Me=1/ve,Se="\\s*([+-]?\\d+)\\s*",Ce="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*",J="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*",wi=/^#([0-9a-f]{3,8})$/,zi=new RegExp(`^rgb\\(${Se},${Se},${Se}\\)$`),Mi=new RegExp(`^rgb\\(${J},${J},${J}\\)$`),Si=new RegExp(`^rgba\\(${Se},${Se},${Se},${Ce}\\)$`),Ti=new RegExp(`^rgba\\(${J},${J},${J},${Ce}\\)$`),ki=new RegExp(`^hsl\\(${Ce},${J},${J}\\)$`),Li=new RegExp(`^hsla\\(${Ce},${J},${J},${Ce}\\)$`),Lt={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074};ze(fe,Je,{copy(t){return Object.assign(new this.constructor,this,t)},displayable(){return this.rgb().displayable()},hex:Bt,formatHex:Bt,formatHex8:Bi,formatHsl:Ri,formatRgb:Rt,toString:Rt});function Bt(){return this.rgb().formatHex()}function Bi(){return this.rgb().formatHex8()}function Ri(){return Ft(this).formatHsl()}function Rt(){return this.rgb().formatRgb()}function Je(t){var e,r;return t=(t+"").trim().toLowerCase(),(e=wi.exec(t))?(r=e[1].length,e=parseInt(e[1],16),r===6?Ct(e):r===3?new D(e>>8&15|e>>4&240,e>>4&15|e&240,(e&15)<<4|e&15,1):r===8?Ie(e>>24&255,e>>16&255,e>>8&255,(e&255)/255):r===4?Ie(e>>12&15|e>>8&240,e>>8&15|e>>4&240,e>>4&15|e&240,((e&15)<<4|e&15)/255):null):(e=zi.exec(t))?new D(e[1],e[2],e[3],1):(e=Mi.exec(t))?new D(e[1]*255/100,e[2]*255/100,e[3]*255/100,1):(e=Si.exec(t))?Ie(e[1],e[2],e[3],e[4]):(e=Ti.exec(t))?Ie(e[1]*255/100,e[2]*255/100,e[3]*255/100,e[4]):(e=ki.exec(t))?At(e[1],e[2]/100,e[3]/100,1):(e=Li.exec(t))?At(e[1],e[2]/100,e[3]/100,e[4]):Lt.hasOwnProperty(t)?Ct(Lt[t]):t==="transparent"?new D(NaN,NaN,NaN,0):null}function Ct(t){return new D(t>>16&255,t>>8&255,t&255,1)}function Ie(t,e,r,i){return i<=0&&(t=e=r=NaN),new D(t,e,r,i)}function Qe(t){return t instanceof fe||(t=Je(t)),t?(t=t.rgb(),new D(t.r,t.g,t.b,t.opacity)):new D}function Te(t,e,r,i){return arguments.length===1?Qe(t):new D(t,e,r,i??1)}function D(t,e,r,i){this.r=+t,this.g=+e,this.b=+r,this.opacity=+i}ze(D,Te,Re(fe,{brighter(t){return t=t==null?Me:Math.pow(Me,t),new D(this.r*t,this.g*t,this.b*t,this.opacity)},darker(t){return t=t==null?ve:Math.pow(ve,t),new D(this.r*t,this.g*t,this.b*t,this.opacity)},rgb(){return this},clamp(){return new D(ge(this.r),ge(this.g),ge(this.b),Ne(this.opacity))},displayable(){return-.5<=this.r&&this.r<255.5&&-.5<=this.g&&this.g<255.5&&-.5<=this.b&&this.b<255.5&&0<=this.opacity&&this.opacity<=1},hex:Pt,formatHex:Pt,formatHex8:Ci,formatRgb:Et,toString:Et}));function Pt(){return`#${me(this.r)}${me(this.g)}${me(this.b)}`}function Ci(){return`#${me(this.r)}${me(this.g)}${me(this.b)}${me((isNaN(this.opacity)?1:this.opacity)*255)}`}function Et(){const t=Ne(this.opacity);return`${t===1?"rgb(":"rgba("}${ge(this.r)}, ${ge(this.g)}, ${ge(this.b)}${t===1?")":`, ${t})`}`}function Ne(t){return isNaN(t)?1:Math.max(0,Math.min(1,t))}function ge(t){return Math.max(0,Math.min(255,Math.round(t)||0))}function me(t){return t=ge(t),(t<16?"0":"")+t.toString(16)}function At(t,e,r,i){return i<=0?t=e=r=NaN:r<=0||r>=1?t=e=NaN:e<=0&&(t=NaN),new Z(t,e,r,i)}function Ft(t){if(t instanceof Z)return new Z(t.h,t.s,t.l,t.opacity);if(t instanceof fe||(t=Je(t)),!t)return new Z;if(t instanceof Z)return t;t=t.rgb();var e=t.r/255,r=t.g/255,i=t.b/255,o=Math.min(e,r,i),a=Math.max(e,r,i),l=NaN,u=a-o,d=(a+o)/2;return u?(e===a?l=(r-i)/u+(r<i)*6:r===a?l=(i-e)/u+2:l=(e-r)/u+4,u/=d<.5?a+o:2-a-o,l*=60):u=d>0&&d<1?0:l,new Z(l,u,d,t.opacity)}function et(t,e,r,i){return arguments.length===1?Ft(t):new Z(t,e,r,i??1)}function Z(t,e,r,i){this.h=+t,this.s=+e,this.l=+r,this.opacity=+i}ze(Z,et,Re(fe,{brighter(t){return t=t==null?Me:Math.pow(Me,t),new Z(this.h,this.s,this.l*t,this.opacity)},darker(t){return t=t==null?ve:Math.pow(ve,t),new Z(this.h,this.s,this.l*t,this.opacity)},rgb(){var t=this.h%360+(this.h<0)*360,e=isNaN(t)||isNaN(this.s)?0:this.s,r=this.l,i=r+(r<.5?r:1-r)*e,o=2*r-i;return new D(tt(t>=240?t-240:t+120,o,i),tt(t,o,i),tt(t<120?t+240:t-120,o,i),this.opacity)},clamp(){return new Z(Gt(this.h),De(this.s),De(this.l),Ne(this.opacity))},displayable(){return(0<=this.s&&this.s<=1||isNaN(this.s))&&0<=this.l&&this.l<=1&&0<=this.opacity&&this.opacity<=1},formatHsl(){const t=Ne(this.opacity);return`${t===1?"hsl(":"hsla("}${Gt(this.h)}, ${De(this.s)*100}%, ${De(this.l)*100}%${t===1?")":`, ${t})`}`}}));function Gt(t){return t=(t||0)%360,t<0?t+360:t}function De(t){return Math.max(0,Math.min(1,t||0))}function tt(t,e,r){return(t<60?e+(r-e)*t/60:t<180?r:t<240?e+(r-e)*(240-t)/60:e)*255}const Ut=Math.PI/180,Ot=180/Math.PI,Ve=18,It=.96422,Nt=1,Dt=.82521,Vt=4/29,ke=6/29,qt=3*ke*ke,Pi=ke*ke*ke;function Yt(t){if(t instanceof Q)return new Q(t.l,t.a,t.b,t.opacity);if(t instanceof ae)return Ht(t);t instanceof D||(t=Qe(t));var e=nt(t.r),r=nt(t.g),i=nt(t.b),o=it((.2225045*e+.7168786*r+.0606169*i)/Nt),a,l;return e===r&&r===i?a=l=o:(a=it((.4360747*e+.3850649*r+.1430804*i)/It),l=it((.0139322*e+.0971045*r+.7141733*i)/Dt)),new Q(116*o-16,500*(a-o),200*(o-l),t.opacity)}function rt(t,e,r,i){return arguments.length===1?Yt(t):new Q(t,e,r,i??1)}function Q(t,e,r,i){this.l=+t,this.a=+e,this.b=+r,this.opacity=+i}ze(Q,rt,Re(fe,{brighter(t){return new Q(this.l+Ve*(t??1),this.a,this.b,this.opacity)},darker(t){return new Q(this.l-Ve*(t??1),this.a,this.b,this.opacity)},rgb(){var t=(this.l+16)/116,e=isNaN(this.a)?t:t+this.a/500,r=isNaN(this.b)?t:t-this.b/200;return e=It*ot(e),t=Nt*ot(t),r=Dt*ot(r),new D(at(3.1338561*e-1.6168667*t-.4906146*r),at(-.9787684*e+1.9161415*t+.033454*r),at(.0719453*e-.2289914*t+1.4052427*r),this.opacity)}}));function it(t){return t>Pi?Math.pow(t,1/3):t/qt+Vt}function ot(t){return t>ke?t*t*t:qt*(t-Vt)}function at(t){return 255*(t<=.0031308?12.92*t:1.055*Math.pow(t,1/2.4)-.055)}function nt(t){return(t/=255)<=.04045?t/12.92:Math.pow((t+.055)/1.055,2.4)}function Ei(t){if(t instanceof ae)return new ae(t.h,t.c,t.l,t.opacity);if(t instanceof Q||(t=Yt(t)),t.a===0&&t.b===0)return new ae(NaN,0<t.l&&t.l<100?0:NaN,t.l,t.opacity);var e=Math.atan2(t.b,t.a)*Ot;return new ae(e<0?e+360:e,Math.sqrt(t.a*t.a+t.b*t.b),t.l,t.opacity)}function st(t,e,r,i){return arguments.length===1?Ei(t):new ae(t,e,r,i??1)}function ae(t,e,r,i){this.h=+t,this.c=+e,this.l=+r,this.opacity=+i}function Ht(t){if(isNaN(t.h))return new Q(t.l,0,0,t.opacity);var e=t.h*Ut;return new Q(t.l,Math.cos(e)*t.c,Math.sin(e)*t.c,t.opacity)}ze(ae,st,Re(fe,{brighter(t){return new ae(this.h,this.c,this.l+Ve*(t??1),this.opacity)},darker(t){return new ae(this.h,this.c,this.l-Ve*(t??1),this.opacity)},rgb(){return Ht(this).rgb()}}));var $t=-.14861,lt=1.78277,ut=-.29227,qe=-.90649,Pe=1.97294,Wt=Pe*qe,jt=Pe*lt,Xt=lt*ut-qe*$t;function Ai(t){if(t instanceof be)return new be(t.h,t.s,t.l,t.opacity);t instanceof D||(t=Qe(t));var e=t.r/255,r=t.g/255,i=t.b/255,o=(Xt*i+Wt*e-jt*r)/(Xt+Wt-jt),a=i-o,l=(Pe*(r-o)-ut*a)/qe,u=Math.sqrt(l*l+a*a)/(Pe*o*(1-o)),d=u?Math.atan2(l,a)*Ot-120:NaN;return new be(d<0?d+360:d,u,o,t.opacity)}function ct(t,e,r,i){return arguments.length===1?Ai(t):new be(t,e,r,i??1)}function be(t,e,r,i){this.h=+t,this.s=+e,this.l=+r,this.opacity=+i}ze(be,ct,Re(fe,{brighter(t){return t=t==null?Me:Math.pow(Me,t),new be(this.h,this.s,this.l*t,this.opacity)},darker(t){return t=t==null?ve:Math.pow(ve,t),new be(this.h,this.s,this.l*t,this.opacity)},rgb(){var t=isNaN(this.h)?0:(this.h+120)*Ut,e=+this.l,r=isNaN(this.s)?0:this.s*e*(1-e),i=Math.cos(t),o=Math.sin(t);return new D(255*(e+r*($t*i+lt*o)),255*(e+r*(ut*i+qe*o)),255*(e+r*(Pe*i)),this.opacity)}}));const dt=t=>()=>t;function Zt(t,e){return function(r){return t+r*e}}function Fi(t,e,r){return t=Math.pow(t,r),e=Math.pow(e,r)-t,r=1/r,function(i){return Math.pow(t+i*e,r)}}function ft(t,e){var r=e-t;return r?Zt(t,r>180||r<-180?r-360*Math.round(r/360):r):dt(isNaN(t)?e:t)}function Gi(t){return(t=+t)==1?Y:function(e,r){return r-e?Fi(e,r,t):dt(isNaN(e)?r:e)}}function Y(t,e){var r=e-t;return r?Zt(t,r):dt(isNaN(t)?e:t)}const Ui=(function t(e){var r=Gi(e);function i(o,a){var l=r((o=Te(o)).r,(a=Te(a)).r),u=r(o.g,a.g),d=r(o.b,a.b),m=Y(o.opacity,a.opacity);return function(f){return o.r=l(f),o.g=u(f),o.b=d(f),o.opacity=m(f),o+""}}return i.gamma=t,i})(1);function Oi(t){return function(e,r){var i=t((e=et(e)).h,(r=et(r)).h),o=Y(e.s,r.s),a=Y(e.l,r.l),l=Y(e.opacity,r.opacity);return function(u){return e.h=i(u),e.s=o(u),e.l=a(u),e.opacity=l(u),e+""}}}const Ii=Oi(ft);function Kt(t,e){var r=Y((t=rt(t)).l,(e=rt(e)).l),i=Y(t.a,e.a),o=Y(t.b,e.b),a=Y(t.opacity,e.opacity);return function(l){return t.l=r(l),t.a=i(l),t.b=o(l),t.opacity=a(l),t+""}}function Ni(t){return function(e,r){var i=t((e=st(e)).h,(r=st(r)).h),o=Y(e.c,r.c),a=Y(e.l,r.l),l=Y(e.opacity,r.opacity);return function(u){return e.h=i(u),e.c=o(u),e.l=a(u),e.opacity=l(u),e+""}}}const Di=Ni(ft);function Jt(t){return(function e(r){r=+r;function i(o,a){var l=t((o=ct(o)).h,(a=ct(a)).h),u=Y(o.s,a.s),d=Y(o.l,a.l),m=Y(o.opacity,a.opacity);return function(f){return o.h=l(f),o.s=u(f),o.l=d(Math.pow(f,r)),o.opacity=m(f),o+""}}return i.gamma=e,i})(1)}const Vi=Jt(ft);Jt(Y);const ht={palette:1,zebra:0,tessellation:0,shading:0,skybox:0,webcam:0,smoothness:1,shadingLevel:1.5,specularPower:20,lightAngle:.75};function Ye(t,e){return t[e]??ht[e]}const qi={lab:Kt,rgb:Ui,hcl:Di,hsl:Ii,cubehelix:Vi},Qt=4096,Yi=4;function Hi(t,e,r,i){const o=Ye(t,r),a=Ye(e,r);return o+(a-o)*i}class er{constructor(e,r="lab"){s(this,"points");s(this,"interpolate");this.points=e.slice().sort((i,o)=>i.position-o.position),this.interpolate=qi[r]??Kt}getColorAt(e){if(this.points.length===0)return"#000";if(e<=this.points[0].position)return this.points[0].color;if(e>=this.points[this.points.length-1].position)return this.points[this.points.length-1].color;for(let r=0;r<this.points.length-1;++r){const i=this.points[r],o=this.points[r+1];if(e>=i.position&&e<=o.position){const a=(e-i.position)/(o.position-i.position),l=this.interpolate(i.color,o.color);return Te(l(a)).formatHex()}}return"#000"}getEffectAt(e,r){if(this.points.length===0)return ht[r];if(e<=this.points[0].position)return Ye(this.points[0],r);if(e>=this.points[this.points.length-1].position)return Ye(this.points[this.points.length-1],r);for(let i=0;i<this.points.length-1;++i){const o=this.points[i],a=this.points[i+1];if(e>=o.position&&e<=a.position){const l=(e-o.position)/(a.position-o.position);return Hi(o,a,r,l)}}return ht[r]}generateTexture(){const e=Qt,r=Yi,i=new Float32Array(e*r*4);for(let o=0;o<e;++o){const a=o/(e-1),l=Te(this.getColorAt(a)),u=(0*e+o)*4;i[u]=(l.r??0)/255,i[u+1]=(l.g??0)/255,i[u+2]=(l.b??0)/255,i[u+3]=this.getEffectAt(a,"palette");const d=(1*e+o)*4;i[d]=this.getEffectAt(a,"zebra"),i[d+1]=this.getEffectAt(a,"tessellation"),i[d+2]=this.getEffectAt(a,"shading"),i[d+3]=this.getEffectAt(a,"skybox");const m=(2*e+o)*4;i[m]=this.getEffectAt(a,"webcam"),i[m+1]=this.getEffectAt(a,"smoothness"),i[m+2]=this.getEffectAt(a,"shadingLevel"),i[m+3]=this.getEffectAt(a,"specularPower");const f=(3*e+o)*4;i[f]=this.getEffectAt(a,"lightAngle"),i[f+1]=0,i[f+2]=0,i[f+3]=0}return{data:i,width:e,height:r}}generateThumbnailRow(){const e=Qt,r=new ImageData(e,1),i=r.data;for(let o=0;o<e;++o){const a=o/(e-1),l=Te(this.getColorAt(a)),u=o*4;i[u]=Math.max(0,Math.min(255,Math.round(l.r??0))),i[u+1]=Math.max(0,Math.min(255,Math.round(l.g??0))),i[u+2]=Math.max(0,Math.min(255,Math.round(l.b??0))),i[u+3]=255}return r}}const He=7,$i=4096,Wi=2,$e=100,ji=1e4,Xi=5e6,pt=10,tr=.25,Zi=100;function Ki(t){const e=Math.max(1,Math.floor(t));return 2**Math.floor(Math.log2(e))}const rr=new Float32Array(1),Ji=new Uint32Array(rr.buffer);function Qi(t){rr[0]=t;const e=Ji[0],r=e>>>16&32768,i=(e>>>23&255)-127,o=e&8388607;if(i>=16)return r|31744;if(i>=-14){const a=i+15;return r|a<<10|o>>>13}if(i>=-24){const a=-14-i;return r|(o|8388608)>>>13+a}return r}function ir(t){const e=new Uint16Array(t.length);for(let r=0;r<t.length;++r)e[r]=Qi(t[r]);return e}const H=class H{constructor(e,r){s(this,"snapshotCallback");s(this,"snapshotDestWidth");s(this,"canvas");s(this,"device");s(this,"queue");s(this,"adapter");s(this,"ctx");s(this,"format");s(this,"mandelbrotNavigator");s(this,"rawTexture");s(this,"rawArrayView");s(this,"rawLayerViews",[]);s(this,"rawBrushTexture");s(this,"rawBrushArrayView");s(this,"rawBrushLayerViews",[]);s(this,"resolvedTexture");s(this,"resolvedArrayView");s(this,"resolvedLayerViews",[]);s(this,"frozenTexture");s(this,"frozenArrayView");s(this,"frozenLayerViews",[]);s(this,"pipelineMerge");s(this,"bindGroupMerge");s(this,"uniformBufferMerge");s(this,"uniformBufferMandelbrot");s(this,"uniformBufferColor");s(this,"uniformBufferBrush");s(this,"uniformBufferResolve");s(this,"mandelbrotReferenceBuffer");s(this,"pipelineBrush");s(this,"bindGroupBrush");s(this,"pipelineMandelbrot");s(this,"bindGroupMandelbrot");s(this,"pipelineResolve");s(this,"bindGroupResolve");s(this,"pipelineColor");s(this,"bindGroupColor");s(this,"pipelineCount");s(this,"counterBuffer");s(this,"counterReadBuffer");s(this,"counterBindGroup");s(this,"uniformBufferCount");s(this,"unfinishedPixelCount",-1);s(this,"activePixelCount",-1);s(this,"_rafId",null);s(this,"_drawFn",null);s(this,"fps",0);s(this,"isRendering",!1);s(this,"gpuFrameTimeMs",0);s(this,"smoothedGpuTimeMs",0);s(this,"refinementWasGated",!1);s(this,"_fpsFrameCount",0);s(this,"_fpsLastTime",0);s(this,"neutralSize",0);s(this,"shaderPassCompute");s(this,"shaderPassColor");s(this,"width",0);s(this,"height",0);s(this,"antialiasLevel");s(this,"palettePeriod");s(this,"previousMandelbrot");s(this,"previousRenderOptions");s(this,"needRender",!0);s(this,"orbitIncomplete",!1);s(this,"prevGuardedMaxIter",0);s(this,"currentGuardedMaxIter",0);s(this,"currentMaxIterations",0);s(this,"mandelbrotReference",new Float32Array(1e6));s(this,"prevFrameMandelbrot");s(this,"clearHistoryNextFrame",!1);s(this,"cumulativeShiftX",0);s(this,"cumulativeShiftY",0);s(this,"zoomMagnificationThreshold",16);s(this,"zoomFactor",1);s(this,"frozenScale",0);s(this,"liveScale",0);s(this,"liveZoomFactor",1);s(this,"zoomReprojectionActive",!1);s(this,"needFreezeSnapshot",!1);s(this,"needMergeSnapshot",!1);s(this,"mergeUniforms",{zf:1,lzf:1,frozenShiftU:0,frozenShiftV:0,aspect:1,angle:0});s(this,"frozenAligned",!1);s(this,"zoomingIn",!0);s(this,"iterationBatchSize",$e);s(this,"tileTexture");s(this,"tileTextureView");s(this,"skyboxTexture");s(this,"skyboxTextureView");s(this,"paletteTexture");s(this,"paletteTextureView");s(this,"paletteSampler");s(this,"webcamTexture");s(this,"webcamTileTexture");s(this,"webcamTextureView");s(this,"webcamEnabled",!0);s(this,"time",0);s(this,"lastUpdateTime",0);s(this,"dprMultiplier",1);s(this,"targetFps",60);s(this,"gpuLoadMultiplier",1);this.canvas=e,this.shaderPassCompute=pe,this.shaderPassColor=oe,this.antialiasLevel=r.antialiasLevel,this.palettePeriod=r.palettePeriod,this.time=0}async initialize(e){if(this.mandelbrotNavigator=e,!navigator.gpu)throw new Error("WebGPU non support\xE9");if(this.adapter=await navigator.gpu.requestAdapter(),!this.adapter)throw new Error("Adapter WebGPU introuvable");this.device=await this.adapter.requestDevice(),this.device.label="Engine Device",this.queue=this.device.queue,this.queue.label="Engine Queue",this.ctx=this.canvas.getContext("webgpu"),this.format=navigator.gpu.getPreferredCanvasFormat(),this.ctx.configure({device:this.device,format:this.format,alphaMode:"opaque"});const[r,i]=await Promise.all([H._tileTexture?Promise.resolve(H._tileTexture):this._loadTexture(ao),H._skyboxTexture?Promise.resolve(H._skyboxTexture):this._loadTexture(no)]);H._tileTexture=r,this.tileTexture=r,this.tileTextureView=this.tileTexture.createView(),H._skyboxTexture=i,this.skyboxTexture=i,this.skyboxTextureView=this.skyboxTexture.createView();const o=new er([]).generateTexture(),a=ir(o.data);this.paletteTexture=this.device.createTexture({size:[o.width,o.height,1],format:"rgba16float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine PaletteTexture"}),this.device.queue.writeTexture({texture:this.paletteTexture},a.buffer,{bytesPerRow:o.width*8},[o.width,o.height]),this.paletteTextureView=this.paletteTexture.createView(),this.paletteSampler=this.device.createSampler({magFilter:"linear",minFilter:"linear",addressModeU:"repeat",addressModeV:"clamp-to-edge"}),this.webcamTexture=new yi(1920,1080),this.webcamTileTexture=this.device.createTexture({size:[1920,1080,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT}),this.webcamTextureView=this.webcamTileTexture.createView(),this.uniformBufferMandelbrot=this.device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Mandelbrot"}),this.uniformBufferColor=this.device.createBuffer({size:80,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Color"}),this.uniformBufferBrush=this.device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Brush"}),this.uniformBufferResolve=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Resolve"}),this.mandelbrotReferenceBuffer=this.device.createBuffer({size:4*1e6,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot Orbit ReferenceStorage Buffer"}),this.counterBuffer=this.device.createBuffer({size:8,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST,label:"Engine Counter Storage"}),this.counterReadBuffer=this.device.createBuffer({size:8,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,label:"Engine Counter Readback"}),this.uniformBufferCount=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Count"}),this.uniformBufferMerge=this.device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Merge"}),await this._createPipelines(),this.resize()}async _createPipelines(){const e=this.device.createShaderModule({code:_e,label:"Engine ShaderModule Brush"}),r=this.device.createShaderModule({code:this.shaderPassCompute,label:"Engine ShaderModule Compute"}),i=this.device.createShaderModule({code:zr,label:"Engine ShaderModule Resolve"}),o=this.device.createShaderModule({code:this.shaderPassColor,label:"Engine ShaderModule Color"}),a=this.device.createShaderModule({code:Mr,label:"Engine ShaderModule Count"}),l=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Brush"}),u=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Mandelbrot"}),d=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Resolve"}),m=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:3,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:4,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:5,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:6,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:7,visibility:GPUShaderStage.FRAGMENT,sampler:{type:"filtering"}}],label:"Engine BindGroupLayout Color"}),f=Array.from({length:He},()=>({format:"r32float"}));this.pipelineBrush=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[l]}),vertex:{module:e,entryPoint:"vs_main"},fragment:{module:e,entryPoint:"fs_main",targets:f},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Brush"}),this.pipelineMandelbrot=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[u]}),vertex:{module:r,entryPoint:"vs_main"},fragment:{module:r,entryPoint:"fs_main",targets:f},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Mandelbrot"}),this.pipelineResolve=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[d]}),vertex:{module:i,entryPoint:"vs_main"},fragment:{module:i,entryPoint:"fs_main",targets:f},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Resolve"}),this.pipelineColor=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[m]}),vertex:{module:o,entryPoint:"vs_main"},fragment:{module:o,entryPoint:"fs_main",targets:[{format:this.format}]},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Color"});const v=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}],label:"Engine BindGroupLayout Count"});this.pipelineCount=this.device.createComputePipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[v]}),compute:{module:a,entryPoint:"count_unfinished"},label:"Engine ComputePipeline Count"});const L=this.device.createShaderModule({code:Sr,label:"Engine ShaderModule Merge"}),w=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT|GPUShaderStage.VERTEX,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Merge"});this.pipelineMerge=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[w]}),vertex:{module:L,entryPoint:"vs_main"},fragment:{module:L,entryPoint:"fs_main",targets:f},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Merge"}),this.bindGroupBrush=void 0,this.bindGroupMandelbrot=void 0,this.bindGroupResolve=void 0,this.bindGroupColor=void 0,this.counterBindGroup=void 0,this.bindGroupMerge=void 0}resize(){var w,b,n,h,S,P,R,E,y,A;const e=(window.devicePixelRatio||1)*this.dprMultiplier,r=this.canvas.parentElement,i=(r==null?void 0:r.clientWidth)||1,o=(r==null?void 0:r.clientHeight)||1;this.width=Math.max(1,Math.round(i*e)),this.height=Math.max(1,Math.round(o*e));const a=((b=(w=this.device)==null?void 0:w.limits)==null?void 0:b.maxTextureDimension2D)??8192;this.width=Math.min(this.width,a),this.height=Math.min(this.height,a),this.canvas.width=this.width,this.canvas.height=this.height,this.canvas.style.width=i+"px",this.canvas.style.height=o+"px",this.ctx.configure({device:this.device,format:this.format,alphaMode:"opaque"}),this.neutralSize=Math.ceil(Math.sqrt(this.width*this.width+this.height*this.height));const l=this.neutralSize;(h=(n=this.rawTexture)==null?void 0:n.destroy)==null||h.call(n),(P=(S=this.rawBrushTexture)==null?void 0:S.destroy)==null||P.call(S),(E=(R=this.resolvedTexture)==null?void 0:R.destroy)==null||E.call(R),(A=(y=this.frozenTexture)==null?void 0:y.destroy)==null||A.call(y);const u=He,d=C=>{const T=this.device.createTexture({size:{width:l,height:l,depthOrArrayLayers:u},format:"r32float",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST,label:C}),z=T.createView({dimension:"2d-array",baseArrayLayer:0,arrayLayerCount:u,label:C+" ArrayView"}),N=[];for(let F=0;F<u;F++)N.push(T.createView({dimension:"2d",baseArrayLayer:F,arrayLayerCount:1,label:C+` Layer${F}`}));return{texture:T,arrayView:z,layerViews:N}},m=d("Engine RawTexture (A)");this.rawTexture=m.texture,this.rawArrayView=m.arrayView,this.rawLayerViews=m.layerViews;const f=d("Engine RawBrushTexture (B)");this.rawBrushTexture=f.texture,this.rawBrushArrayView=f.arrayView,this.rawBrushLayerViews=f.layerViews;const v=d("Engine ResolvedTexture");this.resolvedTexture=v.texture,this.resolvedArrayView=v.arrayView,this.resolvedLayerViews=v.layerViews;const L=d("Engine FrozenTexture");if(this.frozenTexture=L.texture,this.frozenArrayView=L.arrayView,this.frozenLayerViews=L.layerViews,this.zoomReprojectionActive=!1,this.zoomFactor=1,this.liveZoomFactor=1,this.frozenScale=0,this.liveScale=0,this.pipelineBrush){const C=this.pipelineBrush.getBindGroupLayout(0);this.bindGroupBrush=this.device.createBindGroup({layout:C,entries:[{binding:0,resource:{buffer:this.uniformBufferBrush}},{binding:1,resource:this.rawArrayView}],label:"Engine BindGroup Brush"})}if(this.pipelineMandelbrot){const C=this.pipelineMandelbrot.getBindGroupLayout(0);this.bindGroupMandelbrot=this.device.createBindGroup({layout:C,entries:[{binding:0,resource:{buffer:this.uniformBufferMandelbrot}},{binding:1,resource:{buffer:this.mandelbrotReferenceBuffer}},{binding:2,resource:this.rawBrushArrayView}],label:"Engine BindGroup Mandelbrot"})}if(this.pipelineResolve){const C=this.pipelineResolve.getBindGroupLayout(0);this.bindGroupResolve=this.device.createBindGroup({layout:C,entries:[{binding:0,resource:{buffer:this.uniformBufferResolve}},{binding:1,resource:this.rawArrayView}],label:"Engine BindGroup Resolve"})}if(this.pipelineColor){const C=this.pipelineColor.getBindGroupLayout(0),T=[{binding:0,resource:{buffer:this.uniformBufferColor}},{binding:1,resource:this.resolvedArrayView},{binding:2,resource:this.tileTextureView},{binding:3,resource:this.skyboxTextureView},{binding:4,resource:this.webcamTextureView},{binding:5,resource:this.paletteTextureView},{binding:6,resource:this.frozenArrayView},{binding:7,resource:this.paletteSampler}];this.bindGroupColor=this.device.createBindGroup({layout:C,entries:T,label:"Engine BindGroup Color"})}if(this.pipelineCount&&this.counterBuffer&&this.uniformBufferCount){const C=this.pipelineCount.getBindGroupLayout(0);this.counterBindGroup=this.device.createBindGroup({layout:C,entries:[{binding:0,resource:this.rawArrayView},{binding:1,resource:{buffer:this.counterBuffer}},{binding:2,resource:{buffer:this.uniformBufferCount}}],label:"Engine BindGroup Count"})}if(this.pipelineMerge&&this.uniformBufferMerge){const C=this.pipelineMerge.getBindGroupLayout(0);this.bindGroupMerge=this.device.createBindGroup({layout:C,entries:[{binding:0,resource:{buffer:this.uniformBufferMerge}},{binding:1,resource:this.resolvedArrayView},{binding:2,resource:this.rawBrushArrayView}],label:"Engine BindGroup Merge"})}this.prevFrameMandelbrot=void 0,this.previousMandelbrot=void 0,this.previousRenderOptions=void 0,this.needRender=!0,this.unfinishedPixelCount=-1,this.activePixelCount=-1}areObjectsEqual(e,r){return e===void 0||r===void 0?!1:JSON.stringify(e)===JSON.stringify(r)}areColorStopsEqual(e,r){if(e.length!==r.length)return!1;for(const[i,o]of e.entries()){const a=r[i];if(!a||JSON.stringify(o)!==JSON.stringify(a))return!1}return!0}async update(e,r){var S,P,R,E;const i=performance.now();this.lastUpdateTime===0&&(this.lastUpdateTime=i);const o=(i-this.lastUpdateTime)/1e3;this.time+=o,this.lastUpdateTime=i,this.needRender=this.needRender||!(this.areObjectsEqual(e,this.previousMandelbrot)&&this.areObjectsEqual(r,this.previousRenderOptions)),this.needRender&&(this.unfinishedPixelCount=-1),r.colorStops.some(y=>(y.webcam??0)>0)?(await this.updateWebcamTexture(),this.needRender=!0):(S=this.webcamTexture)==null||S.closeWebcam(),r.activateAnimate&&(this.needRender=!0);const a=this.width/Math.max(1,this.height);let l=((P=this.previousMandelbrot)==null?void 0:P.scale)||1/e.scale;l<1&&(l=1/l),l=Math.sqrt(l)-1;{const y=this.prevFrameMandelbrot&&this.prevFrameMandelbrot.scale!==e.scale;if(y&&!this.zoomReprojectionActive&&(this.zoomReprojectionActive=!0,this.frozenScale=this.prevFrameMandelbrot.scale,this.zoomingIn=e.scale<this.frozenScale,this.liveScale=this.zoomingIn?this.frozenScale/this.zoomMagnificationThreshold:this.frozenScale*this.zoomMagnificationThreshold,this.needFreezeSnapshot=!0,this.clearHistoryNextFrame=!0),this.zoomReprojectionActive&&this.frozenScale>0?(this.zoomFactor=this.frozenScale/e.scale,this.liveZoomFactor=this.liveScale/e.scale,(this.zoomingIn?this.zoomFactor>=this.zoomMagnificationThreshold:this.zoomFactor<=1/this.zoomMagnificationThreshold)&&(this.needFreezeSnapshot=!0,this.clearHistoryNextFrame=!0,this.frozenScale=this.liveScale,this.liveScale=this.zoomingIn?e.scale/this.zoomMagnificationThreshold:e.scale*this.zoomMagnificationThreshold,this.zoomFactor=this.frozenScale/e.scale,this.liveZoomFactor=this.liveScale/e.scale)):this.zoomReprojectionActive||(this.zoomFactor=1,this.liveZoomFactor=1,this.liveScale=0),this.zoomReprojectionActive&&!y&&this.prevFrameMandelbrot&&this.prevFrameMandelbrot.scale===e.scale){const A=this.width/Math.max(1,this.height);this.mergeUniforms={zf:this.zoomFactor,lzf:this.liveZoomFactor,frozenShiftU:this.frozenScale>0?this.cumulativeShiftX*(this.liveScale/this.frozenScale)/this.neutralSize:0,frozenShiftV:this.frozenScale>0?-this.cumulativeShiftY*(this.liveScale/this.frozenScale)/this.neutralSize:0,aspect:A,angle:e.angle},this.needMergeSnapshot=!0,this.zoomReprojectionActive=!1,this.zoomFactor=1,this.liveZoomFactor=1,this.liveScale=0,this.clearHistoryNextFrame=!0}}if(!this.areColorStopsEqual(r.colorStops,((R=this.previousRenderOptions)==null?void 0:R.colorStops)||[])||r.interpolationMode!==((E=this.previousRenderOptions)==null?void 0:E.interpolationMode)){const y=new er(r.colorStops,r.interpolationMode).generateTexture(),A=ir(y.data);this.device.queue.writeTexture({texture:this.paletteTexture},A.buffer,{bytesPerRow:y.width*8},[y.width,y.height]),this.needRender=!0}const u=new Float32Array([r.palettePeriod,r.paletteOffset,l,this.time,a,e.angle,r.activateAnimate?1:0,e.mu,this.zoomFactor,this.zoomReprojectionActive||this.frozenAligned?1:0,this.liveZoomFactor,this.zoomReprojectionActive&&this.frozenScale>0?this.cumulativeShiftX*(this.liveScale/this.frozenScale)/this.neutralSize:0,this.zoomReprojectionActive&&this.frozenScale>0?-this.cumulativeShiftY*(this.liveScale/this.frozenScale)/this.neutralSize:0,r.tessellationLevel,r.displacementAmount,r.animationSpeed,e.epsilon]);if(this.device.queue.writeBuffer(this.uniformBufferColor,0,u.buffer),!this.needsMoreFrames())return;const d=Math.ceil(e.maxIterations);this.currentMaxIterations=d;const m=this.mandelbrotNavigator.compute_reference_orbit_chunk(Zi,d),f=m.count,v=new Float32Array(Tt.buffer,m.ptr,m.count*4);m.offset<d&&this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer,0,v,0);const L=Math.min(d,f);this.currentGuardedMaxIter=L,this.orbitIncomplete=f<d;const w=f>=d,b=this.zoomReprojectionActive&&this.liveScale>0?this.liveScale:e.scale,n=new Float32Array([e.dx,e.dy,e.mu,b,a,e.angle,this.iterationBatchSize,e.epsilon,r.antialiasLevel,0,L,w?1:0]);this.device.queue.writeBuffer(this.uniformBufferMandelbrot,0,n.buffer);const h=m.offset===0&&!!this.prevFrameMandelbrot;(!this.prevFrameMandelbrot||h)&&(this.clearHistoryNextFrame=!0,this.zoomReprojectionActive=!1,this.zoomFactor=1,this.liveZoomFactor=1,this.liveScale=0),this.prevFrameMandelbrot&&this.prevFrameMandelbrot.mu!==e.mu&&(this.clearHistoryNextFrame=!0,this.zoomReprojectionActive=!1,this.zoomFactor=1,this.liveZoomFactor=1,this.liveScale=0),!this.zoomReprojectionActive&&w&&this.prevGuardedMaxIter<d&&this.prevGuardedMaxIter>0&&(this.needFreezeSnapshot=!0,this.clearHistoryNextFrame=!0),this.prevGuardedMaxIter=L,this.previousMandelbrot=structuredClone(e),this.previousRenderOptions=structuredClone(r)}async render(){if(!this.needsMoreFrames()||!this.pipelineBrush||!this.pipelineMandelbrot||!this.pipelineResolve||!this.pipelineColor||!this.bindGroupBrush||!this.bindGroupMandelbrot||!this.bindGroupResolve||!this.bindGroupColor||!this.previousMandelbrot)return;const e=this.width/Math.max(1,this.height),r=Ki($i),i=r,o=this.clearHistoryNextFrame?1:0;let a=0,l=0;if(!this.clearHistoryNextFrame&&this.prevFrameMandelbrot){const T=this.previousMandelbrot.dx-this.prevFrameMandelbrot.dx,z=this.previousMandelbrot.dy-this.prevFrameMandelbrot.dy,N=this.neutralSize,F=Math.sqrt(e*e+1),I=this.zoomReprojectionActive&&this.liveScale>0?this.liveScale:this.previousMandelbrot.scale;a=-(T*N)/(2*I*F),l=z*N/(2*I*F)}this.clearHistoryNextFrame?(this.cumulativeShiftX=0,this.cumulativeShiftY=0):(this.cumulativeShiftX+=Math.round(a),this.cumulativeShiftY+=Math.round(l),(Math.round(a)!==0||Math.round(l)!==0)&&(this.frozenAligned=!1));const u=(this.cumulativeShiftX%i+i)%i,d=(this.cumulativeShiftY%i+i)%i,m=this.clearHistoryNextFrame||this.activePixelCount<0||this.iterationBatchSize>$e||this.activePixelCount<Xi*this.gpuLoadMultiplier;m&&this.refinementWasGated&&(this.iterationBatchSize=$e),this.refinementWasGated=!m;const f=m?1:0,v=new Float32Array([e,this.previousMandelbrot.angle,o,r,i,a,l,this.previousMandelbrot.mu,u,d,this.zoomReprojectionActive?Wi:0,f]);this.device.queue.writeBuffer(this.uniformBufferBrush,0,v.buffer);const L=new Float32Array([this.previousMandelbrot.mu,u,d]);this.device.queue.writeBuffer(this.uniformBufferResolve,0,L.buffer);const w=this.device.createCommandEncoder();if(this.needMergeSnapshot&&this.pipelineMerge&&this.bindGroupMerge&&this.resolvedTexture&&this.frozenTexture&&this.rawBrushTexture){const T=this.neutralSize;w.copyTextureToTexture({texture:this.frozenTexture},{texture:this.rawBrushTexture},{width:T,height:T,depthOrArrayLayers:He});const z=new Float32Array([this.mergeUniforms.zf,this.mergeUniforms.lzf,this.mergeUniforms.frozenShiftU,this.mergeUniforms.frozenShiftV,this.mergeUniforms.aspect,this.mergeUniforms.angle]);this.device.queue.writeBuffer(this.uniformBufferMerge,0,z.buffer);const N=this.frozenLayerViews.map(I=>({view:I,clearValue:{r:0,g:0,b:0,a:0},loadOp:"clear",storeOp:"store"})),F=w.beginRenderPass({colorAttachments:N});F.setPipeline(this.pipelineMerge),F.setBindGroup(0,this.bindGroupMerge),F.draw(6,1,0,0),F.end(),this.needMergeSnapshot=!1,this.frozenAligned=!0}if(this.needFreezeSnapshot&&this.resolvedTexture&&this.frozenTexture){const T=He,z=this.neutralSize;w.copyTextureToTexture({texture:this.resolvedTexture},{texture:this.frozenTexture},{width:z,height:z,depthOrArrayLayers:T}),this.needFreezeSnapshot=!1,this.frozenAligned=!0}const b=T=>T.map(z=>({view:z,clearValue:{r:0,g:0,b:0,a:0},loadOp:"clear",storeOp:"store"})),n=w.beginRenderPass({colorAttachments:b(this.rawBrushLayerViews)});n.setPipeline(this.pipelineBrush),n.setBindGroup(0,this.bindGroupBrush),n.draw(6,1,0,0),n.end();const h=w.beginRenderPass({colorAttachments:b(this.rawLayerViews)});if(h.setPipeline(this.pipelineMandelbrot),h.setBindGroup(0,this.bindGroupMandelbrot),h.draw(6,1,0,0),h.end(),this.pipelineCount&&this.counterBindGroup&&this.counterBuffer&&this.counterReadBuffer&&this.uniformBufferCount){const T=this.previousMandelbrot.mu;this.device.queue.writeBuffer(this.uniformBufferCount,0,new Float32Array([T,e,this.previousMandelbrot.angle])),w.clearBuffer(this.counterBuffer,0,8);const z=w.beginComputePass();z.setPipeline(this.pipelineCount),z.setBindGroup(0,this.counterBindGroup),z.dispatchWorkgroups(Math.ceil(this.neutralSize/16),Math.ceil(this.neutralSize/16)),z.end(),w.copyBufferToBuffer(this.counterBuffer,0,this.counterReadBuffer,0,8)}const S=w.beginRenderPass({colorAttachments:b(this.resolvedLayerViews)});S.setPipeline(this.pipelineResolve),S.setBindGroup(0,this.bindGroupResolve),S.draw(6,1,0,0),S.end();const P=this.ctx.getCurrentTexture().createView(),R=w.beginRenderPass({colorAttachments:[{view:P,clearValue:{r:1,g:1,b:1,a:1},loadOp:"clear",storeOp:"store"}]});R.setPipeline(this.pipelineColor),R.setBindGroup(0,this.bindGroupColor),R.draw(6,1,0,0),R.end();const E=performance.now();this.device.queue.submit([w.finish()]),await this.device.queue.onSubmittedWorkDone();const y=performance.now()-E;if(this.gpuFrameTimeMs=y,this.smoothedGpuTimeMs===0?this.smoothedGpuTimeMs=y:this.smoothedGpuTimeMs=this.smoothedGpuTimeMs*(1-tr)+y*tr,y>0){const T=1e3/this.targetFps/y,z=this.iterationBatchSize*T;this.iterationBatchSize=Math.round(Math.min(ji,Math.max($e,this.iterationBatchSize*.7+z*.3)))}await this.counterReadBuffer.mapAsync(GPUMapMode.READ);const A=new Uint32Array(this.counterReadBuffer.getMappedRange()),C=this.unfinishedPixelCount;if(this.unfinishedPixelCount=A[0],this.activePixelCount=A[1],this.counterReadBuffer.unmap(),C>pt&&this.unfinishedPixelCount<=pt&&!this.zoomReprojectionActive&&(this.needFreezeSnapshot=!0),this.clearHistoryNextFrame=!1,this.prevFrameMandelbrot={...this.previousMandelbrot},this.needRender=!1,this.snapshotCallback){try{const T=this.snapshotDestWidth??256,z=Math.round(T*9/16),N=this.device.createTexture({size:[T,z,1],format:this.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});{const q=this.device.createCommandEncoder(),j=q.beginRenderPass({colorAttachments:[{view:N.createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}]});j.setPipeline(this.pipelineColor),j.setBindGroup(0,this.bindGroupColor),j.draw(6,1,0,0),j.end(),this.device.queue.submit([q.finish()])}const F=q=>q+255&-256,I=T*4,K=F(I),$=K*z,O=this.device.createBuffer({size:$,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});{const q=this.device.createCommandEncoder();q.copyTextureToBuffer({texture:N},{buffer:O,offset:0,bytesPerRow:K},{width:T,height:z,depthOrArrayLayers:1}),this.device.queue.submit([q.finish()])}await this.device.queue.onSubmittedWorkDone(),await O.mapAsync(GPUMapMode.READ);const ee=O.getMappedRange(),W=new Uint8ClampedArray(T*z*4),te=new Uint8Array(ee);for(let q=0;q<z;++q)for(let j=0;j<T;++j){const se=q*K+j*4,re=(q*T+j)*4;W[re+0]=te[se+2],W[re+1]=te[se+1],W[re+2]=te[se+0],W[re+3]=te[se+3]}const ne=document.createElement("canvas");ne.width=T,ne.height=z,ne.getContext("2d").putImageData(new ImageData(W,T,z),0,0),O.unmap(),this.snapshotCallback(ne.toDataURL("image/png"))}catch{this.snapshotCallback("")}this.snapshotCallback=void 0,this.snapshotDestWidth=void 0}}destroy(){var e,r,i,o,a,l,u,d,m,f,v,L,w,b,n,h,S,P,R,E,y,A,C,T,z,N,F,I,K,$,O;this.stopRenderLoop(),(r=(e=this.rawTexture)==null?void 0:e.destroy)==null||r.call(e),(o=(i=this.rawBrushTexture)==null?void 0:i.destroy)==null||o.call(i),(l=(a=this.resolvedTexture)==null?void 0:a.destroy)==null||l.call(a),(d=(u=this.frozenTexture)==null?void 0:u.destroy)==null||d.call(u),(f=(m=this.mandelbrotReferenceBuffer)==null?void 0:m.destroy)==null||f.call(m),(L=(v=this.uniformBufferMandelbrot)==null?void 0:v.destroy)==null||L.call(v),(b=(w=this.uniformBufferColor)==null?void 0:w.destroy)==null||b.call(w),(h=(n=this.uniformBufferBrush)==null?void 0:n.destroy)==null||h.call(n),(P=(S=this.uniformBufferResolve)==null?void 0:S.destroy)==null||P.call(S),(E=(R=this.counterBuffer)==null?void 0:R.destroy)==null||E.call(R),(A=(y=this.counterReadBuffer)==null?void 0:y.destroy)==null||A.call(y),(T=(C=this.uniformBufferCount)==null?void 0:C.destroy)==null||T.call(C),(N=(z=this.uniformBufferMerge)==null?void 0:z.destroy)==null||N.call(z),(F=this.webcamTexture)==null||F.closeWebcam(),(K=(I=this.webcamTileTexture)==null?void 0:I.destroy)==null||K.call(I),(O=($=this.paletteTexture)==null?void 0:$.destroy)==null||O.call($)}needsMoreFrames(){let e="";return this.needRender?e="needRender":this.snapshotCallback?e="snapshot":this.zoomReprojectionActive?e="zoomActive":this.clearHistoryNextFrame?e="clearHistory":this.needFreezeSnapshot?e="freezeSnapshot":this.needMergeSnapshot?e="mergeSnapshot":this.orbitIncomplete?e="orbitIncomplete":(this.unfinishedPixelCount<0||this.unfinishedPixelCount>pt)&&(e=`unfinished=${this.unfinishedPixelCount}`),e!==""}getIterationBatchSize(){return this.iterationBatchSize}startRenderLoop(e){this._drawFn=e,this._rafId===null&&(this._rafId=requestAnimationFrame(async()=>this._loop()))}stopRenderLoop(){this._rafId!==null&&(cancelAnimationFrame(this._rafId),this._rafId=null),this._drawFn=null}async _loop(){if(this._drawFn){const e=this.needsMoreFrames();this.isRendering=e,await this._drawFn(),e&&this._fpsFrameCount++;const r=performance.now();this._fpsLastTime===0&&(this._fpsLastTime=r);const i=r-this._fpsLastTime;i>=1e3&&(this.fps=Math.round(this._fpsFrameCount*1e3/i),this._fpsFrameCount=0,this._fpsLastTime=r),this._rafId=requestAnimationFrame(async()=>this._loop())}else{this._rafId=null;return}}async updateTileTexture(e){var i,o;const r=await this._loadTexture(e);if((o=(i=this.tileTexture)==null?void 0:i.destroy)==null||o.call(i),this.tileTexture=r,this.tileTextureView=this.tileTexture.createView(),this.pipelineColor&&this.resolvedArrayView&&this.frozenArrayView){const a=this.pipelineColor.getBindGroupLayout(0);this.bindGroupColor=this.device.createBindGroup({layout:a,entries:[{binding:0,resource:{buffer:this.uniformBufferColor}},{binding:1,resource:this.resolvedArrayView},{binding:2,resource:this.tileTextureView},{binding:3,resource:this.skyboxTextureView},{binding:4,resource:this.webcamTextureView},{binding:5,resource:this.paletteTextureView},{binding:6,resource:this.frozenArrayView},{binding:7,resource:this.paletteSampler}],label:"Engine BindGroup Color"})}this.needRender=!0}async _loadTexture(e){const r=new Image;r.src=e;try{await r.decode()}catch(a){throw console.warn("\xC9chec du chargement de la texture : "+e,a),a}const i=await createImageBitmap(r),o=this.device.createTexture({size:[i.width,i.height,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine LoadedTexture "+e});return this.device.queue.copyExternalImageToTexture({source:i},{texture:o},[i.width,i.height]),o}async readIterationDataAt(e,r,i,o){var re;if(!this.resolvedTexture||!this.device)return null;const a=this.width/Math.max(1,this.height),l=((re=this.previousMandelbrot)==null?void 0:re.angle)??0,u=e/Math.max(1,i),d=1-r/Math.max(1,o),m=u*2-1,f=d*2-1,v=m*a,L=f,w=Math.sin(l),b=Math.cos(l),n=b*v-w*L,h=w*v+b*L,S=Math.sqrt(a*a+1),P=n/S,R=h/S,E=P*.5+.5,y=R*.5+.5,A=this.neutralSize,C=Math.floor(Math.max(0,Math.min(A-1,E*A))),T=Math.floor(Math.max(0,Math.min(A-1,(1-y)*A))),z=H.ITER_PIXEL_LAYERS,N=1,F=4,I=(he=>he+255&-256)(N*F),K=I*z.length,$=this.device.createBuffer({size:K,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,label:"Engine IterPixel Readback"}),O=this.device.createCommandEncoder();for(let he=0;he<z.length;he++)O.copyTextureToBuffer({texture:this.resolvedTexture,origin:{x:C,y:T,z:z[he]}},{buffer:$,offset:I*he,bytesPerRow:I},{width:1,height:1,depthOrArrayLayers:1});this.device.queue.submit([O.finish()]),await $.mapAsync(GPUMapMode.READ);const ee=new Float32Array($.getMappedRange()),W=I/F,te=ee[0*W],ne=ee[1*W],q=ee[2*W],j=ee[3*W],se=ee[4*W];return $.unmap(),$.destroy(),te<0?null:{iter:te,zx:ne,zy:q,derX:j,derY:se}}async updateWebcamTexture(){var e,r;await((e=this.webcamTexture)==null?void 0:e.openWebcam()),await((r=this.webcamTexture)==null?void 0:r.drawWebGPUTexture(this.webcamTileTexture,this.device))}async getSnapshotPng(e=256){return await new Promise(r=>{this.snapshotCallback=r,this.snapshotDestWidth=e,this.needRender=!0})}};s(H,"_tileTexture"),s(H,"_tileTextureView"),s(H,"_skyboxTexture"),s(H,"_skyboxTextureView"),s(H,"_paletteTexture"),s(H,"_paletteTextureView"),s(H,"ITER_PIXEL_LAYERS",[0,2,3,4,5]);let vt=H,or,ar,nr,sr,lr,ur,Ee,gt,cr,dr,fr;wt=_t({__name:"Mandelbrot",props:je({mu:{default:4},epsilon:{default:1e-5},colorStops:{default:()=>[{color:"#002500",position:0},{color:"#175b3d",position:.16},{color:"#ffceb6",position:.26},{color:"#edffff",position:.42},{color:"#ff8fbc",position:.7016397849462366},{color:"#a6003e",position:.8575},{color:"#100000",position:1}]},palettePeriod:{default:100},paletteOffset:{default:0},antialiasLevel:{default:1},activateAnimate:{type:Boolean,default:!1},dprMultiplier:{default:.5},maxIterationMultiplier:{default:.1},targetFps:{default:60},gpuLoadMultiplier:{default:1},interpolationMode:{default:"lab"},tessellationLevel:{default:2},displacementAmount:{default:.01},animationSpeed:{default:1}},{cx:{default:"-1.9771995110313272619112808106831597"},cxModifiers:{},cy:{default:"0.0"},cyModifiers:{},scale:{default:"2.5"},scaleModifiers:{},angle:{default:0},angleModifiers:{}}),emits:["update:cx","update:cy","update:scale","update:angle"],setup(t,{expose:e}){const r=xt(null);let i=null,o=null,a,l=!1;const u=ie(t,"cx"),d=ie(t,"cy"),m=ie(t,"scale"),f=ie(t,"angle");We(()=>[u.value,d.value,m.value,f.value],([n,h,S,P],[R,E,y,A])=>{l||a&&(!n||!h||!S||((n!==R||h!==E)&&a.origin(n,h),S!==y&&a.scale(S),P!==A&&a.angle(Number(P))))},{flush:"sync"});const v=t;We(()=>v.dprMultiplier,n=>{o&&(o.dprMultiplier=n,b())}),We(()=>v.targetFps,n=>{o&&(o.targetFps=n)}),We(()=>v.gpuLoadMultiplier,n=>{o&&(o.gpuLoadMultiplier=n)});async function L(){if(!o||!a)return;const n=a.step();if(!n)return;const[h,S]=n,[P,R,E,y]=a.get_params();l=!0,u.value=P,d.value=R,m.value=E,f.value=parseFloat(y),await so(),l=!1;const A=Math.min(Math.max(100,1e3*v.maxIterationMultiplier*Math.log2(1/parseFloat(E))),1e5);await o.update({cx:P,cy:R,dx:parseFloat(h),dy:parseFloat(S),mu:v.mu,scale:parseFloat(E),angle:parseFloat(y),maxIterations:A,epsilon:v.epsilon},{antialiasLevel:v.antialiasLevel,palettePeriod:v.palettePeriod,paletteOffset:v.paletteOffset,colorStops:lo(v.colorStops),interpolationMode:v.interpolationMode,activateAnimate:v.activateAnimate,tessellationLevel:v.tessellationLevel,displacementAmount:v.displacementAmount,animationSpeed:v.animationSpeed}),await o.render()}async function w(){if(r.value)return i=r.value,a=new Ke(u.value,d.value,m.value,Number(f.value)),a.origin(u.value,d.value),a.scale(m.value),a.angle(Number(f.value)),o=new vt(i,{antialiasLevel:v.antialiasLevel,palettePeriod:v.palettePeriod,paletteOffset:v.paletteOffset,colorStops:v.colorStops,interpolationMode:v.interpolationMode,activateAnimate:v.activateAnimate,tessellationLevel:v.tessellationLevel,displacementAmount:v.displacementAmount,animationSpeed:v.animationSpeed}),o.initialize(a)}async function b(){if(!r.value||!o)return;const n=r.value.getBoundingClientRect();r.value.width=n.width,r.value.height=n.height,o.resize()}return _r(async()=>{await w(),window.addEventListener("resize",b),await b(),o&&o.startRenderLoop(L)}),xr(()=>{o==null||o.stopRenderLoop(),window.removeEventListener("resize",b)}),e({getCanvas:()=>r.value,getEngine:()=>o,getNavigator:()=>a,translate:(n,h)=>a==null?void 0:a.translate(n,h),translateDirect:(n,h)=>a==null?void 0:a.translate_direct(n,h),rotate:n=>a==null?void 0:a.rotate(n),angle:n=>a==null?void 0:a.angle(n),zoom:n=>a==null?void 0:a.zoom(n),step:()=>a==null?void 0:a.step(),getParams:()=>a==null?void 0:a.get_params(),drawOnce:async()=>L(),resize:async()=>b(),initialize:async()=>w()}),(n,h)=>(Ae(),Fe("canvas",{ref_key:"canvasRef",ref:r},null,512))}}),or={class:"mobile-nav-controls"},ar={key:0,class:"directional-controls"},nr={width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",style:{"vertical-align":"middle","margin-right":"4px"}},sr=_t({__name:"MobileNavigationControls",props:je({mandelbrotRef:{}},{expanded:{type:Boolean,default:!1},expandedModifiers:{}}),emits:["update:expanded"],setup(t){const e=t,r=ie(t,"expanded"),i=xt(null);let o=null;const a=()=>{r.value=!r.value,r.value||u()},l=b=>{b.preventDefault(),b.stopPropagation(),a()},u=()=>{i.value=null,o!==null&&(clearInterval(o),o=null)},d=b=>{i.value=b;const n=.01,h=()=>{if(e.mandelbrotRef)switch(b){case"north":e.mandelbrotRef.translate(0,n);break;case"south":e.mandelbrotRef.translate(0,-n);break;case"west":e.mandelbrotRef.translate(-n,0);break;case"east":e.mandelbrotRef.translate(n,0);break}};h(),o=window.setInterval(h,16)},m=b=>{i.value=`rotate-${b}`;const n=.025,h=()=>{e.mandelbrotRef&&(b==="left"?e.mandelbrotRef.rotate(n):e.mandelbrotRef.rotate(-n))};h(),o=window.setInterval(h,16)},f=b=>{i.value=`zoom-${b}`;const n=.97,h=()=>{e.mandelbrotRef&&(b==="in"?e.mandelbrotRef.zoom(n):e.mandelbrotRef.zoom(1/n))};h(),o=window.setInterval(h,16)},v=(b,n)=>{b.preventDefault(),n()},L=b=>{b.preventDefault(),u()};function w(b){b.preventDefault(),b.stopPropagation(),window.location.href=new URL("./presentation/",window.location.href).href}return(b,n)=>(Ae(),Fe("div",or,[k("button",{class:ce(["nav-button compass-button",{active:r.value}]),onClick:a,onTouchend:l,"aria-label":"Toggle navigation"},[...n[16]||(n[16]=[uo('<svg width="32" height="32" viewBox="0 0 24 24" fill="none" class="nav-icon" data-v-1e35ba8c><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" data-v-1e35ba8c></circle><path d="M12 2 L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-1e35ba8c></path><path d="M12 18 L12 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-1e35ba8c></path><path d="M2 12 L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-1e35ba8c></path><path d="M18 12 L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-1e35ba8c></path><path d="M12 7 L10 12 L12 14 L14 12 Z" fill="currentColor" data-v-1e35ba8c></path><text x="12" y="6" text-anchor="middle" font-size="6" fill="currentColor" font-weight="bold" data-v-1e35ba8c>N</text></svg>',1)])],34),yt(co,{name:"fade"},{default:fo(()=>[r.value?(Ae(),Fe("div",ar,[k("button",{class:ce(["nav-button direction-button north",{active:i.value==="north"}]),onTouchstart:n[0]||(n[0]=h=>v(h,()=>d("north"))),onTouchend:L,onMousedown:n[1]||(n[1]=h=>d("north")),onMouseup:u,onMouseleave:u,"aria-label":"Move North"},[...n[17]||(n[17]=[k("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[k("path",{d:"M12 5 L18 11 L15 11 L15 19 L9 19 L9 11 L6 11 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),k("button",{class:ce(["nav-button direction-button south",{active:i.value==="south"}]),onTouchstart:n[2]||(n[2]=h=>v(h,()=>d("south"))),onTouchend:L,onMousedown:n[3]||(n[3]=h=>d("south")),onMouseup:u,onMouseleave:u,"aria-label":"Move South"},[...n[18]||(n[18]=[k("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[k("path",{d:"M12 19 L6 13 L9 13 L9 5 L15 5 L15 13 L18 13 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),k("button",{class:ce(["nav-button direction-button west",{active:i.value==="west"}]),onTouchstart:n[4]||(n[4]=h=>v(h,()=>d("west"))),onTouchend:L,onMousedown:n[5]||(n[5]=h=>d("west")),onMouseup:u,onMouseleave:u,"aria-label":"Move West"},[...n[19]||(n[19]=[k("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[k("path",{d:"M5 12 L11 18 L11 15 L19 15 L19 9 L11 9 L11 6 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),k("button",{class:ce(["nav-button direction-button east",{active:i.value==="east"}]),onTouchstart:n[6]||(n[6]=h=>v(h,()=>d("east"))),onTouchend:L,onMousedown:n[7]||(n[7]=h=>d("east")),onMouseup:u,onMouseleave:u,"aria-label":"Move East"},[...n[20]||(n[20]=[k("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[k("path",{d:"M19 12 L13 6 L13 9 L5 9 L5 15 L13 15 L13 18 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),k("button",{class:ce(["nav-button corner-button rotate-left",{active:i.value==="rotate-left"}]),onTouchstart:n[8]||(n[8]=h=>v(h,()=>m("left"))),onTouchend:L,onMousedown:n[9]||(n[9]=h=>m("left")),onMouseup:u,onMouseleave:u,"aria-label":"Rotate Left"},[...n[21]||(n[21]=[k("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[k("path",{d:"M16 8 A6 6 0 1 0 8 16",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round"}),k("path",{d:"M5 16 L8 16 L8 13",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round","stroke-linejoin":"round"})],-1)])],34),k("button",{class:ce(["nav-button corner-button rotate-right",{active:i.value==="rotate-right"}]),onTouchstart:n[10]||(n[10]=h=>v(h,()=>m("right"))),onTouchend:L,onMousedown:n[11]||(n[11]=h=>m("right")),onMouseup:u,onMouseleave:u,"aria-label":"Rotate Right"},[...n[22]||(n[22]=[k("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[k("path",{d:"M8 8 A6 6 0 1 1 16 16",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round"}),k("path",{d:"M19 16 L16 16 L16 13",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round","stroke-linejoin":"round"})],-1)])],34),k("button",{class:ce(["nav-button corner-button zoom-out",{active:i.value==="zoom-out"}]),onTouchstart:n[12]||(n[12]=h=>v(h,()=>f("out"))),onTouchend:L,onMousedown:n[13]||(n[13]=h=>f("out")),onMouseup:u,onMouseleave:u,"aria-label":"Zoom Out"},[...n[23]||(n[23]=[k("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[k("circle",{cx:"11",cy:"11",r:"7",stroke:"currentColor","stroke-width":"2"}),k("path",{d:"M18 18 L22 22",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"}),k("path",{d:"M8 11 L14 11",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"})],-1)])],34),k("button",{class:ce(["nav-button corner-button zoom-in",{active:i.value==="zoom-in"}]),onTouchstart:n[14]||(n[14]=h=>v(h,()=>f("in"))),onTouchend:L,onMousedown:n[15]||(n[15]=h=>f("in")),onMouseup:u,onMouseleave:u,"aria-label":"Zoom In"},[...n[24]||(n[24]=[k("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[k("circle",{cx:"11",cy:"11",r:"7",stroke:"currentColor","stroke-width":"2"}),k("path",{d:"M18 18 L22 22",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"}),k("path",{d:"M11 8 L11 14",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"}),k("path",{d:"M8 11 L14 11",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"})],-1)])],34),k("button",{class:"presentation-button",onTouchend:po(w,["prevent","stop"]),onClick:w,"aria-label":"Pr\xE9sentation"},[(Ae(),Fe("svg",nr,[...n[25]||(n[25]=[k("rect",{x:"2",y:"3",width:"20",height:"14",rx:"2",ry:"2"},null,-1),k("line",{x1:"8",y1:"21",x2:"16",y2:"21"},null,-1),k("line",{x1:"12",y1:"17",x2:"12",y2:"21"},null,-1)])])),n[26]||(n[26]=ho(" Pr\xE9sentation ",-1))],32)])):vo("",!0)]),_:1})]))}}),lr=yr(sr,[["__scopeId","data-v-1e35ba8c"]]),ur={style:{position:"relative",width:"100%",height:"100%"}},Ee=.01,gt=.025,cr=300,dr=30,fr=_t({__name:"MandelbrotController",props:je({mu:{},epsilon:{},colorStops:{},antialiasLevel:{},palettePeriod:{},paletteOffset:{},activateAnimate:{type:Boolean},dprMultiplier:{},maxIterationMultiplier:{},targetFps:{},gpuLoadMultiplier:{},interpolationMode:{},pickerMode:{type:Boolean},tessellationLevel:{},displacementAmount:{},animationSpeed:{}},{cx:{},cxModifiers:{},cy:{},cyModifiers:{},scale:{},scaleModifiers:{},angle:{},angleModifiers:{},mobileNavExpanded:{type:Boolean,default:!1},mobileNavExpandedModifiers:{}}),emits:je(["cursorCoord","palettePick"],["update:cx","update:cy","update:scale","update:angle","update:mobileNavExpanded"]),setup(t,{expose:e,emit:r}){const i=ie(t,"cx"),o=ie(t,"cy"),a=ie(t,"scale"),l=ie(t,"angle"),u=ie(t,"mobileNavExpanded"),d=t,m=r,f=xt(null);let v=!1,L=0,w=0;function b(){var U;if(!v)return;const c=O();if(!c)return;const p=c.getBoundingClientRect(),_=L-p.left,M=w-p.top,B=(U=f.value)==null?void 0:U.getNavigator();if(!B)return;const G=B.pixel_to_complex(_,M,p.width,p.height);!G||G.length<2||m("cursorCoord",{re:G[0],im:G[1]},L,w)}function n(c){v=!0,L=c.clientX,w=c.clientY}function h(){v=!1,m("cursorCoord",null,0,0)}const S={};e({getCanvas:O,getEngine:()=>{var c;return((c=f.value)==null?void 0:c.getEngine())??null}});let P=!1,R=!1,E=0,y=0,A=0,C=0,T=0,z=!1,N=0,F=null,I=0,K=0,$=0;function O(){var c;return((c=f.value)==null?void 0:c.getCanvas())??null}function ee(c){const p=O();if(!p)return{x:0,y:0,width:0,height:0};const _=p.getBoundingClientRect();return{x:c.clientX-_.left,y:c.clientY-_.top,width:_.width,height:_.height}}function W(c){var _,M,B;const p=(M=(_=c.target)==null?void 0:_.tagName)==null?void 0:M.toLowerCase();p==="input"||p==="textarea"||p==="select"||(B=c.target)!=null&&B.isContentEditable||(S[c.code]=!0)}function te(c){S[c.code]=!1}function ne(c){var _,M;if(d.pickerMode){c.preventDefault();return}c.preventDefault();const p=.95;c.deltaY<0?(_=f.value)==null||_.zoom(p):(M=f.value)==null||M.zoom(1/p),b()}function q(c,p){var Le;const _=O();if(!_)return;const M=_.getBoundingClientRect(),B=c-M.left,G=p-M.top,U=M.width,V=M.height,X=U/V,le=(B-U/2)/U*2,ue=(G-V/2)/V*2;(Le=f.value)==null||Le.translateDirect(le*X,-ue)}function j(c){if(d.pickerMode){c.preventDefault();return}c.preventDefault(),q(c.clientX,c.clientY)}function se(c){if(d.pickerMode||c.touches.length!==0)return;const p=Date.now(),_=c.changedTouches[0];if(!_)return;const M=_.clientX,B=_.clientY;p-I<cr&&Math.hypot(M-K,B-$)<dr?(c.preventDefault(),q(M,B),I=0):(I=p,K=M,$=B)}function re(c){if(d.pickerMode){c.preventDefault(),he(c);return}if(c.button===2)R=!0;else{P=!0;const p=ee(c);E=p.x,y=p.y}}async function he(c){var V;const p=(V=f.value)==null?void 0:V.getEngine();if(!p)return;const _=O();if(!_)return;const M=_.getBoundingClientRect(),B=c.clientX-M.left,G=c.clientY-M.top,U=await p.readIterationDataAt(B,G,M.width,M.height);U&&m("palettePick",U,c.clientX,c.clientY)}function hr(c){var V,X;if(L=c.clientX,w=c.clientY,b(),d.pickerMode)return;const p=ee(c);if(R){const le=O();if(!le)return;const ue=le.getBoundingClientRect(),Le=ue.width/2,mt=ue.height/2,bt=p.x,eo=p.y,to=Math.atan2(eo-mt,bt-Le);(V=f.value)==null||V.angle(to);return}if(!P)return;const _=p.width,M=p.height,B=_/M,G=(p.x-E)/_*2,U=(p.y-y)/M*2;(X=f.value)==null||X.translateDirect(-G*B,U),E=p.x,y=p.y}function pr(c){d.pickerMode||(c.button===2?R=!1:P=!1)}function vr(c){var _;if(d.pickerMode)return;const p=O();if(p){if(c.touches.length===1){P=!0;const M=c.touches[0],B=p.getBoundingClientRect();E=M.clientX-B.left,y=M.clientY-B.top}else if(c.touches.length===2){P=!1,z=!0;const[M,B]=c.touches;A=Math.hypot(B.clientX-M.clientX,B.clientY-M.clientY),N=A,C=Math.atan2(B.clientY-M.clientY,B.clientX-M.clientX);const G=(_=f.value)==null?void 0:_.getParams();T=G?parseFloat(G[3]):0}}}function gr(c){var _,M,B;if(d.pickerMode)return;const p=O();if(p){if(P&&c.touches.length===1){const G=c.touches[0],U=p.getBoundingClientRect(),V=G.clientX-U.left,X=G.clientY-U.top,le=U.width,ue=U.height,Le=le/ue,mt=(V-E)/le*2,bt=(X-y)/ue*2;(_=f.value)==null||_.translateDirect(-mt*Le,bt),E=V,y=X}else if(z&&c.touches.length===2){const[G,U]=c.touches,V=Math.hypot(U.clientX-G.clientX,U.clientY-G.clientY),X=Math.atan2(U.clientY-G.clientY,U.clientX-G.clientX),le=N/V;N=V,(M=f.value)==null||M.zoom(le);const ue=X-C;(B=f.value)==null||B.angle(T+ue)}}}function mr(c){c.touches.length===0&&(P=!1,z=!1)}function br(){var c,p,_,M,B,G,U,V;if(!d.pickerMode){S.KeyW&&((c=f.value)==null||c.translate(0,Ee)),S.KeyS&&((p=f.value)==null||p.translate(0,-Ee)),S.KeyA&&((_=f.value)==null||_.translate(-Ee,0)),S.KeyD&&((M=f.value)==null||M.translate(Ee,0)),S.KeyQ&&((B=f.value)==null||B.rotate(gt)),S.KeyE&&((G=f.value)==null||G.rotate(-gt));const X=.97;S.KeyR&&((U=f.value)==null||U.zoom(X)),S.KeyF&&((V=f.value)==null||V.zoom(1/X))}b(),F=window.setTimeout(br,16)}return _r(async()=>{const c=O();c&&(window.addEventListener("keydown",W),window.addEventListener("keyup",te),c.addEventListener("wheel",ne,{passive:!1}),c.addEventListener("mousedown",re),c.addEventListener("dblclick",j),c.addEventListener("contextmenu",p=>p.preventDefault()),c.addEventListener("mouseenter",n),c.addEventListener("mouseleave",h),window.addEventListener("mousemove",hr),window.addEventListener("mouseup",pr),c.addEventListener("touchstart",vr,{passive:!1}),c.addEventListener("touchmove",gr,{passive:!1}),c.addEventListener("touchend",mr,{passive:!1}),c.addEventListener("touchend",se,{passive:!1}),br())}),xr(()=>{F!==null&&clearTimeout(F);const c=O();window.removeEventListener("keydown",W),window.removeEventListener("keyup",te),window.removeEventListener("mousemove",hr),window.removeEventListener("mouseup",pr),c&&(c.removeEventListener("wheel",ne),c.removeEventListener("mousedown",re),c.removeEventListener("dblclick",j),c.removeEventListener("contextmenu",p=>p.preventDefault()),c.removeEventListener("mouseenter",n),c.removeEventListener("mouseleave",h),c.removeEventListener("touchstart",vr),c.removeEventListener("touchmove",gr),c.removeEventListener("touchend",mr),c.removeEventListener("touchend",se))}),(c,p)=>(Ae(),Fe("div",ur,[yt(wt,{ref_key:"mandelbrotRef",ref:f,scale:a.value,"onUpdate:scale":p[0]||(p[0]=_=>a.value=_),angle:l.value,"onUpdate:angle":p[1]||(p[1]=_=>l.value=_),cx:i.value,"onUpdate:cx":p[2]||(p[2]=_=>i.value=_),cy:o.value,"onUpdate:cy":p[3]||(p[3]=_=>o.value=_),mu:d.mu,epsilon:d.epsilon,antialiasLevel:d.antialiasLevel,palettePeriod:d.palettePeriod,colorStops:d.colorStops,activateAnimate:d.activateAnimate,paletteOffset:d.paletteOffset,dprMultiplier:d.dprMultiplier,maxIterationMultiplier:d.maxIterationMultiplier,targetFps:d.targetFps,gpuLoadMultiplier:d.gpuLoadMultiplier,interpolationMode:d.interpolationMode,tessellationLevel:d.tessellationLevel,displacementAmount:d.displacementAmount,animationSpeed:d.animationSpeed},null,8,["scale","angle","cx","cy","mu","epsilon","antialiasLevel","palettePeriod","colorStops","activateAnimate","paletteOffset","dprMultiplier","maxIterationMultiplier","targetFps","gpuLoadMultiplier","interpolationMode","tessellationLevel","displacementAmount","animationSpeed"]),yt(lr,{"mandelbrot-ref":f.value,expanded:u.value,"onUpdate:expanded":p[4]||(p[4]=_=>u.value=_)},null,8,["mandelbrot-ref","expanded"])]))}}),wr=yr(fr,[["__scopeId","data-v-8c967017"]])})();export{wr as M,wt as _,go as __tla};
