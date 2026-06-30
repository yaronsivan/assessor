import { describe, it, expect, beforeEach } from 'vitest';
import { captureUtm, readClickIds, getAttribution } from './utm';

const FB = '?utm_source=facebook&utm_medium=cpc&utm_campaign=online&utm_content=adA&utm_term=hebrew';

function clearCookies() {
  document.cookie = 'click_fbclid=; max-age=0; path=/';
  document.cookie = 'click_gclid=; max-age=0; path=/';
}

beforeEach(() => {
  localStorage.clear();
  clearCookies();
});

describe('captureUtm (first-touch, write-once)', () => {
  it('captures all utm params + landing_url on the first campaign visit', () => {
    const out = captureUtm({ search: FB, href: 'https://assessor.ulpan.co.il/' + FB });
    expect(out).toEqual({
      utm_source: 'facebook',
      utm_medium: 'cpc',
      utm_campaign: 'online',
      utm_content: 'adA',
      utm_term: 'hebrew',
      landing_url: 'https://assessor.ulpan.co.il/' + FB,
    });
  });

  it('preserves the first-touch values when a later visit has different/no params', () => {
    captureUtm({ search: FB, href: 'https://assessor.ulpan.co.il/' + FB });
    const second = captureUtm({ search: '?utm_source=google&utm_medium=cpc', href: 'https://assessor.ulpan.co.il/x' });
    expect(second.utm_source).toBe('facebook');
    expect(second.utm_campaign).toBe('online');
  });

  it('does NOT claim the slot for an organic visit, so a later ad still wins', () => {
    const organic = captureUtm({ search: '', href: 'https://assessor.ulpan.co.il/' });
    expect(organic).toEqual({});
    const ad = captureUtm({ search: FB, href: 'https://assessor.ulpan.co.il/' + FB });
    expect(ad.utm_source).toBe('facebook');
  });
});

describe('readClickIds', () => {
  it('reads fbclid/gclid from cookies, null when absent', () => {
    expect(readClickIds()).toEqual({ fbclid: null, gclid: null });
    document.cookie = 'click_fbclid=fb123; path=/';
    document.cookie = 'click_gclid=gc456; path=/';
    expect(readClickIds()).toEqual({ fbclid: 'fb123', gclid: 'gc456' });
  });

  it('returns nulls without throwing when document.cookie access throws (sandboxed iframe)', () => {
    const original = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get() { throw new DOMException('blocked', 'SecurityError'); },
    });
    try {
      expect(() => readClickIds()).not.toThrow();
      expect(readClickIds()).toEqual({ fbclid: null, gclid: null });
    } finally {
      if (original) Object.defineProperty(document, 'cookie', original);
      else delete document.cookie;
    }
  });
});

describe('getAttribution', () => {
  it('merges first-touch utm + click ids + landing_url, all keys null-filled', () => {
    captureUtm({ search: FB, href: 'https://assessor.ulpan.co.il/' + FB });
    document.cookie = 'click_fbclid=fb123; path=/';
    const attr = getAttribution();
    expect(attr.utm_source).toBe('facebook');
    expect(attr.fbclid).toBe('fb123');
    expect(attr.gclid).toBeNull();
    expect(attr.landing_url).toBe('https://assessor.ulpan.co.il/' + FB);
    expect(Object.keys(attr).sort()).toEqual(
      ['fbclid','gclid','landing_url','utm_campaign','utm_content','utm_medium','utm_source','utm_term']
    );
  });

  it('returns all-null utm with current href as landing_url for an organic visit', () => {
    const attr = getAttribution();
    expect(attr.utm_source).toBeNull();
    expect(attr.landing_url).toBe(window.location.href);
  });
});
