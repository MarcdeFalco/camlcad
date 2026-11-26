type t = Frame.t

let xy = Frame.world
let yz = Frame.make ~origin:V3.zero ~x:V3.ey ~z:V3.ex
let zx = Frame.make ~origin:V3.zero ~x:V3.ez ~z:V3.ey
let xz = Frame.make ~origin:V3.zero ~x:V3.ex ~z:(V3.neg V3.ey)
let normal = Frame.z_axis
let offset d p = Frame.translate (V3.scale d (normal p)) p
