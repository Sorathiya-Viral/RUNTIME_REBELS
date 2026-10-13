import crypto from 'crypto';
import { env } from '../config/env.js';

const CSRF_COOKIE_NAME = 'XSRF-TOKEN';
const CSRF_HEADER_NAME = 'x-csrf-token';

/**
 * Generates cryptographically secure CSRF token
 */
export function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Sets readable CSRF token cookie for frontend to echo back in header
 */
export function setCsrfCookie(res, token) {
  const isProduction = env.NODE_ENV === 'production';

  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Frontend JavaScript must read this to set x-csrf-token header
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    path: '/',
  });
}

/**
 * CSRF validation middleware for state-changing HTTP methods
 */
export function csrfProtection(req, res, next) {
  // Safe HTTP methods do not change state
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Exempt test mode if explicitly configured
  if (env.NODE_ENV === 'test' && req.headers['x-skip-csrf-for-testing']) {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers[CSRF_HEADER_NAME] || req.body?._csrf;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token validation failed. Request denied.',
      code: 'CSRF_VALIDATION_FAILED',
    });
  }

  next();
}
