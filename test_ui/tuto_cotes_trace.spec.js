// Tutoriel Black Book ch. 5 (Practical 2, début ; Practical 1 au clavier) : les cotes se
// tapent pendant le tracé. Rectangle par le centre 60 × 50 (Tab entre les champs), cercle
// Ø20 au centre, tous deux cotés sans passer par Sélection ni Cote ; extrusion de 10.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, sketchPoint, worldPoint, clickAt, code, cmd, triangles } from './lib.js';

const volume = async (page) => {
  await cmd(page, 'Propriétés');
  const v = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  await page.getByRole('button', { name: 'Fermer' }).click();
  return v;
};

test('cotes tapées au tracé', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  // Rectangle par le centre : centre à l'origine, puis 60 Tab 50 Entrée.
  await page.getByRole('button', { name: 'Rect. centre' }).click();
  await clickSketch(page, 0, 0);
  await page.mouse.move(...await sketchPoint(page, 10, 8), { steps: 4 });
  await expect(page.locator('#sketch-live')).toContainText('tapez la cote');
  await page.keyboard.type('60');
  await expect(page.locator('#sketch-type')).toBeVisible();
  await page.keyboard.press('Tab'); await page.keyboard.type('50');
  await shot(page, '250-cotes-au-trace');
  await page.keyboard.press('Enter');
  await expect(page.locator('#sketch-type')).toHaveCount(0);
  await expect(page.locator('#sketch-dims .dim')).toHaveText(['60', '50']);
  // Cercle au centre : 20 Entrée, coté au diamètre.
  await page.getByRole('button', { name: 'Cercle' }).click();
  await clickSketch(page, 0, 0);
  await page.mouse.move(...await sketchPoint(page, 4, 3), { steps: 3 });
  await page.keyboard.type('20'); await page.keyboard.press('Enter');
  await expect(page.locator('#sketch-dims .dim', { hasText: 'Ø20' })).toBeVisible();
  await shot(page, '251-cotes-au-trace-cercle');
  await page.locator('#sketch-extrude').click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('10');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => triangles(page)).toBeGreaterThan(0);
  expect(await code(page)).toMatch(/length l0 60\./);
  // Plaque 60 × 50 × 10 percée Ø20 : 30 − 3,14 = 26,86 cm³.
  await expect.poll(() => volume(page)).toBeCloseTo(26.86, 1);
});
