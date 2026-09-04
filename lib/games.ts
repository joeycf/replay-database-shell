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
    video: '/video/games/tokon.mp4',
    tagline: '4v4 tag-team · Marvel × Arc System Works',
    sitemapUrl: `${SITE_URL}/tokon/sitemap.xml`,
    summaryUrl: '/tokon/data/summary.json',
  },
  {
    // Game #5, appended per the note above. It never passed through UPCOMING:
    // that array has been empty since Tōkon shipped, so this is a plain append
    // rather than a promotion, and there is no coming-soon card to retire.
    id: 'ffcotw',
    // The short form the game is actually called. The full title
    // "FATAL FURY: City of the Wolves" is longer than any sibling's and wraps
    // in the card's title column; it lives in the card art and the image alt
    // instead, exactly as MARVEL Tōkon's does.
    // NOTE: verify-cutover.mjs must use the FULL title in its own table — it
    // asserts against summary.json, which the game emits with the full name.
    name: 'FATAL FURY: CotW',
    shortName: 'COTW',
    slug: 'ffcotw',
    url: '/ffcotw',
    // The game's theme.css --color-primary. Yellow rather than the sampled
    // FATAL FURY red, by the skin's own collision lever: that red is 11° of hue
    // from Tekken's #e13048 and would be indistinguishable from it at chip size.
    accent: '#ffd21f',
    // A byte-copy of the game repo's own public/og-default.png, which is how
    // 2XKO, Tekken and SF6's cards were made. Tōkon needed a bespoke generator
    // only because it had no game repo at the time; this one does.
    art: '/img/games/ffcotw.png',
    // 1:44–1:55 of the Official Special Anime Trailer, trimmed to the siblings'
    // shape: 1280×720, 30fps, muted (no audio stream at all), 11s.
    video: '/video/games/ffcotw.mp4',
    tagline: 'Character usage · matchups · meta over time',
    sitemapUrl: `${SITE_URL}/ffcotw/sitemap.xml`,
    summaryUrl: '/ffcotw/data/summary.json',
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
  /** The SHORT display form — the card's title column and nothing else. NOT the
   *  full title: spelled out, every one of these wraps to two lines at the sm
   *  2-up width and makes its grid row taller than the row above (measured on
   *  MARVEL Tōkon at 640: 271px vs 297px). Parallel to the live cards' 'Tekken
   *  8' / 'MARVEL Tōkon' / 'FATAL FURY: CotW'. */
  name: string;
  /** The full title as the rights holder writes it, diacritics included. The
   *  card title cannot carry it (see `name`), so the image ALT and the card art
   *  do. A hard-coded literal here is what shipped the Tōkon alt onto every
   *  card that followed; index.vue binds this instead. */
  fullName: string;
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

// Empty from 2026-08-14 (MARVEL Tōkon's promotion into GAMES) until these three
// were announced. The narrow type above is what kept that window honest, and it
// is what keeps these three out of the sitemap index and the ItemList now.
//
// ORDER IS DISPLAY ORDER. Unlike GAMES — where APPEND-don't-insert protects a
// POSITIONAL JSON-LD gate — this array reaches only the card grid, which renders
// it in sequence. verify-shell asserts the three cards positionally too, so
// reordering here is a deliberate act with a failing gate attached, not a silent
// one.
//
// ACCENTS ARE PROVISIONAL, and say so per entry. Each is the modal exact fill of
// an official asset (the sampling method is in scripts/card-art-upcoming.mjs),
// lifted where the sampled value is too dark to carry the badge's 11px text.
// At flip time THE THEME WINS: Tōkon's card carried #00a6ff and the shipped skin
// resolved to #03a5fe, and the card followed the game rather than the reverse.
//
// The separation rule every one of them clears, against all five live accents,
// the umbrella teal, and each other: OKLCH Δhue ≥ 25, or Δhue ≥ 10 with
// |ΔL| ≥ .12. It is the rule the game skins already use, and it is why FATAL
// FURY demoted its own sampled red (11° from Tekken) to secondary.
export const UPCOMING: UpcomingGame[] = [
  {
    id: 'ggst',
    // GUILTY GEAR -STRIVE- — developed AND published by Arc System Works,
    // verified on guiltygear.com/ggst/en/ (© ARC SYSTEM WORKS) and
    // arcsystemworks.com/game/guilty-gear-strive/. The vendor's own line for it
    // is "The ever-evolving 2.5D fighting game", which is where the tagline's
    // "2.5D fighter" comes from rather than from anyone's memory.
    name: 'Guilty Gear Strive',
    fullName: 'GUILTY GEAR -STRIVE-',
    shortName: 'STRIVE',
    slug: 'ggst',
    // PROVISIONAL, and the one accent here that may still move: it is
    // --color-primary from the in-progress skin
    // (ggst-replay-database/design/handoff/tokens.css), whose own header calls
    // the gold anchored-but-unsampled — it comes from the gold-foil logo
    // variant on the store capsules, not from a pixel sample.
    // GOLD RATHER THAN THE LOGO'S RED, by that skin's collision lever: the
    // sampled letterform red is #7b1b1e, and at any lightness that could carry
    // text it lands on Tekken's #e13048. FATAL FURY demoted its own red for the
    // same reason; neither game ships red-primary.
    // Tightest neighbour is FATAL FURY's #ffd21f at Δhue 11 — cleared on
    // lightness alone, ΔL .125, right at the .12 floor. Δhue 30 from SF6.
    accent: '#d9a53a',
    art: '/img/games/ggst.png',
    tagline: '2.5D fighter · Arc System Works',
  },
  {
    id: 'avatar',
    // Avatar Legends: The Fighting Game. The studio credits are the one fact
    // here that no single official surface settles, so the disagreement is
    // recorded rather than smoothed over:
    //   · Steam app 2424420 (publisher-submitted fields) — developer
    //     "Gameplay Group International", publishers "PM Studios, Inc." and
    //     "Paramount Games"
    //   · nintendo.com product page — publisher "PM Studios", no developer
    //   · paramountgames.com/games/avatar-legends-the-fighting-game — credits
    //     "Paramount Games Studio" as both
    // Resolved by the maintainer's own confirmation: developer Gameplay Group
    // International, publisher PM Studios, Inc. The tagline carries the
    // rights-holder × developer pair in the Tōkon shape; "Paramount" is the
    // rights holder, as "Marvel" was there.
    // Slug is 'avatar', not ComboForge's 'ava': this becomes a permanent public
    // path and readability wins there; the CF id stays a config map.
    name: 'Avatar Legends',
    fullName: 'Avatar Legends: The Fighting Game',
    shortName: 'AVATAR',
    slug: 'avatar',
    // PROVISIONAL. Sampled from the official site's own logo
    // (avatarfighters.com): a dusk indigo #363c88, 54.3% of that asset's flat
    // fills. Lifted L .395 → .778 for AA — the sampled value is 2.06:1 on the
    // card ground and the badge sets 11px text in it.
    // WORTH KNOWING before re-sampling: the logo at
    // paramountgames.com/avatar-assets/brand/avatar-logo-clean.png and all four
    // element seals under /avatar-assets/brand/seals/ are pure WHITE line art
    // on transparent — zero chroma, no accent to take. The key art is a painted
    // composition whose dominant fills are a cream wash and a fire red 11° from
    // Tekken. The indigo is the only viable band the official art offers.
    // Δhue 36 from Tōkon, 90 from the umbrella teal. See the gbvsr entry for
    // why these two are separated by lightness.
    accent: '#aeacff',
    art: '/img/games/avatar.png',
    tagline: 'Four elements · Paramount × Gameplay Group',
  },
  {
    id: 'gbvsr',
    // Granblue Fantasy Versus: Rising — "© Cygames, Inc. Developed by ARC
    // SYSTEM WORKS", verbatim from the footer of the official site
    // rising.granbluefantasy.jp/en/about. That single line is both credits, so
    // the tagline's "Cygames × Arc System Works" is the Tōkon shape applied to
    // a source that states it outright.
    name: 'Granblue Rising',
    fullName: 'Granblue Fantasy Versus: Rising',
    shortName: 'GBVSR',
    slug: 'gbvsr',
    // PROVISIONAL. Sampled from the official key-visual logo
    // (rising.granbluefantasy.jp/assets/images/kv_logo.9880ca03.png): the
    // ultramarine #0000c8 is 72.5% of its flat fills. Lifted L .376 → .593 for
    // AA (the sampled value is 1.75:1) and carried +8° of hue, which is what
    // buys Δhue 28 from Tōkon's #03a5fe. At the sampled hue it could only clear
    // Tōkon on lightness, and every lightness dark enough to do that fails AA —
    // the same squeeze Strive's red hit, resolved the other way because this
    // hue had somewhere to go and that one did not.
    // The logo's sky #5bc9fa was the obvious alternative and is blocked
    // outright: Δhue 14 from Tōkon with ΔL .096, under both floors. It survives
    // as the card art's second hue instead.
    // SIBLINGS, DELIBERATELY: this and Avatar are the only two cards the
    // official art puts in the same band (Δhue 12), and at 2-up they share the
    // last grid row. They are separated by lightness — ΔL .185, half again the
    // floor — a deep royal blue beside a pale periwinkle. Anyone re-sampling
    // either one has to re-check the pair, not just the live five.
    accent: '#5569ff',
    art: '/img/games/gbvsr.png',
    tagline: '1v1 fighter · Cygames × Arc System Works',
  },
];
