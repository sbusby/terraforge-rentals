#!/usr/bin/env node
/**
 * Builds the Cloudflare Pages site (site/) from the page files at the repo
 * root. Those files were written as Wix "Embed HTML" iframes; this turns them
 * into ordinary pages:
 *
 *   - absolute https://www.terraforgellc.com/... links -> root-relative links
 *   - drops target="_parent" (there is no parent frame any more)
 *   - static.wixstatic.com images -> /images/...
 *   - booking widget calls /api/rental and navigates to Stripe directly
 *   - replaces inline JSON-LD with the full per-page set from seo-data.mjs
 *   - adds canonical + Open Graph tags, writes sitemap.xml (with lastmod)
 *   - generates one service-area page per city in scripts/locations.mjs
 *     (/skid-steer-rental-<city>-va) and links them from the footer,
 *     the home page and the Delivery page
 *   - generates thank-you.html and 404.html from the terms page layout
 *   - loads the shared design layer (site/assets/tf.css + tf.js) and its fonts
 *
 * Run: npm run build   (re-run after editing any root *.html page)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, PAGE_DATA, locationData } from './seo-data.mjs';
import { LOCATIONS, locationPath } from './locations.mjs';
import { CONFIG } from '../src/public/rental.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'site');

// source file -> [output file, URL path key]
const PAGES = {
  'home.html': ['index.html', ''],
  'equipment.html': ['equipment.html', 'equipment'],
  'attachments.html': ['attachments.html', 'attachments'],
  'delivery.html': ['delivery.html', 'delivery'],
  'requirements.html': ['requirements.html', 'requirements'],
  'faq.html': ['faq.html', 'faq'],
  'contact.html': ['contact.html', 'contact'],
  'terms.html': ['terms.html', 'terms'],
  'booking.html': ['book-a-rental.html', 'book-a-rental'],
};

const WIX_MEDIA = 'https://static.wixstatic.com/media/';
const IMAGES = [
  // most specific first: transformed variants before their base file
  ['ee1515_eab3000dd4c148939ac45a4f5338f348~mv2.png/v1/fill/w_1200,h_630,al_c,q_85,enc_auto/t64-og.png', 't64-og.jpg'],
  ['ee1515_eab3000dd4c148939ac45a4f5338f348~mv2.png/v1/fill/w_1200,h_750,al_c,q_82,enc_auto/t64.png', 't64.jpg'],
  ['ee1515_eab3000dd4c148939ac45a4f5338f348~mv2.png/v1/fill/w_1920,h_1080,al_c,q_80,enc_auto/t64-hero.png', 't64-hero.jpg'],
  ['ee1515_eab3000dd4c148939ac45a4f5338f348~mv2.png', 't64-original.jpg'],
  ['ee1515_a76842c6e69d47c2bd07aac74d5f94b6~mv2.png', 'logo.png'],
  ['ee1515_171df54bd39c4be2bb901930d03322ad~mv2.webp', 'pallet-forks.webp'],
  ['ee1515_275657c5c7544390ae44d2ad17a9d6cf~mv2.webp', 'stump-bucket.webp'],
  ['ee1515_c6aab9a4247c4b54b29ba2b1c2a22cff~mv2.jpg', 'brush-grapple.jpg'],
];

// Shared design layer: site/assets/tf.css + tf.js, cache-busted by content.
const assetVer = (name) =>
  createHash('sha1').update(readFileSync(join(OUT, 'assets', name))).digest('hex').slice(0, 10);
const FONTS =
  'https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800;900&family=JetBrains+Mono:wght@400;500;700&family=Barlow:wght@400;500;600;700&display=swap';
const THEME_HEAD = [
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
  `<link href="${FONTS}" rel="stylesheet">`,
  '<link rel="icon" type="image/png" href="/images/favicon.png">',
  // tf-arrive: we got here through tf.js's page transition, so start covered.
  "<script>(function(d){d.classList.add('tf-js');try{if(sessionStorage.getItem('tfNav')){sessionStorage.removeItem('tfNav');d.classList.add('tf-arrive')}}catch(e){}})(document.documentElement)</script>",
  `<link rel="stylesheet" href="/assets/tf.css?v=${assetVer('tf.css')}">`,
].join('\n');
const THEME_BODY = `<script src="/assets/tf.js?v=${assetVer('tf.js')}" defer></script>`;

function replaceAll(html, from, to) {
  return html.split(from).join(to);
}

function mustReplace(html, from, to, label) {
  if (!html.includes(from)) throw new Error(`build-site: expected to find ${label}`);
  return replaceAll(html, from, to);
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const usd = (n) => '$' + n.toLocaleString('en-US');

// ZIP -> zone lists live in delivery.html (the ZIP calculator); one source.
const ZONE_JSON = (() => {
  const m = /const ZONE_DATA = (\{[\s\S]*?\});/.exec(readFileSync(join(ROOT, 'delivery.html'), 'utf8'));
  if (!m) throw new Error('build-site: ZONE_DATA not found in delivery.html');
  return m[1];
})();
const ZONE_DATA = JSON.parse(ZONE_JSON);

/** A city's delivery zone (1-3); every ZIP listed for it must agree. */
function zoneOf(loc) {
  const zones = new Set(
    loc.zips.map((zip) => {
      const z = [1, 2, 3].find((k) => ZONE_DATA[k].includes(zip));
      if (!z) throw new Error(`build-site: ${loc.city} ZIP ${zip} is not in the ZIP calculator`);
      return z;
    })
  );
  if (zones.size !== 1) throw new Error(`build-site: ${loc.city} ZIPs span more than one delivery zone`);
  return [...zones][0];
}

