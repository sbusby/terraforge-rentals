/**
 * TerraForge Rentals — booking service on Cloudflare (D1 + Stripe Checkout).
 * Port of src/backend/rentalService.js: same rules, same API responses, with
 * the Wix CMS swapped for a D1 table and Wix eCom checkout for Stripe.
 *
 * Pricing and date rules still come from src/public/rental.js, so there is
 * one source of truth for both the old and new site until cutover.
 */

import {
  CONFIG,
  TERMS_VERSION,
  buildQuote,
  validateRange,
  occupiedDates,
  selectedResources,
} from '../src/public/rental.js';
import { createCheckoutSession } from './stripe.js';

// Unpaid checkouts hold their dates this long. Stripe sessions expire after
// STRIPE_SESSION_MIN, so a customer can never pay after their hold lapses.
export const PENDING_HOLD_MIN = 65;
const STRIPE_SESSION_MIN = 60;
const BUSINESS_TZ = 'America/New_York';

export const CALL_US = 'Please call or text (208) 863-0450 and we will book you by hand.';

/** Today's date where the business is, as YYYY-MM-DD. */
export function todayStr(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

const nowIso = () => new Date().toISOString();

function parseResources(r) {
  try {
    const v = JSON.parse(r.resources || '[]');
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** Confirmed, or pending and still inside its hold window. */
export async function activeReservations(db, today = todayStr()) {
  const cutoff = new Date(Date.now() - PENDING_HOLD_MIN * 60 * 1000).toISOString();
  const { results } = await db
    .prepare(
      `SELECT * FROM reservations
        WHERE end_date >= ?1
          AND (status = 'confirmed' OR (status = 'pending' AND created_at >= ?2))`
    )
    .bind(today, cutoff)
    .all();
  return results;
}

export async function unavailableDates(db) {
  const map = {};
  for (const r of await activeReservations(db)) {
    const dates = occupiedDates(r.start_date, r.end_date);
    for (const key of parseResources(r)) (map[key] ||= []).push(...dates);
  }
  for (const key of Object.keys(map)) map[key] = [...new Set(map[key])].sort();
  return map;
}

export function conflicts(items, startStr, endStr, resources) {
  return items.filter(
    (r) =>
      r.start_date <= endStr &&
      r.end_date >= startStr &&
      parseResources(r).some((k) => resources.includes(k))
  );
}

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

export async function configPayload(db) {
  let unavailable = {};
  try {
    unavailable = await unavailableDates(db);
  } catch (err) {
    // A database hiccup must not take the booking page down.
    console.error('unavailableDates failed', err);
  }
  return {
    ok: true,
    today: todayStr(),
    termsVersion: TERMS_VERSION,
    config: publicConfig(),
    unavailable,
  };
}

export function normalizeSel(sel) {
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

export function clean(s, max) {
  return String(s == null ? '' : s)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function cleanContact(contact) {
  contact = contact || {};
  return {
    name: clean(contact.name, 120),
    email: clean(contact.email, 200).toLowerCase(),
    phone: clean(contact.phone, 40),
    address: clean(contact.address, 300),
    notes: clean(contact.notes, 1000),
  };
}

function stripeParams(env, { id, quote, startStr, endStr, days, resources, contact, origin }) {
  const period = `Delivery ${startStr} — Pickup ${endStr}`;
  const taxRate = env.STRIPE_TAX_RATE_ID;
  const autoTax = env.STRIPE_AUTOMATIC_TAX === 'true';
  const params = {
    mode: 'payment',
    client_reference_id: id,
    success_url: `${origin}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/book-a-rental`,
    expires_at: Math.floor(Date.now() / 1000) + STRIPE_SESSION_MIN * 60,
    line_items: quote.lines.map((l) => ({
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(l.amount * 100),
        product_data: { name: l.name, description: period },
        // Advertised prices are before tax; Stripe Tax adds tax on top.
        ...(autoTax ? { tax_behavior: 'exclusive' } : {}),
      },
      ...(taxRate ? { tax_rates: [taxRate] } : {}),
    })),
    metadata: {
      reservation_id: id,
      start: startStr,
      end: endStr,
      resources: resources.join(','),
      name: contact.name,
      phone: contact.phone,
      job_site: contact.address.slice(0, 450),
    },
    payment_intent_data: {
      description: [
        `TerraForge rental ${period} (${days} day${days > 1 ? 's' : ''})`,
        contact.name && `Name: ${contact.name}`,
        contact.phone && `Phone: ${contact.phone}`,
        contact.address && `Job site: ${contact.address}`,
        contact.notes && `Notes: ${contact.notes}`,
        `Deposit $${CONFIG.deposit.amount} due at delivery.`,
      ]
        .filter(Boolean)
        .join(' | ')
        .slice(0, 1000),
      metadata: { reservation_id: id },
    },
  };
  if (contact.email) params.customer_email = contact.email;
  if (autoTax) {
    params.automatic_tax = { enabled: true };
    params.billing_address_collection = 'required';
    // Rental tax follows where the machine is used, so ask for the job site
    // address. Stripe Tax uses it over the billing address when present.
    params.shipping_address_collection = { allowed_countries: ['US'] };
    params.custom_text = {
      shipping_address: { message: 'Enter the job site address where we deliver the machine.' },
    };
  }
  return params;
}

/**
 * Validate, hold the dates, and open a Stripe Checkout session.
 * Returns { ok: true, checkoutUrl, reservationId } or { ok: false, reason }.
 */
export async function createRentalCheckout(env, origin, body) {
  const db = env.DB;
  const sel = normalizeSel(body.sel);
  const startStr = body.start;
  const endStr = body.end;
  if (body.agreedToTerms !== true) {
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
  const contact = cleanContact(body.contact);
  if (contact.email && !EMAIL_RE.test(contact.email)) {
    return { ok: false, reason: 'That email address does not look right.' };
  }

  const taken = { ok: false, reason: 'Sorry — part of that date range was just booked. Please pick different dates.' };
  let existing;
  try {
    existing = await activeReservations(db);
  } catch (err) {
    console.error('activeReservations failed during checkout', err);
    return { ok: false, reason: `Our reservation calendar is unavailable right now. ${CALL_US}` };
  }
  if (conflicts(existing, startStr, endStr, resources).length) return taken;

  const quote = buildQuote(sel, v.days);
  const id = crypto.randomUUID();
  const createdAt = nowIso();
  await db
    .prepare(
      `INSERT INTO reservations
         (id, created_at, updated_at, status, source, start_date, end_date, resources, zone_key,
          total, terms_version, agreed_at, customer_name, customer_email, customer_phone,
          site_address, notes)
       VALUES (?1, ?2, ?2, 'pending', 'online', ?3, ?4, ?5, ?6, ?7, ?8, ?2, ?9, ?10, ?11, ?12, ?13)`
    )
    .bind(
      id, createdAt, startStr, endStr, JSON.stringify(resources), sel.zoneKey, quote.total,
      TERMS_VERSION, contact.name, contact.email, contact.phone, contact.address, contact.notes
    )
    .run();

  // Two people racing for the same dates: whoever inserted first keeps them.
  const rivals = conflicts(await activeReservations(db), startStr, endStr, resources).filter(
    (r) => r.id !== id && (r.created_at < createdAt || (r.created_at === createdAt && r.id < id))
  );
  if (rivals.length) {
    await db.prepare(`DELETE FROM reservations WHERE id = ?1`).bind(id).run();
    return taken;
  }

  let session;
  try {
    session = await createCheckoutSession(
      env,
      stripeParams(env, { id, quote, startStr, endStr, days: v.days, resources, contact, origin }),
      id
    );
  } catch (err) {
    console.error('createCheckoutSession failed', err);
    await db.prepare(`DELETE FROM reservations WHERE id = ?1`).bind(id).run();
    return { ok: false, reason: `We could not start your checkout. ${CALL_US}` };
  }

  await db
    .prepare(`UPDATE reservations SET stripe_session_id = ?2, updated_at = ?3 WHERE id = ?1`)
    .bind(id, session.id, nowIso())
    .run();

  return { ok: true, checkoutUrl: session.url, reservationId: id };
}

/** Stripe says the session is paid: lock in the dates. Idempotent. */
export async function confirmFromSession(db, session) {
  const id = (session.metadata && session.metadata.reservation_id) || session.client_reference_id;
  if (!id) return { updated: false, reason: 'no reservation id on session' };
  const email = (session.customer_details && session.customer_details.email) || null;
  const res = await db
    .prepare(
      `UPDATE reservations
          SET status = 'confirmed',
              stripe_session_id = COALESCE(stripe_session_id, ?2),
              stripe_payment_intent = ?3,
              amount_paid_cents = ?4,
              customer_email = COALESCE(NULLIF(customer_email, ''), ?5),
              updated_at = ?6
        WHERE id = ?1 AND status IN ('pending', 'expired')`
    )
    .bind(id, session.id, session.payment_intent || null, session.amount_total ?? null, email, nowIso())
    .run();
  return { updated: res.meta.changes > 0, id };
}

/** Session expired or async payment failed: release the hold. */
export async function releaseFromSession(db, session) {
  const id = (session.metadata && session.metadata.reservation_id) || session.client_reference_id;
  if (!id) return { updated: false };
  const res = await db
    .prepare(
      `UPDATE reservations SET status = 'expired', updated_at = ?2
        WHERE id = ?1 AND status = 'pending'`
    )
    .bind(id, nowIso())
    .run();
  return { updated: res.meta.changes > 0, id };
}

/** Owner-entered booking (phone order, maintenance block, Wix import). */
export async function addManualReservation(db, body) {
  const startStr = body.start;
  const endStr = body.end;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startStr || '') || !/^\d{4}-\d{2}-\d{2}$/.test(endStr || '') || endStr < startStr) {
    return { ok: false, reason: 'start and end must be YYYY-MM-DD with end >= start.' };
  }
  const known = [CONFIG.machine.key, ...CONFIG.attachments.map((a) => a.key)];
  const resources = Array.isArray(body.resources) && body.resources.length ? body.resources.map(String) : [CONFIG.machine.key];
  const unknown = resources.filter((r) => !known.includes(r));
  if (unknown.length) return { ok: false, reason: `Unknown resources: ${unknown.join(', ')}. Use: ${known.join(', ')}` };

  const clash = conflicts(await activeReservations(db, '0000-00-00'), startStr, endStr, resources);
  if (clash.length && body.force !== true) {
    return { ok: false, reason: 'Overlaps an existing reservation (pass "force": true to add anyway).', conflicts: clash.map((r) => r.id) };
  }
  const contact = cleanContact(body);
  const id = crypto.randomUUID();
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO reservations
         (id, created_at, updated_at, status, source, start_date, end_date, resources, zone_key, total,
          customer_name, customer_email, customer_phone, site_address, notes)
       VALUES (?1, ?2, ?2, 'confirmed', ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)`
    )
    .bind(
      id, now, body.source === 'wix-import' ? 'wix-import' : 'manual', startStr, endStr,
      JSON.stringify(resources), clean(body.zoneKey, 20) || null, Number(body.total) || null,
      contact.name, contact.email, contact.phone, contact.address, contact.notes
    )
    .run();
  return { ok: true, id };
}
