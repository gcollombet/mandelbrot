<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { DenseField, DenseSelect } from './dense'
import { videoBitrate, type VideoEncoding } from '../videoEncoding'
import type { Mp4Codec } from '../videoEncoderSink'
const props = defineProps<{ modelValue: VideoEncoding; codec: Mp4Codec; width: number; height: number; fps: number; duration: number; hdr?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [VideoEncoding] }>()
const { t } = useI18n()
const options = computed(() => ['standard','high','maximum','custom', ...(props.hdr ? ['quantizer'] : [])].map(value => ({ value, label: t(`video.encoding.${value}`) })))
const bitrate = computed(() => { try { return videoBitrate(props.codec, props.width, props.height, props.fps, props.modelValue) } catch { return null } })
function profile(value: string | number) { emit('update:modelValue', { ...props.modelValue, profile: value as VideoEncoding['profile'] }) }
</script>
<template>
  <div>
    <DenseSelect :model-value="modelValue.profile" :label="t('video.encoding.profile')" :options="options" @update:model-value="profile"/>
    <DenseField v-if="modelValue.profile === 'custom'" :model-value="modelValue.bitrateMbps" :label="t('video.encoding.bitrate')" unit="Mbit/s" :min="0.1" :max="2000" :step="0.1" :default="100" @update:model-value="emit('update:modelValue', { ...modelValue, bitrateMbps: $event })"/>
    <p v-if="modelValue.profile !== 'quantizer'" class="encoding-hint">{{ bitrate === null ? t('video.encoding.invalid') : t('video.encoding.estimate', { bitrate: +(bitrate / 1e6).toFixed(2), size: Math.round(bitrate * duration / 8 / 1e6) }) }}</p>
    <p class="encoding-hint">{{ t(modelValue.profile === 'quantizer' ? 'video.encoding.quantizerHint' : 'video.encoding.constantHint') }}</p>
  </div>
</template>
<style scoped>.encoding-hint { font-size: 11px; color: var(--muted, #b4c0d4); margin: 5px 0; }</style>
