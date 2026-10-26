import { describe, expect, it } from 'vitest';
import { makePkceChallenge, makePkceVerifier } from '../src/engine/googleAuth';

describe('Google OAuth PKCE', () => {
  it('generates a 43-character, URL-safe verifier from 32 random bytes', () => {
    const verifier = makePkceVerifier(new Uint8Array(32).fill(255));
    expect(verifier).toHaveLength(43);
    expect(verifier).toMatch(/^[a-zA-Z0-9_-]+$/);
    expect(verifier).not.toContain('=');
  });

  it('matches RFC 7636 S256 code challenge example', async () => {
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    const challenge = await makePkceChallenge(verifier);
    expect(challenge).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });
});
