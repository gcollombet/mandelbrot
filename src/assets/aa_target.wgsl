// One-shot bake of the per-neutral-texel AA sample-count target, fusing three
// aliasing predictors IN TARGET SPACE (max of per-predictor ramps — design
// D-contrast):
//
//   1. DE ramp (geometry): distance estimate from the converged neutral
//      texture — the only predictor that sees sub-pixel features invisible in
//      the 1:1 render (filaments between samples).
//   2. Contrast ramp: 3×3 Sobel on the luma of the converged, colorized
//      sample-0 image (the accumulation texture right after the first
//      composite) — catches palette banding, zebra, stripe/trap/texture edges
//      and shading contours the DE cannot see, on BOTH sides of the interior
//      boundary (no interior clamp).
//   3. Moiré saturation: where the palette phase advances faster than Nyquist
//      per screen pixel, edge magnitude under-reports the aliasing — force the
//      full sample budget (averaging toward the palette mean is the correct
//      output there).
//
// Neutral layer layout (see mandelbrot_brush.wgsl):
//   layer 0 = iter  (> 0 escaped, == 0 interior/in-set)
//   layer 2/3 = escape z (for ν)
//   layer 4 = distance_height = clamp(-log(DE_texels), -64, 64); high → near boundary.
//
// Result: target sample count in [1, antialiasLevel].

struct AaParams {
  antialiasLevel: f32,
  aaSampleIndex: f32,   // unused here; shared buffer with the reseed pass
  screenHeightPx: f32,  // device-pixel screen height (1 neutral texel == 1 device px)
  aaLogDelta: f32,      // unused here; shared buffer with the reseed pass
  aaAnalytic: f32,      // unused here; shared buffer with the reseed pass
  aspect: f32,          // screen aspect (w/h) — neutral→screen projection
  sceneSin: f32,        // scene rotation — neutral→screen projection
  sceneCos: f32,
  screenWidthPx: f32,   // device-pixel screen width
  palettePeriod: f32,   // palette period in ν·2 units (color.wgsl phase = ν·2/period)
  mu: f32,              // escape radius² (ν computation)
  logMu: f32,           // ln(mu)
  aaContrast: f32,      // 1 = contrast + moiré predictors enabled
  aaFull: f32,          // 1 = FULL AA: every texel gets the whole budget (A/B vs adaptive)
  _pad1: f32,
  _pad2: f32,
};

// Boundary-distance ramp (device px): full sample count within R_FULL, tapering
// to 1 sample by R_OUT. Distance to the set boundary is recovered exactly as
// de_px = (screenHeightPx / 2) * exp(-height), since height = ln((H/2) / DE_px).
const R_FULL: f32 = 1.0;
const R_OUT: f32 = 6.0;

// Sobel ramp (sRGB channel units; a full-contrast step edge reads |g| ≈ 4).
// The magnitude is the MAX over the R/G/B channel gradients — iteration
// banding between iso-luma hues is invisible to a luma-only Sobel. The ramp
// saturates early (EDGE_HI 0.8): a hard band edge needs the full budget to
// resolve cleanly under the box kernel; mid-ramp counts leave visible steps.
// Tunable constants first — field round decides if they need exposure.
const EDGE_LO: f32 = 0.08;
const EDGE_HI: f32 = 0.8;

// Moiré: palette phase advance per screen pixel above which the region
// saturates to the full budget (Nyquist = half a period per pixel).
const NYQUIST_PHASE_STEP: f32 = 0.5;

@group(0) @binding(0) var src: texture_2d_array<f32>;
@group(0) @binding(1) var dst: texture_storage_2d<r32float, write>;
@group(0) @binding(2) var<uniform> params: AaParams;
// Sample-0 composite: linear RGB, alpha = 1 (single accumulated sample),
// device-pixel resolution.
@group(0) @binding(3) var accumTex: texture_2d<f32>;

fn linear_to_srgb_vec(c: vec3<f32>) -> vec3<f32> {
  let cl = max(c, vec3<f32>(0.0));
  let cutoff = cl <= vec3<f32>(0.0031308);
  let low = cl * 12.92;
  let high = vec3<f32>(1.055) * pow(cl, vec3<f32>(1.0 / 2.4)) - vec3<f32>(0.055);
  return select(high, low, cutoff);
}

// sRGB-encoded color of the sample-0 composite at a (clamped) screen texel.
// The accumulator stores LINEAR sums (sample 0 has alpha = 1, so .rgb is the
// linear color); the Sobel thresholds are perceptual → encode to sRGB.
fn srgb_at(px: vec2<i32>, dim: vec2<i32>) -> vec3<f32> {
  let p = clamp(px, vec2<i32>(0), dim - vec2<i32>(1));
  return linear_to_srgb_vec(textureLoad(accumTex, p, 0).rgb);
}

// Smooth iteration ν of a neutral texel; −1 when not escaped/no data.
fn nu_at(coord: vec2<i32>, dim: vec2<i32>) -> f32 {
  if (coord.x < 0 || coord.x >= dim.x || coord.y < 0 || coord.y >= dim.y) {
    return -1.0;
  }
  let iter = textureLoad(src, coord, 0, 0).r;
  if (iter <= 0.0) {
    return -1.0;
  }
  let zx = textureLoad(src, coord, 2, 0).r;
  let zy = textureLoad(src, coord, 3, 0).r;
  let z_sq = zx * zx + zy * zy;
  if (z_sq < params.mu) {
    return -1.0;
  }
  let logMu = max(params.logMu, 1e-6);
  let frac = clamp(1.0 - log(max(log(max(z_sq, 1e-12)) / logMu, 1e-12)) / log(2.0), 0.0, 1.0);
  return iter + frac;
}

