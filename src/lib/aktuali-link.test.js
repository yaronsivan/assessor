// @vitest-environment node
//
// The test-to-edition map inside the serverless function api/aktuali-link.js.
// It lives here, not in api/, because every file in api/ is deployed as a
// Vercel function. The map MUST stay in sync with aktuali's
// lib/assessor-level.ts (and its test).
import { Buffer } from 'node:buffer';
import process from 'node:process';
import { describe, it, expect, beforeAll } from 'vitest';
import handler from '../../api/aktuali-link.js';

function mintedLevel(query) {
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
  handler({ method: 'GET', query }, res);
  const token = decodeURIComponent(new URL(body.url).searchParams.get('token'));
  const payloadB64 = token.split('.')[0];
  return JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')).lvl;
}

describe('api/aktuali-link level map', () => {
  beforeAll(() => {
    process.env.AKTUALI_GRANT_SECRET = 'test-secret-at-least-16-chars';
  });

  // The edition has the same letter as the recommended course.
  it.each([
    ['Aleph (A1.1)', 'a0'],
    ['Aleph+ (A1.2)', 'a1'],
    ['Aleph++ (A1.3)', 'a1'],
    ['Bet (A2.1)', 'a2'],
    ['Bet+ (A2.2)', 'a2'],
    ['Bet++ (A2.3)', 'a2'],
    ['Gimmel (B1.1)', 'b1'],
    ['Gimmel+ (B1.2)', 'b1'],
    ['Gimmel++ (B1.3)', 'b1'],
    ['Dalet (B2.1)', 'b2'],
  ])('maps %s to %s', (level, edition) => {
    expect(mintedLevel({ level, beyondMax: '0' })).toBe(edition);
  });

  it("beyondMax '1' always maps to c1, overriding the parse", () => {
    expect(mintedLevel({ level: 'Aleph (A1.1)', beyondMax: '1' })).toBe('c1');
    expect(mintedLevel({ level: 'Dalet (B2.1)', beyondMax: '1' })).toBe('c1');
  });

  it('defaults to a1 on an unparseable/unmapped token', () => {
    expect(mintedLevel({ level: 'no parenthetical' })).toBe('a1');
    expect(mintedLevel({ level: '(Z9.9)' })).toBe('a1');
    expect(mintedLevel({ level: 'Hey (C1.1)' })).toBe('a1');
  });
});
