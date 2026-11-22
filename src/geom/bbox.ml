type t = { min : V3.t; max : V3.t }

let empty =
  { min = V3.v infinity infinity infinity; max = V3.v neg_infinity neg_infinity neg_infinity }

let is_empty b = b.min.x > b.max.x || b.min.y > b.max.y || b.min.z > b.max.z
let vmin (a : V3.t) (b : V3.t) = V3.v (Float.min a.x b.x) (Float.min a.y b.y) (Float.min a.z b.z)
let vmax (a : V3.t) (b : V3.t) = V3.v (Float.max a.x b.x) (Float.max a.y b.y) (Float.max a.z b.z)
let union a b = { min = vmin a.min b.min; max = vmax a.max b.max }
let of_points ps = List.fold_left (fun b p -> union b { min = p; max = p }) empty ps
let size b = if is_empty b then V3.zero else V3.sub b.max b.min
let center b = V3.scale 0.5 (V3.add b.min b.max)

let equal ?eps a b =
  (is_empty a && is_empty b) || (V3.equal ?eps a.min b.min && V3.equal ?eps a.max b.max)

let pp ppf b = Format.fprintf ppf "[%a .. %a]" V3.pp b.min V3.pp b.max
