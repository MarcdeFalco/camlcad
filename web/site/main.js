// Éditeur camlcad : code (CodeMirror) ↔ worker OCaml ↔ vue 3D (three.js).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EditorView, basicSetup } from 'codemirror';
import { StreamLanguage } from '@codemirror/language';
import { oCaml } from '@codemirror/legacy-modes/mode/mllike';
import { setDiagnostics } from '@codemirror/lint';
import { StateEffect, StateField } from '@codemirror/state';
import { Decoration } from '@codemirror/view';
import { SketchEditor, planarFace, basePlanes, frameCode } from './sketch.js';

const $ = (id) => document.getElementById(id);
const EXAMPLES = ['nouveau', 'support', 'engrenage', 'charniere', 'patte', 'bielle', 'engrenages'];

// ---------- Worker ----------
const worker = new Worker('worker.js', { type: 'module' });
let ready = false, nextId = 1, pending = null, inflight = false;
let overrides = new Map(); // nom -> valeur (curseurs non validés)
let journal = null, lastMesh = null, selected = null;

function send(msg) {
  if (!ready) return;
  if (inflight) { pending = msg; return; }
  inflight = true;
  worker.postMessage({ ...msg, id: nextId++, overrides: [...overrides] });
}
function evalCode() { send({ kind: 'eval', code: view.state.doc.toString() }); }
function evalParams() { send({ kind: 'params' }); }

const t0 = performance.now();
worker.onmessage = ({ data: m }) => {
  if (m.kind === 'ready') {
    ready = true;
    $('status').textContent = `toplevel prêt en ${((performance.now() - t0) / 1000).toFixed(1)} s`;
    evalCode();
    return;
  }
  if (m.kind === 'feature') { showFeatureMesh(m); return; }
  if (m.kind === 'sketch') { sketch.onSolved(m); return; }
  if (m.kind === 'export3mf') { download(new Blob([m.data], { type: 'model/3mf' }), '3mf'); return; }
  if (m.kind === 'pick') { if (m.fid >= 0) selectFeature(m.fid, true); return; }
  if (m.kind === 'pose') { poseInflight = false; onPose(m); if (poseNext) { const p = poseNext; poseNext = null; sendPose(p); } return; }
  inflight = false;
  onResult(m);
  if (pending) { const p = pending; pending = null; send(p); }
};

// ---------- Éditeur ----------
const setFeatLine = StateEffect.define();
const featLine = StateField.define({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) if (e.is(setFeatLine)) {
      deco = e.value == null ? Decoration.none
        : Decoration.set([Decoration.line({ class: 'cm-feat-line' }).range(tr.state.doc.line(e.value).from)]);
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

let debounce = null;
const view = new EditorView({
  parent: $('code'),
  extensions: [
    basicSetup, StreamLanguage.define(oCaml), featLine,
    EditorView.updateListener.of((u) => {
      if (u.docChanged) { clearTimeout(debounce); debounce = setTimeout(evalCode, 250); }
      if (u.selectionSet && !u.docChanged && journal) {
        const line = u.state.doc.lineAt(u.state.selection.main.head).number;
        const f = featureAtLine(line);
        if (f && f.id !== selected) selectFeature(f.id, false);
      }
    }),
  ],
});

// Positions au format __POS__ : colonnes en octets depuis le début de la ligne.
function locRange(loc) {
  const line = view.state.doc.line(loc.line);
  const enc = new TextEncoder(), text = view.state.doc.sliceString(line.from, view.state.doc.length);
  const toChars = (bytes) => { let b = 0, i = 0; while (b < bytes && i < text.length) { b += enc.encode(text[i]).length; i++; } return i; };
  return { from: line.from + toChars(loc.start_col), to: line.from + toChars(loc.end_col) };
}
function featureAtLine(line) {
  let best = null;
  for (const f of journal.features) if (f.loc && f.loc.line <= line) best = f;
  return best;
}

// ---------- Vue 3D ----------
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 5000);
camera.up.set(0, 0, 1);
camera.position.set(80, -120, 90);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(devicePixelRatio);
$('view').appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
scene.add(new THREE.HemisphereLight(0xffffff, 0x666677, 2.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(1, -2, 3); scene.add(sun);
const grid = new THREE.GridHelper(200, 20, 0x888888, 0xcccccc); grid.rotation.x = Math.PI / 2; scene.add(grid);
const material = new THREE.MeshStandardMaterial({ color: 0x4f86c6, roughness: 0.55, metalness: 0.05, flatShading: true, transparent: true });
const hiMaterial = new THREE.MeshStandardMaterial({ color: 0xff8a3d, roughness: 0.5, flatShading: true, transparent: true, opacity: 0.85, depthTest: false });
let part = null, highlight = null, fitted = false;

function geometry(m) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(m.vertices, 3));
  g.setIndex(new THREE.BufferAttribute(m.triangles, 1));
  return g.toNonIndexed();
}
function resize() {
  const r = $('view').getBoundingClientRect();
  renderer.setSize(r.width, r.height); camera.aspect = r.width / r.height; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe($('view'));
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });

