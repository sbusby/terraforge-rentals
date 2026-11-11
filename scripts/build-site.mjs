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
 *   - adds canonical + og:url, writes sitemap.xml
 *   - generates thank-you.html from the terms page layout
 *
 * Run: npm run build   (re-run after editing any root *.html page)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE, PAGE_DATA } from './seo-data.mjs';

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

function replaceAll(html, from, to) {
  return html.split(from).join(to);
}

function mustReplace(html, from, to, label) {
  if (!html.includes(from)) throw new Error(`build-site: expected to find ${label}`);
  return replaceAll(html, from, to);
}

function transform(html, key) {
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
  const head = [
    `<link rel="canonical" href="${url}">`,
    `<meta property="og:url" content="${url}">`,
    ...(PAGE_DATA[key] || []).map(
      (d) => `<script type="application/ld+json">${JSON.stringify(d)}</script>`
    ),
  ].join('\n');
  html = mustReplace(html, '</head>', `${head}\n</head>`, `</head> in /${key}`);

  if (key === 'book-a-rental') html = transformBooking(html);
  return html;
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

function thankYouPage(termsHtml) {
  let html = termsHtml
    .replace(/<title>[\s\S]*?<\/title>/, '<title>Booking Received | TerraForge Equipment Rentals</title>')
    .replace(
      /<meta name="description"[^>]*>/,
      '<meta name="description" content="Your TerraForge rental is booked.">\n<meta name="robots" content="noindex">'
    )
    .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>\s*/g, '');
  const main = `<main>
<section class="hero">
  <div class="wrap hero-inner">
    <span class="eyebrow">Booking received</span>
    <h1>You're<br><span class="amber">booked.</span></h1>
    <p class="lead">Thanks — your payment went through and your dates are reserved. A receipt is on its way to your email.</p>
  </div>
</section>

<section>
  <div class="wrap legal-doc">
    <h3 class="mb-sm">What happens next</h3>
    <p class="mb-lg">We'll call or text you before delivery to confirm the drop-off window and your delivery zone. The $600 refundable damage deposit is collected at delivery by card, cash, or check — it was not charged online.</p>
    <h3 class="mb-sm">Need to change something?</h3>
    <p class="mb-lg">Call or text <a href="tel:+12088630450">(208) 863-0450</a> or email <a href="mailto:seanbusby10@gmail.com">seanbusby10@gmail.com</a>. Cancellations follow the <a href="/terms">Rental Terms</a>.</p>
    <p><a class="btn btn-primary" href="/">Back to home</a></p>
  </div>
</section>
</main>`;
  return mustReplace(
    html.replace(/<main>[\s\S]*<\/main>/, '@@MAIN@@'),
    '@@MAIN@@',
    main,
    'terms <main> block'
  );
}

function sitemap() {
  const urls = Object.values(PAGES).map(([, key]) => `  <url><loc>${SITE}/${key}</loc></url>`);
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
const thanks = transform(readFileSync(join(ROOT, 'terms.html'), 'utf8'), 'thank-you');
writeFileSync(join(OUT, 'thank-you.html'), thankYouPage(thanks));
console.log('wrote site/thank-you.html');
writeFileSync(join(OUT, 'sitemap.xml'), sitemap());
console.log('wrote site/sitemap.xml');
