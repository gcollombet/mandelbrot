## Why

L'application ne sait produire qu'une image fixe (`snapshotCallback`) ou du temps réel, dont la qualité est bornée par le budget de 16 ms : en zoom, le seuil de swap frozen/live vaut `16.0`, donc la périphérie de l'écran est affichée à partir d'une texture gelée grossie jusqu'à ×4 sur 75 % de la surface. Un parcours filmé n'a pas de contrainte de latence : il peut attendre la convergence complète de chaque image et n'émettre que des frames propres.

Toutes les briques nécessaires existent déjà séparément — interpolation de parcours à précision arbitraire (`start_transition`), oracle de convergence avec gardes de fraîcheur (`fullyConverged`), réutilisation de calcul entre frames (cycle frozen/live), rendu offscreen à résolution arbitraire. Il manque une horloge déterministe et un pilote qui les assemble.

## What Changes

- **Nouveau mode d'export vidéo** : définition d'un parcours entre deux positions caméra épinglées et rendu image par image vers un fichier MP4, piloté par un index de frame et non par l'horloge murale.
- **Horloge déterministe** : nouvelle entrée wasm `step_at_transition_time(cw, ch, elapsed)` qui place la transition à un temps **absolu** ; la frame `n` passe `n / fps`, et les pistes cosmétiques de l'`animation-mixer` lisent le même temps `frameIndex / fps` au lieu de `this.time`.
- **Prédicat de convergence vidéo** : extraction de `fullyConverged` (`Engine.ts:5967`) en un prédicat réutilisable, et variante d'export qui en retire le seul terme `isZoomActive` — le cycle frozen/live restant volontairement actif en permanence.
- **Seuil de bascule et suréchantillonnage paramétrables par session, et indépendants** : le seuil (2 à 32) gouverne la fréquence des reconvergences, le suréchantillonnage la densité d'échantillonnage. Un seuil supérieur au suréchantillonnage est signalé, pas refusé. La surface de calcul est épinglée à `sortie × ss` pendant l'export, sans quoi la qualité dépendrait de la fenêtre et non du film.
- **Chaîne de capture** : rendu offscreen **linéaire** à `sortie × ss`, réduction box `ss×ss` **en lumière linéaire** avant l'encodage sRGB, puis `VideoFrame` → WebCodecs → conteneur MP4 (codec au choix, AV1 par défaut).
- **Boucle de rendu dédiée** : en mode export, `startRenderLoop()` n'est pas utilisé ; une boucle `await` pure appelle `draw()` jusqu'à convergence, ce qui neutralise de fait le cadenceur `advanceFramePacer`. Le contrôleur de batch est mis au plancher et `aaAuto` est désactivé pour toute la session (le suréchantillonnage le remplace pour ~1/30 du coût).
- **Portée v1 volontairement close** : un parcours est **deux positions caméra et une durée**, capturées de la même façon depuis la vue courante. Le film garde l'apparence courante du début à la fin — rien ne saute, puisque rien d'autre que la caméra ne bouge, et il n'y a aucun second jeu de paramètres à réconcilier. Seule la piste cosmétique `paletteOffset` de l'`animation-mixer` peut animer le décalage sur une palette fixe.

## Capabilities

### New Capabilities
- `video-path-export`: définition et validation d'un parcours, cycle de vie d'une session d'export (démarrage, progression, annulation, erreurs), horloge déterministe par frame, réglages de sortie (résolution, fps, suréchantillonnage, seuil de bascule, codec), chaîne de capture et d'encodage, gestion de la lumière linéaire et de l'espace colorimétrique.

### Modified Capabilities
- `progressive-render-pipeline`: le gating de convergence est extrait en prédicat réutilisable et gagne une variante d'export qui ignore `isZoomActive` ; le seuil de magnification frozen/live devient un paramètre de session au lieu d'une constante.
- `animation-mixer`: la source de temps des pistes devient injectable — horloge murale en temps réel, index de frame en export — pour que le rendu soit reproductible.

## Impact

- `src/Engine.ts` — extraction du prédicat de convergence, mode export (boucle, seuil, batch, `aaAuto`), remplacement du chemin `snapshotCallback` par une capture `VideoFrame`, réduction en lumière linéaire.
- `src/assets/present.wgsl` — insertion du filtre de réduction avant la conversion linéaire→sRGB.
- `reference_calculus/src/lib.rs` — `step_at_transition_time` et `reset_step_clock` exposées à wasm ; reconstruction du paquet wasm.
- `src/components/Mandelbrot.vue` — `draw()` doit pouvoir être appelée hors boucle rAF à un temps de parcours imposé (`setExportTime`).
- `src/components/MandelbrotViewer.vue` — `tickTravelAnimation` interpole les `colorStops` sur sa propre boucle rAF cadencée par `Date.now()`, indépendante du moteur : elle ne doit pas tourner pendant un export, qui pilote la transition du navigateur directement.
- `src/AnimationConfig.ts` / consommateurs — source de temps injectable (`Engine.animationTimeOverride`).
- `src/keyboardShortcuts.ts`, `src/components/Settings.vue`, `src/components/MandelbrotViewer.vue` — onglet **Vidéo (K)** et passage du contrôleur à `Settings`.
- Nouvelle dépendance : `mediabunny` (MPL-2.0) comme muxer MP4, WebCodecs ne produisant que des chunks encodés.
- Limite matérielle : `neutralSize = ceil(sqrt(w² + h²))` plafonne la combinaison résolution × suréchantillonnage. 1080p (4406²) et 1440p (5875²) passent en ×2 ; une sortie 4K en ×2 demanderait 8812² et dépasse la limite usuelle de 8192.
