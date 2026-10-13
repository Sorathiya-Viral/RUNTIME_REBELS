import { verifyToken, COOKIE_NAME } from '../security/jwt.js';
import { User } from '../models/User.js';
import { logAuditEvent } from '../security/auditService.js';

/**
 * Authentication middleware
 * Checks HttpOnly cookie first, then Authorization header as fallback
 */
export async function authenticateUser(req, res, next) {
  try {
    let token = req.cookies?.[COOKIE_NAME];

    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No active session found.',
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Session expired or token is invalid. Please log in again.',
      });
    }

    // Load user from database to ensure account is active and not disabled
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated or no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication verification.',
    });
  }
}

/**
 * Role-Based Access Control (RBAC) middleware
 * Denies access by default if user role is not explicitly authorized
 */
export function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required before role verification.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      // Log unauthorized access attempt for security auditing
      await logAuditEvent({
        req,
        actor: req.user,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        resourceType: 'ENDPOINT',
        resourceId: req.originalUrl,
        details: {
          userRole: req.user.role,
          requiredRoles: allowedRoles,
          method: req.method,
        },
        status: 'DENIED',
      });

      return res.status(403).json({
        success: false,
        message: `Forbidden. Operation requires one of the following roles: [${allowedRoles.join(', ')}].`,
      });
    }

    next();
  };
}
