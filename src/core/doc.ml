type param_info = {
  p_name : string;
  p_default : float;
  p_value : float;
  p_range : (float * float) option;
  p_unit : string option;
  p_loc : Loc.t;
}

type feature_info = {
  f_id : int;
  f_name : string;
  f_loc : Loc.t;
  f_deps : int list;
  f_shape : Shape.t;
  f_suppressed : bool;
}

type journal = { params : param_info list; features : feature_info list }
type error = { message : string; loc : Loc.t; journal : journal }

(* État interne : listes à l'envers pour l'ajout en O(1). *)
type state = { params_rev : param_info list; features_rev : feature_info list }
type env = (string * float) list
type 'a t = env -> state -> ('a * state, string * Loc.t * state) result

let journal_of st = { params = List.rev st.params_rev; features = List.rev st.features_rev }
let return x _ st = Ok (x, st)

let bind m f env st =
  match m env st with Ok (x, st) -> f x env st | Error _ as e -> e

let map f m = bind m (fun x -> return (f x))
let both a b = bind a (fun x -> bind b (fun y -> return (x, y)))

module Syntax = struct
  let ( let* ) = bind
  let ( let+ ) m f = map f m
  let ( and+ ) = both
  let ( and* ) = both
end

let fail ?(loc = Loc.none) msg _ st = Error (msg, loc, st)

let param ?(loc = Loc.none) ?range ?unit_ name default env st =
  if List.exists (fun p -> p.p_name = name) st.params_rev then
    Error ("paramètre en double : " ^ name, loc, st)
  else
    let value = Option.value ~default (List.assoc_opt name env) in
    match range with
    | Some (lo, hi) when value < lo || value > hi ->
        Error (Printf.sprintf "%s : %g hors de [%g, %g]" name value lo hi, loc, st)
    | _ ->
        let p =
          { p_name = name; p_default = default; p_value = value; p_range = range; p_unit = unit_; p_loc = loc }
        in
        Ok (value, { st with params_rev = p :: st.params_rev })

let feature ?(loc = Loc.none) ?(suppressed = false) ~name shape _ st =
  if List.exists (fun f -> f.f_name = name) st.features_rev then
    Error ("feature en double : " ^ name, loc, st)
  else
    let subs = Shape.subterms shape in
    let deps =
      List.filter_map
        (fun f -> if List.mem (Shape.id f.f_shape) subs then Some f.f_id else None)
        st.features_rev
      |> List.sort compare
    in
    let f =
      { f_id = List.length st.features_rev; f_name = name; f_loc = loc; f_deps = deps; f_shape = shape;
        f_suppressed = suppressed }
    in
    Ok ((if suppressed then Shape.empty else shape), { st with features_rev = f :: st.features_rev })

let run ?(overrides = []) m =
  match m overrides { params_rev = []; features_rev = [] } with
  | Error (message, loc, st) -> Error { message; loc; journal = journal_of st }
  | Ok (x, st) -> (
      match
        List.find_opt (fun (n, _) -> not (List.exists (fun p -> p.p_name = n) st.params_rev)) overrides
      with
      | Some (n, _) -> Error { message = "paramètre inconnu : " ^ n; loc = Loc.none; journal = journal_of st }
      | None -> Ok (x, journal_of st))
