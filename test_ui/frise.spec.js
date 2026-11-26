// Scénario 2 : la frise. Double-clic sur une feature pour modifier une cote,
// menu contextuel, marqueur de retour arrière glissé, lecteur.
import { test, expect } from './fixtures.js';
import { open, shot, code } from './lib.js';

const chip = (page, name) => page.locator('#timeline .feat', { hasText: name });

test('frise : cote par double-clic, marqueur de retour arrière', async ({ page }) => {
  await open(page, 'support');
  await expect(page.locator('#timeline .feat')).toHaveCount(5);

  // Double-clic : dialogue « Modifier », cote littérale changée au clavier.
  await chip(page, 'trous_semelle').dblclick();
  await expect(page.locator('#dialog')).toContainText('MODIFIER');
  await shot(page, '10-modifier-feature');
  const cote = page.locator('#dialog .lit input[type=number]').first();
  await expect(cote).toHaveValue('10');
  const before = await page.locator('#status').textContent();
  await cote.fill('18'); await cote.press('Tab');
  await expect.poll(() => code(page)).toContain('trou_vertical 18.');
  await expect(page.locator('#status')).not.toHaveText(before); // pièce réévaluée
  await expect(page.locator('#status')).toContainText('triangles');
  await shot(page, '11-cote-modifiee');
  await page.getByRole('button', { name: 'Fermer' }).click();

  // Marqueur glissé entre « aile » et « trous_semelle » : la pièce à l'étape 2.
  const marker = page.locator('#timeline .marker');
  await expect(marker).toBeVisible(); await expect(chip(page, 'trous_semelle')).toBeVisible();
  const mb = await marker.boundingBox(), cb = await chip(page, 'trous_semelle').boundingBox();
  await page.mouse.move(mb.x + mb.width / 2, mb.y + mb.height / 2);
  await page.mouse.down();
  await page.mouse.move(cb.x + 4, cb.y + cb.height / 2, { steps: 12 });
  await page.mouse.up();
  await expect(page.locator('#status')).toContainText('retour à l’étape 2 / 5');
  await expect(chip(page, 'support')).toHaveClass(/future/);
  // Les deux corps présents à cette étape (semelle et aile, 12 triangles chacun), pas seulement le dernier.
  await expect.poll(() => page.evaluate(() => window.camlcadView.part?.geometry.attributes.position.count / 3)).toBe(24);
  await shot(page, '12-marqueur-etape2');

  // Menu contextuel : revenir avant « trou_aile ».
  await chip(page, 'trou_aile').click({ button: 'right' });
  await expect(page.locator('#ctxmenu')).toBeVisible();
  await shot(page, '13-menu-contextuel');
  await page.getByRole('button', { name: 'Revenir avant cette étape' }).click();
  await expect(page.locator('#status')).toContainText('retour à l’étape 3 / 5');

  // Lecteur : fin de la frise.
  await page.locator('[data-tl=last]').click();
  await expect(page.locator('#status')).toContainText('triangles');
  // La pièce entière est revenue : autant de triangles affichés que la pièce évaluée.
  const n = Number((await page.locator('#status').textContent()).match(/(\d+) triangles/)[1]);
  await expect.poll(() => page.evaluate(() => window.camlcadView.part.geometry.attributes.position.count / 3)).toBe(n);
});
