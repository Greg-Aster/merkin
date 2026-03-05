// File: /src/utils/password.ts
import passwordConfig from '../config/password.config';

/**
 * Client-Side Authentication Configuration
 * 
 * WHY WE'RE NOT USING APIs:
 * This site is hosted on GitHub Pages, which only serves static files and cannot
 * execute server-side code or handle API requests. This makes traditional API-based
 * authentication impossible on this platform.
 * 
 * CURRENT AUTHENTICATION SYSTEM:
 * Instead, we're using a simple client-side approach where:
 * 1. Credentials are verified directly in the browser against hardcoded values
 * 2. Authentication state is stored in localStorage rather than HTTP-only cookies
 * 3. Protected routes check localStorage for authentication status
 * 
 * SECURITY NOTE:
 * This approach is NOT secure for sensitive applications as:
 * - The password is stored in client-side code (obfuscated but not secure)
 * - localStorage can be manipulated by users with browser dev tools
 * - There's no protection against XSS attacks
 */

const AUTH_KEY = 'isAuthenticated';
const AUTH_EXP_KEY = 'authExpiresAt';
const AUTH_TTL_MS = 1000 * 60 * 60 * 8; // 8 hours

// Credential verification function
export function verifyCredentials(username: string, password: string): boolean {
  if (passwordConfig.needsSetup) return false;
  return (
    username === passwordConfig.username &&
    btoa(password || '') === passwordConfig.passwordHash
  );
}

function clearAuth(): void {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(AUTH_EXP_KEY);
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  const authenticated = localStorage.getItem(AUTH_KEY) === 'true';
  const expiresAt = Number(localStorage.getItem(AUTH_EXP_KEY) || '0');
  if (!authenticated || !expiresAt || Date.now() >= expiresAt) {
    clearAuth();
    return false;
  }
  return true;
}

// Set authenticated state - THIS FUNCTION IS REQUIRED BY THE COMPONENTS
export function setAuthenticated(value: boolean): void {
  if (value) {
    localStorage.setItem(AUTH_KEY, 'true');
    localStorage.setItem(AUTH_EXP_KEY, String(Date.now() + AUTH_TTL_MS));
  } else {
    clearAuth();
  }
}

// Logout function
export function logout(): void {
  clearAuth();
}
