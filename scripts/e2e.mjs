#!/usr/bin/env node
/**
 * End-to-end check of the Cloudflare site, fully local:
 * a throwaway D1 database, `wrangler pages dev`, and a fake Stripe API.
 *
 * Run: npm run test:e2e
 */

import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { hmacHex } from '../lib/stripe.js';
import { isAwayDay } from '../src/public/rental.js';

const PORT = Number(process.env.E2E_PORT) || 8811;
const STRIPE_PORT = 12111;
const BASE = `http://127.0.0.1:${PORT}`;
const WHSEC = 'whsec_e2e_test';
const ADMIN = 'e2e-admin-token-0123456789abcdef';

// ---- fake Stripe -----------------------------------------------------------
const sessions = [];
const stripe = createServer((req, res) => {
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    if (req.method === 'POST' && req.url === '/v1/checkout/sessions') {
      const params = new URLSearchParams(body);
      const id = `cs_test_${sessions.length + 1}`;
      sessions.push({ id, params, auth: req.headers.authorization });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id, url: `https://checkout.stripe.test/${id}` }));
    } else {
      res.writeHead(404).end('{}');
    }
  });
});
await new Promise((r) => stripe.listen(STRIPE_PORT, '127.0.0.1', r));

// ---- wrangler ----------------------------------------------------------------
const persist = mkdtempSync(join(tmpdir(), 'tf-e2e-'));
execFileSync('node', ['scripts/build-site.mjs'], { stdio: 'ignore' });
execFileSync(
  'npx',
  ['wrangler', 'd1', 'migrations', 'apply', 'terraforge-reservations', '--local', '--persist-to', persist],
  { stdio: 'ignore', env: { ...process.env, CI: '1' } }
);
const vars = {
  STRIPE_SECRET_KEY: 'sk_test_fake',
  STRIPE_WEBHOOK_SECRET: WHSEC,
  ADMIN_TOKEN: ADMIN,
  STRIPE_API_BASE: `http://127.0.0.1:${STRIPE_PORT}`,
};
const wrangler = spawn(
  'npx',
  ['wrangler', 'pages', 'dev', '--port', String(PORT), '--ip', '127.0.0.1', '--persist-to', persist,
    ...Object.entries(vars).flatMap(([k, v]) => ['--binding', `${k}=${v}`])],
  { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, CI: '1' } }
);
let log = '';
wrangler.stdout.on('data', (d) => (log += d));
wrangler.stderr.on('data', (d) => (log += d));

function cleanup() {
  wrangler.kill();
  stripe.close();
  rmSync(persist, { recursive: true, force: true });
}

async function waitUp() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${BASE}/api/rental`);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`wrangler did not start:\n${log}`);
}

const api = (body) =>
  fetch(`${BASE}/api/rental`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(body) })
    .then((r) => r.json());

const admin = (method, body, qs = '') =>
  fetch(`${BASE}/api/admin/reservations${qs}`, {
    method,
    headers: { Authorization: `Bearer ${ADMIN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  }).then((r) => r.json());

async function webhook(event, secret = WHSEC) {
  const raw = JSON.stringify(event);
  const t = Math.floor(Date.now() / 1000);
  const sig = await hmacHex(secret, `${t}.${raw}`);
  return fetch(`${BASE}/api/stripe-webhook`, {
    method: 'POST',
    headers: { 'Stripe-Signature': `t=${t},v1=${sig}`, 'Content-Type': 'application/json' },
    body: raw,
  });
}

/** Next date >= today+minDays that falls on the given weekday (0=Sun). */
function nextDow(dow, minDays) {
  const d = new Date(Date.now() + minDays * 86400000);
  while (d.getDay() !== dow) d.setDate(d.getDate() + 1);
  return d;
}
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const plus = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

const steps = [];
async function step(name, fn) {
  await fn();
  steps.push(name);
  console.log(`  ✔ ${name}`);
}

