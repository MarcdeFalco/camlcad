open Cad

let rect_trou : Sketch_desc.t =
  { points = [| (0., 0., true); (38., 1., false); (41., 22., false); (1., 19., false); (20., 12., false) |];
    lines = [| (0, 1); (1, 2); (2, 3); (3, 0) |];
    circles = [| (4, 3.) |];
    arcs = [||]; ellipses = [||];
    constraints =
      Sketch_desc.
        [ { kind = "horizontal"; refs = [ 0 ]; value = None; expr = None }; { kind = "vertical"; refs = [ 1 ]; value = None; expr = None };
          { kind = "horizontal"; refs = [ 2 ]; value = None; expr = None }; { kind = "vertical"; refs = [ 3 ]; value = None; expr = None };
          { kind = "length"; refs = [ 0 ]; value = Some 40.; expr = None }; { kind = "length"; refs = [ 1 ]; value = Some 20.; expr = None };
          { kind = "hdistance"; refs = [ 0; 4 ]; value = Some 20.; expr = None }; { kind = "vdistance"; refs = [ 0; 4 ]; value = Some 10.; expr = None };
          { kind = "radius"; refs = [ 0 ]; value = Some 4.; expr = None } ];
    loops = [ Sketch_desc.[ P 0; P 1; P 2; P 3 ] ] }

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
  let bad k refs = { rect_trou with constraints = [ { Sketch_desc.kind = k; refs; value = None; expr = None } ] } in
  List.iter
    (fun d -> match Sketch_desc.solve d with Ok _ -> print_endline "ok ?" | Error e -> print_endline e)
    [ bad "length" [ 0 ]; bad "horizontal" [ 9 ]; bad "tangent" [ 0 ]; bad "glisse" [];
      { rect_trou with loops = [ Sketch_desc.[ P 0; P 1 ] ] } ];
  [%expect {|
    contrainte length : valeur manquante
    contrainte horizontal : références invalides
    contrainte tangent : références invalides
    contrainte inconnue : glisse
    boucle invalide
    |}]

(* Oblong (slot) : deux demi-cercles de rayon 5 aux centres p0 et p1, reliés par
   deux segments implicites. Les arcs vont du haut au bas (gauche) et du bas au haut (droite). *)
let oblong : Sketch_desc.t =
  { points = [| (0., 0., true); (30., 0., true); (0., 5., false); (0., -5., false); (30., -5., false); (30., 5., false) |];
    lines = [| (3, 4); (5, 2) |];
    circles = [||];
    arcs = [| (0, 2, 3); (1, 4, 5) |]; ellipses = [||];
    constraints =
      Sketch_desc.
        [ { kind = "arc_radius"; refs = [ 0 ]; value = Some 5.; expr = None }; { kind = "tangent_arc"; refs = [ 0; 0 ]; value = None; expr = None };
          { kind = "tangent_arc"; refs = [ 0; 1 ]; value = None; expr = None }; { kind = "tangent_arc"; refs = [ 1; 1 ]; value = None; expr = None } ];
    loops = [ Sketch_desc.[ A 0; A 1 ] ] }

let%expect_test "oblong : arcs dans un contour" =
  (match Sketch_desc.solve oblong with
  | Error e -> print_endline e
  | Ok s -> (
      Printf.printf "dof %d\n" s.dof;
      match Profile.view s.profile with
      | Polygon ps ->
          let n = List.length ps and area = ref 0. in
          List.iteri (fun i (a : Geom.V2.t) -> area := !area +. Geom.V2.cross a (List.nth ps ((i + 1) mod n))) ps;
          Printf.printf "%d sommets, aire %.1f (exacte %.1f)\n" n (!area /. 2.) ((30. *. 10.) +. (Float.pi *. 25.))
      | _ -> print_endline "pas un polygone"));
  print_string (Sketch_desc.to_code ~indent:0 oblong |> String.split_on_char '\n' |> List.filteri (fun i _ -> i >= 10) |> String.concat "\n");
  [%expect {|
    dof 2
    74 sommets, aire 378.4 (exacte 378.5)
    in
    let* a0 = Sketch.arc p0 p2 p3
    and* a1 = Sketch.arc p1 p4 p5
    in
    let+ () =
      Sketch.constrain
        Sketch.[ arc_radius a0 5.;
                 tangent_arc l0 a0;
                 tangent_arc l0 a1;
                 tangent_arc l1 a1 ]
    in
    Sketch.(path [ along a0; along a1 ])
    |}]

let%expect_test "symétrie : point reflété par rapport à une droite" =
  let d : Sketch_desc.t =
    { points = [| (0., 0., true); (0., 10., true); (3., 4., true); (-1., 5., false) |];
      lines = [| (0, 1) |]; circles = [||]; arcs = [||]; ellipses = [||];
      constraints = [ { kind = "symmetric"; refs = [ 2; 3; 0 ]; value = None; expr = None } ];
      loops = [] }
  in
  (match Sketch_desc.solve d with
  | Ok s -> Printf.printf "(%.3f, %.3f) dof %d\n" s.points.(3).x s.points.(3).y s.dof
  | Error e -> print_endline e);
  [%expect {| (-3.000, 4.000) dof 0 |}]

(* Cadre : un carré de 20 et, dedans, son décalé de 3 (lignes parallèles à distance 3) :
   la boucle intérieure est un trou (profondeur 1). Aire : 400 - 14² = 204. *)
