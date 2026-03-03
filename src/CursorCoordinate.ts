/**
 * CursorCoordinate — reusable helper that converts canvas pixel positions
 * to Mandelbrot complex-plane coordinates.
 *
 * Designed to be shared across features: tooltip, palette picking, orbit display, etc.
 */

/** Complex coordinate as arbitrary-precision strings. */
export interface ComplexCoordStr {
  re: string;
  im: string;
}

/** Complex coordinate as f64 numbers (limited to ~15 significant digits). */
export interface ComplexCoord {
  re: number;
  im: number;
}

export interface ViewParams {
  cx: string;
  cy: string;
  scale: string;
  angle: number;
}

/**
 * Convert a canvas-local pixel position to a complex-plane coordinate (f64 precision).
 *
 * This is a pure-JS fallback — sufficient for display at shallow zooms,
 * but loses precision beyond ~15 significant digits.
 * Prefer the WASM version (`navigator.pixel_to_complex`) for deep zooms.
 */
export function pixelToComplex(
  x: number,
  y: number,
  canvasWidth: number,
  canvasHeight: number,
  params: ViewParams,
): ComplexCoord {
  const s = parseFloat(params.scale);
  const a = params.angle;
  const centerRe = parseFloat(params.cx);
  const centerIm = parseFloat(params.cy);
  const aspect = canvasWidth / Math.max(1, canvasHeight);

  // Normalisation pixel -> [-1, 1]
  const nx = (x / Math.max(1, canvasWidth)) * 2 - 1;
  const ny = (1 - y / Math.max(1, canvasHeight)) * 2 - 1; // inversion verticale (y↑ = im↑)

  // Mise à l'échelle (x avec aspect, y sans), puis rotation par +angle
  const xr = nx * aspect * s;
  const yr = ny * s;
  const sinA = Math.sin(a);
  const cosA = Math.cos(a);
  const rx = cosA * xr - sinA * yr;
  const ry = sinA * xr + cosA * yr;

  return {
    re: centerRe + rx,
    im: centerIm + ry,
  };
}

/**
 * Convert a complex-plane coordinate back to a canvas-local pixel position.
 */
export function complexToPixel(
  re: number,
  im: number,
  canvasWidth: number,
  canvasHeight: number,
  params: ViewParams,
): { x: number; y: number } {
  const s = parseFloat(params.scale);
  const a = params.angle;
  const centerRe = parseFloat(params.cx);
  const centerIm = parseFloat(params.cy);
  const aspect = canvasWidth / Math.max(1, canvasHeight);

  // Décalage par le centre
  const vx = re - centerRe;
  const vy = im - centerIm;

  // Rotation inverse (-a)
  const sinA = Math.sin(a);
  const cosA = Math.cos(a);
  const ux = cosA * vx + sinA * vy;
  const uy = -sinA * vx + cosA * vy;

  // Mise à l'échelle inverse -> coordonnées normalisées [-1,1]
  const nx = ux / (aspect * s);
  const ny = uy / s;

  // Conversion en pixels (y top=0, bottom=H)
  const px = ((nx + 1) * 0.5) * canvasWidth;
  const py = ((1 - (ny + 1) * 0.5)) * canvasHeight;
  return { x: px, y: py };
}

/**
 * Smart truncation of a numeric string for display.
 *
 * Shows the first `headDigits` significant characters and the last `tailDigits`
 * digits, joined by "..." if the number is long enough.
 *
 * Examples (with defaults head=3, tail=3):
 *   "0.4356789154"  → "0.4...154"
 *   "-1.7432"       → "-1.7...432"
 *   "0.5"           → "0.5"           (short enough — no truncation)
 *   "2.5"           → "2.5"
 *
 * The function preserves the sign and leading "0." or "-0." prefix.
 */
