/**
 * The platform changelog — what changed on Replay Database, told to VISITORS.
 *
 * The authority for /changelog, and nothing else reads it. Hand-curated
 * editorial content in the same tradition as the games' season and patch
 * tables: a committed table a person writes and a validator keeps well-formed
 * (scripts/verify-changelog.mjs, wired into `npm run typecheck`).
 *
 * THIS IS NOT A GIT LOG. Commit messages are written for whoever maintains the
 * pipelines; these entries are written for someone who came to look up a
 * matchup. A change can be enormous in the repo and absent from this file, and
 * that is the correct outcome more often than not.
 *
 * WHAT EARNS AN ENTRY. One test: can a visitor see or do something now that
 * they couldn't before? A new game, a new filter, a new source of matches, a
 * page that got faster in a way you'd notice. Internal work earns an entry only
 * through its visible effect, described as that effect — never as the work.
 * No gate names, no algorithm names, no refactors, no version numbers of ours.
 * SILENCE IS FINE. A month with two entries is a month with two entries.
 *
 * HOW AN ENTRY IS WRITTEN. One to four sentences. The first says what changed.
 * NO EM DASHES in a title or body: use a comma, a colon, a full stop or
 * parentheses, so the page reads like a person wrote it rather than a model.
 * EVERY SENTENCE AFTER THE FIRST MUST BE CONCRETE. A frozen number, what it
 * means for a visitor, or the mechanism in plain words. Never padding, never a
 * restatement of the title, never a sentence that would survive being deleted.
 *
 * NUMBERS — the rule that matters most. Only numbers that STAY TRUE. A one-time
 * delta (3,128 matches added), a frozen count (1,317 carried), a measurement
 * (31 MB to 7 MB), a fixed set (81 Evo sets) are all safe forever. A LIVE COUNT
 * IS NOT: the archives grow every day, the selector already shows those totals
 * from each game's own summary.json, and a number baked into this static page
 * would be wrong within a day and competing with the front door besides. Where
 * a launch total is genuinely the point, it is phrased AT LAUNCH and dated by
 * the entry it sits in. Shares that move (Tokon's completion percentage rose to
 * 85.7%, then FELL when new sides arrived) are omitted entirely, not rounded.
 *
 * ORDERING. Newest first. Equal dates are allowed and are ordered by hand;
 * the validator enforces non-increasing, never strictly decreasing.
 *
 * DATES are the day the thing became visible to a visitor, in ISO YYYY-MM-DD,
 * and every one of them was verified against git — tags, commit dates, and the
 * engine's PLAN.md journal — rather than memory. The provenance comment on each
 * row records what dated it, so a row nobody can point at a source for is
 * visible rather than merely plausible. Never a future date: this file
 * describes what shipped, and "Coming Soon" belongs on the selector card.
 *
 * NO IMPORTS IN THIS FILE, EVER. scripts/verify-changelog.mjs loads it directly
 * under Node's type stripping, and bare Node ESM does not resolve extensionless
 * relative imports — `lib/games.ts` cannot be loaded that way for exactly that
 * reason (it imports './site'). Keep this file self-contained and erasable-
 * syntax only (union types, no `enum`), or the validator stops running. The
 * scope-to-accent mapping therefore lives in app/pages/changelog.vue.
 */

/** Which part of the platform a change belongs to. The four game slugs match
 *  ShellGame.slug in lib/games.ts (NOT .id — Tekken's id is 'tekken8'), which
 *  is how the page finds each badge's accent. 'platform' is a change all games
 *  got at once; 'engine' and 'shell' are the shared layer and the apex. */
export type Scope = 'platform' | 'engine' | 'shell' | '2xko' | 'tekken' | 'sf6' | 'tokon';

/** launch = a game or the platform itself going live · feature = something new
 *  to use · data = matches or fields arriving · improvement = something that
 *  already existed getting better. */
export type Kind = 'launch' | 'feature' | 'data' | 'improvement';

