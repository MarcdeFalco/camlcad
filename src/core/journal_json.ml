let escape s =
  let b = Buffer.create (String.length s + 2) in
  Buffer.add_char b '"';
  String.iter
    (function
      | '"' -> Buffer.add_string b "\\\""
      | '\\' -> Buffer.add_string b "\\\\"
      | '\n' -> Buffer.add_string b "\\n"
      | '\r' -> Buffer.add_string b "\\r"
      | '\t' -> Buffer.add_string b "\\t"
      | c when Char.code c < 0x20 -> Buffer.add_string b (Printf.sprintf "\\u%04x" (Char.code c))
      | c -> Buffer.add_char b c)
    s;
  Buffer.add_char b '"';
  Buffer.contents b

let num f =
  match classify_float f with
  | FP_nan | FP_infinite -> "null"
  | _ ->
      let s = Printf.sprintf "%.15g" f in
      if float_of_string s = f then s else Printf.sprintf "%.17g" f

let obj kvs = "{" ^ String.concat "," (List.map (fun (k, v) -> escape k ^ ":" ^ v) kvs) ^ "}"
let arr l = "[" ^ String.concat "," l ^ "]"
let opt f = function None -> "null" | Some x -> f x

let loc (l : Loc.t) =
  if Loc.equal l Loc.none then "null"
  else
    obj
      [ ("file", escape l.file); ("line", string_of_int l.line);
        ("start_col", string_of_int l.start_col); ("end_col", string_of_int l.end_col) ]

let param (p : Doc.param_info) =
  obj
    [ ("name", escape p.p_name); ("default", num p.p_default); ("value", num p.p_value);
      ("range", opt (fun (a, b) -> arr [ num a; num b ]) p.p_range);
      ("unit", opt escape p.p_unit); ("loc", loc p.p_loc) ]

let rec op s =
  match Shape.view s with
  | Empty -> "empty"
  | Cube _ -> "cube"
  | Cylinder _ -> "cylinder"
  | Sphere _ -> "sphere"
  | Extrude _ -> "extrude"
  | Revolve _ -> "revolve"
  | Union _ -> "union"
  | Difference _ -> "difference"
  | Intersection _ -> "intersection"
  | Mirror _ -> "mirror"
  | Scale (_, s) -> op s
  | Loft _ -> "loft"
  | Place (_, s) -> op s

let feature (f : Doc.feature_info) =
  obj
    [ ("id", string_of_int f.f_id); ("name", escape f.f_name); ("loc", loc f.f_loc);
      ("deps", arr (List.map string_of_int f.f_deps)); ("shape", string_of_int (Shape.id f.f_shape));
      ("op", escape (op f.f_shape)); ("suppressed", string_of_bool f.f_suppressed) ]

let body (j : Doc.journal) =
  [ ("params", arr (List.map param j.params)); ("features", arr (List.map feature j.features)) ]

let of_journal j = obj (("ok", "true") :: body j)

let of_result = function
  | Ok (_, j) -> of_journal j
  | Error (e : Doc.error) ->
      obj
        (("ok", "false")
        :: ("error", obj [ ("message", escape e.message); ("loc", loc e.loc) ])
        :: body e.journal)
