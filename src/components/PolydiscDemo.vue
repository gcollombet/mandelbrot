<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const width = ref(600);
const height = ref(460);

// Rayons normalisés : u = x/Rz, v = y/Rc
const u = ref(0.5);
const v = ref(0.25);
const cutD = ref(4);

const GRID = 11; // coefficients i,j de 0 à GRID-1

// Queue anisotrope exacte, avec branche diagonale sûre (anisotropicTailClosed)
function anisotropicTailClosed(D: number, uu: number, vv: number): number {
  if (Math.abs(uu - vv) < 1e-9) {
    return (Math.pow(uu, D) * (D + 1 - D * uu)) / ((1 - uu) * (1 - uu));
  }
  return (
    (Math.pow(uu, D + 1) / (1 - uu) - Math.pow(vv, D + 1) / (1 - vv)) / (uu - vv)
  );
}

function draw() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const W = width.value;
  const H = height.value;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#1e1e2e';
  ctx.fillRect(0, 0, W, H);

  // --- Gauche : les deux disques du polydisque ---
  const discR = Math.min(W * 0.16, 85);
  const d1x = W * 0.17;
  const d2x = W * 0.17;
  const d1y = H * 0.27;
  const d2y = H * 0.68;

  const drawDisc = (cx: number, cy: number, rNorm: number, labelBig: string, labelSmall: string, color: string) => {
    // Disque de Cauchy (rayon R)
    ctx.fillStyle = 'rgba(136, 136, 204, 0.12)';
    ctx.beginPath();
    ctx.arc(cx, cy, discR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8888cc';
    ctx.setLineDash([5, 4]);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, discR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Disque d'évaluation (rayon normalisé)
    ctx.fillStyle = color.replace(')', ', 0.25)').replace('rgb', 'rgba');
    ctx.beginPath();
    ctx.arc(cx, cy, discR * rNorm, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, discR * rNorm, 0, Math.PI * 2);
    ctx.stroke();

    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#8888cc';
    ctx.fillText(labelBig, cx, cy - discR - 8);
    ctx.fillStyle = color;
    ctx.fillText(labelSmall, cx, cy + discR + 18);
  };

  drawDisc(d1x, d1y, u.value, 'plan δz : |δz| ≤ Rz', `zone utile : u = x/Rz = ${u.value.toFixed(2)}`, 'rgb(80, 180, 255)');
  drawDisc(d2x, d2y, v.value, 'plan δc : |δc| ≤ Rc', `zone utile : v = y/Rc = ${v.value.toFixed(2)}`, 'rgb(255, 169, 77)');

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('polydisque = produit', d1x, (d1y + d2y) / 2 - 8);
  ctx.fillText('des deux disques', d1x, (d1y + d2y) / 2 + 6);

  // --- Droite : grille des monômes uⁱ·vʲ ---
  const gx0 = W * 0.38;
  const gw = W - gx0 - 20;
  const gy0 = 45;
  const gh = H - gy0 - 80;
  const cell = Math.min(gw / GRID, gh / GRID);

  for (let i = 0; i < GRID; i++) {
    for (let j = 0; j < GRID; j++) {
      const val = Math.pow(u.value, i) * Math.pow(v.value, j);
      const x = gx0 + i * cell;
      const y = gy0 + j * cell;
      const inTail = i + j >= cutD.value;
      // Intensité log pour rester lisible
      const intensity = Math.max(0, 1 + Math.log10(Math.max(val, 1e-12)) / 8);
      if (inTail) {
        ctx.fillStyle = `rgba(255, 169, 77, ${(0.12 + 0.85 * intensity).toFixed(3)})`;
      } else {
        ctx.fillStyle = `rgba(80, 180, 255, ${(0.12 + 0.85 * intensity).toFixed(3)})`;
      }
      ctx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
    }
  }

  // Diagonale de coupe i+j = D
  ctx.strokeStyle = '#fff';
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(gx0 + cutD.value * cell, gy0);
  ctx.lineTo(gx0, gy0 + cutD.value * cell);
  ctx.stroke();
  ctx.setLineDash([]);

  // Axes de la grille
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  for (let i = 0; i < GRID; i += 2) {
    ctx.fillText(String(i), gx0 + i * cell + cell / 2, gy0 + GRID * cell + 14);
  }
  ctx.textAlign = 'right';
  for (let j = 0; j < GRID; j += 2) {
    ctx.fillText(String(j), gx0 - 6, gy0 + j * cell + cell / 2 + 4);
  }
  ctx.textAlign = 'center';
  ctx.fillText('i (degré en δz)', gx0 + (GRID * cell) / 2, gy0 + GRID * cell + 30);
  ctx.save();
  ctx.translate(gx0 - 28, gy0 + (GRID * cell) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('j (degré en δc)', 0, 0);
  ctx.restore();

  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.fillText('poids des monômes uⁱ·vʲ (bleu : gardés, orange : queue i+j ≥ D)', gx0, 22);

  // Valeurs des majorants
  const aniso = anisotropicTailClosed(cutD.value, u.value, v.value);
  const thetaDiag = Math.max(u.value, v.value);
  const diag = anisotropicTailClosed(cutD.value, thetaDiag, thetaDiag);
  const gain = diag / Math.max(aniso, 1e-12);
  ctx.fillStyle = '#ffa94d';
  ctx.fillText(`Queue anisotrope exacte  : ${aniso.toPrecision(4)}`, gx0, gy0 + GRID * cell + 52);
  ctx.fillStyle = '#8888cc';
  ctx.fillText(`Majorant diagonal (θ=max): ${diag.toPrecision(4)}   → gain ×${gain.toFixed(1)}`, gx0, gy0 + GRID * cell + 70);
}

function updateSize() {
  if (!containerRef.value) return;
  const rect = containerRef.value.getBoundingClientRect();
  width.value = Math.round(rect.width);
  height.value = 460;
  if (canvasRef.value) {
    canvasRef.value.width = width.value;
    canvasRef.value.height = height.value;
  }
  draw();
}

onMounted(() => {
  nextTick(() => {
    updateSize();
    if (containerRef.value) {
      const ro = new ResizeObserver(() => updateSize());
      ro.observe(containerRef.value);
    }
  });
});

function onUInput(e: Event) {
  u.value = parseFloat((e.target as HTMLInputElement).value);
  draw();
}
function onVInput(e: Event) {
  v.value = parseFloat((e.target as HTMLInputElement).value);
  draw();
}
function onCutInput(e: Event) {
  cutD.value = parseInt((e.target as HTMLInputElement).value);
  draw();
}
</script>
<template>
  <div style="display: flex; flex-direction: column; gap: 8px; align-items: stretch;">
    <div style="display: flex; align-items: center; gap: 12px; padding: 0 4px; flex-wrap: wrap;">
      <label style="font-size: 13px; font-family: monospace; white-space: nowrap; color: #50b4ff;">u = x/Rz :</label>
      <input type="range" min="0.05" max="0.9" step="0.01" :value="u" @input="onUInput" style="flex: 1; min-width: 80px;" />
      <span style="font-size: 13px; font-family: monospace; min-width: 40px; text-align: right; color: #aaa;">{{ u.toFixed(2) }}</span>
      <label style="font-size: 13px; font-family: monospace; white-space: nowrap; color: #ffa94d;">v = y/Rc :</label>
      <input type="range" min="0.05" max="0.9" step="0.01" :value="v" @input="onVInput" style="flex: 1; min-width: 80px;" />
      <span style="font-size: 13px; font-family: monospace; min-width: 40px; text-align: right; color: #aaa;">{{ v.toFixed(2) }}</span>
      <label style="font-size: 13px; font-family: monospace; white-space: nowrap; color: #aaa;">D :</label>
      <input type="range" min="1" max="10" step="1" :value="cutD" @input="onCutInput" style="flex: 1; min-width: 60px;" />
      <span style="font-size: 13px; font-family: monospace; min-width: 24px; text-align: right; color: #aaa;">{{ cutD }}</span>
    </div>
    <div ref="containerRef" style="position: relative; width: 100%; height: 460px;">
      <canvas ref="canvasRef" :width="width" :height="height" style="width: 100%; height: 100%; display: block;"></canvas>
    </div>
  </div>
</template>
