## 1. Portes de validation

- [ ] 1.1 Vérifier que les interfaces de projection, source, budgets et export du change RGB sont livrées et réutilisables.
- [ ] 1.2 Prototyper la convention du display set brut et l'adaptation à color inchangé ; documenter les limites des clamps, normalisations et données Taylor absentes avant de poursuivre.
- [ ] 1.3 Définir le plan de comparaison directe des matériaux et les tolérances de reconstruction ; demander confirmation avant tests GPU/benchmarks.

## 2. Planification et stockage

- [ ] 2.1 Implémenter et tester le planificateur monotone : couverture selon résolution/filtre, réserve, centre fini, budgets complets et rejet des parcours incompatibles.
- [ ] 2.2 Implémenter les blocs bruts versionnés complets à 48 octets par texel, index logiques, générations physiques et publication transactionnelle.
- [ ] 2.3 Implémenter épinglage CPU/GPU et recyclage ; tester lecteur retardé, fin de transfert, écriture interrompue et capacité insuffisante.

## 3. Production et rendu

- [ ] 3.1 Brancher le producteur de rayons successifs et de fermeture centrale avec backpressure et coordonnées profondes sûres.
- [ ] 3.2 Intégrer l'adaptateur validé et le shading existant au lecteur borné ; attendre toutes les contributions de chaque frame.
- [ ] 3.3 Intégrer la source temporaire au runner vidéo existant en conservant timestamps, ordre, pauses, rotations et annulation.

## 4. Interface et cycle de vie

- [ ] 4.1 Ajouter le choix explicite de source temporaire, recettes, estimations et progression à l'interface compacte ; distinguer recette et document RGB rejouable.
- [ ] 4.2 Implémenter nettoyage et checkpoints avec contrôle de propriété et couverture ; traiter explicitement les reprises nécessitant recalcul et les limites du sink.

## 5. Validation

- [ ] 5.1 Exécuter tests unitaires ciblés, typecheck et validation WGSL des chemins concernés ; vérifier absence de régression du lecteur RGB.
- [ ] 5.2 Après confirmation utilisateur, comparer sur GPU les matériaux, coutures et centre avec rendu direct et mesurer séparément calcul, I/O, adaptation, shading, encodage et pics de ressources.
