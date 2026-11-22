(* Worker de l'éditeur : toplevel OCaml + ppx camlcad + noyau manifold-3d.

   Protocole (objets JS) :
   entrée  {kind:"eval", id, code, overrides:[[nom, valeur]...]}
           {kind:"params", id, overrides}     (réévalue le dernier modèle, sans recompiler)
           {kind:"feature", id, fid}          (maillage d'une feature du dernier journal)
   sortie  {kind:"ready", ms}
           {kind:"result", id, ok, journal, error, vertices, triangles, timings}
           {kind:"feature", id, fid, vertices, triangles}
   [journal] est la chaîne JSON de [Cad.Journal_json] ; [error] vaut null ou
   {message, line, col, end_line, end_col} (lignes à partir de 1). *)

open Js_of_ocaml
module Top = Js_of_ocaml_toplevel
module K = Kernel_manifold_js
module E = Cad.Eval.Make (K)

let now () = Js.float_of_number (Js.Unsafe.meth_call (Js.Unsafe.get Js.Unsafe.global "performance") "now" [||])
let t0 = now ()
let num f = Js.Unsafe.inject (Js.number_of_float f)
let str s = Js.Unsafe.inject (Js.string s)
let post (o : < > Js.t) transfer = Js.Unsafe.meth_call Js.Unsafe.global "postMessage" [| Js.Unsafe.inject o; transfer |]
let obj kvs = Js.Unsafe.obj (Array.of_list kvs)

(* Le ppx camlcad, branché sur le préprocesseur du toplevel. *)
let () =
  let module S = Ppxlib.Selected_ast in
  let structure _ s = S.to_ocaml Structure (Ppxlib.Driver.map_structure (S.of_ocaml Structure s)) in
  Ocaml_common.Ast_mapper.register "camlcad" (fun _ ->
      { Ocaml_common.Ast_mapper.default_mapper with structure })

let cache = E.create ()
let last_journal : Cad.Doc.journal option ref = ref None

let mesh_msg (m : Cad.Mesh.t) kvs =
  let typed name n = Js.Unsafe.new_obj (Js.Unsafe.get Js.Unsafe.global name) [| num (float n) |] in
  let v = typed "Float32Array" (Array.length m.vertices) in
  Array.iteri (fun i x -> Js.Unsafe.set v i (Js.number_of_float x)) m.vertices;
  let t = typed "Uint32Array" (Array.length m.triangles) in
  Array.iteri (fun i x -> Js.Unsafe.set t i (Js.number_of_float (float x))) m.triangles;
  let transfer = Js.Unsafe.inject (Js.array [| Js.Unsafe.get v "buffer"; Js.Unsafe.get t "buffer" |]) in
  (obj (("vertices", Js.Unsafe.inject v) :: ("triangles", Js.Unsafe.inject t) :: kvs), transfer)

let error_obj message (loc : (int * int) * (int * int)) =
  let (l0, c0), (l1, c1) = loc in
  obj [ ("message", str message); ("line", num (float l0)); ("col", num (float c0));
        ("end_line", num (float l1)); ("end_col", num (float c1)) ]

let no_loc = ((0, 0), (0, 0))

let reply id ?(timings = []) ~ok ~journal ~error mesh =
  let kvs =
    [ ("kind", str "result"); ("id", id); ("ok", Js.Unsafe.inject (Js.bool ok)); ("journal", str journal);
      ("error", error);
      ("timings", Js.Unsafe.inject (obj (List.map (fun (k, v) -> (k, num v)) timings))) ]
  in
  let o, transfer = mesh_msg mesh kvs in
  post o transfer

(* Évalue le modèle courant ; [t_compile] mesure la compilation qui précède. *)
let run id overrides t_compile =
  match Cad_web_hook.get () with
  | None -> reply id ~ok:false ~journal:"null" ~error:(Js.Unsafe.inject (error_obj "pas de modèle" no_loc)) Cad.Mesh.empty
  | Some model -> (
      let t1 = now () in
      let r = Cad.Doc.run ~overrides model in
      let json = Cad.Journal_json.of_result r in
      let t2 = now () in
      match r with
      | Error e ->
          last_journal := Some e.journal;
          let l = e.loc in
          let loc = if l.line = 0 then no_loc else ((l.line, l.start_col), (l.line, l.end_col)) in
          reply id ~ok:false ~journal:json ~error:(Js.Unsafe.inject (error_obj e.message loc))
            ~timings:[ ("compile", t_compile); ("run", t2 -. t1) ] Cad.Mesh.empty
      | Ok (shape, j) -> (
          last_journal := Some j;
          match E.mesh cache shape with
          | mesh ->
              let t3 = now () in
              reply id ~ok:true ~journal:json ~error:(Js.Unsafe.inject Js.null)
                ~timings:[ ("compile", t_compile); ("run", t2 -. t1); ("mesh", t3 -. t2) ] mesh
          | exception exn ->
              reply id ~ok:false ~journal:json
                ~error:(Js.Unsafe.inject (error_obj ("noyau : " ^ Printexc.to_string exn) no_loc))
                Cad.Mesh.empty))

(* L'hôte envoie toujours [overrides] : tableau (éventuellement vide) de paires. *)
let overrides_of o =
  let a : Js.Unsafe.any array = Js.to_array (Js.Unsafe.get o "overrides") in
  Array.to_list a
  |> List.map (fun kv ->
         let k : Js.js_string Js.t = Js.Unsafe.get kv 0 and v : Js.number Js.t = Js.Unsafe.get kv 1 in
         (Js.to_string k, Js.float_of_number v))

let eval id code overrides =
  let t1 = now () in
  Top.Direct.reset_toplevel_env ();
  Cad_web_hook.clear ();
  let buf = Buffer.create 256 in
  let ppf = Format.formatter_of_buffer buf in
  let fail msg loc = reply id ~ok:false ~journal:"null" ~error:(Js.Unsafe.inject (error_obj msg loc)) Cad.Mesh.empty in
  let use ~filename code k =
    match Top.Wrapped.use () ~filename ~ppf_answer:ppf code with
    | Top.Wrapped.Success (true, _) -> k ()
    | Top.Wrapped.Success (false, _) ->
        Format.pp_print_flush ppf ();
        fail (Buffer.contents buf) no_loc
    | Top.Wrapped.Error (err, _) ->
        let loc = match err.locs with l :: _ -> (l.loc_start, l.loc_end) | [] -> no_loc in
        if filename = "model.ml" then fail err.msg loc
        else fail ("Le code doit définir  model : Cad.Shape.t Cad.Doc.t\n" ^ err.msg) no_loc
  in
  use ~filename:"model.ml" code (fun () ->
      use ~filename:"(camlcad)" "let () = Cad_web_hook.set model" (fun () -> run id overrides (now () -. t1)))

let feature id fid =
  match !last_journal with
  | None -> ()
  | Some j -> (
      match List.find_opt (fun (f : Cad.Doc.feature_info) -> f.f_id = fid) j.features with
      | None -> ()
      | Some f ->
          let o, transfer =
            mesh_msg (E.mesh cache f.f_shape) [ ("kind", str "feature"); ("id", id); ("fid", num (float fid)) ]
          in
          post o transfer)

let () =
  Top.initialize ();
  Js.Unsafe.set Js.Unsafe.global "onmessage"
    (Js.wrap_callback (fun ev ->
         let d = Js.Unsafe.get ev "data" in
         let id = Js.Unsafe.get d "id" in
         match Js.to_string (Js.Unsafe.get d "kind") with
         | "eval" -> eval id (Js.to_string (Js.Unsafe.get d "code")) (overrides_of d)
         | "params" -> run id (overrides_of d) 0.
         | "feature" -> feature id (int_of_float (Js.float_of_number (Js.Unsafe.get d "fid")))
         | k -> prerr_endline ("message inconnu : " ^ k)));
  post (obj [ ("kind", str "ready"); ("ms", num (now () -. t0)) ]) (Js.Unsafe.inject (Js.array [||]))
