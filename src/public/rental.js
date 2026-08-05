/**
 * TerraForge Rentals — single source of truth for pricing & booking rules.
 * Edit numbers here; both the booking page and the backend import this file.
 *
 * Prices match the advertised rates on the site (home/faq/terms pages):
 *   Full Day $425 · Weekend (2 days) $750 · Weekly (7 days) $1,250
 *   Delivery zones from Alexandria, VA 22310: $275 / $400 / $525
 *   Attachments per day (stack per-day, no multi-day discount): $75 / $110 / $65
 *   Refundable damage deposit: $600
 * 3–6 day prices interpolate the advertised tiers (+$100/day past the weekend
 * rate) — adjust below if you want different mid-length pricing.
 */

export const TERMS_VERSION = '2026-08-05';

export const CONFIG = {
  machine: {
    key: 'bobcatT64',
    name: 'Bobcat T64 Skid Steer',
    // Flat price by rental length in days (delivery priced separately).
    prices: { 1: 425, 2: 750, 3: 850, 4: 950, 5: 1050, 6: 1150, 7: 1250 },
    // standard dirt bucket is included with the machine and is not rentable alone
  },

  // One-time fee per rental. Covers BOTH drop-off and pickup.
  zones: [
    { key: 'zone1', label: 'Zone 1 (0–20 mi)', fee: 275 },
    { key: 'zone2', label: 'Zone 2 (21–35 mi)', fee: 400 },
    { key: 'zone3', label: 'Zone 3 (36–50 mi)', fee: 525 },
  ],

  // Attachments are per day × number of days (advertised as stacking per-day).
  // standalone:true means it can be rented without the machine.
  attachments: [
    { key: 'palletForks', name: 'Pallet Forks', dayRate: 75, standalone: true },
    { key: 'brushGrapple', name: 'Brush Grapple', dayRate: 110, standalone: true },
    { key: 'stumpBucket', name: 'Stump Bucket', dayRate: 65, standalone: true },
  ],

  deposit: {
    amount: 600,
    note: 'Refundable damage deposit — collected at delivery (card, cash, or check), refunded within 5 business days after pickup per the Rental Terms. Not charged online today.',
  },

  cancellation: {
    freeCancelHours: 48, // full refund minus bookingFee up to this many hours before delivery
    bookingFee: 50,      // kept on any cancellation (deters serial book-and-cancel)
    lateRefundPct: 50,   // refund % when cancelling inside the freeCancelHours window
  },

  rules: {
    // JS Date.getDay(): Sun=0 ... Sat=6. Delivery AND pickup only Thu-Sun.
    allowedDays: [0, 4, 5, 6],
    blockedDaysOfWeek: [1, 2, 3], // Mon, Tue, Wed — for DatePicker.disabledDaysOfWeek
    minDays: 1,
    maxDays: 7,
    minLeadDays: 2,     // earliest delivery is 2 days out so you can schedule
    maxAdvanceDays: 180,
  },
};

// ---------- date helpers (all dates handled as 'YYYY-MM-DD' strings) ----------

export function toDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromDateString(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d); // local midnight
}

export function dayOfWeek(s) {
  return fromDateString(s).getDay();
}

/** Rental length in days: delivered on start, picked up on end. Thu->Fri = 1 day. */
export function rentalDays(startStr, endStr) {
  const ms = fromDateString(endStr) - fromDateString(startStr);
  return Math.round(ms / 86400000);
}

export function addDays(s, n) {
  const d = fromDateString(s);
  d.setDate(d.getDate() + n);
  return toDateString(d);
}

/** Every date the rental occupies, inclusive of delivery and pickup days. */
export function occupiedDates(startStr, endStr) {
  const out = [];
  for (let s = startStr; s <= endStr; s = addDays(s, 1)) out.push(s);
  return out;
}

/**
 * Validate a delivery/return pair against all rules.
 * Returns { ok: true } or { ok: false, reason: '...' }.
 */
export function validateRange(startStr, endStr, todayStr) {
  const r = CONFIG.rules;
  if (!startStr || !endStr) return { ok: false, reason: 'Select both a delivery and a return date.' };
  if (!r.allowedDays.includes(dayOfWeek(startStr)))
    return { ok: false, reason: 'Delivery is available Thursday through Sunday only.' };
  if (!r.allowedDays.includes(dayOfWeek(endStr)))
    return { ok: false, reason: 'Pickup is available Thursday through Sunday only.' };
  const days = rentalDays(startStr, endStr);
  if (days < r.minDays) return { ok: false, reason: 'Return date must be after the delivery date.' };
  if (days > r.maxDays) return { ok: false, reason: `Rentals are limited to ${r.maxDays} days.` };
  if (todayStr) {
    const earliest = addDays(todayStr, r.minLeadDays);
    if (startStr < earliest)
      return { ok: false, reason: `Delivery must be booked at least ${r.minLeadDays} days in advance.` };
    if (startStr > addDays(todayStr, r.maxAdvanceDays))
      return { ok: false, reason: 'That date is too far in the future to book online.' };
  }
  return { ok: true, days };
}

// ---------- pricing ----------

function round2(n) {
  return Math.round(n * 100) / 100;
}

/** Machine price for a rental length, from the advertised flat tiers. */
export function machineCost(days) {
  const p = CONFIG.machine.prices;
  return p[Math.min(Math.max(days, 1), CONFIG.rules.maxDays)];
}

/** Attachment price: advertised per-day rate × days, no discount. */
export function attachmentCost(dayRate, days) {
  return round2(dayRate * days);
}

/**
 * Build a full quote.
 * @param {Object} sel
 * @param {boolean} sel.includeMachine  false = attachments-only rental
 * @param {string[]} sel.attachmentKeys
 * @param {string} sel.zoneKey
 * @param {number} days
 */
export function buildQuote(sel, days) {
  const lines = [];
  if (sel.includeMachine) {
    lines.push({
      key: CONFIG.machine.key,
      name: `${CONFIG.machine.name} — ${days} day${days > 1 ? 's' : ''}`,
      amount: machineCost(days),
    });
  }
  for (const key of sel.attachmentKeys || []) {
    const a = CONFIG.attachments.find((x) => x.key === key);
    if (!a) continue;
    if (!sel.includeMachine && !a.standalone) continue;
    lines.push({
      key: a.key,
      name: `${a.name} — ${days} day${days > 1 ? 's' : ''}`,
      amount: attachmentCost(a.dayRate, days),
    });
  }
  const zone = CONFIG.zones.find((z) => z.key === sel.zoneKey);
  if (zone) {
    lines.push({ key: zone.key, name: `Delivery & pickup — ${zone.label}`, amount: zone.fee });
  }
  const total = round2(lines.reduce((s, l) => s + l.amount, 0));
  return { lines, total, days, deposit: CONFIG.deposit.amount };
}

/** Resource keys a selection occupies, for availability checks. */
export function selectedResources(sel) {
  const res = [];
  if (sel.includeMachine) res.push(CONFIG.machine.key);
  for (const key of sel.attachmentKeys || []) {
    if (CONFIG.attachments.some((a) => a.key === key)) res.push(key);
  }
  return res;
}
