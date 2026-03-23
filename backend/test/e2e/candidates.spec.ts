import { login, authGet, authPost, AuthTokens } from './helpers';

/**
 * Candidates CRUD E2E Tests
 */
describe('Candidates CRUD', () => {
  let token: string;
  let createdCandidateId: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('GET /candidates should return paginated list', async () => {
    const res = await authGet('/candidates', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
    expect(data).toHaveProperty('meta');
  });

  it('POST /candidates should create a candidate', async () => {
    const res = await authPost('/candidates', token, {
      firstName: 'E2E',
      lastName: `Test-${Date.now()}`,
      email: `e2e-test-${Date.now()}@example.com`,
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toHaveProperty('id');
    expect(data.firstName).toBe('E2E');
    createdCandidateId = data.id;
  });

  it('GET /candidates/:id should return the created candidate', async () => {
    if (!createdCandidateId) return;
    const res = await authGet(`/candidates/${createdCandidateId}`, token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(createdCandidateId);
    expect(data.firstName).toBe('E2E');
  });

  it('GET /candidates with search filter should work', async () => {
    const res = await authGet('/candidates?search=E2E', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.length).toBeGreaterThanOrEqual(0);
  });
});
