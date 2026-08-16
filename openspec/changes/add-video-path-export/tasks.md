## 1. Spikes préalables

- [x] 1.1 Mesurer si une boucle `await` pure (sans rAF, dont le seul point bloquant est `queue.onSubmittedWorkDone()`) continue de tourner à pleine vitesse dans un onglet en arrière-plan ; consigner le verdict dans `design.md` (Open Questions) — **verdict positif** : 12 064 Hz pour la barrière GPU et 4 105 Hz pour `mapAsync` en onglet masqué, contre 0 Hz pour rAF et 2,5 Hz pour `setTimeout(0)`
- [x] 1.2 Si le verdict est négatif, décider et consigner le repli retenu : Wake Lock + onglet au premier plan, ou bascule vers le script Playwright piloté — **sans objet**, le verdict de 1.1 étant positif ; aucun repli n'est retenu en v1
> 1.3 a été déplacée en 4.6 : la mesure suppose de faire avancer la caméra par pas exacts, donc `step_with_delta_time` exposée (2.1) et la boucle d'export (4.2). La faire ici imposerait un pilote jetable dont le résultat ne vaudrait pas celui de la vraie boucle.

## 2. Horloge déterministe

- [x] 2.1 Exposer une entrée déterministe à wasm dans `reference_calculus/src/lib.rs` — **`step_at_transition_time(cw, ch, elapsed)`**, à temps absolu et non par accumulation de delta (cf. Décision 8 : sommer `1/fps` échoue à 30 fps / 0,5 s), plus `reset_step_clock`
- [x] 2.2 Tests Rust : atterrissage exact sur B pour 8 combinaisons fps × durée (dont 30 s à 900 frames), reproductibilité, indépendance à l'ordre de production, et clamp des entrées non finies ou négatives — 4 tests, suite complète à 223 passés
- [x] 2.2b Reconstruire le paquet wasm (`wasm-pack build`) et vérifier que `step_at_transition_time` est exposée côté JS — exposée dans `mandelbrot.d.ts`, testée en vivo dans l'app : atterrissage exact sur B, et frames identiques entre exécutions à navigateur chaud (chauffe de précision au premier passage profond consignée en Risks)
- [x] 2.3 Rendre la source de temps des pistes d'animation injectable — `Engine.animationTimeOverride` écrit dans `this.time` (source unique, aucun site de lecture ne peut manquer l'override) ; `null` = temps réel inchangé
- [x] 2.4 Garantir que `tickTravelAnimation` (`MandelbrotViewer.vue`) ne s'exécute pas pendant un export : la session pilote la transition du navigateur directement, la palette reste celle de A et aucune boucle rAF cadencée par `Date.now()` ne mute `colorStops`
- [x] 2.5 Permettre l'appel de `draw()` (`Mandelbrot.vue`) hors boucle rAF à un temps de parcours imposé — `setExportTime()` pilote caméra et horloge d'animation d'un seul appel ; `drawOnce()` existait déjà ; idempotence vérifiée en vivo

## 3. Prédicat de convergence

- [x] 3.1 Extraire `fullyConverged` en un prédicat nommé réutilisable — module pur `src/fieldConvergence.ts` (patron de `zoomState.ts`), qui possède aussi `UNFINISHED_PIXEL_DONE_THRESHOLD`
- [x] 3.2 Faire consommer ce prédicat par le déclenchement de l'AA automatique et la capture d'échantillon — **`needsMoreFrames()` EXCLUE délibérément** : y inclure la garde de fraîcheur provoquerait un livelock (un readback est planifié à chaque frame rendue, donc chaque frame justifierait la suivante). Spec corrigée, raison commentée dans le code. Playwright `visual.spec.ts` 6/6
- [x] 3.3 Ajouter la variante d'export omettant le seul terme `isZoomActive` — `Engine.videoFrameReady()`, plus `isViewFullyConverged()` pour les tests
- [x] 3.4 Tests unitaires du prédicat : 15 tests, dont une équivalence exhaustive sur les 128 combinaisons d'état vérifiant que `ignoreZoomCycle` est la SEULE différence entre les deux portes

