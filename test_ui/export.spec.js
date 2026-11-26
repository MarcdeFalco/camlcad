// Scénario 4 : export STL par le bouton ; le fichier téléchargé est un STL binaire valide.
import { test, expect } from './fixtures.js';
import { open, triangles } from './lib.js';
import { readFile } from 'node:fs/promises';

test('export STL', async ({ page }) => {
  await open(page, 'support');
  const n = await triangles(page);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'STL' }).click()]);
  expect(dl.suggestedFilename()).toBe('support.stl');
  const buf = await readFile(await dl.path());
  const count = buf.readUInt32LE(80);
  expect(count).toBe(n);
  expect(buf.length).toBe(84 + 50 * count);
  // Toutes les coordonnées finies, boîte englobante plausible (équerre 60 × 25 × 30 mm).
  let max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < count; i++) for (let k = 0; k < 3; k++) for (let c = 0; c < 3; c++) {
    const x = buf.readFloatLE(84 + 50 * i + 12 + 12 * k + 4 * c);
    expect(Number.isFinite(x)).toBe(true);
    max[c] = Math.max(max[c], x);
  }
  expect(max.map(Math.round)).toEqual([60, 25, 30]);
});