// Clic (sans glisser) sur la pièce : sélection de la feature correspondante.
const raycaster = new THREE.Raycaster();
let down = null;
renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
renderer.domElement.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
  if (sketch.active) { sketch.click(e); return; }
  if (!part || !journal) return;
  const r = renderer.domElement.getBoundingClientRect();
  raycaster.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  const hit = raycaster.intersectObject(part)[0];
  if (hit) {
    worker.postMessage({ kind: 'pick', id: 0, point: hit.point.toArray(), overrides: [] });
    showFace(planarFace(lastMesh, hit.faceIndex));
  } else { selectFeature(null, false); showFace(null); }
});
window.addEventListener('keydown', (e) => { if (sketch.active) sketch.key(e); });

// ---------- Face choisie et esquisse ----------
let face = null, faceMesh = null, sketchCount = 0;
function showFace(f) {
  face = f;
  if (faceMesh) { scene.remove(faceMesh); faceMesh.geometry.dispose(); faceMesh = null; }
  $('sketch-on-face').disabled = !f;
  $('face-info').textContent = f ? `Face plane ${fmt(f.area)} mm², normale (${f.frame.z.toArray().map(fmt).join(', ')})` : '';
  if (!f) return;
  const V = lastMesh.vertices, T = lastMesh.triangles, pos = [];
  for (const t of f.tris) for (let k = 0; k < 3; k++) { const i = T[3 * t + k]; pos.push(V[3 * i], V[3 * i + 1], V[3 * i + 2]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  faceMesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x2ecc71, transparent: true, opacity: 0.6, depthTest: false, side: THREE.DoubleSide }));
  faceMesh.renderOrder = 2; scene.add(faceMesh);
}
const sketch = new SketchEditor({
  scene, camera, controls, renderer,
  solve: (desc) => worker.postMessage({ kind: 'sketch', id: 0, sketch: desc, overrides: [] }),
  insert: insertFeature,
  done: () => { showFace(null); },
});
window.camlcadSketch = sketch; // inspection (tests)
for (const b of document.querySelectorAll('[data-plane]'))
  b.onclick = () => { showFace(null); sketch.start(basePlanes[b.dataset.plane].frame, basePlanes[b.dataset.plane].code); };
$('sketch-on-face').onclick = () => { const f = face; showFace(null); sketch.start(f.frame, frameCode(f.frame)); };
for (const b of document.querySelectorAll('[data-tool]')) b.onclick = () => { sketch.tool = b.dataset.tool; sketch.chain = null; sketch.pending = null; sketch.redraw(); };
// Numéro libre : un de plus que le plus grand « esquisseN » du code.
const nextIndex = () => 1 + Math.max(0, ...[...view.state.doc.toString().matchAll(/esquisse(\d+)/g)].map((m) => Number(m[1])));
$('sketch-ok-add').onclick = () => sketch.validate('add', (sketchCount = nextIndex()));
$('sketch-ok-cut').onclick = () => sketch.validate('cut', (sketchCount = nextIndex()));
$('sketch-cancel').onclick = () => sketch.stop();

