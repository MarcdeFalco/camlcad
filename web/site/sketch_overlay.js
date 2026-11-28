// Esquisses terminées que rien n'utilise encore : dessinées dans la vue (comme Fusion montre
// une esquisse après « Terminer »), retirées dès qu'une feature les prend.
import * as THREE from 'three';

const shown = new Map(); // nom -> groupe three.js

// sk : données de fin d'esquisse (frame, lines [{a, b}], loops (contours échantillonnés), circles).
export function showSketch(scene, name, sk) {
  hideSketch(scene, name);
  const pts = [], dash = [], seg = (p, q, out = pts) => out.push(p.x, p.y, 0, q.x, q.y, 0);
  const k = (p) => `${Math.round(p.x * 100)},${Math.round(p.y * 100)}`, inLoop = new Set();
  for (const l of sk.loops ?? []) l.forEach((p, i) => { const q = l[(i + 1) % l.length]; seg(p, q); inLoop.add(`${k(p)}|${k(q)}`); inLoop.add(`${k(q)}|${k(p)}`); });
  // Lignes hors contour (construction, chemin d'un tuyau) : en pointillés.
  for (const { a, b } of sk.lines ?? []) if (!inLoop.has(`${k(a)}|${k(b)}`)) seg(a, b, dash);
  for (const c of sk.circles ?? []) for (let k = 0; k < 64; k++) {
    const t0 = (k / 64) * 2 * Math.PI, t1 = ((k + 1) / 64) * 2 * Math.PI;
    seg({ x: c.x + c.r * Math.cos(t0), y: c.y + c.r * Math.sin(t0) }, { x: c.x + c.r * Math.cos(t1), y: c.y + c.r * Math.sin(t1) });
  }
  const g = new THREE.Group(), geo = (a) => new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(a, 3));
  g.add(new THREE.LineSegments(geo(pts), new THREE.LineBasicMaterial({ color: 0x1f6feb, depthTest: false, transparent: true })));
  const d = new THREE.LineSegments(geo(dash), new THREE.LineDashedMaterial({ color: 0xe07b22, dashSize: 1.5, gapSize: 1, depthTest: false, transparent: true }));
  d.computeLineDistances(); g.add(d);
  const f = sk.frame; g.matrixAutoUpdate = false; g.matrix.makeBasis(f.x, f.y, f.z).setPosition(f.origin); g.renderOrder = 4; g.children.forEach((c) => { c.renderOrder = 4; });
  g.userData.sketch = name; scene.add(g); shown.set(name, g);
}
export function hideSketch(scene, name) {
  const g = shown.get(name); if (!g) return;
  scene.remove(g); g.children.forEach((c) => { c.geometry.dispose(); c.material.dispose(); }); shown.delete(name);
}
// Après chaque évaluation : retire les esquisses utilisées ou disparues du code.
export function refreshSketches(scene, code) {
  for (const name of [...shown.keys()]) if ((code.match(new RegExp(`\\b${name}\\b`, 'g')) ?? []).length !== 1) hideSketch(scene, name);
}
