type t = Frame.t

let xy = Frame.world
let yz = Frame.world (* TODO phase 1 : axes (y, z, x) *)
let zx = Frame.world (* TODO phase 1 : axes (z, x, y) *)
let offset _ _ = Todo.todo "Plane.offset"
let normal = Frame.z_axis
