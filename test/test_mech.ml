open Cad_mech

let%expect_test "bielle-manivelle : boucle fermée contre la formule" =
  let a = Cad_examples.Bielle.make () in
  Printf.printf "coordonnées : %s\n" (String.concat ", " (Assembly.coordinates a));
  List.iter
    (function
      | Ok (q, pose) ->
          let x = List.assoc "coulisseau" pose in
          Printf.printf "manivelle %4.0f°  coulisseau %7.3f  écart %.1e\n" q x
            (Float.abs (x -. Cad_examples.Bielle.x_theorique q))
      | Error e -> print_endline e)
    (List.filteri (fun i _ -> i mod 3 = 0) (Assembly.sweep ~steps:12 a ~driver:"manivelle" (0., 360.)));
  [%expect {|
    coordonnées : manivelle, coulisseau, bielle
    manivelle    0°  coulisseau  65.000  écart 0.0e+00
    manivelle   90°  coulisseau  47.697  écart 1.4e-08
    manivelle  180°  coulisseau  35.000  écart 9.9e-11
    manivelle  270°  coulisseau  47.697  écart 1.0e-12
    manivelle  360°  coulisseau  65.000  écart 0.0e+00
    |}]

let%expect_test "placements : la tête de bielle suit le coulisseau" =
  let a = Cad_examples.Bielle.make () in
  match Assembly.solve a [ ("manivelle", 50.) ] with
  | Error e -> print_endline e
  | Ok pose ->
      let pl = Assembly.placements a pose in
      let frame n = snd (List.find (fun ((p : Part.t), _) -> p.name = n) pl) in
      let port n p = Geom.Frame.compose (frame n) (Part.port (fst (List.find (fun ((q : Part.t), _) -> q.name = n) pl)) p) in
      Printf.printf "%b\n" (Geom.V3.equal ~eps:1e-6 (Geom.Frame.origin (port "bielle" "tete")) (Geom.Frame.origin (port "coulisseau" "axe")));
      [%expect {| true |}]

let%expect_test "couplage d'engrenages et erreurs" =
  let s = Cad.Shape.cube (Geom.V3.v 1. 1. 1.) in
  let b = Part.make "bati" s ~ports:[ ("a", Geom.Frame.world); ("b", Geom.Frame.at 30. 0. 0.) ] in
  let r1 = Part.make "r1" s ~ports:[ ("axe", Geom.Frame.world) ] in
  let r2 = Part.make "r2" s ~ports:[ ("axe", Geom.Frame.world) ] in
  let a =
    Assembly.make ~ground:b
      [ Joint.revolute ~name:"j1" Part.(b @: "a") Part.(r1 @: "axe");
        Joint.revolute ~name:"j2" ~limits:(-90., 90.) Part.(b @: "b") Part.(r2 @: "axe") ]
      ~couplings:[ { driver = "j1"; driven = "j2"; ratio = -0.5 } ]
  in
  let show = function
    | Ok p -> print_endline (String.concat " " (List.map (fun (n, q) -> Printf.sprintf "%s=%g" n q) p))
    | Error e -> print_endline e
  in
  show (Assembly.solve a [ ("j1", 30.) ]);
  show (Assembly.solve a [ ("j1", 400.) ]);
  show (Assembly.solve a [ ("j1", 30.); ("j2", 0.) ]);
  (match Assembly.make ~ground:b [ Joint.revolute Part.(r1 @: "axe") Part.(r2 @: "axe") ] with
  | _ -> print_endline "?"
  | exception Invalid_argument e -> print_endline e);
  [%expect {|
    j1=30 j2=-15
    j2 hors butée (-200)
    pose inaccessible (résidu 15)
    Assembly.make : liaisons non reliées à la pièce fixe (ou cycle)
    |}]
