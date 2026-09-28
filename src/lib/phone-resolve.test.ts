import { describe, it, expect } from 'vitest';
import { resolvePhone, phoneLookupVariants } from './phone-resolve';

const ok = (raw: string, hint?: string) => {
  const r = resolvePhone(raw, { countryHint: hint });
  // `in` narrowing, not `r.ok`: site copies compile with strict off, where a
  // boolean discriminant does not narrow the union.
  if ('e164' in r) return `${r.e164} ${r.via}`;
  return `FAIL ${r.reason}`;
};

describe('resolvePhone — Israeli numbers (the common case) are unchanged', () => {
  it.each([
    ['054-259-0309', '+972542590309 israeli'],
    ['0542590309', '+972542590309 israeli'],
    ['972542590309', '+972542590309 israeli'],
    ['+972 54 259 0309', '+972542590309 as_typed'],
    ['+9720542590309', '+972542590309 as_typed'],        // trunk zero dropped
    ['whatsapp:+972542590309', '+972542590309 as_typed'],
    ['03-376-3626', '+97233763626 israeli'],             // landline stays valid
    ['1-800-123-456', '+9721800123456 israeli'],         // Israeli service number, NOT US
    // Blocks libphonenumber 1.13.13 still calls unallocated — the mobile shape wins.
    ['050-123-4567', '+972501234567 israeli'],
    ['+972 50 123 4567', '+972501234567 israeli'],
    ['972541234567', '+972541234567 israeli'],
    ['+9720551234567', '+972551234567 israeli'],
  ])('%s -> %s', (raw, expected) => expect(ok(raw)).toBe(expected));
});

describe('resolvePhone — the 00 international prefix is a +', () => {
  it.each([
    ['0049 176 31682387', '+4917631682387 as_typed'],
    ['001 818 555 0142', '+18185550142 as_typed'],
    ['0044 7535 805426', '+447535805426 as_typed'],
  ])('%s -> %s', (raw, expected) => expect(ok(raw)).toBe(expected));
});

describe('resolvePhone — unwraps a number some form wrapped in another code', () => {
  // Real shapes from leads.phone_number (2026-09-15 / 09-27 audits).
  it.each([
    ['+97204917631682387', '+4917631682387 unwrapped'],  // 0049… typed, +972 glued on
    ['+972034665394250', '+34665394250 unwrapped'],
    ['+9720447535805426', '+447535805426 unwrapped'],
    ['+9720972546621413', '+972546621413 unwrapped'],    // Israeli, double-prefixed
    ['+97249 176 31682387', '+4917631682387 unwrapped'], // foundation-first / Genie shape
    ['+1972542590309', '+972542590309 unwrapped'],       // +1 selected, 972… typed
    ['+97218185550142', '+18185550142 unwrapped'],       // +1 typed, + stripped, +972 glued
    ['+972+1 818 555 0142', '+18185550142 as_typed'],    // literal double plus: last + wins
    ['+972 54-259-0309 +', '+972542590309 as_typed'],    // a stray trailing + is ignored
  ])('%s -> %s', (raw, expected) => expect(ok(raw)).toBe(expected));
});

describe('resolvePhone — never rewrites a valid number (look-alikes)', () => {
  it.each(['+40720102335', '+306906569675', '+380502818641', '+12012824226', '+13015801724', '+420602298990'])(
    '%s is returned as typed',
    (raw) => expect(ok(raw)).toBe(`${raw} as_typed`),
  );
  it('drops a trunk zero on a foreign number', () => {
    expect(ok('+4901704537674')).toBe('+491704537674 as_typed');
  });
});

describe('resolvePhone — the country select is a hint, not a prefix', () => {
  it.each([
    ['8185550142', '+1', '+18185550142 country_hint'],
    ['8185550142', 'US', '+18185550142 country_hint'],
    ['0176 31682387', '+49', '+4917631682387 country_hint'],
    ['0176 31682387', '49', '+4917631682387 country_hint'],
    ['054-259-0309', '+1', '+972542590309 israeli'],     // select left on +1, Israeli typed
    ['+44 7911 123456', '+972', '+447911123456 as_typed'], // typed country wins
    ['0542590309', '+972', '+972542590309 israeli'],
  ])('%s with hint %s -> %s', (raw, hint, expected) => expect(ok(raw, hint)).toBe(expected));
});

