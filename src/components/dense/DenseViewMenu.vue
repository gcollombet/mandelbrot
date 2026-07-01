<script setup lang="ts">
import { useDenseView, type DenseLayout, type DenseStyle, type DenseShape, type DenseFieldChar, type DenseChroma } from './useDenseView';

defineEmits<{ (e: 'close'): void }>();
const view = useDenseView();

// 'tabs' layout is intentionally omitted — it is buggy and not exposed.
const LAYOUTS: { v: DenseLayout; l: string }[] = [
  { v: 'columns', l: 'Colonnes' },
  { v: 'inspector', l: 'Inspecteur' },
];
const STYLES: { v: DenseStyle; l: string }[] = [
  { v: 'clair', l: 'Clair' },
  { v: 'sober', l: 'Sobre' },
  { v: 'glow', l: 'Glow' },
];
const SHAPES: { v: DenseShape; l: string }[] = [
  { v: 'net', l: 'Net' },
  { v: 'doux', l: 'Doux' },
  { v: 'rond', l: 'Rond' },
];
const FIELDS: { v: DenseFieldChar; l: string }[] = [
  { v: 'gauge', l: 'Jauge' },
  { v: 'sober', l: 'Sobre' },
  { v: 'minimal', l: 'Minimal' },
];
const CHROMAS: { v: DenseChroma; l: string }[] = [
  { v: 'mono', l: 'Monochrome' },
  { v: 'code', l: 'Codé' },
  { v: 'vif', l: 'Vif' },
];
</script>

<template>
  <div class="scrim" @click="$emit('close')"></div>
  <div class="menu" @click.stop>
    <h4>Disposition</h4>
    <div class="opts">
      <button v-for="o in LAYOUTS" :key="o.v" class="opt" :class="{ on: view.layout === o.v }" @click="view.layout = o.v">{{ o.l }}</button>
    </div>
    <h4>Thème</h4>
    <div class="opts">
      <button v-for="o in STYLES" :key="o.v" class="opt" :class="{ on: view.style === o.v }" @click="view.style = o.v">{{ o.l }}</button>
    </div>
    <h4>Silhouette</h4>
    <div class="opts">
      <button v-for="o in SHAPES" :key="o.v" class="opt" :class="{ on: view.shape === o.v }" @click="view.shape = o.v">{{ o.l }}</button>
    </div>
    <h4>Champs</h4>
    <div class="opts">
      <button v-for="o in FIELDS" :key="o.v" class="opt" :class="{ on: view.field === o.v }" @click="view.field = o.v">{{ o.l }}</button>
    </div>
    <h4>Chromatisme</h4>
    <div class="opts">
      <button v-for="o in CHROMAS" :key="o.v" class="opt" :class="{ on: view.chroma === o.v }" @click="view.chroma = o.v">{{ o.l }}</button>
    </div>
  </div>
</template>
