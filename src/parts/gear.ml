let pi = Float.pi
let rad d = d *. pi /. 180.
let pitch_radius ~module_ ~teeth = module_ *. float teeth /. 2.
let tip_radius ~module_ ~teeth = pitch_radius ~module_ ~teeth +. module_
let root_radius ~module_ ~teeth = pitch_radius ~module_ ~teeth -. (1.25 *. module_)
let center_distance ~module_ z1 z2 = module_ *. float (z1 + z2) /. 2.
let inv a = tan a -. a

let tooth_half_angle ?(pressure_angle = 20.) ?(backlash = 0.) ~module_ ~teeth r =
  let rp = pitch_radius ~module_ ~teeth in
  let alpha = rad pressure_angle in
  let rb = rp *. cos alpha in
  let psi = ((pi *. module_ /. 2.) -. backlash) /. (2. *. rp) in
  let ar = acos (Float.min 1. (rb /. Float.max r rb)) in
  psi +. inv alpha -. inv ar

let spur ?(pressure_angle = 20.) ?(backlash = 0.) ?(flank_points = 8) ~module_ ~teeth () =
  if teeth < 4 then invalid_arg "Gear.spur : au moins 4 dents";
  if module_ <= 0. then invalid_arg "Gear.spur : module > 0";
  let rp = pitch_radius ~module_ ~teeth in
  let rb = rp *. cos (rad pressure_angle) in
  let ra = tip_radius ~module_ ~teeth and rf = root_radius ~module_ ~teeth in
  let half r = Float.max 0. (tooth_half_angle ~pressure_angle ~backlash ~module_ ~teeth r) in
  let r0 = Float.max rb rf in
  let polar r a = Geom.V2.v (r *. cos a) (r *. sin a) in
  let radii = List.init (flank_points + 1) (fun i -> r0 +. ((ra -. r0) *. float i /. float flank_points)) in
  let tooth i =
    let phi = 2. *. pi *. float i /. float teeth in
    let foot = if rf < rb then [ polar rf (phi -. half rb) ] else [] in
    let right = List.map (fun r -> polar r (phi -. half r)) radii in
    let left = List.rev_map (fun r -> polar r (phi +. half r)) radii in
    let foot' = if rf < rb then [ polar rf (phi +. half rb) ] else [] in
    foot @ right @ left @ foot'
  in
  Cad.Profile.polygon (List.concat (List.init teeth tooth))
