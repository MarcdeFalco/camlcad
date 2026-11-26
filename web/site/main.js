// Éditeur camlcad : code (CodeMirror) ↔ worker OCaml ↔ vue 3D (three.js).
// Disposition d'un modeleur paramétrique : barre d'outils à onglets, navigateur
// à gauche, vue au centre (cube de vue, barre de navigation), dialogues à
// droite, frise en bas, code repliable. Le code reste la seule source de vérité.
import { EditorView, basicSetup } from 'codemirror';
import { StreamLanguage } from '@codemirror/language';
import { oCaml } from '@codemirror/legacy-modes/mode/mllike';
import { setDiagnostics } from '@codemirror/lint';
import { StateEffect, StateField } from '@codemirror/state';
import { Decoration } from '@codemirror/view';
import { SketchEditor, planarFace, basePlanes, frameCode, descOf } from './sketch.js';
import { Timeline, replaceCode, notify, stlBlob, fmt } from './timeline.js';
import { Viewport } from './viewport.js';
import { Dialogs } from './dialogs.js';
import { Mech } from './mech.js';
import { codeEdits, locRangeIn } from './code_edit.js';
import { Bodies } from './bodies.js';
import { Inspect } from './inspect.js';
import { Print3D } from './print.js';
import { prepareEdit, sameCode, sketchOf, findSketch } from './sketch_parse.js';
import * as feats from './dialogs_features.js';

const $ = (id) => document.getElementById(id);
const EXAMPLES = ['nouveau', 'support', 'engrenage', 'charniere', 'patte', 'bielle', 'engrenages'];

// ---------- Worker ----------
const worker = new Worker('worker.js', { type: 'module' });
let ready = false, nextId = 1, pending = null, inflight = false;
let overrides = new Map(); // nom -> valeur (essais de paramètres non écrits)
let journal = null, lastMesh = null, selected = null, rollbackAt = null, lastStatus = '';
let sentCode = null, evaluatedCode = null; // code du dernier « eval » envoyé / dont le journal est affiché

function send(msg) {
  if (!ready) return;
  if (inflight) { pending = msg; return; }
  inflight = true;
  sentCode = msg.kind === 'eval' ? msg.code : null;
  worker.postMessage({ ...msg, id: nextId++, overrides: [...overrides] });
}
// Réécriture du code par le worker : seulement sur le code dont le journal est affiché.
const edits = new Map();
function edit(msg) {
  const code = view.state.doc.toString();
  if (inflight || pending || code !== evaluatedCode) return Promise.reject(new Error('Code en cours d\'évaluation : réessayez dans un instant.'));
  const id = nextId++;
  return new Promise((resolve) => { edits.set(id, resolve); worker.postMessage({ ...msg, kind: 'edit', id, code, overrides: [] }); });
}
function evalCode() { send({ kind: 'eval', code: view.state.doc.toString() }); }
function evalParams() { send({ kind: 'params' }); }
const featureMesh = (fid, id) => worker.postMessage({ kind: 'feature', id, fid, overrides: [] });

const t0 = performance.now();
worker.onmessage = ({ data: m }) => {
  if (m.kind === 'ready') {
    ready = true;
    $('status').textContent = `prêt en ${((performance.now() - t0) / 1000).toFixed(1)} s`;
    evalCode();
    return;
  }
  if (m.kind === 'feature') {
    if (m.id === -1) bodies.onMesh(m);
    else if (m.fid === selected) vp.setHighlight(m);
    return;
  }
  if (m.kind === 'sketch') { if (verify) { const v = verify; verify = null; openVerified(v, m); } else sketch.onSolved(m); return; }
  if (m.kind === 'edit') { edits.get(m.id)?.(m); edits.delete(m.id); return; }
  if (m.kind === 'export3mf') { download(new Blob([m.data], { type: 'model/3mf' }), '3mf'); return; }
  if (m.kind === 'pick') { if (m.fid >= 0) selectFeature(m.fid, true); return; }
  if (m.kind === 'pose') { mech.onPose(m); return; }
  inflight = false;
  const fromEval = sentCode != null;
  if (fromEval) evaluatedCode = sentCode;
  onResult(m);
  if (pending) { const p = pending; pending = null; send(p); }
};

// ---------- Code ----------
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
      if (u.selectionSet && !u.docChanged && journal && u.view.hasFocus) {
        const line = u.state.doc.lineAt(u.state.selection.main.head).number;
        const f = featureAtLine(line);
        if (f && f.id !== selected) selectFeature(f.id, false);
      }
    }),
  ],
});

