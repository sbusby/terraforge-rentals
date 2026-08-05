/**
 * TerraForge Rentals — eCommerce event handlers.
 * Confirms a pending reservation once its checkout becomes a paid order,
 * and releases dates if an order is cancelled.
 */

import wixData from 'wix-data';

const RESERVATIONS = 'Reservations';

async function findByCheckoutId(checkoutId) {
  if (!checkoutId) return null;
  const res = await wixData
    .query(RESERVATIONS)
    .eq('checkoutId', checkoutId)
    .limit(1)
    .find({ suppressAuth: true });
  return res.items[0] || null;
}

async function findByOrderId(orderId) {
  if (!orderId) return null;
  const res = await wixData
    .query(RESERVATIONS)
    .eq('orderId', orderId)
    .limit(1)
    .find({ suppressAuth: true });
  return res.items[0] || null;
}

export async function wixEcom_onOrderCreated(event) {
  try {
    const order = event.entity;
    const reservation = await findByCheckoutId(order.checkoutId);
    if (!reservation) return;
    reservation.status = 'confirmed';
    reservation.orderId = order._id;
    reservation.orderNumber = String(order.number || '');
    reservation.customerEmail =
      (order.buyerInfo && order.buyerInfo.email) || reservation.customerEmail || '';
    await wixData.update(RESERVATIONS, reservation, { suppressAuth: true });
    console.log(`Reservation ${reservation._id} confirmed for order #${reservation.orderNumber}`);
  } catch (err) {
    console.error('onOrderCreated reservation update failed', err);
  }
}

export async function wixEcom_onOrderCanceled(event) {
  try {
    const order = event.entity;
    const reservation =
      (await findByOrderId(order._id)) || (await findByCheckoutId(order.checkoutId));
    if (!reservation) return;
    reservation.status = 'cancelled';
    await wixData.update(RESERVATIONS, reservation, { suppressAuth: true });
    console.log(`Reservation ${reservation._id} cancelled (order #${order.number})`);
  } catch (err) {
    console.error('onOrderCanceled reservation update failed', err);
  }
}
