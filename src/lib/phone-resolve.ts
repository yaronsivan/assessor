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
 * 1. Clean: Arabic-Indic, Persian and full-width digits → ASCII; drop bidi
 *    marks and `whatsapp:`; if a `+` appears after the start, keep only from
 *    the LAST `+` that has digits after it (a form glued its code onto a
 *    number that named its own);
 *    keep digits and `+`; `00` → `+`.
 * 2. A number that names its own country (`+…`) is read as typed. If that is
 *    invalid but has the Israeli mobile shape (`+972 0? 5X` + 8 digits), it is
 *    Israeli (see 3a). Otherwise UNWRAP — but only the glue forms actually
 *    produced, never an arbitrary leading code (see `unwrap`):
 *    - `+972` (plus zeros) glued on a foreign number: `+972 0 49 176…` →
 *      `+49 176…`, only when what follows `972` is ≥ 11 digits (an Israeli
 *      number leaves 8–9, so its typos stay refused);
 *    - a foreign code glued on an Israeli MOBILE: `+1 972 54…` → `+972 54…`.
 *    Unwrap runs only on an invalid number, so no valid number is ever
 *    rewritten; anything else invalid is refused.
 * 3. No `+`: a non-Israeli `countryHint` (the select the visitor chose) is
 *    tried first — a dial code is read with each country that uses it, so a
 *    meaningful leading 0 (Italy) survives. If that reading is valid but the
 *    digits are ALSO an Israeli mobile (`054…` + France), the result is
 *    `{ ok: false, reason: 'ambiguous' }`. Then the Israeli reading, then the
 *    Israeli mobile shape (3a), then the digits as an international number
 *    missing its `+` (`4917…`, `1212…`).
 * 3a. Israeli mobile shape: `05X` + 8 digits (with `0`, `972` or `9720` in
 *    front) is Israeli even when libphonenumber calls the block unallocated —
 *    its metadata lags real allocations (`050-1…`, `054-0…`, `055-1…`), and
 *    refusing a real Israeli lead is worse than the bug this module fixes.
 *    With an EXPLICIT Israel hint (`+972` / `972` / `IL`) a bare `5X` + 7
 *    digits (the 0 left off beside the select) is Israeli too; with no hint
 *    that shape is refused — it is also a Saudi mobile.
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
  | { ok: false; reason: 'empty' | 'unresolvable' | 'ambiguous' };

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

// Other scripts' digits (Arabic-Indic U+0660–0669, Extended/Persian
// U+06F0–06F9, full-width U+FF10–FF19) → ASCII, full-width `＋` → `+`; bidi and
// format marks and NBSP are dropped. Keyboards in RTL locales produce all of these.
const DIGIT_BLOCKS = [0x0660, 0x06f0, 0xff10];
function toAsciiDigits(value: string): string {
  return value
    .replace(/[\u0660-\u0669\u06F0-\u06F9\uFF10-\uFF19]/g, (ch) => {
      const code = ch.charCodeAt(0);
      const base = DIGIT_BLOCKS.find((b) => code >= b && code <= b + 9)!;
      return String(code - base);
    })
    .replace(/\uFF0B/g, '+')
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069\u00A0]/g, '');
}

