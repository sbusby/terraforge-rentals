import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formEncode, hmacHex, verifyWebhook } from '../lib/stripe.js';
import { conflicts, todayStr, quotePayload } from '../lib/booking.js';
import { isAwayDay } from '../src/public/rental.js';

test('formEncode flattens nested params the way Stripe expects', () => {
  const s = formEncode({
    mode: 'payment',
    line_items: [{ quantity: 1, price_data: { unit_amount: 42500, product_data: { name: 'T64' } } }],
    metadata: { a: 'x', skip: undefined },
  }).toString();
  const p = new URLSearchParams(s);
  assert.equal(p.get('mode'), 'payment');
  assert.equal(p.get('line_items[0][quantity]'), '1');
  assert.equal(p.get('line_items[0][price_data][unit_amount]'), '42500');
  assert.equal(p.get('line_items[0][price_data][product_data][name]'), 'T64');
  assert.equal(p.get('metadata[a]'), 'x');
  assert.equal(p.has('metadata[skip]'), false);
});

test('verifyWebhook accepts a correctly signed payload', async () => {
  const body = JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: 'cs_1' } } });
  const t = 1_800_000_000;
  const sig = await hmacHex('whsec_test', `${t}.${body}`);
  const ev = await verifyWebhook(body, `t=${t},v1=${sig}`, 'whsec_test', 300, t + 10);
  assert.equal(ev.type, 'checkout.session.completed');
});

test('verifyWebhook rejects tampering, wrong secret, and stale timestamps', async () => {
  const body = '{"type":"x"}';
  const t = 1_800_000_000;
  const sig = await hmacHex('whsec_test', `${t}.${body}`);
  await assert.rejects(verifyWebhook('{"type":"y"}', `t=${t},v1=${sig}`, 'whsec_test', 300, t), /mismatch/);
  await assert.rejects(verifyWebhook(body, `t=${t},v1=${sig}`, 'whsec_other', 300, t), /mismatch/);
  await assert.rejects(verifyWebhook(body, `t=${t},v1=${sig}`, 'whsec_test', 300, t + 301), /tolerance/);
  await assert.rejects(verifyWebhook(body, null, 'whsec_test'), /missing/);
});

test('conflicts only flags overlapping dates on the same resource', () => {
  const r = (start_date, end_date, res) => ({ start_date, end_date, resources: JSON.stringify(res) });
  const items = [r('2026-12-03', '2026-12-04', ['bobcatT64']), r('2026-12-10', '2026-12-11', ['palletForks'])];
  assert.equal(conflicts(items, '2026-12-04', '2026-12-05', ['bobcatT64']).length, 1); // shares pickup day
  assert.equal(conflicts(items, '2026-12-05', '2026-12-06', ['bobcatT64']).length, 0);
  assert.equal(conflicts(items, '2026-12-10', '2026-12-11', ['bobcatT64']).length, 0); // different resource
  assert.equal(conflicts(items, '2026-12-10', '2026-12-11', ['palletForks']).length, 1);
});

test('todayStr uses Eastern time, not UTC', () => {
  // 02:00 UTC on Dec 5 is still Dec 4 in Alexandria, VA.
  assert.equal(todayStr(new Date('2026-12-05T02:00:00Z')), '2026-12-04');
});

test('quote prices match the advertised rates', () => {
  // Find a Thursday at least a week out so lead-time rules pass.
  const d = new Date(Date.now() + 7 * 86400000);
  while (d.getUTCDay() !== 4) d.setUTCDate(d.getUTCDate() + 1);
  if (isAwayDay(d.toISOString().slice(0, 10))) d.setUTCDate(d.getUTCDate() + 7); // skip out-of-town weeks
  const start = d.toISOString().slice(0, 10);
  d.setUTCDate(d.getUTCDate() + 2);
  const end = d.toISOString().slice(0, 10); // Saturday: 2 days
  const q = quotePayload({ attachmentKeys: ['palletForks'], zoneKey: 'zone2' }, start, end);
  assert.equal(q.ok, true, q.reason);
  assert.equal(q.quote.total, 750 + 2 * 75 + 400);
});

test('away weeks block Mon-Fri every other week, weekends stay open', async () => {
  const { isHandoffDay, validateRange } = await import('../src/public/rental.js');
  assert.equal(isAwayDay('2026-11-12'), true);   // Thu, away week (anchor week)
  assert.equal(isAwayDay('2026-11-14'), false);  // Sat of that week
  assert.equal(isAwayDay('2026-11-19'), false);  // Thu, home week
  assert.equal(isAwayDay('2026-11-27'), true);   // Fri, away again
  assert.equal(isAwayDay('2026-10-29'), true);   // two weeks before the anchor
  assert.equal(isAwayDay('2026-11-05'), false);  // one week before
  assert.equal(isHandoffDay('2026-11-28'), true);
  assert.equal(validateRange('2026-11-26', '2026-11-28', '2026-11-12').ok, false);
  assert.equal(validateRange('2026-11-21', '2026-11-27', '2026-11-12').ok, false);
  assert.equal(validateRange('2026-11-21', '2026-11-28', '2026-11-12').ok, true); // away week in the middle is fine
});
