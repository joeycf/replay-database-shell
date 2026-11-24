/**
 * Crawlers the apex robots.txt turns away. modules/sitemap-index.ts writes one
 * `Disallow: /` group per entry, and scripts/verify-shell.mjs fails the build
 * if an entry loses its group or if any group ever names a search crawler.
 *
 * Added after the Hobby CDN-request overage of 2026-11-23. Each entry costs
 * requests and sent zero visits in 30 days of referrer data, and any request
 * under a game path is billed twice: once on the shell's rewrite hop and once
 * on the game. The apex robots.txt is the only one crawlers read for the whole
 * domain, game paths included (RFC 9309 §2.3).
 *
 * - PetalBot is Huawei's crawler for Petal Search, Huawei Assistant and Petal
 *   AI Search. It was the busiest crawler, at about 1.1k apex requests a day.
 * - The SEO-tool crawlers feed third-party backlink and keyword databases.
 *   Google and Bing do not read them for rankings. AhrefsBot also feeds
 *   Ahrefs' small Yep search engine. Each tool's site-audit crawler is a
 *   separate token (AhrefsSiteAudit, SiteAuditBot, rogerbot, SEBot-WA) and
 *   stays on `*`, so audits of this site keep working.
 * - Amazonbot is Amazon's product and AI-training crawler. Alexa's search
 *   crawlers, Amzn-SearchBot and Amzn-User, are separate tokens and stay on `*`.
 * - Bytespider crawls for ByteDance's Toutiao Search and AI. It is known to
 *   ignore robots.txt, which leaves it to the firewall.
 *
 * Deliberately NOT listed, so they fall through to `User-agent: *`:
 * - Search crawlers: Googlebot and its variants, Bingbot (which also feeds
 *   DuckDuckGo, Yahoo and Ecosia), Applebot, DuckDuckBot, YandexBot and
 *   SeznamBot.
 * - AI search and answer fetchers: OAI-SearchBot, ChatGPT-User, PerplexityBot,
 *   Perplexity-User, Claude-SearchBot, Claude-User, DuckAssistBot,
 *   Amzn-SearchBot, Amzn-User, ExaSearchBot and KeenableBot.
 * - AI-training crawlers (GPTBot, ClaudeBot, CCBot). They barely visit (GPTBot
 *   sent 1 request in an 11.5-hour log window), so blocking them saves nothing.
 *   Opting out of AI training is a content decision, not a cost one.
 * - Baiduspider, a search engine that sends real volume (~190 billed requests
 *   in that window) and no referrals. Blocking it is the owner's call.
 * - Link-preview fetchers (facebookexternalhit, Twitterbot, Discordbot,
 *   Slackbot). Blocking them breaks shared-link previews.
 *
 * robots.txt is advisory, and crawlers re-read it on their own schedule
 * (within a day for most). A scraper that ignores it is the firewall's job.
 *
 * This file may never import anything: scripts/verify-shell.mjs imports it
 * with Node's own type stripping, which does not resolve extensionless
 * relative specifiers. It is the same rule as lib/changelog.ts.
 */
export const BLOCKED_CRAWLERS: readonly string[] = [
  'PetalBot',
  // SEO tools
  'AhrefsBot',
  'SemrushBot',
  'MJ12bot',
  'DotBot',
  'BLEXBot',
  'DataForSeoBot',
  'Barkrowler',
  'SERankingBacklinksBot',
  // product, AI and non-English-search crawlers with no visitors here
  'Amazonbot',
  'Bytespider',
];
