<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, toRefs } from 'vue'
import type { Engine, RenderOptions } from '../Engine'
import type { MandelbrotExposed } from '../types/MandelbrotExposed'
import { DenseField, DenseSection } from './dense'
import { useExpmapDraft } from '../expmap/draft'
import { expmapAppearanceProblems } from '../expmap/appearance'
import { planExpmap } from '../expmap/plan'
import RenderProgress from './RenderProgress.vue'
import { createExpmapDocument, type ExpmapProgress } from '../expmap/create'
import { octaveMemory, planExpmapOctaves } from '../expmap/octaves'
import { ExpmapDirectoryStore } from '../expmap/store'
import { attachExpmapDocument, entryFromManifest, expmapLibraryEntries, openExpmapLibraryEntry, pickExpmapDirectory, refreshExpmapLibrary, removeExpmapLibraryEntry, renameExpmapLibraryEntry, saveExpmapLibraryEntry, selectedExpmapDocumentId, type ExpmapLibraryEntry } from '../expmap/library'
import { expmapBusy, expmapOpenDocument, expmapVideoSelected } from '../expmap/runtime'
const props = defineProps<{ current: Record<string, unknown>; engine: Engine | null; controller: MandelbrotExposed | null }>()
const emit = defineEmits<{ 'use-video': [] }>()
const { name, start, end, cx, cy, width, height, density, forceRender } = toRefs(useExpmapDraft(props.current))
const error = ref(''), progress = ref<ExpmapProgress | null>(null), ownRunning = ref(false), stopping = ref(false)
const progressUnit = ref('blocs calculés')
let abort: AbortController | undefined
const appearance = computed(() => JSON.parse(JSON.stringify(props.current)) as RenderOptions)
const problems = computed(() => expmapAppearanceProblems(appearance.value))
const hasBlockingProblems = computed(() => problems.value.some(p => !forceRender.value || p.kind === 'invalid'))
const plan = computed(() => { try { return planExpmap({ domain: { cx: cx.value, cy: cy.value, startScale: start.value, endScale: end.value }, width: width.value, height: height.value, density: density.value }) } catch { return null } })
const estimate = computed(() => plan.value ? octaveMemory(planExpmapOctaves(plan.value)) : null)
async function guard(action: () => Promise<unknown>) { error.value = ''; try { await action() } catch (e) { error.value = String(e) } }
onMounted(() => guard(refreshExpmapLibrary))
onUnmounted(() => abort?.abort())
function captureStart() { cx.value = String(props.current.cx); cy.value = String(props.current.cy); start.value = String(props.current.scale) }
async function bake(entry?: ExpmapLibraryEntry) {
  if (expmapBusy.value || !props.engine || !props.controller?.setExportTime) return
  await guard(async () => {
    expmapBusy.value = true; ownRunning.value = true; stopping.value = false; abort = new AbortController()
    progressUnit.value = 'blocs calculés'
    progress.value = { phase: 'Choix du dossier', done: 0, total: 0, saved: 0 }
    try {
      const handle = entry?.handle ?? await pickExpmapDirectory('readwrite')
      expmapOpenDocument.value = null; await nextTick()
      const store = new ExpmapDirectoryStore(handle)
      const previous = entry ? await store.open(entry.id) : null
      const selectedPlan = previous?.projection ?? plan.value
      if (!selectedPlan) throw new Error('Domaine ou résolution invalide.')
      const controller = props.controller!, engine = props.engine!
      const camera = controller.getParams()
      if (!camera) throw new Error('Caméra indisponible.')
      let thumbnail = entry?.thumbnail ?? ''
      if (!thumbnail) {
        const source = controller.getCanvas()
        if (source) { const target = document.createElement('canvas'); target.width = 160; target.height = 90; target.getContext('2d')!.drawImage(source, 0, 0, 160, 90); thumbnail = target.toDataURL('image/jpeg', 0.6) }
      }
      await createExpmapDocument({ engine, controller: { getNavigator: () => controller.getNavigator(), drawOnce: () => controller.drawOnce(), setExportTime: t => controller.setExportTime!(t) } }, {
        store, forceRender: forceRender.value, documentId: entry?.id ?? crypto.randomUUID(), plan: selectedPlan,
        appearance: previous ? JSON.parse(previous.appearance.json) : appearance.value,
        restoreCamera: { cx: camera[0], cy: camera[1], scale: camera[2], angle: Number(camera[3]) }, resume: !!previous, signal: abort.signal,
        onProgress: value => { progress.value = value },
        onCheckpoint: async manifest => { await saveExpmapLibraryEntry(entryFromManifest(manifest, handle, entry?.name ?? name.value, thumbnail)).catch(e => { error.value = String(e) }) },
      })
      await refreshExpmapLibrary()
    } catch (e) {
      if (progress.value) progress.value.phase = abort?.signal.aborted ? 'Préparation interrompue — reprise possible' : 'Préparation arrêtée'
      if (!abort?.signal.aborted) throw e
    } finally { expmapBusy.value = false; ownRunning.value = false; abort = undefined }
  })
}
function stop() { stopping.value = true; abort?.abort() }
const stateLabels = { preparing: 'En préparation', ready: 'Prêt', interrupted: 'Interrompu', missing: 'Dossier introuvable', incompatible: 'Incompatible' }
async function open(entry: ExpmapLibraryEntry, video = false) {
  await guard(async () => {
    const doc = await openExpmapLibraryEntry(entry)
    if (doc.manifest.state !== 'complete') throw new Error('Reprendre la préparation pour compléter ce document.')
    selectedExpmapDocumentId.value = entry.id
    if (video) { expmapVideoSelected.value = true; emit('use-video') }
    else expmapOpenDocument.value = doc
  })
}
</script>
<template>
  <div class="expmap-panel">
    <p class="intro">Prépare un rendu une seule fois, puis explore son zoom ou utilise-le dans une vidéo.</p>
    <RenderProgress v-if="progress" :label="stopping && ownRunning ? 'Interruption en cours…' : progress.phase" :done="progress.done" :total="progress.total" :unit="progressUnit" :active="ownRunning"/>
    <p v-if="ownRunning && progress" class="hint">{{ progress.saved }} éléments sauvegardés. Tu pourras reprendre depuis cette sauvegarde. Garde ce panneau ouvert pendant le calcul.</p>
    <button v-if="ownRunning" class="stop" :disabled="stopping" @click="stop">{{ stopping ? 'Interruption…' : 'Interrompre et conserver' }}</button>
    <DenseSection title="1 · Préparer le rendu">
      <fieldset :disabled="expmapBusy">
        <label>Nom <input v-model="name" aria-label="Nom ExpMap"></label>
        <details><summary>Centre fixe · coordonnées précises</summary><label>Centre X <input v-model="cx" aria-label="Centre X ExpMap"></label><label>Centre Y <input v-model="cy" aria-label="Centre Y ExpMap"></label></details>
        <p class="hint">Capture le départ, zoome vers l’arrivée puis capture la fin. Le centre reste fixe ; une échelle plus petite correspond à un zoom plus profond.</p><label>Échelle début <input v-model="start" aria-label="Échelle début ExpMap"></label><button @click="captureStart">Définir le départ depuis la vue</button>
        <label>Échelle fin <input v-model="end" aria-label="Échelle fin ExpMap"></label><button @click="end = String(current.scale)">Définir l’arrivée depuis la vue</button>
        <DenseField v-model="width" label="Largeur" :min="16" :max="3840" :step="2"/><DenseField v-model="height" label="Hauteur" :min="16" :max="2160" :step="2"/><DenseField v-model="density" label="Détail (densité k)" :min="1" :max="8" :step="0.5"/>
        <details v-if="estimate"><summary>Mémoire GPU : {{ (estimate.gpuBytes / 1073741824).toFixed(2) }} GiB</summary><p>14 tuiles en mémoire GPU · {{ (estimate.decodeBytes / 1048576).toFixed(1) }} MiB pour une tuile décodée. Cache complet : {{ (estimate.rawDiskBytes / 1073741824).toFixed(2) }} GiB avant compression.</p></details>
        <p :class="forceRender && problem.kind === 'unsupported' ? 'hint' : 'problem'" v-for="problem in problems" :key="`${problem.field}:${problem.stopIndex}`">{{ problem.field }} : {{ problem.message }}</p>
        <p v-if="!plan" class="problem">Vérifie les coordonnées et les échelles : le départ doit être plus large que l’arrivée.</p>
        <p class="hint">La palette et les couleurs actuelles seront enregistrées dans le document.</p>
        <label><input v-model="forceRender" type="checkbox"> Forcer le rendu — expérimental</label>
        <p v-if="forceRender" class="hint">Cuit les effets tels quels. Des raccords ou différences après reprise peuvent apparaître.</p>
        <button class="primary" :disabled="!engine || !controller || !plan || hasBlockingProblems || !name.trim()" @click="bake()">Créer le rendu ExpMap…</button>
      </fieldset>
      <p class="hint">Une tuile TIFF par doublement, regroupées automatiquement selon la capacité du fichier. Le lecteur conserve 14 tuiles et anticipe la suivante. Le calcul inclut 12 doublements supplémentaires pour couvrir le centre, sans masque.</p>
    </DenseSection>
    <DenseSection title="2 · Ouvrir ou exporter">
      <button :disabled="expmapBusy" @click="guard(async () => attachExpmapDocument(await pickExpmapDirectory('read')))">Importer un rendu existant…</button>
      <p v-if="!expmapLibraryEntries.length" class="empty">Aucun rendu enregistré. Crée ton premier ExpMap ci-dessus ou importe son dossier.</p>
      <article v-for="entry in expmapLibraryEntries" :key="entry.id">
        <img v-if="entry.thumbnail" :src="entry.thumbnail" alt="Aperçu du document" width="80" height="45">
        <input class="entry-name" title="Cliquer pour renommer" :value="entry.name" :aria-label="`Renommer ${entry.name}`" @change="guard(() => renameExpmapLibraryEntry(entry.id, ($event.target as HTMLInputElement).value))">
        <small>{{ stateLabels[entry.state] }}{{ entry.forceRender ? ' · Expérimental' : '' }} · TIFF · {{ entry.width }}×{{ entry.height }} · k={{ entry.density }} · {{ (entry.bytes / 1048576).toFixed(1) }} MiB</small>
        <small>{{ entry.startScale }} → {{ entry.endScale }}</small>
        <div><button class="primary" :disabled="expmapBusy || entry.state !== 'ready'" @click="open(entry)">Ouvrir le lecteur</button><button :disabled="expmapBusy || entry.state !== 'ready'" @click="open(entry, true)">Utiliser en vidéo</button><button v-if="entry.state === 'interrupted' || entry.state === 'preparing'" :disabled="expmapBusy" @click="bake(entry)">Reprendre</button><button :disabled="expmapBusy" @click="guard(async () => attachExpmapDocument(await pickExpmapDirectory('read'), entry.id))">Rattacher</button><button class="secondary" :disabled="expmapBusy" title="Les fichiers restent sur le disque" @click="guard(() => removeExpmapLibraryEntry(entry.id))">Retirer du catalogue</button></div>
      </article>
    </DenseSection>
    <p v-if="error" class="problem" role="alert">{{ error }}</p>
  </div>
