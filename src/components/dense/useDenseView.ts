import { reactive, watch } from 'vue';

// Shared appearance preferences. Layout is selected by panel content and CSS;
// the legacy layout property remains readable for compatibility only.

export type DenseLayout = 'columns' | 'inspector' | 'tabs';
export type DenseStyle = 'glow' | 'sober' | 'clair';
export type DenseShape = 'net' | 'doux' | 'rond';
export type DenseFieldChar = 'gauge' | 'sober' | 'minimal';
export type DenseChroma = 'mono' | 'code' | 'vif';

export interface DenseViewState {
  layout: DenseLayout;
  style: DenseStyle;
  shape: DenseShape;
  field: DenseFieldChar;
  chroma: DenseChroma;
}

const STORAGE_KEY = 'dense_view';

const DEFAULTS: DenseViewState = {
  layout: 'inspector',
  style: 'clair',
  shape: 'rond',
  field: 'gauge',
  chroma: 'vif',
};

function load(): DenseViewState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw), layout: 'inspector' };
  } catch { /* ignore malformed/unavailable storage */ }
  return { ...DEFAULTS };
}

// Single shared reactive instance.
const state = reactive<DenseViewState>(load());

watch(state, (s) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}, { deep: true });

/** Access shared appearance; the optional argument is retained for old callers. */
export function useDenseView(defaultLayout?: DenseLayout) {
  // Ignore legacy per-panel preferences: container layouts are automatic.
  void defaultLayout;
  return state;
}

/** Map view state to the data-* attributes the stylesheet keys off. */
export function denseAttrs(s: DenseViewState = state) {
  return {
    'data-style': s.style,
    'data-layout': 'inspector',
    'data-shape': s.shape,
    'data-field': s.field,
    'data-chroma': s.chroma,
  };
}
