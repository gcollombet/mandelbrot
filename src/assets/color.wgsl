// Working precision for the bounded shading math (lighting lobes, AO, edge
// shading math). Default f32; the engine swaps this to f16 (and prepends
// `enable f16;`) when the device supports shader-f16, doubling ALU throughput
// on mobile. Only values in a safe [~1e-3, ~1e3] range use hcol — iteration
// counts, distance estimates and palette phase stay f32.
alias hcol = f32;

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
  epsilon: f32,           // interior detection threshold (|der|² < epsilon)
  ambientOcclusionStrength: f32,
  microBumpStrength: f32,
  _pad19: f32,           // reserved (was subsurfaceStrength — effect removed)
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
  debugShading: f32,
  heightPaletteShift: f32,
  orbitTrapStrength: f32,
  phaseColoringStrength: f32,
  textureMappingXVariable: f32,
  textureMappingYVariable: f32,
  textureMappingXScale: f32,
  textureMappingYScale: f32,
  textureMappingMirror: f32,
  centerX: f32,
  centerY: f32,
  scale: f32,
  gradeContrast: f32,   // display-grade S-contrast around mid-grey (1.0 = neutral)
  textureDriftX: f32,
  textureDriftY: f32,
  skyDriftX: f32,
  skyDriftY: f32,
  paletteOffsetAnimation: f32,
  heightPaletteShiftAnimation: f32,
  lightAngleAnimation: f32,
  textureDriftAnimation: f32,
  skyReflectionDriftAnimation: f32,
  phaseColoringAnimation: f32,
  varnishAnimation: f32,
  microBumpAnimation: f32,
  displacementAnimation: f32,
  tessellationAnimation: f32,
  aaSampleIndex: f32,    // current AA sample index (for the per-pixel accumulation gate)
  antialiasLevel: f32,   // max AA samples (for the debug sample-count visualization)
  aaJitterHatX: f32,     // unit direction of the current sample's jitter δc (c-space basis)
  aaJitterHatY: f32,
  aaJitterLogMag: f32,   // ln|δc| in c units (exponent-summed with the payload's S)
  aaAnalytic: f32,       // 1 = analytic AA expansion enabled (auto mode, raw payload bound)
  gradeSaturation: f32,  // display-grade saturation (1.0 = neutral)
  _pad2: f32,
  _pad3: f32,
  _pad4: f32,
};
@group(0) @binding(0) var<uniform> parameters: Uniforms;
@group(0) @binding(1) var tex: texture_2d_array<f32>; // resolved neutral texture (8 r32float layers)
@group(0) @binding(2) var tileTex: texture_2d<f32>;
@group(0) @binding(3) var skyboxTex: texture_2d<f32>;
@group(0) @binding(4) var webcamTex: texture_2d<f32>;
@group(0) @binding(5) var paletteTex: texture_2d<f32>;  // 4096 x 7 rgba16float
@group(0) @binding(6) var texFrozen: texture_2d_array<f32>; // frozen snapshot for zoom reprojection
@group(0) @binding(7) var paletteSampler: sampler; // bilinear sampler for palette
@group(0) @binding(8) var skyboxSampler: sampler;  // bilinear sampler for skybox
@group(0) @binding(9) var aaTargetTex: texture_2d<f32>; // per-neutral-texel AA target sample count (r32float)

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
  wTessellation: f32,
  wShading: f32,
  wSkybox: f32,
  // Row 2
  wWebcam: f32,
  wSmoothness: f32,
  shadingLevel: f32,    // [0, 3]
  specularPower: f32,   // intensity [0, 64]; roughness controls highlight width
  // Row 3
  dielectricSpecular: f32, // neutral dielectric F0 [0, 1]
  metallic: f32,        // [0, 1]
  roughness: f32,       // [0.02, 1]
  anisotropy: f32,      // [0, 1]
  // Row 6
  directionalVolume: f32,    // [0, 1]
  metalReflectance: f32,     // conductor F0 gain [0, 2]
  metalEnvironmentTint: f32, // [0, 1], 0 preserves env hue, 1 is physical tint
  iridescenceColor: vec3<f32>,
  wIridescence: f32,
  wStripeAverage: f32,
  wRotationMean: f32,
  wStripeRelief: f32,
  wDirectionCoherenceRelief: f32,
};

fn palette_row_y(row: f32) -> f32 {
  return (row + 0.5) / 7.0;
}

fn samplePaletteColor(palettePhase: f32) -> vec3<f32> {
  return textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, palette_row_y(0.0)), 0.0).rgb;
}

fn animatedPaletteOffset() -> f32 {
  return fract(parameters.paletteOffset);
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
  let row0 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, palette_row_y(0.0)), 0.0);
  e.paletteColor = row0.rgb;
  e.wPalette = row0.a;

  // Row 1: zebra, tessellation, shading, skybox
  let row1 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, palette_row_y(1.0)), 0.0);
  e.wTessellation = row1.g;
  e.wShading = row1.b;
  e.wSkybox = row1.a;

  // Row 2: webcam, smoothness, shadingLevel [0,3], specularPower [0,64]
  let row2 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, palette_row_y(2.0)), 0.0);
  e.wWebcam = row2.r;
  e.wSmoothness = row2.g;
  e.shadingLevel = row2.b;       // direct: natural range [0, 3]
  e.specularPower = clamp(row2.a, 0.0, 64.0); // intensity only; 0 disables the direct specular lobe

  // Rows 3 (metallic/roughness/anisotropy) and 4 (iridescence) are only read
  // inside the shading branch, so they are sampled lazily there via
  // sampleShadingMaterial() rather than for every pixel.

  // Row 5: stripe color blend, direction coherence color blend, stripe relief, direction coherence relief
  let row5 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, palette_row_y(5.0)), 0.0);
  e.wStripeAverage = clamp(row5.r, 0.0, 1.0);
  e.wRotationMean = clamp(row5.g, 0.0, 1.0);
  e.wStripeRelief = clamp(row5.b, 0.0, 1.0);
  e.wDirectionCoherenceRelief = clamp(row5.a, 0.0, 100.0);

  return e;
}

// Rows 3 & 4 of the palette texture (material + iridescence). Sampled lazily
// from inside the shading branch since no other code path reads these fields.
fn sampleShadingMaterial(palettePhase: f32, e: ptr<function, EffectParams>) {
  // Row 3: dielectric F0, metallic, roughness, anisotropy
  let row3 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, palette_row_y(3.0)), 0.0);
  (*e).dielectricSpecular = clamp(row3.r, 0.0, 1.0);
  (*e).metallic = clamp(row3.g, 0.0, 1.0);
  (*e).roughness = clamp(row3.b, 0.02, 1.0);
  (*e).anisotropy = clamp(row3.a, 0.0, 1.0);

  // Row 4: iridescence R, G, B, strength
  let row4 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, palette_row_y(4.0)), 0.0);
  (*e).iridescenceColor = row4.rgb;
  (*e).wIridescence = clamp(row4.a, 0.0, 1.0);

  // Row 6: artistic macro-volume and conductor controls.
  let row6 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(palettePhase, palette_row_y(6.0)), 0.0);
  (*e).directionalVolume = clamp(row6.r, 0.0, 1.0);
  (*e).metalReflectance = clamp(row6.g, 0.0, 2.0);
  (*e).metalEnvironmentTint = clamp(row6.b, 0.0, 1.0);
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

fn rotate_surface_vector_inverse_sincos(v: vec3<f32>, s: f32, c: f32) -> vec3<f32> {
  let xy = rotate_inverse_sincos(v.xy, s, c);
  return vec3<f32>(xy.x, xy.y, v.z);
}

fn isInsideScreen(uv: vec2<f32>, aspect: f32, neutralExtent: f32, sceneSin: f32, sceneCos: f32) -> bool {
  let xy_neutral = (uv - vec2<f32>(0.5, 0.5)) * 2.0;
  let local_rot  = xy_neutral * neutralExtent;
  let local      = rotate_inverse_sincos(local_rot, sceneSin, sceneCos);
  return abs(local.x) <= aspect && abs(local.y) <= 1.0;
}

fn skybox_reflection_uv(screenUv: vec2<f32>, reflectionDir: vec3<f32>, drift: vec2<f32>) -> vec2<f32> {
  // The environment image is anchored to the viewport. The reflected direction
  // only distorts that fixed image, so translating the fractal does not carry
  // the environment along like an albedo texture.
  let d = normalize(reflectionDir);
  let shifted = screenUv + vec2<f32>(d.x, -d.y) * 0.32 + drift;
  let mirrored = vec2<f32>(
    1.0 - abs(fract(shifted.x * 0.5) * 2.0 - 1.0),
    1.0 - abs(fract(shifted.y * 0.5) * 2.0 - 1.0)
  );
  return vec2<f32>(0.001) + mirrored * 0.998;
}

fn fresnel_schlick(cosTheta: f32, f0: vec3<f32>) -> vec3<f32> {
  // Bounded: cosTheta and f0 both in [0,1].
  let m = clamp(hcol(1.0) - hcol(cosTheta), hcol(0.0), hcol(1.0));
  let m2 = m * m;
  let m5 = m2 * m2 * m;
  let f0h = vec3<hcol>(f0);
  return vec3<f32>(f0h + (vec3<hcol>(1.0) - f0h) * m5);
}

// KEPT f32 ON PURPOSE. a2 = roughness⁴ underflows f16 for roughness < ~0.088
// (roughness is clamped to [0.02,1] at the call site), which zeroes the GGX
// numerator on GPUs without f16 subnormals → sharp specular highlights vanish.
// The dynamic range of this term is f16-hostile; leave the specular core in f32.
fn ggx_distribution(nDotH: f32, roughness: f32) -> f32 {
  let a = roughness * roughness;
  let a2 = a * a;
  let d = nDotH * nDotH * (a2 - 1.0) + 1.0;
  return a2 / max(3.14159265 * d * d, 1e-5);
}

fn ggx_geometry_schlick(nDotV: f32, roughness: f32) -> f32 {
  // Denominator is ≥ k ≥ 0.125, so the guard never binds and there is no
  // f16 underflow; all operands are in [0,1].
  let r = hcol(roughness) + hcol(1.0);
  let k = (r * r) / hcol(8.0);
  let nv = hcol(nDotV);
  return f32(nv / max(nv * (hcol(1.0) - k) + k, hcol(1.0e-4)));
}

fn ggx_geometry_smith(nDotV: f32, nDotL: f32, roughness: f32) -> f32 {
  return ggx_geometry_schlick(nDotV, roughness) * ggx_geometry_schlick(nDotL, roughness);
}

