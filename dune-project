(lang dune 3.14)
(name camlcad)
(generate_opam_files true)
(source (github MarcdeFalco/camlcad))
(authors "Marc de Falco")
(maintainers "Marc de Falco")
(package
 (name camlcad)
 (synopsis "CAO paramétrique fonctionnelle en OCaml, orientée impression 3D et mécanismes")
 (depends
  (ocaml (>= 4.14))
  dune
  (ppx_expect :with-test)
  (qcheck-core :with-test)))