// Insère la feature avant le dernier « Doc.return X » et combine : X + f ou X - f.
function insertFeature(code, feat, mode) {
  const doc = view.state.doc.toString();
  const re = /^([ \t]*)Doc\.return\s+(.+?)\s*$/gm;
  let m, last = null;
  while ((m = re.exec(doc))) last = m;
  if (!last) { alert('Pas de « Doc.return … » où insérer la feature.'); return; }
  const prev = last[2];
  const res = `resultat${sketchCount}`;
  const ins = code + `  let%feat ${res} = Shape.(${prev} ${mode === 'add' ? '+' : '-'} ${feat}) in\n`;
  const from = last.index, to = last.index + last[0].length;
  view.dispatch({ changes: { from, to, insert: ins + `${last[1]}Doc.return ${res}` } });
}

function fit(g) {
  g.computeBoundingSphere();
  const { center } = g.boundingSphere;
  const radius = Number.isFinite(g.boundingSphere.radius) && g.boundingSphere.radius > 1e-6 ? g.boundingSphere.radius : 50;
  controls.target.copy(center);
  const half = THREE.MathUtils.degToRad(camera.fov / 2);
  const dist = (1.15 * radius) / Math.sin(half) / Math.min(1, camera.aspect);
  camera.position.copy(center).add(new THREE.Vector3(1, -1.5, 1.1).normalize().multiplyScalar(dist));
}

// ---------- Résultats ----------
function onResult(m) {
  const t = m.timings || {};
  const ntri = m.mode === 'mech' ? m.parts.reduce((n, p) => n + p.triangles.length / 3, 0) : m.triangles.length / 3;
  $('status').textContent = m.ok
    ? `${m.mode === 'mech' ? m.parts.length + ' pièces · ' : ''}${ntri} triangles · compil ${(t.compile ?? 0).toFixed(0)} ms · évaluation ${((t.run ?? 0) + (t.mesh ?? 0)).toFixed(0)} ms`
    : 'erreur';
  const diags = [];
  if (m.error) {
    $('error').hidden = false; $('error').textContent = m.error.message;
    if (m.error.line > 0) {
      const l0 = view.state.doc.line(Math.min(m.error.line, view.state.doc.lines));
      const from = Math.min(l0.from + m.error.col, l0.to);
      let to = from + 1;
      if (m.error.end_line > 0) {
        const l1 = view.state.doc.line(Math.min(m.error.end_line, view.state.doc.lines));
        to = Math.max(from + 1, Math.min(l1.from + m.error.end_col, view.state.doc.length));
      }
      diags.push({ from, to, severity: 'error', message: m.error.message });
    }
  } else $('error').hidden = true;
  view.dispatch(setDiagnostics(view.state, diags));
  if (m.journal !== 'null') { journal = JSON.parse(m.journal); renderParams(); renderTree(); }
  $('motion').hidden = m.mode !== 'mech';
  if (m.ok && m.mode === 'mech') { showMech(m); return; }
  if (m.ok) {
    clearMech();
    lastMesh = m;
    $('export-stl').disabled = false;
    $('export-3mf').disabled = false;
    if (part) { scene.remove(part); part.geometry.dispose(); }
    part = new THREE.Mesh(geometry(m), material);
    scene.add(part);
    if (!fitted) { fit(part.geometry); fitted = true; }
    if (selected != null) worker.postMessage({ kind: 'feature', id: 0, fid: selected, overrides: [] });
  }
}