// The derivative angle is a flow direction, not a geometric slope. Keep it in
// the tangent plane so it orients anisotropic highlights without deforming the
// surface normal.
fn anisotropy_tangent_from_dir(angleDir: vec2<f32>, normal: vec3<f32>) -> vec3<f32> {
  let flow = vec3<f32>(-angleDir.y, angleDir.x, 0.0);
  let projected = flow - normal * dot(flow, normal);
  let projectedLen = length(projected);
  return select(vec3<f32>(1.0, 0.0, 0.0), projected / max(projectedLen, 1e-5), projectedLen > 1e-5);
}

fn anisotropic_highlight(normal: vec3<f32>, tangent: vec3<f32>, bitangent: vec3<f32>, halfDir: vec3<f32>, nDotL: f32, nDotV: f32, roughness: f32) -> f32 {
  // Bounded: all operands are unit-vector dot products / [0,1] roughness. The
  // squared-nDotH guard uses 1e-4 (smallest safe normal f16) instead of 1e-5,
  // which would flush to zero on GPUs without f16 subnormals; the difference
  // only affects extreme grazing angles where the lobe already vanishes.
  let nrm = vec3<hcol>(normal);
  let tDotH = dot(vec3<hcol>(tangent), vec3<hcol>(halfDir));
  let bDotH = dot(vec3<hcol>(bitangent), vec3<hcol>(halfDir));
  let ndh = dot(nrm, vec3<hcol>(halfDir));
  let nDotH2 = max(ndh * ndh, hcol(1.0e-4));
  let rough = hcol(roughness);
  let alphaT = max(hcol(0.06), rough * hcol(0.45));
  let alphaB = max(hcol(0.12), rough * hcol(1.65));
  let stretch = (tDotH * tDotH) / (alphaT * alphaT) + (bDotH * bDotH) / (alphaB * alphaB);
  let lobe = exp(-stretch / nDotH2);
  let visibility = sqrt(max(hcol(nDotL) * hcol(nDotV), hcol(0.0)));
  return f32(lobe * visibility);
}

// Display grade for the shaded path: gentle S-contrast around photographic
// mid-grey plus a touch of saturation, in linear light, before the highlight
// roll-off. Restores the gamma-era punch the linear pipeline flattened
// (gamma-space lighting over-darkened shadows and over-saturated products)
// without re-breaking the material response.
fn display_grade(c: vec3<f32>) -> vec3<f32> {
  let contrast = clamp(parameters.gradeContrast, 0.25, 3.0);
  let sat = clamp(parameters.gradeSaturation, 0.0, 3.0);
  let pivot = 0.18;
  var g = pow(max(c, vec3<f32>(0.0)) / pivot, vec3<f32>(contrast)) * pivot;
  g = mix(vec3<f32>(luminance(g)), g, sat);
  return max(g, vec3<f32>(0.0));
}

// Soft highlight compression: identity below the knee, Reinhard shoulder above
// with an asymptote at 1 (C1-continuous at the knee). Replaces the hard clamp
// that flattened colored HDR highlights to white.
fn tonemap_highlights(c: vec3<f32>) -> vec3<f32> {
  let knee = 0.8;
  let over = max(c - vec3<f32>(knee), vec3<f32>(0.0));
  return min(c, vec3<f32>(knee)) + over / (over + vec3<f32>(1.0 - knee)) * (1.0 - knee);
}

