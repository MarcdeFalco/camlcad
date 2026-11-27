// Black Book, chapitre 2 (Sketch Palette : options) : accroche à la grille d'un millimètre,
// palette repliée pour dégager la zone de dessin.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt } from './lib.js';

test('palette : grille d’accroche, repli', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.locator('#snap-grid').check();
  await page.locator('[data-tool=point]').click();
  await clickSketch(page, -12.4, 7.3);
  expect(await page.evaluate(() => { const p = window.camlcadSketch.pts.at(-1); return [p.x, p.y]; })).toEqual([-12, 7]);
  // Palette repliée : la zone sous elle se dessine.
  await page.locator('#palette-head').click();
  await expect(page.locator('#sketch-status')).toBeHidden();
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, 8, 8); await clickSketch(page, 20, 20); // sous la palette dépliée
  await expect.poll(() => page.evaluate(() => window.camlcadSketch.loops.length)).toBe(1);
  await shot(page, '135-palette-repliee');
  await page.locator('#palette-head').click();
  await expect(page.locator('#sketch-status')).toBeVisible();
});
