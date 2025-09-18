// filepath: /Users/guillaumecollombet/RustroverProjects/untitled/src/assets/reproject.wgsl
// Shader de reprojection : reprojette l'ancienne image dans la nouvelle vue (translation / rotation / zoom).
// Si un pixel ne correspond à aucune coordonnée valide de l'ancienne image, on écrit la sentinelle (-1, -1, -1, 1).

struct ReprojectUniforms {
  prev_cx: f32,
  prev_cy: f32,
  prev_scale: f32,
  prev_angle: f32,
  curr_cx: f32,
  curr_cy: f32,
  curr_scale: f32,
  curr_angle: f32,
  aspect: f32,
  pad0: f32,
  pad1: f32,
  pad2: f32,
};

@group(0) @binding(0) var<uniform> uni: ReprojectUniforms;
@group(0) @binding(1) var prevTex: texture_2d<f32>;
@group(0) @binding(2) var prevSampler: sampler;

struct VSOut {
  @builtin(position) position: vec4<f32>,
  @location(0) fragCoord: vec2<f32>,
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
  o.fragCoord = (pos[vid] + vec2<f32>(1.0)) * 0.5; // [0,1]
  return o;
}

fn rotate(v: vec2<f32>, angle: f32) -> vec2<f32> {
  let s = sin(angle);
  let c = cos(angle);
  return vec2<f32>(
    c * v.x - s * v.y,
    s * v.x + c * v.y
  );
}

fn uv_to_xy(uv: vec2<f32>) -> vec2<f32> {
  // Conversion UV [0,1] -> NDC [-1,1] avec inversion de l'axe Y (wgpu/D3D/Metal)
  return vec2<f32>(
    uv.x * 2.0 - 1.0,
    (1.0 - uv.y) * 2.0 - 1.0,
  );
}

fn xy_to_uv(xy: vec2<f32>) -> vec2<f32> {
  // Conversion NDC [-1,1] -> UV [0,1] avec inversion de l'axe Y (wgpu/D3D/Metal)
  return vec2<f32>(
    (xy.x + 1.0) * 0.5,
    1.0 - ((xy.y + 1.0) * 0.5),
  );
}

@fragment
fn fs_main(@location(0) fragCoord: vec2<f32>) -> @location(0) vec4<f32> {
  let sentinelle = vec4<f32>(-1.0, -1.0, -1.0, 1.0);
  if (uni.curr_scale != uni.prev_scale) {
    return sentinelle;
  }
  // fragCoord in [0,1]
  // 1. Convertir en coordonnées normalisées [-1,1]
  let xy = uv_to_xy(fragCoord);
  // 2. Espace local courant
  let local = vec2<f32>(xy.x * uni.aspect * uni.curr_scale, xy.y * uni.curr_scale);
  // 3. Défaire la rotation courante
  let local_rot = rotate(local, uni.curr_angle);
  // 4. Aller dans l’espace monde
  let world = local_rot + vec2<f32>(uni.curr_cx, uni.curr_cy);
  // 5. Revenir dans l’espace local de l’ancienne vue
  let local_prev = world - vec2<f32>(uni.prev_cx, uni.prev_cy);
  // 6. Appliquer la rotation inverse de l’ancienne vue
  let local_prev_rot = rotate(local_prev, -uni.prev_angle);
  // 7. Retour coordonnées écran ancienne vue
  let nx_prev = local_prev_rot.x / (uni.aspect * uni.prev_scale);
  let ny_prev = local_prev_rot.y / (uni.prev_scale);
  let frag_prev = xy_to_uv(vec2<f32>(nx_prev, ny_prev));

  var col = textureSample(prevTex, prevSampler, frag_prev);
  let in_bounds = all(frag_prev >= vec2<f32>(0.0)) && all(frag_prev <= vec2<f32>(1.0));
  return select(sentinelle, col, in_bounds);
}