fn fresnel_schlick_roughness(cosTheta: f32, f0: vec3<f32>, roughness: f32) -> vec3<f32> {
  let f90 = max(vec3<f32>(1.0 - roughness), f0);
  return f0 + (f90 - f0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

// Thin-film interference tint: relative phase of three representative
// wavelengths (R 610 nm, G 545 nm, B 465 nm) after a round trip through a film
// of optical thickness `cycles` (in green-wavelength cycles at normal
// incidence) seen at cosTheta. n≈1.45 bends the in-film path; each channel's
// phase scales as 1/λ, so the spectrum slides as the view/normal tilts.
fn thin_film_tint(cosTheta: f32, cycles: f32) -> vec3<f32> {
  let sin2 = 1.0 - cosTheta * cosTheta;
  let cosRefract = sqrt(max(1.0 - sin2 / (1.45 * 1.45), 0.0));
  let phi = cycles * cosRefract * TWO_PI * vec3<f32>(545.0 / 610.0, 1.0, 545.0 / 465.0);
  return 0.5 + 0.5 * cos(phi);
}

fn curvature_ambient_occlusion(curvature: f32, relief: f32, strength: f32) -> f32 {
  let concavity = max(curvature * relief, 0.0);
  let cavity = smoothstep(0.025, 1.35, concavity);
  let amount = 1.0 - exp(-max(strength, 0.0));
  return clamp(1.0 - cavity * amount * 0.72, 0.28, 1.0);
}

fn specular_occlusion(nDotV: f32, ao: f32, roughness: f32) -> f32 {
  return clamp(pow(max(nDotV + ao, 0.0), exp2(-16.0 * roughness - 1.0)) - 1.0 + ao, 0.0, 1.0);
}

fn luminance(color: vec3<f32>) -> f32 {
  return dot(color, vec3<f32>(0.2126, 0.7152, 0.0722));
}

fn sample_skybox(screenUv: vec2<f32>, reflectionDir: vec3<f32>, drift: vec2<f32>, lod: f32) -> vec3<f32> {
  // The skybox texture is sRGB-encoded rgba8unorm; lighting runs in linear.
  return srgb_to_linear(textureSampleLevel(skyboxTex, skyboxSampler, skybox_reflection_uv(screenUv, reflectionDir, drift), lod).rgb);
}

fn rough_skybox_reflection(screenUv: vec2<f32>, reflectionDir: vec3<f32>, roughness: f32, drift: vec2<f32>) -> vec3<f32> {
  // Ordinary mips provide a stable decorative blur. Avoid the last flat levels,
  // which turn arbitrary reflection cards into a uniform milky veil.
  let maxLod = max(f32(textureNumLevels(skyboxTex)) - 4.0, 0.0);
  return sample_skybox(screenUv, reflectionDir, drift, roughness * maxLod);
}

fn tile_tessellation(tex_: texture_2d<f32>, v: f32, dist: f32, repeat: f32) -> vec4<f32> {
  let tileUV = vec2<f32>(fract(v * repeat), fract(dist * repeat));
  let tileIndex = vec2<i32>(i32(floor(v * repeat)), i32(floor(dist * repeat)));

  let useMirror = parameters.textureMappingMirror > 0.5;
  let mirrorX = useMirror && (abs(tileIndex.x) % 2 == 1);
  let mirrorY = useMirror && (abs(tileIndex.y) % 2 == 1);
  let uv = vec2<f32>(
    select(tileUV.x, 1.0 - tileUV.x, mirrorX),
    select(tileUV.y, 1.0 - tileUV.y, mirrorY)
  );
  let texSize = vec2<i32>(textureDimensions(tex_, 0));
  let coord = vec2<i32>(
    i32(clamp(uv.x * f32(texSize.x), 0.0, f32(texSize.x - 1))),
    i32(clamp((1.0 - uv.y) * f32(texSize.y), 0.0, f32(texSize.y - 1)))
  );
  return textureLoad(tex_, coord, 0);
}

fn texture_mapping_value(variableId: f32, iterRaw: f32, v_smooth: f32, z: vec2<f32>, distanceHeightStored: f32, angle_der: f32, dx: f32, dy: f32, tess_depth: f32, disp: f32) -> f32 {
  let id = i32(variableId + 0.5);
  let z_len = max(length(z), 1e-12);
  if (id == 0) {
    return tess_depth * 2.0 * disp + dx;
  }
  if (id == 1) {
    return tess_depth * 2.0 * disp + dy;
  }
  if (id == 2) {
    let log_mu = log(max(parameters.mu, 1.0));
    let u = 2.0 * log(z_len) / max(log_mu, 1e-6);
    return u - iterRaw;
  }
  if (id == 3) {
    return sin(angle_der);
  }
  if (id == 4) {
    return dx;
  }
  if (id == 5) {
    return dy;
  }
  if (id == 7) {
    return v_smooth;
  }
  if (id == 8) {
    return distance_height_from_values(iterRaw, z.x, z.y, distanceHeightStored);
  }
  return tess_depth * 2.0 * disp + dx;
}

fn visible_tile_rgb(tile: vec4<f32>) -> vec3<f32> {
  return tile.rgb * tile.a;
}

fn texture_bump_gradient(
  tex_: texture_2d<f32>,
  v: f32,
  dist: f32,
  repeat: f32,
  mappingDx: vec2<f32>,
  mappingDy: vec2<f32>,
  strength: f32
) -> vec2<f32> {
  let safeRepeat = max(repeat, 0.1);
  let texSize = max(vec2<f32>(textureDimensions(tex_, 0)), vec2<f32>(1.0));
  let stepSize = vec2<f32>(1.0) / (safeRepeat * texSize);
  let lpx = luminance(visible_tile_rgb(tile_tessellation(tex_, v + stepSize.x, dist, repeat)));
  let lnx = luminance(visible_tile_rgb(tile_tessellation(tex_, v - stepSize.x, dist, repeat)));
  let lpy = luminance(visible_tile_rgb(tile_tessellation(tex_, v, dist + stepSize.y, repeat)));
  let lny = luminance(visible_tile_rgb(tile_tessellation(tex_, v, dist - stepSize.y, repeat)));
  let textureGradient = vec2<f32>(lpx - lnx, lpy - lny);
  let screenGradient = vec2<f32>(
    dot(textureGradient, mappingDx),
    dot(textureGradient, mappingDy)
  );
  return screenGradient * clamp(strength, 0.0, 2.0) * 0.85;
}

fn surface_normal_from_gradient(gradient: vec2<f32>) -> vec3<f32> {
  // Kept in f32: direction-coherence relief may legitimately create slopes
  // above the bounded hcol range before normalization.
  return normalize(vec3<f32>(-gradient.x, -gradient.y, 1.0));
}

fn local_height_shadow(grad: vec2<f32>, lightDir: vec3<f32>, tangent: vec3<f32>, bitangent: vec3<f32>, relief: f32, strength: f32) -> f32 {
  let lightPlane = vec2<f32>(dot(lightDir, tangent), dot(lightDir, bitangent));
  let lightPlaneLen = length(lightPlane);
  if (lightPlaneLen < 1e-4 || strength <= 0.0 || relief <= 0.0) {
    return 1.0;
  }
  let lightPlaneDir = lightPlane / lightPlaneLen;
  let uphillSlope = max(dot(grad, lightPlaneDir), 0.0) * 0.34 * relief;
  let lightSlope = max(lightDir.z / lightPlaneLen, 0.0);
  let blocker = smoothstep(lightSlope * 0.35, lightSlope + 1.25, uphillSlope);
  let amount = 1.0 - exp(-0.35 * max(strength, 0.0));
  return mix(1.0, 1.0 - blocker * 0.78, amount);
}

struct PixelState {
  iter: f32,
  zx: f32,
  zy: f32,
};

fn load_pixel_state(sourceTex: texture_2d_array<f32>, coord: vec2<i32>) -> PixelState {
  var state: PixelState;
  state.iter = textureLoad(sourceTex, coord, 0, 0).r;
  state.zx = textureLoad(sourceTex, coord, 2, 0).r;
  state.zy = textureLoad(sourceTex, coord, 3, 0).r;
  return state;
}

fn distance_height_from_values(iterVal: f32, zx: f32, zy: f32, storedHeight: f32) -> f32 {
  if (escape_nu(iterVal, zx, zy) < 0.0) {
    return -1e6;
  }

  return clamp(storedHeight, -64.0, 64.0);
}

fn distance_height_scale_offset(zoomFactor: f32) -> f32 {
  return -log(max(zoomFactor, 1e-30));
}

fn distance_height_gradient_scale(zoomFactor: f32) -> f32 {
  return 1.0 / max(zoomFactor, 1e-30);
}

fn sample_distance_height_at_coord(sourceTex: texture_2d_array<f32>, coord: vec2<i32>, texSize: vec2<i32>, heightOffset: f32) -> f32 {
  if (coord.x < 0 || coord.x >= texSize.x || coord.y < 0 || coord.y >= texSize.y) {
    return -1e6;
  }
  let state = load_pixel_state(sourceTex, coord);
  let storedHeight = textureLoad(sourceTex, coord, 4, 0).r + heightOffset;
  return distance_height_from_values(state.iter, state.zx, state.zy, storedHeight);
}

fn distance_height_gradient_at_coord(sourceTex: texture_2d_array<f32>, coord: vec2<i32>, texSize: vec2<i32>, centerHeight: f32, heightOffset: f32, gradientScale: f32) -> vec2<f32> {
  let xr = sample_distance_height_at_coord(sourceTex, coord + vec2<i32>(1, 0), texSize, heightOffset);
  let xl = sample_distance_height_at_coord(sourceTex, coord - vec2<i32>(1, 0), texSize, heightOffset);
  let yu = sample_distance_height_at_coord(sourceTex, coord + vec2<i32>(0, 1), texSize, heightOffset);
  let yd = sample_distance_height_at_coord(sourceTex, coord - vec2<i32>(0, 1), texSize, heightOffset);
  let rightHeight = select(centerHeight, xr, xr > -1e5);
  let leftHeight = select(centerHeight, xl, xl > -1e5);
  let upHeight = select(centerHeight, yu, yu > -1e5);
  let downHeight = select(centerHeight, yd, yd > -1e5);
  return vec2<f32>(rightHeight - leftHeight, upHeight - downHeight) * 12.0 * gradientScale;
}

fn smooth_escape_fraction(z_sq: f32) -> f32 {
  let log_z2 = log(max(z_sq, 1e-12));
  let logMu = max(parameters.logMu, 1e-6);
  return 1.0 - log(max(log_z2 / logMu, 1e-12)) / log(2.0);
}

fn palette(sourceTex: texture_2d_array<f32>, sourceCoord: vec2<i32>, sourceTexSize: vec2<i32>, iterRaw: f32, v: f32, v_smooth: f32, z: vec2<f32>, distanceHeightStored: f32, distanceHeightOffset: f32, distanceHeightGradientScale: f32, angle_der: f32, stripeAverage: f32, directionCoherence: f32, dx: f32, dy: f32, uv_screen: vec2<f32>, uv_tex: vec2<f32>, magnified: bool) -> vec3<f32> {
  let paletteRepeat = max(parameters.palettePeriod, 0.0001);
  let deep = v * 2.0;
  let heightPhaseShift = clamp(distanceHeightStored, -16.0, 16.0) * (clamp(parameters.heightPaletteShift, 0.0, 100.0) / 16.0);
  let phaseColoringShift = (1.0 - abs(fract(angle_der / (2.0 * 3.141592653589793)) * 2.0 - 1.0)) * parameters.phaseColoringStrength;
  let palettePhase = palettePhaseFromRaw(deep / paletteRepeat + animatedPaletteOffset() + heightPhaseShift + phaseColoringShift);

  // ── Sample all effect channels from the palette texture ──
  var fx = sampleEffects(palettePhase);

  var effTess = fx.wTessellation;
  let effWebcam = fx.wWebcam;
  let effShading = fx.wShading;

    // ── Blend color sources using overlay/opacity model ──
    // Palette is always the base. Other sources overlay on top with their weight as opacity.
    var color = fx.paletteColor * fx.wPalette;

  // Screen + Depth follows the same scalar height as the visible relief.
  // Using smooth iteration here made the texture slide along iteration bands
  // while the normal followed distance height, visually detaching both fields.
  let tess_depth = clamp(
    distance_height_from_values(iterRaw, z.x, z.y, distanceHeightStored),
    -16.0,
    16.0
  );
  let disp = parameters.displacementAmount;
  var tess_u = 0.0;
  var tess_v = 0.0;

  tess_u = texture_mapping_value(parameters.textureMappingXVariable, iterRaw, v_smooth, z, distanceHeightStored, angle_der, dx, dy, tess_depth, disp) * parameters.textureMappingXScale;
  tess_v = texture_mapping_value(parameters.textureMappingYVariable, iterRaw, v_smooth, z, distanceHeightStored, angle_der, dx, dy, tess_depth, disp) * parameters.textureMappingYScale;

  let tile_drift = vec2<f32>(parameters.textureDriftX, parameters.textureDriftY);
  let tessCoord = vec2<f32>(tess_u, tess_v) + tile_drift;



  // Tessellation: overlay on top of palette color
  if (effTess > 0.001) {
    let tessSample = tile_tessellation(tileTex, tess_u + tile_drift.x, tess_v + tile_drift.y, parameters.tessellationLevel);
    color = mix(color, tessSample.rgb, clamp(effTess * tessSample.a, 0.0, 1.0));
  }

  // Webcam: overlay on top of current result
  if (effWebcam > 0.001) {
    let webCamColor = tile_tessellation(
      webcamTex,
      tess_u + tile_drift.x,
      tess_v + tile_drift.y,
      parameters.tessellationLevel
    );
    color = mix(color, webCamColor.rgb, effWebcam);
  }

  if (fx.wStripeAverage > 0.001) {
    color = mix(color, samplePaletteColor(fract(stripeAverage)), fx.wStripeAverage);
  }
  if (fx.wRotationMean > 0.001) {
    color = mix(color, samplePaletteColor(fract(directionCoherence)), fx.wRotationMean);
  }

  let orbitTrapStrength = clamp(parameters.orbitTrapStrength, 0.0, 100.0) / 100.0;
  if (orbitTrapStrength > 0.001) {
    let escapeRadius = sqrt(max(parameters.mu, 1e-6));
    let trapZ = z / escapeRadius;
    let axisTrap = min(abs(trapZ.x), abs(trapZ.y));
    let diagonalTrap = min(abs(trapZ.x - trapZ.y), abs(trapZ.x + trapZ.y)) * 0.70710678;
    let circleTrap = abs(length(trapZ) - 1.0);
    let trapDistance = min(axisTrap, min(diagonalTrap * 0.72, circleTrap * 0.85));
    let trapWidth = mix(0.012, 0.16, orbitTrapStrength);
    let trapMask = exp(-(trapDistance * trapDistance) / max(trapWidth * trapWidth, 1e-5));
    let trapColor = samplePaletteColor(fract(palettePhase + 0.18));
    color = mix(color, mix(color, trapColor, 0.72) + trapMask * 0.12, trapMask * orbitTrapStrength);
  }

  // ── Shading (always computed, applied proportionally to wShading) ──
  if (effShading > 0.001) {
    // Material + iridescence rows are only needed here: sample them lazily.
    sampleShadingMaterial(palettePhase, &fx);
    // PBR runs in linear light: gamma-space products distort hues and harden
    // falloffs. Only the shaded result converts back to sRGB (with a highlight
    // roll-off) at the end of the block — the unshaded palette compositing
    // keeps its historical sRGB look.
    let colorLin = srgb_to_linear(color);
    let iridLin = srgb_to_linear(fx.iridescenceColor);
    let angleDir = vec2<f32>(cos(angle_der), sin(angle_der));
    let reliefDepth = parameters.reliefDepth * effShading;
    let relief = clamp(reliefDepth, 0.0, 2.0);
    let localShadowControl = clamp(parameters.localShadowStrength, 0.0, 10.0);
    let stripeReliefStrength = fx.wStripeRelief * effShading;
    let directionCoherenceStrength = fx.wDirectionCoherenceRelief * effShading;
    let bumpStrength = parameters.microBumpStrength * effTess;
    let mappingXId = i32(parameters.textureMappingXVariable + 0.5);
    let mappingYId = i32(parameters.textureMappingYVariable + 0.5);
    let needsDepthGradient = bumpStrength > 0.001 &&
      (mappingXId == 0 || mappingXId == 1 || mappingYId == 0 || mappingYId == 1);
    let needsStripeGradient = stripeReliefStrength > 0.001;
    let needsDirectionCoherenceGradient = directionCoherenceStrength > 0.001;
    let needsFractalGradient = relief > 0.001;
    var distanceHeight = 0.0;
    var grad = vec2<f32>(0.0);
    var stripeGrad = vec2<f32>(0.0);
    var directionCoherenceGrad = vec2<f32>(0.0);
    var depthGrad = vec2<f32>(0.0);
    var heightCurvature = 0.0;
    var slope = 0.0;
    if (needsFractalGradient) {
      distanceHeight = distance_height_from_values(iterRaw, z.x, z.y, distanceHeightStored);
    }
    // The three fields (fractal height, stripe phase, direction coherence)
    // share the same 4 neighbour texels. Fetch each neighbour once and derive
    // whichever gradients are needed together, instead of reloading layers
    // 0/2/3 and recomputing escape_nu three times per neighbour.
    if (needsFractalGradient || needsStripeGradient || needsDirectionCoherenceGradient || needsDepthGradient) {
      if (magnified) {
        field_gradients_bilinear(
          sourceTex, uv_tex, sourceTexSize,
          distanceHeight, stripeAverage, directionCoherence, tess_depth,
          distanceHeightOffset, distanceHeightGradientScale,
          needsFractalGradient, needsStripeGradient, needsDirectionCoherenceGradient, needsDepthGradient,
          &grad, &stripeGrad, &directionCoherenceGrad, &depthGrad
        );
      } else {
        field_gradients_at_coord(
          sourceTex, sourceCoord, sourceTexSize,
          distanceHeight, stripeAverage, directionCoherence, tess_depth,
          distanceHeightOffset, distanceHeightGradientScale,
          needsFractalGradient, needsStripeGradient, needsDirectionCoherenceGradient, needsDepthGradient,
          &grad, &stripeGrad, &directionCoherenceGrad, &depthGrad, &heightCurvature
        );
      }
      if (needsFractalGradient) {
        grad = clamp(grad, vec2<f32>(-6.0), vec2<f32>(6.0));
        slope = length(grad);
      }
    }
    var textureGradient = vec2<f32>(0.0);
    var textureMappingDx = vec2<f32>(1.0, 0.0);
    var textureMappingDy = vec2<f32>(0.0, 1.0);
    if (needsDepthGradient) {
      let boundedDepthGrad = clamp(depthGrad, vec2<f32>(-8.0), vec2<f32>(8.0));
      let depthWarpGrad = boundedDepthGrad * (4.0 * disp);
      var uGrad = vec2<f32>(1.0, 0.0);
      var vGrad = vec2<f32>(0.0, 1.0);
      if (mappingXId == 0) {
        uGrad = (vec2<f32>(1.0, 0.0) + depthWarpGrad) * parameters.textureMappingXScale;
      } else if (mappingXId == 1) {
        uGrad = (vec2<f32>(0.0, 1.0) + depthWarpGrad) * parameters.textureMappingXScale;
      }
      if (mappingYId == 0) {
        vGrad = (vec2<f32>(1.0, 0.0) + depthWarpGrad) * parameters.textureMappingYScale;
      } else if (mappingYId == 1) {
        vGrad = (vec2<f32>(0.0, 1.0) + depthWarpGrad) * parameters.textureMappingYScale;
      }
      textureMappingDx = vec2<f32>(uGrad.x, vGrad.x);
      textureMappingDy = vec2<f32>(uGrad.y, vGrad.y);
    }
    if (bumpStrength > 0.001) {
      textureGradient = texture_bump_gradient(
        tileTex,
        tessCoord.x,
        tessCoord.y,
        parameters.tessellationLevel,
        textureMappingDx,
        textureMappingDy,
        bumpStrength
      );
    }
    // One scalar surface drives one normal. The stripe phase is circular, so use
    // Hstripe = 0.5 - 0.5*cos(2πp); its derivative is π*sin(2πp), continuous at
    // the phase wrap. Coherence and texture luminance are already scalar fields.
    let stripeProfileDerivative = 3.141592653589793 * sin(TWO_PI * stripeAverage);
    let heightGradient = grad * (0.34 * relief);
    let stripeHeightGradient = stripeGrad * stripeProfileDerivative * (0.75 * clamp(stripeReliefStrength, 0.0, 1.0));
    let coherenceHeightGradient = directionCoherenceGrad * (0.75 * clamp(directionCoherenceStrength, 0.0, 100.0));
    // At 1 this term reproduces the old angle-derived macro slope (|g| = 2),
    // but it now composes with the measured scalar fields instead of replacing
    // their normal.
    let directionalVolumeGradient = -angleDir * (2.0 * fx.directionalVolume * clamp(relief, 0.0, 1.0));
    let surfaceGradient = heightGradient + stripeHeightGradient + coherenceHeightGradient + textureGradient + directionalVolumeGradient;
    let surfaceNormalLocal = surface_normal_from_gradient(surfaceGradient);
    let geometricTangentLocal = normalize(vec3<f32>(1.0, 0.0, surfaceGradient.x));
    let geometricBitangentLocal = normalize(cross(surfaceNormalLocal, geometricTangentLocal));
    let anisotropyTangentLocal = anisotropy_tangent_from_dir(angleDir, surfaceNormalLocal);
    let sceneSin = parameters.sceneSin;
    let sceneCos = parameters.sceneCos;
    // uv_neutral = R(scene) * uv_screen, therefore vectors from the neutral
    // fractal surface must use R^-1 to enter screen/world space.
    let normal = normalize(rotate_surface_vector_inverse_sincos(surfaceNormalLocal, sceneSin, sceneCos));
    let geometricTangentWorld = normalize(rotate_surface_vector_inverse_sincos(geometricTangentLocal, sceneSin, sceneCos));
    let geometricBitangentWorld = normalize(rotate_surface_vector_inverse_sincos(geometricBitangentLocal, sceneSin, sceneCos));
    let anisotropyTangent = normalize(rotate_surface_vector_inverse_sincos(anisotropyTangentLocal, sceneSin, sceneCos));
    let lightDir = vec3<f32>(parameters.lightDirX, parameters.lightDirY, parameters.lightDirZ);
    // The magnified bilinear path has no extra curvature fetch: AO fades out
    // during reprojection instead of adding four more texture reads per pixel.
    let ao = curvature_ambient_occlusion(heightCurvature, relief, parameters.ambientOcclusionStrength);
    let viewDir = vec3<f32>(0.0, 0.0, 1.0);
    let halfDir = normalize(lightDir + viewDir);
    let anisotropyBitangent = normalize(cross(normal, anisotropyTangent));
    let nDotL = max(dot(normal, lightDir), 0.0);
    let nDotV = max(dot(normal, viewDir), 0.0);
    let nDotH = max(dot(normal, halfDir), 0.0);
    let vDotH = max(dot(viewDir, halfDir), 0.0);
    let metallic = clamp(fx.metallic, 0.0, 1.0);
    let roughness = clamp(fx.roughness, 0.02, 1.0);
    let anisotropy = clamp(fx.anisotropy, 0.0, 1.0);
    // Gamma-era gain retuned down: in linear light the GGX peak already reads
    // brighter once encoded to sRGB. Floor is 0 so Spéculaire = 0 truly
    // disables the lobe.
    let specularGain = clamp(fx.specularPower / 19.0, 0.0, 3.4);
    // Dielectrics keep an achromatic Fresnel reflection; only conductors tint
    // their reflection with the base color.
    // Tint=0 is the legacy preset path: the historical shader used the sRGB
    // palette value directly as conductor F0. Tint=1 selects linear-light F0.
    let legacyMetalF0 = clamp(color * fx.metalReflectance, vec3<f32>(0.0), vec3<f32>(1.0));
    let physicalMetalF0 = clamp(colorLin * fx.metalReflectance, vec3<f32>(0.0), vec3<f32>(1.0));
    let metalResponse = clamp(fx.metalEnvironmentTint, 0.0, 1.0);
    let metalF0 = mix(legacyMetalF0, physicalMetalF0, metalResponse);
    let f0 = mix(vec3<f32>(fx.dielectricSpecular), metalF0, metallic);
    // Cheap multiple-scattering compensation: single-scatter GGX otherwise
    // loses too much energy as a conductor becomes rough.
    let roughMetalEnergy = vec3<f32>(1.0) + (vec3<f32>(1.0) - f0) * (metallic * roughness * 0.75 * metalResponse);
    let fresnelSpec = fresnel_schlick(vDotH, f0);
    let distribution = ggx_distribution(nDotH, roughness);
    let geometry = ggx_geometry_smith(nDotV, nDotL, roughness);
    let specularTerm = (distribution * geometry) / max(4.0 * nDotV * nDotL, 1e-5);
    let anisotropicTerm = anisotropic_highlight(normal, anisotropyTangent, anisotropyBitangent, halfDir, nDotL, nDotV, roughness);
    let specularLobe = mix(specularTerm, anisotropicTerm, anisotropy);
    let directSpecular = fresnelSpec * specularLobe * specularGain * nDotL * roughMetalEnergy;
    let diffuseColor = colorLin * (1.0 - metallic) * (1.0 - 0.35 * luminance(fresnelSpec));
    let localShadow = local_height_shadow(grad, lightDir, geometricTangentWorld, geometricBitangentWorld, relief, localShadowControl);
    let shadowedNDotL = nDotL * localShadow;
    let litSide = smoothstep(0.02, 0.55, shadowedNDotL);
    let reflectionSide = mix(0.08, 1.0, litSide);
    let ambientDiffuse = diffuseColor * 0.14 * ao;
    let directDiffuse = diffuseColor * 0.86 * shadowedNDotL;
    let brightness = max(fx.shadingLevel, 0.0);
    var materialColor = ambientDiffuse + directDiffuse + directSpecular * localShadow;
    let reliefAccent = clamp((1.0 - exp(-0.35 * localShadowControl)) * effShading * 2.0, 0.0, 2.0);
    let ridge = smoothstep(0.10, 1.55, slope * relief) * litSide * reliefAccent;
    materialColor += mix(colorLin, vec3<f32>(1.0), 0.38) * ridge * 0.10 * (1.0 - metallic * 0.45);
    let varnish = clamp(parameters.varnishStrength, 0.0, 10.0) * 0.1;
    let reflectDir = reflect(-viewDir, normal);
    // Clear coat is a true top layer: it is applied at the very end of this
    // block, once the base material (iridescence, SSS, wear, env… included)
    // is fully assembled.

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
      let pearlLighting = 0.18 * ao + 0.82 * shadowedNDotL;
      let coatWeight = fx.wIridescence * pearlAngle * mix(0.45, 1.45, orientationShift) * mix(0.60, 1.25, surfaceShift) * pearlLighting * (1.0 - metallic * 0.35);
      // Thin-film interference: optical thickness varies across the surface,
      // the view/normal tilt slides the spectrum (soap-bubble hue drift).
      // iridescenceColor acts as the filter the interference plays under.
      let filmCycles = 1.3 + 2.2 * orientationShift + 1.1 * surfaceShift;
      let filmColor = iridLin * (0.30 + 1.40 * thin_film_tint(nDotV, filmCycles));
      let pearlTint = 0.18 + 0.74 * orientationShift + 0.18 * surfaceShift;
      let pearlColor = mix(colorLin, filmColor, pearlTint) * (0.78 + 0.36 * max(luminance(colorLin), 0.25));
      let pearlSheen = pow(nDotH, mix(2.5, 7.5, 1.0 - roughness)) * fx.wIridescence * pearlLighting * mix(0.45, 1.35, orientationShift);
      materialColor = mix(materialColor, pearlColor, clamp(coatWeight, 0.0, 0.92));
      // Sheen interferes at the half-vector angle (specular path through the film).
      materialColor += iridLin * thin_film_tint(vDotH, filmCycles) * pearlSheen * (0.56 + 0.92 * (1.0 - roughness)) * (1.0 - metallic * 0.25);
    }

    var envColor = vec3<f32>(0.0);
    if (fx.wSkybox > 0.001) {
      let skyboxColor = rough_skybox_reflection(
        uv_screen,
        reflectDir,
        roughness,
        vec2<f32>(parameters.skyDriftX, parameters.skyDriftY)
      );
      let environmentFresnel = fresnel_schlick_roughness(nDotV, f0, roughness);
      let neutralEnvironmentFresnel = vec3<f32>(luminance(environmentFresnel));
      let environmentTint = clamp(metalResponse * metallic, 0.0, 1.0);
      let reflectionStrength = fx.wSkybox * mix(neutralEnvironmentFresnel, environmentFresnel, environmentTint);
      let envVisibility = specular_occlusion(nDotV, ao, roughness);
      // Fresnel already carries the dielectric/metal energy difference. Do not
      // suppress polished stone a second time with a dielectric-only factor.
      envColor = skyboxColor * reflectionStrength * roughMetalEnergy * mix(1.0, 1.10, metallic) * envVisibility;
    }

    // Rim is a stylised Fresnel: same rule as the env term — matte kills it.
    let rim = pow(clamp(1.0 - nDotV, 0.0, 1.0), mix(3.5, 1.8, metallic)) * effShading * reflectionSide * mix(1.0, 0.25, roughness);
    let rimBaseColor = mix(colorLin, vec3<f32>(1.0), 0.45);
    let rimPearlColor = mix(rimBaseColor, iridLin, fx.wIridescence * 0.65);
    let rimColor = rimPearlColor * rim * (0.04 + 0.12 * fx.wSkybox + 0.07 * fx.wIridescence);

    var pbrColor = (materialColor + envColor + rimColor) * (0.55 + brightness * 0.45);
    if (varnish > 0.001) {
      // Clear coat: an achromatic dielectric film over whatever material lies
      // underneath. It never tints the base — it deepens it (wet look),
      // attenuates it by the coat Fresnel (energy conservation), and adds its
      // own untinted highlight + glossy environment mirror on top. No metallic
      // dependency: the coat is the same film regardless of the base.
      // The coat's own smoothness is independent of the base roughness: a
      // rough material under varnish still gets a glossy film on top.
      let coatFresnel = fresnel_schlick(nDotV, vec3<f32>(0.025)).x;
      let coatPower = mix(200.0, 320.0, varnish);
      let coatSpec = pow(max(nDotH, 0.0), coatPower) * (0.20 + 0.80 * shadowedNDotL) * (0.30 + 0.85 * varnish);
      var coatEnvironment = vec3<f32>(0.0);
      if (fx.wSkybox > 0.001) {
        let coatSky = rough_skybox_reflection(
          uv_screen,
          reflectDir,
          0.05,
          vec2<f32>(parameters.skyDriftX, parameters.skyDriftY)
        );
        coatEnvironment = coatSky * fresnel_schlick_roughness(nDotV, vec3<f32>(0.025), 0.05) * fx.wSkybox * specular_occlusion(nDotV, ao, 0.05);
      }
      // Wet look: internal reflections darken and saturate, hue untouched.
      pbrColor *= mix(vec3<f32>(1.0), clamp(pbrColor, vec3<f32>(0.0), vec3<f32>(1.0)), varnish * 0.30);
      pbrColor = pbrColor * (1.0 - coatFresnel * varnish) + (coatEnvironment + vec3<f32>(coatSpec * coatFresnel)) * varnish;
    }
    color = mix(color, linear_to_sRGB(tonemap_highlights(display_grade(pbrColor))), effShading);
  }

  return clamp(color, vec3<f32>(0.0), vec3<f32>(1.0));
}

fn cmul_c(a: vec2<f32>, b: vec2<f32>) -> vec2<f32> {
  return vec2<f32>(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
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
  let logMu = max(parameters.logMu, 1e-6);
  let mu_val = clamp(1.0 - log(max(log_z2 / logMu, 1e-12)) / log(2.0), 0.0, 1.0);
  return iter_val + mu_val;
}



fn decode_stripe_phase(refWithStripe: f32) -> f32 {
  return fract(max(refWithStripe, 0.0));
}

fn stripe_phase_delta(a: f32, b: f32) -> f32 {
  return fract(a - b + 0.5) - 0.5;
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

struct PixelExtras {
  der_x: f32,
  der_y: f32,
  refWithStripe: f32,
  avgDirection: f32,
};

struct PixelSample {
  iter: f32,
  step: f32,
  zx: f32,
  zy: f32,
};

fn load_pixel_sample(sourceTex: texture_2d_array<f32>, coord: vec2<i32>) -> PixelSample {
  var pixelSample: PixelSample;
  pixelSample.iter = textureLoad(sourceTex, coord, 0, 0).r;
  pixelSample.step = textureLoad(sourceTex, coord, 1, 0).r;
  if (pixelSample.iter > 0.0) {
    pixelSample.zx = textureLoad(sourceTex, coord, 2, 0).r;
    pixelSample.zy = textureLoad(sourceTex, coord, 3, 0).r;
  } else {
    pixelSample.zx = 0.0;
    pixelSample.zy = 0.0;
  }
  return pixelSample;
}

fn load_pixel_extras(sourceTex: texture_2d_array<f32>, coord: vec2<i32>) -> PixelExtras {
  var extras: PixelExtras;
  extras.der_x = textureLoad(sourceTex, coord, 4, 0).r;
  extras.der_y = textureLoad(sourceTex, coord, 5, 0).r;
  extras.refWithStripe = textureLoad(sourceTex, coord, 6, 0).r;
  extras.avgDirection = textureLoad(sourceTex, coord, 7, 0).r;
  return extras;
}

// ── Bilinear (magnified) variants of the gradient functions ─────────
// When the source texture is magnified on screen, the per-texel finite
// differences above produce normals that are constant inside each texel
// (faceted relief).  These variants compute the analytic gradient of the
// bilinearly-interpolated field instead: continuous inside each cell.
// The 1-texel-span cell differences are scaled ×2 to match the magnitude
// of the 2-texel-span central differences used by the nearest variants.

struct BilinearCell {
  base: vec2<i32>,
  f: vec2<f32>,
};

fn bilinear_cell(uv: vec2<f32>, texSize: vec2<i32>) -> BilinearCell {
  let texSizeF = vec2<f32>(f32(texSize.x), f32(texSize.y));
  let p = vec2<f32>(uv.x * texSizeF.x, (1.0 - uv.y) * texSizeF.y) - vec2<f32>(0.5);
  let baseF = floor(p);
  var cell: BilinearCell;
  cell.base = vec2<i32>(i32(baseF.x), i32(baseF.y));
  cell.f = p - baseF;
  return cell;
}

// ── Shared neighbour fetch ──────────────────────────────────────────
// The fractal-height, stripe-phase and direction-coherence fields all live
// in the same source texel (layers 4 / 6 / 7) and share the same validity
// test (in-bounds + escaped). Fetching a neighbour once and decoding only the
// requested channels avoids reloading layers 0/2/3 and recomputing escape_nu
// separately for each field.
struct NeighborFields {
  valid: bool,       // in-bounds AND escaped → usable; otherwise fall back to center
  height: f32,
  stripe: f32,
  coherence: f32,
  depth: f32,        // same distance-height field used by Screen + Depth
};

fn sample_neighbor_fields(
  sourceTex: texture_2d_array<f32>,
  coord: vec2<i32>,
  texSize: vec2<i32>,
  heightOffset: f32,
  needHeight: bool,
  needStripe: bool,
  needCoh: bool
) -> NeighborFields {
  var nf: NeighborFields;
  nf.valid = false;
  nf.height = 0.0;
  nf.stripe = 0.0;
  nf.coherence = 0.0;
  nf.depth = 0.0;
  if (coord.x < 0 || coord.x >= texSize.x || coord.y < 0 || coord.y >= texSize.y) {
    return nf;
  }
  let state = load_pixel_state(sourceTex, coord);
  let nu = escape_nu(state.iter, state.zx, state.zy);
  if (nu < 0.0) {
    return nf;
  }
  nf.valid = true;
  if (needHeight) {
    let storedHeight = textureLoad(sourceTex, coord, 4, 0).r + heightOffset;
    nf.height = clamp(storedHeight, -64.0, 64.0);
    nf.depth = nf.height;
  }
  if (needStripe) {
    nf.stripe = decode_stripe_phase(textureLoad(sourceTex, coord, 6, 0).r);
  }
  if (needCoh) {
    nf.coherence = decode_direction_coherence(textureLoad(sourceTex, coord, 7, 0).r);
  }
  return nf;
}

// Central-difference gradients of any subset of the three fields, sharing the
// four neighbour fetches. Scales match the former per-field functions:
// height ×12·scale, stripe ×8, coherence ×8. Outputs left untouched when their
// need flag is false.
fn field_gradients_at_coord(
  sourceTex: texture_2d_array<f32>,
  coord: vec2<i32>,
  texSize: vec2<i32>,
  centerHeight: f32,
  centerStripe: f32,
  centerCoherence: f32,
  centerDepth: f32,
  heightOffset: f32,
  heightGradientScale: f32,
  needHeight: bool,
  needStripe: bool,
  needCoh: bool,
  needDepth: bool,
  heightGrad: ptr<function, vec2<f32>>,
  stripeGrad: ptr<function, vec2<f32>>,
  cohGrad: ptr<function, vec2<f32>>,
  depthGrad: ptr<function, vec2<f32>>,
  heightCurvature: ptr<function, f32>
) {
  let needDistanceField = needHeight || needDepth;
  let nR = sample_neighbor_fields(sourceTex, coord + vec2<i32>(1, 0), texSize, heightOffset, needDistanceField, needStripe, needCoh);
  let nL = sample_neighbor_fields(sourceTex, coord - vec2<i32>(1, 0), texSize, heightOffset, needDistanceField, needStripe, needCoh);
  let nU = sample_neighbor_fields(sourceTex, coord + vec2<i32>(0, 1), texSize, heightOffset, needDistanceField, needStripe, needCoh);
  let nD = sample_neighbor_fields(sourceTex, coord - vec2<i32>(0, 1), texSize, heightOffset, needDistanceField, needStripe, needCoh);
  if (needHeight) {
    let r = select(centerHeight, nR.height, nR.valid);
    let l = select(centerHeight, nL.height, nL.valid);
    let u = select(centerHeight, nU.height, nU.valid);
    let d = select(centerHeight, nD.height, nD.valid);
    *heightGrad = vec2<f32>(r - l, u - d) * 12.0 * heightGradientScale;
    *heightCurvature = (r + l + u + d - 4.0 * centerHeight) * 6.0 * heightGradientScale;
  }
  if (needStripe) {
    let r = select(centerStripe, nR.stripe, nR.valid);
    let l = select(centerStripe, nL.stripe, nL.valid);
    let u = select(centerStripe, nU.stripe, nU.valid);
    let d = select(centerStripe, nD.stripe, nD.valid);
    *stripeGrad = vec2<f32>(stripe_phase_delta(r, l), stripe_phase_delta(u, d)) * 8.0;
  }
  if (needCoh) {
    let r = select(centerCoherence, nR.coherence, nR.valid);
    let l = select(centerCoherence, nL.coherence, nL.valid);
    let u = select(centerCoherence, nU.coherence, nU.valid);
    let d = select(centerCoherence, nD.coherence, nD.valid);
    *cohGrad = vec2<f32>(r - l, u - d) * 8.0;
  }
  if (needDepth) {
    let r = select(centerDepth, nR.depth, nR.valid);
    let l = select(centerDepth, nL.depth, nL.valid);
    let u = select(centerDepth, nU.depth, nU.valid);
    let d = select(centerDepth, nD.depth, nD.valid);
    *depthGrad = vec2<f32>(r - l, u - d) * 8.0 * heightGradientScale;
  }
}

// Bilinear (magnified) counterpart: analytic gradient of the bilinearly
// interpolated field over the enclosing cell, sharing the four corner fetches.
// Scales match the former per-field functions: height ×24·scale, others ×16.
fn field_gradients_bilinear(
  sourceTex: texture_2d_array<f32>,
  uv: vec2<f32>,
  texSize: vec2<i32>,
  centerHeight: f32,
  centerStripe: f32,
  centerCoherence: f32,
  centerDepth: f32,
  heightOffset: f32,
  heightGradientScale: f32,
  needHeight: bool,
  needStripe: bool,
  needCoh: bool,
  needDepth: bool,
  heightGrad: ptr<function, vec2<f32>>,
  stripeGrad: ptr<function, vec2<f32>>,
  cohGrad: ptr<function, vec2<f32>>,
  depthGrad: ptr<function, vec2<f32>>
) {
  let cell = bilinear_cell(uv, texSize);
  let needDistanceField = needHeight || needDepth;
  let n00 = sample_neighbor_fields(sourceTex, cell.base, texSize, heightOffset, needDistanceField, needStripe, needCoh);
  let n10 = sample_neighbor_fields(sourceTex, cell.base + vec2<i32>(1, 0), texSize, heightOffset, needDistanceField, needStripe, needCoh);
  let n01 = sample_neighbor_fields(sourceTex, cell.base + vec2<i32>(0, 1), texSize, heightOffset, needDistanceField, needStripe, needCoh);
  let n11 = sample_neighbor_fields(sourceTex, cell.base + vec2<i32>(1, 1), texSize, heightOffset, needDistanceField, needStripe, needCoh);
  if (needHeight) {
    let h00 = select(centerHeight, n00.height, n00.valid);
    let h10 = select(centerHeight, n10.height, n10.valid);
    let h01 = select(centerHeight, n01.height, n01.valid);
    let h11 = select(centerHeight, n11.height, n11.valid);
    let gx = mix(h10 - h00, h11 - h01, cell.f.y);
    let gy = mix(h01 - h00, h11 - h10, cell.f.x);
    *heightGrad = vec2<f32>(gx, gy) * 24.0 * heightGradientScale;
  }
  if (needStripe) {
    let s00 = select(centerStripe, n00.stripe, n00.valid);
    let s10 = select(centerStripe, n10.stripe, n10.valid);
    let s01 = select(centerStripe, n01.stripe, n01.valid);
    let s11 = select(centerStripe, n11.stripe, n11.valid);
    let gx = mix(stripe_phase_delta(s10, s00), stripe_phase_delta(s11, s01), cell.f.y);
    let gy = mix(stripe_phase_delta(s01, s00), stripe_phase_delta(s11, s10), cell.f.x);
    *stripeGrad = vec2<f32>(gx, gy) * 16.0;
  }
  if (needCoh) {
    let c00 = select(centerCoherence, n00.coherence, n00.valid);
    let c10 = select(centerCoherence, n10.coherence, n10.valid);
    let c01 = select(centerCoherence, n01.coherence, n01.valid);
    let c11 = select(centerCoherence, n11.coherence, n11.valid);
    let gx = mix(c10 - c00, c11 - c01, cell.f.y);
    let gy = mix(c01 - c00, c11 - c10, cell.f.x);
    *cohGrad = vec2<f32>(gx, gy) * 16.0;
  }
  if (needDepth) {
    let d00 = select(centerDepth, n00.depth, n00.valid);
    let d10 = select(centerDepth, n10.depth, n10.valid);
    let d01 = select(centerDepth, n01.depth, n01.valid);
    let d11 = select(centerDepth, n11.depth, n11.valid);
    let gx = mix(d10 - d00, d11 - d01, cell.f.y);
    let gy = mix(d01 - d00, d11 - d10, cell.f.x);
    *depthGrad = vec2<f32>(gx, gy) * 16.0 * heightGradientScale;
  }
}

fn debug_mirror_phase(t: f32) -> f32 {
  return 1.0 - abs(fract(t) * 2.0 - 1.0);
}

fn debug_heat(t: f32) -> vec3<f32> {
  let x = debug_mirror_phase(t);
  return clamp(vec3<f32>(x * 2.0 - 0.25, 1.0 - abs(x * 2.0 - 1.0), 1.25 - x * 2.0), vec3<f32>(0.0), vec3<f32>(1.0));
}

fn debug_distance_scale(distance: f32) -> f32 {
  return (distance + 16.0) / 32.0;
}

fn debug_gradient_scale(gradientLength: f32) -> f32 {
  return gradientLength / 6.0;
}

fn debug_wheel_sector(uv: vec2<f32>) -> i32 {
  let centered = uv - vec2<f32>(0.5);
  let angle = atan2(centered.y, centered.x);
  let phase = fract(angle / (2.0 * 3.141592653589793) + 1.0);
  return i32(floor(phase * 4.0));
}

// ── Colorize a single pixel from its raw layer values ──────────────
fn colorize_pixel(
  sourceTex: texture_2d_array<f32>,
  sourceCoord: vec2<i32>,
  sourceTexSize: vec2<i32>,
  iter_val: f32, zx_val: f32, zy_val: f32,
  extras: PixelExtras,
  uv_screen: vec2<f32>,
  uv_neutral: vec2<f32>,
  distanceHeightOffset: f32,
  distanceHeightGradientScale: f32,
  uv_tex: vec2<f32>,
  magnified: bool,
  analyticTag: bool
) -> vec4<f32> {
  // Sentinel: iter_val < 0 => uncomputed pixel.
  if (iter_val < 0.0) {
    return vec4<f32>(0.0, 0.0, 0.0, 0.0);
  }

  // Budget exhausted: z hasn't escaped. Treat as interior — same coloring.
  if (iter_val > 0.0 && (zx_val * zx_val + zy_val * zy_val) < parameters.mu) {
    return vec4<f32>(0.0, 0.0, 0.0, 0.0);
  }

  if (iter_val == 0.0) {
    return vec4<f32>(0.0, 0.0, 0.0, 0.0);
  }

  // ── Escaped pixel ──
  var iter_v = iter_val;
  var z = vec2<f32>(zx_val, zy_val);
  var z_sq = dot(z, z);
  var mu_val = smooth_escape_fraction(z_sq);

  // Phase D analytic AA: pixels the reseed tagged analytic-OK were frozen at
  // their sample-0 state; reconstruct this sample's sub-pixel value
  // ẑ(δc) = z + z′·δc + ½·z″·δc² from the raw Taylor payload
  // (layer 8 = S, 9/10 = z′ mantissa ·e^S, 11/12 = z″ mantissa ·e^{2S}) and
  // derive the subsample's smooth iteration / escape-z from ẑ — the log-log
  // formula extrapolates below bailout, no re-iteration. The extrapolated ν̂ is
  // then renormalized like the bilinear resolve: iter = floor(ν̂) + a synthetic
  // |z| reproducing fract(ν̂), so integer-parity coloring (zebra) and the escape
  // gates see a genuinely-escaped-at-that-iteration sample — a re-iterated
  // subsample crossing an iteration line gets iter±1, and the analytic one must
  // match. Height/angle keep the center pixel's values (DE varies slowly at
  // sub-pixel scale); the escape-z DIRECTION stays the center's (like the
  // bilinear path, no per-iteration angle doubling).
  if (analyticTag && parameters.aaAnalytic > 0.5 && textureNumLayers(sourceTex) > 12u) {
    let S = textureLoad(sourceTex, sourceCoord, 8, 0).r;
    let m1 = vec2<f32>(textureLoad(sourceTex, sourceCoord, 9, 0).r,
                       textureLoad(sourceTex, sourceCoord, 10, 0).r);
    let m2 = vec2<f32>(textureLoad(sourceTex, sourceCoord, 11, 0).r,
                       textureLoad(sourceTex, sourceCoord, 12, 0).r);
    // Finite guard (mirrors the reseed): a non-finite payload must fall back
    // to the center color, never feed the reconstruction.
    if (abs(S) < 1e6
      && abs(m1.x) < 1e30 && abs(m1.y) < 1e30
      && abs(m2.x) < 1e30 && abs(m2.y) < 1e30) {
    let hat = vec2<f32>(parameters.aaJitterHatX, parameters.aaJitterHatY);
    // Exponent-summed magnitudes: e^{S+ln|δc|} stays finite where e^S alone
    // would overflow f32.
    let e1 = exp(clamp(S + parameters.aaJitterLogMag, -80.0, 80.0));
    let e2 = exp(clamp(2.0 * (S + parameters.aaJitterLogMag), -80.0, 80.0));
    let zhat = z + cmul_c(m1, hat) * e1 + cmul_c(cmul_c(m2, hat), hat) * (0.5 * e2);
    let zhat_sq = dot(zhat, zhat);
    let nuHat = iter_val + smooth_escape_fraction(zhat_sq);
    var iterEff = floor(nuHat);
    var fracEff = nuHat - iterEff;
    if (iterEff < 1.0) {
      iterEff = 1.0;
      fracEff = 0.0;
    }
    iter_v = iterEff;
    mu_val = fracEff;
    // Synthetic |z| reproducing fracEff through smooth_escape_fraction (always
    // outside bailout since fracEff < 1), direction from ẑ.
    let log_z2 = max(parameters.logMu, 1e-6) * exp2(1.0 - fracEff);
    let zhatLen = max(sqrt(zhat_sq), 1e-30);
    z = zhat * (exp(0.5 * log_z2) / zhatLen);
    z_sq = dot(z, z);
    }
  }

  var nu = iter_v + mu_val;

  if (nu < 0.0) {
    return vec4<f32>(0.0, 0.0, 0.5, 1.0);
  }

  let nu_smooth = nu;

  // ── Smoothness: continuous blend between raw and smooth iteration ──
  // We need the palette phase to read wSmoothness from the texture.
  // Compute a preliminary phase to sample the smoothness weight, then
  // apply it to select between iter_val and nu.
  let paletteRepeat = max(parameters.palettePeriod, 0.0001);
  let prelimPhase = palettePhaseFromRaw(nu * 2.0 / paletteRepeat + animatedPaletteOffset());
  let row2 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(prelimPhase, palette_row_y(2.0)), 0.0);
  let wSmoothness = row2.g;
  nu = mix(iter_v, nu, wSmoothness);

  // ── Zebra: continuous application (darkens even iterations) ──
  let row1 = textureSampleLevel(paletteTex, paletteSampler, vec2<f32>(prelimPhase, palette_row_y(1.0)), 0.0);
  let wZebra = row1.r;
  let isEvenIter = 1.0 - abs(floor(iter_v) % 2.0);

  let distanceHeightStored = extras.der_x + distanceHeightOffset;
  let angle_der = extras.der_y;

  if (parameters.debugShading >= 0.5) {
    let sector = debug_wheel_sector(uv_screen);
    if (sector == 0) {
      return vec4<f32>(debug_heat(fract(nu_smooth * 0.125)), 1.0);
    }
    if (sector == 1) {
      let distanceHeight = distance_height_from_values(iter_v, z.x, z.y, distanceHeightStored);
      return vec4<f32>(debug_heat(debug_distance_scale(distanceHeight)), 1.0);
    }
    if (sector == 2) {
      let distanceHeight = distance_height_from_values(iter_v, z.x, z.y, distanceHeightStored);
      let grad = distance_height_gradient_at_coord(sourceTex, sourceCoord, sourceTexSize, distanceHeight, distanceHeightOffset, distanceHeightGradientScale);
      return vec4<f32>(debug_heat(debug_gradient_scale(length(grad))), 1.0);
    }
    return vec4<f32>(debug_heat(fract(angle_der / (2.0 * 3.141592653589793) + 0.5)), 1.0);
  }

  let v = nu;
  let v_smooth = nu_smooth;
  let stripePhase = decode_stripe_phase(extras.refWithStripe);
  let directionCoherence = decode_direction_coherence(extras.avgDirection);
  var color = palette(sourceTex, sourceCoord, sourceTexSize, iter_v, v, v_smooth, z, distanceHeightStored, distanceHeightOffset, distanceHeightGradientScale, angle_der, stripePhase, directionCoherence, uv_neutral.x, uv_neutral.y, uv_screen, uv_tex, magnified);

  // Apply zebra after palette computation: darken even iterations
  color = color * (1.0 - wZebra * isEvenIter);

  return vec4<f32>(color, 1.0);
}

// ── Bilinear interpolation of magnified source textures ────────────
// When a source texture is magnified on screen (zoom factor > 1), nearest
// sampling shows each texel as a flat square.  These helpers rebuild a
// continuous pixel by bilinearly interpolating the 4 surrounding texels,
// using the same per-channel strategy as resolve.wgsl:
//   - nu interpolated continuously, re-encoded as iter = floor(nu) plus a
//     synthetic |z| that reproduces fract(nu) through smooth_escape_fraction;
//   - z direction interpolated as unit vectors;
//   - distance height lerped; derivative angle and stripe phase lerped
//     circularly; average orbit direction unpacked, lerped, repacked.
// Non-escaped corners (sentinel, inside, budget-exhausted, no data) are
// masked out; if they dominate, the caller keeps its nearest sample.

const TWO_PI: f32 = 6.283185307179586;

fn decode_avg_dir_vec(encoded: f32) -> vec2<f32> {
  let xq = floor(encoded / ORBIT_DIRECTION_BASE);
  let yq = encoded - xq * ORBIT_DIRECTION_BASE;
  return vec2<f32>(
    (xq / ORBIT_DIRECTION_SCALE - 0.5) * 2.0,
    (yq / ORBIT_DIRECTION_SCALE - 0.5) * 2.0,
  );
}

fn encode_avg_dir_vec(avgDir: vec2<f32>) -> f32 {
  let phase = clamp(avgDir * 0.5 + vec2<f32>(0.5), vec2<f32>(0.0), vec2<f32>(1.0));
  let xq = floor(phase.x * ORBIT_DIRECTION_SCALE + 0.5);
  let yq = floor(phase.y * ORBIT_DIRECTION_SCALE + 0.5);
  return xq * ORBIT_DIRECTION_BASE + yq;
}

struct InterpPixel {
  kind: i32, // 0 = not interpolable (caller keeps nearest), 1 = escaped interpolated
  iter: f32,
  zx: f32,
  zy: f32,
  step: f32, // finest resolution step among contributing corners (for compositing)
  extras: PixelExtras,
};

fn sample_escaped_bilinear(sourceTex: texture_2d_array<f32>, uv: vec2<f32>, texSize: vec2<i32>) -> InterpPixel {
  var out: InterpPixel;
  out.kind = 0;

  let texSizeF = vec2<f32>(f32(texSize.x), f32(texSize.y));
  let p = vec2<f32>(uv.x * texSizeF.x, (1.0 - uv.y) * texSizeF.y) - vec2<f32>(0.5);
  let baseF = floor(p);
  let f = p - baseF;
  let base = vec2<i32>(i32(baseF.x), i32(baseF.y));
  var offsets = array<vec2<i32>, 4>(
    vec2<i32>(0, 0), vec2<i32>(1, 0), vec2<i32>(0, 1), vec2<i32>(1, 1)
  );
  var weights = array<f32, 4>(
    (1.0 - f.x) * (1.0 - f.y),
    f.x * (1.0 - f.y),
    (1.0 - f.x) * f.y,
    f.x * f.y
  );

  var wEscaped = 0.0;
  var wInside = 0.0;
  var minStep = 1e30;
  // nu is accumulated relative to baseIter (the first escaped corner's
  // iteration count) to keep full f32 precision at deep zooms where
  // iteration counts are large.
  var baseIter = -1.0;
  var nuSum = 0.0;
  var distSum = 0.0;
  var zDirSum = vec2<f32>(0.0);
  var angleDirSum = vec2<f32>(0.0);
  var stripeDirSum = vec2<f32>(0.0);
  var avgDirSum = vec2<f32>(0.0);
  var bestW = -1.0;
  var bestRefInt = 0.0;
  var bestAngle = 0.0;
  var bestStripe = 0.0;

  for (var i = 0u; i < 4u; i = i + 1u) {
    let ccoord = clamp(base + offsets[i], vec2<i32>(0), texSize - vec2<i32>(1));
    let w = weights[i];
    let citer = textureLoad(sourceTex, ccoord, 0, 0).r;
    let cstep = textureLoad(sourceTex, ccoord, 1, 0).r;
    // Sentinel or no data: this corner simply contributes no weight.
    if (citer < 0.0 || cstep <= 0.0) {
      continue;
    }
    // Inside the set: tracked separately so the interior keeps priority
    // (interpolating escaped values over it would erode the set boundary).
    if (citer == 0.0) {
      wInside = wInside + w;
      continue;
    }
    let zx = textureLoad(sourceTex, ccoord, 2, 0).r;
    let zy = textureLoad(sourceTex, ccoord, 3, 0).r;
    let z_sq = zx * zx + zy * zy;
    if (z_sq < parameters.mu) {
      // Budget-exhausted: not displayable as escaped, contributes no weight.
      continue;
    }

    minStep = min(minStep, cstep);
    if (baseIter < 0.0) {
      baseIter = citer;
    }
    wEscaped = wEscaped + w;
    nuSum = nuSum + w * ((citer - baseIter) + clamp(smooth_escape_fraction(z_sq), 0.0, 1.0));
    distSum = distSum + w * textureLoad(sourceTex, ccoord, 4, 0).r;
    let angle = textureLoad(sourceTex, ccoord, 5, 0).r;
    angleDirSum = angleDirSum + w * vec2<f32>(cos(angle), sin(angle));
    let zLen = max(sqrt(z_sq), 1e-12);
    zDirSum = zDirSum + w * vec2<f32>(zx, zy) / zLen;
    let refVal = max(textureLoad(sourceTex, ccoord, 6, 0).r, 0.0);
    let stripePhase = fract(refVal);
    let stripeAngle = stripePhase * TWO_PI;
    stripeDirSum = stripeDirSum + w * vec2<f32>(cos(stripeAngle), sin(stripeAngle));
    avgDirSum = avgDirSum + w * decode_avg_dir_vec(textureLoad(sourceTex, ccoord, 7, 0).r);
    if (w > bestW) {
      bestW = w;
      bestRefInt = floor(refVal);
      bestAngle = angle;
      bestStripe = stripePhase;
    }
  }

  // The interior keeps priority over escaped interpolation (no halo inside
  // the set), but no-data / budget-exhausted corners do NOT block it: the
  // interpolation is then the only usable data for this pixel, which fills
  // the flat blocks that otherwise flash during frozen reprojection swaps.
  if (wEscaped <= 1e-6 || wInside > wEscaped) {
    return out;
  }

  let invW = 1.0 / wEscaped;
  let logMu = max(parameters.logMu, 1e-6);

  // nu → iter = floor(nu) + synthetic |z| reproducing fract(nu).
  // floor/fract are computed on the small relative value for f32 precision.
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

  out.kind = 1;
  out.iter = iterOut;
  out.zx = zDir.x * zLenOut;
  out.zy = zDir.y * zLenOut;
  out.step = minStep;
  out.extras.der_x = distSum * invW;
  out.extras.der_y = select(bestAngle, atan2(angleDirSum.y, angleDirSum.x), length(angleDirSum) > 1e-5);
  let stripeOut = select(
    bestStripe,
    fract(atan2(stripeDirSum.y, stripeDirSum.x) / TWO_PI + 1.0),
    length(stripeDirSum) > 1e-5
  );
  out.extras.refWithStripe = bestRefInt + min(stripeOut, 0.999999);
  out.extras.avgDirection = encode_avg_dir_vec(clamp(avgDirSum * invW, vec2<f32>(-1.0), vec2<f32>(1.0)));
  return out;
}

// Colorize from a source texture, replacing the nearest sample with a
// pre-computed bilinear interpolation when one is available (magnified case).
fn colorize_sampled(
  sourceTex: texture_2d_array<f32>,
  coord: vec2<i32>,
  texSize: vec2<i32>,
  iter_val: f32, zx_val: f32, zy_val: f32,
  interp: InterpPixel,
  uv_tex: vec2<f32>,
  magnified: bool,
  uv_screen: vec2<f32>,
  uv_neutral: vec2<f32>,
  distanceHeightOffset: f32,
  distanceHeightGradientScale: f32,
  analyticTag: bool
) -> vec4<f32> {
  var it = iter_val;
  var zx = zx_val;
  var zy = zy_val;
  var extras = load_pixel_extras(sourceTex, coord);
  var analytic = analyticTag;
  if (interp.kind == 1) {
    it = interp.iter;
    zx = interp.zx;
    zy = interp.zy;
    extras = interp.extras;
    // Bilinear-interpolated values are not payload-consistent: no expansion.
    analytic = false;
  }
  return colorize_pixel(
    sourceTex, coord, texSize, it, zx, zy, extras,
    uv_screen, uv_neutral, distanceHeightOffset, distanceHeightGradientScale,
    uv_tex, magnified, analytic
  );
}

// ── Debug flag ──
// Set to true to visualize the live texture as a negative image during zoom,
// with genuine pixels tinted green and resolve-copied pixels tinted red.
const DEBUG_SHOW_LIVE_NEGATIVE: bool = false;

// ── sRGB ↔ linear (gamma-correct AA accumulation) ──────────────────
fn srgb_to_linear(c: vec3<f32>) -> vec3<f32> {
  let cutoff = c <= vec3<f32>(0.04045);
  let low = c / 12.92;
  let high = pow((max(c, vec3<f32>(0.0)) + 0.055) / 1.055, vec3<f32>(2.4));
  return select(high, low, cutoff);
}

fn linear_to_sRGB(c: vec3<f32>) -> vec3<f32> {
  let cl = max(c, vec3<f32>(0.0));
  let cutoff = cl <= vec3<f32>(0.0031308);
  let low = cl * 12.92;
  let high = 1.055 * pow(cl, vec3<f32>(1.0 / 2.4)) - 0.055;
  return select(high, low, cutoff);
}

// Core shading, returns sRGB color (unchanged from the historical fs_main body).
// Entry points below wrap this: fs_main (linear, for AA accumulation) and
// fs_main_direct (sRGB, for direct-to-swapchain and PNG export).
fn shade_srgb(fragCoord: vec2<f32>, applyAaGate: bool) -> vec4<f32> {
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
  // Texture magnified on screen → bilinear interpolation of the samples.
  let liveMagnified = lzf > 1.001;
  let frozenMagnified = zf > 1.001;
  let liveDistanceHeightOffset = distance_height_scale_offset(lzf);
  let frozenDistanceHeightOffset = distance_height_scale_offset(zf);
  let liveDistanceHeightGradientScale = distance_height_gradient_scale(lzf);
  let frozenDistanceHeightGradientScale = distance_height_gradient_scale(zf);

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
    liveInBounds = isInsideScreen(uv_live, aspect, neutralExtent, sceneSin, sceneCos);
  } else {
    liveInBounds = uv_live.x >= 0.0 && uv_live.x <= 1.0
                && uv_live.y >= 0.0 && uv_live.y <= 1.0;
  }

  var liveCoord = vec2<i32>(0);
  var live_iter = -1.0;
  var liveStep = 0.0;  // 0 = no data
  var live_zx = 0.0;
  var live_zy = 0.0;
  // Phase D: the reseed tags analytic-OK pixels with a +0.5 fraction in the AA
  // target map (the integer part stays the sample-count target).
  var liveAnalyticTag = false;
  if (liveInBounds) {
    liveCoord = vec2<i32>(
      i32(clamp(uv_live.x * texSizeF.x, 0.0, texSizeF.x - 1.0)),
      i32(clamp((1.0 - uv_live.y) * texSizeF.y, 0.0, texSizeF.y - 1.0))
    );
    // AA per-pixel gate: once this pixel has accumulated its distance-estimation
    // target sample count, stop contributing so its average is the unbiased mean
    // of exactly `target` jittered samples (no over-weighting of frozen pixels).
    // target <= 0 means "not baked yet" (sample 0) → always contribute.
    if (applyAaGate) {
      let aaTargetRaw = textureLoad(aaTargetTex, liveCoord, 0).r;
      let aaTarget = floor(aaTargetRaw);
      liveAnalyticTag = fract(aaTargetRaw) > 0.25;
      if (aaTarget > 0.0 && parameters.aaSampleIndex >= aaTarget) {
        discard;
      }
    }
    let liveSample = load_pixel_sample(tex, liveCoord);
    live_iter = liveSample.iter;
    liveStep = liveSample.step;
    live_zx = liveSample.zx;
    live_zy = liveSample.zy;
  }

  // When magnified, the bilinear interpolation both smooths the display and
  // serves as a data source where the nearest texel is unusable (sentinel,
  // budget-exhausted) — this fills the flat blocks that otherwise flash
  // when the compositing alternates between live and frozen during zoom.
  var liveInterp: InterpPixel;
  liveInterp.kind = 0;
  if (liveInBounds && liveMagnified) {
    liveInterp = sample_escaped_bilinear(tex, uv_live, texSize);
  }

  let liveEscaped = live_iter > 0.0 && (live_zx * live_zx + live_zy * live_zy) >= parameters.mu;
  var liveHasData = liveEscaped && liveStep > 0.0;
  var liveCompositeStep = liveStep;
  if (liveInterp.kind == 1) {
    liveHasData = true;
    liveCompositeStep = liveInterp.step;
  }

  // ── Sample frozen texture ──
  // The frozen texture is only usable when it is aligned with the live texture
  // (during zoom reprojection, or post-zoom before any translation occurs).
  // The CPU sets frozenAligned = 1.0 in those cases, 0.0 otherwise.
  let useFrozen = parameters.frozenAligned > 0.5;

  var frozenCoord = vec2<i32>(0);
  var frozenStep = 0.0;  // 0 = no data
  var frozen_iter = -1.0;
  var frozen_zx = 0.0;
  var frozen_zy = 0.0;
  var uv_frozen = vec2<f32>(0.0);
  var frozenInterp: InterpPixel;
  frozenInterp.kind = 0;
  if (useFrozen) {
    uv_frozen = (uv_neutral - vec2<f32>(0.5, 0.5)) / zf + vec2<f32>(0.5, 0.5)
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
      let frozenSample = load_pixel_sample(texFrozen, frozenCoord);
      frozen_iter = frozenSample.iter;
      frozenStep = frozenSample.step;
      frozen_zx = frozenSample.zx;
      frozen_zy = frozenSample.zy;
      if (frozenMagnified) {
        frozenInterp = sample_escaped_bilinear(texFrozen, uv_frozen, texSize);
      }
    }
  }
  let frozenEscaped = frozen_iter > 0.0 && (frozen_zx * frozen_zx + frozen_zy * frozen_zy) >= parameters.mu;
  let frozenInterior = frozen_iter == 0.0;
  var frozenHasData = (frozenEscaped || frozenInterior) && frozenStep > 0.0;
  var frozenCompositeStep = frozenStep;
  if (frozenInterp.kind == 1) {
    frozenHasData = true;
    frozenCompositeStep = frozenInterp.step;
  }

  // ── Pick the best pixel: smallest positive step wins ──
  // step > 0 means the pixel has data; step = 0 means no data.
  // The frozen and live textures live at different scales, so their raw step
  // values are not directly comparable. A frozen genuine pixel (step=1) at
  // frozenScale is zf/lzf times coarser per axis than a live genuine pixel
  // (step=1) at liveScale.  Scale the frozen step to live-resolution units.
  let scaleRatio = select(1.0, zf / lzf, lzf > 0.0);
  let effectiveFrozenStep = frozenCompositeStep * scaleRatio;

  if (liveHasData && frozenHasData) {
    // Both have data — pick the one with finer resolution (smaller step).
    if (liveCompositeStep <= effectiveFrozenStep) {
      let liveColor = colorize_sampled(
        tex,
        liveCoord,
        texSize,
        live_iter,
        live_zx,
        live_zy,
        liveInterp,
        uv_live,
        liveMagnified,
        uv_screen,
        uv_neutral,
        liveDistanceHeightOffset,
        liveDistanceHeightGradientScale,
        liveAnalyticTag
      );
      if (DEBUG_SHOW_LIVE_NEGATIVE) {
        let neg = vec3<f32>(1.0) - liveColor.rgb;
        return vec4<f32>(neg.r * 0.3, neg.g, neg.b * 0.3, 1.0);
      }
      return vec4<f32>(liveColor.rgb, 1.0);
    } else {
      let frozenColor = colorize_sampled(
        texFrozen,
        frozenCoord,
        texSize,
        frozen_iter,
        frozen_zx,
        frozen_zy,
        frozenInterp,
        uv_frozen,
        frozenMagnified,
        uv_screen,
        uv_neutral,
        frozenDistanceHeightOffset,
        frozenDistanceHeightGradientScale,
        false
      );
      return vec4<f32>(frozenColor.rgb, 1.0);
    }
  }

  if (liveHasData) {
    let liveColor = colorize_sampled(
      tex,
      liveCoord,
      texSize,
      live_iter,
      live_zx,
      live_zy,
      liveInterp,
      uv_live,
      liveMagnified,
      uv_screen,
      uv_neutral,
      liveDistanceHeightOffset,
      liveDistanceHeightGradientScale,
      liveAnalyticTag
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
    let frozenColor = colorize_sampled(
      texFrozen,
      frozenCoord,
      texSize,
      frozen_iter,
      frozen_zx,
      frozen_zy,
      frozenInterp,
      uv_frozen,
      frozenMagnified,
      uv_screen,
      uv_neutral,
      frozenDistanceHeightOffset,
      frozenDistanceHeightGradientScale,
      false
    );
    return vec4<f32>(frozenColor.rgb, 1.0);
  }

  // No valid pixel from either source.
  return vec4<f32>(0.05, 0.05, 0.05, 1.0);
}

// Interleaved-gradient-noise dither: ±0.5 LSB at 8 bits, applied right before
// quantization to break banding on slow palette ramps.
fn dither_8bit(pixelCoord: vec2<f32>) -> f32 {
  let n = fract(52.9829189 * fract(dot(pixelCoord, vec2<f32>(0.06711056, 0.00583715))));
  return (n - 0.5) / 255.0;
}

// AA-accumulation path: output linear RGB with alpha = 1.0 so additive blending
// sums colors in linear space and accumulates a per-pixel sample count in alpha.
// No dither here: the accumulation target is float, present.wgsl dithers.
@fragment
fn fs_main(@location(0) fragCoord: vec2<f32>) -> @location(0) vec4<f32> {
  let c = shade_srgb(fragCoord, true);
  return vec4<f32>(srgb_to_linear(c.rgb), 1.0);
}

// Direct path: unmodified sRGB output (no linear roundtrip, no AA gate) for the
// legacy direct-to-swapchain render and the PNG/snapshot export — both 8-bit,
// hence the dither.
@fragment
fn fs_main_direct(@location(0) fragCoord: vec2<f32>, @builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  let c = shade_srgb(fragCoord, false);
  return vec4<f32>(clamp(c.rgb + vec3<f32>(dither_8bit(pos.xy)), vec3<f32>(0.0), vec3<f32>(1.0)), c.a);
}
