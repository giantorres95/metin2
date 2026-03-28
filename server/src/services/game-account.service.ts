import * as gameAccountsQueries from '../db/queries/game-accounts.queries';
import { encrypt, decrypt } from './crypto.service';

export class GameAccountError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'GameAccountError';
  }
}

export interface GameAccountDTO {
  id: string;
  username: string;
  password: string;
  status: 'online' | 'offline';
  activity: string;
  notes: string;
  createdBy: string;
  createdAt: string;
}

export interface CreateGameAccountInput {
  username: string;
  password: string;
}

function isBlank(value: unknown): boolean {
  return value == null || (typeof value === 'string' && value.trim().length === 0);
}

function toDTO(row: gameAccountsQueries.GameAccountRow): GameAccountDTO {
  return {
    id: row.id,
    username: decrypt(row.username_encrypted),
    password: decrypt(row.password_encrypted),
    status: row.status,
    activity: row.activity || '',
    notes: row.notes || '',
    createdBy: row.created_by,
    createdAt: row.created_at.toISOString(),
  };
}

export async function getAll(): Promise<GameAccountDTO[]> {
  const rows = await gameAccountsQueries.getAll();
  return rows.map(toDTO);
}

export async function create(
  data: CreateGameAccountInput,
  createdBy: string
): Promise<GameAccountDTO> {
  if (isBlank(data.username)) {
    throw new GameAccountError(
      'Campi obbligatori mancanti: username',
      'VALIDATION_ERROR'
    );
  }
  if (isBlank(data.password)) {
    throw new GameAccountError(
      'Campi obbligatori mancanti: password',
      'VALIDATION_ERROR'
    );
  }

  const usernameEncrypted = encrypt(data.username);
  const passwordEncrypted = encrypt(data.password);

  const row = await gameAccountsQueries.create(
    usernameEncrypted,
    passwordEncrypted,
    createdBy
  );
  return toDTO(row);
}

export async function toggleStatus(id: string, activity?: string): Promise<GameAccountDTO> {
  const existing = await gameAccountsQueries.findById(id);
  if (!existing) {
    throw new GameAccountError('Risorsa non trovata', 'NOT_FOUND');
  }

  const newStatus = existing.status === 'online' ? 'offline' : 'online';

  if (newStatus === 'online') {
    // Activity is optional when going online
    const updated = await gameAccountsQueries.updateStatus(id, newStatus, activity || '');
    if (!updated) {
      throw new GameAccountError('Risorsa non trovata', 'NOT_FOUND');
    }
    return toDTO(updated);
  }

  const updated = await gameAccountsQueries.updateStatus(id, newStatus);
  if (!updated) {
    throw new GameAccountError('Risorsa non trovata', 'NOT_FOUND');
  }

  return toDTO(updated);
}

export async function updateActivity(id: string, activity: string): Promise<GameAccountDTO> {
  const existing = await gameAccountsQueries.findById(id);
  if (!existing) {
    throw new GameAccountError('Risorsa non trovata', 'NOT_FOUND');
  }

  const validActivities = ['Girando', 'Expando', 'Dungeon'];
  if (activity && !validActivities.includes(activity)) {
    throw new GameAccountError('Attività non valida', 'VALIDATION_ERROR');
  }

  const updated = await gameAccountsQueries.updateActivity(id, activity);
  if (!updated) {
    throw new GameAccountError('Risorsa non trovata', 'NOT_FOUND');
  }

  return toDTO(updated);
}

export async function deleteAccount(id: string): Promise<void> {
  const deleted = await gameAccountsQueries.deleteById(id);
  if (!deleted) {
    throw new GameAccountError('Risorsa non trovata', 'NOT_FOUND');
  }
}

export async function updateNotes(id: string, notes: string): Promise<GameAccountDTO> {
  const existing = await gameAccountsQueries.findById(id);
  if (!existing) {
    throw new GameAccountError('Risorsa non trovata', 'NOT_FOUND');
  }

  const updated = await gameAccountsQueries.updateNotes(id, notes);
  if (!updated) {
    throw new GameAccountError('Risorsa non trovata', 'NOT_FOUND');
  }

  return toDTO(updated);
}
