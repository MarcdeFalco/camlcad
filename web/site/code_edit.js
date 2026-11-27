// Insertions dans le code (le code reste la seule source de vérité) : feature combinée au
// résultat, plan de construction, noms libres, esquisses et plans présents dans le code.
import { basePlanes, frameFromNumbers } from './planes.js';
import { isolateHistory } from '@codemirror/commands';

// Chaque commande de l'éditeur est une étape d'annulation à part (même rapprochée de la précédente).
const step = isolateHistory.of('full');

// ctx : view (CodeMirror), notify(texte, erreur?), changed() (réévaluer tout de suite),
// beforeInsert() (fin de commande : sélection effacée).
export function codeEdits({ view, notify, changed, beforeInsert }) {
  const lastReturn = () => {
    const re = /^([ \t]*)Doc\.return\s+(.+?)\s*$/gm, doc = view.state.doc.toString();
    let m, last = null; while ((m = re.exec(doc))) last = m;
    return last;
  };
  // Insère une feature avant le dernier « Doc.return X » et la combine : X + f, X - f ou X * f.
  function insertFeature(code, feat, op, n) {
    const last = lastReturn();
    if (!last) { notify('Pas de « Doc.return … » où insérer la feature.', true); return; }
    const prev = last[2].trim();
    let ins = code, res = feat;
    if (!/^(Shape\.)?empty$/.test(prev)) {
      res = `resultat${n}`;
      ins += `  let%feat ${res} = Shape.(${prev} ${{ join: '+', cut: '-', intersect: '*' }[op]} ${feat}) in\n`;
    }
    beforeInsert();
    view.dispatch({ changes: { from: last.index, to: last.index + last[0].length, insert: ins + `${last[1]}Doc.return ${res}` } , annotations: step });
    changed();
  }
  // Liaisons insérées telles quelles avant le dernier Doc.return (esquisse gardée seule).
  function insertLets(code) {
    const last = lastReturn();
    if (!last) { notify('Pas de « Doc.return … » où insérer.', true); return; }
    beforeInsert();
    view.dispatch({ changes: { from: last.index, to: last.index, insert: code }, annotations: step });
    changed();
  }
  // Remplace le résultat X du dernier Doc.return par une feature « name = expr(X) » (déplacer…).
  function insertResult(name, expr) {
    const last = lastReturn();
    if (!last) { notify('Pas de « Doc.return … » à transformer.', true); return; }
    beforeInsert();
    view.dispatch({ changes: { from: last.index, to: last.index + last[0].length, insert: `  let%feat ${name} = ${expr(last[2].trim())} in\n${last[1]}Doc.return ${name}` } , annotations: step });
    changed();
  }
  // Paramètre utilisateur : « let%param nom = v [@unit …] in » au début du corps de model.
  function insertParam(name, v, unit) {
    const m = /^let model\b[^\n]*=\s*\n/m.exec(view.state.doc.toString());
    if (!m) { notify('Pas de « let model … = » où ajouter le paramètre.', true); return; }
    let lit = String(Number(v.toPrecision(10))); if (!/[.e]/.test(lit)) lit += '.';
    const u = unit === 'mm' ? ' [@unit "mm"]' : unit === 'deg' ? ' [@unit "°"]' : '';
    const lo = v > 0 ? v / 4 : v - 10, hi = v > 0 ? v * 4 : v + 10, f = (x) => { let s = String(Number(x.toPrecision(6))); return /[.e]/.test(s) ? s : s + '.'; };
    view.dispatch({ changes: { from: m.index + m[0].length, insert: `  let%param ${name} = ${lit} [@range ${f(lo)}, ${f(hi)}]${u} in\n` } , annotations: step });
    changed();
    notify(`Paramètre « ${name} » créé.`);
  }
  // Plans de construction : « let planN = Geom.Plane.offset d Geom.Plane.xy » (plan décalé).
  function constructionPlanes() {
    const out = {};
    for (const m of view.state.doc.toString().matchAll(/let\s+([a-z_][\w']*)\s*=\s*Geom\.Plane\.offset\s+\(?\s*(-?[\d.]+)\s*\)?\s+Geom\.Plane\.(xy|xz|yz)\b/g)) {
      const base = basePlanes[m[3].toUpperCase()].frame, d = Number(m[2]);
      out[m[1]] = { frame: { ...base, origin: base.origin.clone().addScaledVector(base.z, d) }, code: m[1], label: m[1], line: view.state.doc.lineAt(m.index).number };
    }
    // Plan milieu, plan à un angle : repère littéral marqué « (* construction *) ».
    const n = '\\(?\\s*(-?[\\d.e-]+)\\s*\\)?', v = `\\(Geom\\.V3\\.v ${n} ${n} ${n}\\)`;
    const lit = new RegExp(`let\\s+([a-z_][\\w']*)\\s*=\\s*\\(\\* construction \\*\\)\\s*Geom\\.Frame\\.make ~origin:${v} ~x:${v} ~z:${v}`, 'g');
    for (const m of view.state.doc.toString().matchAll(lit))
      out[m[1]] = { frame: frameFromNumbers(m.slice(2, 11).map(Number)), code: m[1], label: m[1], line: view.state.doc.lineAt(m.index).number };
    return out;
  }
  // Insère « let planN = … in » avant le dernier Doc.return (plan de construction, pas de matière).
  function insertPlane(code) {
    const last = lastReturn();
    if (!last) { notify('Pas de « Doc.return … » où insérer le plan.', true); return; }
    const name = `plan${nextIndex()}`;
    view.dispatch({ changes: { from: last.index, to: last.index, insert: `${last[1]}let ${name} = ${code} in\n` } , annotations: step });
    changed();
    notify(`Plan de construction « ${name} » : cliquez-le dans le navigateur pour y esquisser.`);
  }
  // Numéro libre : un de plus que le plus grand suffixe des noms liés par let / let%feat / let%sketch
  // (tous les noms générés : esquisse3, echelle4…), quel que soit leur préfixe.
  const nextIndex = () => 1 + Math.max(0, ...[...view.state.doc.toString().matchAll(/\blet(?:%\w+)?\s+[a-z_]+?(\d+)\s*=/g)].map((m) => Number(m[1])));
  const sketchesInCode = () => [...view.state.doc.toString().matchAll(/let%sketch\s+([a-z_][\w']*)/g)].map((m) => ({ name: m[1], line: view.state.doc.lineAt(m.index).number }));
  const allPlanes = () => ({ ...basePlanes, ...constructionPlanes() });
  return { insertFeature, insertLets, insertResult, insertParam, insertPlane, constructionPlanes, allPlanes, nextIndex, sketchesInCode };
}

// Positions au format __POS__ : colonnes en octets depuis le début de la ligne.
export function locRangeIn(view, loc) {
  const line = view.state.doc.line(loc.line);
  const enc = new TextEncoder(), text = view.state.doc.sliceString(line.from, view.state.doc.length);
  const toChars = (bytes) => { let b = 0, i = 0; while (b < bytes && i < text.length) { b += enc.encode(text[i]).length; i++; } return i; };
  return { from: line.from + toChars(loc.start_col), to: line.from + toChars(loc.end_col) };
}
