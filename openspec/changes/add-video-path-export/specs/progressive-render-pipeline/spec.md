## ADDED Requirements

### Requirement: Prédicat de convergence réutilisable
Le moteur SHALL exposer la condition « champ convergé sur preuve fraîche » sous forme d'un prédicat unique, incluant l'absence de readback de compteur en vol pour la génération courante. Le déclenchement de l'AA automatique et la capture d'un échantillon AA SHALL consommer ce prédicat au lieu de réimplémenter ses termes.

`needsMoreFrames()` NE SHALL PAS consommer ce prédicat : elle répond à « reste-t-il du travail ? », question distincte, et inclure la garde de fraîcheur y provoquerait un livelock — un readback étant planifié à chaque frame rendue, chaque frame justifierait la suivante et le moteur n'atteindrait jamais l'idle.

#### Scenario: Compteur périmé
- **WHEN** le compteur `unfinished` rapporté est inférieur au seuil d'idle mais date d'avant la dernière mutation du champ raw
- **THEN** le prédicat est faux, et aucun consommateur ne considère l'image comme convergée

#### Scenario: Readback en vol
- **WHEN** un readback de compteur est en vol pour la génération courante
- **THEN** le prédicat est faux jusqu'à sa résolution

#### Scenario: La boucle de rendu atteint l'idle
- **WHEN** le champ est convergé et plus aucune source de travail n'est active
- **THEN** `needsMoreFrames()` devient faux, sans être maintenue vraie par la présence d'un readback de compteur en vol

#### Scenario: Comportement temps réel inchangé
- **WHEN** le moteur tourne en mode temps réel après l'extraction du prédicat
- **THEN** `needsMoreFrames()` et l'AA automatique se comportent à l'identique du comportement antérieur

### Requirement: Variante de convergence tolérant un cycle de zoom actif
Le moteur SHALL exposer une variante du prédicat de convergence qui omet le seul terme `isZoomActive`, tous les autres termes restant identiques. Cette variante SHALL être réservée au mode export et NE SHALL PAS modifier le prédicat consommé en temps réel.

#### Scenario: Convergence sous cycle de zoom
- **WHEN** l'état de zoom est `reprojecting`, le champ est convergé et les gardes de fraîcheur du compteur sont satisfaites
- **THEN** la variante d'export est vraie tandis que le prédicat temps réel reste faux

#### Scenario: Champ non convergé sous cycle de zoom
- **WHEN** l'état de zoom est `reprojecting` et des pixels restent au-dessus du seuil d'idle
- **THEN** la variante d'export est fausse

#### Scenario: Effets de swap non consommés
- **WHEN** un `clearHistoryNextFrame`, un `needFreezeSnapshot` ou un `needMergeSnapshot` reste en attente
- **THEN** la variante d'export est fausse, quelle que soit la valeur du compteur

### Requirement: Seuil de magnification frozen/live paramétrable par session
Le seuil de magnification déclenchant le swap frozen/live SHALL être réglable pour la durée d'une session de rendu, et SHALL retrouver sa valeur par défaut à la fin de la session. Entre deux swaps, le moteur NE SHALL PAS armer d'effacement de la texture raw live, de sorte qu'une convergence serve toutes les frames du cycle.

#### Scenario: Seuil abaissé pour un export
- **WHEN** une session d'export fixe le seuil à 2
- **THEN** un swap survient dès que le facteur de zoom accumulé atteint 2, et le grossissement de la texture gelée reste borné par 2

#### Scenario: Aucune convergence perdue entre deux swaps
- **WHEN** la caméra avance d'un pas de zoom inférieur au seuil depuis le dernier swap
- **THEN** aucun effacement d'historique n'est armé et l'état de la texture raw live est conservé

#### Scenario: Restitution du défaut
- **WHEN** la session d'export se termine ou est annulée
- **THEN** le seuil retrouve sa valeur par défaut temps réel
