(* Charnière imprimable en place : deux ailes, nœuds alternés, axe captif. *)
open Cad
open Geom

let model : Shape.t Doc.t =
  let%param longueur = 40. [@range 15., 120.] [@unit "mm"] in
  let%param largeur = 15. [@range 8., 50.] [@unit "mm"] in
  let%param epaisseur = 2. [@range 1., 5.] [@unit "mm"] in
  let%param rayon = 4. [@range 2.5, 10.] [@unit "mm"] in
  let%param jeu = 0.4 [@range 0.1, 1.] [@unit "mm"] in
  let%param noeuds = 5. [@range 3., 11.] in
  let n = int_of_float (Float.round noeuds) in
  let pas = longueur /. float n in
  let r_axe = (rayon -. jeu) /. 2. in
  (* cylindre d'axe x, de x0 à x0 + l, centré sur l'axe de la charnière *)
  let tube r x0 l =
    Shape.(cylinder ~r ~h:l () |> rotate ~axis:V3.ey ~deg:90. |> translate (V3.v x0 0. rayon))
  in
  let segments parite f =
    Shape.union (List.filter_map (fun i -> if i mod 2 = parite then Some (f i) else None) (List.init n Fun.id))
  in
  let noeud i = tube rayon ((float i *. pas) +. (jeu /. 2.)) (pas -. jeu) in
  let degagement i = tube (rayon +. jeu) ((float i *. pas) -. (jeu /. 2.)) (pas +. jeu) in
  let%feat axe = tube r_axe 0. longueur in
  let%feat aile_a =
    Shape.(
      cube (V3.v longueur largeur epaisseur) |> translate (V3.v 0. (-.largeur) 0.)
      |> fun p -> p + segments 0 noeud - segments 1 degagement + axe)
  in
  let%feat aile_b =
    Shape.(
      cube (V3.v longueur largeur epaisseur)
      |> fun p -> p + segments 1 noeud - segments 0 degagement - tube (r_axe +. jeu) 0. longueur)
  in
  let%feat charniere = Shape.(aile_a + aile_b) in
  Doc.return charniere
