(* Worker de l'éditeur : toplevel OCaml + ppx camlcad + noyau manifold-3d. Protocole (objets JS) :
   entrée  {kind:"eval", id, code, overrides:[[nom, valeur]...]}
           {kind:"params", id, overrides}     (réévalue le dernier modèle, sans recompiler)
           {kind:"feature", id, fid}          (maillage d'une feature du dernier journal)
           {kind:"file", name, data}          (fichier importé, data : Uint8Array ; sans réponse)
           {kind:"pose", id, overrides}       (mécanisme : pilotes → pose résolue)
           {kind:"pick", id, point:[x,y,z]}   (feature sous un point de la surface)
           {kind:"export3mf", id}             (dernier résultat ; mécanisme : pièces à la pose courante)
           {kind:"edit", id, code, op, fid, index?, value?, name?, on?}
             (réécrit [code] pour la feature [fid] du dernier journal, voir Cad.Source_edit ;
              op : "literals" | "set_literal" | "promote" | "use_param" | "suppress" | "rename" | "delete")
           {kind:"sketch", id, sketch}         (résout une esquisse décrite comme Cad.Sketch_desc.t :
             {points:[[x,y,fixe]], lines:[[i,j]], circles:[[c,r]], constraints:[{kind, refs, value?}], loops})
   sortie  {kind:"ready", ms}
           {kind:"result", id, ok, journal, error, vertices, triangles, timings}
           {kind:"feature", id, fid, vertices, triangles}
           mécanisme : {kind:"result", mode:"mech", parts, coords:[{name, lo, hi, unit}], matrices, interferences, pose}
           {kind:"pose", id, ok, matrices, interferences, pose, error}
           {kind:"pick", id, fid}             (fid = -1 si aucune)
           {kind:"export3mf", id, data}       (Uint8Array, paquet 3MF)
           {kind:"sketch", id, ok, points:[[x,y]], radii, dof, redundant, code, error}
           {kind:"edit", id, op, ok, code, error, literals:[{value, int, label, before, text, after}]}
   [journal] : JSON de [Cad.Journal_json] ; [error] : null ou {message, line, col, end_line, end_col}. *)

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
let last_shape : Cad.Shape.t option ref = ref None
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

(* ---------- Mécanismes ---------- *)
module A = Cad_mech.Assembly

let last_asm : A.t option ref = ref None
let last_pose : A.pose ref = ref []
let jsarr l = Js.Unsafe.inject (Js.array (Array.of_list l))

let pose_fields a pose =
  let mats =
    List.concat_map (fun (_, f) -> Array.to_list (Geom.Frame.to_matrix f)) (A.placements a pose) |> List.map num
  in
  let volume s = K.volume (E.solid cache s) in
  let inter = A.interferences ~volume a pose |> List.map (fun (x, y, v) -> str (Printf.sprintf "%s / %s : %.1f mm³" x y v)) in
  [ ("matrices", jsarr mats); ("interferences", jsarr inter);
    ("pose", jsarr (List.map (fun (n, q) -> jsarr [ str n; num q ]) pose)) ]

let mech_reply id json timings (a : A.t) =
  match A.solve ~from:!last_pose a [] with
  | Error e -> reply id ~ok:false ~journal:json ~error:(Js.Unsafe.inject (error_obj e no_loc)) Cad.Mesh.empty
  | Ok pose ->
      last_asm := Some a;
      last_pose := pose;
      let buffers = ref [] in
      let parts =
        List.map
          (fun (p : Cad_mech.Part.t) ->
            let o, tr = mesh_msg (E.mesh cache p.shape) [ ("name", str p.name) ] in
            buffers := Js.to_array (Js.Unsafe.coerce tr) |> Array.to_list |> List.rev_append !buffers;
            (match p.color with
            | Some (r, g, b) -> Js.Unsafe.set o "color" (jsarr [ num (float r); num (float g); num (float b) ])
            | None -> ());
            Js.Unsafe.inject o)
          (A.parts a)
      in
      let coords =
        List.filter_map
          (fun (j : Cad_mech.Joint.t) ->
            if j.kind = Fixed then None
            else
              let lo, hi =
                match (j.limits, j.kind) with
                | Some r, _ -> r
                | None, Revolute -> (-180., 180.)
                | None, _ -> (j.init -. 50., j.init +. 50.)
              in
              Some
                (Js.Unsafe.inject
                   (obj [ ("name", str j.name); ("lo", num lo); ("hi", num hi);
                          ("unit", str (if j.kind = Revolute then "°" else "mm")) ])))
          (A.joints a)
      in
      let o =
        obj
          ([ ("kind", str "result"); ("mode", str "mech"); ("id", id); ("ok", Js.Unsafe.inject Js._true);
             ("journal", str json); ("error", Js.Unsafe.inject Js.null); ("parts", jsarr parts); ("coords", jsarr coords);
             ("timings", Js.Unsafe.inject (obj (List.map (fun (k, v) -> (k, num v)) timings))) ]
          @ pose_fields a pose)
      in
      post o (Js.Unsafe.inject (Js.array (Array.of_list !buffers)))

let pose id drivers =
  match !last_asm with
  | None -> ()
  | Some a ->
      let kvs =
        match A.solve ~from:!last_pose a drivers with
        | Ok p ->
            last_pose := p;
            ("ok", Js.Unsafe.inject Js._true) :: pose_fields a p
        | Error e -> [ ("ok", Js.Unsafe.inject Js._false); ("error", str e) ]
      in
      post (obj (("kind", str "pose") :: ("id", id) :: kvs)) (jsarr [])

(* Évalue le modèle courant ; [t_compile] mesure la compilation qui précède. *)
let run id overrides t_compile =
  match Cad_web_hook.get () with
  | None -> reply id ~ok:false ~journal:"null" ~error:(Js.Unsafe.inject (error_obj "pas de modèle" no_loc)) Cad.Mesh.empty
  | Some (Mech m) -> (
      let t1 = now () in
      let r = Cad.Doc.run ~overrides m in
      let json = Cad.Journal_json.of_result r in
      match r with
      | Error e ->
          last_journal := Some e.journal;
          let l = e.loc in
          let loc = if l.line = 0 then no_loc else ((l.line, l.start_col), (l.line, l.end_col)) in
          reply id ~ok:false ~journal:json ~error:(Js.Unsafe.inject (error_obj e.message loc)) Cad.Mesh.empty
      | Ok (a, j) -> (
          last_journal := Some j;
          last_shape := None;
          try mech_reply id json [ ("compile", t_compile); ("run", now () -. t1); ("mesh", 0.) ] a
          with exn ->
            reply id ~ok:false ~journal:json
              ~error:(Js.Unsafe.inject (error_obj ("mécanisme : " ^ Printexc.to_string exn) no_loc))
              Cad.Mesh.empty))
  | Some (Solid model) -> (
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
          last_shape := Some shape;
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
        else
          fail ("Le code doit définir  model : Cad.Shape.t Cad.Doc.t  (ou Cad_mech.Assembly.t Cad.Doc.t)\n" ^ err.msg)
            no_loc
  in
  let hook = "let () = Cad_web_hook.set model" in
  use ~filename:"model.ml" code (fun () ->
      (* Solide d'abord ; sinon mécanisme ; sinon l'erreur du cas solide. *)
      match Top.Wrapped.check () "let () = Cad_web_hook.set_mech model" with
      | Top.Wrapped.Success _ ->
          use ~filename:"(camlcad)" "let () = Cad_web_hook.set_mech model" (fun () -> run id overrides (now () -. t1))
      | Top.Wrapped.Error _ -> use ~filename:"(camlcad)" hook (fun () -> run id overrides (now () -. t1)))

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

(* Export 3MF : le solide courant, ou les pièces du mécanisme à la pose
   courante (une pièce = un objet, avec sa couleur : impression en place). *)
let export3mf id =
  let objs =
    match (!last_shape, !last_asm) with
    | Some s, _ -> [ Cad_export.Threemf.obj ~color:(79, 134, 198) "piece" (E.mesh cache s) ]
    | None, Some a ->
        List.map
          (fun ((p : Cad_mech.Part.t), f) -> Cad_export.Threemf.obj ?color:p.color ~transform:f p.name (E.mesh cache p.shape))
          (A.placements a !last_pose)
    | None, None -> []
  in
  let bytes = Cad_export.Threemf.to_string objs in
  let n = String.length bytes in
  let u = Js.Unsafe.new_obj (Js.Unsafe.get Js.Unsafe.global "Uint8Array") [| num (float n) |] in
  String.iteri (fun i c -> Js.Unsafe.set u i (Char.code c)) bytes;
  post (obj [ ("kind", str "export3mf"); ("id", id); ("data", Js.Unsafe.inject u) ]) (jsarr [ Js.Unsafe.get u "buffer" ])

(* ---------- Réécritures depuis la frise et le panneau « Modifier » ---------- *)
let edit id (d : Js.Unsafe.any) =
  let module S = Cad.Source_edit in
  let code = Js.to_string (Js.Unsafe.get d "code") and op = Js.to_string (Js.Unsafe.get d "op") in
  let fnum k = Js.float_of_number (Js.Unsafe.get d k) in
  let fstr k = Js.to_string (Js.Unsafe.get d k) in
  let feature =
    match !last_journal with
    | None -> None
    | Some j -> List.find_opt (fun (f : Cad.Doc.feature_info) -> float f.f_id = fnum "fid") j.features
  in
  let kvs =
    match feature with
    | None -> [ ("ok", Js.Unsafe.inject Js._false); ("error", str "feature inconnue : réévaluez le code") ]
    | Some f -> (
        let loc = f.f_loc in
        let result r =
          match r with
          | Ok c -> [ ("ok", Js.Unsafe.inject Js._true); ("code", str c) ]
          | Error e -> [ ("ok", Js.Unsafe.inject Js._false); ("error", str e) ]
        in
        match op with
        | "literals" ->
            let lit (l : S.literal) =
              Js.Unsafe.inject
                (obj
                   [ ("value", num l.value); ("int", Js.Unsafe.inject (Js.bool l.int));
                     ("label", match l.label with Some s -> str s | None -> Js.Unsafe.inject Js.null);
                     ("before", str l.before); ("after", str l.after);
                     ("text", str (String.sub code l.range.start (l.range.stop - l.range.start))) ])
            in
            [ ("ok", Js.Unsafe.inject Js._true); ("literals", jsarr (List.map lit (S.literals code loc))) ]
        | "set_literal" -> result (S.set_literal code loc (int_of_float (fnum "index")) (fnum "value"))
        | "promote" -> result (S.promote code loc (int_of_float (fnum "index")) ~name:(fstr "name"))
        | "use_param" -> result (S.use_param code loc (int_of_float (fnum "index")) ~name:(fstr "name"))
        | "suppress" -> result (S.set_suppressed code loc (Js.to_bool (Js.Unsafe.get d "on")))
        | "rename" -> result (S.rename code loc (fstr "name"))
        | "delete" -> result (S.delete code loc)
        | _ -> [ ("ok", Js.Unsafe.inject Js._false); ("error", str ("opération inconnue : " ^ op)) ])
  in
  post (obj (("kind", str "edit") :: ("id", id) :: ("op", str op) :: kvs)) (jsarr [])

(* ---------- Esquisses ---------- *)
let sketch id (o : Js.Unsafe.any) =
  let arr k : Js.Unsafe.any array = Js.to_array (Js.Unsafe.get o k) in
  let fl (v : Js.Unsafe.any) = Js.float_of_number (Js.Unsafe.coerce v) in
  let it (v : Js.Unsafe.any) = int_of_float (fl v) in
  let get (a : Js.Unsafe.any) i : Js.Unsafe.any = Js.Unsafe.get a i in
  let desc : Cad.Sketch_desc.t =
    { points = Array.map (fun p -> (fl (get p 0), fl (get p 1), Js.to_bool (Js.Unsafe.coerce (get p 2)))) (arr "points");
      lines = Array.map (fun l -> (it (get l 0), it (get l 1))) (arr "lines");
      circles = Array.map (fun c -> (it (get c 0), fl (get c 1))) (arr "circles");
      arcs =
        (if Js.Optdef.test (Js.Unsafe.get o "arcs") then Array.map (fun a -> (it (get a 0), it (get a 1), it (get a 2))) (arr "arcs")
         else [||]);
      ellipses =
        (if Js.Optdef.test (Js.Unsafe.get o "ellipses") then Array.map (fun e -> (it (get e 0), it (get e 1), fl (get e 2))) (arr "ellipses")
         else [||]);
      constraints =
        Array.to_list
          (Array.map
             (fun c ->
               let v : Js.Unsafe.any Js.Optdef.t = Js.Unsafe.get c "value" in
               { Cad.Sketch_desc.kind = Js.to_string (Js.Unsafe.get c "kind");
                 refs = Array.to_list (Array.map it (Js.to_array (Js.Unsafe.get c "refs")));
                 value = Js.Optdef.to_option (Js.Optdef.map v (fun x -> x)) |> Option.map fl;
                 expr =
                   (let e : Js.Unsafe.any Js.Optdef.t = Js.Unsafe.get c "expr" in
                    Js.Optdef.to_option (Js.Optdef.map e (fun x -> Js.to_string (Js.Unsafe.coerce x)))) })
             (arr "constraints"));
      (* élément de boucle : nombre = point, {a:k} = arc k, {r:k} = arc k à l'envers, {s:[i…]} = courbe *)
      loops =
        (let item (v : Js.Unsafe.any) : Cad.Sketch_desc.item =
           if Js.to_string (Js.typeof v) = "number" then P (it v)
           else if Js.Optdef.test (Js.Unsafe.get v "s") then S (Array.to_list (Array.map it (Js.to_array (Js.Unsafe.get v "s"))))
           else if Js.Optdef.test (Js.Unsafe.get v "a") then A (it (Js.Unsafe.get v "a"))
           else Rev (it (Js.Unsafe.get v "r"))
         in
         Array.to_list (Array.map (fun l -> Array.to_list (Array.map item (Js.to_array (Js.Unsafe.coerce l)))) (arr "loops"))) }
  in
  let kvs =
    match Cad.Sketch_desc.solve desc with
    | Error e -> [ ("ok", Js.Unsafe.inject Js._false); ("error", str e) ]
    | Ok s ->
        let solved =
          { desc with
            points = Array.mapi (fun i (_, _, f) -> (s.points.(i).x, s.points.(i).y, f)) desc.points;
            circles = Array.mapi (fun i (c, _) -> (c, s.radii.(i))) desc.circles }
        in
        [ ("ok", Js.Unsafe.inject Js._true);
          ("points", jsarr (Array.to_list (Array.map (fun (p : Geom.V2.t) -> jsarr [ num p.x; num p.y ]) s.points)));
          ("radii", jsarr (Array.to_list (Array.map num s.radii)));
          ("dof", num (float s.dof)); ("redundant", num (float s.redundant));
          ("code", str (Cad.Sketch_desc.to_code ~indent:4 solved)) ]
  in
  post (obj (("kind", str "sketch") :: ("id", id) :: kvs)) (jsarr [])

(* Sélection : la feature dont la surface passe le plus près du point (à moins
   de 0,5 mm) ; à
   égalité (surface commune), la plus élémentaire (moins de dépendances). *)
let pick id (p : Geom.V3.t) =
  let fid =
    match !last_journal with
    | None -> -1
    | Some j ->
        let key (f : Cad.Doc.feature_info) =
          let d = Cad.Mesh.distance (E.mesh cache f.f_shape) p in
          (Float.round (d *. 100.), List.length f.f_deps, f.f_id)
        in
        List.fold_left
          (fun best (f : Cad.Doc.feature_info) ->
            if f.f_suppressed then best
            else match best with Some (k, _) when k <= key f -> best | _ -> Some (key f, f.f_id))
          None j.features
        |> Option.fold ~none:(-1) ~some:(fun ((d, _, _), fid) -> if d > 50. then -1 else fid)
  in
  post (obj [ ("kind", str "pick"); ("id", id); ("fid", num (float fid)) ]) (jsarr [])

let () =
  Top.initialize ();
  Js.Unsafe.set Js.Unsafe.global "onmessage"
    (Js.wrap_callback (fun ev ->
         let d = Js.Unsafe.get ev "data" in
         let id = Js.Unsafe.get d "id" in
         match Js.to_string (Js.Unsafe.get d "kind") with
         | "eval" -> eval id (Js.to_string (Js.Unsafe.get d "code")) (overrides_of d)
         | "params" -> run id (overrides_of d) 0.
         | "pose" -> pose id (overrides_of d)
         | "export3mf" -> export3mf id
         | "sketch" -> sketch id (Js.Unsafe.get d "sketch")
         | "edit" -> edit id d
         | "pick" ->
             let c i = Js.float_of_number (Js.Unsafe.get (Js.Unsafe.get d "point") i) in
             pick id (Geom.V3.v (c 0) (c 1) (c 2))
         | "feature" -> feature id (int_of_float (Js.float_of_number (Js.Unsafe.get d "fid")))
         | "file" (* STL importé, lu par Cad_export.Stl.of_file "nom" *) ->
             let name = Filename.concat (Sys.getcwd ()) (Js.to_string (Js.Unsafe.get d "name")) in
             let content = Typed_array.String.of_uint8Array (Js.Unsafe.get d "data") in
             if Sys.file_exists name then Sys_js.update_file ~name ~content else Sys_js.create_file ~name ~content
         | k -> prerr_endline ("message inconnu : " ^ k)));
  post (obj [ ("kind", str "ready"); ("ms", num (now () -. t0)) ]) (Js.Unsafe.inject (Js.array [||]))
