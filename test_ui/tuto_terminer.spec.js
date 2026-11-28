// Retour de Marc : « Terminer l'esquisse » ne doit pas lancer l'extrusion d'office. Terminer
// enregistre l'esquisse et revient au solide ; Extrusion (E) prend ensuite d'elle-même la
// dernière esquisse que rien n'utilise ; « Extruder » dans l'onglet Esquisse fait les deux.
import { test, expect } from './fixtures.js';
import { cmd, open, shot, clickSketch, worldPoint, clickAt, code, triangles } from './lib.js';

test('terminer l’esquisse, puis extruder', async ({ page }) => {
  await open(page, 'nouveau');
  await page.locator('#tree .row', { hasText: 'Plan XY' }).click();
  await page.locator('[data-tool=rect]').click();
  await clickSketch(page, -20, -10); await clickSketch(page, 10, 10);
  await page.getByRole('button', { name: 'Terminer l\'esquisse' }).click();
  // Pas de dialogue : retour à l'onglet Solide, l'esquisse est dans le navigateur et le code.
  await expect(page.locator('#palette')).toBeHidden();
  await expect(page.locator('#dialog')).toBeHidden();
  await expect(page.locator('[data-tab=solid]')).toHaveClass(/on/);
  await expect(page.locator('#tree .row', { hasText: 'esquisse1' })).toBeVisible();
  await expect.poll(() => code(page)).toContain('let%sketch esquisse1');
  expect(await code(page)).not.toContain('let%feat');
  await shot(page, '370-terminer');
  // E : extrusion de cette esquisse, sans rien cliquer de plus.
  await page.keyboard.press('e');
  await expect(page.locator('#dialog')).toContainText('EXTRUSION');
  await page.locator('#dialog .drow', { hasText: 'Distance' }).locator('input').fill('5');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect.poll(() => code(page)).toMatch(/extrude ~h:5\. esquisse1/);
  expect((await code(page)).match(/let%sketch/g)).toHaveLength(1);
  await expect.poll(() => triangles(page)).toBe(12);
  // Esquisse utilisée : Extrusion revient au choix d'une face ou d'un plan.
  await cmd(page, 'Extrusion');
  await expect(page.locator('#hint')).toContainText('face plane à extruder');
  await page.keyboard.press('Escape');
  // Seconde esquisse sur le dessus : Extruder (onglet Esquisse) termine et extrude d'un coup.
  await page.getByRole('button', { name: 'Ajuster' }).click();
  await clickAt(page, await worldPoint(page, [-5, 0, 5]));
  await page.keyboard.press('s');
  await page.locator('[data-tool=circle]').click();
  await clickSketch(page, -5, 0); await clickSketch(page, 0, 0);
  await page.locator('#sketch-extrude').click();
  await expect(page.locator('#dialog')).toContainText('EXTRUSION');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('#timeline .feat')).toHaveCount(2);
});
