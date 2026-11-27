# Mécanismes (`Cad_mech`)

Un fichier de mécanisme définit `let model : Cad_mech.Assembly.t Doc.t` (au lieu de
`Shape.t Doc.t`). L'éditeur affiche alors une pièce par couleur, un curseur par
coordonnée, l'animation, les interférences et exporte un 3MF des pièces placées.

## API (signatures réelles)

```ocaml
(* Part : un solide dans SON repère propre + des ports (repères nommés) *)
type Part.t = private { name : string; shape : Cad.Shape.t;
                        ports : (string * Geom.Frame.t) list; color : (int * int * int) option }
val Part.make : ?color:int * int * int -> ?ports:(string * Geom.Frame.t) list -> string -> Cad.Shape.t -> Part.t
val Part.port : Part.t -> string -> Geom.Frame.t
val Part.( @: ) : Part.t -> string -> Part.t * string        (* Part.(piece @: "axe") *)

(* Joint : l'axe z du port est l'axe de la liaison *)
type Joint.kind = Fixed | Revolute | Prismatic
val Joint.fixed : ?name:string -> Part.t * string -> Part.t * string -> Joint.t
val Joint.revolute : ?name:string -> ?limits:float * float -> ?init:float -> Part.t * string -> Part.t * string -> Joint.t
val Joint.prismatic : ?name:string -> ?limits:float * float -> ?init:float -> Part.t * string -> Part.t * string -> Joint.t
  (* pivot : q en degrés autour de z ; glissière : q en mm le long de z *)

(* Assembly *)
type Assembly.coupling = { driver : string; driven : string; ratio : float }  (* q driven = ratio × q driver *)
val Assembly.make : ?loops:Joint.t list -> ?couplings:Assembly.coupling list -> ground:Part.t -> Joint.t list -> Assembly.t
val Assembly.solve : ?from:pose -> Assembly.t -> (string * float) list -> (pose, string) result
val Assembly.sweep : ?steps:int -> Assembly.t -> driver:string -> float * float -> (float * pose, string) result list
val Assembly.interferences : volume:(Cad.Shape.t -> float) -> ?tol:float -> Assembly.t -> pose -> (string * string * float) list
```

## Règles

- **Placement** : `repère(port enfant) = repère(port parent) ∘ mouvement(q)`. La pièce
  enfant est déplacée pour que son port coïncide avec celui du parent (après le
  mouvement). Si les deux ports ont le même repère local et que les pièces sont dessinées
  en coordonnées monde, la pose q = 0 est la pose dessinée : c'est le plus simple.
- L'axe **z du port** est l'axe de rotation ou de translation. Pour une glissière le long
  de X : `Frame.make ~origin:V3.zero ~x:V3.ey ~z:V3.ex`. Pour un pivot d'axe Z en (x, y, z) :
  `Frame.at x y z`.
- Les `joints` forment un **arbre** enraciné en `ground` (chaque autre pièce est l'enfant
  d'exactement une liaison). Une chaîne fermée (bielle-manivelle) : la liaison qui ferme
  la boucle va dans `~loops`, et ne peut être que `revolute` ou `fixed`.
- Le nom d'une liaison (`~name`) est le nom de sa coordonnée (curseur de l'éditeur,
  `driver`/`driven` des couplages). Nom par défaut : `"parent.port-enfant.port"` ; toujours
  en donner un.
- **Couplages** : engrenages `ratio = -. float z1 /. float z2` ; pignon (degrés) →
  crémaillère (mm) : `ratio = rp *. Float.pi /. 180.` avec `rp` le rayon primitif.
- Curseurs de l'éditeur : `~limits` s'il y en a, sinon ±180° (pivot) ou `init ± 50` mm.
- Pièces qui se touchent par une face : volume d'interférence nul, accepté. Pour une
  impression en place, laisser un **jeu** (0.3 à 0.5 mm) entre pièces qui bougent.
- Phase des engrenages : `Gear.spur` met une dent sur +x. Deux roues à l'entraxe
  `Gear.center_distance` engrènent si la roue 2 présente un creux face à la dent de la
  roue 1 : tourner son port de `180 / z2` degrés si `z2` est pair. Une crémaillère sous un
  pignon (en −90°) : creux en x = 0 si `z` est multiple de 4, sinon décaler la crémaillère
  de `(z mod 4) / 4` pas (voir `examples/cremaillere.ml`).
- `Assembly.make` lève `Invalid_argument` si l'arbre est invalide, `Part.make` si deux
  ports ont le même nom : l'éditeur affiche alors l'exception, sans localisation.

## Squelette

```ocaml
open Cad
open Geom
open Cad_mech

let make ?(jeu = 0.3) () =
  let bati = Part.make "bati" ~color:(90, 90, 90) (Shape.cube (V3.v 60. 20. 3.))
      ~ports:[ ("pivot", Frame.at 10. 10. 3.) ] in
  let bras = Part.make "bras" ~color:(220, 120, 40)
      Shape.(cube (V3.v 40. 8. 4.) |> translate (V3.v 0. (-4.) jeu))
      ~ports:[ ("axe", Frame.world) ] in
  Assembly.make ~ground:bati
    [ Joint.revolute ~name:"bras" ~limits:(-90., 90.) Part.(bati @: "pivot") Part.(bras @: "axe") ]

let model : Assembly.t Doc.t =
  let%param jeu = 0.3 [@range 0.1, 1.] [@unit "mm"] in
  Doc.return (make ~jeu ())
```

Dans un mécanisme, `let%feat` est possible mais facultatif : la frise montre les
paramètres, la vue montre les pièces. Les dimensions vont en `let%param` dans `model`,
la construction dans une fonction `make` à arguments optionnels (testable, réutilisable).