const LOCS = LOCATIONS.map((loc) => ({ ...loc, path: locationPath(loc), zone: zoneOf(loc) }));
const locBySlug = Object.fromEntries(LOCS.map((l) => [l.slug, l]));
const cityLink = (l, text) => `<a href="/${l.path}">${text || l.city}</a>`;

/** "Service areas" footer column: internal links to every city page. */
const FOOTER_AREAS = `<div class="col">
      <h5>Service Areas</h5>
      ${LOCS.slice(0, 6).map((l) => cityLink(l)).join('\n      ')}
      <a href="/delivery#areas">All service areas</a>
    </div>
    `;

/** Link block listing every city page, grouped by delivery zone. */
function areaLinks() {
  return [1, 2, 3]
    .map((z) => {
      const fee = CONFIG.zones[z - 1].fee;
      const links = LOCS.filter((l) => l.zone === z).map((l) => cityLink(l, `Skid steer rental in ${l.city}`));
      return `<div class="row"><div class="k">Zone ${z} · ${usd(fee)} delivery &amp; pickup</div><div class="v">${links.join(' · ')}</div></div>`;
    })
    .join('\n      ');
}

function transform(html, key, data = PAGE_DATA[key] || []) {
  // Images. og:image must stay absolute for social previews.
  for (const [wix, local] of IMAGES) {
    html = replaceAll(html, `content="${WIX_MEDIA}${wix}"`, `content="${SITE}/images/${local}"`);
    html = replaceAll(html, WIX_MEDIA + wix, `/images/${local}`);
  }
  if (html.includes(WIX_MEDIA)) throw new Error(`build-site: unmapped Wix image in /${key}`);

  // Links: same-site absolute -> root-relative; no parent frame.
  html = html.replace(/href="https:\/\/www\.terraforgellc\.com(\/[^"]*)?"/g, (_, p) => `href="${p || '/'}"`);
  html = html.replace(/\s+target="_parent"/g, '');

  // Structured data: drop the inline copies, inject the full per-page set.
  html = html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, '');
  const url = `${SITE}/${key}`;
  const og = [];
  if (!html.includes('property="og:title"')) {
    const title = /<title>([\s\S]*?)<\/title>/.exec(html)?.[1];
    const desc = /<meta name="description" content="([^"]*)"/.exec(html)?.[1];
    if (title) og.push(`<meta property="og:title" content="${title.replace(/"/g, '&quot;')}">`);
    if (desc) og.push(`<meta property="og:description" content="${desc}">`);
    og.push(`<meta property="og:image" content="${SITE}/images/t64-og.jpg">`, '<meta property="og:type" content="website">');
  }
  const head = [
    `<link rel="canonical" href="${url}">`,
    `<meta property="og:url" content="${url}">`,
    '<meta property="og:site_name" content="TerraForge Equipment Rentals">',
    ...og,
    ...data.map(
      (d) => `<script type="application/ld+json">${JSON.stringify(d)}</script>`
    ),
  ].join('\n');
  // Design layer goes last in <head> so it overrides the page's inline CSS.
  html = html.replace(/<link href="https:\/\/fonts\.googleapis\.com[^>]*>\s*/, '');
  html = mustReplace(html, '</head>', `${head}\n${THEME_HEAD}\n</head>`, `</head> in /${key}`);
  html = mustReplace(html, '</body>', `${THEME_BODY}\n</body>`, `</body> in /${key}`);

  // Site-wide internal links to the city pages.
  html = html.replace(/<div class="col">\s*<h5>Contact<\/h5>/, (m) => FOOTER_AREAS + m);
  if (!html.includes('<h5>Service Areas</h5>')) throw new Error(`build-site: footer not found in /${key}`);

  if (key === 'book-a-rental') html = transformBooking(html);
  if (key === 'delivery') html = mustReplace(html, '<!--@@AREA_LINKS@@-->', areaLinks(), 'AREA_LINKS placeholder');
  if (key === '') {
    // Home's quote builder reuses the Delivery page's ZIP → zone lists.
    html = mustReplace(html, '/*@@ZONE_DATA@@*/null', ZONE_JSON, 'ZONE_DATA placeholder');
    // Zone list: city names that have their own page become links to it.
    html = html.replace(/<div class="mi">([^<]*)<\/div>/g, (_, names) =>
      `<div class="mi">${names
        .split(' · ')
        .map((n) => {
          const l = LOCS.find((x) => x.city === n.trim());
          return l ? cityLink(l) : n;
        })
        .join(' · ')}</div>`
    );
  }
  return html;
}

