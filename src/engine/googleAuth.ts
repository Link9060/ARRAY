import { acceptOAuthSession } from './liveClient';

// OAuth uses RAVIN's existing Supabase Auth project. Never use a Google client
// secret or a Supabase secret/service-role key in browser code.
const AUTH_URL = 'https://bzjudqhjrbwglxdfbkmj.supabase.co/auth/v1';
const PUBLIC_KEY = (import.meta.env.VITE_RAVIN_SUPABASE_PUBLISHABLE_KEY || '').trim();
const VERIFIER_KEY = 'array-google-pkce-verifier-v1';

function base64Url(bytes: Uint8Array): string {
  return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function makePkceVerifier(bytes: Uint8Array): string {
  return base64Url(bytes);
}

export async function makePkceChallenge(verifier: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(hash));
}

export function googleSignInAvailable(): boolean {
  return typeof window !== 'undefined' && window.isSecureContext &&
    Boolean(PUBLIC_KEY && window.crypto?.subtle && window.crypto?.getRandomValues);
}

export async function startGoogleSignIn(): Promise<void> {
  if (!googleSignInAvailable()) {
    throw new Error('Google sign-in needs a public Supabase key and HTTPS (or localhost).');
  }

  const verifier = makePkceVerifier(crypto.getRandomValues(new Uint8Array(32)));
  const challenge = await makePkceChallenge(verifier);
  const authorize = new URL(AUTH_URL + '/authorize');
  authorize.searchParams.set('provider', 'google');
  authorize.searchParams.set('redirect_to', window.location.origin + window.location.pathname);
  authorize.searchParams.set('code_challenge', challenge);
  authorize.searchParams.set('code_challenge_method', 's256');

  // Only the short-lived PKCE verifier is stored. Tokens remain in memory.
  window.sessionStorage.setItem(VERIFIER_KEY, verifier);
  window.location.assign(authorize.toString());
}

let callbackPromise: Promise<boolean> | null = null;
export function completeGoogleSignIn(): Promise<boolean> {
  if (!callbackPromise) callbackPromise = exchangeGoogleCallback();
  return callbackPromise;
}

async function exchangeGoogleCallback(): Promise<boolean> {
  const url = new URL(window.location.href);
  if (!url.searchParams.has('code') && !url.searchParams.has('error')) return false;

  const verifier = window.sessionStorage.getItem(VERIFIER_KEY);
  if (!verifier) return false; // Not an ARRAY-initiated login.

  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error_description') || url.searchParams.get('error');
  window.sessionStorage.removeItem(VERIFIER_KEY);
  // Remove the one-time code from the address bar and browser history first.
  for (const key of ['code', 'error', 'error_description', 'error_code', 'state']) {
    url.searchParams.delete(key);
  }
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);

  if (error) throw new Error('Google sign-in failed: ' + error);
  if (!code) throw new Error('Google did not return an authorization code.');
  if (!PUBLIC_KEY) throw new Error('Google sign-in is not configured for this build.');

  const response = await fetch(AUTH_URL + '/token?grant_type=pkce', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: PUBLIC_KEY },
    body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
    credentials: 'omit',
    referrerPolicy: 'no-referrer',
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(result.msg || result.error_description || result.error || 'Google session exchange failed.');
  }
  if (!result.access_token || !result.refresh_token) {
    throw new Error('Google did not return a complete RAVIN session.');
  }
  acceptOAuthSession(result);
  return true;
}
