import {afterEach,expect,it,vi} from 'vitest'
import {readLinearHdrTexture} from '../../src/hdrTextureReadback'
import {halfToFloat} from './hdrReference'
afterEach(()=>vi.unstubAllGlobals())
it('removes row padding without clipping float highlights and reuses the resolve pipeline',async()=>{
  vi.stubGlobal('GPUTextureUsage',{RENDER_ATTACHMENT:1,COPY_SRC:2})
  vi.stubGlobal('GPUBufferUsage',{COPY_DST:1,MAP_READ:2});vi.stubGlobal('GPUMapMode',{READ:1})
  const mapped=new Uint16Array(256),destroy=vi.fn(),unmap=vi.fn()
  mapped.set([0x4000,0x4200,0x4400,0x3c00,0,0,0,0x3c00],0)
  mapped.set([0x4400,0x4200,0x4000,0x3c00,0,0,0,0x3c00],128)
  const device={createTexture:()=>({createView:()=>({}),destroy}),
    createBuffer:()=>({mapAsync:async()=>{},getMappedRange:()=>mapped.buffer,unmap,destroy}),
    createShaderModule:()=>({}),createRenderPipelineAsync:vi.fn(async()=>({getBindGroupLayout:()=>({})})),createBindGroup:()=>({}),
    createCommandEncoder:()=>({beginRenderPass:()=>({setPipeline:()=>{},setBindGroup:()=>{},draw:()=>{},end:()=>{}}),copyTextureToBuffer:()=>{},finish:()=>({})}),queue:{submit:()=>{}}}
  const source={createView:()=>({})} as unknown as GPUTexture
  const result=await readLinearHdrTexture(device as unknown as GPUDevice,source,2,2)
  expect(result).toHaveLength(16)
  expect(halfToFloat(result[0])).toBe(2);expect(halfToFloat(result[8])).toBe(4)
  await readLinearHdrTexture(device as unknown as GPUDevice,source,2,2)
  expect(device.createRenderPipelineAsync).toHaveBeenCalledOnce()
  expect(unmap).toHaveBeenCalledTimes(2);expect(destroy).toHaveBeenCalledTimes(4)
})
