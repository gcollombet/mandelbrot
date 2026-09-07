import { ref, shallowRef } from 'vue'
import type { ExpmapStore } from './store'
import type { ExpmapManifest } from './manifest'
export const expmapOpenDocument = shallowRef<{ store: ExpmapStore; manifest: ExpmapManifest } | null>(null)
export const expmapVideoSelected = ref(false)
export const expmapBusy = ref(false)

export const expmapLastView = shallowRef<{ documentId: string; scale: string; angle: number } | null>(null)
