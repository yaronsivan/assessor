/**
 * THE phone rule. Every phone number entering the CRM — from a site form, an
 * edge function, a webhook, a staff edit — is read through `resolvePhone`.
 *
 * ## Why this exists (2026-09-27)
 *
 * "No `+` in front ⇒ Israeli ⇒ glue `+972` on" had been hand-written about
 * fifteen times across the CRM, the bot and the sites, and forms glued their
 * dial-code select onto whatever the visitor typed. A German student typing
 * `0049 176 …` was stored as `+972 049 176 …`; an American pasting
 * `+1 818 …` beside a `+972` default became `+972+1 818 …`. Neither can be
 * reached on WhatsApp. Each fix removed one copy and the bug "moved".
 *
 * ## The rule, in order — the first VALID reading wins
 *
 * 1. Clean: drop `whatsapp:`; if a `+` appears after the start, keep only from
 *    the LAST `+` that has digits after it (a form glued its code onto a
 *    number that named its own);
 *    keep digits and `+`; `00` → `+`.
 * 2. A number that names its own country (`+…`) is read as typed. If that is
 *    invalid but has the Israeli mobile shape (`+972 0? 5X` + 8 digits), it is
 *    Israeli (see 3a). Otherwise UNWRAP: drop a leading real calling code plus any zeros after it
 *    and re-read the rest (`+972 0 49 176…` → `+49 176…`). Unwrap runs only on
 *    an invalid number, so no valid number is ever rewritten.
 * 3. No `+`: a non-Israeli `countryHint` (the select the visitor chose) is
 *    tried first, then the Israeli reading, then the Israeli mobile shape
 *    (3a), then the digits as an international number missing its `+`
 *    (`4917…`, `1212…`).
 * 3a. Israeli mobile shape: `05X` + 8 digits (with `0`, `972` or `9720` in
 *    front) is Israeli even when libphonenumber calls the block unallocated —
 *    its metadata lags real allocations (`050-1…`, `054-0…`, `055-1…`), and
 *    refusing a real Israeli lead is worse than the bug this module fixes.
 * 4. Otherwise `{ ok: false }`. NEVER invent a country: a bare 10-digit US
 *    number with no hint also parses as a valid Indian or NZ number, so any
 *    10 digits that are ALSO a valid `+1` number are refused, in steps 2 and 3
 *    alike — the visitor (or the office) has to say which it is.
 *
 * ## Copies
 *
 * Byte-identical at `bot-service/src/lib/phone-resolve.ts`
 * (`phone-e164.sync.test.ts`). Copied, with only the import line changed, into
 * `Sites/foundation-first`, `Sites/ambatia` (src/lib and
 * supabase/functions/_shared) and `Sites/ulpan-genie-assessor/web/src/lib`;
 * `scripts/check-phone-resolve-sync.sh` at the umbrella root fails on drift.
 * Change this file, then copy it everywhere.
 *
 * `phoneLookupVariants` (the spellings a stored row may carry) lives here too,
 * so every lookup — CRM, bot, edge functions — shares one list;
 * `phone-e164.ts` re-exports it.
 */
import { parsePhoneNumberFromString, getCountries, getCountryCallingCode, type CountryCode } from 'libphonenumber-js/max';

export type PhoneResolution =
  | { ok: true; e164: string; via: 'as_typed' | 'unwrapped' | 'country_hint' | 'israeli' | 'international_digits' }
  | { ok: false; reason: 'empty' | 'unresolvable' };

export interface ResolvePhoneOptions {
  /** The country the form's select showed: a dial code (`'+49'`) or ISO code (`'DE'`). A hint, never a prefix. */
  countryHint?: string | null;
}

const ISRAEL: CountryCode = 'IL';
const COUNTRIES = getCountries();
const CALLING_CODES: ReadonlySet<string> = new Set(COUNTRIES.map((c) => String(getCountryCallingCode(c))));

function validE164(value: string, country?: CountryCode): string | null {
  const parsed = country ? parsePhoneNumberFromString(value, country) : parsePhoneNumberFromString(value);
  return parsed && parsed.isValid() ? parsed.number : null;
}

function readHint(hint: string | null | undefined): { iso?: CountryCode; dial?: string } {
  if (!hint) return {};
  const trimmed = hint.trim();
  if (/^[A-Za-z]{2}$/.test(trimmed)) {
    const iso = trimmed.toUpperCase() as CountryCode;
    return COUNTRIES.includes(iso) ? { iso } : {};
  }
  const dial = trimmed.replace(/\D/g, '');
  return dial && CALLING_CODES.has(dial) ? { dial } : {};
}

// libphonenumber's metadata lags Israeli mobile allocations (050-1…, 054-0…);
// 05X + 8 digits is unmistakably Israeli, so accept the shape it rejects.
function israeliMobileShape(value: string): string | null {
  const match = /^(?:\+9720?|0|9720?)(5\d{8})$/.exec(value);
  return match ? `+972${match[1]}` : null;
}

