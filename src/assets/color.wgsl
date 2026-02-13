struct Uniforms {
  palettePeriod: f32,
  tessellationLevel: f32,
  shadingLevel: f32,
  bloomStrength: f32,
  time: f32,
  activateTessellation : f32,
  activateShading : f32,
  activateWebcam : f32,
  activatePalette : f32,
  activateSkybox : f32,
  activateSmoothness : f32,
  activateZebra: f32,
};
@group(0) @binding(0) var<uniform> parameters: Uniforms;
@group(0) @binding(1) var tex: texture_2d<f32>;
@group(0) @binding(2) var tileTex: texture_2d<f32>;
@group(0) @binding(3) var skyboxTex: texture_2d<f32>;
@group(0) @binding(4) var webcamTex: texture_2d<f32>;
@group(0) @binding(5) var paletteTex: texture_2d<f32>;
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
fn dir_to_skybox_uv(dir: vec3<f32>, dx: f32, dy: f32) -> vec2<f32> {

  let d = normalize(dir);
  let u = abs((dx + atan2(d.z, d.x) / (2.0 * 3.14159265)) % 2.0 - 1.0) / 2.0 ;
  let v = abs((dy + asin(d.y) / 3.14159265) % 2.0 - 1.0) / 2.0 ;
  return vec2<f32>(u, v);
}

fn tile_tessellation(tex : texture_2d<f32>,v: f32, dist: f32, repeat: f32) -> vec3<f32> {
  let tileUV = vec2<f32>(fract(v * repeat), fract(dist * repeat));
  let tileIndex = vec2<i32>(i32(floor(v * repeat)), i32(floor(dist * repeat)));

  // Inversion en miroir sur x et/ou y selon la parité de l'index
  let mirrorX = (tileIndex.x % 2) == 1;
  let mirrorY = (tileIndex.y % 2) == 1;
  let uv = vec2<f32>(
      select(tileUV.x, 1.0 - tileUV.x, mirrorX),
      select(tileUV.y, 1.0 - tileUV.y, mirrorY)
  );
  let texSize = vec2<i32>(textureDimensions(tex, 0));
  let coord = vec2<i32>(
    i32(clamp(uv.x * f32(texSize.x), 0.0, f32(texSize.x - 1))),
    i32(clamp((1.0 - uv.y) * f32(texSize.y), 0.0, f32(texSize.y - 1)))
  );
  return textureLoad(tex, coord, 0).rgb;
}

