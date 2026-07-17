import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { defineNuxtModule } from 'nuxt/kit';
import { GAMES } from '../lib/games';
import { SITE_URL } from '../lib/site';

/**
 * SITEMAP INDEX (PLAN §5 prompt B.3) — app-side, zero engine change.
 *
 * The engine's static-artifacts module writes a plain page `sitemap.xml` (a
 * <urlset> of this app's prerendered routes) + robots.txt (already pointing at
 * <siteUrl>/sitemap.xml) + manifest + the designed 404.html. For the SHELL,
 * which owns the apex, `/sitemap.xml` must instead be a sitemap INDEX that ties
 * the whole platform together:
 *
 *   sitemap.xml  (index) ──► sitemap-pages.xml         (the shell's own pages)
 *                        ├─► <apex>/2xko/sitemap.xml   (rewritten to the game)
 *                        └─► <apex>/tekken/sitemap.xml (rewritten to the game)
 *
 * 2XKO's previously submitted Search Console URL was `/sitemap.xml`, so this
 * transitions that submission in place — the index now fans out to both games'
 * prefixed sitemaps. This module runs AFTER the engine's static-artifacts on
 * `prerender:done`: it renames the engine's page sitemap to `sitemap-pages.xml`
 * and overwrites `sitemap.xml` with the index. (The engine's robots.txt is left
 * as-is — it already advertises <siteUrl>/sitemap.xml, which is now the index.)
 */

export default defineNuxtModule({
  meta: { name: 'replay-database-shell:sitemap-index' },
  setup(_options, nuxt) {
    // Artifacts only exist for a generated site (matches the engine module).
    if (nuxt.options.dev) return;

    nuxt.hook('nitro:init', (nitro) => {
      nitro.hooks.hook('prerender:done', () => {
        const publicDir = nitro.options.output.publicDir;
        const site = (process.env.NUXT_PUBLIC_SITE_URL || SITE_URL).replace(/\/$/, '');
        const pagesPath = join(publicDir, 'sitemap-pages.xml');
        const indexPath = join(publicDir, 'sitemap.xml');

        // The engine already wrote the page <urlset> at sitemap.xml (base '/',
        // so it sits at the output root). Preserve it AS the shell's page
        // sitemap under a new name, then replace sitemap.xml with the index.
        // (If the engine module ever stops writing it, fall back to a minimal
        // page sitemap of just the apex selector — the one indexable page.)
        let pageSitemap: string;
        try {
          pageSitemap = readFileSync(indexPath, 'utf8');
        } catch {
          const today = new Date().toISOString().slice(0, 10);
          pageSitemap =
            `<?xml version="1.0" encoding="UTF-8"?>\n` +
            `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
            `  <url><loc>${site}/</loc><lastmod>${today}</lastmod></url>\n` +
            `</urlset>\n`;
        }
        writeFileSync(pagesPath, pageSitemap);

        const today = new Date().toISOString().slice(0, 10);
        const sitemaps = [`${site}/sitemap-pages.xml`, ...GAMES.map((g) => g.sitemapUrl)];
        const index =
          `<?xml version="1.0" encoding="UTF-8"?>\n` +
          `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
          sitemaps
            .map((loc) => `  <sitemap><loc>${loc}</loc><lastmod>${today}</lastmod></sitemap>`)
            .join('\n') +
          `\n</sitemapindex>\n`;
        writeFileSync(indexPath, index);

        console.log(
          `✓ sitemap index: sitemap.xml → sitemap-pages.xml + ${GAMES.length} game sitemaps`,
        );
      });
    });
  },
});
