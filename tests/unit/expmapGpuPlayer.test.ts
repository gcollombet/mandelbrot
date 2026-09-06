import { afterEach, expect, it, vi } from 'vitest'
import { ExpmapGpuPlayer } from '../../src/expmap/gpuPlayer'
import { fixtureManifest } from './expmapFixtures'
import type { ExpmapDirectoryStore } from '../../src/expmap/store'
const mock = vi.hoisted(()=>({create:vi.fn()}))
vi.mock('../../src/expmap/gpuRenderer',()=>({ExpmapGpuRenderer:{create:mock.create}}))
afterEach(()=>{vi.unstubAllGlobals();mock.create.mockReset()})
const view={width:16,height:12,scale:'1e-1000',angle:0}
it('retains the latest view while GPU source initialization is pending', async()=>{
  let ready!:(value:unknown)=>void
  mock.create.mockReturnValue(new Promise(resolve=>{ready=resolve}))
  const renderer={render:vi.fn(async()=>({})),dispose:vi.fn()}, publish=vi.fn(), error=vi.fn()
  vi.stubGlobal('createImageBitmap',vi.fn(async()=>({close:vi.fn()})))
  const player=new ExpmapGpuPlayer(publish,error)
  const setup=player.setSource({} as ExpmapDirectoryStore,await fixtureManifest())
  player.request(view);player.request({...view,angle:1})
  ready(renderer);expect(await setup).toBe(true)
  await vi.waitFor(()=>expect(publish).toHaveBeenCalledOnce())
  expect(renderer.render.mock.calls[0][0]).toMatchObject({angle:1})
  expect(error).not.toHaveBeenCalled();player.dispose()
})
it('disposes an obsolete initializing document without publishing it', async()=>{
  let ready!:(value:unknown)=>void
  mock.create.mockReturnValue(new Promise(resolve=>{ready=resolve}))
  const renderer={render:vi.fn(),dispose:vi.fn()},publish=vi.fn()
  const player=new ExpmapGpuPlayer(publish,vi.fn())
  const setup=player.setSource({} as ExpmapDirectoryStore,await fixtureManifest())
  player.dispose();ready(renderer)
  expect(await setup).toBe(false);expect(renderer.dispose).toHaveBeenCalledOnce();expect(publish).not.toHaveBeenCalled()
})
