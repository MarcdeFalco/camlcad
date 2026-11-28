// Tutoriel de départ (Black Book ch. 1 et 5, Practical 1, première étape) : l'éditeur s'ouvre
// sur un document vide ; la carte de départ montre l'esquisse ; les exemples sont dans un menu
// à part, « Nouveau » repart de zéro et ↶ ramène le document précédent.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, worldPoint, clickAt, code, triangles } from './lib.js';

test('démarrage sur un document vide', async ({ page }) => {
  await open(page);
  await expect(page.locator('#docname')).toHaveValue('sans titre');
  await expect(page.locator('#timeline .feat')).toHaveCount(0);
  await expect(page.locator('#empty-hint')).toBeVisible();
  await shot(page, '200-demarrage-vide');
  // La carte montre l'Esquisse (bouton qui pulse) : plan XY, rectangle, extrusion.
  await expect(page.locator('#toolbar [data-cmd=sketch]')).toHaveClass(/pulse/);
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await expect(page.locator('#empty-hint')).toBeHidden();
  await clickAt(page, await worldPoint(page, [30, 30, 0]));
  await expect(page.locator('#palette')).toBeVisible();
  await page.getByRole('button', { name: 'Rectangle' }).click();
  await clickSketch(page, -25, -10); await clickSketch(page, 5, 10);
  await page.locator('#sketch-extrude').click();
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('5');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('#timeline .feat')).toHaveCount(1);
  await expect(page.locator('#empty-hint')).toBeHidden();
  await expect(page.locator('#toolbar [data-cmd=sketch]')).not.toHaveClass(/pulse/);
  // Nom du document : celui du fichier enregistré.
  await page.locator('#docname').fill('plaque'); await page.keyboard.press('Enter');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Enregistrer' }).click()]);
  expect(dl.suggestedFilename()).toBe('plaque.ml');
  // Un exemple, puis ↶ ramène la plaque.
  await page.locator('#examples').selectOption('engrenage');
  await expect(page.locator('#docname')).toHaveValue('engrenage');
  await expect.poll(() => code(page)).toContain('Gear.spur');
  await expect(page.locator('#examples')).toHaveValue(''); // le menu revient à « Exemples… »
  await page.locator('#undo').click();
  await expect.poll(() => code(page)).toContain('let%sketch esquisse1');
  await expect.poll(() => triangles(page)).toBe(12);
  // Nouveau : document vide, carte de départ.
  await page.getByRole('button', { name: 'Nouveau' }).click();
  await expect(page.locator('#docname')).toHaveValue('sans titre');
  await expect(page.locator('#timeline .feat')).toHaveCount(0);
  await expect(page.locator('#empty-hint')).toBeVisible();
  await shot(page, '201-nouveau');
});
