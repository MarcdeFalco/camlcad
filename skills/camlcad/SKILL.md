---
name: camlcad
description: Écrire un fichier de modèle camlcad (.ml, CAO paramétrique en OCaml pour l'impression 3D et les mécanismes) qui s'ouvre tel quel dans l'éditeur camlcad. À utiliser quand on demande une pièce, un boîtier, un support, un engrenage, une charnière ou un mécanisme « pour camlcad » ou en OCaml paramétrique.
---

# Produire un fichier camlcad

camlcad est une CAO paramétrique où **le code OCaml est la seule source de vérité** :
l'éditeur web (façon Fusion 360) compile le fichier dans un toplevel OCaml avec le ppx
`ppx_cad`, affiche la pièce, une frise des features et un curseur par paramètre. Le
livrable de cette skill est **un seul fichier `.ml`** que l'utilisateur ouvre par
*Fichier > Ouvrir…* (ou colle dans le panneau Code).

Avant d'écrire : lire `references/api.md` (signatures exactes) ; pour un mécanisme,
`references/mecanismes.md` ; pour les cotes d'impression, `references/impression-3d.md`.
Partir de l'exemple le plus proche dans `examples/` (tous vérifiés : ils compilent, leurs
solides sont fermés, le mécanisme n'a pas d'interférence sur sa course).

| Exemple | Montre |
|---|---|
| `examples/boite.ml` | boîte + couvercle emboîté, coins arrondis (`Profile.offset`), garde-fou `Doc.fail`, deux corps |
| `examples/equerre.ml` | esquisse contrainte `let%sketch` sur `Plane.xz`, gousset, trous fraisés |
| `examples/molette.ml` | révolution, réseau circulaire, taraudage ISO (`Cad_parts.Thread`), texte gravé |
| `examples/cremaillere.ml` | mécanisme : pignon (`Cad_parts.Gear`), crémaillère, pivot, glissière, couplage |

## Structure obligatoire

```ocaml
(* Une ligne : ce qu'est la pièce et comment elle s'imprime. *)
open Cad
open Geom                      (* V2, V3, Frame, Plane sans préfixe *)

let model : Shape.t Doc.t =    (* mécanisme : Cad_mech.Assembly.t Doc.t *)
  let%param longueur = 60. [@range 20., 150.] [@unit "mm"] in
  let%param epaisseur = 4. [@range 2., 10.] [@unit "mm"] in
  let%param diametre = 5. [@range 2., 10.] [@unit "mm"] in
  let%feat plaque = Shape.cube (V3.v longueur 20. epaisseur) in
  let%feat trou =
    Shape.(cylinder ~r:(diametre /. 2.) ~h:(epaisseur +. 2.) () |> translate (V3.v (longueur /. 2.) 10. (-1.)))
  in
  let%feat piece = Shape.(plaque - trou) in
  Doc.return piece
```

- `open Cad` en tête ; une valeur **`model`** au niveau supérieur, annotée de son type
  (`Shape.t Doc.t` ou `Cad_mech.Assembly.t Doc.t`) ; c'est elle que l'éditeur cherche.
- `let%param` : toutes les cotes qu'on voudrait régler, valeur **littérale flottante**
  (`5.`), `[@range lo, hi]` (le défaut dedans) et `[@unit "mm"]` / `[@unit "°"]`.
- `let%feat` : chaque étape de construction nommée (elle apparaît dans la frise, se
  sélectionne, se supprime temporairement) ; le résultat final aussi, puis `Doc.return`.
- Les calculs intermédiaires (`let r = d /. 2. in`, fonctions locales) sont du simple
  OCaml entre les `let%`.
- Les profils esquissés vont dans une fonction qui rend `Sketch.region Sketch.t`, liée par
  `let%sketch p = profil ~cote1 ~cote2 in` (voir `examples/equerre.ml`).
- Bibliothèques disponibles sans `open` : `Cad_parts` (Gear, Thread, Text), `Cad_mech`
  (Part, Joint, Assembly), `Cad_export`. Rien d'autre (pas de bibliothèque tierce).

## Conventions géométriques (sources d'erreurs fréquentes)

- Unités : **mm et degrés**. Arithmétique flottante : `+.` `-.` `*.` `/.`, `float i`,
  `Float.pi`, `Float.round`. Paramètre entier : `int_of_float (Float.round p)`.
- `Shape.cube (V3.v x y z)` : coin à l'origine (`~center:true` pour centrer).
  `Shape.cylinder ~r ~h ()` : axe Z, de z = 0 à h (**le `()` est obligatoire**).
  `Profile.rect ~w ~h ()` aussi. `Shape.sphere ~r` centrée.
- `Shape.extrude ~h p` : le profil (plan XY) monte de z = 0 à h. Sur un autre plan :
  `Shape.(extrude ~h p |> place Plane.xz)` ; `Plane.xz` = vue de face (x = X, y = Z),
  extrusion vers **−Y** ; `Plane.yz` extrude vers +X ; `Plane.offset d plan` le décale.
- `Shape.revolve p` : x du profil = rayon (≥ 0), y = hauteur ; l'axe devient Z.
- `Shape.rotate ~axis ~deg` tourne autour d'un axe passant par **l'origine** : tourner
  d'abord, translater ensuite. Rotation de +90° autour de Y : l'axe Z devient +X.
- `Profile.polygon` : sommets dans le **sens trigonométrique** (un contour horaire seul
  donne un profil vide). `Profile.offset` arrondit les coins.
