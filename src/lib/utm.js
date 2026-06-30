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

// ---- First-touch campaign attribution for the assessments row (additive) ----
// Persisted write-once to localStorage so the ORIGINAL campaign visit keeps the
// credit even if the user wanders off and returns. gclid/fbclid come from the
// 90-day cookies set in index.html. getAttribution() returns a Supabase-insert-
// ready object. Separate store from readUtm()'s sessionStorage — no collision.

const ATTR_KEY = 'ulpan_genie_attribution';

function readStoredAttribution() {
  try {
    const v = JSON.parse(localStorage.getItem(ATTR_KEY) || 'null');
    return v && typeof v === 'object' ? v : null;
  } catch {
    return null;
  }
}

// Capture first-touch UTM + landing_url, write-once. Returns the stored
// payload (snake_case) or {} for an organic visit (nothing persisted).
export function captureUtm({ search = window.location.search, href = window.location.href } = {}) {
  if (typeof window === 'undefined') return {};

  const stored = readStoredAttribution();
  if (stored) return stored; // first touch already locked in

  const fromUrl = {};
  const params = new URLSearchParams(search);
  for (const k of UTM_KEYS) {
    const v = params.get(k);
    if (v) fromUrl[k] = v;
  }
  if (Object.keys(fromUrl).length === 0) return {}; // organic — don't claim the slot

  const payload = { ...fromUrl, landing_url: href };
  try {
    localStorage.setItem(ATTR_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
  return payload;
}

function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null;
}

export function readClickIds() {
  return { fbclid: readCookie('click_fbclid'), gclid: readCookie('click_gclid') };
}

// Supabase-insert-ready attribution object: every key present, value-or-null.
export function getAttribution() {
  const utm = captureUtm();
  const { fbclid, gclid } = readClickIds();
  return {
    utm_source: utm.utm_source ?? null,
    utm_medium: utm.utm_medium ?? null,
    utm_campaign: utm.utm_campaign ?? null,
    utm_content: utm.utm_content ?? null,
    utm_term: utm.utm_term ?? null,
    fbclid: fbclid ?? null,
    gclid: gclid ?? null,
    landing_url: utm.landing_url ?? (typeof window !== 'undefined' ? window.location.href : null),
  };
}
