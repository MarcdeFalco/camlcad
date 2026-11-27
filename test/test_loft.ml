open Cad
open Geom

let square c = [ V2.v (-.c) (-.c); V2.v c (-.c); V2.v c c; V2.v (-.c) c ]
let show m = Printf.printf "fermé %b, %d triangles, volume %.2f\n" (Mesh.is_closed m) (Mesh.n_triangles m) (Mesh.volume m)

let%expect_test "Loft.mesh : prisme, tronc de pyramide, carré vers cercle, sens inverse" =
  show (Loft.mesh [ (Frame.world, square 5.); (Frame.at 0. 0. 10., square 5.) ]);
  show (Loft.mesh [ (Frame.world, square 10.); (Frame.at 0. 0. 10., square 5.) ]);
  let disc = Option.get (Loft.outline ~segments:32 (Profile.circle ~r:4.)) in
  show (Loft.mesh [ (Frame.world, square 5.); (Frame.at 0. 0. 8., disc) ]);
  (* Contours en sens indirect, plans dans l'ordre inverse de leur normale : toujours orienté. *)
  show (Loft.mesh [ (Frame.at 0. 0. 10., List.rev (square 5.)); (Frame.world, square 5.) ]);
  show (Loft.mesh [ (Frame.world, square 5.) ]);
  print_endline (match Loft.outline ~segments:8 Profile.(difference (circle ~r:3.) (circle ~r:1.)) with None -> "booléen : None" | Some _ -> "?");
  [%expect {|
    fermé true, 12 triangles, volume 1000.00
    fermé true, 12 triangles, volume 2333.33
    fermé true, 124 triangles, volume 591.30
    fermé true, 12 triangles, volume 1000.00
    fermé true, 0 triangles, volume 0.00
    booléen : None
    |}]

let%expect_test "Loft.sweep_sections : droit, coude à 90°, coude à 45°" =
  let sweep prof path = show (Loft.mesh (Loft.sweep_sections prof path)) in
  sweep (square 5.) [ V3.zero; V3.v 0. 0. 10. ];
  (* Carré de 2 le long d'un L de 10 + 10 : 4 × 20 = 80 (coupe d'onglet). *)
  sweep (square 1.) [ V3.zero; V3.v 0. 0. 10.; V3.v 10. 0. 10. ];
  sweep (square 1.) [ V3.zero; V3.v 10. 0. 0.; V3.v 20. 10. 0.; V3.v 20. 20. 0. ];
  print_int (List.length (Loft.sweep_sections (square 1.) [ V3.zero; V3.zero ]));
  [%expect {|
    fermé true, 12 triangles, volume 1000.00
    fermé true, 20 triangles, volume 80.00
    fermé true, 28 triangles, volume 136.57
    0
    |}]

let%expect_test "Loft.offset_outline : carré, sens indirect" =
  let pr c = List.iter (fun (p : V2.t) -> Printf.printf "(%g, %g) " (p.x +. 0.) (p.y +. 0.)) c; print_newline () in
  pr (Loft.offset_outline 1. (square 5.));
  pr (Loft.offset_outline (-2.) (List.rev (square 5.)));
  [%expect {|
    (-6, -6) (6, -6) (6, 6) (-6, 6)
    (-3, -3) (3, -3) (3, 3) (-3, 3)
    |}]
