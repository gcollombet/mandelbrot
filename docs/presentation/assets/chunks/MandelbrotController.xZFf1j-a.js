var Qi=Object.defineProperty;var ea=(pe,ie,be)=>ie in pe?Qi(pe,ie,{enumerable:!0,configurable:!0,writable:!0,value:be}):pe[ie]=be;var s=(pe,ie,be)=>ea(pe,typeof ie!="symbol"?ie+"":ie,be);import{aq as ta,ar as vr,as as mr,d as _t,at as re,z as We,p as gr,s as _r,o as Fe,c as Ue,au as je,y as bt,U as ra,av as ia,j as T,an as aa,n as ce,J as xt,T as oa,w as na,a as sa,a2 as la,e as ua,_ as br}from"./framework.xv_Wv5bI.js";let xr,yt,ca=(async()=>{const pe=`// Mandelbrot progressive-iteration shader.
//
// Layer layout (r32float texture_2d_array, 7 layers):
//   0 : sentinel / iteration count (integer part).
//       Negative  => sentinel (brush/resolve system).  -1 = compute request.
//       0         => inside the set (confirmed), or budget fully exhausted at globalMaxIter.
//       > 0       => escaped (|z|\xB2 >= 4) or budget-exhausted mid-progress (|z|\xB2 < 4).
//   1 : (unused \u2013 reserved for MRT alignment)
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

// \u2500\u2500 output struct (7 render targets) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
struct FragOut {
  @location(0) iter:      vec4<f32>,  // .r = integer iteration count (or sentinel)
  @location(1) unused1:   vec4<f32>,  // .r = (unused, reserved for MRT alignment)
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
    out.unused1   = pack(0.0);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(der.x);
    out.dzy       = pack(der.y);
    out.ref_i     = pack(0.0);
    return out;
  }

  let total_iter = prev_iter + i; // running total across all passes

  if (escaped) {
    // Escaped: store final z and der for color-shader recomputation
    // of mu (smooth frac) and angle_der (shading). No need for ref_i.
    out.iter      = pack(total_iter);
    out.unused1   = pack(0.0);
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
    out.iter      = pack(0.0);
    out.unused1   = pack(0.0);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(der.x);
    out.dzy       = pack(der.y);
    out.ref_i     = pack(0.0);
    return out;
  }

  // Budget exhausted below globalMaxIter: store iter = total_iter, keep dz/der
  // for resumption.  |z|\xB2 < 4 distinguishes this from escaped pixels.
  out.iter      = pack(total_iter);
  out.unused1   = pack(0.0);
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
    out.unused1   = pack(0.0);
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
    out.unused1   = pack(0.0);
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
`,ie=`struct Uniforms {
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
  zoomFactor: f32,       // frozenScale / displayScale
  zoomTarget: f32,
  liveZoomFactor: f32,   // liveScale / displayScale (for UV rescaling of live texture)
  frozenShiftU: f32,     // cumulative pan shift of frozen texture (normalized UV)
  frozenShiftV: f32,
  lightAngle: f32,       // light direction angle in radians (0 = right, pi/2 = top)
  displacementAmount: f32, // tessellation displacement multiplier
  specularPower: f32,    // specular exponent for Phong shading
};
@group(0) @binding(0) var<uniform> parameters: Uniforms;
@group(0) @binding(1) var tex: texture_2d_array<f32>; // resolved neutral texture (7 r32float layers)
@group(0) @binding(2) var tileTex: texture_2d<f32>;
@group(0) @binding(3) var skyboxTex: texture_2d<f32>;
@group(0) @binding(4) var webcamTex: texture_2d<f32>;
@group(0) @binding(5) var paletteTex: texture_2d<f32>;
@group(0) @binding(6) var texFrozen: texture_2d_array<f32>; // frozen snapshot for zoom reprojection
@group(0) @binding(7) var paletteSampler: sampler; // sampler bilin\xE9aire pour la palette

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

// Check whether a neutral-UV coordinate falls inside the screen-visible
// rectangle (accounting for rotation).  Reverses the neutral UV mapping:
//   uv \u2192 xy_neutral \u2192 local_rot \u2192 local   then tests |local| vs screen bounds.
fn isInsideScreen(uv: vec2<f32>, aspect: f32, neutralExtent: f32, angle: f32) -> bool {
  let xy_neutral = (uv - vec2<f32>(0.5, 0.5)) * 2.0;
  let local_rot  = xy_neutral * neutralExtent;
  let local      = rotate(local_rot, -angle);   // inverse rotation
  return abs(local.x) <= aspect && abs(local.y) <= 1.0;
}

fn cdiv(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  let d = b.x * b.x + b.y * b.y;
  return vec2<f32>((a.x * b.x + a.y * b.y) / d,
                   (a.y * b.x - a.x * b.y) / d);
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

fn palette(v: f32, v_smooth: f32, z: vec2<f32>,  d: f32, dx: f32, dy: f32) -> vec3<f32> {
  // v_smooth: always smoothed iteration value (for tessellation displacement)
  // v: iteration value respecting the smoothness setting (for palette lookup)
  let paletteRepeat = max(parameters.palettePeriod, 0.0001);
  let deep = v * 2.0;

  // Tessellation depth: based on smooth iterations only, independent of palette period
  let tess_depth = v_smooth * 2.0;
  let disp = parameters.displacementAmount;
  let tessColor = tile_tessellation(tileTex, tess_depth * 2.0 * disp + dx, tess_depth * 2.0 * disp + dy, parameters.tessellationLevel);
  let webCamColor = tile_tessellation(
    webcamTex,
    tess_depth + dx + cos(parameters.time * 0.1),
    tess_depth + dy + sin(parameters.time * 0.15),
    parameters.tessellationLevel + sin(parameters.time * 0.05)
  );
  let palettePhase = fract( deep / paletteRepeat + parameters.paletteOffset );
  // Sampling bilin\xE9aire de la palette (texture 1D, hauteur 1px)
  let paletteColor = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, 0.5), 0.0).rgb;

  var color = vec3<f32>(0.0, 0.0, 0.0);

  if (parameters.activatePalette == 1.0) {
    color = mix(color, paletteColor, 1.0 - color);
  }

  if (parameters.activateTessellation == 1.0) {
    if (parameters.activatePalette == 1.0) {
      // Multiply blend: tessellation modulates the palette color
      // This preserves the palette hues while adding tessellation detail
      color = color * (0.5 + 0.5 * tessColor);
    } else {
      color = mix(color, tessColor, 1.0 - color);
    }
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
    let la = parameters.lightAngle;
    let lightDir = normalize(vec3<f32>(cos(la), sin(la), 0.5));
    let viewDir = normalize(vec3<f32>(cos(la + 0.5), sin(la + 0.5), 0.5));
    let diff = max(dot(normal, lightDir), 0.0);
    let reflectDir = reflect(-lightDir, normal);
    let specular = pow(max(dot(viewDir, reflectDir), 0.0), parameters.specularPower);
    // Raw Phong value: diff in [0,1], specular in [0,1]
    // Remap so that average lighting maps to 1.0, shadows go below, highlights above
    let raw = 0.4 * diff + 0.6 * specular;
    // raw is roughly 0..1 with average ~0.3-0.5
    // Map to a shading factor centered around 1.0: range ~[0.8, 2.0]
    // shadingLevel controls the intensity of the relief effect (1.0 = default)
    let brightness = parameters.shadingLevel;
    var shading = 1.0 - brightness * 0.2 + brightness * 1.2 * raw;

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
      // Skybox modulates shading: bright skybox regions brighten, dark ones darken
      shading = 0.5 + (shading - 0.5) * (0.5 + lum);
    }

    color = color * shading;
  }

  return clamp(color, vec3<f32>(0.0), vec3<f32>(1.0));
}

// \u2500\u2500 Colorize a single pixel from its raw layer values \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Returns vec4: rgb color + alpha. Alpha = 0 means "no valid data" (sentinel/uncomputed).
fn colorize_pixel(
  iter_val: f32, zx_val: f32, zy_val: f32,
  der_x: f32, der_y: f32,
  uv_neutral: vec2<f32>
) -> vec4<f32> {
  // Sentinel: iter_val < 0 => uncomputed pixel.
  if (iter_val < 0.0) {
    return vec4<f32>(0.0, 0.0, 0.0, 0.0); // alpha=0: no valid data
  }

  // Budget exhausted: iter > 0 but z hasn't escaped (|z|\xB2 < mu).
  // Show a dimmed approximate color based on the partial iteration count,
  // giving a preview while computation continues (especially during orbit building).
  if (iter_val > 0.0 && (zx_val * zx_val + zy_val * zy_val) < parameters.mu) {
    // Use iter_val as a rough "fake escape" to generate approximate colors.
    // Dim the result to visually distinguish from fully converged pixels.
    let z_sq = zx_val * zx_val + zy_val * zy_val;
    let fake_log = max(log(z_sq + 1.0), 0.001);
    let mu_approx = clamp(1.0 - log(fake_log / log(parameters.mu)) / log(2.0), 0.0, 1.0);
    let nu = iter_val + mu_approx;
    let v = nu;
    let z = vec2<f32>(zx_val, zy_val);
    let der = vec2<f32>(der_x, der_y);
    let d = cdiv(der, z);
    let angle_der = atan2(d.y, d.x);
    var color = palette(v, v, z, angle_der, uv_neutral.x, uv_neutral.y);
    // Dim to 40% to signal "still computing"
    return vec4<f32>(color * 0.4, 1.0);
  }

  // Inside the set: iter_val == 0. Solid black.
  if (iter_val == 0.0) {
    return vec4<f32>(0.0, 0.0, 0.0, 1.0);
  }

  // \u2500\u2500 Escaped pixel: recalculate mu and angle_der from stored z and der \u2500\u2500
  let z_sq = zx_val * zx_val + zy_val * zy_val;
  let log_z2 = log(z_sq);
  let mu_val = clamp(1.0 - log(log_z2 / log(parameters.mu)) / log(2.0), 0.0, 1.0);

  var nu = iter_val + mu_val;

  if (nu < 0.0) {
    return vec4<f32>(0.0, 0.0, 0.5, 1.0);
  }

  // nu_smooth: always uses smoothed iterations (for tessellation displacement)
  let nu_smooth = nu;

  // nu: respects the smoothness setting (for palette lookup)
  if (parameters.activateSmoothness == 0.0) {
    nu = iter_val;
  }

  if (parameters.activateZebra == 1.0 && floor(iter_val) % 2.0 == 0.0) {
    return vec4<f32>(0.0, 0.0, 0.0, 1.0);
  }

  let z = vec2<f32>(zx_val, zy_val);
  let der = vec2<f32>(der_x, der_y);
  let d = cdiv(der, z);
  let angle_der = atan2(d.y, d.x);

  let v = nu;
  let v_smooth = nu_smooth;
  var color = palette(v, v_smooth, z, angle_der, uv_neutral.x, uv_neutral.y);

  return vec4<f32>(color, 1.0);
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
  let texSizeF = vec2<f32>(f32(texSize.x), f32(texSize.y));

  // \u2500\u2500 Zoom reprojection: dual-texture sampling with UV rescaling \u2500\u2500\u2500
  // During a zoom cycle the live texture is computed at a fixed target
  // scale (liveScale) while the display interpolates between frozen and
  // live scales.  Both textures need UV rescaling to match the display.
  //
  //   zoomFactor     = frozenScale / displayScale
  //   liveZoomFactor = liveScale   / displayScale
  //
  // UV transform:  uv_tex = (uv_neutral - 0.5) / texZoomFactor + 0.5
  //   This "zooms" into or out of the texture to match the display scale.

  // Screen-visible rectangle check for source-texture UVs during zoom.
  // The neutral texture is a square covering the screen diagonal; only a
  // (possibly rotated) rectangle is on screen.  When zoom UV rescaling
  // expands into the rotation margins we must reject those samples.
  //
  // To test: convert source UV back to screen-local space (undo the
  // neutral mapping and rotation) and check |local.x| <= aspect, |local.y| <= 1.
  let aspect = parameters.aspect;
  let angle  = parameters.angle;

  let zf  = parameters.zoomFactor;
  let lzf = parameters.liveZoomFactor;
  let isZooming = (zf != 1.0) || (lzf != 1.0);

  if (!isZooming) {
    // \u2500\u2500 No zoom active: sample live texture directly at uv_neutral \u2500\u2500
    let coord = vec2<i32>(
      i32(clamp(uv_neutral.x * texSizeF.x, 0.0, texSizeF.x - 1.0)),
      i32(clamp((1.0 - uv_neutral.y) * texSizeF.y, 0.0, texSizeF.y - 1.0))
    );
    let iter_val = textureLoad(tex, coord, 0, 0).r;

    // Sentinel debug color
    if (iter_val < 0.0) {
      let t = clamp((-iter_val) / 64.0, 0.0, 1.0);
      return vec4<f32>(0.15 + 0.35 * t, 0.0, 0.0, 1.0);
    }

    let c = colorize_pixel(
      iter_val,
      textureLoad(tex, coord, 2, 0).r,
      textureLoad(tex, coord, 3, 0).r,
      textureLoad(tex, coord, 4, 0).r,
      textureLoad(tex, coord, 5, 0).r,
      uv_neutral
    );
    return vec4<f32>(c.rgb, 1.0);
  }

  // \u2500\u2500 Zooming: try live texture first (rescaled), fall back to frozen \u2500\u2500

  // Live texture UV: the live texture is at liveScale, display is at displayScale.
  let uv_live = (uv_neutral - vec2<f32>(0.5, 0.5)) / lzf + vec2<f32>(0.5, 0.5);

  // Check if the live UV is in bounds.  When lzf < 1 (zoom-in), the UV
  // expands into the rotation margins \u2014 use rotation-aware screen test.
  // When lzf >= 1 (zoom-out), the UV shrinks \u2014 full texture bounds suffice.
  var liveInBounds: bool;
  if (lzf < 1.0) {
    liveInBounds = isInsideScreen(uv_live, aspect, neutralExtent, angle);
  } else {
    liveInBounds = uv_live.x >= 0.0 && uv_live.x <= 1.0
                && uv_live.y >= 0.0 && uv_live.y <= 1.0;
  }

  if (liveInBounds) {
    let liveCoord = vec2<i32>(
      i32(clamp(uv_live.x * texSizeF.x, 0.0, texSizeF.x - 1.0)),
      i32(clamp((1.0 - uv_live.y) * texSizeF.y, 0.0, texSizeF.y - 1.0))
    );
    let live_iter = textureLoad(tex, liveCoord, 0, 0).r;

    // Only use the live pixel if it has valid (non-sentinel) data
    if (live_iter >= 0.0) {
      let liveColor = colorize_pixel(
        live_iter,
        textureLoad(tex, liveCoord, 2, 0).r,
        textureLoad(tex, liveCoord, 3, 0).r,
        textureLoad(tex, liveCoord, 4, 0).r,
        textureLoad(tex, liveCoord, 5, 0).r,
        uv_neutral
      );
      if (liveColor.a > 0.0) {
        return vec4<f32>(liveColor.rgb, 1.0);
      }
    }
  }

  // Live texture has no data for this pixel \u2014 fall back to frozen snapshot.
  // The frozen texture is at frozenScale; rescale UV accordingly.
  // Also apply the cumulative pan shift so the frozen texture follows panning.
  // The shift is subtracted (same convention as the reproject shader: "where
  // does the data for this pixel come from in the frozen texture").
  let uv_frozen = (uv_neutral - vec2<f32>(0.5, 0.5)) / zf + vec2<f32>(0.5, 0.5)
                  - vec2<f32>(parameters.frozenShiftU, parameters.frozenShiftV);

  // Reject frozen samples outside valid bounds.  When zf < 1 (zoom-out),
  // the UV expands into the rotation margins \u2014 use rotation-aware screen test.
  // When zf >= 1 (zoom-in), the UV shrinks \u2014 full texture bounds suffice.
  var frozenOutOfBounds: bool;
  if (zf < 1.0) {
    frozenOutOfBounds = !isInsideScreen(uv_frozen, aspect, neutralExtent, angle);
  } else {
    frozenOutOfBounds = uv_frozen.x < 0.0 || uv_frozen.x > 1.0
                     || uv_frozen.y < 0.0 || uv_frozen.y > 1.0;
  }
  if (frozenOutOfBounds) {
    return vec4<f32>(0.05, 0.05, 0.05, 1.0);
  }

  let frozenCoord = vec2<i32>(
    i32(clamp(uv_frozen.x * texSizeF.x, 0.0, texSizeF.x - 1.0)),
    i32(clamp((1.0 - uv_frozen.y) * texSizeF.y, 0.0, texSizeF.y - 1.0))
  );

  let frozen_iter = textureLoad(texFrozen, frozenCoord, 0, 0).r;
  let frozenColor = colorize_pixel(
    frozen_iter,
    textureLoad(texFrozen, frozenCoord, 2, 0).r,
    textureLoad(texFrozen, frozenCoord, 3, 0).r,
    textureLoad(texFrozen, frozenCoord, 4, 0).r,
    textureLoad(texFrozen, frozenCoord, 5, 0).r,
    uv_neutral
  );

  if (frozenColor.a > 0.0) {
    return vec4<f32>(frozenColor.rgb, 1.0);
  }

  // Neither texture has data \u2014 dark placeholder
  return vec4<f32>(0.05, 0.05, 0.05, 1.0);
}

`,be=`// Brush pass: updates sentinel levels in the neutral square texture.
//
// Uses a texture_2d_array<f32> with 7 r32float layers.
//
// Layer layout:
//   0 : sentinel / iteration count (integer part)
//   1 : (unused \u2013 reserved for MRT alignment)
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
  @location(1) unused1:   vec4<f32>,
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
  o.unused1   = pack(loadLayer(coord, 1));
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
  o.unused1   = pack(0.0);
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
`,yr=`// Resolve pass: replaces remaining sentinels with a snapped parent pixel.
//
// Uses a texture_2d_array<f32> with 7 r32float layers.
//
// Layer layout:
//   0 : sentinel / iteration count (integer part)
//   1 : (unused \u2013 reserved for MRT alignment)
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
  @location(1) unused1:   vec4<f32>,
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
  o.unused1   = pack(loadLayer(coord, 1));
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

  // Fallback after exhausting all grid levels.
  return loadAllLayers(coord);
}
`,wr=`// Compute pass: counts pixels that still need rendering work.
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
`,zr=async(e={},t)=>{let r;if(t.startsWith("data:")){const i=t.replace(/^data:.*?base64,/,"");let a;if(typeof Buffer=="function"&&typeof Buffer.from=="function")a=Buffer.from(i,"base64");else if(typeof atob=="function"){const o=atob(i);a=new Uint8Array(o.length);for(let c=0;c<o.length;c++)a[c]=o.charCodeAt(c)}else throw new Error("Cannot decode base64-encoded data URL");r=await WebAssembly.instantiate(a,e)}else{const i=await fetch(t),a=i.headers.get("Content-Type")||"";if("instantiateStreaming"in WebAssembly&&a.startsWith("application/wasm"))r=await WebAssembly.instantiateStreaming(i,e);else{const o=await i.arrayBuffer();r=await WebAssembly.instantiate(o,e)}}return r.instance.exports};let m;function Mr(e){m=e}function Ze(e,t){try{return e.apply(this,t)}catch(r){let i=(function(){try{return r instanceof Error?`${r.message}

Stack:
${r.stack}`:r.toString()}catch{return"<failed to stringify thrown value>"}})();throw console.error("wasm-bindgen: imported JS function that was not marked as `catch` threw an error:",i),r}}let Ge=null;function Ne(){return(Ge===null||Ge.byteLength===0)&&(Ge=new Uint8Array(m.memory.buffer)),Ge}let Oe=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0});Oe.decode();const Tr=2146435072;let Xe=0;function kr(e,t){return Xe+=t,Xe>=Tr&&(Oe=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0}),Oe.decode(),Xe=t),Oe.decode(Ne().subarray(e,e+t))}function wt(e,t){return e=e>>>0,kr(e,t)}function R(e){if(typeof e!="number")throw new Error(`expected a number argument, found ${typeof e}`)}let xe=null;function Sr(){return(xe===null||xe.buffer.detached===!0||xe.buffer.detached===void 0&&xe.buffer!==m.memory.buffer)&&(xe=new DataView(m.memory.buffer)),xe}function He(e,t){e=e>>>0;const r=Sr(),i=[];for(let a=e;a<e+4*t;a+=4)i.push(m.__wbindgen_export_0.get(r.getUint32(a,!0)));return m.__externref_drop_slice(e,t),i}let de=0;const Le=new TextEncoder;"encodeInto"in Le||(Le.encodeInto=function(e,t){const r=Le.encode(e);return t.set(r),{read:e.length,written:r.length}});function ye(e,t,r){if(typeof e!="string")throw new Error(`expected a string argument, found ${typeof e}`);if(r===void 0){const d=Le.encode(e),l=t(d.length,1)>>>0;return Ne().subarray(l,l+d.length).set(d),de=d.length,l}let i=e.length,a=t(i,1)>>>0;const o=Ne();let c=0;for(;c<i;c++){const d=e.charCodeAt(c);if(d>127)break;o[a+c]=d}if(c!==i){c!==0&&(e=e.slice(c)),a=r(a,i,i=c+e.length*3,1)>>>0;const d=Ne().subarray(a+c,a+i),l=Le.encodeInto(e,d);if(l.read!==e.length)throw new Error("failed to pass whole string");c+=l.written,a=r(a,i,c,1)>>>0}return de=c,a}const zt=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(e=>m.__wbg_mandelbrotnavigator_free(e>>>0,1));class Ke{__destroy_into_raw(){const t=this.__wbg_ptr;return this.__wbg_ptr=0,zt.unregister(this),t}free(){const t=this.__destroy_into_raw();m.__wbg_mandelbrotnavigator_free(t,0)}get_params(){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");R(this.__wbg_ptr);const t=m.mandelbrotnavigator_get_params(this.__wbg_ptr);var r=He(t[0],t[1]).slice();return m.__wbindgen_free(t[0],t[1]*4,4),r}rotate_direct(t){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");R(this.__wbg_ptr),m.mandelbrotnavigator_rotate_direct(this.__wbg_ptr,t)}pixel_to_complex(t,r,i,a){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");R(this.__wbg_ptr);const o=m.mandelbrotnavigator_pixel_to_complex(this.__wbg_ptr,t,r,i,a);var c=He(o[0],o[1]).slice();return m.__wbindgen_free(o[0],o[1]*4,4),c}translate_direct(t,r){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");R(this.__wbg_ptr),m.mandelbrotnavigator_translate_direct(this.__wbg_ptr,t,r)}get_reference_orbit_len(){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");return R(this.__wbg_ptr),m.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr)>>>0}compute_reference_orbit_ptr(t){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");R(this.__wbg_ptr),R(t);const r=m.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr,t);return we.__wrap(r)}get_reference_orbit_capacity(){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");return R(this.__wbg_ptr),m.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr)>>>0}compute_reference_orbit_chunk(t,r){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");R(this.__wbg_ptr),R(t),R(r);const i=m.mandelbrotnavigator_compute_reference_orbit_chunk(this.__wbg_ptr,t,r);return we.__wrap(i)}constructor(t,r,i,a){const o=ye(t,m.__wbindgen_malloc,m.__wbindgen_realloc),c=de,d=ye(r,m.__wbindgen_malloc,m.__wbindgen_realloc),l=de,x=ye(i,m.__wbindgen_malloc,m.__wbindgen_realloc),f=de,h=m.mandelbrotnavigator_new(o,c,d,l,x,f,a);return this.__wbg_ptr=h>>>0,zt.register(this,this.__wbg_ptr,this),this}step(){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");R(this.__wbg_ptr);const t=m.mandelbrotnavigator_step(this.__wbg_ptr);var r=He(t[0],t[1]).slice();return m.__wbindgen_free(t[0],t[1]*4,4),r}zoom(t){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");R(this.__wbg_ptr),m.mandelbrotnavigator_zoom(this.__wbg_ptr,t)}angle(t){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");R(this.__wbg_ptr),m.mandelbrotnavigator_angle(this.__wbg_ptr,t)}scale(t){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");R(this.__wbg_ptr);const r=ye(t,m.__wbindgen_malloc,m.__wbindgen_realloc),i=de;m.mandelbrotnavigator_scale(this.__wbg_ptr,r,i)}origin(t,r){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");R(this.__wbg_ptr);const i=ye(t,m.__wbindgen_malloc,m.__wbindgen_realloc),a=de,o=ye(r,m.__wbindgen_malloc,m.__wbindgen_realloc),c=de;m.mandelbrotnavigator_origin(this.__wbg_ptr,i,a,o,c)}rotate(t){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");R(this.__wbg_ptr),m.mandelbrotnavigator_rotate(this.__wbg_ptr,t)}translate(t,r){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");R(this.__wbg_ptr),m.mandelbrotnavigator_translate(this.__wbg_ptr,t,r)}}Symbol.dispose&&(Ke.prototype[Symbol.dispose]=Ke.prototype.free),typeof FinalizationRegistry>"u"||new FinalizationRegistry(e=>m.__wbg_mandelbrotstep_free(e>>>0,1));const Mt=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(e=>m.__wbg_orbitbufferinfo_free(e>>>0,1));class we{constructor(){throw new Error("cannot invoke `new` directly")}static __wrap(t){t=t>>>0;const r=Object.create(we.prototype);return r.__wbg_ptr=t,Mt.register(r,r.__wbg_ptr,r),r}__destroy_into_raw(){const t=this.__wbg_ptr;return this.__wbg_ptr=0,Mt.unregister(this),t}free(){const t=this.__destroy_into_raw();m.__wbg_orbitbufferinfo_free(t,0)}get ptr(){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");return R(this.__wbg_ptr),m.__wbg_get_orbitbufferinfo_ptr(this.__wbg_ptr)>>>0}set ptr(t){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");R(this.__wbg_ptr),R(t),m.__wbg_set_orbitbufferinfo_ptr(this.__wbg_ptr,t)}get offset(){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");return R(this.__wbg_ptr),m.__wbg_get_orbitbufferinfo_offset(this.__wbg_ptr)>>>0}set offset(t){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");R(this.__wbg_ptr),R(t),m.__wbg_set_orbitbufferinfo_offset(this.__wbg_ptr,t)}get count(){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");return R(this.__wbg_ptr),m.__wbg_get_orbitbufferinfo_count(this.__wbg_ptr)>>>0}set count(t){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");R(this.__wbg_ptr),R(t),m.__wbg_set_orbitbufferinfo_count(this.__wbg_ptr,t)}}Symbol.dispose&&(we.prototype[Symbol.dispose]=we.prototype.free);function Lr(){return Ze(function(e){return Math.exp(e)},arguments)}function Br(){return Ze(function(){return Date.now()},arguments)}function Cr(e,t){throw new Error(wt(e,t))}function Rr(){return Ze(function(e,t){return wt(e,t)},arguments)}function Pr(){const e=m.__wbindgen_export_0,t=e.grow(4);e.set(0,void 0),e.set(t+0,void 0),e.set(t+1,null),e.set(t+2,!0),e.set(t+3,!1)}URL=globalThis.URL;const y=await zr({"./mandelbrot_bg.js":{__wbg_now_1e80617bcee43265:Br,__wbg_exp_9293ded1248e1bd3:Lr,__wbg_wbindgenthrow_451ec1a8469d7eb6:Cr,__wbindgen_init_externref_table:Pr,__wbindgen_cast_2241b6af4c4b2941:Rr}},ta),Tt=y.memory,Ar=y.__wbg_get_mandelbrotstep_dx,Er=y.__wbg_get_mandelbrotstep_dy,Fr=y.__wbg_get_mandelbrotstep_zx,Ur=y.__wbg_get_mandelbrotstep_zy,Gr=y.__wbg_get_orbitbufferinfo_count,Nr=y.__wbg_get_orbitbufferinfo_offset,Or=y.__wbg_get_orbitbufferinfo_ptr,Ir=y.__wbg_mandelbrotnavigator_free,Vr=y.__wbg_mandelbrotstep_free,Dr=y.__wbg_orbitbufferinfo_free,qr=y.__wbg_set_mandelbrotstep_dx,$r=y.__wbg_set_mandelbrotstep_dy,Yr=y.__wbg_set_mandelbrotstep_zx,Wr=y.__wbg_set_mandelbrotstep_zy,jr=y.__wbg_set_orbitbufferinfo_count,Zr=y.__wbg_set_orbitbufferinfo_offset,Xr=y.__wbg_set_orbitbufferinfo_ptr,Hr=y.mandelbrotnavigator_angle,Kr=y.mandelbrotnavigator_compute_reference_orbit_chunk,Jr=y.mandelbrotnavigator_compute_reference_orbit_ptr,Qr=y.mandelbrotnavigator_get_params,ei=y.mandelbrotnavigator_get_reference_orbit_capacity,ti=y.mandelbrotnavigator_get_reference_orbit_len,ri=y.mandelbrotnavigator_new,ii=y.mandelbrotnavigator_origin,ai=y.mandelbrotnavigator_pixel_to_complex,oi=y.mandelbrotnavigator_rotate,ni=y.mandelbrotnavigator_rotate_direct,si=y.mandelbrotnavigator_scale,li=y.mandelbrotnavigator_step,ui=y.mandelbrotnavigator_translate,ci=y.mandelbrotnavigator_translate_direct,di=y.mandelbrotnavigator_zoom,hi=y.__wbindgen_export_0,fi=y.__externref_drop_slice,pi=y.__wbindgen_free,vi=y.__wbindgen_malloc,mi=y.__wbindgen_realloc,kt=y.__wbindgen_start,gi=Object.freeze(Object.defineProperty({__proto__:null,__externref_drop_slice:fi,__wbg_get_mandelbrotstep_dx:Ar,__wbg_get_mandelbrotstep_dy:Er,__wbg_get_mandelbrotstep_zx:Fr,__wbg_get_mandelbrotstep_zy:Ur,__wbg_get_orbitbufferinfo_count:Gr,__wbg_get_orbitbufferinfo_offset:Nr,__wbg_get_orbitbufferinfo_ptr:Or,__wbg_mandelbrotnavigator_free:Ir,__wbg_mandelbrotstep_free:Vr,__wbg_orbitbufferinfo_free:Dr,__wbg_set_mandelbrotstep_dx:qr,__wbg_set_mandelbrotstep_dy:$r,__wbg_set_mandelbrotstep_zx:Yr,__wbg_set_mandelbrotstep_zy:Wr,__wbg_set_orbitbufferinfo_count:jr,__wbg_set_orbitbufferinfo_offset:Zr,__wbg_set_orbitbufferinfo_ptr:Xr,__wbindgen_export_0:hi,__wbindgen_free:pi,__wbindgen_malloc:vi,__wbindgen_realloc:mi,__wbindgen_start:kt,mandelbrotnavigator_angle:Hr,mandelbrotnavigator_compute_reference_orbit_chunk:Kr,mandelbrotnavigator_compute_reference_orbit_ptr:Jr,mandelbrotnavigator_get_params:Qr,mandelbrotnavigator_get_reference_orbit_capacity:ei,mandelbrotnavigator_get_reference_orbit_len:ti,mandelbrotnavigator_new:ri,mandelbrotnavigator_origin:ii,mandelbrotnavigator_pixel_to_complex:ai,mandelbrotnavigator_rotate:oi,mandelbrotnavigator_rotate_direct:ni,mandelbrotnavigator_scale:si,mandelbrotnavigator_step:li,mandelbrotnavigator_translate:ui,mandelbrotnavigator_translate_direct:ci,mandelbrotnavigator_zoom:di,memory:Tt},Symbol.toStringTag,{value:"Module"}));Mr(gi),kt();class _i{constructor(t=1024,r=1024){s(this,"video");s(this,"stream",null);s(this,"width");s(this,"height");s(this,"lastDrawTime",0);this.width=t,this.height=r,this.video=document.createElement("video"),this.video.autoplay=!0,this.video.width=t,this.video.height=r}async openWebcam(){this.stream||(this.stream=await navigator.mediaDevices.getUserMedia({video:{width:this.width,height:this.height}}),this.video.srcObject=this.stream,await this.video.play())}async drawWebGPUTexture(t,r){const i=performance.now();if(i-this.lastDrawTime>15){if(this.video.readyState<HTMLMediaElement.HAVE_CURRENT_DATA)return;r.queue.copyExternalImageToTexture({source:this.video},{texture:t},[this.width,this.height]),this.lastDrawTime=i}}closeWebcam(){this.stream&&(this.stream.getTracks().forEach(t=>t.stop()),this.stream=null)}}function ze(e,t,r){e.prototype=t.prototype=r,r.constructor=e}function Be(e,t){var r=Object.create(e.prototype);for(var i in t)r[i]=t[i];return r}function he(){}var ve=.7,Me=1/ve,Te="\\s*([+-]?\\d+)\\s*",Ce="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*",Q="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*",bi=/^#([0-9a-f]{3,8})$/,xi=new RegExp(`^rgb\\(${Te},${Te},${Te}\\)$`),yi=new RegExp(`^rgb\\(${Q},${Q},${Q}\\)$`),wi=new RegExp(`^rgba\\(${Te},${Te},${Te},${Ce}\\)$`),zi=new RegExp(`^rgba\\(${Q},${Q},${Q},${Ce}\\)$`),Mi=new RegExp(`^hsl\\(${Ce},${Q},${Q}\\)$`),Ti=new RegExp(`^hsla\\(${Ce},${Q},${Q},${Ce}\\)$`),St={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074};ze(he,Je,{copy(e){return Object.assign(new this.constructor,this,e)},displayable(){return this.rgb().displayable()},hex:Lt,formatHex:Lt,formatHex8:ki,formatHsl:Si,formatRgb:Bt,toString:Bt});function Lt(){return this.rgb().formatHex()}function ki(){return this.rgb().formatHex8()}function Si(){return Et(this).formatHsl()}function Bt(){return this.rgb().formatRgb()}function Je(e){var t,r;return e=(e+"").trim().toLowerCase(),(t=bi.exec(e))?(r=t[1].length,t=parseInt(t[1],16),r===6?Ct(t):r===3?new N(t>>8&15|t>>4&240,t>>4&15|t&240,(t&15)<<4|t&15,1):r===8?Ie(t>>24&255,t>>16&255,t>>8&255,(t&255)/255):r===4?Ie(t>>12&15|t>>8&240,t>>8&15|t>>4&240,t>>4&15|t&240,((t&15)<<4|t&15)/255):null):(t=xi.exec(e))?new N(t[1],t[2],t[3],1):(t=yi.exec(e))?new N(t[1]*255/100,t[2]*255/100,t[3]*255/100,1):(t=wi.exec(e))?Ie(t[1],t[2],t[3],t[4]):(t=zi.exec(e))?Ie(t[1]*255/100,t[2]*255/100,t[3]*255/100,t[4]):(t=Mi.exec(e))?At(t[1],t[2]/100,t[3]/100,1):(t=Ti.exec(e))?At(t[1],t[2]/100,t[3]/100,t[4]):St.hasOwnProperty(e)?Ct(St[e]):e==="transparent"?new N(NaN,NaN,NaN,0):null}function Ct(e){return new N(e>>16&255,e>>8&255,e&255,1)}function Ie(e,t,r,i){return i<=0&&(e=t=r=NaN),new N(e,t,r,i)}function Qe(e){return e instanceof he||(e=Je(e)),e?(e=e.rgb(),new N(e.r,e.g,e.b,e.opacity)):new N}function Re(e,t,r,i){return arguments.length===1?Qe(e):new N(e,t,r,i??1)}function N(e,t,r,i){this.r=+e,this.g=+t,this.b=+r,this.opacity=+i}ze(N,Re,Be(he,{brighter(e){return e=e==null?Me:Math.pow(Me,e),new N(this.r*e,this.g*e,this.b*e,this.opacity)},darker(e){return e=e==null?ve:Math.pow(ve,e),new N(this.r*e,this.g*e,this.b*e,this.opacity)},rgb(){return this},clamp(){return new N(me(this.r),me(this.g),me(this.b),Ve(this.opacity))},displayable(){return-.5<=this.r&&this.r<255.5&&-.5<=this.g&&this.g<255.5&&-.5<=this.b&&this.b<255.5&&0<=this.opacity&&this.opacity<=1},hex:Rt,formatHex:Rt,formatHex8:Li,formatRgb:Pt,toString:Pt}));function Rt(){return`#${ge(this.r)}${ge(this.g)}${ge(this.b)}`}function Li(){return`#${ge(this.r)}${ge(this.g)}${ge(this.b)}${ge((isNaN(this.opacity)?1:this.opacity)*255)}`}function Pt(){const e=Ve(this.opacity);return`${e===1?"rgb(":"rgba("}${me(this.r)}, ${me(this.g)}, ${me(this.b)}${e===1?")":`, ${e})`}`}function Ve(e){return isNaN(e)?1:Math.max(0,Math.min(1,e))}function me(e){return Math.max(0,Math.min(255,Math.round(e)||0))}function ge(e){return e=me(e),(e<16?"0":"")+e.toString(16)}function At(e,t,r,i){return i<=0?e=t=r=NaN:r<=0||r>=1?e=t=NaN:t<=0&&(e=NaN),new J(e,t,r,i)}function Et(e){if(e instanceof J)return new J(e.h,e.s,e.l,e.opacity);if(e instanceof he||(e=Je(e)),!e)return new J;if(e instanceof J)return e;e=e.rgb();var t=e.r/255,r=e.g/255,i=e.b/255,a=Math.min(t,r,i),o=Math.max(t,r,i),c=NaN,d=o-a,l=(o+a)/2;return d?(t===o?c=(r-i)/d+(r<i)*6:r===o?c=(i-t)/d+2:c=(t-r)/d+4,d/=l<.5?o+a:2-o-a,c*=60):d=l>0&&l<1?0:c,new J(c,d,l,e.opacity)}function et(e,t,r,i){return arguments.length===1?Et(e):new J(e,t,r,i??1)}function J(e,t,r,i){this.h=+e,this.s=+t,this.l=+r,this.opacity=+i}ze(J,et,Be(he,{brighter(e){return e=e==null?Me:Math.pow(Me,e),new J(this.h,this.s,this.l*e,this.opacity)},darker(e){return e=e==null?ve:Math.pow(ve,e),new J(this.h,this.s,this.l*e,this.opacity)},rgb(){var e=this.h%360+(this.h<0)*360,t=isNaN(e)||isNaN(this.s)?0:this.s,r=this.l,i=r+(r<.5?r:1-r)*t,a=2*r-i;return new N(tt(e>=240?e-240:e+120,a,i),tt(e,a,i),tt(e<120?e+240:e-120,a,i),this.opacity)},clamp(){return new J(Ft(this.h),De(this.s),De(this.l),Ve(this.opacity))},displayable(){return(0<=this.s&&this.s<=1||isNaN(this.s))&&0<=this.l&&this.l<=1&&0<=this.opacity&&this.opacity<=1},formatHsl(){const e=Ve(this.opacity);return`${e===1?"hsl(":"hsla("}${Ft(this.h)}, ${De(this.s)*100}%, ${De(this.l)*100}%${e===1?")":`, ${e})`}`}}));function Ft(e){return e=(e||0)%360,e<0?e+360:e}function De(e){return Math.max(0,Math.min(1,e||0))}function tt(e,t,r){return(e<60?t+(r-t)*e/60:e<180?r:e<240?t+(r-t)*(240-e)/60:t)*255}const Ut=Math.PI/180,Gt=180/Math.PI,qe=18,Nt=.96422,Ot=1,It=.82521,Vt=4/29,ke=6/29,Dt=3*ke*ke,Bi=ke*ke*ke;function qt(e){if(e instanceof ee)return new ee(e.l,e.a,e.b,e.opacity);if(e instanceof ae)return $t(e);e instanceof N||(e=Qe(e));var t=nt(e.r),r=nt(e.g),i=nt(e.b),a=it((.2225045*t+.7168786*r+.0606169*i)/Ot),o,c;return t===r&&r===i?o=c=a:(o=it((.4360747*t+.3850649*r+.1430804*i)/Nt),c=it((.0139322*t+.0971045*r+.7141733*i)/It)),new ee(116*a-16,500*(o-a),200*(a-c),e.opacity)}function rt(e,t,r,i){return arguments.length===1?qt(e):new ee(e,t,r,i??1)}function ee(e,t,r,i){this.l=+e,this.a=+t,this.b=+r,this.opacity=+i}ze(ee,rt,Be(he,{brighter(e){return new ee(this.l+qe*(e??1),this.a,this.b,this.opacity)},darker(e){return new ee(this.l-qe*(e??1),this.a,this.b,this.opacity)},rgb(){var e=(this.l+16)/116,t=isNaN(this.a)?e:e+this.a/500,r=isNaN(this.b)?e:e-this.b/200;return t=Nt*at(t),e=Ot*at(e),r=It*at(r),new N(ot(3.1338561*t-1.6168667*e-.4906146*r),ot(-.9787684*t+1.9161415*e+.033454*r),ot(.0719453*t-.2289914*e+1.4052427*r),this.opacity)}}));function it(e){return e>Bi?Math.pow(e,1/3):e/Dt+Vt}function at(e){return e>ke?e*e*e:Dt*(e-Vt)}function ot(e){return 255*(e<=.0031308?12.92*e:1.055*Math.pow(e,1/2.4)-.055)}function nt(e){return(e/=255)<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4)}function Ci(e){if(e instanceof ae)return new ae(e.h,e.c,e.l,e.opacity);if(e instanceof ee||(e=qt(e)),e.a===0&&e.b===0)return new ae(NaN,0<e.l&&e.l<100?0:NaN,e.l,e.opacity);var t=Math.atan2(e.b,e.a)*Gt;return new ae(t<0?t+360:t,Math.sqrt(e.a*e.a+e.b*e.b),e.l,e.opacity)}function st(e,t,r,i){return arguments.length===1?Ci(e):new ae(e,t,r,i??1)}function ae(e,t,r,i){this.h=+e,this.c=+t,this.l=+r,this.opacity=+i}function $t(e){if(isNaN(e.h))return new ee(e.l,0,0,e.opacity);var t=e.h*Ut;return new ee(e.l,Math.cos(t)*e.c,Math.sin(t)*e.c,e.opacity)}ze(ae,st,Be(he,{brighter(e){return new ae(this.h,this.c,this.l+qe*(e??1),this.opacity)},darker(e){return new ae(this.h,this.c,this.l-qe*(e??1),this.opacity)},rgb(){return $t(this).rgb()}}));var Yt=-.14861,lt=1.78277,ut=-.29227,$e=-.90649,Pe=1.97294,Wt=Pe*$e,jt=Pe*lt,Zt=lt*ut-$e*Yt;function Ri(e){if(e instanceof _e)return new _e(e.h,e.s,e.l,e.opacity);e instanceof N||(e=Qe(e));var t=e.r/255,r=e.g/255,i=e.b/255,a=(Zt*i+Wt*t-jt*r)/(Zt+Wt-jt),o=i-a,c=(Pe*(r-a)-ut*o)/$e,d=Math.sqrt(c*c+o*o)/(Pe*a*(1-a)),l=d?Math.atan2(c,o)*Gt-120:NaN;return new _e(l<0?l+360:l,d,a,e.opacity)}function ct(e,t,r,i){return arguments.length===1?Ri(e):new _e(e,t,r,i??1)}function _e(e,t,r,i){this.h=+e,this.s=+t,this.l=+r,this.opacity=+i}ze(_e,ct,Be(he,{brighter(e){return e=e==null?Me:Math.pow(Me,e),new _e(this.h,this.s,this.l*e,this.opacity)},darker(e){return e=e==null?ve:Math.pow(ve,e),new _e(this.h,this.s,this.l*e,this.opacity)},rgb(){var e=isNaN(this.h)?0:(this.h+120)*Ut,t=+this.l,r=isNaN(this.s)?0:this.s*t*(1-t),i=Math.cos(e),a=Math.sin(e);return new N(255*(t+r*(Yt*i+lt*a)),255*(t+r*(ut*i+$e*a)),255*(t+r*(Pe*i)),this.opacity)}}));const dt=e=>()=>e;function Xt(e,t){return function(r){return e+r*t}}function Pi(e,t,r){return e=Math.pow(e,r),t=Math.pow(t,r)-e,r=1/r,function(i){return Math.pow(e+i*t,r)}}function ht(e,t){var r=t-e;return r?Xt(e,r>180||r<-180?r-360*Math.round(r/360):r):dt(isNaN(e)?t:e)}function Ai(e){return(e=+e)==1?$:function(t,r){return r-t?Pi(t,r,e):dt(isNaN(t)?r:t)}}function $(e,t){var r=t-e;return r?Xt(e,r):dt(isNaN(e)?t:e)}const Ei=(function e(t){var r=Ai(t);function i(a,o){var c=r((a=Re(a)).r,(o=Re(o)).r),d=r(a.g,o.g),l=r(a.b,o.b),x=$(a.opacity,o.opacity);return function(f){return a.r=c(f),a.g=d(f),a.b=l(f),a.opacity=x(f),a+""}}return i.gamma=e,i})(1);function Fi(e){return function(t,r){var i=e((t=et(t)).h,(r=et(r)).h),a=$(t.s,r.s),o=$(t.l,r.l),c=$(t.opacity,r.opacity);return function(d){return t.h=i(d),t.s=a(d),t.l=o(d),t.opacity=c(d),t+""}}}const Ui=Fi(ht);function Ht(e,t){var r=$((e=rt(e)).l,(t=rt(t)).l),i=$(e.a,t.a),a=$(e.b,t.b),o=$(e.opacity,t.opacity);return function(c){return e.l=r(c),e.a=i(c),e.b=a(c),e.opacity=o(c),e+""}}function Gi(e){return function(t,r){var i=e((t=st(t)).h,(r=st(r)).h),a=$(t.c,r.c),o=$(t.l,r.l),c=$(t.opacity,r.opacity);return function(d){return t.h=i(d),t.c=a(d),t.l=o(d),t.opacity=c(d),t+""}}}const Ni=Gi(ht);function Kt(e){return(function t(r){r=+r;function i(a,o){var c=e((a=ct(a)).h,(o=ct(o)).h),d=$(a.s,o.s),l=$(a.l,o.l),x=$(a.opacity,o.opacity);return function(f){return a.h=c(f),a.s=d(f),a.l=l(Math.pow(f,r)),a.opacity=x(f),a+""}}return i.gamma=t,i})(1)}const Oi=Kt(ht);Kt($);const Ii={lab:Ht,rgb:Ei,hcl:Ni,hsl:Ui,cubehelix:Oi};class Jt{constructor(t,r="lab"){s(this,"points");s(this,"interpolate");this.points=t.slice().sort((i,a)=>i.position-a.position),this.interpolate=Ii[r]??Ht}getColorAt(t){if(this.points.length===0)return"#000";if(t<=this.points[0].position)return this.points[0].color;if(t>=this.points[this.points.length-1].position)return this.points[this.points.length-1].color;for(let r=0;r<this.points.length-1;++r){const i=this.points[r],a=this.points[r+1];if(t>=i.position&&t<=a.position){const o=(t-i.position)/(a.position-i.position),c=this.interpolate(i.color,a.color);return Re(c(o)).formatHex()}}return"#000"}generateTexture(){const t=new ImageData(4096,1);for(let r=0;r<4096;++r){const i=r/4095,a=Re(this.getColorAt(i)),o=r*4;t.data[o]=a.r,t.data[o+1]=a.g,t.data[o+2]=a.b,t.data[o+3]=255}return t}}const ft=7,Vi=2048,Di=64,qi=1,$i=2048,Yi=0,Ye=100,Wi=1e4,ji=5e6,Zi=10,Qt=.25,Xi=100;function Hi(e){const t=Math.max(1,Math.floor(e));return 2**Math.floor(Math.log2(t))}const W=class W{constructor(t,r){s(this,"snapshotCallback");s(this,"snapshotDestWidth");s(this,"canvas");s(this,"device");s(this,"queue");s(this,"adapter");s(this,"ctx");s(this,"format");s(this,"mandelbrotNavigator");s(this,"rawTexture");s(this,"rawArrayView");s(this,"rawLayerViews",[]);s(this,"rawBrushTexture");s(this,"rawBrushArrayView");s(this,"rawBrushLayerViews",[]);s(this,"resolvedTexture");s(this,"resolvedArrayView");s(this,"resolvedLayerViews",[]);s(this,"frozenTexture");s(this,"frozenArrayView");s(this,"uniformBufferMandelbrot");s(this,"uniformBufferColor");s(this,"uniformBufferBrush");s(this,"uniformBufferResolve");s(this,"mandelbrotReferenceBuffer");s(this,"pipelineBrush");s(this,"bindGroupBrush");s(this,"pipelineMandelbrot");s(this,"bindGroupMandelbrot");s(this,"pipelineResolve");s(this,"bindGroupResolve");s(this,"pipelineColor");s(this,"bindGroupColor");s(this,"pipelineCount");s(this,"counterBuffer");s(this,"counterReadBuffer");s(this,"counterBindGroup");s(this,"uniformBufferCount");s(this,"unfinishedPixelCount",-1);s(this,"activePixelCount",-1);s(this,"_rafId",null);s(this,"_drawFn",null);s(this,"fps",0);s(this,"isRendering",!1);s(this,"gpuFrameTimeMs",0);s(this,"smoothedGpuTimeMs",0);s(this,"refinementWasGated",!1);s(this,"_fpsFrameCount",0);s(this,"_fpsLastTime",0);s(this,"neutralSize",0);s(this,"shaderPassCompute");s(this,"shaderPassColor");s(this,"width",0);s(this,"height",0);s(this,"antialiasLevel");s(this,"palettePeriod");s(this,"previousMandelbrot");s(this,"previousRenderOptions");s(this,"needRender",!0);s(this,"orbitIncomplete",!1);s(this,"prevGuardedMaxIter",0);s(this,"currentGuardedMaxIter",0);s(this,"currentMaxIterations",0);s(this,"mandelbrotReference",new Float32Array(1e6));s(this,"prevFrameMandelbrot");s(this,"clearHistoryNextFrame",!1);s(this,"cumulativeShiftX",0);s(this,"cumulativeShiftY",0);s(this,"zoomMagnificationThreshold",16);s(this,"zoomFactor",1);s(this,"zoomTarget",1);s(this,"frozenScale",0);s(this,"liveScale",0);s(this,"liveZoomFactor",1);s(this,"zoomReprojectionActive",!1);s(this,"needFreezeSnapshot",!1);s(this,"zoomingIn",!0);s(this,"zoomIdleFrames",0);s(this,"postZoomFullRecompute",!1);s(this,"iterationBatchSize",Ye);s(this,"tileTexture");s(this,"tileTextureView");s(this,"skyboxTexture");s(this,"skyboxTextureView");s(this,"paletteTexture");s(this,"paletteTextureView");s(this,"paletteSampler");s(this,"webcamTexture");s(this,"webcamTileTexture");s(this,"webcamTextureView");s(this,"webcamEnabled",!0);s(this,"time",0);s(this,"lastUpdateTime",0);s(this,"dprMultiplier",1);s(this,"targetFps",60);s(this,"gpuLoadMultiplier",1);this.canvas=t,this.shaderPassCompute=pe,this.shaderPassColor=ie,this.antialiasLevel=r.antialiasLevel,this.palettePeriod=r.palettePeriod,this.time=0}async initialize(t){if(this.mandelbrotNavigator=t,!navigator.gpu)throw new Error("WebGPU non support\xE9");if(this.adapter=await navigator.gpu.requestAdapter(),!this.adapter)throw new Error("Adapter WebGPU introuvable");this.device=await this.adapter.requestDevice(),this.device.label="Engine Device",this.queue=this.device.queue,this.queue.label="Engine Queue",this.ctx=this.canvas.getContext("webgpu"),this.format=navigator.gpu.getPreferredCanvasFormat(),this.ctx.configure({device:this.device,format:this.format,alphaMode:"opaque"}),W._tileTexture||(W._tileTexture=await this._loadTexture(vr)),this.tileTexture=await this._loadTexture(vr),this.tileTextureView=this.tileTexture.createView(),W._skyboxTexture||(W._skyboxTexture=await this._loadTexture(mr)),this.skyboxTexture=await this._loadTexture(mr),this.skyboxTextureView=this.skyboxTexture.createView();const r=new Jt([]).generateTexture();this.paletteTexture=this.device.createTexture({size:[r.width,r.height,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine PaletteTexture"}),this.device.queue.writeTexture({texture:this.paletteTexture},r.data,{bytesPerRow:r.width*4},[r.width,r.height]),this.paletteTextureView=this.paletteTexture.createView(),this.paletteSampler=this.device.createSampler({magFilter:"linear",minFilter:"linear",addressModeU:"repeat",addressModeV:"clamp-to-edge"}),this.webcamTexture=new _i(1920,1080),this.webcamTileTexture=this.device.createTexture({size:[1920,1080,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT}),this.webcamTextureView=this.webcamTileTexture.createView(),this.uniformBufferMandelbrot=this.device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Mandelbrot"}),this.uniformBufferColor=this.device.createBuffer({size:112,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Color"}),this.uniformBufferBrush=this.device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Brush"}),this.uniformBufferResolve=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Resolve"}),this.mandelbrotReferenceBuffer=this.device.createBuffer({size:4*1e6,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot Orbit ReferenceStorage Buffer"}),this.counterBuffer=this.device.createBuffer({size:8,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST,label:"Engine Counter Storage"}),this.counterReadBuffer=this.device.createBuffer({size:8,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,label:"Engine Counter Readback"}),this.uniformBufferCount=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Count"}),await this._createPipelines(),this.resize()}async _createPipelines(){const t=this.device.createShaderModule({code:be,label:"Engine ShaderModule Brush"}),r=this.device.createShaderModule({code:this.shaderPassCompute,label:"Engine ShaderModule Compute"}),i=this.device.createShaderModule({code:yr,label:"Engine ShaderModule Resolve"}),a=this.device.createShaderModule({code:this.shaderPassColor,label:"Engine ShaderModule Color"}),o=this.device.createShaderModule({code:wr,label:"Engine ShaderModule Count"}),c=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Brush"}),d=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Mandelbrot"}),l=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Resolve"}),x=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:3,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:4,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:5,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:6,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:7,visibility:GPUShaderStage.FRAGMENT,sampler:{type:"filtering"}}],label:"Engine BindGroupLayout Color"}),f=Array.from({length:ft},()=>({format:"r32float"}));this.pipelineBrush=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[c]}),vertex:{module:t,entryPoint:"vs_main"},fragment:{module:t,entryPoint:"fs_main",targets:f},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Brush"}),this.pipelineMandelbrot=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[d]}),vertex:{module:r,entryPoint:"vs_main"},fragment:{module:r,entryPoint:"fs_main",targets:f},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Mandelbrot"}),this.pipelineResolve=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[l]}),vertex:{module:i,entryPoint:"vs_main"},fragment:{module:i,entryPoint:"fs_main",targets:f},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Resolve"}),this.pipelineColor=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[x]}),vertex:{module:a,entryPoint:"vs_main"},fragment:{module:a,entryPoint:"fs_main",targets:[{format:this.format}]},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Color"});const h=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}],label:"Engine BindGroupLayout Count"});this.pipelineCount=this.device.createComputePipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[h]}),compute:{module:o,entryPoint:"count_unfinished"},label:"Engine ComputePipeline Count"}),this.bindGroupBrush=void 0,this.bindGroupMandelbrot=void 0,this.bindGroupResolve=void 0,this.bindGroupColor=void 0,this.counterBindGroup=void 0}resize(){var S,g,n,p,M,P,C,A,w,U;const t=(window.devicePixelRatio||1)*this.dprMultiplier,r=this.canvas.parentElement,i=(r==null?void 0:r.clientWidth)||1,a=(r==null?void 0:r.clientHeight)||1;this.width=Math.max(1,Math.round(i*t)),this.height=Math.max(1,Math.round(a*t));const o=((g=(S=this.device)==null?void 0:S.limits)==null?void 0:g.maxTextureDimension2D)??8192;this.width=Math.min(this.width,o),this.height=Math.min(this.height,o),this.canvas.width=this.width,this.canvas.height=this.height,this.canvas.style.width=i+"px",this.canvas.style.height=a+"px",this.ctx.configure({device:this.device,format:this.format,alphaMode:"opaque"}),this.neutralSize=Math.ceil(Math.sqrt(this.width*this.width+this.height*this.height));const c=this.neutralSize;(p=(n=this.rawTexture)==null?void 0:n.destroy)==null||p.call(n),(P=(M=this.rawBrushTexture)==null?void 0:M.destroy)==null||P.call(M),(A=(C=this.resolvedTexture)==null?void 0:C.destroy)==null||A.call(C),(U=(w=this.frozenTexture)==null?void 0:w.destroy)==null||U.call(w);const d=ft,l=b=>{const k=this.device.createTexture({size:{width:c,height:c,depthOrArrayLayers:d},format:"r32float",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST,label:b}),O=k.createView({dimension:"2d-array",baseArrayLayer:0,arrayLayerCount:d,label:b+" ArrayView"}),I=[];for(let G=0;G<d;G++)I.push(k.createView({dimension:"2d",baseArrayLayer:G,arrayLayerCount:1,label:b+` Layer${G}`}));return{texture:k,arrayView:O,layerViews:I}},x=l("Engine RawTexture (A)");this.rawTexture=x.texture,this.rawArrayView=x.arrayView,this.rawLayerViews=x.layerViews;const f=l("Engine RawBrushTexture (B)");this.rawBrushTexture=f.texture,this.rawBrushArrayView=f.arrayView,this.rawBrushLayerViews=f.layerViews;const h=l("Engine ResolvedTexture");this.resolvedTexture=h.texture,this.resolvedArrayView=h.arrayView,this.resolvedLayerViews=h.layerViews;const L=l("Engine FrozenTexture");if(this.frozenTexture=L.texture,this.frozenArrayView=L.arrayView,this.zoomReprojectionActive=!1,this.zoomFactor=1,this.zoomTarget=1,this.liveZoomFactor=1,this.frozenScale=0,this.liveScale=0,this.zoomIdleFrames=0,this.pipelineBrush){const b=this.pipelineBrush.getBindGroupLayout(0);this.bindGroupBrush=this.device.createBindGroup({layout:b,entries:[{binding:0,resource:{buffer:this.uniformBufferBrush}},{binding:1,resource:this.rawArrayView}],label:"Engine BindGroup Brush"})}if(this.pipelineMandelbrot){const b=this.pipelineMandelbrot.getBindGroupLayout(0);this.bindGroupMandelbrot=this.device.createBindGroup({layout:b,entries:[{binding:0,resource:{buffer:this.uniformBufferMandelbrot}},{binding:1,resource:{buffer:this.mandelbrotReferenceBuffer}},{binding:2,resource:this.rawBrushArrayView}],label:"Engine BindGroup Mandelbrot"})}if(this.pipelineResolve){const b=this.pipelineResolve.getBindGroupLayout(0);this.bindGroupResolve=this.device.createBindGroup({layout:b,entries:[{binding:0,resource:{buffer:this.uniformBufferResolve}},{binding:1,resource:this.rawArrayView}],label:"Engine BindGroup Resolve"})}if(this.pipelineColor){const b=this.pipelineColor.getBindGroupLayout(0),k=[{binding:0,resource:{buffer:this.uniformBufferColor}},{binding:1,resource:this.resolvedArrayView},{binding:2,resource:this.tileTextureView},{binding:3,resource:this.skyboxTextureView},{binding:4,resource:this.webcamTextureView},{binding:5,resource:this.paletteTextureView},{binding:6,resource:this.frozenArrayView},{binding:7,resource:this.paletteSampler}];this.bindGroupColor=this.device.createBindGroup({layout:b,entries:k,label:"Engine BindGroup Color"})}if(this.pipelineCount&&this.counterBuffer&&this.uniformBufferCount){const b=this.pipelineCount.getBindGroupLayout(0);this.counterBindGroup=this.device.createBindGroup({layout:b,entries:[{binding:0,resource:this.rawArrayView},{binding:1,resource:{buffer:this.counterBuffer}},{binding:2,resource:{buffer:this.uniformBufferCount}}],label:"Engine BindGroup Count"})}this.prevFrameMandelbrot=void 0,this.previousMandelbrot=void 0,this.previousRenderOptions=void 0,this.needRender=!0,this.unfinishedPixelCount=-1,this.activePixelCount=-1}areObjectsEqual(t,r){return t===void 0||r===void 0?!1:JSON.stringify(t)===JSON.stringify(r)}areColorStopsEqual(t,r){if(t.length!==r.length)return!1;for(const[i,a]of t.entries()){const o=r[i];if(!o||a.color!==o.color||a.position!==o.position)return!1}return!0}async update(t,r){var M,P,C,A;const i=performance.now();this.lastUpdateTime===0&&(this.lastUpdateTime=i);const a=(i-this.lastUpdateTime)/1e3;this.time+=a,this.lastUpdateTime=i,this.needRender=this.needRender||!(this.areObjectsEqual(t,this.previousMandelbrot)&&this.areObjectsEqual(r,this.previousRenderOptions)),r.activateWebcam?(await this.updateWebcamTexture(),this.needRender=!0):(M=this.webcamTexture)==null||M.closeWebcam(),r.activateAnimate&&(this.needRender=!0);const o=this.width/Math.max(1,this.height);let c=((P=this.previousMandelbrot)==null?void 0:P.scale)||1/t.scale;c<1&&(c=1/c),c=Math.sqrt(c)-1;{const w=this.prevFrameMandelbrot&&this.prevFrameMandelbrot.scale!==t.scale;w&&!this.zoomReprojectionActive&&(this.zoomReprojectionActive=!0,this.frozenScale=this.prevFrameMandelbrot.scale,this.zoomingIn=t.scale<this.frozenScale,this.liveScale=this.zoomingIn?this.frozenScale/this.zoomMagnificationThreshold:this.frozenScale*this.zoomMagnificationThreshold,this.needFreezeSnapshot=!0,this.clearHistoryNextFrame=!0,this.zoomIdleFrames=0),w&&this.zoomReprojectionActive&&(this.zoomIdleFrames=0),this.zoomReprojectionActive&&this.frozenScale>0?(this.zoomFactor=this.frozenScale/t.scale,this.liveZoomFactor=this.liveScale/t.scale,this.zoomTarget=this.zoomingIn?this.zoomMagnificationThreshold:1/this.zoomMagnificationThreshold,(this.zoomingIn?this.zoomFactor>=this.zoomMagnificationThreshold:this.zoomFactor<=1/this.zoomMagnificationThreshold)&&(this.needFreezeSnapshot=!0,this.clearHistoryNextFrame=!0,this.frozenScale=this.liveScale,this.liveScale=this.zoomingIn?t.scale/this.zoomMagnificationThreshold:t.scale*this.zoomMagnificationThreshold,this.zoomFactor=this.frozenScale/t.scale,this.liveZoomFactor=this.liveScale/t.scale,this.zoomIdleFrames=0)):this.zoomReprojectionActive||(this.zoomFactor=1,this.zoomTarget=1,this.liveZoomFactor=1),this.zoomReprojectionActive&&!w&&this.prevFrameMandelbrot&&this.prevFrameMandelbrot.scale===t.scale&&(this.zoomIdleFrames++,this.zoomIdleFrames>=Yi&&(this.zoomReprojectionActive=!1,this.zoomFactor=1,this.zoomTarget=1,this.liveZoomFactor=1,this.liveScale=0,this.zoomIdleFrames=0,this.clearHistoryNextFrame=!0,this.postZoomFullRecompute=!0))}if(!this.areColorStopsEqual(r.colorStops,((C=this.previousRenderOptions)==null?void 0:C.colorStops)||[])||r.interpolationMode!==((A=this.previousRenderOptions)==null?void 0:A.interpolationMode)){const w=new Jt(r.colorStops,r.interpolationMode).generateTexture();this.device.queue.writeTexture({texture:this.paletteTexture},w.data,{bytesPerRow:w.width*4},[w.width,w.height]),this.needRender=!0}const d=new Float32Array([r.palettePeriod,r.paletteOffset,r.tessellationLevel,r.shadingLevel,c,this.time,r.activateTessellation?1:0,r.activateShading?1:0,r.activateWebcam?1:0,r.activatePalette?1:0,r.activateSkybox?1:0,r.activateSmoothness?1:0,r.activateZebra?1:0,o,t.angle,r.activateAnimate?1:0,t.mu,this.zoomFactor,this.zoomTarget,this.liveZoomFactor,this.zoomReprojectionActive&&this.frozenScale>0?this.cumulativeShiftX*(this.liveScale/this.frozenScale)/this.neutralSize:0,this.zoomReprojectionActive&&this.frozenScale>0?-this.cumulativeShiftY*(this.liveScale/this.frozenScale)/this.neutralSize:0,r.lightAngle,r.displacementAmount,r.specularPower]);if(this.device.queue.writeBuffer(this.uniformBufferColor,0,d.buffer),!this.needsMoreFrames())return;const l=Math.ceil(t.maxIterations);this.currentMaxIterations=l;const x=this.mandelbrotNavigator.compute_reference_orbit_chunk(Xi,l),f=x.count,h=new Float32Array(Tt.buffer,x.ptr,x.count*4);x.offset<l&&this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer,0,h,0);const L=Math.min(l,f);this.currentGuardedMaxIter=L,this.orbitIncomplete=f<l;const S=f>=l,g=this.zoomReprojectionActive&&this.liveScale>0?this.liveScale:t.scale,n=new Float32Array([t.dx,t.dy,t.mu,g,o,t.angle,this.iterationBatchSize,t.epsilon,r.antialiasLevel,0,L,S?1:0]);this.device.queue.writeBuffer(this.uniformBufferMandelbrot,0,n.buffer);const p=x.offset===0&&!!this.prevFrameMandelbrot;(!this.prevFrameMandelbrot||p)&&(this.clearHistoryNextFrame=!0,this.zoomReprojectionActive=!1,this.zoomFactor=1,this.zoomTarget=1,this.liveZoomFactor=1,this.liveScale=0,this.zoomIdleFrames=0),this.prevFrameMandelbrot&&this.prevFrameMandelbrot.mu!==t.mu&&(this.clearHistoryNextFrame=!0,this.zoomReprojectionActive=!1,this.zoomFactor=1,this.zoomTarget=1,this.liveZoomFactor=1,this.liveScale=0,this.zoomIdleFrames=0),!this.zoomReprojectionActive&&S&&this.prevGuardedMaxIter<l&&this.prevGuardedMaxIter>0&&(this.clearHistoryNextFrame=!0),this.prevGuardedMaxIter=L,this.previousMandelbrot=structuredClone(t),this.previousRenderOptions=structuredClone(r)}async render(){if(!this.needsMoreFrames()||!this.pipelineBrush||!this.pipelineMandelbrot||!this.pipelineResolve||!this.pipelineColor||!this.bindGroupBrush||!this.bindGroupMandelbrot||!this.bindGroupResolve||!this.bindGroupColor||!this.previousMandelbrot)return;const t=this.width/Math.max(1,this.height);let r;this.postZoomFullRecompute?(r=$i,this.postZoomFullRecompute=!1):this.zoomReprojectionActive?r=Di:r=Hi(Vi);const i=r,a=this.clearHistoryNextFrame?1:0;let o=0,c=0;if(!this.clearHistoryNextFrame&&this.prevFrameMandelbrot){const b=this.previousMandelbrot.dx-this.prevFrameMandelbrot.dx,k=this.previousMandelbrot.dy-this.prevFrameMandelbrot.dy,O=this.neutralSize,I=Math.sqrt(t*t+1),G=this.zoomReprojectionActive&&this.liveScale>0?this.liveScale:this.previousMandelbrot.scale;o=-(b*O)/(2*G*I),c=k*O/(2*G*I)}this.clearHistoryNextFrame?(this.cumulativeShiftX=0,this.cumulativeShiftY=0):(this.cumulativeShiftX+=Math.round(o),this.cumulativeShiftY+=Math.round(c));const d=(this.cumulativeShiftX%i+i)%i,l=(this.cumulativeShiftY%i+i)%i,x=this.clearHistoryNextFrame||this.activePixelCount<0||this.iterationBatchSize>Ye||this.activePixelCount<ji*this.gpuLoadMultiplier;x&&this.refinementWasGated&&(this.iterationBatchSize=Ye),this.refinementWasGated=!x;const f=x?1:0,h=new Float32Array([t,this.previousMandelbrot.angle,a,r,i,o,c,this.previousMandelbrot.mu,d,l,this.zoomReprojectionActive?qi:0,f]);this.device.queue.writeBuffer(this.uniformBufferBrush,0,h.buffer);const L=new Float32Array([this.previousMandelbrot.mu,d,l]);this.device.queue.writeBuffer(this.uniformBufferResolve,0,L.buffer);const S=this.device.createCommandEncoder();if(this.needFreezeSnapshot&&this.resolvedTexture&&this.frozenTexture){const b=ft,k=this.neutralSize;S.copyTextureToTexture({texture:this.resolvedTexture},{texture:this.frozenTexture},{width:k,height:k,depthOrArrayLayers:b}),this.needFreezeSnapshot=!1}const g=b=>b.map(k=>({view:k,clearValue:{r:0,g:0,b:0,a:0},loadOp:"clear",storeOp:"store"})),n=S.beginRenderPass({colorAttachments:g(this.rawBrushLayerViews)});n.setPipeline(this.pipelineBrush),n.setBindGroup(0,this.bindGroupBrush),n.draw(6,1,0,0),n.end();const p=S.beginRenderPass({colorAttachments:g(this.rawLayerViews)});if(p.setPipeline(this.pipelineMandelbrot),p.setBindGroup(0,this.bindGroupMandelbrot),p.draw(6,1,0,0),p.end(),this.pipelineCount&&this.counterBindGroup&&this.counterBuffer&&this.counterReadBuffer&&this.uniformBufferCount){const b=this.previousMandelbrot.mu;this.device.queue.writeBuffer(this.uniformBufferCount,0,new Float32Array([b,t,this.previousMandelbrot.angle])),S.clearBuffer(this.counterBuffer,0,8);const k=S.beginComputePass();k.setPipeline(this.pipelineCount),k.setBindGroup(0,this.counterBindGroup),k.dispatchWorkgroups(Math.ceil(this.neutralSize/16),Math.ceil(this.neutralSize/16)),k.end(),S.copyBufferToBuffer(this.counterBuffer,0,this.counterReadBuffer,0,8)}const M=S.beginRenderPass({colorAttachments:g(this.resolvedLayerViews)});M.setPipeline(this.pipelineResolve),M.setBindGroup(0,this.bindGroupResolve),M.draw(6,1,0,0),M.end();const P=this.ctx.getCurrentTexture().createView(),C=S.beginRenderPass({colorAttachments:[{view:P,clearValue:{r:1,g:1,b:1,a:1},loadOp:"clear",storeOp:"store"}]});C.setPipeline(this.pipelineColor),C.setBindGroup(0,this.bindGroupColor),C.draw(6,1,0,0),C.end();const A=performance.now();this.device.queue.submit([S.finish()]),await this.device.queue.onSubmittedWorkDone();const w=performance.now()-A;if(this.gpuFrameTimeMs=w,this.smoothedGpuTimeMs===0?this.smoothedGpuTimeMs=w:this.smoothedGpuTimeMs=this.smoothedGpuTimeMs*(1-Qt)+w*Qt,w>0){const b=1e3/this.targetFps/w,k=this.iterationBatchSize*b;this.iterationBatchSize=Math.round(Math.min(Wi,Math.max(Ye,this.iterationBatchSize*.7+k*.3)))}await this.counterReadBuffer.mapAsync(GPUMapMode.READ);const U=new Uint32Array(this.counterReadBuffer.getMappedRange());if(this.unfinishedPixelCount=U[0],this.activePixelCount=U[1],this.counterReadBuffer.unmap(),this.clearHistoryNextFrame=!1,this.prevFrameMandelbrot={...this.previousMandelbrot},this.snapshotCallback){try{const b=this.snapshotDestWidth??256,k=Math.round(b*9/16),O=this.device.createTexture({size:[b,k,1],format:this.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});{const q=this.device.createCommandEncoder(),Z=q.beginRenderPass({colorAttachments:[{view:O.createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}]});Z.setPipeline(this.pipelineColor),Z.setBindGroup(0,this.bindGroupColor),Z.draw(6,1,0,0),Z.end(),this.device.queue.submit([q.finish()])}const I=q=>q+255&-256,G=b*4,D=I(G),oe=D*k,X=this.device.createBuffer({size:oe,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});{const q=this.device.createCommandEncoder();q.copyTextureToBuffer({texture:O},{buffer:X,offset:0,bytesPerRow:D},{width:b,height:k,depthOrArrayLayers:1}),this.device.queue.submit([q.finish()])}await this.device.queue.onSubmittedWorkDone(),await X.mapAsync(GPUMapMode.READ);const Y=X.getMappedRange(),j=new Uint8ClampedArray(b*k*4),H=new Uint8Array(Y);for(let q=0;q<k;++q)for(let Z=0;Z<b;++Z){const ne=q*D+Z*4,se=(q*b+Z)*4;j[se+0]=H[ne+2],j[se+1]=H[ne+1],j[se+2]=H[ne+0],j[se+3]=H[ne+3]}const te=document.createElement("canvas");te.width=b,te.height=k,te.getContext("2d").putImageData(new ImageData(j,b,k),0,0),X.unmap(),this.snapshotCallback(te.toDataURL("image/png"))}catch{this.snapshotCallback("")}this.snapshotCallback=void 0,this.snapshotDestWidth=void 0}}destroy(){var t,r,i,a,o,c,d,l,x,f,h,L,S,g,n,p,M,P,C,A,w,U,b,k,O,I,G,D,oe;this.stopRenderLoop(),(r=(t=this.rawTexture)==null?void 0:t.destroy)==null||r.call(t),(a=(i=this.rawBrushTexture)==null?void 0:i.destroy)==null||a.call(i),(c=(o=this.resolvedTexture)==null?void 0:o.destroy)==null||c.call(o),(l=(d=this.frozenTexture)==null?void 0:d.destroy)==null||l.call(d),(f=(x=this.mandelbrotReferenceBuffer)==null?void 0:x.destroy)==null||f.call(x),(L=(h=this.uniformBufferMandelbrot)==null?void 0:h.destroy)==null||L.call(h),(g=(S=this.uniformBufferColor)==null?void 0:S.destroy)==null||g.call(S),(p=(n=this.uniformBufferBrush)==null?void 0:n.destroy)==null||p.call(n),(P=(M=this.uniformBufferResolve)==null?void 0:M.destroy)==null||P.call(M),(A=(C=this.counterBuffer)==null?void 0:C.destroy)==null||A.call(C),(U=(w=this.counterReadBuffer)==null?void 0:w.destroy)==null||U.call(w),(k=(b=this.uniformBufferCount)==null?void 0:b.destroy)==null||k.call(b),(O=this.webcamTexture)==null||O.closeWebcam(),(G=(I=this.webcamTileTexture)==null?void 0:I.destroy)==null||G.call(I),(oe=(D=this.paletteTexture)==null?void 0:D.destroy)==null||oe.call(D)}needsMoreFrames(){let t="";return this.needRender?t="needRender":this.snapshotCallback?t="snapshot":this.zoomReprojectionActive?t="zoomActive":this.clearHistoryNextFrame?t="clearHistory":this.orbitIncomplete?t="orbitIncomplete":(this.unfinishedPixelCount<0||this.unfinishedPixelCount>Zi)&&(t=`unfinished=${this.unfinishedPixelCount}`),t!==""}getIterationBatchSize(){return this.iterationBatchSize}startRenderLoop(t){this._drawFn=t,this._rafId===null&&(this._rafId=requestAnimationFrame(async()=>this._loop()))}stopRenderLoop(){this._rafId!==null&&(cancelAnimationFrame(this._rafId),this._rafId=null),this._drawFn=null}async _loop(){if(this._drawFn){const t=this.needsMoreFrames();this.isRendering=t,await this._drawFn(),t&&this._fpsFrameCount++;const r=performance.now();this._fpsLastTime===0&&(this._fpsLastTime=r);const i=r-this._fpsLastTime;i>=1e3&&(this.fps=Math.round(this._fpsFrameCount*1e3/i),this._fpsFrameCount=0,this._fpsLastTime=r),this._rafId=requestAnimationFrame(async()=>this._loop())}else{this._rafId=null;return}}async updateTileTexture(t){var i,a;const r=await this._loadTexture(t);if((a=(i=this.tileTexture)==null?void 0:i.destroy)==null||a.call(i),this.tileTexture=r,this.tileTextureView=this.tileTexture.createView(),this.pipelineColor&&this.resolvedArrayView&&this.frozenArrayView){const o=this.pipelineColor.getBindGroupLayout(0);this.bindGroupColor=this.device.createBindGroup({layout:o,entries:[{binding:0,resource:{buffer:this.uniformBufferColor}},{binding:1,resource:this.resolvedArrayView},{binding:2,resource:this.tileTextureView},{binding:3,resource:this.skyboxTextureView},{binding:4,resource:this.webcamTextureView},{binding:5,resource:this.paletteTextureView},{binding:6,resource:this.frozenArrayView},{binding:7,resource:this.paletteSampler}],label:"Engine BindGroup Color"})}this.needRender=!0}async _loadTexture(t){const r=new Image;r.src=t;try{await r.decode()}catch(o){throw console.warn("\xC9chec du chargement de la texture : "+t,o),o}const i=await createImageBitmap(r),a=this.device.createTexture({size:[i.width,i.height,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine LoadedTexture "+t});return this.device.queue.copyExternalImageToTexture({source:i},{texture:a},[i.width,i.height]),a}async readIterationDataAt(t,r,i,a){var Ee;if(!this.resolvedTexture||!this.device)return null;const o=this.width/Math.max(1,this.height),c=((Ee=this.previousMandelbrot)==null?void 0:Ee.angle)??0,d=t/Math.max(1,i),l=1-r/Math.max(1,a),x=d*2-1,f=l*2-1,h=x*o,L=f,S=Math.sin(c),g=Math.cos(c),n=g*h-S*L,p=S*h+g*L,M=Math.sqrt(o*o+1),P=n/M,C=p/M,A=P*.5+.5,w=C*.5+.5,U=this.neutralSize,b=Math.floor(Math.max(0,Math.min(U-1,A*U))),k=Math.floor(Math.max(0,Math.min(U-1,(1-w)*U))),O=W.ITER_PIXEL_LAYERS,I=1,G=4,D=(fe=>fe+255&-256)(I*G),oe=D*O.length,X=this.device.createBuffer({size:oe,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,label:"Engine IterPixel Readback"}),Y=this.device.createCommandEncoder();for(let fe=0;fe<O.length;fe++)Y.copyTextureToBuffer({texture:this.resolvedTexture,origin:{x:b,y:k,z:O[fe]}},{buffer:X,offset:D*fe,bytesPerRow:D},{width:1,height:1,depthOrArrayLayers:1});this.device.queue.submit([Y.finish()]),await X.mapAsync(GPUMapMode.READ);const j=new Float32Array(X.getMappedRange()),H=D/G,te=j[0*H],q=j[1*H],Z=j[2*H],ne=j[3*H],se=j[4*H];return X.unmap(),X.destroy(),te<0?null:{iter:te,zx:q,zy:Z,derX:ne,derY:se}}async updateWebcamTexture(){var t,r;await((t=this.webcamTexture)==null?void 0:t.openWebcam()),await((r=this.webcamTexture)==null?void 0:r.drawWebGPUTexture(this.webcamTileTexture,this.device))}async getSnapshotPng(t=256){return await new Promise(r=>{this.snapshotCallback=r,this.snapshotDestWidth=t,this.needRender=!0})}};s(W,"_tileTexture"),s(W,"_tileTextureView"),s(W,"_skyboxTexture"),s(W,"_skyboxTextureView"),s(W,"_paletteTexture"),s(W,"_paletteTextureView"),s(W,"ITER_PIXEL_LAYERS",[0,2,3,4,5]);let pt=W,er,tr,rr,ir,ar,or,Ae,vt,nr,sr,lr;yt=_t({__name:"Mandelbrot",props:je({mu:{default:4},epsilon:{default:1e-5},colorStops:{default:()=>[{color:"#002500",position:0},{color:"#175b3d",position:.16},{color:"#ffceb6",position:.26},{color:"#edffff",position:.42},{color:"#ff8fbc",position:.7016397849462366},{color:"#a6003e",position:.8575},{color:"#100000",position:1}]},palettePeriod:{default:100},paletteOffset:{default:0},antialiasLevel:{default:1},tessellationLevel:{default:2},shadingLevel:{default:1},lightAngle:{default:3.927},displacementAmount:{default:.01},specularPower:{default:4},activatePalette:{type:Boolean,default:!0},activateSkybox:{type:Boolean,default:!1},activateTessellation:{type:Boolean,default:!1},activateWebcam:{type:Boolean,default:!1},activateShading:{type:Boolean,default:!0},activateZebra:{type:Boolean,default:!1},activateSmoothness:{type:Boolean,default:!0},activateAnimate:{type:Boolean,default:!1},dprMultiplier:{default:.5},maxIterationMultiplier:{default:.1},targetFps:{default:60},gpuLoadMultiplier:{default:1},interpolationMode:{default:"lab"}},{cx:{default:"-1.9771995110313272619112808106831597"},cxModifiers:{},cy:{default:"0.0"},cyModifiers:{},scale:{default:"2.5"},scaleModifiers:{},angle:{default:0},angleModifiers:{}}),emits:["update:cx","update:cy","update:scale","update:angle"],setup(e,{expose:t}){const r=bt(null);let i=null,a=null,o,c=!1;const d=re(e,"cx"),l=re(e,"cy"),x=re(e,"scale"),f=re(e,"angle");We(()=>[d.value,l.value,x.value,f.value],([n,p,M,P],[C,A,w,U])=>{c||o&&(!n||!p||!M||((n!==C||p!==A)&&o.origin(n,p),M!==w&&o.scale(M),P!==U&&o.angle(Number(P))))},{flush:"sync"});const h=e;We(()=>h.dprMultiplier,n=>{a&&(a.dprMultiplier=n,g())}),We(()=>h.targetFps,n=>{a&&(a.targetFps=n)}),We(()=>h.gpuLoadMultiplier,n=>{a&&(a.gpuLoadMultiplier=n)});async function L(){if(!a||!o)return;const n=o.step();if(!n)return;const[p,M]=n,[P,C,A,w]=o.get_params();c=!0,d.value=P,l.value=C,x.value=A,f.value=parseFloat(w),await ra(),c=!1;const U=Math.min(Math.max(100,1e3*h.maxIterationMultiplier*Math.log2(1/parseFloat(A))),1e5);await a.update({cx:P,cy:C,dx:parseFloat(p),dy:parseFloat(M),mu:h.mu,scale:parseFloat(A),angle:parseFloat(w),maxIterations:U,epsilon:h.epsilon},{shadingLevel:h.shadingLevel,tessellationLevel:h.tessellationLevel,lightAngle:h.lightAngle,displacementAmount:h.displacementAmount,specularPower:h.specularPower,antialiasLevel:h.antialiasLevel,palettePeriod:h.palettePeriod,paletteOffset:h.paletteOffset,colorStops:ia(h.colorStops),interpolationMode:h.interpolationMode,activateShading:h.activateShading,activateTessellation:h.activateTessellation,activateWebcam:h.activateWebcam,activatePalette:h.activatePalette,activateSkybox:h.activateSkybox,activateSmoothness:h.activateSmoothness,activateZebra:h.activateZebra,activateAnimate:h.activateAnimate}),await a.render()}async function S(){if(r.value)return i=r.value,o=new Ke(d.value,l.value,x.value,Number(f.value)),o.origin(d.value,l.value),o.scale(x.value),o.angle(Number(f.value)),a=new pt(i,{activatePalette:h.activatePalette,activateSkybox:h.activateSkybox,shadingLevel:h.shadingLevel,tessellationLevel:h.tessellationLevel,lightAngle:h.lightAngle,displacementAmount:h.displacementAmount,specularPower:h.specularPower,antialiasLevel:h.antialiasLevel,palettePeriod:h.palettePeriod,paletteOffset:h.paletteOffset,colorStops:h.colorStops,interpolationMode:h.interpolationMode,activateShading:h.activateShading,activateTessellation:h.activateTessellation,activateWebcam:h.activateWebcam,activateSmoothness:h.activateSmoothness,activateZebra:h.activateZebra,activateAnimate:h.activateAnimate}),a.initialize(o)}async function g(){if(!r.value||!a)return;const n=r.value.getBoundingClientRect();r.value.width=n.width,r.value.height=n.height,a.resize()}return gr(async()=>{await S(),window.addEventListener("resize",g),await g(),a&&a.startRenderLoop(L)}),_r(()=>{a==null||a.stopRenderLoop(),window.removeEventListener("resize",g)}),t({getCanvas:()=>r.value,getEngine:()=>a,getNavigator:()=>o,translate:(n,p)=>o==null?void 0:o.translate(n,p),translateDirect:(n,p)=>o==null?void 0:o.translate_direct(n,p),rotate:n=>o==null?void 0:o.rotate(n),angle:n=>o==null?void 0:o.angle(n),zoom:n=>o==null?void 0:o.zoom(n),step:()=>o==null?void 0:o.step(),getParams:()=>o==null?void 0:o.get_params(),drawOnce:async()=>L(),resize:async()=>g(),initialize:async()=>S()}),(n,p)=>(Fe(),Ue("canvas",{ref_key:"canvasRef",ref:r},null,512))}}),er={class:"mobile-nav-controls"},tr={key:0,class:"directional-controls"},rr={width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",style:{"vertical-align":"middle","margin-right":"4px"}},ir=_t({__name:"MobileNavigationControls",props:je({mandelbrotRef:{}},{expanded:{type:Boolean,default:!1},expandedModifiers:{}}),emits:["update:expanded"],setup(e){const t=e,r=re(e,"expanded"),i=bt(null);let a=null;const o=()=>{r.value=!r.value,r.value||d()},c=g=>{g.preventDefault(),g.stopPropagation(),o()},d=()=>{i.value=null,a!==null&&(clearInterval(a),a=null)},l=g=>{i.value=g;const n=.01,p=()=>{if(t.mandelbrotRef)switch(g){case"north":t.mandelbrotRef.translate(0,n);break;case"south":t.mandelbrotRef.translate(0,-n);break;case"west":t.mandelbrotRef.translate(-n,0);break;case"east":t.mandelbrotRef.translate(n,0);break}};p(),a=window.setInterval(p,16)},x=g=>{i.value=`rotate-${g}`;const n=.025,p=()=>{t.mandelbrotRef&&(g==="left"?t.mandelbrotRef.rotate(n):t.mandelbrotRef.rotate(-n))};p(),a=window.setInterval(p,16)},f=g=>{i.value=`zoom-${g}`;const n=.97,p=()=>{t.mandelbrotRef&&(g==="in"?t.mandelbrotRef.zoom(n):t.mandelbrotRef.zoom(1/n))};p(),a=window.setInterval(p,16)},h=(g,n)=>{g.preventDefault(),n()},L=g=>{g.preventDefault(),d()};function S(g){g.preventDefault(),g.stopPropagation(),window.location.href=new URL("./presentation/",window.location.href).href}return(g,n)=>(Fe(),Ue("div",er,[T("button",{class:ce(["nav-button compass-button",{active:r.value}]),onClick:o,onTouchend:c,"aria-label":"Toggle navigation"},[...n[16]||(n[16]=[aa('<svg width="32" height="32" viewBox="0 0 24 24" fill="none" class="nav-icon" data-v-1e35ba8c><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" data-v-1e35ba8c></circle><path d="M12 2 L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-1e35ba8c></path><path d="M12 18 L12 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-1e35ba8c></path><path d="M2 12 L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-1e35ba8c></path><path d="M18 12 L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-1e35ba8c></path><path d="M12 7 L10 12 L12 14 L14 12 Z" fill="currentColor" data-v-1e35ba8c></path><text x="12" y="6" text-anchor="middle" font-size="6" fill="currentColor" font-weight="bold" data-v-1e35ba8c>N</text></svg>',1)])],34),xt(oa,{name:"fade"},{default:na(()=>[r.value?(Fe(),Ue("div",tr,[T("button",{class:ce(["nav-button direction-button north",{active:i.value==="north"}]),onTouchstart:n[0]||(n[0]=p=>h(p,()=>l("north"))),onTouchend:L,onMousedown:n[1]||(n[1]=p=>l("north")),onMouseup:d,onMouseleave:d,"aria-label":"Move North"},[...n[17]||(n[17]=[T("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("path",{d:"M12 5 L18 11 L15 11 L15 19 L9 19 L9 11 L6 11 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),T("button",{class:ce(["nav-button direction-button south",{active:i.value==="south"}]),onTouchstart:n[2]||(n[2]=p=>h(p,()=>l("south"))),onTouchend:L,onMousedown:n[3]||(n[3]=p=>l("south")),onMouseup:d,onMouseleave:d,"aria-label":"Move South"},[...n[18]||(n[18]=[T("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("path",{d:"M12 19 L6 13 L9 13 L9 5 L15 5 L15 13 L18 13 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),T("button",{class:ce(["nav-button direction-button west",{active:i.value==="west"}]),onTouchstart:n[4]||(n[4]=p=>h(p,()=>l("west"))),onTouchend:L,onMousedown:n[5]||(n[5]=p=>l("west")),onMouseup:d,onMouseleave:d,"aria-label":"Move West"},[...n[19]||(n[19]=[T("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("path",{d:"M5 12 L11 18 L11 15 L19 15 L19 9 L11 9 L11 6 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),T("button",{class:ce(["nav-button direction-button east",{active:i.value==="east"}]),onTouchstart:n[6]||(n[6]=p=>h(p,()=>l("east"))),onTouchend:L,onMousedown:n[7]||(n[7]=p=>l("east")),onMouseup:d,onMouseleave:d,"aria-label":"Move East"},[...n[20]||(n[20]=[T("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("path",{d:"M19 12 L13 6 L13 9 L5 9 L5 15 L13 15 L13 18 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),T("button",{class:ce(["nav-button corner-button rotate-left",{active:i.value==="rotate-left"}]),onTouchstart:n[8]||(n[8]=p=>h(p,()=>x("left"))),onTouchend:L,onMousedown:n[9]||(n[9]=p=>x("left")),onMouseup:d,onMouseleave:d,"aria-label":"Rotate Left"},[...n[21]||(n[21]=[T("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("path",{d:"M16 8 A6 6 0 1 0 8 16",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round"}),T("path",{d:"M5 16 L8 16 L8 13",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round","stroke-linejoin":"round"})],-1)])],34),T("button",{class:ce(["nav-button corner-button rotate-right",{active:i.value==="rotate-right"}]),onTouchstart:n[10]||(n[10]=p=>h(p,()=>x("right"))),onTouchend:L,onMousedown:n[11]||(n[11]=p=>x("right")),onMouseup:d,onMouseleave:d,"aria-label":"Rotate Right"},[...n[22]||(n[22]=[T("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("path",{d:"M8 8 A6 6 0 1 1 16 16",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round"}),T("path",{d:"M19 16 L16 16 L16 13",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round","stroke-linejoin":"round"})],-1)])],34),T("button",{class:ce(["nav-button corner-button zoom-out",{active:i.value==="zoom-out"}]),onTouchstart:n[12]||(n[12]=p=>h(p,()=>f("out"))),onTouchend:L,onMousedown:n[13]||(n[13]=p=>f("out")),onMouseup:d,onMouseleave:d,"aria-label":"Zoom Out"},[...n[23]||(n[23]=[T("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("circle",{cx:"11",cy:"11",r:"7",stroke:"currentColor","stroke-width":"2"}),T("path",{d:"M18 18 L22 22",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"}),T("path",{d:"M8 11 L14 11",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"})],-1)])],34),T("button",{class:ce(["nav-button corner-button zoom-in",{active:i.value==="zoom-in"}]),onTouchstart:n[14]||(n[14]=p=>h(p,()=>f("in"))),onTouchend:L,onMousedown:n[15]||(n[15]=p=>f("in")),onMouseup:d,onMouseleave:d,"aria-label":"Zoom In"},[...n[24]||(n[24]=[T("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("circle",{cx:"11",cy:"11",r:"7",stroke:"currentColor","stroke-width":"2"}),T("path",{d:"M18 18 L22 22",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"}),T("path",{d:"M11 8 L11 14",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"}),T("path",{d:"M8 11 L14 11",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"})],-1)])],34),T("button",{class:"presentation-button",onTouchend:la(S,["prevent","stop"]),onClick:S,"aria-label":"Pr\xE9sentation"},[(Fe(),Ue("svg",rr,[...n[25]||(n[25]=[T("rect",{x:"2",y:"3",width:"20",height:"14",rx:"2",ry:"2"},null,-1),T("line",{x1:"8",y1:"21",x2:"16",y2:"21"},null,-1),T("line",{x1:"12",y1:"17",x2:"12",y2:"21"},null,-1)])])),n[26]||(n[26]=sa(" Pr\xE9sentation ",-1))],32)])):ua("",!0)]),_:1})]))}}),ar=br(ir,[["__scopeId","data-v-1e35ba8c"]]),or={style:{position:"relative",width:"100%",height:"100%"}},Ae=.01,vt=.025,nr=300,sr=30,lr=_t({__name:"MandelbrotController",props:je({mu:{},epsilon:{},colorStops:{},antialiasLevel:{},tessellationLevel:{},shadingLevel:{},lightAngle:{},displacementAmount:{},specularPower:{},palettePeriod:{},paletteOffset:{},activatePalette:{type:Boolean},activateSkybox:{type:Boolean},activateTessellation:{type:Boolean},activateWebcam:{type:Boolean},activateShading:{type:Boolean},activateZebra:{type:Boolean},activateSmoothness:{type:Boolean},activateAnimate:{type:Boolean},dprMultiplier:{},maxIterationMultiplier:{},targetFps:{},gpuLoadMultiplier:{},interpolationMode:{},pickerMode:{type:Boolean}},{cx:{},cxModifiers:{},cy:{},cyModifiers:{},scale:{},scaleModifiers:{},angle:{},angleModifiers:{},mobileNavExpanded:{type:Boolean,default:!1},mobileNavExpandedModifiers:{}}),emits:je(["cursorCoord","palettePick"],["update:cx","update:cy","update:scale","update:angle","update:mobileNavExpanded"]),setup(e,{expose:t,emit:r}){const i=re(e,"cx"),a=re(e,"cy"),o=re(e,"scale"),c=re(e,"angle"),d=re(e,"mobileNavExpanded"),l=e,x=r,f=bt(null);let h=!1,L=0,S=0;function g(){var F;if(!h)return;const u=Y();if(!u)return;const v=u.getBoundingClientRect(),_=L-v.left,z=S-v.top,B=(F=f.value)==null?void 0:F.getNavigator();if(!B)return;const E=B.pixel_to_complex(_,z,v.width,v.height);!E||E.length<2||x("cursorCoord",{re:E[0],im:E[1]},L,S)}function n(u){h=!0,L=u.clientX,S=u.clientY}function p(){h=!1,x("cursorCoord",null,0,0)}const M={};t({getCanvas:Y,getEngine:()=>{var u;return((u=f.value)==null?void 0:u.getEngine())??null}});let P=!1,C=!1,A=0,w=0,U=0,b=0,k=0,O=!1,I=0,G=null,D=0,oe=0,X=0;function Y(){var u;return((u=f.value)==null?void 0:u.getCanvas())??null}function j(u){const v=Y();if(!v)return{x:0,y:0,width:0,height:0};const _=v.getBoundingClientRect();return{x:u.clientX-_.left,y:u.clientY-_.top,width:_.width,height:_.height}}function H(u){var _,z,B;const v=(z=(_=u.target)==null?void 0:_.tagName)==null?void 0:z.toLowerCase();v==="input"||v==="textarea"||v==="select"||(B=u.target)!=null&&B.isContentEditable||(M[u.code]=!0)}function te(u){M[u.code]=!1}function q(u){var _,z;if(l.pickerMode){u.preventDefault();return}u.preventDefault();const v=.95;u.deltaY<0?(_=f.value)==null||_.zoom(v):(z=f.value)==null||z.zoom(1/v),g()}function Z(u,v){var Se;const _=Y();if(!_)return;const z=_.getBoundingClientRect(),B=u-z.left,E=v-z.top,F=z.width,V=z.height,K=F/V,le=(B-F/2)/F*2,ue=(E-V/2)/V*2;(Se=f.value)==null||Se.translateDirect(le*K,-ue)}function ne(u){if(l.pickerMode){u.preventDefault();return}u.preventDefault(),Z(u.clientX,u.clientY)}function se(u){if(l.pickerMode||u.touches.length!==0)return;const v=Date.now(),_=u.changedTouches[0];if(!_)return;const z=_.clientX,B=_.clientY;v-D<nr&&Math.hypot(z-oe,B-X)<sr?(u.preventDefault(),Z(z,B),D=0):(D=v,oe=z,X=B)}function Ee(u){if(l.pickerMode){u.preventDefault(),fe(u);return}if(u.button===2)C=!0;else{P=!0;const v=j(u);A=v.x,w=v.y}}async function fe(u){var V;const v=(V=f.value)==null?void 0:V.getEngine();if(!v)return;const _=Y();if(!_)return;const z=_.getBoundingClientRect(),B=u.clientX-z.left,E=u.clientY-z.top,F=await v.readIterationDataAt(B,E,z.width,z.height);F&&x("palettePick",F,u.clientX,u.clientY)}function ur(u){var V,K;if(L=u.clientX,S=u.clientY,g(),l.pickerMode)return;const v=j(u);if(C){const le=Y();if(!le)return;const ue=le.getBoundingClientRect(),Se=ue.width/2,mt=ue.height/2,gt=v.x,Ki=v.y,Ji=Math.atan2(Ki-mt,gt-Se);(V=f.value)==null||V.angle(Ji);return}if(!P)return;const _=v.width,z=v.height,B=_/z,E=(v.x-A)/_*2,F=(v.y-w)/z*2;(K=f.value)==null||K.translateDirect(-E*B,F),A=v.x,w=v.y}function cr(u){l.pickerMode||(u.button===2?C=!1:P=!1)}function dr(u){var _;if(l.pickerMode)return;const v=Y();if(v){if(u.touches.length===1){P=!0;const z=u.touches[0],B=v.getBoundingClientRect();A=z.clientX-B.left,w=z.clientY-B.top}else if(u.touches.length===2){P=!1,O=!0;const[z,B]=u.touches;U=Math.hypot(B.clientX-z.clientX,B.clientY-z.clientY),I=U,b=Math.atan2(B.clientY-z.clientY,B.clientX-z.clientX);const E=(_=f.value)==null?void 0:_.getParams();k=E?parseFloat(E[3]):0}}}function hr(u){var _,z,B;if(l.pickerMode)return;const v=Y();if(v){if(P&&u.touches.length===1){const E=u.touches[0],F=v.getBoundingClientRect(),V=E.clientX-F.left,K=E.clientY-F.top,le=F.width,ue=F.height,Se=le/ue,mt=(V-A)/le*2,gt=(K-w)/ue*2;(_=f.value)==null||_.translateDirect(-mt*Se,gt),A=V,w=K}else if(O&&u.touches.length===2){const[E,F]=u.touches,V=Math.hypot(F.clientX-E.clientX,F.clientY-E.clientY),K=Math.atan2(F.clientY-E.clientY,F.clientX-E.clientX),le=I/V;I=V,(z=f.value)==null||z.zoom(le);const ue=K-b;(B=f.value)==null||B.angle(k+ue)}}}function fr(u){u.touches.length===0&&(P=!1,O=!1)}function pr(){var u,v,_,z,B,E,F,V;if(!l.pickerMode){M.KeyW&&((u=f.value)==null||u.translate(0,Ae)),M.KeyS&&((v=f.value)==null||v.translate(0,-Ae)),M.KeyA&&((_=f.value)==null||_.translate(-Ae,0)),M.KeyD&&((z=f.value)==null||z.translate(Ae,0)),M.KeyQ&&((B=f.value)==null||B.rotate(vt)),M.KeyE&&((E=f.value)==null||E.rotate(-vt));const K=.95;M.KeyR&&((F=f.value)==null||F.zoom(K)),M.KeyF&&((V=f.value)==null||V.zoom(1/K))}g(),G=window.setTimeout(pr,16)}return gr(async()=>{const u=Y();u&&(window.addEventListener("keydown",H),window.addEventListener("keyup",te),u.addEventListener("wheel",q,{passive:!1}),u.addEventListener("mousedown",Ee),u.addEventListener("dblclick",ne),u.addEventListener("contextmenu",v=>v.preventDefault()),u.addEventListener("mouseenter",n),u.addEventListener("mouseleave",p),window.addEventListener("mousemove",ur),window.addEventListener("mouseup",cr),u.addEventListener("touchstart",dr,{passive:!1}),u.addEventListener("touchmove",hr,{passive:!1}),u.addEventListener("touchend",fr,{passive:!1}),u.addEventListener("touchend",se,{passive:!1}),pr())}),_r(()=>{G!==null&&clearTimeout(G);const u=Y();window.removeEventListener("keydown",H),window.removeEventListener("keyup",te),window.removeEventListener("mousemove",ur),window.removeEventListener("mouseup",cr),u&&(u.removeEventListener("wheel",q),u.removeEventListener("mousedown",Ee),u.removeEventListener("dblclick",ne),u.removeEventListener("contextmenu",v=>v.preventDefault()),u.removeEventListener("mouseenter",n),u.removeEventListener("mouseleave",p),u.removeEventListener("touchstart",dr),u.removeEventListener("touchmove",hr),u.removeEventListener("touchend",fr),u.removeEventListener("touchend",se))}),(u,v)=>(Fe(),Ue("div",or,[xt(yt,{ref_key:"mandelbrotRef",ref:f,scale:o.value,"onUpdate:scale":v[0]||(v[0]=_=>o.value=_),angle:c.value,"onUpdate:angle":v[1]||(v[1]=_=>c.value=_),cx:i.value,"onUpdate:cx":v[2]||(v[2]=_=>i.value=_),cy:a.value,"onUpdate:cy":v[3]||(v[3]=_=>a.value=_),mu:l.mu,epsilon:l.epsilon,antialiasLevel:l.antialiasLevel,shadingLevel:l.shadingLevel,lightAngle:l.lightAngle,displacementAmount:l.displacementAmount,specularPower:l.specularPower,palettePeriod:l.palettePeriod,tessellationLevel:l.tessellationLevel,colorStops:l.colorStops,activatePalette:l.activatePalette,activateSkybox:l.activateSkybox,activateTessellation:l.activateTessellation,activateWebcam:l.activateWebcam,activateShading:l.activateShading,activateZebra:l.activateZebra,activateSmoothness:l.activateSmoothness,activateAnimate:l.activateAnimate,paletteOffset:l.paletteOffset,dprMultiplier:l.dprMultiplier,maxIterationMultiplier:l.maxIterationMultiplier,targetFps:l.targetFps,gpuLoadMultiplier:l.gpuLoadMultiplier,interpolationMode:l.interpolationMode},null,8,["scale","angle","cx","cy","mu","epsilon","antialiasLevel","shadingLevel","lightAngle","displacementAmount","specularPower","palettePeriod","tessellationLevel","colorStops","activatePalette","activateSkybox","activateTessellation","activateWebcam","activateShading","activateZebra","activateSmoothness","activateAnimate","paletteOffset","dprMultiplier","maxIterationMultiplier","targetFps","gpuLoadMultiplier","interpolationMode"]),xt(ar,{"mandelbrot-ref":f.value,expanded:d.value,"onUpdate:expanded":v[4]||(v[4]=_=>d.value=_)},null,8,["mandelbrot-ref","expanded"])]))}}),xr=br(lr,[["__scopeId","data-v-fb823e0b"]])})();export{xr as M,yt as _,ca as __tla};
