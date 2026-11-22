(* Exemple de bout en bout : un support percé paramétré, exporté en 3MF. *)
open Cad
open Doc.Syntax
module E = Eval.Make (Kernel_manifold_js)

let support =
  let* l = Doc.param "longueur" ~range:(20., 120.) 60. in
  let* d = Doc.param "diametre" ~range:(2., 10.) 5. in
  let* base = Doc.feature ~name:"base" (Shape.cube (Geom.V3.v l 20. 4.)) in
  let trou x = Shape.(cylinder ~r:(d /. 2.) ~h:4. () |> translate (Geom.V3.v x 10. 0.)) in
  let* trous = Doc.feature ~name:"trous" Shape.(trou 10. + trou (l -. 10.)) in
  Doc.feature ~name:"support" Shape.(base - trous)

let () =
  match Doc.run ~overrides:[ ("longueur", 80.) ] support with
  | Error e -> Printf.printf "erreur : %s\n" e.message
  | Ok (s, j) ->
      List.iter (fun (f : Doc.feature_info) -> Printf.printf "%s " f.f_name) j.features;
      let mesh = E.mesh (E.create ()) s in
      Cad_export.Threemf.(to_file "support.3mf" [ obj ~color:(40, 120, 200) "support" mesh ]);
      Printf.printf "\nvolume %.0f mm3, fermé %b\n" (Mesh.volume mesh) (Mesh.is_closed mesh)
