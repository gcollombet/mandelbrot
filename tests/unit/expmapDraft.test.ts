import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope } from 'vue'
import { restoreExpmapDraft, useExpmapDraft } from '../../src/expmap/draft'
const camera = {cx:'-0.743',cy:'0.13',scale:'1e-9999'}
afterEach(() => vi.unstubAllGlobals())
describe('persistent ExpMap creation draft', () => {
  it('preserves exact endpoints and unfinished edits across a reload', () => {
    const saved = {...restoreExpmapDraft(camera),start:'1.123456789012345678901e-9000',end:'1e-10000',cx:'-0.123456789012345678901',name:'Deep',width:3840,forceRender:true}
    expect(restoreExpmapDraft({cx:'0',cy:'0',scale:'4'}, JSON.stringify(saved))).toEqual(saved)
    expect(restoreExpmapDraft(camera, JSON.stringify({...saved,end:'1e-'})).end).toBe('1e-')
  })
  it('falls back safely for malformed storage and invalid property types', () => {
    expect(restoreExpmapDraft(camera, '{broken').start).toBe(camera.scale)
    const draft = restoreExpmapDraft(camera, JSON.stringify({start:4,width:'bad',forceRender:'true'}))
    expect(draft.start).toBe(camera.scale);expect(draft.width).toBe(1280);expect(draft.forceRender).toBe(false)
  })
  it('shares edits between panels and survives unmount without adopting the new camera', () => {
    const data = new Map<string,string>()
    vi.stubGlobal('localStorage',{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value)})
    const firstScope = effectScope(), first = firstScope.run(()=>useExpmapDraft(camera))!
    first.start='1e-5000';first.end='1e-6000'
    firstScope.stop()
    const secondScope = effectScope(), second = secondScope.run(()=>useExpmapDraft({cx:'9',cy:'8',scale:'4'}))!
    expect(second).toBe(first);expect(second.start).toBe('1e-5000');expect(second.end).toBe('1e-6000')
    expect(restoreExpmapDraft(camera,data.get('expmap-creation-draft'))).toMatchObject({start:'1e-5000',end:'1e-6000'})
    secondScope.stop()
  })
})
