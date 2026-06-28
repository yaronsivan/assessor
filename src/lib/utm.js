// Reads utm_* params from the URL and persists them to sessionStorage so
// they survive SPA navigation and are available at form-submit time.
// Mirrors the behavior of Sites/ambatia/src/lib/click-ids.ts (readUtm).

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const SS_KEY = 'ulpan_genie_utm';

export function readUtm() {
  if (typeof window === 'undefined') return {};

  const params = new URLSearchParams(window.location.search);
  const fromUrl = {};
  for (const k of UTM_KEYS) {
    const v = params.get(k);
    if (v) fromUrl[k] = v;
  }

  let stored = {};
  try {
    stored = JSON.parse(sessionStorage.getItem(SS_KEY) || '{}');
  } catch {
    /* ignore */
  }

  if (Object.keys(fromUrl).length) {
    stored = { ...stored, ...fromUrl };
    try {
      sessionStorage.setItem(SS_KEY, JSON.stringify(stored));
    } catch {
      /* ignore */
    }
  }

  return {
    utmSource: stored.utm_source,
    utmMedium: stored.utm_medium,
    utmCampaign: stored.utm_campaign,
    utmContent: stored.utm_content,
    utmTerm: stored.utm_term,
  };
}
