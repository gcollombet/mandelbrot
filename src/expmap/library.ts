import { ref } from 'vue'
import { tiffFileGroup } from './tiff'
import type { ExpmapManifest } from './manifest'
import { ExpmapDirectoryStore } from './store'

export type ExpmapLibraryEntry = {
  id: string; name: string; thumbnail: string; createdAt: string; updatedAt: string
  state: 'preparing' | 'ready' | 'interrupted' | 'missing' | 'incompatible'
  manifestVersion: 4; startScale: string; endScale: string; cx: string; cy: string
  width: number; height: number; density: number; bytes: number; appearanceIdentity: string
  handle: FileSystemDirectoryHandle
}
export const expmapLibraryEntries = ref<ExpmapLibraryEntry[]>([])
export const selectedExpmapDocumentId = ref<string | null>(null)

let database: Promise<IDBDatabase> | undefined
function db(): Promise<IDBDatabase> {
  return database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('mandelbrot-expmap-tiff-library', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('documents', { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => { database = undefined; reject(request.error) }
  })
}
async function transaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const database = await db()
  return new Promise((resolve, reject) => {
    const tx = database.transaction('documents', mode)
    const result = operation(tx.objectStore('documents'))
    tx.oncomplete = () => resolve(result.result)
    tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error ?? new Error('Catalogue transaction aborted'))
  })
}
export async function refreshExpmapLibrary() {
  expmapLibraryEntries.value = await transaction('readonly', store => store.getAll())
}
export async function saveExpmapLibraryEntry(entry: ExpmapLibraryEntry) {
  if (!entry.id || !entry.name.trim() || entry.thumbnail.length > 128 * 1024) throw new Error('Invalid catalogue metadata')
  await transaction('readwrite', store => store.put({ ...entry, name: entry.name.trim() }))
  await refreshExpmapLibrary()
}
export async function removeExpmapLibraryEntry(id: string) {
  await transaction('readwrite', store => store.delete(id))
  if (selectedExpmapDocumentId.value === id) selectedExpmapDocumentId.value = null
  await refreshExpmapLibrary()
}
export async function renameExpmapLibraryEntry(id: string, name: string) {
  const entry = expmapLibraryEntries.value.find(entry => entry.id === id)
  if (!entry) throw new Error('Document absent du catalogue')
  await saveExpmapLibraryEntry({ ...entry, name, updatedAt: new Date().toISOString() })
}
export function entryFromManifest(manifest: ExpmapManifest, handle: FileSystemDirectoryHandle, name: string, thumbnail = ''): ExpmapLibraryEntry {
  const plan = manifest.projection
  return { id: manifest.documentId, name, thumbnail, createdAt: manifest.createdAt, updatedAt: new Date().toISOString(),
    state: manifest.state === 'complete' ? 'ready' : manifest.state, manifestVersion: manifest.version,
    ...plan.domain, width: plan.width, height: plan.height, density: plan.density,
    bytes: manifest.tiles.reduce((sum, tile) => sum + tile.length, 0) + manifest.tiles.reduce((sum, tile) => { const group = tiffFileGroup(manifest.octaves, tile.index); return sum + (tile.index === group.start ? group.headerBytes : 0) }, 0), appearanceIdentity: manifest.appearance.identity, handle }
}
export async function openExpmapLibraryEntry(entry: ExpmapLibraryEntry) {
  const permission = entry.handle as FileSystemDirectoryHandle & {
    queryPermission(options: { mode: 'read' }): Promise<PermissionState>
    requestPermission(options: { mode: 'read' }): Promise<PermissionState>
  }
  try {
    if (permission.queryPermission && await permission.queryPermission({ mode: 'read' }) !== 'granted') {
      if (await permission.requestPermission({ mode: 'read' }) !== 'granted') throw new DOMException('Accès au dossier refusé ; rattacher le document ou renouveler sa permission.', 'NotAllowedError')
    }
    const store = new ExpmapDirectoryStore(entry.handle)
    const manifest = await store.open(entry.id)
    await saveExpmapLibraryEntry(entryFromManifest(manifest, entry.handle, entry.name, entry.thumbnail))
    return { store, manifest }
  } catch (error) {
    const missing = error instanceof DOMException && ['NotFoundError', 'NotAllowedError'].includes(error.name)
    await saveExpmapLibraryEntry({ ...entry, state: missing ? 'missing' : 'incompatible' }).catch(() => {})
    throw error
  }
}
export async function attachExpmapDocument(handle: FileSystemDirectoryHandle, expectedId?: string) {
  const manifest = await new ExpmapDirectoryStore(handle).open(expectedId)
  const previous = expmapLibraryEntries.value.find(entry => entry.id === manifest.documentId)
  await saveExpmapLibraryEntry(entryFromManifest(manifest, handle, previous?.name ?? handle.name, previous?.thumbnail))
  return manifest.documentId
}

export async function pickExpmapDirectory(mode: 'read' | 'readwrite'): Promise<FileSystemDirectoryHandle> {
  const picker = (window as Window & { showDirectoryPicker?: (options: { mode: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker
  if (!picker) throw new Error('Un navigateur prenant en charge les dossiers locaux est requis pour les documents ExpMap.')
  return picker({ mode })
}