// Conversion RGB -> HSV
fn rgb2hsv(c: vec3<f32>) -> vec3<f32> {
  let K = vec4<f32>(0.0, -1.0/3.0, 2.0/3.0, -1.0);
  let p = mix(vec4<f32>(c.bg, K.wz), vec4<f32>(c.gb, K.xy), step(c.b, c.g));
  let q = mix(vec4<f32>(p.xyw, c.r), vec4<f32>(c.r, p.yzx), step(p.x, c.r));
  let d = q.x - min(q.w, q.y);
  let e = 1.0e-10;
  return vec3<f32>(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}
// Conversion HSV -> RGB
fn hsv2rgb(c: vec3<f32>) -> vec3<f32> {
  let K = vec4<f32>(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  let p = abs(fract(vec3<f32>(c.x, c.x, c.x) + K.yzw) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, vec3<f32>(0.0), vec3<f32>(1.0)), c.y);
}

fn paletteHeight(h: f32, uv: vec2<f32>) -> vec3<f32> {
let cameraPos = vec3<f32>(0.5, 0.5, 2.0); // camZ à ajuster selon la scène
let surfacePos = vec3<f32>(uv.x, uv.y, h);
let viewDir = normalize(cameraPos - surfacePos);

  let texSize = vec2<f32>(textureDimensions(tex, 0));
  let eps = 1.0 / f32(texSize.x);
  // Calcul des dérivées pour la normale
  let h_dx = textureLoad(tex, vec2<i32>(
    i32(clamp((uv.x + eps) * f32(texSize.x), 0.0, f32(texSize.x - 1))),
    i32(clamp((1.0 - uv.y) * f32(texSize.y), 0.0, f32(texSize.y - 1)))
  ), 0).r - h;
  let h_dy = textureLoad(tex, vec2<i32>(
    i32(clamp(uv.x * f32(texSize.x), 0.0, f32(texSize.x - 1))),
    i32(clamp((1.0 - (uv.y + eps)) * f32(texSize.y), 0.0, f32(texSize.y - 1)))
  ), 0).r - h;
  let normal = normalize(vec3<f32>(-h_dx, -h_dy, 0.0)) + vec3<f32>(0.5, 0.5, 0.5);

// 3. Échantillonnage du skybox avec le vecteur de réflexion
let reflectDir = reflect(-viewDir, normal);
let skyboxUV = dir_to_skybox_uv(reflectDir, 0.0, 0.0);
let skyboxSize= vec2<i32>(textureDimensions(skyboxTex, 0));
let skyBoxCoord = vec2<i32>(
  i32(clamp(skyboxUV.x * f32(skyboxSize.x), 0.0, f32(skyboxSize.x - 1))),
  i32(clamp((1.0 - skyboxUV.y) * f32(skyboxSize.y), 0.0, f32(skyboxSize.y - 1)))
);
let reflectionColor = textureLoad(skyboxTex, skyBoxCoord, 0).rgb;
let reflectStrength = 0.5; // Contrôle de l'intensité de la réflexion
let diffuseColor = vec3<f32>(0.5, 0.5, 0.5);
// Mélange avec la couleur diffuse
let finalColor = reflectionColor;
return normal;
}


fn palette(v: f32, len: f32, zd: vec2<f32>, dx: f32, dy: f32) -> vec3<f32> {

   // the vec2 from than angle zd.x
    let d = vec2<f32>(cos(zd.x), sin(zd.x));
    let z = vec2<f32>(cos(zd.y), sin(zd.y));
  // Calcul de la distance au centre de l'écran (coordonnées normalisées 0..1)
  let center = vec2<f32>(0.5, 0.5);
  let dist = distance(vec2<f32>(dx, dy), center);
  let deep = sqrt(v) * 2.0;
  // Tessellation avec tileTex basée sur v et la distance au centre
  let tessColor =  tile_tessellation(tileTex, deep + dx, deep + dy, parameters.tessellationLevel );
  let webCamColor = tile_tessellation(
    webcamTex,
    deep + dx + cos(parameters.time * 0.1),
    deep + dy + sin(parameters.time * 0.15),
    parameters.tessellationLevel + sin(parameters.time * 0.05)
  );
  let paletteColor = tile_tessellation(paletteTex, deep, 1.0, parameters.palettePeriod );
  var color = vec3<f32>(0.0, 0.0, 0.0);

    if(parameters.activatePalette == 1.0) {
        color = mix(color, paletteColor, 1.0 - color);
    }

    if(parameters.activateTessellation == 1.0) {
        color = mix(color, tessColor, 1.0 - color);
    }

    if(parameters.activateWebcam == 1.0) {
      color = mix(color, webCamColor, 1.0 - color);
    }

    if(parameters.activatePalette == 0.0
       && parameters.activateTessellation == 0.0
       && parameters.activateWebcam == 0.0
    ) {
      if(parameters.activateSkybox == 0.0) {
        color = vec3<f32>(0.5, 0.5, 0.5);
      } else {
        color = vec3<f32>(1.0, 1.0, 1.0);
      }
    }
    if(parameters.activateShading == 1.0) {
      // --- Phong shading corrigé ---
      let normal = normalize(vec3<f32>(d.y, d.x, 1.0));
      let lightDir = normalize(vec3<f32>(0.2, 0.3, 0.9 ));
      let viewDir = vec3<f32>(0.0, 0.6, 1.0);
      let diff = max(dot(normal, lightDir), 0.0);
      let ambient = 2.0;
      let reflectDir = reflect(-lightDir, normal);
      let specular = pow(max(dot(viewDir, reflectDir), 0.0), 1.0);
      var phong = ambient + 2.0 * diff + 1.0 * specular;
      if(parameters.activateSkybox == 1.0) {
        // --- Skybox ---
        let skyboxDir = normalize(vec3<f32>(d.x, d.y, 1.0));
        let skyboxUV = dir_to_skybox_uv(skyboxDir, dx, dy);
        let skyboxSize = vec2<i32>(textureDimensions(skyboxTex, 0));
          let skyboxCoord = vec2<i32>(
            i32(clamp(skyboxUV.x * f32(skyboxSize.x), 0.0, f32(skyboxSize.x - 1))),
            i32(clamp((1.0 - skyboxUV.y) * f32(skyboxSize.y), 0.0, f32(skyboxSize.y - 1)))
          );

        let skyboxColor = textureLoad(skyboxTex, skyboxCoord, 0).rgb * phong ;
        color = color / phong * skyboxColor * 1.0 ;
      } else {
        color = color / phong * 3.0 ;
      }
    }
    //return vec3<f32>(0.0,  len , 0.0);
    return clamp(color, vec3<f32>(0.0), vec3<f32>(1.0));
}


@fragment
fn fs_main(@location(0) fragCoord: vec2<f32>) -> @location(0) vec4<f32> {
  let uv = fragCoord;
  let texSize = vec2<i32>(textureDimensions(tex, 0));
  let center = vec2<f32>(0.5, 0.5);
  let blurStrength = parameters.bloomStrength; // Utilisé comme force du blur radial
  let blurSamples = 8; // Nombre d'échantillons pour le blur
  var color = vec3<f32>(0.0, 0.0, 0.0);
  var total = 0.0;
  let sampleCoord = vec2<i32>(
    i32(clamp(uv.x * f32(texSize.x), 0.0, f32(texSize.x - 1))),
    i32(clamp((1.0 - uv.y) * f32(texSize.y), 0.0, f32(texSize.y - 1)))
  );
  let data = textureLoad(tex, sampleCoord, 0);
  var nu = data.x;
  let d = data.y;
  if(parameters.activateZebra == 1.0 && floor(nu) % 2 == 0.0) {
    nu = -1.0;
  }
  if (nu <= 0.0) {
    return vec4<f32>(0.0, 0.0, 0.0, 1.0);
  } else {
    if(parameters.activateSmoothness == 0.0) {
      nu = floor(nu);
    }
    let v = nu / f32(256.0);
    let color = palette(v, data.y, vec2<f32>(data.z, data.w), uv.x, uv.y);
    return vec4<f32>(color, 1.0);
  }

//  // Blur radial : on échantillonne le long du rayon centre -> pixel
//  for (var i = 0; i < blurSamples; i = i + 1) {
//    let t = f32(i) / f32(blurSamples - 1);
//    // t = 0 (centre), t = 1 (pixel courant)
//    let sampleUV = mix(center, uv, t * blurStrength + (1.0 - blurStrength));
//    let sampleCoord = vec2<i32>(
//      i32(clamp(sampleUV.x * f32(texSize.x), 0.0, f32(texSize.x - 1))),
//      i32(clamp((1.0 - sampleUV.y) * f32(texSize.y), 0.0, f32(texSize.y - 1)))
//    );
//    let data = textureLoad(tex, sampleCoord, 0);
//    let nu = data.x;
//    let d = data.y;
//    let period = parameters.palettePeriod;
//    var sampleColor: vec3<f32>;
//    if (nu <= 0.0) {
//      sampleColor = vec3<f32>(0.0, 0.0, 0.0);
//    } else {
//      let v = fract(nu / period);
//      sampleColor = palette(v, data.y, vec2<f32>(data.z, data.w), sampleUV.x, sampleUV.y);
//    }
//    // Poids : plus proche du pixel courant = plus fort
//    let weight = 0.5 + 0.5 * t;
//    color = color + sampleColor * weight;
//    total = total + weight;
//  }
//  color = color / total;
//  return vec4<f32>(color, 1.0);

}