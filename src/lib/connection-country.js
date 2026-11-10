// One ipapi.co lookup per page load, shared by getGeolocation() (supabase.js)
// and getCountryCode() (CRM lead posts). The promise is remembered, failures
// included, so a flaky lookup is never retried per call.
let lookup = null;

export function getIpLookup() {
  if (!lookup) {
    lookup = (async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        if (!response.ok) return null;
        return await response.json();
      } catch (err) {
        console.error('Failed to get geolocation:', err);
        return null;
      }
    })();
  }
  return lookup;
}

const LOOKUP_CAP_MS = 2000;

// ISO-2 upper case (e.g. 'US'), or null when unknown, malformed, failed, or
// slower than 2 seconds. Never rejects, so a lead post is never blocked.
export async function getCountryCode() {
  let timer;
  const cap = new Promise((resolve) => {
    timer = setTimeout(() => resolve(null), LOOKUP_CAP_MS);
  });
  try {
    const data = await Promise.race([getIpLookup(), cap]);
    const code = data && data.country_code;
    if (typeof code !== 'string' || !/^[A-Za-z]{2}$/.test(code)) return null;
    return code.toUpperCase();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