describe('resolvePhone — digits that already carry a country code', () => {
  it.each([
    ['491763168238', '+491763168238 international_digits'],
    ['12125551234', '+12125551234 international_digits'],
  ])('%s -> %s', (raw, expected) => expect(ok(raw)).toBe(expected));
});

describe('resolvePhone — refuses to guess', () => {
  it.each([
    ['8185550142', 'FAIL unresolvable'],   // bare US number, no hint: ask, do not invent
    ['6465303504', 'FAIL unresolvable'],   // would otherwise read as New Zealand
    ['9148193181', 'FAIL unresolvable'],   // would otherwise read as India
    ['+9726465303504', 'FAIL unresolvable'], // legacy "+972 + bare US" — would unwrap to NZ
    ['+9728185550142', 'FAIL unresolvable'],
    ['+97254259030', 'FAIL unresolvable'], // Israeli number one digit short
    ['0049 176 316', 'FAIL unresolvable'],
    ['', 'FAIL empty'],
    ['abc', 'FAIL empty'],
    ['+', 'FAIL empty'],
  ])('%s -> %s', (raw, expected) => expect(ok(raw)).toBe(expected));

  it('treats null and undefined as empty', () => {
    expect(resolvePhone(null)).toEqual({ ok: false, reason: 'empty' });
    expect(resolvePhone(undefined)).toEqual({ ok: false, reason: 'empty' });
  });

  it('ignores an unknown hint rather than trusting it', () => {
    expect(ok('0542590309', 'XX')).toBe('+972542590309 israeli');
    expect(ok('0542590309', '+999')).toBe('+972542590309 israeli');
  });
});

describe('phoneLookupVariants', () => {
  // Until the stored data is repaired, a lookup has to find the lead under the
  // spelling it was saved with as well as the canonical one.
  it('lists every Israeli spelling, canonical first', () => {
    expect(phoneLookupVariants('+972542590309')).toEqual([
      '+972542590309',
      '+9720542590309',
      '972542590309',
      '0542590309',
      '+9720972542590309',
    ]);
  });

  it('lists every German spelling, canonical first', () => {
    expect(phoneLookupVariants('+491704537674')).toEqual([
      '+491704537674',
      '+4901704537674',
      '491704537674',
      '01704537674',
      '+972491704537674',
      '+9720491704537674',
    ]);
  });

  it('reads a glued input and keeps every glued spelling', () => {
    const foreign = phoneLookupVariants('+97249 176 31682387');
    expect(foreign[0]).toBe('+4917631682387');
    expect(foreign).toContain('+9724917631682387');
    expect(foreign).toContain('+97204917631682387');
  });

  it('accepts a non-canonical input and still returns the canonical first', () => {
    expect(phoneLookupVariants('+9720542590309')[0]).toBe('+972542590309');
  });

  it('keeps US and UK spellings', () => {
    expect(phoneLookupVariants('+18185550142')).toContain('+97218185550142');
    expect(phoneLookupVariants('+447911123456')).toContain('07911123456');
  });

  it('never lists a spelling that is ANOTHER valid number', () => {
    // Saint-Pierre glued with +972 reads as an Israeli mobile.
    const spm = phoneLookupVariants('+508551234');
    expect(spm[0]).toBe('+508551234');
    expect(spm).not.toContain('+972508551234');
    expect(spm).not.toContain('+9720508551234');
    // A Saudi mobile in local form is an Israeli mobile.
    const sa = phoneLookupVariants('+966501234567');
    expect(sa[0]).toBe('+966501234567');
    expect(sa).not.toContain('0501234567');
    // Ascension glued with +972 reads as an Israeli landline.
    expect(phoneLookupVariants('+24740123')).not.toContain('+97224740123');
  });

  it('every listed spelling resolves to nothing or to the same number', () => {
    for (const raw of ['+972542590309', '+491704537674', '+508551234', '+966501234567', '+24740123', '+18185550142']) {
      const v = phoneLookupVariants(raw);
      for (const s of v) {
        const r = resolvePhone(s);
        if ('e164' in r) expect(r.e164).toBe(v[0]);
      }
    }
  });

  it('de-duplicates, never returns empties, and returns [] for an unusable input', () => {
    const v = phoneLookupVariants('+491704537674');
    expect(new Set(v).size).toBe(v.length);
    expect(v.every((x) => x.length > 0)).toBe(true);
    expect(phoneLookupVariants('abc')).toEqual([]);
    expect(phoneLookupVariants(null)).toEqual([]);
  });
});

