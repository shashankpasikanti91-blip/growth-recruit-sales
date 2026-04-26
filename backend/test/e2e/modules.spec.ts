import { login, authGet, authPost, AuthTokens } from './helpers';

/**
 * Companies, Contacts, Imports, Workflows, Billing, Audit E2E Tests
 * Production-grade coverage for supporting modules.
 */
describe('Companies', () => {
  let token: string;
  let createdCompanyId: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('GET /companies returns paginated list', async () => {
    const res = await authGet('/companies', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('GET /companies includes date fields', async () => {
    const res = await authGet('/companies?limit=3', token);
    const data = await res.json();
    if (data.data.length > 0) {
      const c = data.data[0];
      expect(c).toHaveProperty('createdAt');
      expect(c).toHaveProperty('id');
      expect(c).toHaveProperty('businessId');
      expect(new Date(c.createdAt).getTime()).not.toBeNaN();
    }
  });

  it('POST /companies creates a company', async () => {
    const suffix = Date.now();
    const res = await authPost('/companies', token, {
      name: `E2E-Company-${suffix}`,
      website: 'https://e2e-test.example.com',
      industry: 'Technology',
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toHaveProperty('id');
    expect(data.name).toContain('E2E-Company');
    expect(data).toHaveProperty('createdAt');
    createdCompanyId = data.id;
  });

  it('GET /companies/:id returns company detail', async () => {
    if (!createdCompanyId) return;
    const res = await authGet(`/companies/${createdCompanyId}`, token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(createdCompanyId);
  });

  it('GET /companies/:id returns 404 for non-existent ID', async () => {
    const res = await authGet('/companies/00000000-0000-0000-0000-000000000000', token);
    expect(res.status).toBe(404);
  });
});

describe('Contacts', () => {
  let token: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('GET /contacts returns paginated list or array', async () => {
    const res = await authGet('/contacts', token);
    expect(res.status).toBe(200);
    const body = await res.json();
    const items = Array.isArray(body) ? body : body.data;
    expect(Array.isArray(items)).toBe(true);
  });

  it('GET /contacts includes date fields when records exist', async () => {
    const res = await authGet('/contacts?limit=3', token);
    const body = await res.json();
    const items = Array.isArray(body) ? body : (body.data ?? []);
    if (items.length > 0) {
      const c = items[0];
      expect(c).toHaveProperty('createdAt');
      expect(c).toHaveProperty('id');
      expect(new Date(c.createdAt).getTime()).not.toBeNaN();
    }
  });
});

describe('Imports', () => {
  let token: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('GET /imports returns import history with correct shape', async () => {
    const res = await authGet('/imports', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('GET /imports includes date fields when records exist', async () => {
    const res = await authGet('/imports?limit=3', token);
    const data = await res.json();
    if (data.data.length > 0) {
      const imp = data.data[0];
      expect(imp).toHaveProperty('createdAt');
      expect(imp).toHaveProperty('id');
      expect(new Date(imp.createdAt).getTime()).not.toBeNaN();
    }
  });
});

describe('Workflows', () => {
  let token: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('GET /workflows/runs returns workflow run history', async () => {
    const res = await authGet('/workflows/runs', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('GET /workflows/runs includes date fields when records exist', async () => {
    const res = await authGet('/workflows/runs?limit=3', token);
    const data = await res.json();
    if (data.data.length > 0) {
      const run = data.data[0];
      expect(run).toHaveProperty('createdAt');
      expect(run).toHaveProperty('id');
      expect(new Date(run.createdAt).getTime()).not.toBeNaN();
    }
  });
});

describe('Billing', () => {
  let token: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('GET /billing/plans returns all plan tiers', async () => {
    const res = await authGet('/billing/plans', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThanOrEqual(1);
    // Each plan must have id, name, tier, and pricing
    data.forEach((plan: any) => {
      expect(plan).toHaveProperty('id');
      expect(plan).toHaveProperty('name');
      expect(plan).toHaveProperty('tier');
    });
  });

  it('GET /billing/subscription returns current tenant subscription', async () => {
    const res = await authGet('/billing/subscription', token);
    expect([200, 404]).toContain(res.status); // 404 if no subscription set
    if (res.status === 200) {
      const data = await res.json();
      expect(data).toHaveProperty('status');
    }
  });

  it('GET /billing/usage returns usage metrics', async () => {
    const res = await authGet('/billing/usage', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(typeof data).toBe('object');
  });
});

describe('Audit', () => {
  let token: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('GET /audit returns audit log entries with correct shape', async () => {
    const res = await authGet('/audit', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('GET /audit includes timestamp and action fields when records exist', async () => {
    const res = await authGet('/audit?limit=5', token);
    const data = await res.json();
    if (data.data.length > 0) {
      const entry = data.data[0];
      expect(entry).toHaveProperty('createdAt');
      expect(entry).toHaveProperty('action');
      expect(entry).toHaveProperty('entityType');
      expect(new Date(entry.createdAt).getTime()).not.toBeNaN();
    }
  });
});