function unwrap(digits: string): string | null {
  for (let len = 1; len <= 3; len++) {
    if (!CALLING_CODES.has(digits.slice(0, len))) continue;
    const rest = digits.slice(len).replace(/^0+/, '');
    if (rest.length < 8) continue;
    // A bare 10-digit US/Canada number also reads as a valid foreign one
    // (`646…` → New Zealand, `914…` → India). Ambiguous: refuse, don't guess.
    if (rest.length === 10 && validE164(`+1${rest}`)) return null;
    const e164 = validE164(`+${rest}`);
    if (e164) return e164;
  }
  return null;
}

export function resolvePhone(raw: string | null | undefined, opts: ResolvePhoneOptions = {}): PhoneResolution {
  let value = String(raw ?? '').trim().replace(/^whatsapp:/i, '');
  // The last `+` that still has a digit after it (a stray trailing `+` is noise).
  const lastPlus = value.lastIndexOf('+', value.search(/\d\D*$/));
  if (lastPlus > 0) value = value.slice(lastPlus);
  value = value.replace(/[^\d+]/g, '');
  if (!/\d/.test(value)) return { ok: false, reason: 'empty' };
  if (value.startsWith('00')) value = `+${value.slice(2)}`;

  if (value.startsWith('+')) {
    const asTyped = validE164(value);
    if (asTyped) return { ok: true, e164: asTyped, via: 'as_typed' };
    const mobile = israeliMobileShape(value);
    if (mobile) return { ok: true, e164: mobile, via: 'israeli' };
    const unwrapped = unwrap(value.slice(1));
    if (unwrapped) return { ok: true, e164: unwrapped, via: 'unwrapped' };
    return { ok: false, reason: 'unresolvable' };
  }

  const hint = readHint(opts.countryHint);
  if (hint.iso && hint.iso !== ISRAEL) {
    const e164 = validE164(value, hint.iso);
    if (e164) return { ok: true, e164, via: 'country_hint' };
  } else if (hint.dial && hint.dial !== '972') {
    const e164 = validE164(`+${hint.dial}${value.replace(/^0+/, '')}`);
    if (e164) return { ok: true, e164, via: 'country_hint' };
  }

  const israeli = validE164(value, ISRAEL);
  if (israeli) return { ok: true, e164: israeli, via: 'israeli' };
  const mobile = israeliMobileShape(value);
  if (mobile) return { ok: true, e164: mobile, via: 'israeli' };

  if (value.length === 10 && validE164(`+1${value}`)) return { ok: false, reason: 'unresolvable' }; // same ambiguity as in unwrap()
  const international = validE164(`+${value}`);
  if (international) return { ok: true, e164: international, via: 'international_digits' };

  return { ok: false, reason: 'unresolvable' };
}

/**
 * Every spelling a lead row might hold for this number, canonical first; `[]`
 * when the number does not resolve.
 *
 * Existing rows still carry the trunk-zero spelling until the data repair runs,
 * and historic imports stored Israeli numbers digits-only or in local `05…`
 * form. A lookup that tries all of them finds the person under whichever
 * spelling they were saved with, so conversations stop splitting even before
 * the backfill lands.
 *
 * Forms also stored numbers with `+972` glued onto a foreign one (`+972 49 …`,
 * `+972 0 49 …`) or onto an Israeli one twice (`+9720972 …`); `resolvePhone`
 * unwraps those, so the glued spellings are listed too. They can go once the
 * phone repair has rewritten those rows.
 *
 * A spelling is kept only if it resolves to nothing or to THIS number. Some
 * are another person's real number: Saint-Pierre `+508551234` glued is
 * `+972508551234` (an Israeli mobile), and Saudi `+966501234567` in local form
 * is `0501234567` (also Israeli). A lookup must never match a different person.
 */
export function phoneLookupVariants(raw: string | null | undefined): string[] {
  const resolved = resolvePhone(raw);
  if (!('e164' in resolved)) return [];
  const canonical = resolved.e164;

  const parsed = parsePhoneNumberFromString(canonical);
  if (!parsed) return [canonical];

  const callingCode = parsed.countryCallingCode;      // e.g. "972"
  const national = parsed.nationalNumber;             // e.g. "542590309"

  const variants = [
    canonical,                                        // +972542590309
    `+${callingCode}0${national}`,                    // +9720542590309  ← the trunk-zero bug
    `${callingCode}${national}`,                      // 972542590309
    `0${national}`,                                   // 0542590309
    // Glued spellings real rows carry until the repair runs (see doc comment).
    ...(callingCode === '972'
      ? [`+9720972${national}`]                       // +9720972542590309
      : [
          `+972${callingCode}${national}`,            // +9724917631682387
          `+9720${callingCode}${national}`,           // +97204917631682387
        ]),
  ];

  const samePersonOrNobody = (v: string): boolean => {
    if (v === canonical) return true;
    const r = resolvePhone(v);
    return !('e164' in r) || r.e164 === canonical;
  };

  return [...new Set(variants.filter(Boolean))].filter(samePersonOrNobody);
}
