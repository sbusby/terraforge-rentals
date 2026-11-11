#!/usr/bin/env node
/**
 * Configures the Stripe account for the Cloudflare site, using the secret key
 * in .dev.vars (never printed). Test mode by default; refuses live keys unless
 * --live is passed.
 *
 *   npm run setup:stripe                 read-only: show current settings + rental tax codes
 *   npm run setup:stripe -- --apply \
 *     --tax-code txcd_... \
 *     --address "123 Main St|Alexandria|VA|22310"
 *                                        set Stripe Tax defaults + head office,
 *                                        add a Virginia registration,
 *                                        create the webhook and save its secret to .dev.vars
 *
 * Options: --webhook-url URL (default https://terraforge-rentals.pages.dev/api/stripe-webhook)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { formEncode } from '../lib/stripe.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VARS = join(ROOT, '.dev.vars');
const EVENTS = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
  'checkout.session.expired',
];

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

function readVars() {
  let text = '';
  try {
    text = readFileSync(VARS, 'utf8');
  } catch {
    fail('.dev.vars not found. Run: cp .dev.vars.example .dev.vars');
  }
  const vars = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) vars[m[1]] = m[2].trim();
  }
  return { text, vars };
}

function setVar(name, value) {
  const { text } = readVars();
  const lines = text.split('\n').filter((l) => !l.startsWith(`${name}=`));
  while (lines.length && lines[lines.length - 1] === '') lines.pop();
  lines.push(`${name}=${value}`, '');
  writeFileSync(VARS, lines.join('\n'));
}

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

const { vars } = readVars();
const KEY = vars.STRIPE_SECRET_KEY || '';
if (!/^sk_(test|live)_[A-Za-z0-9]{20,}$/.test(KEY)) {
  fail('Put your Stripe secret key in .dev.vars as STRIPE_SECRET_KEY=sk_test_...');
}
const LIVE = KEY.startsWith('sk_live_');
if (LIVE && !flag('--live')) fail('That is a LIVE key. Re-run with --live if you mean it.');
console.log(`Stripe ${LIVE ? 'LIVE' : 'test'} mode`);

async function stripe(method, path, params) {
  const url = new URL(`https://api.stripe.com${path}`);
  let body;
  if (params && method === 'GET') formEncode(params).forEach((v, k) => url.searchParams.append(k, v));
  else if (params) body = formEncode(params).toString();
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${KEY}`,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${method} ${path}: ${data.error ? data.error.message : res.status}`);
  return data;
}

async function listAll(path, params = {}) {
  const out = [];
  let starting_after;
  for (let i = 0; i < 20; i++) {
    const page = await stripe('GET', path, { limit: 100, ...params, ...(starting_after ? { starting_after } : {}) });
    out.push(...page.data);
    if (!page.has_more) break;
    starting_after = page.data[page.data.length - 1].id;
  }
  return out;
}

const webhookUrl = opt('--webhook-url') || 'https://terraforge-rentals.pages.dev/api/stripe-webhook';

// ---- read-only report ------------------------------------------------------
const [settings, registrations, hooks, codes] = await Promise.all([
  stripe('GET', '/v1/tax/settings').catch((e) => ({ error: e.message })),
  listAll('/v1/tax/registrations').catch((e) => ({ error: e.message })),
  listAll('/v1/webhook_endpoints'),
  listAll('/v1/tax_codes'),
]);

console.log('\nStripe Tax settings:');
if (settings.error) console.log(`  (could not read: ${settings.error})`);
else {
  console.log(`  status: ${settings.status}`);
  console.log(`  default tax code: ${settings.defaults?.tax_code || '(none)'}`);
  console.log(`  default tax behavior: ${settings.defaults?.tax_behavior || '(none)'}`);
  const a = settings.head_office?.address;
  console.log(`  head office: ${a ? [a.city, a.state, a.postal_code].filter(Boolean).join(', ') : '(none)'}`);
}
console.log('\nTax registrations:');
if (registrations.error) console.log(`  (could not read: ${registrations.error})`);
else if (!registrations.length) console.log('  (none)');
else for (const r of registrations) console.log(`  ${r.country} ${r.country_options?.us?.state || ''} ${r.status}`);

console.log('\nWebhook endpoints:');
if (!hooks.length) console.log('  (none)');
for (const h of hooks) console.log(`  ${h.url} [${h.status}] ${h.enabled_events.join(', ')}`);

const rental = codes.filter((c) => /rent|leas/i.test(`${c.name} ${c.description}`));
console.log('\nTax codes mentioning rental/lease:');
for (const c of rental) console.log(`  ${c.id}  ${c.name}`);

if (!flag('--apply')) {
  console.log('\nRead-only run. Re-run with --apply --tax-code <id> --address "street|city|ST|zip" to configure.');
  process.exit(0);
}

// ---- apply -----------------------------------------------------------------
const taxCode = opt('--tax-code');
const address = opt('--address');
if (!taxCode || !codes.some((c) => c.id === taxCode)) fail('\n--tax-code must be one of the ids listed above.');
const [line1, city, state, postal_code] = (address || '').split('|').map((s) => s && s.trim());
if (!line1 || !city || !/^[A-Z]{2}$/.test(state || '') || !/^\d{5}$/.test(postal_code || '')) {
  fail('\n--address must look like "123 Main St|Alexandria|VA|22310"');
}

console.log('\nApplying...');
await stripe('POST', '/v1/tax/settings', {
  defaults: { tax_code: taxCode, tax_behavior: 'exclusive' },
  head_office: { address: { line1, city, state, postal_code, country: 'US' } },
});
console.log(`  tax settings: default code ${taxCode}, prices exclusive of tax, head office ${city}, ${state}`);

const hasVA = Array.isArray(registrations) &&
  registrations.some((r) => r.country === 'US' && r.country_options?.us?.state === 'VA' && r.status !== 'expired');
if (hasVA) console.log('  Virginia registration: already present');
else {
  await stripe('POST', '/v1/tax/registrations', {
    country: 'US',
    country_options: { us: { state: 'VA', type: 'state_sales_tax' } },
    active_from: 'now',
  });
  console.log('  Virginia registration: added');
}

const existing = hooks.find((h) => h.url === webhookUrl);
if (existing) {
  console.log(`  webhook: already exists for ${webhookUrl} (its secret is only shown at creation;`);
  console.log('           if .dev.vars lacks it, delete the endpoint in Stripe and re-run)');
} else {
  const hook = await stripe('POST', '/v1/webhook_endpoints', {
    url: webhookUrl,
    enabled_events: EVENTS,
    description: 'TerraForge booking confirmations (Cloudflare)',
  });
  setVar('STRIPE_WEBHOOK_SECRET', hook.secret);
  console.log(`  webhook: created for ${webhookUrl}; signing secret saved to .dev.vars`);
}
console.log('\nDone. Customer receipt emails are a dashboard-only setting: Settings → Customer emails → Successful payments.');
