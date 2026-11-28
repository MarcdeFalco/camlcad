// Points d'intérêt où le curseur s'accroche en esquisse, comme dans un modeleur : origine du
// plan, milieux de lignes, intersections de deux courbes (lignes, cercles, arcs), sommets de
// la face d'appui ou de la pièce projetée. Les points existants (extrémités, centres) passent
// avant ; les points quelconques sur une courbe viennent après (inferPoint). Le point posé
// garde le lien : fixe à l'origine, milieu de la ligne, « sur la ligne » ou « sur le cercle »
// de chaque courbe à une intersection.
import { faceVertex } from './sketch_tools.js';
import { arcGeo, circleTs, ccwd, TAU } from './sketch_trim.js';

const onArc = (g, X) => { const t = ccwd(Math.atan2(X.y - g.C.y, X.x - g.C.x) - g.ta); return t <= g.span + 1e-6 || t > TAU - 1e-6; };
function circles2(C, r, D, s) {
  const dx = D.x - C.x, dy = D.y - C.y, d = Math.hypot(dx, dy);
  if (d < 1e-9 || d > r + s || d < Math.abs(r - s)) return [];
  const a = (r * r - s * s + d * d) / (2 * d), h = Math.sqrt(Math.max(0, r * r - a * a)), mx = C.x + (a * dx) / d, my = C.y + (a * dy) / d;
  return [-1, 1].map((g) => ({ x: mx - (g * h * dy) / d, y: my + (g * h * dx) / d }));
}

// Accroche sous le curseur q (coordonnées du plan) : { x, y, kind, cons } ou null.
// kind : 'origin' | 'inter' | 'mid' | 'face' ; cons : contraintes [kind, courbe] du point posé.
export function snapPoint(ed, q) {
  if (!q) return null;
  const t = ed.tol(), P = (i) => ed.pts[i], hits = [];
  const consider = (X, kind, cons = []) => { const d = Math.hypot(X.x - q.x, X.y - q.y); if (d < t) hits.push({ x: X.x, y: X.y, kind, cons, d }); };
  consider({ x: 0, y: 0 }, 'origin');
  const curves = [
    ...ed.lines.map(([a, b], i) => ({ l: i, A: P(a), B: P(b) })),
    ...ed.circles.map((c, i) => ({ c: i, C: P(c.c), r: c.r })),
    ...ed.arcs.map((_, k) => ({ k, g: arcGeo(ed, k) })),
  ];
  for (const u of curves) if (u.l != null) consider({ x: (u.A.x + u.B.x) / 2, y: (u.A.y + u.B.y) / 2 }, 'mid', [['midpoint', u.l]]); // milieu d'une ligne
  const tag = (u) => (u.l != null ? [['on_line', u.l]] : u.c != null ? [['on_circle', u.c]] : []);
  const circ = (u) => (u.c != null ? { C: u.C, r: u.r } : { C: u.g.C, r: u.g.r });
  const keep = (u, X) => u.k == null || onArc(u.g, X);
  for (let i = 0; i < curves.length; i++) for (let j = i + 1; j < curves.length; j++) {
    const u = curves[i], v = curves[j];
    let xs = [];
    if (u.l != null && v.l != null) {
      const r = { x: u.B.x - u.A.x, y: u.B.y - u.A.y }, s = { x: v.B.x - v.A.x, y: v.B.y - v.A.y }, den = r.x * s.y - r.y * s.x;
      if (Math.abs(den) < 1e-12) continue;
      const w = { x: v.A.x - u.A.x, y: v.A.y - u.A.y }, a = (w.x * s.y - w.y * s.x) / den, b = (w.x * r.y - w.y * r.x) / den;
      if (a > 1e-6 && a < 1 - 1e-6 && b > 1e-6 && b < 1 - 1e-6) xs = [{ x: u.A.x + a * r.x, y: u.A.y + a * r.y }]; // croisement, pas un sommet commun
    } else if (u.l != null || v.l != null) {
      const L = u.l != null ? u : v, K = u.l != null ? v : u, { C, r } = circ(K);
      xs = circleTs(L.A, L.B, C, r, 1e-6, 1 - 1e-6).map((s) => ({ x: L.A.x + s * (L.B.x - L.A.x), y: L.A.y + s * (L.B.y - L.A.y) })).filter((X) => keep(K, X));
    } else {
      const a = circ(u), b = circ(v);
      xs = circles2(a.C, a.r, b.C, b.r).filter((X) => keep(u, X) && keep(v, X));
    }
    for (const X of xs) consider(X, 'inter', [...tag(u), ...tag(v)]);
  }
  hits.sort((a, b) => a.d - b.d);
  if (hits.length) return hits[0];
  const f = faceVertex(ed, q);
  return f ? { ...f, kind: 'face', cons: [] } : null;
}
