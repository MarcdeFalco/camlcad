type range = { start : int; stop : int }

(* ---------- Lexique ---------- *)

type kind = Ident | Num of bool (* flottant ? *) | Sym | Lit (* chaîne, caractère *)
type tok = { k : kind; s : int; e : int; txt : string }

let is_digit c = c >= '0' && c <= '9'
let is_alpha c = (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c = '_'
let is_ident c = is_alpha c || is_digit c || c = '\''
let is_op c = String.contains "!$%&*+-./:<=>?@^|~#" c

(* Fin d'une chaîne commencée en [i] (après le guillemet). *)
let rec skip_string src i =
  let n = String.length src in
  if i >= n then n
  else match src.[i] with '"' -> i + 1 | '\\' -> skip_string src (i + 2) | _ -> skip_string src (i + 1)

(* {id|…|id} : [i] pointe sur l'accolade ; [None] si ce n'en est pas une. *)
let quoted_string src i =
  let n = String.length src in
  let j = ref (i + 1) in
  while !j < n && (src.[!j] = '_' || (src.[!j] >= 'a' && src.[!j] <= 'z')) do incr j done;
  if !j < n && src.[!j] = '|' then
    let close = "|" ^ String.sub src (i + 1) (!j - i - 1) ^ "}" in
    let m = String.length close in
    let rec find k = if k + m > n then n else if String.sub src k m = close then k + m else find (k + 1) in
    Some (find (!j + 1))
  else None

let rec skip_comment src i depth =
  let n = String.length src in
  if i >= n then n
  else if i + 1 < n && src.[i] = '(' && src.[i + 1] = '*' then skip_comment src (i + 2) (depth + 1)
  else if i + 1 < n && src.[i] = '*' && src.[i + 1] = ')' then
    if depth = 1 then i + 2 else skip_comment src (i + 2) (depth - 1)
  else if src.[i] = '"' then skip_comment src (skip_string src (i + 1)) depth
  else skip_comment src (i + 1) depth

let tokens src =
  let n = String.length src in
  let acc = ref [] in
  let add k s e = acc := { k; s; e; txt = String.sub src s (e - s) } :: !acc in
  let rec go i =
    if i >= n then ()
    else
      let c = src.[i] in
      if c = ' ' || c = '\n' || c = '\t' || c = '\r' then go (i + 1)
      else if c = '(' && i + 1 < n && src.[i + 1] = '*' then go (skip_comment src (i + 2) 1)
      else if c = '"' then (
        let e = skip_string src (i + 1) in
        add Lit i e; go e)
      else if c = '{' && quoted_string src i <> None then (
        let e = Option.get (quoted_string src i) in
        add Lit i e; go e)
      else if c = '\'' && i + 2 < n && (src.[i + 1] = '\\' || src.[i + 2] = '\'') then (
        let j = ref (i + 2) in
        while !j < n && src.[!j] <> '\'' do incr j done;
        let e = min n (!j + 1) in
        add Lit i e; go e)
      else if is_digit c then (
        let j = ref i and fl = ref false in
        let digits () = while !j < n && (is_digit src.[!j] || src.[!j] = '_') do incr j done in
        if c = '0' && i + 1 < n && (src.[i + 1] = 'x' || src.[i + 1] = 'X') then (
          j := i + 2;
          while !j < n && (is_ident src.[!j]) do incr j done)
        else (
          digits ();
          if !j < n && src.[!j] = '.' then (fl := true; incr j; digits ());
          if !j < n && (src.[!j] = 'e' || src.[!j] = 'E') then (
            fl := true; incr j;
            if !j < n && (src.[!j] = '+' || src.[!j] = '-') then incr j;
            digits ()));
        add (Num !fl) i !j; go !j)
      else if is_alpha c then (
        let j = ref i in
        while !j < n && is_ident src.[!j] do incr j done;
        (* let%feat, let%param… : un seul jeton *)
        if !j + 1 < n && src.[!j] = '%' && is_alpha src.[!j + 1] then (
          incr j;
          while !j < n && (is_ident src.[!j] || src.[!j] = '.') do incr j done);
        add Ident i !j; go !j)
      else if is_op c then (
        let j = ref i in
        while !j < n && is_op src.[!j] do incr j done;
        add Sym i !j; go !j)
      else (add Sym i (i + 1); go (i + 1))
  in
  go 0;
  Array.of_list (List.rev !acc)

(* ---------- Positions ---------- *)

let line_start src line =
  let n = String.length src in
  let rec go i l = if l = line then Some i else match String.index_from_opt src i '\n' with
    | Some j when j + 1 <= n -> go (j + 1) (l + 1) | _ -> None in
  if line < 1 then None else go 0 1

let range_of_loc src (loc : Loc.t) =
  if Loc.equal loc Loc.none then None
  else
    match line_start src loc.line with
    | Some b when b + loc.end_col <= String.length src && loc.start_col <= loc.end_col ->
        Some { start = b + loc.start_col; stop = b + loc.end_col }
    | _ -> None

let line_of src off =
  let l = ref 1 in
  for i = 0 to min off (String.length src) - 1 do if src.[i] = '\n' then incr l done;
  !l

let bol src off = match String.rindex_from_opt src (off - 1) '\n' with Some j -> j + 1 | None -> 0 | exception Invalid_argument _ -> 0

(* ---------- Liaison d'une feature ---------- *)

type binding = { toks : tok array; kw : int; (* index du let%feat / and *) pat : int; last : int; (* dernier jeton *) r : range }

let binding src loc =
  match range_of_loc src loc with
  | None -> Error "position périmée : attendez la fin de l'évaluation du code"
  | Some r -> (
      let toks = tokens src in
      let idx = ref [] in
      Array.iteri (fun i t -> if t.s >= r.start && t.e <= r.stop then idx := i :: !idx) toks;
      match List.rev !idx with
      | kw :: rest when toks.(kw).s = r.start && (toks.(kw).txt = "let%feat" || toks.(kw).txt = "and") -> (
          match List.find_opt (fun i -> toks.(i).k = Ident) rest with
          | Some pat -> Ok { toks; kw; pat; last = List.hd !idx; r }
          | None -> Error "liaison sans nom")
      | _ -> Error "la position ne désigne pas une liaison let%feat")

let ( let* ) = Result.bind
let tok_opt toks i = if i >= 0 && i < Array.length toks then Some toks.(i) else None
let is_sym toks i txt = match tok_opt toks i with Some { k = Sym; txt = t; _ } -> t = txt | _ -> false
let is_id toks i txt = match tok_opt toks i with Some { k = Ident; txt = t; _ } -> t = txt | _ -> false

(* Édition : remplacements disjoints, appliqués de la fin vers le début. *)
let apply src edits =
  let edits = List.sort (fun (a, _, _) (b, _, _) -> compare b a) edits in
  List.fold_left
    (fun s (a, b, txt) -> String.sub s 0 a ^ txt ^ String.sub s b (String.length s - b))
    src edits

(* ---------- Littéraux ---------- *)

type literal = {
  range : range;
  value : float;
  int : bool;
  label : string option;
  before : string;
  after : string;
}

let utf8_cont c = Char.code c land 0xC0 = 0x80

let context src (r : range) =
  let b = bol src r.start in
  let e = match String.index_from_opt src r.stop '\n' with Some j -> j | None -> String.length src in
  let a = ref (max b (r.start - 24)) in
  while !a < r.start && utf8_cont src.[!a] do incr a done;
  let z = ref (min e (r.stop + 24)) in
  while !z > r.stop && !z < String.length src && utf8_cont src.[!z] do decr z done;
  (String.sub src !a (r.start - !a), String.sub src r.stop (!z - r.stop))

(* Le jeton [i] est-il dans un attribut [[@…]] / [[@@…]] de la liaison ? *)
let in_attribute toks b i =
  let depth = ref 0 in
  for j = b.kw to i - 1 do
    let t = toks.(j) in
    if !depth > 0 then (
      if t.k = Sym && t.txt = "[" then incr depth;
      if t.k = Sym && t.txt = "]" then decr depth)
    else if t.k = Sym && t.txt = "[" && j + 1 <= i && toks.(j + 1).k = Sym && toks.(j + 1).txt.[0] = '@' then depth := 1
  done;
  !depth > 0

let lits src b =
  let toks = b.toks in
  let res = ref [] in
  for i = b.kw to b.last do
    match toks.(i) with
    | { k = Num fl; s; e; txt } when not (in_attribute toks b i) -> (
        let neg = is_sym toks (i - 1) "-" && toks.(i - 1).e = s
                  && (match tok_opt toks (i - 2) with
                      | Some { k = Sym; txt = t; _ } -> List.mem t [ "("; ","; "["; ";"; "="; ":"; "->" ]
                      | Some { k = Ident; txt = t; _ } -> List.mem t [ "in"; "then"; "else"; "return" ]
                      | _ -> false) in
        let start = if neg then s - 1 else s in
        let j = if neg then i - 2 else i - 1 in
        let j = if is_sym toks j "(" then j - 1 else j in
        let label =
          if is_sym toks j ":" && (match tok_opt toks (j - 1) with Some { k = Ident; _ } -> true | _ -> false)
             && (is_sym toks (j - 2) "~" || is_sym toks (j - 2) "?")
          then Some (toks.(j - 2).txt ^ toks.(j - 1).txt) else None in
        let clean = String.concat "" (String.split_on_char '_' txt) in
        match float_of_string_opt clean with
        | None -> ()
        | Some v ->
            let range = { start; stop = e } in
            let before, after = context src range in
            res := { range; value = (if neg then -.v else v); int = not fl; label; before; after } :: !res)
    | _ -> ()
  done;
  List.rev !res

let literals src loc = match binding src loc with Ok b -> lits src b | Error _ -> []

let float_literal x =
  let s = Printf.sprintf "%.15g" x in
  let s = if float_of_string s = x then s else Printf.sprintf "%.17g" x in
  if String.contains s '.' || String.contains s 'e' || String.contains s 'n' || String.contains s 'i' then s else s ^ "."

let nth_literal src loc i =
  let* b = binding src loc in
  match List.nth_opt (lits src b) i with
  | Some l -> Ok (b, l)
  | None -> Error "littéral introuvable (code modifié ?)"

let check_finite v = if Float.is_finite v then Ok () else Error "valeur non finie"

let set_literal src loc i v =
  let* () = check_finite v in
  let* _, l = nth_literal src loc i in
  let txt = if l.int then string_of_int (Float.to_int (Float.round v)) else float_literal v in
  let paren = (l.int && Float.round v < 0.) || ((not l.int) && v < 0.) in
  let in_paren =
    l.range.start > 0 && src.[l.range.start - 1] = '(' && l.range.stop < String.length src && src.[l.range.stop] = ')'
  in
  let s, e = if in_paren && (not paren) && src.[l.range.start] = '-' then (l.range.start - 1, l.range.stop + 1) else (l.range.start, l.range.stop) in
  let txt = if paren && not in_paren then "(" ^ txt ^ ")" else txt in
  Ok (apply src [ (s, e, txt) ])

(* ---------- Noms ---------- *)

let keywords =
  [ "and"; "as"; "assert"; "begin"; "class"; "constraint"; "do"; "done"; "downto"; "else"; "end";
    "exception"; "external"; "false"; "for"; "fun"; "function"; "functor"; "if"; "in"; "include";
    "inherit"; "initializer"; "lazy"; "let"; "match"; "method"; "module"; "mutable"; "new"; "nonrec";
    "object"; "of"; "open"; "or"; "private"; "rec"; "sig"; "struct"; "then"; "to"; "true"; "try";
    "type"; "val"; "virtual"; "when"; "while"; "with"; "mod"; "land"; "lor"; "lxor"; "lsl"; "lsr"; "asr" ]

let check_name src name =
  let ok =
    name <> "" && ((name.[0] >= 'a' && name.[0] <= 'z') || name.[0] = '_')
    && String.for_all is_ident name && not (List.mem name keywords)
  in
  if not ok then Error (Printf.sprintf "« %s » n'est pas un nom de variable OCaml valable" name)
  else if Array.exists (fun t -> t.k = Ident && t.txt = name) (tokens src) then
    Error (Printf.sprintf "« %s » est déjà utilisé dans le code" name)
  else Ok ()

let promote src loc i ~name =
  let* b, l = nth_literal src loc i in
  let* () = check_name src name in
  if b.toks.(b.kw).txt <> "let%feat" then Error "liaison « and » : créez le paramètre dans le code"
  else
    let v = if l.int then Float.round l.value else l.value in
    let lo, hi = if v > 0. then (0., 2. *. v) else if v < 0. then (2. *. v, 0.) else (-10., 10.) in
    let unit_ = if l.int then "" else if l.label = Some "~deg" then " [@unit \"°\"]" else " [@unit \"mm\"]" in
    let kw = b.toks.(b.kw).s in
    let indent = String.make (kw - bol src kw) ' ' in
    let decl =
      Printf.sprintf "let%%param %s = %s [@range %s, %s]%s in\n%s" name (float_literal v) (float_literal lo)
        (float_literal hi) unit_ indent
    in
    let use = if l.int then "(Float.to_int " ^ name ^ ")" else name in
    Ok (apply src [ (kw, kw, decl); (l.range.start, l.range.stop, use) ])

(* ---------- Suppression temporaire ---------- *)

let suppress_attr b =
  let t = b.toks in
  let found = ref None in
  (* dans la liaison, ou juste après si la position précède l'ajout *)
  for i = b.kw to min (Array.length t - 4) (b.last + 1) do
    if is_sym t i "[" && is_sym t (i + 1) "@@" && is_id t (i + 2) "suppress" && is_sym t (i + 3) "]" then
      found := Some (t.(i).s, t.(i + 3).e)
  done;
  !found

let set_suppressed src loc on =
  let* b = binding src loc in
  match (suppress_attr b, on) with
  | Some _, true | None, false -> Ok src
  | None, true -> Ok (apply src [ (b.r.stop, b.r.stop, " [@@suppress]") ])
  | Some (s, e), false ->
      let s' = ref s in
      while !s' > 0 && (src.[!s' - 1] = ' ' || src.[!s' - 1] = '\t') do decr s' done;
      Ok (apply src [ (!s', e, "") ])

(* ---------- Usages d'une variable ---------- *)

let binders = [ "let"; "let%feat"; "let%param"; "let%sketch"; "and"; "fun"; "rec" ]

(* Usages de la variable liée par [b], après la liaison, jusqu'à son masquage. *)
let uses src b =
  let t = b.toks and name = b.toks.(b.pat).txt in
  let n = Array.length t in
  let res = ref [] in
  let rec go i =
    if i >= n then ()
    else if t.(i).k = Ident && t.(i).txt = "let" && t.(i).s = bol src t.(i).s then ()
    else if t.(i).k = Ident && t.(i).txt = name then
      if i > 0 && t.(i - 1).k = Ident && List.mem t.(i - 1).txt binders then ()
      else (
        if not (is_sym t (i - 1) "." && t.(i - 1).e = t.(i).s) then res := i :: !res;
        go (i + 1))
    else go (i + 1)
  in
  go (b.last + 1);
  List.rev !res

let rename src loc new_name =
  let* b = binding src loc in
  let* () = check_name src new_name in
  let t = b.toks in
  let edit i =
    if is_sym t (i - 1) "~" || is_sym t (i - 1) "?" then
      if is_sym t (i + 1) ":" && t.(i + 1).s = t.(i).e then None (* étiquette d'un autre argument *)
      else Some (t.(i).e, t.(i).e, ":" ^ new_name)
    else Some (t.(i).s, t.(i).e, new_name)
  in
  let edits = List.filter_map edit (b.pat :: uses src b) in
  Ok (apply src edits)

let delete src loc =
  let* b = binding src loc in
  let t = b.toks and name = b.toks.(b.pat).txt in
  if t.(b.kw).txt <> "let%feat" then Error "liaison « and » : supprimez-la dans le code"
  else if not (is_id t (b.last + 1) "in") then Error "liaison sans « in » : supprimez-la dans le code"
  else
    let in_tok = t.(b.last + 1) in
    let refuse i why =
      Error (Printf.sprintf "« %s » %s (ligne %d) : modifiez le code, ou supprimez-la temporairement" name why
               (line_of src t.(i).s))
    in
    let starts_expr i =
      is_sym t i "(" || is_sym t i "=" || is_sym t i "->"
      || (match tok_opt t i with Some { k = Ident; txt; _ } -> List.mem txt [ "in"; "then"; "else" ] | _ -> false)
    in
    let one i =
      let p = i - 1 and nx = i + 1 in
      if is_sym t p "~" || is_sym t p "?" then refuse i "est passée en argument"
      else if (is_sym t p "+" || is_sym t p "-") && p > 0 && not (starts_expr (p - 1)) then
        if is_sym t nx "*" || is_sym t nx "." then refuse i "est dans une intersection"
        else Ok (t.(p - 1).e, t.(i).e, "")
      else if starts_expr p && is_sym t nx "+" && nx + 1 < Array.length t then Ok (t.(i).s, t.(nx + 1).s, "")
      else if starts_expr p && is_sym t nx "-" then refuse i "est la base d'une différence"
      else if is_sym t nx "*" || is_sym t p "*" then refuse i "est dans une intersection"
      else if is_id t p "return" then refuse i "est le résultat du modèle"
      else refuse i "est utilisée"
    in
    let* edits =
      List.fold_left
        (fun acc i -> let* l = acc in let* e = one i in Ok (e :: l))
        (Ok []) (uses src b)
    in
    (* La liaison : lignes entières si elle y est seule. *)
    let s = b.r.start and e = in_tok.e in
    let ls = bol src s in
    let blank a z = String.for_all (fun c -> c = ' ' || c = '\t') (String.sub src a (z - a)) in
    let le = match String.index_from_opt src e '\n' with Some j -> j | None -> String.length src in
    let s, e =
      if blank ls s && blank e le then (ls, min (String.length src) (le + 1))
      else
        let e' = ref e in
        while !e' < String.length src && src.[!e'] = ' ' do incr e' done;
        (s, !e')
    in
    Ok (apply src ((s, e, "") :: edits))
