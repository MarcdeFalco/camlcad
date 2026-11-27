// Black Book, chapitre 10 (In-canvas Render) : le style « Rendu » de la barre de navigation
// (éclairage d'ambiance, ombre portée), puis retour au style ombré avec arêtes.
import { test, expect } from './fixtures.js';
import { open, shot } from './lib.js';

test('style rendu', async ({ page }) => {
  await open(page, 'engrenage');
  const img = () => page.evaluate(() => window.camlcadView.capture());
  const before = await img();
  const style = page.locator('[data-nav=style]');
  for (let k = 0; k < 3; k++) await style.click(); // ombré, filaire, rendu
  await expect(page.locator('#notice')).toContainText('Rendu');
  expect(await page.evaluate(() => window.camlcadView.renderer.shadowMap.enabled)).toBe(true);
  expect(await img()).not.toBe(before);
  await shot(page, '133-rendu');
  await style.click(); // retour : ombré avec arêtes
  await expect(page.locator('#notice')).toContainText('Ombré avec arêtes');
  expect(await page.evaluate(() => window.camlcadView.renderer.shadowMap.enabled)).toBe(false);
});