/**
 * Service-area page for one city. Borrows the Delivery page's head, nav and
 * footer; prices and the delivery fee come from CONFIG and the city's zone.
 */
function cityPage(loc) {
  const fee = CONFIG.zones[loc.zone - 1].fee;
  const miles = ['0–20', '21–35', '36–50'][loc.zone - 1];
  const p = CONFIG.machine.prices;
  const rates = [
    ['1 day', p[1]],
    ['Weekend · 2 days', p[2]],
    ['Full week · 7 days', p[7]],
  ];
  const att = CONFIG.attachments.map((a) => a.dayRate);
  const attRange = `${usd(Math.min(...att))}–${usd(Math.max(...att))}`;
  const deposit = usd(CONFIG.deposit.amount);
  const title = `Skid Steer Rental ${loc.city}, VA — Bobcat T64 Delivered | TerraForge`;
  const description = `Rent a Bobcat T64 skid steer (compact track loader) in ${loc.city}, VA. Delivered and picked up, weekends included. From ${usd(p[1])}/day plus ${usd(fee)} flat delivery. Book online.`;
  const { faqs, jsonld } = locationData(loc, { fee, miles, prices: p, attRange, deposit, usd });
  const faqCss = (readFileSync(join(ROOT, 'faq.html'), 'utf8').match(/^\.faq.*$/gm) || []).join('\n');

  const main = `<section class="hero">
  <div class="wrap hero-inner">
    <h1><span class="eyebrow">Delivered · ${esc(loc.county)}</span>Skid steer rental<br><span class="amber">${esc(loc.city)}, VA.</span></h1>
    <p class="lead">${esc(loc.intro)}</p>
    <div class="hero-ctas">
      <a class="btn btn-primary" href="/book-a-rental">Check availability</a>
      <a class="btn btn-ghost" href="/equipment">See the machine</a>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <h2 class="mb-md">What it costs in ${esc(loc.city)}.</h2>
    <p class="lead mb-lg">Flat rental rates plus one ${usd(fee)} delivery fee that covers both drop-off and pickup. ${esc(loc.city)} is in delivery Zone ${loc.zone} (${miles} miles from our Alexandria yard).</p>
    <div class="zones">
      ${rates
        .map(
          ([label, price]) =>
            `<div class="row"><div><div class="label">${label}</div><div class="note">${usd(price)} rental + ${usd(fee)} delivery &amp; pickup</div></div><div class="fee">${usd(price + fee)}</div></div>`
        )
        .join('\n      ')}
    </div>
    <p class="muted mt-lg" style="font-size:.85rem;max-width:70ch">Totals are before sales tax, which is shown at checkout before you pay. Standard 80-inch bucket included. <a href="/attachments">Pallet forks, brush grapple and stump bucket</a> are ${attRange} per day. A ${deposit} refundable damage deposit is collected at delivery, not online. See <a href="/requirements">rental requirements</a>.</p>
  </div>
</section>

<section>
  <div class="wrap">
    <h2 class="mb-lg">What people rent it for in ${esc(loc.city)}.</h2>
    <div class="list">
      ${loc.jobs.map(([k, v]) => `<div class="row"><div class="k">${esc(k)}</div><div class="v">${esc(v)}</div></div>`).join('\n      ')}
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <h2 class="mb-md">Delivery to ${esc(loc.city)}.</h2>
    <p class="lead mb-md">We deliver and pick up every weekend, plus weekdays every other week, holidays included. The <a href="/book-a-rental">booking calendar</a> shows which days are open.</p>
    <div class="list">
      <div class="row"><div class="k">Areas covered</div><div class="v">${esc(loc.places)}.</div></div>
      <div class="row"><div class="k">ZIP codes</div><div class="v">${loc.zips.join(' · ')}. Somewhere else? <a href="/delivery">Check your ZIP</a>.</div></div>
      <div class="row"><div class="k">Getting the machine in</div><div class="v">${esc(loc.access)}</div></div>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <h2 class="mb-lg">${esc(loc.city)} rental questions.</h2>
    <div class="faq">
      ${faqs.map(([q, a]) => `<details><summary>${esc(q)}</summary><div class="body"><p>${esc(a)}</p></div></details>`).join('\n      ')}
    </div>
  </div>
</section>

<section>
  <div class="wrap center">
    <h2 class="mb-md">Book the T64 for ${esc(loc.city)}.</h2>
    <p class="lead mb-lg" style="margin-left:auto;margin-right:auto">Live availability and your exact total online, in about three minutes.</p>
    <p class="mb-lg"><a class="btn btn-primary" href="/book-a-rental">Check availability</a></p>
    <p class="muted" style="font-size:.88rem">Also delivering to ${loc.nearby
      .map((s) => {
        if (!locBySlug[s]) throw new Error(`build-site: unknown nearby city "${s}" for ${loc.city}`);
        return cityLink(locBySlug[s]);
      })
      .join(' · ')} · <a href="/delivery#areas">all service areas</a></p>
  </div>
</section>`;

  // Title and description go in first so transform() builds the OG tags from them.
  const html = transform(
    readFileSync(join(ROOT, 'delivery.html'), 'utf8')
      .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
      .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${esc(description)}">`)
      .replace('<!--@@AREA_LINKS@@-->', ''),
    loc.path,
    jsonld
  )
    .replace(' class="active">Delivery</a>', ' class="">Delivery</a>')
    .replace('</style>', `${faqCss}\n</style>`);
  return mustReplace(html.replace(/<main>[\s\S]*<\/main>/, '@@MAIN@@'), '@@MAIN@@', `<main>\n${main}\n</main>`, 'delivery <main> block');
}

