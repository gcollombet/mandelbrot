import {getEffectValue} from './ColorStop'
import { ensureTextureLibrary, storedTextureObjectUrl, textureSourceKey } from './textureLibrary'
import { nameForCatalogReference } from './catalogIdentity'
import type { PalettePath, PathAppearance } from './palettePath'
const EMPTY_IMAGE = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22/%3E'
export type PathImage = { key: string; url: string; hash: string; role: 'tile' | 'sky' }
/** Resolve by stable catalogue identity and check frozen resource contents on resume. */
export async function resolvePalettePathImages(path: PalettePath, base: PathAppearance) {
    const entries = await ensureTextureLibrary(), images: PathImage[] = [], indices: { tile: number; sky: number }[] = []
    try {
        for (const [appearanceIndex, appearance] of [base, ...path.stops.map(s => s.appearance)].entries()) {
            const pair = { tile: 0, sky: 0 }
            for (const role of ['tile', 'sky'] as const) {
                const used = (appearanceIndex > 0 || path.outside === 'manual') && appearance.colorStops.some(s => role === 'tile'
                    ? getEffectValue(s, 'tessellation') > 0
                    : getEffectValue(s, 'shading') > 0 && getEffectValue(s, 'skybox') > 0)
                if (!used) {
                    let index = images.findIndex(i => i.key === `${role}:unused`)
                    if (index < 0) { index = images.length; images.push({ key: `${role}:unused`, role, url: EMPTY_IMAGE, hash: 'sha256:' + '0'.repeat(64) }) }
                    pair[role] = index
                    continue
                }
                const guid = role === 'tile' ? appearance.textureGuid : appearance.skyboxGuid
                const requestedName = role === 'tile' ? appearance.textureName : appearance.skyboxName
                const fallback = role === 'tile' ? 'Gold' : 'Window'
                const name = nameForCatalogReference(entries, guid, requestedName) ?? fallback
                if (!entries.some(e => e.name === name)) throw new Error(`Image du parcours introuvable : ${name}`)
                const key = `${role}:${textureSourceKey(name, entries)}`
                let index = images.findIndex(i => i.key === key)
                if (index < 0) {
                    const url = await storedTextureObjectUrl(name)
                    if (!url) throw new Error(`Image du parcours introuvable : ${name}`)
                    images.push({ key, url, hash: '', role }); index = images.length - 1
                    const bytes = await (await fetch(url)).arrayBuffer()
                    const hash = 'sha256:' + Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('')
                    images[index].hash = hash
                    if (path.resourceHashes && path.resourceHashes[key] !== hash) throw new Error(`L’image ${name} a changé depuis la cuisson du parcours.`)
                }
                pair[role] = index
            }
            indices.push(pair)
        }
        return { images, indices, dispose: () => images.forEach(i => URL.revokeObjectURL(i.url)) }
    } catch (e) { images.forEach(i => URL.revokeObjectURL(i.url)); throw e }
}
