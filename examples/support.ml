(* Équerre de fixation : semelle percée de deux trous, aile verticale percée. *)
open Cad
open Geom

let model : Shape.t Doc.t =
  let%param longueur = 60. [@range 20., 150.] [@unit "mm"] in
  let%param largeur = 25. [@range 10., 60.] [@unit "mm"] in
  let%param epaisseur = 4. [@range 2., 10.] [@unit "mm"] in
  let%param hauteur = 30. [@range 10., 80.] [@unit "mm"] in
  let%param diametre = 5. [@range 2., 10.] [@unit "mm"] in
  let%feat semelle = Shape.cube (V3.v longueur largeur epaisseur) in
  let%feat aile = Shape.(cube (V3.v longueur epaisseur hauteur)) in
  let trou_vertical x =
    Shape.(cylinder ~r:(diametre /. 2.) ~h:epaisseur () |> translate (V3.v x (largeur /. 2.) 0.))
  in
  let%feat trous_semelle = Shape.(trou_vertical 10. + trou_vertical (longueur -. 10.)) in
  let%feat trou_aile =
    Shape.(
      cylinder ~r:(diametre /. 2.) ~h:epaisseur ()
      |> rotate ~axis:V3.ex ~deg:(-90.)
      |> translate (V3.v (longueur /. 2.) 0. (hauteur *. 0.6)))
  in
  let%feat support = Shape.(semelle + aile - trous_semelle - trou_aile) in
  Doc.return support
