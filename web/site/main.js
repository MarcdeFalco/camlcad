// Éditeur camlcad : code (CodeMirror) ↔ worker OCaml ↔ vue 3D (three.js).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EditorView, basicSetup } from 'codemirror';
import { StreamLanguage } from '@codemirror/language';
import { oCaml } from '@codemirror/legacy-modes/mode/mllike';
import { setDiagnostics } from '@codemirror/lint';
import { StateEffect, StateField } from '@codemirror/state';
import { Decoration } from '@codemirror/view';

const $ = (id) => document.getElementById(id);
const EXAMPLES = ['support', 'engrenage', 'charniere'];

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

function fit(g) {
  g.computeBoundingSphere();
  const { center, radius } = g.boundingSphere;
  controls.target.copy(center);
  camera.position.copy(center).add(new THREE.Vector3(1, -1.5, 1.1).normalize().multiplyScalar(radius * 3.2));
}

// ---------- Résultats ----------
function onResult(m) {
  const t = m.timings || {};
  $('status').textContent = m.ok
    ? `${m.triangles.length / 3} triangles · compil ${(t.compile ?? 0).toFixed(0)} ms · évaluation ${(t.run + t.mesh).toFixed(0)} ms`
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
  if (m.ok) {
    lastMesh = m;
    $('export-stl').disabled = false;
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

// ---------- Export STL binaire ----------
$('export-stl').onclick = () => {
  const { vertices: v, triangles: t } = lastMesh, n = t.length / 3;
  const buf = new ArrayBuffer(84 + 50 * n), dv = new DataView(buf);
  dv.setUint32(80, n, true);
  for (let i = 0; i < n; i++) {
    const o = 84 + 50 * i;
    for (let k = 0; k < 3; k++) for (let c = 0; c < 3; c++) dv.setFloat32(o + 12 + 12 * k + 4 * c, v[3 * t[3 * i + k] + c], true);
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([buf], { type: 'model/stl' }));
  a.download = `${$('example').value || 'piece'}.stl`; a.click();
};

// ---------- Exemples ----------
for (const e of EXAMPLES) $('example').append(new Option(e, e));
async function loadExample(name) {
  const code = await (await fetch(`examples/${name}.ml`)).text();
  if (journal) selectFeature(null, false);
  overrides = new Map(); fitted = false; journal = null;
  $('example').value = name;
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } });
}
$('example').onchange = () => loadExample($('example').value);
loadExample(EXAMPLES[1]);
