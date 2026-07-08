// Selective AA reseed (Stage B): stamp iter = -1 (a fresh-compute request) on the
// neutral texels whose distance-estimation target sample count exceeds the current
// sample index — the thin boundary "sliver" — leaving every other texel frozen.
//
// Phase D (analytic AA): before stamping, escaped texels whose Taylor margin
// |z′|/(|z″|·δ) passes the threshold are TAGGED analytic-OK instead (a +0.5
// fraction added to the AA target map; the integer part stays the sample-count
// target). Tagged texels are never re-iterated: the color pass expands their
// sample-0 payload ẑ(δᵢ) = z + z′δᵢ + ½z″δᵢ² per AA sample. The margin is
// evaluated ONCE, on the first reseed (pristine sample-0 payload), and the tag
// carries the decision for the whole accumulation — re-evaluating on later
// samples would race against margin-fail re-iterations (double-jitter).
//
// The in-place fused path then reconverges only the stamped texels with the new
// jitter, while frozen (escaped/interior/analytic) texels are skipped by its
// pass-through logic.
//
// Writes: raw layer 0 (iter) for stamped texels; the AA target map for tags.
// iter = -1 makes the in-place compute branch reinitialize z/dz/ref_i from
// scratch, so leaving the other layers stale is fine.

struct AaParams {
  antialiasLevel: f32,
  aaSampleIndex: f32,
  screenHeightPx: f32,  // unused here; shared buffer with the target bake pass
  aaLogDelta: f32,      // ln δ — sub-pixel jitter half-extent in c units
  aaAnalytic: f32,      // 1 = analytic AA enabled (auto mode, payload live)
  aspect: f32,          // unused here; shared buffer with the target bake pass
  sceneSin: f32,
  sceneCos: f32,
  screenWidthPx: f32,
  palettePeriod: f32,
  mu: f32,
  logMu: f32,
  aaContrast: f32,
  aaFull: f32,
  _pad1: f32,
  _pad2: f32,
};

struct FrontierStats {
  stamped: atomic<u32>,   // texels re-iterated this sample (the frontier)
  eligible: atomic<u32>,  // texels in the AA boundary band (target > sample idx)
};

// r32float read_write: the target map is read (gate + existing tag) and written
// (new tag) in the same dispatch — one storage binding, no sampled/storage
// subresource conflict.
@group(0) @binding(0) var aaTargetTex: texture_storage_2d<r32float, read_write>;
@group(0) @binding(1) var rawIterTex: texture_storage_2d<r32float, write>;
@group(0) @binding(2) var<uniform> params: AaParams;
// Raw layers 8..12 viewed as a 5-layer array (disjoint from the layer-0 storage
// view above): 0 = S, 1/2 = z′ mantissa, 3/4 = z″ mantissa.
@group(0) @binding(3) var payloadTex: texture_2d_array<f32>;
@group(0) @binding(4) var<storage, read_write> stats: FrontierStats;

const LN_MARGIN_THRESHOLD: f32 = 1.6094379; // ln 5

@compute @workgroup_size(16, 16)
fn cs_main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let dim = textureDimensions(aaTargetTex);
  if (gid.x >= dim.x || gid.y >= dim.y) {
    return;
  }
  let coord = vec2<i32>(i32(gid.x), i32(gid.y));
  let tgtRaw = textureLoad(aaTargetTex, coord).r;
  let tgt = floor(tgtRaw);
  // Active sliver: target > current sample index → recompute (fresh jittered).
  // Frozen texels are left untouched (no store preserves their value).
  if (tgt > params.aaSampleIndex) {
    atomicAdd(&stats.eligible, 1u);
    if (params.aaAnalytic > 0.5) {
      // Already tagged analytic-OK on an earlier reseed: stay frozen.
      if (fract(tgtRaw) > 0.25) {
        return;
      }
      // First reseed only: decide from the pristine sample-0 payload.
      if (params.aaSampleIndex < 1.5) {
        let s = textureLoad(payloadTex, coord, 0, 0).r;
        let m1 = vec2<f32>(textureLoad(payloadTex, coord, 1, 0).r,
                           textureLoad(payloadTex, coord, 2, 0).r);
        let m2 = vec2<f32>(textureLoad(payloadTex, coord, 3, 0).r,
                           textureLoad(payloadTex, coord, 4, 0).r);
        // Margin in log space: ln|z′| − ln|z″| − S − ln δ > ln 5.
        // m1 = 0 (no payload / saturated fold) fails → honest re-iteration;
        // m2 = 0 (genuinely negligible z″) passes.
        // Finite guard first: max() LAUNDERS NaN on Metal (max(NaN, x) = x),
        // which once turned a NaN z″ into an auto-passing margin. |x| < big is
        // false for both NaN and inf without relying on x != x semantics.
        let finiteOk = abs(s) < 1e6
          && abs(m1.x) < 1e30 && abs(m1.y) < 1e30
          && abs(m2.x) < 1e30 && abs(m2.y) < 1e30;
        let marginLog = log(max(length(m1), 1e-38)) - log(max(length(m2), 1e-38))
                      - s - params.aaLogDelta;
        if (finiteOk && length(m1) > 0.0 && marginLog > LN_MARGIN_THRESHOLD) {
          textureStore(aaTargetTex, coord, vec4<f32>(tgt + 0.5, 0.0, 0.0, 0.0));
          return;
        }
      }
    }
    atomicAdd(&stats.stamped, 1u);
    textureStore(rawIterTex, coord, vec4<f32>(-1.0, 0.0, 0.0, 0.0));
  }
}
