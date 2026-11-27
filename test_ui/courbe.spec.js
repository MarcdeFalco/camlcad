// Black Book, chapitre 2 (Spline) : une courbe lisse fermée par cinq points, extrudée ;
// l'esquisse se rouvre avec sa courbe.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, code, triangles } from './lib.js';

test('courbe lisse fermée', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.locator('[data-tool=spline]').click();
  for (const [x, y] of [[-25, 0], [-10, -12], [5, -2], [0, 12], [-18, 14], [-25, 0]]) await clickSketch(page, x, y);
  await expect(page.locator('#sketch-finish')).toBeEnabled();
  await shot(page, '134-courbe');
  await page.getByRole('button', { name: 'Terminer l\'esquisse' }).click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('4');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBeGreaterThan(60);
  expect(await code(page)).toContain('path [ spline [ p0; p1; p2; p3; p4; p0 ] ]');
  await page.locator('#tree .row', { hasText: 'esquisse1' }).dblclick();
  await expect(page.locator('#palette')).toBeVisible();
  await expect(page.locator('#sketch-finish')).toBeEnabled(); // la courbe relue forme un contour
  await page.getByRole('button', { name: 'Abandonner' }).click();
});
