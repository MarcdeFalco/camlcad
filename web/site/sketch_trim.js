// Ajuster (Black Book ch. 2, Trim) : un clic sur une ligne retire le morceau compris entre les
// intersections voisines du clic (ou toute la ligne s'il n'y en a pas). Les lignes coupées
// sont scindées au point d'intersection, qui devient un sommet commun : deux rectangles qui se
// chevauchent donnent, après ajustement des morceaux intérieurs, un seul contour.
// Prolonger (Extend) : l'extrémité libre la plus proche du clic va jusqu'à la première ligne
// rencontrée. Couper (Break) : la ligne cliquée et celle qui la croise sont scindées au point
// d'intersection le plus proche du clic. Lignes seulement (cercles et arcs : pas encore).
import { deleteSelection } from './sketch_delete.js';
import { SketchMarks } from './sketch_marks.js';

const EPS = 1e-6;
const KEEP_DUP = new Set(['horizontal', 'vertical']); // recopiées sur le nouveau morceau
const DROP = new Set(['length', 'equal_length', 'midpoint']); // n'ont plus de sens sur un morceau
const key = (a, b) => (a < b ? `${a},${b}` : `${b},${a}`);
// La contrainte c porte-t-elle sur la ligne j ?
const onLine = (c, j) => c.refs.some((r, k) => r === j && SketchMarks.REFS[c.kind]?.[k] === 'l');

// Intersection des segments [P,Q] et [A,B] : paramètres t (sur PQ) et s (sur AB), ou null.
function cross(P, Q, A, B) {
  const r = { x: Q.x - P.x, y: Q.y - P.y }, u = { x: B.x - A.x, y: B.y - A.y };
  const den = r.x * u.y - r.y * u.x;
  if (Math.abs(den) < 1e-12) return null;
  const w = { x: A.x - P.x, y: A.y - P.y };
  const t = (w.x * u.y - w.y * u.x) / den, s = (w.x * r.y - w.y * r.x) / den;
  return t > EPS && t < 1 - EPS && s > -EPS && s < 1 + EPS ? { t, s } : null;
}

// La ligne j devient [a, n] et une nouvelle ligne [n, b] ; contraintes réparties.
function split(ed, j, n) {
  const [a, b] = ed.lines[j], j2 = ed.lines.length;
  ed.lines[j] = [a, n]; ed.lines.push([n, b]);
  let oriented = false;
  ed.cons = ed.cons.filter((c) => !(DROP.has(c.kind) && onLine(c, j)));
  for (const c of [...ed.cons]) if (KEEP_DUP.has(c.kind) && c.refs[0] === j) { ed.cons.push({ kind: c.kind, refs: [j2] }); oriented = true; }
  if (!oriented) ed.cons.push({ kind: 'parallel', refs: [j, j2] }); // sommet commun + parallèles : alignées
  return j2;
}

// Ligne la plus proche du clic (sous la tolérance) et paramètre du clic sur elle.
function nearestLine(ed, q) {
  let li = -1, best = ed.tol(), tc = 0;
  ed.lines.forEach(([a, b], i) => {
    const A = ed.pts[a], B = ed.pts[b], dx = B.x - A.x, dy = B.y - A.y, L2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((q.x - A.x) * dx + (q.y - A.y) * dy) / L2));
    const d = Math.hypot(A.x + t * dx - q.x, A.y + t * dy - q.y);
    if (d < best) { best = d; li = i; tc = t; }
  });
  return { li, tc };
}
const degree = (ed, p) => ed.lines.filter((l) => l.includes(p)).length;

