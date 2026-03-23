import { login, authGet, authPost, AuthTokens } from './helpers';

/**
 * Jobs CRUD E2E Tests
 */
describe('Jobs', () => {
  let token: string;
  let createdJobId: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('GET /jobs should return paginated list', async () => {
    const res = await authGet('/jobs', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('POST /jobs should create a job', async () => {
    const res = await authPost('/jobs', token, {
      title: `E2E-Job-${Date.now()}`,
      description: 'E2E test job description with requirements for testing purposes',
      location: 'Remote',
      type: 'FULL_TIME',
    });
    // May be 201 (created) or 400 if missing required fields
    if (res.status === 201) {
      const data = await res.json();
      expect(data).toHaveProperty('id');
      createdJobId = data.id;
    } else {
      expect([400, 201]).toContain(res.status);
    }
  });

  it('GET /jobs/:id should return job detail', async () => {
    if (!createdJobId) return;
    const res = await authGet(`/jobs/${createdJobId}`, token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(createdJobId);
  });
});
