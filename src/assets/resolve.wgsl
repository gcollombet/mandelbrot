// Presentation-only resolve pass.
//
// Raw terminal texels are exact step-1 values. An exact request (iter == -1)
// or a budget-exhausted continuation may temporarily borrow finished dyadic
// support, starting at step 2. This pass never writes back into raw orbit state.

struct ResolveUniforms {
  mu: f32,
  _padding0: f32,
  _padding1: f32,
  _padding2: f32,
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

struct FragOut {
  @location(0) iter: vec4<f32>,
  @location(1) genuine: vec4<f32>,
  @location(2) zx: vec4<f32>,
  @location(3) zy: vec4<f32>,
  @location(4) dzx: vec4<f32>,
  @location(5) dzy: vec4<f32>,
  @location(6) ref_i: vec4<f32>,
  @location(7) avgDirection: vec4<f32>,
};

fn pack(v: f32) -> vec4<f32> {
  return vec4<f32>(v, 0.0, 0.0, 0.0);
}

fn loadLayer(coord: vec2<i32>, layer: i32) -> f32 {
  return textureLoad(rawTex, coord, layer, 0).r;
}

fn load_finished(coord: vec2<i32>, step: u32) -> FragOut {
  var o: FragOut;
  o.iter = pack(loadLayer(coord, 0));
  o.genuine = pack(f32(step));
  o.zx = pack(loadLayer(coord, 2));
  o.zy = pack(loadLayer(coord, 3));
  o.dzx = pack(loadLayer(coord, 4));
  o.dzy = pack(loadLayer(coord, 5));
  o.ref_i = pack(loadLayer(coord, 6));
  o.avgDirection = pack(loadLayer(coord, 7));
  return o;
}

fn no_data() -> FragOut {
  var o: FragOut;
  o.iter = pack(-1.0);
  o.genuine = pack(0.0);
  o.zx = pack(0.0);
  o.zy = pack(0.0);
  o.dzx = pack(0.0);
  o.dzy = pack(0.0);
  o.ref_i = pack(0.0);
  o.avgDirection = pack(0.0);
  return o;
}

const TWO_PI: f32 = 6.283185307179586;
const LN_2: f32 = 0.6931471805599453;
const ORBIT_DIRECTION_SCALE: f32 = 4095.0;
const ORBIT_DIRECTION_BASE: f32 = 4096.0;

fn smooth_frac(z_sq: f32, logMu: f32) -> f32 {
  let log_z2 = log(max(z_sq, 1e-12));
  return clamp(1.0 - log(max(log_z2 / logMu, 1e-12)) / LN_2, 0.0, 1.0);
}

fn decode_avg_dir(encoded: f32) -> vec2<f32> {
  let xq = floor(encoded / ORBIT_DIRECTION_BASE);
  let yq = encoded - xq * ORBIT_DIRECTION_BASE;
  return vec2<f32>(
    (xq / ORBIT_DIRECTION_SCALE - 0.5) * 2.0,
    (yq / ORBIT_DIRECTION_SCALE - 0.5) * 2.0,
  );
}

fn encode_avg_dir(avgDir: vec2<f32>) -> f32 {
  let phase = clamp(avgDir * 0.5 + vec2<f32>(0.5), vec2<f32>(0.0), vec2<f32>(1.0));
  let xq = floor(phase.x * ORBIT_DIRECTION_SCALE + 0.5);
  let yq = floor(phase.y * ORBIT_DIRECTION_SCALE + 0.5);
  return xq * ORBIT_DIRECTION_BASE + yq;
}

fn phase_to_dir(phase: f32) -> vec2<f32> {
  let a = phase * TWO_PI;
  return vec2<f32>(cos(a), sin(a));
}

fn is_finished(coord: vec2<i32>) -> bool {
  let iter = loadLayer(coord, 0);
  if (iter == 0.0) {
    return true;
  }
  if (iter < 0.0) {
    return false;
  }
  let z = vec2<f32>(loadLayer(coord, 2), loadLayer(coord, 3));
  return dot(z, z) >= uni.mu;
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> FragOut {
  let dims = vec2<u32>(textureDimensions(rawTex));
  let x = u32(clamp(uv.x * f32(dims.x), 0.0, f32(dims.x - 1u)));
  let y = u32(clamp((1.0 - uv.y) * f32(dims.y), 0.0, f32(dims.y - 1u)));
  let coord = vec2<i32>(i32(x), i32(y));

  if (is_finished(coord)) {
    return load_finished(coord, 1u);
  }

  let logMu = log(max(uni.mu, 1.0001));
  var step_u = 2u;

  for (var level = 0u; level < 31u; level = level + 1u) {
    if (step_u >= dims.x || step_u >= dims.y) {
      return no_data();
    }

    let step_i = i32(step_u);
    let mx = i32(x) % step_i;
    let my = i32(y) % step_i;
    let base_x = i32(x) - mx;
    let base_y = i32(y) - my;
    let fx = f32(mx) / f32(step_i);
    let fy = f32(my) / f32(step_i);
    let weights = array<f32, 4>(
      (1.0 - fx) * (1.0 - fy),
      fx * (1.0 - fy),
      (1.0 - fx) * fy,
      fx * fy
    );
    let candidates = array<vec2<i32>, 4>(
      vec2<i32>(base_x, base_y),
      vec2<i32>(base_x + step_i, base_y),
      vec2<i32>(base_x, base_y + step_i),
      vec2<i32>(base_x + step_i, base_y + step_i)
    );

    var wEscaped = 0.0;
    var nEscaped = 0u;
    var baseIter = -1.0;
    var nuSum = 0.0;
    var distSum = 0.0;
    var zDirSum = vec2<f32>(0.0);
    var angleDirSum = vec2<f32>(0.0);
    var stripeDirSum = vec2<f32>(0.0);
    var avgDirSum = vec2<f32>(0.0);
    var bestEscapedW = -1.0;
    var bestRefInt = 0.0;
    var bestAngle = 0.0;
    var bestStripe = 0.0;

    var wInside = 0.0;
    var nInside = 0u;
    var bestInsideW = -1.0;
    var bestInsideCoord = vec2<i32>(0);
    var hasFinished = false;
    var firstFinishedCoord = vec2<i32>(0);

    for (var i = 0u; i < 4u; i = i + 1u) {
      let ccoord = candidates[i];
      if (ccoord.x < 0 || ccoord.y < 0 || ccoord.x >= i32(dims.x) || ccoord.y >= i32(dims.y)) {
        continue;
      }
      if (!is_finished(ccoord)) {
        continue;
      }

      let w = weights[i];
      let citer = loadLayer(ccoord, 0);
      if (!hasFinished) {
        hasFinished = true;
        firstFinishedCoord = ccoord;
      }

      if (citer == 0.0) {
        nInside = nInside + 1u;
        wInside = wInside + w;
        if (w > bestInsideW) {
          bestInsideW = w;
          bestInsideCoord = ccoord;
        }
        continue;
      }

      let z = vec2<f32>(loadLayer(ccoord, 2), loadLayer(ccoord, 3));
      let z_sq = dot(z, z);
      if (baseIter < 0.0) {
        baseIter = citer;
      }
      nEscaped = nEscaped + 1u;
      wEscaped = wEscaped + w;
      nuSum = nuSum + w * ((citer - baseIter) + smooth_frac(z_sq, logMu));
      distSum = distSum + w * loadLayer(ccoord, 4);
      let angle = loadLayer(ccoord, 5);
      angleDirSum = angleDirSum + w * vec2<f32>(cos(angle), sin(angle));
      zDirSum = zDirSum + w * z / max(length(z), 1e-12);
      let refVal = max(loadLayer(ccoord, 6), 0.0);
      let stripePhase = fract(refVal);
      stripeDirSum = stripeDirSum + w * phase_to_dir(stripePhase);
      avgDirSum = avgDirSum + w * decode_avg_dir(loadLayer(ccoord, 7));
      if (w > bestEscapedW) {
        bestEscapedW = w;
        bestRefInt = floor(refVal);
        bestAngle = angle;
        bestStripe = stripePhase;
      }
    }

    let nResolved = nEscaped + nInside;
    if (nResolved >= 3u) {
      if (wInside > wEscaped) {
        return load_finished(bestInsideCoord, step_u);
      }

      if (wEscaped > 1e-6) {
        let invW = 1.0 / wEscaped;
        let nuRel = nuSum * invW;
        let relFloor = floor(nuRel);
        var iterOut = baseIter + relFloor;
        var frac = clamp(nuRel - relFloor, 0.0, 0.9999);
        if (iterOut < 1.0) {
          iterOut = 1.0;
          frac = 0.0;
        }
        let log_z2 = logMu * exp2(1.0 - frac);
        let zLenOut = exp(0.5 * log_z2);
        let zDirLen = length(zDirSum);
        let zDir = select(vec2<f32>(1.0, 0.0), zDirSum / zDirLen, zDirLen > 1e-5);
        let zOut = zDir * zLenOut;
        let angleOut = select(bestAngle, atan2(angleDirSum.y, angleDirSum.x), length(angleDirSum) > 1e-5);
        let stripeOut = select(
          bestStripe,
          fract(atan2(stripeDirSum.y, stripeDirSum.x) / TWO_PI + 1.0),
          length(stripeDirSum) > 1e-5
        );

        var o: FragOut;
        o.iter = pack(iterOut);
        o.genuine = pack(f32(step_u));
        o.zx = pack(zOut.x);
        o.zy = pack(zOut.y);
        o.dzx = pack(distSum * invW);
        o.dzy = pack(angleOut);
        o.ref_i = pack(bestRefInt + min(stripeOut, 0.999999));
        o.avgDirection = pack(encode_avg_dir(clamp(avgDirSum * invW, vec2<f32>(-1.0), vec2<f32>(1.0))));
        return o;
      }

      if (hasFinished) {
        return load_finished(firstFinishedCoord, step_u);
      }
    }

    step_u = step_u * 2u;
  }

  return no_data();
}
