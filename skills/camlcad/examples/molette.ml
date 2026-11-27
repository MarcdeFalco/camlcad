(* Molette de serrage : disque de révolution chanfreiné, crantage, taraudage M6 et texte
   gravé sur le dessus. Imprimée à plat (face z = 0 sur le plateau). *)
open Cad
open Geom

let model : Shape.t Doc.t =
  let%param diametre = 30. [@range 20., 60.] [@unit "mm"] in
  let%param hauteur = 10. [@range 6., 25.] [@unit "mm"] in
  let%param chanfrein = 1. [@range 0.4, 3.] [@unit "mm"] in
  let%param crans = 18. [@range 8., 40.] in
  let%param filetage = 6. [@range 3., 12.] [@unit "mm"] in
  let%param gravure = 0.6 [@range 0.3, 1.5] [@unit "mm"] in
  let r = diametre /. 2. and c = chanfrein in
  let n = int_of_float (Float.round crans) in
  (* Révolution : x du profil = rayon, y du profil = hauteur ; l'axe devient Z. *)
  let%feat disque =
    Shape.revolve
      (Profile.polygon
         [ V2.v 0. 0.; V2.v (r -. c) 0.; V2.v r c; V2.v r (hauteur -. c); V2.v (r -. c) hauteur; V2.v 0. hauteur ])
  in
  (* Crantage : n gorges cylindriques réparties sur le pourtour. *)
  let gorge = Shape.(cylinder ~r:1.2 ~h:(hauteur +. 2.) () |> translate (V3.v r 0. (-1.))) in
  let%feat crantage =
    Shape.union (List.init n (fun i -> Shape.rotate ~axis:V3.ez ~deg:(360. *. float i /. float n) gorge))
  in
  (* Taraudage ISO au pas gros (Cad_parts.Thread.pitch lève Invalid_argument hors M2–M24). *)
  let%feat taraudage =
    Cad_parts.Thread.tap ~d:filetage ~pitch:(Cad_parts.Thread.pitch (Float.round filetage)) ~h:hauteur ()
  in
  let texte = Printf.sprintf "M%.0f" filetage in
  let%feat marquage =
    Shape.(
      extrude ~h:(gravure +. 0.01) (Cad_parts.Text.profile ~center:true ~size:4. texte)
      |> translate (V3.v 0. ((filetage /. 2.) +. ((r -. (filetage /. 2.)) /. 2.)) (hauteur -. gravure)))
  in
  let%feat molette = Shape.(disque - crantage - taraudage - marquage) in
  Doc.return molette
