type quality = { chord_tol : float; min_segments : int; max_segments : int }

let default_quality = { chord_tol = 0.01; min_segments = 12; max_segments = 360 }

let segments q ~r ~deg =
  let frac = Float.abs deg /. 360. in
  let lo = max 1 (int_of_float (Float.ceil (float q.min_segments *. frac))) in
  let hi = max lo (int_of_float (Float.ceil (float q.max_segments *. frac))) in
  if r <= q.chord_tol then lo
  else
    let half = Float.acos (1. -. (q.chord_tol /. r)) in
    let n = int_of_float (Float.ceil (Float.abs deg *. Float.pi /. 180. /. (2. *. half))) in
    max lo (min hi n)

(* Majorant du rayon d'un profil autour de l'origine (pour la révolution). *)
let rec radius p =
  match Profile.view p with
  | Profile.Polygon ps -> List.fold_left (fun m q -> Float.max m (Geom.V2.norm q)) 0. ps
  | Circle r -> r
  | Union (a, b) -> Float.max (radius a) (radius b)
  | Difference (a, _) -> radius a
  | Intersection (a, b) -> Float.min (radius a) (radius b)
  | Offset (d, a) -> radius a +. Float.abs d
  | Translate (v, a) -> radius a +. Geom.V2.norm v
  | Rotate (_, a) -> radius a

(* Déplacement rigide du plan : rotation puis translation. *)
type motion = { rot : float; tr : Geom.V2.t }

let identity = { rot = 0.; tr = Geom.V2.zero }
let move m p = Geom.V2.add (Geom.V2.rotate ~deg:m.rot p) m.tr

module Make (K : Kernel.S) = struct
  type t = {
    quality : quality;
    solids : (int, K.solid) Hashtbl.t;
    sections : (int, K.section) Hashtbl.t;
    mutable calls : int;
    mutable hits : int;
  }

  let create ?(quality = default_quality) () =
    { quality; solids = Hashtbl.create 64; sections = Hashtbl.create 64; calls = 0; hits = 0 }

  let rec section_m c m p =
    let compute () =
      match Profile.view p with
      | Profile.Polygon ps -> K.section_of_contours [ List.map (move m) ps ]
      | Circle r ->
          let n = segments c.quality ~r ~deg:360. in
          let pts =
            List.init n (fun i ->
                let a = 2. *. Float.pi *. float i /. float n in
                move m (Geom.V2.v (r *. Float.cos a) (r *. Float.sin a)))
          in
          K.section_of_contours [ pts ]
      | Union (a, b) -> K.section_union (section_m c m a) (section_m c m b)
      | Difference (a, b) -> K.section_difference (section_m c m a) (section_m c m b)
      | Intersection (a, b) -> K.section_intersection (section_m c m a) (section_m c m b)
      | Offset (d, a) -> K.section_offset ~delta:d (section_m c m a)
      | Translate (v, a) ->
          section_m c { m with tr = Geom.V2.add (Geom.V2.rotate ~deg:m.rot v) m.tr } a
      | Rotate (d, a) -> section_m c { m with rot = m.rot +. d } a
    in
    if m <> identity then compute ()
    else
      match Hashtbl.find_opt c.sections (Profile.id p) with
      | Some s -> c.hits <- c.hits + 1; s
      | None ->
          let s = compute () in
          (match Profile.view p with
           | Translate _ | Rotate _ -> ()
           | _ -> c.calls <- c.calls + 1);
          Hashtbl.replace c.sections (Profile.id p) s;
          s

  let section c p = section_m c identity p

  let rec solid c s =
    match Hashtbl.find_opt c.solids (Shape.id s) with
    | Some k -> c.hits <- c.hits + 1; k
    | None ->
        let q = c.quality in
        let k =
          match Shape.view s with
          | Shape.Empty -> K.empty
          | Cube { size; center } ->
              let k = K.cube ~size in
              if center then K.transform (Geom.Frame.translate (Geom.V3.scale (-0.5) size) Geom.Frame.world) k
              else k
          | Cylinder { r; h; center } ->
              let k = K.cylinder ~r ~h ~segments:(segments q ~r ~deg:360.) in
              if center then K.transform (Geom.Frame.at 0. 0. (-.h /. 2.)) k else k
          | Sphere r -> K.sphere ~r ~segments:(segments q ~r ~deg:360.)
          | Extrude { profile; h; twist; scale_top } -> K.extrude (section c profile) ~h ~twist ~scale_top
          | Revolve { profile; deg } ->
              K.revolve (section c profile) ~deg ~segments:(segments q ~r:(radius profile) ~deg)
          | Union (a, b) -> K.union (solid c a) (solid c b)
          | Difference (a, b) -> K.difference (solid c a) (solid c b)
          | Intersection (a, b) -> K.intersection (solid c a) (solid c b)
          | Place (f, a) -> K.transform f (solid c a)
          | Mirror (n, a) -> K.mirror ~normal:n (solid c a)
          | Scale (f, a) -> K.scale f (solid c a)
          | Loft l ->
              let outline p = Loft.outline ~segments:(segments q ~r:(radius p) ~deg:360.) p in
              let ls = List.filter_map (fun (f, p) -> Option.map (fun o -> (f, o)) (outline p)) l in
              if List.length ls <> List.length l then K.empty else K.of_mesh (Loft.mesh ls)
          | Sweep (p, path) -> (
              match Loft.outline ~segments:(segments q ~r:(radius p) ~deg:360.) p with
              | None -> K.empty
              | Some o -> K.of_mesh (Loft.mesh (Loft.sweep_sections o path)))
        in
        c.calls <- c.calls + 1;
        Hashtbl.replace c.solids (Shape.id s) k;
        k

  let mesh c s = K.to_mesh (solid c s)
  let stats c = (c.calls, c.hits)

  let clear c =
    Hashtbl.reset c.solids;
    Hashtbl.reset c.sections;
    c.calls <- 0;
    c.hits <- 0
end