@compute @workgroup_size(16, 16)
fn cs_main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dim = textureDimensions(dst);
  if (gid.x >= dim.x || gid.y >= dim.y) {
    return;
  }
  let coord = vec2<i32>(i32(gid.x), i32(gid.y));
  let iter = textureLoad(src, coord, 0, 0).r;
  let height = textureLoad(src, coord, 4, 0).r;
  let level = max(params.antialiasLevel, 1.0);
  let dimI = vec2<i32>(i32(dim.x), i32(dim.y));

  // Full AA (adaptive off): uniform budget everywhere — the DPR×N-style
  // reference for A/B against the adaptive predictors.
  if (params.aaFull > 0.5) {
    textureStore(dst, coord, vec4<f32>(level, 0.0, 0.0, 0.0));
    return;
  }

  var tgt = 1.0;

  // ── 1. DE ramp (escaped pixels carry a meaningful exterior distance) ──
  if (iter > 0.0) {
    let de_px = (params.screenHeightPx * 0.5) * exp(-height);
    let t = 1.0 - smoothstep(R_FULL, R_OUT, de_px);
    tgt = max(tgt, 1.0 + t * (level - 1.0));
  }

  if (params.aaContrast > 0.5) {
    // Neutral texel → screen texel (inverse of shade_srgb's screen→neutral).
    let texSizeF = vec2<f32>(f32(dim.x), f32(dim.y));
    let uv_neutral = vec2<f32>(
      (f32(coord.x) + 0.5) / texSizeF.x,
      1.0 - (f32(coord.y) + 0.5) / texSizeF.y,
    );
    let xy_neutral = uv_neutral * 2.0 - vec2<f32>(1.0);
    let neutralExtent = sqrt(params.aspect * params.aspect + 1.0);
    let local_rot = xy_neutral * neutralExtent;
    // rotate_inverse_sincos from color.wgsl.
    let local = vec2<f32>(
      params.sceneCos * local_rot.x + params.sceneSin * local_rot.y,
      -params.sceneSin * local_rot.x + params.sceneCos * local_rot.y,
    );
    let onScreen = abs(local.x) <= params.aspect && abs(local.y) <= 1.0;
    if (onScreen) {
      // ── 2. Contrast ramp (Sobel on the colorized sample 0) ──
      let uv_screen = vec2<f32>(local.x / max(params.aspect, 1e-6), local.y) * 0.5 + vec2<f32>(0.5);
      let accumDim = vec2<i32>(textureDimensions(accumTex));
      let spx = vec2<i32>(
        i32(clamp(uv_screen.x * params.screenWidthPx, 0.0, params.screenWidthPx - 1.0)),
        i32(clamp((1.0 - uv_screen.y) * params.screenHeightPx, 0.0, params.screenHeightPx - 1.0)),
      );
      let c00 = srgb_at(spx + vec2<i32>(-1, -1), accumDim);
      let c10 = srgb_at(spx + vec2<i32>(0, -1), accumDim);
      let c20 = srgb_at(spx + vec2<i32>(1, -1), accumDim);
      let c01 = srgb_at(spx + vec2<i32>(-1, 0), accumDim);
      let c21 = srgb_at(spx + vec2<i32>(1, 0), accumDim);
      let c02 = srgb_at(spx + vec2<i32>(-1, 1), accumDim);
      let c12 = srgb_at(spx + vec2<i32>(0, 1), accumDim);
      let c22 = srgb_at(spx + vec2<i32>(1, 1), accumDim);
      // Per-channel Sobel; edge magnitude = max over R/G/B so iso-luma hue
      // banding still registers.
      let gxv = (c20 + 2.0 * c21 + c22) - (c00 + 2.0 * c01 + c02);
      let gyv = (c02 + 2.0 * c12 + c22) - (c00 + 2.0 * c10 + c20);
      let gv = sqrt(gxv * gxv + gyv * gyv);
      let g = max(gv.r, max(gv.g, gv.b));
      let tc = smoothstep(EDGE_LO, EDGE_HI, g);
      tgt = max(tgt, 1.0 + tc * (level - 1.0));

      // ── 3. Moiré saturation (palette phase frequency past Nyquist) ──
      // color.wgsl: phase = ν·2 / palettePeriod → phase step per texel =
      // |∇ν|·2 / period. Central differences on valid escaped neighbours;
      // the boundary-divergent ν band is already covered by the DE ramp.
      let nuC = nu_at(coord, dimI);
      if (nuC >= 0.0) {
        let nR = nu_at(coord + vec2<i32>(1, 0), dimI);
        let nL = nu_at(coord - vec2<i32>(1, 0), dimI);
        let nU = nu_at(coord + vec2<i32>(0, 1), dimI);
        let nD = nu_at(coord - vec2<i32>(0, 1), dimI);
        let gnx = 0.5 * (select(nuC, nR, nR >= 0.0) - select(nuC, nL, nL >= 0.0));
        let gny = 0.5 * (select(nuC, nU, nU >= 0.0) - select(nuC, nD, nD >= 0.0));
        let phaseStep = sqrt(gnx * gnx + gny * gny) * 2.0 / max(params.palettePeriod, 1e-4);
        if (phaseStep > NYQUIST_PHASE_STEP) {
          tgt = level;
        }
      }
    }
  }

  textureStore(dst, coord, vec4<f32>(clamp(round(tgt), 1.0, level), 0.0, 0.0, 0.0));
}
