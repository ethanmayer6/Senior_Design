// src/utils/auth.ts

export interface JwtPayload {
  sub: string; // userId from backend
  iat?: number;
  exp?: number;
  [key: string]: any; // allow extra custom claims
}

/**
 * Safely get the raw JWT token from localStorage.
 */
export function getToken(): string | null {
  return localStorage.getItem("token") || null;
}

/**
 * Decodes a JWT's payload into a JSON object.
 * Returns null if decoding fails.
 */
export function decodeJwt(token: string | null): JwtPayload | null {
  if (!token) return null;

  try {
    const base64Payload = token.split(".")[1];
    if (!base64Payload) return null;

    const json = atob(base64Payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch (e) {
    console.error("Failed to decode JWT:", e);
    return null;
  }
}

/**
 * Returns the currently logged-in user's ID from the JWT.
 * The backend stores it in the `sub` claim.
 */
export function getCurrentUserId(): number | null {
  const token = getToken();
  const payload = decodeJwt(token);

  if (!payload?.sub) return null;
  return Number(payload.sub);
}

/**
 * Returns true if the token exists and is NOT expired.
 */
export function isAuthenticated(): boolean {
  const token = getToken();
  const payload = decodeJwt(token);

  if (!payload || !payload.exp) return false;

  const now = Math.floor(Date.now() / 1000);
  return payload.exp > now;
}

/**
 * Logs the user out by clearing localStorage.
 */
export function logout(): void {
  localStorage.removeItem("token");
}
