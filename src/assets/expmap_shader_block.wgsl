// Appended to color.wgsl. Each pass contributes only taps owned by this block.
// Summing in linear light avoids seams and double counting at block boundaries.
struct ShaderMapParams {
  output: vec4<f32>,
  sampling: vec4<f32>,
  block: vec4<f32>,
  tile: vec4<f32>, // virtual octave, reverse, halo, center pass
  effects: vec4<f32>,
  integration: vec4<f32>,
  mirror: vec4<f32>,
  camera: vec4<f32>, // log scale, palette depth (base 10), reserved
}
@group(1) @binding(0) var<uniform> sp: ShaderMapParams;
@group(1) @binding(1) var<storage,read> displayWords: array<u32>;

fn shade_display_sample(index:u32, screen:vec2<f32>, r:f32, ratio:f32, neutral:vec2<f32>)->vec3<f32> {
  let b=index*12u;
  let iter=bitcast<f32>(displayWords[b]);
  let z=vec2<f32>(bitcast<f32>(displayWords[b+1u]),bitcast<f32>(displayWords[b+2u]));
  let g=vec4<f32>(unpack2x16float(displayWords[b+3u]),unpack2x16float(displayWords[b+4u]));
  let metadataWord=displayWords[b+5u];
  let og=vec4<f32>(unpack2x16float(displayWords[b+6u]),unpack2x16float(displayWords[b+7u]));
  let trap=vec4<f32>(bitcast<f32>(displayWords[b+8u]),bitcast<f32>(displayWords[b+9u]),bitcast<f32>(displayWords[b+10u]),bitcast<f32>(displayWords[b+11u]));
  var extras:PixelExtras;
  extras.gradient=clamp(g.xy*ratio,vec2<f32>(-64.0),vec2<f32>(64.0));
  extras.curvature=clamp(g.z*ratio*ratio,0.0,64.0);
  extras.height=clamp(g.w+log(sp.output.y/(2.0*r)),-64.0,64.0);
  extras.geometryAngle=select(0.0,atan2(extras.gradient.y,extras.gradient.x),dot(extras.gradient,extras.gradient)>1e-12);
  extras.stripePhase=decode_stripe_phase(metadataWord);
  extras.directionCoherence=decode_direction_coherence(metadataWord);
  extras.stripeGradient=clamp(og.xy*ratio,vec2<f32>(-64.0),vec2<f32>(64.0));
  extras.coherenceGradient=clamp(og.zw*ratio,vec2<f32>(-64.0),vec2<f32>(64.0));
  let c=colorize_pixel(vec2<i32>(0),vec2<i32>(sp.output.xy),iter,z.x,z.y,trap,extras,screen/sp.output.xy,neutral,false);
  return srgb_to_linear(c.rgb);
}

