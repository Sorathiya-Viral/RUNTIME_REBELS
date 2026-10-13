import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  login,
  logout,
  getCurrentUser,
  getCsrfToken,
  changePassword,
  getAllUsers,
  createUser,
  updateUserRole,
} from '../controllers/authController.js';
import { authenticateUser, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  loginSchema,
  registerSchema,
  changePasswordSchema,
  updateUserRoleSchema,
} from '../validators/authValidators.js';
import { csrfProtection } from '../security/csrf.js';

const router = express.Router();

// Rate limiter for authentication attempts (10 requests per 15 minutes)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts from this IP. Please try again after 15 minutes.',
  },
});

// Public endpoints
router.get('/csrf-token', getCsrfToken);
router.post('/login', loginLimiter, validate(loginSchema), login);

// Authenticated session endpoints
router.post('/logout', authenticateUser, logout);
router.get('/me', authenticateUser, getCurrentUser);
router.post(
  '/change-password',
  authenticateUser,
  csrfProtection,
  validate(changePasswordSchema),
  changePassword
);

// Admin-only user management endpoints
router.get('/users', authenticateUser, requireRole('admin'), getAllUsers);
router.post(
  '/users',
  authenticateUser,
  requireRole('admin'),
  csrfProtection,
  validate(registerSchema),
  createUser
);
router.patch(
  '/users/:id',
  authenticateUser,
  requireRole('admin'),
  csrfProtection,
  validate(updateUserRoleSchema),
  updateUserRole
);

export default router;
