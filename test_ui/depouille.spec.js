// Black Book, chapitre 3 (Extrude, Taper Angle) : un carré de 20 extrudé de 10 avec une
// dépouille de atan(0,5) ≈ 26,565° : tronc de pyramide 20 → 10, volume 2333 mm³.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, triangles, code, cmd } from './lib.js';

test('extrusion avec dépouille', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, -25, -10); await clickSketch(page, -5, 10);
  await page.locator('#sketch-extrude').click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('10');
  await page.locator('#dialog .drow', { hasText: 'Dépouille' }).locator('input').fill('26.565051');
  await shot(page, '173-depouille');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBeGreaterThan(0);
  expect(await code(page)).toContain('Shape.(extrude ~taper:26.565051 ~h:10. esquisse1');
  await cmd(page, 'Propriétés');
  const vol = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  expect(vol).toBeCloseTo(2.333, 2);
  await page.getByRole('button', { name: 'Fermer' }).click();
  await page.getByRole('button', { name: 'Ajuster' }).click();
  await shot(page, '174-depouille-solide');
});
