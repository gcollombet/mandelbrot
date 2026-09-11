# Vérification des règles Firebase — 11 septembre 2026

Les règles Firestore ont été publiées sur `gcollombet-mandelbrot` le
11 septembre 2026 à 20:28:57 UTC. Une relecture de Firebase Rules API a confirmé
que le contenu actif correspond exactement à `firestore.rules`.

- Ruleset Firestore : `d1cb086b-06bb-4d5f-aae6-dea9a7c11478`
- SHA-256 : `45e1f034703e97b0cdaa701d3f6d8f132437600e245be2a089ef2c80ff866401`
- Les règles Storage, non modifiées et non redéployées, correspondent aussi au
  fichier local testé : ruleset `3d01e429-66ec-45be-9d20-bb9577f83e0f`.
- Aucun déploiement du frontend ni modification des données de production.

## Vérifications exécutées

`npm run test:security` : **27 tests réussis** sur les émulateurs officiels
Firestore et Storage, avec le projet isolé `demo-mandelbrot-rules`.
Les tests refusent de démarrer sans les variables des émulateurs.
Java 21 et Firebase CLI sont nécessaires ; les émulateurs peuvent être téléchargés
au premier lancement. Les données créées par les tests restent dans les émulateurs.

Les tests couvrent :

- Lecture, énumération, écriture et suppression privées interdites aux visiteurs,
  aux autres comptes et aux administrateurs du catalogue.
- Accès du propriétaire à ses presets, textures, manifestes, compteurs,
  réservations et lots d'import.
- Catalogue public lisible par document ; publication et énumération réservées
  aux administrateurs, via des claims de confiance ou `admins/{uid}`.
- Auto-attribution du rôle administrateur et chemins inconnus interdits.
- Compatibilité des anciens documents avec les nouveaux champs facultatifs
  `favorite` et `blobHash` ; refus des types et empreintes invalides.
- Refus des UID, GUID, chemins Storage, tailles, dimensions et révisions invalides.
- Upload Storage privé soumis à une réservation non expirée, au MIME WebP,
  au chemin autorisé et à la taille maximale de 5 Mio.

La compilation cloud des règles, `git diff --check` et TypeScript ont également
réussi. La relecture des règles actives confirme le déploiement ; les tests
d'autorisations utilisent des identités simulées dans les émulateurs, pas des
comptes ni des écritures de production.

Méthode : [tests de règles recommandés par Firebase](https://firebase.google.com/docs/firestore/security/test-rules-emulator).

## Limite de sécurité confirmée

Les quotas de **400 presets / 10 textures ne sont pas des plafonds anti-abus**.
Un propriétaire peut créer directement un preset ou une réservation alors que
son compteur est déjà à la limite : les règles ne lient pas atomiquement ces
créations aux compteurs/manifestes. Un test explicite reproduit cette possibilité.
Un client modifié peut donc consommer du stockage et des opérations au-delà des
limites de l'interface, sans obtenir l'accès aux autres comptes.

Ce problème préexistait à la publication des champs `favorite` et `blobHash`.
Le corriger demande de rendre les quotas autoritaires côté règles ou serveur,
en conservant la compatibilité des transactions de sauvegarde. Cette publication
n'apporte pas cette protection.

Les règles vérifient le MIME déclaré et la forme d'une empreinte SHA-256,
mais ne décodent pas une image WebP et ne calculent pas son empreinte : ces
contrôles de contenu sont effectués par le client. Cette vérification porte sur
les règles Firebase, pas sur un audit complet de l'IAM GCP, des dépendances ou
de la sécurité du frontend.
