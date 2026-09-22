<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { documentEffects, saveDocumentEffects } from '../expmap/effects'
import { radialConfig, radialMode, type RadialMode } from '../expmap/radial'
const props=defineProps<{documentId:string;tileCount:number}>()
const { t }=useI18n()
const effects=computed(()=>documentEffects(props.documentId))
const mode=computed(()=>radialMode(effects.value))
const RADIAL_MODES:RadialMode[]=['mirror','normal','repeat','pingpong','radial','folds']
const choices=computed<{value:RadialMode;label:string;description:string}[]>(()=>RADIAL_MODES.map(value=>({value,label:t(`expmapControls.radial.modes.${value}.label`),description:t(`expmapControls.radial.modes.${value}.description`)})))
function select(value:RadialMode){saveDocumentEffects(props.documentId,{...effects.value,radialMode:value,loopOctaves:value!=='normal'})}
const config=computed(()=>radialConfig(effects.value,props.tileCount))
const start=computed(()=>config.value.start)
const available=computed(()=>props.tileCount-start.value)
const period=computed(()=>config.value.period)
function setStart(value:number){
  if(!Number.isInteger(value)||value<0||value>=props.tileCount)return
  saveDocumentEffects(props.documentId,{...effects.value,radialStart:value})
}
const mirrorRadius=computed(()=>100*Math.pow(2,-(effects.value.mirrorDepth??1)))
function setMirrorRadius(value:number){
  if(!Number.isFinite(value)||value<100/64||value>100*Math.pow(2,-.25))return
  saveDocumentEffects(props.documentId,{...effects.value,mirrorDepth:Math.log2(100/value)})
}
function setPeriod(value:number){
  if(!Number.isInteger(value)||value<1||value>available.value)return
  saveDocumentEffects(props.documentId,{...effects.value,[mode.value==='pingpong'?'radialTurn':'radialPeriod']:value})
}
</script>
<template>
  <section class="radial" :aria-label="t('expmapControls.radial.title')">
    <strong>{{ t('expmapControls.radial.title') }}</strong>
    <div class="modes" role="group" :aria-label="t('expmapControls.radial.modeAria')"><button v-for="choice in choices" :key="choice.value" type="button" :aria-pressed="mode===choice.value" :title="choice.description" @click="select(choice.value)">{{ choice.label }}</button></div>
    <div v-if="['pingpong','radial'].includes(mode)" class="period">
      <label>{{ t('expmapControls.radial.startInBand') }} <input :aria-label="t('expmapControls.radial.startAria')" type="number" min="0" :max="tileCount-1" step="1" :value="start" @change="setStart(Number(($event.target as HTMLInputElement).value))"> {{ t('expmapControls.radial.octaves') }}</label>
      <input :aria-label="t('expmapControls.radial.startSliderAria')" type="range" min="0" :max="tileCount-1" step="1" :value="start" @input="setStart(Number(($event.target as HTMLInputElement).value))">
      <button type="button" @click="setStart(0)">{{ t('expmapControls.radial.bandStart') }}</button>
      <small>{{ t('expmapControls.radial.range', { from: start, to: start+period }) }}</small>
    </div>
    <div v-if="['pingpong','radial','folds'].includes(mode)" class="period">
      <label>{{ mode==='pingpong'?t('expmapControls.radial.forthExtent'):t('expmapControls.radial.foldWidth') }} <input :aria-label="t('expmapControls.radial.foldDepthAria')" type="number" min="1" :max="available" step="1" :value="period" @change="setPeriod(Number(($event.target as HTMLInputElement).value))"> {{ t('expmapControls.radial.octaves') }}</label>
      <div role="group" :aria-label="t('expmapControls.radial.depthPresetsAria')"><button v-for="n in [1,2,4,8].filter(n=>n<=available)" :key="n" type="button" :aria-pressed="period===n" @click="setPeriod(n)">{{ n }}</button><button type="button" :aria-pressed="period===available" @click="setPeriod(available)">{{ t('expmapControls.radial.all') }}</button></div>
    </div>
    <div v-if="mode==='mirror'" class="period">
      <label>{{ t('expmapControls.radial.mirrorRadius') }} <input :aria-label="t('expmapControls.radial.mirrorRadiusAria')" type="range" min="2" max="84" step="1" :value="mirrorRadius" @input="setMirrorRadius(Number(($event.target as HTMLInputElement).value))"><output>{{ mirrorRadius.toFixed(0) }} %</output></label>
      <div role="group" :aria-label="t('expmapControls.radial.mirrorRadiiAria')"><button v-for="r in [12.5,25,50,75]" :key="r" type="button" :aria-pressed="Math.abs(mirrorRadius-r)<.01" @click="setMirrorRadius(r)">{{ r }} %</button></div>
      <small>{{ t('expmapControls.radial.mirrorHint') }}</small>
    </div>
    <small>{{ choices.find(c=>c.value===mode)?.description }}</small>
  </section>
</template>
<style scoped>
.radial{display:grid;gap:6px;padding:8px 0;border-bottom:1px solid #ffffff18;font-size:12px}strong{font-size:11px;color:#b4c6df}.modes{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:4px}.period{display:flex;align-items:center;flex-wrap:wrap;gap:8px}.period div{display:flex;gap:3px}label{display:flex;align-items:center;gap:5px}input{width:65px}button,input{font:inherit;color:inherit;background:#263047;border:1px solid #455271;border-radius:5px;padding:5px 7px}button{cursor:pointer}button[aria-pressed=true]{background:#34517b;border-color:#8ab5fa}button:focus-visible,input:focus-visible{outline:2px solid #a8c5ff;outline-offset:2px}small{color:#b4c0d4;font-size:11px}
</style>
