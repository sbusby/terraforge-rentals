# Moving terraforgellc.com off Wix → Cloudflare Pages + Stripe

**Deadlines** (read from your Wix account on Nov 11):
- **Nov 29, 2026:** Wix bills the **domain** renewal on the Amex ending 2008 (still auto-renew on). Its first year was free, so this is a separate charge.
- ~~**Dec 10, 2026:** Core plan renewal ($348)~~: auto-renew is now off, so no charge.
- **Dec 29, 2026:** the plan and the domain registration both end. Without the
  plan, Wix disconnects the custom domain, so cutover must be done by then.

## Status (updated Nov 11)

**Done**
- [x] Code ported, tested locally (6 unit + 12 end-to-end checks), pushed to the `cloudflare-migration` branch
- [x] Existing Wix bookings checked: there are **no upcoming bookings** to carry over (step 4)
- [x] `ADMIN_TOKEN` generated in `.dev.vars` (gitignored; keep a copy in 1Password)
- [x] `npm run setup:cloudflare` script written: creates the database, applies the schema, sets the secrets
- [x] Domain checked: no email on terraforgellc.com (no MX records), so there's no mailbox to move
- [x] Wix account checked (read-only): **0 orders ever**, so there's nothing to refund in Wix; tax setup recorded below

**Your part, in order (about 1½ hours total, can be split up)**
- [x] Core plan auto-renew turned **off** (confirmed in Wix Nov 11; the plan ends Dec 29)
- [x] Tax mode chosen: **Stripe Tax**, switched on in `wrangler.toml` and tested
- [x] Stripe account created; **test mode** configured by `npm run setup:stripe` (Nov 11): Stripe Tax active
      (origin = your business address, code `txcd_99999999` General – Tangible Goods, prices exclusive),
      Virginia registration, webhook to `terraforge-rentals.pages.dev`. Test key + webhook secret are in `.dev.vars`.
      A real test checkout through the local site was accepted by Stripe.
- [x] Stripe receipt emails turned on (Settings → Business → Customer emails → Successful payments)
- [ ] **Before cutover:** finish Stripe business verification (EIN, bank account) so live payments and payouts work
- [ ] **This week, 15 min:** Cloudflare sign-in + `npm run setup:cloudflare db` + connect GitHub (step 2)
- [ ] **This week, 10 min:** test booking with a Stripe test card (step 3)
- [ ] **Before Nov 29, 15 min + waiting:** domain unlock + transfer (step 5). Once the transfer is under way, turn off the domain's auto-renew in Wix.
- [ ] **Once the domain is on Cloudflare, 20 min:** cutover (step 6)

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

## Sales tax: Stripe Tax (decided)

`wrangler.toml` has `STRIPE_AUTOMATIC_TAX = "true"`. At checkout:
- prices show before tax, and Stripe adds the tax on top
- the customer enters the **job site address** (Checkout's "shipping" field,
  labeled for the job site), and Stripe Tax uses it to pick the rate
- Stripe charges 0.5% per transaction for this

Stripe Tax only collects tax where you tell it you're registered, so step 1
includes setting that up.

For reference, Wix was set to 6% on Virginia only, and nobody ever checked
out, so no customer has been charged tax yet. Two questions for your
accountant before going live:
- Is the separately stated delivery/pickup fee taxable in VA? If not, give
  it its own tax code in Stripe (ask me to wire that in).
- Do you need to register in MD or DC for rentals delivered there? Add any
  registration in Stripe → Tax → Registrations, and Stripe starts collecting there.

## Step-by-step

### 1. Stripe (about 30 min)
1. Create or activate a Stripe account for TerraForge LLC (bank account, EIN).
2. **Stripe Tax** → Settings:
   - Origin address: your Alexandria, VA 22310 business address.
   - Default product tax code: pick the one for renting equipment (search
     "rental" in the picker).
   - Default tax behavior: **Exclusive**.
   - Registrations → add **Virginia** with your VA sales-tax account number,
     plus MD or DC if your accountant says so.
   Set this up in test mode too, or test checkouts will show $0 tax.
