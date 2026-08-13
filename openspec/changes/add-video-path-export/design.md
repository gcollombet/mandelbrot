## Context

Le moteur possède déjà, séparément, tout ce qu'un rendu vidéo demande :

| Brique | État | Emplacement |
|---|---|---|
| Interpolation de parcours en précision arbitraire | existe | `reference_calculus/src/lib.rs:2961` `start_transition` |
| Pas de temps injectable | existe, **privé** | `lib.rs:1207` `step_with_delta_time` |
| Oracle de convergence avec gardes de fraîcheur | existe | `Engine.ts:5967` `fullyConverged` |
| Réutilisation du calcul en pan | existe | `reproject_cs.wgsl` (décale le RAW, `-1` = à calculer) |
| Réutilisation du calcul en zoom | existe | cycle frozen/live : entre deux swaps, le RAW live n'est pas effacé |
| Rendu offscreen à taille arbitraire | existe | `Engine.ts:6300` chemin `snapshotCallback` |
| Déterminisme du RAW à convergence | **testé** | `tests/determinism.spec.ts` (invariant au batch size) |

Ce qui manque tient en trois points : une horloge de frame, un prédicat de convergence qui tolère un cycle de zoom actif, et un encodeur.

Trois sources de temps mural doivent être coupées :

```
  Date.now()  ──┐
                ├─► navigator.step()          → step_with_delta_time(1/fps)
  rAF pacing  ──┘

  Engine.this.time ──► pistes cosmétiques     → frameIndex / fps

  Date.now() dans tickTravelAnimation ──► colorStops → non exécutée en export
  (boucle rAF propre, indépendante du moteur)   (palette figée, cf. Décision 7)
```

## Goals / Non-Goals

**Goals:**
- Un même parcours rendu deux fois produit deux fichiers identiques image par image.
- Chaque frame émise est convergée : aucun pixel provisoire, aucune texture gelée sous-échantillonnée.
- Réutiliser le pipeline progressif tel quel, sans branche de rendu parallèle à maintenir.
- Le coût de calcul reste très inférieur à « une convergence complète par frame ».

**Non-Goals:**
- Timeline multi-keyframes, courbes d'easing par canal. v1 = un segment A→B, avec l'interpolation existante.
- Interpolation d'autres paramètres que `cx`/`cy`/`scale`/`angle` — la palette est explicitement exclue.
- Audio, incrustations, transitions entre segments.
- Sortie 4K en `DPR×2` (butée matérielle, voir Décision 4).
- Rendu en worker ou hors navigateur.

## Decisions

### 1. Chaque frame émise est une arrivée, mais le cycle de zoom reste vivant

Deux régimes étaient possibles :

- **(a) Arrêt complet par frame** : émettre `scaleStable` après chaque pas caméra, forcer le merge, revenir à `idle`. Convergence maximale, mais `clearHistoryNextFrame` est armé à chaque swap, donc **une convergence complète par frame émise** — 900 convergences pour 30 s.
- **(b) Cycle maintenu, prédicat assoupli** : garder l'état `reprojecting`, et retirer `isZoomActive` du prédicat de convergence.

**Retenu : (b).** Entre deux swaps, `clearHistoryNextFrame` n'est pas armé : la texture RAW live reste à échelle fixe et conserve son état. Une seule convergence sert donc toutes les frames du cycle. Le défaut de (b) — une texture gelée grossie en périphérie — est neutralisé par la Décision 2.

Le profil de coût devient une dent de scie : une frame chère tous les `N`, les autres quasi gratuites (2–3 pompes pour que le compteur `unfinished` confirme la convergence, `COUNTER_SAMPLE_INTERVAL_FRAMES` valant déjà `1`).

### 2. La contrainte `T ≤ DPR`

Sur un cycle de swap de seuil `T`, en notant `u ∈ [0,1]` l'avancement :

```
  couverture live      = T^(u-1)
  grossissement frozen = T^u
  anneau frozen        = 1 - T^(u-1)

  u=0.5, T=16  →  frozen ×4.0   sur 75 %  de l'écran   ← temps réel actuel
  u=0.5, T=2   →  frozen ×1.41  sur 29 %  de l'écran
  u=0.9, T=2   →  frozen ×1.87  sur 6.7 % de l'écran
```

Pour que la zone gelée ne soit jamais sous-échantillonnée par rapport à la sortie, il faut `DPR ≥ T`. Le suréchantillonnage n'est donc pas un confort à côté du seuil : **c'est ce qui paye le seuil**.

Le nombre de frames par convergence complète, à `fps` images/s et `O` octaves de zoom par seconde :

```
  N = fps · log₂(T) / O
```

| `T` | `DPR` requis | `N` (30 fps, 1 oct/s) | régime |
|---|---|---|---|
| 16 | 16 ✗ | 120 | temps réel actuel (mou) |
| **2** | **2** | **30** | **retenu** |
| 1.5 | 1.5 | 18 | repli si mémoire contrainte |
| 1.02 | ~1 | 1 | équivalent au régime (a) |

À `T = 2`, le `DPR×2` coûte 4× de pixels par convergence mais divise par 30 le nombre de convergences.

