# Booking Page Setup (Wix Studio Editor)

The code in `src/pages/Book Online.qhumu.js` drives the new booking flow. It needs
these elements placed on the **Book Online** page in the Studio editor. First,
**delete the Wix Bookings calendar widget** from the page.

For each element: add it, then set its ID in the right-click menu (or the
Properties panel — open with the `</>` Dev Mode toggle).

| # | Element (Add panel) | ID to set | Notes |
|---|---------------------|-----------|-------|
| 1 | Date Picker | `deliveryPicker` | Label: "Delivery date" |
| 2 | Date Picker | `returnPicker` | Label: "Pickup date". Code disables it until a delivery date is chosen |
| 3 | Radio Group | `zoneRadio` | Label: "Delivery zone". Leave options empty — code fills them with live prices |
| 4 | Checkbox | `attachOnlyCheckbox` | Label: "Attachments only (no machine)" |
| 5 | Checkbox | `forksCheckbox` | Label: "Pallet Forks" |
| 6 | Checkbox | `grappleCheckbox` | Label: "Brush Grapple" |
| 7 | Checkbox | `stumpCheckbox` | Label: "Stump Bucket" |
| 8 | Text | `quoteText` | The live price breakdown renders here — give it ~8 lines of room |
| 9 | Checkbox | `termsCheckbox` | Label: "I have read and agree to the Rental Terms" — put a link to the Terms page next to it |
| 10 | Button | `bookButton` | Label: "Book Now" |
| 11 | Text | `errorText` | Small red text near the button; code shows/hides it |

Layout suggestion (matches the old flow's feel):
left column = dates + zone + attachments, right column = quote + terms + Book Now.

Everything else (day rules, prices, availability greying, checkout) is automatic.
Prices and rules live in one file: `src/public/rental.js`.
