# Contrôle du format display set — 2026-09-12

## État après essai autorisé

L’utilisateur a demandé de déplacer l’écrêtage. Le calcul conserve désormais les valeurs finies sans limite visuelle à 64 ; resolve et merge utilisent seulement la limite de stockage float16 à 65504. Les limites visuelles restent dans color après adaptation à la vue. Les deux témoins numériques sont préservés. Le script est actualisé pour contrôler ce nouvel état ; la démonstration historique ci-dessous décrit l’état antérieur.

Le format reste à 48 octets. Ceci ne prouve pas la fidélité générale : les saturations au-delà de 65504, la quantification, les accumulations orbitales et l’impact visuel nécessitent encore validation. Les anciens RGB complets restent lisibles ; une production interrompue antérieure ne peut pas mélanger ses blocs avec la nouvelle convention continuous-radial-v2.

## Résultat initial

La copie persistante du display set actuel ne peut pas garantir la fidélité des entrées du shading après changement d'échelle. Le contrôle préalable échoue. Cela ne remet pas en cause le tiling vidéo par couronnes ; cela impose de revoir les données conservées avant de figer le format persistant.

## Reproduction

```sh
node openspec/changes/add-persistent-shader-expmap-export/experiments/display-fidelity.mjs
```

Le script vérifie que les expressions concernées existent toujours dans le WGSL actuel, fournit leurs empreintes SHA-256 puis démontre deux collisions de représentation. Il termine avec succès lorsque la démonstration est valide ; son champ `proposed48ByteFormatFidelityGate` vaut `FAIL`. Il ne compile ni n'exécute de shader GPU.

| Grandeur | Avant stockage | Stocké après écrêtage | Relecture avec ratio 1/16 | Adaptation avant écrêtage |
|---|---|---|---|---|
| Gradient | 128 et 256 | 64 et 64 | 4 et 4 | 8 et 16 |
| Courbure | 256 et 1024 | 64 et 64 | 0,25 et 0,25 | 1 et 4 |

Ces nombres sont représentables exactement en float16 et float32. Augmenter uniquement la précision des textures n'annule donc pas la collision. Aucune fonction de décodage ne peut distinguer deux valeurs devenues identiques.

## Chemins concernés

- `src/assets/mandelbrot_brush.wgsl`, `analytic_terminal_geometry` : gradients limités à ±64 et laplacien plafonné à 64 avant sortie du calcul. `distance_height` et `distance_height_deep` écrêtent également la hauteur.
- `src/assets/resolve.wgsl`, `load_terminal_geometry` et `load_terminal_orbit_gradient` : nouvel écrêtage avant écriture dans les textures d'affichage.
- `src/Engine.ts`, `createDisplaySet` : géométrie et gradients orbitaux au format rgba16float.
- `src/assets/color.wgsl`, `normalize_geometry` : gradients multipliés par le ratio d'échelle, courbure par son carré, hauteur décalée logarithmiquement.

## Portée du résultat

Ce contre-exemple réfute une garantie générale d'adaptation fidèle du format existant. Il ne mesure pas la fréquence des valeurs saturées dans des vues Mandelbrot réelles ni leur impact visuel. Il ne démontre pas qu'un nouveau format de 48 octets est impossible : une convention logarithmique ou à exposant partagé pourrait conserver une plus grande plage, avec une précision à valider.

## Révision proposée

Capturer une géométrie avant les clamps destinés à l'affichage, définir ses unités radiales et conserver une plage suffisante. Comparer au moins une représentation logarithmique compacte et une représentation élargie. Appliquer les clamps après adaptation à la vue cible. Versionner explicitement cette convention et ses limites.

Le volume de 352 Go pour 4K ×10^100 est celui de la copie brute à 48 octets ; il ne constitue pas encore une estimation validée du futur format fidèle. À titre purement arithmétique, un profil de 64 octets représenterait environ 470 Go, mais ni sa suffisance ni sa nécessité ne sont établies ici.

Le choix de priorité entre fidélité et budget cible doit être clarifié avant de figer le nouveau format. La production, le stockage, le lecteur et l'export complet restent à implémenter.
