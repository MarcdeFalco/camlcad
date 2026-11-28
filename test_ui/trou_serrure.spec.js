// Black Book, chapitre 2 (Trim contre un cercle) : un cercle et un rectangle qui le traverse ;
// on ajuste l'arc intérieur du cercle, puis les morceaux de lignes dans le cercle : un seul
// contour en trou de serrure (lignes et arc), extrudé : aire de l'union.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, code, cmd, triangles } from './lib.js';

test('trou de serrure par ajustement', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.locator('[data-tool=circle]').click();
  await clickSketch(page, -15, 0); await clickSketch(page, -7, 0);
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, -18, -20); await clickSketch(page, -12, -4);
  await page.keyboard.press('t');
  await clickSketch(page, -15, -8); // arc du cercle dans le rectangle
  await expect.poll(() => page.evaluate(() => [window.camlcadSketch.circles.length, window.camlcadSketch.arcs.length])).toEqual([0, 1]);
  for (const [x, y] of [[-15, -4], [-18, -5.5], [-12, -5.5]]) await clickSketch(page, x, y);
  await expect.poll(() => page.evaluate(() => window.camlcadSketch.loops.length)).toBe(1);
  await expect(page.locator('#sketch-finish')).toBeEnabled();
  await shot(page, '187-trou-serrure');
  await page.locator('#sketch-extrude').click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('5');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBeGreaterThan(20);
  expect(await code(page)).toMatch(/Sketch\.arc/);
  await cmd(page, 'Propriétés');
  const vol = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  expect(vol).toBeCloseTo(1.371, 1); // π 8² + 6 × 16 − recouvrement = 274,2 mm², × 5
  await page.getByRole('button', { name: 'Fermer' }).click();
  await page.getByRole('button', { name: 'Ajuster' }).click();
  await shot(page, '188-trou-serrure-solide');
});
