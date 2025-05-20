-- S3 Manager Database Setup for macOS (Fixed column names)

-- Drop existing tables if they exist
DROP TABLE IF EXISTS file_access_logs CASCADE;
DROP TABLE IF EXISTS shared_files CASCADE;
DROP TABLE IF EXISTS user_settings CASCADE;
DROP TABLE IF EXISTS s3_accounts CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;

-- Create the session table for authentication
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR(255) PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);

-- Create users table with snake_case column names
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  profile_image_url VARCHAR(255),
  is_admin BOOLEAN DEFAULT FALSE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create S3 accounts table with snake_case column names
CREATE TABLE IF NOT EXISTS s3_accounts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  access_key_id VARCHAR(255) NOT NULL,
  secret_access_key VARCHAR(255) NOT NULL,
  region VARCHAR(50) NOT NULL,
  default_bucket VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create shared files table with snake_case column names
CREATE TABLE IF NOT EXISTS shared_files (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) NOT NULL,
  account_id INTEGER REFERENCES s3_accounts(id) NOT NULL,
  bucket VARCHAR(255) NOT NULL,
  path VARCHAR(1024) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  filesize BIGINT NOT NULL,
  content_type VARCHAR(255),
  share_token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE,
  allow_download BOOLEAN DEFAULT TRUE,
  password VARCHAR(255),
  access_count INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create file access logs table with snake_case column names
CREATE TABLE IF NOT EXISTS file_access_logs (
  id SERIAL PRIMARY KEY,
  file_id INTEGER REFERENCES shared_files(id) NOT NULL,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  ip_address VARCHAR(50),
  user_agent VARCHAR(512)
);

-- Create user settings table with snake_case column names
CREATE TABLE IF NOT EXISTS user_settings (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id) NOT NULL,
  theme VARCHAR(50) DEFAULT 'light',
  default_account_id INTEGER REFERENCES s3_accounts(id),
  notifications BOOLEAN DEFAULT TRUE,
  view_mode VARCHAR(50) DEFAULT 'grid',
  last_accessed TEXT[] DEFAULT '{}'
);

-- Create a test admin user (password: 'password')
INSERT INTO users (id, username, email, password, is_admin, is_active, created_at, updated_at)
VALUES (
  'local_' || substr(md5(random()::text), 1, 16),
  'admin@example.com',
  'admin@example.com',
  '$2a$10$hACwQ5/HQI6FhbIISOUVeusy3sKyUDhSq36fF5d/54aULe9imQXCS',
  true,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_shared_files_user_id ON shared_files(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_files_account_id ON shared_files(account_id);
CREATE INDEX IF NOT EXISTS idx_s3_accounts_user_id ON s3_accounts(user_id);