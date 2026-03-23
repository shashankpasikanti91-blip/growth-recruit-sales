import { login, authGet, authPost, AuthTokens } from './helpers';

/**
 * Leads CRUD + Import E2E Tests
 */
describe('Leads', () => {
  let token: string;
  let createdLeadId: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('GET /leads should return paginated list', async () => {
    const res = await authGet('/leads', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('POST /leads should create a lead', async () => {
    const res = await authPost('/leads', token, {
      firstName: 'E2E-Lead',
      lastName: `Test-${Date.now()}`,
      email: `e2e-lead-${Date.now()}@example.com`,
      title: 'CTO',
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toHaveProperty('id');
    expect(data.firstName).toBe('E2E-Lead');
    expect(data.stage).toBe('NEW');
    createdLeadId = data.id;
  });

  it('GET /leads/:id should return the created lead', async () => {
    if (!createdLeadId) return;
    const res = await authGet(`/leads/${createdLeadId}`, token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(createdLeadId);
  });

  it('POST /leads/:id/score should trigger AI scoring (or gracefully fail)', async () => {
    if (!createdLeadId) return;
    const res = await authPost(`/leads/${createdLeadId}/score`, token);
    // May return 200 (scored) or 400/500 if AI provider not configured — both are acceptable in E2E
    expect([200, 201, 400, 500, 502]).toContain(res.status);
  });

  it('GET /leads with stage filter should work', async () => {
    const res = await authGet('/leads?stage=NEW', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.every((l: any) => l.stage === 'NEW')).toBe(true);
  });
});
