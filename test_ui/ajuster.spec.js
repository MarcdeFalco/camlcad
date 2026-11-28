// Black Book, chapitre 2 (Trim) : deux rectangles qui se chevauchent ; on retire au clic les
// quatre morceaux intérieurs (touche T) et il reste un seul contour, extrudé : aire de l'union.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, triangles, cmd } from './lib.js';

test('ajuster deux rectangles en un contour', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, -30, -10); await clickSketch(page, -10, 5);
  await clickSketch(page, -20, -5); await clickSketch(page, 0, 10);
  await shot(page, '164-ajuster-avant');
  await page.keyboard.press('t');
  await expect(page.locator('[data-tool=trim]')).toHaveClass(/on/);
  for (const [x, y] of [[-10, 0], [-15, 5], [-20, 0], [-15, -5]]) await clickSketch(page, x, y);
  await expect(page.locator('#sketch-finish')).toBeEnabled();
  await shot(page, '165-ajuster-apres');
  await page.locator('#sketch-extrude').click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('5');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBeGreaterThan(12);
  // (300 + 300 − 100) mm² × 5 mm = 2,5 cm³
  await cmd(page, 'Propriétés');
  const vol = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  expect(vol).toBeCloseTo(2.5, 2);
  await page.getByRole('button', { name: 'Fermer' }).click();
  await page.getByRole('button', { name: 'Ajuster' }).click();
  await shot(page, '166-ajuster-extrusion');
});
