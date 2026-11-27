// Black Book, chapitre 6 (Parameters) : des cotes d'esquisse écrites avec un paramètre
// (« largeur », « largeur/2 ») ; changer le paramètre change la pièce ; l'esquisse se rouvre.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, code } from './lib.js';

const size = (page) => page.evaluate(() => { const g = window.camlcadView.part?.geometry; if (!g) return null; g.computeBoundingBox(); const s = g.boundingBox.getSize(g.boundingBox.min.clone()); return [Math.round(s.x), Math.round(s.y)]; });

test('cotes en expression de paramètres', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Paramètres' }).click();
  await page.locator('#param-new-name').fill('largeur'); await page.locator('#param-new-value').fill('40');
  await page.getByRole('button', { name: '+ Ajouter' }).click();
  await expect.poll(() => code(page)).toContain('let%param largeur = 40.');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, -25, -10); await clickSketch(page, 5, 10);
  await page.locator('[data-tool=dim]').click();
  await clickSketch(page, -10, -10);
  await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('largeur'); await page.keyboard.press('Enter');
  await clickSketch(page, -25, 0); // côté gauche (le droit est parti à x = 15)
  await expect(page.locator('#sketch-ask input')).toBeFocused();
  await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('largeur/2'); await page.keyboard.press('Enter');
  await expect(page.locator('#sketch-dims .dim.fx')).toHaveCount(2);
  await shot(page, '131-cotes-parametres');
  await page.getByRole('button', { name: 'Terminer l\'esquisse' }).click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('5');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => size(page)).toEqual([40, 20]);
  expect(await code(page)).toMatch(/length l\d+ \(largeur \/\. 2\.\)/);
  // Le paramètre passe à 50 : la pièce suit (50 × 25).
  await page.getByRole('button', { name: 'Paramètres' }).click();
  await page.locator('#dialog .prow', { hasText: 'largeur' }).locator('input[type=number]').first().fill('50');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => size(page)).toEqual([50, 25]);
  // L'esquisse se rouvre avec ses cotes liées.
  await page.locator('#tree .row', { hasText: 'esquisse1' }).dblclick();
  await expect(page.locator('#sketch-dims .dim.fx')).toHaveCount(2);
  await expect(page.locator('#sketch-dims .dim.fx', { hasText: '50' })).toBeVisible();
});
