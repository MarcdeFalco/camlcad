// Practical 4 (Black Book ch. 5, support de palier) comme un utilisateur (captures « cmp4-* ») :
// cercles tapés à main levée, arcs R20 par le centre, lignes, congés R8 dont la fin cliquée
// sur le Ø70 y reste (la bride devient un contour), bride par la région cliquée, moyeu par
// l'esquisse reprise du navigateur (redessinée) et l'anneau cliqué, plan décalé dont la
// référence se prend dans le navigateur, oreille, -14 tapé, symétrie.
import { test, expect } from './fixtures.js';
import { cmd, open, shot, sketchPoint, worldPoint, code, triangles, humanClick, humanSketch } from './lib.js';
const step = async (name, f) => f();
const boxes = (page) => page.evaluate(() => [...document.querySelectorAll('#dialog .profiles input')].map((b) => +b.checked).join(''));
const volume = async (page) => {
  await cmd(page, 'Propriétés');
  const v = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  await page.getByRole('button', { name: 'Fermer' }).click();
  return v;
};
test('Practical 4 au clic humain', async ({ page }) => {
  test.setTimeout(300000);
  await open(page);
  await page.getByRole('button', { name: 'Esquisse' }).click(); await humanClick(page, await worldPoint(page, [25, 25, 0]));
  const circle = async (x, y, d) => { await page.keyboard.press('c'); await humanSketch(page, x, y); await page.mouse.move(...await sketchPoint(page, x + d / 4, y + 1), { steps: 3 }); await page.keyboard.type(String(d)); await page.keyboard.press('Enter'); };
  const arc = async (c, a, b) => { await page.locator('[data-tool=arc]').click(); await humanSketch(page, ...c); await humanSketch(page, ...a); await humanSketch(page, ...b); };
  const line = async (a, b) => { await page.keyboard.press('l'); await humanSketch(page, ...a); await humanSketch(page, ...b); await page.keyboard.press('Escape'); };
  await step('fig. 37-40 cercles, arcs R20, lignes, congés R8', async () => {
    await circle(0, 0, 70); await circle(0, 0, 40);
    await page.mouse.move(...await sketchPoint(page, 0, 0)); for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(60); }
    await circle(-50, 0, 20); await circle(50, 0, 20); await circle(0, -50, 20);
    await shot(page, 'cmp4-37-cercles');
    await arc([-50, 0], [-50, 20], [-64.14, -14.14]);
    await arc([0, -50], [-14.14, -64.14], [14.14, -64.14]);
    await arc([50, 0], [64.14, -14.14], [50, 20]);
    await line([-64.14, -14.14], [-14.14, -64.14]);
    await line([14.14, -64.14], [64.14, -14.14]);
    await line([-50, 20], [-41.29, 20]);
    await line([41.29, 20], [50, 20]);
    await arc([-41.29, 12], [-33.61, 9.77], [-41.29, 20]);
    await arc([41.29, 12], [41.29, 20], [33.61, 9.77]); // la fin cliquée sur le Ø70
    const onCircle = await page.evaluate(() => window.camlcadSketch.cons.filter((c) => c.kind === 'on_circle' && c.refs[1] === 0).length);
    expect(onCircle).toBe(2); // les deux congés touchent le Ø70
    await shot(page, 'cmp4-40-conges');
  });
  await step('fig. 43-44 bride : région cliquée, 12', async () => {
    await page.getByRole('button', { name: "Terminer l'esquisse" }).click();
    await page.keyboard.press('e');
    await expect(page.locator('#dialog')).toContainText('4 cercles'); // contours : la bride et des lunules selon où tombent les congés
    await humanClick(page, await worldPoint(page, [-45, -25, 0]));
    expect((await boxes(page)).replace(/0/g, '')).toBe('1'); // la seule région cliquée
    await page.keyboard.type('12'); await shot(page, 'cmp4-43-bride'); await page.keyboard.press('Enter');
    await expect.poll(() => triangles(page), { timeout: 30000 }).toBeGreaterThan(0);
    await page.waitForTimeout(500); await shot(page, 'cmp4-44-bride');
  });
  const v1 = await volume(page);
  expect(v1).toBeGreaterThan(45); expect(v1).toBeLessThan(60); // bride percée
  await step('fig. 45-46 moyeu : esquisse reprise, anneau cliqué, 50', async () => {
    const before = await triangles(page);
    await page.keyboard.press('e'); await page.locator('#tree .row', { hasText: 'esquisse1' }).click();
    await expect(page.locator('#dialog')).toContainText('EXTRUSION');
    expect(await page.evaluate(() => window.camlcadView.scene.children.some((c) => c.userData?.sketch === 'esquisse1'))).toBe(true);
    await shot(page, 'cmp4-45a-esquisse');
    await humanClick(page, await worldPoint(page, [-27, -3, 0]));
    expect((await boxes(page)).replace(/0/g, '')).toBe('1'); // l'anneau Ø70 / Ø40 seul (volume vérifié plus bas)
    await page.keyboard.type('50'); await shot(page, 'cmp4-45-moyeu'); await page.keyboard.press('Enter');
    await expect.poll(() => triangles(page), { timeout: 30000 }).not.toBe(before);
    await page.locator('#home').click(); await page.waitForTimeout(500); await shot(page, 'cmp4-46-moyeu');
  });
  // π (35² − 20²) × 50 ≈ 129,6 cm³ de plus.
  await expect.poll(async () => Math.abs((await volume(page)) - v1 - 129.6)).toBeLessThan(1.5);
  await step('fig. 47 plan décalé : Plan YZ cliqué dans le navigateur, 24,5', async () => {
    await page.getByRole('button', { name: 'Plan décalé' }).click();
    await page.locator('#tree .row', { hasText: 'Plan YZ' }).click();
    await expect(page.locator('#dialog')).toContainText('PLAN DÉCALÉ'); // le dialogue reste ouvert
    await expect(page.locator('#dialog .drow', { hasText: 'Référence' }).locator('select')).toHaveValue('YZ');
    await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('24.5');
    await shot(page, 'cmp4-47-plan'); await page.getByRole('button', { name: 'OK' }).click();
    await expect.poll(() => code(page)).toContain('Geom.Plane.offset 24.5 Geom.Plane.yz');
  });
  await step('fig. 48-52 oreille', async () => {
    await page.locator('#tree .row', { hasText: /plan\d/ }).last().click();
    await expect(page.locator('#palette')).toBeVisible(); await page.waitForTimeout(500);
    await circle(55, 25, 30); await circle(55, 25, 15);
    await page.keyboard.press('l'); for (const p of [[55, 10], [25, 10], [25, 40], [55, 40]]) await humanSketch(page, ...p); await page.keyboard.press('Escape');
    await expect(page.locator('#sketch-status')).not.toContainText('⚠');
    await shot(page, 'cmp4-52-oreille');
  });
  await step('fig. 54 extrusion -14 tapée', async () => {
    await page.getByRole('button', { name: "Terminer l'esquisse" }).click(); await page.keyboard.press('e');
    await expect(page.locator('#dialog')).toContainText('EXTRUSION');
    await page.keyboard.type('-14'); await shot(page, 'cmp4-54-oreille'); await page.keyboard.press('Enter');
    await expect(page.locator('#timeline .feat')).toHaveCount(3);
  });
  await step('fig. 57-58 symétrie par le plan YZ', async () => {
    await page.locator('#timeline .feat').last().click();
    await cmd(page, 'Symétrie');
    await page.locator('#dialog .drow', { hasText: 'Plan' }).locator('select').selectOption({ label: 'Plan YZ' });
    await page.getByRole('button', { name: 'OK' }).click();
    await expect(page.locator('#timeline .feat')).toHaveCount(4);
    await page.locator('#home').click(); await page.waitForTimeout(800); await shot(page, 'cmp4-58-piece');
  });
  // Deux oreilles (30 × 30 + demi-disque Ø30 − trou Ø15) × 14, moins ce qui entre dans le moyeu.
  const v2 = await volume(page);
  expect(v2 - v1 - 129.6).toBeGreaterThan(24); expect(v2 - v1 - 129.6).toBeLessThan(30.2);
});
