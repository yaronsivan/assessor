import { describe, it, expect } from 'vitest';
import { buildCrmResultsBody, withResolvedPhone } from './crm-results';

const results = { recommendedLevel: 'Aleph+ (A1.2)' };

describe('buildCrmResultsBody', () => {
  it('sends the phone the visitor gave, so the CRM can find their contact by it', () => {
    const body = buildCrmResultsBody({
      profile: { name: 'Licia', email: 'licia@example.com', phone: '+5585999931398' },
      results,
      assessmentId: 'a1',
    });
    expect(body).toEqual({
      to: 'licia@example.com',
      name: 'Licia',
      phone: '+5585999931398',
      level: 'Aleph+ (A1.2)',
      assessmentId: 'a1',
      organization: 'ulpan_bayit',
    });
  });

  it('leaves the phone out when there is none (the CRM then matches by email)', () => {
    const body = buildCrmResultsBody({
      profile: { name: 'No Phone', email: 'np@example.com', phone: '' },
      results,
      assessmentId: 'a2',
    });
    expect('phone' in body).toBe(false);
  });
});

describe('withResolvedPhone', () => {
  // The survey engine builds the profile from name + email only; the phone is
  // resolved earlier, on the details step. Without this the result never
  // carried it (2026-05-23 → 2026-11-23).
  it('adds the phone resolved on the details step to the profile', () => {
    expect(withResolvedPhone({ name: 'A', email: 'a@x.com' }, '+972541234567')).toEqual({
      name: 'A',
      email: 'a@x.com',
      phone: '+972541234567',
    });
  });

  it('keeps a phone the profile already has', () => {
    expect(withResolvedPhone({ phone: '+33612345678' }, '+972541234567').phone).toBe('+33612345678');
  });

  it('adds nothing when no phone was given', () => {
    expect('phone' in withResolvedPhone({ name: 'A' }, null)).toBe(false);
    expect('phone' in withResolvedPhone({ name: 'A' }, '')).toBe(false);
  });
});
