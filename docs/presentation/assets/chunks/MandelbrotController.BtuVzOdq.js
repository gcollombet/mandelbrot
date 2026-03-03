var Ji=Object.defineProperty;var Qi=(pe,ie,be)=>ie in pe?Ji(pe,ie,{enumerable:!0,configurable:!0,writable:!0,value:be}):pe[ie]=be;var n=(pe,ie,be)=>Qi(pe,typeof ie!="symbol"?ie+"":ie,be);import{aq as ea,ar as pr,as as vr,d as _t,at as re,z as $e,p as mr,s as gr,o as Ye,c as We,au as Ze,y as bt,U as ta,av as ra,j as k,an as ia,n as ce,J as xt,T as aa,w as oa,e as na,_ as _r}from"./framework.CV9a6mWJ.js";let br,yt,sa=(async()=>{const pe=`// Mandelbrot progressive-iteration shader.
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
  // deep / paletteRepeat : coordonn\xE9e normalis\xE9e par la p\xE9riode (pour palette et tessellation)
  let deep_norm = v_smooth * 2.0 / paletteRepeat;
  let deep = v * 2.0;

  let disp = parameters.displacementAmount;
  let tessColor = tile_tessellation(tileTex, deep_norm * 2.0 * disp + dx, deep_norm * 2.0 * disp + dy, parameters.tessellationLevel);
  let webCamColor = tile_tessellation(
    webcamTex,
    deep_norm + dx + cos(parameters.time * 0.1),
    deep_norm + dy + sin(parameters.time * 0.15),
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
        uv_live
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
    uv_frozen
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
`,xr=`// Resolve pass: replaces remaining sentinels with a snapped parent pixel.
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
`,yr=`// Compute pass: counts pixels that still need rendering work.
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
`,wr=async(e={},t)=>{let r;if(t.startsWith("data:")){const i=t.replace(/^data:.*?base64,/,"");let a;if(typeof Buffer=="function"&&typeof Buffer.from=="function")a=Buffer.from(i,"base64");else if(typeof atob=="function"){const o=atob(i);a=new Uint8Array(o.length);for(let c=0;c<o.length;c++)a[c]=o.charCodeAt(c)}else throw new Error("Cannot decode base64-encoded data URL");r=await WebAssembly.instantiate(a,e)}else{const i=await fetch(t),a=i.headers.get("Content-Type")||"";if("instantiateStreaming"in WebAssembly&&a.startsWith("application/wasm"))r=await WebAssembly.instantiateStreaming(i,e);else{const o=await i.arrayBuffer();r=await WebAssembly.instantiate(o,e)}}return r.instance.exports};let m;function zr(e){m=e}function je(e,t){try{return e.apply(this,t)}catch(r){let i=(function(){try{return r instanceof Error?`${r.message}

Stack:
${r.stack}`:r.toString()}catch{return"<failed to stringify thrown value>"}})();throw console.error("wasm-bindgen: imported JS function that was not marked as `catch` threw an error:",i),r}}let Fe=null;function Ue(){return(Fe===null||Fe.byteLength===0)&&(Fe=new Uint8Array(m.memory.buffer)),Fe}let Ge=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0});Ge.decode();const Mr=2146435072;let Xe=0;function Tr(e,t){return Xe+=t,Xe>=Mr&&(Ge=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0}),Ge.decode(),Xe=t),Ge.decode(Ue().subarray(e,e+t))}function wt(e,t){return e=e>>>0,Tr(e,t)}function C(e){if(typeof e!="number")throw new Error(`expected a number argument, found ${typeof e}`)}let xe=null;function kr(){return(xe===null||xe.buffer.detached===!0||xe.buffer.detached===void 0&&xe.buffer!==m.memory.buffer)&&(xe=new DataView(m.memory.buffer)),xe}function He(e,t){e=e>>>0;const r=kr(),i=[];for(let a=e;a<e+4*t;a+=4)i.push(m.__wbindgen_export_0.get(r.getUint32(a,!0)));return m.__externref_drop_slice(e,t),i}let de=0;const Le=new TextEncoder;"encodeInto"in Le||(Le.encodeInto=function(e,t){const r=Le.encode(e);return t.set(r),{read:e.length,written:r.length}});function ye(e,t,r){if(typeof e!="string")throw new Error(`expected a string argument, found ${typeof e}`);if(r===void 0){const d=Le.encode(e),s=t(d.length,1)>>>0;return Ue().subarray(s,s+d.length).set(d),de=d.length,s}let i=e.length,a=t(i,1)>>>0;const o=Ue();let c=0;for(;c<i;c++){const d=e.charCodeAt(c);if(d>127)break;o[a+c]=d}if(c!==i){c!==0&&(e=e.slice(c)),a=r(a,i,i=c+e.length*3,1)>>>0;const d=Ue().subarray(a+c,a+i),s=Le.encodeInto(e,d);if(s.read!==e.length)throw new Error("failed to pass whole string");c+=s.written,a=r(a,i,c,1)>>>0}return de=c,a}const zt=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(e=>m.__wbg_mandelbrotnavigator_free(e>>>0,1));class Ke{__destroy_into_raw(){const t=this.__wbg_ptr;return this.__wbg_ptr=0,zt.unregister(this),t}free(){const t=this.__destroy_into_raw();m.__wbg_mandelbrotnavigator_free(t,0)}get_params(){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");C(this.__wbg_ptr);const t=m.mandelbrotnavigator_get_params(this.__wbg_ptr);var r=He(t[0],t[1]).slice();return m.__wbindgen_free(t[0],t[1]*4,4),r}rotate_direct(t){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");C(this.__wbg_ptr),m.mandelbrotnavigator_rotate_direct(this.__wbg_ptr,t)}pixel_to_complex(t,r,i,a){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");C(this.__wbg_ptr);const o=m.mandelbrotnavigator_pixel_to_complex(this.__wbg_ptr,t,r,i,a);var c=He(o[0],o[1]).slice();return m.__wbindgen_free(o[0],o[1]*4,4),c}translate_direct(t,r){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");C(this.__wbg_ptr),m.mandelbrotnavigator_translate_direct(this.__wbg_ptr,t,r)}get_reference_orbit_len(){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");return C(this.__wbg_ptr),m.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr)>>>0}compute_reference_orbit_ptr(t){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");C(this.__wbg_ptr),C(t);const r=m.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr,t);return we.__wrap(r)}get_reference_orbit_capacity(){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");return C(this.__wbg_ptr),m.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr)>>>0}compute_reference_orbit_chunk(t,r){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");C(this.__wbg_ptr),C(t),C(r);const i=m.mandelbrotnavigator_compute_reference_orbit_chunk(this.__wbg_ptr,t,r);return we.__wrap(i)}constructor(t,r,i,a){const o=ye(t,m.__wbindgen_malloc,m.__wbindgen_realloc),c=de,d=ye(r,m.__wbindgen_malloc,m.__wbindgen_realloc),s=de,x=ye(i,m.__wbindgen_malloc,m.__wbindgen_realloc),p=de,h=m.mandelbrotnavigator_new(o,c,d,s,x,p,a);return this.__wbg_ptr=h>>>0,zt.register(this,this.__wbg_ptr,this),this}step(){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");C(this.__wbg_ptr);const t=m.mandelbrotnavigator_step(this.__wbg_ptr);var r=He(t[0],t[1]).slice();return m.__wbindgen_free(t[0],t[1]*4,4),r}zoom(t){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");C(this.__wbg_ptr),m.mandelbrotnavigator_zoom(this.__wbg_ptr,t)}angle(t){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");C(this.__wbg_ptr),m.mandelbrotnavigator_angle(this.__wbg_ptr,t)}scale(t){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");C(this.__wbg_ptr);const r=ye(t,m.__wbindgen_malloc,m.__wbindgen_realloc),i=de;m.mandelbrotnavigator_scale(this.__wbg_ptr,r,i)}origin(t,r){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");C(this.__wbg_ptr);const i=ye(t,m.__wbindgen_malloc,m.__wbindgen_realloc),a=de,o=ye(r,m.__wbindgen_malloc,m.__wbindgen_realloc),c=de;m.mandelbrotnavigator_origin(this.__wbg_ptr,i,a,o,c)}rotate(t){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");C(this.__wbg_ptr),m.mandelbrotnavigator_rotate(this.__wbg_ptr,t)}translate(t,r){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");C(this.__wbg_ptr),m.mandelbrotnavigator_translate(this.__wbg_ptr,t,r)}}Symbol.dispose&&(Ke.prototype[Symbol.dispose]=Ke.prototype.free),typeof FinalizationRegistry>"u"||new FinalizationRegistry(e=>m.__wbg_mandelbrotstep_free(e>>>0,1));const Mt=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(e=>m.__wbg_orbitbufferinfo_free(e>>>0,1));class we{constructor(){throw new Error("cannot invoke `new` directly")}static __wrap(t){t=t>>>0;const r=Object.create(we.prototype);return r.__wbg_ptr=t,Mt.register(r,r.__wbg_ptr,r),r}__destroy_into_raw(){const t=this.__wbg_ptr;return this.__wbg_ptr=0,Mt.unregister(this),t}free(){const t=this.__destroy_into_raw();m.__wbg_orbitbufferinfo_free(t,0)}get ptr(){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");return C(this.__wbg_ptr),m.__wbg_get_orbitbufferinfo_ptr(this.__wbg_ptr)>>>0}set ptr(t){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");C(this.__wbg_ptr),C(t),m.__wbg_set_orbitbufferinfo_ptr(this.__wbg_ptr,t)}get offset(){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");return C(this.__wbg_ptr),m.__wbg_get_orbitbufferinfo_offset(this.__wbg_ptr)>>>0}set offset(t){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");C(this.__wbg_ptr),C(t),m.__wbg_set_orbitbufferinfo_offset(this.__wbg_ptr,t)}get count(){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");return C(this.__wbg_ptr),m.__wbg_get_orbitbufferinfo_count(this.__wbg_ptr)>>>0}set count(t){if(this.__wbg_ptr==0)throw new Error("Attempt to use a moved value");C(this.__wbg_ptr),C(t),m.__wbg_set_orbitbufferinfo_count(this.__wbg_ptr,t)}}Symbol.dispose&&(we.prototype[Symbol.dispose]=we.prototype.free);function Sr(){return je(function(e){return Math.exp(e)},arguments)}function Lr(){return je(function(){return Date.now()},arguments)}function Br(e,t){throw new Error(wt(e,t))}function Rr(){return je(function(e,t){return wt(e,t)},arguments)}function Cr(){const e=m.__wbindgen_export_0,t=e.grow(4);e.set(0,void 0),e.set(t+0,void 0),e.set(t+1,null),e.set(t+2,!0),e.set(t+3,!1)}URL=globalThis.URL;const y=await wr({"./mandelbrot_bg.js":{__wbg_now_1e80617bcee43265:Lr,__wbg_exp_9293ded1248e1bd3:Sr,__wbg_wbindgenthrow_451ec1a8469d7eb6:Br,__wbindgen_init_externref_table:Cr,__wbindgen_cast_2241b6af4c4b2941:Rr}},ea),Tt=y.memory,Pr=y.__wbg_get_mandelbrotstep_dx,Ar=y.__wbg_get_mandelbrotstep_dy,Er=y.__wbg_get_mandelbrotstep_zx,Fr=y.__wbg_get_mandelbrotstep_zy,Ur=y.__wbg_get_orbitbufferinfo_count,Gr=y.__wbg_get_orbitbufferinfo_offset,Nr=y.__wbg_get_orbitbufferinfo_ptr,Or=y.__wbg_mandelbrotnavigator_free,Ir=y.__wbg_mandelbrotstep_free,Vr=y.__wbg_orbitbufferinfo_free,Dr=y.__wbg_set_mandelbrotstep_dx,qr=y.__wbg_set_mandelbrotstep_dy,$r=y.__wbg_set_mandelbrotstep_zx,Yr=y.__wbg_set_mandelbrotstep_zy,Wr=y.__wbg_set_orbitbufferinfo_count,Zr=y.__wbg_set_orbitbufferinfo_offset,jr=y.__wbg_set_orbitbufferinfo_ptr,Xr=y.mandelbrotnavigator_angle,Hr=y.mandelbrotnavigator_compute_reference_orbit_chunk,Kr=y.mandelbrotnavigator_compute_reference_orbit_ptr,Jr=y.mandelbrotnavigator_get_params,Qr=y.mandelbrotnavigator_get_reference_orbit_capacity,ei=y.mandelbrotnavigator_get_reference_orbit_len,ti=y.mandelbrotnavigator_new,ri=y.mandelbrotnavigator_origin,ii=y.mandelbrotnavigator_pixel_to_complex,ai=y.mandelbrotnavigator_rotate,oi=y.mandelbrotnavigator_rotate_direct,ni=y.mandelbrotnavigator_scale,si=y.mandelbrotnavigator_step,li=y.mandelbrotnavigator_translate,ui=y.mandelbrotnavigator_translate_direct,ci=y.mandelbrotnavigator_zoom,di=y.__wbindgen_export_0,fi=y.__externref_drop_slice,hi=y.__wbindgen_free,pi=y.__wbindgen_malloc,vi=y.__wbindgen_realloc,kt=y.__wbindgen_start,mi=Object.freeze(Object.defineProperty({__proto__:null,__externref_drop_slice:fi,__wbg_get_mandelbrotstep_dx:Pr,__wbg_get_mandelbrotstep_dy:Ar,__wbg_get_mandelbrotstep_zx:Er,__wbg_get_mandelbrotstep_zy:Fr,__wbg_get_orbitbufferinfo_count:Ur,__wbg_get_orbitbufferinfo_offset:Gr,__wbg_get_orbitbufferinfo_ptr:Nr,__wbg_mandelbrotnavigator_free:Or,__wbg_mandelbrotstep_free:Ir,__wbg_orbitbufferinfo_free:Vr,__wbg_set_mandelbrotstep_dx:Dr,__wbg_set_mandelbrotstep_dy:qr,__wbg_set_mandelbrotstep_zx:$r,__wbg_set_mandelbrotstep_zy:Yr,__wbg_set_orbitbufferinfo_count:Wr,__wbg_set_orbitbufferinfo_offset:Zr,__wbg_set_orbitbufferinfo_ptr:jr,__wbindgen_export_0:di,__wbindgen_free:hi,__wbindgen_malloc:pi,__wbindgen_realloc:vi,__wbindgen_start:kt,mandelbrotnavigator_angle:Xr,mandelbrotnavigator_compute_reference_orbit_chunk:Hr,mandelbrotnavigator_compute_reference_orbit_ptr:Kr,mandelbrotnavigator_get_params:Jr,mandelbrotnavigator_get_reference_orbit_capacity:Qr,mandelbrotnavigator_get_reference_orbit_len:ei,mandelbrotnavigator_new:ti,mandelbrotnavigator_origin:ri,mandelbrotnavigator_pixel_to_complex:ii,mandelbrotnavigator_rotate:ai,mandelbrotnavigator_rotate_direct:oi,mandelbrotnavigator_scale:ni,mandelbrotnavigator_step:si,mandelbrotnavigator_translate:li,mandelbrotnavigator_translate_direct:ui,mandelbrotnavigator_zoom:ci,memory:Tt},Symbol.toStringTag,{value:"Module"}));zr(mi),kt();class gi{constructor(t=1024,r=1024){n(this,"video");n(this,"stream",null);n(this,"width");n(this,"height");n(this,"lastDrawTime",0);this.width=t,this.height=r,this.video=document.createElement("video"),this.video.autoplay=!0,this.video.width=t,this.video.height=r}async openWebcam(){this.stream||(this.stream=await navigator.mediaDevices.getUserMedia({video:{width:this.width,height:this.height}}),this.video.srcObject=this.stream,await this.video.play())}async drawWebGPUTexture(t,r){const i=performance.now();if(i-this.lastDrawTime>15){if(this.video.readyState<HTMLMediaElement.HAVE_CURRENT_DATA)return;r.queue.copyExternalImageToTexture({source:this.video},{texture:t},[this.width,this.height]),this.lastDrawTime=i}}closeWebcam(){this.stream&&(this.stream.getTracks().forEach(t=>t.stop()),this.stream=null)}}function ze(e,t,r){e.prototype=t.prototype=r,r.constructor=e}function Be(e,t){var r=Object.create(e.prototype);for(var i in t)r[i]=t[i];return r}function fe(){}var ve=.7,Me=1/ve,Te="\\s*([+-]?\\d+)\\s*",Re="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*",Q="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*",_i=/^#([0-9a-f]{3,8})$/,bi=new RegExp(`^rgb\\(${Te},${Te},${Te}\\)$`),xi=new RegExp(`^rgb\\(${Q},${Q},${Q}\\)$`),yi=new RegExp(`^rgba\\(${Te},${Te},${Te},${Re}\\)$`),wi=new RegExp(`^rgba\\(${Q},${Q},${Q},${Re}\\)$`),zi=new RegExp(`^hsl\\(${Re},${Q},${Q}\\)$`),Mi=new RegExp(`^hsla\\(${Re},${Q},${Q},${Re}\\)$`),St={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074};ze(fe,Je,{copy(e){return Object.assign(new this.constructor,this,e)},displayable(){return this.rgb().displayable()},hex:Lt,formatHex:Lt,formatHex8:Ti,formatHsl:ki,formatRgb:Bt,toString:Bt});function Lt(){return this.rgb().formatHex()}function Ti(){return this.rgb().formatHex8()}function ki(){return Et(this).formatHsl()}function Bt(){return this.rgb().formatRgb()}function Je(e){var t,r;return e=(e+"").trim().toLowerCase(),(t=_i.exec(e))?(r=t[1].length,t=parseInt(t[1],16),r===6?Rt(t):r===3?new N(t>>8&15|t>>4&240,t>>4&15|t&240,(t&15)<<4|t&15,1):r===8?Ne(t>>24&255,t>>16&255,t>>8&255,(t&255)/255):r===4?Ne(t>>12&15|t>>8&240,t>>8&15|t>>4&240,t>>4&15|t&240,((t&15)<<4|t&15)/255):null):(t=bi.exec(e))?new N(t[1],t[2],t[3],1):(t=xi.exec(e))?new N(t[1]*255/100,t[2]*255/100,t[3]*255/100,1):(t=yi.exec(e))?Ne(t[1],t[2],t[3],t[4]):(t=wi.exec(e))?Ne(t[1]*255/100,t[2]*255/100,t[3]*255/100,t[4]):(t=zi.exec(e))?At(t[1],t[2]/100,t[3]/100,1):(t=Mi.exec(e))?At(t[1],t[2]/100,t[3]/100,t[4]):St.hasOwnProperty(e)?Rt(St[e]):e==="transparent"?new N(NaN,NaN,NaN,0):null}function Rt(e){return new N(e>>16&255,e>>8&255,e&255,1)}function Ne(e,t,r,i){return i<=0&&(e=t=r=NaN),new N(e,t,r,i)}function Qe(e){return e instanceof fe||(e=Je(e)),e?(e=e.rgb(),new N(e.r,e.g,e.b,e.opacity)):new N}function Ce(e,t,r,i){return arguments.length===1?Qe(e):new N(e,t,r,i??1)}function N(e,t,r,i){this.r=+e,this.g=+t,this.b=+r,this.opacity=+i}ze(N,Ce,Be(fe,{brighter(e){return e=e==null?Me:Math.pow(Me,e),new N(this.r*e,this.g*e,this.b*e,this.opacity)},darker(e){return e=e==null?ve:Math.pow(ve,e),new N(this.r*e,this.g*e,this.b*e,this.opacity)},rgb(){return this},clamp(){return new N(me(this.r),me(this.g),me(this.b),Oe(this.opacity))},displayable(){return-.5<=this.r&&this.r<255.5&&-.5<=this.g&&this.g<255.5&&-.5<=this.b&&this.b<255.5&&0<=this.opacity&&this.opacity<=1},hex:Ct,formatHex:Ct,formatHex8:Si,formatRgb:Pt,toString:Pt}));function Ct(){return`#${ge(this.r)}${ge(this.g)}${ge(this.b)}`}function Si(){return`#${ge(this.r)}${ge(this.g)}${ge(this.b)}${ge((isNaN(this.opacity)?1:this.opacity)*255)}`}function Pt(){const e=Oe(this.opacity);return`${e===1?"rgb(":"rgba("}${me(this.r)}, ${me(this.g)}, ${me(this.b)}${e===1?")":`, ${e})`}`}function Oe(e){return isNaN(e)?1:Math.max(0,Math.min(1,e))}function me(e){return Math.max(0,Math.min(255,Math.round(e)||0))}function ge(e){return e=me(e),(e<16?"0":"")+e.toString(16)}function At(e,t,r,i){return i<=0?e=t=r=NaN:r<=0||r>=1?e=t=NaN:t<=0&&(e=NaN),new J(e,t,r,i)}function Et(e){if(e instanceof J)return new J(e.h,e.s,e.l,e.opacity);if(e instanceof fe||(e=Je(e)),!e)return new J;if(e instanceof J)return e;e=e.rgb();var t=e.r/255,r=e.g/255,i=e.b/255,a=Math.min(t,r,i),o=Math.max(t,r,i),c=NaN,d=o-a,s=(o+a)/2;return d?(t===o?c=(r-i)/d+(r<i)*6:r===o?c=(i-t)/d+2:c=(t-r)/d+4,d/=s<.5?o+a:2-o-a,c*=60):d=s>0&&s<1?0:c,new J(c,d,s,e.opacity)}function et(e,t,r,i){return arguments.length===1?Et(e):new J(e,t,r,i??1)}function J(e,t,r,i){this.h=+e,this.s=+t,this.l=+r,this.opacity=+i}ze(J,et,Be(fe,{brighter(e){return e=e==null?Me:Math.pow(Me,e),new J(this.h,this.s,this.l*e,this.opacity)},darker(e){return e=e==null?ve:Math.pow(ve,e),new J(this.h,this.s,this.l*e,this.opacity)},rgb(){var e=this.h%360+(this.h<0)*360,t=isNaN(e)||isNaN(this.s)?0:this.s,r=this.l,i=r+(r<.5?r:1-r)*t,a=2*r-i;return new N(tt(e>=240?e-240:e+120,a,i),tt(e,a,i),tt(e<120?e+240:e-120,a,i),this.opacity)},clamp(){return new J(Ft(this.h),Ie(this.s),Ie(this.l),Oe(this.opacity))},displayable(){return(0<=this.s&&this.s<=1||isNaN(this.s))&&0<=this.l&&this.l<=1&&0<=this.opacity&&this.opacity<=1},formatHsl(){const e=Oe(this.opacity);return`${e===1?"hsl(":"hsla("}${Ft(this.h)}, ${Ie(this.s)*100}%, ${Ie(this.l)*100}%${e===1?")":`, ${e})`}`}}));function Ft(e){return e=(e||0)%360,e<0?e+360:e}function Ie(e){return Math.max(0,Math.min(1,e||0))}function tt(e,t,r){return(e<60?t+(r-t)*e/60:e<180?r:e<240?t+(r-t)*(240-e)/60:t)*255}const Ut=Math.PI/180,Gt=180/Math.PI,Ve=18,Nt=.96422,Ot=1,It=.82521,Vt=4/29,ke=6/29,Dt=3*ke*ke,Li=ke*ke*ke;function qt(e){if(e instanceof ee)return new ee(e.l,e.a,e.b,e.opacity);if(e instanceof ae)return $t(e);e instanceof N||(e=Qe(e));var t=nt(e.r),r=nt(e.g),i=nt(e.b),a=it((.2225045*t+.7168786*r+.0606169*i)/Ot),o,c;return t===r&&r===i?o=c=a:(o=it((.4360747*t+.3850649*r+.1430804*i)/Nt),c=it((.0139322*t+.0971045*r+.7141733*i)/It)),new ee(116*a-16,500*(o-a),200*(a-c),e.opacity)}function rt(e,t,r,i){return arguments.length===1?qt(e):new ee(e,t,r,i??1)}function ee(e,t,r,i){this.l=+e,this.a=+t,this.b=+r,this.opacity=+i}ze(ee,rt,Be(fe,{brighter(e){return new ee(this.l+Ve*(e??1),this.a,this.b,this.opacity)},darker(e){return new ee(this.l-Ve*(e??1),this.a,this.b,this.opacity)},rgb(){var e=(this.l+16)/116,t=isNaN(this.a)?e:e+this.a/500,r=isNaN(this.b)?e:e-this.b/200;return t=Nt*at(t),e=Ot*at(e),r=It*at(r),new N(ot(3.1338561*t-1.6168667*e-.4906146*r),ot(-.9787684*t+1.9161415*e+.033454*r),ot(.0719453*t-.2289914*e+1.4052427*r),this.opacity)}}));function it(e){return e>Li?Math.pow(e,1/3):e/Dt+Vt}function at(e){return e>ke?e*e*e:Dt*(e-Vt)}function ot(e){return 255*(e<=.0031308?12.92*e:1.055*Math.pow(e,1/2.4)-.055)}function nt(e){return(e/=255)<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4)}function Bi(e){if(e instanceof ae)return new ae(e.h,e.c,e.l,e.opacity);if(e instanceof ee||(e=qt(e)),e.a===0&&e.b===0)return new ae(NaN,0<e.l&&e.l<100?0:NaN,e.l,e.opacity);var t=Math.atan2(e.b,e.a)*Gt;return new ae(t<0?t+360:t,Math.sqrt(e.a*e.a+e.b*e.b),e.l,e.opacity)}function st(e,t,r,i){return arguments.length===1?Bi(e):new ae(e,t,r,i??1)}function ae(e,t,r,i){this.h=+e,this.c=+t,this.l=+r,this.opacity=+i}function $t(e){if(isNaN(e.h))return new ee(e.l,0,0,e.opacity);var t=e.h*Ut;return new ee(e.l,Math.cos(t)*e.c,Math.sin(t)*e.c,e.opacity)}ze(ae,st,Be(fe,{brighter(e){return new ae(this.h,this.c,this.l+Ve*(e??1),this.opacity)},darker(e){return new ae(this.h,this.c,this.l-Ve*(e??1),this.opacity)},rgb(){return $t(this).rgb()}}));var Yt=-.14861,lt=1.78277,ut=-.29227,De=-.90649,Pe=1.97294,Wt=Pe*De,Zt=Pe*lt,jt=lt*ut-De*Yt;function Ri(e){if(e instanceof _e)return new _e(e.h,e.s,e.l,e.opacity);e instanceof N||(e=Qe(e));var t=e.r/255,r=e.g/255,i=e.b/255,a=(jt*i+Wt*t-Zt*r)/(jt+Wt-Zt),o=i-a,c=(Pe*(r-a)-ut*o)/De,d=Math.sqrt(c*c+o*o)/(Pe*a*(1-a)),s=d?Math.atan2(c,o)*Gt-120:NaN;return new _e(s<0?s+360:s,d,a,e.opacity)}function ct(e,t,r,i){return arguments.length===1?Ri(e):new _e(e,t,r,i??1)}function _e(e,t,r,i){this.h=+e,this.s=+t,this.l=+r,this.opacity=+i}ze(_e,ct,Be(fe,{brighter(e){return e=e==null?Me:Math.pow(Me,e),new _e(this.h,this.s,this.l*e,this.opacity)},darker(e){return e=e==null?ve:Math.pow(ve,e),new _e(this.h,this.s,this.l*e,this.opacity)},rgb(){var e=isNaN(this.h)?0:(this.h+120)*Ut,t=+this.l,r=isNaN(this.s)?0:this.s*t*(1-t),i=Math.cos(e),a=Math.sin(e);return new N(255*(t+r*(Yt*i+lt*a)),255*(t+r*(ut*i+De*a)),255*(t+r*(Pe*i)),this.opacity)}}));const dt=e=>()=>e;function Xt(e,t){return function(r){return e+r*t}}function Ci(e,t,r){return e=Math.pow(e,r),t=Math.pow(t,r)-e,r=1/r,function(i){return Math.pow(e+i*t,r)}}function ft(e,t){var r=t-e;return r?Xt(e,r>180||r<-180?r-360*Math.round(r/360):r):dt(isNaN(e)?t:e)}function Pi(e){return(e=+e)==1?$:function(t,r){return r-t?Ci(t,r,e):dt(isNaN(t)?r:t)}}function $(e,t){var r=t-e;return r?Xt(e,r):dt(isNaN(e)?t:e)}const Ai=(function e(t){var r=Pi(t);function i(a,o){var c=r((a=Ce(a)).r,(o=Ce(o)).r),d=r(a.g,o.g),s=r(a.b,o.b),x=$(a.opacity,o.opacity);return function(p){return a.r=c(p),a.g=d(p),a.b=s(p),a.opacity=x(p),a+""}}return i.gamma=e,i})(1);function Ei(e){return function(t,r){var i=e((t=et(t)).h,(r=et(r)).h),a=$(t.s,r.s),o=$(t.l,r.l),c=$(t.opacity,r.opacity);return function(d){return t.h=i(d),t.s=a(d),t.l=o(d),t.opacity=c(d),t+""}}}const Fi=Ei(ft);function Ht(e,t){var r=$((e=rt(e)).l,(t=rt(t)).l),i=$(e.a,t.a),a=$(e.b,t.b),o=$(e.opacity,t.opacity);return function(c){return e.l=r(c),e.a=i(c),e.b=a(c),e.opacity=o(c),e+""}}function Ui(e){return function(t,r){var i=e((t=st(t)).h,(r=st(r)).h),a=$(t.c,r.c),o=$(t.l,r.l),c=$(t.opacity,r.opacity);return function(d){return t.h=i(d),t.c=a(d),t.l=o(d),t.opacity=c(d),t+""}}}const Gi=Ui(ft);function Kt(e){return(function t(r){r=+r;function i(a,o){var c=e((a=ct(a)).h,(o=ct(o)).h),d=$(a.s,o.s),s=$(a.l,o.l),x=$(a.opacity,o.opacity);return function(p){return a.h=c(p),a.s=d(p),a.l=s(Math.pow(p,r)),a.opacity=x(p),a+""}}return i.gamma=t,i})(1)}const Ni=Kt(ft);Kt($);const Oi={lab:Ht,rgb:Ai,hcl:Gi,hsl:Fi,cubehelix:Ni};class Jt{constructor(t,r="lab"){n(this,"points");n(this,"interpolate");this.points=t.slice().sort((i,a)=>i.position-a.position),this.interpolate=Oi[r]??Ht}getColorAt(t){if(this.points.length===0)return"#000";if(t<=this.points[0].position)return this.points[0].color;if(t>=this.points[this.points.length-1].position)return this.points[this.points.length-1].color;for(let r=0;r<this.points.length-1;++r){const i=this.points[r],a=this.points[r+1];if(t>=i.position&&t<=a.position){const o=(t-i.position)/(a.position-i.position),c=this.interpolate(i.color,a.color);return Ce(c(o)).formatHex()}}return"#000"}generateTexture(){const t=new ImageData(4096,1);for(let r=0;r<4096;++r){const i=r/4095,a=Ce(this.getColorAt(i)),o=r*4;t.data[o]=a.r,t.data[o+1]=a.g,t.data[o+2]=a.b,t.data[o+3]=255}return t}}const ht=7,Ii=2048,Vi=64,Di=2,qi=2048,$i=0,qe=100,Yi=1e4,Wi=5e6,Zi=10,Qt=.25,ji=100;function Xi(e){const t=Math.max(1,Math.floor(e));return 2**Math.floor(Math.log2(t))}const W=class W{constructor(t,r){n(this,"snapshotCallback");n(this,"snapshotDestWidth");n(this,"canvas");n(this,"device");n(this,"queue");n(this,"adapter");n(this,"ctx");n(this,"format");n(this,"mandelbrotNavigator");n(this,"rawTexture");n(this,"rawArrayView");n(this,"rawLayerViews",[]);n(this,"rawBrushTexture");n(this,"rawBrushArrayView");n(this,"rawBrushLayerViews",[]);n(this,"resolvedTexture");n(this,"resolvedArrayView");n(this,"resolvedLayerViews",[]);n(this,"frozenTexture");n(this,"frozenArrayView");n(this,"uniformBufferMandelbrot");n(this,"uniformBufferColor");n(this,"uniformBufferBrush");n(this,"uniformBufferResolve");n(this,"mandelbrotReferenceBuffer");n(this,"pipelineBrush");n(this,"bindGroupBrush");n(this,"pipelineMandelbrot");n(this,"bindGroupMandelbrot");n(this,"pipelineResolve");n(this,"bindGroupResolve");n(this,"pipelineColor");n(this,"bindGroupColor");n(this,"pipelineCount");n(this,"counterBuffer");n(this,"counterReadBuffer");n(this,"counterBindGroup");n(this,"uniformBufferCount");n(this,"unfinishedPixelCount",-1);n(this,"activePixelCount",-1);n(this,"_rafId",null);n(this,"_drawFn",null);n(this,"fps",0);n(this,"isRendering",!1);n(this,"gpuFrameTimeMs",0);n(this,"smoothedGpuTimeMs",0);n(this,"refinementWasGated",!1);n(this,"_fpsFrameCount",0);n(this,"_fpsLastTime",0);n(this,"neutralSize",0);n(this,"shaderPassCompute");n(this,"shaderPassColor");n(this,"width",0);n(this,"height",0);n(this,"antialiasLevel");n(this,"palettePeriod");n(this,"previousMandelbrot");n(this,"previousRenderOptions");n(this,"needRender",!0);n(this,"orbitIncomplete",!1);n(this,"prevGuardedMaxIter",0);n(this,"currentGuardedMaxIter",0);n(this,"currentMaxIterations",0);n(this,"mandelbrotReference",new Float32Array(1e6));n(this,"prevFrameMandelbrot");n(this,"clearHistoryNextFrame",!1);n(this,"cumulativeShiftX",0);n(this,"cumulativeShiftY",0);n(this,"zoomMagnificationThreshold",16);n(this,"zoomFactor",1);n(this,"zoomTarget",1);n(this,"frozenScale",0);n(this,"liveScale",0);n(this,"liveZoomFactor",1);n(this,"zoomReprojectionActive",!1);n(this,"needFreezeSnapshot",!1);n(this,"zoomingIn",!0);n(this,"zoomIdleFrames",0);n(this,"postZoomFullRecompute",!1);n(this,"iterationBatchSize",qe);n(this,"tileTexture");n(this,"tileTextureView");n(this,"skyboxTexture");n(this,"skyboxTextureView");n(this,"paletteTexture");n(this,"paletteTextureView");n(this,"paletteSampler");n(this,"webcamTexture");n(this,"webcamTileTexture");n(this,"webcamTextureView");n(this,"webcamEnabled",!0);n(this,"time",0);n(this,"lastUpdateTime",0);n(this,"dprMultiplier",1);n(this,"targetFps",60);n(this,"gpuLoadMultiplier",1);this.canvas=t,this.shaderPassCompute=pe,this.shaderPassColor=ie,this.antialiasLevel=r.antialiasLevel,this.palettePeriod=r.palettePeriod,this.time=0}async initialize(t){if(this.mandelbrotNavigator=t,!navigator.gpu)throw new Error("WebGPU non support\xE9");if(this.adapter=await navigator.gpu.requestAdapter(),!this.adapter)throw new Error("Adapter WebGPU introuvable");this.device=await this.adapter.requestDevice(),this.device.label="Engine Device",this.queue=this.device.queue,this.queue.label="Engine Queue",this.ctx=this.canvas.getContext("webgpu"),this.format=navigator.gpu.getPreferredCanvasFormat(),this.ctx.configure({device:this.device,format:this.format,alphaMode:"opaque"}),W._tileTexture||(W._tileTexture=await this._loadTexture(pr)),this.tileTexture=await this._loadTexture(pr),this.tileTextureView=this.tileTexture.createView(),W._skyboxTexture||(W._skyboxTexture=await this._loadTexture(vr)),this.skyboxTexture=await this._loadTexture(vr),this.skyboxTextureView=this.skyboxTexture.createView();const r=new Jt([]).generateTexture();this.paletteTexture=this.device.createTexture({size:[r.width,r.height,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine PaletteTexture"}),this.device.queue.writeTexture({texture:this.paletteTexture},r.data,{bytesPerRow:r.width*4},[r.width,r.height]),this.paletteTextureView=this.paletteTexture.createView(),this.paletteSampler=this.device.createSampler({magFilter:"linear",minFilter:"linear",addressModeU:"repeat",addressModeV:"clamp-to-edge"}),this.webcamTexture=new gi(1920,1080),this.webcamTileTexture=this.device.createTexture({size:[1920,1080,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT}),this.webcamTextureView=this.webcamTileTexture.createView(),this.uniformBufferMandelbrot=this.device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Mandelbrot"}),this.uniformBufferColor=this.device.createBuffer({size:112,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Color"}),this.uniformBufferBrush=this.device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Brush"}),this.uniformBufferResolve=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Resolve"}),this.mandelbrotReferenceBuffer=this.device.createBuffer({size:4*1e6,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot Orbit ReferenceStorage Buffer"}),this.counterBuffer=this.device.createBuffer({size:8,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST,label:"Engine Counter Storage"}),this.counterReadBuffer=this.device.createBuffer({size:8,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,label:"Engine Counter Readback"}),this.uniformBufferCount=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Count"}),await this._createPipelines(),this.resize()}async _createPipelines(){const t=this.device.createShaderModule({code:be,label:"Engine ShaderModule Brush"}),r=this.device.createShaderModule({code:this.shaderPassCompute,label:"Engine ShaderModule Compute"}),i=this.device.createShaderModule({code:xr,label:"Engine ShaderModule Resolve"}),a=this.device.createShaderModule({code:this.shaderPassColor,label:"Engine ShaderModule Color"}),o=this.device.createShaderModule({code:yr,label:"Engine ShaderModule Count"}),c=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Brush"}),d=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Mandelbrot"}),s=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Resolve"}),x=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:3,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:4,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:5,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:6,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:7,visibility:GPUShaderStage.FRAGMENT,sampler:{type:"filtering"}}],label:"Engine BindGroupLayout Color"}),p=Array.from({length:ht},()=>({format:"r32float"}));this.pipelineBrush=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[c]}),vertex:{module:t,entryPoint:"vs_main"},fragment:{module:t,entryPoint:"fs_main",targets:p},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Brush"}),this.pipelineMandelbrot=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[d]}),vertex:{module:r,entryPoint:"vs_main"},fragment:{module:r,entryPoint:"fs_main",targets:p},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Mandelbrot"}),this.pipelineResolve=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[s]}),vertex:{module:i,entryPoint:"vs_main"},fragment:{module:i,entryPoint:"fs_main",targets:p},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Resolve"}),this.pipelineColor=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[x]}),vertex:{module:a,entryPoint:"vs_main"},fragment:{module:a,entryPoint:"fs_main",targets:[{format:this.format}]},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Color"});const h=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}],label:"Engine BindGroupLayout Count"});this.pipelineCount=this.device.createComputePipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[h]}),compute:{module:o,entryPoint:"count_unfinished"},label:"Engine ComputePipeline Count"}),this.bindGroupBrush=void 0,this.bindGroupMandelbrot=void 0,this.bindGroupResolve=void 0,this.bindGroupColor=void 0,this.counterBindGroup=void 0}resize(){var g,u,f,B,M,P,R,A,w,U;const t=(window.devicePixelRatio||1)*this.dprMultiplier,r=this.canvas.parentElement,i=(r==null?void 0:r.clientWidth)||1,a=(r==null?void 0:r.clientHeight)||1;this.width=Math.max(1,Math.round(i*t)),this.height=Math.max(1,Math.round(a*t));const o=((u=(g=this.device)==null?void 0:g.limits)==null?void 0:u.maxTextureDimension2D)??8192;this.width=Math.min(this.width,o),this.height=Math.min(this.height,o),this.canvas.width=this.width,this.canvas.height=this.height,this.canvas.style.width=i+"px",this.canvas.style.height=a+"px",this.ctx.configure({device:this.device,format:this.format,alphaMode:"opaque"}),this.neutralSize=Math.ceil(Math.sqrt(this.width*this.width+this.height*this.height));const c=this.neutralSize;(B=(f=this.rawTexture)==null?void 0:f.destroy)==null||B.call(f),(P=(M=this.rawBrushTexture)==null?void 0:M.destroy)==null||P.call(M),(A=(R=this.resolvedTexture)==null?void 0:R.destroy)==null||A.call(R),(U=(w=this.frozenTexture)==null?void 0:w.destroy)==null||U.call(w);const d=ht,s=b=>{const T=this.device.createTexture({size:{width:c,height:c,depthOrArrayLayers:d},format:"r32float",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST,label:b}),O=T.createView({dimension:"2d-array",baseArrayLayer:0,arrayLayerCount:d,label:b+" ArrayView"}),I=[];for(let G=0;G<d;G++)I.push(T.createView({dimension:"2d",baseArrayLayer:G,arrayLayerCount:1,label:b+` Layer${G}`}));return{texture:T,arrayView:O,layerViews:I}},x=s("Engine RawTexture (A)");this.rawTexture=x.texture,this.rawArrayView=x.arrayView,this.rawLayerViews=x.layerViews;const p=s("Engine RawBrushTexture (B)");this.rawBrushTexture=p.texture,this.rawBrushArrayView=p.arrayView,this.rawBrushLayerViews=p.layerViews;const h=s("Engine ResolvedTexture");this.resolvedTexture=h.texture,this.resolvedArrayView=h.arrayView,this.resolvedLayerViews=h.layerViews;const S=s("Engine FrozenTexture");if(this.frozenTexture=S.texture,this.frozenArrayView=S.arrayView,this.zoomReprojectionActive=!1,this.zoomFactor=1,this.zoomTarget=1,this.liveZoomFactor=1,this.frozenScale=0,this.liveScale=0,this.zoomIdleFrames=0,this.pipelineBrush){const b=this.pipelineBrush.getBindGroupLayout(0);this.bindGroupBrush=this.device.createBindGroup({layout:b,entries:[{binding:0,resource:{buffer:this.uniformBufferBrush}},{binding:1,resource:this.rawArrayView}],label:"Engine BindGroup Brush"})}if(this.pipelineMandelbrot){const b=this.pipelineMandelbrot.getBindGroupLayout(0);this.bindGroupMandelbrot=this.device.createBindGroup({layout:b,entries:[{binding:0,resource:{buffer:this.uniformBufferMandelbrot}},{binding:1,resource:{buffer:this.mandelbrotReferenceBuffer}},{binding:2,resource:this.rawBrushArrayView}],label:"Engine BindGroup Mandelbrot"})}if(this.pipelineResolve){const b=this.pipelineResolve.getBindGroupLayout(0);this.bindGroupResolve=this.device.createBindGroup({layout:b,entries:[{binding:0,resource:{buffer:this.uniformBufferResolve}},{binding:1,resource:this.rawArrayView}],label:"Engine BindGroup Resolve"})}if(this.pipelineColor){const b=this.pipelineColor.getBindGroupLayout(0),T=[{binding:0,resource:{buffer:this.uniformBufferColor}},{binding:1,resource:this.resolvedArrayView},{binding:2,resource:this.tileTextureView},{binding:3,resource:this.skyboxTextureView},{binding:4,resource:this.webcamTextureView},{binding:5,resource:this.paletteTextureView},{binding:6,resource:this.frozenArrayView},{binding:7,resource:this.paletteSampler}];this.bindGroupColor=this.device.createBindGroup({layout:b,entries:T,label:"Engine BindGroup Color"})}if(this.pipelineCount&&this.counterBuffer&&this.uniformBufferCount){const b=this.pipelineCount.getBindGroupLayout(0);this.counterBindGroup=this.device.createBindGroup({layout:b,entries:[{binding:0,resource:this.rawArrayView},{binding:1,resource:{buffer:this.counterBuffer}},{binding:2,resource:{buffer:this.uniformBufferCount}}],label:"Engine BindGroup Count"})}this.prevFrameMandelbrot=void 0,this.previousMandelbrot=void 0,this.previousRenderOptions=void 0,this.needRender=!0,this.unfinishedPixelCount=-1,this.activePixelCount=-1}areObjectsEqual(t,r){return t===void 0||r===void 0?!1:JSON.stringify(t)===JSON.stringify(r)}areColorStopsEqual(t,r){if(t.length!==r.length)return!1;for(const[i,a]of t.entries()){const o=r[i];if(!o||a.color!==o.color||a.position!==o.position)return!1}return!0}async update(t,r){var M,P,R,A;const i=performance.now();this.lastUpdateTime===0&&(this.lastUpdateTime=i);const a=(i-this.lastUpdateTime)/1e3;this.time+=a,this.lastUpdateTime=i,this.needRender=!(this.areObjectsEqual(t,this.previousMandelbrot)&&this.areObjectsEqual(r,this.previousRenderOptions)),r.activateWebcam?(await this.updateWebcamTexture(),this.needRender=!0):(M=this.webcamTexture)==null||M.closeWebcam(),r.activateAnimate&&(this.needRender=!0);const o=this.width/Math.max(1,this.height);let c=((P=this.previousMandelbrot)==null?void 0:P.scale)||1/t.scale;c<1&&(c=1/c),c=Math.sqrt(c)-1;{const w=this.prevFrameMandelbrot&&this.prevFrameMandelbrot.scale!==t.scale;w&&!this.zoomReprojectionActive&&(this.zoomReprojectionActive=!0,this.frozenScale=this.prevFrameMandelbrot.scale,this.zoomingIn=t.scale<this.frozenScale,this.liveScale=this.zoomingIn?this.frozenScale/this.zoomMagnificationThreshold:this.frozenScale*this.zoomMagnificationThreshold,this.needFreezeSnapshot=!0,this.clearHistoryNextFrame=!0,this.zoomIdleFrames=0),w&&this.zoomReprojectionActive&&(this.zoomIdleFrames=0),this.zoomReprojectionActive&&this.frozenScale>0?(this.zoomFactor=this.frozenScale/t.scale,this.liveZoomFactor=this.liveScale/t.scale,this.zoomTarget=this.zoomingIn?this.zoomMagnificationThreshold:1/this.zoomMagnificationThreshold,(this.zoomingIn?this.zoomFactor>=this.zoomMagnificationThreshold:this.zoomFactor<=1/this.zoomMagnificationThreshold)&&(this.needFreezeSnapshot=!0,this.clearHistoryNextFrame=!0,this.frozenScale=this.liveScale,this.liveScale=this.zoomingIn?t.scale/this.zoomMagnificationThreshold:t.scale*this.zoomMagnificationThreshold,this.zoomFactor=this.frozenScale/t.scale,this.liveZoomFactor=this.liveScale/t.scale,this.zoomIdleFrames=0)):this.zoomReprojectionActive||(this.zoomFactor=1,this.zoomTarget=1,this.liveZoomFactor=1),this.zoomReprojectionActive&&!w&&this.prevFrameMandelbrot&&this.prevFrameMandelbrot.scale===t.scale&&(this.zoomIdleFrames++,this.zoomIdleFrames>=$i&&(this.zoomReprojectionActive=!1,this.zoomFactor=1,this.zoomTarget=1,this.liveZoomFactor=1,this.liveScale=0,this.zoomIdleFrames=0,this.clearHistoryNextFrame=!0,this.postZoomFullRecompute=!0))}if(!this.areColorStopsEqual(r.colorStops,((R=this.previousRenderOptions)==null?void 0:R.colorStops)||[])||r.interpolationMode!==((A=this.previousRenderOptions)==null?void 0:A.interpolationMode)){const w=new Jt(r.colorStops,r.interpolationMode).generateTexture();this.device.queue.writeTexture({texture:this.paletteTexture},w.data,{bytesPerRow:w.width*4},[w.width,w.height]),this.needRender=!0}const d=new Float32Array([r.palettePeriod,r.paletteOffset,r.tessellationLevel,r.shadingLevel,c,this.time,r.activateTessellation?1:0,r.activateShading?1:0,r.activateWebcam?1:0,r.activatePalette?1:0,r.activateSkybox?1:0,r.activateSmoothness?1:0,r.activateZebra?1:0,o,t.angle,r.activateAnimate?1:0,t.mu,this.zoomFactor,this.zoomTarget,this.liveZoomFactor,this.zoomReprojectionActive&&this.frozenScale>0?this.cumulativeShiftX*(this.liveScale/this.frozenScale)/this.neutralSize:0,this.zoomReprojectionActive&&this.frozenScale>0?-this.cumulativeShiftY*(this.liveScale/this.frozenScale)/this.neutralSize:0,r.lightAngle,r.displacementAmount,r.specularPower]);if(this.device.queue.writeBuffer(this.uniformBufferColor,0,d.buffer),!this.needsMoreFrames())return;const s=Math.ceil(t.maxIterations);this.currentMaxIterations=s;const x=this.mandelbrotNavigator.compute_reference_orbit_chunk(ji,s),p=x.count,h=new Float32Array(Tt.buffer,x.ptr,x.count*4);x.offset<s&&this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer,0,h,0);const S=Math.min(s,p);this.currentGuardedMaxIter=S,this.orbitIncomplete=p<s;const g=p>=s,u=this.zoomReprojectionActive&&this.liveScale>0?this.liveScale:t.scale,f=new Float32Array([t.dx,t.dy,t.mu,u,o,t.angle,this.iterationBatchSize,t.epsilon,r.antialiasLevel,0,S,g?1:0]);this.device.queue.writeBuffer(this.uniformBufferMandelbrot,0,f.buffer);const B=x.offset===0&&!!this.prevFrameMandelbrot;(!this.prevFrameMandelbrot||B)&&(this.clearHistoryNextFrame=!0,this.zoomReprojectionActive=!1,this.zoomFactor=1,this.zoomTarget=1,this.liveZoomFactor=1,this.liveScale=0,this.zoomIdleFrames=0),this.prevFrameMandelbrot&&this.prevFrameMandelbrot.mu!==t.mu&&(this.clearHistoryNextFrame=!0,this.zoomReprojectionActive=!1,this.zoomFactor=1,this.zoomTarget=1,this.liveZoomFactor=1,this.liveScale=0,this.zoomIdleFrames=0),!this.zoomReprojectionActive&&g&&this.prevGuardedMaxIter<s&&this.prevGuardedMaxIter>0&&(this.clearHistoryNextFrame=!0),this.prevGuardedMaxIter=S,this.previousMandelbrot=structuredClone(t),this.previousRenderOptions=structuredClone(r)}async render(){if(!this.needsMoreFrames()||!this.pipelineBrush||!this.pipelineMandelbrot||!this.pipelineResolve||!this.pipelineColor||!this.bindGroupBrush||!this.bindGroupMandelbrot||!this.bindGroupResolve||!this.bindGroupColor||!this.previousMandelbrot)return;const t=this.width/Math.max(1,this.height);let r;this.postZoomFullRecompute?(r=qi,this.postZoomFullRecompute=!1):this.zoomReprojectionActive?r=Vi:r=Xi(Ii);const i=r,a=this.clearHistoryNextFrame?1:0;let o=0,c=0;if(!this.clearHistoryNextFrame&&this.prevFrameMandelbrot){const b=this.previousMandelbrot.dx-this.prevFrameMandelbrot.dx,T=this.previousMandelbrot.dy-this.prevFrameMandelbrot.dy,O=this.neutralSize,I=Math.sqrt(t*t+1),G=this.zoomReprojectionActive&&this.liveScale>0?this.liveScale:this.previousMandelbrot.scale;o=-(b*O)/(2*G*I),c=T*O/(2*G*I)}this.clearHistoryNextFrame?(this.cumulativeShiftX=0,this.cumulativeShiftY=0):(this.cumulativeShiftX+=Math.round(o),this.cumulativeShiftY+=Math.round(c));const d=(this.cumulativeShiftX%i+i)%i,s=(this.cumulativeShiftY%i+i)%i,x=this.clearHistoryNextFrame||this.activePixelCount<0||this.iterationBatchSize>qe||this.activePixelCount<Wi*this.gpuLoadMultiplier;x&&this.refinementWasGated&&(this.iterationBatchSize=qe),this.refinementWasGated=!x;const p=x?1:0,h=new Float32Array([t,this.previousMandelbrot.angle,a,r,i,o,c,this.previousMandelbrot.mu,d,s,this.zoomReprojectionActive?Di:0,p]);this.device.queue.writeBuffer(this.uniformBufferBrush,0,h.buffer);const S=new Float32Array([this.previousMandelbrot.mu,d,s]);this.device.queue.writeBuffer(this.uniformBufferResolve,0,S.buffer);const g=this.device.createCommandEncoder();if(this.needFreezeSnapshot&&this.resolvedTexture&&this.frozenTexture){const b=ht,T=this.neutralSize;g.copyTextureToTexture({texture:this.resolvedTexture},{texture:this.frozenTexture},{width:T,height:T,depthOrArrayLayers:b}),this.needFreezeSnapshot=!1}const u=b=>b.map(T=>({view:T,clearValue:{r:0,g:0,b:0,a:0},loadOp:"clear",storeOp:"store"})),f=g.beginRenderPass({colorAttachments:u(this.rawBrushLayerViews)});f.setPipeline(this.pipelineBrush),f.setBindGroup(0,this.bindGroupBrush),f.draw(6,1,0,0),f.end();const B=g.beginRenderPass({colorAttachments:u(this.rawLayerViews)});if(B.setPipeline(this.pipelineMandelbrot),B.setBindGroup(0,this.bindGroupMandelbrot),B.draw(6,1,0,0),B.end(),this.pipelineCount&&this.counterBindGroup&&this.counterBuffer&&this.counterReadBuffer&&this.uniformBufferCount){const b=this.previousMandelbrot.mu;this.device.queue.writeBuffer(this.uniformBufferCount,0,new Float32Array([b,t,this.previousMandelbrot.angle])),g.clearBuffer(this.counterBuffer,0,8);const T=g.beginComputePass();T.setPipeline(this.pipelineCount),T.setBindGroup(0,this.counterBindGroup),T.dispatchWorkgroups(Math.ceil(this.neutralSize/16),Math.ceil(this.neutralSize/16)),T.end(),g.copyBufferToBuffer(this.counterBuffer,0,this.counterReadBuffer,0,8)}const M=g.beginRenderPass({colorAttachments:u(this.resolvedLayerViews)});M.setPipeline(this.pipelineResolve),M.setBindGroup(0,this.bindGroupResolve),M.draw(6,1,0,0),M.end();const P=this.ctx.getCurrentTexture().createView(),R=g.beginRenderPass({colorAttachments:[{view:P,clearValue:{r:1,g:1,b:1,a:1},loadOp:"clear",storeOp:"store"}]});R.setPipeline(this.pipelineColor),R.setBindGroup(0,this.bindGroupColor),R.draw(6,1,0,0),R.end();const A=performance.now();this.device.queue.submit([g.finish()]),await this.device.queue.onSubmittedWorkDone();const w=performance.now()-A;if(this.gpuFrameTimeMs=w,this.smoothedGpuTimeMs===0?this.smoothedGpuTimeMs=w:this.smoothedGpuTimeMs=this.smoothedGpuTimeMs*(1-Qt)+w*Qt,w>0){const b=1e3/this.targetFps/w,T=this.iterationBatchSize*b;this.iterationBatchSize=Math.round(Math.min(Yi,Math.max(qe,this.iterationBatchSize*.7+T*.3)))}await this.counterReadBuffer.mapAsync(GPUMapMode.READ);const U=new Uint32Array(this.counterReadBuffer.getMappedRange());if(this.unfinishedPixelCount=U[0],this.activePixelCount=U[1],this.counterReadBuffer.unmap(),this.clearHistoryNextFrame=!1,this.prevFrameMandelbrot={...this.previousMandelbrot},this.snapshotCallback){try{const b=this.snapshotDestWidth??256,T=Math.round(b*9/16),O=this.device.createTexture({size:[b,T,1],format:this.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});{const q=this.device.createCommandEncoder(),j=q.beginRenderPass({colorAttachments:[{view:O.createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}]});j.setPipeline(this.pipelineColor),j.setBindGroup(0,this.bindGroupColor),j.draw(6,1,0,0),j.end(),this.device.queue.submit([q.finish()])}const I=q=>q+255&-256,G=b*4,D=I(G),oe=D*T,X=this.device.createBuffer({size:oe,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});{const q=this.device.createCommandEncoder();q.copyTextureToBuffer({texture:O},{buffer:X,offset:0,bytesPerRow:D},{width:b,height:T,depthOrArrayLayers:1}),this.device.queue.submit([q.finish()])}await this.device.queue.onSubmittedWorkDone(),await X.mapAsync(GPUMapMode.READ);const Y=X.getMappedRange(),Z=new Uint8ClampedArray(b*T*4),H=new Uint8Array(Y);for(let q=0;q<T;++q)for(let j=0;j<b;++j){const ne=q*D+j*4,se=(q*b+j)*4;Z[se+0]=H[ne+2],Z[se+1]=H[ne+1],Z[se+2]=H[ne+0],Z[se+3]=H[ne+3]}const te=document.createElement("canvas");te.width=b,te.height=T,te.getContext("2d").putImageData(new ImageData(Z,b,T),0,0),X.unmap(),this.snapshotCallback(te.toDataURL("image/png"))}catch{this.snapshotCallback("")}this.snapshotCallback=void 0,this.snapshotDestWidth=void 0}}destroy(){var t,r,i,a,o,c,d,s,x,p,h,S,g,u,f,B,M,P,R,A,w,U,b,T,O,I,G,D,oe;this.stopRenderLoop(),(r=(t=this.rawTexture)==null?void 0:t.destroy)==null||r.call(t),(a=(i=this.rawBrushTexture)==null?void 0:i.destroy)==null||a.call(i),(c=(o=this.resolvedTexture)==null?void 0:o.destroy)==null||c.call(o),(s=(d=this.frozenTexture)==null?void 0:d.destroy)==null||s.call(d),(p=(x=this.mandelbrotReferenceBuffer)==null?void 0:x.destroy)==null||p.call(x),(S=(h=this.uniformBufferMandelbrot)==null?void 0:h.destroy)==null||S.call(h),(u=(g=this.uniformBufferColor)==null?void 0:g.destroy)==null||u.call(g),(B=(f=this.uniformBufferBrush)==null?void 0:f.destroy)==null||B.call(f),(P=(M=this.uniformBufferResolve)==null?void 0:M.destroy)==null||P.call(M),(A=(R=this.counterBuffer)==null?void 0:R.destroy)==null||A.call(R),(U=(w=this.counterReadBuffer)==null?void 0:w.destroy)==null||U.call(w),(T=(b=this.uniformBufferCount)==null?void 0:b.destroy)==null||T.call(b),(O=this.webcamTexture)==null||O.closeWebcam(),(G=(I=this.webcamTileTexture)==null?void 0:I.destroy)==null||G.call(I),(oe=(D=this.paletteTexture)==null?void 0:D.destroy)==null||oe.call(D)}needsMoreFrames(){let t="";return this.needRender?t="needRender":this.zoomReprojectionActive?t="zoomActive":this.clearHistoryNextFrame?t="clearHistory":this.orbitIncomplete?t="orbitIncomplete":(this.unfinishedPixelCount<0||this.unfinishedPixelCount>Zi)&&(t=`unfinished=${this.unfinishedPixelCount}`),t!==""}getIterationBatchSize(){return this.iterationBatchSize}startRenderLoop(t){this._drawFn=t,this._rafId===null&&(this._rafId=requestAnimationFrame(async()=>this._loop()))}stopRenderLoop(){this._rafId!==null&&(cancelAnimationFrame(this._rafId),this._rafId=null),this._drawFn=null}async _loop(){if(this._drawFn){const t=this.needsMoreFrames();this.isRendering=t,await this._drawFn(),t&&this._fpsFrameCount++;const r=performance.now();this._fpsLastTime===0&&(this._fpsLastTime=r);const i=r-this._fpsLastTime;i>=1e3&&(this.fps=Math.round(this._fpsFrameCount*1e3/i),this._fpsFrameCount=0,this._fpsLastTime=r),this._rafId=requestAnimationFrame(async()=>this._loop())}else{this._rafId=null;return}}async updateTileTexture(t){var i,a;const r=await this._loadTexture(t);if((a=(i=this.tileTexture)==null?void 0:i.destroy)==null||a.call(i),this.tileTexture=r,this.tileTextureView=this.tileTexture.createView(),this.pipelineColor&&this.resolvedArrayView&&this.frozenArrayView){const o=this.pipelineColor.getBindGroupLayout(0);this.bindGroupColor=this.device.createBindGroup({layout:o,entries:[{binding:0,resource:{buffer:this.uniformBufferColor}},{binding:1,resource:this.resolvedArrayView},{binding:2,resource:this.tileTextureView},{binding:3,resource:this.skyboxTextureView},{binding:4,resource:this.webcamTextureView},{binding:5,resource:this.paletteTextureView},{binding:6,resource:this.frozenArrayView},{binding:7,resource:this.paletteSampler}],label:"Engine BindGroup Color"})}this.needRender=!0}async _loadTexture(t){const r=new Image;r.src=t;try{await r.decode()}catch(o){throw console.warn("\xC9chec du chargement de la texture : "+t,o),o}const i=await createImageBitmap(r),a=this.device.createTexture({size:[i.width,i.height,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine LoadedTexture "+t});return this.device.queue.copyExternalImageToTexture({source:i},{texture:a},[i.width,i.height]),a}async readIterationDataAt(t,r,i,a){var Ee;if(!this.resolvedTexture||!this.device)return null;const o=this.width/Math.max(1,this.height),c=((Ee=this.previousMandelbrot)==null?void 0:Ee.angle)??0,d=t/Math.max(1,i),s=1-r/Math.max(1,a),x=d*2-1,p=s*2-1,h=x*o,S=p,g=Math.sin(c),u=Math.cos(c),f=u*h-g*S,B=g*h+u*S,M=Math.sqrt(o*o+1),P=f/M,R=B/M,A=P*.5+.5,w=R*.5+.5,U=this.neutralSize,b=Math.floor(Math.max(0,Math.min(U-1,A*U))),T=Math.floor(Math.max(0,Math.min(U-1,(1-w)*U))),O=W.ITER_PIXEL_LAYERS,I=1,G=4,D=(he=>he+255&-256)(I*G),oe=D*O.length,X=this.device.createBuffer({size:oe,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,label:"Engine IterPixel Readback"}),Y=this.device.createCommandEncoder();for(let he=0;he<O.length;he++)Y.copyTextureToBuffer({texture:this.resolvedTexture,origin:{x:b,y:T,z:O[he]}},{buffer:X,offset:D*he,bytesPerRow:D},{width:1,height:1,depthOrArrayLayers:1});this.device.queue.submit([Y.finish()]),await X.mapAsync(GPUMapMode.READ);const Z=new Float32Array(X.getMappedRange()),H=D/G,te=Z[0*H],q=Z[1*H],j=Z[2*H],ne=Z[3*H],se=Z[4*H];return X.unmap(),X.destroy(),te<0?null:{iter:te,zx:q,zy:j,derX:ne,derY:se}}async updateWebcamTexture(){var t,r;await((t=this.webcamTexture)==null?void 0:t.openWebcam()),await((r=this.webcamTexture)==null?void 0:r.drawWebGPUTexture(this.webcamTileTexture,this.device))}async getSnapshotPng(t=256){return await new Promise(r=>{this.snapshotCallback=r,this.snapshotDestWidth=t,this.needRender=!0})}};n(W,"_tileTexture"),n(W,"_tileTextureView"),n(W,"_skyboxTexture"),n(W,"_skyboxTextureView"),n(W,"_paletteTexture"),n(W,"_paletteTextureView"),n(W,"ITER_PIXEL_LAYERS",[0,2,3,4,5]);let pt=W,er,tr,rr,ir,ar,Ae,vt,or,nr,sr;yt=_t({__name:"Mandelbrot",props:Ze({mu:{default:1e6},epsilon:{default:1e-5},colorStops:{default:()=>[{color:"#0f0130",position:0},{color:"#206bcb",position:.16},{color:"#ffceb6",position:.26},{color:"#edffff",position:.42},{color:"#ffaa00",position:.6425},{color:"#300200",position:.8575},{color:"#100000",position:1}]},palettePeriod:{default:100},paletteOffset:{default:0},antialiasLevel:{default:1},tessellationLevel:{default:2},shadingLevel:{default:1},lightAngle:{default:3.927},displacementAmount:{default:1},specularPower:{default:4},activatePalette:{type:Boolean,default:!0},activateSkybox:{type:Boolean,default:!1},activateTessellation:{type:Boolean,default:!1},activateWebcam:{type:Boolean,default:!1},activateShading:{type:Boolean,default:!0},activateZebra:{type:Boolean,default:!1},activateSmoothness:{type:Boolean,default:!0},activateAnimate:{type:Boolean,default:!1},dprMultiplier:{default:2},maxIterationMultiplier:{default:1},targetFps:{default:60},gpuLoadMultiplier:{default:1},interpolationMode:{default:"lab"}},{cx:{default:"-1.5"},cxModifiers:{},cy:{default:"0.0"},cyModifiers:{},scale:{default:"2.5"},scaleModifiers:{},angle:{default:0},angleModifiers:{}}),emits:["update:cx","update:cy","update:scale","update:angle"],setup(e,{expose:t}){const r=bt(null);let i=null,a=null,o,c=!1;const d=re(e,"cx"),s=re(e,"cy"),x=re(e,"scale"),p=re(e,"angle");$e(()=>[d.value,s.value,x.value,p.value],([f,B,M,P],[R,A,w,U])=>{c||o&&(!f||!B||!M||((f!==R||B!==A)&&o.origin(f,B),M!==w&&o.scale(M),P!==U&&o.angle(Number(P))))},{flush:"sync"});const h=e;$e(()=>h.dprMultiplier,f=>{a&&(a.dprMultiplier=f,u())}),$e(()=>h.targetFps,f=>{a&&(a.targetFps=f)}),$e(()=>h.gpuLoadMultiplier,f=>{a&&(a.gpuLoadMultiplier=f)});async function S(){if(!a||!o)return;const f=o.step();if(!f)return;const[B,M]=f,[P,R,A,w]=o.get_params();c=!0,d.value=P,s.value=R,x.value=A,p.value=parseFloat(w),await ta(),c=!1;const U=Math.min(Math.max(100,1e3*h.maxIterationMultiplier*Math.log2(1/parseFloat(A))),1e5);await a.update({cx:P,cy:R,dx:parseFloat(B),dy:parseFloat(M),mu:h.mu,scale:parseFloat(A),angle:parseFloat(w),maxIterations:U,epsilon:h.epsilon},{shadingLevel:h.shadingLevel,tessellationLevel:h.tessellationLevel,lightAngle:h.lightAngle,displacementAmount:h.displacementAmount,specularPower:h.specularPower,antialiasLevel:h.antialiasLevel,palettePeriod:h.palettePeriod,paletteOffset:h.paletteOffset,colorStops:ra(h.colorStops),interpolationMode:h.interpolationMode,activateShading:h.activateShading,activateTessellation:h.activateTessellation,activateWebcam:h.activateWebcam,activatePalette:h.activatePalette,activateSkybox:h.activateSkybox,activateSmoothness:h.activateSmoothness,activateZebra:h.activateZebra,activateAnimate:h.activateAnimate}),await a.render()}async function g(){if(r.value)return i=r.value,o=new Ke(d.value,s.value,x.value,Number(p.value)),o.origin(d.value,s.value),o.scale(x.value),o.angle(Number(p.value)),a=new pt(i,{activatePalette:h.activatePalette,activateSkybox:h.activateSkybox,shadingLevel:h.shadingLevel,tessellationLevel:h.tessellationLevel,lightAngle:h.lightAngle,displacementAmount:h.displacementAmount,specularPower:h.specularPower,antialiasLevel:h.antialiasLevel,palettePeriod:h.palettePeriod,paletteOffset:h.paletteOffset,colorStops:h.colorStops,interpolationMode:h.interpolationMode,activateShading:h.activateShading,activateTessellation:h.activateTessellation,activateWebcam:h.activateWebcam,activateSmoothness:h.activateSmoothness,activateZebra:h.activateZebra,activateAnimate:h.activateAnimate}),a.initialize(o)}async function u(){if(!r.value||!a)return;const f=r.value.getBoundingClientRect();r.value.width=f.width,r.value.height=f.height,a.resize()}return mr(async()=>{await g(),window.addEventListener("resize",u),await u(),a&&a.startRenderLoop(S)}),gr(()=>{a==null||a.stopRenderLoop(),window.removeEventListener("resize",u)}),t({getCanvas:()=>r.value,getEngine:()=>a,getNavigator:()=>o,translate:(f,B)=>o==null?void 0:o.translate(f,B),translateDirect:(f,B)=>o==null?void 0:o.translate_direct(f,B),rotate:f=>o==null?void 0:o.rotate(f),angle:f=>o==null?void 0:o.angle(f),zoom:f=>o==null?void 0:o.zoom(f),step:()=>o==null?void 0:o.step(),getParams:()=>o==null?void 0:o.get_params(),drawOnce:async()=>S(),resize:async()=>u(),initialize:async()=>g()}),(f,B)=>(Ye(),We("canvas",{ref_key:"canvasRef",ref:r},null,512))}}),er={class:"mobile-nav-controls"},tr={key:0,class:"directional-controls"},rr=_t({__name:"MobileNavigationControls",props:Ze({mandelbrotRef:{}},{expanded:{type:Boolean,default:!1},expandedModifiers:{}}),emits:["update:expanded"],setup(e){const t=e,r=re(e,"expanded"),i=bt(null);let a=null;const o=()=>{r.value=!r.value,r.value||d()},c=g=>{g.preventDefault(),g.stopPropagation(),o()},d=()=>{i.value=null,a!==null&&(clearInterval(a),a=null)},s=g=>{i.value=g;const u=.01,f=()=>{if(t.mandelbrotRef)switch(g){case"north":t.mandelbrotRef.translate(0,u);break;case"south":t.mandelbrotRef.translate(0,-u);break;case"west":t.mandelbrotRef.translate(-u,0);break;case"east":t.mandelbrotRef.translate(u,0);break}};f(),a=window.setInterval(f,16)},x=g=>{i.value=`rotate-${g}`;const u=.025,f=()=>{t.mandelbrotRef&&(g==="left"?t.mandelbrotRef.rotate(u):t.mandelbrotRef.rotate(-u))};f(),a=window.setInterval(f,16)},p=g=>{i.value=`zoom-${g}`;const u=.97,f=()=>{t.mandelbrotRef&&(g==="in"?t.mandelbrotRef.zoom(u):t.mandelbrotRef.zoom(1/u))};f(),a=window.setInterval(f,16)},h=(g,u)=>{g.preventDefault(),u()},S=g=>{g.preventDefault(),d()};return(g,u)=>(Ye(),We("div",er,[k("button",{class:ce(["nav-button compass-button",{active:r.value}]),onClick:o,onTouchend:c,"aria-label":"Toggle navigation"},[...u[16]||(u[16]=[ia('<svg width="32" height="32" viewBox="0 0 24 24" fill="none" class="nav-icon" data-v-f6539aac><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" data-v-f6539aac></circle><path d="M12 2 L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-f6539aac></path><path d="M12 18 L12 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-f6539aac></path><path d="M2 12 L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-f6539aac></path><path d="M18 12 L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-f6539aac></path><path d="M12 7 L10 12 L12 14 L14 12 Z" fill="currentColor" data-v-f6539aac></path><text x="12" y="6" text-anchor="middle" font-size="6" fill="currentColor" font-weight="bold" data-v-f6539aac>N</text></svg>',1)])],34),xt(aa,{name:"fade"},{default:oa(()=>[r.value?(Ye(),We("div",tr,[k("button",{class:ce(["nav-button direction-button north",{active:i.value==="north"}]),onTouchstart:u[0]||(u[0]=f=>h(f,()=>s("north"))),onTouchend:S,onMousedown:u[1]||(u[1]=f=>s("north")),onMouseup:d,onMouseleave:d,"aria-label":"Move North"},[...u[17]||(u[17]=[k("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[k("path",{d:"M12 5 L18 11 L15 11 L15 19 L9 19 L9 11 L6 11 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),k("button",{class:ce(["nav-button direction-button south",{active:i.value==="south"}]),onTouchstart:u[2]||(u[2]=f=>h(f,()=>s("south"))),onTouchend:S,onMousedown:u[3]||(u[3]=f=>s("south")),onMouseup:d,onMouseleave:d,"aria-label":"Move South"},[...u[18]||(u[18]=[k("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[k("path",{d:"M12 19 L6 13 L9 13 L9 5 L15 5 L15 13 L18 13 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),k("button",{class:ce(["nav-button direction-button west",{active:i.value==="west"}]),onTouchstart:u[4]||(u[4]=f=>h(f,()=>s("west"))),onTouchend:S,onMousedown:u[5]||(u[5]=f=>s("west")),onMouseup:d,onMouseleave:d,"aria-label":"Move West"},[...u[19]||(u[19]=[k("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[k("path",{d:"M5 12 L11 18 L11 15 L19 15 L19 9 L11 9 L11 6 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),k("button",{class:ce(["nav-button direction-button east",{active:i.value==="east"}]),onTouchstart:u[6]||(u[6]=f=>h(f,()=>s("east"))),onTouchend:S,onMousedown:u[7]||(u[7]=f=>s("east")),onMouseup:d,onMouseleave:d,"aria-label":"Move East"},[...u[20]||(u[20]=[k("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[k("path",{d:"M19 12 L13 6 L13 9 L5 9 L5 15 L13 15 L13 18 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),k("button",{class:ce(["nav-button corner-button rotate-left",{active:i.value==="rotate-left"}]),onTouchstart:u[8]||(u[8]=f=>h(f,()=>x("left"))),onTouchend:S,onMousedown:u[9]||(u[9]=f=>x("left")),onMouseup:d,onMouseleave:d,"aria-label":"Rotate Left"},[...u[21]||(u[21]=[k("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[k("path",{d:"M16 8 A6 6 0 1 0 8 16",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round"}),k("path",{d:"M5 16 L8 16 L8 13",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round","stroke-linejoin":"round"})],-1)])],34),k("button",{class:ce(["nav-button corner-button rotate-right",{active:i.value==="rotate-right"}]),onTouchstart:u[10]||(u[10]=f=>h(f,()=>x("right"))),onTouchend:S,onMousedown:u[11]||(u[11]=f=>x("right")),onMouseup:d,onMouseleave:d,"aria-label":"Rotate Right"},[...u[22]||(u[22]=[k("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[k("path",{d:"M8 8 A6 6 0 1 1 16 16",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round"}),k("path",{d:"M19 16 L16 16 L16 13",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round","stroke-linejoin":"round"})],-1)])],34),k("button",{class:ce(["nav-button corner-button zoom-out",{active:i.value==="zoom-out"}]),onTouchstart:u[12]||(u[12]=f=>h(f,()=>p("out"))),onTouchend:S,onMousedown:u[13]||(u[13]=f=>p("out")),onMouseup:d,onMouseleave:d,"aria-label":"Zoom Out"},[...u[23]||(u[23]=[k("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[k("circle",{cx:"11",cy:"11",r:"7",stroke:"currentColor","stroke-width":"2"}),k("path",{d:"M18 18 L22 22",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"}),k("path",{d:"M8 11 L14 11",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"})],-1)])],34),k("button",{class:ce(["nav-button corner-button zoom-in",{active:i.value==="zoom-in"}]),onTouchstart:u[14]||(u[14]=f=>h(f,()=>p("in"))),onTouchend:S,onMousedown:u[15]||(u[15]=f=>p("in")),onMouseup:d,onMouseleave:d,"aria-label":"Zoom In"},[...u[24]||(u[24]=[k("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[k("circle",{cx:"11",cy:"11",r:"7",stroke:"currentColor","stroke-width":"2"}),k("path",{d:"M18 18 L22 22",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"}),k("path",{d:"M11 8 L11 14",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"}),k("path",{d:"M8 11 L14 11",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"})],-1)])],34)])):na("",!0)]),_:1})]))}}),ir=_r(rr,[["__scopeId","data-v-f6539aac"]]),ar={style:{position:"relative",width:"100%",height:"100%"}},Ae=.01,vt=.025,or=300,nr=30,sr=_t({__name:"MandelbrotController",props:Ze({mu:{},epsilon:{},colorStops:{},antialiasLevel:{},tessellationLevel:{},shadingLevel:{},lightAngle:{},displacementAmount:{},specularPower:{},palettePeriod:{},paletteOffset:{},activatePalette:{type:Boolean},activateSkybox:{type:Boolean},activateTessellation:{type:Boolean},activateWebcam:{type:Boolean},activateShading:{type:Boolean},activateZebra:{type:Boolean},activateSmoothness:{type:Boolean},activateAnimate:{type:Boolean},dprMultiplier:{},maxIterationMultiplier:{},targetFps:{},gpuLoadMultiplier:{},interpolationMode:{},pickerMode:{type:Boolean}},{cx:{},cxModifiers:{},cy:{},cyModifiers:{},scale:{},scaleModifiers:{},angle:{},angleModifiers:{},mobileNavExpanded:{type:Boolean,default:!1},mobileNavExpandedModifiers:{}}),emits:Ze(["cursorCoord","palettePick"],["update:cx","update:cy","update:scale","update:angle","update:mobileNavExpanded"]),setup(e,{expose:t,emit:r}){const i=re(e,"cx"),a=re(e,"cy"),o=re(e,"scale"),c=re(e,"angle"),d=re(e,"mobileNavExpanded"),s=e,x=r,p=bt(null);let h=!1,S=0,g=0;function u(){var F;if(!h)return;const l=Y();if(!l)return;const v=l.getBoundingClientRect(),_=S-v.left,z=g-v.top,L=(F=p.value)==null?void 0:F.getNavigator();if(!L)return;const E=L.pixel_to_complex(_,z,v.width,v.height);!E||E.length<2||x("cursorCoord",{re:E[0],im:E[1]},S,g)}function f(l){h=!0,S=l.clientX,g=l.clientY}function B(){h=!1,x("cursorCoord",null,0,0)}const M={};t({getCanvas:Y,getEngine:()=>{var l;return((l=p.value)==null?void 0:l.getEngine())??null}});let P=!1,R=!1,A=0,w=0,U=0,b=0,T=0,O=!1,I=0,G=null,D=0,oe=0,X=0;function Y(){var l;return((l=p.value)==null?void 0:l.getCanvas())??null}function Z(l){const v=Y();if(!v)return{x:0,y:0,width:0,height:0};const _=v.getBoundingClientRect();return{x:l.clientX-_.left,y:l.clientY-_.top,width:_.width,height:_.height}}function H(l){var _,z,L;const v=(z=(_=l.target)==null?void 0:_.tagName)==null?void 0:z.toLowerCase();v==="input"||v==="textarea"||v==="select"||(L=l.target)!=null&&L.isContentEditable||(M[l.code]=!0)}function te(l){M[l.code]=!1}function q(l){var _,z;if(s.pickerMode){l.preventDefault();return}l.preventDefault();const v=.95;l.deltaY<0?(_=p.value)==null||_.zoom(v):(z=p.value)==null||z.zoom(1/v),u()}function j(l,v){var Se;const _=Y();if(!_)return;const z=_.getBoundingClientRect(),L=l-z.left,E=v-z.top,F=z.width,V=z.height,K=F/V,le=(L-F/2)/F*2,ue=(E-V/2)/V*2;(Se=p.value)==null||Se.translateDirect(le*K,-ue)}function ne(l){if(s.pickerMode){l.preventDefault();return}l.preventDefault(),j(l.clientX,l.clientY)}function se(l){if(s.pickerMode||l.touches.length!==0)return;const v=Date.now(),_=l.changedTouches[0];if(!_)return;const z=_.clientX,L=_.clientY;v-D<or&&Math.hypot(z-oe,L-X)<nr?(l.preventDefault(),j(z,L),D=0):(D=v,oe=z,X=L)}function Ee(l){if(s.pickerMode){l.preventDefault(),he(l);return}if(l.button===2)R=!0;else{P=!0;const v=Z(l);A=v.x,w=v.y}}async function he(l){var V;const v=(V=p.value)==null?void 0:V.getEngine();if(!v)return;const _=Y();if(!_)return;const z=_.getBoundingClientRect(),L=l.clientX-z.left,E=l.clientY-z.top,F=await v.readIterationDataAt(L,E,z.width,z.height);F&&x("palettePick",F,l.clientX,l.clientY)}function lr(l){var V,K;if(S=l.clientX,g=l.clientY,u(),s.pickerMode)return;const v=Z(l);if(R){const le=Y();if(!le)return;const ue=le.getBoundingClientRect(),Se=ue.width/2,mt=ue.height/2,gt=v.x,Hi=v.y,Ki=Math.atan2(Hi-mt,gt-Se);(V=p.value)==null||V.angle(Ki);return}if(!P)return;const _=v.width,z=v.height,L=_/z,E=(v.x-A)/_*2,F=(v.y-w)/z*2;(K=p.value)==null||K.translateDirect(-E*L,F),A=v.x,w=v.y}function ur(l){s.pickerMode||(l.button===2?R=!1:P=!1)}function cr(l){var _;if(s.pickerMode)return;const v=Y();if(v){if(l.touches.length===1){P=!0;const z=l.touches[0],L=v.getBoundingClientRect();A=z.clientX-L.left,w=z.clientY-L.top}else if(l.touches.length===2){P=!1,O=!0;const[z,L]=l.touches;U=Math.hypot(L.clientX-z.clientX,L.clientY-z.clientY),I=U,b=Math.atan2(L.clientY-z.clientY,L.clientX-z.clientX);const E=(_=p.value)==null?void 0:_.getParams();T=E?parseFloat(E[3]):0}}}function dr(l){var _,z,L;if(s.pickerMode)return;const v=Y();if(v){if(P&&l.touches.length===1){const E=l.touches[0],F=v.getBoundingClientRect(),V=E.clientX-F.left,K=E.clientY-F.top,le=F.width,ue=F.height,Se=le/ue,mt=(V-A)/le*2,gt=(K-w)/ue*2;(_=p.value)==null||_.translateDirect(-mt*Se,gt),A=V,w=K}else if(O&&l.touches.length===2){const[E,F]=l.touches,V=Math.hypot(F.clientX-E.clientX,F.clientY-E.clientY),K=Math.atan2(F.clientY-E.clientY,F.clientX-E.clientX),le=I/V;I=V,(z=p.value)==null||z.zoom(le);const ue=K-b;(L=p.value)==null||L.angle(T+ue)}}}function fr(l){l.touches.length===0&&(P=!1,O=!1)}function hr(){var l,v,_,z,L,E,F,V;if(!s.pickerMode){M.KeyW&&((l=p.value)==null||l.translate(0,Ae)),M.KeyS&&((v=p.value)==null||v.translate(0,-Ae)),M.KeyA&&((_=p.value)==null||_.translate(-Ae,0)),M.KeyD&&((z=p.value)==null||z.translate(Ae,0)),M.KeyQ&&((L=p.value)==null||L.rotate(vt)),M.KeyE&&((E=p.value)==null||E.rotate(-vt));const K=.95;M.KeyR&&((F=p.value)==null||F.zoom(K)),M.KeyF&&((V=p.value)==null||V.zoom(1/K))}u(),G=window.setTimeout(hr,16)}return mr(async()=>{const l=Y();l&&(window.addEventListener("keydown",H),window.addEventListener("keyup",te),l.addEventListener("wheel",q,{passive:!1}),l.addEventListener("mousedown",Ee),l.addEventListener("dblclick",ne),l.addEventListener("contextmenu",v=>v.preventDefault()),l.addEventListener("mouseenter",f),l.addEventListener("mouseleave",B),window.addEventListener("mousemove",lr),window.addEventListener("mouseup",ur),l.addEventListener("touchstart",cr,{passive:!1}),l.addEventListener("touchmove",dr,{passive:!1}),l.addEventListener("touchend",fr,{passive:!1}),l.addEventListener("touchend",se,{passive:!1}),hr())}),gr(()=>{G!==null&&clearTimeout(G);const l=Y();window.removeEventListener("keydown",H),window.removeEventListener("keyup",te),window.removeEventListener("mousemove",lr),window.removeEventListener("mouseup",ur),l&&(l.removeEventListener("wheel",q),l.removeEventListener("mousedown",Ee),l.removeEventListener("dblclick",ne),l.removeEventListener("contextmenu",v=>v.preventDefault()),l.removeEventListener("mouseenter",f),l.removeEventListener("mouseleave",B),l.removeEventListener("touchstart",cr),l.removeEventListener("touchmove",dr),l.removeEventListener("touchend",fr),l.removeEventListener("touchend",se))}),(l,v)=>(Ye(),We("div",ar,[xt(yt,{ref_key:"mandelbrotRef",ref:p,scale:o.value,"onUpdate:scale":v[0]||(v[0]=_=>o.value=_),angle:c.value,"onUpdate:angle":v[1]||(v[1]=_=>c.value=_),cx:i.value,"onUpdate:cx":v[2]||(v[2]=_=>i.value=_),cy:a.value,"onUpdate:cy":v[3]||(v[3]=_=>a.value=_),mu:s.mu,epsilon:s.epsilon,antialiasLevel:s.antialiasLevel,shadingLevel:s.shadingLevel,lightAngle:s.lightAngle,displacementAmount:s.displacementAmount,specularPower:s.specularPower,palettePeriod:s.palettePeriod,tessellationLevel:s.tessellationLevel,colorStops:s.colorStops,activatePalette:s.activatePalette,activateSkybox:s.activateSkybox,activateTessellation:s.activateTessellation,activateWebcam:s.activateWebcam,activateShading:s.activateShading,activateZebra:s.activateZebra,activateSmoothness:s.activateSmoothness,activateAnimate:s.activateAnimate,paletteOffset:s.paletteOffset,dprMultiplier:s.dprMultiplier,maxIterationMultiplier:s.maxIterationMultiplier,targetFps:s.targetFps,gpuLoadMultiplier:s.gpuLoadMultiplier,interpolationMode:s.interpolationMode},null,8,["scale","angle","cx","cy","mu","epsilon","antialiasLevel","shadingLevel","lightAngle","displacementAmount","specularPower","palettePeriod","tessellationLevel","colorStops","activatePalette","activateSkybox","activateTessellation","activateWebcam","activateShading","activateZebra","activateSmoothness","activateAnimate","paletteOffset","dprMultiplier","maxIterationMultiplier","targetFps","gpuLoadMultiplier","interpolationMode"]),xt(ir,{"mandelbrot-ref":p.value,expanded:d.value,"onUpdate:expanded":v[4]||(v[4]=_=>d.value=_)},null,8,["mandelbrot-ref","expanded"])]))}}),br=_r(sr,[["__scopeId","data-v-fb823e0b"]])})();export{br as M,yt as _,sa as __tla};
