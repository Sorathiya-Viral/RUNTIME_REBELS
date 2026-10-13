import { intervalsOverlap, timeToMinutes } from './timeSlots.js';

/**
 * Validates whether two academic student targets conflict with each other.
 * Rules:
 * 1. If group codes differ (e.g. DFIS-S1-A vs DFIS-S1-B), no conflict.
 * 2. If group codes match:
 *    - If either session is for the entire class (batchCode is null or empty), CONFLICT!
 *    - If both sessions target the exact same batch (e.g. both 'B1'), CONFLICT!
 *    - If they target disjoint batches (e.g. 'B1' and 'B2'), NO CONFLICT!
 */
export function studentTargetsConflict(sessionA, sessionB) {
  if (sessionA.groupCode !== sessionB.groupCode) {
    return false;
  }

  // Same group
  if (!sessionA.batchCode || !sessionB.batchCode) {
    // At least one is a whole-class lecture, so it involves all students
    return true;
  }

  // Both have specific batches: conflict only if targeting the same batch
  return sessionA.batchCode === sessionB.batchCode;
}

/**
 * Checks a candidate session against an existing list of scheduled sessions and constraints.
 * Returns { isValid: boolean, violations: string[] }
 */
export function validateSessionAssignment(candidateSession, existingSessions, context) {
  const violations = [];
  const { institutionSettings, facultyMap, roomMap } = context;

  const candidateStartMins = timeToMinutes(candidateSession.startTime);
  const candidateEndMins = timeToMinutes(candidateSession.endTime);

  // HC1: Working hours check
  const dayStartMins = timeToMinutes(institutionSettings.dayStartTime);
  const dayEndMins = timeToMinutes(institutionSettings.dayEndTime);
  if (candidateStartMins < dayStartMins || candidateEndMins > dayEndMins) {
    violations.push(
      `Session ${candidateSession.startTime}-${candidateSession.endTime} exceeds university working hours (${institutionSettings.dayStartTime}-${institutionSettings.dayEndTime}).`
    );
  }

  // HC2: Break period overlap check
  if (institutionSettings.breakPeriods?.length) {
    for (const bp of institutionSettings.breakPeriods) {
      if (intervalsOverlap(candidateSession.startTime, candidateSession.endTime, bp.startTime, bp.endTime)) {
        violations.push(
          `Session overlaps scheduled break '${bp.name}' (${bp.startTime}-${bp.endTime}).`
        );
      }
    }
  }

  // HC14: Room active & available
  const room = roomMap.get(candidateSession.roomNumber) || roomMap.get(String(candidateSession.roomId));
  if (!room || !room.isActive || !room.isAvailable) {
    violations.push(`Room ${candidateSession.roomNumber} is inactive or marked unavailable.`);
  }

  // HC8: Practical requires laboratory
  if (candidateSession.sessionType === 'practical' && room && room.roomType !== 'laboratory') {
    violations.push(
      `Practical session for ${candidateSession.subjectCode} requires a laboratory room, but '${room.roomNumber}' is a ${room.roomType}.`
    );
  }

  // HC7: Room capacity check
  if (room && candidateSession.studentCount && room.capacity < candidateSession.studentCount) {
    violations.push(
      `Room ${room.roomNumber} capacity (${room.capacity}) cannot accommodate student strength (${candidateSession.studentCount}).`
    );
  }

  // Faculty availability & fixed commitments checks
  const faculty = facultyMap.get(candidateSession.facultyCode) || facultyMap.get(String(candidateSession.facultyId));
  if (faculty) {
    // Check available days
    if (faculty.availableDays?.length && !faculty.availableDays.includes(candidateSession.day)) {
      violations.push(`Faculty ${faculty.name} is not available on ${candidateSession.day}.`);
    }

    // Check available time ranges
    const dayRanges = (faculty.availableTimeRanges || []).filter((r) => r.day === candidateSession.day);
    if (dayRanges.length > 0) {
      const isWithinAnyRange = dayRanges.some((r) => {
        const rStart = timeToMinutes(r.startTime);
        const rEnd = timeToMinutes(r.endTime);
        return candidateStartMins >= rStart && candidateEndMins <= rEnd;
      });
      if (!isWithinAnyRange) {
        violations.push(`Session falls outside faculty ${faculty.name}'s declared working hours on ${candidateSession.day}.`);
      }
    }

    // Check unavailable slots
    const dayUnavailables = (faculty.unavailableSlots || []).filter((u) => u.day === candidateSession.day);
    for (const unavail of dayUnavailables) {
      if (intervalsOverlap(candidateSession.startTime, candidateSession.endTime, unavail.startTime, unavail.endTime)) {
        violations.push(
          `Faculty ${faculty.name} has an unavailable slot on ${candidateSession.day} (${unavail.startTime}-${unavail.endTime}): ${unavail.reason}.`
        );
      }
    }

    // HC11: Fixed teaching commitments
    const fixedCommitments = (faculty.fixedCommitments || []).filter((fc) => fc.day === candidateSession.day);
    for (const fc of fixedCommitments) {
      if (intervalsOverlap(candidateSession.startTime, candidateSession.endTime, fc.startTime, fc.endTime)) {
        violations.push(
          `Faculty ${faculty.name} has a fixed institutional commitment on ${candidateSession.day} (${fc.startTime}-${fc.endTime}): ${fc.description}.`
        );
      }
    }
  }

  // Compare against all already scheduled sessions
  for (const session of existingSessions) {
    // Only check collision if on the same day
    if (session.day !== candidateSession.day) continue;

    // Check if intervals overlap
    if (!intervalsOverlap(candidateSession.startTime, candidateSession.endTime, session.startTime, session.endTime)) {
      continue;
    }

    // HC3: Faculty overlap
    if (session.facultyCode === candidateSession.facultyCode) {
      violations.push(
        `Faculty conflict: ${candidateSession.facultyName} is already scheduled for ${session.subjectCode} on ${candidateSession.day} at ${session.startTime}-${session.endTime}.`
      );
    }

    // HC4: Room overlap
    if (session.roomNumber === candidateSession.roomNumber) {
      violations.push(
        `Room conflict: Room ${candidateSession.roomNumber} is already occupied by ${session.subjectCode} on ${candidateSession.day} at ${session.startTime}-${session.endTime}.`
      );
    }

    // HC5 & HC6: Student group and practical batch overlap
    if (studentTargetsConflict(candidateSession, session)) {
      const batchA = candidateSession.batchCode ? `(${candidateSession.batchCode})` : '(Full Class)';
      const batchB = session.batchCode ? `(${session.batchCode})` : '(Full Class)';
      violations.push(
        `Student schedule conflict: Group ${candidateSession.groupCode} ${batchA} has overlapping session ${session.subjectCode} ${batchB} on ${candidateSession.day} at ${session.startTime}-${session.endTime}.`
      );
    }
  }

  return {
    isValid: violations.length === 0,
    violations,
  };
}

