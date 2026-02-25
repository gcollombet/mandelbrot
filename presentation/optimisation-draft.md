# Document de travail : Optimisations de rendu et rendu progressif

## Architecture du pipeline de rendu

Le pipeline GPU comporte **4 passes de rendu** par frame, utilisant un schéma de ping-pong entre deux textures (A et B), plus une texture résolue :

1. **Brush pass** (`reproject.wgsl`) : A → B — reprojection (translation) + gestion des sentinelles
2. **Mandelbrot pass** (`mandelbrot.wgsl`) : B → A — calcul uniquement des pixels marqués `-1` ou en continuation
3. **Resolve pass** (`resolve.wgsl`) : A → resolved — remplissage des sentinelles par snapping vers le parent le plus proche
4. **Color pass** (`color.wgsl`) : resolved → swapchain — coloration, rotation, effets visuels

Chaque texture est un **tableau de 7 couches `r32float`** (`Engine.LAYER_COUNT = 7`) :

| Couche | Contenu |
|--------|---------|
| 0 | Nombre d'itérations / marqueur sentinelle |
| 1 | mu (partie fractionnaire lisse pour la coloration) |
| 2 | z.x (pour reprise du calcul) |
| 3 | z.y (pour reprise du calcul) |
| 4 | dz.x (dérivée, pour reprise) |
| 5 | dz.y (dérivée, pour reprise) |
| 6 | angle_der (angle de la dérivée, pour le shading) |

Taille de la texture : carré de côté = diagonale de l'écran :
```typescript
// Engine.ts:357
this.neutralSize = Math.ceil(Math.sqrt(this.width * this.width + this.height * this.height))
```

---

## 1. Gestion de la translation (pan)

### Principe
Lors d'un pan, l'image précédente est décalée dans la texture et seuls les pixels nouvellement exposés sont recalculés.

### Côté CPU — calcul du décalage texel

`Engine.ts:670-683` : Le delta de translation dans le plan complexe est converti en décalage en pixels dans la texture neutre.

```typescript
const deltaDx = this.previousMandelbrot.dx - this.prevFrameMandelbrot.dx
const deltaDy = this.previousMandelbrot.dy - this.prevFrameMandelbrot.dy
const texSize = this.neutralSize
const neutralExtent = Math.sqrt(aspect * aspect + 1.0)
shiftTexX = -(deltaDx * texSize) / (2 * this.previousMandelbrot.scale * neutralExtent)
shiftTexY = (deltaDy * texSize) / (2 * this.previousMandelbrot.scale * neutralExtent)
```

### Côté GPU — reprojection dans le brush pass

`reproject.wgsl:156-165` : Chaque pixel de la texture de sortie (B) est rempli en lisant la texture précédente (A) à la position décalée.

```wgsl
let shift = vec2<i32>(i32(round(uni.shiftTexX)), i32(round(uni.shiftTexY)));
let coord_in = coord_out - shift;

if (coord_in.x < 0 || coord_in.y < 0 || coord_in.x >= dims.x || coord_in.y >= dims.y) {
    prev = makeCleared(-uni.baseSentinel);  // Hors limites → sentinelle
} else {
    prev = loadAllLayers(coord_in);         // Dans les limites → copie décalée
}
```

**Résultat** : Seuls les pixels hors limites après le décalage sont marqués comme sentinelles. Le coût de calcul est proportionnel au périmètre de la zone exposée, pas à la surface totale.

---

## 2. Gestion de la rotation

### Problème
Faire tourner l'image pixel par pixel accumule des erreurs d'interpolation après quelques frames.

### Solution : texture neutre surdimensionnée

La texture de calcul est un **carré** dont le côté est la diagonale de l'écran (`Engine.ts:357`). Elle est suffisamment grande pour que, quelle que soit la rotation, le rectangle de l'écran tienne entièrement dedans.

### Fonctionnement
- Le calcul Mandelbrot se fait **toujours dans le repère non-roté** (la texture neutre). Les coordonnées complexes sont calculées directement depuis les UV de la texture neutre.
- La rotation est appliquée **uniquement lors de l'affichage** (color pass), par une transformation UV :

`color.wgsl:164-169` :
```wgsl
let xy_screen = vec2<f32>(uv_screen.x * 2.0 - 1.0, uv_screen.y * 2.0 - 1.0);
let local = vec2<f32>(xy_screen.x * parameters.aspect, xy_screen.y);
let neutralExtent = sqrt(parameters.aspect * parameters.aspect + 1.0);
let local_rot = rotate(local, parameters.angle);
let xy_neutral = local_rot / neutralExtent;
let uv_neutral = xy_neutral * 0.5 + vec2<f32>(0.5, 0.5);
```

### Optimisation : éviter le calcul hors écran

`reproject.wgsl:71-78` : Le brush pass teste si un pixel de la texture neutre est visible dans l'écran roté. Les pixels hors de la zone visible ne sont pas raffinés, ce qui économise du calcul :

