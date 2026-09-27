import { describe, it, expect } from 'vitest';
import { resolvePhone } from './phone-resolve';

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
