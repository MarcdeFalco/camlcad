open Cad

let rect_trou : Sketch_desc.t =
  { points = [| (0., 0., true); (38., 1., false); (41., 22., false); (1., 19., false); (20., 12., false) |];
    lines = [| (0, 1); (1, 2); (2, 3); (3, 0) |];
    circles = [| (4, 3.) |];
    constraints =
      Sketch_desc.
        [ { kind = "horizontal"; refs = [ 0 ]; value = None }; { kind = "vertical"; refs = [ 1 ]; value = None };
          { kind = "horizontal"; refs = [ 2 ]; value = None }; { kind = "vertical"; refs = [ 3 ]; value = None };
          { kind = "length"; refs = [ 0 ]; value = Some 40. }; { kind = "length"; refs = [ 1 ]; value = Some 20. };
          { kind = "hdistance"; refs = [ 0; 4 ]; value = Some 20. }; { kind = "vdistance"; refs = [ 0; 4 ]; value = Some 10. };
          { kind = "radius"; refs = [ 0 ]; value = Some 4. } ];
    loops = [ [ 0; 1; 2; 3 ] ] }

let r x = Float.round (x *. 1e6) /. 1e6 +. 0.

let%expect_test "résolution et code" =
  (match Sketch_desc.solve rect_trou with
  | Error e -> print_endline e
  | Ok s ->
      Printf.printf "dof=%d redondantes=%d rayon=%g\n" s.dof s.redundant (r s.radii.(0));
      Array.iter (fun (p : Geom.V2.t) -> Printf.printf "(%g, %g) " (r p.x) (r p.y)) s.points;
      print_newline ());
  print_string (Sketch_desc.to_code rect_trou);
  [%expect {|
    dof=0 redondantes=0 rayon=4
    (0, 0) (40, 0) (40, 20) (0, 20) (20, 10)
        let open Sketch.Syntax in
        let* p0 = Sketch.point ~fixed:true 0. 0.
        and* p1 = Sketch.point 38. 1.
        and* p2 = Sketch.point 41. 22.
        and* p3 = Sketch.point 1. 19.
        and* p4 = Sketch.point 20. 12.
        in
        let* l0 = Sketch.line p0 p1
        and* l1 = Sketch.line p1 p2
        and* l2 = Sketch.line p2 p3
        and* l3 = Sketch.line p3 p0
        in
        let* c0 = Sketch.circle p4 3.
        in
        let+ () =
          Sketch.constrain
            Sketch.[ horizontal l0;
                     vertical l1;
                     horizontal l2;
                     vertical l3;
                     length l0 40.;
                     length l1 20.;
                     hdistance p0 p4 20.;
                     vdistance p0 p4 10.;
                     radius c0 4. ]
        in
        Sketch.(loop [ p0; p1; p2; p3 ] - disk c0)
    |}]

let%expect_test "erreurs de description" =
  let bad k refs = { rect_trou with constraints = [ { Sketch_desc.kind = k; refs; value = None } ] } in
  List.iter
    (fun d -> match Sketch_desc.solve d with Ok _ -> print_endline "ok ?" | Error e -> print_endline e)
    [ bad "length" [ 0 ]; bad "horizontal" [ 9 ]; bad "tangent" [ 0 ]; bad "glisse" [];
      { rect_trou with loops = [ [ 0; 1 ] ] } ];
  [%expect {|
    contrainte length : valeur manquante
    contrainte horizontal : références invalides
    contrainte tangent : références invalides
    contrainte inconnue : glisse
    boucle invalide
    |}]
