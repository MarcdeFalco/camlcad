# Concevoir pour l'impression 3D (FDM, buse 0,4 mm)

Valeurs de départ raisonnables ; en faire des `let%param` avec `[@range]` pour que
l'utilisateur les ajuste à son imprimante sans toucher au code.

## Épaisseurs

| Élément | Valeur | Remarque |
|---|---|---|
| Paroi minimale | 0,8 mm | 2 lignes de buse ; 1,2 à 2 mm pour une pièce qui travaille |
| Paroi de boîtier | 2 mm | multiple de 0,4 (lignes entières) |
| Fond, dessus | ≥ 1 mm | 5 couches de 0,2 mm |
| Détail en relief / gravé | ≥ 0,4 mm de profondeur | multiple de la hauteur de couche (0,2) |
| Texte | hauteur ≥ 4 mm, trait ≥ 0,5 mm | `Text.profile ~size:4.` (trait = size / 7) |
| Tige, ergot | ≥ 2 mm de diamètre | plus fin casse aux couches |

## Jeux (à ajouter au rayon ou à l'épaisseur selon le cas)

| Ajustement | Jeu | Exemple |
|---|---|---|
| Serré (emmanché) | 0,1 mm | goupille dans un trou |
| Glissant | 0,2 à 0,3 mm | couvercle emboîté, glissière |
| Imprimé en place (pièces mobiles) | 0,3 à 0,5 mm | charnière, rotule |
| Engrenages | 0,1 à 0,2 mm | `Gear.spur ~backlash:0.15` |
| Trou de vis traversant | + 0,2 mm au rayon | vis M4 : r = 2,2 |
| Taraudage imprimé | `Thread.tap ~clearance:0.15` | fiable à partir de M5 ; dessous, prévoir un trou à fileter ou un écrou |
| Écrou prisonnier | + 0,2 mm sur plat | hexagone : `Profile.polygon` à 6 sommets |

Les trous horizontaux sortent légèrement ovales (le haut s'affaisse) : donner 0,1 à
0,2 mm de plus, ou une forme en goutte (cercle + triangle pointant vers le haut).

## Orientation et surplombs

- Poser la plus grande face plane sur le plateau, à **z = 0** (la boîte englobante doit
  commencer à z = 0). Plusieurs corps imprimés ensemble : tous à z = 0, séparés d'au
  moins 5 à 10 mm.
- Surplomb ≤ 45° sans support. Un dessous à 45° (chanfrein) s'imprime, un congé horizontal
  non : préférer les chanfreins sous la pièce, les arrondis dessus.
- Pont (bord à bord, horizontal) : ≤ 10 à 20 mm.
- Les couches sont le point faible : orienter pour que l'effort ne les sépare pas (une
  équerre s'imprime couchée sur son profil en L, pas debout).
- Les trous verticaux (axe Z) sont les plus ronds et précis.
- Patte d'éléphant : un chanfrein de 0,4 à 0,6 mm au bas d'une pièce qui doit s'emboîter.

## Géométrie propre pour le noyau

- **Outils de coupe qui dépassent** : un trou, une poche, une gravure doivent dépasser
  la face de 0,01 à 1 mm (`~h:(e +. 2.)` translaté de −1) : une différence à faces
  confondues peut laisser une peau.
- **Pièces jointes qui se chevauchent** de 0,01 mm plutôt que de se toucher par une face.
- **Polygones dans le sens trigonométrique** (anti-horaire), sans auto-intersection.
- Solides réels : pas de volume nul, pas de profil vide (vérifier les paramètres extrêmes
  des `[@range]`).
- Réseaux : `Shape.union (List.init n …)` plutôt qu'une boucle d'unions imbriquées.
- Filetage : environ 5 000 triangles par tour ; éviter des dizaines de filetages longs.
