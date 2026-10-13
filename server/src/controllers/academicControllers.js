import { InstitutionSettings } from '../models/InstitutionSettings.js';
import { Programme } from '../models/Programme.js';
import { Faculty } from '../models/Faculty.js';
import { Room } from '../models/Room.js';
import { Subject } from '../models/Subject.js';
import { SchedulingConstraint } from '../models/SchedulingConstraint.js';
import { AuditEvent } from '../models/AuditEvent.js';
import { logAuditEvent } from '../security/auditService.js';

// ==================== INSTITUTION SETTINGS ====================

export async function getInstitutionSettings(req, res) {
  try {
    let settings = await InstitutionSettings.findOne();
    if (!settings) {
      settings = await InstitutionSettings.create({});
    }
    res.status(200).json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve institution settings.' });
  }
}

export async function updateInstitutionSettings(req, res) {
  try {
    let settings = await InstitutionSettings.findOne();
    const beforeState = settings ? settings.toObject() : {};

    if (!settings) {
      settings = new InstitutionSettings(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    settings.updatedBy = req.user._id;
    await settings.save();

    await logAuditEvent({
      req,
      actor: req.user,
      action: 'INSTITUTION_SETTINGS_UPDATED',
      resourceType: 'InstitutionSettings',
      resourceId: settings._id,
      details: { before: beforeState, after: settings.toObject() },
      status: 'SUCCESS',
    });

    res.status(200).json({ success: true, message: 'Settings updated successfully.', settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update settings.' });
  }
}

// ==================== PROGRAMMES & GROUPS ====================

export async function getProgrammes(req, res) {
  try {
    const programmes = await Programme.find({ isActive: true }).sort({ name: 1 });
    res.status(200).json({ success: true, programmes });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve programmes.' });
  }
}

export async function getProgrammeById(req, res) {
  try {
    const programme = await Programme.findById(req.params.id);
    if (!programme) return res.status(404).json({ success: false, message: 'Programme not found.' });
    res.status(200).json({ success: true, programme });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve programme.' });
  }
}

export async function createProgramme(req, res) {
  try {
    const existing = await Programme.findOne({ code: req.body.code.toUpperCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: `Programme with code ${req.body.code} already exists.` });
    }

    const programme = await Programme.create(req.body);

    await logAuditEvent({
      req,
      actor: req.user,
      action: 'PROGRAMME_CREATED',
      resourceType: 'Programme',
      resourceId: programme._id,
      details: { name: programme.name, code: programme.code },
      status: 'SUCCESS',
    });

    res.status(201).json({ success: true, message: 'Programme created.', programme });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create programme.' });
  }
}

export async function updateProgramme(req, res) {
  try {
    const programme = await Programme.findById(req.params.id);
    if (!programme) return res.status(404).json({ success: false, message: 'Programme not found.' });

    const beforeState = programme.toObject();
    Object.assign(programme, req.body);
    await programme.save();

    await logAuditEvent({
      req,
      actor: req.user,
      action: 'PROGRAMME_UPDATED',
      resourceType: 'Programme',
      resourceId: programme._id,
      details: { before: beforeState, after: programme.toObject() },
      status: 'SUCCESS',
    });

    res.status(200).json({ success: true, message: 'Programme updated.', programme });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update programme.' });
  }
}

export async function deleteProgramme(req, res) {
  try {
    const programme = await Programme.findById(req.params.id);
    if (!programme) return res.status(404).json({ success: false, message: 'Programme not found.' });

    programme.isActive = false;
    await programme.save();

    await logAuditEvent({
      req,
      actor: req.user,
      action: 'PROGRAMME_DEACTIVATED',
      resourceType: 'Programme',
      resourceId: programme._id,
      details: { code: programme.code },
      status: 'SUCCESS',
    });

    res.status(200).json({ success: true, message: 'Programme deactivated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete programme.' });
  }
}

// ==================== FACULTY & AVAILABILITY ====================

export async function getFaculty(req, res) {
  try {
    const query = { isActive: true };
    if (req.query.department) query.department = req.query.department;

    const faculty = await Faculty.find(query).sort({ name: 1 });
    res.status(200).json({ success: true, faculty });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve faculty.' });
  }
}

export async function getFacultyById(req, res) {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found.' });
    res.status(200).json({ success: true, faculty });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve faculty details.' });
  }
}

export async function createFaculty(req, res) {
  try {
    const existing = await Faculty.findOne({
      $or: [{ facultyId: req.body.facultyId.toUpperCase() }, { email: req.body.email.toLowerCase() }],
    });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Faculty with this ID or email already exists.' });
    }

    const faculty = await Faculty.create(req.body);

    await logAuditEvent({
      req,
      actor: req.user,
      action: 'FACULTY_CREATED',
      resourceType: 'Faculty',
      resourceId: faculty._id,
      details: { facultyId: faculty.facultyId, name: faculty.name },
      status: 'SUCCESS',
    });

    res.status(201).json({ success: true, message: 'Faculty created.', faculty });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create faculty member.' });
  }
}

export async function updateFaculty(req, res) {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found.' });

    const beforeState = faculty.toObject();
    Object.assign(faculty, req.body);
    await faculty.save();

    await logAuditEvent({
      req,
      actor: req.user,
      action: 'FACULTY_UPDATED',
      resourceType: 'Faculty',
      resourceId: faculty._id,
      details: { before: beforeState, after: faculty.toObject() },
      status: 'SUCCESS',
    });

    res.status(200).json({ success: true, message: 'Faculty updated.', faculty });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update faculty member.' });
  }
}

