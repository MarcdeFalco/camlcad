// Black Book, chapitre 1 (raccourcis clavier) : « ? » montre la liste ; Q, H, M lancent
// Pousser/tirer, Perçage et Mesurer sans passer par la barre d'outils.
import { test, expect } from './fixtures.js';
import { open, shot, worldPoint, clickAt, triangles } from './lib.js';

test('raccourcis clavier', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Boîte' }).click();
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBe(12);
  await page.getByRole('button', { name: 'Ajuster' }).click();
  await page.keyboard.press('?');
  await expect(page.locator('#dialog')).toContainText('RACCOURCIS');
  await shot(page, '132-raccourcis');
  await page.keyboard.press('Escape');
  await expect(page.locator('#dialog')).toBeHidden();
  await page.keyboard.press('q');
  await expect(page.locator('#hint')).toContainText('pousser ou tirer');
  await clickAt(page, await worldPoint(page, [10, 10, 10]));
  await expect(page.locator('#dialog')).toContainText('POUSSER / TIRER');
  await page.keyboard.press('Escape');
  await page.keyboard.press('m');
  await expect(page.locator('#dialog')).toContainText('MESURER');
  await page.getByRole('button', { name: 'Fermer' }).click();
  await page.keyboard.press('h');
  await expect(page.locator('#hint')).toContainText('perçage');
});
