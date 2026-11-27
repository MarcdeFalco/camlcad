// Liaisons d'assemblage à la souris (Black Book ch. 7, « Joint ») : deux pièces du code
// (« let x = Part.make … "nom" »), un port de chacune, un type ; OK ajoute la liaison à la
// liste de « Assembly.make ~ground:… [ … ] ». Le code reste la source.
import { el } from './timeline.js';
import { choice, row } from './dialogs.js';

// Pièces définies dans le code : identifiant OCaml, nom, ports.
export function partsInCode(code) {
  const out = [];
  for (const m of code.matchAll(/let\s+([a-z_][\w']*)\s*=\s*Part\.make\b/g)) {
    const end = code.indexOf('\n  in', m.index), def = code.slice(m.index, end < 0 ? undefined : end);
    const name = /"([^"]+)"\s*(?:\(|Shape|\w)/.exec(def.replace(/~ports:\s*\[[^\]]*\]/, '')) ?? /"([^"]+)"/.exec(def);
    const ports = [...(/~ports:\s*\[([^\]]*)\]/.exec(def)?.[1] ?? '').matchAll(/\(\s*"([^"]+)"\s*,/g)].map((x) => x[1]);
    out.push({ id: m[1], name: name ? name[1] : m[1], ports });
  }
  return out;
}

// Position du « ] » qui ferme la liste des liaisons de Assembly.make (ou -1).
export function jointsListEnd(code) {
  const m = /Assembly\.make[^[]*?~ground:\s*[a-z_][\w']*\s*\[/.exec(code);
  if (!m) return -1;
  let depth = 1;
  for (let i = m.index + m[0].length; i < code.length; i++) {
    if (code[i] === '[') depth++;
    if (code[i] === ']' && --depth === 0) return i;
  }
  return -1;
}

const KINDS = { revolute: 'Pivot (rotation)', prismatic: 'Glissière (translation)', fixed: 'Encastrement' };

// view : l'éditeur de code ; changed() : réévaluer.
export function jointDialog(d, view, changed) {
  const code = view.state.doc.toString();
  const insert = (j) => {
    const doc = view.state.doc.toString(), end = jointsListEnd(doc), open = doc.lastIndexOf('[', end);
    const empty = !doc.slice(open + 1, end).trim();
    view.dispatch({ changes: { from: end, insert: `${empty ? ' ' : ';\n      '}${j} ` } }); changed();
  };
  const parts = partsInCode(code).filter((p) => p.ports.length);
  if (parts.length < 2 || jointsListEnd(code) < 0) { d.ctx.notify('Il faut un Assembly.make et au moins deux pièces à ports dans le code.', true); return; }
  const P = { kind: 'revolute', a: parts[0].id, pa: parts[0].ports[0], b: parts[1].id, pb: parts[1].ports[0], name: '' };
  const portSel = (side) => {
    const part = parts.find((p) => p.id === P[side]);
    if (!part.ports.includes(P['p' + side])) P['p' + side] = part.ports[0];
    return choice(Object.fromEntries(part.ports.map((x) => [x, x])), P['p' + side], (v) => { P['p' + side] = v; });
  };
  const pa = el('span'), pb = el('span');
  const refresh = () => { pa.replaceChildren(portSel('a')); pb.replaceChildren(portSel('b')); };
  const partChoice = (side) => choice(Object.fromEntries(parts.map((p) => [p.id, p.name])), P[side], (v) => { P[side] = v; refresh(); });
  const name = el('input', { value: '', placeholder: 'automatique', className: 'noenter' });
  d.open('LIAISON', [
    row('Type', choice(KINDS, P.kind, (v) => { P.kind = v; })),
    row('Pièce 1', partChoice('a')), row('Port 1', pa),
    row('Pièce 2', partChoice('b')), row('Port 2', pb),
    row('Nom', name),
  ], {
    key: 'joint',
    ok: () => {
      if (P.a === P.b) { d.ctx.notify('Liaison : deux pièces différentes.', true); return false; }
      const nm = name.value.trim() || `${P.kind === 'fixed' ? 'encastrement' : P.kind === 'revolute' ? 'pivot' : 'glissiere'}_${parts.find((p) => p.id === P.b).name}`;
      insert(`Joint.${P.kind} ~name:${JSON.stringify(nm)} Part.(${P.a} @: ${JSON.stringify(P.pa)}) Part.(${P.b} @: ${JSON.stringify(P.pb)})`);
    },
  });
  refresh();
}

// Lien de mouvement (Black Book ch. 7, Motion Link) : q(menée) = rapport × q(menante),
// écrit dans ~couplings de Assembly.make. coords : coordonnées du mécanisme (noms).
export function linkDialog(d, view, coords, changed) {
  if (coords.length < 2) { d.ctx.notify('Il faut deux liaisons mobiles pour un lien de mouvement.', true); return; }
  const names = Object.fromEntries(coords.map((c) => [c.name, c.name]));
  const P = { driver: coords[0].name, driven: coords[1].name, ratio: -1 };
  const ratio = el('input', { type: 'number', step: 'any', value: '-1', className: 'noenter' });
  ratio.oninput = () => { P.ratio = Number(ratio.value); };
  d.open('LIEN DE MOUVEMENT', [
    row('Menante', choice(names, P.driver, (v) => { P.driver = v; })),
    row('Menée', choice(names, P.driven, (v) => { P.driven = v; })),
    row('Rapport', ratio),
    el('div', { className: 'hint', textContent: 'Engrenages : −z1/z2 ; même sens : positif.' }),
  ], {
    key: 'link',
    ok: () => {
      if (P.driver === P.driven || !Number.isFinite(P.ratio)) { d.ctx.notify('Lien : deux liaisons différentes et un rapport numérique.', true); return false; }
      let r = String(P.ratio); if (!/[.e]/.test(r)) r += '.';
      const rec = `{ driver = ${JSON.stringify(P.driver)}; driven = ${JSON.stringify(P.driven)}; ratio = ${P.ratio < 0 ? `(${r})` : r} }`;
      const doc = view.state.doc.toString(), m = /~couplings:\s*\[/.exec(doc);
      if (m) {
        const end = doc.indexOf(']', m.index), empty = !doc.slice(m.index + m[0].length, end).trim();
        view.dispatch({ changes: { from: end, insert: `${empty ? ' ' : '; '}${rec} ` } });
      } else {
        const a = /Assembly\.make\b/.exec(doc);
        if (!a) { d.ctx.notify('Pas de Assembly.make dans le code.', true); return false; }
        view.dispatch({ changes: { from: a.index + a[0].length, insert: ` ~couplings:[ ${rec} ]` } });
      }
      changed();
    },
  });
}
