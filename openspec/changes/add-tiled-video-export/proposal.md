## Why

L'export vidéo haute résolution est aujourd'hui borné par la taille maximale des textures WebGPU et par la mémoire nécessaire au rendu supersamplé d'une image complète. Rendre le film tuile par tuile permet de conserver la réutilisation temporelle du moteur tout en bornant la mémoire GPU, puis d'assembler des vidéos intermédiaires compactes sans saturer la mémoire vive ni le disque.

## What Changes

- Ajouter un mode d'export vidéo tuilé qui rend successivement tout le parcours pour chaque tuile, au lieu de rendre toutes les tuiles de chaque frame.
- Projeter chaque tuile dans les coordonnées exactes de l'image complète, avec un halo conservé jusqu'à la composition afin d'éviter les coutures de filtrage et de compression.
- Résoudre le supersampling dans chaque tuile avant son encodage : le facteur ×2/×4/×8 augmente le coût de calcul, mais pas la résolution des vidéos intermédiaires.
- Conserver la session de rendu et la référence orbitale entre les tuiles. Un zoom à centre fixe réutilise ainsi la même référence chaude ; un travelling reste accepté mais peut reconstruire ou recentrer sa référence et être plus lent.
- Écrire chaque tuile comme un MP4 intermédiaire à haute qualité et à débit agrégé borné, puis effectuer une passe finale de décodage, composition et encodage.
- Borner la mémoire de la passe de composition en traitant les frames par petits groupes, sans exiger que toutes les vidéos de tuile soient décodées simultanément.
- Exposer une progression distincte pour le rendu des tuiles et pour la composition finale, avec annulation et nettoyage des fichiers temporaires.

## Capabilities

### New Capabilities

- `tiled-video-export`: découpage spatial, projection exacte, réutilisation de référence, vidéos intermédiaires, composition finale, reprise et nettoyage d'un export vidéo tuilé.

### Modified Capabilities

Aucune. La capacité est définie comme une extension du pipeline d'export existant sans modifier le contrat des exports non tuilés.

## Impact

- `src/videoExportRunner.ts` et `src/videoExportSession.ts` : orchestration tuile-majoritaire et progression multi-phase.
- `src/Engine.ts` et les shaders de projection/présentation : surface de travail de tuile, projection globale, halo, réinitialisation du champ sans réinitialiser la référence.
- `src/videoEncoderSink.ts` et une nouvelle chaîne de lecture/composition : MP4 intermédiaires mezzanine, décodage et encodage final.
- `src/components/VideoExportPanel.vue` et préférences associées : activation du tuilage, budget mémoire/qualité intermédiaire et affichage de progression.
- Stockage temporaire navigateur : plusieurs MP4 fragmentés dont le débit total, et non le débit individuel, respecte le budget choisi.
