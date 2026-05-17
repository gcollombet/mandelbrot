var Ha=Object.defineProperty;var qa=(pe,se,be)=>se in pe?Ha(pe,se,{enumerable:!0,configurable:!0,writable:!0,value:be}):pe[se]=be;var n=(pe,se,be)=>qa(pe,typeof se!="symbol"?se+"":se,be);import{aq as Ya,ar as Wa,as as $a,d as wt,at as ne,z as Xe,p as wr,s as zr,o as Fe,c as De,au as Ze,y as zt,U as ja,av as Xa,j as T,an as Za,n as de,J as St,T as Ka,w as Ja,a as Qa,a2 as eo,e as to,_ as Sr}from"./framework.R1PXT97o.js";let Mr,Mt,ro=(async()=>{const pe=`// Mandelbrot progressive-iteration shader.
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
  angle: f32,           // currently unused here; rotation is handled by brush/color reprojection
  maxIteration: f32,    // iterations to compute THIS pass
  epsilon: f32,
  antialiasLevel: f32,  // currently unused in this pass
  iterationOffset: f32, // currently unused; prev_iter carries continuation state
  globalMaxIter: f32,   // total iteration target for the current view
  orbitComplete: f32,   // 1.0 = orbit fully built, 0.0 = still building
  approximationMode: f32,
  blaLevelCount: f32,
  blaEpsilon: f32,
  _padding0: f32,
};

struct BlaStep {
  ax: f32,
  ay: f32,
  bx: f32,
  by: f32,
  radius_alpha: f32,
  radius_beta: f32,
};

struct BlaLevel {
  offset: u32,
  count: u32,
  skip: u32,
  _padding: u32,
};

@group(0) @binding(0) var<uniform> mandelbrot: Mandelbrot;
@group(0) @binding(1) var<storage, read> mandelbrotOrbitPointSuite: array<MandelbrotStep>;
@group(0) @binding(2) var<storage, read> mandelbrotBlaSuite: array<BlaStep>;
@group(0) @binding(3) var<storage, read> mandelbrotBlaLevels: array<BlaLevel>;
@group(0) @binding(4) var rawIn: texture_2d_array<f32>;

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

fn getOrbit(index: i32) -> vec2<f32> {
  return vec2<f32>(
    mandelbrotOrbitPointSuite[index].zx,
    mandelbrotOrbitPointSuite[index].zy,
  );
}

fn try_apply_bla(ref_i: ptr<function, i32>, dz: ptr<function, vec2<f32>>, der: ptr<function, vec2<f32>>, dc: vec2<f32>, dcMag: f32) -> i32 {
  var level = i32(mandelbrot.blaLevelCount) - 1;
  let max_iter = i32(mandelbrot.globalMaxIter);
  while (level >= 0) {
    let levelInfo = mandelbrotBlaLevels[level];
    let skip = i32(levelInfo.skip);
    if ((*ref_i % skip) == 0 && *ref_i + skip <= max_iter) {
      let slot = *ref_i / skip;
      if (u32(slot) < levelInfo.count) {
        let entryIndex = i32(levelInfo.offset) + slot;
        let bla = mandelbrotBlaSuite[entryIndex];
        let a = vec2<f32>(bla.ax, bla.ay);
        let b = vec2<f32>(bla.bx, bla.by);
        let candidate = cmul(a, *dz) + cmul(b, dc);
        let radius = max(0.0, bla.radius_alpha - bla.radius_beta * dcMag);
        if (dot(candidate, candidate) <= radius * radius) {
          *dz = candidate;
          *der = cmul(a, *der);
          *ref_i += skip;
          return skip;
        }
      }
    }
    level -= 1;
  }

  return 0;
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

fn empty_out() -> FragOut {
  var out: FragOut;
  out.iter      = pack(0.0);
  out.genuine   = pack(0.0);
  out.zx        = pack(0.0);
  out.zy        = pack(0.0);
  out.dzx       = pack(0.0);
  out.dzy       = pack(0.0);
  out.ref_i     = pack(0.0);
  return out;
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
  var ref_i = i32(prev_ref_i);
  var z = getOrbit(ref_i);

  var escaped = false;
  var inside = false;

  let useBla = mandelbrot.approximationMode >= 0.5
            && mandelbrot.orbitComplete >= 0.5
            && mandelbrot.blaLevelCount >= 1.0;

  if (useBla) {
    let dcMag = sqrt(max(0.0, dot(dc, dc)));
    while (i < max_iteration && f32(ref_i) < mandelbrot.globalMaxIter) {
      var next_der = der;
      let skipped = try_apply_bla(&ref_i, &dz, &der, dc, dcMag);
      if (skipped > 0) {
        z = getOrbit(ref_i) + dz;
        next_der = der;
        i += f32(skipped);
      } else {
        z = getOrbit(ref_i);
        dz = 2.0 * cmul(dz, z) + cmul(dz, dz) + dc;
        ref_i += 1;
        z = getOrbit(ref_i) + dz;
        next_der = cmul(der * 2.0, z);
        i += 1.0;
      }

      let dot_z = dot(z, z);
      if (dot_z > muLimit) {
        escaped = true;
        break;
      }
      if (!IGNORE_EPSILON && dot(der, der) < epsilon) {
        inside = true;
        break;
      }

      let dot_dz = dot(dz, dz);
      if (dot_z < dot_dz || f32(ref_i) == mandelbrot.globalMaxIter) {
        dz = z;
        ref_i = 0;
      }

      der = next_der;
    }
  } else {
    while (i < max_iteration && f32(ref_i) < mandelbrot.globalMaxIter) {
      z = getOrbit(ref_i);
      dz = 2.0 * cmul(dz, z) + cmul(dz, dz) + dc;
      ref_i += 1;
      z = getOrbit(ref_i) + dz;
      let next_der = cmul(der * 2.0, z);
      i += 1.0;

      let dot_z = dot(z, z);
      if (dot_z > muLimit) {
        escaped = true;
        break;
      }
      if (!IGNORE_EPSILON && dot(der, der) < epsilon) {
        inside = true;
        break;
      }

      let dot_dz = dot(dz, dz);
      if (dot_z < dot_dz || f32(ref_i) == mandelbrot.globalMaxIter) {
        dz = z;
        ref_i = 0;
      }

      der = next_der;
    }
  }

  var out: FragOut;

  if (inside) {
    // Confirmed inside the set. Keep total iteration in ref_i for diagnostics/compatibility.
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
    // Keep total iteration in ref_i for diagnostics/compatibility.
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

  // When the reference orbit has no data yet (globalMaxIter == 0),
  // pass through all pixels unchanged \u2014 including sentinels.
  // This avoids marking uncomputed pixels as "inside the set" (iter = 0)
  // when no orbit steps are available to iterate.
  if (mandelbrot.globalMaxIter <= 0.0) {
    discard;
    return empty_out();
  }

  // Determine pixel state (iter-only convention):
  //   iter == -1                     : sentinel, needs fresh computation
  //   iter == 0                      : confirmed inside the set, pass through
  //   iter > 0  AND  |z|\xB2 >= 4      : escaped, pass through
  //   iter > 0  AND  |z|\xB2 < 4       : budget exhausted mid-progress, needs continuation
  //   iter < 0  AND  iter != -1     : resolution sentinel, pass through
  let is_compute_request = (prev_iter == -1.0);

  if (!is_compute_request && prev_iter <= 0.0) {
    discard;
    return empty_out();
  }

  var prev_zx = 0.0;
  var prev_zy = 0.0;
  var needs_continuation = false;
  if (!is_compute_request) {
    prev_zx = loadLayer(coord, 2);
    prev_zy = loadLayer(coord, 3);
    needs_continuation = (prev_zx * prev_zx + prev_zy * prev_zy) < mandelbrot.mu;
    if (!needs_continuation) {
      discard;
      return empty_out();
    }
  }

  // Neutral mapping: the neutral texture is a square that can contain the rotated screen.
  let xy_neutral = vec2<f32>(uv.x * 2.0 - 1.0, uv.y * 2.0 - 1.0);
  let neutralExtent = sqrt(mandelbrot.aspect * mandelbrot.aspect + 1.0);
  let local_rot = xy_neutral * neutralExtent;

  let x0 = local_rot.x * mandelbrot.scale + mandelbrot.cx;
  let y0 = local_rot.y * mandelbrot.scale + mandelbrot.cy;

  if (is_compute_request) {
    // Fresh computation (sentinel == -1).
    return mandelbrot_compute(x0, y0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0);
  }

  if (needs_continuation) {
    // Resume from stored state: iter > 0, |z|\xB2 < mu.
    let stored_dzx = loadLayer(coord, 4);
    let stored_dzy = loadLayer(coord, 5);
    let prev_ref_i = loadLayer(coord, 6);
    return mandelbrot_compute(x0, y0, prev_iter, prev_zx, prev_zy, stored_dzx, stored_dzy, prev_ref_i);
  }

  discard;
  return empty_out();
}
`,se=`struct Uniforms {
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
  ambientOcclusionStrength: f32,
  microBumpStrength: f32,
  clearcoatStrength: f32,
  subsurfaceStrength: f32,
  reliefDepth: f32,
  localShadowStrength: f32,
};
@group(0) @binding(0) var<uniform> parameters: Uniforms;
@group(0) @binding(1) var tex: texture_2d_array<f32>; // resolved neutral texture (7 r32float layers)
@group(0) @binding(2) var tileTex: texture_2d<f32>;
@group(0) @binding(3) var skyboxTex: texture_2d<f32>;
@group(0) @binding(4) var webcamTex: texture_2d<f32>;
@group(0) @binding(5) var paletteTex: texture_2d<f32>;  // 4096 x 4 rgba16float
@group(0) @binding(6) var texFrozen: texture_2d_array<f32>; // frozen snapshot for zoom reprojection
@group(0) @binding(7) var paletteSampler: sampler; // bilinear sampler for palette
@group(0) @binding(8) var skyboxSampler: sampler;  // bilinear sampler for skybox

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
  metallic: f32,        // [0, 1]
  roughness: f32,       // [0.02, 1]
  anisotropy: f32,      // [0, 1]
};

fn sampleEffects(palettePhase: f32) -> EffectParams {
  var e: EffectParams;

  // Row 0 (y = 0.125): R, G, B, palette weight
  let row0 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, 0.125), 0.0);
  e.paletteColor = row0.rgb;
  e.wPalette = row0.a;

  // Row 1 (y = 0.375): zebra, tessellation, shading, skybox
  let row1 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, 0.375), 0.0);
  e.wTessellation = row1.g;
  e.wShading = row1.b;
  e.wSkybox = row1.a;

  // Row 2 (y = 0.625): webcam, smoothness, shadingLevel [0,3], specularPower [1,64]
  let row2 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, 0.625), 0.0);
  e.wWebcam = row2.r;
  e.wSmoothness = row2.g;
  e.shadingLevel = row2.b;       // direct: natural range [0, 3]
  e.specularPower = max(row2.a, 1.0); // direct: natural range [1, 64]

  // Row 3 (y = 0.875): lightAngle [0,2pi], metallic, roughness, anisotropy
  let row3 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, 0.875), 0.0);
  e.lightAngle = row3.r;          // direct: radians [0, 2pi]
  e.metallic = clamp(row3.g, 0.0, 1.0);
  e.roughness = clamp(row3.b, 0.02, 1.0);
  e.anisotropy = clamp(row3.a, 0.0, 1.0);

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

fn mandelbrot_normal(angle_der: f32) -> vec3<f32> {
  return normalize(vec3<f32>(cos(angle_der), sin(angle_der), 0.5));
}

fn fresnel_schlick(cosTheta: f32, f0: vec3<f32>) -> vec3<f32> {
  let m = clamp(1.0 - cosTheta, 0.0, 1.0);
  let m2 = m * m;
  let m5 = m2 * m2 * m;
  return f0 + (vec3<f32>(1.0) - f0) * m5;
}

fn ggx_distribution(nDotH: f32, roughness: f32) -> f32 {
  let a = roughness * roughness;
  let a2 = a * a;
  let d = nDotH * nDotH * (a2 - 1.0) + 1.0;
  return a2 / max(3.14159265 * d * d, 1e-5);
}

fn ggx_geometry_schlick(nDotV: f32, roughness: f32) -> f32 {
  let r = roughness + 1.0;
  let k = (r * r) / 8.0;
  return nDotV / max(nDotV * (1.0 - k) + k, 1e-5);
}

fn ggx_geometry_smith(nDotV: f32, nDotL: f32, roughness: f32) -> f32 {
  return ggx_geometry_schlick(nDotV, roughness) * ggx_geometry_schlick(nDotL, roughness);
}

fn mandelbrot_tangent(angle_der: f32, normal: vec3<f32>) -> vec3<f32> {
  let flow = vec3<f32>(-sin(angle_der), cos(angle_der), 0.0);
  let projected = flow - normal * dot(flow, normal);
  let projectedLen = length(projected);
  return select(vec3<f32>(1.0, 0.0, 0.0), projected / projectedLen, projectedLen > 1e-5);
}

fn anisotropic_highlight(normal: vec3<f32>, tangent: vec3<f32>, bitangent: vec3<f32>, halfDir: vec3<f32>, nDotL: f32, nDotV: f32, roughness: f32) -> f32 {
  let tDotH = dot(tangent, halfDir);
  let bDotH = dot(bitangent, halfDir);
  let nDotH = max(dot(normal, halfDir), 1e-5);
  let alphaT = max(0.06, roughness * 0.45);
  let alphaB = max(0.12, roughness * 1.65);
  let stretch = (tDotH * tDotH) / (alphaT * alphaT) + (bDotH * bDotH) / (alphaB * alphaB);
  let lobe = exp(-stretch / max(nDotH * nDotH, 1e-5));
  let visibility = sqrt(max(nDotL * nDotV, 0.0));
  return lobe * visibility;
}

fn pseudo_ambient_occlusion(normal: vec3<f32>, v_smooth: f32, z: vec2<f32>) -> f32 {
  let cavity = pow(clamp(1.0 - normal.z, 0.0, 1.0), 1.35);
  let depthMask = clamp(1.0 - exp(-v_smooth * 0.035), 0.0, 1.0);
  let basinMask = clamp(length(z) / 2.5, 0.0, 1.0);
  let strength = clamp(parameters.ambientOcclusionStrength, 0.0, 2.0);
  let ao = 1.0 - (0.55 * cavity + 0.25 * depthMask + 0.20 * basinMask) * 0.45 * strength;
  return clamp(ao, 0.08, 1.0);
}

fn luminance(color: vec3<f32>) -> f32 {
  return dot(color, vec3<f32>(0.2126, 0.7152, 0.0722));
}

fn sample_skybox(dir: vec3<f32>, dx: f32, dy: f32) -> vec3<f32> {
  return textureSampleLevel(skyboxTex, skyboxSampler, dir_to_skybox_uv(dir, dx, dy), 0.0).rgb;
}

fn rough_skybox_reflection(dir: vec3<f32>, tangent: vec3<f32>, bitangent: vec3<f32>, roughness: f32, dx: f32, dy: f32) -> vec3<f32> {
  let center = sample_skybox(dir, dx, dy);
  let spread = roughness * roughness * 0.45;
  let blur = (
    center * 2.0
    + sample_skybox(normalize(dir + tangent * spread), dx, dy)
    + sample_skybox(normalize(dir - tangent * spread), dx, dy)
    + sample_skybox(normalize(dir + bitangent * spread), dx, dy)
    + sample_skybox(normalize(dir - bitangent * spread), dx, dy)
  ) / 6.0;
  return mix(center, blur, clamp(roughness * 1.25, 0.0, 1.0));
}

fn curvature_edge_wear(angle_der: f32, v_smooth: f32) -> f32 {
  let directionalRidge = pow(abs(sin(angle_der * 2.0 + v_smooth * 0.035)), 6.0);
  let iterationRidge = pow(1.0 - abs(fract(v_smooth * 0.125) * 2.0 - 1.0), 3.0);
  return clamp(directionalRidge * 0.65 + iterationRidge * 0.35, 0.0, 1.0);
}

fn fake_subsurface_scattering(color: vec3<f32>, normal: vec3<f32>, lightDir: vec3<f32>, nDotV: f32, ao: f32, edgeWear: f32, metallic: f32, strength: f32, distanceHeight: f32) -> vec3<f32> {
  let backLight = pow(max(dot(normal, -lightDir), 0.0), 1.35);
  let rimScatter = pow(clamp(1.0 - nDotV, 0.0, 1.0), 2.15);
  let wrapLight = pow(clamp(dot(normal, lightDir) * 0.5 + 0.5, 0.0, 1.0), 2.0);
  let thinness = 1.0 - smoothstep(4.0, 13.0, distanceHeight);
  let thickness = clamp(thinness * 0.62 + (1.0 - ao) * 0.23 + edgeWear * 0.15, 0.0, 1.0);
  let mask = (backLight * 0.35 + rimScatter * 0.25 + wrapLight * 0.40) * thickness;
  let scatterColor = mix(color, sqrt(max(color, vec3<f32>(0.0))), 0.35);
  return scatterColor * mask * clamp(strength, 0.0, 10.0) * (1.0 - metallic);
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

fn texture_bump_normal(tex_: texture_2d<f32>, normal: vec3<f32>, tangent: vec3<f32>, bitangent: vec3<f32>, v: f32, dist: f32, repeat: f32, strength: f32) -> vec3<f32> {
  let safeRepeat = max(repeat, 0.1);
  let stepSize = 1.0 / (safeRepeat * 96.0);
  let lpx = luminance(tile_tessellation(tex_, v + stepSize, dist, repeat));
  let lnx = luminance(tile_tessellation(tex_, v - stepSize, dist, repeat));
  let lpy = luminance(tile_tessellation(tex_, v, dist + stepSize, repeat));
  let lny = luminance(tile_tessellation(tex_, v, dist - stepSize, repeat));
  let grad = vec2<f32>(lpx - lnx, lpy - lny);
  let bump = (tangent * grad.x + bitangent * grad.y) * clamp(strength, 0.0, 2.0) * 0.85;
  return normalize(normal - bump);
}

fn fractal_height_normal(normal: vec3<f32>, tangent: vec3<f32>, bitangent: vec3<f32>, grad: vec2<f32>, relief: f32) -> vec3<f32> {
  return normalize(normal - tangent * grad.x * 0.34 * relief - bitangent * grad.y * 0.34 * relief);
}

fn fractal_height_ao(slope: f32, relief: f32, occStrength: f32) -> f32 {
  let occ = smoothstep(0.12, 2.75, slope * relief) * occStrength;
  return clamp(1.0 - occ * 0.72, 0.16, 1.0);
}

fn surface_cavity(slope: f32, relief: f32, occStrength: f32) -> f32 {
  let amount = smoothstep(0.04, 1.45, slope * relief) * occStrength;
  return clamp(1.0 - amount * 0.48, 0.26, 1.0);
}

fn fractal_height_shadow(grad: vec2<f32>, lightDir: vec3<f32>, tangent: vec3<f32>, bitangent: vec3<f32>, relief: f32, occStrength: f32) -> f32 {
  let lightPlane = vec2<f32>(dot(lightDir, tangent), dot(lightDir, bitangent));
  let lightPlaneLen = length(lightPlane);
  if (lightPlaneLen < 1e-4 || occStrength <= 0.0 || relief <= 0.0) {
    return 1.0;
  }
  let lightPlaneDir = lightPlane / lightPlaneLen;
  let uphillTowardLight = max(dot(grad, lightPlaneDir), 0.0);
  let grazing = 1.0 / max(lightDir.z + 0.35, 0.35);
  let shadow = uphillTowardLight * 0.22 * grazing * relief * occStrength;
  return clamp(1.0 - shadow, 0.22, 1.0);
}

fn distance_height_from_values(iterVal: f32, zx: f32, zy: f32, derX: f32, derY: f32) -> f32 {
  if (escape_nu(iterVal, zx, zy) < 0.0) {
    return -1e6;
  }

  let zLen = max(length(vec2<f32>(zx, zy)), 1.000001);
  let derLen = max(length(vec2<f32>(derX, derY)), 1e-8);
  let distanceEstimate = max(0.5 * zLen * log(zLen) / derLen, 1e-12);
  return clamp(-log(distanceEstimate), -8.0, 24.0);
}

fn load_distance_height(sourceTex: texture_2d_array<f32>, coord: vec2<i32>) -> f32 {
  let iterVal = textureLoad(sourceTex, coord, 0, 0).r;
  let zx = textureLoad(sourceTex, coord, 2, 0).r;
  let zy = textureLoad(sourceTex, coord, 3, 0).r;
  let derX = textureLoad(sourceTex, coord, 4, 0).r;
  let derY = textureLoad(sourceTex, coord, 5, 0).r;
  return distance_height_from_values(iterVal, zx, zy, derX, derY);
}

fn sample_distance_height_at_coord(sourceTex: texture_2d_array<f32>, coord: vec2<i32>, texSize: vec2<i32>) -> f32 {
  if (coord.x < 0 || coord.x >= texSize.x || coord.y < 0 || coord.y >= texSize.y) {
    return -1e6;
  }
  return load_distance_height(sourceTex, coord);
}

fn distance_height_gradient_at_coord(sourceTex: texture_2d_array<f32>, coord: vec2<i32>, texSize: vec2<i32>, centerHeight: f32) -> vec2<f32> {
  let xr = sample_distance_height_at_coord(sourceTex, coord + vec2<i32>(1, 0), texSize);
  let xl = sample_distance_height_at_coord(sourceTex, coord - vec2<i32>(1, 0), texSize);
  let yu = sample_distance_height_at_coord(sourceTex, coord + vec2<i32>(0, 1), texSize);
  let yd = sample_distance_height_at_coord(sourceTex, coord - vec2<i32>(0, 1), texSize);
  let rightHeight = select(centerHeight, xr, xr > -1e5);
  let leftHeight = select(centerHeight, xl, xl > -1e5);
  let upHeight = select(centerHeight, yu, yu > -1e5);
  let downHeight = select(centerHeight, yd, yd > -1e5);
  return vec2<f32>(rightHeight - leftHeight, upHeight - downHeight) * 2.5;
}

fn palette(sourceTex: texture_2d_array<f32>, sourceCoord: vec2<i32>, sourceTexSize: vec2<i32>, iterRaw: f32, v: f32, v_smooth: f32, z: vec2<f32>, der: vec2<f32>, angle_der: f32, dx: f32, dy: f32) -> vec3<f32> {
  let paletteRepeat = max(parameters.palettePeriod, 0.0001);
  let deep = v * 2.0;
  let palettePhase = fract(deep / paletteRepeat + parameters.paletteOffset);

  // \u2500\u2500 Sample all effect channels from the palette texture \u2500\u2500
  let fx = sampleEffects(palettePhase);

  let effTess = fx.wTessellation;
  let effWebcam = fx.wWebcam;
  let effShading = fx.wShading;

  // \u2500\u2500 Tessellation depth: always smooth, independent of palette period \u2500\u2500
  let tess_depth = v_smooth * 2.0;
  let disp = parameters.displacementAmount;
  let tess_u = tess_depth * 2.0 * disp + dx;
  let tess_v = tess_depth * 2.0 * disp + dy;

  // \u2500\u2500 Gentle sinusoidal animation (only when animate is on) \u2500\u2500
  let anim = parameters.animate;
  let t = parameters.time;
  let spd = parameters.animationSpeed;

  // \u2500\u2500 Blend color sources using overlay/opacity model \u2500\u2500
  // Palette is always the base. Other sources overlay on top with their weight as opacity.
  var color = fx.paletteColor * fx.wPalette;

  // Tessellation: overlay on top of palette color
  if (effTess > 0.001) {
    let tile_drift_u = anim * 0.03 * sin(t * 0.4 * spd);
    let tile_drift_v = anim * 0.03 * sin(t * 0.3 * spd + 1.2);
    let tessColor = tile_tessellation(tileTex, tess_u + tile_drift_u, tess_v + tile_drift_v, parameters.tessellationLevel);
    color = mix(color, tessColor, effTess);
  }

  // Webcam: overlay on top of current result
  if (effWebcam > 0.001) {
    let cam_drift_u = anim * 0.04 * sin(t * 0.35 * spd + 0.7);
    let cam_drift_v = anim * 0.04 * sin(t * 0.25 * spd + 2.0);
    let webCamColor = tile_tessellation(
      webcamTex,
      tess_u + cam_drift_u,
      tess_v + cam_drift_v,
      parameters.tessellationLevel
    );
    color = mix(color, webCamColor, effWebcam);
  }

  // \u2500\u2500 Shading (always computed, applied proportionally to wShading) \u2500\u2500
  if (effShading > 0.001) {
    let reliefDepth = parameters.reliefDepth * effShading;
    let relief = clamp(reliefDepth, 0.0, 2.0);
    let surfaceRelief = relief * 0.5;
    let occStrength = clamp(parameters.localShadowStrength * 5.0, 0.0, 10.0);
    let needsDistanceHeight = parameters.subsurfaceStrength > 0.001;
    let needsFractalGradient = relief > 0.001 || occStrength > 0.001;
    var distanceHeight = 0.0;
    var grad = vec2<f32>(0.0);
    var slope = 0.0;
    if (needsDistanceHeight || needsFractalGradient) {
      distanceHeight = distance_height_from_values(iterRaw, z.x, z.y, der.x, der.y);
    }
    if (needsFractalGradient) {
      let fractalGradient = distance_height_gradient_at_coord(sourceTex, sourceCoord, sourceTexSize, distanceHeight);
      grad = clamp(fractalGradient, vec2<f32>(-6.0), vec2<f32>(6.0));
      slope = length(grad);
    }
    let edgeWear = curvature_edge_wear(angle_der, v_smooth);
    let flatNormal = vec3<f32>(0.0, 0.0, 1.0);
    let baseNormal = normalize(mix(flatNormal, mandelbrot_normal(angle_der), surfaceRelief));
    let baseTangent = mandelbrot_tangent(angle_der, baseNormal);
    let baseBitangent = normalize(cross(baseNormal, baseTangent));
    var bumpedNormal = baseNormal;
    let bumpStrength = parameters.microBumpStrength * effTess;
    if (bumpStrength > 0.001) {
      let tile_drift_u = anim * 0.03 * sin(t * 0.4 * spd);
      let tile_drift_v = anim * 0.03 * sin(t * 0.3 * spd + 1.2);
      bumpedNormal = texture_bump_normal(
        tileTex,
        baseNormal,
        baseTangent,
        baseBitangent,
        tess_u + tile_drift_u,
        tess_v + tile_drift_v,
        parameters.tessellationLevel,
        bumpStrength
      );
    }
    let heightNormal = fractal_height_normal(bumpedNormal, baseTangent, baseBitangent, grad, relief);
    let normal = heightNormal;
    let heightAo = fractal_height_ao(slope, relief, occStrength);
    let normalCavity = clamp(
      1.0 - smoothstep(0.02, 0.62, 1.0 - normal.z) * 0.58 * occStrength,
      0.16,
      1.0
    );
    let cavity = min(surface_cavity(slope, relief, occStrength), normalCavity);
    let ao = min(pseudo_ambient_occlusion(normal, v_smooth, z), heightAo) * cavity;
    let la = fx.lightAngle;
    let lightDir = normalize(vec3<f32>(cos(la), sin(la), 1.85));
    let viewDir = normalize(vec3<f32>(cos(la + 0.5), sin(la + 0.5), 0.5));
    let halfDir = normalize(lightDir + viewDir);
    let tangent = mandelbrot_tangent(angle_der, normal);
    let bitangent = normalize(cross(normal, tangent));
    let nDotL = max(dot(normal, lightDir), 0.0);
    let nDotV = max(dot(normal, viewDir), 0.0);
    let nDotH = max(dot(normal, halfDir), 0.0);
    let vDotH = max(dot(viewDir, halfDir), 0.0);
    let metallic = clamp(fx.metallic, 0.0, 1.0);
    let roughness = clamp(fx.roughness, 0.02, 1.0);
    let anisotropy = clamp(fx.anisotropy, 0.0, 1.0);
    let specularGain = clamp(fx.specularPower / 16.0, 0.15, 4.0);
    let f0 = mix(vec3<f32>(0.04), color, metallic);
    let fresnelSpec = fresnel_schlick(vDotH, f0);
    let distribution = ggx_distribution(nDotH, roughness);
    let geometry = ggx_geometry_smith(nDotV, nDotL, roughness);
    let specularTerm = (distribution * geometry) / max(4.0 * nDotV * nDotL, 1e-5);
    let anisotropicTerm = anisotropic_highlight(normal, tangent, bitangent, halfDir, nDotL, nDotV, roughness);
    let specularLobe = mix(specularTerm, anisotropicTerm, anisotropy);
    let directSpecular = fresnelSpec * specularLobe * specularGain * nDotL;
    let diffuseColor = color * (1.0 - metallic) * (1.0 - 0.35 * luminance(fresnelSpec));
    let localShadow = fractal_height_shadow(grad, lightDir, tangent, bitangent, relief, occStrength);
    let shadowedNDotL = nDotL * localShadow;
    let diffuseLight = diffuseColor * (0.14 + 0.86 * shadowedNDotL) * ao;
    let brightness = max(fx.shadingLevel, 0.0);
    var materialColor = diffuseLight + directSpecular * ao * mix(1.0, localShadow, 0.45);

    if (parameters.subsurfaceStrength > 0.001) {
      materialColor += fake_subsurface_scattering(
        color,
        normal,
        lightDir,
        nDotV,
        ao,
        edgeWear,
        metallic,
        parameters.subsurfaceStrength,
        distanceHeight
      );
    }

    // Thin clearcoat layer: a sharp white lobe sitting above the base material.
    let clearcoatStrength = effShading * clamp(parameters.clearcoatStrength, 0.0, 10.0) * (0.12 + 0.38 * fx.wSkybox) * (1.0 - roughness * 0.55);
    if (clearcoatStrength > 0.001) {
      let clearcoatD = ggx_distribution(nDotH, 0.08);
      let clearcoatG = ggx_geometry_smith(nDotV, nDotL, 0.08);
      let clearcoatF = fresnel_schlick(vDotH, vec3<f32>(0.04));
      materialColor += clearcoatF * (clearcoatD * clearcoatG / max(4.0 * nDotV * nDotL, 1e-5)) * nDotL * clearcoatStrength;
    }

    var envColor = vec3<f32>(0.0);
    if (fx.wSkybox > 0.001) {
      let sky_drift_u = anim * 0.02 * sin(t * 0.25 * spd + 3.5);
      let sky_drift_v = anim * 0.02 * sin(t * 0.2 * spd + 4.8);
      let skyboxDir = reflect(-viewDir, normal);
      let skyboxColor = rough_skybox_reflection(skyboxDir, tangent, bitangent, roughness, dx + sky_drift_u, dy + sky_drift_v);
      let fresnelEnv = fresnel_schlick(nDotV, f0);
      let reflectionStrength = fx.wSkybox * clamp(luminance(fresnelEnv), 0.0, 1.0);
      envColor = skyboxColor * fresnelEnv * reflectionStrength * mix(0.55, 1.25, metallic);
    }

    let rim = pow(clamp(1.0 - nDotV, 0.0, 1.0), mix(3.5, 1.8, metallic)) * effShading;
    let rimColor = mix(color, vec3<f32>(1.0), 0.45) * rim * (0.08 + 0.22 * fx.wSkybox);
    let wearColor = mix(color, vec3<f32>(1.0, 0.92, 0.74), 0.5 + 0.3 * metallic);
    let wear = edgeWear * (0.15 + 0.35 * metallic) * effShading;
    materialColor = mix(materialColor, materialColor + wearColor * wear, clamp(edgeWear, 0.0, 1.0));

    materialColor *= mix(1.0, cavity, 0.65);

    let pbrColor = (materialColor + envColor * mix(1.0, cavity, 0.35) + rimColor) * (0.55 + brightness * 0.45);
    color = mix(color * ao, pbrColor, effShading);
  }

  return clamp(color, vec3<f32>(0.0), vec3<f32>(1.0));
}

fn escape_nu(iter_val: f32, zx_val: f32, zy_val: f32) -> f32 {
  if (iter_val <= 0.0) {
    return -1.0;
  }
  let z_sq = zx_val * zx_val + zy_val * zy_val;
  if (z_sq < parameters.mu) {
    return -1.0;
  }
  let log_z2 = log(max(z_sq, 1e-12));
  let mu_val = clamp(1.0 - log(log_z2 / log(parameters.mu)) / log(2.0), 0.0, 1.0);
  return iter_val + mu_val;
}

// \u2500\u2500 Colorize a single pixel from its raw layer values \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn colorize_pixel(
  sourceTex: texture_2d_array<f32>,
  sourceCoord: vec2<i32>,
  sourceTexSize: vec2<i32>,
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
    return vec4<f32>(0.0, 0.0, 0.0, 0.0);
  }

  // Inside the set: iter_val == 0. Color by smooth iteration count (stored in ref_i_val).
  // Smoothing with |z_n|: works regardless of epsilon detection.
  // Palette cycling uses a fixed ratio (independent of palettePeriod).
  if (iter_val == 0.0) {
    return vec4<f32>(0.0, 0.0, 0.0, 0.0);
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
  var color = palette(sourceTex, sourceCoord, sourceTexSize, iter_val, v, v_smooth, z, der, angle_der, uv_neutral.x, uv_neutral.y);

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
      let live_zx = textureLoad(tex, liveCoord, 2, 0).r;
      let live_zy = textureLoad(tex, liveCoord, 3, 0).r;
      liveColor = colorize_pixel(
        tex,
        liveCoord,
        texSize,
        live_iter,
        live_zx,
        live_zy,
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
        let frozen_zx = textureLoad(texFrozen, frozenCoord, 2, 0).r;
        let frozen_zy = textureLoad(texFrozen, frozenCoord, 3, 0).r;
        frozenColor = colorize_pixel(
          texFrozen,
          frozenCoord,
          texSize,
          frozen_iter,
          frozen_zx,
          frozen_zy,
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
`,be=`// Brush pass: updates sentinel levels in the neutral square texture.
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
`,Tr=`// Resolve pass: replaces remaining sentinels with a snapped parent pixel.
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

fn empty_out() -> FragOut {
  var o: FragOut;
  o.iter      = pack(0.0);
  o.genuine   = pack(0.0);
  o.zx        = pack(0.0);
  o.zy        = pack(0.0);
  o.dzx       = pack(0.0);
  o.dzy       = pack(0.0);
  o.ref_i     = pack(0.0);
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
    discard;
    return empty_out();
  }
  if (iter_val > 0.0) {
    let zx = loadLayer(coord, 2);
    let zy = loadLayer(coord, 3);
    let z_sq = zx * zx + zy * zy;
    if (z_sq > uni.mu) {
      // Escaped \u2014 finished, pass through.
      discard;
      return empty_out();
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
      discard;
      return empty_out();
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
      discard;
      return empty_out();
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
  discard;
  return empty_out();
}
`,kr=`// Compute pass: counts pixels that still need rendering work.
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

  if (iter < 0.0) {
    atomicAdd(&counter.count, 1u);
    if (iter == -1.0) {
      atomicAdd(&counter.active_count, 1u);
    }
    return;
  }

  if (iter <= 0.0) {
    return;
  }

  let zx = textureLoad(rawTex, coord, 2, 0).r;
  let zy = textureLoad(rawTex, coord, 3, 0).r;
  let needs_continuation = (zx * zx + zy * zy) < params.mu;
  if (needs_continuation) {
    atomicAdd(&counter.count, 1u);
    atomicAdd(&counter.active_count, 1u);
  }
}
`,Br=`// Merge pass: fuses the resolved (live) and frozen textures into a new frozen
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
fn readAllLayersWithKnown01(tex: texture_2d_array<f32>, coord: vec2<i32>, iter: f32, step: f32) -> FragOut {
  var o: FragOut;
  o.layer0 = pack(iter);
  o.layer1 = pack(step);
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
  var liveData = makeEmpty();
  if (liveInBounds) {
    let liveCoord = vec2<i32>(
      i32(clamp(uv_live.x * texSizeF.x, 0.0, texSizeF.x - 1.0)),
      i32(clamp((1.0 - uv_live.y) * texSizeF.y, 0.0, texSizeF.y - 1.0))
    );
    liveIter = textureLoad(texResolved, liveCoord, 0, 0).r;
    liveStep = textureLoad(texResolved, liveCoord, 1, 0).r;
    if (liveIter >= 0.0 && liveStep > 0.0) {
      liveData = readAllLayersWithKnown01(texResolved, liveCoord, liveIter, liveStep);
    }
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
  var frozenData = makeEmpty();
  if (frozenInBounds) {
    let frozenCoord = vec2<i32>(
      i32(clamp(uv_frozen.x * texSizeF.x, 0.0, texSizeF.x - 1.0)),
      i32(clamp((1.0 - uv_frozen.y) * texSizeF.y, 0.0, texSizeF.y - 1.0))
    );
    frozenIter = textureLoad(texFrozen, frozenCoord, 0, 0).r;
    frozenStep = textureLoad(texFrozen, frozenCoord, 1, 0).r;
    if (frozenIter >= 0.0 && frozenStep > 0.0) {
      frozenData = readAllLayersWithKnown01(texFrozen, frozenCoord, frozenIter, frozenStep);
    }
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
`,Lr=async(t={},e)=>{let r;if(e.startsWith("data:")){const i=e.replace(/^data:.*?base64,/,"");let a;if(typeof Buffer=="function"&&typeof Buffer.from=="function")a=Buffer.from(i,"base64");else if(typeof atob=="function"){const o=atob(i);a=new Uint8Array(o.length);for(let u=0;u<o.length;u++)a[u]=o.charCodeAt(u)}else throw new Error("Cannot decode base64-encoded data URL");r=await WebAssembly.instantiate(a,t)}else{const i=await fetch(e),a=i.headers.get("Content-Type")||"";if("instantiateStreaming"in WebAssembly&&a.startsWith("application/wasm"))r=await WebAssembly.instantiateStreaming(i,t);else{const o=await i.arrayBuffer();r=await WebAssembly.instantiate(o,t)}}return r.instance.exports};let g;function Cr(t){g=t}let Ue=null;function Ne(){return(Ue===null||Ue.byteLength===0)&&(Ue=new Uint8Array(g.memory.buffer)),Ue}let Oe=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0});Oe.decode();const Rr=2146435072;let Ke=0;function Er(t,e){return Ke+=e,Ke>=Rr&&(Oe=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0}),Oe.decode(),Ke=e),Oe.decode(Ne().subarray(t,t+e))}function Tt(t,e){return t=t>>>0,Er(t,e)}let xe=null;function Pr(){return(xe===null||xe.buffer.detached===!0||xe.buffer.detached===void 0&&xe.buffer!==g.memory.buffer)&&(xe=new DataView(g.memory.buffer)),xe}function Je(t,e){t=t>>>0;const r=Pr(),i=[];for(let a=t;a<t+4*e;a+=4)i.push(g.__wbindgen_export_0.get(r.getUint32(a,!0)));return g.__externref_drop_slice(t,e),i}let fe=0;const Ce=new TextEncoder;"encodeInto"in Ce||(Ce.encodeInto=function(t,e){const r=Ce.encode(t);return e.set(r),{read:t.length,written:r.length}});function ye(t,e,r){if(r===void 0){const l=Ce.encode(t),d=e(l.length,1)>>>0;return Ne().subarray(d,d+l.length).set(l),fe=l.length,d}let i=t.length,a=e(i,1)>>>0;const o=Ne();let u=0;for(;u<i;u++){const l=t.charCodeAt(u);if(l>127)break;o[a+u]=l}if(u!==i){u!==0&&(t=t.slice(u)),a=r(a,i,i=u+t.length*3,1)>>>0;const l=Ne().subarray(a+u,a+i),d=Ce.encodeInto(t,l);u+=d.written,a=r(a,i,u,1)>>>0}return fe=u,a}const kt=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(t=>g.__wbg_blabufferinfo_free(t>>>0,1));class Re{static __wrap(e){e=e>>>0;const r=Object.create(Re.prototype);return r.__wbg_ptr=e,kt.register(r,r.__wbg_ptr,r),r}__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,kt.unregister(this),e}free(){const e=this.__destroy_into_raw();g.__wbg_blabufferinfo_free(e,0)}get ptr(){return g.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr)>>>0}set ptr(e){g.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr,e)}get count(){return g.__wbg_get_blabufferinfo_count(this.__wbg_ptr)>>>0}set count(e){g.__wbg_set_blabufferinfo_count(this.__wbg_ptr,e)}get levels_ptr(){return g.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr)>>>0}set levels_ptr(e){g.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr,e)}get level_count(){return g.__wbg_get_blabufferinfo_level_count(this.__wbg_ptr)>>>0}set level_count(e){g.__wbg_set_blabufferinfo_level_count(this.__wbg_ptr,e)}}Symbol.dispose&&(Re.prototype[Symbol.dispose]=Re.prototype.free),typeof FinalizationRegistry>"u"||new FinalizationRegistry(t=>g.__wbg_blalevel_free(t>>>0,1)),typeof FinalizationRegistry>"u"||new FinalizationRegistry(t=>g.__wbg_blastep_free(t>>>0,1));const Bt=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(t=>g.__wbg_mandelbrotnavigator_free(t>>>0,1));class Qe{__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,Bt.unregister(this),e}free(){const e=this.__destroy_into_raw();g.__wbg_mandelbrotnavigator_free(e,0)}get_params(){const e=g.mandelbrotnavigator_get_params(this.__wbg_ptr);var r=Je(e[0],e[1]).slice();return g.__wbindgen_free(e[0],e[1]*4,4),r}rotate_direct(e){g.mandelbrotnavigator_rotate_direct(this.__wbg_ptr,e)}get_bla_epsilon(){return g.mandelbrotnavigator_get_bla_epsilon(this.__wbg_ptr)}set_bla_epsilon(e){g.mandelbrotnavigator_set_bla_epsilon(this.__wbg_ptr,e)}pixel_to_complex(e,r,i,a){const o=g.mandelbrotnavigator_pixel_to_complex(this.__wbg_ptr,e,r,i,a);var u=Je(o[0],o[1]).slice();return g.__wbindgen_free(o[0],o[1]*4,4),u}translate_direct(e,r){g.mandelbrotnavigator_translate_direct(this.__wbg_ptr,e,r)}use_perturbation(){g.mandelbrotnavigator_use_perturbation(this.__wbg_ptr)}get_approximation_mode(){return g.mandelbrotnavigator_get_approximation_mode(this.__wbg_ptr)}get_reference_orbit_len(){return g.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr)>>>0}compute_bla_reference_ptr(e){const r=g.mandelbrotnavigator_compute_bla_reference_ptr(this.__wbg_ptr,e);return Re.__wrap(r)}compute_reference_orbit_ptr(e){const r=g.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr,e);return we.__wrap(r)}get_reference_orbit_capacity(){return g.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr)>>>0}compute_reference_orbit_chunk(e,r){const i=g.mandelbrotnavigator_compute_reference_orbit_chunk(this.__wbg_ptr,e,r);return we.__wrap(i)}constructor(e,r,i,a){const o=ye(e,g.__wbindgen_malloc,g.__wbindgen_realloc),u=fe,l=ye(r,g.__wbindgen_malloc,g.__wbindgen_realloc),d=fe,y=ye(i,g.__wbindgen_malloc,g.__wbindgen_realloc),h=fe,p=g.mandelbrotnavigator_new(o,u,l,d,y,h,a);return this.__wbg_ptr=p>>>0,Bt.register(this,this.__wbg_ptr,this),this}step(){const e=g.mandelbrotnavigator_step(this.__wbg_ptr);var r=Je(e[0],e[1]).slice();return g.__wbindgen_free(e[0],e[1]*4,4),r}zoom(e){g.mandelbrotnavigator_zoom(this.__wbg_ptr,e)}angle(e){g.mandelbrotnavigator_angle(this.__wbg_ptr,e)}scale(e){const r=ye(e,g.__wbindgen_malloc,g.__wbindgen_realloc),i=fe;g.mandelbrotnavigator_scale(this.__wbg_ptr,r,i)}origin(e,r){const i=ye(e,g.__wbindgen_malloc,g.__wbindgen_realloc),a=fe,o=ye(r,g.__wbindgen_malloc,g.__wbindgen_realloc),u=fe;g.mandelbrotnavigator_origin(this.__wbg_ptr,i,a,o,u)}rotate(e){g.mandelbrotnavigator_rotate(this.__wbg_ptr,e)}use_bla(){g.mandelbrotnavigator_use_bla(this.__wbg_ptr)}translate(e,r){g.mandelbrotnavigator_translate(this.__wbg_ptr,e,r)}}Symbol.dispose&&(Qe.prototype[Symbol.dispose]=Qe.prototype.free),typeof FinalizationRegistry>"u"||new FinalizationRegistry(t=>g.__wbg_mandelbrotstep_free(t>>>0,1));const Lt=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(t=>g.__wbg_orbitbufferinfo_free(t>>>0,1));class we{static __wrap(e){e=e>>>0;const r=Object.create(we.prototype);return r.__wbg_ptr=e,Lt.register(r,r.__wbg_ptr,r),r}__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,Lt.unregister(this),e}free(){const e=this.__destroy_into_raw();g.__wbg_orbitbufferinfo_free(e,0)}get ptr(){return g.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr)>>>0}set ptr(e){g.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr,e)}get offset(){return g.__wbg_get_blabufferinfo_count(this.__wbg_ptr)>>>0}set offset(e){g.__wbg_set_blabufferinfo_count(this.__wbg_ptr,e)}get count(){return g.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr)>>>0}set count(e){g.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr,e)}}Symbol.dispose&&(we.prototype[Symbol.dispose]=we.prototype.free);function Ar(t){return Math.exp(t)}function Gr(){return Date.now()}function Fr(t,e){throw new Error(Tt(t,e))}function Dr(t,e){return Tt(t,e)}function Ur(){const t=g.__wbindgen_export_0,e=t.grow(4);t.set(0,void 0),t.set(e+0,void 0),t.set(e+1,null),t.set(e+2,!0),t.set(e+3,!1)}URL=globalThis.URL;const f=await Lr({"./mandelbrot_bg.js":{__wbg_now_1e80617bcee43265:Gr,__wbg_exp_9293ded1248e1bd3:Ar,__wbg_wbindgenthrow_451ec1a8469d7eb6:Fr,__wbindgen_init_externref_table:Ur,__wbindgen_cast_2241b6af4c4b2941:Dr}},Ya),Ie=f.memory,Nr=f.__wbg_blabufferinfo_free,Or=f.__wbg_blalevel_free,Ir=f.__wbg_blastep_free,Vr=f.__wbg_get_blabufferinfo_count,Hr=f.__wbg_get_blabufferinfo_level_count,qr=f.__wbg_get_blabufferinfo_levels_ptr,Yr=f.__wbg_get_blabufferinfo_ptr,Wr=f.__wbg_get_blastep_ax,$r=f.__wbg_get_blastep_ay,jr=f.__wbg_get_blastep_bx,Xr=f.__wbg_get_blastep_by,Zr=f.__wbg_get_blastep_radius_alpha,Kr=f.__wbg_get_blastep_radius_beta,Jr=f.__wbg_mandelbrotnavigator_free,Qr=f.__wbg_mandelbrotstep_free,ei=f.__wbg_orbitbufferinfo_free,ti=f.__wbg_set_blabufferinfo_count,ri=f.__wbg_set_blabufferinfo_level_count,ii=f.__wbg_set_blabufferinfo_levels_ptr,ai=f.__wbg_set_blabufferinfo_ptr,oi=f.__wbg_set_blastep_ax,ni=f.__wbg_set_blastep_ay,si=f.__wbg_set_blastep_bx,li=f.__wbg_set_blastep_by,ui=f.__wbg_set_blastep_radius_alpha,ci=f.__wbg_set_blastep_radius_beta,di=f.mandelbrotnavigator_angle,fi=f.mandelbrotnavigator_compute_bla_reference_ptr,hi=f.mandelbrotnavigator_compute_reference_orbit_chunk,pi=f.mandelbrotnavigator_compute_reference_orbit_ptr,gi=f.mandelbrotnavigator_get_approximation_mode,_i=f.mandelbrotnavigator_get_bla_epsilon,mi=f.mandelbrotnavigator_get_params,vi=f.mandelbrotnavigator_get_reference_orbit_capacity,bi=f.mandelbrotnavigator_get_reference_orbit_len,xi=f.mandelbrotnavigator_new,yi=f.mandelbrotnavigator_origin,wi=f.mandelbrotnavigator_pixel_to_complex,zi=f.mandelbrotnavigator_rotate,Si=f.mandelbrotnavigator_rotate_direct,Mi=f.mandelbrotnavigator_scale,Ti=f.mandelbrotnavigator_set_bla_epsilon,ki=f.mandelbrotnavigator_step,Bi=f.mandelbrotnavigator_translate,Li=f.mandelbrotnavigator_translate_direct,Ci=f.mandelbrotnavigator_use_bla,Ri=f.mandelbrotnavigator_use_perturbation,Ei=f.mandelbrotnavigator_zoom,Pi=f.__wbg_set_blalevel__padding,Ai=f.__wbg_set_blalevel_count,Gi=f.__wbg_set_blalevel_offset,Fi=f.__wbg_set_blalevel_skip,Di=f.__wbg_set_mandelbrotstep_dx,Ui=f.__wbg_set_mandelbrotstep_dy,Ni=f.__wbg_set_mandelbrotstep_zx,Oi=f.__wbg_set_mandelbrotstep_zy,Ii=f.__wbg_set_orbitbufferinfo_count,Vi=f.__wbg_set_orbitbufferinfo_offset,Hi=f.__wbg_set_orbitbufferinfo_ptr,qi=f.__wbg_get_blalevel__padding,Yi=f.__wbg_get_blalevel_count,Wi=f.__wbg_get_blalevel_offset,$i=f.__wbg_get_blalevel_skip,ji=f.__wbg_get_orbitbufferinfo_count,Xi=f.__wbg_get_orbitbufferinfo_offset,Zi=f.__wbg_get_orbitbufferinfo_ptr,Ki=f.__wbg_get_mandelbrotstep_dx,Ji=f.__wbg_get_mandelbrotstep_dy,Qi=f.__wbg_get_mandelbrotstep_zx,ea=f.__wbg_get_mandelbrotstep_zy,ta=f.__wbindgen_export_0,ra=f.__externref_drop_slice,ia=f.__wbindgen_free,aa=f.__wbindgen_malloc,oa=f.__wbindgen_realloc,Ct=f.__wbindgen_start,na=Object.freeze(Object.defineProperty({__proto__:null,__externref_drop_slice:ra,__wbg_blabufferinfo_free:Nr,__wbg_blalevel_free:Or,__wbg_blastep_free:Ir,__wbg_get_blabufferinfo_count:Vr,__wbg_get_blabufferinfo_level_count:Hr,__wbg_get_blabufferinfo_levels_ptr:qr,__wbg_get_blabufferinfo_ptr:Yr,__wbg_get_blalevel__padding:qi,__wbg_get_blalevel_count:Yi,__wbg_get_blalevel_offset:Wi,__wbg_get_blalevel_skip:$i,__wbg_get_blastep_ax:Wr,__wbg_get_blastep_ay:$r,__wbg_get_blastep_bx:jr,__wbg_get_blastep_by:Xr,__wbg_get_blastep_radius_alpha:Zr,__wbg_get_blastep_radius_beta:Kr,__wbg_get_mandelbrotstep_dx:Ki,__wbg_get_mandelbrotstep_dy:Ji,__wbg_get_mandelbrotstep_zx:Qi,__wbg_get_mandelbrotstep_zy:ea,__wbg_get_orbitbufferinfo_count:ji,__wbg_get_orbitbufferinfo_offset:Xi,__wbg_get_orbitbufferinfo_ptr:Zi,__wbg_mandelbrotnavigator_free:Jr,__wbg_mandelbrotstep_free:Qr,__wbg_orbitbufferinfo_free:ei,__wbg_set_blabufferinfo_count:ti,__wbg_set_blabufferinfo_level_count:ri,__wbg_set_blabufferinfo_levels_ptr:ii,__wbg_set_blabufferinfo_ptr:ai,__wbg_set_blalevel__padding:Pi,__wbg_set_blalevel_count:Ai,__wbg_set_blalevel_offset:Gi,__wbg_set_blalevel_skip:Fi,__wbg_set_blastep_ax:oi,__wbg_set_blastep_ay:ni,__wbg_set_blastep_bx:si,__wbg_set_blastep_by:li,__wbg_set_blastep_radius_alpha:ui,__wbg_set_blastep_radius_beta:ci,__wbg_set_mandelbrotstep_dx:Di,__wbg_set_mandelbrotstep_dy:Ui,__wbg_set_mandelbrotstep_zx:Ni,__wbg_set_mandelbrotstep_zy:Oi,__wbg_set_orbitbufferinfo_count:Ii,__wbg_set_orbitbufferinfo_offset:Vi,__wbg_set_orbitbufferinfo_ptr:Hi,__wbindgen_export_0:ta,__wbindgen_free:ia,__wbindgen_malloc:aa,__wbindgen_realloc:oa,__wbindgen_start:Ct,mandelbrotnavigator_angle:di,mandelbrotnavigator_compute_bla_reference_ptr:fi,mandelbrotnavigator_compute_reference_orbit_chunk:hi,mandelbrotnavigator_compute_reference_orbit_ptr:pi,mandelbrotnavigator_get_approximation_mode:gi,mandelbrotnavigator_get_bla_epsilon:_i,mandelbrotnavigator_get_params:mi,mandelbrotnavigator_get_reference_orbit_capacity:vi,mandelbrotnavigator_get_reference_orbit_len:bi,mandelbrotnavigator_new:xi,mandelbrotnavigator_origin:yi,mandelbrotnavigator_pixel_to_complex:wi,mandelbrotnavigator_rotate:zi,mandelbrotnavigator_rotate_direct:Si,mandelbrotnavigator_scale:Mi,mandelbrotnavigator_set_bla_epsilon:Ti,mandelbrotnavigator_step:ki,mandelbrotnavigator_translate:Bi,mandelbrotnavigator_translate_direct:Li,mandelbrotnavigator_use_bla:Ci,mandelbrotnavigator_use_perturbation:Ri,mandelbrotnavigator_zoom:Ei,memory:Ie},Symbol.toStringTag,{value:"Module"}));Cr(na),Ct();class sa{constructor(e=1024,r=1024){n(this,"video");n(this,"stream",null);n(this,"width");n(this,"height");n(this,"lastDrawTime",0);this.width=e,this.height=r,this.video=document.createElement("video"),this.video.autoplay=!0,this.video.width=e,this.video.height=r}async openWebcam(){this.stream||(this.stream=await navigator.mediaDevices.getUserMedia({video:{width:this.width,height:this.height}}),this.video.srcObject=this.stream,await this.video.play())}async drawWebGPUTexture(e,r){const i=performance.now();if(i-this.lastDrawTime>15){if(this.video.readyState<HTMLMediaElement.HAVE_CURRENT_DATA)return;r.queue.copyExternalImageToTexture({source:this.video},{texture:e},[this.width,this.height]),this.lastDrawTime=i}}closeWebcam(){this.stream&&(this.stream.getTracks().forEach(e=>e.stop()),this.stream=null)}}function ze(t,e,r){t.prototype=e.prototype=r,r.constructor=t}function Ee(t,e){var r=Object.create(t.prototype);for(var i in e)r[i]=e[i];return r}function he(){}var ge=.7,Se=1/ge,Me="\\s*([+-]?\\d+)\\s*",Pe="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*",ie="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*",la=/^#([0-9a-f]{3,8})$/,ua=new RegExp(`^rgb\\(${Me},${Me},${Me}\\)$`),ca=new RegExp(`^rgb\\(${ie},${ie},${ie}\\)$`),da=new RegExp(`^rgba\\(${Me},${Me},${Me},${Pe}\\)$`),fa=new RegExp(`^rgba\\(${ie},${ie},${ie},${Pe}\\)$`),ha=new RegExp(`^hsl\\(${Pe},${ie},${ie}\\)$`),pa=new RegExp(`^hsla\\(${Pe},${ie},${ie},${Pe}\\)$`),Rt={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074};ze(he,et,{copy(t){return Object.assign(new this.constructor,this,t)},displayable(){return this.rgb().displayable()},hex:Et,formatHex:Et,formatHex8:ga,formatHsl:_a,formatRgb:Pt,toString:Pt});function Et(){return this.rgb().formatHex()}function ga(){return this.rgb().formatHex8()}function _a(){return Ut(this).formatHsl()}function Pt(){return this.rgb().formatRgb()}function et(t){var e,r;return t=(t+"").trim().toLowerCase(),(e=la.exec(t))?(r=e[1].length,e=parseInt(e[1],16),r===6?At(e):r===3?new O(e>>8&15|e>>4&240,e>>4&15|e&240,(e&15)<<4|e&15,1):r===8?Ve(e>>24&255,e>>16&255,e>>8&255,(e&255)/255):r===4?Ve(e>>12&15|e>>8&240,e>>8&15|e>>4&240,e>>4&15|e&240,((e&15)<<4|e&15)/255):null):(e=ua.exec(t))?new O(e[1],e[2],e[3],1):(e=ca.exec(t))?new O(e[1]*255/100,e[2]*255/100,e[3]*255/100,1):(e=da.exec(t))?Ve(e[1],e[2],e[3],e[4]):(e=fa.exec(t))?Ve(e[1]*255/100,e[2]*255/100,e[3]*255/100,e[4]):(e=ha.exec(t))?Dt(e[1],e[2]/100,e[3]/100,1):(e=pa.exec(t))?Dt(e[1],e[2]/100,e[3]/100,e[4]):Rt.hasOwnProperty(t)?At(Rt[t]):t==="transparent"?new O(NaN,NaN,NaN,0):null}function At(t){return new O(t>>16&255,t>>8&255,t&255,1)}function Ve(t,e,r,i){return i<=0&&(t=e=r=NaN),new O(t,e,r,i)}function tt(t){return t instanceof he||(t=et(t)),t?(t=t.rgb(),new O(t.r,t.g,t.b,t.opacity)):new O}function Te(t,e,r,i){return arguments.length===1?tt(t):new O(t,e,r,i??1)}function O(t,e,r,i){this.r=+t,this.g=+e,this.b=+r,this.opacity=+i}ze(O,Te,Ee(he,{brighter(t){return t=t==null?Se:Math.pow(Se,t),new O(this.r*t,this.g*t,this.b*t,this.opacity)},darker(t){return t=t==null?ge:Math.pow(ge,t),new O(this.r*t,this.g*t,this.b*t,this.opacity)},rgb(){return this},clamp(){return new O(_e(this.r),_e(this.g),_e(this.b),He(this.opacity))},displayable(){return-.5<=this.r&&this.r<255.5&&-.5<=this.g&&this.g<255.5&&-.5<=this.b&&this.b<255.5&&0<=this.opacity&&this.opacity<=1},hex:Gt,formatHex:Gt,formatHex8:ma,formatRgb:Ft,toString:Ft}));function Gt(){return`#${me(this.r)}${me(this.g)}${me(this.b)}`}function ma(){return`#${me(this.r)}${me(this.g)}${me(this.b)}${me((isNaN(this.opacity)?1:this.opacity)*255)}`}function Ft(){const t=He(this.opacity);return`${t===1?"rgb(":"rgba("}${_e(this.r)}, ${_e(this.g)}, ${_e(this.b)}${t===1?")":`, ${t})`}`}function He(t){return isNaN(t)?1:Math.max(0,Math.min(1,t))}function _e(t){return Math.max(0,Math.min(255,Math.round(t)||0))}function me(t){return t=_e(t),(t<16?"0":"")+t.toString(16)}function Dt(t,e,r,i){return i<=0?t=e=r=NaN:r<=0||r>=1?t=e=NaN:e<=0&&(t=NaN),new te(t,e,r,i)}function Ut(t){if(t instanceof te)return new te(t.h,t.s,t.l,t.opacity);if(t instanceof he||(t=et(t)),!t)return new te;if(t instanceof te)return t;t=t.rgb();var e=t.r/255,r=t.g/255,i=t.b/255,a=Math.min(e,r,i),o=Math.max(e,r,i),u=NaN,l=o-a,d=(o+a)/2;return l?(e===o?u=(r-i)/l+(r<i)*6:r===o?u=(i-e)/l+2:u=(e-r)/l+4,l/=d<.5?o+a:2-o-a,u*=60):l=d>0&&d<1?0:u,new te(u,l,d,t.opacity)}function rt(t,e,r,i){return arguments.length===1?Ut(t):new te(t,e,r,i??1)}function te(t,e,r,i){this.h=+t,this.s=+e,this.l=+r,this.opacity=+i}ze(te,rt,Ee(he,{brighter(t){return t=t==null?Se:Math.pow(Se,t),new te(this.h,this.s,this.l*t,this.opacity)},darker(t){return t=t==null?ge:Math.pow(ge,t),new te(this.h,this.s,this.l*t,this.opacity)},rgb(){var t=this.h%360+(this.h<0)*360,e=isNaN(t)||isNaN(this.s)?0:this.s,r=this.l,i=r+(r<.5?r:1-r)*e,a=2*r-i;return new O(it(t>=240?t-240:t+120,a,i),it(t,a,i),it(t<120?t+240:t-120,a,i),this.opacity)},clamp(){return new te(Nt(this.h),qe(this.s),qe(this.l),He(this.opacity))},displayable(){return(0<=this.s&&this.s<=1||isNaN(this.s))&&0<=this.l&&this.l<=1&&0<=this.opacity&&this.opacity<=1},formatHsl(){const t=He(this.opacity);return`${t===1?"hsl(":"hsla("}${Nt(this.h)}, ${qe(this.s)*100}%, ${qe(this.l)*100}%${t===1?")":`, ${t})`}`}}));function Nt(t){return t=(t||0)%360,t<0?t+360:t}function qe(t){return Math.max(0,Math.min(1,t||0))}function it(t,e,r){return(t<60?e+(r-e)*t/60:t<180?r:t<240?e+(r-e)*(240-t)/60:e)*255}const Ot=Math.PI/180,It=180/Math.PI,Ye=18,Vt=.96422,Ht=1,qt=.82521,Yt=4/29,ke=6/29,Wt=3*ke*ke,va=ke*ke*ke;function $t(t){if(t instanceof ae)return new ae(t.l,t.a,t.b,t.opacity);if(t instanceof le)return jt(t);t instanceof O||(t=tt(t));var e=lt(t.r),r=lt(t.g),i=lt(t.b),a=ot((.2225045*e+.7168786*r+.0606169*i)/Ht),o,u;return e===r&&r===i?o=u=a:(o=ot((.4360747*e+.3850649*r+.1430804*i)/Vt),u=ot((.0139322*e+.0971045*r+.7141733*i)/qt)),new ae(116*a-16,500*(o-a),200*(a-u),t.opacity)}function at(t,e,r,i){return arguments.length===1?$t(t):new ae(t,e,r,i??1)}function ae(t,e,r,i){this.l=+t,this.a=+e,this.b=+r,this.opacity=+i}ze(ae,at,Ee(he,{brighter(t){return new ae(this.l+Ye*(t??1),this.a,this.b,this.opacity)},darker(t){return new ae(this.l-Ye*(t??1),this.a,this.b,this.opacity)},rgb(){var t=(this.l+16)/116,e=isNaN(this.a)?t:t+this.a/500,r=isNaN(this.b)?t:t-this.b/200;return e=Vt*nt(e),t=Ht*nt(t),r=qt*nt(r),new O(st(3.1338561*e-1.6168667*t-.4906146*r),st(-.9787684*e+1.9161415*t+.033454*r),st(.0719453*e-.2289914*t+1.4052427*r),this.opacity)}}));function ot(t){return t>va?Math.pow(t,1/3):t/Wt+Yt}function nt(t){return t>ke?t*t*t:Wt*(t-Yt)}function st(t){return 255*(t<=.0031308?12.92*t:1.055*Math.pow(t,1/2.4)-.055)}function lt(t){return(t/=255)<=.04045?t/12.92:Math.pow((t+.055)/1.055,2.4)}function ba(t){if(t instanceof le)return new le(t.h,t.c,t.l,t.opacity);if(t instanceof ae||(t=$t(t)),t.a===0&&t.b===0)return new le(NaN,0<t.l&&t.l<100?0:NaN,t.l,t.opacity);var e=Math.atan2(t.b,t.a)*It;return new le(e<0?e+360:e,Math.sqrt(t.a*t.a+t.b*t.b),t.l,t.opacity)}function ut(t,e,r,i){return arguments.length===1?ba(t):new le(t,e,r,i??1)}function le(t,e,r,i){this.h=+t,this.c=+e,this.l=+r,this.opacity=+i}function jt(t){if(isNaN(t.h))return new ae(t.l,0,0,t.opacity);var e=t.h*Ot;return new ae(t.l,Math.cos(e)*t.c,Math.sin(e)*t.c,t.opacity)}ze(le,ut,Ee(he,{brighter(t){return new le(this.h,this.c,this.l+Ye*(t??1),this.opacity)},darker(t){return new le(this.h,this.c,this.l-Ye*(t??1),this.opacity)},rgb(){return jt(this).rgb()}}));var Xt=-.14861,ct=1.78277,dt=-.29227,We=-.90649,Ae=1.97294,Zt=Ae*We,Kt=Ae*ct,Jt=ct*dt-We*Xt;function xa(t){if(t instanceof ve)return new ve(t.h,t.s,t.l,t.opacity);t instanceof O||(t=tt(t));var e=t.r/255,r=t.g/255,i=t.b/255,a=(Jt*i+Zt*e-Kt*r)/(Jt+Zt-Kt),o=i-a,u=(Ae*(r-a)-dt*o)/We,l=Math.sqrt(u*u+o*o)/(Ae*a*(1-a)),d=l?Math.atan2(u,o)*It-120:NaN;return new ve(d<0?d+360:d,l,a,t.opacity)}function ft(t,e,r,i){return arguments.length===1?xa(t):new ve(t,e,r,i??1)}function ve(t,e,r,i){this.h=+t,this.s=+e,this.l=+r,this.opacity=+i}ze(ve,ft,Ee(he,{brighter(t){return t=t==null?Se:Math.pow(Se,t),new ve(this.h,this.s,this.l*t,this.opacity)},darker(t){return t=t==null?ge:Math.pow(ge,t),new ve(this.h,this.s,this.l*t,this.opacity)},rgb(){var t=isNaN(this.h)?0:(this.h+120)*Ot,e=+this.l,r=isNaN(this.s)?0:this.s*e*(1-e),i=Math.cos(t),a=Math.sin(t);return new O(255*(e+r*(Xt*i+ct*a)),255*(e+r*(dt*i+We*a)),255*(e+r*(Ae*i)),this.opacity)}}));const ht=t=>()=>t;function Qt(t,e){return function(r){return t+r*e}}function ya(t,e,r){return t=Math.pow(t,r),e=Math.pow(e,r)-t,r=1/r,function(i){return Math.pow(t+i*e,r)}}function pt(t,e){var r=e-t;return r?Qt(t,r>180||r<-180?r-360*Math.round(r/360):r):ht(isNaN(t)?e:t)}function wa(t){return(t=+t)==1?W:function(e,r){return r-e?ya(e,r,t):ht(isNaN(e)?r:e)}}function W(t,e){var r=e-t;return r?Qt(t,r):ht(isNaN(t)?e:t)}const za=(function t(e){var r=wa(e);function i(a,o){var u=r((a=Te(a)).r,(o=Te(o)).r),l=r(a.g,o.g),d=r(a.b,o.b),y=W(a.opacity,o.opacity);return function(h){return a.r=u(h),a.g=l(h),a.b=d(h),a.opacity=y(h),a+""}}return i.gamma=t,i})(1);function Sa(t){return function(e,r){var i=t((e=rt(e)).h,(r=rt(r)).h),a=W(e.s,r.s),o=W(e.l,r.l),u=W(e.opacity,r.opacity);return function(l){return e.h=i(l),e.s=a(l),e.l=o(l),e.opacity=u(l),e+""}}}const Ma=Sa(pt);function er(t,e){var r=W((t=at(t)).l,(e=at(e)).l),i=W(t.a,e.a),a=W(t.b,e.b),o=W(t.opacity,e.opacity);return function(u){return t.l=r(u),t.a=i(u),t.b=a(u),t.opacity=o(u),t+""}}function Ta(t){return function(e,r){var i=t((e=ut(e)).h,(r=ut(r)).h),a=W(e.c,r.c),o=W(e.l,r.l),u=W(e.opacity,r.opacity);return function(l){return e.h=i(l),e.c=a(l),e.l=o(l),e.opacity=u(l),e+""}}}const ka=Ta(pt);function tr(t){return(function e(r){r=+r;function i(a,o){var u=t((a=ft(a)).h,(o=ft(o)).h),l=W(a.s,o.s),d=W(a.l,o.l),y=W(a.opacity,o.opacity);return function(h){return a.h=u(h),a.s=l(h),a.l=d(Math.pow(h,r)),a.opacity=y(h),a+""}}return i.gamma=e,i})(1)}const Ba=tr(pt);tr(W);const gt={palette:1,zebra:0,tessellation:0,shading:0,skybox:0,webcam:0,smoothness:1,shadingLevel:1.5,specularPower:20,lightAngle:.75,metallic:0,roughness:.35,anisotropy:.4};function $e(t,e){return t[e]??gt[e]}const La={lab:er,rgb:za,hcl:ka,hsl:Ma,cubehelix:Ba},rr=4096,Ca=4;function Ra(t,e,r,i){const a=$e(t,r),o=$e(e,r);return a+(o-a)*i}class ir{constructor(e,r="lab"){n(this,"points");n(this,"interpolate");this.points=e.slice().sort((i,a)=>i.position-a.position),this.interpolate=La[r]??er}getColorAt(e){if(this.points.length===0)return"#000";if(e<=this.points[0].position)return this.points[0].color;if(e>=this.points[this.points.length-1].position)return this.points[this.points.length-1].color;for(let r=0;r<this.points.length-1;++r){const i=this.points[r],a=this.points[r+1];if(e>=i.position&&e<=a.position){const o=(e-i.position)/(a.position-i.position),u=this.interpolate(i.color,a.color);return Te(u(o)).formatHex()}}return"#000"}getEffectAt(e,r){if(this.points.length===0)return gt[r];if(e<=this.points[0].position)return $e(this.points[0],r);if(e>=this.points[this.points.length-1].position)return $e(this.points[this.points.length-1],r);for(let i=0;i<this.points.length-1;++i){const a=this.points[i],o=this.points[i+1];if(e>=a.position&&e<=o.position){const u=(e-a.position)/(o.position-a.position);return Ra(a,o,r,u)}}return gt[r]}generateTexture(){const e=rr,r=Ca,i=new Float32Array(e*r*4);for(let a=0;a<e;++a){const o=a/(e-1),u=Te(this.getColorAt(o)),l=(0*e+a)*4;i[l]=(u.r??0)/255,i[l+1]=(u.g??0)/255,i[l+2]=(u.b??0)/255,i[l+3]=this.getEffectAt(o,"palette");const d=(1*e+a)*4;i[d]=this.getEffectAt(o,"zebra"),i[d+1]=this.getEffectAt(o,"tessellation"),i[d+2]=this.getEffectAt(o,"shading"),i[d+3]=this.getEffectAt(o,"skybox");const y=(2*e+a)*4;i[y]=this.getEffectAt(o,"webcam"),i[y+1]=this.getEffectAt(o,"smoothness"),i[y+2]=this.getEffectAt(o,"shadingLevel"),i[y+3]=this.getEffectAt(o,"specularPower");const h=(3*e+a)*4;i[h]=this.getEffectAt(o,"lightAngle"),i[h+1]=this.getEffectAt(o,"metallic"),i[h+2]=this.getEffectAt(o,"roughness"),i[h+3]=this.getEffectAt(o,"anisotropy")}return{data:i,width:e,height:r}}generateThumbnailRow(){const e=rr,r=new ImageData(e,1),i=r.data;for(let a=0;a<e;++a){const o=a/(e-1),u=Te(this.getColorAt(o)),l=a*4;i[l]=Math.max(0,Math.min(255,Math.round(u.r??0))),i[l+1]=Math.max(0,Math.min(255,Math.round(u.g??0))),i[l+2]=Math.max(0,Math.min(255,Math.round(u.b??0))),i[l+3]=255}return r}}const Be=7,Ea=4096,Pa=2,je=100,Aa=1e4,Ga=5e6,_t=10,ar=.25,mt=3,Fa=3,Da=100;function Ua(t){const e=Math.max(1,Math.floor(t));return 2**Math.floor(Math.log2(e))}const or=new Float32Array(1),Na=new Uint32Array(or.buffer);function Oa(t){or[0]=t;const e=Na[0],r=e>>>16&32768,i=(e>>>23&255)-127,a=e&8388607;if(i>=16)return r|31744;if(i>=-14){const o=i+15;return r|o<<10|a>>>13}if(i>=-24){const o=-14-i;return r|(a|8388608)>>>13+o}return r}function nr(t){const e=new Uint16Array(t.length);for(let r=0;r<t.length;++r)e[r]=Oa(t[r]);return e}const $=class ${constructor(e,r){n(this,"snapshotCallback");n(this,"snapshotDestWidth");n(this,"canvas");n(this,"device");n(this,"queue");n(this,"adapter");n(this,"ctx");n(this,"format");n(this,"mandelbrotNavigator");n(this,"rawTexture");n(this,"rawArrayView");n(this,"rawLayerViews",[]);n(this,"rawBrushTexture");n(this,"rawBrushArrayView");n(this,"rawBrushLayerViews",[]);n(this,"resolvedTexture");n(this,"resolvedArrayView");n(this,"resolvedLayerViews",[]);n(this,"frozenTexture");n(this,"frozenArrayView");n(this,"frozenLayerViews",[]);n(this,"pipelineMerge");n(this,"bindGroupMerge");n(this,"uniformBufferMerge");n(this,"uniformBufferMandelbrot");n(this,"uniformBufferColor");n(this,"uniformBufferBrush");n(this,"uniformBufferResolve");n(this,"mandelbrotReferenceBuffer");n(this,"mandelbrotBlaBuffer");n(this,"mandelbrotBlaLevelBuffer");n(this,"mandelbrotBlaBufferCapacity",0);n(this,"mandelbrotBlaLevelBufferCapacity",0);n(this,"pipelineBrush");n(this,"bindGroupBrush");n(this,"pipelineMandelbrot");n(this,"bindGroupMandelbrot");n(this,"pipelineResolve");n(this,"bindGroupResolve");n(this,"pipelineColor");n(this,"bindGroupColor");n(this,"pipelineCount");n(this,"counterBuffer");n(this,"counterReadbackSlots",[]);n(this,"counterReadbackWriteIndex",0);n(this,"counterReadbackSequence",0);n(this,"latestAppliedCounterReadbackSequence",0);n(this,"counterReadbackGeneration",0);n(this,"renderFrameSerial",0);n(this,"lastCounterDispatchFrame",-mt);n(this,"counterBindGroup");n(this,"uniformBufferCount");n(this,"unfinishedPixelCount",-1);n(this,"activePixelCount",-1);n(this,"_rafId",null);n(this,"_drawFn",null);n(this,"fps",0);n(this,"isRendering",!1);n(this,"gpuFrameTimeMs",0);n(this,"smoothedGpuTimeMs",0);n(this,"pendingGpuTiming",!1);n(this,"refinementWasGated",!1);n(this,"_fpsFrameCount",0);n(this,"_fpsLastTime",0);n(this,"neutralSize",0);n(this,"shaderPassCompute");n(this,"shaderPassColor");n(this,"width",0);n(this,"height",0);n(this,"antialiasLevel");n(this,"palettePeriod");n(this,"previousMandelbrot");n(this,"previousRenderOptions");n(this,"needRender",!0);n(this,"orbitIncomplete",!1);n(this,"prevGuardedMaxIter",0);n(this,"currentGuardedMaxIter",0);n(this,"currentMaxIterations",0);n(this,"currentBlaLevelCount",0);n(this,"mandelbrotReference",new Float32Array(1e6));n(this,"approximationMode","perturbation");n(this,"blaEpsilon",1e-6);n(this,"prevFrameMandelbrot");n(this,"clearHistoryNextFrame",!1);n(this,"cumulativeShiftX",0);n(this,"cumulativeShiftY",0);n(this,"zoomMagnificationThreshold",16);n(this,"zoomFactor",1);n(this,"frozenScale",0);n(this,"liveScale",0);n(this,"liveZoomFactor",1);n(this,"zoomReprojectionActive",!1);n(this,"needFreezeSnapshot",!1);n(this,"needMergeSnapshot",!1);n(this,"mergeUniforms",{zf:1,lzf:1,frozenShiftU:0,frozenShiftV:0,aspect:1,angle:0});n(this,"frozenAligned",!1);n(this,"zoomingIn",!0);n(this,"iterationBatchSize",je);n(this,"tileTexture");n(this,"tileTextureView");n(this,"skyboxTexture");n(this,"skyboxTextureView");n(this,"tileTextureSourceKey");n(this,"skyboxTextureSourceKey");n(this,"paletteTexture");n(this,"paletteTextureView");n(this,"paletteSampler");n(this,"skyboxSampler");n(this,"webcamTexture");n(this,"webcamTileTexture");n(this,"webcamTextureView");n(this,"webcamEnabled",!0);n(this,"time",0);n(this,"lastUpdateTime",0);n(this,"dprMultiplier",1);n(this,"targetFps",60);n(this,"gpuLoadMultiplier",1);this.canvas=e,this.shaderPassCompute=pe,this.shaderPassColor=se,this.antialiasLevel=r.antialiasLevel,this.palettePeriod=r.palettePeriod,this.time=0}async initialize(e){if(this.mandelbrotNavigator=e,this.approximationMode=this.mandelbrotNavigator.get_approximation_mode()===1?"bla":"perturbation",this.blaEpsilon=this.mandelbrotNavigator.get_bla_epsilon(),!navigator.gpu)throw new Error("WebGPU non support\xE9");if(this.adapter=await navigator.gpu.requestAdapter(),!this.adapter)throw new Error("Adapter WebGPU introuvable");this.device=await this.adapter.requestDevice(),this.device.label="Engine Device",this.queue=this.device.queue,this.queue.label="Engine Queue",this.ctx=this.canvas.getContext("webgpu"),this.format=navigator.gpu.getPreferredCanvasFormat(),this.ctx.configure({device:this.device,format:this.format,alphaMode:"opaque"});const[r,i]=await Promise.all([$._tileTexture?Promise.resolve($._tileTexture):this._loadTexture(Wa),$._skyboxTexture?Promise.resolve($._skyboxTexture):this._loadTexture($a)]);$._tileTexture=r,this.tileTexture=r,this.tileTextureView=this.tileTexture.createView(),$._skyboxTexture=i,this.skyboxTexture=i,this.skyboxTextureView=this.skyboxTexture.createView();const a=new ir([]).generateTexture(),o=nr(a.data);this.paletteTexture=this.device.createTexture({size:[a.width,a.height,1],format:"rgba16float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine PaletteTexture"}),this.device.queue.writeTexture({texture:this.paletteTexture},o.buffer,{bytesPerRow:a.width*8},[a.width,a.height]),this.paletteTextureView=this.paletteTexture.createView(),this.paletteSampler=this.device.createSampler({magFilter:"linear",minFilter:"linear",addressModeU:"repeat",addressModeV:"clamp-to-edge"}),this.skyboxSampler=this.device.createSampler({magFilter:"linear",minFilter:"linear",addressModeU:"repeat",addressModeV:"repeat"}),this.webcamTexture=new sa(1920,1080),this.webcamTileTexture=this.device.createTexture({size:[1920,1080,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT}),this.webcamTextureView=this.webcamTileTexture.createView(),this.uniformBufferMandelbrot=this.device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Mandelbrot"}),this.uniformBufferColor=this.device.createBuffer({size:96,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Color"}),this.uniformBufferBrush=this.device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Brush"}),this.uniformBufferResolve=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Resolve"}),this.mandelbrotReferenceBuffer=this.device.createBuffer({size:4*1e6,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot Orbit ReferenceStorage Buffer"}),this.mandelbrotBlaBuffer=this.device.createBuffer({size:24,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot BLA Storage Buffer"}),this.mandelbrotBlaLevelBuffer=this.device.createBuffer({size:16,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot BLA Level Storage Buffer"}),this.mandelbrotBlaBufferCapacity=1,this.mandelbrotBlaLevelBufferCapacity=1,this.counterBuffer=this.device.createBuffer({size:8,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST,label:"Engine Counter Storage"}),this.counterReadbackSlots=Array.from({length:Fa},(u,l)=>({buffer:this.device.createBuffer({size:8,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,label:`Engine Counter Readback ${l}`}),pending:!1,sequence:0,generation:0})),this.uniformBufferCount=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Count"}),this.uniformBufferMerge=this.device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Merge"}),await this._createPipelines(),this.resize()}async _createPipelines(){const e=this.device.createShaderModule({code:be,label:"Engine ShaderModule Brush"}),r=this.device.createShaderModule({code:this.shaderPassCompute,label:"Engine ShaderModule Compute"}),i=this.device.createShaderModule({code:Tr,label:"Engine ShaderModule Resolve"}),a=this.device.createShaderModule({code:this.shaderPassColor,label:"Engine ShaderModule Color"}),o=this.device.createShaderModule({code:kr,label:"Engine ShaderModule Count"}),u=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Brush"}),l=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:3,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:4,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Mandelbrot"}),d=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Resolve"}),y=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:3,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:4,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:5,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:6,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:7,visibility:GPUShaderStage.FRAGMENT,sampler:{type:"filtering"}},{binding:8,visibility:GPUShaderStage.FRAGMENT,sampler:{type:"filtering"}}],label:"Engine BindGroupLayout Color"}),h=Array.from({length:Be},()=>({format:"r32float"}));this.pipelineBrush=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[u]}),vertex:{module:e,entryPoint:"vs_main"},fragment:{module:e,entryPoint:"fs_main",targets:h},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Brush"}),this.pipelineMandelbrot=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[l]}),vertex:{module:r,entryPoint:"vs_main"},fragment:{module:r,entryPoint:"fs_main",targets:h},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Mandelbrot"}),this.pipelineResolve=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[d]}),vertex:{module:i,entryPoint:"vs_main"},fragment:{module:i,entryPoint:"fs_main",targets:h},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Resolve"}),this.pipelineColor=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[y]}),vertex:{module:a,entryPoint:"vs_main"},fragment:{module:a,entryPoint:"fs_main",targets:[{format:this.format}]},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Color"});const p=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}],label:"Engine BindGroupLayout Count"});this.pipelineCount=this.device.createComputePipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[p]}),compute:{module:o,entryPoint:"count_unfinished"},label:"Engine ComputePipeline Count"});const z=this.device.createShaderModule({code:Br,label:"Engine ShaderModule Merge"}),B=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT|GPUShaderStage.VERTEX,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Merge"});this.pipelineMerge=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[B]}),vertex:{module:z,entryPoint:"vs_main"},fragment:{module:z,entryPoint:"fs_main",targets:h},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Merge"}),this.bindGroupBrush=void 0,this.bindGroupMandelbrot=void 0,this.bindGroupResolve=void 0,this.bindGroupColor=void 0,this.counterBindGroup=void 0,this.bindGroupMerge=void 0}rebuildMandelbrotBindGroup(){if(!this.pipelineMandelbrot||!this.rawBrushArrayView||!this.uniformBufferMandelbrot||!this.mandelbrotReferenceBuffer||!this.mandelbrotBlaBuffer||!this.mandelbrotBlaLevelBuffer)return;const e=this.pipelineMandelbrot.getBindGroupLayout(0);this.bindGroupMandelbrot=this.device.createBindGroup({layout:e,entries:[{binding:0,resource:{buffer:this.uniformBufferMandelbrot}},{binding:1,resource:{buffer:this.mandelbrotReferenceBuffer}},{binding:2,resource:{buffer:this.mandelbrotBlaBuffer}},{binding:3,resource:{buffer:this.mandelbrotBlaLevelBuffer}},{binding:4,resource:this.rawBrushArrayView}],label:"Engine BindGroup Mandelbrot"})}ensureBlaBufferCapacity(e){var i,a;const r=Math.max(1,Math.ceil(e));r<=this.mandelbrotBlaBufferCapacity||((a=(i=this.mandelbrotBlaBuffer)==null?void 0:i.destroy)==null||a.call(i),this.mandelbrotBlaBuffer=this.device.createBuffer({size:r*4*6,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot BLA Storage Buffer"}),this.mandelbrotBlaBufferCapacity=r,this.rebuildMandelbrotBindGroup())}ensureBlaLevelBufferCapacity(e){var i,a;const r=Math.max(1,Math.ceil(e));r<=this.mandelbrotBlaLevelBufferCapacity||((a=(i=this.mandelbrotBlaLevelBuffer)==null?void 0:i.destroy)==null||a.call(i),this.mandelbrotBlaLevelBuffer=this.device.createBuffer({size:r*4*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot BLA Level Storage Buffer"}),this.mandelbrotBlaLevelBufferCapacity=r,this.rebuildMandelbrotBindGroup())}invalidateCounterReadback(){this.unfinishedPixelCount=-1,this.activePixelCount=-1,this.counterReadbackGeneration++,this.lastCounterDispatchFrame=-mt}hasPendingCounterReadbackForCurrentGeneration(){return this.counterReadbackSlots.some(e=>e.pending&&e.generation===this.counterReadbackGeneration)}acquireCounterReadbackSlot(){const e=this.counterReadbackSlots.length;for(let r=0;r<e;r++){const i=(this.counterReadbackWriteIndex+r)%e,a=this.counterReadbackSlots[i];if(!a.pending)return this.counterReadbackWriteIndex=(i+1)%e,a}}scheduleCounterReadback(e,r,i){e.pending=!0,e.sequence=r,e.generation=i,(async()=>{let a=!1;try{await e.buffer.mapAsync(GPUMapMode.READ),a=!0;const o=new Uint32Array(e.buffer.getMappedRange()),u=o[0],l=o[1];this.applyCounterReadback(r,i,u,l)}catch{}finally{a&&e.buffer.unmap(),e.pending=!1}})()}applyCounterReadback(e,r,i,a){if(r!==this.counterReadbackGeneration||e<=this.latestAppliedCounterReadbackSequence)return;this.latestAppliedCounterReadbackSequence=e;const o=this.unfinishedPixelCount;this.unfinishedPixelCount=i,this.activePixelCount=a,o>_t&&i<=_t&&!this.zoomReprojectionActive&&(this.needFreezeSnapshot=!0)}scheduleGpuTiming(e){this.pendingGpuTiming||(this.pendingGpuTiming=!0,this.device.queue.onSubmittedWorkDone().then(()=>{this.pendingGpuTiming=!1,this.applyGpuFrameTiming(performance.now()-e)}).catch(()=>{this.pendingGpuTiming=!1}))}applyGpuFrameTiming(e){if(this.gpuFrameTimeMs=e,this.smoothedGpuTimeMs===0?this.smoothedGpuTimeMs=e:this.smoothedGpuTimeMs=this.smoothedGpuTimeMs*(1-ar)+e*ar,e<=0)return;const r=1e3/this.targetFps/e,i=this.iterationBatchSize*r;this.iterationBatchSize=Math.round(Math.min(Aa,Math.max(je,this.iterationBatchSize*.7+i*.3)))}resize(){var B,w,s,_,v,E,G,P,C,N;const e=(window.devicePixelRatio||1)*this.dprMultiplier,r=this.canvas.parentElement,i=(r==null?void 0:r.clientWidth)||1,a=(r==null?void 0:r.clientHeight)||1;this.width=Math.max(1,Math.round(i*e)),this.height=Math.max(1,Math.round(a*e));const o=((w=(B=this.device)==null?void 0:B.limits)==null?void 0:w.maxTextureDimension2D)??8192;this.width=Math.min(this.width,o),this.height=Math.min(this.height,o),this.canvas.width=this.width,this.canvas.height=this.height,this.canvas.style.width=i+"px",this.canvas.style.height=a+"px",this.ctx.configure({device:this.device,format:this.format,alphaMode:"opaque"}),this.neutralSize=Math.ceil(Math.sqrt(this.width*this.width+this.height*this.height));const u=this.neutralSize;(_=(s=this.rawTexture)==null?void 0:s.destroy)==null||_.call(s),(E=(v=this.rawBrushTexture)==null?void 0:v.destroy)==null||E.call(v),(P=(G=this.resolvedTexture)==null?void 0:G.destroy)==null||P.call(G),(N=(C=this.frozenTexture)==null?void 0:C.destroy)==null||N.call(C);const l=Be,d=R=>{const I=this.device.createTexture({size:{width:u,height:u,depthOrArrayLayers:l},format:"r32float",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST,label:R}),M=I.createView({dimension:"2d-array",baseArrayLayer:0,arrayLayerCount:l,label:R+" ArrayView"}),k=[];for(let L=0;L<l;L++)k.push(I.createView({dimension:"2d",baseArrayLayer:L,arrayLayerCount:1,label:R+` Layer${L}`}));return{texture:I,arrayView:M,layerViews:k}},y=d("Engine RawTexture (A)");this.rawTexture=y.texture,this.rawArrayView=y.arrayView,this.rawLayerViews=y.layerViews;const h=d("Engine RawBrushTexture (B)");this.rawBrushTexture=h.texture,this.rawBrushArrayView=h.arrayView,this.rawBrushLayerViews=h.layerViews;const p=d("Engine ResolvedTexture");this.resolvedTexture=p.texture,this.resolvedArrayView=p.arrayView,this.resolvedLayerViews=p.layerViews;const z=d("Engine FrozenTexture");if(this.frozenTexture=z.texture,this.frozenArrayView=z.arrayView,this.frozenLayerViews=z.layerViews,this.zoomReprojectionActive=!1,this.zoomFactor=1,this.liveZoomFactor=1,this.frozenScale=0,this.liveScale=0,this.pipelineBrush){const R=this.pipelineBrush.getBindGroupLayout(0);this.bindGroupBrush=this.device.createBindGroup({layout:R,entries:[{binding:0,resource:{buffer:this.uniformBufferBrush}},{binding:1,resource:this.rawArrayView}],label:"Engine BindGroup Brush"})}if(this.pipelineMandelbrot&&this.rebuildMandelbrotBindGroup(),this.pipelineResolve){const R=this.pipelineResolve.getBindGroupLayout(0);this.bindGroupResolve=this.device.createBindGroup({layout:R,entries:[{binding:0,resource:{buffer:this.uniformBufferResolve}},{binding:1,resource:this.rawArrayView}],label:"Engine BindGroup Resolve"})}if(this.pipelineColor){const R=this.pipelineColor.getBindGroupLayout(0),I=[{binding:0,resource:{buffer:this.uniformBufferColor}},{binding:1,resource:this.resolvedArrayView},{binding:2,resource:this.tileTextureView},{binding:3,resource:this.skyboxTextureView},{binding:4,resource:this.webcamTextureView},{binding:5,resource:this.paletteTextureView},{binding:6,resource:this.frozenArrayView},{binding:7,resource:this.paletteSampler},{binding:8,resource:this.skyboxSampler}];this.bindGroupColor=this.device.createBindGroup({layout:R,entries:I,label:"Engine BindGroup Color"})}if(this.pipelineCount&&this.counterBuffer&&this.uniformBufferCount){const R=this.pipelineCount.getBindGroupLayout(0);this.counterBindGroup=this.device.createBindGroup({layout:R,entries:[{binding:0,resource:this.rawArrayView},{binding:1,resource:{buffer:this.counterBuffer}},{binding:2,resource:{buffer:this.uniformBufferCount}}],label:"Engine BindGroup Count"})}if(this.pipelineMerge&&this.uniformBufferMerge){const R=this.pipelineMerge.getBindGroupLayout(0);this.bindGroupMerge=this.device.createBindGroup({layout:R,entries:[{binding:0,resource:{buffer:this.uniformBufferMerge}},{binding:1,resource:this.resolvedArrayView},{binding:2,resource:this.rawBrushArrayView}],label:"Engine BindGroup Merge"})}this.prevFrameMandelbrot=void 0,this.previousMandelbrot=void 0,this.previousRenderOptions=void 0,this.needRender=!0,this.invalidateCounterReadback()}areObjectsEqual(e,r){return e===void 0||r===void 0?!1:JSON.stringify(e)===JSON.stringify(r)}areColorStopsEqual(e,r){if(e.length!==r.length)return!1;for(const[i,a]of e.entries()){const o=r[i];if(!o||JSON.stringify(a)!==JSON.stringify(o))return!1}return!0}setApproximationMode(e){e!==this.approximationMode&&(e==="bla"?this.mandelbrotNavigator.use_bla():this.mandelbrotNavigator.use_perturbation(),this.approximationMode=e,this.currentBlaLevelCount=0,this.clearHistoryNextFrame=!0,this.needRender=!0,this.invalidateCounterReadback())}getApproximationMode(){return this.approximationMode}setBlaEpsilon(e){const r=Math.max(Number.MIN_VALUE,e);r!==this.blaEpsilon&&(this.mandelbrotNavigator.set_bla_epsilon(r),this.blaEpsilon=r,this.approximationMode==="bla"&&(this.currentBlaLevelCount=0,this.clearHistoryNextFrame=!0,this.needRender=!0,this.invalidateCounterReadback()))}async update(e,r){var I,M,k,L;const i=performance.now();this.lastUpdateTime===0&&(this.lastUpdateTime=i);const a=(i-this.lastUpdateTime)/1e3;this.time+=a,this.lastUpdateTime=i;const o=this.mandelbrotNavigator.get_approximation_mode()===1?"bla":"perturbation",u=this.mandelbrotNavigator.get_bla_epsilon();(o!==this.approximationMode||u!==this.blaEpsilon)&&(this.approximationMode=o,this.blaEpsilon=u,this.currentBlaLevelCount=0,this.clearHistoryNextFrame=!0,this.needRender=!0,this.invalidateCounterReadback());const l=!this.areObjectsEqual(e,this.previousMandelbrot),d=!this.areObjectsEqual(r,this.previousRenderOptions);this.needRender=this.needRender||l||d,l&&this.invalidateCounterReadback(),r.colorStops.some(b=>(b.webcam??0)>0)?(await this.updateWebcamTexture(),this.needRender=!0):(I=this.webcamTexture)==null||I.closeWebcam(),r.activateAnimate&&(this.needRender=!0);const y=this.width/Math.max(1,this.height);let h=((M=this.previousMandelbrot)==null?void 0:M.scale)||1/e.scale;h<1&&(h=1/h),h=Math.sqrt(h)-1;{const b=this.prevFrameMandelbrot&&this.prevFrameMandelbrot.scale!==e.scale;if(b&&!this.zoomReprojectionActive&&(this.zoomReprojectionActive=!0,this.frozenScale=this.prevFrameMandelbrot.scale,this.zoomingIn=e.scale<this.frozenScale,this.liveScale=this.zoomingIn?this.frozenScale/this.zoomMagnificationThreshold:this.frozenScale*this.zoomMagnificationThreshold,this.needFreezeSnapshot=!0,this.clearHistoryNextFrame=!0),this.zoomReprojectionActive&&this.frozenScale>0?(this.zoomFactor=this.frozenScale/e.scale,this.liveZoomFactor=this.liveScale/e.scale,(this.zoomingIn?this.zoomFactor>=this.zoomMagnificationThreshold:this.zoomFactor<=1/this.zoomMagnificationThreshold)&&(this.needFreezeSnapshot=!0,this.clearHistoryNextFrame=!0,this.frozenScale=this.liveScale,this.liveScale=this.zoomingIn?e.scale/this.zoomMagnificationThreshold:e.scale*this.zoomMagnificationThreshold,this.zoomFactor=this.frozenScale/e.scale,this.liveZoomFactor=this.liveScale/e.scale)):this.zoomReprojectionActive||(this.zoomFactor=1,this.liveZoomFactor=1,this.liveScale=0),this.zoomReprojectionActive&&!b&&this.prevFrameMandelbrot&&this.prevFrameMandelbrot.scale===e.scale){const F=this.width/Math.max(1,this.height);this.mergeUniforms={zf:this.zoomFactor,lzf:this.liveZoomFactor,frozenShiftU:this.frozenScale>0?this.cumulativeShiftX*(this.liveScale/this.frozenScale)/this.neutralSize:0,frozenShiftV:this.frozenScale>0?-this.cumulativeShiftY*(this.liveScale/this.frozenScale)/this.neutralSize:0,aspect:F,angle:e.angle},this.needMergeSnapshot=!0,this.zoomReprojectionActive=!1,this.zoomFactor=1,this.liveZoomFactor=1,this.liveScale=0,this.clearHistoryNextFrame=!0}}if(!this.areColorStopsEqual(r.colorStops,((k=this.previousRenderOptions)==null?void 0:k.colorStops)||[])||r.interpolationMode!==((L=this.previousRenderOptions)==null?void 0:L.interpolationMode)){const b=new ir(r.colorStops,r.interpolationMode).generateTexture(),F=nr(b.data);this.device.queue.writeTexture({texture:this.paletteTexture},F.buffer,{bytesPerRow:b.width*8},[b.width,b.height]),this.needRender=!0}const p=new Float32Array([r.palettePeriod,r.paletteOffset,h,this.time,y,e.angle,r.activateAnimate?1:0,e.mu,this.zoomFactor,this.zoomReprojectionActive||this.frozenAligned?1:0,this.liveZoomFactor,this.zoomReprojectionActive&&this.frozenScale>0?this.cumulativeShiftX*(this.liveScale/this.frozenScale)/this.neutralSize:0,this.zoomReprojectionActive&&this.frozenScale>0?-this.cumulativeShiftY*(this.liveScale/this.frozenScale)/this.neutralSize:0,r.tessellationLevel,r.displacementAmount,r.animationSpeed,e.epsilon,r.ambientOcclusionStrength,r.microBumpStrength,r.clearcoatStrength,r.subsurfaceStrength,r.reliefDepth,r.localShadowStrength]);if(this.device.queue.writeBuffer(this.uniformBufferColor,0,p.buffer),!this.needsMoreFrames())return;const z=Math.ceil(e.maxIterations);this.currentMaxIterations=z;const B=this.mandelbrotNavigator.compute_reference_orbit_chunk(Da,z),w=B.count,s=new Float32Array(Ie.buffer,B.ptr,B.count*4);B.offset<z&&this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer,0,s,0);const _=Math.max(0,w-1),v=Math.min(z,_);this.currentGuardedMaxIter=v,this.orbitIncomplete=_<z;const E=_>=z;let G=0,P=0;if(this.approximationMode==="bla"&&E){const b=this.mandelbrotNavigator.compute_bla_reference_ptr(v);if(this.ensureBlaBufferCapacity(b.count),this.ensureBlaLevelBufferCapacity(b.level_count),b.count>0){const F=new Float32Array(Ie.buffer,b.ptr,b.count*6);this.device.queue.writeBuffer(this.mandelbrotBlaBuffer,0,F,0)}if(b.level_count>0){const F=new Uint32Array(Ie.buffer,b.levels_ptr,b.level_count*4);this.device.queue.writeBuffer(this.mandelbrotBlaLevelBuffer,0,F,0)}G=1,P=b.level_count}this.currentBlaLevelCount=P;const C=this.zoomReprojectionActive&&this.liveScale>0?this.liveScale:e.scale,N=new Float32Array([e.dx,e.dy,e.mu,C,y,e.angle,this.iterationBatchSize,e.epsilon,r.antialiasLevel,0,v,E?1:0,G,P,this.blaEpsilon,0]);this.device.queue.writeBuffer(this.uniformBufferMandelbrot,0,N.buffer);const R=B.offset===0&&!!this.prevFrameMandelbrot;(!this.prevFrameMandelbrot||R)&&(this.clearHistoryNextFrame=!0,this.zoomReprojectionActive=!1,this.zoomFactor=1,this.liveZoomFactor=1,this.liveScale=0),this.prevFrameMandelbrot&&this.prevFrameMandelbrot.mu!==e.mu&&(this.clearHistoryNextFrame=!0,this.zoomReprojectionActive=!1,this.zoomFactor=1,this.liveZoomFactor=1,this.liveScale=0),!this.zoomReprojectionActive&&E&&this.prevGuardedMaxIter<z&&this.prevGuardedMaxIter>0&&(this.needFreezeSnapshot=!0,this.clearHistoryNextFrame=!0),this.prevGuardedMaxIter=v,this.previousMandelbrot=structuredClone(e),this.previousRenderOptions=structuredClone(r)}async render(){if(!this.needsMoreFrames()||!this.pipelineBrush||!this.pipelineMandelbrot||!this.pipelineResolve||!this.pipelineColor||!this.bindGroupBrush||!this.bindGroupMandelbrot||!this.bindGroupResolve||!this.bindGroupColor||!this.previousMandelbrot)return;const e=this.width/Math.max(1,this.height),r=Ua(Ea),i=r,a=this.clearHistoryNextFrame?1:0;this.clearHistoryNextFrame&&this.invalidateCounterReadback();const o=++this.renderFrameSerial;let u=0,l=0;if(!this.clearHistoryNextFrame&&this.prevFrameMandelbrot){const M=this.previousMandelbrot.dx-this.prevFrameMandelbrot.dx,k=this.previousMandelbrot.dy-this.prevFrameMandelbrot.dy,L=this.neutralSize,b=Math.sqrt(e*e+1),F=this.zoomReprojectionActive&&this.liveScale>0?this.liveScale:this.previousMandelbrot.scale;u=-(M*L)/(2*F*b),l=k*L/(2*F*b)}this.clearHistoryNextFrame?(this.cumulativeShiftX=0,this.cumulativeShiftY=0):(this.cumulativeShiftX+=Math.round(u),this.cumulativeShiftY+=Math.round(l),(Math.round(u)!==0||Math.round(l)!==0)&&(this.frozenAligned=!1));const d=(this.cumulativeShiftX%i+i)%i,y=(this.cumulativeShiftY%i+i)%i,h=this.hasPendingCounterReadbackForCurrentGeneration(),p=!h&&(this.clearHistoryNextFrame||this.activePixelCount<0||this.iterationBatchSize>je||this.activePixelCount<Ga*this.gpuLoadMultiplier);p&&this.refinementWasGated&&(this.iterationBatchSize=je),this.refinementWasGated=!p;const z=p?1:0,B=new Float32Array([e,this.previousMandelbrot.angle,a,r,i,u,l,this.previousMandelbrot.mu,d,y,this.zoomReprojectionActive?Pa:0,z]);this.device.queue.writeBuffer(this.uniformBufferBrush,0,B.buffer);const w=new Float32Array([this.previousMandelbrot.mu,d,y]);this.device.queue.writeBuffer(this.uniformBufferResolve,0,w.buffer);const s=!h&&(this.unfinishedPixelCount<0||this.activePixelCount<0||o-this.lastCounterDispatchFrame>=mt)?this.acquireCounterReadbackSlot():void 0;let _;const v=this.device.createCommandEncoder();if(this.needMergeSnapshot&&this.pipelineMerge&&this.bindGroupMerge&&this.resolvedTexture&&this.frozenTexture&&this.rawBrushTexture){const M=this.neutralSize;v.copyTextureToTexture({texture:this.frozenTexture},{texture:this.rawBrushTexture},{width:M,height:M,depthOrArrayLayers:Be});const k=new Float32Array([this.mergeUniforms.zf,this.mergeUniforms.lzf,this.mergeUniforms.frozenShiftU,this.mergeUniforms.frozenShiftV,this.mergeUniforms.aspect,this.mergeUniforms.angle]);this.device.queue.writeBuffer(this.uniformBufferMerge,0,k.buffer);const L=this.frozenLayerViews.map(F=>({view:F,clearValue:{r:0,g:0,b:0,a:0},loadOp:"clear",storeOp:"store"})),b=v.beginRenderPass({colorAttachments:L});b.setPipeline(this.pipelineMerge),b.setBindGroup(0,this.bindGroupMerge),b.draw(6,1,0,0),b.end(),this.needMergeSnapshot=!1,this.frozenAligned=!0}if(this.needFreezeSnapshot&&this.resolvedTexture&&this.frozenTexture){const M=Be,k=this.neutralSize;v.copyTextureToTexture({texture:this.resolvedTexture},{texture:this.frozenTexture},{width:k,height:k,depthOrArrayLayers:M}),this.needFreezeSnapshot=!1,this.frozenAligned=!0}const E=(M,k="clear")=>M.map(L=>({view:L,clearValue:{r:0,g:0,b:0,a:0},loadOp:k,storeOp:"store"})),G=v.beginRenderPass({colorAttachments:E(this.rawBrushLayerViews)});G.setPipeline(this.pipelineBrush),G.setBindGroup(0,this.bindGroupBrush),G.draw(6,1,0,0),G.end(),v.copyTextureToTexture({texture:this.rawBrushTexture},{texture:this.rawTexture},{width:this.neutralSize,height:this.neutralSize,depthOrArrayLayers:Be});const P=v.beginRenderPass({colorAttachments:E(this.rawLayerViews,"load")});if(P.setPipeline(this.pipelineMandelbrot),P.setBindGroup(0,this.bindGroupMandelbrot),P.draw(6,1,0,0),P.end(),this.pipelineCount&&this.counterBindGroup&&this.counterBuffer&&s&&this.uniformBufferCount){const M=++this.counterReadbackSequence,k=this.counterReadbackGeneration,L=this.previousMandelbrot.mu;this.device.queue.writeBuffer(this.uniformBufferCount,0,new Float32Array([L,e,this.previousMandelbrot.angle])),v.clearBuffer(this.counterBuffer,0,8);const b=v.beginComputePass();b.setPipeline(this.pipelineCount),b.setBindGroup(0,this.counterBindGroup),b.dispatchWorkgroups(Math.ceil(this.neutralSize/16),Math.ceil(this.neutralSize/16)),b.end(),v.copyBufferToBuffer(this.counterBuffer,0,s.buffer,0,8),this.lastCounterDispatchFrame=o,_={slot:s,sequence:M,generation:k}}v.copyTextureToTexture({texture:this.rawTexture},{texture:this.resolvedTexture},{width:this.neutralSize,height:this.neutralSize,depthOrArrayLayers:Be});const C=v.beginRenderPass({colorAttachments:E(this.resolvedLayerViews,"load")});C.setPipeline(this.pipelineResolve),C.setBindGroup(0,this.bindGroupResolve),C.draw(6,1,0,0),C.end();const N=this.ctx.getCurrentTexture().createView(),R=v.beginRenderPass({colorAttachments:[{view:N,clearValue:{r:1,g:1,b:1,a:1},loadOp:"clear",storeOp:"store"}]});R.setPipeline(this.pipelineColor),R.setBindGroup(0,this.bindGroupColor),R.draw(6,1,0,0),R.end();const I=performance.now();if(this.device.queue.submit([v.finish()]),this.scheduleGpuTiming(I),_&&this.scheduleCounterReadback(_.slot,_.sequence,_.generation),this.clearHistoryNextFrame=!1,this.prevFrameMandelbrot={...this.previousMandelbrot},this.needRender=!1,this.snapshotCallback){try{const M=this.snapshotDestWidth??256,k=Math.round(M*9/16),L=this.device.createTexture({size:[M,k,1],format:this.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});{const Y=this.device.createCommandEncoder(),Z=Y.beginRenderPass({colorAttachments:[{view:L.createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}]});Z.setPipeline(this.pipelineColor),Z.setBindGroup(0,this.bindGroupColor),Z.draw(6,1,0,0),Z.end(),this.device.queue.submit([Y.finish()])}const b=Y=>Y+255&-256,F=M*4,X=b(F),V=X*k,H=this.device.createBuffer({size:V,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});{const Y=this.device.createCommandEncoder();Y.copyTextureToBuffer({texture:L},{buffer:H,offset:0,bytesPerRow:X},{width:M,height:k,depthOrArrayLayers:1}),this.device.queue.submit([Y.finish()])}await this.device.queue.onSubmittedWorkDone(),await H.mapAsync(GPUMapMode.READ);const K=H.getMappedRange(),j=new Uint8ClampedArray(M*k*4),Q=new Uint8Array(K);for(let Y=0;Y<k;++Y)for(let Z=0;Z<M;++Z){const oe=Y*X+Z*4,J=(Y*M+Z)*4;j[J+0]=Q[oe+2],j[J+1]=Q[oe+1],j[J+2]=Q[oe+0],j[J+3]=Q[oe+3]}const re=document.createElement("canvas");re.width=M,re.height=k,re.getContext("2d").putImageData(new ImageData(j,M,k),0,0),H.unmap(),this.snapshotCallback(re.toDataURL("image/png"))}catch{this.snapshotCallback("")}this.snapshotCallback=void 0,this.snapshotDestWidth=void 0}}destroy(){var e,r,i,a,o,u,l,d,y,h,p,z,B,w,s,_,v,E,G,P,C,N,R,I,M,k,L,b,F,X,V,H,K,j,Q;this.stopRenderLoop(),(r=(e=this.rawTexture)==null?void 0:e.destroy)==null||r.call(e),(a=(i=this.rawBrushTexture)==null?void 0:i.destroy)==null||a.call(i),(u=(o=this.resolvedTexture)==null?void 0:o.destroy)==null||u.call(o),(d=(l=this.frozenTexture)==null?void 0:l.destroy)==null||d.call(l),(h=(y=this.mandelbrotReferenceBuffer)==null?void 0:y.destroy)==null||h.call(y),(z=(p=this.mandelbrotBlaBuffer)==null?void 0:p.destroy)==null||z.call(p),(w=(B=this.mandelbrotBlaLevelBuffer)==null?void 0:B.destroy)==null||w.call(B),(_=(s=this.uniformBufferMandelbrot)==null?void 0:s.destroy)==null||_.call(s),(E=(v=this.uniformBufferColor)==null?void 0:v.destroy)==null||E.call(v),(P=(G=this.uniformBufferBrush)==null?void 0:G.destroy)==null||P.call(G),(N=(C=this.uniformBufferResolve)==null?void 0:C.destroy)==null||N.call(C),(I=(R=this.counterBuffer)==null?void 0:R.destroy)==null||I.call(R);for(const re of this.counterReadbackSlots)(k=(M=re.buffer).destroy)==null||k.call(M);this.counterReadbackSlots=[],(b=(L=this.uniformBufferCount)==null?void 0:L.destroy)==null||b.call(L),(X=(F=this.uniformBufferMerge)==null?void 0:F.destroy)==null||X.call(F),(V=this.webcamTexture)==null||V.closeWebcam(),(K=(H=this.webcamTileTexture)==null?void 0:H.destroy)==null||K.call(H),(Q=(j=this.paletteTexture)==null?void 0:j.destroy)==null||Q.call(j)}needsMoreFrames(){let e="";return this.needRender?e="needRender":this.snapshotCallback?e="snapshot":this.zoomReprojectionActive?e="zoomActive":this.clearHistoryNextFrame?e="clearHistory":this.needFreezeSnapshot?e="freezeSnapshot":this.needMergeSnapshot?e="mergeSnapshot":this.orbitIncomplete?e="orbitIncomplete":(this.unfinishedPixelCount<0||this.unfinishedPixelCount>_t)&&(e=`unfinished=${this.unfinishedPixelCount}`),e!==""}getIterationBatchSize(){return this.iterationBatchSize}startRenderLoop(e){this._drawFn=e,this._rafId===null&&(this._rafId=requestAnimationFrame(async()=>this._loop()))}stopRenderLoop(){this._rafId!==null&&(cancelAnimationFrame(this._rafId),this._rafId=null),this._drawFn=null}async _loop(){if(this._drawFn){const e=this.needsMoreFrames();this.isRendering=e,await this._drawFn(),e&&this._fpsFrameCount++;const r=performance.now();this._fpsLastTime===0&&(this._fpsLastTime=r);const i=r-this._fpsLastTime;i>=1e3&&(this.fps=Math.round(this._fpsFrameCount*1e3/i),this._fpsFrameCount=0,this._fpsLastTime=r),this._rafId=requestAnimationFrame(async()=>this._loop())}else{this._rafId=null;return}}async updateTileTexture(e,r=e){var a,o;if(this.tileTextureSourceKey===r)return;const i=await this._loadTexture(e);(o=(a=this.tileTexture)==null?void 0:a.destroy)==null||o.call(a),this.tileTexture=i,this.tileTextureView=this.tileTexture.createView(),this.tileTextureSourceKey=r,this.rebuildColorBindGroup(),this.needRender=!0}isTileTextureSourceCurrent(e){return this.tileTextureSourceKey===e}async updateSkyboxTexture(e,r=e){var a,o;if(this.skyboxTextureSourceKey===r)return;const i=await this._loadTexture(e);(o=(a=this.skyboxTexture)==null?void 0:a.destroy)==null||o.call(a),this.skyboxTexture=i,this.skyboxTextureView=this.skyboxTexture.createView(),this.skyboxTextureSourceKey=r,this.rebuildColorBindGroup(),this.needRender=!0}isSkyboxTextureSourceCurrent(e){return this.skyboxTextureSourceKey===e}rebuildColorBindGroup(){if(this.pipelineColor&&this.resolvedArrayView&&this.frozenArrayView){const e=this.pipelineColor.getBindGroupLayout(0);this.bindGroupColor=this.device.createBindGroup({layout:e,entries:[{binding:0,resource:{buffer:this.uniformBufferColor}},{binding:1,resource:this.resolvedArrayView},{binding:2,resource:this.tileTextureView},{binding:3,resource:this.skyboxTextureView},{binding:4,resource:this.webcamTextureView},{binding:5,resource:this.paletteTextureView},{binding:6,resource:this.frozenArrayView},{binding:7,resource:this.paletteSampler},{binding:8,resource:this.skyboxSampler}],label:"Engine BindGroup Color"})}}async _loadTexture(e){const r=new Image;r.src=e;try{await r.decode()}catch(o){throw console.warn("\xC9chec du chargement de la texture : "+e,o),o}const i=await createImageBitmap(r),a=this.device.createTexture({size:[i.width,i.height,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine LoadedTexture "+e});return this.device.queue.copyExternalImageToTexture({source:i},{texture:a},[i.width,i.height]),a}async readIterationDataAt(e,r,i,a){var oe;if(!this.resolvedTexture||!this.device)return null;const o=this.width/Math.max(1,this.height),u=((oe=this.previousMandelbrot)==null?void 0:oe.angle)??0,l=e/Math.max(1,i),d=1-r/Math.max(1,a),y=l*2-1,h=d*2-1,p=y*o,z=h,B=Math.sin(u),w=Math.cos(u),s=w*p-B*z,_=B*p+w*z,v=Math.sqrt(o*o+1),E=s/v,G=_/v,P=E*.5+.5,C=G*.5+.5,N=this.neutralSize,R=Math.floor(Math.max(0,Math.min(N-1,P*N))),I=Math.floor(Math.max(0,Math.min(N-1,(1-C)*N))),M=$.ITER_PIXEL_LAYERS,k=1,L=4,b=(J=>J+255&-256)(k*L),F=b*M.length,X=this.device.createBuffer({size:F,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,label:"Engine IterPixel Readback"}),V=this.device.createCommandEncoder();for(let J=0;J<M.length;J++)V.copyTextureToBuffer({texture:this.resolvedTexture,origin:{x:R,y:I,z:M[J]}},{buffer:X,offset:b*J,bytesPerRow:b},{width:1,height:1,depthOrArrayLayers:1});this.device.queue.submit([V.finish()]),await X.mapAsync(GPUMapMode.READ);const H=new Float32Array(X.getMappedRange()),K=b/L,j=H[0*K],Q=H[1*K],re=H[2*K],Y=H[3*K],Z=H[4*K];return X.unmap(),X.destroy(),j<0?null:{iter:j,zx:Q,zy:re,derX:Y,derY:Z}}async updateWebcamTexture(){var e,r;await((e=this.webcamTexture)==null?void 0:e.openWebcam()),await((r=this.webcamTexture)==null?void 0:r.drawWebGPUTexture(this.webcamTileTexture,this.device))}async getSnapshotPng(e=256){return await new Promise(r=>{this.snapshotCallback=r,this.snapshotDestWidth=e,this.needRender=!0})}};n($,"_tileTexture"),n($,"_tileTextureView"),n($,"_skyboxTexture"),n($,"_skyboxTextureView"),n($,"_paletteTexture"),n($,"_paletteTextureView"),n($,"ITER_PIXEL_LAYERS",[0,2,3,4,5]);let vt=$,sr,lr,ur,cr,dr,fr,Ge,bt,hr,pr,gr;Mt=wt({__name:"Mandelbrot",props:Ze({mu:{default:4},epsilon:{default:1e-5},colorStops:{default:()=>[{color:"#002500",position:0},{color:"#175b3d",position:.16},{color:"#ffceb6",position:.26},{color:"#edffff",position:.42},{color:"#ff8fbc",position:.7016397849462366},{color:"#a6003e",position:.8575},{color:"#100000",position:1}]},palettePeriod:{default:100},paletteOffset:{default:0},antialiasLevel:{default:1},activateAnimate:{type:Boolean,default:!1},dprMultiplier:{default:.5},maxIterationMultiplier:{default:.1},targetFps:{default:60},gpuLoadMultiplier:{default:1},interpolationMode:{default:"lab"},tessellationLevel:{default:2},displacementAmount:{default:.01},animationSpeed:{default:1},ambientOcclusionStrength:{default:.5},microBumpStrength:{default:.25},clearcoatStrength:{default:.7},subsurfaceStrength:{default:0},reliefDepth:{default:.35},localShadowStrength:{default:.4}},{cx:{default:"-1.9771995110313272619112808106831597"},cxModifiers:{},cy:{default:"0.0"},cyModifiers:{},scale:{default:"2.5"},scaleModifiers:{},angle:{default:0},angleModifiers:{}}),emits:["update:cx","update:cy","update:scale","update:angle"],setup(t,{expose:e}){const r=zt(null);let i=null,a=null,o,u=!1;const l=ne(t,"cx"),d=ne(t,"cy"),y=ne(t,"scale"),h=ne(t,"angle");Xe(()=>[l.value,d.value,y.value,h.value],([s,_,v,E],[G,P,C,N])=>{u||o&&(!s||!_||!v||((s!==G||_!==P)&&o.origin(s,_),v!==C&&o.scale(v),E!==N&&o.angle(Number(E))))},{flush:"sync"});const p=t;Xe(()=>p.dprMultiplier,s=>{a&&(a.dprMultiplier=s,w())}),Xe(()=>p.targetFps,s=>{a&&(a.targetFps=s)}),Xe(()=>p.gpuLoadMultiplier,s=>{a&&(a.gpuLoadMultiplier=s)});async function z(){if(!a||!o)return;const s=o.step();if(!s)return;const[_,v]=s,[E,G,P,C]=o.get_params();u=!0,l.value=E,d.value=G,y.value=P,h.value=parseFloat(C),await ja(),u=!1;const N=Math.min(Math.max(100,1e3*p.maxIterationMultiplier*Math.log2(1/parseFloat(P))),1e5);await a.update({cx:E,cy:G,dx:parseFloat(_),dy:parseFloat(v),mu:p.mu,scale:parseFloat(P),angle:parseFloat(C),maxIterations:N,epsilon:p.epsilon},{antialiasLevel:p.antialiasLevel,palettePeriod:p.palettePeriod,paletteOffset:p.paletteOffset,colorStops:Xa(p.colorStops),interpolationMode:p.interpolationMode,activateAnimate:p.activateAnimate,tessellationLevel:p.tessellationLevel,displacementAmount:p.displacementAmount,animationSpeed:p.animationSpeed,ambientOcclusionStrength:p.ambientOcclusionStrength,microBumpStrength:p.microBumpStrength,clearcoatStrength:p.clearcoatStrength,subsurfaceStrength:p.subsurfaceStrength,reliefDepth:p.reliefDepth,localShadowStrength:p.localShadowStrength}),await a.render()}async function B(){if(r.value)return i=r.value,o=new Qe(l.value,d.value,y.value,Number(h.value)),o.origin(l.value,d.value),o.scale(y.value),o.angle(Number(h.value)),a=new vt(i,{antialiasLevel:p.antialiasLevel,palettePeriod:p.palettePeriod,paletteOffset:p.paletteOffset,colorStops:p.colorStops,interpolationMode:p.interpolationMode,activateAnimate:p.activateAnimate,tessellationLevel:p.tessellationLevel,displacementAmount:p.displacementAmount,animationSpeed:p.animationSpeed,ambientOcclusionStrength:p.ambientOcclusionStrength,microBumpStrength:p.microBumpStrength,clearcoatStrength:p.clearcoatStrength,subsurfaceStrength:p.subsurfaceStrength,reliefDepth:p.reliefDepth,localShadowStrength:p.localShadowStrength}),a.initialize(o)}async function w(){if(!r.value||!a)return;const s=r.value.getBoundingClientRect();r.value.width=s.width,r.value.height=s.height,a.resize()}return wr(async()=>{await B(),window.addEventListener("resize",w),await w(),a&&a.startRenderLoop(z)}),zr(()=>{a==null||a.stopRenderLoop(),window.removeEventListener("resize",w)}),e({getCanvas:()=>r.value,getEngine:()=>a,getNavigator:()=>o,translate:(s,_)=>o==null?void 0:o.translate(s,_),translateDirect:(s,_)=>o==null?void 0:o.translate_direct(s,_),rotate:s=>o==null?void 0:o.rotate(s),angle:s=>o==null?void 0:o.angle(s),zoom:s=>o==null?void 0:o.zoom(s),step:()=>o==null?void 0:o.step(),getParams:()=>o==null?void 0:o.get_params(),drawOnce:async()=>z(),resize:async()=>w(),initialize:async()=>B(),useBla:()=>a==null?void 0:a.setApproximationMode("bla"),usePerturbation:()=>a==null?void 0:a.setApproximationMode("perturbation"),setApproximationMode:s=>a==null?void 0:a.setApproximationMode(s),getApproximationMode:()=>a==null?void 0:a.getApproximationMode(),setBlaEpsilon:s=>a==null?void 0:a.setBlaEpsilon(s)}),(s,_)=>(Fe(),De("canvas",{ref_key:"canvasRef",ref:r},null,512))}}),sr={class:"mobile-nav-controls"},lr={key:0,class:"directional-controls"},ur={width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",style:{"vertical-align":"middle","margin-right":"4px"}},cr=wt({__name:"MobileNavigationControls",props:Ze({mandelbrotRef:{}},{expanded:{type:Boolean,default:!1},expandedModifiers:{}}),emits:["update:expanded"],setup(t){const e=t,r=ne(t,"expanded"),i=zt(null);let a=null;const o=()=>{r.value=!r.value,r.value||l()},u=w=>{w.preventDefault(),w.stopPropagation(),o()},l=()=>{i.value=null,a!==null&&(clearInterval(a),a=null)},d=w=>{i.value=w;const s=.01,_=()=>{if(e.mandelbrotRef)switch(w){case"north":e.mandelbrotRef.translate(0,s);break;case"south":e.mandelbrotRef.translate(0,-s);break;case"west":e.mandelbrotRef.translate(-s,0);break;case"east":e.mandelbrotRef.translate(s,0);break}};_(),a=window.setInterval(_,16)},y=w=>{i.value=`rotate-${w}`;const s=.025,_=()=>{e.mandelbrotRef&&(w==="left"?e.mandelbrotRef.rotate(s):e.mandelbrotRef.rotate(-s))};_(),a=window.setInterval(_,16)},h=w=>{i.value=`zoom-${w}`;const s=.97,_=()=>{e.mandelbrotRef&&(w==="in"?e.mandelbrotRef.zoom(s):e.mandelbrotRef.zoom(1/s))};_(),a=window.setInterval(_,16)},p=(w,s)=>{w.preventDefault(),s()},z=w=>{w.preventDefault(),l()};function B(w){w.preventDefault(),w.stopPropagation(),window.location.href=new URL("./presentation/",window.location.href).href}return(w,s)=>(Fe(),De("div",sr,[T("button",{class:de(["nav-button compass-button",{active:r.value}]),onClick:o,onTouchend:u,"aria-label":"Toggle navigation"},[...s[16]||(s[16]=[Za('<svg width="32" height="32" viewBox="0 0 24 24" fill="none" class="nav-icon" data-v-1e35ba8c><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" data-v-1e35ba8c></circle><path d="M12 2 L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-1e35ba8c></path><path d="M12 18 L12 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-1e35ba8c></path><path d="M2 12 L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-1e35ba8c></path><path d="M18 12 L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-1e35ba8c></path><path d="M12 7 L10 12 L12 14 L14 12 Z" fill="currentColor" data-v-1e35ba8c></path><text x="12" y="6" text-anchor="middle" font-size="6" fill="currentColor" font-weight="bold" data-v-1e35ba8c>N</text></svg>',1)])],34),St(Ka,{name:"fade"},{default:Ja(()=>[r.value?(Fe(),De("div",lr,[T("button",{class:de(["nav-button direction-button north",{active:i.value==="north"}]),onTouchstart:s[0]||(s[0]=_=>p(_,()=>d("north"))),onTouchend:z,onMousedown:s[1]||(s[1]=_=>d("north")),onMouseup:l,onMouseleave:l,"aria-label":"Move North"},[...s[17]||(s[17]=[T("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("path",{d:"M12 5 L18 11 L15 11 L15 19 L9 19 L9 11 L6 11 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),T("button",{class:de(["nav-button direction-button south",{active:i.value==="south"}]),onTouchstart:s[2]||(s[2]=_=>p(_,()=>d("south"))),onTouchend:z,onMousedown:s[3]||(s[3]=_=>d("south")),onMouseup:l,onMouseleave:l,"aria-label":"Move South"},[...s[18]||(s[18]=[T("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("path",{d:"M12 19 L6 13 L9 13 L9 5 L15 5 L15 13 L18 13 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),T("button",{class:de(["nav-button direction-button west",{active:i.value==="west"}]),onTouchstart:s[4]||(s[4]=_=>p(_,()=>d("west"))),onTouchend:z,onMousedown:s[5]||(s[5]=_=>d("west")),onMouseup:l,onMouseleave:l,"aria-label":"Move West"},[...s[19]||(s[19]=[T("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("path",{d:"M5 12 L11 18 L11 15 L19 15 L19 9 L11 9 L11 6 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),T("button",{class:de(["nav-button direction-button east",{active:i.value==="east"}]),onTouchstart:s[6]||(s[6]=_=>p(_,()=>d("east"))),onTouchend:z,onMousedown:s[7]||(s[7]=_=>d("east")),onMouseup:l,onMouseleave:l,"aria-label":"Move East"},[...s[20]||(s[20]=[T("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("path",{d:"M19 12 L13 6 L13 9 L5 9 L5 15 L13 15 L13 18 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),T("button",{class:de(["nav-button corner-button rotate-left",{active:i.value==="rotate-left"}]),onTouchstart:s[8]||(s[8]=_=>p(_,()=>y("left"))),onTouchend:z,onMousedown:s[9]||(s[9]=_=>y("left")),onMouseup:l,onMouseleave:l,"aria-label":"Rotate Left"},[...s[21]||(s[21]=[T("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("path",{d:"M16 8 A6 6 0 1 0 8 16",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round"}),T("path",{d:"M5 16 L8 16 L8 13",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round","stroke-linejoin":"round"})],-1)])],34),T("button",{class:de(["nav-button corner-button rotate-right",{active:i.value==="rotate-right"}]),onTouchstart:s[10]||(s[10]=_=>p(_,()=>y("right"))),onTouchend:z,onMousedown:s[11]||(s[11]=_=>y("right")),onMouseup:l,onMouseleave:l,"aria-label":"Rotate Right"},[...s[22]||(s[22]=[T("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("path",{d:"M8 8 A6 6 0 1 1 16 16",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round"}),T("path",{d:"M19 16 L16 16 L16 13",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round","stroke-linejoin":"round"})],-1)])],34),T("button",{class:de(["nav-button corner-button zoom-out",{active:i.value==="zoom-out"}]),onTouchstart:s[12]||(s[12]=_=>p(_,()=>h("out"))),onTouchend:z,onMousedown:s[13]||(s[13]=_=>h("out")),onMouseup:l,onMouseleave:l,"aria-label":"Zoom Out"},[...s[23]||(s[23]=[T("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("circle",{cx:"11",cy:"11",r:"7",stroke:"currentColor","stroke-width":"2"}),T("path",{d:"M18 18 L22 22",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"}),T("path",{d:"M8 11 L14 11",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"})],-1)])],34),T("button",{class:de(["nav-button corner-button zoom-in",{active:i.value==="zoom-in"}]),onTouchstart:s[14]||(s[14]=_=>p(_,()=>h("in"))),onTouchend:z,onMousedown:s[15]||(s[15]=_=>h("in")),onMouseup:l,onMouseleave:l,"aria-label":"Zoom In"},[...s[24]||(s[24]=[T("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("circle",{cx:"11",cy:"11",r:"7",stroke:"currentColor","stroke-width":"2"}),T("path",{d:"M18 18 L22 22",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"}),T("path",{d:"M11 8 L11 14",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"}),T("path",{d:"M8 11 L14 11",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"})],-1)])],34),T("button",{class:"presentation-button",onTouchend:eo(B,["prevent","stop"]),onClick:B,"aria-label":"Pr\xE9sentation"},[(Fe(),De("svg",ur,[...s[25]||(s[25]=[T("rect",{x:"2",y:"3",width:"20",height:"14",rx:"2",ry:"2"},null,-1),T("line",{x1:"8",y1:"21",x2:"16",y2:"21"},null,-1),T("line",{x1:"12",y1:"17",x2:"12",y2:"21"},null,-1)])])),s[26]||(s[26]=Qa(" Pr\xE9sentation ",-1))],32)])):to("",!0)]),_:1})]))}}),dr=Sr(cr,[["__scopeId","data-v-1e35ba8c"]]),fr={style:{position:"relative",width:"100%",height:"100%"}},Ge=.01,bt=.025,hr=300,pr=30,gr=wt({__name:"MandelbrotController",props:Ze({mu:{},epsilon:{},colorStops:{},antialiasLevel:{},palettePeriod:{},paletteOffset:{},activateAnimate:{type:Boolean},dprMultiplier:{},maxIterationMultiplier:{},targetFps:{},gpuLoadMultiplier:{},interpolationMode:{},pickerMode:{type:Boolean},tessellationLevel:{},displacementAmount:{},animationSpeed:{},ambientOcclusionStrength:{},microBumpStrength:{},clearcoatStrength:{},subsurfaceStrength:{},reliefDepth:{},localShadowStrength:{}},{cx:{},cxModifiers:{},cy:{},cyModifiers:{},scale:{},scaleModifiers:{},angle:{},angleModifiers:{},mobileNavExpanded:{type:Boolean,default:!1},mobileNavExpandedModifiers:{}}),emits:Ze(["cursorCoord","palettePick"],["update:cx","update:cy","update:scale","update:angle","update:mobileNavExpanded"]),setup(t,{expose:e,emit:r}){const i=ne(t,"cx"),a=ne(t,"cy"),o=ne(t,"scale"),u=ne(t,"angle"),l=ne(t,"mobileNavExpanded"),d=t,y=r,h=zt(null);let p=!1,z=0,B=0;function w(){var U;if(!p)return;const c=V();if(!c)return;const m=c.getBoundingClientRect(),x=z-m.left,S=B-m.top,A=(U=h.value)==null?void 0:U.getNavigator();if(!A)return;const D=A.pixel_to_complex(x,S,m.width,m.height);!D||D.length<2||y("cursorCoord",{re:D[0],im:D[1]},z,B)}function s(c){p=!0,z=c.clientX,B=c.clientY}function _(){p=!1,y("cursorCoord",null,0,0)}const v={};e({getCanvas:V,getEngine:()=>{var c;return((c=h.value)==null?void 0:c.getEngine())??null}});let E=!1,G=!1,P=0,C=0,N=0,R=0,I=0,M=!1,k=0,L=null,b=0,F=0,X=0;function V(){var c;return((c=h.value)==null?void 0:c.getCanvas())??null}function H(c){const m=V();if(!m)return{x:0,y:0,width:0,height:0};const x=m.getBoundingClientRect();return{x:c.clientX-x.left,y:c.clientY-x.top,width:x.width,height:x.height}}function K(c){var x,S,A;const m=(S=(x=c.target)==null?void 0:x.tagName)==null?void 0:S.toLowerCase();m==="input"||m==="textarea"||m==="select"||(A=c.target)!=null&&A.isContentEditable||(v[c.code]=!0)}function j(c){v[c.code]=!1}function Q(c){var x,S;if(d.pickerMode){c.preventDefault();return}c.preventDefault();const m=.95;c.deltaY<0?(x=h.value)==null||x.zoom(m):(S=h.value)==null||S.zoom(1/m),w()}function re(c,m){var Le;const x=V();if(!x)return;const S=x.getBoundingClientRect(),A=c-S.left,D=m-S.top,U=S.width,q=S.height,ee=U/q,ue=(A-U/2)/U*2,ce=(D-q/2)/q*2;(Le=h.value)==null||Le.translateDirect(ue*ee,-ce)}function Y(c){if(d.pickerMode){c.preventDefault();return}c.preventDefault(),re(c.clientX,c.clientY)}function Z(c){if(d.pickerMode||c.touches.length!==0)return;const m=Date.now(),x=c.changedTouches[0];if(!x)return;const S=x.clientX,A=x.clientY;m-b<hr&&Math.hypot(S-F,A-X)<pr?(c.preventDefault(),re(S,A),b=0):(b=m,F=S,X=A)}function oe(c){if(d.pickerMode){c.preventDefault(),J(c);return}if(c.button===2)G=!0;else{E=!0;const m=H(c);P=m.x,C=m.y}}async function J(c){var q;const m=(q=h.value)==null?void 0:q.getEngine();if(!m)return;const x=V();if(!x)return;const S=x.getBoundingClientRect(),A=c.clientX-S.left,D=c.clientY-S.top,U=await m.readIterationDataAt(A,D,S.width,S.height);U&&y("palettePick",U,c.clientX,c.clientY)}function _r(c){var q,ee;if(z=c.clientX,B=c.clientY,w(),d.pickerMode)return;const m=H(c);if(G){const ue=V();if(!ue)return;const ce=ue.getBoundingClientRect(),Le=ce.width/2,xt=ce.height/2,yt=m.x,Ia=m.y,Va=Math.atan2(Ia-xt,yt-Le);(q=h.value)==null||q.angle(Va);return}if(!E)return;const x=m.width,S=m.height,A=x/S,D=(m.x-P)/x*2,U=(m.y-C)/S*2;(ee=h.value)==null||ee.translateDirect(-D*A,U),P=m.x,C=m.y}function mr(c){d.pickerMode||(c.button===2?G=!1:E=!1)}function vr(c){var x;if(d.pickerMode)return;const m=V();if(m){if(c.touches.length===1){E=!0;const S=c.touches[0],A=m.getBoundingClientRect();P=S.clientX-A.left,C=S.clientY-A.top}else if(c.touches.length===2){E=!1,M=!0;const[S,A]=c.touches;N=Math.hypot(A.clientX-S.clientX,A.clientY-S.clientY),k=N,R=Math.atan2(A.clientY-S.clientY,A.clientX-S.clientX);const D=(x=h.value)==null?void 0:x.getParams();I=D?parseFloat(D[3]):0}}}function br(c){var x,S,A;if(d.pickerMode)return;const m=V();if(m){if(E&&c.touches.length===1){const D=c.touches[0],U=m.getBoundingClientRect(),q=D.clientX-U.left,ee=D.clientY-U.top,ue=U.width,ce=U.height,Le=ue/ce,xt=(q-P)/ue*2,yt=(ee-C)/ce*2;(x=h.value)==null||x.translateDirect(-xt*Le,yt),P=q,C=ee}else if(M&&c.touches.length===2){const[D,U]=c.touches,q=Math.hypot(U.clientX-D.clientX,U.clientY-D.clientY),ee=Math.atan2(U.clientY-D.clientY,U.clientX-D.clientX),ue=k/q;k=q,(S=h.value)==null||S.zoom(ue);const ce=ee-R;(A=h.value)==null||A.angle(I+ce)}}}function xr(c){c.touches.length===0&&(E=!1,M=!1)}function yr(){var c,m,x,S,A,D,U,q;if(!d.pickerMode){v.KeyW&&((c=h.value)==null||c.translate(0,Ge)),v.KeyS&&((m=h.value)==null||m.translate(0,-Ge)),v.KeyA&&((x=h.value)==null||x.translate(-Ge,0)),v.KeyD&&((S=h.value)==null||S.translate(Ge,0)),v.KeyQ&&((A=h.value)==null||A.rotate(bt)),v.KeyE&&((D=h.value)==null||D.rotate(-bt));const ee=.97;v.KeyR&&((U=h.value)==null||U.zoom(ee)),v.KeyF&&((q=h.value)==null||q.zoom(1/ee))}w(),L=window.setTimeout(yr,16)}return wr(async()=>{const c=V();c&&(window.addEventListener("keydown",K),window.addEventListener("keyup",j),c.addEventListener("wheel",Q,{passive:!1}),c.addEventListener("mousedown",oe),c.addEventListener("dblclick",Y),c.addEventListener("contextmenu",m=>m.preventDefault()),c.addEventListener("mouseenter",s),c.addEventListener("mouseleave",_),window.addEventListener("mousemove",_r),window.addEventListener("mouseup",mr),c.addEventListener("touchstart",vr,{passive:!1}),c.addEventListener("touchmove",br,{passive:!1}),c.addEventListener("touchend",xr,{passive:!1}),c.addEventListener("touchend",Z,{passive:!1}),yr())}),zr(()=>{L!==null&&clearTimeout(L);const c=V();window.removeEventListener("keydown",K),window.removeEventListener("keyup",j),window.removeEventListener("mousemove",_r),window.removeEventListener("mouseup",mr),c&&(c.removeEventListener("wheel",Q),c.removeEventListener("mousedown",oe),c.removeEventListener("dblclick",Y),c.removeEventListener("contextmenu",m=>m.preventDefault()),c.removeEventListener("mouseenter",s),c.removeEventListener("mouseleave",_),c.removeEventListener("touchstart",vr),c.removeEventListener("touchmove",br),c.removeEventListener("touchend",xr),c.removeEventListener("touchend",Z))}),(c,m)=>(Fe(),De("div",fr,[St(Mt,{ref_key:"mandelbrotRef",ref:h,scale:o.value,"onUpdate:scale":m[0]||(m[0]=x=>o.value=x),angle:u.value,"onUpdate:angle":m[1]||(m[1]=x=>u.value=x),cx:i.value,"onUpdate:cx":m[2]||(m[2]=x=>i.value=x),cy:a.value,"onUpdate:cy":m[3]||(m[3]=x=>a.value=x),mu:d.mu,epsilon:d.epsilon,antialiasLevel:d.antialiasLevel,palettePeriod:d.palettePeriod,colorStops:d.colorStops,activateAnimate:d.activateAnimate,paletteOffset:d.paletteOffset,dprMultiplier:d.dprMultiplier,maxIterationMultiplier:d.maxIterationMultiplier,targetFps:d.targetFps,gpuLoadMultiplier:d.gpuLoadMultiplier,interpolationMode:d.interpolationMode,tessellationLevel:d.tessellationLevel,displacementAmount:d.displacementAmount,animationSpeed:d.animationSpeed,ambientOcclusionStrength:d.ambientOcclusionStrength,microBumpStrength:d.microBumpStrength,clearcoatStrength:d.clearcoatStrength,subsurfaceStrength:d.subsurfaceStrength,reliefDepth:d.reliefDepth,localShadowStrength:d.localShadowStrength},null,8,["scale","angle","cx","cy","mu","epsilon","antialiasLevel","palettePeriod","colorStops","activateAnimate","paletteOffset","dprMultiplier","maxIterationMultiplier","targetFps","gpuLoadMultiplier","interpolationMode","tessellationLevel","displacementAmount","animationSpeed","ambientOcclusionStrength","microBumpStrength","clearcoatStrength","subsurfaceStrength","reliefDepth","localShadowStrength"]),St(dr,{"mandelbrot-ref":h.value,expanded:l.value,"onUpdate:expanded":m[4]||(m[4]=x=>l.value=x)},null,8,["mandelbrot-ref","expanded"])]))}}),Mr=Sr(gr,[["__scopeId","data-v-96901d54"]])})();export{Mr as M,Mt as _,ro as __tla};
