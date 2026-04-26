import { login, authGet, authPost, authPut, AuthTokens } from './helpers';

/**
 * Jobs CRUD E2E Tests
 * Validates list shape, date fields, filtering, pagination, and CRUD operations.
 */
describe('Jobs — List & Pagination', () => {
  let token: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('GET /jobs returns paginated list with correct shape', async () => {
    const res = await authGet('/jobs', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
    expect(data).toHaveProperty('meta');
    expect(data.meta).toHaveProperty('total');
    expect(data.meta).toHaveProperty('page');
    expect(data.meta).toHaveProperty('limit');
  });

  it('GET /jobs includes all fields required for table view', async () => {
    const res = await authGet('/jobs?limit=5', token);
    const data = await res.json();
    if (data.data.length > 0) {
      const j = data.data[0];
      ['id', 'businessId', 'title', 'department', 'location', 'jobType',
       'isActive', 'createdAt', 'updatedAt'].forEach(field => {
        expect(j).toHaveProperty(field);
      });
      // Date fields must be valid ISO strings
      expect(new Date(j.createdAt).getTime()).not.toBeNaN();
      expect(new Date(j.updatedAt).getTime()).not.toBeNaN();
      // Application count included
      expect(j).toHaveProperty('_count');
      expect(j._count).toHaveProperty('applications');
    }
  });

  it('GET /jobs?isActive=true filters to open jobs only', async () => {
    const res = await authGet('/jobs?isActive=true', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    data.data.forEach((j: any) => expect(j.isActive).toBe(true));
  });

  it('GET /jobs?isActive=false filters to closed jobs only', async () => {
    const res = await authGet('/jobs?isActive=false', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    data.data.forEach((j: any) => expect(j.isActive).toBe(false));
  });

  it('GET /jobs pagination respects page and limit params', async () => {
    const res = await authGet('/jobs?page=1&limit=3', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.length).toBeLessThanOrEqual(3);
    expect(data.meta.page).toBe(1);
    expect(data.meta.limit).toBe(3);
  });

  it('GET /jobs search filter returns relevant results', async () => {
    const res = await authGet('/jobs?search=nonexistent_xyzzy_99999', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBe(0);
  });

  it('GET /jobs unauthenticated returns 401', async () => {
    const res = await fetch(`${require('./helpers').API_URL}/jobs`);
    expect(res.status).toBe(401);
  });
});

describe('Jobs — CRUD', () => {
  let token: string;
  let createdJobId: string;
  const uniqueSuffix = Date.now();

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('POST /jobs creates a job with required fields', async () => {
    const res = await authPost('/jobs', token, {
      title: `E2E Job ${uniqueSuffix}`,
      description: 'E2E test job for automated testing. Requires TypeScript and Node.js skills.',
      location: 'Kuala Lumpur, Malaysia',
      department: 'Engineering',
      jobType: 'FULL_TIME',
    });
    // 201 = created successfully
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('businessId');
    expect(data.title).toBe(`E2E Job ${uniqueSuffix}`);
    expect(data.isActive).toBe(true);
    expect(new Date(data.createdAt).getTime()).not.toBeNaN();
    createdJobId = data.id;
  });

  it('GET /jobs/:id returns full job detail with applications', async () => {
    if (!createdJobId) return;
    const res = await authGet(`/jobs/${createdJobId}`, token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(createdJobId);
    expect(data).toHaveProperty('applications');
    expect(Array.isArray(data.applications)).toBe(true);
    expect(data).toHaveProperty('_count');
  });

  it('PUT /jobs/:id updates job fields', async () => {
    if (!createdJobId) return;
    const res = await authPut(`/jobs/${createdJobId}`, token, {
      title: `E2E Job Updated ${uniqueSuffix}`,
      location: 'Remote (APAC)',
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBe(`E2E Job Updated ${uniqueSuffix}`);
    expect(data.location).toBe('Remote (APAC)');
  });

  it('GET /jobs/:id returns 404 for non-existent ID', async () => {
    const res = await authGet('/jobs/00000000-0000-0000-0000-000000000000', token);
    expect(res.status).toBe(404);
  });
});
