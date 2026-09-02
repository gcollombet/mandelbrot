import type {TilePlan} from './tiledVideoExport'

export const TILED_VIDEO_MANIFEST_VERSION = 1 as const

export type TiledVideoFingerprintInput = {
    path: unknown
    render: unknown
    animation: unknown
    tilePlan: TilePlan
    aaSamplesPerFrame: number
    codec: string
    aggregateBitrate: number
    fps: number
    totalFrames: number
    frameTimestampsMicros: readonly number[]
}

export type CompletedTileRecord = {
    tileIndex: number
    fileName: string
    bytes: number
    completedAt: string
}

export type TiledVideoManifest = {
    version: typeof TILED_VIDEO_MANIFEST_VERSION
    sessionId: string
    fingerprint: string
    createdAt: string
    updatedAt: string
    tilePlan: TilePlan
    codec: string
    aggregateBitrate: number
    fps: number
    totalFrames: number
    completedTiles: CompletedTileRecord[]
}

export type TemporaryStorageEstimate = {
    quotaBytes: number | null
    usageBytes: number | null
    availableBytes: number | null
}

export interface TemporaryVideoStore {
    estimate(): Promise<TemporaryStorageEstimate>
    createWritable(sessionId: string, fileName: string): Promise<WritableStream<Uint8Array>>
    readBlob(sessionId: string, fileName: string): Promise<Blob>
    writeTextAtomic(sessionId: string, fileName: string, text: string): Promise<void>
    readText(sessionId: string, fileName: string): Promise<string | null>
    listSessions(): Promise<string[]>
    removeSession(sessionId: string): Promise<void>
}

function stableValue(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(stableValue)
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>)
                .filter(([, child]) => child !== undefined)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, child]) => [key, stableValue(child)]),
        )
    }
    if (typeof value === 'number' && !Number.isFinite(value)) {
        throw new TypeError('A tiled-video fingerprint cannot contain non-finite numbers.')
    }
    return value
}

export function stableFingerprintJson(value: unknown): string {
    return JSON.stringify(stableValue(value))
}

