/**
 * TerraForge Rentals — backend web methods for the custom booking flow.
 *
 * Requires a CMS collection with ID "Reservations" (see SETUP_CHECKLIST.md):
 *   startDate (Text, YYYY-MM-DD), endDate (Text), resources (Text, JSON array),
 *   status (Text: pending|confirmed|cancelled), zoneKey (Text), total (Number),
 *   checkoutId (Text), orderId (Text), orderNumber (Text),
 *   termsVersion (Text), agreedAt (Date & Time), customerEmail (Text)
 */

import { Permissions, webMethod } from 'wix-web-module';
import wixData from 'wix-data';
import { checkout } from 'wix-ecom-backend';
import {
  CONFIG,
  TERMS_VERSION,
  buildQuote,
  validateRange,
  occupiedDates,
  selectedResources,
  toDateString,
} from 'public/rental.js';

const RESERVATIONS = 'Reservations';
const PENDING_EXPIRY_MIN = 60; // unpaid checkouts release their dates after this

function todayStr() {
  return toDateString(new Date());
}

/** Active reservations = confirmed, or pending and not yet expired. */
async function activeReservations() {
  const cutoff = new Date(Date.now() - PENDING_EXPIRY_MIN * 60 * 1000);
  const res = await wixData
    .query(RESERVATIONS)
    .hasSome('status', ['pending', 'confirmed'])
    .ge('endDate', todayStr())
    .limit(1000)
    .find({ suppressAuth: true });
  return res.items.filter(
    (r) => r.status === 'confirmed' || (r.status === 'pending' && r._createdDate >= cutoff)
  );
}

/**
 * Dates each resource is unavailable, as { resourceKey: ['YYYY-MM-DD', ...] }.
 * The booking page uses this to grey out calendar days.
 */
export const getUnavailableDates = webMethod(Permissions.Anyone, async () => {
  const items = await activeReservations();
  const map = {};
  for (const r of items) {
    let resources = [];
    try {
      resources = JSON.parse(r.resources || '[]');
    } catch (e) {
      resources = [];
    }
    const dates = occupiedDates(r.startDate, r.endDate);
    for (const key of resources) {
      if (!map[key]) map[key] = [];
      map[key].push(...dates);
    }
  }
  for (const key of Object.keys(map)) map[key] = [...new Set(map[key])].sort();
  return map;
});

function hasConflict(items, startStr, endStr, resources) {
  return items.some((r) => {
    if (!(r.startDate <= endStr && r.endDate >= startStr)) return false;
    let theirs = [];
    try {
      theirs = JSON.parse(r.resources || '[]');
    } catch (e) {
      theirs = [];
    }
    return theirs.some((k) => resources.includes(k));
  });
}

/** Server-side quote so displayed and charged prices always match. */
export const getQuote = webMethod(Permissions.Anyone, async (sel, startStr, endStr) => {
  const v = validateRange(startStr, endStr, todayStr());
  if (!v.ok) return { ok: false, reason: v.reason };
  return { ok: true, quote: buildQuote(sel, v.days) };
});

/**
 * Validate + reserve + create a Wix eCommerce checkout with custom line items.
 * Returns { ok, checkoutUrl } or { ok: false, reason }.
 */
export const createRentalCheckout = webMethod(
  Permissions.Anyone,
  async (sel, startStr, endStr, agreedToTerms) => {
    if (!agreedToTerms) {
      return { ok: false, reason: 'You must agree to the Rental Terms to book.' };
    }

    const v = validateRange(startStr, endStr, todayStr());
    if (!v.ok) return { ok: false, reason: v.reason };

    const resources = selectedResources(sel);
    if (resources.length === 0) {
      return { ok: false, reason: 'Select the machine or at least one attachment.' };
    }

    const existing = await activeReservations();
    if (hasConflict(existing, startStr, endStr, resources)) {
      return {
        ok: false,
        reason: 'Sorry — part of that date range was just booked. Please pick different dates.',
      };
    }

    const quote = buildQuote(sel, v.days);

    const customLineItems = quote.lines.map((l) => ({
      itemName: { original: l.name },
      price: l.amount.toFixed(2),
      quantity: 1,
      itemType: { preset: 'SERVICE' },
      descriptionLines: [
        {
          name: { original: 'Rental period' },
          plainText: { original: `Delivery ${startStr} — Pickup ${endStr}` },
        },
      ],
    }));

    const newCheckout = await checkout.createCheckout({
      channelType: 'WEB',
      customLineItems,
    });

    const reservation = await wixData.insert(
      RESERVATIONS,
      {
        title: `${startStr} → ${endStr} (${resources.join(', ')})`,
        startDate: startStr,
        endDate: endStr,
        resources: JSON.stringify(resources),
        status: 'pending',
        zoneKey: sel.zoneKey,
        total: quote.total,
        checkoutId: newCheckout._id,
        termsVersion: TERMS_VERSION,
        agreedAt: new Date(),
      },
      { suppressAuth: true }
    );

    const { checkoutUrl } = await checkout.getCheckoutUrl(newCheckout._id);
    return { ok: true, checkoutUrl, reservationId: reservation._id };
  }
);
