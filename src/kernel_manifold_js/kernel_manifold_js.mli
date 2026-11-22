(** Noyau [Kernel.S] adossé à manifold-3d (WASM), pour js_of_ocaml.

    Le module WASM doit être chargé par l'hôte JavaScript avant tout appel :
    {[
      import Module from 'manifold-3d';
      const wasm = await Module(); wasm.setup();
      globalThis.__manifold = wasm;
    ]}
    Les objets WASM ne sont pas libérés ([delete]) : acceptable pour le
    prototype, à traiter avant l'éditeur interactif. *)

include Cad.Kernel.S

val ready : unit -> bool
(** [true] si [globalThis.__manifold] est présent. *)
