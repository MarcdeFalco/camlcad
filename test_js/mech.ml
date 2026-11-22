(* Mécanismes avec manifold-3d : interférences sur toute la course. *)
open Cad
open Cad_mech
module E = Eval.Make (Kernel_manifold_js)

let cache = E.create ()
let volume s = Kernel_manifold_js.volume (E.solid cache s)

let () =
  let check ?(driver = "manivelle") ?(range = (0., 360.)) name a =
    let poses = Assembly.sweep ~steps:24 a ~driver range in
    let bad =
      List.concat_map
        (function
          | Ok (q, p) -> List.map (fun (x, y, v) -> Printf.sprintf "%g° %s/%s %.1f mm3" q x y v) (Assembly.interferences ~volume a p)
          | Error e -> [ e ])
        poses
    in
    Printf.printf "%s : %d poses, %d interférences%s\n" name (List.length poses) (List.length bad)
      (match bad with [] -> "" | b :: _ -> " (ex. " ^ b ^ ")")
  in
  check "bielle (jeu 0.5)" (Cad_examples.Bielle.make ());
  check "bielle (jeu -0.5)" (Cad_examples.Bielle.make ~jeu:(-0.5) ())

let () =
  (* un pas de dent de la petite roue, finement échantillonné *)
  let range = (0., 30.) and driver = "roue1" in
  let sweep name a =
    let n =
      List.fold_left
        (fun n -> function
          | Ok (_, p) -> n + List.length (List.filter (fun (x, y, _) -> x <> "bati" && y <> "bati") (Assembly.interferences ~volume a p))
          | Error _ -> n + 1000)
        0 (Assembly.sweep ~steps:15 a ~driver range)
    in
    Printf.printf "%s : %d poses en interférence sur 16\n" name n
  in
  sweep "engrenages 12/20, jeu 0.15" (Cad_examples.Engrenages.make ());
  sweep "engrenages 13/31, jeu 0.15" (Cad_examples.Engrenages.make ~z1:13 ~z2:31 ());
  sweep "engrenages 12/20, jeu -0.3" (Cad_examples.Engrenages.make ~jeu:(-0.3) ())