export interface ChangelogEntry {
  /** ISO YYYY-MM-DD, verified against git. Never in the future. */
  date: string;
  scope: Scope;
  kind: Kind;
  /** Under ~60 characters — it sets the line length of the whole page. */
  title: string;
  /** 1–4 sentences. Every sentence after the first must be concrete. */
  body: string;
  /** Optional deep link, absolute or root-relative. Unused so far: every entry
   *  to date is about a surface the visitor reaches from the front door. */
  href?: string;
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    // tokon cc010f1 (footage completion, 08-17), 58836f3 (mid-set team changes),
    // f3dbbae; PLAN.md "Portrait arc CLOSED (2026-08-19)". The 85.7% share in
    // those sources is deliberately absent — it moves.
    date: '2026-08-19',
    scope: 'tokon',
    kind: 'data',
    title: 'Tōkon teams, all four fighters',
    body: "Most Tōkon sides now show the full four-fighter team. Where the video title named only one or two, the rest came from the match footage, and anything the footage couldn't settle was read by hand from the broadcast. A side that swapped a fighter mid-set shows both teams it played, not one flattened list. A side that still isn't settled shows as incomplete rather than filled in with a guess.",
  },
  {
    // shell 56c1b52; PLAN.md "PHASE 8 COMPLETE (2026-08-14)". Game mechanics
    // per PLAN.md:847 ("4v4 tag team, 20 launch characters in five themed
    // teams, shared life bar"); the hidden 21st fighter per tokon c2649ce; the
    // game's own release date 2026-08-06 per shell 9c8a434's games.ts comment.
    date: '2026-08-14',
    scope: 'tokon',
    kind: 'launch',
    title: 'MARVEL Tōkon joins, eight days after release',
    body: "The fourth game on the platform, live eight days after the game itself. Tōkon is 4v4 tag on a shared life bar, with 21 fighters across five themed teams (one of them a hidden unlock). It's the first game here where a side holds four characters, so browse cards, filters and pairing stats all count teams of four.",
  },
  {
    // sf6 4247ae0 — "proposed dropping 196… wrong about 118… removes 54".
    date: '2026-08-10',
    scope: 'sf6',
    kind: 'improvement',
    title: 'Duplicate matches removed from SF6',
    body: 'Fifty-four matches that appeared twice are gone. A first scan proposed dropping 196. Checking each one against the Master Rate shown on screen, instead of trusting run time, proved 118 of those were genuinely different matches that happened to run the same length. Only the 54 real duplicates came out.',
  },
  {
    // 2xko 93387dc.
    date: '2026-08-10',
    scope: '2xko',
    kind: 'improvement',
    title: 'The fuse filter follows the champions you picked',
    body: 'Filtering by champion and by fuse together now returns the side that actually played that fuse. Before, a match counted as a hit whenever both appeared anywhere in it, including when the fuse belonged to the opponent.',
  },
  {
    // 2xko 4a0a591; PLAN.md 2026-08-07 checkpoint (katakana) and close-out
    // ("zero fabrications across all 21").
    date: '2026-08-08',
    scope: '2xko',
    kind: 'data',
    title: 'Evo footage, including the Japanese broadcasts',
    body: "2XKO's Evo matches now carry champions read from the footage itself, not from the video title. The Las Vegas broadcasts spell champion names in the Latin alphabet; Evo Japan renders them in katakana. Both are read, because a Latin-only reader would have returned a clean-looking zero on half the records. Across all 21 sets it never invented a champion: anything it couldn't read was left for a person.",
  },
  {
    // 2xko 147b681; data/report.md frozen-channel table; the 24% share per
    // PLAN.md:1334; the 4-of-150 link-health spot check per PLAN.md:1506,
    // measured three days after the freeze.
    date: '2026-08-07',
    scope: '2xko',
    kind: 'data',
    title: '1,317 matches kept after a channel left',
    body: '2XKO Pro Replays rebranded and unlisted its entire 2XKO back catalogue, a quarter of the archive at the time. Those 1,317 matches stay put: the archive keeps what channels take down, so the next refresh cannot quietly rebuild the database without them. Some of those videos have since vanished entirely (in a spot check, 4 of 150 were already gone), which is exactly why the records, the players, and every stat built from them survive either way.',
  },
  {
    // tekken b4db6ca — 63 sets, 63/63 both-sides-exact, 13/13 counter-picked
    // sides, and the 37.7% (23/61) title-order defect that forced HUD reads.
    date: '2026-08-07',
    scope: 'tekken',
    kind: 'data',
    title: 'Evo footage for Tekken 8',
    body: "Sixty-three Evo sets join Tekken, with characters and sides read from the broadcast rather than the video title. That matters more here than anywhere else: on Tekken's Evo uploads, the title names the two players in the wrong order 37.7% of the time. Who played what comes from the on-screen HUD, never from the title. All 13 sets where a player counter-picked mid-set show both characters they used.",
  },
  {
    // sf6 d544fe0 (81 sets / 8 events / 17 counter-picks), ce23976 (a side
    // holds every character it played), a7ead97 (81/81 against hand labels).
    date: '2026-08-04',
    scope: 'sf6',
    kind: 'data',
    title: 'Evo footage, and mid-set counter-picks',
    body: 'Eighty-one Evo sets across eight events, 2023 to 2026, join SF6. The characters come from the footage: names read off the in-game nameplates frame by frame, then checked against hand-verified matches before any of it shipped. Seventeen of those sets record a player switching character mid-set. A side now lists every character it played, not only the first.',
  },
  {
    // sf6 fe5bb3f, clearing gates pre-declared in SF6's first commit 7a0e61b
    // (scripts/expiries.ts, scripts/seasons.ts) on the announced date.
    date: '2026-08-03',
    scope: 'sf6',
    kind: 'data',
    title: 'Yasmine and Season 4, on day one',
    body: "SF6's 31st character and the start of Season 4 went live the day Capcom shipped them, Yasmine with her own colour on every chart and filter. Both were already written into the season and patch tables, with the date they were due, so nothing needed backfilling after the update landed. Season 4's first patch joined the patch filter the same day.",
  },
  {
    // sf6 34d5f25; PLAN.md:894 ("+3,128 replays") and the 1,022 recovered from
    // the first-party CPT archive by gating on the description, not the title.
    date: '2026-07-31',
    scope: 'sf6',
    kind: 'data',
    title: 'Capcom Pro Tour and tournament channels',
    body: "Three tournament channels join SF6, including Capcom's own Pro Tour archive: 3,128 more matches. 1,022 of those had been sitting unread because Capcom's uploads don't put the game name in the title. Reading the description instead recovered them. You can now filter tournament play apart from online ranked.",
  },
  {
    // shell 9c8a434 — the UPCOMING array, deliberately dateless.
    date: '2026-07-30',
    scope: 'shell',
    kind: 'feature',
    title: 'MARVEL Tōkon, coming soon',
    body: 'Tōkon appears on the front door as an announced game, with no date attached. The card is deliberately not a link and carries no replay count. There was nothing to browse yet, and saying so plainly beats a card that looks broken.',
  },
  {
    // sf6 c70b048 — "17 patch children under the season parents".
    date: '2026-07-27',
    scope: 'sf6',
    kind: 'feature',
    title: 'Filter SF6 by patch, not just by season',
    body: "Seventeen patches sit under their four seasons in the season filter, so you can narrow to a single balance update. That's what makes a before-and-after possible: pick a character, pick the patch that changed them, and compare how they did on either side of it. Each patch is the version string Capcom actually shipped, never a made-up label.",
  },
  {
    // shell 255dde4, enabled by sf6 51db679 (summary.json) the same day.
    date: '2026-07-26',
    scope: 'shell',
    kind: 'feature',
    title: 'Live match counts on the front door',
    body: "Every game's card shows how many matches it holds, and the total across all of them sits under the logo. Each number comes from that game's own published count as the page loads, so it moves as the archive grows. A game that hasn't published one shows no number at all rather than a guess.",
  },
  {
    // engine ecb04fd / v0.6.1. The measurement is STACK.md §14, taken on SF6 at
    // 19,495 replays: first load 31.14 MB → 7.10 MB, replays.json ×5 → ×1.
    date: '2026-07-26',
    scope: 'engine',
    kind: 'improvement',
    title: 'Pages load a lot lighter',
    body: 'Each data file is fetched once per page now, instead of once per component that wanted it. On the largest game that took a first load from 31 MB to 7 MB. The replay file alone had been downloading five times over.',
  },
  {
    // sf6 7a0e61b + shell 5296f63; launch totals per PLAN.md:701.
    date: '2026-07-25',
    scope: 'sf6',
    kind: 'launch',
    title: 'Street Fighter 6 joins',
    body: "The third game, live with 19,495 matches, 1,650 players and 30 characters. It arrived with its season and patch tables already written from Capcom's own version numbers, so filtering by era worked from the first day.",
  },
  {
    // engine 0187ba7 / v0.6.0; adopted same-day by 2xko 3a8dd89 and tekken
    // fd63d26. The per-game hotfix fold rules are recorded at PLAN.md:765.
    date: '2026-07-23',
    scope: 'platform',
    kind: 'feature',
    title: 'Patch-level filtering',
    body: 'Season filters gained a patch level: pick a season, then narrow to the exact patch. 2XKO and Tekken got it first; SF6 followed four days later with its own patch table. Each game folds hotfixes its own way, so the list matches how that game actually versions itself rather than a shared invention.',
  },
  {
    // engine d6429e2 / v0.5.5; adopted by 2xko 93ee3ac and tekken 80e7414.
    date: '2026-07-22',
    scope: 'platform',
    kind: 'feature',
    title: 'Sources collapse to Online and Tournament',
    body: "The source filter stopped listing every channel by name and offers two choices instead: online play, or tournament footage. That's the question most people were actually asking of it, and it keeps the filter the same width as games add channels.",
  },
  {
    // 2xko d84ed32 — 2,304 videos in, 80 duplicates excluded, 5,206 records
    // after dedupe, fuse coverage 5,104/5,206.
    date: '2026-07-22',
    scope: '2xko',
    kind: 'data',
    title: 'A third channel for 2XKO',
    body: '2XKO Best Replays joins the archive, taking it past 5,000 matches. Its 2,304 videos included 80 already in the database from another channel, which were recognised and not counted twice. Fuse detection reached 5,104 of the 5,206 records in the enlarged catalogue.',
  },
  {
    // tekken 5554040 — 213 matches, May 2024 → June 2026; 16 sponsor-tag
    // duplicate players merged (2,696 → 2,689).
    date: '2026-07-21',
    scope: 'tekken',
    kind: 'data',
    title: 'TEKKEN World Tour matches',
    body: "Tekken's official World Tour channel joins as a tournament source, adding 213 matches from May 2024 onward. Sixteen players had been appearing twice, once under a sponsor tag and once without. Merging them gives each player one page holding all their matches instead of two holding half each.",
  },
  {
    // engine 8f8613d / v0.5.3; first consumer tekken df2c33e. MetaTimeline
    // plots usage RANK over patches, which is why the second sentence holds.
    date: '2026-07-18',
    scope: 'platform',
    kind: 'feature',
    title: 'Meta over time',
    body: "Every game's stats page gained a timeline showing how character use shifted patch by patch. It plots usage rank rather than raw counts, so a character's line means the same thing in a patch with 200 matches as in one with 2,000.",
  },
  {
    // shell e6645fa (selector + rewrites + the permanent redirect map), with
    // the same-day cutovers 2xko 2d2aa17 ("742 sitemap locs — 1:1 with the 742
    // live indexed URLs") and tekken 5f8dfc4.
    date: '2026-07-17',
    scope: 'platform',
    kind: 'launch',
    title: 'One home: replaydatabase.com',
    body: '2XKO and Tekken 8 moved under one domain at /2xko and /tekken, behind a front door that lets you pick a game. Every 2XKO link that existed before still works: all 742 indexed URLs redirect permanently to their new address, so bookmarks and search results carried over intact.',
  },
  {
    // tekken 51e5faf (repo) and d9eb229 (initial corpus: 14,039 replays, 42
    // characters, 2,690 players, 44.7% of sides carrying a ladder rank).
    date: '2026-07-16',
    scope: 'tekken',
    kind: 'launch',
    title: 'Tekken 8 joins',
    body: "The platform's second game, live with 14,039 matches, 42 characters and 2,690 players across three seasons. Where the broadcast showed a player's ladder rank, it was captured with the match: just under half of all sides at launch. So you can filter to the level of play you want to study.",
  },
  {
    // 2xko cbae465 + 074e5a7 — thirteen days before the shell existed.
    date: '2026-07-04',
    scope: '2xko',
    kind: 'launch',
    title: 'replaydatabase.com',
    body: 'The 2XKO Replay Database moved onto its own domain, the address the whole platform still lives at today.',
  },
  {
    // 2xko 8c3a583 (the Browse facet) on the pipeline from 91807fa, which
    // reports the 98.75% validation of the shipped template configuration.
    date: '2026-07-03',
    scope: '2xko',
    kind: 'feature',
    title: 'Filter 2XKO by fuse',
    body: "You can filter by fuse and see fuse usage across the archive, even though no video title ever mentions one. The fuse is read off the video frames themselves, with the nameplate telling which side it belongs to. Checked against hand-labelled matches, the configuration that shipped came out 98.75% correct. Where it couldn't tell, the match says so instead of guessing.",
  },
  {
    // 2xko bbfcb00 ("completed v1.0 ready site"); hand-verified players from
    // 953e1fb and the pre-Season-0 'beta' bucket from 4087535. The repo's first
    // commit is a736394 on 2026-07-01, a day before the site was called done.
    date: '2026-07-02',
    scope: '2xko',
    kind: 'launch',
    title: 'The 2XKO Replay Database opens',
    body: "Where this started: high-level 2XKO matches, searchable by champion, player and season. Player identities were verified by hand from the first day. Matches from before Season 0 were labelled beta rather than filed under a season that didn't exist yet.",
  },
];
