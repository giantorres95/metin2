import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import * as gameAccountService from '../services/game-account.service';
import { GameAccountError } from '../services/game-account.service';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/game-accounts — list all
router.get(
  '/',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const accounts = await gameAccountService.getAll();
      res.json(accounts);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/game-accounts — create new
router.post(
  '/',
  validate([
    body('username').notEmpty().withMessage('username'),
    body('password').notEmpty().withMessage('password'),
  ]),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username, password } = req.body;
      const account = await gameAccountService.create(
        { username, password },
        req.user!.id
      );
      res.status(201).json(account);
    } catch (err) {
      if (err instanceof GameAccountError) {
        const status = err.code === 'VALIDATION_ERROR' ? 400 : err.code === 'NOT_FOUND' ? 404 : 500;
        res.status(status).json({
          error: { message: err.message, code: err.code },
        });
        return;
      }
      next(err);
    }
  }
);

// PATCH /api/game-accounts/:id/status — toggle status
router.patch(
  '/:id/status',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { activity } = req.body || {};
      const account = await gameAccountService.toggleStatus(req.params.id as string, activity);
      res.json(account);
    } catch (err) {
      if (err instanceof GameAccountError) {
        const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'VALIDATION_ERROR' ? 400 : 500;
        res.status(status).json({
          error: { message: err.message, code: err.code },
        });
        return;
      }
      next(err);
    }
  }
);

// PATCH /api/game-accounts/:id/activity — update activity
router.patch(
  '/:id/activity',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { activity } = req.body;
      const account = await gameAccountService.updateActivity(req.params.id as string, activity || '');
      res.json(account);
    } catch (err) {
      if (err instanceof GameAccountError) {
        const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'VALIDATION_ERROR' ? 400 : 500;
        res.status(status).json({
          error: { message: err.message, code: err.code },
        });
        return;
      }
      next(err);
    }
  }
);

// PATCH /api/game-accounts/:id/notes — update notes
router.patch(
  '/:id/notes',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { notes } = req.body;
      const account = await gameAccountService.updateNotes(req.params.id as string, notes || '');
      res.json(account);
    } catch (err) {
      if (err instanceof GameAccountError) {
        const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'VALIDATION_ERROR' ? 400 : 500;
        res.status(status).json({
          error: { message: err.message, code: err.code },
        });
        return;
      }
      next(err);
    }
  }
);

// DELETE /api/game-accounts/:id — delete (admin only)
router.delete(
  '/:id',
  roleMiddleware('admin'),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await gameAccountService.deleteAccount(req.params.id as string);
      res.status(204).send();
    } catch (err) {
      if (err instanceof GameAccountError) {
        const status = err.code === 'NOT_FOUND' ? 404 : err.code === 'VALIDATION_ERROR' ? 400 : 500;
        res.status(status).json({
          error: { message: err.message, code: err.code },
        });
        return;
      }
      next(err);
    }
  }
);

export default router;