const locRange = (loc) => locRangeIn(view, loc);
function featureAtLine(line) {
  let best = null;
  for (const f of journal.features) if (f.loc && f.loc.line <= line) best = f;
  return best;
}
function gotoLine(n) {
  if (!codeShown()) toggleCode();
  const line = view.state.doc.line(Math.min(n, view.state.doc.lines));
  view.dispatch({ selection: { anchor: line.from }, scrollIntoView: true });
}
const codeShown = () => !$('workspace').classList.contains('nocode');
function toggleCode() {
  const ws = $('workspace'); ws.classList.toggle('nocode');
  $('toggle-code').classList.toggle('on', codeShown());
}
$('toggle-code').onclick = toggleCode;

const { insertFeature, insertResult, insertPlane, constructionPlanes, allPlanes, nextIndex, sketchesInCode } = codeEdits({
  view, notify, changed: () => { clearTimeout(debounce); evalCode(); },
  beforeInsert: () => { if (selected != null) selectFeature(null, false); showFace(null); },
});

// ---------- Vue 3D ----------
const vp = new Viewport($('view'));
window.camlcadView = vp; // inspection (tests)
const bodies = new Bodies({ viewport: vp, featureMesh: (fid, id) => featureMesh(fid, id) });
const dialogs = new Dialogs({
  scene: vp.scene, insert: insertFeature, insertResult, nextIndex, part: () => vp.part, edit, notify, journal: () => journal,
  run: (msg, done) => timeline.run(msg, done), isEmpty: () => !journal || journal.features.length === 0,
  onClose: () => { if (picking) stopPicking(); },
});
const inspect = new Inspect({ viewport: vp, dialogs, notify, mesh: () => (rollbackAt == null ? lastMesh : null) });
const print = new Print3D({ viewport: vp, dialogs, notify, mesh: () => lastMesh, name: () => $('example').value || 'piece', download: (b, ext, name) => download(b, ext, name) });
const mech = new Mech({ viewport: vp, dialogs, pose: (d) => worker.postMessage({ kind: 'pose', id: 0, overrides: [...d] }) });

// Clic (sans glisser) : plan d'esquisse, face plane, ou feature sous la souris.
let down = null, face = null, faceMesh = null, picking = false;
const canvas = vp.renderer.domElement;
canvas.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; });
canvas.addEventListener('pointermove', (e) => { if (picking) vp.hoverPlane(vp.pickPlane(e)); if (sketch.active) sketch.move(e); });
canvas.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4 || e.button !== 0) return;
  if (sketch.active) { sketch.click(e); return; }
  if (print.active) { const h = vp.ray(e).intersectObject(print.preview)[0]; if (h) print.pickFace(planarFace(lastMesh, h.faceIndex)); return; }
  const plane = picking && vp.pickPlane(e);
  if (plane) { const P = allPlanes()[plane]; stopPicking(); startSketch(P.frame, P.code); return; }
  const hit = vp.part && !mech.active ? vp.ray(e).intersectObject(vp.part)[0] : null;
  if (hit && rollbackAt == null) {
    if (inspect.measuring) { inspect.pick(hit); return; }
    const f = planarFace(lastMesh, hit.faceIndex);
    if (holePick) { if (f) { stopHolePick(); feats.hole(dialogs, hit.point.clone(), f.frame, throughDepth(hit.point, f.frame.z)); } return; }
    if (picking) { if (f) { stopPicking(); startSketch(f.frame, frameCode(f.frame)); } return; }
    worker.postMessage({ kind: 'pick', id: 0, point: hit.point.toArray(), overrides: [] });
    showFace(f);
  } else if (!picking) { selectFeature(null, false); showFace(null); }
});

