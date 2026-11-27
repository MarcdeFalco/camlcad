// Tutoriel Black Book ch. 5, Practical 3 (roue à rochet, sans les dents) : une esquisse de
// trois cercles concentriques Ø100, Ø20, Ø8 sert à deux extrusions, comme dans un modeleur :
// l'anneau Ø20/Ø8 symétrique de 15, puis, en reprenant l'esquisse dans le navigateur pendant
// Extrusion, la couronne Ø100/Ø20 symétrique de 13, jointe.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, sketchPoint, worldPoint, clickAt, code, cmd, triangles } from './lib.js';

const volume = async (page) => {
  await cmd(page, 'Propriétés');
  const v = Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1]);
  await page.getByRole('button', { name: 'Fermer' }).click();
  return v;
};
const regions = (page) => page.locator('#dialog .profiles input[type=checkbox]');

test('Practical 3 : une esquisse, deux extrusions de régions', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  for (const [d, r] of [[100, 30], [20, 6], [8, 2]]) {
    await page.getByRole('button', { name: 'Cercle' }).click();
    await clickSketch(page, 0, 0);
    await page.mouse.move(...await sketchPoint(page, r, 0), { steps: 2 });
    await page.keyboard.type(String(d)); await page.keyboard.press('Enter');
  }
  await page.keyboard.press('f');
  await expect(page.locator('#sketch-dims .dim')).toHaveText(['Ø100', 'Ø20', 'Ø8']);
  // Première extrusion : l'anneau entre Ø20 et Ø8 seul (région 2), symétrique, 15.
  await page.getByRole('button', { name: 'Terminer l\'esquisse' }).click();
  await expect(regions(page)).toHaveCount(3);
  await expect(regions(page).nth(0)).toBeChecked(); await expect(regions(page).nth(2)).toBeChecked(); // profil par défaut
  await regions(page).nth(0).uncheck(); await regions(page).nth(2).uncheck(); await regions(page).nth(1).check();
  await page.locator('#dialog .drow', { hasText: 'Direction' }).locator('select').selectOption({ label: 'Symétrique' });
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('15');
  await shot(page, '280-practical3-anneau');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => code(page)).toContain('Profile.region 1 esquisse1');
  await expect.poll(() => triangles(page)).toBeGreaterThan(0);
  // Seconde extrusion : Extrusion, puis l'esquisse dans le navigateur ; la couronne (région 1).
  await cmd(page, 'Extrusion');
  await expect(page.locator('#hint')).toContainText('esquisse du navigateur');
  await page.locator('#tree .row', { hasText: 'esquisse1' }).click();
  await expect(page.locator('#dialog')).toContainText('EXTRUSION');
  await regions(page).nth(2).uncheck();
  await page.locator('#dialog .drow', { hasText: 'Direction' }).locator('select').selectOption({ label: 'Symétrique' });
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('13');
  await shot(page, '281-practical3-couronne');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => code(page)).toContain('Profile.region 0 esquisse1');
  const src = await code(page);
  expect(src.match(/let%sketch/g)).toHaveLength(1); // l'esquisse n'est pas recopiée
  await expect(page.locator('#timeline .feat')).toHaveCount(2);
  await shot(page, '282-practical3-piece');
  // π (10² − 4²) × 15 + π (50² − 10²) × 13 ≈ 101,98 cm³.
  await expect.poll(() => volume(page)).toBeCloseTo(101.98, 0);
});
