## Context

L'export vidéo repose sur le cycle frozen/live de `zoomState.ts` : à chaque bascule, le display set resolved (le champ live convergé à `liveScale`) est copié dans le display set frozen, le champ brut est effacé et reconvergé à la nouvelle `liveScale` ; les frames du cycle sont ensuite composées par `color.wgsl` à partir de la source frozen magnifiée (`zoomFactor`) et de la source live minifiée (`liveZoomFactor`), avec sélection min-step. `videoFrameReady` exige que le champ live soit convergé, donc toutes les frames d'un cycle sont émises sans pump une fois la convergence de bascule payée.

Tout cela est alloué à la taille du carré de travail `ceil(sqrt(w² + h²))` multiplié par le suréchantillonnage. Par texel de ce carré, en configuration de base :

- textures brutes A et B : 2 × 13 couches r32float = 104 octets ;
- display set resolved : 3 valeurs r32float + géométrie rgba16float + métadonnées r32uint = 24 octets ;
- display set frozen : 24 octets ;
- scratch de merge : 12 octets ; cible couleur de rotation : 8 octets ; cible d'AA analytique : 4 octets.

Soit environ 176 octets, jusqu'à 324 avec gradients d'orbite et orbit traps (`WORKING_BYTES_PER_TEXEL`). Le champ brut pèse les deux tiers et n'est utile que pendant la convergence.

La tentative `add-tiled-video-export` gardait le cycle frozen/live dans chaque tuile, en ordre tuile-majoritaire. Une tuile excentrée voit sa source frozen glisser vers le centre pendant le zoom, hors de sa propre texture ; il fallait une enveloppe temporelle, un seuil abaissé, et le recyclage disparaissait. Le rejet de l'ordre frame-majoritaire dans ce design reposait sur la sauvegarde de « l'ensemble du champ GPU » entre frames, c'est-à-dire du champ brut. Le présent design ne sauvegarde que les display sets.

## Goals / Non-Goals

**Goals:**

- Ramener les ressources résidentes à l'échelle du carré de travail aux deux display sets de keyframe et à la cible couleur, soit environ 56 octets par texel contre 176 en configuration de base, un facteur 3.
- Rendre la taille du champ brut indépendante de la frame : une tuile, dimensionnée par un budget mémoire.
- Conserver à l'identique la composition frozen/live, la passe couleur, le present downscale, le seuil de bascule et le prédicat de convergence.
- Garantir l'invariance du résultat non compressé au découpage.
- Garder la référence orbitale, l'orbite et les tables chaudes pendant toute la construction d'une keyframe.

**Non-Goals:**

- Lever la limite `maxTextureDimension2D` sur le carré des display sets ; une keyframe répartie sur plusieurs textures est une évolution ultérieure.
- Réduire le calcul : une keyframe coûte exactement une convergence complète du carré, comme aujourd'hui.
- Supporter le travelling en mode tuilé ; il reste sur le chemin monolithique.
- Offrir l'AA jitteré par image en mode tuilé.
- Modifier le format des presets ou le contrat de l'encodeur.

## Decisions

### 1. Le recyclage temporel vit dans les keyframes complètes, pas dans les tuiles

Les deux display sets restent à la taille du carré : l'un joue le rôle frozen (keyframe courante), l'autre le rôle live (keyframe suivante, en construction). Les tuiles n'ont aucun état d'une frame à l'autre : une tuile est effacée, convergée, copiée, oubliée.

C'est ce qui dissout le problème de translation : la source frozen d'un pixel périphérique se trouve plus près du centre, mais dans une image complète, donc toujours disponible. Aucune enveloppe, aucun seuil abaissé.

Alternative écartée : l'ordre tuile-majoritaire de `add-tiled-video-export`, qui exigeait un état frozen par tuile.

### 2. Les rôles s'échangent, les textures ne se copient pas

Aujourd'hui `copyResolvedToFrozen` copie le display set complet. En mode tuilé, l'effet devient un échange des liaisons : la keyframe complète devient la source frozen des bind groups de `color.wgsl`, l'ancienne frozen devient la cible des copies de tuiles. Les bind groups couleur sont reconstruits à la bascule, ce que l'engine fait déjà lors d'un changement de display set.

Alternative écartée : conserver la copie ; elle coûte une lecture-écriture du carré par bascule et impose une troisième texture transitoire.

### 3. Le display set resolved reste à la taille de la tuile et se copie dans la keyframe

Le resolve continue de lire le champ brut de tuile et d'écrire un display set resolved de tuile ; une `copyTextureToTexture` par texture du set place ensuite le rectangle à son origine dans la keyframe. C'est le chemin le moins intrusif : le resolve, ses bind groups et ses vues ne changent pas.

Alternative envisagée pour plus tard : écrire le resolve directement dans la keyframe via viewport et scissor, ce qui économiserait le resolved de tuile (24 octets par texel de tuile).