fn shader_map_contribution(screen:vec2<f32>, extent:f32)->vec4<f32> {
  let pixelStep=sp.output.z/sp.output.y;
  let delta=vec2<f32>(screen.x-sp.output.x*0.5,sp.output.y*0.5-screen.y)*pixelStep;
  let radius=length(delta);
  let central=radius<sp.output.w/exp2(sp.integration.w) && sp.integration.z<0.5;
  if(central) {
    if(sp.tile.w<0.5) {return vec4<f32>(0.0);}
    let r=max(radius/pixelStep,1e-6);
    let neutral=vec2<f32>(0.5)+r*vec2<f32>(cos(0.0),-sin(0.0))/(2.0*extent);
    return vec4<f32>(shade_display_sample(0u,screen,r,512.0/(2.828427124746*r),neutral),1.0);
  }
  if(sp.tile.w>0.5) {return vec4<f32>(0.0);}
  let depth=clamp(sp.sampling.x+log2(sp.output.w/max(radius,sp.output.w/exp2(sp.integration.w))),0.0,sp.integration.w+0.99999);
  var sourceDepth=depth;
  if(sp.mirror.x>0.5) {
    let q=clamp(log2(sp.output.w/max(radius,sp.output.w/exp2(sp.integration.w))),0.0,sp.integration.w);
    sourceDepth=clamp(sp.mirror.z+min(q,2.0*sp.mirror.y-q),0.0,sp.integration.w+0.99999);
  }
  if(floor(sourceDepth)!=sp.tile.x) {return vec4<f32>(0.0);}
  var theta=atan2(delta.y,delta.x)+sp.sampling.y+sp.effects.y+sp.effects.x*depth;
  if(sp.effects.z>=2.0) {
    let sector=6.28318530718/sp.effects.z;
    theta=sp.effects.w+abs(fract((theta-sp.effects.w)/sector)*sector-sector*0.5);
  }
  let row=select(fract(sourceDepth),1.0-fract(sourceDepth),sp.tile.y>0.5);
  let uv=vec2<f32>(fract(theta/6.28318530718)*sp.sampling.z,row*sp.sampling.w)+sp.tile.z;
  let base=floor(uv);let f=fract(uv);
  let r=max(radius/pixelStep,1e-6);
  let ratio=512.0/(2.828427124746*r);
  let neutral=vec2<f32>(0.5)+r*vec2<f32>(cos(theta),-sin(theta))/(2.0*extent);
  var result=vec4<f32>(0.0);
  for(var y=0u;y<2u;y++) {for(var x=0u;x<2u;x++) {
    let coord=base+vec2<f32>(f32(x),f32(y))-sp.block.xy;
    if(all(coord>=vec2<f32>(0.0))&&all(coord<sp.block.zw)) {
      let weight=select(1.0-f.x,f.x,x==1u)*select(1.0-f.y,f.y,y==1u);
      if(weight>0.0) {
        let index=u32(coord.y)*u32(sp.block.z)+u32(coord.x);
        result+=vec4<f32>(shade_display_sample(index,screen,r,ratio,neutral),1.0)*weight;
      }
    }
  }}
  return result;
}
@fragment fn fs_shader_block(@builtin(position) position:vec4<f32>)->@location(0) vec4<f32> {
  let pixelStep=sp.output.z/sp.output.y;
  let delta=(position.xy-sp.output.xy*0.5)*pixelStep;
  // Bound every AA tap's radius before entering the costly sampling loop.
  // Angular warps preserve radius. Fixed mirror uses a different radial map
  // and deliberately bypasses this shortcut.
  if(sp.tile.w<0.5 && sp.mirror.x<0.5) {
    let footprint=0.707107*pixelStep;
    let minimumRadius=sp.output.w/exp2(sp.integration.w);
    let nearRadius=max(length(delta)-footprint,minimumRadius);
    let farRadius=max(length(delta)+footprint,minimumRadius);
    let nearDepth=clamp(sp.sampling.x+log2(sp.output.w/nearRadius),0.0,sp.integration.w+0.99999);
    let farDepth=clamp(sp.sampling.x+log2(sp.output.w/farRadius),0.0,sp.integration.w+0.99999);
    if(sp.tile.x<floor(farDepth-0.0001) || sp.tile.x>floor(nearDepth+0.0001)) {
      return vec4<f32>(0.0);
    }
  }
  parameters=baseParameters;
  parameters.aspect=sp.output.x/sp.output.y;
  parameters.lnScale=sp.camera.x;
  parameters.orbitMetricsEnabled=1.0;
  parameters.reachDebug=0.0;
  parameters.aaAnalytic=0.0;
  apply_palette_path(sp.camera.y);
  let extent=length(sp.output.xy)*0.5;
  let shear=abs(sp.effects.x)/0.69314718056;
  let stretch=(sqrt(shear*shear+4.0)+shear)*0.5;
  let density=sp.integration.y*pixelStep*stretch/(length(delta)+0.70710678119*pixelStep);
  let side=u32(clamp(floor(density),1.0,sp.integration.x));
  var result=vec4<f32>(0.0);
  for(var y=0u;y<side;y++) {for(var x=0u;x<side;x++) {
    result+=shader_map_contribution(position.xy+(vec2<f32>(f32(x),f32(y))+0.5)/f32(side)-0.5,extent);
  }}
  return result/f32(side*side);
}
