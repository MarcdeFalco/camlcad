// Fichier (Black Book ch. 1 : Open, Save, Recover) : le document est son code OCaml.
// Ouvrir un .ml, l'enregistrer, et reprise automatique du dernier état (stockage du navigateur).
import { EditorView } from 'codemirror';
import { StateEffect } from '@codemirror/state';

const KEY = 'camlcad.document';

// Téléchargement d'un fichier produit par l'éditeur.
export function saveBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

// ctx : view, load(nom, code), name(), download(blob, ext, nom), notify(texte)
export function initFiles(ctx) {
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.ml,text/plain', hidden: true, id: 'open-file' });
  document.body.append(input);
  input.onchange = async () => {
    const f = input.files[0]; if (!f) return;
    ctx.load(f.name.replace(/\.ml$/, ''), await f.text()); input.value = '';
  };
  document.getElementById('file-open').onclick = () => input.click();
  document.getElementById('file-save').onclick = () =>
    ctx.download(new Blob([ctx.view.state.doc.toString()], { type: 'text/plain' }), 'ml', ctx.name());
  // Sauvegarde continue (à chaque modification, un peu différée).
  let t = null;
  ctx.view.dispatch({ effects: StateEffect.appendConfig.of(EditorView.updateListener.of((u) => {
    if (!u.docChanged) return;
    clearTimeout(t);
    t = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify({ name: ctx.name(), code: u.state.doc.toString() })); } catch { /* stockage plein ou interdit */ } }, 400);
  })) });
  // Reprise : rend vrai si un document a été rouvert.
  return function restore() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) ?? 'null');
      if (!d?.code) return false;
      ctx.load(d.name || 'document', d.code);
      ctx.notify(`Document « ${d.name} » repris dans l'état où vous l'aviez laissé.`);
      return true;
    } catch { return false; }
  };
}
