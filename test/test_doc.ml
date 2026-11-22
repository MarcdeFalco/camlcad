open Cad
open Doc.Syntax

let model () =
  let* l = Doc.param "longueur" ~range:(10., 100.) 40. in
  let* base = Doc.feature ~name:"base" (Shape.cube (Geom.V3.v l 20. 5.)) in
  let* trou = Doc.feature ~name:"trou" (Shape.cylinder ~r:2.5 ~h:5. ()) in
  let* piece = Doc.feature ~name:"piece" Shape.(base - trou) in
  Doc.return piece

let show = function
  | Ok (_, (j : Doc.journal)) ->
      List.iter (fun (p : Doc.param_info) -> Printf.printf "param %s=%g\n" p.p_name p.p_value) j.params;
      List.iter
        (fun (f : Doc.feature_info) ->
          Printf.printf "feature %d %s deps=[%s]\n" f.f_id f.f_name
            (String.concat ";" (List.map string_of_int f.f_deps)))
        j.features
  | Error (e : Doc.error) ->
      Printf.printf "erreur : %s (après %d features)\n" e.message (List.length e.journal.features)

let%expect_test "journal et dépendances" =
  show (Doc.run (model ()));
  [%expect {|
    param longueur=40
    feature 0 base deps=[]
    feature 1 trou deps=[]
    feature 2 piece deps=[0;1] |}]

let%expect_test "override d'un paramètre" =
  show (Doc.run ~overrides:[ ("longueur", 60.) ] (model ()));
  [%expect {|
    param longueur=60
    feature 0 base deps=[]
    feature 1 trou deps=[]
    feature 2 piece deps=[0;1] |}]

let%expect_test "erreurs" =
  show (Doc.run ~overrides:[ ("longueur", 500.) ] (model ()));
  show (Doc.run ~overrides:[ ("largeur", 5.) ] (model ()));
  show
    (Doc.run
       (let* _ = Doc.feature ~name:"a" Shape.empty in
        let* _ = Doc.feature ~name:"a" Shape.empty in
        Doc.return ()));
  [%expect {|
    erreur : longueur : 500 hors de [10, 100] (après 0 features)
    erreur : paramètre inconnu : largeur (après 0 features)
    erreur : feature en double : a (après 1 features) |}]
