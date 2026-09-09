/**
 * TerraForge Rentals — public HTTP API for the booking.html embed.
 *
 *   GET  https://www.terraforgellc.com/_functions/rental           -> config + booked dates
 *   POST https://www.terraforgellc.com/_functions/rental  (text/plain JSON body)
 *        { action: 'config' }
 *        { action: 'quote',    sel, start, end }
 *        { action: 'checkout', sel, start, end, agreedToTerms, contact }
 *
 * The embed lives on a different origin (filesusr.com), so every response
 * carries permissive CORS headers. Prices are never trusted from the client.
 */

import { response } from 'wix-http-functions';
import * as svc from 'backend/rentalService';

const CALL_US = 'Please call or text (208) 863-0450 and we will book you by hand.';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};
const JSON_HEADERS = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS };

function json(body, status) {
  return response({ status: status || 200, headers: JSON_HEADERS, body: JSON.stringify(body) });
}

export function options_rental() {
  return response({ status: 204, headers: CORS });
}

export async function get_rental() {
  try {
    return json(await svc.configPayload());
  } catch (err) {
    console.error('get_rental failed', err);
    return json({ ok: false, reason: 'Config unavailable', detail: String(err && err.message) }, 500);
  }
}

export async function post_rental(request) {
  let body = {};
  try {
    const text = await request.body.text();
    body = text ? JSON.parse(text) : {};
  } catch (err) {
    return json({ ok: false, reason: 'Invalid request body.' }, 400);
  }

  try {
    switch (body.action) {
      case 'config':
        return json(await svc.configPayload());
      case 'quote':
        return json(svc.quotePayload(body.sel, body.start, body.end));
      case 'checkout':
        return json(
          await svc.createRentalCheckout(
            body.sel,
            body.start,
            body.end,
            body.agreedToTerms === true,
            body.contact || {}
          )
        );
      default:
        return json({ ok: false, reason: `Unknown action "${body.action}".` }, 400);
    }
  } catch (err) {
    console.error('post_rental failed', body.action, err);
    return json(
      {
        ok: false,
        reason: `Something went wrong on our end. ${CALL_US}`,
        detail: String((err && err.message) || err).slice(0, 300),
      },
      500
    );
  }
}
