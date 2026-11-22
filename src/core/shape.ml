type t = { id : int; v : view }

and view =
  | Empty
  | Cube of { size : Geom.V3.t; center : bool }
  | Cylinder of { r : float; h : float; center : bool }
  | Sphere of float
  | Extrude of { profile : Profile.t; h : float; twist : float; scale_top : float }
  | Revolve of { profile : Profile.t; deg : float }
  | Union of t * t
  | Difference of t * t
  | Intersection of t * t
  | Place of Geom.Frame.t * t
  | Mirror of Geom.V3.t * t

let empty = { id = 0; v = Empty }
let cube ?center:_ _ = Todo.todo "Shape.cube"
let cylinder ?center:_ ~r:_ ~h:_ () = Todo.todo "Shape.cylinder"
let sphere ~r:_ = Todo.todo "Shape.sphere"
let extrude ?twist:_ ?scale_top:_ ~h:_ _ = Todo.todo "Shape.extrude"
let revolve ?deg:_ _ = Todo.todo "Shape.revolve"
let union _ = Todo.todo "Shape.union"
let ( + ) _ _ = Todo.todo "Shape.( + )"
let ( - ) _ _ = Todo.todo "Shape.( - )"
let ( * ) _ _ = Todo.todo "Shape.( * )"
let place _ _ = Todo.todo "Shape.place"
let on = place
let translate _ _ = Todo.todo "Shape.translate"
let rotate ~axis:_ ~deg:_ _ = Todo.todo "Shape.rotate"
let mirror ~normal:_ _ = Todo.todo "Shape.mirror"
let id s = s.id
let equal a b = a.id = b.id
let subterms _ = Todo.todo "Shape.subterms"
let view s = s.v