export function truncateCoord(value: number | string, headDigits = 3, tailDigits = 3): string {
  const s = typeof value === 'number' ? value.toString() : value;

  // Separate sign
  const negative = s.startsWith('-');
  const abs = negative ? s.slice(1) : s;

  // Find the decimal point
  const dotIdx = abs.indexOf('.');
  if (dotIdx < 0) {
    // Integer — unlikely for Mandelbrot coords but handle gracefully
    const sign = negative ? '-' : '';
    if (abs.length <= headDigits + tailDigits) return s;
    return sign + abs.slice(0, headDigits) + '...' + abs.slice(-tailDigits);
  }

  // digits after the dot
  const intPart = abs.slice(0, dotIdx); // e.g. "0" or "1"
  const fracPart = abs.slice(dotIdx + 1); // e.g. "743643887037..."

  // Prefix is always shown in full (e.g. "0." or "-1.")
  const prefix = (negative ? '-' : '') + intPart + '.';

  if (fracPart.length <= headDigits + tailDigits) {
    // Short enough — no truncation needed
    return s;
  }

  const head = fracPart.slice(0, headDigits);
  const tail = fracPart.slice(-tailDigits);
  return prefix + head + '...' + tail;
}

// ── Palette picking helpers ─────────────────────────────────────────

/** Données d'itération brutes lues depuis le GPU. */
export interface IterationData {
  iter: number;
  zx: number;
  zy: number;
  derX: number;
  derY: number;
}

/** Résultat du calcul de phase palette. */
export interface PalettePhaseResult {
  /** Phase palette [0, 1) */
  phase: number;
  /** Itération lissée (smooth iteration) */
  nu: number;
  /** Itération brute (entière) */
  iter: number;
  /** Pixel dans l'ensemble (iter == 0) */
  isInSet: boolean;
}

/**
 * Calcule la phase palette à partir des données d'itération GPU.
 *
 * Réplique exactement la formule du shader color.wgsl :
 *   mu_val = clamp(1 - log(log(|z|²) / log(mu)) / log(2), 0, 1)
 *   nu = iter + mu_val
 *   v = nu (smoothness activé) ou iter (désactivé)
 *   deep = v * 2
 *   palettePhase = fract(deep / palettePeriod + paletteOffset)
 *
 * @param data       – données d'itération lues depuis le GPU
 * @param mu         – rayon d'échappement (paramètre Mandelbrot)
 * @param palettePeriod  – période de la palette
 * @param paletteOffset  – décalage de la palette
 * @param smooth     – utiliser le lissage (activateSmoothness)
 */
export function computePalettePhase(
  data: IterationData,
  mu: number,
  palettePeriod: number,
  paletteOffset: number,
  smooth = true,
): PalettePhaseResult {
  // Pixel dans l'ensemble : iter == 0
  if (data.iter === 0) {
    return { phase: 0, nu: 0, iter: 0, isInSet: true };
  }

  const zSq = data.zx * data.zx + data.zy * data.zy;

  // Pixel non échappé (budget épuisé) : |z|² < mu
  // On utilise la même approximation que le shader
  let muVal: number;
  if (zSq < mu) {
    const fakeLog = Math.max(Math.log(zSq + 1), 0.001);
    muVal = Math.max(0, Math.min(1, 1 - Math.log(fakeLog / Math.log(mu)) / Math.log(2)));
  } else {
    // Pixel échappé : formule standard
    const logZ2 = Math.log(zSq);
    muVal = Math.max(0, Math.min(1, 1 - Math.log(logZ2 / Math.log(mu)) / Math.log(2)));
  }

  const nu = data.iter + muVal;
  const v = smooth ? nu : data.iter;
  const deep = v * 2;
  const paletteRepeat = Math.max(palettePeriod, 0.0001);
  const phase = ((deep / paletteRepeat + paletteOffset) % 1 + 1) % 1; // fract() positif

  return { phase, nu, iter: data.iter, isInSet: false };
}

/**
 * Calcule le paletteOffset nécessaire pour qu'une phase cible (ex: 0.0) tombe
 * sur le pixel ayant la valeur nu donnée.
 *
 * Formule inverse :
 *   palettePhase = fract(nu * 2 / palettePeriod + paletteOffset)
 *   => paletteOffset = targetPhase - nu * 2 / palettePeriod   (mod 1)
 */
export function computeOffsetForPhase(
  nu: number,
  palettePeriod: number,
  targetPhase = 0,
): number {
  const paletteRepeat = Math.max(palettePeriod, 0.0001);
  const raw = targetPhase - (nu * 2) / paletteRepeat;
  return ((raw % 1) + 1) % 1; // fract() positif
}
