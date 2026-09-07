import { validateTileDimensions, MAX_IMAGE_BYTES } from './imageLimits'
self.onmessage = async ({data}) => {
  try {
    const {rgba,width,height,quality,thumbnail:makeThumbnail}=data
    validateTileDimensions(width,height)
    if(!Number.isFinite(quality)||quality<0||quality>1||rgba.length!==width*height*4) throw new Error('Invalid WebP input')
    const start=performance.now(), canvas=new OffscreenCanvas(width,height),ctx=canvas.getContext('2d',{alpha:false})!
    ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba.buffer,rgba.byteOffset,rgba.byteLength),width,height),0,0)
    const blob=await canvas.convertToBlob({type:'image/webp',quality})
    if(blob.type!=='image/webp') throw new Error('Encodage WebP natif indisponible dans ce navigateur')
    if(blob.size>MAX_IMAGE_BYTES)throw new Error('WebP exceeds encoded tile budget')
    let thumbnail=''
    if(makeThumbnail) {
      const small=new OffscreenCanvas(160,90)
      small.getContext('2d')!.drawImage(canvas,0,0,160,90)
      const preview=await small.convertToBlob({type:'image/webp',quality:0.75})
      const array=new Uint8Array(await preview.arrayBuffer())
      thumbnail=`data:${preview.type};base64,${btoa(String.fromCharCode(...array))}`
    }
    const bytes=new Uint8Array(await blob.arrayBuffer())
    canvas.width=1;canvas.height=1
    self.postMessage({bytes,thumbnail,milliseconds:performance.now()-start},{transfer:[bytes.buffer]})
  } catch(error) { self.postMessage({error:String(error)}) }
}
