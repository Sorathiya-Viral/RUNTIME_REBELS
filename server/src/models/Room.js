import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    roomNumber: {
      type: String,
      required: [true, 'Room number/code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true,
    },
    roomType: {
      type: String,
      enum: {
        values: ['lecture_hall', 'laboratory', 'seminar_hall'],
        message: '{VALUE} is not a valid room type',
      },
      required: true,
      index: true,
    },
    capacity: {
      type: Number,
      required: [true, 'Capacity is required'],
      min: [5, 'Capacity must be at least 5'],
      max: [500, 'Capacity cannot exceed 500'],
    },
    labEquipment: {
      type: [String],
      default: [],
    },
    building: {
      type: String,
      default: 'Cyber Block',
      trim: true,
    },
    floor: {
      type: Number,
      default: 1,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Room = mongoose.model('Room', roomSchema);
