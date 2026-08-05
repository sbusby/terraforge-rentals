/**
 * TerraForge Rentals — single source of truth for pricing & booking rules.
 * Edit numbers here; both the booking page and the backend import this file.
 *
 * NOTE ON PRICES: dayRate + zone fees were derived from the old Bookings app
 * prices ($725 / $850 / $1,000 for one day incl. delivery). Adjust as needed.
 */

export const TERMS_VERSION = '2026-08-05';

export const CONFIG = {
  machine: {
    key: 'bobcatT64',
    name: 'Bobcat T64 Skid Steer',
    dayRate: 600, // rental only, delivery priced separately below
    // standard dirt bucket is included with the machine and is not rentable alone
  },

  // One-time fee per rental. Covers BOTH drop-off and pickup.
  zones: [
    { key: 'zone1', label: 'Zone 1 (0–20 mi)', fee: 125 },
    { key: 'zone2', label: 'Zone 2 (21–35 mi)', fee: 250 },
    { key: 'zone3', label: 'Zone 3 (36–50 mi)', fee: 400 },
  ],

  // Attachments are priced per day and get the same multi-day discount as the
  // machine. standalone:true means it can be rented without the machine.
  attachments: [
    { key: 'palletForks', name: 'Pallet Forks', dayRate: 75, standalone: true },
    { key: 'brushGrapple', name: 'Brush Grapple', dayRate: 110, standalone: true },
    { key: 'stumpBucket', name: 'Stump Bucket', dayRate: 95, standalone: true }, // TODO: confirm price
  ],

  multiDay: {
    // Day 1 at full rate, each additional day at this multiplier (15% off).
    additionalDayMultiplier: 0.85,
    // A full week costs this many day-rates (7 days for the price of 5).
    weeklyMultiplier: 5,
  },

  deposit: {
    amount: 500,
    note: 'Refundable damage deposit — collected at delivery (card, cash, or check), refunded after equipment inspection on return. Not charged online today.',
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

/** Multi-day cost for any per-day rate: day 1 full, extra days discounted, week flat. */
export function multiDayCost(dayRate, days) {
  const m = CONFIG.multiDay;
  if (days >= 7) return round2(dayRate * m.weeklyMultiplier);
  if (days <= 1) return round2(dayRate);
  return round2(dayRate + dayRate * m.additionalDayMultiplier * (days - 1));
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
      amount: multiDayCost(CONFIG.machine.dayRate, days),
    });
  }
  for (const key of sel.attachmentKeys || []) {
    const a = CONFIG.attachments.find((x) => x.key === key);
    if (!a) continue;
    if (!sel.includeMachine && !a.standalone) continue;
    lines.push({
      key: a.key,
      name: `${a.name} — ${days} day${days > 1 ? 's' : ''}`,
      amount: multiDayCost(a.dayRate, days),
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
