# Design — inplace-compute-pipeline

## Context

Le pipeline de rendu progressif (séquence par frame dans `src/Engine.ts` ~2100-2280) exécute aujourd'hui, à chaque frame de convergence :

| # | Passe | Type | Lit | Écrit |
|---|-------|------|-----|-------|
| 0 | brush (`reproject.wgsl`) | render 8-MRT | A | B |
| 1 | copie B→A | copyTextureToTexture | B | A |
| 2 | mandelbrot (`mandelbrot.wgsl`) | render 8-MRT, loadOp load | B | A |
| 3 | count (`count_unfinished.wgsl`) | compute | A (layers 0,2,3) | buffer atomique |
| 4 | copie A→resolved | copyTextureToTexture | A | resolved |
| 5 | resolve (`resolve.wgsl`) | render 8-MRT, loadOp load | A | resolved |
| 6 | color (`color.wgsl`) | render | resolved + frozen | swapchain |

A = `rawTexture`, B = `rawBrushTexture`, toutes `texture_2d_array<r32float>` à 8 layers (`LAYER_COUNT = 8`), taille `neutralSize²`. À 2048², le trafic fixe ≈ 500 Mo/frame quel que soit le nombre de pixels actifs.

Faits vérifiés dans le code :
- Le brush est texel-local **sauf** translation (`coord_in = coord_out - shift`, reproject.wgsl:182) ; `clearHistory` est une écriture pure sans lecture.
- `mandelbrot.wgsl` ne lit que son propre texel (un seul `textureLoad` à coord propre) et n'utilise ni dérivées ni `textureSample` → portable en compute tel quel ; les `discard` deviennent « pas de `textureStore` ».
- La passe mandelbrot ne lit jamais `resolvedTexture` (resolve purement display).
- Le merge frozen au zoom utilise B comme scratch (copie frozen→B, Engine.ts ~2111) → B reste allouée.
- `readIterationDataAt` (Engine.ts ~2582) lit `resolvedTexture` hors pipeline pour le picking.

## Goals / Non-Goals

**Goals:**
- Coût mémoire par frame de convergence proportionnel aux pixels actifs (sentinelles + continuations) quand `shift == 0 && !clearHistory`.
- Suppression sur ce chemin des passes 0, 1, 3 (fusionnées dans un compute unique) et de la copie 4 + passe 5 hors convergence (gating compteur).
- Image strictement identique entre les deux chemins ; zéro erreur de validation WebGPU.
- Flag de bascule runtime pour valider visuellement et revenir en arrière.

**Non-Goals:**
- Pas de swap de rôles A/B pour les frames de pan (le trio render+copie reste pour `shift ≠ 0` / `clearHistory`).
- Pas d'option C2 (pass-through resolve en shader).
- Pas de réduction VRAM (B reste allouée : scratch merge + chemin pan).
- Pas de compaction de liste de pixels actifs (optimisation ultérieure si la divergence des workgroups déçoit).
- Pas de fix du scintillement frame-à-frame préexistant (suivi séparé).

## Decisions

### D1 — Compute in-place sur A via `texture_storage_2d_array<r32float, read_write>`
`r32float` est le seul format supportant l'access mode `read_write` en WebGPU core (supporté Chrome). Chaque invocation lit et écrit uniquement son propre texel → aucune course, pas de ping-pong. Alternative rejetée : packing 8×r32float → 2×rgba32float (rgba32float n'est pas read_write).

### D2 — Un seul compute shader fusionné brush+mandelbrot+count (`mandelbrot_brush.wgsl`)
Workgroups 16×16, dispatch `ceil(neutralSize/16)²`. Par texel : (1) `refine_sentinel` + gating `allowRefinement`/`minBrushStep` (logique locale reprise de reproject.wgsl) ; (2) si actif (sentinelle -1 ou continuation `|z|² < mu`) : `mandelbrot_compute` + `textureStore` des 8 layers ; (3) sinon aucune écriture ; (4) compteurs par atomics workgroup → global (pattern de `count_unfinished.wgsl`). Hors ROI (`is_inside_rotated_screen`) : ne rien faire.

Le comptage devient *pendant* la passe au lieu d'après : compter l'état **post-itération** du texel (la valeur écrite, ou existante si inchangée) pour préserver la sémantique du readback. Contrainte WGSL : barrières en flux uniforme — pas d'early return avant `workgroupBarrier`, encapsuler la logique par-texel dans un `if`.

Alternative rejetée : compute séparé du count (une passe de plus, relecture de A complète).

