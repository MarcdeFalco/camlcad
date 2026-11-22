type t = { x : float; y : float }

let v x y = { x; y }
let zero = { x = 0.; y = 0. }
let add _ _ = Todo.todo "V2.add"
let sub _ _ = Todo.todo "V2.sub"
let neg _ = Todo.todo "V2.neg"
let scale _ _ = Todo.todo "V2.scale"
let dot _ _ = Todo.todo "V2.dot"
let cross _ _ = Todo.todo "V2.cross"
let norm _ = Todo.todo "V2.norm"
let normalize _ = Todo.todo "V2.normalize"
let rotate ~deg:_ _ = Todo.todo "V2.rotate"
let dist _ _ = Todo.todo "V2.dist"
let equal ?eps:_ _ _ = Todo.todo "V2.equal"
let pp ppf p = Format.fprintf ppf "(%g, %g)" p.x p.y
