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

fn shade_display_sample(index:u32, screen:vec2<f32>, r:f32, ratio:f32, neutral:vec2<f32>)->vec3<f32> {
  let words=read_display_sample(index);
  let iter=bitcast<f32>(words[0].x);
  let z=vec2<f32>(bitcast<f32>(words[0].y),bitcast<f32>(words[0].z));
  let g=vec4<f32>(unpack2x16float(words[0].w),unpack2x16float(words[1].x));
  let metadataWord=words[1].y;
  let og=vec4<f32>(unpack2x16float(words[1].z),unpack2x16float(words[1].w));
  let trap=vec4<f32>(bitcast<f32>(words[2].x),bitcast<f32>(words[2].y),bitcast<f32>(words[2].z),bitcast<f32>(words[2].w));
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

