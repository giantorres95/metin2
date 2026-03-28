import { Request, Response, NextFunction } from 'express';
import { roleMiddleware } from './role.middleware';

function mockReqResNext(user?: { id: string; role: string }) {
  const req = { user } as unknown as Request;
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  const next = jest.fn() as NextFunction;
  return { req, res, next };
}

describe('roleMiddleware', () => {
  it('should return 403 when req.user is missing', () => {
    const { req, res, next } = mockReqResNext(undefined);
    roleMiddleware('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Permessi insufficienti', code: 'FORBIDDEN' },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 403 when user role does not match required role', () => {
    const { req, res, next } = mockReqResNext({ id: 'u1', role: 'user' });
    roleMiddleware('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('should call next when user role matches required role', () => {
    const { req, res, next } = mockReqResNext({ id: 'u1', role: 'admin' });
    roleMiddleware('admin')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
