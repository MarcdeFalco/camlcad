// Black Book, chapitre 3 (Construction : Midplane, Plane at Angle) et annuler / rétablir.
import { test, expect } from './fixtures.js';
import { open, shot, worldPoint, clickAt, code, triangles, cmd } from './lib.js';

const field = (page, label) => page.locator('#dialog .drow', { hasText: label }).locator('input, select').first();

test('plan milieu, plan à un angle, annuler et rétablir', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Boîte' }).click();
  await field(page, 'Longueur').fill('30'); await field(page, 'Largeur').fill('20'); await field(page, 'Hauteur').fill('10');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBe(12);
  await page.getByRole('button', { name: 'Ajuster' }).click();
  // Plan milieu : la face avant et le dessus ne sont pas parallèles (refus) ; le dessus et
  // le dessous le sont (le dessous se clique après une vue de dessous au cube).
  await cmd(page, 'Plan milieu');
  await clickAt(page, await worldPoint(page, [15, 0, 5]));
  await clickAt(page, await worldPoint(page, [15, 10, 10]));
  await expect(page.locator('#notice')).toContainText('pas parallèles');
  await cmd(page, 'Plan milieu');
  await clickAt(page, await worldPoint(page, [15, 10, 10]));
  await page.locator('.cubeface', { hasText: 'Avant' }).click();
  await page.locator('#viewcube .cubearrow.down').click();
  await page.waitForTimeout(400);
  await clickAt(page, await worldPoint(page, [15, 10, 0]));
  await expect.poll(() => code(page)).toMatch(/let plan\d+ = \(\* construction \*\) Geom\.Frame\.make ~origin:\(Geom\.V3\.v [\d.]+ [\d.]+ 5\.\)/);
  await expect(page.locator('#tree .row', { hasText: 'Construction (1)' })).toBeVisible();
  await page.locator('#home').click();
  // Plan à un angle : XY tourné de 30° autour de x.
  await cmd(page, 'Plan à un angle');
  await field(page, 'Angle').fill('30');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('#tree .row', { hasText: 'Construction (2)' })).toBeVisible();
  await shot(page, '118-plans-construction');
  // Annuler (Ctrl+Z hors du code) puis rétablir (bouton).
  await page.locator('#view canvas').first().click({ position: { x: 20, y: 20 } });
  await page.keyboard.press('ControlOrMeta+Z');
  await expect(page.locator('#tree .row', { hasText: 'Construction (1)' })).toBeVisible();
  await page.locator('#redo').click();
  await expect(page.locator('#tree .row', { hasText: 'Construction (2)' })).toBeVisible();
});