## 4. Session d'export et boucle de rendu

- [x] 4.1 Rendre `zoomMagnificationThreshold` réglable pour la durée d'une session et restitué en sortie — `beginVideoExportSession` / `endVideoExportSession`, refus d'une seconde session concurrente ; la surface de calcul est épinglée à `sortie × ss` pour que la qualité dépende du film et non de la fenêtre
- [x] 4.2 Implémenter la boucle `await` d'export — module pur `src/videoExportSession.ts` (24 tests) : placement absolu, pompage jusqu'au prédicat, `VideoExportFrameTimeout` portant l'index, annulation, et libération de l'horloge sur **tous** les chemins de sortie
- [x] 4.3 Neutraliser les asservissements temps réel pendant la session — `targetFps` au plancher, `aaAuto` supprimé **à chaque `update()`** (et non une seule fois : la ligne le réécrivait depuis les props), `startRenderLoop()` non utilisé par la boucle
- [x] 4.4 Cycle de vie de session — progression et annulation câblées du panneau à la boucle ; `endVideoExportSession` restitue seuil, surface épinglée, `targetFps`, `aaAuto` et horloge d'animation, appelé depuis un `finally` ; le runner pose explicitement origine/échelle/angle avant `start_transition` plutôt que d'hériter de l'état interactif
- [x] 4.5 Mesure du gain frozen/live sur la boucle réelle — zoom de **6 octaves, 48 images en 7,3 s : 114 pompes (2,4/image) dont 16 images totalement gratuites**, médiane 97 ms/image. Le cycle sert bien plusieurs images par convergence. Verrouillé par `totalPumps < frames × 4` dans `tests/video-export-loop.spec.ts`
- [ ] 4.6 (ex-1.3) Instrumenter un parcours représentatif (30 s, ~1 octave/s) avec la boucle réelle pour mesurer le nombre de resets de référence et leur coût cumulé ; trancher si le pré-chauffage est nécessaire en v1

## 5. Parcours

- [x] 5.1 Définir le modèle de parcours — **deux positions caméra et une durée** (`src/videoPath.ts`), types `VideoPathLocation` / `VideoPathSpec` / `VideoOutputSpec`
- [x] 5.2 Validation : durées non finies ou négatives refusées, coordonnées absentes ou non numériques nommées par extrémité, échelles hors portée du `f64` acceptées telles quelles (jamais converties en nombre)
- [x] 5.3 Validation résolution × supersampling contre `maxTextureDimension2D`, avant toute allocation — le message nomme la taille requise et la limite. **Chiffres corrigés** : 3840×2160 → 4406 (pas 4407), 7680×4320 → 8812 (pas 8813)
- [x] 5.4 Seuil de bascule **indépendant** du suréchantillonnage, réglable de 2 à 32 — le couplage `T ≤ ss` que j'avais imposé interdisait les configurations rapides ; devenu un avertissement (`describeOutputWarnings`) qui énonce l'arbitrage au lieu de le trancher

## 6. Capture et réduction

- [x] 6.1 Insérer le filtre de réduction avant la conversion linéaire→sRGB de `present.wgsl` — constante `override DOWNSCALE` (un seul shader, deux pipelines) plutôt qu'un shader de capture dupliquant `linear_to_sRGB` ; box explicite, normalisation par texel avant moyenne ; 6 tests de contrat
- [x] 6.2 Capture produisant un `VideoFrame` via `layout: [{offset, stride}]`, sans détour PNG ni canvas 2D — `Engine.captureExportFrame()`, chaîne couleur LINÉAIRE hors-écran → present avec réduction → readback. **N'utilise PAS** le chemin snapshot : celui-ci passe par `fs_main_direct`, déjà en sRGB. Résolution de sortie indépendante du canvas (vérifié : canvas ≠ 320 px)
- [x] 6.3 Test de non-régression gamma **lisant des pixels** — `tests/video-capture.spec.ts` : capture 2× réduite vs capture pleine réduite en JS dans les deux espaces. **linear MAE 0,36 contre sRGB MAE 8,47** sur 2276 échantillons de bords à fort contraste
- [ ] 6.4 **NON FAITE, A/B empirique non obtenu.** Deux tentatives ont échoué sur l'environnement : `drawImage` depuis un canvas WebGPU rend du vide (drawing buffer non préservé), et la passe present n'est utilisée en temps réel que lorsque l'accumulateur AA est affiché, ce qui exige `antialiasLevel > 1` piloté depuis Vue. Argument disponible faute de mesure : à `DOWNSCALE=1`, `base = coord*1`, la boucle s'exécute une fois et `sum/1.0` est exact — l'expression est identique bit à bit à `acc.rgb / max(acc.a, 1.0)`. À reprendre avec une capture d'écran Playwright (qui, elle, fonctionne sur canvas WebGPU) et l'AA forcé depuis la couche Vue

