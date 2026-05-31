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

/** Navigue vers la page Présentation (relative à l'URL courante). */
function goToPresentation(e: TouchEvent | MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  window.location.href = new URL('./presentation/', window.location.href).href;
}
</script>


<template>
  <div class="mobile-nav-controls">
    <!-- Bouton central boussole -->
    <button
      class="nav-button compass-button"
      :class="{ active: expanded }"
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
          :class="{ active: activeButton === 'north' }"
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
          :class="{ active: activeButton === 'south' }"
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
          :class="{ active: activeButton === 'west' }"
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
          :class="{ active: activeButton === 'east' }"
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
          :class="{ active: activeButton === 'rotate-left' }"
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
          :class="{ active: activeButton === 'rotate-right' }"
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
          :class="{ active: activeButton === 'zoom-out' }"
          @touchstart="handleTouchStart($event, () => startZooming('out'))"
          @touchend="handleTouchEnd"
          @mousedown="startZooming('out')"
          @mouseup="stopAllActions"
          @mouseleave="stopAllActions"
          aria-label="Zoom Out"
        >
          <i class="fa-solid fa-magnifying-glass-minus fa-2x nav-icon"></i>
        </button>

        <!-- Zoom in (coin inférieur droit) -->
        <button
          class="nav-button corner-button zoom-in"
          :class="{ active: activeButton === 'zoom-in' }"
          @touchstart="handleTouchStart($event, () => startZooming('in'))"
          @touchend="handleTouchEnd"
          @mousedown="startZooming('in')"
          @mouseup="stopAllActions"
          @mouseleave="stopAllActions"
          aria-label="Zoom In"
        >
          <i class="fa-solid fa-magnifying-glass-plus fa-2x nav-icon"></i>
        </button>

        <!-- Bouton Présentation (lien vers la doc VitePress) -->
        <button
          class="presentation-button"
          @touchend.prevent.stop="goToPresentation"
          @click="goToPresentation"
          aria-label="Présentation"
        >
          <i class="fa-solid fa-display fa-fw" style="vertical-align:middle; margin-right:4px;"></i>
          Présentation
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

.nav-button {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(8px);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  pointer-events: auto;
  touch-action: none;
  user-select: none;
  transition: all 0.2s ease;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
}

.nav-button:active {
  transform: scale(0.95);
}

.nav-icon {
  color: white;
  filter: drop-shadow(0 1px 2px black);
}

.nav-button.active .nav-icon {
  color: black;
  filter: drop-shadow(0 1px 2px white);
}

/* Bouton central boussole */
.compass-button {
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%);
  width: 64px;
  height: 64px;
}

.compass-button.active {
  background: rgba(255, 255, 255, 0.3);
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

.direction-button.south {
  bottom: 120px;
  left: 50%;
  transform: translateX(-50%);
}

.direction-button.west {
  top: 50%;
  left: 24px;
  transform: translateY(-50%);
}

.direction-button.east {
  top: 50%;
  right: 24px;
  transform: translateY(-50%);
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

/* Bouton Présentation — pilule en bas à droite, au-dessus du zoom-in */
.presentation-button {
  position: absolute;
  bottom: 96px;
  right: 24px;
  display: inline-flex;
  align-items: center;
  padding: 6px 14px;
  border: none;
  border-radius: 20px;
  background: rgba(226, 85, 85, 0.85);
  backdrop-filter: blur(8px);
  color: #fff;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  cursor: pointer;
  pointer-events: auto;
  touch-action: manipulation;
  user-select: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  transition: background 0.2s, transform 0.15s;
}

.presentation-button:active {
  background: rgba(226, 85, 85, 1);
  transform: scale(0.95);
}

.presentation-button svg {
  color: #fff;
  flex-shrink: 0;
}
</style>
