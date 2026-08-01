import type { Request, Response, NextFunction } from 'express';
import type { AnyZodObject } from 'zod';

/**
 * Request validation middleware using Zod.
 * Parses and validates incoming body, query, and params against the provided Zod schema.
 * Automatically casts/normalizes data and passes validation errors to the next middleware.
 */
export function validate(schema: AnyZodObject) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      // Re-assign parsed/normalized inputs back to Express request objects
      if (parsed.body !== undefined) req.body = parsed.body;
      if (parsed.query !== undefined) req.query = parsed.query;
      if (parsed.params !== undefined) req.params = parsed.params;

      next();
    } catch (err) {
      next(err);
    }
  };
}

export default validate;
