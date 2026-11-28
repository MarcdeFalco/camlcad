// Nervure dans le plan de l'esquisse, jusqu'à la pièce (la nervure d'un modeleur) : la ligne
// tracée borde une région du plan fermée par la coupe de la pièce ; la nervure est cette
// région, épaissie de part et d'autre du plan. Géométrie seule (pas de DOM).
import * as THREE from 'three';

// Coupe de la pièce (maillage three.js) par le plan du repère f : segments en coordonnées du plan.
// Vide si le plan ne traverse pas la pièce (esquisse sur une face : pas de coupe).
export function section(part, f) {
  const g = part?.geometry, pos = g?.attributes?.position;
  if (!pos) return [];
  part.updateMatrixWorld?.();
  const idx = g.index ? g.index.array : null, n = idx ? idx.length : pos.count, segs = [];
  const P = (i) => new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(part.matrixWorld);
  let lo = 0, hi = 0;
  for (let i = 0; i < pos.count; i++) { const z = P(i).sub(f.origin).dot(f.z); lo = Math.min(lo, z); hi = Math.max(hi, z); }
  if (!(lo < -1e-6 && hi > 1e-6)) return [];
  const loc = (v) => { const d = v.clone().sub(f.origin); return { x: d.dot(f.x), y: d.dot(f.y) }; };
  for (let t = 0; t + 2 < n; t += 3) {
    const vs = [0, 1, 2].map((k) => P(idx ? idx[t + k] : t + k)), ds = vs.map((v) => v.clone().sub(f.origin).dot(f.z));
    const cut = [];
    for (let k = 0; k < 3; k++) {
      const a = ds[k], b = ds[(k + 1) % 3];
      if ((a < 0 && b > 0) || (a > 0 && b < 0)) cut.push(loc(vs[k].clone().lerp(vs[(k + 1) % 3], a / (a - b))));
      else if (Math.abs(a) < 1e-9) cut.push(loc(vs[k]));
    }
    const u = cut.filter((p, i) => cut.findIndex((q) => Math.hypot(p.x - q.x, p.y - q.y) < 1e-9) === i);
    if (u.length === 2) segs.push(u);
  }
  return segs;
}

// Distance au premier bord de la coupe le long du rayon O + s n (s > 0), ou Infinity.
function hit(segs, O, n) {
  let best = Infinity;
  for (const [P, Q] of segs) {
    const e = { x: Q.x - P.x, y: Q.y - P.y }, den = n.x * e.y - n.y * e.x;
    if (Math.abs(den) < 1e-12) continue;
    const w = { x: P.x - O.x, y: P.y - O.y }, s = (w.x * e.y - w.y * e.x) / den, u = (w.x * n.y - w.y * n.x) / den;
    if (s > 1e-7 && u >= -1e-9 && u <= 1 + 1e-9 && s < best) best = s;
  }
  return best;
}

// Région balayée depuis la ligne AB, perpendiculairement, du côté side (+1 / -1 : normale à
// gauche / à droite de AB) jusqu'au bord de la coupe. Rend le contour (sens direct) ou null
// si un rayon ne rencontre rien (région ouverte). Exact : entre deux sommets de la coupe
// projetés sur AB, la distance au bord varie linéairement.
export function sweptRegion(segs, A, B, side) {
  const d = { x: B.x - A.x, y: B.y - A.y }, L2 = d.x * d.x + d.y * d.y;
  if (L2 < 1e-12 || !segs.length) return null;
  const L = Math.sqrt(L2), n = { x: (-side * d.y) / L, y: (side * d.x) / L }, eps = 1e-6;
  const ts = new Set([eps, 1 - eps]);
  for (const s of segs) for (const V of s) {
    const t = ((V.x - A.x) * d.x + (V.y - A.y) * d.y) / L2;
    for (const u of [t - eps, t + eps]) if (u > eps && u < 1 - eps) ts.add(u);
  }
  const back = [];
  for (const t of [...ts].sort((a, b) => b - a)) {
    const O = { x: A.x + t * d.x, y: A.y + t * d.y }, s = hit(segs, O, n);
    if (!Number.isFinite(s)) return null;
    back.push({ x: O.x + s * n.x, y: O.y + s * n.y });
  }
  return simplify([A, B, ...back]);
}

// Contour arrondi au centième (comme le code écrit), sans doublons ni sommets alignés.
function simplify(ps) {
  let out = ps.map((p) => ({ x: Math.round(p.x * 100) / 100 + 0, y: Math.round(p.y * 100) / 100 + 0 }));
  for (let changed = true; changed && out.length >= 3;) {
    changed = false;
    for (let i = 0; i < out.length && out.length >= 3; i++) {
      const a = out[(i + out.length - 1) % out.length], b = out[i], c = out[(i + 1) % out.length];
      const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x), same = Math.hypot(b.x - a.x, b.y - a.y) < 1e-6;
      if (same || Math.abs(cross) < 1e-6 * Math.max(1, Math.hypot(c.x - a.x, c.y - a.y))) { out.splice(i, 1); changed = true; i--; }
    }
  }
  if (out.length < 3) return null;
  const area = out.reduce((a, p, i) => { const q = out[(i + 1) % out.length]; return a + p.x * q.y - q.x * p.y; }, 0);
  return area < 0 ? out.reverse() : out; // sens direct, comme Profile.polygon l'attend
}

// Côté de la pièce pour la ligne AB : celui où le rayon du milieu rencontre la coupe le plus tôt.
export function ribSide(segs, A, B) {
  const M = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 }, d = { x: B.x - A.x, y: B.y - A.y }, L = Math.hypot(d.x, d.y) || 1;
  const s = (side) => hit(segs, M, { x: (-side * d.y) / L, y: (side * d.x) / L });
  return s(1) <= s(-1) ? 1 : -1;
}