describe('resolvePhone — unwrap touches ONLY the +972 glue (2026-09-28 hotfix)', () => {
  // Unwrap used to strip ANY leading calling code off an invalid `+` number.
  // Twilio delivers Mexican mobiles as `+521…` (legacy "1" after 52), which
  // libphonenumber calls invalid, so they turned into US strangers.
  it.each([
    ['+5218123551185', 'FAIL unresolvable'],  // real Mexican WhatsApp sender — NOT +18123551185
    ['+4914724014705', 'FAIL unresolvable'],  // NOT US +14724014705
    ['+38649416302', 'FAIL unresolvable'],    // NOT DE +49416302
    // Single-digit typos of an Israeli number are refused, not re-read abroad.
    ['+97254259030', 'FAIL unresolvable'],
    ['+9725425903091', 'FAIL unresolvable'],
    ['+9725357841743', 'FAIL unresolvable'],  // was Cuba
    ['+9724523418751', 'FAIL unresolvable'],  // was Denmark
  ])('%s -> %s', (raw, expected) => expect(ok(raw)).toBe(expected));

  it.each([
    ['+44972542590309', '+972542590309 unwrapped'],     // +44 selected, 972… typed
    ['+9720972501234567', '+972501234567 unwrapped'],   // double-prefixed, block libphonenumber calls unallocated
  ])('%s -> %s', (raw, expected) => expect(ok(raw)).toBe(expected));
});

describe('resolvePhone — a dial-code hint keeps a meaningful leading zero', () => {
  it.each([
    // Florence `055 512 3456` is ALSO the Israeli mobile 055-512-3456: ambiguous
    // since 2026-09-28 (controller ruling, athome PR #5) — refused, not guessed.
    // Round 1 pinned it Italian; before that it was stored Israeli.
    ['0555123456', '+39', 'FAIL ambiguous'],
    ['06 1234 5678', '+39', '+390612345678 country_hint'], // Rome
    ['0176 31682387', '+49', '+4917631682387 country_hint'],
    ['8185550142', '+1', '+18185550142 country_hint'],
  ])('%s with hint %s -> %s', (raw, hint, expected) => expect(ok(raw, hint)).toBe(expected));
});

describe('resolvePhone — an explicit Israel hint accepts a mobile typed without its 0', () => {
  it.each([
    ['54 123 4567', '+972', '+972541234567 israeli'],
    ['54 123 4567', '972', '+972541234567 israeli'],
    ['54 123 4567', 'IL', '+972541234567 israeli'],
    ['50 123 4567', '+972', '+972501234567 israeli'],     // the assessor's placeholder block
  ])('%s with hint %s -> %s', (raw, hint, expected) => expect(ok(raw, hint)).toBe(expected));

  it('with no hint the bare 9-digit shape is still refused (Saudi shape)', () => {
    expect(ok('54 123 4567')).toBe('FAIL unresolvable');
  });
});

describe('resolvePhone — non-ASCII digits and bidi marks', () => {
  it.each([
    ['٠٥٤٢٥٩٠٣٠٩', '+972542590309 israeli'],                    // Arabic-Indic
    ['۰۵۴۲۵۹۰۳۰۹', '+972542590309 israeli'],                    // Extended Arabic-Indic / Persian
    ['０５４２５９０３０９', '+972542590309 israeli'],              // full-width
    ['‪054 259‏0309‬', '+972542590309 israeli'], // bidi embedding + NBSP + RLM
  ])('%s -> %s', (raw, expected) => expect(ok(raw)).toBe(expected));
});

