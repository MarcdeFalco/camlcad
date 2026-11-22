type t = { x : float; y : float; z : float }

let v x y z = { x; y; z }
let zero = v 0. 0. 0.
let ex = v 1. 0. 0.
let ey = v 0. 1. 0.
let ez = v 0. 0. 1.
let add a b = v (a.x +. b.x) (a.y +. b.y) (a.z +. b.z)
let sub a b = v (a.x -. b.x) (a.y -. b.y) (a.z -. b.z)
let neg a = v (-.a.x) (-.a.y) (-.a.z)
let scale k a = v (k *. a.x) (k *. a.y) (k *. a.z)
let dot a b = (a.x *. b.x) +. (a.y *. b.y) +. (a.z *. b.z)
let cross a b = v ((a.y *. b.z) -. (a.z *. b.y)) ((a.z *. b.x) -. (a.x *. b.z)) ((a.x *. b.y) -. (a.y *. b.x))
let norm a = Float.sqrt (dot a a)

let normalize a =
  let n = norm a in
  if n = 0. then invalid_arg "V3.normalize : vecteur nul" else scale (1. /. n) a

let dist a b = norm (sub a b)
let of_v2 ?(z = 0.) (p : V2.t) = v p.x p.y z

let equal ?(eps = 1e-9) a b =
  Float.abs (a.x -. b.x) <= eps && Float.abs (a.y -. b.y) <= eps && Float.abs (a.z -. b.z) <= eps

let pp ppf p = Format.fprintf ppf "(%g, %g, %g)" p.x p.y p.z
