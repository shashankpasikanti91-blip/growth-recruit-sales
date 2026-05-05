import { login, authGet, AuthTokens } from './helpers';

/**
 * Analytics E2E Tests
 */
describe('Analytics', () => {
  jest.setTimeout(120000);

  let token: string;

  const getWithTransientRetry = async (path: string, accessToken: string, attempts = 2) => {
    let lastRes: Response | null = null;
    for (let i = 0; i < attempts; i++) {
      const res = await authGet(path, accessToken);
      if (res.status === 200) {
        return res;
      }

      if (res.status !== 422) {
        return res;
      }

      // Read body once to check if this is transient DB pool/network pressure.
      const bodyText = await res.text();
      const isTransientDbError =
        bodyText.includes('DB_ERROR_P1001') ||
        bodyText.includes('Database operation failed');

      if (!isTransientDbError || i === attempts - 1) {
        return new Response(bodyText, {
          status: res.status,
          statusText: res.statusText,
          headers: res.headers,
        });
      }

      lastRes = res;
    }

    return lastRes as Response;
  };

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('GET /analytics/recruitment should return summary', async () => {
    const res = await getWithTransientRetry('/analytics/recruitment', token, 2);
    expect(res.status).toBe(200);
    const data = await res.json();
    // API returns nested kpis object — check top-level keys that are always present
    expect(data).toHaveProperty('kpis');
    expect(data).toHaveProperty('funnel');
  });

  it('GET /analytics/sales should return summary', async () => {
    const res = await getWithTransientRetry('/analytics/sales', token, 2);
    expect(res.status).toBe(200);
    const data = await res.json();
    // API returns nested kpis object
    expect(data).toHaveProperty('kpis');
    expect(data).toHaveProperty('stageBreakdown');
  });

  it('GET /analytics/ai-usage should return AI usage stats', async () => {
    const res = await getWithTransientRetry('/analytics/ai-usage', token, 2);
    expect(res.status).toBe(200);
    const data = await res.json();
    // totalCalls is nested under summary
    expect(data).toHaveProperty('summary');
    expect(data.summary).toHaveProperty('totalCalls');
  });

  it('GET /analytics/dashboard should return KPIs', async () => {
    const res = await getWithTransientRetry('/analytics/dashboard', token, 2);
    expect(res.status).toBe(200);
    const data = await res.json();
    // Dashboard returns aggregated numbers
    expect(typeof data).toBe('object');
  });
});
