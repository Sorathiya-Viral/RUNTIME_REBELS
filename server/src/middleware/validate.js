import { ZodError } from 'zod';

/**
 * Zod validation middleware factory
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'query' | 'params'} source
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const result = schema.safeParse(req[source]);
      if (!result.success) {
        const errors = result.error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));

        return res.status(400).json({
          success: false,
          message: 'Input validation error.',
          errors,
        });
      }

      // Replace with parsed/sanitized data
      req[source] = result.data;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Internal error while processing request validation.',
      });
    }
  };
}