- Dans `Shape.( … )`, `+ - *` sont union, différence, intersection : y écrire les
  opérations sur les formes, et faire l'arithmétique entière en dehors.
- Les outils de coupe **dépassent** des faces (≥ 0,01 mm, typiquement 1 mm).
- Aucune fonction de congé ou de chanfrein 3D : un chanfrein se fait par le profil
  (révolution, extrusion d'un polygone) ou `~scale_top` / `~taper` d'une extrusion ; un
  arrondi vertical par `Profile.offset`.
- **Fonctions courtes.** Le toplevel de l'éditeur (OCaml 5) refuse une fonction dont la
  pile dépasse un seuil (erreur « The external function caml_ensure_stack_capacity is not
  available ») : au-delà d'une dizaine de `let` locaux ou d'expressions très imbriquées
  dans une même fonction, découper (une fonction par pièce ou sous-ensemble, comme
  `examples/cremaillere.ml`). Les `let%param` / `let%feat` de `model` ne comptent pas :
  chacun ouvre sa propre fonction.
- Pas d'exception : les fonctions qui lèvent `Invalid_argument` (`Thread.pitch` hors
  M2–M24, `Gear.spur` avec moins de 4 dents, `Text.profile ~size:0.`…) se protègent
  par les `[@range]` ou par un garde-fou :
  ```ocaml
  let open Doc.Syntax in
  let* () = if rayon <= paroi then Doc.fail ~loc:(Loc.of_pos __POS__) "rayon trop petit" else Doc.return () in
  ```

## Impression 3D (résumé ; détails dans `references/impression-3d.md`)

- Pièce posée sur le plateau : boîte englobante à **z = 0**, plus grande face plane en bas.
  Plusieurs corps : côte à côte, tous à z = 0, séparés de 5 à 10 mm, réunis par `+`.
- Parois ≥ 1,2 mm (2 mm pour un boîtier) ; surplombs ≤ 45° ; chanfreins dessous.
- Jeux : glissant 0,2–0,3 ; imprimé en place 0,3–0,5 ; engrenage `~backlash:0.15` ;
  trou de vis + 0,2 au rayon. Le jeu est toujours un `let%param jeu`.
- Orienter pour que l'effort ne sépare pas les couches ; le dire dans le commentaire de tête.

## Démarche

1. Reformuler la pièce : fonction, encombrement, interfaces (vis, axes, pièces voisines),
   imprimante si connue. Choisir l'exemple le plus proche.
2. Lister les paramètres (noms français en minuscules, sans accent ni mot-clé OCaml :
   `module_` et non `module`) avec défaut, bornes, unité.
3. Écrire les features dans l'ordre de modélisation : corps de base, ajouts, enlèvements,
   résultat. Chaque `let%feat` a un nom parlant, unique.
4. Relire avec la checklist ci-dessous, en calculant à la main au moins l'encombrement
   et une cote critique (ex. jeu réel entre deux pièces).
5. Livrer le fichier `nom_de_piece.ml` complet (jamais un extrait), puis en quelques lignes :
   paramètres principaux, orientation d'impression, points à vérifier à la première
   impression (jeux).

## Checklist de validation

- [ ] `open Cad` en tête ; `open Geom` si `V3`, `V2`, `Frame`, `Plane` sont sans préfixe ;
      `open Cad_mech` pour un mécanisme.
- [ ] `let model : Shape.t Doc.t =` (ou `Cad_mech.Assembly.t Doc.t`) au niveau supérieur ;
      la dernière expression est `Doc.return …`.
- [ ] Chaque `let%param` : flottant littéral, `[@range]` qui contient le défaut, unité ;
      noms uniques. Chaque `let%feat` : nom unique ; le motif est une variable.
- [ ] Toutes les fonctions et arguments existent dans `references/api.md` (labels exacts :
      `~r ~h ()`, `~w ~h ()`, `~axis ~deg`, `~normal`, `~module_ ~teeth ()`).
- [ ] Aucune fonction ordinaire avec plus d'une dizaine de `let` locaux (découper).
- [ ] Arithmétique flottante partout (`2. *. r`, pas `2 * r`) ; pas d'entier dans `Shape.( )`.
- [ ] Polygones anti-horaires, sans auto-intersection ; esquisses à 0 degré de liberté.
- [ ] Outils de coupe qui dépassent ; pièces jointes qui se chevauchent.
- [ ] Encombrement calculé ; z min = 0 ; tient sur le plateau (≈ 200 × 200 mm par défaut).
- [ ] Jeux et parois conformes ; le jeu est un paramètre.
- [ ] Aucun `[@range]` extrême ne rend un profil vide ou ne déclenche `Invalid_argument`
      (sinon garde-fou `Doc.fail`).
- [ ] Mécanisme : ports nommés, axes z des ports = axes des liaisons, liaisons en arbre
      depuis `~ground`, noms de liaisons donnés, couplages en bonnes unités.

## Si un dépôt camlcad et OCaml sont disponibles

Le fichier se vérifie pour de vrai : le copier dans `skills/camlcad/examples/`, puis
`dune build @check 2>&1 | head -50` (compilation avec le ppx, avertissements stricts), et
`Doc.run` du `model` dans un test (voir `test/test_skill.ml`). Sans dépôt, la checklist
ci-dessus tient lieu de compilation : la parcourir ligne à ligne.
