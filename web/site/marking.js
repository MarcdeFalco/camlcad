// Menu circulaire (« marking menu » d'un modeleur) : clic droit sans glisser dans la vue,
// commandes fréquentes en couronne autour du curseur ; Échap ou clic ailleurs le ferme.
export function markingMenu(canvas, items, enabled = () => true) {
  const menu = Object.assign(document.createElement('div'), { id: 'marking', hidden: true });
  document.body.append(menu);
  let down = null;
  canvas.addEventListener('pointerdown', (e) => { if (e.button === 2) down = [e.clientX, e.clientY]; });
  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4 || !enabled()) return;
    menu.replaceChildren(...items.map(([label, icon, run], k) => {
      const a = (2 * Math.PI * k) / items.length - Math.PI / 2, b = document.createElement('button');
      b.innerHTML = `<i>${icon}</i>${label}`;
      b.style.left = `${Math.round(120 * Math.cos(a))}px`; b.style.top = `${Math.round(85 * Math.sin(a))}px`;
      b.onclick = () => { menu.hidden = true; run(); };
      return b;
    }));
    menu.style.left = `${e.clientX}px`; menu.style.top = `${e.clientY}px`; menu.hidden = false;
  });
  addEventListener('pointerdown', (e) => { if (!menu.contains(e.target)) menu.hidden = true; }, true);
  addEventListener('keydown', (e) => { if (e.key === 'Escape') menu.hidden = true; });
}
