// Black Book, chapitre 3 (Extrude, sélection de profils) : une esquisse à deux contours,
// on n'en extrude qu'un ; l'autre reste dans l'esquisse, sans matière.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, code, triangles } from './lib.js';

test('choisir les profils à extruder', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, -30, -10); await clickSketch(page, -15, 5);
  await clickSketch(page, -5, -10); await clickSketch(page, 8, 0);
  await page.getByRole('button', { name: 'Terminer l\'esquisse' }).click();
  const boxes = page.locator('#dialog .profiles input[type=checkbox]');
  await expect(boxes).toHaveCount(2);
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('5');
  await boxes.nth(1).uncheck();
  await shot(page, '160-profils');
  await page.getByRole('button', { name: 'OK' }).click();
  // Un seul pavé (deux donneraient 24 triangles).
  await expect.poll(() => triangles(page)).toBe(12);
  const src = await code(page);
  expect(src).toContain('let%sketch esquisse');
  await page.getByRole('button', { name: 'Ajuster' }).click();
  await shot(page, '161-profils-extrusion');
});
