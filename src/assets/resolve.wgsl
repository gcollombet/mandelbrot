// Resolve pass: replaces remaining sentinels with a snapped parent pixel.
//
// Input: the RAW state texture (13 r32float layers — see mandelbrot_brush.wgsl);
// output: the 8-layer resolved texture (MRT). Only FINISHED pixels are ever
// interpreted here (sentinels and budget-exhausted continuations are replaced
// by finished ancestors), so the in-progress raw derivative in layers 4/5/8
// is never read — layers 4/5 below are the escaped format.
//
// Layer layout (finished pixels):
//   0 : iteration count (integer part)
//   1 : resolution step (1.0 = genuine pixel, >= 2 = resolve-copied from grid step)
//   2 : z.x
//   3 : z.y
//   4 : distance height (escaped)
//   5 : visual derivative angle (escaped)
//   6 : ref_i + fractional stripe phase (reference orbit index for resuming perturbation)
//   7 : packed average orbit direction
//
// Sentinel convention:
//   If layer0 == -step (step is power-of-two > 1), resolve by bilinearly
//   interpolating the 4 corner anchors of the grid cell (weights from the
//   fractional position inside the cell, unfinished corners masked out).
//   This smooths the progressive preview instead of producing flat squares.
//   Interpolated quantities:
//     - nu (smooth iteration) — interpolated continuously, then re-encoded
//       as iter = floor(nu) plus a synthetic |z| that reproduces fract(nu)
//       through the smooth-escape formula used by color.wgsl;
//     - z direction — interpolated as unit vectors (orbit traps / mapping);
//     - distance height (layer 4) — plain lerp;
//     - derivative angle (layer 5) — circular lerp via (cos, sin);
//     - stripe phase (layer 6 fraction) — circular lerp; integer ref_i is
//       taken from the dominant corner;
//     - average orbit direction (layer 7) — unpacked, lerped, repacked.
//   If a cell straddles the set boundary, the group (inside vs escaped)
//   with the larger total weight wins, to avoid false halos at the edge.
//   If no corner is finished, climb to the next coarser grid level.

