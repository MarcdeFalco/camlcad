type obj = {
  name : string;
  mesh : Cad.Mesh.t;
  color : (int * int * int) option;
  transform : Geom.Frame.t;
}

let obj ?color ?(transform = Geom.Frame.world) name mesh = { name; mesh; color; transform }
let to_string _ = failwith "TODO phase 1 : Threemf.to_string"
let to_file _ _ = failwith "TODO phase 1 : Threemf.to_file"
let crc32 _ = failwith "TODO phase 1 : Threemf.crc32"
