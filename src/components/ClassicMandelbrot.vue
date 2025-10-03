<script setup lang="ts">
import { ref } from 'vue';
import Mandelbrot from './Mandelbrot.vue';

interface MandelbrotPoint {
  name: string;
  cx: string;
  cy: string;
  scale: string;
  angle: string;
  description: string;
}

const points: MandelbrotPoint[] = [
  {
    name: "Bord complexe 2",
    cx: "-0.7746806106269039",
    cy: "-0.1374168856037867",
    scale: "0.000000000001",
    angle: "0.0",
    description: "Un autre point sur le bord, zoom extrême."
  },
  {
    name: "Ile de Julia",
    cx: "-1.768778777",
    cy: "0.001738993",
    scale: "0.0000005",
    angle: "0.0",
    description: "Un point dans une île de Julia."
  },
  {
    name: 'Centre',
    cx: '-0.75',
    cy: '0.0',
    scale: '1.1',
    angle: '0.0',
    description: "Le centre de l'ensemble, typiquement stable et noir."
  },
  {
    name: 'Cuspide',
    cx: '0.25',
    cy: '0.0',
    scale: '1.1',
    angle: '0.0',
    description: "La pointe droite, limite de stabilité."
  },
  {
    name: 'Bulbe secondaire',
    cx: '-1.0',
    cy: '0.0',
    scale: '1.1',
    angle: '0.0',
    description: "Un bulbe secondaire, typiquement stable."
  },
  {
    name: "Bord complexe 1",
    cx: "-0.743643887037151",
    cy: "0.13182590420533",
    scale: "0.00001",
    angle: "0.0",
    description: "Un point sur le bord, zone de complexité maximale."
  },

  {
    name: "Hors ensemble",
    cx: "1.0",
    cy: "1.0",
    scale: "1.1",
    angle: "0.0",
    description: "Un point clairement hors de l'ensemble, divergence rapide."
  }
];

const selectedIndex = ref(0);
const selectedPoint = ref(points[0]);

function onSelectChange(e: Event) {
  const idx = Number((e.target as HTMLSelectElement).value);
  selectedIndex.value = idx;
  selectedPoint.value = points[idx];
}
</script>

<template>
  <div>
    <label for="mandelbrot-select">Choisissez un point classique :</label>
    <select id="mandelbrot-select" @change="onSelectChange" :value="selectedIndex">
      <option v-for="(pt, idx) in points" :key="pt.name" :value="idx">{{ pt.name }}</option>
    </select>
    <p>{{ selectedPoint.description }}</p>
    <Mandelbrot
      :scale="selectedPoint.scale"
      :angle="selectedPoint.angle"
      :cx="selectedPoint.cx"
      :cy="selectedPoint.cy"
      :activatePalette="true"
      :activateSkybox="false"
      :activateTessellation="false"
      :activateWebcam="false"
      :activateShading="false"
    />
  </div>
</template>

