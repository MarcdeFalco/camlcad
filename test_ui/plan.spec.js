// Black Book, chapitres 11 (Drawing) et 1 (Capture Image) : mise en plan de l'équerre
// (trois vues, cotes d'encombrement, cartouche) en SVG, et capture PNG de la vue.
import { test, expect } from './fixtures.js';
import { open, shot } from './lib.js';
import { readFile } from 'node:fs/promises';

test('mise en plan et capture', async ({ page }) => {
  await open(page, 'support');
  await page.locator('#drawing').click(); // bouton « Plan » de la barre du haut
  await expect(page.locator('#dialog')).toContainText('MISE EN PLAN');
  await expect(page.locator('#drawing-info')).toContainText('échelle 2:1, encombrement 60 × 25 × 30 mm');
  await shot(page, '113-mise-en-plan');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Télécharger le SVG' }).click()]);
  expect(dl.suggestedFilename()).toBe('support-plan.svg');
  const svg = await readFile(await dl.path(), 'utf8');
  expect((svg.match(/class="view"/g) ?? []).length).toBe(3);
  for (const [k, v] of [['largeur', '60'], ['hauteur', '30'], ['profondeur', '25']]) expect(svg).toMatch(new RegExp(`data-dim="${k}"[^]*?>${v}</text>`));
  expect(svg).toContain('Échelle 2:1');
  const [png] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Capture de la vue (PNG)' }).click()]);
  const buf = await readFile(await png.path());
  expect(buf.subarray(1, 4).toString()).toBe('PNG');
  expect(buf.length).toBeGreaterThan(10_000);
});
