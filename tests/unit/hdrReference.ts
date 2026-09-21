// CPU reference for tests only. Production color conversion is WGSL.
export function halfToFloat(bits: number): number {
  const sign = bits & 0x8000 ? -1 : 1
  const exponent = (bits >> 10) & 31, fraction = bits & 1023
  if (exponent === 31) return fraction ? NaN : sign * Infinity
  return sign * (exponent ? (1 + fraction / 1024) * 2 ** (exponent - 15) : fraction * 2 ** -24)
}

export function pqEncode(nits: number): number {
  const p = (Math.max(0, Math.min(10000, nits)) / 10000) ** (2610 / 16384)
  return ((3424 / 4096 + (2413 / 128) * p) / (1 + (2392 / 128) * p)) ** (2523 / 32)
}

export function linearSrgbToRec2020(r: number, g: number, b: number): [number, number, number] {
  return [0.6274039*r + 0.3292830*g + 0.0433131*b,
    0.0690973*r + 0.9195404*g + 0.0113623*b,
    0.0163914*r + 0.0880133*g + 0.8955953*b]
}

/** Linear float16 RGB → PQ Rec.2020 → limited-range planar 10-bit 4:2:0.
 * Chroma averages unquantized, PQ-encoded samples. Samples are little-endian,
 * right-aligned uint16 as required by I420P10 (not P010's left alignment).
 */
export async function hdrVideoPlanes(width: number, height: number, rgba: Uint16Array,
  exposure = 0, signal?: { readonly aborted: boolean }): Promise<Uint16Array> {
  if (![width,height].every(n => Number.isSafeInteger(n) && n > 0 && n % 2 === 0) || rgba.length !== width*height*4) throw new Error('Dimensions HDR vidéo invalides.')
  if (!Number.isFinite(exposure) || exposure < -16 || exposure > 16) throw new Error('Exposition HDR invalide.')
  const lumaSize = width*height, chromaSize = lumaSize/4, out = new Uint16Array(lumaSize + 2*chromaSize)
  const scale = 203 * 2 ** exposure
  const quantize = (v: number, x: number, y: number, chroma = false) => {
    const noise = (52.9829189 * ((x*0.06711056 + y*0.00583715) % 1)) % 1 - 0.5
    return Math.max(64, Math.min(chroma ? 960 : 940, Math.round((chroma ? 512 + 896*v : 64 + 876*v) + noise)))
  }
  for (let y = 0; y < height; y += 2) {
    if (y && y % 32 === 0) await new Promise(resolve => setTimeout(resolve, 0))
    if (signal?.aborted) throw new DOMException('Export annulé', 'AbortError')
    for (let x = 0; x < width; x += 2) {
      let cb = 0, cr = 0
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const i = ((y+dy)*width+x+dx)*4
        const red = halfToFloat(rgba[i]), green = halfToFloat(rgba[i+1]), blue = halfToFloat(rgba[i+2])
        if (![red,green,blue].every(Number.isFinite)) throw new Error('Valeur HDR vidéo non finie.')
        const rgb = linearSrgbToRec2020(red,green,blue)
        for (let c = 0; c < 3; c++) {
          const nits = Math.max(0,rgb[c])*scale
          if (!Number.isFinite(nits) || nits > 10000) throw new Error('Hautes lumières hors plage HDR PQ (10 000 nits). Réduire l’exposition ou les reflets.')
          rgb[c] = pqEncode(nits)
        }
        // Difference form keeps exactly neutral RGB neutral despite rounding.
        const luma = rgb[1] + .2627*(rgb[0]-rgb[1]) + .0593*(rgb[2]-rgb[1])
        out[(y+dy)*width+x+dx] = quantize(luma,x+dx,y+dy)
        cb += (rgb[2]-luma)/(2*(1-.0593)); cr += (rgb[0]-luma)/(2*(1-.2627))
      }
      const c = (y/2)*(width/2)+x/2
      out[lumaSize+c] = quantize(cb/4,x,y,true)
      out[lumaSize+chromaSize+c] = quantize(cr/4,x+1,y,true)
    }
  }
  return out
}

