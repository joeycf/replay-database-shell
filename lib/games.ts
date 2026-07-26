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
  /** Self-hosted muted hover-loop (public path), trimmed from the game's own
   *  hero video. Plays over `art` while the selector card is hovered/focused.
   *  OPTIONAL: a game without one simply shows its static key art (SF6 ships
   *  no hero video, so there is nothing to trim a loop from). */
  video?: string;
  /** One-line card blurb (the feature triplet from the game's key art). */
  tagline: string;
  /** Absolute /<slug>/sitemap.xml on the apex — referenced by the index. */
  sitemapUrl: string;
  /** Count source for the selector card (PLAN §5 A.4 / Phase 6). SUBPATH-
   *  RELATIVE on purpose: the selector fetches it client-side, so it must go
   *  through the shell's own rewrite (vercel.json) and stay SAME-ORIGIN — an
   *  absolute game-host URL would be cross-origin from the apex and the browser
   *  would block it (the games send no CORS headers). Emitted by each game's
   *  pipeline; a game that hasn't shipped it yet 404s and its count is simply
   *  omitted (never faked, and never derived from the 1 MB replays.json). */
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
    video: '/video/games/2xko.mp4',
    tagline: 'Champion usage · team pairings · meta over time',
    sitemapUrl: `${SITE_URL}/2xko/sitemap.xml`,
    summaryUrl: '/2xko/data/summary.json',
  },
  {
    id: 'tekken8',
    name: 'Tekken 8',
    shortName: 'TEKKEN',
    slug: 'tekken',
    url: '/tekken',
    accent: '#e13048',
    art: '/img/games/tekken.png',
    video: '/video/games/tekken.mp4',
    tagline: 'Character usage · rank ladder · meta over time',
    sitemapUrl: `${SITE_URL}/tekken/sitemap.xml`,
    summaryUrl: '/tekken/data/summary.json',
  },
  {
    // APPEND, don't insert: verify-shell asserts the ItemList JSON-LD
    // positionally, so reordering GAMES silently breaks the gate.
    id: 'sf6',
    name: 'Street Fighter 6',
    shortName: 'SF6',
    slug: 'sf6',
    url: '/sf6',
    // matches the game's theme.css --color-primary; lowercase because the
    // gates compare against lowercased computed values
    accent: '#ff7d00',
    art: '/img/games/sf6.png',
    tagline: 'Character usage · matchup data · meta over time',
    sitemapUrl: `${SITE_URL}/sf6/sitemap.xml`,
    summaryUrl: '/sf6/data/summary.json',
  },
];