/**
 * Validates an entire timetable schedule against all hard constraints.
 * Returns { isValid: boolean, violations: string[], sessionViolationMap: Record<string, string[]> }
 */
export function validateCompleteSchedule(sessions, context) {
  const allViolations = [];
  const sessionViolationMap = {};

  for (let i = 0; i < sessions.length; i++) {
    const session = sessions[i];
    // Exclude the current session from other sessions to test it
    const otherSessions = sessions.filter((_, idx) => idx !== i);

    const validation = validateSessionAssignment(session, otherSessions, context);
    if (!validation.isValid) {
      sessionViolationMap[session.sessionId || i] = validation.violations;
      for (const v of validation.violations) {
        if (!allViolations.includes(v)) {
          allViolations.push(v);
        }
      }
    }
  }

  return {
    isValid: allViolations.length === 0,
    violations: allViolations,
    sessionViolationMap,
  };
}

/**
 * Computes soft preference quality score (0 to 100).
 * Evaluates:
 * 1. Faculty workload balance across days (40% weight)
 * 2. Daily subject distribution (30% weight)
 * 3. Schedule gap avoidance for students (30% weight)
 */
export function computePreferenceScore(sessions, context) {
  if (!sessions || sessions.length === 0) return 100;

  let balanceDeductions = 0;
  let distributionDeductions = 0;
  let gapDeductions = 0;

  // 1. Faculty workload distribution across days
  const facultyDayCounts = {};
  for (const s of sessions) {
    if (!facultyDayCounts[s.facultyCode]) facultyDayCounts[s.facultyCode] = {};
    facultyDayCounts[s.facultyCode][s.day] = (facultyDayCounts[s.facultyCode][s.day] || 0) + (s.durationPeriods || 1);
  }

  for (const [faculty, days] of Object.entries(facultyDayCounts)) {
    const dayCounts = Object.values(days);
    if (dayCounts.length > 1) {
      const maxPeriods = Math.max(...dayCounts);
      const minPeriods = Math.min(...dayCounts);
      if (maxPeriods - minPeriods > 2) {
        balanceDeductions += 5; // Slight penalty for skewed teaching loads
      }
    }
  }

  // 2. Daily distribution of subjects (avoid scheduling 3 lectures of the same subject on the same day)
  const groupSubjectDayCounts = {};
  for (const s of sessions) {
    if (s.sessionType === 'theory') {
      const key = `${s.groupCode}_${s.subjectCode}`;
      if (!groupSubjectDayCounts[key]) groupSubjectDayCounts[key] = {};
      groupSubjectDayCounts[key][s.day] = (groupSubjectDayCounts[key][s.day] || 0) + 1;
    }
  }

  for (const [, days] of Object.entries(groupSubjectDayCounts)) {
    for (const count of Object.values(days)) {
      if (count > 1) {
        distributionDeductions += (count - 1) * 8; // Penalty for multiple theory lectures of same subject on same day
      }
    }
  }

  // 3. Student group idle gaps
  const groupDaySlots = {};
  for (const s of sessions) {
    const key = `${s.groupCode}_${s.day}`;
    if (!groupDaySlots[key]) groupDaySlots[key] = [];
    groupDaySlots[key].push(s.slotIndex);
  }

  for (const [, slots] of Object.entries(groupDaySlots)) {
    if (slots.length > 1) {
      slots.sort((a, b) => a - b);
      for (let i = 0; i < slots.length - 1; i++) {
        const gap = slots[i + 1] - slots[i] - 1;
        if (gap > 1) {
          gapDeductions += gap * 4; // Penalty for long idle waiting gaps
        }
      }
    }
  }

  const totalScore = Math.max(0, Math.min(100, Math.round(100 - (balanceDeductions + distributionDeductions + gapDeductions))));
  return totalScore;
}
