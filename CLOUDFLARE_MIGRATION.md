# Moving terraforgellc.com off Wix → Cloudflare Pages + Stripe

**Deadlines:** Wix charges $348 on **Dec 10, 2026**. The Wix plan and the domain
registration both end **Dec 29, 2026**. Turn off auto-renew in Wix now; the
site stays up until Dec 29, which is the window to do all of this.

## What changed in the repo (branch `cloudflare-migration`)

| Wix piece | Cloudflare replacement |
|---|---|
| 9 HTML embeds pasted into Wix pages | Real pages in `site/`, built from the same root `*.html` files by `npm run build` |
| Images on `static.wixstatic.com` | `site/images/` (compressed; 17 MB → 2 MB) |
| `masterPage.js` SEO injection | JSON-LD, canonical and `og:url` written into each page's `<head>` (`scripts/seo-data.mjs`) |
| `/_functions/rental` (`http-functions.js`, `rentalService.js`) | `/api/rental` (`functions/api/rental.js`, `lib/booking.js`), same request/response contract |
| `Reservations` CMS collection | D1 table `reservations` (`migrations/0001_reservations.sql`) |
| Wix eCom checkout | Stripe Checkout (`lib/stripe.js`) |
| `events.js` order hooks | Stripe webhook `/api/stripe-webhook` |
| Editing the CMS by hand | `/api/admin/reservations` (list / add phone booking / cancel) |
| Wix page URLs | `site/_redirects` sends old Wix URLs to the new pages |

Prices and date rules still live in `src/public/rental.js`. Both sites read it.

**Don't merge this branch into `main` until cutover day.** `main` is still
synced to Wix, and this branch removes the Wix CLI from `package.json`.

## Before you start: decide on sales tax

The site promises "plus tax, added at checkout." Pick one and set it in
`wrangler.toml` (or as a Pages variable):

- **Stripe Tax** (`STRIPE_AUTOMATIC_TAX = "true"`): works out VA / MD / DC rates
  from the customer's billing address. Costs 0.5% per transaction. You register
  your VA sales-tax ID in Stripe → Tax settings.
- **One fixed rate** (`STRIPE_TAX_RATE_ID = "txr_..."`): create a tax rate in
  Stripe → Products → Tax rates. Free, but every customer pays the same rate.

To match what customers pay today, look at Wix Dashboard → Settings → Tax first.

## Step-by-step

### 1. Stripe (about 20 min)
1. Create or activate a Stripe account for TerraForge LLC (bank account, EIN).
2. Developers → API keys: copy the **test** secret key (`sk_test_…`).
3. Developers → Webhooks → Add endpoint. URL `https://<your-project>.pages.dev/api/stripe-webhook`
   for now (switch to the real domain at cutover). Events:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `checkout.session.expired`.
   Copy its signing secret (`whsec_…`).
4. Settings → Emails: turn on **successful payments** emails to customers
   (their receipt) and payment notifications to you. These replace the Wix
   order emails.

### 2. Cloudflare (about 20 min)
```bash
npx wrangler login
npx wrangler d1 create terraforge-reservations
```
Paste the printed `database_id` into `wrangler.toml`, then:
```bash
npm run db:migrate
```
In the Cloudflare dashboard: Workers & Pages → Create → Pages → **Connect to Git**
→ `sbusby/terraforge-rentals`.
- Production branch: `main` (it will only go live once you merge)
- Build command: `npm run build`  ·  Output directory: `site`
- Settings → Variables and secrets: add `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `ADMIN_TOKEN` (any random string of 32+ characters;
  `openssl rand -hex 24` makes one).

Every push to `cloudflare-migration` gets a preview URL. Test there.

### 3. Test with Stripe test mode
On the preview URL, book a date with card `4242 4242 4242 4242`. Check:
- you land on `/thank-you`
- the dates show as booked when you reload `/book-a-rental`
- the reservation shows in the admin list (below) as `confirmed`

### 4. Carry over existing bookings
In Wix → CMS → Reservations, find every **confirmed** booking with a future
pickup date. Add each one so those dates stay blocked:
```bash
curl -X POST https://<site>/api/admin/reservations \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"action":"add","start":"2026-12-03","end":"2026-12-04","resources":["bobcatT64"],"name":"…","phone":"…","source":"wix-import"}'
```
`resources` keys: `bobcatT64`, `palletForks`, `brushGrapple`, `stumpBucket`.
Any refunds on orders paid through Wix still have to be issued in Wix, so do
them before the plan ends.

### 5. Domain (start by Dec 1; transfers take up to a week)
The domain is registered at Wix, expires Dec 29, 2026, and is transfer-locked.
1. Add `terraforgellc.com` to Cloudflare (free plan). It imports the DNS records.
2. In Wix → Domains: **unlock** the domain and get the **transfer (auth) code**.
3. Cloudflare Registrar only accepts domains already using Cloudflare
   nameservers. If Wix lets you change the nameservers, switch to the two
   Cloudflare gives you, then transfer to Cloudflare Registrar (about $10/yr). If
   Wix won't, transfer to Porkbun or Namecheap instead, then point that
   registrar's nameservers at Cloudflare.
4. Pages project → Custom domains: add `www.terraforgellc.com` and
   `terraforgellc.com`. Set a redirect from the bare domain to `www`, since the
   canonical tags use `www`.

### 6. Cutover day
1. Merge `cloudflare-migration` into `main`. Cloudflare deploys it, and Wix stops
   mattering.
2. In Stripe, switch to the **live** secret key, and add a live webhook on
   `https://www.terraforgellc.com/api/stripe-webhook` with its new `whsec_…`.
3. Do one real booking and refund it in Stripe to prove the whole flow works.
4. Google Search Console: submit `https://www.terraforgellc.com/sitemap.xml`.
5. Make sure Wix auto-renew is off.

### 7. Cleanup (after cutover)
Delete `src/pages`, `src/backend`, `wix.config.json`, `wix.lock`,
`.eslintrc.json`, `BOOKING_PAGE_SETUP.md`. Move `src/public/rental.js` to `lib/`
and update the two imports.

## Day-to-day

- **Edit a page:** change the root `*.html` file and push. Cloudflare rebuilds
  the site.
- **Change prices:** `src/public/rental.js`, plus the `FALLBACK` copy in
  `booking.html`.
- **See bookings:** `curl -H "Authorization: Bearer $ADMIN_TOKEN" https://www.terraforgellc.com/api/admin/reservations`
- **Cancel:** refund in Stripe, then run `{"action":"cancel","id":"…"}` against
  the admin API to free the dates.
- **Local dev:** `cp .dev.vars.example .dev.vars` (test keys), `npm install`, `npm run dev`.
- **Tests:** `npm test` (unit) and `npm run test:e2e` (full booking flow against
  a fake Stripe, all local).

## Cost

| | Wix | Cloudflare + Stripe |
|---|---|---|
| Hosting | $348/yr | $0 (free tier: 100k requests/day) |
| Domain | bundled first year | ~$10/yr |
| Card fees | Wix Payments, ~2.9% + 30¢ | Stripe, 2.9% + 30¢ |
| Tax | — | Stripe Tax +0.5%, or $0 with a fixed rate |