export async function deleteFaculty(req, res) {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found.' });

    faculty.isActive = false;
    await faculty.save();

    await logAuditEvent({
      req,
      actor: req.user,
      action: 'FACULTY_DEACTIVATED',
      resourceType: 'Faculty',
      resourceId: faculty._id,
      details: { facultyId: faculty.facultyId },
      status: 'SUCCESS',
    });

    res.status(200).json({ success: true, message: 'Faculty deactivated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete faculty member.' });
  }
}

// ==================== ROOMS & LABORATORIES ====================

export async function getRooms(req, res) {
  try {
    const query = { isActive: true };
    if (req.query.roomType) query.roomType = req.query.roomType;
    if (req.query.isAvailable) query.isAvailable = req.query.isAvailable === 'true';

    const rooms = await Room.find(query).sort({ roomNumber: 1 });
    res.status(200).json({ success: true, rooms });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve rooms.' });
  }
}

export async function getRoomById(req, res) {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found.' });
    res.status(200).json({ success: true, room });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve room.' });
  }
}

export async function createRoom(req, res) {
  try {
    const existing = await Room.findOne({ roomNumber: req.body.roomNumber.toUpperCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: `Room ${req.body.roomNumber} already exists.` });
    }

    const room = await Room.create(req.body);

    await logAuditEvent({
      req,
      actor: req.user,
      action: 'ROOM_CREATED',
      resourceType: 'Room',
      resourceId: room._id,
      details: { roomNumber: room.roomNumber, type: room.roomType, capacity: room.capacity },
      status: 'SUCCESS',
    });

    res.status(201).json({ success: true, message: 'Room created.', room });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create room.' });
  }
}

export async function updateRoom(req, res) {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found.' });

    const beforeState = room.toObject();
    Object.assign(room, req.body);
    await room.save();

    await logAuditEvent({
      req,
      actor: req.user,
      action: 'ROOM_UPDATED',
      resourceType: 'Room',
      resourceId: room._id,
      details: { before: beforeState, after: room.toObject() },
      status: 'SUCCESS',
    });

    res.status(200).json({ success: true, message: 'Room updated.', room });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update room.' });
  }
}

export async function deleteRoom(req, res) {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: 'Room not found.' });

    room.isActive = false;
    await room.save();

    await logAuditEvent({
      req,
      actor: req.user,
      action: 'ROOM_DEACTIVATED',
      resourceType: 'Room',
      resourceId: room._id,
      details: { roomNumber: room.roomNumber },
      status: 'SUCCESS',
    });

    res.status(200).json({ success: true, message: 'Room deactivated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete room.' });
  }
}

// ==================== SUBJECTS & PRACTICAL BATCHES ====================

export async function getSubjects(req, res) {
  try {
    const query = { isActive: true };
    if (req.query.programmeCode) query.programmeCode = req.query.programmeCode.toUpperCase();
    if (req.query.semesterNumber) query.semesterNumber = parseInt(req.query.semesterNumber, 10);
    if (req.query.subjectType) query.subjectType = req.query.subjectType;

    const subjects = await Subject.find(query)
      .populate('primaryFaculty', 'name facultyId email')
      .populate('assignedFaculty', 'name facultyId email')
      .sort({ code: 1 });

    res.status(200).json({ success: true, subjects });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve subjects.' });
  }
}

export async function getSubjectById(req, res) {
  try {
    const subject = await Subject.findById(req.params.id)
      .populate('primaryFaculty', 'name facultyId email')
      .populate('assignedFaculty', 'name facultyId email');

    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });
    res.status(200).json({ success: true, subject });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve subject.' });
  }
}

export async function createSubject(req, res) {
  try {
    const existing = await Subject.findOne({ code: req.body.code.toUpperCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: `Subject with code ${req.body.code} already exists.` });
    }

    const subject = await Subject.create(req.body);

    await logAuditEvent({
      req,
      actor: req.user,
      action: 'SUBJECT_CREATED',
      resourceType: 'Subject',
      resourceId: subject._id,
      details: { code: subject.code, name: subject.name, type: subject.subjectType },
      status: 'SUCCESS',
    });

    res.status(201).json({ success: true, message: 'Subject created.', subject });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create subject.' });
  }
}

