import pool from '../pool';

export interface RefreshTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  created_at: Date;
}

export async function create(
  userId: string,
  tokenHash: string,
  expiresAt: Date
): Promise<RefreshTokenRow> {
  const result = await pool.query<RefreshTokenRow>(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [userId, tokenHash, expiresAt]
  );
  return result.rows[0];
}

export async function findByTokenHash(tokenHash: string): Promise<RefreshTokenRow | null> {
  const result = await pool.query<RefreshTokenRow>(
    'SELECT * FROM refresh_tokens WHERE token_hash = $1',
    [tokenHash]
  );
  return result.rows[0] ?? null;
}

export async function deleteByTokenHash(tokenHash: string): Promise<boolean> {
  const result = await pool.query(
    'DELETE FROM refresh_tokens WHERE token_hash = $1',
    [tokenHash]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function deleteByUserId(userId: string): Promise<number> {
  const result = await pool.query(
    'DELETE FROM refresh_tokens WHERE user_id = $1',
    [userId]
  );
  return result.rowCount ?? 0;
}
