# Référence de l'API camlcad (signatures réelles)

Tirée des `.mli` du dépôt. Unités : **mm et degrés**. Tout ce qui n'est pas listé ici
n'existe pas : ne pas inventer de fonction (pas de `fillet`, `chamfer`, `hull`, `text`
3D, `hole`… dans `Shape`).

## Modules accessibles

| Chemin | Après `open Cad` | Après `open Geom` | Rôle |
|---|---|---|---|
| `Cad.Doc` | `Doc` | | monade du document (paramètres, features) |
| `Cad.Shape` | `Shape` | | solides symboliques |
| `Cad.Profile` | `Profile` | | profils 2D |
| `Cad.Sketch` | `Sketch` | | esquisses contraintes |
| `Cad.Loc` | `Loc` | | positions (`Loc.of_pos __POS__`) |
| `Geom.V2`, `Geom.V3` | | `V2`, `V3` | vecteurs |
| `Geom.Frame`, `Geom.Plane` | | `Frame`, `Plane` | repères, plans d'esquisse |
| `Cad_parts.Gear`, `.Thread`, `.Text` | | | engrenages, filetages, texte |
| `Cad_mech.Part`, `.Joint`, `.Assembly` | | | mécanismes (`open Cad_mech`) |

## Geom

```ocaml
(* V2 *)  type t = { x : float; y : float }
val V2.v : float -> float -> V2.t          val V2.zero : V2.t
val V2.add / sub : t -> t -> t             val V2.scale : float -> t -> t
val V2.rotate : deg:float -> t -> t        val V2.norm / dot / dist / normalize

(* V3 *)  type t = { x : float; y : float; z : float }
val V3.v : float -> float -> float -> V3.t
val V3.zero, V3.ex, V3.ey, V3.ez : V3.t
val V3.add / sub / cross : t -> t -> t     val V3.scale : float -> t -> t
val V3.of_v2 : ?z:float -> V2.t -> V3.t    val V3.neg / norm / normalize / dot / dist

(* Frame : repère orthonormé direct = position + transformation local -> monde *)
val Frame.world : Frame.t
val Frame.at : float -> float -> float -> Frame.t          (* translation pure *)
val Frame.make : origin:V3.t -> x:V3.t -> z:V3.t -> Frame.t (* z prioritaire, y = z × x *)
val Frame.translate : V3.t -> Frame.t -> Frame.t           (* dans le repère monde *)
val Frame.rotate : axis:V3.t -> deg:float -> Frame.t -> Frame.t (* axe par l'origine du monde *)
val Frame.compose : Frame.t -> Frame.t -> Frame.t           (* compose a b : b puis a *)
val Frame.inverse : Frame.t -> Frame.t
val Frame.apply : Frame.t -> V3.t -> V3.t
val Frame.origin / x_axis / y_axis / z_axis : Frame.t -> V3.t

(* Plane = Frame.t : (x, y) local porte l'esquisse, z local = direction d'extrusion *)
val Plane.xy : Plane.t   (* dessus : x = X, y = Y, extrusion +Z *)
val Plane.xz : Plane.t   (* face : x = X, y = Z, extrusion −Y (plan XZ de l'éditeur) *)
val Plane.yz : Plane.t   (* droite : x = Y, y = Z, extrusion +X *)
val Plane.zx : Plane.t   (* x = Z, y = X, extrusion +Y *)
val Plane.offset : float -> Plane.t -> Plane.t (* décale le long de la normale *)
```

## Doc (monade du document)

```ocaml
type 'a t
val return : 'a -> 'a t
val bind : 'a t -> ('a -> 'b t) -> 'b t
val map : ('a -> 'b) -> 'a t -> 'b t
module Syntax : sig  (* let*, let+, and*, and+ *) end
val param : ?loc:Loc.t -> ?range:float * float -> ?unit_:string -> string -> float -> float t
val feature : ?loc:Loc.t -> ?suppressed:bool -> name:string -> Shape.t -> Shape.t t
val fail : ?loc:Loc.t -> string -> 'a t
val run : ?overrides:(string * float) list -> 'a t -> ('a * journal, error) result
```

On n'appelle presque jamais `param` / `feature` directement : le ppx le fait.

### ppx `ppx_cad` (toujours actif dans l'éditeur)