## 7. Encodage

- [x] 7.1 Conteneur **MP4 figé**, **codec au choix** (AV1 par défaut, puis H.264/AVC, HEVC, VP9). Support **sondé** par `canEncodeVideo` à la résolution demandée : les codecs indisponibles sont marqués et bloquent le départ, sans substitution silencieuse. Muxer = `mediabunny` (MPL-2.0), `fastStart: 'in-memory'` pour un index en tête
- [x] 7.2 Espace colorimétrique explicite (bt709 / iec61966-2-1, full range) posé sur la `VideoFrame` à la capture ; timestamps de présentation = `n/fps`, distincts du temps de parcours qui s'étale sur `[0, d]`
- [x] 7.3a Vérifier qu'une frame lente occupe `1/fps` dans le fichier — `tests/video-encode.spec.ts` paramétré sur **av1 et avc**, MP4 dans les deux cas (`ftyp`, 0,666667 s pour 20 images à 30 fps), chacun rechargé par le navigateur via `loadedmetadata`. Sonde vérifiée : à 641×361, `avc` et `hevc` sont refusés (dimensions impaires) tandis qu'`av1` et `vp9` passent
- [x] 7.3b Téléchargement `.mp4` câblé depuis le panneau (`URL.createObjectURL` + lien, révocation différée)

## 8. Interface

- [x] 8.1 Panneau d'export `VideoExportPanel.vue` + onglet **Vidéo (K)** — sélecteurs format / résolution / cadence / suréchantillonnage, seuil de bascule 2–32, bouton libellé selon le conteneur choisi
- [x] 8.2 Progression en frames émises sur total (barre + compteur) et bouton d'annulation, câblés au `signal` de la boucle
- [x] 8.3 Restitution des refus — vérifiée en vivo : 48 divergences listées, palette en tête avec son explication, bouton désactivé. **Voir 8.4 : ce volume rend la règle inutilisable**

## 8bis. Modèle de parcours

- [x] 8.5 **Parcours = deux positions, plus de preset** — le sélecteur de destination est retiré ; les deux extrémités se capturent depuis la vue courante par le même bouton. Le film garde l'apparence courante, donc plus aucune application ni restauration de paramètres. `deepEquals` et `describePaletteDivergence` devenus morts, supprimés
- [x] 8.6 **Boutons « Définir le départ / l'arrivée ici »** — symétriques ; sans épinglage, une extrémité suit la vue courante. Affichage de chaque extrémité (épinglée / vue courante + coordonnées), et avertissement si les deux coïncident

## 8ter. Correctifs de la boucle réelle

