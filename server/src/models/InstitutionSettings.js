import mongoose from 'mongoose';

const breakPeriodSchema = new mongoose.Schema(
  {
    name: { type: String, required: true }, // e.g., "Tea Break", "Lunch Break"
    startTime: { type: String, required: true }, // "13:00"
    endTime: { type: String, required: true }, // "14:00"
  },
  { _id: false }
);

const institutionSettingsSchema = new mongoose.Schema(
  {
    institutionName: {
      type: String,
      default: 'School of Cyber Security and Digital Forensics, NFSU, Gandhinagar',
      required: true,
      trim: true,
    },
    academicYear: {
      type: String,
      default: '2026-27',
      required: true,
    },
    workingDays: {
      type: [String],
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    },
    dayStartTime: {
      type: String,
      default: '10:30',
      required: true,
    },
    dayEndTime: {
      type: String,
      default: '17:30',
      required: true,
    },
    periodDurationMinutes: {
      type: Number,
      default: 60,
      min: 30,
      max: 120,
    },
    breakPeriods: {
      type: [breakPeriodSchema],
      default: [
        { name: 'Lunch Break', startTime: '13:30', endTime: '14:30' }
      ],
    },
    maxConsecutiveTeachingPeriods: {
      type: Number,
      default: 3,
      min: 1,
      max: 6,
    },
    timeZone: {
      type: String,
      default: 'Asia/Kolkata',
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

export const InstitutionSettings = mongoose.model('InstitutionSettings', institutionSettingsSchema);
