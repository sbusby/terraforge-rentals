# Booking Page Setup (Wix Editor)

The booking flow is now a single HTML embed — `booking.html` in this repo —
exactly like every other page on the site. It draws the calendar, computes the
quote, collects the customer's details, and calls the backend HTTP API
(`src/backend/http-functions.js` → `/_functions/rental`) to create the Wix
checkout. Nothing on the page needs Velo element IDs any more.

## One-time swap on the "Book a Rental" page (~5 min)

1. Open the site in the Wix editor → Pages → **Book a Rental**.
2. **Delete** the old native elements: both date pickers, the zone dropdown,
   all five checkboxes, the quote/error text boxes, the leftover
   "I'm a paragraph" text, and the Book Now button. (If you leave any behind,
   page code hides them automatically once the embed exists, but deleting is
   cleaner.)
3. Add panel → **Embed Code → Embed HTML** (creates an HTML iframe element).
4. In its settings choose **Code**, paste the ENTIRE contents of
   `booking.html`, and click **Update**.
5. Size it: stretch to full width; set height to roughly **1,900 px** on
   desktop and **2,600 px** on mobile (the widget scrolls inside the frame if
   it needs more room). Position it directly under the site header.
6. Repeat the height check in the mobile editor.
7. **Publish**.

## Deploying code changes

Pushing to GitHub syncs `src/` to the site but does **not** publish it. After
every push run from the repo root:

```bash
npx wix publish --source local --approve-preview
```

Sanity check: https://www.terraforgellc.com/_functions/rental must return
`{"ok":true,...}`. A 404 means the code is not published yet.

## How the pieces fit

| Piece | File | Job |
|---|---|---|
| Prices & rules | `src/public/rental.js` | single source of truth |
| Booking service | `src/backend/rentalService.js` | availability, quote, checkout + reservation |
| Public API | `src/backend/http-functions.js` | CORS JSON endpoint the embed calls |
| Web methods | `src/backend/rentals.web.js` | same service for Velo page code |
| Order events | `src/backend/events.js` | flips reservation to confirmed / cancelled |
| Widget | `booking.html` | the UI (paste into the embed) |
| Host bridge | `src/pages/masterPage.js` | opens checkout when the embed asks; injects SEO schema |

When the customer clicks **Reserve & Pay**, the embed posts to the API, which
validates dates/availability, creates the checkout with the server-side
prices, inserts a `pending` row in the `Reservations` collection (expires in
60 min if unpaid) and returns the checkout URL. The embed asks the host page
to navigate there (with a direct top-window fallback). Once the order is paid,
`events.js` marks the reservation `confirmed`, which blocks those dates in the
calendar for everyone else.

## Changing prices

Edit `src/public/rental.js`, push, publish. The embed loads live prices from
the API on every visit, but also carries a hard-coded fallback copy in its
`FALLBACK` object — update those numbers too so the page is right even if the
API is briefly unreachable.
