// Merge a live and frozen typed display set into the frozen destination.
// The selected value, geometry, and metadata always travel together.

struct MergeUniforms {
  zoomFactor: f32,
  liveZoomFactor: f32,
  frozenShiftU: f32,
  frozenShiftV: f32,
  aspect: f32,
  angle: f32,
};

@group(0) @binding(0) var<uniform> uni: MergeUniforms;
@group(0) @binding(1) var liveValues: texture_2d_array<f32>;
@group(0) @binding(2) var liveGeometry: texture_2d<f32>;
@group(0) @binding(3) var liveMetadata: texture_2d<u32>;
@group(0) @binding(4) var frozenValues: texture_2d_array<f32>;
@group(0) @binding(5) var frozenGeometry: texture_2d<f32>;
@group(0) @binding(6) var frozenMetadata: texture_2d<u32>;

struct VSOut {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> VSOut {
  var pos = array<vec2<f32>, 6>(
    vec2<f32>(-1.0, -1.0), vec2<f32>(1.0, -1.0),
    vec2<f32>(-1.0, 1.0), vec2<f32>(-1.0, 1.0),
    vec2<f32>(1.0, -1.0), vec2<f32>(1.0, 1.0)
  );
  var out: VSOut;
  out.position = vec4<f32>(pos[vid], 0.0, 1.0);
  out.uv = (pos[vid] + vec2<f32>(1.0)) * 0.5;
  return out;
}

struct FragOut {
  @location(0) iter: f32,
  @location(1) zx: f32,
  @location(2) zy: f32,
  @location(3) geometry: vec4<f32>,
  @location(4) metadata: u32,
};

struct Candidate {
  valid: bool,
  iter: f32,
  zx: f32,
  zy: f32,
  geometry: vec4<f32>,
  metadata: u32,
  effectiveStep: f32,
};

fn rotate(point: vec2<f32>, angle: f32) -> vec2<f32> {
  let c = cos(angle);
  let s = sin(angle);
  return vec2<f32>(point.x * c - point.y * s, point.x * s + point.y * c);
}

fn is_inside_screen(uv: vec2<f32>, aspect: f32, neutralExtent: f32, angle: f32) -> bool {
  let local = rotate((uv - vec2<f32>(0.5)) * 2.0 * neutralExtent, -angle);
  return abs(local.x) <= aspect && abs(local.y) <= 1.0;
}

fn metadata_step(metadata: u32) -> f32 {
  return exp2(f32(metadata & 0xfu));
}

fn provenance_exponent(step: f32) -> u32 {
  if (!(step > 1.0)) { return 0u; }
  return u32(clamp(round(log2(step)), 0.0, 15.0));
}

fn metadata_with_step(metadata: u32, step: f32) -> u32 {
  return (metadata & 0xfffffff0u) | provenance_exponent(step);
}

fn normalize_geometry(geometry: vec4<f32>, zoomFactor: f32) -> vec4<f32> {
  let ratio = 1.0 / max(zoomFactor, 1e-30);
  return vec4<f32>(
    clamp(geometry.xy * ratio, vec2<f32>(-64.0), vec2<f32>(64.0)),
    clamp(geometry.z * ratio * ratio, 0.0, 64.0),
    clamp(geometry.w + log(ratio), -64.0, 64.0)
  );
}

fn empty_candidate() -> Candidate {
  var candidate: Candidate;
  candidate.valid = false;
  candidate.iter = -1.0;
  candidate.zx = 0.0;
  candidate.zy = 0.0;
  candidate.geometry = vec4<f32>(0.0);
  candidate.metadata = 0u;
  candidate.effectiveStep = 1e30;
  return candidate;
}

fn load_candidate(
  values: texture_2d_array<f32>,
  geometryTex: texture_2d<f32>,
  metadataTex: texture_2d<u32>,
  coord: vec2<i32>,
  zoomFactor: f32
) -> Candidate {
  var candidate = empty_candidate();
  let iter = textureLoad(values, coord, 0, 0).r;
  if (iter < 0.0) { return candidate; }
  let metadata = textureLoad(metadataTex, coord, 0).r;
  let effectiveStep = metadata_step(metadata) * max(zoomFactor, 1e-30);
  candidate.valid = true;
  candidate.iter = iter;
  candidate.zx = textureLoad(values, coord, 1, 0).r;
  candidate.zy = textureLoad(values, coord, 2, 0).r;
  candidate.geometry = normalize_geometry(textureLoad(geometryTex, coord, 0), zoomFactor);
  candidate.metadata = metadata_with_step(metadata, effectiveStep);
  candidate.effectiveStep = effectiveStep;
  return candidate;
}

fn emit(candidate: Candidate) -> FragOut {
  var out: FragOut;
  out.iter = candidate.iter;
  out.zx = candidate.zx;
  out.zy = candidate.zy;
  out.geometry = candidate.geometry;
  out.metadata = candidate.metadata;
  return out;
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> FragOut {
  let dims = vec2<i32>(textureDimensions(liveValues));
  let dimsF = vec2<f32>(dims);
  let neutralExtent = sqrt(uni.aspect * uni.aspect + 1.0);

  let liveUv = (uv - vec2<f32>(0.5)) / uni.liveZoomFactor + vec2<f32>(0.5);
  let liveInBounds = select(
    liveUv.x >= 0.0 && liveUv.x <= 1.0 && liveUv.y >= 0.0 && liveUv.y <= 1.0,
    is_inside_screen(liveUv, uni.aspect, neutralExtent, uni.angle),
    uni.liveZoomFactor < 1.0
  );
  var live = empty_candidate();
  if (liveInBounds) {
    let coord = vec2<i32>(
      i32(clamp(liveUv.x * dimsF.x, 0.0, dimsF.x - 1.0)),
      i32(clamp((1.0 - liveUv.y) * dimsF.y, 0.0, dimsF.y - 1.0))
    );
    live = load_candidate(liveValues, liveGeometry, liveMetadata, coord, uni.liveZoomFactor);
  }

  let frozenUv = (uv - vec2<f32>(0.5)) / uni.zoomFactor + vec2<f32>(0.5)
                 - vec2<f32>(uni.frozenShiftU, uni.frozenShiftV);
  let frozenInBounds = select(
    frozenUv.x >= 0.0 && frozenUv.x <= 1.0 && frozenUv.y >= 0.0 && frozenUv.y <= 1.0,
    is_inside_screen(frozenUv, uni.aspect, neutralExtent, uni.angle),
    uni.zoomFactor < 1.0
  );
  var frozen = empty_candidate();
  if (frozenInBounds) {
    let coord = vec2<i32>(
      i32(clamp(frozenUv.x * dimsF.x, 0.0, dimsF.x - 1.0)),
      i32(clamp((1.0 - frozenUv.y) * dimsF.y, 0.0, dimsF.y - 1.0))
    );
    frozen = load_candidate(frozenValues, frozenGeometry, frozenMetadata, coord, uni.zoomFactor);
  }

  if (live.valid && (!frozen.valid || live.effectiveStep <= frozen.effectiveStep)) {
    return emit(live);
  }
  if (frozen.valid) { return emit(frozen); }
  return emit(empty_candidate());
}
