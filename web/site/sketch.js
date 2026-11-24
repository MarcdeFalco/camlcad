// Choix d'une face plane et édition d'esquisse sur un plan.
// Le solveur est celui d'OCaml (worker, message "sketch") ; la validation
// insère dans le source un let%sketch suivi d'une extrusion ou d'une poche.
import * as THREE from 'three';

const $ = (id) => document.getElementById(id);
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
  return { tris, frame: frameOf(round(centroid, 100), round(x, 1e6), round(n0.clone(), 1e6)), area };
}

function frameOf(origin, x, z) {
  const y = z.clone().cross(x);
  return { origin, x, y, z };
}

export const basePlanes = {
  XY: { frame: frameOf(new THREE.Vector3(), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1)), code: 'Geom.Plane.xy' },
  YZ: { frame: frameOf(new THREE.Vector3(), new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0)), code: 'Geom.Plane.yz' },
  ZX: { frame: frameOf(new THREE.Vector3(), new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0)), code: 'Geom.Plane.zx' },
};
export const frameCode = (f) => `Geom.Frame.make ~origin:${v3(f.origin)} ~x:${v3(f.x)} ~z:${v3(f.z)}`;

// ---------- Éditeur d'esquisse ----------
export class SketchEditor {
  constructor(ctx) {
    this.ctx = ctx; // { scene, camera, controls, renderer, solve(desc), insert(code), done() }
    this.group = null;
  }

  start(plane, planeCode) {
    this.plane = plane; this.planeCode = planeCode;
    this.pts = []; this.lines = []; this.circles = []; this.cons = []; this.loops = [];
    this.tool = 'poly'; this.chain = null; this.sel = []; this.dof = null; this.error = null;
    const { scene, camera, controls } = this.ctx, f = plane;
    this.group = new THREE.Group();
    this.group.matrixAutoUpdate = false;
    this.group.matrix.makeBasis(f.x, f.y, f.z).setPosition(f.origin.clone().addScaledVector(f.z, 0.02));
    scene.add(this.group);
    // Vue de face sur le plan.
    const dist = Math.max(60, camera.position.distanceTo(controls.target));
    controls.target.copy(f.origin);
    camera.up.copy(f.y);
    camera.position.copy(f.origin).addScaledVector(f.z, dist);
    controls.enableRotate = false;
    controls.update();
    this.panel(true);
    this.redraw();
  }

  stop() {
    const { scene, camera, controls } = this.ctx;
    if (this.group) { scene.remove(this.group); this.group = null; }
    camera.up.set(0, 0, 1); controls.enableRotate = true; controls.update();
    this.panel(false);
    this.ctx.done();
  }

  get active() { return this.group != null; }

  // Point du plan (coordonnées locales) sous la souris.
  local(e) {
    const { camera, renderer } = this.ctx, r = renderer.domElement.getBoundingClientRect();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
    const f = this.plane, pl = new THREE.Plane().setFromNormalAndCoplanarPoint(f.z, f.origin);
    const w = ray.ray.intersectPlane(pl, new THREE.Vector3());
    if (!w) return null;
    w.sub(f.origin);
    return { x: w.dot(f.x), y: w.dot(f.y) };
  }

  tol() { const { camera, controls } = this.ctx; return camera.position.distanceTo(controls.target) * 0.015; }

  nearest(q) {
    const t = this.tol(), d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
    let best = null;
    this.pts.forEach((p, i) => { const d = d2(p, q); if (d < t && (!best || d < best.d)) best = { kind: 'p', i, d }; });
    if (best) return best;
    this.lines.forEach(([a, b], i) => {
      const A = this.pts[a], B = this.pts[b], dx = B.x - A.x, dy = B.y - A.y, L2 = dx * dx + dy * dy || 1;
      const s = Math.max(0, Math.min(1, ((q.x - A.x) * dx + (q.y - A.y) * dy) / L2));
      const d = Math.hypot(A.x + s * dx - q.x, A.y + s * dy - q.y);
      if (d < t && (!best || d < best.d)) best = { kind: 'l', i, d };
    });
    this.circles.forEach((c, i) => {
      const C = this.pts[c.c], d = Math.abs(Math.hypot(q.x - C.x, q.y - C.y) - c.r);
      if (d < t && (!best || d < best.d)) best = { kind: 'c', i, d };
    });
    return best;
  }

  pointAt(q) {
    const n = this.nearest(q);
    if (n && n.kind === 'p') return n.i;
    this.pts.push({ x: q.x, y: q.y, fixed: this.pts.length === 0 });
    return this.pts.length - 1;
  }

