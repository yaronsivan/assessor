import { describe, it, expect } from 'vitest';
import {
  SMS_CONSENT_TEXT,
  SMS_CONSENT_PRIVACY_URL,
  SMS_CONSENT_TERMS_URL,
  looksLikeNorthAmericaPhone,
  smsConsentField,
} from './sms-consent';

describe('looksLikeNorthAmericaPhone', () => {
  it('is true for +1 chosen with a full local number, and for a typed +1 or 001', () => {
    expect(looksLikeNorthAmericaPhone('+1', '310 555 0123')).toBe(true);
    expect(looksLikeNorthAmericaPhone('+972', '+1 416 555 0123')).toBe(true);
    expect(looksLikeNorthAmericaPhone('+972', '001 310 555 0123')).toBe(true);
  });

  it('is false for an empty or short number, another dial code, and a typed code that beats the +1 select', () => {
    expect(looksLikeNorthAmericaPhone('+1', '')).toBe(false);
    expect(looksLikeNorthAmericaPhone('+1', '310')).toBe(false);
    expect(looksLikeNorthAmericaPhone('+972', '54 123 4567')).toBe(false);
    expect(looksLikeNorthAmericaPhone('+1', '+972 54 123 4567')).toBe(false);
  });
});

describe('smsConsentField', () => {
  it('sends the field only when shown and ticked', () => {
    expect(smsConsentField('+1', '310 555 0123', true)).toEqual({ smsConsent: true });
    expect(smsConsentField('+1', '310 555 0123', false)).toEqual({});
    expect(smsConsentField('+972', '54 123 4567', true)).toEqual({});
  });
});

describe('SMS_CONSENT_TEXT', () => {
  it('has the required phrases and no long dash', () => {
    for (const p of ['Message frequency varies', 'Message and data rates may apply', 'Reply STOP to opt out', 'HELP for help']) {
      expect(SMS_CONSENT_TEXT).toContain(p);
    }
    expect(SMS_CONSENT_TEXT).not.toMatch(/[—–]/);
    expect(SMS_CONSENT_PRIVACY_URL).toBe('https://ulpan.co.il/privacy');
    expect(SMS_CONSENT_TERMS_URL).toBe('https://ulpan.co.il/terms');
  });
});
