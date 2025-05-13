-- S3 Browser Database Initialization Script

-- Create necessary tables for the application
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  "avatarUrl" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS s3_accounts (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  "accessKeyId" TEXT NOT NULL,
  "secretAccessKey" TEXT NOT NULL,
  region TEXT NOT NULL DEFAULT 'us-east-1',
  "defaultBucket" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS shared_files (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "accountId" INTEGER NOT NULL REFERENCES s3_accounts(id) ON DELETE CASCADE,
  bucket TEXT NOT NULL,
  path TEXT NOT NULL,
  filename TEXT NOT NULL,
  filesize BIGINT NOT NULL,
  "contentType" TEXT,
  "shareToken" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP WITH TIME ZONE,
  "allowDownload" BOOLEAN NOT NULL DEFAULT true,
  password TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_settings (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  theme TEXT NOT NULL DEFAULT 'light',
  "defaultAccountId" INTEGER REFERENCES s3_accounts(id) ON DELETE SET NULL,
  notifications BOOLEAN NOT NULL DEFAULT true,
  "lastAccessed" TEXT[] DEFAULT '{}',
  CONSTRAINT unique_user_settings UNIQUE ("userId")
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_s3_accounts_user_id ON s3_accounts("userId");
CREATE INDEX IF NOT EXISTS idx_shared_files_user_id ON shared_files("userId");
CREATE INDEX IF NOT EXISTS idx_shared_files_account_id ON shared_files("accountId");
CREATE INDEX IF NOT EXISTS idx_shared_files_share_token ON shared_files("shareToken");
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings("userId");

-- Create session table if using database sessions
CREATE TABLE IF NOT EXISTS "session" (
  "sid" varchar NOT NULL COLLATE "default",
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL,
  CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");

-- Add comments to tables for better documentation
COMMENT ON TABLE users IS 'Stores user account information';
COMMENT ON TABLE s3_accounts IS 'Stores AWS S3 account credentials for each user';
COMMENT ON TABLE shared_files IS 'Stores information about files shared by users';
COMMENT ON TABLE user_settings IS 'Stores user preferences and settings';
COMMENT ON TABLE "session" IS 'Stores user session information';

-- Example administrator creation (make sure to replace with a secure password)
-- The password hash corresponds to "admin123" and would need to be replaced in production
-- INSERT INTO users (username, email, password)
-- VALUES ('admin', 'admin@example.com', '$2a$10$mZ1ZyJaRHmvqaBvsw/z7aeTZ.PiE0FYUuWZB1E0m8xHy4FTTLSYIW');

-- Example settings for the admin user
-- INSERT INTO user_settings ("userId", theme, notifications)
-- VALUES (1, 'dark', true);