import { describe, expect, it } from 'vitest'
import { StudioHistory, STUDIO_HISTORY_COALESCE_MS } from '../../src/studioHistory'

describe('StudioHistory', () => {
  it('undoes and redoes snapshots in order', () => {
    const h = new StudioHistory<{ n: number }>()
    h.record({ n: 0 }, '', 0)
    h.record({ n: 1 }, '', 10)
    expect(h.undo({ n: 2 })).toEqual({ n: 1 })
    expect(h.undo({ n: 1 })).toEqual({ n: 0 })
    expect(h.undo({ n: 0 })).toBeNull()
    expect(h.redo({ n: 0 })).toEqual({ n: 1 })
    expect(h.redo({ n: 1 })).toEqual({ n: 2 })
    expect(h.canRedo).toBe(false)
  })

  it('coalesces a burst under one key into a single step', () => {
    const h = new StudioHistory<{ n: number }>()
    h.record({ n: 0 }, 'look:a', 0)
    h.record({ n: 1 }, 'look:a', 300)
    h.record({ n: 2 }, 'look:a', 600)
    expect(h.undo({ n: 3 })).toEqual({ n: 0 })
    expect(h.canUndo).toBe(false)
  })

  it('a pause or another key opens a new step', () => {
    const h = new StudioHistory<{ n: number }>()
    h.record({ n: 0 }, 'look:a', 0)
    h.record({ n: 1 }, 'look:a', STUDIO_HISTORY_COALESCE_MS + 1)
    h.record({ n: 2 }, 'look:b', STUDIO_HISTORY_COALESCE_MS + 2)
    expect(h.undo({ n: 3 })).toEqual({ n: 2 })
    expect(h.undo({ n: 2 })).toEqual({ n: 1 })
  })

  it('a new edit drops the redo branch, and snapshots are copies', () => {
    const h = new StudioHistory<{ list: number[] }>()
    const state = { list: [1] }
    h.record(state, '', 0)
    state.list.push(2)
    expect(h.undo(state)).toEqual({ list: [1] })
    h.record({ list: [1] }, '', 10)
    expect(h.canRedo).toBe(false)
  })

  it('keeps at most `limit` steps', () => {
    const h = new StudioHistory<number>(3)
    for (let i = 0; i < 5; i++) h.record(i, '', i)
    expect([h.undo(5), h.undo(4), h.undo(3), h.undo(2)]).toEqual([4, 3, 2, null])
  })
})
