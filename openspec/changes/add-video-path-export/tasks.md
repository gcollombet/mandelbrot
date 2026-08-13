## 1. Spikes préalables

- [ ] 1.1 Mesurer si une boucle `await` pure (sans rAF, dont le seul point bloquant est `queue.onSubmittedWorkDone()`) continue de tourner à pleine vitesse dans un onglet en arrière-plan ; consigner le verdict dans `design.md` (Open Questions)
- [ ] 1.2 Si le verdict est négatif, décider et consigner le repli retenu : Wake Lock + onglet au premier plan, ou bascule vers le script Playwright piloté
- [ ] 1.3 Instrumenter un parcours représentatif (30 s, ~1 octave/s) pour mesurer le nombre de resets de référence et leur coût cumulé ; trancher si le pré-chauffage est nécessaire en v1

## 2. Horloge déterministe

- [ ] 2.1 Exposer `step_with_delta_time` à wasm dans `reference_calculus/src/lib.rs` (la fonction existe, elle est privée) et reconstruire le paquet wasm
- [ ] 2.2 Ajouter un test Rust vérifiant qu'une transition avancée par pas de `1/fps` atteint exactement la cible en `ceil(durée × fps)` pas
- [ ] 2.3 Rendre la source de temps des pistes d'animation injectable (`Engine.this.time` en temps réel, `frameIndex / fps` en export) sans changer le comportement temps réel
- [ ] 2.4 Garantir que `tickTravelAnimation` (`MandelbrotViewer.vue`) ne s'exécute pas pendant un export : la session pilote la transition du navigateur directement, la palette reste celle de A et aucune boucle rAF cadencée par `Date.now()` ne mute `colorStops`
- [ ] 2.5 Permettre l'appel de `draw()` (`Mandelbrot.vue`) hors boucle rAF avec un `dt` imposé

## 3. Prédicat de convergence

- [ ] 3.1 Extraire `fullyConverged` (`Engine.ts:5967`) en un prédicat nommé réutilisable, avec ses trois gardes de fraîcheur
- [ ] 3.2 Faire consommer ce prédicat par `needsMoreFrames()` et par le déclenchement de l'AA automatique, et vérifier par la suite Playwright existante que le comportement temps réel est inchangé
- [ ] 3.3 Ajouter la variante d'export omettant le seul terme `isZoomActive`
- [ ] 3.4 Tests unitaires du prédicat : compteur périmé, readback en vol, effets de swap non consommés

## 4. Session d'export et boucle de rendu

- [ ] 4.1 Rendre `zoomMagnificationThreshold` réglable pour la durée d'une session et restitué à sa valeur par défaut en sortie
- [ ] 4.2 Implémenter la boucle `await` d'export : pas caméra exact, pompage de `draw()` jusqu'au prédicat d'export, plafond de pompes par frame avec échec explicite portant l'index de frame
- [ ] 4.3 Neutraliser les asservissements temps réel pendant la session : `targetFps` au plancher pour maximiser les batches, `aaAuto` désactivé, `startRenderLoop()` non utilisé
- [ ] 4.4 Implémenter le cycle de vie de session : progression en frames émises sur total, annulation, restitution intégrale des réglages (`zoomMagnificationThreshold`, `targetFps`, `aaAuto`, DPR, source de temps)
- [ ] 4.5 Vérifier qu'entre deux swaps aucun effacement d'historique n'est armé, et mesurer le nombre effectif de frames servies par convergence (attendu ≈ 30 à `T = 2`, 1 octave/s, 30 fps)

## 5. Parcours

- [ ] 5.1 Définir le modèle de parcours (état A, preset B, durée) et sa sérialisation
- [ ] 5.2 Implémenter la validation : refus avec énumération des paramètres divergents (palette incluse — comparaison des `colorStops` sur cardinalité, positions et couleurs), refus des durées nulles ou négatives
- [ ] 5.3 Implémenter la validation de la combinaison résolution × DPR contre `maxTextureDimension2D` (`ceil(sqrt(w² + h²))`), refus avant toute allocation
- [ ] 5.4 Imposer `zoomMagnificationThreshold ≤ DPR` dans le modèle de session

## 6. Capture et réduction

- [ ] 6.1 Insérer le filtre de réduction box 2×2 avant la conversion linéaire→sRGB de `present.wgsl` (moyenne explicite, pas de sampler bilinéaire)
- [ ] 6.2 Remplacer le chemin `snapshotCallback` (`Engine.ts:6300`) par une capture produisant un `VideoFrame` depuis le buffer mappé via `layout: [{ offset: 0, stride: bytesPerRow }]`, sans détour PNG ni canvas 2D
- [ ] 6.3 Test de non-régression gamma : exporter une frame contenant un dégradé à fort contraste et vérifier l'absence d'assombrissement de bord

## 7. Encodage

- [ ] 7.1 Trancher codec et conteneur (mp4/avc1 ou webm/vp9) et ajouter la dépendance de muxer correspondante
- [ ] 7.2 Configurer `VideoEncoder` avec un espace colorimétrique explicite et des timestamps dérivés de l'index de frame
- [ ] 7.3 Câbler la sortie du muxer vers le téléchargement du fichier, et vérifier qu'une frame lente à converger occupe bien `1 / fps` dans le fichier produit

## 8. Interface

- [ ] 8.1 Panneau d'export : choix du parcours, résolution, fps, `T`/DPR, codec, avec la contrainte `T ≤ DPR` imposée par les contrôles eux-mêmes
- [ ] 8.2 Affichage de la progression en frames émises sur total, et bouton d'annulation
- [ ] 8.3 Restitution des messages de refus (paramètres divergents, combinaison résolution × DPR hors limite)

## 9. Validation

- [ ] 9.1 Test de reproductibilité : exporter deux fois un parcours court et comparer les sorties image par image
- [ ] 9.2 Test de convergence : vérifier sur un parcours deep qu'aucune frame émise ne porte de pixels au-dessus du seuil d'idle
- [ ] 9.3 Test d'indépendance au temps de calcul : forcer une frame lente et vérifier que la position caméra suivante et la durée du fichier sont inchangées
- [ ] 9.4 Vérifier que la suite Playwright existante passe sans régression du comportement temps réel
