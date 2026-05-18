/**
 * Test Suite for Tekgen ATS Backend
 * Unit and integration tests for API endpoints
 */

const request = require('supertest');
const { PrismaClient } = require('@prisma/client');
const app = require('../src/index');
const authService = require('../src/services/authService');

const prisma = new PrismaClient();

describe('Authentication Endpoints', () => {
  let jwtToken;
  let userId;
  const primaryEmail = `john.${Date.now()}@test.com`;

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'John',
          lastName: 'Doe',
          email: primaryEmail,
          password: 'TestPass123',
          confirmPassword: 'TestPass123',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(primaryEmail);
      expect(res.body.data.token).toBeDefined();
      
      userId = res.body.data.user.id;
      jwtToken = res.body.data.token;
    });

    it('should reject duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Jane',
          lastName: 'Doe',
          email: primaryEmail,
          password: 'TestPass123',
          confirmPassword: 'TestPass123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject mismatched passwords', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@test.com',
          password: 'TestPass123',
          confirmPassword: 'Different123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: primaryEmail,
          password: 'TestPass123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid@test.com',
          password: 'TestPass123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'john@test.com',
          password: 'WrongPassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should get user profile with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe(primaryEmail);
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/api/auth/profile');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/auth/profile', () => {
    it('should update user profile', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          firstName: 'Jonathan',
          phone: '+1234567890',
          department: 'Engineering',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.firstName).toBe('Jonathan');
      expect(res.body.data.phone).toBe('+1234567890');
    });
  });
});

