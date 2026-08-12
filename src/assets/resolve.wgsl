// Presentation-only resolve pass.
//
// Raw terminal texels are exact step-1 values. An incomplete texel may borrow
// finished dyadic support starting at step 2. The compact display ABI is:
//   values[0..2] = iteration, z.x, z.y
//   geometry      = analytic gradient.xy, Laplacian, distance height
//   metadata      = provenance exponent | stripe phase | coherence
//   orbitGradient = grad(stripe EMA).xy, grad(direction coherence).xy
//
// orbitGradient exists only while orbit metrics are tracked; the pipeline
// binds a null target otherwise and the raw layers are not even allocated.

struct ResolveUniforms {
  mu: f32,
  aspect: f32,
  angle: f32,
  trapLayerBase: f32, // -1 when no true-orbit payload is allocated
};

@group(0) @binding(0) var<uniform> uni: ResolveUniforms;
@group(0) @binding(1) var rawTex: texture_2d_array<f32>;
@group(0) @binding(2) var trapOut: texture_storage_2d<rgba32float, write>;

struct VSOut {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  var pos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0),
    vec2<f32>(-1.0, 1.0), vec2<f32>(-1.0, 1.0),
    vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0)
  );
  var out: VSOut;
  out.position = vec4<f32>(pos[vid], 0.0, 1.0);
  out.uv = (pos[vid] + vec2<f32>(1.0)) * 0.5;
  return out;
}

struct FragOut {
  @location(0) iter: f32,
  @location(1) zx: f32,
  @location(2) zy: f32,
  @location(3) geometry: vec4<f32>,
  @location(4) metadata: u32,
  @location(5) orbitGradient: vec4<f32>,
};

const TWO_PI: f32 = 6.283185307179586;
const LN_2: f32 = 0.6931471805599453;
const QUANTIZED_MAX: u32 = 16383u;

fn finite_scalar(value: f32) -> bool {
  return value == value && abs(value) < 3.402823e38;
}

fn load_layer(coord: vec2<i32>, layer: i32) -> f32 {
  return textureLoad(rawTex, coord, layer, 0).r;
}

fn invalid_trap_payload() -> vec4<f32> {
  return vec4<f32>(1e30, 0.0, 0.0, 0.0);
}

fn load_trap_payload(coord: vec2<i32>) -> vec4<f32> {
  if (uni.trapLayerBase < 0.0) { return invalid_trap_payload(); }
  let base = i32(uni.trapLayerBase);
  let distance = load_layer(coord, base);
  let valid = distance == distance && distance < 1e29;
  return select(
    invalid_trap_payload(),
    vec4<f32>(distance, load_layer(coord, base + 1), load_layer(coord, base + 2), 1.0),
    valid,
  );
}

fn store_trap_payload(coord: vec2<i32>, payload: vec4<f32>) {
  if (uni.trapLayerBase >= 0.0) {
    textureStore(trapOut, coord, payload);
  }
}

fn quantize_unit(value: f32) -> u32 {
  let finite = select(0.0, value, finite_scalar(value));
  return u32(round(clamp(finite, 0.0, 1.0) * f32(QUANTIZED_MAX)));
}

fn provenance_exponent(step: u32) -> u32 {
  var value = max(step, 1u);
  var exponent = 0u;
  loop {
    if (value <= 1u || exponent >= 15u) { break; }
    value = value / 2u;
    exponent = exponent + 1u;
  }
  return exponent;
}

fn pack_metadata(step: u32, stripePhase: f32, coherence: f32) -> u32 {
  let stripe = quantize_unit(fract(stripePhase + 1.0));
  let coherenceBits = quantize_unit(coherence);
  return provenance_exponent(step) | (stripe << 4u) | (coherenceBits << 18u);
}

fn smooth_frac(zSquared: f32, logMu: f32) -> f32 {
  let logZ2 = log(max(zSquared, 1e-12));
  return clamp(1.0 - log(max(logZ2 / logMu, 1e-12)) / LN_2, 0.0, 1.0);
}

fn decode_terminal_stripe(word: u32) -> f32 {
  return f32(word & QUANTIZED_MAX) / f32(QUANTIZED_MAX);
}

fn decode_terminal_coherence(word: u32) -> f32 {
  return f32((word >> 14u) & QUANTIZED_MAX) / f32(QUANTIZED_MAX);
}

fn phase_to_dir(phase: f32) -> vec2<f32> {
  let angle = phase * TWO_PI;
  return vec2<f32>(cos(angle), sin(angle));
}

fn rotate_inverse(point: vec2<f32>, angle: f32) -> vec2<f32> {
  let c = cos(angle);
  let s = sin(angle);
  return vec2<f32>(c * point.x + s * point.y, -s * point.x + c * point.y);
}

