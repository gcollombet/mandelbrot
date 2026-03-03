<script setup>
import Mandelbrot from '../src/components/Mandelbrot.vue'
import MandelbrotController from '../src/components/MandelbrotController.vue'
import DiagonalTextureDemo from '../src/components/DiagonalTextureDemo.vue'
import TranslationReprojectionDemo from '../src/components/TranslationReprojectionDemo.vue'
import RotationDemo from '../src/components/RotationDemo.vue'
import SentinelProgressionDemo from '../src/components/SentinelProgressionDemo.vue'
import AdaptiveBatchDemo from '../src/components/AdaptiveBatchDemo.vue'
import ZoomReprojectionDemo from '../src/components/ZoomReprojectionDemo.vue'
</script>
<link rel="stylesheet" href="https://use.typekit.net/fnz7ojs.css">

# Optimisations de rendu et rendu progressif

Dans la [présentation principale](./index.md), nous avons vu comment calculer l'ensemble de Mandelbrot
et comment les techniques de perturbation et de précision arbitraire permettent d'explorer la fractale à des niveaux de zoom extrêmes.

Cependant, toutes ces techniques ne permettent que de calculer **une image fixe**.
Pour offrir une expérience de navigation fluide en temps réel, il faut maintenir un rendu
à au moins dix images par seconde, idéalement soixante.

C'est un défi considérable : recalculer l'ensemble de Mandelbrot entièrement à chaque frame
est bien trop coûteux, même avec un GPU puissant.

Cette page détaille les techniques d'optimisation mises en oeuvre pour atteindre cet objectif.

## Vue d'ensemble du pipeline

Le moteur de rendu utilise **4 passes GPU** successives par frame, organisées autour de trois textures 
qui forment un système de ping-pong :

| Passe | Nom | Entrée → Sortie | Rôle |
|-------|-----|------------------|------|
| 0 | **Brush** | A → B | Reprojection (translation) et gestion des sentinelles |
| 1 | **Mandelbrot** | B → A | Calcul fractal des seuls pixels qui en ont besoin |
| 2 | **Resolve** | A → Resolved | Remplissage des trous par interpolation hiérarchique |
| 3 | **Color** | Resolved → Ecran | Coloration, rotation, effets visuels |

Chaque texture est un **tableau de 7 couches `r32float`**. Pourquoi 7 couches ?
Parce que chaque pixel doit stocker bien plus que sa couleur :

| Couche | Contenu | Pourquoi ? |
|--------|---------|------------|
| 0 | Nombre d'itérations ou marqueur sentinelle | Savoir si le pixel est calculé, en attente, ou en cours |
| 1 | $\mu$ (partie fractionnaire lisse) | Coloration lisse |
| 2 | $z_x$ (partie réelle de $z$) | Reprendre le calcul là où il s'est arrêté |
| 3 | $z_y$ (partie imaginaire de $z$) | Idem |
| 4 | $dz_x$ (dérivée, partie réelle) | Continuation du calcul de la dérivée |
| 5 | $dz_y$ (dérivée, partie imaginaire) | Idem |
| 6 | Angle de la dérivée | Utilisé pour le shading (éclairage Blinn-Phong) |

Stocker l'état complet de chaque pixel dans la texture permet deux choses fondamentales :
- **ne pas recalculer** les pixels qui n'ont pas changé (translation, rotation),
- **reprendre un calcul** interrompu sur plusieurs frames (rendu progressif).

## La texture neutre surdimensionnée

Avant de parler de translation et de rotation, il faut comprendre la texture de travail.

La texture de calcul n'est pas de la taille de l'écran.
C'est un **carré** dont le côté est égal à la **diagonale** de l'écran :

$$
\text{neutralSize} = \lceil\sqrt{W^2 + H^2}\rceil
$$

```typescript
// Engine.ts:357
this.neutralSize = Math.ceil(
    Math.sqrt(this.width * this.width + this.height * this.height)
)
```

Pourquoi ? Parce que cette texture doit pouvoir contenir l'écran quelle que soit sa rotation.
Un carré de côté égal à la diagonale est le plus petit carré dans lequel un rectangle peut tourner librement.

::: info Illustration

<DiagonalTextureDemo />

:::

## Gestion de la translation

### Le principe

Quand l'utilisateur fait un pan (déplacement), la quasi-totalité de l'image reste valide.
Seule une fine bande de pixels apparaît sur le bord dans la direction du mouvement.

Plutôt que de tout recalculer, on **décale** le contenu de la texture précédente et on ne marque
comme "à calculer" que les pixels nouvellement exposés.

### Comment ça fonctionne

Le décalage est calculé côté CPU. La différence de position dans le plan complexe entre deux frames 
est convertie en décalage en pixels dans la texture neutre :

```typescript
// Engine.ts:674-682
const deltaDx = this.previousMandelbrot.dx - this.prevFrameMandelbrot.dx
const deltaDy = this.previousMandelbrot.dy - this.prevFrameMandelbrot.dy
const texSize = this.neutralSize
const neutralExtent = Math.sqrt(aspect * aspect + 1.0)
shiftTexX = -(deltaDx * texSize) / (2 * scale * neutralExtent)
shiftTexY =  (deltaDy * texSize) / (2 * scale * neutralExtent)
```

Ce décalage est transmis au shader de la passe Brush, qui reprojette chaque pixel :

