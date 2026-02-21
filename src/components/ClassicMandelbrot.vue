<script setup lang="ts">
import {nextTick, type Ref, ref} from 'vue';
import Mandelbrot from './Mandelbrot.vue';

interface MandelbrotPoint {
  name: string;
  cx: string;
  cy: string;
  scale: string;
  angle: number;
  description: string;
}

const points: MandelbrotPoint[] = [
  {
    name: "Broderies",
    cx: "-0.7746806106269039",
    cy: "-0.1374168856037867",
    scale: "0.000000000001",
    angle: 0.0,
    description: "Un point sur le bord, beaucoup d'itération et fort niveau de zoom"
  },
  {
    name: "Ile de Julia",
    cx: "-1.768778777",
    cy: "0.001738993",
    scale: "0.0000005",
    angle: 0.0,
    description: "Un point dans une île de Julia."
  },
  {
    name: "Vallée des hippocampes",
    cx: "-0.7457978898549",
    cy: "-0.164195216032",
    scale: "0.0003399",
    angle: 0.0,
    description: "Cet endroit est souvent nommé la vallée des hippocampes"
  },
  {
    name: "Vallé des spirales",
    cx: "-1.257369977593720294",
    cy: "0.03801433143232926",
    scale: "0.000000000000009898691265604",
    angle: 0.0,
    description: "Un minibrot niché dans la vallée des spirales."
  },
  {
    name: "Tourbillons",
    cx: "-1.749615506227909595",
    cy: "0.00000000148994828809554127",
    scale: "0.000000111597126685994161",
    angle: 0.0,
    description: "Un joli motif qui se trouve vers la pointe du mandelbrot"
  },

];

const selectedIndex = ref(0);
const selectedPoint = ref(points[0]);
const mandelbrotRef: Ref<null | typeof Mandelbrot> = ref(null);

async function onSelectChange(e: Event) {
  const idx = Number((e.target as HTMLSelectElement).value);
  selectedIndex.value = idx;
  selectedPoint.value = points[idx];
  await nextTick();
  await mandelbrotRef.value?.drawOnce();
}
</script>

<template>
  <div>
    <label for="mandelbrot-select">Vous pouvez observez cette variété en parcours ces exemples :&nbsp;</label>
    <select id="mandelbrot-select" @change="onSelectChange" :value="selectedIndex">
      <option v-for="(pt, idx) in points" :key="pt.name" :value="idx">{{ pt.name }}</option>
    </select>
    <p>{{ selectedPoint?.description }}</p>
    <Mandelbrot
      ref="mandelbrotRef"
      :scale="selectedPoint?.scale"
      :angle="selectedPoint?.angle"
      :cx="selectedPoint?.cx"
      :cy="selectedPoint?.cy"
      :activatePalette="true"
      :activateSkybox="false"
      :activateTessellation="false"
      :activateWebcam="false"
      :activateShading="false"
      :activateSmoothness="true"
    />
  </div>
</template>
