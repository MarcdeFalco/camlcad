type t = { point : V3.t; dir : V3.t }

let make ~point ~dir =
  if V3.norm dir = 0. then invalid_arg "Axis.make : direction nulle";
  { point; dir = V3.normalize dir }

let x = { point = V3.zero; dir = V3.ex }
let y = { point = V3.zero; dir = V3.ey }
let z = { point = V3.zero; dir = V3.ez }
