// Faces planes de la pièce et plans d'origine : repères d'esquisse et leur code.
import * as THREE from 'three';

const fmt = (x) => Number((Math.round(x * 100) / 100).toFixed(2)).toString();
const lit = (x) => { const s = fmt(x === 0 ? 0 : x); return (s.includes('.') ? s : s + '.') ; };
const litp = (x) => (x < 0 ? `(${lit(x)})` : lit(x));
const v3 = (v) => `(Geom.V3.v ${litp(v.x)} ${litp(v.y)} ${litp(v.z)})`;

// ---------- Faces planes ----------
// Triangles coplanaires connexes au triangle touché (arêtes partagées).
export function planarFace(mesh, tri) {
  const V = mesh.vertices, T = mesh.triangles, nt = T.length / 3;
  const p = (i) => new THREE.Vector3(V[3 * i], V[3 * i + 1], V[3 * i + 2]);
  const normal = (t) => {
    const a = p(T[3 * t]), b = p(T[3 * t + 1]), c = p(T[3 * t + 2]);
    return { n: b.clone().sub(a).cross(c.clone().sub(a)), a };
  };
  if (!mesh.edges) {
    mesh.edges = new Map();
    for (let t = 0; t < nt; t++) for (let k = 0; k < 3; k++) {
      const i = T[3 * t + k], j = T[3 * t + ((k + 1) % 3)];
      const key = i < j ? `${i},${j}` : `${j},${i}`;
      (mesh.edges.get(key) || mesh.edges.set(key, []).get(key)).push(t);
    }
  }
  const { n: n0raw, a: a0 } = normal(tri);
  const n0 = n0raw.clone().normalize(), d0 = n0.dot(a0);
  const seen = new Set([tri]), stack = [tri], tris = [];
  let area = 0; const centroid = new THREE.Vector3();
  while (stack.length) {
    const t = stack.pop(); tris.push(t);
    const { n } = normal(t), ar = n.length() / 2;
    const c = p(T[3 * t]).add(p(T[3 * t + 1])).add(p(T[3 * t + 2])).multiplyScalar(1 / 3);
    centroid.addScaledVector(c, ar); area += ar;
    for (let k = 0; k < 3; k++) {
      const i = T[3 * t + k], j = T[3 * t + ((k + 1) % 3)];
      for (const u of mesh.edges.get(i < j ? `${i},${j}` : `${j},${i}`)) {
        if (seen.has(u)) continue;
        const { n, a } = normal(u);
        if (n.length() < 1e-12) continue;
        if (n.clone().normalize().dot(n0) > 1 - 1e-6 && Math.abs(n0.dot(a) - d0) < 1e-4) { seen.add(u); stack.push(u); }
      }
    }
  }
  centroid.multiplyScalar(1 / area);
  // Repère : z = normale ; face couchée : x = projection de l'axe x du monde ; face debout :
  // y = verticale du monde (l'esquisse n'est pas à l'envers, comme dans un modeleur), x = y ∧ z.
  let x = new THREE.Vector3(1, 0, 0);
  if (Math.abs(n0.z) < 0.9) x = new THREE.Vector3(0, 0, 1).addScaledVector(n0, -n0.z).normalize().cross(n0);
  x.addScaledVector(n0, -x.dot(n0)).normalize();
  const round = (v, k) => v.set(...v.toArray().map((c) => Math.round(c * k) / k + 0));
  // Origine : projection de l'origine du monde sur la face (cotes de l'esquisse dans le repère
  // de la pièce, comme dans un modeleur), sauf si elle tombe très loin de la face.
  const proj = n0.clone().multiplyScalar(d0), far = proj.distanceTo(centroid) > 10 * Math.sqrt(area);
  return { tris, frame: frameOf(round(far ? centroid : proj, 100), round(x, 1e6), round(n0.clone(), 1e6)), area };
}

export function frameOf(origin, x, z) {
  const y = z.clone().cross(x);
  return { origin, x, y, z };
}

export const basePlanes = {
  XY: { frame: frameOf(new THREE.Vector3(), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1)), code: 'Geom.Plane.xy' },
  YZ: { frame: frameOf(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)), code: 'Geom.Plane.yz' },
  // Vu de face comme dans un modeleur : x = X, y = Z (Geom.Plane.xz).
  XZ: { frame: frameOf(new THREE.Vector3(), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, -1, 0)), code: 'Geom.Plane.xz' },
};
export const frameCode = (f) => `Geom.Frame.make ~origin:${v3(f.origin)} ~x:${v3(f.x)} ~z:${v3(f.z)}`;

// Repère à partir de neuf nombres (origine, x, z), comme « Geom.Frame.make » littéral.
export const frameFromNumbers = (n) => frameOf(new THREE.Vector3(n[0], n[1], n[2]), new THREE.Vector3(n[3], n[4], n[5]), new THREE.Vector3(n[6], n[7], n[8]));

// Contours d'une face plane (planarFace) dans son repère : arêtes vues une seule fois,
// chaînées en boucles ; la plus grande d'abord (contour extérieur), puis les trous.
export function faceLoops(mesh, face) {
  const V = mesh.vertices, T = mesh.triangles, count = new Map();
  const key = (i, j) => (i < j ? `${i},${j}` : `${j},${i}`);
  for (const t of face.tris) for (let k = 0; k < 3; k++) {
    const i = T[3 * t + k], j = T[3 * t + ((k + 1) % 3)], kk = key(i, j);
    count.set(kk, count.has(kk) ? null : [i, j]);
  }
  const next = new Map();
  for (const e of count.values()) if (e) next.set(e[0], e[1]);
  const f = face.frame, loops = [];
  // Sommets confondus (maillage indexé par Manifold : normalement uniques) : on suit next.
  const seen = new Set();
  for (const start of next.keys()) {
    if (seen.has(start)) continue;
    const loop = []; let i = start;
    while (i != null && !seen.has(i)) { seen.add(i); const p = new THREE.Vector3(V[3 * i], V[3 * i + 1], V[3 * i + 2]).sub(f.origin); loop.push({ x: p.dot(f.x), y: p.dot(f.y) }); i = next.get(i); }
    if (loop.length >= 3) loops.push(loop);
  }
  const area = (l) => Math.abs(l.reduce((s, p, k) => s + p.x * l[(k + 1) % l.length].y - l[(k + 1) % l.length].x * p.y, 0)) / 2;
  return loops.sort((a, b) => area(b) - area(a));
}

// Sommets de la pièce projetés sur le plan d'esquisse (repère f), sans doublons : ils
// accrochent le curseur comme les arêtes projetées d'un modeleur (esquisse sur un plan milieu).
export function modelPoints(mesh, f) {
  const V = mesh?.vertices; if (!V || V.length > 3 * 20000) return [];
  const seen = new Set(), out = [];
  for (let i = 0; i < V.length; i += 3) {
    const dx = V[i] - f.origin.x, dy = V[i + 1] - f.origin.y, dz = V[i + 2] - f.origin.z;
    const x = Math.round((dx * f.x.x + dy * f.x.y + dz * f.x.z) * 100) / 100, y = Math.round((dx * f.y.x + dy * f.y.y + dz * f.y.z) * 100) / 100, k = `${x},${y}`;
    if (!seen.has(k)) { seen.add(k); out.push({ x, y }); }
  }
  return out;
}
