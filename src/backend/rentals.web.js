/**
 * TerraForge Rentals — web methods for the custom booking flow (page code).
 * All logic lives in rentalService.js so the HTTP API shares it.
 */

import { Permissions, webMethod } from 'wix-web-module';
import * as svc from 'backend/rentalService';

const CALL_US = 'Please call or text (208) 863-0450 and we will book you by hand.';

/** Dates each resource is unavailable, as { resourceKey: ['YYYY-MM-DD', ...] }. */
export const getUnavailableDates = webMethod(Permissions.Anyone, () => svc.unavailableDates());

/** Full widget config (prices, rules, booked dates). */
export const getBookingConfig = webMethod(Permissions.Anyone, () => svc.configPayload());

/** Server-side quote so displayed and charged prices always match. */
export const getQuote = webMethod(Permissions.Anyone, (sel, startStr, endStr) =>
  svc.quotePayload(sel, startStr, endStr)
);

/**
 * Validate + reserve + create a Wix eCommerce checkout.
 * Returns { ok, checkoutUrl } or { ok: false, reason }.
 */
export const createRentalCheckout = webMethod(
  Permissions.Anyone,
  async (sel, startStr, endStr, agreedToTerms, contact) => {
    try {
      return await svc.createRentalCheckout(sel, startStr, endStr, agreedToTerms, contact);
    } catch (err) {
      console.error('createRentalCheckout failed', err);
      return {
        ok: false,
        reason: `Something went wrong creating your checkout. ${CALL_US}`,
        detail: String((err && err.message) || err).slice(0, 300),
      };
    }
  }
);
