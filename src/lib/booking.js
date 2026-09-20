// booking.js — where the assessor sends a student who wants to meet a teacher.
//
// Until 2026-09 that was cal.com. Those bookings never reached the CRM (the
// `api/webhooks/cal-com` receiver has been dead for months), so a student who
// booked from the results screen produced no lead, no appointment, no reminder
// and no Zoom room on our side — the office only saw cal.com's notification
// mail. The booking now happens on our own scheduler,
// `crm.ulpan.co.il/book/ulpan_bayit`, which owns the slots, the OTP, the Zoom
// link, the confirmation and the reminders. See the umbrella plan
// `docs/superpowers/plans/2026-09-18-calcom-to-inhouse-booking-switch.md`.
//
// This module is the ONE place in the repo that names that URL, and it copies
// the pattern `Sites/ulpan-site` shipped on /intro (`src/lib/intro-booking.ts`):
//
//   1. THE VISIT'S OWN utm_* WIN WHOLESALE when it carries any; the page's own
//      triple is the fallback for a visit that carries none. All-or-nothing
//      rather than key-by-key: filling the gaps in a visitor's partial UTMs
//      with ours would report a source/medium pair that never existed, and a
//      fabricated pair is harder to spot in a report than a missing one. The
//      UTMs come from `captureUtm()`'s FIRST-TOUCH store — the same one the
//      `assessments` row is stamped with, so a booking and the assessment that
//      led to it are attributed to the same campaign.
//   2. `gclid` / `fbclid` ARE ALWAYS APPENDED as plain query params when the
//      90-day cookies (set in index.html) hold them, whichever UTMs won. That
//      is the half nothing else can supply: the Google Ads offline-conversion
//      upload matches on `leads.gclid`, and GTM's linker only travels in `_gl`,
//      which nothing on crm.ulpan.co.il decodes.
//   3. `via` names the surface the click came from, so the results-screen
//      modal, the report link and the Tzabar CTA stay tellable apart even
//      though they share a UTM triple.

import { captureUtm, readClickIds } from './utm';

/** The CRM's public booking page for Ulpan Bayit. It renders slots only once
 *  `scheduling_enabled=true` for the `ulpan_bayit` org — until then it says so
 *  itself, which is what makes this link safe to ship ahead of the flip. */
export const CRM_BOOKING_URL = 'https://crm.ulpan.co.il/book/ulpan_bayit';

/** What the link says about itself when the visit carries no campaign of its
 *  own: a direct/organic arrival really did come from the assessor. */
export const ASSESSOR_BOOKING_UTMS = {
  utm_source: 'assessor_site',
  utm_medium: 'results',
  utm_campaign: 'intro_session',
};

/**
 * The booking page's URL for THIS visit, from THIS surface.
 *
 * @param {string} via  the surface: 'genie_modal', 'genie_results',
 *                      'genie_tzabar', 'genie_report'.
 * @param {{utm_medium?: string}} [overrides]  a per-surface fallback medium,
 *                      used only when the visit carries no UTMs of its own.
 */
export function bookingHref(via, overrides = {}) {
  const first = captureUtm();
  const visitor = {};
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
    if (first[k]) visitor[k] = first[k];
  }

  // URLSearchParams keeps insertion order and encodes the values, so a visit
  // with no attribution produces byte-for-byte the URL that shipped.
  const params = new URLSearchParams(
    Object.keys(visitor).length > 0
      ? visitor
      : { ...ASSESSOR_BOOKING_UTMS, ...overrides }
  );

  const { gclid, fbclid } = readClickIds();
  if (gclid) params.set('gclid', gclid);
  if (fbclid) params.set('fbclid', fbclid);
  params.set('via', via);

  return `${CRM_BOOKING_URL}?${params.toString()}`;
}
