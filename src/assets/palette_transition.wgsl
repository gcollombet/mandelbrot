@group(0) @binding(0) var palettes: texture_2d_array<f32>;
@group(0) @binding(1) var<uniform> progress: vec4<f32>;
struct Vertex { @builtin(position) position: vec4<f32> }
@vertex fn vs_main(@builtin(vertex_index) i: u32) -> Vertex {
  var p = array<vec2<f32>, 3>(vec2<f32>(-1,-1), vec2<f32>(3,-1), vec2<f32>(-1,3));
  return Vertex(vec4<f32>(p[i],0,1));
}
@fragment fn fs_main(v: Vertex) -> @location(0) vec4<f32> {
  let xy = vec2<i32>(v.position.xy);
  return mix(textureLoad(palettes, xy, 0, 0), textureLoad(palettes, xy, 1, 0), progress.x);
}
