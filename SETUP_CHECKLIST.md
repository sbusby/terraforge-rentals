# Dashboard Setup Checklist

Steps that must be done in the Wix dashboard / editor (they can't be done from code).
Do them in order. Dashboard: https://manage.wix.com → your site.

## 1. Wix Payments (~10 min)
- Dashboard → **Settings → Accept Payments** → set up **Wix Payments**
  (business details + bank account for payouts).
- Requires a paid site plan (Core or higher) if not already on one.
- Fees: 2.9% + 30¢ per transaction, no monthly cost.

## 2. Automated sales tax (~2 min)
- Dashboard → **Settings → Tax** → enable **automated tax calculation** and
  confirm your business location/nexus. Tax then applies at checkout
  automatically based on the customer's address.

## 3. Create the `Reservations` CMS collection (~5 min)
- Dashboard → **CMS → Create Collection** → name it `Reservations`
  (collection ID must be exactly `Reservations`).
- Permissions: **Admin only** (form submissions come through backend code).
- Add fields (Field Key must match exactly):

| Field key | Type |
|---|---|
| `startDate` | Text |
| `endDate` | Text |
| `resources` | Text |
| `status` | Text |
| `zoneKey` | Text |
| `total` | Number |
| `checkoutId` | Text |
| `orderId` | Text |
| `orderNumber` | Text |
| `termsVersion` | Text |
| `agreedAt` | Date & Time |
| `customerEmail` | Text |

## 4. Booking page elements (~15 min)
- Follow **BOOKING_PAGE_SETUP.md**.

## 5. Retire the Wix Bookings app pages
- Hide/remove the old Bookings pages from the menu: Booking Calendar,
  Booking Form, Service Page, My Bookings (Plans & Pricing / Paywall /
  Subscriptions too if unused).
- Point every "Book Now" button on Home/Equipment at the **Book Online** page.
- Once the new flow is verified, the Wix Bookings app can be deleted from the
  site to stop it interfering (App Market → Manage Apps).

## 6. Terms page
- Paste the content from **RENTAL_TERMS_DRAFT.md** (after your review) into the
  Terms page, replacing placeholder business details.

## 7. Test end to end
- Preview site → Book Online: verify Mon–Wed are greyed out, a booked range
  blocks dates, quote math matches `src/public/rental.js`.
- Make a real $ test booking (you can refund it): confirm payment is charged
  **today** (no more "Pay Later $0"), tax appears, and the reservation flips
  to `confirmed` in the CMS with an order number.
- Cancel the test order → reservation flips to `cancelled`, dates free up.

## Ongoing operations
- **Damage deposit ($500)**: collect at delivery via the Wix mobile app
  (Tap to Pay), cash, or check. Refund after return inspection.
- **Cancellations**: refund from Dashboard → Orders per the policy
  (≥48 hrs: refund minus $50 booking fee; <48 hrs: 50%; no-show: none).
- **Manual blocks** (maintenance, personal use): add a `Reservations` row with
  status `confirmed`, the date range, and resources `["bobcatT64"]`.
