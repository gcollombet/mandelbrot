<script setup lang="ts">
import {ref} from 'vue';
import type {MandelbrotExposed} from '../types/MandelbrotExposed.ts';

const props = defineProps<{
  mandelbrotRef: MandelbrotExposed | null;
}>();

const isExpanded = ref(false);
const activeButton = ref<string | null>(null);

// Intervalles pour les actions répétées
let intervalId: number | null = null;

const toggleExpanded = () => {
  isExpanded.value = !isExpanded.value;
  if (!isExpanded.value) {
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
  const moveStep = 0.1;
  
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
  const zoomFactor = 0.6;
  
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
      :class="{ active: isExpanded }"
      @click="toggleExpanded"
      @touchend="handleCompassTouch"
      aria-label="Toggle navigation"
    >
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" class="nav-icon">
        <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
        <path d="M12 2 L12 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 18 L12 22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M2 12 L6 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M18 12 L22 12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        <path d="M12 7 L10 12 L12 14 L14 12 Z" fill="currentColor"/>
        <text x="12" y="6" text-anchor="middle" font-size="6" fill="currentColor" font-weight="bold">N</text>
      </svg>
    </button>

    <!-- Chevrons directionnels -->
    <transition name="fade">
      <div v-if="isExpanded" class="directional-controls">
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
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" class="nav-icon">
            <path d="M12 5 L18 11 L15 11 L15 19 L9 19 L9 11 L6 11 Z" fill="currentColor" stroke="black" stroke-width="1"/>
          </svg>
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
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" class="nav-icon">
            <path d="M12 19 L6 13 L9 13 L9 5 L15 5 L15 13 L18 13 Z" fill="currentColor" stroke="black" stroke-width="1"/>
          </svg>
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
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" class="nav-icon">
            <path d="M5 12 L11 18 L11 15 L19 15 L19 9 L11 9 L11 6 Z" fill="currentColor" stroke="black" stroke-width="1"/>
          </svg>
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
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" class="nav-icon">
            <path d="M19 12 L13 6 L13 9 L5 9 L5 15 L13 15 L13 18 Z" fill="currentColor" stroke="black" stroke-width="1"/>
          </svg>
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
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" class="nav-icon">
            <path d="M16 8 A6 6 0 1 0 8 16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M5 16 L8 16 L8 13" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
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
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" class="nav-icon">
            <path d="M8 8 A6 6 0 1 1 16 16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M19 16 L16 16 L16 13" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
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
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" class="nav-icon">
            <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
            <path d="M18 18 L22 22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M8 11 L14 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
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
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" class="nav-icon">
            <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
            <path d="M18 18 L22 22" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M11 8 L11 14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <path d="M8 11 L14 11" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
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
</style>
