## 1. Suffisance et fidélité des données

- [x] 1.1 Auditer la chaîne géométrique et produire un contre-exemple reproductible si le display set ne permet pas une adaptation fidèle.
- [x] 1.1a Essayer le déplacement de la limite à 64 vers la couleur, conserver la borne float16, tester les régressions et versionner la reprise RGB.
- [ ] 1.2 Définir et valider la convention avant écrêtage, son domaine et son coût réel par échantillon.
- [ ] 1.3 Prototyper capture et relecture avec changement d'échelle et rotation ; comparer les matériaux sur GPU au rendu direct.

## 2. Source persistante

- [ ] 2.1 Séparer densités radiale et angulaire avec compatibilité des documents RGB existants.
- [ ] 2.2 Ajouter estimation des dimensions, disque, mémoire et couverture centrale.
- [ ] 2.3 Capturer les plans avant couleur en blocs bornés depuis Engine.
- [ ] 2.4 Ajouter manifeste versionné, index segmenté et validation des tailles et conventions.
- [ ] 2.5 Implémenter écriture, lecture, vérification, publication atomique, interruption et reprise.
- [ ] 2.6 Intégrer création, bibliothèque, import/export et affichage des coûts.

## 3. Lecture et shading

- [ ] 3.1 Implémenter cache de blocs sous budget avec générations et protection des lecteurs GPU.
- [ ] 3.2 Reconstruire et adapter les données dans la vue cible avec ressources de palette et matériau.
- [ ] 3.3 Partager transformations créatives et calcul de couverture avec le lecteur et l'export.
- [ ] 3.4 Ajouter multisampling en lumière linéaire et centre fini.
- [ ] 3.5 Brancher les paramètres créatifs, les incompatibilités de calcul et la lecture interactive.

## 4. Vidéo par couronnes

- [ ] 4.1 Planifier N utile selon budget complet, N+2 pour le zoom classique et subdivisions supplémentaires si nécessaire.
- [ ] 4.2 Synchroniser les fenêtres glissantes et les frames des passes successives.
- [ ] 4.3 Stocker les intermédiaires sans perte par segments avec annulation et reprise.
- [ ] 4.4 Composer les contributions AA des couronnes et du centre avant encodage final.
- [ ] 4.5 Ajouter réglage budget, résumé du découpage, progression et nettoyage des temporaires.

## 5. Validation

- [ ] 5.1 Tester budgets limites, cache évincé tardivement, données corrompues, annulation et reprise.
- [ ] 5.2 Tester couverture des frontières, échantillons AA, timestamps et compatibilité RGB.
- [ ] 5.3 Valider TypeScript et WGSL avec et sans effets de surface.
- [ ] 5.4 Comparer sur GPU deux couronnes au rendu direct, puis 4K, rotation et déformations ; demander confirmation avant Playwright ou benchmarks.

État : essai d’écrêtage différé implémenté, validation GPU et fonctionnalité complète encore à réaliser. Voir `experiments/fidelity-report.md`.
