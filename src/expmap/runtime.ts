import type { ShaderLibraryEntry } from './displayLibrary'
import type { ExpmapSampleDistribution } from './renderer'
import { ref, shallowRef } from 'vue'
import type { ExpmapStore } from './store'
import type { ExpmapManifest } from './manifest'
export const expmapOpenDocument = shallowRef<{ store: ExpmapStore; manifest: ExpmapManifest } | null>(null)
export const expmapVideoSelected = ref(false)
export const shaderExpmapVideoSelected = ref(false)
export const shaderExpmapVideoEntry = shallowRef<ShaderLibraryEntry | null>(null)
export const expmapBusy = ref(false)

export const expmapLastView = shallowRef<{ documentId: string; scale: string; angle: number; effectTime?: number } | null>(null)

/** One-shot camera requested by the video's endpoint preview buttons. */
export const expmapPreviewView = shallowRef<{ sampleDistribution?:ExpmapSampleDistribution; maxSamples?:number; documentId: string; scale: string; angle: number; effectTime?: number } | null>(null)

// OPFS archives allow only one sync access handle. Release preview readers before video opens them.
const shaderPreviewReaders = new Set<() => Promise<void>>()
export function registerShaderPreviewReader(release: () => Promise<void>): () => void {
  shaderPreviewReaders.add(release)
  return () => { shaderPreviewReaders.delete(release) }
}
export async function releaseShaderPreviewReaders(): Promise<void> {
  for (const release of shaderPreviewReaders) await release()
}
