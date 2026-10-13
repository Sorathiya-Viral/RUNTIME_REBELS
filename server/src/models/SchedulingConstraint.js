import mongoose from 'mongoose';

const schedulingConstraintSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Constraint name is required'],
      trim: true,
    },
    constraintType: {
      type: String,
      enum: ['hard', 'soft'],
      required: true,
      default: 'hard',
      index: true,
    },
    category: {
      type: String,
      enum: [
        'faculty_availability',
        'room_capacity',
        'room_suitability',
        'consecutive_limit',
        'daily_distribution',
        'preferred_slot',
        'no_overlap',
        'break_exclusion',
        'custom',
      ],
      required: true,
      index: true,
    },
    targetEntity: {
      type: String,
      enum: ['institution', 'programme', 'group', 'faculty', 'room', 'subject'],
      required: true,
    },
    targetId: {
      type: String, // Can be ID or Code like FAC-DFIS-01, DFIS101, etc.
      default: 'ALL',
    },
    parameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    priority: {
      type: Number,
      min: 1,
      max: 10,
      default: 5, // For soft constraints: 1 (lowest) to 10 (highest)
    },
    description: {
      type: String,
      trim: true,
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

export const SchedulingConstraint = mongoose.model('SchedulingConstraint', schedulingConstraintSchema);
