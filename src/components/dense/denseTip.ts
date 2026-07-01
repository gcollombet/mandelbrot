import { reactive } from 'vue';

// Shared tooltip singleton for dense fields. One DenseTip instance (teleported to
// body) renders this state; fields call showTip/hideTip on hover.
export const tipState = reactive({ text: '', x: 0, y: 0, visible: false });

export function showTip(text: string | undefined, x: number, y: number): void {
  if (!text) return;
  tipState.text = text;
  tipState.x = x;
  tipState.y = y;
  tipState.visible = true;
}

export function hideTip(): void {
  tipState.visible = false;
}
