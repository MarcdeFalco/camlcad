type obj = {
  name : string;
  mesh : Cad.Mesh.t;
  color : (int * int * int) option;
  transform : Geom.Frame.t;
}

let obj ?color ?(transform = Geom.Frame.world) name mesh = { name; mesh; color; transform }

(* CRC-32 (polynôme 0xEDB88320), table calculée à la demande. *)
let crc_table =
  lazy
    (Array.init 256 (fun n ->
         let c = ref (Int32.of_int n) in
         for _ = 0 to 7 do
           if Int32.logand !c 1l <> 0l then c := Int32.logxor 0xEDB88320l (Int32.shift_right_logical !c 1)
           else c := Int32.shift_right_logical !c 1
         done;
         !c))

let crc32 s =
  let t = Lazy.force crc_table in
  let c = ref 0xFFFFFFFFl in
  String.iter
    (fun ch ->
      let i = Int32.to_int (Int32.logand (Int32.logxor !c (Int32.of_int (Char.code ch))) 0xFFl) in
      c := Int32.logxor t.(i) (Int32.shift_right_logical !c 8))
    s;
  Int32.logxor !c 0xFFFFFFFFl

let escape s =
  let b = Buffer.create (String.length s) in
  String.iter
    (function
      | '&' -> Buffer.add_string b "&amp;"
      | '<' -> Buffer.add_string b "&lt;"
      | '>' -> Buffer.add_string b "&gt;"
      | '"' -> Buffer.add_string b "&quot;"
      | c -> Buffer.add_char b c)
    s;
  Buffer.contents b

let model_xml objs =
  let b = Buffer.create 4096 in
  let p fmt = Printf.bprintf b fmt in
  p "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
  p "<model unit=\"millimeter\" xml:lang=\"fr-FR\" xmlns=\"http://schemas.microsoft.com/3dmanufacturing/core/2015/02\">\n";
  p " <resources>\n";
  let colored = List.filter_map (fun o -> o.color) objs in
  if colored <> [] then begin
    p "  <basematerials id=\"1\">\n";
    List.iteri (fun i (r, g, bl) -> p "   <base name=\"c%d\" displaycolor=\"#%02X%02X%02X\"/>\n" i r g bl) colored;
    p "  </basematerials>\n"
  end;
  let ci = ref 0 in
  List.iteri
    (fun i o ->
      let mat =
        match o.color with
        | Some _ -> let s = Printf.sprintf " pid=\"1\" pindex=\"%d\"" !ci in incr ci; s
        | None -> ""
      in
      p "  <object id=\"%d\" name=\"%s\" type=\"model\"%s>\n   <mesh>\n    <vertices>\n" (i + 2) (escape o.name) mat;
      for v = 0 to Cad.Mesh.n_vertices o.mesh - 1 do
        let q = Cad.Mesh.vertex o.mesh v in
        p "     <vertex x=\"%.6g\" y=\"%.6g\" z=\"%.6g\"/>\n" q.x q.y q.z
      done;
      p "    </vertices>\n    <triangles>\n";
      for t = 0 to Cad.Mesh.n_triangles o.mesh - 1 do
        let a, bb, c = Cad.Mesh.triangle o.mesh t in
        p "     <triangle v1=\"%d\" v2=\"%d\" v3=\"%d\"/>\n" a bb c
      done;
      p "    </triangles>\n   </mesh>\n  </object>\n")
    objs;
  p " </resources>\n <build>\n";
  List.iteri
    (fun i o ->
      let f = o.transform in
      let x = Geom.Frame.x_axis f and y = Geom.Frame.y_axis f and z = Geom.Frame.z_axis f
      and t = Geom.Frame.origin f in
      p "  <item objectid=\"%d\" transform=\"%g %g %g %g %g %g %g %g %g %g %g %g\"/>\n" (i + 2) x.x x.y x.z
        y.x y.y y.z z.x z.y z.z t.x t.y t.z)
    objs;
  p " </build>\n</model>\n";
  Buffer.contents b

let content_types =
  "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
   <Types xmlns=\"http://schemas.openxmlformats.org/package/2006/content-types\">\
   <Default Extension=\"rels\" ContentType=\"application/vnd.openxmlformats-package.relationships+xml\"/>\
   <Default Extension=\"model\" ContentType=\"application/vnd.ms-package.3dmanufacturing-3dmodel+xml\"/>\
   </Types>\n"

let rels =
  "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n\
   <Relationships xmlns=\"http://schemas.openxmlformats.org/package/2006/relationships\">\
   <Relationship Target=\"/3D/3dmodel.model\" Id=\"rel0\" \
   Type=\"http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel\"/>\
   </Relationships>\n"

(* Archive ZIP en mode stocké (méthode 0). *)
let zip files =
  let b = Buffer.create 4096 and central = Buffer.create 512 in
  let u16 buf n = Buffer.add_uint16_le buf n and u32 buf n = Buffer.add_int32_le buf n in
  List.iter
    (fun (name, data) ->
      let off = Int32.of_int (Buffer.length b) and crc = crc32 data in
      let size = Int32.of_int (String.length data) and nlen = String.length name in
      u32 b 0x04034b50l; u16 b 20; u16 b 0; u16 b 0; u16 b 0; u16 b 0x21;
      u32 b crc; u32 b size; u32 b size; u16 b nlen; u16 b 0;
      Buffer.add_string b name; Buffer.add_string b data;
      u32 central 0x02014b50l; u16 central 20; u16 central 20; u16 central 0; u16 central 0;
      u16 central 0; u16 central 0x21; u32 central crc; u32 central size; u32 central size;
      u16 central nlen; u16 central 0; u16 central 0; u16 central 0; u16 central 0;
      u32 central 0l; u32 central off; Buffer.add_string central name)
    files;
  let cd_off = Int32.of_int (Buffer.length b) and cd_size = Int32.of_int (Buffer.length central) in
  Buffer.add_buffer b central;
  let n = List.length files in
  u32 b 0x06054b50l; u16 b 0; u16 b 0; u16 b n; u16 b n; u32 b cd_size; u32 b cd_off; u16 b 0;
  Buffer.contents b

let to_string objs =
  zip
    [ ("[Content_Types].xml", content_types); ("_rels/.rels", rels); ("3D/3dmodel.model", model_xml objs) ]

let to_file path objs =
  let oc = open_out_bin path in
  Fun.protect ~finally:(fun () -> close_out oc) (fun () -> output_string oc (to_string objs))
