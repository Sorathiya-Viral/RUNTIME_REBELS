import { intervalsOverlap, timeToMinutes } from './timeSlots.js';

/**
 * Infeasibility Diagnostic Engine
 * Analyzes unassigned sessions and produces actionable forensic reports.
 */
export function analyzeInfeasibility(unassignedVars, currentSchedule, context, failureReason = 'infeasible') {
  const { institutionSettings, facultyMap, roomMap, daySlotsMap } = context;
  const workingDays = institutionSettings.workingDays || [];

  const unassignedDetails = [];
  const conflictMessages = [];
  const suggestions = [];

  for (const sessionVar of unassignedVars) {
    const faculty = facultyMap.get(sessionVar.facultyCode) || facultyMap.get(String(sessionVar.facultyId));
    const isPractical = sessionVar.sessionType === 'practical';
    const duration = sessionVar.durationPeriods || 1;

    let totalCandidateSlotsTested = 0;
    let facultyUnavailableBlocks = 0;
    let facultyOverlapBlocks = 0;
    let roomCapacityBlocks = 0;
    let roomOccupiedBlocks = 0;
    let roomTypeBlocks = 0;
    let groupCollisionBlocks = 0;
    let breakCollisionBlocks = 0;

    // Test across all days and slots
    for (const day of workingDays) {
      const slots = daySlotsMap.get(day) || [];

      for (let sIdx = 0; sIdx <= slots.length - duration; sIdx++) {
        totalCandidateSlotsTested++;

        const startSlot = slots[sIdx];
        const endSlot = slots[sIdx + duration - 1];

        // Break check
        let hitBreak = false;
        for (let k = 0; k < duration; k++) {
          if (slots[sIdx + k].isBreak) {
            hitBreak = true;
            break;
          }
        }
        if (hitBreak) {
          breakCollisionBlocks++;
          continue;
        }

        // Faculty availability check
        if (faculty) {
          if (!faculty.availableDays.includes(day)) {
            facultyUnavailableBlocks++;
            continue;
          }

          const slotStartMins = startSlot.startMinutes;
          const slotEndMins = endSlot.endMinutes;

          const isUnavailable = (faculty.unavailableSlots || []).some(
            (u) => u.day === day && intervalsOverlap(startSlot.startTime, endSlot.endTime, u.startTime, u.endTime)
          );
          const hasFixedCommitment = (faculty.fixedCommitments || []).some(
            (fc) => fc.day === day && intervalsOverlap(startSlot.startTime, endSlot.endTime, fc.startTime, fc.endTime)
          );

          if (isUnavailable || hasFixedCommitment) {
            facultyUnavailableBlocks++;
            continue;
          }

          // Faculty already scheduled in current partial schedule
          const hasScheduledFacultyConflict = currentSchedule.some(
            (cs) => cs.day === day && cs.facultyCode === sessionVar.facultyCode &&
              intervalsOverlap(startSlot.startTime, endSlot.endTime, cs.startTime, cs.endTime)
          );
          if (hasScheduledFacultyConflict) {
            facultyOverlapBlocks++;
            continue;
          }
        }

        // Student group availability
        const hasGroupConflict = currentSchedule.some(
          (cs) => cs.day === day && cs.groupCode === sessionVar.groupCode &&
            (!sessionVar.batchCode || !cs.batchCode || sessionVar.batchCode === cs.batchCode) &&
            intervalsOverlap(startSlot.startTime, endSlot.endTime, cs.startTime, cs.endTime)
        );
        if (hasGroupConflict) {
          groupCollisionBlocks++;
          continue;
        }

        // Room availability & type check
        const candidateRooms = Array.from(roomMap.values()).filter(
          (r) => r.isActive && r.isAvailable && (!isPractical || r.roomType === 'laboratory')
        );

        if (candidateRooms.length === 0) {
          roomTypeBlocks++;
          continue;
        }

        const capacityFittingRooms = candidateRooms.filter((r) => r.capacity >= sessionVar.studentCount);
        if (capacityFittingRooms.length === 0) {
          roomCapacityBlocks++;
          continue;
        }

        // Check if all capacity fitting rooms are occupied
        const allOccupied = capacityFittingRooms.every((r) =>
          currentSchedule.some(
            (cs) => cs.day === day && cs.roomNumber === r.roomNumber &&
              intervalsOverlap(startSlot.startTime, endSlot.endTime, cs.startTime, cs.endTime)
          )
        );

        if (allOccupied) {
          roomOccupiedBlocks++;
        }
      }
    }

    // Determine primary bottleneck
    let primaryBottleneck = 'general_congestion';
    let explanation = '';

    if (roomTypeBlocks > 0 && isPractical) {
      primaryBottleneck = 'no_suitable_laboratory';
      explanation = `Subject ${sessionVar.subjectCode} (${sessionVar.subjectName}) requires a laboratory room, but no active laboratories exist in the system.`;
    } else if (facultyUnavailableBlocks > totalCandidateSlotsTested * 0.7) {
      primaryBottleneck = 'insufficient_faculty_availability';
      explanation = `Faculty ${sessionVar.facultyName} has insufficient available hours or too many fixed commitments to accommodate ${sessionVar.subjectCode}.`;
    } else if (roomCapacityBlocks > totalCandidateSlotsTested * 0.7) {
      primaryBottleneck = 'insufficient_room_capacity';
      explanation = `No available rooms have sufficient capacity for student strength of ${sessionVar.studentCount} in group ${sessionVar.groupCode}.`;
    } else if (groupCollisionBlocks > 0 && facultyOverlapBlocks > 0) {
      primaryBottleneck = 'schedule_congestion';
      explanation = `Both group ${sessionVar.groupCode} and faculty ${sessionVar.facultyName} have heavy scheduling overlap with existing classes on available days.`;
    } else {
      explanation = `Unable to place ${sessionVar.subjectCode} (${sessionVar.sessionType}${sessionVar.batchCode ? ` ${sessionVar.batchCode}` : ''}) due to combined resource constraints within working hours.`;
    }

    unassignedDetails.push({
      sessionId: sessionVar.sessionId,
      subjectCode: sessionVar.subjectCode,
      subjectName: sessionVar.subjectName,
      facultyName: sessionVar.facultyName,
      groupCode: sessionVar.groupCode,
      batchCode: sessionVar.batchCode,
      sessionType: sessionVar.sessionType,
      primaryBottleneck,
      explanation,
      statistics: {
        totalCandidateSlotsTested,
        facultyUnavailableBlocks,
        facultyOverlapBlocks,
        roomOccupiedBlocks,
        roomCapacityBlocks,
        groupCollisionBlocks,
        breakCollisionBlocks,
      },
    });

    conflictMessages.push(explanation);
  }

  // Deduplicate and formulate actionable suggestions
  const bottlenecks = new Set(unassignedDetails.map((d) => d.primaryBottleneck));

  if (bottlenecks.has('no_suitable_laboratory')) {
    suggestions.push('Add at least one active Laboratory facility in Classrooms & Laboratories settings.');
  }
  if (bottlenecks.has('insufficient_faculty_availability')) {
    suggestions.push('Expand available days or remove conflicting fixed commitments for assigned faculty members.');
  }
  if (bottlenecks.has('insufficient_room_capacity')) {
    suggestions.push('Increase room capacities or split the academic group into smaller practical batches.');
  }
  if (bottlenecks.has('schedule_congestion') || bottlenecks.has('general_congestion')) {
    suggestions.push('Consider adding Saturday as a working day or increasing daily operational hours in Institution Settings.');
    suggestions.push('Verify that total weekly teaching hours required across all subjects do not exceed total available room and faculty slots.');
  }

  const isProvenInfeasible = unassignedDetails.some(
    (d) => d.primaryBottleneck === 'no_suitable_laboratory' || d.primaryBottleneck === 'insufficient_room_capacity'
  );

  return {
    status: isProvenInfeasible ? 'infeasible' : failureReason === 'timeout' ? 'timeout' : 'infeasible',
    unassignedDetails,
    conflictMessages: Array.from(new Set(conflictMessages)),
    suggestions: Array.from(new Set(suggestions)),
  };
}
