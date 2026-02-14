// Resolve pass: replaces remaining sentinels with a snapped parent pixel.
//
// Sentinel convention:
//   If raw.x == -step (step is power-of-two), it will be resolved by sampling
//   the parent at (x & ~(step-1), y & ~(step-1)).

@group(0) @binding(0) var rawTex: texture_2d<f32>;

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

fn floor_power_of_two(step: u32) -> u32 {
  // Returns the greatest power-of-two <= step.
  if (step == 0u) {
    return 1u;
  }
  let msb_index = 31u - countLeadingZeros(step);
  return 1u << msb_index;
}

@fragment
fn fs_main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
  let dims = vec2<u32>(textureDimensions(rawTex, 0));
  let x = u32(clamp(uv.x * f32(dims.x), 0.0, f32(dims.x - 1u)));
  let y = u32(clamp((1.0 - uv.y) * f32(dims.y), 0.0, f32(dims.y - 1u)));
  let coord = vec2<i32>(i32(x), i32(y));

  let v = textureLoad(rawTex, coord, 0);
  if (v.x >= 0.0) {
    return v;
  }

  // -1 should not remain, but if it does: keep it as a sentinel.
  let step_f = -v.x;
  if (step_f <= 1.0) {
    return v;
  }

  let step_u = floor_power_of_two(u32(step_f));
  let mask = ~(step_u - 1u);
  let px = x & mask;
  let py = y & mask;

  let parent = textureLoad(rawTex, vec2<i32>(i32(px), i32(py)), 0);
  return parent;
}
