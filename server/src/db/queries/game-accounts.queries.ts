import pool from '../pool';

export interface GameAccountRow {
  id: string;
  username_encrypted: string;
  password_encrypted: string;
  status: 'online' | 'offline';
  activity: string;
  notes: string;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export async function getAll(): Promise<GameAccountRow[]> {
  const result = await pool.query<GameAccountRow>(
    'SELECT * FROM game_accounts ORDER BY created_at ASC'
  );
  return result.rows;
}

export async function create(
  usernameEncrypted: string,
  passwordEncrypted: string,
  createdBy: string
): Promise<GameAccountRow> {
  const result = await pool.query<GameAccountRow>(
    `INSERT INTO game_accounts (username_encrypted, password_encrypted, created_by)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [usernameEncrypted, passwordEncrypted, createdBy]
  );
  return result.rows[0];
}

export async function findById(id: string): Promise<GameAccountRow | null> {
  const result = await pool.query<GameAccountRow>(
    'SELECT * FROM game_accounts WHERE id = $1',
    [id]
  );
  return result.rows[0] ?? null;
}

export async function updateStatus(
  id: string,
  status: 'online' | 'offline',
  activity?: string
): Promise<GameAccountRow | null> {
  const newActivity = status === 'offline' ? '' : (activity ?? '');
  const result = await pool.query<GameAccountRow>(
    `UPDATE game_accounts SET status = $1, activity = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
    [status, newActivity, id]
  );
  return result.rows[0] ?? null;
}

export async function updateActivity(
  id: string,
  activity: string
): Promise<GameAccountRow | null> {
  const result = await pool.query<GameAccountRow>(
    `UPDATE game_accounts SET activity = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [activity, id]
  );
  return result.rows[0] ?? null;
}

export async function updateNotes(
  id: string,
  notes: string
): Promise<GameAccountRow | null> {
  const result = await pool.query<GameAccountRow>(
    `UPDATE game_accounts SET notes = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
    [notes, id]
  );
  return result.rows[0] ?? null;
}

export async function deleteById(id: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM game_accounts WHERE id = $1',
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}
