import { generateDayTimeSlots, isValidConsecutiveBlock, intervalsOverlap, timeToMinutes } from './timeSlots.js';
import { validateSessionAssignment, validateCompleteSchedule, computePreferenceScore, studentTargetsConflict } from './constraintValidator.js';
import { analyzeInfeasibility } from './diagnostics.js';

/**
 * Generate discrete session variables that need to be scheduled.
 */
export function buildSessionVariables(subjects, programme, semesterNumber) {
  const semester = programme.semesters.find((s) => s.semesterNumber === semesterNumber);
  if (!semester) return [];

  const variables = [];
  let varCounter = 1;

  for (const group of semester.academicGroups) {
    for (const subject of subjects) {
      if (!subject.isActive) continue;

      const faculty = subject.primaryFaculty;
      if (!faculty) continue;

      // Theory sessions (whole class, single periods)
      const theoryPeriods = subject.theoryPeriodsPerWeek || 0;
      for (let i = 0; i < theoryPeriods; i++) {
        variables.push({
          sessionId: `VAR_${String(varCounter++).padStart(3, '0')}`,
          subjectId: subject._id,
          subjectCode: subject.code,
          subjectName: subject.name,
          facultyId: faculty._id,
          facultyCode: faculty.facultyId,
          facultyName: faculty.name,
          programmeCode: programme.code,
          semesterNumber,
          groupCode: group.groupCode,
          batchCode: null,
          studentCount: group.totalStrength,
          sessionType: 'theory',
          durationPeriods: 1,
          requiredRoomType: subject.requiredRoomType || 'lecture_hall',
          preferredRoomNumber: null,
          isLocked: false,
        });
      }

      // Practical sessions (batches, consecutive multi-period blocks)
      const practicalCount = subject.practicalSessionsPerWeek || 0;
      const consecutive = subject.practicalConsecutivePeriods || 2;

      if (practicalCount > 0) {
        if (subject.requiresBatchSplitForPractical && group.practicalBatches?.length > 0) {
          for (const batch of group.practicalBatches) {
            for (let i = 0; i < practicalCount; i++) {
              variables.push({
                sessionId: `VAR_${String(varCounter++).padStart(3, '0')}`,
                subjectId: subject._id,
                subjectCode: subject.code,
                subjectName: subject.name,
                facultyId: faculty._id,
                facultyCode: faculty.facultyId,
                facultyName: faculty.name,
                programmeCode: programme.code,
                semesterNumber,
                groupCode: group.groupCode,
                batchCode: batch.batchCode,
                studentCount: batch.strength,
                sessionType: 'practical',
                durationPeriods: consecutive,
                requiredRoomType: 'laboratory',
                preferredRoomNumber: null,
                isLocked: false,
              });
            }
          }
        } else {
          // Whole class practical
          for (let i = 0; i < practicalCount; i++) {
            variables.push({
              sessionId: `VAR_${String(varCounter++).padStart(3, '0')}`,
              subjectId: subject._id,
              subjectCode: subject.code,
              subjectName: subject.name,
              facultyId: faculty._id,
              facultyCode: faculty.facultyId,
              facultyName: faculty.name,
              programmeCode: programme.code,
              semesterNumber,
              groupCode: group.groupCode,
              batchCode: null,
              studentCount: group.totalStrength,
              sessionType: 'practical',
              durationPeriods: consecutive,
              requiredRoomType: 'laboratory',
              preferredRoomNumber: null,
              isLocked: false,
            });
          }
        }
      }
    }
  }

  return variables;
}

/**
 * Generates initial valid candidate domain values for a session variable
 */
