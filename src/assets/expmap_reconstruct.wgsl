struct Params {
  output: vec4<f32>, // width, height, reference height, reference radius
  sampling: vec4<f32>, // fractional depth, angle, angular count, rows per doubling
  tileInfo: vec4<f32>, // tile width, tile height, halo, integer base modulo 14
  center: vec4<f32>, // encoded sRGB center
  integration: vec4<f32>, // maximum grid side, minimum samples per log-radius unit
  effects: vec4<f32>, // Droste radians/doubling, base phase, sectors (0=off), orientation
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
fn decodeSRGB(v:vec3<f32>)->vec3<f32> {
  return select(pow((v+0.055)/1.055,vec3<f32>(2.4)),v/12.92,v<=vec3<f32>(0.04045));
}
// Samples are linear RGB, including the baked center, before pixel integration.
fn sampleMap(delta:vec2<f32>)->vec3<f32> {
  let radius=length(delta);
  if(radius < p.output.w/4096.0) { return decodeSRGB(p.center.rgb); }
  let depth=clamp(p.sampling.x+log2(p.output.w/radius),0.0,12.999999);
  let octave=floor(depth);
  var theta=atan2(delta.y,delta.x)+p.sampling.y;
  theta+=p.effects.y+p.effects.x*depth;
  if(p.effects.z>=2.0) {
    let sector=6.28318530718/p.effects.z;
    let relative=(theta-p.effects.w)/sector;
    theta=p.effects.w+abs(fract(relative)*sector-sector*0.5);
  }
  let uv=(vec2<f32>(fract(theta/6.28318530718)*p.sampling.z,fract(depth)*p.sampling.w)+p.tileInfo.z+0.5)/p.tileInfo.xy;
  let slot=(i32(p.tileInfo.w)+i32(octave))%14;
  return textureSampleLevel(tiles,filtering,uv,slot,0.0).rgb;
}
@fragment fn fs(@builtin(position) position:vec4<f32>)->@location(0) vec4<f32> {
  let pixelStep=p.output.z/p.output.y;
  let delta=vec2<f32>(position.x-p.output.x*0.5,p.output.y*0.5-position.y)*pixelStep;
  // Use the least dense axis at the farthest radius in the pixel footprint.
  // This depends on screen position/resolution, never animation time or zoom.
  // Largest singular value of the log-polar shear; mirrored folding has unit slope.
  let shear=abs(p.effects.x)/0.69314718056;
  let stretch=(sqrt(shear*shear+4.0)+shear)*0.5;
  let density=p.integration.y*pixelStep*stretch/(length(delta)+0.70710678119*pixelStep);
  let side=u32(clamp(floor(density),1.0,p.integration.x));
  if(side==1u) { return vec4<f32>(encodeSRGB(sampleMap(delta)),1.0); }
  var rgb=vec3<f32>(0.0);
  for(var y=0u;y<side;y++) {
    for(var x=0u;x<side;x++) {
      // Fixed stratified midpoint grid and normalized box filter; no jitter.
      let offset=(vec2<f32>(f32(x),f32(y))+0.5)/f32(side)-0.5;
      rgb+=sampleMap(delta+offset*pixelStep);
    }
  }
  return vec4<f32>(encodeSRGB(rgb/f32(side*side)),1.0);
}
