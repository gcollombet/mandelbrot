// Settled non-AA rotation resolve. The cache contains final linear color in the
// scene-aligned neutral square. Only this final color is filtered; Mandelbrot
// iteration state and all analytic/metadata payloads remain discrete.

struct RotationPresentUniforms {
  aspect: f32,
  sceneSin: f32,
  sceneCos: f32,
  padding: f32,
};

@group(0) @binding(0) var<uniform> parameters: RotationPresentUniforms;
@group(0) @binding(1) var rotationColorTex: texture_2d<f32>;
@group(0) @binding(2) var rotationColorSampler: sampler;

struct VSOut {
  @builtin(position) position: vec4<f32>,
  @location(0) screenUv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vertexIndex: u32) -> VSOut {
  var positions = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( 1.0,  1.0)
  );
  let position = positions[vertexIndex];
  var out: VSOut;
  out.position = vec4<f32>(position, 0.0, 1.0);
  out.screenUv = position * 0.5 + vec2<f32>(0.5);
  return out;
}

fn rotate_sincos(v: vec2<f32>, s: f32, c: f32) -> vec2<f32> {
  return vec2<f32>(c * v.x - s * v.y, s * v.x + c * v.y);
}

fn linear_to_sRGB(c: vec3<f32>) -> vec3<f32> {
  let cl = max(c, vec3<f32>(0.0));
  let cutoff = cl <= vec3<f32>(0.0031308);
  let low = cl * 12.92;
  let high = 1.055 * pow(cl, vec3<f32>(1.0 / 2.4)) - 0.055;
  return select(high, low, cutoff);
}

fn dither_8bit(pixelCoord: vec2<f32>) -> f32 {
  let n = fract(52.9829189 * fract(dot(pixelCoord, vec2<f32>(0.06711056, 0.00583715))));
  return (n - 0.5) / 255.0;
}

@fragment
fn fs_main(
  @location(0) screenUv: vec2<f32>,
  @builtin(position) fragPosition: vec4<f32>,
) -> @location(0) vec4<f32> {
  let screenPosition = screenUv * 2.0 - vec2<f32>(1.0);
  let local = vec2<f32>(screenPosition.x * parameters.aspect, screenPosition.y);
  let localRot = rotate_sincos(local, parameters.sceneSin, parameters.sceneCos);
  let neutralExtent = sqrt(parameters.aspect * parameters.aspect + 1.0);
  let neutralUv = localRot / neutralExtent * 0.5 + vec2<f32>(0.5);

  // Render-target rows run opposite to the mathematical neutral-y convention.
  // Alpha is a coverage weight: normalize after bilinear filtering so the
  // alpha-zero exterior of the rotated canvas cannot darken its edge.
  let sampleUv = vec2<f32>(neutralUv.x, 1.0 - neutralUv.y);
  let filtered = textureSampleLevel(rotationColorTex, rotationColorSampler, sampleUv, 0.0);
  let linearColor = filtered.rgb / max(filtered.a, 1e-6);
  let srgb = linear_to_sRGB(linearColor);
  return vec4<f32>(srgb + vec3<f32>(dither_8bit(fragPosition.xy)), 1.0);
}
