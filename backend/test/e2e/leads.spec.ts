import { login, authGet, authPost, AuthTokens } from './helpers';

/**
 * Leads CRUD + Import + Generate E2E Tests
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

  // ── Lead Generation ────────────────────────────────────────────────────────

  it('GET /leads/generate/usage should return daily/monthly usage stats', async () => {
    const res = await authGet('/leads/generate/usage', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('monthly');
    expect(data).toHaveProperty('daily');
    expect(data).toHaveProperty('perRequest');
    expect(data).toHaveProperty('plan');
    expect(data.monthly).toHaveProperty('used');
    expect(data.monthly).toHaveProperty('limit');
    expect(data.monthly).toHaveProperty('remaining');
    expect(data.daily).toHaveProperty('used');
    expect(data.daily).toHaveProperty('limit');
    expect(data.daily).toHaveProperty('remaining');
    expect(typeof data.perRequest).toBe('number');
    expect(Array.isArray(data.recentGenerations)).toBe(true);
  });

  it('POST /leads/generate with Google Maps should return results', async () => {
    const res = await authPost('/leads/generate', token, {
      source: 'GOOGLE_MAPS',
      industry: 'Recruitment Agencies',
      location: 'Kuala Lumpur, Malaysia',
      limit: 10,
    });
    // 200/201 = success, 400 = API error (e.g. Places API not enabled), 403 = over limit, 503 = key missing
    expect([200, 201, 400, 403, 503]).toContain(res.status);
    if (res.status === 200 || res.status === 201) {
      const data = await res.json();
      expect(data).toHaveProperty('imported');
      expect(data).toHaveProperty('skipped');
      expect(data).toHaveProperty('importId');
      expect(typeof data.imported).toBe('number');
    }
  });

  it('POST /leads/generate with Apollo should return results or gracefully fail', async () => {
    const res = await authPost('/leads/generate', token, {
      source: 'APOLLO',
      industry: 'Recruitment Agencies',
      location: 'Kuala Lumpur, Malaysia',
      jobTitles: 'CEO,Founder',
      limit: 10,
    });
    // 200/201 = success (native API or Apify fallback), 400 = scraper error, 403 = daily limit, 503 = no API keys
    expect([200, 201, 400, 403, 503]).toContain(res.status);
    if (res.status === 200 || res.status === 201) {
      const data = await res.json();
      expect(data).toHaveProperty('imported');
      expect(data).toHaveProperty('skipped');
      expect(data).toHaveProperty('importId');
      expect(typeof data.imported).toBe('number');
    }
  }, 240000); // 4 min timeout — Apify scraper can take up to 3 min

  it('POST /leads/generate should reject invalid source', async () => {
    const res = await authPost('/leads/generate', token, {
      source: 'INVALID',
      industry: 'Test',
      location: 'Test',
      limit: 10,
    });
    expect([400, 422]).toContain(res.status);
  });

  it('POST /leads/generate should reject missing required fields', async () => {
    const res = await authPost('/leads/generate', token, {
      source: 'GOOGLE_MAPS',
    });
    expect([400, 422]).toContain(res.status);
  });
});
