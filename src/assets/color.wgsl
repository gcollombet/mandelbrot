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

  // ── Sample all effect channels from the palette texture ──
  let fx = sampleEffects(palettePhase);

  let effTess = fx.wTessellation;
  let effWebcam = fx.wWebcam;
  let effShading = fx.wShading;

  // ── Tessellation depth: always smooth, independent of palette period ──
  let tess_depth = v_smooth * 2.0;
  let disp = parameters.displacementAmount;
  let tess_u = tess_depth * 2.0 * disp + dx;
  let tess_v = tess_depth * 2.0 * disp + dy;

  // ── Gentle sinusoidal animation (only when animate is on) ──
  let anim = parameters.animate;
  let t = parameters.time;
  let spd = parameters.animationSpeed;

  // ── Blend color sources using overlay/opacity model ──
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

  // ── Shading (always computed, applied proportionally to wShading) ──
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

// ── Colorize a single pixel from its raw layer values ──────────────
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

  // Budget exhausted: z hasn't escaped. Treat as interior — same coloring.
  if (iter_val > 0.0 && (zx_val * zx_val + zy_val * zy_val) < parameters.mu) {
    return vec4<f32>(0.0, 0.0, 0.0, 0.0);
  }

  // Inside the set: iter_val == 0. Color by smooth iteration count (stored in ref_i_val).
  // Smoothing with |z_n|: works regardless of epsilon detection.
  // Palette cycling uses a fixed ratio (independent of palettePeriod).
  if (iter_val == 0.0) {
    return vec4<f32>(0.0, 0.0, 0.0, 0.0);
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
  var color = palette(sourceTex, sourceCoord, sourceTexSize, iter_val, v, v_smooth, z, der, angle_der, uv_neutral.x, uv_neutral.y);

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

  // ── Pick the best pixel: smallest positive step wins ──
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
    // Both have data — pick the one with finer resolution (smaller step).
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
