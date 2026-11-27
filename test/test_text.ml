open Cad_parts

let%expect_test "Text : traits, largeur, caractères ramenés, erreurs" =
  let n s = List.length (Text.strokes s) in
  Printf.printf "%d %d %d %d %d\n" (n "I") (n "AB 1") (n "é") (n "E") (n "%");
  Printf.printf "%g %g\n" (Text.width ~size:6. "ABC") (Text.width ~size:6. "");
  (match Text.strokes "a" with
  | [ first; _ ] -> List.iter (fun (q : Geom.V2.t) -> Printf.printf "(%g,%g) " q.x q.y) first
  | _ -> print_string "?");
  print_newline ();
  (match Text.profile ~size:0. "A" with _ -> () | exception Invalid_argument m -> print_endline m);
  [%expect {|
    3 6 2 2 2
    14 0
    (0,0) (0,4) (2,6) (4,4) (4,0)
    Text.profile : size <= 0
    |}]
