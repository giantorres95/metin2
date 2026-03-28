import { Request, Response, NextFunction } from 'express';

export function roleMiddleware(requiredRole: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== requiredRole) {
      res.status(403).json({
        error: { message: 'Permessi insufficienti', code: 'FORBIDDEN' },
      });
      return;
    }

    next();
  };
}
