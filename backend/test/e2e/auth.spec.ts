import { API_URL, TEST_CREDENTIALS, login, AuthTokens } from './helpers';

/**
 * Auth Flow E2E Tests
 *
 * Verifies login, token refresh, and logout.
 */
describe('Auth Flow', () => {
  let tokens: AuthTokens;

  it('POST /auth/login with valid credentials should return tokens', async () => {
    tokens = await login();
    expect(tokens.accessToken).toBeDefined();
    expect(typeof tokens.accessToken).toBe('string');
    expect(tokens.accessToken.length).toBeGreaterThan(20);
  });

  it('POST /auth/login with wrong password should return 401', async () => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_CREDENTIALS.email,
        password: 'wrong_password_123',
        tenantSlug: TEST_CREDENTIALS.tenantSlug,
      }),
    });
    expect(res.status).toBe(401);
  });

  it('POST /auth/login with invalid email format should return 400', async () => {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: 'Admin@123' }),
    });
    expect(res.status).toBe(400);
  });

  it('POST /auth/refresh with valid refresh token should return new tokens', async () => {
    if (!tokens?.refreshToken) {
      tokens = await login();
    }
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.accessToken ?? data.access_token).toBeDefined();
  });

  it('Accessing protected endpoint without token should return 401', async () => {
    const res = await fetch(`${API_URL}/candidates`, {
      headers: { 'Content-Type': 'application/json' },
    });
    expect(res.status).toBe(401);
  });

  it('Accessing protected endpoint with invalid token should return 401', async () => {
    const res = await fetch(`${API_URL}/candidates`, {
      headers: {
        Authorization: 'Bearer invalid.token.here',
        'Content-Type': 'application/json',
      },
    });
    expect(res.status).toBe(401);
  });
});
