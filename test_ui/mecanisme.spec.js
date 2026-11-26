// Scénario 5 : mécanisme bielle-manivelle. Onglet MÉCANISME, animation, curseur de mouvement.
import { test, expect } from './fixtures.js';
import { open, shot } from './lib.js';

test('mécanisme : animation et mouvement', async ({ page }) => {
  await open(page, 'bielle');
  await expect(page.locator('#status')).toContainText('pièces');
  await expect(page.getByRole('button', { name: 'MÉCANISME' })).toBeVisible();
  await page.getByRole('button', { name: 'MÉCANISME' }).click();
  await shot(page, '30-mecanisme');
  const view = page.locator('#view');
  await page.getByRole('button', { name: 'Animer' }).click();
  await page.waitForTimeout(700);
  const a = await view.screenshot();
  await page.waitForTimeout(900);
  const b = await view.screenshot();
  await page.screenshot({ path: new URL('./shots/31-animation.png', import.meta.url).pathname });
  expect(a.equals(b)).toBe(false); // la pièce a bougé
  await page.getByRole('button', { name: 'Animer' }).click(); // pause
  // Mouvement : curseur glissé à la souris.
  await page.getByRole('button', { name: 'Mouvement' }).click();
  const slider = page.locator('#dialog input[type=range]').first();
  await expect(slider).toBeVisible();
  const before = await slider.inputValue();
  const sb = await slider.boundingBox();
  await page.mouse.click(sb.x + sb.width * 0.8, sb.y + sb.height / 2);
  await expect.poll(() => slider.inputValue()).not.toBe(before);
  await expect(page.locator('#inter')).toContainText(/interférence/i);
  await shot(page, '32-mouvement');
});
