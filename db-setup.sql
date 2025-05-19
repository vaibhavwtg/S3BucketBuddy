-- S3 Manager Database Setup for macOS

-- Create the session table for authentication
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR(255) PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  "firstName" VARCHAR(255),
  "lastName" VARCHAR(255),
  "profileImageUrl" VARCHAR(255),
  "isAdmin" BOOLEAN DEFAULT FALSE NOT NULL,
  "isActive" BOOLEAN DEFAULT TRUE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create S3 accounts table
CREATE TABLE IF NOT EXISTS s3_accounts (
  id SERIAL PRIMARY KEY,
  "userId" VARCHAR(255) REFERENCES users(id) NOT NULL,
  name VARCHAR(255) NOT NULL,
  "accessKeyId" VARCHAR(255) NOT NULL,
  "secretAccessKey" VARCHAR(255) NOT NULL,
  region VARCHAR(50) NOT NULL,
  "defaultBucket" VARCHAR(255),
  "isActive" BOOLEAN DEFAULT TRUE NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create shared files table
CREATE TABLE IF NOT EXISTS shared_files (
  id SERIAL PRIMARY KEY,
  "userId" VARCHAR(255) REFERENCES users(id) NOT NULL,
  "accountId" INTEGER REFERENCES s3_accounts(id) NOT NULL,
  bucket VARCHAR(255) NOT NULL,
  path VARCHAR(1024) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  filesize BIGINT NOT NULL,
  "contentType" VARCHAR(255),
  "shareToken" VARCHAR(255) NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP WITH TIME ZONE,
  "allowDownload" BOOLEAN DEFAULT TRUE,
  password VARCHAR(255),
  "accessCount" INTEGER DEFAULT 0 NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create file access logs table
CREATE TABLE IF NOT EXISTS file_access_logs (
  id SERIAL PRIMARY KEY,
  "fileId" INTEGER REFERENCES shared_files(id) NOT NULL,
  "accessedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "ipAddress" VARCHAR(50),
  "userAgent" VARCHAR(512)
);

-- Create user settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id SERIAL PRIMARY KEY,
  "userId" VARCHAR(255) REFERENCES users(id) NOT NULL,
  theme VARCHAR(50) DEFAULT 'light',
  "defaultAccountId" INTEGER REFERENCES s3_accounts(id),
  notifications BOOLEAN DEFAULT TRUE,
  "viewMode" VARCHAR(50) DEFAULT 'grid',
  "lastAccessed" TEXT[] DEFAULT '{}'
);

-- Create a test admin user (password: 'password')
INSERT INTO users (id, username, email, password, "isAdmin", "isActive", "createdAt", "updatedAt")
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
CREATE INDEX IF NOT EXISTS idx_shared_files_user_id ON shared_files("userId");
CREATE INDEX IF NOT EXISTS idx_shared_files_account_id ON shared_files("accountId");
CREATE INDEX IF NOT EXISTS idx_s3_accounts_user_id ON s3_accounts("userId");