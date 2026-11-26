// Fixture : sert le site construit (_build/default/web/site) sous http://camlcad.test,
// y compris pour le worker ; three, CodeMirror et manifold-3d viennent des CDN.
import { test as base, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const SITE = path.resolve(process.env.CAMLCAD_SITE ?? new URL('../_build/default/web/site', import.meta.url).pathname);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.ml': 'text/plain' };

export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route('http://camlcad.test/**', async (route) => {
      let p = new URL(route.request().url()).pathname;
      if (p.endsWith('/')) p += 'index.html';
      try {
        const body = await readFile(path.join(SITE, p));
        await route.fulfill({ body, contentType: TYPES[path.extname(p)] ?? 'application/octet-stream' });
      } catch { await route.fulfill({ status: 404, body: 'absent' }); }
    });
    await use(context);
  },
});
export { expect };