  click(e) {
    const q = this.local(e); if (!q) return;
    if (this.tool === 'poly') {
      const first = this.chain ? this.chain[0] : null;
      const i = this.pointAt(q);
      if (this.chain) {
        const prev = this.chain[this.chain.length - 1];
        if (i !== prev) this.lines.push([prev, i]);
        if (i === first && this.chain.length >= 3) { this.loops.push(this.chain.slice()); this.chain = null; }
        else this.chain.push(i);
      } else this.chain = [i];
      this.changed();
    } else if (this.tool === 'circle') {
      if (this.pending == null) { this.pending = this.pointAt(q); this.redraw(); }
      else {
        const C = this.pts[this.pending];
        this.circles.push({ c: this.pending, r: Math.max(0.5, Math.hypot(q.x - C.x, q.y - C.y)) });
        this.pending = null; this.changed();
      }
    } else {
      const n = this.nearest(q);
      if (!n) this.sel = [];
      else {
        const k = this.sel.findIndex((s) => s.kind === n.kind && s.i === n.i);
        if (k >= 0) this.sel.splice(k, 1); else this.sel.push({ kind: n.kind, i: n.i });
        if (!e.shiftKey && this.sel.length > 2) this.sel = this.sel.slice(-2);
      }
      this.redraw();
    }
  }

  key(e) {
    if (e.key === 'Escape') { this.chain = null; this.pending = null; this.redraw(); }
  }

  desc() {
    return {
      points: this.pts.map((p) => [p.x, p.y, p.fixed]),
      lines: this.lines, circles: this.circles.map((c) => [c.c, c.r]),
      constraints: this.cons.map((c) => (c.value == null ? { kind: c.kind, refs: c.refs } : c)),
      loops: this.loops,
    };
  }

  changed() { this.ctx.solve(this.desc()); this.redraw(); }

  onSolved(m) {
    if (!this.active) return;
    if (m.ok) {
      m.points.forEach(([x, y], i) => { if (this.pts[i]) { this.pts[i].x = x; this.pts[i].y = y; } });
      m.radii.forEach((r, i) => { if (this.circles[i]) this.circles[i].r = r; });
      this.dof = m.dof; this.redundant = m.redundant; this.code = m.code; this.error = null;
    } else this.error = m.error;
    this.redraw();
  }

  // Contraintes applicables à la sélection courante.
  candidates() {
    const s = this.sel, kinds = s.map((x) => x.kind).join('');
    const L = (k) => s.filter((x) => x.kind === k).map((x) => x.i);
    const len = (i) => { const [a, b] = this.lines[i], A = this.pts[a], B = this.pts[b]; return Math.hypot(B.x - A.x, B.y - A.y); };
    const out = [];
    if (kinds === 'l') {
      out.push(['horizontal', 'Horizontale', L('l')], ['vertical', 'Verticale', L('l')], ['length', 'Longueur', L('l'), len(L('l')[0])]);
    }
    if (kinds === 'll') {
      out.push(['parallel', 'Parallèles', L('l')], ['perpendicular', 'Perpendiculaires', L('l')], ['equal_length', 'Même longueur', L('l')], ['angle', 'Angle', L('l'), 90]);
    }
    if (kinds === 'pp') {
      const [a, b] = L('p'), A = this.pts[a], B = this.pts[b];
      out.push(['coincident', 'Confondus', [a, b]], ['distance', 'Distance', [a, b], Math.hypot(B.x - A.x, B.y - A.y)],
        ['hdistance', 'Écart x', [a, b], B.x - A.x], ['vdistance', 'Écart y', [a, b], B.y - A.y]);
    }
    if (kinds === 'p') out.push(['fix', this.pts[L('p')[0]].fixed ? 'Libérer' : 'Fixer', L('p')]);
    if (kinds === 'c') out.push(['radius', 'Rayon', L('c'), this.circles[L('c')[0]].r]);
    if (kinds === 'cc') out.push(['equal_radius', 'Même rayon', L('c')], ['concentric', 'Concentriques', L('c')]);
    if (kinds === 'lc' || kinds === 'cl') out.push(['tangent', 'Tangente', [L('l')[0], L('c')[0]]]);
    if (kinds === 'pl' || kinds === 'lp') out.push(['on_line', 'Sur la droite', [L('p')[0], L('l')[0]]], ['midpoint', 'Milieu', [L('p')[0], L('l')[0]]]);
    if (kinds === 'pc' || kinds === 'cp') out.push(['on_circle', 'Sur le cercle', [L('p')[0], L('c')[0]]]);
    return out;
  }

