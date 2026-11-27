// Black Book, chapitres 6 et 10 (Appearance) : l'équerre en PLA rouge, puis en aluminium ;
// l'apparence choisie revient après rechargement de la page.
import { test, expect } from './fixtures.js';
import { open, shot, cmd } from './lib.js';

const look = (page) => page.evaluate(() => { const m = window.camlcadView.material; return [m.color.getHex(), m.metalness]; });

test('apparence de la pièce', async ({ page }) => {
  await open(page, 'support');
  await cmd(page, 'Apparence');
  await expect(page.locator('#dialog')).toContainText('APPARENCE');
  await page.locator('#looks [data-look=rouge]').click();
  await expect(page.locator('#look-name')).toHaveText('PLA rouge');
  expect(await look(page)).toEqual([0xc9302c, 0]);
  await shot(page, '190-apparence-rouge');
  await page.locator('#looks [data-look=alu]').click();
  expect(await look(page)).toEqual([0xc8ccd2, 0.9]);
  await page.getByRole('button', { name: 'Fermer' }).click();
  await page.reload();
  await expect(page.locator('#status')).toContainText('triangles', { timeout: 90_000 });
  expect(await look(page)).toEqual([0xc8ccd2, 0.9]);
  await shot(page, '191-apparence-alu');
});
