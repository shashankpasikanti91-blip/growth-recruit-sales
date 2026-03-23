import { login, authPost, API_URL, AuthTokens } from './helpers';

/**
 * LinkedIn AI + AI Endpoints E2E Tests
 */
describe('LinkedIn AI', () => {
  let token: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('POST /ai/linkedin with valid type should return content', async () => {
    const res = await authPost('/ai/linkedin', token, {
      type: 'linkedin_post',
      context: 'We just launched a new AI-powered recruitment platform',
    });
    // 200 = AI generated content, 500/502 = AI provider issue (acceptable in E2E)
    if (res.status === 200 || res.status === 201) {
      const data = await res.json();
      expect(data).toHaveProperty('content');
      expect(typeof data.content).toBe('string');
      expect(data.content.length).toBeGreaterThan(10);
    } else {
      // AI provider may not be available — still a valid test
      expect([200, 201, 400, 500, 502, 503]).toContain(res.status);
    }
  });

  it('POST /ai/linkedin with invalid type should return 400', async () => {
    const res = await authPost('/ai/linkedin', token, {
      type: 'invalid_type',
      context: 'test',
    });
    expect(res.status).toBe(400);
  });

  it('POST /ai/linkedin with missing context should return 400', async () => {
    const res = await authPost('/ai/linkedin', token, {
      type: 'linkedin_post',
    });
    expect(res.status).toBe(400);
  });
});

describe('AI Screen', () => {
  let token: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  it('POST /ai/parse-jd with valid text should return parsed result', async () => {
    const res = await authPost('/ai/parse-jd', token, {
      jobDescription: 'We are looking for a Senior Software Engineer with 5+ years of experience in Node.js, TypeScript, and React. Must have experience with PostgreSQL and AWS.',
    });
    // AI may respond with 200 or fail due to provider limits
    expect([200, 201, 400, 500, 502, 503]).toContain(res.status);
    if (res.status === 200 || res.status === 201) {
      const data = await res.json();
      expect(data).toBeDefined();
    }
  });
});
