<script setup lang="ts">
import {ref} from 'vue';
import type {MandelbrotExposed} from '../types/MandelbrotExposed.ts';

const props = defineProps<{
  mandelbrotRef: MandelbrotExposed | null;
}>();

const expanded = defineModel<boolean>('expanded', { default: false });
const activeButton = ref<string | null>(null);

// Intervalles pour les actions répétées
let intervalId: number | null = null;

const toggleExpanded = () => {
  expanded.value = !expanded.value;
  if (!expanded.value) {
    stopAllActions();
  }
};

const handleCompassTouch = (e: TouchEvent) => {
  e.preventDefault();
  e.stopPropagation();
  toggleExpanded();
};

const stopAllActions = () => {
  activeButton.value = null;
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
};

// Actions de navigation
const startMoving = (direction: 'north' | 'south' | 'east' | 'west') => {
  activeButton.value = direction;
  const moveStep = 0.01;
  
  const performMove = () => {
    if (!props.mandelbrotRef) return;
    switch (direction) {
      case 'north':
        props.mandelbrotRef.translate(0, moveStep);
        break;
      case 'south':
        props.mandelbrotRef.translate(0, -moveStep);
        break;
      case 'west':
        props.mandelbrotRef.translate(-moveStep, 0);
        break;
      case 'east':
        props.mandelbrotRef.translate(moveStep, 0);
        break;
    }
  };
  
  performMove();
  intervalId = window.setInterval(performMove, 16);
};

const startRotating = (direction: 'left' | 'right') => {
  activeButton.value = `rotate-${direction}`;
  const angleStep = 0.025;
  
  const performRotate = () => {
    if (!props.mandelbrotRef) return;
    if (direction === 'left') {
      props.mandelbrotRef.rotate(angleStep);
    } else {
      props.mandelbrotRef.rotate(-angleStep);
    }
  };
  
  performRotate();
  intervalId = window.setInterval(performRotate, 16);
};

const startZooming = (direction: 'in' | 'out') => {
  activeButton.value = `zoom-${direction}`;
  const zoomFactor = 0.97;
  
  const performZoom = () => {
    if (!props.mandelbrotRef) return;
    if (direction === 'in') {
      props.mandelbrotRef.zoom(zoomFactor);
    } else {
      props.mandelbrotRef.zoom(1 / zoomFactor);
    }
  };
  
  performZoom();
  intervalId = window.setInterval(performZoom, 16);
};

// Gestionnaires d'événements tactiles
const handleTouchStart = (e: TouchEvent, action: () => void) => {
  e.preventDefault();
  action();
};
const handleTouchEnd = (e: TouchEvent) => {
  e.preventDefault();
  stopAllActions();
};
</script>


<template>
  <div class="mobile-nav-controls">
    <!-- Bouton central boussole -->
    <button
      class="nav-button compass-button"
      @click="toggleExpanded"
      @touchend="handleCompassTouch"
      aria-label="Toggle navigation"
    >
      <i class="fa-solid fa-compass fa-2x nav-icon"></i>
    </button>

    <!-- Chevrons directionnels -->
    <transition name="fade">
      <div v-if="expanded" class="directional-controls">
        <!-- Nord -->
        <button
          class="nav-button direction-button north"
          @touchstart="handleTouchStart($event, () => startMoving('north'))"
          @touchend="handleTouchEnd"
          @mousedown="startMoving('north')"
          @mouseup="stopAllActions"
          @mouseleave="stopAllActions"
          aria-label="Move North"
        >
          <i class="fa-solid fa-arrow-up fa-3x nav-icon"></i>
        </button>

        <!-- Sud -->
        <button
          class="nav-button direction-button south"
          @touchstart="handleTouchStart($event, () => startMoving('south'))"
          @touchend="handleTouchEnd"
          @mousedown="startMoving('south')"
          @mouseup="stopAllActions"
          @mouseleave="stopAllActions"
          aria-label="Move South"
        >
          <i class="fa-solid fa-arrow-down fa-3x nav-icon"></i>
        </button>

        <!-- Ouest -->
        <button
          class="nav-button direction-button west"
          @touchstart="handleTouchStart($event, () => startMoving('west'))"
          @touchend="handleTouchEnd"
          @mousedown="startMoving('west')"
          @mouseup="stopAllActions"
          @mouseleave="stopAllActions"
          aria-label="Move West"
        >
          <i class="fa-solid fa-arrow-left fa-3x nav-icon"></i>
        </button>

        <!-- Est -->
        <button
          class="nav-button direction-button east"
          @touchstart="handleTouchStart($event, () => startMoving('east'))"
          @touchend="handleTouchEnd"
          @mousedown="startMoving('east')"
          @mouseup="stopAllActions"
          @mouseleave="stopAllActions"
          aria-label="Move East"
        >
          <i class="fa-solid fa-arrow-right fa-3x nav-icon"></i>
        </button>

        <!-- Rotation gauche (coin supérieur gauche) -->
        <button
          class="nav-button corner-button rotate-left"
          @touchstart="handleTouchStart($event, () => startRotating('left'))"
          @touchend="handleTouchEnd"
          @mousedown="startRotating('left')"
          @mouseup="stopAllActions"
          @mouseleave="stopAllActions"
          aria-label="Rotate Left"
        >
          <i class="fa-solid fa-rotate-left fa-2x nav-icon"></i>
        </button>

        <!-- Rotation droite (coin supérieur droit) -->
        <button
          class="nav-button corner-button rotate-right"
          @touchstart="handleTouchStart($event, () => startRotating('right'))"
          @touchend="handleTouchEnd"
          @mousedown="startRotating('right')"
          @mouseup="stopAllActions"
          @mouseleave="stopAllActions"
          aria-label="Rotate Right"
        >
          <i class="fa-solid fa-rotate-right fa-2x nav-icon"></i>
        </button>

        <!-- Zoom out (coin inférieur gauche) -->
        <button
          class="nav-button corner-button zoom-out"
          @touchstart="handleTouchStart($event, () => startZooming('out'))"
          @touchend="handleTouchEnd"
          @mousedown="startZooming('out')"
          @mouseup="stopAllActions"
          @mouseleave="stopAllActions"
          aria-label="Zoom Out"
        >
          <svg class="nav-icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7"/>
            <path d="M21 21l-5-5M8 11h6"/>
          </svg>
        </button>

        <!-- Zoom in (coin inférieur droit) -->
        <button
          class="nav-button corner-button zoom-in"
          @touchstart="handleTouchStart($event, () => startZooming('in'))"
          @touchend="handleTouchEnd"
          @mousedown="startZooming('in')"
          @mouseup="stopAllActions"
          @mouseleave="stopAllActions"
          aria-label="Zoom In"
        >
          <svg class="nav-icon" viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7"/>
            <path d="M21 21l-5-5M8 11h6M11 8v6"/>
          </svg>
        </button>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.mobile-nav-controls {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 100;
}

