# Validation de la chaîne shader persistante — 2026-09-12

## Vérifié

- Tests ExpMap existants, géométrie différée et nouveau stockage : 208 tests passent, dont la copie interrompue/reprise et la couverture centrale étendue.
- TypeScript vue-tsc, OpenSpec strict et Naga sur color.wgsl concaténé au fragment shader passent (effets de surface activés et désactivés).
- Navigateur intégré, GPU réel, sans Playwright ni benchmark : création OPFS d'une source d'essai 32×18, 14 blocs publiés ; aperçu affiché ; rechargement du code puis réouverture via IndexedDB ; export HEVC 0,1 s à 30 fps, 3/3 frames et lien vers MP4 finalisé.
- L'essai utilisait encore 12 octaves centrales. Les sources nouvelles réservent désormais 17 octaves ; test numérique de couverture <1/32 pixel à 4K et compatibilité des anciennes sources.
- Test de copie avec interruption après 2 blocs puis reprise jusqu'au dernier bloc et comparaison des données.

## Limites de cette preuve

Ce petit essai confirme les allocations, les liaisons GPU, la capture, la persistance et le passage dans l'encodeur. Il ne mesure ni la fidélité au rendu direct, ni le débit, ni le pic mémoire physique. La régression visuelle 4K dense, les matériaux extrêmes, la saturation f16, les rotations/déformations et les évictions soutenues demandent encore une validation dédiée. Le budget est supplémentaire au moteur ouvert.

Les couronnes sont composées par frame en RGBA16F. Il n'existe pas de vidéos intermédiaires et pas de reprise du MP4 final. Les sources et copies sont reprenables. L'option OPFS est soumise au quota navigateur ; un dossier disque est recommandé pour les grandes sources.

## Correction de lenteur

Le lecteur attendait chaque bloc séparément. Il regroupe maintenant jusqu'à 32 blocs dans une même passe, avec 32 offsets d'uniformes distincts. L'attente de fin GPU demeure avant éviction et réutilisation des offsets. Deux tests couvrent l'absence de soumission intermédiaire et le blocage effectif de la libération jusqu'à la résolution de la barrière.

Le fragment rejette aussi les couronnes dont aucune partie du pixel AA ne peut relever, avant la boucle de prélèvements. L'empreinte utilise la demi-diagonale du pixel et une marge aux frontières radiales ; le miroir fixe conserve le chemin précédent.

Validation ciblée : 11 tests, TypeScript et Naga avec/sans effets de surface. Aucun facteur d'accélération mesuré. Les relectures de cache et les passes temporelles restent un chantier distinct.

## Export par couronnes successives

- Ordre du calcul : toutes les frames d'une couronne/portion de couronne, puis la suivante, sur tout le film. Pas de segment temporel.
- Intermédiaires RGBA16F recadrés, sans compression, intégrité SHA-256, reprise au dernier fichier fermé et publié.
- Composition GPU par additions linéaires, conversion sRGB à la fin, un seul encodage final.
- Essai manuel dans le navigateur intégré : ancienne source 32×18, 4 passes de 4 octaves maximum, durée 0,1 s à 30 fps, AA 16, HEVC. Le panneau confirme « Vidéo enregistrée · 3/3 » et fournit le MP4. Aucune erreur GPU relevée. Une recompilation entre les essais a laissé les intermédiaires reprenables.
- 214 tests ciblés passent et TypeScript passe. Le test de régression des effets a détecté puis permis de corriger une perte de snapshot introduite lors de l'extraction de la trajectoire commune.
- Le recadrage radial supplémentaire pour les déformations est couvert par test de dimensions ; il ne constitue pas une comparaison de pixels sur GPU.
- Débit, bénéfice disque/GPU et fidélité 4K dense non mesurés. Les intermédiaires du film entier peuvent être volumineux ; l'estimation est indicative, fondée sur la vue de départ.

## Optimisations conservatrices après revue

Les lots pleins de 32 draws sont soumis sans attendre leur fin. `flush` attend aussi les lots déjà soumis lorsque le lot courant est vide ; les évictions, la fin de trame et les sorties sur erreur drainent ces travaux. Les écritures des slots réutilisés suivent la soumission précédente dans la queue.

Initialisation des paramètres et palette path une fois par fragment, après rejet radial ; rayon/ratio/coordonnées neutres partagés uniquement entre les quatre voisins du même sous-échantillon. Même ordre d'accumulation, même format et mêmes positions AA. Rectangle de couronne transmis au rendu, filtre calculé une fois par trame, payload vérifié utilisé par vue sans les deux copies explicites précédentes. Cache LRU et composition restent inchangés.

Validation : 30 fichiers / 216 tests réussis, `npx vue-tsc -b`, Naga sur color.wgsl concaténé au shader ExpMap avec ENABLE_SURFACE_EFFECTS=0 et =1. Test ajouté pour deux lots pleins suivis d'une éviction : aucune attente intermédiaire, barrière finale obligatoire même sans lot partiel. Aucun benchmark ni comparaison visuelle GPU effectué pour cette modification ; le gain reste à mesurer.

## MP4 intermédiaires compressés

Le chemin successif encode maintenant la couleur en MP4, au débit choisi et proportionnel à la surface de la couronne, avec poids AA f16 séparés en gzip sans perte. Les rectangles sont fixes pendant le film. Le checkpoint porte sur les couronnes finalisées, et le namespace v3 ne reprend pas les anciennes images brutes.

Validation : 30 fichiers / 218 tests, TypeScript, shader de capture/restauration validé par Naga. Le test manuel `ring-video-smoke.html`, ouvert dans le navigateur intégré sur le serveur Vite, a exercé WebGPU + HEVC + OPFS sur quatre couronnes synthétiques de trois images : annulation après la première image de la deuxième couronne, reprise conservant la première, finalisation, décodage final, nouvelle reprise sans recalcul, puis nettoyage. Résultat : PASS, quatre MP4 et douze masques gzip (5977 octets sur ces aplats synthétiques), aucun fichier couleur brut. Vérification du masque GPU exact f16=0.5 et de trois positions de couleur décodée avec tolérance de compression de 12 niveaux sur 255. Pas de benchmark ; ce volume synthétique ne prédit pas le taux de compression d'une fractale. Aucun résultat de fidélité 4K déduit de ce test.
