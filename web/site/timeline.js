// Frise des features (façon Fusion 360), menu contextuel et panneau « Modifier ».
// Toute action devient une réécriture du code par le worker (Cad.Source_edit) :
// le code reste la seule source de vérité, et Ctrl+Z dans le code annule.

const ICONS = {
  cube: '▣', cylinder: '◎', sphere: '●', extrude: '⬆', revolve: '↻', union: '∪',
  difference: '∖', intersection: '∩', mirror: '⇋', empty: '∅',
};
const KIND = {
  cube: 'pavé', cylinder: 'cylindre', sphere: 'sphère', extrude: 'extrusion', revolve: 'révolution',
  union: 'union', difference: 'enlèvement', intersection: 'intersection', mirror: 'symétrie', empty: 'vide',
};
const fmt = (x) => (Math.abs(x) >= 100 ? x.toFixed(0) : Number(x.toPrecision(4)).toString());
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };

export class Timeline {
  // edit(msg) -> Promise<réponse du worker> ; apply(code) ; select(fid, moveCursor) ; notify(texte, erreur?)
  constructor({ bar, tree, panel, menu, edit, apply, select, notify }) {
    Object.assign(this, { bar, tree, panel, menu, edit, apply, select, notify });
    this.journal = null; this.selected = null; this.open = null;
    document.addEventListener('pointerdown', (e) => { if (!this.menu.contains(e.target)) this.hideMenu(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') this.hideMenu(); });
  }

  // refresh : le code a changé, le panneau ouvert relit ses cotes.
  update(journal, selected, refresh) {
    this.journal = journal; this.selected = selected;
    this.renderBar(); this.renderTree();
    if (refresh && this.open != null) {
      // Le panneau suit la feature par son nom (son numéro peut changer).
      const f = journal.features.find((g) => g.name === this.open.name) ?? journal.features[this.open.id];
      if (f) this.openPanel(f.id, false); else this.closePanel();
    }
  }

  chip(f, cls) {
    const deps = f.deps.map((d) => this.journal.features[d].name).join(', ');
    const e = el(cls === 'li' ? 'li' : 'button', { className: 'feat' + (f.suppressed ? ' off' : '') + (f.id === this.selected ? ' sel' : '') });
    e.title = `${f.name} : ${KIND[f.op] ?? f.op}${deps ? ' ← ' + deps : ''}${f.suppressed ? ' (supprimée temporairement)' : ''}\nDouble-clic : modifier · clic droit : actions`;
    e.append(el('span', { className: 'icon', textContent: ICONS[f.op] ?? '◇' }), el('span', { className: 'name', textContent: f.name }));
    if (cls === 'li' && deps) e.append(el('span', { className: 'deps', textContent: ' ← ' + deps }));
    e.onclick = () => this.select(f.id === this.selected ? null : f.id, true);
    e.ondblclick = (ev) => { ev.preventDefault(); this.select(f.id, true); this.openPanel(f.id, true); };
    e.oncontextmenu = (ev) => { ev.preventDefault(); this.select(f.id, true); this.showMenu(f, ev.clientX, ev.clientY); };
    return e;
  }

  renderBar() {
    this.bar.replaceChildren();
    if (!this.journal || !this.journal.features.length) { this.bar.hidden = true; return; }
    this.bar.hidden = false;
    this.journal.features.forEach((f) => this.bar.append(this.chip(f, 'chip')));
  }

  renderTree() {
    this.tree.replaceChildren();
    if (!this.journal) return;
    for (const f of this.journal.features) {
      const li = this.chip(f, 'li');
      const eye = el('button', { className: 'eye', textContent: f.suppressed ? '◌' : '●', title: f.suppressed ? 'Réactiver' : 'Supprimer temporairement' });
      eye.onclick = (ev) => { ev.stopPropagation(); this.run({ op: 'suppress', fid: f.id, on: !f.suppressed }); };
      li.prepend(eye);
      this.tree.append(li);
    }
  }

  showMenu(f, x, y) {
    const items = [
      ['Modifier…', () => this.openPanel(f.id, true)],
      ['Renommer…', () => { this.openPanel(f.id, true); this.panel.querySelector('.rename input')?.select(); }],
      [f.suppressed ? 'Réactiver' : 'Supprimer temporairement', () => this.run({ op: 'suppress', fid: f.id, on: !f.suppressed })],
      ['Supprimer', () => this.run({ op: 'delete', fid: f.id }, `« ${f.name} » supprimée (Ctrl+Z dans le code pour annuler)`)],
    ];
    this.menu.replaceChildren(...items.map(([label, act]) => {
      const b = el('button', { textContent: label });
      b.onclick = () => { this.hideMenu(); act(); };
      return b;
    }));
    this.menu.hidden = false;
    const r = this.menu.getBoundingClientRect();
    this.menu.style.left = Math.min(x, innerWidth - r.width - 4) + 'px';
    this.menu.style.top = Math.min(y, innerHeight - r.height - 4) + 'px';
  }
  hideMenu() { this.menu.hidden = true; }

  // Envoie une réécriture ; applique le code rendu, ou affiche le refus.
  async run(msg, done) {
    let r;
    try { r = await this.edit(msg); } catch (e) { this.notify(e.message, true); return null; }
    if (!r.ok) { this.notify(r.error, true); return null; }
    if (r.code != null) { this.apply(r.code); if (done) this.notify(done, false); }
    return r;
  }

  async openPanel(fid, focus) {
    const f = this.journal.features[fid];
    this.open = { id: fid, name: f.name };
    let r;
    try { r = await this.edit({ op: 'literals', fid }); } catch { return; } // code en cours d'évaluation
    if (!r.ok || this.open?.name !== f.name) return;
    const p = this.panel;
    p.hidden = false;
    const title = el('h2', { textContent: `Modifier · ${KIND[f.op] ?? f.op}` });
    const close = el('button', { textContent: '×', title: 'Fermer', className: 'close' });
    close.onclick = () => this.closePanel();
    title.append(close);
    const name = el('input', { value: f.name, spellcheck: false });
    const rename = el('div', { className: 'rename' }, name);
    name.onkeydown = (e) => { if (e.key === 'Enter' && name.value !== f.name) this.run({ op: 'rename', fid, name: name.value }).then((ok) => { if (ok) this.open.name = name.value; }); };
    name.onblur = () => { name.value = f.name; };
    const sup = el('label', { className: 'hint' }, el('input', { type: 'checkbox', checked: f.suppressed }), ' supprimée temporairement');
    sup.querySelector('input').onchange = (e) => this.run({ op: 'suppress', fid, on: e.target.checked });
    const rows = r.literals.map((l, i) => this.literalRow(f, l, i));
    const none = rows.length ? [] : [el('div', { className: 'hint', textContent: 'Aucune cote littérale : elle dépend seulement de paramètres et de features.' })];
    p.replaceChildren(title, rename, sup, ...rows, ...none);
    if (focus) p.scrollIntoView({ block: 'nearest' });
  }
  closePanel() { this.open = null; this.panel.hidden = true; this.panel.replaceChildren(); }

  literalRow(f, l, i) {
    const input = el('input', { type: 'number', value: l.value, step: l.int ? 1 : 'any' });
    const commit = () => {
      const v = Number(input.value);
      if (input.value !== '' && Number.isFinite(v) && v !== l.value) this.run({ op: 'set_literal', fid: f.id, index: i, value: v });
    };
    input.onchange = commit;
    input.onkeydown = (e) => { if (e.key === 'Enter') commit(); };
    const ctx = el('code', { className: 'ctx', title: l.before + l.text + l.after });
    ctx.append('…' + l.before, el('b', { textContent: l.text }), l.after + '…');
    const promote = el('button', { textContent: '→ paramètre', title: 'Remplacer cette cote par un let%param (curseur)' });
    promote.onclick = () => {
      const suggested = `${f.name}_${(l.label ?? '').replace(/[~?]/g, '') || 'cote' + (i + 1)}`;
      const name = el('input', { value: suggested, spellcheck: false });
      const ok = el('button', { textContent: 'créer' });
      const go = () => this.run({ op: 'promote', fid: f.id, index: i, name: name.value }, `paramètre « ${name.value} » créé`);
      ok.onclick = go; name.onkeydown = (e) => { if (e.key === 'Enter') go(); };
      promote.replaceWith(el('span', { className: 'promote' }, name, ok));
      name.select();
    };
    return el('div', { className: 'lit' },
      el('div', { className: 'lit-head' }, el('span', { textContent: l.label ? l.label.slice(1) + (l.label === '~deg' ? ' (°)' : '') : `cote ${i + 1}` }), input),
      ctx, el('div', {}, promote));
  }
}

// ---------- Utilitaires de l'éditeur ----------

// Remplace le code en ne touchant que la partie modifiée (curseur et historique préservés).
export function replaceCode(view, code) {
  const old = view.state.doc.toString();
  let a = 0; while (a < old.length && a < code.length && old[a] === code[a]) a++;
  let z = 0; while (z < old.length - a && z < code.length - a && old[old.length - 1 - z] === code[code.length - 1 - z]) z++;
  view.dispatch({ changes: { from: a, to: old.length - z, insert: code.slice(a, code.length - z) } });
}

let noticeTimer = null;
export function notify(text, isError) {
  const n = document.getElementById('notice');
  n.textContent = text; n.className = isError ? 'err' : ''; n.hidden = false;
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { n.hidden = true; }, isError ? 7000 : 3500);
}

// STL binaire d'un maillage {vertices, triangles}.
export function stlBlob({ vertices: v, triangles: t }) {
  const n = t.length / 3, buf = new ArrayBuffer(84 + 50 * n), dv = new DataView(buf);
  dv.setUint32(80, n, true);
  for (let i = 0; i < n; i++) {
    const o = 84 + 50 * i;
    for (let k = 0; k < 3; k++) for (let c = 0; c < 3; c++) dv.setFloat32(o + 12 + 12 * k + 4 * c, v[3 * t[3 * i + k] + c], true);
  }
  return new Blob([buf], { type: 'model/stl' });
}
