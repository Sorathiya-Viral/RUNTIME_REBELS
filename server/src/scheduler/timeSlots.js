/**
 * Time Slot and Mathematical Interval Engine
 * Computes discrete periods, validates boundaries, and performs precise interval arithmetic.
 */

/**
 * Converts "HH:mm" time string to minutes from midnight (0 to 1439)
 */
export function timeToMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return 0;
  const [hours, minutes] = timeStr.split(':').map((v) => parseInt(v, 10));
  return hours * 60 + (minutes || 0);
}

/**
 * Converts minutes from midnight to "HH:mm" time string
 */
export function minutesToTime(mins) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Determines whether two time intervals overlap.
 * Intervals are half-open [start, end), so [09:00, 10:00) and [10:00, 11:00) do NOT overlap.
 */
export function intervalsOverlap(startA, endA, startB, endB) {
  const aStart = typeof startA === 'number' ? startA : timeToMinutes(startA);
  const aEnd = typeof endA === 'number' ? endA : timeToMinutes(endA);
  const bStart = typeof startB === 'number' ? startB : timeToMinutes(startB);
  const bEnd = typeof endB === 'number' ? endB : timeToMinutes(endB);

  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

/**
 * Generates discrete standard period slots for a day based on institution settings.
 * Skips or flags break intervals.
 */
export function generateDayTimeSlots(settings) {
  const dayStartMins = timeToMinutes(settings.dayStartTime || '09:00');
  const dayEndMins = timeToMinutes(settings.dayEndTime || '17:00');
  const duration = settings.periodDurationMinutes || 60;
  const breakPeriods = settings.breakPeriods || [];

  const slots = [];
  let currentStart = dayStartMins;
  let slotIndex = 0;

  while (currentStart + duration <= dayEndMins) {
    const currentEnd = currentStart + duration;
    const startTimeStr = minutesToTime(currentStart);
    const endTimeStr = minutesToTime(currentEnd);

    // Check if this slot overlaps any scheduled break period
    const overlappingBreak = breakPeriods.find((bp) =>
      intervalsOverlap(startTimeStr, endTimeStr, bp.startTime, bp.endTime)
    );

    slots.push({
      slotIndex,
      startTime: startTimeStr,
      endTime: endTimeStr,
      startMinutes: currentStart,
      endMinutes: currentEnd,
      isBreak: Boolean(overlappingBreak),
      breakName: overlappingBreak ? overlappingBreak.name : null,
    });

    currentStart = currentEnd;
    slotIndex++;
  }

  return slots;
}

/**
 * Checks if a multi-period consecutive block is valid on a given day's slots.
 * Returns true if all slots starting from `slotIndex` for `consecutiveCount` periods exist and are non-break.
 */
export function isValidConsecutiveBlock(daySlots, startSlotIndex, consecutiveCount) {
  if (startSlotIndex + consecutiveCount > daySlots.length) {
    return false;
  }

  for (let i = 0; i < consecutiveCount; i++) {
    const slot = daySlots[startSlotIndex + i];
    if (!slot || slot.isBreak) {
      return false;
    }
  }

  return true;
}
