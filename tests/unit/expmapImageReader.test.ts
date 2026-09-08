import {afterEach,describe,it,expect,vi} from 'vitest'
import {ExpmapImageReader} from '../../src/expmap/imageReader'
import type {ExpmapStore} from '../../src/expmap/store'
afterEach(()=>vi.unstubAllGlobals())
function setup() {
  const worker={onmessage:undefined as any,onerror:undefined as any,postMessage:vi.fn(),terminate:vi.fn()}
  vi.stubGlobal('Worker',class {constructor(){return worker}})
  const source={destination:{name:'map.expmap'}} as unknown as ExpmapStore
  return {worker,source}
}
describe('worker image reader ownership',()=>{
  it('sends a file handle once, then only image indexes, with one outstanding request',async()=>{
    const {worker,source}=setup(),creating=ExpmapImageReader.create(source,'fixture')
    expect(worker.postMessage.mock.calls[0][0]).toMatchObject({kind:'init',file:source.destination,documentId:'fixture'})
    worker.onmessage({data:{id:1}})
    const reader=await creating,pending=reader.read(7),bitmap={close:vi.fn()}
    expect(worker.postMessage.mock.calls[1][0]).toEqual({kind:'read',index:7,id:2})
    await expect(reader.read(8)).rejects.toThrow('déjà en cours')
    worker.onmessage({data:{id:2,bitmap}})
    expect(await pending).toBe(bitmap);expect(bitmap.close).not.toHaveBeenCalled();reader.dispose()
  })
  it('rejects disposal and closes late bitmaps instead of publishing them',async()=>{
    const {worker,source}=setup(),creating=ExpmapImageReader.create(source,'fixture')
    worker.onmessage({data:{id:1}});const reader=await creating,pending=reader.read(0)
    reader.dispose();await expect(pending).rejects.toThrow('fermé')
    const bitmap={close:vi.fn()};worker.onmessage({data:{id:2,bitmap}})
    expect(bitmap.close).toHaveBeenCalledOnce();expect(worker.terminate).toHaveBeenCalledOnce()
  })
  it('propagates source/codec failures and terminates failed initialization',async()=>{
    const {worker,source}=setup(),creating=ExpmapImageReader.create(source,'fixture')
    worker.onmessage({data:{id:1,error:{name:'NotAllowedError',message:'Permission denied'}}})
    await expect(creating).rejects.toThrow('Permission denied');expect(worker.terminate).toHaveBeenCalledOnce()
  })
})
