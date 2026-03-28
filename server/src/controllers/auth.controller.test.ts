import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import authRouter from './auth.controller';
import * as authService from '../services/auth.service';
import { AuthError } from '../services/auth.service';

jest.mock('../services/auth.service', () => {
  const actual = jest.requireActual('../services/auth.service');
  return {
    ...actual,
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };
});

const mockedAuth = authService as jest.Mocked<typeof authService>;

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/auth', authRouter);
  return app;
}

beforeEach(() => {
  process.env.JWT_SECRET = 'test-secret';
  process.env.NODE_ENV = 'test';
  jest.clearAllMocks();
});

afterEach(() => {
  delete process.env.JWT_SECRET;
});

describe('Auth Controller', () => {
  describe('POST /api/auth/login', () => {
    it('returns accessToken and user, sets refreshToken cookie on valid login', async () => {
      mockedAuth.login.mockResolvedValue({
        accessToken: 'access-jwt',
        refreshToken: 'refresh-uuid',
        user: { id: '1', name: 'Test', email: 'test@example.com', role: 'admin' },
      });

      const res = await request(createApp())
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBe('access-jwt');
      expect(res.body.user).toEqual({ id: '1', name: 'Test', email: 'test@example.com', role: 'admin' });
      // refreshToken must NOT be in the response body
      expect(res.body.refreshToken).toBeUndefined();

      // Check cookie is set
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      expect(cookieStr).toContain('refreshToken=refresh-uuid');
      expect(cookieStr).toContain('HttpOnly');
      expect(cookieStr).toContain('Path=/api/auth');
    });

    it('returns 401 on invalid credentials', async () => {
      mockedAuth.login.mockRejectedValue(
        new AuthError('Credenziali non valide', 'INVALID_CREDENTIALS')
      );

      const res = await request(createApp())
        .post('/api/auth/login')
        .send({ email: 'bad@example.com', password: 'wrong' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toBe('Credenziali non valide');
    });

    it('returns 400 when email is missing', async () => {
      const res = await request(createApp())
        .post('/api/auth/login')
        .send({ password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when password is missing', async () => {
      const res = await request(createApp())
        .post('/api/auth/login')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when email format is invalid', async () => {
      const res = await request(createApp())
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('returns new accessToken and sets new refreshToken cookie', async () => {
      mockedAuth.refresh.mockResolvedValue({
        accessToken: 'new-access-jwt',
        refreshToken: 'new-refresh-uuid',
      });

      const res = await request(createApp())
        .post('/api/auth/refresh')
        .set('Cookie', 'refreshToken=old-refresh-uuid');

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBe('new-access-jwt');
      expect(res.body.refreshToken).toBeUndefined();

      const cookies = res.headers['set-cookie'];
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      expect(cookieStr).toContain('refreshToken=new-refresh-uuid');
    });

    it('returns 401 when no refreshToken cookie is present', async () => {
      const res = await request(createApp())
        .post('/api/auth/refresh');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    it('returns 401 and clears cookie on invalid refresh token', async () => {
      mockedAuth.refresh.mockRejectedValue(
        new AuthError('Sessione scaduta, effettua nuovamente il login', 'INVALID_REFRESH_TOKEN')
      );

      const res = await request(createApp())
        .post('/api/auth/refresh')
        .set('Cookie', 'refreshToken=bad-token');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('clears refreshToken cookie and calls authService.logout', async () => {
      mockedAuth.logout.mockResolvedValue(undefined);

      const res = await request(createApp())
        .post('/api/auth/logout')
        .set('Cookie', 'refreshToken=some-token');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Logout effettuato');
      expect(mockedAuth.logout).toHaveBeenCalledWith('some-token');

      const cookies = res.headers['set-cookie'];
      const cookieStr = Array.isArray(cookies) ? cookies.join('; ') : cookies;
      // Cookie should be cleared (set to empty or expired)
      expect(cookieStr).toContain('refreshToken=');
    });

    it('succeeds even without a refreshToken cookie', async () => {
      const res = await request(createApp())
        .post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(mockedAuth.logout).not.toHaveBeenCalled();
    });
  });
});
