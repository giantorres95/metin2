import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import * as authService from './auth.service';
import { AuthError } from './auth.service';
import * as usersQueries from '../db/queries/users.queries';
import * as refreshTokensQueries from '../db/queries/refresh-tokens.queries';

jest.mock('../db/queries/users.queries');
jest.mock('../db/queries/refresh-tokens.queries');

const mockedUsers = usersQueries as jest.Mocked<typeof usersQueries>;
const mockedTokens = refreshTokensQueries as jest.Mocked<typeof refreshTokensQueries>;

const JWT_SECRET = 'test-jwt-secret-for-unit-tests';

beforeEach(() => {
  process.env.JWT_SECRET = JWT_SECRET;
  jest.clearAllMocks();
});

afterEach(() => {
  delete process.env.JWT_SECRET;
});

function makeUserRow(overrides: Partial<usersQueries.UserRow> = {}): usersQueries.UserRow {
  return {
    id: 'user-id-1',
    name: 'Test User',
    email: 'test@example.com',
    password_hash: '$2b$12$hashedpassword',
    role: 'user',
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

describe('AuthService', () => {
  describe('hashPassword', () => {
    it('returns a bcrypt hash that starts with $2b$', async () => {
      const hash = await authService.hashPassword('mypassword');
      expect(hash).toMatch(/^\$2[aby]\$/);
      expect(hash).not.toBe('mypassword');
    });

    it('produces different hashes for the same password (random salt)', async () => {
      const a = await authService.hashPassword('same');
      const b = await authService.hashPassword('same');
      expect(a).not.toBe(b);
    });
  });

  describe('verifyPassword', () => {
    it('returns true for matching password and hash', async () => {
      const hash = await bcrypt.hash('correct', 12);
      expect(await authService.verifyPassword('correct', hash)).toBe(true);
    });

    it('returns false for non-matching password', async () => {
      const hash = await bcrypt.hash('correct', 12);
      expect(await authService.verifyPassword('wrong', hash)).toBe(false);
    });
  });

  describe('login', () => {
    it('returns accessToken, refreshToken, and user on valid credentials', async () => {
      const hash = await bcrypt.hash('password123', 12);
      const user = makeUserRow({ password_hash: hash, role: 'admin' });
      mockedUsers.findByEmail.mockResolvedValue(user);
      mockedTokens.create.mockResolvedValue({} as any);

      const result = await authService.login('test@example.com', 'password123');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.user).toEqual({
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'admin',
      });

      // Verify JWT payload
      const decoded = jwt.verify(result.accessToken, JWT_SECRET) as any;
      expect(decoded.id).toBe(user.id);
      expect(decoded.role).toBe('admin');
    });

    it('throws AuthError for non-existent email', async () => {
      mockedUsers.findByEmail.mockResolvedValue(null);

      await expect(authService.login('no@user.com', 'pass'))
        .rejects.toThrow(AuthError);
      await expect(authService.login('no@user.com', 'pass'))
        .rejects.toThrow('Credenziali non valide');
    });

    it('throws AuthError for wrong password', async () => {
      const hash = await bcrypt.hash('correct', 12);
      mockedUsers.findByEmail.mockResolvedValue(makeUserRow({ password_hash: hash }));

      await expect(authService.login('test@example.com', 'wrong'))
        .rejects.toThrow(AuthError);
    });

    it('stores refresh token hash in DB (not raw token)', async () => {
      const hash = await bcrypt.hash('pass', 12);
      mockedUsers.findByEmail.mockResolvedValue(makeUserRow({ password_hash: hash }));
      mockedTokens.create.mockResolvedValue({} as any);

      const result = await authService.login('test@example.com', 'pass');

      expect(mockedTokens.create).toHaveBeenCalledTimes(1);
      const [userId, storedHash, expiresAt] = mockedTokens.create.mock.calls[0];
      expect(userId).toBe('user-id-1');
      // The stored hash should NOT be the raw refresh token
      expect(storedHash).not.toBe(result.refreshToken);
      expect(storedHash).toHaveLength(64); // SHA-256 hex
      expect(expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('refresh', () => {
    it('returns new accessToken and refreshToken (token rotation)', async () => {
      const user = makeUserRow({ role: 'user' });
      mockedTokens.findByTokenHash.mockResolvedValue({
        id: 'token-id',
        user_id: user.id,
        token_hash: 'somehash',
        expires_at: new Date(Date.now() + 86400000),
        created_at: new Date(),
      });
      mockedTokens.deleteByTokenHash.mockResolvedValue(true);
      mockedUsers.findById.mockResolvedValue(user);
      mockedTokens.create.mockResolvedValue({} as any);

      const result = await authService.refresh('some-uuid-token');

      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      // Old token deleted
      expect(mockedTokens.deleteByTokenHash).toHaveBeenCalledTimes(1);
      // New token created
      expect(mockedTokens.create).toHaveBeenCalledTimes(1);
    });

    it('throws AuthError for unknown refresh token', async () => {
      mockedTokens.findByTokenHash.mockResolvedValue(null);

      await expect(authService.refresh('bad-token'))
        .rejects.toThrow(AuthError);
    });

    it('throws AuthError for expired refresh token and deletes it', async () => {
      mockedTokens.findByTokenHash.mockResolvedValue({
        id: 'token-id',
        user_id: 'user-id-1',
        token_hash: 'somehash',
        expires_at: new Date(Date.now() - 1000), // expired
        created_at: new Date(),
      });
      mockedTokens.deleteByTokenHash.mockResolvedValue(true);

      await expect(authService.refresh('expired-token'))
        .rejects.toThrow('Sessione scaduta');
      expect(mockedTokens.deleteByTokenHash).toHaveBeenCalledTimes(1);
    });
  });

  describe('logout', () => {
    it('deletes the hashed refresh token from DB', async () => {
      mockedTokens.deleteByTokenHash.mockResolvedValue(true);

      await authService.logout('some-uuid-token');

      expect(mockedTokens.deleteByTokenHash).toHaveBeenCalledTimes(1);
      // Should pass the SHA-256 hash, not the raw token
      const passedHash = mockedTokens.deleteByTokenHash.mock.calls[0][0];
      expect(passedHash).not.toBe('some-uuid-token');
      expect(passedHash).toHaveLength(64);
    });

    it('does not throw if token does not exist', async () => {
      mockedTokens.deleteByTokenHash.mockResolvedValue(false);

      await expect(authService.logout('nonexistent')).resolves.toBeUndefined();
    });
  });

  describe('JWT_SECRET validation', () => {
    it('throws when JWT_SECRET is missing', async () => {
      delete process.env.JWT_SECRET;
      const hash = await bcrypt.hash('pass', 12);
      mockedUsers.findByEmail.mockResolvedValue(makeUserRow({ password_hash: hash }));

      await expect(authService.login('test@example.com', 'pass'))
        .rejects.toThrow('JWT_SECRET environment variable is required');
    });
  });
});
