(** Export 3MF (paquet OPC = archive ZIP).

    Sans dépendance externe : ZIP en mode « stocké » (pas de compression),
    CRC-32 calculé localement. Contenu : [[Content_Types].xml],
    [_rels/.rels], [3D/3dmodel.model] (unité millimètre). Chaque objet est
    un [<object type="model">] séparé avec son nom, et sa couleur via
    l'extension matériaux de base si elle est fournie. *)

type obj = {
  name : string;
  mesh : Cad.Mesh.t;
  color : (int * int * int) option;  (** RVB 0-255 *)
  transform : Geom.Frame.t;  (** position sur le plateau *)
}

val obj : ?color:int * int * int -> ?transform:Geom.Frame.t -> string -> Cad.Mesh.t -> obj

val to_string : obj list -> string
val to_file : string -> obj list -> unit

val crc32 : string -> int32
(** Exposé pour les tests : [crc32 "123456789" = 0xCBF43926l]. *)
