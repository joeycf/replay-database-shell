import puppeteer from 'puppeteer-core';

/**
 * The cutover battery (Phase-5 prompt D.4) — run against a LIVE shell host:
 *
 *   node scripts/verify-cutover.mjs                      # https://replaydatabase.com
 *   node scripts/verify-cutover.mjs https://<preview>    # the C.3 rehearsal host
 *
 * Gates:
 *   1. / = the selector, umbrella-themed (#17cfc8), valid ItemList JSON-LD.
 *   2. Every legacy 2XKO apex URL shape 30x → target → 200: /champions/ekko,
 *      a real /players/<id> (sampled from the game sitemap), /stats,
 *      /?fuse=juggernaut (filters!), /?v=<id> (modal opens).
 *   3. /2xko/ + /tekken/ click-through THROUGH the shell host: pages render
 *      real cards, canonicals carry the subpath on the apex origin, computed
 *      --color-primary = #ff2e88 (2XKO) / #e13048 (Tekken) — the Phase-4
 *      theme-presence gate re-applied through the proxy — and /health is 200.
 *   4. /robots.txt points at /sitemap.xml; /sitemap.xml is a sitemap INDEX
 *      listing sitemap-pages.xml + both game sitemaps; each game sitemap's
 *      <loc>s ALL carry the game prefix; no unprefixed game <loc> anywhere.
 *
 * Exit non-zero on any failed gate. Chrome per STACK §5.9
 * (/usr/bin/google-chrome-stable, override via CHROME_PATH).
 */

const HOST = (process.argv[2] || 'https://replaydatabase.com').replace(/\/$/, '');
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome-stable';
// The apex the canonicals/sitemaps must point at — build-time absolute URLs,
// fixed regardless of which host serves the page (preview or production).
const APEX = 'https://replaydatabase.com';

let pass = 0;
let fail = 0;
const check = (name, ok, detail = '') => {
  if (ok) {
    pass++;
    console.log(`  ✓ ${name}`);
  } else {
    fail++;
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
  }
};

/** Follow redirects manually, recording every hop. */
async function chain(path, maxHops = 5) {
  const hops = [];
  let url = `${HOST}${path}`;
  for (let i = 0; i < maxHops; i++) {
    const res = await fetch(url, { redirect: 'manual' });
    const location = res.headers.get('location');
    hops.push({ url, status: res.status, location });
    if (res.status >= 300 && res.status < 400 && location) {
      url = new URL(location, url).href;
    } else {
      return hops;
    }
  }
  return hops;
}

const fmtChain = (hops) => hops.map((h) => `${h.status} ${h.url.replace(HOST, '')}`).join(' → ');

// ── 1 + 4. plain fetches ─────────────────────────────────────────────────────
console.log(`\nhost: ${HOST}\n\n[static + redirects]`);

{
  const robots = await (await fetch(`${HOST}/robots.txt`)).text();
  check(`/robots.txt advertises the sitemap index`, robots.includes('/sitemap.xml'));

  const index = await (await fetch(`${HOST}/sitemap.xml`)).text();
  check(`/sitemap.xml is a sitemap INDEX`, index.includes('<sitemapindex'));
  for (const s of [
    '/sitemap-pages.xml',
    '/2xko/sitemap.xml',
    '/tekken/sitemap.xml',
    '/sf6/sitemap.xml',
  ]) {
    check(`  index lists ${APEX}${s}`, index.includes(`${APEX}${s}`));
  }

  for (const slug of ['2xko', 'tekken', 'sf6']) {
    const res = await fetch(`${HOST}/${slug}/sitemap.xml`);
    const ok = res.status === 200;
    check(`/${slug}/sitemap.xml serves through the shell (${res.status})`, ok);
    if (ok) {
      const xml = await res.text();
      const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
      const bad = locs.filter((l) => !l.startsWith(`${APEX}/${slug}/`) && l !== `${APEX}/${slug}`);
      check(
        `  every <loc> carries the /${slug} prefix (${locs.length} urls)`,
        locs.length > 0 && bad.length === 0,
        bad.slice(0, 3).join(', '),
      );
    }
  }

  // legacy 301s → final 200 (the chain is followed hop by hop)
  const legacy = ['/champions/ekko', '/stats', '/?fuse=juggernaut'];
  // a REAL player id sampled from the game sitemap, so the target is a live page
  try {
    const gx = await (await fetch(`${HOST}/2xko/sitemap.xml`)).text();
    const m = gx.match(/<loc>[^<]*\/players\/([^<]+)<\/loc>/);
    if (m) legacy.push(`/players/${m[1]}`);
  } catch {
    /* absence is already covered by the sitemap gate above */
  }
  for (const path of legacy) {
    const hops = await chain(path);
    const first = hops[0];
    const last = hops[hops.length - 1];
    const redirected = first.status >= 300 && first.status < 400;
    check(
      `${path}: ${fmtChain(hops)}`,
      redirected && (first.location || '').includes('/2xko') && last.status === 200,
    );
  }

  // query passthrough on the fuse deep link (filters must survive the 308)
  const fuseHops = await chain('/?fuse=juggernaut');
  const fuseTarget = fuseHops[0]?.location || '';
  check(
    `/?fuse=juggernaut preserves the query in the redirect target (${fuseTarget})`,
    fuseTarget.includes('fuse=juggernaut'),
  );
}

