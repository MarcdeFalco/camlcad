// Black Book, chapitre 10 (Publish Video) : un cycle de la bielle-manivelle enregistré en vidéo.
import { test, expect } from './fixtures.js';
import { open } from './lib.js';
import { readFile } from 'node:fs/promises';

test('vidéo de l’animation', async ({ page }) => {
  await open(page, 'bielle');
  await page.getByRole('button', { name: 'MÉCANISME' }).click();
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 20_000 }), page.getByRole('button', { name: 'Vidéo' }).click()]);
  expect(dl.suggestedFilename()).toBe('bielle.webm');
  const buf = await readFile(await dl.path());
  expect(buf.subarray(0, 4).toString('hex')).toBe('1a45dfa3'); // en-tête EBML (WebM)
  expect(buf.length).toBeGreaterThan(5_000);
});
