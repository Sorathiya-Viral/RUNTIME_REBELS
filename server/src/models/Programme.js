import mongoose from 'mongoose';

const practicalBatchSchema = new mongoose.Schema(
  {
    batchName: { type: String, required: true }, // e.g. "Batch 1"
    batchCode: { type: String, required: true, uppercase: true }, // e.g. "B1"
    strength: { type: Number, required: true, min: 1 }, // e.g. 20
  },
  { _id: true }
);

const academicGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g. "Section A"
    groupCode: { type: String, required: true, uppercase: true }, // e.g. "DFIS-S1-A"
    totalStrength: { type: Number, required: true, min: 1 }, // e.g. 40
    practicalBatches: { type: [practicalBatchSchema], default: [] },
  },
  { _id: true }
);

const semesterSchema = new mongoose.Schema(
  {
    semesterNumber: { type: Number, required: true, min: 1, max: 12 },
    academicGroups: { type: [academicGroupSchema], default: [] },
  },
  { _id: true }
);

const programmeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Programme name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Programme code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    academicYear: {
      type: String,
      required: true,
      default: '2026-2027',
    },
    department: {
      type: String,
      default: 'Cyber Security & Digital Forensics',
      trim: true,
    },
    semesters: {
      type: [semesterSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Programme = mongoose.model('Programme', programmeSchema);
