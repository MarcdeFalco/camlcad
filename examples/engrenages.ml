(* Deux roues dentées qui engrènent : couplage q2 = - z1/z2 × q1. *)
open Cad
open Geom
open Cad_mech

let make ?(module_ = 2.) ?(z1 = 12) ?(z2 = 20) ?(jeu = 0.15) ?(epaisseur = 5.) () =
  let roue z =
    Shape.(
      extrude ~h:epaisseur (Cad_parts.Gear.spur ~backlash:jeu ~module_ ~teeth:z ())
      - cylinder ~r:2.5 ~h:epaisseur ())
  in
  let a = Cad_parts.Gear.center_distance ~module_ z1 z2 in
  (* La roue 2 présente un creux face à la dent de la roue 1 (angle 180°). *)
  let phase = if z2 mod 2 = 0 then 180. /. float z2 else 0. in
  let bati =
    Part.make "bati" ~color:(90, 90, 90)
      Shape.(cube (V3.v (a +. 40.) 30. 3.) |> translate (V3.v (-20.) (-15.) (-3.)))
      ~ports:[ ("a1", Frame.world); ("a2", Frame.rotate ~axis:V3.ez ~deg:phase (Frame.world) |> Frame.translate (V3.v a 0. 0.)) ]
  in
  let r1 = Part.make "roue1" ~color:(220, 120, 40) (roue z1) ~ports:[ ("axe", Frame.world) ] in
  let r2 = Part.make "roue2" ~color:(60, 130, 210) (roue z2) ~ports:[ ("axe", Frame.world) ] in
  Assembly.make ~ground:bati
    [ Joint.revolute ~name:"roue1" Part.(bati @: "a1") Part.(r1 @: "axe");
      Joint.revolute ~name:"roue2" Part.(bati @: "a2") Part.(r2 @: "axe") ]
    ~couplings:[ { driver = "roue1"; driven = "roue2"; ratio = -.float z1 /. float z2 } ]

let model : Assembly.t Doc.t =
  let%param module_ = 2. [@range 1., 4.] [@unit "mm"] in
  let%param z1 = 12. [@range 8., 40.] in
  let%param z2 = 20. [@range 8., 60.] in
  let%param jeu = 0.15 [@range -0.3, 0.5] [@unit "mm"] in
  let z x = int_of_float (Float.round x) in
  Doc.return (make ~module_ ~z1:(z z1) ~z2:(z z2) ~jeu ())
