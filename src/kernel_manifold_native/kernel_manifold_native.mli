(** Noyau [Kernel.S] natif : Manifold (même version que manifold-3d côté JS)
    lié par sa C API. Les objets sont libérés par le GC OCaml.

    Compilation : [scripts/build-manifold.sh] installe Manifold dans
    [_manifold/] ; la variable [MANIFOLD_PREFIX] permet un autre emplacement. *)

include Cad.Kernel.S

val available : unit -> bool
(** [false] si la bibliothèque a été compilée sans Manifold : elle se lie,
    mais toute opération géométrique lève [Failure]. *)
