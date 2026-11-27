// Black Book, chapitre 6 (Solid Editing) : combiner deux corps, déplacer la pièce ;
// et la frise : une étape par opération (Joindre visible sur l'étape), retour arrière.
import { test, expect } from './fixtures.js';
import { open, shot, code, triangles, cmd } from './lib.js';

const bbox = (page) => page.evaluate(() => {
  const g = window.camlcadView.part.geometry; g.computeBoundingBox();
  const r = (v) => v.toArray().map((c) => Math.round(c) + 0);
  return [r(g.boundingBox.min), r(g.boundingBox.max)];
});
const field = (page, label) => page.locator('#dialog .drow', { hasText: label }).locator('input, select').first();

test('combiner, déplacer, frise d’opérations', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Boîte' }).click();
  await field(page, 'Longueur').fill('40'); await field(page, 'Largeur').fill('40'); await field(page, 'Hauteur').fill('10');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBe(12);
  await cmd(page, 'Cylindre');
  await field(page, 'Rayon').fill('8'); await field(page, 'Hauteur').fill('30');
  const pos = page.locator('#dialog .drow', { hasText: 'Position' }).locator('input');
  await pos.nth(0).fill('20'); await pos.nth(1).fill('20');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('#timeline .feat')).toHaveCount(2);
  await expect(page.locator('#timeline .feat', { hasText: 'cylindre' }).locator('.op.union')).toBeVisible();
  await page.getByRole('button', { name: 'Ajuster' }).click();
  await shot(page, '70-joindre');

  // Retour arrière avant le cylindre : seule la boîte, étape 1 / 2.
  await page.locator('[data-tl=prev]').click();
  await expect(page.locator('#status')).toContainText('retour à l’étape 1 / 2');
  await expect.poll(() => page.evaluate(() => window.camlcadView.part.geometry.attributes.position.count / 3)).toBe(12);
  await page.locator('[data-tl=last]').click();
  await expect(page.locator('#status')).toContainText('triangles');

  // Combiner : résultat − boîte = la partie du cylindre au-dessus de la boîte.
  await cmd(page, 'Combiner');
  await field(page, 'Corps outil').selectOption('boite1');
  await field(page, 'Opération').selectOption('cut');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => bbox(page)).toEqual([[12, 12, 10], [28, 28, 30]]);
  expect(await code(page)).toContain('let%feat combinaison');

  // Déplacer de -10 en z.
  await cmd(page, 'Déplacer');
  await field(page, 'Translation z').fill('-10');
  await shot(page, '71-deplacer-apercu');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => bbox(page)).toEqual([[12, 12, 0], [28, 28, 20]]);
  await shot(page, '72-deplacer');
});
