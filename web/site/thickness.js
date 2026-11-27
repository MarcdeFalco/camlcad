// Analyse d'épaisseur (Black Book ch. 8, Inspect ; utile à l'impression 3D) : pour chaque
// triangle, distance à la paroi opposée le long de la normale rentrante ; rouge sous le seuil
// (parois trop fines pour la buse), jaune sous le double, gris au-delà. Épaisseur mini affichée.
import * as THREE from 'three';
import { el, fmt } from './timeline.js';
import { num, row } from './dialogs.js';

// Épaisseur locale de chaque triangle (Infinity si le rayon ne ressort pas : surface ouverte).
export function thicknesses(mesh) {
  const ray = new THREE.Raycaster(), g = mesh.geometry, p = g.attributes.position, n = p.count / 3, out = new Float32Array(n);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  mesh.material.side = THREE.DoubleSide;
  for (let t = 0; t < n; t++) {
    a.fromBufferAttribute(p, 3 * t); b.fromBufferAttribute(p, 3 * t + 1); c.fromBufferAttribute(p, 3 * t + 2);
    const nrm = b.clone().sub(a).cross(c.clone().sub(a)).normalize().negate(), o = a.clone().add(b).add(c).multiplyScalar(1 / 3);
    ray.set(o.addScaledVector(nrm, 1e-4), nrm);
    const hit = ray.intersectObject(mesh, false).find((h) => h.faceIndex !== t && h.distance > 1e-3);
    out[t] = hit ? hit.distance : Infinity;
  }
  return out;
}

export function thicknessDialog(d, vp) {
  const part = vp.part;
  if (!part) { d.ctx.notify('Pas de pièce à analyser.', true); return; }
  const P = { min: 1.2 }, info = el('div', { id: 'thickness-info', className: 'hint' });
  const probe = new THREE.Mesh(part.geometry, new THREE.MeshBasicMaterial());
  const th = thicknesses(probe), area = new Float32Array(th.length), p = part.geometry.attributes.position;
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
  for (let t = 0; t < th.length; t++) { A.fromBufferAttribute(p, 3 * t); B.fromBufferAttribute(p, 3 * t + 1); C.fromBufferAttribute(p, 3 * t + 2); area[t] = B.sub(A).cross(C.sub(A)).length() / 2; }
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.6 });
  const paint = () => {
    const col = new Float32Array(p.count * 3);
    let thin = 0, total = 0, lo = Infinity;
    th.forEach((v, t) => {
      lo = Math.min(lo, v); total += area[t]; if (v < P.min) thin += area[t];
      const rgb = v < P.min ? [0.85, 0.25, 0.2] : v < 2 * P.min ? [0.95, 0.8, 0.2] : [0.6, 0.65, 0.7];
      for (let k = 0; k < 3; k++) col.set(rgb, 3 * (3 * t + k));
    });
    part.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
    part.material = mat;
    info.textContent = `Épaisseur minimale : ${fmt(Math.round(lo * 100) / 100)} mm · sous ${fmt(P.min)} mm : ${fmt(Math.round((100 * thin) / total))} % de la surface`;
  };
  d.open('ÉPAISSEUR', [
    row('Seuil', num(P.min, (v) => { if (v > 0) { P.min = v; paint(); } }, { min: 0 }), el('span', { className: 'unit', textContent: 'mm' })),
    el('div', { className: 'hint', textContent: 'Rouge : plus fin que le seuil (≈ 2 largeurs de buse) ; jaune : moins du double.' }),
    info,
  ], { key: 'thickness', okLabel: 'Fermer', cancel: false });
  d.ctx.onCloseExtra = () => { part.material = vp.material; part.geometry.deleteAttribute('color'); mat.dispose(); };
  paint();
}
