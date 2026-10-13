import { describe, it, expect } from 'vitest';
import {
  generateTimetableSchedule,
  buildSessionVariables,
} from '../src/scheduler/solver.js';
import {
  intervalsOverlap,
  generateDayTimeSlots,
  isValidConsecutiveBlock,
} from '../src/scheduler/timeSlots.js';
import {
  validateSessionAssignment,
  validateCompleteSchedule,
  studentTargetsConflict,
  computePreferenceScore,
} from '../src/scheduler/constraintValidator.js';

describe('Timetable Scheduling Engine — Mandatory Constraints & Solver Tests', () => {
  // Mock Base Institution Settings
  const mockSettings = {
    institutionName: 'NFSU Cyber Campus',
    academicYear: '2026-2027',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    dayStartTime: '09:00',
    dayEndTime: '17:00',
    periodDurationMinutes: 60,
    breakPeriods: [{ name: 'Lunch Break', startTime: '13:00', endTime: '14:00' }],
    maxConsecutiveTeachingPeriods: 3,
    timeZone: 'Asia/Kolkata',
  };

  // Mock Programme with 40 students and two 20-student batches
  const mockProgramme = {
    name: 'M.Sc. Digital Forensics and Information Security',
    code: 'M.Sc. DFIS',
    academicYear: '2026-2027',
    semesters: [
      {
        semesterNumber: 1,
        academicGroups: [
          {
            name: 'Section A',
            groupCode: 'DFIS-S1-A',
            totalStrength: 40,
            practicalBatches: [
              { batchName: 'Batch 1', batchCode: 'B1', strength: 20 },
              { batchName: 'Batch 2', batchCode: 'B2', strength: 20 },
            ],
          },
        ],
      },
    ],
  };

  // Mock Faculty List
  const mockFaculty = [
    {
      _id: 'fac01',
      facultyId: 'FAC-01',
      name: 'Dr. Vikram Malhotra',
      email: 'vikram@schedulix.local',
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      unavailableSlots: [{ day: 'Wednesday', startTime: '11:00', endTime: '12:00', reason: 'Meeting' }],
      fixedCommitments: [{ day: 'Friday', startTime: '14:00', endTime: '15:00', description: 'Dean Review' }],
    },
    {
      _id: 'fac02',
      facultyId: 'FAC-02',
      name: 'Prof. Ananya Sharma',
      email: 'ananya@schedulix.local',
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      unavailableSlots: [],
      fixedCommitments: [],
    },
    {
      _id: 'fac03',
      facultyId: 'FAC-03',
      name: 'Dr. Rajiv Sen',
      email: 'rajiv@schedulix.local',
      availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      unavailableSlots: [],
      fixedCommitments: [],
    },
  ];

  // Mock Rooms (Lecture Hall and Lab)
  const mockRooms = [
    {
      _id: 'rm01',
      roomNumber: 'CR-101',
      name: 'Forensics Classroom 101',
      roomType: 'lecture_hall',
      capacity: 50,
      isActive: true,
      isAvailable: true,
    },
    {
      _id: 'rm02',
      roomNumber: 'LAB-301',
      name: 'Digital Forensics Lab',
      roomType: 'laboratory',
      capacity: 25,
      isActive: true,
      isAvailable: true,
    },
    {
      _id: 'rm03',
      roomNumber: 'LAB-302',
      name: 'Network Forensics Lab',
      roomType: 'laboratory',
      capacity: 25,
      isActive: true,
      isAvailable: true,
    },
  ];

  // Mock Subjects
  const mockSubjects = [
    {
      _id: 'sub01',
      code: 'DFIS101',
      name: 'Digital Forensics Investigations',
      subjectType: 'theory',
      primaryFaculty: mockFaculty[0],
      theoryPeriodsPerWeek: 3,
      practicalSessionsPerWeek: 0,
      requiredRoomType: 'lecture_hall',
      isActive: true,
    },
    {
      _id: 'sub02',
      code: 'DFIS102',
      name: 'Applied Cryptography',
      subjectType: 'theory',
      primaryFaculty: mockFaculty[1],
      theoryPeriodsPerWeek: 3,
      practicalSessionsPerWeek: 0,
      requiredRoomType: 'lecture_hall',
      isActive: true,
    },
    {
      _id: 'sub03',
      code: 'DFIS103P',
      name: 'Forensics Lab Practical',
      subjectType: 'practical',
      primaryFaculty: mockFaculty[2],
      theoryPeriodsPerWeek: 0,
      practicalSessionsPerWeek: 1, // 1 session per batch
      practicalConsecutivePeriods: 2, // 2 consecutive periods
      requiredRoomType: 'laboratory',
      requiresBatchSplitForPractical: true,
      isActive: true,
    },
  ];

  // Context builder helper
  function buildContext(settings = mockSettings, faculty = mockFaculty, rooms = mockRooms) {
    const facultyMap = new Map();
    faculty.forEach((f) => facultyMap.set(f.facultyId, f));
    const roomMap = new Map();
    rooms.forEach((r) => roomMap.set(r.roomNumber, r));
    const daySlotsMap = new Map();
    settings.workingDays.forEach((day) => daySlotsMap.set(day, generateDayTimeSlots(settings)));
    return { institutionSettings: settings, facultyMap, roomMap, daySlotsMap };
  }

  // 1. INTERVAL ARITHMETIC
  it('1. Mathematical interval overlap detection handles boundaries correctly', () => {
    // Overlapping intervals
    expect(intervalsOverlap('09:00', '10:00', '09:30', '10:30')).toBe(true);
    expect(intervalsOverlap('09:00', '11:00', '10:00', '12:00')).toBe(true);
    // Exact adjacent non-overlapping intervals [09:00, 10:00) and [10:00, 11:00)
    expect(intervalsOverlap('09:00', '10:00', '10:00', '11:00')).toBe(false);
    expect(intervalsOverlap('11:00', '12:00', '09:00', '10:00')).toBe(false);
  });

  // 2. BREAK WINDOW AVOIDANCE
  it('2. Time slot generator flags break periods and rejects assignments overlapping breaks', () => {
    const slots = generateDayTimeSlots(mockSettings);
    // Find lunch break slot (13:00 - 14:00)
    const lunchSlot = slots.find((s) => s.startTime === '13:00');
    expect(lunchSlot).toBeDefined();
    expect(lunchSlot.isBreak).toBe(true);
    expect(lunchSlot.breakName).toBe('Lunch Break');

    // Consecutive practical block cannot cross the break
    const context = buildContext();
    const breakViolation = validateSessionAssignment(
      {
        day: 'Monday',
        startTime: '12:00',
        endTime: '14:00', // Overlaps 13:00 - 14:00 lunch
        subjectCode: 'DFIS103P',
        facultyCode: 'FAC-03',
        facultyName: 'Dr. Rajiv Sen',
        roomNumber: 'LAB-301',
        groupCode: 'DFIS-S1-A',
        batchCode: 'B1',
        sessionType: 'practical',
        durationPeriods: 2,
        studentCount: 20,
      },
      [],
      context
    );
    expect(breakViolation.isValid).toBe(false);
    expect(breakViolation.violations.some((v) => v.includes('overlaps scheduled break'))).toBe(true);
  });

  // 3. FACULTY OVERLAP
  it('3. Rejects session assignment if same faculty is assigned to multiple rooms at the same time', () => {
    const context = buildContext();
    const existing = [
      {
        day: 'Monday',
        startTime: '09:00',
        endTime: '10:00',
        facultyCode: 'FAC-01',
        roomNumber: 'CR-101',
        groupCode: 'GROUP_X',
        subjectCode: 'SUB_A',
      },
    ];

    const candidate = {
      day: 'Monday',
      startTime: '09:00',
      endTime: '10:00',
      facultyCode: 'FAC-01', // Same faculty!
      facultyName: 'Dr. Vikram Malhotra',
      roomNumber: 'CR-102', // Different room
      groupCode: 'DFIS-S1-A',
      subjectCode: 'DFIS101',
      sessionType: 'theory',
      studentCount: 40,
    };

    const res = validateSessionAssignment(candidate, existing, context);
    expect(res.isValid).toBe(false);
    expect(res.violations.some((v) => v.includes('Faculty conflict'))).toBe(true);
  });

  // 4. ROOM OVERLAP
  it('4. Rejects session assignment if same room is assigned to multiple classes at the same time', () => {
    const context = buildContext();
    const existing = [
      {
        day: 'Tuesday',
        startTime: '10:00',
        endTime: '11:00',
        facultyCode: 'FAC-01',
        roomNumber: 'CR-101',
        groupCode: 'DFIS-S1-A',
        subjectCode: 'DFIS101',
      },
    ];

    const candidate = {
      day: 'Tuesday',
      startTime: '10:00',
      endTime: '11:00',
      facultyCode: 'FAC-02', // Different faculty
      facultyName: 'Prof. Ananya Sharma',
      roomNumber: 'CR-101', // Same room!
      groupCode: 'OTHER-GROUP',
      subjectCode: 'DFIS102',
      sessionType: 'theory',
      studentCount: 30,
    };

    const res = validateSessionAssignment(candidate, existing, context);
    expect(res.isValid).toBe(false);
    expect(res.violations.some((v) => v.includes('Room conflict'))).toBe(true);
  });

  // 5 & 6. WHOLE-CLASS VS PRACTICAL-BATCH OVERLAP RULES
  it('5. Correctly applies whole-class vs practical-batch conflict rules', () => {
    const wholeClass = { groupCode: 'DFIS-S1-A', batchCode: null };
    const batch1 = { groupCode: 'DFIS-S1-A', batchCode: 'B1' };
    const batch2 = { groupCode: 'DFIS-S1-A', batchCode: 'B2' };
    const otherGroup = { groupCode: 'DFIS-S2-B', batchCode: null };

    // Whole class conflicts with any batch of that class
    expect(studentTargetsConflict(wholeClass, batch1)).toBe(true);
    expect(studentTargetsConflict(batch1, wholeClass)).toBe(true);

    // Same batch conflicts
    expect(studentTargetsConflict(batch1, batch1)).toBe(true);

    // Disjoint batches (B1 and B2) do NOT conflict with each other!
    expect(studentTargetsConflict(batch1, batch2)).toBe(false);
    expect(studentTargetsConflict(batch2, batch1)).toBe(false);

    // Different academic groups do NOT conflict
    expect(studentTargetsConflict(wholeClass, otherGroup)).toBe(false);
  });

  // 7. ROOM CAPACITY
  it('7. Rejects assignment when student group size exceeds room capacity', () => {
    const context = buildContext();
    const candidate = {
      day: 'Monday',
      startTime: '09:00',
      endTime: '10:00',
      facultyCode: 'FAC-01',
      facultyName: 'Dr. Vikram Malhotra',
      roomNumber: 'LAB-301', // Lab capacity is 25
      groupCode: 'DFIS-S1-A',
      subjectCode: 'DFIS101',
      sessionType: 'theory',
      studentCount: 40, // 40 students cannot fit in 25 capacity lab!
    };

    const res = validateSessionAssignment(candidate, [], context);
    expect(res.isValid).toBe(false);
    expect(res.violations.some((v) => v.includes('capacity'))).toBe(true);
  });

  // 8. PRACTICAL LAB REQUIREMENT
  it('8. Rejects practical session assigned to a regular lecture hall', () => {
    const context = buildContext();
    const candidate = {
      day: 'Monday',
      startTime: '09:00',
      endTime: '11:00',
      facultyCode: 'FAC-03',
      facultyName: 'Dr. Rajiv Sen',
      roomNumber: 'CR-101', // Lecture hall!
      groupCode: 'DFIS-S1-A',
      batchCode: 'B1',
      subjectCode: 'DFIS103P',
      sessionType: 'practical', // Requires laboratory!
      studentCount: 20,
    };

    const res = validateSessionAssignment(candidate, [], context);
    expect(res.isValid).toBe(false);
    expect(res.violations.some((v) => v.includes('requires a laboratory'))).toBe(true);
  });

  // 9. FACULTY FIXED COMMITMENT
  it('9. Rejects scheduling faculty during their fixed institutional commitments', () => {
    const context = buildContext();
    const candidate = {
      day: 'Friday',
      startTime: '14:00', // Collides with Dr. Vikram Malhotra's Dean Review (14:00-15:00)
      endTime: '15:00',
      facultyCode: 'FAC-01',
      facultyName: 'Dr. Vikram Malhotra',
      roomNumber: 'CR-101',
      groupCode: 'DFIS-S1-A',
      subjectCode: 'DFIS101',
      sessionType: 'theory',
      studentCount: 40,
    };

    const res = validateSessionAssignment(candidate, [], context);
    expect(res.isValid).toBe(false);
    expect(res.violations.some((v) => v.includes('fixed institutional commitment'))).toBe(true);
  });

  // 10. GENERATION SOLVER SUCCESS ON M.Sc. DFIS SCENARIO
  it('10. Successfully generates a complete, valid timetable satisfying all constraints for M.Sc. DFIS', async () => {
    const result = await generateTimetableSchedule({
      institutionSettings: mockSettings,
      programme: mockProgramme,
      semesterNumber: 1,
      subjects: mockSubjects,
      facultyList: mockFaculty,
      rooms: mockRooms,
    });

    expect(result.success).toBe(true);
    expect(result.metrics.hardConstraintViolations).toBe(0);
    expect(result.metrics.unassignedSessionsCount).toBe(0);
    expect(result.metrics.softPreferenceScore).toBeGreaterThanOrEqual(70);

    // Verify weekly required session counts:
    // DFIS101: 3 theory sessions
    const sub1Sessions = result.schedule.filter((s) => s.subjectCode === 'DFIS101');
    expect(sub1Sessions.length).toBe(3);

    // DFIS102: 3 theory sessions
    const sub2Sessions = result.schedule.filter((s) => s.subjectCode === 'DFIS102');
    expect(sub2Sessions.length).toBe(3);

    // DFIS103P: 2 practical sessions (1 for Batch B1, 1 for Batch B2), each 2 consecutive periods
    const practicalSessions = result.schedule.filter((s) => s.subjectCode === 'DFIS103P');
    expect(practicalSessions.length).toBe(2);
    expect(practicalSessions.some((s) => s.batchCode === 'B1')).toBe(true);
    expect(practicalSessions.some((s) => s.batchCode === 'B2')).toBe(true);
    practicalSessions.forEach((p) => {
      expect(p.durationPeriods).toBe(2);
      expect(p.roomNumber.startsWith('LAB')).toBe(true);
    });

    // Run complete validator over generated schedule
    const context = buildContext();
    const fullCheck = validateCompleteSchedule(result.schedule, context);
    expect(fullCheck.isValid).toBe(true);
    expect(fullCheck.violations.length).toBe(0);
  });

  // 11. LOCKED SESSIONS PRESERVED DURING REGENERATION
  it('11. Preserves locked sessions in exact slots and rooms during regeneration', async () => {
    const lockedSession = {
      sessionId: 'LOCKED_01',
      day: 'Monday',
      slotIndex: 0,
      startTime: '09:00',
      endTime: '10:00',
      subjectCode: 'DFIS101',
      subjectName: 'Digital Forensics Investigations',
      facultyCode: 'FAC-01',
      facultyName: 'Dr. Vikram Malhotra',
      roomNumber: 'CR-101',
      groupCode: 'DFIS-S1-A',
      batchCode: null,
      sessionType: 'theory',
      durationPeriods: 1,
      isLocked: true,
    };

    const result = await generateTimetableSchedule({
      institutionSettings: mockSettings,
      programme: mockProgramme,
      semesterNumber: 1,
      subjects: mockSubjects,
      facultyList: mockFaculty,
      rooms: mockRooms,
      lockedSessions: [lockedSession],
    });

    expect(result.success).toBe(true);
    const foundLocked = result.schedule.find((s) => s.sessionId === 'LOCKED_01');
    expect(foundLocked).toBeDefined();
    expect(foundLocked.day).toBe('Monday');
    expect(foundLocked.startTime).toBe('09:00');
    expect(foundLocked.roomNumber).toBe('CR-101');
  });

  // 12. IMPOSSIBLE SCENARIO REPORTING (HONEST INFEASIBILITY DIAGNOSTICS)
  it('12. Intentionally impossible scenario is rejected and returns honest diagnostics without false success', async () => {
    // Impossible scenario: No laboratories available, but a practical session is required!
    const onlyLectureRooms = [
      {
        _id: 'rm01',
        roomNumber: 'CR-101',
        name: 'Lecture Hall Only',
        roomType: 'lecture_hall',
        capacity: 50,
        isActive: true,
        isAvailable: true,
      },
    ];

    const result = await generateTimetableSchedule({
      institutionSettings: mockSettings,
      programme: mockProgramme,
      semesterNumber: 1,
      subjects: mockSubjects, // Includes DFIS103P practical
      facultyList: mockFaculty,
      rooms: onlyLectureRooms, // No labs!
    });

    expect(result.success).toBe(false);
    expect(result.diagnostics).toBeDefined();
    expect(result.diagnostics.status).toBe('infeasible');
    expect(result.diagnostics.conflictMessages.length).toBeGreaterThan(0);
    expect(result.diagnostics.conflictMessages.some((msg) => msg.includes('requires a laboratory'))).toBe(true);
    expect(result.diagnostics.suggestions.some((s) => s.includes('Laboratory'))).toBe(true);
  });
});
