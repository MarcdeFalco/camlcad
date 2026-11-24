(* cad PIÈCE [-D nom=valeur]... [--json] [--stl F] [--3mf F]
   Évalue une pièce (ou un mécanisme) de Cad_examples avec le noyau natif.
   Sans option : résumé (volume, boîte, genre, temps). *)
open Cad
module K = Kernel_manifold_native
module E = Eval.Make (K)

let usage () =
  prerr_endline
    ("usage : cad PIÈCE [-D nom=valeur]... [--json] [--stl F] [--3mf F]\npièces : "
    ^ String.concat ", " (List.map fst Cad_examples.all @ List.map fst Cad_examples.mechanisms));
  exit 2

let () =
  let ov = ref [] and json = ref false and stl = ref None and tmf = ref None and name = ref None in
  let rec parse = function
    | "-D" :: kv :: r -> (
        match String.index_opt kv '=' with
        | Some i ->
            ov := (String.sub kv 0 i, float_of_string (String.sub kv (i + 1) (String.length kv - i - 1))) :: !ov;
            parse r
        | None -> usage ())
    | "--json" :: r -> json := true; parse r
    | "--stl" :: f :: r -> stl := Some f; parse r
    | "--3mf" :: f :: r -> tmf := Some f; parse r
    | n :: r when !name = None && n.[0] <> '-' -> name := Some n; parse r
    | _ :: _ -> usage ()
    | [] -> ()
  in
  parse (List.tl (Array.to_list Sys.argv));
  if not (K.available ()) then (prerr_endline "cad : compilé sans Manifold (scripts/build-manifold.sh)"; exit 2);
  let n = match !name with Some n -> n | None -> usage () in
  let overrides = List.rev !ov in
  let cache = E.create () in
  let t0 = Unix.gettimeofday () in
  let fail (e : Doc.error) = Format.eprintf "erreur : %s (%a)@." e.message Loc.pp e.loc; exit 1 in
  let objs, mesh =
    match (List.assoc_opt n Cad_examples.all, List.assoc_opt n Cad_examples.mechanisms) with
    | Some m, _ ->
        let r = Doc.run ~overrides m in
        if !json then print_endline (Journal_json.of_result r);
        let s = match r with Ok (s, _) -> s | Error e -> fail e in
        let mesh = E.mesh cache s in
        ([ Cad_export.Threemf.obj ~color:(79, 134, 198) n mesh ], mesh)
    | None, Some m -> (
        let r = Doc.run ~overrides m in
        if !json then print_endline (Journal_json.of_result r);
        let a = match r with Ok (a, _) -> a | Error e -> fail e in
        match Cad_mech.Assembly.solve a [] with
        | Error e -> prerr_endline ("erreur : " ^ e); exit 1
        | Ok pose ->
            let placed = Cad_mech.Assembly.placements a pose in
            ( List.map
                (fun ((p : Cad_mech.Part.t), f) -> Cad_export.Threemf.obj ?color:p.color ~transform:f p.name (E.mesh cache p.shape))
                placed,
              E.mesh cache (Shape.union (List.map snd (Cad_mech.Assembly.shapes a pose))) ))
    | None, None -> usage ()
  in
  let dt = Unix.gettimeofday () -. t0 in
  Option.iter (fun f -> Cad_export.Stl.to_file f mesh) !stl;
  Option.iter (fun f -> Cad_export.Threemf.to_file f objs) !tmf;
  if not !json then begin
    let b = Mesh.bbox mesh in
    Printf.printf "%s : %d triangles, volume %.0f mm3, fermé %b, boîte %.1f x %.1f x %.1f, %.0f ms\n" n
      (Mesh.n_triangles mesh) (Mesh.volume mesh) (Mesh.is_closed mesh) (b.max.x -. b.min.x) (b.max.y -. b.min.y)
      (b.max.z -. b.min.z) (dt *. 1000.)
  end