> À vérifier au premier jalon : la valeur actuelle est `zoomMagnificationThreshold = 16.0` alors que son commentaire annonce « default ×2 » (`Engine.ts:1229`). L'écart est probablement la cause de la mollesse périphérique en zoom temps réel, mais ce n'est pas l'objet de ce changement : ne pas modifier le défaut temps réel ici.

### 3. `videoFrameReady()` = `fullyConverged` moins un terme

`fullyConverged` (`Engine.ts:5967`) porte déjà les trois gardes de fraîcheur qui empêchent de capturer une image sur un compteur périmé :

```
  counterSampleFrame >= lastRawMutationFrame        le compteur est postérieur
                                                    à la dernière mutation du RAW
  hasPendingCounterReadbackForCurrentGeneration()   aucun readback en vol
  isDisplaySetCurrent(rawFieldVersion, …)           le display reflète le champ
```

Le mode export réutilise ce prédicat en retirant le seul terme `isZoomActive`. C'est une extraction de fonction, pas une nouvelle logique — ce qui écarte le mode de défaillance le plus coûteux du dossier : des frames non convergées, invisibles au test unitaire et fatales sur un rendu long.

Le seuil de tolérance reste `UNFINISHED_PIXEL_DONE_THRESHOLD = 10` (le code documente que quelques pixels peuvent traîner indéfiniment près des limites numériques). Un plafond de pompes par frame reste nécessaire comme garde-fou ; à son dépassement, l'export **échoue explicitement** plutôt que d'émettre une image douteuse.

### 4. La butée n'est pas la mémoire, c'est `maxTextureDimension2D`

Toutes les textures de travail sont des carrés de côté `neutralSize = ceil(sqrt(w² + h²))` — la diagonale, pour couvrir la rotation.

| sortie | DPR | rendu | `neutralSize` | limite 8192 |
|---|---|---|---|---|
| 1080p | ×2 | 3840×2160 | 4407 | ✅ |
| 1440p | ×2 | 5120×2880 | 5875 | ✅ |
| 4K | ×1.5 | 5760×3240 | 6609 | ✅ |
| 4K | ×2 | 7680×4320 | 8813 | ❌ |

La mémoire n'est pas bloquante : 1080p en `DPR×2` correspond à un rendu 3840×2160, déjà supporté en temps réel. Le mode export ne rajoute que le buffer de capture et les `VideoFrame` en vol.

`resize()` clampe `this.width`/`this.height` à `maxTextureDimension2D` mais calcule `neutralSize` ensuite sans le clamper : la combinaison 4K + `DPR×2` fait échouer `createTexture` au lieu de dégrader. Ce changement **valide en amont** la combinaison résolution×DPR et refuse celles qui dépassent ; corriger le clamp lui-même est hors périmètre.

### 5. Boucle `await` pure sur le thread principal

`startRenderLoop()` n'est pas utilisé en export : la boucle appelle `draw()` directement, ce qui contourne `advanceFramePacer` sans le modifier.

```
pour n = 0 … N-1 :
    caméra ← step_with_delta_time(1/fps)
    tant que !videoFrameReady() et pompes < plafond :
        await draw()
    capture → réduction linéaire → sRGB → VideoFrame → encoder
```

Trois asservissements temps réel à neutraliser :

| Mécanisme | Traitement |
|---|---|
| rAF + `advanceFramePacer` | contourné : on n'entre jamais dans `_loop()` |
| `iterationBatchController` (vise `engine.targetFps`) | `targetFps` au plancher ⇒ gros batches. Levier déjà exercé par `determinism.spec.ts` (bascule 120 ↔ 15) |
| `aaAuto` | désactivé. Il ne se déclencherait jamais (`isZoomActive` reste vrai) ; le `DPR×2` le remplace pour ~1/30 du coût |

**Alternatives écartées.** Worker + `OffscreenCanvas` : réaliste (l'`Engine` ne touche le DOM qu'à deux endroits — `window.devicePixelRatio` et le `document.createElement` du chemin snapshot, remplacé ici de toute façon) mais coûte un refactor sans bénéfice v1. Script Playwright piloté : le harnais existe déjà (`__mandelbrotEngine`, `waitForConverged`, flags WebGPU) et resterait la meilleure option pour des rendus non surveillés, à garder en réserve si la boucle ne survit pas à un onglet en arrière-plan.

### 6. WebCodecs, et réduction en lumière linéaire

`MediaRecorder` + `captureStream()` est écarté : son horloge est murale, donc une frame mettant 8 s à converger produirait une image de 8 s. `VideoEncoder` accepte les frames aussi lentement qu'on les produit et laisse fixer les timestamps.

Le chemin de capture existant (`copyTextureToBuffer` → `ImageData` → PNG) est remplacé par un `VideoFrame` construit directement sur le buffer mappé, via `layout: [{ offset: 0, stride: bytesPerRow }]` qui absorbe l'alignement 256.

L'ordre des opérations n'est pas négociable :

