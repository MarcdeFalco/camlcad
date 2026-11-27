open Geom

let rec outline ~segments p =
  let ( >>| ) o f = Option.map f o in
  match Profile.view p with
  | Profile.Polygon ps -> Some ps
  | Circle r ->
      Some
        (List.init segments (fun i ->
             let a = 2. *. Float.pi *. float i /. float segments in
             V2.v (r *. Float.cos a) (r *. Float.sin a)))
  | Translate (v, a) -> outline ~segments a >>| List.map (V2.add v)
  | Rotate (d, a) -> outline ~segments a >>| List.map (V2.rotate ~deg:d)
  | Union _ | Difference _ | Intersection _ | Offset _ -> None

let area (ps : V2.t array) =
  let n = Array.length ps in
  let s = ref 0. in
  for i = 0 to n - 1 do s := !s +. V2.cross ps.(i) ps.((i + 1) mod n) done;
  !s /. 2.

let ccw ps = if area ps < 0. then Array.of_list (List.rev (Array.to_list ps)) else ps

(* n sommets : ceux du contour, plus des points répartis sur les côtés au prorata des longueurs. *)
let resample n (ps : V2.t array) =
  let m = Array.length ps in
  if m >= n then ps
  else begin
    let len i = V2.dist ps.(i) ps.((i + 1) mod m) in
    let per = Array.fold_left ( +. ) 0. (Array.init m len) in
    let extra = n - m in
    let ideal = Array.init m (fun i -> float extra *. len i /. per) in
    let k = Array.map (fun x -> int_of_float (Float.floor x)) ideal in
    let rest = extra - Array.fold_left ( + ) 0 k in
    let order = List.sort (fun i j -> compare (ideal.(j) -. Float.floor ideal.(j)) (ideal.(i) -. Float.floor ideal.(i))) (List.init m Fun.id) in
    List.iteri (fun r i -> if r < rest then k.(i) <- k.(i) + 1) order;
    Array.concat
      (List.init m (fun i ->
           let a = ps.(i) and b = ps.((i + 1) mod m) in
           Array.init (k.(i) + 1) (fun j ->
               let t = float j /. float (k.(i) + 1) in
               V2.add a (V2.scale t (V2.sub b a)))))
  end

(* Départ au sommet le plus proche de l'axe x vu du centre (moyenne des sommets). *)
let align (ps : V2.t array) =
  let n = Array.length ps in
  let c = V2.scale (1. /. float n) (Array.fold_left V2.add V2.zero ps) in
  let best = ref 0 and ba = ref infinity in
  Array.iteri (fun i p -> let d = V2.sub p c in let a = Float.abs (Float.atan2 d.y d.x) in if a < !ba -. 1e-9 then (ba := a; best := i)) ps;
  Array.init n (fun i -> ps.((i + !best) mod n))

(* Triangulation par oreilles d'un polygone simple direct ; indices dans [ps]. *)
let ears (ps : V2.t array) =
  let idx = ref (List.init (Array.length ps) Fun.id) and out = ref [] in
  let cross a b c = V2.cross (V2.sub ps.(b) ps.(a)) (V2.sub ps.(c) ps.(b)) in
  let inside p a b c =
    let s1 = V2.cross (V2.sub ps.(b) ps.(a)) (V2.sub p ps.(a))
    and s2 = V2.cross (V2.sub ps.(c) ps.(b)) (V2.sub p ps.(b))
    and s3 = V2.cross (V2.sub ps.(a) ps.(c)) (V2.sub p ps.(c)) in
    s1 >= -1e-12 && s2 >= -1e-12 && s3 >= -1e-12
  in
  while List.length !idx > 3 do
    let l = Array.of_list !idx in
    let n = Array.length l in
    let tri i = (l.((i + n - 1) mod n), l.(i), l.((i + 1) mod n)) in
    let is_ear i =
      let a, b, c = tri i in
      cross a b c > 1e-12
      && Array.for_all (fun j -> j = a || j = b || j = c || not (inside ps.(j) a b c)) l
    in
    let pick =
      match List.find_opt is_ear (List.init n Fun.id) with
      | Some i -> i
      | None ->
          (* Repli (polygone presque dégénéré) : l'angle le plus convexe. *)
          let best = ref 0 in
          for i = 1 to n - 1 do
            let a, b, c = tri i and a', b', c' = tri !best in
            if cross a b c > cross a' b' c' then best := i
          done;
          !best
    in
    let a, b, c = tri pick in
    out := (a, b, c) :: !out;
    idx := List.filter (fun j -> j <> b) !idx
  done;
  (match !idx with [ a; b; c ] -> out := (a, b, c) :: !out | _ -> ());
  List.rev !out

let mesh sections =
  let secs = List.map (fun (f, ps) -> (f, ccw (Array.of_list ps))) sections in
  if List.length secs < 2 || List.exists (fun (_, ps) -> Array.length ps < 3) secs then Mesh.empty
  else begin
    let n = List.fold_left (fun m (_, ps) -> max m (Array.length ps)) 0 secs in
    let secs = Array.of_list (List.map (fun (f, ps) -> (f, align (resample n ps))) secs) in
    let k = Array.length secs in
    let n = Array.length (snd secs.(0)) in
    if Array.exists (fun (_, ps) -> Array.length ps <> n) secs then Mesh.empty
    else begin
      let vertices = Array.make (3 * k * n) 0. in
      Array.iteri
        (fun i (f, ps) ->
          Array.iteri
            (fun j (p : V2.t) ->
              let q = Frame.apply f (V3.v p.x p.y 0.) in
              let o = 3 * ((i * n) + j) in
              vertices.(o) <- q.x; vertices.(o + 1) <- q.y; vertices.(o + 2) <- q.z)
            ps)
        secs;
      let tris = ref [] in
      for i = 0 to k - 2 do
        for j = 0 to n - 1 do
          let a = (i * n) + j and b = (i * n) + ((j + 1) mod n) in
          let c = b + n and d = a + n in
          tris := (a, b, c) :: (a, c, d) :: !tris
        done
      done;
      let cap = ears (snd secs.(0)) in
      List.iter (fun (a, b, c) -> tris := (a, c, b) :: !tris) cap;
      List.iter (fun (a, b, c) -> tris := (a + ((k - 1) * n), b + ((k - 1) * n), c + ((k - 1) * n)) :: !tris) (ears (snd secs.(k - 1)));
      let flat flip = Array.of_list (List.concat_map (fun (a, b, c) -> if flip then [ a; c; b ] else [ a; b; c ]) (List.rev !tris)) in
      let m = { Mesh.vertices; triangles = flat false } in
      if Mesh.volume m < 0. then { m with triangles = flat true } else m
    end
  end
