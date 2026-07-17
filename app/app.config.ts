import type { GameConfig } from '@engine/types';
import { GAMES } from '../lib/games';

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
});
