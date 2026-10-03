import type { StudioParcours } from './studioParcours'

// The studio dock is unmounted when it closes. The parcours being edited
// survives in memory so that closing the dock to navigate, then reopening it,
// never loses unsaved keyframes. Saving is still the only durable storage.

let draft: { parcours: StudioParcours; savedId: string; time: number } | null = null

export function rememberStudioDraft(parcours: StudioParcours, savedId: string, time: number): void {
  draft = { parcours: JSON.parse(JSON.stringify(parcours)), savedId, time }
}

export function recallStudioDraft(): { parcours: StudioParcours; savedId: string; time: number } | null {
  return draft ? { parcours: JSON.parse(JSON.stringify(draft.parcours)), savedId: draft.savedId, time: draft.time } : null
}
