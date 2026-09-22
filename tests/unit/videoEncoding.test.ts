import { describe, expect, it } from 'vitest'
import { normalizeVideoEncoding, videoBitrate, rateControlledCodec } from '../../src/videoEncoding'
import { hdrEncoderConfig } from '../../src/hdrVideo'
import { normalizeVideoExportPreferences } from '../../src/videoExportPreferences'

describe('explicit video bitrate profiles', () => {
  it.each([
    ['avc', 60, 150, 300], ['hevc', 40, 100, 200], ['vp9', 40, 100, 200], ['av1', 30, 75, 150],
  ] as const)('scales %s linearly with pixels and fps', (codec, standard, high, maximum) => {
    for (const [profile, rate] of [['standard', standard], ['high', high], ['maximum', maximum]] as const) {
      const encoding = { profile, bitrateMbps: 123 }
      expect(videoBitrate(codec, 3840, 2160, 30, encoding)).toBe(rate * 1e6)
      expect(videoBitrate(codec, 3840, 2160, 60, encoding)).toBe(rate * 2e6)
      expect(videoBitrate(codec, 1920, 1080, 30, encoding)).toBe(rate * 1e6 / 4)
      expect(videoBitrate(codec, 3840, 2160, 24, encoding)).toBe(rate * 0.8e6)
    }
  })
  it('keeps custom bitrate fixed regardless of dimensions or cadence', () => {
    const encoding = { profile: 'custom' as const, bitrateMbps: 123.4 }
    expect(videoBitrate('hevc', 1920, 1080, 24, encoding)).toBe(123400000)
    expect(videoBitrate('av1', 3840, 2160, 60, encoding)).toBe(123400000)
    expect(() => videoBitrate('hevc', 3840, 2160, 60, { ...encoding, bitrateMbps: NaN })).toThrow()
  })
  it('migrates old preferences to high quality and preserves explicit choices', () => {
    expect(normalizeVideoExportPreferences({}).encoding).toEqual({ profile: 'high', bitrateMbps: 100 })
    expect(normalizeVideoEncoding({ profile: 'bad', bitrateMbps: Infinity })).toEqual({ profile: 'high', bitrateMbps: 100 })
    const encoding = { profile: 'custom' as const, bitrateMbps: 87 }
    expect(normalizeVideoExportPreferences({ encoding }).encoding).toEqual(encoding)
  })
  it.each(['hevc','vp9','av1'] as const)('requests HDR CBR and ignores stale quantizer for %s', codec => {
    const config = hdrEncoderConfig({codec, width:3840, height:2160, fps:60, quantizer:10, encoding:{profile:'high',bitrateMbps:100}}, 'prefer-hardware')
    expect(config).toMatchObject({ bitrateMode:'constant', bitrate:videoBitrate(codec,3840,2160,60), latencyMode:'quality' })
  })
  it('raises codec levels and tiers to accommodate requested budgets', () => {
    expect(rateControlledCodec('hevc',3840,2160,200e6,true)).toBe('hvc1.2.4.H156.B0')
    expect(rateControlledCodec('hevc',3840,2160,400e6)).toBe('hev1.1.6.H183.B0')
    expect(rateControlledCodec('av1',3840,2160,150e6,true)).toContain('13H.10')
    expect(rateControlledCodec('vp9',3840,2160,400e6,true)).toContain('vp09.02.62.10')
    expect(() => rateControlledCodec('vp9',3840,2160,1000e6,true)).toThrow()
  })
})
