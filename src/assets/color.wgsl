struct Uniforms {
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

// ── Per-pixel effect weights & parameters, read from palette texture ──
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

fn palette(v: f32, v_smooth: f32, z: vec2<f32>, d: f32, dx: f32, dy: f32) -> vec3<f32> {
  let paletteRepeat = max(parameters.palettePeriod, 0.0001);
  let deep = v * 2.0;
  let palettePhase = fract(deep / paletteRepeat + parameters.paletteOffset);

  // ── Sample all effect channels from the palette texture ──
  let fx = sampleEffects(palettePhase);

  // ── Tessellation depth: always smooth, independent of palette period ──
  let tess_depth = v_smooth * 2.0;
  let disp = parameters.displacementAmount;
  let tess_u = tess_depth * 2.0 * disp + dx;
  let tess_v = tess_depth * 2.0 * disp + dy;

  // ── Gentle sinusoidal animation (only when animate is on) ──
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

  // ── Blend color sources using overlay/opacity model ──
  // Palette is always the base. Other sources overlay on top with their weight as opacity.
  var color = fx.paletteColor * fx.wPalette;

  // Tessellation: overlay on top of palette color
  color = mix(color, tessColor, fx.wTessellation);

  // Webcam: overlay on top of current result
  color = mix(color, webCamColor, fx.wWebcam);

  // ── Shading (always computed, applied proportionally to wShading) ──
  if (fx.wShading > 0.001) {
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
    color = color * mix(1.0, shading, fx.wShading);
  }

  return clamp(color, vec3<f32>(0.0), vec3<f32>(1.0));
}

// ── Colorize a single pixel from its raw layer values ──────────────
fn colorize_pixel(
  iter_val: f32, zx_val: f32, zy_val: f32,
  der_x: f32, der_y: f32,
  uv_neutral: vec2<f32>
) -> vec4<f32> {
  // Sentinel: iter_val < 0 => uncomputed pixel.
  if (iter_val < 0.0) {
    return vec4<f32>(0.0, 0.0, 0.0, 0.0);
  }

  // Budget exhausted: z hasn't escaped.
  if (iter_val > 0.0 && (zx_val * zx_val + zy_val * zy_val) < parameters.mu) {
    let z_sq = zx_val * zx_val + zy_val * zy_val;
    let fake_log = max(log(z_sq + 1.0), 0.001);
    let mu_approx = clamp(1.0 - log(fake_log / log(parameters.mu)) / log(2.0), 0.0, 1.0);
    let nu = iter_val + mu_approx;
    let v = nu;
    let z = vec2<f32>(zx_val, zy_val);
    let der = vec2<f32>(der_x, der_y);
    let dd = cdiv(der, z);
    let angle_der = atan2(dd.y, dd.x);
    var color = palette(v, v, z, angle_der, uv_neutral.x, uv_neutral.y);
    return vec4<f32>(color * 0.4, 1.0);
  }

  // Inside the set: iter_val == 0. Solid black.
  if (iter_val == 0.0) {
    return vec4<f32>(0.0, 0.0, 0.0, 1.0);
  }

  // ── Escaped pixel ──
  let z_sq = zx_val * zx_val + zy_val * zy_val;
  let log_z2 = log(z_sq);
  let mu_val = clamp(1.0 - log(log_z2 / log(parameters.mu)) / log(2.0), 0.0, 1.0);

  var nu = iter_val + mu_val;

  if (nu < 0.0) {
    return vec4<f32>(0.0, 0.0, 0.5, 1.0);
  }

  let nu_smooth = nu;

  // ── Smoothness: continuous blend between raw and smooth iteration ──
  // We need the palette phase to read wSmoothness from the texture.
  // Compute a preliminary phase to sample the smoothness weight, then
  // apply it to select between iter_val and nu.
  let paletteRepeat = max(parameters.palettePeriod, 0.0001);
  let prelimPhase = fract(nu * 2.0 / paletteRepeat + parameters.paletteOffset);
  let row2 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(prelimPhase, 0.625), 0.0);
  let wSmoothness = row2.g;
  nu = mix(iter_val, nu, wSmoothness);

  // ── Zebra: continuous application (darkens even iterations) ──
  let row1 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(prelimPhase, 0.375), 0.0);
  let wZebra = row1.r;
  let isEvenIter = 1.0 - abs(floor(iter_val) % 2.0);

  let z = vec2<f32>(zx_val, zy_val);
  let der = vec2<f32>(der_x, der_y);
  let dd = cdiv(der, z);
  let angle_der = atan2(dd.y, dd.x);

  let v = nu;
  let v_smooth = nu_smooth;
  var color = palette(v, v_smooth, z, angle_der, uv_neutral.x, uv_neutral.y);

  // Apply zebra after palette computation: darken even iterations
  color = color * (1.0 - wZebra * isEvenIter);

  return vec4<f32>(color, 1.0);
}

// ── Debug flag ──
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

  // ── Unified path: min-step-wins compositing ──────────────────────
  // Layer 1 stores the resolution step: 1 = genuine pixel (best),
  // >= 2 = resolve-copied from a grid neighbor (coarser = worse),
  // 0 = no data (sentinel / uncomputed).
  // The pixel with the smallest positive step wins.
  // When not zooming (zf=1, lzf=1), UV math reduces to identity, so the
  // same logic works seamlessly for both zoom and non-zoom rendering.

  // ── Sample live texture ──
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
        uv_neutral
      );
    }
  }
  let liveValid = live_iter >= 0.0 && liveColor.a > 0.0;

  // ── Sample frozen texture ──
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
          uv_neutral
        );
      }
    }
  }
  let frozenValid = frozenColor.a > 0.0;

  // ── Pick the best pixel: smallest positive step wins ──
  // step > 0 means the pixel has data; step = 0 means no data.
  let liveHasData   = liveValid && liveStep > 0.0;
  let frozenHasData = frozenValid && frozenStep > 0.0;

  if (liveHasData && frozenHasData) {
    // Both have data — pick the one with finer resolution (smaller step).
    if (liveStep <= frozenStep) {
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
