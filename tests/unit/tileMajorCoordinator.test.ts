import {describe, expect, it} from 'vitest'
import {runTileMajorCoordinator} from '../../src/tileMajorCoordinator'

describe('runTileMajorCoordinator', () => {
    it('locks tile-major order and skips completed resume entries', async () => {
        const events: string[] = []
        const result = await runTileMajorCoordinator({
            tiles: [0, 1, 2],
            isCompleted: tile => tile === 1,
            async renderTile(tile) {
                for (let frame = 0; frame < 3; frame++) events.push(`${tile}:${frame}`)
                return {cancelled: false}
            },
        })
        expect(events).toEqual(['0:0', '0:1', '0:2', '2:0', '2:1', '2:2'])
        expect(result).toEqual({cancelled: false, visited: [0, 2]})
    })

    it('stops before beginning another tile after cancellation', async () => {
        const signal = {aborted: false}
        const visited: number[] = []
        const result = await runTileMajorCoordinator({
            tiles: [0, 1, 2], isCompleted: () => false, signal,
            async renderTile(tile) {
                visited.push(tile)
                if (tile === 1) signal.aborted = true
                return {cancelled: tile === 1}
            },
        })
        expect(visited).toEqual([0, 1])
        expect(result).toEqual({cancelled: true, visited: [0, 1]})
    })
})
