export type MandelbrotExposed = {
  getCanvas: () => HTMLCanvasElement | null,
  getEngine: () => any,
  getNavigator: () => any,
  translate: (dx: number, dy: number) => void,
  translateDirect: (dx: number, dy: number) => void,
  rotate: (da: number) => void,
  angle: (a: number) => void,
  zoom: (f: number) => void,
  setKeyboardNavigation?: (input: KeyboardNavigationInput) => void,
  step: () => [number, number, number, number] | undefined,
  getParams: () => [string, string, string, string] | undefined,
  drawOnce: () => Promise<void>,
  resize: () => Promise<void>,
  initialize: () => Promise<void>,
  useBla: () => void,
  usePerturbation: () => void,
  setApproximationMode: (mode: 'bla' | 'perturbation' | 'pade' | 'jet' | 'mobius' | 'auto') => void,
  getApproximationMode: () => 'bla' | 'perturbation' | 'pade' | 'jet' | 'mobius' | 'auto' | undefined,
  setBlaEpsilon: (epsilon: number) => void,
  setPrecisionBudget?: (targetScale: string) => void,
  getPrecisionBudget?: () => string | undefined,
  resetReferenceTo?: (cx: string, cy: string, scaleStr: string, angleVal: number) => void,
  /** Drive the camera and every animation track from an absolute parcours time
   *  (seconds) instead of the wall clock. Null hands both back to real time. */
  setExportTime?: (elapsedSeconds: number | null) => void,
  isExporting?: () => boolean,
};

export type KeyboardNavigationInput = {
  translateX: number,
  translateY: number,
  rotation: number,
  zoom: number,
};
