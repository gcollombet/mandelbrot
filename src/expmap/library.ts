import { ref } from 'vue'
import type { ExpmapManifest } from './manifest'
import { ExpmapStore } from './store'

export type ExpmapLibraryEntry = {
  id: string; name: string; thumbnail: string; createdAt: string; updatedAt: string
  state: 'preparing' | 'ready' | 'interrupted' | 'missing' | 'incompatible'
  manifestVersion: 5; forceRender: boolean; startScale: string; endScale: string; cx: string; cy: string
  width: number; height: number; density: number; bytes: number; appearanceIdentity: string
  handle: FileSystemFileHandle
}
export const expmapLibraryEntries = ref<ExpmapLibraryEntry[]>([])
export const selectedExpmapDocumentId = ref<string | null>(null)

export function expmapLibraryFilename(entry: Pick<ExpmapLibraryEntry, 'handle' | 'name'>) {
  const filename = entry.handle?.name?.trim()
  if (filename) return filename
  const fallback = entry.name.trim() || 'Document ExpMap'
  return /\.expmap$/i.test(fallback) ? fallback : `${fallback}.expmap`
}

let database: Promise<IDBDatabase> | undefined
function db(): Promise<IDBDatabase> {
  return database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('mandelbrot-expmap-file-library', 1)
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
  if (!entry.id || !entry.name.trim() || entry.name.length > 200 || entry.thumbnail.length > 128 * 1024) throw new Error('Invalid catalogue metadata')
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
export function entryFromManifest(manifest: ExpmapManifest, handle: FileSystemFileHandle, name: string, thumbnail = ''): ExpmapLibraryEntry {
  const plan = manifest.projection
  return { id: manifest.documentId, name, thumbnail:manifest.thumbnail??thumbnail, createdAt: manifest.createdAt, updatedAt: new Date().toISOString(),
    state: manifest.state === 'complete' ? 'ready' : manifest.state, manifestVersion: manifest.version, forceRender: manifest.forceRender,
    ...plan.domain, width: plan.width, height: plan.height, density: plan.density,
    bytes: manifest.tiles.reduce((sum, tile) => sum + tile.length, 0), appearanceIdentity: manifest.appearance.identity, handle }
}
export async function openExpmapLibraryEntry(entry: ExpmapLibraryEntry) {
  const permission = entry.handle as FileSystemFileHandle & {
    queryPermission(options: { mode: 'read' }): Promise<PermissionState>
    requestPermission(options: { mode: 'read' }): Promise<PermissionState>
  }
  try {
    let store: ExpmapStore, manifest:ExpmapManifest
    try {
      const root=await navigator.storage.getDirectory(),parent=await root.getDirectoryHandle('expmap-work'),directory=await parent.getDirectoryHandle(entry.id)
      store=new ExpmapStore(directory,entry.handle)
      manifest=await store.open(entry.id,true)
    } catch(error) {
      if(!(error instanceof DOMException && error.name==='NotFoundError'))throw error
      if (permission.queryPermission && await permission.queryPermission({ mode: 'read' }) !== 'granted') {
        if (await permission.requestPermission({ mode: 'read' }) !== 'granted') throw new DOMException('Accès au fichier refusé ; rattacher le document ou renouveler sa permission.', 'NotAllowedError')
      }
      store=await ExpmapStore.fromFile(entry.handle)
      manifest=await store.open(entry.id,true)
    }
    await saveExpmapLibraryEntry(entryFromManifest(manifest, entry.handle, entry.name, entry.thumbnail))
    return { store, manifest }
  } catch (error) {
    const missing = error instanceof DOMException && ['NotFoundError', 'NotAllowedError'].includes(error.name)
    await saveExpmapLibraryEntry({ ...entry, state: missing ? 'missing' : 'incompatible' }).catch(() => {})
    throw error
  }
}
export async function attachExpmapDocument(handle: FileSystemFileHandle, expectedId?: string) {
  const manifest = await (await ExpmapStore.fromFile(handle)).open(expectedId)
  const previous = expmapLibraryEntries.value.find(entry => entry.id === manifest.documentId)
  await saveExpmapLibraryEntry(entryFromManifest(manifest, handle, previous?.name ?? manifest.name, previous?.thumbnail))
  return manifest.documentId
}

export async function pickExpmapFile(mode:'read'|'readwrite',name='Document ExpMap'):Promise<FileSystemFileHandle> {
  const api=window as Window & {showSaveFilePicker?:(options:unknown)=>Promise<FileSystemFileHandle>;showOpenFilePicker?:(options:unknown)=>Promise<FileSystemFileHandle[]>}
  const types=[{description:'Document ExpMap',accept:{'application/zip':['.expmap']}}]
  if(mode==='readwrite') {
    if(!api.showSaveFilePicker)throw new Error('Enregistrement de fichiers locaux indisponible dans ce navigateur')
    return api.showSaveFilePicker({suggestedName:`${name}.expmap`,types})
  }
  if(!api.showOpenFilePicker)throw new Error('Ouverture de fichiers locaux indisponible dans ce navigateur')
  return (await api.showOpenFilePicker({types,multiple:false}))[0]
}
