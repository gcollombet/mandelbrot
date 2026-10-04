import { reactive, shallowRef } from 'vue'
import type { StudioCamera, StudioLook } from './studioParcours'
import { snapshotStudioCamera, snapshotStudioLook } from './studioParcours'

// ── Studio bin ──
// The places and looks picked for editing, in named collections shared by
// every parcours (like a media pool). An item is a self-contained copy: a
// camera or a look, a name and a small thumbnail. Stored in localStorage.

export type BinKind = 'place' | 'look'
export type BinItem = { id: string; kind: BinKind; name: string; thumb?: string; camera?: StudioCamera; look?: StudioLook }
export type BinCollection = { id: string; name: string; items: BinItem[] }
export type StudioBin = { version: 1; collections: BinCollection[] }

export const STUDIO_BIN_KEY = 'mandelbrot_studio_bin'
export const BIN_MAX_COLLECTIONS = 32
export const BIN_MAX_ITEMS = 128
export const BIN_THUMB_WIDTH = 128
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>

export function newBinCollection(name: string): BinCollection {
  return { id: crypto.randomUUID(), name: name.trim().slice(0, 40) || '—', items: [] }
}

/** Malformed items are dropped rather than refusing the whole bin. */
export function validateStudioBin(value: unknown): StudioBin {
  const raw = value as StudioBin
  const collections: BinCollection[] = []
  for (const c of Array.isArray(raw?.collections) ? raw.collections.slice(0, BIN_MAX_COLLECTIONS) : []) {
    if (!c || typeof c.id !== 'string' || !c.id || collections.some(x => x.id === c.id)) continue
    const items: BinItem[] = []
    for (const item of Array.isArray(c.items) ? c.items.slice(0, BIN_MAX_ITEMS) : []) {
      if (!item || typeof item.id !== 'string' || !item.id || items.some(x => x.id === item.id)) continue
      const base = { id: item.id, name: typeof item.name === 'string' ? item.name.slice(0, 80) : '', ...(typeof item.thumb === 'string' && item.thumb.startsWith('data:image/') ? { thumb: item.thumb } : {}) }
      try {
        if (item.kind === 'place' && item.camera) items.push({ ...base, kind: 'place', camera: snapshotStudioCamera(item.camera) })
        // A look may be partial (a palette: stops and surface, no µ or 3D view):
        // it is checked, then kept as it is and completed where it is applied.
        else if (item.kind === 'look' && item.look) { snapshotStudioLook(item.look); items.push({ ...base, kind: 'look', look: JSON.parse(JSON.stringify(item.look)) }) }
      } catch { /* dropped */ }
    }
    collections.push({ id: c.id, name: typeof c.name === 'string' ? c.name.trim().slice(0, 40) || '—' : '—', items })
  }
  return { version: 1, collections }
}

export function loadStudioBin(storage: Storage = localStorage): StudioBin {
  try {
    const raw = storage.getItem(STUDIO_BIN_KEY)
    if (raw) return validateStudioBin(JSON.parse(raw))
  } catch { /* start empty */ }
  return { version: 1, collections: [] }
}

export function saveStudioBin(bin: StudioBin, storage: Storage = localStorage): void {
  storage.setItem(STUDIO_BIN_KEY, JSON.stringify(validateStudioBin(bin)))
}

export type BinOrder = 'sequence' | 'shuffle'

/** Hand out `count` items for a run of keyframes: in order, or shuffled so the
 *  same item never comes twice in a row (when there is more than one). */
export function distributeBinItems<T>(items: readonly T[], count: number, order: BinOrder, random: () => number = Math.random): T[] {
  if (!items.length) return []
  const out: T[] = []
  let bag: T[] = []
  for (let i = 0; i < count; i++) {
    if (order === 'sequence') { out.push(items[i % items.length]); continue }
    if (!bag.length) {
      bag = [...items]
      for (let j = bag.length - 1; j > 0; j--) { const k = Math.floor(random() * (j + 1)); [bag[j], bag[k]] = [bag[k], bag[j]] }
      // A fresh bag must not open on the item that just closed the last one.
      if (bag.length > 1 && out.length && bag[bag.length - 1] === out[out.length - 1]) [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]]
    }
    out.push(bag.pop()!)
  }
  return out
}

/** Shrink an image (data URL or blob URL) to a small JPEG thumbnail. */
export async function shrinkThumbnail(source: string, width = BIN_THUMB_WIDTH): Promise<string | undefined> {
  if (!source) return undefined
  try {
    const image = new Image()
    image.src = source
    await image.decode()
    const height = Math.max(1, Math.round(width * image.naturalHeight / Math.max(1, image.naturalWidth)))
    const canvas = document.createElement('canvas')
    canvas.width = width; canvas.height = height
    canvas.getContext('2d')!.drawImage(image, 0, 0, width, height)
    return canvas.toDataURL('image/jpeg', 0.72)
  } catch { return undefined }
}

/** The bin item being dragged towards the timeline (HTML drag and drop does
 *  not expose its payload before the drop). */
export const binDrag = shallowRef<BinItem | null>(null)

// Thumbnails of camera keyframes, by camera. Session memory: filled from the
// bin and from snapshots taken when a keyframe is pinned.
export const placeThumbs = reactive(new Map<string, string>())
export const cameraThumbKey = (c: StudioCamera): string => `${c.cx}|${c.cy}|${c.scale}|${c.angle}`
export function rememberPlaceThumb(camera: StudioCamera | undefined, thumb: string | undefined): void {
  if (camera && thumb) placeThumbs.set(cameraThumbKey(camera), thumb)
}
