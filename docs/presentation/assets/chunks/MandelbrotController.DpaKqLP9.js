var Hi=Object.defineProperty;var Xi=(he,re,be)=>re in he?Hi(he,re,{enumerable:!0,configurable:!0,writable:!0,value:be}):he[re]=be;var s=(he,re,be)=>Xi(he,typeof re!="symbol"?re+"":re,be);import{aq as Ki,ar as Ji,as as Qi,d as mt,at as te,z as $e,p as hr,s as pr,o as Fe,c as Ue,au as We,y as gt,U as ea,av as ta,j as T,an as ra,n as ue,J as bt,T as ia,w as aa,a as oa,a2 as na,e as sa,_ as vr}from"./framework.B3Tslxqz.js";let mr,_t,la=(async()=>{const he=`// Mandelbrot progressive-iteration shader.
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
`,re=`struct Uniforms {
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
`,gr=`// Resolve pass: replaces remaining sentinels with a snapped parent pixel.
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
`,br=`// Compute pass: counts pixels that still need rendering work.
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
`,_r=async(e={},t)=>{let r;if(t.startsWith("data:")){const i=t.replace(/^data:.*?base64,/,"");let a;if(typeof Buffer=="function"&&typeof Buffer.from=="function")a=Buffer.from(i,"base64");else if(typeof atob=="function"){const o=atob(i);a=new Uint8Array(o.length);for(let c=0;c<o.length;c++)a[c]=o.charCodeAt(c)}else throw new Error("Cannot decode base64-encoded data URL");r=await WebAssembly.instantiate(a,e)}else{const i=await fetch(t),a=i.headers.get("Content-Type")||"";if("instantiateStreaming"in WebAssembly&&a.startsWith("application/wasm"))r=await WebAssembly.instantiateStreaming(i,e);else{const o=await i.arrayBuffer();r=await WebAssembly.instantiate(o,e)}}return r.instance.exports};let m;function xr(e){m=e}let Ee=null;function Ge(){return(Ee===null||Ee.byteLength===0)&&(Ee=new Uint8Array(m.memory.buffer)),Ee}let Ne=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0});Ne.decode();const yr=2146435072;let je=0;function wr(e,t){return je+=t,je>=yr&&(Ne=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0}),Ne.decode(),je=t),Ne.decode(Ge().subarray(e,e+t))}function xt(e,t){return e=e>>>0,wr(e,t)}let _e=null;function zr(){return(_e===null||_e.buffer.detached===!0||_e.buffer.detached===void 0&&_e.buffer!==m.memory.buffer)&&(_e=new DataView(m.memory.buffer)),_e}function Ze(e,t){e=e>>>0;const r=zr(),i=[];for(let a=e;a<e+4*t;a+=4)i.push(m.__wbindgen_export_0.get(r.getUint32(a,!0)));return m.__externref_drop_slice(e,t),i}let ce=0;const Se=new TextEncoder;"encodeInto"in Se||(Se.encodeInto=function(e,t){const r=Se.encode(e);return t.set(r),{read:e.length,written:r.length}});function xe(e,t,r){if(r===void 0){const d=Se.encode(e),l=t(d.length,1)>>>0;return Ge().subarray(l,l+d.length).set(d),ce=d.length,l}let i=e.length,a=t(i,1)>>>0;const o=Ge();let c=0;for(;c<i;c++){const d=e.charCodeAt(c);if(d>127)break;o[a+c]=d}if(c!==i){c!==0&&(e=e.slice(c)),a=r(a,i,i=c+e.length*3,1)>>>0;const d=Ge().subarray(a+c,a+i),l=Se.encodeInto(e,d);c+=l.written,a=r(a,i,c,1)>>>0}return ce=c,a}const yt=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(e=>m.__wbg_mandelbrotnavigator_free(e>>>0,1));class He{__destroy_into_raw(){const t=this.__wbg_ptr;return this.__wbg_ptr=0,yt.unregister(this),t}free(){const t=this.__destroy_into_raw();m.__wbg_mandelbrotnavigator_free(t,0)}get_params(){const t=m.mandelbrotnavigator_get_params(this.__wbg_ptr);var r=Ze(t[0],t[1]).slice();return m.__wbindgen_free(t[0],t[1]*4,4),r}rotate_direct(t){m.mandelbrotnavigator_rotate_direct(this.__wbg_ptr,t)}pixel_to_complex(t,r,i,a){const o=m.mandelbrotnavigator_pixel_to_complex(this.__wbg_ptr,t,r,i,a);var c=Ze(o[0],o[1]).slice();return m.__wbindgen_free(o[0],o[1]*4,4),c}translate_direct(t,r){m.mandelbrotnavigator_translate_direct(this.__wbg_ptr,t,r)}get_reference_orbit_len(){return m.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr)>>>0}compute_reference_orbit_ptr(t){const r=m.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr,t);return ye.__wrap(r)}get_reference_orbit_capacity(){return m.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr)>>>0}compute_reference_orbit_chunk(t,r){const i=m.mandelbrotnavigator_compute_reference_orbit_chunk(this.__wbg_ptr,t,r);return ye.__wrap(i)}constructor(t,r,i,a){const o=xe(t,m.__wbindgen_malloc,m.__wbindgen_realloc),c=ce,d=xe(r,m.__wbindgen_malloc,m.__wbindgen_realloc),l=ce,x=xe(i,m.__wbindgen_malloc,m.__wbindgen_realloc),h=ce,f=m.mandelbrotnavigator_new(o,c,d,l,x,h,a);return this.__wbg_ptr=f>>>0,yt.register(this,this.__wbg_ptr,this),this}step(){const t=m.mandelbrotnavigator_step(this.__wbg_ptr);var r=Ze(t[0],t[1]).slice();return m.__wbindgen_free(t[0],t[1]*4,4),r}zoom(t){m.mandelbrotnavigator_zoom(this.__wbg_ptr,t)}angle(t){m.mandelbrotnavigator_angle(this.__wbg_ptr,t)}scale(t){const r=xe(t,m.__wbindgen_malloc,m.__wbindgen_realloc),i=ce;m.mandelbrotnavigator_scale(this.__wbg_ptr,r,i)}origin(t,r){const i=xe(t,m.__wbindgen_malloc,m.__wbindgen_realloc),a=ce,o=xe(r,m.__wbindgen_malloc,m.__wbindgen_realloc),c=ce;m.mandelbrotnavigator_origin(this.__wbg_ptr,i,a,o,c)}rotate(t){m.mandelbrotnavigator_rotate(this.__wbg_ptr,t)}translate(t,r){m.mandelbrotnavigator_translate(this.__wbg_ptr,t,r)}}Symbol.dispose&&(He.prototype[Symbol.dispose]=He.prototype.free),typeof FinalizationRegistry>"u"||new FinalizationRegistry(e=>m.__wbg_mandelbrotstep_free(e>>>0,1));const wt=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(e=>m.__wbg_orbitbufferinfo_free(e>>>0,1));class ye{static __wrap(t){t=t>>>0;const r=Object.create(ye.prototype);return r.__wbg_ptr=t,wt.register(r,r.__wbg_ptr,r),r}__destroy_into_raw(){const t=this.__wbg_ptr;return this.__wbg_ptr=0,wt.unregister(this),t}free(){const t=this.__destroy_into_raw();m.__wbg_orbitbufferinfo_free(t,0)}get ptr(){return m.__wbg_get_orbitbufferinfo_ptr(this.__wbg_ptr)>>>0}set ptr(t){m.__wbg_set_orbitbufferinfo_ptr(this.__wbg_ptr,t)}get offset(){return m.__wbg_get_orbitbufferinfo_offset(this.__wbg_ptr)>>>0}set offset(t){m.__wbg_set_orbitbufferinfo_offset(this.__wbg_ptr,t)}get count(){return m.__wbg_get_orbitbufferinfo_count(this.__wbg_ptr)>>>0}set count(t){m.__wbg_set_orbitbufferinfo_count(this.__wbg_ptr,t)}}Symbol.dispose&&(ye.prototype[Symbol.dispose]=ye.prototype.free);function Mr(e){return Math.exp(e)}function Tr(){return Date.now()}function kr(e,t){throw new Error(xt(e,t))}function Sr(e,t){return xt(e,t)}function Lr(){const e=m.__wbindgen_export_0,t=e.grow(4);e.set(0,void 0),e.set(t+0,void 0),e.set(t+1,null),e.set(t+2,!0),e.set(t+3,!1)}URL=globalThis.URL;const y=await _r({"./mandelbrot_bg.js":{__wbg_now_1e80617bcee43265:Tr,__wbg_exp_9293ded1248e1bd3:Mr,__wbg_wbindgenthrow_451ec1a8469d7eb6:kr,__wbindgen_init_externref_table:Lr,__wbindgen_cast_2241b6af4c4b2941:Sr}},Ki),zt=y.memory,Br=y.__wbg_get_mandelbrotstep_dx,Rr=y.__wbg_get_mandelbrotstep_dy,Cr=y.__wbg_get_mandelbrotstep_zx,Pr=y.__wbg_get_mandelbrotstep_zy,Ar=y.__wbg_get_orbitbufferinfo_count,Fr=y.__wbg_get_orbitbufferinfo_offset,Ur=y.__wbg_get_orbitbufferinfo_ptr,Er=y.__wbg_mandelbrotnavigator_free,Gr=y.__wbg_mandelbrotstep_free,Nr=y.__wbg_orbitbufferinfo_free,Or=y.__wbg_set_mandelbrotstep_dx,Ir=y.__wbg_set_mandelbrotstep_dy,Vr=y.__wbg_set_mandelbrotstep_zx,Dr=y.__wbg_set_mandelbrotstep_zy,qr=y.__wbg_set_orbitbufferinfo_count,Yr=y.__wbg_set_orbitbufferinfo_offset,$r=y.__wbg_set_orbitbufferinfo_ptr,Wr=y.mandelbrotnavigator_angle,jr=y.mandelbrotnavigator_compute_reference_orbit_chunk,Zr=y.mandelbrotnavigator_compute_reference_orbit_ptr,Hr=y.mandelbrotnavigator_get_params,Xr=y.mandelbrotnavigator_get_reference_orbit_capacity,Kr=y.mandelbrotnavigator_get_reference_orbit_len,Jr=y.mandelbrotnavigator_new,Qr=y.mandelbrotnavigator_origin,ei=y.mandelbrotnavigator_pixel_to_complex,ti=y.mandelbrotnavigator_rotate,ri=y.mandelbrotnavigator_rotate_direct,ii=y.mandelbrotnavigator_scale,ai=y.mandelbrotnavigator_step,oi=y.mandelbrotnavigator_translate,ni=y.mandelbrotnavigator_translate_direct,si=y.mandelbrotnavigator_zoom,li=y.__wbindgen_export_0,ui=y.__externref_drop_slice,ci=y.__wbindgen_free,di=y.__wbindgen_malloc,fi=y.__wbindgen_realloc,Mt=y.__wbindgen_start,hi=Object.freeze(Object.defineProperty({__proto__:null,__externref_drop_slice:ui,__wbg_get_mandelbrotstep_dx:Br,__wbg_get_mandelbrotstep_dy:Rr,__wbg_get_mandelbrotstep_zx:Cr,__wbg_get_mandelbrotstep_zy:Pr,__wbg_get_orbitbufferinfo_count:Ar,__wbg_get_orbitbufferinfo_offset:Fr,__wbg_get_orbitbufferinfo_ptr:Ur,__wbg_mandelbrotnavigator_free:Er,__wbg_mandelbrotstep_free:Gr,__wbg_orbitbufferinfo_free:Nr,__wbg_set_mandelbrotstep_dx:Or,__wbg_set_mandelbrotstep_dy:Ir,__wbg_set_mandelbrotstep_zx:Vr,__wbg_set_mandelbrotstep_zy:Dr,__wbg_set_orbitbufferinfo_count:qr,__wbg_set_orbitbufferinfo_offset:Yr,__wbg_set_orbitbufferinfo_ptr:$r,__wbindgen_export_0:li,__wbindgen_free:ci,__wbindgen_malloc:di,__wbindgen_realloc:fi,__wbindgen_start:Mt,mandelbrotnavigator_angle:Wr,mandelbrotnavigator_compute_reference_orbit_chunk:jr,mandelbrotnavigator_compute_reference_orbit_ptr:Zr,mandelbrotnavigator_get_params:Hr,mandelbrotnavigator_get_reference_orbit_capacity:Xr,mandelbrotnavigator_get_reference_orbit_len:Kr,mandelbrotnavigator_new:Jr,mandelbrotnavigator_origin:Qr,mandelbrotnavigator_pixel_to_complex:ei,mandelbrotnavigator_rotate:ti,mandelbrotnavigator_rotate_direct:ri,mandelbrotnavigator_scale:ii,mandelbrotnavigator_step:ai,mandelbrotnavigator_translate:oi,mandelbrotnavigator_translate_direct:ni,mandelbrotnavigator_zoom:si,memory:zt},Symbol.toStringTag,{value:"Module"}));xr(hi),Mt();class pi{constructor(t=1024,r=1024){s(this,"video");s(this,"stream",null);s(this,"width");s(this,"height");s(this,"lastDrawTime",0);this.width=t,this.height=r,this.video=document.createElement("video"),this.video.autoplay=!0,this.video.width=t,this.video.height=r}async openWebcam(){this.stream||(this.stream=await navigator.mediaDevices.getUserMedia({video:{width:this.width,height:this.height}}),this.video.srcObject=this.stream,await this.video.play())}async drawWebGPUTexture(t,r){const i=performance.now();if(i-this.lastDrawTime>15){if(this.video.readyState<HTMLMediaElement.HAVE_CURRENT_DATA)return;r.queue.copyExternalImageToTexture({source:this.video},{texture:t},[this.width,this.height]),this.lastDrawTime=i}}closeWebcam(){this.stream&&(this.stream.getTracks().forEach(t=>t.stop()),this.stream=null)}}function we(e,t,r){e.prototype=t.prototype=r,r.constructor=e}function Le(e,t){var r=Object.create(e.prototype);for(var i in t)r[i]=t[i];return r}function de(){}var pe=.7,ze=1/pe,Me="\\s*([+-]?\\d+)\\s*",Be="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*",J="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*",vi=/^#([0-9a-f]{3,8})$/,mi=new RegExp(`^rgb\\(${Me},${Me},${Me}\\)$`),gi=new RegExp(`^rgb\\(${J},${J},${J}\\)$`),bi=new RegExp(`^rgba\\(${Me},${Me},${Me},${Be}\\)$`),_i=new RegExp(`^rgba\\(${J},${J},${J},${Be}\\)$`),xi=new RegExp(`^hsl\\(${Be},${J},${J}\\)$`),yi=new RegExp(`^hsla\\(${Be},${J},${J},${Be}\\)$`),Tt={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074};we(de,Xe,{copy(e){return Object.assign(new this.constructor,this,e)},displayable(){return this.rgb().displayable()},hex:kt,formatHex:kt,formatHex8:wi,formatHsl:zi,formatRgb:St,toString:St});function kt(){return this.rgb().formatHex()}function wi(){return this.rgb().formatHex8()}function zi(){return Pt(this).formatHsl()}function St(){return this.rgb().formatRgb()}function Xe(e){var t,r;return e=(e+"").trim().toLowerCase(),(t=vi.exec(e))?(r=t[1].length,t=parseInt(t[1],16),r===6?Lt(t):r===3?new G(t>>8&15|t>>4&240,t>>4&15|t&240,(t&15)<<4|t&15,1):r===8?Oe(t>>24&255,t>>16&255,t>>8&255,(t&255)/255):r===4?Oe(t>>12&15|t>>8&240,t>>8&15|t>>4&240,t>>4&15|t&240,((t&15)<<4|t&15)/255):null):(t=mi.exec(e))?new G(t[1],t[2],t[3],1):(t=gi.exec(e))?new G(t[1]*255/100,t[2]*255/100,t[3]*255/100,1):(t=bi.exec(e))?Oe(t[1],t[2],t[3],t[4]):(t=_i.exec(e))?Oe(t[1]*255/100,t[2]*255/100,t[3]*255/100,t[4]):(t=xi.exec(e))?Ct(t[1],t[2]/100,t[3]/100,1):(t=yi.exec(e))?Ct(t[1],t[2]/100,t[3]/100,t[4]):Tt.hasOwnProperty(e)?Lt(Tt[e]):e==="transparent"?new G(NaN,NaN,NaN,0):null}function Lt(e){return new G(e>>16&255,e>>8&255,e&255,1)}function Oe(e,t,r,i){return i<=0&&(e=t=r=NaN),new G(e,t,r,i)}function Ke(e){return e instanceof de||(e=Xe(e)),e?(e=e.rgb(),new G(e.r,e.g,e.b,e.opacity)):new G}function Re(e,t,r,i){return arguments.length===1?Ke(e):new G(e,t,r,i??1)}function G(e,t,r,i){this.r=+e,this.g=+t,this.b=+r,this.opacity=+i}we(G,Re,Le(de,{brighter(e){return e=e==null?ze:Math.pow(ze,e),new G(this.r*e,this.g*e,this.b*e,this.opacity)},darker(e){return e=e==null?pe:Math.pow(pe,e),new G(this.r*e,this.g*e,this.b*e,this.opacity)},rgb(){return this},clamp(){return new G(ve(this.r),ve(this.g),ve(this.b),Ie(this.opacity))},displayable(){return-.5<=this.r&&this.r<255.5&&-.5<=this.g&&this.g<255.5&&-.5<=this.b&&this.b<255.5&&0<=this.opacity&&this.opacity<=1},hex:Bt,formatHex:Bt,formatHex8:Mi,formatRgb:Rt,toString:Rt}));function Bt(){return`#${me(this.r)}${me(this.g)}${me(this.b)}`}function Mi(){return`#${me(this.r)}${me(this.g)}${me(this.b)}${me((isNaN(this.opacity)?1:this.opacity)*255)}`}function Rt(){const e=Ie(this.opacity);return`${e===1?"rgb(":"rgba("}${ve(this.r)}, ${ve(this.g)}, ${ve(this.b)}${e===1?")":`, ${e})`}`}function Ie(e){return isNaN(e)?1:Math.max(0,Math.min(1,e))}function ve(e){return Math.max(0,Math.min(255,Math.round(e)||0))}function me(e){return e=ve(e),(e<16?"0":"")+e.toString(16)}function Ct(e,t,r,i){return i<=0?e=t=r=NaN:r<=0||r>=1?e=t=NaN:t<=0&&(e=NaN),new K(e,t,r,i)}function Pt(e){if(e instanceof K)return new K(e.h,e.s,e.l,e.opacity);if(e instanceof de||(e=Xe(e)),!e)return new K;if(e instanceof K)return e;e=e.rgb();var t=e.r/255,r=e.g/255,i=e.b/255,a=Math.min(t,r,i),o=Math.max(t,r,i),c=NaN,d=o-a,l=(o+a)/2;return d?(t===o?c=(r-i)/d+(r<i)*6:r===o?c=(i-t)/d+2:c=(t-r)/d+4,d/=l<.5?o+a:2-o-a,c*=60):d=l>0&&l<1?0:c,new K(c,d,l,e.opacity)}function Je(e,t,r,i){return arguments.length===1?Pt(e):new K(e,t,r,i??1)}function K(e,t,r,i){this.h=+e,this.s=+t,this.l=+r,this.opacity=+i}we(K,Je,Le(de,{brighter(e){return e=e==null?ze:Math.pow(ze,e),new K(this.h,this.s,this.l*e,this.opacity)},darker(e){return e=e==null?pe:Math.pow(pe,e),new K(this.h,this.s,this.l*e,this.opacity)},rgb(){var e=this.h%360+(this.h<0)*360,t=isNaN(e)||isNaN(this.s)?0:this.s,r=this.l,i=r+(r<.5?r:1-r)*t,a=2*r-i;return new G(Qe(e>=240?e-240:e+120,a,i),Qe(e,a,i),Qe(e<120?e+240:e-120,a,i),this.opacity)},clamp(){return new K(At(this.h),Ve(this.s),Ve(this.l),Ie(this.opacity))},displayable(){return(0<=this.s&&this.s<=1||isNaN(this.s))&&0<=this.l&&this.l<=1&&0<=this.opacity&&this.opacity<=1},formatHsl(){const e=Ie(this.opacity);return`${e===1?"hsl(":"hsla("}${At(this.h)}, ${Ve(this.s)*100}%, ${Ve(this.l)*100}%${e===1?")":`, ${e})`}`}}));function At(e){return e=(e||0)%360,e<0?e+360:e}function Ve(e){return Math.max(0,Math.min(1,e||0))}function Qe(e,t,r){return(e<60?t+(r-t)*e/60:e<180?r:e<240?t+(r-t)*(240-e)/60:t)*255}const Ft=Math.PI/180,Ut=180/Math.PI,De=18,Et=.96422,Gt=1,Nt=.82521,Ot=4/29,Te=6/29,It=3*Te*Te,Ti=Te*Te*Te;function Vt(e){if(e instanceof Q)return new Q(e.l,e.a,e.b,e.opacity);if(e instanceof ie)return Dt(e);e instanceof G||(e=Ke(e));var t=at(e.r),r=at(e.g),i=at(e.b),a=tt((.2225045*t+.7168786*r+.0606169*i)/Gt),o,c;return t===r&&r===i?o=c=a:(o=tt((.4360747*t+.3850649*r+.1430804*i)/Et),c=tt((.0139322*t+.0971045*r+.7141733*i)/Nt)),new Q(116*a-16,500*(o-a),200*(a-c),e.opacity)}function et(e,t,r,i){return arguments.length===1?Vt(e):new Q(e,t,r,i??1)}function Q(e,t,r,i){this.l=+e,this.a=+t,this.b=+r,this.opacity=+i}we(Q,et,Le(de,{brighter(e){return new Q(this.l+De*(e??1),this.a,this.b,this.opacity)},darker(e){return new Q(this.l-De*(e??1),this.a,this.b,this.opacity)},rgb(){var e=(this.l+16)/116,t=isNaN(this.a)?e:e+this.a/500,r=isNaN(this.b)?e:e-this.b/200;return t=Et*rt(t),e=Gt*rt(e),r=Nt*rt(r),new G(it(3.1338561*t-1.6168667*e-.4906146*r),it(-.9787684*t+1.9161415*e+.033454*r),it(.0719453*t-.2289914*e+1.4052427*r),this.opacity)}}));function tt(e){return e>Ti?Math.pow(e,1/3):e/It+Ot}function rt(e){return e>Te?e*e*e:It*(e-Ot)}function it(e){return 255*(e<=.0031308?12.92*e:1.055*Math.pow(e,1/2.4)-.055)}function at(e){return(e/=255)<=.04045?e/12.92:Math.pow((e+.055)/1.055,2.4)}function ki(e){if(e instanceof ie)return new ie(e.h,e.c,e.l,e.opacity);if(e instanceof Q||(e=Vt(e)),e.a===0&&e.b===0)return new ie(NaN,0<e.l&&e.l<100?0:NaN,e.l,e.opacity);var t=Math.atan2(e.b,e.a)*Ut;return new ie(t<0?t+360:t,Math.sqrt(e.a*e.a+e.b*e.b),e.l,e.opacity)}function ot(e,t,r,i){return arguments.length===1?ki(e):new ie(e,t,r,i??1)}function ie(e,t,r,i){this.h=+e,this.c=+t,this.l=+r,this.opacity=+i}function Dt(e){if(isNaN(e.h))return new Q(e.l,0,0,e.opacity);var t=e.h*Ft;return new Q(e.l,Math.cos(t)*e.c,Math.sin(t)*e.c,e.opacity)}we(ie,ot,Le(de,{brighter(e){return new ie(this.h,this.c,this.l+De*(e??1),this.opacity)},darker(e){return new ie(this.h,this.c,this.l-De*(e??1),this.opacity)},rgb(){return Dt(this).rgb()}}));var qt=-.14861,nt=1.78277,st=-.29227,qe=-.90649,Ce=1.97294,Yt=Ce*qe,$t=Ce*nt,Wt=nt*st-qe*qt;function Si(e){if(e instanceof ge)return new ge(e.h,e.s,e.l,e.opacity);e instanceof G||(e=Ke(e));var t=e.r/255,r=e.g/255,i=e.b/255,a=(Wt*i+Yt*t-$t*r)/(Wt+Yt-$t),o=i-a,c=(Ce*(r-a)-st*o)/qe,d=Math.sqrt(c*c+o*o)/(Ce*a*(1-a)),l=d?Math.atan2(c,o)*Ut-120:NaN;return new ge(l<0?l+360:l,d,a,e.opacity)}function lt(e,t,r,i){return arguments.length===1?Si(e):new ge(e,t,r,i??1)}function ge(e,t,r,i){this.h=+e,this.s=+t,this.l=+r,this.opacity=+i}we(ge,lt,Le(de,{brighter(e){return e=e==null?ze:Math.pow(ze,e),new ge(this.h,this.s,this.l*e,this.opacity)},darker(e){return e=e==null?pe:Math.pow(pe,e),new ge(this.h,this.s,this.l*e,this.opacity)},rgb(){var e=isNaN(this.h)?0:(this.h+120)*Ft,t=+this.l,r=isNaN(this.s)?0:this.s*t*(1-t),i=Math.cos(e),a=Math.sin(e);return new G(255*(t+r*(qt*i+nt*a)),255*(t+r*(st*i+qe*a)),255*(t+r*(Ce*i)),this.opacity)}}));const ut=e=>()=>e;function jt(e,t){return function(r){return e+r*t}}function Li(e,t,r){return e=Math.pow(e,r),t=Math.pow(t,r)-e,r=1/r,function(i){return Math.pow(e+i*t,r)}}function ct(e,t){var r=t-e;return r?jt(e,r>180||r<-180?r-360*Math.round(r/360):r):ut(isNaN(e)?t:e)}function Bi(e){return(e=+e)==1?q:function(t,r){return r-t?Li(t,r,e):ut(isNaN(t)?r:t)}}function q(e,t){var r=t-e;return r?jt(e,r):ut(isNaN(e)?t:e)}const Ri=(function e(t){var r=Bi(t);function i(a,o){var c=r((a=Re(a)).r,(o=Re(o)).r),d=r(a.g,o.g),l=r(a.b,o.b),x=q(a.opacity,o.opacity);return function(h){return a.r=c(h),a.g=d(h),a.b=l(h),a.opacity=x(h),a+""}}return i.gamma=e,i})(1);function Ci(e){return function(t,r){var i=e((t=Je(t)).h,(r=Je(r)).h),a=q(t.s,r.s),o=q(t.l,r.l),c=q(t.opacity,r.opacity);return function(d){return t.h=i(d),t.s=a(d),t.l=o(d),t.opacity=c(d),t+""}}}const Pi=Ci(ct);function Zt(e,t){var r=q((e=et(e)).l,(t=et(t)).l),i=q(e.a,t.a),a=q(e.b,t.b),o=q(e.opacity,t.opacity);return function(c){return e.l=r(c),e.a=i(c),e.b=a(c),e.opacity=o(c),e+""}}function Ai(e){return function(t,r){var i=e((t=ot(t)).h,(r=ot(r)).h),a=q(t.c,r.c),o=q(t.l,r.l),c=q(t.opacity,r.opacity);return function(d){return t.h=i(d),t.c=a(d),t.l=o(d),t.opacity=c(d),t+""}}}const Fi=Ai(ct);function Ht(e){return(function t(r){r=+r;function i(a,o){var c=e((a=lt(a)).h,(o=lt(o)).h),d=q(a.s,o.s),l=q(a.l,o.l),x=q(a.opacity,o.opacity);return function(h){return a.h=c(h),a.s=d(h),a.l=l(Math.pow(h,r)),a.opacity=x(h),a+""}}return i.gamma=t,i})(1)}const Ui=Ht(ct);Ht(q);const Ei={lab:Zt,rgb:Ri,hcl:Fi,hsl:Pi,cubehelix:Ui};class Xt{constructor(t,r="lab"){s(this,"points");s(this,"interpolate");this.points=t.slice().sort((i,a)=>i.position-a.position),this.interpolate=Ei[r]??Zt}getColorAt(t){if(this.points.length===0)return"#000";if(t<=this.points[0].position)return this.points[0].color;if(t>=this.points[this.points.length-1].position)return this.points[this.points.length-1].color;for(let r=0;r<this.points.length-1;++r){const i=this.points[r],a=this.points[r+1];if(t>=i.position&&t<=a.position){const o=(t-i.position)/(a.position-i.position),c=this.interpolate(i.color,a.color);return Re(c(o)).formatHex()}}return"#000"}generateTexture(){const t=new ImageData(4096,1);for(let r=0;r<4096;++r){const i=r/4095,a=Re(this.getColorAt(i)),o=r*4;t.data[o]=a.r,t.data[o+1]=a.g,t.data[o+2]=a.b,t.data[o+3]=255}return t}}const dt=7,Gi=2048,Ni=64,Oi=1,Ii=2048,Vi=0,Ye=100,Di=1e4,qi=5e6,Yi=10,Kt=.25,$i=100;function Wi(e){const t=Math.max(1,Math.floor(e));return 2**Math.floor(Math.log2(t))}const Y=class Y{constructor(t,r){s(this,"snapshotCallback");s(this,"snapshotDestWidth");s(this,"canvas");s(this,"device");s(this,"queue");s(this,"adapter");s(this,"ctx");s(this,"format");s(this,"mandelbrotNavigator");s(this,"rawTexture");s(this,"rawArrayView");s(this,"rawLayerViews",[]);s(this,"rawBrushTexture");s(this,"rawBrushArrayView");s(this,"rawBrushLayerViews",[]);s(this,"resolvedTexture");s(this,"resolvedArrayView");s(this,"resolvedLayerViews",[]);s(this,"frozenTexture");s(this,"frozenArrayView");s(this,"uniformBufferMandelbrot");s(this,"uniformBufferColor");s(this,"uniformBufferBrush");s(this,"uniformBufferResolve");s(this,"mandelbrotReferenceBuffer");s(this,"pipelineBrush");s(this,"bindGroupBrush");s(this,"pipelineMandelbrot");s(this,"bindGroupMandelbrot");s(this,"pipelineResolve");s(this,"bindGroupResolve");s(this,"pipelineColor");s(this,"bindGroupColor");s(this,"pipelineCount");s(this,"counterBuffer");s(this,"counterReadBuffer");s(this,"counterBindGroup");s(this,"uniformBufferCount");s(this,"unfinishedPixelCount",-1);s(this,"activePixelCount",-1);s(this,"_rafId",null);s(this,"_drawFn",null);s(this,"fps",0);s(this,"isRendering",!1);s(this,"gpuFrameTimeMs",0);s(this,"smoothedGpuTimeMs",0);s(this,"refinementWasGated",!1);s(this,"_fpsFrameCount",0);s(this,"_fpsLastTime",0);s(this,"neutralSize",0);s(this,"shaderPassCompute");s(this,"shaderPassColor");s(this,"width",0);s(this,"height",0);s(this,"antialiasLevel");s(this,"palettePeriod");s(this,"previousMandelbrot");s(this,"previousRenderOptions");s(this,"needRender",!0);s(this,"orbitIncomplete",!1);s(this,"prevGuardedMaxIter",0);s(this,"currentGuardedMaxIter",0);s(this,"currentMaxIterations",0);s(this,"mandelbrotReference",new Float32Array(1e6));s(this,"prevFrameMandelbrot");s(this,"clearHistoryNextFrame",!1);s(this,"cumulativeShiftX",0);s(this,"cumulativeShiftY",0);s(this,"zoomMagnificationThreshold",16);s(this,"zoomFactor",1);s(this,"zoomTarget",1);s(this,"frozenScale",0);s(this,"liveScale",0);s(this,"liveZoomFactor",1);s(this,"zoomReprojectionActive",!1);s(this,"needFreezeSnapshot",!1);s(this,"zoomingIn",!0);s(this,"zoomIdleFrames",0);s(this,"postZoomFullRecompute",!1);s(this,"iterationBatchSize",Ye);s(this,"tileTexture");s(this,"tileTextureView");s(this,"skyboxTexture");s(this,"skyboxTextureView");s(this,"paletteTexture");s(this,"paletteTextureView");s(this,"paletteSampler");s(this,"webcamTexture");s(this,"webcamTileTexture");s(this,"webcamTextureView");s(this,"webcamEnabled",!0);s(this,"time",0);s(this,"lastUpdateTime",0);s(this,"dprMultiplier",1);s(this,"targetFps",60);s(this,"gpuLoadMultiplier",1);this.canvas=t,this.shaderPassCompute=he,this.shaderPassColor=re,this.antialiasLevel=r.antialiasLevel,this.palettePeriod=r.palettePeriod,this.time=0}async initialize(t){if(this.mandelbrotNavigator=t,!navigator.gpu)throw new Error("WebGPU non support\xE9");if(this.adapter=await navigator.gpu.requestAdapter(),!this.adapter)throw new Error("Adapter WebGPU introuvable");this.device=await this.adapter.requestDevice(),this.device.label="Engine Device",this.queue=this.device.queue,this.queue.label="Engine Queue",this.ctx=this.canvas.getContext("webgpu"),this.format=navigator.gpu.getPreferredCanvasFormat(),this.ctx.configure({device:this.device,format:this.format,alphaMode:"opaque"});const[r,i]=await Promise.all([Y._tileTexture?Promise.resolve(Y._tileTexture):this._loadTexture(Ji),Y._skyboxTexture?Promise.resolve(Y._skyboxTexture):this._loadTexture(Qi)]);Y._tileTexture=r,this.tileTexture=r,this.tileTextureView=this.tileTexture.createView(),Y._skyboxTexture=i,this.skyboxTexture=i,this.skyboxTextureView=this.skyboxTexture.createView();const a=new Xt([]).generateTexture();this.paletteTexture=this.device.createTexture({size:[a.width,a.height,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine PaletteTexture"}),this.device.queue.writeTexture({texture:this.paletteTexture},a.data,{bytesPerRow:a.width*4},[a.width,a.height]),this.paletteTextureView=this.paletteTexture.createView(),this.paletteSampler=this.device.createSampler({magFilter:"linear",minFilter:"linear",addressModeU:"repeat",addressModeV:"clamp-to-edge"}),this.webcamTexture=new pi(1920,1080),this.webcamTileTexture=this.device.createTexture({size:[1920,1080,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT}),this.webcamTextureView=this.webcamTileTexture.createView(),this.uniformBufferMandelbrot=this.device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Mandelbrot"}),this.uniformBufferColor=this.device.createBuffer({size:112,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Color"}),this.uniformBufferBrush=this.device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Brush"}),this.uniformBufferResolve=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Resolve"}),this.mandelbrotReferenceBuffer=this.device.createBuffer({size:4*1e6,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot Orbit ReferenceStorage Buffer"}),this.counterBuffer=this.device.createBuffer({size:8,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST,label:"Engine Counter Storage"}),this.counterReadBuffer=this.device.createBuffer({size:8,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,label:"Engine Counter Readback"}),this.uniformBufferCount=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Count"}),await this._createPipelines(),this.resize()}async _createPipelines(){const t=this.device.createShaderModule({code:be,label:"Engine ShaderModule Brush"}),r=this.device.createShaderModule({code:this.shaderPassCompute,label:"Engine ShaderModule Compute"}),i=this.device.createShaderModule({code:gr,label:"Engine ShaderModule Resolve"}),a=this.device.createShaderModule({code:this.shaderPassColor,label:"Engine ShaderModule Color"}),o=this.device.createShaderModule({code:br,label:"Engine ShaderModule Count"}),c=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Brush"}),d=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Mandelbrot"}),l=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Resolve"}),x=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:3,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:4,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:5,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:6,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:7,visibility:GPUShaderStage.FRAGMENT,sampler:{type:"filtering"}}],label:"Engine BindGroupLayout Color"}),h=Array.from({length:dt},()=>({format:"r32float"}));this.pipelineBrush=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[c]}),vertex:{module:t,entryPoint:"vs_main"},fragment:{module:t,entryPoint:"fs_main",targets:h},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Brush"}),this.pipelineMandelbrot=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[d]}),vertex:{module:r,entryPoint:"vs_main"},fragment:{module:r,entryPoint:"fs_main",targets:h},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Mandelbrot"}),this.pipelineResolve=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[l]}),vertex:{module:i,entryPoint:"vs_main"},fragment:{module:i,entryPoint:"fs_main",targets:h},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Resolve"}),this.pipelineColor=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[x]}),vertex:{module:a,entryPoint:"vs_main"},fragment:{module:a,entryPoint:"fs_main",targets:[{format:this.format}]},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Color"});const f=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}],label:"Engine BindGroupLayout Count"});this.pipelineCount=this.device.createComputePipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[f]}),compute:{module:o,entryPoint:"count_unfinished"},label:"Engine ComputePipeline Count"}),this.bindGroupBrush=void 0,this.bindGroupMandelbrot=void 0,this.bindGroupResolve=void 0,this.bindGroupColor=void 0,this.counterBindGroup=void 0}resize(){var S,g,n,p,M,C,R,P,w,U;const t=(window.devicePixelRatio||1)*this.dprMultiplier,r=this.canvas.parentElement,i=(r==null?void 0:r.clientWidth)||1,a=(r==null?void 0:r.clientHeight)||1;this.width=Math.max(1,Math.round(i*t)),this.height=Math.max(1,Math.round(a*t));const o=((g=(S=this.device)==null?void 0:S.limits)==null?void 0:g.maxTextureDimension2D)??8192;this.width=Math.min(this.width,o),this.height=Math.min(this.height,o),this.canvas.width=this.width,this.canvas.height=this.height,this.canvas.style.width=i+"px",this.canvas.style.height=a+"px",this.ctx.configure({device:this.device,format:this.format,alphaMode:"opaque"}),this.neutralSize=Math.ceil(Math.sqrt(this.width*this.width+this.height*this.height));const c=this.neutralSize;(p=(n=this.rawTexture)==null?void 0:n.destroy)==null||p.call(n),(C=(M=this.rawBrushTexture)==null?void 0:M.destroy)==null||C.call(M),(P=(R=this.resolvedTexture)==null?void 0:R.destroy)==null||P.call(R),(U=(w=this.frozenTexture)==null?void 0:w.destroy)==null||U.call(w);const d=dt,l=_=>{const k=this.device.createTexture({size:{width:c,height:c,depthOrArrayLayers:d},format:"r32float",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST,label:_}),N=k.createView({dimension:"2d-array",baseArrayLayer:0,arrayLayerCount:d,label:_+" ArrayView"}),O=[];for(let E=0;E<d;E++)O.push(k.createView({dimension:"2d",baseArrayLayer:E,arrayLayerCount:1,label:_+` Layer${E}`}));return{texture:k,arrayView:N,layerViews:O}},x=l("Engine RawTexture (A)");this.rawTexture=x.texture,this.rawArrayView=x.arrayView,this.rawLayerViews=x.layerViews;const h=l("Engine RawBrushTexture (B)");this.rawBrushTexture=h.texture,this.rawBrushArrayView=h.arrayView,this.rawBrushLayerViews=h.layerViews;const f=l("Engine ResolvedTexture");this.resolvedTexture=f.texture,this.resolvedArrayView=f.arrayView,this.resolvedLayerViews=f.layerViews;const L=l("Engine FrozenTexture");if(this.frozenTexture=L.texture,this.frozenArrayView=L.arrayView,this.zoomReprojectionActive=!1,this.zoomFactor=1,this.zoomTarget=1,this.liveZoomFactor=1,this.frozenScale=0,this.liveScale=0,this.zoomIdleFrames=0,this.pipelineBrush){const _=this.pipelineBrush.getBindGroupLayout(0);this.bindGroupBrush=this.device.createBindGroup({layout:_,entries:[{binding:0,resource:{buffer:this.uniformBufferBrush}},{binding:1,resource:this.rawArrayView}],label:"Engine BindGroup Brush"})}if(this.pipelineMandelbrot){const _=this.pipelineMandelbrot.getBindGroupLayout(0);this.bindGroupMandelbrot=this.device.createBindGroup({layout:_,entries:[{binding:0,resource:{buffer:this.uniformBufferMandelbrot}},{binding:1,resource:{buffer:this.mandelbrotReferenceBuffer}},{binding:2,resource:this.rawBrushArrayView}],label:"Engine BindGroup Mandelbrot"})}if(this.pipelineResolve){const _=this.pipelineResolve.getBindGroupLayout(0);this.bindGroupResolve=this.device.createBindGroup({layout:_,entries:[{binding:0,resource:{buffer:this.uniformBufferResolve}},{binding:1,resource:this.rawArrayView}],label:"Engine BindGroup Resolve"})}if(this.pipelineColor){const _=this.pipelineColor.getBindGroupLayout(0),k=[{binding:0,resource:{buffer:this.uniformBufferColor}},{binding:1,resource:this.resolvedArrayView},{binding:2,resource:this.tileTextureView},{binding:3,resource:this.skyboxTextureView},{binding:4,resource:this.webcamTextureView},{binding:5,resource:this.paletteTextureView},{binding:6,resource:this.frozenArrayView},{binding:7,resource:this.paletteSampler}];this.bindGroupColor=this.device.createBindGroup({layout:_,entries:k,label:"Engine BindGroup Color"})}if(this.pipelineCount&&this.counterBuffer&&this.uniformBufferCount){const _=this.pipelineCount.getBindGroupLayout(0);this.counterBindGroup=this.device.createBindGroup({layout:_,entries:[{binding:0,resource:this.rawArrayView},{binding:1,resource:{buffer:this.counterBuffer}},{binding:2,resource:{buffer:this.uniformBufferCount}}],label:"Engine BindGroup Count"})}this.prevFrameMandelbrot=void 0,this.previousMandelbrot=void 0,this.previousRenderOptions=void 0,this.needRender=!0,this.unfinishedPixelCount=-1,this.activePixelCount=-1}areObjectsEqual(t,r){return t===void 0||r===void 0?!1:JSON.stringify(t)===JSON.stringify(r)}areColorStopsEqual(t,r){if(t.length!==r.length)return!1;for(const[i,a]of t.entries()){const o=r[i];if(!o||a.color!==o.color||a.position!==o.position)return!1}return!0}async update(t,r){var M,C,R,P;const i=performance.now();this.lastUpdateTime===0&&(this.lastUpdateTime=i);const a=(i-this.lastUpdateTime)/1e3;this.time+=a,this.lastUpdateTime=i,this.needRender=this.needRender||!(this.areObjectsEqual(t,this.previousMandelbrot)&&this.areObjectsEqual(r,this.previousRenderOptions)),r.activateWebcam?(await this.updateWebcamTexture(),this.needRender=!0):(M=this.webcamTexture)==null||M.closeWebcam(),r.activateAnimate&&(this.needRender=!0);const o=this.width/Math.max(1,this.height);let c=((C=this.previousMandelbrot)==null?void 0:C.scale)||1/t.scale;c<1&&(c=1/c),c=Math.sqrt(c)-1;{const w=this.prevFrameMandelbrot&&this.prevFrameMandelbrot.scale!==t.scale;w&&!this.zoomReprojectionActive&&(this.zoomReprojectionActive=!0,this.frozenScale=this.prevFrameMandelbrot.scale,this.zoomingIn=t.scale<this.frozenScale,this.liveScale=this.zoomingIn?this.frozenScale/this.zoomMagnificationThreshold:this.frozenScale*this.zoomMagnificationThreshold,this.needFreezeSnapshot=!0,this.clearHistoryNextFrame=!0,this.zoomIdleFrames=0),w&&this.zoomReprojectionActive&&(this.zoomIdleFrames=0),this.zoomReprojectionActive&&this.frozenScale>0?(this.zoomFactor=this.frozenScale/t.scale,this.liveZoomFactor=this.liveScale/t.scale,this.zoomTarget=this.zoomingIn?this.zoomMagnificationThreshold:1/this.zoomMagnificationThreshold,(this.zoomingIn?this.zoomFactor>=this.zoomMagnificationThreshold:this.zoomFactor<=1/this.zoomMagnificationThreshold)&&(this.needFreezeSnapshot=!0,this.clearHistoryNextFrame=!0,this.frozenScale=this.liveScale,this.liveScale=this.zoomingIn?t.scale/this.zoomMagnificationThreshold:t.scale*this.zoomMagnificationThreshold,this.zoomFactor=this.frozenScale/t.scale,this.liveZoomFactor=this.liveScale/t.scale,this.zoomIdleFrames=0)):this.zoomReprojectionActive||(this.zoomFactor=1,this.zoomTarget=1,this.liveZoomFactor=1),this.zoomReprojectionActive&&!w&&this.prevFrameMandelbrot&&this.prevFrameMandelbrot.scale===t.scale&&(this.zoomIdleFrames++,this.zoomIdleFrames>=Vi&&(this.zoomReprojectionActive=!1,this.zoomFactor=1,this.zoomTarget=1,this.liveZoomFactor=1,this.liveScale=0,this.zoomIdleFrames=0,this.clearHistoryNextFrame=!0,this.postZoomFullRecompute=!0))}if(!this.areColorStopsEqual(r.colorStops,((R=this.previousRenderOptions)==null?void 0:R.colorStops)||[])||r.interpolationMode!==((P=this.previousRenderOptions)==null?void 0:P.interpolationMode)){const w=new Xt(r.colorStops,r.interpolationMode).generateTexture();this.device.queue.writeTexture({texture:this.paletteTexture},w.data,{bytesPerRow:w.width*4},[w.width,w.height]),this.needRender=!0}const d=new Float32Array([r.palettePeriod,r.paletteOffset,r.tessellationLevel,r.shadingLevel,c,this.time,r.activateTessellation?1:0,r.activateShading?1:0,r.activateWebcam?1:0,r.activatePalette?1:0,r.activateSkybox?1:0,r.activateSmoothness?1:0,r.activateZebra?1:0,o,t.angle,r.activateAnimate?1:0,t.mu,this.zoomFactor,this.zoomTarget,this.liveZoomFactor,this.zoomReprojectionActive&&this.frozenScale>0?this.cumulativeShiftX*(this.liveScale/this.frozenScale)/this.neutralSize:0,this.zoomReprojectionActive&&this.frozenScale>0?-this.cumulativeShiftY*(this.liveScale/this.frozenScale)/this.neutralSize:0,r.lightAngle,r.displacementAmount,r.specularPower]);if(this.device.queue.writeBuffer(this.uniformBufferColor,0,d.buffer),!this.needsMoreFrames())return;const l=Math.ceil(t.maxIterations);this.currentMaxIterations=l;const x=this.mandelbrotNavigator.compute_reference_orbit_chunk($i,l),h=x.count,f=new Float32Array(zt.buffer,x.ptr,x.count*4);x.offset<l&&this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer,0,f,0);const L=Math.min(l,h);this.currentGuardedMaxIter=L,this.orbitIncomplete=h<l;const S=h>=l,g=this.zoomReprojectionActive&&this.liveScale>0?this.liveScale:t.scale,n=new Float32Array([t.dx,t.dy,t.mu,g,o,t.angle,this.iterationBatchSize,t.epsilon,r.antialiasLevel,0,L,S?1:0]);this.device.queue.writeBuffer(this.uniformBufferMandelbrot,0,n.buffer);const p=x.offset===0&&!!this.prevFrameMandelbrot;(!this.prevFrameMandelbrot||p)&&(this.clearHistoryNextFrame=!0,this.zoomReprojectionActive=!1,this.zoomFactor=1,this.zoomTarget=1,this.liveZoomFactor=1,this.liveScale=0,this.zoomIdleFrames=0),this.prevFrameMandelbrot&&this.prevFrameMandelbrot.mu!==t.mu&&(this.clearHistoryNextFrame=!0,this.zoomReprojectionActive=!1,this.zoomFactor=1,this.zoomTarget=1,this.liveZoomFactor=1,this.liveScale=0,this.zoomIdleFrames=0),!this.zoomReprojectionActive&&S&&this.prevGuardedMaxIter<l&&this.prevGuardedMaxIter>0&&(this.clearHistoryNextFrame=!0),this.prevGuardedMaxIter=L,this.previousMandelbrot=structuredClone(t),this.previousRenderOptions=structuredClone(r)}async render(){if(!this.needsMoreFrames()||!this.pipelineBrush||!this.pipelineMandelbrot||!this.pipelineResolve||!this.pipelineColor||!this.bindGroupBrush||!this.bindGroupMandelbrot||!this.bindGroupResolve||!this.bindGroupColor||!this.previousMandelbrot)return;const t=this.width/Math.max(1,this.height);let r;this.postZoomFullRecompute?(r=Ii,this.postZoomFullRecompute=!1):this.zoomReprojectionActive?r=Ni:r=Wi(Gi);const i=r,a=this.clearHistoryNextFrame?1:0;let o=0,c=0;if(!this.clearHistoryNextFrame&&this.prevFrameMandelbrot){const _=this.previousMandelbrot.dx-this.prevFrameMandelbrot.dx,k=this.previousMandelbrot.dy-this.prevFrameMandelbrot.dy,N=this.neutralSize,O=Math.sqrt(t*t+1),E=this.zoomReprojectionActive&&this.liveScale>0?this.liveScale:this.previousMandelbrot.scale;o=-(_*N)/(2*E*O),c=k*N/(2*E*O)}this.clearHistoryNextFrame?(this.cumulativeShiftX=0,this.cumulativeShiftY=0):(this.cumulativeShiftX+=Math.round(o),this.cumulativeShiftY+=Math.round(c));const d=(this.cumulativeShiftX%i+i)%i,l=(this.cumulativeShiftY%i+i)%i,x=this.clearHistoryNextFrame||this.activePixelCount<0||this.iterationBatchSize>Ye||this.activePixelCount<qi*this.gpuLoadMultiplier;x&&this.refinementWasGated&&(this.iterationBatchSize=Ye),this.refinementWasGated=!x;const h=x?1:0,f=new Float32Array([t,this.previousMandelbrot.angle,a,r,i,o,c,this.previousMandelbrot.mu,d,l,this.zoomReprojectionActive?Oi:0,h]);this.device.queue.writeBuffer(this.uniformBufferBrush,0,f.buffer);const L=new Float32Array([this.previousMandelbrot.mu,d,l]);this.device.queue.writeBuffer(this.uniformBufferResolve,0,L.buffer);const S=this.device.createCommandEncoder();if(this.needFreezeSnapshot&&this.resolvedTexture&&this.frozenTexture){const _=dt,k=this.neutralSize;S.copyTextureToTexture({texture:this.resolvedTexture},{texture:this.frozenTexture},{width:k,height:k,depthOrArrayLayers:_}),this.needFreezeSnapshot=!1}const g=_=>_.map(k=>({view:k,clearValue:{r:0,g:0,b:0,a:0},loadOp:"clear",storeOp:"store"})),n=S.beginRenderPass({colorAttachments:g(this.rawBrushLayerViews)});n.setPipeline(this.pipelineBrush),n.setBindGroup(0,this.bindGroupBrush),n.draw(6,1,0,0),n.end();const p=S.beginRenderPass({colorAttachments:g(this.rawLayerViews)});if(p.setPipeline(this.pipelineMandelbrot),p.setBindGroup(0,this.bindGroupMandelbrot),p.draw(6,1,0,0),p.end(),this.pipelineCount&&this.counterBindGroup&&this.counterBuffer&&this.counterReadBuffer&&this.uniformBufferCount){const _=this.previousMandelbrot.mu;this.device.queue.writeBuffer(this.uniformBufferCount,0,new Float32Array([_,t,this.previousMandelbrot.angle])),S.clearBuffer(this.counterBuffer,0,8);const k=S.beginComputePass();k.setPipeline(this.pipelineCount),k.setBindGroup(0,this.counterBindGroup),k.dispatchWorkgroups(Math.ceil(this.neutralSize/16),Math.ceil(this.neutralSize/16)),k.end(),S.copyBufferToBuffer(this.counterBuffer,0,this.counterReadBuffer,0,8)}const M=S.beginRenderPass({colorAttachments:g(this.resolvedLayerViews)});M.setPipeline(this.pipelineResolve),M.setBindGroup(0,this.bindGroupResolve),M.draw(6,1,0,0),M.end();const C=this.ctx.getCurrentTexture().createView(),R=S.beginRenderPass({colorAttachments:[{view:C,clearValue:{r:1,g:1,b:1,a:1},loadOp:"clear",storeOp:"store"}]});R.setPipeline(this.pipelineColor),R.setBindGroup(0,this.bindGroupColor),R.draw(6,1,0,0),R.end();const P=performance.now();this.device.queue.submit([S.finish()]),await this.device.queue.onSubmittedWorkDone();const w=performance.now()-P;if(this.gpuFrameTimeMs=w,this.smoothedGpuTimeMs===0?this.smoothedGpuTimeMs=w:this.smoothedGpuTimeMs=this.smoothedGpuTimeMs*(1-Kt)+w*Kt,w>0){const _=1e3/this.targetFps/w,k=this.iterationBatchSize*_;this.iterationBatchSize=Math.round(Math.min(Di,Math.max(Ye,this.iterationBatchSize*.7+k*.3)))}await this.counterReadBuffer.mapAsync(GPUMapMode.READ);const U=new Uint32Array(this.counterReadBuffer.getMappedRange());if(this.unfinishedPixelCount=U[0],this.activePixelCount=U[1],this.counterReadBuffer.unmap(),this.clearHistoryNextFrame=!1,this.prevFrameMandelbrot={...this.previousMandelbrot},this.snapshotCallback){try{const _=this.snapshotDestWidth??256,k=Math.round(_*9/16),N=this.device.createTexture({size:[_,k,1],format:this.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});{const D=this.device.createCommandEncoder(),j=D.beginRenderPass({colorAttachments:[{view:N.createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}]});j.setPipeline(this.pipelineColor),j.setBindGroup(0,this.bindGroupColor),j.draw(6,1,0,0),j.end(),this.device.queue.submit([D.finish()])}const O=D=>D+255&-256,E=_*4,V=O(E),ae=V*k,Z=this.device.createBuffer({size:ae,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});{const D=this.device.createCommandEncoder();D.copyTextureToBuffer({texture:N},{buffer:Z,offset:0,bytesPerRow:V},{width:_,height:k,depthOrArrayLayers:1}),this.device.queue.submit([D.finish()])}await this.device.queue.onSubmittedWorkDone(),await Z.mapAsync(GPUMapMode.READ);const $=Z.getMappedRange(),W=new Uint8ClampedArray(_*k*4),H=new Uint8Array($);for(let D=0;D<k;++D)for(let j=0;j<_;++j){const oe=D*V+j*4,ne=(D*_+j)*4;W[ne+0]=H[oe+2],W[ne+1]=H[oe+1],W[ne+2]=H[oe+0],W[ne+3]=H[oe+3]}const ee=document.createElement("canvas");ee.width=_,ee.height=k,ee.getContext("2d").putImageData(new ImageData(W,_,k),0,0),Z.unmap(),this.snapshotCallback(ee.toDataURL("image/png"))}catch{this.snapshotCallback("")}this.snapshotCallback=void 0,this.snapshotDestWidth=void 0}}destroy(){var t,r,i,a,o,c,d,l,x,h,f,L,S,g,n,p,M,C,R,P,w,U,_,k,N,O,E,V,ae;this.stopRenderLoop(),(r=(t=this.rawTexture)==null?void 0:t.destroy)==null||r.call(t),(a=(i=this.rawBrushTexture)==null?void 0:i.destroy)==null||a.call(i),(c=(o=this.resolvedTexture)==null?void 0:o.destroy)==null||c.call(o),(l=(d=this.frozenTexture)==null?void 0:d.destroy)==null||l.call(d),(h=(x=this.mandelbrotReferenceBuffer)==null?void 0:x.destroy)==null||h.call(x),(L=(f=this.uniformBufferMandelbrot)==null?void 0:f.destroy)==null||L.call(f),(g=(S=this.uniformBufferColor)==null?void 0:S.destroy)==null||g.call(S),(p=(n=this.uniformBufferBrush)==null?void 0:n.destroy)==null||p.call(n),(C=(M=this.uniformBufferResolve)==null?void 0:M.destroy)==null||C.call(M),(P=(R=this.counterBuffer)==null?void 0:R.destroy)==null||P.call(R),(U=(w=this.counterReadBuffer)==null?void 0:w.destroy)==null||U.call(w),(k=(_=this.uniformBufferCount)==null?void 0:_.destroy)==null||k.call(_),(N=this.webcamTexture)==null||N.closeWebcam(),(E=(O=this.webcamTileTexture)==null?void 0:O.destroy)==null||E.call(O),(ae=(V=this.paletteTexture)==null?void 0:V.destroy)==null||ae.call(V)}needsMoreFrames(){let t="";return this.needRender?t="needRender":this.snapshotCallback?t="snapshot":this.zoomReprojectionActive?t="zoomActive":this.clearHistoryNextFrame?t="clearHistory":this.orbitIncomplete?t="orbitIncomplete":(this.unfinishedPixelCount<0||this.unfinishedPixelCount>Yi)&&(t=`unfinished=${this.unfinishedPixelCount}`),t!==""}getIterationBatchSize(){return this.iterationBatchSize}startRenderLoop(t){this._drawFn=t,this._rafId===null&&(this._rafId=requestAnimationFrame(async()=>this._loop()))}stopRenderLoop(){this._rafId!==null&&(cancelAnimationFrame(this._rafId),this._rafId=null),this._drawFn=null}async _loop(){if(this._drawFn){const t=this.needsMoreFrames();this.isRendering=t,await this._drawFn(),t&&this._fpsFrameCount++;const r=performance.now();this._fpsLastTime===0&&(this._fpsLastTime=r);const i=r-this._fpsLastTime;i>=1e3&&(this.fps=Math.round(this._fpsFrameCount*1e3/i),this._fpsFrameCount=0,this._fpsLastTime=r),this._rafId=requestAnimationFrame(async()=>this._loop())}else{this._rafId=null;return}}async updateTileTexture(t){var i,a;const r=await this._loadTexture(t);if((a=(i=this.tileTexture)==null?void 0:i.destroy)==null||a.call(i),this.tileTexture=r,this.tileTextureView=this.tileTexture.createView(),this.pipelineColor&&this.resolvedArrayView&&this.frozenArrayView){const o=this.pipelineColor.getBindGroupLayout(0);this.bindGroupColor=this.device.createBindGroup({layout:o,entries:[{binding:0,resource:{buffer:this.uniformBufferColor}},{binding:1,resource:this.resolvedArrayView},{binding:2,resource:this.tileTextureView},{binding:3,resource:this.skyboxTextureView},{binding:4,resource:this.webcamTextureView},{binding:5,resource:this.paletteTextureView},{binding:6,resource:this.frozenArrayView},{binding:7,resource:this.paletteSampler}],label:"Engine BindGroup Color"})}this.needRender=!0}async _loadTexture(t){const r=new Image;r.src=t;try{await r.decode()}catch(o){throw console.warn("\xC9chec du chargement de la texture : "+t,o),o}const i=await createImageBitmap(r),a=this.device.createTexture({size:[i.width,i.height,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine LoadedTexture "+t});return this.device.queue.copyExternalImageToTexture({source:i},{texture:a},[i.width,i.height]),a}async readIterationDataAt(t,r,i,a){var Ae;if(!this.resolvedTexture||!this.device)return null;const o=this.width/Math.max(1,this.height),c=((Ae=this.previousMandelbrot)==null?void 0:Ae.angle)??0,d=t/Math.max(1,i),l=1-r/Math.max(1,a),x=d*2-1,h=l*2-1,f=x*o,L=h,S=Math.sin(c),g=Math.cos(c),n=g*f-S*L,p=S*f+g*L,M=Math.sqrt(o*o+1),C=n/M,R=p/M,P=C*.5+.5,w=R*.5+.5,U=this.neutralSize,_=Math.floor(Math.max(0,Math.min(U-1,P*U))),k=Math.floor(Math.max(0,Math.min(U-1,(1-w)*U))),N=Y.ITER_PIXEL_LAYERS,O=1,E=4,V=(fe=>fe+255&-256)(O*E),ae=V*N.length,Z=this.device.createBuffer({size:ae,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,label:"Engine IterPixel Readback"}),$=this.device.createCommandEncoder();for(let fe=0;fe<N.length;fe++)$.copyTextureToBuffer({texture:this.resolvedTexture,origin:{x:_,y:k,z:N[fe]}},{buffer:Z,offset:V*fe,bytesPerRow:V},{width:1,height:1,depthOrArrayLayers:1});this.device.queue.submit([$.finish()]),await Z.mapAsync(GPUMapMode.READ);const W=new Float32Array(Z.getMappedRange()),H=V/E,ee=W[0*H],D=W[1*H],j=W[2*H],oe=W[3*H],ne=W[4*H];return Z.unmap(),Z.destroy(),ee<0?null:{iter:ee,zx:D,zy:j,derX:oe,derY:ne}}async updateWebcamTexture(){var t,r;await((t=this.webcamTexture)==null?void 0:t.openWebcam()),await((r=this.webcamTexture)==null?void 0:r.drawWebGPUTexture(this.webcamTileTexture,this.device))}async getSnapshotPng(t=256){return await new Promise(r=>{this.snapshotCallback=r,this.snapshotDestWidth=t,this.needRender=!0})}};s(Y,"_tileTexture"),s(Y,"_tileTextureView"),s(Y,"_skyboxTexture"),s(Y,"_skyboxTextureView"),s(Y,"_paletteTexture"),s(Y,"_paletteTextureView"),s(Y,"ITER_PIXEL_LAYERS",[0,2,3,4,5]);let ft=Y,Jt,Qt,er,tr,rr,ir,Pe,ht,ar,or,nr;_t=mt({__name:"Mandelbrot",props:We({mu:{default:4},epsilon:{default:1e-5},colorStops:{default:()=>[{color:"#002500",position:0},{color:"#175b3d",position:.16},{color:"#ffceb6",position:.26},{color:"#edffff",position:.42},{color:"#ff8fbc",position:.7016397849462366},{color:"#a6003e",position:.8575},{color:"#100000",position:1}]},palettePeriod:{default:100},paletteOffset:{default:0},antialiasLevel:{default:1},tessellationLevel:{default:2},shadingLevel:{default:1},lightAngle:{default:3.927},displacementAmount:{default:.01},specularPower:{default:4},activatePalette:{type:Boolean,default:!0},activateSkybox:{type:Boolean,default:!1},activateTessellation:{type:Boolean,default:!1},activateWebcam:{type:Boolean,default:!1},activateShading:{type:Boolean,default:!0},activateZebra:{type:Boolean,default:!1},activateSmoothness:{type:Boolean,default:!0},activateAnimate:{type:Boolean,default:!1},dprMultiplier:{default:.5},maxIterationMultiplier:{default:.1},targetFps:{default:60},gpuLoadMultiplier:{default:1},interpolationMode:{default:"lab"}},{cx:{default:"-1.9771995110313272619112808106831597"},cxModifiers:{},cy:{default:"0.0"},cyModifiers:{},scale:{default:"2.5"},scaleModifiers:{},angle:{default:0},angleModifiers:{}}),emits:["update:cx","update:cy","update:scale","update:angle"],setup(e,{expose:t}){const r=gt(null);let i=null,a=null,o,c=!1;const d=te(e,"cx"),l=te(e,"cy"),x=te(e,"scale"),h=te(e,"angle");$e(()=>[d.value,l.value,x.value,h.value],([n,p,M,C],[R,P,w,U])=>{c||o&&(!n||!p||!M||((n!==R||p!==P)&&o.origin(n,p),M!==w&&o.scale(M),C!==U&&o.angle(Number(C))))},{flush:"sync"});const f=e;$e(()=>f.dprMultiplier,n=>{a&&(a.dprMultiplier=n,g())}),$e(()=>f.targetFps,n=>{a&&(a.targetFps=n)}),$e(()=>f.gpuLoadMultiplier,n=>{a&&(a.gpuLoadMultiplier=n)});async function L(){if(!a||!o)return;const n=o.step();if(!n)return;const[p,M]=n,[C,R,P,w]=o.get_params();c=!0,d.value=C,l.value=R,x.value=P,h.value=parseFloat(w),await ea(),c=!1;const U=Math.min(Math.max(100,1e3*f.maxIterationMultiplier*Math.log2(1/parseFloat(P))),1e5);await a.update({cx:C,cy:R,dx:parseFloat(p),dy:parseFloat(M),mu:f.mu,scale:parseFloat(P),angle:parseFloat(w),maxIterations:U,epsilon:f.epsilon},{shadingLevel:f.shadingLevel,tessellationLevel:f.tessellationLevel,lightAngle:f.lightAngle,displacementAmount:f.displacementAmount,specularPower:f.specularPower,antialiasLevel:f.antialiasLevel,palettePeriod:f.palettePeriod,paletteOffset:f.paletteOffset,colorStops:ta(f.colorStops),interpolationMode:f.interpolationMode,activateShading:f.activateShading,activateTessellation:f.activateTessellation,activateWebcam:f.activateWebcam,activatePalette:f.activatePalette,activateSkybox:f.activateSkybox,activateSmoothness:f.activateSmoothness,activateZebra:f.activateZebra,activateAnimate:f.activateAnimate}),await a.render()}async function S(){if(r.value)return i=r.value,o=new He(d.value,l.value,x.value,Number(h.value)),o.origin(d.value,l.value),o.scale(x.value),o.angle(Number(h.value)),a=new ft(i,{activatePalette:f.activatePalette,activateSkybox:f.activateSkybox,shadingLevel:f.shadingLevel,tessellationLevel:f.tessellationLevel,lightAngle:f.lightAngle,displacementAmount:f.displacementAmount,specularPower:f.specularPower,antialiasLevel:f.antialiasLevel,palettePeriod:f.palettePeriod,paletteOffset:f.paletteOffset,colorStops:f.colorStops,interpolationMode:f.interpolationMode,activateShading:f.activateShading,activateTessellation:f.activateTessellation,activateWebcam:f.activateWebcam,activateSmoothness:f.activateSmoothness,activateZebra:f.activateZebra,activateAnimate:f.activateAnimate}),a.initialize(o)}async function g(){if(!r.value||!a)return;const n=r.value.getBoundingClientRect();r.value.width=n.width,r.value.height=n.height,a.resize()}return hr(async()=>{await S(),window.addEventListener("resize",g),await g(),a&&a.startRenderLoop(L)}),pr(()=>{a==null||a.stopRenderLoop(),window.removeEventListener("resize",g)}),t({getCanvas:()=>r.value,getEngine:()=>a,getNavigator:()=>o,translate:(n,p)=>o==null?void 0:o.translate(n,p),translateDirect:(n,p)=>o==null?void 0:o.translate_direct(n,p),rotate:n=>o==null?void 0:o.rotate(n),angle:n=>o==null?void 0:o.angle(n),zoom:n=>o==null?void 0:o.zoom(n),step:()=>o==null?void 0:o.step(),getParams:()=>o==null?void 0:o.get_params(),drawOnce:async()=>L(),resize:async()=>g(),initialize:async()=>S()}),(n,p)=>(Fe(),Ue("canvas",{ref_key:"canvasRef",ref:r},null,512))}}),Jt={class:"mobile-nav-controls"},Qt={key:0,class:"directional-controls"},er={width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",style:{"vertical-align":"middle","margin-right":"4px"}},tr=mt({__name:"MobileNavigationControls",props:We({mandelbrotRef:{}},{expanded:{type:Boolean,default:!1},expandedModifiers:{}}),emits:["update:expanded"],setup(e){const t=e,r=te(e,"expanded"),i=gt(null);let a=null;const o=()=>{r.value=!r.value,r.value||d()},c=g=>{g.preventDefault(),g.stopPropagation(),o()},d=()=>{i.value=null,a!==null&&(clearInterval(a),a=null)},l=g=>{i.value=g;const n=.01,p=()=>{if(t.mandelbrotRef)switch(g){case"north":t.mandelbrotRef.translate(0,n);break;case"south":t.mandelbrotRef.translate(0,-n);break;case"west":t.mandelbrotRef.translate(-n,0);break;case"east":t.mandelbrotRef.translate(n,0);break}};p(),a=window.setInterval(p,16)},x=g=>{i.value=`rotate-${g}`;const n=.025,p=()=>{t.mandelbrotRef&&(g==="left"?t.mandelbrotRef.rotate(n):t.mandelbrotRef.rotate(-n))};p(),a=window.setInterval(p,16)},h=g=>{i.value=`zoom-${g}`;const n=.97,p=()=>{t.mandelbrotRef&&(g==="in"?t.mandelbrotRef.zoom(n):t.mandelbrotRef.zoom(1/n))};p(),a=window.setInterval(p,16)},f=(g,n)=>{g.preventDefault(),n()},L=g=>{g.preventDefault(),d()};function S(g){g.preventDefault(),g.stopPropagation(),window.location.href=new URL("./presentation/",window.location.href).href}return(g,n)=>(Fe(),Ue("div",Jt,[T("button",{class:ue(["nav-button compass-button",{active:r.value}]),onClick:o,onTouchend:c,"aria-label":"Toggle navigation"},[...n[16]||(n[16]=[ra('<svg width="32" height="32" viewBox="0 0 24 24" fill="none" class="nav-icon" data-v-1e35ba8c><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" data-v-1e35ba8c></circle><path d="M12 2 L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-1e35ba8c></path><path d="M12 18 L12 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-1e35ba8c></path><path d="M2 12 L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-1e35ba8c></path><path d="M18 12 L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-1e35ba8c></path><path d="M12 7 L10 12 L12 14 L14 12 Z" fill="currentColor" data-v-1e35ba8c></path><text x="12" y="6" text-anchor="middle" font-size="6" fill="currentColor" font-weight="bold" data-v-1e35ba8c>N</text></svg>',1)])],34),bt(ia,{name:"fade"},{default:aa(()=>[r.value?(Fe(),Ue("div",Qt,[T("button",{class:ue(["nav-button direction-button north",{active:i.value==="north"}]),onTouchstart:n[0]||(n[0]=p=>f(p,()=>l("north"))),onTouchend:L,onMousedown:n[1]||(n[1]=p=>l("north")),onMouseup:d,onMouseleave:d,"aria-label":"Move North"},[...n[17]||(n[17]=[T("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("path",{d:"M12 5 L18 11 L15 11 L15 19 L9 19 L9 11 L6 11 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),T("button",{class:ue(["nav-button direction-button south",{active:i.value==="south"}]),onTouchstart:n[2]||(n[2]=p=>f(p,()=>l("south"))),onTouchend:L,onMousedown:n[3]||(n[3]=p=>l("south")),onMouseup:d,onMouseleave:d,"aria-label":"Move South"},[...n[18]||(n[18]=[T("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("path",{d:"M12 19 L6 13 L9 13 L9 5 L15 5 L15 13 L18 13 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),T("button",{class:ue(["nav-button direction-button west",{active:i.value==="west"}]),onTouchstart:n[4]||(n[4]=p=>f(p,()=>l("west"))),onTouchend:L,onMousedown:n[5]||(n[5]=p=>l("west")),onMouseup:d,onMouseleave:d,"aria-label":"Move West"},[...n[19]||(n[19]=[T("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("path",{d:"M5 12 L11 18 L11 15 L19 15 L19 9 L11 9 L11 6 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),T("button",{class:ue(["nav-button direction-button east",{active:i.value==="east"}]),onTouchstart:n[6]||(n[6]=p=>f(p,()=>l("east"))),onTouchend:L,onMousedown:n[7]||(n[7]=p=>l("east")),onMouseup:d,onMouseleave:d,"aria-label":"Move East"},[...n[20]||(n[20]=[T("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("path",{d:"M19 12 L13 6 L13 9 L5 9 L5 15 L13 15 L13 18 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),T("button",{class:ue(["nav-button corner-button rotate-left",{active:i.value==="rotate-left"}]),onTouchstart:n[8]||(n[8]=p=>f(p,()=>x("left"))),onTouchend:L,onMousedown:n[9]||(n[9]=p=>x("left")),onMouseup:d,onMouseleave:d,"aria-label":"Rotate Left"},[...n[21]||(n[21]=[T("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("path",{d:"M16 8 A6 6 0 1 0 8 16",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round"}),T("path",{d:"M5 16 L8 16 L8 13",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round","stroke-linejoin":"round"})],-1)])],34),T("button",{class:ue(["nav-button corner-button rotate-right",{active:i.value==="rotate-right"}]),onTouchstart:n[10]||(n[10]=p=>f(p,()=>x("right"))),onTouchend:L,onMousedown:n[11]||(n[11]=p=>x("right")),onMouseup:d,onMouseleave:d,"aria-label":"Rotate Right"},[...n[22]||(n[22]=[T("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("path",{d:"M8 8 A6 6 0 1 1 16 16",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round"}),T("path",{d:"M19 16 L16 16 L16 13",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round","stroke-linejoin":"round"})],-1)])],34),T("button",{class:ue(["nav-button corner-button zoom-out",{active:i.value==="zoom-out"}]),onTouchstart:n[12]||(n[12]=p=>f(p,()=>h("out"))),onTouchend:L,onMousedown:n[13]||(n[13]=p=>h("out")),onMouseup:d,onMouseleave:d,"aria-label":"Zoom Out"},[...n[23]||(n[23]=[T("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("circle",{cx:"11",cy:"11",r:"7",stroke:"currentColor","stroke-width":"2"}),T("path",{d:"M18 18 L22 22",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"}),T("path",{d:"M8 11 L14 11",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"})],-1)])],34),T("button",{class:ue(["nav-button corner-button zoom-in",{active:i.value==="zoom-in"}]),onTouchstart:n[14]||(n[14]=p=>f(p,()=>h("in"))),onTouchend:L,onMousedown:n[15]||(n[15]=p=>h("in")),onMouseup:d,onMouseleave:d,"aria-label":"Zoom In"},[...n[24]||(n[24]=[T("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("circle",{cx:"11",cy:"11",r:"7",stroke:"currentColor","stroke-width":"2"}),T("path",{d:"M18 18 L22 22",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"}),T("path",{d:"M11 8 L11 14",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"}),T("path",{d:"M8 11 L14 11",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"})],-1)])],34),T("button",{class:"presentation-button",onTouchend:na(S,["prevent","stop"]),onClick:S,"aria-label":"Pr\xE9sentation"},[(Fe(),Ue("svg",er,[...n[25]||(n[25]=[T("rect",{x:"2",y:"3",width:"20",height:"14",rx:"2",ry:"2"},null,-1),T("line",{x1:"8",y1:"21",x2:"16",y2:"21"},null,-1),T("line",{x1:"12",y1:"17",x2:"12",y2:"21"},null,-1)])])),n[26]||(n[26]=oa(" Pr\xE9sentation ",-1))],32)])):sa("",!0)]),_:1})]))}}),rr=vr(tr,[["__scopeId","data-v-1e35ba8c"]]),ir={style:{position:"relative",width:"100%",height:"100%"}},Pe=.01,ht=.025,ar=300,or=30,nr=mt({__name:"MandelbrotController",props:We({mu:{},epsilon:{},colorStops:{},antialiasLevel:{},tessellationLevel:{},shadingLevel:{},lightAngle:{},displacementAmount:{},specularPower:{},palettePeriod:{},paletteOffset:{},activatePalette:{type:Boolean},activateSkybox:{type:Boolean},activateTessellation:{type:Boolean},activateWebcam:{type:Boolean},activateShading:{type:Boolean},activateZebra:{type:Boolean},activateSmoothness:{type:Boolean},activateAnimate:{type:Boolean},dprMultiplier:{},maxIterationMultiplier:{},targetFps:{},gpuLoadMultiplier:{},interpolationMode:{},pickerMode:{type:Boolean}},{cx:{},cxModifiers:{},cy:{},cyModifiers:{},scale:{},scaleModifiers:{},angle:{},angleModifiers:{},mobileNavExpanded:{type:Boolean,default:!1},mobileNavExpandedModifiers:{}}),emits:We(["cursorCoord","palettePick"],["update:cx","update:cy","update:scale","update:angle","update:mobileNavExpanded"]),setup(e,{expose:t,emit:r}){const i=te(e,"cx"),a=te(e,"cy"),o=te(e,"scale"),c=te(e,"angle"),d=te(e,"mobileNavExpanded"),l=e,x=r,h=gt(null);let f=!1,L=0,S=0;function g(){var F;if(!f)return;const u=$();if(!u)return;const v=u.getBoundingClientRect(),b=L-v.left,z=S-v.top,B=(F=h.value)==null?void 0:F.getNavigator();if(!B)return;const A=B.pixel_to_complex(b,z,v.width,v.height);!A||A.length<2||x("cursorCoord",{re:A[0],im:A[1]},L,S)}function n(u){f=!0,L=u.clientX,S=u.clientY}function p(){f=!1,x("cursorCoord",null,0,0)}const M={};t({getCanvas:$,getEngine:()=>{var u;return((u=h.value)==null?void 0:u.getEngine())??null}});let C=!1,R=!1,P=0,w=0,U=0,_=0,k=0,N=!1,O=0,E=null,V=0,ae=0,Z=0;function $(){var u;return((u=h.value)==null?void 0:u.getCanvas())??null}function W(u){const v=$();if(!v)return{x:0,y:0,width:0,height:0};const b=v.getBoundingClientRect();return{x:u.clientX-b.left,y:u.clientY-b.top,width:b.width,height:b.height}}function H(u){var b,z,B;const v=(z=(b=u.target)==null?void 0:b.tagName)==null?void 0:z.toLowerCase();v==="input"||v==="textarea"||v==="select"||(B=u.target)!=null&&B.isContentEditable||(M[u.code]=!0)}function ee(u){M[u.code]=!1}function D(u){var b,z;if(l.pickerMode){u.preventDefault();return}u.preventDefault();const v=.95;u.deltaY<0?(b=h.value)==null||b.zoom(v):(z=h.value)==null||z.zoom(1/v),g()}function j(u,v){var ke;const b=$();if(!b)return;const z=b.getBoundingClientRect(),B=u-z.left,A=v-z.top,F=z.width,I=z.height,X=F/I,se=(B-F/2)/F*2,le=(A-I/2)/I*2;(ke=h.value)==null||ke.translateDirect(se*X,-le)}function oe(u){if(l.pickerMode){u.preventDefault();return}u.preventDefault(),j(u.clientX,u.clientY)}function ne(u){if(l.pickerMode||u.touches.length!==0)return;const v=Date.now(),b=u.changedTouches[0];if(!b)return;const z=b.clientX,B=b.clientY;v-V<ar&&Math.hypot(z-ae,B-Z)<or?(u.preventDefault(),j(z,B),V=0):(V=v,ae=z,Z=B)}function Ae(u){if(l.pickerMode){u.preventDefault(),fe(u);return}if(u.button===2)R=!0;else{C=!0;const v=W(u);P=v.x,w=v.y}}async function fe(u){var I;const v=(I=h.value)==null?void 0:I.getEngine();if(!v)return;const b=$();if(!b)return;const z=b.getBoundingClientRect(),B=u.clientX-z.left,A=u.clientY-z.top,F=await v.readIterationDataAt(B,A,z.width,z.height);F&&x("palettePick",F,u.clientX,u.clientY)}function sr(u){var I,X;if(L=u.clientX,S=u.clientY,g(),l.pickerMode)return;const v=W(u);if(R){const se=$();if(!se)return;const le=se.getBoundingClientRect(),ke=le.width/2,pt=le.height/2,vt=v.x,ji=v.y,Zi=Math.atan2(ji-pt,vt-ke);(I=h.value)==null||I.angle(Zi);return}if(!C)return;const b=v.width,z=v.height,B=b/z,A=(v.x-P)/b*2,F=(v.y-w)/z*2;(X=h.value)==null||X.translateDirect(-A*B,F),P=v.x,w=v.y}function lr(u){l.pickerMode||(u.button===2?R=!1:C=!1)}function ur(u){var b;if(l.pickerMode)return;const v=$();if(v){if(u.touches.length===1){C=!0;const z=u.touches[0],B=v.getBoundingClientRect();P=z.clientX-B.left,w=z.clientY-B.top}else if(u.touches.length===2){C=!1,N=!0;const[z,B]=u.touches;U=Math.hypot(B.clientX-z.clientX,B.clientY-z.clientY),O=U,_=Math.atan2(B.clientY-z.clientY,B.clientX-z.clientX);const A=(b=h.value)==null?void 0:b.getParams();k=A?parseFloat(A[3]):0}}}function cr(u){var b,z,B;if(l.pickerMode)return;const v=$();if(v){if(C&&u.touches.length===1){const A=u.touches[0],F=v.getBoundingClientRect(),I=A.clientX-F.left,X=A.clientY-F.top,se=F.width,le=F.height,ke=se/le,pt=(I-P)/se*2,vt=(X-w)/le*2;(b=h.value)==null||b.translateDirect(-pt*ke,vt),P=I,w=X}else if(N&&u.touches.length===2){const[A,F]=u.touches,I=Math.hypot(F.clientX-A.clientX,F.clientY-A.clientY),X=Math.atan2(F.clientY-A.clientY,F.clientX-A.clientX),se=O/I;O=I,(z=h.value)==null||z.zoom(se);const le=X-_;(B=h.value)==null||B.angle(k+le)}}}function dr(u){u.touches.length===0&&(C=!1,N=!1)}function fr(){var u,v,b,z,B,A,F,I;if(!l.pickerMode){M.KeyW&&((u=h.value)==null||u.translate(0,Pe)),M.KeyS&&((v=h.value)==null||v.translate(0,-Pe)),M.KeyA&&((b=h.value)==null||b.translate(-Pe,0)),M.KeyD&&((z=h.value)==null||z.translate(Pe,0)),M.KeyQ&&((B=h.value)==null||B.rotate(ht)),M.KeyE&&((A=h.value)==null||A.rotate(-ht));const X=.95;M.KeyR&&((F=h.value)==null||F.zoom(X)),M.KeyF&&((I=h.value)==null||I.zoom(1/X))}g(),E=window.setTimeout(fr,16)}return hr(async()=>{const u=$();u&&(window.addEventListener("keydown",H),window.addEventListener("keyup",ee),u.addEventListener("wheel",D,{passive:!1}),u.addEventListener("mousedown",Ae),u.addEventListener("dblclick",oe),u.addEventListener("contextmenu",v=>v.preventDefault()),u.addEventListener("mouseenter",n),u.addEventListener("mouseleave",p),window.addEventListener("mousemove",sr),window.addEventListener("mouseup",lr),u.addEventListener("touchstart",ur,{passive:!1}),u.addEventListener("touchmove",cr,{passive:!1}),u.addEventListener("touchend",dr,{passive:!1}),u.addEventListener("touchend",ne,{passive:!1}),fr())}),pr(()=>{E!==null&&clearTimeout(E);const u=$();window.removeEventListener("keydown",H),window.removeEventListener("keyup",ee),window.removeEventListener("mousemove",sr),window.removeEventListener("mouseup",lr),u&&(u.removeEventListener("wheel",D),u.removeEventListener("mousedown",Ae),u.removeEventListener("dblclick",oe),u.removeEventListener("contextmenu",v=>v.preventDefault()),u.removeEventListener("mouseenter",n),u.removeEventListener("mouseleave",p),u.removeEventListener("touchstart",ur),u.removeEventListener("touchmove",cr),u.removeEventListener("touchend",dr),u.removeEventListener("touchend",ne))}),(u,v)=>(Fe(),Ue("div",ir,[bt(_t,{ref_key:"mandelbrotRef",ref:h,scale:o.value,"onUpdate:scale":v[0]||(v[0]=b=>o.value=b),angle:c.value,"onUpdate:angle":v[1]||(v[1]=b=>c.value=b),cx:i.value,"onUpdate:cx":v[2]||(v[2]=b=>i.value=b),cy:a.value,"onUpdate:cy":v[3]||(v[3]=b=>a.value=b),mu:l.mu,epsilon:l.epsilon,antialiasLevel:l.antialiasLevel,shadingLevel:l.shadingLevel,lightAngle:l.lightAngle,displacementAmount:l.displacementAmount,specularPower:l.specularPower,palettePeriod:l.palettePeriod,tessellationLevel:l.tessellationLevel,colorStops:l.colorStops,activatePalette:l.activatePalette,activateSkybox:l.activateSkybox,activateTessellation:l.activateTessellation,activateWebcam:l.activateWebcam,activateShading:l.activateShading,activateZebra:l.activateZebra,activateSmoothness:l.activateSmoothness,activateAnimate:l.activateAnimate,paletteOffset:l.paletteOffset,dprMultiplier:l.dprMultiplier,maxIterationMultiplier:l.maxIterationMultiplier,targetFps:l.targetFps,gpuLoadMultiplier:l.gpuLoadMultiplier,interpolationMode:l.interpolationMode},null,8,["scale","angle","cx","cy","mu","epsilon","antialiasLevel","shadingLevel","lightAngle","displacementAmount","specularPower","palettePeriod","tessellationLevel","colorStops","activatePalette","activateSkybox","activateTessellation","activateWebcam","activateShading","activateZebra","activateSmoothness","activateAnimate","paletteOffset","dprMultiplier","maxIterationMultiplier","targetFps","gpuLoadMultiplier","interpolationMode"]),bt(rr,{"mandelbrot-ref":h.value,expanded:d.value,"onUpdate:expanded":v[4]||(v[4]=b=>d.value=b)},null,8,["mandelbrot-ref","expanded"])]))}}),mr=vr(nr,[["__scopeId","data-v-fb823e0b"]])})();export{mr as M,_t as _,la as __tla};
