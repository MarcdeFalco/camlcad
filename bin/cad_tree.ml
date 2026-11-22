(* cad-tree PIÈCE [-D nom=valeur]... : arbre de features en JSON (sans noyau).
   Les pièces disponibles sont celles de Cad_examples.all. *)
let () =
  let args = List.tl (Array.to_list Sys.argv) in
  let rec parse name ov = function
    | "-D" :: kv :: rest -> (
        match String.index_opt kv '=' with
        | Some i ->
            let k = String.sub kv 0 i and v = String.sub kv (i + 1) (String.length kv - i - 1) in
            parse name ((k, float_of_string v) :: ov) rest
        | None -> failwith ("-D attend nom=valeur : " ^ kv))
    | n :: rest when name = None -> parse (Some n) ov rest
    | x :: _ -> failwith ("argument inattendu : " ^ x)
    | [] -> (name, List.rev ov)
  in
  match parse None [] args with
  | None, _ ->
      prerr_endline ("usage : cad-tree PIÈCE [-D nom=valeur]...\npièces : "
                     ^ String.concat ", " (List.map fst Cad_examples.all));
      exit 2
  | Some n, overrides -> (
      match List.assoc_opt n Cad_examples.all with
      | None -> prerr_endline ("pièce inconnue : " ^ n); exit 2
      | Some m ->
          let r = Cad.Doc.run ~overrides m in
          print_endline (Cad.Journal_json.of_result r);
          if Result.is_error r then exit 1)
