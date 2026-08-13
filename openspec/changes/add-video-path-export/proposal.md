## Why

L'application ne sait produire qu'une image fixe (`snapshotCallback`) ou du temps réel, dont la qualité est bornée par le budget de 16 ms : en zoom, le seuil de swap frozen/live vaut `16.0`, donc la périphérie de l'écran est affichée à partir d'une texture gelée grossie jusqu'à ×4 sur 75 % de la surface. Un parcours filmé n'a pas de contrainte de latence : il peut attendre la convergence complète de chaque image et n'émettre que des frames propres.

Toutes les briques nécessaires existent déjà séparément — interpolation de parcours à précision arbitraire (`start_transition`), oracle de convergence avec gardes de fraîcheur (`fullyConverged`), réutilisation de calcul entre frames (cycle frozen/live), rendu offscreen à résolution arbitraire. Il manque une horloge déterministe et un pilote qui les assemble.

## What Changes

- **Nouveau mode d'export vidéo** : définition d'un parcours A→B (centre, échelle, angle, palette) et rendu image par image vers un fichier vidéo, piloté par un compteur de frames et non par l'horloge murale.
- **Horloge déterministe** : exposition de `step_with_delta_time` en wasm (la fonction existe déjà, elle est privée) ; en mode export, le navigateur avance de `1/fps` exactement par frame émise, et les pistes cosmétiques de l'`animation-mixer` lisent le même temps `frameIndex / fps` au lieu de `this.time`.
- **Prédicat de convergence vidéo** : extraction de `fullyConverged` (`Engine.ts:5967`) en un prédicat réutilisable, et variante d'export qui en retire le seul terme `isZoomActive` — le cycle frozen/live restant volontairement actif en permanence.
- **Seuil de swap et suréchantillonnage paramétrables par session** : `zoomMagnificationThreshold` abaissé à `T` et rendu à `DPR = T` (contrainte `T ≤ DPR`), de sorte que la texture gelée ne soit jamais sous-échantillonnée par rapport à la sortie. À `T = 2`, une convergence complète sert environ 30 frames consécutives.
- **Chaîne de capture** : rendu offscreen à `DPR×2`, réduction 2×2 **en lumière linéaire** avant l'encodage sRGB, puis `VideoFrame` → `VideoEncoder` (WebCodecs) → conteneur mp4/webm.
- **Boucle de rendu dédiée** : en mode export, `startRenderLoop()` n'est pas utilisé ; une boucle `await` pure appelle `draw()` jusqu'à convergence, ce qui neutralise de fait le cadenceur `advanceFramePacer`. Le contrôleur de batch est mis au plancher et `aaAuto` est désactivé (le suréchantillonnage par `DPR×2` le remplace pour ~1/30 du coût).
- **Portée v1 volontairement close** : un parcours n'interpole que `cx`/`cy`/`scale`/`angle`. Tout le reste — palette comprise — doit être identique aux deux extrémités ; sinon l'export est refusé avec la liste des divergences, plutôt que de produire un saut visible à `t = 1` comme le fait le voyage temps réel actuel. La palette n'est donc pas un canal de parcours ; seule la piste cosmétique `paletteOffset` de l'`animation-mixer` continue de pouvoir animer le décalage sur une palette fixe.

## Capabilities

### New Capabilities
- `video-path-export`: définition et validation d'un parcours, cycle de vie d'une session d'export (démarrage, progression, annulation, erreurs), horloge déterministe par frame, réglages de sortie (résolution, fps, `T`/`DPR`, codec), chaîne de capture et d'encodage, gestion de la lumière linéaire et de l'espace colorimétrique.

### Modified Capabilities
- `progressive-render-pipeline`: le gating de convergence gagne une variante d'export qui ignore `isZoomActive`, et le seuil de magnification frozen/live devient un paramètre de session au lieu d'une constante.
- `animation-mixer`: la source de temps des pistes devient injectable — horloge murale en temps réel, index de frame en export — pour que le rendu soit reproductible.

## Impact

- `src/Engine.ts` — extraction du prédicat de convergence, mode export (boucle, seuil, batch, `aaAuto`), remplacement du chemin `snapshotCallback` par une capture `VideoFrame`, réduction en lumière linéaire.
- `src/assets/present.wgsl` — insertion du filtre de réduction avant la conversion linéaire→sRGB.
- `reference_calculus/src/lib.rs` — `step_with_delta_time` exposée à wasm ; reconstruction du paquet wasm.
- `src/components/Mandelbrot.vue` — `draw()` doit pouvoir être appelée hors boucle rAF avec un `dt` imposé.
- `src/components/MandelbrotViewer.vue` — `tickTravelAnimation` interpole les `colorStops` sur sa propre boucle rAF cadencée par `Date.now()`, indépendante du moteur : elle ne doit pas tourner pendant un export, qui pilote la transition du navigateur directement.
- `src/AnimationConfig.ts` / consommateurs — source de temps injectable.
- Nouvelle dépendance : un muxer JS (`mp4-muxer` ou équivalent), WebCodecs ne produisant que des chunks encodés.
- Limite matérielle : `neutralSize = ceil(sqrt(w² + h²))` plafonne la combinaison résolution×DPR. 1080p et 1440p passent en `DPR×2` ; une sortie 4K plafonne à `DPR×1.5`.