function renderParams() {
  const box = $('params'); box.replaceChildren();
  for (const p of journal.params) {
    const div = document.createElement('div'); div.className = 'param';
    const [lo, hi] = p.range ?? [p.default / 4, p.default * 4 || 10];
    const step = 10 ** Math.floor(Math.log10((hi - lo) / 100));
    div.innerHTML = `<label><span>${p.name}</span><span><output>${fmt(p.value)}</output>${p.unit ? ' ' + p.unit : ''}</span></label>
      <input type="range" min="${lo}" max="${hi}" step="${step}" value="${p.value}">`;
    const input = div.querySelector('input'), out = div.querySelector('output');
    input.oninput = () => { overrides.set(p.name, Number(input.value)); out.textContent = fmt(Number(input.value)); evalParams(); };
    if (overrides.has(p.name)) {
      const b = document.createElement('button'); b.textContent = 'écrire dans le code';
      b.title = 'Remplace la valeur par défaut dans le source';
      b.onclick = () => commitParam(p);
      div.querySelector('label span').append(' ', b);
    }
    box.append(div);
  }
}
const fmt = (x) => (Math.abs(x) >= 100 ? x.toFixed(0) : Number(x.toPrecision(3)).toString());

// Valider un curseur : réécrit le littéral par défaut à sa position.
function commitParam(p) {
  const v = overrides.get(p.name);
  if (v == null || !p.loc) return;
  const { from, to } = locRange(p.loc);
  let lit = fmt(v); if (!lit.includes('.')) lit += '.';
  overrides.delete(p.name);
  view.dispatch({ changes: { from, to, insert: lit } });
}

function renderTree() {
  const ol = $('tree'); ol.replaceChildren();
  for (const f of journal.features) {
    const li = document.createElement('li');
    const deps = f.deps.map((d) => journal.features[d].name).join(', ');
    li.innerHTML = `${f.name}${deps ? ` <span class="deps">← ${deps}</span>` : ''}`;
    if (f.id === selected) li.className = 'sel';
    li.onclick = () => selectFeature(f.id === selected ? null : f.id, true);
    ol.append(li);
  }
}

function selectFeature(fid, moveCursor) {
  selected = fid;
  renderTree();
  if (highlight) { scene.remove(highlight); highlight.geometry.dispose(); highlight = null; }
  material.opacity = fid == null ? 1 : 0.35;
  if (fid == null) { view.dispatch({ effects: setFeatLine.of(null) }); return; }
  const f = journal.features[fid];
  if (f.loc) {
    view.dispatch({ effects: setFeatLine.of(f.loc.line) });
    if (moveCursor) {
      const line = view.state.doc.line(f.loc.line);
      view.dispatch({ selection: { anchor: line.from }, scrollIntoView: true });
    }
  }
  worker.postMessage({ kind: 'feature', id: 0, fid, overrides: [] });
}
function showFeatureMesh(m) {
  if (m.fid !== selected) return;
  if (highlight) { scene.remove(highlight); highlight.geometry.dispose(); }
  highlight = new THREE.Mesh(geometry(m), hiMaterial);
  highlight.renderOrder = 1;
  scene.add(highlight);
}

