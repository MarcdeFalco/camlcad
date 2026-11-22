type t = { point : V3.t; dir : V3.t }

let make ~point ~dir = ignore (point, dir); Todo.todo "Axis.make"
let x = { point = V3.zero; dir = V3.ex }
let y = { point = V3.zero; dir = V3.ey }
let z = { point = V3.zero; dir = V3.ez }
