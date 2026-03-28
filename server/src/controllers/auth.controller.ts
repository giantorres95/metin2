import { Router, Request, Response, NextFunction } from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validate.middleware';
import { loginRateLimiter } from '../middleware/rate-limiter.middleware';
import * as authService from '../services/auth.service';
import { AuthError } from '../services/auth.service';

const router = Router();

const REFRESH_TOKEN_COOKIE = 'refreshToken';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// POST /api/auth/login
router.post(
  '/login',
  loginRateLimiter,
  validate([
    body('username').notEmpty().withMessage('username'),
    body('password').notEmpty().withMessage('password'),
  ]),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username, password } = req.body;
      const result = await authService.login(username, password);

      res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, COOKIE_OPTIONS);

      res.json({
        accessToken: result.accessToken,
        user: result.user,
      });
    } catch (err) {
      if (err instanceof AuthError) {
        res.status(401).json({
          error: { message: err.message, code: err.code },
        });
        return;
      }
      next(err);
    }
  }
);

// POST /api/auth/refresh
router.post(
  '/refresh',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.cookies?.[REFRESH_TOKEN_COOKIE];
      if (!token) {
        res.status(401).json({
          error: {
            message: 'Sessione scaduta, effettua nuovamente il login',
            code: 'INVALID_REFRESH_TOKEN',
          },
        });
        return;
      }

      const result = await authService.refresh(token);

      res.cookie(REFRESH_TOKEN_COOKIE, result.refreshToken, COOKIE_OPTIONS);

      res.json({ accessToken: result.accessToken });
    } catch (err) {
      if (err instanceof AuthError) {
        res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/api/auth' });
        res.status(401).json({
          error: { message: err.message, code: err.code },
        });
        return;
      }
      next(err);
    }
  }
);

// POST /api/auth/logout
router.post(
  '/logout',
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token = req.cookies?.[REFRESH_TOKEN_COOKIE];
      if (token) {
        await authService.logout(token);
      }

      res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/api/auth' });
      res.json({ message: 'Logout effettuato' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