```
  ✅  accum (linéaire) ──► box 2×2 (linéaire) ──► sRGB ──► VideoFrame
  ❌  accum (linéaire) ──► sRGB ──► box 2×2 ──► VideoFrame
                                    └─ bords assombris, dégradés sales
```

`present.wgsl` porte la conversion linéaire→sRGB en fin de chaîne ; le filtre de réduction s'insère avant elle. Un box 2×2 écrit explicitement est préféré à un sampler bilinéaire : à ratio exactement 2:1, le bilinéaire n'équivaut à une moyenne 4 taps que si l'offset d'échantillonnage est exact.

`colorSpace` doit être déclaré dans le `VideoEncoderConfig` (BT.709), faute de quoi le film sort délavé ou trop contrasté selon le lecteur — et cela ne se découvre qu'après le rendu.

### 7. Parcours v1 : un segment, un seul canal interpolé

Le voyage temps réel (`startTravelToPreset`) interpole les `colorStops` et **snape tout le reste à `t = 1`**, avec un échange de texture/skybox à `t = 0.5`. Acceptable en interactif, inacceptable en vidéo : cela produirait un saut visible sur une image.

v1 n'interpole que la caméra — `cx`/`cy`/`scale`/`angle`, via la transition du navigateur. **La palette est explicitement exclue** : les `colorStops` doivent être identiques entre A et B, et `tickTravelAnimation` n'est pas exécutée pendant un export.

Trois raisons de fermer ce canal plutôt que de le porter sur l'horloge de frame :

- Interpoler des `colorStops` suppose une correspondance stop à stop entre deux palettes. Elle n'existe que si les palettes ont même cardinalité et même ordre ; `interpolateColorStops` produit sinon un résultat qui n'a de sens à aucune des deux extrémités.
- Une palette qui dérive pendant un zoom rend impossible d'attribuer un changement visuel à la géométrie ou à la couleur — c'est le premier outil de diagnostic qu'on veut garder sur un rendu long.
- Le besoin d'animer la couleur reste couvert : la piste cosmétique `paletteOffset` de l'`animation-mixer` anime le décalage sur une palette fixe, et elle passe déjà sur l'horloge de frame (Décision : source de temps injectable).

Tout paramètre divergent entre A et B, palette comprise, fait **refuser l'export** avec la liste des divergences. Mieux vaut un refus lisible qu'un artefact découvert après deux heures de rendu.

## Risks / Trade-offs

- **La boucle `await` est throttlée dans un onglet en arrière-plan** → Son seul `await` bloquant est `queue.onSubmittedWorkDone()`, résolu par le process GPU et non par un timer, donc elle pourrait tourner à pleine vitesse. Non vérifié. Spike de vingt lignes en tout premier jalon : si le résultat est négatif, Wake Lock + consigne explicite, et le script Playwright remonte au rang de plan B.

- **Le budget de références domine le rendu** → À `T = 2` et 1 oct/s, ~30 convergences pour 30 s de film ; à ~4,5 s par construction de référence à froid, la référence pèserait plus que tout le reste. Le parcours étant connu à l'avance, elles sont pré-chauffables (avec une frame d'avance, voire toutes en amont). À mesurer avant d'optimiser : c'est la seule optimisation du dossier inaccessible au mode interactif.

- **Non-déterminisme résiduel entre exécutions** → `determinism.spec.ts` garantit le RAW à convergence, invariant au batch size. La chaîne aval (resolve, couleur, réduction, encodage) n'est pas couverte. Un test comparant deux exports courts image par image est nécessaire, et c'est aussi le test qui détecte une frame émise avant convergence.

- **Le pic de coût au swap** → Une frame sur `N` coûte une convergence complète ; les autres coûtent trois pompes. Sans effet sur le fichier produit, mais la barre de progression doit être pilotée par les frames émises et non par le temps écoulé, sinon elle sautera.

- **Deux boutons interagissent (`T` et `DPR`)** → Un utilisateur qui abaisse `DPR` pour aller plus vite dégrade silencieusement la périphérie si `T` ne suit pas. `T ≤ DPR` doit être imposé par l'UI, pas documenté.

## Migration Plan

Aucun changement de comportement en temps réel. Tout est derrière un mode d'export explicite : le prédicat extrait est utilisé à l'identique par `needsMoreFrames()`, `zoomMagnificationThreshold` garde son défaut, et la source de temps des pistes reste l'horloge murale hors export. Le repli est la désactivation de l'entrée d'UI.

Ordre d'implémentation : spike d'arrière-plan → horloge déterministe → prédicat + boucle → capture et réduction linéaire → encodage → UI.

## Open Questions

- La boucle `await` survit-elle à un onglet caché ? (spike, jalon 1)
- Quel est le coût réel des resets de référence sur un parcours représentatif ? Le pré-chauffage est-il nécessaire en v1 ou reportable ?
- Codec et conteneur : mp4/avc1 (compatibilité maximale) ou webm/vp9 (pas de question de licence) ? Le choix du muxer en découle.
- Que faire d'une frame qui atteint le plafond de pompes : échouer l'export, ou l'émettre en marquant le rapport ? Le design retient l'échec ; à confirmer à l'usage.
