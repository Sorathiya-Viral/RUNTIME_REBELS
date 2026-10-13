import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';

describe('CRUD & Academic Management RBAC Test Suite', () => {
  let adminCookie = '';
  let coordinatorCookie = '';
  let viewerCookie = '';

  beforeAll(async () => {
    await connectDB();

    // Login as Admin
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@schedulix.local', password: 'AdminSecure@2026' });
    adminCookie = adminLogin.headers['set-cookie'];

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

  it('1. Authenticated viewer can read institution settings (200 OK)', async () => {
    const res = await request(app)
      .get('/api/settings')
      .set('Cookie', viewerCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.settings.institutionName).toContain('NFSU');
  });

  it('2. Viewer cannot update settings (403 Forbidden)', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Cookie', viewerCookie)
      .set('x-skip-csrf-for-testing', 'true')
      .send({
        institutionName: 'Unauthorized Update',
        academicYear: '2026-2027',
        workingDays: ['Monday', 'Tuesday'],
        dayStartTime: '09:00',
        dayEndTime: '17:00',
        periodDurationMinutes: 60,
        breakPeriods: [],
        maxConsecutiveTeachingPeriods: 3,
        timeZone: 'Asia/Kolkata',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('3. Coordinator can update settings (200 OK)', async () => {
    const res = await request(app)
      .put('/api/settings')
      .set('Cookie', coordinatorCookie)
      .set('x-skip-csrf-for-testing', 'true')
      .send({
        institutionName: 'National Forensic Sciences University - Cyber Campus',
        academicYear: '2026-2027',
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        dayStartTime: '09:00',
        dayEndTime: '17:00',
        periodDurationMinutes: 60,
        breakPeriods: [{ name: 'Lunch Break', startTime: '13:00', endTime: '14:00' }],
        maxConsecutiveTeachingPeriods: 3,
        timeZone: 'Asia/Kolkata',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.settings.institutionName).toContain('Cyber Campus');
  });

  it('4. Read programmes returns seeded M.Sc. DFIS programme with academic groups and batches', async () => {
    const res = await request(app)
      .get('/api/programmes')
      .set('Cookie', viewerCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.programmes.length).toBeGreaterThanOrEqual(1);

    const dfis = res.body.programmes.find((p) => p.code === 'M.SC. DFIS' || p.code === 'M.Sc. DFIS');
    expect(dfis).toBeDefined();
    expect(dfis.semesters[0].academicGroups[0].totalStrength).toBe(40);
    expect(dfis.semesters[0].academicGroups[0].practicalBatches.length).toBe(2);
  });

  it('5. Coordinator can create new programme with valid structure', async () => {
    const testCode = 'MTECH-CS-' + Math.floor(Math.random() * 10000);
    const res = await request(app)
      .post('/api/programmes')
      .set('Cookie', coordinatorCookie)
      .set('x-skip-csrf-for-testing', 'true')
      .send({
        name: 'M.Tech Cyber Security',
        code: testCode,
        academicYear: '2026-2027',
        department: 'Cyber Security',
        semesters: [
          {
            semesterNumber: 1,
            academicGroups: [
              {
                name: 'Section A',
                groupCode: 'MTCS-S1-A',
                totalStrength: 30,
                practicalBatches: [{ batchName: 'B1', batchCode: 'B1', strength: 30 }],
              },
            ],
          },
        ],
        isActive: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.programme.code).toBe(testCode);
  });

  it('6. Reading faculty returns faculty list with availability details', async () => {
    const res = await request(app)
      .get('/api/faculty')
      .set('Cookie', coordinatorCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.faculty.length).toBeGreaterThanOrEqual(4);
  });

  it('7. Creating duplicate facultyId returns 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/faculty')
      .set('Cookie', coordinatorCookie)
      .set('x-skip-csrf-for-testing', 'true')
      .send({
        facultyId: 'FAC-PR', // Already seeded
        name: 'Duplicate Test Faculty',
        email: 'duplicate.faculty@schedulix.local',
        department: 'Digital Forensics',
        designation: 'Assistant Professor',
        availableDays: ['Monday', 'Tuesday'],
        availableTimeRanges: [],
        unavailableSlots: [],
        fixedCommitments: [],
        maxDailyTeachingHours: 4,
        maxWeeklyTeachingHours: 16,
        isActive: true,
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('8. Filtering rooms by type=laboratory returns only lab facilities', async () => {
    const res = await request(app)
      .get('/api/rooms?roomType=laboratory')
      .set('Cookie', coordinatorCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.rooms.length).toBeGreaterThanOrEqual(2);
    expect(res.body.rooms.every((r) => r.roomType === 'laboratory')).toBe(true);
  });

  it('9. Reading subjects returns subjects populated with faculty references', async () => {
    const res = await request(app)
      .get('/api/subjects?programmeCode=M.Sc. DFIS&semesterNumber=1')
      .set('Cookie', coordinatorCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.subjects.length).toBeGreaterThanOrEqual(6);

    const practicalSubject = res.body.subjects.find((s) => s.practicalSessionsPerWeek > 0);
    expect(practicalSubject).toBeDefined();
    expect(practicalSubject.practicalConsecutivePeriods).toBe(2);
    expect(practicalSubject.primaryFaculty).toBeDefined();
    expect(practicalSubject.primaryFaculty.name).toBeDefined();
  });

  it('10. Coordinator cannot access Admin-only /api/audit endpoint (403 Forbidden)', async () => {
    const res = await request(app)
      .get('/api/audit')
      .set('Cookie', coordinatorCookie);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('11. Admin can access /api/audit and view chain records (200 OK)', async () => {
    const res = await request(app)
      .get('/api/audit')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.events.length).toBeGreaterThan(0);
    expect(res.body.pagination).toBeDefined();
  });

  it('12. Admin can trigger cryptographic audit chain integrity check (200 OK)', async () => {
    const res = await request(app)
      .get('/api/audit/verify')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.integrity.isIntact).toBe(true);
  });
});
