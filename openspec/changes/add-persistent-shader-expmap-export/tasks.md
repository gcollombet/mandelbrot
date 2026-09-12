## 1. Suffisance et fidélité des données

- [x] 1.1 Auditer la chaîne géométrique et produire un contre-exemple reproductible si le display set ne permet pas une adaptation fidèle.
- [x] 1.1a Essayer le déplacement de la limite à 64 vers la couleur, conserver la borne float16, tester les régressions et versionner la reprise RGB.
- [ ] 1.2 Définir et valider la convention avant écrêtage, son domaine et son coût réel par échantillon.
- [ ] 1.3 Prototyper capture et relecture avec changement d'échelle et rotation ; comparer les matériaux sur GPU au rendu direct.

## 2. Source persistante

- [x] 2.1 Séparer densités radiale et angulaire avec compatibilité des documents RGB existants.
- [x] 2.2 Ajouter estimation des dimensions, disque, mémoire et couverture centrale.
- [x] 2.3 Capturer les plans avant couleur en blocs bornés depuis Engine.
- [x] 2.4 Ajouter manifeste versionné, index segmenté et validation des tailles et conventions.
- [x] 2.5 Implémenter écriture, lecture, vérification, publication atomique, interruption et reprise.
- [x] 2.6 Intégrer création, bibliothèque, import/export et affichage des coûts.

## 3. Lecture et shading

- [x] 3.1 Implémenter cache de blocs sous budget avec checkpoints de source et protection des lecteurs GPU.
- [x] 3.2 Reconstruire et adapter les données dans la vue cible avec ressources de palette et matériau.
- [x] 3.3 Partager transformations créatives et calcul de couverture avec le lecteur et l'export.
- [x] 3.4 Ajouter multisampling en lumière linéaire et centre fini.
- [x] 3.5 Brancher les paramètres créatifs, les incompatibilités de calcul et la lecture interactive.

## 4. Vidéo par couronnes

- [x] 4.1 Planifier N utile selon budget supplémentaire au moteur affiché, N+2 pour le zoom classique et subdivisions supplémentaires si nécessaire.
- [x] 4.2 Synchroniser les fenêtres glissantes et les frames des passes successives.
- [x] 4.3 Composer les couronnes dans une cible linéaire par frame puis écrire le MP4 en flux, sans intermédiaires disque (raffinement documenté ; reprise de l'encodage final non implémentée).
- [x] 4.4 Composer les contributions AA des couronnes et du centre avant encodage final.
- [x] 4.5 Ajouter réglage budget, résumé du découpage, progression et nettoyage des temporaires.

## 5. Validation

- [ ] 5.1 Tester budgets limites, cache évincé tardivement, données corrompues, annulation et reprise.
- [ ] 5.2 Tester couverture des frontières, échantillons AA, timestamps et compatibilité RGB.
- [x] 5.3 Valider TypeScript et WGSL avec et sans effets de surface.
- [ ] 5.4 Comparer sur GPU deux couronnes au rendu direct, puis 4K, rotation et déformations ; demander confirmation avant Playwright ou benchmarks.

État : chaîne source → relecture GPU → MP4 implémentée. Essai navigateur réel : source 32×18, 14 blocs, réouverture depuis catalogue, aperçu puis 3 frames HEVC finalisées. Les tests statiques/unitaires ne valent pas comparaison de fidélité GPU. Les tâches 1.2–1.3 et 5.1–5.2/5.4 restent ouvertes pour la validation exhaustive, notamment éviction GPU forcée, fidélité matériau, déformations et source réellement dense en 4K. Pas de reprise de l'encodage MP4 final ; reprise de la source et de sa copie disponible. Voir `experiments/fidelity-report.md` et `experiments/implementation-validation.md`.

## 6. Première correction de lenteur

- [x] 6.1 Regrouper jusqu'à 32 blocs dans une passe/soumission avec paramètres distincts et attente avant éviction.
- [x] 6.2 Rejeter les couronnes hors empreinte du pixel avant la boucle AA, en conservant les frontières et en excluant le miroir fixe du raccourci.
- [x] 6.3 Tester les paramètres de lots et la barrière avant éviction ; valider TypeScript et WGSL.
- [ ] 6.4 Mesurer le gain sur une source représentative après autorisation de benchmark sur le nouveau mode par couronnes successives.

## 7. Approche demandée : une couronne sur tout le film

- [x] 7.1 Ajouter la planification par couronnes avec nombre d'octaves déterminé par le budget N+2 et portions de blocs sous budget.
- [x] 7.2 Partager exactement la trajectoire et les temps entre les deux ordres de rendu.
- [x] 7.3 Capturer les contributions RGBA16F recadrées et les assembler sans réévaluer le shading.
- [x] 7.4 Persister les contributions vérifiées avec checkpoint, reprise et nettoyage limité aux fichiers de la recette.
- [x] 7.5 Sélectionner le mode successif par défaut et afficher les coûts intermédiaires, sans segment temporel imposé.
- [x] 7.6 Tester l'ordre des passes, la reprise, la partition de couverture, le recadrage et la corruption ; exercer un petit export GPU réel.

Validation de performance sur une grande source toujours à faire ; ne pas confondre essai fonctionnel et benchmark.

## 8. Optimisations conservant le rendu

- [x] 8.1 Soumettre les lots pleins sans attente CPU et drainer toutes les soumissions avant éviction, fin de trame ou sortie sur erreur.
- [x] 8.2 Initialiser les paramètres couleur une fois par fragment et partager les invariants locaux entre voisins bilinéaires du même sous-échantillon AA.
- [x] 8.3 Réutiliser le rectangle de couronne et le filtre par trame, supprimer les copies du payload avant upload en conservant SHA-256.
- [x] 8.4 Vérifier l'ordre écriture/soumission et la barrière sur lot vide ; valider les tests ciblés, TypeScript et les deux variantes WGSL.

## 9. Vidéos intermédiaires compressées demandées

- [x] 9.1 Encoder un MP4 par couronne, avec enveloppe stable, codec choisi et débit réglable proportionnel à la surface.
- [x] 9.2 Capturer la couleur sur GPU et stocker séparément les poids f16 en gzip vérifié sans perte.
- [x] 9.3 Décoder les couronnes, restaurer les contributions linéaires pondérées et encoder la vidéo finale.
- [x] 9.4 Reprendre aux couronnes finalisées, isoler les anciens intermédiaires et nettoyer uniquement les nouveaux fichiers de recette.
- [x] 9.5 Afficher débit et estimation compressée, préciser la recompression couleur et la reprise par couronne.
- [x] 9.6 Valider tests ciblés et petit cycle GPU/codec réel avec reprise et nettoyage.
