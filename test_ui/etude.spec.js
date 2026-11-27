// Black Book, chapitre 7 (Motion Study) : bielle-manivelle, étude de mouvement à trois
// étapes (0 s : 0°, 1 s : 90°, 2 s : 30°) lue dans la vue ; la pièce bouge et s'arrête sur
// la dernière étape.
import { test, expect } from './fixtures.js';
import { open, shot, cmd } from './lib.js';

test('étude de mouvement', async ({ page }) => {
  await open(page, 'bielle');
  await expect(page.locator('#status')).toContainText('pièces');
  await page.getByRole('button', { name: 'MÉCANISME' }).click();
  await cmd(page, 'Étude');
  await expect(page.locator('#dialog')).toContainText('ÉTUDE DE MOUVEMENT');
  await page.getByRole('button', { name: '+ Étape (pose actuelle)' }).click();
  const step = (k) => page.locator('#dialog .study .drow').nth(k).locator('input');
  await expect(page.locator('#dialog .study .drow')).toHaveCount(3);
  for (const [k, t, v] of [[0, '0', '0'], [1, '1', '90'], [2, '2', '30']]) { await step(k).nth(0).fill(t); await step(k).nth(1).fill(v); }
  await shot(page, '175-etude');
  const view = page.locator('#view');
  const before = await view.screenshot();
  await page.locator('#study-play').click();
  await expect(page.locator('#study-time')).toContainText(/t = 1(\.\d+)? s/);
  await expect(page.locator('#study-time')).toContainText('t = 2 s', { timeout: 10_000 });
  await expect(page.locator('#study-time')).toContainText('= 30 °');
  await page.waitForTimeout(300);
  expect((await view.screenshot()).equals(before)).toBe(false);
  await shot(page, '176-etude-fin');
});
