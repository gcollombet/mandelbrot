// Common display decoding and color adaptation are in expmap_shader_common.wgsl.
@group(1) @binding(1) var<storage,read> displayWords:array<u32>;
fn read_display_word(index:u32)->u32 {return displayWords[index];}

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
  if(sp.camera.z>0.5){
    // Exclusive ownership after rounding, including at a block seam.
    let coord=floor(uv+0.5)-sp.block.xy;
    if(any(coord<vec2<f32>(0.0))||any(coord>=sp.block.zw)){return vec4<f32>(0.0);}
    return vec4<f32>(shade_display_sample(u32(coord.y)*u32(sp.block.z)+u32(coord.x),screen,r,ratio,neutral),1.0);
  }
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
    result+=shader_map_contribution(shader_aa_position(position.xy,x,y,side),extent);
  }}
  return result/f32(side*side);
}

fn read_display_sample(index:u32)->array<vec4<u32>,3> {
  let b=index*12u;
  return array<vec4<u32>,3>(
    vec4<u32>(read_display_word(b),read_display_word(b+1u),read_display_word(b+2u),read_display_word(b+3u)),
    vec4<u32>(read_display_word(b+4u),read_display_word(b+5u),read_display_word(b+6u),read_display_word(b+7u)),
    vec4<u32>(read_display_word(b+8u),read_display_word(b+9u),read_display_word(b+10u),read_display_word(b+11u)));
}
