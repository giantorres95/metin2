import { Request, Response, NextFunction } from 'express';
import { AuthError } from '../services/auth.service';
import { GameAccountError } from '../services/game-account.service';
import { UserError } from '../services/user.service';

const ERROR_CODE_TO_STATUS: Record<string, number> = {
  INVALID_CREDENTIALS: 401,
  UNAUTHORIZED: 401,
  TOKEN_EXPIRED: 401,
  INVALID_REFRESH_TOKEN: 401,
  FORBIDDEN: 403,
  VALIDATION_ERROR: 400,
  DUPLICATE_EMAIL: 409,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

function isKnownError(err: unknown): err is AuthError | GameAccountError | UserError {
  return (
    err instanceof AuthError ||
    err instanceof GameAccountError ||
    err instanceof UserError
  );
}

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (isKnownError(err)) {
    const status = ERROR_CODE_TO_STATUS[err.code] ?? 500;

    console.error(`[${err.name}] ${err.code}: ${err.message}`);

    res.status(status).json({
      error: { message: err.message, code: err.code },
    });
    return;
  }

  // Unknown / unexpected errors — never expose internals
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;
  console.error('[UnhandledError]', message, stack);

  res.status(500).json({
    error: { message: 'Errore interno del server', code: 'INTERNAL_ERROR' },
  });
}
