import { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from 'src/lib/axios';

// ----------------------------------------------------------------------

export function jwtDecode(token: string) {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length < 2) throw new Error('Invalid token!');
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
}

export function isValidToken(accessToken: string) {
  const decoded = accessToken ? jwtDecode(accessToken) : null;
  return !!decoded && 'exp' in decoded && decoded.exp > Date.now() / 1000;
}

/**
 * Stores (or clears) the admin session. Access tokens are short-lived; the
 * API client refreshes them automatically with the rotating refresh token.
 */
export async function setSession(accessToken: string | null, refreshToken?: string | null) {
  if (accessToken) {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    if (refreshToken) sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}
