open Cad

(* Tétraèdre unité : (0,0,0) (1,0,0) (0,1,0) (0,0,1). *)
let tetra =
  { Mesh.vertices = [| 0.; 0.; 0.; 1.; 0.; 0.; 0.; 1.; 0.; 0.; 0.; 1. |];
    triangles = [| 0; 2; 1; 0; 1; 3; 0; 3; 2; 1; 2; 3 |] }

let%expect_test "distance point-surface" =
  let d x y z = Printf.printf "%.6f " (Mesh.distance tetra (Geom.V3.v x y z)) in
  d 0.2 0.2 0.;   (* sur une face *)
  d 0.2 0.2 (-1.); (* sous la face z = 0 *)
  d (-1.) (-1.) (-1.); (* sommet le plus proche : origine *)
  d 1. 1. 1.;     (* face oblique x+y+z=1 : (3-1)/sqrt 3 *)
  d 0.5 (-1.) 0.; (* arête (0,0,0)-(1,0,0) *)
  Printf.printf "%b\n" (Mesh.distance Mesh.empty Geom.V3.zero = infinity);
  [%expect {| 0.000000 1.000000 1.732051 1.154701 1.000000 true |}]
