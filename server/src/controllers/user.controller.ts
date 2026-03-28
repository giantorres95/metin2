import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { authMiddleware } from '../middleware/auth.middleware';
import { roleMiddleware } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { createUserRateLimiter } from '../middleware/rate-limiter.middleware';
import * as userService from '../services/user.service';
import { UserError } from '../services/user.service';

const router = Router();

// All routes require authentication + admin role
router.use(authMiddleware);
router.use(roleMiddleware('admin'));

function handleUserError(err: unknown, res: Response, next: NextFunction): void {
  if (err instanceof UserError) {
    const statusMap: Record<string, number> = {
      DUPLICATE_EMAIL: 409,
      NOT_FOUND: 404,
      VALIDATION_ERROR: 400,
    };
    const status = statusMap[err.code] ?? 500;
    res.status(status).json({
      error: { message: err.message, code: err.code },
    });
    return;
  }
  next(err);
}

// POST /api/users — create user (admin only)
router.post(
  '/',
  createUserRateLimiter,
  validate([
    body('name').notEmpty().withMessage('name'),
    body('email').isEmail().withMessage('email'),
    body('password').isLength({ min: 6 }).withMessage('password'),
    body('role').isIn(['admin', 'user']).withMessage('role'),
  ]),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, email, password, role } = req.body;
      const user = await userService.create({ name, email, password, role });
      res.status(201).json(user);
    } catch (err) {
      handleUserError(err, res, next);
    }
  }
);

// GET /api/users — list users (admin only)
router.get(
  '/',
  async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const users = await userService.getAll();
      res.json(users);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/users/:id — update user (admin only)
router.patch(
  '/:id',
  validate([
    body('email').optional().isEmail().withMessage('email'),
    body('password').optional().isLength({ min: 6 }).withMessage('password'),
    body('role').optional().isIn(['admin', 'user']).withMessage('role'),
  ]),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, email, password, role } = req.body;
      const data: userService.UpdateUserInput = {};
      if (name !== undefined) data.name = name;
      if (email !== undefined) data.email = email;
      if (password !== undefined) data.password = password;
      if (role !== undefined) data.role = role;

      const user = await userService.update(req.params.id as string, data);
      res.json(user);
    } catch (err) {
      handleUserError(err, res, next);
    }
  }
);

export default router;
