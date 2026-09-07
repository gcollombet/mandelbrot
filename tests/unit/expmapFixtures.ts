import type { ExpmapManifest } from '../../src/expmap/manifest'
import { EXPMAP_COLOR_PROFILE } from '../../src/expmap/manifest'
import { contentIdentity } from '../../src/expmap/appearance'
import { planExpmap } from '../../src/expmap/plan'
import { planExpmapOctaves } from '../../src/expmap/octaves'
export async function fixtureManifest(): Promise<ExpmapManifest> {
  const projection = planExpmap({ domain: { cx: '0', cy: '0', startScale: '4e-1000', endScale: '1e-1000' }, width: 16, height: 12, density: 2, blockSize: 32 })
  return { version: 4, forceRender: false, documentId: 'fixture', generation: 0, state: 'preparing', createdAt: '2026-09-05', scaleConvention: 'VideoPathLocation.scale', zoomReferenceScale: '1e0',
    projection, octaves: planExpmapOctaves(projection), tiles: [], color: EXPMAP_COLOR_PROFILE,
    appearance: { json: '{}', identity: await contentIdentity(new TextEncoder().encode('{}')), resources: [] } }
}
export class MemoryDirectory {
  name = 'fixture'
  files = new Map<string, Uint8Array>()
  failClose: string | null = null
  denied = false
  async *values() { for (const name of this.files.keys()) yield { name } }
  async getFileHandle(name: string, options?: { create?: boolean }) {
    if (this.denied) throw new DOMException('Permission lost', 'NotAllowedError')
    if (!this.files.has(name)) {
      if (!options?.create) throw new DOMException('Missing', 'NotFoundError')
      this.files.set(name, new Uint8Array())
    }
    return {
      getFile: async () => new Blob([this.files.get(name)!]),
      createWritable: async (options?: { keepExistingData?: boolean }) => {
        let data = options?.keepExistingData ? this.files.get(name)!.slice() : new Uint8Array()
        return {
          write: async (value: string | { position: number; data: Uint8Array }) => {
            if (typeof value === 'string') data = new TextEncoder().encode(value)
            else { const next = new Uint8Array(Math.max(data.length, value.position + value.data.length)); next.set(data); next.set(value.data, value.position); data = next }
          },
          truncate: async (size: number) => { data = data.slice(0, size) },
          close: async () => { if (this.failClose === name) throw new DOMException('Full disk', 'QuotaExceededError'); this.files.set(name, data) },
          abort: async () => {},
        }
      },
    }
  }
  handle() { return this as unknown as FileSystemDirectoryHandle }
}