// ── browser gates ────────────────────────────────────────────────────────────
const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  // ── selector ──
  console.log('\n[/ selector]');
  await page.goto(`${HOST}/`, { waitUntil: 'networkidle0' });
  const sel = await page.evaluate(() => ({
    primary: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(),
    cards: [...document.querySelectorAll('a.game-card')].map((a) => a.getAttribute('href')),
    itemList: (() => {
      try {
        const nodes = [...document.querySelectorAll('script[type="application/ld+json"]')].map(
          (s) => JSON.parse(s.textContent),
        );
        return nodes.find((n) => n['@type'] === 'ItemList')?.itemListElement?.length ?? 0;
      } catch {
        return -1;
      }
    })(),
  }));
  check(`selector wears the umbrella teal (${sel.primary})`, sel.primary === '#17cfc8');
  check(
    `cards link /2xko + /tekken + /sf6`,
    sel.cards.includes('/2xko') && sel.cards.includes('/tekken') && sel.cards.includes('/sf6'),
  );
  check(`ItemList JSON-LD parses with 3 games`, sel.itemList === 3);

  // ── each game through the shell host ──
  for (const g of [
    { slug: '2xko', primary: '#ff2e88', charPath: '/2xko/champions/ekko' },
    { slug: 'tekken', primary: '#e13048', charPath: null }, // sampled from its sitemap
    { slug: 'sf6', primary: '#ff7d00', charPath: '/sf6/characters/ryu' },
  ]) {
    console.log(`\n[/${g.slug}/ through the shell]`);
    await page.goto(`${HOST}/${g.slug}/`, { waitUntil: 'networkidle0' });

    const home = await page.evaluate(() => ({
      primary: getComputedStyle(document.documentElement)
        .getPropertyValue('--color-primary')
        .trim(),
      canonical: document.querySelector('link[rel="canonical"]')?.href ?? null,
      thumbs: document.querySelectorAll('img[src*="ytimg.com"]').length,
    }));
    check(
      `computed --color-primary = ${g.primary} through the shell (got ${home.primary})`,
      home.primary === g.primary,
    );
    check(
      `canonical carries the subpath on the apex (${home.canonical})`,
      // ufo's withBase trims the trailing slash: the engine emits …/tekken
      [`${APEX}/${g.slug}`, `${APEX}/${g.slug}/`].includes(home.canonical),
    );
    check(`browse renders real replay cards (${home.thumbs} thumbs)`, home.thumbs > 0);

    // a character page canonical (2XKO: the known champion; Tekken: sampled)
    let charPath = g.charPath;
    if (!charPath) {
      const xml = await (await fetch(`${HOST}/${g.slug}/sitemap.xml`)).text();
      // Interpolate the slug: this lives inside the per-game loop, so a
      // hardcoded /tekken/ here silently sampled a TEKKEN url for any other
      // game entered with charPath: null.
      const m = xml.match(
        new RegExp(`<loc>https://replaydatabase\\.com(/${g.slug}/characters/[^<]+)</loc>`),
      );
      charPath = m?.[1] ?? null;
    }
    if (charPath) {
      await page.goto(`${HOST}${charPath}`, { waitUntil: 'networkidle0' });
      const cp = await page.evaluate(() => ({
        canonical: document.querySelector('link[rel="canonical"]')?.href ?? null,
        h1: document.querySelector('h1')?.textContent?.trim() ?? '',
      }));
      check(
        `${charPath} canonical + real h1 (canonical=${cp.canonical}, h1=${JSON.stringify(cp.h1)})`,
        cp.canonical === `${APEX}${charPath}` && cp.h1.length > 0,
      );
    } else {
      check(`character page found in /${g.slug}/sitemap.xml`, false);
    }

    // /health through the shell
    const health = await page.goto(`${HOST}/${g.slug}/health`, { waitUntil: 'networkidle0' });
    const h1 = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim());
    check(
      `/${g.slug}/health responds 200 (${health.status()}) with h1=Health`,
      health.status() === 200 && h1 === 'Health',
    );
  }

  // ── the modal deep link (legacy /?v= → /2xko/?v= → modal opens) ──
  console.log('\n[modal deep link]');
  // Tolerate a host that doesn't serve /2xko at all: pointed at a single game's
  // own *.vercel.app alias (the pre-cutover smoke check), this 404s and returns
  // the game's designed 404 HTML. Parsing that as JSON used to throw and kill
  // the whole run after the useful checks had already passed.
  const vid = await page.evaluate(async () => {
    try {
      const r = await fetch('/2xko/data/replays.json');
      if (!r.ok) return null;
      const replays = await r.json();
      return replays[0]?.id ?? null;
    } catch {
      return null;
    }
  });
  if (vid) {
    await page.goto(`${HOST}/?v=${vid}`, { waitUntil: 'networkidle0' });
    const modal = await page.evaluate(() => ({
      path: location.pathname,
      open: !!document.querySelector('[role="dialog"][aria-modal="true"]'),
    }));
    check(
      `/?v=${vid} lands on /2xko/ with the modal open (path=${modal.path})`,
      modal.path.startsWith('/2xko') && modal.open,
    );
  } else {
    check(`sample replay id from /2xko/data/replays.json`, false);
  }
} finally {
  await browser.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
