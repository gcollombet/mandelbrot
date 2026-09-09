<script setup lang="ts">
import { computed } from 'vue'
import { DenseField, DenseSection, DenseSelect } from './dense'
import { EXPMAP_EASES, motionProgress, motionSettings, validateMotion, type ExpmapMotion } from '../expmap/motion'
import { compactNumber } from '../expmap/controls'
const props = defineProps<{ modelValue: Partial<ExpmapMotion>; durationSeconds: number }>()
const emit = defineEmits<{ 'update:modelValue': [value: ExpmapMotion] }>()
const motion = computed(() => motionSettings(props.modelValue))
const total = computed(() => props.durationSeconds + motion.value.holdSeconds)
const problem = computed(() => { try { validateMotion(motion.value, props.durationSeconds); return '' } catch(e) { return (e as Error).message } })
function change(key: keyof ExpmapMotion, value: string | number) { emit('update:modelValue', { ...motion.value, [key]: value }) }
function minibrot() { emit('update:modelValue', { easeIn: 'smooth', easeInSeconds: Math.min(1, props.durationSeconds * .1), easeOut: 'linger', easeOutSeconds: Math.min(12, props.durationSeconds * .5), holdSeconds: 2 }) }
const path = computed(() => problem.value ? '' : Array.from({length:101},(_,i)=>`${i?'L':'M'}${i*3},${48-44*motionProgress({...motion.value,durationSeconds:props.durationSeconds},total.value*i/100)}`).join(' '))
</script>
<template>
  <DenseSection title="Entrée et fin progressives">
    <button class="motion-preset" @click="minibrot">Arrivée sur minibrot</button>
    <DenseSelect :model-value="motion.easeIn" label="Entrée" :options="[...EXPMAP_EASES]" @update:model-value="change('easeIn',String($event))"/>
    <DenseField v-if="motion.easeIn !== 'none'" :model-value="motion.easeInSeconds" label="Durée d’entrée" unit="s" :f="compactNumber" :min="0" :max="86400" :step=".1" @update:model-value="change('easeInSeconds',$event)"/>
    <DenseSelect :model-value="motion.easeOut" label="Sortie" :options="[...EXPMAP_EASES]" @update:model-value="change('easeOut',String($event))"/>
    <DenseField v-if="motion.easeOut !== 'none'" :model-value="motion.easeOutSeconds" label="Durée de sortie" unit="s" :f="compactNumber" :min="0" :max="86400" :step=".1" @update:model-value="change('easeOutSeconds',$event)"/>
    <DenseField :model-value="motion.holdSeconds" label="Palier final fixe" unit="s" :f="compactNumber" :min="0" :max="3600" :step=".5" @update:model-value="change('holdSeconds',$event)"/>
    <svg viewBox="0 0 300 52" role="img" aria-label="Progression du trajet dans le temps ; la partie horizontale correspond au palier fixe"><path d="M0 48H300" class="axis"/><path :d="path"/></svg>
    <p v-if="problem" role="alert">{{ problem }}</p>
    <p>Trajet {{ compactNumber(durationSeconds) }} s + palier {{ compactNumber(motion.holdSeconds) }} s = <strong>{{ compactNumber(total) }} s</strong>.</p>
    <p>Les transitions sont incluses dans le trajet. Le zoom et la rotation ralentissent ensemble. Un trajet raccourci réduit proportionnellement les transitions trop longues.</p>
  </DenseSection>
</template>
<style scoped>
p{font-size:11px;color:var(--ink-2,#b4c0d4);margin:5px 0}p[role=alert]{color:#ffc1ae}svg{width:100%;height:54px;margin-top:5px;background:#ffffff04;border-radius:5px}path{stroke:#8ab5fa;stroke-width:2;fill:none}.axis{stroke:#ffffff20;stroke-width:1}.motion-preset{background:#ffffff0b;color:inherit;border:1px solid #ffffff25;border-radius:5px;padding:5px 7px;font-size:12px;cursor:pointer;margin-bottom:5px}
</style>
