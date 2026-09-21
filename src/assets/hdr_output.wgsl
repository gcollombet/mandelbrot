// Final HDR conversion. Output contains packed bytes ready for PNG or WebCodecs.
struct Params {
  width: u32, height: u32, first_row: u32, rows: u32,
  nits_per_unit: f32, origin_x: u32, origin_y: u32, pad: u32,
}
@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var<uniform> p: Params;
@group(0) @binding(2) var<storage, read_write> output: array<atomic<u32>>;
@group(0) @binding(3) var<storage, read_write> invalid: atomic<u32>;
fn finite(v: vec4<f32>) -> bool {
  return all((bitcast<vec4<u32>>(v) & vec4<u32>(0x7f800000u)) != vec4<u32>(0x7f800000u));
}
fn pq_at(x: u32, local_y: u32) -> vec3<f32> {
  let raw = textureLoad(source, vec2<i32>(i32(x), i32(local_y + p.first_row)), 0);
  if (!finite(raw)) { atomicOr(&invalid, 1u); return vec3<f32>(0); }
  let c = raw.rgb / max(raw.a, 1e-6);
  let rec = vec3<f32>(dot(c, vec3<f32>(0.6274039, 0.3292830, 0.0433131)),
    dot(c, vec3<f32>(0.0690973, 0.9195404, 0.0113623)),
    dot(c, vec3<f32>(0.0163914, 0.0880133, 0.8955953)));
  let nits = max(rec, vec3<f32>(0)) * p.nits_per_unit;
  if (!finite(vec4<f32>(nits, 1))) {
    atomicOr(&invalid, 1u); return vec3<f32>(0);
  }
  if (any(nits > vec3<f32>(10000))) { atomicOr(&invalid, 2u); }
  let a = pow(min(nits, vec3<f32>(10000)) / 10000.0, vec3<f32>(2610.0 / 16384.0));
  return pow((vec3<f32>(3424.0 / 4096.0) + (2413.0 / 128.0) * a) /
    (vec3<f32>(1) + (2392.0 / 128.0) * a), vec3<f32>(2523.0 / 32.0));
}
fn noise(x: u32, y: u32) -> f32 {
  return fract(52.9829189 * fract(f32(x + p.origin_x) * 0.06711056 +
    f32(y + p.first_row + p.origin_y) * 0.00583715)) - 0.5;
}
fn store16(index: u32, value: u32) {
  // Different invocations can share a word (chroma and odd-width PNG rows).
  atomicOr(&output[index / 2u], value << ((index % 2u) * 16u));
}
@compute @workgroup_size(8, 8)
fn png(@builtin(global_invocation_id) id: vec3<u32>) {
  if (id.x >= p.width || id.y >= p.rows) { return; }
  let rgb = pq_at(id.x, id.y);
  let q = vec3<u32>(clamp(floor(rgb * 65535.0 + noise(id.x, id.y) + 0.5), vec3<f32>(0), vec3<f32>(65535)));
  let index = (id.y * p.width + id.x) * 3u;
  for (var c = 0u; c < 3u; c++) {
    // PNG samples are big-endian, while storage-buffer words are little-endian.
    store16(index + c, ((q[c] & 255u) << 8u) | (q[c] >> 8u));
  }
}
fn quantize(v: f32, x: u32, y: u32, chroma: bool) -> u32 {
  let code = select(64.0 + 876.0 * v, 512.0 + 896.0 * v, chroma);
  return u32(clamp(floor(code + noise(x, y) + 0.5), 64.0, select(940.0, 960.0, chroma)));
}
@compute @workgroup_size(8, 8)
fn video(@builtin(global_invocation_id) id: vec3<u32>) {
  let x = id.x * 2u; let y = id.y * 2u;
  if (x >= p.width || y >= p.rows) { return; }
  var chroma = vec2<f32>(0);
  for (var dy = 0u; dy < 2u; dy++) {
    var pair = 0u;
    for (var dx = 0u; dx < 2u; dx++) {
      let rgb = pq_at(x + dx, y + dy);
      let luma = rgb.g + 0.2627 * (rgb.r - rgb.g) + 0.0593 * (rgb.b - rgb.g);
      pair |= quantize(luma, x + dx, y + dy, false) << (dx * 16u);
      chroma += vec2<f32>((rgb.b - luma) / (2.0 * (1.0 - 0.0593)), (rgb.r - luma) / (2.0 * (1.0 - 0.2627)));
    }
    atomicStore(&output[((y + dy) * p.width + x) / 2u], pair);
  }
  let n = p.width * p.rows;
  let c = id.y * (p.width / 2u) + id.x;
  store16(n + c, quantize(chroma.x / 4.0, x, y, true));
  store16(n + n / 4u + c, quantize(chroma.y / 4.0, x + 1u, y, true));
}
