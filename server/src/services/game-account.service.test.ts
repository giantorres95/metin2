import * as gameAccountService from './game-account.service';
import { GameAccountError } from './game-account.service';
import * as gameAccountsQueries from '../db/queries/game-accounts.queries';
import * as cryptoService from './crypto.service';

jest.mock('../db/queries/game-accounts.queries');
jest.mock('./crypto.service');

const mockedQueries = gameAccountsQueries as jest.Mocked<typeof gameAccountsQueries>;
const mockedCrypto = cryptoService as jest.Mocked<typeof cryptoService>;

beforeEach(() => {
  jest.clearAllMocks();
  mockedCrypto.encrypt.mockImplementation((s) => `enc(${s})`);
  mockedCrypto.decrypt.mockImplementation((s) => s.replace(/^enc\(/, '').replace(/\)$/, ''));
});

function makeRow(overrides: Partial<gameAccountsQueries.GameAccountRow> = {}): gameAccountsQueries.GameAccountRow {
  return {
    id: 'ga-1',
    username_encrypted: 'enc(player1)',
    password_encrypted: 'enc(secret)',
    status: 'offline',
    created_by: 'user-1',
    created_at: new Date('2025-01-01T00:00:00Z'),
    updated_at: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
}

describe('GameAccountService', () => {
  describe('getAll', () => {
    it('returns all accounts with decrypted fields', async () => {
      mockedQueries.getAll.mockResolvedValue([makeRow()]);

      const result = await gameAccountService.getAll();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'ga-1',
        username: 'player1',
        password: 'secret',
        status: 'offline',
        createdBy: 'user-1',
        createdAt: '2025-01-01T00:00:00.000Z',
      });
      expect(mockedCrypto.decrypt).toHaveBeenCalledTimes(2);
    });

    it('returns empty array when no accounts exist', async () => {
      mockedQueries.getAll.mockResolvedValue([]);

      const result = await gameAccountService.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('encrypts credentials and sets status to offline', async () => {
      const row = makeRow();
      mockedQueries.create.mockResolvedValue(row);

      const result = await gameAccountService.create(
        { username: 'player1', password: 'secret' },
        'user-1'
      );

      expect(mockedCrypto.encrypt).toHaveBeenCalledWith('player1');
      expect(mockedCrypto.encrypt).toHaveBeenCalledWith('secret');
      expect(mockedQueries.create).toHaveBeenCalledWith('enc(player1)', 'enc(secret)', 'user-1');
      expect(result.status).toBe('offline');
    });

    it('throws VALIDATION_ERROR for empty username', async () => {
      await expect(
        gameAccountService.create({ username: '', password: 'pass' }, 'user-1')
      ).rejects.toThrow(GameAccountError);
      await expect(
        gameAccountService.create({ username: '', password: 'pass' }, 'user-1')
      ).rejects.toThrow('Campi obbligatori mancanti: username');
    });

    it('throws VALIDATION_ERROR for whitespace-only username', async () => {
      await expect(
        gameAccountService.create({ username: '   ', password: 'pass' }, 'user-1')
      ).rejects.toThrow(GameAccountError);
    });

    it('throws VALIDATION_ERROR for empty password', async () => {
      await expect(
        gameAccountService.create({ username: 'user', password: '' }, 'user-1')
      ).rejects.toThrow('Campi obbligatori mancanti: password');
    });

    it('throws VALIDATION_ERROR for whitespace-only password', async () => {
      await expect(
        gameAccountService.create({ username: 'user', password: '  \t  ' }, 'user-1')
      ).rejects.toThrow(GameAccountError);
    });

    it('throws VALIDATION_ERROR for null-like username', async () => {
      await expect(
        gameAccountService.create({ username: null as any, password: 'pass' }, 'user-1')
      ).rejects.toThrow(GameAccountError);
    });

    it('throws VALIDATION_ERROR for undefined password', async () => {
      await expect(
        gameAccountService.create({ username: 'user', password: undefined as any }, 'user-1')
      ).rejects.toThrow(GameAccountError);
    });
  });

  describe('toggleStatus', () => {
    it('toggles offline to online', async () => {
      const row = makeRow({ status: 'offline' });
      mockedQueries.findById.mockResolvedValue(row);
      mockedQueries.updateStatus.mockResolvedValue({ ...row, status: 'online' });

      const result = await gameAccountService.toggleStatus('ga-1');

      expect(mockedQueries.updateStatus).toHaveBeenCalledWith('ga-1', 'online');
      expect(result.status).toBe('online');
    });

    it('toggles online to offline', async () => {
      const row = makeRow({ status: 'online' });
      mockedQueries.findById.mockResolvedValue(row);
      mockedQueries.updateStatus.mockResolvedValue({ ...row, status: 'offline' });

      const result = await gameAccountService.toggleStatus('ga-1');

      expect(mockedQueries.updateStatus).toHaveBeenCalledWith('ga-1', 'offline');
      expect(result.status).toBe('offline');
    });

    it('throws NOT_FOUND for non-existent account', async () => {
      mockedQueries.findById.mockResolvedValue(null);

      await expect(gameAccountService.toggleStatus('bad-id'))
        .rejects.toThrow(GameAccountError);
      await expect(gameAccountService.toggleStatus('bad-id'))
        .rejects.toThrow('Risorsa non trovata');
    });
  });

  describe('deleteAccount', () => {
    it('deletes an existing account', async () => {
      mockedQueries.deleteById.mockResolvedValue(true);

      await expect(gameAccountService.deleteAccount('ga-1')).resolves.toBeUndefined();
      expect(mockedQueries.deleteById).toHaveBeenCalledWith('ga-1');
    });

    it('throws NOT_FOUND for non-existent account', async () => {
      mockedQueries.deleteById.mockResolvedValue(false);

      await expect(gameAccountService.deleteAccount('bad-id'))
        .rejects.toThrow(GameAccountError);
      await expect(gameAccountService.deleteAccount('bad-id'))
        .rejects.toThrow('Risorsa non trovata');
    });
  });
});
