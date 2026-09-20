# Sortie HDR

L’onglet Performance commence par la section Affichage : interrupteur HDR, état
court de la surface et diagnostic dépliable. Le menu Capture conserve seulement
le choix SDR / PNG HDR et l’exposition du fichier, indépendants de l’affichage.
Le diagnostic montre la capacité annoncée par `dynamic-range: high`, la configuration
du canvas, son espace colorimétrique et le dithering appliqué. Il ne mesure ni les
nits disponibles ni la profondeur physique de l'écran.

## Affichage

- SDR par défaut, sRGB, format préféré 8 bits, dithering ±0,5 LSB.
- HDR à la demande : `rgba16float`, sRGB étendu, `toneMapping.mode = extended`.
- L'activation vérifie la configuration retournée et les erreurs WebGPU ; en cas
  de refus, elle rétablit la configuration précédente.
- Les matériaux HDR contournent la compression des hautes lumières et le clamp
  SDR. L'AA et le cache de rotation restent en lumière linéaire flottante.
- Changer de mode invalide l'accumulation AA et le cache de couleur.

## Captures

- SDR : chemin PNG/WebP existant ; les vignettes restent SDR.
- HDR : rendu dédié, AA, lecture GPU RGBA float16, assemblage des tuiles sans
  conversion 8 bits, conversion linéaire sRGB → Rec.2020 → PQ, PNG RGB 16 bits.
- Le blanc linéaire 1 correspond à 203 nits à exposition 0 EV. L'exposition du
  fichier se règle dans le menu. La quantification PQ utilise un dithering 16 bits.
- Le chunk `cICP = [9,16,0,1]` signale Rec.2020/PQ/RGB/pleine plage.
- La compression zlib utilise `CompressionStream`, sans bibliothèque ni service.
- Les valeurs hors de la plage PQ de 10 000 nits et les valeurs non finies font
  échouer l'export explicitement : aucun écrêtage silencieux des hautes lumières.
- La capture est possible sur écran SDR et ne dépend pas de `toBlob()`.
- Les lecteurs/archives ExpMap restent SDR. Aucun export EXR.
- Un lecteur compatible PNG HDR est requis pour une présentation correcte.

Le stockage et l'accumulation GPU restent en float16 : ce n'est pas un format
scientifique sans limite ni une promesse de conservation de valeurs arbitraires.

## Vidéo depuis la fractale

- Dans Vidéo → Sortie → Dynamique : SDR 8 bits ou HDR 10 bits PQ, avec exposition
  indépendante de l'affichage (blanc linéaire 1 = 203 nits à 0 EV).
- Rendu et AA flottants, réduction du suréchantillonnage en lumière linéaire,
  lecture RGBA float16, conversion Rec.2020/PQ puis YUV 4:2:0 10 bits en plage
  limitée. Dithering ±0,5 LSB uniquement lors de cette dernière quantification.
- WebCodecs reçoit des images `I420P10` et un profil explicite : HEVC Main 10,
  AV1 10 bits ou VP9 profil 2. Pas de H.264 pour cette sortie HDR.
- La disponibilité dépend du navigateur, du codec, du pilote et des dimensions.
  Le panneau sonde le format d'entrée et la configuration. Au démarrage, une
  vraie image 10 bits est encodée et les métadonnées retournées sont contrôlées.
  L'essai préfère le matériel puis autorise le choix du navigateur ; aucun repli
  vers un encodage SDR. Un pilote qui ne confirme pas le 10 bits/PQ est refusé.
- Les paquets encodés sont placés dans un MP4 par Mediabunny, qui écrit
  `colr/nclx` Rec.2020/PQ/BT.2020 non constant/limited range. Les changements de
  métadonnées pendant le film sont également contrôlés. Pas de métadonnées
  Dolby Vision ni de promesse HDR10+.
- Les horodatages, l'écriture directe sur disque et la conservation des images
  déjà encodées lors d'une interruption restent disponibles. La mémoire de
  conversion est limitée à une image ; le mode tampon garde toujours le fichier.
- Au-delà de 10 000 nits, l'export demande de réduire l'exposition au lieu
  d'écrêter les reflets. La vidéo est limitée à 60 images/s et aux dimensions paires.
- Les deux parcours vidéo ExpMap restent SDR dans cette version, et le panneau
  l'indique. Une archive déjà cuite en SDR ne permet pas de récupérer les reflets
  perdus ; le parcours recolorable nécessite encore un raccordement HDR séparé.

## Validation

Tests unitaires : décodage indépendant du PNG, CRC, décompression zlib, valeurs
PQ au-dessus du blanc SDR, assemblage des tuiles, annulation, erreurs et modes
de présentation. TypeScript et variantes WGSL validés statiquement.
La vidéo est couverte par des tests de conversion PQ/10 bits, de métadonnées,
de sélection d'encodeur, de conservation de la chronologie et d'annulation.
Les tests de conteneur utilisent le vrai muxer avec un encodeur simulé et
contrôlent les octets MP4 : ils ne prouvent pas la compatibilité d'un codec natif.

À vérifier sur matériel HDR : blanc SDR et reflets plus lumineux, bascule SDR/HDR,
AA, rotation, changement d'écran, capture 4K/8K, lecture du PNG dans un lecteur HDR,
puis retour au rendu interactif. Ces vérifications physiques n'ont pas été exécutées.
Pour la vidéo : encodage natif réel HEVC/AV1/VP9 selon support, lecture des reflets
sur écran HDR et inspection du fichier dans un outil vidéo restent à valider.
