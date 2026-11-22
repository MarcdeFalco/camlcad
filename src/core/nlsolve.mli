(** Résolution de systèmes non linéaires [f x = 0], [f : R^n -> R^m], pour le
    solveur d'esquisses. Pas d'hypothèse [m = n] : une esquisse est souvent
    sous-contrainte (m < n).

    Méthode : Gauss-Newton à pas de norme minimale,
    [dx = - J^T (J J^T + lambda I)^-1 f x], avec amortissement de Levenberg
    adaptatif et jacobienne par différences centrées. Partant de [x0], la
    solution reste proche des valeurs initiales sur les directions libres :
    c'est ce qui donne à une esquisse sous-contrainte une forme prévisible. *)

type report = {
  converged : bool;  (** [‖f x‖∞ <= tol] *)
  iterations : int;
  residual : float;  (** [‖f x‖∞] final *)
  rank : int;  (** rang numérique de la jacobienne à la solution *)
}

val solve :
  ?tol:float -> ?max_iter:int -> n:int -> m:int -> (float array -> float array) -> float array ->
  float array * report
(** [solve ~n ~m f x0] ; défauts [tol = 1e-9], [max_iter = 100]. [f] doit
    rendre un tableau de longueur [m] ; [x0] n'est pas modifié.
    Lève [Invalid_argument] si [Array.length x0 <> n]. *)

val jacobian : n:int -> m:int -> (float array -> float array) -> float array -> float array array
(** [m] lignes de [n] colonnes, différences centrées (pas [1e-7 × max 1 |x_i|]). *)

val rank : ?eps:float -> float array array -> int
(** Rang numérique par élimination de Gauss à pivot total, pivots
    [<= eps × max |a_ij|] comptés nuls (défaut [eps = 1e-8]). *)