- [x] 8.8 **Capture pilotée par la boucle d'export** — `captureExportFrame` ne fait que *demander* une capture, résolue à la fin du prochain `render()`. La boucle cessait de pomper une fois l'image prête, donc c'est la boucle rAF **interactive** qui débloquait chaque capture : une attente d'un tour d'animation par image, même déjà convergée, et un blocage total en onglet masqué. La boucle pilote désormais elle-même ce rendu. Mesuré : **0 image en 30 s → 48 images en 7,3 s**. Verrouillé par un test qui coupe `startRenderLoop()` avant l'export
- [x] 8.7 **Famine de macrotâches corrigée** — la boucle d'export n'attendait que des microtâches, donc les callbacks `mapAsync` du compteur `unfinished` n'étaient jamais délivrés : les 3 slots de readback se remplissaient, le compteur gelait sur sa dernière valeur et **chaque image échouait après 4000 pompes**. Correctif : `Engine.waitForSubmittedWork()` (barrière GPU) entre deux pompes — choisie plutôt que `setTimeout(0)`, throttlé à 2,5 Hz en onglet masqué contre 12 kHz pour la barrière. Verrouillé par `tests/video-export-loop.spec.ts`
- [x] 8.4 Règle de refus revue — **B ne fournit que la caméra, tout le reste vient de A**. `validateVideoPath` ne bloque plus que sur la durée et l'absence de coordonnées d'arrivée ; `describeParcoursWarnings` résume l'apparence non appliquée. Vérifié en vivo : 0 blocage contre 48, 1 avertissement, bouton actif. Messages traduits en français pour correspondre au panneau

## 8quater. Persistance

- [x] 8.9 **Points et réglages conservés** — `src/videoExportPreferences.ts` (clé dédiée `mandelbrot_video_export`), normalisation champ par champ, coordonnées gardées en chaînes décimales et position rejetée si une coordonnée n'en est pas une. 27 tests, dont stockage corrompu, absent et levant à la lecture comme à l'écriture

## 8quinquies. Isolation des deux boucles

- [x] 8.10 **Boucle interactive parquée pendant l'export** — `startRenderLoop()` restait armée : elle pilote le MÊME `draw()` que la boucle d'export, d'où deux pilotes rendant le même moteur, du travail GPU dupliqué par image et des `update()` entrelacés. Mon test la coupait explicitement, donc il testait une condition que l'application ne créait jamais. `beginVideoExportSession` la parque, `endVideoExportSession` la rend à l'identique
- [x] 8.11 **Compteur FPS neutralisé pendant l'export** — il rapportait la cadence des pompes d'export, sans rapport avec le film produit
- [x] 8.13 **Cycle frozen/live démonté à chaque image — corrigé** — le moteur compare l'échelle à la passe précédente ; l'export pompant à caméra fixe, `scaleStable` se déclenchait dès la 2ᵉ pompe de chaque image (merge + clearHistory + idle) et le cycle repartait de zéro. Idem pour le garde « small-zoom stop ». Les deux sont désormais inhibés en session d'export. Mesuré : `idleReturns` 1/image → **0**, images gratuites 5/48 → **21/48**, `swaps` = 1 sur 3 octaves à seuil 32 (exactement la prédiction). Verrouillé par `zoomCycleIdleReturns === 0` dans le test de boucle
- [x] 8.12 **Mesure du seuil, avec contrôle** — voir Décision 7bis : le seuil n'est **pas** un levier de vitesse (65 pompes à T=2 contre 92 à T=32 en 1080p ×2). Le premier protocole, à parcours partagé, donnait une fausse confirmation spectaculaire ; le contrôle en ordre inverse l'a réfuté

## 8sexies. Écran pendant et après l'export

- [x] 8.14 **Canvas noir pendant l'export — corrigé** — le parquage de la boucle interactive (8.10) laissait plus personne pour peindre le canvas : écran vide pendant tout le rendu. Chaque image exportée est désormais recopiée sur le canvas (passe present à `DOWNSCALE=1`, la surface étant épinglée à `sortie × ss`), donc on voit le film se fabriquer
- [x] 8.15 **Restitution de la vue vérifiée** — `tests/video-export-restore.spec.ts` : parcours bouclé sur son départ, la luminosité du canvas après export doit rester à au moins 80 % de celle d'avant, à `ss=1` et `ss=2`. Une première version du test comparait à un seuil absolu et échouait à tort : un parcours qui *arrive ailleurs* laisse légitimement une vue plus sombre

## 8septies. Film noir sur surface trop grande

