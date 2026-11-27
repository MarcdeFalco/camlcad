// Black Book, chapitre 7 (Joint Limits, Rest Position) : liaison pivot créée au dialogue avec
// des limites (0° à 90°) et une position initiale (30°) ; le curseur du mouvement les respecte.
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

test('limites et position initiale d’une liaison', async ({ page }) => {
  await open(page, 'nouveau');
  await page.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(SRC);
  await expect(page.locator('#status')).toContainText('1 pièces');
  await page.getByRole('button', { name: 'MÉCANISME' }).click();
  await page.getByRole('button', { name: 'Liaison' }).click();
  const field = (label) => page.locator('#dialog .drow', { hasText: label }).locator('select, input').first();
  await field('Type').selectOption('revolute');
  await field('Pièce 1').selectOption('bati'); await field('Pièce 2').selectOption('bras');
  await page.locator('#joint-lo').fill('0'); await page.locator('#joint-hi').fill('90');
  await page.locator('#joint-init').fill('30');
  await shot(page, '189-liaison-limites');
  await page.getByRole('button', { name: 'OK' }).click();
  await expect(page.locator('#status')).toContainText('2 pièces');
  expect(await code(page)).toContain('Joint.revolute ~name:"pivot_bras" ~limits:(0., 90.) ~init:30. Part.(bati @: "pivot")');
  await page.getByRole('button', { name: 'Mouvement' }).click();
  const slider = page.locator('#dialog input[type=range][data-name=pivot_bras]');
  await expect(slider).toHaveAttribute('min', '0');
  await expect(slider).toHaveAttribute('max', '90');
  await expect.poll(async () => Number(await slider.inputValue())).toBeCloseTo(30, 0);
  // Au-delà de la limite : le curseur s'arrête à 90°.
  await slider.focus();
  await page.keyboard.press('End');
  await expect.poll(async () => Number(await slider.inputValue())).toBe(90);
});
