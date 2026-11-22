type t = { id : int; v : view }

and view =
  | Polygon of Geom.V2.t list
  | Circle of float
  | Union of t * t
  | Difference of t * t
  | Intersection of t * t
  | Offset of float * t
  | Translate of Geom.V2.t * t
  | Rotate of float * t

let polygon _ = Todo.todo "Profile.polygon"
let rect ?center:_ ~w:_ ~h:_ () = Todo.todo "Profile.rect"
let circle ~r:_ = Todo.todo "Profile.circle"
let union _ _ = Todo.todo "Profile.union"
let difference _ _ = Todo.todo "Profile.difference"
let intersection _ _ = Todo.todo "Profile.intersection"
let offset _ _ = Todo.todo "Profile.offset"
let translate _ _ = Todo.todo "Profile.translate"
let rotate ~deg:_ _ = Todo.todo "Profile.rotate"
let id p = p.id
let equal a b = a.id = b.id
let view p = p.v
