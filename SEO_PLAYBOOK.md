# TerraForge SEO Playbook

Goal: show up when the DC-metro area searches "skid steer rental near me",
"bobcat rental alexandria va", "track loader rental northern virginia", etc.
Ordered by impact. Items marked **[Wix dashboard]** need you (or a browser
session) logged into manage.wix.com — they can't be done from code.

---

## 0. The one structural problem to know about

Every page's content lives in an **HTML iframe embed** (served from
`filesusr.com`). Google indexes the *Wix page*, which it sees as almost empty —
the copy, headings, and prices inside the iframe mostly don't count toward
ranking. Two mitigations, in order of effort:

1. **Now (5 min/page):** set each Wix page's SEO title + description in the
   editor (table below). This is what shows in Google results.
2. **Later (recommended):** on each Wix page, add a native Wix text block
   above or below the iframe with the page's H1 and 2–3 sentences of the same
   copy (e.g. Home: "Bobcat T64 skid steer rental delivered within 50 miles of
   Alexandria, VA…"). Native text is what actually ranks. The embeds stay for
   design; the native text does the SEO work.

## 1. Page SEO settings **[Wix dashboard]**

Editor → Pages & Menu → ⋯ on each page → SEO basics. Paste these (they match
the embeds' own `<title>`/description tags for consistency):

| Page | SEO title | Meta description |
|---|---|---|
| Home | Bobcat T64 Skid Steer Rental, Delivered — TerraForge · Alexandria, VA | Rent a late-model Bobcat T64 compact track loader with white-glove delivery and pickup — including weekends — anywhere within 50 miles of Alexandria, VA. Flat pricing from $425/day, booked online. |
| Equipment | Bobcat T64 Compact Track Loader Rental — Specs \| TerraForge, Alexandria VA | Full specs for our late-model Bobcat T64: 68 hp, 2,300 lb capacity, enclosed AC cab, HD 80-inch bucket included. Delivered to your site in the Alexandria, VA area. |
| Attachments | Skid Steer Attachment Rentals — Forks, Grapple, Stump Bucket \| TerraForge | Rent pallet forks, a 76-inch brush grapple, or a stump bucket with the Bobcat T64 — or on their own. Delivered with the machine in the Alexandria, VA area. |
| Delivery | Delivery Zones & Fees — DC, Arlington, Fairfax, Alexandria \| TerraForge | Flat-fee equipment delivery and pickup within 50 miles of Alexandria, VA: $275, $400, or $525 by zone, covering both trips. Check your ZIP in seconds. |
| Requirements | Skid Steer Rental Requirements — Experience & Deposit \| TerraForge | What you need to rent the Bobcat T64: prior skid steer experience, 21+, valid ID, and a $600 refundable deposit collected at delivery. Delivery-only rentals. |
| FAQ | Skid Steer Rental FAQ — Delivery, Deposit, Cancellation \| TerraForge | Straight answers on renting the Bobcat T64: how delivery works, fuel, weather, deposits, cancellation, and operator requirements in the Alexandria, VA area. |
| Contact | Contact TerraForge — Bobcat T64 Rental, Alexandria VA | Questions about renting the Bobcat T64 in the DC metro area? Email or call TerraForge — owner-operated, responses within 24 hours. |
| Book a Rental | Book a Bobcat T64 Rental Online — Live Availability \| TerraForge | Pick your dates, see your exact total with delivery and tax, and book the Bobcat T64 online. Delivery Thursday–Sunday across the Alexandria, VA area. |
| Terms | Rental Terms & Conditions \| TerraForge Equipment Rentals | The plain-English rental agreement for TerraForge equipment rentals: payment, deposit, delivery, cancellation, and responsibility terms. |

## 2. URL / page cleanup **[Wix dashboard]**

- Rename the booking page slug **/blank → /book-a-rental** (Pages & Menu →
  Book a Rental → SEO basics → URL slug). All embed CTAs now point at
  `/book-a-rental`. Note: today `/blank` 301-redirects to `/faq` — that
  redirect should end up pointing at `/book-a-rental` instead (Wix usually
  handles it when you rename; verify).
- Hide the old Wix Bookings pages (Book Online, Booking Calendar, Booking
  Form, Service Page, My Bookings) from menu AND search engines — each page's
  SEO basics has a "Let search engines index this page" toggle → off. The old
  services show stale prices ($725/$1,050/$1,550) and will confuse both Google
  and customers.
- Site Settings → Website name: "TerraForge" (shows as the brand in Google).

## 3. Google Business Profile — the biggest local lever

"Skid steer rental near me" is won in the map pack, not the blue links.
- Create at business.google.com → **Service-area business** (hide the home
  address, list service areas: Alexandria, Arlington, Fairfax, Springfield,
  Woodbridge, DC, etc.).
- Category: "Equipment rental agency" (add "Construction equipment supplier").
- Add the T64 photos, pricing, booking link (terraforgellc.com/book-a-rental),
  hours (Thu–Sun delivery), phone.
- After every rental, text customers a review link. 10+ reviews with photos
  beats almost any on-page optimization for local queries.

## 4. Search Console & sitemap

- search.google.com/search-console → add property `terraforgellc.com`
  (DNS verification through your domain registrar, or the HTML-tag method in
  Wix SEO settings → Verify site).
- Submit `https://www.terraforgellc.com/sitemap.xml`.
- Bing Webmaster Tools can import from Search Console in one click.

## 5. Structured data

The new home embed already carries `LocalBusiness` + `Offer` JSON-LD. Wix also
lets you add page-level structured data natively: Page SEO settings →
Advanced → Structured data — paste the same LocalBusiness block there so it
lives on the parent page (which is the one Google indexes). It's in
`home.html` lines 14–33.

## 6. Keyword targets (for any copy you write)

Primary: `skid steer rental alexandria va` · `bobcat rental northern virginia`
· `compact track loader rental dc` · `skid steer rental with delivery`
Secondary: `bobcat t64 rental` · `pallet fork rental` · `brush grapple rental`
· `weekend equipment rental [city]` · `land clearing equipment rental fairfax`
Long-tail (great blog/FAQ fodder): "how much does it cost to rent a skid
steer", "skid steer rental no trailer", "do rental companies deliver on
weekends".

## 7. Demand channels beyond Google

- **Facebook Marketplace + Craigslist** (post the rental with photos and the
  booking link; renew weekly — this is where DIY renters actually look).
- **Nextdoor** business page for the Alexandria/Springfield neighborhoods.
- **Yelp + Bing Places + Apple Maps** free listings (same NAP everywhere:
  TerraForge LLC · Alexandria, VA 22310 · (208) 863-0450).
- Consider **Google Ads** later: "skid steer rental [city]" exact-match with
  a $20–30/day cap converts well for rentals; wait until the new checkout is
  live and tested.

## 8. Small flags

- The business phone is an Idaho area code (208). Totally workable, but a
  local 571/703 number (Google Voice is fine) measurably improves local
  trust and GBP conversion. Keep whichever number you choose consistent
  everywhere (site, GBP, Yelp, directories).
- Once the new embeds are pasted in, run the site through
  search.google.com/test/rich-results to confirm the LocalBusiness block
  parses.
