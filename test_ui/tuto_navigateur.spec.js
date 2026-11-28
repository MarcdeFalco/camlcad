// Tutoriel (Black Book ch. 1, Browser et Timeline) : le navigateur range les objets
// (paramètres, origine, esquisses, corps), la frise porte seule l'historique. Une plaque
// esquissée, sa face extrudée, un perçage : trois étapes dans la frise, un seul corps.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt } from './lib.js';

const partVisible = (page) => page.evaluate(() => window.camlcadView.part?.visible);

test('navigateur : objets ; frise : historique', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, -25, -10); await clickSketch(page, 5, 10);
  await page.locator('#sketch-extrude').click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('4');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('#timeline .feat')).toHaveCount(1);
  // Face du dessus extrudée, puis un perçage au milieu.
  await page.getByRole('button', { name: 'Ajuster' }).click();
  await clickAt(page, await worldPoint(page, [-20, -5, 4]));
  await page.keyboard.press('e');
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('3');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('#timeline .feat')).toHaveCount(2);
  await page.getByRole('button', { name: 'Perçage' }).click();
  await clickAt(page, await worldPoint(page, [-10, 0, 7]));
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('#timeline .feat')).toHaveCount(3);

  // Navigateur : esquisse et corps, pas de liste d'étapes (elle est dans la frise).
  const tree = page.locator('#tree');
  await expect(tree.locator('.row', { hasText: 'Esquisses (1)' })).toBeVisible();
  await expect(tree.locator('.row', { hasText: 'Corps (1)' })).toBeVisible();
  await expect(tree.locator('.row', { hasText: 'Features' })).toHaveCount(0);
  await expect(tree.locator('.row', { hasText: 'Corps 1' })).toBeVisible();
  await shot(page, '230-navigateur-frise');
  // Le corps se masque et se réaffiche (œil) ; un clic le sélectionne.
  const body = tree.locator('.row', { hasText: 'Corps 1' });
  await body.locator('.eye').click();
  await expect.poll(() => partVisible(page)).toBe(false);
  await tree.locator('.row', { hasText: 'Corps 1' }).locator('.eye').click();
  await expect.poll(() => partVisible(page)).toBe(true);
  await tree.locator('.row', { hasText: 'Corps 1' }).locator('.name').click();
  await expect(tree.locator('.row.sel', { hasText: 'Corps 1' })).toBeVisible();

  // Un exemple : un corps, nommé comme dans le code.
  await page.locator('#examples').selectOption('engrenage');
  await expect(tree.locator('.row', { hasText: 'Corps (1)' })).toBeVisible();
  await expect(tree.locator('.row', { hasText: 'engrenage' }).last()).toBeVisible();
  await expect(page.locator('#timeline .feat')).toHaveCount(4);
});
