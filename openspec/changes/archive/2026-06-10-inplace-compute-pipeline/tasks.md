# Tasks — inplace-compute-pipeline

## 1. Fondations Engine

- [x] 1.1 Ajouter `GPUTextureUsage.STORAGE_BINDING` à la création de `rawTexture` (A) dans Engine.ts, en conservant les usages existants ; vérifier l'absence d'erreur de validation à la création
- [x] 1.2 Ajouter le flag runtime `useInplaceCompute` (défaut off pour l'instant) et le booléen `resolveSkipped`

## 2. Shader compute fusionné

- [x] 2.1 Créer `src/assets/mandelbrot_brush.wgsl` : entête documentant la contrainte texel-local, binding `texture_storage_2d_array<r32float, read_write>`, uniforms brush+mandelbrot, buffers orbite/BLA identiques à mandelbrot.wgsl
- [x] 2.2 Porter la logique brush locale (refine_sentinel, gating allowRefinement/minBrushStep, is_inside_rotated_screen) depuis reproject.wgsl
- [x] 2.3 Porter la logique mandelbrot (état du pixel, continuation, mandelbrot_compute, BLA, dérivée) depuis mandelbrot.wgsl ; `discard` → absence de `textureStore`
- [x] 2.4 Fusionner le compteur unfinished/active (pattern atomics workgroup de count_unfinished.wgsl), comptage de l'état post-itération, barrières en flux uniforme

## 3. Intégration pipeline

- [x] 3.1 Créer le compute pipeline + bind groups dans Engine.ts (uniforms fusionnés ou deux buffers, storage texture A, buffer compteur)
- [x] 3.2 Bifurcation par frame : si `shift == 0 && !clearHistory && useInplaceCompute` → dispatch compute (`ceil(neutralSize/16)²`) en remplacement des passes brush/copie B→A/mandelbrot/count ; sinon chemin existant inchangé
- [x] 3.3 Brancher le readback compteur sur le buffer du compute (même sémantique que la passe count) et valider `needsMoreFrames()`/contrôleur de batch

## 4. Gating resolve (C1)

- [x] 4.1 Préconstruire le bind group color alternatif lisant `rawTexture` au lieu de `resolvedTexture`
- [x] 4.2 Gating : quand le dernier readback indique 0/0 et qu'aucun snapshot/merge n'est requis cette frame, sauter copie A→resolved + resolve et utiliser le bind group alternatif ; positionner `resolveSkipped`
- [x] 4.3 Désactiver le gating sur les frames avec `needFreezeSnapshot` ou `needMergeSnapshot` (resolved doit être à jour avant snapshot/merge)
- [x] 4.4 `readIterationDataAt` : lire depuis `rawTexture` quand `resolveSkipped` est actif

## 5. Validation

- [x] 5.1 Vérifier la compilation TS et l'absence d'erreur de validation WebGPU (pipeline, bind groups, dispatch) au lancement
- [x] 5.2 Validation visuelle flag on/off : convergence identique sur vue par défaut, pan, zoom (snapshot/merge), clearHistory
- [x] 5.3 Vérifier le comportement du compteur : convergence → 0/0, idle gating actif, reprise de calcul au changement de vue
- [x] 5.4 Activer `useInplaceCompute` par défaut une fois l'équivalence confirmée
- [x] 5.5 Nettoyer les commentaires obsolètes « 7 MRT layers » dans Engine.ts (LAYER_COUNT = 8)
