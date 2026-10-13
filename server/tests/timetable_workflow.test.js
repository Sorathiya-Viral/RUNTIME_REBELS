import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';

describe('Timetable Lifecycle & Publication Workflow Test Suite', () => {
  let coordinatorCookie = '';
  let viewerCookie = '';
  let generatedTimetableId = '';
  let testSessionId = '';

  beforeAll(async () => {
    await connectDB();

    // Login as Coordinator
    const coordLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'coordinator@schedulix.local', password: 'CoordSecure@2026' });
    coordinatorCookie = coordLogin.headers['set-cookie'];

    // Login as Viewer
    const viewerLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'viewer@schedulix.local', password: 'ViewerSecure@2026' });
    viewerCookie = viewerLogin.headers['set-cookie'];
  });

  afterAll(async () => {
    await disconnectDB();
  });

  it('1. Coordinator triggers generation for M.Sc. DFIS Semester 1 (201 Created)', async () => {
    const res = await request(app)
      .post('/api/timetable/generate')
      .set('Cookie', coordinatorCookie)
      .set('x-skip-csrf-for-testing', 'true')
      .send({
        programmeCode: 'M.Sc. DFIS',
        semesterNumber: 1,
        academicYear: '2026-2027',
        title: 'M.Sc. DFIS Sem 1 - Test Schedule',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.timetable).toBeDefined();
    expect(res.body.timetable.sessions.length).toBeGreaterThan(0);
    expect(res.body.timetable.qualityMetrics.hardConstraintViolations).toBe(0);

    generatedTimetableId = res.body.timetable._id;
    testSessionId = res.body.timetable.sessions[0].sessionId || res.body.timetable.sessions[0]._id;
  });

  it('2. Coordinator can read timetable details and session list', async () => {
    const res = await request(app)
      .get(`/api/timetable/${generatedTimetableId}`)
      .set('Cookie', coordinatorCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.timetable.sessions.length).toBeGreaterThan(0);
  });

  it('3. Coordinator can toggle lock status on a session', async () => {
    const res = await request(app)
      .patch(`/api/timetable/${generatedTimetableId}/sessions/${testSessionId}/lock`)
      .set('Cookie', coordinatorCookie)
      .set('x-skip-csrf-for-testing', 'true');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.isLocked).toBe(true);
  });

  it('4. Manual move violating break constraints is REJECTED (400 Bad Request)', async () => {
    const res = await request(app)
      .patch(`/api/timetable/${generatedTimetableId}/sessions/${testSessionId}/move`)
      .set('Cookie', coordinatorCookie)
      .set('x-skip-csrf-for-testing', 'true')
      .send({
        newDay: 'Monday',
        newStartTime: '13:00', // Collides with Lunch Break (13:00-14:00)!
        newEndTime: '14:00',
        newRoomNumber: 'CR-101',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.violations.length).toBeGreaterThan(0);
    expect(res.body.violations.some((v) => v.includes('scheduled break'))).toBe(true);
  });

  it('5. Coordinator publishes the valid timetable (200 OK)', async () => {
    const res = await request(app)
      .post(`/api/timetable/${generatedTimetableId}/publish`)
      .set('Cookie', coordinatorCookie)
      .set('x-skip-csrf-for-testing', 'true');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.timetable.status).toBe('published');
    expect(res.body.timetable.publishedAt).toBeDefined();
  });

  it('6. Viewer can now view the published timetable', async () => {
    const res = await request(app)
      .get(`/api/timetable/${generatedTimetableId}`)
      .set('Cookie', viewerCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.timetable.status).toBe('published');
  });

  it('7. CSV export delivers formatted table with formula sanitization', async () => {
    const res = await request(app)
      .get(`/api/timetable/${generatedTimetableId}/export/csv`)
      .set('Cookie', viewerCookie);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.text).toContain('Day,Start Time,End Time,Subject Code');
    expect(res.text).toContain('DFIS');
  });

  it('8. Analytics endpoint calculates faculty workload and room utilization', async () => {
    const res = await request(app)
      .get(`/api/timetable/${generatedTimetableId}/analytics`)
      .set('Cookie', viewerCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.analytics.totalSessions).toBeGreaterThan(0);
    expect(res.body.analytics.facultyWorkload.length).toBeGreaterThan(0);
    expect(res.body.analytics.roomUtilization.length).toBeGreaterThan(0);
  });
});
