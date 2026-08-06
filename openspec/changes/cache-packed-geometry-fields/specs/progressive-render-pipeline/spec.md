## MODIFIED Requirements

### Requirement: Équivalence des deux chemins
Le chemin compute in-place SHALL produire un état d'orbite brut équivalent à celui du chemin render ping-pong pour toute frame éligible. Le resolve des deux chemins SHALL produire le même display set typé composé de `iter`, `z.x`, `z.y`, `geometry` et `metadata`, au bruit de contraction FMA et de quantification `rgba16float` documenté près.

#### Scenario: Comparaison visuelle à convergence
- **WHEN** une même scène converge entièrement avec le flag in-place actif puis inactif
- **THEN** les champs du display set et l'image colorisée sont équivalents dans les tolérances f32/f16 définies, sans motif structuré

#### Scenario: Provenance des deux chemins
- **WHEN** les deux chemins résolvent le même état brut exact ou temporairement interpolé
- **THEN** ils encodent le même exposant de provenance, la même phase stripe quantifiée et la même cohérence quantifiée

### Requirement: Gating du resolve hors convergence
Quand le dernier readback indique zéro travail restant et que la version du champ, sa transformation, le snapshot frozen et le merge sont inchangés, le moteur SHALL sauter le resolve. La passe color SHALL relire le dernier display set typé valide; elle SHALL NOT contourner ce cache en lisant directement l'état brut.

#### Scenario: Image convergée à l'idle
- **WHEN** l'image est entièrement convergée et que seule la palette ou le matériau change
- **THEN** resolve n'est pas exécuté et color lit le display set caché

#### Scenario: Snapshot frozen pendant le gating
- **WHEN** un `needFreezeSnapshot` ou un merge survient alors que le gating serait actif
- **THEN** le moteur vérifie la version du display set, exécute les conversions nécessaires et crée un snapshot cohérent avant colorisation

#### Scenario: Champ modifié
- **WHEN** le contenu brut, le bailout, l'approximation ou la transformation de source change
- **THEN** le resolve requis s'exécute avant que le nouveau display set soit marqué valide

### Requirement: Picking cohérent sous gating
`readIterationDataAt` SHALL retourner les données du dernier display set typé valide lorsque resolve a été sauté. Les champs exposés SHALL être décodés depuis les attachements correspondant à la même version de champ.

#### Scenario: Picking après convergence avec gating
- **WHEN** l'utilisateur lit les données d'un pixel après plusieurs frames color-only
- **THEN** iteration, `z`, distance, géométrie et métadonnées correspondent au dernier champ convergé et non à un mélange de versions
