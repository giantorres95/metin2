import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from './auth.middleware';

const TEST_SECRET = 'test-jwt-secret';

function mockReqResNext(authHeader?: string) {
  const req = { headers: { authorization: authHeader } } as unknown as Request;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

beforeAll(() => {
  process.env.JWT_SECRET = TEST_SECRET;
});

describe('authMiddleware', () => {
  it('should return 401 when no Authorization header is present', () => {
    const { req, res, next } = mockReqResNext(undefined);
    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Autenticazione richiesta', code: 'UNAUTHORIZED' },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when Authorization header does not start with Bearer', () => {
    const { req, res, next } = mockReqResNext('Basic abc123');
    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 with TOKEN_EXPIRED for expired tokens', () => {
    const token = jwt.sign({ id: 'u1', role: 'user' }, TEST_SECRET, { expiresIn: '-1s' });
    const { req, res, next } = mockReqResNext(`Bearer ${token}`);
    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Sessione scaduta', code: 'TOKEN_EXPIRED' },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 for invalid/malformed tokens', () => {
    const { req, res, next } = mockReqResNext('Bearer not.a.valid.token');
    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Autenticazione richiesta', code: 'UNAUTHORIZED' },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should attach user to req and call next for valid tokens', () => {
    const token = jwt.sign({ id: 'user-123', role: 'admin' }, TEST_SECRET, { expiresIn: '15m' });
    const { req, res, next } = mockReqResNext(`Bearer ${token}`);
    authMiddleware(req, res, next);

    expect(req.user).toEqual({ id: 'user-123', role: 'admin' });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
