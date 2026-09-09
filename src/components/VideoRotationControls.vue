<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { DenseField, DenseSection } from './dense'
import { compactNumber } from '../expmap/controls'
const props=defineProps<{fromAngle:number;toAngle:number;currentAngle?:number;captureLabel?:string}>()
const emit=defineEmits<{change:[value:{fromAngle:number;toAngle:number}]}>()
const direction=ref(1)
watch(()=>props.toAngle-props.fromAngle,delta=>{if(delta)direction.value=Math.sign(delta)},{immediate:true})
const turns=computed(()=>Math.abs(props.toAngle-props.fromAngle)/(2*Math.PI))
const degrees=(r:number)=>((r*180/Math.PI)%360+360)%360
function angle(value:number){const fromAngle=value*Math.PI/180;emit('change',{fromAngle,toAngle:fromAngle+(props.toAngle-props.fromAngle)})}
function count(value:number){emit('change',{fromAngle:props.fromAngle,toAngle:props.fromAngle+Math.max(0,value)*2*Math.PI*direction.value})}
function orient(value:number){direction.value=value;count(turns.value)}
</script>
<template>
  <DenseSection title="Rotation">
    <DenseField :model-value="degrees(fromAngle)" label="Angle de départ" unit="°" :f="compactNumber" :min="0" :max="360" :step="1" @update:model-value="angle"/>
    <div class="rotation-row"><button :disabled="currentAngle === undefined" @click="angle(currentAngle! * 180 / Math.PI)">{{ captureLabel ?? 'Angle actuel' }}</button><button :aria-pressed="direction===1" @click="orient(1)">↻ Horaire</button><button :aria-pressed="direction===-1" @click="orient(-1)">↺ Antihoraire</button></div>
    <DenseField :model-value="turns" label="Nombre de tours" :f="v=>v.toLocaleString('fr-FR',{maximumFractionDigits:2})" :min="0" :max="1000" :step=".25" @update:model-value="count"/>
    <div class="rotation-row"><button v-for="(n,i) in [0,.25,.5,1,2]" :key="n" @click="count(n)">{{ ['0','¼','½','1','2'][i] }}</button><small>Arrivée : {{ compactNumber(degrees(toAngle)) }}°</small></div>
  </DenseSection>
</template>
<style scoped>
.rotation-row{display:flex;align-items:center;flex-wrap:wrap;gap:5px;margin:5px 0}button{background:#ffffff0b;color:inherit;border:1px solid #ffffff25;border-radius:5px;padding:5px 7px;font-size:12px;cursor:pointer}button[aria-pressed=true]{background:#34517b;border-color:#6c93c6}button:disabled{opacity:.45}small{font-size:11px;color:var(--ink-2,#b4c0d4)}
</style>
