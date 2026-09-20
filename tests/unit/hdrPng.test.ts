import { describe, expect, it } from 'vitest'
import { inflateSync } from 'node:zlib'
import { encodeHdrPng, halfToFloat, pqEncode, linearSrgbToRec2020 } from '../../src/hdrPng'

function pqDecode(value: number) {
  const p = value ** (32 / 2523)
  return 10000 * (Math.max(p - 3424 / 4096, 0) / (2413 / 128 - 2392 / 128 * p)) ** (16384 / 2610)
}

describe('HDR PNG encoding', () => {
  it('retains >1 highlights through native compression in a signalled 16-bit PQ PNG', async () => {
    const blob = await encodeHdrPng(2, 1, new Uint16Array([0x3c00,0x3c00,0x3c00,0x3c00, 0x4400,0x4400,0x4400,0x3c00]))
    const bytes = new Uint8Array(await blob.arrayBuffer()), view = new DataView(bytes.buffer)
    expect(Array.from(bytes.slice(0,8))).toEqual([137,80,78,71,13,10,26,10])
    const chunks = new Map<string, Uint8Array[]>(); let offset = 8
    while (offset < bytes.length) {
      const size = view.getUint32(offset), type = new TextDecoder().decode(bytes.slice(offset+4,offset+8))
      const data = bytes.slice(offset+8,offset+8+size)
      // Independent bitwise CRC reference checks the actual file framing.
      let crc = 0xffffffff
      for (const b of bytes.slice(offset+4,offset+8+size)) {
        crc ^= b
        for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
      }
      expect(view.getUint32(offset+8+size)).toBe((crc ^ 0xffffffff) >>> 0)
      chunks.set(type, [...(chunks.get(type) ?? []), data]); offset += size + 12
    }
    expect(Array.from(chunks.get('IHDR')![0].slice(8))).toEqual([16,2,0,0,0])
    expect(Array.from(chunks.get('cICP')![0])).toEqual([9,16,0,1])
    const pixels = inflateSync(Buffer.concat(chunks.get('IDAT')!))
    expect(pixels.length).toBe(13); expect(pixels[0]).toBe(0)
    for (let c = 0; c < 3; c++) {
      expect(pqDecode(pixels.readUInt16BE(1+c*2)/65535)).toBeCloseTo(203, 0)
      expect(pqDecode(pixels.readUInt16BE(7+c*2)/65535)).toBeCloseTo(812, 0)
    }
  })
  it('rejects overflowing highlights instead of silently clipping them', async () => {
    await expect(encodeHdrPng(1,1,new Uint16Array([0x6400,0x6400,0x6400,0x3c00]))).rejects.toThrow('10 000')
    await expect(encodeHdrPng(1,1,new Uint16Array([0x7c00,0,0,0x3c00]))).rejects.toThrow('invalide')
  })
  it('honors cancellation and checks dimensions', async () => {
    const abort = new AbortController(); abort.abort()
    await expect(encodeHdrPng(1,1,new Uint16Array(4),{signal:abort.signal})).rejects.toMatchObject({name:'AbortError'})
    await expect(encodeHdrPng(2,1,new Uint16Array(4))).rejects.toThrow('Dimensions')
  })
  it('uses ST2084 endpoints, float16 subnormals and the Rec.2020 color transform', () => {
    expect(pqEncode(10000)).toBe(1)
    expect(pqDecode(pqEncode(100))).toBeCloseTo(100,8)
    expect(halfToFloat(1)).toBe(2 ** -24)
    expect(halfToFloat(0xbc00)).toBe(-1)
    expect(halfToFloat(0x7e00)).toBeNaN()
    expect(linearSrgbToRec2020(1,1,1)).toEqual([1,1,1])
    expect(linearSrgbToRec2020(1,0,0)[0]).toBeCloseTo(0.6274,4)
  })
})
