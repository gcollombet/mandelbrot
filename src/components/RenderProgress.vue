<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ label: string; done: number; total: number; unit: string; active?: boolean }>()
const percent = computed(() => props.total > 0 ? Math.min(props.active ? 99 : 100, Math.floor(100 * props.done / props.total)) : 0)
</script>
<template>
  <div class="render-progress" :aria-busy="active">
    <div class="heading"><span role="status">{{ label }}</span><strong v-if="total > 0">{{ percent }} %</strong></div>
    <progress :aria-label="label" :value="total > 0 ? percent : undefined" max="100" />
    <small v-if="total > 0">{{ done.toLocaleString('fr-FR') }} / {{ total.toLocaleString('fr-FR') }} {{ unit }}</small>
  </div>
</template>
<style scoped>
.render-progress{padding:9px 10px;background:rgba(96,165,250,.08);border:1px solid rgba(96,165,250,.24);border-radius:6px;margin:8px 0;font-size:11px}.heading{display:flex;justify-content:space-between;gap:8px;margin-bottom:6px}.heading strong{font-variant-numeric:tabular-nums;white-space:nowrap}progress{display:block;width:100%;height:8px;appearance:none;border:0;border-radius:5px;overflow:hidden;background:#ffffff18;accent-color:#60a5fa}progress::-webkit-progress-bar{background:#ffffff18;border-radius:5px}progress::-webkit-progress-value{background:#60a5fa;border-radius:5px;transition:width .15s}progress::-moz-progress-bar{background:#60a5fa}progress:indeterminate{opacity:.65}small{display:block;margin-top:5px;opacity:.75;font-variant-numeric:tabular-nums}
</style>