### D3 — Bifurcation par frame, ancien chemin conservé pour pan/clear
Si `shift == 0 && !clearHistory && flag actif` → dispatch compute. Sinon → trio brush(render)→copie→mandelbrot(render) existant, inchangé. La translation lit le texel voisin, interdite en place ; le clearHistory pourrait être in-place (écriture pure) mais reste sur l'ancien chemin pour minimiser la surface du changement. Les barrières entre passes sont implicites en WebGPU au sein d'un même command encoder.

### D4 — Gating C1 du resolve par compteur
Quand le dernier readback indique 0 unfinished et 0 active **et** que ce readback a été échantillonné après la dernière frame susceptible d'avoir muté A (suivi `lastRawMutationFrame` / `counterSampleFrame`) : sauter la copie A→resolved et la passe resolve, et utiliser un bind group color alternatif préconstruit lisant A au lieu de resolved. La condition de fraîcheur garantit que `resolvedTexture` est toujours à jour au début de toute frame (les frames gatées ne mutent pas A ; les frames qui mutent A exécutent le resolve) — les snapshots frozen/merge en tête de frame lisent donc toujours un resolved frais. Par défense en profondeur et conformité spec, le gating est en plus désactivé sur les frames à `needFreezeSnapshot`/`needMergeSnapshot`.

Implémentation : les comptes étant échantillonnés toutes les `COUNTER_SAMPLE_INTERVAL_FRAMES` frames avec latence asynchrone, un readback 0/0 périmé (ex. pan juste après convergence) ne doit pas ouvrir le gate — d'où le suivi de mutation par frameSerial plutôt qu'un simple test des compteurs.

### D5 — Picking sous gating
`readIterationDataAt` lit `resolvedTexture` ; sous gating C1 elle serait périmée. Décision : lire depuis `rawTexture` quand le gating est actif (suivre un booléen `resolveSkipped` côté Engine). À convergence les contenus sont identiques.

### D6 — Flag runtime
Booléen `useInplaceCompute` (défaut : activé une fois validé ; activable/désactivable à chaud pour comparaison A/B visuelle). L'ancien chemin n'est pas supprimé dans ce change.

### D7 — Usage des textures
Ajouter `GPUTextureUsage.STORAGE_BINDING` à la création de `rawTexture` uniquement (pas B : pas d'option swap). Conserver `RENDER_ATTACHMENT`/`COPY_SRC`/`COPY_DST` existants (resolve/merge écrivent toujours en MRT, copies frozen inchangées).

## Risks / Trade-offs

- [Validation Tint stricte sur `read_write`] → vérifier l'absence d'erreur à la création du pipeline ; le flag permet le repli immédiat sur l'ancien chemin. *(Validé : aucune erreur de validation WebGPU sur Chromium.)*
- [Équivalence d'image non bit-exacte] → les compilations fragment et compute du même WGSL contractent les FMA différemment : mesuré ~0,85 % de pixels avec écarts de 1-4/255, épars le long des structures, 24 pixels > 8/255 sur 450 000, aucun motif structuré. Accepté et documenté dans la spec ; le test `tests/inplace-compute.spec.ts` encode ces bornes.
- [Divergence des workgroups : à convergence avancée un workgroup de 256 threads attend son pixel le plus lent même avec 1 seul actif] → le gain bande passante domine attendu ; mesurer au GPU timing à l'étape 1 avant de poursuivre ; compaction de liste active en suivi si besoin.
- [In-place strictement texel-local] → toute future logique voisine dans le brush devra repasser par le chemin ping-pong ; documenté en tête du nouveau shader.
- [Sémantique du compteur fusionné (timing du comptage)] → compter l'état post-itération ; valider que le contrôleur de batch adaptatif et `needsMoreFrames()` se comportent à l'identique.
- [Resolved périmée sous gating] → D4/D5 couvrent color, snapshot/merge et picking ; tout nouveau consommateur de resolved devra vérifier le flag `resolveSkipped`.
- [Chemin pan/clear doit rester exact] → tests manuels pan + zoom + clear (les trois flags du brush) avec flag on/off.

## Migration Plan

1. Chemin compute derrière flag, désactivé par défaut → validation visuelle + GPU timing.
2. Activation par défaut une fois l'équivalence confirmée.
3. Rollback : flag off (ancien chemin intact dans ce change).

## Open Questions

- Le gating C1 doit-il être lui aussi derrière le flag global ou un flag séparé ? (par défaut : même flag, simplicité)
- Mesures de référence : quelles scènes de benchmark exactes (vue convergée, shallow, deep zoom BLA, pan continu, zoom continu) — à figer au moment des mesures.