function transformBooking(html) {
  html = mustReplace(
    html,
    "var API_URL = 'https://www.terraforgellc.com/_functions/rental';",
    "var API_URL = '/api/rental';",
    'booking API_URL'
  );
  // Checkout: the page is the top window now, so just go there.
  html = html.replace(
    /try\{ window\.parent\.postMessage\(\{type:'terraforge:navigate'[\s\S]*?\}, 700\);/,
    'window.location.href = data.checkoutUrl;'
  );
  if (html.includes("terraforge:navigate")) throw new Error('build-site: checkout redirect not rewritten');
  // Iframe height reporting is meaningless outside an embed.
  html = mustReplace(
    html,
    "try{ window.parent.postMessage({type:'terraforge:height', height: document.documentElement.scrollHeight}, '*'); }catch(e){}",
    '/* no host frame */',
    'height postMessage'
  );
  return html;
}

// The little loader on a strip of ground; tf.js draws the machine into
// [data-tf-rig] and tf.css animates it (see ".tf-stage").
const stage = (cls, stamp) =>
  `<div class="tf-stage ${cls}" aria-hidden="true"><div class="tf-stage-rig" data-tf-rig></div>${
    stamp ? `<div class="tf-stamp">${stamp}</div>` : ''
  }</div>`;

/** A one-off page that borrows the terms page's head, nav and footer. */
function shellPage(termsHtml, { title, description, main }) {
  const html = termsHtml
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`)
    .replace(
      /<meta name="description"[^>]*>/,
      `<meta name="description" content="${description}">\n<meta name="robots" content="noindex">`
    )
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, '');
  return mustReplace(
    html.replace(/<main>[\s\S]*<\/main>/, '@@MAIN@@'),
    '@@MAIN@@',
    `<main>\n${main}\n</main>`,
    'terms <main> block'
  );
}

function thankYouPage(termsHtml) {
  return shellPage(termsHtml, {
    title: 'Booking Received | TerraForge Equipment Rentals',
    description: 'Your TerraForge rental is booked.',
    main: `<section class="hero">
  <div class="wrap hero-inner">
    <span class="eyebrow">Booking received</span>
    <h1>You're<br><span class="amber">booked.</span></h1>
    <p class="lead">Thanks — your payment went through and your dates are reserved. A receipt is on its way to your email.</p>
    ${stage('booked', 'Booked')}
  </div>
</section>

<section>
  <div class="wrap legal-doc">
    <h3 class="mb-sm">What happens next</h3>
    <p class="mb-lg">We'll call or text you before delivery to confirm the drop-off window and your delivery zone. The $600 refundable damage deposit is collected at delivery by card, cash, or check — it was not charged online.</p>
    <h3 class="mb-sm">Need to change something?</h3>
    <p class="mb-lg">Call or text <a href="tel:+12088630450">(208) 863-0450</a> or email <a href="mailto:rentals@terraforgellc.com">rentals@terraforgellc.com</a>. Cancellations follow the <a href="/terms">Rental Terms</a>.</p>
    <p><a class="btn btn-primary" href="/">Back to home</a></p>
  </div>
</section>`,
  });
}

/** Cloudflare Pages serves 404.html (with a 404 status) for unknown paths. */
function notFoundPage(termsHtml) {
  return shellPage(termsHtml, {
    title: 'Page Not Found | TerraForge Equipment Rentals',
    description: 'That page does not exist.',
    main: `<section class="hero">
  <div class="wrap hero-inner">
    <span class="eyebrow">Error 404 · Nothing parked here</span>
    <h1>This lot's<br><span class="amber">empty.</span></h1>
    <p class="lead">We looked everywhere. The page you're after has been moved, hauled off, or never existed — but the T64 is still available.</p>
    <div class="hero-ctas">
      <a class="btn btn-primary" href="/book-a-rental">Check availability</a>
      <a class="btn btn-ghost" href="/">Back to home</a>
    </div>
    ${stage('lost', '')}
  </div>
</section>`,
  }).replace(/<link rel="canonical"[^>]*>\n?/, '').replace(/<meta property="og:url"[^>]*>\n?/, '');
}

/** Date a page's sources last changed: today if uncommitted, else last commit. */
function lastmod(...files) {
  const today = new Date().toISOString().slice(0, 10);
  try {
    const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
    if (git('status', '--porcelain', '--', ...files)) return today;
    return git('log', '-1', '--format=%cs', '--', ...files) || today;
  } catch {
    return today;
  }
}

function sitemap() {
  const shared = ['scripts/build-site.mjs', 'scripts/seo-data.mjs', 'site/assets/tf.css'];
  const entry = (key, date) => `  <url><loc>${SITE}/${key}</loc><lastmod>${date}</lastmod></url>`;
  const cityDate = lastmod('scripts/locations.mjs', 'delivery.html', 'src/public/rental.js', ...shared);
  const urls = [
    ...Object.entries(PAGES).map(([src, [, key]]) => entry(key, lastmod(src, ...shared))),
    ...LOCS.map((l) => entry(l.path, cityDate)),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}

mkdirSync(OUT, { recursive: true });
for (const [src, [out, key]] of Object.entries(PAGES)) {
  const html = transform(readFileSync(join(ROOT, src), 'utf8'), key);
  if (/terraforgellc\.com\/_functions|filesusr\.com/.test(html)) {
    throw new Error(`build-site: Wix-only URL left in ${out}`);
  }
  writeFileSync(join(OUT, out), html);
  console.log(`wrote site/${out}`);
}
for (const loc of LOCS) {
  writeFileSync(join(OUT, `${loc.path}.html`), cityPage(loc));
  console.log(`wrote site/${loc.path}.html`);
}
const thanks = transform(readFileSync(join(ROOT, 'terms.html'), 'utf8'), 'thank-you');
writeFileSync(join(OUT, 'thank-you.html'), thankYouPage(thanks));
console.log('wrote site/thank-you.html');
writeFileSync(join(OUT, '404.html'), notFoundPage(thanks));
console.log('wrote site/404.html');
writeFileSync(join(OUT, 'sitemap.xml'), sitemap());
console.log('wrote site/sitemap.xml');
