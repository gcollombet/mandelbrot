import { afterEach, expect, it, vi } from 'vitest'
import { StereoVideoGpu } from '../../src/stereoVideoGpu'
import type { StereoColorPass } from '../../src/stereoVideo'
afterEach(()=>vi.unstubAllGlobals())
function fixture(hdr=false){
  vi.stubGlobal('GPUTextureUsage',{TEXTURE_BINDING:1,COPY_DST:2,RENDER_ATTACHMENT:4,COPY_SRC:8})
  vi.stubGlobal('GPUBufferUsage',{UNIFORM:1,COPY_DST:2})
  const commands:unknown[][]=[],textures:{format:string;destroy:ReturnType<typeof vi.fn>}[]=[]
  const context={configure:vi.fn(),unconfigure:vi.fn(),getCurrentTexture:()=>({createView:()=>({})})}
  vi.stubGlobal('OffscreenCanvas',class {width:number;height:number;constructor(w:number,h:number){this.width=w;this.height=h}getContext(){return context}})
  const device={limits:{maxTextureDimension2D:8192},queue:{writeBuffer:vi.fn(),submit:vi.fn(),onSubmittedWorkDone:vi.fn(async()=>{})},
    createShaderModule:()=>({}),createRenderPipeline:()=>({getBindGroupLayout:()=>({})}),
    createTexture:(descriptor:{format:string})=>{const t={...descriptor,createView:()=>({}),destroy:vi.fn()};textures.push(t);return t},
    createBuffer:()=>({destroy:vi.fn()}),createBindGroup:()=>({}),createSampler:()=>({}),
    createCommandEncoder:()=>({copyTextureToTexture:(...args:unknown[])=>commands.push(['copy',...args]),finish:()=>({}),
      beginRenderPass:()=>({setPipeline:()=>{},setBindGroup:()=>{},draw:()=>commands.push(['compose']),end:()=>{}})})
  }
  const renderer=new StereoVideoGpu(device as unknown as GPUDevice,1920,1080,hdr)
  return {renderer,commands,textures,context,device}
}
it('shades both eyes independently, transfers float height and composes only a complete triplet',async()=>{
  const {renderer,commands,textures,context}=fixture(),passes:StereoColorPass[]=[]
  const result=await renderer.render(1,async pass=>{passes.push(pass);return {id:passes.length} as unknown as GPUTexture})
  expect(result.width).toBe(1920);expect(result.height).toBe(1080)
  expect(passes.map(p=>p.height)).toEqual([false,false,true])
  expect(passes[0].eyeSlope).toBeLessThan(0);expect(passes[1].eyeSlope).toBe(-passes[0].eyeSlope)
  expect(passes[2].eyeSlope).toBe(0)
  expect(commands.map(c=>c[0])).toEqual(['copy','copy','copy','compose'])
  expect(textures.every(t=>t.format==='rgba16float')).toBe(true)
  renderer.dispose();expect(textures.every(t=>t.destroy.mock.calls.length===1)).toBe(true)
  expect(context.unconfigure).toHaveBeenCalledOnce()
})
it('never publishes a partial stereo pair after cancellation or a source failure',async()=>{
  const {renderer,commands}=fixture(),abort=new AbortController()
  await expect(renderer.render(1,async()=>{abort.abort();return {} as GPUTexture},abort.signal)).rejects.toThrow('interrompu')
  expect(commands.some(c=>c[0]==='compose')).toBe(false)
  await expect(renderer.render(1,async()=>{throw new Error('source unavailable')})).rejects.toThrow('source unavailable')
  expect(commands.some(c=>c[0]==='compose')).toBe(false)
  renderer.dispose()
})

it('changes packing without rotating the stereo baseline',async()=>{
  const {renderer,device}=fixture(),passes:StereoColorPass[]=[]
  await renderer.render(1,async pass=>{passes.push(pass);return {} as GPUTexture},undefined,'top-bottom')
  const data=device.queue.writeBuffer.mock.calls.at(-1)![2] as Float32Array
  expect(data[4]).toBe(1)
  expect(passes[0].eyeSlope).toBeLessThan(0)
  expect(passes[1].eyeSlope).toBe(-passes[0].eyeSlope)
  renderer.dispose()
})

it('packs HDR into a float texture instead of an 8-bit canvas',async()=>{
  const {renderer,context}=fixture(true)
  expect(renderer.outputTexture).toBeDefined()
  const screen=vi.spyOn(context,'getCurrentTexture')
  await renderer.render(1,async()=>({} as GPUTexture),undefined,'top-bottom')
  expect(screen).not.toHaveBeenCalled()
  expect(renderer.outputTexture).toMatchObject({format:'rgba16float'})
  renderer.dispose()
})
