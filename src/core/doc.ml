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
}

type journal = { params : param_info list; features : feature_info list }
type error = { message : string; loc : Loc.t; journal : journal }
type env = (string * float) list
type 'a t = env -> journal -> ('a * journal, error) result

let return _ = Todo.todo "Doc.return"
let bind _ _ = Todo.todo "Doc.bind"
let map _ _ = Todo.todo "Doc.map"
let both _ _ = Todo.todo "Doc.both"

module Syntax = struct
  let ( let* ) = bind
  let ( let+ ) m f = map f m
  let ( and+ ) = both
  let ( and* ) = both
end

let param ?loc:_ ?range:_ ?unit_:_ _ _ = Todo.todo "Doc.param"
let feature ?loc:_ ~name:_ _ = Todo.todo "Doc.feature"
let fail ?loc:_ _ = Todo.todo "Doc.fail"
let run ?overrides:_ _ = Todo.todo "Doc.run"
