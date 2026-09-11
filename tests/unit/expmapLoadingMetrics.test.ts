import {it,expect} from 'vitest'
import {ExpmapLoadingMetrics,expmapReadAhead} from '../../src/expmap/loadingMetrics'
it('adapts anticipation to velocity and latency with bounded seek behavior',()=>{
  expect(expmapReadAhead(0,16,100)).toBe(1)
  expect(expmapReadAhead(.2,100,1000)).toBe(3)
  expect(expmapReadAhead(-.2,100,1000)).toBe(3)
  expect(expmapReadAhead(1,10,1000)).toBe(4)
  expect(expmapReadAhead(100,10,1000)).toBe(1)
})
it('keeps bounded aggregates and returns independent snapshots',()=>{
  const metrics=new ExpmapLoadingMetrics();metrics.record('read',20);metrics.record('read',10)
  const snapshot=metrics.snapshot();expect(snapshot.read).toEqual({count:2,totalMs:30,lastMs:10,maxMs:20})
  snapshot.read.count=100;expect(metrics.snapshot().read.count).toBe(2)
})
