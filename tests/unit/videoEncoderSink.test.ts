import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Quality } from 'mediabunny'
import { createVideoSink, probeMp4Codecs, selectVideoEncoder } from '../../src/videoEncoderSink'

const mocks = vi.hoisted(() => ({ canEncode: vi.fn(), source: vi.fn(), track: vi.fn() }))
vi.mock('mediabunny', async importOriginal => ({
  ...await importOriginal<typeof import('mediabunny')>(),
  canEncodeVideo: mocks.canEncode,
  VideoSampleSource: class { constructor(options: unknown) { mocks.source(options) } },
  Output: class {
    addVideoTrack(...args: unknown[]) { mocks.track(...args) }
    async start() {}
    async cancel() {}
  },
}))
beforeEach(() => vi.resetAllMocks())
const settings = { codec: 'avc' as const, width: 3840, height: 2160, fps: 60 }

describe('hardware-first encoder selection', () => {
  it('keeps hardware when accepted, without probing fallback', async () => {
    mocks.canEncode.mockResolvedValue(true)
    await expect(selectVideoEncoder(settings)).resolves.toBe('prefer-hardware')
    expect(mocks.canEncode).toHaveBeenCalledOnce()
    expect(mocks.canEncode).toHaveBeenCalledWith('avc', expect.objectContaining({ width: 3840, height: 2160, framerate: 60, hardwareAcceleration: 'prefer-hardware' }))
  })

  it.each(['rejection', 'exception'])('uses the accepted fallback in the actual sink after hardware %s', async failure => {
    if (failure === 'exception') mocks.canEncode.mockRejectedValueOnce(new Error('Driver unavailable'))
    else mocks.canEncode.mockResolvedValueOnce(false)
    mocks.canEncode.mockResolvedValueOnce(true)
    const quality = new Quality({ bitrate: 100e6 })
    const sink = await createVideoSink({ ...settings, quality, hardwareAcceleration: 'prefer-hardware', destination: { kind: 'buffer' } })
    expect(mocks.canEncode.mock.calls.map(call => call[1].hardwareAcceleration)).toEqual(['prefer-hardware', 'no-preference'])
    expect(mocks.canEncode.mock.calls.every(call => call[1].quality === quality && call[1].framerate === 60)).toBe(true)
    expect(mocks.source).toHaveBeenCalledWith(expect.objectContaining({ codec: 'avc', quality, hardwareAcceleration: 'no-preference' }))
    expect(mocks.track).toHaveBeenCalledWith(expect.anything(), { frameRate: 60 })
    await sink.cancel()
  })

  it('keeps fallback codecs available in the UI and reports their selection', async () => {
    mocks.canEncode.mockImplementation(async (_codec, options) => options.hardwareAcceleration === 'no-preference')
    const selected = vi.fn()
    expect(await probeMp4Codecs(3840, 2160, 60, selected)).toEqual({ avc: true, hevc: true, av1: true, vp9: true })
    expect(selected).toHaveBeenCalledWith('hevc', 'no-preference')
    expect(mocks.canEncode).toHaveBeenCalledTimes(8)
  })

  it('reports both failures and the actual requested format, before creating an output source', async () => {
    mocks.canEncode.mockRejectedValueOnce(new Error('Driver unavailable')).mockResolvedValueOnce(false)
    await expect(createVideoSink({ ...settings, destination: { kind: 'buffer' } })).rejects.toThrow(/AVC.*3840×2160.*60 images\/s.*prefer-hardware.*Driver unavailable.*no-preference.*configuration refusée/)
    expect(mocks.source).not.toHaveBeenCalled()
  })

  it('respects an explicit software preference', async () => {
    mocks.canEncode.mockResolvedValue(true)
    await expect(selectVideoEncoder({ ...settings, hardwareAcceleration: 'prefer-software' })).resolves.toBe('prefer-software')
    expect(mocks.canEncode).toHaveBeenCalledOnce()
  })
})