function showFace(f) {
  face = f;
  if (faceMesh) { vp.scene.remove(faceMesh); faceMesh.geometry.dispose(); faceMesh = null; }
  if (!f) return;
  const V = lastMesh.vertices, T = lastMesh.triangles, pos = [];
  for (const t of f.tris) for (let k = 0; k < 3; k++) { const i = T[3 * t + k]; pos.push(V[3 * i], V[3 * i + 1], V[3 * i + 2]); }
  faceMesh = vp.faceOverlay(pos);
}
// ---------- Esquisse ----------
const sketch = new SketchEditor({
  scene: vp.scene, camera: vp.camera, controls: vp.controls, renderer: vp.renderer,
  solve: (desc) => worker.postMessage({ kind: 'sketch', id: 0, sketch: desc, overrides: [] }),
  mode: (on) => showTab(on ? 'sketch' : null),
  finish: (data) => {
    vp.threeQuarter(data.frame);
    if (data.editing) { const b = findSketch(view.state.doc.toString(), data.editing.name); if (b) { view.dispatch({ changes: { from: b.from, to: b.to, insert: data.code } }); clearTimeout(debounce); evalCode(); } return; } dialogs[data.kind === 'revolve' ? 'revolve' : 'extrude'](data, () => sketch.resume()); },
  done: () => showFace(null),
});
window.camlcadSketch = sketch; // inspection (tests)
function startSketch(frame, code, data, editing) { dialogs.close(true); showFace(null); sketch.start(frame, code, data, editing); }
// « Modifier l'esquisse » : relue du code, vérifiée (le solveur doit réécrire exactement le même texte).
let verify = null;
function editSketch(name) {
  if (sketch.active) return;
  const r = prepareEdit(view.state.doc.toString(), name, allPlanes());
  if (typeof r === 'string') { notify(r, true); return; }
  verify = r; worker.postMessage({ kind: 'sketch', id: 0, sketch: descOf(r.data), overrides: [] });
}
function openVerified(v, m) {
  if (!m.ok || !sameCode(m.code, v.text)) { notify(`Esquisse « ${v.name} » modifiée à la main : modifiez-la dans le code.`, true); return; }
  stopPicking(); startSketch(v.frame, v.planeCode, v.data, { name: v.name });
}
function startPicking() {
  if (sketch.active) return;
  if (face) { const f = face; startSketch(f.frame, frameCode(f.frame)); return; }
  picking = true; vp.showPlanes(allPlanes());
  if (!lastMesh || !lastMesh.triangles.length) { vp.planes.updateMatrixWorld(true); vp.fit([vp.planes]); } // document vide : les trois plans entiers à l'écran
  hint('Choisissez un plan d’origine ou une face plane de la pièce (Échap pour annuler).');
}
// Perçage : un clic sur une face plane donne la position et la direction (Black Book ch. 4).
let holePick = false;
function startHolePick() {
  if (!lastMesh || !lastMesh.triangles.length) { notify('Pas de pièce à percer.', true); return; }
  holePick = true; hint('Cliquez sur une face plane, à l’endroit du perçage (Échap pour annuler).');
}
function stopHolePick() { holePick = false; hint(null); }
// « Traversant » : jusqu'au point de la pièce le plus loin sous la face, plus 1 mm.
const throughDepth = (p, n) => { const V = lastMesh.vertices; let d = 0; for (let i = 0; i < V.length; i += 3) d = Math.max(d, (p.x - V[i]) * n.x + (p.y - V[i + 1]) * n.y + (p.z - V[i + 2]) * n.z); return Math.ceil(d + 1); };
const selGeo = () => vp.highlight?.geometry;
function stopPicking() { picking = false; vp.hidePlanes(); hint(null); }
function hint(t) { $('hint').hidden = !t; $('hint').textContent = t ?? ''; }
for (const b of document.querySelectorAll('[data-tool]')) b.onclick = () => sketch.setTool(b.dataset.tool);
$('sketch-finish').onclick = () => sketch.finish();
$('sketch-revolve').onclick = () => sketch.finish('revolve');
$('sketch-cancel').onclick = () => sketch.stop();
// ---------- Barre d'outils ----------
function showTab(tab) {
  const t = tab ?? (mech.active ? 'mech' : 'solid');
  document.querySelector('[data-tab=sketch]').hidden = tab !== 'sketch';
  document.querySelector('[data-tab=mech]').hidden = !mech.active;
  for (const b of document.querySelectorAll('[data-tab]')) b.classList.toggle('on', b.dataset.tab === t);
  for (const p of document.querySelectorAll('[data-panel]')) p.hidden = p.dataset.panel !== t;
}
for (const b of document.querySelectorAll('[data-tab]')) b.onclick = () => { if (b.dataset.tab !== 'sketch' || sketch.active) showTab(sketch.active ? 'sketch' : b.dataset.tab); };
const needSel = () => { if (selected == null) notify('Sélectionnez d’abord une feature (frise, navigateur ou pièce).', true); return selected != null; };
const COMMANDS = {
  sketch: startPicking,
  extrude: () => (sketch.active ? sketch.finish() || notify('Fermez un contour ou tracez un cercle avant d’extruder.', true) : (notify('Choisissez le plan de l’esquisse à extruder.'), startPicking())),
  revolve: () => (sketch.active ? sketch.finish('revolve') || notify('Fermez un contour ou tracez un cercle avant la révolution.', true) : (notify('Esquissez d’abord le profil, puis « Révolution ».'), startPicking())),
  hole: startHolePick, thread: () => feats.threadRod(dialogs),
  pattern: () => needSel() && feats.pattern(dialogs, journal.features[selected], selGeo()),
  mirror: () => needSel() && feats.mirror(dialogs, journal.features[selected], selGeo()),
  measure: () => inspect.startMeasure(), section: () => inspect.section(), props: () => inspect.properties(),
  combine: () => feats.combine(dialogs, journal), move: () => feats.move(dialogs),
  offsetplane: () => dialogs.offsetPlane((code) => { insertPlane(code); }),
  box: () => dialogs.primitive('box'), cylinder: () => dialogs.primitive('cylinder'), sphere: () => dialogs.primitive('sphere'),
  edit: () => needSel() && dialogs.feature(selected),
  params: openParams,
  suppress: () => needSel() && timeline.run({ op: 'suppress', fid: selected, on: !journal.features[selected].suppressed }),
  delete: () => needSel() && timeline.remove(selected),
  look: () => (face ? vp.lookAt(face.frame) : notify('Cliquez d’abord une face plane de la pièce.', true)),
  fit: () => vp.fit(mech.active ? mech.state.meshes : undefined),
  motion: () => mech.panel(),
};
for (const b of document.querySelectorAll('[data-cmd]')) b.onclick = () => COMMANDS[b.dataset.cmd]();
$('animate').onclick = () => mech.toggle();
for (const b of document.querySelectorAll('[data-nav]')) b.onclick = () => {
  const n = b.dataset.nav;
  if (n === 'orbit' || n === 'pan') { vp.setMode(n); for (const x of document.querySelectorAll('[data-nav=orbit],[data-nav=pan]')) x.classList.toggle('on', x === b); }
  else if (n === 'style') vp.cycleStyle();
  else if (n === 'grid') b.classList.toggle('on', vp.toggleGrid());
  else COMMANDS[n]();
};
window.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'e') { e.preventDefault(); toggleCode(); return; }
  if (e.target.closest('input,select,textarea,.cm-editor')) return;
  if (sketch.active) { sketch.key(e); return; }
  if (e.key === 'Escape' && picking) { stopPicking(); return; }
  if (e.key === 'Escape' && holePick) { stopHolePick(); return; }
  const keys = { s: 'sketch', e: 'extrude', f: 'fit', Delete: 'delete' };
  if (keys[e.key] && !e.ctrlKey && !e.metaKey) { e.preventDefault(); COMMANDS[keys[e.key]](); }
});

