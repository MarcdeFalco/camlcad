open Cad
open Sketch.Syntax

let r x = Float.round (x *. 1e6) /. 1e6 +. 0.
let pp_pts (s : Sketch.solved) =
  Array.iteri (fun i (p : Geom.V2.t) -> Printf.printf " p%d=(%.4g, %.4g)" i (r p.x) (r p.y)) s.points

let show = function
  | Ok (s : Sketch.solved) ->
      Printf.printf "dof=%d redondantes=%d" s.dof s.redundant;
      pp_pts s;
      print_newline ()
  | Error e -> print_endline e

(* Rectangle ancré à l'origine ; [extra] ajoute des contraintes. *)
let rect ?(w = Some 40.) ?(h = Some 25.) ?(extra = fun _ _ -> []) () =
  let* a = Sketch.point ~fixed:true 0. 0. in
  let* b = Sketch.point 35. 3. and* c = Sketch.point 38. 22. and* d = Sketch.point (-2.) 20. in
  let* ab = Sketch.line a b and* bc = Sketch.line b c and* cd = Sketch.line c d and* da = Sketch.line d a in
  let* () =
    Sketch.constrain
      (Sketch.[ horizontal ab; vertical bc; horizontal cd; vertical da ]
      @ (match w with Some w -> [ Sketch.length ab w ] | None -> [])
      @ (match h with Some h -> [ Sketch.length bc h ] | None -> [])
      @ extra ab bc)
  in
  Sketch.return (Sketch.loop [ a; b; c; d ])

let%expect_test "rectangle : bien, sous- et sur-contraint, incompatible" =
  show (Sketch.solve (rect ()));
  show (Sketch.solve (rect ~h:None ()));
  show (Sketch.solve (rect ~extra:(fun ab _ -> [ Sketch.length ab 40. ]) ()));
  show (Sketch.solve (rect ~extra:(fun ab _ -> [ Sketch.length ab 20. ]) ()));
  [%expect {|
    dof=0 redondantes=0 p0=(0, 0) p1=(40, 0) p2=(40, 25) p3=(0, 25)
    dof=1 redondantes=0 p0=(0, 0) p1=(40, 0) p2=(40, 21) p3=(0, 21)
    dof=0 redondantes=1 p0=(0, 0) p1=(40, 0) p2=(40, 25) p3=(0, 25)
    esquisse : contraintes incompatibles (résidu 10 après 6 itérations)
    |}]

let%expect_test "triangle rectangle, angle, cercle tangent" =
  show
    (Sketch.solve
       (let* a = Sketch.point ~fixed:true 0. 0. in
        let* b = Sketch.point 40. 2. and* c = Sketch.point 5. 30. in
        let* ab = Sketch.line a b and* ac = Sketch.line a c in
        let+ () = Sketch.constrain Sketch.[ horizontal ab; perpendicular ab ac; length ab 40.; length ac 30. ] in
        Sketch.loop [ a; b; c ]));
  show
    (Sketch.solve
       (let* a = Sketch.point ~fixed:true 0. 0. in
        let* b = Sketch.point 10. 1. and* c = Sketch.point 8. 8. in
        let* ab = Sketch.line a b and* ac = Sketch.line a c in
        let+ () = Sketch.constrain Sketch.[ horizontal ab; angle ab ac 60.; length ab 10.; equal_length ab ac ] in
        Sketch.loop [ a; b; c ]));
  (* cercle de rayon 5 tangent à l'axe x, centre sur x = 12 *)
  show
    (Sketch.solve
       (let* o = Sketch.point ~fixed:true 0. 0. and* e = Sketch.point ~fixed:true 1. 0. in
        let* axe = Sketch.line o e in
        let* c = Sketch.point 11. 7. in
        let* k = Sketch.circle c 4. in
        let+ () = Sketch.constrain Sketch.[ tangent axe k; radius k 5.; hdistance o c 12. ] in
        Sketch.disk k));
  [%expect {|
    dof=0 redondantes=0 p0=(0, 0) p1=(40, 0) p2=(0, 30)
    dof=0 redondantes=0 p0=(0, 0) p1=(10, 0) p2=(5, 8.66)
    dof=0 redondantes=0 p0=(0, 0) p1=(1, 0) p2=(12, 5)
    |}]

let%expect_test "rang numérique" =
  Printf.printf "%d %d %d\n"
    (Nlsolve.rank [| [| 1.; 2. |]; [| 2.; 4. |] |])
    (Nlsolve.rank [| [| 1.; 0.; 0. |]; [| 0.; 1e-3; 0. |] |])
    (Nlsolve.rank [||]);
  [%expect {| 1 2 0 |}]

(* Propriété : un rectangle bien contraint converge vers la même forme quelle
   que soit la position initiale (dans une boule raisonnable). *)
let%expect_test "indépendance à la position initiale" =
  let gen = QCheck2.Gen.(array_size (return 6) (float_range (-8.) 8.)) in
  Prop.check ~count:100 "rectangle 40x25" gen (fun d ->
      let m =
        let* a = Sketch.point ~fixed:true 0. 0. in
        let* b = Sketch.point (40. +. d.(0)) d.(1) and* c = Sketch.point (40. +. d.(2)) (25. +. d.(3)) in
        let* dd = Sketch.point d.(4) (25. +. d.(5)) in
        let* ab = Sketch.line a b and* bc = Sketch.line b c and* cd = Sketch.line c dd and* da = Sketch.line dd a in
        let+ () =
          Sketch.constrain
            Sketch.[ horizontal ab; vertical bc; horizontal cd; vertical da; length ab 40.; length bc 25.;
                     hdistance a b 40.; vdistance b c 25. ]
        in
        Sketch.loop [ a; b; c; dd ]
      in
      match Sketch.solve m with
      | Error _ -> false
      | Ok s -> Geom.V2.equal ~eps:1e-6 s.points.(2) (Geom.V2.v 40. 25.));
  [%expect {| |}]
