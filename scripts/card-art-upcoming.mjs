// Selector card art for the UPCOMING games — public/img/games/<slug>.png,
// 1200×630, the same size and role as the live cards.
//
//   node scripts/card-art-upcoming.mjs            # every register below
//   node scripts/card-art-upcoming.mjs <slug>     # one
//
// ONE script with a register per announced game, not a copy per game.
// scripts/card-art-tokon.mjs is the original of this pattern and stays
// untouched: it is the only record of how the shipped tokon.png was made before
// that game got a repo of its own. Everything structural here — the ink ground,
// the 10px border and its inset paper rule, the notched accent tile, the
// SHORT/REPLAY lockup, the "Coming soon" line, the letterspaced kicker, the
// bottom strip — is that script's, so the tiles read as one set. What varies
// per game is the TEXTURE behind the type, and it varies as data (see
// REGISTERS).
//
// A PROMOTED GAME'S REGISTER COMES OUT IN THE FLIP COMMIT. The default run
// renders EVERY register it finds and writes straight over
// public/img/games/<slug>.png, so a register for a live game is a standing
// instruction to replace that game's card art with a tile reading "Coming soon
// to the Replay Database". Granblue's register left at its promotion
// (2026-10-01) and Avatar's at its own, each with the texture nothing else
// reached (`ornate`, `elemental`).
//
// STRIVE'S REGISTER OUTLIVED ITS PROMOTION BY THREE WEEKS (live 2026-09-09,
// retired 2026-10-01), during which a bare run would have overwritten a live
// card. It went with the `metal` texture, and the script now REFUSES to render
// while any register's slug is live in lib/games.ts — the guard below the
// tables, so the next forgotten register is an error, not a hazard.
//
// AT ZERO REGISTERS (every announced game promoted) the bare run says so and
// exits before launching Chrome. The next announcement adds a register and,
// if it needs one, a texture; the retired ones are in git history.
//
// Like its predecessor this is deliberately NOT wired into build/generate:
// `npm run generate` must not need Chrome. Run it by hand, commit the PNGs.
// The PNGs are freely replaceable — a design pass can drop new 1200×630 files
// at the same paths with no code change.
//
// TRADEMARKS. Type, colour and pattern only — no logo, no wordmark lockup, no
// character art, no licensed image. The same fan-project rule the live cards
// follow. Note the temptation and the answer: an official Strive logo
// sits on this machine at ggst-replay-database/design/handoff/GGStrive_Logo.webp
// and is NOT embedded here. Official art is a SAMPLING source for the accents
// below and never an asset.
//
// COLOURS. Every hex is the modal exact fill of an official asset, by the
// method scripts/card-art-tokon.mjs used on the Marvel CDN wordmark: decode,
// drop the transparent / near-achromatic / too-dark pixels, then take the most
// common exact value per hue band. Sources are named per register. Where a
// sampled value is too dark to sit on the card's ink ground it is lifted, and
// BOTH values are recorded — the same "sampled stays in the comment, shipped is
// the lift" convention the game skins use.
//
// FONT. Space Grotesk, the engine's --font-display, fetched from the Google
// Fonts CDN at generation time and inlined as data URIs so the render itself is
// offline. The engine commits the latin subset only
// (replay-engine/scripts/setup-fonts.mjs), so reading it off disk would be
// wrong the moment a card needs anything outside it. Generator-only network
// use, exactly as the game repos' og.ts documents for its own.

import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome-stable';

/** The family's paper/ink pair, shared with the five live cards. */
const PAPER = '#f4eee1';
const INK = '#0a0b0f';

/** Space Grotesk variable (wght 300..700), by unicode subset. Both are fetched;
 *  which ones are PROVED to have rendered depends on what each card draws —
 *  see probeFor(). */
