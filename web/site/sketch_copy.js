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
    if (kind === 'l') {
      const [a, b] = ed.lines[i], k = (u, v) => (u < v ? `${u},${v}` : `${v},${u}`);
      L.set(i, ed.lines.length); ed.lines.push([map(a), map(b)]);
      if (ed.openProfile?.includes(k(a, b))) ed.openProfile = [...ed.openProfile, k(map(a), map(b))]; // une ligne de profil reste du profil
    }
    if (kind === 'c') { const c = ed.circles[i]; ed.circles.push({ c: map(c.c), r: c.r }); cons(ed, 'equal_radius', [i, ed.circles.length - 1]); }
    if (kind === 'a') { const a = ed.arcs[i]; A.set(i, ed.arcs.length); ed.arcs.push(flip ? { c: map(a.c), a: map(a.b), b: map(a.a) } : { c: map(a.c), a: map(a.a), b: map(a.b) }); if (ed.openArcs?.has(i)) ed.openArcs.add(ed.arcs.length - 1); }
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
    // Image confondue avec un point existant (coin d'un rectangle) : ce point, pas un doublon,
    // pour que les lignes copiées se raccordent et ferment le contour.
    const X = 2 * fx - P.x, Y = 2 * fy - P.y, j = ed.pts.findIndex((o) => Math.hypot(o.x - X, o.y - Y) < 1e-3);
    if (j < 0) ed.pts.push({ x: X, y: Y, fixed: false });
    m.set(p, j < 0 ? ed.pts.length - 1 : j);
    cons(ed, 'symmetric', [p, m.get(p), axis]);
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

// Décalage (Offset) d'un contour de lignes : nouveau contour aux côtés parallèles, à la distance
// d (> 0 : vers l'intérieur). Dans une boucle, le contour intérieur est un trou (paroi d'épaisseur d).
export function offsetLoop(ed, line, d) {
  const loop = ed.loops.find((l) => l.every((it) => typeof it === 'number') && l.some((p, k) => { const q = l[(k + 1) % l.length]; const [a, b] = ed.lines[line]; return (p === a && q === b) || (p === b && q === a); }));
  if (!loop) return 'Décalage : cliquez une ligne d’un contour fermé fait de lignes.';
  const n = loop.length, P = loop.map((i) => ed.pts[i]);
  const area = P.reduce((s, p, k) => s + p.x * P[(k + 1) % n].y - P[(k + 1) % n].x * p.y, 0);
  const sgn = area > 0 ? 1 : -1; // normale intérieure : à gauche si le contour tourne dans le sens direct
  const edges = loop.map((p, k) => {
    const q = loop[(k + 1) % n], li = ed.lines.findIndex(([a, b]) => (a === p && b === q) || (a === q && b === p));
    const A = ed.pts[p], B = ed.pts[q], L = Math.hypot(B.x - A.x, B.y - A.y) || 1;
    return { li, nx: (-sgn * (B.y - A.y)) / L, ny: (sgn * (B.x - A.x)) / L };
  });
  if (edges.some((e) => e.li < 0)) return 'Décalage : contour sans ses lignes.';
  const q = loop.map((p, k) => {
    const e0 = edges[(k - 1 + n) % n], e1 = edges[k], c = 1 + e0.nx * e1.nx + e0.ny * e1.ny;
    ed.pts.push({ x: P[k].x + (d * (e0.nx + e1.nx)) / c, y: P[k].y + (d * (e0.ny + e1.ny)) / c, fixed: false });
    return ed.pts.length - 1;
  });
  const l0 = ed.lines.length;
  q.forEach((p, k) => ed.lines.push([p, q[(k + 1) % n]]));
  edges.forEach((e, k) => { cons(ed, 'parallel', [l0 + k, e.li]); cons(ed, 'point_line_distance', [q[k], e.li], Math.abs(d)); });
  ed.loops.push(q);
  return null;
}

// Réseau circulaire autour du point `center` : n exemplaires (original compris) sur l'angle
// total `total` (360 : tour complet). Chaque point copié est à la même distance du centre que
// son original (rayons de construction de même longueur) et tourné de k × pas (angle orienté).
export function patternCirc(ed, items, center, n, total = 360) {
  if (!(n >= 2)) return 'Réseau : au moins deux exemplaires.';
  const step = total >= 360 ? 360 / n : total / (n - 1), C = ed.pts[center];
  const pts = usedPoints(ed, items).filter((p) => p !== center);
  const rad = new Map(pts.map((p) => { ed.lines.push([center, p]); return [p, ed.lines.length - 1]; }));
  for (let k = 1; k < n; k++) {
    const m = new Map([[center, center]]), a = (k * step * Math.PI) / 180;
    for (const p of pts) {
      const P = ed.pts[p], dx = P.x - C.x, dy = P.y - C.y;
      ed.pts.push({ x: C.x + dx * Math.cos(a) - dy * Math.sin(a), y: C.y + dx * Math.sin(a) + dy * Math.cos(a), fixed: false });
      const q = ed.pts.length - 1; m.set(p, q);
      ed.lines.push([center, q]); const lq = ed.lines.length - 1;
      cons(ed, 'equal_length', [rad.get(p), lq]); cons(ed, 'angle', [rad.get(p), lq], ((k * step + 180) % 360) - 180);
    }
    copy(ed, items, (p) => m.get(p), false);
  }
  return null;
}

// Projeter (Black Book ch. 3, Project) : le contour de la face d'appui (ed.faceLoops) devient
// des points fixes et des lignes de construction, pour s'y accrocher.
export function projectFace(ed) {
  if (!ed.faceLoops) return false;
  for (const l of ed.faceLoops) {
    const first = ed.pts.length;
    l.forEach((p) => ed.pts.push({ x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100, fixed: true }));
    l.forEach((_, k) => ed.lines.push([first + k, first + ((k + 1) % l.length)]));
  }
  ed.faceLoops = null;
  return true;
}

// Échelle d'esquisse (ch. 2, Sketch Scale) : tout est multiplié par k depuis l'origine du plan,
// cotes comprises (les angles restent).
export function scaleSketch(ed, k) {
  for (const p of ed.pts) { p.x *= k; p.y *= k; }
  for (const c of ed.circles) c.r *= k;
  const LEN = ['length', 'distance', 'hdistance', 'vdistance', 'radius', 'arc_radius', 'point_line_distance'];
  for (const c of ed.cons) if (c.value != null && LEN.includes(c.kind)) c.value *= k;
}
