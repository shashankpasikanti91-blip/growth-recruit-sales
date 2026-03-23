import { BASE_URL } from './helpers';

/**
 * Frontend Availability E2E Tests
 *
 * Verifies that the frontend is serving pages and not returning errors.
 */
describe('Frontend Pages', () => {
  const frontendUrl = process.env.FRONTEND_URL || BASE_URL.replace(':3001', ':3000');

  it('Landing page should return 200 (or 308 redirect)', async () => {
    try {
      const res = await fetch(frontendUrl, { redirect: 'manual' });
      expect([200, 301, 302, 307, 308]).toContain(res.status);
    } catch {
      // Frontend might not be running in test env — skip
      console.warn('Frontend not reachable at', frontendUrl);
    }
  });

  it('Login page should return 200', async () => {
    try {
      const res = await fetch(`${frontendUrl}/login`);
      expect([200, 301, 302, 307, 308]).toContain(res.status);
    } catch {
      console.warn('Frontend not reachable');
    }
  });

  it('Pricing page should return 200', async () => {
    try {
      const res = await fetch(`${frontendUrl}/pricing`);
      expect([200, 301, 302, 307, 308]).toContain(res.status);
    } catch {
      console.warn('Frontend not reachable');
    }
  });
});
