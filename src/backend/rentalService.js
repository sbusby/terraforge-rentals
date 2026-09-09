/**
 * TerraForge Rentals — shared booking service used by BOTH the web methods
 * (rentals.web.js, called from page code) and the HTTP functions
 * (http-functions.js, called from the booking.html embed).
 *
 * Requires a CMS collection with ID "Reservations" (see SETUP_CHECKLIST.md).
 */

import wixData from 'wix-data';
import { checkout } from 'wix-ecom-backend';
import { elevate } from 'wix-auth';
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

// Creating a checkout with explicit (custom) prices needs owner-level
// permissions; visitors only reach this through our validated code path.
const createCheckoutElevated = elevate(checkout.createCheckout);
const getCheckoutUrlElevated = elevate(checkout.getCheckoutUrl);

export function todayStr() {
  return toDateString(new Date());
}

function parseResources(r) {
  try {
    const v = JSON.parse(r.resources || '[]');
    return Array.isArray(v) ? v : [];
  } catch (e) {
    return [];
  }
}

/** Active reservations = confirmed, or pending and not yet expired. */
export async function activeReservations() {
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

/** Dates each resource is unavailable, as { resourceKey: ['YYYY-MM-DD', ...] }. */
export async function unavailableDates() {
  let items = [];
  try {
    items = await activeReservations();
  } catch (err) {
    // A missing/misnamed collection must not take the booking page down.
    console.error('activeReservations failed (is the Reservations collection created?)', err);
    return {};
  }
  const map = {};
  for (const r of items) {
    const dates = occupiedDates(r.startDate, r.endDate);
    for (const key of parseResources(r)) {
      if (!map[key]) map[key] = [];
      map[key].push(...dates);
    }
  }
  for (const key of Object.keys(map)) map[key] = [...new Set(map[key])].sort();
  return map;
}

export function hasConflict(items, startStr, endStr, resources) {
  return items.some((r) => {
    if (!(r.startDate <= endStr && r.endDate >= startStr)) return false;
    return parseResources(r).some((k) => resources.includes(k));
  });
}

/** Public, price-bearing config for the booking widget. */
export function publicConfig() {
  return {
    machine: CONFIG.machine,
    zones: CONFIG.zones,
    attachments: CONFIG.attachments,
    deposit: CONFIG.deposit,
    cancellation: CONFIG.cancellation,
    rules: CONFIG.rules,
  };
}

export async function configPayload() {
  return {
    ok: true,
    today: todayStr(),
    termsVersion: TERMS_VERSION,
    config: publicConfig(),
    unavailable: await unavailableDates(),
  };
}

function normalizeSel(sel) {
  sel = sel || {};
  return {
    includeMachine: sel.includeMachine !== false,
    attachmentKeys: Array.isArray(sel.attachmentKeys) ? sel.attachmentKeys.map(String) : [],
    zoneKey: typeof sel.zoneKey === 'string' ? sel.zoneKey : '',
  };
}

export function quotePayload(sel, startStr, endStr) {
  sel = normalizeSel(sel);
  const v = validateRange(startStr, endStr, todayStr());
  if (!v.ok) return { ok: false, reason: v.reason };
  if (selectedResources(sel).length === 0) {
    return { ok: false, reason: 'Select the machine or at least one attachment.' };
  }
  return { ok: true, quote: buildQuote(sel, v.days) };
}

function clean(s, max) {
  return String(s == null ? '' : s)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function describe(err) {
  if (!err) return 'unknown error';
  if (typeof err === 'string') return err;
  const parts = [err.message];
  const d = err.details && (err.details.applicationError || err.details.validationError);
  if (d) parts.push(JSON.stringify(d));
  return parts.filter(Boolean).join(' | ').slice(0, 400);
}

const CALL_US = 'Please call or text (208) 863-0450 and we will book you by hand.';

/**
 * Validate + reserve + create a Wix eCommerce checkout with custom line items.
 * Returns { ok: true, checkoutUrl, reservationId } or { ok: false, reason }.
 */
export async function createRentalCheckout(sel, startStr, endStr, agreedToTerms, contact) {
  sel = normalizeSel(sel);
  contact = contact || {};
  if (!agreedToTerms) {
    return { ok: false, reason: 'You must agree to the Rental Terms to book.' };
  }

  const v = validateRange(startStr, endStr, todayStr());
  if (!v.ok) return { ok: false, reason: v.reason };

  const resources = selectedResources(sel);
  if (resources.length === 0) {
    return { ok: false, reason: 'Select the machine or at least one attachment.' };
  }
  if (!CONFIG.zones.some((z) => z.key === sel.zoneKey)) {
    return { ok: false, reason: 'Choose your delivery zone.' };
  }

  const name = clean(contact.name, 120);
  const email = clean(contact.email, 200).toLowerCase();
  const phone = clean(contact.phone, 40);
  const address = clean(contact.address, 300);
  const notes = clean(contact.notes, 1000);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, reason: 'That email address does not look right.' };
  }

  let existing = [];
  try {
    existing = await activeReservations();
  } catch (err) {
    console.error('activeReservations failed during checkout', err);
    return {
      ok: false,
      reason: `Our reservation calendar is unavailable right now. ${CALL_US}`,
      detail: describe(err),
    };
  }
  if (hasConflict(existing, startStr, endStr, resources)) {
    return {
      ok: false,
      reason: 'Sorry — part of that date range was just booked. Please pick different dates.',
    };
  }

  const quote = buildQuote(sel, v.days);
  const period = `Delivery ${startStr} — Pickup ${endStr}`;

  const customLineItems = quote.lines.map((l) => ({
    // The eCommerce API validates `productName`; older docs called it itemName.
    productName: { original: l.name },
    itemName: { original: l.name },
    price: l.amount.toFixed(2),
    quantity: 1,
    itemType: { preset: 'SERVICE' },
    descriptionLines: [
      {
        name: { original: 'Rental period' },
        plainText: { original: period },
      },
    ],
  }));

  const buyerNote = [
    `Rental ${period} (${v.days} day${v.days > 1 ? 's' : ''})`,
    name && `Name: ${name}`,
    phone && `Phone: ${phone}`,
    address && `Job site: ${address}`,
    notes && `Notes: ${notes}`,
    `Deposit $${CONFIG.deposit.amount} due at delivery.`,
  ]
    .filter(Boolean)
    .join('\n');

  let newCheckout;
  try {
    const base = { channelType: 'WEB', customLineItems };
    try {
      newCheckout = await createCheckoutElevated({
        ...base,
        checkoutInfo: {
          buyerNote,
          ...(email ? { buyerInfo: { email } } : {}),
        },
      });
    } catch (inner) {
      // Retry without the optional extras so a schema nit can't block a sale.
      console.warn('createCheckout with checkoutInfo failed, retrying bare', describe(inner));
      newCheckout = await createCheckoutElevated(base);
    }
  } catch (err) {
    console.error('createCheckout failed', err);
    return {
      ok: false,
      reason: `We could not start your checkout. ${CALL_US}`,
      detail: describe(err),
    };
  }

  let reservation = null;
  try {
    reservation = await wixData.insert(
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
        customerEmail: email,
        customerName: name,
        customerPhone: phone,
        siteAddress: address,
        notes,
      },
      { suppressAuth: true }
    );
  } catch (err) {
    // The checkout exists; don't strand the customer over a CMS hiccup.
    console.error('Reservation insert failed', err);
  }

  try {
    const { checkoutUrl } = await getCheckoutUrlElevated(newCheckout._id);
    return { ok: true, checkoutUrl, reservationId: reservation && reservation._id };
  } catch (err) {
    console.error('getCheckoutUrl failed', err);
    return {
      ok: false,
      reason: `We could not open the payment page. ${CALL_US}`,
      detail: describe(err),
    };
  }
}
