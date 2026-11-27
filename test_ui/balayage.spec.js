// Black Book, chapitre 3 (Sweep) : un cercle de rayon 3 gardé seul (bouton Garder), puis
// un chemin en L dans une seconde esquisse ; Balayage : le cercle suit le chemin (coude en
// onglet), Shape.sweep, volume π r² × longueur.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, triangles, code, cmd } from './lib.js';

test('balayage d’un cercle le long d’un chemin', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.locator('[data-tool=circle]').click();
  await clickSketch(page, -15, 0); await clickSketch(page, -12, 0);
  await page.getByRole('button', { name: 'Garder' }).click();
  await expect.poll(() => code(page)).toContain('let%sketch esquisse1 =');

  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.locator('[data-tool=poly]').click();
  await clickSketch(page, -25, -10); await clickSketch(page, -5, -10); await clickSketch(page, -5, 8);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Balayage' }).click();
  await expect(page.locator('#dialog')).toContainText('BALAYAGE');
  await expect(page.locator('#dialog')).toContainText('2 segment(s)');
  await shot(page, '171-balayage');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBeGreaterThan(100);
  expect(await code(page)).toMatch(/Shape\.sweep esquisse1 \(List\.map .* \[ \(\(-25\.\), \(-10\.\)\); \(\(-5\.\), \(-10\.\)\); \(\(-5\.\), 8\.\) \]\)/);
  // π × 3² × (20 + 18) ≈ 1,07 cm³ (cercle à facettes : un peu moins)
  await cmd(page, 'Propriétés');
  const vol = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  expect(vol).toBeCloseTo(1.07, 1);
  await page.getByRole('button', { name: 'Fermer' }).click();
  await page.getByRole('button', { name: 'Ajuster' }).click();
  await shot(page, '172-balayage-solide');
});
