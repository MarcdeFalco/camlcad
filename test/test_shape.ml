open Cad

let%expect_test "hash-consing : même expression, même nœud" =
  let a () = Shape.(cube (Geom.V3.v 10. 10. 10.) - cylinder ~r:3. ~h:10. ()) in
  Printf.printf "%b %b\n" (Shape.equal (a ()) (a ())) (Shape.id (a ()) = Shape.id (a ()));
  [%expect {| true true |}]

let%expect_test "hash-consing : flottants distincts, nœuds distincts" =
  let c r = Shape.cylinder ~r ~h:10. () in
  Printf.printf "%b\n" (Shape.equal (c 3.) (c 3.0000001));
  [%expect {| false |}]

let%expect_test "subterms : partage compté une fois" =
  let s = Shape.sphere ~r:5. in
  let u = Shape.(s + translate (Geom.V3.v 1. 0. 0.) s) in
  Printf.printf "%d\n" (List.length (Shape.subterms u));
  [%expect {| 3 |}]
