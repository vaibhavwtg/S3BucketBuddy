# Database Setup Guide

This document provides the SQL scripts needed to set up and initialize the database for the S3 Manager application.

## Complete Database Schema

Run the following SQL script to create all the necessary tables. This script is an alternative to running `npm run db:push`:

```sql
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
  username VARCHAR(255) UNIQUE,
  email VARCHAR(255) UNIQUE,
  password VARCHAR(255) NOT NULL,
  "firstName" VARCHAR(255),
  "lastName" VARCHAR(255),
  "profileImageUrl" VARCHAR(255),
  "isAdmin" BOOLEAN DEFAULT FALSE,
  "isActive" BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create S3 accounts table
CREATE TABLE IF NOT EXISTS s3_accounts (
  id SERIAL PRIMARY KEY,
  "userId" VARCHAR(255) REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  "accessKeyId" VARCHAR(255) NOT NULL,
  "secretAccessKey" VARCHAR(255) NOT NULL,
  region VARCHAR(50) NOT NULL,
  "defaultBucket" VARCHAR(255),
  "isActive" BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create shared files table
CREATE TABLE IF NOT EXISTS shared_files (
  id SERIAL PRIMARY KEY,
  "userId" VARCHAR(255) REFERENCES users(id),
  "accountId" INTEGER REFERENCES s3_accounts(id),
  bucket VARCHAR(255) NOT NULL,
  path VARCHAR(1024) NOT NULL,
  filename VARCHAR(255) NOT NULL,
  filesize BIGINT NOT NULL,
  "contentType" VARCHAR(255),
  "shareToken" VARCHAR(255) NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP WITH TIME ZONE,
  "allowDownload" BOOLEAN DEFAULT TRUE,
  "password" VARCHAR(255),
  "accessCount" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create file access logs table
CREATE TABLE IF NOT EXISTS file_access_logs (
  id SERIAL PRIMARY KEY,
  "fileId" INTEGER REFERENCES shared_files(id),
  "accessedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  "ipAddress" VARCHAR(50),
  "userAgent" VARCHAR(512)
);

-- Create user settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id SERIAL PRIMARY KEY,
  "userId" VARCHAR(255) REFERENCES users(id),
  theme VARCHAR(50) DEFAULT 'light',
  "defaultAccountId" INTEGER REFERENCES s3_accounts(id),
  notifications BOOLEAN DEFAULT TRUE,
  "viewMode" VARCHAR(50) DEFAULT 'grid',
  "lastAccessed" TEXT[] DEFAULT '{}'
);
```

## Create a Test User

To create a test user with a known password:

```sql
INSERT INTO users (id, username, email, password, "isAdmin", "isActive", "createdAt", "updatedAt")
VALUES (
  'local_' || substr(md5(random()::text), 1, 16),
  'test@example.com',
  'test@example.com',
  '$2a$10$hACwQ5/HQI6FhbIISOUVeusy3sKyUDhSq36fF5d/54aULe9imQXCS', -- password: 'password'
  true,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
);
```

## Adding an S3 Account

After creating a user, you can add an S3 account with:

```sql
-- First, get the user ID
SELECT id FROM users WHERE email = 'test@example.com';

-- Then insert an S3 account for that user
INSERT INTO s3_accounts (
  "userId", 
  name, 
  "accessKeyId", 
  "secretAccessKey", 
  region, 
  "defaultBucket", 
  "isActive", 
  "createdAt"
)
VALUES (
  'user_id_from_previous_query', 
  'My AWS Account', 
  'YOUR_AWS_ACCESS_KEY_ID', 
  'YOUR_AWS_SECRET_ACCESS_KEY', 
  'us-east-1', 
  'my-bucket-name', 
  true, 
  CURRENT_TIMESTAMP
);
```

## Creating User Settings

To set initial user settings:

```sql
INSERT INTO user_settings (
  "userId",
  theme,
  "defaultAccountId",
  notifications,
  "viewMode",
  "lastAccessed"
)
VALUES (
  'user_id_from_users_table',
  'light',
  1, -- ID of the default S3 account
  true,
  'grid',
  '{}'
);
```

## Deleting Records and Tables

If you need to reset specific tables:

```sql
-- Clear access logs
DELETE FROM file_access_logs;

-- Clear shared files
DELETE FROM shared_files;

-- Clear S3 accounts
DELETE FROM s3_accounts;

-- Clear user settings
DELETE FROM user_settings;

-- Clear users (must be done after clearing all other tables with foreign keys)
DELETE FROM users;

-- Drop all tables (if needed)
DROP TABLE IF EXISTS file_access_logs;
DROP TABLE IF EXISTS shared_files;
DROP TABLE IF EXISTS user_settings;
DROP TABLE IF EXISTS s3_accounts;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS sessions;
```

## PostgreSQL Connection

To connect to your database from the command line:

```bash
psql -U username -d s3manager
```

Or with full connection details:

```bash
psql "postgresql://username:password@localhost:5432/s3manager"
```

## Database Maintenance

For regular database maintenance:

```sql
-- Vacuum the database to reclaim space
VACUUM FULL;

-- Analyze tables for better query planning
ANALYZE;

-- Remove expired sessions
DELETE FROM sessions WHERE expire < NOW();
```