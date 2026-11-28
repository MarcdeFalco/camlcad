// Black Book, chapitre 2 (Offset) : décalage d'un contour vers l'intérieur ; la boucle
// intérieure devient un trou, l'extrusion donne une paroi (cadre) d'épaisseur choisie.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, code, triangles, cmd } from './lib.js';

test('décalage de contour : paroi', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, -30, -15); await clickSketch(page, 5, 15);
  await page.locator('[data-tool=offset]').click();
  await clickSketch(page, -12, -15); // côté du bas
  await expect(page.locator('#sketch-ask input')).toBeFocused();
  await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('3'); await page.keyboard.press('Enter');
  await expect(page.locator('#sketch-status')).not.toContainText('⚠');
  await expect(page.locator('#sketch-status')).not.toContainText('redondante');
  await shot(page, '100-decalage');
  await page.locator('#sketch-extrude').click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('10');
  await shot(page, '101-decalage-apercu');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBeGreaterThan(12);
  expect(await code(page)).toMatch(/loop \[[^\]]*\] - loop \[/);
  // Volume du cadre : (35 × 30 − 29 × 24) × 10 = 3540 mm³.
  await cmd(page, 'Propriétés');
  const vol = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  expect(vol).toBeCloseTo(3.54, 2);
  await page.getByRole('button', { name: 'Fermer' }).click();
  await shot(page, '102-cadre');
});
