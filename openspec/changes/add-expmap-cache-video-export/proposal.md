## Why

Précalculer une image ExpMap persistante pour explorer un deepzoom et exporter des vidéos sans nouvelles itérations, avec un stockage lisible comme image et un coût mémoire connu.

## What Changes

- Calcul direct GPU sur une grille angle × profondeur logarithmique, une tuile par doublement.
- TIFF Deflate sans perte : un regroupement automatique selon la capacité TIFF, publication vérifiée et reprise par tuile.
- Un seul format et un seul lecteur ; aucune compatibilité ou conversion des prototypes antérieurs.
- Tampon circulaire de quatorze tuiles GPU, douze doublements visibles et anticipation, sans logo central.
- Catalogue local, lecteur à dernière demande prioritaire, progression et budgets affichés.
- Vidéo à fenêtre et vitesse précises utilisant le même renderer GPU, sans reconstruction CPU ou double tampon simultané.
- Apparence statique figée ; les matériaux dépendants de la vue relèvent d'une autre change.

## Capabilities

### New Capabilities

- `expmap-color-cache`: éligibilité, calcul direct, projection régulière, TIFF indexé et reprise.
- `expmap-render-library`: catalogue de documents persistants avec bornes précises et accès disque.
- `expmap-image-player`: navigation et streaming de quatorze tuiles, reconstruction GPU.
- `expmap-cache-video-export`: animation et export déterministe d'un document existant.

### Modified Capabilities

Aucune ; les autres modes d'export conservent leur comportement.

## Impact

Planificateur/producteur, store/manifeste, métadonnées TIFF via UTIF, codec Deflate natif, tampon GPU partagé, catalogue et panneaux. Le sink vidéo existant reçoit le canvas GPU. Aucun ratio de compression ou débit matériel garanti ; la validation sur GPU réel nécessite une confirmation explicite.
