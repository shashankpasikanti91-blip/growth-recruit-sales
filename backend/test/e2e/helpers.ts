/**
 * E2E Test Configuration
 * 
 * These tests run against a live API server.
 * Set BASE_URL env var to target a specific server, or default to localhost:3001.
 *
 * Usage:
 *   npm run test:e2e                          # Test against localhost:3001
 *   BASE_URL=https://growth.srpailabs.com npm run test:e2e  # Test against prod
 */

export const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
export const API_URL = `${BASE_URL}/api/v1`;

export const TEST_CREDENTIALS = {
  email: process.env.TEST_EMAIL || 'admin@srp-ai-labs.com',
  password: process.env.TEST_PASSWORD || 'Admin@123',
  tenantSlug: process.env.TEST_TENANT || 'srp-ai-labs',
};

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Helper: Make an authenticated GET request
 */
export async function authGet(path: string, token: string): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Helper: Make an authenticated POST request
 */
export async function authPost(path: string, token: string, body?: any): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

/**
 * Helper: Make an authenticated PUT request
 */
export async function authPut(path: string, token: string, body: any): Promise<Response> {
  return fetch(`${API_URL}${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

/**
 * Helper: Login and return tokens
 */
export async function login(
  email = TEST_CREDENTIALS.email,
  password = TEST_CREDENTIALS.password,
  tenantSlug = TEST_CREDENTIALS.tenantSlug,
): Promise<AuthTokens> {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, tenantSlug }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed (${res.status}): ${text}`);
  }
  const data = await res.json();
  return {
    accessToken: data.accessToken ?? data.access_token,
    refreshToken: data.refreshToken ?? data.refresh_token,
  };
}
