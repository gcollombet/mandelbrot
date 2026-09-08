import type { ExpmapManifest } from './manifest'
import type { ExpmapStore } from './store'
import { decodeImageTile } from './imageDecode'
export type ExpmapImageFormat='image/png'|'image/jpeg'|'image/webp'
export function validateImageExport(width:number,height:number,format:ExpmapImageFormat,quality:number) {
  if(!['image/png','image/jpeg','image/webp'].includes(format))throw new Error('Format image non pris en charge')
  const max=format==='image/webp'?16383:32767
  if(![width,height].every(v=>Number.isInteger(v)&&v>0&&v<=max)||width*height>32*1024*1024)throw new Error('Export limité à 32 mégapixels et aux dimensions du format. Réduire la résolution.')
  if(!Number.isFinite(quality)||quality<0||quality>1)throw new Error('Qualité invalide')
}
/** Pixel-centre mapping to complete doublings; omit storage halos and padding. */
export function imageExportBands(m:ExpmapManifest,height:number) {
  const count=m.octaves.tileCount
  return Array.from({length:count},(_,index)=>({index,
    first:Math.max(0,Math.ceil(index*height/count-0.5)),
    end:Math.min(height,Math.ceil((index+1)*height/count-0.5)),
    y:index*height/count, height:height/count})).filter(b=>b.end>b.first)
}
export async function exportExpmapImage(store:ExpmapStore,m:ExpmapManifest,options:{width:number;height:number;format:ExpmapImageFormat;quality:number;signal?:AbortSignal;onProgress?:(done:number,total:number)=>void}) {
  const {width,height,format,quality,signal}=options
  if(m.state!=='complete')throw new Error('Document complet requis')
  validateImageExport(width,height,format,quality)
  const canvas=new OffscreenCanvas(width,height),ctx=canvas.getContext('2d',{alpha:false})!
  if(!ctx)throw new Error('Canvas image indisponible')
  const o=m.octaves,bands=imageExportBands(m,height)
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high'
  try {
    for(const [n,band] of bands.entries()) {
      signal?.throwIfAborted()
      const bitmap=await decodeImageTile(await store.readTile(m.tiles[band.index]),o.tileWidth,o.tileHeight)
      try {
        signal?.throwIfAborted()
        // Draw complete integer output rows. Fractional destination edges can
        // leave partially covered (black) rows when the source halo shrinks to
        // less than half an output pixel. Each doubling owns this exact range;
        // rounding changes its displayed height by less than one output pixel.
        ctx.drawImage(bitmap,o.halo,o.halo,o.angularSamples,o.rowsPerOctave,
          0,band.first,width,band.end-band.first)
      } finally {bitmap.close()}
      options.onProgress?.(n+1,bands.length)
    }
    signal?.throwIfAborted()
    const blob=await canvas.convertToBlob({type:format,quality})
    signal?.throwIfAborted()
    if(blob.type!==format)throw new Error('Ce navigateur ne sait pas encoder ce format')
    return blob
  } finally {canvas.width=1;canvas.height=1}
}
