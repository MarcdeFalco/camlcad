// Exercice Black Book ch. 5, Practice 5 (chaîne) : un maillon = tuyau Ø5 le long d'un oblong
// (entraxe 30, largeur 25, tapés au tracé), contour fermé balayé en deux moitiés ; copie tournée
// de 90° autour de x et décalée de 45 (Déplacer, Copie) ; réseau ×2 au pas de 90 du premier
// maillon : trois maillons entrelacés.
import { test, expect } from './fixtures.js';
import { cmd, open, shot, clickSketch, sketchPoint, worldPoint, clickAt, code, triangles } from './lib.js';
const step = async (name, f) => f();
const row = (page, l) => page.locator('#dialog .drow', { hasText: l });
test('Practice 5 : chaîne', async ({ page }) => {
  await open(page, 'nouveau');
  await page.locator('#tree .row', { hasText: 'Plan XY' }).click();
  await step('maillon', async () => {
    await page.locator('[data-tool=slot]').click(); await clickSketch(page, 0, 0); await page.mouse.move(...await sketchPoint(page, 10, 0), { steps: 2 });
    await page.keyboard.type('30'); await page.keyboard.press('Tab'); await page.keyboard.type('25'); await page.keyboard.press('Enter');
    await page.locator('#sketch-pipe').click();
    await expect(page.locator('#dialog')).toContainText('TUYAU');
    await row(page, 'Rayon').locator('input').fill('2.5');
    await page.getByRole('button', { name: 'OK' }).click();
    await expect.poll(() => triangles(page), { timeout: 60_000 }).toBeGreaterThan(0);
    expect(await code(page)).toMatch(/union \[ sweep \(Profile\.circle ~r:2\.5\)/);
  });
  await page.locator('#home').click();
  await shot(page, '360-chaine-maillon');
  await step('maillon tourné copié', async () => {
    await cmd(page, 'Déplacer');
    await row(page, 'Translation x').locator('input').fill('45');
    await row(page, 'Axe de rotation').locator('select').selectOption('X');
    await row(page, 'Angle').locator('input').fill('90');
    await page.locator('#move-copy').check();
    await page.getByRole('button', { name: 'OK' }).click();
    await expect(page.locator('#timeline .feat')).toHaveCount(2);
  });
  await step('réseau du premier maillon', async () => {
    await page.locator('#timeline .feat').first().click();
    await page.getByRole('button', { name: 'Réseau' }).click();
    await row(page, 'Nombre 1').locator('input').fill('2'); await row(page, 'Pas 1').locator('input').fill('90');
    await page.getByRole('button', { name: 'OK' }).click();
    await expect(page.locator('#timeline .feat')).toHaveCount(3);
  });
  await page.locator('#home').click();
  // Trois maillons de π × 2,5² × (2 × 30 + π × 25) ≈ 2,72 cm³.
  await cmd(page, 'Propriétés');
  expect(Number((await page.locator('#props-volume').textContent()).match(/([\d.]+) cm³/)[1])).toBeCloseTo(8.15, 0);
  await page.getByRole('button', { name: 'Fermer' }).click();
  await shot(page, '361-chaine');
});