// Prolonger : l'extrémité (libre) du côté du clic glisse jusqu'à la première ligne sur son
// chemin, et y reste (contrainte « sur la ligne »).
export function extendAt(ed, q) {
  const { li, tc } = nearestLine(ed, q);
  if (li < 0) return false;
  const [a, b] = ed.lines[li], [e, o] = tc > 0.5 ? [b, a] : [a, b];
  if (degree(ed, e) > 1 || ed.pts[e].fixed) return false;
  const O = ed.pts[o], E = ed.pts[e], far = { x: O.x + (E.x - O.x) * 1e4, y: O.y + (E.y - O.y) * 1e4 };
  let hit = null;
  ed.lines.forEach(([c, d], j) => {
    if (j === li) return;
    const x = cross(O, far, ed.pts[c], ed.pts[d]);
    if (x && x.t > 1e-4 * (1 + 1e-6) && (!hit || x.t < hit.t)) hit = { ...x, j };
  });
  if (!hit) return false;
  E.x = O.x + hit.t * (far.x - O.x); E.y = O.y + hit.t * (far.y - O.y);
  ed.cons = ed.cons.filter((c) => !(DROP.has(c.kind) && onLine(c, li)));
  ed.cons.push({ kind: 'on_line', refs: [e, hit.j] });
  return true;
}

// Couper : la ligne cliquée et la ligne qui la croise au plus près du clic sont scindées au
// point d'intersection, sommet commun.
export function breakAt(ed, q) {
  const { li, tc } = nearestLine(ed, q);
  if (li < 0) return false;
  const [p, r] = ed.lines[li], P = ed.pts[p], R = ed.pts[r];
  let hit = null;
  ed.lines.forEach(([a, b], j) => {
    if (j === li) return;
    const x = cross(P, R, ed.pts[a], ed.pts[b]);
    if (x && x.s > EPS && x.s < 1 - EPS && (!hit || Math.abs(x.t - tc) < Math.abs(hit.t - tc))) hit = { ...x, j };
  });
  if (!hit) return false;
  const n = ed.pts.push({ x: P.x + hit.t * (R.x - P.x), y: P.y + hit.t * (R.y - P.y), fixed: false }) - 1;
  const inLoop = (u, v) => ed.loops.some((l) => l.every((x) => typeof x === 'number') && l.some((x, k) => (x === u && l[(k + 1) % l.length] === v) || (x === v && l[(k + 1) % l.length] === u)));
  for (const j of [li, hit.j]) {
    const [u, v] = ed.lines[j], loopy = inLoop(u, v);
    split(ed, j, n);
    // Une boucle qui passait par [u, v] passe désormais par n.
    if (loopy) ed.loops = ed.loops.map((l) => { const k = l.findIndex((x, i) => (x === u && l[(i + 1) % l.length] === v) || (x === v && l[(i + 1) % l.length] === u)); return k < 0 ? l : [...l.slice(0, k + 1), n, ...l.slice(k + 1)]; });
  }
  return true;
}

