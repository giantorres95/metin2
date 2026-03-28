import * as userService from './user.service';
import { UserError } from './user.service';
import * as usersQueries from '../db/queries/users.queries';
import bcrypt from 'bcrypt';

jest.mock('../db/queries/users.queries');
jest.mock('bcrypt');

const mockedQueries = usersQueries as jest.Mocked<typeof usersQueries>;
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

beforeEach(() => {
  jest.clearAllMocks();
  (mockedBcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
});

function makeRow(overrides: Partial<usersQueries.UserRow> = {}): usersQueries.UserRow {
  return {
    id: 'user-1',
    name: 'Mario Rossi',
    email: 'mario@example.com',
    password_hash: 'hashed_password',
    role: 'user',
    created_at: new Date('2025-01-01T00:00:00Z'),
    updated_at: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('UserService', () => {
  describe('create', () => {
    it('creates a user with hashed password and returns DTO without password', async () => {
      mockedQueries.findByEmail.mockResolvedValue(null);
      const row = makeRow();
      mockedQueries.create.mockResolvedValue(row);

      const result = await userService.create({
        name: 'Mario Rossi',
        email: 'mario@example.com',
        password: 'plaintext123',
        role: 'user',
      });

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('plaintext123', 12);
      expect(mockedQueries.create).toHaveBeenCalledWith(
        'Mario Rossi', 'mario@example.com', 'hashed_password', 'user'
      );
      expect(result).toEqual({
        id: 'user-1',
        name: 'Mario Rossi',
        email: 'mario@example.com',
        role: 'user',
        createdAt: '2025-01-01T00:00:00.000Z',
      });
      expect(result).not.toHaveProperty('password_hash');
    });

    it('throws DUPLICATE_EMAIL when email already exists', async () => {
      mockedQueries.findByEmail.mockResolvedValue(makeRow());

      await expect(
        userService.create({
          name: 'Another User',
          email: 'mario@example.com',
          password: 'pass123',
          role: 'user',
        })
      ).rejects.toThrow(UserError);

      await expect(
        userService.create({
          name: 'Another User',
          email: 'mario@example.com',
          password: 'pass123',
          role: 'user',
        })
      ).rejects.toThrow('Email già in uso');
    });

    it('creates admin user when role is admin', async () => {
      mockedQueries.findByEmail.mockResolvedValue(null);
      const row = makeRow({ role: 'admin' });
      mockedQueries.create.mockResolvedValue(row);

      const result = await userService.create({
        name: 'Admin',
        email: 'admin@example.com',
        password: 'adminpass',
        role: 'admin',
      });

      expect(result.role).toBe('admin');
    });
  });

  describe('update', () => {
    it('updates only provided fields', async () => {
      const row = makeRow();
      mockedQueries.findById.mockResolvedValue(row);
      mockedQueries.update.mockResolvedValue(makeRow({ name: 'Luigi Verdi' }));

      const result = await userService.update('user-1', { name: 'Luigi Verdi' });

      expect(mockedQueries.update).toHaveBeenCalledWith('user-1', { name: 'Luigi Verdi' });
      expect(result.name).toBe('Luigi Verdi');
    });

    it('hashes new password when password is provided', async () => {
      const row = makeRow();
      mockedQueries.findById.mockResolvedValue(row);
      mockedQueries.update.mockResolvedValue(row);

      await userService.update('user-1', { password: 'newpass123' });

      expect(mockedBcrypt.hash).toHaveBeenCalledWith('newpass123', 12);
      expect(mockedQueries.update).toHaveBeenCalledWith('user-1', {
        password_hash: 'hashed_password',
      });
    });

    it('throws NOT_FOUND when user does not exist', async () => {
      mockedQueries.findById.mockResolvedValue(null);

      await expect(
        userService.update('bad-id', { name: 'Test' })
      ).rejects.toThrow(UserError);

      await expect(
        userService.update('bad-id', { name: 'Test' })
      ).rejects.toThrow('Risorsa non trovata');
    });

    it('throws DUPLICATE_EMAIL when changing to an existing email', async () => {
      const row = makeRow();
      mockedQueries.findById.mockResolvedValue(row);
      mockedQueries.findByEmail.mockResolvedValue(makeRow({ id: 'user-2', email: 'taken@example.com' }));

      await expect(
        userService.update('user-1', { email: 'taken@example.com' })
      ).rejects.toThrow(UserError);

      await expect(
        userService.update('user-1', { email: 'taken@example.com' })
      ).rejects.toThrow('Email già in uso');
    });

    it('allows keeping the same email without duplicate error', async () => {
      const row = makeRow({ email: 'mario@example.com' });
      mockedQueries.findById.mockResolvedValue(row);
      mockedQueries.update.mockResolvedValue(row);

      const result = await userService.update('user-1', { email: 'mario@example.com' });

      expect(mockedQueries.findByEmail).not.toHaveBeenCalled();
      expect(result.email).toBe('mario@example.com');
    });

    it('returns DTO without password_hash', async () => {
      const row = makeRow();
      mockedQueries.findById.mockResolvedValue(row);
      mockedQueries.update.mockResolvedValue(row);

      const result = await userService.update('user-1', { name: 'Updated' });

      expect(result).not.toHaveProperty('password_hash');
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('createdAt');
    });
  });

  describe('findByEmail', () => {
    it('returns user row when found', async () => {
      const row = makeRow();
      mockedQueries.findByEmail.mockResolvedValue(row);

      const result = await userService.findByEmail('mario@example.com');

      expect(result).toEqual(row);
    });

    it('returns null when not found', async () => {
      mockedQueries.findByEmail.mockResolvedValue(null);

      const result = await userService.findByEmail('nobody@example.com');

      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    it('returns all users as DTOs', async () => {
      mockedQueries.getAll.mockResolvedValue([
        makeRow(),
        makeRow({ id: 'user-2', name: 'Luigi', email: 'luigi@example.com', role: 'admin' }),
      ]);

      const result = await userService.getAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 'user-1',
        name: 'Mario Rossi',
        email: 'mario@example.com',
        role: 'user',
        createdAt: '2025-01-01T00:00:00.000Z',
      });
      expect(result[1].role).toBe('admin');
    });

    it('returns empty array when no users exist', async () => {
      mockedQueries.getAll.mockResolvedValue([]);

      const result = await userService.getAll();

      expect(result).toEqual([]);
    });
  });
});
