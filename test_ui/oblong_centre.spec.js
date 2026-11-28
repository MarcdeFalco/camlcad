// Black Book, chapitre 2 (Center Point Slot) : oblong par son centre (−15, 0) et le centre
// d'une extrémité (−5, 0) : entraxe 20, rayon 20/6 ; extrudé, centré sur −15.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, triangles, cmd } from './lib.js';

test('oblong par le centre', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await cmd(page, 'Oblong centre');
  await clickSketch(page, -15, 0); await clickSketch(page, -5, 0);
  await expect(page.locator('#sketch-finish')).toBeEnabled();
  await shot(page, '197-oblong-centre');
  await page.locator('#sketch-extrude').click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('5');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBeGreaterThan(20);
  const x = await page.evaluate(() => { const g = window.camlcadView.part.geometry; g.computeBoundingBox(); return [g.boundingBox.min.x, g.boundingBox.max.x]; });
  expect((x[0] + x[1]) / 2).toBeCloseTo(-15, 1);
  await cmd(page, 'Propriétés');
  const vol = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  const r = 20 / 6;
  expect(vol).toBeCloseTo(((2 * r * 20 + Math.PI * r * r) * 5) / 1000, 1);
});
