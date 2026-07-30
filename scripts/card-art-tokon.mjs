// One-off generator for the MARVEL Tōkon selector card art
// (public/img/games/tokon.png, 1200×630) — the same size and role as the three
// live cards, which are byte-copies of each game repo's own public/og-default.png.
//
// Tōkon has no game repo yet, so THIS script is the art's only provenance. It is
// deliberately not wired into build/generate/postinstall (matching the game
// repos' scripts/og.ts): run it by hand, commit the PNG.
//
//   node scripts/card-art-tokon.mjs
//
// The PNG is freely replaceable — a design pass can drop a new 1200×630 file at
// the same path with no code change.
//
// COLOURS. Sampled from the official Marvel CDN wordmark asset
//   https://cdn.marvel.com/content/2x/marveltokonfightingsouls_lob_log_def_01.webp
// (868×465), by taking the modal exact fill among pixels whose hue falls in the
// orange / blue band. The wordmark sets "FIGHTING" on an orange block and
// "SOULS" on a blue one. The same pass recovers Marvel's published brand red
// (#ED1D24) from that asset, which is how the method was validated.
//
// TRADEMARKS. Type, colour and pattern only — no Marvel or Tōkon logo, no
// character art, no licensed image. Same fan-project rule the other three cards
// follow (they are pure CSS too). "TŌKON" here is Space Grotesk, not the game's
// custom brush lettering.
//
// FONT. The card is set in the engine's --font-display (Space Grotesk). The
// engine commits the LATIN subset only (replay-engine/scripts/setup-fonts.mjs),
// which has no U+014D — so the macron in "TŌKON" would come out as tofu or a
// fallback glyph. Both subsets are therefore fetched from the Google Fonts CDN
// and inlined as data URIs: same typeface, correct macron, and the render itself
// stays offline (no network once the HTML is assembled). Generator-only, exactly
// as the game repos' og.ts documents for its own CDN use.

import { writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome-stable';

/** Sampled from the official wordmark — see the header. */
const ORANGE = '#ff6b03';
const BLUE = '#00a6ff';
/** The family's paper/ink pair, matching the other three cards. */
const PAPER = '#f4eee1';
const INK = '#0a0b0f';

/** Space Grotesk variable (wght 300..700), by unicode subset. latin-ext is the
 *  one that carries U+014D (ō); latin covers everything else. */
const SUBSETS = [
  {
    url: 'https://fonts.gstatic.com/s/spacegrotesk/v22/V8mDoQDjQSkFtoMM3T6r8E7mPbF4Cw.woff2',
    range:
      'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  },
  {
    url: 'https://fonts.gstatic.com/s/spacegrotesk/v22/V8mDoQDjQSkFtoMM3T6r8E7mPb94C-s0.woff2',
    range:
      'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF',
  },
];

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

const html = (fonts) => `<!doctype html><html><head><style>
${fonts}
*{margin:0;box-sizing:border-box}
</style></head>
<body style="width:1200px;height:630px;background:${INK};overflow:hidden;position:relative;font-family:'Space Grotesk',sans-serif;">

  <!-- Comic paneling: the game's own UI language (manga-panel stage and super
       transitions). A shallow skewed gutter divides the hero panel from a lower
       band, which a steeper edge splits again into two sub-panels. The skews are
       deliberately shallow above the type — a panel edge that ran through the
       wordmark would just be a diagonal through the words. -->
  <div style="position:absolute;inset:0;background:${ORANGE};opacity:.13;
              clip-path:polygon(0 0,100% 0,100% 58%,0 64%);"></div>
  <div style="position:absolute;inset:0;background:${BLUE};opacity:.17;
              clip-path:polygon(0 66%,100% 60%,100% 100%,0 100%);"></div>

  <!-- Halftone dot fields, one per panel, at two scales and in the two accents.
       Masked with a gradient so the dots shade off the way a screentone does
       rather than tiling flat. Pure CSS — the card is type, colour and pattern,
       never imagery. -->
  <div style="position:absolute;inset:0;
              background-image:radial-gradient(${ORANGE} 1.7px,transparent 1.8px);
              background-size:12px 12px;
              clip-path:polygon(0 0,100% 0,100% 58%,0 64%);
              -webkit-mask-image:linear-gradient(115deg,rgba(0,0,0,.85),rgba(0,0,0,.15) 62%,rgba(0,0,0,.55));"></div>
  <div style="position:absolute;inset:0;
              background-image:radial-gradient(${BLUE} 2.3px,transparent 2.4px);
              background-size:17px 17px;
              clip-path:polygon(0 66%,100% 60%,100% 100%,0 100%);
              -webkit-mask-image:linear-gradient(75deg,rgba(0,0,0,.3),rgba(0,0,0,.8));"></div>

  <!-- The gutters themselves: heavy ink, the comic-panel edges. -->
  <div style="position:absolute;inset:0;background:${INK};
              clip-path:polygon(0 64%,100% 58%,100% 60%,0 66%);"></div>
  <div style="position:absolute;inset:0;background:${INK};
              clip-path:polygon(58% 100%,66% 62%,70% 62%,62% 100%);"></div>

  <!-- Heavy ink outline around the whole panel. -->
  <div style="position:absolute;inset:0;border:10px solid ${INK};"></div>
  <div style="position:absolute;inset:10px;border:3px solid rgba(244,238,225,.16);"></div>

  <div style="position:absolute;left:80px;top:118px;max-width:1000px;">
    <div style="display:flex;align-items:center;gap:26px;">
      <!-- The family's notched accent tile, split like the wordmark. -->
      <div style="width:118px;height:118px;background:${ORANGE};
                  clip-path:polygon(0 0,calc(100% - 24px) 0,100% 24px,100% 100%,24px 100%,0 calc(100% - 24px));
                  display:flex;align-items:center;justify-content:center;position:relative;">
        <div style="position:absolute;inset:0;background:${BLUE};
                    clip-path:polygon(100% 0,100% 100%,38% 100%);"></div>
        <span style="font-weight:700;font-size:64px;color:${INK};transform:skewX(-8deg);position:relative;">/</span>
      </div>
      <div style="font-weight:700;font-size:88px;letter-spacing:-.01em;color:${PAPER};
                  text-shadow:4px 4px 0 ${INK};">TŌKON<span style="color:${ORANGE};">/</span>REPLAY</div>
    </div>
    <!-- NOT "The competitive <game> replay database" like the three live cards:
         there is no database yet, and the art must not claim one. -->
    <div style="margin-top:30px;font-size:30px;font-weight:500;color:#ece4d4;">
      Coming soon to the Replay Database
    </div>
    <div style="margin-top:14px;font-size:19px;font-weight:500;letter-spacing:.05em;color:#c2bdb0;">
      MARVEL TŌKON: FIGHTING SOULS &nbsp;·&nbsp; 4V4 TAG-TEAM &nbsp;·&nbsp; ARC SYSTEM WORKS
    </div>
  </div>

  <!-- The family's bottom accent strip. The live cards band it per character
       from data/characters.json; Tōkon has no roster data here, so it carries
       the wordmark's own orange/blue split rather than invented per-character
       colours. -->
  <div style="position:absolute;left:0;right:0;bottom:0;height:14px;display:flex;">
    <span style="flex:1;background:${ORANGE};"></span>
    <span style="flex:1;background:${BLUE};"></span>
  </div>
</body></html>`;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630 });
  await page.setContent(html(await fontFaces()), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ type: 'png' });
  const out = join(ROOT, 'public/img/games/tokon.png');
  await writeFile(out, png);
  console.log(`✓ public/img/games/tokon.png (${png.length} bytes)`);
} finally {
  await browser.close();
}
