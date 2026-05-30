var Ya=Object.defineProperty;var $a=(_e,se,ye)=>se in _e?Ya(_e,se,{enumerable:!0,configurable:!0,writable:!0,value:ye}):_e[se]=ye;var n=(_e,se,ye)=>$a(_e,typeof se!="symbol"?se+"":se,ye);import{aq as ja,ar as Xa,as as Za,d as Mt,at as ne,z as Ke,p as xr,s as yr,o as Ge,c as Ie,au as Oe,y as Tt,U as Ka,av as Ja,j as T,an as Qa,n as fe,J as Ct,T as eo,w as to,a as ro,a2 as io,e as ao,_ as wr}from"./framework.FUyJgNhI.js";let zr,Bt,oo=(async()=>{const _e=`// Mandelbrot progressive-iteration shader.
//
// Layer layout (r32float texture_2d_array, 8 layers):
//   0 : sentinel / iteration count (integer part).
//       Negative  => sentinel (brush/resolve system).  -1 = compute request.
//       0         => inside the set (confirmed), or budget fully exhausted at globalMaxIter.
//       > 0       => escaped (|z|\xB2 >= 4) or budget-exhausted mid-progress (|z|\xB2 < 4).
//   1 : resolution step (1.0 = genuine pixel, >= 2 = resolve-copied from grid step)
//   2 : z.x   (real part of current z, for resuming / coloring)
//   3 : z.y   (imag part of current z, for resuming / coloring)
//   4 : dz.x  (real part of derivative, for resuming / shading)
//   5 : dz.y  (imag part of derivative, for resuming / shading)
//   6 : ref_i + fractional stripe phase (reference orbit index for resuming perturbation)
//   7 : packed average orbit direction, 12 bits per component
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
  stripeFrequency: f32,
  trackOrbitMetrics: f32,
  _padding1: f32,
  _padding2: f32,
  _padding3: f32,
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
  if (*ref_i <= 0) {
    return 0;
  }
  while (level >= 0) {
    let levelInfo = mandelbrotBlaLevels[level];
    let skip = i32(levelInfo.skip);
    let shiftedRef = *ref_i - 1;
    if ((shiftedRef % skip) == 0 && *ref_i + skip <= max_iter) {
      let slot = shiftedRef / skip;
      if (u32(slot) < levelInfo.count) {
        let entryIndex = i32(levelInfo.offset) + slot;
        let bla = mandelbrotBlaSuite[entryIndex];
        let a = vec2<f32>(bla.ax, bla.ay);
        let b = vec2<f32>(bla.bx, bla.by);
        let radius = max(0.0, bla.radius_alpha - bla.radius_beta * dcMag);
        // BLA radii are input-domain bounds: they describe when the block's
        // linearized map is valid for the current perturbation before the skip.
        if (dot(*dz, *dz) <= radius * radius) {
          let candidate = cmul(a, *dz) + cmul(b, dc);
          *dz = candidate;
          *der = cmul(a, *der) + b;
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

// \u2500\u2500 output struct (8 render targets) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
struct FragOut {
  @location(0) iter:      vec4<f32>,  // .r = integer iteration count (or sentinel)
  @location(1) genuine:   vec4<f32>,  // .r = resolution step (1 = genuine, >= 2 = copied)
  @location(2) zx:        vec4<f32>,  // .r = z.x
  @location(3) zy:        vec4<f32>,  // .r = z.y
  @location(4) dzx:       vec4<f32>,  // .r = derivative x
  @location(5) dzy:       vec4<f32>,  // .r = derivative y
  @location(6) ref_i:     vec4<f32>,  // .r = integer ref_i + fractional stripe phase
  @location(7) avgDirection: vec4<f32>,  // .r = packed average orbit direction
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
  out.avgDirection = pack(0.0);
  return out;
}

const ORBIT_METRIC_EMA_ALPHA: f32 = 0.18;
const ORBIT_DIRECTION_SCALE: f32 = 4095.0;
const ORBIT_DIRECTION_BASE: f32 = 4096.0;

fn stripe_phase_from_ema(stripeEma: f32) -> f32 {
  return clamp(0.5 + 0.5 * stripeEma, 0.0, 0.999999);
}

fn ref_i_with_stripe(refValue: f32, stripeEma: f32) -> f32 {
  return floor(max(refValue, 0.0)) + stripe_phase_from_ema(stripeEma);
}

fn decode_ref_i(refWithStripe: f32) -> i32 {
  return i32(floor(max(refWithStripe, 0.0)));
}

fn decode_stripe_ema(refWithStripe: f32, totalIter: f32) -> f32 {
  if (totalIter <= 0.0) {
    return 0.0;
  }
  return fract(refWithStripe) * 2.0 - 1.0;
}

fn orbit_direction_sample(z: vec2<f32>) -> vec2<f32> {
  let zLen = length(z);
  return select(vec2<f32>(0.0), z / zLen, zLen > 1e-8);
}

fn encode_avg_dir(avgDir: vec2<f32>) -> f32 {
  let phase = clamp(avgDir * 0.5 + vec2<f32>(0.5), vec2<f32>(0.0), vec2<f32>(1.0));
  let xq = floor(phase.x * ORBIT_DIRECTION_SCALE + 0.5);
  let yq = floor(phase.y * ORBIT_DIRECTION_SCALE + 0.5);
  return xq * ORBIT_DIRECTION_BASE + yq;
}

fn decode_avg_dir(encoded: f32, totalIter: f32) -> vec2<f32> {
  if (totalIter <= 0.0) {
    return vec2<f32>(0.0);
  }
  let xq = floor(encoded / ORBIT_DIRECTION_BASE);
  let yq = encoded - xq * ORBIT_DIRECTION_BASE;
  return vec2<f32>(
    (xq / ORBIT_DIRECTION_SCALE - 0.5) * 2.0,
    (yq / ORBIT_DIRECTION_SCALE - 0.5) * 2.0,
  );
}

fn update_orbit_ema(previous: f32, sample: f32, count: f32) -> f32 {
  let decay = pow(1.0 - ORBIT_METRIC_EMA_ALPHA, max(count, 1.0));
  return sample + (previous - sample) * decay;
}

fn update_orbit_ema_unit(previous: f32, sample: f32) -> f32 {
  return sample + (previous - sample) * (1.0 - ORBIT_METRIC_EMA_ALPHA);
}

fn update_orbit_mean_vec2(previous: vec2<f32>, sample: vec2<f32>, previousCount: f32, sampleCount: f32) -> vec2<f32> {
  let safePreviousCount = max(previousCount, 0.0);
  let safeSampleCount = max(sampleCount, 1.0);
  let totalCount = safePreviousCount + safeSampleCount;
  return (previous * safePreviousCount + sample * safeSampleCount) / max(totalCount, 1.0);
}

fn stripe_metric_sample(z: vec2<f32>) -> f32 {
  return sin(max(mandelbrot.stripeFrequency, 0.0) * atan2(z.y, z.x));
}

fn escape_fraction(z: vec2<f32>, muLimit: f32) -> f32 {
  let zSq = max(dot(z, z), 1e-12);
  return clamp(1.0 - log(log(zSq) / log(muLimit)) / log(2.0), 0.0, 1.0);
}

// \u2500\u2500 core computation \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn mandelbrot_compute(x0: f32, y0: f32, prev_iter: f32, prev_zx: f32, prev_zy: f32, prev_dzx: f32, prev_dzy: f32, prev_ref_i: f32, prev_avg_direction: f32) -> FragOut {
  let dc = vec2<f32>(x0, y0);
  let max_iteration = mandelbrot.maxIteration;
  let muLimit = mandelbrot.mu;
  let epsilon = mandelbrot.epsilon;

  // Resume state: if prev_iter > 0 we are continuing a previous pass.

  var i: f32 = 0.0;
  var dz = vec2<f32>(prev_zx, prev_zy);
  var der = vec2<f32>(prev_dzx, prev_dzy);
  var ref_i = decode_ref_i(prev_ref_i);
  var z = getOrbit(ref_i) + dz;
  let trackOrbitMetrics = mandelbrot.trackOrbitMetrics >= 0.5;
  var stripeEma = 0.0;
  var avgDir = vec2<f32>(0.0);
  if (trackOrbitMetrics) {
    stripeEma = decode_stripe_ema(prev_ref_i, prev_iter);
    avgDir = decode_avg_dir(prev_avg_direction, prev_iter);
  }
  var previousStripeEma = stripeEma;
  var previousAvgDir = avgDir;

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
        if (trackOrbitMetrics) {
          let previousMetricCount = prev_iter + i - f32(skipped);
          previousStripeEma = stripeEma;
          previousAvgDir = avgDir;
          stripeEma = update_orbit_ema(stripeEma, stripe_metric_sample(z), f32(skipped));
          avgDir = update_orbit_mean_vec2(avgDir, orbit_direction_sample(z), previousMetricCount, f32(skipped));
        }
      } else {
        z = getOrbit(ref_i);
        dz = 2.0 * cmul(dz, z) + cmul(dz, dz) + dc;
        ref_i += 1;
        z = getOrbit(ref_i) + dz;
        next_der = cmul(der * 2.0, z);
        i += 1.0;
        if (trackOrbitMetrics) {
          let previousMetricCount = prev_iter + i - 1.0;
          previousStripeEma = stripeEma;
          previousAvgDir = avgDir;
          stripeEma = update_orbit_ema_unit(stripeEma, stripe_metric_sample(z));
          avgDir = update_orbit_mean_vec2(avgDir, orbit_direction_sample(z), previousMetricCount, 1.0);
        }
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
      if (trackOrbitMetrics) {
        let previousMetricCount = prev_iter + i - 1.0;
        previousStripeEma = stripeEma;
        previousAvgDir = avgDir;
        stripeEma = update_orbit_ema_unit(stripeEma, stripe_metric_sample(z));
        avgDir = update_orbit_mean_vec2(avgDir, orbit_direction_sample(z), previousMetricCount, 1.0);
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
    out.ref_i     = pack(ref_i_with_stripe(prev_iter + i, stripeEma));
    out.avgDirection = pack(encode_avg_dir(avgDir));
    return out;
  }

  let total_iter = prev_iter + i; // running total across all passes

  if (escaped) {
    let escapeBlend = escape_fraction(z, muLimit);
    let smoothStripeEma = mix(previousStripeEma, stripeEma, escapeBlend);
    let smoothAvgDir = mix(previousAvgDir, avgDir, escapeBlend);

    // Escaped: store final z and der for color-shader recomputation
    // of mu (smooth frac) and angle_der (shading). No need for ref_i.
    out.iter      = pack(total_iter);
    out.genuine   = pack(1.0);
    out.zx        = pack(z.x);
    out.zy        = pack(z.y);
    out.dzx       = pack(der.x);
    out.dzy       = pack(der.y);
    out.ref_i     = pack(ref_i_with_stripe(0.0, smoothStripeEma));
    out.avgDirection = pack(encode_avg_dir(smoothAvgDir));
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
    out.ref_i     = pack(ref_i_with_stripe(total_iter, stripeEma));
    out.avgDirection = pack(encode_avg_dir(avgDir));
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
  out.ref_i     = pack(ref_i_with_stripe(f32(ref_i), stripeEma));
  out.avgDirection = pack(encode_avg_dir(avgDir));
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
    return mandelbrot_compute(x0, y0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0);
  }

  if (needs_continuation) {
    // Resume from stored state: iter > 0, |z|\xB2 < mu.
    let stored_dzx = loadLayer(coord, 4);
    let stored_dzy = loadLayer(coord, 5);
    let prev_ref_i = loadLayer(coord, 6);
    let prev_avg_direction = loadLayer(coord, 7);
    return mandelbrot_compute(x0, y0, prev_iter, prev_zx, prev_zy, stored_dzx, stored_dzy, prev_ref_i, prev_avg_direction);
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
  lightAngle: f32,
  varnishStrength: f32,
  logMu: f32,
  sceneSin: f32,
  sceneCos: f32,
  lightDirX: f32,
  lightDirY: f32,
  lightDirZ: f32,
  paletteMirror: f32,
};
@group(0) @binding(0) var<uniform> parameters: Uniforms;
@group(0) @binding(1) var tex: texture_2d_array<f32>; // resolved neutral texture (8 r32float layers)
@group(0) @binding(2) var tileTex: texture_2d<f32>;
@group(0) @binding(3) var skyboxTex: texture_2d<f32>;
@group(0) @binding(4) var webcamTex: texture_2d<f32>;
@group(0) @binding(5) var paletteTex: texture_2d<f32>;  // 4096 x 6 rgba16float
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
  metallic: f32,        // [0, 1]
  roughness: f32,       // [0.02, 1]
  anisotropy: f32,      // [0, 1]
  iridescenceColor: vec3<f32>,
  wIridescence: f32,
  wStripeAverage: f32,
  wRotationMean: f32,
  wStripeRelief: f32,
  wDirectionCoherenceRelief: f32,
};

fn samplePaletteColor(palettePhase: f32) -> vec3<f32> {
  return textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, 0.083333333), 0.0).rgb;
}

fn animatedPaletteOffset() -> f32 {
  let paletteDrift = parameters.animate * parameters.time * parameters.animationSpeed * 0.025;
  return fract(parameters.paletteOffset + paletteDrift);
}

fn palettePhaseFromRaw(rawPhase: f32) -> f32 {
  let phase = fract(rawPhase);
  if (parameters.paletteMirror < 0.5) {
    return phase;
  }
  let reverse = (i32(floor(rawPhase)) % 2) != 0;
  return select(phase, min(1.0 - phase, 0.99999994), reverse);
}

fn sampleEffects(palettePhase: f32) -> EffectParams {
  var e: EffectParams;

  // Row 0: R, G, B, palette weight
  let row0 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, 0.083333333), 0.0);
  e.paletteColor = row0.rgb;
  e.wPalette = row0.a;

  // Row 1: zebra, tessellation, shading, skybox
  let row1 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, 0.25), 0.0);
  e.wTessellation = row1.g;
  e.wShading = row1.b;
  e.wSkybox = row1.a;

  // Row 2: webcam, smoothness, shadingLevel [0,3], specularPower [1,64]
  let row2 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, 0.416666667), 0.0);
  e.wWebcam = row2.r;
  e.wSmoothness = row2.g;
  e.shadingLevel = row2.b;       // direct: natural range [0, 3]
  e.specularPower = max(row2.a, 1.0); // direct: natural range [1, 64]

  // Row 3: reserved, metallic, roughness, anisotropy
  let row3 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, 0.583333333), 0.0);
  e.metallic = clamp(row3.g, 0.0, 1.0);
  e.roughness = clamp(row3.b, 0.02, 1.0);
  e.anisotropy = clamp(row3.a, 0.0, 1.0);

  // Row 4: iridescence R, G, B, strength
  let row4 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, 0.75), 0.0);
  e.iridescenceColor = row4.rgb;
  e.wIridescence = clamp(row4.a, 0.0, 1.0);

  // Row 5: stripe color blend, direction coherence color blend, stripe relief, direction coherence relief
  let row5 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, 0.916666667), 0.0);
  e.wStripeAverage = clamp(row5.r, 0.0, 1.0);
  e.wRotationMean = clamp(row5.g, 0.0, 1.0);
  e.wStripeRelief = clamp(row5.b, 0.0, 1.0);
  e.wDirectionCoherenceRelief = clamp(row5.a, 0.0, 1.0);

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

fn rotate_sincos(v: vec2<f32>, s: f32, c: f32) -> vec2<f32> {
  return vec2<f32>(c * v.x - s * v.y, s * v.x + c * v.y);
}

fn rotate_inverse_sincos(v: vec2<f32>, s: f32, c: f32) -> vec2<f32> {
  return vec2<f32>(c * v.x + s * v.y, -s * v.x + c * v.y);
}

fn rotate_surface_vector_sincos(v: vec3<f32>, s: f32, c: f32) -> vec3<f32> {
  let xy = rotate_sincos(v.xy, s, c);
  return vec3<f32>(xy.x, xy.y, v.z);
}

fn isInsideScreen(uv: vec2<f32>, aspect: f32, neutralExtent: f32, sceneSin: f32, sceneCos: f32) -> bool {
  let xy_neutral = (uv - vec2<f32>(0.5, 0.5)) * 2.0;
  let local_rot  = xy_neutral * neutralExtent;
  let local      = rotate_inverse_sincos(local_rot, sceneSin, sceneCos);
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

fn mandelbrot_normal_from_dir(angleDir: vec2<f32>) -> vec3<f32> {
  return normalize(vec3<f32>(angleDir.x, angleDir.y, 0.5));
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

fn mandelbrot_tangent_from_dir(angleDir: vec2<f32>, normal: vec3<f32>) -> vec3<f32> {
  let flow = vec3<f32>(-angleDir.y, angleDir.x, 0.0);
  let projected = flow - normal * dot(flow, normal);
  let projectedLen = length(projected);
  return select(vec3<f32>(1.0, 0.0, 0.0), projected / projectedLen, projectedLen > 1e-5);
}

fn distance_tangent(grad: vec2<f32>, fallbackTangent: vec3<f32>, fallbackBitangent: vec3<f32>, normal: vec3<f32>) -> vec3<f32> {
  let gradLen = length(grad);
  let contour2d = vec2<f32>(-grad.y, grad.x) / max(gradLen, 1e-5);
  let tangentRaw = fallbackTangent * contour2d.x + fallbackBitangent * contour2d.y;
  let tangentFromDistance = tangentRaw / max(length(tangentRaw), 1e-5);
  let projected = tangentFromDistance - normal * dot(tangentFromDistance, normal);
  let projectedLen = length(projected);
  return select(fallbackTangent, projected / max(projectedLen, 1e-5), gradLen > 1e-4 && projectedLen > 1e-5);
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
  let directionalBase = abs(sin(angle_der * 2.0 + v_smooth * 0.035));
  let directionalBase2 = directionalBase * directionalBase;
  let directionalRidge = directionalBase2 * directionalBase2 * directionalBase2;
  let iterationBase = 1.0 - abs(fract(v_smooth * 0.125) * 2.0 - 1.0);
  let iterationRidge = iterationBase * iterationBase * iterationBase;
  return clamp(directionalRidge * 0.65 + iterationRidge * 0.35, 0.0, 1.0);
}

fn fake_subsurface_scattering(color: vec3<f32>, normal: vec3<f32>, lightDir: vec3<f32>, nDotV: f32, ao: f32, edgeWear: f32, metallic: f32, strength: f32, distanceHeight: f32) -> vec3<f32> {
  let backLight = pow(max(dot(normal, -lightDir), 0.0), 1.35);
  let rimScatter = pow(clamp(1.0 - nDotV, 0.0, 1.0), 2.15);
  let wrapBase = clamp(dot(normal, lightDir) * 0.5 + 0.5, 0.0, 1.0);
  let wrapLight = wrapBase * wrapBase;
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

fn palette(sourceTex: texture_2d_array<f32>, sourceCoord: vec2<i32>, sourceTexSize: vec2<i32>, iterRaw: f32, v: f32, v_smooth: f32, z: vec2<f32>, der: vec2<f32>, angle_der: f32, stripeAverage: f32, directionCoherence: f32, dx: f32, dy: f32) -> vec3<f32> {
  let paletteRepeat = max(parameters.palettePeriod, 0.0001);
  let deep = v * 2.0;
  let palettePhase = palettePhaseFromRaw(deep / paletteRepeat + animatedPaletteOffset());

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
  let tile_drift = vec2<f32>(
    anim * 0.03 * sin(t * 0.4 * spd),
    anim * 0.03 * sin(t * 0.3 * spd + 1.2),
  );

  // \u2500\u2500 Blend color sources using overlay/opacity model \u2500\u2500
  // Palette is always the base. Other sources overlay on top with their weight as opacity.
  var color = fx.paletteColor * fx.wPalette;

  // Tessellation: overlay on top of palette color
  if (effTess > 0.001) {
    let tessColor = tile_tessellation(tileTex, tess_u + tile_drift.x, tess_v + tile_drift.y, parameters.tessellationLevel);
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

  if (fx.wStripeAverage > 0.001) {
    color = mix(color, samplePaletteColor(fract(stripeAverage)), fx.wStripeAverage);
  }
  if (fx.wRotationMean > 0.001) {
    color = mix(color, samplePaletteColor(fract(directionCoherence)), fx.wRotationMean);
  }

  // \u2500\u2500 Shading (always computed, applied proportionally to wShading) \u2500\u2500
  if (effShading > 0.001) {
    let angleDir = vec2<f32>(cos(angle_der), sin(angle_der));
    let reliefDepth = parameters.reliefDepth * effShading;
    let relief = clamp(reliefDepth, 0.0, 2.0);
    let surfaceRelief = relief * 0.5;
    let occStrength = clamp(parameters.localShadowStrength * 5.0, 0.0, 10.0);
    let needsDistanceHeight = parameters.subsurfaceStrength > 0.001;
    let stripeReliefStrength = fx.wStripeRelief * effShading;
    let directionCoherenceStrength = fx.wDirectionCoherenceRelief * effShading;
    let needsStripeGradient = stripeReliefStrength > 0.001;
    let needsDirectionCoherenceGradient = directionCoherenceStrength > 0.001;
    let needsFractalGradient = relief > 0.001 || occStrength > 0.001;
    var distanceHeight = 0.0;
    var grad = vec2<f32>(0.0);
    var stripeGrad = vec2<f32>(0.0);
    var directionCoherenceGrad = vec2<f32>(0.0);
    var slope = 0.0;
    if (needsDistanceHeight || needsFractalGradient) {
      distanceHeight = distance_height_from_values(iterRaw, z.x, z.y, der.x, der.y);
    }
    if (needsFractalGradient) {
      let fractalGradient = distance_height_gradient_at_coord(sourceTex, sourceCoord, sourceTexSize, distanceHeight);
      grad = clamp(fractalGradient, vec2<f32>(-6.0), vec2<f32>(6.0));
      slope = length(grad);
    }
    if (needsStripeGradient) {
      stripeGrad = stripe_gradient_at_coord(sourceTex, sourceCoord, sourceTexSize, stripeAverage);
    }
    if (needsDirectionCoherenceGradient) {
      directionCoherenceGrad = direction_coherence_gradient_at_coord(sourceTex, sourceCoord, sourceTexSize, directionCoherence);
    }
    let edgeWear = curvature_edge_wear(angle_der, v_smooth);
    let flatNormal = vec3<f32>(0.0, 0.0, 1.0);
    let baseNormal = normalize(mix(flatNormal, mandelbrot_normal_from_dir(angleDir), surfaceRelief));
    let baseTangent = mandelbrot_tangent_from_dir(angleDir, baseNormal);
    let baseBitangent = normalize(cross(baseNormal, baseTangent));
    var bumpedNormal = baseNormal;
    let bumpStrength = parameters.microBumpStrength * effTess;
    if (bumpStrength > 0.001) {
      bumpedNormal = texture_bump_normal(
        tileTex,
        baseNormal,
        baseTangent,
        baseBitangent,
        tess_u + tile_drift.x,
        tess_v + tile_drift.y,
        parameters.tessellationLevel,
        bumpStrength
      );
    }
    let heightNormal = fractal_height_normal(bumpedNormal, baseTangent, baseBitangent, grad, relief);
    let stripeNormal = direction_coherence_normal(heightNormal, baseTangent, baseBitangent, stripeGrad, stripeReliefStrength);
    let directionNormal = direction_coherence_normal(stripeNormal, baseTangent, baseBitangent, directionCoherenceGrad, directionCoherenceStrength);
    let sceneSin = parameters.sceneSin;
    let sceneCos = parameters.sceneCos;
    let normal = normalize(rotate_surface_vector_sincos(directionNormal, sceneSin, sceneCos));
    let baseTangentWorld = normalize(rotate_surface_vector_sincos(baseTangent, sceneSin, sceneCos));
    let baseBitangentWorld = normalize(rotate_surface_vector_sincos(baseBitangent, sceneSin, sceneCos));
    let heightAo = fractal_height_ao(slope, relief, occStrength);
    let normalCavity = clamp(
      1.0 - smoothstep(0.02, 0.62, 1.0 - normal.z) * 0.58 * occStrength,
      0.16,
      1.0
    );
    let cavity = min(surface_cavity(slope, relief, occStrength), normalCavity);
    let ao = min(pseudo_ambient_occlusion(normal, v_smooth, z), heightAo) * cavity;
    let lightDir = vec3<f32>(parameters.lightDirX, parameters.lightDirY, parameters.lightDirZ);
    let viewDir = vec3<f32>(0.0, 0.0, 1.0);
    let halfDir = normalize(lightDir + viewDir);
    let tangent = normalize(rotate_surface_vector_sincos(mandelbrot_tangent_from_dir(angleDir, directionNormal), sceneSin, sceneCos));
    let bitangent = normalize(cross(normal, tangent));
    let anisotropyTangent = distance_tangent(grad, baseTangentWorld, baseBitangentWorld, normal);
    let anisotropyBitangent = normalize(cross(normal, anisotropyTangent));
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
    let anisotropicTerm = anisotropic_highlight(normal, anisotropyTangent, anisotropyBitangent, halfDir, nDotL, nDotV, roughness);
    let specularLobe = mix(specularTerm, anisotropicTerm, anisotropy);
    let directSpecular = fresnelSpec * specularLobe * specularGain * nDotL;
    let diffuseColor = color * (1.0 - metallic) * (1.0 - 0.35 * luminance(fresnelSpec));
    let localShadow = fractal_height_shadow(grad, lightDir, baseTangentWorld, baseBitangentWorld, relief, occStrength);
    let shadowedNDotL = nDotL * localShadow;
    let litSide = smoothstep(0.02, 0.55, shadowedNDotL);
    let reflectionSide = mix(0.08, 1.0, litSide);
    let diffuseLight = diffuseColor * (0.14 + 0.86 * shadowedNDotL) * ao;
    let brightness = max(fx.shadingLevel, 0.0);
    var materialColor = diffuseLight + directSpecular * ao * mix(1.0, localShadow, 0.45);

    if (fx.wIridescence > 0.001) {
      let viewShift = smoothstep(0.04, 0.86, 1.0 - nDotV);
      let lightShift = smoothstep(0.08, 0.82, 1.0 - nDotH);
      let lightPlane = normalize(lightDir.xy + vec2<f32>(1e-5));
      let tangentPlane = vec2<f32>(-lightPlane.y, lightPlane.x);
      let orientationPlane = normalize(rotate_sincos(angleDir, sceneSin, sceneCos) + vec2<f32>(1e-5));
      let facingPearl = dot(orientationPlane, lightPlane) * 0.5 + 0.5;
      let crossPearl = dot(orientationPlane, tangentPlane) * 0.5 + 0.5;
      let orientationShift = mix(smoothstep(0.02, 0.98, facingPearl), smoothstep(0.02, 0.98, crossPearl), 0.42);
      let slopeShift = smoothstep(0.025, 1.15, slope * max(relief, 0.18));
      let tiltShift = smoothstep(0.025, 0.55, length(normal.xy));
      let surfaceShift = max(slopeShift, tiltShift * 0.65);
      let pearlAngle = clamp(0.05 + viewShift * 0.12 + lightShift * 0.10 + orientationShift * 0.56 + surfaceShift * 0.32, 0.0, 1.0);
      let pearlLighting = (0.18 + 0.82 * shadowedNDotL) * ao * mix(0.45, 1.0, localShadow) * mix(0.55, 1.0, cavity);
      let coatWeight = fx.wIridescence * pearlAngle * mix(0.45, 1.45, orientationShift) * mix(0.60, 1.25, surfaceShift) * pearlLighting * (1.0 - metallic * 0.35);
      let pearlTint = 0.18 + 0.74 * orientationShift + 0.18 * surfaceShift;
      let pearlColor = mix(color, fx.iridescenceColor, pearlTint) * (0.78 + 0.36 * max(luminance(color), 0.25));
      let pearlSheen = pow(nDotH, mix(2.5, 7.5, 1.0 - roughness)) * fx.wIridescence * pearlLighting * mix(0.45, 1.35, orientationShift);
      materialColor = mix(materialColor, pearlColor, clamp(coatWeight, 0.0, 0.92));
      materialColor += fx.iridescenceColor * pearlSheen * (0.28 + 0.46 * (1.0 - roughness)) * (1.0 - metallic * 0.25);
    }

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
      let fresnelReflection = clamp(luminance(fresnelEnv), 0.0, 1.0);
      let polishReflection = 0.075 * clamp(parameters.varnishStrength, 0.0, 10.0) * (1.0 - roughness * 0.55) * (1.0 - metallic * 0.35);
      let reflectionStrength = fx.wSkybox * max(fresnelReflection, polishReflection);
      let envVisibility = mix(reflectionSide, mix(0.55, 1.0, litSide), metallic);
      envColor = skyboxColor * reflectionStrength * mix(0.55, 1.25, metallic) * envVisibility;
    }

    let rim = pow(clamp(1.0 - nDotV, 0.0, 1.0), mix(3.5, 1.8, metallic)) * effShading * reflectionSide;
    let rimBaseColor = mix(color, vec3<f32>(1.0), 0.45);
    let rimPearlColor = mix(rimBaseColor, fx.iridescenceColor, fx.wIridescence * 0.65);
    let rimColor = rimPearlColor * rim * (0.08 + 0.22 * fx.wSkybox + 0.12 * fx.wIridescence);
    let wearColor = mix(color, vec3<f32>(1.0, 0.92, 0.74), 0.5 + 0.3 * metallic);
    let wear = edgeWear * (0.15 + 0.35 * metallic) * effShading * mix(0.35, 1.0, litSide);
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
  let mu_val = clamp(1.0 - log(log_z2 / parameters.logMu) / log(2.0), 0.0, 1.0);
  return iter_val + mu_val;
}

fn decode_stripe_phase(refWithStripe: f32) -> f32 {
  return fract(max(refWithStripe, 0.0));
}

fn stripe_phase_delta(a: f32, b: f32) -> f32 {
  return fract(a - b + 0.5) - 0.5;
}

fn stripe_at_coord(sourceTex: texture_2d_array<f32>, coord: vec2<i32>, texSize: vec2<i32>) -> f32 {
  if (coord.x < 0 || coord.x >= texSize.x || coord.y < 0 || coord.y >= texSize.y) {
    return -1e6;
  }
  let iterVal = textureLoad(sourceTex, coord, 0, 0).r;
  let zx = textureLoad(sourceTex, coord, 2, 0).r;
  let zy = textureLoad(sourceTex, coord, 3, 0).r;
  if (escape_nu(iterVal, zx, zy) < 0.0) {
    return -1e6;
  }
  return decode_stripe_phase(textureLoad(sourceTex, coord, 6, 0).r);
}

fn stripe_gradient_at_coord(sourceTex: texture_2d_array<f32>, coord: vec2<i32>, texSize: vec2<i32>, centerStripe: f32) -> vec2<f32> {
  let xr = stripe_at_coord(sourceTex, coord + vec2<i32>(1, 0), texSize);
  let xl = stripe_at_coord(sourceTex, coord - vec2<i32>(1, 0), texSize);
  let yu = stripe_at_coord(sourceTex, coord + vec2<i32>(0, 1), texSize);
  let yd = stripe_at_coord(sourceTex, coord - vec2<i32>(0, 1), texSize);
  let right = select(centerStripe, xr, xr > -1e5);
  let left = select(centerStripe, xl, xl > -1e5);
  let up = select(centerStripe, yu, yu > -1e5);
  let down = select(centerStripe, yd, yd > -1e5);
  return vec2<f32>(stripe_phase_delta(right, left), stripe_phase_delta(up, down)) * 8.0;
}

const ORBIT_DIRECTION_SCALE: f32 = 4095.0;
const ORBIT_DIRECTION_BASE: f32 = 4096.0;

fn decode_direction_coherence(encoded: f32) -> f32 {
  let xq = floor(encoded / ORBIT_DIRECTION_BASE);
  let yq = encoded - xq * ORBIT_DIRECTION_BASE;
  let avgDir = vec2<f32>(
    (xq / ORBIT_DIRECTION_SCALE - 0.5) * 2.0,
    (yq / ORBIT_DIRECTION_SCALE - 0.5) * 2.0,
  );
  return clamp(length(avgDir), 0.0, 1.0);
}

fn direction_coherence_at_coord(sourceTex: texture_2d_array<f32>, coord: vec2<i32>, texSize: vec2<i32>) -> f32 {
  if (coord.x < 0 || coord.x >= texSize.x || coord.y < 0 || coord.y >= texSize.y) {
    return -1e6;
  }
  let iterVal = textureLoad(sourceTex, coord, 0, 0).r;
  let zx = textureLoad(sourceTex, coord, 2, 0).r;
  let zy = textureLoad(sourceTex, coord, 3, 0).r;
  if (escape_nu(iterVal, zx, zy) < 0.0) {
    return -1e6;
  }
  return decode_direction_coherence(textureLoad(sourceTex, coord, 7, 0).r);
}

fn direction_coherence_gradient_at_coord(sourceTex: texture_2d_array<f32>, coord: vec2<i32>, texSize: vec2<i32>, centerCoherence: f32) -> vec2<f32> {
  let xr = direction_coherence_at_coord(sourceTex, coord + vec2<i32>(1, 0), texSize);
  let xl = direction_coherence_at_coord(sourceTex, coord - vec2<i32>(1, 0), texSize);
  let yu = direction_coherence_at_coord(sourceTex, coord + vec2<i32>(0, 1), texSize);
  let yd = direction_coherence_at_coord(sourceTex, coord - vec2<i32>(0, 1), texSize);
  let right = select(centerCoherence, xr, xr > -1e5);
  let left = select(centerCoherence, xl, xl > -1e5);
  let up = select(centerCoherence, yu, yu > -1e5);
  let down = select(centerCoherence, yd, yd > -1e5);
  return vec2<f32>(right - left, up - down) * 8.0;
}

fn direction_coherence_normal(normal: vec3<f32>, tangent: vec3<f32>, bitangent: vec3<f32>, grad: vec2<f32>, strength: f32) -> vec3<f32> {
  let bump = tangent * grad.x + bitangent * grad.y;
  return normalize(normal - bump * clamp(strength, 0.0, 1.0) * 0.75);
}

// \u2500\u2500 Colorize a single pixel from its raw layer values \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn colorize_pixel(
  sourceTex: texture_2d_array<f32>,
  sourceCoord: vec2<i32>,
  sourceTexSize: vec2<i32>,
  iter_val: f32, zx_val: f32, zy_val: f32,
  der_x: f32, der_y: f32,
  refWithStripe: f32,
  avgDirection: f32,
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

  if (iter_val == 0.0) {
    return vec4<f32>(0.0, 0.0, 0.0, 0.0);
  }

  // \u2500\u2500 Escaped pixel \u2500\u2500
  let z_sq = zx_val * zx_val + zy_val * zy_val;
  let log_z2 = log(z_sq);
  let mu_val = clamp(1.0 - log(log_z2 / parameters.logMu) / log(2.0), 0.0, 1.0);

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
  let prelimPhase = palettePhaseFromRaw(nu * 2.0 / paletteRepeat + animatedPaletteOffset());
  let row2 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(prelimPhase, 0.416666667), 0.0);
  let wSmoothness = row2.g;
  nu = mix(iter_val, nu, wSmoothness);

  // \u2500\u2500 Zebra: continuous application (darkens even iterations) \u2500\u2500
  let row1 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(prelimPhase, 0.25), 0.0);
  let wZebra = row1.r;
  let isEvenIter = 1.0 - abs(floor(iter_val) % 2.0);

  let z = vec2<f32>(zx_val, zy_val);
  let der = vec2<f32>(der_x, der_y);
  let dd = cdiv(der, z);
  let angle_der = atan2(dd.y, dd.x);

  let v = nu;
  let v_smooth = nu_smooth;
  let stripePhase = decode_stripe_phase(refWithStripe);
  let directionCoherence = decode_direction_coherence(avgDirection);
  var color = palette(sourceTex, sourceCoord, sourceTexSize, iter_val, v, v_smooth, z, der, angle_der, stripePhase, directionCoherence, uv_neutral.x, uv_neutral.y);

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
  let local_rot = rotate_sincos(local, parameters.sceneSin, parameters.sceneCos);
  let xy_neutral = local_rot / neutralExtent;
  let uv_neutral = xy_neutral * 0.5 + vec2<f32>(0.5, 0.5);

  let texSize = vec2<i32>(textureDimensions(tex));
  let texSizeF = vec2<f32>(f32(texSize.x), f32(texSize.y));

  let aspect = parameters.aspect;
  let sceneSin = parameters.sceneSin;
  let sceneCos = parameters.sceneCos;

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
    liveInBounds = isInsideScreen(uv_live, aspect, neutralExtent, sceneSin, sceneCos);
  } else {
    liveInBounds = uv_live.x >= 0.0 && uv_live.x <= 1.0
                && uv_live.y >= 0.0 && uv_live.y <= 1.0;
  }

  var live_iter = -1.0;
  var liveStep = 0.0;  // 0 = no data
  var liveCoord = vec2<i32>(0);
  var live_zx = 0.0;
  var live_zy = 0.0;
  if (liveInBounds) {
    liveCoord = vec2<i32>(
      i32(clamp(uv_live.x * texSizeF.x, 0.0, texSizeF.x - 1.0)),
      i32(clamp((1.0 - uv_live.y) * texSizeF.y, 0.0, texSizeF.y - 1.0))
    );
    live_iter = textureLoad(tex, liveCoord, 0, 0).r;
    liveStep = textureLoad(tex, liveCoord, 1, 0).r;
    if (live_iter > 0.0) {
      live_zx = textureLoad(tex, liveCoord, 2, 0).r;
      live_zy = textureLoad(tex, liveCoord, 3, 0).r;
    }
  }
  let liveEscaped = live_iter > 0.0 && (live_zx * live_zx + live_zy * live_zy) >= parameters.mu;
  let liveHasData = liveEscaped && liveStep > 0.0;

  // \u2500\u2500 Sample frozen texture \u2500\u2500
  // The frozen texture is only usable when it is aligned with the live texture
  // (during zoom reprojection, or post-zoom before any translation occurs).
  // The CPU sets frozenAligned = 1.0 in those cases, 0.0 otherwise.
  let useFrozen = parameters.frozenAligned > 0.5;

  var frozenStep = 0.0;  // 0 = no data
  var frozenCoord = vec2<i32>(0);
  var frozen_iter = -1.0;
  var frozen_zx = 0.0;
  var frozen_zy = 0.0;
  if (useFrozen) {
    let uv_frozen = (uv_neutral - vec2<f32>(0.5, 0.5)) / zf + vec2<f32>(0.5, 0.5)
                    - vec2<f32>(parameters.frozenShiftU, parameters.frozenShiftV);

    var frozenInBounds: bool;
    if (zf < 1.0) {
      frozenInBounds = isInsideScreen(uv_frozen, aspect, neutralExtent, sceneSin, sceneCos);
    } else {
      frozenInBounds = uv_frozen.x >= 0.0 && uv_frozen.x <= 1.0
                    && uv_frozen.y >= 0.0 && uv_frozen.y <= 1.0;
    }

    if (frozenInBounds) {
      frozenCoord = vec2<i32>(
        i32(clamp(uv_frozen.x * texSizeF.x, 0.0, texSizeF.x - 1.0)),
        i32(clamp((1.0 - uv_frozen.y) * texSizeF.y, 0.0, texSizeF.y - 1.0))
      );
      frozen_iter = textureLoad(texFrozen, frozenCoord, 0, 0).r;
      frozenStep = textureLoad(texFrozen, frozenCoord, 1, 0).r;
      if (frozen_iter > 0.0) {
        frozen_zx = textureLoad(texFrozen, frozenCoord, 2, 0).r;
        frozen_zy = textureLoad(texFrozen, frozenCoord, 3, 0).r;
      }
    }
  }
  let frozenEscaped = frozen_iter > 0.0 && (frozen_zx * frozen_zx + frozen_zy * frozen_zy) >= parameters.mu;
  let frozenHasData = frozenEscaped && frozenStep > 0.0;

  // \u2500\u2500 Pick the best pixel: smallest positive step wins \u2500\u2500
  // step > 0 means the pixel has data; step = 0 means no data.
  // The frozen and live textures live at different scales, so their raw step
  // values are not directly comparable. A frozen genuine pixel (step=1) at
  // frozenScale is zf/lzf times coarser per axis than a live genuine pixel
  // (step=1) at liveScale.  Scale the frozen step to live-resolution units.
  let scaleRatio = select(1.0, zf / lzf, lzf > 0.0);
  let effectiveFrozenStep = frozenStep * scaleRatio;

  if (liveHasData && frozenHasData) {
    // Both have data \u2014 pick the one with finer resolution (smaller step).
    if (liveStep <= effectiveFrozenStep) {
      let liveColor = colorize_pixel(
        tex,
        liveCoord,
        texSize,
        live_iter,
        live_zx,
        live_zy,
        textureLoad(tex, liveCoord, 4, 0).r,
        textureLoad(tex, liveCoord, 5, 0).r,
        textureLoad(tex, liveCoord, 6, 0).r,
        textureLoad(tex, liveCoord, 7, 0).r,
        uv_neutral
      );
      if (DEBUG_SHOW_LIVE_NEGATIVE) {
        let neg = vec3<f32>(1.0) - liveColor.rgb;
        return vec4<f32>(neg.r * 0.3, neg.g, neg.b * 0.3, 1.0);
      }
      return vec4<f32>(liveColor.rgb, 1.0);
    } else {
      let frozenColor = colorize_pixel(
        texFrozen,
        frozenCoord,
        texSize,
        frozen_iter,
        frozen_zx,
        frozen_zy,
        textureLoad(texFrozen, frozenCoord, 4, 0).r,
        textureLoad(texFrozen, frozenCoord, 5, 0).r,
        textureLoad(texFrozen, frozenCoord, 6, 0).r,
        textureLoad(texFrozen, frozenCoord, 7, 0).r,
        uv_neutral
      );
      return vec4<f32>(frozenColor.rgb, 1.0);
    }
  }

  if (liveHasData) {
    let liveColor = colorize_pixel(
      tex,
      liveCoord,
      texSize,
      live_iter,
      live_zx,
      live_zy,
      textureLoad(tex, liveCoord, 4, 0).r,
      textureLoad(tex, liveCoord, 5, 0).r,
      textureLoad(tex, liveCoord, 6, 0).r,
      textureLoad(tex, liveCoord, 7, 0).r,
      uv_neutral
    );
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
    let frozenColor = colorize_pixel(
      texFrozen,
      frozenCoord,
      texSize,
      frozen_iter,
      frozen_zx,
      frozen_zy,
      textureLoad(texFrozen, frozenCoord, 4, 0).r,
      textureLoad(texFrozen, frozenCoord, 5, 0).r,
      textureLoad(texFrozen, frozenCoord, 6, 0).r,
      textureLoad(texFrozen, frozenCoord, 7, 0).r,
      uv_neutral
    );
    return vec4<f32>(frozenColor.rgb, 1.0);
  }

  // No valid pixel from either source.
  return vec4<f32>(0.05, 0.05, 0.05, 1.0);
}
`,ye=`// Brush pass: updates sentinel levels in the neutral square texture.
//
// Uses a texture_2d_array<f32> with 8 r32float layers.
//
// Layer layout:
//   0 : sentinel / iteration count (integer part)
//   1 : resolution step (1.0 = genuine pixel, >= 2 = resolve-copied, 0.0 = no data)
//   2 : z.x
//   3 : z.y
//   4 : dz.x (derivative real)
//   5 : dz.y (derivative imag)
//   6 : ref_i + fractional stripe phase (reference orbit index for resuming perturbation)
//   7 : packed average orbit direction
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

// \u2500\u2500 output struct (8 render targets) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
struct FragOut {
  @location(0) iter:      vec4<f32>,
  @location(1) genuine:   vec4<f32>,
  @location(2) zx:        vec4<f32>,
  @location(3) zy:        vec4<f32>,
  @location(4) dzx:       vec4<f32>,
  @location(5) dzy:       vec4<f32>,
  @location(6) ref_i:     vec4<f32>,
  @location(7) avgDirection: vec4<f32>,
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
  o.avgDirection = pack(loadLayer(coord, 7));
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
  o.avgDirection = pack(0.0);
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
`,Sr=`// Resolve pass: replaces remaining sentinels with a snapped parent pixel.
//
// Uses a texture_2d_array<f32> with 8 r32float layers.
//
// Layer layout:
//   0 : sentinel / iteration count (integer part)
//   1 : resolution step (1.0 = genuine pixel, >= 2 = resolve-copied from grid step)
//   2 : z.x
//   3 : z.y
//   4 : dz.x (derivative real)
//   5 : dz.y (derivative imag)
//   6 : ref_i + fractional stripe phase (reference orbit index for resuming perturbation)
//   7 : packed average orbit direction
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

// \u2500\u2500 output struct (8 render targets) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
struct FragOut {
  @location(0) iter:      vec4<f32>,
  @location(1) genuine:   vec4<f32>,
  @location(2) zx:        vec4<f32>,
  @location(3) zy:        vec4<f32>,
  @location(4) dzx:       vec4<f32>,
  @location(5) dzy:       vec4<f32>,
  @location(6) ref_i:     vec4<f32>,
  @location(7) avgDirection: vec4<f32>,
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
  o.avgDirection = pack(0.0);
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
  o.avgDirection = pack(loadLayer(coord, 7));
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
`,Tr=`// Merge pass: fuses the resolved (live) and frozen textures into a new frozen
// snapshot using the min-step-wins rule.
//
// This is needed when zoom stops: the two textures live in different coordinate
// spaces (live at liveScale, frozen at frozenScale). The merge reprojects both
// into the current display space and, for each output pixel, keeps the source
// with the finest resolution (smallest positive step in layer 1).
//
// Output: 8 MRT render targets written directly into the frozen texture layers.
//
// Layer layout (r32float texture_2d_array, 8 layers):
//   0 : iteration count
//   1 : resolution step (1 = genuine, >= 2 = resolve-copied, 0 = no data)
//   2 : z.x
//   3 : z.y
//   4 : dz.x
//   5 : dz.y
//   6 : ref_i + fractional stripe phase
//   7 : packed average orbit direction

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

// \u2500\u2500 output struct (8 render targets) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
struct FragOut {
  @location(0) layer0: vec4<f32>,
  @location(1) layer1: vec4<f32>,
  @location(2) layer2: vec4<f32>,
  @location(3) layer3: vec4<f32>,
  @location(4) layer4: vec4<f32>,
  @location(5) layer5: vec4<f32>,
  @location(6) layer6: vec4<f32>,
  @location(7) layer7: vec4<f32>,
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

// Read all 8 layers from a texture at the given coordinate.
fn readAllLayersWithKnown01(tex: texture_2d_array<f32>, coord: vec2<i32>, iter: f32, step: f32) -> FragOut {
  var o: FragOut;
  o.layer0 = pack(iter);
  o.layer1 = pack(step);
  o.layer2 = pack(textureLoad(tex, coord, 2, 0).r);
  o.layer3 = pack(textureLoad(tex, coord, 3, 0).r);
  o.layer4 = pack(textureLoad(tex, coord, 4, 0).r);
  o.layer5 = pack(textureLoad(tex, coord, 5, 0).r);
  o.layer6 = pack(textureLoad(tex, coord, 6, 0).r);
  o.layer7 = pack(textureLoad(tex, coord, 7, 0).r);
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
  o.layer7 = pack(0.0);
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
`,Cr=async(t={},e)=>{let r;if(e.startsWith("data:")){const i=e.replace(/^data:.*?base64,/,"");let a;if(typeof Buffer=="function"&&typeof Buffer.from=="function")a=Buffer.from(i,"base64");else if(typeof atob=="function"){const o=atob(i);a=new Uint8Array(o.length);for(let s=0;s<o.length;s++)a[s]=o.charCodeAt(s)}else throw new Error("Cannot decode base64-encoded data URL");r=await WebAssembly.instantiate(a,t)}else{const i=await fetch(e),a=i.headers.get("Content-Type")||"";if("instantiateStreaming"in WebAssembly&&a.startsWith("application/wasm"))r=await WebAssembly.instantiateStreaming(i,t);else{const o=await i.arrayBuffer();r=await WebAssembly.instantiate(o,t)}}return r.instance.exports};let g;function Br(t){g=t}let Ue=null;function Ne(){return(Ue===null||Ue.byteLength===0)&&(Ue=new Uint8Array(g.memory.buffer)),Ue}let Ve=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0});Ve.decode();const kr=2146435072;let Je=0;function Lr(t,e){return Je+=e,Je>=kr&&(Ve=new TextDecoder("utf-8",{ignoreBOM:!0,fatal:!0}),Ve.decode(),Je=e),Ve.decode(Ne().subarray(t,t+e))}function kt(t,e){return t=t>>>0,Lr(t,e)}let we=null;function Rr(){return(we===null||we.buffer.detached===!0||we.buffer.detached===void 0&&we.buffer!==g.memory.buffer)&&(we=new DataView(g.memory.buffer)),we}function Qe(t,e){t=t>>>0;const r=Rr(),i=[];for(let a=t;a<t+4*e;a+=4)i.push(g.__wbindgen_export_0.get(r.getUint32(a,!0)));return g.__externref_drop_slice(t,e),i}let pe=0;const Re=new TextEncoder;"encodeInto"in Re||(Re.encodeInto=function(t,e){const r=Re.encode(t);return e.set(r),{read:t.length,written:r.length}});function ze(t,e,r){if(r===void 0){const l=Re.encode(t),u=e(l.length,1)>>>0;return Ne().subarray(u,u+l.length).set(l),pe=l.length,u}let i=t.length,a=e(i,1)>>>0;const o=Ne();let s=0;for(;s<i;s++){const l=t.charCodeAt(s);if(l>127)break;o[a+s]=l}if(s!==i){s!==0&&(t=t.slice(s)),a=r(a,i,i=s+t.length*3,1)>>>0;const l=Ne().subarray(a+s,a+i),u=Re.encodeInto(t,l);s+=u.written,a=r(a,i,s,1)>>>0}return pe=s,a}const Lt=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(t=>g.__wbg_blabufferinfo_free(t>>>0,1));class Ee{static __wrap(e){e=e>>>0;const r=Object.create(Ee.prototype);return r.__wbg_ptr=e,Lt.register(r,r.__wbg_ptr,r),r}__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,Lt.unregister(this),e}free(){const e=this.__destroy_into_raw();g.__wbg_blabufferinfo_free(e,0)}get ptr(){return g.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr)>>>0}set ptr(e){g.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr,e)}get count(){return g.__wbg_get_blabufferinfo_count(this.__wbg_ptr)>>>0}set count(e){g.__wbg_set_blabufferinfo_count(this.__wbg_ptr,e)}get levels_ptr(){return g.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr)>>>0}set levels_ptr(e){g.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr,e)}get level_count(){return g.__wbg_get_blabufferinfo_level_count(this.__wbg_ptr)>>>0}set level_count(e){g.__wbg_set_blabufferinfo_level_count(this.__wbg_ptr,e)}}Symbol.dispose&&(Ee.prototype[Symbol.dispose]=Ee.prototype.free),typeof FinalizationRegistry>"u"||new FinalizationRegistry(t=>g.__wbg_blalevel_free(t>>>0,1)),typeof FinalizationRegistry>"u"||new FinalizationRegistry(t=>g.__wbg_blastep_free(t>>>0,1));const Rt=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(t=>g.__wbg_mandelbrotnavigator_free(t>>>0,1));class et{__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,Rt.unregister(this),e}free(){const e=this.__destroy_into_raw();g.__wbg_mandelbrotnavigator_free(e,0)}get_params(){const e=g.mandelbrotnavigator_get_params(this.__wbg_ptr);var r=Qe(e[0],e[1]).slice();return g.__wbindgen_free(e[0],e[1]*4,4),r}rotate_direct(e){g.mandelbrotnavigator_rotate_direct(this.__wbg_ptr,e)}get_bla_epsilon(){return g.mandelbrotnavigator_get_bla_epsilon(this.__wbg_ptr)}set_bla_epsilon(e){g.mandelbrotnavigator_set_bla_epsilon(this.__wbg_ptr,e)}pixel_to_complex(e,r,i,a){const o=g.mandelbrotnavigator_pixel_to_complex(this.__wbg_ptr,e,r,i,a);var s=Qe(o[0],o[1]).slice();return g.__wbindgen_free(o[0],o[1]*4,4),s}translate_direct(e,r){g.mandelbrotnavigator_translate_direct(this.__wbg_ptr,e,r)}use_perturbation(){g.mandelbrotnavigator_use_perturbation(this.__wbg_ptr)}get_approximation_mode(){return g.mandelbrotnavigator_get_approximation_mode(this.__wbg_ptr)}get_reference_orbit_len(){return g.mandelbrotnavigator_get_reference_orbit_len(this.__wbg_ptr)>>>0}compute_bla_reference_ptr(e){const r=g.mandelbrotnavigator_compute_bla_reference_ptr(this.__wbg_ptr,e);return Ee.__wrap(r)}compute_reference_orbit_ptr(e){const r=g.mandelbrotnavigator_compute_reference_orbit_ptr(this.__wbg_ptr,e);return Se.__wrap(r)}get_reference_orbit_capacity(){return g.mandelbrotnavigator_get_reference_orbit_capacity(this.__wbg_ptr)>>>0}compute_reference_orbit_chunk(e,r){const i=g.mandelbrotnavigator_compute_reference_orbit_chunk(this.__wbg_ptr,e,r);return Se.__wrap(i)}constructor(e,r,i,a){const o=ze(e,g.__wbindgen_malloc,g.__wbindgen_realloc),s=pe,l=ze(r,g.__wbindgen_malloc,g.__wbindgen_realloc),u=pe,y=ze(i,g.__wbindgen_malloc,g.__wbindgen_realloc),h=pe,x=g.mandelbrotnavigator_new(o,s,l,u,y,h,a);return this.__wbg_ptr=x>>>0,Rt.register(this,this.__wbg_ptr,this),this}step(){const e=g.mandelbrotnavigator_step(this.__wbg_ptr);var r=Qe(e[0],e[1]).slice();return g.__wbindgen_free(e[0],e[1]*4,4),r}zoom(e){g.mandelbrotnavigator_zoom(this.__wbg_ptr,e)}angle(e){g.mandelbrotnavigator_angle(this.__wbg_ptr,e)}scale(e){const r=ze(e,g.__wbindgen_malloc,g.__wbindgen_realloc),i=pe;g.mandelbrotnavigator_scale(this.__wbg_ptr,r,i)}origin(e,r){const i=ze(e,g.__wbindgen_malloc,g.__wbindgen_realloc),a=pe,o=ze(r,g.__wbindgen_malloc,g.__wbindgen_realloc),s=pe;g.mandelbrotnavigator_origin(this.__wbg_ptr,i,a,o,s)}rotate(e){g.mandelbrotnavigator_rotate(this.__wbg_ptr,e)}use_bla(){g.mandelbrotnavigator_use_bla(this.__wbg_ptr)}translate(e,r){g.mandelbrotnavigator_translate(this.__wbg_ptr,e,r)}}Symbol.dispose&&(et.prototype[Symbol.dispose]=et.prototype.free),typeof FinalizationRegistry>"u"||new FinalizationRegistry(t=>g.__wbg_mandelbrotstep_free(t>>>0,1));const Et=typeof FinalizationRegistry>"u"?{register:()=>{},unregister:()=>{}}:new FinalizationRegistry(t=>g.__wbg_orbitbufferinfo_free(t>>>0,1));class Se{static __wrap(e){e=e>>>0;const r=Object.create(Se.prototype);return r.__wbg_ptr=e,Et.register(r,r.__wbg_ptr,r),r}__destroy_into_raw(){const e=this.__wbg_ptr;return this.__wbg_ptr=0,Et.unregister(this),e}free(){const e=this.__destroy_into_raw();g.__wbg_orbitbufferinfo_free(e,0)}get ptr(){return g.__wbg_get_blabufferinfo_ptr(this.__wbg_ptr)>>>0}set ptr(e){g.__wbg_set_blabufferinfo_ptr(this.__wbg_ptr,e)}get offset(){return g.__wbg_get_blabufferinfo_count(this.__wbg_ptr)>>>0}set offset(e){g.__wbg_set_blabufferinfo_count(this.__wbg_ptr,e)}get count(){return g.__wbg_get_blabufferinfo_levels_ptr(this.__wbg_ptr)>>>0}set count(e){g.__wbg_set_blabufferinfo_levels_ptr(this.__wbg_ptr,e)}}Symbol.dispose&&(Se.prototype[Symbol.dispose]=Se.prototype.free);function Er(t){return Math.exp(t)}function Ar(){return Date.now()}function Dr(t,e){throw new Error(kt(t,e))}function Pr(t,e){return kt(t,e)}function Fr(){const t=g.__wbindgen_export_0,e=t.grow(4);t.set(0,void 0),t.set(e+0,void 0),t.set(e+1,null),t.set(e+2,!0),t.set(e+3,!1)}URL=globalThis.URL;const f=await Cr({"./mandelbrot_bg.js":{__wbg_now_1e80617bcee43265:Ar,__wbg_exp_9293ded1248e1bd3:Er,__wbg_wbindgenthrow_451ec1a8469d7eb6:Dr,__wbindgen_init_externref_table:Fr,__wbindgen_cast_2241b6af4c4b2941:Pr}},ja),qe=f.memory,Gr=f.__wbg_blabufferinfo_free,Ir=f.__wbg_blalevel_free,Or=f.__wbg_blastep_free,Ur=f.__wbg_get_blabufferinfo_count,Nr=f.__wbg_get_blabufferinfo_level_count,Vr=f.__wbg_get_blabufferinfo_levels_ptr,qr=f.__wbg_get_blabufferinfo_ptr,Hr=f.__wbg_get_blastep_ax,Wr=f.__wbg_get_blastep_ay,Yr=f.__wbg_get_blastep_bx,$r=f.__wbg_get_blastep_by,jr=f.__wbg_get_blastep_radius_alpha,Xr=f.__wbg_get_blastep_radius_beta,Zr=f.__wbg_mandelbrotnavigator_free,Kr=f.__wbg_mandelbrotstep_free,Jr=f.__wbg_orbitbufferinfo_free,Qr=f.__wbg_set_blabufferinfo_count,ei=f.__wbg_set_blabufferinfo_level_count,ti=f.__wbg_set_blabufferinfo_levels_ptr,ri=f.__wbg_set_blabufferinfo_ptr,ii=f.__wbg_set_blastep_ax,ai=f.__wbg_set_blastep_ay,oi=f.__wbg_set_blastep_bx,ni=f.__wbg_set_blastep_by,si=f.__wbg_set_blastep_radius_alpha,li=f.__wbg_set_blastep_radius_beta,ci=f.mandelbrotnavigator_angle,ui=f.mandelbrotnavigator_compute_bla_reference_ptr,di=f.mandelbrotnavigator_compute_reference_orbit_chunk,fi=f.mandelbrotnavigator_compute_reference_orbit_ptr,pi=f.mandelbrotnavigator_get_approximation_mode,hi=f.mandelbrotnavigator_get_bla_epsilon,gi=f.mandelbrotnavigator_get_params,_i=f.mandelbrotnavigator_get_reference_orbit_capacity,vi=f.mandelbrotnavigator_get_reference_orbit_len,mi=f.mandelbrotnavigator_new,bi=f.mandelbrotnavigator_origin,xi=f.mandelbrotnavigator_pixel_to_complex,yi=f.mandelbrotnavigator_rotate,wi=f.mandelbrotnavigator_rotate_direct,zi=f.mandelbrotnavigator_scale,Si=f.mandelbrotnavigator_set_bla_epsilon,Mi=f.mandelbrotnavigator_step,Ti=f.mandelbrotnavigator_translate,Ci=f.mandelbrotnavigator_translate_direct,Bi=f.mandelbrotnavigator_use_bla,ki=f.mandelbrotnavigator_use_perturbation,Li=f.mandelbrotnavigator_zoom,Ri=f.__wbg_set_blalevel__padding,Ei=f.__wbg_set_blalevel_count,Ai=f.__wbg_set_blalevel_offset,Di=f.__wbg_set_blalevel_skip,Pi=f.__wbg_set_mandelbrotstep_dx,Fi=f.__wbg_set_mandelbrotstep_dy,Gi=f.__wbg_set_mandelbrotstep_zx,Ii=f.__wbg_set_mandelbrotstep_zy,Oi=f.__wbg_set_orbitbufferinfo_count,Ui=f.__wbg_set_orbitbufferinfo_offset,Ni=f.__wbg_set_orbitbufferinfo_ptr,Vi=f.__wbg_get_blalevel__padding,qi=f.__wbg_get_blalevel_count,Hi=f.__wbg_get_blalevel_offset,Wi=f.__wbg_get_blalevel_skip,Yi=f.__wbg_get_orbitbufferinfo_count,$i=f.__wbg_get_orbitbufferinfo_offset,ji=f.__wbg_get_orbitbufferinfo_ptr,Xi=f.__wbg_get_mandelbrotstep_dx,Zi=f.__wbg_get_mandelbrotstep_dy,Ki=f.__wbg_get_mandelbrotstep_zx,Ji=f.__wbg_get_mandelbrotstep_zy,Qi=f.__wbindgen_export_0,ea=f.__externref_drop_slice,ta=f.__wbindgen_free,ra=f.__wbindgen_malloc,ia=f.__wbindgen_realloc,At=f.__wbindgen_start,aa=Object.freeze(Object.defineProperty({__proto__:null,__externref_drop_slice:ea,__wbg_blabufferinfo_free:Gr,__wbg_blalevel_free:Ir,__wbg_blastep_free:Or,__wbg_get_blabufferinfo_count:Ur,__wbg_get_blabufferinfo_level_count:Nr,__wbg_get_blabufferinfo_levels_ptr:Vr,__wbg_get_blabufferinfo_ptr:qr,__wbg_get_blalevel__padding:Vi,__wbg_get_blalevel_count:qi,__wbg_get_blalevel_offset:Hi,__wbg_get_blalevel_skip:Wi,__wbg_get_blastep_ax:Hr,__wbg_get_blastep_ay:Wr,__wbg_get_blastep_bx:Yr,__wbg_get_blastep_by:$r,__wbg_get_blastep_radius_alpha:jr,__wbg_get_blastep_radius_beta:Xr,__wbg_get_mandelbrotstep_dx:Xi,__wbg_get_mandelbrotstep_dy:Zi,__wbg_get_mandelbrotstep_zx:Ki,__wbg_get_mandelbrotstep_zy:Ji,__wbg_get_orbitbufferinfo_count:Yi,__wbg_get_orbitbufferinfo_offset:$i,__wbg_get_orbitbufferinfo_ptr:ji,__wbg_mandelbrotnavigator_free:Zr,__wbg_mandelbrotstep_free:Kr,__wbg_orbitbufferinfo_free:Jr,__wbg_set_blabufferinfo_count:Qr,__wbg_set_blabufferinfo_level_count:ei,__wbg_set_blabufferinfo_levels_ptr:ti,__wbg_set_blabufferinfo_ptr:ri,__wbg_set_blalevel__padding:Ri,__wbg_set_blalevel_count:Ei,__wbg_set_blalevel_offset:Ai,__wbg_set_blalevel_skip:Di,__wbg_set_blastep_ax:ii,__wbg_set_blastep_ay:ai,__wbg_set_blastep_bx:oi,__wbg_set_blastep_by:ni,__wbg_set_blastep_radius_alpha:si,__wbg_set_blastep_radius_beta:li,__wbg_set_mandelbrotstep_dx:Pi,__wbg_set_mandelbrotstep_dy:Fi,__wbg_set_mandelbrotstep_zx:Gi,__wbg_set_mandelbrotstep_zy:Ii,__wbg_set_orbitbufferinfo_count:Oi,__wbg_set_orbitbufferinfo_offset:Ui,__wbg_set_orbitbufferinfo_ptr:Ni,__wbindgen_export_0:Qi,__wbindgen_free:ta,__wbindgen_malloc:ra,__wbindgen_realloc:ia,__wbindgen_start:At,mandelbrotnavigator_angle:ci,mandelbrotnavigator_compute_bla_reference_ptr:ui,mandelbrotnavigator_compute_reference_orbit_chunk:di,mandelbrotnavigator_compute_reference_orbit_ptr:fi,mandelbrotnavigator_get_approximation_mode:pi,mandelbrotnavigator_get_bla_epsilon:hi,mandelbrotnavigator_get_params:gi,mandelbrotnavigator_get_reference_orbit_capacity:_i,mandelbrotnavigator_get_reference_orbit_len:vi,mandelbrotnavigator_new:mi,mandelbrotnavigator_origin:bi,mandelbrotnavigator_pixel_to_complex:xi,mandelbrotnavigator_rotate:yi,mandelbrotnavigator_rotate_direct:wi,mandelbrotnavigator_scale:zi,mandelbrotnavigator_set_bla_epsilon:Si,mandelbrotnavigator_step:Mi,mandelbrotnavigator_translate:Ti,mandelbrotnavigator_translate_direct:Ci,mandelbrotnavigator_use_bla:Bi,mandelbrotnavigator_use_perturbation:ki,mandelbrotnavigator_zoom:Li,memory:qe},Symbol.toStringTag,{value:"Module"}));Br(aa),At();class oa{constructor(e=1024,r=1024){n(this,"video");n(this,"stream",null);n(this,"width");n(this,"height");n(this,"lastDrawTime",0);this.width=e,this.height=r,this.video=document.createElement("video"),this.video.autoplay=!0,this.video.width=e,this.video.height=r}async openWebcam(){this.stream||(this.stream=await navigator.mediaDevices.getUserMedia({video:{width:this.width,height:this.height}}),this.video.srcObject=this.stream,await this.video.play())}async drawWebGPUTexture(e,r){const i=performance.now();if(i-this.lastDrawTime>15){if(this.video.readyState<HTMLMediaElement.HAVE_CURRENT_DATA)return;r.queue.copyExternalImageToTexture({source:this.video},{texture:e},[this.width,this.height]),this.lastDrawTime=i}}closeWebcam(){this.stream&&(this.stream.getTracks().forEach(e=>e.stop()),this.stream=null)}}function Me(t,e,r){t.prototype=e.prototype=r,r.constructor=t}function Ae(t,e){var r=Object.create(t.prototype);for(var i in e)r[i]=e[i];return r}function he(){}var ve=.7,Te=1/ve,Ce="\\s*([+-]?\\d+)\\s*",De="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*",ie="\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*",na=/^#([0-9a-f]{3,8})$/,sa=new RegExp(`^rgb\\(${Ce},${Ce},${Ce}\\)$`),la=new RegExp(`^rgb\\(${ie},${ie},${ie}\\)$`),ca=new RegExp(`^rgba\\(${Ce},${Ce},${Ce},${De}\\)$`),ua=new RegExp(`^rgba\\(${ie},${ie},${ie},${De}\\)$`),da=new RegExp(`^hsl\\(${De},${ie},${ie}\\)$`),fa=new RegExp(`^hsla\\(${De},${ie},${ie},${De}\\)$`),Dt={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074};Me(he,tt,{copy(t){return Object.assign(new this.constructor,this,t)},displayable(){return this.rgb().displayable()},hex:Pt,formatHex:Pt,formatHex8:pa,formatHsl:ha,formatRgb:Ft,toString:Ft});function Pt(){return this.rgb().formatHex()}function pa(){return this.rgb().formatHex8()}function ha(){return Nt(this).formatHsl()}function Ft(){return this.rgb().formatRgb()}function tt(t){var e,r;return t=(t+"").trim().toLowerCase(),(e=na.exec(t))?(r=e[1].length,e=parseInt(e[1],16),r===6?Gt(e):r===3?new q(e>>8&15|e>>4&240,e>>4&15|e&240,(e&15)<<4|e&15,1):r===8?He(e>>24&255,e>>16&255,e>>8&255,(e&255)/255):r===4?He(e>>12&15|e>>8&240,e>>8&15|e>>4&240,e>>4&15|e&240,((e&15)<<4|e&15)/255):null):(e=sa.exec(t))?new q(e[1],e[2],e[3],1):(e=la.exec(t))?new q(e[1]*255/100,e[2]*255/100,e[3]*255/100,1):(e=ca.exec(t))?He(e[1],e[2],e[3],e[4]):(e=ua.exec(t))?He(e[1]*255/100,e[2]*255/100,e[3]*255/100,e[4]):(e=da.exec(t))?Ut(e[1],e[2]/100,e[3]/100,1):(e=fa.exec(t))?Ut(e[1],e[2]/100,e[3]/100,e[4]):Dt.hasOwnProperty(t)?Gt(Dt[t]):t==="transparent"?new q(NaN,NaN,NaN,0):null}function Gt(t){return new q(t>>16&255,t>>8&255,t&255,1)}function He(t,e,r,i){return i<=0&&(t=e=r=NaN),new q(t,e,r,i)}function rt(t){return t instanceof he||(t=tt(t)),t?(t=t.rgb(),new q(t.r,t.g,t.b,t.opacity)):new q}function ge(t,e,r,i){return arguments.length===1?rt(t):new q(t,e,r,i??1)}function q(t,e,r,i){this.r=+t,this.g=+e,this.b=+r,this.opacity=+i}Me(q,ge,Ae(he,{brighter(t){return t=t==null?Te:Math.pow(Te,t),new q(this.r*t,this.g*t,this.b*t,this.opacity)},darker(t){return t=t==null?ve:Math.pow(ve,t),new q(this.r*t,this.g*t,this.b*t,this.opacity)},rgb(){return this},clamp(){return new q(me(this.r),me(this.g),me(this.b),We(this.opacity))},displayable(){return-.5<=this.r&&this.r<255.5&&-.5<=this.g&&this.g<255.5&&-.5<=this.b&&this.b<255.5&&0<=this.opacity&&this.opacity<=1},hex:It,formatHex:It,formatHex8:ga,formatRgb:Ot,toString:Ot}));function It(){return`#${be(this.r)}${be(this.g)}${be(this.b)}`}function ga(){return`#${be(this.r)}${be(this.g)}${be(this.b)}${be((isNaN(this.opacity)?1:this.opacity)*255)}`}function Ot(){const t=We(this.opacity);return`${t===1?"rgb(":"rgba("}${me(this.r)}, ${me(this.g)}, ${me(this.b)}${t===1?")":`, ${t})`}`}function We(t){return isNaN(t)?1:Math.max(0,Math.min(1,t))}function me(t){return Math.max(0,Math.min(255,Math.round(t)||0))}function be(t){return t=me(t),(t<16?"0":"")+t.toString(16)}function Ut(t,e,r,i){return i<=0?t=e=r=NaN:r<=0||r>=1?t=e=NaN:e<=0&&(t=NaN),new re(t,e,r,i)}function Nt(t){if(t instanceof re)return new re(t.h,t.s,t.l,t.opacity);if(t instanceof he||(t=tt(t)),!t)return new re;if(t instanceof re)return t;t=t.rgb();var e=t.r/255,r=t.g/255,i=t.b/255,a=Math.min(e,r,i),o=Math.max(e,r,i),s=NaN,l=o-a,u=(o+a)/2;return l?(e===o?s=(r-i)/l+(r<i)*6:r===o?s=(i-e)/l+2:s=(e-r)/l+4,l/=u<.5?o+a:2-o-a,s*=60):l=u>0&&u<1?0:s,new re(s,l,u,t.opacity)}function it(t,e,r,i){return arguments.length===1?Nt(t):new re(t,e,r,i??1)}function re(t,e,r,i){this.h=+t,this.s=+e,this.l=+r,this.opacity=+i}Me(re,it,Ae(he,{brighter(t){return t=t==null?Te:Math.pow(Te,t),new re(this.h,this.s,this.l*t,this.opacity)},darker(t){return t=t==null?ve:Math.pow(ve,t),new re(this.h,this.s,this.l*t,this.opacity)},rgb(){var t=this.h%360+(this.h<0)*360,e=isNaN(t)||isNaN(this.s)?0:this.s,r=this.l,i=r+(r<.5?r:1-r)*e,a=2*r-i;return new q(at(t>=240?t-240:t+120,a,i),at(t,a,i),at(t<120?t+240:t-120,a,i),this.opacity)},clamp(){return new re(Vt(this.h),Ye(this.s),Ye(this.l),We(this.opacity))},displayable(){return(0<=this.s&&this.s<=1||isNaN(this.s))&&0<=this.l&&this.l<=1&&0<=this.opacity&&this.opacity<=1},formatHsl(){const t=We(this.opacity);return`${t===1?"hsl(":"hsla("}${Vt(this.h)}, ${Ye(this.s)*100}%, ${Ye(this.l)*100}%${t===1?")":`, ${t})`}`}}));function Vt(t){return t=(t||0)%360,t<0?t+360:t}function Ye(t){return Math.max(0,Math.min(1,t||0))}function at(t,e,r){return(t<60?e+(r-e)*t/60:t<180?r:t<240?e+(r-e)*(240-t)/60:e)*255}const qt=Math.PI/180,Ht=180/Math.PI,$e=18,Wt=.96422,Yt=1,$t=.82521,jt=4/29,Be=6/29,Xt=3*Be*Be,_a=Be*Be*Be;function Zt(t){if(t instanceof ae)return new ae(t.l,t.a,t.b,t.opacity);if(t instanceof le)return Kt(t);t instanceof q||(t=rt(t));var e=ct(t.r),r=ct(t.g),i=ct(t.b),a=nt((.2225045*e+.7168786*r+.0606169*i)/Yt),o,s;return e===r&&r===i?o=s=a:(o=nt((.4360747*e+.3850649*r+.1430804*i)/Wt),s=nt((.0139322*e+.0971045*r+.7141733*i)/$t)),new ae(116*a-16,500*(o-a),200*(a-s),t.opacity)}function ot(t,e,r,i){return arguments.length===1?Zt(t):new ae(t,e,r,i??1)}function ae(t,e,r,i){this.l=+t,this.a=+e,this.b=+r,this.opacity=+i}Me(ae,ot,Ae(he,{brighter(t){return new ae(this.l+$e*(t??1),this.a,this.b,this.opacity)},darker(t){return new ae(this.l-$e*(t??1),this.a,this.b,this.opacity)},rgb(){var t=(this.l+16)/116,e=isNaN(this.a)?t:t+this.a/500,r=isNaN(this.b)?t:t-this.b/200;return e=Wt*st(e),t=Yt*st(t),r=$t*st(r),new q(lt(3.1338561*e-1.6168667*t-.4906146*r),lt(-.9787684*e+1.9161415*t+.033454*r),lt(.0719453*e-.2289914*t+1.4052427*r),this.opacity)}}));function nt(t){return t>_a?Math.pow(t,1/3):t/Xt+jt}function st(t){return t>Be?t*t*t:Xt*(t-jt)}function lt(t){return 255*(t<=.0031308?12.92*t:1.055*Math.pow(t,1/2.4)-.055)}function ct(t){return(t/=255)<=.04045?t/12.92:Math.pow((t+.055)/1.055,2.4)}function va(t){if(t instanceof le)return new le(t.h,t.c,t.l,t.opacity);if(t instanceof ae||(t=Zt(t)),t.a===0&&t.b===0)return new le(NaN,0<t.l&&t.l<100?0:NaN,t.l,t.opacity);var e=Math.atan2(t.b,t.a)*Ht;return new le(e<0?e+360:e,Math.sqrt(t.a*t.a+t.b*t.b),t.l,t.opacity)}function ut(t,e,r,i){return arguments.length===1?va(t):new le(t,e,r,i??1)}function le(t,e,r,i){this.h=+t,this.c=+e,this.l=+r,this.opacity=+i}function Kt(t){if(isNaN(t.h))return new ae(t.l,0,0,t.opacity);var e=t.h*qt;return new ae(t.l,Math.cos(e)*t.c,Math.sin(e)*t.c,t.opacity)}Me(le,ut,Ae(he,{brighter(t){return new le(this.h,this.c,this.l+$e*(t??1),this.opacity)},darker(t){return new le(this.h,this.c,this.l-$e*(t??1),this.opacity)},rgb(){return Kt(this).rgb()}}));var Jt=-.14861,dt=1.78277,ft=-.29227,je=-.90649,Pe=1.97294,Qt=Pe*je,er=Pe*dt,tr=dt*ft-je*Jt;function ma(t){if(t instanceof xe)return new xe(t.h,t.s,t.l,t.opacity);t instanceof q||(t=rt(t));var e=t.r/255,r=t.g/255,i=t.b/255,a=(tr*i+Qt*e-er*r)/(tr+Qt-er),o=i-a,s=(Pe*(r-a)-ft*o)/je,l=Math.sqrt(s*s+o*o)/(Pe*a*(1-a)),u=l?Math.atan2(s,o)*Ht-120:NaN;return new xe(u<0?u+360:u,l,a,t.opacity)}function pt(t,e,r,i){return arguments.length===1?ma(t):new xe(t,e,r,i??1)}function xe(t,e,r,i){this.h=+t,this.s=+e,this.l=+r,this.opacity=+i}Me(xe,pt,Ae(he,{brighter(t){return t=t==null?Te:Math.pow(Te,t),new xe(this.h,this.s,this.l*t,this.opacity)},darker(t){return t=t==null?ve:Math.pow(ve,t),new xe(this.h,this.s,this.l*t,this.opacity)},rgb(){var t=isNaN(this.h)?0:(this.h+120)*qt,e=+this.l,r=isNaN(this.s)?0:this.s*e*(1-e),i=Math.cos(t),a=Math.sin(t);return new q(255*(e+r*(Jt*i+dt*a)),255*(e+r*(ft*i+je*a)),255*(e+r*(Pe*i)),this.opacity)}}));const ht=t=>()=>t;function rr(t,e){return function(r){return t+r*e}}function ba(t,e,r){return t=Math.pow(t,r),e=Math.pow(e,r)-t,r=1/r,function(i){return Math.pow(t+i*e,r)}}function gt(t,e){var r=e-t;return r?rr(t,r>180||r<-180?r-360*Math.round(r/360):r):ht(isNaN(t)?e:t)}function xa(t){return(t=+t)==1?j:function(e,r){return r-e?ba(e,r,t):ht(isNaN(e)?r:e)}}function j(t,e){var r=e-t;return r?rr(t,r):ht(isNaN(t)?e:t)}const ya=(function t(e){var r=xa(e);function i(a,o){var s=r((a=ge(a)).r,(o=ge(o)).r),l=r(a.g,o.g),u=r(a.b,o.b),y=j(a.opacity,o.opacity);return function(h){return a.r=s(h),a.g=l(h),a.b=u(h),a.opacity=y(h),a+""}}return i.gamma=t,i})(1);function wa(t){return function(e,r){var i=t((e=it(e)).h,(r=it(r)).h),a=j(e.s,r.s),o=j(e.l,r.l),s=j(e.opacity,r.opacity);return function(l){return e.h=i(l),e.s=a(l),e.l=o(l),e.opacity=s(l),e+""}}}const za=wa(gt);function ir(t,e){var r=j((t=ot(t)).l,(e=ot(e)).l),i=j(t.a,e.a),a=j(t.b,e.b),o=j(t.opacity,e.opacity);return function(s){return t.l=r(s),t.a=i(s),t.b=a(s),t.opacity=o(s),t+""}}function Sa(t){return function(e,r){var i=t((e=ut(e)).h,(r=ut(r)).h),a=j(e.c,r.c),o=j(e.l,r.l),s=j(e.opacity,r.opacity);return function(l){return e.h=i(l),e.c=a(l),e.l=o(l),e.opacity=s(l),e+""}}}const Ma=Sa(gt);function ar(t){return(function e(r){r=+r;function i(a,o){var s=t((a=pt(a)).h,(o=pt(o)).h),l=j(a.s,o.s),u=j(a.l,o.l),y=j(a.opacity,o.opacity);return function(h){return a.h=s(h),a.s=l(h),a.l=u(Math.pow(h,r)),a.opacity=y(h),a+""}}return i.gamma=e,i})(1)}const Ta=ar(gt);ar(j);const Ca=["linear","gaussian","square","exponential"];function Ba(t){return typeof t=="string"&&Ca.includes(t)}function _t(t){return Ba(t.transferCurve)?t.transferCurve:"linear"}function vt(t,e){const r=ka(e);switch(t){case"gaussian":{if(r<=.28)return 0;if(r>=.72)return 1;const i=(r-.28)/(.72-.28);return i*i*(3-2*i)}case"square":return r<=0?0:1;case"exponential":return(Math.exp(3*r)-1)/(Math.exp(3)-1);default:return r}}const mt={palette:1,zebra:0,tessellation:0,shading:0,skybox:0,webcam:0,smoothness:1,stripeAverage:0,rotationMean:0,stripeRelief:0,directionCoherenceRelief:0,shadingLevel:1.5,specularPower:20,lightAngle:.75,metallic:0,roughness:.35,anisotropy:.4,iridescencePower:1};function ce(t,e){return t[e]??mt[e]}function ka(t){return Math.max(0,Math.min(1,t))}const La={lab:ir,rgb:ya,hcl:Ma,hsl:za,cubehelix:Ta},or=4096,Ra=6;function Ea(t,e,r,i){const a=ce(t,r),o=ce(e,r);return a+(o-a)*i}function nr(t,e){return t[e]??null}class sr{constructor(e,r="lab"){n(this,"points");n(this,"interpolate");this.points=e.slice().sort((i,a)=>i.position-a.position),this.interpolate=La[r]??ir}getColorAt(e){if(this.points.length===0)return"#000";if(e<=this.points[0].position)return this.points[0].color;if(e>=this.points[this.points.length-1].position)return this.points[this.points.length-1].color;for(let r=0;r<this.points.length-1;++r){const i=this.points[r],a=this.points[r+1];if(e>=i.position&&e<=a.position){const o=(e-i.position)/(a.position-i.position),s=vt(_t(i),o),l=this.interpolate(i.color,a.color);return ge(l(s)).formatHex()}}return"#000"}getEffectAt(e,r){if(this.points.length===0)return mt[r];if(e<=this.points[0].position)return ce(this.points[0],r);if(e>=this.points[this.points.length-1].position)return ce(this.points[this.points.length-1],r);for(let i=0;i<this.points.length-1;++i){const a=this.points[i],o=this.points[i+1];if(e>=a.position&&e<=o.position){const s=(e-a.position)/(o.position-a.position),l=vt(_t(a),s);return Ea(a,o,r,l)}}return mt[r]}getIridescenceAt(e){if(this.points.length===0)return{color:"#000000",strength:0};if(this.points.length===1)return{color:this.points[0].iridescenceColor??this.points[0].color,strength:this.points[0].iridescenceColor?ce(this.points[0],"iridescencePower"):0};const r=this.points[0],i=this.points[this.points.length-1];if(e<=r.position)return{color:r.iridescenceColor??r.color,strength:r.iridescenceColor?ce(r,"iridescencePower"):0};if(e>=i.position)return{color:i.iridescenceColor??i.color,strength:i.iridescenceColor?ce(i,"iridescencePower"):0};for(let a=0;a<this.points.length-1;++a){const o=this.points[a],s=this.points[a+1];if(e>=o.position&&e<=s.position){const l=(e-o.position)/(s.position-o.position),u=vt(_t(o),l),y=nr(o,"iridescenceColor"),h=nr(s,"iridescenceColor");if(!y&&!h)return{color:"#000000",strength:0};const x=y??o.color,w=h??s.color,p=y?ce(o,"iridescencePower"):0,b=h?ce(s,"iridescencePower"):0,c=p+(b-p)*u;return{color:ge(this.interpolate(x,w)(u)).formatHex(),strength:c}}}return{color:"#000000",strength:0}}generateTexture(){const e=or,r=Ra,i=new Float32Array(e*r*4);for(let a=0;a<e;++a){const o=a/(e-1),s=ge(this.getColorAt(o)),l=(0*e+a)*4;i[l]=(s.r??0)/255,i[l+1]=(s.g??0)/255,i[l+2]=(s.b??0)/255,i[l+3]=this.getEffectAt(o,"palette");const u=(1*e+a)*4;i[u]=this.getEffectAt(o,"zebra"),i[u+1]=this.getEffectAt(o,"tessellation"),i[u+2]=this.getEffectAt(o,"shading"),i[u+3]=this.getEffectAt(o,"skybox");const y=(2*e+a)*4;i[y]=this.getEffectAt(o,"webcam"),i[y+1]=this.getEffectAt(o,"smoothness"),i[y+2]=this.getEffectAt(o,"shadingLevel"),i[y+3]=this.getEffectAt(o,"specularPower");const h=(3*e+a)*4;i[h]=this.getEffectAt(o,"lightAngle"),i[h+1]=this.getEffectAt(o,"metallic"),i[h+2]=this.getEffectAt(o,"roughness"),i[h+3]=this.getEffectAt(o,"anisotropy");const x=this.getIridescenceAt(o),w=ge(x.color),p=(4*e+a)*4;i[p]=(w.r??0)/255,i[p+1]=(w.g??0)/255,i[p+2]=(w.b??0)/255,i[p+3]=Math.max(0,Math.min(1,x.strength));const b=(5*e+a)*4;i[b]=this.getEffectAt(o,"stripeAverage"),i[b+1]=this.getEffectAt(o,"rotationMean"),i[b+2]=this.getEffectAt(o,"stripeRelief"),i[b+3]=this.getEffectAt(o,"directionCoherenceRelief")}return{data:i,width:e,height:r}}generateThumbnailRow(){const e=or,r=new ImageData(e,1),i=r.data;for(let a=0;a<e;++a){const o=a/(e-1),s=ge(this.getColorAt(o)),l=a*4;i[l]=Math.max(0,Math.min(255,Math.round(s.r??0))),i[l+1]=Math.max(0,Math.min(255,Math.round(s.g??0))),i[l+2]=Math.max(0,Math.min(255,Math.round(s.b??0))),i[l+3]=255}return r}}const ke=8,Aa=4096,Da=2,Xe=100,Pa=1e4,Fa=1e-6,Ga=5e6,bt=10,lr=.25,xt=3,Ia=3,Ze=.001,Oa=100;function Ua(t){const e=Math.max(1,Math.floor(t));return 2**Math.floor(Math.log2(e))}function Na(t){return t.some(e=>(e.stripeAverage??0)>Ze||(e.rotationMean??0)>Ze||(e.stripeRelief??0)>Ze||(e.directionCoherenceRelief??0)>Ze)}const cr=new Float32Array(1),Va=new Uint32Array(cr.buffer);function qa(t){cr[0]=t;const e=Va[0],r=e>>>16&32768,i=(e>>>23&255)-127,a=e&8388607;if(i>=16)return r|31744;if(i>=-14){const o=i+15;return r|o<<10|a>>>13}if(i>=-24){const o=-14-i;return r|(a|8388608)>>>13+o}return r}function ur(t){const e=new Uint16Array(t.length);for(let r=0;r<t.length;++r)e[r]=qa(t[r]);return e}const X=class X{constructor(e,r){n(this,"snapshotCallback");n(this,"snapshotDestWidth");n(this,"canvas");n(this,"device");n(this,"queue");n(this,"adapter");n(this,"ctx");n(this,"format");n(this,"mandelbrotNavigator");n(this,"rawTexture");n(this,"rawArrayView");n(this,"rawLayerViews",[]);n(this,"rawBrushTexture");n(this,"rawBrushArrayView");n(this,"rawBrushLayerViews",[]);n(this,"resolvedTexture");n(this,"resolvedArrayView");n(this,"resolvedLayerViews",[]);n(this,"frozenTexture");n(this,"frozenArrayView");n(this,"frozenLayerViews",[]);n(this,"pipelineMerge");n(this,"bindGroupMerge");n(this,"uniformBufferMerge");n(this,"uniformBufferMandelbrot");n(this,"uniformBufferColor");n(this,"uniformBufferBrush");n(this,"uniformBufferResolve");n(this,"mandelbrotReferenceBuffer");n(this,"mandelbrotBlaBuffer");n(this,"mandelbrotBlaLevelBuffer");n(this,"mandelbrotBlaBufferCapacity",0);n(this,"mandelbrotBlaLevelBufferCapacity",0);n(this,"pipelineBrush");n(this,"bindGroupBrush");n(this,"pipelineMandelbrot");n(this,"bindGroupMandelbrot");n(this,"pipelineResolve");n(this,"bindGroupResolve");n(this,"pipelineColor");n(this,"bindGroupColor");n(this,"pipelineCount");n(this,"counterBuffer");n(this,"counterReadbackSlots",[]);n(this,"counterReadbackWriteIndex",0);n(this,"counterReadbackSequence",0);n(this,"latestAppliedCounterReadbackSequence",0);n(this,"counterReadbackGeneration",0);n(this,"renderFrameSerial",0);n(this,"lastCounterDispatchFrame",-xt);n(this,"counterBindGroup");n(this,"uniformBufferCount");n(this,"unfinishedPixelCount",-1);n(this,"activePixelCount",-1);n(this,"_rafId",null);n(this,"_drawFn",null);n(this,"fps",0);n(this,"isRendering",!1);n(this,"gpuFrameTimeMs",0);n(this,"smoothedGpuTimeMs",0);n(this,"pendingGpuTiming",!1);n(this,"refinementWasGated",!1);n(this,"_fpsFrameCount",0);n(this,"_fpsLastTime",0);n(this,"neutralSize",0);n(this,"shaderPassCompute");n(this,"shaderPassColor");n(this,"width",0);n(this,"height",0);n(this,"antialiasLevel");n(this,"palettePeriod");n(this,"previousMandelbrot");n(this,"previousRenderOptions");n(this,"previousOrbitMetricsEnabled");n(this,"needRender",!0);n(this,"orbitIncomplete",!1);n(this,"prevGuardedMaxIter",0);n(this,"currentGuardedMaxIter",0);n(this,"currentMaxIterations",0);n(this,"currentBlaLevelCount",0);n(this,"mandelbrotReference",new Float32Array(1e6));n(this,"approximationMode","perturbation");n(this,"blaEpsilon",Fa);n(this,"prevFrameMandelbrot");n(this,"clearHistoryNextFrame",!1);n(this,"cumulativeShiftX",0);n(this,"cumulativeShiftY",0);n(this,"zoomMagnificationThreshold",16);n(this,"zoomFactor",1);n(this,"frozenScale",0);n(this,"liveScale",0);n(this,"liveZoomFactor",1);n(this,"zoomReprojectionActive",!1);n(this,"needFreezeSnapshot",!1);n(this,"needMergeSnapshot",!1);n(this,"mergeUniforms",{zf:1,lzf:1,frozenShiftU:0,frozenShiftV:0,aspect:1,angle:0});n(this,"frozenAligned",!1);n(this,"zoomingIn",!0);n(this,"iterationBatchSize",Xe);n(this,"tileTexture");n(this,"tileTextureView");n(this,"skyboxTexture");n(this,"skyboxTextureView");n(this,"tileTextureSourceKey");n(this,"skyboxTextureSourceKey");n(this,"paletteTexture");n(this,"paletteTextureView");n(this,"paletteSampler");n(this,"skyboxSampler");n(this,"webcamTexture");n(this,"webcamTileTexture");n(this,"webcamTextureView");n(this,"webcamEnabled",!0);n(this,"time",0);n(this,"lastUpdateTime",0);n(this,"dprMultiplier",1);n(this,"targetFps",60);n(this,"gpuLoadMultiplier",1);this.canvas=e,this.shaderPassCompute=_e,this.shaderPassColor=se,this.antialiasLevel=r.antialiasLevel,this.palettePeriod=r.palettePeriod,this.time=0}async initialize(e){if(this.mandelbrotNavigator=e,this.approximationMode=this.mandelbrotNavigator.get_approximation_mode()===1?"bla":"perturbation",this.blaEpsilon=this.mandelbrotNavigator.get_bla_epsilon(),!navigator.gpu)throw new Error("WebGPU non support\xE9");if(this.adapter=await navigator.gpu.requestAdapter(),!this.adapter)throw new Error("Adapter WebGPU introuvable");this.device=await this.adapter.requestDevice(),this.device.label="Engine Device",this.queue=this.device.queue,this.queue.label="Engine Queue",this.ctx=this.canvas.getContext("webgpu"),this.format=navigator.gpu.getPreferredCanvasFormat(),this.ctx.configure({device:this.device,format:this.format,alphaMode:"opaque"});const[r,i]=await Promise.all([X._tileTexture?Promise.resolve(X._tileTexture):this._loadTexture(Xa),X._skyboxTexture?Promise.resolve(X._skyboxTexture):this._loadTexture(Za)]);X._tileTexture=r,this.tileTexture=r,this.tileTextureView=this.tileTexture.createView(),X._skyboxTexture=i,this.skyboxTexture=i,this.skyboxTextureView=this.skyboxTexture.createView();const a=new sr([]).generateTexture(),o=ur(a.data);this.paletteTexture=this.device.createTexture({size:[a.width,a.height,1],format:"rgba16float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine PaletteTexture"}),this.device.queue.writeTexture({texture:this.paletteTexture},o.buffer,{bytesPerRow:a.width*8},[a.width,a.height]),this.paletteTextureView=this.paletteTexture.createView(),this.paletteSampler=this.device.createSampler({magFilter:"linear",minFilter:"linear",addressModeU:"repeat",addressModeV:"clamp-to-edge"}),this.skyboxSampler=this.device.createSampler({magFilter:"linear",minFilter:"linear",addressModeU:"repeat",addressModeV:"repeat"}),this.webcamTexture=new oa(1920,1080),this.webcamTileTexture=this.device.createTexture({size:[1920,1080,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT}),this.webcamTextureView=this.webcamTileTexture.createView(),this.uniformBufferMandelbrot=this.device.createBuffer({size:80,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Mandelbrot"}),this.uniformBufferColor=this.device.createBuffer({size:128,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Color"}),this.uniformBufferBrush=this.device.createBuffer({size:48,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Brush"}),this.uniformBufferResolve=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Resolve"}),this.mandelbrotReferenceBuffer=this.device.createBuffer({size:4*1e6,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot Orbit ReferenceStorage Buffer"}),this.mandelbrotBlaBuffer=this.device.createBuffer({size:24,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot BLA Storage Buffer"}),this.mandelbrotBlaLevelBuffer=this.device.createBuffer({size:16,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot BLA Level Storage Buffer"}),this.mandelbrotBlaBufferCapacity=1,this.mandelbrotBlaLevelBufferCapacity=1,this.counterBuffer=this.device.createBuffer({size:8,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC|GPUBufferUsage.COPY_DST,label:"Engine Counter Storage"}),this.counterReadbackSlots=Array.from({length:Ia},(s,l)=>({buffer:this.device.createBuffer({size:8,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,label:`Engine Counter Readback ${l}`}),pending:!1,sequence:0,generation:0})),this.uniformBufferCount=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Count"}),this.uniformBufferMerge=this.device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST,label:"Engine UniformBuffer Merge"}),await this._createPipelines(),this.resize()}async _createPipelines(){const e=this.device.createShaderModule({code:ye,label:"Engine ShaderModule Brush"}),r=this.device.createShaderModule({code:this.shaderPassCompute,label:"Engine ShaderModule Compute"}),i=this.device.createShaderModule({code:Sr,label:"Engine ShaderModule Resolve"}),a=this.device.createShaderModule({code:this.shaderPassColor,label:"Engine ShaderModule Color"}),o=this.device.createShaderModule({code:Mr,label:"Engine ShaderModule Count"}),s=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Brush"}),l=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:3,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"read-only-storage"}},{binding:4,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Mandelbrot"}),u=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Resolve"}),y=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:3,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:4,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:5,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float"}},{binding:6,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:7,visibility:GPUShaderStage.FRAGMENT,sampler:{type:"filtering"}},{binding:8,visibility:GPUShaderStage.FRAGMENT,sampler:{type:"filtering"}}],label:"Engine BindGroupLayout Color"}),h=Array.from({length:ke},()=>({format:"r32float"}));this.pipelineBrush=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[s]}),vertex:{module:e,entryPoint:"vs_main"},fragment:{module:e,entryPoint:"fs_main",targets:h},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Brush"}),this.pipelineMandelbrot=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[l]}),vertex:{module:r,entryPoint:"vs_main"},fragment:{module:r,entryPoint:"fs_main",targets:h},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Mandelbrot"}),this.pipelineResolve=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[u]}),vertex:{module:i,entryPoint:"vs_main"},fragment:{module:i,entryPoint:"fs_main",targets:h},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Resolve"}),this.pipelineColor=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[y]}),vertex:{module:a,entryPoint:"vs_main"},fragment:{module:a,entryPoint:"fs_main",targets:[{format:this.format}]},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Color"});const x=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}}],label:"Engine BindGroupLayout Count"});this.pipelineCount=this.device.createComputePipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[x]}),compute:{module:o,entryPoint:"count_unfinished"},label:"Engine ComputePipeline Count"});const w=this.device.createShaderModule({code:Tr,label:"Engine ShaderModule Merge"}),p=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT|GPUShaderStage.VERTEX,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"unfilterable-float",viewDimension:"2d-array"}}],label:"Engine BindGroupLayout Merge"});this.pipelineMerge=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[p]}),vertex:{module:w,entryPoint:"vs_main"},fragment:{module:w,entryPoint:"fs_main",targets:h},primitive:{topology:"triangle-list"},label:"Engine RenderPipeline Merge"}),this.bindGroupBrush=void 0,this.bindGroupMandelbrot=void 0,this.bindGroupResolve=void 0,this.bindGroupColor=void 0,this.counterBindGroup=void 0,this.bindGroupMerge=void 0}rebuildMandelbrotBindGroup(){if(!this.pipelineMandelbrot||!this.rawBrushArrayView||!this.uniformBufferMandelbrot||!this.mandelbrotReferenceBuffer||!this.mandelbrotBlaBuffer||!this.mandelbrotBlaLevelBuffer)return;const e=this.pipelineMandelbrot.getBindGroupLayout(0);this.bindGroupMandelbrot=this.device.createBindGroup({layout:e,entries:[{binding:0,resource:{buffer:this.uniformBufferMandelbrot}},{binding:1,resource:{buffer:this.mandelbrotReferenceBuffer}},{binding:2,resource:{buffer:this.mandelbrotBlaBuffer}},{binding:3,resource:{buffer:this.mandelbrotBlaLevelBuffer}},{binding:4,resource:this.rawBrushArrayView}],label:"Engine BindGroup Mandelbrot"})}ensureBlaBufferCapacity(e){var i,a;const r=Math.max(1,Math.ceil(e));r<=this.mandelbrotBlaBufferCapacity||((a=(i=this.mandelbrotBlaBuffer)==null?void 0:i.destroy)==null||a.call(i),this.mandelbrotBlaBuffer=this.device.createBuffer({size:r*4*6,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot BLA Storage Buffer"}),this.mandelbrotBlaBufferCapacity=r,this.rebuildMandelbrotBindGroup())}ensureBlaLevelBufferCapacity(e){var i,a;const r=Math.max(1,Math.ceil(e));r<=this.mandelbrotBlaLevelBufferCapacity||((a=(i=this.mandelbrotBlaLevelBuffer)==null?void 0:i.destroy)==null||a.call(i),this.mandelbrotBlaLevelBuffer=this.device.createBuffer({size:r*4*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST,label:"Engine Mandelbrot BLA Level Storage Buffer"}),this.mandelbrotBlaLevelBufferCapacity=r,this.rebuildMandelbrotBindGroup())}invalidateCounterReadback(){this.unfinishedPixelCount=-1,this.activePixelCount=-1,this.counterReadbackGeneration++,this.lastCounterDispatchFrame=-xt}hasPendingCounterReadbackForCurrentGeneration(){return this.counterReadbackSlots.some(e=>e.pending&&e.generation===this.counterReadbackGeneration)}acquireCounterReadbackSlot(){const e=this.counterReadbackSlots.length;for(let r=0;r<e;r++){const i=(this.counterReadbackWriteIndex+r)%e,a=this.counterReadbackSlots[i];if(!a.pending)return this.counterReadbackWriteIndex=(i+1)%e,a}}scheduleCounterReadback(e,r,i){e.pending=!0,e.sequence=r,e.generation=i,(async()=>{let a=!1;try{await e.buffer.mapAsync(GPUMapMode.READ),a=!0;const o=new Uint32Array(e.buffer.getMappedRange()),s=o[0],l=o[1];this.applyCounterReadback(r,i,s,l)}catch{}finally{a&&e.buffer.unmap(),e.pending=!1}})()}applyCounterReadback(e,r,i,a){if(r!==this.counterReadbackGeneration||e<=this.latestAppliedCounterReadbackSequence)return;this.latestAppliedCounterReadbackSequence=e;const o=this.unfinishedPixelCount;this.unfinishedPixelCount=i,this.activePixelCount=a,o>bt&&i<=bt&&!this.zoomReprojectionActive&&(this.needFreezeSnapshot=!0)}scheduleGpuTiming(e){this.pendingGpuTiming||(this.pendingGpuTiming=!0,this.device.queue.onSubmittedWorkDone().then(()=>{this.pendingGpuTiming=!1,this.applyGpuFrameTiming(performance.now()-e)}).catch(()=>{this.pendingGpuTiming=!1}))}applyGpuFrameTiming(e){if(this.gpuFrameTimeMs=e,this.smoothedGpuTimeMs===0?this.smoothedGpuTimeMs=e:this.smoothedGpuTimeMs=this.smoothedGpuTimeMs*(1-lr)+e*lr,e<=0)return;const r=1e3/this.targetFps/e,i=this.iterationBatchSize*r;this.iterationBatchSize=Math.round(Math.min(Pa,Math.max(Xe,this.iterationBatchSize*.7+i*.3)))}resize(){var p,b,c,v,_,D,C,A,P,I;const e=(window.devicePixelRatio||1)*this.dprMultiplier,r=this.canvas.parentElement,i=(r==null?void 0:r.clientWidth)||1,a=(r==null?void 0:r.clientHeight)||1;this.width=Math.max(1,Math.round(i*e)),this.height=Math.max(1,Math.round(a*e));const o=((b=(p=this.device)==null?void 0:p.limits)==null?void 0:b.maxTextureDimension2D)??8192;this.width=Math.min(this.width,o),this.height=Math.min(this.height,o),this.canvas.width=this.width,this.canvas.height=this.height,this.canvas.style.width=i+"px",this.canvas.style.height=a+"px",this.ctx.configure({device:this.device,format:this.format,alphaMode:"opaque"}),this.neutralSize=Math.ceil(Math.sqrt(this.width*this.width+this.height*this.height));const s=this.neutralSize;(v=(c=this.rawTexture)==null?void 0:c.destroy)==null||v.call(c),(D=(_=this.rawBrushTexture)==null?void 0:_.destroy)==null||D.call(_),(A=(C=this.resolvedTexture)==null?void 0:C.destroy)==null||A.call(C),(I=(P=this.frozenTexture)==null?void 0:P.destroy)==null||I.call(P);const l=ke,u=M=>{const O=this.device.createTexture({size:{width:s,height:s,depthOrArrayLayers:l},format:"r32float",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST,label:M}),S=O.createView({dimension:"2d-array",baseArrayLayer:0,arrayLayerCount:l,label:M+" ArrayView"}),k=[];for(let L=0;L<l;L++)k.push(O.createView({dimension:"2d",baseArrayLayer:L,arrayLayerCount:1,label:M+` Layer${L}`}));return{texture:O,arrayView:S,layerViews:k}},y=u("Engine RawTexture (A)");this.rawTexture=y.texture,this.rawArrayView=y.arrayView,this.rawLayerViews=y.layerViews;const h=u("Engine RawBrushTexture (B)");this.rawBrushTexture=h.texture,this.rawBrushArrayView=h.arrayView,this.rawBrushLayerViews=h.layerViews;const x=u("Engine ResolvedTexture");this.resolvedTexture=x.texture,this.resolvedArrayView=x.arrayView,this.resolvedLayerViews=x.layerViews;const w=u("Engine FrozenTexture");if(this.frozenTexture=w.texture,this.frozenArrayView=w.arrayView,this.frozenLayerViews=w.layerViews,this.zoomReprojectionActive=!1,this.zoomFactor=1,this.liveZoomFactor=1,this.frozenScale=0,this.liveScale=0,this.pipelineBrush){const M=this.pipelineBrush.getBindGroupLayout(0);this.bindGroupBrush=this.device.createBindGroup({layout:M,entries:[{binding:0,resource:{buffer:this.uniformBufferBrush}},{binding:1,resource:this.rawArrayView}],label:"Engine BindGroup Brush"})}if(this.pipelineMandelbrot&&this.rebuildMandelbrotBindGroup(),this.pipelineResolve){const M=this.pipelineResolve.getBindGroupLayout(0);this.bindGroupResolve=this.device.createBindGroup({layout:M,entries:[{binding:0,resource:{buffer:this.uniformBufferResolve}},{binding:1,resource:this.rawArrayView}],label:"Engine BindGroup Resolve"})}if(this.pipelineColor){const M=this.pipelineColor.getBindGroupLayout(0),O=[{binding:0,resource:{buffer:this.uniformBufferColor}},{binding:1,resource:this.resolvedArrayView},{binding:2,resource:this.tileTextureView},{binding:3,resource:this.skyboxTextureView},{binding:4,resource:this.webcamTextureView},{binding:5,resource:this.paletteTextureView},{binding:6,resource:this.frozenArrayView},{binding:7,resource:this.paletteSampler},{binding:8,resource:this.skyboxSampler}];this.bindGroupColor=this.device.createBindGroup({layout:M,entries:O,label:"Engine BindGroup Color"})}if(this.pipelineCount&&this.counterBuffer&&this.uniformBufferCount){const M=this.pipelineCount.getBindGroupLayout(0);this.counterBindGroup=this.device.createBindGroup({layout:M,entries:[{binding:0,resource:this.rawArrayView},{binding:1,resource:{buffer:this.counterBuffer}},{binding:2,resource:{buffer:this.uniformBufferCount}}],label:"Engine BindGroup Count"})}if(this.pipelineMerge&&this.uniformBufferMerge){const M=this.pipelineMerge.getBindGroupLayout(0);this.bindGroupMerge=this.device.createBindGroup({layout:M,entries:[{binding:0,resource:{buffer:this.uniformBufferMerge}},{binding:1,resource:this.resolvedArrayView},{binding:2,resource:this.rawBrushArrayView}],label:"Engine BindGroup Merge"})}this.prevFrameMandelbrot=void 0,this.previousMandelbrot=void 0,this.previousRenderOptions=void 0,this.needRender=!0,this.invalidateCounterReadback()}areObjectsEqual(e,r){return e===void 0||r===void 0?!1:JSON.stringify(e)===JSON.stringify(r)}areColorStopsEqual(e,r){if(e.length!==r.length)return!1;for(const[i,a]of e.entries()){const o=r[i];if(!o||JSON.stringify(a)!==JSON.stringify(o))return!1}return!0}setApproximationMode(e){e!==this.approximationMode&&(e==="bla"?this.mandelbrotNavigator.use_bla():this.mandelbrotNavigator.use_perturbation(),this.approximationMode=e,this.currentBlaLevelCount=0,this.clearHistoryNextFrame=!0,this.needRender=!0,this.invalidateCounterReadback())}getApproximationMode(){return this.approximationMode}setBlaEpsilon(e){const r=Math.max(Number.MIN_VALUE,e);r!==this.blaEpsilon&&(this.mandelbrotNavigator.set_bla_epsilon(r),this.blaEpsilon=r,this.approximationMode==="bla"&&(this.currentBlaLevelCount=0,this.clearHistoryNextFrame=!0,this.needRender=!0,this.invalidateCounterReadback()))}async update(e,r){var ee,U,Z,W,K;const i=performance.now();this.lastUpdateTime===0&&(this.lastUpdateTime=i);const a=(i-this.lastUpdateTime)/1e3;this.time+=a,this.lastUpdateTime=i;const o=this.mandelbrotNavigator.get_approximation_mode()===1?"bla":"perturbation",s=this.mandelbrotNavigator.get_bla_epsilon();(o!==this.approximationMode||s!==this.blaEpsilon)&&(this.approximationMode=o,this.blaEpsilon=s,this.currentBlaLevelCount=0,this.clearHistoryNextFrame=!0,this.needRender=!0,this.invalidateCounterReadback());const l=!this.areObjectsEqual(e,this.previousMandelbrot),u=!this.areObjectsEqual(r,this.previousRenderOptions),y=r.stripeFrequency!==((ee=this.previousRenderOptions)==null?void 0:ee.stripeFrequency),h=Na(r.colorStops),x=this.previousOrbitMetricsEnabled!==void 0&&h!==this.previousOrbitMetricsEnabled,w=y&&h;this.needRender=this.needRender||l||u,(l||w||x)&&this.invalidateCounterReadback(),(w||x)&&(this.clearHistoryNextFrame=!0),this.previousOrbitMetricsEnabled=h,r.colorStops.some(R=>(R.webcam??0)>0)?(await this.updateWebcamTexture(),this.needRender=!0):(U=this.webcamTexture)==null||U.closeWebcam(),r.activateAnimate&&(this.needRender=!0);const p=this.width/Math.max(1,this.height);let b=((Z=this.previousMandelbrot)==null?void 0:Z.scale)||1/e.scale;b<1&&(b=1/b),b=Math.sqrt(b)-1;{const R=this.prevFrameMandelbrot&&this.prevFrameMandelbrot.scale!==e.scale;if(R&&!this.zoomReprojectionActive&&(this.zoomReprojectionActive=!0,this.frozenScale=this.prevFrameMandelbrot.scale,this.zoomingIn=e.scale<this.frozenScale,this.liveScale=this.zoomingIn?this.frozenScale/this.zoomMagnificationThreshold:this.frozenScale*this.zoomMagnificationThreshold,this.needFreezeSnapshot=!0,this.clearHistoryNextFrame=!0),this.zoomReprojectionActive&&this.frozenScale>0?(this.zoomFactor=this.frozenScale/e.scale,this.liveZoomFactor=this.liveScale/e.scale,(this.zoomingIn?this.zoomFactor>=this.zoomMagnificationThreshold:this.zoomFactor<=1/this.zoomMagnificationThreshold)&&(this.needFreezeSnapshot=!0,this.clearHistoryNextFrame=!0,this.frozenScale=this.liveScale,this.liveScale=this.zoomingIn?e.scale/this.zoomMagnificationThreshold:e.scale*this.zoomMagnificationThreshold,this.zoomFactor=this.frozenScale/e.scale,this.liveZoomFactor=this.liveScale/e.scale)):this.zoomReprojectionActive||(this.zoomFactor=1,this.liveZoomFactor=1,this.liveScale=0),this.zoomReprojectionActive&&!R&&this.prevFrameMandelbrot&&this.prevFrameMandelbrot.scale===e.scale){const G=this.width/Math.max(1,this.height);this.mergeUniforms={zf:this.zoomFactor,lzf:this.liveZoomFactor,frozenShiftU:this.frozenScale>0?this.cumulativeShiftX*(this.liveScale/this.frozenScale)/this.neutralSize:0,frozenShiftV:this.frozenScale>0?-this.cumulativeShiftY*(this.liveScale/this.frozenScale)/this.neutralSize:0,aspect:G,angle:e.angle},this.needMergeSnapshot=!0,this.zoomReprojectionActive=!1,this.zoomFactor=1,this.liveZoomFactor=1,this.liveScale=0,this.clearHistoryNextFrame=!0}}if(!this.areColorStopsEqual(r.colorStops,((W=this.previousRenderOptions)==null?void 0:W.colorStops)||[])||r.interpolationMode!==((K=this.previousRenderOptions)==null?void 0:K.interpolationMode)){const R=new sr(r.colorStops,r.interpolationMode).generateTexture(),G=ur(R.data);this.device.queue.writeTexture({texture:this.paletteTexture},G.buffer,{bytesPerRow:R.width*8},[R.width,R.height]),this.needRender=!0}const c=Math.sin(e.angle),v=Math.cos(e.angle),_=Math.hypot(Math.cos(r.lightAngle),Math.sin(r.lightAngle),1.85),D=new Float32Array([r.palettePeriod,r.paletteOffset,b,this.time,p,e.angle,r.activateAnimate?1:0,e.mu,this.zoomFactor,this.zoomReprojectionActive||this.frozenAligned?1:0,this.liveZoomFactor,this.zoomReprojectionActive&&this.frozenScale>0?this.cumulativeShiftX*(this.liveScale/this.frozenScale)/this.neutralSize:0,this.zoomReprojectionActive&&this.frozenScale>0?-this.cumulativeShiftY*(this.liveScale/this.frozenScale)/this.neutralSize:0,r.tessellationLevel,r.displacementAmount,r.animationSpeed,e.epsilon,r.ambientOcclusionStrength,r.microBumpStrength,r.clearcoatStrength,r.subsurfaceStrength,r.reliefDepth,r.localShadowStrength,r.lightAngle,r.varnishStrength,Math.log(e.mu),c,v,Math.cos(r.lightAngle)/_,Math.sin(r.lightAngle)/_,1.85/_,r.paletteMirror?1:0]);if(this.device.queue.writeBuffer(this.uniformBufferColor,0,D.buffer),!this.needsMoreFrames())return;const C=Math.ceil(e.maxIterations);this.currentMaxIterations=C;const A=this.mandelbrotNavigator.compute_reference_orbit_chunk(Oa,C),P=A.count,I=new Float32Array(qe.buffer,A.ptr,A.count*4);A.offset<C&&this.device.queue.writeBuffer(this.mandelbrotReferenceBuffer,0,I,0);const M=Math.max(0,P-1),O=Math.min(C,M);this.currentGuardedMaxIter=O,this.orbitIncomplete=M<C;const S=M>=C;let k=0,L=0;if(this.approximationMode==="bla"&&S){const R=this.mandelbrotNavigator.compute_bla_reference_ptr(O);if(this.ensureBlaBufferCapacity(R.count),this.ensureBlaLevelBufferCapacity(R.level_count),R.count>0){const G=new Float32Array(qe.buffer,R.ptr,R.count*6);this.device.queue.writeBuffer(this.mandelbrotBlaBuffer,0,G,0)}if(R.level_count>0){const G=new Uint32Array(qe.buffer,R.levels_ptr,R.level_count*4);this.device.queue.writeBuffer(this.mandelbrotBlaLevelBuffer,0,G,0)}k=1,L=R.level_count}this.currentBlaLevelCount=L;const F=this.zoomReprojectionActive&&this.liveScale>0?this.liveScale:e.scale,H=new Float32Array([e.dx,e.dy,e.mu,F,p,e.angle,this.iterationBatchSize,e.epsilon,r.antialiasLevel,0,O,S?1:0,k,L,this.blaEpsilon,r.stripeFrequency,h?1:0,0,0,0]);this.device.queue.writeBuffer(this.uniformBufferMandelbrot,0,H.buffer);const $=A.offset===0&&!!this.prevFrameMandelbrot;(!this.prevFrameMandelbrot||$)&&(this.clearHistoryNextFrame=!0,this.zoomReprojectionActive=!1,this.zoomFactor=1,this.liveZoomFactor=1,this.liveScale=0),this.prevFrameMandelbrot&&this.prevFrameMandelbrot.mu!==e.mu&&(this.clearHistoryNextFrame=!0,this.zoomReprojectionActive=!1,this.zoomFactor=1,this.liveZoomFactor=1,this.liveScale=0),!this.zoomReprojectionActive&&S&&this.prevGuardedMaxIter<C&&this.prevGuardedMaxIter>0&&(this.needFreezeSnapshot=!0,this.clearHistoryNextFrame=!0),this.prevGuardedMaxIter=O,this.previousMandelbrot=structuredClone(e),this.previousRenderOptions=structuredClone(r)}async render(){if(!this.needsMoreFrames()||!this.pipelineBrush||!this.pipelineMandelbrot||!this.pipelineResolve||!this.pipelineColor||!this.bindGroupBrush||!this.bindGroupMandelbrot||!this.bindGroupResolve||!this.bindGroupColor||!this.previousMandelbrot)return;const e=this.width/Math.max(1,this.height),r=Ua(Aa),i=r,a=this.clearHistoryNextFrame?1:0;this.clearHistoryNextFrame&&this.invalidateCounterReadback();const o=++this.renderFrameSerial;let s=0,l=0;if(!this.clearHistoryNextFrame&&this.prevFrameMandelbrot){const S=this.previousMandelbrot.dx-this.prevFrameMandelbrot.dx,k=this.previousMandelbrot.dy-this.prevFrameMandelbrot.dy,L=this.neutralSize,F=Math.sqrt(e*e+1),H=this.zoomReprojectionActive&&this.liveScale>0?this.liveScale:this.previousMandelbrot.scale;s=-(S*L)/(2*H*F),l=k*L/(2*H*F)}this.clearHistoryNextFrame?(this.cumulativeShiftX=0,this.cumulativeShiftY=0):(this.cumulativeShiftX+=Math.round(s),this.cumulativeShiftY+=Math.round(l),(Math.round(s)!==0||Math.round(l)!==0)&&(this.frozenAligned=!1));const u=(this.cumulativeShiftX%i+i)%i,y=(this.cumulativeShiftY%i+i)%i,h=this.hasPendingCounterReadbackForCurrentGeneration(),x=!h&&(this.clearHistoryNextFrame||this.activePixelCount<0||this.iterationBatchSize>Xe||this.activePixelCount<Ga*this.gpuLoadMultiplier);x&&this.refinementWasGated&&(this.iterationBatchSize=Xe),this.refinementWasGated=!x;const w=x?1:0,p=new Float32Array([e,this.previousMandelbrot.angle,a,r,i,s,l,this.previousMandelbrot.mu,u,y,this.zoomReprojectionActive?Da:0,w]);this.device.queue.writeBuffer(this.uniformBufferBrush,0,p.buffer);const b=new Float32Array([this.previousMandelbrot.mu,u,y]);this.device.queue.writeBuffer(this.uniformBufferResolve,0,b.buffer);const c=!h&&(this.unfinishedPixelCount<0||this.activePixelCount<0||o-this.lastCounterDispatchFrame>=xt)?this.acquireCounterReadbackSlot():void 0;let v;const _=this.device.createCommandEncoder();if(this.needMergeSnapshot&&this.pipelineMerge&&this.bindGroupMerge&&this.resolvedTexture&&this.frozenTexture&&this.rawBrushTexture){const S=this.neutralSize;_.copyTextureToTexture({texture:this.frozenTexture},{texture:this.rawBrushTexture},{width:S,height:S,depthOrArrayLayers:ke});const k=new Float32Array([this.mergeUniforms.zf,this.mergeUniforms.lzf,this.mergeUniforms.frozenShiftU,this.mergeUniforms.frozenShiftV,this.mergeUniforms.aspect,this.mergeUniforms.angle]);this.device.queue.writeBuffer(this.uniformBufferMerge,0,k.buffer);const L=this.frozenLayerViews.map(H=>({view:H,clearValue:{r:0,g:0,b:0,a:0},loadOp:"clear",storeOp:"store"})),F=_.beginRenderPass({colorAttachments:L});F.setPipeline(this.pipelineMerge),F.setBindGroup(0,this.bindGroupMerge),F.draw(6,1,0,0),F.end(),this.needMergeSnapshot=!1,this.frozenAligned=!0}if(this.needFreezeSnapshot&&this.resolvedTexture&&this.frozenTexture){const S=ke,k=this.neutralSize;_.copyTextureToTexture({texture:this.resolvedTexture},{texture:this.frozenTexture},{width:k,height:k,depthOrArrayLayers:S}),this.needFreezeSnapshot=!1,this.frozenAligned=!0}const D=(S,k="clear")=>S.map(L=>({view:L,clearValue:{r:0,g:0,b:0,a:0},loadOp:k,storeOp:"store"})),C=_.beginRenderPass({colorAttachments:D(this.rawBrushLayerViews)});C.setPipeline(this.pipelineBrush),C.setBindGroup(0,this.bindGroupBrush),C.draw(6,1,0,0),C.end(),_.copyTextureToTexture({texture:this.rawBrushTexture},{texture:this.rawTexture},{width:this.neutralSize,height:this.neutralSize,depthOrArrayLayers:ke});const A=_.beginRenderPass({colorAttachments:D(this.rawLayerViews,"load")});if(A.setPipeline(this.pipelineMandelbrot),A.setBindGroup(0,this.bindGroupMandelbrot),A.draw(6,1,0,0),A.end(),this.pipelineCount&&this.counterBindGroup&&this.counterBuffer&&c&&this.uniformBufferCount){const S=++this.counterReadbackSequence,k=this.counterReadbackGeneration,L=this.previousMandelbrot.mu;this.device.queue.writeBuffer(this.uniformBufferCount,0,new Float32Array([L,e,this.previousMandelbrot.angle])),_.clearBuffer(this.counterBuffer,0,8);const F=_.beginComputePass();F.setPipeline(this.pipelineCount),F.setBindGroup(0,this.counterBindGroup),F.dispatchWorkgroups(Math.ceil(this.neutralSize/16),Math.ceil(this.neutralSize/16)),F.end(),_.copyBufferToBuffer(this.counterBuffer,0,c.buffer,0,8),this.lastCounterDispatchFrame=o,v={slot:c,sequence:S,generation:k}}_.copyTextureToTexture({texture:this.rawTexture},{texture:this.resolvedTexture},{width:this.neutralSize,height:this.neutralSize,depthOrArrayLayers:ke});const P=_.beginRenderPass({colorAttachments:D(this.resolvedLayerViews,"load")});P.setPipeline(this.pipelineResolve),P.setBindGroup(0,this.bindGroupResolve),P.draw(6,1,0,0),P.end();const I=this.ctx.getCurrentTexture().createView(),M=_.beginRenderPass({colorAttachments:[{view:I,clearValue:{r:1,g:1,b:1,a:1},loadOp:"clear",storeOp:"store"}]});M.setPipeline(this.pipelineColor),M.setBindGroup(0,this.bindGroupColor),M.draw(6,1,0,0),M.end();const O=performance.now();if(this.device.queue.submit([_.finish()]),this.scheduleGpuTiming(O),v&&this.scheduleCounterReadback(v.slot,v.sequence,v.generation),this.clearHistoryNextFrame=!1,this.prevFrameMandelbrot={...this.previousMandelbrot},this.needRender=!1,this.snapshotCallback){try{const S=this.snapshotDestWidth??256,k=Math.round(S*9/16),L=this.device.createTexture({size:[S,k,1],format:this.format,usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC});{const G=this.device.createCommandEncoder(),J=G.beginRenderPass({colorAttachments:[{view:L.createView(),clearValue:{r:0,g:0,b:0,a:1},loadOp:"clear",storeOp:"store"}]});J.setPipeline(this.pipelineColor),J.setBindGroup(0,this.bindGroupColor),J.draw(6,1,0,0),J.end(),this.device.queue.submit([G.finish()])}const F=G=>G+255&-256,H=S*4,$=F(H),ee=$*k,U=this.device.createBuffer({size:ee,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});{const G=this.device.createCommandEncoder();G.copyTextureToBuffer({texture:L},{buffer:U,offset:0,bytesPerRow:$},{width:S,height:k,depthOrArrayLayers:1}),this.device.queue.submit([G.finish()])}await this.device.queue.onSubmittedWorkDone(),await U.mapAsync(GPUMapMode.READ);const Z=U.getMappedRange(),W=new Uint8ClampedArray(S*k*4),K=new Uint8Array(Z);for(let G=0;G<k;++G)for(let J=0;J<S;++J){const oe=G*$+J*4,Q=(G*S+J)*4;W[Q+0]=K[oe+2],W[Q+1]=K[oe+1],W[Q+2]=K[oe+0],W[Q+3]=K[oe+3]}const R=document.createElement("canvas");R.width=S,R.height=k,R.getContext("2d").putImageData(new ImageData(W,S,k),0,0),U.unmap(),this.snapshotCallback(R.toDataURL("image/png"))}catch{this.snapshotCallback("")}this.snapshotCallback=void 0,this.snapshotDestWidth=void 0}}destroy(){var e,r,i,a,o,s,l,u,y,h,x,w,p,b,c,v,_,D,C,A,P,I,M,O,S,k,L,F,H,$,ee,U,Z,W,K;this.stopRenderLoop(),(r=(e=this.rawTexture)==null?void 0:e.destroy)==null||r.call(e),(a=(i=this.rawBrushTexture)==null?void 0:i.destroy)==null||a.call(i),(s=(o=this.resolvedTexture)==null?void 0:o.destroy)==null||s.call(o),(u=(l=this.frozenTexture)==null?void 0:l.destroy)==null||u.call(l),(h=(y=this.mandelbrotReferenceBuffer)==null?void 0:y.destroy)==null||h.call(y),(w=(x=this.mandelbrotBlaBuffer)==null?void 0:x.destroy)==null||w.call(x),(b=(p=this.mandelbrotBlaLevelBuffer)==null?void 0:p.destroy)==null||b.call(p),(v=(c=this.uniformBufferMandelbrot)==null?void 0:c.destroy)==null||v.call(c),(D=(_=this.uniformBufferColor)==null?void 0:_.destroy)==null||D.call(_),(A=(C=this.uniformBufferBrush)==null?void 0:C.destroy)==null||A.call(C),(I=(P=this.uniformBufferResolve)==null?void 0:P.destroy)==null||I.call(P),(O=(M=this.counterBuffer)==null?void 0:M.destroy)==null||O.call(M);for(const R of this.counterReadbackSlots)(k=(S=R.buffer).destroy)==null||k.call(S);this.counterReadbackSlots=[],(F=(L=this.uniformBufferCount)==null?void 0:L.destroy)==null||F.call(L),($=(H=this.uniformBufferMerge)==null?void 0:H.destroy)==null||$.call(H),(ee=this.webcamTexture)==null||ee.closeWebcam(),(Z=(U=this.webcamTileTexture)==null?void 0:U.destroy)==null||Z.call(U),(K=(W=this.paletteTexture)==null?void 0:W.destroy)==null||K.call(W)}needsMoreFrames(){let e="";return this.needRender?e="needRender":this.snapshotCallback?e="snapshot":this.zoomReprojectionActive?e="zoomActive":this.clearHistoryNextFrame?e="clearHistory":this.needFreezeSnapshot?e="freezeSnapshot":this.needMergeSnapshot?e="mergeSnapshot":this.orbitIncomplete?e="orbitIncomplete":(this.unfinishedPixelCount<0||this.unfinishedPixelCount>bt)&&(e=`unfinished=${this.unfinishedPixelCount}`),e!==""}getIterationBatchSize(){return this.iterationBatchSize}startRenderLoop(e){this._drawFn=e,this._rafId===null&&(this._rafId=requestAnimationFrame(async()=>this._loop()))}stopRenderLoop(){this._rafId!==null&&(cancelAnimationFrame(this._rafId),this._rafId=null),this._drawFn=null}async _loop(){if(this._drawFn){const e=this.needsMoreFrames();this.isRendering=e,await this._drawFn(),e&&this._fpsFrameCount++;const r=performance.now();this._fpsLastTime===0&&(this._fpsLastTime=r);const i=r-this._fpsLastTime;i>=1e3&&(this.fps=Math.round(this._fpsFrameCount*1e3/i),this._fpsFrameCount=0,this._fpsLastTime=r),this._rafId=requestAnimationFrame(async()=>this._loop())}else{this._rafId=null;return}}async updateTileTexture(e,r=e){var a,o;if(this.tileTextureSourceKey===r)return;const i=await this._loadTexture(e);(o=(a=this.tileTexture)==null?void 0:a.destroy)==null||o.call(a),this.tileTexture=i,this.tileTextureView=this.tileTexture.createView(),this.tileTextureSourceKey=r,this.rebuildColorBindGroup(),this.needRender=!0}isTileTextureSourceCurrent(e){return this.tileTextureSourceKey===e}async updateSkyboxTexture(e,r=e){var a,o;if(this.skyboxTextureSourceKey===r)return;const i=await this._loadTexture(e);(o=(a=this.skyboxTexture)==null?void 0:a.destroy)==null||o.call(a),this.skyboxTexture=i,this.skyboxTextureView=this.skyboxTexture.createView(),this.skyboxTextureSourceKey=r,this.rebuildColorBindGroup(),this.needRender=!0}isSkyboxTextureSourceCurrent(e){return this.skyboxTextureSourceKey===e}rebuildColorBindGroup(){if(this.pipelineColor&&this.resolvedArrayView&&this.frozenArrayView){const e=this.pipelineColor.getBindGroupLayout(0);this.bindGroupColor=this.device.createBindGroup({layout:e,entries:[{binding:0,resource:{buffer:this.uniformBufferColor}},{binding:1,resource:this.resolvedArrayView},{binding:2,resource:this.tileTextureView},{binding:3,resource:this.skyboxTextureView},{binding:4,resource:this.webcamTextureView},{binding:5,resource:this.paletteTextureView},{binding:6,resource:this.frozenArrayView},{binding:7,resource:this.paletteSampler},{binding:8,resource:this.skyboxSampler}],label:"Engine BindGroup Color"})}}async _loadTexture(e){const r=new Image;r.src=e;try{await r.decode()}catch(o){throw console.warn("\xC9chec du chargement de la texture : "+e,o),o}const i=await createImageBitmap(r),a=this.device.createTexture({size:[i.width,i.height,1],format:"rgba8unorm",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT,label:"Engine LoadedTexture "+e});return this.device.queue.copyExternalImageToTexture({source:i},{texture:a},[i.width,i.height]),a}async readIterationDataAt(e,r,i,a){var oe;if(!this.resolvedTexture||!this.device)return null;const o=this.width/Math.max(1,this.height),s=((oe=this.previousMandelbrot)==null?void 0:oe.angle)??0,l=e/Math.max(1,i),u=1-r/Math.max(1,a),y=l*2-1,h=u*2-1,x=y*o,w=h,p=Math.sin(s),b=Math.cos(s),c=b*x-p*w,v=p*x+b*w,_=Math.sqrt(o*o+1),D=c/_,C=v/_,A=D*.5+.5,P=C*.5+.5,I=this.neutralSize,M=Math.floor(Math.max(0,Math.min(I-1,A*I))),O=Math.floor(Math.max(0,Math.min(I-1,(1-P)*I))),S=X.ITER_PIXEL_LAYERS,k=1,L=4,F=(Q=>Q+255&-256)(k*L),H=F*S.length,$=this.device.createBuffer({size:H,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ,label:"Engine IterPixel Readback"}),ee=this.device.createCommandEncoder();for(let Q=0;Q<S.length;Q++)ee.copyTextureToBuffer({texture:this.resolvedTexture,origin:{x:M,y:O,z:S[Q]}},{buffer:$,offset:F*Q,bytesPerRow:F},{width:1,height:1,depthOrArrayLayers:1});this.device.queue.submit([ee.finish()]),await $.mapAsync(GPUMapMode.READ);const U=new Float32Array($.getMappedRange()),Z=F/L,W=U[0*Z],K=U[1*Z],R=U[2*Z],G=U[3*Z],J=U[4*Z];return $.unmap(),$.destroy(),W<0?null:{iter:W,zx:K,zy:R,derX:G,derY:J}}async updateWebcamTexture(){var e,r;await((e=this.webcamTexture)==null?void 0:e.openWebcam()),await((r=this.webcamTexture)==null?void 0:r.drawWebGPUTexture(this.webcamTileTexture,this.device))}async getSnapshotPng(e=256){return await new Promise(r=>{this.snapshotCallback=r,this.snapshotDestWidth=e,this.needRender=!0})}};n(X,"_tileTexture"),n(X,"_tileTextureView"),n(X,"_skyboxTexture"),n(X,"_skyboxTextureView"),n(X,"_paletteTexture"),n(X,"_paletteTextureView"),n(X,"ITER_PIXEL_LAYERS",[0,2,3,4,5]);let yt=X,dr,fr,pr,hr,gr,_r,Fe,wt,vr,mr,br;Bt=Mt({__name:"Mandelbrot",props:Oe({mu:{default:4},epsilon:{default:1e-5},colorStops:{default:()=>[{color:"#002500",position:0},{color:"#175b3d",position:.16},{color:"#ffceb6",position:.26},{color:"#edffff",position:.42},{color:"#ff8fbc",position:.7016397849462366},{color:"#a6003e",position:.8575},{color:"#100000",position:1}]},palettePeriod:{default:100},paletteOffset:{default:0},paletteMirror:{type:Boolean,default:!1},antialiasLevel:{default:1},activateAnimate:{type:Boolean,default:!1},dprMultiplier:{default:.5},maxIterationMultiplier:{default:.1},targetFps:{default:60},gpuLoadMultiplier:{default:1},interpolationMode:{default:"lab"},tessellationLevel:{default:2},displacementAmount:{default:.01},animationSpeed:{default:1},ambientOcclusionStrength:{default:.5},microBumpStrength:{default:.25},clearcoatStrength:{default:.7},subsurfaceStrength:{default:0},reliefDepth:{default:.35},localShadowStrength:{default:.4},lightAngle:{default:3.927},varnishStrength:{default:1},stripeFrequency:{default:8}},{cx:{default:"-1.9771995110313272619112808106831597"},cxModifiers:{},cy:{default:"0.0"},cyModifiers:{},scale:{default:"2.5"},scaleModifiers:{},angle:{default:0},angleModifiers:{}}),emits:Oe(["ready"],["update:cx","update:cy","update:scale","update:angle"]),setup(t,{expose:e,emit:r}){const i=Tt(null);let a=null,o=null,s,l=!1;const u=r,y=ne(t,"cx"),h=ne(t,"cy"),x=ne(t,"scale"),w=ne(t,"angle");Ke(()=>[y.value,h.value,x.value,w.value],([_,D,C,A],[P,I,M,O])=>{l||s&&(!_||!D||!C||((_!==P||D!==I)&&s.origin(_,D),C!==M&&s.scale(C),A!==O&&s.angle(Number(A))))},{flush:"sync"});const p=t;Ke(()=>p.dprMultiplier,_=>{o&&(o.dprMultiplier=_,v())}),Ke(()=>p.targetFps,_=>{o&&(o.targetFps=_)}),Ke(()=>p.gpuLoadMultiplier,_=>{o&&(o.gpuLoadMultiplier=_)});async function b(){if(!o||!s)return;const _=s.step();if(!_)return;const[D,C]=_,[A,P,I,M]=s.get_params();l=!0,y.value=A,h.value=P,x.value=I,w.value=parseFloat(M),await Ka(),l=!1;const O=Math.min(Math.max(100,1e3*p.maxIterationMultiplier*Math.log2(1/parseFloat(I))),1e5);await o.update({cx:A,cy:P,dx:parseFloat(D),dy:parseFloat(C),mu:p.mu,scale:parseFloat(I),angle:parseFloat(M),maxIterations:O,epsilon:p.epsilon},{antialiasLevel:p.antialiasLevel,palettePeriod:p.palettePeriod,paletteOffset:p.paletteOffset,paletteMirror:p.paletteMirror,colorStops:Ja(p.colorStops),interpolationMode:p.interpolationMode,activateAnimate:p.activateAnimate,tessellationLevel:p.tessellationLevel,displacementAmount:p.displacementAmount,animationSpeed:p.animationSpeed,ambientOcclusionStrength:p.ambientOcclusionStrength,microBumpStrength:p.microBumpStrength,clearcoatStrength:p.clearcoatStrength,subsurfaceStrength:p.subsurfaceStrength,reliefDepth:p.reliefDepth,localShadowStrength:p.localShadowStrength,lightAngle:p.lightAngle,varnishStrength:p.varnishStrength,stripeFrequency:p.stripeFrequency}),await o.render()}async function c(){if(i.value)return a=i.value,s=new et(y.value,h.value,x.value,Number(w.value)),s.origin(y.value,h.value),s.scale(x.value),s.angle(Number(w.value)),o=new yt(a,{antialiasLevel:p.antialiasLevel,palettePeriod:p.palettePeriod,paletteOffset:p.paletteOffset,paletteMirror:p.paletteMirror,colorStops:p.colorStops,interpolationMode:p.interpolationMode,activateAnimate:p.activateAnimate,tessellationLevel:p.tessellationLevel,displacementAmount:p.displacementAmount,animationSpeed:p.animationSpeed,ambientOcclusionStrength:p.ambientOcclusionStrength,microBumpStrength:p.microBumpStrength,clearcoatStrength:p.clearcoatStrength,subsurfaceStrength:p.subsurfaceStrength,reliefDepth:p.reliefDepth,localShadowStrength:p.localShadowStrength,lightAngle:p.lightAngle,varnishStrength:p.varnishStrength,stripeFrequency:p.stripeFrequency}),o.initialize(s)}async function v(){if(!i.value||!o)return;const _=i.value.getBoundingClientRect();i.value.width=_.width,i.value.height=_.height,o.resize()}return xr(async()=>{await c(),window.addEventListener("resize",v),await v(),o&&(u("ready",o),o.startRenderLoop(b))}),yr(()=>{o==null||o.stopRenderLoop(),window.removeEventListener("resize",v)}),e({getCanvas:()=>i.value,getEngine:()=>o,getNavigator:()=>s,translate:(_,D)=>s==null?void 0:s.translate(_,D),translateDirect:(_,D)=>s==null?void 0:s.translate_direct(_,D),rotate:_=>s==null?void 0:s.rotate(_),angle:_=>s==null?void 0:s.angle(_),zoom:_=>s==null?void 0:s.zoom(_),step:()=>s==null?void 0:s.step(),getParams:()=>s==null?void 0:s.get_params(),drawOnce:async()=>b(),resize:async()=>v(),initialize:async()=>c(),useBla:()=>o==null?void 0:o.setApproximationMode("bla"),usePerturbation:()=>o==null?void 0:o.setApproximationMode("perturbation"),setApproximationMode:_=>o==null?void 0:o.setApproximationMode(_),getApproximationMode:()=>o==null?void 0:o.getApproximationMode(),setBlaEpsilon:_=>o==null?void 0:o.setBlaEpsilon(_)}),(_,D)=>(Ge(),Ie("canvas",{ref_key:"canvasRef",ref:i},null,512))}}),dr={class:"mobile-nav-controls"},fr={key:0,class:"directional-controls"},pr={width:"16",height:"16",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round",style:{"vertical-align":"middle","margin-right":"4px"}},hr=Mt({__name:"MobileNavigationControls",props:Oe({mandelbrotRef:{}},{expanded:{type:Boolean,default:!1},expandedModifiers:{}}),emits:["update:expanded"],setup(t){const e=t,r=ne(t,"expanded"),i=Tt(null);let a=null;const o=()=>{r.value=!r.value,r.value||l()},s=b=>{b.preventDefault(),b.stopPropagation(),o()},l=()=>{i.value=null,a!==null&&(clearInterval(a),a=null)},u=b=>{i.value=b;const c=.01,v=()=>{if(e.mandelbrotRef)switch(b){case"north":e.mandelbrotRef.translate(0,c);break;case"south":e.mandelbrotRef.translate(0,-c);break;case"west":e.mandelbrotRef.translate(-c,0);break;case"east":e.mandelbrotRef.translate(c,0);break}};v(),a=window.setInterval(v,16)},y=b=>{i.value=`rotate-${b}`;const c=.025,v=()=>{e.mandelbrotRef&&(b==="left"?e.mandelbrotRef.rotate(c):e.mandelbrotRef.rotate(-c))};v(),a=window.setInterval(v,16)},h=b=>{i.value=`zoom-${b}`;const c=.97,v=()=>{e.mandelbrotRef&&(b==="in"?e.mandelbrotRef.zoom(c):e.mandelbrotRef.zoom(1/c))};v(),a=window.setInterval(v,16)},x=(b,c)=>{b.preventDefault(),c()},w=b=>{b.preventDefault(),l()};function p(b){b.preventDefault(),b.stopPropagation(),window.location.href=new URL("./presentation/",window.location.href).href}return(b,c)=>(Ge(),Ie("div",dr,[T("button",{class:fe(["nav-button compass-button",{active:r.value}]),onClick:o,onTouchend:s,"aria-label":"Toggle navigation"},[...c[16]||(c[16]=[Qa('<svg width="32" height="32" viewBox="0 0 24 24" fill="none" class="nav-icon" data-v-1e35ba8c><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" data-v-1e35ba8c></circle><path d="M12 2 L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-1e35ba8c></path><path d="M12 18 L12 22" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-1e35ba8c></path><path d="M2 12 L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-1e35ba8c></path><path d="M18 12 L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" data-v-1e35ba8c></path><path d="M12 7 L10 12 L12 14 L14 12 Z" fill="currentColor" data-v-1e35ba8c></path><text x="12" y="6" text-anchor="middle" font-size="6" fill="currentColor" font-weight="bold" data-v-1e35ba8c>N</text></svg>',1)])],34),Ct(eo,{name:"fade"},{default:to(()=>[r.value?(Ge(),Ie("div",fr,[T("button",{class:fe(["nav-button direction-button north",{active:i.value==="north"}]),onTouchstart:c[0]||(c[0]=v=>x(v,()=>u("north"))),onTouchend:w,onMousedown:c[1]||(c[1]=v=>u("north")),onMouseup:l,onMouseleave:l,"aria-label":"Move North"},[...c[17]||(c[17]=[T("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("path",{d:"M12 5 L18 11 L15 11 L15 19 L9 19 L9 11 L6 11 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),T("button",{class:fe(["nav-button direction-button south",{active:i.value==="south"}]),onTouchstart:c[2]||(c[2]=v=>x(v,()=>u("south"))),onTouchend:w,onMousedown:c[3]||(c[3]=v=>u("south")),onMouseup:l,onMouseleave:l,"aria-label":"Move South"},[...c[18]||(c[18]=[T("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("path",{d:"M12 19 L6 13 L9 13 L9 5 L15 5 L15 13 L18 13 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),T("button",{class:fe(["nav-button direction-button west",{active:i.value==="west"}]),onTouchstart:c[4]||(c[4]=v=>x(v,()=>u("west"))),onTouchend:w,onMousedown:c[5]||(c[5]=v=>u("west")),onMouseup:l,onMouseleave:l,"aria-label":"Move West"},[...c[19]||(c[19]=[T("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("path",{d:"M5 12 L11 18 L11 15 L19 15 L19 9 L11 9 L11 6 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),T("button",{class:fe(["nav-button direction-button east",{active:i.value==="east"}]),onTouchstart:c[6]||(c[6]=v=>x(v,()=>u("east"))),onTouchend:w,onMousedown:c[7]||(c[7]=v=>u("east")),onMouseup:l,onMouseleave:l,"aria-label":"Move East"},[...c[20]||(c[20]=[T("svg",{width:"48",height:"48",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("path",{d:"M19 12 L13 6 L13 9 L5 9 L5 15 L13 15 L13 18 Z",fill:"currentColor",stroke:"black","stroke-width":"1"})],-1)])],34),T("button",{class:fe(["nav-button corner-button rotate-left",{active:i.value==="rotate-left"}]),onTouchstart:c[8]||(c[8]=v=>x(v,()=>y("left"))),onTouchend:w,onMousedown:c[9]||(c[9]=v=>y("left")),onMouseup:l,onMouseleave:l,"aria-label":"Rotate Left"},[...c[21]||(c[21]=[T("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("path",{d:"M16 8 A6 6 0 1 0 8 16",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round"}),T("path",{d:"M5 16 L8 16 L8 13",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round","stroke-linejoin":"round"})],-1)])],34),T("button",{class:fe(["nav-button corner-button rotate-right",{active:i.value==="rotate-right"}]),onTouchstart:c[10]||(c[10]=v=>x(v,()=>y("right"))),onTouchend:w,onMousedown:c[11]||(c[11]=v=>y("right")),onMouseup:l,onMouseleave:l,"aria-label":"Rotate Right"},[...c[22]||(c[22]=[T("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("path",{d:"M8 8 A6 6 0 1 1 16 16",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round"}),T("path",{d:"M19 16 L16 16 L16 13",stroke:"currentColor","stroke-width":"2.5","stroke-linecap":"round","stroke-linejoin":"round"})],-1)])],34),T("button",{class:fe(["nav-button corner-button zoom-out",{active:i.value==="zoom-out"}]),onTouchstart:c[12]||(c[12]=v=>x(v,()=>h("out"))),onTouchend:w,onMousedown:c[13]||(c[13]=v=>h("out")),onMouseup:l,onMouseleave:l,"aria-label":"Zoom Out"},[...c[23]||(c[23]=[T("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("circle",{cx:"11",cy:"11",r:"7",stroke:"currentColor","stroke-width":"2"}),T("path",{d:"M18 18 L22 22",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"}),T("path",{d:"M8 11 L14 11",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"})],-1)])],34),T("button",{class:fe(["nav-button corner-button zoom-in",{active:i.value==="zoom-in"}]),onTouchstart:c[14]||(c[14]=v=>x(v,()=>h("in"))),onTouchend:w,onMousedown:c[15]||(c[15]=v=>h("in")),onMouseup:l,onMouseleave:l,"aria-label":"Zoom In"},[...c[24]||(c[24]=[T("svg",{width:"40",height:"40",viewBox:"0 0 24 24",fill:"none",class:"nav-icon"},[T("circle",{cx:"11",cy:"11",r:"7",stroke:"currentColor","stroke-width":"2"}),T("path",{d:"M18 18 L22 22",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"}),T("path",{d:"M11 8 L11 14",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"}),T("path",{d:"M8 11 L14 11",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round"})],-1)])],34),T("button",{class:"presentation-button",onTouchend:io(p,["prevent","stop"]),onClick:p,"aria-label":"Pr\xE9sentation"},[(Ge(),Ie("svg",pr,[...c[25]||(c[25]=[T("rect",{x:"2",y:"3",width:"20",height:"14",rx:"2",ry:"2"},null,-1),T("line",{x1:"8",y1:"21",x2:"16",y2:"21"},null,-1),T("line",{x1:"12",y1:"17",x2:"12",y2:"21"},null,-1)])])),c[26]||(c[26]=ro(" Pr\xE9sentation ",-1))],32)])):ao("",!0)]),_:1})]))}}),gr=wr(hr,[["__scopeId","data-v-1e35ba8c"]]),_r={style:{position:"relative",width:"100%",height:"100%"}},Fe=.01,wt=.025,vr=300,mr=30,br=Mt({__name:"MandelbrotController",props:Oe({mu:{},epsilon:{},colorStops:{},antialiasLevel:{},palettePeriod:{},paletteOffset:{},paletteMirror:{type:Boolean},activateAnimate:{type:Boolean},dprMultiplier:{},maxIterationMultiplier:{},targetFps:{},gpuLoadMultiplier:{},interpolationMode:{},pickerMode:{type:Boolean},tessellationLevel:{},displacementAmount:{},animationSpeed:{},ambientOcclusionStrength:{},microBumpStrength:{},clearcoatStrength:{},subsurfaceStrength:{},reliefDepth:{},localShadowStrength:{},lightAngle:{},varnishStrength:{},stripeFrequency:{}},{cx:{},cxModifiers:{},cy:{},cyModifiers:{},scale:{},scaleModifiers:{},angle:{},angleModifiers:{},mobileNavExpanded:{type:Boolean,default:!1},mobileNavExpandedModifiers:{}}),emits:Oe(["palettePick","pickerDone","engineReady"],["update:cx","update:cy","update:scale","update:angle","update:mobileNavExpanded"]),setup(t,{expose:e,emit:r}){const i=ne(t,"cx"),a=ne(t,"cy"),o=ne(t,"scale"),s=ne(t,"angle"),l=ne(t,"mobileNavExpanded"),u=t,y=r,h=Tt(null),x={};e({getCanvas:S,getEngine:()=>{var d;return((d=h.value)==null?void 0:d.getEngine())??null}});let w=!1,p=!1,b=0,c=0,v=0,_=0,D=0,C=!1,A=0,P=null,I=0,M=0,O=0;function S(){var d;return((d=h.value)==null?void 0:d.getCanvas())??null}function k(d){const m=S();if(!m)return{x:0,y:0,width:0,height:0};const z=m.getBoundingClientRect();return{x:d.clientX-z.left,y:d.clientY-z.top,width:z.width,height:z.height}}function L(d){var z,B,E;const m=(B=(z=d.target)==null?void 0:z.tagName)==null?void 0:B.toLowerCase();m==="input"||m==="textarea"||m==="select"||(E=d.target)!=null&&E.isContentEditable||(x[d.code]=!0)}function F(d){x[d.code]=!1}function H(d){var z,B;if(u.pickerMode){d.preventDefault();return}d.preventDefault();const m=.95;d.deltaY<0?(z=h.value)==null||z.zoom(m):(B=h.value)==null||B.zoom(1/m)}function $(d,m){var Le;const z=S();if(!z)return;const B=z.getBoundingClientRect(),E=d-B.left,V=m-B.top,N=B.width,Y=B.height,te=N/Y,ue=(E-N/2)/N*2,de=(V-Y/2)/Y*2;(Le=h.value)==null||Le.translateDirect(ue*te,-de)}function ee(d){if(u.pickerMode){d.preventDefault();return}d.preventDefault(),$(d.clientX,d.clientY)}function U(d){if(u.pickerMode||d.touches.length!==0)return;const m=Date.now(),z=d.changedTouches[0];if(!z)return;const B=z.clientX,E=z.clientY;m-I<vr&&Math.hypot(B-M,E-O)<mr?(d.preventDefault(),$(B,E),I=0):(I=m,M=B,O=E)}function Z(d){if(u.pickerMode){d.preventDefault(),W(d);return}if(d.button===2)p=!0;else{w=!0;const m=k(d);b=m.x,c=m.y}}async function W(d){var m;try{const z=(m=h.value)==null?void 0:m.getEngine();if(!z)return;const B=S();if(!B)return;const E=B.getBoundingClientRect(),V=d.clientX-E.left,N=d.clientY-E.top,Y=await z.readIterationDataAt(V,N,E.width,E.height);if(!Y)return;y("palettePick",Y,d.clientX,d.clientY)}finally{y("pickerDone")}}function K(d){var Y,te;if(u.pickerMode)return;const m=k(d);if(p){const ue=S();if(!ue)return;const de=ue.getBoundingClientRect(),Le=de.width/2,zt=de.height/2,St=m.x,Ha=m.y,Wa=Math.atan2(Ha-zt,St-Le);(Y=h.value)==null||Y.angle(Wa);return}if(!w)return;const z=m.width,B=m.height,E=z/B,V=(m.x-b)/z*2,N=(m.y-c)/B*2;(te=h.value)==null||te.translateDirect(-V*E,N),b=m.x,c=m.y}function R(d){u.pickerMode||(d.button===2?p=!1:w=!1)}function G(d){var z;if(u.pickerMode)return;const m=S();if(m){if(d.touches.length===1){w=!0;const B=d.touches[0],E=m.getBoundingClientRect();b=B.clientX-E.left,c=B.clientY-E.top}else if(d.touches.length===2){w=!1,C=!0;const[B,E]=d.touches;v=Math.hypot(E.clientX-B.clientX,E.clientY-B.clientY),A=v,_=Math.atan2(E.clientY-B.clientY,E.clientX-B.clientX);const V=(z=h.value)==null?void 0:z.getParams();D=V?parseFloat(V[3]):0}}}function J(d){var z,B,E;if(u.pickerMode)return;const m=S();if(m){if(w&&d.touches.length===1){const V=d.touches[0],N=m.getBoundingClientRect(),Y=V.clientX-N.left,te=V.clientY-N.top,ue=N.width,de=N.height,Le=ue/de,zt=(Y-b)/ue*2,St=(te-c)/de*2;(z=h.value)==null||z.translateDirect(-zt*Le,St),b=Y,c=te}else if(C&&d.touches.length===2){const[V,N]=d.touches,Y=Math.hypot(N.clientX-V.clientX,N.clientY-V.clientY),te=Math.atan2(N.clientY-V.clientY,N.clientX-V.clientX),ue=A/Y;A=Y,(B=h.value)==null||B.zoom(ue);const de=te-_;(E=h.value)==null||E.angle(D+de)}}}function oe(d){d.touches.length===0&&(w=!1,C=!1)}function Q(){var d,m,z,B,E,V,N,Y;if(!u.pickerMode){x.KeyW&&((d=h.value)==null||d.translate(0,Fe)),x.KeyS&&((m=h.value)==null||m.translate(0,-Fe)),x.KeyA&&((z=h.value)==null||z.translate(-Fe,0)),x.KeyD&&((B=h.value)==null||B.translate(Fe,0)),x.KeyQ&&((E=h.value)==null||E.rotate(wt)),x.KeyE&&((V=h.value)==null||V.rotate(-wt));const te=.97;x.KeyR&&((N=h.value)==null||N.zoom(te)),x.KeyF&&((Y=h.value)==null||Y.zoom(1/te))}P=window.setTimeout(Q,16)}return xr(async()=>{const d=S();d&&(window.addEventListener("keydown",L),window.addEventListener("keyup",F),d.addEventListener("wheel",H,{passive:!1}),d.addEventListener("mousedown",Z),d.addEventListener("dblclick",ee),d.addEventListener("contextmenu",m=>m.preventDefault()),window.addEventListener("mousemove",K),window.addEventListener("mouseup",R),d.addEventListener("touchstart",G,{passive:!1}),d.addEventListener("touchmove",J,{passive:!1}),d.addEventListener("touchend",oe,{passive:!1}),d.addEventListener("touchend",U,{passive:!1}),Q())}),yr(()=>{P!==null&&clearTimeout(P);const d=S();window.removeEventListener("keydown",L),window.removeEventListener("keyup",F),window.removeEventListener("mousemove",K),window.removeEventListener("mouseup",R),d&&(d.removeEventListener("wheel",H),d.removeEventListener("mousedown",Z),d.removeEventListener("dblclick",ee),d.removeEventListener("contextmenu",m=>m.preventDefault()),d.removeEventListener("touchstart",G),d.removeEventListener("touchmove",J),d.removeEventListener("touchend",oe),d.removeEventListener("touchend",U))}),(d,m)=>(Ge(),Ie("div",_r,[Ct(Bt,{ref_key:"mandelbrotRef",ref:h,scale:o.value,"onUpdate:scale":m[0]||(m[0]=z=>o.value=z),angle:s.value,"onUpdate:angle":m[1]||(m[1]=z=>s.value=z),cx:i.value,"onUpdate:cx":m[2]||(m[2]=z=>i.value=z),cy:a.value,"onUpdate:cy":m[3]||(m[3]=z=>a.value=z),mu:u.mu,epsilon:u.epsilon,antialiasLevel:u.antialiasLevel,palettePeriod:u.palettePeriod,paletteMirror:u.paletteMirror,colorStops:u.colorStops,activateAnimate:u.activateAnimate,paletteOffset:u.paletteOffset,dprMultiplier:u.dprMultiplier,maxIterationMultiplier:u.maxIterationMultiplier,targetFps:u.targetFps,gpuLoadMultiplier:u.gpuLoadMultiplier,interpolationMode:u.interpolationMode,tessellationLevel:u.tessellationLevel,displacementAmount:u.displacementAmount,animationSpeed:u.animationSpeed,ambientOcclusionStrength:u.ambientOcclusionStrength,microBumpStrength:u.microBumpStrength,clearcoatStrength:u.clearcoatStrength,subsurfaceStrength:u.subsurfaceStrength,reliefDepth:u.reliefDepth,localShadowStrength:u.localShadowStrength,lightAngle:u.lightAngle,varnishStrength:u.varnishStrength,stripeFrequency:u.stripeFrequency,onReady:m[4]||(m[4]=z=>y("engineReady",z))},null,8,["scale","angle","cx","cy","mu","epsilon","antialiasLevel","palettePeriod","paletteMirror","colorStops","activateAnimate","paletteOffset","dprMultiplier","maxIterationMultiplier","targetFps","gpuLoadMultiplier","interpolationMode","tessellationLevel","displacementAmount","animationSpeed","ambientOcclusionStrength","microBumpStrength","clearcoatStrength","subsurfaceStrength","reliefDepth","localShadowStrength","lightAngle","varnishStrength","stripeFrequency"]),Ct(gr,{"mandelbrot-ref":h.value,expanded:l.value,"onUpdate:expanded":m[5]||(m[5]=z=>l.value=z)},null,8,["mandelbrot-ref","expanded"])]))}}),zr=wr(br,[["__scopeId","data-v-e98705c9"]])})();export{zr as M,Bt as _,oo as __tla};
