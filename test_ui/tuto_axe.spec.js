// Exercice Black Book ch. 5, Practice 3 (axe tourné) : demi-profil sur le plan XZ (navigateur),
// contour de huit côtés (chanfrein, Ø60 × 50, Ø40 × 30, cône jusqu'au Ø20), Révolution autour de
// l'axe y de l'esquisse : 212,5 cm³.
import { test, expect } from './fixtures.js';
import { cmd, open, shot, clickSketch, sketchPoint, worldPoint, clickAt, code, triangles } from './lib.js';
const step = async (name, f) => f();
const row = (page, l) => page.locator('#dialog .drow', { hasText: l });
test('Practice 3 : axe tourné par révolution', async ({ page }) => {
  await open(page, 'nouveau');
  await page.locator('#tree .row', { hasText: 'Plan XZ' }).click();
  await page.mouse.move(...await sketchPoint(page, 20, 50)); for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 200); await page.waitForTimeout(60); }
  await step('profil', async () => {
    await page.getByRole('button', { name: 'Contour' }).click();
    for (const [x, y] of [[0, 0], [12.5, 0], [30, 15], [30, 65], [20, 65], [20, 95], [10, 110], [0, 110], [0, 0]]) await clickSketch(page, x, y);
    expect(await page.evaluate(() => window.camlcadSketch.loops.length)).toBe(1);
    await shot(page, '340-axe-profil');
  });
  await step('révolution', async () => {
    await page.locator('#sketch-revolve').click();
    await expect(row(page, 'Axe').locator('select')).toHaveValue('Y');
    await shot(page, '341-axe-revolution');
    await page.getByRole('button', { name: 'OK' }).click();
    await expect.poll(() => triangles(page)).toBeGreaterThan(0);
  });
  await page.locator('#home').click();
  await shot(page, '342-axe');
  await cmd(page, 'Propriétés');
  expect(Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1])).toBeCloseTo(212.5, -1);
  await page.getByRole('button', { name: 'Fermer' }).click();
  const h = await page.evaluate(() => { const g = window.camlcadView.part.geometry; g.computeBoundingBox(); return Math.round(g.boundingBox.max.z - g.boundingBox.min.z); });
  expect(h).toBe(110);
});
