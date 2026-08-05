# Booking Page Setup (Wix Studio Editor)

The custom booking flow lives on the **new page** created 2026-08-05 (currently
named "New Page", code file `src/pages/New Page.dsb30.js`). Already on it:

- ✅ Date Picker `#deliveryPicker` (renamed)
- ✅ Date Picker `#datePicker1` — used as the RETURN picker (no rename needed)
- ✅ Checkbox `#checkbox1` — used as the "Attachments only (no machine)" toggle

## Elements still to add (in THIS order — numbering matters)

The code accepts the editor's default IDs, so **no ID renaming is needed** as
long as the checkboxes are added in this exact order:

| # | Element (Add panel → Input) | Default ID it will get | Set its label to |
|---|------------------------------|------------------------|------------------|
| 1 | Checkbox | `checkbox2` | Pallet Forks |
| 2 | Checkbox | `checkbox3` | Brush Grapple |
| 3 | Checkbox | `checkbox4` | Stump Bucket |
| 4 | Checkbox | `checkbox5` | I have read and agree to the Rental Terms |
| 5 | Radio Group (Selection) | `radioGroup1` | Delivery zone (leave options — code fills them) |
| 6 | Text (Add panel → Text) | `text1` | (quote appears here — give it ~8 lines of room) |
| 7 | Text | `text2` | (error message — small, red) |
| 8 | Button | `button1` | Book Now |

Also label the two existing date pickers ("Delivery date" / "Pickup date") and
the `checkbox1` toggle ("Attachments only — no machine").

Friendly IDs (`#forksCheckbox`, `#zoneRadio`, `#quoteText`, …) also work if you
prefer renaming — see the ID table at the top of `New Page.dsb30.js`.

## Page settings

1. Rename the page "New Page" → **Book a Rental** (Pages & Menu panel).
2. Give it the URL slug `/book-a-rental`.
3. Point the header **BOOK NOW** button and the Home page's **BOOK A RENTAL**
   button at this page.
4. Hide the old Wix Bookings pages (Book Online, Booking Calendar, Booking
   Form, Service Page, My Bookings) from the site menu.
5. **Publish** — this also syncs the page's code file to GitHub.

Layout suggestion: left column = dates + zone + attachments, right column =
quote + terms + Book Now. Prices and rules live in `src/public/rental.js`.
