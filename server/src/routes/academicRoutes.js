import express from 'express';
import {
  getInstitutionSettings,
  updateInstitutionSettings,
  getProgrammes,
  getProgrammeById,
  createProgramme,
  updateProgramme,
  deleteProgramme,
  getFaculty,
  getFacultyById,
  createFaculty,
  updateFaculty,
  deleteFaculty,
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  getSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
  getConstraints,
  createConstraint,
  updateConstraint,
  deleteConstraint,
  getAuditLogs,
  verifyAuditChain,
} from '../controllers/academicControllers.js';
import { authenticateUser, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { csrfProtection } from '../security/csrf.js';
import {
  institutionSettingsSchema,
  programmeCreateSchema,
  facultyCreateSchema,
  roomCreateSchema,
  subjectCreateSchema,
  schedulingConstraintSchema,
} from '../validators/academicValidators.js';

const router = express.Router();

// All academic management endpoints require authentication
router.use(authenticateUser);

// ==================== INSTITUTION SETTINGS ====================
router.get('/settings', getInstitutionSettings);
router.put(
  '/settings',
  requireRole('admin', 'coordinator'),
  csrfProtection,
  validate(institutionSettingsSchema),
  updateInstitutionSettings
);

// ==================== PROGRAMMES & GROUPS ====================
router.get('/programmes', getProgrammes);
router.get('/programmes/:id', getProgrammeById);
router.post(
  '/programmes',
  requireRole('admin', 'coordinator'),
  csrfProtection,
  validate(programmeCreateSchema),
  createProgramme
);
router.put(
  '/programmes/:id',
  requireRole('admin', 'coordinator'),
  csrfProtection,
  updateProgramme
);
router.delete(
  '/programmes/:id',
  requireRole('admin', 'coordinator'),
  csrfProtection,
  deleteProgramme
);

// ==================== FACULTY & AVAILABILITY ====================
router.get('/faculty', getFaculty);
router.get('/faculty/:id', getFacultyById);
router.post(
  '/faculty',
  requireRole('admin', 'coordinator'),
  csrfProtection,
  validate(facultyCreateSchema),
  createFaculty
);
router.put(
  '/faculty/:id',
  requireRole('admin', 'coordinator'),
  csrfProtection,
  updateFaculty
);
router.delete(
  '/faculty/:id',
  requireRole('admin', 'coordinator'),
  csrfProtection,
  deleteFaculty
);

// ==================== ROOMS & LABORATORIES ====================
router.get('/rooms', getRooms);
router.get('/rooms/:id', getRoomById);
router.post(
  '/rooms',
  requireRole('admin', 'coordinator'),
  csrfProtection,
  validate(roomCreateSchema),
  createRoom
);
router.put(
  '/rooms/:id',
  requireRole('admin', 'coordinator'),
  csrfProtection,
  updateRoom
);
router.delete(
  '/rooms/:id',
  requireRole('admin', 'coordinator'),
  csrfProtection,
  deleteRoom
);

// ==================== SUBJECTS & PRACTICAL BATCHES ====================
router.get('/subjects', getSubjects);
router.get('/subjects/:id', getSubjectById);
router.post(
  '/subjects',
  requireRole('admin', 'coordinator'),
  csrfProtection,
  validate(subjectCreateSchema),
  createSubject
);
router.put(
  '/subjects/:id',
  requireRole('admin', 'coordinator'),
  csrfProtection,
  updateSubject
);
router.delete(
  '/subjects/:id',
  requireRole('admin', 'coordinator'),
  csrfProtection,
  deleteSubject
);

// ==================== SCHEDULING CONSTRAINTS ====================
router.get('/constraints', getConstraints);
router.post(
  '/constraints',
  requireRole('admin', 'coordinator'),
  csrfProtection,
  validate(schedulingConstraintSchema),
  createConstraint
);
router.put(
  '/constraints/:id',
  requireRole('admin', 'coordinator'),
  csrfProtection,
  updateConstraint
);
router.delete(
  '/constraints/:id',
  requireRole('admin', 'coordinator'),
  csrfProtection,
  deleteConstraint
);

// ==================== AUDIT EVENTS (ADMIN ONLY) ====================
router.get('/audit', requireRole('admin'), getAuditLogs);
router.get('/audit/verify', requireRole('admin'), verifyAuditChain);

export default router;
