// Practical 3 (Black Book ch. 5, roue à rochet) comme un utilisateur (captures « cmp3-* ») :
// cercles tapés, ligne de 10 (touche L), arc par trois points coté R60 et corde 35, réseau
// circulaire ×10 (la ligne courte et l'arc se sélectionnent malgré leurs cotes), ajuster,
// moyeu extrudé symétrique 15, puis l'esquisse reprise du navigateur (redessinée) pour la
// couronne symétrique 13. Esquisse de ~90 contraintes : le code est écrit par paquets.
import { test, expect } from './fixtures.js';
import { cmd, open, shot, sketchPoint, worldPoint, code, triangles, humanClick, humanSketch } from './lib.js';
const step = async (name, f) => f();
const volume = async (page) => {
  await cmd(page, 'Propriétés');
  const v = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  await page.getByRole('button', { name: 'Fermer' }).click();
  return v;
};
const boxes = (page) => page.evaluate(() => [...document.querySelectorAll('#dialog .profiles input')].map((b) => b.checked));
test('Practical 3 au clic humain', async ({ page }) => {
  test.setTimeout(300000);
  await open(page);
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await humanClick(page, await worldPoint(page, [25, 25, 0]));
  await expect(page.locator('#palette')).toBeVisible();
  const arcMid = () => page.evaluate(() => { const s = window.camlcadSketch, a = s.arcs[0], C = s.pts[a.c], A = s.pts[a.a], B = s.pts[a.b], r = Math.hypot(A.x - C.x, A.y - C.y); let t0 = Math.atan2(A.y - C.y, A.x - C.x), t1 = Math.atan2(B.y - C.y, B.x - C.x); if (t1 < t0) t1 += 2 * Math.PI; const t = (t0 + t1) / 2; return [C.x + r * Math.cos(t), C.y + r * Math.sin(t)]; });
  await step('fig. 27 cercles Ø8, Ø20, Ø100', async () => {
    for (const [d, r] of [[100, 30], [20, 6], [8, 2]]) {
      await page.keyboard.press('c'); await humanSketch(page, 0, 0); await page.mouse.move(...await sketchPoint(page, r, 1), { steps: 3 });
      await page.keyboard.type(String(d)); await page.keyboard.press('Enter');
    }
    await page.keyboard.press('f'); await page.waitForTimeout(300);
    await page.mouse.move(...await sketchPoint(page, 0, 0)); for (let i = 0; i < 4; i++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(60); }
    await shot(page, 'cmp3-27-cercles');
  });
  await step('fig. 28 ligne de 10, arc R60 corde 35', async () => {
    await page.keyboard.press('l'); await humanSketch(page, 0, -50); await page.mouse.move(...await sketchPoint(page, 0.5, -58), { steps: 3 });
    await page.keyboard.type('10'); await page.keyboard.press('Enter'); await page.keyboard.press('Escape');
    await cmd(page, 'Arc 3 points');
    await humanSketch(page, 0, -60); await humanSketch(page, -29.15, -40.63); await humanSketch(page, -16, -52.49);
    // L'arc tracé passe là où il passe : on vise son milieu, comme on viserait le trait à l'écran.
    await page.keyboard.press('d'); await humanSketch(page, ...await arcMid());
    await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('60'); await page.keyboard.press('Enter');
    const ends = await page.evaluate(() => { const s = window.camlcadSketch, a = s.arcs[0]; return [[s.pts[a.a].x, s.pts[a.a].y], [s.pts[a.b].x, s.pts[a.b].y]]; });
    await page.keyboard.press('d'); await humanSketch(page, ...ends[0]); await humanSketch(page, ...ends[1]);
    await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('35'); await page.keyboard.press('Enter');
    await expect(page.locator('#sketch-dims .dim', { hasText: 'R60' })).toBeVisible();
    await expect(page.locator('#sketch-dims .dim', { hasText: /^35$/ })).toBeVisible();
    await shot(page, 'cmp3-28-arc-cote');
  });
  await step('fig. 29 réseau circulaire x10', async () => {
    // La ligne de 10 et l'arc se cliquent au milieu, sous leurs cotes, puis le centre (Maj).
    await page.keyboard.press('s');
    const lineMid = await page.evaluate(() => { const s = window.camlcadSketch, [a, b] = s.lines[0]; return [(s.pts[a].x + s.pts[b].x) / 2, (s.pts[a].y + s.pts[b].y) / 2]; });
    await humanSketch(page, ...lineMid); await page.keyboard.down('Shift'); await humanSketch(page, ...await arcMid()); await humanSketch(page, 0, 0); await page.keyboard.up('Shift');
    expect((await page.evaluate(() => window.camlcadSketch.sel)).map((s) => s.kind)).toEqual(['l', 'a', 'p']);
    await page.getByRole('button', { name: 'Réseau circulaire' }).click();
    await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('10'); await shot(page, 'cmp3-29-reseau'); await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => window.camlcadSketch.arcs.length)).toBe(10);
  });
  await step('fig. 30-31 ajuster', async () => {
    await page.keyboard.press('t');
    // Le morceau du Ø100 dans chaque dent, entre le pied de la ligne et le bout de l'arc, visé là où il est.
    const mid = await page.evaluate(() => { const s = window.camlcadSketch, ang = (i) => Math.atan2(s.pts[i].y, s.pts[i].x), a = s.arcs[0];
      const onC = [a.a, a.b].find((i) => Math.abs(Math.hypot(s.pts[i].x, s.pts[i].y) - 50) < 0.5), tl = ang(s.lines[0][0]), ta = ang(onC);
      let d = ta - tl; d = Math.atan2(Math.sin(d), Math.cos(d)); return tl + d / 2; });
    for (let k = 0; k < 10; k++) { const t = mid + (36 * k * Math.PI) / 180; await humanSketch(page, 50 * Math.cos(t), 50 * Math.sin(t)); }
    await expect.poll(() => page.evaluate(() => window.camlcadSketch.loops.length)).toBe(1);
    await shot(page, 'cmp3-31-ajuste');
  });
  await step('fig. 32 moyeu, région cliquée, symétrique 15', async () => {
    await page.getByRole('button', { name: "Terminer l'esquisse" }).click();
    await page.locator('#home').click(); await page.waitForTimeout(400);
    await page.keyboard.press('e');
    await expect(page.locator('#dialog')).toContainText('2 cercles'); // contours : la roue, et des lunules si un arc recoupe le Ø100
    await humanClick(page, await worldPoint(page, [7, 0, 0]));
    expect((await boxes(page)).filter(Boolean)).toHaveLength(1); // l'anneau entre Ø20 et Ø8, seul
    await page.locator('#dialog .drow', { hasText: 'Direction' }).locator('select').selectOption({ label: 'Symétrique' });
    await page.locator('#gizmo-field').click(); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('15');
    await shot(page, 'cmp3-32-moyeu'); await page.keyboard.press('Enter');
    await expect(page.locator('#timeline .feat')).toHaveCount(1);
    await expect.poll(() => triangles(page), { timeout: 60000 }).toBeGreaterThan(0); // pas de « Stack overflow »
    expect(await code(page)).toMatch(/let\* \(\) =\n\s+Sketch\.constrain/); // contraintes par paquets
  });
  await step('fig. 33-34 couronne : esquisse reprise, symétrique 13', async () => {
    const before = await triangles(page);
    await page.keyboard.press('e');
    await page.locator('#tree .row', { hasText: 'esquisse1' }).click();
    await expect(page.locator('#dialog')).toContainText('EXTRUSION');
    await page.mouse.move(...await worldPoint(page, [0, 0, 0])); for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(60); }
    // L'esquisse déjà utilisée est redessinée le temps du dialogue : on y voit la région à cliquer.
    expect(await page.evaluate(() => window.camlcadView.scene.children.some((c) => c.userData?.sketch === 'esquisse1'))).toBe(true);
    await shot(page, 'cmp3-33a-esquisse-visible');
    await humanClick(page, await worldPoint(page, [0, -35, 0]));
    expect((await boxes(page)).filter(Boolean)).toHaveLength(1); // la couronne, seule
    await page.locator('#dialog .drow', { hasText: 'Direction' }).locator('select').selectOption({ label: 'Symétrique' });
    await page.locator('#gizmo-field').click(); await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('13');
    await shot(page, 'cmp3-33-couronne'); await page.keyboard.press('Enter');
    await expect.poll(() => triangles(page), { timeout: 60000 }).toBeGreaterThan(before);
    expect(await page.evaluate(() => window.camlcadView.scene.children.some((c) => c.userData?.sketch === 'esquisse1'))).toBe(false);
    await page.locator('#home').click(); await page.waitForTimeout(500); await shot(page, 'cmp3-34-piece');
  });
  // Moyeu π(10² − 4²) × 15 ≈ 3,96 cm³ ; couronne dentée (Ø100 + 10 dents − Ø20) × 13 ≈ 118 cm³.
  const v = await volume(page);
  expect(v).toBeGreaterThan(115); expect(v).toBeLessThan(128);
});
