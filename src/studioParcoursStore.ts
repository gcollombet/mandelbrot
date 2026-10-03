import { openScopedDatabase } from './scopedCache'
import { validateStudioParcours, type StudioParcours } from './studioParcours'

// ── Local persistence of studio parcours ──
// One IndexedDB store per library scope (guest / signed-in), like the other
// catalogs. Local only for now: records carry no cloud cache fields, so the
// personal sync never sees them. Firestore can take over behind this boundary.

const DB_NAME = 'mandelbrot-studio-parcours'
const DB_VERSION = 1
const STORE_NAME = 'parcours'

export interface StudioParcoursRecord {
  id: string
  name: string
  parcours: StudioParcours
  date: string
  lastUpdated: string
}

function openDB(): Promise<IDBDatabase> {
  return openScopedDatabase(DB_NAME, DB_VERSION, (_event, req) => {
    const db = req.result
    if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' })
  })
}

function tx(mode: IDBTransactionMode): Promise<{ store: IDBObjectStore; done: Promise<void> }> {
  return openDB().then(db => {
    const transaction = db.transaction(STORE_NAME, mode)
    const store = transaction.objectStore(STORE_NAME)
    const done = new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
      transaction.onabort = () => reject(transaction.error)
    })
    return { store, done }
  })
}

function reqToPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function readStudioParcoursRecords(): Promise<StudioParcoursRecord[]> {
  const { store, done } = await tx('readonly')
  const all: StudioParcoursRecord[] = await reqToPromise(store.getAll())
  await done
  const valid: StudioParcoursRecord[] = []
  for (const record of all) {
    try { valid.push({ ...record, parcours: validateStudioParcours(record.parcours) }) }
    catch (error) { console.warn('Unreadable studio parcours skipped:', record?.id, error) }
  }
  return valid.sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated))
}

export async function saveStudioParcours(parcours: StudioParcours): Promise<StudioParcoursRecord> {
  const valid = validateStudioParcours(parcours)
  const { store, done } = await tx('readwrite')
  const existing: StudioParcoursRecord | undefined = await reqToPromise(store.get(valid.id))
  const now = new Date().toISOString()
  const record: StudioParcoursRecord = { id: valid.id, name: valid.name, parcours: valid, date: existing?.date ?? now, lastUpdated: now }
  store.put(record)
  await done
  return record
}

export async function deleteStudioParcours(id: string): Promise<void> {
  const { store, done } = await tx('readwrite')
  store.delete(id)
  await done
}
