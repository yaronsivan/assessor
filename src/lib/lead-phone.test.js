import { describe, it, expect, vi } from 'vitest';
import { buildLeadPhone } from './lead-phone';

describe('buildLeadPhone — the dial-code select is a hint, never a prefix', () => {
  it('Israel selected, 0049 176 31682387 typed -> the German number, not +97249…', async () => {
    expect(await buildLeadPhone('0049 176 31682387', '+972')).toEqual({ ok: true, e164: '+4917631682387' });
  });

  it('US selected, +972 54 123 4567 pasted -> the Israeli number, not +1+972…', async () => {
    expect(await buildLeadPhone('+972 54 123 4567', '+1')).toEqual({ ok: true, e164: '+972541234567' });
  });

  it('Israel selected, +44 7911 123456 typed -> the typed country wins', async () => {
    expect(await buildLeadPhone('+44 7911 123456', '+972')).toEqual({ ok: true, e164: '+447911123456' });
  });

  it('Israel selected, 054-123-4567 -> Israeli E.164 (the common case keeps working)', async () => {
    expect(await buildLeadPhone('054-123-4567', '+972')).toEqual({ ok: true, e164: '+972541234567' });
  });

  it('Germany selected, national 0176 31682387 -> read with the hint', async () => {
    expect(await buildLeadPhone('0176 31682387', '+49')).toEqual({ ok: true, e164: '+4917631682387' });
  });

  it('Israel selected, a bare US number 8185550142 -> refused, never +972818…', async () => {
    expect(await buildLeadPhone('8185550142', '+972')).toEqual({ ok: false });
  });

  it('empty or whitespace phone -> ok with no phone (phone stays optional), resolver never loaded', async () => {
    const load = vi.fn();
    expect(await buildLeadPhone('', '+972', load)).toEqual({ ok: true, e164: null });
    expect(await buildLeadPhone('   ', '+972', load)).toEqual({ ok: true, e164: null });
    expect(load).not.toHaveBeenCalled();
  });

  it('the resolver chunk fails to load (stale deployed bundle) -> refused, not thrown', async () => {
    const load = vi.fn().mockRejectedValue(new TypeError('Failed to fetch dynamically imported module'));
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await buildLeadPhone('054-123-4567', '+972', load)).toEqual({ ok: false });
    expect(load).toHaveBeenCalledOnce();
    spy.mockRestore();
  });
});
