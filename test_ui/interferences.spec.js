// Black Book, chapitre 8 (Interference) : un bras qui pénètre le bâti est signalé et rougi ;
// en le faisant tourner hors du bâti (Mouvement), l'interférence disparaît.
import { test, expect } from './fixtures.js';
import { open, shot } from './lib.js';

const SRC = `open Cad
open Geom
open Cad_mech

let model : Assembly.t Doc.t =
  let bati = Part.make ~ports:[ ("pivot", Frame.at 0. 0. 3.) ] "bati" Shape.(cube ~center:true (V3.v 40. 40. 10.)) in
  let bras = Part.make ~color:(220, 120, 40) ~ports:[ ("axe", Frame.at 0. 0. 0.) ] "bras" Shape.(cube (V3.v 30. 6. 4.) |> translate (V3.v 0. (-3.) 0.)) in
  Doc.return (Assembly.make ~ground:bati [ Joint.revolute ~name:"pivot" Part.(bati @: "pivot") Part.(bras @: "axe") ])
`;

test('interférences', async ({ page }) => {
  await open(page, 'nouveau');
  await page.locator('.cm-content').click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.insertText(SRC);
  await expect(page.locator('#status')).toContainText('2 pièces');
  await page.getByRole('button', { name: 'MÉCANISME' }).click();
  await page.getByRole('button', { name: 'Interférences' }).click();
  await expect(page.locator('#inter-list')).toContainText('bati et bras : 240.0 mm³');
  // La page n'a pas défilé (la barre du haut reste entière).
  expect(await page.evaluate(() => document.documentElement.scrollTop + document.body.scrollTop)).toBe(0);
  await shot(page, '120-interferences');
});
