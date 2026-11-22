type t = { x : float; y : float }

let v x y = { x; y }
let zero = { x = 0.; y = 0. }
let add a b = { x = a.x +. b.x; y = a.y +. b.y }
let sub a b = { x = a.x -. b.x; y = a.y -. b.y }
let neg a = { x = -.a.x; y = -.a.y }
let scale k a = { x = k *. a.x; y = k *. a.y }
let dot a b = (a.x *. b.x) +. (a.y *. b.y)
let cross a b = (a.x *. b.y) -. (a.y *. b.x)
let norm a = Float.sqrt (dot a a)

let normalize a =
  let n = norm a in
  if n = 0. then invalid_arg "V2.normalize : vecteur nul" else scale (1. /. n) a

let rotate ~deg a =
  let t = deg *. Float.pi /. 180. in
  let c = Float.cos t and s = Float.sin t in
  { x = (c *. a.x) -. (s *. a.y); y = (s *. a.x) +. (c *. a.y) }

let dist a b = norm (sub a b)
let equal ?(eps = 1e-9) a b = Float.abs (a.x -. b.x) <= eps && Float.abs (a.y -. b.y) <= eps
let pp ppf p = Format.fprintf ppf "(%g, %g)" p.x p.y