```ocaml
let%param nom = 12. [@range 5., 40.] [@unit "mm"] in   (* -> Doc.param, nom : float *)
let%feat nom = <Shape.t> in                            (* -> Doc.feature ~name:"nom" *)
let%feat x = <Shape.t> [@name "autre_nom"] in          (* nom de feature imposé *)
let%feat x = <Shape.t> [@@suppress] in                 (* suppression temporaire : rend Shape.empty *)
let%sketch p = <Sketch.region Sketch.t> in             (* résolu -> p : Profile.t ; échec localisé *)
```

- `let%param` : valeur par défaut **littérale flottante** (`5.`, pas `5`), seule dans
  l'expression, pour que le curseur de l'éditeur puisse la réécrire. `[@range lo, hi]` et
  `[@unit "…"]` facultatifs mais conseillés (curseur). Override hors bornes = erreur.
- Noms de paramètres uniques ; noms de features uniques ; le motif est une variable.
- Pas d'entier : `let%param dents = 24. … in let z = int_of_float (Float.round dents) in`.
- `module` est un mot-clé : `module_`.

## Shape (solides, purs, hash-consés)

```ocaml
val empty : t
val cube : ?center:bool -> Geom.V3.t -> t           (* coin en 0 ; ~center:true centré *)
val cylinder : ?center:bool -> r:float -> h:float -> unit -> t   (* axe Z, de z = 0 à h ; noter le () *)
val sphere : r:float -> t                             (* centrée en 0 *)
val extrude : ?twist:float -> ?scale_top:float -> ?taper:float -> h:float -> Profile.t -> t
  (* le long de +Z depuis z = 0 ; twist en degrés ; scale_top : facteur du haut (cône si
     profil centré) ; taper : dépouille en degrés (profils simples, sans twist ni scale_top) *)
val revolve : ?deg:float -> Profile.t -> t
  (* profil dans (x, y) avec x = rayon >= 0, y = hauteur ; tourne autour de Z ; défaut 360 *)
val union : t list -> t
val ( + ) : t -> t -> t        (* union *)
val ( - ) : t -> t -> t        (* différence *)
val ( * ) : t -> t -> t        (* intersection *)
val place : Geom.Frame.t -> t -> t   (* local -> repère donné *)
val on : Geom.Plane.t -> t -> t      (* synonyme de place *)
val translate : Geom.V3.t -> t -> t
val rotate : axis:Geom.V3.t -> deg:float -> t -> t  (* autour d'un axe passant par l'ORIGINE *)
val mirror : normal:Geom.V3.t -> t -> t             (* plan par l'origine, de normale donnée *)
val scale : ?about:Geom.V3.t -> Geom.V3.t -> t -> t
val loft : (Geom.Plane.t * Profile.t) list -> t     (* profils simples (polygone, cercle) *)
val sweep : Profile.t -> Geom.V3.t list -> t        (* profil simple le long d'une ligne brisée *)
val of_mesh : Mesh.t -> t                            (* ex. Shape.of_mesh (Cad_export.Stl.of_file "x.stl") *)
```

Idiomes : `Shape.(a + b - c)` ; `Shape.(cube (V3.v 10. 10. 2.) |> translate (V3.v 0. 0. 5.))` ;
réseau : `Shape.union (List.init n (fun i -> Shape.rotate ~axis:V3.ez ~deg:(360. *. float i /. float n) s))`.

⚠ Dans `Shape.( … )`, `+`, `-`, `*`, `union`, `scale`, `rotate`, `translate`, `empty`,
`id` sont ceux de `Shape` : l'arithmétique entière `i + 1` y est impossible (la faire hors
des parenthèses) ; l'arithmétique flottante `+.` `-.` `*.` `/.` reste disponible.

## Profile (2D, purs)

```ocaml
val polygon : Geom.V2.t list -> t     (* SENS TRIGONOMÉTRIQUE ; horaire = matière retirée (vide seul) *)
val rect : ?center:bool -> w:float -> h:float -> unit -> t   (* coin en 0 ; noter le () *)
val circle : r:float -> t
val union / difference / intersection : t -> t -> t
val offset : float -> t -> t          (* décalage à coins ARRONDIS ; négatif = vers l'intérieur *)
val translate : Geom.V2.t -> t -> t
val rotate : deg:float -> t -> t
```

Rectangle à coins arrondis de rayon r :
`Profile.(offset r (rect ~center:true ~w:(w -. 2. *. r) ~h:(h -. 2. *. r) ()))`.
Paroi intérieure d'épaisseur e : `Profile.offset (-. e) exterieur`.

## Sketch (esquisses contraintes, monade)

