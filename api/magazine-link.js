import { createHmac } from 'node:crypto';

/**
 * Assessor → Magazine round-trip: mint a signed grant token.
 *
 * A reader who arrived from the magazine (`?source=magazine&issue=<slug>`)
 * finishes the assessment and clicks "Read this issue at your level →". The
 * browser calls this function with their recommended level; we map it to one
 * of the magazine's five reading levels and sign a short-lived grant the
 * magazine's `verifyGrant` accepts. The magazine then unlocks the current
 * issue at that level — no sign-in required.
 *
 * Token shape (must stay byte-identical to the magazine's `signGrant` in
 * `lib/grant.ts`):
 *   base64url(JSON payload) + '.' + base64url(HMAC-SHA256(payloadB64))
 *
 * Level banding (must match the magazine's `lib/assessor-level.ts` exactly):
 *   beyondMax === '1'           → C1   (overrides any parse)
 *   A1.1, A1.2                  → A1
 *   A1.3, A2.1, A2.2            → A2
 *   A2.3, B1.1, B1.2            → B1
 *   B1.3, B2.1                  → B2
 *   unparseable / unmapped      → A1
 */

const SUBLEVEL_TO_MAGAZINE = {
  'A1.1': 'A1',
  'A1.2': 'A1',
  'A1.3': 'A2',
  'A2.1': 'A2',
  'A2.2': 'A2',
  'A2.3': 'B1',
  'B1.1': 'B1',
  'B1.2': 'B1',
  'B1.3': 'B2',
  'B2.1': 'B2',
};

function assessorToMagazineLevel(level, beyondMax) {
  // Passed the assessor's ceiling (Dalet / B2.1) — always the top level.
  if (beyondMax === '1') return 'C1';

  // Pull the CEFR sub-level token out of the "(X.Y)" parenthetical.
  const match = /\(([A-Za-z]\d\.\d)\)/.exec(level || '');
  if (!match) return 'A1';

  return SUBLEVEL_TO_MAGAZINE[match[1].toUpperCase()] || 'A1';
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');

export default function handler(req, res) {
  // CORS — called same-origin from the assessor, but harmless to allow.
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const { issue, level, beyondMax } = req.query || {};

  if (!issue || typeof issue !== 'string' || !level || typeof level !== 'string') {
    res.status(400).json({ error: 'Missing required query params: issue, level' });
    return;
  }

  const secret = process.env.MAGAZINE_GRANT_SECRET;
  if (!secret) {
    console.error('MAGAZINE_GRANT_SECRET is not configured');
    res.status(500).json({ error: 'Server misconfigured' });
    return;
  }

  const magazineLevel = assessorToMagazineLevel(level, beyondMax);

  // Sign the token — must mirror the magazine's `signGrant`: HMAC over the
  // base64url-encoded payload string, both pieces base64url-encoded.
  const payloadObj = {
    iss: issue,
    lvl: magazineLevel,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const payloadB64 = b64url(JSON.stringify(payloadObj));
  const sig = b64url(createHmac('sha256', secret).update(payloadB64).digest());
  const token = `${payloadB64}.${sig}`;

  res.status(200).json({
    url: `https://ulpan-magazine.vercel.app/api/grant?token=${encodeURIComponent(token)}`,
  });
}
