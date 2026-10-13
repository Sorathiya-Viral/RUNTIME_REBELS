import mongoose from 'mongoose';

export const timetableSessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
    },
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true,
    },
    slotIndex: {
      type: Number,
      required: true, // 0-based index of period within working day
    },
    startTime: {
      type: String,
      required: true, // e.g. "09:00"
    },
    endTime: {
      type: String,
      required: true, // e.g. "10:00"
    },
    durationPeriods: {
      type: Number,
      default: 1,
    },
    sessionType: {
      type: String,
      enum: ['theory', 'practical'],
      required: true,
    },
    subjectCode: {
      type: String,
      required: true,
    },
    subjectName: {
      type: String,
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
    },
    facultyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
    },
    facultyName: {
      type: String,
      required: true,
    },
    facultyCode: {
      type: String,
      required: true,
    },
    roomNumber: {
      type: String,
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
    },
    programmeCode: {
      type: String,
      required: true,
    },
    semesterNumber: {
      type: Number,
      required: true,
    },
    groupCode: {
      type: String,
      required: true,
    },
    batchCode: {
      type: String,
      default: null, // null indicates entire class; "B1" or "B2" indicates specific batch
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
    isFixedCommitment: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true }
);

const qualityMetricsSchema = new mongoose.Schema(
  {
    hardConstraintViolations: { type: Number, default: 0 },
    softPreferenceScore: { type: Number, default: 100 }, // 0 to 100
    unassignedSessionsCount: { type: Number, default: 0 },
    facultyWorkloadBalanceScore: { type: Number, default: 100 },
  },
  { _id: false }
);

const diagnosticsSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['solved', 'infeasible', 'timeout', 'manual_draft'],
      default: 'manual_draft',
    },
    unassignedDetails: { type: [mongoose.Schema.Types.Mixed], default: [] },
    conflictMessages: { type: [String], default: [] },
    suggestions: { type: [String], default: [] },
    iterationsCount: { type: Number, default: 0 },
    timeTakenMs: { type: Number, default: 0 },
  },
  { _id: false }
);

const timetableSchema = new mongoose.Schema(
  {
    academicYear: {
      type: String,
      required: true,
      default: '2026-2027',
      index: true,
    },
    programmeCode: {
      type: String,
      required: true,
      uppercase: true,
      index: true,
    },
    semesterNumber: {
      type: Number,
      required: true,
      index: true,
    },
    version: {
      type: Number,
      required: true,
      default: 1,
    },
    status: {
      type: String,
      enum: ['draft', 'validated', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    title: {
      type: String,
      default: 'Draft Timetable',
    },
    sessions: {
      type: [timetableSessionSchema],
      default: [],
    },
    qualityMetrics: {
      type: qualityMetricsSchema,
      default: () => ({}),
    },
    diagnostics: {
      type: diagnosticsSchema,
      default: () => ({}),
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    publishedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee uniqueness of (programmeCode, semesterNumber, academicYear, version)
timetableSchema.index(
  { programmeCode: 1, semesterNumber: 1, academicYear: 1, version: 1 },
  { unique: true }
);

export const Timetable = mongoose.model('Timetable', timetableSchema);
