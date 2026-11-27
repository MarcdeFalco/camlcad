// Édition d'esquisse sur un plan (plans et faces : planes.js ; cotes, symboles et
// élastique : sketch_marks.js). Le solveur est celui d'OCaml (worker, message
// "sketch") ; « Terminer l'esquisse » passe la main à la boîte d'extrusion, qui écrit le code.
import * as THREE from 'three';
import { SketchMarks } from './sketch_marks.js';
import { TWO_CLICK } from './sketch_tools.js';
import { mirror, patternX, offsetLoop } from './sketch_copy.js';
import { deleteSelection } from './sketch_delete.js';
import { arcPoints, arcRadius, loopPoints, loopOutline, centerArc, fillet } from './sketch_arcs.js';

const $ = (id) => document.getElementById(id);
const fmt = (x) => Number((Math.round(x * 100) / 100).toFixed(2)).toString();

export { planarFace, basePlanes, frameCode } from './planes.js';

// ---------- Éditeur d'esquisse ----------
export class SketchEditor extends SketchMarks {
  constructor(ctx) {
    super();
    this.ctx = ctx; // { scene, camera, controls, renderer, solve(desc), mode(on), finish(data), done() }
    this.group = null;
  }

  // data : esquisse relue du code (sketch_parse.js) ; editing : { name } pour la réécrire.
  start(plane, planeCode, data = null, editing = null, faceLoops = null) {
    this.plane = plane; this.planeCode = planeCode; this.editing = editing; this.faceLoops = faceLoops;
    this.pts = []; this.lines = []; this.circles = []; this.arcs = []; this.cons = []; this.loops = [];
    if (data) Object.assign(this, structuredClone(data));
    this.tool = 'rect'; this.chain = null; this.pending = null; this.hover = null; this.sel = []; this.dof = null; this.error = null; this.asking = null;
    this.show();
    if (data) this.changed();
  }

  // Reprend l'esquisse suspendue (extrusion annulée).
  resume() { this.show(); }

  show() {
    const { scene, camera, controls } = this.ctx, f = this.plane;
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
    this.onCam = () => this.placeLabels();
    controls.addEventListener('change', this.onCam);
    this.panel(true);
    this.redraw();
  }

