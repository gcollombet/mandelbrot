import { nameForCatalogReference } from './catalogIdentity'
import { ensureTextureLibrary, storedTextureObjectUrl, textureSourceKey } from './textureLibrary'
import type { StudioLook } from './studioParcours'
import type { StudioTextures } from './studioPlayer'

// Tile and skybox textures a studio look refers to, as the engine's preset
// transition wants them: an object URL plus the source key the engine uses to
// recognise a texture it already holds. Same resolution as a preset travel:
// catalog reference → stored blob, with the engine's defaults as fallback.

export async function resolveStudioTextures(look: StudioLook): Promise<StudioTextures> {
  const textures = await ensureTextureLibrary()
  const urls: string[] = []
  const resolve = async (kind: 'tile' | 'skybox') => {
    const name = nameForCatalogReference(textures,
      kind === 'tile' ? look.textureGuid : look.skyboxGuid,
      kind === 'tile' ? look.textureName : look.skyboxName)
    const fallback = kind === 'tile' ? 'Gold' : 'Window'
    const effective = name && textures.some(t => t.name === name) ? name : fallback
    const url = await storedTextureObjectUrl(effective)
    if (!url) throw new Error(`Texture introuvable : ${effective}`)
    urls.push(url)
    return { url, key: textureSourceKey(effective, textures) }
  }
  const tile = await resolve('tile')
  const sky = await resolve('skybox')
  return { tile, sky, release: () => { for (const url of urls) if (url.startsWith('blob:')) URL.revokeObjectURL(url) } }
}
