// Black Book, chapitre 1 (File : Save, Open, Recover) : enregistrer le code, le rouvrir, et
// retrouver son document après un rechargement de la page.
import { test, expect } from './fixtures.js';
import { open, code, triangles } from './lib.js';
import { readFile, writeFile } from 'node:fs/promises';

test('enregistrer, rouvrir, reprise automatique', async ({ page }, info) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Boîte' }).click();
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBe(12);
  // Enregistrer : le fichier .ml est le code.
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Enregistrer' }).click()]);
  expect(dl.suggestedFilename()).toBe('nouveau.ml');
  const saved = await readFile(await dl.path(), 'utf8');
  expect(saved).toContain('let%feat boite1');
  // Rechargement : le document est repris.
  await page.waitForTimeout(600);
  await page.reload();
  await expect(page.locator('#notice')).toContainText('repris');
  await expect.poll(() => triangles(page)).toBe(12);
  // Ouvrir un fichier : sélecteur de fichier, comme un utilisateur.
  const file = info.outputPath('cale.ml');
  await writeFile(file, saved.replace('20. 20. 10.', '40. 10. 5.'));
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.getByRole('button', { name: 'Ouvrir…' }).click()]);
  await chooser.setFiles(file);
  await expect(page.locator('#example')).toHaveValue('cale');
  await expect.poll(() => code(page)).toContain('40. 10. 5.');
  await expect.poll(() => page.evaluate(() => { const g = window.camlcadView.part?.geometry; if (!g) return null; g.computeBoundingBox(); return g.boundingBox.max.toArray(); })).toEqual([40, 10, 5]);
});