3. Developers → API keys: copy the **test** secret key (`sk_test_…`).
4. Developers → Webhooks → Add endpoint. URL `https://terraforge-rentals.pages.dev/api/stripe-webhook`
   for now (switch to the real domain at cutover). Events:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `checkout.session.expired`.
   Copy its signing secret (`whsec_…`).
5. Settings → Emails: turn on **successful payments** emails to customers
   (their receipt) and payment notifications to you. These replace the Wix
   order emails.

### 2. Cloudflare (about 15 min)
Sign up at cloudflare.com (free plan) if you haven't, then from `~/terraforge-rentals`:
```bash
npx wrangler login
npm run setup:cloudflare db
git commit -am "Set D1 database id" && git push
```
`setup:cloudflare db` creates the database, writes its id into `wrangler.toml` and
applies the schema.

In the Cloudflare dashboard: Workers & Pages → Create → Pages → **Connect to Git**
→ `sbusby/terraforge-rentals`, and name the project `terraforge-rentals`.
- **Production branch: `cloudflare-migration`** (switch it to `main` at cutover).
  Wrangler can only set secrets on production, and nothing points the real
  domain here yet, so it's safe.
- Build command: `npm run build`  ·  Output directory: `site`

Paste the Stripe test keys from step 1 into `.dev.vars`, then:
```bash
npm run setup:cloudflare secrets
```
It also uploads the `ADMIN_TOKEN` already in `.dev.vars`. Then use "Retry
deployment" in the dashboard so the site picks up the secrets. The site is now
at `https://terraforge-rentals.pages.dev`.

### 3. Test with Stripe test mode
On the preview URL, book a date with card `4242 4242 4242 4242`. Check:
- you land on `/thank-you`
- the dates show as booked when you reload `/book-a-rental`
- the reservation shows in the admin list (below) as `confirmed`

### 4. Carry over existing bookings
As of Nov 11 the live Wix booking API reports **no** booked dates, so there is
nothing to move. Check again right before cutover:
`curl -s https://www.terraforgellc.com/_functions/rental | grep -o '"unavailable":.*'`
should print `"unavailable":{}`. If anything shows up, look it up in Wix → CMS →
Reservations and add it here:
```bash
curl -X POST https://<site>/api/admin/reservations \
  -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"action":"add","start":"2026-12-03","end":"2026-12-04","resources":["bobcatT64"],"name":"…","phone":"…","source":"wix-import"}'
```
`resources` keys: `bobcatT64`, `palletForks`, `brushGrapple`, `stumpBucket`.
(As of Nov 11 the Wix store has no orders at all, so there's nothing to refund in Wix.)

### 5. Domain (start before Nov 29; transfers take up to a week)
The domain is registered at Wix, set to auto-renew on **Nov 29**, expires
Dec 29, 2026, and is transfer-locked. A transfer adds a year of registration at
the new registrar, so if you start it before Nov 29 you can turn off Wix's
domain auto-renew and skip that charge. If Nov 29 comes first, let it renew:
the transfer still works afterwards, you just pay Wix for that year.
Never turn off the domain's auto-renew *without* a transfer under way, or
the site goes dark on Dec 29.
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
1. Merge `cloudflare-migration` into `main`, then in Pages → Settings → Builds
   switch the production branch to `main`.
2. Stripe live mode: put the **live** secret key (`sk_live_…`) in `.dev.vars`, then
   ```bash
   npm run setup:stripe -- --live --apply --tax-code txcd_99999999 \
     --address "<street>|Alexandria|VA|22310" \
     --webhook-url https://www.terraforgellc.com/api/stripe-webhook
   npm run setup:cloudflare secrets
   ```
   That sets up live Stripe Tax, the VA registration and the live webhook, saves the
   new `whsec_…`, and uploads both secrets to Cloudflare.
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
