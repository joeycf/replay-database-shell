import { readFileSync } from 'node:fs';
import http from 'node:http';
import { join } from 'node:path';
import puppeteer from 'puppeteer-core';

/**
 * Shell selector gates (Phase-5 prompt A / D.4 local half) against the BUILT
 * output (.vercel/output/static) — the same mode the games verify in (STACK
 * §5.8: never validate base/theme behavior on the dev server).
 *
 *   1. / renders the selector: umbrella theme (computed --color-primary =
 *      ReplayDB teal), BrandLogo lockup, one card per game with its own accent,
 *      plain-<a> hrefs at /2xko | /tekken, NO game nav (Browse/Stats/…).
 *   2. ItemList JSON-LD parses and enumerates both games at apex URLs.
 *   3. /health renders under the shell's minimal chrome (no game nav).
 *   4. 404.html is the designed not-found page.
 *   5. No page request escapes the static root (no 404s on assets).
 *
 * Chrome: /usr/bin/google-chrome-stable (STACK §5.9). Static server: local,
 * ephemeral port. Exit non-zero on any failed gate.
 */

const STATIC_DIR = new URL('../.vercel/output/static', import.meta.url).pathname;
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome-stable';

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

function serveStatic(rootDir) {
  return http.createServer((req, res) => {
    const url = new URL(req.url, 'http://localhost');
    let path = decodeURIComponent(url.pathname);
    const tryPaths = [path, join(path, 'index.html'), `${path}.html`];
    for (const p of tryPaths) {
      try {
        const full = join(rootDir, p);
        const body = readFileSync(full);
        const ext = p.slice(p.lastIndexOf('.'));
        res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream' });
        res.end(body);
        return;
      } catch {
        /* next candidate */
      }
    }
    try {
      const body = readFileSync(join(rootDir, '404.html'));
      res.writeHead(404, { 'content-type': 'text/html' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
}

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

const server = serveStatic(STATIC_DIR);
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const origin = `http://localhost:${port}`;
console.log(`static server: ${origin} ← ${STATIC_DIR}`);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  const failedRequests = [];
  let currentPage = '(startup)';
  page.on('response', (res) => {
    // /_vercel/* (analytics/speed-insights loaders) exists only on the Vercel
    // platform — a local 404 for those is the off-Vercel no-op, not a defect.
    if (res.status() >= 400 && !new URL(res.url()).pathname.startsWith('/_vercel/')) {
      failedRequests.push(`[${currentPage}] ${res.status()} ${res.url()}`);
    }
  });

  // ── 1. the selector ──────────────────────────────────────────────────────
  console.log('\n[/] selector');
  currentPage = '/';
  await page.goto(`${origin}/`, { waitUntil: 'networkidle0' });

  const primary = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(),
  );
  check(`umbrella --color-primary is ReplayDB teal (${primary})`, primary === '#17cfc8');

  const display = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--font-display').trim(),
  );
  check(`umbrella --font-display is Space Grotesk`, display.includes('Space Grotesk'));

  const logo = await page.evaluate(() => {
    const svg = document.querySelector('main svg[role="img"]');
    return svg ? svg.getAttribute('aria-label') : null;
  });
  check(
    `BrandLogo mark renders in the hero (aria-label=${JSON.stringify(logo)})`,
    logo === 'ReplayDB',
  );

  const cards = await page.evaluate(() =>
    [...document.querySelectorAll('a.game-card')].map((a) => ({
      href: a.getAttribute('href'),
      accent: getComputedStyle(a).getPropertyValue('--accent').trim(),
      name: a.querySelector('.font-display')?.textContent?.trim(),
      art: a.querySelector('img')?.getAttribute('src'),
      artLoaded: a.querySelector('img')?.naturalWidth > 0,
    })),
  );
  check(`2 game cards render`, cards.length === 2, JSON.stringify(cards));
  const two = cards.find((c) => c.href === '/2xko');
  const tek = cards.find((c) => c.href === '/tekken');
  check(
    `2XKO card: href=/2xko, accent #ff2e88, art loads`,
    !!two && two.accent === '#ff2e88' && two.name === '2XKO' && two.artLoaded,
  );
  check(
    `Tekken card: href=/tekken, accent #e13048, art loads`,
    !!tek && tek.accent === '#e13048' && tek.name === 'Tekken 8' && tek.artLoaded,
  );

  const navLeak = await page.evaluate(
    () =>
      [
        ...document.querySelectorAll(
          'a[href="/stats"], a[href="/players"], a[href="/champions"], a[href="/characters"]',
        ),
      ].length,
  );
  check(`no game-nav links on the selector`, navLeak === 0, `${navLeak} found`);

  const jsonLd = await page.evaluate(() => {
    const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
    return scripts.map((s) => JSON.parse(s.textContent));
  });
  const itemList = jsonLd.find((n) => n['@type'] === 'ItemList');
  check(
    `ItemList JSON-LD parses with both games at apex URLs`,
    !!itemList &&
      itemList.itemListElement?.length === 2 &&
      itemList.itemListElement[0].url === 'https://replaydatabase.com/2xko' &&
      itemList.itemListElement[1].url === 'https://replaydatabase.com/tekken',
    JSON.stringify(itemList),
  );

  await page.screenshot({
    path: process.env.SHOT_PATH || '/tmp/shell-selector.png',
    fullPage: true,
  });

  // ── 2. /health under the shell chrome ────────────────────────────────────
  console.log('\n[/health]');
  currentPage = '/health';
  await page.goto(`${origin}/health`, { waitUntil: 'networkidle0' });
  const healthNav = await page.evaluate(() => ({
    navLinks: [...document.querySelectorAll('header nav a')].length,
    wordmark: document.querySelector('header a')?.textContent?.trim(),
    h1: document.querySelector('h1')?.textContent?.trim(),
    baseURL: [...document.querySelectorAll('dd')].map((d) => d.textContent.trim()),
  }));
  check(`/health renders (h1=Health)`, healthNav.h1 === 'Health');
  check(
    `shell chrome: umbrella wordmark, NO game nav`,
    healthNav.navLinks === 0 && healthNav.wordmark === 'ReplayDB',
  );
  check(
    `GameConfig shows umbrella identity (name=Replay Database)`,
    healthNav.baseURL.includes('Replay Database'),
  );

  // ── 3. designed 404 ──────────────────────────────────────────────────────
  console.log('\n[404]');
  currentPage = '/definitely-not-a-route';
  await page.goto(`${origin}/definitely-not-a-route`, { waitUntil: 'networkidle0' });
  const nf = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim());
  check(
    `designed 404 serves for unknown paths`,
    nf === 'No data at this route',
    `h1=${JSON.stringify(nf)}`,
  );

  // ── 4. request hygiene ───────────────────────────────────────────────────
  console.log('\n[requests]');
  const unexpected = failedRequests.filter((r) => !r.includes('/definitely-not-a-route'));
  check(
    `no failed asset/data requests across all pages`,
    unexpected.length === 0,
    unexpected.join(', '),
  );
} finally {
  await browser.close();
  server.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