```wgsl
fn is_inside_rotated_screen(xy_neutral: vec2<f32>) -> bool {
    let neutralExtent = sqrt(uni.aspect * uni.aspect + 1.0);
    let local_rot = xy_neutral * neutralExtent;
    let local = rotate(local_rot, -uni.angle);
    return abs(local.x) <= uni.aspect && abs(local.y) <= 1.0;
}
```

**Conséquence** : La rotation ne coûte aucun recalcul. Les pixels qui étaient hors écran mais dans la texture neutre deviennent immédiatement visibles lors d'une rotation.

---

## 3. Rendu progressif avec sentinelles

### Qu'est-ce qu'une sentinelle ?

Une sentinelle est une **valeur négative entière** stockée dans la couche 0 de la texture. Elle encode le niveau de résolution dans une grille hiérarchique en puissances de 2.

| Valeur | Signification |
|--------|---------------|
| `-1` | Demande de calcul Mandelbrot |
| `-2, -4, -8, ..., -64` | Sentinelle de résolution : sera résolue par snapping vers le parent calculé le plus proche |
| `0` | Dans l'ensemble (confirmé) ou budget global atteint |
| `> 0`, `|z|² >= mu` | Échappé (calcul terminé) |
| `> 0`, `|z|² < mu` | Budget de la passe épuisé (reprise nécessaire) |

### Ensemencement initial

Constante : `SENTINEL_SEED_STEP_POW2 = 64` (`Engine.ts:16`)

Lors d'un reset complet, le brush pass ensemence la texture :
- Les pixels aux positions `(x % 64 == 0, y % 64 == 0)` reçoivent `-1` → seront calculés
- Tous les autres pixels reçoivent `-64` → seront résolus par snapping

`reproject.wgsl:148-154` :
```wgsl
if (uni.clearHistory >= 0.5) {
    let step = i32(max(1.0, uni.seedStep));
    let is_anchor = (coord_out.x % step == 0) && (coord_out.y % step == 0);
    let sentinel = select(-uni.baseSentinel, -1.0, is_anchor);
    return makeCleared(sentinel);
}
```

### Raffinement progressif des sentinelles

Chaque frame, le brush pass divise par 2 le pas des sentinelles, doublant progressivement la résolution :

`reproject.wgsl:121-138` :
```wgsl
fn refine_sentinel(s: f32, coord_out: vec2<i32>) -> f32 {
    let si = i32(round(s));
    if (si >= 0) { return s; }       // Déjà calculé
    if (si == -1) { return -1.0; }   // Déjà prêt pour le calcul

    let step = -si;
    if (step <= 1) { return -1.0; }

    let next_step = max(1, step / 2);
    let is_anchor = (coord_out.x % next_step == 0) && (coord_out.y % next_step == 0);
    return select(-f32(next_step), -1.0, is_anchor);
}
```

**Progression** (pour `SENTINEL_SEED_STEP = 64`) :
- Frame 1 : Grille 64×64 calculée, les autres à `-64`
- Frame 2 : `-64` → `-32`, les points de la grille 32×32 deviennent `-1`
- Frame 3 : `-32` → `-16`, la grille 16×16 calculée
- ...
- Frame 7 : Tous les pixels sont calculés

### Résolution des sentinelles (resolve pass)

La resolve pass (`resolve.wgsl:85-196`) remplit les pixels non calculés en cherchant le pixel ancre terminé le plus proche.

