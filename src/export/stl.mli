(** Export STL binaire : en-tête 80 octets, nombre de triangles (u32 LE),
    puis 50 octets par triangle (normale, 3 sommets en float32 LE, attribut 0). *)

val to_string : Cad.Mesh.t -> string
(** Taille : [84 + 50 × n_triangles]. *)

val to_file : string -> Cad.Mesh.t -> unit

val of_string : string -> Cad.Mesh.t
(** Relecture d'un STL binaire, sommets fusionnés à l'identique. Lève [Invalid_argument]
    si le fichier est tronqué. *)

val of_file : string -> Cad.Mesh.t
(** [of_string] du contenu du fichier (STL binaire) : pièce importée ([Shape.of_mesh]).
    Lève [Sys_error] si le fichier n'existe pas. *)
