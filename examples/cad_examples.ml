module Support = Support
module Engrenage = Engrenage
module Charniere = Charniere
module Patte = Patte
module Bielle = Bielle
module Engrenages = Engrenages

let all = [ ("support", Support.model); ("engrenage", Engrenage.model); ("charniere", Charniere.model);
    ("patte", Patte.model) ]

let mechanisms = [ ("bielle", Bielle.model); ("engrenages", Engrenages.model) ]
