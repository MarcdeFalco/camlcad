(* Trouve Manifold : $MANIFOLD_PREFIX, sinon _manifold/ en remontant depuis le
   répertoire de build (racine du dépôt). *)
let prefix () =
  match Sys.getenv_opt "MANIFOLD_PREFIX" with
  | Some p when p <> "" -> if Sys.file_exists (Filename.concat p "lib/libmanifoldc.a") then p else raise Not_found
  | _ ->
      let rec up d =
        let c = Filename.concat d "_manifold" in
        if Sys.file_exists (Filename.concat c "lib/libmanifoldc.a") then c
        else
          let p = Filename.dirname d in
          if p = d then raise Not_found else up p
      in
      up (Sys.getcwd ())

let write f l =
  Out_channel.with_open_text f (fun oc ->
      output_string oc ("(" ^ String.concat " " (List.map (Printf.sprintf "%S") l) ^ ")"))

let () =
  match prefix () with
  | exception Not_found ->
      (* Sans Manifold, la bibliothèque compile quand même : chaque appel échoue. *)
      write "c_flags.sexp" [ "-DCAMLCAD_NO_MANIFOLD" ];
      write "c_library_flags.sexp" []
  | p ->
  let cxx = if Sys.os_type = "Unix" && Sys.command "uname -s | grep -q Darwin" = 0 then "-lc++" else "-lstdc++" in
  write "c_flags.sexp" [ "-I" ^ p ^ "/include"; "-O2" ];
  write "c_library_flags.sexp"
    [ p ^ "/lib/libmanifoldc.a"; p ^ "/lib/libmanifold.a";
      p ^ "/lib/libClipper2.a"; cxx ]