export async function updateSubject(req, res) {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    const beforeState = subject.toObject();
    Object.assign(subject, req.body);
    await subject.save();

    await logAuditEvent({
      req,
      actor: req.user,
      action: 'SUBJECT_UPDATED',
      resourceType: 'Subject',
      resourceId: subject._id,
      details: { before: beforeState, after: subject.toObject() },
      status: 'SUCCESS',
    });

    res.status(200).json({ success: true, message: 'Subject updated.', subject });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update subject.' });
  }
}

export async function deleteSubject(req, res) {
  try {
    const subject = await Subject.findById(req.params.id);
    if (!subject) return res.status(404).json({ success: false, message: 'Subject not found.' });

    subject.isActive = false;
    await subject.save();

    await logAuditEvent({
      req,
      actor: req.user,
      action: 'SUBJECT_DEACTIVATED',
      resourceType: 'Subject',
      resourceId: subject._id,
      details: { code: subject.code },
      status: 'SUCCESS',
    });

    res.status(200).json({ success: true, message: 'Subject deactivated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete subject.' });
  }
}

// ==================== SCHEDULING CONSTRAINTS ====================

export async function getConstraints(req, res) {
  try {
    const query = { isActive: true };
    if (req.query.constraintType) query.constraintType = req.query.constraintType;
    if (req.query.category) query.category = req.query.category;

    const constraints = await SchedulingConstraint.find(query).sort({ priority: -1, name: 1 });
    res.status(200).json({ success: true, constraints });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve constraints.' });
  }
}

export async function createConstraint(req, res) {
  try {
    const constraint = await SchedulingConstraint.create(req.body);

    await logAuditEvent({
      req,
      actor: req.user,
      action: 'CONSTRAINT_CREATED',
      resourceType: 'SchedulingConstraint',
      resourceId: constraint._id,
      details: { name: constraint.name, type: constraint.constraintType, category: constraint.category },
      status: 'SUCCESS',
    });

    res.status(201).json({ success: true, message: 'Constraint created.', constraint });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create constraint.' });
  }
}

export async function updateConstraint(req, res) {
  try {
    const constraint = await SchedulingConstraint.findById(req.params.id);
    if (!constraint) return res.status(404).json({ success: false, message: 'Constraint not found.' });

    const beforeState = constraint.toObject();
    Object.assign(constraint, req.body);
    await constraint.save();

    await logAuditEvent({
      req,
      actor: req.user,
      action: 'CONSTRAINT_UPDATED',
      resourceType: 'SchedulingConstraint',
      resourceId: constraint._id,
      details: { before: beforeState, after: constraint.toObject() },
      status: 'SUCCESS',
    });

    res.status(200).json({ success: true, message: 'Constraint updated.', constraint });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update constraint.' });
  }
}

export async function deleteConstraint(req, res) {
  try {
    const constraint = await SchedulingConstraint.findById(req.params.id);
    if (!constraint) return res.status(404).json({ success: false, message: 'Constraint not found.' });

    constraint.isActive = false;
    await constraint.save();

    await logAuditEvent({
      req,
      actor: req.user,
      action: 'CONSTRAINT_DEACTIVATED',
      resourceType: 'SchedulingConstraint',
      resourceId: constraint._id,
      details: { name: constraint.name },
      status: 'SUCCESS',
    });

    res.status(200).json({ success: true, message: 'Constraint deactivated.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete constraint.' });
  }
}

// ==================== AUDIT EVENTS & INTEGRITY ====================

export async function getAuditLogs(req, res) {
  try {
    const page = parseInt(req.query.page || '1', 10);
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 100);
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.action) query.action = req.query.action;
    if (req.query.actorEmail) query.actorEmail = req.query.actorEmail;
    if (req.query.status) query.status = req.query.status;
    if (req.query.resourceType) query.resourceType = req.query.resourceType;

    const [events, total] = await Promise.all([
      AuditEvent.find(query).sort({ sequenceNumber: -1 }).skip(skip).limit(limit).lean(),
      AuditEvent.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve audit records.' });
  }
}

export async function verifyAuditChain(req, res) {
  try {
    const result = await AuditEvent.verifyChainIntegrity();

    // Log the verification attempt itself
    await logAuditEvent({
      req,
      actor: req.user,
      action: 'AUDIT_INTEGRITY_VERIFICATION',
      resourceType: 'AuditEvent',
      details: result,
      status: result.isIntact ? 'SUCCESS' : 'FAILURE',
    });

    res.status(200).json({
      success: true,
      integrity: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to verify audit trail integrity.' });
  }
}
