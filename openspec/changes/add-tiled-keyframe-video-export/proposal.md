## Why

L'export vidéo garde en mémoire GPU, à la taille du carré de travail supersamplé, tout ce qui sert à *fabriquer* une frame (le champ brut ping-pong A/B, 13 à 21 couches f32) en plus de ce qui sert à *l'afficher* (les display sets resolved et frozen, 24 à 48 octets). Le champ brut représente environ les deux tiers des 176 à 324 octets par texel ; il n'est pourtant nécessaire que pendant la convergence, jamais entre deux bascules frozen/live. C'est lui qui interdit aujourd'hui les exports 4K en ×2 ou ×4 sur la plupart des GPU, alors que le résultat final n'a besoin que des display sets.

La tentative précédente (`add-tiled-video-export`) tuilait la frame en gardant le cycle frozen/live *à l'intérieur de chaque tuile*. Une tuile excentrée subit une translation pendant un zoom autour du centre global, sa source frozen sort de sa texture, et le recyclage entre frames est perdu. Cette proposition déplace le recyclage hors des tuiles : elles ne servent plus qu'à construire une image fixe.

## What Changes

- Un mode d'export « keyframe tuilée », réservé aux parcours à centre fixe, dans lequel le champ brut, le display set resolved, les compteurs et les ressources d'AA sont alloués à la taille d'une **tuile**, tandis que deux display sets complets (la keyframe courante, rôle frozen, et la keyframe suivante en construction, rôle live) restent à la taille du carré de travail.
- Le champ live du cycle frozen/live devient une keyframe **construite tuile par tuile** : pour chaque tuile, projection exacte des texels dans le carré global, convergence avec le prédicat existant, resolve, copie du rectangle dans la keyframe en construction, puis effacement du champ brut. Aucune frame n'est émise avant que la keyframe soit complète.
- À la bascule, les deux display sets complets **échangent leurs rôles** au lieu d'être copiés ; la passe couleur, le compositing min-step live/frozen, la magnification frozen et la minification live restent inchangés.
- Un planificateur déterministe choisit la taille de tuile à partir d'un budget mémoire GPU et des alignements de workgroup ; l'estimation affichée dans le panneau distingue la part à l'échelle de la tuile de la part à l'échelle du carré.
- Le mode refuse les échantillons d'AA jitterés par image (`aaSamplesPerFrame` > 1) : les frames intermédiaires sont de pures lectures, sans recalcul. Le suréchantillonnage reste l'unique anticrénelage du mode.
- Le chemin monolithique actuel est conservé pour les parcours avec travelling et lorsque le mode n'est pas choisi.

## Capabilities

### New Capabilities
- `tiled-keyframe-video-export` : construction tuile par tuile des keyframes frozen/live d'un export à centre fixe, champ brut borné à une tuile, échange de rôles des display sets, planification déterministe des tuiles, invariance du résultat au découpage et estimation mémoire associée.

### Modified Capabilities
- Aucune. Les exigences de `video-path-export` (parcours, horloge, convergence, seuil, validation `maxTextureDimension2D`, encodage) et de `progressive-render-pipeline` restent en vigueur telles quelles ; le mode tuilé s'y ajoute sans modifier leur comportement.

## Impact

- `src/Engine.ts` : allocation séparée tuile/carré en session d'export, uniformes de projection de tuile, boucle de construction d'une keyframe, échange des display sets à la bascule, prédicat `videoFrameReady` en mode keyframe, diagnostics.
- `src/assets/mandelbrot_brush.wgsl`, `reproject_cs.wgsl`, `raw_pan_clear.wgsl`, `count_unfinished.wgsl`, `aa_target.wgsl`, `aa_reseed.wgsl`, `resolve.wgsl` : origine de tuile dans le calcul des coordonnées neutres. `color.wgsl`, `merge_frozen.wgsl`, `present.wgsl` : inchangés.
- `src/videoPath.ts`, `src/videoExportPreferences.ts`, `src/components/VideoExportPanel.vue` : éligibilité du mode, budget mémoire, planificateur de tuiles, estimation en deux parts, avertissements.
- `src/videoExportRunner.ts`, `src/videoExportSession.ts` : passage du plan de tuiles à la session ; boucle de frames inchangée.
- Tests unitaires : planificateur, éligibilité, estimation ; test d'égalité non compressée monolithique/keyframe tuilée ; contrats de shaders.
- Non couvert : la limite `maxTextureDimension2D` sur le carré des display sets reste celle d'aujourd'hui (une keyframe multi-textures est une évolution ultérieure), et le travelling reste sur le chemin monolithique.
