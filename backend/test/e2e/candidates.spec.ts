import { login, authGet, authPost, authPut, AuthTokens } from './helpers';

/**
 * Candidates CRUD E2E Tests
 * Validates all candidate list, detail, create, update, filter, and date-field
 * behaviours expected in production.
 */
describe('Candidates — List & Pagination', () => {
  let token: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('GET /candidates returns paginated list with correct shape', async () => {
    const res = await authGet('/candidates', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('data');
    expect(Array.isArray(data.data)).toBe(true);
    expect(data).toHaveProperty('meta');
    expect(data.meta).toHaveProperty('total');
    expect(data.meta).toHaveProperty('page');
    expect(data.meta).toHaveProperty('limit');
  });

  it('GET /candidates includes required date fields in each record', async () => {
    const res = await authGet('/candidates?limit=5', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    if (data.data.length > 0) {
      const c = data.data[0];
      expect(c).toHaveProperty('createdAt');
      expect(c).toHaveProperty('updatedAt');
      expect(c).toHaveProperty('id');
      expect(c).toHaveProperty('businessId');
      // Dates must be valid ISO strings
      expect(new Date(c.createdAt).getTime()).not.toBeNaN();
      expect(new Date(c.updatedAt).getTime()).not.toBeNaN();
    }
  });

  it('GET /candidates includes profile fields used in table view', async () => {
    const res = await authGet('/candidates?limit=5', token);
    const data = await res.json();
    if (data.data.length > 0) {
      const c = data.data[0];
      // Fields displayed in the candidates table
      ['firstName', 'lastName', 'email', 'currentTitle', 'currentCompany',
       'phone', 'location', 'nationality', 'sourceName'].forEach(field => {
        expect(c).toHaveProperty(field);
      });
    }
  });

  it('GET /candidates pagination respects page and limit params', async () => {
    const res = await authGet('/candidates?page=1&limit=5', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.length).toBeLessThanOrEqual(5);
    expect(data.meta.page).toBe(1);
    expect(data.meta.limit).toBe(5);
  });

  it('GET /candidates search filter returns matching results only', async () => {
    const res = await authGet('/candidates?search=nonexistent_xyzzy_12345', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    // Result must be an empty array, not an error
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data.length).toBe(0);
  });

  it('GET /candidates unauthenticated returns 401', async () => {
    const res = await fetch(`${require('./helpers').API_URL}/candidates`);
    expect(res.status).toBe(401);
  });
});

describe('Candidates — CRUD', () => {
  let token: string;
  let createdId: string;
  const uniqueSuffix = Date.now();

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('POST /candidates creates a candidate with all required fields', async () => {
    const res = await authPost('/candidates', token, {
      firstName: 'E2E',
      lastName: `Candidate-${uniqueSuffix}`,
      email: `e2e-candidate-${uniqueSuffix}@example.com`,
      currentTitle: 'Software Engineer',
      currentCompany: 'E2E Corp',
      location: 'Kuala Lumpur',
      nationality: 'Malaysian',
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('businessId');
    expect(data.firstName).toBe('E2E');
    expect(data.stage ?? data.isActive).toBeDefined();
    expect(new Date(data.createdAt).getTime()).not.toBeNaN();
    createdId = data.id;
  });

  it('GET /candidates/:id returns full candidate detail with relations', async () => {
    if (!createdId) return;
    const res = await authGet(`/candidates/${createdId}`, token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.id).toBe(createdId);
    expect(data.firstName).toBe('E2E');
    // Relations expected in detail view
    expect(data).toHaveProperty('applications');
    expect(data).toHaveProperty('scorecards');
    expect(data).toHaveProperty('resumes');
    expect(Array.isArray(data.applications)).toBe(true);
  });

  it('PUT /candidates/:id updates fields correctly', async () => {
    if (!createdId) return;
    const res = await authPut(`/candidates/${createdId}`, token, {
      currentTitle: 'Senior Software Engineer',
      yearsExperience: 5,
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.currentTitle).toBe('Senior Software Engineer');
    expect(new Date(data.updatedAt).getTime()).not.toBeNaN();
  });

  it('GET /candidates/:id returns 404 for non-existent ID', async () => {
    const res = await authGet('/candidates/00000000-0000-0000-0000-000000000000', token);
    expect(res.status).toBe(404);
  });
});
