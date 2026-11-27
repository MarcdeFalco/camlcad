(* Exemples de la skill (skills/camlcad/examples) avec un noyau : solides fermés, volume,
   genre, encombrement ; pignon-crémaillère sans interférence sur sa course. *)
module Str_compat = struct
  let contains s sub =
    let n = String.length s and m = String.length sub in
    let rec go i = i + m <= n && (String.sub s i m = sub || go (i + 1)) in
    go 0
end

module Make (K : Cad.Kernel.S) = struct
  module E = Cad.Eval.Make (K)
  open Cad
  module S = Camlcad_skill_examples

  let cache = E.create ()

  let () =
    List.iter
      (fun (name, overrides, model) ->
        match Doc.run ~overrides model with
        | Error e -> Printf.printf "%s : erreur %s\n" name e.message
        | Ok (s, _) ->
            let solid = E.solid cache s in
            let mesh = K.to_mesh solid in
            let b = Mesh.bbox mesh in
            Printf.printf "%s : volume %.0f mm3, fermé %b, genre %d, boîte %.1f x %.1f x %.1f, zmin %.1f\n" name
              (Mesh.volume mesh) (Mesh.is_closed mesh) (K.genus solid) (b.max.x -. b.min.x) (b.max.y -. b.min.y)
              (b.max.z -. b.min.z) b.min.z)
      [ ("boite", [], S.Boite.model); ("equerre", [], S.Equerre.model); ("molette", [], S.Molette.model);
        ("molette M8", [ ("filetage", 8.) ], S.Molette.model) ]

  let () =
    let volume s = K.volume (E.solid cache s) in
    let check name a =
      let poses = Cad_mech.Assembly.sweep ~steps:24 a ~driver:"pignon" (-60., 60.) in
      let bad =
        List.concat_map
          (function
            | Ok (q, p) ->
                List.map (fun (x, y, v) -> Printf.sprintf "%g° %s/%s %.1f mm3" q x y v)
                  (Cad_mech.Assembly.interferences ~volume a p)
            | Error e -> [ e ])
          poses
      in
      let dents = List.filter (fun s -> Str_compat.contains s "pignon/cremaillere") bad in
      Printf.printf "%s : %d poses, %d interférences dont %d entre les dentures%s\n" name (List.length poses)
        (List.length bad) (List.length dents)
        (match dents with [] -> "" | b :: _ -> " (ex. " ^ b ^ ")")
    in
    check "pignon-crémaillère z20" (S.Cremaillere.make ());
    check "pignon-crémaillère z18" (S.Cremaillere.make ~dents:18 ());
    check "pignon-crémaillère z23" (S.Cremaillere.make ~dents:23 ());
    check "pignon-crémaillère jeu -0.3" (S.Cremaillere.make ~jeu:(-0.3) ())
end
