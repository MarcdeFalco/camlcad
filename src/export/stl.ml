let add_f32 b x = Buffer.add_int32_le b (Int32.bits_of_float x)

let to_string (m : Cad.Mesh.t) =
  let n = Cad.Mesh.n_triangles m in
  let b = Buffer.create (84 + (50 * n)) in
  let header = "camlcad STL binaire" in
  Buffer.add_string b header;
  Buffer.add_string b (String.make (80 - String.length header) ' ');
  Buffer.add_int32_le b (Int32.of_int n);
  for t = 0 to n - 1 do
    let i, j, k = Cad.Mesh.triangle m t in
    let a = Cad.Mesh.vertex m i and bb = Cad.Mesh.vertex m j and c = Cad.Mesh.vertex m k in
    let nrm = Geom.V3.(cross (sub bb a) (sub c a)) in
    let nrm = if Geom.V3.norm nrm = 0. then nrm else Geom.V3.normalize nrm in
    List.iter (fun (p : Geom.V3.t) -> add_f32 b p.x; add_f32 b p.y; add_f32 b p.z) [ nrm; a; bb; c ];
    Buffer.add_uint16_le b 0
  done;
  Buffer.contents b

let to_file path m =
  let oc = open_out_bin path in
  Fun.protect ~finally:(fun () -> close_out oc) (fun () -> output_string oc (to_string m))

let of_string s =
  let f32 off = Int32.float_of_bits (String.get_int32_le s off) in
  let n = Int32.to_int (String.get_int32_le s 80) in
  if String.length s < 84 + (50 * n) then invalid_arg "Stl.of_string : fichier tronqué";
  let index = Hashtbl.create (3 * n) in
  let verts = ref [] and nv = ref 0 in
  let vid p =
    match Hashtbl.find_opt index p with
    | Some i -> i
    | None ->
        let i = !nv in
        incr nv;
        Hashtbl.add index p i;
        verts := p :: !verts;
        i
  in
  let tris =
    Array.init (3 * n) (fun q ->
        let t = q / 3 and c = q mod 3 in
        let off = 84 + (50 * t) + 12 + (12 * c) in
        vid (f32 off, f32 (off + 4), f32 (off + 8)))
  in
  let vertices =
    List.rev !verts |> List.concat_map (fun (x, y, z) -> [ x; y; z ]) |> Array.of_list
  in
  { Cad.Mesh.vertices; triangles = tris }
