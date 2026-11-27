// Black Book, chapitre 4 (Hole from sketch points) : quatre trous de fixation Ø3,4 placés par
// des points d'esquisse sur le dessus d'une plaque.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, triangles, cmd } from './lib.js';

const field = (page, label) => page.locator('#dialog .drow', { hasText: label }).locator('input, select').first();

test('perçages aux points d’esquisse', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Boîte' }).click();
  await field(page, 'Longueur').fill('40'); await field(page, 'Largeur').fill('30'); await field(page, 'Hauteur').fill('5');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBe(12);
  await page.getByRole('button', { name: 'Ajuster' }).click();
  await clickAt(page, await worldPoint(page, [20, 15, 5]));
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await page.locator('[data-tool=point]').click();
  for (const [x, y] of [[5, 5], [35, 5], [5, 25], [35, 25]]) await clickSketch(page, x, y);
  await page.locator('#sketch-holes').click();
  await expect(page.locator('#dialog')).toContainText('4 point(s)');
  await field(page, 'Diamètre').fill('3.4');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBeGreaterThan(100);
  await cmd(page, 'Propriétés');
  const vol = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  expect(vol).toBeCloseTo(5.818, 1); // 40 × 30 × 5 − 4 × π × 1,7² × 5
  await page.getByRole('button', { name: 'Fermer' }).click();
  await shot(page, '129-percages-points');
});
