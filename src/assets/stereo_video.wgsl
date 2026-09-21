// Orthographic off-axis stereo over a bounded analytic height field.
// All lookups stay in the source rectangle through a common symmetric crop.
@group(0) @binding(0) var leftImage: texture_2d<f32>;
@group(0) @binding(1) var rightImage: texture_2d<f32>;
@group(0) @binding(2) var heightImage: texture_2d<f32>;
@group(0) @binding(3) var linearSampler: sampler;
struct StereoConfig { projection:vec4<f32>, packing:vec4<f32> }
@group(0) @binding(4) var<uniform> settings: StereoConfig; // packing.x: top/bottom
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4<f32> {
  let p=array<vec2<f32>,3>(vec2<f32>(-1,-1),vec2<f32>(3,-1),vec2<f32>(-1,3));
  return vec4<f32>(p[i],0,1);
}
fn surfaceHeight(uv:vec2<f32>)->f32 {
  let sample=textureSampleLevel(heightImage,linearSampler,uv,0);
  let h=select(0.5,sample.r/max(sample.a,1e-6),sample.a>0.0);
  return 2.0*h-1.0;
}
fn stereoColor(p:vec4<f32>)->vec4<f32> {
  let config=settings.projection;
  let vertical=settings.packing.x>0.5;
  let right=select(p.x>=config.x*0.5,p.y>=config.y*0.5,vertical);
  let uv=select(vec2<f32>(fract(p.x/(config.x*0.5)),p.y/config.y),
    vec2<f32>(p.x/config.x,fract(p.y/(config.y*0.5))),vertical);
  let imagePoint=(uv-0.5)*config.w+0.5;
  let shift=select(-config.z,config.z,right);
  var hit=imagePoint;
  if(abs(shift)>0.0){
    // Walk front to back; first crossing resolves self-occlusion. At most half
    // a source pixel horizontally per step, followed by a binary refinement.
    let steps=u32(clamp(ceil(4.0*abs(shift)*config.x),16.0,512.0));
    var front=1.0;
    var back=-1.0;
    for(var i=0u;i<=steps;i++){
      let z=1.0-2.0*f32(i)/f32(steps);
      let at=imagePoint+vec2<f32>(shift*z,0);
      if(z<=surfaceHeight(at)){back=z;break;}
      front=z;
    }
    for(var i=0u;i<7u;i++){
      let z=(front+back)*0.5;
      if(z<=surfaceHeight(imagePoint+vec2<f32>(shift*z,0))){back=z;}else{front=z;}
    }
    hit=imagePoint+vec2<f32>(shift*(front+back)*0.5,0);
  }
  var c=textureSampleLevel(leftImage,linearSampler,hit,0);
  if(right){c=textureSampleLevel(rightImage,linearSampler,hit,0);}
  let linear=max(c.rgb/max(c.a,1e-6),vec3<f32>(0));
  return vec4<f32>(linear,1);
}
@fragment fn fs_hdr(@builtin(position) p:vec4<f32>)->@location(0) vec4<f32> {
  return stereoColor(p);
}
@fragment fn fs(@builtin(position) p:vec4<f32>)->@location(0) vec4<f32> {
  let linear=stereoColor(p).rgb;
  let rgb=select(1.055*pow(linear,vec3<f32>(1.0/2.4))-0.055,12.92*linear,linear<=vec3<f32>(0.0031308));
  return vec4<f32>(rgb,1);
}
