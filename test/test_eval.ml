open Cad
module E = Eval.Make (Fake_kernel)

let%expect_test "mémoïsation : un sous-terme partagé est évalué une fois" =
  Fake_kernel.calls := 0;
  let s = Shape.sphere ~r:5. in
  let u = Shape.(s + translate (Geom.V3.v 1. 0. 0.) s) in
  let c = E.create () in
  print_endline (E.solid c u);
  Printf.printf "appels=%d\n" !Fake_kernel.calls;
  ignore (E.solid c u);
  let calls, hits = E.stats c in
  Printf.printf "appels=%d hits=%d\n" calls hits;
  [%expect {|
    U(sphere,T(sphere))
    appels=3
    appels=3 hits=1 |}]

let%expect_test "segments : tolérance de corde" =
  let q = Eval.default_quality in
  Printf.printf "%d %d %d\n"
    (Eval.segments q ~r:0.5 ~deg:360.)
    (Eval.segments q ~r:10. ~deg:360.)
    (Eval.segments q ~r:10. ~deg:90.);
  (* n = ceil (angle_rad / (2 acos (1 - tol / r))), borné par min/max au prorata de l'angle.
     r = 0.5 : 15.7 -> 16 ; r = 10 : 70.2 -> 71 ; r = 10, 90° : 17.6 -> 18 *)
  [%expect {| 16 71 18 |}]