const SUBSETS = [
  {
    name: 'latin',
    url: 'https://fonts.gstatic.com/s/spacegrotesk/v22/V8mDoQDjQSkFtoMM3T6r8E7mPbF4Cw.woff2',
    range:
      'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  },
  {
    name: 'latin-ext',
    url: 'https://fonts.gstatic.com/s/spacegrotesk/v22/V8mDoQDjQSkFtoMM3T6r8E7mPb94C-s0.woff2',
    range:
      'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF',
  },
];

/**
 * The registers, one per game that still has a Coming Soon card. `short` +
 * `kicker` are the only text; the rest is colour and texture parameters. A
 * register never introduces a new layout — `texture()` returns background layers
 * that sit BEHIND the shared type block, so a bad texture can make a card ugly
 * but never illegible.
 *
 * ADDING ONE adds a texture below if it needs a new register; REMOVING one (a
 * promotion) takes its texture with it when nothing else reaches it, which is
 * how `elemental`, `ornate` and `metal` left with Avatar's, Granblue's and
 * Strive's registers.
 */
const REGISTERS = {};

/** Background layers per register. Pure CSS: gradients, clip-paths and masks —
 *  never an image. */
const TEXTURES = {};

async function fontFaces() {
  const faces = await Promise.all(
    SUBSETS.map(async ({ url, range }) => {
      const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 Chrome/145.0' } });
      if (!res.ok) throw new Error(`font subset ${url} → ${res.status}`);
      const b64 = Buffer.from(await res.arrayBuffer()).toString('base64');
      return `@font-face{font-family:'Space Grotesk';font-style:normal;font-weight:300 700;src:url(data:font/woff2;base64,${b64}) format('woff2');unicode-range:${range};}`;
    }),
  );
  return faces.join('\n');
}

/** `U+0100-02BA, U+0131, …` → does it cover this code point? */
function rangeCovers(range, cp) {
  return range.split(',').some((part) => {
    const m = part.trim().match(/^U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?$/);
    if (!m) return false;
    const lo = parseInt(m[1], 16);
    return cp >= lo && cp <= (m[2] ? parseInt(m[2], 16) : lo);
  });
}

/**
 * Which subsets does THIS card actually draw with, and what string proves each?
 *
 * card-art-tokon.mjs fetched both subsets because "TŌKON" needs the macron out
 * of latin-ext. These three titles are pure ASCII, so a hardcoded latin-ext
 * probe would assert a subset the card never draws — a gate that cannot fail is
 * worse than no gate. So the probe strings come from the card's own text: for
 * each subset, the characters ONLY that subset covers. A subset with no unique
 * character here is not drawn and not asserted, and the log says so.
 */
function probeFor(text) {
  const chars = [...new Set([...text])].filter((c) => c.trim());
  return SUBSETS.map(({ name, range }, i) => {
    const others = SUBSETS.filter((_, j) => j !== i);
    const unique = chars.filter(
      (c) =>
        rangeCovers(range, c.codePointAt(0)) &&
        !others.some((o) => rangeCovers(o.range, c.codePointAt(0))),
    );
    return { name, probe: unique.slice(0, 6).join('') };
  }).filter((s) => s.probe);
}

const html = (fonts, r) => `<!doctype html><html><head><style>
${fonts}
*{margin:0;box-sizing:border-box}
</style></head>
<body style="width:1200px;height:630px;background:${INK};overflow:hidden;position:relative;font-family:'Space Grotesk',sans-serif;">

  ${TEXTURES[r.texture.kind](r)}

  <!-- Heavy ink outline around the whole panel, as on every sibling card. -->
  <div style="position:absolute;inset:0;border:10px solid ${INK};"></div>
  <div style="position:absolute;inset:10px;border:3px solid rgba(244,238,225,.16);"></div>

  <div style="position:absolute;left:80px;top:118px;max-width:1000px;">
    <div style="display:flex;align-items:center;gap:26px;">
      <!-- The family's notched accent tile, split by the register's two hues. -->
      <div style="width:118px;height:118px;background:${r.accent};
                  clip-path:polygon(0 0,calc(100% - 24px) 0,100% 24px,100% 100%,24px 100%,0 calc(100% - 24px));
                  display:flex;align-items:center;justify-content:center;position:relative;">
        <div style="position:absolute;inset:0;background:${r.accent2};
                    clip-path:polygon(100% 0,100% 100%,38% 100%);"></div>
        <span style="font-weight:700;font-size:64px;color:${INK};transform:skewX(-8deg);position:relative;">/</span>
      </div>
      <div style="font-weight:700;font-size:88px;letter-spacing:-.01em;color:${PAPER};
                  text-shadow:4px 4px 0 ${INK};">${r.short}<span style="color:${r.accent};">/</span>REPLAY</div>
    </div>
    <!-- NOT "The competitive <game> replay database" like the live cards:
         there is no database yet, and the art must not claim one. -->
    <div style="margin-top:30px;font-size:30px;font-weight:500;color:#ece4d4;">
      Coming soon to the Replay Database
    </div>
    <div style="margin-top:14px;font-size:19px;font-weight:500;letter-spacing:.05em;color:#c2bdb0;">
      ${r.kicker}
    </div>
  </div>

  <!-- The family's bottom accent strip. The live cards band it per character
       from data/characters.json; these games have no roster data here, so it
       carries the register's own two sampled hues. -->
  <div style="position:absolute;left:0;right:0;bottom:0;height:14px;display:flex;">
    <span style="flex:1;background:${r.accent};"></span>
    <span style="flex:1;background:${r.accent2};"></span>
  </div>
</body></html>`;

// A REGISTER FOR A LIVE GAME IS REFUSED, before anything renders. The bare
// run renders every register, so one left behind after its game's flip is a
// command that overwrites that game's live card art with a Coming Soon tile —
// and Strive's sat here for three weeks after its promotion. The live slugs are
// read out of lib/games.ts's GAMES array rather than restated (this is plain
// node and that table is TypeScript, the trade verify-shell makes for UPCOMING).
const gamesSrc = await readFile(join(ROOT, 'lib/games.ts'), 'utf8');
const liveBlock = gamesSrc.slice(
  gamesSrc.indexOf('export const GAMES'),
  gamesSrc.indexOf('export const UPCOMING'),
);
const live = new Set([...liveBlock.matchAll(/^ {4}slug: '([a-z0-9-]+)',$/gm)].map((m) => m[1]));
if (live.size === 0) {
  console.error(
    '✖ read no live slugs out of lib/games.ts GAMES — refusing to guess which art is live',
  );
  process.exit(1);
}
const stale = Object.keys(REGISTERS).filter((s) => live.has(s));
if (stale.length) {
  console.error(
    `✖ register(s) for LIVE game(s): ${stale.join(', ')}. Rendering would overwrite that ` +
      'live card art with a Coming Soon tile. Delete the register — a promotion out of ' +
      'UPCOMING deletes its register in the same commit (lib/games.ts, UpcomingGame).',
  );
  process.exit(1);
}

const slugs = process.argv.slice(2);
const unknown = slugs.filter((s) => !REGISTERS[s]);
if (unknown.length) {
  console.error(
    `✖ unknown slug(s): ${unknown.join(', ')} — known: ${Object.keys(REGISTERS).join(', ')}`,
  );
  process.exit(1);
}
const targets = slugs.length ? slugs : Object.keys(REGISTERS);
if (targets.length === 0) {
  console.log('No registers: every announced game has been promoted. Nothing to render.');
  process.exit(0);
}

// One fetch for three renders — the subsets do not vary per card.
const fonts = await fontFaces();

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  for (const slug of targets) {
    const r = REGISTERS[slug];
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630 });
    await page.setContent(html(fonts, r), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);

    // fonts.ready resolves for a FALLBACK face too, and so does
    // document.fonts.check() for text outside every declared unicode-range.
    // The only proof is a width that differs from the default face — measured
    // against a family that cannot exist, never against `serif`, which is what
    // let a broken subset ship once (tokon-replay-database/scripts/og.ts).
    const wanted = probeFor(
      `${r.short}/REPLAY Coming soon to the Replay Database` +
        r.kicker.replace(/&nbsp;/g, ' ').replace(/&times;/g, '×'),
    );
    const probe = await page.evaluate((specs) => {
      const ctx = document.createElement('canvas').getContext('2d');
      const NOPE = '__no_such_family__';
      return specs.map((s) => {
        ctx.font = `700 88px 'Space Grotesk', ${NOPE}`;
        const withFamily = ctx.measureText(s.probe).width;
        ctx.font = `700 88px ${NOPE}`;
        return { ...s, withFamily, withoutFamily: ctx.measureText(s.probe).width };
      });
    }, wanted);
    const missing = probe.filter((p) => Math.abs(p.withFamily - p.withoutFamily) <= 1);
    if (missing.length) {
      throw new Error(
        `refusing to ship ${slug}.png set in a fallback face.\n` +
          probe
            .map(
              (p) =>
                `  Space Grotesk ${p.name} ("${p.probe}"): ${
                  Math.abs(p.withFamily - p.withoutFamily) > 1 ? 'ok' : 'MISSING'
                } — ${p.withFamily.toFixed(1)}px vs fallback ${p.withoutFamily.toFixed(1)}px`,
            )
            .join('\n'),
      );
    }
    console.log(
      `  ${slug}: fonts verified per subset — ` +
        probe
          .map(
            (p) =>
              `${p.name} "${p.probe}" ${p.withFamily.toFixed(0)}px vs fallback ${p.withoutFamily.toFixed(0)}px`,
          )
          .join(' · '),
    );

    const png = await page.screenshot({ type: 'png' });
    const out = join(ROOT, 'public/img/games', `${slug}.png`);
    await writeFile(out, png);
    await page.close();
    console.log(`✓ public/img/games/${slug}.png (${png.length} bytes)`);
  }
} finally {
  await browser.close();
}
