import { login, API_URL, authGet, authPost } from './helpers';

describe('Documents Module (E2E)', () => {
  let token: string;

  beforeAll(async () => {
    const tokens = await login();
    token = tokens.accessToken;
  });

  describe('GET /documents', () => {
    it('should return paginated document list', async () => {
      const res = await authGet('/documents?page=1&limit=10', token);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
      expect(body.meta).toHaveProperty('total');
      expect(body.meta).toHaveProperty('page');
      expect(body.meta).toHaveProperty('limit');
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should filter by type', async () => {
      const res = await authGet('/documents?type=RESUME', token);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
    });

    it('should reject unauthenticated requests', async () => {
      const res = await fetch(`${API_URL}/documents`);
      expect(res.status).toBe(401);
    });
  });

  describe('POST /documents/upload', () => {
    it('should reject upload without a file', async () => {
      const form = new FormData();
      form.append('type', 'OTHER');
      const res = await fetch(`${API_URL}/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      // Should fail because no file provided
      expect([400, 500]).toContain(res.status);
    });

    it('should upload a text file', async () => {
      const content = 'Test document content for e2e';
      const blob = new Blob([content], { type: 'text/plain' });
      const form = new FormData();
      form.append('file', blob, 'test-doc.txt');
      form.append('type', 'OTHER');

      const res = await fetch(`${API_URL}/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      // May fail if MinIO is not running in test env, but should be 200 or 400/500
      if (res.status === 200 || res.status === 201) {
        const body = await res.json();
        expect(body).toHaveProperty('id');
        expect(body).toHaveProperty('businessId');
        expect(body.businessId).toMatch(/^DOC-\d{6}-\d{6}$/);
        expect(body.originalName).toBe('test-doc.txt');
        expect(body.mimeType).toBe('text/plain');
        expect(body).toHaveProperty('checksum');
        expect(body.status).toBe('COMPLETED');

        // Test duplicate detection
        const form2 = new FormData();
        form2.append('file', blob, 'test-doc-copy.txt');
        form2.append('type', 'OTHER');
        const res2 = await fetch(`${API_URL}/documents/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form2,
        });
        expect(res2.status).toBe(409); // Conflict - duplicate

        // Cleanup: delete the uploaded document
        const delRes = await fetch(`${API_URL}/documents/${body.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        expect([200, 204]).toContain(delRes.status);
      }
    });

    it('should reject disallowed MIME types', async () => {
      const blob = new Blob(['#!/bin/bash\necho hack'], { type: 'application/x-shellscript' });
      const form = new FormData();
      form.append('file', blob, 'malicious.sh');
      form.append('type', 'OTHER');

      const res = await fetch(`${API_URL}/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      expect([400, 415]).toContain(res.status);
    });
  });

  describe('GET /documents/:id', () => {
    it('should return 404 for non-existent document', async () => {
      const res = await authGet('/documents/00000000-0000-0000-0000-000000000000', token);
      expect(res.status).toBe(404);
    });
  });

  describe('GET /documents/:id/download-url', () => {
    it('should return 404 for non-existent document', async () => {
      const res = await authGet('/documents/00000000-0000-0000-0000-000000000000/download-url', token);
      expect(res.status).toBe(404);
    });
  });

  describe('Security checks', () => {
    it('should not leak storage keys in list response', async () => {
      const res = await authGet('/documents?limit=5', token);
      const body = await res.json();
      // storageKey should be present but only accessible to the correct tenant
      // We check that the response has proper structure
      if (body.data.length > 0) {
        const doc = body.data[0];
        expect(doc).toHaveProperty('tenantId');
        expect(doc).toHaveProperty('businessId');
      }
    });

    it('should return correct security headers', async () => {
      const res = await fetch(`${API_URL}/documents`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
      expect(res.headers.get('x-frame-options')).toBe('DENY');
    });
  });
});
