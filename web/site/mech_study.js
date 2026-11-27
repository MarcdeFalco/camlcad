// Étude de mouvement (Black Book ch. 7, Motion Study) : une articulation menante, des étapes
// (temps en s, valeur) ; « Lire » interpole linéairement entre les étapes et pilote le
// mécanisme (les autres coordonnées sont résolues), une fois, puis s'arrête sur la dernière.
import { el, fmt } from './timeline.js';
import { choice, row } from './dialogs.js';

export function motionStudy(mech, d) {
  const s = mech.state;
  if (!s || !s.coords.length) { d.ctx.notify('Étude de mouvement : ouvrez un mécanisme.', true); return; }
  const P = { joint: s.coords[0].name, steps: [] };
  const coord = () => s.coords.find((c) => c.name === P.joint);
  const reset = () => { const c = coord(); P.steps = [{ t: 0, v: c.lo }, { t: 2, v: c.hi }]; };
  reset();
  const table = el('div', { className: 'study' }), out = el('div', { className: 'hint', id: 'study-time', textContent: '' });
  const num = (value, on) => { const i = el('input', { type: 'number', step: 'any', value: fmt(value), className: 'noenter' }); i.oninput = () => { const x = Number(i.value); if (i.value !== '' && Number.isFinite(x)) on(x); }; return i; };
  const draw = () => table.replaceChildren(...P.steps.map((st, k) => el('div', { className: 'drow' },
    el('label', { textContent: `Étape ${k + 1}` }),
    el('div', { className: 'dctrl' }, num(st.t, (x) => { st.t = x; }), el('span', { className: 'unit', textContent: 's' }), num(st.v, (x) => { st.v = x; }), el('span', { className: 'unit', textContent: coord().unit }),
      Object.assign(el('button', { textContent: '✕', title: 'Retirer l’étape' }), { onclick: () => { if (P.steps.length > 2) { P.steps.splice(k, 1); draw(); } } })))));
  // Valeur au temps t : interpolation linéaire entre les étapes triées.
  const at = (t) => {
    const st = [...P.steps].sort((a, b) => a.t - b.t);
    if (t <= st[0].t) return st[0].v;
    for (let k = 1; k < st.length; k++) if (t <= st[k].t) { const a = st[k - 1], b = st[k], u = (t - a.t) / (b.t - a.t || 1); return a.v + u * (b.v - a.v); }
    return st[st.length - 1].v;
  };
  const play = () => {
    mech.stop();
    const end = Math.max(...P.steps.map((x) => x.t)), t0 = performance.now();
    const tick = (now) => {
      const t = Math.min(end, (now - t0) / 1000), v = at(t);
      mech.drivers = new Map([[P.joint, v]]);
      out.textContent = `t = ${fmt(t)} s · ${P.joint} = ${fmt(v)} ${coord().unit}`;
      mech.send(mech.drivers);
      if (t < end) mech.anim = requestAnimationFrame(tick); else mech.anim = null;
    };
    mech.anim = requestAnimationFrame(tick);
  };
  const add = Object.assign(el('button', { textContent: '+ Étape (pose actuelle)' }), {
    onclick: () => { const last = Math.max(...P.steps.map((x) => x.t)); P.steps.push({ t: last + 1, v: s.pose.get(P.joint) ?? coord().lo }); draw(); },
  });
  d.open('ÉTUDE DE MOUVEMENT', [
    row('Menante', choice(Object.fromEntries(s.coords.map((c) => [c.name, c.name])), P.joint, (v) => { P.joint = v; reset(); draw(); })),
    table,
    el('div', { className: 'drow' }, add, Object.assign(el('button', { className: 'primary', textContent: '▶ Lire', id: 'study-play' }), { onclick: play })),
    out,
  ], { key: 'study', okLabel: 'Fermer', cancel: false });
  draw();
}
