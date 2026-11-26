// Copies d'esquisse (Black Book ch. 2 : Mirror, Rectangular Pattern) : les éléments
// sélectionnés sont recopiés et liés aux originaux par des contraintes (symétrie par
// rapport à une ligne, écarts en x et y), ce qui garde la copie associative.
import { loopPoints } from './sketch_arcs.js';

const cons = (ed, kind, refs, value) => ed.cons.push(value === undefined ? { kind, refs } : { kind, refs, value });

// Points utilisés par les éléments choisis (lignes, cercles, arcs, points).
function usedPoints(ed, items) {
  const s = new Set();
  for (const { kind, i } of items) {
    if (kind === 'p') s.add(i);
    if (kind === 'l') ed.lines[i].forEach((p) => s.add(p));
    if (kind === 'c') s.add(ed.circles[i].c);
    if (kind === 'a') { const a = ed.arcs[i]; [a.c, a.a, a.b].forEach((p) => s.add(p)); }
  }
  return [...s];
}

// Copie générique : map(p) donne le point image (créé au besoin) ; flip : orientation inversée.
function copy(ed, items, map, flip) {
  const L = new Map(), A = new Map();
  for (const { kind, i } of items) {
    if (kind === 'l') { const [a, b] = ed.lines[i]; L.set(i, ed.lines.length); ed.lines.push([map(a), map(b)]); }
    if (kind === 'c') { const c = ed.circles[i]; ed.circles.push({ c: map(c.c), r: c.r }); cons(ed, 'equal_radius', [i, ed.circles.length - 1]); }
    if (kind === 'a') { const a = ed.arcs[i]; A.set(i, ed.arcs.length); ed.arcs.push(flip ? { c: map(a.c), a: map(a.b), b: map(a.a) } : { c: map(a.c), a: map(a.a), b: map(a.b) }); }
  }
  // Boucles entièrement choisies : recopiées (à l'envers si l'orientation est inversée).
  const hasLine = (p, q) => ed.lines.some(([a, b], k) => L.has(k) && ((a === p && b === q) || (a === q && b === p)));
  for (const l of [...ed.loops]) {
    const arcsOk = l.every((it) => typeof it === 'number' || A.has(it.a ?? it.r));
    const seq = loopPoints(ed, l);
    const linesOk = l.every((it, k) => {
      const next = l[(k + 1) % l.length];
      if (typeof it !== 'number' || typeof next !== 'number') return true;
      return hasLine(it, next);
    });
    if (!arcsOk || !linesOk || !seq.length) continue;
    const img = l.map((it) => (typeof it === 'number' ? map(it) : it.a != null ? { a: A.get(it.a) } : { r: A.get(it.r) }));
    ed.loops.push(flip ? img.reverse() : img);
  }
}

// Symétrie par rapport à la ligne `axis` : les points sur l'axe restent eux-mêmes.
export function mirror(ed, items, axis) {
  const [ia, ib] = ed.lines[axis], A = ed.pts[ia], B = ed.pts[ib];
  const dx = B.x - A.x, dy = B.y - A.y, L2 = dx * dx + dy * dy;
  if (L2 < 1e-12) return 'Symétrie : axe nul.';
  const m = new Map();
  for (const p of usedPoints(ed, items)) {
    const P = ed.pts[p], t = ((P.x - A.x) * dx + (P.y - A.y) * dy) / L2, fx = A.x + t * dx, fy = A.y + t * dy;
    if (Math.hypot(P.x - fx, P.y - fy) < 1e-6 || p === ia || p === ib) { m.set(p, p); continue; }
    ed.pts.push({ x: 2 * fx - P.x, y: 2 * fy - P.y, fixed: false });
    m.set(p, ed.pts.length - 1);
    cons(ed, 'symmetric', [p, ed.pts.length - 1, axis]);
  }
  copy(ed, items, (p) => m.get(p), true);
  return null;
}

// Réseau rectangulaire : n exemplaires (original compris) espacés de d le long de x (plan).
export function patternX(ed, items, n, d) {
  if (!(n >= 2)) return 'Réseau : au moins deux exemplaires.';
  const pts = usedPoints(ed, items);
  for (let k = 1; k < n; k++) {
    const m = new Map();
    for (const p of pts) {
      const P = ed.pts[p]; ed.pts.push({ x: P.x + k * d, y: P.y, fixed: false });
      const q = ed.pts.length - 1; m.set(p, q);
      cons(ed, 'hdistance', [p, q], k * d); cons(ed, 'vdistance', [p, q], 0);
    }
    copy(ed, items, (p) => m.get(p), false);
  }
  return null;
}
