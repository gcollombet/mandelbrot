/**
 * Provenance stamped into exported stills: an XMP packet (read by exiftool,
 * Photoshop, Lightroom…) naming this app as the creator tool and carrying the
 * exact view, so an image can be traced back and reopened at its location.
 * Metadata only: re-encoding (social networks, screenshots) drops it.
 */

export const PROVENANCE_TOOL = 'Mandelbrot — https://gcollombet.github.io/mandelbrot/'
const NS = 'https://gcollombet.github.io/mandelbrot/ns/1.0/'

export type ImageProvenance = {
  cx: string
  cy: string
  scale: string
  angle: number
}

const crcTable = Uint32Array.from({ length: 256 }, (_, i) => {
  let c = i
  for (let bit = 0; bit < 8; bit++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

export function pngChunk(type: string, data: Uint8Array): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(data.length + 12), view = new DataView(bytes.buffer)
  view.setUint32(0, data.length)
  for (let i = 0; i < 4; i++) bytes[4+i] = type.charCodeAt(i)
  bytes.set(data, 8)
  let crc = 0xffffffff
  for (let i = 4; i < bytes.length - 4; i++) crc = crcTable[(crc ^ bytes[i]) & 255] ^ (crc >>> 8)
  view.setUint32(bytes.length - 4, (crc ^ 0xffffffff) >>> 0)
  return bytes
}

const escapeXml = (s: string) => s.replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]!)

export function provenanceXmp(p: ImageProvenance, date = new Date()): string {
  return `<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
 <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
  <rdf:Description rdf:about=""
    xmlns:xmp="http://ns.adobe.com/xap/1.0/"
    xmlns:mandelbrot="${NS}"
    xmp:CreatorTool="${escapeXml(PROVENANCE_TOOL)}"
    xmp:CreateDate="${date.toISOString()}"
    mandelbrot:cx="${escapeXml(p.cx)}"
    mandelbrot:cy="${escapeXml(p.cy)}"
    mandelbrot:scale="${escapeXml(p.scale)}"
    mandelbrot:angle="${p.angle}"/>
 </rdf:RDF>
</x:xmpmeta>
<?xpacket end="r"?>`
}

const utf8 = (s: string) => new TextEncoder().encode(s)

function pngProvenanceChunks(p: ImageProvenance): Uint8Array<ArrayBuffer>[] {
  const latin = (s: string) => Uint8Array.from(s, c => c.charCodeAt(0) & 0xff)
  // tEXt "Software" is what most viewers show; it must stay Latin-1.
  const software = pngChunk('tEXt', new Uint8Array([...latin('Software'), 0, ...latin(PROVENANCE_TOOL.replace('—', '-'))]))
  // iTXt keyword, then compression flag/method 0, empty language and translated keyword.
  const xmp = pngChunk('iTXt', new Uint8Array([...latin('XML:com.adobe.xmp'), 0, 0, 0, 0, 0, ...utf8(provenanceXmp(p))]))
  return [software, xmp]
}

/** Insert the provenance chunks right after IHDR (signature 8 + IHDR 25 bytes). */
export function withPngProvenance(png: Blob, p: ImageProvenance): Blob {
  return new Blob([png.slice(0, 33), ...pngProvenanceChunks(p), png.slice(33)], { type: 'image/png' })
}

function riffChunk(type: string, data: Uint8Array): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(8 + data.length + (data.length & 1)), view = new DataView(bytes.buffer)
  for (let i = 0; i < 4; i++) bytes[i] = type.charCodeAt(i)
  view.setUint32(4, data.length, true)
  bytes.set(data, 8)
  return bytes
}

