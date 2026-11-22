(* Le ppx : noms, positions (convention __POS__), attributs, ordre. *)
open Cad
open Geom

let model =
  let%param l = 40. [@range 10., 100.] [@unit "mm"] in
  let%feat base = Shape.cube (V3.v l 20. 5.) in
  let%feat t = Shape.cylinder ~r:2.5 ~h:5. () [@name "trou"]
  and p = Shape.sphere ~r:1. in
  let%feat piece = Shape.(base - t + p) in
  Doc.return piece

let pp_loc (l : Loc.t) = Printf.sprintf "%s:%d:%d-%d" l.file l.line l.start_col l.end_col

let%expect_test "positions et noms" =
  (match Doc.run model with
  | Error e -> print_endline e.message
  | Ok (_, j) ->
      List.iter
        (fun (p : Doc.param_info) ->
          Printf.printf "param %s %s %s\n" p.p_name (pp_loc p.p_loc) (Option.value ~default:"-" p.p_unit))
        j.params;
      List.iter
        (fun (f : Doc.feature_info) -> Printf.printf "feat %d %s %s\n" f.f_id f.f_name (pp_loc f.f_loc))
        j.features);
  [%expect {|
    param l test/test_ppx.ml:6:16-19 mm
    feat 0 base test/test_ppx.ml:7:2-44
    feat 1 trou test/test_ppx.ml:8:2-60
    feat 2 p test/test_ppx.ml:9:2-28
    feat 3 piece test/test_ppx.ml:10:2-39
    |}]

let%expect_test "JSON" =
  print_endline (Journal_json.of_result (Doc.run ~overrides:[ ("l", 50.) ] model));
  print_endline (Journal_json.of_result (Doc.run ~overrides:[ ("l", 500.) ] model));
  [%expect {|
    {"ok":true,"params":[{"name":"l","default":40,"value":50,"range":[10,100],"unit":"mm","loc":{"file":"test/test_ppx.ml","line":6,"start_col":16,"end_col":19}}],"features":[{"id":0,"name":"base","loc":{"file":"test/test_ppx.ml","line":7,"start_col":2,"end_col":44},"deps":[],"shape":6},{"id":1,"name":"trou","loc":{"file":"test/test_ppx.ml","line":8,"start_col":2,"end_col":60},"deps":[],"shape":2},{"id":2,"name":"p","loc":{"file":"test/test_ppx.ml","line":9,"start_col":2,"end_col":28},"deps":[],"shape":3},{"id":3,"name":"piece","loc":{"file":"test/test_ppx.ml","line":10,"start_col":2,"end_col":39},"deps":[0,1,2],"shape":8}]}
    {"ok":false,"error":{"message":"l : 500 hors de [10, 100]","loc":{"file":"test/test_ppx.ml","line":6,"start_col":16,"end_col":19}},"params":[],"features":[]}
    |}]

let%expect_test "let%sketch : échec localisé" =
  let m =
    let%sketch p =
      let open Sketch.Syntax in
      let* a = Sketch.point ~fixed:true 0. 0. and* b = Sketch.point 1. 0. in
      let+ () = Sketch.constrain Sketch.[ distance a b 1.; distance a b 2. ] in
      Sketch.loop [ a; b ]
    in
    Doc.return p
  in
  (match Doc.run m with
  | Ok _ -> print_endline "ok ?"
  | Error e -> Printf.printf "%s @ %s\n" e.message (pp_loc e.loc));
  [%expect {| esquisse : contraintes incompatibles (résidu 0.5 après 3 itérations) @ test/test_ppx.ml:44:4-234 |}]
