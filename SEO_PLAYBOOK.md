# TerraForge SEO Playbook

Goal: show up for "skid steer rental alexandria va", "bobcat rental northern
virginia", "skid steer rental near me" and the same searches for nearby cities.

## Where things stand (Nov 20, 2026)

- Until the Nov 19 cutover the site was Wix pages wrapping iframes, so Google
  saw almost no text. It is now plain HTML on Cloudflare Pages. Expect several
  weeks before rankings move; a new site with no reviews or links starts cold.
- On-site SEO is built into `npm run build` (see below). The remaining work is
  off-site and needs the owner's Google account: sections 2 and 3.

## 1. What the build does (code, already done)

- Titles, descriptions and H1s lead with "skid steer rental" plus the place.
  Edit them in the root `*.html` files.
- One landing page per city at `/skid-steer-rental-<city>-va`, generated from
  `scripts/locations.mjs`. Prices come from `src/public/rental.js` and each
  city's delivery zone from the ZIP lists in `delivery.html`, so they cannot
  drift. To add a city, add an entry with copy that is specific to that place.
  Do not mass-produce near-identical cities; Google treats those as doorway
  pages.
- City pages are linked from every footer, the home zone list and
  `/delivery#areas`.
- JSON-LD per page (`scripts/seo-data.mjs`): LocalBusiness, Product and offers,
  FAQPage, BreadcrumbList, and a Service per city.
- Canonical, Open Graph tags, `sitemap.xml` with `lastmod`, `robots.txt`, and
  301s from the old Wix URLs (`site/_redirects`).

## 2. Google Search Console (15 minutes, do this first)

1. search.google.com/search-console → Add property → **Domain** →
   `terraforgellc.com`. Verify with the TXT record it gives you, added in
   Cloudflare → DNS.
2. Sitemaps → submit `https://www.terraforgellc.com/sitemap.xml`.
3. URL Inspection → paste the home page and
   `/skid-steer-rental-alexandria-va` → **Request indexing**.
4. Bing Webmaster Tools → import from Search Console.

## 3. Google Business Profile (the biggest lever)

"Skid steer rental near me" and "in Alexandria" searches are answered mostly by
the map pack, which only lists businesses with a profile.

- business.google.com → **Service-area business** (hide the home address).
  Service areas: Alexandria, Arlington, Fairfax, Springfield, Falls Church,
  McLean, Vienna, Lorton, Woodbridge, Manassas.
- Primary category "Equipment rental agency"; add "Construction equipment
  supplier".
- Photos of the T64 on real jobs, the booking link
  (`https://www.terraforgellc.com/book-a-rental`), hours, phone.
- Ask every customer for a review with the profile's review link. Ten reviews
  outweigh any on-page change for local searches.
- Use the same name, phone and "Alexandria, VA 22310" everywhere.

## 4. Listings and links

Free and worth an hour: Bing Places, Apple Business Connect, Yelp, Nextdoor
business page, Facebook page. Post the rental on Facebook Marketplace and
Craigslist with the booking link. Each listing is also a link back to the site,
which a new domain badly needs.

## 5. Later

- A local 571/703 number (Google Voice works) reads as local; the current
  number is a 208 area code. Change it everywhere at once if you switch.
- Job photos with captions on the city pages, and a short page answering
  "how much does it cost to rent a skid steer in Northern Virginia".
- Google Ads on exact-match "skid steer rental [city]" covers the gap while
  organic rankings build.
- Check search.google.com/test/rich-results on the home page and one city
  page after each deploy that touches `seo-data.mjs`.
