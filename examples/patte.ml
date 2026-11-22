(* Patte de fixation : profil esquissé sous contraintes, puis extrudé. *)
open Cad
open Geom

let profil ~largeur ~hauteur ~pente ~diametre =
  let open Sketch.Syntax in
  let* a = Sketch.point ~fixed:true 0. 0. in
  let* b = Sketch.point 50. 0. and* c = Sketch.point 40. 20. and* d = Sketch.point 10. 20. in
  let* ab = Sketch.line a b and* bc = Sketch.line b c and* cd = Sketch.line c d and* da = Sketch.line d a in
  let* centre = Sketch.point 25. 10. in
  let* trou = Sketch.circle centre 3. in
  let+ () =
    Sketch.constrain
      Sketch.
        [ horizontal ab; horizontal cd; length ab largeur; vdistance a d hauteur;
          equal_length bc da; angle ab bc (180. -. pente);
          (* trou au milieu de la hauteur, centré en x *)
          hdistance a centre (largeur /. 2.); vdistance a centre (hauteur /. 2.);
          radius trou (diametre /. 2.) ]
  in
  Sketch.(loop [ a; b; c; d ] - disk trou)

let model : Shape.t Doc.t =
  let%param largeur = 50. [@range 20., 120.] [@unit "mm"] in
  let%param hauteur = 20. [@range 8., 60.] [@unit "mm"] in
  let%param pente = 60. [@range 30., 90.] [@unit "°"] in
  let%param diametre = 6. [@range 2., 15.] [@unit "mm"] in
  let%param epaisseur = 5. [@range 1., 20.] [@unit "mm"] in
  let%sketch p = profil ~largeur ~hauteur ~pente ~diametre in
  let%feat patte = Shape.extrude ~h:epaisseur p in
  let%feat lamage =
    Shape.(cylinder ~r:diametre ~h:2. () |> translate (V3.v (largeur /. 2.) (hauteur /. 2.) (epaisseur -. 2.)))
  in
  let%feat piece = Shape.(patte - lamage) in
  Doc.return piece
