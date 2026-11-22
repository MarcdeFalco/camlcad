(* Les trois pièces de référence : arbre de features, et chaque nœud pointe sur
   la bonne ligne du source (critère de sortie de la phase 2). *)
open Cad

let read_lines file =
  let ic = open_in_bin ("../" ^ file) in
  let n = in_channel_length ic in
  let s = really_input_string ic n in
  close_in ic;
  s

(* Fragment désigné par une position, convention __POS__. *)
let fragment src (l : Loc.t) =
  let rec bol line i = if line = 1 then i else bol (line - 1) (String.index_from src i '\n' + 1) in
  let b = bol l.line 0 in
  String.sub src (b + l.start_col) (l.end_col - l.start_col)

let first_line s = match String.index_opt s '\n' with Some i -> String.sub s 0 i | None -> s

let%expect_test "arbres des pièces de référence" =
  List.iter
    (fun (name, model) ->
      Printf.printf "== %s\n" name;
      match Doc.run model with
      | Error e -> Printf.printf "erreur : %s\n" e.message
      | Ok (_, j) ->
          List.iter
            (fun (p : Doc.param_info) ->
              let src = read_lines p.p_loc.file in
              Printf.printf "  param %-10s = %-5g  l.%d  «%s»\n" p.p_name p.p_value p.p_loc.line
                (fragment src p.p_loc))
            j.params;
          List.iter
            (fun (f : Doc.feature_info) ->
              let src = read_lines f.f_loc.file in
              Printf.printf "  feat %d %-14s deps=[%s]  l.%d  «%s»\n" f.f_id f.f_name
                (String.concat "," (List.map string_of_int f.f_deps))
                f.f_loc.line
                (first_line (fragment src f.f_loc)))
            j.features)
    Cad_examples.all;
  [%expect {|
    == support
      param longueur   = 60     l.6  «60.»
      param largeur    = 25     l.7  «25.»
      param epaisseur  = 4      l.8  «4.»
      param hauteur    = 30     l.9  «30.»
      param diametre   = 5      l.10  «5.»
      feat 0 semelle        deps=[]  l.11  «let%feat semelle = Shape.cube (V3.v longueur largeur epaisseur)»
      feat 1 aile           deps=[]  l.12  «let%feat aile = Shape.(cube (V3.v longueur epaisseur hauteur))»
      feat 2 trous_semelle  deps=[]  l.16  «let%feat trous_semelle = Shape.(trou_vertical 10. + trou_vertical (longueur -. 10.))»
      feat 3 trou_aile      deps=[]  l.17  «let%feat trou_aile =»
      feat 4 support        deps=[0,1,2,3]  l.23  «let%feat support = Shape.(semelle + aile - trous_semelle - trou_aile)»
    == engrenage
      param module_    = 1.5    l.6  «1.5»
      param dents      = 24     l.7  «24.»
      param epaisseur  = 6      l.8  «6.»
      param alesage    = 5      l.9  «5.»
      param jeu        = 0.1    l.10  «0.1»
      feat 0 roue           deps=[]  l.12  «let%feat roue =»
      feat 1 alesage        deps=[]  l.15  «let%feat alesage_ = Shape.cylinder ~r:(alesage /. 2.) ~h:epaisseur () [@name "alesage"]»
      feat 2 clavette       deps=[]  l.16  «let%feat clavette =»
      feat 3 engrenage      deps=[0,1,2]  l.19  «let%feat engrenage = Shape.(roue - alesage_ - clavette)»
    == charniere
      param longueur   = 40     l.6  «40.»
      param largeur    = 15     l.7  «15.»
      param epaisseur  = 2      l.8  «2.»
      param rayon      = 4      l.9  «4.»
      param jeu        = 0.4    l.10  «0.4»
      param noeuds     = 5      l.11  «5.»
      feat 0 axe            deps=[]  l.24  «let%feat axe = tube r_axe 0. longueur»
      feat 1 aile_a         deps=[0]  l.25  «let%feat aile_a =»
      feat 2 aile_b         deps=[]  l.30  «let%feat aile_b =»
      feat 3 charniere      deps=[0,1,2]  l.35  «let%feat charniere = Shape.(aile_a + aile_b)»
    |}]
