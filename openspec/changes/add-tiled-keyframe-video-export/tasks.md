## 1. Contrats purs

- [x] 1.1 Définir les types `KeyframeTilePlan`, `KeyframeTile` et `TiledExportMemoryEstimate` sans dépendance GPU
- [x] 1.2 Implémenter le planificateur : plus grand côté aligné tenant dans le budget, partition entière du carré, tuiles de bord plus petites, déterminisme
- [x] 1.3 Implémenter l'estimation en deux parts à partir d'octets par texel fournis par le moteur (keyframes à l'échelle du carré, reste à l'échelle de la tuile)
- [x] 1.4 Implémenter l'éligibilité : centre fixe et `aaSamplesPerFrame` égal à 1, avec messages de refus
- [x] 1.5 Tests unitaires : budget serré, budget large (une tuile), reproductibilité, bords non divisibles, refus AA jitteré, refus travelling, budget insuffisant pour les keyframes

## 2. Projection de tuile dans les passes du champ brut

- [x] 2.1 Ajouter `tileOriginX`, `tileOriginY` et `neutralSide` aux uniformes du brush et des passes utilitaires (reprojection, effacement de bande, comptage, cible AA, reseed AA, resolve)
- [x] 2.2 Calculer `uv` à partir de `tileOrigin + gid` sur `neutralSide` dans chaque passe, en conservant `is_inside_rotated_screen`, le domaine de référence et `viewportAspect` sur le carré complet
- [x] 2.3 Intersecter la boîte de dispatch `dispatchOrigin` avec la tuile courante
- [x] 2.4 Test de contrat de shader : les uniformes existent et `uv` dépend de l'origine de tuile
- [x] 2.5 Test d'équivalence bit à bit : tuile unique égale au carré contre chemin monolithique sur une vue fixe

## 3. Allocation tuile/carré et échange de rôles

- [x] 3.1 En session tuilée, allouer textures brutes A et B, resolved, compteurs, cible et reseed AA et scratch de merge à la taille de la tuile ; allouer les deux display sets de keyframe à la taille du carré
- [x] 3.2 Exposer depuis le moteur les octets par texel réellement alloués pour chaque échelle
- [x] 3.3 Implémenter l'échange de rôles des deux display sets à `copyResolvedToFrozen` en session tuilée, avec reconstruction des bind groups couleur, sans copie complète
- [x] 3.4 Vérifier que `zoomFactor`, `liveZoomFactor`, `frozenAligned` et les décalages frozen restent calculés comme aujourd'hui pour un centre fixe
- [x] 3.5 Test : aucune texture r32float en couches à la taille du carré pendant une session tuilée

## 4. Construction tuile par tuile d'une keyframe

- [x] 4.1 Ajouter l'opération de changement de tuile : origine, stamp des sentinelles, réinitialisation des compteurs, des readbacks en vol, de l'accumulation AA et de tout état lié au champ brut, sans `resetReference` ni recréation du worker
- [x] 4.2 Implémenter la boucle de construction : pour chaque tuile, converger avec `isFieldConverged`, exécuter le resolve, copier chaque texture du set dans la keyframe à l'origine de la tuile, marquer la tuile faite
- [x] 4.3 Faire dépendre `videoFrameReady` de la complétude de la keyframe en session tuilée
- [x] 4.4 Recevoir l'intervalle d'angles du cycle et construire sur l'union des viewports tournés lorsque l'angle varie
- [x] 4.5 Ajouter les diagnostics : keyframes construites, tuiles converties, pumps par tuile, frames libres
- [x] 4.6 Test ciblé : deux tuiles consécutives ne partagent aucun état ; la keyframe est complète avant la première frame émise

## 5. Interface et préférences

- [x] 5.1 Ajouter au panneau l'option de mode tuilé, le budget mémoire, le nombre de tuiles et l'estimation en deux parts
- [x] 5.2 Désactiver l'AA jitteré en mode tuilé et afficher le refus pour un travelling
- [x] 5.3 Conserver le refus `maxTextureDimension2D` et son message actuel
- [x] 5.4 Persister le mode et le budget dans `videoExportPreferences` avec tests de normalisation
- [x] 5.5 Transmettre le plan de tuiles à la session depuis `videoExportRunner` sans modifier la boucle de frames

## 6. Validation

- [x] 6.1 Test unitaire d'égalité de l'image linéaire réduite entre monolithique et tuilé à quatre tuiles sur un parcours court
- [x] 6.2 Test des bandes de 8 pixels autour des frontières de tuile
- [x] 6.3 Test d'absence de sentinelle lue par la passe couleur sur un parcours tournant
- [ ] 6.4 Vérification WebGPU réelle, après confirmation explicite : export 4K ×2 en tuilé sur un adaptateur 16384, mesure mémoire avant/après, comparaison visuelle
- [x] 6.5 `npx vue-tsc -b`, `npm run test:unit`, `openspec validate add-tiled-keyframe-video-export --strict`
