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
  // Repère : z = normale, x = projection de l'axe x du monde (ou y si parallèle).
  let x = new THREE.Vector3(1, 0, 0);
  if (Math.abs(x.dot(n0)) > 0.9) x = new THREE.Vector3(0, 1, 0);
  x.addScaledVector(n0, -x.dot(n0)).normalize();
  const round = (v, k) => v.set(...v.toArray().map((c) => Math.round(c * k) / k + 0));
  // Origine : projection de l'origine du monde sur la face (cotes de l'esquisse dans le repère
  // de la pièce, comme dans un modeleur), sauf si elle tombe très loin de la face.
  const proj = n0.clone().multiplyScalar(d0), far = proj.distanceTo(centroid) > 10 * Math.sqrt(area);
  return { tris, frame: frameOf(round(far ? centroid : proj, 100), round(x, 1e6), round(n0.clone(), 1e6)), area };
}

function frameOf(origin, x, z) {
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
