(* Roue dentée droite à développante, alésage claveté. *)
open Cad
open Geom

let model : Shape.t Doc.t =
  let%param module_ = 1.5 [@range 0.5, 5.] [@unit "mm"] in
  let%param dents = 24. [@range 8., 120.] in
  let%param epaisseur = 6. [@range 1., 30.] [@unit "mm"] in
  let%param alesage = 5. [@range 1., 30.] [@unit "mm"] in
  let%param jeu = 0.1 [@range 0., 0.5] [@unit "mm"] in
  let teeth = int_of_float (Float.round dents) in
  let%feat roue =
    Shape.extrude ~h:epaisseur (Cad_parts.Gear.spur ~backlash:jeu ~module_ ~teeth ())
  in
  let%feat alesage_ = Shape.cylinder ~r:(alesage /. 2.) ~h:epaisseur () [@name "alesage"] in
  let%feat clavette =
    Shape.(cube (V3.v 1.5 (alesage /. 3.) epaisseur) |> translate (V3.v (alesage /. 2. -. 0.5) (-.alesage /. 6.) 0.))
  in
  let%feat engrenage = Shape.(roue - alesage_ - clavette) in
  Doc.return engrenage
