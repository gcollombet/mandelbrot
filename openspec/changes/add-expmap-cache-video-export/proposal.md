## Why

Précalculer une image ExpMap persistante pour explorer un deepzoom et exporter des vidéos sans nouvelles itérations, avec un document portable et un export image séparé et un coût mémoire connu.

## What Changes

- Calcul direct GPU sur une grille angle × profondeur logarithmique, une tuile par doublement.
- Fichier .expmap ZIP64 : métadonnées, miniature et une image WebP par doublement ; encodage/sauvegarde parallèles au calcul, reprise par tuile.
- Un seul format et un seul lecteur ; aucune compatibilité ou conversion des prototypes antérieurs.
- Tampon circulaire de quatorze tuiles GPU, douze doublements visibles et anticipation, sans logo central.
- Export image entière PNG/JPEG/WebP à résolution choisie, sans recalcul.
- Catalogue local, lecteur à dernière demande prioritaire, progression et budgets affichés.
- Vidéo à fenêtre et vitesse précises utilisant le même renderer GPU, sans reconstruction CPU ou double tampon simultané.
- Apparence figée et forçage expérimental des effets ; échelle continue des matériaux cuits.

## Capabilities

### New Capabilities

- `expmap-color-cache`: éligibilité, calcul direct, projection régulière, conteneur indexé et reprise.
- `expmap-render-library`: catalogue de documents persistants avec bornes précises et accès disque.
- `expmap-image-player`: navigation et streaming de quatorze tuiles, reconstruction GPU.
- `expmap-cache-video-export`: animation et export déterministe d'un document existant.

### Modified Capabilities

Aucune ; les autres modes d'export conservent leur comportement.

## Impact

Planificateur/producteur, store/manifeste, conteneur via zip.js, codec WebP natif, tampon GPU partagé, catalogue et panneaux. Le sink vidéo existant reçoit le canvas GPU. Aucun ratio de compression ou débit matériel garanti ; la validation sur GPU réel nécessite une confirmation explicite.
