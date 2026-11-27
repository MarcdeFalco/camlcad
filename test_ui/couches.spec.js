// Impression 3D (Black Book ch. 1, 3D Print ; aperçu des couches comme un trancheur) :
// équerre de 30 mm de haut, 150 couches de 0,2 mm ; première couche (contour de la semelle),
// couche du milieu, puis couches de 0,3 mm.
import { test, expect } from './fixtures.js';
import { open, shot } from './lib.js';

test('aperçu des couches', async ({ page }) => {
  await open(page, 'support');
  await page.getByRole('button', { name: 'Impression 3D' }).click();
  const info = page.locator('#print-layer-info');
  await expect(info).toContainText('Couche 150 / 150');
  const slider = page.locator('#print-layer');
  await slider.focus();
  await page.keyboard.press('Home');
  await expect(info).toContainText('Couche 1 / 150 · z = 0.1 mm');
  const len = async () => Number((await info.textContent()).match(/contour (\d+) mm/)[1]);
  expect(await len()).toBeGreaterThan(170); // 60 × 25 et les trous de la semelle
  await shot(page, '181-couche-1');
  await page.keyboard.press('PageUp'); // +10 % des couches
  for (let i = 0; i < 6; i++) await page.keyboard.press('PageUp');
  await expect(info).toContainText(/Couche (10[0-9]|11[0-9]) \/ 150/);
  await shot(page, '182-couche-milieu');
  await page.locator('#dialog .drow', { hasText: 'Couches' }).locator('select').selectOption('0.3');
  await expect(info).toContainText('Couche 100 / 100');
});
