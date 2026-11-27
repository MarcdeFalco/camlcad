// Documents : on part d'un document vide ; « Nouveau » en rouvre un, les pièces d'exemple
// sont dans un menu à part, et le nom du document (celui du .ml enregistré) se modifie
// dans la barre. Sur une vue vide, une carte dit par où commencer et le bouton Esquisse pulse.
// Changer de document passe par l'éditeur de code : Ctrl+Z ramène le document précédent.

export const EXAMPLES = ['support', 'engrenage', 'charniere', 'patte', 'bielle', 'engrenages'];
export const BLANK_NAME = 'sans titre';
export const BLANK = 'open Cad\n\n(* Commencez par « Esquisse » ou « Boîte » dans la barre d\'outils. *)\nlet model : Shape.t Doc.t =\n  Doc.return Shape.empty\n';

const $ = (id) => document.getElementById(id);

// ctx : load(nom, code) (remplace le document), notify(texte)
export function initDocuments(ctx) {
  const name = $('docname'), ex = $('examples'), hint = $('empty-hint');
  for (const e of EXAMPLES) ex.append(new Option(e, e));
  const fresh = () => { ctx.load(BLANK_NAME, BLANK); };
  $('file-new').onclick = () => { fresh(); ctx.notify('Nouveau document. Ctrl+Z ramène le précédent.'); };
  ex.onchange = async () => {
    const e = ex.value; ex.value = ''; if (!e) return;
    ctx.load(e, await (await fetch(`examples/${e}.ml`)).text());
  };
  name.onchange = () => { name.value = name.value.trim().replace(/\.ml$/, '') || BLANK_NAME; };
  $('toolbar').addEventListener('click', () => { hint.hidden = true; }, true);
  return {
    fresh,
    name: () => name.value || BLANK_NAME,
    setName: (n) => { name.value = n; },
    // Carte de départ : pièce vide et rien en cours (esquisse, dialogue).
    showEmpty: (empty) => { hint.hidden = !empty; document.querySelector('#toolbar [data-cmd=sketch]').classList.toggle('pulse', empty); },
  };
}
