// Black Book, chapitre 6 (Change Parameters) : créer un paramètre utilisateur, en faire la
// cote d'une boîte (ƒx), puis le changer au curseur : la pièce suit.
import { test, expect } from './fixtures.js';
import { open, shot, code } from './lib.js';

const bbox = (page) => page.evaluate(() => {
  const g = window.camlcadView.part.geometry; g.computeBoundingBox();
  return g.boundingBox.max.toArray().map((c) => Math.round(c));
});

test('paramètre utilisateur', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Boîte' }).click();
  await page.getByRole('button', { name: 'OK' }).click(); // 20 × 20 × 10
  await expect.poll(() => bbox(page)).toEqual([20, 20, 10]);
  // Paramètres : « + Ajouter » épaisseur = 4 mm.
  await page.getByRole('button', { name: 'Paramètres' }).click();
  await page.locator('#param-new-name').fill('epaisseur');
  await page.locator('#param-new-value').fill('4');
  await page.getByRole('button', { name: '+ Ajouter' }).click();
  await expect.poll(() => code(page)).toContain('let%param epaisseur = 4. [@range 1., 16.] [@unit "mm"] in');
  await expect(page.locator('#tree .row', { hasText: 'epaisseur' })).toBeVisible();
  // La hauteur de la boîte devient ce paramètre : double-clic sur la boîte, cote 3, nom du paramètre.
  await page.locator('#timeline .feat', { hasText: 'boite1' }).dblclick();
  const lit = page.locator('#dialog .lit').nth(2);
  await lit.getByRole('button', { name: 'ƒx' }).click();
  await lit.locator('.promote input').fill('hauteur');
  await lit.getByRole('button', { name: 'créer' }).click();
  await expect.poll(() => code(page)).toContain('let%param hauteur');
  // Attendre la réévaluation : le dialogue des paramètres lit le journal.
  await expect(page.locator('#tree .row', { hasText: 'hauteur' })).toBeVisible();
  await page.getByRole('button', { name: 'Fermer' }).click();
  await page.getByRole('button', { name: 'Paramètres' }).click();
  const row = page.locator('#dialog .prow', { hasText: 'hauteur' });
  await row.locator('input[type=number]').fill('18'); // plage créée par ƒx : 0 à 20
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => bbox(page)).toEqual([20, 20, 18]);
  await shot(page, '115-parametres');
});
