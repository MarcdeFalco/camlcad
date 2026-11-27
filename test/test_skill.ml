(* Exemples de la skill (skills/camlcad/examples) : ils compilent (c'est le rôle de la
   bibliothèque), s'évaluent sans erreur, et le profil esquissé est totalement contraint. *)
open Cad
module S = Camlcad_skill_examples

let journal name (j : Doc.journal) =
  Printf.printf "== %s\n  params :" name;
  List.iter (fun (p : Doc.param_info) -> Printf.printf " %s=%g" p.p_name p.p_value) j.params;
  print_string "\n  features :";
  List.iter (fun (f : Doc.feature_info) -> Printf.printf " %s@%d" f.f_name f.f_loc.line) j.features;
  print_newline ()

let%expect_test "pièces de la skill" =
  List.iter
    (fun (name, model) ->
      match Doc.run model with Error e -> Printf.printf "%s : erreur %s\n" name e.message | Ok (_, j) -> journal name j)
    [ ("boite", S.Boite.model); ("equerre", S.Equerre.model); ("molette", S.Molette.model) ];
  [%expect {|
    == boite
      params : longueur=80 largeur=50 hauteur=30 paroi=2 rayon=5 jeu=0.2 levre=4
      features : coque@22 cavite@24 boite@25 plaque@28 levre@29 couvercle@35
    == equerre
      params : longueur=50 hauteur=40 largeur=30 epaisseur=5 renfort=3 vis=4
      features : corps@39 gousset@42 trous_semelle@57 trous_aile@64 equerre@65
    == molette
      params : diametre=30 hauteur=10 chanfrein=1 crans=18 filetage=6 gravure=0.6
      features : disque@16 crantage@23 taraudage@27 marquage@31 molette@36 |}]

let%expect_test "boîte : garde-fou Doc.fail" =
  (match Doc.run ~overrides:[ ("rayon", 3.); ("paroi", 4.) ] S.Boite.model with
  | Ok _ -> print_endline "ok ?"
  | Error e -> Printf.printf "erreur l.%d : %s\n" e.loc.line e.message);
  [%expect {| erreur l.14 : le rayon des coins doit dépasser l'épaisseur de paroi |}]

let%expect_test "équerre : profil en L totalement contraint" =
  (match Sketch.solve (S.Equerre.profil_l ~longueur:50. ~hauteur:40. ~epaisseur:5.) with
  | Error e -> print_endline e
  | Ok s ->
      Printf.printf "dof %d, redondantes %d\n" s.dof s.redundant;
      Array.iter (fun (p : Geom.V2.t) -> Printf.printf " (%g, %g)" p.x p.y) s.points;
      print_newline ());
  [%expect {|
    dof 0, redondantes 0
     (0, 0) (50, 0) (50, 5) (5, 5) (5, 40) (0, 40) |}]

let%expect_test "pignon-crémaillère : couplage" =
  match Doc.run S.Cremaillere.model with
  | Error e -> print_endline e.message
  | Ok (a, j) ->
      journal "cremaillere" j;
      let module A = Cad_mech.Assembly in
      Printf.printf "  pièces : %s ; coordonnées : %s\n"
        (String.concat ", " (List.map (fun (p : Cad_mech.Part.t) -> p.name) (A.parts a)))
        (String.concat ", " (A.coordinates a));
      List.iter
        (fun q ->
          match A.solve a [ ("pignon", q) ] with
          | Error e -> print_endline e
          | Ok pose -> Printf.printf "  pignon %g° -> crémaillère %.3f mm\n" q (List.assoc "cremaillere" pose))
        [ 0.; 45.; -90. ];
      [%expect {|
        == cremaillere
          params : module_=2 dents=20 jeu=0.15
          features :
          pièces : bati, pignon, cremaillere ; coordonnées : pignon, cremaillere
          pignon 0° -> crémaillère 0.000 mm
          pignon 45° -> crémaillère 15.708 mm
          pignon -90° -> crémaillère -31.416 mm |}]
