(* Boîte à couvercle emboîté, imprimée en deux corps côte à côte, sans support. *)
open Cad

let model : Shape.t Doc.t =
  let%param longueur = 80. [@range 30., 200.] [@unit "mm"] in
  let%param largeur = 50. [@range 20., 150.] [@unit "mm"] in
  let%param hauteur = 30. [@range 10., 120.] [@unit "mm"] in
  let%param paroi = 2. [@range 1.2, 5.] [@unit "mm"] in
  let%param rayon = 5. [@range 3., 15.] [@unit "mm"] in
  let%param jeu = 0.2 [@range 0.1, 0.6] [@unit "mm"] in
  let%param levre = 4. [@range 2., 10.] [@unit "mm"] in
  let open Doc.Syntax in
  let* () =
    if rayon <= paroi then Doc.fail ~loc:(Loc.of_pos __POS__) "le rayon des coins doit dépasser l'épaisseur de paroi"
    else Doc.return ()
  in
  (* Contour extérieur à coins arrondis : rectangle réduit puis décalé de [rayon]. *)
  let exterieur =
    Profile.(offset rayon (rect ~center:true ~w:(longueur -. (2. *. rayon)) ~h:(largeur -. (2. *. rayon)) ()))
  in
  let interieur = Profile.offset (-.paroi) exterieur in
  let%feat coque = Shape.extrude ~h:hauteur exterieur in
  (* L'outil dépasse le haut de 1 mm : pas de peau résiduelle. *)
  let%feat cavite = Shape.(extrude ~h:hauteur interieur |> translate (Geom.V3.v 0. 0. paroi)) in
  let%feat boite = Shape.(coque - cavite) in
  (* Couvercle posé à plat à côté de la boîte, lèvre vers le haut. *)
  let bord = Profile.offset (-.jeu) interieur in
  let%feat plaque = Shape.extrude ~h:paroi exterieur in
  let%feat lev =
    Shape.(
      extrude ~h:levre (Profile.difference bord (Profile.offset (-.paroi) bord))
      |> translate (Geom.V3.v 0. 0. paroi))
    [@name "levre"]
  in
  let%feat couvercle =
    Shape.(plaque + lev |> translate (Geom.V3.v 0. (largeur +. 10.) 0.))
  in
  Doc.return Shape.(boite + couvercle)