// ed : SketchEditor ; q : clic (coordonnées du plan). true si l'esquisse a changé.
export function trimAt(ed, q) {
  const { li, tc } = nearestLine(ed, q);
  if (li < 0) return false;
  // Arêtes de profil (dans une boucle de lignes) avant l'opération.
  const profile = new Set();
  for (const l of ed.loops) if (l.every((x) => typeof x === 'number')) l.forEach((p, k) => profile.add(key(p, l[(k + 1) % l.length])));
  // Arêtes de profil d'un contour ouvert par un ajustement précédent (pas encore refermé).
  for (const k of ed.openProfile ?? []) if (ed.lines.some(([a, b]) => key(a, b) === k)) profile.add(k);
  const [p, q2] = ed.lines[li], P = ed.pts[p], Q = ed.pts[q2];
  const hits = [];
  ed.lines.forEach(([a, b], j) => { if (j !== li) { const x = cross(P, Q, ed.pts[a], ed.pts[b]); if (x) hits.push({ ...x, j }); } });
  const lo = hits.filter((h) => h.t < tc).sort((x, y) => y.t - x.t)[0], hi = hits.filter((h) => h.t > tc).sort((x, y) => x.t - y.t)[0];
  const wasProfile = profile.has(key(p, q2));
  // Sommet à l'intersection : extrémité de l'autre ligne si elle y aboutit, sinon nouveau point qui la scinde.
  const vertex = (h) => {
    const [a, b] = ed.lines[h.j];
    if (h.s < EPS) return a;
    if (h.s > 1 - EPS) return b;
    const n = ed.pts.push({ x: P.x + h.t * (Q.x - P.x), y: P.y + h.t * (Q.y - P.y), fixed: false }) - 1;
    const prof = profile.has(key(a, b));
    split(ed, h.j, n);
    if (prof) { profile.add(key(a, n)); profile.add(key(n, b)); }
    return n;
  };
  const n1 = lo ? vertex(lo) : null, n2 = hi ? vertex(hi) : null;
  const pieces = [];
  if (n1 != null) pieces.push([p, n1]);
  if (n2 != null) pieces.push([n2, q2]);
  ed.cons = ed.cons.filter((c) => !(DROP.has(c.kind) && onLine(c, li)));
  if (!pieces.length) {
    ed.sel = [{ kind: 'l', i: li }];
  } else {
    ed.lines[li] = pieces[0];
    if (pieces.length === 2) {
      const l2 = ed.lines.push(pieces[1]) - 1;
      let oriented = false;
      for (const c of [...ed.cons]) if (KEEP_DUP.has(c.kind) && c.refs[0] === li) { ed.cons.push({ kind: c.kind, refs: [l2] }); oriented = true; }
      if (!oriented) ed.cons.push({ kind: 'parallel', refs: [li, l2] });
      ed.cons.push({ kind: 'on_line', refs: [n2, li] }); // les deux morceaux restent alignés
    }
    if (wasProfile) pieces.forEach(([a, b]) => profile.add(key(a, b)));
    // Extrémité retirée : supprimée si plus rien ne s'y appuie.
    const used = (x) => ed.lines.some((l) => l.includes(x)) || ed.circles.some((c) => c.c === x) || ed.arcs.some((a) => [a.c, a.a, a.b].includes(x)) || (ed.ellipses ?? []).some((e) => e.c === x || e.a === x);
    ed.sel = [p, q2].filter((x) => !used(x)).map((i) => ({ kind: 'p', i }));
  }
  // Boucles de lignes recalculées sur les arêtes de profil (les boucles mixtes restent).
  const isProf = ed.lines.map(([a, b]) => profile.has(key(a, b)));
  ed.loops = ed.loops.filter((l) => !l.every((x) => typeof x === 'number'));
  if (ed.sel.length) {
    if (ed.sel[0].kind === 'l') isProf.splice(li, 1);
    deleteSelection(ed); // renumérote points, lignes, contraintes (ordre des lignes conservé)
  }
  const prof = ed.lines.filter((_, i) => isProf[i]), found = cycles(prof);
  ed.loops.push(...found);
  const closed = new Set(found.flatMap((l) => l.map((p, k) => key(p, l[(k + 1) % l.length]))));
  ed.openProfile = prof.map(([a, b]) => key(a, b)).filter((k) => !closed.has(k));
  ed.sel = [];
  return true;
}

// Composantes où chaque sommet a exactement deux arêtes : boucles, points dans l'ordre.
function cycles(lines) {
  const adj = new Map(), add = (a, b) => { if (!adj.has(a)) adj.set(a, []); adj.get(a).push(b); };
  for (const [a, b] of lines) { add(a, b); add(b, a); }
  const seen = new Set(), out = [];
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    const loop = [start]; let prev = null, cur = start, ok = true;
    seen.add(start);
    for (;;) {
      const nb = adj.get(cur);
      if (nb.length !== 2) ok = false;
      const next = nb.find((x) => x !== prev) ?? nb[0];
      if (next === start || next === undefined) break;
      if (seen.has(next)) { ok = false; break; }
      seen.add(next); loop.push(next); prev = cur; cur = next;
    }
    if (ok && loop.length >= 3 && loop.every((x) => adj.get(x).length === 2)) out.push(loop);
  }
  return out;
}