// ---------- Mécanismes : une pièce par maillage, placée par sa matrice ----------
let mech = null, poseInflight = false, poseNext = null, drivers = new Map(), anim = null;
function clearMech() {
  if (!mech) return;
  for (const o of mech.meshes) { scene.remove(o); o.geometry.dispose(); o.material.dispose(); }
  mech = null; stopAnim();
}
function showMech(m) {
  clearMech();
  if (part) { scene.remove(part); part.geometry.dispose(); part = null; }
  $('export-stl').disabled = true;
  $('export-3mf').disabled = false;
  const meshes = m.parts.map((p) => {
    const c = p.color ? new THREE.Color(p.color[0] / 255, p.color[1] / 255, p.color[2] / 255) : new THREE.Color(0x4f86c6);
    const o = new THREE.Mesh(geometry(p), new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, flatShading: true }));
    o.matrixAutoUpdate = false; scene.add(o); return o;
  });
  mech = { meshes, coords: m.coords };
  const known = new Set(m.coords.map((c) => c.name));
  for (const k of [...drivers.keys()]) if (!known.has(k)) drivers.delete(k);
  onPose(m);
  renderCoords(m);
  if (!fitted) { const b = new THREE.Box3(); meshes.forEach((o) => b.expandByObject(o)); const g = new THREE.BufferGeometry(); g.boundingSphere = b.getBoundingSphere(new THREE.Sphere()); fit(g); fitted = true; }
}
function onPose(m) {
  if (!mech) return;
  if (!m.ok) { $('inter').textContent = m.error; return; }
  mech.meshes.forEach((o, i) => { o.matrix.fromArray(m.matrices.slice(16 * i, 16 * i + 16)); o.matrixWorldNeedsUpdate = true; });
  mech.pose = new Map(m.pose);
  $('inter').textContent = m.interferences.length ? 'Interférences : ' + m.interferences.join(', ') : '';
  for (const el of document.querySelectorAll('#coords .param')) {
    const v = mech.pose.get(el.dataset.name);
    if (v != null && !drivers.has(el.dataset.name)) { el.querySelector('input').value = v; el.querySelector('output').textContent = fmt(v); }
  }
}
function sendPose(d) {
  if (poseInflight) { poseNext = d; return; }
  poseInflight = true;
  worker.postMessage({ kind: 'pose', id: 0, overrides: [...d] });
}
function renderCoords(m) {
  const box = $('coords'); box.replaceChildren();
  for (const c of m.coords) {
    const div = document.createElement('div'); div.className = 'param'; div.dataset.name = c.name;
    const v = mech.pose.get(c.name) ?? 0;
    div.innerHTML = `<label><span>${c.name}${drivers.has(c.name) ? ' (pilote)' : ''}</span><span><output>${fmt(v)}</output> ${c.unit}</span></label>
      <input type="range" min="${c.lo}" max="${c.hi}" step="${(c.hi - c.lo) / 360}" value="${v}">`;
    const input = div.querySelector('input');
    input.oninput = () => {
      stopAnim();
      // un seul pilote à la fois : les autres coordonnées sont résolues
      drivers = new Map([[c.name, Number(input.value)]]);
      div.querySelector('output').textContent = fmt(Number(input.value));
      sendPose(drivers);
    };
    box.append(div);
  }
}
function stopAnim() { if (anim) { cancelAnimationFrame(anim); anim = null; $('animate').textContent = '▶'; } }
$('animate').onclick = () => {
  if (anim) { stopAnim(); return; }
  if (!mech || !mech.coords.length) return;
  const c = mech.coords[0], t0 = performance.now();
  $('animate').textContent = '⏸';
  const step = (t) => {
    const q = c.lo + ((((t - t0) / 4000) % 1) * (c.hi - c.lo));
    drivers = new Map([[c.name, q]]);
    if (!poseInflight) sendPose(drivers);
    anim = requestAnimationFrame(step);
  };
  anim = requestAnimationFrame(step);
};

// ---------- Export STL binaire ----------
$('export-stl').onclick = () => {
  const { vertices: v, triangles: t } = lastMesh, n = t.length / 3;
  const buf = new ArrayBuffer(84 + 50 * n), dv = new DataView(buf);
  dv.setUint32(80, n, true);
  for (let i = 0; i < n; i++) {
    const o = 84 + 50 * i;
    for (let k = 0; k < 3; k++) for (let c = 0; c < 3; c++) dv.setFloat32(o + 12 + 12 * k + 4 * c, v[3 * t[3 * i + k] + c], true);
  }
  download(new Blob([buf], { type: 'model/stl' }), 'stl');
};
function download(blob, ext) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${$('example').value || 'piece'}.${ext}`; a.click();
}
$('export-3mf').onclick = () => worker.postMessage({ kind: 'export3mf', id: 0, overrides: [] });

// ---------- Exemples ----------
for (const e of EXAMPLES) $('example').append(new Option(e, e));
const BLANK = 'open Cad\n\n(* Choisissez un plan dans « Esquisse » pour commencer. *)\nlet model : Shape.t Doc.t =\n  Doc.return Shape.empty\n';
async function loadExample(name) {
  if (sketch.active) sketch.stop();
  const code = name === 'nouveau' ? BLANK : await (await fetch(`examples/${name}.ml`)).text();
  if (journal) selectFeature(null, false);
  overrides = new Map(); fitted = false; journal = null;
  $('example').value = name;
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } });
}
$('example').onchange = () => loadExample($('example').value);
loadExample('engrenage');
