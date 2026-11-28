// Black Book, chapitre 6 (Shell) : une boîte extrudée devient un bac ouvert, parois et fond de 2 mm.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, triangles, cmd } from './lib.js';

test('coque d’une extrusion', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, -25, -10); await clickSketch(page, 5, 10);
  await page.locator('#sketch-extrude').click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('15');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBe(12);
  await page.locator('#timeline .feat', { hasText: 'extrusion1' }).click();
  await cmd(page, 'Coque');
  await expect(page.locator('#dialog')).toContainText('COQUE');
  await page.locator('#dialog .drow', { hasText: 'Épaisseur' }).locator('input').fill('2');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBeGreaterThan(12);
  // 30 × 20 × 15 − 26 × 16 × 13 = 3592 mm³
  await cmd(page, 'Propriétés');
  const vol = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  expect(vol).toBeCloseTo(3.592, 2);
  await page.getByRole('button', { name: 'Fermer' }).click();
  await page.getByRole('button', { name: 'Ajuster' }).click();
  await shot(page, '128-coque');
});
