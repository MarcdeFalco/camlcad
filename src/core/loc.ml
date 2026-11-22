type t = { file : string; line : int; start_col : int; end_col : int }

let none = { file = ""; line = 0; start_col = 0; end_col = 0 }
let of_pos (file, line, start_col, end_col) = { file; line; start_col; end_col }
let pp ppf l = Format.fprintf ppf "%s:%d:%d-%d" l.file l.line l.start_col l.end_col
