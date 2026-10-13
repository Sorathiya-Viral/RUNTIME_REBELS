import mongoose from 'mongoose';

const subjectSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Subject code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Subject name is required'],
      trim: true,
    },
    programmeCode: {
      type: String,
      required: [true, 'Programme code is required'],
      uppercase: true,
      trim: true,
      index: true,
    },
    semesterNumber: {
      type: Number,
      required: [true, 'Semester number is required'],
      min: 1,
      max: 12,
      index: true,
    },
    subjectType: {
      type: String,
      enum: ['theory', 'practical', 'integrated'],
      default: 'theory',
    },
    assignedFaculty: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty',
      },
    ],
    primaryFaculty: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Faculty',
      required: [true, 'Primary faculty is required'],
    },
    theoryPeriodsPerWeek: {
      type: Number,
      default: 3,
      min: 0,
      max: 10,
    },
    practicalSessionsPerWeek: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    practicalConsecutivePeriods: {
      type: Number,
      default: 2,
      min: 1,
      max: 4,
    },
    requiredRoomType: {
      type: String,
      enum: ['lecture_hall', 'laboratory', 'seminar_hall'],
      default: 'lecture_hall',
    },
    requiredLabEquipment: {
      type: [String],
      default: [],
    },
    applicableGroupCodes: {
      type: [String],
      default: [],
    },
    requiresBatchSplitForPractical: {
      type: Boolean,
      default: true,
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

export const Subject = mongoose.model('Subject', subjectSchema);
