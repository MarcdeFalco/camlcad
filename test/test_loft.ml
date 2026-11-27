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
