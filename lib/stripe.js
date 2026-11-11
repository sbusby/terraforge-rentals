/**
 * Minimal Stripe client for Workers: Checkout Session creation and webhook
 * signature checks, using fetch + Web Crypto (no SDK).
 */

const DEFAULT_API = 'https://api.stripe.com';

/** Flatten nested params into Stripe's form encoding (a[b][0][c]=v). */
export function formEncode(obj, prefix, out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object') formEncode(v, key, out);
    else out.append(key, String(v));
  }
  return out;
}

export async function createCheckoutSession(env, params, idempotencyKey) {
  if (!env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not set');
  const res = await fetch(`${env.STRIPE_API_BASE || DEFAULT_API}/v1/checkout/sessions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: formEncode(params).toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data.error && data.error.message) || `HTTP ${res.status}`;
    throw new Error(`Stripe: ${msg}`);
  }
  return data;
}

function hex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hmacHex(secret, message) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  return hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
}

/**
 * Verify a Stripe-Signature header against the raw body.
 * Returns the parsed event, or throws.
 */
export async function verifyWebhook(rawBody, header, secret, toleranceSec = 300, nowSec) {
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not set');
  if (!header) throw new Error('missing Stripe-Signature header');
  const parts = header.split(',').map((p) => p.trim().split('='));
  const t = (parts.find(([k]) => k === 't') || [])[1];
  const sigs = parts.filter(([k]) => k === 'v1').map(([, v]) => v);
  if (!t || sigs.length === 0) throw new Error('malformed Stripe-Signature header');
  const now = nowSec ?? Math.floor(Date.now() / 1000);
  if (Math.abs(now - Number(t)) > toleranceSec) throw new Error('webhook timestamp outside tolerance');
  const expected = await hmacHex(secret, `${t}.${rawBody}`);
  if (!sigs.some((s) => timingSafeEqual(s, expected))) throw new Error('webhook signature mismatch');
  return JSON.parse(rawBody);
}