- [x] 8.20 **VRAIE cause du film noir : `maxBufferSize` laissé au défaut.** `requestDevice()` était appelé sans `requiredLimits`, donc le device gardait les défauts WebGPU : `maxBufferSize` 256 Mo, `maxStorageBufferBindingSize` 128 Mo, `maxTextureDimension2D` 8192. Un export 1080p en ×2 demande un staging de **296 Mo** → submit rejeté → tout le pipeline en noir, à pleine vitesse, sans erreur remontée. Les trois limites sont désormais demandées à la hauteur de l'adaptateur (mesuré : 4096 Mo / 4096 Mo / 16384), avec repli sur les défauts si `requestDevice` refuse
- [x] 8.21 **Suréchantillonnage jusqu'à ×8** — facteurs offerts 1, 2, 3, 4, 6, 8, et estimation de mémoire GPU affichée dans le panneau : le coût croît en carré de la diagonale, donc ×8 vaut 64× les texels de ×1. Vérifié en vivo à 1080p : ×1 ~1,5 Go, ×2 ~5,9 Go, ×4 ~23,4 Go, ×8 refusé (17624² au-delà de 16384) avec le message chiffré
- [x] 8.16 **Première piste, insuffisante seule : allocation invalide silencieuse.** Toutes les textures de travail sont des carrés du côté = diagonale de la surface. Au-delà de `maxTextureDimension2D`, WebGPU **ne lève pas** : `createTexture` rend une texture invalide et signale de façon asynchrone. Tout l'aval lit des textures invalides → **écran et film entièrement noirs, rendu très rapide** (plus rien n'itère), sans le moindre message. Reproduit : 3840×2160 en ×2 → texture 8812² contre limite 8192 → 77 `GPUValidationError`, `nonBlackRatio: 0`, `beginVideoExportSession` ne levait rien et la session continuait
- [x] 8.17 **Chemin interactif : dégradation au lieu de mort** — `resize()` clampait `width`/`height` mais pas le carré dérivé. Il réduit maintenant la surface à ratio constant pour que la diagonale tienne dans la limite
- [x] 8.18 **Chemin export : refus explicite au lieu de dégradation** — réduire en silence changerait la résolution du film dans le dos de l'utilisateur. `beginVideoExportSession` refuse en nommant les chiffres (« exige une texture de travail 8812², au-delà de la limite de cet appareil (8192) »), et enveloppe le `resize()` dans un scope d'erreur GPU pour attraper aussi les échecs mémoire. Vérifié : 0 erreur GPU, session non ouverte, boucle interactive intacte
- [x] 8.19 Ordre corrigé dans le runner : la session s'ouvre **avant** l'encodeur, sinon un refus laissait un muxer démarré à l'abandon

## 8octies. Écriture en flux

- [x] 8.22 **Encodage en flux vers le disque** — `AppendOnlyStreamTarget` + File System Access. Le film ne s'accumule plus en mémoire, ce qui supprime le « array buffer allocation failed » en fin de rendu long. Sélecteur de fichier appelé **avant tout `await`**, sinon le geste utilisateur est expiré et l'API refuse
- [x] 8.23 **MP4 fragmenté pour survivre à une interruption** — `fastStart: 'fragmented'` en flux (chaque fragment est autonome) contre `'in-memory'` en tampon (index en tête, seek immédiat). Une annulation **finalise** le fichier au lieu de l'abandonner, donc on garde ce qui a été rendu
- [x] 8.24 Repli mémoire + téléchargement quand l'API d'écriture est absente, et fermeture du handle dans un `finally` sur tous les chemins
- [x] 8.25 Vérifié par `tests/video-stream-encode.spec.ts` : 90 images, **53 % des octets écrits avant même l'encodage de la dernière image**, aucun Blob rendu, fichier complet lisible, et **fichier coupé à 60 % toujours chargeable par le navigateur**

## 9. Validation

- [ ] 9.1 Test de reproductibilité : exporter deux fois un parcours court et comparer les sorties image par image
- [ ] 9.2 Test de convergence : vérifier sur un parcours deep qu'aucune frame émise ne porte de pixels au-dessus du seuil d'idle
- [ ] 9.3 Test d'indépendance au temps de calcul : forcer une frame lente et vérifier que la position caméra suivante et la durée du fichier sont inchangées
- [ ] 9.4 Vérifier que la suite Playwright existante passe sans régression du comportement temps réel
