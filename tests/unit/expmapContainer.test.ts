import {describe,it,expect,vi,afterEach} from 'vitest'
import {ZipReader,BlobReader,ZipWriter,BlobWriter,TextReader} from '@zip.js/zip.js'
import {fixtureManifest,MemoryDirectory} from './expmapFixtures'
import {ExpmapStore} from '../../src/expmap/store'
import {validateExpmapManifest} from '../../src/expmap/manifest'
function memoryFile() {
  let blob=new Blob()
  return {name:'test.expmap',getFile:async()=>blob,createWritable:async()=>{
    const chunks:Uint8Array[]=[]
    return new WritableStream<Uint8Array>({write:v=>{chunks.push(v.slice())},close:()=>{blob=new Blob(chunks)},abort:()=>{}})
  }} as unknown as FileSystemFileHandle
}
afterEach(()=>vi.unstubAllGlobals())
describe('ExpMap ZIP64 image container',()=>{
  it('streams a standard STORE archive, with portable thumbnail and independent images',async()=>{
    const dir=new MemoryDirectory(),store=new ExpmapStore(dir.handle()),destination=memoryFile()
    let m=await fixtureManifest()
    for(let i=0;i<m.octaves.tileCount;i++)m=await store.appendTile(m,new Uint8Array([i,12,255]))
    m={...m,generation:m.generation+1,state:'complete',center:[12,13,14],thumbnail:'data:image/webp;base64,AAAA'}
    await store.publish(m)
    await store.saveContainer(m,undefined,undefined,destination)
    const archive=new ZipReader(new BlobReader(await destination.getFile()))
    const entries=await archive.getEntries()
    expect(entries.every(e=>e.compressionMethod===0)).toBe(true)
    expect(entries.map(e=>e.filename)).toContain('doubling-14.webp')
    const opened=await ExpmapStore.fromFile(destination)
    expect(await opened.open('fixture')).toEqual(m)
    expect(await opened.readTile(m.tiles[9])).toEqual(new Uint8Array([9,12,255]))
    await expect(opened.open('another')).rejects.toThrow('autre document')
  })
  it('recovers the previous checkpoint and replaces only the unpublished image',async()=>{
    const dir=new MemoryDirectory(),store=new ExpmapStore(dir.handle())
    let m=await fixtureManifest();await store.publish(m)
    m=await store.appendTile(m,new Uint8Array([1]))
    dir.failClose='manifest-a.json'
    await expect(store.appendTile(m,new Uint8Array([2]))).rejects.toThrow('Full disk')
    dir.failClose=null
    expect((await store.open()).tiles).toHaveLength(1)
    m=await store.appendTile(await store.open(),new Uint8Array([3]))
    expect(await store.readTile(m.tiles[1])).toEqual(new Uint8Array([3]))
  })
  it('checks image integrity lazily and refuses old formats',async()=>{
    const dir=new MemoryDirectory(),store=new ExpmapStore(dir.handle())
    const m=await store.appendTile(await fixtureManifest(),new Uint8Array([1,2]))
    dir.files.get('doubling-0.webp')![0]^=1
    await expect(store.open()).resolves.toBeDefined()
    await expect(store.readTile(m.tiles[0])).rejects.toThrow('Corrupt')
    expect(()=>validateExpmapManifest({...m,version:4} as never)).toThrow('Ancien format')
    dir.denied=true;await expect(store.open()).rejects.toThrow('Permission')
  })
  it('rejects compressed archive entries instead of accepting nested decompression',async()=>{
    const writer=new ZipWriter(new BlobWriter(),{useWebWorkers:false})
    await writer.add('manifest.json',new TextReader('hello'.repeat(100)))
    const blob=await writer.close()
    await expect(ExpmapStore.fromFile({getFile:async()=>blob} as FileSystemFileHandle)).rejects.toThrow('archive index')
  })
})

it('retains internal checkpoints after a destination failure and permits retry',async()=>{
  const dir=new MemoryDirectory(),store=new ExpmapStore(dir.handle())
  const m=await store.appendTile(await fixtureManifest(),new Uint8Array([1,2,3]))
  const failed={createWritable:async()=>new WritableStream({write:()=>{throw new Error('Full destination')}})} as unknown as FileSystemFileHandle
  await expect(store.saveContainer(m,undefined,undefined,failed)).rejects.toThrow('Full destination')
  expect(await store.open()).toEqual(m)
  const destination=memoryFile()
  await store.saveContainer(m,undefined,undefined,destination)
  expect(await (await ExpmapStore.fromFile(destination)).open()).toEqual(m)
})

it('restores an interrupted archive to internal checkpoints and reuses them after a crash',async()=>{
  const initial=new ExpmapStore(new MemoryDirectory().handle()),destination=memoryFile()
  const m=await initial.appendTile(await fixtureManifest(),new Uint8Array([1,2,3]))
  await initial.saveContainer(m,undefined,undefined,destination)
  const recovered=new MemoryDirectory()
  const parent={getDirectoryHandle:async()=>recovered.handle()}
  vi.stubGlobal('navigator',{storage:{getDirectory:async()=>({getDirectoryHandle:async()=>parent})}})
  const progress:number[]=[]
  const working=await ExpmapStore.working(destination,'fixture',true,{onProgress:n=>progress.push(n)})
  expect(await working.open()).toEqual(m);expect(progress).toEqual([0,1])
  const unavailable={getFile:async()=>{throw new Error('Destination unavailable')}} as unknown as FileSystemFileHandle
  const fromCheckpoint=await ExpmapStore.working(unavailable,'fixture',true)
  expect(await fromCheckpoint.open()).toEqual(m)
})

it('opens complete playback metadata without scanning files, but checks bytes on demand',async()=>{
  const dir=new MemoryDirectory(),store=new ExpmapStore(dir.handle())
  let m=await fixtureManifest()
  for(let i=0;i<m.octaves.tileCount;i++)m=await store.appendTile(m,new Uint8Array([i]))
  m={...m,generation:m.generation+1,state:'complete',center:[1,2,3]};await store.publish(m)
  const verify=vi.spyOn(store,'verifyTile')
  expect(await store.open('fixture',true)).toEqual(m);expect(verify).not.toHaveBeenCalled()
  dir.files.delete(m.tiles[14].file)
  await expect(store.verifyTile(m.tiles[14])).rejects.toThrow()
  await expect(store.readTile(m.tiles[14])).rejects.toThrow()
  dir.files.get(m.tiles[0].file)![0]^=1
  await expect(store.readTile(m.tiles[0])).rejects.toThrow('Corrupt')
})

it('retains full checkpoint verification for incomplete documents in progressive mode',async()=>{
  const store=new ExpmapStore(new MemoryDirectory().handle())
  await store.appendTile(await fixtureManifest(),new Uint8Array([1]))
  const verify=vi.spyOn(store,'verifyTile')
  await store.open('fixture',true);expect(verify).toHaveBeenCalled()
})
