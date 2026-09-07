import {describe,it,expect,vi,afterEach} from 'vitest'
import {imageExportBands,validateImageExport,exportExpmapImage} from '../../src/expmap/imageExport'
import {validateTileDimensions} from '../../src/expmap/imageLimits'
import {fixtureManifest} from './expmapFixtures'
import type {ExpmapStore} from '../../src/expmap/store'
afterEach(()=>vi.unstubAllGlobals())
describe('whole ExpMap image export',()=>{
  it('partitions every output row exactly once, including very small exports',async()=>{
    const m=await fixtureManifest()
    for(const height of [1,3,16,900,4096]) {
      const bands=imageExportBands(m,height)
      const rows=bands.flatMap(b=>Array.from({length:b.end-b.first},(_,i)=>b.first+i))
      expect(rows).toEqual(Array.from({length:height},(_,i)=>i))
      for(const b of bands)for(let y=b.first;y<b.end;y++)expect(Math.floor((y+0.5)*m.octaves.tileCount/height)).toBe(b.index)
    }
  })
  it('fully covers boundary pixels when downscaling makes halos subpixel',async()=>{
    const m=await fixtureManifest();m.state='complete'
    const width=7,height=17,coverage=new Float64Array(height),close=vi.fn()
    const ctx={imageSmoothingEnabled:false,imageSmoothingQuality:'low',
      save(){},beginPath(){},rect(){},clip(){},restore(){},
      drawImage(_bitmap:unknown,sx:number,sy:number,sw:number,sh:number,dx:number,dy:number,dw:number,dh:number){
        expect([sx,sy,sw,sh]).toEqual([m.octaves.halo,m.octaves.halo,m.octaves.angularSamples,m.octaves.rowsPerOctave])
        expect([dx,dw]).toEqual([0,width])
        // An opaque constant source must cover every pixel's entire area.
        for(let y=0;y<height;y++)coverage[y]+=Math.max(0,Math.min(y+1,dy+dh)-Math.max(y,dy))
      }}
    vi.stubGlobal('OffscreenCanvas',class {width=1;height=1;getContext(){return ctx}async convertToBlob(){return new Blob([],{type:'image/png'})}})
    vi.stubGlobal('createImageBitmap',async()=>({width:m.octaves.tileWidth,height:m.octaves.tileHeight,close}))
    await exportExpmapImage({readTile:async()=>new Uint8Array([1])} as unknown as ExpmapStore,m,{width,height,format:'image/png',quality:.9})
    expect(Array.from(coverage)).toEqual(Array(height).fill(1))
    expect(close).toHaveBeenCalledTimes(m.octaves.tileCount)
  })
  it('enforces pixel budget, finite quality and native WebP dimensions',()=>{
    expect(()=>validateImageExport(2048,4096,'image/png',.9)).not.toThrow()
    for(const [w,h] of [[16384,1],[10000,10000],[NaN,1]])expect(()=>validateImageExport(w,h,'image/webp',.9)).toThrow()
    expect(()=>validateImageExport(10,10,'image/png',NaN)).toThrow()
    expect(()=>validateTileDimensions(16384,1)).toThrow()
    expect(()=>validateTileDimensions(13856,1536)).not.toThrow()
  })
  it('releases the decoded bitmap on cancellation before drawing',async()=>{
    const m=await fixtureManifest();m.state='complete';m.tiles=[{index:0,file:'doubling-0.webp',length:1,sha256:''}]
    const abort=new AbortController(),close=vi.fn()
    vi.stubGlobal('OffscreenCanvas',class {width=1;height=1;getContext(){return {}}})
    vi.stubGlobal('createImageBitmap',async()=>{abort.abort();return {width:m.octaves.tileWidth,height:m.octaves.tileHeight,close}})
    // A one-row export samples the middle doubling; only data ownership matters here.
    await expect(exportExpmapImage({readTile:async()=>new Uint8Array([1])} as unknown as ExpmapStore,m,{width:1,height:1,format:'image/png',quality:.9,signal:abort.signal})).rejects.toThrow()
    expect(close).toHaveBeenCalledOnce()
  })
})
