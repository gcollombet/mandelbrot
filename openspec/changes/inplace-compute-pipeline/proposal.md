# Proposal — inplace-compute-pipeline

## Why

Le pipeline de rendu progressif déplace ~500 Mo/frame de trafic mémoire GPU à 2048² (deux copies pleine texture de 134 Mo + une passe brush qui relit/réécrit les 8 layers de tous les pixels), même quand 99 % des pixels sont déjà convergés. Le coût par frame est dominé par la bande passante, pas par le calcul ; il doit devenir proportionnel aux pixels réellement actifs (sentinelles à raffiner + continuations).

## What Changes

- Fusion des passes brush (`reproject.wgsl`) et mandelbrot (`mandelbrot.wgsl`) en un seul compute shader travaillant **in-place** sur `rawTexture` (A) via `texture_storage_2d_array<r32float, read_write>`, pour les frames sans translation ni clearHistory — la quasi-totalité des frames de convergence.
- Suppression de la copie `copyTextureToTexture` B→A sur ce chemin (les pixels finis ne génèrent plus aucune écriture).
- Fusion du compteur `count_unfinished` dans le compute (atomics workgroup→global), supprimant la passe count séparée sur ce chemin.
- Gating CPU de la copie A→resolved et de la passe resolve quand le compteur indique 0 sentinelle et 0 continuation, avec bind group alternatif faisant lire `color.wgsl` directement depuis A (option C1).
- Conservation de l'ancien chemin render+copies pour les frames de pan (`shiftTexX/Y ≠ 0`) et de clearHistory, et derrière un flag de bascule runtime le temps de la validation.
- Correction du point de lecture de `readIterationDataAt` (picking pixel) quand le gating C1 rend `resolvedTexture` périmée : lecture depuis A dans ce cas.

Non inclus (suivi séparé) : le swap de rôles A/B pour les frames de pan, l'option C2 (pass-through resolve en shader), l'investigation du scintillement frame-à-frame préexistant, toute compaction de liste de pixels actifs.

## Capabilities

### New Capabilities

- `progressive-render-pipeline`: comportement du pipeline de rendu progressif par frame — sélection du chemin compute in-place vs render ping-pong, proportionnalité du trafic mémoire aux pixels actifs, sémantique du compteur unfinished/active, gating du resolve hors convergence, et équivalence visuelle entre les deux chemins.

### Modified Capabilities

(aucune — les specs existantes couvrent textures/presets, pas le pipeline de rendu)

## Impact

- `src/Engine.ts` : création de `rawTexture` avec `STORAGE_BINDING`, nouveau compute pipeline + bind groups, bifurcation par frame compute/render, bind group color alternatif (lecture A), gating copie+resolve, lecture picking depuis A sous gating.
- Nouveau shader `src/assets/mandelbrot_brush.wgsl` (compute) reprenant la logique de `mandelbrot.wgsl`, `reproject.wgsl` (refine_sentinel, ROI) et `count_unfinished.wgsl` (atomics workgroup).
- Inchangés : `resolve.wgsl`, `color.wgsl`, `merge_frozen.wgsl`, le worker de référence, les buffers orbite/BLA, le contrôleur de batch adaptatif, le format 8 layers r32float.
- Contrainte plateforme : `r32float` est le seul format `read_write` storage en WebGPU core (supporté Chrome) ; validation Tint stricte à la création du pipeline.
- Risque maîtrisé : `rawBrushTexture` (B) reste allouée (scratch du merge frozen + chemin pan) — gain en bande passante et passes, pas en VRAM.
