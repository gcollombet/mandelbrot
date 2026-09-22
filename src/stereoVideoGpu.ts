import shader from './assets/stereo_video.wgsl?raw'
import { t } from './i18n'
import { stereoProjection, validateStereoDimensions, type StereoVideoLayout, type StereoColorPass } from './stereoVideo'

/** Three deterministic source passes, then height-field projection for both eyes.
 * Color is shaded per eye BEFORE projection, never copied from the other eye. */
export class StereoVideoGpu {
  readonly canvas: OffscreenCanvas
  private context: GPUCanvasContext
  private pipeline: GPURenderPipeline
  private textures: GPUTexture[] = []
  private uniform: GPUBuffer
  private binding: GPUBindGroup
  private device: GPUDevice
  readonly hdr: boolean
  readonly outputTexture?: GPUTexture
  readonly width: number
  readonly height: number
  constructor(device: GPUDevice, width: number, height: number, hdr=false) {
    this.device=device;this.width=width;this.height=height;this.hdr=hdr
    if (Math.max(width,height)>device.limits.maxTextureDimension2D) throw new Error(t('video.stereo.gpuDimensions'))
    this.canvas=new OffscreenCanvas(width,height)
    this.context=this.canvas.getContext('webgpu')!
    if(!this.context)throw new Error(t('video.stereo.webGpuRequired'))
    this.context.configure({device,format:'rgba8unorm',alphaMode:'opaque',colorSpace:'srgb'})
    if(hdr)this.outputTexture=device.createTexture({size:[width,height],format:'rgba16float',usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC})
    const module=device.createShaderModule({code:shader})
    this.pipeline=device.createRenderPipeline({layout:'auto',vertex:{module,entryPoint:'vs'},fragment:{module,entryPoint:hdr?'fs_hdr':'fs',targets:[{format:hdr?'rgba16float':'rgba8unorm'}]}})
    for(let i=0;i<3;i++)this.textures.push(device.createTexture({size:[width,height],format:'rgba16float',usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_DST|GPUTextureUsage.RENDER_ATTACHMENT}))
    this.uniform=device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})
    this.binding=device.createBindGroup({layout:this.pipeline.getBindGroupLayout(0),entries:[
      ...this.textures.map((t,binding)=>({binding,resource:t.createView()})),
      {binding:3,resource:device.createSampler({minFilter:'linear',magFilter:'linear'})},
      {binding:4,resource:{buffer:this.uniform}},
    ]})
  }
  async render(strength:number, renderSource:(pass:StereoColorPass)=>Promise<GPUTexture>, signal?:{aborted:boolean}, layout:StereoVideoLayout='side-by-side') {
    validateStereoDimensions(this.width,this.height,layout)
    const projection=stereoProjection(this.width,this.height,strength)
    const passes:StereoColorPass[]=[{eyeSlope:-projection.eyeSlope,height:false},{eyeSlope:projection.eyeSlope,height:false},{eyeSlope:0,height:true}]
    for(let i=0;i<passes.length;i++) {
      if(signal?.aborted)throw new DOMException(t('video.runner.interrupted'),'AbortError')
      const source=await renderSource(passes[i])
      const copy=this.device.createCommandEncoder()
      copy.copyTextureToTexture({texture:source},{texture:this.textures[i]},[this.width,this.height])
      this.device.queue.submit([copy.finish()]);await this.device.queue.onSubmittedWorkDone()
    }
    if(signal?.aborted)throw new DOMException(t('video.runner.interrupted'),'AbortError')
    this.device.queue.writeBuffer(this.uniform,0,new Float32Array([this.width,this.height,projection.shift,projection.crop,layout==='top-bottom'?1:0,0,0,0]))
    const command=this.device.createCommandEncoder(),pass=command.beginRenderPass({colorAttachments:[{view:(this.outputTexture??this.context.getCurrentTexture()).createView(),loadOp:'clear',storeOp:'store'}]})
    pass.setPipeline(this.pipeline);pass.setBindGroup(0,this.binding);pass.draw(3);pass.end()
    this.device.queue.submit([command.finish()]);await this.device.queue.onSubmittedWorkDone()
    return this.canvas
  }
  dispose(){this.outputTexture?.destroy();for(const t of this.textures)t.destroy();this.uniform.destroy();this.context.unconfigure();this.canvas.width=1;this.canvas.height=1}
}
