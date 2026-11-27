// Black Book, chapitre 8 (Inspect) pour l'impression 3D : un bac à parois de 1 mm (coque) ;
// l'analyse d'épaisseur trouve 1 mm et colore les parois sous le seuil de 1,2 mm.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, triangles, cmd } from './lib.js';

test('analyse d’épaisseur', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, -25, -10); await clickSketch(page, 5, 10);
  await page.getByRole('button', { name: 'Terminer l\'esquisse' }).click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('15');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBe(12);
  await page.locator('#timeline .feat', { hasText: 'extrusion1' }).click();
  await cmd(page, 'Coque');
  await page.locator('#dialog .drow', { hasText: 'Épaisseur' }).locator('input').fill('1');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBeGreaterThan(12);
  await page.getByRole('button', { name: 'Ajuster' }).click();
  await cmd(page, 'Épaisseur');
  const info = page.locator('#thickness-info');
  await expect(info).toContainText('Épaisseur minimale : 1 mm');
  const pct = async () => Number((await info.textContent()).match(/: (\d+) % de la surface/)[1]);
  expect(await pct()).toBeGreaterThan(50);
  await shot(page, '195-epaisseur');
  await page.locator('#dialog .drow', { hasText: 'Seuil' }).locator('input').fill('0.5');
  await expect.poll(pct).toBe(0);
  await page.getByRole('button', { name: 'Fermer' }).click();
  await expect.poll(() => page.evaluate(() => window.camlcadView.part.material === window.camlcadView.material)).toBe(true);
});
