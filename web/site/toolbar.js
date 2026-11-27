// Barre d'outils : comme dans un modeleur, chaque groupe montre ses commandes principales ;
// les autres ([data-more]) sont dans un menu ▾ au bout du groupe.
export function groupMenus() {
  for (const tools of document.querySelectorAll('#toolbar .group .tools')) {
    const more = [...tools.querySelectorAll(':scope > [data-more]')];
    if (!more.length) continue;
    const menu = Object.assign(document.createElement('div'), { className: 'more-menu', hidden: true });
    const id = `more-${document.querySelectorAll('.more-menu').length}`;
    menu.id = id;
    const toggle = Object.assign(document.createElement('button'), { className: 'more-toggle', textContent: '▾', title: 'Plus de commandes' });
    toggle.dataset.menu = id;
    for (const b of more) { menu.append(b); b.addEventListener('click', () => { menu.hidden = true; }); }
    toggle.onclick = (e) => {
      e.stopPropagation();
      for (const m of document.querySelectorAll('.more-menu')) if (m !== menu) m.hidden = true;
      menu.hidden = !menu.hidden;
      const r = toggle.getBoundingClientRect();
      menu.style.left = `${r.left}px`; menu.style.top = `${r.bottom + 2}px`;
    };
    tools.append(toggle);
    document.body.append(menu);
  }
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('.more-menu,.more-toggle')) for (const m of document.querySelectorAll('.more-menu')) m.hidden = true; });
}

// Aide des raccourcis (touche ?), comme la liste des raccourcis d'un modeleur.
export const SHORTCUTS = [
  ['S', 'Esquisse'], ['E', 'Extrusion'], ['Q', 'Pousser / tirer'], ['H', 'Perçage'], ['M', 'Mesurer'], ['J', 'Liaison'],
  ['F', 'Ajuster la vue'], ['Suppr', 'Supprimer la feature (ou les éléments d’esquisse)'], ['Ctrl+Z / Ctrl+Maj+Z', 'Annuler / rétablir'],
  ['Ctrl+E', 'Afficher le code'], ['Clic droit (vue)', 'Menu circulaire'], ['Échap', 'Annuler la commande'],
  ['Esquisse : R L C A P D S', 'Rectangle, contour, cercle, arc, polygone, cote, sélection'],
];
export function shortcutsHelp(dialogs) {
  const rows = SHORTCUTS.map(([k, v]) => { const r = document.createElement('div'); r.className = 'drow'; r.innerHTML = '<label></label><div class="dctrl"></div>'; r.firstChild.textContent = k; r.lastChild.textContent = v; return r; });
  dialogs.open('RACCOURCIS', rows, { key: 'help', okLabel: 'Fermer', cancel: false });
}

// Palette d'esquisse repliable (comme celle d'un modeleur) : un clic sur son titre.
export function foldablePalette() {
  const head = document.getElementById('palette-head'), pal = document.getElementById('palette');
  head.onclick = () => { pal.classList.toggle('folded'); head.querySelector('.fold').textContent = pal.classList.contains('folded') ? '▸' : '▾'; };
}
