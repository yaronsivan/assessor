// The phone a lead is saved with. The dial-code select is a HINT, never a
// prefix — gluing it on turned `0049 176…` into `+97249 176…` and a pasted
// `+972 54…` beside `+1` into `+1+972 54…`. See ./phone-resolve.ts.
//
// The resolver (libphonenumber metadata) is loaded on submit, never with the
// page: this page's LCP is watched. `loadResolver` is injectable for tests.
const loadPhoneResolve = () => import('./phone-resolve');

/**
 * @param {string} raw        what the visitor typed (may be empty — phone is optional)
 * @param {string} dialCode   the select's value, e.g. '+972'
 * @returns {Promise<{ ok: true, e164: string | null } | { ok: false }>}
 */
export async function buildLeadPhone(raw, dialCode, loadResolver = loadPhoneResolve) {
  if (!raw || !raw.trim()) return { ok: true, e164: null };
  let resolvePhone;
  try {
    ({ resolvePhone } = await loadResolver());
  } catch (err) {
    // A stale deployed bundle can 404 the chunk. Ask the visitor to retry
    // rather than guessing a number.
    console.error('phone-resolve failed to load:', err);
    return { ok: false };
  }
  const resolved = resolvePhone(raw, { countryHint: dialCode });
  return resolved.ok ? { ok: true, e164: resolved.e164 } : { ok: false };
}