// ---------- Frise et navigateur ----------
const timeline = new Timeline({
  edit, notify, select: (fid, move) => selectFeature(fid, move),
  apply: (code) => { replaceCode(view, code); clearTimeout(debounce); evalCode(); },
  openEdit: (fid, rename) => dialogs.feature(fid, rename), openParams,
  sketchOn: (k) => { const P = allPlanes()[k]; stopPicking(); startSketch(P.frame, P.code); },
  gotoLine, editSketch, sketchOf: (f) => sketchOf(view.state.doc.toString(), f.name), toggleOrigin: () => vp.toggleGrid(), originVisible: () => vp.grid.visible,
  rollback: (k) => {
    rollbackAt = k; bodies.cancel();
    vp.setHighlight(null);
    if (k == null) { if (lastMesh) vp.setPart(lastMesh); }
    else if (k === 0) vp.clearPart();
    else bodies.request(journal, k);
    const b = timeline.boundaries(); // étapes visibles de la frise
    $('status').textContent = k == null ? lastStatus : `retour à l’étape ${b.indexOf(k)} / ${b.length - 1}`;
  },
});
window.camlcadTimeline = timeline; // inspection (tests)


function selectFeature(fid, moveCursor) {
  selected = fid;
  renderTimeline();
  vp.setHighlight(null);
  if (fid == null) { view.dispatch({ effects: setFeatLine.of(null) }); return; }
  const f = journal.features[fid];
  if (f.loc) {
    view.dispatch({ effects: setFeatLine.of(f.loc.line) });
    if (moveCursor) {
      const line = view.state.doc.line(f.loc.line);
      view.dispatch({ selection: { anchor: line.from }, effects: EditorView.scrollIntoView(line.from, { y: 'center' }) });
    }
  }
  featureMesh(fid, 0);
}
function renderTimeline() {
  timeline.update(journal, selected, { doc: $('example').value, sketches: sketchesInCode(), planes: Object.keys(constructionPlanes()), mech: mech.active ? mech.state.parts : null });
}

