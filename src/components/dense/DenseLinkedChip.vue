<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';

const props = defineProps<{
  /** Record name shown in the chip; click to rename. */
  name: string;
  /** Family label ("Scène", "Palette", …). */
  kind: string;
  /** Live edits differ from the stored record. */
  dirty: boolean;
  /** Record cannot be written back (shared catalog or built-in). */
  locked?: boolean;
  /** Write in progress. */
  busy?: boolean;
  /** Pause the app keyboard shortcuts while the rename field has focus. */
  suspendShortcuts?: (suspend: boolean) => void;
}>();
const emit = defineEmits<{
  update: [];
  variant: [];
  rename: [name: string];
  detach: [];
}>();

const editing = ref(false);
const draft = ref(props.name);
const input = ref<HTMLInputElement | null>(null);
watch(() => props.name, name => { if (!editing.value) draft.value = name; });

// One persistent field: it reads as a label until clicked, then edits in
// place. No element swap, so focus and key sequences stay on the same node.
function startRename() {
  if (props.locked || props.busy || editing.value) return;
  draft.value = props.name;
  editing.value = true;
  props.suspendShortcuts?.(true);
  nextTick(() => input.value?.select());
}
function finish() {
  if (!editing.value) return;
  editing.value = false;
  props.suspendShortcuts?.(false);
  input.value?.blur();
}
function commit() {
  if (!editing.value) return;
  const next = draft.value.trim();
  finish();
  if (next && next !== props.name) emit('rename', next);
  else draft.value = props.name;
}
function cancel() { draft.value = props.name; finish(); }
// Commit on keyup: a capture-phase key layer in the app swallows the Enter
// keydown before it reaches the field; keyup always arrives.
function onKey(event: KeyboardEvent) {
  if (!editing.value) return;
  event.stopPropagation();
  if (event.key === 'Enter' || event.key === 'Return' || event.keyCode === 13) { event.preventDefault(); commit(); }
  else if (event.key === 'Escape' || event.key === 'Esc') { event.preventDefault(); cancel(); }
}
</script>

<template>
  <div class="linked" :class="{ dirty, locked, busy }" role="group" :aria-label="`${kind} liée : ${name}`">
    <span class="linked-dot" aria-hidden="true"></span>
    <div class="linked-body">
      <span class="linked-kind">{{ kind }}</span>
      <span class="linked-name" :class="{ editing }">
        <input
          ref="input"
          v-model="draft"
          class="linked-name-in"
          type="text"
          maxlength="100"
          :readonly="!editing"
          :disabled="locked || busy"
          :size="Math.max(4, Math.min(40, draft.length + 1))"
          :aria-label="editing ? 'Nouveau nom' : 'Renommer'"
          :title="locked ? 'Élément du catalogue partagé' : 'Cliquer pour renommer'"
          @click="startRename"
          @focus="startRename"
          @keydown.stop
          @keyup="onKey"
          @blur="commit"
        />
        <svg v-if="!locked && !editing" viewBox="0 0 24 24" aria-hidden="true" @click="startRename"><path d="M4 20h4l10-10-4-4L4 16z"/><path d="M13 7l4 4"/></svg>
      </span>
      <span class="linked-state" aria-live="polite">{{ locked ? 'catalogue' : dirty ? 'modifiée' : 'à jour' }}</span>
    </div>
    <div class="linked-actions">
      <button v-if="locked" class="mini-btn primary" type="button" :disabled="busy" @click="emit('variant')">
        <svg viewBox="0 0 24 24"><path d="M5 3h12l4 4v14H5z"/><path d="M9 3v5h7V3M8 21v-7h8v7"/></svg>
        Enregistrer une variante
      </button>
      <button v-else class="mini-btn primary" type="button" :disabled="!dirty || busy" @click="emit('update')">
        <svg viewBox="0 0 24 24"><path d="M5 3h12l4 4v14H5z"/><path d="M9 3v5h7V3M8 21v-7h8v7"/></svg>
        Mettre à jour
      </button>
      <button class="mini-btn" type="button" :disabled="busy" title="Oublier le lien, garder les réglages" @click="emit('detach')">Détacher</button>
    </div>
  </div>
</template>

<style scoped>
.linked {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px 10px;
  padding: 7px 10px; margin: 0 0 8px;
  border: 1px solid var(--line); border-radius: 10px; background: var(--row-on);
  container-type: inline-size;
}
.linked-dot {
  flex: none; width: 8px; height: 8px; border-radius: 50%;
  background: var(--ink-4); box-shadow: 0 0 0 3px color-mix(in oklab, var(--ink-4) 25%, transparent);
  transition: background .2s, box-shadow .2s;
}
.linked.dirty .linked-dot { background: oklch(.8 .16 80); box-shadow: 0 0 0 3px oklch(.8 .16 80 / .28); }
.linked.locked .linked-dot { background: var(--accent); box-shadow: 0 0 0 3px color-mix(in oklab, var(--accent) 30%, transparent); }
.linked-body { display: flex; align-items: baseline; gap: 6px; flex: 1 1 160px; min-width: 0; }
.linked-kind { font-size: 10.5px; text-transform: uppercase; letter-spacing: .06em; color: var(--ink-3); flex: none; }
.linked-name { display: inline-flex; align-items: center; gap: 5px; min-width: 0; flex: 1 1 auto; }
.linked-name-in {
  min-width: 0; max-width: 100%; padding: 2px 4px; margin: -2px 0;
  border: 1px solid transparent; border-radius: 6px; background: transparent;
  color: var(--ink); font: inherit; font-weight: 600; cursor: text;
  overflow: hidden; text-overflow: ellipsis;
}
.linked-name-in:read-only { cursor: pointer; }
.linked-name-in:read-only:not(:disabled):hover { background: var(--row); }
.linked-name-in:disabled { cursor: default; opacity: 1; }
.linked-name.editing .linked-name-in { background: var(--row); border-color: var(--accent); cursor: text; }
.linked-name svg { width: 12px; height: 12px; flex: none; stroke: var(--ink-3); fill: none; stroke-width: 2; cursor: pointer; }
.linked-state { font-size: 11px; color: var(--ink-3); flex: none; }
.linked.dirty .linked-state { color: oklch(.8 .16 80); }
.linked-actions { display: flex; gap: 6px; flex: none; margin-left: auto; }
.linked.busy { opacity: .7; pointer-events: none; }
@container (max-width: 380px) {
  .linked-actions { flex: 1 1 100%; margin-left: 0; }
  .linked-actions .mini-btn { flex: 1 1 0; justify-content: center; min-height: 40px; }
}
</style>
