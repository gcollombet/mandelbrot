import type { RingRect } from './displayRings'

export const ringVideoShader=`
@group(0) @binding(0) var color:texture_2d<f32>;
@group(0) @binding(1) var<uniform> region:vec4<f32>;
@group(0) @binding(2) var mask:texture_2d<f32>;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4<f32>{
let xy=array<vec2<f32>,3>(vec2<f32>(-1,-1),vec2<f32>(3,-1),vec2<f32>(-1,3));return vec4<f32>(xy[i],0,1);}
struct Captured { @location(0) color:vec4<f32>, @location(1) mask:f32 }
@fragment fn capture(@builtin(position) p:vec4<f32>)->Captured {
  let c=textureLoad(color,vec2<i32>(p.xy+region.xy),0);
  let v=max(c.rgb/max(c.a,1e-6),vec3<f32>(0));
  let rgb=select(1.055*pow(v,vec3<f32>(1.0/2.4))-0.055,12.92*v,v<=vec3<f32>(0.0031308));
  var result:Captured;result.color=vec4<f32>(rgb,1);result.mask=c.a;return result;
}
@fragment fn restore(@builtin(position) p:vec4<f32>)->@location(0) vec4<f32>{
  let rgb=textureLoad(color,vec2<i32>(p.xy),0).rgb;
  let a=textureLoad(mask,vec2<i32>(p.xy),0).r;
  let linear=select(pow((rgb+0.055)/1.055,vec3<f32>(2.4)),rgb/12.92,rgb<=vec3<f32>(0.04045));
  return vec4<f32>(linear*a,a);
}`

/** Only the small lossless coverage plane reaches the CPU; color stays on GPU. */
export class RingVideoGpu {
  private device:GPUDevice
  private capturePipeline:GPURenderPipeline
  private restorePipeline:GPURenderPipeline
  private uniform:GPUBuffer
  private canvas=new OffscreenCanvas(2,2)
  private context:GPUCanvasContext
  constructor(device:GPUDevice) {
    this.device=device
    const module=device.createShaderModule({code:ringVideoShader})
    this.capturePipeline=device.createRenderPipeline({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'capture',targets:[{format:'rgba8unorm'},{format:'r16float'}]}})
    this.restorePipeline=device.createRenderPipeline({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'restore',targets:[{format:'rgba16float'}]}})
    this.uniform=device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})
    this.context=this.canvas.getContext('webgpu')!
    this.context.configure({device,format:'rgba8unorm',alphaMode:'opaque',colorSpace:'srgb'})
  }
  async capture(source:GPUTexture,rect:RingRect,signal?:AbortSignal) {
    const d=this.device,[, ,width,height]=rect,pitch=Math.ceil(width*2/256)*256
    if(this.canvas.width!==width||this.canvas.height!==height){this.canvas.width=width;this.canvas.height=height}
    const mask=d.createTexture({size:[width,height],format:'r16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC})
    const buffer=d.createBuffer({size:pitch*height,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ})
    try {
      d.queue.writeBuffer(this.uniform,0,new Float32Array(rect))
      const command=d.createCommandEncoder(),pass=command.beginRenderPass({colorAttachments:[
        {view:this.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'},
        {view:mask.createView(),loadOp:'clear',storeOp:'store'},
      ]})
      pass.setPipeline(this.capturePipeline)
      pass.setBindGroup(0,d.createBindGroup({layout:this.capturePipeline.getBindGroupLayout(0),entries:[
        {binding:0,resource:source.createView()},{binding:1,resource:{buffer:this.uniform}},
      ]}));pass.draw(3);pass.end()
      command.copyTextureToBuffer({texture:mask},{buffer,bytesPerRow:pitch},[width,height])
      d.queue.submit([command.finish()]);await buffer.mapAsync(GPUMapMode.READ);signal?.throwIfAborted()
      const mapped=new Uint8Array(buffer.getMappedRange()),alpha=new Uint8Array(width*height*2)
      for(let row=0;row<height;row++)alpha.set(mapped.subarray(row*pitch,row*pitch+width*2),row*width*2)
      return {canvas:this.canvas,alpha}
    }finally{buffer.unmap();buffer.destroy();mask.destroy()}
  }
  async restore(frame:VideoFrame,alpha:Uint8Array<ArrayBuffer>,rect:RingRect) {
    const d=this.device,width=rect[2],height=rect[3]
    if(frame.displayWidth!==width||frame.displayHeight!==height||alpha.length!==width*height*2)throw new Error('Dimensions de couronne vidéo incompatibles')
    const color=d.createTexture({size:[width,height],format:'rgba8unorm',usage:GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING})
    const mask=d.createTexture({size:[width,height],format:'r16float',usage:GPUTextureUsage.COPY_DST|GPUTextureUsage.TEXTURE_BINDING})
    const texture=d.createTexture({size:[width,height],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING})
    try {
      d.queue.copyExternalImageToTexture({source:frame},{texture:color,colorSpace:'srgb'},[width,height])
      d.queue.writeTexture({texture:mask},alpha,{bytesPerRow:width*2},[width,height])
      const command=d.createCommandEncoder(),pass=command.beginRenderPass({colorAttachments:[{view:texture.createView(),loadOp:'clear',storeOp:'store'}]})
      pass.setPipeline(this.restorePipeline)
      pass.setBindGroup(0,d.createBindGroup({layout:this.restorePipeline.getBindGroupLayout(0),entries:[{binding:0,resource:color.createView()},{binding:2,resource:mask.createView()}]}))
      pass.draw(3);pass.end();d.queue.submit([command.finish()]);await d.queue.onSubmittedWorkDone()
      return {rect,texture}
    }catch(error){texture.destroy();throw error}finally{color.destroy();mask.destroy()}
  }
  dispose(){this.uniform.destroy();this.context.unconfigure();this.canvas.width=2;this.canvas.height=2}
}