export function generateDomainForVariable(sessionVar, context, existingLockedSessions = []) {
  const { institutionSettings, facultyMap, roomMap, daySlotsMap } = context;
  const workingDays = institutionSettings.workingDays || [];
  const duration = sessionVar.durationPeriods || 1;
  const faculty = facultyMap.get(sessionVar.facultyCode);

  const domain = [];

  for (const day of workingDays) {
    // Check faculty working day
    if (faculty && faculty.availableDays?.length && !faculty.availableDays.includes(day)) {
      continue;
    }

    const daySlots = daySlotsMap.get(day) || [];

    for (let slotIdx = 0; slotIdx <= daySlots.length - duration; slotIdx++) {
      // Must be a valid non-break consecutive block
      if (!isValidConsecutiveBlock(daySlots, slotIdx, duration)) {
        continue;
      }

      const startSlot = daySlots[slotIdx];
      const endSlot = daySlots[slotIdx + duration - 1];
      const startTime = startSlot.startTime;
      const endTime = endSlot.endTime;

      // Faculty unavailable slots & fixed commitments check
      if (faculty) {
        const isUnavailable = (faculty.unavailableSlots || []).some((u) =>
          u.day === day && intervalsOverlap(startTime, endTime, u.startTime, u.endTime)
        );
        const hasFixedCommitment = (faculty.fixedCommitments || []).some((fc) =>
          fc.day === day && intervalsOverlap(startTime, endTime, fc.startTime, fc.endTime)
        );
        if (isUnavailable || hasFixedCommitment) {
          continue;
        }

        // Faculty working time range check
        const dayRanges = (faculty.availableTimeRanges || []).filter((r) => r.day === day);
        if (dayRanges.length > 0) {
          const sMin = startSlot.startMinutes;
          const eMin = endSlot.endMinutes;
          const fits = dayRanges.some((r) => sMin >= timeToMinutes(r.startTime) && eMin <= timeToMinutes(r.endTime));
          if (!fits) continue;
        }
      }

      // Find compatible candidate rooms
      for (const room of roomMap.values()) {
        if (!room.isActive || !room.isAvailable) continue;

        // Room capacity check
        if (room.capacity < sessionVar.studentCount) continue;

        // Room type suitability check (practicals require laboratory)
        if (sessionVar.sessionType === 'practical' && room.roomType !== 'laboratory') {
          continue;
        }
        if (sessionVar.sessionType === 'theory' && room.roomType === 'laboratory') {
          // Keep laboratories reserved for practicals whenever possible
          continue;
        }

        const candidateCandidate = {
          day,
          slotIndex: slotIdx,
          startTime,
          endTime,
          roomNumber: room.roomNumber,
          roomId: room._id,
        };

        // Check compatibility against locked sessions
        const candidateSessionObj = {
          ...sessionVar,
          ...candidateCandidate,
        };

        const lockedConflict = validateSessionAssignment(candidateSessionObj, existingLockedSessions, context);
        if (!lockedConflict.isValid) {
          continue;
        }

        domain.push(candidateCandidate);
      }
    }
  }

  return domain;
}

/**
 * Main Constraint-Satisfaction Timetable Solver
 */
