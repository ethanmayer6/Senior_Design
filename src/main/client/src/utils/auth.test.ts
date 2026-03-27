import { describe, expect, it } from 'vitest';
import { decodeJwt, getCurrentUserId, getToken, isAuthenticated, logout } from './auth';

function makeToken(payload: Record<string, unknown>): string {
  return `header.${window.btoa(JSON.stringify(payload))}.signature`;
}

describe('auth utilities', () => {
  it('decodes a valid JWT payload', () => {
    const token = makeToken({ sub: '44', exp: Math.floor(Date.now() / 1000) + 600 });

    expect(decodeJwt(token)).toMatchObject({ sub: '44' });
  });

  it('returns the current user id from the stored token', () => {
    window.localStorage.setItem('token', makeToken({ sub: '12', exp: Math.floor(Date.now() / 1000) + 600 }));

    expect(getToken()).not.toBeNull();
    expect(getCurrentUserId()).toBe(12);
  });

  it('treats expired tokens as unauthenticated', () => {
    window.localStorage.setItem('token', makeToken({ sub: '12', exp: Math.floor(Date.now() / 1000) - 10 }));

    expect(isAuthenticated()).toBe(false);
  });

  it('clears only the token on logout', () => {
    window.localStorage.setItem('token', 'token-value');
    window.localStorage.setItem('user', '{"id":44}');

    logout();

    expect(window.localStorage.getItem('token')).toBeNull();
    expect(window.localStorage.getItem('user')).toBe('{"id":44}');
  });
});