struct ResolveUniforms {
  mu: f32,
  gridOffsetX: f32,
  gridOffsetY: f32,
  // ln(c-units per raw-texture texel), kept in log space for deep zoom.
  logTexelC: f32,
  // 1 = evaluate terminal analytic value coverage for sentinel texels.
  taylorOverlayEnabled: f32,
  // Relative tolerance on |ẑ − z| for the truncation gate below. The gate binds
  // as ρ ∝ √tol, so loosening it is the cheapest radius there is — see
  // TAYLOR_OVERLAY_TOL in Engine.ts for how far it may go.
  taylorTol: f32,
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

// ── output struct (8 render targets) ──────────────────────────────
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

// Verbatim pass-through of the raw state, layer 1 included.
//
// This replaces the former `discard`: the pass used to run over a resolved
// texture pre-filled by a full copyTextureToTexture, so a discarded fragment
// kept the copied value. Writing the same value here instead lets the copy go
// away entirely. On a tile-based GPU that removes two of the four traversals
// of the 8 r32float layers (copy read + copy write + attachment load), since a
// discarded fragment never saved the tile store anyway.
fn passthrough(coord: vec2<i32>) -> FragOut {
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

// ── Bilinear interpolation helpers ─────────────────────────────────

const TWO_PI: f32 = 6.283185307179586;
const LN_2: f32 = 0.6931471805599453;
const ORBIT_DIRECTION_SCALE: f32 = 4095.0;
const ORBIT_DIRECTION_BASE: f32 = 4096.0;

// Smooth escape fraction, identical to color.wgsl's escape_nu fraction.
// Returned separately from the iteration count so that nu can be
// interpolated relative to a local base iteration: at deep zooms the
// iteration counts are large and f32 ULP would otherwise quantize the
// interpolated fraction (visible as flat texels again).
fn smooth_frac(z_sq: f32, logMu: f32) -> f32 {
  let log_z2 = log(max(z_sq, 1e-12));
  return clamp(1.0 - log(max(log_z2 / logMu, 1e-12)) / LN_2, 0.0, 1.0);
}

fn cmul(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

struct TaylorCandidate {
  valid: u32,
  score: f32,
  iter: f32,
  z: vec2<f32>,
};

fn invalid_taylor_candidate() -> TaylorCandidate {
  return TaylorCandidate(0u, 1e30, 0.0, vec2<f32>(0.0));
}

// Test one completed integer-grid anchor. The score is the squared normalized
// distance to the current value gate; lower is better. This is a gather
// equivalent of splatting the anchor over its accepted neighbourhood, without
// an owner texture or inverse-coordinate lookup.
fn try_taylor_candidate(
  anchorCoord: vec2<i32>,
  targetCoord: vec2<i32>,
  logMu: f32,
) -> TaylorCandidate {
  if (textureNumLayers(rawTex) <= 12u) {
    return invalid_taylor_candidate();
  }

  let deltaTexel = vec2<f32>(targetCoord - anchorCoord);
  let deltaLen = length(deltaTexel);
  if (deltaLen <= 0.0) {
    return invalid_taylor_candidate();
  }

  let anchorIter = loadLayer(anchorCoord, 0);
  let anchorZ = vec2<f32>(loadLayer(anchorCoord, 2), loadLayer(anchorCoord, 3));
  let s = loadLayer(anchorCoord, 8);
  let m1 = vec2<f32>(loadLayer(anchorCoord, 9), loadLayer(anchorCoord, 10));
  let m2 = vec2<f32>(loadLayer(anchorCoord, 11), loadLayer(anchorCoord, 12));
  // `dot(m2, m2) > 0` is a REQUIREMENT, not a finiteness check. A z″ mantissa
  // that reads as zero means "unmeasurable", never "no error": the stored value
  // is z″/|z′|², so under the f32 floor the quadratic term is negligible against
  // the LINEAR one while the actual truncation is then set by z‴, which is not
  // stored and may bind at a single pixel. color.wgsl's reach view paints that
  // region its own flat colour for exactly this reason. Accepting it here would
  // let the gate below pass trivially (a zero term is trivially small) on a
  // model whose error nobody can see — the ε-sized disk around a minibrot.
  // Rejecting costs refinement there and buys correctness.
  let finitePayload = anchorIter > 0.0
    && dot(anchorZ, anchorZ) >= uni.mu
    && abs(s) < 1e6
    && abs(m1.x) < 1e30 && abs(m1.y) < 1e30
    && abs(m2.x) < 1e30 && abs(m2.y) < 1e30
    && length(m1) > 0.0
    && dot(m2, m2) > 0.0;
  if (!finitePayload) {
    return invalid_taylor_candidate();
  }

  let hat = deltaTexel / deltaLen;
  let logDelta = uni.logTexelC + log(deltaLen);
  // No clamp on the folds. A clamp SATURATES — it returns e^80 where the true
  // factor is e^200 — so a saturated high fold reports a small quadratic term
  // for a large true z″ and the gate below would be fed a lie that points the
  // wrong way. Left alone, the same case overflows to inf, and inf fails every
  // comparison in the gate, which is the answer we want. The low side needs no
  // guard either: exp() underflowing to 0 IS the correct limit (the neighbour
  // genuinely carries the anchor's value).
  let logFold = s + logDelta;
  let e1 = exp(logFold);
  let e2 = exp(2.0 * logFold);
  let linear = cmul(m1, hat) * e1;
  // Exactly ½·z″·δc², the last term the model RETAINS: m2 = z″/|z′|² and
  // e2 = (|z′|·|δc|)².
  let quadratic = cmul(cmul(m2, hat), hat) * (0.5 * e2);

  // ── truncation gate ───────────────────────────────────────────────────────
  //
  // Without this, acceptance was "payload finite AND the prediction still looks
  // escaped" — plausibility, not validity. Measured at σ = 1e-3
  // (reach_census), the honest radius medians
  // 7.5 px at misiurewicz, 5.9 px at seahorse, 2.3 px at elephant and 0.32 px on
  // the triple spiral, against the 5.7 px a step-8 cell asks of its corner — so
  // on two of those four views the median texel was already out of range.
  //
  // The criterion is ρ_last (½|z″|ρ² = tol·|z|), which is the first term that
  // WOULD be dropped if the model were linear, not the first one dropped by the
  // quadratic model — that would be z‴, which is not in the payload. The census
  // measured ρ_last at 1.85 log2 (×3.6) BELOW the honest ρ_next, so the gate is
  // conservative by a bounded, known factor: it refines more than strictly
  // necessary, never less.
  let anchorZSq = dot(anchorZ, anchorZ);
  let tol = max(uni.taylorTol, 0.0);
  let score = dot(quadratic, quadratic) / max(tol * tol * anchorZSq, 1e-30);
  if (!(score <= 1.0)) {
    return invalid_taylor_candidate();
  }

  let zhat = anchorZ + linear + quadratic;
  let zhatSq = dot(zhat, zhat);
  // Taylor is evaluated at the anchor's escape iteration. If the predicted
  // target is no longer escaped there, the target changed iteration branch;
  // keep the complete spatial resolve instead of extrapolating log-log below
  // bailout. The upper bound is what rejects an overflowed fold: inf passes
  // `>= mu` trivially and would render as a flat band at fraction 0.
  if (!(zhatSq >= uni.mu && zhatSq < 1e30)) {
    return invalid_taylor_candidate();
  }

  let fracOut = smooth_frac(zhatSq, logMu);

  // Synthetic escaped magnitude that reproduces fracOut in color.wgsl,
  // while retaining the Taylor-predicted direction.
  let logZ2Out = logMu * exp2(1.0 - fracOut);
  let zhatLen = sqrt(zhatSq);
  let zOut = zhat * (exp(0.5 * logZ2Out) / zhatLen);

  return TaylorCandidate(1u, score, anchorIter, zOut);
}

// Overlay only the analytically continuable value channels. A half-unit in the
// positive resolved step is the terminal-coverage handshake read by the next
// fused compute frame: integer step = bilinear temporary fill; step + 0.5 =
// Taylor final approximation. Distance/derivative shading and orbit averages
// remain spatial.
fn taylor_overlay(
  spatial: FragOut,
  candidate: TaylorCandidate,
  cellStep: u32,
) -> FragOut {
  if (candidate.valid == 0u || cellStep <= 1u) {
    return spatial;
  }
  var o = spatial;
  o.iter = pack(candidate.iter);
  o.genuine = pack(f32(cellStep) + 0.5);
  o.zx = pack(candidate.z.x);
  o.zy = pack(candidate.z.y);
  return o;
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

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> FragOut {
  let dims = vec2<u32>(textureDimensions(rawTex));
  let x = u32(clamp(uv.x * f32(dims.x), 0.0, f32(dims.x - 1u)));
  let y = u32(clamp((1.0 - uv.y) * f32(dims.y), 0.0, f32(dims.y - 1u)));
  let coord = vec2<i32>(i32(x), i32(y));

  let iter_val = loadLayer(coord, 0);

  // Finished pixel: escaped (iter > 0, |z|² >= mu) or inside (iter == 0).
  // Pass through unchanged.
  if (iter_val == 0.0) {
    return passthrough(coord);
  }
  if (iter_val > 0.0) {
    let zx = loadLayer(coord, 2);
    let zy = loadLayer(coord, 3);
    let z_sq = zx * zx + zy * zy;
    if (z_sq > uni.mu) {
      // Escaped — finished, pass through.
      return passthrough(coord);
    }
    // Budget-exhausted anchor (iter > 0, |z|² < mu):
    // climb to a coarser finished ancestor starting at step 2.
  }

  // At this point the pixel is either:
  //   (a) a sentinel (iter < 0, step > 1) — snap to parent anchor, or
  //   (b) a budget-exhausted anchor — climb to a coarser finished ancestor.

  // -1 should not remain after Mandelbrot pass, but if it does: keep as-is.
  var step_u: u32;
  var requested_step = 0u;
  if (iter_val < 0.0) {
    let step_f = -iter_val;
    if (step_f <= 1.0) {
      return passthrough(coord);
    }
    step_u = floor_power_of_two(u32(step_f));
    requested_step = step_u;
  } else {
    // Budget-exhausted anchor: start climbing from the next coarser grid level.
    step_u = 2u;
  }

  // Interpolate the 4 corner anchors of the grid cell, climbing to coarser
  // steps if no corner is finished.  Finished corners are weighted by the
  // pixel's bilinear position inside the cell; unfinished (sentinel or
  // budget-exhausted) corners get zero weight.  This eliminates both the
  // flat-square look and the Sierpinski-triangle artifact.

  // Grid offset for sentinel alignment after translation.
  let gx = i32(uni.gridOffsetX);
  let gy = i32(uni.gridOffsetY);

  let logMu = log(max(uni.mu, 1.0001));

  // Climb through coarser grid levels. The maximum number of doublings
  // before step_u exceeds the texture size is bounded by log2(max(dims)).
  for (var level = 0u; level < 10u; level = level + 1u) {
    // Safety: if step exceeds texture size, stop climbing and fall back
    // to the pixel itself (prevents runaway on pathological inputs
    // or when all ancestors are unfinished sentinels).
    if (step_u >= dims.x || step_u >= dims.y) {
      return passthrough(coord);
    }

    let step_i = i32(step_u);
    // Snap to grid-aligned anchor, accounting for cumulative shift offset.
    let sx = i32(x) - gx;
    let sy = i32(y) - gy;
    let mx = (sx % step_i + step_i) % step_i;
    let my = (sy % step_i + step_i) % step_i;
    let base_x = sx - mx + gx;
    let base_y = sy - my + gy;

    // Bilinear weights from the fractional position inside the cell.
    let fx = f32(mx) / f32(step_i);
    let fy = f32(my) / f32(step_i);
    var weights = array<f32, 4>(
      (1.0 - fx) * (1.0 - fy),
      fx * (1.0 - fy),
      (1.0 - fx) * fy,
      fx * fy
    );
    var candidates = array<vec2<i32>, 4>(
      vec2<i32>(base_x,          base_y),
      vec2<i32>(base_x + step_i, base_y),
      vec2<i32>(base_x,          base_y + step_i),
      vec2<i32>(base_x + step_i, base_y + step_i)
    );

    // Accumulators for escaped corners.  nu is accumulated relative to
    // baseIter (the first escaped corner's iteration count) to keep full
    // f32 precision at deep zooms where iter counts are large.
    var wEscaped = 0.0;
    var nEscaped = 0u;
    var baseIter = -1.0;
    var nuSum = 0.0;
    var distSum = 0.0;
    var zDirSum = vec2<f32>(0.0);
    var angleDirSum = vec2<f32>(0.0);
    var stripeDirSum = vec2<f32>(0.0);
    var avgDirSum = vec2<f32>(0.0);
    // Dominant escaped corner (largest weight) for non-interpolable parts.
    var bestEscapedW = -1.0;
    var bestRefInt = 0.0;
    var bestAngle = 0.0;
    var bestStripe = 0.0;
    // Inside-set corners: track total weight and the dominant one.
    var wInside = 0.0;
    var nInside = 0u;
    var bestInsideW = -1.0;
    var bestInsideCoord = vec2<i32>(0);
    // Fallback when every finished corner has zero bilinear weight
    // (e.g. the pixel sits exactly on an unfinished anchor).
    var hasFinished = false;
    var firstFinishedCoord = vec2<i32>(0);
    var bestTaylor = invalid_taylor_candidate();

    for (var i = 0u; i < 4u; i = i + 1u) {
      let ccoord = candidates[i];

      // Bounds check: skip candidates that fall outside the texture.
      if (ccoord.x < 0 || ccoord.y < 0 || ccoord.x >= i32(dims.x) || ccoord.y >= i32(dims.y)) {
        continue;
      }

      let citer = loadLayer(ccoord, 0);

      // Sentinel — this candidate is not computed yet.
      if (citer < 0.0) {
        continue;
      }

      let w = weights[i];

      // Inside set (iter == 0).
      if (citer == 0.0) {
        if (!hasFinished) {
          hasFinished = true;
          firstFinishedCoord = ccoord;
        }
        nInside = nInside + 1u;
        wInside = wInside + w;
        if (w > bestInsideW) {
          bestInsideW = w;
          bestInsideCoord = ccoord;
        }
        continue;
      }

      // iter > 0: check whether pixel actually escaped or is budget-exhausted.
      let zx = loadLayer(ccoord, 2);
      let zy = loadLayer(ccoord, 3);
      let z_sq = zx * zx + zy * zy;

      if (z_sq < uni.mu) {
        // Budget-exhausted: skip this candidate.
        continue;
      }

      // Escaped — accumulate.
      if (uni.taylorOverlayEnabled >= 0.5 && requested_step > 1u) {
        let taylor = try_taylor_candidate(ccoord, coord, logMu);
        if (taylor.valid != 0u && taylor.score < bestTaylor.score) {
          bestTaylor = taylor;
        }
      }
      if (!hasFinished) {
        hasFinished = true;
        firstFinishedCoord = ccoord;
      }
      if (baseIter < 0.0) {
        baseIter = citer;
      }
      nEscaped = nEscaped + 1u;
      wEscaped = wEscaped + w;
      nuSum = nuSum + w * ((citer - baseIter) + smooth_frac(z_sq, logMu));
      distSum = distSum + w * loadLayer(ccoord, 4);
      let angle = loadLayer(ccoord, 5);
      angleDirSum = angleDirSum + w * vec2<f32>(cos(angle), sin(angle));
      let zLen = max(sqrt(z_sq), 1e-12);
      zDirSum = zDirSum + w * vec2<f32>(zx, zy) / zLen;
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

    // Rank-aware gate: only render this cell at the current level when at
    // least 3 of its 4 corners are RESOLVED (escaped or inside).  With fewer,
    // the renormalized bilinear degenerates — 1 corner → flat square, 2 on an
    // edge → bands, 2 diagonal → singular — so we climb to the coarser level
    // instead.  Counting resolved (not just escaped) corners keeps converged
    // frames identical: once every corner is escaped/inside, nResolved == 4
    // everywhere and nothing climbs.  See design.md of this change.
    let nResolved = nEscaped + nInside;
    if (nResolved >= 3u) {
      // The cell straddles the set boundary: the dominant group wins.
      if (wInside > wEscaped) {
        return loadAllLayersAsCopy(bestInsideCoord, step_u);
      }

      if (wEscaped > 1e-6) {
      // ── Interpolate among escaped corners ──
      let invW = 1.0 / wEscaped;

      // nu: re-encode as iter = floor(nu) + synthetic |z| so that color.wgsl's
      // smooth-escape formula reproduces fract(nu) exactly.  floor/fract are
      // computed on the small relative value to preserve f32 precision.
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

      // Derivative angle: circular interpolation.
      let angleOut = select(bestAngle, atan2(angleDirSum.y, angleDirSum.x), length(angleDirSum) > 1e-5);

      // Stripe phase: circular interpolation; integer ref_i from dominant corner.
      let stripeOut = select(
        bestStripe,
        fract(atan2(stripeDirSum.y, stripeDirSum.x) / TWO_PI + 1.0),
        length(stripeDirSum) > 1e-5
      );
      let refOut = bestRefInt + min(stripeOut, 0.999999);

      var o: FragOut;
      o.iter      = pack(iterOut);
      o.genuine   = pack(f32(step_u));
      o.zx        = pack(zOut.x);
      o.zy        = pack(zOut.y);
      o.dzx       = pack(distSum * invW);
      o.dzy       = pack(angleOut);
      o.ref_i     = pack(refOut);
      o.avgDirection = pack(encode_avg_dir(clamp(avgDirSum * invW, vec2<f32>(-1.0), vec2<f32>(1.0))));
      return taylor_overlay(o, bestTaylor, requested_step);
      }

      // >= 3 resolved corners but all of them carry zero bilinear weight
      // (pixel sits exactly on the lone unresolved corner) — snap to the first
      // resolved corner instead of producing nothing.
      if (hasFinished) {
        return loadAllLayersAsCopy(firstFinishedCoord, step_u);
      }
    }

    // Fewer than 3 resolved corners (degenerate cell) — climb to the next
    // coarser grid level and re-evaluate the same criterion.
    step_u = step_u * 2u;
  }

  // Fallback after exhausting all grid levels.
  return passthrough(coord);
}
