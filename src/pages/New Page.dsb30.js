/**
 * TerraForge Rentals — custom booking page ("Book a Rental").
 * Replaces the Wix Bookings widget. See BOOKING_PAGE_SETUP.md for the elements
 * to place on this page. All element access is guarded, so this code is safe
 * even while elements are still missing.
 *
 * Each role accepts BOTH a friendly ID and the editor's default ID, so elements
 * work whether or not they get renamed:
 *   delivery date  #deliveryPicker  (already renamed)
 *   return date    #returnPicker    or #datePicker1
 *   zone           #zoneRadio       or #radioGroup1
 *   attach-only    #attachOnlyCheckbox or #checkbox1   (already added)
 *   forks          #forksCheckbox   or #checkbox2
 *   grapple        #grappleCheckbox or #checkbox3
 *   stump bucket   #stumpCheckbox   or #checkbox4
 *   terms          #termsCheckbox   or #checkbox5
 *   quote text     #quoteText       or #text1
 *   error text     #errorText       or #text2
 *   book button    #bookButton      or #button1
 * IMPORTANT: add the checkboxes in this order — attach-only, forks, grapple,
 * stump, terms — so the default numbering matches.
 */

import wixLocation from 'wix-location';
import {
  CONFIG,
  buildQuote,
  validateRange,
  selectedResources,
  toDateString,
  fromDateString,
  addDays,
} from 'public/rental.js';
import { getUnavailableDates, createRentalCheckout } from 'backend/rentals.web';

let unavailable = {}; // { resourceKey: ['YYYY-MM-DD', ...] }

const IDS = {
  delivery: ['#deliveryPicker', '#datePicker2'],
  return: ['#returnPicker', '#datePicker1'],
  zone: ['#zoneRadio', '#radioGroup1'],
  attachOnly: ['#attachOnlyCheckbox', '#checkbox1'],
  forks: ['#forksCheckbox', '#checkbox2'],
  grapple: ['#grappleCheckbox', '#checkbox3'],
  stump: ['#stumpCheckbox', '#checkbox4'],
  terms: ['#termsCheckbox', '#checkbox5'],
  quote: ['#quoteText', '#text1'],
  error: ['#errorText', '#text2'],
  book: ['#bookButton', '#button1'],
};

function el(role) {
  for (const id of IDS[role]) {
    try {
      const e = $w(id);
      if (e && e.id) return e;
    } catch (err) {
      /* keep trying candidates */
    }
  }
  return null;
}

function currentSelection() {
  const attachOnly = !!(el('attachOnly') && el('attachOnly').checked);
  const attachmentKeys = [];
  if (el('forks') && el('forks').checked) attachmentKeys.push('palletForks');
  if (el('grapple') && el('grapple').checked) attachmentKeys.push('brushGrapple');
  if (el('stump') && el('stump').checked) attachmentKeys.push('stumpBucket');
  const zoneKey = (el('zone') && el('zone').value) || 'zone1';
  return { includeMachine: !attachOnly, attachmentKeys, zoneKey };
}

function selectedDates() {
  const d = el('delivery');
  const r = el('return');
  return {
    start: d && d.value ? toDateString(d.value) : null,
    end: r && r.value ? toDateString(r.value) : null,
  };
}

/** Dates blocked for the CURRENT selection = union of its resources' booked dates. */
function blockedDateStrings() {
  const resources = selectedResources(currentSelection());
  const set = new Set();
  for (const key of resources) for (const s of unavailable[key] || []) set.add(s);
  return set;
}

function showError(msg) {
  const t = el('error');
  if (!t) return;
  if (msg) {
    t.text = msg;
    t.show();
  } else {
    t.hide();
  }
}

function refreshDeliveryPicker() {
  const d = el('delivery');
  if (!d) return;
  const today = toDateString(new Date());
  d.disabledDaysOfWeek = CONFIG.rules.blockedDaysOfWeek;
  d.minDate = fromDateString(addDays(today, CONFIG.rules.minLeadDays));
  d.maxDate = fromDateString(addDays(today, CONFIG.rules.maxAdvanceDays));
  d.disabledDates = [...blockedDateStrings()].map(fromDateString);
}