/* ---------- shared glass button ---------- */
.nav-button {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--glass);
  backdrop-filter: blur(16px) saturate(1.15);
  -webkit-backdrop-filter: blur(16px) saturate(1.15);
  border: 1px solid var(--glass-line);
  border-radius: 50%;
  cursor: pointer;
  pointer-events: auto;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  box-shadow: 0 10px 28px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(0, 0, 0, 0.25);
  transition: transform 0.14s, background 0.14s, border-color 0.14s;
}

.nav-button:active {
  transform: scale(0.9);
}

.nav-icon {
  color: #fff;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}

/* Bouton central boussole — anneau dégradé animé (AI ring) */
.compass-button {
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  width: 64px;
  height: 64px;
  background: transparent;
  border: none;
  box-shadow: none;
  isolation: isolate;
}

.compass-button:active {
  transform: translateX(-50%) scale(0.92);
}

.compass-button::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  z-index: -2;
  background: conic-gradient(from var(--ai-angle, 0deg),
    var(--accent-bright), var(--mauve-bright), var(--magenta), var(--accent), var(--accent-bright));
  animation: ai-spin 5s linear infinite;
  filter: drop-shadow(0 0 14px oklch(0.7 0.17 280 / 0.55));
}

.compass-button::after {
  content: "";
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  z-index: -1;
  background: rgba(10, 12, 18, 0.78);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: background 0.14s;
}

/* Conteneur des contrôles directionnels */
.directional-controls {
  position: absolute;
  inset: 0;
}

/* Chevrons directionnels */
.direction-button {
  width: 72px;
  height: 72px;
}

.direction-button.north {
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
}

.direction-button.north:active {
  transform: translateX(-50%) scale(0.9);
}

.direction-button.south {
  bottom: 120px;
  left: 50%;
  transform: translateX(-50%);
}

.direction-button.south:active {
  transform: translateX(-50%) scale(0.9);
}

.direction-button.west {
  top: 50%;
  left: 24px;
  transform: translateY(-50%);
}

.direction-button.west:active {
  transform: translateY(-50%) scale(0.9);
}

.direction-button.east {
  top: 50%;
  right: 24px;
  transform: translateY(-50%);
}

.direction-button.east:active {
  transform: translateY(-50%) scale(0.9);
}

/* Boutons de coin */
.corner-button {
  width: 56px;
  height: 56px;
}

.rotate-left {
  top: 24px;
  left: 24px;
}

.rotate-right {
  top: 24px;
  right: 24px;
}

.zoom-out {
  bottom: 24px;
  left: 24px;
}

.zoom-in {
  bottom: 24px;
  right: 24px;
}

/* Animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Adaptation mobile */
@media (max-width: 768px) {
  .direction-button {
    width: 64px;
    height: 64px;
  }
  
  .corner-button {
    width: 48px;
    height: 48px;
  }
  
  .compass-button {
    width: 56px;
    height: 56px;
    bottom: 24px;
  }
  
  .direction-button.south {
    bottom: 96px;
  }
}

/* Cacher sur desktop */
@media (min-width: 1024px) {
  .mobile-nav-controls {
    display: none;
  }
}

</style>
