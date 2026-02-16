// Motion blur shader
// Applique un flou directionnel basé sur la vitesse de zoom, rotation et translation

struct Uniforms {
  aspect: f32,
  angle: f32,
  prevAngle: f32,
  prevScale: f32,
  currScale: f32,
  blurStrength: f32,      // Intensité globale du motion blur [0..1]
  velocityX: f32,         // Vélocité de translation en X (pixels/frame normalisés)
  velocityY: f32,         // Vélocité de translation en Y (pixels/frame normalisés)
  samples: f32,           // Nombre d'échantillons pour le blur
  pad0: f32,
  pad1: f32,
  pad2: f32,
};

@group(0) @binding(0) var<uniform> params: Uniforms;
@group(0) @binding(1) var inputTex: texture_2d<f32>;

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

fn rotate(v: vec2<f32>, angle: f32) -> vec2<f32> {
  let s = sin(angle);
  let c = cos(angle);
  return vec2<f32>(c * v.x - s * v.y, s * v.x + c * v.y);
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let dims = vec2<f32>(textureDimensions(inputTex, 0));
  
  // Convertir UV en coordonnées écran centrées [-aspect..aspect, -1..1]
  let screenXY = vec2<f32>(
    (uv.x * 2.0 - 1.0) * params.aspect,
    (uv.y * 2.0 - 1.0)
  );

  // Convertir en coordonnées fractale/neutral (appliquer la rotation actuelle)
  let fractalXY = screenXY;

  // Calculer la vélocité combinée (dans l'espace fractale/neutral)
  var velocityVector = vec2<f32>(0.0, 0.0);
  
  // 1. Vélocité de translation (fournie en espace neutral/plan complexe)
  velocityVector += vec2<f32>(params.velocityX, params.velocityY);
  
  // 2. Vélocité de rotation (tangentielle au centre, dans l'espace fractale)
  let angleDelta = params.angle - params.prevAngle;
  if (abs(angleDelta) > 0.001) {
    // Vecteur perpendiculaire à la position fractale = direction tangentielle
    let tangent = vec2<f32>(-fractalXY.y, fractalXY.x);
    let distance = length(fractalXY);
    velocityVector += tangent * angleDelta * distance * 0.5;
  }
  
  // 3. Vélocité de zoom (radiale depuis le centre, dans l'espace fractale)
  let scaleDelta = params.currScale - params.prevScale;
  if (abs(scaleDelta) > 0.0001) {
    // Normaliser le changement d'échelle
    let scaleRatio = params.currScale / max(params.prevScale, 0.000001);
    let zoomFactor = log2(scaleRatio);
    velocityVector += fractalXY * zoomFactor * 0.3;
  }
  
  // Reconvertir la vélocité en espace écran (rotation inverse)
  velocityVector = rotate(velocityVector, -params.angle);
  
  // Calculer la magnitude totale de la vélocité
  let velocityMagnitude = length(velocityVector);
  
  // Si la vélocité est négligeable, pas de blur
  if (velocityMagnitude < 0.001 || params.blurStrength < 0.001) {
    let coord = vec2<i32>(
      i32(clamp(uv.x * dims.x, 0.0, dims.x - 1.0)),
      i32(clamp((1.0 - uv.y) * dims.y, 0.0, dims.y - 1.0))
    );
    return textureLoad(inputTex, coord, 0);
  }
  
  // Normaliser la direction et adapter la magnitude
  let blurDirection = velocityVector / velocityMagnitude;
  let blurLength = velocityMagnitude * params.blurStrength * 40.0 ;
  
  // Nombre d'échantillons adaptatif basé sur la vélocité
  let numSamples = max(1.0, min(params.samples, blurLength * 32.0));
  let samplesInt = i32(numSamples);
  
  // Accumuler les échantillons le long du vecteur de vélocité
  var colorSum = vec4<f32>(0.0);
  var weightSum = 0.0;
  
  for (var i = 0; i < 32; i++) {
    let t = (f32(i) / max(f32(samplesInt - 1), 1.0) - 0.5);
    let offset = blurDirection * blurLength * t;
    
    // Convertir l'offset en UV space
    let offsetUV = vec2<f32>(
      offset.x / params.aspect * 0.5,
      offset.y * 0.5
    );
    
    let sampleUV = uv + offsetUV;
    
    // Vérifier que l'échantillon est dans les limites
    if (sampleUV.x >= 0.0 && sampleUV.x <= 1.0 && sampleUV.y >= 0.0 && sampleUV.y <= 1.0) {
      let coord = vec2<i32>(
        i32(clamp(sampleUV.x * dims.x, 0.0, dims.x - 1.0)),
        i32(clamp((1.0 - sampleUV.y) * dims.y, 0.0, dims.y - 1.0))
      );
      
      // Poids gaussien centré
      let weight = exp(-2.0 * t * t);
      let sample = textureLoad(inputTex, coord, 0);
      
      colorSum += sample * weight;
      weightSum += weight;
    }
  }
  
  if (weightSum > 0.0) {
    return colorSum / weightSum;
  } else {
    let coord = vec2<i32>(
      i32(clamp(uv.x * dims.x, 0.0, dims.x - 1.0)),
      i32(clamp((1.0 - uv.y) * dims.y, 0.0, dims.y - 1.0))
    );
    return textureLoad(inputTex, coord, 0);
  }
}