```ocaml
type 'a t   type point   type line   type circle   type arc   type ellipse
module Syntax : sig (* let*, let+, and*, and+ *) end
val point : ?fixed:bool -> float -> float -> point t     (* valeurs INITIALES *)
val line : point -> point -> line t
val circle : ?fixed_radius:bool -> point -> float -> circle t
val arc : point -> point -> point -> arc t   (* arc c a b : centre c, de a vers b, sens trigo *)
val ellipse : point -> point -> float -> ellipse t
val start_ / end_ : line -> point     val center : circle -> point
val arc_center / arc_start / arc_end : arc -> point

val constrain : constr list -> unit t
(* contraintes *)
fix p x y  coincident p q  horizontal l  vertical l  distance p q d  length l d
equal_length l1 l2  parallel l1 l2  perpendicular l1 l2  angle l1 l2 deg
on_line p l  point_line_distance p l d  midpoint p l  radius c r  equal_radius c1 c2
on_circle p c  tangent l c  concentric c1 c2  arc_radius a r  tangent_arc l a
symmetric p q l  hdistance p q dx (* x q - x p, signé *)  vdistance p q dy

(* régions (résultat de l'esquisse) *)
val loop : point list -> region          (* polygone, orientation corrigée *)
val disk : circle -> region
val oval : ellipse -> region
val path : edge list -> region           (* edges : pt p | along a | back a | spline ps *)
val ( + ) / ( - ) : region -> region -> region

val solve : region t -> (solved, string) result   (* solved.dof, .redundant, .points *)
val to_doc : ?loc:Loc.t -> region t -> Profile.t Doc.t   (* ce que fait let%sketch *)
```

Forme type (celle que l'éditeur écrit) :

```ocaml
let profil ~l ~h =
  let open Sketch.Syntax in
  let* a = Sketch.point ~fixed:true 0. 0. in
  let* b = Sketch.point 40. 0. and* c = Sketch.point 40. 20. and* d = Sketch.point 0. 20. in
  let* ab = Sketch.line a b and* bc = Sketch.line b c
  and* cd = Sketch.line c d and* da = Sketch.line d a in
  let+ () = Sketch.constrain Sketch.[ horizontal ab; vertical bc; horizontal cd; vertical da;
                                      length ab l; length bc h ] in
  Sketch.loop [ a; b; c; d ]
```

Bilan des degrés de liberté : 2 inconnues par point non fixé, +1 par cercle (rayon) sauf
`~fixed_radius:true`. `horizontal`, `vertical`, `length`, `distance`, `hdistance`,
`vdistance`, `angle`, `parallel`, `perpendicular`, `radius`, `tangent`, `on_line`,
`on_circle`… valent 1 équation ; `coincident`, `fix`, `midpoint`, `symmetric` en valent 2.
Viser 0 degré de liberté sans redondance : le rectangle ci-dessus a 6 inconnues (a fixé)
et 6 équations (4 horizontal/vertical + 2 longueurs). `Sketch.solve` rend `dof` et
`redundant` pour vérifier. Les positions initiales doivent être proches de la solution
(Gauss-Newton part de là) et dans le bon ordre (pas de contour croisé).

## Cad_parts

```ocaml
(* Gear : engrenage droit à développante, alpha 20° par défaut *)
val Gear.spur : ?pressure_angle:float -> ?backlash:float -> ?flank_points:int ->
                module_:float -> teeth:int -> unit -> Cad.Profile.t   (* centré, dent sur +x *)
val Gear.pitch_radius / tip_radius / root_radius : module_:float -> teeth:int -> float
val Gear.center_distance : module_:float -> int -> int -> float       (* m (z1 + z2) / 2 *)
  (* Invalid_argument si teeth < 4 ou module_ <= 0 *)

(* Thread : filetage ISO à 60°, axe Z de 0 à h *)
val Thread.pitch : float -> float          (* pas gros M2…M24 ; Invalid_argument sinon *)
val Thread.rod : ?segments:int -> d:float -> pitch:float -> h:float -> unit -> Cad.Shape.t   (* vis *)
val Thread.tap : ?clearance:float -> ?segments:int -> d:float -> pitch:float -> h:float -> unit -> Cad.Shape.t
  (* outil de taraudage à SOUSTRAIRE ; clearance 0.15 par défaut *)

(* Text : police à traits, A-Z 0-9 espace - . : / + = ? (minuscules -> majuscules) *)
val Text.profile : ?center:bool -> ?stroke:float -> size:float -> string -> Cad.Profile.t
val Text.width : size:float -> string -> float
```

## Cad_mech

Voir `mecanismes.md`.
