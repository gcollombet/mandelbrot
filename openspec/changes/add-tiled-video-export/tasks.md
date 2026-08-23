## 1. Risques techniques et contrats purs

- [ ] 1.1 Réaliser un spike ciblé Mediabunny/WebCodecs qui encode un petit MP4 fragmenté, rouvre un bloc depuis une keyframe, décode plusieurs frames par timestamp et ferme proprement le décodeur
- [ ] 1.2 Définir les types `FullFrameGeometry`, `TileCore`, `ExpandedTile`, `TilePlan` et `CompositionPlan` sans dépendance GPU
- [ ] 1.3 Implémenter le planificateur déterministe qui partitionne toute la sortie et tient compte du halo, du supersampling, de `maxTextureDimension2D` et du budget mémoire
- [ ] 1.4 Implémenter la répartition du débit agrégé par surface étendue avec conservation de la somme après arrondi
- [ ] 1.5 Implémenter les estimateurs de volume temporaire, de marge de conteneur et de mémoire de composition par bloc
- [ ] 1.6 Ajouter les tests unitaires de partition, bords non divisibles, contraintes matérielles, débit agrégé et estimation de 3,0 Go pour 60 s à 400 Mbit/s

## 2. Projection globale d'une tuile

- [ ] 2.1 Séparer dans la configuration d'export la géométrie globale de sortie et la géométrie locale de la région étendue
- [ ] 2.2 Ajouter aux uniformes de projection l'origine et la taille de la région étendue exprimées en pixels finals globaux
- [ ] 2.3 Modifier le calcul de coordonnées pour transformer chaque centre de pixel local en centre de pixel global avant aspect, échelle et rotation
- [ ] 2.4 Conserver l'aspect et l'étendue de l'image complète dans `syncReferenceWorkerView` et les certificats lorsque la surface de calcul est une tuile
- [ ] 2.5 Adapter les dimensions de dispatch, textures de travail, cibles linéaires et buffers de capture à la région locale supersamplée
- [ ] 2.6 Produire une capture de coeur non compressée et vérifier numériquement son égalité avec le rectangle correspondant d'un rendu monolithique sans rotation
- [ ] 2.7 Étendre la vérification de projection à une rotation non nulle et aux quatre frontières entre tuiles

## 3. Halo et résolution supersamplée

- [ ] 3.1 Calculer les régions étendues en distinguant support Mitchell, voisinage de rendu et marge codec
- [ ] 3.2 Adapter la capture d'export pour réduire la région étendue en lumière linéaire puis créer un `VideoFrame` à sa résolution finale locale
- [ ] 3.3 Conserver les métadonnées de rognage du coeur dans le plan et dans le manifeste, y compris pour les tuiles de bord
- [ ] 3.4 Ajouter les tests unitaires des halos intérieurs, halos tronqués aux bords et coordonnées de rognage après réduction

## 4. Session moteur et référence chaude

- [ ] 4.1 Ajouter une opération de changement de tuile qui invalide champs progressifs, compteurs, accumulation AA, zoom frozen/live et caches de présentation sans vider `activeRef`, l'orbite ni les tables compatibles
- [ ] 4.2 Garder une seule session d'export et un seul worker de référence pendant le rendu de toutes les tuiles
- [ ] 4.3 Replacer le navigateur sur A et recréer la transition A→B pour chaque tuile en conservant `elapsedForFrame` comme horloge absolue
- [ ] 4.4 Garantir qu'un retour de la profondeur finale vers A ne raccourcit pas l'orbite déjà disponible et ne force pas une reconstruction à centre identique
- [ ] 4.5 Conserver les recentrages normaux pour un travelling et bloquer l'émission tant que la référence globale courante n'est pas valide
- [ ] 4.6 Ajouter des compteurs de diagnostic distinguant réutilisations, prolongements et reconstructions de référence par tuile
- [ ] 4.7 Ajouter des tests ciblés du reset sélectif et du maintien de la référence sur plusieurs parcours répétés à centre fixe

## 5. Encodage mezzanine et stockage temporaire

- [ ] 5.1 Étendre `createVideoSink` avec un débit explicite, un profil mezzanine distinct et un intervalle de keyframes exprimé en frames
- [ ] 5.2 Ajouter un test préalable encodage+décodage du codec intermédiaire avant toute session longue
- [ ] 5.3 Définir une abstraction de stockage temporaire en flux et implémenter son backend OPFS
- [ ] 5.4 Vérifier le quota et la capacité disponible avec une marge avant de créer la première tuile
- [ ] 5.5 Définir le manifeste versionné et calculer une empreinte couvrant parcours, rendu, animation, plan, halo, AA, codec, cadence et timestamps
- [ ] 5.6 Écrire atomiquement l'état du manifeste après finalisation de chaque MP4 de tuile
- [ ] 5.7 Implémenter la détection d'une session compatible, la reprise des tuiles manquantes et le refus de mélanger une session incompatible
- [ ] 5.8 Ajouter les tests unitaires du manifeste, de l'empreinte, de la reprise et du nettoyage du magasin temporaire simulé

