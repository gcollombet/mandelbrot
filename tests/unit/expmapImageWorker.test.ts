import {it,expect,vi,afterEach} from 'vitest'
const mocks=vi.hoisted(()=>({open:vi.fn(),readTile:vi.fn(),verifyTile:vi.fn(),decode:vi.fn()}))
vi.mock('../../src/expmap/store',()=>({ExpmapStore:class {
  static async fromFile(){return new this()}
  open=mocks.open;readTile=mocks.readTile;verifyTile=mocks.verifyTile
}}))
vi.mock('../../src/expmap/imageDecode',()=>({decodeImageTile:mocks.decode}))
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();vi.resetAllMocks();vi.resetModules()})
async function setup() {
  vi.useFakeTimers()
  const scope={onmessage:undefined as any,postMessage:vi.fn()};vi.stubGlobal('self',scope)
  mocks.open.mockResolvedValue({tiles:Array.from({length:6},(_,index)=>({index,length:1})),octaves:{tileWidth:1,tileHeight:1}})
  mocks.readTile.mockImplementation(async tile=>new Uint8Array([tile.index]))
  mocks.decode.mockImplementation(async bytes=>({index:bytes[0],close:vi.fn()}))
  await import('../../src/expmap/imageReader.worker')
  await scope.onmessage({data:{kind:'init',id:1,file:{}}})
  const send=async(data:object)=>{await scope.onmessage({data});for(let i=0;i<12;i++)await Promise.resolve()}
  return {scope,send}
}
it('promotes an in-flight compressed prefetch without rereading it',async()=>{
  const {scope,send}=await setup();let finish!:(bytes:Uint8Array)=>void
  mocks.readTile.mockImplementationOnce(()=>new Promise(r=>finish=r))
  await send({kind:'prefetch',indices:[2]})
  await send({kind:'read',id:2,index:2})
  finish(new Uint8Array([2]));for(let i=0;i<20;i++)await Promise.resolve()
  expect(mocks.readTile).toHaveBeenCalledTimes(1)
  expect(scope.postMessage.mock.calls.some(([data])=>data.id===2 && data.bitmap?.index===2)).toBe(true)
})
it('skips decoding an obsolete read and serves the new request first',async()=>{
  const {scope,send}=await setup();let finish!:(bytes:Uint8Array)=>void
  mocks.readTile.mockImplementationOnce(()=>new Promise(r=>finish=r))
  await send({kind:'read',id:2,index:0});await send({kind:'cancel',id:2});await send({kind:'read',id:3,index:4})
  finish(new Uint8Array([0]));for(let i=0;i<30;i++)await Promise.resolve()
  expect(mocks.decode).toHaveBeenCalledTimes(1);expect(mocks.decode.mock.calls[0][0][0]).toBe(4)
  expect(scope.postMessage.mock.calls.some(([data])=>data.id===3 && data.bitmap)).toBe(true)
})
it('closes a native bitmap if cancellation arrives during decode',async()=>{
  const {send}=await setup();let finish!:(bitmap:object)=>void
  mocks.decode.mockImplementationOnce(()=>new Promise(r=>finish=r))
  await send({kind:'read',id:2,index:0});await send({kind:'cancel',id:2})
  const bitmap={close:vi.fn()};finish(bitmap);for(let i=0;i<20;i++)await Promise.resolve()
  expect(bitmap.close).toHaveBeenCalledOnce()
})
it('reports a deferred verification failure without blocking initialization',async()=>{
  const {scope}=await setup()
  expect(mocks.verifyTile).not.toHaveBeenCalled()
  mocks.verifyTile.mockRejectedValueOnce(new Error('missing octave'))
  await vi.advanceTimersByTimeAsync(25)
  expect(scope.postMessage).toHaveBeenCalledWith({kind:'verification-error',message:'Error: missing octave'})
})

it('bounds compressed anticipation to four octaves',async()=>{
  const {send}=await setup()
  await send({kind:'prefetch',indices:[0,1,2,3,4,5]})
  for(let i=0;i<30;i++)await Promise.resolve()
  expect(mocks.readTile.mock.calls.map(([tile])=>tile.index)).toEqual([0,1,2,3])
  expect(mocks.decode).not.toHaveBeenCalled()
})

it('does not speculatively read an octave exceeding the compressed budget',async()=>{
  const {send}=await setup()
  const manifest=await mocks.open.mock.results[0].value
  manifest.tiles[0].length=65*1024*1024
  await send({kind:'prefetch',indices:[0]})
  expect(mocks.readTile).not.toHaveBeenCalled()
  await send({kind:'read',id:2,index:0})
  expect(mocks.readTile).toHaveBeenCalledTimes(1)
})
