import mongoose from 'mongoose';
import { Timetable } from '../models/Timetable.js';
import { InstitutionSettings } from '../models/InstitutionSettings.js';
import { Programme } from '../models/Programme.js';
import { Faculty } from '../models/Faculty.js';
import { Room } from '../models/Room.js';
import { Subject } from '../models/Subject.js';
import { generateTimetableSchedule } from '../scheduler/solver.js';
import { validateSessionAssignment, validateCompleteSchedule, computePreferenceScore } from '../scheduler/constraintValidator.js';
import { generateDayTimeSlots, intervalsOverlap } from '../scheduler/timeSlots.js';
import { logAuditEvent } from '../security/auditService.js';

/**
 * Generate a new timetable draft using the CSP Solver
 */
export async function generateTimetable(req, res) {
  const { programmeCode, semesterNumber, academicYear, title } = req.body;

  try {
    const [settings, programme, subjects, facultyList, rooms] = await Promise.all([
      InstitutionSettings.findOne(),
      Programme.findOne({ code: programmeCode.toUpperCase(), isActive: true }),
      Subject.find({ programmeCode: programmeCode.toUpperCase(), semesterNumber, isActive: true })
        .populate('primaryFaculty')
        .populate('assignedFaculty'),
      Faculty.find({ isActive: true }),
      Room.find({ isActive: true, isAvailable: true }),
    ]);

    if (!programme) {
      return res.status(404).json({ success: false, message: `Programme ${programmeCode} not found.` });
    }
    if (!settings) {
      return res.status(400).json({ success: false, message: 'Institution settings not configured.' });
    }
    if (subjects.length === 0) {
      return res.status(400).json({ success: false, message: `No active subjects found for ${programmeCode} Semester ${semesterNumber}.` });
    }

    // Check if there is an existing draft with locked sessions to preserve
    const existingDraft = await Timetable.findOne({
      programmeCode: programmeCode.toUpperCase(),
      semesterNumber,
      status: { $in: ['draft', 'validated'] },
    }).sort({ version: -1 });

    const lockedSessions = existingDraft ? existingDraft.sessions.filter((s) => s.isLocked) : [];

    // Run solver
    const solverResult = await generateTimetableSchedule({
      institutionSettings: settings.toObject(),
      programme: programme.toObject(),
      semesterNumber,
      subjects: subjects.map((s) => s.toObject()),
      facultyList: facultyList.map((f) => f.toObject()),
      rooms: rooms.map((r) => r.toObject()),
      lockedSessions: lockedSessions.map((ls) => ls.toObject ? ls.toObject() : ls),
    });

    // Determine next version number
    const lastVersion = await Timetable.findOne({
      programmeCode: programmeCode.toUpperCase(),
      semesterNumber,
    }).sort({ version: -1 });

    const nextVersion = lastVersion ? lastVersion.version + 1 : 1;

    const newTimetable = new Timetable({
      academicYear: academicYear || settings.academicYear,
      programmeCode: programmeCode.toUpperCase(),
      semesterNumber,
      version: nextVersion,
      status: solverResult.success ? 'validated' : 'draft',
      title: title || `${programme.name} - Sem ${semesterNumber} (v${nextVersion})`,
      sessions: solverResult.schedule,
      qualityMetrics: solverResult.metrics,
      diagnostics: solverResult.diagnostics,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    await newTimetable.save();

    await logAuditEvent({
      req,
      actor: req.user,
      action: 'TIMETABLE_GENERATED',
      resourceType: 'Timetable',
      resourceId: newTimetable._id,
      details: {
        programmeCode,
        semesterNumber,
        version: nextVersion,
        success: solverResult.success,
        scheduledCount: solverResult.schedule.length,
        metrics: solverResult.metrics,
      },
      status: solverResult.success ? 'SUCCESS' : 'FAILURE',
    });

    res.status(201).json({
      success: true,
      message: solverResult.success
        ? 'Timetable generated and validated successfully.'
        : 'Generation encountered constraints. Infeasibility diagnostics generated.',
      timetable: newTimetable,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during timetable generation.' });
  }
}

/**
 * List timetables with optional filters
 */
export async function getTimetables(req, res) {
  try {
    const query = {};
    if (req.query.programmeCode) query.programmeCode = req.query.programmeCode.toUpperCase();
    if (req.query.semesterNumber) query.semesterNumber = parseInt(req.query.semesterNumber, 10);
    if (req.query.status) query.status = req.query.status;

    // Faculty members should only see published timetables unless they are coordinators
    if (req.user.role === 'faculty' || req.user.role === 'viewer') {
      query.status = 'published';
    }

    const timetables = await Timetable.find(query)
      .select('-sessions') // Exclude heavy session list in overview
      .sort({ updatedAt: -1 });

    res.status(200).json({ success: true, timetables });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve timetables.' });
  }
}

/**
 * Get full timetable by ID including sessions and diagnostics
 */
export async function getTimetableById(req, res) {
  try {
    const timetable = await Timetable.findById(req.params.id);
    if (!timetable) {
      return res.status(404).json({ success: false, message: 'Timetable not found.' });
    }

    // Role access restriction: Viewers & Faculty only see published
    if ((req.user.role === 'viewer' || req.user.role === 'faculty') && timetable.status !== 'published') {
      return res.status(403).json({ success: false, message: 'Access denied. You can only view published timetables.' });
    }

    res.status(200).json({ success: true, timetable });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve timetable details.' });
  }
}

/**
 * Manual Session Move with Real-Time Conflict Validation
 */
export async function moveSession(req, res) {
  const { id, sessionId } = req.params;
  const { newDay, newStartTime, newEndTime, newRoomNumber } = req.body;

  try {
    const timetable = await Timetable.findById(id);
    if (!timetable) {
      return res.status(404).json({ success: false, message: 'Timetable not found.' });
    }

    const sessionIndex = timetable.sessions.findIndex((s) => s.sessionId === sessionId || s._id.toString() === sessionId);
    if (sessionIndex === -1) {
      return res.status(404).json({ success: false, message: 'Session not found in this timetable.' });
    }

    const sessionToMove = timetable.sessions[sessionIndex];

    const [settings, facultyList, rooms] = await Promise.all([
      InstitutionSettings.findOne(),
      Faculty.find({ isActive: true }),
      Room.find({ isActive: true }),
    ]);

    const facultyMap = new Map();
    facultyList.forEach((f) => facultyMap.set(f.facultyId, f));
    const roomMap = new Map();
    rooms.forEach((r) => roomMap.set(r.roomNumber, r));
    const daySlotsMap = new Map();
    settings.workingDays.forEach((day) => daySlotsMap.set(day, generateDayTimeSlots(settings)));

    const context = {
      institutionSettings: settings.toObject(),
      facultyMap,
      roomMap,
      daySlotsMap,
    };

    const targetRoom = roomMap.get(newRoomNumber);
    if (!targetRoom) {
      return res.status(400).json({ success: false, message: `Room ${newRoomNumber} does not exist.` });
    }

    // Candidate moved session
    const candidateSession = {
      ...sessionToMove.toObject(),
      day: newDay,
      startTime: newStartTime,
      endTime: newEndTime,
      roomNumber: targetRoom.roomNumber,
      roomId: targetRoom._id,
    };

    // Filter out the session being moved from other sessions
    const otherSessions = timetable.sessions.filter((_, idx) => idx !== sessionIndex);

    // Run hard constraint check
    const validation = validateSessionAssignment(candidateSession, otherSessions, context);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Manual move rejected due to constraint violations.',
        violations: validation.violations,
      });
    }

    // Commit change
    const oldPosition = {
      day: sessionToMove.day,
      startTime: sessionToMove.startTime,
      endTime: sessionToMove.endTime,
      roomNumber: sessionToMove.roomNumber,
    };

    sessionToMove.day = newDay;
    sessionToMove.startTime = newStartTime;
    sessionToMove.endTime = newEndTime;
    sessionToMove.roomNumber = targetRoom.roomNumber;
    sessionToMove.roomId = targetRoom._id;

    // Recalculate metrics
    const wasPublished = timetable.status === 'published';
    const fullCheck = validateCompleteSchedule(timetable.sessions, context);
    timetable.qualityMetrics.hardConstraintViolations = fullCheck.violations.length;
    timetable.qualityMetrics.softPreferenceScore = computePreferenceScore(timetable.sessions, context);
    timetable.status = fullCheck.isValid ? (wasPublished ? 'published' : 'validated') : 'draft';
    timetable.updatedBy = req.user._id;

    await timetable.save();

    await logAuditEvent({
      req,
      actor: req.user,
      action: 'SESSION_MANUALLY_MOVED',
      resourceType: 'Timetable',
      resourceId: timetable._id,
      details: {
        sessionId,
        subjectCode: sessionToMove.subjectCode,
        from: oldPosition,
        to: { day: newDay, startTime: newStartTime, endTime: newEndTime, roomNumber: targetRoom.roomNumber },
        wasPublished,
        newStatus: timetable.status,
      },
      status: 'SUCCESS',
    });

    res.status(200).json({
      success: true,
      message: 'Session moved successfully.',
      timetable,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during session move.' });
  }
}

/**
 * Toggle Session Lock Status
 */
export async function toggleSessionLock(req, res) {
  const { id, sessionId } = req.params;

  try {
    const timetable = await Timetable.findById(id);
    if (!timetable) return res.status(404).json({ success: false, message: 'Timetable not found.' });

    const session = timetable.sessions.find((s) => s.sessionId === sessionId || s._id.toString() === sessionId);
    if (!session) return res.status(404).json({ success: false, message: 'Session not found.' });

    session.isLocked = !session.isLocked;
    await timetable.save();

    await logAuditEvent({
      req,
      actor: req.user,
      action: 'SESSION_LOCK_TOGGLED',
      resourceType: 'Timetable',
      resourceId: timetable._id,
      details: { sessionId, isLocked: session.isLocked, subjectCode: session.subjectCode },
      status: 'SUCCESS',
    });

    res.status(200).json({
      success: true,
      message: `Session ${session.isLocked ? 'locked' : 'unlocked'} successfully.`,
      isLocked: session.isLocked,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error toggling session lock.' });
  }
}

/**
 * Publish Timetable Workflow
 */
export async function publishTimetable(req, res) {
  const { id } = req.params;

  try {
    const timetable = await Timetable.findById(id);
    if (!timetable) return res.status(404).json({ success: false, message: 'Timetable not found.' });

    // Validate 0 hard constraint violations before allowing publication
    const [settings, facultyList, rooms] = await Promise.all([
      InstitutionSettings.findOne(),
      Faculty.find({ isActive: true }),
      Room.find({ isActive: true }),
    ]);

    const facultyMap = new Map();
    facultyList.forEach((f) => facultyMap.set(f.facultyId, f));
    const roomMap = new Map();
    rooms.forEach((r) => roomMap.set(r.roomNumber, r));
    const daySlotsMap = new Map();
    settings.workingDays.forEach((day) => daySlotsMap.set(day, generateDayTimeSlots(settings)));

    const context = {
      institutionSettings: settings.toObject(),
      facultyMap,
      roomMap,
      daySlotsMap,
    };

    const validation = validateCompleteSchedule(timetable.sessions, context);
    if (!validation.isValid || timetable.qualityMetrics.unassignedSessionsCount > 0) {
      await logAuditEvent({
        req,
        actor: req.user,
        action: 'TIMETABLE_PUBLISH_REJECTED',
        resourceType: 'Timetable',
        resourceId: timetable._id,
        details: { violations: validation.violations },
        status: 'DENIED',
      });

      return res.status(400).json({
        success: false,
        message: 'Cannot publish timetable with unresolved constraint violations or unassigned sessions.',
        violations: validation.violations,
      });
    }

    // Archive any currently published timetables for this programme & semester
    await Timetable.updateMany(
      {
        programmeCode: timetable.programmeCode,
        semesterNumber: timetable.semesterNumber,
        status: 'published',
        _id: { $ne: timetable._id },
      },
      { status: 'archived' }
    );

    timetable.status = 'published';
    timetable.publishedAt = new Date();
    timetable.publishedBy = req.user._id;
    await timetable.save();

    await logAuditEvent({
      req,
      actor: req.user,
      action: 'TIMETABLE_PUBLISHED',
      resourceType: 'Timetable',
      resourceId: timetable._id,
      details: {
        programmeCode: timetable.programmeCode,
        semesterNumber: timetable.semesterNumber,
        version: timetable.version,
      },
      status: 'SUCCESS',
    });

    res.status(200).json({
      success: true,
      message: 'Timetable published successfully. Previous version archived.',
      timetable,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error during timetable publication.' });
  }
}

/**
 * Compare Two Timetable Versions
 */
export async function compareTimetableVersions(req, res) {
  const { id, compareId } = req.params;

  try {
    const [t1, t2] = await Promise.all([Timetable.findById(id), Timetable.findById(compareId)]);
    if (!t1 || !t2) {
      return res.status(404).json({ success: false, message: 'One or both timetable versions not found.' });
    }

    const t1Sessions = t1.sessions;
    const t2Sessions = t2.sessions;

    const diffs = [];

    // Compare each session in t1 to t2
    for (const s1 of t1Sessions) {
      const matchInT2 = t2Sessions.find(
        (s2) =>
          s2.subjectCode === s1.subjectCode &&
          s2.groupCode === s1.groupCode &&
          (s2.batchCode || null) === (s1.batchCode || null) &&
          s2.sessionId === s1.sessionId
      );

      if (!matchInT2) {
        diffs.push({
          type: 'REMOVED_OR_REPLACED',
          subjectCode: s1.subjectCode,
          facultyName: s1.facultyName,
          v1: { day: s1.day, time: `${s1.startTime}-${s1.endTime}`, room: s1.roomNumber },
          v2: null,
        });
      } else if (
        matchInT2.day !== s1.day ||
        matchInT2.startTime !== s1.startTime ||
        matchInT2.roomNumber !== s1.roomNumber
      ) {
        diffs.push({
          type: 'SLOT_OR_ROOM_CHANGED',
          subjectCode: s1.subjectCode,
          facultyName: s1.facultyName,
          v1: { day: s1.day, time: `${s1.startTime}-${s1.endTime}`, room: s1.roomNumber },
          v2: { day: matchInT2.day, time: `${matchInT2.startTime}-${matchInT2.endTime}`, room: matchInT2.roomNumber },
        });
      }
    }

    res.status(200).json({
      success: true,
      comparison: {
        versionA: { id: t1._id, version: t1.version, status: t1.status },
        versionB: { id: t2._id, version: t2.version, status: t2.status },
        differencesCount: diffs.length,
        differences: diffs,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error comparing timetable versions.' });
  }
}

/**
 * Export Timetable to CSV (Sanitized against Formula Injection)
 */
export async function exportTimetableCsv(req, res) {
  try {
    const timetable = await Timetable.findById(req.params.id);
    if (!timetable) return res.status(404).json({ success: false, message: 'Timetable not found.' });

    // Sanitize string to prevent spreadsheet formula execution
    const sanitizeCsvCell = (val) => {
      if (val === null || val === undefined) return '""';
      let str = String(val).replace(/"/g, '""');
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`; // Prepend single quote
      }
      return `"${str}"`;
    };

    const headers = [
      'Day',
      'Start Time',
      'End Time',
      'Subject Code',
      'Subject Name',
      'Session Type',
      'Batch',
      'Faculty',
      'Room',
      'Programme',
      'Semester',
      'Locked',
    ];

    const rows = timetable.sessions.map((s) => [
      sanitizeCsvCell(s.day),
      sanitizeCsvCell(s.startTime),
      sanitizeCsvCell(s.endTime),
      sanitizeCsvCell(s.subjectCode),
      sanitizeCsvCell(s.subjectName),
      sanitizeCsvCell(s.sessionType),
      sanitizeCsvCell(s.batchCode || 'All'),
      sanitizeCsvCell(s.facultyName),
      sanitizeCsvCell(s.roomNumber),
      sanitizeCsvCell(s.programmeCode),
      sanitizeCsvCell(s.semesterNumber),
      sanitizeCsvCell(s.isLocked ? 'Yes' : 'No'),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${timetable.programmeCode}_Sem${timetable.semesterNumber}_v${timetable.version}.csv"`
    );

    res.status(200).send(csvContent);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate CSV export.' });
  }
}

/**
 * Workload & Utilization Analytics
 */
export async function getTimetableAnalytics(req, res) {
  try {
    const timetable = await Timetable.findById(req.params.id);
    if (!timetable) return res.status(404).json({ success: false, message: 'Timetable not found.' });

    const facultyWorkload = {};
    const roomUtilization = {};
    const dayDistribution = {};

    for (const s of timetable.sessions) {
      const hours = s.durationPeriods || 1;

      // Faculty load
      if (!facultyWorkload[s.facultyName]) {
        facultyWorkload[s.facultyName] = { facultyCode: s.facultyCode, facultyName: s.facultyName, totalHours: 0, sessions: 0 };
      }
      facultyWorkload[s.facultyName].totalHours += hours;
      facultyWorkload[s.facultyName].sessions += 1;

      // Room load
      if (!roomUtilization[s.roomNumber]) {
        roomUtilization[s.roomNumber] = { roomNumber: s.roomNumber, totalHours: 0, sessions: 0 };
      }
      roomUtilization[s.roomNumber].totalHours += hours;
      roomUtilization[s.roomNumber].sessions += 1;

      // Day load
      dayDistribution[s.day] = (dayDistribution[s.day] || 0) + hours;
    }

    res.status(200).json({
      success: true,
      analytics: {
        totalSessions: timetable.sessions.length,
        totalTeachingHours: Object.values(dayDistribution).reduce((a, b) => a + b, 0),
        facultyWorkload: Object.values(facultyWorkload),
        roomUtilization: Object.values(roomUtilization),
        dayDistribution,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to generate timetable analytics.' });
  }
}

/**
 * Create a new draft revision cloned from an existing timetable
 */
export async function createTimetableRevision(req, res) {
  const { id } = req.params;

  try {
    const sourceTimetable = await Timetable.findById(id);
    if (!sourceTimetable) {
      return res.status(404).json({ success: false, message: 'Source timetable not found.' });
    }

    const lastVersion = await Timetable.findOne({
      programmeCode: sourceTimetable.programmeCode,
      semesterNumber: sourceTimetable.semesterNumber,
    }).sort({ version: -1 });

    const nextVersion = lastVersion ? lastVersion.version + 1 : sourceTimetable.version + 1;

    const revision = new Timetable({
      academicYear: sourceTimetable.academicYear,
      programmeCode: sourceTimetable.programmeCode,
      semesterNumber: sourceTimetable.semesterNumber,
      version: nextVersion,
      status: 'draft',
      title: `${sourceTimetable.programmeCode} Sem ${sourceTimetable.semesterNumber} (Draft Revision v${nextVersion})`,
      sessions: sourceTimetable.sessions.map((s) => ({
        ...s.toObject(),
        _id: new mongoose.Types.ObjectId(),
      })),
      qualityMetrics: { ...sourceTimetable.qualityMetrics.toObject() },
      diagnostics: sourceTimetable.diagnostics ? { ...sourceTimetable.diagnostics.toObject() } : undefined,
      createdBy: req.user._id,
      updatedBy: req.user._id,
    });

    await revision.save();

    await logAuditEvent({
      req,
      actor: req.user,
      action: 'TIMETABLE_REVISION_CREATED',
      resourceType: 'Timetable',
      resourceId: revision._id,
      details: {
        sourceTimetableId: sourceTimetable._id,
        sourceVersion: sourceTimetable.version,
        newVersion: nextVersion,
      },
      status: 'SUCCESS',
    });

    res.status(201).json({
      success: true,
      message: `Draft revision v${nextVersion} created successfully.`,
      timetable: revision,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error creating draft revision.' });
  }
}

/**
 * Revert a published timetable to draft status
 */
export async function unpublishTimetable(req, res) {
  const { id } = req.params;

  try {
    const timetable = await Timetable.findById(id);
    if (!timetable) {
      return res.status(404).json({ success: false, message: 'Timetable not found.' });
    }

    timetable.status = 'draft';
    timetable.updatedBy = req.user._id;
    await timetable.save();

    await logAuditEvent({
      req,
      actor: req.user,
      action: 'TIMETABLE_UNPUBLISHED',
      resourceType: 'Timetable',
      resourceId: timetable._id,
      details: {
        programmeCode: timetable.programmeCode,
        semesterNumber: timetable.semesterNumber,
        version: timetable.version,
      },
      status: 'SUCCESS',
    });

    res.status(200).json({
      success: true,
      message: 'Timetable reverted to draft status.',
      timetable,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error unpublishing timetable.' });
  }
}

