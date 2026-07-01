import { reactive, watch } from 'vue';

// GLOBAL dense view state — shared across every panel (per the change decision:
// switching layout / theme / shape affects all panels at once). Persisted to
// localStorage so it is restored on reload.

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
  layout: 'columns',
  style: 'clair',
  shape: 'rond',
  field: 'gauge',
  chroma: 'vif',
};

function load(): DenseViewState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore malformed/unavailable storage */ }
  return { ...DEFAULTS };
}

// Single shared reactive instance.
const state = reactive<DenseViewState>(load());

watch(state, (s) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* ignore */ }
}, { deep: true });

/**
 * Access the global dense view state.
 * `defaultLayout` lets a panel request its preferred layout the first time the
 * app runs (e.g. Animation → 'inspector'); it only applies when nothing has been
 * persisted yet, so it never overrides a user's explicit choice.
 */
export function useDenseView(defaultLayout?: DenseLayout) {
  if (defaultLayout && !localStorage.getItem(STORAGE_KEY)) {
    state.layout = defaultLayout;
  }
  return state;
}

/** Map view state to the data-* attributes the stylesheet keys off. */
export function denseAttrs(s: DenseViewState = state) {
  return {
    'data-style': s.style,
    'data-layout': s.layout,
    'data-shape': s.shape,
    'data-field': s.field,
    'data-chroma': s.chroma,
  };
}
