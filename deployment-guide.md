# S3 Browser Deployment Guide

This document provides instructions for deploying the S3 Browser application, including database setup and application configuration.

## Prerequisites

- Node.js 18 or higher
- PostgreSQL 14 or higher
- Git

## Database Setup

### Local PostgreSQL Setup

1. Install PostgreSQL if you haven't already:
   - **Linux**: `sudo apt install postgresql postgresql-contrib`
   - **Mac**: `brew install postgresql`
   - **Windows**: Download and install from [PostgreSQL website](https://www.postgresql.org/download/windows/)

2. Start PostgreSQL Service:
   - **Linux**: `sudo systemctl start postgresql`
   - **Mac**: `brew services start postgresql`
   - **Windows**: PostgreSQL service should start automatically, or you can start it from the Services application

3. Create a Database for the Application:

```bash
# Login to PostgreSQL with the postgres user
sudo -u postgres psql

# Create a database user for the application
CREATE USER s3browser WITH PASSWORD 'your_secure_password';

# Create a database for the application
CREATE DATABASE s3browser;

# Grant privileges to the user
GRANT ALL PRIVILEGES ON DATABASE s3browser TO s3browser;

# Connect to the database
\c s3browser

# Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

# Exit psql
\q
```

### Database Initialization Script

Create a file named `db-init.sql` with the following content:

```sql
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
```

Run the script to initialize your database:

```bash
psql -U s3browser -d s3browser -f db-init.sql
```

## Application Deployment

### 1. Clone the Repository

```bash
git clone https://your-repository-url/s3-browser.git
cd s3-browser
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configuration

Create a `.env` file in the root directory with the following environment variables:

```plaintext
# Database Configuration
DATABASE_URL=postgresql://s3browser:your_secure_password@localhost:5432/s3browser

# Session Configuration
SESSION_SECRET=your_secure_session_secret

# Application Configuration
PORT=5000
NODE_ENV=production
```

### 4. Build the Application

```bash
npm run build
```

### 5. Database Migration

Apply the database schema:

```bash
npm run db:push
```

### 6. Start the Application

```bash
npm start
```

The application should now be running on http://localhost:5000.

## Production Deployment Considerations

### Using a Process Manager

For production, you should use a process manager like PM2:

```bash
# Install PM2
npm install -g pm2

# Start the application with PM2
pm2 start npm --name "s3-browser" -- start

# Ensure PM2 restarts on system boot
pm2 startup
pm2 save
```

### Setting Up a Reverse Proxy

Set up a reverse proxy with Nginx or Apache to handle HTTPS and serve the application:

#### Nginx Example Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Security Considerations

1. Ensure your PostgreSQL database is properly secured with strong passwords
2. Set up a firewall to allow only necessary connections
3. Regularly update dependencies using `npm audit fix`
4. Use HTTPS in production by setting up SSL certificates (e.g., Let's Encrypt)
5. Consider implementing rate limiting for API endpoints

## Troubleshooting

### Database Connection Issues

If you encounter database connection issues:

1. Verify your PostgreSQL service is running:
   ```bash
   sudo systemctl status postgresql
   ```

2. Check your database credentials in the `.env` file
3. Ensure the database and user exist:
   ```bash
   sudo -u postgres psql -c "\l" | grep s3browser
   sudo -u postgres psql -c "\du" | grep s3browser
   ```

### Application Errors

Check the application logs for more detailed error information:

```bash
# If using PM2
pm2 logs s3-browser

# If running directly
npm start > app.log 2>&1
```

## Backup and Restore

### Database Backup

```bash
pg_dump -U s3browser -d s3browser > s3browser_backup.sql
```

### Database Restore

```bash
psql -U s3browser -d s3browser < s3browser_backup.sql
```

## Updating the Application

To update the application to a newer version:

1. Stop the application:
   ```bash
   # If using PM2
   pm2 stop s3-browser
   
   # If running directly
   # Use Ctrl+C to stop the process
   ```

2. Pull the latest changes:
   ```bash
   git pull origin main
   ```

3. Install any new dependencies:
   ```bash
   npm install
   ```

4. Apply database migrations:
   ```bash
   npm run db:push
   ```

5. Restart the application:
   ```bash
   # If using PM2
   pm2 restart s3-browser
   
   # If running directly
   npm start
   ```