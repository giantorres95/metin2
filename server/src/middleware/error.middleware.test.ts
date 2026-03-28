import { Request, Response, NextFunction } from 'express';
import { errorMiddleware } from './error.middleware';
import { AuthError } from '../services/auth.service';
import { GameAccountError } from '../services/game-account.service';
import { UserError } from '../services/user.service';

function mockRes() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
}

const req = {} as Request;
const next = jest.fn() as NextFunction;

beforeEach(() => jest.spyOn(console, 'error').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

describe('errorMiddleware', () => {
  // --- AuthError mappings ---
  it('maps AuthError INVALID_CREDENTIALS to 401', () => {
    const res = mockRes();
    errorMiddleware(new AuthError('Credenziali non valide', 'INVALID_CREDENTIALS'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Credenziali non valide', code: 'INVALID_CREDENTIALS' },
    });
  });

  it('maps AuthError TOKEN_EXPIRED to 401', () => {
    const res = mockRes();
    errorMiddleware(new AuthError('Sessione scaduta', 'TOKEN_EXPIRED'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('maps AuthError INVALID_REFRESH_TOKEN to 401', () => {
    const res = mockRes();
    errorMiddleware(new AuthError('Sessione scaduta, effettua nuovamente il login', 'INVALID_REFRESH_TOKEN'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Sessione scaduta, effettua nuovamente il login', code: 'INVALID_REFRESH_TOKEN' },
    });
  });

  // --- GameAccountError mappings ---
  it('maps GameAccountError VALIDATION_ERROR to 400', () => {
    const res = mockRes();
    errorMiddleware(new GameAccountError('Campi obbligatori mancanti: username', 'VALIDATION_ERROR'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Campi obbligatori mancanti: username', code: 'VALIDATION_ERROR' },
    });
  });

  it('maps GameAccountError NOT_FOUND to 404', () => {
    const res = mockRes();
    errorMiddleware(new GameAccountError('Risorsa non trovata', 'NOT_FOUND'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  // --- UserError mappings ---
  it('maps UserError DUPLICATE_EMAIL to 409', () => {
    const res = mockRes();
    errorMiddleware(new UserError('Email già in uso', 'DUPLICATE_EMAIL'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Email già in uso', code: 'DUPLICATE_EMAIL' },
    });
  });

  it('maps UserError NOT_FOUND to 404', () => {
    const res = mockRes();
    errorMiddleware(new UserError('Risorsa non trovata', 'NOT_FOUND'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  // --- Unknown errors ---
  it('returns 500 with generic message for unknown Error', () => {
    const res = mockRes();
    errorMiddleware(new Error('db connection failed'), req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Errore interno del server', code: 'INTERNAL_ERROR' },
    });
  });

  it('returns 500 with generic message for non-Error thrown value', () => {
    const res = mockRes();
    errorMiddleware('something broke', req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Errore interno del server', code: 'INTERNAL_ERROR' },
    });
  });

  it('never exposes stack traces to the client', () => {
    const res = mockRes();
    const err = new Error('secret internal detail');
    err.stack = 'Error: secret internal detail\n    at Object.<anonymous> (/app/src/db/pool.ts:12:5)';
    errorMiddleware(err, req, res, next);
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(JSON.stringify(body)).not.toContain('stack');
    expect(JSON.stringify(body)).not.toContain('pool.ts');
    expect(JSON.stringify(body)).not.toContain('secret internal detail');
  });

  it('logs full error details server-side for known errors', () => {
    const res = mockRes();
    const spy = jest.spyOn(console, 'error');
    errorMiddleware(new AuthError('Credenziali non valide', 'INVALID_CREDENTIALS'), req, res, next);
    expect(spy).toHaveBeenCalledWith('[AuthError] INVALID_CREDENTIALS: Credenziali non valide');
  });

  it('logs full error details server-side for unknown errors', () => {
    const res = mockRes();
    const spy = jest.spyOn(console, 'error');
    const err = new Error('db crash');
    errorMiddleware(err, req, res, next);
    expect(spy).toHaveBeenCalledWith('[UnhandledError]', 'db crash', err.stack);
  });

  // --- Known error with unmapped code falls back to 500 ---
  it('falls back to 500 for known error with unmapped code', () => {
    const res = mockRes();
    errorMiddleware(new AuthError('Something weird', 'UNKNOWN_CODE' as any), req, res, next);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: { message: 'Something weird', code: 'UNKNOWN_CODE' },
    });
  });
});
