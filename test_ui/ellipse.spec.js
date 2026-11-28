// Black Book, chapitre 2 (Ellipse) : centre, grand axe, petit axe ; extrudée, volume vérifié,
// esquisse rouverte.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, code, triangles, cmd } from './lib.js';

test('ellipse', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.locator('[data-tool=ellipse]').click();
  await clickSketch(page, -10, 0); await clickSketch(page, 5, 0); await clickSketch(page, -10, 6);
  await expect(page.locator('#sketch-finish')).toBeEnabled();
  await shot(page, '136-ellipse');
  await page.locator('#sketch-extrude').click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('3');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBeGreaterThan(100);
  expect(await code(page)).toMatch(/e0 = Sketch\.ellipse p0 p1 6\./);
  await cmd(page, 'Propriétés');
  const vol = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  expect(vol).toBeCloseTo(0.848, 2); // π × 15 × 6 × 3
  await page.getByRole('button', { name: 'Fermer' }).click();
  await page.locator('#tree .row', { hasText: 'esquisse1' }).dblclick();
  await expect(page.locator('#sketch-finish')).toBeEnabled();
});
