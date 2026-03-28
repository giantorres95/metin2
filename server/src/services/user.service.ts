import bcrypt from 'bcrypt';
import * as usersQueries from '../db/queries/users.queries';

const SALT_ROUNDS = 12;

export class UserError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'UserError';
  }
}

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  password?: string;
  role?: 'admin' | 'user';
}

function toDTO(row: usersQueries.UserRow): UserDTO {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at.toISOString(),
  };
}

export async function create(data: CreateUserInput): Promise<UserDTO> {
  const existing = await usersQueries.findByEmail(data.email);
  if (existing) {
    throw new UserError('Email già in uso', 'DUPLICATE_EMAIL');
  }

  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
  const row = await usersQueries.create(data.name, data.email, passwordHash, data.role);
  return toDTO(row);
}

export async function update(id: string, data: UpdateUserInput): Promise<UserDTO> {
  const user = await usersQueries.findById(id);
  if (!user) {
    throw new UserError('Risorsa non trovata', 'NOT_FOUND');
  }

  if (data.email !== undefined && data.email !== user.email) {
    const existing = await usersQueries.findByEmail(data.email);
    if (existing) {
      throw new UserError('Email già in uso', 'DUPLICATE_EMAIL');
    }
  }

  const fields: { name?: string; email?: string; password_hash?: string; role?: 'admin' | 'user' } = {};
  if (data.name !== undefined) fields.name = data.name;
  if (data.email !== undefined) fields.email = data.email;
  if (data.password !== undefined) {
    fields.password_hash = await bcrypt.hash(data.password, SALT_ROUNDS);
  }
  if (data.role !== undefined) fields.role = data.role;

  const updated = await usersQueries.update(id, fields);
  if (!updated) {
    throw new UserError('Risorsa non trovata', 'NOT_FOUND');
  }

  return toDTO(updated);
}

export async function findByEmail(email: string): Promise<usersQueries.UserRow | null> {
  return usersQueries.findByEmail(email);
}

export async function getAll(): Promise<UserDTO[]> {
  const rows = await usersQueries.getAll();
  return rows.map(toDTO);
}