</template>
<style scoped>
.expmap-panel{font-size:11px}fieldset{border:0;padding:0;min-width:0}label{display:flex;align-items:center;gap:6px;margin:4px 0}input{min-width:0;width:100%;background:#ffffff0b;color:inherit;border:1px solid #ffffff20;padding:3px}article{border-top:1px solid #ffffff20;padding:7px 0}small{display:block;overflow-wrap:anywhere}button{margin:3px;padding:4px;border:1px solid #ffffff30;border-radius:3px}p{overflow-wrap:anywhere;margin:5px 0}
button{cursor:pointer;transition:background .15s,border-color .15s}button:not(:disabled):hover{background:#ffffff18;border-color:#ffffff70}button:disabled{opacity:.4;cursor:not-allowed}button.primary{background:#2563eb;border-color:#60a5fa;color:white;font-weight:600}button.primary:not(:disabled):hover{background:#1d4ed8}button.stop{border-color:#e4aa60;color:#f3c78f}button.secondary{opacity:.7}button:focus-visible,input:focus-visible,summary:focus-visible{outline:2px solid #60a5fa;outline-offset:2px}.hint{opacity:.7;line-height:1.5}.intro{line-height:1.5;margin:0 0 8px}.problem{padding:7px;border-left:2px solid #e4aa60;background:#e4aa6012}.empty{padding:12px 8px;text-align:center;opacity:.7;border:1px dashed #ffffff30;border-radius:5px}summary{cursor:pointer;padding:6px 0;opacity:.8}article img{float:left;object-fit:cover;margin:0 8px 6px 0;border-radius:4px}article{display:flow-root}.entry-name{font-weight:600}label>input{flex:1}label{white-space:nowrap}
</style>
