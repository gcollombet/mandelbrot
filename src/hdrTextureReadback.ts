const hdrPipelines=new WeakMap<GPUDevice,Promise<GPURenderPipeline>>()
/** Resolve additive linear RGBA to unassociated float16 RGB before CPU encoding.
 * No canvas/8-bit conversion is involved, so highlights above 1 survive. */
export async function readLinearHdrTexture(device:GPUDevice,source:GPUTexture,width:number,height:number,signal?:AbortSignal):Promise<Uint16Array> {
  const pitch=Math.ceil(width*8/256)*256
  const output=device.createTexture({size:[width,height],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC})
  const buffer=device.createBuffer({size:pitch*height,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ})
  try {
    let pending=hdrPipelines.get(device)
    if(!pending){
    const module=device.createShaderModule({code:`
@group(0) @binding(0) var source:texture_2d<f32>;
@vertex fn vs(@builtin(vertex_index) i:u32)->@builtin(position) vec4<f32>{
  let xy=array<vec2<f32>,3>(vec2<f32>(-1,-1),vec2<f32>(3,-1),vec2<f32>(-1,3));return vec4<f32>(xy[i],0,1);}
@fragment fn fs(@builtin(position) p:vec4<f32>)->@location(0) vec4<f32>{
  let c=textureLoad(source,vec2<i32>(p.xy),0);return vec4<f32>(max(c.rgb/max(c.a,1e-6),vec3<f32>(0)),1);}`})
    pending=device.createRenderPipelineAsync({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:'fs',targets:[{format:'rgba16float'}]}})
    hdrPipelines.set(device,pending)
    void pending.catch(()=>hdrPipelines.delete(device))
    }
    const pipeline=await pending
    signal?.throwIfAborted()
    const encoder=device.createCommandEncoder(),pass=encoder.beginRenderPass({colorAttachments:[{view:output.createView(),loadOp:'clear',storeOp:'store'}]})
    pass.setPipeline(pipeline);pass.setBindGroup(0,device.createBindGroup({layout:pipeline.getBindGroupLayout(0),entries:[{binding:0,resource:source.createView()}]}));pass.draw(3);pass.end()
    encoder.copyTextureToBuffer({texture:output},{buffer,bytesPerRow:pitch},[width,height])
    device.queue.submit([encoder.finish()]);await buffer.mapAsync(GPUMapMode.READ);signal?.throwIfAborted()
    const mapped=new Uint16Array(buffer.getMappedRange()),result=new Uint16Array(width*height*4)
    for(let y=0;y<height;y++)result.set(mapped.subarray(y*pitch/2,y*pitch/2+width*4),y*width*4)
    return result
  } finally {buffer.unmap();buffer.destroy();output.destroy()}
}
