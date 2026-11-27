// Tutoriel (Black Book ch. 3, Extrude : « select a profile or a planar face ») : on extrude
// une face de la pièce sans passer par une esquisse. Face cliquée puis E ; puis Extrusion
// d'abord, face ensuite, tirée dans la matière à la flèche (l'opération passe à Couper).
import { test, expect } from './fixtures.js';
import { open, shot, worldPoint, clickAt, triangles, cmd, code } from './lib.js';

const bbox = (page) => page.evaluate(() => { const g = window.camlcadView.part.geometry; g.computeBoundingBox(); return [...g.boundingBox.min.toArray(), ...g.boundingBox.max.toArray()].map((c) => Math.round(c)); });
const volume = async (page) => {
  await cmd(page, 'Propriétés');
  const v = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  await page.getByRole('button', { name: 'Fermer' }).click();
  return v;
};

test('extrusion d’une face', async ({ page }) => {
  await open(page, 'nouveau');
  // Document vide : Extrusion propose d'esquisser le profil sur un plan.
  await cmd(page, 'Extrusion');
  await expect(page.locator('#hint')).toContainText('pour esquisser le profil');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Boîte' }).click();
  await page.getByRole('button', { name: 'OK' }).click(); // 20 × 20 × 10
  await expect.poll(() => triangles(page)).toBe(12);
  await page.getByRole('button', { name: 'Ajuster' }).click();

  // 1. Face du dessus cliquée, puis E : extrusion de 15 mm vers le haut (Joindre).
  await clickAt(page, await worldPoint(page, [10, 10, 10]));
  await page.keyboard.press('e');
  await expect(page.locator('#dialog')).toContainText('EXTRUSION');
  await expect(page.locator('#dialog')).toContainText('face de 400 mm²');
  await expect(page.locator('#palette')).toBeHidden(); // pas d'esquisse
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('15');
  await shot(page, '210-extrusion-face-apercu');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => bbox(page)).toEqual([0, 0, 0, 20, 20, 25]);
  expect(await code(page)).toMatch(/let%feat extrusion\d+ =/);
  await expect(page.locator('#timeline .feat')).toHaveCount(2);

  // 2. Extrusion d'abord : la face avant (y = 0) se clique ensuite ; flèche tirée dans la matière.
  await page.getByRole('button', { name: 'Ajuster' }).click();
  await cmd(page, 'Extrusion');
  await expect(page.locator('#hint')).toContainText('face plane à extruder');
  await clickAt(page, await worldPoint(page, [10, 0, 5]));
  await expect(page.locator('#dialog')).toContainText('EXTRUSION');
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('-5');
  await page.locator('#dialog .drow', { hasText: 'Opération' }).locator('select').selectOption({ label: 'Couper' });
  await expect(page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input')).toHaveValue('-5');
  await shot(page, '211-extrusion-face-couper');
  await page.getByRole('button', { name: 'OK' }).click();
  // 20 × 20 × 25 moins la tranche 20 × 5 × 25 derrière la face avant.
  await expect.poll(() => code(page)).toMatch(/let%feat poche\d+ =/);
  await expect.poll(() => volume(page)).toBeCloseTo(7.5, 1);
  await shot(page, '212-extrusion-face-resultat');
});
