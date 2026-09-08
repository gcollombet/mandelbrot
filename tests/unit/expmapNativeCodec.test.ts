import {describe,it,vi,expect,afterEach} from 'vitest'
import {decodeImageTile} from '../../src/expmap/imageDecode'
afterEach(()=>vi.unstubAllGlobals())
describe('native WebP image ownership',()=>{
  it('closes wrong-sized images instead of uploading them',async()=>{
    const close=vi.fn();vi.stubGlobal('createImageBitmap',vi.fn(async()=>({width:2,height:3,close})))
    await expect(decodeImageTile(new Uint8Array([1]),2,2)).rejects.toThrow('Dimensions')
    expect(close).toHaveBeenCalledOnce()
  })
  it('passes an encoded WebP to the browser without a JavaScript decoder',async()=>{
    const bitmap={width:2,height:2,close:vi.fn()},decode=vi.fn(async()=>bitmap)
    vi.stubGlobal('createImageBitmap',decode)
    expect(await decodeImageTile(new Uint8Array([1]),2,2)).toBe(bitmap)
    expect(decode.mock.calls[0][0].type).toBe('image/webp')
    expect(bitmap.close).not.toHaveBeenCalled()
  })
})

it('encodes transferred bytes through ImageData with the required clamped view and rejects PNG fallback',async()=>{
  for(const format of ['image/webp','image/png']) {
    vi.resetModules()
    const sent=vi.fn(),scope={onmessage:undefined as undefined|((event:any)=>Promise<void>),postMessage:sent}
    vi.stubGlobal('self',scope)
    vi.stubGlobal('ImageData',class {constructor(bytes:unknown){expect(bytes).toBeInstanceOf(Uint8ClampedArray)}})
    vi.stubGlobal('OffscreenCanvas',class {
      width=1;height=1
      getContext(){return {putImageData:vi.fn()}}
      async convertToBlob(){return new Blob([new Uint8Array([1,2,3])],{type:format})}
    })
    await import('../../src/expmap/imageEncoder.worker')
    await scope.onmessage!({data:{rgba:new Uint8Array([0,12,127,255]),width:1,height:1,quality:.9}})
    if(format==='image/webp')expect(sent.mock.calls[0][0].bytes).toEqual(new Uint8Array([1,2,3]))
    else expect(sent.mock.calls[0][0].error).toContain('WebP natif indisponible')
  }
})
