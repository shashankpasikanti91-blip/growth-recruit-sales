import { login, authGet, authPost, AuthTokens } from './helpers';

/**
 * Companies, Contacts, Imports, Workflows E2E Tests
 */
describe('Companies', () => {
  let token: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('GET /companies should return paginated list', async () => {
    const res = await authGet('/companies', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('data');
  });

  it('POST /companies should create a company', async () => {
    const res = await authPost('/companies', token, {
      name: `E2E-Company-${Date.now()}`,
      website: 'https://e2e-test.example.com',
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toHaveProperty('id');
    expect(data.name).toContain('E2E-Company');
  });
});

describe('Contacts', () => {
  let token: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('GET /contacts should return paginated list', async () => {
    const res = await authGet('/contacts', token);
    expect(res.status).toBe(200);
    const body = await res.json();
    // API returns { data, meta } (paginated) — accept either shape for backwards compat
    const items = Array.isArray(body) ? body : body.data;
    expect(Array.isArray(items)).toBe(true);
  });
});

describe('Imports', () => {
  let token: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('GET /imports should return import history', async () => {
    const res = await authGet('/imports', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('data');
  });
});

describe('Workflows', () => {
  let token: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('GET /workflows/runs should return workflow runs', async () => {
    const res = await authGet('/workflows/runs', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('data');
  });
});

describe('Billing', () => {
  let token: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('GET /billing/plans should return plan tiers', async () => {
    const res = await authGet('/billing/plans', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});

describe('Audit', () => {
  let token: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('GET /audit should return audit log entries', async () => {
    const res = await authGet('/audit', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('data');
  });
});
