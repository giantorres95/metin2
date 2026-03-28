import express from 'express';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import gameAccountRouter from './game-account.controller';
import * as gameAccountService from '../services/game-account.service';
import { GameAccountError } from '../services/game-account.service';

jest.mock('../services/game-account.service', () => {
  const actual = jest.requireActual('../services/game-account.service');
  return {
    ...actual,
    getAll: jest.fn(),
    create: jest.fn(),
    toggleStatus: jest.fn(),
    deleteAccount: jest.fn(),
  };
});

const mockedService = gameAccountService as jest.Mocked<typeof gameAccountService>;

const JWT_SECRET = 'test-secret';

function signToken(payload: { id: string; role: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/game-accounts', gameAccountRouter);
  return app;
}

const userToken = signToken({ id: 'user-1', role: 'user' });
const adminToken = signToken({ id: 'admin-1', role: 'admin' });

const sampleAccount = {
  id: 'acc-1',
  username: 'player1',
  password: 'secret',
  status: 'offline' as const,
  createdBy: 'user-1',
  createdAt: '2024-01-01T00:00:00.000Z',
};

beforeEach(() => {
  process.env.JWT_SECRET = JWT_SECRET;
  jest.clearAllMocks();
});

afterEach(() => {
  delete process.env.JWT_SECRET;
});

describe('Game Account Controller', () => {
  describe('Authentication enforcement', () => {
    it('returns 401 when no token is provided', async () => {
      const res = await request(createApp()).get('/api/game-accounts');
      expect(res.status).toBe(401);
    });

    it('returns 401 with an invalid token', async () => {
      const res = await request(createApp())
        .get('/api/game-accounts')
        .set('Authorization', 'Bearer invalid-token');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/game-accounts', () => {
    it('returns list of accounts for authenticated user', async () => {
      mockedService.getAll.mockResolvedValue([sampleAccount]);

      const res = await request(createApp())
        .get('/api/game-accounts')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([sampleAccount]);
      expect(mockedService.getAll).toHaveBeenCalledTimes(1);
    });

    it('returns empty array when no accounts exist', async () => {
      mockedService.getAll.mockResolvedValue([]);

      const res = await request(createApp())
        .get('/api/game-accounts')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe('POST /api/game-accounts', () => {
    it('creates a new account and returns 201', async () => {
      mockedService.create.mockResolvedValue(sampleAccount);

      const res = await request(createApp())
        .post('/api/game-accounts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ username: 'player1', password: 'secret' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(sampleAccount);
      expect(mockedService.create).toHaveBeenCalledWith(
        { username: 'player1', password: 'secret' },
        'user-1'
      );
    });

    it('returns 400 when username is missing', async () => {
      const res = await request(createApp())
        .post('/api/game-accounts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ password: 'secret' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when password is missing', async () => {
      const res = await request(createApp())
        .post('/api/game-accounts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ username: 'player1' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 when service throws VALIDATION_ERROR', async () => {
      mockedService.create.mockRejectedValue(
        new GameAccountError('Campi obbligatori mancanti: username', 'VALIDATION_ERROR')
      );

      const res = await request(createApp())
        .post('/api/game-accounts')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ username: '   ', password: 'secret' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PATCH /api/game-accounts/:id/status', () => {
    it('toggles status for authenticated user', async () => {
      const toggled = { ...sampleAccount, status: 'online' as const };
      mockedService.toggleStatus.mockResolvedValue(toggled);

      const res = await request(createApp())
        .patch('/api/game-accounts/acc-1/status')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('online');
      expect(mockedService.toggleStatus).toHaveBeenCalledWith('acc-1');
    });

    it('returns 404 when account not found', async () => {
      mockedService.toggleStatus.mockRejectedValue(
        new GameAccountError('Risorsa non trovata', 'NOT_FOUND')
      );

      const res = await request(createApp())
        .patch('/api/game-accounts/nonexistent/status')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  describe('DELETE /api/game-accounts/:id', () => {
    it('deletes account when admin', async () => {
      mockedService.deleteAccount.mockResolvedValue(undefined);

      const res = await request(createApp())
        .delete('/api/game-accounts/acc-1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(204);
      expect(mockedService.deleteAccount).toHaveBeenCalledWith('acc-1');
    });

    it('returns 403 when non-admin tries to delete', async () => {
      const res = await request(createApp())
        .delete('/api/game-accounts/acc-1')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('returns 404 when admin deletes nonexistent account', async () => {
      mockedService.deleteAccount.mockRejectedValue(
        new GameAccountError('Risorsa non trovata', 'NOT_FOUND')
      );

      const res = await request(createApp())
        .delete('/api/game-accounts/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
