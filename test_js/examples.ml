(* Géométrie des pièces de référence avec manifold-3d : maillage fermé,
   volume, genre. Avec CAMLCAD_OUT=dossier, écrit aussi les 3MF. *)
open Cad
module E = Eval.Make (Kernel_manifold_js)

let () =
  let out = Sys.getenv_opt "CAMLCAD_OUT" in
  List.iter
    (fun (name, model) ->
      match Doc.run model with
      | Error e -> Printf.printf "%s : erreur %s\n" name e.message
      | Ok (s, j) ->
          let solid = E.solid (E.create ()) s in
          let mesh = Kernel_manifold_js.to_mesh solid in
          let b = Mesh.bbox mesh in
          Printf.printf "%s : volume %.0f mm3, fermé %b, genre %d, boîte %.1f x %.1f x %.1f\n" name
            (Mesh.volume mesh) (Mesh.is_closed mesh) (Kernel_manifold_js.genus solid)
            (b.max.x -. b.min.x) (b.max.y -. b.min.y) (b.max.z -. b.min.z);
          (* Pièces imprimées en place : les features « aile_* » ne se touchent pas. *)
          let shape n = (List.find (fun (f : Doc.feature_info) -> f.f_name = n) j.features).f_shape in
          if name = "charniere" then
            Printf.printf "  interférence aile_a * aile_b : %.3f mm3\n"
              (Kernel_manifold_js.volume (E.solid (E.create ()) Shape.(shape "aile_a" * shape "aile_b")));
          Option.iter
            (fun d -> Cad_export.Threemf.(to_file (Filename.concat d (name ^ ".3mf")) [ obj name mesh ]))
            out)
    Cad_examples.all
