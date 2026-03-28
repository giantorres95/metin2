import pool from '../pool';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'admin' | 'user';
  created_at: Date;
  updated_at: Date;
}

export async function findByEmail(email: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
  return result.rows[0] ?? null;
}

export async function findByName(name: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>(
    'SELECT * FROM users WHERE name = $1',
    [name]
  );
  return result.rows[0] ?? null;
}

export async function findById(id: string): Promise<UserRow | null> {
  const result = await pool.query<UserRow>(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return result.rows[0] ?? null;
}

export async function create(
  name: string,
  email: string,
  passwordHash: string,
  role: 'admin' | 'user'
): Promise<UserRow> {
  const result = await pool.query<UserRow>(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [name, email, passwordHash, role]
  );
  return result.rows[0];
}

export async function update(
  id: string,
  fields: { name?: string; email?: string; password_hash?: string; role?: 'admin' | 'user' }
): Promise<UserRow | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (fields.name !== undefined) {
    setClauses.push(`name = $${paramIndex++}`);
    values.push(fields.name);
  }
  if (fields.email !== undefined) {
    setClauses.push(`email = $${paramIndex++}`);
    values.push(fields.email);
  }
  if (fields.password_hash !== undefined) {
    setClauses.push(`password_hash = $${paramIndex++}`);
    values.push(fields.password_hash);
  }
  if (fields.role !== undefined) {
    setClauses.push(`role = $${paramIndex++}`);
    values.push(fields.role);
  }

  if (setClauses.length === 0) return findById(id);

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  const result = await pool.query<UserRow>(
    `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
    values
  );
  return result.rows[0] ?? null;
}

export async function getAll(): Promise<UserRow[]> {
  const result = await pool.query<UserRow>(
    'SELECT * FROM users ORDER BY created_at ASC'
  );
  return result.rows;
}
