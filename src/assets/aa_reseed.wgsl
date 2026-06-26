// Selective AA reseed (Stage B): stamp iter = -1 (a fresh-compute request) on the
// neutral texels whose distance-estimation target sample count exceeds the current
// sample index — the thin boundary "sliver" — leaving every other texel frozen.
//
// The in-place fused path then reconverges only these texels with the new jitter,
// while frozen (escaped/interior) texels are skipped by its pass-through logic.
// This is what turns adaptive AA from "correct but full-cost" into the ~boundary-
// only cost win.
//
// Writes layer 0 (iter) only. iter = -1 makes the in-place compute branch
// reinitialize z/dz/ref_i from scratch, so leaving the other layers stale is fine.

struct AaParams {
  antialiasLevel: f32,
  aaSampleIndex: f32,
  _pad0: f32,
  _pad1: f32,
};

@group(0) @binding(0) var aaTargetTex: texture_2d<f32>;
@group(0) @binding(1) var rawTex: texture_storage_2d_array<r32float, write>;
@group(0) @binding(2) var<uniform> params: AaParams;

@compute @workgroup_size(16, 16)
fn cs_main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dim = textureDimensions(aaTargetTex);
  if (gid.x >= dim.x || gid.y >= dim.y) {
    return;
  }
  let coord = vec2<i32>(i32(gid.x), i32(gid.y));
  let tgt = textureLoad(aaTargetTex, coord, 0).r;
  // Active sliver: target > current sample index → recompute (fresh jittered).
  // Frozen texels are left untouched (no store preserves their value).
  if (tgt > params.aaSampleIndex) {
    textureStore(rawTex, coord, 0, vec4<f32>(-1.0, 0.0, 0.0, 0.0));
  }
}