try {
  await waitUp();
  let thu = nextDow(4, 7);
  if (isAwayDay(iso(thu))) thu = plus(thu, 7);                    // a Thursday we're in town
  const A = { start: iso(thu), end: iso(plus(thu, 1)) };          // Thu -> Fri
  const B = { start: iso(plus(thu, 9)), end: iso(plus(thu, 10)) }; // Sat -> Sun of the away week
  const sel = { includeMachine: true, attachmentKeys: ['palletForks'], zoneKey: 'zone1' };
  const contact = { name: 'Test Renter', email: 'renter@example.com', phone: '555-0100', address: '1 Main St', notes: '' };
  let resA;

  await step('pages are served without Wix wrappers', async () => {
    for (const path of ['/', '/equipment', '/attachments', '/delivery', '/requirements', '/faq', '/contact', '/terms', '/book-a-rental', '/thank-you']) {
      const r = await fetch(BASE + path);
      assert.equal(r.status, 200, path);
      const html = await r.text();
      assert.ok(!html.includes('static.wixstatic.com'), `${path} still loads Wix images`);
      assert.ok(!html.includes('target="_parent"'), `${path} still targets a parent frame`);
    }
    const img = await fetch(`${BASE}/images/t64-hero.jpg`);
    assert.equal(img.status, 200);
  });

  await step('old Wix URLs redirect', async () => {
    const r = await fetch(`${BASE}/book-online`, { redirect: 'manual' });
    assert.equal(r.status, 301);
    assert.match(r.headers.get('location'), /\/book-a-rental$/);
  });

  await step('GET /api/rental returns config with nothing booked', async () => {
    const d = await (await fetch(`${BASE}/api/rental`)).json();
    assert.equal(d.ok, true);
    assert.equal(d.config.machine.prices[1], 425);
    assert.deepEqual(d.unavailable, {});
  });

  await step('quote matches advertised prices', async () => {
    const d = await api({ action: 'quote', sel, ...A });
    assert.equal(d.ok, true, d.reason);
    assert.equal(d.quote.total, 425 + 75 + 275);
  });

  await step('checkout rejects a Monday delivery and missing terms', async () => {
    const mon = iso(nextDow(1, 7));
    assert.equal((await api({ action: 'checkout', sel, start: mon, end: iso(plus(nextDow(1, 7), 3)), agreedToTerms: true, contact })).ok, false);
    assert.equal((await api({ action: 'checkout', sel, ...A, agreedToTerms: false, contact })).ok, false);
  });

  await step('away-week weekdays are rejected, that weekend is open', async () => {
    const awayThu = iso(plus(thu, 7));
    const d = await api({ action: 'quote', sel, start: awayThu, end: iso(plus(thu, 9)) });
    assert.equal(d.ok, false);
    assert.match(d.reason, /out of town/);
    assert.equal((await api({ action: 'quote', sel, ...B })).ok, true);
  });

  await step('checkout creates a Stripe session with server-side prices', async () => {
    resA = await api({ action: 'checkout', sel: { ...sel, attachmentKeys: ['palletForks', 'bogus'] }, ...A, agreedToTerms: true, contact });
    assert.equal(resA.ok, true, resA.reason);
    assert.equal(resA.checkoutUrl, 'https://checkout.stripe.test/cs_test_1');
    const p = sessions[0].params;
    assert.equal(sessions[0].auth, 'Bearer sk_test_fake');
    assert.equal(p.get('line_items[0][price_data][unit_amount]'), '42500');
    assert.equal(p.get('line_items[1][price_data][unit_amount]'), '7500');
    assert.equal(p.get('line_items[2][price_data][unit_amount]'), '27500');
    assert.equal(p.has('line_items[3][quantity]'), false, 'unknown attachment must be dropped');
    assert.equal(p.get('customer_email'), 'renter@example.com');
    assert.equal(p.get('metadata[reservation_id]'), resA.reservationId);
    assert.match(p.get('success_url'), /\/thank-you\?session_id=\{CHECKOUT_SESSION_ID\}$/);
    // Stripe Tax (wrangler.toml STRIPE_AUTOMATIC_TAX = "true")
    assert.equal(p.get('automatic_tax[enabled]'), 'true');
    assert.equal(p.get('line_items[0][price_data][tax_behavior]'), 'exclusive');
    assert.equal(p.get('shipping_address_collection[allowed_countries][0]'), 'US');
    assert.equal(p.get('billing_address_collection'), 'required');
  });

  await step('pending checkout holds the dates', async () => {
    const d = await (await fetch(`${BASE}/api/rental`)).json();
    assert.deepEqual(d.unavailable.bobcatT64, [A.start, A.end]);
    assert.deepEqual(d.unavailable.palletForks, [A.start, A.end]);
    const again = await api({ action: 'checkout', sel, ...A, agreedToTerms: true, contact });
    assert.equal(again.ok, false);
    assert.match(again.reason, /just booked/);
  });

  await step('webhook with a bad signature is rejected', async () => {
    const r = await webhook({ type: 'checkout.session.completed', data: { object: {} } }, 'whsec_wrong');
    assert.equal(r.status, 400);
  });

  await step('paid webhook confirms the reservation', async () => {
    const r = await webhook({
      type: 'checkout.session.completed',
      data: { object: { id: 'cs_test_1', payment_status: 'paid', payment_intent: 'pi_1', amount_total: 82150,
        metadata: { reservation_id: resA.reservationId }, customer_details: { email: 'renter@example.com' } } },
    });
    assert.equal(r.status, 200);
    assert.equal((await r.json()).updated, true);
    const list = await admin('GET');
    const row = list.reservations.find((x) => x.id === resA.reservationId);
    assert.equal(row.status, 'confirmed');
    assert.equal(row.amount_paid_cents, 82150);
    assert.equal(row.stripe_payment_intent, 'pi_1');
  });

  await step('expired session releases its hold', async () => {
    const b = await api({ action: 'checkout', sel, ...B, agreedToTerms: true, contact });
    assert.equal(b.ok, true, b.reason);
    await webhook({ type: 'checkout.session.expired', data: { object: { id: 'cs_test_2', metadata: { reservation_id: b.reservationId } } } });
    const d = await (await fetch(`${BASE}/api/rental`)).json();
    assert.ok(!d.unavailable.bobcatT64.includes(B.start), 'expired hold should free the dates');
  });

  await step('admin API needs the token', async () => {
    const r = await fetch(`${BASE}/api/admin/reservations`, { headers: { Authorization: 'Bearer nope' } });
    assert.equal(r.status, 401);
  });

  await step('admin can add a phone booking and cancel it', async () => {
    const add = await admin('POST', { action: 'add', start: B.start, end: B.end, name: 'Phone customer', source: 'wix-import' });
    assert.equal(add.ok, true, add.reason);
    const clash = await admin('POST', { action: 'add', start: B.start, end: B.end });
    assert.equal(clash.ok, false);
    let d = await (await fetch(`${BASE}/api/rental`)).json();
    assert.ok(d.unavailable.bobcatT64.includes(B.start));
    assert.equal((await admin('POST', { action: 'cancel', id: add.id })).ok, true);
    d = await (await fetch(`${BASE}/api/rental`)).json();
    assert.ok(!d.unavailable.bobcatT64.includes(B.start));
  });

  console.log(`\nAll ${steps.length} end-to-end checks passed.`);
} catch (err) {
  console.error('\nE2E FAILED:', err.message);
  if (process.env.E2E_VERBOSE) console.error(log);
  process.exitCode = 1;
} finally {
  cleanup();
}
