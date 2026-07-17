/**
 * Build-time constants shared by app.config.ts (Vite/jiti) and the
 * sitemap-index module (jiti at build). Kept dependency-free (no Nuxt/Vue
 * imports) so both contexts can import it without a resolver.
 */

/** The apex the shell owns. Canonical origin for every selector SEO/OG URL and
 *  the sitemap-index <loc>s. NUXT_PUBLIC_SITE_URL overrides at build if set. */
export const SITE_URL = 'https://replaydatabase.com';
