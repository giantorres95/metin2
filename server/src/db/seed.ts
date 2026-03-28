import dotenv from 'dotenv';
import { Pool } from 'pg';
import bcrypt from 'bcrypt';

dotenv.config({ path: '.env' });

const SALT_ROUNDS = 12;

const ADMIN_NAME = 'Admin';
const ADMIN_EMAIL = 'admin@metin2guild.com';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_ROLE = 'admin';

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Seeding database...');

    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);

    await pool.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO NOTHING`,
      [ADMIN_NAME, ADMIN_EMAIL, passwordHash, ADMIN_ROLE]
    );

    console.log(`Admin user seeded: ${ADMIN_EMAIL}`);
    console.log('Seed completed successfully.');
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seed();
