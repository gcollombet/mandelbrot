import {describe,it,expect,vi} from 'vitest'
import {uploadExpmapBands,EXPMAP_UPLOAD_BYTES} from '../../src/expmap/tileUpload'
describe('bounded GPU image uploads',()=>{
  it('covers a 4K map tile exactly once with one bounded band in flight',async()=>{
    const spans:number[]=[],yieldBetween=vi.fn(async()=>{}),controller=new AbortController()
    let active=false
    await uploadExpmapBands(13856,1536,{signal:controller.signal,isRequired:()=>false},async(y,rows)=>{
      expect(active).toBe(false);active=true
      expect(13856*rows*4).toBeLessThanOrEqual(EXPMAP_UPLOAD_BYTES)
      spans.push(...Array.from({length:rows},(_,i)=>y+i));await Promise.resolve();active=false
    },yieldBetween)
    expect(spans).toEqual(Array.from({length:1536},(_,i)=>i))
    expect(yieldBetween).toHaveBeenCalledTimes(Math.ceil(1536/Math.floor(EXPMAP_UPLOAD_BYTES/(13856*4))))
  })
  it('drains without pacing when prefetch becomes necessary',async()=>{
    let required=false
    const yieldBetween=vi.fn(async()=>{required=true}),copy=vi.fn(async()=>{})
    await uploadExpmapBands(13856,1536,{signal:new AbortController().signal,isRequired:()=>required},copy,yieldBetween)
    expect(yieldBetween).toHaveBeenCalledOnce();expect(copy.mock.calls.length).toBeGreaterThan(1)
  })
  it('does not issue another copy after cancellation during a yield',async()=>{
    const abort=new AbortController(),copy=vi.fn(async()=>{})
    await expect(uploadExpmapBands(13856,1536,{signal:abort.signal,isRequired:()=>false},copy,async()=>{abort.abort()})).rejects.toThrow()
    expect(copy).not.toHaveBeenCalled()
  })
})

it('groups two bands per fence and drains the final partial group',async()=>{
  const copies:number[]=[],fences:number[]=[]
  await uploadExpmapBands(1024,5120,{signal:new AbortController().signal,isRequired:()=>true},async y=>{copies.push(y)},undefined,async()=>{fences.push(copies.length)})
  expect(copies).toEqual([0,1024,2048,3072,4096]);expect(fences).toEqual([2,4,5])
})
