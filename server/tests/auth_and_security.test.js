import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { AuditEvent } from '../src/models/AuditEvent.js';
import { COOKIE_NAME } from '../src/security/jwt.js';

describe('Security & Authentication Test Suite', () => {
  beforeAll(async () => {
    await connectDB();
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it('1. Public CSRF token endpoint generates and sets XSRF-TOKEN cookie', async () => {
    const res = await request(app).get('/api/auth/csrf-token');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.csrfToken).toBeDefined();

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.includes('XSRF-TOKEN'))).toBe(true);
  });

  it('2. Login with incorrect password returns generic 401 error', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@schedulix.local',
        password: 'WrongPassword123!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid email or password.');
  });

  it('3. Login with correct credentials returns user without password and sets HttpOnly cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@schedulix.local',
        password: 'AdminSecure@2026',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.role).toBe('admin');
    expect(res.body.user.password).toBeUndefined();

    const cookies = res.headers['set-cookie'];
    expect(cookies).toBeDefined();
    expect(cookies.some((c) => c.includes(COOKIE_NAME) && c.includes('HttpOnly'))).toBe(true);
  });

  it('4. Protected endpoint /api/auth/me returns 401 when unauthenticated', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('5. Protected endpoint /api/auth/me returns user details with valid session cookie', async () => {
    // Login first
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'coordinator@schedulix.local',
        password: 'CoordSecure@2026',
      });

    const cookieHeader = loginRes.headers['set-cookie'];

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookieHeader);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.user.email).toBe('coordinator@schedulix.local');
    expect(meRes.body.user.role).toBe('coordinator');
  });

  it('6. Viewer or Coordinator cannot access Admin-only /api/auth/users endpoint (403 Forbidden)', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'viewer@schedulix.local',
        password: 'ViewerSecure@2026',
      });

    const cookieHeader = loginRes.headers['set-cookie'];

    const forbiddenRes = await request(app)
      .get('/api/auth/users')
      .set('Cookie', cookieHeader);

    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.success).toBe(false);
    expect(forbiddenRes.body.message).toContain('Forbidden');
  });

  it('7. Admin can access /api/auth/users successfully (200 OK)', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@schedulix.local',
        password: 'AdminSecure@2026',
      });

    const cookieHeader = loginRes.headers['set-cookie'];

    const usersRes = await request(app)
      .get('/api/auth/users')
      .set('Cookie', cookieHeader);

    expect(usersRes.status).toBe(200);
    expect(usersRes.body.success).toBe(true);
    expect(Array.isArray(usersRes.body.users)).toBe(true);
    expect(usersRes.body.users.length).toBeGreaterThanOrEqual(4);
  });

  it('8. Malformed/NoSQL injection payload is caught and rejected by Zod validation', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: { $ne: null },
        password: { $ne: null },
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Input validation error.');
  });

  it('9. Forensic audit trail hash chain integrity is mathematically intact', async () => {
    const auditStatus = await AuditEvent.verifyChainIntegrity();
    expect(auditStatus.isIntact).toBe(true);
    expect(auditStatus.totalChecked).toBeGreaterThan(0);
    expect(auditStatus.brokenAtSequence).toBeNull();
  });

  it('10. Tampering with an audit record is immediately detected by verifyChainIntegrity', async () => {
    // Fetch a real audit event and tamper with its action
    const event = await AuditEvent.findOne({ sequenceNumber: 1 });
    expect(event).toBeDefined();

    const originalAction = event.action;

    try {
      // Direct raw database mutation simulating malicious tamper
      await AuditEvent.updateOne({ _id: event._id }, { action: 'MALICIOUS_TAMPERED_ACTION' });

      const checkAfterTamper = await AuditEvent.verifyChainIntegrity();
      expect(checkAfterTamper.isIntact).toBe(false);
      expect(checkAfterTamper.brokenAtSequence).toBe(1);
    } finally {
      // Revert modification
      await AuditEvent.updateOne({ _id: event._id }, { action: originalAction });
    }

    // Verify it is restored
    const restoredCheck = await AuditEvent.verifyChainIntegrity();
    expect(restoredCheck.isIntact).toBe(true);
  });
});
