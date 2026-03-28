import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import userRouter from './user.controller';
import * as userService from '../services/user.service';
import { UserError } from '../services/user.service';

// Disable rate limiting in tests
jest.mock('../middleware/rate-limiter.middleware', () => ({
  createUserRateLimiter: (_req: any, _res: any, next: any) => next(),
  loginRateLimiter: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../services/user.service', () => {
  const actual = jest.requireActual('../services/user.service');
  return {
    ...actual,
    create: jest.fn(),
    update: jest.fn(),
    getAll: jest.fn(),
  };
});

const mockedService = userService as jest.Mocked<typeof userService>;

const JWT_SECRET = 'test-secret';

function signToken(payload: { id: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/users', userRouter);
  return app;
}

const adminToken = signToken({ id: 'admin-1', role: 'admin' });
const userToken = signToken({ id: 'user-1', role: 'user' });

const sampleUser = {
  id: 'u-1',
  name: 'Mario Rossi',
  email: 'mario@example.com',
  role: 'user' as const,
  createdAt: '2024-01-01T00:00:00.000Z',
};

beforeEach(() => {
  process.env.JWT_SECRET = JWT_SECRET;
  jest.clearAllMocks();
});

afterEach(() => {
  delete process.env.JWT_SECRET;
});

describe('User Controller', () => {
  describe('Authentication and authorization enforcement', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await request(createApp()).get('/api/users');
      expect(res.status).toBe(401);
    });

    it('returns 403 when non-admin tries to access', async () => {
      const res = await request(createApp())
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /api/users', () => {
    it('creates a user and returns 201', async () => {
      mockedService.create.mockResolvedValue(sampleUser);

      const res = await request(createApp())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Mario Rossi', email: 'mario@example.com', password: 'secret123', role: 'user' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(sampleUser);
      expect(mockedService.create).toHaveBeenCalledWith({
        name: 'Mario Rossi',
        email: 'mario@example.com',
        password: 'secret123',
        role: 'user',
      });
    });

    it('returns 400 when name is missing', async () => {
      const res = await request(createApp())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'mario@example.com', password: 'secret123', role: 'user' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when email format is invalid', async () => {
      const res = await request(createApp())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Mario', email: 'not-an-email', password: 'secret123', role: 'user' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when password is too short', async () => {
      const res = await request(createApp())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Mario', email: 'mario@example.com', password: '123', role: 'user' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when role is invalid', async () => {
      const res = await request(createApp())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Mario', email: 'mario@example.com', password: 'secret123', role: 'superadmin' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 409 when email is duplicate', async () => {
      mockedService.create.mockRejectedValue(
        new UserError('Email già in uso', 'DUPLICATE_EMAIL')
      );

      const res = await request(createApp())
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Mario', email: 'mario@example.com', password: 'secret123', role: 'user' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_EMAIL');
    });

    it('returns 403 when non-admin tries to create user', async () => {
      const res = await request(createApp())
        .post('/api/users')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Mario', email: 'mario@example.com', password: 'secret123', role: 'user' });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/users', () => {
    it('returns list of users for admin', async () => {
      mockedService.getAll.mockResolvedValue([sampleUser]);

      const res = await request(createApp())
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([sampleUser]);
      expect(mockedService.getAll).toHaveBeenCalledTimes(1);
    });

    it('returns empty array when no users exist', async () => {
      mockedService.getAll.mockResolvedValue([]);

      const res = await request(createApp())
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('PATCH /api/users/:id', () => {
    it('updates user and returns updated data', async () => {
      const updated = { ...sampleUser, name: 'Mario Bianchi' };
      mockedService.update.mockResolvedValue(updated);

      const res = await request(createApp())
        .patch('/api/users/u-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Mario Bianchi' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Mario Bianchi');
      expect(mockedService.update).toHaveBeenCalledWith('u-1', { name: 'Mario Bianchi' });
    });

    it('returns 400 when email format is invalid', async () => {
      const res = await request(createApp())
        .patch('/api/users/u-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'bad-email' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when password is too short', async () => {
      const res = await request(createApp())
        .patch('/api/users/u-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: '12' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when role is invalid', async () => {
      const res = await request(createApp())
        .patch('/api/users/u-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'moderator' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 404 when user not found', async () => {
      mockedService.update.mockRejectedValue(
        new UserError('Risorsa non trovata', 'NOT_FOUND')
      );

      const res = await request(createApp())
        .patch('/api/users/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test' });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 409 when updating to duplicate email', async () => {
      mockedService.update.mockRejectedValue(
        new UserError('Email già in uso', 'DUPLICATE_EMAIL')
      );

      const res = await request(createApp())
        .patch('/api/users/u-1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'existing@example.com' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE_EMAIL');
    });

    it('returns 403 when non-admin tries to update', async () => {
      const res = await request(createApp())
        .patch('/api/users/u-1')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Hacker' });

      expect(res.status).toBe(403);
    });
  });
});
