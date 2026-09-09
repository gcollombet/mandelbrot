import { validatePalettePath, type PalettePath } from './palettePath'
const KEY = 'mandelbrot.palette-paths.v1'
/** Storage boundary deliberately independent of Vue and rendering; Firestore can replace it. */
export function readPalettePaths(storage: Pick<Storage, 'getItem'> = localStorage): PalettePath[] {
    const raw = storage.getItem(KEY)
    if (!raw) return []
    const values = JSON.parse(raw)
    if (!Array.isArray(values)) throw new Error('Bibliothèque de parcours illisible.')
    return values.map(validatePalettePath)
}
export function savePalettePath(path: PalettePath, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage) {
    const valid = validatePalettePath(path), entries = readPalettePaths(storage)
    storage.setItem(KEY, JSON.stringify([...entries.filter(p => p.id !== valid.id), valid]))
}
export function deletePalettePath(id: string, storage: Pick<Storage, 'getItem' | 'setItem'> = localStorage) {
    storage.setItem(KEY, JSON.stringify(readPalettePaths(storage).filter(p => p.id !== id)))
}