  // Retire l'esquisse de la vue ; ses données restent pour resume().
  suspend() {
    const { scene, camera, controls } = this.ctx;
    if (this.group) { scene.remove(this.group); this.group = null; }
    if (this.onCam) controls.removeEventListener('change', this.onCam);
    this.labels().replaceChildren();
    camera.up.set(0, 0, 1); controls.enableRotate = true; controls.update();
    this.panel(false);
  }
  stop() { this.suspend(); this.ctx.done(); }

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
    this.arcs.forEach((_, i) => {
      const d = Math.min(...arcPoints(this, i).map((p) => d2(p, q)));
      if (d < t && (!best || d < best.d)) best = { kind: 'a', i, d };
    });
    return best;
  }

  pointAt(q) {
    const n = this.nearest(q);
    if (n && n.kind === 'p') return n.i;
    this.pts.push({ x: q.x, y: q.y, fixed: this.pts.length === 0 });
    return this.pts.length - 1;
  }

  // Survol : élastique du tracé en cours et point d'accroche.
  move(e) {
    this.hover = this.local(e);
    this.drawRubber();
  }

  // Nombre de côtés du polygone (champ de la barre d'outils).
  sides() { return Math.max(3, Math.min(24, Math.round(Number($('poly-sides')?.value) || 6))); }

  click(e) {
    const q = this.local(e); if (!q) return;
    if (TWO_CLICK[this.tool]) {
      if (this.pending == null) { this.pending = this.pointAt(q); this.redraw(); }
      else { const a = this.pending; this.pending = null; if (TWO_CLICK[this.tool][0](this, a, q, this.sides())) this.changed(); else this.redraw(); }
    } else if (this.tool === 'arc') {
      if (this.pending == null) this.pending = this.pointAt(q);
      else if (this.pending2 == null) this.pending2 = this.pointAt(q);
      else { centerArc(this, this.pending, this.pending2, q); this.pending = this.pending2 = null; this.changed(); return; }
      this.redraw();
    } else if (this.tool === 'offset') {
      const n = this.nearest(q);
      if (n && n.kind === 'l') { this.asking = { kind: 'offset', label: 'Décalage (> 0 : intérieur)', refs: [n.i], value: 2 }; this.sel = [{ kind: 'l', i: n.i }]; }
      this.redraw();
    } else if (this.tool === 'fillet') {
      const n = this.nearest(q);
      if (n && n.kind === 'p') { this.asking = { kind: 'fillet', label: 'Rayon du congé', refs: [n.i], value: 3 }; this.sel = [{ kind: 'p', i: n.i }]; }
      this.redraw();
    } else if (this.tool === 'point') {
      this.pointAt(q); this.changed();
    } else if (this.tool === 'dim') {
      this.dimClick(q, e);
    } else if (this.tool === 'poly') {
      const first = this.chain ? this.chain[0] : null;
      const i = this.pointAt(q);
      if (this.chain) {
        const prev = this.chain[this.chain.length - 1];
        if (i !== prev) {
          this.lines.push([prev, i]);
          // Contrainte implicite : ligne presque horizontale ou verticale (à 3° près).
          const A = this.pts[prev], B = this.pts[i], ang = Math.abs(Math.atan2(B.y - A.y, B.x - A.x) * 180 / Math.PI) % 180;
          const l = this.lines.length - 1;
          if (ang < 3 || ang > 177) this.cons.push({ kind: 'horizontal', refs: [l] });
          else if (Math.abs(ang - 90) < 3) this.cons.push({ kind: 'vertical', refs: [l] });
        }
        if (i === first && this.chain.length >= 3) { this.loops.push(this.chain.slice()); this.chain = null; }
        else this.chain.push(i);
      } else this.chain = [i];
      this.changed();
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

  // Outil Cote (D) : ligne → longueur, cercle → rayon, deux points → distance, deux lignes → angle.
  dimClick(q) {
    const n = this.nearest(q);
    if (!n) { this.sel = []; this.redraw(); return; }
    this.sel = [...this.sel.filter((x) => !(x.kind === n.kind && x.i === n.i)), { kind: n.kind, i: n.i }].slice(-2);
    const kinds = this.sel.map((x) => x.kind).join('');
    const want = { l: 'length', c: 'radius', a: 'arc_radius', pp: 'distance', ll: 'angle' }[kinds];
    // Une ligne seule attend un éventuel second élément (angle) : cote proposée tout de suite.
    const c = want && this.candidates().find((x) => x[0] === want);
    if (c) { this.asking = null; this.addConstraint(c); } else this.redraw();
  }

  key(e) {
    if (e.target.closest('input,select,.cm-editor')) return;
    if (e.key === 'Escape') {
      if (this.chain || this.pending != null) { this.dropPending(); this.chain = null; this.redraw(); } else this.stop();
    }
    if ((e.key === 'Delete' || e.key === 'Backspace') && this.sel.length) { e.preventDefault(); this.remove(); return; }
    const tools = { r: 'rect', l: 'poly', c: 'circle', a: 'arc', p: 'polygon', d: 'dim', s: 'select' };
    if (tools[e.key]) this.setTool(tools[e.key]);
  }
  // Projeter (Black Book ch. 3, Project) : le contour de la face d'appui devient des points
  // fixes et des lignes de construction, pour s'y accrocher.
  project() {
    if (!this.faceLoops) return;
    for (const l of this.faceLoops) {
      const first = this.pts.length;
      l.forEach((p) => this.pts.push({ x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100, fixed: true }));
      l.forEach((_, k) => this.lines.push([first + k, first + ((k + 1) % l.length)]));
    }
    this.faceLoops = null; this.changed();
  }
  remove() { if (deleteSelection(this)) { this.asking = null; this.changed(); } }
  setTool(t) { this.dropPending(); this.tool = t; this.chain = null; this.redraw(); }
  // Premier clic d'un rectangle ou d'un cercle abandonné : retire le point s'il ne sert à rien.
  dropPending() {
    const i = this.pending; this.pending = null; this.pending2 = null;
    if (i == null || i !== this.pts.length - 1 || i === 0) return;
    const used = this.lines.some((l) => l.includes(i)) || this.circles.some((c) => c.c === i) || this.arcs.some((a) => [a.c, a.a, a.b].includes(i)) || this.cons.some((c) => c.refs.includes(i));
    if (!used) this.pts.pop();
  }

  desc() { return descOf(this); }

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
    if (kinds === 'a') out.push(['arc_radius', 'Rayon', L('a'), arcRadius(this, L('a')[0])]);
    if (kinds === 'la' || kinds === 'al') out.push(['tangent_arc', 'Tangente', [L('l')[0], L('a')[0]]]);
    if (kinds === 'cc') out.push(['equal_radius', 'Même rayon', L('c')], ['concentric', 'Concentriques', L('c')]);
    if (kinds === 'lc' || kinds === 'cl') out.push(['tangent', 'Tangente', [L('l')[0], L('c')[0]]]);
    if (kinds === 'pl' || kinds === 'lp') out.push(['on_line', 'Sur la droite', [L('p')[0], L('l')[0]]], ['midpoint', 'Milieu', [L('p')[0], L('l')[0]]]);
    // Copies : réseau des éléments choisis, symétrie (la dernière ligne choisie est l'axe).
    if (s.length >= 1) out.push(['patternx', 'Réseau x', s.slice(), 3]);
    if (s.length >= 2 && s[s.length - 1].kind === 'l') out.push(['mirror', `Symétrie / L${s[s.length - 1].i + 1}`, s.slice()]);
    if (kinds === 'pc' || kinds === 'cp') out.push(['on_circle', 'Sur le cercle', [L('p')[0], L('c')[0]]]);
    return out;
  }

  addConstraint([kind, label, refs, dflt]) {
    if (kind === 'mirror') { this.sel = []; const err = mirror(this, refs.slice(0, -1), refs[refs.length - 1].i); if (err) { this.error = err; this.redraw(); } else this.changed(); return; }
    if (kind === 'patternx' && this.asking) { const n = Math.round(this.asking.value); this.asking = { kind: 'patternx_d', label: `Pas (${n} exemplaires)`, refs, value: 10, n }; this.redraw(); return; }
    if (kind === 'patternx_d' && this.asking) {
      const { n, value } = this.asking; this.asking = null; this.sel = [];
      const err = patternX(this, refs, n, value); if (err) { this.error = err; this.redraw(); } else this.changed();
      return;
    }
    if (kind === 'offset' && this.asking) {
      const d = this.asking.value; this.asking = null; this.sel = [];
      const err = Number.isFinite(d) && d !== 0 ? offsetLoop(this, refs[0], d) : 'Décalage : distance nulle.';
      if (err) { this.error = err; this.redraw(); } else this.changed();
      return;
    }
    if (kind === 'fillet' && this.asking) {
      const r = this.asking.value; this.asking = null; this.sel = [];
      const err = Number.isFinite(r) && r > 0 ? fillet(this, refs[0], r) : 'Congé : rayon invalide.';
      if (err) { this.error = err; this.redraw(); } else this.changed();
      return;
    }
    if (kind === 'fix') { const p = this.pts[refs[0]]; p.fixed = !p.fixed; this.sel = []; this.changed(); return; }
    // Cote : valeur demandée dans la palette (pas de boîte modale).
    if (dflt !== undefined && this.asking == null) { this.asking = { kind, label, refs, value: dflt }; this.redraw(); return; }
    const value = dflt === undefined ? undefined : this.asking?.value;
    this.asking = null;
    if (dflt !== undefined && !Number.isFinite(value)) { this.redraw(); return; }
    this.cons.push(value === undefined ? { kind, refs } : { kind, refs, value });
    this.sel = []; this.changed();
  }


  panel(show) {
    if (!show) { const live = document.getElementById('sketch-live'); if (live) live.hidden = true; }
    $('palette').hidden = !show;
    this.ctx.mode(show);
  }

  // Profil pour l'extrusion : points résolus, boucles et cercles, code let%sketch.
  finish(kind = 'extrude') {
    if (!(this.code && !this.error && (this.loops.length || this.circles.length))) return false;
    const data = {
      frame: this.plane, planeCode: this.planeCode, code: this.code,
      kind, editing: this.editing, loops: this.loops.map((l) => loopOutline(this, l)),
      // Lignes (axes possibles d'une révolution), nommées comme dans la palette.
      lines: this.lines.map(([a, b], i) => ({ name: `L${i + 1}`, a: { ...this.pts[a] }, b: { ...this.pts[b] } })),
      circles: this.circles.map((c) => ({ x: this.pts[c.c].x, y: this.pts[c.c].y, r: c.r })),
    };
    this.suspend();
    this.ctx.finish(data);
    return true;
  }

  redraw() {
    if (!this.group) return;
    const g = this.group;
    for (const o of [...g.children]) { g.remove(o); o.traverse((x) => { x.geometry?.dispose(); x.material?.dispose(); }); }
    const isSel = (k, i) => this.sel.some((s) => s.kind === k && s.i === i);
    const col = (k, i) => (isSel(k, i) ? 0xff8a3d : 0x1f6feb);
    // Ligne de construction (hors de toute boucle, hors du contour en cours) : orange, pointillés.
    const seg = (pts, color, constr) => {
      const geo = new THREE.BufferGeometry().setFromPoints(pts.map((p) => new THREE.Vector3(p.x, p.y, 0)));
      const l = new THREE.Line(geo, constr
        ? new THREE.LineDashedMaterial({ color: color === 0x1f6feb ? 0xe07b22 : color, dashSize: this.tol() * 0.5, gapSize: this.tol() * 0.35, depthTest: false, transparent: true })
        : new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true }));
      if (constr) l.computeLineDistances();
      l.renderOrder = constr ? 2 : 3; g.add(l);
    };
    const chain = this.chain ?? [], seqs = this.loops.map((l) => loopPoints(this, l));
    const inLoop = (a, b) => (chain.includes(a) && chain.includes(b)) || seqs.some((l) => l.some((p, k) => { const r = l[(k + 1) % l.length]; return (p === a && r === b) || (p === b && r === a); }));
    this.lines.forEach(([a, b], i) => seg([this.pts[a], this.pts[b]], col('l', i), !inLoop(a, b)));
    this.arcs.forEach((_, i) => seg(arcPoints(this, i), col('a', i), !seqs.some((l) => l.includes(this.arcs[i].a) && l.includes(this.arcs[i].b))));
    this.circles.forEach((c, i) => {
      const C = this.pts[c.c];
      seg(Array.from({ length: 65 }, (_, k) => ({ x: C.x + c.r * Math.cos((k / 64) * 2 * Math.PI), y: C.y + c.r * Math.sin((k / 64) * 2 * Math.PI) })), col('c', i));
    });
    const t = this.tol() * 0.35;
    this.pts.forEach((p, i) => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(t, 12), new THREE.MeshBasicMaterial({ color: p.fixed ? 0x222222 : col('p', i), depthTest: false, transparent: true }));
      m.position.set(p.x, p.y, 0); m.renderOrder = 4; g.add(m);
    });
    // Panneau
    const status = this.error ? `⚠ ${this.error}` :
      this.dof == null ? 'Dessinez un rectangle, un contour ou un cercle.' :
      `${this.dof === 0 ? 'Entièrement contrainte' : `${this.dof} degré${this.dof > 1 ? 's' : ''} de liberté`}${this.redundant ? ` · ${this.redundant} redondante(s)` : ''}`;
    $('sketch-status').textContent = status;
    $('sketch-status').className = 'status' + (this.error ? ' err' : this.dof === 0 ? ' ok' : '');
    const box = $('sketch-constraints'); box.replaceChildren();
    const cands = this.candidates();
    if (!cands.length) box.append(Object.assign(document.createElement('span'), { className: 'hint', textContent: 'Sélectionnez des éléments' }));
    for (const c of cands) {
      const b = document.createElement('button'); b.textContent = c[1]; b.onclick = () => { this.asking = null; this.addConstraint(c); }; box.append(b);
    }
    const ask = $('sketch-ask'); ask.replaceChildren(); ask.hidden = !this.asking;
    if (this.asking) {
      const a = this.asking, i = document.createElement('input'), ok = document.createElement('button');
      i.type = 'number'; i.step = 'any'; i.value = fmt(a.value); ok.textContent = 'OK';
      const go = () => { a.value = Number(i.value); this.addConstraint([a.kind, a.label, a.refs, a.value]); };
      i.onkeydown = (e) => { if (e.key === 'Enter') go(); if (e.key === 'Escape') { this.asking = null; this.redraw(); } };
      ok.onclick = go;
      ask.append(Object.assign(document.createElement('span'), { textContent: `${a.label} (${a.kind === 'angle' ? '°' : 'mm'})` }), i, ok);
      i.focus(); i.select();
    }
    const list = $('sketch-list'); list.replaceChildren();
    this.cons.forEach((c, i) => {
      const li = document.createElement('li');
      li.textContent = this.consText(c) + ' ';
      const x = document.createElement('button'); x.textContent = '✕';
      x.onclick = () => { this.cons.splice(i, 1); this.changed(); };
      li.append(x); list.append(li);
    });
    for (const b of document.querySelectorAll('[data-tool]')) b.classList.toggle('on', b.dataset.tool === this.tool);
    $('sketch-project').disabled = !this.faceLoops;
    $('sketch-finish').disabled = $('sketch-revolve').disabled = !(this.code && !this.error && (this.loops.length || this.circles.length));
    this.rubber = null; this.drawRubber(); this.drawLabels();
  }
}

// Description pour le solveur (Cad.Sketch_desc) des structures de l'éditeur.
export function descOf(ed) {
  return {
    points: ed.pts.map((p) => [p.x, p.y, p.fixed]),
    lines: ed.lines, circles: ed.circles.map((c) => [c.c, c.r]), arcs: ed.arcs.map((a) => [a.c, a.a, a.b]),
    constraints: ed.cons.map((c) => (c.value == null ? { kind: c.kind, refs: c.refs } : c)),
    loops: ed.loops,
  };
}
