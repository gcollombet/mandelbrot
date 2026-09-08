import { ExpmapStore } from './store'
import { decodeImageTile } from './imageDecode'
import type { ExpmapManifest } from './manifest'
let store:ExpmapStore|undefined,manifest:ExpmapManifest|undefined,busy=false
self.onmessage=async({data})=>{
  if(busy) {self.postMessage({id:data.id,error:{name:'Error',message:'Décodage déjà en cours'}});return}
  busy=true
  let bitmap:ImageBitmap|undefined
  try {
    if(data.kind==='init') {
      store=data.directory?new ExpmapStore(data.directory):await ExpmapStore.fromFile(data.file)
      manifest=await store.open(data.documentId)
      self.postMessage({id:data.id})
    }else {
      if(data.kind!=='read'||!store||!manifest||!Number.isInteger(data.index)||!manifest.tiles[data.index])throw new Error('Tuile ExpMap invalide')
      const o=manifest.octaves
      bitmap=await decodeImageTile(await store.readTile(manifest.tiles[data.index]),o.tileWidth,o.tileHeight)
      self.postMessage({id:data.id,bitmap},{transfer:[bitmap]});bitmap=undefined
    }
  }catch(error){self.postMessage({id:data.id,error:{name:error instanceof Error?error.name:'Error',message:String(error)}})}
  finally {bitmap?.close();busy=false}
}
