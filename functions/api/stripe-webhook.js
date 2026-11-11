/**
 * Stripe webhook: replaces the Wix order events in src/backend/events.js.
 * Point a Stripe webhook endpoint at https://www.terraforgellc.com/api/stripe-webhook
 * with these events:
 *   checkout.session.completed
 *   checkout.session.async_payment_succeeded
 *   checkout.session.async_payment_failed
 *   checkout.session.expired
 */

import { verifyWebhook } from '../../lib/stripe.js';
import { confirmFromSession, releaseFromSession } from '../../lib/booking.js';

export async function onRequestPost({ request, env }) {
  const raw = await request.text();
  let event;
  try {
    event = await verifyWebhook(raw, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.warn('stripe webhook rejected:', err.message);
    return new Response('bad signature', { status: 400 });
  }

  const session = event.data && event.data.object;
  let result = { ignored: event.type };
  switch (event.type) {
    case 'checkout.session.completed':
      // Card payments arrive paid; bank debits arrive 'unpaid' and settle later.
      if (session.payment_status === 'paid') result = await confirmFromSession(env.DB, session);
      break;
    case 'checkout.session.async_payment_succeeded':
      result = await confirmFromSession(env.DB, session);
      break;
    case 'checkout.session.async_payment_failed':
    case 'checkout.session.expired':
      result = await releaseFromSession(env.DB, session);
      break;
  }
  console.log('stripe webhook', event.type, JSON.stringify(result));
  return new Response(JSON.stringify({ received: true, ...result }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
