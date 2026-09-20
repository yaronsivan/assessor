import { describe, it, expect, beforeEach } from 'vitest';
import { bookingHref, CRM_BOOKING_URL } from './booking';
import { captureUtm } from './utm';

const FB = '?utm_source=facebook&utm_medium=cpc&utm_campaign=online&utm_content=adA';

function clearCookies() {
  document.cookie = 'click_fbclid=; max-age=0; path=/';
  document.cookie = 'click_gclid=; max-age=0; path=/';
}

beforeEach(() => {
  localStorage.clear();
  clearCookies();
});

describe('bookingHref', () => {
  it('sends an unattributed visitor with this site\'s own triple + the surface', () => {
    expect(bookingHref('genie_modal')).toBe(
      `${CRM_BOOKING_URL}?utm_source=assessor_site&utm_medium=results&utm_campaign=intro_session&via=genie_modal`
    );
  });

  it('lets a surface override the fallback medium', () => {
    expect(bookingHref('genie_tzabar', { utm_medium: 'results_tzabar' })).toBe(
      `${CRM_BOOKING_URL}?utm_source=assessor_site&utm_medium=results_tzabar&utm_campaign=intro_session&via=genie_tzabar`
    );
  });

  it('gives the visitor\'s own first-touch campaign ALL the utm slots — never a mix', () => {
    captureUtm({ search: FB, href: 'https://assessor.ulpan.co.il/' + FB });
    const url = new URL(bookingHref('genie_modal'));
    expect(url.searchParams.get('utm_source')).toBe('facebook');
    expect(url.searchParams.get('utm_medium')).toBe('cpc');
    expect(url.searchParams.get('utm_campaign')).toBe('online');
    expect(url.searchParams.get('utm_content')).toBe('adA');
    // The page's own fallback must not fill the one slot the ad left empty.
    expect(url.searchParams.get('utm_term')).toBeNull();
    expect(url.search).not.toContain('assessor_site');
  });

  it('always appends the click ids, whichever utms won', () => {
    document.cookie = 'click_gclid=gc456; path=/';
    document.cookie = 'click_fbclid=fb123; path=/';

    const organic = new URL(bookingHref('genie_modal'));
    expect(organic.searchParams.get('utm_source')).toBe('assessor_site');
    expect(organic.searchParams.get('gclid')).toBe('gc456');
    expect(organic.searchParams.get('fbclid')).toBe('fb123');

    captureUtm({ search: FB, href: 'https://assessor.ulpan.co.il/' + FB });
    const paid = new URL(bookingHref('genie_modal'));
    expect(paid.searchParams.get('utm_source')).toBe('facebook');
    expect(paid.searchParams.get('gclid')).toBe('gc456');
  });

  it('never leaks the first-touch landing_url into the booking link', () => {
    captureUtm({ search: FB, href: 'https://assessor.ulpan.co.il/' + FB });
    expect(bookingHref('genie_modal')).not.toContain('landing_url');
  });
});
