open Geom

let%expect_test "V3.cross : base directe" =
  Format.printf "%a@." V3.pp (V3.cross V3.ex V3.ey);
  [%expect {| (0, 0, 1) |}]

let%expect_test "Frame : inverse et composition" =
  Prop.check "compose f (inverse f) = world"
    QCheck2.Gen.(pair Prop.v3 Prop.angle)
    (fun (t, deg) ->
      let f = Frame.world |> Frame.rotate ~axis:V3.ez ~deg |> Frame.translate t in
      Frame.equal ~eps:1e-6 (Frame.compose f (Frame.inverse f)) Frame.world);
  Prop.check "une isométrie conserve les distances"
    QCheck2.Gen.(quad Prop.v3 Prop.v3 Prop.v3 Prop.angle)
    (fun (axis, p, q, deg) ->
      QCheck2.assume (V3.norm axis > 1e-3);
      let f = Frame.rotate ~axis ~deg Frame.world in
      Float.abs (V3.dist (Frame.apply f p) (Frame.apply f q) -. V3.dist p q) < 1e-6);
  [%expect {| |}]

let%expect_test "Frame.to_matrix : colonne majeure" =
  let m = Frame.to_matrix (Frame.at 1. 2. 3.) in
  Printf.printf "%g %g %g %g\n" m.(12) m.(13) m.(14) m.(15);
  [%expect {| 1 2 3 1 |}]

let%expect_test "Plane.zx : normale y" =
  Format.printf "%a@." V3.pp (Plane.normal Plane.zx);
  [%expect {| (0, 1, 0) |}]

let%expect_test "Plane.xz : vu de face, y local = Z" =
  let p = Plane.xz in
  Format.printf "%a %a@." V3.pp (Plane.normal p) V3.pp (Frame.y_axis p);
  [%expect {| (-0, -1, -0) (0, 0, 1) |}]

let%expect_test "Bbox" =
  let b = Bbox.of_points [ V3.v 0. 0. 0.; V3.v 10. 20. 5. ] in
  Format.printf "%a %a %b@." V3.pp (Bbox.size b) V3.pp (Bbox.center b) (Bbox.is_empty Bbox.empty);
  [%expect {| (10, 20, 5) (5, 10, 2.5) true |}]
