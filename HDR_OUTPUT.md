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
- HDR : rendu dédié et AA flottants, puis passe GPU finale linéaire sRGB →
  Rec.2020 → PQ → RGB 16 bits big-endian. Seuls les octets PNG déjà convertis
  sont lus ; le JavaScript assemble les tuiles et le conteneur sans calcul de couleur.
- Le blanc linéaire 1 correspond à 203 nits à exposition 0 EV. L'exposition du
  fichier se règle dans le menu. La quantification PQ utilise un dithering 16 bits.
- Le chunk `cICP = [9,16,0,1]` signale Rec.2020/PQ/RGB/pleine plage.
- La compression zlib utilise `CompressionStream`, sans bibliothèque ni service.
- Les composantes dépassant 10 000 nits sont écrêtées sur le GPU. L’export
  continue avec un avertissement visible, une fois par capture/vidéo. Les valeurs
  non finies restent des erreurs.
- La capture est possible sur écran SDR et ne dépend pas de `toBlob()`.
- Les aperçus ExpMap restent SDR. Aucun export EXR.
- Un lecteur compatible PNG HDR est requis pour une présentation correcte.

Le stockage et l'accumulation GPU restent en float16 : ce n'est pas un format
scientifique sans limite ni une promesse de conservation de valeurs arbitraires.

## Vidéo depuis la fractale

- Dans Vidéo → Sortie → Dynamique : SDR 8 bits ou HDR 10 bits PQ, avec exposition
  indépendante de l'affichage (blanc linéaire 1 = 203 nits à 0 EV).
- Rendu et AA flottants, réduction du suréchantillonnage en lumière linéaire,
  puis passe GPU finale Rec.2020/PQ et YUV 4:2:0 10 bits en plage limitée.
  Le GPU empaquette directement les plans I420P10 ; aucune conversion de pixels
  en JavaScript. Dithering ±0,5 LSB lors de la dernière quantification.
- WebCodecs reçoit des images `I420P10` et un profil explicite : HEVC Main 10,
  AV1 10 bits ou VP9 profil 2. Pas de H.264 pour cette sortie HDR.
- Qualité constante par défaut : le panneau expose un quantificateur (VP9/AV1
  0–63, HEVC 0–51, défaut 10) envoyé image par image en `bitrateMode:
  'quantizer'`. Raison mesurée (Chrome 152, macOS) : le VP9 logiciel de Chrome
  tourne en vitesse temps réel quel que soit `latencyMode` et son débit variable
  sous-livre fortement (73 Mb/s pour 120 demandés en 4K, 153 Mb/s à Q4), d'où
  des artefacts « débit trop bas ». Si l'encodeur refuse ce mode, repli
  automatique sur l'estimation de débit variable, signalé par `sink.quantizer`.
- Plateforme (mesuré 2026-09) : sur macOS, Chrome n'accepte en 10 bits que le
  VP9 profil 2 ; HEVC Main 10 (VideoToolbox limité au Main 8 bits) et AV1 10
  bits (libaom sans haute profondeur) sont refusés par `isConfigSupported`.
  Firefox annonce AV1/VP9 10 bits mais refuse les `VideoFrame` I420P10 ; Safari
  n'a ni 10 bits ni PQ. Le flux VP9 de Chrome porte bien `color_space` BT.2020,
  plage limitée et 10 bits dans son en-tête : aucun patch de bitstream n'est
  nécessaire.
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
  conversion est limitée à une image ; la file d'entrée de l'encodeur est limitée
  à quatre images, en plus de ses tampons internes. Les sorties sont vidées à la
  finalisation uniquement, afin de préserver l'analyse temporelle du codec.
  Le mode tampon garde toujours le fichier.
- Au-delà de 10 000 nits, les reflets sont écrêtés avec avertissement, sans
  interrompre le film. La vidéo est limitée à 60 images/s et aux dimensions paires.
- La vidéo ExpMap recolorable, mono ou stéréo, utilise la même passe GPU finale.
  Le HDR suit actuellement le parcours image par image. Une archive RGB déjà
  cuite en SDR ne permet pas de récupérer les reflets perdus.

## Conversion GPU et transferts

`hdr_output.wgsl` normalise l'accumulation, applique l'exposition, la matrice
Rec.2020, la courbe PQ et la quantification avec dithering. Un indicateur GPU
distingue les valeurs non finies (erreur) des dépassements de 10 000 nits
(écrêtage avec avertissement).
Le PNG utilise les coordonnées de l'image complète pour le dithering des tuiles.
Les buffers de conversion/lecture sont limités à 32 Mio chacun et aux limites
réelles du périphérique, avec traitement par bandes pour les grandes images.
Le JavaScript ne fait que copier les bandes/plans, assembler les tuiles, écrire
les chunks PNG et leurs CRC, puis appeler la compression zlib native.
Les formules CPU précédentes sont conservées uniquement dans les références de tests.

## Validation

Tests unitaires : décodage indépendant du PNG, CRC, décompression zlib, valeurs
PQ au-dessus du blanc SDR, assemblage des tuiles, annulation, erreurs et modes
de présentation. TypeScript et variantes WGSL validés statiquement. Les tests
de transfert GPU utilisent un périphérique simulé pour vérifier les plans, les
bandes, les limites, les erreurs et l’annulation ; ils ne mesurent pas le GPU
et ne prouvent pas la précision numérique du shader sur matériel réel.
La vidéo est couverte par des tests de conversion PQ/10 bits, de métadonnées,
de sélection d'encodeur, de conservation de la chronologie et d'annulation.
Les tests de conteneur utilisent le vrai muxer avec un encodeur simulé et
contrôlent les octets MP4 : ils ne prouvent pas la compatibilité d'un codec natif.

À vérifier sur matériel HDR : blanc SDR et reflets plus lumineux, bascule SDR/HDR,
AA, rotation, changement d'écran, capture 4K/8K, lecture du PNG dans un lecteur HDR,
puis retour au rendu interactif. Ces vérifications physiques n'ont pas été exécutées.
Pour la vidéo : encodage natif réel HEVC/AV1/VP9 selon support, lecture des reflets
sur écran HDR et inspection du fichier dans un outil vidéo restent à valider.
