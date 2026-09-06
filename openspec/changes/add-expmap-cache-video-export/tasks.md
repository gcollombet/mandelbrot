## 1. Contrat et production

- [x] 1.1 Définir éligibilité statique, domaine profond canonique et identité d'apparence.
- [x] 1.2 Définir une grille régulière par doublement, halos et couverture centrale sur douze doublements.
- [x] 1.3 Produire les blocs directement sur GPU avec convergence complète et restauration de session.

## 2. TIFF et reprise

- [x] 2.1 Implémenter TIFF à regroupement automatique, compression/décompression Deflate native et index de plages vérifiées.
- [x] 2.2 Publier les checkpoints A/B après écriture fermée et reprendre par tuile complète.
- [x] 2.3 Supprimer PNG/WebM, packing, conversion, lecteur CPU et anciennes branches de compatibilité ; laisser les anciens fichiers intacts.

## 3. Lecteur et vidéo

- [x] 3.1 Implémenter tampon circulaire de quatorze tuiles, prélecture unique, protection des uploads obsolètes.
- [x] 3.2 Reconstruire par une seule passe GPU filtrée ; aucune demande atomique ou lecture GPU de pages.
- [x] 3.3 Conserver catalogue, lecteur à dernière demande prioritaire, progression et estimations de mémoire.
- [x] 3.4 Partager le renderer avec la vidéo ordonnée et libérer le lecteur avant allocation vidéo.

## 4. Validation

- [x] 4.1 Tester mapping profond, halos, budgets, TIFF avec décodeur indépendant, reprise et erreurs de payload.
- [x] 4.2 Tester cache glissant, prélecture obsolète, progression et reprise, vidéo ordonnée et restauration.
- [x] 4.3 Exécuter la suite unitaire, les types et Naga après le nettoyage final.
- [ ] 4.4 Après confirmation explicite, mesurer qualité visuelle, scintillement, débits et pics mémoire sur GPU cible ; pas de Playwright ou benchmarks sans confirmation.

- [x] 4.5 Supprimer le seuil de treize tuiles par fichier, dimensionner les index et tester un TIFF de plus de treize tuiles, un index supérieur à 20 Ko et la reprise entre fichiers.