**Algorithme** :
1. Lire la sentinelle `step` du pixel
2. Calculer la cellule de la grille via masque binaire : `base_x = x & ~(step - 1)`
3. Tester les 4 coins de la cellule (pour fonctionner quelle que soit la direction du pan)
4. Si un coin a un calcul terminé (échappé ou dans l'ensemble) → utiliser ses valeurs
5. Si aucun coin terminé → monter d'un cran (`step *= 2`) et recommencer

```wgsl
let mask = ~(step_u - 1u);
let base_x = x & mask;
let base_y = y & mask;

var candidates = array<vec2<u32>, 4>(
    vec2<u32>(base_x,          base_y),
    vec2<u32>(base_x + step_u, base_y),
    vec2<u32>(base_x,          base_y + step_u),
    vec2<u32>(base_x + step_u, base_y + step_u)
);
```

**Gestion des pixels en cours de calcul** : Les pixels avec `iter > 0` mais `|z|² < mu` (budget épuisé) ne sont pas considérés comme terminés. La resolve pass monte dans la grille pour trouver un ancêtre terminé. Cela évite l'artefact de "triangle de Sierpinski".

### Le Mandelbrot pass ne calcule que les pixels `-1`

`mandelbrot.wgsl:239-253` : Seuls les pixels sentinelle `-1` et les pixels en continuation sont traités. Tous les autres sont passés tels quels.

---

## 4. Calcul progressif d'itérations avec ajustement automatique

### Budget d'itérations par passe

Chaque passe de rendu ne calcule qu'un **nombre limité d'itérations** par pixel (le "batch").

```typescript
// Engine.ts:119-124
static readonly MIN_BATCH_SIZE = 10
static readonly MAX_BATCH_SIZE = 10000
static readonly TARGET_FRAME_MS = 16
private iterationBatchSize = 10000
```

### Ajustement adaptatif basé sur le temps GPU

Après chaque soumission, le temps GPU réel est mesuré et le batch est ajusté avec un lissage exponentiel (alpha = 0.3) pour viser 16ms :

`Engine.ts:758-775` :
```typescript
this.device.queue.onSubmittedWorkDone().then(() => {
    const elapsed = performance.now() - submitStartMs
    if (elapsed > 0) {
        const ratio = Engine.TARGET_FRAME_MS / elapsed
        const ideal = this.iterationBatchSize * ratio
        this.iterationBatchSize = Math.round(
            Math.min(Engine.MAX_BATCH_SIZE,
                Math.max(Engine.MIN_BATCH_SIZE,
                    this.iterationBatchSize * 0.7 + ideal * 0.3
                )
            )
        )
    }
})
```

**Exemple** : Si une frame prend 32ms avec batch=100, ratio = 16/32 = 0.5, ideal = 50, nouveau batch ≈ 100×0.7 + 50×0.3 = 85.

### Continuation multi-frame

Les pixels qui épuisent leur budget sans s'échapper **sauvegardent leur état** dans les 7 couches de la texture (`z`, `dz`, `iter`, `ref_iter`). Au prochain frame, le Mandelbrot pass reprend le calcul là où il s'est arrêté :

```wgsl
// mandelbrot.wgsl
if (needs_continuation) {
    // Reprendre z, dz depuis la texture
    let stored_dzx = loadLayer(coord, 4);
    let stored_dzy = loadLayer(coord, 5);
    return mandelbrot_compute(x0, y0, prev_iter, prev_mu, prev_zx, prev_zy, stored_dzx, stored_dzy, prev_ref_iter);
}
```

L'itération totale est cumulée : `total_iter = prev_iter + i`.

### Maximum d'itérations auto-adaptatif au zoom

`Mandelbrot.vue:116` :
```typescript
const maxIterations = Math.min(
    Math.max(100, 1000 * props.maxIterationMultiplier * Math.log2(1.0 / parseFloat(scale_string))),
    100_000
)
```

Plus le zoom est profond, plus d'itérations sont nécessaires. La formule croît logarithmiquement avec la profondeur de zoom, bornée entre 100 et 100 000.

### Chunking de l'orbite de référence

L'orbite de référence (calcul en précision arbitraire, WASM/Rust) est aussi construite incrémentalement, 500 pas par frame :

```typescript
// Engine.ts:126-129
static readonly ORBIT_CHUNK_SIZE = 500
```

```rust
// reference_calculus/src/lib.rs
pub fn compute_reference_orbit_chunk(&mut self, chunk_size: u32, max_iter: u32) -> OrbitBufferInfo {
    let target = (self.last_iter + chunk_size as usize).min(max_iter as usize);
    self.compute_reference_orbit_inner(target)
}
```

Tant que `availableIter < maxIterations`, l'Engine force des frames supplémentaires (`extraFrames`) pour continuer le calcul (`Engine.ts:617-618`).

---

## 5. Invalidation de l'historique

L'historique (reprojection) est effacé (reset complet) quand :

| Condition | Fichier |
|-----------|---------|
| Pas de frame précédente | `Engine.ts:626` |
| L'orbite de référence a été ré-ancrée | `Engine.ts:623` |
| `mu` a changé | `Engine.ts:629` |
| `scale` a changé (zoom) | `Engine.ts:632` |

Le ré-ancrage se produit quand le centre de vue dérive de plus de 20× l'échelle par rapport au centre de référence (`lib.rs:279-292`).

---

## Résumé des optimisations

| Optimisation | Mécanisme | Bénéfice |
|---|---|---|
| Pan partiel | Décalage texture + sentinelles hors limites | O(périmètre) au lieu de O(surface) |
| Rotation sans recalcul | Texture neutre surdimensionnée (diagonale) ; rotation uniquement à l'affichage | Zéro recalcul lors d'une rotation |
| Sentinelles hiérarchiques | Grille puissance-de-2 subdivisée frame par frame (64 → 32 → ... → 1) | Raffinement progressif grossier → fin |
| Resolve avec escalade | Test des 4 coins + escalade vers parent si budget épuisé | Affichage sans artefact à toute résolution |
| Batch adaptatif | Boucle de feedback temps GPU → batch size (EMA α=0.3, cible 16ms) | Framerate constant quel que soit le matériel |
| Continuation d'itérations | État complet par pixel (z, dz) sauvegardé dans 7 couches | Itérations arbitrairement profondes sans blocage |
| Chunking orbite | WASM calcule 500 pas max par frame | Pas de blocage UI sur zooms profonds |
