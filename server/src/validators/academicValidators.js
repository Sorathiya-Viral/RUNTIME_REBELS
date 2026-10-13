import { z } from 'zod';

export const institutionSettingsSchema = z.object({
  institutionName: z.string().min(2).max(200),
  academicYear: z.string().min(4).max(20),
  workingDays: z.array(z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])).min(1),
  dayStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'),
  dayEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'),
  periodDurationMinutes: z.number().int().min(30).max(120),
  breakPeriods: z.array(
    z.object({
      name: z.string().min(1),
      startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'),
      endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'),
    })
  ),
  maxConsecutiveTeachingPeriods: z.number().int().min(1).max(6),
  timeZone: z.string().default('Asia/Kolkata'),
});

export const practicalBatchSchema = z.object({
  batchName: z.string().min(1),
  batchCode: z.string().min(1).toUpperCase(),
  strength: z.number().int().min(1),
});

export const academicGroupSchema = z.object({
  name: z.string().min(1),
  groupCode: z.string().min(1).toUpperCase(),
  totalStrength: z.number().int().min(1),
  practicalBatches: z.array(practicalBatchSchema).default([]),
});

export const semesterSchema = z.object({
  semesterNumber: z.number().int().min(1).max(12),
  academicGroups: z.array(academicGroupSchema).default([]),
});

export const programmeCreateSchema = z.object({
  name: z.string().min(2).max(150),
  code: z.string().min(2).max(30).toUpperCase(),
  academicYear: z.string().default('2026-2027'),
  department: z.string().default('Cyber Security & Digital Forensics'),
  semesters: z.array(semesterSchema).default([]),
  isActive: z.boolean().default(true),
});

export const facultyCreateSchema = z.object({
  facultyId: z.string().min(2).max(30).toUpperCase(),
  name: z.string().min(2).max(100),
  email: z.string().email().toLowerCase(),
  department: z.string().default('Digital Forensics & Information Security'),
  designation: z.string().default('Assistant Professor'),
  availableDays: z.array(z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])).default(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']),
  availableTimeRanges: z.array(
    z.object({
      day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
      startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
    })
  ).default([]),
  unavailableSlots: z.array(
    z.object({
      day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
      startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      reason: z.string().default('Department Meeting'),
    })
  ).default([]),
  fixedCommitments: z.array(
    z.object({
      day: z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
      startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
      description: z.string(),
    })
  ).default([]),
  maxDailyTeachingHours: z.number().int().min(1).max(8).default(4),
  maxWeeklyTeachingHours: z.number().int().min(1).max(30).default(16),
  isActive: z.boolean().default(true),
});

export const roomCreateSchema = z.object({
  roomNumber: z.string().min(1).max(20).toUpperCase(),
  name: z.string().min(2).max(100),
  roomType: z.enum(['lecture_hall', 'laboratory', 'seminar_hall']),
  capacity: z.number().int().min(5).max(500),
  labEquipment: z.array(z.string()).default([]),
  building: z.string().default('Cyber Complex'),
  floor: z.number().int().default(1),
  isAvailable: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export const subjectCreateSchema = z.object({
  code: z.string().min(2).max(30).toUpperCase(),
  name: z.string().min(2).max(150),
  programmeCode: z.string().min(2).max(30).toUpperCase(),
  semesterNumber: z.number().int().min(1).max(12),
  subjectType: z.enum(['theory', 'practical', 'integrated']).default('theory'),
  primaryFaculty: z.string().min(1), // ObjectId string
  assignedFaculty: z.array(z.string()).default([]),
  theoryPeriodsPerWeek: z.number().int().min(0).max(10).default(3),
  practicalSessionsPerWeek: z.number().int().min(0).max(5).default(0),
  practicalConsecutivePeriods: z.number().int().min(1).max(4).default(2),
  requiredRoomType: z.enum(['lecture_hall', 'laboratory', 'seminar_hall']).default('lecture_hall'),
  requiredLabEquipment: z.array(z.string()).default([]),
  applicableGroupCodes: z.array(z.string()).default([]),
  requiresBatchSplitForPractical: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

export const schedulingConstraintSchema = z.object({
  name: z.string().min(2).max(100),
  constraintType: z.enum(['hard', 'soft']).default('hard'),
  category: z.enum([
    'faculty_availability',
    'room_capacity',
    'room_suitability',
    'consecutive_limit',
    'daily_distribution',
    'preferred_slot',
    'no_overlap',
    'break_exclusion',
    'custom',
  ]),
  targetEntity: z.enum(['institution', 'programme', 'group', 'faculty', 'room', 'subject']),
  targetId: z.string().default('ALL'),
  parameters: z.record(z.any()).default({}),
  priority: z.number().int().min(1).max(10).default(5),
  description: z.string().optional(),
  isActive: z.boolean().default(true),
});
