import { BASE_URL, API_URL } from './helpers';

/**
 * Health Check E2E Tests
 *
 * Verifies that the server is running and all dependencies are healthy.
 */
describe('Health Checks', () => {
  it('GET /health should return 200 with status ok', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data).toHaveProperty('ts');
  });

  it('GET /api/v1/health should return 200', async () => {
    const res = await fetch(`${API_URL}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
  });
});