/** SHA-256 prevents an accidental resume across visually different requests. */
export async function computeTiledVideoFingerprint(
    value: TiledVideoFingerprintInput,
): Promise<string> {
    if (!globalThis.crypto?.subtle) {
        throw new Error('SHA-256 is unavailable; a resumable tiled export cannot be identified safely.')
    }
    const data = new TextEncoder().encode(stableFingerprintJson(value))
    const digest = await globalThis.crypto.subtle.digest('SHA-256', data)
    return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export function createTiledVideoManifest(settings: {
    sessionId: string
    fingerprint: string
    tilePlan: TilePlan
    codec: string
    aggregateBitrate: number
    fps: number
    totalFrames: number
    now?: Date
}): TiledVideoManifest {
    const now = (settings.now ?? new Date()).toISOString()
    return {
        version: TILED_VIDEO_MANIFEST_VERSION,
        sessionId: settings.sessionId,
        fingerprint: settings.fingerprint,
        createdAt: now,
        updatedAt: now,
        tilePlan: settings.tilePlan,
        codec: settings.codec,
        aggregateBitrate: settings.aggregateBitrate,
        fps: settings.fps,
        totalFrames: settings.totalFrames,
        completedTiles: [],
    }
}

export function parseTiledVideoManifest(text: string): TiledVideoManifest {
    const value = JSON.parse(text) as Partial<TiledVideoManifest>
    if (value.version !== TILED_VIDEO_MANIFEST_VERSION
        || typeof value.sessionId !== 'string'
        || typeof value.fingerprint !== 'string'
        || !value.tilePlan
        || !Array.isArray(value.completedTiles)) {
        throw new Error('Unsupported or malformed tiled-video manifest.')
    }
    return value as TiledVideoManifest
}

export function resumeCompatibility(
    manifest: TiledVideoManifest,
    fingerprint: string,
): {compatible: boolean; missingTileIndices: number[]} {
    const completed = new Set(manifest.completedTiles.map(tile => tile.tileIndex))
    return {
        compatible: manifest.version === TILED_VIDEO_MANIFEST_VERSION
            && manifest.fingerprint === fingerprint,
        missingTileIndices: manifest.tilePlan.tiles
            .map(tile => tile.index)
            .filter(index => !completed.has(index)),
    }
}

export function markTileCompleted(
    manifest: TiledVideoManifest,
    record: CompletedTileRecord,
    now: Date = new Date(),
): TiledVideoManifest {
    if (!manifest.tilePlan.tiles.some(tile => tile.index === record.tileIndex)) {
        throw new RangeError(`Tile ${record.tileIndex} does not belong to this manifest.`)
    }
    const completedTiles = manifest.completedTiles
        .filter(tile => tile.tileIndex !== record.tileIndex)
        .concat(record)
        .sort((a, b) => a.tileIndex - b.tileIndex)
    return {...manifest, completedTiles, updatedAt: now.toISOString()}
}

export async function persistTiledVideoManifest(
    store: TemporaryVideoStore,
    manifest: TiledVideoManifest,
): Promise<void> {
    await store.writeTextAtomic(
        manifest.sessionId,
        'manifest.json',
        `${JSON.stringify(manifest, null, 2)}\n`,
    )
}

export function assertTemporaryCapacity(
    requiredBytes: number,
    estimate: TemporaryStorageEstimate,
    reserveRatio = 0.1,
): void {
    if (!Number.isFinite(requiredBytes) || requiredBytes < 0) {
        throw new RangeError('requiredBytes must be a non-negative finite number.')
    }
    if (!Number.isFinite(reserveRatio) || reserveRatio < 0) {
        throw new RangeError('reserveRatio must be non-negative and finite.')
    }
    if (estimate.availableBytes === null) return
    const requiredWithReserve = Math.ceil(requiredBytes * (1 + reserveRatio))
    if (requiredWithReserve > estimate.availableBytes) {
        throw new Error(
            `Stockage temporaire insuffisant : ${requiredWithReserve} octets requis avec marge, `
            + `${estimate.availableBytes} disponibles.`,
        )
    }
}

function safePathPart(value: string, label: string): string {
    if (!/^[a-zA-Z0-9._-]+$/.test(value) || value === '.' || value === '..') {
        throw new Error(`${label} contains unsafe path characters.`)
    }
    return value
}

/** Origin-private storage backend; every encoded byte is streamed to disk. */
export class OpfsTemporaryVideoStore implements TemporaryVideoStore {
    private readonly rootName: string

    constructor(rootName = 'mandelbrot-tiled-video') {
        this.rootName = rootName
    }

    private async root(): Promise<FileSystemDirectoryHandle> {
        if (!navigator.storage?.getDirectory) {
            throw new Error('OPFS is unavailable in this browser.')
        }
        const originRoot = await navigator.storage.getDirectory()
        return originRoot.getDirectoryHandle(safePathPart(this.rootName, 'rootName'), {create: true})
    }

    private async session(sessionId: string, create = true): Promise<FileSystemDirectoryHandle> {
        return (await this.root()).getDirectoryHandle(safePathPart(sessionId, 'sessionId'), {create})
    }

    async estimate(): Promise<TemporaryStorageEstimate> {
        const raw = await navigator.storage?.estimate?.()
        const quotaBytes = Number.isFinite(raw?.quota) ? raw!.quota! : null
        const usageBytes = Number.isFinite(raw?.usage) ? raw!.usage! : null
        return {
            quotaBytes,
            usageBytes,
            availableBytes: quotaBytes !== null && usageBytes !== null
                ? Math.max(0, quotaBytes - usageBytes)
                : null,
        }
    }

    async createWritable(sessionId: string, fileName: string): Promise<WritableStream<Uint8Array>> {
        const file = await (await this.session(sessionId)).getFileHandle(
            safePathPart(fileName, 'fileName'),
            {create: true},
        )
        const writable = await file.createWritable({keepExistingData: false})
        return new WritableStream<Uint8Array>({
            write: chunk => writable.write(chunk.slice().buffer as ArrayBuffer),
            close: () => writable.close(),
            abort: reason => writable.abort(reason),
        })
    }

    async readBlob(sessionId: string, fileName: string): Promise<Blob> {
        const handle = await (await this.session(sessionId, false))
            .getFileHandle(safePathPart(fileName, 'fileName'))
        return handle.getFile()
    }

    async writeTextAtomic(sessionId: string, fileName: string, text: string): Promise<void> {
        const directory = await this.session(sessionId)
        const name = safePathPart(fileName, 'fileName')
        const temporaryName = `${name}.next`
        const temporary = await directory.getFileHandle(temporaryName, {create: true})
        const writer = await temporary.createWritable({keepExistingData: false})
        await writer.write(text)
        await writer.close()

        // Chromium exposes FileSystemHandle.move in OPFS. It is atomic inside a
        // directory. Retain a write-through fallback for older implementations.
        const movable = temporary as FileSystemFileHandle & {move?: (name: string) => Promise<void>}
        if (movable.move) {
            await directory.removeEntry(name).catch(() => undefined)
            await movable.move(name)
            return
        }
        const finalHandle = await directory.getFileHandle(name, {create: true})
        const finalWriter = await finalHandle.createWritable({keepExistingData: false})
        await finalWriter.write(text)
        await finalWriter.close()
        await directory.removeEntry(temporaryName).catch(() => undefined)
    }

    async readText(sessionId: string, fileName: string): Promise<string | null> {
        try {
            return await (await this.readBlob(sessionId, fileName)).text()
        } catch (error) {
            if (error instanceof DOMException && error.name === 'NotFoundError') return null
            throw error
        }
    }

    async listSessions(): Promise<string[]> {
        const directory = await this.root()
        const iterable = directory as FileSystemDirectoryHandle & {
            entries(): AsyncIterableIterator<[string, FileSystemHandle]>
        }
        const sessions: string[] = []
        for await (const [name, handle] of iterable.entries()) {
            if (handle.kind === 'directory') sessions.push(name)
        }
        return sessions.sort()
    }

    async removeSession(sessionId: string): Promise<void> {
        await (await this.root()).removeEntry(safePathPart(sessionId, 'sessionId'), {recursive: true})
            .catch(error => {
                if (!(error instanceof DOMException) || error.name !== 'NotFoundError') throw error
            })
    }
}
