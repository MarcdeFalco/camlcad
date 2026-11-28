// Exercice Black Book ch. 5, Practice 1 (cendrier) : disque Ø60 × 3 et Ø50 × 15 dessous
// (esquisses sur le plan XY choisi dans le navigateur), cuvette (sphère R10 coupée), rainure
// (tuyau Ø4,5 coupé le long d'une ligne du dessus), réseau circulaire ×3 de la rainure : le
// réseau d'une feature coupée coupe aussi (avant : il joignait, des tubes sortaient).
import { test, expect } from './fixtures.js';
import { cmd, open, shot, clickSketch, sketchPoint, worldPoint, clickAt, code, triangles } from './lib.js';
const volume = async (page) => {
  await cmd(page, 'Propriétés');
  const v = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  await page.getByRole('button', { name: 'Fermer' }).click();
  return v;
};
const step = async (name, f) => f();
const row = (page, l) => page.locator('#dialog .drow', { hasText: l });
test('Practice 1 : cendrier', async ({ page }) => {
  await open(page, 'nouveau');
  const circleSketch = async (d) => {
    await page.locator('#tree .row', { hasText: 'Plan XY' }).click();
    await page.getByRole('button', { name: 'Cercle' }).click(); await clickSketch(page, 0, 0);
    await page.mouse.move(...await sketchPoint(page, 8, 0), { steps: 2 }); await page.keyboard.type(String(d)); await page.keyboard.press('Enter');
    await page.getByRole('button', { name: 'Terminer l\'esquisse' }).click();
  };
  await step('disque Ø60 × 3', async () => { await circleSketch(60); await row(page, 'Distance').locator('input').fill('3'); await page.getByRole('button', { name: 'OK' }).click(); await expect(page.locator('#timeline .feat')).toHaveCount(1); });
  await step('cylindre Ø50 × 15 dessous', async () => {
    await circleSketch(50);
    await row(page, 'Direction').locator('select').selectOption({ label: 'Côté opposé' });
    await row(page, 'Distance').locator('input').fill('15'); await page.getByRole('button', { name: 'OK' }).click();
    await expect(page.locator('#timeline .feat')).toHaveCount(2);
  });
  await shot(page, '320-cendrier-disques');
  await step('sphère R10 couper', async () => {
    await cmd(page, 'Sphère');
    await row(page, 'Rayon').locator('input').fill('10');
    await row(page, 'Centre').locator('input').nth(2).fill('3');
    await row(page, 'Opération').locator('select').selectOption({ label: 'Couper' });
    await page.getByRole('button', { name: 'OK' }).click();
    await expect(page.locator('#timeline .feat')).toHaveCount(3);
  });
  await shot(page, '321-cendrier-cuvette');
  await step('rainure : esquisse sur le dessus, ligne, tuyau Ø4,5 couper', async () => {
    await page.getByRole('button', { name: 'Ajuster' }).click();
    await clickAt(page, await worldPoint(page, [20, 5, 3]));
    await page.keyboard.press('s');
    await page.getByRole('button', { name: 'Contour' }).click();
    await clickSketch(page, 0, 0); await clickSketch(page, 32, 0); await page.keyboard.press('Escape');
    await page.locator('#sketch-pipe').click();
    await row(page, 'Rayon').locator('input').fill('2.25');
    await row(page, 'Opération').locator('select').selectOption({ label: 'Couper' });
    await page.getByRole('button', { name: 'OK' }).click();
    await expect(page.locator('#timeline .feat')).toHaveCount(4);
  });
  await shot(page, '322-cendrier-rainure');
  await step('réseau circulaire ×3', async () => {
    await page.locator('#timeline .feat').last().click();
    await page.getByRole('button', { name: 'Réseau' }).click();
    await row(page, 'Type').locator('select').selectOption({ label: 'Circulaire' });
    await row(page, 'Nombre').locator('input').first().fill('3');
    await expect(row(page, 'Opération').locator('select')).toHaveValue('cut');
    await page.getByRole('button', { name: 'OK' }).click();
    await expect(page.locator('#timeline .feat')).toHaveCount(5);
  });
  await page.locator('#home').click();
  await shot(page, '323-cendrier');
  // 37,9 cm³ de disques, moins la demi-sphère (2,1) et les trois rainures : ≈ 35,2 cm³.
  const v = await volume(page);
  expect(v).toBeGreaterThan(34.5); expect(v).toBeLessThan(36);
  expect(await code(page)).toMatch(/resultat\d+ = Shape\.\(resultat\d+ - reseau\d+\)/);
});
