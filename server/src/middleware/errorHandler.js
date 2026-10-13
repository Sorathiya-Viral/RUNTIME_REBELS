import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

/**
 * Global Centralized Error Handling Middleware
 */
export function errorHandler(err, req, res, next) {
  logger.error('Unhandled Application Error:', err);

  // Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `A record with this ${field} already exists.`,
    });
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid ID format for parameter: ${err.path}`,
    });
  }

  // Generic internal server error (never leak raw stack trace in production)
  const statusCode = err.statusCode || 500;
  const response = {
    success: false,
    message: err.message || 'An unexpected internal server error occurred.',
  };

  if (env.NODE_ENV === 'development' && err.stack) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}
