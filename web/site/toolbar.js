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
