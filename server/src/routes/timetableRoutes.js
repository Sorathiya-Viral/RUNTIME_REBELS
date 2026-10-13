import express from 'express';
import {
  generateTimetable,
  getTimetables,
  getTimetableById,
  moveSession,
  toggleSessionLock,
  publishTimetable,
  compareTimetableVersions,
  exportTimetableCsv,
  getTimetableAnalytics,
  createTimetableRevision,
  unpublishTimetable,
} from '../controllers/timetableController.js';
import { authenticateUser, requireRole } from '../middleware/auth.js';
import { csrfProtection } from '../security/csrf.js';

const router = express.Router();

router.use(authenticateUser);

// Generation & Listing
router.get('/', getTimetables);
router.get('/:id', getTimetableById);
router.post('/generate', requireRole('admin', 'coordinator'), csrfProtection, generateTimetable);

// Interactive Session Editing & Locking
router.patch(
  '/:id/sessions/:sessionId/move',
  requireRole('admin', 'coordinator'),
  csrfProtection,
  moveSession
);
router.patch(
  '/:id/sessions/:sessionId/lock',
  requireRole('admin', 'coordinator'),
  csrfProtection,
  toggleSessionLock
);

// Publication & Version Lifecycle
router.post('/:id/publish', requireRole('admin', 'coordinator'), csrfProtection, publishTimetable);
router.post('/:id/revision', requireRole('admin', 'coordinator'), csrfProtection, createTimetableRevision);
router.post('/:id/unpublish', requireRole('admin', 'coordinator'), csrfProtection, unpublishTimetable);
router.get('/:id/compare/:compareId', requireRole('admin', 'coordinator'), compareTimetableVersions);

// Analytics & Secure CSV Export
router.get('/:id/analytics', getTimetableAnalytics);
router.get('/:id/export/csv', exportTimetableCsv);

export default router;
