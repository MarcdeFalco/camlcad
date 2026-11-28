// Black Book, chapitre 2 (Extend, Break) : une ligne ouverte prolongée jusqu'au bord d'un
// rectangle ; une autre ligne coupée avec ce bord au point de croisement, puis le bout
// extérieur ajusté. Le contour passe par le nouveau sommet.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, triangles, code } from './lib.js';

test('prolonger et couper des lignes d’esquisse', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, -30, -10); await clickSketch(page, 0, 5);
  // Deux lignes verticales ouvertes sous le rectangle ; la seconde le traverse.
  await page.locator('[data-tool=poly]').click();
  await clickSketch(page, -25, -22); await clickSketch(page, -25, -16); await page.keyboard.press('Escape');
  await clickSketch(page, -12, -20); await clickSketch(page, -12, 0); await page.keyboard.press('Escape');
  await shot(page, '167-prolonger-avant');

  await page.locator('[data-tool=extend]').click();
  await clickSketch(page, -25, -17);
  await expect.poll(() => page.evaluate(() => window.camlcadSketch.cons.some((c) => c.kind === 'on_line'))).toBe(true);
  await page.locator('[data-tool=break]').click();
  await clickSketch(page, -12, -10.3);
  // Le contour (rectangle) passe par le sommet ajouté : cinq points dans la boucle.
  await expect.poll(() => page.evaluate(() => window.camlcadSketch.loops.map((l) => l.length))).toEqual([5]);
  await page.keyboard.press('t');
  await clickSketch(page, -12, -16);
  await shot(page, '168-prolonger-couper');
  await page.locator('#sketch-extrude').click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('4');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBeGreaterThan(0);
  const src = await code(page);
  expect(src).toMatch(/p\d+ = Sketch\.point \(-25\.\) \(-10\.\)/); // extrémité prolongée sur le bord
  expect(src).toMatch(/on_line p\d+ l\d+/);
});
