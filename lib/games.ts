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
   *  OPTIONAL: a game without one simply shows its static key art. */
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
    video: '/video/games/sf6.mp4',
    tagline: 'Character usage · matchup data · meta over time',
    sitemapUrl: `${SITE_URL}/sf6/sitemap.xml`,
    summaryUrl: '/sf6/data/summary.json',
  },
  {
    // Promoted out of UPCOMING on 2026-08-14. Appended, per the note above.
    id: 'tokon',
    // The short form the game is actually called, parallel to 'Tekken 8' and
    // '2XKO'. The full title "MARVEL Tōkon: Fighting Souls" wraps to two lines
    // in the title column at the sm 2-up width and makes its grid row taller
    // than the row above it (measured 271px vs 297px at 640), so it lives in
    // the card art and the image alt instead.
    // NOTE: verify-cutover.mjs must use the FULL title in its own table — it
    // asserts against summary.json, which the game emits with the full name.
    name: 'MARVEL Tōkon',
    shortName: 'TŌKON',
    slug: 'tokon',
    url: '/tokon',
    // The game's theme.css --color-primary, per the contract above. The
    // coming-soon card carried #00a6ff, sampled from the Marvel CDN wordmark;
    // the shipped skin resolved SOULS blue slightly differently, and it is the
    // computed value that verify-cutover compares through the proxy — so the
    // card follows the game, not the other way round.
    accent: '#03a5fe',
    art: '/img/games/tokon.png',
    // No `video`: this game ships no hover loop. index.vue's `v-if="g.video"`
    // and the optional field both tolerate its absence.
    tagline: '4v4 tag-team · Marvel × Arc System Works',
    sitemapUrl: `${SITE_URL}/tokon/sitemap.xml`,
    summaryUrl: '/tokon/data/summary.json',
  },
];

/**
 * Games ANNOUNCED but not yet in the archive — the selector's coming-soon cards
 * and nothing else.
 *
 * Deliberately a SEPARATE array with its own narrower type rather than a
 * `status` field on ShellGame. GAMES feeds three surfaces — the cards, the
 * ItemList JSON-LD, and the sitemap index — and only the first of those may show
 * a game that has no replays: an upcoming game in structured data or a sitemap is
 * a lie to crawlers. A `status` flag would push that correctness burden onto
 * every consumer forever, and two of the three fail SILENTLY when someone
 * forgets. This type has no `url`, no `sitemapUrl` and no `summaryUrl` at all, so
 * `modules/sitemap-index.ts` and the JSON-LD literally cannot reach it, even by
 * mistake. Only the card grid reads UPCOMING.
 *
 * Promoting one when its pipeline ships: move the entry into GAMES (appending,
 * per the note there), fill in the URL fields, and add the vercel.json rewrite
 * pair + the insights rewrite in the same commit — see README "Adding a game to
 * the selector".
 */
export interface UpcomingGame {
  /** Stable identity — the v-for key, and the future GameConfig.id. */
  id: string;
  /** Full title as the rights holder writes it, diacritics included. */
  name: string;
  /** Brand wordmark short form. Official casing/diacritics render verbatim,
   *  same principle as Tekken's deliberate 'TEKKEN'. */
  shortName: string;
  /** The slug this game WILL own once it ships. ASCII — the macron is display
   *  only and never reaches a URL. */
  slug: string;
  /** Accent hex, lowercase (the gates compare against lowercased computed
   *  values). Drives the accent bar and the Coming Soon badge. */
  accent: string;
  /** Bundled card art (public path), 1200×630 to match the live cards. */
  art: string;
  /** One-line blurb describing the GAME. Never a date — see below. */
  tagline: string;
}

export const UPCOMING: UpcomingGame[] = [];

// Emptied 2026-08-14 when MARVEL Tōkon shipped and moved into GAMES above.
// The type and the doc block are kept deliberately: the narrow shape is what
// makes it impossible for an announced game to reach the sitemap or the
// JSON-LD by accident, and the next announcement should inherit that.
