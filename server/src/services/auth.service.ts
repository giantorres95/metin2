import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import * as usersQueries from '../db/queries/users.queries';
import * as refreshTokensQueries from '../db/queries/refresh-tokens.queries';

const SALT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return secret;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function login(username: string, password: string): Promise<{
  accessToken: string;
  refreshToken: string;
  user: { id: string; name: string; email: string; role: 'admin' | 'user' };
}> {
  const user = await usersQueries.findByName(username);
  if (!user) {
    throw new AuthError('Credenziali non valide', 'INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AuthError('Credenziali non valide', 'INVALID_CREDENTIALS');
  }

  const accessToken = jwt.sign(
    { id: user.id, role: user.role },
    getJwtSecret(),
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const rawRefreshToken = crypto.randomUUID();
  const tokenHash = hashToken(rawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await refreshTokensQueries.create(user.id, tokenHash, expiresAt);

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

export async function refresh(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
}> {
  const tokenHash = hashToken(refreshToken);
  const stored = await refreshTokensQueries.findByTokenHash(tokenHash);

  if (!stored) {
    throw new AuthError('Sessione scaduta, effettua nuovamente il login', 'INVALID_REFRESH_TOKEN');
  }

  if (new Date() > stored.expires_at) {
    await refreshTokensQueries.deleteByTokenHash(tokenHash);
    throw new AuthError('Sessione scaduta, effettua nuovamente il login', 'INVALID_REFRESH_TOKEN');
  }

  // Token rotation: delete old, create new
  await refreshTokensQueries.deleteByTokenHash(tokenHash);

  const user = await usersQueries.findById(stored.user_id);
  if (!user) {
    throw new AuthError('Sessione scaduta, effettua nuovamente il login', 'INVALID_REFRESH_TOKEN');
  }

  const accessToken = jwt.sign(
    { id: user.id, role: user.role },
    getJwtSecret(),
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );

  const newRawRefreshToken = crypto.randomUUID();
  const newTokenHash = hashToken(newRawRefreshToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await refreshTokensQueries.create(user.id, newTokenHash, expiresAt);

  return {
    accessToken,
    refreshToken: newRawRefreshToken,
  };
}

export async function logout(refreshToken: string): Promise<void> {
  const tokenHash = hashToken(refreshToken);
  await refreshTokensQueries.deleteByTokenHash(tokenHash);
}

export class AuthError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'AuthError';
  }
}
