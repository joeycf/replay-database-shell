import type { GameConfig } from '@engine/types';
import { CHANGELOG } from '../lib/changelog';
import { GAMES, UPCOMING } from '../lib/games';

/**
 * The shell's app config, merged OVER the engine's neutral default (PLAN §4a).
 *
 * `game` stays the UMBRELLA identity (slug '' ⇒ useBrandName() renders the bare
 * "Replay Database", BrandWordmark shows the umbrella lockup, the footer
 * disclaimer names the brand directly). The shell ships NO theme.css, so it
 * wears the engine's neutral umbrella palette (teal/gold, Space Grotesk) — the
 * selector favors no single game.
 *
 * `games` is the shell-only selector list (PLAN §5 prompt A.2): the cards, the
 * ItemList JSON-LD, and the sitemap index all read it. It's the same GAMES data
 * the build-time sitemap-index module imports, so page and sitemap can't drift.
 *
 * `upcoming` is announced-but-not-yet-in-the-archive games, and feeds the CARDS
 * ONLY — its type has no url/sitemapUrl/summaryUrl, so the JSON-LD and the
 * sitemap index can't see it (lib/games.ts explains why the split exists).
 *
 * `changelog` is the hand-curated platform history behind /changelog, and that
 * page is its only consumer. It is deliberately NOT joined to `games` here: the
 * page maps an entry's scope onto a game accent by SLUG at render time, which
 * keeps lib/changelog.ts import-free so its validator can load it under Node's
 * type stripping (see the header there).
 */
export default defineAppConfig({
  game: {
    id: 'replay-database',
    slug: '', // '' ⇒ umbrella brand everywhere (no per-game identity)
    name: 'Replay Database',
    shortName: '', // '' ⇒ BrandWordmark renders the umbrella "REPLAY DATABASE"
    rightsHolder: 'the respective rights holders',
    baseURL: '/',
    siteUrl: 'https://replaydatabase.com',
    charactersPerSide: 1,
    accents: {},
    filters: { coOccurrence: false, rank: false },
    sourceChannels: [],
  } satisfies GameConfig,

  games: GAMES,
  upcoming: UPCOMING,
  changelog: CHANGELOG,
});
