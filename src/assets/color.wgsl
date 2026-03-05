struct Uniforms {
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
@group(0) @binding(7) var paletteSampler: sampler; // sampler bilinéaire pour la palette

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
//   uv → xy_neutral → local_rot → local   then tests |local| vs screen bounds.
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
  // Sampling bilinéaire de la palette (texture 1D, hauteur 1px)
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

// ── Colorize a single pixel from its raw layer values ──────────────
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

  // Budget exhausted: iter > 0 but z hasn't escaped (|z|² < mu).
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

  // ── Escaped pixel: recalculate mu and angle_der from stored z and der ──
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

  // ── Zoom reprojection: dual-texture sampling with UV rescaling ───
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
    // ── No zoom active: sample live texture directly at uv_neutral ──
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

  // ── Zooming: try live texture first (rescaled), fall back to frozen ──

  // Live texture UV: the live texture is at liveScale, display is at displayScale.
  let uv_live = (uv_neutral - vec2<f32>(0.5, 0.5)) / lzf + vec2<f32>(0.5, 0.5);

  // Check if the live UV is in bounds.  When lzf < 1 (zoom-in), the UV
  // expands into the rotation margins — use rotation-aware screen test.
  // When lzf >= 1 (zoom-out), the UV shrinks — full texture bounds suffice.
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

  // Live texture has no data for this pixel — fall back to frozen snapshot.
  // The frozen texture is at frozenScale; rescale UV accordingly.
  // Also apply the cumulative pan shift so the frozen texture follows panning.
  // The shift is subtracted (same convention as the reproject shader: "where
  // does the data for this pixel come from in the frozen texture").
  let uv_frozen = (uv_neutral - vec2<f32>(0.5, 0.5)) / zf + vec2<f32>(0.5, 0.5)
                  - vec2<f32>(parameters.frozenShiftU, parameters.frozenShiftV);

  // Reject frozen samples outside valid bounds.  When zf < 1 (zoom-out),
  // the UV expands into the rotation margins — use rotation-aware screen test.
  // When zf >= 1 (zoom-in), the UV shrinks — full texture bounds suffice.
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

  // Neither texture has data — dark placeholder
  return vec4<f32>(0.05, 0.05, 0.05, 1.0);
}

