// Poignée de distance dans la vue (le « manipulateur » flèche d'un modeleur) : une flèche
// le long d'un axe, que l'on tire à la souris ; onChange(distance) à chaque mouvement.
import * as THREE from 'three';

export function distanceHandle(vp, { origin, dir, value, onChange }) {
  const d = dir.clone().normalize(), group = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1, 12), new THREE.MeshBasicMaterial({ color: 0x1f6feb, depthTest: false, transparent: true }));
  const head = new THREE.Mesh(new THREE.ConeGeometry(1.6, 4, 16), new THREE.MeshBasicMaterial({ color: 0x1f6feb, depthTest: false, transparent: true }));
  shaft.renderOrder = head.renderOrder = 7; group.add(shaft, head);
  vp.scene.add(group);
  let v = value, drag = null;
  const place = () => {
    const L = Math.max(Math.abs(v), 0.01), s = Math.sign(v) || 1;
    group.position.copy(origin); group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().multiplyScalar(s));
    shaft.scale.set(1, L, 1); shaft.position.set(0, L / 2, 0); head.position.set(0, L + 2, 0);
  };
  // Paramètre sur l'axe du point le plus proche du rayon de la souris.
  const along = (e) => {
    const r = vp.ray(e).ray, w0 = r.origin.clone().sub(origin), b = r.direction.dot(d), den = 1 - b * b;
    if (den < 1e-6) return null;
    return (w0.dot(d) - b * w0.dot(r.direction)) / den;
  };
  const canvas = vp.renderer.domElement;
  const down = (e) => {
    if (e.button !== 0) return;
    group.updateMatrixWorld(true);
    if (!vp.ray(e).intersectObject(group, true).length) return;
    e.stopImmediatePropagation(); e.preventDefault();
    drag = { t0: along(e), v0: v }; vp.controls.enabled = false; canvas.setPointerCapture?.(e.pointerId);
  };
  const move = (e) => {
    if (!drag) return;
    const t = along(e); if (t == null || drag.t0 == null) return;
    v = Math.round((drag.v0 + (t - drag.t0)) * 2) / 2; place(); onChange(v);
  };
  const up = () => { if (drag) { drag = null; vp.controls.enabled = true; } };
  canvas.addEventListener('pointerdown', down, true); canvas.addEventListener('pointermove', move, true); addEventListener('pointerup', up, true);
  place();
  return {
    set(x) { v = x; place(); },
    // Position de la pointe à l'écran (aide aux scénarios et à l'aide contextuelle).
    tip() { group.updateMatrixWorld(true); return head.getWorldPosition(new THREE.Vector3()); },
    dispose() {
      canvas.removeEventListener('pointerdown', down, true); canvas.removeEventListener('pointermove', move, true); removeEventListener('pointerup', up, true);
      vp.scene.remove(group); group.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); }); vp.controls.enabled = true;
    },
  };
}
