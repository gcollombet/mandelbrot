import { ref, shallowRef } from 'vue'
import type { StudioParcours } from './studioParcours'
import type { StudioAudioSource } from './studioPlayer'

// The studio dock is unmounted when it closes. The parcours being edited
// survives in memory so that closing the dock to navigate, then reopening it,
// never loses unsaved keyframes. Saving is still the only durable storage.

let draft: { parcours: StudioParcours; savedId: string; time: number } | null = null

/** Latest state of the parcours under edit, for the Video panel's "Studio
 *  parcours" source. A deep copy, refreshed by the dock on every change. */
export const studioExportParcours = shallowRef<StudioParcours | null>(null)

/** The Video panel exports the studio parcours instead of a two-point path. */
export const studioVideoSelected = ref(false)

/** Music bound to the parcours under edit, decoded and analysed, for the
 *  export's modulators and its audio track. */
export const studioExportAudio = shallowRef<StudioAudioSource | null>(null)

const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

export function publishStudioParcours(parcours: StudioParcours): void {
  studioExportParcours.value = copy(parcours)
}

export function rememberStudioDraft(parcours: StudioParcours, savedId: string, time: number): void {
  draft = { parcours: copy(parcours), savedId, time }
  publishStudioParcours(parcours)
}

export function recallStudioDraft(): { parcours: StudioParcours; savedId: string; time: number } | null {
  return draft ? { parcours: copy(draft.parcours), savedId: draft.savedId, time: draft.time } : null
}
