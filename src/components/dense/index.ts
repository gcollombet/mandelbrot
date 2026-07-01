// Dense field/shell kit — shared building blocks for the dense panel language.
export { default as DenseField } from './DenseField.vue';
export { default as DenseToggle } from './DenseToggle.vue';
export { default as DenseSeg } from './DenseSeg.vue';
export { default as DenseSelect } from './DenseSelect.vue';
export { default as DenseColor } from './DenseColor.vue';
export { default as DenseCurve } from './DenseCurve.vue';
export { default as DenseSection } from './DenseSection.vue';
export { default as DenseGrid } from './DenseGrid.vue';
export { default as DenseCard } from './DenseCard.vue';
export { default as DenseTopbar } from './DenseTopbar.vue';
export { default as DenseViewMenu } from './DenseViewMenu.vue';
export { default as DenseMobileNav } from './DenseMobileNav.vue';
export { default as DenseTip } from './DenseTip.vue';
export { showTip, hideTip } from './denseTip';

export { useDenseScrub } from './useDenseScrub';
export { useDenseView, denseAttrs } from './useDenseView';
export { formatValue } from './denseFormat';
export type { DenseFormatter } from './denseFormat';
export type {
  DenseViewState, DenseLayout, DenseStyle, DenseShape, DenseFieldChar, DenseChroma,
} from './useDenseView';
