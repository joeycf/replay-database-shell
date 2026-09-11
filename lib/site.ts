/**
 * Build-time constants shared by app.config.ts (Vite/jiti) and the
 * sitemap-index module (jiti at build). Kept dependency-free (no Nuxt/Vue
 * imports) so both contexts can import it without a resolver.
 */

/** The apex the shell owns. Canonical origin for every selector SEO/OG URL and
 *  the sitemap-index <loc>s. NUXT_PUBLIC_SITE_URL overrides at build if set. */
export const SITE_URL = 'https://replaydatabase.com';

/** Origin of the Vercel Blob store holding the card hover videos.
 *
 *  They used to sit in `public/video/games/` — 23 MB across six files. Vercel
 *  stores a COMPLETE copy of every deployment, so at ~24 deploys/month that one
 *  folder was essentially this project's entire deployment-storage footprint
 *  (469 MB of 11.89 GB account-wide). Blob keeps one copy, and Blob storage is
 *  not deployment storage.
 *
 *  This is the ONLY off-origin media host the shell is allowed to reference,
 *  and it is pinned here as a single constant precisely so that stays true:
 *  `scripts/verify-shell.mjs` parses this value and fails any <video> served
 *  from an origin that is neither same-origin nor exactly this one. */
export const MEDIA_ORIGIN = 'https://sg3wqxmb9hj8h9oz.public.blob.vercel-storage.com';
