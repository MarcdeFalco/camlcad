// Black Book, chapitre 3 (Revolve, Symmetric) : un demi-tour (180°) symétrique de part et
// d'autre du plan d'esquisse XZ : la pièce s'étend en y de −10 à 10 et reste en x ≥ 0.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, code, triangles } from './lib.js';

const bbox = (page) => page.evaluate(() => {
  const g = window.camlcadView.part.geometry; g.computeBoundingBox();
  const r = (v) => v.toArray().map((c) => Math.round(c * 10) / 10 + 0);
  return [r(g.boundingBox.min), r(g.boundingBox.max)];
});

test('révolution symétrique', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 0, 30])); // plan XZ
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, 4, 0); await clickSketch(page, 10, 12);
  await page.locator('#sketch-revolve').click();
  await page.locator('#dialog .drow', { hasText: 'Angle' }).locator('input').fill('180');
  await page.locator('#revolve-sym').check();
  await shot(page, '193-revolution-sym');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBeGreaterThan(50);
  expect(await code(page)).toContain('|> rotate ~axis:Geom.V3.ez ~deg:(-90.)');
  await expect.poll(() => bbox(page)).toEqual([[0, -10, 0], [10, 10, 12]]);
});
