open Ppxlib

let loc_expr (l : location) =
  let loc = l in
  let s = l.loc_start and e = l.loc_end in
  let file = Ast_builder.Default.estring ~loc s.pos_fname in
  let line = Ast_builder.Default.eint ~loc s.pos_lnum in
  let c0 = Ast_builder.Default.eint ~loc (s.pos_cnum - s.pos_bol) in
  let c1 = Ast_builder.Default.eint ~loc (e.pos_cnum - s.pos_bol) in
  [%expr Cad.Loc.of_pos ([%e file], [%e line], [%e c0], [%e c1])]

let error ~loc fmt = Location.raise_errorf ~loc fmt

let var_name (vb : value_binding) =
  match vb.pvb_pat.ppat_desc with
  | Ppat_var { txt; _ } -> txt
  | Ppat_constraint ({ ppat_desc = Ppat_var { txt; _ }; _ }, _) -> txt
  | _ -> error ~loc:vb.pvb_pat.ppat_loc "let%%feat/let%%param : le motif doit être une variable"

let find_attr name attrs = List.find_opt (fun a -> a.attr_name.txt = name) attrs

let attr_expr (a : attribute) =
  match a.attr_payload with
  | PStr [ { pstr_desc = Pstr_eval (e, _); _ } ] -> e
  | _ -> error ~loc:a.attr_loc "[@%s] attend une expression" a.attr_name.txt

let strip attrs names = List.filter (fun a -> not (List.mem a.attr_name.txt names)) attrs

let feat_binding (vb : value_binding) k =
  let loc = vb.pvb_loc in
  let e = vb.pvb_expr in
  let name =
    match find_attr "name" (vb.pvb_attributes @ e.pexp_attributes) with
    | Some a -> attr_expr a
    | None -> Ast_builder.Default.estring ~loc (var_name vb)
  in
  let e = { e with pexp_attributes = strip e.pexp_attributes [ "name" ] } in
  let suppressed = Ast_builder.Default.ebool ~loc (find_attr "suppress" vb.pvb_attributes <> None) in
  [%expr
    Cad.Doc.bind
      (Cad.Doc.feature ~loc:[%e loc_expr loc] ~suppressed:[%e suppressed] ~name:[%e name] [%e e])
      (fun [%p vb.pvb_pat] -> [%e k])]

let param_binding (vb : value_binding) k =
  let loc = vb.pvb_loc in
  let d = vb.pvb_expr in
  let opt n = Option.map attr_expr (find_attr n d.pexp_attributes) in
  let default = { d with pexp_attributes = strip d.pexp_attributes [ "range"; "unit" ] } in
  let name = Ast_builder.Default.estring ~loc (var_name vb) in
  let range = match opt "range" with Some r -> [%expr Some [%e r]] | None -> [%expr None] in
  let unit_ = match opt "unit" with Some u -> [%expr Some [%e u]] | None -> [%expr None] in
  [%expr
    Cad.Doc.bind
      (Cad.Doc.param ~loc:[%e loc_expr d.pexp_loc] ?range:[%e range] ?unit_:[%e unit_] [%e name]
         [%e default])
      (fun [%p vb.pvb_pat] -> [%e k])]

let sketch_binding (vb : value_binding) k =
  let loc = vb.pvb_loc in
  [%expr Cad.Doc.bind (Cad.Sketch.to_doc ~loc:[%e loc_expr loc] [%e vb.pvb_expr]) (fun [%p vb.pvb_pat] -> [%e k])]

let expand one ~ctxt:_ expr =
  match expr.pexp_desc with
  | Pexp_let (Nonrecursive, vbs, body) -> List.fold_right one vbs body
  | Pexp_let (Recursive, _, _) -> error ~loc:expr.pexp_loc "let rec n'est pas permis ici"
  | _ -> error ~loc:expr.pexp_loc "attendu : let%%… x = e in k"

let ext name one =
  Extension.V3.declare name Extension.Context.expression
    Ast_pattern.(single_expr_payload __)
    (expand one)

let () =
  Driver.register_transformation "camlcad"
    ~rules:
      [ Context_free.Rule.extension (ext "feat" feat_binding);
        Context_free.Rule.extension (ext "param" param_binding);
        Context_free.Rule.extension (ext "sketch" sketch_binding) ]
