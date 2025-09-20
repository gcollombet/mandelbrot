struct Uniforms {
  palettePeriod: f32,
  bloomStrength: f32,
};
@group(0) @binding(0) var<uniform> uniforms: Uniforms;
@group(0) @binding(1) var tex: texture_2d<f32>;
@group(0) @binding(2) var tileTex: texture_2d<f32>;
@group(0) @binding(3) var skyboxTex: texture_2d<f32>;
struct VertexOutput {
  @builtin(position) position : vec4<f32>,
  @location(0) fragCoord : vec2<f32>
};
@vertex
fn vs_main(@builtin(vertex_index) VertexIndex : u32) -> VertexOutput {
  var pos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>(-1.0,  1.0),
    vec2<f32>( 1.0, -1.0),
    vec2<f32>( 1.0,  1.0)
  );
  var out : VertexOutput;
  out.position = vec4<f32>(pos[VertexIndex], 0.0, 1.0);
  out.fragCoord = (pos[VertexIndex] + vec2<f32>(1.0, 1.0)) * 0.5;
  return out;
}

// Conversion d'une direction 3D en coordonnées UV pour une skybox equirectangulaire
fn dir_to_skybox_uv(dir: vec3<f32>) -> vec2<f32> {
  let d = normalize(dir);
  let u = 0.5 + atan2(d.z, d.x) / (2.0 * 3.14159265);
  let v = 0.5 - asin(d.y) / 3.14159265;
  return vec2<f32>(u, v);
}

fn tile_tessellation(v: f32, dist: f32, repeat: f32) -> vec3<f32> {
  // Utilise v pour la position sur la fractale, et la distance au centre pour la coordonnée y
  let tileUV = vec2<f32>(fract(v * repeat), fract(dist * repeat));
  let texSize = vec2<i32>(textureDimensions(tileTex, 0));
  let coord = vec2<i32>(
    i32(clamp(tileUV.x * f32(texSize.x), 0.0, f32(texSize.x - 1))),
    i32(clamp((1.0 - tileUV.y) * f32(texSize.y), 0.0, f32(texSize.y - 1)))
  );
  return textureLoad(tileTex, coord, 0).rgb;
}

fn palette(v: f32, len: f32, d: vec2<f32>, dx: f32, dy: f32) -> vec3<f32> {
  // Couleur de base
  let t = abs(v * 2.0 - 1.0);
  let r = 0.5 + 0.5 * cos(1.0 + t * 6.28 - dx / 2.0);
  let g = 0.5 + 0.5 * sin(2.0 + t * 5.88 - dy / 4.0);
  let b = 0.5 + 0.5 * cos(t * 3.14 + ((dx) / 8.0));
  var baseColor = vec3<f32>(r, g, b);

  // Calcul de la distance au centre de l'écran (coordonnées normalisées 0..1)
  let center = vec2<f32>(0.5, 0.5);
  let dist = distance(vec2<f32>(dx, dy), center);
  // Tesselation avec tileTex basée sur v et la distance au centre
  let tessColor = tile_tessellation(sqrt(v), dx * dy * dist, 2.0);
  // Mélange la couleur fractale avec la tesselation (modulation)
  let color =  tessColor;

  // --- Phong shading corrigé ---
  let normal = normalize(vec3<f32>(d.y, d.x, 1.0));
  let lightDir = normalize(vec3<f32>(0.2, 0.3, 0.9));
  let viewDir = vec3<f32>(0.0, 0.6, 1.0);
  let diff = max(dot(normal, lightDir), 0.0);
  let ambient = 1.0;
  let reflectDir = reflect(-lightDir, normal);
  let specular = pow(max(dot(viewDir, reflectDir), 0.0), 16.0);
  let skyboxUV = dir_to_skybox_uv(reflectDir);
  let skyboxSize = vec2<i32>(textureDimensions(skyboxTex, 0));
  let skyboxCoord = vec2<i32>(
    i32(clamp(skyboxUV.x * f32(skyboxSize.x), 0.0, f32(skyboxSize.x - 1))),
    i32(clamp((1.0 - skyboxUV.y) * f32(skyboxSize.y), 0.0, f32(skyboxSize.y - 1)))
  );
  let skyboxColor = textureLoad(skyboxTex, skyboxCoord, 0).rgb;
  let phong = ambient + 1.0 * diff + 1.0 * specular;
  let finalColor = mix(color, skyboxColor * phong , 0.0);
  // invert finalColor for a more "spacey" look
//  finalColor = vec3<f32>(1.0) - finalColor;
  return clamp(finalColor, vec3<f32>(0.0), vec3<f32>(1.0));
  //return vec3<f32>(0.0,  1.0 - len , 0.0);

}


@fragment
fn fs_main(@location(0) fragCoord: vec2<f32>) -> @location(0) vec4<f32> {
  let uv = fragCoord;
  let texSize = vec2<i32>(textureDimensions(tex, 0));
  let center = vec2<f32>(0.5, 0.5);
  let blurStrength = uniforms.bloomStrength; // Utilisé comme force du blur radial
  let blurSamples = 4; // Nombre d'échantillons pour le blur
  var color = vec3<f32>(0.0, 0.0, 0.0);
  var total = 0.0;
  // Blur radial : on échantillonne le long du rayon centre -> pixel
  for (var i = 0; i < blurSamples; i = i + 1) {
    let t = f32(i) / f32(blurSamples - 1);
    // t = 0 (centre), t = 1 (pixel courant)
    let sampleUV = mix(center, uv, t * blurStrength + (1.0 - blurStrength));
    let sampleCoord = vec2<i32>(
      i32(clamp(sampleUV.x * f32(texSize.x), 0.0, f32(texSize.x - 1))),
      i32(clamp((1.0 - sampleUV.y) * f32(texSize.y), 0.0, f32(texSize.y - 1)))
    );
    let data = textureLoad(tex, sampleCoord, 0);
    let nu = data.x;
    let d = data.y;
    let period = uniforms.palettePeriod;
    var sampleColor: vec3<f32>;
    if (nu <= 0.0) {
      sampleColor = vec3<f32>(0.0, 0.0, 0.0);
    } else {
      let v = fract(nu / period);
      sampleColor = palette(v, data.y, vec2<f32>(data.z, data.w), sampleUV.x, sampleUV.y);
    }
    // Poids : plus proche du pixel courant = plus fort
    let weight = 0.5 + 0.5 * t;
    color = color + sampleColor * weight;
    total = total + weight;
  }
  color = color / total;
  return vec4<f32>(color, 1.0);

}