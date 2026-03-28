import { Request, Response, NextFunction } from 'express';
import { ValidationChain, validationResult } from 'express-validator';

export function validate(validations: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    await Promise.all(validations.map((v) => v.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const fields = errors
        .array()
        .map((e) => ('path' in e ? e.path : 'unknown'));
      const uniqueFields = [...new Set(fields)];

      res.status(400).json({
        error: {
          message: `Campi obbligatori mancanti: ${uniqueFields.join(', ')}`,
          code: 'VALIDATION_ERROR',
        },
      });
      return;
    }

    next();
  };
}
