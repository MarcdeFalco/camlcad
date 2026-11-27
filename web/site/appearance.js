// Apparence (Black Book ch. 6 et 10, Appearance) : couleur et matière de la pièce affichée
// (filaments courants, métaux, PETG translucide), gardée dans le navigateur.
import { el } from './timeline.js';
import { row } from './dialogs.js';

const KEY = 'camlcad-apparence';
export const LOOKS = {
  gris: ['Gris (défaut)', 0x8c9aa8, 0.5, 0.1, 1], blanc: ['PLA blanc', 0xf0efe9, 0.6, 0, 1], noir: ['PLA noir', 0x2b2d31, 0.55, 0, 1],
  rouge: ['PLA rouge', 0xc9302c, 0.5, 0, 1], orange: ['PLA orange', 0xe8792b, 0.5, 0, 1], jaune: ['PLA jaune', 0xf2c230, 0.5, 0, 1],
  vert: ['PLA vert', 0x3c9a4f, 0.5, 0, 1], bleu: ['PLA bleu', 0x2f6fd0, 0.5, 0, 1], petg: ['PETG translucide', 0x9fd3e6, 0.2, 0, 0.55],
  alu: ['Aluminium', 0xc8ccd2, 0.3, 0.9, 1], laiton: ['Laiton', 0xc9a43c, 0.3, 0.9, 1],
};

// Apparence enregistrée (au démarrage) ou choisie.
export function applyLook(vp, key = localStorage.getItem(KEY) ?? 'gris') {
  const l = LOOKS[key] ?? LOOKS.gris;
  vp.setAppearance(key === 'gris' ? null : { color: l[1], roughness: l[2], metalness: l[3], opacity: l[4] });
  return key;
}

export function appearanceDialog(d, vp) {
  let cur = localStorage.getItem(KEY) ?? 'gris';
  const swatch = (k, l) => {
    const b = el('button', { title: l[0], className: 'swatch' + (k === cur ? ' on' : '') });
    b.dataset.look = k; b.style.background = `#${l[1].toString(16).padStart(6, '0')}`; if (l[4] < 1) b.style.opacity = '0.6';
    return b;
  };
  const swatches = el('div', { className: 'swatches', id: 'looks' }, ...Object.entries(LOOKS).map(([k, l]) => Object.assign(swatch(k, l), { onclick: () => { cur = applyLook(vp, k); try { localStorage.setItem(KEY, k); } catch { /* stockage plein */ } for (const b of swatches.children) b.classList.toggle('on', b.dataset.look === k); name.textContent = l[0]; } })));
  const name = el('span', { className: 'hint', id: 'look-name', textContent: LOOKS[cur][0] });
  d.open('APPARENCE', [row('Matière', name), swatches], { key: 'appearance', okLabel: 'Fermer', cancel: false });
}