## 6. Coordinateur de rendu tuile-majoritaire

- [ ] 6.1 Extraire une primitive qui rend un parcours complet vers un sink sans fermer la session moteur globale
- [ ] 6.2 Implémenter la boucle extérieure sur les tuiles, avec un sink mezzanine et la part de débit correspondante pour chacune
- [ ] 6.3 Propager l'annulation, les plafonds de pompes, les erreurs de codec et les erreurs de stockage en finalisant proprement le fichier courant
- [ ] 6.4 Publier une progression contenant phase, index de tuile, frames de la tuile, tuiles terminées, frames totales équivalentes et statistiques de référence
- [ ] 6.5 Vérifier que l'AA repart pour chaque frame locale et qu'aucune frame incomplète n'est remise au sink
- [ ] 6.6 Ajouter les tests du coordinateur avec moteur et sinks simulés pour verrouiller l'ordre `tuile → frames`, la reprise et l'annulation

## 7. Décodage et composition finale

- [ ] 7.1 Implémenter une source de frames intermédiaires capable d'ouvrir une tuile, de commencer sur la keyframe du bloc et de livrer `K` frames ordonnées
- [ ] 7.2 Implémenter un pool borné de décodeurs qui traite davantage de tuiles que de sessions actives
- [ ] 7.3 Allouer un anneau de `K` cibles finales compatible avec le budget de composition et le réutiliser entre blocs
- [ ] 7.4 Copier uniquement le coeur décodé de chaque tuile vers ses coordonnées exactes dans chaque cible finale
- [ ] 7.5 Encoder les frames composées dans l'ordre avec les timestamps et durées du chemin monolithique
- [ ] 7.6 Garantir que la phase de composition n'appelle aucun calcul fractal, prédicat de convergence ou accumulation AA
- [ ] 7.7 Finaliser la destination finale avant de supprimer les MP4 et le manifeste temporaires
- [ ] 7.8 Ajouter les tests du compositeur avec tuiles synthétiques colorées, halos distinctifs, nombre de tuiles supérieur à la taille du pool et dernier bloc incomplet

## 8. Interface et préférences

- [ ] 8.1 Ajouter au panneau vidéo le choix monolithique/tuilé/automatique et afficher le motif du choix automatique
- [ ] 8.2 Ajouter les réglages de budget mémoire GPU, halo, débit mezzanine agrégé et budget de composition avec normalisation persistante
- [ ] 8.3 Afficher avant lancement le plan de tuiles, la taille maximale de surface, le volume temporaire estimé, le quota disponible et le volume final estimé séparément
- [ ] 8.4 Afficher distinctement les phases rendu des tuiles et composition, ainsi que les reconstructions de référence qui expliquent un travelling lent
- [ ] 8.5 Ajouter les actions annuler et conserver pour reprise, abandonner et nettoyer, reprendre, et supprimer une ancienne session incompatible
- [ ] 8.6 Préserver strictement le comportement et les préférences de l'export monolithique lorsqu'aucune option tuilée n'est active

## 9. Vérification qualité et performance

- [ ] 9.1 Comparer des sorties non compressées monolithiques et tuilées sur vues sans rotation, avec rotation et avec tuiles de bord irrégulières
- [ ] 9.2 Construire une mesure dédiée aux bandes de couture et fixer la tolérance numérique avant compression
- [ ] 9.3 Comparer visuellement et par métriques un encodage direct avec la chaîne mezzanine+finale sur des filaments, palettes contrastées, relief et orbit traps
- [ ] 9.4 Mesurer plusieurs débits mezzanine autour de 400 Mbit/s agrégés en 4K30 et documenter le coût qualité de la seconde génération
- [ ] 9.5 Mesurer le débit de composition pour plusieurs tailles de bloc, intervalles de keyframe et tailles de pool sans inclure le temps de rendu fractal
- [ ] 9.6 Vérifier qu'un zoom droit réutilise la référence chaude entre tuiles et mesurer séparément le surcoût d'un travelling accepté
- [ ] 9.7 Effectuer la validation réelle WebGPU et les éventuels scénarios Playwright uniquement après confirmation explicite de l'utilisateur

## 10. Documentation et livraison

- [ ] 10.1 Documenter le calcul du volume `débit agrégé × durée / 8`, l'indépendance vis-à-vis du supersampling et le surcoût du fichier final
- [ ] 10.2 Documenter que les travellings restent corrects mais peuvent reconstruire les références pour chaque tuile
- [ ] 10.3 Documenter la reprise, la durée de vie des temporaires, le quota OPFS et la procédure de nettoyage
- [ ] 10.4 Exécuter les tests unitaires et le typecheck ciblés, puis consigner séparément validation statique, mesures CPU, résultats navigateur/GPU et inspection visuelle