describe('phoneLookupVariants — always includes the input\'s own spelling', () => {
  it('a number that does not resolve is looked up as stored, never as someone else', () => {
    const v = phoneLookupVariants('+5218123551185');
    expect(v).toContain('+5218123551185');
    expect(v).not.toContain('+18123551185');
    expect(phoneLookupVariants('whatsapp:+5218123551185')).toEqual(['+5218123551185']);
  });

  it('a glued spelling outside the templates still finds its own row', () => {
    const v = phoneLookupVariants('+97203530874598175');
    expect(v[0]).toBe('+353874598175');
    expect(v).toContain('+97203530874598175');
  });
});

describe('resolvePhone — a foreign code glued on an Israeli number unwraps to a MOBILE only (round 3)', () => {
  it.each([
    ['+197227989817', 'FAIL unresolvable'],   // Dallas +1 972 typo — was the Israeli landline +97227989817
    ['+4497236123456', 'FAIL unresolvable'],  // +44 glued on an Israeli LANDLINE: refused, not guessed
    ['+1972542590309', '+972542590309 unwrapped'],
    ['+19720525072697', '+972525072697 unwrapped'], // real row e70ed084 (trunk zero kept)
  ])('%s -> %s', (raw, expected) => expect(ok(raw)).toBe(expected));
});

describe('resolvePhone — a foreign hint vs an Israeli mobile is ambiguous (athome PR #5)', () => {
  // Israelis abroad pick their country of residence and type their Israeli
  // WhatsApp. The hint used to win, so each of these became a foreign stranger.
  it.each([
    ['054-259-0309', 'FR', 'FAIL ambiguous'],   // was +33542590309
    ['054-259-0309', 'DE', 'FAIL ambiguous'],   // was +49542590309
    ['054-259-0309', 'UA', 'FAIL ambiguous'],   // was +380542590309
    ['0542590309', '+39', 'FAIL ambiguous'],    // was +390542590309
    ['972542590309', 'DE', 'FAIL ambiguous'],   // was +49972542590309
    ['050 123 4567', 'UA', 'FAIL ambiguous'],   // unallocated IL block, still the mobile shape
  ])('%s with hint %s -> %s', (raw, hint, expected) => expect(ok(raw, hint)).toBe(expected));

  it.each([
    ['06 12 34 56 78', 'FR', '+33612345678 country_hint'],  // French mobile: no Israeli reading
    ['07911 123456', 'GB', '+447911123456 country_hint'],
    ['0176 31682387', 'DE', '+4917631682387 country_hint'],
    ['06 1234 5678', 'IT', '+390612345678 country_hint'],   // Rome landline — IL landlines never trigger it
    ['04 72 00 00 00', 'FR', '+33472000000 country_hint'],  // Lyon landline (04 is also an IL landline prefix)
    // The US reading of a leading-0 number is invalid, so nothing is ambiguous:
    // the Israeli reading wins, as before.
    ['054-259-0309', 'US', '+972542590309 israeli'],
    ['+972 54 259 0309', 'FR', '+972542590309 as_typed'],   // a typed + always wins
    ['0033 6 12 34 56 78', 'IL', '+33612345678 as_typed'],
  ])('%s with hint %s -> %s', (raw, hint, expected) => expect(ok(raw, hint)).toBe(expected));

  it('no hint / an Israel hint: unchanged', () => {
    expect(ok('054-259-0309')).toBe('+972542590309 israeli');
    expect(ok('054-259-0309', 'IL')).toBe('+972542590309 israeli');
    expect(ok('054-259-0309', '+972')).toBe('+972542590309 israeli');
  });
});

describe('resolvePhone — the ambiguity check needs an Israeli prefix (PR #350 review)', () => {
  // A bare `5X` + 7 digits is not Israeli without an Israel hint (rule 3a), so
  // it must not make a Polish or Spanish mobile ambiguous.
  it.each([
    ['519 574 575', 'PL', '+48519574575 country_hint'],
    ['512 345 678', 'PL', '+48512345678 country_hint'],
    ['512 345 678', 'ES', '+34512345678 country_hint'],
  ])('%s with hint %s -> %s', (raw, hint, expected) => expect(ok(raw, hint)).toBe(expected));

  it('a Saudi 05… with SA picked stays ambiguous (the digits are genuinely identical)', () => {
    expect(ok('050 123 4567', 'SA')).toBe('FAIL ambiguous');
  });
});
