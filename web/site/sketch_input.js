// Cotes tapées pendant le tracé (la boîte flottante d'un modeleur) : après le premier clic
// d'un rectangle, d'un rectangle par le centre, d'un cercle, d'un oblong ou d'un polygone, taper un chiffre ouvre les
// champs de cote à côté du curseur (Tab : champ suivant, Entrée : tracer, Échap : annuler).
// La forme est tracée à ces cotes, du côté du curseur, et cotée (contraintes de longueur,
// de diamètre) : plus besoin de Sélection, élément, cote, valeur.
import { TWO_CLICK } from './sketch_tools.js';
import { parseDim } from './expr.js';

export const TYPED = { rect: ['Largeur', 'Hauteur'], crect: ['Largeur', 'Hauteur'], circle: ['Ø'], slot: ['Entraxe', 'Largeur'], cslot: ['Entraxe', 'Largeur'], polygon: ['Ø'], cpolygon: ['Sur plats'] };

// Touche pendant l'esquisse : rend vrai si elle ouvre la saisie.
export function typedDims(ed, e) {
  const f = TYPED[ed.tool];
  if (!f || ed.pending == null || !/^[0-9.]$/.test(e.key) || document.getElementById('sketch-type')) return false;
  e.preventDefault();
  const live = document.getElementById('sketch-live'), A = ed.pts[ed.pending], a = ed.pending;
  const box = Object.assign(document.createElement('form'), { id: 'sketch-type' });
  box.style.left = live?.style.left ?? '50%'; box.style.top = live?.style.top ?? '50%';
  const ins = f.map((label, i) => {
    const inp = Object.assign(document.createElement('input'), { value: i ? '' : e.key, placeholder: label, title: label, spellcheck: false });
    box.append(Object.assign(document.createElement('label'), { textContent: label }), inp);
    return inp;
  });
  box.append(Object.assign(document.createElement('button'), { type: 'submit', hidden: true })); // Entrée valide le formulaire
  const close = () => { box.remove(); ed.redraw(); };
  box.onkeydown = (ev) => { ev.stopPropagation(); if (ev.key === 'Escape') close(); };
  box.onsubmit = (ev) => {
    ev.preventDefault();
    const params = ed.ctx.params?.() ?? [];
    const dims = ins.map((x) => parseDim(x.value, params)), val = dims.map((d) => d?.value ?? null);
    if (!(val[0] > 0) || (ins[1]?.value.trim() && !(val[1] > 0))) { ins[val[0] > 0 ? 1 : 0].select(); return; }
    const q = ed.hover ?? { x: A.x + 1, y: A.y + 1 }, sx = Math.sign(q.x - A.x) || 1, sy = Math.sign(q.y - A.y) || 1;
    const h = val[1] ?? (Math.abs(q.y - A.y) * (ed.tool === 'crect' ? 2 : 1) || val[0]);
    const exprs = dims.map((d) => d?.expr ?? null);
    const l = ed.lines.length, c = ed.circles.length;
    const at = ed.tool === 'rect' ? { x: A.x + sx * val[0], y: A.y + sy * h }
      : ed.tool === 'crect' ? { x: A.x + (sx * val[0]) / 2, y: A.y + (sy * h) / 2 }
        : ed.tool === 'circle' || ed.tool === 'polygon' || ed.tool === 'cpolygon' ? { x: A.x + val[0] / 2, y: A.y } // polygone : Ø circonscrit, ou sur plats (apothème)
          : (() => { const L = Math.hypot(q.x - A.x, q.y - A.y) || 1, f = ed.tool === 'cslot' ? val[0] / 2 : val[0]; return { x: A.x + ((q.x - A.x) / L) * f, y: A.y + ((q.y - A.y) / L) * f }; })();
    const k = ed.arcs.length;
    ed.pending = null; box.remove();
    if (!TWO_CLICK[ed.tool][0](ed, a, at, ed.sides())) { ed.redraw(); return; }
    const dim = (kind, refs, v, ex) => ed.cons.push({ kind, refs, value: v, ...(ex ? { expr: kind === 'radius' ? `(${ex}) /. 2.` : ex } : {}) });
    if (ed.tool === 'polygon' || ed.tool === 'cpolygon') { const last = ed.cons[ed.cons.length - 1]; if (exprs[0]) last.expr = `(${exprs[0]}) /. 2.`; } // la cote du polygone est déjà posée
    else if (ed.tool === 'circle') dim('radius', [c], val[0] / 2, exprs[0]);
    else if (ed.tool === 'slot' || ed.tool === 'cslot') {
      // Oblong : entraxe (distance des centres) et largeur (rayon des bouts = largeur / 2).
      dim('distance', [ed.arcs[k].c, ed.arcs[k + 1].c], val[0], exprs[0]);
      if (val[1] != null) { ed.cons = ed.cons.filter((x) => !(x.kind === 'arc_radius' && x.refs[0] === k)); ed.cons.push({ kind: 'arc_radius', refs: [k], value: val[1] / 2, ...(exprs[1] ? { expr: `(${exprs[1]}) /. 2.` } : {}) }); }
    }
    else { dim('length', [l], val[0], exprs[0]); if (val[1] != null) dim('length', [l + 1], val[1], exprs[1]); }
    ed.changed();
  };
  document.getElementById('sketch-live')?.after(box);
  ins[0].focus(); ins[0].setSelectionRange(1, 1);
  return true;
}