fn is_inside_rotated_screen(xyNeutral: vec2<f32>) -> bool {
  let neutralExtent = sqrt(uni.aspect * uni.aspect + 1.0);
  let local = rotate_inverse(xyNeutral * neutralExtent, uni.angle);
  return abs(local.x) <= uni.aspect && abs(local.y) <= 1.0;
}

fn finite_or_zero(value: f32, minimum: f32, maximum: f32) -> f32 {
  return clamp(select(0.0, value, finite_scalar(value)), minimum, maximum);
}

fn load_terminal_geometry(coord: vec2<i32>) -> vec4<f32> {
  return vec4<f32>(
    finite_or_zero(load_layer(coord, 1), -64.0, 64.0),
    finite_or_zero(load_layer(coord, 5), -64.0, 64.0),
    finite_or_zero(load_layer(coord, 7), 0.0, 64.0),
    finite_or_zero(load_layer(coord, 4), -64.0, 64.0),
  );
}

// Per-texel gradients of the two orbit metrics. Unlike the stripe phase and
// the coherence they differentiate, these are plain vectors: every support
// rule below can average them the way it averages the cached geometry.
fn load_terminal_orbit_gradient(coord: vec2<i32>) -> vec4<f32> {
  return vec4<f32>(
    finite_or_zero(load_layer(coord, 13), -64.0, 64.0),
    finite_or_zero(load_layer(coord, 14), -64.0, 64.0),
    finite_or_zero(load_layer(coord, 15), -64.0, 64.0),
    finite_or_zero(load_layer(coord, 16), -64.0, 64.0),
  );
}

fn is_finished(coord: vec2<i32>) -> bool {
  let iter = load_layer(coord, 0);
  if (iter == 0.0) { return true; }
  if (iter < 0.0) { return false; }
  let z = vec2<f32>(load_layer(coord, 2), load_layer(coord, 3));
  return dot(z, z) >= uni.mu;
}

fn load_finished(coord: vec2<i32>, outputCoord: vec2<i32>, step: u32) -> FragOut {
  var out: FragOut;
  out.iter = load_layer(coord, 0);
  out.zx = load_layer(coord, 2);
  out.zy = load_layer(coord, 3);
  let escaped = out.iter > 0.0;
  out.geometry = select(vec4<f32>(0.0), load_terminal_geometry(coord), escaped);
  out.orbitGradient = select(vec4<f32>(0.0), load_terminal_orbit_gradient(coord), escaped);
  let terminalMetrics = bitcast<u32>(load_layer(coord, 6));
  let stripe = select(0.0, decode_terminal_stripe(terminalMetrics), escaped);
  let coherence = select(0.0, decode_terminal_coherence(terminalMetrics), escaped);
  out.metadata = pack_metadata(step, stripe, coherence);
  store_trap_payload(outputCoord, load_trap_payload(coord));
  return out;
}

