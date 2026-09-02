import {describe, expect, it} from 'vitest'
import {
    assertTemporaryCapacity,
    computeTiledVideoFingerprint,
    createTiledVideoManifest,
    markTileCompleted,
    parseTiledVideoManifest,
    persistTiledVideoManifest,
    resumeCompatibility,
    stableFingerprintJson,
    type TemporaryVideoStore,
} from '../../src/tiledVideoStore'
import {planVideoTiles} from '../../src/tiledVideoExport'

const plan = planVideoTiles({
    fullFrame: {width: 101, height: 57},
    supersample: 2,
    halo: {filter: 2, render: 1, codec: 4},
    maxTextureDimension2D: 1024,
    gpuBudgetBytes: 1024 ** 3,
    bytesPerWorkingTexel: 100,
    preferredCoreWidth: 50,
    preferredCoreHeight: 30,
})

function fingerprintInput() {
    return {
        path: {to: 'B', from: 'A'},
        render: {palette: ['black', 'white']},
        animation: {speed: 1},
        tilePlan: plan,
        aaSamplesPerFrame: 4,
        codec: 'avc',
        aggregateBitrate: 400_000_000,
        fps: 30,
        totalFrames: 1800,
        frameTimestampsMicros: [0, 33333, 66667],
    }
}

describe('tiled video manifest', () => {
    it('canonicalizes object key order and hashes all render inputs', async () => {
        expect(stableFingerprintJson({b: 2, a: {d: 4, c: 3}}))
            .toBe('{"a":{"c":3,"d":4},"b":2}')
        const a = await computeTiledVideoFingerprint(fingerprintInput())
        const b = await computeTiledVideoFingerprint({...fingerprintInput(), fps: 60})
        expect(a).toHaveLength(64)
        expect(a).not.toBe(b)
    })

    it('round-trips, marks completed tiles idempotently and identifies missing tiles', () => {
        const manifest = createTiledVideoManifest({
            sessionId: 'session-1', fingerprint: 'abc', tilePlan: plan,
            codec: 'avc', aggregateBitrate: 400_000_000, fps: 30, totalFrames: 1800,
            now: new Date('2026-01-01T00:00:00Z'),
        })
        const updated = markTileCompleted(manifest, {
            tileIndex: 0, fileName: 'tile-0.mp4', bytes: 42,
            completedAt: '2026-01-01T00:01:00Z',
        }, new Date('2026-01-01T00:01:00Z'))
        const replaced = markTileCompleted(updated, {
            tileIndex: 0, fileName: 'tile-0.mp4', bytes: 43,
            completedAt: '2026-01-01T00:02:00Z',
        })
        const parsed = parseTiledVideoManifest(JSON.stringify(replaced))
        expect(parsed.completedTiles).toHaveLength(1)
        expect(parsed.completedTiles[0].bytes).toBe(43)
        expect(resumeCompatibility(parsed, 'abc')).toEqual({
            compatible: true,
            missingTileIndices: plan.tiles.slice(1).map(tile => tile.index),
        })
        expect(resumeCompatibility(parsed, 'different').compatible).toBe(false)
    })

    it('rejects insufficient quota including the reserve', () => {
        expect(() => assertTemporaryCapacity(1_000, {
            quotaBytes: 10_000, usageBytes: 9_000, availableBytes: 1_000,
        }, 0.1)).toThrow(/insuffisant/)
        expect(() => assertTemporaryCapacity(900, {
            quotaBytes: 10_000, usageBytes: 9_000, availableBytes: 1_000,
        }, 0.1)).not.toThrow()
        expect(() => assertTemporaryCapacity(10 ** 12, {
            quotaBytes: null, usageBytes: null, availableBytes: null,
        })).not.toThrow()
    })

    it('persists atomically and cleans a simulated temporary session', async () => {
        const files = new Map<string, string>()
        const store: TemporaryVideoStore = {
            async estimate() { return {quotaBytes: 1000, usageBytes: 0, availableBytes: 1000} },
            async createWritable() { return new WritableStream<Uint8Array>() },
            async readBlob(sessionId, fileName) {
                return new Blob([files.get(`${sessionId}/${fileName}`) ?? ''])
            },
            async writeTextAtomic(sessionId, fileName, text) {
                files.set(`${sessionId}/${fileName}`, text)
            },
            async readText(sessionId, fileName) {
                return files.get(`${sessionId}/${fileName}`) ?? null
            },
            async listSessions() {
                return [...new Set([...files.keys()].map(key => key.split('/')[0]))].sort()
            },
            async removeSession(sessionId) {
                for (const key of [...files.keys()]) {
                    if (key.startsWith(`${sessionId}/`)) files.delete(key)
                }
            },
        }
        const manifest = createTiledVideoManifest({
            sessionId: 'cleanup', fingerprint: 'hash', tilePlan: plan,
            codec: 'avc', aggregateBitrate: 10, fps: 30, totalFrames: 2,
        })
        await persistTiledVideoManifest(store, manifest)
        expect(parseTiledVideoManifest((await store.readText('cleanup', 'manifest.json'))!))
            .toMatchObject({sessionId: 'cleanup', fingerprint: 'hash'})
        expect(await store.listSessions()).toEqual(['cleanup'])
        await store.removeSession('cleanup')
        expect(await store.readText('cleanup', 'manifest.json')).toBeNull()
    })
})
