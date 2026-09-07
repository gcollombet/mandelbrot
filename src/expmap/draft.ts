import { reactive, watch } from 'vue'
const KEY = 'expmap-creation-draft'
export type ExpmapDraft = { name: string; start: string; end: string; cx: string; cy: string; width: number; height: number; density: number; forceRender: boolean; quality: number }
export function restoreExpmapDraft(current: Record<string, unknown>, serialized?: string | null): ExpmapDraft {
  const draft: ExpmapDraft = { name: 'Document ExpMap', start: String(current.scale), end: String(current.scale), cx: String(current.cx), cy: String(current.cy), width: 1280, height: 720, density: 1, forceRender: false, quality:0.9 }
  try {
    const saved = JSON.parse(serialized ?? 'null')
    if (saved && typeof saved === 'object') for (const key of Object.keys(draft) as (keyof ExpmapDraft)[]) {
      if (typeof saved[key] === typeof draft[key] && (typeof saved[key] !== 'number' || Number.isFinite(saved[key]))) Object.assign(draft, { [key]: saved[key] })
    }
  } catch { /* Start from the camera only when no usable draft exists. */ }
  return draft
}
let shared: ExpmapDraft | undefined
export function useExpmapDraft(current: Record<string, unknown>) {
  if (!shared) {
    let serialized: string | null = null
    try { serialized = localStorage.getItem(KEY) } catch { /* In-memory persistence remains available. */ }
    shared = reactive(restoreExpmapDraft(current, serialized))
  }
  const draft = shared
  // Each mounted panel owns its watcher; the shared draft survives its unmount.
  watch(draft, () => { try { localStorage.setItem(KEY, JSON.stringify(draft)) } catch { /* Storage unavailable/full. */ } }, { flush: 'sync' })
  return draft
}
