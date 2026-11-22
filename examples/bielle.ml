(* Bielle-manivelle : boucle fermée résolue numériquement. Pièces plates,
   empilées en z pour ne pas se toucher (jeu de [jeu] mm). *)
open Cad
open Geom
open Cad_mech

let make ?(r = 15.) ?(l = 50.) ?(jeu = 0.5) () =
  let e = 4. (* épaisseur des pièces *) in
  let barre longueur largeur =
    Shape.(
      (cube (V3.v longueur largeur e) |> translate (V3.v 0. (-.largeur /. 2.) 0.))
      + (cylinder ~r:(largeur /. 2.) ~h:e () + (cylinder ~r:(largeur /. 2.) ~h:e () |> translate (V3.v longueur 0. 0.))))
  in
  let axe_x = Frame.make ~origin:V3.zero ~x:V3.ey ~z:V3.ex in
  let bati =
    Part.make "bati" ~color:(90, 90, 90)
      Shape.(cube (V3.v (r +. l +. 30.) 30. e) |> translate (V3.v (-15.) (-35.) 0.))
      ~ports:[ ("pivot", Frame.at 0. 0. e); ("glissiere", axe_x) ]
  in
  let manivelle =
    Part.make "manivelle" ~color:(220, 120, 40) (barre r 10.)
      ~ports:[ ("axe", Frame.at 0. 0. 0.); ("maneton", Frame.at r 0. e) ]
  in
  let bielle =
    Part.make "bielle" ~color:(60, 130, 210) (barre l 8.)
      ~ports:[ ("pied", Frame.at 0. 0. (-.jeu)); ("tete", Frame.at l 0. e) ]
  in
  let coulisseau =
    Part.make "coulisseau" ~color:(80, 170, 90)
      Shape.(cube ~center:true (V3.v 14. 12. e) |> translate (V3.v 0. 0. (e /. 2.)))
      ~ports:[ ("rail", Frame.make ~origin:(V3.v 0. 0. (-.((3. *. e) +. (2. *. jeu)))) ~x:V3.ey ~z:V3.ex);
               ("axe", Frame.at 0. 0. (-.jeu)) ]
  in
  Assembly.make ~ground:bati
    [ Joint.revolute ~name:"manivelle" Part.(bati @: "pivot") Part.(manivelle @: "axe");
      Joint.revolute ~name:"bielle" Part.(manivelle @: "maneton") Part.(bielle @: "pied");
      Joint.prismatic ~name:"coulisseau" ~init:(r +. l) Part.(bati @: "glissiere") Part.(coulisseau @: "rail") ]
    ~loops:[ Joint.revolute ~name:"bouton" Part.(bielle @: "tete") Part.(coulisseau @: "axe") ]

(* Position théorique du coulisseau : r cos t + sqrt (l² - r² sin² t). *)
let x_theorique ?(r = 15.) ?(l = 50.) deg =
  let t = deg *. Float.pi /. 180. in
  (r *. cos t) +. sqrt ((l *. l) -. (r *. r *. sin t *. sin t))
