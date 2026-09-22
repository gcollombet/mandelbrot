import {describe,it,expect} from 'vitest'
import {expmapFilterUniform,validateExpmapView} from '../../src/expmap/renderer'
import {fixtureManifest} from './expmapFixtures'
describe('adaptive video sampling contract',()=>{
  it('bounds square tap grids and uses the least dense polar axis',async()=>{
    const {octaves}=await fixtureManifest()
    for(const cap of [1,4,9,16,36,64,144,256]) {
      const [side,metric]=expmapFilterUniform(octaves,cap)
      expect(side*side).toBe(cap)
      expect(metric).toBe(Math.min(octaves.angularSamples/(2*Math.PI),octaves.rowsPerOctave/Math.LN2))
    }
    expect(expmapFilterUniform({...octaves,angularSamples:1})[1]).toBe(1/(2*Math.PI))
    expect(expmapFilterUniform({...octaves,rowsPerOctave:1})[1]).toBe(1/Math.LN2)
    expect(()=>expmapFilterUniform(octaves,NaN)).toThrow()
  })
  it('encodes distribution independently of AA count and cyclic mode',async()=>{
    const {octaves,projection}=await fixtureManifest()
    for(const cap of [1,16,256])for(const cyclic of [false,true]){
      const grid=expmapFilterUniform(octaves,cap,cyclic,'grid'),r2=expmapFilterUniform(octaves,cap,cyclic,'r2')
      expect(r2.slice(0,3)).toEqual(grid.slice(0,3));expect(grid[3]).toBe(0);expect(r2[3]).toBe(1)
    }
    expect(()=>expmapFilterUniform(octaves,16,false,'invalid' as never)).toThrow('distribution')
    const view={width:projection.width,height:projection.height,scale:projection.domain.startScale,angle:0}
    expect(()=>validateExpmapView(projection,{...view,sampleDistribution:'r2'})).not.toThrow()
    expect(()=>validateExpmapView(projection,{...view,sampleDistribution:'invalid' as never})).toThrow('distribution')
  })
  it('preserves the one-tap default for interactive views and validates explicit overrides',async()=>{
    const {projection}=await fixtureManifest()
    const view={width:projection.width,height:projection.height,scale:projection.domain.startScale,angle:0}
    expect(expmapFilterUniform((await fixtureManifest()).octaves)[0]).toBe(1)
    expect(()=>validateExpmapView(projection,view)).not.toThrow()
    expect(()=>validateExpmapView(projection,{...view,maxSamples:256})).not.toThrow()
    expect(()=>validateExpmapView(projection,{...view,maxSamples:17})).toThrow()
  })
})
