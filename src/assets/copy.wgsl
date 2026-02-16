// Simple copy shader for format conversion
@group(0) @binding(0) var inputTex: texture_2d<f32>;

@vertex
fn vs_main(@builtin(vertex_index) vid: u32) -> @builtin(position) vec4<f32> {
  let x = f32((vid & 1u) << 1u);
  let y = f32((vid & 2u));
  return vec4<f32>(x * 2.0 - 1.0, y * 2.0 - 1.0, 0.0, 1.0);
}

@fragment
fn fs_main(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  return textureLoad(inputTex, vec2<i32>(pos.xy), 0);
}
