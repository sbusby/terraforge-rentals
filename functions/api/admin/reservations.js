/**
 * Owner-only reservation tools. Send `Authorization: Bearer <ADMIN_TOKEN>`.
 *
 *   GET  /api/admin/reservations           upcoming (end date today or later)
 *   GET  /api/admin/reservations?all=1     everything
 *   POST /api/admin/reservations
 *        { action: 'add', start, end, resources?, name?, phone?, email?, address?, notes?,
 *          total?, zoneKey?, source?: 'manual' | 'wix-import', force? }
 *        { action: 'cancel', id }
 *
 * Refunds are issued in the Stripe dashboard; cancelling here only frees the dates.
 */

import { addManualReservation, todayStr } from '../../../lib/booking.js';

const json = (body, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

async function authorized(request, env) {
  const token = env.ADMIN_TOKEN;
  const header = request.headers.get('authorization') || '';
  if (!token || token.length < 24 || !header.startsWith('Bearer ')) return false;
  // Compare digests so the check takes the same time whatever was sent.
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(header.slice(7))),
    crypto.subtle.digest('SHA-256', enc.encode(token)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export async function onRequest({ request, env }) {
  if (!(await authorized(request, env))) return json({ ok: false, reason: 'unauthorized' }, 401);

  if (request.method === 'GET') {
    const all = new URL(request.url).searchParams.get('all') === '1';
    const stmt = all
      ? env.DB.prepare(`SELECT * FROM reservations ORDER BY start_date`)
      : env.DB.prepare(
          `SELECT * FROM reservations WHERE end_date >= ?1 AND status IN ('pending', 'confirmed') ORDER BY start_date`
        ).bind(todayStr());
    const { results } = await stmt.all();
    return json({ ok: true, count: results.length, reservations: results });
  }

  if (request.method !== 'POST') return json({ ok: false, reason: 'method not allowed' }, 405);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, reason: 'Invalid JSON body.' }, 400);
  }

  if (body.action === 'add') {
    const result = await addManualReservation(env.DB, body);
    return json(result, result.ok ? 200 : 400);
  }
  if (body.action === 'cancel') {
    const res = await env.DB.prepare(
      `UPDATE reservations SET status = 'cancelled', updated_at = ?2 WHERE id = ?1 AND status != 'cancelled'`
    )
      .bind(String(body.id || ''), new Date().toISOString())
      .run();
    return json({ ok: res.meta.changes > 0, id: body.id });
  }
  return json({ ok: false, reason: `Unknown action "${body.action}".` }, 400);
}