function refreshReturnPicker() {
  const r = el('return');
  const { start } = selectedDates();
  if (!r) return;
  if (!start) {
    r.disable();
    return;
  }
  r.enable();
  r.disabledDaysOfWeek = CONFIG.rules.blockedDaysOfWeek;
  r.minDate = fromDateString(addDays(start, CONFIG.rules.minDays));

  // Max return: 7 days out, but never past (or across) an already-booked date.
  const blocked = blockedDateStrings();
  let maxEnd = addDays(start, CONFIG.rules.maxDays);
  for (let s = addDays(start, 1); s <= maxEnd; s = addDays(s, 1)) {
    if (blocked.has(s)) {
      maxEnd = addDays(s, -1);
      break;
    }
  }
  r.maxDate = fromDateString(maxEnd);
  if (r.value && toDateString(r.value) > maxEnd) r.value = undefined;
}

function money(n) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function refreshQuote() {
  const t = el('quote');
  if (!t) return;
  const { start, end } = selectedDates();
  const v = validateRange(start, end, toDateString(new Date()));
  if (!v.ok) {
    t.text = start || end ? v.reason : 'Select your delivery and return dates to see pricing.';
    return;
  }
  const sel = currentSelection();
  if (selectedResources(sel).length === 0) {
    t.text = 'Select the machine or at least one attachment.';
    return;
  }
  const q = buildQuote(sel, v.days);
  const lines = q.lines.map((l) => `${l.name}:  ${money(l.amount)}`);
  lines.push('');
  lines.push(`Total due today (plus tax):  ${money(q.total)}`);
  lines.push(`Refundable damage deposit:  ${money(q.deposit)} — ${CONFIG.deposit.note}`);
  t.text = lines.join('\n');
}

function refreshAll() {
  showError(null);
  refreshDeliveryPicker();
  refreshReturnPicker();
  refreshQuote();
}

async function onBookClick() {
  showError(null);
  const btn = el('book');
  const { start, end } = selectedDates();
  const sel = currentSelection();

  const terms = el('terms');
  if (!terms || !terms.checked) {
    showError('Please read and agree to the Rental Terms before booking.');
    return;
  }
  const v = validateRange(start, end, toDateString(new Date()));
  if (!v.ok) {
    showError(v.reason);
    return;
  }

  if (btn) {
    btn.disable();
    btn.label = 'Preparing checkout…';
  }
  try {
    const result = await createRentalCheckout(sel, start, end, true);
    if (result.ok) {
      wixLocation.to(result.checkoutUrl);
    } else {
      showError(result.reason || 'Something went wrong. Please try again.');
    }
  } catch (err) {
    console.error('createRentalCheckout failed', err);
    showError('Something went wrong creating your checkout. Please try again.');
  }
  if (btn) {
    btn.enable();
    btn.label = 'Book Now';
  }
}

$w.onReady(async function () {
  // Populate delivery-zone options from config so prices only live in one place.
  const zone = el('zone');
  if (zone) {
    zone.options = CONFIG.zones.map((z) => ({
      label: `${z.label} — ${money(z.fee)} delivery & pickup`,
      value: z.key,
    }));
    if (!zone.value) zone.value = 'zone1';
  }

  const ret = el('return');
  if (ret) ret.disable();

  for (const role of ['delivery', 'return', 'zone', 'attachOnly', 'forks', 'grapple', 'stump']) {
    const e = el(role);
    if (e && e.onChange) e.onChange(() => refreshAll());
  }
  const btn = el('book');
  if (btn) btn.onClick(onBookClick);

  refreshAll(); // usable immediately; availability shading arrives just after

  try {
    unavailable = await getUnavailableDates();
  } catch (err) {
    console.error('getUnavailableDates failed', err);
    unavailable = {};
  }
  refreshAll();
});
