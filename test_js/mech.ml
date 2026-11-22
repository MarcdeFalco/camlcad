(* Mécanismes avec manifold-3d : interférences sur toute la course. *)
open Cad
open Cad_mech
module E = Eval.Make (Kernel_manifold_js)

let cache = E.create ()
let volume s = Kernel_manifold_js.volume (E.solid cache s)

let () =
  let check name a =
    let poses = Assembly.sweep ~steps:24 a ~driver:"manivelle" (0., 360.) in
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
