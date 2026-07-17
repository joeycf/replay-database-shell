import { SITE_URL } from './site';

/**
 * The games the selector enumerates — the single source of truth for the
 * selector cards, the ItemList JSON-LD, and the sitemap index. Dependency-free
 * (no Nuxt/Vue imports) so it's importable from BOTH app code (the selector
 * page, via app.config.ts) and the build-time sitemap-index module (jiti).
 *
 * Per PLAN §5 prompt A.2, each game carries { id, name, shortName, slug, url,
 * accent, art }. `accent` + `art` are the ONLY per-game color on the umbrella
 * selector (the page chrome itself stays neutral/umbrella); `url` is the apex
 * subpath the shell rewrites to its deployment.
 */
export interface ShellGame {
  /** GameConfig.id — stable identity, also the JSON-LD item id fragment. */
  id: string;
  /** Full title, e.g. 'Tekken 8'. The card heading + JSON-LD name. */
  name: string;
  /** Brand wordmark short form, e.g. 'TEKKEN' / '2XKO'. */
  shortName: string;
  /** URL segment / base path segment (no slashes), e.g. 'tekken'. */
  slug: string;
  /** Apex path the card links to (edge-rewritten to the game deployment). */
  url: string;
  /** The game's own accent hex — the card's only chromatic departure from the
   *  umbrella theme (matches the game's theme.css --color-primary). */
  accent: string;
  /** Bundled key art (public path). The game's own og-default lockup. */
  art: string;
  /** One-line card blurb (the feature triplet from the game's key art). */
  tagline: string;
  /** Absolute /<slug>/sitemap.xml on the apex — referenced by the index. */
  sitemapUrl: string;
  /** Build-time count source (PLAN §5 A.4). summary.json is emitted in Phase 6;
   *  until it exists this 404s and the count is omitted (never faked, and never
   *  fetched from the 1 MB replays.json). Points at the game's own production
   *  alias under its post-flip base so it resolves independent of the apex. */
  summaryUrl: string;
}

export const GAMES: ShellGame[] = [
  {
    id: '2xko',
    name: '2XKO',
    shortName: '2XKO',
    slug: '2xko',
    url: '/2xko',
    accent: '#ff2e88',
    art: '/img/games/2xko.png',
    tagline: 'Champion usage · team pairings · meta over time',
    sitemapUrl: `${SITE_URL}/2xko/sitemap.xml`,
    summaryUrl: 'https://2xko-replay-database.vercel.app/2xko/data/summary.json',
  },
  {
    id: 'tekken8',
    name: 'Tekken 8',
    shortName: 'TEKKEN',
    slug: 'tekken',
    url: '/tekken',
    accent: '#e13048',
    art: '/img/games/tekken.png',
    tagline: 'Character usage · rank ladder · meta over time',
    sitemapUrl: `${SITE_URL}/tekken/sitemap.xml`,
    summaryUrl: 'https://tekken-replay-database.vercel.app/tekken/data/summary.json',
  },
];
