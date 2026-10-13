/**
 * Secure structured logging utility
 * Automatically redacts secrets, tokens, and passwords
 */

const REDACT_KEYS = ['password', 'token', 'jwt', 'cookie', 'authorization', 'secret'];

function sanitizeObject(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const clean = {};
  for (const [key, val] of Object.entries(obj)) {
    if (REDACT_KEYS.some((k) => key.toLowerCase().includes(k))) {
      clean[key] = '[REDACTED]';
    } else if (typeof val === 'object' && val !== null) {
      clean[key] = sanitizeObject(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

export const logger = {
  info: (msg, meta) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, meta ? sanitizeObject(meta) : '');
  },
  warn: (msg, meta) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${msg}`, meta ? sanitizeObject(meta) : '');
  },
  error: (msg, err, meta) => {
    const errorDetails = err instanceof Error ? { message: err.message, stack: process.env.NODE_ENV === 'development' ? err.stack : undefined } : err;
    console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, errorDetails, meta ? sanitizeObject(meta) : '');
  },
  audit: (action, actor, details) => {
    console.log(`[AUDIT] ${new Date().toISOString()} [${action}] by ${actor || 'SYSTEM'}`, sanitizeObject(details));
  }
};
