## 1. Contrat et production

- [x] 1.1 Définir éligibilité statique, domaine profond canonique et identité d'apparence.
- [x] 1.2 Définir une grille régulière par doublement, halos et couverture centrale sur douze doublements.
- [x] 1.3 Produire les blocs directement sur GPU avec convergence complète et restauration de session.

## 2. Stockage et reprise

- [x] 2.1 Implémenter le conteneur ZIP64, les images WebP natives et l’index de ressources vérifiées.
- [x] 2.2 Publier les checkpoints A/B après écriture fermée et reprendre par tuile complète.
- [x] 2.3 Supprimer PNG/WebM, packing, conversion, lecteur CPU et anciennes branches de compatibilité ; laisser les anciens fichiers intacts.

## 3. Lecteur et vidéo

- [x] 3.1 Implémenter tampon circulaire de quatorze tuiles, prélecture unique, protection des uploads obsolètes.
- [x] 3.2 Reconstruire par une seule passe GPU filtrée ; aucune demande atomique ou lecture GPU de pages.
- [x] 3.3 Conserver catalogue, lecteur à dernière demande prioritaire, progression et estimations de mémoire.
- [x] 3.4 Partager le renderer avec la vidéo ordonnée et libérer le lecteur avant allocation vidéo.

## 4. Validation

- [x] 4.1 Tester mapping profond, halos, budgets, conteneur standard, reprise et erreurs de payload.
- [x] 4.2 Tester cache glissant, prélecture obsolète, progression et reprise, vidéo ordonnée et restauration.
- [x] 4.3 Exécuter la suite unitaire, les types et Naga après le nettoyage final.
- [ ] 4.4 Après confirmation explicite, mesurer qualité visuelle, scintillement, débits et pics mémoire sur GPU cible ; pas de Playwright ou benchmarks sans confirmation.

- [x] 4.5 Supprimer le seuil de treize doublements par fichier ; utiliser l’index ZIP64 et tester la lecture de doublements indépendants et la reprise.

- [x] 4.6 Autoriser la phase couleur et les paramètres/pistes sans consommateur actif ; tester les couleurs fixes, données non finies et effets actifs sur d’autres stops.

- [x] 4.7 Ajouter le forçage expérimental, la distinction invalidité/restriction, la persistance et reprise du choix, le badge bibliothèque et les tests des garde-fous.

- [x] 4.8 Ajouter le transport de lecture, identité visuelle et sortie Échap ; préserver le brouillon de création entre fenêtres et rechargements ; vérifier transport, persistance et types.

- [x] 4.9 Rendre l’échelle du relief continue avant écrêtage, couvrir les gradients orbitaux et les deux chemins numériques, vérifier les halos et empêcher les reprises mélangeant les conventions.

## 5. Conteneur et pipeline WebP

- [x] 5.1 Remplacer TIFF par un conteneur ZIP64 .expmap, sauvegardes internes reprenables et images WebP indépendantes.
- [x] 5.2 Encoder en worker avec deux tampons bornés, écritures ordonnées et temps par étape.
- [x] 5.3 Charger les WebP natifs dans le lecteur et la vidéo, sans modifier le mapping GPU.
- [x] 5.4 Intégrer les miniatures, export image entière et interface fichier/qualité/progression.
- [x] 5.5 Tester conteneur, reprise, concurrence, limites et export ; exécuter types, unités et OpenSpec.

## 6. Multisampling vidéo

- [x] 6.1 Ajouter un plafond de prélèvements vidéo 1/4/9/16 et transmettre le choix au shader partagé.
- [x] 6.2 Intégrer les pixels sur une grille fixe adaptative à la densité, en lumière linéaire, avec le même tampon de tuiles.
- [x] 6.3 Vérifier paramètres, transmission vidéo, types, shader Naga et OpenSpec ; laisser les mesures GPU à la validation autorisée séparément.
