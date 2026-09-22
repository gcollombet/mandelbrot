<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { computed } from 'vue';
import { useDenseView, type DenseStyle, type DenseShape, type DenseFieldChar, type DenseChroma } from './useDenseView';
const { t } = useI18n();

defineEmits<{ (e: 'close'): void }>();
const view = useDenseView();

const STYLES = computed((): { v: DenseStyle; l: string }[] => [
  { v: 'clair', l: t('dense.viewMenu.styles.clair') },
  { v: 'sober', l: t('dense.viewMenu.styles.sober') },
  { v: 'glow', l: t('dense.viewMenu.styles.glow') },
]);
const SHAPES = computed((): { v: DenseShape; l: string }[] => [
  { v: 'net', l: t('dense.viewMenu.shapes.net') },
  { v: 'doux', l: t('dense.viewMenu.shapes.doux') },
  { v: 'rond', l: t('dense.viewMenu.shapes.rond') },
]);
const FIELDS = computed((): { v: DenseFieldChar; l: string }[] => [
  { v: 'gauge', l: t('dense.viewMenu.fields.gauge') },
  { v: 'sober', l: t('dense.viewMenu.fields.sober') },
  { v: 'minimal', l: t('dense.viewMenu.fields.minimal') },
]);
const CHROMAS = computed((): { v: DenseChroma; l: string }[] => [
  { v: 'mono', l: t('dense.viewMenu.chromas.mono') },
  { v: 'code', l: t('dense.viewMenu.chromas.code') },
  { v: 'vif', l: t('dense.viewMenu.chromas.vif') },
]);
</script>

<template>
  <div class="scrim" @click="$emit('close')"></div>
  <div class="menu" @click.stop>
    <h4>{{ t('dense.viewMenu.theme') }}</h4>
    <div class="opts">
      <button v-for="o in STYLES" :key="o.v" class="opt" :class="{ on: view.style === o.v }" @click="view.style = o.v">{{ o.l }}</button>
    </div>
    <h4>{{ t('dense.viewMenu.shape') }}</h4>
    <div class="opts">
      <button v-for="o in SHAPES" :key="o.v" class="opt" :class="{ on: view.shape === o.v }" @click="view.shape = o.v">{{ o.l }}</button>
    </div>
    <h4>{{ t('dense.viewMenu.fieldsTitle') }}</h4>
    <div class="opts">
      <button v-for="o in FIELDS" :key="o.v" class="opt" :class="{ on: view.field === o.v }" @click="view.field = o.v">{{ o.l }}</button>
    </div>
    <h4>{{ t('dense.viewMenu.chroma') }}</h4>
    <div class="opts">
      <button v-for="o in CHROMAS" :key="o.v" class="opt" :class="{ on: view.chroma === o.v }" @click="view.chroma = o.v">{{ o.l }}</button>
    </div>
  </div>
</template>
