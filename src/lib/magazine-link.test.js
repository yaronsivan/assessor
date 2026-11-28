// @vitest-environment node
//
// The test-to-level map inside the serverless function api/magazine-link.js.
// It lives here, not in api/, because every file in api/ is deployed as a
// Vercel function. The map MUST stay in sync with the magazine's
// lib/assessor-level.ts (and its test). The letters in the test names are what
// the magazine shows for each DB key (its lib/level-meta.ts): the same letter
// as the recommended course, as on aktuali (see aktuali-link.test.js).
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { describe, it, expect, beforeAll } from 'vitest';
import handler from '../../api/magazine-link.js';

function minted(query) {
  let body;
  const res = {
    setHeader() {},
    status() {
      return this;
    },
    json(b) {
      body = b;
    },
    end() {},
  };
  handler({ method: 'GET', query: { issue: 'light', ...query } }, res);
  const token = decodeURIComponent(new URL(body.url).searchParams.get('token'));
  const payloadB64 = token.split('.')[0];
  return JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
}
const mintedLevel = (query) => minted(query).lvl;

describe('api/magazine-link level map', () => {
  beforeAll(() => {
    process.env.MAGAZINE_GRANT_SECRET = 'test-secret-at-least-16-chars';
  });

  it.each([
    ['Aleph (A1.1)', 'A1', 'א₀'],
    ['Aleph+ (A1.2)', 'A2', 'א'],
    ['Aleph++ (A1.3)', 'A2', 'א'],
    ['Bet (A2.1)', 'B1', 'ב'],
    ['Bet+ (A2.2)', 'B1', 'ב'],
    ['Bet++ (A2.3)', 'B1', 'ב'],
    ['Gimmel (B1.1)', 'B2', 'ג'],
    ['Gimmel+ (B1.2)', 'B2', 'ג'],
    ['Gimmel++ (B1.3)', 'B2', 'ג'],
    ['Dalet (B2.1)', 'C1', 'ד'],
  ])('maps %s to %s (shown as %s)', (level, key) => {
    expect(mintedLevel({ level, beyondMax: '0' })).toBe(key);
  });

  it("beyondMax '1' always maps to C2 (ה), overriding the parse", () => {
    expect(mintedLevel({ level: 'Aleph (A1.1)', beyondMax: '1' })).toBe('C2');
    expect(mintedLevel({ level: 'Dalet (B2.1)', beyondMax: '1' })).toBe('C2');
  });

  it('defaults to A2 (א, the letter aktuali falls back to) on an unparseable/unmapped token', () => {
    expect(mintedLevel({ level: 'no parenthetical' })).toBe('A2');
    expect(mintedLevel({ level: '(Z9.9)' })).toBe('A2');
    expect(mintedLevel({ level: 'Hey (C1.1)' })).toBe('A2');
  });

  it('carries the issue and a future expiry', () => {
    const payload = minted({ level: 'Bet (A2.1)' });
    expect(payload.iss).toBe('light');
    expect(payload.exp).toBeGreaterThan(Date.now());
  });
});
