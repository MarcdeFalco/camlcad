open Cad_parts

let%expect_test "Thread : pas ISO, section" =
  Printf.printf "%g %g %g\n" (Thread.pitch 3.) (Thread.pitch 6.) (Thread.pitch 10.);
  (match Thread.pitch 7. with _ -> () | exception Invalid_argument m -> print_endline m);
  (match Cad.Profile.view (Thread.section ~segments:4 ~d:6. ~pitch:1. ()) with
  | Polygon ps -> List.iter (fun (p : Geom.V2.t) -> Printf.printf "(%.3f, %.3f) " (p.x +. 0.) (p.y +. 0.)) ps
  | _ -> print_string "?");
  [%expect {|
    0.5 1 1.5
    Thread.pitch : pas de pas ISO pour M7
    (2.387, 0.000) (0.000, 2.693) (-3.000, 0.000) (-0.000, -2.693)
    |}]
