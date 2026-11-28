// Scénario 1 : esquisse sur le plan XY, rectangle et cercle, contraintes et cotes,
// extrusion Joindre ; puis esquisse sur la face du dessus et extrusion Couper.
import { test, expect } from './fixtures.js';
import { open, shot, clickSketch, sketchPoint, worldPoint, clickAt, code, triangles, dblclickDim } from './lib.js';

test('esquisse, contraintes, extrusion Joindre puis Couper', async ({ page }) => {
  await open(page, 'nouveau');
  await page.getByRole('button', { name: 'Esquisse' }).click();
  const xy = await worldPoint(page, [30, 30, 0]);
  await page.mouse.move(...xy, { steps: 4 });
  await shot(page, '01-choix-plan');
  await clickAt(page, xy);
  await expect(page.locator('#palette')).toBeVisible();

  // Rectangle par deux coins (outil par défaut), avec l'élastique.
  await page.getByRole('button', { name: 'Rectangle' }).click();
  await clickSketch(page, -25, -15);
  await page.mouse.move(...await sketchPoint(page, 10, 8), { steps: 6 });
  await expect(page.locator('#sketch-live')).toContainText('×');
  await shot(page, '02-rectangle-elastique');
  await clickSketch(page, 10, 8);
  await expect(page.locator('#sketch-dims .glyph')).toHaveCount(4); // H, V, H, V
  // Cercle : centre puis rayon.
  await page.getByRole('button', { name: 'Cercle' }).click();
  await clickSketch(page, -8, -3);
  await page.mouse.move(...await sketchPoint(page, -4, -3), { steps: 5 });
  await shot(page, '03-cercle-elastique');
  await clickSketch(page, -4, -3);

  // Contraintes : longueur du bas, rayon du cercle.
  await page.getByRole('button', { name: 'Sélection' }).click();
  await clickSketch(page, -5, -15);
  await page.getByRole('button', { name: 'Longueur' }).click();
  await expect(page.locator('#sketch-ask input')).toBeFocused();
  await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('40'); await page.keyboard.press('Enter');
  await expect(page.locator('#sketch-dims .dim')).toHaveText(['40']);
  await clickSketch(page, -4, -3);
  await page.getByRole('button', { name: 'Diamètre' }).click(); // cercle coté au diamètre
  await expect(page.locator('#sketch-ask input')).toBeFocused();
  await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('10'); await page.keyboard.press('Enter');
  await expect(page.locator('#sketch-dims .dim', { hasText: 'Ø10' })).toBeVisible();
  await expect(page.locator('#sketch-dims .dim')).toHaveCount(2);
  // Cote modifiée sur le dessin : double-clic, nouvelle valeur.
  await dblclickDim(page.locator('#sketch-dims .dim', { hasText: '40' }));
  await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type('45'); await page.keyboard.press('Enter');
  await expect(page.locator('#sketch-dims .dim', { hasText: '45' })).toBeVisible();
  await expect(page.locator('#sketch-list li')).toHaveCount(6);
  await shot(page, '04-contraintes');

  // Terminer : dialogue d'extrusion avec aperçu.
  await page.locator('#sketch-extrude').click();
  await expect(page.locator('#dialog')).toContainText('EXTRUSION');
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('8');
  await shot(page, '05-extrusion-apercu');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('#timeline .feat')).toHaveCount(1);
  await expect.poll(() => triangles(page)).toBeGreaterThan(0);
  await shot(page, '06-joindre');
  const t1 = await triangles(page);
  expect(await code(page)).toContain('let%sketch esquisse1');

  // Deuxième esquisse sur la face du dessus (z = 8), un cercle, extrusion Couper.
  const top = await worldPoint(page, [12, 0, 8]);
  await clickAt(page, top);
  await page.getByRole('button', { name: 'Esquisse' }).click();
  await expect(page.locator('#palette')).toBeVisible();
  await page.getByRole('button', { name: 'Cercle' }).click();
  await clickSketch(page, 0, 0); await clickSketch(page, 3, 0);
  await page.locator('#sketch-extrude').click();
  await page.locator('#dialog .drow', { hasText: 'Opération' }).locator('select').selectOption({ label: 'Couper' });
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('8');
  await shot(page, '07-couper-apercu');
  await page.getByRole('button', { name: 'OK' }).click();
  // Une seule étape pour la poche, marquée Couper (la combinaison resultatN n'est pas une étape).
  await expect(page.locator('#timeline .feat')).toHaveCount(2);
  await expect(page.locator('#timeline .feat', { hasText: 'poche' }).locator('.op.difference')).toBeVisible();
  await expect.poll(() => triangles(page)).not.toBe(t1);
  expect(await code(page)).toMatch(/poche\d+/);
  await shot(page, '08-couper');
});