/** Add an XMP chunk, promoting a simple VP8/VP8L file to the extended VP8X layout. */
export async function withWebpProvenance(webp: Blob, width: number, height: number, p: ImageProvenance): Promise<Blob> {
  const bytes = new Uint8Array(await webp.arrayBuffer())
  const tag = (o: number) => String.fromCharCode(...bytes.subarray(o, o + 4))
  if (tag(0) !== 'RIFF' || tag(8) !== 'WEBP') return webp
  const first = tag(12)
  let body: Uint8Array
  if (first === 'VP8X') {
    body = bytes.slice(12)
    body[8] |= 0x04 // XMP flag
  } else if (first === 'VP8 ' || first === 'VP8L') {
    // VP8L: alpha_is_used is bit 28 of the 32 bits after the 0x2f signature.
    const alpha = first === 'VP8L' && (new DataView(bytes.buffer).getUint32(21, true) >>> 28 & 1) === 1
    const vp8x = new Uint8Array(10)
    vp8x[0] = 0x04 | (alpha ? 0x10 : 0)
    const w = width - 1, h = height - 1
    vp8x.set([w & 255, w >> 8 & 255, w >> 16 & 255, h & 255, h >> 8 & 255, h >> 16 & 255], 4)
    body = new Uint8Array([...riffChunk('VP8X', vp8x), ...bytes.subarray(12)])
  } else return webp
  const xmp = riffChunk('XMP ', utf8(provenanceXmp(p)))
  const out = new Uint8Array(12 + body.length + xmp.length)
  out.set(bytes.subarray(0, 12)); out.set(body, 12); out.set(xmp, 12 + body.length)
  new DataView(out.buffer).setUint32(4, out.length - 8, true)
  return new Blob([out], { type: 'image/webp' })
}

/** Read the provenance back from a PNG or WebP exported by this app; null otherwise. */
export async function readImageProvenance(file: Blob): Promise<(ImageProvenance & { tool: string; date?: string }) | null> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  const view = new DataView(bytes.buffer)
  const tag = (o: number) => String.fromCharCode(...bytes.subarray(o, o + 4))
  let xmp: string | null = null
  if (String.fromCharCode(...bytes.subarray(0, 8)) === '\x89PNG\r\n\x1a\n') {
    for (let o = 8; o + 12 <= bytes.length;) {
      const len = view.getUint32(o), type = tag(o + 4)
      if (type === 'IDAT' || type === 'IEND') break
      const data = bytes.subarray(o + 8, o + 8 + len)
      if (type === 'iTXt' && new TextDecoder('latin1').decode(data.subarray(0, 18)) === 'XML:com.adobe.xmp\0') {
        // keyword\0, flag, method, language\0, translated keyword\0, text
        let i = 18 + 2
        while (data[i] !== 0) i++
        i++
        while (data[i] !== 0) i++
        xmp = new TextDecoder().decode(data.subarray(i + 1))
        break
      }
      o += 12 + len
    }
  } else if (tag(0) === 'RIFF' && tag(8) === 'WEBP') {
    for (let o = 12; o + 8 <= bytes.length;) {
      const len = view.getUint32(o + 4, true)
      if (tag(o) === 'XMP ') { xmp = new TextDecoder().decode(bytes.subarray(o + 8, o + 8 + len)); break }
      o += 8 + len + (len & 1)
    }
  }
  if (!xmp || !xmp.includes(NS)) return null
  const attr = (name: string) => {
    const m = xmp!.match(new RegExp(`${name}="([^"]*)"`))
    return m ? m[1].replace(/&quot;|&lt;|&gt;|&amp;/g, e => ({ '&quot;': '"', '&lt;': '<', '&gt;': '>', '&amp;': '&' })[e]!) : undefined
  }
  const cx = attr('mandelbrot:cx'), cy = attr('mandelbrot:cy'), scale = attr('mandelbrot:scale')
  if (cx === undefined || cy === undefined || scale === undefined) return null
  return { cx, cy, scale, angle: Number(attr('mandelbrot:angle') ?? 0), tool: attr('xmp:CreatorTool') ?? '', date: attr('xmp:CreateDate') }
}
