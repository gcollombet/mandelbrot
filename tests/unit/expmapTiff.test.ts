import { describe, expect, it } from 'vitest'
import UTIF from 'utif'
import { fixtureManifest, MemoryDirectory } from './expmapFixtures'
import { ExpmapDirectoryStore } from '../../src/expmap/store'
import { decodeTiffTile, encodeTiffTile, tiffHeaderBytes, tiffFileLayout, tiffHeader, tiffFileGroup } from '../../src/expmap/tiff'
import { planExpmap } from '../../src/expmap/plan'
import { planExpmapOctaves } from '../../src/expmap/octaves'
import { validateExpmapManifest } from '../../src/expmap/manifest'

describe('single tiled TIFF format',()=>{
  it('sizes metadata beyond the library convenience encoder 20 KB buffer',async()=>{
    const m=await fixtureManifest(), count=3000
    const header=tiffHeader(m.octaves,count,[]),[ifd]=UTIF.decode(header.buffer)
    expect(header.length).toBeGreaterThan(20000)
    expect(ifd.t324).toHaveLength(count);expect(ifd.t325).toHaveLength(count)
    expect(ifd.t257[0]).toBe(m.octaves.tileHeight*count)
  })
  it('splits only according to classic TIFF capacity and resumes across a file boundary',async()=>{
    const dir=new MemoryDirectory(),store=new ExpmapDirectoryStore(dir.handle())
    let m=await fixtureManifest()
    m.projection=planExpmap({domain:{cx:'0',cy:'0',startScale:'1',endScale:'1e-30'},width:3840,height:2160,density:1})
    m.octaves=planExpmapOctaves(m.projection)
    const {tilesPerFile}=tiffFileLayout(m.octaves)
    expect(tilesPerFile).toBeGreaterThan(13)
    expect(tilesPerFile*m.octaves.tileWidth*m.octaves.tileHeight*4+tiffHeaderBytes(tilesPerFile)).toBeLessThan(2**32)
    for(let i=0;i<=tilesPerFile;i++)m=await store.appendTile(m,new Uint8Array([i]))
    expect(m.tiles[tilesPerFile-1].file).toBe('zoom-0.tif')
    expect(m.tiles[tilesPerFile].file).toBe('zoom-1.tif')
    expect(m.tiles[tilesPerFile].offset).toBe(tiffFileGroup(m.octaves,tilesPerFile).headerBytes)
    expect((await store.open()).tiles).toEqual(m.tiles)
  })
  it('round trips native Deflate and rejects oversized or truncated output',async()=>{
    const rgba=Uint8Array.from({length:8192},(_,i)=>(i*37)%256), bytes=await encodeTiffTile(rgba)
    expect(await decodeTiffTile(bytes,rgba.length)).toEqual(rgba)
    await expect(decodeTiffTile(bytes,rgba.length-1)).rejects.toThrow('budget')
    await expect(decodeTiffTile(bytes,rgba.length+1)).rejects.toThrow('Truncated')
  })
  it('is decoded by an independent standard TIFF reader, including the second tile',async()=>{
    const dir=new MemoryDirectory(), store=new ExpmapDirectoryStore(dir.handle())
    let m=await fixtureManifest(); const size=m.octaves.tileWidth*m.octaves.tileHeight*4
    for(let i=0;i<m.octaves.tileCount;i++) {
      const rgba=new Uint8Array(size); for(let p=0;p<size;p+=4)rgba.set([i*13,31,127,255],p)
      m=await store.appendTile(m,await encodeTiffTile(rgba))
    }
    m={...m,state:'complete',center:[0,0,0],generation:m.generation+1}; await store.publish(m)
    expect((await store.open()).tiles).toHaveLength(m.octaves.tileCount)
    const bytes=dir.files.get('zoom-0.tif')!.slice().buffer
    const [ifd]=UTIF.decode(bytes); UTIF.decodeImage(bytes,ifd)
    const rgba=UTIF.toRGBA8(ifd)
    expect(Array.from(rgba.slice(0,4))).toEqual([0,31,127,255])
    expect(Array.from(rgba.slice(size,size+4))).toEqual([13,31,127,255])
    expect(dir.files.has('zoom-1.tif')).toBe(false)
    expect(ifd.t325).toHaveLength(m.octaves.tileCount)
  })
  it('recovers the previous checkpoint after publication fails and retries the same tile',async()=>{
    const dir=new MemoryDirectory(), store=new ExpmapDirectoryStore(dir.handle())
    let m=await fixtureManifest(); await store.publish(m)
    const bytes=await encodeTiffTile(new Uint8Array(m.octaves.tileWidth*m.octaves.tileHeight*4))
    m=await store.appendTile(m,bytes)
    dir.failClose='manifest-a.json'
    await expect(store.appendTile(m,bytes)).rejects.toThrow('Full disk')
    dir.failClose=null
    expect((await store.open()).tiles).toHaveLength(1)
    m=await store.appendTile(await store.open(),bytes)
    expect(m.tiles[1].offset).toBe(tiffHeaderBytes(m.octaves.tileCount)+bytes.length)
    expect((await store.open()).tiles).toHaveLength(2)
  })
  it('checks payload on demand and rejects permission loss and old formats',async()=>{
    const dir=new MemoryDirectory(), store=new ExpmapDirectoryStore(dir.handle())
    const m=await store.appendTile(await fixtureManifest(),await encodeTiffTile(new Uint8Array(256)))
    dir.files.get('zoom-0.tif')![tiffHeaderBytes(m.octaves.tileCount)]^=1
    await expect(store.open()).resolves.toBeDefined()
    await expect(store.readTile(m.tiles[0])).rejects.toThrow('Corrupt')
    dir.denied=true; await expect(store.open()).rejects.toThrow('Permission')
    expect(()=>validateExpmapManifest({...m,version:3} as never)).toThrow('Ancien format')
  })
})
