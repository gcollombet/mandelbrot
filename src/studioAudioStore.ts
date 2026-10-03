import { openScopedDatabase } from './scopedCache'
import { analyzeAudio, mixdown, type AudioAnalysis } from './audioAnalysis'

// ── Audio files imported into the studio ──
// The file itself stays local (IndexedDB, per library scope); a parcours
// references it by id. The analysis is recomputed from the decoded samples
// when a track is loaded: cheap (under a second for a few minutes of music)
// and never stale.

const DB_NAME = 'mandelbrot-studio-audio'
const DB_VERSION = 1
const STORE_NAME = 'audio'

export interface StudioAudioRecord {
  id: string
  name: string
  blob: Blob
  durationSeconds: number
  date: string
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

export async function readStudioAudioRecords(): Promise<StudioAudioRecord[]> {
  const { store, done } = await tx('readonly')
  const all: StudioAudioRecord[] = await reqToPromise(store.getAll())
  await done
  return all.sort((a, b) => b.date.localeCompare(a.date))
}

export async function getStudioAudioRecord(id: string): Promise<StudioAudioRecord | null> {
  const { store, done } = await tx('readonly')
  const record: StudioAudioRecord | undefined = await reqToPromise(store.get(id))
  await done
  return record ?? null
}

export async function saveStudioAudioRecord(record: StudioAudioRecord): Promise<void> {
  const { store, done } = await tx('readwrite')
  store.put(record)
  await done
}

export async function deleteStudioAudioRecord(id: string): Promise<void> {
  const { store, done } = await tx('readwrite')
  store.delete(id)
  await done
}

export type DecodedStudioAudio = {
  record: StudioAudioRecord
  buffer: AudioBuffer
  analysis: AudioAnalysis
}

/** Decode a stored (or freshly imported) track and analyse it. Decoding is
 *  done at the file's own sample rate through an OfflineAudioContext so the
 *  analysis does not depend on the device's output rate. */
export async function decodeStudioAudio(record: StudioAudioRecord): Promise<DecodedStudioAudio> {
  const bytes = await record.blob.arrayBuffer()
  // A throwaway context only to decode; the real-time context is the player's.
  const probe = new OfflineAudioContext(1, 1, 44100)
  const buffer = await probe.decodeAudioData(bytes)
  const channels = Array.from({ length: buffer.numberOfChannels }, (_, c) => buffer.getChannelData(c))
  const analysis = analyzeAudio(mixdown(channels), buffer.sampleRate)
  return { record, buffer, analysis }
}

/** Import a file chosen by the user: stored, decoded and analysed. */
export async function importStudioAudio(file: File): Promise<DecodedStudioAudio> {
  const record: StudioAudioRecord = { id: crypto.randomUUID(), name: file.name, blob: file, durationSeconds: 0, date: new Date().toISOString() }
  const decoded = await decodeStudioAudio(record)
  record.durationSeconds = decoded.buffer.duration
  await saveStudioAudioRecord(record)
  return decoded
}
