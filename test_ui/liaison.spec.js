// Black Book, chapitre 7 (Assembly : Joint, Drive Joints) : on écrit deux pièces à ports
// dans le code, puis on les assemble par une liaison pivot créée au dialogue, et on la pilote.
import { test, expect } from './fixtures.js';
import { open, shot, code } from './lib.js';

const SRC = `open Cad
open Geom
open Cad_mech

let model : Assembly.t Doc.t =
  let bati = Part.make ~ports:[ ("pivot", Frame.at 0. 0. 5.) ] "bati" Shape.(cube ~center:true (V3.v 40. 40. 10.)) in
  let bras = Part.make ~color:(220, 120, 40) ~ports:[ ("axe", Frame.at 0. 0. 0.) ] "bras" Shape.(cube (V3.v 30. 6. 4.) |> translate (V3.v 0. (-3.) 0.)) in
  ignore bras;
  Doc.return (Assembly.make ~ground:bati [])
`;

test('créer une liaison pivot et la piloter', async ({ page }) => {
  await open(page, 'nouveau');
  // Le code tapé dans l'éditeur, comme un utilisateur.
  await page.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(SRC);
  await expect(page.locator('#status')).toContainText('1 pièces');
  await page.getByRole('button', { name: 'MÉCANISME' }).click();
  await page.getByRole('button', { name: 'Liaison' }).click();
  await expect(page.locator('#dialog')).toContainText('LIAISON');
  const field = (label) => page.locator('#dialog .drow', { hasText: label }).locator('select, input').first();
  await field('Type').selectOption('revolute');
  await field('Pièce 1').selectOption('bati'); await field('Pièce 2').selectOption('bras');
  await expect(field('Port 2')).toHaveValue('axe');
  await shot(page, '107-liaison');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('#status')).toContainText('2 pièces');
  expect(await code(page)).toContain('Joint.revolute ~name:"pivot_bras" Part.(bati @: "pivot") Part.(bras @: "axe")');
  // Piloter la liaison : le curseur existe et bouge le bras.
  await page.getByRole('button', { name: 'Mouvement' }).click();
  const slider = page.locator('#dialog input[type=range][data-name=pivot_bras]');
  await expect(slider).toBeVisible();
  const sb = await slider.boundingBox();
  await slider.click({ position: { x: sb.width * 0.75, y: sb.height / 2 } });
  await expect.poll(async () => Number(await slider.inputValue())).toBeGreaterThan(45);
  await shot(page, '108-liaison-pilotee');
});
