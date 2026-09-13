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

## Adressage direct GPU — 2026-09-13

`gather-gpu-check.html` compare manuellement dans le navigateur intégré le renderer complet utilisant une fonction de couleur synthétique identique dans les deux chemins. Douze comparaisons : limites d'octave avant/à/après, wrap angulaire, AA 256, Droste, kaléidoscope, pingpong, miroir, couronne partielle et portion de blocs ; limites de banques artificiellement réduites sur le même GPU pour forcer six banques et vingt passes. Les vues résidentes passent de 224–235 blocs à une passe. Répéter la même vue ne relit aucun bloc source. Le plus petit budget force le chemin de référence.

Résultat PASS : écart maximal RGB linéaire 0.0048828125, poids AA 0.0029296875 entre les deux ordres d'accumulation f16. Tolérances déclarées dans le test : 0.008 RGB et 0.004 alpha. Ce test vérifie l'adressage et l'intégration, pas la fidélité universelle de tous les matériaux ni la performance 4K. Naga valide aussi les shaders concaténés au vrai color.wgsl avec une et six banques et les variantes d'effets de surface. SHA-256 de color.wgsl inchangé : 6d03c4bd5552d8d080f67cff9987715f45294230e2379a027bc4f52f7312a29b.

Validation finale du chemin direct : 33 fichiers / 235 tests réussis, `npx vue-tsc -b` et `openspec validate ... --strict` réussis. Les deux variantes ENABLE_SURFACE_EFFECTS ont été validées avec une et six banques. Aucun benchmark ni test Playwright lancé.

## Fenêtre régulière résidente — 2026-09-13

Le retour utilisateur rapporte un débit divisé par deux avec le gather précédent. Il est remplacé par une texture régulière entière en couches, N+2 sous budget, avec assemblage compute bloc par bloc. La fenêtre conserve ses octaves communes et ses deux réserves. La variante courante lit les coordonnées 2D sans recherche de bloc ni divisions d’adressage ; une variante traite les dimensions dépassant la limite de texture via une disposition régulière sur plusieurs couches. Le shader couleur conserve exactement son SHA-256 précédent.

Validation : 34 fichiers / 241 tests ciblés réussis, TypeScript, sept validations Naga (fenêtre régulière/repli avec et sans effets de surface, référence par blocs avec et sans effets, upload compute), whitespace et OpenSpec strict. Les tests couvrent budget réel/padding/couches, absence de plafond 4, N+2, toutes les coordonnées de blocs et halos d’une petite grille repartie en couches, glissement avant/arrière/sauts, alias pingpong, réserves non rendues, annulation et publication incomplète, ordre des uploads et drainage GPU.

Le test manuel `window-gpu-check.html` dans le navigateur intégré utilise le renderer complet et une fonction de couleur synthétique partagée avec la référence. Douze comparaisons de pixels réussies : avant/à/après changement d’octave, wrap angulaire, AA 256, Droste, kaléidoscope, pingpong, miroir, couronne partielle, portion de blocs (repli historique), et limites artificiellement réduites pour forcer plusieurs couches et treize passes N=1. Deux passages complets après spécialisation de la lecture ont donné PASS. Écarts maximaux dus à l’ordre d’accumulation f16 : RGB linéaire 0.0048828125, alpha 0.0029296875 (tolérances 0.008/0.004). Aucune erreur GPU capturée.

Le test vérifie aussi zéro relecture sur une vue répétée, puis exactement une octave de blocs chargée au zoom d’une octave, sans recréer la fenêtre. Il vérifie le repli au budget minimal. Les MP4/masques intermédiaires gardent leur encodage ; identité de recette v5/window-v1 pour éviter une reprise mélangeant des rendus différents. Aucun benchmark ni Playwright. Ces résultats ne prédisent pas le débit d’un vrai export 4K ni la fidélité de tous les matériaux. Le premier remplissage assemble des octaves complètes, réserves incluses ; son coût est distinct du rendu des frames suivantes. Recharger l’application pour obtenir la nouvelle limite de textures du device.
