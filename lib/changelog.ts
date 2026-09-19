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

/** Which part of the platform a change belongs to. The seven game slugs match
 *  ShellGame.slug in lib/games.ts (NOT .id — Tekken's id is 'tekken8'), which
 *  is how the page finds each badge's accent. 'platform' is a change all games
 *  got at once; 'engine' and 'shell' are the shared layer and the apex.
 *  Adding one is three edits, and only the first is type-checked: this union,
 *  SCOPES in scripts/verify-changelog.mjs, and SCOPE_LABELS in
 *  app/pages/changelog.vue. The last is a Record<Scope, string>, so omitting it
 *  is a typecheck failure rather than a badge that quietly renders its slug. */
export type Scope =
  | 'platform'
  | 'engine'
  | 'shell'
  | '2xko'
  | 'tekken'
  | 'sf6'
  | 'tokon'
  | 'ffcotw'
  | 'ggst'
  | 'avatar';

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
    // avatar-replay-database, launch. Every number frozen from that repo's
    // data/replays.json and data/report.md, measured 2026-09-19: 502 published
    // records, 366 players, 12 released fighters, 34 supports, and 33 intakes
    // with records of which ONE is the Replay Theater index — so "32 channels
    // and one catalogue", not 33 channels. 241 records state at least one
    // support (48.0%). Earliest record 2026-07-24, one day after the
    // 2026-07-23 launch build; latest 2026-09-16.
    //
    // EIGHT WEEKS IS THE POINT OF THE SECOND SENTENCE, and it is the one thing
    // this row must not let a reader get wrong. Strive's entry opens on an
    // April 2020 pre-release build and CotW's on a February 2025 beta; a
    // visitor who has read those arrives expecting years of footage. This
    // corpus is 54 days old. Saying so is not a hedge, it is the fact that
    // makes the 502 legible.
    //
    // THE WEEKLY RATE IS MEASURED HERE, NOT INHERITED. The handoff carried a
    // "~30-35 records a week" figure and that is LOW against this corpus: by
    // ISO week the seven complete weeks run 39, 51, 63, 66, 73, 75 and 81, mean
    // 64. Excluding the index intake's 152 (which arrived as a catalogue sweep
    // rather than week by week) the same weeks run 31 to 71. Either way the
    // honest shape is "tens of records a week, not thousands", which is what
    // the body says and what stays true as the cron runs. A bare number would
    // not: this file redeploys only when the shell changes.
    //
    // THE ROSTER COUNT IS STATED AND THE ANNOUNCED COUNT IS NOT, which reverses
    // CotW's and Strive's rows on purpose. Those two omitted their roster
    // entirely because a fighter number goes stale inside a season. This vendor
    // has declared NO season and published NO date for anything announced: its
    // own words are "over the course of the season" and "later this year", and
    // the only "Fall 2026" anywhere is on a fan wiki. A 12 that cannot be
    // dated out of date is therefore safe to print, and it is the number a
    // visitor filtering by fighter actually needs. The announced count is left
    // out because it does not resolve cleanly either: scripts/expiries.ts holds
    // SIX unreleased rows, five named (Iroh, Ty Lee, Lin Beifong, Bolin, Tagah)
    // and a sixth that is a SOLD BUT UNCHOSEN Year 1 vote slot. "Five more" and
    // "six more" are both defensible and neither is worth a sentence, so the
    // body says the shape instead.
    //
    // THE SUPPORT SENTENCE IS THIS GAME'S ONLY UNIQUE CLAIM and it carries its
    // own mechanism, because the asymmetry is the interesting half: the
    // catalogue fills its support column on 100% of rows and no title channel
    // states a support on more than a handful of uploads, which is why 241 of
    // 502 rather than all of them. A support is NOT a second character in this
    // archive (that repo keeps charactersPerSide at 1 deliberately), so the
    // sentence says "as well as a fighter" rather than naming two picks.
    //
    // THE SEGMENT SENTENCE IS DELIBERATELY ABSENT. 132 records are single
    // matches cut from a tournament stream at an offset, and that IS true here
    // — but SF6's, CotW's and Strive's rows all already say "opening one starts
    // the video at that match rather than at the top of the bracket". A fourth
    // identical sentence is the changelog's version of the four cards that all
    // said "character usage · … · meta over time", and the header's "never a
    // restatement" rule covers it. The support asymmetry earned the line
    // instead.
    //
    // "JOINS" IS THE HOUSE WORD, verified rather than assumed: all five prior
    // game launches use it (2XKO's opens, but Tekken, SF6, Tōkon, CotW and
    // Strive all "join"), so this row matches them.
    //
    // EVO AND RANKED ARE BOTH LEFT OUT. Ranked Mode 1.0 landed in the
    // 2026-09-02 patch and nothing in this corpus carries a ladder tier — the
    // recon's 73-channel sweep found rank tokens on zero channels — so there is
    // no rank story to tell yet, and the archive has no tournament depth worth
    // naming at eight weeks.
    date: '2026-09-19',
    scope: 'avatar',
    kind: 'launch',
    title: 'Avatar Legends: The Fighting Game joins the archive',
    body: 'Avatar Legends: The Fighting Game joins Replay Database with 502 records from 32 channels and one catalogue of tournament streams, covering 366 players and all 12 fighters released so far. It is eight weeks of footage rather than years of it: the first record is the day after the July 2026 launch and the last is mid-September, and the archive gains tens of records a week, not thousands. More fighters are announced and the vendor has published a date for none of them, so the roster here is what has shipped rather than what was promised. Every side carries a support as well as a fighter, and 241 records name one, because the catalogue states the support on every row where the channels almost never do.',
  },
  {
    // ggst-replay-database, launch. Every number frozen from that repo's
    // data/replays.json on 2026-09-09: 24,706 published records, 7,966 of which
    // carry a startSeconds (the Replay Theater segments), 8,245 from that
    // catalogue in total, and 1,288 on Ver 2.02, the newest patch. Earliest
    // record 2020-04-18, a closed-beta build fourteen months before the June
    // 2021 release; the pre-release era runs to Ver 1.03.
    //
    // "SETS", NOT "MATCHES", and this is the one word the entry turns on. CotW's
    // row and SF6's both say matches, correctly for their sources; copying them
    // here would have been wrong. A Strive game runs about three minutes (the
    // catalogue's own same-pair gap median is 196s) and every intake channel's
    // p10 upload is at least 3m35 with medians from 5m21 to 10m30, so a channel
    // upload is a whole set. The single exception is the frozen ggstLowLevel,
    // and it contributes 19 records. The segments are the other half of the
    // sentence: those ARE single matches, cut at an offset out of an event
    // stream, which is why the body can say both without contradicting itself.
    // "short clips" covers ggstHq's Shorts, median exactly 60s, which is why
    // that channel carries a 30-second duration floor where the platform
    // default is 120.
    //
    // SEASON HONESTY, STATED OUT LOUD, because the filter default depends on it:
    // the patch filter defaults to the WHOLE archive and offers seasons above
    // patches, and the reason is that the current patch is 5.2% of what is here.
    // A patch-first default would have shown a visitor one twentieth of the
    // archive and looked like the archive.
    //
    // EVO IS DELIBERATELY NOT NAMED. Strive is an Evo main game and the
    // temptation is real, but the catalogue holds 107 Evo rows out of 22,000,
    // essentially 2021 and 2022 with a token tail. Naming it would promise a
    // depth this archive does not have.
    //
    // The roster count is absent on purpose, exactly as CotW's row omitted its
    // own: two Season 5 characters are announced and unnamed (Winter 2026 and
    // Spring 2027 on ArcSys's store page), so any fighter number goes stale
    // inside a season. The record count is a frozen launch delta and does not.
    date: '2026-09-09',
    scope: 'ggst',
    kind: 'launch',
    title: 'GUILTY GEAR -STRIVE- joins the archive',
    body: 'GUILTY GEAR -STRIVE- joins Replay Database with 24,706 replays, running from an April 2020 pre-release build through Season 5. Most are whole sets and short clips rather than single matches, because that is what the channels upload; 7,966 are tournament matches cut from event streams, so opening one starts the video at that match rather than at the top of the bracket. Every patch in the game history is represented, and at launch the current one held 1,288 of those replays, so the filters open on the whole archive and offer seasons before patches. Footage from before the June 2021 release is filed under its own era, so a season filter leaves it out.',
  },
  {
    // shell, this commit. Scope 'shell': the games' data is untouched, only the
    // front door that lists them.
    // NO EM DASHES and no numbers, per the rules above. The one number a reader
    // might want (how many games) is on the selector itself and grows on its own.
    // "three to a row" rather than a pixel width: a visitor sees the row, not
    // the measure. The second sentence is the one that earns the entry — the
    // cards say different things now, which is the visible change; the reflow
    // is the reason it was possible to say them.
    // What is deliberately NOT claimed: that anything about the archives
    // changed. It did not. Every fact in the new card lines was already true
    // and already filterable; they were simply not what the cards said.
    date: '2026-09-06',
    scope: 'shell',
    kind: 'improvement',
    title: 'The front door got wider, and the cards got specific',
    body: 'The game cards now sit three to a row on a wide screen instead of two, so the whole collection fits without scrolling past it. Each card also says what its own archive holds rather than what every archive holds: 2XKO names the Fuse each team ran, Tekken names the rank ladder, Tōkon its four-fighter teams, City of the Wolves its patch history back to the open beta. Four of the five used to carry the same sentence with one word changed. The lines no longer cut off mid-word on a narrow window either, which they had been doing on every card.',
  },
  {
    // shell, 2026-09-04 — UPCOMING returns with three entries after six weeks
    // empty (Tōkon's promotion emptied it on 2026-08-14).
    // scope 'platform' rather than the 'shell' the Tōkon announcement used:
    // that row was about one card and the mechanism behind it, this one is
    // about three games. Either renders the umbrella teal badge, so the
    // distinct-badge gate is unmoved.
    // Titles verified against the vendors' own pages, not memory:
    // guiltygear.com/ggst/en/ (© ARC SYSTEM WORKS),
    // rising.granbluefantasy.jp/en/about (© Cygames, Inc. Developed by ARC
    // SYSTEM WORKS), and for Avatar Legends the three official surfaces that
    // disagree on its studio credits — see the entry comment in lib/games.ts.
    // NO DATES AND NO ORDER, deliberately, and the body says why out loud so
    // the next person does not add them back. The three cards are announcements
    // with no pipeline behind them yet; a card that sits for months is fine,
    // and a missed date on the front door is not. Same reasoning as the Tōkon
    // row, which shipped six weeks after its own game's release date and would
    // have been wrong on day one had it named it.
    // No frozen counts here on purpose: there is nothing counted yet. The one
    // number a reader might want — how many games the archive holds — is on the
    // selector already and grows on its own.
    date: '2026-09-04',
    scope: 'platform',
    kind: 'feature',
    title: 'Three more games are on the way',
    body: 'Guilty Gear Strive, Avatar Legends: The Fighting Game and Granblue Fantasy Versus: Rising join the front door as announced games. None of the three is a link and none carries a replay count: there is nothing to browse yet, and saying so plainly beats a card that looks broken. No dates and no running order are attached, because this page redeploys only when the shell changes and a promise baked into it would go stale while nobody is looking.',
  },
  {
    // ffcotw-replay-database, launch. Numbers frozen from that repo's
    // data/videos.json on 2026-09-03: 4,481 published records, of which 127
    // carry a startSeconds and an event tag (the Replay Theater tagged arm).
    // Earliest record 2025-02-22, inside Open Beta Test 1; the Beta era runs to
    // Early Access on 2025-04-21.
    // "matches", not "sets", for the same reason the SF6 row says it: this
    // catalogue's own API calls them matches, and exactly one entry in 3,465
    // uses a second character column, so a counter-pick is the rare case here
    // rather than the norm.
    // The fighter count is deliberately absent: Kim Kaphwan and Laocorn are
    // announced for September and November, so any roster number goes stale
    // inside a month. The record count is a frozen launch delta and does not.
    date: '2026-09-03',
    scope: 'ffcotw',
    kind: 'launch',
    title: 'FATAL FURY: City of the Wolves joins the archive',
    body: 'FATAL FURY: City of the Wolves joins Replay Database with 4,481 matches, running from the February 2025 open beta through Season 3. 127 of them are tournament matches cut from event streams, so opening one starts the video at that match rather than at the top of the bracket. Beta and early access footage is filed under its own era, so a current-patch filter leaves it out.',
  },
  {
    // sf6 5621bda "data: 1,065 tournament matches from 77 brackets, via the
    // Replay Theater index". Counts frozen from that repo's data/videos.json the
    // same day: 1,065 records carrying a videoId, 86 distinct videoIds, 77 distinct
    // event tags, 2023-06-12 to 2026-04-13. Seasons S1 851 / S2 205 / S3 9 /
    // S4 none, so "nearly all" is 1,056 of 1,065 and the current-patch claim is
    // exact rather than rounded: patch 2.0401 holds zero of them.
    // NOT "weeklies", which the Tekken row two below can say and this one
    // cannot: the tags are numbered instalments (Cobra Kai #1..#27, Bloodsport
    // #1..#17) and nothing in the data states a cadence. "Recurring series" is
    // what the tags actually prove. The instalment counts are the TAG counts,
    // 25 and 14, not the highest number in each series — several numbers are
    // missing from the catalogue and an earlier draft said 27 and 17.
    // The 1,044 is the frozen share that shares a VOD; 17 videos hold a single
    // record at offset 0 where the record is the whole upload, and 4 more hold a
    // single record at an offset. The Tournament group's new total is
    // deliberately absent: it grows.
    // NOT "sets", which every sibling row says and this one must not. A set is
    // several games with counter-picks between them, and the data separates the
    // two cleanly: 1.8% of these records show a side changing character, against
    // 21.0% of the 81 Evo SETS already in this archive. Twelve times the rate.
    // The catalogue's own API calls them matches, and so does this. The closing
    // clause said "at that set" while the rest of the row said matches; that was
    // the last of it, corrected 2026-08-31 when the three sibling rows were.
    // "77 brackets" is the tag count. Four of the 77 are phases of another
    // (CEOtaku Pools and Top 16, and two more), so 73 are distinct events; the
    // looser word is the one the 2XKO row already uses for the same shape.
    date: '2026-08-31',
    scope: 'sf6',
    kind: 'data',
    title: '1,065 tournament matches, cut from the streams',
    body: '1,065 tournament matches arrive in SF6 from 77 brackets, nearly all of them Season 1 and Season 2 footage running from June 2023 to April 2026, so a current-patch filter leaves them out. Two recurring series carry most of it, Cobra Kai and Bloodsport between them holding 683 across 39 instalments, with LVL UP EXPO and CEOtaku behind them. Most are a moment inside a longer stream rather than an upload of its own (1,044 of the 1,065), so opening one starts the video at that match instead of at the top of the bracket.',
  },
  {
    // tekken ace0d3b "data: 317 tournament sets from 26 events, via the Replay
    // Theater index", merged to main and confirmed by that repo's
    // verify:deployed on 2026-08-30. Counts frozen from data/videos.json the
    // same day: 317 records carrying a videoId, over 62 distinct videoIds, 26
    // distinct event tags, 2024-02-04 to 2025-03-16, all season 1. Twelve tags
    // are ParagOnline weeklies and carry 224 of the 317; CEOtaku holds 18.
    // NOT "62 event streams organisers uploaded whole", which an earlier draft
    // said and the data refuses: 31 of the 62 videos are under 20 minutes and
    // four events are posted one video per match, so 32 videos hold a single
    // set at offset 0. Hence "most", with the frozen 285 that do share a video.
    // Combo Breaker is cut from the list too: its 2 sets come from an 8-minute
    // clip on a competitor's own channel, and naming it beside CEOtaku promised
    // major coverage the batch does not hold. The 274/274 is a re-measurement
    // against the uploaders' own descriptions: 27 of the 62 VODs publish a
    // chapter list, 274 sets land inside one, and all 274 match to the second.
    // The tournament group's new total is deliberately absent: it grows.
    // MATCHES, NOT SETS — amended 2026-08-31, and this row is the one the test
    // was actually run for. The counter-pick rate separates the two cleanly: a
    // set is several games with counter-picks between them, and 2.5% of these
    // records show a side changing character (8 of 317) against 22.2% of the 63
    // committed Evo SETS in this repo (14 of 63). Nine times the rate, and the
    // same shape SF6 measured at 1.8% vs 21.0%. The eight are not spread across
    // the corpus either — five are one player and all eight are the ParagOnline
    // series, which is one curator occasionally recording a switch rather than a
    // set-level convention. The catalogue's own API field is `matches`.
    date: '2026-08-30',
    scope: 'tekken',
    kind: 'data',
    title: '317 tournament matches for Tekken',
    body: '317 tournament matches join Tekken, all of them Season 1: twelve ParagOnline weeklies carry 224, with CEOtaku and a dozen smaller brackets behind them, running February 2024 to March 2025. Most are a moment inside a longer video rather than an upload of its own (285 of the 317), so opening one starts the video at that match instead of at the top of the bracket.',
  },
  {
    // tokon ffb6169 "data: 44 tournament sets from 5 events, via the Replay
    // Theater index", merged and verify:deployed 2026-08-30. 44 records over 5
    // videoIds and 5 event names, 2026-07-26 to 2026-08-25. The eleven days:
    // TNS Beta Tournament published 2026-07-26 against the game's release on
    // 2026-08-06 (LAUNCH in that repo's scripts/patches.ts), and it is the VOD's
    // publish date, which is what the record carries. 18 of the 44 are that
    // bracket and they sit in season 0, the era the patch facet labels
    // "Pre-release" — worth naming, because a pre-release build is the
    // difference between usable and not for a matchup lookup. All 88 sides
    // arrive at four fighters. An earlier draft closed on "which most sides
    // here cannot manage", which is the corpus-wide completion share the rule
    // above forbids, rounded to a word: it is 58% today and moves.
    // MATCHES, NOT SETS — amended 2026-08-31, and unlike Tekken's row this one
    // is NOT backed by the counter-pick test, which has zero power here. The test
    // asks how often a side changed character; the catalogue carries exactly four
    // character columns per side and this game fills all four on 100% of entries,
    // so a fifth fighter is unrepresentable and the rate is 0 of 44 by
    // construction rather than by measurement. What the amendment rests on
    // instead: the catalogue's own API field is `matches`, and the two games
    // where the test COULD run both came back matches (SF6 1.8% vs 21.0%, Tekken
    // 2.5% vs 22.2%). Leaving this row alone would have made "sets" mean
    // whichever games happened to be untestable.
    date: '2026-08-30',
    scope: 'tokon',
    kind: 'data',
    title: "Tōkon's first five tournaments",
    body: "Forty-four matches from Tōkon's first five tournaments, cut from five event streams each running well over an hour. Eighteen come from a beta bracket published eleven days before the game shipped, filed under Pre-release so you can leave them out. All 88 sides arrive with their four fighters already named, so none of these needed the footage read to complete a team.",
  },
  {
    // engine v0.11.0 (character band) + v0.12.0 (Combos nav item, leaving-site
    // dialog), plus the four app-side configs and pin bumps, all 2026-08-28.
    // Character counts frozen from comboforge.gg's public roster API the same
    // day: 15 of 15 for 2XKO, 21 of 21 for Tōkon, 31 of 31 for SF6, 36 of 42 for
    // Tekken. One entry rather than two a day apart: a visitor sees one feature.
    date: '2026-08-28',
    scope: 'platform',
    kind: 'feature',
    title: 'Combos for a character, one click away',
    body: "Every character page now links straight to that character's combos on ComboForge, our partner combo database, and a Combos link in the top bar opens the whole list for the game you're on. The character link goes to the character, not the front page: 103 of the 109 characters here have a page over there, and the six that don't (all Tekken) open the Tekken 8 combo list instead. Following one asks first and opens it in a new tab, so you keep your place here.",
  },
  {
    // 2xko e0c7d1d "data: 888 tournament sets from replayTheater — 5,638 →
    // 6,526", 2026-08-28, the day the source landed. Backfilled on 2026-08-30
    // while writing the Tekken and Tōkon rows: the change shipped without an
    // entry, and it is the one that introduced records that are slices of a
    // video. Counts frozen from data/videos.json: 888 records with a videoId
    // over 64 distinct videoIds and 63 event TAGS. "Brackets", not "events":
    // several tags are phases of one tournament (EVO 2026 Pools / Top 24 /
    // Top 8, Frosty Faustings XVIII Pools / Top 24 / Top 96), which collapse to
    // 57. Every one of the 64 videos runs over an hour, median 3h12m, so
    // "an hour or more" is measured rather than assumed. The footage reaches
    // back to 2025-09-14, well before the source itself. 811/848 re-measured
    // against the uploaders' descriptions the same way as Tekken's. The
    // mechanism sentence an earlier draft carried is gone: the Tekken row two
    // above already teaches it, and the rule forbids a sentence that would
    // survive being deleted.
    //
    // MATCHES, NOT SETS — amended 2026-08-31, and this row is the one where the
    // evidence pointed BOTH WAYS, so both halves are recorded rather than the
    // deciding one alone.
    //
    // FOR "sets": the gap analysis this row was audited on. Consecutive records
    // inside one VOD are never close together — the minimum gap across all 824
    // shared-VOD pairs is 223s and the median is 583s — and that was read as
    // set-level segmentation, because games inside a set follow each other
    // quickly and sets do not.
    //
    // FOR "matches", and this is what carried it. (a) The catalogue's own API
    // field is `matches`. (b) Both games where the counter-pick test HAS power
    // came back matches: SF6 1.8% vs 21.0% for its Evo sets, Tekken 2.5% vs
    // 22.2%. (c) The gap analysis does not survive being applied to them. SF6's
    // minimum gap is 74s with 42 of its 979 pairs under 180s, and SF6 is PROVEN
    // matches — so a large minimum gap is not evidence of sets. It is evidence
    // of downtime, which is what a bracket stream is mostly made of, and
    // scripts/fetch-theater.ts says so in as many words: "the gap to the next
    // set includes the downtime between them."
    //
    // WHAT IS NOT KNOWN, plainly: the counter-pick test cannot be run here at
    // all. The catalogue caps a 2XKO side at two champions, so a within-set
    // switch is unrepresentable and the 0 of 888 is a schema fact, not a
    // measurement. This row is amended on (a) and (b), with (c) removing the
    // only reason to hold out — not on a test of its own data.
    date: '2026-08-28',
    scope: '2xko',
    kind: 'data',
    title: '888 tournament matches, cut from the streams',
    body: '888 tournament matches join 2XKO, cut from 64 streams that each run an hour or more, across 63 brackets and reaching back to September 2025.',
  },
  {
    // shell 46aaba9 (the page), e5b5c71 (the selector's "What's new" link),
    // 6f68476 (the footer link, engine v0.7.1), bebd64e (copy pass); all
    // 2026-08-20, verified live at replaydatabase.com/changelog the same day.
    date: '2026-08-20',
    scope: 'shell',
    kind: 'feature',
    title: "The changelog you're reading",
    body: 'Every change a visitor can see now gets a dated entry here, newest first, going back to the day the 2XKO Replay Database opened. The entries are written by hand rather than pulled from commit messages, so this page carries what you can see or do differently, not every change to the pipelines behind it. The front door shows the date of the newest one, so you can tell at a glance whether anything has moved.',
  },
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
    // tekken b4db6ca — 63 sets, 63/63 both-sides-exact, 14/14 counter-picked
    // (was written as 13/13 and corrected 2026-09-01: the measured value is 14,
    // in the corpus and in cache/evo/ground-truth.json alike, and it was never
    // 13 — checked back to this row's own origin commit)
    // sides, and the 37.7% (23/61) title-order defect that forced HUD reads.
    date: '2026-08-07',
    scope: 'tekken',
    kind: 'data',
    title: 'Evo footage for Tekken 8',
    body: "Sixty-three Evo sets join Tekken, with characters and sides read from the broadcast rather than the video title. That matters more here than anywhere else: on Tekken's Evo uploads, the title names the two players in the wrong order 37.7% of the time. Who played what comes from the on-screen HUD, never from the title. All 14 sets where a player counter-picked mid-set show both characters they used.",
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
