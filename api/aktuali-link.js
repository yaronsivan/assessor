import { createHmac } from 'node:crypto';

/**
 * Assessor → אקטואלי round-trip: mint a signed grant token.
 *
 * A reader who arrived from אקטואלי (`?source=aktuali&email=<email>`) finishes
 * the assessment and clicks "Read אקטואלי at your level →". The browser calls
 * this function with their recommended level; we map it to one of אקטואלי's
 * reading levels and sign a short-lived grant that אקטואלי's `verifyGrant`
 * accepts. אקטואלי then presets the reader's level — no sign-in required.
 *
 * Unlike the magazine round-trip there is NO issue: אקטואלי's leveltest ad is
 * on its main page (not an article), so the grant carries only a level.
 *
 * Token shape (must stay byte-identical to אקטואלי's `signGrant` in
 * `Sites/aktuali/lib/grant.ts`):
 *   base64url(JSON payload) + '.' + base64url(HMAC-SHA256(payloadB64))
 *
 * The rule (Yaron, 2026-11-19): the edition has the same letter as the course
 * the test recommends, and each edition is written with what the reader learned
 * BEFORE that course. For reading, "your level" is what you already know, not
 * what you are studying. Aleph (A1.1), the very start of Aleph, gets א₀ (a0),
 * the floor edition.
 *
 * Level banding (MUST stay in sync with אקטואלי's `lib/assessor-level.ts`;
 * lowercase to אקטואלי's a0–c1 ladder; the edition's Hebrew label in brackets):
 *   beyondMax === '1'           → c1   [ה]   (overrides any parse)
 *   A1.1                        → a0   [א₀]  Aleph
 *   A1.2, A1.3                  → a1   [א]   Aleph+, Aleph++
 *   A2.1, A2.2, A2.3            → a2   [ב]   Bet, Bet+, Bet++
 *   B1.1, B1.2, B1.3            → b1   [ג]   Gimmel, Gimmel+, Gimmel++
 *   B2.1                        → b2   [ד]   Dalet
 *   unparseable / unmapped      → a1
 * The magazine's map (`api/magazine-link.js`) sends a reader to the same letter
 * since 2026-11-28, in the magazine's own DB keys (A1..C2).
 */

const SUBLEVEL_TO_AKTUALI = {
  'A1.1': 'a0',
  'A1.2': 'a1',
  'A1.3': 'a1',
  'A2.1': 'a2',
  'A2.2': 'a2',
  'A2.3': 'a2',
  'B1.1': 'b1',
  'B1.2': 'b1',
  'B1.3': 'b1',
  'B2.1': 'b2',
};

function assessorToAktualiLevel(level, beyondMax) {
  // Passed the assessor's ceiling (Dalet / B2.1) — always the top level.
  if (beyondMax === '1') return 'c1';

  // Pull the CEFR sub-level token out of the "(X.Y)" parenthetical.
  const match = /\(([A-Za-z]\d\.\d)\)/.exec(level || '');
  if (!match) return 'a1';

  return SUBLEVEL_TO_AKTUALI[match[1].toUpperCase()] || 'a1';
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

  const { level, beyondMax } = req.query || {};

  if (!level || typeof level !== 'string') {
    res.status(400).json({ error: 'Missing required query param: level' });
    return;
  }

  const secret = process.env.AKTUALI_GRANT_SECRET;
  if (!secret) {
    console.error('AKTUALI_GRANT_SECRET is not configured');
    res.status(500).json({ error: 'Server misconfigured' });
    return;
  }

  const aktualiLevel = assessorToAktualiLevel(level, beyondMax);

  // Sign the token — must mirror אקטואלי's `signGrant`: HMAC over the
  // base64url-encoded payload string, both pieces base64url-encoded. No `iss`.
  const payloadObj = {
    lvl: aktualiLevel,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
  };
  const payloadB64 = b64url(JSON.stringify(payloadObj));
  const sig = b64url(createHmac('sha256', secret).update(payloadB64).digest());
  const token = `${payloadB64}.${sig}`;

  res.status(200).json({
    url: `https://aktuali.co.il/api/grant?token=${encodeURIComponent(token)}`,
  });
}
