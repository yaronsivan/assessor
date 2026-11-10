// The optional "text me" agreement box on the Survey's email step. It is shown
// only to visitors whose phone looks like a US or Canada number, and when
// ticked the CRM post carries `smsConsent: true`.
//
// This is the ONE place in our sites where a `+1` prefix decides anything, and
// it is deliberate: the resolver (./phone-resolve.ts) is loaded only on submit,
// so at render time we cannot place the number by its country. A cheap look at
// the dial-code choice and the typed digits is enough here because the box is
// harmless when shown to a Caribbean `+1` number, and the CRM is the real test:
// it stores agreement only when the saved number reads as US or CA.

export const SMS_CONSENT_TEXT =
  'Text me about my inquiry and classes. Message frequency varies. Message and data rates may apply. Reply STOP to opt out, HELP for help.';
export const SMS_CONSENT_PRIVACY_URL = 'https://ulpan.co.il/privacy';
export const SMS_CONSENT_TERMS_URL = 'https://ulpan.co.il/terms';

const MIN_DIGITS = 7;

/**
 * @param {string} dialCode  the select's resolved value ('+1', '+972', …)
 * @param {string} raw       the phone field's text
 * @returns {boolean}
 */
export function looksLikeNorthAmericaPhone(dialCode, raw) {
  const cleaned = String(raw ?? '').replace(/[^\d+]/g, '');
  const digits = cleaned.replace(/\D/g, '');
  if (digits.length < MIN_DIGITS) return false;
  // A typed country code beats the select.
  const typedCode = cleaned.startsWith('+') || cleaned.startsWith('00');
  if (dialCode === '+1' && !typedCode) return true;
  return cleaned.startsWith('+1') || cleaned.startsWith('001');
}

/**
 * The field to spread into the CRM post: present only when the box is shown
 * and ticked.
 * @returns {{ smsConsent: true } | {}}
 */
export function smsConsentField(dialCode, raw, ticked) {
  return ticked === true && looksLikeNorthAmericaPhone(dialCode, raw) ? { smsConsent: true } : {};
}