```wgsl
// reproject.wgsl:157-165
let shift = vec2<i32>(i32(round(uni.shiftTexX)), i32(round(uni.shiftTexY)));
let coord_in = coord_out - shift;

if (coord_in.x < 0 || coord_in.y < 0 
    || coord_in.x >= dims.x || coord_in.y >= dims.y) {
    // Ce pixel vient d'apparaître → marquer comme sentinelle
    prev = makeCleared(-uni.baseSentinel);
} else {
    // Ce pixel existait déjà → copier les données décalées
    prev = loadAllLayers(coord_in);
}
```

::: info Illustration

<TranslationReprojectionDemo />

:::

### Coût

Le coût de la translation est proportionnel au **périmètre** de la zone exposée, pas à sa **surface** totale.
Pour un pan de 10 pixels sur un écran de 1000×1000, on ne recalcule que ~2% des pixels au lieu de 100%.

## Gestion de la rotation

### Le problème

On pourrait penser qu'il suffit de faire tourner l'image précédente et de ne calculer que les pixels manquants
sur les bords. Mais cette approche accumule des erreurs d'interpolation après une dizaine de rotations successives,
créant des artefacts visibles (flou, déformation).

### La solution : calculer sans rotation, afficher avec rotation

L'astuce est simple mais très efficace :

1. **Le calcul Mandelbrot** se fait toujours dans le repère **non-roté** de la texture neutre.
   Les coordonnées complexes sont directement mappées depuis les UV de la texture neutre,
   sans aucune rotation.

2. **La rotation est appliquée uniquement à l'affichage**, dans la passe Color.
   Le shader de coloration transforme les coordonnées écran en coordonnées texture neutre
   en appliquant la rotation inverse :

```wgsl
// color.wgsl:164-169
let xy_screen = vec2<f32>(uv_screen.x * 2.0 - 1.0, uv_screen.y * 2.0 - 1.0);
let local = vec2<f32>(xy_screen.x * aspect, xy_screen.y);
let neutralExtent = sqrt(aspect * aspect + 1.0);
let local_rot = rotate(local, angle);
let xy_neutral = local_rot / neutralExtent;
let uv_neutral = xy_neutral * 0.5 + vec2<f32>(0.5, 0.5);
```

### Pourquoi ça marche sans erreur

Puisque la rotation n'est jamais appliquée aux données calculées mais seulement lors de l'échantillonnage
pour l'affichage, il n'y a **aucune accumulation d'erreur**.
Chaque frame, la rotation est calculée directement depuis l'angle courant, pas depuis la frame précédente.

De plus, grâce à la texture surdimensionnée (de côté = diagonale),
les pixels qui étaient hors de l'écran mais dans la texture neutre deviennent immédiatement visibles
lors d'une rotation, **sans aucun recalcul**.

### Optimisation : ne pas raffiner les pixels hors écran