  addConstraint([kind, label, refs, dflt]) {
    if (kind === 'fix') { const p = this.pts[refs[0]]; p.fixed = !p.fixed; this.sel = []; this.changed(); return; }
    let value;
    if (dflt !== undefined) {
      const s = prompt(`${label} (${kind === 'angle' ? '°' : 'mm'})`, fmt(dflt));
      if (s == null) return;
      value = Number(s.replace(',', '.'));
      if (!Number.isFinite(value)) return;
    }
    this.cons.push(value === undefined ? { kind, refs } : { kind, refs, value });
    this.sel = []; this.changed();
  }

  panel(show) {
    $('sketch-panel').hidden = !show;
    $('sketch-start').hidden = show;
  }

  redraw() {
    if (!this.group) return;
    const g = this.group;
    for (const o of [...g.children]) { g.remove(o); o.geometry?.dispose(); o.material?.dispose(); }
    const isSel = (k, i) => this.sel.some((s) => s.kind === k && s.i === i);
    const col = (k, i) => (isSel(k, i) ? 0xff8a3d : 0x1f6feb);
    const seg = (pts, color) => {
      const geo = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p.x, p.y, 0)));
      const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color, depthTest: false }));
      l.renderOrder = 3; g.add(l);
    };
    this.lines.forEach(([a, b], i) => seg([this.pts[a], this.pts[b]], col('l', i)));
    this.circles.forEach((c, i) => {
      const C = this.pts[c.c];
      seg(Array.from({ length: 65 }, (_, k) => ({ x: C.x + c.r * Math.cos((k / 64) * 2 * Math.PI), y: C.y + c.r * Math.sin((k / 64) * 2 * Math.PI) })), col('c', i));
    });
    const t = this.tol() * 0.35;
    this.pts.forEach((p, i) => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(t, 12), new THREE.MeshBasicMaterial({ color: p.fixed ? 0x222222 : col('p', i), depthTest: false }));
      m.position.set(p.x, p.y, 0); m.renderOrder = 4; g.add(m);
    });
    // Panneau
    const status = this.error ? `⚠ ${this.error}` :
      this.dof == null ? 'Dessinez un contour (cliquez sur le premier point pour le fermer).' :
      `${this.dof === 0 ? 'Entièrement contrainte' : `${this.dof} degré${this.dof > 1 ? 's' : ''} de liberté`}${this.redundant ? ` · ${this.redundant} redondante(s)` : ''}`;
    $('sketch-status').textContent = status;
    const box = $('sketch-constraints'); box.replaceChildren();
    for (const c of this.candidates()) {
      const b = document.createElement('button'); b.textContent = c[1]; b.onclick = () => this.addConstraint(c); box.append(b);
    }
    const list = $('sketch-list'); list.replaceChildren();
    this.cons.forEach((c, i) => {
      const li = document.createElement('li');
      li.textContent = `${c.kind} ${c.refs.join(',')}${c.value != null ? ' = ' + fmt(c.value) : ''} `;
      const x = document.createElement('button'); x.textContent = '✕';
      x.onclick = () => { this.cons.splice(i, 1); this.changed(); };
      li.append(x); list.append(li);
    });
    for (const b of document.querySelectorAll('[data-tool]')) b.classList.toggle('on', b.dataset.tool === this.tool);
    $('sketch-ok-add').disabled = $('sketch-ok-cut').disabled = !(this.code && !this.error && (this.loops.length || this.circles.length));
  }

  // Code inséré : plan, profondeur (paramètre), esquisse, feature, résultat.
  validate(mode, n) {
    const plan = `plan${n}`, h = `profondeur${n}`, sk = `esquisse${n}`, ft = mode === 'add' ? `extrusion${n}` : `poche${n}`;
    const shape = mode === 'add'
      ? `Shape.(extrude ~h:${h} ${sk} |> place ${plan})`
      : `Shape.(extrude ~h:(${h} +. 0.01) ${sk} |> place ${plan}\n      |> translate (Geom.V3.scale (-.${h}) (Geom.Frame.z_axis ${plan})))`;
    const code =
      `  let ${plan} = ${this.planeCode} in\n` +
      `  let%param ${h} = 5. [@range 0.5, 100.] [@unit "mm"] in\n` +
      `  let%sketch ${sk} =\n${this.code}  in\n` +
      `  let%feat ${ft} = ${shape} in\n`;
    this.ctx.insert(code, ft, mode);
    this.stop();
  }
}
