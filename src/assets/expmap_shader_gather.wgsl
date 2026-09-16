// Direct page lookup; absent pages contribute in a different bounded pass.
@group(1) @binding(1) var<storage,read> gatherPages:array<vec4<u32>>;

fn gather_map_contribution(screen:vec2<f32>, extent:f32)->vec4<f32> {
  let pixelStep=sp.output.z/sp.output.y;
  let delta=vec2<f32>(screen.x-sp.output.x*0.5,sp.output.y*0.5-screen.y)*pixelStep;
  let radius=length(delta);
  let central=radius<sp.output.w/exp2(sp.integration.w) && sp.integration.z<0.5;
  if(central) {
    let page=gatherPages[0];
    if(page.x==0u) {return vec4<f32>(0.0);}
    displayBank=page.x-1u;
    let r=max(radius/pixelStep,1e-6);
    let neutral=vec2<f32>(0.5)+r*vec2<f32>(cos(0.0),-sin(0.0))/(2.0*extent);
    return vec4<f32>(shade_display_sample(page.y,screen,r,512.0/(2.828427124746*r),neutral),1.0);
  }
  let depth=clamp(sp.sampling.x+log2(sp.output.w/max(radius,sp.output.w/exp2(sp.integration.w))),0.0,sp.integration.w+0.99999);
  var sourceDepth=depth;
  if(sp.mirror.x>0.5) {
    let q=clamp(log2(sp.output.w/max(radius,sp.output.w/exp2(sp.integration.w))),0.0,sp.integration.w);
    sourceDepth=clamp(sp.mirror.z+min(q,2.0*sp.mirror.y-q),0.0,sp.integration.w+0.99999);
  }
  let virtualOctave=u32(floor(sourceDepth));
  if(virtualOctave>=u32(sp.block.w)) {return vec4<f32>(0.0);}
  let reverse=gatherPages[1u+u32(sp.block.w)*u32(sp.block.z)+virtualOctave].x>0u;
  var theta=atan2(delta.y,delta.x)+sp.sampling.y+sp.effects.y+sp.effects.x*depth;
  if(sp.effects.z>=2.0) {
    let sector=6.28318530718/sp.effects.z;
    theta=sp.effects.w+abs(fract((theta-sp.effects.w)/sector)*sector-sector*0.5);
  }
  let row=select(fract(sourceDepth),1.0-fract(sourceDepth),reverse);
  let uv=vec2<f32>(fract(theta/6.28318530718)*sp.sampling.z,row*sp.sampling.w)+sp.tile.z;
  let base=floor(uv);let f=fract(uv);
  let r=max(radius/pixelStep,1e-6);
  let ratio=512.0/(2.828427124746*r);
  let neutral=vec2<f32>(0.5)+r*vec2<f32>(cos(theta),-sin(theta))/(2.0*extent);
  var result=vec4<f32>(0.0);
  for(var y=0u;y<2u;y++) {for(var x=0u;x<2u;x++) {
    let coord=vec2<u32>(base)+vec2<u32>(x,y);
    if(coord.x>=u32(sp.sampling.z+2.0*sp.tile.z)||coord.y>=u32(sp.sampling.w+1.0+2.0*sp.tile.z)){continue;}
    let blockXY=coord/u32(sp.block.x);
    let local=blockXY.y*u32(sp.block.y)+blockXY.x;
    if(local>=u32(sp.block.z)) {continue;}
    let page=gatherPages[1u+virtualOctave*u32(sp.block.z)+local];
    if(page.x==0u) {continue;}
    let inBlock=coord-blockXY*u32(sp.block.x);
    if(inBlock.x>=page.z||inBlock.y>=page.w) {continue;}
    let weight=select(1.0-f.x,f.x,x==1u)*select(1.0-f.y,f.y,y==1u);
    if(weight>0.0) {
      displayBank=page.x-1u;
      let index=page.y+inBlock.y*page.z+inBlock.x;
      result+=vec4<f32>(shade_display_sample(index,screen,r,ratio,neutral),1.0)*weight;
    }
  }}
  return result;
}
@fragment fn fs_shader_gather(@builtin(position) position:vec4<f32>)->@location(0) vec4<f32> {
  let pixelStep=sp.output.z/sp.output.y;
  let delta=(position.xy-sp.output.xy*0.5)*pixelStep;
  parameters=baseParameters;
  parameters.aspect=sp.output.x/sp.output.y;
  parameters.lnScale=sp.camera.x;
  parameters.orbitMetricsEnabled=1.0;
  parameters.reachDebug=0.0;
  parameters.aaAnalytic=0.0;
  apply_palette_path(sp.camera.y-palettePath.extra.z);
  let extent=length(sp.output.xy)*0.5;
  let shear=abs(sp.effects.x)/0.69314718056;
  let stretch=(sqrt(shear*shear+4.0)+shear)*0.5;
  let density=sp.integration.y*pixelStep*stretch/(length(delta)+0.70710678119*pixelStep);
  let side=u32(clamp(floor(density),1.0,sp.integration.x));
  var result=vec4<f32>(0.0);
  for(var y=0u;y<side;y++) {for(var x=0u;x<side;x++) {
    result+=gather_map_contribution(position.xy+(vec2<f32>(f32(x),f32(y))+0.5)/f32(side)-0.5,extent);
  }}
  return result/f32(side*side);
}