La passe Brush vérifie si chaque pixel de la texture neutre est visible dans l'écran actuel.
Si un pixel est dans la texture neutre mais en dehors de la zone visible (les coins du carré qui dépassent de l'écran),
il n'est pas raffiné pour économiser du calcul :

```wgsl
// reproject.wgsl:71-78
fn is_inside_rotated_screen(xy_neutral: vec2<f32>) -> bool {
    let neutralExtent = sqrt(uni.aspect * uni.aspect + 1.0);
    let local_rot = xy_neutral * neutralExtent;
    let local = rotate(local_rot, -uni.angle);
    return abs(local.x) <= uni.aspect && abs(local.y) <= 1.0;
}
```

::: info Illustration

<RotationDemo />

:::

## Le rendu progressif avec les sentinelles

### L'idée

Lorsqu'une nouvelle vue est demandée (changement de zoom, premier affichage), il est impossible
de calculer tous les pixels immédiatement sans provoquer un gel de l'interface.

L'idée du rendu progressif est de **calculer d'abord une grille grossière**, puis de **la raffiner
frame après frame** jusqu'à obtenir une image complète.

Entre temps, les pixels non calculés sont remplis visuellement en copiant la valeur du pixel calculé le plus proche.
L'utilisateur voit donc une image qui passe progressivement de pixelisée à nette.

### Les sentinelles : un système de marquage

Les sentinelles sont des **valeurs négatives entières** stockées dans la couche 0 de la texture.
Elles encodent le niveau de résolution courant du pixel dans une grille hiérarchique en puissances de 2.

| Valeur de la couche 0 | Signification |
|-------|---------------|
| $-1$ | Ce pixel est programmé pour être calculé au prochain frame |
| $-2, -4, -8, \ldots, -64$ | Ce pixel attend : il sera résolu par snapping vers le pixel parent calculé le plus proche |
| $0$ | Ce pixel est dans l'ensemble de Mandelbrot (confirmé) |
| $> 0$ et $\|z\|^2 \geq \mu$ | Ce pixel a échappé : calcul terminé |
| $> 0$ et $\|z\|^2 < \mu$ | Budget d'itérations épuisé : le calcul reprendra au prochain frame |

### L'ensemencement initial

Au démarrage ou lors d'un changement de zoom, la texture est ensemencée avec une grille 
dont le pas initial est $64$ pixels (configurable) :

- Les pixels aux positions $(x, y)$ tels que $x \bmod 64 = 0$ **et** $y \bmod 64 = 0$ reçoivent la sentinelle $-1$. Ils seront calculés immédiatement.
- Tous les autres pixels reçoivent la sentinelle $-64$. Ils seront résolus par snapping.

```wgsl
// reproject.wgsl:148-154
if (uni.clearHistory >= 0.5) {
    let step = i32(max(1.0, uni.seedStep));
    let is_anchor = (coord_out.x % step == 0) && (coord_out.y % step == 0);
    let sentinel = select(-uni.baseSentinel, -1.0, is_anchor);
    return makeCleared(sentinel);
}
```

Cela signifie que le premier frame ne calcule qu'environ **1 pixel sur 4096** ($64 \times 64$).
L'image est très grossière mais apparaît instantanément.

### Le raffinement frame par frame

À chaque frame, la passe Brush divise par 2 le pas des sentinelles.
Les pixels qui se retrouvent sur la nouvelle grille plus fine deviennent des demandes de calcul ($-1$),
les autres passent simplement au niveau suivant :

```wgsl
// reproject.wgsl:121-138
fn refine_sentinel(s: f32, coord_out: vec2<i32>) -> f32 {
    let si = i32(round(s));
    if (si >= 0) { return s; }       // Déjà calculé → ne rien faire
    if (si == -1) { return -1.0; }   // Déjà programmé pour le calcul

    let step = -si;
    if (step <= 1) { return -1.0; }  // Dernier niveau → calculer

    let next_step = max(1, step / 2);
    let is_anchor = (coord_out.x % next_step == 0) 
                 && (coord_out.y % next_step == 0);
    // Si on est sur la nouvelle grille → calcul (-1)
    // Sinon → sentinelle au niveau suivant
    return select(-f32(next_step), -1.0, is_anchor);
}
```

Voici comment la résolution évolue au fil des frames :

| Frame | Pas de la grille | Pixels calculés par frame | Fraction cumulée |
|-------|-------------------|---------------------------|------------------|
| 1 | 64 | ~$\frac{1}{4096}$ de l'image | ~0.02% |
| 2 | 32 | ~$\frac{3}{4096}$ | ~0.1% |
| 3 | 16 | ~$\frac{12}{4096}$ | ~0.4% |
| 4 | 8 | ~$\frac{48}{4096}$ | ~1.6% |
| 5 | 4 | ~$\frac{192}{4096}$ | ~6.3% |
| 6 | 2 | ~$\frac{768}{4096}$ | ~25% |
| 7 | 1 | ~$\frac{3072}{4096}$ | 100% |

À chaque étape, on calcule environ **3 fois** plus de pixels que ce qui avait été calculé jusque-là.

::: info Illustration

<SentinelProgressionDemo />

:::

### La résolution des trous : la passe Resolve

Entre le calcul de la grille grossière et le raffinement complet, il reste des pixels non calculés (sentinelles).
La passe Resolve remplit ces trous pour que l'image affichée soit visuellement complète à chaque frame.

L'algorithme est simple et efficace grâce aux opérations binaires sur les puissances de 2 :

1. Lire le pas $s$ de la sentinelle du pixel (ex: $-8$ → pas de 8)
2. Calculer la cellule de la grille via **masque binaire** : `base = position & ~(step - 1)`
3. Tester les **4 coins** de la cellule (pour fonctionner quel que soit le sens du pan)
4. Si un coin contient un pixel terminé (échappé ou dans l'ensemble) → copier ses valeurs
5. Si aucun coin terminé → **monter d'un cran** (`step *= 2`) et recommencer

```wgsl
// resolve.wgsl:141-152
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

L'utilisation du masque binaire (`& ~(step-1)`) est un détail important :
c'est une opération extrêmement rapide sur le GPU qui permet d'aligner la position
sur la grille de puissance de 2, sans division ni modulo.

Par exemple, pour un pixel à $x = 37$ et un pas de $8$ :
- `mask = ~(8 - 1) = ~0b111 = ...11111000`
- `base_x = 37 & mask = 0b100101 & ...11111000 = 0b100000 = 32`

Le pixel sera donc résolu en testant les coins de la cellule $[32, 40] \times [y_{base}, y_{base}+8]$.

::: tip Pourquoi 4 coins ?
Tester les 4 coins au lieu d'un seul est nécessaire à cause de la translation.
Quand on fait un pan, le pixel ancre le plus proche dans une direction peut être un pixel nouvellement créé (sentinelle),
tandis que le pixel ancre de l'autre côté peut être un pixel conservé de la frame précédente.
:::

### Gestion des pixels en budget épuisé

Un cas particulier mérite attention : les pixels qui ont commencé leur calcul mais n'ont pas encore
terminé (iter > 0 mais $\|z\|^2 < \mu$).

Ces pixels ne sont **pas** des sentinelles (ils ont une valeur positive), mais ils ne sont **pas non plus** terminés.
Si la passe Resolve les utilisait tels quels pour remplir les trous, cela créerait un artefact
caractéristique en forme de **triangle de Sierpinski** — les valeurs intermédiaires se propageraient
dans la grille de manière hiérarchique.

La solution : la passe Resolve traite ces pixels comme des ancres non-terminées et **monte dans la grille**
jusqu'à trouver un ancêtre réellement terminé :

```wgsl
// resolve.wgsl:107-109
// Budget-exhausted anchor (iter > 0, |z|² < mu):
// climb to a coarser finished ancestor starting at step 2.
```

## Le calcul progressif des itérations

### Le problème

Au-delà du nombre de pixels à calculer, c'est le nombre d'**itérations par pixel** qui pose problème.

À des niveaux de zoom profonds, certains pixels nécessitent des centaines de milliers d'itérations
pour déterminer s'ils appartiennent à l'ensemble.
Si on essaie de calculer toutes les itérations d'un coup, la frame prend des secondes, 
voire des minutes, ce qui est inacceptable pour une navigation interactive.

### La solution : un budget par frame

Chaque frame, le Mandelbrot pass n'exécute qu'un **nombre limité d'itérations** par pixel.
Ce nombre, appelé `iterationBatchSize`, est ajusté dynamiquement.

```typescript
// Engine.ts:44-46
const MIN_BATCH_SIZE = 100
const MAX_BATCH_SIZE = 10_000
private iterationBatchSize = 10000
```

Un pixel qui n'a pas fini son calcul à la fin de la frame sauvegarde son état complet
dans les 7 couches de la texture ($z$, $dz$, nombre d'itérations accumulé).
Au frame suivant, le calcul reprend exactement là où il s'était arrêté :

```wgsl
// mandelbrot.wgsl (simplifié)
let is_compute_request = (prev_iter == -1.0);
let needs_continuation = (prev_iter > 0.0 
    && (prev_zx * prev_zx + prev_zy * prev_zy) < mu);

if (needs_continuation) {
    // Reprendre z et dz depuis la texture
    return mandelbrot_compute(x0, y0, 
        prev_iter, prev_mu, prev_zx, prev_zy, 
        stored_dzx, stored_dzy, prev_ref_iter);
}
```

Le total d'itérations s'accumule : $\text{iter}_{total} = \text{iter}_{précédent} + \text{iter}_{cette frame}$.

### L'ajustement automatique du budget

Le budget d'itérations par frame est ajusté **automatiquement** pour maintenir un temps GPU
proche de la cible (configurable via `targetFps`, par défaut 60 FPS soit ~16ms).

Après chaque soumission de commandes GPU, le moteur mesure le temps réel d'exécution
et ajuste le batch avec un **lissage exponentiel** (coefficient $\alpha = 0.3$) :

```typescript
// Engine.ts:1190-1218 (simplifié)
this.device.queue.onSubmittedWorkDone().then(() => {
    const elapsed = performance.now() - submitStartMs
    if (elapsed > 0) {
        const ratio = (1000 / this.targetFps) / elapsed
        const ideal = this.iterationBatchSize * ratio
        this.iterationBatchSize = Math.round(
            Math.min(MAX_BATCH_SIZE,
                Math.max(MIN_BATCH_SIZE,
                    this.iterationBatchSize * 0.7 + ideal * 0.3
                )
            )
        )
    }
})
```

**Comment ça marche concrètement :**

- Si une frame prend **32ms** avec un batch de 1000 :
  - ratio = 16/32 = 0.5
  - idéal = 1000 × 0.5 = 500
  - nouveau batch = 1000 × 0.7 + 500 × 0.3 = **850**
  - Le batch diminue progressivement pour ramener le temps vers 16ms.

- Si une frame prend **8ms** avec un batch de 1000 :
  - ratio = 16/8 = 2.0
  - idéal = 2000
  - nouveau batch = 1000 × 0.7 + 2000 × 0.3 = **1300**
  - Le batch augmente car on a de la marge.

Le lissage exponentiel (70% ancien / 30% nouveau) empêche les oscillations :
sans lui, le budget pourrait alterner entre "trop" et "trop peu" d'une frame à l'autre.

::: info Illustration

<AdaptiveBatchDemo />

:::

### Le maximum d'itérations s'adapte au zoom

En plus du budget par frame, le nombre maximum d'itérations global s'adapte automatiquement
à la profondeur de zoom :

```typescript
// Mandelbrot.vue:116
const maxIterations = Math.min(
    Math.max(100, 
        1000 * maxIterationMultiplier * Math.log2(1.0 / scale)),
    100_000
)
```

Plus le zoom est profond, plus les structures fines de la fractale nécessitent d'itérations
pour être distinguées du fond noir.
La formule croît en $\log_2$ de la profondeur de zoom, bornée entre 100 et 100 000 itérations.

Par exemple :
- Zoom $\times 1$ → ~100 itérations
- Zoom $\times 1000$ → ~10 000 itérations
- Zoom $\times 10^{10}$ → ~33 000 itérations

### Le chunking de l'orbite de référence

L'orbite de référence (calcul en précision arbitraire, exécuté en Rust compilé en WebAssembly)
est elle aussi construite **incrémentalement**.

Chaque frame, au maximum **100 pas** de l'orbite sont calculés :

```typescript
// Engine.ts:66
static readonly ORBIT_CHUNK_SIZE = 100
```

Tant que l'orbite n'est pas complète (c'est-à-dire tant que le nombre de pas disponibles
est inférieur au maximum d'itérations demandé), le moteur force des frames supplémentaires :

```typescript
// Engine.ts:617-618
if (availableIter < maxIterations) {
    this.extraFrames = Math.max(this.extraFrames, 1)
}
```

Cela évite de bloquer l'interface pendant le calcul de l'orbite, qui peut prendre
des centaines de milliers de pas en précision arbitraire.

## Reprojection du zoom : ne plus tout recalculer

### Le problème

Sans reprojection, tout changement de zoom déclenche un **reset complet** de l'historique :
tous les pixels sont ré-ensemencés avec des sentinelles et le rendu progressif repart de zéro.
C'est le seul mouvement (avec le ré-ancrage) qui n'est pas reprojeté.
Pour la translation, on décale. Pour la rotation, on calcule sans rotation et on affiche avec.
Mais pour le zoom ? On jetait tout — et pendant toute la durée du zoom, l'image se reconstruisait
de grossier à fin, créant un clignotement visible.

### Le principe : figer, zoomer visuellement, calculer en parallèle

La solution applique au zoom une stratégie analogue à la translation, en utilisant **deux textures** simultanées :

1. **Figer** la texture résolue actuelle comme snapshot de référence (`frozenTexture`)
2. **Lancer immédiatement** le calcul à l'échelle cible dans la texture live
3. **Afficher les deux** au bon niveau de zoom, en fusionnant

### Le cycle de zoom par paliers de ×16

Le zoom est décomposé en **paliers discrets**. Le seuil de magnification est configurable
(par défaut ×16, stocké dans `zoomMagnificationThreshold`) :

```
┌─────────────────────────────────────────────────────┐
│  Début de cycle                                     │
│  ► Copier resolvedTexture → frozenTexture (GPU)     │
│  ► Enregistrer frozenScale = scale courante         │
│  ► Calculer liveScale = frozenScale / threshold     │
│  ► Relancer le calcul (clearHistory) à liveScale    │
│                                                     │
│  Pendant le cycle                                   │
│  ► zoomFactor = frozenScale / displayScale          │
│  ► liveZoomFactor = liveScale / displayScale        │
│  ► Color rend les 2 textures :                      │
│       • Live (prioritaire si pixel calculé)         │
│       • Frozen (fallback, étirée/réduite)           │
│  ► Sentinelles se raffinent en parallèle            │
│                                                     │
│  Quand zoomFactor ≥ threshold (zoom in)             │
│  ou zoomFactor ≤ 1/threshold (zoom out)             │
│  ► La live remplace la frozen (nouveau snapshot)    │
│  ► Nouveau cycle avec nouveau liveScale             │
└─────────────────────────────────────────────────────┘
```

### Gestion du cycle côté CPU

L'état du zoom est maintenu par plusieurs variables dans `Engine.ts` :

```typescript
// Engine.ts:214-242
zoomMagnificationThreshold = 16.0   // seuil configurable (×16 par défaut)
private zoomFactor = 1.0            // frozenScale / displayScale
private zoomTarget = 1.0
private frozenScale = 0             // échelle au moment du freeze
private liveScale = 0               // échelle cible du calcul en cours
private liveZoomFactor = 1.0        // liveScale / displayScale
private zoomReprojectionActive = false
private needFreezeSnapshot = false   // demande de copie resolved → frozen
private zoomingIn = true             // direction du zoom
private zoomIdleFrames = 0           // frames consécutives sans changement de scale
private postZoomFullRecompute = false // recompute final après fin du zoom
```

La méthode `update()` gère la détection du changement d'échelle et le swap :

```typescript
// Engine.ts:746-797 (simplifié)
if (scaleChanged && !this.zoomReprojectionActive) {
    // Démarrer un nouveau cycle
    this.zoomReprojectionActive = true
    this.frozenScale = this.prevFrameMandelbrot!.scale
    this.zoomingIn = mandelbrot.scale < this.frozenScale
    this.liveScale = this.zoomingIn
        ? this.frozenScale / this.zoomMagnificationThreshold
        : this.frozenScale * this.zoomMagnificationThreshold
    this.needFreezeSnapshot = true
    this.clearHistoryNextFrame = true
}

// Vérifier si on a atteint le seuil de swap
const shouldSwap = this.zoomingIn
    ? this.zoomFactor >= this.zoomMagnificationThreshold
    : this.zoomFactor <= 1.0 / this.zoomMagnificationThreshold

if (shouldSwap) {
    // Swap : la live devient la nouvelle frozen
    this.needFreezeSnapshot = true
    this.clearHistoryNextFrame = true
    this.frozenScale = this.liveScale
    this.liveScale = this.zoomingIn
        ? mandelbrot.scale / this.zoomMagnificationThreshold
        : mandelbrot.scale * this.zoomMagnificationThreshold
}
```

### La copie GPU resolved → frozen

Au début de chaque cycle, la texture résolue est copiée dans la texture figée en une seule commande GPU :

```typescript
// Engine.ts:1096-1106
if (this.needFreezeSnapshot && this.resolvedTexture && this.frozenTexture) {
    commandEncoder.copyTextureToTexture(
        { texture: this.resolvedTexture },
        { texture: this.frozenTexture },
        { width: texSize, height: texSize, depthOrArrayLayers: layerCount },
    )
    this.needFreezeSnapshot = false
}
```

### Le double échantillonnage dans la passe Color

Le shader `color.wgsl` reçoit **deux texture arrays** et les uniforms de zoom :

```wgsl
// color.wgsl:29-35
@group(0) @binding(1) var tex: texture_2d_array<f32>;        // live (resolved)
@group(0) @binding(6) var texFrozen: texture_2d_array<f32>;  // frozen snapshot

// Uniforms de zoom
zoomFactor: f32,       // frozenScale / displayScale
liveZoomFactor: f32,   // liveScale / displayScale
frozenShiftU: f32,     // décalage pan cumulé (UV normalisé)
frozenShiftV: f32,
```

Pour chaque pixel, la passe Color tente d'abord la texture live, puis se rabat sur la frozen :

```wgsl
// color.wgsl:339-376 — Texture live (prioritaire)
let uv_live = (uv_neutral - 0.5) / lzf + 0.5;

if (liveInBounds) {
    let live_iter = textureLoad(tex, liveCoord, 0, 0).r;
    if (live_iter >= 0.0) {
        // Pixel calculé dans la live → l'utiliser
        return vec4<f32>(colorize_pixel(...).rgb, 1.0);
    }
}

// color.wgsl:378-417 — Fallback sur la frozen (étirée + décalée par le pan)
let uv_frozen = (uv_neutral - 0.5) / zf + 0.5
                - vec2<f32>(frozenShiftU, frozenShiftV);

let frozen_iter = textureLoad(texFrozen, frozenCoord, 0, 0).r;
return vec4<f32>(colorize_pixel(...).rgb, 1.0);
```

La vérification des bornes est **rotation-aware** : quand le facteur de zoom provoque une expansion UV
dans les marges de rotation de la texture neutre, les pixels sont rejetés via un test de visibilité
écran (`isInsideScreen`).

### Pan + zoom simultanés

Si l'utilisateur translate pendant un zoom, la snapshot doit suivre le mouvement.
Le décalage de pan cumulé de la texture live (en texels arrondis) est converti en UV normalisé
dans l'espace de la frozen :

```typescript
// Engine.ts:863-868
(this.zoomReprojectionActive && this.frozenScale > 0)
    ? this.cumulativeShiftX * (this.liveScale / this.frozenScale) / this.neutralSize
    : 0,
```

Ce décalage est soustrait dans le shader lors de l'échantillonnage de la frozen texture,
ce qui élimine les erreurs d'accumulation indépendante.

### Sentinelles adaptées au zoom

Pendant un zoom, deux ajustements sont appliqués au système de sentinelles :

1. **Pas minimum de raffinement** (`ZOOM_MIN_BRUSH_STEP = 2`) : empêche la grille de descendre
   en dessous de 2 pixels pendant le zoom, évitant le gaspillage GPU sur des pixels
   qui seront redimensionnés au prochain cycle.

2. **Ensemencement plus rapide** (`ZOOM_SENTINEL_SEED_STEP = 64`) : la texture live utilise
   une grille initiale plus fine pour remplir rapidement l'image.

3. **Post-zoom** (`POST_ZOOM_SEED_STEP = 2048`) : quand le zoom s'arrête, le recompute final
   utilise un pas très grossier pour éviter de superposer des données grossières
   sur l'image déjà raffinée par la reprojection.

### Fin de zoom et recompute

Quand l'utilisateur arrête de zoomer (aucun changement de scale pendant `ZOOM_IDLE_GRACE_FRAMES` frames),
le cycle de reprojection se termine :

```typescript
// Engine.ts:807-821
if (this.zoomIdleFrames >= ZOOM_IDLE_GRACE_FRAMES) {
    this.zoomReprojectionActive = false
    this.zoomFactor = 1.0
    this.liveZoomFactor = 1.0
    this.clearHistoryNextFrame = true
    this.postZoomFullRecompute = true
}
```

Un recompute final est lancé à l'échelle exacte d'affichage, cette fois sans reprojection.

### Coût mémoire

La texture frozen a les mêmes dimensions que la resolved :

$$
\text{neutralSize}^2 \times 7 \times 4\text{ octets} = \text{neutralSize}^2 \times 28\text{ octets}
$$

Pour un écran 1920×1080 : neutralSize $\approx$ 2203, soit environ **+45 Mo** de VRAM
pour la frozen texture, portant le total à ~180 Mo pour les 4 textures (A, B, Resolved, Frozen).

### Résultat

Avec cette technique :
- L'utilisateur voit **toujours** une image nette (la snapshot zoomée) pendant la transition
- La nouvelle image apparaît **progressivement par-dessus**, pixel par pixel
- Il n'y a **aucune frame noire** ni aucun clignotement grossier→fin
- Le zoom continu (molette maintenue) enchaîne les cycles de manière fluide
- Le pan et la rotation fonctionnent simultanément avec le zoom sans artefact

::: info Illustration

<ZoomReprojectionDemo />

:::

## Quand tout recalculer ?

Toutes ces optimisations reposent sur la **réutilisation** des données de la frame précédente.
Mais dans certains cas, cette réutilisation n'est pas possible et un reset complet est nécessaire :

| Événement | Pourquoi ? | Statut |
|-----------|------------|--------|
| Changement de zoom | Les coordonnées de tous les pixels changent | **Reprojeté** (cf. section ci-dessus) |
| Changement de $\mu$ (rayon d'échappement) | Les calculs précédents sont invalides | Reset nécessaire |
| Ré-ancrage de l'orbite de référence | Le repère de perturbation change brutalement | Reset nécessaire |
| Premier affichage | Pas de données précédentes | Reset nécessaire |

Le ré-ancrage se produit automatiquement quand le centre de la vue s'éloigne de plus de 
$20 \times$ l'échelle courante par rapport au centre de l'orbite de référence.
À ce moment, l'orbite est recalculée depuis le nouveau centre.

## Le compteur de pixels GPU

### Le problème

Comment savoir quand le rendu progressif est terminé ? Sans compteur, le moteur devrait
soit tourner indéfiniment (gaspillage), soit utiliser un nombre de frames fixe (imprécis).

### La solution : un compute pass dédié

Après la passe Mandelbrot (passe 1) et avant la passe Resolve (passe 2), un **compute shader**
parcourt la texture et compte les pixels qui nécessitent encore du travail.

Le shader `count_unfinished.wgsl` distingue deux catégories de pixels via deux compteurs atomiques :

| Compteur | Contenu | Utilisé pour |
|----------|---------|-------------|
| `count` | Tous les pixels non terminés (sentinelles + continuations) | Déterminer si le rendu est terminé |
| `active_count` | Les pixels que `mandelbrot.wgsl` traite réellement (iter == -1 ou continuation) | Le gating adaptatif du raffinement |

```wgsl
// count_unfinished.wgsl:79-88
let is_sentinel        = (iter < 0.0);
let needs_continuation = (iter > 0.0) && ((zx * zx + zy * zy) < params.mu);
let is_active          = (iter == -1.0) || needs_continuation;

if (is_sentinel || needs_continuation) {
    atomicAdd(&counter.count, 1u);
}
if (is_active) {
    atomicAdd(&counter.active_count, 1u);
}
```

Seuls les pixels **à l'intérieur du viewport roté** sont comptés — les pixels dans les marges
de rotation de la texture neutre sont ignorés :

```wgsl
// count_unfinished.wgsl:70-72
if (!is_inside_rotated_screen(xy_neutral)) {
    return;
}
```

### Dispatch et readback asynchrone

Le dispatch utilise des workgroups de 16×16, couvrant toute la texture neutre :

```typescript
// Engine.ts:1137-1160
commandEncoder.clearBuffer(this.counterBuffer, 0, 8)   // reset les 2 compteurs
const computePass = commandEncoder.beginComputePass()
computePass.setPipeline(this.pipelineCount)
computePass.setBindGroup(0, this.counterBindGroup)
computePass.dispatchWorkgroups(
    Math.ceil(this.neutralSize / 16),
    Math.ceil(this.neutralSize / 16),
)
computePass.end()
// Copier vers un buffer mappable pour lecture CPU
commandEncoder.copyBufferToBuffer(
    this.counterBuffer, 0, this.counterReadBuffer, 0, 8
)
```

La lecture CPU est **asynchrone** pour ne pas bloquer le pipeline :

```typescript
// Engine.ts:1220-1224
await this.counterReadBuffer!.mapAsync(GPUMapMode.READ)
const data = new Uint32Array(this.counterReadBuffer!.getMappedRange())
this.unfinishedPixelCount = data[0]
this.activePixelCount = data[1]
this.counterReadBuffer!.unmap()
```

### Convergence et arrêt automatique

La méthode `needsMoreFrames()` utilise le compteur pour décider si le rendu doit continuer :

```typescript
// Engine.ts:1334-1345
needsMoreFrames(): boolean {
    if (this.needRender) ...
    else if (this.zoomReprojectionActive) ...
    else if (this.clearHistoryNextFrame) ...
    else if (this.orbitIncomplete) ...
    else if (this.unfinishedPixelCount < 0
        || this.unfinishedPixelCount > UNFINISHED_PIXEL_DONE_THRESHOLD) ...
    return reason !== ''
}
```

Le seuil `UNFINISHED_PIXEL_DONE_THRESHOLD = 10` tolère quelques pixels résiduels
(dus aux arrondis flottants aux frontières des sentinelles) plutôt que de tourner indéfiniment.
Quand le compteur descend en dessous de ce seuil, le moteur s'arrête et économise du GPU.

## Le gating adaptatif du raffinement

### Le problème

À chaque étape de raffinement des sentinelles, le nombre de pixels à calculer est multiplié
par environ **4** (la grille passe de pas $n$ à $n/2$, soit 4× plus de points).
Si le GPU est déjà saturé (batch au minimum), cette avalanche de pixels peut provoquer
des frames très longues.

### La solution : geler la grille sous pression

Le moteur **gèle le raffinement** des sentinelles quand deux conditions sont réunies :
1. Le batch d'itérations est au minimum (`MIN_BATCH_SIZE = 100`)
2. Le nombre de pixels actifs dépasse un seuil (`ACTIVE_PIXEL_GATE_THRESHOLD = 5 000 000`)

```typescript
// Engine.ts:1057-1072
const gateOpen =
    this.clearHistoryNextFrame
    || this.activePixelCount < 0
    || this.iterationBatchSize > MIN_BATCH_SIZE
    || this.activePixelCount < ACTIVE_PIXEL_GATE_THRESHOLD * this.gpuLoadMultiplier

if (gateOpen && this.refinementWasGated) {
    // Quand la porte se rouvre, baisser le batch préventivement
    this.iterationBatchSize = MIN_BATCH_SIZE
}
this.refinementWasGated = !gateOpen
```

Le flag `allowRefinement` est transmis au shader `reproject.wgsl`, qui gèle la grille :

```wgsl
// reproject.wgsl:141-143
if (uni.allowRefinement < 0.5) {
    return s;  // Pas de raffinement : garder la sentinelle telle quelle
}
```

### Pourquoi ça fonctionne

- Si le batch a de la marge (au-dessus de `MIN_BATCH_SIZE`), la porte reste ouverte :
  le contrôleur de batch absorbera le pic en réduisant le nombre d'itérations par pixel.
- Si le batch est déjà au minimum, la porte se ferme : on attend que les pixels actuels
  terminent avant d'en injecter de nouveaux.
- Quand la porte se rouvre, le batch est préventivement réduit au minimum pour absorber
  le pic ×4 de la prochaine étape de raffinement.

Ce mécanisme garantit la convergence tout en maintenant un framerate stable,
même sur des GPU lents ou des écrans haute résolution.

## Le sampling bilinéaire de la palette

### Le problème

La palette de couleurs est une texture 1D de 4096 pixels (`rgba8unorm`).
Avec un échantillonnage discret (`textureLoad`, nearest-neighbor), les dégradés subtils
présentent un **banding** visible — des bandes de couleur unie séparées par des transitions brutales.

### La solution : un sampler linéaire

Un `GPUSampler` avec filtrage bilinéaire est créé et passé au shader de coloration :

```typescript
// Engine.ts:334-339
this.paletteSampler = this.device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    addressModeU: 'repeat',    // la palette boucle naturellement
    addressModeV: 'clamp-to-edge',
})
```

Dans le shader, `textureSampleLevel` remplace `textureLoad` pour l'accès à la palette :

```wgsl
// color.wgsl:124
let paletteColor = textureSampleLevel(
    paletteTex, paletteSampler,
    vec2<f32>(palettePhase, 0.5), 0.0
).rgb;
```

::: tip Pourquoi `textureSampleLevel` et non `textureSample` ?
`textureSample` exige un **contrôle de flux uniforme** (tous les pixels d'un workgroup
doivent suivre le même chemin). Or, la fonction `colorize_pixel` est appelée depuis
des branches qui dépendent des données par pixel (sentinelle, itération...).
`textureSampleLevel` prend un niveau de mip explicite (0.0) et n'a pas cette restriction,
tout en produisant exactement la même interpolation bilinéaire.
:::

Le mode `repeat` sur l'axe U est important : la palette boucle naturellement
(phase 0.999 → 0.001), et le filtrage linéaire doit pouvoir interpoler correctement
à travers cette frontière.

## HUD de statistiques de rendu

Un composant `RenderStats.vue` affiche en temps réel les métriques de performance
sous forme de HUD superposé au rendu :

- **FPS** avec indicateur actif/inactif (point vert/gris)
- **Pourcentage de complétion** : $(totalPixels - unfinishedPixels) / totalPixels \times 100$
- **Pixels non terminés** et **pixels actifs**
- **Temps GPU par frame** (en ms)
- **Taille du batch d'itérations** courant
- **Progression de l'orbite** : `currentGuardedMaxIter / currentMaxIterations`
- **Opérations par frame** : $activePixels \times batchSize$
- **Graphique temporel** avec historique de 200 échantillons (pixels non terminés, FPS, pixels actifs, ops/frame)

Ce HUD est dépliable d'un clic et met à jour ses données toutes les 150ms
en interrogeant les propriétés publiques de l'Engine (`unfinishedPixelCount`, `activePixelCount`, `iterationBatchSize`...).

## Résultat : une navigation fluide

L'ensemble de ces techniques permet une navigation fluide même sur des scènes complexes.

Voici un rendu interactif qui utilise toutes les optimisations décrites :

<ClientOnly>
<MandelbrotController
:cx="'-0.5'"
:cy="'0.0'"
:scale="'1.5'"
:angle="0.0"
:activatePalette="true"
:activateSkybox="false"
:activateTessellation="false"
:activateWebcam="false"
:activateShading="true"
:activateZebra="false"
:activateSmoothness="true"
/>
</ClientOnly>

Essayez de naviguer : vous observerez que lors d'un pan rapide, les bords de l'image se remplissent
progressivement (sentinelles). Lors d'un zoom, la snapshot figée reste visible pendant que la nouvelle
image se calcule en parallèle — sans clignotement ni frame noire.
Et à tout moment, le framerate reste stable grâce à l'ajustement automatique du budget d'itérations
et au gating adaptatif du raffinement.

## Résumé

| Optimisation | Mécanisme | Bénéfice |
|---|---|---|
| **Pan partiel** | Décalage texture + sentinelles hors limites | $O(\text{périmètre})$ au lieu de $O(\text{surface})$ |
| **Rotation sans recalcul** | Texture neutre surdimensionnée ; rotation uniquement à l'affichage | Zéro recalcul |
| **Sentinelles hiérarchiques** | Grille puissance de 2, subdivisée frame par frame (64 → 32 → ... → 1) | Raffinement progressif grossier → fin |
| **Resolve avec escalade** | Test des 4 coins + escalade si budget épuisé | Affichage sans artefact |
| **Batch adaptatif** | Feedback temps GPU → taille du batch (EMA $\alpha = 0.3$, cible configurable) | Framerate constant |
| **Continuation d'itérations** | État complet par pixel dans 7 couches texture | Itérations profondes sans blocage |
| **Chunking orbite** | WASM calcule 100 pas max par frame | UI jamais bloquée |
| **Reprojection zoom** | Snapshot figée + calcul live en parallèle, double texture dans Color, paliers ×16 | Zoom sans flash ni recalcul visible |
| **Compteur GPU** | Compute pass atomique + readback asynchrone | Arrêt automatique du rendu, zéro gaspillage |
| **Gating adaptatif** | Gel du raffinement quand GPU saturé, drop préventif du batch | Pas d'avalanche de pixels, framerate stable |
| **Palette bilinéaire** | `textureSampleLevel` avec sampler linéaire + repeat | Dégradés lisses, pas de banding |
| **HUD statistiques** | Compteurs temps réel + graphique historique 200 échantillons | Monitoring visuel de la convergence |
