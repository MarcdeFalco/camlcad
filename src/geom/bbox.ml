type t = { min : V3.t; max : V3.t }

let empty =
  { min = V3.v infinity infinity infinity; max = V3.v neg_infinity neg_infinity neg_infinity }

let is_empty _ = Todo.todo "Bbox.is_empty"
let of_points _ = Todo.todo "Bbox.of_points"
let union _ _ = Todo.todo "Bbox.union"
let size _ = Todo.todo "Bbox.size"
let center _ = Todo.todo "Bbox.center"
let equal ?eps:_ _ _ = Todo.todo "Bbox.equal"
let pp ppf b = Format.fprintf ppf "[%a .. %a]" V3.pp b.min V3.pp b.max
