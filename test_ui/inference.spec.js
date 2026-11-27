// Black Book, chapitre 2 (contraintes implicites) : un point posé au milieu d'une ligne ou
// sur une ligne y est contraint ; la cote du rectangle change, la ligne suit son milieu.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, sketchPoint, worldPoint, clickAt } from './lib.js';

test('accroches milieu et sur la ligne', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, -30, -10); await clickSketch(page, 0, 10);
  // Ligne du milieu du côté du bas à un point du côté du haut.
  await page.locator('[data-tool=poly]').click();
  await clickSketch(page, -15, -10); await clickSketch(page, -8, 10); await page.keyboard.press('Escape');
  await expect(page.locator('#sketch-list')).toContainText('Milieu');
  await expect(page.locator('#sketch-list')).toContainText('Sur la droite');
  // Largeur portée à 40 : le pied de la ligne reste au milieu (x = −10).
  await page.locator('[data-tool=dim]').click();
  await clickSketch(page, -22, -10);
  await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('40'); await page.keyboard.press('Enter');
  await expect.poll(() => page.evaluate(() => { const s = window.camlcadSketch; const l = s.lines[s.lines.length - 1]; return Math.round(s.pts[l[0]].x * 10) / 10; })).toBe(-10);
  await shot(page, '127-inference');
});