### 4. La projection de tuile est une origine ajoutée aux coordonnées neutres

Le brush calcule aujourd'hui `uv = (gid + 0.5) / dims` sur le carré entier. En mode tuilé, `dims` reste le côté du carré et le texel est `tileOrigin + gid`. Les uniformes reçoivent `tileOriginX/Y` et `neutralSide` ; `is_inside_rotated_screen`, le domaine de référence et `viewportAspect` travaillent donc sur le carré complet, inchangés. Les passes qui parcourent le champ brut (reprojection, effacement, comptage, cible et reseed d'AA, resolve) reçoivent la même origine.

`dispatchOriginX/Y` garde son rôle actuel de boîte englobante du viewport tourné, désormais intersectée avec la tuile.

Alternative écartée : déplacer la caméra au centre de chaque tuile ; cela ferait dépendre les recentrages de référence du découpage.

### 5. La construction d'une keyframe est pilotée par l'engine, à l'intérieur de `copyResolvedToFrozen`

Quand la machine d'état émet `copyResolvedToFrozen` en session tuilée, l'engine échange les rôles puis entre dans une boucle de construction : pour chaque tuile du plan, positionner l'origine, stamper les sentinelles, pomper le rendu jusqu'à `isFieldConverged`, exécuter le resolve, copier le rectangle, marquer la tuile faite. `videoFrameReady` renvoie `toutes les tuiles copiées`. Le runner et `videoExportSession.ts` ne changent pas : ils pompent `drawOnce` jusqu'à `videoFrameReady`, comme aujourd'hui.

Le compteur `unfinishedPixelCount` reste local à la tuile ; le prédicat existant s'applique tel quel à la tuile courante.

### 6. Un planificateur pur choisit la tuile

À partir du budget mémoire, du côté du carré, de l'alignement de workgroup et d'une estimation par texel fournie par le moteur (octets par texel du carré pour les keyframes, octets par texel de tuile pour le reste), le planificateur retient le plus grand côté de tuile aligné qui tient dans le budget, puis partitionne le carré. Une seule tuile égale au carré reproduit exactement le chemin monolithique, ce qui sert de test d'équivalence.

### 7. Emprise de construction et rotation

Le brush ne calcule que les texels de `is_inside_rotated_screen`. Une keyframe sert toutes les frames d'un cycle ; si l'angle varie, l'emprise est l'union des viewports tournés sur l'intervalle d'angles du cycle, obtenu du parcours. Pour un angle constant, rien ne change. L'engine reçoit l'intervalle d'angles du cycle en début de construction.

### 8. Éligibilité

Le mode est proposé quand `cx` et `cy` sont identiques en A et en B et que `aaSamplesPerFrame` vaut 1. Il est choisi explicitement par l'utilisateur ; la sélection automatique lorsque l'estimation monolithique dépasse le budget est un second temps, une fois le mode validé visuellement.

## Risks / Trade-offs

- **Un état par tuile survit à l'effacement** (compteurs, readbacks en vol, accumulation AA, `frozenPanShift`) → réinitialiser explicitement tout état lié au champ brut au changement de tuile ; test ciblé sur deux tuiles consécutives.
- **Un texel de frontière diffère du monolithique** (arrondi de `uv`, boîte de dispatch) → calcul de `uv` à partir de l'indice global entier, test bit à bit sur des tuiles adjacentes.
- **La rotation lit un texel non calculé** → emprise union des angles ; test d'absence de sentinelle lue par la passe couleur sur un parcours tournant.
- **Les bind groups couleur reconstruits à chaque bascule coûtent** → une bascule par facteur de seuil, coût négligeable devant une convergence.
- **Le budget est trop serré pour les keyframes elles-mêmes** → le planificateur refuse et le panneau indique le minimum.
- **Le gain est confondu avec une levée de la limite de dimension** → l'interface conserve le refus `maxTextureDimension2D` et son message actuel.

## Migration Plan

1. Planificateur, estimation en deux parts et éligibilité, sans GPU, avec tests.
2. Origine de tuile dans les shaders et les uniformes, tuile unique égale au carré : équivalence bit à bit avec le chemin actuel.
3. Allocation séparée tuile/carré en session d'export et échange de rôles à la bascule.
4. Boucle de construction tuile par tuile et prédicat `videoFrameReady`.
5. Panneau, préférences, diagnostics.
6. Validation WebGPU réelle : égalité monolithique/tuilé, bandes de frontière, mesure mémoire.

Rollback : ne pas sélectionner le mode ; le chemin monolithique est intact.

## Open Questions

- Le resolve doit-il écrire directement dans la keyframe dès la première version pour économiser le resolved de tuile ?
- Quel alignement de tuile minimal (8, 16, 32 texels) évite toute divergence de dispatch avec le monolithique ?
- Faut-il exposer le budget mémoire en Mio ou dériver la tuile d'un nombre de tuiles choisi (1, 4, 16) ?