// ---------- Paramètres ----------
function openParams() {
  const saved = new Map(overrides);
  dialogs.params({
    overrides,
    preview: (name, v) => { overrides.set(name, v); evalParams(); },
    // Écrit chaque valeur essayée à la place de son littéral par défaut.
    commit: () => {
      const changes = [];
      for (const p of journal.params) {
        const v = overrides.get(p.name);
        if (v == null || !p.loc) continue;
        let lit = fmt(v); if (!/[.e]/.test(lit)) lit += '.';
        changes.push({ ...locRange(p.loc), insert: lit });
      }
      overrides.clear();
      if (changes.length) view.dispatch({ changes }); else evalParams();
    },
    revert: () => { overrides = saved; evalParams(); },
  });
}

// ---------- Résultats ----------
function onResult(m) {
  const t = m.timings || {};
  const ntri = m.mode === 'mech' ? m.parts.reduce((n, p) => n + p.triangles.length / 3, 0) : m.triangles.length / 3;
  $('status').textContent = lastStatus = m.ok
    ? `${m.mode === 'mech' ? m.parts.length + ' pièces · ' : ''}${ntri} triangles · compilation ${(t.compile ?? 0).toFixed(0)} ms · évaluation ${((t.run ?? 0) + (t.mesh ?? 0)).toFixed(0)} ms`
    : '⚠ erreur';
  $('status').classList.toggle('err', !m.ok);
  const diags = [];
  if (m.error) {
    notify(m.error.message.trim().split('\n').slice(-3).join('\n'), true);
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
  }
  view.dispatch(setDiagnostics(view.state, diags));
  if (m.journal !== 'null') {
    journal = JSON.parse(m.journal);
    if (selected != null && selected >= journal.features.length) selected = null;
  }
  if (m.ok && m.mode === 'mech') {
    mech.show(m); lastMesh = null;
    $('export-stl').disabled = $('print3d').disabled = true; $('export-3mf').disabled = false;
  } else if (m.ok) {
    mech.clear();
    lastMesh = m;
    $('export-stl').disabled = $('export-3mf').disabled = $('print3d').disabled = false;
    if (rollbackAt == null) vp.setPart(m); else timeline.setMarker(rollbackAt);
    if (selected != null) featureMesh(selected, 0);
  }
  if (!sketch.active) showTab(null);
  renderTimeline();
}
// ---------- Export ----------
$('export-stl').onclick = () => download(stlBlob(lastMesh), 'stl');
$('print3d').onclick = () => print.open();
function download(blob, ext, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name ?? ($('example').value || 'piece')}.${ext}`; a.click();
}
$('export-3mf').onclick = () => worker.postMessage({ kind: 'export3mf', id: 0, overrides: [] });

// ---------- Exemples ----------
for (const e of EXAMPLES) $('example').append(new Option(e, e));
const BLANK = 'open Cad\n\n(* Commencez par « Esquisse » ou « Boîte » dans la barre d\'outils. *)\nlet model : Shape.t Doc.t =\n  Doc.return Shape.empty\n';
async function loadExample(name) {
  if (sketch.active) sketch.stop();
  dialogs.close(true); stopPicking();
  $("status").textContent = lastStatus = `ouverture de « ${name} »…`; $('status').classList.remove('err');
  $('export-stl').disabled = $('export-3mf').disabled = $('print3d').disabled = true; // rien à exporter avant le premier résultat
  const code = name === 'nouveau' ? BLANK : await (await fetch(`examples/${name}.ml`)).text();
  if (journal) selectFeature(null, false);
  timeline.setMarker(null); // avant de vider : remettrait l'ancienne pièce
  overrides = new Map(); vp.fitted = false; journal = null; lastMesh = null; vp.clearPart();
  $('example').value = name;
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } });
}
$('example').onchange = () => loadExample($('example').value);
if (innerWidth < 1100) toggleCode();
loadExample('engrenage');
