// Selector card art for the UPCOMING games — public/img/games/<slug>.png,
// 1200×630, the same size and role as the seven live cards.
//
//   node scripts/card-art-upcoming.mjs            # every register below
//   node scripts/card-art-upcoming.mjs gbvsr      # one
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
// to the Replay Database". Avatar's register was deleted on 2026-09-19 for
// exactly that reason, together with the `elemental` texture that nothing else
// reached.
//
// ggst's REGISTER IS STILL HERE AND STRIVE HAS BEEN LIVE SINCE 2026-09-09. That
// is a known hazard, left alone deliberately by the Avatar flip rather than
// overlooked: a bare `node scripts/card-art-upcoming.mjs` today would overwrite
// a live game's card art. Pass the slug you mean until somebody retires that
// register.
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

import { writeFile } from 'node:fs/promises';
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
 * how `elemental` left with Avatar's register on 2026-09-19.
 */
const REGISTERS = {
  ggst: {
    short: 'STRIVE',
    kicker: 'GUILTY GEAR -STRIVE- &nbsp;·&nbsp; 2.5D FIGHTER &nbsp;·&nbsp; ARC SYSTEM WORKS',
    // Sampled from the official logo supplied by the rights holder
    // (ggst-replay-database/design/handoff/GGStrive_Logo.webp, 820×230):
    // letterform red #7b1b1e, bone white #e5e5e5. The GOLD is the skin's
    // --color-primary (that repo's design/handoff/tokens.css), anchored on the
    // gold-foil logo variant used on the store capsules — PROVISIONAL, and the
    // one value here the theme may still move. Red is deliberately not the
    // accent: at any lightness that would carry text it lands on Tekken.
    accent: '#d9a53a',
    accent2: '#7b1b1e',
    // Metal and stencil: milled brush, a raking sheen, and cut slits. Guilty
    // Gear's own UI language is machined metal and heavy stencil type.
    texture: { kind: 'metal', brush: 7, sheen: 0.3, slits: 11 },
  },
  gbvsr: {
    short: 'GBVSR',
    kicker: 'GRANBLUE FANTASY VERSUS: RISING &nbsp;·&nbsp; CYGAMES &times; ARC SYSTEM WORKS',
    // Sampled from the official key-visual logo
    // (rising.granbluefantasy.jp/assets/images/kv_logo.9880ca03.png, 655×319):
    // ultramarine #0000c8 is 72.5% of its flat fills, sky #5bc9fa is 9.0%.
    // The ultramarine is lifted L .376 → .593 for AA and carried +8° of hue,
    // which is what buys it clear water from Tōkon's #03a5fe rather than
    // sitting 17° away as a second blue card.
    accent: '#5569ff',
    accent2: '#5bc9fa',
    // Fantasy-ornate: a crossed diamond lattice, a soft bloom behind the
    // lockup, and nested rules instead of one — the register of an illuminated
    // border, without drawing anything anyone owns.
    texture: { kind: 'ornate', lattice: 34, bloom: 0.22, insets: 3 },
  },
};

/** Background layers per register. Pure CSS: gradients, clip-paths and masks —
 *  never an image. */
const TEXTURES = {
  metal: (r) => `
  <!-- Milled brush in two directions, then a raking sheen across it. -->
  <div style="position:absolute;inset:0;opacity:.16;
              background:repeating-linear-gradient(102deg, ${r.accent} 0 1px, transparent 1px ${r.texture.brush}px),
                         repeating-linear-gradient(78deg, ${r.accent2} 0 1px, transparent 1px ${r.texture.brush * 2}px);"></div>
  <div style="position:absolute;inset:0;opacity:${r.texture.sheen};
              background:linear-gradient(102deg, transparent 18%, ${r.accent}55 40%, transparent 58%);"></div>
  <!-- Stencil slits: the cut bridges that keep a stencil letter in one piece.
       Kept to a 54px band at the very top — above where the type block starts
       (118px), for the reason card-art-tokon.mjs gives about panel edges. -->
  <div style="position:absolute;left:0;right:0;top:0;height:54px;background:${r.accent};opacity:.11;
              clip-path:polygon(${Array.from({ length: r.texture.slits }, (_, i) => {
                const x = 3 + i * (94 / r.texture.slits);
                return `${x}% 0,${x + 1.6}% 0,${x + 0.9}% 100%,${x - 0.7}% 100%`;
              }).join(',')});"></div>
  <div style="position:absolute;inset:0;background:${INK};
              clip-path:polygon(0 70%,100% 64%,100% 66%,0 72%);"></div>`,

  ornate: (r) => `
  <!-- Crossed lattice: an illuminated border's diamond fill, drawn as two
       gradients rather than any borrowed ornament. -->
  <div style="position:absolute;inset:0;opacity:.17;
              background:repeating-linear-gradient(45deg, ${r.accent} 0 1px, transparent 1px ${r.texture.lattice}px),
                         repeating-linear-gradient(-45deg, ${r.accent2} 0 1px, transparent 1px ${r.texture.lattice}px);"></div>
  <div style="position:absolute;inset:0;opacity:${r.texture.bloom};
              background:radial-gradient(ellipse 62% 52% at 32% 40%, ${r.accent} 0%, transparent 68%);"></div>
  ${Array.from({ length: r.texture.insets }, (_, i) => {
    const inset = 22 + i * 9;
    return `<div style="position:absolute;inset:${inset}px;border:1px solid ${r.accent}${['33', '22', '18'][i] ?? '18'};"></div>`;
  }).join('\n  ')}`,
};

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

const slugs = process.argv.slice(2);
const unknown = slugs.filter((s) => !REGISTERS[s]);
if (unknown.length) {
  console.error(
    `✖ unknown slug(s): ${unknown.join(', ')} — known: ${Object.keys(REGISTERS).join(', ')}`,
  );
  process.exit(1);
}
const targets = slugs.length ? slugs : Object.keys(REGISTERS);

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