/** The input with only `whatsapp:` and punctuation removed: digits and a leading `+`. */
function cleanSpelling(raw: string | null | undefined): string {
  const value = toAsciiDigits(String(raw ?? '')).trim().replace(/^whatsapp:/i, '');
  const digits = value.replace(/\D/g, '');
  if (!digits) return '';
  return value.replace(/[^\d+]/g, '').startsWith('+') ? `+${digits}` : digits;
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

/**
 * Undo the two glue forms forms actually produced, and nothing else. `digits`
 * is an invalid `+` number without its `+`.
 *
 * Until 2026-09-28 this stripped ANY leading 1–3-digit calling code, which
 * turned numbers that are merely outside libphonenumber's metadata into other
 * people: Twilio delivers Mexican mobiles as `+521…`, and `+52 1 812…` became
 * the US number `+1 812…`; `+49 147…` became US, `+386 49…` German, and one
 * mistyped digit on an Israeli number became Cuba or Denmark.
 */
function unwrap(digits: string): string | null {
  // (a) `+972` (and any zeros) glued on a foreign number: `+972 0 49 176…`.
  //     An Israeli number leaves 8–9 digits after `972` and the zeros, so a
  //     one-digit typo of one leaves ≤ 10; glued numbers leave ≥ 11.
  if (digits.startsWith('972')) {
    const rest = digits.slice(3).replace(/^0+/, '');
    if (rest.length < 11) return null;
    // A bare 10-digit US/Canada number also reads as a valid foreign one
    // (`646…` → New Zealand, `914…` → India). Ambiguous: refuse, don't guess.
    // (Unreachable under the ≥ 11 floor; kept so lowering it can't bring the guess back.)
    if (rest.length === 10 && validE164(`+1${rest}`)) return null;
    return validE164(`+${rest}`) ?? israeliMobileShape(`+${rest}`); // `+9720972 5X…`
  }
  // (b) A foreign code glued on an Israeli MOBILE: `+1 972 54…`, `+44 972 5…`.
  //     Mobile shape only: a Dallas number (`+1 972 …`) with one digit too many
  //     is `1` + `972` + 8 digits, which reads as an Israeli LANDLINE — a
  //     stranger. The glue forms actually seen were all mobiles.
  for (let len = 1; len <= 3; len++) {
    if (!CALLING_CODES.has(digits.slice(0, len))) continue;
    const israeli = israeliMobileShape(`+${digits.slice(len)}`);
    if (israeli) return israeli;
  }
  return null;
}

// Every country sharing a dial code (`+39` → IT, VA; `+1` → US, CA, …).
function countriesForDial(dial: string): CountryCode[] {
  return COUNTRIES.filter((c) => String(getCountryCallingCode(c)) === dial);
}

/** The number read in a NON-Israeli hinted country, or null (no such hint, or not valid there). */
function readWithForeignHint(value: string, hint: { iso?: CountryCode; dial?: string }): string | null {
  if (hint.iso && hint.iso !== ISRAEL) return validE164(value, hint.iso);
  if (hint.dial && hint.dial !== '972') {
    // Read the national number as each country using this code would: Italy
    // keeps its leading 0 (`055…` → `+39 055…`), Germany drops it. Stripping
    // zeros blindly turned Florence's `0555123456` into an Israeli mobile.
    for (const iso of countriesForDial(hint.dial)) {
      const e164 = validE164(value, iso);
      if (e164) return e164;
    }
    return validE164(`+${hint.dial}${value.replace(/^0+/, '')}`);
  }
  return null;
}

/**
 * The value as an Israeli MOBILE (`05X`…, `972 5X…`, `9720 5X…`), or null.
 * Landlines are not included, and neither is a bare `5X` + 7 digits: without
 * an Israel hint that shape is not Israeli (rule 3a), and libphonenumber's IL
 * parse would otherwise make a quarter of Polish mobiles (`519 574 575`) and
 * Spanish `51…` numbers "ambiguous".
 */
function israeliMobileReading(value: string): string | null {
  if (!/^(?:0|972)/.test(value)) return null;
  const shape = israeliMobileShape(value);
  if (shape) return shape;
  const parsed = parsePhoneNumberFromString(value, ISRAEL);
  return parsed && parsed.isValid() && parsed.country === ISRAEL && parsed.getType() === 'MOBILE' ? parsed.number : null;
}

function isIsraelHint(hint: { iso?: CountryCode; dial?: string }): boolean {
  return hint.iso === ISRAEL || hint.dial === '972';
}

export function resolvePhone(raw: string | null | undefined, opts: ResolvePhoneOptions = {}): PhoneResolution {
  let value = toAsciiDigits(String(raw ?? '')).trim().replace(/^whatsapp:/i, '');
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
  const hinted = readWithForeignHint(value, hint);
  if (hinted) {
    // An Israeli living abroad picks their country of residence and types their
    // Israeli WhatsApp: `054-259-0309` + France is ALSO the valid French
    // `+33 5 42 59 03 09`. Both readings are real numbers, so neither is a guess
    // we may make — refuse and let the visitor pick the country or type a `+`
    // (controller ruling 2026-09-28, athome PR #5). Only the Israeli MOBILE
    // shape counts: a French `04…` or Italian `06…` landline keeps its hint.
    const israeliMobile = israeliMobileReading(value);
    if (israeliMobile && israeliMobile !== hinted) return { ok: false, reason: 'ambiguous' };
    return { ok: true, e164: hinted, via: 'country_hint' };
  }

  const israeli = validE164(value, ISRAEL);
  if (israeli) return { ok: true, e164: israeli, via: 'israeli' };
  const mobile = israeliMobileShape(value) ?? (isIsraelHint(hint) ? israeliMobileShape(`0${value}`) : null);
  if (mobile) return { ok: true, e164: mobile, via: 'israeli' };

  if (value.length === 10 && validE164(`+1${value}`)) return { ok: false, reason: 'unresolvable' }; // same ambiguity as in unwrap()
  const international = validE164(`+${value}`);
  if (international) return { ok: true, e164: international, via: 'international_digits' };

  return { ok: false, reason: 'unresolvable' };
}

/**
 * Every spelling a lead row might hold for this number, canonical first. The
 * input's own cleaned spelling (digits and a leading `+`) is always included —
 * a row stored under exactly that string IS this person. When the number does
 * not resolve, that spelling is all there is (`[]` only for a digitless input).
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
  const own = cleanSpelling(raw);
  const resolved = resolvePhone(raw);
  if (!('e164' in resolved)) return own ? [own] : [];
  const canonical = resolved.e164;

  const parsed = parsePhoneNumberFromString(canonical);
  if (!parsed) return [...new Set([canonical, own].filter(Boolean))];

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

  // The input's own spelling is appended unfiltered: whoever it resolves to, a
  // row stored under exactly this string is the person being looked up.
  return [...new Set([...variants.filter(Boolean).filter(samePersonOrNobody), own].filter(Boolean))];
}
