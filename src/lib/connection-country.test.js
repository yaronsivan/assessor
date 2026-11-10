import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const okResponse = (body) => ({ ok: true, json: async () => body });

async function load() {
  vi.resetModules();
  return import('./connection-country.js');
}

describe('connection country', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('returns the upper-cased ISO-2 code', async () => {
    fetch.mockResolvedValue(okResponse({ country_code: 'us', country_name: 'United States' }));
    const { getCountryCode } = await load();
    expect(await getCountryCode()).toBe('US');
  });

  it('returns null when the fetch fails', async () => {
    fetch.mockRejectedValue(new Error('offline'));
    const { getCountryCode } = await load();
    expect(await getCountryCode()).toBeNull();
  });

  it('returns null on a non-OK answer', async () => {
    fetch.mockResolvedValue({ ok: false, json: async () => ({ country_code: 'US' }) });
    const { getCountryCode } = await load();
    expect(await getCountryCode()).toBeNull();
  });

  it.each([undefined, '', 'USA', 'U', '12', 5, null])('returns null for malformed code %s', async (code) => {
    fetch.mockResolvedValue(okResponse({ country_code: code }));
    const { getCountryCode } = await load();
    expect(await getCountryCode()).toBeNull();
  });

  it('makes ONE request for two calls, shared with getGeolocation', async () => {
    fetch.mockResolvedValue(okResponse({ country_code: 'CA', country_name: 'Canada' }));
    const { getCountryCode } = await load();
    const { getGeolocation } = await import('./supabase.js');
    await getCountryCode();
    await getCountryCode();
    await getGeolocation();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('gives up after 2 seconds on a slow lookup', async () => {
    vi.useFakeTimers();
    fetch.mockReturnValue(new Promise(() => {}));
    const { getCountryCode } = await load();
    const p = getCountryCode();
    await vi.advanceTimersByTimeAsync(2000);
    expect(await p).toBeNull();
  });

  it('getGeolocation keeps exactly its four keys', async () => {
    fetch.mockResolvedValue(
      okResponse({
        country_code: 'US',
        country_name: 'United States',
        region: 'California',
        city: 'LA',
        ip: '1.2.3.4',
        timezone: 'x',
      })
    );
    await load();
    const { getGeolocation } = await import('./supabase.js');
    const geo = await getGeolocation();
    expect(Object.keys(geo).sort()).toEqual(['geo_city', 'geo_country', 'geo_region', 'ip_address']);
    expect(geo).toEqual({
      geo_country: 'United States',
      geo_region: 'California',
      geo_city: 'LA',
      ip_address: '1.2.3.4',
    });
  });

  it('getGeolocation returns null when the lookup fails', async () => {
    fetch.mockRejectedValue(new Error('offline'));
    await load();
    const { getGeolocation } = await import('./supabase.js');
    expect(await getGeolocation()).toBeNull();
  });
});
