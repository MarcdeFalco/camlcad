type t = { origin : V3.t; x : V3.t; y : V3.t; z : V3.t }

let world = { origin = V3.zero; x = V3.ex; y = V3.ey; z = V3.ez }
let make ~origin:_ ~x:_ ~z:_ = Todo.todo "Frame.make"
let origin f = f.origin
let x_axis f = f.x
let y_axis f = f.y
let z_axis f = f.z
let at x y z = { world with origin = V3.v x y z }
let translate _ _ = Todo.todo "Frame.translate"
let rotate ~axis:_ ~deg:_ _ = Todo.todo "Frame.rotate"
let compose _ _ = Todo.todo "Frame.compose"
let inverse _ = Todo.todo "Frame.inverse"
let apply _ _ = Todo.todo "Frame.apply"
let apply_dir _ _ = Todo.todo "Frame.apply_dir"
let to_matrix _ = Todo.todo "Frame.to_matrix"
let equal ?eps:_ _ _ = Todo.todo "Frame.equal"
let pp ppf f = Format.fprintf ppf "frame(o=%a)" V3.pp f.origin
