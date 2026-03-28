-- 001_initial_schema.sql
-- Initial database schema for Metin2 Guild Management Web App

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Table: users
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Unique index on email for fast lookup and uniqueness constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- ============================================
-- Table: game_accounts
-- ============================================
CREATE TABLE IF NOT EXISTS game_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username_encrypted TEXT NOT NULL,
    password_encrypted TEXT NOT NULL,
    status VARCHAR(10) NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline')),
    activity VARCHAR(20) NOT NULL DEFAULT '' CHECK (activity IN ('', 'Girando', 'Expando', 'Dungeon')),
    notes VARCHAR(200) NOT NULL DEFAULT '',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================
-- Table: refresh_tokens
-- ============================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index on user_id for fast lookup of tokens by user
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens (user_id);