fn no_data(coord: vec2<i32>) -> FragOut {
  var out: FragOut;
  out.iter = -1.0;
  out.zx = 0.0;
  out.zy = 0.0;
  out.geometry = vec4<f32>(0.0);
  out.metadata = 0u;
  out.orbitGradient = vec4<f32>(0.0);
  store_trap_payload(coord, invalid_trap_payload());
  return out;
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> FragOut {
  let dims = vec2<u32>(textureDimensions(rawTex));
  let x = u32(clamp(uv.x * f32(dims.x), 0.0, f32(dims.x - 1u)));
  let y = u32(clamp((1.0 - uv.y) * f32(dims.y), 0.0, f32(dims.y - 1u)));
  let coord = vec2<i32>(i32(x), i32(y));
  if (!is_inside_rotated_screen(uv * 2.0 - vec2<f32>(1.0))) {
    return no_data(coord);
  }

  if (is_finished(coord)) {
    return load_finished(coord, coord, 1u);
  }

  let logMu = log(max(uni.mu, 1.0001));
  var step = 2u;
  for (var level = 0u; level < 15u; level = level + 1u) {
    if (step >= dims.x || step >= dims.y) { return no_data(coord); }
    let stepI = i32(step);
    let base = vec2<i32>(i32(x) - i32(x) % stepI, i32(y) - i32(y) % stepI);
    let fraction = vec2<f32>(f32(i32(x) % stepI), f32(i32(y) % stepI)) / f32(stepI);
    let weights = array<f32, 4>(
      (1.0 - fraction.x) * (1.0 - fraction.y),
      fraction.x * (1.0 - fraction.y),
      (1.0 - fraction.x) * fraction.y,
      fraction.x * fraction.y
    );
    let candidates = array<vec2<i32>, 4>(
      base, base + vec2<i32>(stepI, 0),
      base + vec2<i32>(0, stepI), base + vec2<i32>(stepI)
    );

    var escapedWeight = 0.0;
    var escapedCount = 0u;
    var insideWeight = 0.0;
    var insideCount = 0u;
    var baseIter = -1.0;
    var nuSum = 0.0;
    var geometrySum = vec4<f32>(0.0);
    var orbitGradientSum = vec4<f32>(0.0);
    var zDirectionSum = vec2<f32>(0.0);
    var stripeDirectionSum = vec2<f32>(0.0);
    var coherenceSum = 0.0;
    var bestInsideWeight = -1.0;
    var bestInsideCoord = vec2<i32>(0);
    var bestEscapedWeight = -1.0;
    var bestEscapedCoord = vec2<i32>(0);
    var firstFinishedCoord = vec2<i32>(0);
    var hasFinished = false;

    for (var i = 0u; i < 4u; i = i + 1u) {
      let candidate = candidates[i];
      if (candidate.x < 0 || candidate.y < 0 || candidate.x >= i32(dims.x) || candidate.y >= i32(dims.y)
          || !is_finished(candidate)) {
        continue;
      }
      let weight = weights[i];
      let iter = load_layer(candidate, 0);
      if (!hasFinished) {
        hasFinished = true;
        firstFinishedCoord = candidate;
      }
      if (iter == 0.0) {
        insideCount = insideCount + 1u;
        insideWeight = insideWeight + weight;
        if (weight > bestInsideWeight) {
          bestInsideWeight = weight;
          bestInsideCoord = candidate;
        }
        continue;
      }

      let z = vec2<f32>(load_layer(candidate, 2), load_layer(candidate, 3));
      if (baseIter < 0.0) { baseIter = iter; }
      escapedCount = escapedCount + 1u;
      escapedWeight = escapedWeight + weight;
      if (weight > bestEscapedWeight) {
        bestEscapedWeight = weight;
        bestEscapedCoord = candidate;
      }
      nuSum = nuSum + weight * ((iter - baseIter) + smooth_frac(dot(z, z), logMu));
      geometrySum = geometrySum + weight * load_terminal_geometry(candidate);
      orbitGradientSum = orbitGradientSum + weight * load_terminal_orbit_gradient(candidate);
      zDirectionSum = zDirectionSum + weight * z / max(length(z), 1e-12);
      let terminalMetrics = bitcast<u32>(load_layer(candidate, 6));
      stripeDirectionSum = stripeDirectionSum + weight * phase_to_dir(decode_terminal_stripe(terminalMetrics));
      coherenceSum = coherenceSum + weight * decode_terminal_coherence(terminalMetrics);
    }

    if (escapedCount + insideCount >= 3u) {
      if (insideWeight > escapedWeight) { return load_finished(bestInsideCoord, coord, step); }
      if (escapedWeight > 1e-6) {
        let inverseWeight = 1.0 / escapedWeight;
        let relativeNu = nuSum * inverseWeight;
        let relativeFloor = floor(relativeNu);
        var iterOut = baseIter + relativeFloor;
        var fractionNu = clamp(relativeNu - relativeFloor, 0.0, 0.9999);
        if (iterOut < 1.0) {
          iterOut = 1.0;
          fractionNu = 0.0;
        }
        let logZ2 = logMu * exp2(1.0 - fractionNu);
        let zLength = exp(0.5 * logZ2);
        let directionLength = length(zDirectionSum);
        let direction = select(vec2<f32>(1.0, 0.0), zDirectionSum / directionLength, directionLength > 1e-5);
        let stripe = select(0.0, fract(atan2(stripeDirectionSum.y, stripeDirectionSum.x) / TWO_PI + 1.0), length(stripeDirectionSum) > 1e-5);
        var out: FragOut;
        out.iter = iterOut;
        out.zx = direction.x * zLength;
        out.zy = direction.y * zLength;
        out.geometry = clamp(
          geometrySum * inverseWeight,
          vec4<f32>(-64.0, -64.0, 0.0, -64.0),
          vec4<f32>(64.0),
        );
        out.metadata = pack_metadata(step, stripe, coherenceSum * inverseWeight);
        out.orbitGradient = clamp(
          orbitGradientSum * inverseWeight,
          vec4<f32>(-64.0),
          vec4<f32>(64.0),
        );
        store_trap_payload(coord, load_trap_payload(bestEscapedCoord));
        return out;
      }
      if (hasFinished) { return load_finished(firstFinishedCoord, coord, step); }
    }
    step = step * 2u;
  }
  return no_data(coord);
}
