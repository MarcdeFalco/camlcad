type t = { origin : V3.t; x : V3.t; y : V3.t; z : V3.t }

let world = { origin = V3.zero; x = V3.ex; y = V3.ey; z = V3.ez }

let make ~origin ~x ~z =
  let z = V3.normalize z in
  let x' = V3.sub x (V3.scale (V3.dot x z) z) in
  if V3.norm x' < 1e-12 then invalid_arg "Frame.make : x et z colinéaires";
  let x = V3.normalize x' in
  { origin; x; y = V3.cross z x; z }

let origin f = f.origin
let x_axis f = f.x
let y_axis f = f.y
let z_axis f = f.z
let at x y z = { world with origin = V3.v x y z }
let translate d f = { f with origin = V3.add f.origin d }

(* Formule de Rodrigues, axe passant par l'origine du monde. *)
let rot_vec ~axis ~deg p =
  let k = V3.normalize axis in
  let t = deg *. Float.pi /. 180. in
  let c = Float.cos t and s = Float.sin t in
  V3.add
    (V3.add (V3.scale c p) (V3.scale s (V3.cross k p)))
    (V3.scale (V3.dot k p *. (1. -. c)) k)

let rotate ~axis ~deg f =
  let r = rot_vec ~axis ~deg in
  { origin = r f.origin; x = r f.x; y = r f.y; z = r f.z }

let apply_dir f (p : V3.t) = V3.add (V3.add (V3.scale p.x f.x) (V3.scale p.y f.y)) (V3.scale p.z f.z)
let apply f p = V3.add f.origin (apply_dir f p)

let compose a b =
  { origin = apply a b.origin; x = apply_dir a b.x; y = apply_dir a b.y; z = apply_dir a b.z }

let inverse f =
  (* Rotation transposée ; nouvelle origine = - Rᵀ o. *)
  let col (a : V3.t) (b : V3.t) (c : V3.t) = V3.v a.x b.x c.x, V3.v a.y b.y c.y, V3.v a.z b.z c.z in
  let x, y, z = col f.x f.y f.z in
  let g = { origin = V3.zero; x; y; z } in
  { g with origin = V3.neg (apply_dir g f.origin) }

let to_matrix f =
  [| f.x.x; f.x.y; f.x.z; 0.; f.y.x; f.y.y; f.y.z; 0.; f.z.x; f.z.y; f.z.z; 0.;
     f.origin.x; f.origin.y; f.origin.z; 1. |]

let equal ?(eps = 1e-9) a b =
  V3.equal ~eps a.origin b.origin && V3.equal ~eps a.x b.x && V3.equal ~eps a.y b.y
  && V3.equal ~eps a.z b.z

let pp ppf f =
  Format.fprintf ppf "frame(o=%a, x=%a, y=%a, z=%a)" V3.pp f.origin V3.pp f.x V3.pp f.y V3.pp f.z
