// Black Book, chapitres 2 et 3 : supprimer des éléments d'esquisse (Suppr), projeter le
// contour de la face d'appui et s'y accrocher.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, code, triangles } from './lib.js';

test('supprimer et projeter', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, -30, -10); await clickSketch(page, 0, 10);
  await page.locator('[data-tool=circle]').click();
  await clickSketch(page, -15, 0); await clickSketch(page, -12, 0);
  // Sélection du cercle, Suppr.
  await page.locator('[data-tool=select]').click();
  await clickSketch(page, -12, 0);
  await page.keyboard.press('Delete');
  await expect(page.locator('#sketch-list li')).toHaveCount(4); // H, V, H, V
  // Un côté supprimé : le contour s'ouvre, plus rien à extruder.
  await clickSketch(page, -15, -10);
  await page.keyboard.press('Delete');
  await expect(page.locator('#sketch-finish')).toBeDisabled();
  await shot(page, '109-supprimer');
  // On redessine un rectangle et on extrude.
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, -30, -25); await clickSketch(page, 0, -12);
  await page.locator('#sketch-extrude').click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('6');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBe(12);
  await page.getByRole('button', { name: 'Ajuster' }).click();

  // Esquisse sur la face du dessus, projection du contour, cercle centré sur un coin projeté.
  await clickAt(page, await worldPoint(page, [-15, -18, 6]));
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await expect(page.locator('#palette')).toBeVisible();
  await page.getByRole('button', { name: 'Projeter' }).click();
  await expect(page.locator('#sketch-project')).toBeDisabled();
  await page.locator('[data-tool=circle]').click();
  await clickSketch(page, 0, -12); await clickSketch(page, 3, -12); // coin (0, -12) projeté
  await shot(page, '110-projeter');
  await page.locator('#sketch-extrude').click();
  await page.locator('#dialog .drow', { hasText: 'Opération' }).locator('select').selectOption({ label: 'Couper' });
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('6');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBeGreaterThan(12);
  const c = await code(page);
  expect((c.match(/~fixed:true/g) ?? []).length).toBeGreaterThanOrEqual(5); // ancre + 4 coins projetés
});
