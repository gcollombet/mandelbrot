import {describe,it,expect} from 'vitest'
import {expmapPlayerResolution,validateExpmapView} from '../../src/expmap/renderer'
import {planExpmap} from '../../src/expmap/plan'
const plan=planExpmap({domain:{cx:'0',cy:'0',startScale:'1',endScale:'1'},width:3840,height:2160,density:1})
describe('physical ExpMap player resolution',()=>{
  it('renders a full 4K frame on a 1920x1080 Retina viewport',()=>{
    expect(expmapPlayerResolution(plan,1920,1080,2)).toEqual({width:3840,height:2160})
    expect(expmapPlayerResolution(plan,1920,1080,1)).toEqual({width:1920,height:1080})
  })
  it('fits letterboxed viewports and caps at source resolution',()=>{
    expect(expmapPlayerResolution(plan,1512,982,2)).toEqual({width:3024,height:1701})
    expect(expmapPlayerResolution(plan,3840,2160,2)).toEqual({width:3840,height:2160})
    for(const ratio of [0.75,1,1.25,1.5,2,3]) {
      const size=expmapPlayerResolution(plan,1001,701,ratio)
      expect(size.width).toBeLessThanOrEqual(1001*ratio)
      expect(size.height).toBeLessThanOrEqual(701*ratio)
      expect(()=>validateExpmapView(plan,{...size,scale:'1',angle:0,maxSamples:256})).not.toThrow()
    }
  })
})
