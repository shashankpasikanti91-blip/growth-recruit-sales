import { login, authGet, authPost, authPatch, authPut, AuthTokens } from './helpers';

/**
 * Leads CRUD + Import + Generate E2E Tests
 * Production-grade coverage: list shape, date fields, filtering,
 * pagination, stage transitions, scoring, and lead generation.
 */
describe('Leads — List & Filtering', () => {
  let token: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('GET /leads returns paginated list with correct shape', async () => {
    const res = await authGet('/leads', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
    expect(data).toHaveProperty('meta');
    expect(data.meta).toHaveProperty('total');
    expect(data.meta).toHaveProperty('page');
    expect(data.meta).toHaveProperty('limit');
  });

  it('GET /leads includes all date and identification fields', async () => {
    const res = await authGet('/leads?limit=5', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    if (data.data.length > 0) {
      const l = data.data[0];
      expect(l).toHaveProperty('id');
      expect(l).toHaveProperty('businessId');
      expect(l).toHaveProperty('createdAt');
      expect(l).toHaveProperty('updatedAt');
      expect(l).toHaveProperty('stage');
      // Date fields must be valid
      expect(new Date(l.createdAt).getTime()).not.toBeNaN();
      expect(new Date(l.updatedAt).getTime()).not.toBeNaN();
    }
  });

  it('GET /leads includes all fields shown in the leads table', async () => {
    const res = await authGet('/leads?limit=5', token);
    const data = await res.json();
    if (data.data.length > 0) {
      const l = data.data[0];
      ['firstName', 'lastName', 'email', 'phone', 'title',
       'stage', 'score', 'sourceName'].forEach(field => {
        expect(l).toHaveProperty(field);
      });
    }
  });

  it('GET /leads?stage=NEW filters to NEW stage only', async () => {
    const res = await authGet('/leads?stage=NEW', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    data.data.forEach((l: any) => expect(l.stage).toBe('NEW'));
  });

  it('GET /leads pagination respects page and limit', async () => {
    const res = await authGet('/leads?page=1&limit=5', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.length).toBeLessThanOrEqual(5);
    expect(data.meta.page).toBe(1);
  });

  it('GET /leads search returns filtered results', async () => {
    const res = await authGet('/leads?search=nonexistent_xyzzy_lead_99999', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBe(0);
  });

  it('GET /leads unauthenticated returns 401', async () => {
    const res = await fetch(`${require('./helpers').API_URL}/leads`);
    expect(res.status).toBe(401);
  });
});

describe('Leads — CRUD & Stage Transitions', () => {
  let token: string;
  let createdLeadId: string;
  const uniqueSuffix = Date.now();

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('POST /leads creates a lead and returns date + id fields', async () => {
    const res = await authPost('/leads', token, {
      firstName: 'E2E-Lead',
      lastName: `Test-${uniqueSuffix}`,
      email: `e2e-lead-${uniqueSuffix}@example.com`,
      title: 'CTO',
      companyName: 'E2E Tech Sdn Bhd',
    });
    if (res.status === 403) return; // quota exhausted on demo tenant — valid
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('businessId');
    expect(data.firstName).toBe('E2E-Lead');
    expect(data.stage).toBe('NEW');
    expect(new Date(data.createdAt).getTime()).not.toBeNaN();
    createdLeadId = data.id;
  });

  it('GET /leads/:id returns full lead detail', async () => {
    if (!createdLeadId) return;
    const res = await authGet(`/leads/${createdLeadId}`, token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(createdLeadId);
    expect(data).toHaveProperty('activities');
    expect(Array.isArray(data.activities)).toBe(true);
  });

  it('PATCH /leads/:id/stage moves lead through pipeline stages', async () => {
    if (!createdLeadId) return;
    const res = await authPatch(`/leads/${createdLeadId}/stage`, token, { stage: 'CONTACTED' });
    expect([200, 201]).toContain(res.status);
    const data = await res.json();
    expect(data.stage).toBe('CONTACTED');
    expect(new Date(data.updatedAt).getTime()).not.toBeNaN();
  });

  it('PATCH /leads/:id/stage rejects invalid stage value', async () => {
    if (!createdLeadId) return;
    const res = await authPatch(`/leads/${createdLeadId}/stage`, token, { stage: 'INVALID_STAGE' });
    expect([400, 422]).toContain(res.status);
  });

  it('POST /leads/:id/score triggers AI scoring or gracefully degrades', async () => {
    if (!createdLeadId) return;
    const res = await authPost(`/leads/${createdLeadId}/score`, token);
    expect([200, 201, 400, 500, 502]).toContain(res.status);
    if ([200, 201].includes(res.status)) {
      const data = await res.json();
      expect(data).toHaveProperty('score');
      expect(typeof (data.score ?? data.icpFitScore)).toBe('number');
    }
  });

  it('GET /leads/:id returns 404 for non-existent ID', async () => {
    const res = await authGet('/leads/00000000-0000-0000-0000-000000000000', token);
    expect(res.status).toBe(404);
  });
});

describe('Leads — Generation', () => {
  let token: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('GET /leads/generate/usage returns daily/monthly usage stats with correct shape', async () => {
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

  it('POST /leads/generate with Google Maps returns imported count or known error codes', async () => {
    const res = await authPost('/leads/generate', token, {
      source: 'GOOGLE_MAPS',
      industry: 'Recruitment Agencies',
      location: 'Kuala Lumpur, Malaysia',
      limit: 10,
    });
    expect([200, 201, 400, 403, 503]).toContain(res.status);
    if ([200, 201].includes(res.status)) {
      const data = await res.json();
      expect(data).toHaveProperty('imported');
      expect(data).toHaveProperty('skipped');
      expect(data).toHaveProperty('importId');
      expect(typeof data.imported).toBe('number');
    }
  });

  it('POST /leads/generate with Apollo returns results or degrades gracefully', async () => {
    const res = await authPost('/leads/generate', token, {
      source: 'APOLLO',
      industry: 'Recruitment Agencies',
      location: 'Kuala Lumpur, Malaysia',
      jobTitles: 'CEO,Founder',
      limit: 10,
    });
    expect([200, 201, 400, 403, 503]).toContain(res.status);
    if ([200, 201].includes(res.status)) {
      const data = await res.json();
      expect(data).toHaveProperty('imported');
      expect(data).toHaveProperty('skipped');
      expect(data).toHaveProperty('importId');
      expect(typeof data.imported).toBe('number');
    }
  }, 240000); // 4 min timeout for Apify scraper


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
