open Cad

let tetra =
  {
    Mesh.vertices = [| 0.; 0.; 0.; 1.; 0.; 0.; 0.; 1.; 0.; 0.; 0.; 1. |];
    triangles = [| 0; 2; 1; 0; 1; 3; 0; 3; 2; 1; 2; 3 |];
  }

let%expect_test "Mesh sur un tétraèdre" =
  Printf.printf "%g %b %d\n" (Mesh.volume tetra) (Mesh.is_closed tetra)
    (Mesh.euler_characteristic tetra);
  [%expect {| 0.166667 true 2 |}]

let%expect_test "STL binaire : taille et aller-retour" =
  let s = Cad_export.Stl.to_string tetra in
  let back = Cad_export.Stl.of_string s in
  Printf.printf "%d %d %d\n" (String.length s) (Mesh.n_triangles back) (Mesh.n_vertices back);
  [%expect {| 284 4 4 |}]

let%expect_test "CRC-32 de référence" =
  Printf.printf "%lx\n" (Cad_export.Threemf.crc32 "123456789");
  [%expect {| cbf43926 |}]

let%expect_test "3MF : archive lisible" =
  let s = Cad_export.Threemf.(to_string [ obj ~color:(200, 30, 30) "tetra" tetra ]) in
  (* ZIP en mode stocké : signature locale en tête, noms et XML lisibles en clair. *)
  let has sub =
    let n = String.length sub in
    let rec go i = i + n <= String.length s && (String.sub s i n = sub || go (i + 1)) in
    go 0
  in
  Printf.printf "%S %b %b %b\n" (String.sub s 0 4) (has "3D/3dmodel.model")
    (has "unit=\"millimeter\"") (has "name=\"tetra\"");
  [%expect {| "PK\003\004" true true true |}]
