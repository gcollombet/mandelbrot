## Why

Les ExpMaps RGB figent la couleur et les effets dépendants de la vue. Un document avant couleur réutilisable et un export vidéo par couronnes doivent permettre de changer palette, vitesse et rotation tout en bornant la mémoire de travail.

## What Changes

- Ajouter une source persistante avant couleur, distincte du WebP RGB, segmentée, versionnée et reprenable.
- Séparer densité angulaire et radiale, avec estimation des coûts avant production.
- Relire les données avec les matériaux existants et les transformations ExpMap, puis effectuer le multisampling en lumière linéaire.
- Planifier N octaves utiles par couronne selon le budget GPU, avec deux octaves supplémentaires pour le zoom classique, halos et ressources auxiliaires comptabilisés.
- Rendre et composer des couronnes synchronisées, avec centre fini, intermédiaires vidéo compressés et masques AA sans perte à mémoire bornée.
- Valider la suffisance du format avant de figer son ABI : le display set actuel de 48 octets contient de la géométrie écrêtée. Le stockage brut de ce display set ne garantit pas le shading à une autre échelle.

## Capabilities

### New Capabilities
- `persistent-shader-expmap`: Source avant couleur, compatibilité de calcul, reprise et lecture créative.
- `polar-tiled-video-export`: Planification sous budget, couronnes synchronisées, AA et composition.

### Modified Capabilities
Aucune modification du contrat des documents RGB v5 existants ; le nouveau profil reste distinct.

## Impact

Producteur Engine/WGSL, formats et stockage ExpMap, bibliothèque et panneaux de création/lecture/vidéo, shaders de reconstruction et de couleur, ordonnanceur et sink vidéo. Tests unitaires et validation TypeScript/WGSL ; comparaisons GPU nécessaires pour la fidélité. Aucun déploiement. Les tests Playwright et benchmarks restent soumis à la confirmation explicite de l'utilisateur.

Ce changement étend la discussion au-delà du cache temporaire monotone de `add-rolling-display-expmap-export` ; il ne marque pas ses tâches comme réalisées.
