(* Équerre de fixation : profil en L esquissé sous contraintes dans le plan XZ (vu de
   face), extrudé en largeur, renfort central, trous de vis fraisés. Imprimée couchée sur
   le flanc (profil en L sur le plateau) : les couches suivent le L, l'angle est solide. *)
open Cad
open Geom

(* Profil en L : 6 sommets, 10 inconnues (a est fixe), 10 équations : 0 degré de liberté. *)
let profil_l ~longueur ~hauteur ~epaisseur =
  let open Sketch.Syntax in
  let* a = Sketch.point ~fixed:true 0. 0. in
  let* b = Sketch.point 50. 0.
  and* c = Sketch.point 50. 5.
  and* d = Sketch.point 5. 5.
  and* e = Sketch.point 5. 40.
  and* f = Sketch.point 0. 40. in
  let* ab = Sketch.line a b
  and* bc = Sketch.line b c
  and* cd = Sketch.line c d
  and* de = Sketch.line d e
  and* ef = Sketch.line e f
  and* fa = Sketch.line f a in
  let+ () =
    Sketch.constrain
      Sketch.
        [ horizontal ab; vertical bc; horizontal cd; vertical de; horizontal ef; vertical fa;
          length ab longueur; length fa hauteur; length bc epaisseur; length ef epaisseur ]
  in
  Sketch.loop [ a; b; c; d; e; f ]

let model : Shape.t Doc.t =
  let%param longueur = 50. [@range 25., 120.] [@unit "mm"] in
  let%param hauteur = 40. [@range 20., 120.] [@unit "mm"] in
  let%param largeur = 30. [@range 15., 80.] [@unit "mm"] in
  let%param epaisseur = 5. [@range 3., 10.] [@unit "mm"] in
  let%param renfort = 3. [@range 2., 8.] [@unit "mm"] in
  let%param vis = 4. [@range 2., 6.] [@unit "mm"] in
  let%sketch l = profil_l ~longueur ~hauteur ~epaisseur in
  (* Plane.xz : x local = X, y local = Z, extrusion vers -Y. *)
  let%feat corps = Shape.(extrude ~h:largeur l |> place Plane.xz) in
  (* Gousset triangulaire au milieu de la largeur. *)
  let g = 0.6 *. Float.min (longueur -. epaisseur) (hauteur -. epaisseur) in
  let%feat gousset =
    Shape.(
      extrude ~h:renfort
        (Profile.polygon [ V2.v epaisseur epaisseur; V2.v (epaisseur +. g) epaisseur; V2.v epaisseur (epaisseur +. g) ])
      |> place (Plane.offset ((largeur -. renfort) /. 2.) Plane.xz))
  in
  (* Trou fraisé le long de z, tête en haut (cône à 90°), pointe à z = 0. *)
  let r = (vis /. 2.) +. 0.2 in
  let trou =
    Shape.(
      cylinder ~r ~h:(epaisseur +. 2.) () |> translate (V3.v 0. 0. (-1.))
      |> fun t -> t + (extrude ~h:(r +. 0.01) ~scale_top:2. (Profile.circle ~r) |> translate (V3.v 0. 0. (epaisseur -. r))))
  in
  let x_semelle = epaisseur +. ((longueur -. epaisseur) /. 2.) in
  let z_aile = epaisseur +. ((hauteur -. epaisseur) /. 2.) in
  let%feat trous_semelle =
    Shape.(
      translate (V3.v x_semelle (-.largeur /. 4.) 0.) trou
      + translate (V3.v x_semelle (-3. *. largeur /. 4.) 0.) trou)
  in
  (* Le même trou couché : son axe z devient +X, fraisure côté intérieur (x = epaisseur). *)
  let trou_aile y = Shape.(trou |> rotate ~axis:V3.ey ~deg:90. |> translate (V3.v 0. y z_aile)) in
  let%feat trous_aile = Shape.(trou_aile (-.largeur /. 4.) + trou_aile (-3. *. largeur /. 4.)) in
  let%feat equerre = Shape.(corps + gousset - trous_semelle - trous_aile) in
  Doc.return equerre
