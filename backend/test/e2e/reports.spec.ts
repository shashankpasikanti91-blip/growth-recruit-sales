import { login, authGet, authPut, API_URL } from './helpers';

/**
 * Reports Module E2E Tests
 *
 * Tests all 5 report endpoints, widget layout CRUD, and CSV export.
 * All routes require a valid JWT — runs against the live API.
 */
describe('Reports — Placement Velocity', () => {
  let token: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('GET /reports/placement-velocity returns 200 with data array', async () => {
    const res = await authGet('/reports/placement-velocity', token);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('GET /reports/placement-velocity accepts date range filters', async () => {
    const res = await authGet(
      '/reports/placement-velocity?from=2026-01-01&to=2026-12-31',
      token,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('data');
  });

  it('GET /reports/placement-velocity?format=csv returns CSV content', async () => {
    const res = await fetch(
      `${API_URL}/reports/placement-velocity?format=csv`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(200);
    const ct = res.headers.get('content-type') ?? '';
    expect(ct).toContain('text/csv');
    const text = await res.text();
    expect(text.length).toBeGreaterThan(0);
  });

  it('GET /reports/placement-velocity?format=xlsx returns Excel binary', async () => {
    const res = await fetch(
      `${API_URL}/reports/placement-velocity?format=xlsx`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(res.status).toBe(200);
    const ct = res.headers.get('content-type') ?? '';
    expect(ct).toContain('spreadsheetml');
  });

  it('GET /reports/placement-velocity without token returns 401', async () => {
    const res = await fetch(`${API_URL}/reports/placement-velocity`);
    expect(res.status).toBe(401);
  });
});

describe('Reports — Sales Pipeline', () => {
  let token: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('GET /reports/sales-pipeline returns 200 with data array', async () => {
    const res = await authGet('/reports/sales-pipeline', token);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('GET /reports/sales-pipeline data rows have expected fields', async () => {
    const res = await authGet('/reports/sales-pipeline', token);
    const body = await res.json();
    if (body.data.length > 0) {
      const row = body.data[0];
      expect(row).toHaveProperty('userId');
      expect(row).toHaveProperty('totalLeads');
      expect(row).toHaveProperty('converted');
    }
  });
});

describe('Reports — Recruiter Performance', () => {
  let token: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('GET /reports/recruiter-performance returns 200 with data array', async () => {
    const res = await authGet('/reports/recruiter-performance', token);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('GET /reports/recruiter-performance accepts from/to filters', async () => {
    const res = await authGet(
      '/reports/recruiter-performance?from=2026-01-01&to=2026-12-31',
      token,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('data');
  });
});

describe('Reports — Client Activity', () => {
  let token: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('GET /reports/client-activity returns 200 with data array', async () => {
    const res = await authGet('/reports/client-activity', token);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBe(true);
  });
});

describe('Reports — AI Usage', () => {
  let token: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('GET /reports/ai-usage returns 200 with data array', async () => {
    const res = await authGet('/reports/ai-usage', token);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('data');
    expect(Array.isArray(body.data)).toBe(true);
  });

  it('GET /reports/ai-usage rows have userId field', async () => {
    const res = await authGet('/reports/ai-usage', token);
    const body = await res.json();
    if (body.data.length > 0) {
      const row = body.data[0];
      expect(row).toHaveProperty('userId');
    }
  });
});

describe('Reports — Dashboard Widgets', () => {
  let token: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('GET /reports/dashboard/widgets returns 200 with layout array', async () => {
    const res = await authGet('/reports/dashboard/widgets', token);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('layout');
    expect(Array.isArray(body.layout)).toBe(true);
  });

  it('PUT /reports/dashboard/widgets saves a layout and returns it', async () => {
    const layout = ['placement_velocity', 'ai_usage', 'sales_pipeline'];
    const res = await authPut('/reports/dashboard/widgets', token, { layout });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('layout');
    expect(body.layout).toEqual(layout);
  });

  it('GET /reports/dashboard/widgets returns the saved layout', async () => {
    const layout = ['client_activity', 'recruiter_performance'];
    await authPut('/reports/dashboard/widgets', token, { layout });
    const res = await authGet('/reports/dashboard/widgets', token);
    const body = await res.json();
    expect(body.layout).toEqual(layout);
  });
});
