// Black Book, chapitre 10 (Animation : Auto Explode) : vue éclatée du mécanisme
// bielle-manivelle, puis retour à l'assemblage.
import { test, expect } from './fixtures.js';
import { open, shot } from './lib.js';

test('vue éclatée', async ({ page }) => {
  await open(page, 'bielle');
  await page.getByRole('button', { name: 'MÉCANISME' }).click();
  const view = page.locator('#view canvas').first();
  await page.waitForTimeout(300);
  const before = await view.screenshot();
  await page.getByRole('button', { name: 'Éclater' }).click();
  const slider = page.locator('#explode');
  const sb = await slider.boundingBox();
  await slider.click({ position: { x: sb.width * 0.9, y: sb.height / 2 } });
  await expect.poll(async () => Number(await slider.inputValue())).toBeGreaterThan(1.5);
  await page.waitForTimeout(300);
  expect((await view.screenshot()).equals(before)).toBe(false);
  await shot(page, '114-vue-eclatee');
  await page.getByRole('button', { name: 'Fermer' }).click();
  await page.waitForTimeout(300);
  expect((await view.screenshot()).equals(before)).toBe(true); // pièces rassemblées
});
