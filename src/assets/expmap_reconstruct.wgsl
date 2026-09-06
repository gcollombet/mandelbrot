struct Params {
  output: vec4<f32>, // width, height, reference height, reference radius
  sampling: vec4<f32>, // fractional depth, angle, angular count, rows per doubling
  tileInfo: vec4<f32>, // tile width, tile height, halo, integer base modulo 14
  center: vec4<f32>, // encoded sRGB center
}
@group(0) @binding(0) var<uniform> p: Params;
@group(0) @binding(1) var tiles: texture_2d_array<f32>;
@group(0) @binding(2) var filtering: sampler;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4<f32> {
  let xy=array<vec2<f32>,3>(vec2<f32>(-1.0,-1.0),vec2<f32>(3.0,-1.0),vec2<f32>(-1.0,3.0));
  return vec4<f32>(xy[i],0.0,1.0);
}
fn encodeSRGB(v:vec3<f32>)->vec3<f32> {
  return select(1.055*pow(max(v,vec3<f32>(0.0)),vec3<f32>(1.0/2.4))-0.055,12.92*v,v<=vec3<f32>(0.0031308));
}
@fragment fn fs(@builtin(position) position:vec4<f32>)->@location(0) vec4<f32> {
  let delta=vec2<f32>(position.x-p.output.x*0.5,p.output.y*0.5-position.y)*p.output.z/p.output.y;
  let radius=length(delta);
  if(radius < p.output.w/4096.0) { return vec4<f32>(p.center.rgb,1.0); }
  let depth=clamp(p.sampling.x+log2(p.output.w/radius),0.0,12.999999);
  let octave=floor(depth);
  let theta=atan2(delta.y,delta.x)+p.sampling.y;
  let uv=(vec2<f32>(fract(theta/6.28318530718)*p.sampling.z,fract(depth)*p.sampling.w)+p.tileInfo.z+0.5)/p.tileInfo.xy;
  let slot=(i32(p.tileInfo.w)+i32(octave))%14;
  let rgb=textureSampleLevel(tiles,filtering,uv,slot,0.0).rgb;
  return vec4<f32>(encodeSRGB(rgb),1.0);
}
