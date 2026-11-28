// Black Book, chapitre 2 (Polygon : Circumscribed ; Construction) : hexagone circonscrit coté
// par son apothème ; un rectangle passé en construction (touche X) n'est plus un profil,
// puis revient, puis repart : seul l'hexagone est extrudé.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, code, cmd, triangles } from './lib.js';

test('polygone circonscrit et construction', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await cmd(page, 'Polygone circonscrit');
  await clickSketch(page, -10, 5); await clickSketch(page, -10, -1);
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, -30, -25); await clickSketch(page, -20, -15);
  const loops = () => page.evaluate(() => window.camlcadSketch.loops.length);
  await expect.poll(loops).toBe(2);
  await page.locator('[data-tool=select]').click();
  await clickSketch(page, -25, -25);
  await page.keyboard.press('x');
  await expect.poll(loops).toBe(1);
  await shot(page, '183-construction');
  await clickSketch(page, -25, -25);
  await page.getByRole('button', { name: 'Construction' }).click();
  await expect.poll(loops).toBe(2);
  await clickSketch(page, -30, -20);
  await page.keyboard.press('x');
  await expect.poll(loops).toBe(1);
  await page.locator('#sketch-extrude').click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('5');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => code(page)).toContain('point_line_distance');
  await expect.poll(() => triangles(page)).toBe(20);
  await cmd(page, 'Propriétés');
  const vol = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  expect(vol).toBeCloseTo((2 * Math.sqrt(3) * 36 * 5) / 1000, 2); // hexagone d'apothème 6
  await page.getByRole('button', { name: 'Fermer' }).click();
});
