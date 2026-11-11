/**
 * Booking API for book-a-rental.html (same contract as the old Wix
 * /_functions/rental endpoint).
 *
 *   GET  /api/rental                          -> config + booked dates
 *   POST /api/rental  (JSON body, any content type)
 *        { action: 'config' }
 *        { action: 'quote',    sel, start, end }
 *        { action: 'checkout', sel, start, end, agreedToTerms, contact }
 *
 * Prices are never trusted from the client.
 */

import * as svc from '../../lib/booking.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export async function onRequestGet({ env }) {
  return json(await svc.configPayload(env.DB));
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    const text = await request.text();
    body = text ? JSON.parse(text) : {};
  } catch {
    return json({ ok: false, reason: 'Invalid request body.' }, 400);
  }

  try {
    switch (body.action) {
      case 'config':
        return json(await svc.configPayload(env.DB));
      case 'quote':
        return json(svc.quotePayload(body.sel, body.start, body.end));
      case 'checkout':
        return json(await svc.createRentalCheckout(env, new URL(request.url).origin, body));
      default:
        return json({ ok: false, reason: `Unknown action "${body.action}".` }, 400);
    }
  } catch (err) {
    console.error('rental API failed', body.action, err);
    return json({ ok: false, reason: `Something went wrong on our end. ${svc.CALL_US}` }, 500);
  }
}