export async function generateTimetableSchedule({
  institutionSettings,
  programme,
  semesterNumber,
  subjects,
  facultyList,
  rooms,
  lockedSessions = [],
  options = {},
}) {
  const startTime = Date.now();
  const maxIterations = options.maxIterations || 40000;
  const timeoutMs = options.timeoutMs || 15000;

  // Build context maps
  const facultyMap = new Map();
  for (const f of facultyList) {
    facultyMap.set(f.facultyId, f);
    facultyMap.set(String(f._id), f);
  }

  const roomMap = new Map();
  for (const r of rooms) {
    roomMap.set(r.roomNumber, r);
    roomMap.set(String(r._id), r);
  }

  const daySlotsMap = new Map();
  for (const day of institutionSettings.workingDays || []) {
    daySlotsMap.set(day, generateDayTimeSlots(institutionSettings));
  }

  const context = {
    institutionSettings,
    facultyMap,
    roomMap,
    daySlotsMap,
  };

  // 1. Separate locked sessions and retain them
  const preservedLockedSessions = lockedSessions.map((s) => ({
    ...s,
    isLocked: true,
  }));

  // 2. Build session variables to schedule
  const allVariables = buildSessionVariables(subjects, programme, semesterNumber);

  // Filter out variables that are already covered by locked sessions
  const unassignedVariables = [];
  for (const v of allVariables) {
    const isLockedMatch = preservedLockedSessions.some(
      (ls) =>
        ls.subjectCode === v.subjectCode &&
        ls.groupCode === v.groupCode &&
        (ls.batchCode || null) === (v.batchCode || null) &&
        ls.sessionType === v.sessionType
    );

    if (!isLockedMatch) {
      unassignedVariables.push(v);
    }
  }

  // 3. Pre-generate candidate domains for all unassigned variables
  const domains = new Map();
  for (const v of unassignedVariables) {
    const domain = generateDomainForVariable(v, context, preservedLockedSessions);
    domains.set(v.sessionId, domain);
  }

  // Quick initial infeasibility check: does any variable have an empty domain right from the start?
  const emptyVars = unassignedVariables.filter((v) => (domains.get(v.sessionId) || []).length === 0);
  if (emptyVars.length > 0) {
    const diagnostics = analyzeInfeasibility(emptyVars, preservedLockedSessions, context, 'infeasible');
    return {
      success: false,
      schedule: preservedLockedSessions,
      diagnostics,
      metrics: {
        hardConstraintViolations: emptyVars.length,
        softPreferenceScore: 0,
        unassignedSessionsCount: unassignedVariables.length,
      },
    };
  }

  // Working state for recursive backtracking
  let iterations = 0;
  let solutionSchedule = null;
  const currentSchedule = [...preservedLockedSessions];

  /**
   * Backtracking Search with MRV & Forward Checking
   */
  function backtrack(remainingVars, currentDomains) {
    iterations++;

    // Guard search limits
    if (iterations > maxIterations) {
      return 'timeout';
    }
    if (Date.now() - startTime > timeoutMs) {
      return 'timeout';
    }

    // Base case: all variables successfully assigned!
    if (remainingVars.length === 0) {
      solutionSchedule = [...currentSchedule];
      return 'solved';
    }

    // Variable Ordering Heuristic: MRV (Minimum Remaining Values)
    // Pick the variable with the smallest candidate domain
    let chosenVarIdx = 0;
    let minDomainSize = Infinity;

    for (let i = 0; i < remainingVars.length; i++) {
      const v = remainingVars[i];
      const domainSize = (currentDomains.get(v.sessionId) || []).length;

      if (domainSize < minDomainSize) {
        minDomainSize = domainSize;
        chosenVarIdx = i;
      } else if (domainSize === minDomainSize) {
        // Degree Heuristic tie-breaker: prefer higher duration (practicals)
        if (v.durationPeriods > remainingVars[chosenVarIdx].durationPeriods) {
          chosenVarIdx = i;
        }
      }
    }

    const currentVar = remainingVars[chosenVarIdx];
    const candidateSlots = currentDomains.get(currentVar.sessionId) || [];

    // If chosen variable has empty domain, fail and backtrack
    if (candidateSlots.length === 0) {
      return 'backtrack';
    }

    const nextRemainingVars = remainingVars.filter((_, idx) => idx !== chosenVarIdx);

    // Value Ordering Heuristic: Rank slots to balance days across the week
    const sortedSlots = [...candidateSlots].sort((slotA, slotB) => {
      // Prioritize days with fewer assigned sessions for this group
      const countA = currentSchedule.filter((s) => s.day === slotA.day && s.groupCode === currentVar.groupCode).length;
      const countB = currentSchedule.filter((s) => s.day === slotB.day && s.groupCode === currentVar.groupCode).length;
      return countA - countB;
    });

    for (const slotChoice of sortedSlots) {
      const newSession = {
        ...currentVar,
        day: slotChoice.day,
        slotIndex: slotChoice.slotIndex,
        startTime: slotChoice.startTime,
        endTime: slotChoice.endTime,
        roomNumber: slotChoice.roomNumber,
        roomId: slotChoice.roomId,
      };

      // Verify assignment validity against current schedule
      const val = validateSessionAssignment(newSession, currentSchedule, context);
      if (!val.isValid) {
        continue;
      }

      // Tentatively assign
      currentSchedule.push(newSession);

      // Forward Checking: Prune domains of remaining variables
      let forwardCheckPassed = true;
      const prunedDomains = new Map();

      for (const remaining of nextRemainingVars) {
        const oldDomain = currentDomains.get(remaining.sessionId) || [];
        const newDomain = [];

        for (const cand of oldDomain) {
          // Check collision between newSession and candidate slot
          const sameDay = cand.day === newSession.day;
          const overlap = sameDay && intervalsOverlap(cand.startTime, cand.endTime, newSession.startTime, newSession.endTime);

          if (overlap) {
            // Check faculty collision
            if (cand.facultyCode === newSession.facultyCode || remaining.facultyCode === newSession.facultyCode) {
              continue;
            }
            // Check room collision
            if (cand.roomNumber === newSession.roomNumber) {
              continue;
            }
            // Check student group / batch collision
            const candidateObj = { ...remaining, ...cand };
            if (studentTargetsConflict(candidateObj, newSession)) {
              continue;
            }
          }

          newDomain.push(cand);
        }

        if (newDomain.length === 0) {
          forwardCheckPassed = false;
          break; // Immediate dead-end detected via forward checking
        }

        prunedDomains.set(remaining.sessionId, newDomain);
      }

      if (forwardCheckPassed) {
        const result = backtrack(nextRemainingVars, prunedDomains);
        if (result === 'solved') return 'solved';
        if (result === 'timeout') return 'timeout';
      }

      // Undo assignment (backtrack)
      currentSchedule.pop();
    }

    return 'backtrack';
  }

  // Run solver
  const searchResult = backtrack(unassignedVariables, domains);
  const timeTakenMs = Date.now() - startTime;

  if (searchResult === 'solved' && solutionSchedule) {
    const finalValidation = validateCompleteSchedule(solutionSchedule, context);
    const preferenceScore = computePreferenceScore(solutionSchedule, context);

    return {
      success: true,
      schedule: solutionSchedule,
      metrics: {
        hardConstraintViolations: finalValidation.violations.length,
        softPreferenceScore: preferenceScore,
        unassignedSessionsCount: 0,
      },
      diagnostics: {
        status: 'solved',
        conflictMessages: [],
        suggestions: ['Schedule satisfies all mandatory academic constraints and optimizes soft preferences.'],
        iterationsCount: iterations,
        timeTakenMs,
      },
    };
  }

  // If solver did not find complete solution, diagnose the unassigned sessions
  const scheduledSessionIds = new Set(currentSchedule.map((s) => s.sessionId));
  const unassigned = unassignedVariables.filter((v) => !scheduledSessionIds.has(v.sessionId));

  const diagnostics = analyzeInfeasibility(
    unassigned,
    currentSchedule,
    context,
    searchResult === 'timeout' ? 'timeout' : 'infeasible'
  );
  diagnostics.iterationsCount = iterations;
  diagnostics.timeTakenMs = timeTakenMs;

  return {
    success: false,
    schedule: currentSchedule, // Return partial draft
    diagnostics,
    metrics: {
      hardConstraintViolations: unassigned.length,
      softPreferenceScore: computePreferenceScore(currentSchedule, context),
      unassignedSessionsCount: unassigned.length,
    },
  };
}