describe('Candidate Endpoints', () => {
  let jobId;
  let candidateId;
  let jwtToken;

  beforeAll(async () => {
    // Create test user and get token
    const user = await authService.registerUser(`test.${Date.now()}@test.com`, 'TestPass123', 'Test', 'User');
    jwtToken = user.token;

    // Create test job
    const job = await prisma.job.create({
      data: {
        title: 'Software Engineer',
        description: 'Test job',
        requiredSkills: ['JavaScript', 'React', 'Node.js'],
        minExperience: 2,
        maxExperience: 5,
        department: 'Engineering',
      },
    });
    jobId = job.id;
  });

  describe('POST /api/candidates/upload-resume', () => {
    it('should upload candidate resume', async () => {
      const res = await request(app)
        .post('/api/candidates/upload-resume')
        .set('Authorization', `Bearer ${jwtToken}`)
        .field('firstName', 'Jane')
        .field('lastName', 'Smith')
        .field('email', 'jane@test.com')
        .field('phone', '+9876543210')
        .field('location', 'New York');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('jane@test.com');

      candidateId = res.body.data.id;
    });
  });

  describe('GET /api/candidates', () => {
    it('should fetch candidates list', async () => {
      const res = await request(app)
        .get('/api/candidates')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter candidates by status', async () => {
      const res = await request(app)
        .get('/api/candidates?status=APPLIED')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/candidates/:id', () => {
    it('should get candidate details', async () => {
      const res = await request(app)
        .get(`/api/candidates/${candidateId}`)
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(candidateId);
    });
  });

  describe('PATCH /api/candidates/:id/status', () => {
    it('should update candidate status', async () => {
      const res = await request(app)
        .patch(`/api/candidates/${candidateId}/status`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({ status: 'INTERVIEW' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('INTERVIEW');
    });
  });
});

describe('Job Endpoints', () => {
  let jwtToken;
  let jobId;
  let testClientId;

  beforeAll(async () => {
    const reg = await authService.registerUser(`recruiter.${Date.now()}@test.com`, 'TestPass123', 'Recruiter', 'Test');
    await prisma.user.update({
      where: { id: reg.user.id },
      data: { role: 'RECRUITMENT_MANAGER' },
    });
    jwtToken = authService.generateToken({ ...reg.user, role: 'RECRUITMENT_MANAGER' });

    const client = await prisma.client.create({
      data: { clientName: `API Test Client ${Date.now()}` },
    });
    testClientId = client.id;
  });

  describe('POST /api/jobs', () => {
    it('should create new job', async () => {
      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          title: 'Product Manager',
          description: 'Manage product roadmap',
          requiredSkills: ['Product Management', 'Analytics'],
          minExperience: 3,
          maxExperience: 7,
          department: 'Product',
          location: 'San Francisco, CA',
          salaryMin: 120,
          salaryMax: 160,
          clientId: testClientId,
          clientName: 'API Test Client',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Product Manager');

      jobId = res.body.data.id;
    });
  });

  describe('GET /api/jobs', () => {
    it('should fetch jobs list', async () => {
      const res = await request(app)
        .get('/api/jobs')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('PUT /api/jobs/:id', () => {
    it('should update job details', async () => {
      const res = await request(app)
        .put(`/api/jobs/${jobId}`)
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          title: 'Senior Product Manager',
          salaryMax: 180,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Senior Product Manager');
    });
  });

  describe('PATCH /api/jobs/:id/close', () => {
    it('should close job', async () => {
      const res = await request(app)
        .patch(`/api/jobs/${jobId}/close`)
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('CLOSED');
    });
  });
});

describe('Screening Endpoints', () => {
  let jwtToken;
  let candidateId;
  let jobId;

  beforeAll(async () => {
    const user = await authService.registerUser(`screen.${Date.now()}@test.com`, 'TestPass123', 'Screen', 'Test');
    jwtToken = user.token;

    // Create test candidate
    const candidate = await prisma.candidate.create({
      data: {
        firstName: 'Test',
        lastName: 'Candidate',
        email: 'screencand@test.com',
        skills: ['JavaScript', 'React'],
        experience: 3,
      },
    });
    candidateId = candidate.id;

    // Create test job
    const job = await prisma.job.create({
      data: {
        title: 'Frontend Developer',
        description: 'Build interfaces',
        requiredSkills: ['JavaScript', 'React', 'CSS'],
        minExperience: 2,
      },
    });
    jobId = job.id;
  });

  describe('POST /api/screenings/screen', () => {
    it('should screen candidate for job', async () => {
      const res = await request(app)
        .post('/api/screenings/screen')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          candidateId,
          jobId,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.score).toBeDefined();
      expect(res.body.data.recommendation).toBeDefined();
    });
  });

  describe('GET /api/screenings/stats/pipeline', () => {
    it('should get pipeline statistics', async () => {
      const res = await request(app)
        .get('/api/screenings/stats/pipeline')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('NEW');
      expect(res.body.data).toHaveProperty('APPLIED');
    });
  });
});

describe('Analytics Endpoints', () => {
  let jwtToken;

  beforeAll(async () => {
    const user = await authService.registerUser(`analytics.${Date.now()}@test.com`, 'TestPass123', 'Analytics', 'Test');
    jwtToken = user.token;
  });

  describe('GET /api/analytics/funnel', () => {
    it('should get funnel analytics', async () => {
      const res = await request(app)
        .get('/api/analytics/funnel')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('total');
      expect(res.body.data).toHaveProperty('statusBreakdown');
      expect(res.body.data).toHaveProperty('conversionRates');
    });
  });

  describe('GET /api/analytics/scores/distribution', () => {
    it('should get score distribution', async () => {
      const res = await request(app)
        .get('/api/analytics/scores/distribution')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('scoreRanges');
    });
  });

  describe('GET /api/analytics/recruiter/performance', () => {
    it('should get recruiter performance metrics', async () => {
      const res = await request(app)
        .get('/api/analytics/recruiter/performance')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('totalCandidates');
      expect(res.body.data).toHaveProperty('hireSuccessRate');
    });
  });

  describe('POST /api/analytics/predict/candidate-success', () => {
    it('should predict candidate success', async () => {
      const res = await request(app)
        .post('/api/analytics/predict/candidate-success')
        .set('Authorization', `Bearer ${jwtToken}`)
        .send({
          candidateId: 'test-id',
          jobId: 'test-job-id',
        });

      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('successProbability');
      expect(res.body.data).toHaveProperty('recommendation');
    });
  });
});

describe('Export Endpoints', () => {
  let jwtToken;

  beforeAll(async () => {
    const user = await authService.registerUser(`export.${Date.now()}@test.com`, 'TestPass123', 'Export', 'Test');
    jwtToken = user.token;
  });

  describe('GET /api/export/candidates/csv', () => {
    it('should export candidates as CSV', async () => {
      const res = await request(app)
        .get('/api/export/candidates/csv')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
    });
  });

  describe('GET /api/export/jobs/csv', () => {
    it('should export jobs as CSV', async () => {
      const res = await request(app)
        .get('/api/export/jobs/csv')
        .set('Authorization', `Bearer ${jwtToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
    });
  });
});

module.exports = { describe, it, beforeAll, afterAll, expect };
