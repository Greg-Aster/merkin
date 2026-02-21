// File: /src/utils/password.ts

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

// Admin credentials
export const ADMIN_USERNAME = 'dndiy'; 
export const ADMIN_PASSWORD = 'dndiy';

// Credential verification function
export function verifyCredentials(username: string, password: string): boolean {
  return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return localStorage.getItem('isAuthenticated') === 'true';
}

// Set authenticated state - THIS FUNCTION IS REQUIRED BY THE COMPONENTS
export function setAuthenticated(value: boolean): void {
  if (value) {
    localStorage.setItem('isAuthenticated', 'true');
  } else {
    localStorage.removeItem('isAuthenticated');
  }
}

// Logout function
export function logout(): void {
  localStorage.removeItem('isAuthenticated');
}