let%expect_test "boucles imbriquées et décalage" =
  let d : Sketch_desc.t =
    { points =
        [| (0., 0., true); (20., 0., true); (20., 20., true); (0., 20., true);
           (3.5, 3.5, false); (16., 3., false); (16.5, 17., false); (3., 16., false) |];
      lines = [| (0, 1); (1, 2); (2, 3); (3, 0); (4, 5); (5, 6); (6, 7); (7, 4) |];
      circles = [||]; arcs = [||]; ellipses = [||];
      constraints =
        List.concat
          (List.init 4 (fun i ->
               Sketch_desc.
                 [ { kind = "parallel"; refs = [ i; i + 4 ]; value = None; expr = None };
                   { kind = "point_line_distance"; refs = [ 4 + i; i ]; value = Some 3.; expr = None } ]));
      loops = Sketch_desc.[ [ P 0; P 1; P 2; P 3 ]; [ P 4; P 5; P 6; P 7 ] ] }
  in
  (match Sketch_desc.solve d with
  | Error e -> print_endline e
  | Ok s ->
      let rec area p =
        match Profile.view p with
        | Polygon ps ->
            let n = List.length ps in
            Float.abs (List.fold_left ( +. ) 0. (List.mapi (fun i (a : Geom.V2.t) -> Geom.V2.cross a (List.nth ps ((i + 1) mod n))) ps)) /. 2.
        | Difference (a, b) -> area a -. area b
        | Union (a, b) -> area a +. area b
        | _ -> nan
      in
      Printf.printf "dof %d, aire %.1f\n" s.dof (area s.profile));
  print_string (String.concat "\n" (List.filter (fun l -> String.length l > 0 && l.[0] = 'S') (String.split_on_char '\n' (Sketch_desc.to_code ~indent:0 d))));
  [%expect {|
    dof 0, aire 204.0
    Sketch.(loop [ p0; p1; p2; p3 ] - loop [ p4; p5; p6; p7 ])
    |}]

let%expect_test "cote liée à un paramètre : expression écrite telle quelle" =
  let d =
    { rect_trou with
      constraints =
        [ { Sketch_desc.kind = "length"; refs = [ 0 ]; value = Some 30.; expr = Some "largeur /. 2." } ] }
  in
  String.split_on_char '\n' (Sketch_desc.to_code ~indent:0 d)
  |> List.filter (fun l -> String.length l > 0 && (String.contains l '[' || String.contains l 'l' && String.sub l 0 3 = "Ske"))
  |> List.iter print_endline;
  [%expect {|
        Sketch.[ length l0 (largeur /. 2.) ]
    Sketch.(loop [ p0; p1; p2; p3 ] - disk c0)
    |}]

(* Goutte : courbe lisse fermée par quatre points ; aire proche du losange arrondi. *)
let%expect_test "courbe lisse fermée (spline)" =
  let d : Sketch_desc.t =
    { points = [| (0., 0., true); (20., 0., true); (20., 20., true); (0., 20., true) |];
      lines = [||]; circles = [||]; arcs = [||]; ellipses = [||]; constraints = [];
      loops = Sketch_desc.[ [ S [ 0; 1; 2; 3; 0 ] ] ] }
  in
  (match Sketch_desc.solve d with
  | Error e -> print_endline e
  | Ok s -> (
      match Profile.view s.profile with
      | Polygon ps ->
          let n = List.length ps and area = ref 0. in
          List.iteri (fun i (a : Geom.V2.t) -> area := !area +. Geom.V2.cross a (List.nth ps ((i + 1) mod n))) ps;
          Printf.printf "%d sommets, aire %.0f\n" n (Float.abs !area /. 2.)
      | _ -> print_endline "?"));
  print_string (List.nth (String.split_on_char '\n' (Sketch_desc.to_code ~indent:0 d)) 7);
  [%expect {|
    32 sommets, aire 544
    Sketch.(path [ spline [ p0; p1; p2; p3; p0 ] ])
    |}]

let%expect_test "ellipse : région et code" =
  let d : Sketch_desc.t =
    { points = [| (0., 0., true); (10., 0., true) |]; lines = [||]; circles = [||]; arcs = [||];
      ellipses = [| (0, 1, 5.) |]; constraints = []; loops = [] }
  in
  (match Sketch_desc.solve d with
  | Error e -> print_endline e
  | Ok s -> (
      match Profile.view s.profile with
      | Polygon ps ->
          let n = List.length ps and area = ref 0. in
          List.iteri (fun i (a : Geom.V2.t) -> area := !area +. Geom.V2.cross a (List.nth ps ((i + 1) mod n))) ps;
          Printf.printf "aire %.1f (π·10·5 = %.1f)\n" (Float.abs !area /. 2.) (Float.pi *. 50.)
      | _ -> print_endline "?"));
  String.split_on_char '\n' (Sketch_desc.to_code ~indent:0 d)
  |> List.filter (fun l -> String.length l > 6 && (String.sub l 0 6 = "let* e" || String.sub l 0 6 = "Sketch"))
  |> List.iter print_endline;
  [%expect {|
    aire 156.8 (π·10·5 = 157.1)
    let* e0 = Sketch.ellipse p0 p1 5.
    Sketch.(oval e0)
    |}]
