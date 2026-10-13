import { AuditEvent } from '../models/AuditEvent.js';
import { logger } from '../utils/logger.js';

/**
 * Audit Service
 * Provides helper functions to log state-changing operations and security events.
 */
export async function logAuditEvent({
  req,
  actor,
  action,
  resourceType,
  resourceId = null,
  details = {},
  status = 'SUCCESS',
}) {
  try {
    let actorEmail = 'anonymous';
    let actorRole = 'viewer';
    let actorId = null;

    if (actor) {
      actorEmail = actor.email;
      actorRole = actor.role;
      actorId = actor._id || actor.id;
    } else if (req && req.user) {
      actorEmail = req.user.email;
      actorRole = req.user.role;
      actorId = req.user._id || req.user.id;
    }

    const ipAddress = req?.ip || req?.socket?.remoteAddress || '127.0.0.1';
    const userAgent = req?.get ? req.get('User-Agent') || 'unknown' : 'unknown';

    await AuditEvent.createChainedEvent({
      actorId,
      actorEmail,
      actorRole,
      action,
      resourceType,
      resourceId: resourceId ? String(resourceId) : null,
      details,
      ipAddress,
      userAgent,
      status,
    });

    logger.audit(action, actorEmail, { resourceType, resourceId, status });
  } catch (error) {
    // Audit logging failure should be loudly logged
    logger.error('CRITICAL: Failed to write audit event:', error);
  }
}
