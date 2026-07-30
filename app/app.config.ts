import type { GameConfig } from '@engine/types';
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
});
