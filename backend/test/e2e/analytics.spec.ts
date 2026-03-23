import { login, authGet, AuthTokens } from './helpers';

/**
 * Analytics E2E Tests
 */
describe('Analytics', () => {
  let token: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('GET /analytics/recruitment should return summary', async () => {
    const res = await authGet('/analytics/recruitment', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('totalCandidates');
  });

  it('GET /analytics/sales should return summary', async () => {
    const res = await authGet('/analytics/sales', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('totalLeads');
  });

  it('GET /analytics/ai-usage should return AI usage stats', async () => {
    const res = await authGet('/analytics/ai-usage', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toHaveProperty('totalCalls');
  });

  it('GET /analytics/dashboard should return KPIs', async () => {
    const res = await authGet('/analytics/dashboard', token);
    expect(res.status).toBe(200);
    const data = await res.json();
    // Dashboard returns aggregated numbers
    expect(typeof data).toBe('object');
  });
});
