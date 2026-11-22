type kind = Fixed | Revolute | Prismatic

type t = {
  name : string;
  kind : kind;
  parent : Part.t * string;
  child : Part.t * string;
  limits : (float * float) option;
  init : float;
}

let mk kind ?name ?limits ?(init = 0.) ((p : Part.t), pp) ((c : Part.t), cp) =
  let name = match name with Some n -> n | None -> Printf.sprintf "%s.%s-%s.%s" p.name pp c.name cp in
  { name; kind; parent = (p, pp); child = (c, cp); limits; init }

let fixed ?name a b = mk Fixed ?name a b
let revolute ?name ?limits ?init a b = mk Revolute ?name ?limits ?init a b
let prismatic ?name ?limits ?init a b = mk Prismatic ?name ?limits ?init a b

let motion kind q =
  match kind with
  | Fixed -> Geom.Frame.world
  | Revolute -> Geom.Frame.rotate ~axis:Geom.V3.ez ~deg:q Geom.Frame.world
  | Prismatic -> Geom.Frame.at 0. 0. q
