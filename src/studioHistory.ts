// ── Undo / redo for the studio timeline ──
//
// Snapshot history: every edit records the state BEFORE it. Edits that arrive
// in a burst under the same key (a slider drag, a palette tweaked while the
// playhead rests on a keyframe) coalesce into one step, so one Ctrl+Z undoes
// the gesture rather than its last pixel. Pure: no Vue, no clock of its own.

export const STUDIO_HISTORY_LIMIT = 100
export const STUDIO_HISTORY_COALESCE_MS = 800

export class StudioHistory<T> {
  private past: string[] = []
  private future: string[] = []
  private lastKey = ''
  private lastAt = -Infinity

  private readonly limit: number

  constructor(limit = STUDIO_HISTORY_LIMIT) {
    this.limit = limit
  }

  get canUndo(): boolean { return this.past.length > 0 }
  get canRedo(): boolean { return this.future.length > 0 }

  /** Record `before`, the state an edit is about to change. A non-empty `key`
   *  equal to the previous one within the coalescing window extends that step. */
  record(before: T, key = '', now = Date.now()): void {
    if (key && key === this.lastKey && now - this.lastAt < STUDIO_HISTORY_COALESCE_MS) {
      this.lastAt = now
      return
    }
    this.past.push(JSON.stringify(before))
    if (this.past.length > this.limit) this.past.shift()
    this.future = []
    this.lastKey = key
    this.lastAt = now
  }

  /** The state to restore, or null when there is nothing to undo. */
  undo(current: T): T | null {
    const previous = this.past.pop()
    if (previous === undefined) return null
    this.future.push(JSON.stringify(current))
    this.lastKey = ''
    return JSON.parse(previous) as T
  }

  redo(current: T): T | null {
    const next = this.future.pop()
    if (next === undefined) return null
    this.past.push(JSON.stringify(current))
    this.lastKey = ''
    return JSON.parse(next) as T
  }

  clear(): void {
    this.past = []
    this.future = []
    this.lastKey = ''
  }
}
